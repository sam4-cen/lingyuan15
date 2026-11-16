import {
  Color,
  Graphics,
  Label,
  Node,
  Sprite,
  Texture2D,
  Tween,
  UIOpacity,
  UITransform,
  Vec3,
  tween,
  view,
  isValid,
} from 'cc';
import { Game, PendingEvent } from '../core/game';
import { Art, ArtSpritePlayer } from './Art';
import { uiNode, UILayout } from './UI';
import { Fx } from './Fx';
import { PixelFont } from './PixelFont';
import { lineHeightForFontSize, pxFont, pxSpacing } from './PixelFontMetrics';
import { fitCardText } from './CardTextLayout';
import {
  EVENT_PRESENTATIONS,
  EVENT_RAIN_ANCHOR_X,
  EVENT_RAIN_ANCHOR_Y,
  EVENT_RAIN_DROP_FRAME_SECONDS,
  EVENT_RAIN_DROPS_ART,
  EVENT_RAIN_ROLE_ART,
  EVENT_RESULT_MIN_SECONDS,
  EVENT_RESULT_PROMPT,
  eventResultTextWidth,
  EVENT_DESC_PLATE_ALPHA,
  EVENT_DESC_PLATE_COLOR,
  EVENT_DESC_PLATE_PAD,
  EVENT_DESC_PLATE_RADIUS,
  EventLayout,
  computeEventLayout,
  computeEventResultLayout,
  eventBackgroundCover,
  eventRainRolePlacement,
} from './EventLayout';
import { RainDropPlayer } from './RainDrops';
import { eventResultText } from './EventCopy';

/** r35：钱包事件必须显示 icons/wallet.png，不再让失主 NPC 代替钱包。 */
export const EVENT_WALLET_ICON_ART = 'icon_wallet';
export const EVENT_WALLET_ICON_SRC = 16;

const COLORS: Record<string, Color> = {
  patrol: new Color(255, 210, 80, 255),
  guard: new Color(170, 180, 190, 255),
  rival: new Color(255, 90, 90, 255),
  auntie: new Color(255, 170, 90, 255),
  delivery: new Color(120, 200, 255, 255),
  wallet: new Color(250, 220, 100, 255),
  cat: new Color(180, 150, 120, 255),
  rain: new Color(120, 160, 220, 255),
};

/**
 * 事件页：所有事件共用一套布局（EventLayout）。
 *
 * 图层从下到上：
 *   1. 全屏场景背景（事件专属背景或通用夜景；缺失时退到当前地点 bg_* / 通用场景）
 *   2. 25%（专属背景）/ 40%（event_night）黑色遮罩
 *   3. 标题 label_plate / 角色图 / 描述 / 选项按钮
 *
 * bg 分包是异步加载的：底板和深色兜底底图先出现，场景图加载完再淡入。
 */
export class EventView {
  public static show(
    root: Node,
    game: Game,
    ev: PendingEvent,
    done: () => void,
    options: { sloganTop?: number | null } = {},
  ): void {
    const size = this.rootSize(root);
    const layout = computeEventLayout({
      visibleW: UILayout.visibleW || size.width,
      visibleH: UILayout.visibleH || size.height,
      headerTop: UILayout.headerTop,
      safeBottom: UILayout.safeBottom,
      titleText: ev.name,
      options: ev.options,
      desc: EVENT_PRESENTATIONS[ev.id]?.desc ?? '',
      locationId: game.location,
      eventId: ev.id,
      cssHeight: UILayout.physicalH / Math.max(1, UILayout.dpr),
      dpr: UILayout.dpr,
      sloganTop: options.sloganTop ?? null,
    });

    const container = uiNode('EventView');
    container.parent = root;
    const ut = container.addComponent(UITransform);
    ut.setContentSize(size.width, size.height);
    container.setPosition(0, 0, 0);
    // 事件页挡住地点页的点击，但按钮/小游戏在容器内部仍能收到事件。
    const swallow = (e: any) => e?.stopPropagation?.();
    container.on(Node.EventType.TOUCH_START, swallow);
    container.on(Node.EventType.TOUCH_END, swallow);

    this.buildBackground(container, game, ev, size, layout);
    this.buildDim(container, size, layout.background.overlayAlpha);

    const stage = uiNode('ev_stage');
    stage.parent = container;
    const sut = stage.addComponent(UITransform);
    sut.setContentSize(size.width, size.height);
    stage.setPosition(0, 0, 0);

    this.buildTitle(stage, ev, layout);
    this.buildRole(stage, ev, layout);
    this.buildDescription(stage, ev, layout);
    this.fadeInStage(stage);

    this.showOptions(stage, root, ev, game, layout, size)
      .then(async (choice) => {
        if (!this.alive(container, stage)) {
          this.cleanup(container);
          done();
          return;
        }
        // 关键：选项确定后立刻结算游戏状态，再播结果动画
        game.resolveEvent(choice.optionIndex, choice.minigameWin);
        if (!this.alive(container, stage)) {
          this.cleanup(container);
          done();
          return;
        }
        await this.playResult(stage, root, game, ev, choice.optionIndex, choice.minigameWin, game.lastEventNotice, layout);
        this.cleanup(container);
        done();
      })
      .catch(() => {
        this.cleanup(container);
        done();
      });
  }

