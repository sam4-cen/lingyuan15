import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { LOCATIONS } from '../src/core/config';
import {
  DESIGN_HEIGHT,
  DESIGN_WIDTH,
  cssPxToDesign,
  lineHeightForFontSize,
  measurePixelTextWidth,
  pxFont,
  setFontScreenMetrics,
} from '../cocos/assets/scripts/ui/PixelFontMetrics';
import {
  MAP_BADGE_CLEARANCE,
  MAP_BADGE_MIN_FONT_CSS,
  MAP_BADGE_TEXT,
  computeBadgeUnderPlate,
  computeMapLayout,
  computeMapPlateHeight,
  computeMapPlateWidth,
  placeMapMarker,
  rectDistance,
  rectsWithinDistance,
} from '../cocos/assets/scripts/ui/MapLayout';
import { MAP_POINTS } from '../cocos/assets/scripts/ui/ArtMap';

const VIEWPORTS = [
  { name: 'SE 375x667', cssW: 375, cssH: 667, dpr: 2, safeBottomCss: 0, headerTopCss: 0 },
  { name: '360x780', cssW: 360, cssH: 780, dpr: 3, safeBottomCss: 0, headerTopCss: 0 },
  { name: '390x844', cssW: 390, cssH: 844, dpr: 3, safeBottomCss: 34, headerTopCss: 88 },
  { name: 'ProMax 430x932', cssW: 430, cssH: 932, dpr: 3, safeBottomCss: 34, headerTopCss: 88 },
];

/** 与 r38 实机截图脚本相同的 4 个玩家位置。 */
const PLAYER_IDS = ['baishizhou', 'futian_cbd', 'window_world', 'dongmen'];

type Rect = { left: number; right: number; top: number; bottom: number };

interface MarkerInfo {
  id: string;
  placement: ReturnType<typeof placeMapMarker>;
  plateW: number;
}

function setupViewport(vp: typeof VIEWPORTS[number]): {
  visibleW: number;
  visibleH: number;
  safeBottom: number;
  headerTop: number;
  font: number;
  plateHeight: number;
  iconSize: number;
  layout: ReturnType<typeof computeMapLayout>;
  markers: MarkerInfo[];
  bounds: Rect;
} {
  const visibleH = DESIGN_HEIGHT;
  const visibleW = vp.cssW * visibleH / vp.cssH;
  const safeBottom = vp.safeBottomCss * visibleH / vp.cssH;
  const headerTop = vp.headerTopCss * visibleH / vp.cssH;
  setFontScreenMetrics({
    physicalWidth: vp.cssW * vp.dpr,
    physicalHeight: vp.cssH * vp.dpr,
    visibleWidth: visibleW,
    visibleHeight: visibleH,
    devicePixelRatio: vp.dpr,
  });
  const font = pxFont(12);
  const iconSize = 96;
  const plateHeight = computeMapPlateHeight(font);
  const layout = computeMapLayout({
    visibleH,
    visibleW,
    headerTop,
    hudHeight: 128,
    barHeight: 112,
    safeBottom,
    iconSize,
    plateHeight,
  });
  const halfW = visibleW / 2;
  const maxPlateW = Math.min(300, visibleW - 24);
  const markers = LOCATIONS.map((loc) => {
    const plateW = computeMapPlateWidth(loc.name, font, {
      minWidth: 112,
      maxWidth: maxPlateW,
      padX: 28,
    });
    const placement = placeMapMarker(MAP_POINTS[loc.id].x, MAP_POINTS[loc.id].y, layout, {
      iconSize,
      plateWidth: plateW,
      plateHeight,
      halfW,
    });
    return { id: loc.id, placement, plateW };
  });
  const bounds = {
    left: -halfW + 8,
    right: halfW - 8,
    top: layout.areaTop,
    bottom: layout.areaBottom,
  };
  return { visibleW, visibleH, safeBottom, headerTop, font, plateHeight, iconSize, layout, markers, bounds };
}

