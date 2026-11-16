/**
 * r35 签纸排版（纯计算，不依赖 cc，方便单测）。
 *
 * 签纸源图 96×160，九宫格 insets L18/R18/T32/B33。
 * r35 起不再把整张 96px 图按比例拉宽：
 *   · 纸宽 = 屏宽 72%（SE 等窄屏也保证 ≥ 屏宽 40%）；
 *   · 九宫格边框按全局整数源像素倍率换算，边框始终是 18/32/33 源像素 × k；
 *   · 文字区 = 纸宽 - 左右边框 - 8px 内边距，宽度 ≥ 纸宽 75%；
 *   · 字号固定为正文档（低于 14 CSS 时抬到最近整数源像素档），不自动缩小；
 *   · 高度随文字自动长高，最小高度 = 纸宽 × 1.4。
 */
import type { CardTextFit } from './CardTextLayout';
import {
  cssPxToDesign,
  fontSizeForSourceScale,
  fontSizeStep,
  fontScaleK,
  getFontVisibleWidth,
  measurePixelTextWidth,
  physicalPixelsPerDesign,
} from './PixelFontMetrics';
import { wrapTextToLines } from './WordBreak';

export const FORTUNE_PAPER_ART = 'fortune_paper';
export const FORTUNE_PAPER_SRC_W = 96;
export const FORTUNE_PAPER_SRC_H = 160;
/** 兼容旧导出；r35 的实际边框倍率由全局整数源像素档 k 算出。 */
export const FORTUNE_PAPER_SCALE = 3;
/** 九宫格 insets：L18/R18/T32/B33。 */
export const FORTUNE_PAPER_INSETS: [number, number, number, number] = [18, 18, 32, 33];
/** 九宫格扣除边框后的源像素文字区。 */
export const FORTUNE_TEXT_RECT = {
  left: 18,
  top: 32,
  right: 78,
  bottom: 127,
  width: 60,
  height: 95,
} as const;
/** 纸宽占屏宽比例（UI/UX #1）。 */
export const FORTUNE_PAPER_WIDTH_RATIO = 0.72;
/** 窄屏兜底：纸宽至少占屏宽 40%（SE 也要足够大）。 */
export const FORTUNE_PAPER_MIN_WIDTH_RATIO = 0.4;
/** 文字区至少占纸宽 75%。 */
export const FORTUNE_TEXT_WIDTH_RATIO = 0.75;
/** 最小高度 = 纸宽 × 1.4。 */
export const FORTUNE_PAPER_MIN_HEIGHT_RATIO = 1.4;
/** 文字区内边距：8 CSS px。 */
export const FORTUNE_TEXT_PADDING_CSS = 8;
/** 签文最小字号：14 CSS px。 */
export const FORTUNE_TEXT_MIN_CSS = 14;
/** 签纸中心 y（720×1280 设计坐标）；下方给「还差¥X」和重抽按钮留足空间。 */
export const FORTUNE_PAPER_CENTER_Y = -60;

/** 签头档位名：与 GameRoot / 语料共用，避免运行时拼接格式和预计算不一致。 */
export const FORTUNE_TIER_NAMES: Record<string, string> = {
  good: '好签',
  meh: '平签',
  bad: '坏签',
};

/**
 * r36：签文唯一构造入口。签头、正文、指定地点三段都用显式换行，
 * 由同一套断行器排版；Layout / 渲染 / 语料生成都调用它。
 */
export function buildFortuneText(
  fortune: { tier?: string; name?: string; text?: string } | null | undefined,
  locationName?: string | null,
): string {
  if (!fortune) return '';
  const tier = FORTUNE_TIER_NAMES[fortune.tier ?? ''] ?? '签';
  const header = `【${tier} · ${fortune.name ?? ''}】`;
  const body = String(fortune.text ?? '');
  const loc = String(locationName ?? '').trim();
  return `${header}\n${body}${loc ? `\n指定地点：${loc}` : ''}`;
}

export interface FortuneTextBox {
  /** 相对签纸中心的左/右边界。 */
  left: number;
  right: number;
  /** 相对签纸中心的上/下边界（y 向上）。 */
  top: number;
  bottom: number;
  centerX: number;
  centerY: number;
  /** 文字区显示宽高（设计单位）。 */
  width: number;
  height: number;
  /** 文字可用宽高（已扣内边距）。 */
  maxWidth: number;
  maxHeight: number;
}

