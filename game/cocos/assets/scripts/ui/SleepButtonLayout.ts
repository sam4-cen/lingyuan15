/**
 * r29 睡觉按钮文字区（纯计算，不依赖 cc）。
 *
 * 新美术 btn_sleep.png / btn_sleep_pressed.png 为 117×24 源像素，月亮在左侧，
 * 床已去掉。文字区（源像素）x=24,y=3,w=81,h=18，文字在其中居中；
 * 按下态整体跟随下移 2 源像素。
 */
export interface SleepSourceRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const BTN_SLEEP_ART_W = 117;
export const BTN_SLEEP_ART_H = 24;
/** 九宫格 insets（源像素）：L24 / R12 / T3 / B3。 */
export const BTN_SLEEP_INSETS: [number, number, number, number] = [24, 12, 3, 3];
/** 文字区矩形（源像素）。 */
export const BTN_SLEEP_TEXT_RECT: SleepSourceRect = { x: 24, y: 3, w: 81, h: 18 };
/** 按下态文字下移的源像素数。 */
export const BTN_SLEEP_PRESSED_DOWN = 2;

export interface SleepTextLayout {
  /** 文字区中心（按钮节点局部坐标，y 向上）。 */
  centerX: number;
  centerY: number;
  width: number;
  height: number;
  /** 按下态相对常态的位移（源像素转设计坐标，y 向下为负）。 */
  pressedOffsetX: number;
  pressedOffsetY: number;
  scaleX: number;
  scaleY: number;
}

/** 源像素文字区 → 按钮节点局部的 UITransform/位置。 */
export function computeSleepTextLayout(
  artW: number,
  artH: number,
  rect: SleepSourceRect = BTN_SLEEP_TEXT_RECT,
): SleepTextLayout {
  const w = Math.max(1, artW);
  const h = Math.max(1, artH);
  const scaleX = w / BTN_SLEEP_ART_W;
  const scaleY = h / BTN_SLEEP_ART_H;
  const left = -w / 2 + rect.x * scaleX;
  const top = h / 2 - rect.y * scaleY;
  const width = Math.max(1, rect.w * scaleX);
  const height = Math.max(1, rect.h * scaleY);
  return {
    centerX: left + width / 2,
    centerY: top - height / 2,
    width,
    height,
    pressedOffsetX: 0,
    pressedOffsetY: -BTN_SLEEP_PRESSED_DOWN * scaleY,
    scaleX,
    scaleY,
  };
}

/**
 * 住处「睡觉」按钮与主角精灵的竖直关系（纯计算，方便单测）。
 *
 * 按钮贴安全区底边，按钮顶边必须在主角睡觉精灵脚下（精灵底边）以下 ≥8px；
 * 如果安全区太矮放不下，就把主角/床整体上移，绝不把按钮盖到头上。
 */
export interface HomeSleepLayoutInput {
  visibleH: number;
  safeBottom: number;
  buttonHeight: number;
  /** 按钮底边到安全区底边的距离。 */
  margin: number;
  heroCenterY: number;
  heroHeight: number;
  /** 主角底边与按钮顶边的最小间距。 */
  gap?: number;
}

export interface HomeSleepLayout {
  buttonBottom: number;
  buttonTop: number;
  buttonCenterY: number;
  heroCenterY: number;
  heroTop: number;
  heroBottom: number;
  /** 主角是否为了避让按钮而上移。 */
  heroMovedUp: boolean;
  /** 主角与按钮包围盒的竖直间距（负数表示重叠）。 */
  gap: number;
}

export function computeHomeSleepLayout(input: HomeSleepLayoutInput): HomeSleepLayout {
  const visibleH = Math.max(1, input.visibleH);
  const gapRequired = Math.max(0, input.gap ?? 8);
  const buttonHeight = Math.max(1, input.buttonHeight);
  const heroHeight = Math.max(1, input.heroHeight);
  const buttonBottom = -visibleH / 2 + Math.max(0, input.safeBottom) + Math.max(0, input.margin);
  const buttonTop = buttonBottom + buttonHeight;
  const buttonCenterY = buttonBottom + buttonHeight / 2;

  let heroCenterY = input.heroCenterY;
  let heroBottom = heroCenterY - heroHeight / 2;
  let moved = false;
  // y 向上：按钮顶边必须低于精灵底边至少 gapRequired。
  if (buttonTop > heroBottom - gapRequired) {
    heroCenterY += buttonTop + gapRequired - heroBottom;
    heroBottom = heroCenterY - heroHeight / 2;
    moved = true;
  }

  return {
    buttonBottom,
    buttonTop,
    buttonCenterY,
    heroCenterY,
    heroTop: heroCenterY + heroHeight / 2,
    heroBottom,
    heroMovedUp: moved,
    gap: heroBottom - buttonTop,
  };
}
