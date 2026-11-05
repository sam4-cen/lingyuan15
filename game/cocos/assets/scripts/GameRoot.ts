import {
  _decorator,
  Component,
  Node,
  Label,
  Graphics,
  Color,
  UITransform,
  LabelOutline,
  Vec3,
  tween,
  Tween,
  UIOpacity,
  Layers,
  view,
  director,
  sys,
  Input,
  EventTouch,
  Widget,
} from 'cc';
import { Game, PendingEvent } from './core/game';
import { CONFIG, ITEMS, LOCATIONS, FORTUNES } from './core/config';
import { Art } from './ui/Art';
import { uiNode, UILayout, alignBottom, alignTop, alignTopSide, setSize } from './ui/UI';
import { ART_ALIAS, ICON_MAP, MAP_POINTS } from './ui/ArtMap';
import { Fx } from './ui/Fx';
import { LocationView } from './ui/LocationView';
import { EventView, playNightWarmth } from './ui/EventView';
import { Sfx } from './ui/Sfx';

const { ccclass } = _decorator;

@ccclass('GameRoot')
export class GameRoot extends Component {
  private game: Game = null!;
  private hudRoot: Node = null!;
  private screenRoot: Node = null!;
  private locationView: LocationView | null = null;

  private dayLabel: Label = null!;
  private timeLabel: Label = null!;
  private moneyLabel: Label = null!;
  private homeCostLabel: Label = null!;
  private hungerFill: Node = null!;
  private staminaFill: Node = null!;
  private moodFill: Node = null!;

  async start() {
    // 保证宿主节点也在 UI 层（Canvas 通常已是 UI_2D）
    this.node.layer = Layers.Enum.UI_2D;
    UILayout.refresh();
    await Art.preload();
    this.game = new Game(Math.floor(Date.now() % 1e9));
    this.game.startGame();

    // 先建内容层，再建 HUD：HUD 必须在背景/内容之上
    this.screenRoot = uiNode('screen');
    this.screenRoot.parent = this.node;
    const screenUt = this.screenRoot.addComponent(UITransform);
    screenUt.setContentSize(720, 1280);
    this.screenRoot.setPosition(0, 0, 0);

    this.buildHUD();
    this.hudRoot.setSiblingIndex(this.node.children.length - 1);
    Sfx.init(this.node);

    await this.showLoading();
    this.refresh();
  }

  private async showLoading(): Promise<void> {
    const loading = uiNode('loading');
    loading.parent = this.screenRoot;
    const ut = loading.addComponent(UITransform);
    ut.setContentSize(720, 1280);
    loading.setPosition(0, 0, 0);
    const label = uiNode('label');
    label.parent = loading;
    const lut = label.addComponent(UITransform);
    lut.setContentSize(500, 100);
    label.setPosition(0, 0, 0);
    const lb = label.addComponent(Label);
    lb.string = '本游戏纯属虚构，现实请勿模仿';
    lb.fontSize = 36;
    lb.lineHeight = 44;
    lb.horizontalAlign = Label.HorizontalAlign.CENTER;
    lb.verticalAlign = Label.VerticalAlign.CENTER;
    lb.color = new Color(255, 255, 255, 255);
    await Fx.freeze(1.5);
    loading.destroy();
  }

