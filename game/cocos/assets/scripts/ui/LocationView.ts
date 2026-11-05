import {
  _decorator,
  Component,
  Node,
  Label,
  Graphics,
  Color,
  UITransform,
  Vec3,
  tween,
  Tween,
  UIOpacity,
  EventTouch,
  view,
  Sprite,
  LabelOutline,
} from 'cc';
import { Game, Box, ItemInst, Placed, PendingEvent, DigResult } from '../core/game';
import { CONFIG, ITEMS, LOCATIONS, ItemDef, Rarity } from '../core/config';
import { bagCellCenter, positionForAnchor } from '../core/placement';
import { Art } from './Art';
import { Fx } from './Fx';
import { uiNode, UILayout, alignBottom } from './UI';
import { Sfx } from './Sfx';

const { ccclass } = _decorator;

const CELL = 80;
// 地面/背包图标都是 16px 原图 ×4 = 64px
const FLOOR_ICON = 64;
const FLOOR_PLATE = 72;
const FLOOR_GLOW = 88;
const BAG_ICON = 64;
const BAG_PLATE = 72;
const BAG_GLOW = 80;
const SMALL_BOX = 96;
const BIG_BOX = 144;
const FLOOR_Y = -60;
const BAG_Y = -300;
const HOLD_UI_Y = -500;
const BOX_Y = 330;
const BOX_COLS = 3;

/** 用于驱动按住每帧更新 */
@ccclass('LocationHoldUpdater')
class LocationHoldUpdater extends Component {
  public onTick: ((dt: number) => void) | null = null;

  update(dt: number): void {
    if (this.onTick) this.onTick(dt);
  }
}

export class LocationView {
  private root: Node;
  private game: Game;
  private onChanged: () => void;
  private onEvent: (ev: PendingEvent) => void;
  private onLeave: () => void;

  private viewNode: Node | null = null;
  private boxContainer: Node | null = null;
  private floorContainer: Node | null = null;
  private bagContainer: Node | null = null;
  private holdUI: Node | null = null;
  private ringNode: Node | null = null;
  private ringGraphics: Graphics | null = null;
  private holdLabel: Label | null = null;
  private holdUpdater: LocationHoldUpdater | null = null;

  private boxNodes: Map<string, Node> = new Map();
  private floorNodes: Map<number, Node> = new Map();
  private bagNodes: Map<number, Node> = new Map();

  private holdBoxId: string | null = null;
  private holdStartTime: number = 0;
  private lastDebrisTime: number = 0;
  private glowNode: Node | null = null;
  private edgeGlowOn: boolean = false;

  private heroNode: Node | null = null;

  private bagGridNode: Node | null = null;
  private bagGridGraphics: Graphics | null = null;
  private hoverCell: { x: number; y: number } | null = null;
  private badCells: { x: number; y: number }[] = [];
  private badCellAlpha: number = 1;

  private draggingUid: number | null = null;
  private draggingNode: Node | null = null;
  private dragOffset: Vec3 = new Vec3();
  private isDragging: boolean = false;
  private potentialDrag: boolean = false;
  private touchStartPos: Vec3 = new Vec3();
  private touchStartTime: number = 0;
  private floorRotated: Map<number, boolean> = new Map();

  private menuNode: Node | null = null;

  constructor(
    root: Node,
    game: Game,
    onChanged: () => void,
    onEvent: (ev: PendingEvent) => void,
    onLeave: () => void,
  ) {
    this.root = root;
    this.game = game;
    this.onChanged = onChanged;
    this.onEvent = onEvent;
    this.onLeave = onLeave;
  }

  public show(): void {
    if (this.viewNode) this.hide();
    if (!this.game.location) return;

    this.viewNode = uiNode('LocationView');
    this.viewNode.parent = this.root;
    const ut = this.viewNode.addComponent(UITransform);
    ut.setContentSize(720, 1280);
    this.viewNode.setPosition(0, 0, 0);

    // 地点背景（按高度适配）
    const locId = this.game.location;
    const loc = LOCATIONS.find((l) => l.id === locId);
    const bgColor = new Color(110, 130, 100, 255);
    const bg = Art.makeVisual(`bg_${locId}`, 720, 1280, bgColor, loc?.name ?? locId);
    bg.parent = this.viewNode;
    bg.setPosition(0, 0, 0);
    this.adaptBackgroundToHeight(bg, 1280);

    // 盒子区域
    this.boxContainer = uiNode('boxes');
    this.boxContainer.parent = this.viewNode;
    this.boxContainer.setPosition(0, BOX_Y, 0);
    const boxUt = this.boxContainer.addComponent(UITransform);
    boxUt.setContentSize(720, 300);

    // 待选区（地板）
    this.floorContainer = uiNode('floor');
    this.floorContainer.parent = this.viewNode;
    this.floorContainer.setPosition(0, FLOOR_Y, 0);
    const floorUt = this.floorContainer.addComponent(UITransform);
    floorUt.setContentSize(720, 220);

    // 背包格子区
    this.bagContainer = uiNode('bag');
    this.bagContainer.parent = this.viewNode;
    this.bagContainer.setPosition(0, BAG_Y, 0);
    const bagUt = this.bagContainer.addComponent(UITransform);
    bagUt.setContentSize(720, 360);

    this.createHint();
    this.createButtons();
    this.createHoldUI();

    this.renderBoxes();
    this.renderFloor();
    this.renderBag();

    this.holdUpdater = this.viewNode.addComponent(LocationHoldUpdater);
    this.holdUpdater.onTick = (dt: number) => this.updateHold(dt);
  }

  public hide(): void {
    if (this.holdBoxId) this.stopHold(true);
    if (this.isDragging) this.cancelDrag();
    this.closeMenu();
    this.destroyHeroNode();
    if (this.viewNode) {
      this.viewNode.destroy();
      this.viewNode = null;
    }
    this.boxNodes.clear();
    this.floorNodes.clear();
    this.bagNodes.clear();
    this.floorRotated.clear();
    this.holdUpdater = null;
    this.ringNode = null;
    this.ringGraphics = null;
    this.holdLabel = null;
    this.glowNode = null;
    this.bagGridGraphics = null;
    this.bagGridNode = null;
    this.hoverCell = null;
    this.badCells = [];
    this.badCellAlpha = 1;
  }

  // ------------------------------------------------------------------
  // 构建按钮
  // ------------------------------------------------------------------
  private createHint(): void {
    if (!this.viewNode) return;
    const hint = uiNode('hint');
    hint.parent = this.viewNode;
    const ut = hint.addComponent(UITransform);
    ut.setContentSize(520, 20);
    const lb = hint.addComponent(Label);
    lb.string = '拖动 / 单击物品放入背包';
    lb.fontSize = 16;
    lb.lineHeight = 20;
    // 提示字加深，并加浅色描边保证在深色背景上仍可读
    lb.color = new Color(58, 42, 24, 255);
    lb.horizontalAlign = Label.HorizontalAlign.CENTER;
    lb.verticalAlign = Label.VerticalAlign.CENTER;
    lb.overflow = Label.Overflow.SHRINK;
    const outline = hint.addComponent(LabelOutline);
    outline.color = new Color(255, 246, 220, 230);
    outline.width = 2;
    hint.setPosition(0, 42, 0);
  }

