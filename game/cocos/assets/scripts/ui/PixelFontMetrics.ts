/**
 * 全局像素位图字体的排印/物理像素换算（纯计算，不依赖 cc，方便单测）。
 *
 * Cocos 3.8 里 `screen.windowSize` 是物理像素（device pixels），
 * `view.getVisibleSize()` 是设计单位。项目设计分辨率 720×1280 Fit Height，
 * 所以：
 *
 *   physicalPerDesign = physicalScreenWidth / visibleWidth
 *   k = max(1, floor(physicalScreenWidth / 360))
 *   fontSize_design = 12 * sourceK * visibleWidth / physicalScreenWidth
 *
 * 这样 one source pixel 正好映射到 sourceK 个物理像素：
 *
 *   fontSize_design / 12 * physicalPerDesign = sourceK
 *
 * 正文字号 sourceK = k；标题 sourceK = 2k（放不下时允许 k+1）；
 * 按钮字号按 r26 反馈统一降到正文 k。
 */
import {
  BM_FONT_ADVANCES,
  BM_FONT_DEFAULT_ADVANCE,
  BM_FONT_LINE_HEIGHT,
  BM_FONT_NATIVE_SIZE,
} from './BmFontData';

export const PIXEL_FONT_STEP = BM_FONT_NATIVE_SIZE;

/** 项目真实设计分辨率（Cocos 项目设置 Fixed Height 720×1280）。 */
export const DESIGN_WIDTH = 720;
export const DESIGN_HEIGHT = 1280;
/** k 的物理屏宽基准：360 宽时 1 个源像素 = 1 个物理像素。 */
export const REFERENCE_WIDTH = 360;
/** 设计稿 720 宽即 360 基准的 2 倍；用于间距而不是字号。 */
export const UI_SCALE = DESIGN_WIDTH / REFERENCE_WIDTH;

/** 兼容旧导出：位图字体内置 1 源像素描边。 */
export const PIXEL_OUTLINE_WIDTH = Math.max(1, Math.round(1 * UI_SCALE));

export interface FontScreenMetrics {
  /** 物理像素宽（screen.windowSize.width）。 */
  physicalWidth?: number;
  /** 物理像素高（screen.windowSize.height）。 */
  physicalHeight?: number;
  /** 设计单位下的可视宽（view.getVisibleSize().width）。 */
  visibleWidth?: number;
  /** 设计单位下的可视高。 */
  visibleHeight?: number;
  /** 引擎限制后的 devicePixelRatio。 */
  devicePixelRatio?: number;
}

let currentVisibleWidth = DESIGN_WIDTH;
let currentVisibleHeight = DESIGN_HEIGHT;
let currentPhysicalWidth = DESIGN_WIDTH;
let currentPhysicalHeight = DESIGN_HEIGHT;
let currentDpr = 1;

function valid(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : fallback;
}

/**
 * 写入真实屏幕信息。physicalWidth 必须是物理像素：Cocos 3.8 的
 * screen.windowSize 已经是物理像素；若某平台拿到的是 CSS 宽，调用方负责
 * 先乘 devicePixelRatio 再传进来。
 */
export function setFontScreenMetrics(metrics: FontScreenMetrics): void {
  const physicalWidth = valid(metrics.physicalWidth, currentPhysicalWidth);
  const physicalHeight = valid(metrics.physicalHeight, currentPhysicalHeight);
  currentPhysicalWidth = physicalWidth;
  currentPhysicalHeight = physicalHeight;
  currentDpr = valid(metrics.devicePixelRatio, currentDpr);
  currentVisibleWidth = valid(metrics.visibleWidth, physicalWidth * DESIGN_HEIGHT / physicalHeight);
  currentVisibleHeight = valid(metrics.visibleHeight, DESIGN_HEIGHT);
}

/** 兼容旧单测/编辑器：没有屏幕信息时按 1 设计单位 = 1 物理像素处理。 */
export function setFontVisibleWidth(width: number): void {
  const value = valid(width, DESIGN_WIDTH);
  currentVisibleWidth = value;
  currentVisibleHeight = DESIGN_HEIGHT;
  currentPhysicalWidth = value;
  currentPhysicalHeight = DESIGN_HEIGHT;
  currentDpr = 1;
}