function heroRect(player: MarkerInfo, iconSize: number): Rect {
  return {
    left: player.placement.x + iconSize / 2 + 20 - 32,
    right: player.placement.x + iconSize / 2 + 20 + 32,
    top: player.placement.y - 4 + 32,
    bottom: player.placement.y - 4 - 32,
  };
}

function blockersFor(daily: MarkerInfo, player: MarkerInfo, markers: MarkerInfo[], iconSize: number): Rect[] {
  const blockers: Rect[] = [];
  for (const other of markers) {
    // 自家图标也必须参与碰撞；只排除自家名字牌。
    blockers.push(other.placement.icon);
    if (other.id !== daily.id) blockers.push(other.placement.plate);
  }
  blockers.push(heroRect(player, iconSize));
  return blockers;
}

function inside(rect: Rect, bounds: Rect): boolean {
  return rect.left >= bounds.left - 0.001
    && rect.right <= bounds.right + 0.001
    && rect.bottom >= bounds.bottom - 0.001
    && rect.top <= bounds.top + 0.001;
}

function collectSides(): { sides: Record<string, number>; failures: string[] } {
  const sides: Record<string, number> = { right: 0, left: 0, below: 0, merged: 0 };
  const failures: string[] = [];
  for (const vp of VIEWPORTS) {
    const env = setupViewport(vp);
    const minFont = cssPxToDesign(MAP_BADGE_MIN_FONT_CSS);
    const font = env.font;
    for (const daily of env.markers) {
      for (const playerId of PLAYER_IDS) {
        const player = env.markers.find((m) => m.id === playerId)!;
        const blockers = blockersFor(daily, player, env.markers, env.iconSize);
        const badge = computeBadgeUnderPlate(daily.placement.plate, 64, 36, {
          gap: 2,
          blockers,
          mergedBlockers: [daily.placement.icon, heroRect(player, env.iconSize)],
          bounds: env.bounds,
          minClearance: MAP_BADGE_CLEARANCE,
        });
        const tag = `${vp.name} 限定@${daily.id} 玩家@${playerId} (${badge.side})`;
        sides[badge.side]++;

        // 1) 永远有文字，字号不低于名字牌字号的 80%，且不小于 10 CSS px。
        assert.equal(MAP_BADGE_TEXT, '限定', `${tag} 小牌文字不是「限定」`);
        assert.ok(font >= minFont - 0.001, `${tag} 小牌字号 ${font} < 10css (${minFont})`);
        assert.ok(font >= env.font * 0.8 - 0.001, `${tag} 小牌字号不足名字牌字号的 80%`);
        const textW = measurePixelTextWidth(MAP_BADGE_TEXT, font);
        assert.ok(textW > 0, `${tag} 小牌文字宽度为 0`);
        assert.ok(badge.rect.right - badge.rect.left >= Math.min(64, Math.ceil(textW)),
          `${tag} 小牌宽度不足以显示文字`);
        assert.ok(badge.rect.top - badge.rect.bottom >= Math.min(10, lineHeightForFontSize(font)),
          `${tag} 小牌高度过小`);
        assert.ok(badge.side === 'right' || badge.side === 'left' || badge.side === 'below' || badge.side === 'merged',
          `${tag} 未知候选位置`);

        // 2) 任何档位都完整在可视区内。
        assert.ok(inside(badge.rect, env.bounds), `${tag} 小牌超出可视区`);

        // 3) 任何档位都不压玩家、不压自家地点图标。
        assert.ok(rectDistance(badge.rect, heroRect(player, env.iconSize)) >= MAP_BADGE_CLEARANCE - 0.001,
          `${tag} 小牌压玩家`);
        assert.ok(rectDistance(badge.rect, daily.placement.icon) >= MAP_BADGE_CLEARANCE - 0.001,
          `${tag} 小牌压自家图标`);

        // 4) 独立候选（右/左/下）必须避开所有障碍；merged 是最终兜底，
        //    只保证不压玩家/自家图标（邻居可能在名牌原有位置附近，见下）。
        if (badge.side !== 'merged') {
          for (const blocker of blockers) {
            assert.equal(rectsWithinDistance(badge.rect, blocker, MAP_BADGE_CLEARANCE), false,
              `${tag} 小牌与障碍物距离不足 2px`);
          }
        }

        if (badge.side === 'right') {
          assert.ok(Math.abs(badge.rect.left - (daily.placement.plate.right + 2)) < 0.001,
            `${tag} 右侧间距不是 2px`);
          assert.ok(Math.abs(badge.centerY - (daily.placement.plate.top + daily.placement.plate.bottom) / 2) < 0.001,
            `${tag} 右侧没有垂直居中`);
        } else if (badge.side === 'left') {
          assert.ok(Math.abs(badge.rect.right - (daily.placement.plate.left - 2)) < 0.001,
            `${tag} 左侧间距不是 2px`);
          assert.ok(Math.abs(badge.centerY - (daily.placement.plate.top + daily.placement.plate.bottom) / 2) < 0.001,
            `${tag} 左侧没有垂直居中`);
        } else if (badge.side === 'below') {
          assert.ok(Math.abs(badge.rect.top - (daily.placement.plate.bottom - 2)) < 0.001,
            `${tag} 下方间距不是 2px`);
          assert.ok(badge.rect.left >= daily.placement.plate.left - 0.001
            && badge.rect.right <= daily.placement.plate.right + 0.001,
          `${tag} 下方小牌没有保持在名字牌宽度范围内`);
          const plateCenterX = (daily.placement.plate.left + daily.placement.plate.right) / 2;
          assert.ok(Math.abs(badge.centerX - plateCenterX) < 0.001,
            `${tag} 下方小牌没有水平居中`);
        } else {
          const plate = badge.plateRect!;
          assert.equal(badge.merged, true, `${tag} merged 档没有标记`);
          assert.ok(Math.abs((plate.right - plate.left) - (daily.plateW + 64)) < 0.001,
            `${tag} 合并后名字牌没有整体加宽`);
          assert.ok(Math.abs((badge.rect.top - badge.rect.bottom) - env.plateHeight) < 0.001,
            `${tag} 合并红段没有与名字牌等高`);
          assert.ok(Math.abs(badge.rect.left - plate.left) < 0.001,
            `${tag} 合并红段不在名字牌左端`);
          assert.ok(inside(plate, env.bounds), `${tag} 合并名字牌超出可视区`);
          const plateCenter = (daily.placement.plate.left + daily.placement.plate.right) / 2;
          const mergedCenter = (plate.left + plate.right) / 2;
          const atLeft = plate.left <= env.bounds.left + 0.001;
          const atRight = plate.right >= env.bounds.right - 0.001;
          if (!atLeft && !atRight) {
            assert.ok(Math.abs(mergedCenter - plateCenter) < 0.001, `${tag} 合并后没有以图标为中心`);
          }
          // 原名牌主体紧贴红段右侧，宽度不变。
          const body = {
            left: badge.rect.right,
            right: badge.rect.right + daily.plateW,
            top: plate.top,
            bottom: plate.bottom,
          };
          assert.ok(Math.abs(((body.left + body.right) / 2) - (plateCenter + (badge.plateShiftX ?? 0))) < 0.001,
            `${tag} 合并后名牌主体没有正确跟随红段`);
        }

        failures.push(`${vp.name}|${daily.id}|${playerId}|${badge.side}`);
      }
    }
  }
  return { sides, failures };
}