  private static alive(container: Node, stage: Node): boolean {
    return (
      !!container && container.isValid && isValid(container, true) &&
      !!stage && stage.isValid && isValid(stage, true)
    );
  }

  private static cleanup(container: Node): void {
    if (!container || !container.isValid) return;
    // 事件关闭：先停掉雨滴 0.25s 切帧计时器，再销毁整层。
    const rainPlayers = container.getComponentsInChildren(RainDropPlayer);
    for (let i = 0; i < rainPlayers.length; i++) rainPlayers[i].stop();
    container.destroy();
  }

  private static rootSize(root: Node): { width: number; height: number } {
    const ut = root.getComponent(UITransform);
    if (ut) return { width: ut.width, height: ut.height };
    const vs = view.getVisibleSize();
    return { width: vs.width, height: vs.height };
  }

  // ---------------- 背景 / 遮罩 ----------------
  private static buildBackground(
    container: Node,
    game: Game,
    ev: PendingEvent,
    size: { width: number; height: number },
    layout: EventLayout,
  ): void {
    const bg = uiNode('event_bg');
    bg.parent = container;
    const ut = bg.addComponent(UITransform);
    ut.setContentSize(size.width, size.height);
    bg.setPosition(0, 0, 0);

    // 先画一张非纯黑的兜底夜景：即使 bg 分包还没加载完，也绝不会黑屏。
    const base = bg.addComponent(Graphics);
    base.fillColor = new Color(18, 22, 40, 255);
    base.rect(-size.width / 2, -size.height / 2, size.width, size.height);
    base.fill();
    base.fillColor = new Color(28, 34, 56, 255);
    base.rect(-size.width / 2, -size.height * 0.18, size.width, size.height * 0.32);
    base.fill();
    base.fillColor = new Color(46, 38, 52, 255);
    for (let i = 0; i < 7; i++) {
      const w = size.width * (0.08 + (i % 3) * 0.035);
      const h = size.height * (0.12 + ((i * 37) % 40) / 100);
      base.rect(-size.width / 2 + (i * 97) % Math.max(1, size.width), -size.height / 2, w, h);
      base.fill();
    }
    base.fillColor = new Color(68, 54, 48, 255);
    base.rect(-size.width / 2, -size.height / 2, size.width, size.height * 0.12);
    base.fill();

    // 候选：事件专属背景 → event_night → 当前地点场景 → 通用场景。
    // 有序列帧就铺场景图；四张专属背景只换图，铺满方式与 event_night 一致。
    const candidates = layout.background.fallbacks;
    let artName = layout.background.art;
    let frames = Art.frames(artName);
    for (const candidate of candidates) {
      const list = Art.frames(candidate);
      if (list.length > 0) {
        artName = candidate;
        frames = list;
        break;
      }
    }
    // 都没加载到时先挂通用夜景，Art.makeVisual 会在 bg 分包加载完成后自动替换。
    if (frames.length === 0) artName = layout.background.art;

    const scene = Art.makeVisual(artName, size.width, size.height, new Color(24, 28, 48, 255));
    scene.name = 'event_bg_scene';
    scene.parent = bg;
    scene.setPosition(0, 0, 0);
    // 按 cover 等比铺满，可左右裁边，不裁上下。
    this.coverScene(scene, size.width, size.height, frames.length > 0 ? frames[0] : null);

    const opacity = scene.addComponent(UIOpacity);
    if (frames.length > 0) {
      opacity.opacity = 0;
      tween(opacity).to(0.35, { opacity: 255 }).start();
    } else {
      // 加载前只显示深色兜底底板；场景图替换进来后再淡入。
      opacity.opacity = 0;
      let tries = 0;
      const reveal = () => {
        if (!scene || !scene.isValid) return;
        const sp = scene.getComponent(Sprite);
        if (sp && sp.spriteFrame) {
          opacity.opacity = 0;
          tween(opacity).to(0.35, { opacity: 255 }).start();
          return;
        }
        if (++tries < 30) setTimeout(reveal, 100);
      };
      setTimeout(reveal, 60);
    }
    // 事件名只用于日志/调试，不画到背景上。
    void ev;
  }