export interface FortunePaperLayout {
  art: string;
  /** 全局整数源像素档 k；边框 = insets × k / 物理像素密度。 */
  scale: number;
  /** 每个源像素对应的设计单位（= k / physicalPixelsPerDesign）。 */
  borderScale: number;
  width: number;
  height: number;
  minHeight: number;
  centerX: number;
  centerY: number;
  insets: [number, number, number, number];
  text: FortuneTextBox;
}

function snapPhysical(value: number): number {
  const ppd = physicalPixelsPerDesign();
  if (!Number.isFinite(ppd) || ppd <= 0) return Math.round(value);
  return Math.round(value * ppd) / ppd;
}

/** 每个源像素对应的设计单位：全局 k 个物理像素 / 物理像素密度。 */
export function fortuneBorderScale(): number {
  const ppd = physicalPixelsPerDesign();
  const k = Math.max(1, fontScaleK());
  return k / Math.max(1e-6, ppd);
}

/** 签文字号：正文档，且至少 14 CSS px；只取整数源像素档，不自动缩小。 */
export function fortuneTextSourceScale(): number {
  const minCssDesign = cssPxToDesign(FORTUNE_TEXT_MIN_CSS);
  const step = Math.max(1e-6, fontSizeStep());
  return Math.max(1, fontScaleK() + 1, Math.ceil(minCssDesign / step - 1e-9));
}

export function fortuneTextFontSize(): number {
  return fontSizeForSourceScale(fortuneTextSourceScale());
}

function buildLayout(
  width: number,
  height: number,
  borderScale: number,
  centerY: number,
  minHeight: number,
): FortunePaperLayout {
  const borderL = FORTUNE_PAPER_INSETS[0] * borderScale;
  const borderR = FORTUNE_PAPER_INSETS[1] * borderScale;
  const borderT = FORTUNE_PAPER_INSETS[2] * borderScale;
  const borderB = FORTUNE_PAPER_INSETS[3] * borderScale;
  // UI/UX #1：8 CSS px 内边距（左右各一半，共 8）。
  const pad = cssPxToDesign(FORTUNE_TEXT_PADDING_CSS);
  const left = -width / 2 + borderL + pad / 2;
  const right = width / 2 - borderR - pad / 2;
  const top = height / 2 - borderT - pad / 2;
  const bottom = -height / 2 + borderB + pad / 2;
  return {
    art: FORTUNE_PAPER_ART,
    scale: Math.max(1, fontScaleK()),
    borderScale,
    width,
    height,
    minHeight,
    centerX: 0,
    centerY: snapPhysical(centerY),
    insets: FORTUNE_PAPER_INSETS,
    text: {
      left: snapPhysical(left),
      right: snapPhysical(right),
      top: snapPhysical(top),
      bottom: snapPhysical(bottom),
      centerX: snapPhysical((left + right) / 2),
      centerY: snapPhysical((top + bottom) / 2),
      width: Math.max(1, right - left),
      height: Math.max(1, top - bottom),
      maxWidth: Math.max(1, right - left),
      maxHeight: Math.max(1, top - bottom),
    },
  };
}

/**
 * 签纸节点尺寸与文字区（全部为设计单位，位置相对签纸中心）。
 * `scale` 可显式覆盖边框倍率（主要供单测），默认全局整数 k。
 */
export function computeFortunePaperLayout(
  scale?: number,
  centerY: number = FORTUNE_PAPER_CENTER_Y,
  visibleWidth?: number,
  height?: number,
): FortunePaperLayout {
  const visibleW = Math.max(1, visibleWidth ?? getFontVisibleWidth());
  const borderScale = Number.isFinite(scale) && (scale as number) > 0
    ? Math.max(1e-6, scale as number)
    : fortuneBorderScale();
  const width = Math.max(1, visibleW * FORTUNE_PAPER_WIDTH_RATIO);
  const minHeight = Math.max(1, width * FORTUNE_PAPER_MIN_HEIGHT_RATIO);
  const finalHeight = Math.max(minHeight, height ?? minHeight);
  return buildLayout(width, finalHeight, borderScale, centerY, minHeight);
}