  private buildHUD(): void {
    this.hudRoot = uiNode('HUD');
    this.hudRoot.parent = this.node;
    const hudUt = this.hudRoot.addComponent(UITransform);
    hudUt.setContentSize(720, 1280);
    this.hudRoot.setPosition(0, 0, 0);

    // 顶部压暗条：保证状态栏在任何背景上都可读；
    // headerTop 已避开微信胶囊，非微信环境回退到刘海安全区
    const headerH = UILayout.headerTop + 118;
    const stripW = UILayout.visibleW + 40;
    const strip = uiNode('hud_strip');
    strip.parent = this.hudRoot;
    const stripUt = strip.addComponent(UITransform);
    stripUt.setContentSize(stripW, headerH);
    strip.setPosition(0, UILayout.visibleH / 2 - headerH / 2, 0);
    const stripG = strip.addComponent(Graphics);
    stripG.fillColor = new Color(0, 0, 0, 140);
    stripG.rect(-stripW / 2, -headerH / 2, stripW, headerH);
    stripG.fill();

    // 顶部第一行：天数 时间 金钱（Widget 贴顶，自动避开刘海/胶囊和两侧裁切）
    const topY = UILayout.headerY - 24;
    this.dayLabel = this.createLabel('day', 24, new Color(255, 255, 255, 255), new Vec3(-UILayout.halfW + 70, topY, 0), 140, 40);
    this.timeLabel = this.createLabel('time', 24, new Color(255, 255, 255, 255), new Vec3(0, topY, 0), 130, 40);
    this.moneyLabel = this.createLabel('money', 24, new Color(255, 220, 100, 255), new Vec3(UILayout.halfW - 80, topY, 0), 150, 40);
    alignTopSide(this.dayLabel.node, 'left');
    alignTop(this.timeLabel.node);
    alignTopSide(this.moneyLabel.node, 'right');

    // 顶部第二行：三条进度条
    const barY = UILayout.headerY - 62;
    this.hungerFill = this.createBar('hunger', new Color(255, 200, 80, 255), new Vec3(-155, barY, 0));
    this.staminaFill = this.createBar('stamina', new Color(255, 100, 100, 255), new Vec3(0, barY, 0));
    this.moodFill = this.createBar('mood', new Color(100, 180, 255, 255), new Vec3(155, barY, 0));
    alignTop(this.hungerFill.parent!, 50, -155);
    alignTop(this.staminaFill.parent!, 50, 0);
    alignTop(this.moodFill.parent!, 50, 155);

    // 回家体力标签
    this.homeCostLabel = this.createLabel('home_cost', 22, new Color(220, 220, 220, 255), new Vec3(0, UILayout.headerY - 94, 0), 300, 30);
    alignTop(this.homeCostLabel.node, 82);
    this.homeCostLabel.node.active = false;

    // 签名贴底
    const sign = this.createLabel('sign', 18, new Color(180, 180, 180, 180), new Vec3(0, UILayout.bottom + 8, 0), 500, 30);
    sign.string = '深圳生存 · 垃圾人生模拟器';
    alignBottom(sign.node, 2);
  }

  private createLabel(name: string, fontSize: number, color: Color, pos: Vec3, width: number, height: number): Label {
    const node = uiNode(name);
    node.parent = this.hudRoot;
    const ut = node.addComponent(UITransform);
    ut.setContentSize(width, height);
    node.setPosition(pos.x, pos.y, pos.z || 0);
    const label = node.addComponent(Label);
    label.fontSize = fontSize;
    label.lineHeight = fontSize + 4;
    label.color = color;
    label.horizontalAlign = Label.HorizontalAlign.CENTER;
    label.verticalAlign = Label.VerticalAlign.CENTER;
    label.overflow = Label.Overflow.SHRINK;
    label.enableWrapText = false;
    return label;
  }

  private createBar(name: string, color: Color, pos: Vec3): Node {
    const barLabels: Record<string, string> = { hunger: '饱腹', stamina: '体力', mood: '心情' };
    // 背景九宫格
    const bg = Art.makeVisual(`bar_${name}`, 150, 26, color, barLabels[name] ?? name);
    bg.parent = this.hudRoot;
    bg.setPosition(pos.x, pos.y, 0);

    // 填充节点
    const fill = uiNode('fill');
    fill.parent = bg;
    const fut = fill.addComponent(UITransform);
    fut.setContentSize(150, 26);
    const g = fill.addComponent(Graphics);
    const fillColor = color.clone();
    fillColor.a = 220;
    g.fillColor = fillColor;
    g.rect(-75, -13, 150, 26);
    g.fill();
    fill.setPosition(0, 0, 0);
    return fill;
  }