  private createButtons(): void {
    if (!this.viewNode) return;

    const sideX = Math.min(180, UILayout.halfW - 76);
    const leaveBtn = Art.makeButton('换地点', 140, 56, () => {
      this.game.leaveLocation();
      this.onLeave();
    });
    leaveBtn.parent = this.viewNode;
    leaveBtn.setPosition(-sideX, 0, 0);
    alignBottom(leaveBtn, 12);

    const homeBtn = Art.makeButton('回家', 140, 56, () => {
      const cost = this.game.homeCost();
      if (this.game.goHome()) {
        Fx.floatText(this.viewNode!, `回家消耗 ${cost} 体力`, new Vec3(0, -440, 0));
        this.onChanged();
      } else {
        Fx.floatText(this.viewNode!, `体力不足，回家需 ${cost}`, new Vec3(0, -440, 0), new Color(255, 80, 80, 255));
      }
    });
    homeBtn.parent = this.viewNode;
    homeBtn.setPosition(sideX, 0, 0);
    alignBottom(homeBtn, 12);
  }

  // ------------------------------------------------------------------
  // 按住 UI
  // ------------------------------------------------------------------
  private createHoldUI(): void {
    if (!this.viewNode) return;
    this.holdUI = uiNode('hold_ui');
    this.holdUI.parent = this.viewNode;
    this.holdUI.setPosition(0, HOLD_UI_Y, 0);
    const hut = this.holdUI.addComponent(UITransform);
    hut.setContentSize(600, 100);

    // 进度环在外面围绕盒子绘制，这里只保留体力/消耗文字
    const labelNode = uiNode('label');
    const lut = labelNode.addComponent(UITransform);
    lut.setContentSize(500, 28);
    this.holdLabel = labelNode.addComponent(Label);
    this.holdLabel.string = '';
    this.holdLabel.fontSize = 20;
    this.holdLabel.lineHeight = 24;
    this.holdLabel.color = new Color(255, 255, 255, 255);
    this.holdLabel.horizontalAlign = Label.HorizontalAlign.CENTER;
    this.holdLabel.verticalAlign = Label.VerticalAlign.CENTER;
    labelNode.parent = this.holdUI;
    labelNode.setPosition(0, -16, 0);

    this.holdUI.active = false;

    // 圆形进度环（围绕正在按的盒子）
    this.ringNode = uiNode('hold_ring');
    this.ringNode.parent = this.viewNode;
    const rUt = this.ringNode.addComponent(UITransform);
    rUt.setContentSize(220, 220);
    this.ringGraphics = this.ringNode.addComponent(Graphics);
    this.ringNode.setPosition(0, 0, 0);
    this.ringNode.active = false;
  }

  // ------------------------------------------------------------------
  // 渲染盒子
  // ------------------------------------------------------------------
  private boxSpacing(): { x: number; y: number } {
    // 安全区是 390/844 这类竖屏时，可视宽只有 ~592 设计单位
    const safeW = Math.min(720, UILayout.visibleW) - 40;
    const x = Math.max(120, Math.min(180, (safeW - BIG_BOX) / 2));
    return { x, y: 168 };
  }

  private getBoxBasePosition(index: number, total: number): Vec3 {
    const row = Math.floor(index / BOX_COLS);
    const col = index % BOX_COLS;
    const inRow = Math.min(BOX_COLS, Math.max(0, total - row * BOX_COLS));
    const sp = this.boxSpacing();
    return new Vec3((col - (inRow - 1) / 2) * sp.x, -row * sp.y, 0);
  }

  private renderBoxes(): void {
    if (!this.boxContainer || !this.game.location) return;
    const boxes = this.game.boxesAt(this.game.location);

    boxes.forEach((box, idx) => {
      let node = this.boxNodes.get(box.id);
      if (!node) {
        node = this.createBoxNode(box);
        this.boxNodes.set(box.id, node);
        node.parent = this.boxContainer;
        this.attachBoxTouch(node, box.id);
      }
      const base = this.getBoxBasePosition(idx, boxes.length);
      node.setPosition(base.x, base.y, 0);
      node.active = !box.opened;
    });

    const ids = new Set(boxes.map((b) => b.id));
    for (const [id, node] of this.boxNodes) {
      if (!ids.has(id)) {
        node.destroy();
        this.boxNodes.delete(id);
      }
    }
  }

  private getBoxArtName(box: Box): string {
    if (box.size === 'big') {
      // 解析盒子编号（id 格式：box_<location>_<index>）
      const parts = box.id.split('_');
      const idxStr = parts[parts.length - 1];
      const idx = parseInt(idxStr, 10);
      if (!isNaN(idx) && idx % 2 === 0) {
        return 'box_big_alt';
      }
      return 'box_big';
    }
    return 'box_small';
  }

  private createBoxNode(box: Box): Node {
    const size = box.size === 'big' ? BIG_BOX : SMALL_BOX;
    const artName = this.getBoxArtName(box);
    const color = box.size === 'big' ? new Color(160, 120, 70, 255) : new Color(130, 100, 60, 255);
    const node = Art.makeVisual(artName, size, size, color, box.size === 'big' ? '大盒' : '小盒');
    // 确保初始播放正确的序列帧（若存在）
    Art.play(node, artName, 10, true);
    return node;
  }

  private attachBoxTouch(node: Node, boxId: string): void {
    node.on(Node.EventType.TOUCH_START, (event: EventTouch) => this.onBoxTouchStart(event, boxId), this);
    node.on(Node.EventType.TOUCH_END, (event: EventTouch) => this.onBoxTouchEnd(event, boxId), this);
    node.on(Node.EventType.TOUCH_CANCEL, (event: EventTouch) => this.onBoxTouchCancel(event, boxId), this);
  }

  private onBoxTouchStart(event: EventTouch, boxId: string): void {
    if (this.holdBoxId) return;
    const box = this.game.boxesAt(this.game.location!).find((b) => b.id === boxId);
    if (!box || box.opened) return;

    const boxNode = this.boxNodes.get(boxId);
    this.holdBoxId = boxId;
    this.holdStartTime = Date.now();
    this.lastDebrisTime = Date.now();
    Fx.vibrateShort();
    this.holdUI!.active = true;
    if (this.ringNode) this.ringNode.active = true;
    this.updateHold(0);

    // 播放按住抖动帧
    if (boxNode) {
      const artName = this.getBoxArtName(box);
      Art.play(boxNode, artName, 12, true);
    }

    // 创建主角挖掘动画
    if (boxNode && this.boxContainer) {
      this.destroyHeroNode();
      const heroNode = Art.makeVisual('hero_dig', 80, 80, new Color(180, 160, 120, 255));
      heroNode.parent = this.boxContainer;
      heroNode.setPosition(boxNode.position.x, boxNode.position.y - 120, 0);
      this.heroNode = heroNode;
    }

    if (this.holdUpdater) this.holdUpdater.onTick = (dt: number) => this.updateHold(dt);
  }