test('r39 限定牌：4 尺寸 × 8 地点 × 4 玩家位置全覆盖，始终带字且在可视区内', () => {
  try {
    const { sides, failures } = collectSides();
    assert.equal(Object.values(sides).reduce((a, b) => a + b, 0), 128, '覆盖数量不是 128');
    // 三级回退都要被命中：右/左 → 下方 → 合并。
    assert.ok(sides.right > 0, `右侧档一次都没命中：${JSON.stringify(sides)}`);
    assert.ok(sides.left > 0, `左侧档一次都没命中：${JSON.stringify(sides)}`);
    assert.ok(sides.below > 0, `下方档一次都没命中：${JSON.stringify(sides)}`);
    assert.ok(sides.merged > 0, `合并档一次都没命中：${JSON.stringify(sides)}`);
    assert.equal(failures.length, 128, '覆盖明细数量不是 128');
  } finally {
    setFontScreenMetrics({
      physicalWidth: DESIGN_WIDTH,
      physicalHeight: DESIGN_HEIGHT,
      visibleWidth: DESIGN_WIDTH,
      visibleHeight: DESIGN_HEIGHT,
      devicePixelRatio: 1,
    });
  }
});

test('r39 五个失败组合：390/福田CBD、SE/东门、360/东门、360/福田CBD、PM/福田CBD 下方居中或 merged 兜底', () => {
  const failed = [
    { vp: '390x844', loc: 'futian_cbd' },
    { vp: 'SE 375x667', loc: 'dongmen' },
    { vp: '360x780', loc: 'dongmen' },
    { vp: '360x780', loc: 'futian_cbd' },
    { vp: 'ProMax 430x932', loc: 'futian_cbd' },
  ];
  try {
    for (const item of failed) {
      const vp = VIEWPORTS.find((v) => v.name === item.vp)!;
      const env = setupViewport(vp);
      const daily = env.markers.find((m) => m.id === item.loc)!;
      // 截图中的失败组合是「玩家在白石洲」时拍的；单独断言所有障碍都不相交。
      const player = env.markers.find((m) => m.id === 'baishizhou')!;
      const blockers = blockersFor(daily, player, env.markers, env.iconSize);
      const badge = computeBadgeUnderPlate(daily.placement.plate, 64, 36, {
        gap: 2,
        blockers,
        mergedBlockers: [daily.placement.icon, heroRect(player, env.iconSize)],
        bounds: env.bounds,
        minClearance: MAP_BADGE_CLEARANCE,
      });
      const tag = `${item.vp} 限定@${item.loc} 玩家@baishizhou (${badge.side})`;
      assert.ok(badge.side === 'below' || badge.side === 'merged',
        `${tag} 应回退到下方或合并档`);
      if (badge.side !== 'merged') {
        for (const blocker of blockers) {
          assert.equal(rectsWithinDistance(badge.rect, blocker, MAP_BADGE_CLEARANCE), false,
            `${tag} 小牌与障碍物距离不足 2px`);
        }
      }
      assert.ok(inside(badge.rect, env.bounds), `${tag} 小牌超出可视区`);
    }
  } finally {
    setFontScreenMetrics({
      physicalWidth: DESIGN_WIDTH,
      physicalHeight: DESIGN_HEIGHT,
      visibleWidth: DESIGN_WIDTH,
      visibleHeight: DESIGN_HEIGHT,
      devicePixelRatio: 1,
    });
  }
});