  private updateHUD(): void {
    if (!this.game) return;
    this.dayLabel.string = `第 ${this.game.day} 天`;
    // 分钟可能是小数（长按按秒推进），显示前取整并补零
    const totalMin = Math.max(0, Math.floor(this.game.minute));
    const hh = Math.floor(totalMin / 60) % 24;
    const mm = totalMin % 60;
    this.timeLabel.string = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
    this.moneyLabel.string = `¥ ${this.game.money.toFixed(2)}`;

    Fx.barTo(this.hungerFill, this.game.hunger / CONFIG.maxHunger);
    Fx.barTo(this.staminaFill, this.game.stamina / this.game.maxStamina);
    Fx.barTo(this.moodFill, this.game.mood / CONFIG.maxMood);

    // 只有在地点页才显示回家体力；占卜/地图页不显示「回家需 0 体力」
    const showHomeCost = this.game.phase === 'location' && this.game.location != null;
    this.homeCostLabel.node.active = showHomeCost;
    if (showHomeCost) {
      const cost = this.game.homeCost();
      this.homeCostLabel.string = `回家需 ${cost} 体力`;
    }
  }

  private refresh(): void {
    if (!this.screenRoot) return;
    this.screenRoot.destroyAllChildren();
    // 地点视图的节点已随 screenRoot 一起销毁，指针置空，下面按当前 phase 重建
    this.locationView = null;

    this.updateHUD();

    switch (this.game.phase) {
      case 'fortune':
        this.showFortune();
        break;
      case 'map':
        this.showMap();
        break;
      case 'location':
        this.showLocation();
        break;
      case 'event':
        this.showEvent();
        break;
      case 'home':
        this.showHome();
        break;
      case 'collapsed':
        this.showCollapsed();
        break;
      case 'lost':
        this.showLost();
        break;
      case 'won':
        this.showWon();
        break;
      default:
        break;
    }
  }

  // -------------------- 占卜 --------------------
  private showFortune(): void {
    const bg = Art.makeVisual('bg_fortune', 720, 1280, new Color(60, 40, 80, 255), '占卜');
    bg.parent = this.screenRoot;
    bg.setPosition(0, 0, 0);

    // 签筒原图 64×96，按 2 倍整数倍显示，避免拉伸
    const tube = Art.makeVisual('fortune_tube', 128, 192, new Color(180, 140, 100, 255), '签筒');
    tube.parent = this.screenRoot;
    tube.setPosition(0, 200, 0);

    // 摇晃动画
    tween(tube)
      .to(0.2, { angle: -15 })
      .to(0.2, { angle: 15 })
      .to(0.2, { angle: -10 })
      .to(0.2, { angle: 10 })
      .to(0.3, { angle: 0 })
      .union()
      .repeat(1)
      .call(() => {
        this.showFortuneSlip();
      })
      .start();
  }

