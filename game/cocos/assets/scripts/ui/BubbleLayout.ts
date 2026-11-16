import { fontSizeStep, measurePixelTextWidth, pxFont, snapFontSize, snapLineHeight } from './PixelFontMetrics';
import {
  balanceOrphanLine as balanceWordOrphanLine,
  meaningfulCharCount,
  splitWordUnits,
  wrapTextToLines,
} from './WordBreak';

export { COPY_CORPUS, allWordBreakTexts } from './WordBreakCorpus';
export { meaningfulCharCount };

/** 兼容旧导入：断点不再依赖手写保护词表。 */
export const EXTRA_NO_BREAK_TERMS: string[] = [];
export const AUTO_NO_BREAK_TERMS: string[] = [];
export const NO_BREAK_TERMS: string[] = [];
export function extractNoBreakTerms(): string[] {
  return [];
}

export interface SpeechBubbleOptions {
  fontSize?: number;
  lineHeight?: number;
  /** 左右内边距（气泡边缘到文字）。 */
  padX?: number;
  /** 上下内边距。 */
  padY?: number;
  minWidth?: number;
  maxWidth?: number;
  /** 最小字号；默认 body（12×设计缩放 = 24 @720）。 */
  minFontSize?: number;
}

export interface SpeechBubbleMetrics {
  width: number;
  height: number;
  fontSize: number;
  lineHeight: number;
  /** 文字本身占用的宽度（不含内边距）。 */
  textWidth: number;
  lineCount: number;
}

/** 用 BMFont xadvance 的真实字宽测量一段中文/中英混排文字。 */
export function measureTextWidth(text: string, fontSize: number): number {
  return measurePixelTextWidth(text, fontSize);
}

/**
 * 把一段文字拆成换行单元：只按 Intl.Segmenter 词边界/价格/日期/显式换行切分。
 * 保留旧 API 名称，供 Share/测试复用。
 */
export function splitWrapUnits(text: string): string[] {
  return splitWordUnits(text);
}

/** 避免最后一行只剩 1~3 个有效字：把上一行末尾的整词按词边界挪下来。 */
export function balanceOrphanLine(
  lines: string[],
  options: { minLast?: number; maxWidth?: number; fontSize?: number } = {},
): string[] {
  const measure = options.fontSize != null
    ? (text: string) => measureTextWidth(text, options.fontSize as number)
    : undefined;
  return balanceWordOrphanLine(lines, { ...options, measure });
}

export interface WrappedSpeechBubbleMetrics extends SpeechBubbleMetrics {
  /** 带显式换行的最终文本。 */
  text: string;
  lines: string[];
}

/**
 * 拾荒页台词气泡：按最大宽度做词边界平衡断行，禁止逐字换行和孤行。
 */
export function layoutWrappedSpeechBubble(
  text: string,
  options: SpeechBubbleOptions = {},
): WrappedSpeechBubbleMetrics {
  const bodySize = Math.max(fontSizeStep(), pxFont(12));
  const fontSize = snapFontSize(Math.max(bodySize, options.fontSize ?? bodySize));
  const padX = Math.max(0, options.padX ?? 14);
  const padY = Math.max(0, options.padY ?? 10);
  const minWidth = Math.max(1, options.minWidth ?? 120);
  const maxWidth = Math.max(minWidth, options.maxWidth ?? Number.POSITIVE_INFINITY);
  const available = Math.max(1, maxWidth - padX * 2);

  const lines = wrapTextToLines(
    text,
    available,
    (line) => measureTextWidth(line, fontSize),
    { minLast: 4, protectHeader: false },
  );
  const textWidth = lines.reduce((w, line) => Math.max(w, measureTextWidth(line, fontSize)), 0);
  const width = Math.max(minWidth, Math.min(maxWidth, Math.ceil(textWidth + padX * 2)));
  const lineHeight = snapLineHeight(fontSize, options.lineHeight ?? fontSize);
  return {
    width,
    height: Math.ceil(lines.length * lineHeight + padY * 2),
    fontSize,
    lineHeight,
    textWidth,
    lineCount: lines.length,
    text: lines.join('\n'),
    lines,
  };
}