  private static coverScene(scene: Node, viewW: number, viewH: number, frame: any): void {
    const ut = scene.getComponent(UITransform);
    if (!ut) return;
    const fw = Math.max(1, frame?.originalSize?.width ?? 180);
    const fh = Math.max(1, frame?.originalSize?.height ?? 320);
    // 180×320 源图按整数倍 cover：720×1280 设计屏正好 4 倍，不产生半像素采样。
    const cover = eventBackgroundCover(fw, fh, viewW, viewH);
    ut.setContentSize(cover.width, cover.height);
    scene.setScale(1, 1, 1);
    if (frame?.texture) {
      (frame.texture as Texture2D).setFilters(Texture2D.Filter.NEAREST, Texture2D.Filter.NEAREST);
    }
  }

  private static buildDim(
    container: Node,
    size: { width: number; height: number },
    overlayAlpha: number,
  ): void {
    const dim = uiNode('event_dim');
    dim.parent = container;
    const ut = dim.addComponent(UITransform);
    ut.setContentSize(size.width, size.height);
    dim.setPosition(0, 0, 0);
    const g = dim.addComponent(Graphics);
    // 专属背景 25%，通用夜景 40%；alpha 由 EventLayout 统一给出。
    g.fillColor = new Color(0, 0, 0, Math.round(255 * overlayAlpha));
    g.rect(-size.width / 2, -size.height / 2, size.width, size.height);
    g.fill();
  }

  // ---------------- 内容 ----------------
  private static buildTitle(stage: Node, ev: PendingEvent, layout: EventLayout): void {
    // U2：标题必须用 label_plate 九宫格底板。
    const node = Art.makeVisual('label_plate', layout.title.width, layout.title.height, new Color(26, 40, 68, 240));
    node.name = 'ev_title';
    node.parent = stage;
    node.setPosition(0, layout.title.centerY, 0);
    const plateSprite = node.getComponent(Sprite);
    if (plateSprite) plateSprite.type = Sprite.Type.SLICED;

    const lbNode = uiNode('lb');
    lbNode.parent = node;
    const lut = lbNode.addComponent(UITransform);
    lut.setContentSize(layout.title.width, layout.title.height);
    const lb = lbNode.addComponent(Label);
    const fit = fitCardText(ev.name, {
      maxWidth: Math.max(1, layout.title.width - pxSpacing(16)),
      maxHeight: Math.max(1, layout.title.height),
      fontSize: pxFont(18),
      minFontSize: pxFont(18),
      lineGap: 0,
    });
    lb.string = fit.text;
    lb.fontSize = fit.fontSize;
    lb.lineHeight = fit.lineHeight;
    lb.horizontalAlign = Label.HorizontalAlign.CENTER;
    lb.verticalAlign = Label.VerticalAlign.CENTER;
    lb.overflow = Label.Overflow.CLAMP;
    lb.enableWrapText = false;
    lb.color = new Color(255, 248, 230, 255);
    PixelFont.apply(lb, { color: new Color(255, 248, 230, 255), bg: 'dark' });
  }

