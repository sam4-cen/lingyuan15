/**
 * 事件页统一排版（纯计算，不依赖 cc，方便在 Node 里覆盖多机型/全部事件）。
 *
 * r38 按 UI/UX 定稿：
 *   ① 事件专属/通用背景铺满全屏 ② 25%/40% 黑遮罩 ③ 标题牌 ④ NPC ⑤ 描述 ⑥ 按钮
 * 可用区 = 顶栏底边到底部标语上沿（顶 T、高 H），所有位置只跟 T/H 有关：
 *   标题中心 T+12%H · NPC 脚底 T+50%H · 描述底板顶 T+54%H ·
 *   首按钮顶 max(T+72%H, 描述底板底+12) · 按钮间距 10 · 末按钮底 ≤ T+H-24。
 * NPC 最大高度 = 可用区高 30%，32px 精灵按整数倍放大；放不下时整组上推。
 */
import { EVENTS, EventDef } from '../core/config';
import { fitCardText } from './CardTextLayout';
import { EVENT_PRESENTATIONS } from './EventCopy';
import { computeSafeContentArea } from './SafeAreaLayout';
import {
  buttonMinTouchHeight,
  lineHeightForFontSize,
  measurePixelTextWidth,
  physicalPixelsPerDesign,
  pxFont,
  pxSpacing,
  nodeScaleForSourcePixels,
  sourcePixelScaleForTarget,
} from './PixelFontMetrics';

/** 与 GameRoot 顶栏压暗条高度保持一致（HUD 内容区）。 */
export const EVENT_HUD_HEIGHT = 128;
/** 事件页给页脚/底栏预留的高度，和地图底栏最小值一致。 */
export const EVENT_BOTTOM_BAR_HEIGHT = 112;
/** 通用夜景背景；文件不存在时依次退到地点场景、通用场景。 */
export const EVENT_BG_ART = 'event_night';
export const EVENT_BG_FALLBACK_ART = 'event_night_fallback';
/**
 * r33：事件类型 → 专属背景。未登记的事件继续用通用夜景 event_night。
 * 背景源图统一 180×320，显示时按整数倍 cover 铺满全屏。
 */
export const EVENT_BG_BY_EVENT: Partial<Record<EventDef['id'], string>> = {
  rain: 'event_rain',
  patrol: 'event_patrol',
  guard: 'event_guard',
  auntie: 'event_auntie',
};
/** 兼容更直白的命名：事件背景映射表。 */
export const EVENT_BG_MAP = EVENT_BG_BY_EVENT;
export const EVENT_BACKGROUND_MAP = EVENT_BG_BY_EVENT;
/** 专属背景事件：遮罩降到 25%；通用夜景保持 40%。 */
export const EVENT_DIM_ALPHA = 0.4;
export const EVENT_DIM_ALPHA_DEFAULT = EVENT_DIM_ALPHA;
export const EVENT_DIM_ALPHA_SPECIAL = 0.25;
export const EVENT_DIM_ALPHA_DEDICATED = EVENT_DIM_ALPHA_SPECIAL;

export function eventBackgroundFor(eventId?: EventDef['id'] | null): string {
  return (eventId && EVENT_BG_BY_EVENT[eventId]) || EVENT_BG_ART;
}

export const eventBackgroundArt = eventBackgroundFor;

export function eventBackgroundOverlayAlpha(eventId?: EventDef['id'] | null): number {
  // r35：下雨事件背景繁杂，遮罩单独提到 40%；其余专属背景 25%。
  if (eventId === 'rain') return EVENT_DIM_ALPHA_DEFAULT;
  return eventId && EVENT_BG_BY_EVENT[eventId]
    ? EVENT_DIM_ALPHA_SPECIAL
    : EVENT_DIM_ALPHA_DEFAULT;
}
/** r31 下雨事件专属 NPC：40x40 主角撑伞图（脚底在源图 (20,38)）。 */
export const EVENT_RAIN_ROLE_ART = 'hero_rain';
/** 叠在 hero_rain 上的雨滴序列帧（与 40x40 同画布同坐标）。 */
export const EVENT_RAIN_DROPS_ART = 'rain_drops';
/** 下雨 NPC 源图边长；放大倍率与其他 NPC 同为整数倍。 */
export const EVENT_RAIN_ROLE_SRC = 40;
/** hero_rain 脚底源像素坐标（从左上角算）。 */
export const EVENT_RAIN_FOOT_X = 20;
export const EVENT_RAIN_FOOT_Y = 38;
/** 节点锚点 = 脚底：x=20/40，y=1-38/40。 */
export const EVENT_RAIN_ANCHOR_X = EVENT_RAIN_FOOT_X / EVENT_RAIN_ROLE_SRC;
export const EVENT_RAIN_ANCHOR_Y = 1 - EVENT_RAIN_FOOT_Y / EVENT_RAIN_ROLE_SRC;
/** 雨滴两帧循环，每 0.25s 切一帧。 */
export const EVENT_RAIN_DROP_FRAME_SECONDS = 0.25;
export const EVENT_RAIN_DROP_FPS = 1 / EVENT_RAIN_DROP_FRAME_SECONDS;
/** 原 hero_idle 32x32 的脚底源像素坐标，用于把 hero_rain 脚底对齐。 */
export const EVENT_IDLE_ROLE_SRC = 32;
export const EVENT_IDLE_FOOT_X = 18;
export const EVENT_IDLE_FOOT_Y = 30;