  private showFortuneSlip(): void {
    if (!this.game.fortune) return;
    // 签纸原图 64×96，按 4 倍整数倍显示（256×384），不拉伸
    const slipW = 256;
    const slipH = 384;
    const slip = Art.makeVisual('fortune_slip', slipW, slipH, new Color(240, 230, 200, 255), '签面');
    slip.parent = this.screenRoot;
    slip.setPosition(0, -80, 0);

    // 签纸是米黄色，用深色字保证对比度
    const tierColors: Record<string, Color> = {
      good: new Color(28, 96, 40, 255),
      meh: new Color(62, 58, 52, 255),
      bad: new Color(140, 30, 34, 255),
    };
    const color = tierColors[this.game.fortune.tier] ?? new Color(255, 255, 255, 255);
    const tierNames: Record<string, string> = { good: '好签', meh: '平签', bad: '坏签' };
    const tierName = tierNames[this.game.fortune.tier] ?? '签';
    const text = this.createWorldLabel(
      `【${tierName} · ${this.game.fortune.name}】\n${this.game.fortune.text}` +
      (this.game.fortuneLocation ? `\n指定地点：${this.locationName(this.game.fortuneLocation)}` : ''),
      22,
      color,
      new Vec3(0, -80, 0),
      slipW - 28,
      slipH - 36
    );
    text.parent = this.screenRoot;
    const outline = text.addComponent(LabelOutline);
    outline.color = new Color(255, 250, 235, 255);
    outline.width = 2;

    const acceptBtn = this.createButton('就它了', 160, 60, new Vec3(-120, 0, 0), () => {
      this.game.acceptFortune();
      this.refresh();
    });
    acceptBtn.parent = this.screenRoot;
    alignBottom(acceptBtn, 70);

    const rerollCost = this.game.rerollCost();
    const rerollBtn = this.createButton(`重抽 ¥${rerollCost.toFixed(0)}`, 160, 60, new Vec3(120, 0, 0), () => {
      if (this.game.rerollFortune()) {
        this.showFortune(); // 重新显示签筒和签面
      } else {
        Fx.floatText(this.screenRoot, '钱不够', new Vec3(0, -500, 0), new Color(255, 80, 80, 255));
      }
    });
    if (this.game.money < rerollCost) {
      rerollBtn.getComponent(UIOpacity) ?? rerollBtn.addComponent(UIOpacity);
      rerollBtn.getComponent(UIOpacity)!.opacity = 120;
    }
    rerollBtn.parent = this.screenRoot;
    alignBottom(rerollBtn, 70);
  }

