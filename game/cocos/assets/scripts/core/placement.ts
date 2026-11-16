/**
 * 背包格子摆放的纯数学工具（不依赖 Cocos，方便单测）。
 * 坐标系与 LocationView 的 bagContainer 本地坐标一致：原点在背包中心，y 向上。
 */

export interface Point2 {
  x: number;
  y: number;
}

/** 背包中 (x,y) 起、占 w×h 格的矩形中心。 */
export function bagCellCenter(
  bagW: number,
  bagH: number,
  cellSize: number,
  x: number,
  y: number,
  w: number,
  h: number,
): Point2 {
  const totalW = bagW * cellSize;
  const totalH = bagH * cellSize;
  return {
    x: -totalW / 2 + x * cellSize + (w * cellSize) / 2,
    y: totalH / 2 - y * cellSize - (h * cellSize) / 2,
  };
}

/**
 * 已知节点锚点和节点尺寸时，把「视觉中心」对准 target 所需的节点 position。
 * Cocos 中 anchor=(0.5,0.5) 时 position 就是视觉中心；
 * anchor=(0,0) 时需要把节点往左下挪半个尺寸。
 */
export function positionForAnchor(
  target: Point2,
  anchor: Point2,
  size: { width: number; height: number },
): Point2 {
  return {
    x: target.x + (anchor.x - 0.5) * size.width,
    y: target.y + (anchor.y - 0.5) * size.height,
  };
}

export interface FloorLootStyle {
  icon: number;
  plate: number;
  glow: number;
}

/**
 * 地面战利品的基础尺寸回到 1x（16px 原图 ×4 = 64）。
 * 4 件起整体缩小（图标和底板一起），保证单行不重叠。
 */
export function floorLootStyle(count: number, safeW: number): FloorLootStyle {
  const n = Math.max(1, count);
  // 1x 基础档 64；4 件起降到 48；10 件起降到 32
  const candidates = n <= 3 ? [64, 48, 32] : n <= 9 ? [48, 32] : [32];
  for (const icon of candidates) {
    const plate = icon + 8;
    if (n * plate + Math.max(0, n - 1) * 4 <= safeW) {
      return { icon, plate, glow: icon + 32 };
    }
  }
  return { icon: 32, plate: 40, glow: 64 };
}

/** 第 index 件物品在单行地面布局中的 x；相邻间距不小于底板宽度。 */
export function floorSlotX(
  index: number,
  count: number,
  plate: number,
  safeW: number,
): number {
  const n = Math.max(1, count);
  const spacing = n <= 1 ? 0 : Math.min(plate + 4, safeW / (n - 1));
  const totalW = (n - 1) * spacing;
  return -totalW / 2 + index * spacing;
}