/**
 * 签纸节点缩放：九宫格边框在本地仍是 18/32/33 源像素，
 * 节点缩放 = 每个源像素对应的设计单位，边框世界尺寸正好是 18×k 物理像素。
 */
export function fortunePaperNodeScale(layout: FortunePaperLayout): number {
  return Math.max(1e-6, layout.borderScale);
}

/** 签纸节点本地内容尺寸（世界尺寸 ÷ 节点缩放）。 */
export function fortunePaperNodeSize(layout: FortunePaperLayout): { width: number; height: number } {
  const scale = fortunePaperNodeScale(layout);
  return { width: layout.width / scale, height: layout.height / scale };
}

/** 签文相对签纸中心的落点（文字区中心）。 */
export function fortuneTextPosition(layout: FortunePaperLayout): { x: number; y: number } {
  return {
    x: snapPhysical(layout.centerX + layout.text.centerX),
    y: snapPhysical(layout.centerY + layout.text.centerY),
  };
}

export interface FortuneTextFit extends CardTextFit {
  /** Label 节点宽度：固定为文字区宽。 */
  labelWidth: number;
  /** 每一行是否在纸面文字区内。 */
  withinPaper: boolean;
}

/**
 * 签文排版：字号固定为正文档（≥14 CSS），只在词边界断行；
 * 【签头】整体不拆。放不下时由调用方拉高签纸中部，绝不缩小字号。
 */
export function fitFortuneText(
  text: string,
  layout: FortunePaperLayout = computeFortunePaperLayout(),
): FortuneTextFit {
  const fontSize = fortuneTextFontSize();
  const lines = wrapTextToLines(text, layout.text.maxWidth, (line) =>
    measurePixelTextWidth(line, fontSize), { minLast: 4, protectHeader: true });
  const lineHeight = fontSize * 14 / 12;
  const width = lines.reduce((w, line) => Math.max(w, measurePixelTextWidth(line, fontSize)), 0);
  const height = lines.length * lineHeight;
  const withinPaper = width <= layout.text.maxWidth + 0.001
    && height <= layout.text.maxHeight + 0.001;
  return {
    text: lines.join('\n'),
    lines,
    fontSize,
    lineHeight,
    width,
    height,
    labelWidth: layout.text.width,
    withinPaper,
  };
}

/** 文字放不下时把签纸中部拉高（不动字号），并返回最终布局与排版。 */
export function computeFortunePaperLayoutForText(
  text: string,
  options: { scale?: number; centerY?: number; visibleWidth?: number } = {},
): { paper: FortunePaperLayout; fit: FortuneTextFit } {
  const base = computeFortunePaperLayout(options.scale, options.centerY, options.visibleWidth);
  const fit0 = fitFortuneText(text, base);
  if (fit0.withinPaper) return { paper: base, fit: fit0 };
  const borderScale = base.borderScale;
  const borderT = FORTUNE_PAPER_INSETS[2] * borderScale;
  const borderB = FORTUNE_PAPER_INSETS[3] * borderScale;
  const pad = cssPxToDesign(FORTUNE_TEXT_PADDING_CSS);
  const needed = fit0.height + borderT + borderB + pad;
  const height = Math.max(base.minHeight, needed);
  const paper = computeFortunePaperLayout(borderScale, base.centerY, options.visibleWidth, height);
  // 保持实际屏宽不变：上面最后一步的 visibleWidth 缺省会按当前屏幕取，正好一致。
  const fit = fitFortuneText(text, paper);
  return { paper, fit };
}

/** 签文文字块相对文字区中心的上下边界（用于单测断言不越出纸面）。 */
export function fortuneTextBounds(
  fit: FortuneTextFit,
  layout: FortunePaperLayout,
): { left: number; right: number; top: number; bottom: number } {
  const centerX = layout.text.centerX;
  const centerY = layout.text.centerY;
  return {
    left: centerX - fit.width / 2,
    right: centerX + fit.width / 2,
    top: centerY + fit.height / 2,
    bottom: centerY - fit.height / 2,
  };
}