/** r33 保安新图 32×32，脚底在源图 (16,30)。 */
export const EVENT_GUARD_ROLE_SRC = 32;
export const EVENT_GUARD_FOOT_X = 16;
export const EVENT_GUARD_FOOT_Y = 30;

/** r37：32×32 像素 NPC 统一脚底 (16,30)，与保安规格一致。 */
export const EVENT_NPC_ROLE_SRC = 32;
export const EVENT_NPC_FOOT_X = 16;
export const EVENT_NPC_FOOT_Y = 30;
/** 锚点直接用任务给定的源像素：x=16/32，y=1-30/32。 */
export const EVENT_GUARD_ANCHOR_X = EVENT_NPC_FOOT_X / EVENT_NPC_ROLE_SRC;
export const EVENT_GUARD_ANCHOR_Y = 1 - EVENT_NPC_FOOT_Y / EVENT_NPC_ROLE_SRC;
export const EVENT_NPC_ANCHOR_X = EVENT_GUARD_ANCHOR_X;
export const EVENT_NPC_ANCHOR_Y = EVENT_GUARD_ANCHOR_Y;
/** 保安与 r37 锐化的阿姨/巡逻/失主 NPC 都使用脚底锚点。 */
const EVENT_FOOT_ANCHOR_IDS = new Set<EventDef['id']>(['guard', 'patrol', 'auntie', 'wallet']);

/** 角色锚点：脚底 (16/32, 1-30/32)；其余 NPC 仍用节点中心。 */
export function eventRoleAnchor(eventId?: EventDef['id'] | null): { x: number; y: number } {
  if (eventId && EVENT_FOOT_ANCHOR_IDS.has(eventId)) {
    return { x: EVENT_NPC_ANCHOR_X, y: EVENT_NPC_ANCHOR_Y };
  }
  if (eventId === 'rain') {
    return { x: EVENT_RAIN_ANCHOR_X, y: EVENT_RAIN_ANCHOR_Y };
  }
  return { x: 0.5, y: 0.5 };
}

/** 角色图放到 role 节点里的局部坐标（锚点改变后保持脚底压在 50%）。 */
export function eventRoleVisualOffset(
  eventId: EventDef['id'] | null | undefined,
  size: number,
): { x: number; y: number } {
  if (eventId && EVENT_FOOT_ANCHOR_IDS.has(eventId)) {
    return {
      x: 0,
      y: snapToPhysicalPixel((0.5 - EVENT_NPC_FOOT_Y / EVENT_NPC_ROLE_SRC) * size),
    };
  }
  return { x: 0, y: 0 };
}
/**
 * r38（UI/UX 定稿）：事件页所有竖直位置都相对可用区 T/H 计算，
 * 与按钮数量无关。百分比均从可用区顶边向下。
 */
