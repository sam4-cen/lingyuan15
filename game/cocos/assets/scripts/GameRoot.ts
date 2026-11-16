import {
  _decorator,
  Component,
  Node,
  Label,
  Graphics,
  Color,
  Sprite,
  UITransform,
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
import { Game, PendingEvent, DayReport, HomeActionQuote } from './core/game';
import { BUILD_TAG, IS_TEST_BUILD } from './Version';
import { CONFIG, ITEMS, LOCATIONS, FORTUNES } from './core/config';
import { Art } from './ui/Art';
import { uiNode, UILayout, alignBottom, alignTop, alignTopSide, setSize } from './ui/UI';
import { ART_ALIAS, ICON_MAP, MAP_POINTS } from './ui/ArtMap';
import { measureTextWidth } from './ui/BubbleLayout';
import { Fx } from './ui/Fx';
import { LocationView } from './ui/LocationView';
import { EventView, playNightWarmth } from './ui/EventView';
import { Share } from './ui/Share';
import { Sfx } from './ui/Sfx';
import { computeCardTextBox, fitCardText } from './ui/CardTextLayout';
import { formatCertDate } from './ui/DateFormat';
import { BTN_SLEEP_TEXT_RECT, computeHomeSleepLayout } from './ui/SleepButtonLayout';
import {
  FORTUNE_PAPER_ART,
  buildFortuneText,
  computeFortunePaperLayoutForText,
  fortunePaperNodeScale,
  fortunePaperNodeSize,
  fortuneTextPosition,
} from './ui/FortuneLayout';
import { PixelFont, PIXEL_INK_COLOR } from './ui/PixelFont';
import { lineHeightForFontSize, pxFont, pxSpacing, titleFontSizeForText } from './ui/PixelFontMetrics';
import { MAP_BADGE_TEXT, computeBadgeUnderPlate, computeMapLayout, computeMapPlateHeight, computeMapPlateWidth, placeMapMarker } from './ui/MapLayout';

const { ccclass } = _decorator;

/** 顶栏压暗条在 headerTop 之下额外占用的高度（HUD 内容区）。 */
const HUD_HEADER_H = 128;

/** 地图「限定」小牌：24px 像素字 1 倍显示（等价旧版 12px×2，但无需节点缩放）。 */
const MAP_BADGE_W = 64;
const MAP_BADGE_H = 36;
const MAP_BADGE_SCALE = 1;

/** 日结算文字在结算卡内部的排版区域（相对 content 的局部坐标）。 */
interface ReportTextBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

@ccclass('GameRoot')
export class GameRoot extends Component {
  private game: Game = null!;
  private hudRoot: Node = null!;
  private screenRoot: Node = null!;
  private locationView: LocationView | null = null;
  private dailySpecialShownDay: number = 0;
  /** 底部招牌小字；地图页有操作栏时隐藏，避免压住按钮。 */
  private signLabel: Label | null = null;
  private signPlate: Node | null = null;
  /** 左下角构建角标：只在开局/家里显示，方便测试机确认不是旧缓存包。 */
  private versionLabel: Label | null = null;

  private dayLabel: Label = null!;
  private timeLabel: Label = null!;
  private moneyLabel: Label = null!;
  private homeCostLabel: Label = null!;
  private hungerFill: Node = null!;
  private staminaFill: Node = null!;
  private hungerBarLabel: Label = null!;
  private staminaBarLabel: Label = null!;
  private hungerLowNode: Node = null!;
  private staminaLowNode: Node = null!;
  private lastStamina: number = -1;
  private lastHunger: number = -1;
  private hungerLow: boolean = false;
  private staminaLow: boolean = false;
  private blinkTime: number = 0;
  private payHints: { label: Label; price: () => number }[] = [];
  private pendingHomeMoveIn: boolean = false;
  private sleeping: boolean = false;

  async start() {
    // 保证宿主节点也在 UI 层（Canvas 通常已是 UI_2D）
    this.node.layer = Layers.Enum.UI_2D;
    UILayout.refresh();
    await Art.preload();
    await PixelFont.load();
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
    const loadingW = Math.max(240, Math.min(600, UILayout.visibleW - pxSpacing(12) * 2));
    const lut = label.addComponent(UITransform);
    lut.setContentSize(loadingW, 100);
    label.setPosition(0, 0, 0);
    const lb = label.addComponent(Label);
    const loadingText = '本游戏纯属虚构，现实请勿模仿';
    const loadingSize = titleFontSizeForText(loadingText, loadingW - pxSpacing(8) * 2);
    lb.string = loadingText;
    lb.fontSize = loadingSize;
    lb.lineHeight = lineHeightForFontSize(loadingSize);
    lb.horizontalAlign = Label.HorizontalAlign.CENTER;
    lb.verticalAlign = Label.VerticalAlign.CENTER;
    lb.color = new Color(255, 255, 255, 255);
    PixelFont.apply(lb, { color: new Color(255, 255, 255, 255), bg: 'dark' });
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
    const headerH = UILayout.headerTop + HUD_HEADER_H;
    const stripW = UILayout.visibleW + 40;
    const strip = uiNode('hud_strip');
    strip.parent = this.hudRoot;
    const stripUt = strip.addComponent(UITransform);
    stripUt.setContentSize(stripW, headerH);
    strip.setPosition(0, UILayout.visibleH / 2 - headerH / 2, 0);
    const stripG = strip.addComponent(Graphics);
    // U3：纯色 #1a1020，顶部 85% 不透明度；底边用 24 设计 px 的渐变收掉硬边。
    // 全部用 Graphics 绘制，不引入图片。
    const topInk = new Color(26, 16, 32, Math.round(255 * 0.85));
    const gradientH = Math.min(headerH, pxSpacing(24));
    stripG.fillColor = topInk;
    stripG.rect(-stripW / 2, -headerH / 2 + gradientH, stripW, Math.max(1, headerH - gradientH));
    stripG.fill();
    const gradSteps = Math.max(8, Math.round(gradientH));
    const stepH = gradientH / gradSteps;
    for (let i = 0; i < gradSteps; i++) {
      const t = i / (gradSteps - 1 || 1);
      stripG.fillColor = new Color(26, 16, 32, Math.round(topInk.a * t));
      stripG.rect(-stripW / 2, -headerH / 2 + i * stepH, stripW, stepH + 0.5);
      stripG.fill();
    }

    // 顶部第一行：天数 时间 金钱（Widget 贴顶，自动避开刘海/胶囊和两侧裁切）
    const topY = UILayout.headerY - 26;
    const hudFont = pxFont(12);
    this.dayLabel = this.createLabel('day', hudFont, new Color(255, 255, 255, 255), new Vec3(-UILayout.halfW + 80, topY, 0), 160, 40);
    this.timeLabel = this.createLabel('time', hudFont, new Color(255, 255, 255, 255), new Vec3(0, topY, 0), 140, 40);
    this.moneyLabel = this.createLabel('money', hudFont, new Color(255, 220, 100, 255), new Vec3(UILayout.halfW - 90, topY, 0), 180, 40);
    alignTopSide(this.dayLabel.node, 'left');
    alignTop(this.timeLabel.node);
    alignTopSide(this.moneyLabel.node, 'right');

    // 顶部第二行：体力/饱腹两根粗条并排，条上直接写数字。
    // 宽度从 visibleW 算，9:20 窄屏也不会顶到屏幕边。
    const barW = Math.max(120, Math.min(250, Math.floor((UILayout.visibleW - 48) / 2)));
    const barH = 48;
    const barGap = 16;
    const barOffset = barW / 2 + barGap / 2;
    const barY = UILayout.headerY - 70;
    const hungerBar = this.createBar('hunger', new Color(255, 200, 80, 255), new Vec3(-barOffset, barY, 0), '饱腹', barW, barH);
    const staminaBar = this.createBar('stamina', new Color(255, 100, 100, 255), new Vec3(barOffset, barY, 0), '体力', barW, barH);
    this.hungerFill = hungerBar.fill;
    this.hungerBarLabel = hungerBar.label;
    this.hungerLowNode = hungerBar.low;
    this.staminaFill = staminaBar.fill;
    this.staminaBarLabel = staminaBar.label;
    this.staminaLowNode = staminaBar.low;
    alignTop(hungerBar.root, 44, -barOffset);
    alignTop(staminaBar.root, 44, barOffset);

    // 回家体力标签
    this.homeCostLabel = this.createLabel('home_cost', hudFont, new Color(220, 220, 220, 255), new Vec3(0, UILayout.headerY - 108, 0), 320, 30);
    alignTop(this.homeCostLabel.node, 94);
    this.homeCostLabel.node.active = false;

    // 页脚贴底（地图页会隐藏，给底部操作栏让位）。
    // 12 逻辑 px × 设计缩放 = 24px，并垫一块深色半透明底板，避免压在地板纹理上看不清。
    const signText = '深圳生存 · 垃圾人生模拟器';
    const signSize = pxFont(12);
    const signPaddingX = pxSpacing(10);
    const signH = signSize + pxSpacing(8);
    const signW = Math.min(
      UILayout.visibleW - pxSpacing(12) * 2,
      Math.ceil(measureTextWidth(signText, signSize)) + signPaddingX * 2,
    );
    const signPlate = uiNode('sign_plate');
    signPlate.parent = this.hudRoot;
    const signPlateUt = signPlate.addComponent(UITransform);
    signPlateUt.setContentSize(signW, signH);
    const signG = signPlate.addComponent(Graphics);
    signG.fillColor = new Color(20, 14, 22, 190);
    signG.roundRect(-signW / 2, -signH / 2, signW, signH, pxSpacing(3));
    signG.fill();
    signG.lineWidth = pxSpacing(1);
    signG.strokeColor = new Color(26, 16, 32, 220);
    signG.roundRect(-signW / 2, -signH / 2, signW, signH, pxSpacing(3));
    signG.stroke();
    const signPlateWidget = alignBottom(signPlate, 2);
    signPlateWidget.bottom = Math.round(UILayout.safeBottom + 2);
    signPlateWidget.updateAlignment();
    signPlate.setPosition(0, Math.round(signPlate.position.y), 0);
    this.signPlate = signPlate;

    const sign = this.createLabel(
      'sign',
      signSize,
      new Color(230, 226, 214, 245),
      new Vec3(0, Math.round(UILayout.bottom + 8), 0),
      signW,
      signH,
    );
    sign.string = signText;
    sign.lineHeight = signSize;
    sign.node.setScale(1, 1, 1);
    this.signLabel = sign;
    const signWidget = alignBottom(sign.node, 2);
    signWidget.bottom = Math.round(UILayout.safeBottom + 2);
    signWidget.updateAlignment();
    sign.node.setPosition(0, Math.round(sign.node.position.y), 0);

    // 左下角构建角标：小字号但带 baked 描边，开局/家里都能确认包不是旧的。
    const versionSize = pxFont(12);
    const versionW = Math.ceil(measureTextWidth(BUILD_TAG, versionSize)) + pxSpacing(8);
    const versionH = lineHeightForFontSize(versionSize) + pxSpacing(4);
    const version = this.createLabel(
      'build_tag',
      versionSize,
      new Color(235, 230, 215, 235),
      new Vec3(0, 0, 0),
      versionW,
      versionH,
    );
    version.string = BUILD_TAG;
    version.horizontalAlign = Label.HorizontalAlign.LEFT;
    version.verticalAlign = Label.VerticalAlign.CENTER;
    version.enableWrapText = false;
    const versionWidget = version.node.addComponent(Widget);
    versionWidget.isAlignLeft = true;
    versionWidget.isAbsoluteLeft = true;
    versionWidget.left = Math.max(0, (UILayout.designW - UILayout.visibleW) / 2)
      + UILayout.safeLeft + pxSpacing(4);
    versionWidget.isAlignBottom = true;
    versionWidget.isAbsoluteBottom = true;
    versionWidget.bottom = UILayout.safeBottom + pxSpacing(2);
    versionWidget.alignMode = Widget.AlignMode.ON_WINDOW_RESIZE;
    versionWidget.updateAlignment();
    version.node.setPosition(
      Math.round(version.node.position.x),
      Math.round(version.node.position.y),
      0,
    );
    this.versionLabel = IS_TEST_BUILD ? version : null;
    version.node.active = IS_TEST_BUILD;
  }

  private createLabel(name: string, fontSize: number, color: Color, pos: Vec3, width: number, height: number): Label {
    const node = uiNode(name);
    node.parent = this.hudRoot;
    const ut = node.addComponent(UITransform);
    ut.setContentSize(width, height);
    node.setPosition(pos.x, pos.y, pos.z || 0);
    const label = node.addComponent(Label);
    label.fontSize = fontSize;
    label.lineHeight = fontSize;
    label.color = color;
    label.horizontalAlign = Label.HorizontalAlign.CENTER;
    label.verticalAlign = Label.VerticalAlign.CENTER;
    label.overflow = Label.Overflow.CLAMP;
    label.enableWrapText = false;
    PixelFont.apply(label, { color, bg: 'dark' });
    return label;
  }

  private createBar(
    name: string,
    color: Color,
    pos: Vec3,
    labelText: string,
    w: number = 250,
    h: number = 48,
  ): { root: Node; fill: Node; label: Label; low: Node } {
    const bg = Art.makeVisual(`bar_${name}`, w, h, color, labelText);
    bg.parent = this.hudRoot;
    bg.setPosition(pos.x, pos.y, 0);

    // 填充节点（留出九宫格边框的 4px 内边距）
    const fill = uiNode('fill');
    fill.parent = bg;
    const fw = w - 8;
    const fh = h - 8;
    const fUt = fill.addComponent(UITransform);
    fUt.setContentSize(fw, fh);
    const g = fill.addComponent(Graphics);
    const fillColor = color.clone();
    fillColor.a = 220;
    g.fillColor = fillColor;
    g.rect(-fw / 2, -fh / 2, fw, fh);
    g.fill();
    fill.setPosition(0, 0, 0);

    // 低于 30% 时叠一层红色闪烁
    const low = uiNode('low_red');
    low.parent = bg;
    const lowUt = low.addComponent(UITransform);
    lowUt.setContentSize(fw, fh);
    const lg = low.addComponent(Graphics);
    lg.fillColor = new Color(255, 40, 40, 150);
    lg.rect(-fw / 2, -fh / 2, fw, fh);
    lg.fill();
    low.setPosition(0, 0, 0);
    low.active = false;

    const labelNode = uiNode('bar_label');
    labelNode.parent = bg;
    const lut = labelNode.addComponent(UITransform);
    lut.setContentSize(w - 16, h);
    const label = labelNode.addComponent(Label);
    label.string = labelText;
    label.fontSize = pxFont(12);
    label.lineHeight = pxFont(12);
    label.color = new Color(255, 255, 255, 255);
    label.horizontalAlign = Label.HorizontalAlign.CENTER;
    label.verticalAlign = Label.VerticalAlign.CENTER;
    label.overflow = Label.Overflow.CLAMP;
    label.enableWrapText = false;
    PixelFont.apply(label, { color: new Color(255, 255, 255, 255), bg: 'dark' });
    labelNode.setPosition(0, 0, 0);
    return { root: bg, fill, label, low };
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

    const staminaRatio = this.game.maxStamina > 0 ? this.game.stamina / this.game.maxStamina : 0;
    const hungerRatio = CONFIG.maxHunger > 0 ? this.game.hunger / CONFIG.maxHunger : 0;
    Fx.barTo(this.hungerFill, hungerRatio);
    Fx.barTo(this.staminaFill, staminaRatio);
    this.hungerBarLabel.string = `饱腹 ${Math.max(0, Math.round(this.game.hunger))}/${CONFIG.maxHunger}`;
    this.staminaBarLabel.string = `体力 ${Math.max(0, Math.round(this.game.stamina))}/${this.game.maxStamina}`;

    // 每次减少时在对应条上飘「−N」
    this.floatResourceChange();

    // 低于 30%：条变红闪烁，并弹一次提示
    const lowRatio = CONFIG.uiLowRatio;
    const hungerNowLow = hungerRatio < lowRatio;
    const staminaNowLow = staminaRatio < lowRatio;
    if (hungerNowLow && !this.hungerLow) {
      this.showToast('快饿晕了', new Color(255, 190, 80, 255), -132);
    }
    if (staminaNowLow && !this.staminaLow) {
      this.showToast('腿软了', new Color(255, 100, 100, 255), 132);
    }
    this.hungerLow = hungerNowLow;
    this.staminaLow = staminaNowLow;
    if (this.hungerLowNode) this.hungerLowNode.active = hungerNowLow;
    if (this.staminaLowNode) this.staminaLowNode.active = staminaNowLow;
    if (!hungerNowLow) this.setBarOpacity(this.hungerFill, 255);
    if (!staminaNowLow) this.setBarOpacity(this.staminaFill, 255);
    this.updateBarBlink();

    // 两项都低：暗角 + 主角喘气/捂肚子
    const tired = hungerNowLow && staminaNowLow;
    if (this.screenRoot) {
      Fx.vignette(this.screenRoot, tired);
    }

    // 只有在地点页才显示回家体力；占卜/地图页不显示「回家需 0 体力」
    const showHomeCost = this.game.phase === 'location' && this.game.location != null;
    this.homeCostLabel.node.active = showHomeCost;
    if (showHomeCost) {
      const cost = this.game.homeCost();
      this.homeCostLabel.string = `回家需 ${cost} 体力`;
    }
    this.updatePayHints();
  }

  private updateBarBlink(): void {
    // 由 update(dt) 统一驱动，避免 tween 在切场景时残留
    const on = this.hungerLow || this.staminaLow;
    if (!on) {
      this.setBarOpacity(this.hungerFill, 255);
      this.setBarOpacity(this.staminaFill, 255);
      this.blinkTime = 0;
    }
  }

  private setBarOpacity(node: Node, opacity: number): void {
    if (!node || !node.isValid) return;
    const op = node.getComponent(UIOpacity) ?? node.addComponent(UIOpacity);
    op.opacity = opacity;
  }

  update(dt: number): void {
    if (!this.hungerLow && !this.staminaLow) return;
    this.blinkTime += dt;
    const visible = Math.floor(this.blinkTime * 2.5) % 2 === 0;
    if (this.hungerLow) {
      this.setBarOpacity(this.hungerFill, visible ? 255 : 80);
      if (this.hungerLowNode) this.setBarOpacity(this.hungerLowNode, visible ? 255 : 40);
    }
    if (this.staminaLow) {
      this.setBarOpacity(this.staminaFill, visible ? 255 : 80);
      if (this.staminaLowNode) this.setBarOpacity(this.staminaLowNode, visible ? 255 : 40);
    }
  }

  private floatResourceChange(): void {
    if (!this.game) return;
    const stamina = this.game.stamina;
    const hunger = this.game.hunger;
    if (this.lastStamina >= 0 && stamina < this.lastStamina - 0.01) {
      const d = Math.round(this.lastStamina - stamina);
      if (d > 0) {
        Fx.floatText(this.hudRoot, `−${d}`, new Vec3(132, UILayout.headerY - 66, 0), new Color(255, 110, 110, 255));
      }
    }
    if (this.lastHunger >= 0 && hunger < this.lastHunger - 0.01) {
      const d = Math.round(this.lastHunger - hunger);
      if (d > 0) {
        Fx.floatText(this.hudRoot, `−${d}`, new Vec3(-132, UILayout.headerY - 66, 0), new Color(255, 200, 80, 255));
      }
    }
    this.lastStamina = stamina;
    this.lastHunger = hunger;
  }

  private showToast(text: string, color: Color, x: number): void {
    Fx.floatText(this.hudRoot, text, new Vec3(x, UILayout.headerY - 112, 0), color);
  }

  private addPayHint(parent: Node, x: number, y: number, price: () => number): Label {
    const node = uiNode('pay_hint');
    node.parent = parent;
    const ut = node.addComponent(UITransform);
    ut.setContentSize(150, 28);
    node.setPosition(x, y, 0);
    const label = node.addComponent(Label);
    label.fontSize = pxFont(12);
    label.lineHeight = pxFont(12);
    label.color = new Color(120, 255, 120, 255);
    label.horizontalAlign = Label.HorizontalAlign.CENTER;
    label.verticalAlign = Label.VerticalAlign.CENTER;
    label.overflow = Label.Overflow.CLAMP;
    label.enableWrapText = false;
    PixelFont.apply(label, { color: new Color(120, 255, 120, 255), bg: 'dark' });
    this.payHints.push({ label, price });
    return label;
  }

  private updatePayHints(): void {
    for (const hint of this.payHints) {
      if (!hint || !hint.label || !hint.label.isValid) continue;
      const diff = hint.price() - this.game.money;
      if (diff > 0.001) {
        hint.label.string = `还差 ¥${Math.ceil(diff)}`;
        hint.label.color = new Color(255, 90, 90, 255);
      } else {
        hint.label.string = '够钱';
        hint.label.color = new Color(120, 255, 120, 255);
      }
    }
  }

  private refresh(): void {
    if (!this.screenRoot) return;
    this.screenRoot.destroyAllChildren();
    // 地点视图的节点已随 screenRoot 一起销毁，指针置空，下面按当前 phase 重建
    this.locationView = null;
    // 付款提示节点随 screenRoot 销毁，清掉旧引用
    this.payHints = [];

    this.updateHUD();

    // 地图页底部是完整操作栏，贴底签名小字会压在按钮上，隐藏。
    // 开局/住处左下角改显示版本角标，两者不同时出现，窄屏也不重叠。
    const showVersion = IS_TEST_BUILD && (this.game.phase === 'fortune' || this.game.phase === 'home');
    if (this.signLabel && this.signLabel.isValid) {
      this.signLabel.node.active = this.game.phase !== 'map' && this.game.phase !== 'event' && !showVersion;
    }
    if (this.signPlate && this.signPlate.isValid) {
      this.signPlate.active = this.game.phase !== 'map' && this.game.phase !== 'event' && !showVersion;
    }
    if (this.versionLabel && this.versionLabel.isValid) {
      this.versionLabel.node.active = showVersion;
    }

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
        this.showHome(this.pendingHomeMoveIn);
        this.pendingHomeMoveIn = false;
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
    // 暗角必须在场景内容之后创建/提升，否则会被全屏背景盖住
    this.updateVignette();
    this.assertPixelFontCoverage();
  }

  /** 开发期兜底：任何 Label 没挂 pixel_plain/pixel_outline 都会在控制台报出来（发布前应为 0）。 */
  private assertPixelFontCoverage(): void {
    const unstyled = PixelFont.findUnstyledLabels(this);
    if (unstyled.length > 0) {
      console.error('[PixelFont] 未应用 pixel_plain/pixel_outline 的 Label 数量:', unstyled.length);
    }
  }

  private updateVignette(): void {
    if (!this.game || !this.screenRoot) return;
    const staminaRatio = this.game.maxStamina > 0 ? this.game.stamina / this.game.maxStamina : 0;
    const hungerRatio = CONFIG.maxHunger > 0 ? this.game.hunger / CONFIG.maxHunger : 0;
    Fx.vignette(this.screenRoot, staminaRatio < CONFIG.uiLowRatio && hungerRatio < CONFIG.uiLowRatio);
  }

  // -------------------- 占卜 --------------------
  private showFortune(): void {
    const bg = Art.makeVisual('bg_fortune', 720, 1280, new Color(60, 40, 80, 255), '占卜');
    bg.parent = this.screenRoot;
    bg.setPosition(0, 0, 0);

    // 签筒原图 64×96，按 2 倍整数倍显示，避免拉伸。
    // r35 签纸变宽变高后，签筒必须放在纸顶上方，不能压住签头。
    const paper = this.fortunePaperLayout();
    const tubeH = 192;
    const tube = Art.makeVisual('fortune_tube', 128, tubeH, new Color(180, 140, 100, 255), '签筒');
    tube.parent = this.screenRoot;
    tube.setPosition(0, paper.centerY + paper.height / 2 + tubeH / 2 + pxSpacing(8), 0);

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

  private fortunePaperLayout() {
    if (!this.game.fortune) return computeFortunePaperLayoutForText('').paper;
    return computeFortunePaperLayoutForText(this.currentFortuneText()).paper;
  }

  /** r36：签文只从这里拼接，保证语料预计算、排版、渲染三处格式完全一致。 */
  private currentFortuneText(): string {
    if (!this.game.fortune) return '';
    return buildFortuneText(
      this.game.fortune,
      this.game.fortuneLocation ? this.locationName(this.game.fortuneLocation) : null,
    );
  }

  private showFortuneSlip(): void {
    if (!this.game.fortune) return;
    // r35 签纸：宽 = 屏宽 72%，九宫格内文字区，字号不缩小，高度随文字长高。
    const fortuneText = this.currentFortuneText();
    const { paper, fit: textFit } = computeFortunePaperLayoutForText(fortuneText);
    // 九宫格本地尺寸按源像素计，节点缩放 = 每源像素设计单位；
    // 这样边框世界尺寸 = 18/32/33 × k 物理像素，不会随纸宽被整体拉伸。
    const local = fortunePaperNodeSize(paper);
    const slip = Art.makeVisual(FORTUNE_PAPER_ART, local.width, local.height, new Color(240, 230, 200, 255), '签面');
    slip.parent = this.screenRoot;
    slip.setPosition(paper.centerX, paper.centerY, 0);
    const paperScale = fortunePaperNodeScale(paper);
    slip.setScale(paperScale, paperScale, 1);
    const slipSprite = slip.getComponent(Sprite);
    if (slipSprite) slipSprite.type = Sprite.Type.SLICED;
    // 亮底纯色字 #1a1020，pixel_plain、不描边。
    const color = PIXEL_INK_COLOR.clone();
    const textPos = fortuneTextPosition(paper);
    const text = this.createWorldLabel(
      textFit.text,
      textFit.fontSize,
      color,
      new Vec3(textPos.x, textPos.y, 0),
      textFit.labelWidth,
      paper.text.maxHeight,
      true
    );
    this.applyFittedLabel(text, textFit);
    // r36：签文已经由 wrapTextToLines 显式断行，Label 绝不能再自行折行/按字断。
    const fortuneLabel = text.getComponent(Label);
    if (fortuneLabel) {
      fortuneLabel.string = textFit.text;
      fortuneLabel.enableWrapText = false;
      fortuneLabel.overflow = Label.Overflow.CLAMP;
      fortuneLabel.lineHeight = textFit.lineHeight;
    }
    text.parent = this.screenRoot;

    const acceptBtn = this.createButton('就它了', 180, 56, new Vec3(-100, 0, 0), () => {
      this.game.acceptFortune();
      this.refresh();
    }, pxFont(18));
    acceptBtn.parent = this.screenRoot;
    alignBottom(acceptBtn, 70);

    const rerollCost = this.game.rerollCost();
    const rerollBtn = this.createButton(`重抽 ¥${rerollCost.toFixed(0)}`, 180, 56, new Vec3(100, 0, 0), () => {
      if (this.game.rerollFortune()) {
        // 重抽后重铺签筒/签面，避免旧节点叠在新节点下面
        this.screenRoot.destroyAllChildren();
        this.payHints = [];
        this.showFortune();
      } else {
        Fx.floatText(this.screenRoot, '钱不够', new Vec3(0, -500, 0), new Color(255, 80, 80, 255));
      }
    }, pxFont(18));
    if (this.game.money < rerollCost) {
      rerollBtn.getComponent(UIOpacity) ?? rerollBtn.addComponent(UIOpacity);
      rerollBtn.getComponent(UIOpacity)!.opacity = 120;
    }
    rerollBtn.parent = this.screenRoot;
    alignBottom(rerollBtn, 70);

    // 够钱绿色 / 不够红色 + 还差 ¥X。
    // U6：提示底边在「重抽」按钮上沿上方 ≥8 设计 px，绝不压按钮。
    const rerollBtnH = Art.buttonMetrics(`重抽 ¥${rerollCost.toFixed(0)}`, 180, 56).height;
    const rerollHint = this.addPayHint(this.screenRoot, 100, 0, () => rerollCost);
    alignBottom(rerollHint.node, 70 + rerollBtnH + pxSpacing(8));
    this.updatePayHints();

    this.showDailySpecialPopup();
  }

  /** 占卜后弹出当天的「今日限定」；同一天只弹一次。 */
  private showDailySpecialPopup(): void {
    const special = this.game.dailySpecial;
    if (!special || this.dailySpecialShownDay === this.game.day) return;
    this.dailySpecialShownDay = this.game.day;

    const layer = uiNode('daily_special_popup');
    layer.parent = this.screenRoot;
    const lut = layer.addComponent(UITransform);
    lut.setContentSize(720, 1280);
    layer.setPosition(0, 0, 0);

    const dim = uiNode('dim');
    dim.parent = layer;
    const dut = dim.addComponent(UITransform);
    dut.setContentSize(720, 1280);
    const dg = dim.addComponent(Graphics);
    dg.fillColor = new Color(0, 0, 0, 150);
    dg.rect(-360, -640, 720, 1280);
    dg.fill();
    dim.on(Node.EventType.TOUCH_START, (e: any) => e?.stopPropagation?.());

    const panelW = Math.min(580, UILayout.visibleW - pxSpacing(12) * 2);
    const panelH = 360;
    const panel = uiNode('panel');
    panel.parent = layer;
    const put = panel.addComponent(UITransform);
    put.setContentSize(panelW, panelH);
    panel.setPosition(0, 20, 0);
    const pg = panel.addComponent(Graphics);
    pg.fillColor = new Color(45, 34, 26, 248);
    pg.roundRect(-panelW / 2, -panelH / 2, panelW, panelH, 18);
    pg.fill();
    pg.lineWidth = 4;
    pg.strokeColor = new Color(255, 205, 90, 255);
    pg.roundRect(-panelW / 2, -panelH / 2, panelW, panelH, 18);
    pg.stroke();

    const dailyTitleSize = titleFontSizeForText('今日限定', 360);
    const title = this.createWorldLabel('今日限定', dailyTitleSize, new Color(255, 220, 110, 255), new Vec3(0, 118, 0), 360, lineHeightForFontSize(dailyTitleSize));
    title.parent = panel;
    const name = this.createWorldLabel(special.name, pxFont(12), new Color(255, 248, 225, 255), new Vec3(0, 58, 0), 520, 44);
    name.parent = panel;
    const descFit = fitCardText(special.desc, {
      maxWidth: 500,
      maxHeight: 72,
      fontSize: pxFont(12),
      minFontSize: pxFont(12),
      lineGap: 0,
    });
    const desc = this.createWorldLabel(descFit.text, descFit.fontSize, new Color(230, 230, 220, 255), new Vec3(0, 18 - descFit.height / 2, 0), 500, descFit.height);
    this.applyFittedLabel(desc, descFit);
    desc.parent = panel;
    const hint = this.createWorldLabel(`第 ${this.game.day} 天 · 只在今天生效`, pxFont(12), new Color(190, 180, 165, 255), new Vec3(0, -64, 0), 520, 30);
    hint.parent = panel;

    const ok = this.createButton('知道了', 180, 56, new Vec3(0, -122, 0), () => {
      if (layer.isValid) layer.destroy();
    });
    ok.parent = panel;
  }

  private createDailyBadge(
    parent: Node,
    x: number,
    y: number,
    side: string = 'right',
    width: number = MAP_BADGE_W,
    height: number = MAP_BADGE_H,
  ): void {
    const w = Math.max(1, width);
    const h = Math.max(1, height);
    const merged = side === 'merged';
    const badge = uiNode('daily_badge');
    badge.parent = parent;
    const ut = badge.addComponent(UITransform);
    ut.setContentSize(w, h);
    badge.setPosition(x, y, 0);
    const g = badge.addComponent(Graphics);
    // 纯色实底 + 1px 深色描边，保证在花哨的地图底图上也能看清。
    g.fillColor = new Color(220, 58, 48, 255);
    if (merged) {
      // 并进名字牌左端：左端保留圆角，右端直角，与名字牌无缝拼接。
      const r = Math.min(6, w / 2, h / 2);
      const trace = () => {
        g.moveTo(w / 2, h / 2);
        g.lineTo(-w / 2 + r, h / 2);
        g.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
        g.lineTo(-w / 2, -h / 2 + r);
        g.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
        g.lineTo(w / 2, -h / 2);
        g.close();
      };
      trace();
      g.fill();
      g.lineWidth = pxSpacing(1);
      g.strokeColor = new Color(26, 16, 32, 255);
      trace();
      g.stroke();
      // 红段与名字牌之间 1px #1a1020 分隔线。
      g.lineWidth = pxSpacing(1);
      g.strokeColor = new Color(26, 16, 32, 255);
      g.moveTo(w / 2 - pxSpacing(1) / 2, h / 2);
      g.lineTo(w / 2 - pxSpacing(1) / 2, -h / 2);
      g.stroke();
    } else {
      g.roundRect(-w / 2, -h / 2, w, h, 7);
      g.fill();
      g.lineWidth = pxSpacing(1);
      g.strokeColor = new Color(26, 16, 32, 255);
      g.roundRect(-w / 2, -h / 2, w, h, 7);
      g.stroke();
    }

    // 下方角标与所属名字牌之间保留连接线，明确归属；左右两侧不需要。
    if (side === 'below') {
      g.lineWidth = pxSpacing(1);
      g.strokeColor = new Color(220, 58, 48, 220);
      g.moveTo(0, h / 2);
      g.lineTo(0, h / 2 + 2);
      g.stroke();
    }

    const ln = uiNode('label');
    ln.parent = badge;
    const lut = ln.addComponent(UITransform);
    lut.setContentSize(w, h);
    // 1 倍节点缩放下用 24px 字（等价旧版 12px×2 整数倍），避免半像素采样。
    ln.setScale(MAP_BADGE_SCALE, MAP_BADGE_SCALE, 1);
    const lb = ln.addComponent(Label);
    // 任何回退档都必须带字显示，绝不再出现无字小点/红印章。
    lb.string = MAP_BADGE_TEXT;
    lb.fontSize = pxFont(12);
    lb.lineHeight = pxFont(12);
    lb.color = new Color(255, 248, 220, 255);
    lb.horizontalAlign = Label.HorizontalAlign.CENTER;
    lb.verticalAlign = Label.VerticalAlign.CENTER;
    lb.overflow = Label.Overflow.CLAMP;
    lb.enableWrapText = false;
    PixelFont.apply(lb, { color: new Color(255, 248, 220, 255), bg: 'dark' });
  }

  // -------------------- 地图 --------------------
  private showMap(): void {
    // 先铺满底色：低对比底图 + 深色边框，窄屏两侧和顶部不会露出突兀的色块。
    // 即使地图纹理有 1px 误差，也只会露出 #1a1020 和描边，绝不露纯黑。
    const mapFill = uiNode('map_side_fill');
    mapFill.parent = this.screenRoot;
    const mapFillUt = mapFill.addComponent(UITransform);
    mapFillUt.setContentSize(UILayout.visibleW + 4, UILayout.visibleH + 4);
    mapFill.setPosition(0, 0, 0);
    const mapFillG = mapFill.addComponent(Graphics);
    mapFillG.fillColor = new Color(26, 16, 32, 255);
    mapFillG.rect(-(UILayout.visibleW + 4) / 2, -(UILayout.visibleH + 4) / 2, UILayout.visibleW + 4, UILayout.visibleH + 4);
    mapFillG.fill();
    mapFillG.lineWidth = 1;
    mapFillG.strokeColor = new Color(26, 16, 32, 255);
    mapFillG.rect(-(UILayout.visibleW + 4) / 2, -(UILayout.visibleH + 4) / 2, UILayout.visibleW + 4, UILayout.visibleH + 4);
    mapFillG.stroke();

    const mapBg = Art.makeVisual(
      'map_bg',
      Math.max(720, Math.ceil(UILayout.visibleW)),
      Math.max(1280, Math.ceil(UILayout.visibleH)),
      new Color(34, 30, 42, 255),
    );
    mapBg.parent = this.screenRoot;
    mapBg.setPosition(0, 0, 0);

    // 底部操作栏尺寸先算出来，地图在「HUD 底边」与「操作栏顶边」之间等比缩放。
    // r26 按钮文字回正文档 + 44 CSS 最小触摸高，底栏高度跟着按钮/提示实际高度走。
    const barW = Math.max(360, Math.round(UILayout.visibleW));
    const iconSize = 96;
    const lockSize = 32;
    const plateFont = pxFont(12);
    const plateH = computeMapPlateHeight(plateFont);
    const mapHintFont = pxFont(12);
    const mapHintLineH = lineHeightForFontSize(mapHintFont);
    const homeBtnMetrics = Art.buttonMetrics('回家', 112, 48);
    const endBtnMetrics = Art.buttonMetrics('收工', 112, 48);
    const btnW = Math.max(112, homeBtnMetrics.width, endBtnMetrics.width);
    const btnH = Math.max(homeBtnMetrics.height, endBtnMetrics.height);
    const barPad = pxSpacing(6);
    const barH = Math.ceil(Math.max(112, btnH + mapHintLineH + barPad * 2 + 8));
    const mapLayout = computeMapLayout({
      visibleH: UILayout.visibleH,
      visibleW: UILayout.visibleW,
      // headerTop 已经包含顶部刘海/胶囊安全区。
      headerTop: UILayout.headerTop,
      hudHeight: HUD_HEADER_H,
      barHeight: barH,
      // 底栏贴在底部安全区上方：地图可视底边必须再扣掉 safeBottom。
      safeBottom: UILayout.safeBottom,
      iconSize,
      plateHeight: plateH,
    });

    // 像素地图原图 360×640，按 2 倍显示；cover 后宽高都铺满内容区，
    // 多出的上下部分被内容区裁切（地点图标/名牌仍由 placeMapMarker 夹回内容区）。
    const map = Art.makeVisual('map', 720, 1280, new Color(100, 140, 100, 255));
    map.parent = this.screenRoot;
    map.setPosition(0, mapLayout.centerY, 0);
    map.setScale(mapLayout.scale, mapLayout.scale, 1);

    const halfW = UILayout.halfW;
    const maxPlateW = Math.min(
      300,
      UILayout.visibleW - UILayout.safeLeft - UILayout.safeRight - 24,
    );
    const currentLoc = this.game.location ?? 'baishizhou';

    // r36：先算齐所有点位，再做「限定」小牌碰撞检测，避免按循环顺序拿不到
    // 后面地点的图标/名牌；玩家小人包围盒也一起参与避让。
    const markerInfos = LOCATIONS.map((loc) => {
      const point = MAP_POINTS[loc.id];
      const open = this.game.isLocationOpen(loc.id);
      const travel = this.game.travelCost(loc.id);
      const home = this.game.homeCostFrom(loc.id);
      const canReturn = this.game.stamina >= travel + home;
      const banned = this.game.bannedToday.includes(loc.id);
      // 未开放只用浅灰剪影；不再叠 UIOpacity / 颜色，保持素材原样。
      let plateText = loc.name;
      if (!open) plateText = `第 ${this.game.openDayFor(loc.id)} 天开放`;
      else if (banned) plateText = `${loc.name} · 今日拉黑`;
      else if (!canReturn) plateText = `${loc.name} · 回不去`;
      const plateW = computeMapPlateWidth(plateText, plateFont, {
        minWidth: 112,
        maxWidth: maxPlateW,
        padX: 28,
      });
      const placement = point
        ? placeMapMarker(point.x, point.y, mapLayout, {
          iconSize,
          plateWidth: plateW,
          plateHeight: plateH,
          halfW,
          safeLeft: UILayout.safeLeft,
          safeRight: UILayout.safeRight,
        })
        : null;
      return { loc, point, open, travel, home, canReturn, banned, plateText, plateW, placement };
    });

    const currentInfo = markerInfos.find((info) => info.open && info.loc.id === currentLoc);
    const heroRect = currentInfo?.placement ? {
      left: currentInfo.placement.x + iconSize / 2 + 20 - 32,
      right: currentInfo.placement.x + iconSize / 2 + 20 + 32,
      top: currentInfo.placement.y - 4 + 32,
      bottom: currentInfo.placement.y - 4 - 32,
    } : null;

    for (const info of markerInfos) {
      const { loc, open, travel, home, canReturn, banned, plateText, plateW, placement } = info;
      if (!placement) continue;
      const x = placement.x;
      const y = placement.y;

      // r39（UI/UX 定稿）：先算「限定」小牌，再建名字牌。
      // 候选顺序：右 → 左 → 正下方 → 并进名字牌左端。
      // 碰撞检测必须把自家地点图标也算进去（只排除自家名字牌本身），
      // 玩家小人包围盒同样参与；独立候选均留 2px 余量。
      const plateWorld = placement.plate;
      const plateCenterX = (plateWorld.left + plateWorld.right) / 2;
      const plateCenterY = (plateWorld.top + plateWorld.bottom) / 2;
      let badge: ReturnType<typeof computeBadgeUnderPlate> | null = null;
      if (this.game.hasDailySpecialAt(loc.id)) {
        const blockers: Array<{ left: number; right: number; top: number; bottom: number }> = [];
        for (const other of markerInfos) {
          if (!other.placement) continue;
          blockers.push(other.placement.icon);
          // 只排除自己的名字牌；其他名字牌都参与碰撞。
          if (other.loc.id !== loc.id) blockers.push(other.placement.plate);
        }
        if (heroRect) blockers.push(heroRect);
        const badgeBounds = {
          left: -UILayout.halfW + UILayout.safeLeft + 8,
          right: UILayout.halfW - UILayout.safeRight - 8,
          top: mapLayout.areaTop,
          bottom: mapLayout.areaBottom,
        };
        badge = computeBadgeUnderPlate(plateWorld, MAP_BADGE_W, MAP_BADGE_H, {
          gap: 2,
          minClearance: 2,
          blockers,
          mergedBlockers: heroRect ? [placement.icon, heroRect] : [placement.icon],
          bounds: badgeBounds,
        });
      }

      const marker = uiNode(`map_marker_${loc.id}`);
      marker.parent = this.screenRoot;
      const mut = marker.addComponent(UITransform);
      mut.setContentSize(iconSize, iconSize);
      marker.setPosition(x, y, 0);

      // 地点只显示小图标 + 地名；未开放只显示「第 N 天开放」
      const iconName = open ? `map_icon_${loc.id}` : `map_icon_${loc.id}_locked`;
      const icon = Art.makeVisual(iconName, iconSize, iconSize, new Color(90, 110, 90, 255), '');
      icon.parent = marker;
      icon.setPosition(0, 0, 0);

      // 未开放：右上角加锁；图标本身保持素材原样，不压暗、不着色。
      if (!open) {
        const lock = Art.makeVisual('icon_lock_16', lockSize, lockSize, new Color(210, 210, 210, 255), '');
        lock.parent = marker;
        lock.setPosition(iconSize / 2 - lockSize / 2 + 2, iconSize / 2 - lockSize / 2 + 2, 0);
      }

      // 地名牌直接贴在图下：底板宽度按文字撑开，白色大字 + 深色描边。
      const plate = this.createMapPlate(plateText, !open, plateW, plateH, plateFont);
      plate.parent = marker;
      // merged 时整块名字牌（红段 + 名牌）重新以图标为中心对齐；
      // plateShiftX 是原名牌相对图标中心的位移。
      const plateShiftX = badge?.merged ? (badge.plateShiftX ?? 0) : 0;
      plate.setPosition(plateShiftX, -iconSize / 2 - plateH / 2 - 2, 0);

      if (badge) {
        if (badge.merged) {
          // 红段贴在名字牌左端，与名字牌等高；整块已按图标中心重新对齐。
          const badgeX = -(plateW + MAP_BADGE_W) / 2;
          this.createDailyBadge(plate, badgeX, 0, 'merged', MAP_BADGE_W, plateH);
        } else {
          this.createDailyBadge(
            plate,
            badge.centerX - plateCenterX,
            badge.centerY - plateCenterY,
            badge.side,
          );
        }
      }

      // 主角站在当前地点（替代「你在这」）；玩家小人 zIndex 最高，压住角标。
      if (open && loc.id === currentLoc) {
        const heroName = this.heroArtName();
        const hero = Art.makeVisual(heroName, 64, 64, new Color(180, 160, 120, 255));
        hero.parent = marker;
        hero.setPosition(iconSize / 2 + 20, -4, 0);
        (hero as any).zIndex = 10000;
        hero.setSiblingIndex(marker.children.length - 1);
        Art.play(hero, heroName, 8, true);
      }

      // 点击展开详情（不直接出门，避免误触）
      const tap = (event: any) => {
        event?.stopPropagation?.();
        this.showMapDetails(loc.id);
      };
      marker.on(Node.EventType.TOUCH_START, tap, this);
    }

    // 底部操作栏：360×56 的底图按 2x 显示，上排提示、下排右侧按钮。
    const bar = Art.makeVisual('bottom_bar', barW, barH, new Color(38, 30, 42, 240));
    bar.parent = this.screenRoot;
    bar.setPosition(0, UILayout.bottom + barH / 2, 0);

    const fortune = this.game.fortune;
    const fortuneLoc = this.game.fortuneLocation;
    let mapHint = '点击地点前往 · 解锁地点需等待天数';
    let hintColor = new Color(238, 238, 230, 255);
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

    // 签文/提示按底栏可用宽度预排版：字号只取整数源像素档，放不下就先折行再降档，
    // 绝不靠分数缩放把像素字压糊。锚点 X=0 从左边内边距起排，避免整段文字滑出屏幕。
    const hintPadX = pxSpacing(8);
    const hintFit = fitCardText(mapHint, {
      maxWidth: barW - hintPadX * 2,
      maxHeight: mapHintLineH,
      fontSize: mapHintFont,
      minFontSize: mapHintFont,
      lineGap: 0,
    });
    const hint = this.createWorldLabel(
      hintFit.text,
      hintFit.fontSize,
      hintColor,
      new Vec3(-barW / 2 + hintPadX, barH / 2 - barPad - mapHintLineH / 2, 0),
      barW - hintPadX * 2,
      mapHintLineH,
    );
    hint.parent = bar;
    const hintTransform = hint.getComponent(UITransform);
    if (hintTransform) hintTransform.setAnchorPoint(0, 0.5);
    const hintLabel = hint.getComponent(Label);
    if (hintLabel) {
      hintLabel.horizontalAlign = Label.HorizontalAlign.LEFT;
      hintLabel.verticalAlign = Label.VerticalAlign.CENTER;
      hintLabel.enableWrapText = false;
      hintLabel.overflow = Label.Overflow.CLAMP;
    }

    const btnGap = 14;
    const btnRight = barW / 2 - 24;
    const btnY = -barH / 2 + btnH / 2 + barPad;
    const endX = btnRight - btnW / 2;
    const homeX = endX - btnW - btnGap;

    const homeBtn = Art.makeSpriteButton('label_plate', '', '回家', btnW, btnH, () => {
      if (this.game.goHome()) {
        this.refresh();
      } else {
        Fx.floatText(this.screenRoot, `体力不足，需 ${this.game.homeCost()}`, new Vec3(0, -500, 0), new Color(255, 80, 80, 255));
      }
    }, pxFont(18));
    homeBtn.parent = bar;
    homeBtn.setPosition(homeX, btnY, 0);

    const endBtn = Art.makeSpriteButton('label_plate', '', '收工', btnW, btnH, () => {
      this.game.endDayAway();
      this.refresh();
    }, pxFont(18));
    endBtn.parent = bar;
    endBtn.setPosition(endX, btnY, 0);
  }

  /** 地图地名牌：底板按文字宽度拉伸，文字白色 + 深色描边。 */
  private createMapPlate(
    text: string,
    locked: boolean,
    width: number,
    height: number,
    fontSize: number,
  ): Node {
    const artName = locked ? 'label_plate_locked' : 'label_plate';
    const plate = Art.makeVisual(
      artName,
      width,
      height,
      locked ? new Color(86, 92, 88, 240) : new Color(32, 48, 72, 240),
      '',
    );

    const labelNode = uiNode('plate_label');
    labelNode.parent = plate;
    const lut = labelNode.addComponent(UITransform);
    lut.setContentSize(width, height);
    labelNode.setPosition(0, 0, 0);

    const label = labelNode.addComponent(Label);
    label.string = text;
    label.fontSize = fontSize;
    label.lineHeight = fontSize;
    label.color = new Color(255, 255, 255, 255);
    label.horizontalAlign = Label.HorizontalAlign.CENTER;
    label.verticalAlign = Label.VerticalAlign.CENTER;
    label.overflow = Label.Overflow.CLAMP;
    label.enableWrapText = false;
    PixelFont.apply(label, { color: new Color(255, 255, 255, 255), bg: 'dark' });
    return plate;
  }

  /** 点击地图图标后展开的地点详情。 */
  private showMapDetails(locId: string): void {
    const loc = LOCATIONS.find((l) => l.id === locId);
    if (!loc || !this.screenRoot) return;

    const open = this.game.isLocationOpen(locId);
    const travel = this.game.travelCost(locId);
    const home = this.game.homeCostFrom(locId);
    const canReturn = this.game.stamina >= travel + home;
    const banned = this.game.bannedToday.includes(locId);
    const special = this.game.hasDailySpecialAt(locId) ? this.game.dailySpecial : null;

    const layer = uiNode('map_details');
    layer.parent = this.screenRoot;
    const lut = layer.addComponent(UITransform);
    lut.setContentSize(720, 1280);
    layer.setPosition(0, 0, 0);

    const dim = uiNode('dim');
    dim.parent = layer;
    const dut = dim.addComponent(UITransform);
    dut.setContentSize(720, 1280);
    const dg = dim.addComponent(Graphics);
    dg.fillColor = new Color(0, 0, 0, 140);
    dg.rect(-360, -640, 720, 1280);
    dg.fill();
    dim.on(Node.EventType.TOUCH_START, () => {
      if (layer.isValid) layer.destroy();
    }, this);

    const panelW = Math.min(560, UILayout.visibleW - pxSpacing(12) * 2);
    const panelH = open ? 440 : 300;
    const panel = uiNode('panel');
    panel.parent = layer;
    const put = panel.addComponent(UITransform);
    put.setContentSize(panelW, panelH);
    panel.setPosition(0, 20, 0);
    const pg = panel.addComponent(Graphics);
    pg.fillColor = new Color(44, 36, 28, 248);
    pg.roundRect(-panelW / 2, -panelH / 2, panelW, panelH, 18);
    pg.fill();
    pg.lineWidth = 4;
    pg.strokeColor = open ? new Color(255, 205, 90, 255) : new Color(150, 150, 150, 255);
    pg.roundRect(-panelW / 2, -panelH / 2, panelW, panelH, 18);
    pg.stroke();
    panel.on(Node.EventType.TOUCH_START, (e: any) => e?.stopPropagation?.(), this);

    const detailTitleSize = titleFontSizeForText(loc.name, panelW - 40);
    const title = this.createWorldLabel(loc.name, detailTitleSize, new Color(255, 230, 150, 255), new Vec3(0, panelH / 2 - 44, 0), panelW - 40, lineHeightForFontSize(detailTitleSize));
    title.parent = panel;

    if (!open) {
      const locked = this.createWorldLabel(
        `第 ${this.game.openDayFor(locId)} 天开放`,
        pxFont(12),
        new Color(220, 220, 220, 255),
        new Vec3(0, 18, 0),
        panelW - 60,
        50,
      );
      locked.parent = panel;
      const close = this.createButton('知道了', 180, 56, new Vec3(0, -panelH / 2 + 54, 0), () => {
        if (layer.isValid) layer.destroy();
      });
      close.parent = panel;
      return;
    }

    const lines = [
      `开放：第 ${this.game.openDayFor(locId)} 天`,
      `往返体力：${travel + home}（去 ${travel} / 回 ${home}）`,
      `今日限定：${special ? special.name : '无'}`,
    ];
    if (banned) lines.push('今天被巡逻拉黑了');
    else if (!canReturn) lines.push('去了回不来');

    const bodyFit = fitCardText(lines.join('\n'), {
      maxWidth: panelW - 70,
      maxHeight: 132,
      fontSize: pxFont(12),
      minFontSize: pxFont(12),
      lineGap: 0,
    });
    const bodyTop = 96;
    const body = this.createWorldLabel(
      bodyFit.text,
      bodyFit.fontSize,
      banned || !canReturn ? new Color(255, 150, 130, 255) : new Color(238, 238, 225, 255),
      new Vec3(0, bodyTop - bodyFit.height / 2, 0),
      panelW - 70,
      bodyFit.height,
    );
    this.applyFittedLabel(body, bodyFit);
    body.parent = panel;

    if (special) {
      const descFit = fitCardText(special.desc, {
        maxWidth: panelW - 70,
        maxHeight: 60,
        fontSize: pxFont(12),
        minFontSize: pxFont(12),
        lineGap: 0,
      });
      const descY = bodyTop - bodyFit.height - 8 - descFit.height / 2;
      const desc = this.createWorldLabel(descFit.text, descFit.fontSize, new Color(200, 190, 170, 255), new Vec3(0, descY, 0), panelW - 70, descFit.height);
      this.applyFittedLabel(desc, descFit);
      desc.parent = panel;
    }

    const go = this.createButton(banned || !canReturn ? '去不了' : '去这里', 180, 56, new Vec3(-100, -panelH / 2 + 54, 0), () => {
      if (banned) {
        Fx.floatText(this.screenRoot, '今天被拉黑了', new Vec3(0, -80, 0), new Color(255, 80, 80, 255));
        return;
      }
      if (!canReturn) {
        Fx.floatText(this.screenRoot, '去了回不来', new Vec3(0, -80, 0), new Color(255, 80, 80, 255));
        return;
      }
      if (this.game.travel(locId)) {
        this.refresh();
      } else {
        Fx.floatText(this.screenRoot, '体力不足', new Vec3(0, -80, 0), new Color(255, 80, 80, 255));
      }
    });
    if (banned || !canReturn) {
      const op = go.getComponent(UIOpacity) ?? go.addComponent(UIOpacity);
      op.opacity = 140;
    }
    go.parent = panel;

    const close = this.createButton('关闭', 150, 56, new Vec3(100, -panelH / 2 + 54, 0), () => {
      if (layer.isValid) layer.destroy();
    });
    close.parent = panel;
  }

  // -------------------- 地点 --------------------
  private showLocation(): void {
    if (!this.locationView) {
      this.locationView = new LocationView(
        this.screenRoot,
        this.game,
        () => {
          this.updateHUD();
          this.locationView?.updateHeroState();
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
    // U1：事件页打开时整个玩法层 active=false，只保留顶栏；
    // 事件结束后 refresh 统一重建地点页。
    this.locationView?.setGameplayActive(false);
    EventView.show(this.screenRoot, this.game, pending, () => {
      // 被抓等事件清空背包时，先把地点页网格里的物品节点也清掉
      if (this.game.bag.length === 0) {
        this.locationView?.clearBagView();
      }
      this.refresh();
    }, { sloganTop: this.footerSloganTop() });
  }

  /** 底部标语 Label 的真实顶边；不存在/已隐藏时返回 null，让事件页退回安全区底。 */
  private footerSloganTop(): number | null {
    const node = this.signLabel?.node;
    if (!node || !node.isValid || !node.activeInHierarchy) return null;
    const ut = node.getComponent(UITransform);
    if (!ut) return null;
    return node.position.y + ut.height / 2;
  }

  // -------------------- 家 --------------------
  private showHome(animateMoveIn: boolean = false): void {
    const level = CONFIG.homeLevels[this.game.homeLevel];
    const bg = Art.makeVisual(level.scene, 720, 1280, new Color(24, 26, 36, 255), level.name);
    bg.parent = this.screenRoot;
    bg.setPosition(0, 0, 0);

    // 窗外深圳夜景灯：透明叠层，简单呼吸/闪烁；lv2 没有灯层。
    if (level.lights && Art.firstFrame(level.lights)) {
      const lights = Art.makeVisual(level.lights, 720, 1280, new Color(0, 0, 0, 0));
      lights.parent = this.screenRoot;
      lights.setPosition(0, 0, 0);
      const op = lights.addComponent(UIOpacity);
      op.opacity = 90;
      tween(op)
        .to(1.1, { opacity: 255 })
        .to(1.4, { opacity: 70 })
        .delay(0.5)
        .union()
        .repeatForever()
        .start();
    }

    // r30：睡觉按钮贴底，但按钮顶边必须在主角精灵脚下；不够就整体上移主角。
    const sleepMetrics = Art.buttonMetrics('睡觉', 460, 92);
    const sleepLayout = computeHomeSleepLayout({
      visibleH: UILayout.visibleH,
      safeBottom: UILayout.safeBottom,
      buttonHeight: sleepMetrics.height,
      margin: pxSpacing(28),
      heroCenterY: this.homeHeroPos(this.game.homeLevel).y,
      heroHeight: 96,
      gap: 8,
    });
    // E：若结算卡按 12 设计 px 避让后仍会顶进 HUD，就把睡觉角色下移，
    // 但不越过「角色底边距按钮顶边 8 设计 px」的硬约束。
    let heroCenterY = sleepLayout.heroCenterY;
    const settlementCardH = 700;
    const hudBottomForCard = UILayout.headerY - HUD_HEADER_H;
    const hudCardCap = hudBottomForCard - 10 - settlementCardH / 2;
    const headGap = pxSpacing(12);
    const lowestHeroCenterY = sleepLayout.buttonTop + 8 + 48;
    if (
      heroCenterY + 48 + headGap + settlementCardH / 2 > hudCardCap &&
      heroCenterY > lowestHeroCenterY
    ) {
      heroCenterY = lowestHeroCenterY;
    }
    const heroPos = new Vec3(this.homeHeroPos(this.game.homeLevel).x, heroCenterY, 0);
    if (animateMoveIn) {
      this.playHomeMoveIn(heroPos);
    } else {
      this.addSleepingHero(heroPos);
    }

    // 日结算卡：小像素卡直接叠在住处场景上，不再铺大纸板。
    if (this.game.lastDayReport) {
      this.showSettlementCard(this.game.lastDayReport, heroPos.y + 48);
    }

    // 「睡觉」是全屏最大的主按钮：黑屏过渡后进入次日占卜。
    const sleepBtn = Art.makeSpriteButton('btn_sleep', 'btn_sleep_pressed', '睡觉', 460, 92, () => {
      void this.onSleepPressed();
    }, pxFont(12), { textRect: BTN_SLEEP_TEXT_RECT });
    sleepBtn.parent = this.screenRoot;
    // 给底部页脚底板留出空间，避免「睡觉」压住签名；文字在按钮内部文字区。
    alignBottom(sleepBtn, pxSpacing(28));
    // 不缩放像素按钮，避免 1.03 倍把九宫格边缘拉糊；改用呼吸透明度。
    const sleepOp = sleepBtn.addComponent(UIOpacity);
    tween(sleepOp)
      .to(0.8, { opacity: 220 })
      .to(0.8, { opacity: 255 })
      .union()
      .repeatForever()
      .start();
  }

  /** 三档场景里主角躺的位置（设计坐标，背景 180×320 放大到 720×1280）。 */
  private homeHeroPos(level: number): Vec3 {
    if (level <= 0) return new Vec3(0, -398, 0);
    if (level === 1) return new Vec3(26, -360, 0);
    return new Vec3(72, -414, 0);
  }

  private addSleepingHero(pos: Vec3): Node {
    const hero = Art.makeVisual('hero_sleep', 144, 96, new Color(120, 110, 95, 255));
    hero.parent = this.screenRoot;
    hero.setPosition(pos.x, pos.y, 0);
    Art.play(hero, 'hero_sleep', 3, true);
    return hero;
  }

  /** 升级落脚点后，小人背着包袱从左边走进新家，再躺下睡。 */
  private playHomeMoveIn(target: Vec3): void {
    const mover = Art.makeVisual('hero_move', 96, 96, new Color(150, 135, 110, 255));
    mover.parent = this.screenRoot;
    mover.setPosition(-UILayout.halfW - 40, target.y + 14, 0);
    Art.play(mover, 'hero_move', 8, true);
    tween(mover)
      .to(0.22, { position: new Vec3(-UILayout.halfW * 0.35, target.y + 18, 0) })
      .to(0.22, { position: new Vec3(target.x, target.y, 0) })
      .call(() => {
        if (!mover || !mover.isValid) return;
        mover.destroy();
        this.addSleepingHero(target);
        Fx.floatText(this.screenRoot, '搬进新家', new Vec3(target.x, target.y + 82, 0), new Color(255, 220, 120, 255));
      })
      .start();
  }

  private showSettlementCard(report: DayReport, heroTop?: number): void {
    const cardW = 520;
    const cardH = 700;
    const card = Art.makeVisual('settle_card', cardW, cardH, new Color(238, 226, 196, 255), '结算');
    card.parent = this.screenRoot;
    // 卡片顶边压在 HUD 下方；特殊刘海/胶囊屏自动下移，避免盖住三条状态栏。
    const hudBottom = UILayout.headerY - HUD_HEADER_H;
    // E：结算卡底边离睡觉人头（精灵顶边）至少 12 设计 px；不够就把卡上移，
    // 空间实在不够时允许卡顶轻压 HUD 下沿（HUD 绘制在更上层）。
    const headGap = pxSpacing(12);
    const byHero = heroTop != null ? heroTop + headGap + cardH / 2 : Number.NEGATIVE_INFINITY;
    const hudCap = hudBottom - 10 - cardH / 2;
    const topCap = UILayout.visibleH / 2 - 8 - cardH / 2;
    let cardY = Math.min(60, hudCap);
    if (byHero > cardY) cardY = Math.min(topCap, byHero);
    card.setPosition(0, cardY, 0);
    const cardScale = { t: 0.7 };
    card.setScale(cardScale.t, cardScale.t, 1);
    tween(cardScale)
      .to(0.18, { t: 1 })
      .call(() => {
        if (card && card.isValid) card.setScale(1, 1, 1);
      })
      .start();

    // 九宫格边框内再留一圈内边距：左右文字绝不顶到像素边框/角落装饰。
    const padX = 32;
    const innerW = cardW - padX * 2;
    const innerTop = cardH / 2 - 30;
    const dark = PIXEL_INK_COLOR.clone();

    const titleFit = fitCardText(`第 ${report.day} 天 · ${this.game.homeName}`, {
      maxWidth: innerW,
      maxHeight: 38,
      fontSize: pxFont(12),
      minFontSize: pxFont(12),
      lineGap: 0,
    });
    const title = this.createWorldLabel(
      titleFit.text,
      titleFit.fontSize,
      dark,
      new Vec3(0, innerTop - titleFit.height / 2, 0),
      innerW,
      titleFit.height,
      true,
    );
    this.applyFittedLabel(title, titleFit);
    title.parent = card;

    const bestName = report.bestItem ?? '无';
    const bestValue = report.bestItemId
      ? `${bestName}  ¥\u00A0${(report.bestItemPrice ?? 0).toFixed(2)}`
      : bestName;
    const rows: { icon: string; label: string; value: string }[] = [
      { icon: 'stat_income', label: '今日收入', value: `¥\u00A0${report.income.toFixed(2)}` },
      { icon: report.bestItemId ? `icon_${report.bestItemId}` : 'slot_bag', label: '最离谱', value: bestValue },
      { icon: 'stat_fullness', label: '饱腹剩余', value: `${Math.max(0, Math.round(this.game.hunger))}/${CONFIG.maxHunger}` },
      { icon: 'stat_stamina', label: '体力剩余', value: `${Math.max(0, Math.round(this.game.stamina))}/${this.game.maxStamina}` },
    ];
    const rowYs = [250, 206, 162, 118];
    for (let i = 0; i < rows.length; i++) {
      this.addSettlementRow(card, rows[i].icon, rows[i].label, rows[i].value, rowYs[i], padX);
    }

    // 吐槽单独一行大字，按当天情境从 28 条文案池里轮换。
    // 预排版消除孤字行；文字区在功能格上方，绝不压住底部图标。
    const roastFit = fitCardText(report.roast, {
      maxWidth: innerW - 8,
      maxHeight: 120,
      fontSize: pxFont(12),
      minFontSize: pxFont(12),
      lineGap: 0,
    });
    const roast = this.createWorldLabel(
      roastFit.text,
      roastFit.fontSize,
      new Color(126, 64, 42, 255),
      new Vec3(0, 88 - roastFit.height / 2, 0),
      innerW - 8,
      roastFit.height,
      true,
    );
    this.applyFittedLabel(roast, roastFit);
    roast.parent = card;

    // 三个带图标的功能格：钱不够/满级时用灰色图，下面写「还差 ¥X」。
    const quotes = this.game.homeActionQuotes();
    const tileX = [-160, 0, 160];
    for (let i = 0; i < quotes.length; i++) {
      this.addHomeTile(card, quotes[i], tileX[i] ?? 0, -108);
    }
  }

  private addSettlementRow(card: Node, icon: string, label: string, value: string, y: number, padX: number): void {
    const innerLeft = -260 + padX;
    const innerRight = 260 - padX;
    const iconNode = Art.makeVisual(icon, 32, 32, new Color(185, 170, 145, 255));
    iconNode.parent = card;
    iconNode.setPosition(innerLeft + 16, y, 0);

    // 标签和价值各自用固定内区：左标签从图标右侧开始，右价值贴住内区右边。
    const labelX = innerLeft + 40;
    const labelW = 140;
    const labelNode = this.createWorldLabel(
      label,
      pxFont(12),
      PIXEL_INK_COLOR.clone(),
      new Vec3(labelX + labelW / 2, y, 0),
      labelW,
      34,
      true,
    );
    const labelComp = labelNode.getComponent(Label);
    if (labelComp) {
      labelComp.horizontalAlign = Label.HorizontalAlign.LEFT;
      labelComp.enableWrapText = false;
    }
    labelNode.parent = card;

    const valueW = 300;
    const valueNode = this.createWorldLabel(
      value,
      pxFont(12),
      PIXEL_INK_COLOR.clone(),
      new Vec3(innerRight - valueW / 2, y, 0),
      valueW,
      34,
      true,
    );
    const valueComp = valueNode.getComponent(Label);
    if (valueComp) {
      valueComp.horizontalAlign = Label.HorizontalAlign.RIGHT;
      valueComp.enableWrapText = false;
    }
    valueNode.parent = card;
  }

  /** 把 fitCardText 的预排版结果套到 Label 上：显式换行，不再自动折出孤字。 */
  private applyFittedLabel(node: Node, fit: { fontSize: number; lineHeight: number }): void {
    const label = node.getComponent(Label);
    if (!label) return;
    // fitCardText 只产出整数源像素档字号/行高；这里直接套用，保留 createWorldLabel 的字形档设置。
    label.fontSize = fit.fontSize;
    label.lineHeight = fit.lineHeight;
    label.enableWrapText = false;
    label.overflow = Label.Overflow.CLAMP;
  }

  private addHomeTile(card: Node, quote: HomeActionQuote, x: number, y: number): void {
    const tile = uiNode(`home_tile_${quote.action}`);
    tile.parent = card;
    const ut = tile.addComponent(UITransform);
    ut.setContentSize(144, 144);
    tile.setPosition(x, y, 0);

    const size = 144;
    const iconName = quote.affordable ? quote.icon : quote.grayIcon;
    const iconNode = Art.makeVisual(iconName, size, size, new Color(92, 84, 74, 255));
    iconNode.parent = tile;
    iconNode.setPosition(0, 0, 0);
    if (!quote.affordable) {
      const op = iconNode.getComponent(UIOpacity) ?? iconNode.addComponent(UIOpacity);
      op.opacity = 185;
    }

    const name = this.createWorldLabel(quote.name, pxFont(12), PIXEL_INK_COLOR.clone(), new Vec3(0, -88, 0), 150, 30, true);
    name.parent = tile;

    let hint = `¥${quote.price}`;
    let hintColor = PIXEL_INK_COLOR.clone();
    if (quote.maxed) {
      hint = quote.action === 'home' ? '已最好' : '已满级';
      hintColor = new Color(120, 112, 100, 255);
    } else if (!quote.affordable) {
      hint = quote.shortfallText;
      hintColor = new Color(190, 72, 62, 255);
    }
    const hintNode = this.createWorldLabel(hint, pxFont(12), hintColor, new Vec3(0, -116, 0), 150, 30, true);
    hintNode.parent = tile;

    tile.on(Node.EventType.TOUCH_END, (e: any) => {
      e?.stopPropagation?.();
      this.onHomeAction(quote);
    }, this);
  }

  private onHomeAction(quote: HomeActionQuote): void {
    if (quote.maxed) {
      Fx.floatText(this.screenRoot, quote.action === 'bag' ? '背包已最大' : '已经最好啦', new Vec3(0, -330, 0), new Color(220, 200, 160, 255));
      return;
    }
    if (!quote.affordable) {
      Fx.floatText(this.screenRoot, quote.shortfallText || '钱不够', new Vec3(0, -330, 0), new Color(255, 90, 90, 255));
      return;
    }

    let ok = false;
    let toast = '';
    if (quote.action === 'food') {
      ok = this.game.buyFood();
      toast = '吃饱了';
    } else if (quote.action === 'bag') {
      ok = this.game.expandBag();
      toast = '背包变大';
    } else {
      ok = this.game.upgradeHome();
      toast = '搬进新家';
      if (ok) this.pendingHomeMoveIn = true;
    }
    if (!ok) {
      Fx.floatText(this.screenRoot, '暂时做不了', new Vec3(0, -330, 0), new Color(255, 90, 90, 255));
      return;
    }
    this.refresh();
    Fx.floatText(this.screenRoot, toast, new Vec3(0, -330, 0), new Color(120, 255, 120, 255));
  }

  /** 黑屏过渡：盖满全屏后由逻辑层推进到次日。 */
  private async onSleepPressed(): Promise<void> {
    if (this.sleeping) return;
    this.sleeping = true;
    const fade = uiNode('sleep_fade');
    fade.parent = this.screenRoot;
    const ut = fade.addComponent(UITransform);
    ut.setContentSize(720, 1280);
    fade.setPosition(0, 0, 0);
    const g = fade.addComponent(Graphics);
    g.fillColor = new Color(0, 0, 0, 255);
    g.rect(-360, -640, 720, 1280);
    g.fill();
    const op = fade.addComponent(UIOpacity);
    op.opacity = 0;
    fade.on(Node.EventType.TOUCH_START, (e: any) => e?.stopPropagation?.());
    fade.on(Node.EventType.TOUCH_END, (e: any) => e?.stopPropagation?.());
    fade.setSiblingIndex(this.screenRoot.children.length - 1);

    await new Promise<void>((resolve) => {
      tween(op)
        .to(0.42, { opacity: 255 })
        .call(() => resolve())
        .start();
    });

    this.game.sleep();
    const warm = this.game.lastNightWarmth;
    this.refresh();
    this.sleeping = false;
    if (warm && this.game.phase !== 'lost' && this.game.phase !== 'won') {
      await playNightWarmth(this.screenRoot);
    }
  }

  // -------------------- 倒下 --------------------
  private showCollapsed(): void {
    if (!this.game.lastCollapse) return;
    const collapse = this.game.lastCollapse;
    const bg = Art.makeVisual(`sleep_${collapse.spot}`, 720, 1280, new Color(28, 30, 40, 255), collapse.spotName);
    bg.parent = this.screenRoot;
    bg.setPosition(0, 0, 0);

    // 醒来丢东西的提示直接叠在露宿背景上，不再用大纸板。
    const toastW = Math.min(570, UILayout.visibleW - pxSpacing(12) * 2);
    const toastH = 260;
    const toast = uiNode('collapse_toast');
    toast.parent = this.screenRoot;
    const tut = toast.addComponent(UITransform);
    tut.setContentSize(toastW, toastH);
    const toastY = UILayout.headerY - HUD_HEADER_H - toastH / 2 - 14;
    toast.setPosition(0, toastY, 0);
    const tg = toast.addComponent(Graphics);
    tg.fillColor = new Color(18, 16, 22, 215);
    tg.roundRect(-toastW / 2, -toastH / 2, toastW, toastH, 16);
    tg.fill();
    tg.lineWidth = 3;
    tg.strokeColor = new Color(255, 190, 100, 220);
    tg.roundRect(-toastW / 2, -toastH / 2, toastW, toastH, 16);
    tg.stroke();

    const lost = collapse.lostItems.length > 0 ? collapse.lostItems.join('、') : '什么都没丢';
    const lostText = this.createWorldLabel(
      `在${collapse.spotName}醒来\n丢了：${lost}\n第二天体力：${collapse.staminaNextDay}`,
      pxFont(12),
      new Color(255, 240, 215, 255),
      new Vec3(0, 24, 0),
      toastW - 48,
      120,
    );
    lostText.parent = toast;

    const sub = this.createWorldLabel(
      collapse.text,
      pxFont(12),
      new Color(220, 205, 185, 230),
      new Vec3(0, -78, 0),
      toastW - 48,
      64,
    );
    sub.parent = toast;

    const wakeBtn = this.createButton('醒来', 220, 72, new Vec3(0, 0, 0), () => {
      this.game.wakeUp();
      this.refresh();
    }, pxFont(18));
    wakeBtn.parent = this.screenRoot;
    alignBottom(wakeBtn, 104);
  }

  // -------------------- 失败 --------------------
  private showLost(): void {
    const card = Art.makeCard('card_fail', 1280);
    card.parent = this.screenRoot;
    const hudBottom = UILayout.headerY - HUD_HEADER_H;
    const cardY = Math.min(100, hudBottom - pxSpacing(8) - card.getComponent(UITransform)!.height / 2);
    card.setPosition(0, cardY, 0);
    const content = card.getChildByName('content')!;
    const cut = content.getComponent(UITransform)!;
    const stats = this.game.stats;
    const days = stats.daysSurvived || this.game.day;
    const best = stats.bestItemName || '无';
    const bestText = best === '无'
      ? '无'
      : `${best}（¥\u00A0${stats.bestItemValue.toFixed(2)}）`;
    const btnY = -320;
    // 和日结算卡同样的做法：文字挂在卡片 content 上，只排在米色内区，
    // 左右留内边距避开像素边框，并限制在 HUD 下方、按钮上方。
    const lostBtnH = Math.max(
      Art.buttonMetrics('再来一局', 160, 60).height,
      Art.buttonMetrics('分享', 120, 60).height,
    );
    const box = computeCardTextBox({
      cardW: cut.width,
      cardH: cut.height,
      cardY,
      padXRatio: 0.19,
      padTopRatio: 0.25,
      padBottomRatio: 0.18,
      hudBottom,
      halfW: UILayout.halfW,
      buttonTop: btnY + lostBtnH / 2,
      // r29：失败页文字框放到安全区的 86%，长文案有更多横排空间。
      widthRatio: 0.86,
      safeLeft: UILayout.safeLeft,
      safeRight: UILayout.safeRight,
    });
    this.addReportText(content, [
      '深圳生存失败',
      this.game.deathLine || this.game.deathCause || '你倒在了深圳。',
      '',
      `存活天数：${days} 天`,
      `开箱数：${stats.boxesOpened} 个`,
      `最值钱的货：${bestText}`,
    ], box, true);

    const retryBtn = this.createButton('再来一局', 160, 60, new Vec3(-120, btnY, 0), () => {
      this.dailySpecialShownDay = 0;
      this.game.startGame();
      this.refresh();
    });
    retryBtn.parent = this.screenRoot;

    const shareBtn = this.createButton('分享', 120, 60, new Vec3(120, btnY, 0), () => {
      void this.shareDeathPage();
    });
    shareBtn.parent = this.screenRoot;
  }

  private async shareDeathPage(): Promise<void> {
    const stats = this.game.stats;
    const result = await Share.shareDeath({
      days: stats.daysSurvived || this.game.day,
      boxes: stats.boxesOpened,
      bestItem: stats.bestItemName || '无',
      bestValue: stats.bestItemValue,
      deathLine: this.game.deathLine || this.game.deathCause || '你倒在了深圳。',
    });
    if (result === 'unsupported') {
      Fx.floatText(this.screenRoot, '当前环境不支持分享', new Vec3(0, -400, 0));
    }
  }

  // -------------------- 胜利 --------------------
  private showWon(): void {
    const card = Art.makeCard('card_cert', 1280);
    card.parent = this.screenRoot;
    const hudBottom = UILayout.headerY - HUD_HEADER_H;
    const cardY = Math.min(80, hudBottom - pxSpacing(8) - card.getComponent(UITransform)!.height / 2);
    card.setPosition(0, cardY, 0);
    const content = card.getChildByName('content')!;
    const cut = content.getComponent(UITransform)!;
    const certId = Math.floor(Math.random() * 1e6).toString().padStart(6, '0');
    const dateStr = formatCertDate(new Date());
    const title = this.game.awardedTitle ?? this.game.awardTitle();
    const stats = this.game.stats;
    const best = stats.bestItemName || '无';
    // 认证卡的角落麦穗/花纹比失败卡更占地方，内边距再大一点；
    // 底部按钮用 alignBottom 贴安全区，文字底边按同一个按钮顶边收住。
    const wonBtnH = Math.max(
      Art.buttonMetrics('再来一局', 160, 60).height,
      Art.buttonMetrics('分享', 120, 60).height,
    );
    const box = computeCardTextBox({
      cardW: cut.width,
      cardH: cut.height,
      cardY,
      // 认证卡四角有麦穗/花纹：左右留到 25%，顶部压到上方麦穗以下，
      // 底部也收在内区，避免文字压住下方花纹。
      padXRatio: 0.25,
      padTopRatio: 0.24,
      padBottomRatio: 0.20,
      hudBottom,
      halfW: UILayout.halfW,
      buttonTop: UILayout.bottom + 90 + wonBtnH,
    });
    this.addReportText(content, [
      '深圳生存认证',
      `称号：${title.name}`,
      `编号：${certId}  日期：${dateStr}`,
      `存活天数：${stats.daysSurvived || this.game.day} 天`,
      `开箱数：${stats.boxesOpened} 个`,
      `最值钱的货：${best}${stats.bestItemValue > 0 ? `（¥\u00A0${stats.bestItemValue.toFixed(2)}）` : ''}`,
      `总收入：¥${this.game.totalIncome.toFixed(2)}`,
      `评价：${title.desc}`,
    ], box);

    Fx.confetti(this.screenRoot);

    const retryBtn = this.createButton('再来一局', 160, 60, new Vec3(-90, 0, 0), () => {
      this.dailySpecialShownDay = 0;
      this.game.startGame();
      this.refresh();
    });
    retryBtn.parent = this.screenRoot;
    alignBottom(retryBtn, 90);

    const shareBtn = this.createButton('分享', 120, 60, new Vec3(110, 0, 0), () => {
      void this.shareCertPage(certId, dateStr, title.name, title.desc);
    });
    shareBtn.parent = this.screenRoot;
    alignBottom(shareBtn, 90);
  }

  private async shareCertPage(certId: string, dateStr: string, titleName: string, titleDesc: string): Promise<void> {
    const stats = this.game.stats;
    const result = await Share.shareCert({
      title: titleName,
      titleDesc,
      days: stats.daysSurvived || this.game.day,
      boxes: stats.boxesOpened,
      bestItem: stats.bestItemName || '无',
      bestValue: stats.bestItemValue,
      totalIncome: this.game.totalIncome,
      certId,
      date: dateStr,
    });
    if (result === 'unsupported') {
      Fx.floatText(this.screenRoot, '当前环境不支持分享', new Vec3(0, -420, 0));
    }
  }

  // -------------------- 工具 --------------------
  private createWorldLabel(
    text: string,
    fontSize: number,
    color: Color,
    pos: Vec3,
    width: number,
    height: number,
    lightPanel: boolean = false,
  ): Node {
    const node = uiNode('label');
    const ut = node.addComponent(UITransform);
    ut.setContentSize(width, height);
    node.setPosition(pos.x, pos.y, pos.z || 0);
    const label = node.addComponent(Label);
    label.string = text;
    label.fontSize = fontSize;
    label.lineHeight = fontSize;
    label.color = color;
    label.horizontalAlign = Label.HorizontalAlign.CENTER;
    label.verticalAlign = Label.VerticalAlign.CENTER;
    label.overflow = Label.Overflow.CLAMP;
    // 所有 createWorldLabel 调用方都传已断好的显式换行文本；
    // 关闭 Label 自带换行，避免它绕过分词器再次按字折断。
    label.enableWrapText = false;
    PixelFont.apply(label, { color, bg: lightPanel ? 'light' : 'dark' });
    return node;
  }

  private createButton(text: string, w: number, h: number, pos: Vec3, onClick: () => void, fontSize?: number): Node {
    const btn = Art.makeButton(text, w, h, onClick, fontSize);
    btn.setPosition(pos.x, pos.y, pos.z || 0);
    return btn;
  }

  /** 日结算卡：左对齐、每项一行，按卡片内部宽度自动换行；传 box 时在固定区域内自动缩小字号。 */
  private addReportText(
    parent: Node,
    lines: string[],
    box?: ReportTextBox,
    darkPlate: boolean = false,
  ): void {
    const width = box?.width ?? 600;
    const maxHeight = box?.height ?? 1000;
    // 和结算卡同一套预排版：显式换行、消除孤字行，字号/行高只落在整数源像素档。
    const fit = fitCardText(lines.join('\n'), {
      maxWidth: width,
      maxHeight,
      fontSize: pxFont(12),
      minFontSize: pxFont(12),
      lineGap: 0,
    });

    // 失败卡底图是灰色石纹，浅描边会发灰。加一块半透明深色底板，
    // 再配整数源像素档像素字，保证正文和统计行都有足够对比度。
    if (darkPlate && box) {
      const platePad = 6;
      const plateW = box.width + platePad * 2;
      const plateH = fit.height + platePad * 2;
      const plate = uiNode('report_text_plate');
      plate.parent = parent;
      const put = plate.addComponent(UITransform);
      put.setContentSize(plateW, plateH);
      plate.setPosition(box.left + box.width / 2, box.top - fit.height / 2, 0);
      const pg = plate.addComponent(Graphics);
      pg.fillColor = new Color(18, 16, 22, 205);
      pg.roundRect(-plateW / 2, -plateH / 2, plateW, plateH, 10);
      pg.fill();
      pg.lineWidth = 1;
      pg.strokeColor = new Color(255, 235, 190, 70);
      pg.roundRect(-plateW / 2, -plateH / 2, plateW, plateH, 10);
      pg.stroke();
    }

    const textColor = darkPlate
      ? new Color(248, 242, 222, 255)
      : PIXEL_INK_COLOR.clone();
    const node = uiNode('report_text');
    node.parent = parent;
    const ut = node.addComponent(UITransform);
    ut.setContentSize(width, box?.height ?? fit.height);
    ut.setAnchorPoint(0, 1);
    node.setPosition(box?.left ?? -300, box?.top ?? 350, 0);
    const label = node.addComponent(Label);
    label.string = fit.text;
    label.fontSize = fit.fontSize;
    label.lineHeight = fit.lineHeight;
    label.color = textColor;
    label.horizontalAlign = Label.HorizontalAlign.LEFT;
    label.verticalAlign = Label.VerticalAlign.TOP;
    label.overflow = box ? Label.Overflow.CLAMP : Label.Overflow.RESIZE_HEIGHT;
    label.enableWrapText = false;
    PixelFont.apply(label, {
      size: fit.fontSize,
      lineHeight: fit.lineHeight,
      color: textColor,
      bg: darkPlate ? 'dark' : 'light',
    });
  }

  private addCardText(parent: Node, fontSize: number, lines: string[], color: Color): void {
    const textNode = this.createWorldLabel(lines.join('\n'), fontSize, color, Vec3.ZERO, 520, 400);
    textNode.parent = parent;
    textNode.setPosition(0, 0, 0);
  }

  /** 体力/饱腹双低时用喘气或捂肚子，否则站立 idle。 */
  private heroArtName(): string {
    if (!this.game) return 'hero_idle';
    const staminaRatio = this.game.maxStamina > 0 ? this.game.stamina / this.game.maxStamina : 0;
    const hungerRatio = CONFIG.maxHunger > 0 ? this.game.hunger / CONFIG.maxHunger : 0;
    if (staminaRatio < CONFIG.uiLowRatio && hungerRatio < CONFIG.uiLowRatio) {
      return staminaRatio <= hungerRatio ? 'hero_pant' : 'hero_hungry';
    }
    return 'hero_idle';
  }

  private locationName(id: string): string {
    const loc = LOCATIONS.find(l => l.id === id);
    return loc ? loc.name : id;
  }
}