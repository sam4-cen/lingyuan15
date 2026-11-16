/**
 * r28/r29 共用的「安全可视区域」计算（纯函数，不依赖 cc）。
 *
 * 内容区 = 顶栏下沿 ~ 底栏上沿；headerTop 已包含顶部刘海/胶囊安全区，
 * 底栏贴在 safeBottom 之上，所以底边还要再扣 safeBottom。
 */
export interface SafeContentAreaInput {
  visibleH: number;
  headerTop: number;
  hudHeight: number;
  barHeight: number;
  safeBottom?: number;
}

export interface SafeContentArea {
  top: number;
  bottom: number;
  height: number;
}

export function computeSafeContentArea(input: SafeContentAreaInput): SafeContentArea {
  const safeBottom = Math.max(0, input.safeBottom ?? 0);
  const top = input.visibleH / 2 - Math.max(0, input.headerTop) - Math.max(0, input.hudHeight);
  const bottom = -input.visibleH / 2 + safeBottom + Math.max(0, input.barHeight);
  return { top, bottom, height: Math.max(1, top - bottom) };
}