  private static buildRole(stage: Node, ev: PendingEvent, layout: EventLayout): void {
    const role = uiNode('ev_role');
    role.parent = stage;
    const ut = role.addComponent(UITransform);
    ut.setContentSize(layout.role.width, layout.role.height);
    role.setPosition(0, layout.role.centerY, 0);

    const artName = ev.id === 'rain' ? EVENT_RAIN_ROLE_ART : layout.role.art;
    // r31：下雨精灵是 40x40，仍按其它 NPC 的整数倍率放大；
    // 节点锚点放在脚底 (20/40, 1-38/40)，位置对齐原主角 idle 的脚底。
    const rainPlacement = ev.id === 'rain' ? eventRainRolePlacement(layout.role.scale) : null;
    const artW = rainPlacement?.size ?? layout.role.width;
    const artH = rainPlacement?.size ?? layout.role.height;
    const visual = Art.makeVisual(artName, artW, artH, COLORS[ev.id] || Color.WHITE, ev.name);
    visual.name = `ev_${ev.id}`;
    visual.parent = role;
    // 保安（r33）与阿姨/巡逻/失主（r37）都用脚底锚点 (16/32, 1-30/32)，
    // role 内的局部坐标同步补偿；下雨精灵沿用 (20/40, 1-38/40) 脚底锚点，
    // 其它旧 NPC 仍是中心锚点、position=0。
    const artUt = visual.getComponent(UITransform);
    if (artUt) {
      if (rainPlacement) {
        artUt.setAnchorPoint(rainPlacement.anchorX, rainPlacement.anchorY);
      } else {
        artUt.setAnchorPoint(layout.role.anchorX, layout.role.anchorY);
      }
    }
    visual.setPosition(layout.role.visualX, layout.role.visualY, 0);
    // 整数倍节点尺寸 + scale=1：纹理由 Sprite 按最近邻采样，禁止非整数缩放。
    visual.setScale(1, 1, 1);
    this.applyNearest(visual);
    Art.play(visual, artName, 8, true);

    if (ev.id === 'wallet') {
      // 钱包图 16×16，按整数倍显示，放在失主脚边；失主仍按整数倍缩放。
      const walletScale = Math.max(1, Math.min(4, Math.floor(layout.role.scale / 2)));
      const walletSize = EVENT_WALLET_ICON_SRC * walletScale;
      const wallet = Art.makeVisual(
        EVENT_WALLET_ICON_ART,
        walletSize,
        walletSize,
        new Color(220, 180, 90, 255),
        '钱包',
      );
      wallet.name = 'ev_wallet_icon';
      wallet.parent = role;
      wallet.setPosition(-layout.role.width * 0.28, -layout.role.height * 0.36, 0);
      wallet.setScale(1, 1, 1);
      this.applyNearest(wallet);
    }

    if (rainPlacement) {
      // 雨滴与 hero_rain 同画布同坐标：同尺寸、同脚底锚点、position=0 即完全叠合。
      this.addRainDrops(visual, rainPlacement.size);
    }
  }

  private static applyNearest(node: Node): void {
    const sprite = node.getComponent(Sprite);
    const frame = sprite?.spriteFrame;
    if (!frame?.texture) return;
    const tex = frame.texture as Texture2D;
    tex.setFilters(Texture2D.Filter.NEAREST, Texture2D.Filter.NEAREST);
    tex.setMipFilter(Texture2D.Filter.NONE);
    // 像素图边缘不能做预乘/双线性混色，否则出现脏黑描边。
    (tex as any).premultiplyAlpha = false;
  }

  private static addRainDrops(parent: Node, size: number): void {
    const drops = Art.makeVisual(
      EVENT_RAIN_DROPS_ART,
      size,
      size,
      new Color(150, 190, 240, 210),
      '雨',
    );
    drops.name = 'ev_rain_drops';
    drops.parent = parent;
    const dut = drops.getComponent(UITransform);
    if (dut) dut.setAnchorPoint(EVENT_RAIN_ANCHOR_X, EVENT_RAIN_ANCHOR_Y);
    drops.setPosition(0, 0, 0);
    drops.setScale(1, 1, 1);
    this.applyNearest(drops);

    const frames = Art.frames(EVENT_RAIN_DROPS_ART);
    if (frames.length === 0) return;
    // Art.makeVisual 默认挂 10fps 的通用播放器；雨滴必须只由 0.25s 播放器驱动。
    const autoPlayer = drops.getComponent(ArtSpritePlayer);
    if (autoPlayer) {
      autoPlayer.enabled = false;
      autoPlayer.destroy();
    }
    const player = drops.getComponent(RainDropPlayer) ?? drops.addComponent(RainDropPlayer);
    player.setFrames(frames, EVENT_RAIN_DROP_FRAME_SECONDS);
  }