  // -------------------- 地图 --------------------
  private showMap(): void {
    // 先铺满底色，地图横向缩放后两侧不会露黑边
    const mapBg = Art.makeVisual('map_bg', 720, 1280, new Color(100, 140, 100, 255));
    mapBg.parent = this.screenRoot;
    mapBg.setPosition(0, 0, 0);

    // 地图原图 360×640；标题单独画，不依赖占位图的 label
    const map = Art.makeVisual('map', 720, 1280, new Color(100, 140, 100, 255));
    map.parent = this.screenRoot;
    map.setPosition(0, 0, 0);

    // 竖屏 Fit Height 下两侧会被裁掉，地图横向缩到可视安全区
    const mapScaleX = Math.min(1, (UILayout.visibleW - 48) / 720);
    map.setScale(mapScaleX, 1, 1);

    // 标题放在顶栏下方，按钮再往下排，避免压住标题
    const titleY = UILayout.headerY - 150;
    const titleBg = uiNode('map_title_bg');
    titleBg.parent = this.screenRoot;
    const tbgUt = titleBg.addComponent(UITransform);
    tbgUt.setContentSize(260, 46);
    titleBg.setPosition(0, titleY, 0);
    const tbg = titleBg.addComponent(Graphics);
    tbg.fillColor = new Color(30, 35, 25, 170);
    tbg.roundRect(-130, -23, 260, 46, 10);
    tbg.fill();

    const title = this.createWorldLabel('深圳地图', 28, new Color(255, 245, 210, 255), new Vec3(0, titleY, 0), 260, 42);
    title.parent = this.screenRoot;

    // 地图上只给一条模糊的签文提示，不显示盒子数量/大小盒数量
    const fortune = this.game.fortune;
    const fortuneLoc = this.game.fortuneLocation;
    let mapHint = '';
    let hintColor = new Color(230, 230, 230, 255);
    if (fortune && fortuneLoc) {
      const locName = this.locationName(fortuneLoc);
      if (fortune.tier === 'good') {
        mapHint = `${locName}今天好像热闹点`;
        hintColor = new Color(150, 235, 150, 255);
      } else if (fortune.tier === 'bad') {
        mapHint = `${locName}感觉不太妙`;
        hintColor = new Color(255, 150, 150, 255);
      }
    } else if (fortune?.effect === 'windy') {
      mapHint = '今天风大，出门好像不太顺';
      hintColor = new Color(255, 190, 120, 255);
    }
    if (mapHint) {
      const hintBg = uiNode('map_hint_bg');
      hintBg.parent = this.screenRoot;
      const hbUt = hintBg.addComponent(UITransform);
      hbUt.setContentSize(500, 40);
      const hbY = UILayout.bottom + 160;
      hintBg.setPosition(0, hbY, 0);
      const hbg = hintBg.addComponent(Graphics);
      hbg.fillColor = new Color(0, 0, 0, 145);
      hbg.roundRect(-250, -20, 500, 40, 12);
      hbg.fill();
      const hint = this.createWorldLabel(mapHint, 22, hintColor, new Vec3(0, hbY, 0), 480, 36);
      hint.parent = this.screenRoot;
    }

    const btnW = 140;
    const btnH = 68;
    const safeX = Math.max(80, UILayout.halfW - btnW / 2 - 4);

    // 先按地图点位算初始位置，再从上往下做一次避让，保证 8 个按钮互不重叠
    const raw = LOCATIONS.map((loc) => {
      const point = MAP_POINTS[loc.id];
      const x = point ? Math.max(-safeX, Math.min(safeX, (point.x - 180) * 2 * mapScaleX)) : 0;
      const y = point ? (320 - point.y) * 2 : 0;
      return { id: loc.id, x, y };
    }).sort((a, b) => b.y - a.y);

    const placed: { x: number; y: number }[] = [];
    const positions = new Map<string, { x: number; y: number }>();
    const titleBottom = titleY - 24;
    const limit = UILayout.bottom + 130;
    for (const p of raw) {
      let y = p.y;
      // 先避开标题，再避开已排好的按钮
      while (y + btnH / 2 > titleBottom && y > limit) y -= btnH + 8;
      while (
        y > limit &&
        placed.some((q) => Math.abs(q.x - p.x) < btnW + 8 && Math.abs(q.y - y) < btnH + 8)
      ) {
        y -= btnH + 8;
      }
      y = Math.max(y, limit);
      placed.push({ x: p.x, y });
      positions.set(p.id, { x: p.x, y });
    }

    // 地点按钮（挂在 screenRoot，不继承地图的横向缩放，避免文字被压窄）
    for (const loc of LOCATIONS) {
      const pos = positions.get(loc.id);
      if (!pos) continue;
      const cx = pos.x;
      const cy = pos.y;
      const banned = this.game.bannedToday.includes(loc.id);
      const travelCost = this.game.travelCost(loc.id);
      const isFortuneLoc = this.game.fortuneLocation === loc.id;

      // 地图上只显示地点和移动体力，不泄露盒子数量/战利品
      const btn = this.createButton(
        `${loc.name}\n体力 ${travelCost}`,
        btnW,
        btnH,
        new Vec3(cx, cy, 0),
        () => {
          if (banned) {
            Fx.floatText(this.screenRoot, '今天被拉黑了', new Vec3(cx, cy + 60, 0), new Color(255, 80, 80, 255));
            return;
          }
          if (this.game.travel(loc.id)) {
            this.refresh();
          } else {
            Fx.floatText(this.screenRoot, '体力不足', new Vec3(cx, cy + 60, 0), new Color(255, 80, 80, 255));
          }
        },
        16
      );
      btn.parent = this.screenRoot;

      // 高亮签指定地点
      if (isFortuneLoc) {
        const glow = uiNode('fortune_glow');
        glow.parent = btn;
        const gut = glow.addComponent(UITransform);
        gut.setContentSize(btnW + 10, btnH + 10);
        const glowG = glow.addComponent(Graphics);
        glowG.strokeColor = new Color(255, 255, 150, 255);
        glowG.lineWidth = 4;
        glowG.rect(-(btnW + 10) / 2, -(btnH + 10) / 2, btnW + 10, btnH + 10);
        glowG.stroke();
        glow.setPosition(0, 0, 0);
      }

      // 被 banned 显示灰叉
      if (banned) {
        const cross = this.createLabel('cross', 30, new Color(180, 180, 180, 255), new Vec3(0, 0, 0), 40, 40);
        cross.string = '✕';
        cross.node.parent = btn;
      }
    }

    // 回家按钮
    const sideX = Math.min(200, UILayout.halfW - 66);
    const homeBtn = this.createButton('回家', 120, 56, new Vec3(-sideX, 0, 0), () => {
      if (this.game.goHome()) {
        this.refresh();
      } else {
        Fx.floatText(this.screenRoot, `体力不足，需 ${this.game.homeCost()}`, new Vec3(0, -500, 0), new Color(255, 80, 80, 255));
      }
    });
    homeBtn.parent = this.screenRoot;
    alignBottom(homeBtn, 20);

    // 收工按钮
    const endBtn = this.createButton('收工', 120, 56, new Vec3(sideX, 0, 0), () => {
      this.game.endDayAway();
      this.refresh();
    });
    endBtn.parent = this.screenRoot;
    alignBottom(endBtn, 20);
  }