test('r39 纯函数候选顺序：右 → 左 → 下 → 合并，任何情况都不产生无字小点', () => {
  const plate = { left: -56, right: 56, top: 20, bottom: -20 };
  const right = computeBadgeUnderPlate(plate, 64, 36, { gap: 2 });
  assert.equal(right.side, 'right');
  assert.ok(Math.abs(right.rect.left - (plate.right + 2)) < 0.001);
  assert.ok(Math.abs(right.centerY - 0) < 0.001);

  const left = computeBadgeUnderPlate(plate, 64, 36, {
    gap: 2,
    bounds: { left: plate.left - 100, right: plate.right + 20, top: 100, bottom: -100 },
  });
  assert.equal(left.side, 'left');
  assert.ok(Math.abs(left.rect.right - (plate.left - 2)) < 0.001);

  const below = computeBadgeUnderPlate(plate, 64, 36, {
    gap: 2,
    bounds: { left: -200, right: 200, top: 100, bottom: -100 },
    blockers: [
      { left: plate.right, right: plate.right + 100, top: 100, bottom: -100 },
      { left: plate.left - 100, right: plate.left, top: 100, bottom: -100 },
    ],
  });
  assert.equal(below.side, 'below');
  assert.ok(Math.abs(below.rect.top - (plate.bottom - 2)) < 0.001);
  assert.ok(Math.abs(below.centerX - 0) < 0.001, '下方首个候选不是水平居中');

  // 下方居中/滑动都被占满 → 合并，仍然是一块与名字牌等高的红牌。
  const merged = computeBadgeUnderPlate(plate, 64, 36, {
    gap: 2,
    bounds: { left: -200, right: 200, top: 100, bottom: -100 },
    blockers: [
      { left: plate.right, right: plate.right + 100, top: 100, bottom: -100 },
      { left: plate.left - 100, right: plate.left, top: 100, bottom: -100 },
      { left: -100, right: 100, top: plate.bottom, bottom: -100 },
    ],
  });
  assert.equal(merged.side, 'merged');
  assert.equal(merged.merged, true);
  assert.ok(Math.abs((merged.rect.top - merged.rect.bottom) - 40) < 0.001, '合并红段没有与名字牌等高');
  assert.ok(Math.abs(merged.rect.left - merged.plateRect!.left) < 0.001, '合并红段不在名字牌左端');
  assert.ok(Math.abs((merged.plateRect!.right - merged.plateRect!.left) - (56 * 2 + 64)) < 0.001,
    '合并后名字牌没有整体加宽');
  assert.ok(Math.abs((merged.plateRect!.left + merged.plateRect!.right) / 2 - 0) < 0.001,
    '合并后没有以图标为中心重新对齐');
  // 没有任何 stamp / inside 分支，返回的永远是完整带字红牌。
  assert.equal('stamp' in merged, false);
  assert.equal(MAP_BADGE_TEXT, '限定');
});