/** 只更新物理宽（保持当前设计可视宽），用于旋转/窗口变化后的重算。 */
export function setFontPhysicalWidth(width: number, height: number = currentPhysicalHeight): void {
  currentPhysicalWidth = valid(width, currentPhysicalWidth);
  currentPhysicalHeight = valid(height, currentPhysicalHeight);
}

export function getFontVisibleWidth(): number {
  return currentVisibleWidth;
}

export function getFontVisibleHeight(): number {
  return currentVisibleHeight;
}

export function getFontPhysicalWidth(): number {
  return currentPhysicalWidth;
}

export function getFontPhysicalHeight(): number {
  return currentPhysicalHeight;
}

export function getFontDevicePixelRatio(): number {
  return currentDpr;
}

/** 物理像素 / 设计单位。1 设计单位乘它会落在物理屏幕上。 */
export function physicalPixelsPerDesign(): number {
  return currentPhysicalWidth / currentVisibleWidth;
}

/**
 * r36（UI/UX #5）：像素图缩放按物理像素取整。
 * k = floor(目标物理高度 / 源图高度)，保证每个源像素正好占 k 个物理像素。
 */
export function sourcePixelScaleForTarget(
  targetPhysicalSize: number,
  sourceSize: number,
): number {
  const target = Math.max(0, Number.isFinite(targetPhysicalSize) ? targetPhysicalSize : 0);
  const source = Math.max(1, Math.floor(Number.isFinite(sourceSize) ? sourceSize : 1));
  return Math.max(1, Math.floor(target / source));
}

/** 节点 scale = k / devicePixelRatio（k 为每源像素的物理像素数）。 */
export function nodeScaleForSourcePixels(
  sourcePixelScale: number,
  devicePixelRatio: number = currentDpr,
): number {
  const k = Math.max(1, Math.floor(Number.isFinite(sourcePixelScale) ? sourcePixelScale : 1));
  const dpr = Math.max(1, Number.isFinite(devicePixelRatio) ? devicePixelRatio : 1);
  return k / dpr;
}

/** 每个源像素实际占用的物理像素数；必须为整数。 */
export function physicalPixelsPerSourcePixel(
  nodeScale: number,
  devicePixelRatio: number = currentDpr,
): number {
  return nodeScale * Math.max(1, devicePixelRatio);
}

/** 节点坐标吸附到整数物理像素（输入/输出均为设计单位）。 */
export function snapToPhysicalGrid(
  value: number,
  dpr: number = currentDpr,
): number {
  const density = Math.max(1e-6, physicalPixelsPerDesign());
  const ratio = Math.max(1, Number.isFinite(dpr) ? dpr : 1);
  // 以真实物理密度为准；dpr 只用于兜底，避免不同平台 windowSize 单位不一致。
  const perDesign = ratio > 0 && Number.isFinite(ratio) ? Math.max(density, 1e-6) : density;
  return Math.round(value * perDesign) / perDesign;
}

/** k = max(1, floor(physicalWidth / 360))。 */
export function fontScaleK(physicalWidth: number = currentPhysicalWidth): number {
  return Math.max(1, Math.floor(valid(physicalWidth, currentPhysicalWidth) / REFERENCE_WIDTH));
}

/** 每个源像素对应的设计字号。 */
export function fontSizeStep(
  visibleWidth: number = currentVisibleWidth,
  physicalWidth: number = currentPhysicalWidth,
): number {
  return BM_FONT_NATIVE_SIZE * visibleWidth / physicalWidth;
}

/** 指定源像素整数倍对应的设计字号（sourceScale 必须为整数）。 */
export function fontSizeForSourceScale(
  sourceScale: number,
  visibleWidth: number = currentVisibleWidth,
  physicalWidth: number = currentPhysicalWidth,
): number {
  const scale = Math.max(1, Math.round(sourceScale));
  return fontSizeStep(visibleWidth, physicalWidth) * scale;
}

function inferredPhysicalWidth(width: number, physicalWidth?: number): number {
  if (physicalWidth && physicalWidth > 0) return physicalWidth;
  // 显式传入一个和历史 API 一样的宽度时，把它当作 1:1 物理/设计模拟。
  return width === currentVisibleWidth ? currentPhysicalWidth : width;
}

/** 正文档：sourceK = k，字高 ≈ 屏宽/30。 */
export function bodySourceScale(physicalWidth: number = currentPhysicalWidth): number {
  return fontScaleK(physicalWidth);
}