  // -------------------- 地点 --------------------
  private showLocation(): void {
    if (!this.locationView) {
      this.locationView = new LocationView(
        this.screenRoot,
        this.game,
        () => {
          this.updateHUD();
          // 事件由 onEvent 打开 EventView；这里不要提前 refresh，否则会叠出两层事件界面
          if (this.game.phase === 'event') return;
          if (this.game.phase !== 'location') {
            this.refresh();
          }
        },
        (ev: PendingEvent) => this.handleEvent(ev),
        () => this.refresh()
      );
    }
    this.locationView.show();
  }

  private handleEvent(ev: PendingEvent): void {
    this.showEvent(ev);
  }

  private showEvent(ev?: PendingEvent | null): void {
    const pending = ev ?? this.game.currentEvent;
    if (!pending) return;
    // 保留地点背景在遮罩下面，事件结束后 refresh 统一重建
    EventView.show(this.screenRoot, this.game, pending, () => {
      // 被抓等事件清空背包时，先把地点页网格里的物品节点也清掉
      if (this.game.bag.length === 0) {
        this.locationView?.clearBagView();
      }
      this.refresh();
    });
  }

  // -------------------- 家 --------------------
  private showHome(): void {
    const bg = Art.makeVisual(`home_${this.game.homeLevel}`, 720, 1280, new Color(80, 80, 100, 255), '家');
    bg.parent = this.screenRoot;
    bg.setPosition(0, 0, 0);

    // 日结算卡
    if (this.game.lastDayReport) {
      const report = this.game.lastDayReport;
      const card = Art.makeCard('card_day', 1280);
      card.parent = this.screenRoot;
      card.setPosition(0, 250, 0);
      const content = card.getChildByName('content')!;
      this.addCardText(content, 24, [
        `第 ${report.day} 天结算`,
        `收入：¥\u00A0${report.income.toFixed(2)}`,
        `最离谱：${report.bestItem ?? '无'}`,
        `饱腹余量：${report.hungerLeft}`,
        `吐槽：${report.quip}`,
      ], new Color(50, 50, 50, 255));
    }

    // 商店按钮
    const btnY = 100;
    const foodBtn = this.createButton(`买吃的 ¥${CONFIG.foodPrice}`, 200, 60, new Vec3(0, btnY, 0), () => {
      if (this.game.buyFood()) {
        this.updateHUD();
        Fx.floatText(this.screenRoot, '吃饱了', new Vec3(0, btnY + 40, 0), new Color(120, 255, 120, 255));
      } else {
        Fx.floatText(this.screenRoot, '钱不够', new Vec3(0, btnY + 40, 0), new Color(255, 80, 80, 255));
      }
    });
    foodBtn.parent = this.screenRoot;

    const bagNextCost = this.game.bagLevel < CONFIG.bagSizes.length - 1 ? CONFIG.bagSizes[this.game.bagLevel + 1].cost : null;
    const bagBtn = this.createButton(
      bagNextCost ? `扩背包 ¥${bagNextCost}` : '背包已最大',
      200,
      60,
      new Vec3(0, btnY - 80, 0),
      () => {
        if (this.game.expandBag()) {
          this.updateHUD();
          Fx.floatText(this.screenRoot, '背包变大', new Vec3(0, btnY - 40, 0), new Color(120, 255, 120, 255));
        } else {
          Fx.floatText(this.screenRoot, '无法升级', new Vec3(0, btnY - 40, 0), new Color(255, 80, 80, 255));
        }
      }
    );
    if (!bagNextCost) {
      bagBtn.getComponent(UIOpacity) ?? bagBtn.addComponent(UIOpacity);
      bagBtn.getComponent(UIOpacity)!.opacity = 120;
    }
    bagBtn.parent = this.screenRoot;

    const homeNextCost = this.game.homeLevel < CONFIG.homeLevels.length - 1 ? CONFIG.homeLevels[this.game.homeLevel + 1].cost : null;
    const upgradeHomeBtn = this.createButton(
      homeNextCost ? `升级落脚点 ¥${homeNextCost}` : '落脚点已最好',
      200,
      60,
      new Vec3(0, btnY - 160, 0),
      () => {
        if (this.game.upgradeHome()) {
          this.updateHUD();
          Fx.floatText(this.screenRoot, '落脚点升级', new Vec3(0, btnY - 120, 0), new Color(120, 255, 120, 255));
        } else {
          Fx.floatText(this.screenRoot, '无法升级', new Vec3(0, btnY - 120, 0), new Color(255, 80, 80, 255));
        }
      }
    );
    if (!homeNextCost) {
      upgradeHomeBtn.getComponent(UIOpacity) ?? upgradeHomeBtn.addComponent(UIOpacity);
      upgradeHomeBtn.getComponent(UIOpacity)!.opacity = 120;
    }
    upgradeHomeBtn.parent = this.screenRoot;

    // 睡觉按钮
    const sleepBtn = this.createButton('睡觉', 160, 60, new Vec3(0, btnY - 260, 0), async () => {
      // 先由逻辑层结算，UI 只读取 lastNightWarmth 决定是否播动画
      this.game.sleep();
      if (this.game.lastNightWarmth) {
        await playNightWarmth(this.screenRoot);
      }
      this.refresh();
    });
    sleepBtn.parent = this.screenRoot;
  }