  private static buildDescription(stage: Node, ev: PendingEvent, layout: EventLayout): void {
    if (!layout.description) return;
    const desc = layout.description;
    // r35（UI/UX #5）：所有事件描述统一加深色底板 #1a1020、80% 不透明、
    // 6px 内边距、圆角；雨夜/夜市等繁杂背景也能看清。
    const plate = uiNode('ev_desc_plate');
    plate.parent = stage;
    const put = plate.addComponent(UITransform);
    put.setContentSize(desc.plateWidth, desc.plateHeight);
    plate.setPosition(0, desc.centerY, 0);
    const pg = plate.addComponent(Graphics);
    const [pr, pgreen, pb] = EVENT_DESC_PLATE_COLOR;
    pg.fillColor = new Color(pr, pgreen, pb, Math.round(255 * EVENT_DESC_PLATE_ALPHA));
    pg.roundRect(
      -desc.plateWidth / 2,
      -desc.plateHeight / 2,
      desc.plateWidth,
      desc.plateHeight,
      EVENT_DESC_PLATE_RADIUS,
    );
    pg.fill();
    pg.lineWidth = pxSpacing(1);
    pg.strokeColor = new Color(255, 255, 255, 40);
    pg.roundRect(
      -desc.plateWidth / 2,
      -desc.plateHeight / 2,
      desc.plateWidth,
      desc.plateHeight,
      EVENT_DESC_PLATE_RADIUS,
    );
    pg.stroke();

    const node = uiNode('ev_desc');
    node.parent = stage;
    const ut = node.addComponent(UITransform);
    ut.setContentSize(desc.width, desc.height);
    node.setPosition(0, desc.centerY, 0);
    // 文字永远盖在底板上方。
    node.setSiblingIndex(stage.children.length - 1);
    const lb = node.addComponent(Label);
    lb.string = desc.text;
    lb.fontSize = pxFont(12);
    lb.lineHeight = lineHeightForFontSize(pxFont(12));
    lb.horizontalAlign = Label.HorizontalAlign.CENTER;
    lb.verticalAlign = Label.VerticalAlign.CENTER;
    lb.overflow = Label.Overflow.CLAMP;
    lb.enableWrapText = false;
    lb.color = new Color(226, 228, 235, 245);
    PixelFont.apply(lb, { color: new Color(226, 228, 235, 245), bg: 'dark' });
    void ev;
    void EVENT_DESC_PLATE_PAD;
  }

  private static fadeInStage(stage: Node): void {
    const cards = stage.children.filter((n) => n.name === 'ev_title'
      || n.name === 'ev_role'
      || n.name === 'ev_desc'
      || n.name === 'ev_desc_plate');
    for (let i = 0; i < cards.length; i++) {
      const op = cards[i].getComponent(UIOpacity) ?? cards[i].addComponent(UIOpacity);
      op.opacity = 0;
      tween(op).delay(i * 0.04).to(0.25, { opacity: 255 }).start();
    }
  }

  // ---------------- 选项 ----------------
  private static async showOptions(
    stage: Node,
    root: Node,
    ev: PendingEvent,
    game: Game,
    layout: EventLayout,
    size: { width: number; height: number },
  ): Promise<{ optionIndex: number; minigameWin: boolean }> {
    if (!stage || !stage.isValid || !isValid(stage, true)) {
      return { optionIndex: 0, minigameWin: false };
    }
    const layer = uiNode('option_layer');
    layer.parent = stage;
    const lut = layer.addComponent(UITransform);
    lut.setContentSize(size.width, size.height);
    layer.setPosition(0, 0, 0);

    const buttons: Node[] = [];
    for (let i = 0; i < ev.options.length; i++) {
      const rect = layout.buttons.rects[i];
      const btn = this.makeButton(layer, ev.options[i], layout.buttons.width, layout.buttons.height, () => {});
      btn.setPosition(0, (rect.top + rect.bottom) / 2, 0);
      buttons.push(btn);
    }
    // 短暂停顿让场景图淡入，再接受点击。
    await Fx.freeze(0.25);
    if (!stage || !stage.isValid || !isValid(stage, true)) {
      return { optionIndex: 0, minigameWin: false };
    }

    return new Promise((resolve) => {
      buttons.forEach((btn, i) => {
        btn.off(Node.EventType.TOUCH_END);
        btn.on(Node.EventType.TOUCH_END, async (e: any) => {
          if (e && e.stopPropagation) e.stopPropagation();
          // 选项出现后先整层隐藏，避免结果文字压在按钮上
          layer.active = false;
          let minigameWin = false;
          if (ev.id === 'rival' && i === 1) {
            minigameWin = await this.runMinigame(stage, root, layout);
          }
          resolve({ optionIndex: i, minigameWin });
        });
      });
    });
  }