/** 标题档：sourceK = 2k（至少比正文大一个整数源像素档）。 */
export function titleSourceScale(physicalWidth: number = currentPhysicalWidth): number {
  return bodySourceScale(physicalWidth) * 2;
}

/** 按钮档：r26 起按钮文字与正文同档（k），不再用标题档。 */
export function buttonSourceScale(physicalWidth: number = currentPhysicalWidth): number {
  return bodySourceScale(physicalWidth);
}

export function bodyFontSizeForWidth(
  width: number = currentVisibleWidth,
  physicalWidth?: number,
): number {
  const pw = inferredPhysicalWidth(width, physicalWidth);
  return fontSizeForSourceScale(bodySourceScale(pw), width, pw);
}

export function titleFontSizeForWidth(
  width: number = currentVisibleWidth,
  physicalWidth?: number,
): number {
  const pw = inferredPhysicalWidth(width, physicalWidth);
  return fontSizeForSourceScale(titleSourceScale(pw), width, pw);
}

/** 页脚档：正文同档，保证不小于 1/36 屏宽。 */
export function footerFontSizeForWidth(
  width: number = currentVisibleWidth,
  physicalWidth?: number,
): number {
  return bodyFontSizeForWidth(width, physicalWidth);
}

/**
 * 标题放不下时退到 k+1（仍是整数源像素档）。调用点传入实际可用宽度。
 */
export function titleFontSizeForText(
  text: string,
  maxWidth: number,
  width: number = currentVisibleWidth,
  physicalWidth?: number,
): number {
  const pw = inferredPhysicalWidth(width, physicalWidth);
  const k = bodySourceScale(pw);
  const preferred = k * 2;
  if (preferred <= k + 1) return fontSizeForSourceScale(preferred, width, pw);
  const preferredSize = fontSizeForSourceScale(preferred, width, pw);
  if (measurePixelTextWidth(text, preferredSize) <= maxWidth + 0.001) return preferredSize;
  return fontSizeForSourceScale(k + 1, width, pw);
}

/**
 * 把 UI/UX 稿的 360 宽逻辑字号换算成当前屏宽下的设计字号。
 * 12 = 正文 k，18 = 标题 2k，更大的字号继续按整数源像素档增加。
 */
export function pxFont(
  logicalPx: number,
  width: number = currentVisibleWidth,
  physicalWidth?: number,
): number {
  const value = Number.isFinite(logicalPx) && logicalPx > 0 ? logicalPx : 12;
  const pw = inferredPhysicalWidth(width, physicalWidth);
  const body = fontSizeForSourceScale(bodySourceScale(pw), width, pw);
  if (value <= 12) return body;
  const title = fontSizeForSourceScale(titleSourceScale(pw), width, pw);
  if (value <= 18) return title;
  // 24/30/36 逻辑字号继续按整数源像素档递增：3k / 4k / 5k。
  const extra = Math.max(1, Math.round((value - 18) / 6));
  return title + extra * body;
}

/** 设计稿间距（360 基准）换算到设计分辨率；间距不要求字号网格。 */
export function pxSpacing(logicalPx: number): number {
  const value = Number.isFinite(logicalPx) && logicalPx > 0 ? logicalPx : 0;
  return Math.round(value * UI_SCALE);
}

/** 1 CSS px 对应的设计单位（44 CSS 触摸高度等用）。 */
export function cssPxToDesign(cssPx: number): number {
  const cssWidth = currentPhysicalWidth / Math.max(1, currentDpr);
  const value = Number.isFinite(cssPx) && cssPx > 0 ? cssPx : 0;
  return value * currentVisibleWidth / Math.max(1, cssWidth);
}

/** 按钮最小触摸高度：约 44 CSS px。 */
export function buttonMinTouchHeight(): number {
  return cssPxToDesign(44);
}

/** 按钮左右内边距：至少 6 源像素 × k。 */
export function buttonPaddingX(): number {
  return bodyFontSizeForWidth() / 2;
}

/** 按钮上下内边距：至少 3 源像素 × k。 */
export function buttonPaddingY(): number {
  return bodyFontSizeForWidth() / 4;
}

/** 单个字符的 BMFont xadvance（native 12px 设计单位）。 */
export function pixelAdvanceUnits(ch: string): number {
  return BM_FONT_ADVANCES[ch] ?? BM_FONT_DEFAULT_ADVANCE;
}

/**
 * 按 BMFont xadvance 测量一行文字。
 * fontSize 是任意设计字号；物理缩放由 PixelFont 保证为整数源像素档。
 */