  // -------------------- 倒下 --------------------
  private showCollapsed(): void {
    if (!this.game.lastCollapse) return;
    const collapse = this.game.lastCollapse;
    const bg = Art.makeVisual(`sleep_${collapse.spot}`, 720, 1280, new Color(70, 70, 70, 255), collapse.spotName);
    bg.parent = this.screenRoot;
    bg.setPosition(0, 0, 0);

    const card = Art.makeCard('card_fail', 1280);
    card.parent = this.screenRoot;
    card.setPosition(0, 0, 0);
    const content = card.getChildByName('content')!;
    this.addCardText(content, 24, [
      `${collapse.spotName}`,
      `丢了：${collapse.lostItems.join('、') || '无'}`,
      `第二天体力：${collapse.staminaNextDay}`,
      collapse.text,
    ], new Color(50, 50, 50, 255));

    const wakeBtn = this.createButton('醒来', 160, 60, new Vec3(0, -380, 0), () => {
      this.game.wakeUp();
      this.refresh();
    });
    wakeBtn.parent = this.screenRoot;
  }

  // -------------------- 失败 --------------------
  private showLost(): void {
    const card = Art.makeCard('card_fail', 1280);
    card.parent = this.screenRoot;
    card.setPosition(0, 100, 0);
    const content = card.getChildByName('content')!;
    this.addCardText(content, 24, [
      `你在深圳活了 ${this.game.day} 天`,
      `死因：${this.game.deathCause}`,
      `最离谱收获：${this.game.lastDayReport?.bestItem ?? '无'}`,
    ], new Color(50, 50, 50, 255));

    const retryBtn = this.createButton('再来一局', 160, 60, new Vec3(-120, -320, 0), () => {
      this.game.startGame();
      this.refresh();
    });
    retryBtn.parent = this.screenRoot;

    const shareBtn = this.createButton('分享', 120, 60, new Vec3(120, -320, 0), () => {
      const wxAny: any = (globalThis as any).wx;
      if (wxAny && typeof wxAny.shareAppMessage === 'function') {
        wxAny.shareAppMessage({
          title: `我在深圳活了 ${this.game.day} 天`,
        });
      } else {
        Fx.floatText(this.screenRoot, '当前环境不支持分享', new Vec3(0, -400, 0));
      }
    });
    shareBtn.parent = this.screenRoot;
  }