test('r39 GameRoot 集成：删除印章/小点分支，限定牌始终带「限定」文字', () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), 'cocos/assets/scripts/GameRoot.ts'), 'utf8');
  assert.doesNotMatch(src, /daily_badge_stamp/, '仍保留名字牌内红印章节点');
  assert.doesNotMatch(src, /MAP_BADGE_STAMP_SIZE/, '仍保留印章尺寸常量');
  assert.doesNotMatch(src, /stampSize|badge\.stamp/, '仍保留印章参数/分支');
  assert.doesNotMatch(src, /Art\.makeVisual\('badge'/, '仍使用 badge.png 画无字小点');
  assert.match(src, /lb\.string = MAP_BADGE_TEXT/, '小牌没有始终写「限定」二字');
  assert.match(src, /lb\.fontSize = pxFont\(12\)/, '小牌字号没有按全局像素字号换算');
  assert.match(src, /minClearance: 2/, '小牌候选没有留 2px 余量');
  assert.match(src, /badge\.merged/, '地图没有处理合并档');
  assert.match(src, /badgeX = -\(plateW \+ MAP_BADGE_W\) \/ 2/, '合并红段没有贴在名字牌左端');
  assert.match(src, /plateShiftX/, '合并后名字牌没有整体平移对齐');

  const mapStart = src.indexOf('private showMap()');
  const mapEnd = src.indexOf('private createMapPlate', mapStart);
  const mapCode = src.slice(mapStart, mapEnd);
  assert.match(mapCode, /computeBadgeUnderPlate\(/, '地图没有使用纯函数定位限定牌');
  assert.match(mapCode, /blockers\.push\(other\.placement\.icon\)/, '碰撞没有把自家地点图标算进去');
  assert.match(mapCode, /other\.loc\.id !== loc\.id\) blockers\.push\(other\.placement\.plate\)/,
    '碰撞只应排除自家名字牌');
  assert.match(mapCode, /bounds: badgeBounds/, '小牌没有地图可视区边界');
  assert.match(mapCode, /hero\.setSiblingIndex\(marker\.children\.length - 1\)/, '玩家小人没有最高层级');

  const ignore = fs.readFileSync(path.resolve(process.cwd(), '.gitignore'), 'utf8');
  assert.match(ignore, /^ly15_info\.json$/m, '.gitignore 没有继续忽略 ly15_info.json');
  assert.equal(fs.existsSync(path.resolve(process.cwd(), 'ly15_info.json')), false,
    'ly15_info.json 不应出现在仓库工作区');
});
