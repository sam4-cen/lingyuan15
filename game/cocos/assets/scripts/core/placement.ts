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