export const EVENT_TITLE_PCT = 0.12;
/** NPC 脚底所在的可视区高度百分比。 */
export const EVENT_ROLE_PCT = 0.50;
/** 描述底板顶边百分比。 */
export const EVENT_DESC_PCT = 0.54;
/** 第一个按钮顶边的最小百分比（描述底板底边 +12 可能更靠下）。 */
export const EVENT_BUTTONS_TOP_PCT = 0.72;
/** 兼容旧导出：按钮组不再按 86% 定位。 */
export const EVENT_BUTTONS_BOTTOM_PCT = 0.96;
/** r38：最后一个按钮底边距底部标语上沿至少 24 设计 px。 */
export const EVENT_BUTTONS_BOTTOM_GAP = 24;
/** 没有底部标语时，末按钮底边距安全区底边同样是 24 设计 px。 */
export const EVENT_SLOGAN_BUTTON_GAP = EVENT_BUTTONS_BOTTOM_GAP;
/** r38：NPC 脚底到描述底板顶边的设计参考上限（实测 4%H）。 */
export const EVENT_NPC_DESC_MAX_GAP = 40;
/** 描述底板底边在按钮组顶边上方 12 设计 px。 */
export const EVENT_DESC_BUTTON_GAP = 12;
/** 描述底板：深色 #1a1020、80% 不透明、6px 内边距、圆角。 */
export const EVENT_DESC_PLATE_COLOR: [number, number, number] = [26, 16, 32];
export const EVENT_DESC_PLATE_ALPHA = 0.8;
export const EVENT_DESC_PLATE_PAD = pxSpacing(6);
export const EVENT_DESC_PLATE_RADIUS = pxSpacing(4);
/** r38：结果框改用描述底板顶边定位，不再按脚底 +8 计算。 */
/** r36（UI/UX #4）：结果文字左右内边距各 10 逻辑 px（≥12 设计 px）。 */
export const EVENT_RESULT_TEXT_PADDING = pxSpacing(10);
/** 结果文字可用宽度 = 面板宽 - 左右内边距。 */
export function eventResultTextWidth(panelW: number): number {
  return Math.max(1, panelW - EVENT_RESULT_TEXT_PADDING * 2);
}
/** 按钮组底边到安全区底边的目标留白：≤90 CSS。 */
export const EVENT_BUTTONS_BOTTOM_MAX_CSS = 89.5;
export const EVENT_BOTTOM_WHITESPACE_PCT = 0.25;
/** 标题与 HUD 下沿 / 标题与角色实际不透明像素顶边的最小间距。 */
export const EVENT_TITLE_TOP_GAP = 16;
export const EVENT_TITLE_ROLE_GAP = 16;
/** 选项按钮之间、按钮组与底栏之间的设计 px。 */
export const EVENT_OPTION_GAP = 10;
/** 按钮统一高度：40 设计 px（360×640 稿）。 */
export const EVENT_BUTTON_HEIGHT = pxSpacing(40);
/** 按钮统一宽度：屏宽 56%。 */
export const EVENT_BUTTON_WIDTH_RATIO = 0.56;
/** 结果文字至少展示 2.5 秒，并且必须点击才继续。 */
export const EVENT_RESULT_MIN_SECONDS = 2.5;
export const EVENT_RESULT_PROMPT = '点击继续';
/** NPC 32px 源图最大占可用区高度 30%，按整数倍取最大可放入的倍数。 */
export const EVENT_ROLE_SRC = 32;
export const EVENT_ROLE_MAX_HEIGHT_PCT = 0.30;
export const EVENT_ROLE_SCALE_MIN = 1;
export const EVENT_ROLE_SCALE_MAX = 10;
/** 角色源图里脚底所在行（从图顶往下），用于把脚底压在 50%。 */
export const EVENT_ROLE_FOOT_SRC = 30;

export { EVENT_PRESENTATIONS } from './EventCopy';
export const EVENT_IDS: EventDef['id'][] = EVENTS.map((ev) => ev.id);

/**
 * 每张 32×32 角色图第一帧的不透明像素顶边（源像素，从图顶往下）。
 * 标题底边按这个实际顶边算，而不是节点框；数据来自 assets 里的 alpha bbox。
 */
export const EVENT_ROLE_ALPHA_TOP_SRC: Record<EventDef['id'], number> = {
  patrol: 0,
  guard: 0,
  rival: 1,
  auntie: 0,
  delivery: 7,
  wallet: 0,
  cat: 10,
  rain: 2,
};