export function layoutSpeechBubble(text: string, options: SpeechBubbleOptions = {}): SpeechBubbleMetrics {
  // 全局像素字体只用整数源像素档；正文默认 k 档。
  const bodySize = Math.max(fontSizeStep(), pxFont(12));
  const baseFontSize = snapFontSize(Math.max(bodySize, options.fontSize ?? bodySize));
  const minFontSize = snapFontSize(Math.max(bodySize, options.minFontSize ?? bodySize));
  const padX = Math.max(0, options.padX ?? 14);
  const padY = Math.max(0, options.padY ?? 10);
  const minWidth = Math.max(1, options.minWidth ?? 120);
  const maxWidth = Math.max(minWidth, options.maxWidth ?? Number.POSITIVE_INFINITY);

  let fontSize = baseFontSize;
  let textWidth = measureTextWidth(text, fontSize);
  let width = Math.min(maxWidth, Math.max(minWidth, textWidth + padX * 2));

  if (textWidth + padX * 2 > maxWidth) {
    // 超过最大宽度时不折行：按一个源像素档降字号，保持整句一行。
    const available = Math.max(1, maxWidth - padX * 2);
    fontSize = minFontSize;
    for (let size = baseFontSize; size >= minFontSize - 0.001; size -= fontSizeStep()) {
      if (measureTextWidth(text, size) <= available) {
        fontSize = size;
        break;
      }
    }
    textWidth = measureTextWidth(text, fontSize);
    width = Math.min(maxWidth, Math.max(minWidth, textWidth + padX * 2));
    // 最小正文仍放不下：气泡只比最大宽度多撑出一点点，绝不裁字或折出孤字。
    if (textWidth + padX * 2 > maxWidth) {
      width = Math.max(minWidth, Math.ceil(textWidth + padX * 2));
    }
  }

  const lineHeight = snapLineHeight(fontSize, options.lineHeight ?? fontSize);
  return {
    width: Math.ceil(width),
    height: Math.ceil(lineHeight + padY * 2),
    fontSize,
    lineHeight,
    textWidth,
    lineCount: 1,
  };
}

/**
 * 地标气泡的安全 y：优先放到背包格子上方，并保证不压到地面物品。
 * 返回的坐标是气泡中心（与 LocationView 的 viewNode 坐标系一致）。
 */
export function placeBubbleAboveBag(
  bagTop: number,
  bubbleHeight: number,
  floorBottom: number,
  gap: number = 8,
): { y: number; fits: boolean } {
  const above = bagTop + gap + bubbleHeight / 2;
  // 尾巴伸到气泡下方 8px，顶部只需留 2px 不碰地面物品即可。
  const maxY = floorBottom - 2 - bubbleHeight / 2;
  if (above <= maxY) return { y: above, fits: true };
  return { y: above, fits: false };
}

export interface BubbleRect {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface SpeechBubblePlacement {
  x: number;
  y: number;
  /** 需要把提示文字水平挪动的距离；0 表示不用挪。 */
  hintShiftX: number;
  /** 气泡是否同时避开了背包、地面物品和提示文字。 */
  fits: boolean;
}

/** 两个矩形是否相交（gap 为要求的额外间距）。 */
export function rectsOverlap(a: BubbleRect, b: BubbleRect, gap: number = 0): boolean {
  return a.left < b.right + gap && a.right > b.left - gap
    && a.top > b.bottom - gap && a.bottom < b.top + gap;
}

/**
 * 把地标气泡放在背包上方，同时避开地面物品和底部提示文字。
 */
export function placeSpeechBubble(input: {
  desiredX: number;
  width: number;
  height: number;
  halfW: number;
  bagTop: number;
  floorBottom: number;
  hint: BubbleRect;
  margin?: number;
  gap?: number;
}): SpeechBubblePlacement {
  const margin = input.margin ?? 8;
  const gap = input.gap ?? 10;
  const yPlacement = placeBubbleAboveBag(input.bagTop, input.height, input.floorBottom);
  const y = yPlacement.y;
  const minX = -input.halfW + input.width / 2 + margin;
  const maxX = input.halfW - input.width / 2 - margin;
  const clampX = (value: number): number => {
    if (minX > maxX) return 0;
    return Math.max(minX, Math.min(maxX, value));
  };

  let x = clampX(input.desiredX);
  const bubbleRect = (): BubbleRect => ({
    left: x - input.width / 2,
    right: x + input.width / 2,
    top: y + input.height / 2,
    bottom: y - input.height / 2,
  });

  let hintShiftX = 0;
  if (rectsOverlap(bubbleRect(), input.hint, gap)) {
    const leftX = Math.min(x, input.hint.left - gap - input.width / 2);
    const rightX = Math.max(x, input.hint.right + gap + input.width / 2);
    const leftPossible = leftX >= minX - 0.001;
    const rightPossible = rightX <= maxX + 0.001;
    if (leftPossible && (!rightPossible || Math.abs(leftX - x) <= Math.abs(rightX - x))) {
      x = clampX(leftX);
    } else if (rightPossible) {
      x = clampX(rightX);
    }
  }

  if (rectsOverlap(bubbleRect(), input.hint, gap)) {
    if (x <= (input.hint.left + input.hint.right) / 2) {
      const shift = (x + input.width / 2 + gap) - input.hint.left;
      if (input.hint.right + shift <= input.halfW - margin + 0.001) hintShiftX = shift;
    } else {
      const shift = (x - input.width / 2 - gap) - input.hint.right;
      if (input.hint.left + shift >= -input.halfW + margin - 0.001) hintShiftX = shift;
    }
  }

  const shiftedHint: BubbleRect = {
    left: input.hint.left + hintShiftX,
    right: input.hint.right + hintShiftX,
    top: input.hint.top,
    bottom: input.hint.bottom,
  };
  const fits = yPlacement.fits && !rectsOverlap(bubbleRect(), shiftedHint, gap);
  return { x, y, hintShiftX, fits };
}
