import { DESIGN_HEIGHT, DESIGN_WIDTH, lineHeightForFontSize, measurePixelTextWidth } from './PixelFontMetrics';
import { computeSafeContentArea } from './SafeAreaLayout';

/**
 * 地图在「顶栏 HUD 底边」与「底部操作栏顶边」之间等比缩放。
 * 纯计算，不依赖 cc，方便在 Node 里覆盖 9:16 / 9:19.5 / 9:20。
 */
export interface MapLayoutInput {
  /** 当前可视高度（设计坐标）。Fixed Height 下通常 = 1280。 */
  visibleH: number;
  /** 当前可视宽度（设计坐标）。cover 时宽度不足会按宽度放大。 */
  visibleW?: number;
  /** 顶部刘海/胶囊占用高度（已包含顶部安全区）。 */
  headerTop: number;
  /** 顶部 HUD 压暗条高度。 */
  hudHeight: number;
  /** 底部操作栏高度。 */
  barHeight: number;
  /** 底部安全区高度（设计坐标）。底栏顶边 = -visibleH/2 + safeBottom + barHeight。 */
  safeBottom?: number;
  /** 地点图标边长。 */
  iconSize: number;
  /** 地名牌高度。 */
  plateHeight: number;
}

export interface MapLayout {
  /** 地图底图与点位共用的缩放（cover：宽高都铺满，多出的上下部分裁切）。 */
  scale: number;
  /** 地图底图中心的世界 y。 */
  centerY: number;
  /** 可放点位/名牌的区域（已扣掉顶栏、底栏和上下安全区）。 */
  areaTop: number;
  areaBottom: number;
  /** 地图底图实际显示范围；cover 后宽高都可能超出内容区。 */
  mapRect: { left: number; right: number; top: number; bottom: number };
  /** 按宽度铺满所需的最小缩放。 */
  widthScale: number;
  /** 按高度 fit 的缩放。 */
  heightScale: number;
}

/** 点位/名牌与可视区边界至少留出的设计 px。 */
export const MAP_MARKER_MARGIN = 8;
/** 图标底边与地名牌顶边之间的固定间距（GameRoot 实际摆放值）。 */
export const MAP_PLATE_GAP = 2;

/** 地图原图 360×640 上的原始点位范围（8 个地点）。 */
export const MAP_RAW_X_MIN = -234;
export const MAP_RAW_X_MAX = 242;
export const MAP_RAW_Y_MIN = -302;
export const MAP_RAW_Y_MAX = 518;

export function computeMapLayout(input: MapLayoutInput): MapLayout {
  // headerTop 已经包含顶部安全区；底栏固定在安全区上方，所以底边还要再扣 safeBottom。
  // 与事件页共用同一套 r28/r29 安全可视区域计算。
  const area = computeSafeContentArea({
    visibleH: input.visibleH,
    headerTop: input.headerTop,
    hudHeight: input.hudHeight,
    barHeight: input.barHeight,
    safeBottom: input.safeBottom,
  });
  const areaTop = area.top;
  const areaBottom = area.bottom;
  const areaHeight = area.height;
  // r32：cover。先按高度 fit；若宽度不足，再按宽度放大铺满。
  // 地图原图 360×640，在 720 设计宽下按 2 倍显示为 DESIGN_WIDTH×DESIGN_HEIGHT。
  const visibleW = Math.max(1, input.visibleW ?? DESIGN_WIDTH);
  const heightScale = Math.max(0.001, areaHeight / DESIGN_HEIGHT);
  const widthScale = Math.max(0.001, visibleW / DESIGN_WIDTH);
  const scale = Math.max(heightScale, widthScale);
  const centerY = (areaTop + areaBottom) / 2;
  const halfMapW = (DESIGN_WIDTH * scale) / 2;
  const halfMapH = (DESIGN_HEIGHT * scale) / 2;
  return {
    scale,
    centerY,
    areaTop,
    areaBottom,
    widthScale,
    heightScale,
    mapRect: {
      left: -halfMapW,
      right: halfMapW,
      top: centerY + halfMapH,
      bottom: centerY - halfMapH,
    },
  };
}