  private onBoxTouchEnd(event: EventTouch, boxId: string): void {
    if (this.holdBoxId === boxId) {
      this.stopHold(false);
    }
  }

  private onBoxTouchCancel(event: EventTouch, boxId: string): void {
    if (this.holdBoxId === boxId) {
      this.stopHold(true);
    }
  }

  private destroyHeroNode(): void {
    if (this.heroNode && this.heroNode.isValid) {
      this.heroNode.destroy();
    }
    this.heroNode = null;
  }

  private stopHold(cancelled: boolean): void {
    if (!this.holdBoxId) return;
    const boxId = this.holdBoxId;
    const holdSec = Math.min(CONFIG.maxHoldSec, (Date.now() - this.holdStartTime) / 1000);
    this.holdBoxId = null;
    this.holdStartTime = 0;
    if (this.holdUpdater) this.holdUpdater.onTick = null;
    this.holdUI!.active = false;
    if (this.ringNode) this.ringNode.active = false;
    if (this.ringGraphics) this.ringGraphics.clear();
    this.clearHoldEffects();
    this.destroyHeroNode();
    if (!cancelled) {
      this.performDig(boxId, holdSec);
    }
  }

  private updateHold(dt: number): void {
    if (!this.holdBoxId) return;
    const boxId = this.holdBoxId;
    const locId = this.game.location!;
    const box = this.game.boxesAt(locId).find((b) => b.id === boxId);
    if (!box) return;

    const sec = Math.min(CONFIG.maxHoldSec, (Date.now() - this.holdStartTime) / 1000);
    const boxNode = this.boxNodes.get(boxId);
    if (!boxNode) return;

    // 抖动
    const strength = sec < 1 ? 4 : sec < 3 ? 10 : 16;
    const allBoxes = this.game.boxesAt(locId);
    const index = allBoxes.findIndex((b) => b.id === boxId);
    if (index === -1) return;
    const base = this.getBoxBasePosition(index, allBoxes.length);
    boxNode.setPosition(
      base.x + (Math.random() - 0.5) * strength,
      base.y + (Math.random() - 0.5) * strength,
      0,
    );

    // 碎纸片
    const now = Date.now();
    if (now - this.lastDebrisTime > 120) {
      this.lastDebrisTime = now;
      this.spawnDebris(boxNode.getWorldPosition());
    }

    // 光晕/进度环只跟按住时长走：白 -> 蓝 -> 金，长按不会出彩虹
    const glow = this.holdGlowByTime(sec);
    this.updateGlow(glow, boxNode.getWorldPosition());
    this.drawHoldRing(boxNode, box.size, sec, glow);

    const staminaCost = CONFIG.digStamina[box.size] + sec * CONFIG.holdStaminaPerSec;
    const remaining = this.game.stamina;
    if (this.holdLabel) {
      this.holdLabel.string = `剩余体力 ${remaining} / 本次将扣 ${staminaCost.toFixed?.(1)}`;
    }

    // 长按到金色才给屏幕边缘光；彩虹只在真正开出史诗时由开奖流程处理
    if (glow === 'gold') {
      if (!this.edgeGlowOn) {
        Fx.edgeGlow(this.root, new Color(255, 220, 100, 220), true);
        this.edgeGlowOn = true;
      }
    } else if (this.edgeGlowOn) {
      Fx.edgeGlow(this.root, new Color(255, 255, 255, 255), false);
      this.edgeGlowOn = false;
    }
  }

  private holdGlowByTime(sec: number): 'white' | 'blue' | 'gold' {
    if (sec >= 2.5) return 'gold';
    if (sec >= 1) return 'blue';
    return 'white';
  }

  private drawHoldRing(boxNode: Node, boxSize: 'small' | 'big', sec: number, glow: string): void {
    if (!this.viewNode || !this.ringNode || !this.ringGraphics) return;
    const local = this.viewNode
      .getComponent(UITransform)!
      .convertToNodeSpaceAR(boxNode.getWorldPosition());
    this.ringNode.setPosition(local.x, local.y, 0);
    const g = this.ringGraphics;
    g.clear();
    const radius = (boxSize === 'big' ? BIG_BOX : SMALL_BOX) / 2 + 12;
    const start = -Math.PI / 2;
    const ratio = Math.max(0, Math.min(1, sec / CONFIG.maxHoldSec));

    g.lineWidth = 6;
    g.lineCap = Graphics.LineCap.ROUND;
    g.strokeColor = new Color(0, 0, 0, 120);
    g.circle(0, 0, radius);
    g.stroke();

    const colors: Record<string, Color> = {
      white: new Color(255, 255, 255, 230),
      blue: new Color(110, 190, 255, 240),
      gold: new Color(255, 215, 90, 255),
    };
    g.lineWidth = 5;
    g.strokeColor = colors[glow] ?? colors.white;
    g.arc(0, 0, radius, start, start + ratio * Math.PI * 2, false);
    g.stroke();
  }

  private spawnDebris(worldPos: Vec3): void {
    if (!this.viewNode) return;
    const pieces = 3;
    for (let i = 0; i < pieces; i++) {
      const n = uiNode('debris');
      n.parent = this.viewNode;
      const ut = n.addComponent(UITransform);
      const w = 8 + Math.random() * 10;
      ut.setContentSize(w, w);
      const g = n.addComponent(Graphics);
      g.fillColor = new Color(180, 160, 120, 255);
      g.rect(-w / 2, -w / 2, w, w);
      g.fill();

      const local = this.viewNode.getComponent(UITransform)!.convertToNodeSpaceAR(worldPos);
      n.setPosition(local.x, local.y, 0);

      const angle = Math.random() * Math.PI * 2;
      const dist = 60 + Math.random() * 80;
      const target = new Vec3(local.x + Math.cos(angle) * dist, local.y + Math.sin(angle) * dist, 0);
      Fx.popArc(n, n.position.clone(), target, 0.5).then(() => {
        if (n.isValid) n.destroy();
      });
    }
  }

  private updateGlow(glow: 'white' | 'blue' | 'gold' | 'rainbow', worldPos: Vec3): void {
    if (!this.viewNode) return;
    if (this.glowNode && this.glowNode.isValid) {
      this.glowNode.destroy();
      this.glowNode = null;
    }
    const colors: Record<string, Color> = {
      white: new Color(255, 255, 255, 180),
      blue: new Color(100, 200, 255, 200),
      gold: new Color(255, 220, 80, 220),
      rainbow: new Color(255, 120, 255, 220),
    };
    const color = colors[glow] ?? colors.white;
    this.glowNode = Art.makeVisual(`glow_${glow}`, 70, 70, color);
    this.glowNode.parent = this.viewNode;
    const local = this.viewNode.getComponent(UITransform)!.convertToNodeSpaceAR(worldPos);
    this.glowNode.setPosition(local.x, local.y + 50, 0);
  }

