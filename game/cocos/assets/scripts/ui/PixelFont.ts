import {
  BitmapFont,
  CacheMode,
  Color,
  Component,
  Label,
  LabelOutline,
  Node,
  SpriteFrame,
  Texture2D,
  UITransform,
  _decorator,
  resources,
  screen,
  view,
} from 'cc';
import {
  PIXEL_FONT_STEP,
  fontSizeForSourceScale,
  fontSizeStep,
  getFontPhysicalHeight,
  getFontPhysicalWidth,
  measurePixelTextWidth,
  physicalPixelsPerDesign,
  setFontScreenMetrics,
  snapFontSize,
  snapLineHeight,
} from './PixelFontMetrics';

const { ccclass } = _decorator;

/** 两个同字形集的位图字体。 */
export const PIXEL_FONT_PLAIN_PATH = 'font/pixel_plain';
export const PIXEL_FONT_OUTLINE_PATH = 'font/pixel_outline';
/** 兼容旧调用：默认深底描边档。 */
export const PIXEL_FONT_PATH = PIXEL_FONT_OUTLINE_PATH;
/** 浅底纯色字统一颜色。 */
export const PIXEL_INK_COLOR = new Color(26, 16, 32, 255); // #1a1020
export const PIXEL_OUTLINE_COLOR = PIXEL_INK_COLOR;
export const PIXEL_LIGHT_OUTLINE_COLOR = PIXEL_INK_COLOR;

export type PixelFontVariant = 'plain' | 'outline';
export type PixelFontBackground = 'light' | 'dark';

/**
 * 微信真机默认关闭诊断日志；需要排查时把它改成 true 再发版。
 * Web 端也可以用 URL 参数 ?fontdebug=1 临时打开。
 */
export const DEBUG_FONT = false;

export interface PixelLabelOptions {
  /** 设计分辨率下的最终字号；应来自 pxFont()，仍会吸附到整数源像素档。 */
  size?: number;
  /** 设计分辨率下的最终行高；不传时使用 BMFont lineHeight。 */
  lineHeight?: number;
  /** 覆盖文字颜色；不传则沿用 Label 当前颜色。 */
  color?: Color;
  /** 浅底（plain 纯色字）或深底（outline 白字）。 */
  bg?: PixelFontBackground;
  /** 显式指定字形档，优先级高于 bg。 */
  variant?: PixelFontVariant;
  /** 兼容旧调用：true = 浅底。 */
  lightPanel?: boolean;
  /** 兼容旧调用：true = 深底描边。 */
  outline?: boolean;
  outlineColor?: Color;
  /** 不使用字符图集缓存；默认 NONE，避免位图字体被动态图集重采样。 */
  cacheMode?: CacheMode;
  /** 是否把节点世界坐标吸附到整数物理像素，默认 true。 */
  snap?: boolean;
}

/** 判断是否接近旧卡片里的深绿色文字。 */
function isDarkGreen(color: Color): boolean {
  return color.g > color.r + 20 && color.g > color.b + 10 && color.g < 150;
}

/**
 * 按世界坐标吸附到整数物理像素。Label 的字形起点由锚点、对齐方式和
 * 文字块尺寸共同决定，所以这里先算文字块左上角再整像素修正，而不是
 * 只把节点本地坐标 Math.round。
 */
@ccclass('PixelSnap')
export class PixelSnap extends Component {
  protected lateUpdate(): void {
    PixelFont.snapLabelNode(this.node);
  }
}

/**
 * 全局像素位图字体入口。所有代码创建的 Label 都必须经过这里：
 * - pixel_plain：浅底，1-bit 白色字 + Label.color 着色（浅底默认 #1a1020）；
 * - pixel_outline：深底，白色字 + 外侧 1 源像素 #1a1020 描边；
 * - 字号只取整数源像素档，物理像素缩放严格等于 k / 2k；
 * - NONE 缓存 + 世界坐标整数物理像素吸附；
 * - 加载时再次把 BitmapFont 纹理设成 NEAREST / 无 mipmap。
 */
export class PixelFont {
  private static _assets: Record<PixelFontVariant, BitmapFont | null> = {
    plain: null,
    outline: null,
  };
  private static _loading: Promise<BitmapFont | null> | null = null;
  private static _pending: Map<Label, PixelLabelOptions> = new Map();
  private static _debugResolved: boolean | null = null;
  private static _debugOnce: boolean = false;
  private static _metricsLogged: boolean = false;