export function measurePixelTextWidth(text: string, fontSize: number): number {
  const scale = (Number.isFinite(fontSize) && fontSize > 0 ? fontSize : PIXEL_FONT_STEP)
    / BM_FONT_NATIVE_SIZE;
  let advance = 0;
  for (const ch of text) {
    if (ch === '\n' || ch === '\r') continue;
    advance += pixelAdvanceUnits(ch);
  }
  return advance * scale;
}

/** 把字号吸附到最近的整数源像素档（最小 1 档）。 */
export function snapFontSize(size: number, min?: number): number {
  const step = fontSizeStep();
  const value = Number.isFinite(size) && size > 0 ? size : step;
  const floorValue = Number.isFinite(min) && (min as number) > 0 ? (min as number) : step;
  const snapped = Math.max(1, Math.round(value / step)) * step;
  return Math.max(floorValue, snapped);
}

/** 给定字号的原生行高：sourceK * BMFont lineHeight（物理像素整数）。 */
export function lineHeightForFontSize(fontSize: number): number {
  const size = snapFontSize(fontSize);
  return (size / BM_FONT_NATIVE_SIZE) * BM_FONT_LINE_HEIGHT;
}

/** 行高至少是该字号的原生行高；显式更大行高吸附到整数物理像素。 */
export function snapLineHeight(fontSize: number, lineHeight?: number): number {
  const base = lineHeightForFontSize(fontSize);
  const value = Number.isFinite(lineHeight) && (lineHeight as number) > 0
    ? (lineHeight as number)
    : base;
  if (value <= base) return base;
  const physicalPerDesign = physicalPixelsPerDesign();
  const physical = Math.round(value * physicalPerDesign);
  return Math.max(base, physical / physicalPerDesign);
}

export interface FontSizeRow {
  width: number;
  /** 物理像素宽（与 width 相同，保留旧表语义）。 */
  physicalWidth: number;
  k: number;
  body: number;
  title: number;
  footer: number;
  bodyPhysical: number;
  titlePhysical: number;
}

/** 360/720/750 等宽度下的字号表，用于构建日志和测试。 */
export function fontSizeTable(widths: number[] = [360, 720, 750]): FontSizeRow[] {
  return widths.map((width) => {
    const k = fontScaleK(width);
    const body = bodyFontSizeForWidth(width, width);
    const title = titleFontSizeForWidth(width, width);
    return {
      width,
      physicalWidth: width,
      k,
      body,
      title,
      footer: footerFontSizeForWidth(width, width),
      bodyPhysical: 12 * k,
      titlePhysical: 24 * k,
    };
  });
}

export interface DeviceFontMetrics extends FontSizeRow {
  physicalHeight: number;
  visibleWidth: number;
  devicePixelRatio: number;
  step: number;
  buttonHeight: number;
  buttonPaddingX: number;
  buttonPaddingY: number;
}

/**
 * 按真实设备物理宽高（Fit Height 1280）计算 k 表。
 * physicalHeight 缺省按 16:9 竖屏估算。
 */
export function fontMetricsForDevice(
  physicalWidth: number,
  physicalHeight: number = physicalWidth * 16 / 9,
  devicePixelRatio: number = 1,
): DeviceFontMetrics {
  const pw = valid(physicalWidth, DESIGN_WIDTH);
  const ph = valid(physicalHeight, pw * 16 / 9);
  const visibleWidth = DESIGN_HEIGHT * pw / ph;
  const k = fontScaleK(pw);
  const step = fontSizeStep(visibleWidth, pw);
  const body = step * k;
  const title = step * 2 * k;
  const pxPerCss = Math.max(1, devicePixelRatio);
  const lineHeight = (body / BM_FONT_NATIVE_SIZE) * BM_FONT_LINE_HEIGHT;
  const padX = body / 2;
  const padY = body / 4;
  return {
    width: pw,
    physicalWidth: pw,
    physicalHeight: ph,
    visibleWidth,
    devicePixelRatio: pxPerCss,
    k,
    body,
    title,
    footer: body,
    bodyPhysical: 12 * k,
    titlePhysical: 24 * k,
    step,
    buttonHeight: Math.max(lineHeight + padY * 2, 44 * visibleWidth / (pw / pxPerCss)),
    buttonPaddingX: padX,
    buttonPaddingY: padY,
  };
}