  private clearHoldEffects(): void {
    if (this.glowNode && this.glowNode.isValid) {
      this.glowNode.destroy();
      this.glowNode = null;
    }
    if (this.edgeGlowOn) {
      Fx.edgeGlow(this.root, new Color(255, 255, 255, 255), false);
      this.edgeGlowOn = false;
    }
  }

  // ------------------------------------------------------------------
  // 挖盒子动画与结果处理
  // ------------------------------------------------------------------
  private async performDig(boxId: string, holdSec: number): Promise<void> {
    const boxNode = this.boxNodes.get(boxId);
    const box = this.game.boxesAt(this.game.location!).find((b) => b.id === boxId);
    if (!boxNode || !box) return;

    // 盒子开启动画
    if (box.size === 'small') {
      Fx.pulse(boxNode, 1.3, 0.15);
      await Fx.freeze(0.2);
      await Fx.fadeOut(boxNode, 0.2);
    } else {
      Fx.pulse(boxNode, 1.5, 0.25);
      await Fx.freeze(0.15);

      // 松手大盒播 lid_pop
      if (boxNode.parent) {
        const lidPop = Art.makeVisual('lid_pop', BIG_BOX, BIG_BOX, new Color(200, 180, 120, 255));
        lidPop.parent = boxNode.parent;
        lidPop.setPosition(boxNode.position.x, boxNode.position.y, 0);
        Art.play(lidPop, 'lid_pop', 10, false);
        await Fx.freeze(0.6);
        if (lidPop.isValid) lidPop.destroy();
      }

      await Fx.freeze(0.2);
      await Fx.fadeOut(boxNode, 0.3);
    }
    boxNode.active = false;

    const result = this.game.dig(boxId, holdSec);
    if (!result.ok) {
      if (result.reason) {
        Fx.floatText(this.viewNode!, result.reason, new Vec3(0, 200, 0), new Color(255, 80, 80, 255));
      }
      this.onChanged();
      return;
    }

    // 事故
    if (result.mishap) {
      this.spawnMishapEffect();
      Fx.screenShake(this.root);
    }

    // 物品飞入待选区；每件稀有/史诗单独高亮 + 真冻结 0.3s
    const boxWorld = this.getBoxWorldPos(boxId);
    let hasRare = false;
    for (const item of result.items) {
      const node = await this.spawnItemToFloor(item, boxWorld);
      const def = ITEMS.find((i) => i.id === item.itemId);
      if (node && def && (def.rarity === 'rare' || def.rarity === 'epic')) {
        hasRare = true;
        await this.showRareReveal(node, def);
      }
    }
    this.layoutFloor();

    // 稀有/史诗开奖特效（冻结已在每件物品上做过）
    if (result.glow === 'gold' || result.glow === 'rainbow') {
      Fx.flash(this.root, result.glow === 'gold' ? new Color(255, 220, 150, 180) : new Color(255, 150, 255, 180));
      Fx.screenShake(this.root);
    }
    if (!hasRare && result.quip) {
      Fx.floatText(this.viewNode!, result.quip, new Vec3(0, -40, 0));
    }

    this.onChanged();

    if (result.event) {
      this.onEvent(result.event);
    } else if (result.collapsed) {
      this.onChanged();
    }
  }

  private getBoxWorldPos(boxId: string): Vec3 {
    const node = this.boxNodes.get(boxId);
    if (!node) return new Vec3(0, 0, 0);
    return node.getWorldPosition();
  }

  private spawnMishapEffect(): void {
    if (!this.viewNode) return;
    const isCat = Math.random() > 0.5;
    const node = Art.makeVisual(isCat ? 'npc_cat' : 'ev_rain', 80, 80, isCat ? new Color(120, 120, 120, 220) : new Color(100, 200, 100, 200), isCat ? '喵' : '绿烟');
    node.parent = this.viewNode;
    node.setPosition(0, 80, 0);
    Fx.shake(node, 12, 0.5);
    tween(node).delay(1.2).call(() => node.destroy()).start();
  }

  private createPopFlash(parent: Node, pos: Vec3): void {
    if (Art.frames('pop_flash').length > 0) {
      const fx = Art.makeVisual('pop_flash', 64, 64, Color.WHITE);
      fx.parent = parent;
      fx.setPosition(pos.x, pos.y, 0);
      Art.play(fx, 'pop_flash', 14, false);
      tween(fx).delay(0.45).call(() => { if (fx.isValid) fx.destroy(); }).start();
      return;
    }
    const flash = uiNode('pop_flash_placeholder');
    flash.parent = parent;
    const ft = flash.addComponent(UITransform);
    ft.setContentSize(60, 60);
    const g = flash.addComponent(Graphics);
    g.fillColor = new Color(255, 255, 255, 220);
    g.circle(0, 0, 30);
    g.fill();
    flash.setPosition(pos.x, pos.y, 0);
    const op = flash.addComponent(UIOpacity);
    op.opacity = 255;
    tween(flash)
      .to(0.15, { scale: new Vec3(1.5, 1.5, 1) })
      .start();
    tween(op)
      .to(0.2, { opacity: 0 })
      .call(() => {
        if (flash.isValid) flash.destroy();
      })
      .start();
  }

  private async spawnItemToFloor(item: ItemInst, fromWorld: Vec3): Promise<Node | null> {
    if (!this.floorContainer || !this.viewNode) return null;
    const def = ITEMS.find((i) => i.id === item.itemId);
    const color = this.rarityColor(def?.rarity ?? 'common');
    const node = this.createItemNode(item, def, color, 'floor');
    const floorLocalFrom = this.floorContainer.getComponent(UITransform)!.convertToNodeSpaceAR(fromWorld);
    const target = this.getFloorSlotPosition(this.game.floor.indexOf(item));
    node.parent = this.floorContainer;
    node.setPosition(floorLocalFrom.x, floorLocalFrom.y, 0);
    node.angle = (this.floorRotated.get(item.uid) ?? false) ? 90 : 0;
    this.floorNodes.set(item.uid, node);
    this.attachFloorTouch(node, item.uid);
    await Fx.popArc(node, floorLocalFrom, target, 0.5);

    // 物品弹出闪光 pop_flash（fx_item_pop 序列帧，缺图时退回代码闪光）
    const flashLocalPos = new Vec3(target.x, target.y, 0);
    this.createPopFlash(this.floorContainer, flashLocalPos);
    return node;
  }