  /** 在创建任何 Label 之前 await 一次。 */
  public static load(): Promise<BitmapFont | null> {
    if (PixelFont._assets.plain && PixelFont._assets.outline) {
      return Promise.resolve(PixelFont._assets.outline);
    }
    if (PixelFont._loading) return PixelFont._loading;
    PixelFont._loading = Promise.all([
      PixelFont.loadOne('plain', PIXEL_FONT_PLAIN_PATH),
      PixelFont.loadOne('outline', PIXEL_FONT_OUTLINE_PATH),
    ]).then(([plain, outline]) => {
      PixelFont._assets.plain = plain;
      PixelFont._assets.outline = outline;
      PixelFont.flushPending();
      PixelFont.logMetricsOnce();
      return outline ?? plain;
    });
    return PixelFont._loading;
  }

  public static get asset(): BitmapFont | null {
    return PixelFont._assets.outline ?? PixelFont._assets.plain;
  }

  public static get plainAsset(): BitmapFont | null {
    return PixelFont._assets.plain;
  }

  public static get outlineAsset(): BitmapFont | null {
    return PixelFont._assets.outline;
  }

  /** 兼容旧代码：位图字体没有运行时 family。 */
  public static get family(): string {
    return '';
  }

  public static variantFor(options: PixelLabelOptions = {}, fallbackColor?: Color): PixelFontVariant {
    if (options.variant) return options.variant;
    if (options.bg === 'light') return 'plain';
    if (options.bg === 'dark') return 'outline';
    if (options.lightPanel === true) return 'plain';
    if (options.outline === true) return 'outline';
    const color = options.color ?? fallbackColor;
    if (color) {
      const lum = 0.299 * color.r + 0.587 * color.g + 0.114 * color.b;
      return lum >= 170 ? 'outline' : 'plain';
    }
    return 'plain';
  }

  public static apply(label: Label, options: PixelLabelOptions = {}): Label {
    if (!label || !label.isValid) return label;

    if (!PixelFont.asset) {
      PixelFont._pending.set(label, { ...options });
      console.warn('[PixelFont] Label 在位图字体加载前创建，已排队等待 pixel_plain / pixel_outline');
      return label;
    }

    PixelFont.applyLoaded(label, options);
    return label;
  }

  /** 开发期自检：返回所有仍未使用本轮位图字体的 Label。 */
  public static findUnstyledLabels(root: Component | null): Label[] {
    if (!root || !root.isValid) return [];
    const out: Label[] = [];
    const stack = [root.node];
    while (stack.length > 0) {
      const node = stack.pop()!;
      const label = node.getComponent(Label);
      if (label && label.isValid) {
        const known = label.font === PixelFont._assets.plain || label.font === PixelFont._assets.outline;
        if (!known || label.useSystemFont) out.push(label);
      }
      for (const child of node.children) stack.push(child);
    }
    return out;
  }

  /** 只吸附世界坐标；对非 Label 节点无副作用。 */
  public static snapLabelNode(node: Node | null): void {
    if (!node || !node.isValid) return;
    const label = node.getComponent(Label);
    if (!label || !label.isValid) return;
    PixelFont.snapLabel(label);
  }

  public static snapLabel(label: Label): void {
    if (!label || !label.isValid || !label.node.isValid) return;
    const node = label.node;
    const ut = node.getComponent(UITransform);
    const world = node.worldPosition;
    const ws = node.worldScale;
    if (!ut || ws.x === 0 || ws.y === 0) return;

    const ppd = physicalPixelsPerDesign();
    if (!Number.isFinite(ppd) || ppd <= 0) return;

    const text = label.string ?? '';
    const lines = text.split('\n');
    const textH = Math.max(1, lines.length) * (label.lineHeight || label.fontSize || PIXEL_FONT_STEP);
    let textW = 0;
    for (const line of lines) {
      textW = Math.max(textW, measurePixelTextWidth(line, label.fontSize));
    }
    if (textW <= 0) textW = Math.min(ut.width, 1);

    const boxW = ut.width;
    const boxH = ut.height;
    const boxLeft = world.x - ut.anchorX * boxW * ws.x;
    const boxBottom = world.y - ut.anchorY * boxH * ws.y;

    let textLeft = boxLeft;
    if (label.horizontalAlign === Label.HorizontalAlign.CENTER) {
      textLeft = boxLeft + (boxW - textW) / 2 * ws.x;
    } else if (label.horizontalAlign === Label.HorizontalAlign.RIGHT) {
      textLeft = boxLeft + (boxW - textW) * ws.x;
    }

    let textTop = boxBottom + (boxH - textH) * ws.y;
    if (label.verticalAlign === Label.VerticalAlign.CENTER) {
      textTop = boxBottom + (boxH + textH) / 2 * ws.y;
    } else if (label.verticalAlign === Label.VerticalAlign.BOTTOM) {
      textTop = boxBottom + textH * ws.y;
    }

    const physicalW = getFontPhysicalWidth();
    const physicalH = getFontPhysicalHeight();
    const leftPx = textLeft * ppd + physicalW / 2;
    const topPx = textTop * ppd + physicalH / 2;
    const dx = (Math.round(leftPx) - leftPx) / ppd;
    const dy = (Math.round(topPx) - topPx) / ppd;
    if (Math.abs(dx) > 1e-6 || Math.abs(dy) > 1e-6) {
      node.setWorldPosition(world.x + dx, world.y + dy, world.z);
    }
  }