  private static async runMinigame(stage: Node, root: Node, layout: EventLayout): Promise<boolean> {
    if (!stage || !stage.isValid || !isValid(stage, true)) return false;
    const w = stage.getComponent(UITransform)!.width;
    const h = stage.getComponent(UITransform)!.height;
    const layer = uiNode('minigame');
    layer.parent = stage;
    const lut = layer.addComponent(UITransform);
    lut.setContentSize(w, h);
    layer.setPosition(0, 0, 0);

    // U3/3g：小游戏不再铺一层不透明深色遮罩盖住事件页；
    // 只压一层 35% 暗色，背景、标题牌、NPC 仍然可见。
    const dim = this.rect(layer, 'mg_dim', w, h, new Color(0, 0, 0, 90));
    dim.setPosition(0, 0, 0);

    const descNode = stage.getChildByName('ev_desc');
    if (descNode) descNode.active = false;

    const panelW = Math.max(260, Math.min(520, w * 0.78));
    const panelH = Math.max(120, Math.round(layout.area.height * 0.16));
    const panelY = layout.area.top - layout.area.height * 0.60;
    const panel = this.rect(layer, 'mg_panel', panelW, panelH, new Color(20, 20, 30, 235));
    panel.setPosition(0, panelY, 0);
    const title = this.label(layer, '比谁掏得快', pxFont(18), 0, panelY + panelH * 0.22);
    title.name = 'mg_title';
    const hint = this.label(layer, '狂点屏幕！', pxFont(12), 0, panelY - panelH * 0.02);
    const counter = this.label(layer, '0 次', pxFont(18), 0, panelY - panelH * 0.27);
    let count = 0;

    layer.on(Node.EventType.TOUCH_END, (e: any) => {
      if (e && e.stopPropagation) e.stopPropagation();
      count++;
      counter.getComponent(Label)!.string = `${count} 次`;
    });

    const start = Date.now();
    const duration = 3000;
    return new Promise<boolean>((resolve) => {
      const tick = setInterval(() => {
        if (!layer || !layer.isValid || !isValid(layer, true)) {
          clearInterval(tick);
          if (descNode && descNode.isValid) descNode.active = true;
          resolve(false);
          return;
        }
        const elapsed = Date.now() - start;
        if (elapsed >= duration) {
          clearInterval(tick);
          layer.active = false;
          layer.destroy();
          if (descNode && descNode.isValid) descNode.active = true;
          resolve(count >= 15);
        }
      }, 100);
    });
  }

  // ---------------- 结果动画 ----------------
  private static async playResult(
    stage: Node,
    root: Node,
    game: Game,
    ev: PendingEvent,
    optionIndex: number,
    minigameWin: boolean,
    notice: string | undefined,
    layout: EventLayout,
  ): Promise<void> {
    if (!stage || !stage.isValid || !isValid(stage, true)) return;
    const artNode = stage.getChildByName('ev_role');
    void root;

    // 选项已结算：结果出现前先隐藏描述文字与选项层，结果框底板完全不透明，
    // 下层任何文字都不能透出来（U4）。
    const descNode = stage.getChildByName('ev_desc');
    if (descNode && descNode.isValid) descNode.active = false;
    const descPlate = stage.getChildByName('ev_desc_plate');
    if (descPlate && descPlate.isValid) descPlate.active = false;
    const optionLayer = stage.getChildByName('option_layer');
    if (optionLayer && optionLayer.isValid) optionLayer.active = false;
    for (const child of stage.children) {
      if (child && child.isValid && child.name === 'ev_btn') child.active = false;
    }

    const resultText = eventResultText({
      eventId: ev.id,
      optionIndex,
      minigameWin,
      notice,
      pretendWalkText: game.pretendWalkResultText(),
    });
    // 角色退场：装作散步成功/失败与抢地盘获胜都原地淡出，不滑出安全区。
    if ((ev.id === 'patrol' && optionIndex === 1) || (ev.id === 'rival' && optionIndex === 1 && minigameWin)) {
      if (artNode) void Fx.fadeOut(artNode, 0.45);
    }
    // 钱包角色禁止非整数缩放，改用原地闪光（3h）。
    if (ev.id === 'wallet' && artNode) {
      Fx.floatText(stage, '¥20', new Vec3(0, layout.role.centerY + layout.role.height / 2 + 10, 0), new Color(255, 230, 120, 255));
    }

    if (resultText) await this.showResult(stage, resultText, layout);
  }