  /** 稀有物品开奖：放大高亮 + 名称/吐槽面板 + 真冻结 0.3s。 */
  private async showRareReveal(node: Node, def: ItemDef): Promise<void> {
    if (!this.viewNode || !node.isValid) return;
    const viewUt = this.viewNode.getComponent(UITransform);
    if (!viewUt) return;
    const local = viewUt.convertToNodeSpaceAR(node.getWorldPosition());
    const oldScale = node.scale.clone();
    node.setScale(oldScale.x * 1.3, oldScale.y * 1.3, oldScale.z);

    const color = this.rarityColor(def.rarity);
    const panel = uiNode('rare_reveal');
    panel.parent = this.viewNode;
    const put = panel.addComponent(UITransform);
    put.setContentSize(360, 86);
    const maxX = Math.max(0, UILayout.halfW - 190);
    const panelX = Math.max(-maxX, Math.min(maxX, local.x));
    panel.setPosition(panelX, local.y + 72, 0);
    const pg = panel.addComponent(Graphics);
    pg.fillColor = new Color(0, 0, 0, 220);
    pg.roundRect(-180, -43, 360, 86, 10);
    pg.fill();
    pg.lineWidth = 2;
    pg.strokeColor = color;
    pg.roundRect(-180, -43, 360, 86, 10);
    pg.stroke();

    const textNode = uiNode('rare_text');
    textNode.parent = panel;
    const tut = textNode.addComponent(UITransform);
    tut.setContentSize(344, 78);
    const lb = textNode.addComponent(Label);
    lb.string = `${def.name}\n${def.desc}`;
    lb.fontSize = 20;
    lb.lineHeight = 24;
    lb.color = new Color(255, 250, 230, 255);
    lb.horizontalAlign = Label.HorizontalAlign.CENTER;
    lb.verticalAlign = Label.VerticalAlign.CENTER;
    lb.overflow = Label.Overflow.SHRINK;
    lb.enableWrapText = true;
    textNode.setPosition(0, 0, 0);

    await Fx.sceneFreeze(this.viewNode, 0.3);

    if (panel.isValid) panel.destroy();
    if (node.isValid) node.setScale(oldScale);
  }

  private createItemNode(
    item: ItemInst,
    def?: ItemDef,
    color?: Color,
    context: 'floor' | 'bag' = 'floor',
  ): Node {
    const fallbackColor = color ?? this.rarityColor(def?.rarity ?? 'common');
    const isFloor = context === 'floor';
    const iconSize = isFloor ? FLOOR_ICON : BAG_ICON;
    const plateSize = isFloor ? FLOOR_PLATE : BAG_PLATE;
    const glowSize = isFloor ? FLOOR_GLOW : BAG_GLOW;
    const rarity = def?.rarity ?? 'common';

    const root = uiNode(`item_${item.itemId}`);
    const rut = root.addComponent(UITransform);
    rut.setContentSize(plateSize, plateSize);
    rut.setAnchorPoint(0.5, 0.5);
    // 透明命中层：保证容器本身可接收触摸
    const hit = root.addComponent(Graphics);
    hit.fillColor = new Color(0, 0, 0, 1);
    hit.rect(-plateSize / 2, -plateSize / 2, plateSize, plateSize);
    hit.fill();

    // 外围稀有度色光环，地面和背包统一复用 fx/glow_* 序列帧
    const glowInfo = this.rarityGlow(rarity);
    const glow = Art.makeVisual(glowInfo.name, glowSize, glowSize, glowInfo.color);
    glow.parent = root;
    glow.setPosition(0, 0, 0);
    const gsp = glow.getComponent(Sprite);
    if (gsp) gsp.color = glowInfo.color;
    const gop = glow.getComponent(UIOpacity) ?? glow.addComponent(UIOpacity);
    gop.opacity = 220;

    // #000 alpha 0.55 的圆角底板
    const plate = uiNode('plate');
    plate.parent = root;
    const put = plate.addComponent(UITransform);
    put.setContentSize(plateSize, plateSize);
    const pg = plate.addComponent(Graphics);
    pg.fillColor = new Color(0, 0, 0, 140);
    pg.roundRect(-plateSize / 2, -plateSize / 2, plateSize, plateSize, 9);
    pg.fill();

    const icon = Art.makeVisual(
      `icon_${item.itemId}`,
      iconSize,
      iconSize,
      fallbackColor,
      def?.name ?? item.itemId,
    );
    icon.parent = root;
    icon.setPosition(0, 0, 0);
    const iut = icon.getComponent(UITransform);
    if (iut) iut.setAnchorPoint(0.5, 0.5);

    // 1px 深色描边，压在图标边缘
    const outline = uiNode('outline');
    outline.parent = root;
    const outUt = outline.addComponent(UITransform);
    outUt.setContentSize(iconSize, iconSize);
    const og = outline.addComponent(Graphics);
    og.strokeColor = new Color(0, 0, 0, 220);
    og.lineWidth = 1;
    og.rect(-iconSize / 2, -iconSize / 2, iconSize, iconSize);
    og.stroke();

    return root;
  }

  private rarityGlow(rarity: Rarity): { name: string; color: Color } {
    switch (rarity) {
      case 'good':
        return { name: 'glow_blue', color: new Color(110, 190, 255, 255) };
      case 'rare':
        return { name: 'glow_gold', color: new Color(255, 210, 90, 255) };
      case 'epic':
        return { name: 'glow_rainbow', color: new Color(255, 255, 255, 255) };
      case 'mishap':
        return { name: 'glow_white', color: new Color(255, 130, 130, 255) };
      case 'common':
      default:
        return { name: 'glow_white', color: new Color(255, 255, 255, 255) };
    }
  }

  private rarityColor(rarity: Rarity): Color {
    switch (rarity) {
      case 'common': return new Color(170, 170, 170, 255);
      case 'good': return new Color(100, 200, 120, 255);
      case 'rare': return new Color(80, 160, 255, 255);
      case 'epic': return new Color(200, 100, 255, 255);
      case 'mishap': return new Color(220, 100, 100, 255);
      default: return new Color(200, 200, 200, 255);
    }
  }

  private getFloorSlotPosition(index: number): Vec3 {
    const n = Math.max(1, this.game.floor.length);
    const perRow = 6;
    const row = Math.floor(index / perRow);
    const col = index % perRow;
    const inRow = Math.min(perRow, Math.max(1, n - row * perRow));
    const safeW = Math.min(720, UILayout.visibleW) - 56;
    // 地面图标 64 + 72 底板 + 88 光环，间距至少 92，避免相邻物品叠在一起
    const spacing = Math.max(92, Math.min(100, safeW / Math.max(1, inRow)));
    const x = (col - (inRow - 1) / 2) * spacing;
    return new Vec3(x, 50 - row * 88, 0);
  }

  private layoutFloor(): void {
    if (!this.floorContainer) return;
    const items = this.game.floor;
    for (let i = 0; i < items.length; i++) {
      const uid = items[i].uid;
      const node = this.floorNodes.get(uid);
      if (node) {
        const target = this.getFloorSlotPosition(i);
        tween(node).to(0.2, { position: target }).start();
      }
    }
  }

  // ------------------------------------------------------------------
  // 渲染待选区与背包
  // ------------------------------------------------------------------
  private renderFloor(): void {
    if (!this.floorContainer) return;
    this.floorContainer.children.forEach((child) => child.destroy());
    this.floorNodes.clear();
    this.game.floor.forEach((item, idx) => {
      const def = ITEMS.find((i) => i.id === item.itemId);
      const node = this.createItemNode(item, def, undefined, 'floor');
      node.parent = this.floorContainer;
      const target = this.getFloorSlotPosition(idx);
      node.setPosition(target.x, target.y, 0);
      node.angle = (this.floorRotated.get(item.uid) ?? false) ? 90 : 0;
      this.floorNodes.set(item.uid, node);
      this.attachFloorTouch(node, item.uid);
    });
  }

