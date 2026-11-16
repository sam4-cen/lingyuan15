import { measureTextWidth } from './BubbleLayout';
import { wrapTextToLines } from './WordBreak';
import { fontSizeStep, pxFont, snapFontSize, snapLineHeight } from './PixelFontMetrics';

/**
 * 卡片文字排版（纯计算，不依赖 cc，方便单测）。
 *
 * 坐标与 Art.makeCard 的 content 节点一致：原点在卡片中心，y 向上。
 * 文字框只落在卡片内部米色区域，同时避开顶部 HUD 和底部按钮；
 * 屏幕两侧被 Fit Height 裁掉时，也会把文字收进可视区。
 */
export interface CardTextLayoutOptions {
  /** 卡片宽度（content 节点宽度）。 */
  cardW: number;
  /** 卡片高度（content 节点高度）。 */
  cardH: number;
  /** 卡片中心的世界 y（设计坐标）。 */
  cardY: number;
  /** 左右内边距占卡片宽度的比例（避开像素边框/角落装饰）。 */
  padXRatio: number;
  /** 顶部内边距占卡片高度的比例。 */
  padTopRatio: number;
  /** 底部内边距占卡片高度的比例。 */
  padBottomRatio: number;
  /** 顶栏 HUD 的底边世界 y。 */
  hudBottom: number;
  /** 当前屏幕可视半宽（UILayout.halfW）。 */
  halfW: number;
  /** 底部按钮顶边的世界 y；没有按钮时传一个很小的数。 */
  buttonTop: number;
  /** 文字与屏幕、HUD、按钮之间至少留出的间距。 */
  gap?: number;
  /** 距屏幕可视左右边缘的最小安全边距（默认 12）。 */
  sideMargin?: number;
  /** 文本区最多占「安全区宽度」的比例（如失败页 0.86）；不传则用卡片内区全宽。 */
  widthRatio?: number;
  /** 左右安全区（设计 px），与 UILayout.safeLeft/Right 一致。 */
  safeLeft?: number;
  safeRight?: number;
}

export interface CardTextBox {
  /** 相对 content 节点中心的左边界。 */
  left: number;
  /** 相对 content 节点中心的顶部 y。 */
  top: number;
  width: number;
  height: number;
}

export function computeCardTextBox(options: CardTextLayoutOptions): CardTextBox {
  const {
    cardW,
    cardH,
    cardY,
    padXRatio,
    padTopRatio,
    padBottomRatio,
    hudBottom,
    halfW,
    buttonTop,
  } = options;
  const gap = options.gap ?? 14;
  const sideMargin = options.sideMargin ?? 12;

  const padX = Math.max(0, Math.round(cardW * padXRatio));
  const padTop = Math.max(0, Math.round(cardH * padTopRatio));
  const padBottom = Math.max(0, Math.round(cardH * padBottomRatio));

  // 卡片内部区域与屏幕可视区域的交集：390x844 时卡片比屏幕宽，两侧会被裁掉。
  let left = Math.max(-cardW / 2 + padX, -halfW + sideMargin);
  let right = Math.min(cardW / 2 - padX, halfW - sideMargin);
  if (options.widthRatio && options.widthRatio > 0) {
    const safeW = Math.max(1, halfW * 2 - Math.max(0, options.safeLeft ?? 0) - Math.max(0, options.safeRight ?? 0));
    // r29：失败页按安全区宽度的 86% 定文字框，不再被卡片 19% 内边距收窄。
    const desired = Math.max(80, Math.min(safeW * options.widthRatio, cardW - 24));
    const center = (left + right) / 2;
    left = Math.max(-halfW + sideMargin, center - desired / 2);
    right = Math.min(halfW - sideMargin, left + desired);
    left = Math.max(-halfW + sideMargin, right - desired);
  }
  const width = Math.max(80, right - left);

  // 顶部不能压住 HUD；底部不能压住按钮，也不能压住卡片下边框/装饰。
  const topWorld = Math.min(cardY + cardH / 2 - padTop, hudBottom - gap);
  const bottomWorld = Math.max(cardY - cardH / 2 + padBottom, buttonTop + gap);
  const height = Math.max(72, topWorld - bottomWorld);

  return {
    left,
    top: topWorld - cardY,
    width,
    height,
  };
}

// ---------------------------------------------------------------------------
// 卡片文字：按真实可用宽度预排版，避免孤字换行和顶到九宫格边框。
// ---------------------------------------------------------------------------


export interface CardTextFitOptions {
  /** 文字可用宽度（卡片内部宽度）。 */
  maxWidth: number;
  /** 文字可用高度。 */
  maxHeight: number;
  /** 起始字号。 */
  fontSize: number;
  /** 最小字号；再小就不适合手机阅读了。 */
  minFontSize?: number;
  /** 行高 = 字号 + lineGap。 */
  lineGap?: number;
  /** 允许最小字号低于正文档（签文放不下时降一档）。 */
  allowBelowBody?: boolean;
}

export interface CardTextFit {
  /** 带显式换行的最终字符串（Label 不再自动折行）。 */
  text: string;
  lines: string[];
  fontSize: number;
  lineHeight: number;
  width: number;
  height: number;
}

/**
 * 在固定宽高内给卡片文字选一个字号：先保证行数/高度放得下，
 * 再通过「上一行挪一个字」消除孤字行，绝不让最后一个字单独一行。
 */
export function fitCardText(text: string, options: CardTextFitOptions): CardTextFit {
  const maxWidth = Math.max(1, options.maxWidth);
  const maxHeight = Math.max(1, options.maxHeight);
  // 全局像素字体：只尝试整数源像素档，行高吸附到整数物理像素。
  // 正文最小按当前物理屏宽算 k 档，绝不缩到非整数倍把像素字压糊。
  const bodyMin = options.allowBelowBody
    ? fontSizeStep()
    : Math.max(fontSizeStep(), pxFont(12));
  const base = Math.max(bodyMin, snapFontSize(options.fontSize));
  const min = Math.max(bodyMin, Math.min(base, snapFontSize(options.minFontSize ?? bodyMin)));
  const lineGap = options.lineGap ?? 0;

  let chosen: { lines: string[]; fontSize: number; lineHeight: number; width: number; height: number } | null = null;
  for (let fontSize = base; fontSize >= min - 0.001; fontSize -= fontSizeStep()) {
    const lines = wrapTextToLines(text, maxWidth, (line) => measureTextWidth(line, fontSize), {
      minLast: 4,
      protectHeader: true,
    });
    const lineHeight = snapLineHeight(fontSize, fontSize + lineGap);
    const width = lines.reduce((w, line) => Math.max(w, measureTextWidth(line, fontSize)), 0);
    const height = lines.length * lineHeight;
    if (width <= maxWidth + 0.001 && height <= maxHeight + 0.001) {
      chosen = { lines, fontSize, lineHeight, width, height };
      break;
    }
  }
  if (!chosen) {
    const lines = wrapTextToLines(text, maxWidth, (line) => measureTextWidth(line, min), {
      minLast: 4,
      protectHeader: true,
    });
    const lineHeight = snapLineHeight(min, min + lineGap);
    const width = lines.reduce((w, line) => Math.max(w, measureTextWidth(line, min)), 0);
    chosen = { lines, fontSize: min, lineHeight, width, height: lines.length * lineHeight };
  }

  return {
    text: chosen.lines.join('\n'),
    lines: chosen.lines,
    fontSize: chosen.fontSize,
    lineHeight: chosen.lineHeight,
    width: chosen.width,
    height: chosen.height,
  };
}