  private static applyLoaded(label: Label, options: PixelLabelOptions): void {
    const variant = PixelFont.variantFor(options, label.color);
    const asset = PixelFont._assets[variant] ?? PixelFont.asset;
    if (!asset) return;

    label.font = asset;
    label.useSystemFont = false;
    label.fontFamily = '';

    const size = snapFontSize(options.size ?? label.fontSize);
    label.fontSize = size;
    label.lineHeight = snapLineHeight(size, options.lineHeight);
    label.spacingX = 0;
    label.isBold = false;
    label.isItalic = false;
    label.isUnderline = false;
    label.cacheMode = options.cacheMode ?? CacheMode.NONE;
    // 位图字体只能用 CLAMP / RESIZE_HEIGHT；绝不走 Overflow mode 2 的二分缩字。
    const binaryFitMode = 2;
    if ((label.overflow as number) === binaryFitMode) {
      label.overflow = Label.Overflow.CLAMP;
    }

    // 位图字体内置描边/纯色字：移除旧代码/旧场景可能挂上的 LabelOutline。
    const outline = label.node.getComponent(LabelOutline);
    if (outline) outline.destroy();

    let color = options.color ? options.color.clone() : label.color.clone();
    if (variant === 'plain') {
      // 浅底默认墨色；旧卡片里的深绿色价格/签文统一回到 #1a1020。
      if (!options.color && (options.bg === 'light' || options.lightPanel === true)) {
        color = PIXEL_INK_COLOR.clone();
      } else if (isDarkGreen(color)) {
        color = PIXEL_INK_COLOR.clone();
      }
    }
    label.color = color;

    if (options.snap !== false) {
      PixelFont.snapLabel(label);
      if (!label.node.getComponent(PixelSnap)) {
        label.node.addComponent(PixelSnap);
      }
    }

    PixelFont.debugLabel(label);
  }

  private static flushPending(): void {
    const entries = Array.from(PixelFont._pending.entries());
    PixelFont._pending.clear();
    for (const [label, options] of entries) {
      if (label && label.isValid) PixelFont.applyLoaded(label, options);
    }
  }

  private static loadOne(
    variant: PixelFontVariant,
    path: string,
  ): Promise<BitmapFont | null> {
    return new Promise<BitmapFont | null>((resolve) => {
      try {
        resources.load(path, BitmapFont, (err: Error | null, font: BitmapFont) => {
          if (err || !font) {
            console.error(`[PixelFont] 位图字体加载失败：${path}.fnt + .png`, err);
            resolve(null);
            return;
          }
          PixelFont.applyTextureFilter(variant, path, font);
          resolve(font);
        });
      } catch (e) {
        console.error(`[PixelFont] 位图字体加载异常：${path}`, e);
        resolve(null);
      }
    });
  }

  /** 运行时再次确认 BitmapFont 的 texture 是 NEAREST / 无 mipmap。 */
  private static applyTextureFilter(variant: PixelFontVariant, path: string, font: BitmapFont): void {
    const apply = (sf: SpriteFrame | null | undefined): boolean => {
      const texture = sf?.texture as Texture2D | null | undefined;
      if (!texture) return false;
      texture.setFilters(Texture2D.Filter.NEAREST, Texture2D.Filter.NEAREST);
      texture.setMipFilter(Texture2D.Filter.NONE);
      return true;
    };

    if (apply(font.spriteFrame)) return;
    // 极少数平台 BitmapFont 的 spriteFrame 延迟绑定：按资源路径补一次。
    try {
      resources.load(`${path}/spriteFrame`, SpriteFrame, (err: Error | null, sf: SpriteFrame) => {
        if (err || !sf) {
          if (PixelFont.debugEnabled()) console.warn(`[PixelFont] ${variant} spriteFrame 延迟加载失败`, err);
          return;
        }
        font.spriteFrame = sf;
        apply(sf);
      });
    } catch (e) {
      // 忽略：fnt 自带 texture 时已经设过。
    }
  }