  private renderBag(): void {
    if (!this.bagContainer) return;
    this.bagContainer.children.forEach((child) => child.destroy());
    this.bagNodes.clear();

    // 创建格子背景节点（放在最底层）
    this.bagGridNode = uiNode('bag_grid');
    this.bagGridGraphics = this.bagGridNode.addComponent(Graphics);
    this.bagGridNode.parent = this.bagContainer;
    this.bagGridNode.setPosition(0, 0, 0);
    this.redrawBagCells();

    // 添加物品节点
    this.game.bag.forEach((placed) => {
      const def = ITEMS.find((i) => i.id === placed.itemId);
      const node = this.createItemNode(placed, def, undefined, 'bag');
      node.parent = this.bagContainer;
      // 按实际占用方向旋转图标：1×2 竖放转 90°，2×1 横放保持 0°
      node.angle = def?.cells === 2 && placed.h > placed.w ? 90 : 0;
      this.placeBagNode(node, placed.x, placed.y, placed.w, placed.h);
      this.bagNodes.set(placed.uid, node);
      this.attachBagTouch(node, placed.uid);
    });
  }

  /** 被抓等事件清空背包时，同步销毁 UI 里的物品节点。 */
  public clearBagView(): void {
    if (!this.bagContainer) return;
    for (const node of this.bagNodes.values()) {
      if (node && node.isValid) node.destroy();
    }
    this.bagNodes.clear();
    this.redrawBagCells();
  }