/** 原始 360×640 点位 → 设计坐标。 */
export function mapPointToScreen(x: number, y: number, layout: MapLayout): { x: number; y: number } {
  return {
    x: (x - DESIGN_WIDTH / 4) * 2 * layout.scale,
    y: layout.centerY + (DESIGN_HEIGHT / 4 - y) * 2 * layout.scale,
  };
}

/** 兜底：即使点位数据异常，也把图标+名牌夹在操作栏和 HUD 之间。 */
export function clampMapMarkerY(
  y: number,
  layout: MapLayout,
  iconSize: number,
  plateHeight: number,
): number {
  const top = layout.areaTop - iconSize / 2 - MAP_MARKER_MARGIN;
  const bottom = layout.areaBottom + iconSize / 2 + plateHeight + MAP_PLATE_GAP + MAP_MARKER_MARGIN;
  if (top < bottom) return (top + bottom) / 2;
  return Math.max(bottom, Math.min(top, y));
}

export interface MapMarkerOptions {
  iconSize: number;
  plateWidth: number;
  plateHeight: number;
  /** 当前可视半宽（UILayout.halfW）。 */
  halfW: number;
  safeLeft?: number;
  safeRight?: number;
  /** 左右与可视边缘的最小间距，默认 MAP_MARKER_MARGIN。 */
  margin?: number;
}