  /**
   * 结果区：独立底板 + 结果文字 + 「点击继续」。
   * 3f：至少显示 2.5 秒，且必须点击才继续（不再靠 1 秒定时自动收掉）。
   */
  private static showResult(stage: Node, text: string, layout: EventLayout): Promise<void> {
    return new Promise<void>((resolve) => {
      if (!stage || !stage.isValid || !isValid(stage, true)) {
        resolve();
        return;
      }
      const safeW = Math.max(1, UILayout.visibleW * 0.86);
      const descW = layout.description?.width ?? safeW * 0.8;
      const panelW = Math.max(240, Math.min(520, Math.max(descW + pxSpacing(16), safeW * 0.76)));
      const bodySize = pxFont(12);
      const promptSize = pxFont(12);
      const promptLineH = lineHeightForFontSize(promptSize);
      const resultTextWidth = eventResultTextWidth(panelW);
      const fit = fitCardText(text, {
        maxWidth: resultTextWidth,
        maxHeight: Math.max(lineHeightForFontSize(bodySize), layout.area.height * 0.2),
        fontSize: bodySize,
        minFontSize: bodySize,
        lineGap: 0,
      });
      const panelH = Math.max(96, fit.height + promptLineH + pxSpacing(18));
      // r38：结果面板顶边 = 描述底板顶边，与描述底板互相替换；不再按脚底避让。
      const resultLayout = computeEventResultLayout(layout, panelH);
      const panel = this.rect(stage, 'result_panel', panelW, panelH, new Color(26, 16, 32, 255));
      panel.setPosition(0, resultLayout.centerY, 0);
      panel.setSiblingIndex(stage.children.length - 1);

      // 再加一层 label_plate 九宫格纹理；底下 alpha=255 的纯色层保证绝不透字。
      const plateArt = Art.makeVisual('label_plate', panelW, panelH, new Color(26, 16, 32, 255));
      plateArt.name = 'result_plate_art';
      plateArt.parent = panel;
      plateArt.setPosition(0, 0, 0);
      const plateSprite = plateArt.getComponent(Sprite);
      if (plateSprite) plateSprite.type = Sprite.Type.SLICED;
      const plateOpacity = plateArt.getComponent(UIOpacity) ?? plateArt.addComponent(UIOpacity);
      plateOpacity.opacity = 255;

      const body = this.label(panel, fit.text, fit.fontSize, 0, (promptLineH + pxSpacing(8)) / 2, resultTextWidth, fit.height);
      body.name = 'result_text';

      const prompt = this.label(panel, '', promptSize, 0, -panelH / 2 + promptLineH / 2 + pxSpacing(6));
      prompt.name = 'result_prompt';

      let ready = false;
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        resolve();
      };
      const timer = setTimeout(() => {
        ready = true;
        const lb = prompt.getComponent(Label);
        if (lb && prompt.isValid) lb.string = EVENT_RESULT_PROMPT;
      }, EVENT_RESULT_MIN_SECONDS * 1000);

      panel.on(Node.EventType.TOUCH_END, (e: any) => {
        e?.stopPropagation?.();
        if (!ready) return;
        clearTimeout(timer);
        finish();
      });
    });
  }

  // ---------------- 工具 ----------------
  private static rect(parent: Node, name: string, w: number, h: number, color: Color): Node {
    const n = uiNode(name);
    if (parent && parent.isValid && isValid(parent, true)) n.parent = parent;
    const ut = n.addComponent(UITransform);
    ut.setContentSize(w, h);
    const g = n.addComponent(Graphics);
    g.fillColor = color.clone();
    g.rect(-w / 2, -h / 2, w, h);
    g.fill();
    return n;
  }

  private static label(
    parent: Node,
    text: string,
    fontSize: number,
    x: number,
    y: number,
    maxWidth: number = 300,
    maxHeightOverride?: number,
  ): Node {
    const n = uiNode('label');
    if (parent && parent.isValid && isValid(parent, true)) n.parent = parent;
    const lineHeight = lineHeightForFontSize(fontSize);
    const maxHeight = maxHeightOverride ?? Math.max(lineHeight + 12, lineHeight * 2);
    const fit = fitCardText(text, {
      maxWidth,
      maxHeight,
      fontSize,
      minFontSize: pxFont(12),
      lineGap: 0,
    });
    const ut = n.addComponent(UITransform);
    ut.setContentSize(maxWidth, Math.max(lineHeight + 12, fit.height));
    n.setPosition(x, y, 0);
    const lb = n.addComponent(Label);
    lb.string = fit.text;
    lb.fontSize = fit.fontSize;
    lb.lineHeight = fit.lineHeight;
    lb.horizontalAlign = Label.HorizontalAlign.CENTER;
    lb.verticalAlign = Label.VerticalAlign.CENTER;
    lb.color = new Color(255, 255, 255, 255);
    lb.overflow = Label.Overflow.CLAMP;
    lb.enableWrapText = false;
    PixelFont.apply(lb, { size: fit.fontSize, lineHeight: fit.lineHeight, color: new Color(255, 255, 255, 255), bg: 'dark' });
    return n;
  }

  private static makeButton(parent: Node, text: string, w: number, h: number, onClick: () => void): Node {
    const metrics = Art.buttonMetrics(text, w, h);
    // U2：按钮高度/宽度由 EventLayout 统一决定，不因文案长度或数量变化。
    w = Math.max(1, w);
    h = Math.max(1, h);
    const n = uiNode('ev_btn');
    if (parent && parent.isValid && isValid(parent, true)) n.parent = parent;
    const ut = n.addComponent(UITransform);
    ut.setContentSize(w, h);
    const g = n.addComponent(Graphics);
    // 选项按钮：不透明深底 + 高对比亮边，避免和事件背景糊在一起
    g.fillColor = new Color(22, 24, 32, 255);
    g.roundRect(-w / 2, -h / 2, w, h, pxSpacing(2));
    g.fill();
    g.lineWidth = 3;
    g.strokeColor = new Color(255, 214, 110, 255);
    g.roundRect(-w / 2, -h / 2, w, h, pxSpacing(2));
    g.stroke();
    g.strokeColor = new Color(255, 255, 255, 80);
    g.rect(-w / 2 + 4, -h / 2 + 4, w - 8, h - 8);
    g.stroke();

    const lbNode = uiNode('lb');
    lbNode.parent = n;
    const lut = lbNode.addComponent(UITransform);
    lut.setContentSize(w, h);
    lbNode.setPosition(0, 0, 0);
    const lb = lbNode.addComponent(Label);
    const btnFit = fitCardText(text, {
      maxWidth: Math.max(1, w - metrics.padX * 2),
      maxHeight: Math.max(1, h - metrics.padY * 2),
      fontSize: metrics.fontSize,
      minFontSize: metrics.fontSize,
      lineGap: 0,
    });
    lb.string = btnFit.text;
    lb.fontSize = btnFit.fontSize;
    lb.lineHeight = btnFit.lineHeight;
    lb.horizontalAlign = Label.HorizontalAlign.CENTER;
    lb.verticalAlign = Label.VerticalAlign.CENTER;
    lb.overflow = Label.Overflow.CLAMP;
    lb.enableWrapText = false;
    lb.color = new Color(255, 255, 255, 255);
    PixelFont.apply(lb, { size: btnFit.fontSize, lineHeight: btnFit.lineHeight, color: new Color(255, 255, 255, 255), bg: 'dark' });
    n.on(Node.EventType.TOUCH_END, () => onClick());
    return n;
  }
}