export interface Rect {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface EventArea {
  top: number;
  bottom: number;
  height: number;
}

export interface EventAreaInput {
  visibleH: number;
  /** 顶部刘海/胶囊 + HUD 压暗条之前的安全区。 */
  headerTop: number;
  safeBottom: number;
  hudHeight?: number;
  bottomBarHeight?: number;
  /**
   * 底部标语 Label 的真实顶边（世界 y，向上为正）。传入时按钮直接贴它；
   * 不传/无标语时退回安全区底边，绝不再拿预留底栏重复减一次安全区。
   */
  sloganTop?: number | null;
}

/**
 * 事件页可用区：顶栏下沿到底部标语上沿。
 * 传入标语真实顶边时直接以它为底边；没有标语才退回安全区 + 预留底栏。
 */
export function computeEventArea(input: EventAreaInput): EventArea {
  const fallback = computeSafeContentArea({
    visibleH: input.visibleH,
    headerTop: input.headerTop,
    hudHeight: input.hudHeight ?? EVENT_HUD_HEIGHT,
    barHeight: input.bottomBarHeight ?? EVENT_BOTTOM_BAR_HEIGHT,
    safeBottom: input.safeBottom,
  });
  if (!Number.isFinite(input.sloganTop as number)) return fallback;
  const bottom = input.sloganTop as number;
  const top = fallback.top;
  return { top, bottom, height: Math.max(1, top - bottom) };
}

/**
 * 背景候选：事件专属背景（若有）→ 通用夜景 → 当前地点场景 → 通用场景。
 * 去重后返回，保证绝不留纯黑。
 */
export function eventBackgroundCandidates(
  locationId?: string | null,
  eventId?: EventDef['id'] | null,
): string[] {
  const list: string[] = [eventBackgroundArt(eventId)];
  if (!list.includes(EVENT_BG_ART)) list.push(EVENT_BG_ART);
  if (locationId) list.push(`bg_${locationId}`);
  list.push(EVENT_BG_FALLBACK_ART);
  return list.filter((name, index) => list.indexOf(name) === index);
}

/** 全屏背景 cover：180×320 源图按整数倍放大，至少盖住可视区。 */
export function eventBackgroundCover(
  frameW: number,
  frameH: number,
  viewW: number,
  viewH: number,
): { scale: number; width: number; height: number } {
  const fw = Math.max(1, Math.floor(frameW));
  const fh = Math.max(1, Math.floor(frameH));
  const scale = Math.max(1, Math.ceil(Math.max(viewW / fw, viewH / fh) - 1e-6));
  return { scale, width: fw * scale, height: fh * scale };
}

/** 标题档字号：约屏宽 1/20，由全局像素字体落成整数源像素倍。 */
export function eventTitleFontSize(): number {
  return pxFont(18);
}

export function eventTitleMetrics(text: string): { width: number; height: number; fontSize: number } {
  const fontSize = eventTitleFontSize();
  const lineHeight = lineHeightForFontSize(fontSize);
  const measured = Math.ceil(measurePixelTextWidth(text, fontSize));
  return {
    width: Math.max(180, measured + pxSpacing(24)),
    height: Math.ceil(lineHeight + pxSpacing(12)),
    fontSize,
  };
}

/** 角色图整数倍：不超过最大高度，且至少 ×4。srcSize 用于 40px 下雨精灵。 */
export function eventRoleScale(
  areaHeight: number,
  maxHeight: number = Math.max(1, areaHeight) * EVENT_ROLE_MAX_HEIGHT_PCT,
  srcSize: number = EVENT_ROLE_SRC,
): number {
  const src = Math.max(1, Math.floor(srcSize));
  const target = Math.max(1, Math.min(maxHeight, Math.max(1, areaHeight) * EVENT_ROLE_MAX_HEIGHT_PCT));
  const fit = Math.floor(target / src);
  return Math.max(EVENT_ROLE_SCALE_MIN, Math.min(EVENT_ROLE_SCALE_MAX, fit));
}

/** 角色图逻辑尺寸（源图 32×32 × 整数倍）。 */
export function eventRoleSize(areaHeight: number): number {
  return EVENT_ROLE_SRC * eventRoleScale(areaHeight);
}

/** 角色实际不透明像素顶边（节点中心 + 半高 - 顶部透明行×整数倍）。 */
export function eventRoleOpaqueTop(centerY: number, size: number, alphaTopSrc: number): number {
  const scale = size / EVENT_ROLE_SRC;
  return centerY + size / 2 - alphaTopSrc * scale;
}

/** 角色精灵显示尺寸（下雨 40px 源图例外）。 */
export function eventRoleVisualSize(
  layout: EventLayout,
  eventId: EventDef['id'] | null | undefined = layout.role.eventId,
): { width: number; height: number } {
  if (eventId === 'rain') {
    const placement = eventRainRolePlacement(layout.role.scale);
    return { width: placement.size, height: placement.size };
  }
  return { width: layout.role.width, height: layout.role.height };
}

/**
 * 角色精灵实际渲染后的底边世界 y。
 * 用「节点中心 + 局部偏移 - 锚点 × 实际显示高度」计算，
 * 不再拿理论脚底或节点高度代替 sprite 的真实底边。
 */
export function eventRoleVisualBottomY(
  layout: EventLayout,
  eventId: EventDef['id'] | null | undefined = layout.role.eventId,
): number {
  if (eventId === 'rain') {
    const placement = eventRainRolePlacement(layout.role.scale);
    return layout.role.centerY + placement.y - placement.anchorY * placement.size;
  }
  return layout.role.centerY + layout.role.visualY - layout.role.anchorY * layout.role.height;
}

/** @deprecated 兼容旧名：用实际精灵底边，而不是理论脚底。 */
export const eventRoleBottomY = eventRoleVisualBottomY;

export interface EventRainRolePlacement {
  /** hero_rain 节点尺寸（40×整数倍）。 */
  size: number;
  /** 与其它 NPC 相同的整数倍率。 */
  scale: number;
  /** 节点锚点：脚底。 */
  anchorX: number;
  anchorY: number;
  /** 节点位置（role 节点局部坐标）：与原 hero_idle 脚底重合。 */
  x: number;
  y: number;
}

/**
 * 下雨 NPC 的整数倍尺寸与脚底对齐位置。
 *
 * hero_idle（32×32，脚底 (18,30)）显示在 role 中心时，脚底局部坐标为
 * ((18-16)*s, (16-30)*s)。hero_rain 以 (20/40, 1-38/40) 为锚点，
 * 节点放在同一脚底坐标上，两张图就按脚底对齐。
 */
export function eventRainRolePlacement(roleScale: number): EventRainRolePlacement {
  const scale = Math.max(1, Math.floor(roleScale));
  return {
    size: EVENT_RAIN_ROLE_SRC * scale,
    scale,
    anchorX: EVENT_RAIN_ANCHOR_X,
    anchorY: EVENT_RAIN_ANCHOR_Y,
    x: snapToPhysicalPixel((EVENT_IDLE_FOOT_X - EVENT_IDLE_ROLE_SRC / 2) * scale),
    y: snapToPhysicalPixel((EVENT_IDLE_ROLE_SRC / 2 - EVENT_IDLE_FOOT_Y) * scale),
  };
}

/** hero_rain 实际不透明像素顶边：脚底 + 38/40 源图高。 */
export function eventRainRoleOpaqueTop(centerY: number, placement: EventRainRolePlacement): number {
  return centerY + placement.y + (EVENT_RAIN_FOOT_Y / EVENT_RAIN_ROLE_SRC) * placement.size;
}

export interface EventOptionMetrics {
  width: number;
  height: number;
  fontSize: number;
  lineHeight: number;
  text: string;
}

export function eventOptionMetrics(text: string, minW: number = 260): EventOptionMetrics {
  const fontSize = pxFont(12);
  const lineHeight = lineHeightForFontSize(fontSize);
  const measured = Math.ceil(measurePixelTextWidth(text, fontSize));
  return {
    // 统一宽度/高度由 computeEventLayout 覆盖；这里仅保留文字可放下的最小值。
    width: Math.ceil(Math.max(1, minW, measured + pxSpacing(24))),
    height: Math.ceil(Math.max(EVENT_BUTTON_HEIGHT, lineHeight + pxSpacing(12), buttonMinTouchHeight())),
    fontSize,
    lineHeight,
    text,
  };
}

export interface EventLayoutInput extends EventAreaInput {
  visibleW: number;
  titleText: string;
  options: string[];
  desc?: string;
  /** 允许覆盖默认的按钮最小宽高（单测/特殊机型可调）。 */
  minButtonWidth?: number;
  /** 当前地点，用于 event_night 缺失时的 loc_* / bg_* 兜底。 */
  locationId?: string | null;
  /** 当前事件 id：决定 NPC 图和透明顶边。 */
  eventId?: EventDef['id'];
  /** 真实 CSS 高度，用于把 90 CSS 留白换算成设计单位。 */
  cssHeight?: number;
  /** 设备像素比；只用于 r36 每源像素整数倍字段。 */
  dpr?: number;
}

export interface EventLayout {
  area: EventArea;
  background: {
    art: string;
    fallbacks: string[];
    /** 全屏背景（cover，可左右裁边）。 */
    fullScreen: boolean;
    overlayAlpha: number;
  };
  title: { centerY: number; width: number; height: number; rect: Rect };
  role: {
    centerY: number;
    /** NPC 脚底所在的世界 y（U1：可视区高度 50%）。 */
    footY: number;
    width: number;
    height: number;
    scale: number;
    art: string;
    /** 角色图锚点（保安为脚底 (16/32, 1-30/32)，其余为中心）。 */
    anchorX: number;
    anchorY: number;
    /** 角色图相对 role 中心的局部坐标（换锚点后保持脚底对齐）。 */
    visualX: number;
    visualY: number;
    /** 实际不透明像素顶边（用于标题间距断言）。 */
    opaqueTop: number;
    /** 实际渲染 sprite 的底边世界 y（结果框避让用）。 */
    visualBottom: number;
    /** r36：每源像素物理像素整数档 k。 */
    sourcePixelScale: number;
    /** r36：节点 scale = k / devicePixelRatio。 */
    nodeScale: number;
    eventId: EventDef['id'];
    rect: Rect;
  };
  description: {
    centerY: number;
    width: number;
    height: number;
    /** 深色底板尺寸（文字 + 2×6px 内边距）。 */
    plateWidth: number;
    plateHeight: number;
    rect: Rect;
    plate: Rect;
    text: string;
  } | null;
  buttons: {
    top: number;
    bottom: number;
    gap: number;
    width: number;
    height: number;
    rects: Rect[];
  };
  /** 按钮组底边到可视区域底边的距离/占比。 */
  bottomWhitespace: number;
  bottomWhitespaceRatio: number;
}

function makeRect(centerY: number, width: number, height: number): Rect {
  return {
    left: -width / 2,
    right: width / 2,
    top: centerY + height / 2,
    bottom: centerY - height / 2,
  };
}

/** 设计坐标吸附到整数物理像素，避免像素图半像素发糊。 */
export function snapToPhysicalPixel(value: number): number {
  const ppd = physicalPixelsPerDesign();
  if (!Number.isFinite(ppd) || ppd <= 0) return Math.round(value);
  return Math.round(value * ppd) / ppd;
}

/** 向下吸附到整数物理像素，用于「不得超过」的间距上限。 */
export function snapDownToPhysicalPixel(value: number): number {
  const ppd = physicalPixelsPerDesign();
  if (!Number.isFinite(ppd) || ppd <= 0) return Math.floor(value);
  return Math.floor(value * ppd) / ppd;
}

/** 竖直百分比 + 实际内容尺寸 → 事件页每个节点的包围盒。 */
export function computeEventLayout(input: EventLayoutInput): EventLayout {
  const area = computeEventArea(input);
  const H = Math.max(1, area.height);
  const T = area.top;
  const safeW = Math.max(1, input.visibleW);
  const contentW = Math.max(1, Math.min(safeW * 0.86, safeW - 24));

  const titleMetrics = eventTitleMetrics(input.titleText);
  const titleWidth = Math.min(titleMetrics.width, contentW);
  const titleHeight = titleMetrics.height;
  // T + 12%H：标题牌中心；所有竖直位置只跟可用区 T/H 有关。
  const baseTitleCenterY = T - H * EVENT_TITLE_PCT;

  const optionMetrics = input.options.map((text) => eventOptionMetrics(text, input.minButtonWidth ?? 260));
  const n = Math.max(0, optionMetrics.length);
  const gap = EVENT_OPTION_GAP;
  // 单/双按钮统一 40 设计 px 高、屏宽 56%，不随数量变化。
  const buttonHeight = Math.max(1, Math.ceil(EVENT_BUTTON_HEIGHT));
  const buttonWidth = Math.max(1, Math.min(
    Math.round(safeW * EVENT_BUTTON_WIDTH_RATIO),
    safeW - 24,
  ));

  const descText = (input.desc ?? '').trim();
  let descWidth = 1;
  let descHeight = 0;
  let descPlateWidth = 1;
  let descPlateHeight = 0;
  let descTextFit = '';
  let descPlateTop = T - H * EVENT_DESC_PCT;
  if (descText) {
    const descMaxWidth = Math.max(1, Math.min(safeW * 0.86, contentW));
    const bodySize = pxFont(12);
    const lineHeight = lineHeightForFontSize(bodySize);
    const fit = fitCardText(descText, {
      maxWidth: descMaxWidth,
      maxHeight: Math.max(lineHeight, lineHeight * 3),
      fontSize: bodySize,
      minFontSize: bodySize,
      lineGap: 0,
    });
    descHeight = Math.max(lineHeight, fit.height);
    descWidth = Math.max(1, fit.width);
    descPlateWidth = Math.max(1, fit.width + EVENT_DESC_PLATE_PAD * 2);
    descPlateHeight = descHeight + EVENT_DESC_PLATE_PAD * 2;
    descTextFit = fit.text;
    // T + 54%H：描述底板顶边；底板底边 = 顶边 - 板高。
    descPlateTop = T - H * EVENT_DESC_PCT;
  }

  // 第一个按钮顶边 = max(T + 72%H, 描述底板底边 + 12px)。世界坐标 y 向上，
  // 所以这里取两者中更靠下的一个（min）。
  const descPlateBottom = descText ? descPlateTop - descPlateHeight : null;
  const buttonTopByPct = T - H * EVENT_BUTTONS_TOP_PCT;
  const buttonTopByDesc = descPlateBottom == null
    ? buttonTopByPct
    : descPlateBottom - EVENT_DESC_BUTTON_GAP;
  const baseFirstButtonTop = Math.min(buttonTopByPct, buttonTopByDesc);

  // 按钮从第一个顶边向下排；末按钮底边不得越过标语上沿 +24。
  const groupHeight = n > 0 ? n * buttonHeight + (n - 1) * gap : 0;
  const baseLastBottom = n > 0 ? baseFirstButtonTop - groupHeight : baseFirstButtonTop;
  const minLastBottom = area.bottom + EVENT_BUTTONS_BOTTOM_GAP;
  // 放不下时整组上推（标题/NPC/描述/按钮一起），绝不压缩描述和 NPC。
  const shiftUp = n > 0 && baseLastBottom < minLastBottom ? minLastBottom - baseLastBottom : 0;

  const titleCenterY = snapToPhysicalPixel(baseTitleCenterY + shiftUp);
  const roleFootTarget = snapToPhysicalPixel(T - H * EVENT_ROLE_PCT + shiftUp);
  const finalDescPlateTop = descText ? snapToPhysicalPixel(descPlateTop + shiftUp) : null;

  const firstButtonTop = n > 0 ? snapToPhysicalPixel(baseFirstButtonTop + shiftUp) : snapToPhysicalPixel(buttonTopByPct + shiftUp);
  const rects: Rect[] = [];
  for (let i = 0; i < n; i++) {
    const top = firstButtonTop - i * (buttonHeight + gap);
    // 直接由顶边构造，保证按钮间距严格等于 10 设计 px（不逐个吸附中心）。
    const centerY = top - buttonHeight / 2;
    rects.push(makeRect(centerY, buttonWidth, buttonHeight));
  }
  const buttonsTop = rects.length > 0 ? rects[0].top : firstButtonTop;
  const buttonsBottom = rects.length > 0 ? rects[rects.length - 1].bottom : firstButtonTop;

  let description: EventLayout['description'] = null;
  if (descText && finalDescPlateTop != null) {
    const centerY = snapToPhysicalPixel(finalDescPlateTop - descPlateHeight / 2);
    description = {
      centerY,
      width: descWidth,
      height: descHeight,
      plateWidth: descPlateWidth,
      plateHeight: descPlateHeight,
      rect: makeRect(centerY, descWidth, descHeight),
      plate: makeRect(centerY, descPlateWidth, descPlateHeight),
      text: descTextFit,
    };
  }

  // NPC 脚底固定在 T + 50%H；取能放进 30%H 的最大整数倍。
  const roleSrc = input.eventId === 'rain' ? EVENT_RAIN_ROLE_SRC : EVENT_ROLE_SRC;
  const maxScale = Math.max(
    EVENT_ROLE_SCALE_MIN,
    Math.min(EVENT_ROLE_SCALE_MAX, Math.floor((H * EVENT_ROLE_MAX_HEIGHT_PCT) / roleSrc)),
  );
  const roleScale = maxScale;
  const roleSize = EVENT_ROLE_SRC * roleScale;
  const isRain = input.eventId === 'rain';
  const roleAnchor = eventRoleAnchor(input.eventId);
  const roleVisual = isRain
    ? eventRainRolePlacement(roleScale)
    : eventRoleVisualOffset(input.eventId, roleSize);
  const roleVisualAnchorY = isRain ? EVENT_RAIN_ANCHOR_Y : roleAnchor.y;
  const roleVisualDisplaySize = isRain ? eventRainRolePlacement(roleScale).size : roleSize;
  // 由目标精灵真实底边反推 role 节点中心。
  const roleCenterY = snapToPhysicalPixel(
    roleFootTarget - roleVisual.y + roleVisualAnchorY * roleVisualDisplaySize,
  );
  const alphaTop = input.eventId ? EVENT_ROLE_ALPHA_TOP_SRC[input.eventId] : 1;
  const roleArt = input.eventId ? EVENT_PRESENTATIONS[input.eventId]?.roleArt : EVENT_RAIN_ROLE_ART;
  const roleOpaqueTop = isRain
    ? eventRainRoleOpaqueTop(roleCenterY, eventRainRolePlacement(roleScale))
    : eventRoleOpaqueTop(roleCenterY, roleSize, alphaTop);
  const roleVisualBottomFinal = snapToPhysicalPixel(
    roleCenterY + roleVisual.y - roleVisualAnchorY * roleVisualDisplaySize,
  );

  const bottomWhitespace = Math.max(0, buttonsBottom - area.bottom);
  const bottomWhitespaceRatio = bottomWhitespace / H;

  return {
    area,
    background: {
      art: eventBackgroundArt(input.eventId),
      fallbacks: eventBackgroundCandidates(input.locationId, input.eventId),
      fullScreen: true,
      overlayAlpha: eventBackgroundOverlayAlpha(input.eventId),
    },
    title: {
      centerY: titleCenterY,
      width: titleWidth,
      height: titleHeight,
      rect: makeRect(titleCenterY, titleWidth, titleHeight),
    },
    role: {
      centerY: roleCenterY,
      footY: roleVisualBottomFinal,
      width: roleSize,
      height: roleSize,
      scale: roleScale,
      art: roleArt,
      anchorX: isRain ? EVENT_RAIN_ANCHOR_X : roleAnchor.x,
      anchorY: isRain ? EVENT_RAIN_ANCHOR_Y : roleAnchor.y,
      visualX: roleVisual.x,
      visualY: roleVisual.y,
      opaqueTop: roleOpaqueTop,
      visualBottom: roleVisualBottomFinal,
      sourcePixelScale: sourcePixelScaleForTarget(
        roleVisualDisplaySize * physicalPixelsPerDesign(),
        roleSrc,
      ),
      nodeScale: nodeScaleForSourcePixels(
        sourcePixelScaleForTarget(roleVisualDisplaySize * physicalPixelsPerDesign(), roleSrc),
        input.dpr ?? 1,
      ),
      eventId: input.eventId ?? 'patrol',
      rect: makeRect(roleCenterY, roleSize, roleSize),
    },
    description,
    buttons: {
      top: buttonsTop,
      bottom: buttonsBottom,
      gap,
      width: buttonWidth,
      height: buttonHeight,
      rects,
    },
    bottomWhitespace,
    bottomWhitespaceRatio,
  };
}

export interface EventResultLayout {
  panelH: number;
  top: number;
  bottom: number;
  centerY: number;
  /** 兼容字段：r38 起结果面板不再移动 NPC，始终为 0。 */
  roleShift: number;
}

/**
 * r38：结果面板顶边 = 描述底板顶边，与描述底板互相替换显示；
 * 不再按角色脚底 +8 计算，也不再移动 NPC。
 */
export function computeEventResultLayout(
  layout: EventLayout,
  panelHeight: number,
  _options: { footGap?: number; minBottomGap?: number } = {},
): EventResultLayout {
  const panelH = Math.max(1, panelHeight);
  // r38：结果面板顶边 = 描述底板顶边，与描述底板互相替换；不再按脚底 +8。
  const top = layout.description?.plate.top
    ?? (layout.area.top - layout.area.height * EVENT_DESC_PCT);
  const bottom = top - panelH;
  return { panelH, top, bottom, centerY: (top + bottom) / 2, roleShift: 0 };
}

/** 两个包围盒是否相交（含边界）；用于单测与结果层避让。 */
export function eventRectsOverlap(a: Rect, b: Rect): boolean {
  return a.left < b.right && a.right > b.left && a.top > b.bottom && a.bottom < b.top;
}