export interface MapRect {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface MapMarkerPlacement {
  /** 图标中心（也是地名牌水平中心）。 */
  x: number;
  y: number;
  icon: MapRect;
  plate: MapRect;
}

/**
 * 把原始地图点位换算成屏幕坐标，并把「图标 + 下方地名牌」整体夹进安全可视区。
 * 纯计算，和 GameRoot.showMap 使用同一套逻辑，方便在 Node 里覆盖多种机型。
 */
export function placeMapMarker(
  rawX: number,
  rawY: number,
  layout: MapLayout,
  options: MapMarkerOptions,
): MapMarkerPlacement {
  const iconSize = options.iconSize;
  const plateWidth = Math.max(iconSize, options.plateWidth);
  const plateHeight = options.plateHeight;
  const halfW = options.halfW;
  const margin = Math.max(0, options.margin ?? MAP_MARKER_MARGIN);
  const safeLeft = Math.max(0, options.safeLeft ?? 0);
  const safeRight = Math.max(0, options.safeRight ?? 0);
  const screen = mapPointToScreen(rawX, rawY, layout);
  const markerHalfW = plateWidth / 2;
  const left = -halfW + safeLeft + margin + markerHalfW;
  const right = halfW - safeRight - margin - markerHalfW;
  const x = left <= right ? Math.max(left, Math.min(right, screen.x)) : 0;
  const y = clampMapMarkerY(screen.y, layout, iconSize, plateHeight);
  const plateTop = y - iconSize / 2 - MAP_PLATE_GAP;
  return {
    x,
    y,
    icon: {
      left: x - iconSize / 2,
      right: x + iconSize / 2,
      top: y + iconSize / 2,
      bottom: y - iconSize / 2,
    },
    plate: {
      left: x - plateWidth / 2,
      right: x + plateWidth / 2,
      top: plateTop,
      bottom: plateTop - plateHeight,
    },
  };
}


/** r39：小牌固定贴在名字牌左右侧/下方时，间距 2 设计 px。 */
export const MAP_BADGE_OFFSET = 2;
export const MAP_BADGE_PLATE_GAP = 2;
/** r39 定稿：小牌文字永远是「限定」，不许退化成无字小点。 */
export const MAP_BADGE_TEXT = '限定';
/** 小牌字号下限：10 CSS px（由调用方按屏宽换算成设计字号）。 */
export const MAP_BADGE_MIN_FONT_CSS = 10;
/** 候选位置与障碍物之间至少留 2 设计 px。 */
export const MAP_BADGE_CLEARANCE = 2;

export interface MapBadgeBounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/**
 * r39 候选顺序（UI/UX 定稿）：
 *   right → left → below → merged
 * merged 表示把「限定」红牌并进名字牌左端，不再有上方/印章等回退。
 */
export type MapBadgeSide = 'right' | 'left' | 'below' | 'merged';

export interface MapBadgePlacement {
  /** 「限定」红牌的几何中心（merged 时是名字牌内红段的中心）。 */
  centerX: number;
  centerY: number;
  /** 「限定」红牌本身；merged 时高度与名字牌一致。 */
  rect: MapRect;
  side: MapBadgeSide;
  /** 角标与地名牌的最近距离（设计 px）；merged 时为 0。 */
  gap: number;
  /** true 表示已并进名字牌左端（red segment + 原名字牌整体加宽）。 */
  merged?: boolean;
  /**
   * merged 时整块名字牌（红段 + 原名牌）的外包围盒；
   * 非 merged 时等于原名字牌。
   */
  plateRect?: MapRect;
  /** merged 时原名字牌需要相对图标中心平移的 x（设计 px）。 */
  plateShiftX?: number;
  /** 需要画连接线时，从角标到名字牌边的局部线段。 */
  connector?: { x1: number; y1: number; x2: number; y2: number } | null;
}

/** 两个轴对齐矩形之间的最短距离；相交为 0。 */
export function rectDistance(a: MapRect, b: MapRect): number {
  const dx = Math.max(0, b.left - a.right, a.left - b.right);
  const dy = Math.max(0, b.bottom - a.top, a.bottom - b.top);
  return Math.hypot(dx, dy);
}

/** 与另一个矩形的距离是否小于 minDistance（相交自然也算太近）。 */
export function rectsWithinDistance(a: MapRect, b: MapRect, minDistance: number): boolean {
  return rectDistance(a, b) < Math.max(0, minDistance) - 0.001;
}

function rectsOverlapStrict(a: MapRect, b: MapRect): boolean {
  return a.left < b.right - 0.001 && a.right > b.left + 0.001
    && a.top > b.bottom + 0.001 && a.bottom < b.top - 0.001;
}

function insideBounds(rect: MapRect, bounds: MapBadgeBounds, margin: number): boolean {
  return rect.left >= bounds.left + margin - 0.001
    && rect.right <= bounds.right - margin + 0.001
    && rect.bottom >= bounds.bottom + margin - 0.001
    && rect.top <= bounds.top - margin + 0.001;
}

/** 兼容旧导出：调用方仍可传 minClearance；r39 默认留 2px。 */
export const MAP_BADGE_MIN_CLEARANCE = MAP_BADGE_CLEARANCE;

/**
 * r39（UI/UX 定稿）：「限定」小牌候选顺序固定为
 *   1) 名字牌右侧，垂直居中，间距 2px；
 *   2) 名字牌左侧，垂直居中，间距 2px；
 *   3) 名字牌正下方，水平居中，间距 2px；
 *   4) 并进名字牌左端：红底「限定」+ 原名牌整体加宽，再以图标为中心对齐，
 *      超出地图边缘时往内收。
 * 每个独立候选都必须完全在地图可视区内，且与 blockers（含自家图标、玩家）
 * 至少留 2px。候选 4 是最终兜底，只做边界内收，绝不会缩成无字小点。
 *
 * blockers 与 plate 使用同一坐标系（GameRoot 传世界坐标，单测可传局部坐标）。
 * GameRoot 会把「自家图标」也放进 blockers，只排除自家名字牌本身。
 */
export function computeBadgeUnderPlate(
  plate: MapRect,
  badgeW: number,
  badgeH: number,
  options: {
    gap?: number;
    blockers?: MapRect[];
    bounds?: MapBadgeBounds;
    margin?: number;
    /** 与障碍物的最小安全距离；默认 2，即所有候选之间至少留 2px。 */
    minClearance?: number;
    /** 仅 merged 兜底使用的障碍；GameRoot 传玩家/自家图标，邻居名牌允许靠近。 */
    mergedBlockers?: MapRect[];
  } = {},
): MapBadgePlacement {
  const w = Math.max(1, badgeW);
  const h = Math.max(1, badgeH);
  const gap = Math.max(0, Math.min(options.gap ?? MAP_BADGE_OFFSET, 4));
  const blockers = options.blockers ?? [];
  const minClearance = Math.max(0, options.minClearance ?? MAP_BADGE_CLEARANCE);
  const margin = Math.max(0, options.margin ?? 0);
  const plateCenterY = (plate.top + plate.bottom) / 2;
  const plateCenterX = (plate.left + plate.right) / 2;
  const plateW = Math.max(0, plate.right - plate.left);

  const make = (left: number, bottom: number, side: MapBadgeSide): MapBadgePlacement => {
    const rect: MapRect = { left, right: left + w, top: bottom + h, bottom };
    return {
      centerX: (rect.left + rect.right) / 2,
      centerY: (rect.top + rect.bottom) / 2,
      rect,
      side,
      gap,
      merged: false,
      plateRect: plate,
      plateShiftX: 0,
      connector: null,
    };
  };

  const safe = (candidate: MapBadgePlacement): boolean => {
    if (options.bounds && !insideBounds(candidate.rect, options.bounds, margin)) return false;
    for (const blocker of blockers) {
      if (minClearance > 0
        ? rectsWithinDistance(candidate.rect, blocker, minClearance)
        : rectsOverlapStrict(candidate.rect, blocker)) return false;
    }
    return true;
  };

  const safeMerged = (candidate: MapBadgePlacement): boolean => {
    const mergedBlockers = options.mergedBlockers ?? blockers;
    if (options.bounds) {
      if (!insideBounds(candidate.rect, options.bounds, margin)) return false;
      if (candidate.plateRect
        && !insideBounds(candidate.plateRect, options.bounds, margin)) return false;
    }
    for (const blocker of mergedBlockers) {
      if (minClearance > 0
        ? rectsWithinDistance(candidate.rect, blocker, minClearance)
        : rectsOverlapStrict(candidate.rect, blocker)) return false;
    }
    return true;
  };

  // 1) 名字牌右侧，垂直居中。
  const right = make(plate.right + gap, plateCenterY - h / 2, 'right');
  if (safe(right)) return right;

  // 2) 右侧放不下（出界/碰撞）→ 名字牌左侧，同样垂直居中。
  const left = make(plate.left - gap - w, plateCenterY - h / 2, 'left');
  if (safe(left)) return left;

  // 3) 两侧都不可用 → 名字牌正下方，必须严格水平居中，间距 2px。
  // 居中位置被邻居/玩家占住时不再横向滑动；直接进入 merged 兜底。
  const belowTop = plate.bottom - gap - h;
  const belowCenter = make(plateCenterX - w / 2, belowTop, 'below');
  if (safe(belowCenter)) return belowCenter;

  // 4) 最终兜底：红牌并进名字牌左端。高度与名字牌一致，不缩小、不隐藏文字。
  // 先按图标中心重新对齐整块（红段 + 名牌），再夹进地图可视区。
  const mergedW = plateW + w;
  const centeredLeft = plate.left - w / 2;
  const minLeft = options.bounds ? options.bounds.left + margin : Number.NEGATIVE_INFINITY;
  const maxLeft = options.bounds
    ? options.bounds.right - margin - mergedW
    : Number.POSITIVE_INFINITY;

  const clampLeft = (value: number): number => (
    maxLeft >= minLeft
      ? Math.max(minLeft, Math.min(maxLeft, value))
      : value
  );

  const makeMerged = (left: number): MapBadgePlacement => {
    const mergedPlate: MapRect = {
      left,
      right: left + mergedW,
      top: plate.top,
      bottom: plate.bottom,
    };
    const mergedRect: MapRect = {
      left,
      right: left + w,
      top: plate.top,
      bottom: plate.bottom,
    };
    return {
      centerX: (mergedRect.left + mergedRect.right) / 2,
      centerY: (mergedRect.top + mergedRect.bottom) / 2,
      rect: mergedRect,
      side: 'merged',
      gap: 0,
      merged: true,
      plateRect: mergedPlate,
      plateShiftX: (left + w + plateW / 2) - plateCenterX,
      connector: null,
    };
  };

  const candidates: number[] = [clampLeft(centeredLeft)];
  if (Number.isFinite(minLeft) && Number.isFinite(maxLeft)) {
    const edges = [maxLeft, minLeft]
      .sort((a, b) => Math.abs(a - centeredLeft) - Math.abs(b - centeredLeft));
    for (const edge of edges) {
      if (!candidates.some((value) => Math.abs(value - edge) < 0.001)) {
        candidates.push(edge);
      }
    }
  }

  for (const left of candidates) {
    const candidate = makeMerged(left);
    if (safeMerged(candidate)) return candidate;
  }
  return makeMerged(clampLeft(centeredLeft));
}

/** 兼容更直白的名字：与 computeBadgeUnderPlate 相同（含碰撞回退）。 */
export const computeDailyBadgePlacement = computeBadgeUnderPlate;
export const placeDailyBadgeForMarker = computeBadgeUnderPlate;

/** 兼容更直白的名字。 */
export const placeBadgeUnderPlate = computeBadgeUnderPlate;

/**
 * r39：右侧 → 左侧 → 下方（居中/在名字牌宽度内滑动）→ 并进名字牌左端。
 * bounds 用于判断候选是否超出地图可见区。
 * 坐标与 plate 相同（GameRoot 里用名字牌世界包围盒换算成 marker 局部坐标）。
 */
export function placeDailyBadgeRelativeToPlate(
  plate: MapRect,
  badgeW: number,
  badgeH: number,
  bounds: MapBadgeBounds,
  options: { offset?: number; margin?: number } = {},
): MapBadgePlacement {
  return computeBadgeUnderPlate(plate, badgeW, badgeH, {
    gap: options.offset ?? 2,
    margin: options.margin ?? 0,
    bounds,
  });
}

/**
 * 兼容旧 API：placement.plate 是屏幕坐标时返回屏幕坐标角标。
 * 竖直内容区通过 areaTop/areaBottom 传入；不传则不限制上下。
 */
export function placeDailyBadge(
  placement: MapMarkerPlacement,
  badgeW: number,
  badgeH: number,
  options: {
    halfW?: number;
    safeLeft?: number;
    safeRight?: number;
    margin?: number;
    gap?: number;
    offset?: number;
    /** 地名牌顶边（默认用 placement.plate.top）。 */
    plateTop?: number;
    areaTop?: number;
    areaBottom?: number;
  } = {},
): MapBadgePlacement {
  const halfW = options.halfW ?? Number.POSITIVE_INFINITY;
  const margin = Math.max(0, options.margin ?? MAP_MARKER_MARGIN);
  const safeLeft = Math.max(0, options.safeLeft ?? 0);
  const safeRight = Math.max(0, options.safeRight ?? 0);
  const plateTop = options.plateTop ?? placement.plate.top;
  const plate = { ...placement.plate, top: plateTop };
  const bounds: MapBadgeBounds = {
    left: -halfW + safeLeft,
    right: halfW - safeRight,
    top: options.areaTop ?? Number.POSITIVE_INFINITY,
    bottom: options.areaBottom ?? Number.NEGATIVE_INFINITY,
  };
  return placeDailyBadgeRelativeToPlate(plate, badgeW, badgeH, bounds, {
    offset: options.offset ?? options.gap ?? MAP_BADGE_OFFSET,
    margin,
  });
}

/**
 * 地名牌宽度：按 BMFont xadvance 实测文字宽度再撑开左右内边距。
 * 宽度只夹到可视上限，不会为了塞进屏幕而把像素字压扁。
 */
export function computeMapPlateWidth(
  text: string,
  fontSize: number,
  options: { minWidth?: number; maxWidth?: number; padX?: number } = {},
): number {
  const minWidth = Math.max(1, options.minWidth ?? 112);
  const maxWidth = Math.max(minWidth, options.maxWidth ?? Number.POSITIVE_INFINITY);
  const padX = Math.max(0, options.padX ?? 28);
  const measured = Math.ceil(measurePixelTextWidth(text, fontSize)) + padX;
  return Math.min(maxWidth, Math.max(minWidth, measured));
}

/** 地名牌高度 = BMFont 行高 + 上下内边距（默认 6 设计 px）。 */
export function computeMapPlateHeight(fontSize: number, padY: number = 6): number {
  return Math.ceil(lineHeightForFontSize(fontSize) + padY * 2);
}
