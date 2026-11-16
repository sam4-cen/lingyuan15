import {
  _decorator,
  Component,
  Node,
  Label,
  Graphics,
  Color,
  UITransform,
  Sprite,
  SpriteFrame,
  ImageAsset,
  Texture2D,
  Button,
  resources,
  assetManager,
  AssetManager,
} from 'cc';
import { ART_ALIAS, ICON_MAP } from './ArtMap';
import { bgImageCandidates, bgSpriteFrameCandidates } from './BgAssetPath';
import { uiNode } from './UI';
import { PixelFont, PIXEL_INK_COLOR, PixelFontBackground } from './PixelFont';
import { buttonMinTouchHeight, buttonPaddingX, buttonPaddingY, lineHeightForFontSize, measurePixelTextWidth, pxFont, pxSpacing } from './PixelFontMetrics';
import { fitCardText } from './CardTextLayout';
import { computeSleepTextLayout, SleepSourceRect } from './SleepButtonLayout';

const { ccclass } = _decorator;

const ART_ROOT = 'art';
const DEFAULT_FPS = 10;

/** 文件名自然排序（0.png, 1.png, ... 10.png 不会排到 2 前面） */
function compareNames(a: string, b: string): number {
  if (a === b) return 0;
  const pa = a.replace(/\d+/g, '#');
  const pb = b.replace(/\d+/g, '#');
  if (pa !== pb) return pa < pb ? -1 : 1;
  const na = a.match(/\d+/g);
  const nb = b.match(/\d+/g);
  if (na && nb && na.length > 0 && nb.length > 0) {
    const len = Math.min(na.length, nb.length);
    for (let i = 0; i < len; i++) {
      const x = parseInt(na[i], 10);
      const y = parseInt(nb[i], 10);
      if (x !== y) return x - y;
    }
    if (na.length !== nb.length) return na.length - nb.length;
  }
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * 挂在节点上的简易序列帧播放器，支持循环起点。
 */
@ccclass('ArtSpritePlayer')
export class ArtSpritePlayer extends Component {
  private _frames: SpriteFrame[] = [];
  private _fps: number = DEFAULT_FPS;
  private _loop: boolean = true;
  private _loopFrom: number = 0;
  private _index: number = 0;
  private _sprite: Sprite | null = null;

  public setFrames(
    frames: SpriteFrame[],
    fps: number = DEFAULT_FPS,
    loop: boolean = true,
    loopFrom: number = 0,
  ): void {
    this._frames = frames && frames.length > 0 ? frames.slice() : [];
    const f = Math.floor(fps);
    this._fps = f > 0 ? f : DEFAULT_FPS;
    this._loop = loop;
    this._loopFrom = Math.max(0, Math.min(loopFrom, Math.max(0, this._frames.length - 1)));
    this._index = 0;
    this.applyFrame();
    this.restartSchedule();
  }

  public get frameCount(): number {
    return this._frames.length;
  }

  protected onEnable(): void {
    this.restartSchedule();
  }

  protected onDisable(): void {
    this.unschedule(this.tick);
  }

  private ensureSprite(): Sprite | null {
    if (!this._sprite || !this._sprite.isValid) {
      this._sprite = this.getComponent(Sprite);
    }
    return this._sprite;
  }

  private applyFrame(): void {
    const sp = this.ensureSprite();
    if (!sp) return;
    sp.spriteFrame =
      this._frames.length > 0
        ? this._frames[Math.min(this._index, this._frames.length - 1)]
        : null;
  }

  private restartSchedule(): void {
    this.unschedule(this.tick);
    if (!this.node || !this.node.activeInHierarchy) return;
    if (this._frames.length <= 1) return;
    this.schedule(this.tick, 1 / this._fps);
  }

  private tick(): void {
    if (this._frames.length <= 1) return;
    this._index++;
    if (this._index >= this._frames.length) {
      if (this._loop) {
        this._index = this._loopFrom;
      } else {
        this._index = this._frames.length - 1;
        this.unschedule(this.tick);
        this.applyFrame();
        return;
      }
    }
    this.applyFrame();
  }
}

/**
 * 表现层素材工具。
 * 所有 art 资源都是可选的：没有序列帧时一律退化成纯色块 + 文字占位。
 */
export class Art {
  private static _preloaded: boolean = false;
  private static _bgLoaded: boolean = false;
  private static _resFramesCache: Map<string, SpriteFrame[]> = new Map();
  private static _bgFramesCache: Map<string, SpriteFrame> = new Map();
  private static _bgSeriesCache: Map<string, SpriteFrame[]> = new Map();
  private static _missing: Set<string> = new Set();
  private static _bgWaiters: { name: string; node: Node }[] = [];

  /** 预加载 resources/art 下所有 SpriteFrame，并后台加载背景 bundle。 */
  public static async preload(): Promise<void> {
    if (Art._preloaded) return;
    Art._preloaded = true;

    // 1. 加载 resources/art 下所有 SpriteFrame
    try {
      await new Promise<void>((resolve) => {
        try {
          resources.loadDir(ART_ROOT, SpriteFrame, (err: Error | null, assets: SpriteFrame[]) => {
            // 即使有单张图失败，也把已导入的帧收集起来
            Art.collectResFrames(assets);
            resolve();
          });
        } catch (e) {
          resolve();
        }
      });
    } catch (e) {
      // ignore
    }

    // 2. 设置纹理过滤与九宫格 insets
    Art.applyFiltersAndInsets();

    // 3. 后台加载背景 bundle
    await Art.loadBackgrounds();
  }

  /** 获取逻辑名对应的序列帧（bg/icon 映射到正确路径）。无素材返回空数组。 */
  public static frames(name: string): SpriteFrame[] {
    if (!name) return [];

    // icon_<itemId>（若同名 alias 已登记，例如 r9 的 icon_lock_16，则走下面的 alias 分支）
    if (!ART_ALIAS[name] && name.startsWith('icon_')) {
      const itemId = name.slice(5);
      const iconName = ICON_MAP[itemId];
      if (!iconName) {
        Art.recordMissing(name);
        return [];
      }
      const key = `icons/${iconName}`;
      const list = Art._resFramesCache.get(key);
      if (list && list.length > 0) return list;
      if (Art._preloaded) Art.recordMissing(name);
      return [];
    }

    // bg_<locationId> 等单张背景
    if (name.startsWith('bg_')) {
      const alias = ART_ALIAS[name];
      if (!alias || alias.src !== 'bg') {
        Art.recordMissing(name);
        return [];
      }
      const sf = Art._bgFramesCache.get(alias.path);
      if (sf) return [sf];
      if (Art._bgLoaded) Art.recordMissing(name);
      return [];
    }

    // 普通逻辑名（res / bg，bg 可能是单张或序列帧）
    const alias = ART_ALIAS[name];
    if (alias) {
      if (alias.src === 'res') {
        const list = Art._resFramesCache.get(alias.path);
        if (list && list.length > 0) return list;
        if (Art._preloaded) Art.recordMissing(name);
        return [];
      }
      const series = Art._bgSeriesCache.get(alias.path);
      if (series && series.length > 0) return series;
      const single = Art._bgFramesCache.get(alias.path);
      if (single) return [single];
      if (Art._bgLoaded) Art.recordMissing(name);
      return [];
    }

    // 兼容：直接尝试用原名作为素材目录
    const legacy = Art._resFramesCache.get(name);
    if (legacy && legacy.length > 0) return legacy;
    if (Art._preloaded) Art.recordMissing(name);
    return [];
  }

  /** 取某个逻辑名的第一帧（没有素材返回 null）。 */
  public static firstFrame(name: string): SpriteFrame | null {
    const frames = Art.frames(name);
    return frames.length > 0 ? frames[0] : null;
  }

  /**
   * 通用可视占位：有序列帧 -> Sprite 自动循环播放；
   * 否则 -> 纯色块 + 中文文字。背景未加载完时先占位，加载完自动替换。
   */
  public static makeVisual(
    name: string,
    w: number,
    h: number,
    color: Color,
    label?: string,
  ): Node {
    const width = Math.max(1, Math.round(w));
    const height = Math.max(1, Math.round(h));
    const node = uiNode(name || 'visual');
    const ut = node.addComponent(UITransform);
    ut.setContentSize(width, height);

    const frames = Art.frames(name);
    if (frames.length > 0) {
      Art.applySpriteToNode(node, name, frames);
      return node;
    }

    // 背景尚未加载完成？
    const alias = ART_ALIAS[name];
    if (alias && alias.src === 'bg' && !Art._bgLoaded) {
      // 先画占位，等背景加载完成后再替换
      Art.drawPlaceholder(node, width, height, color, label);
      Art._bgWaiters.push({ name, node });
      return node;
    }

    // 普通占位
    Art.drawPlaceholder(node, width, height, color, label);
    return node;
  }

  /** 切换节点的序列帧播放；目标名字没有帧时 no-op。 */
  public static play(
    node: Node,
    name: string,
    fps: number = DEFAULT_FPS,
    loop: boolean = true,
  ): void {
    if (!node || !node.isValid) return;
    const frames = Art.frames(name);
    if (frames.length === 0) return;

    const alias = ART_ALIAS[name];
    const loopFrom = alias?.loopFrom ?? 0;
    Art.applySpriteToNode(node, name, frames, fps, loop, loopFrom);
  }

  /**
   * 创建卡片节点：高度 = parentH * 0.7，宽 = 高 * 0.75，水平居中。
   * 底图为卡片素材，上面挂 content 子节点。
   */
  public static makeCard(
    kind: 'card_fail' | 'card_cert',
    parentH: number,
  ): Node {
    const cardH = Math.max(100, parentH * 0.7);
    const cardW = cardH * 0.75;
    const node = uiNode(kind);
    const ut = node.addComponent(UITransform);
    ut.setContentSize(cardW, cardH);

    const frames = Art.frames(kind);
    if (frames.length > 0) {
      Art.applySpriteToNode(node, kind, frames);
    } else {
      const cardLabels: Record<string, string> = {
        card_fail: '倒霉卡',
        card_cert: '通关证书',
      };
      // 占位标题贴在卡片顶部，不能像普通占位那样居中压住正文/「总收入」行。
      Art.drawPlaceholder(node, cardW, cardH, new Color(220, 220, 220, 255));
      const titleNode = uiNode('card_fallback_title');
      const titleUt = titleNode.addComponent(UITransform);
      titleUt.setContentSize(cardW, 48);
      titleNode.setPosition(0, cardH / 2 - 46, 0);
      const titleLabel = titleNode.addComponent(Label);
      titleLabel.string = cardLabels[kind] ?? '卡片';
      const titleSize = pxFont(18);
      titleLabel.fontSize = titleSize;
      titleLabel.lineHeight = titleSize;
      titleLabel.horizontalAlign = Label.HorizontalAlign.CENTER;
      titleLabel.verticalAlign = Label.VerticalAlign.CENTER;
      titleLabel.overflow = Label.Overflow.CLAMP;
      titleLabel.enableWrapText = false;
      titleLabel.color = PIXEL_INK_COLOR.clone();
      PixelFont.apply(titleLabel, { color: PIXEL_INK_COLOR.clone(), bg: 'light' });
      titleNode.setParent(node);
    }

    // 文字内容子节点
    const content = uiNode('content');
    const cut = content.addComponent(UITransform);
    cut.setContentSize(cardW, cardH);
    content.setParent(node);
    content.setPosition(0, 0, 0);
    return node;
  }

  /**
   * r26：所有按钮文字统一回到正文 k 档，并按「文字 + 四边内边距」定尺寸。
   * 传进来的 w/h 只作为最小值，布局不会因为按钮文字变长而被裁掉。
   */
  public static buttonMetrics(
    text: string,
    minW: number = 0,
    minH: number = 0,
  ): { width: number; height: number; fontSize: number; lineHeight: number; padX: number; padY: number } {
    const fontSize = pxFont(12);
    const lineHeight = lineHeightForFontSize(fontSize);
    const padX = buttonPaddingX();
    const padY = buttonPaddingY();
    const textW = measurePixelTextWidth(text, fontSize);
    const width = Math.ceil(Math.max(1, minW, textW + padX * 2));
    const height = Math.ceil(Math.max(1, minH, lineHeight + padY * 2, buttonMinTouchHeight()));
    return { width, height, fontSize, lineHeight, padX, padY };
  }

  /** 创建九宫格按钮，按下时切换素材。无素材时退化为色块按钮。 */
  public static makeButton(
    text: string,
    w: number,
    h: number,
    onClick: () => void,
    fontSize?: number,
    bg: PixelFontBackground = 'light',
  ): Node {
    const metrics = Art.buttonMetrics(text, w, h);
    w = metrics.width;
    h = metrics.height;
    const node = uiNode('button');
    const ut = node.addComponent(UITransform);
    ut.setContentSize(w, h);

    const normalFrames = Art.frames('button');
    const pressedFrames = Art.frames('button_pressed');

    let sprite: Sprite | null = null;
    if (normalFrames.length > 0 && pressedFrames.length > 0) {
      Art.applySpriteToNode(node, 'button', normalFrames);
      sprite = node.getComponent(Sprite);
      if (sprite) {
        sprite.type = Sprite.Type.SLICED;
      }
      const btn = node.addComponent(Button);
      btn.transition = Button.Transition.SPRITE;
      btn.normalSprite = normalFrames[0];
      btn.pressedSprite = pressedFrames[0];
    } else {
      // 色块按钮
      const g = node.addComponent(Graphics);
      const col = new Color(90, 90, 100, 255);
      g.fillColor = col;
      g.rect(-w / 2, -h / 2, w, h);
      g.fill();
      const btn = node.addComponent(Button);
      btn.transition = Button.Transition.COLOR;
      btn.normalColor = col;
      btn.pressedColor = new Color(60, 60, 70, 255);
    }

    // 文字
    const labelNode = uiNode('label');
    const lUt = labelNode.addComponent(UITransform);
    lUt.setContentSize(w, h);
    const lb = labelNode.addComponent(Label);
    const buttonFit = fitCardText(text, {
      maxWidth: Math.max(1, w - metrics.padX * 2),
      maxHeight: Math.max(1, h - metrics.padY * 2),
      fontSize: metrics.fontSize,
      minFontSize: metrics.fontSize,
      lineGap: 0,
    });
    lb.string = buttonFit.text;
    lb.fontSize = buttonFit.fontSize;
    lb.lineHeight = buttonFit.lineHeight;
    lb.horizontalAlign = Label.HorizontalAlign.CENTER;
    lb.verticalAlign = Label.VerticalAlign.CENTER;
    lb.overflow = Label.Overflow.CLAMP;
    lb.enableWrapText = false;
    const labelColor = bg === 'dark' ? new Color(255, 248, 230, 255) : PIXEL_INK_COLOR.clone();
    lb.color = labelColor;
    PixelFont.apply(lb, {
      size: buttonFit.fontSize,
      lineHeight: buttonFit.lineHeight,
      color: labelColor,
      bg: bg,
    });
    labelNode.setParent(node);
    labelNode.setPosition(0, 0, 0);

    node.on(Button.EventType.CLICK, () => {
      onClick();
    });

    return node;
  }

  /**
   * 用指定美术（如 btn_sleep / btn_sleep_pressed）创建九宫格按钮。
   * 素材缺失时退化成 makeButton 的普通按钮，保证代码先能跑。
   *
   * labelBelow=true 时按钮根节点会向下加高：美术保持原始高度贴在上方，
   * 文字单独放在美术下方，避免「睡觉」压在月亮和床之间。按下态共用同一套排版。
   *
   * r29：textRect（源像素）用于新版 btn_sleep：文字放在按钮图内部右侧、
   * 不与左侧月亮重叠；按下态文字跟随下移 2 源像素。
   */
  public static makeSpriteButton(
    artName: string,
    pressedArtName: string,
    text: string,
    w: number,
    h: number,
    onClick: () => void,
    fontSize?: number,
    options: { labelBelow?: boolean; textRect?: SleepSourceRect } = {},
  ): Node {
    const normalFrames = Art.frames(artName);
    const pressedFrames = Art.frames(pressedArtName);
    if (normalFrames.length === 0) {
      return Art.makeButton(text, w, h, onClick, fontSize);
    }

    const metrics = Art.buttonMetrics(text, w, h);
    const artW = metrics.width;
    const artH = metrics.height;
    const labelBelow = options.labelBelow === true;
    const textRect = options.textRect;
    const labelH = labelBelow ? Math.ceil(lineHeightForFontSize(metrics.fontSize)) : 0;
    const labelGap = pxSpacing(2);
    const rootW = artW;
    const rootH = labelBelow ? artH + labelH + labelGap : artH;

    const node = uiNode('button');
    const ut = node.addComponent(UITransform);
    ut.setContentSize(rootW, rootH);

    // 文字在下方 / 按钮内文字区：美术放进子节点。r29 新版 btn_sleep 是
    // 117×24 的整图（月亮在左），先按源尺寸建 9 宫格再整体缩放到目标尺寸，
    // 这样月亮和 BTN_SLEEP_TEXT_RECT 使用同一套源像素坐标，不会各缩各的。
    let artNode: Node = node;
    if (labelBelow || textRect) {
      artNode = uiNode('button_art');
      artNode.parent = node;
      const artUt = artNode.addComponent(UITransform);
      const srcSize = normalFrames[0]?.originalSize;
      const srcW = Math.max(1, srcSize?.width ?? artW);
      const srcH = Math.max(1, srcSize?.height ?? artH);
      artUt.setContentSize(srcW, srcH);
      artNode.setScale(artW / srcW, artH / srcH, 1);
      artNode.setPosition(0, (rootH - artH) / 2, 0);
    }
    Art.applySpriteToNode(artNode, artName, normalFrames);
    const sprite = artNode.getComponent(Sprite);
    const alias = ART_ALIAS[artName];
    if (sprite && alias?.insets) sprite.type = Sprite.Type.SLICED;

    // 点击热区用根节点（含文字区域），按下态换图作用在美术子节点/根节点上。
    const btn = node.addComponent(Button);
    btn.target = artNode;
    if (pressedFrames.length > 0) {
      btn.transition = Button.Transition.SPRITE;
      btn.normalSprite = normalFrames[0];
      btn.pressedSprite = pressedFrames[0];
    } else {
      btn.transition = Button.Transition.NONE;
    }

    const textBox = textRect ? computeSleepTextLayout(artW, artH, textRect) : null;
    const labelNode = uiNode('label');
    const lUt = labelNode.addComponent(UITransform);
    lUt.setContentSize(
      textBox ? textBox.width : rootW,
      textBox ? textBox.height : labelBelow ? labelH : rootH,
    );
    const lb = labelNode.addComponent(Label);
    const buttonFit = fitCardText(text, {
      maxWidth: Math.max(1, textBox ? textBox.width : rootW - metrics.padX * 2),
      maxHeight: Math.max(1, textBox ? textBox.height : labelBelow ? labelH : rootH - metrics.padY * 2),
      fontSize: metrics.fontSize,
      minFontSize: metrics.fontSize,
      lineGap: 0,
    });
    lb.string = buttonFit.text;
    lb.fontSize = buttonFit.fontSize;
    lb.lineHeight = buttonFit.lineHeight;
    lb.horizontalAlign = Label.HorizontalAlign.CENTER;
    lb.verticalAlign = Label.VerticalAlign.CENTER;
    lb.overflow = Label.Overflow.CLAMP;
    lb.enableWrapText = false;
    const labelColor = new Color(255, 248, 230, 255);
    lb.color = labelColor;
    PixelFont.apply(lb, {
      size: buttonFit.fontSize,
      lineHeight: buttonFit.lineHeight,
      color: labelColor,
      bg: 'dark',
    });
    labelNode.setParent(node);
    const normalX = textBox ? textBox.centerX : 0;
    const normalY = textBox
      ? textBox.centerY
      : labelBelow
        ? -rootH / 2 + labelH / 2 + labelGap / 2
        : 0;
    labelNode.setPosition(normalX, normalY, 0);

    if (textBox) {
      // 按下态：文字跟着按钮图下移 2 源像素（不影响普通按钮）。
      const press = () => labelNode.setPosition(normalX + textBox.pressedOffsetX, normalY + textBox.pressedOffsetY, 0);
      const release = () => labelNode.setPosition(normalX, normalY, 0);
      node.on(Node.EventType.TOUCH_START, press);
      node.on(Node.EventType.TOUCH_END, release);
      node.on(Node.EventType.TOUCH_CANCEL, release);
    }

    node.on(Button.EventType.CLICK, () => {
      onClick();
    });
    return node;
  }

  /** 代码绘制背包单个格子。 */
  public static drawCell(
    g: Graphics,
    x: number,
    y: number,
    size: number,
    state: 'normal' | 'hover' | 'bad' | 'filled',
    badAlpha: number = 1,
  ): void {
    const half = size / 2;
    // 普通格是深色底；bad 时整格填红，而不只是描边
    const alpha = Math.max(0, Math.min(1, badAlpha));
    if (state === 'bad') {
      g.fillColor = new Color(190, 42, 42, Math.round(200 * alpha));
    } else if (state === 'filled') {
      g.fillColor = new Color(52, 52, 58, 255);
    } else {
      g.fillColor = new Color(45, 45, 50, 255);
    }
    g.rect(x - half, y - half, size, size);
    g.fill();

    g.lineWidth = 2;
    let strokeColor: Color;
    switch (state) {
      case 'hover':
        strokeColor = new Color(255, 220, 80, 255);
        break;
      case 'bad':
        strokeColor = new Color(255, 90, 90, Math.round(255 * alpha));
        break;
      case 'filled':
        strokeColor = new Color(180, 180, 200, 255);
        break;
      case 'normal':
      default:
        strokeColor = new Color(160, 160, 170, 255);
        break;
    }
    g.strokeColor = strokeColor;
    g.rect(x - half, y - half, size, size);
    g.stroke();
  }

  /** 返回本次运行中被请求但没有素材、走了占位的逻辑名（去重）。 */
  public static missing(): string[] {
    return Array.from(Art._missing);
  }

  // ------------------------------------------------------------------
  // 内部方法
  // ------------------------------------------------------------------

  private static recordMissing(name: string): void {
    Art._missing.add(name);
  }

  private static drawPlaceholder(
    node: Node,
    width: number,
    height: number,
    color: Color,
    label?: string,
  ): void {
    const base = color ? color.clone() : new Color(200, 200, 200, 255);
    const g = node.addComponent(Graphics);
    g.fillColor = base;
    g.rect(-width / 2, -height / 2, width, height);
    g.fill();
    g.lineWidth = Math.max(1, Math.round(Math.min(width, height) * 0.05));
    g.strokeColor = new Color(0, 0, 0, 90);
    g.stroke();

    if (label != null && label !== '') {
      const ln = uiNode('ph_label');
      const lut = ln.addComponent(UITransform);
      lut.setContentSize(width, height);
      const lb = ln.addComponent(Label);
      const fs = pxFont(12);
      const phFit = fitCardText(label, {
        maxWidth: Math.max(1, width - pxFont(4)),
        maxHeight: Math.max(1, height - pxFont(4)),
        fontSize: fs,
        minFontSize: fs,
        lineGap: 0,
      });
      lb.string = phFit.text;
      lb.fontSize = phFit.fontSize;
      lb.lineHeight = phFit.lineHeight;
      lb.horizontalAlign = Label.HorizontalAlign.CENTER;
      lb.verticalAlign = Label.VerticalAlign.CENTER;
      lb.overflow = Label.Overflow.CLAMP;
      lb.enableWrapText = false;
      const lum = 0.299 * base.r + 0.587 * base.g + 0.114 * base.b;
      const color = lum > 150 ? new Color(25, 25, 28, 255) : new Color(248, 248, 248, 255);
      lb.color = color;
      PixelFont.apply(lb, {
        size: phFit.fontSize,
        lineHeight: phFit.lineHeight,
        color,
        bg: lum > 150 ? 'light' : 'dark',
      });
      ln.setParent(node);
      ln.setPosition(0, 0, 0);
    }
  }

  private static applySpriteToNode(
    node: Node,
    name: string,
    frames: SpriteFrame[],
    fps?: number,
    loop?: boolean,
    loopFrom?: number,
  ): void {
    if (!node || !node.isValid || frames.length === 0) return;

    // 隐藏占位元素
    const g = node.getComponent(Graphics);
    if (g) g.enabled = false;
    const label = node.getChildByName('ph_label');
    if (label) label.active = false;

    let sp = node.getComponent(Sprite);
    if (!sp) {
      sp = node.addComponent(Sprite);
    }
    sp.sizeMode = Sprite.SizeMode.CUSTOM;
    const alias = ART_ALIAS[name];
    if (alias?.insets) {
      sp.type = Sprite.Type.SLICED;
    } else {
      sp.type = Sprite.Type.SIMPLE;
    }
    // 注意：这里假设 UITransform 已经存在并设置了尺寸
    // 如果没有，makeVisual 里已设置；play 升级的节点一般也有了

    const effectiveFps = fps || DEFAULT_FPS;
    const effectiveLoop = loop ?? true;
    const effectiveLoopFrom = loopFrom ?? alias?.loopFrom ?? 0;

    let player = node.getComponent(ArtSpritePlayer);
    if (!player) {
      player = node.addComponent(ArtSpritePlayer);
    }
    player.setFrames(frames, effectiveFps, effectiveLoop, effectiveLoopFrom);
  }

  /** 从已加载的 resources/art 资源中归类缓存。 */
  private static collectResFrames(loaded?: SpriteFrame[]): void {
    Art._resFramesCache.clear();
    const buckets: Map<string, { key: string; sf: SpriteFrame }[]> = new Map();
    let infos: any[] = [];
    try {
      const got = (resources as any).getDirWithPath(ART_ROOT, SpriteFrame) as any[];
      if (got && got.length > 0) infos = got;
    } catch (e) {
      infos = [];
    }

    for (let i = 0; i < infos.length; i++) {
      const info: any = infos[i];
      if (!info) continue;
      const rawPath: string = info.path || info.url || '';
      if (!rawPath) continue;

      const segs = rawPath.split('/');
      let parts = segs;
      const tail = parts[parts.length - 1];
      if (tail === 'spriteFrame' || tail === 'texture') {
        parts = parts.slice(0, parts.length - 1);
      }

      if (parts.length < 3) continue; // 至少 art/xxx/file

      const artIdx = parts.indexOf(ART_ROOT);
      if (artIdx === -1) continue; // 不在 art 目录下
      const relParts = parts.slice(artIdx + 1); // 相对 art/ 的路径段
      if (relParts.length < 2) continue; // 至少有一个目录和文件

      let name: string;
      let file: string;
      if (relParts.length === 2) {
        // 目录/文件 或 子目录/文件（如 icons/plastic_bottle）
        const dirName = relParts[0];
        file = relParts[1];
        if (dirName === 'icons' || dirName === 'share') {
          // 这些目录下每张图是独立资源：<dir>/<filename>
          name = `${dirName}/${file}`;
        } else {
          name = dirName;
        }
      } else if (relParts.length > 2) {
        // 多级目录，暂时只取最后一级目录名作为 key
        name = relParts[relParts.length - 2];
        file = relParts[relParts.length - 1];
      } else {
        continue;
      }

      // 图片导入类型是 sprite-frame 时，子资源路径是 .../xxx/spriteFrame
      let sf: SpriteFrame | null = null;
      const candidates: string[] = [];
      if (rawPath.endsWith('/spriteFrame')) {
        candidates.push(rawPath);
      } else {
        candidates.push(`${rawPath}/spriteFrame`);
        candidates.push(rawPath);
      }
      for (const path of candidates) {
        try {
          sf = resources.get(path, SpriteFrame) as SpriteFrame | null;
        } catch (e) {
          sf = null;
        }
        if (sf) break;
      }
      if (!sf) {
        // 尝试直接使用 info.asset
        sf = info.asset as SpriteFrame | null;
      }
      if (!sf) continue;

      let arr = buckets.get(name);
      if (!arr) {
        arr = [];
        buckets.set(name, arr);
      }
      arr.push({ key: file, sf });
    }

    buckets.forEach((arr: { key: string; sf: SpriteFrame }[], name: string) => {
      arr.sort((a, b) => compareNames(a.key, b.key));
      const frames: SpriteFrame[] = [];
      for (let i = 0; i < arr.length; i++) frames.push(arr[i].sf);
      if (frames.length > 0) Art._resFramesCache.set(name, frames);
    });
  }

  /** 给单帧应用九宫格 insets。 */
  private static applyInsets(sf: SpriteFrame, insets: [number, number, number, number]): void {
    const [l, r, t, b] = insets;
    sf.insetLeft = l;
    sf.insetRight = r;
    sf.insetTop = t;
    sf.insetBottom = b;
  }

  /** 设置纹理过滤与九宫格 insets。 */
  private static applyFiltersAndInsets(): void {
    // 设置所有 res SpriteFrame 的 filter
    Art._resFramesCache.forEach((frames: SpriteFrame[]) => {
      frames.forEach((sf: SpriteFrame) => {
        if (sf.texture) {
          const tex = sf.texture as Texture2D;
          tex.setFilters(Texture2D.Filter.NEAREST, Texture2D.Filter.NEAREST);
          tex.setMipFilter(Texture2D.Filter.NONE);
          (tex as any).premultiplyAlpha = false;
        }
      });
    });

    // 根据 ART_ALIAS 设置 insets
    for (const [name, alias] of Object.entries(ART_ALIAS)) {
      if (alias.src !== 'res' || !alias.insets) continue;
      const frames = Art._resFramesCache.get(alias.path);
      if (!frames || frames.length === 0) continue;
      frames.forEach((sf: SpriteFrame) => Art.applyInsets(sf, alias.insets!));
    }
  }

  /** 加载背景 bundle 并缓存所有背景 / 地图图标 / 地点 NPC 序列帧。 */
  private static async loadBackgrounds(): Promise<void> {
    return new Promise<void>((resolve) => {
      assetManager.loadBundle('bg', (err: Error | null, bundle: AssetManager.Bundle | null) => {
        if (err || !bundle) {
          Art._bgLoaded = true;
          Art._onBgLoaded();
          resolve();
          return;
        }

        const bgAliases = Object.entries(ART_ALIAS).filter(
          ([, alias]) => alias.src === 'bg',
        );

        let remaining = bgAliases.length;
        if (remaining === 0) {
          Art._bgLoaded = true;
          Art._onBgLoaded();
          resolve();
          return;
        }

        const doneOne = () => {
          remaining--;
          if (remaining <= 0) {
            Art._bgLoaded = true;
            Art._onBgLoaded();
            resolve();
          }
        };

        const finishSingle = (
          name: string,
          path: string,
          sf: SpriteFrame | null,
        ) => {
          if (sf) {
            if (sf.texture) {
              const tex = sf.texture as Texture2D;
              tex.setFilters(Texture2D.Filter.NEAREST, Texture2D.Filter.NEAREST);
              tex.setMipFilter(Texture2D.Filter.NONE);
              (tex as any).premultiplyAlpha = false;
            }
            // 九宫格素材搬到 bg 分包后，insets 也要在分包加载完成时补上。
            const alias = ART_ALIAS[name];
            if (alias?.insets) Art.applyInsets(sf, alias.insets);
            Art._bgFramesCache.set(path, sf);
          }
          doneOne();
        };

        const loadImageAsSpriteFrame = (bundleRef: AssetManager.Bundle, path: string, cb: (sf: SpriteFrame | null) => void) => {
          const imagePaths = bgImageCandidates(path);
          const tryImage = (index: number) => {
            if (index >= imagePaths.length) {
              cb(null);
              return;
            }
            try {
              bundleRef.load(
                imagePaths[index],
                ImageAsset,
                (imageErr: Error | null, image: ImageAsset | null) => {
                  if (imageErr || !image) {
                    tryImage(index + 1);
                    return;
                  }
                  let sf: SpriteFrame | null = null;
                  try {
                    sf = SpriteFrame.createWithImage(image);
                  } catch (e) {
                    sf = null;
                  }
                  cb(sf);
                },
              );
            } catch (e) {
              tryImage(index + 1);
            }
          };
          tryImage(0);
        };

        const loadOne = (bundleRef: AssetManager.Bundle, path: string, cb: (sf: SpriteFrame | null) => void) => {
          const spriteFramePaths = bgSpriteFrameCandidates(path);
          const trySpriteFrame = (index: number) => {
            if (index >= spriteFramePaths.length) {
              loadImageAsSpriteFrame(bundleRef, path, cb);
              return;
            }
            try {
              bundleRef.load(
                spriteFramePaths[index],
                SpriteFrame,
                (sfErr: Error | null, sf: SpriteFrame | null) => {
                  if (sfErr || !sf) {
                    trySpriteFrame(index + 1);
                    return;
                  }
                  cb(sf);
                },
              );
            } catch (e) {
              trySpriteFrame(index + 1);
            }
          };
          trySpriteFrame(0);
        };

        for (const [name, alias] of bgAliases) {
          const path = alias.path;
          const count = alias.frames ?? 1;
          if (count <= 1) {
            loadOne(bundle, path, (sf) => finishSingle(name, path, sf));
            continue;
          }
          const frames: SpriteFrame[] = [];
          let left = count;
          const finishFrame = () => {
            left--;
            if (left > 0) return;
            const valid = frames.filter((f): f is SpriteFrame => !!f);
            if (valid.length > 0) {
              for (const sf of valid) {
                if (sf.texture) {
                  const tex = sf.texture as Texture2D;
                  tex.setFilters(Texture2D.Filter.NEAREST, Texture2D.Filter.NEAREST);
                  tex.setMipFilter(Texture2D.Filter.NONE);
                  (tex as any).premultiplyAlpha = false;
                }
                if (alias.insets) Art.applyInsets(sf, alias.insets);
              }
              Art._bgSeriesCache.set(path, valid);
            }
            doneOne();
          };
          for (let i = 0; i < count; i++) {
            frames.push(null as unknown as SpriteFrame);
            loadOne(bundle, `${path}/${i}`, (sf) => {
              frames[i] = sf as SpriteFrame;
              finishFrame();
            });
          }
        }
      });
    });
  }

  /** 背景加载完成后的处理：替换等待中的占位节点。 */
  private static _onBgLoaded(): void {
    const waiters = Art._bgWaiters.slice();
    Art._bgWaiters = [];
    for (const { name, node } of waiters) {
      const frames = Art.frames(name);
      if (frames.length > 0 && node && node.isValid) {
        Art.applySpriteToNode(node, name, frames);
      }
    }
  }
}