/**
 * 地点页底部竖直排版（纯计算，不依赖 cc，方便多机型单测）。
 *
 * r30 修复：
 *   背包格区 → ≥8 设计 px → 按住体力提示条 → ≥8 设计 px → 「换地点/回家」按钮
 * 背包格区高度按可视区域自适应：3 行用 80px 格，4 行降到 64px 格，
 * 保证任何一档都不会压到提示条和按钮。
 */
export interface RectLike {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface LocationBottomLayoutInput {
  visibleW: number;
  visibleH: number;
  safeBottom: number;
  bagW: number;
  bagH: number;
  buttonHeight: number;
  /** 按住体力提示条高度（两行文字预留）。 */
  holdHintHeight: number;
  /** 按住体力提示条宽度。 */
  holdHintWidth?: number;
  /** 「拖动 / 单击物品放入背包」提示高度。 */
  normalHintHeight: number;
  /** 「拖动 / 单击物品放入背包」提示宽度。 */
  normalHintWidth?: number;
  /** 地面战利品行的视觉底边（设计坐标）。 */
  floorBottom: number;
  /** 按钮底边到安全区底边的距离（设计 px）。 */
  bottomMargin?: number;
  /** 背包格与提示条、提示条与按钮之间的最小间距（设计 px）。 */
  gap?: number;
  /** 常驻「拖动 / 单击物品放入背包」提示与背包格顶边的间距。 */
  normalHintGap?: number;
}

export interface LocationBottomLayout {
  buttonTop: number;
  buttonHeight: number;
  holdHint: { centerY: number; height: number; rect: RectLike };
  bag: {
    cell: number;
    width: number;
    height: number;
    centerY: number;
    rect: RectLike;
  };
  normalHint: { centerY: number; height: number; rect: RectLike };
  floorBottom: number;
}

/** 底部元素之间的最小间距：8 设计 px。 */
export const LOCATION_BOTTOM_GAP = 8;
/** 背包格首选 80（16px 图标 ×4），四行时降到 64（×3）。 */
export const BAG_CELL_LARGE = 80;
export const BAG_CELL_SMALL = 64;
export const BAG_CELL_TINY = 48;

function makeRect(centerY: number, width: number, height: number): RectLike {
  return {
    left: -width / 2,
    right: width / 2,
    top: centerY + height / 2,
    bottom: centerY - height / 2,
  };
}

/** 背包图标/底板/光环保留整数源像素倍：80→4x，64→3x，48→2x。 */
export function bagVisualSizes(cell: number): { icon: number; plate: number; glow: number } {
  if (cell >= BAG_CELL_LARGE) return { icon: 64, plate: 72, glow: 80 };
  if (cell >= BAG_CELL_SMALL) return { icon: 48, plate: 56, glow: 64 };
  return { icon: 32, plate: 40, glow: 48 };
}

/**
 * 从下往上排按钮、提示条、背包格；背包格高度不够时按 80→64→48 降格，
 * 再不够才用可用高度均分（仍保证提示条和按钮之间各 8px）。
 */
export function computeLocationBottomLayout(input: LocationBottomLayoutInput): LocationBottomLayout {
  const visibleH = Math.max(1, input.visibleH);
  const gap = Math.max(0, input.gap ?? LOCATION_BOTTOM_GAP);
  const normalHintGap = Math.max(0, input.normalHintGap ?? gap);
  const bottomMargin = Math.max(0, input.bottomMargin ?? 0);
  const bagW = Math.max(1, input.bagW);
  const bagH = Math.max(1, input.bagH);
  const buttonHeight = Math.max(1, input.buttonHeight);
  const holdHintHeight = Math.max(1, input.holdHintHeight);
  const holdHintWidth = Math.max(1, input.holdHintWidth ?? input.visibleW * 0.8);
  const normalHintHeight = Math.max(1, input.normalHintHeight);
  const normalHintWidth = Math.max(1, input.normalHintWidth ?? input.visibleW * 0.8);
  const floorBottom = input.floorBottom;

  // 1) 按钮贴安全区底边。
  const buttonBottom = -visibleH / 2 + Math.max(0, input.safeBottom) + bottomMargin;
  const buttonTop = buttonBottom + buttonHeight;

  // 2) 按住提示条整个在按钮上方 8px。
  const holdHintBottom = buttonTop + gap;
  const holdHintCenter = holdHintBottom + holdHintHeight / 2;

  // 3) 背包格区底边再在提示条上方 8px。
  const bagBottom = holdHintBottom + holdHintHeight + gap;

  // 4) 背包顶边之上还要放常驻拖放提示和地面物品行。
  const normalHintTopLimit = floorBottom - gap;
  const normalHintBottomLimit = normalHintTopLimit - normalHintHeight;
  const bagTopLimit = normalHintBottomLimit - gap;
  // bagTopLimit 在 bagBottom 上方，可用高度 = 上界 - 下界。
  const available = Math.max(1, bagTopLimit - bagBottom);

  let cell = BAG_CELL_TINY;
  for (const candidate of [BAG_CELL_LARGE, BAG_CELL_SMALL, BAG_CELL_TINY]) {
    if (candidate * bagH <= available + 0.001) {
      cell = candidate;
      break;
    }
  }
  if (cell * bagH > available + 0.001) {
    cell = Math.max(1, Math.floor(available / bagH));
  }

  const bagHeight = cell * bagH;
  const bagWidth = cell * bagW;
  const bagCenterY = bagBottom + bagHeight / 2;
  const bagTop = bagBottom + bagHeight;

  // 常驻提示放在格子正上方 normalHintGap；如果顶部空间更紧，才被上界收住。
  const normalHintCenter = Math.min(
    normalHintTopLimit - normalHintHeight / 2,
    bagTop + normalHintGap + normalHintHeight / 2,
  );

  return {
    buttonTop,
    buttonHeight,
    holdHint: {
      centerY: holdHintCenter,
      height: holdHintHeight,
      rect: makeRect(holdHintCenter, holdHintWidth, holdHintHeight),
    },
    bag: {
      cell,
      width: bagWidth,
      height: bagHeight,
      centerY: bagCenterY,
      rect: makeRect(bagCenterY, bagWidth, bagHeight),
    },
    normalHint: {
      centerY: normalHintCenter,
      height: normalHintHeight,
      rect: makeRect(normalHintCenter, normalHintWidth, normalHintHeight),
    },
    floorBottom,
  };
}