export function playNightWarmth(root: Node): Promise<void> {
  return new Promise<void>((resolve) => {
    const size = EventView['rootSize'] ? (EventView as any).rootSize(root) : { width: view.getVisibleSize().width, height: view.getVisibleSize().height };
    const w = size.width;
    const h = size.height;
    const overlay = uiNode('warmth_overlay');
    overlay.parent = root;
    const out = overlay.addComponent(UITransform);
    out.setContentSize(w, h);
    overlay.setPosition(0, 0, 0);
    const g = overlay.addComponent(Graphics);
    g.fillColor = new Color(255, 180, 100, 220);
    g.rect(-w / 2, -h / 2, w, h);
    g.fill();
    const op = overlay.addComponent(UIOpacity);
    op.opacity = 0;
    tween(op).to(0.6, { opacity: 255 }).start();

    const auntie = uiNode('auntie');
    auntie.parent = overlay;
    const aut = auntie.addComponent(UITransform);
    aut.setContentSize(120, 120);
    auntie.setPosition(0, -80, 0);
    const ag = auntie.addComponent(Graphics);
    ag.fillColor = new Color(230, 130, 70, 255);
    ag.rect(-60, -60, 120, 120);
    ag.fill();

    const bun = uiNode('bun');
    bun.parent = overlay;
    const but = bun.addComponent(UITransform);
    but.setContentSize(50, 40);
    bun.setPosition(0, 80, 0);
    const bg = bun.addComponent(Graphics);
    bg.fillColor = new Color(230, 200, 150, 255);
    bg.rect(-25, -20, 50, 40);
    bg.fill();

    const text = uiNode('warm_text');
    text.parent = overlay;
    const tut = text.addComponent(UITransform);
    tut.setContentSize(500, 80);
    text.setPosition(0, 160, 0);
    const tl = text.addComponent(Label);
    tl.string = '环卫阿姨塞给你一个热包子';
    tl.fontSize = pxFont(12);
    tl.lineHeight = pxFont(12);
    tl.horizontalAlign = Label.HorizontalAlign.CENTER;
    tl.verticalAlign = Label.VerticalAlign.CENTER;
    tl.overflow = Label.Overflow.CLAMP;
    tl.enableWrapText = false;
    tl.color = new Color(255, 255, 255, 255);
    PixelFont.apply(tl, { color: new Color(255, 255, 255, 255), bg: 'dark' });

    tween(op)
      .delay(1.8)
      .to(0.5, { opacity: 0 })
      .call(() => {
        overlay.destroy();
        resolve();
      })
      .start();
  });
}