  // -------------------- 胜利 --------------------
  private showWon(): void {
    const card = Art.makeCard('card_cert', 1280);
    card.parent = this.screenRoot;
    card.setPosition(0, 80, 0);
    const content = card.getChildByName('content')!;
    const certId = Math.floor(Math.random() * 1e6).toString().padStart(6, '0');
    const dateStr = new Date().toLocaleDateString();
    this.addCardText(content, 22, [
      '深圳生存成功',
      `编号：${certId}`,
      `日期：${dateStr}`,
      `总收入：¥${this.game.totalIncome.toFixed(2)}`,
    ], new Color(50, 50, 50, 255));

    Fx.confetti(this.screenRoot);

    const retryBtn = this.createButton('再来一局', 160, 60, new Vec3(-90, 0, 0), () => {
      this.game.startGame();
      this.refresh();
    });
    retryBtn.parent = this.screenRoot;
    alignBottom(retryBtn, 90);

    const shareBtn = this.createButton('分享', 120, 60, new Vec3(110, 0, 0), () => {
      const wxAny: any = (globalThis as any).wx;
      if (wxAny && typeof wxAny.shareAppMessage === 'function') {
        wxAny.shareAppMessage({ title: '我在深圳活满了 15 天' });
      } else {
        Fx.floatText(this.screenRoot, '当前环境不支持分享', new Vec3(0, -420, 0));
      }
    });
    shareBtn.parent = this.screenRoot;
    alignBottom(shareBtn, 90);
  }

  // -------------------- 工具 --------------------
  private createWorldLabel(text: string, fontSize: number, color: Color, pos: Vec3, width: number, height: number): Node {
    const node = uiNode('label');
    const ut = node.addComponent(UITransform);
    ut.setContentSize(width, height);
    node.setPosition(pos.x, pos.y, pos.z || 0);
    const label = node.addComponent(Label);
    label.string = text;
    label.fontSize = fontSize;
    label.lineHeight = fontSize + 6;
    label.color = color;
    label.horizontalAlign = Label.HorizontalAlign.CENTER;
    label.verticalAlign = Label.VerticalAlign.CENTER;
    label.overflow = Label.Overflow.SHRINK;
    label.enableWrapText = true;
    return node;
  }

  private createButton(text: string, w: number, h: number, pos: Vec3, onClick: () => void, fontSize?: number): Node {
    const btn = Art.makeButton(text, w, h, onClick, fontSize);
    btn.setPosition(pos.x, pos.y, pos.z || 0);
    return btn;
  }

  private addCardText(parent: Node, fontSize: number, lines: string[], color: Color): void {
    const textNode = this.createWorldLabel(lines.join('\n'), fontSize, color, Vec3.ZERO, 400, 400);
    textNode.parent = parent;
    textNode.setPosition(0, 0, 0);
  }

  private locationName(id: string): string {
    const loc = LOCATIONS.find(l => l.id === id);
    return loc ? loc.name : id;
  }
}