  private redrawBagCells(): void {
    if (!this.bagGridGraphics || !this.bagGridNode) return;
    const g = this.bagGridGraphics;
    g.clear();
    const w = this.game.bagW;
    const h = this.game.bagH;
    const totalW = w * CELL;
    const totalH = h * CELL;
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        const cx = -totalW / 2 + i * CELL + CELL / 2;
        const cy = totalH / 2 - j * CELL - CELL / 2;
        let state: 'normal' | 'hover' | 'bad' | 'filled' = 'normal';
        if (this.hoverCell && this.hoverCell.x === i && this.hoverCell.y === j) {
          state = 'hover';
        } else if (this.badCells.some((c) => c.x === i && c.y === j)) {
          state = 'bad';
        } else if (this.isCellOccupied(i, j)) {
          state = 'filled';
        }
        Art.drawCell(g, cx, cy, CELL, state, this.badCellAlpha);
      }
    }
  }

  private isCellOccupied(cellX: number, cellY: number): boolean {
    for (const p of this.game.bag) {
      if (cellX >= p.x && cellX < p.x + p.w && cellY >= p.y && cellY < p.y + p.h) {
        return true;
      }
    }
    return false;
  }

  private placedToLocal(x: number, y: number, w: number, h: number): Vec3 {
    const center = bagCellCenter(this.game.bagW, this.game.bagH, CELL, x, y, w, h);
    return new Vec3(center.x, center.y, 0);
  }

  /** 把节点放到占用格矩形的中心；按节点实际锚点和尺寸修正 position。 */
  private placeBagNode(node: Node, x: number, y: number, w: number, h: number): void {
    const center = bagCellCenter(this.game.bagW, this.game.bagH, CELL, x, y, w, h);
    const ut = node.getComponent(UITransform);
    const anchor = ut ? ut.anchorPoint : { x: 0.5, y: 0.5 };
    const size = ut ? ut.contentSize : { width: 48, height: 48 };
    const pos = positionForAnchor(center, { x: anchor.x, y: anchor.y }, { width: size.width, height: size.height });
    node.setPosition(pos.x, pos.y, 0);
  }

  private attachFloorTouch(node: Node, uid: number): void {
    node.on(Node.EventType.TOUCH_START, (event: EventTouch) => this.onFloorTouchStart(event, uid), this);
    node.on(Node.EventType.TOUCH_MOVE, (event: EventTouch) => this.onFloorTouchMove(event, uid), this);
    node.on(Node.EventType.TOUCH_END, (event: EventTouch) => this.onFloorTouchEnd(event, uid), this);
    node.on(Node.EventType.TOUCH_CANCEL, (event: EventTouch) => this.onFloorTouchCancel(event, uid), this);
  }

  private attachBagTouch(node: Node, uid: number): void {
    node.on(Node.EventType.TOUCH_START, (event: EventTouch) => this.onBagTouchStart(event, uid), this);
    node.on(Node.EventType.TOUCH_END, (event: EventTouch) => this.onBagTouchEnd(event, uid), this);
    node.on(Node.EventType.TOUCH_CANCEL, (event: EventTouch) => this.onBagTouchCancel(event, uid), this);
  }

  // ------------------------------------------------------------------
  // 待选区拖拽
  // ------------------------------------------------------------------
  private onFloorTouchStart(event: EventTouch, uid: number): void {
    if (this.draggingUid !== null || this.holdBoxId) return;
    const node = this.floorNodes.get(uid);
    const viewUt = this.viewNode?.getComponent(UITransform);
    if (!node || !this.viewNode || !viewUt) return;

    this.potentialDrag = true;
    this.isDragging = false;
    this.touchStartPos = this.getTouchLocal(event, this.viewNode);
    this.touchStartTime = Date.now();
    this.draggingUid = uid;
    this.draggingNode = node;

    // 偏移量统一在 viewNode 坐标系里算，避免拖拽时因父节点切换而跳位
    const nodeView = viewUt.convertToNodeSpaceAR(node.getWorldPosition());
    this.dragOffset = new Vec3(
      nodeView.x - this.touchStartPos.x,
      nodeView.y - this.touchStartPos.y,
      0,
    );
  }

  private onFloorTouchMove(event: EventTouch, uid: number): void {
    if (this.draggingUid !== uid || (!this.potentialDrag && !this.isDragging) || !this.viewNode || !this.draggingNode) return;
    const viewUt = this.viewNode.getComponent(UITransform);
    if (!viewUt) return;
    const touchView = this.getTouchLocal(event, this.viewNode);

    if (!this.isDragging && Vec3.distance(this.touchStartPos, touchView) > 16) {
      this.isDragging = true;
      this.potentialDrag = false;
      // 提升到 viewNode，避免被 floor 容器的位置/裁剪影响
      const local = viewUt.convertToNodeSpaceAR(this.draggingNode.getWorldPosition());
      this.draggingNode.setParent(this.viewNode);
      this.draggingNode.setPosition(local.x, local.y, 0);
      this.draggingNode.setSiblingIndex(this.viewNode.children.length - 1);
    }

    if (this.isDragging) {
      this.draggingNode.setPosition(
        touchView.x + this.dragOffset.x,
        touchView.y + this.dragOffset.y,
        0,
      );

      const cell = this.cellFromViewTouch(touchView);
      if (cell) {
        if (!this.hoverCell || this.hoverCell.x !== cell.x || this.hoverCell.y !== cell.y) {
          this.hoverCell = cell;
          this.redrawBagCells();
        }
      } else if (this.hoverCell) {
        this.hoverCell = null;
        this.redrawBagCells();
      }
    }
  }

  private onFloorTouchEnd(event: EventTouch, uid: number): void {
    if (this.draggingUid !== uid) return;
    const wasDragging = this.isDragging;
    const node = this.draggingNode;
    this.draggingUid = null;
    this.draggingNode = null;
    this.potentialDrag = false;
    this.isDragging = false;
    this.hoverCell = null;
    this.redrawBagCells();

    if (!wasDragging) {
      // 单击打开菜单（菜单里有「放入背包」备用操作）
      this.showItemMenu(uid, false);
      return;
    }

    if (!node || !this.viewNode || !this.bagContainer) {
      this.renderFloor();
      return;
    }
    const touchView = this.getTouchLocal(event, this.viewNode);
    const dropResult = this.tryPlaceToBag(uid, touchView);
    if (dropResult.success) {
      Sfx.play('snap');
      if (node.isValid) node.destroy();
      Fx.floatText(this.viewNode, '咔', dropResult.pos, new Color(255, 255, 180, 255));
      this.renderFloor();
      this.renderBag();
      this.onChanged();
    } else {
      // 失败：目标格填红 0.4s，再淡出；物品弹回原位
      Sfx.play('bounce');
      this.badCells = dropResult.cells;
      this.badCellAlpha = 1;
      this.redrawBagCells();
      if (this.floorContainer) {
        node.setParent(this.floorContainer);
        tween(node).to(0.25, { position: dropResult.originalFloorPos }).start();
      }
      const fade = { v: 1 };
      tween(fade)
        .delay(0.4)
        .to(0.2, { v: 0 }, {
          onUpdate: () => {
            this.badCellAlpha = fade.v;
            this.redrawBagCells();
          },
        })
        .call(() => {
          this.badCells = [];
          this.badCellAlpha = 1;
          this.redrawBagCells();
          this.renderFloor();
        })
        .start();
    }
  }

  private onFloorTouchCancel(event: EventTouch, uid: number): void {
    if (this.draggingUid !== uid) return;
    this.cancelDrag();
  }

  private cancelDrag(): void {
    if (this.draggingNode && this.floorContainer) {
      this.draggingNode.setParent(this.floorContainer);
      const uid = this.draggingUid;
      if (uid != null) {
        const idx = this.game.floor.findIndex((i) => i.uid === uid);
        if (idx >= 0) {
          const target = this.getFloorSlotPosition(idx);
          tween(this.draggingNode).to(0.2, { position: target }).start();
        }
      }
    }
    this.draggingUid = null;
    this.draggingNode = null;
    this.potentialDrag = false;
    this.isDragging = false;
    this.hoverCell = null;
    this.redrawBagCells();
  }

  private tryPlaceToBag(uid: number, touchView: Vec3): {
    success: boolean;
    cell: { x: number; y: number } | null;
    cells: { x: number; y: number }[];
    pos: Vec3;
    originalFloorPos: Vec3;
  } {
    const item = this.game.floor.find((i) => i.uid === uid);
    if (!item) return { success: false, cell: null, cells: [], pos: new Vec3(), originalFloorPos: new Vec3() };
    const def = ITEMS.find((i) => i.id === item.itemId);
    if (!def) return { success: false, cell: null, cells: [], pos: new Vec3(), originalFloorPos: new Vec3() };

    const rotated = this.floorRotated.get(uid) ?? false;
    const cell = this.cellFromViewTouch(touchView);
    if (!cell) return { success: false, cell: null, cells: [], pos: new Vec3(), originalFloorPos: new Vec3() };

    let success = this.game.placeFromFloor(uid, cell.x, cell.y, rotated);
    if (!success && def.cells === 2) {
      // 大件拖到只放得下另一个方向的格子时，自动换方向再试一次
      success = this.game.placeFromFloor(uid, cell.x, cell.y, !rotated);
    }
    const placed = this.game.bag.find((p) => p.uid === uid);
    const pos = placed ? this.placedToLocal(placed.x, placed.y, placed.w, placed.h) : new Vec3();
    const originalIdx = this.game.floor.findIndex((i) => i.uid === uid);
    const originalFloorPos = originalIdx >= 0 ? this.getFloorSlotPosition(originalIdx) : new Vec3();
    const cells = this.placementCells(cell.x, cell.y, def.cells, rotated);
    return { success, cell, cells, pos, originalFloorPos };
  }

  private placementCells(
    x: number,
    y: number,
    itemCells: number,
    rotated: boolean,
  ): { x: number; y: number }[] {
    const w = itemCells === 2 ? (rotated ? 1 : 2) : 1;
    const h = itemCells === 2 ? (rotated ? 2 : 1) : 1;
    const cells: { x: number; y: number }[] = [];
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        const cx = x + dx;
        const cy = y + dy;
        if (cx >= 0 && cy >= 0 && cx < this.game.bagW && cy < this.game.bagH) {
          cells.push({ x: cx, y: cy });
        }
      }
    }
    return cells;
  }

  /** 备用操作：自动找第一个能放下的格子（优先当前旋转方向）。 */
  private autoPlaceToBag(uid: number): { ok: boolean; pos: Vec3 } {
    const item = this.game.floor.find((i) => i.uid === uid);
    if (!item) return { ok: false, pos: new Vec3() };
    const def = ITEMS.find((i) => i.id === item.itemId);
    if (!def) return { ok: false, pos: new Vec3() };

    const preferred = this.floorRotated.get(uid) ?? false;
    const rotations = def.cells === 2 ? [preferred, !preferred] : [false];
    for (let y = 0; y < this.game.bagH; y++) {
      for (let x = 0; x < this.game.bagW; x++) {
        for (const rotated of rotations) {
          if (this.game.placeFromFloor(uid, x, y, rotated)) {
            const placed = this.game.bag.find((p) => p.uid === uid);
            const pos = placed ? this.placedToLocal(placed.x, placed.y, placed.w, placed.h) : new Vec3();
            return { ok: true, pos };
          }
        }
      }
    }
    return { ok: false, pos: new Vec3() };
  }

  private cellFromViewTouch(touchView: Vec3): { x: number; y: number } | null {
    if (!this.viewNode || !this.bagContainer) return null;
    const viewUt = this.viewNode.getComponent(UITransform);
    const bagUt = this.bagContainer.getComponent(UITransform);
    if (!viewUt || !bagUt) return null;

    const world = viewUt.convertToWorldSpaceAR(new Vec3(touchView.x, touchView.y, 0));
    const bagLocal = bagUt.convertToNodeSpaceAR(world);
    const totalW = this.game.bagW * CELL;
    const totalH = this.game.bagH * CELL;
    const startX = -totalW / 2;
    const startY = totalH / 2;
    const relX = bagLocal.x - startX;
    const relY = startY - bagLocal.y;
    if (relX < 0 || relY < 0 || relX >= totalW || relY >= totalH) return null;
    const x = Math.floor(relX / CELL);
    const y = Math.floor(relY / CELL);
    if (x < 0 || x >= this.game.bagW || y < 0 || y >= this.game.bagH) return null;
    return { x, y };
  }

  // ------------------------------------------------------------------
  // 背包物品点击
  // ------------------------------------------------------------------
  private onBagTouchStart(event: EventTouch, uid: number): void {
    // 留空，避免事件穿透
  }

  private onBagTouchEnd(event: EventTouch, uid: number): void {
    if (this.draggingUid !== null) return;
    this.showItemMenu(uid, true);
  }

  private onBagTouchCancel(event: EventTouch, uid: number): void {
    // 留空
  }

  // ------------------------------------------------------------------
  // 物品菜单
  // ------------------------------------------------------------------
  private showItemMenu(uid: number, isBag: boolean): void {
    this.closeMenu();
    if (!this.viewNode) return;

    let def: ItemDef | undefined;
    if (isBag) {
      const placed = this.game.bag.find((p) => p.uid === uid);
      def = placed ? ITEMS.find((i) => i.id === placed.itemId) : undefined;
    } else {
      const item = this.game.floor.find((i) => i.uid === uid);
      def = item ? ITEMS.find((i) => i.id === item.itemId) : undefined;
    }
    if (!def) return;

    const actions: { text: string; tap: () => void }[] = [];
    if (isBag) {
      if (def.edible) {
        actions.push({
          text: '吃掉',
          tap: () => {
            this.game.eat(uid);
            this.closeMenu();
            this.renderFloor();
            this.renderBag();
            this.onChanged();
          },
        });
      }
      actions.push({
        text: '拿出',
        tap: () => {
          this.game.moveToFloor(uid);
          this.closeMenu();
          this.renderFloor();
          this.renderBag();
          this.onChanged();
        },
      });
    } else {
      // 点击放入背包的备用操作：自动找第一个空格
      actions.push({
        text: '放入背包',
        tap: () => {
          const result = this.autoPlaceToBag(uid);
          if (result.ok) {
            Sfx.play('snap');
            this.closeMenu();
            this.renderFloor();
            this.renderBag();
            this.onChanged();
            Fx.floatText(this.viewNode!, '咔', result.pos, new Color(255, 255, 180, 255));
          } else {
            Sfx.play('bounce');
            Fx.floatText(this.viewNode!, '背包满了', new Vec3(0, 120, 0), new Color(255, 80, 80, 255));
          }
        },
      });
      if (def.edible) {
        actions.push({
          text: '吃掉',
          tap: () => {
            this.game.eat(uid);
            this.closeMenu();
            this.renderFloor();
            this.renderBag();
            this.onChanged();
          },
        });
      }
      actions.push({
        text: '扔掉',
        tap: () => {
          this.game.discard(uid);
          this.closeMenu();
          this.renderFloor();
          this.onChanged();
        },
      });
      if (def.cells === 2) {
        const rotated = this.floorRotated.get(uid) ?? false;
        actions.push({
          text: rotated ? '取消旋转' : '旋转',
          tap: () => {
            this.floorRotated.set(uid, !rotated);
            this.closeMenu();
            this.renderFloor();
          },
        });
      }
    }

    const panelW = 280;
    const panelH = Math.max(200, 100 + actions.length * 56);
    const menu = uiNode('item_menu');
    menu.parent = this.viewNode;
    const mut = menu.addComponent(UITransform);
    mut.setContentSize(720, 1280);
    menu.setPosition(0, 0, 0);

    const dim = uiNode('dim');
    dim.parent = menu;
    const dut = dim.addComponent(UITransform);
    dut.setContentSize(720, 1280);
    const dg = dim.addComponent(Graphics);
    dg.fillColor = new Color(0, 0, 0, 130);
    dg.rect(-360, -640, 720, 1280);
    dg.fill();
    dim.on(Node.EventType.TOUCH_START, () => this.closeMenu(), this);

    const panel = uiNode('panel');
    panel.parent = menu;
    const put = panel.addComponent(UITransform);
    put.setContentSize(panelW, panelH);
    panel.setPosition(0, 40, 0);
    const pg = panel.addComponent(Graphics);
    pg.fillColor = new Color(40, 40, 40, 240);
    pg.roundRect(-panelW / 2, -panelH / 2, panelW, panelH, 12);
    pg.fill();
    pg.strokeColor = new Color(200, 200, 200, 255);
    pg.lineWidth = 2;
    pg.stroke();

    const title = uiNode('title');
    const tut = title.addComponent(UITransform);
    tut.setContentSize(panelW - 20, 40);
    const tl = title.addComponent(Label);
    tl.string = def.name;
    tl.fontSize = 24;
    tl.lineHeight = 28;
    tl.color = new Color(255, 255, 255, 255);
    tl.horizontalAlign = Label.HorizontalAlign.CENTER;
    tl.verticalAlign = Label.VerticalAlign.CENTER;
    title.parent = panel;
    title.setPosition(0, panelH / 2 - 34, 0);

    let y = panelH / 2 - 84;
    for (const action of actions) {
      const btn = Art.makeButton(action.text, 210, 44, action.tap, 20);
      btn.parent = panel;
      btn.setPosition(0, y, 0);
      y -= 56;
    }

    menu.setSiblingIndex(this.viewNode.children.length - 1);
    this.menuNode = menu;
  }

  private addMenuButton(parent: Node, text: string, pos: Vec3, onClick: () => void): void {
    const btn = Art.makeButton(text, 210, 44, onClick, 20);
    btn.parent = parent;
    btn.setPosition(pos.x, pos.y, 0);
  }

  private closeMenu(): void {
    if (this.menuNode && this.menuNode.isValid) {
      this.menuNode.destroy();
    }
    this.menuNode = null;
  }

  // ------------------------------------------------------------------
  // 工具方法
  // ------------------------------------------------------------------
  private getTouchLocal(event: EventTouch, target: Node): Vec3 {
    const uiLoc = event.getUILocation();
    const local = target.getComponent(UITransform)?.convertToNodeSpaceAR(new Vec3(uiLoc.x, uiLoc.y, 0));
    return local ?? new Vec3(0, 0, 0);
  }

  /** 按高度适配背景 Sprite（如果存在），保持宽高比并居中 */
  private adaptBackgroundToHeight(bgNode: Node, height: number): void {
    const sprite = bgNode.getComponent(Sprite);
    if (!sprite || !sprite.spriteFrame) return;
    const frame = sprite.spriteFrame;
    const origSize = frame.originalSize;
    const origW = origSize.width;
    const origH = origSize.height;
    if (origW <= 0 || origH <= 0) return;
    const scale = height / origH;
    const newW = origW * scale;
    const ut = bgNode.getComponent(UITransform);
    if (ut) {
      ut.setContentSize(newW, height);
    }
    // 保持中心锚点不变，位置不变
  }
}