  // ------------------------------------------------------------------
  // 诊断日志（默认关闭）
  // ------------------------------------------------------------------
  private static debugEnabled(): boolean {
    if (PixelFont._debugResolved === null) {
      let on = DEBUG_FONT;
      if (!on) {
        try {
          const loc: any = (globalThis as any).location;
          if (loc && typeof loc.search === 'string') {
            const params = new URLSearchParams(loc.search);
            on = params.get('fontdebug') === '1';
          }
        } catch (e) {
          // 微信没有 location：只看 DEBUG_FONT
        }
      }
      PixelFont._debugResolved = on;
    }
    return PixelFont._debugResolved;
  }

  private static logMetricsOnce(): void {
    if (PixelFont._metricsLogged || !PixelFont.debugEnabled()) return;
    PixelFont._metricsLogged = true;
    try {
      const physical = physicalScreenSize();
      const design = view.getDesignResolutionSize();
      const visible = view.getVisibleSize();
      const ppd = physicalPixelsPerDesign();
      const step = fontSizeStep();
      const k = Math.max(1, Math.floor(physical.width / 360));
      console.log('[PixelFont] physical metrics', {
        physical,
        devicePixelRatio: screen.devicePixelRatio,
        design: { width: design.width, height: design.height },
        visible: { width: visible.width, height: visible.height },
        k,
        designToPhysical: ppd,
        oneSourcePixelDesign: step,
        bodyDesign: fontSizeForSourceScale(k),
        bodyPhysicalPx: 12 * k,
        titleSourceScale: 2 * k,
        titleDesign: fontSizeForSourceScale(2 * k),
        titlePhysicalPx: 24 * k,
        plainTexture: PixelFont._assets.plain?.spriteFrame?.texture ? 'nearest' : 'missing',
        outlineTexture: PixelFont._assets.outline?.spriteFrame?.texture ? 'nearest' : 'missing',
      });
    } catch (e) {
      console.warn('[PixelFont] 字体屏宽日志失败', e);
    }
  }

  private static debugLabel(label: Label): void {
    if (!PixelFont.debugEnabled()) return;
    try {
      if (!PixelFont._debugOnce) {
        PixelFont._debugOnce = true;
        PixelFont.logMetricsOnce();
      }

      const ut = label.node.getComponent(UITransform);
      const world = label.node.worldPosition;
      const physical = physicalScreenSize();
      const ppd = physicalPixelsPerDesign();
      const physicalFontPx = label.fontSize * ppd;
      console.log('[PixelFont] label', {
        string: (label.string ?? '').slice(0, 6),
        variant: label.font === PixelFont._assets.plain ? 'plain' : 'outline',
        fontSize: label.fontSize,
        lineHeight: label.lineHeight,
        physicalFontPx,
        world: { x: world.x, y: world.y },
        physicalWorld: {
          x: world.x * ppd + physical.width / 2,
          y: world.y * ppd + physical.height / 2,
        },
        overflow: label.overflow,
        contentSize: ut ? { width: ut.width, height: ut.height } : null,
      });
    } catch (e) {
      console.warn('[PixelFont] fontdebug 日志失败', e);
    }
  }
}


/** Cocos 3.8 screen.windowSize 已是物理像素；异常/旧平台时用 frame × DPR 兜底。 */
export function physicalScreenSize(): { width: number; height: number; source: string } {
  const dpr = Math.max(1, screen.devicePixelRatio || 1);
  let width = 0;
  let height = 0;
  let source = 'windowSize';
  try {
    const win = screen.windowSize;
    width = win?.width ?? 0;
    height = win?.height ?? 0;
  } catch (e) {
    width = 0;
    height = 0;
  }
  try {
    const frame = view.getFrameSize();
    // 某些平台/预览环境 windowSize 仍是 CSS 尺寸：与 frame 几乎相同且 DPR>1 时换算。
    if (width > 0 && frame.width > 0 && dpr > 1 && Math.abs(width - frame.width) < 0.5) {
      width = frame.width * dpr;
      height = frame.height * dpr;
      source = 'frame*dpr';
    }
    if (width <= 0 || height <= 0) {
      width = frame.width * dpr;
      height = frame.height * dpr;
      source = 'frame*dpr-fallback';
    }
  } catch (e) {
    // 使用 windowSize
  }
  if (!(width > 0) || !(height > 0)) {
    const visible = view.getVisibleSize();
    width = visible.width;
    height = visible.height;
    source = 'visible-fallback';
  }
  return { width: Math.max(1, width), height: Math.max(1, height), source };
}

export function setFontMetricsFromRuntime(): { width: number; height: number; source: string } {
  const physical = physicalScreenSize();
  const visible = view.getVisibleSize();
  setFontScreenMetrics({
    physicalWidth: physical.width,
    physicalHeight: physical.height,
    visibleWidth: visible.width,
    visibleHeight: visible.height,
    devicePixelRatio: screen.devicePixelRatio,
  });
  return physical;
}
