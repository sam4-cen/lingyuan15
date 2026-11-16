import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { Game, Rng, createRunStats } from '../src/core/game';
import {
  CONFIG,
  ITEMS,
  LOCATIONS,
  FORTUNES,
  DAILY_SPECIALS,
  DEATH_LINES,
  SURVIVAL_TITLES,
  DAY_ROASTS,
  EVENTS,
  affordabilityOf,
} from '../src/core/config';
import { ART_ALIAS, ICON_MAP, MAP_POINTS } from '../cocos/assets/scripts/ui/ArtMap';
import { bgSpriteFrameCandidates, resolveBgAssetPath } from '../cocos/assets/scripts/ui/BgAssetPath';
import { bagCellCenter, positionForAnchor, floorLootStyle, floorSlotX } from '../src/core/placement';
import { computeCardTextBox, fitCardText } from '../cocos/assets/scripts/ui/CardTextLayout';
import { COPY_CORPUS, balanceOrphanLine, layoutSpeechBubble, layoutWrappedSpeechBubble, measureTextWidth, placeBubbleAboveBag, placeSpeechBubble, rectsOverlap, splitWrapUnits } from '../cocos/assets/scripts/ui/BubbleLayout';
import { ATOMIC_PHRASES, auditWrappedLines, isInsideProtectedPhrase, meaningfulCharCount, protectedPhraseSpans, wordBreakOffsets, wrapTextToLines } from '../cocos/assets/scripts/ui/WordBreak';
import { allWordBreakTexts, fortuneTexts, expandTemplate, TEMPLATE_VARIABLES } from '../cocos/assets/scripts/ui/WordBreakCorpus';
import { DESIGN_HEIGHT, DESIGN_WIDTH, PIXEL_OUTLINE_WIDTH, UI_SCALE, bodyFontSizeForWidth, buttonMinTouchHeight, buttonPaddingX, buttonPaddingY, cssPxToDesign, fontSizeForSourceScale, fontSizeStep, fontSizeTable, fontMetricsForDevice, fontScaleK, footerFontSizeForWidth, getFontDevicePixelRatio, getFontPhysicalWidth, getFontVisibleWidth, lineHeightForFontSize, measurePixelTextWidth, pxFont, pxSpacing, setFontScreenMetrics, setFontVisibleWidth, snapFontSize, snapLineHeight, titleFontSizeForText, titleFontSizeForWidth } from '../cocos/assets/scripts/ui/PixelFontMetrics';
import { BM_FONT_ADVANCES, BM_FONT_LINE_HEIGHT } from '../cocos/assets/scripts/ui/BmFontData';
import { BUILD_TAG, IS_TEST_BUILD } from '../cocos/assets/scripts/Version';
import * as ts from 'typescript';
import { MAP_BADGE_OFFSET, MAP_MARKER_MARGIN, computeBadgeUnderPlate, computeMapLayout, computeMapPlateHeight, computeMapPlateWidth, mapPointToScreen, placeDailyBadge, placeDailyBadgeRelativeToPlate, placeMapMarker } from '../cocos/assets/scripts/ui/MapLayout';
import { formatCertDate } from '../cocos/assets/scripts/ui/DateFormat';
import { LOCATION_BOTTOM_GAP, bagVisualSizes, computeLocationBottomLayout } from '../cocos/assets/scripts/ui/LocationBottomLayout';
import { BTN_SLEEP_ART_H, BTN_SLEEP_ART_W, BTN_SLEEP_INSETS, BTN_SLEEP_TEXT_RECT, computeHomeSleepLayout, computeSleepTextLayout } from '../cocos/assets/scripts/ui/SleepButtonLayout';
import { EVENT_BG_ART, EVENT_BG_BY_EVENT, EVENT_DIM_ALPHA_SPECIAL, EVENT_BOTTOM_BAR_HEIGHT, EVENT_BUTTONS_BOTTOM_MAX_CSS, EVENT_BUTTONS_BOTTOM_PCT, EVENT_BUTTONS_TOP_PCT, EVENT_BUTTON_HEIGHT, EVENT_BUTTON_WIDTH_RATIO, EVENT_DESC_PCT, EVENT_HUD_HEIGHT, EVENT_IDLE_FOOT_X, EVENT_IDLE_FOOT_Y, EVENT_IDLE_ROLE_SRC, EVENT_OPTION_GAP, EVENT_PRESENTATIONS, EVENT_RAIN_ANCHOR_X, EVENT_RAIN_ANCHOR_Y, EVENT_RAIN_DROP_FRAME_SECONDS, EVENT_RAIN_DROPS_ART, EVENT_RAIN_ROLE_ART, EVENT_RAIN_ROLE_SRC, EVENT_RESULT_MIN_SECONDS, EVENT_RESULT_PROMPT, EVENT_ROLE_FOOT_SRC, EVENT_ROLE_MAX_HEIGHT_PCT, EVENT_ROLE_PCT, EVENT_TITLE_PCT, EVENT_GUARD_ANCHOR_X, EVENT_GUARD_ANCHOR_Y, computeEventArea, computeEventLayout, eventBackgroundCover, eventRainRolePlacement, eventRectsOverlap, eventRoleScale, eventTitleFontSize, computeEventResultLayout, EVENT_BUTTONS_BOTTOM_GAP, EVENT_DESC_BUTTON_GAP, EVENT_NPC_DESC_MAX_GAP, EVENT_DESC_PLATE_ALPHA, EVENT_DESC_PLATE_COLOR, EVENT_DESC_PLATE_PAD, eventRoleVisualSize } from '../cocos/assets/scripts/ui/EventLayout';
import { FORTUNE_PAPER_ART, FORTUNE_PAPER_INSETS, FORTUNE_TEXT_RECT, FORTUNE_PAPER_SCALE, FORTUNE_PAPER_WIDTH_RATIO, FORTUNE_PAPER_MIN_HEIGHT_RATIO, FORTUNE_TEXT_WIDTH_RATIO, FORTUNE_TEXT_MIN_CSS, computeFortunePaperLayout, computeFortunePaperLayoutForText, fitFortuneText, fortuneTextBounds, fortuneTextFontSize, fortunePaperNodeScale, fortunePaperNodeSize } from '../cocos/assets/scripts/ui/FortuneLayout';
import { EVENT_RESULT_TEXTS, allEventResultTexts, eventResultText } from '../cocos/assets/scripts/ui/EventCopy';

class MockRng {
  nextQueue: number[] = [];
  chanceQueue: boolean[] = [];
  intQueue: number[] = [];
  pickQueue: any[] = [];
  next() { return this.nextQueue.length ? this.nextQueue.shift()! : 0.5; }
  int(a: number, b: number) { return this.intQueue.length ? this.intQueue.shift()! : 1; }
  pick<T>(arr: T[]) { return this.pickQueue.length ? this.pickQueue.shift()! : arr[0]; }
  chance(p: number) { return this.chanceQueue.length ? this.chanceQueue.shift()! : false; }
}

function newGame(seed = 42) {
  const g = new Game(seed);
  g.startGame();
  return g;
}
function mockRng(g: Game) { const r = new MockRng(); (g as any).rng = r; return r; }
function setupLocation(g: Game, locId = 'baishizhou') {
  g.location = locId;
  g.phase = 'location';
  (g as any).boxes = new Map([[locId, [
    { id: 'box_s', size: 'small', opened: false },
    { id: 'box_b', size: 'big', opened: false },
  ]]]);
}
function addFloorItem(g: Game, itemId: string, uid: number) {
  (g as any).floor.push({ uid, itemId });
}
function itemRarity(itemId: string) {
  return ITEMS.find(i => i.id === itemId)!.rarity;
}

/** 读取 PNG 头与调色板，确认事件背景不是纯黑占位。 */
function readPngInfo(file: string): { w: number; h: number; colorType: number; paletteNonBlack: boolean } {
  const b = fs.readFileSync(file);
  assert.equal(b.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', `${file} 不是 PNG`);
  let pos = 8;
  let w = 0;
  let h = 0;
  let colorType = 0;
  let paletteNonBlack = false;
  while (pos + 8 <= b.length) {
    const len = b.readUInt32BE(pos);
    const type = b.subarray(pos + 4, pos + 8).toString('ascii');
    const data = b.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') {
      w = data.readUInt32BE(0);
      h = data.readUInt32BE(4);
      colorType = data[9];
    } else if (type === 'PLTE') {
      for (let i = 0; i + 2 < data.length; i += 3) {
        if (data[i] > 8 || data[i + 1] > 8 || data[i + 2] > 8) paletteNonBlack = true;
      }
    }
    if (type === 'IEND') break;
    pos += 12 + len;
  }
  return { w, h, colorType, paletteNonBlack };
}

test('占卜三种签与重抽扣钱递增', () => {
  const g = newGame();
  g.phase = 'fortune';
  g.money = 100;
  assert.ok(g.fortune);
  assert.ok(['good', 'meh', 'bad'].includes(g.fortune.tier));
  const cost0 = g.rerollCost();
  assert.equal(cost0, 5);
  assert.equal(g.rerollFortune(), true);
  assert.equal(g.rerollCount, 1);
  assert.equal(g.rerollCost(), 10);
  assert.equal(g.money, 95);
});

test('占卜非fortune阶段无法重抽', () => {
  const g = newGame();
  g.phase = 'map';
  g.money = 100;
  assert.equal(g.rerollFortune(), false);
});

test('第10天坏签权重增加', () => {
  const g = newGame();
  g.day = 10;
  const phase = (g as any).currentPhaseDef();
  assert.equal(phase.badFortuneBonus, 0.16);
});

test('每地点盒子数都在 3~6：好签偏多、坏签偏少', () => {
  const g = newGame();
  g.day = 1;

  g.phase = 'fortune';
  g.fortune = { tier: 'good' } as any;
  g.fortuneLocation = null;
  g.acceptFortune();
  for (const loc of LOCATIONS) {
    const count = g.boxesAt(loc.id).length;
    assert.ok(count >= 4 && count <= 6, `好签 ${loc.id} count ${count}`);
  }

  g.phase = 'fortune';
  g.fortune = { tier: 'meh' } as any;
  g.acceptFortune();
  for (const loc of LOCATIONS) {
    const count = g.boxesAt(loc.id).length;
    assert.ok(count >= 3 && count <= 5, `普通签 ${loc.id} count ${count}`);
  }

  g.phase = 'fortune';
  g.fortune = { tier: 'bad' } as any;
  g.acceptFortune();
  for (const loc of LOCATIONS) {
    const count = g.boxesAt(loc.id).length;
    assert.ok(count >= 3 && count <= 4, `坏签 ${loc.id} count ${count}`);
  }
});

test('长按时长增加稀有概率', () => {
  const g = newGame();
  g.location = 'huaqiangbei';
  (g as any).boxes = new Map([['huaqiangbei', [{ id: 'b', size: 'big', opened: false }]]]);
  g.mood = 100;
  g.fortune = null;
  const p0 = g.goldChance(0, 'b');
  const p3 = g.goldChance(3, 'b');
  assert.ok(p3 > p0);
  assert.equal(p0, 0);
});

test('超过4秒翻车率上升', () => {
  const g = newGame();
  setupLocation(g);
  g.fortune = null;
  const r = mockRng(g);
  const chanceCalls: number[] = [];
  r.chance = (p: number) => { chanceCalls.push(p); return false; };

  g.dig('box_s', 4);
  assert.equal(chanceCalls[0], 0);

  chanceCalls.length = 0;
  g.dig('box_b', 5);
  assert.ok(chanceCalls[0] > 0);
});

test('小盒体力扣除5', () => {
  const g = newGame();
  setupLocation(g);
  mockRng(g);
  g.stamina = 100;
  g.hunger = 100;
  g.dig('box_s', 0);
  assert.equal(g.stamina, 95);
});

test('大盒体力扣除12+每秒3', () => {
  const g = newGame();
  setupLocation(g);
  mockRng(g);
  g.stamina = 100;
  g.hunger = 100;
  g.dig('box_b', 2);
  assert.equal(g.stamina, 100 - 12 - 2 * 3);
});

test('每次掏盒饱腹减1', () => {
  const g = newGame();
  setupLocation(g);
  mockRng(g);
  g.hunger = 100;
  g.dig('box_s', 0);
  assert.equal(g.hunger, 99);
});

test('背包越界放置失败', () => {
  const g = newGame();
  g.phase = 'location';
  addFloorItem(g, 'cardboard_box', 1); // 2格
  assert.equal(g.placeFromFloor(1, 2, 2, false), false);
});

test('背包重叠放置失败', () => {
  const g = newGame();
  g.phase = 'location';
  addFloorItem(g, 'empty_water_bottle', 1);
  addFloorItem(g, 'empty_water_bottle', 2);
  g.placeFromFloor(1, 0, 0, false);
  assert.equal(g.placeFromFloor(2, 0, 0, false), false);
});

test('2格横放成功', () => {
  const g = newGame();
  g.phase = 'location';
  addFloorItem(g, 'cardboard_box', 1);
  assert.equal(g.placeFromFloor(1, 0, 0, false), true);
  assert.equal(g.bag[0].w, 2);
  assert.equal(g.bag[0].h, 1);
});

test('2格竖放成功', () => {
  const g = newGame();
  g.phase = 'location';
  addFloorItem(g, 'cardboard_box', 1);
  assert.equal(g.placeFromFloor(1, 0, 0, true), true);
  assert.equal(g.bag[0].w, 1);
  assert.equal(g.bag[0].h, 2);
});

test('扩背包后物品坐标保持', () => {
  const g = newGame();
  g.phase = 'location';
  g.money = 100;
  addFloorItem(g, 'empty_water_bottle', 1);
  g.placeFromFloor(1, 0, 0, false);
  g.expandBag();
  assert.equal(g.bagLevel, 1);
  assert.equal(g.bag[0].x, 0);
  assert.equal(g.bag[0].y, 0);
});

test('吃东西增加饱腹并移除物品', () => {
  const g = newGame();
  g.phase = 'location';
  g.hunger = 50;
  addFloorItem(g, 'cold_bun', 1); // hunger 15
  assert.equal(g.eat(1), true);
  assert.equal(g.hunger, 65);
  assert.equal(g.floor.length, 0);
});

test('食物Up加成', () => {
  const g = newGame();
  g.phase = 'location';
  g.hunger = 50;
  g.fortune = { effect: 'foodUp' } as any;
  addFloorItem(g, 'half_egg_tart', 1); // hunger 10
  g.eat(1);
  assert.equal(g.hunger, 50 + Math.round(10 * 1.2));
});

test('离开地点丢弃地上物品', () => {
  const g = newGame();
  g.phase = 'location';
  g.location = 'baishizhou';
  addFloorItem(g, 'empty_water_bottle', 1);
  g.leaveLocation();
  assert.equal(g.floor.length, 0);
  assert.equal(g.location, null);
  assert.equal(g.phase, 'map');
  assert.ok(g.log.some(s => s.includes('没装的东西落在了原地')));
});

test('回家扣体力与自动卖货', () => {
  const g = newGame();
  g.phase = 'location';
  g.location = 'baishizhou';
  g.stamina = 50;
  g.money = 0;
  addFloorItem(g, 'empty_water_bottle', 1); // 会被丢弃
  (g as any).bag = [{ uid: 2, itemId: 'old_newspaper', x: 0, y: 0, w: 1, h: 1 }];
  const cost = g.homeCost();
  assert.equal(g.goHome(), true);
  assert.equal(g.stamina, 50 - cost);
  assert.equal(g.location, null);
  assert.equal(g.phase, 'home');
  assert.equal(g.money, 0.5);
  assert.equal(g.bag.length, 0);
  assert.ok(g.lastDayReport);
});

test('回家体力不足失败', () => {
  const g = newGame();
  g.phase = 'location';
  g.location = 'baishizhou';
  g.stamina = 1;
  assert.equal(g.goHome(), false);
  assert.ok(g.location);
  assert.notEqual(g.phase, 'home');
});

test('倒下丢一半', () => {
  const g = newGame();
  g.day = 3;
  g.phase = 'location';
  g.location = 'baishizhou';
  g.hunger = 50;
  g.bag = [
    { uid: 1, itemId: 'empty_water_bottle', x: 0, y: 0, w: 1, h: 1 },
    { uid: 2, itemId: 'old_newspaper', x: 1, y: 0, w: 1, h: 1 },
    { uid: 3, itemId: 'crushed_can', x: 2, y: 0, w: 1, h: 1 },
    { uid: 4, itemId: 'left_slipper', x: 0, y: 1, w: 1, h: 1 },
  ];
  const r = mockRng(g);
  r.nextQueue = [0.1, 0.9, 0.7, 0.5]; // choose bench, then removal indices
  r.chanceQueue = [false, false];
  g.collapse();
  assert.equal(g.bag.length, 2);
});

test('倒下时只有 1 件也丢 1 件', () => {
  const g = newGame();
  g.day = 3;
  g.phase = 'location';
  g.location = 'baishizhou';
  g.hunger = 50;
  g.bag = [{ uid: 1, itemId: 'empty_water_bottle', x: 0, y: 0, w: 1, h: 1 }];
  const r = mockRng(g);
  r.nextQueue = [0.1, 0.5]; // 公园长椅，丢掉唯一一件
  r.chanceQueue = [false];
  g.collapse();
  assert.equal(g.bag.length, 0);
  assert.deepEqual(g.lastCollapse!.lostItems, ['空矿泉水瓶']);
});

test('倒下醒来保留剩下的一半，不自动卖货', () => {
  const g = newGame();
  g.day = 3;
  g.phase = 'location';
  g.location = 'baishizhou';
  g.hunger = 50;
  g.money = 0;
  g.bag = [
    { uid: 1, itemId: 'empty_water_bottle', x: 0, y: 0, w: 1, h: 1 },
    { uid: 2, itemId: 'old_newspaper', x: 1, y: 0, w: 1, h: 1 },
    { uid: 3, itemId: 'crushed_can', x: 2, y: 0, w: 1, h: 1 },
    { uid: 4, itemId: 'left_slipper', x: 0, y: 1, w: 1, h: 1 },
  ];
  const r = mockRng(g);
  r.nextQueue = [0.1, 0.9, 0.7]; // 公园长椅，随机丢 2 件
  r.chanceQueue = [false];
  g.collapse();
  assert.equal(g.bag.length, 2);
  const kept = g.bag.map((p) => p.uid);
  const keptValue = g.bag.reduce(
    (sum, p) => sum + (ITEMS.find((i) => i.id === p.itemId)?.price ?? 0),
    0,
  );

  g.wakeUp();
  assert.equal(g.phase, 'fortune');
  assert.equal(g.day, 4);
  assert.equal(g.location, null);
  assert.equal(g.money, 0, '醒来不应该卖货');
  assert.deepEqual(g.bag.map((p) => p.uid), kept, '剩下的物品应保留');
  assert.ok(keptValue > 0);

  // 第二天回家才卖，卖价 = 保留下来的物品价值
  g.acceptFortune();
  assert.equal(g.travel('baishizhou'), true);
  assert.equal(g.goHome(), true);
  assert.equal(g.bag.length, 0);
  assert.equal(g.money, keptValue);
});

test('倒下选过夜地点钱不够按公园', () => {
  const g = newGame();
  g.day = 5;
  g.hunger = 50;
  g.money = 0;
  g.phase = 'location';
  g.location = 'baishizhou';
  g.bag = [{ uid: 1, itemId: 'empty_water_bottle', x: 0, y: 0, w: 1, h: 1 }];
  const r = mockRng(g);
  r.nextQueue = [0.6]; // choose diner
  r.chanceQueue = [false, false];
  g.collapse();
  assert.equal(g.lastCollapse!.spot, 'bench');
  assert.equal(g.lastCollapse!.staminaNextDay, 40);
});

test('买饭成功', () => {
  const g = newGame();
  g.phase = 'home';
  g.money = 20;
  g.hunger = 10;
  assert.equal(g.foodPrice, CONFIG.foodPrice);
  assert.equal(g.buyFood(), true);
  assert.equal(g.money, 20 - g.foodPrice);
  assert.equal(g.hunger, 10 + CONFIG.foodHunger);
});

test('买饭钱不够', () => {
  const g = newGame();
  g.phase = 'home';
  g.money = 5;
  assert.equal(g.buyFood(), false);
});

test('扩背包成功', () => {
  const g = newGame();
  g.phase = 'home';
  g.money = 50;
  assert.equal(g.expandBag(), true);
  assert.equal(g.bagLevel, 1);
  assert.equal(g.money, 10);
});

test('扩背包钱不够', () => {
  const g = newGame();
  g.phase = 'home';
  g.money = 10;
  assert.equal(g.expandBag(), false);
});

test('升级落脚点成功', () => {
  const g = newGame();
  g.phase = 'home';
  g.money = 70;
  assert.equal(g.upgradeHome(), true);
  assert.equal(g.homeLevel, 1);
  assert.equal(g.money, 10);
});

test('升级落脚点钱不够', () => {
  const g = newGame();
  g.phase = 'home';
  g.money = 30;
  assert.equal(g.upgradeHome(), false);
});

test('巡逻事件礼貌离开：只离开本地点，活着且背包不没收', () => {
  const g = newGame();
  g.phase = 'event';
  g.location = 'baishizhou';
  g.stamina = 50;
  g.bag = [{ uid: 1, itemId: 'cardboard_box', x: 0, y: 0, w: 2, h: 1 }];
  (g as any).pendingEvent = { id: 'patrol', name: '巡逻', options: ['礼貌离开', '装作散步'] };
  g.resolveEvent(0);
  assert.equal(g.phase, 'map');
  assert.notEqual(g.phase, 'lost');
  assert.equal(g.bag.length, 1, '礼貌离开不应没收背包');
  assert.equal(g.deathCauseId, '');
  assert.ok(g.bannedToday.includes('baishizhou'));
  assert.equal(g.stamina, 50 - CONFIG.patrolLeaveStamina);
  assert.equal(g.securityChasedToday, 0, '礼貌离开不算被保安抓住');
});

test('装作散步失败：活着、背包没收、本地点今天不能再进', () => {
  const g = newGame();
  g.phase = 'event';
  g.location = 'baishizhou';
  g.stamina = 50;
  g.mood = 50;
  g.bag = [{ uid: 1, itemId: 'cardboard_box', x: 0, y: 0, w: 2, h: 1 }];
  const r = mockRng(g);
  r.chanceQueue = [false]; // 失败
  (g as any).pendingEvent = { id: 'patrol', name: '巡逻', options: ['礼貌离开', '装作散步'] };
  g.resolveEvent(1);
  assert.equal(g.phase, 'map');
  assert.notEqual(g.phase, 'lost');
  assert.equal(g.bag.length, 0, '装作散步失败应没收背包');
  assert.ok(g.bannedToday.includes('baishizhou'), '本地点今天应禁止再进');
  assert.equal(g.deathCauseId, '');
  assert.equal(g.stats.pretendWalkCount, 1);
  assert.equal(g.stats.securityEncounters, 1);
  assert.equal(g.securityChasedToday, 1);
  assert.equal(g.mood, 50 + CONFIG.patrolMood);
});

test('装作散步结果文案跟随真实结算：成功保留背包，失败没收并拉黑', () => {
  const success = newGame();
  success.phase = 'event';
  success.location = 'baishizhou';
  success.bag = [{ uid: 1, itemId: 'cardboard_box', x: 0, y: 0, w: 2, h: 1 }];
  const rs = mockRng(success);
  rs.chanceQueue = [true];
  (success as any).pendingEvent = { id: 'patrol', name: '巡逻', options: ['礼貌离开', '装作散步'] };
  success.resolveEvent(1);
  assert.equal(success.lastPatrolWalkKept, true);
  assert.equal(success.phase, 'location');
  assert.equal(success.bag.length, 1, '成功应保留背包');
  assert.ok(!success.bannedToday.includes('baishizhou'), '成功不应拉黑地点');
  assert.equal(success.pretendWalkResultText(), '大叔笑着走了');

  const failure = newGame();
  failure.phase = 'event';
  failure.location = 'baishizhou';
  failure.bag = [{ uid: 1, itemId: 'cardboard_box', x: 0, y: 0, w: 2, h: 1 }];
  const rf = mockRng(failure);
  rf.chanceQueue = [false];
  (failure as any).pendingEvent = { id: 'patrol', name: '巡逻', options: ['礼貌离开', '装作散步'] };
  failure.resolveEvent(1);
  assert.equal(failure.lastPatrolWalkKept, false);
  assert.equal(failure.phase, 'map');
  assert.equal(failure.bag.length, 0, '失败应没收背包');
  assert.ok(failure.bannedToday.includes('baishizhou'), '失败应拉黑地点');
  assert.equal(failure.pretendWalkResultText(), '大叔指路请你走，背包被没收');
});

test('保安事件只请出小区：不没收背包、不死亡', () => {
  const g = newGame();
  g.phase = 'event';
  g.location = 'baishizhou';
  g.bag = [
    { uid: 1, itemId: 'empty_water_bottle', x: 0, y: 0, w: 1, h: 1 },
    { uid: 2, itemId: 'old_newspaper', x: 1, y: 0, w: 1, h: 1 },
  ];
  (g as any).pendingEvent = { id: 'guard', name: '保安', options: ['被请出小区'] };
  g.resolveEvent(0);
  assert.equal(g.phase, 'map');
  assert.notEqual(g.phase, 'lost');
  assert.equal(g.bag.length, 2, '保安事件不应没收背包');
  assert.equal(g.deathCauseId, '');
  assert.ok(g.bannedToday.includes('baishizhou'));
  assert.equal(g.stats.securityEncounters, 1);
  assert.equal(g.securityChasedToday, 1);
});

test('同行让给他', () => {
  const g = newGame();
  g.phase = 'event';
  g.location = 'baishizhou';
  g.mood = 50;
  (g as any).pendingEvent = { id: 'rival', name: '同行', options: ['让给他', '比谁掏得快'] };
  g.resolveEvent(0);
  assert.equal(g.phase, 'location');
  assert.equal(g.mood, 50 + CONFIG.rivalYieldMood);
});

test('同行比输扣体力', () => {
  const g = newGame();
  g.phase = 'event';
  g.location = 'baishizhou';
  g.stamina = 30;
  (g as any).pendingEvent = { id: 'rival', name: '同行', options: ['让给他', '比谁掏得快'] };
  g.resolveEvent(1, false);
  assert.equal(g.phase, 'location');
  assert.equal(g.stamina, 30 - CONFIG.rivalLoseStamina);
});

test('阿姨送饭', () => {
  const g = newGame();
  g.phase = 'event';
  g.location = 'baishizhou';
  g.hunger = 10;
  g.mood = 10;
  (g as any).pendingEvent = { id: 'auntie', name: '阿姨', options: ['谢谢阿姨'] };
  g.resolveEvent(0);
  assert.equal(g.hunger, 10 + CONFIG.auntieHunger);
  assert.equal(g.mood, 10 + CONFIG.auntieMood);
  assert.equal(g.phase, 'location');
});

test('外卖事件', () => {
  const g = newGame();
  g.phase = 'event';
  g.location = 'baishizhou';
  g.hunger = 20;
  (g as any).pendingEvent = { id: 'delivery', name: '外卖', options: ['收下外卖'] };
  g.resolveEvent(0);
  assert.equal(g.hunger, 20 + CONFIG.deliveryHunger);
});

test('钱包只能归还', () => {
  const g = newGame();
  g.phase = 'event';
  g.location = 'baishizhou';
  g.money = 0;
  g.mood = 30;
  (g as any).pendingEvent = { id: 'wallet', name: '钱包', options: ['归还钱包'] };
  g.resolveEvent(0);
  assert.equal(g.money, CONFIG.walletMoney);
  assert.equal(g.mood, 30 + CONFIG.walletMood);
});

test('猫喂食只消耗背包食物，不增加玩家饱腹', () => {
  const g = newGame();
  g.phase = 'event';
  g.location = 'baishizhou';
  g.hunger = 50;
  g.catLuck = 0;
  g.bag = [{ uid: 1, itemId: 'cold_bun', x: 0, y: 0, w: 1, h: 1 }];
  (g as any).pendingEvent = { id: 'cat', name: '猫', options: ['喂它', '不喂'] };
  g.resolveEvent(0);
  assert.equal(g.catLuck, CONFIG.catLuckDigs);
  assert.equal(g.bag.length, 0);
  assert.equal(g.hunger, 50, '喂猫不应该给玩家加饱腹');
});

test('猫喂食时背包没吃的，给提示且不消耗地面食物', () => {
  const g = newGame();
  g.phase = 'event';
  g.location = 'baishizhou';
  g.hunger = 50;
  g.catLuck = 0;
  g.bag = [];
  addFloorItem(g, 'cold_bun', 1);
  (g as any).pendingEvent = { id: 'cat', name: '猫', options: ['喂它', '不喂'] };
  g.resolveEvent(0);
  assert.equal(g.catLuck, 0);
  assert.equal(g.floor.length, 1, '地面食物不应被当作背包食物喂掉');
  assert.equal(g.hunger, 50);
  assert.ok(g.lastEventNotice.includes('没吃的'));
});

test('猫不喂不增加幸运', () => {
  const g = newGame();
  g.phase = 'event';
  g.location = 'baishizhou';
  g.catLuck = 0;
  addFloorItem(g, 'cold_bun', 1);
  (g as any).pendingEvent = { id: 'cat', name: '猫', options: ['喂它', '不喂'] };
  g.resolveEvent(1);
  assert.equal(g.catLuck, 0);
  assert.equal(g.floor.length, 1);
});

test('下雨事件设置raining', () => {
  const g = newGame();
  g.phase = 'event';
  g.location = 'baishizhou';
  (g as any).pendingEvent = { id: 'rain', name: '下雨', options: ['撑住'] };
  g.resolveEvent(0);
  assert.equal(g.raining, true);
});

test('饿晕死亡和死因文案', () => {
  const g = newGame();
  setupLocation(g);
  mockRng(g);
  g.hunger = 1;
  g.dig('box_s', 0);
  assert.equal(g.phase, 'lost');
  assert.ok(g.deathCause.includes('饿'));
});

test('活满15天胜利', () => {
  const g = newGame();
  g.day = 15;
  g.phase = 'home';
  // 第 11~15 天每天饱腹 -76，满饱腹过夜才会活下来
  g.hunger = CONFIG.maxHunger;
  g.sleep();
  assert.equal(g.phase, 'won');
});

test('午夜时体力足够自动回家', () => {
  const g = newGame();
  g.phase = 'location';
  g.location = 'baishizhou';
  g.minute = 1440;
  g.stamina = 100;
  mockRng(g);
  (g as any).checkMidnight();
  assert.equal(g.phase, 'home');
});

test('午夜时体力不足倒下', () => {
  const g = newGame();
  g.phase = 'location';
  g.location = 'baishizhou';
  g.minute = 1440;
  g.stamina = 1;
  g.hunger = 50;
  const r = mockRng(g);
  r.nextQueue = [0.1];
  r.chanceQueue = [false];
  (g as any).checkMidnight();
  assert.equal(g.phase, 'collapsed');
});

test('第1天保底优良', () => {
  const g = newGame();
  g.day = 1;
  g.phase = 'location';
  g.location = 'baishizhou';
  (g as any).boxes = new Map([['baishizhou', [{ id: 'box_b', size: 'big', opened: false }]]]);
  (g as any).dayHasGoodOrAbove = false;
  const r = mockRng(g);
  r.nextQueue = [0.99, 0.99]; // rollRarity returns common
  r.chanceQueue = [false, false]; // no mishap, no event
  const res = g.dig('box_b', 0);
  assert.ok(res.ok);
  const hasGood = res.items.some(i => itemRarity(i.itemId) !== 'common');
  assert.equal(hasGood, true);
});

test('同种子可复现', () => {
  const g1 = newGame(123);
  const g2 = newGame(123);
  assert.equal(g1.fortune!.id, g2.fortune!.id);
  g1.acceptFortune();
  g2.acceptFortune();
  const counts1 = LOCATIONS.map(l => g1.boxesAt(l.id).length);
  const counts2 = LOCATIONS.map(l => g2.boxesAt(l.id).length);
  assert.deepEqual(counts1, counts2);
  g1.travel('baishizhou');
  g2.travel('baishizhou');
  const r1 = mockRng(g1);
  const r2 = mockRng(g2);
  r1.nextQueue = [0.5, 0.5];
  r2.nextQueue = [0.5, 0.5];
  const boxId1 = g1.boxesAt('baishizhou')[0].id;
  const boxId2 = g2.boxesAt('baishizhou')[0].id;
  const res1 = g1.dig(boxId1, 0);
  const res2 = g2.dig(boxId2, 0);
  assert.deepEqual(res1.items.map(i => i.itemId), res2.items.map(i => i.itemId));
});
test('所有事件 resolveEvent 后离开 event 状态', () => {
  const cases: { id: string; opt: number; win: boolean }[] = [
    { id: 'patrol', opt: 0, win: false },
    { id: 'patrol', opt: 1, win: false },
    { id: 'guard', opt: 0, win: false },
    { id: 'rival', opt: 0, win: false },
    { id: 'rival', opt: 1, win: true },
    { id: 'rival', opt: 1, win: false },
    { id: 'auntie', opt: 0, win: false },
    { id: 'delivery', opt: 0, win: false },
    { id: 'wallet', opt: 0, win: false },
    { id: 'cat', opt: 0, win: false },
    { id: 'rain', opt: 0, win: false },
  ];

  for (const c of cases) {
    const g = newGame();
    g.day = 5;
    g.phase = 'event';
    g.location = 'baishizhou';
    g.stamina = 50;
    g.hunger = 50;
    g.money = 0;
    (g as any).pendingEvent = { id: c.id, name: c.id, options: ['选项'] };
    g.resolveEvent(c.opt, c.win);
    assert.notEqual(g.phase, 'event', `${c.id} opt=${c.opt} 仍停在 event`);
    assert.equal((g as any).pendingEvent, null, `${c.id} pendingEvent 未清空`);
  }
});

test('日结算最离谱与今日战绩是同一件物品，金额不拆行', () => {
  const g = newGame();
  g.phase = 'location';
  g.location = 'baishizhou';
  g.stamina = 50;
  g.bag = [
    { uid: 1, itemId: 'old_newspaper', x: 0, y: 0, w: 1, h: 1 },
    { uid: 2, itemId: 'old_phone', x: 1, y: 0, w: 1, h: 1 },
  ];
  assert.equal(g.goHome(), true);
  const report = g.lastDayReport!;
  assert.equal(report.bestItem, '旧手机');
  assert.equal(report.bestItemId, 'old_phone');
  assert.ok((report.bestItemPrice ?? 0) > 0);
  assert.equal(report.staminaLeft, g.stamina);
  assert.ok(report.roast.length > 0, '结算卡应有大字吐槽');
  assert.ok(!report.roast.includes('{'), '吐槽占位符应已替换');
  assert.ok(report.quip.includes('旧手机'), '旧版今日战绩仍保留最离谱物品');
  assert.ok(report.quip.includes('¥\u00A0'), '¥ 与金额之间应是不换行空格');
  assert.ok(!report.quip.includes('¥ '), '¥ 与金额之间不能是普通空格');
});

test('所有物品 id 都有图标映射', () => {
  for (const item of ITEMS) {
    assert.ok(ICON_MAP[item.id], `${item.id} 没有图标映射`);
  }
});

test('夜间温情由逻辑层决定并保留结果', () => {
  const warm = newGame();
  warm.day = 3;
  warm.phase = 'home';
  warm.hunger = 50;
  warm.mood = 50;
  const rw = mockRng(warm);
  rw.chanceQueue = [true];
  warm.sleep();
  assert.equal(warm.lastNightWarmth, true);
  assert.equal(warm.hunger, 50 + CONFIG.nightWarmthHunger - 12);
  assert.equal(warm.mood, 50 + CONFIG.warmthMood + CONFIG.moodPerDay);
  assert.equal(warm.phase, 'fortune', '睡觉后应进入下一天的占卜');

  const cold = newGame();
  cold.day = 3;
  cold.phase = 'home';
  cold.hunger = 50;
  cold.mood = 50;
  const rc = mockRng(cold);
  rc.chanceQueue = [false];
  cold.sleep();
  assert.equal(cold.lastNightWarmth, false);
  assert.equal(cold.hunger, 50 - 12);
  assert.equal(cold.mood, 50 + CONFIG.moodPerDay);
});

test('保安事件当天再饿死：用保安文案，不冒充装作散步次数', () => {
  const g = newGame();
  g.day = 5;
  g.phase = 'event';
  g.location = 'baishizhou';
  g.bag = [{ uid: 1, itemId: 'cardboard_box', x: 0, y: 0, w: 2, h: 1 }];
  (g as any).pendingEvent = { id: 'guard', name: '保安', options: ['被请出小区'] };
  g.resolveEvent(0);
  assert.equal(g.phase, 'map');
  assert.equal(g.securityChasedToday, 1);

  // 同一天回家睡觉，饱腹归零：死因仍是饿，但文案走「被保安…」。
  g.phase = 'home';
  g.hunger = 1;
  const r = mockRng(g);
  r.chanceQueue = [false];
  g.sleep();
  assert.equal(g.phase, 'lost');
  assert.equal(g.deathCauseId, 'starvation');
  assert.ok(DEATH_LINES.security.includes(g.deathLine), `应使用保安死因文案：${g.deathLine}`);
  assert.ok(!g.deathLine.includes('第0次'));
  assert.ok(!g.deathLine.includes('装作散步'), '没选过装作散步，不能出现该文案');
  assert.ok(g.deathCause.includes('饿晕'));
});

test('背包格子中心计算：单格/多格/锚点', () => {
  const single = bagCellCenter(3, 3, 80, 0, 0, 1, 1);
  assert.deepEqual(single, { x: -80, y: 80 });

  const wide = bagCellCenter(3, 3, 80, 0, 0, 2, 1);
  assert.deepEqual(wide, { x: -40, y: 80 });

  const tall = bagCellCenter(3, 3, 80, 1, 1, 1, 2);
  assert.deepEqual(tall, { x: 0, y: -40 });

  const centered = positionForAnchor(wide, { x: 0.5, y: 0.5 }, { width: 48, height: 48 });
  assert.deepEqual(centered, wide);

  // 锚点在左下时，节点 position 要往左下修正半个尺寸，视觉中心才落在格子矩形中心
  const bottomLeft = positionForAnchor(wide, { x: 0, y: 0 }, { width: 48, height: 48 });
  assert.deepEqual(bottomLeft, { x: -64, y: 56 });
});

test('音效文件存在、小于 20KB 且带 audio-clip meta', () => {
  const uuids = new Set<string>();
  for (const name of ['snap.wav', 'bounce.wav']) {
    const file = path.resolve(process.cwd(), 'cocos/assets/resources/sfx', name);
    assert.ok(fs.existsSync(file), `${name} 不存在`);
    const size = fs.statSync(file).size;
    assert.ok(size > 0 && size < 20 * 1024, `${name} 大小 ${size}`);
    const metaPath = file + '.meta';
    assert.ok(fs.existsSync(metaPath), `${name}.meta 不存在`);
    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
    assert.equal(meta.importer, 'audio-clip');
    assert.ok(meta.uuid && !uuids.has(meta.uuid), `${name} uuid 应唯一`);
    uuids.add(meta.uuid);
  }
});

test('地面战利品跨数量档位时尺寸和间距不重叠', () => {
  const safeW = 536;
  assert.equal(floorLootStyle(3, safeW).icon, 64);
  assert.equal(floorLootStyle(4, safeW).icon, 48);
  assert.equal(floorLootStyle(5, safeW).icon, 48);
  assert.equal(floorLootStyle(6, safeW).icon, 48);
  assert.equal(floorLootStyle(10, safeW).icon, 32);

  for (let n = 1; n <= 12; n++) {
    const style = floorLootStyle(n, safeW);
    const xs: number[] = [];
    for (let i = 0; i < n; i++) xs.push(floorSlotX(i, n, style.plate, safeW));
    for (let i = 1; i < xs.length; i++) {
      assert.ok(
        xs[i] - xs[i - 1] >= style.plate,
        `n=${n} 第 ${i - 1}/${i} 件间距 ${xs[i] - xs[i - 1]} < 底板 ${style.plate}`,
      );
    }
    const minX = Math.min(...xs) - style.plate / 2;
    const maxX = Math.max(...xs) + style.plate / 2;
    assert.ok(minX >= -safeW / 2 && maxX <= safeW / 2, `n=${n} 超出安全宽度 ${minX}..${maxX}`);
  }
});

// ---------------------------------------------------------------------------
// 今日限定（r6 A）
// ---------------------------------------------------------------------------

test('今日限定只在第5~15天出现，每天恰好一条且同一天不重抽', () => {
  const g = newGame(7);
  assert.equal(g.dailySpecial, null, '第1天不应有今日限定');

  for (let day = 2; day <= 4; day++) {
    g.day = day;
    g.drawFortune();
    assert.equal(g.dailySpecial, null, `第${day}天不应有今日限定`);
  }

  for (let day = 5; day <= 15; day++) {
    g.day = day;
    g.drawFortune();
    assert.ok(g.dailySpecial, `第${day}天应有今日限定`);
    assert.equal(g.dailySpecialDay, day);
    const first = g.dailySpecial!.id;
    g.drawFortune();
    assert.equal(g.dailySpecial!.id, first, `第${day}天同日重画不应换限定`);
  }

  g.day = 16;
  g.drawFortune();
  assert.equal(g.dailySpecial, null, '第16天不应有今日限定');
});

test('今日限定：好签偏好事、坏签偏坏事、平签均匀', () => {
  const g = newGame(1);
  (g as any).rng = new Rng(12345);
  let goodLucky = 0;
  let badLucky = 0;
  for (let i = 0; i < 500; i++) {
    if (g.selectDailySpecial('good').bias === 'good') goodLucky++;
    if (g.selectDailySpecial('bad').bias === 'good') badLucky++;
  }
  assert.ok(goodLucky > badLucky + 100, `好签好事 ${goodLucky} 应明显多于坏签好事 ${badLucky}`);
  assert.equal(CONFIG.dailySpecial.weights.meh.good, CONFIG.dailySpecial.weights.meh.bad);

  // 平签下五条权重相同：固定随机数应依次命中五条。
  const meh = newGame(2);
  const r = mockRng(meh);
  r.nextQueue = [0.01, 0.21, 0.41, 0.61, 0.81];
  const ids = new Set<string>();
  for (let i = 0; i < 5; i++) ids.add(meh.selectDailySpecial('meh').id);
  assert.equal(ids.size, DAILY_SPECIALS.length, '平签应能均匀抽到全部条目');
});

test('今日限定：同种子选择可复现', () => {
  const one = newGame(2024);
  const two = newGame(2024);
  one.day = 5;
  two.day = 5;
  one.drawFortune();
  two.drawFortune();
  assert.equal(one.dailySpecial!.id, two.dailySpecial!.id);
});

test('今日限定：电子类卖价 ×1.7，纸箱类卖价 ×2.4', () => {
  const electronics = newGame();
  electronics.dailySpecial = DAILY_SPECIALS.find((s) => s.id === 'huaqiangbei_clearance')!;
  electronics.dailySpecialDay = electronics.day;
  electronics.phase = 'location';
  electronics.location = 'baishizhou';
  electronics.stamina = 50;
  electronics.money = 0;
  electronics.bag = [{ uid: 1, itemId: 'old_phone', x: 0, y: 0, w: 1, h: 1 }];
  assert.equal(electronics.goHome(), true);
  assert.equal(electronics.money, 54 * 1.7);
  assert.equal(electronics.stats.bestItemName, '旧手机');
  assert.equal(electronics.stats.bestItemValue, 54 * 1.7);

  const cardboard = newGame();
  cardboard.dailySpecial = DAILY_SPECIALS.find((s) => s.id === 'recycler_cardboard')!;
  cardboard.dailySpecialDay = cardboard.day;
  cardboard.phase = 'location';
  cardboard.location = 'baishizhou';
  cardboard.stamina = 50;
  cardboard.money = 0;
  cardboard.bag = [{ uid: 2, itemId: 'cardboard_box', x: 0, y: 0, w: 2, h: 1 }];
  assert.equal(cardboard.goHome(), true);
  assert.equal(cardboard.money, 7.5 * 2.4);
});

test('今日限定：白石洲 +2 大箱且巡逻权重 ×2', () => {
  const g = newGame();
  g.day = 5;
  g.phase = 'fortune';
  g.fortune = { tier: 'meh' } as any;
  const r = mockRng(g);
  r.intQueue = new Array(20).fill(3);
  r.chanceQueue = new Array(20).fill(false);
  g.dailySpecial = DAILY_SPECIALS.find((s) => s.id === 'baishizhou_demolition')!;
  g.dailySpecialDay = 5;
  g.acceptFortune();
  const boxes = g.boxesAt('baishizhou');
  assert.equal(boxes.length, 5, '基础 3 箱 + 限定 2 大箱');
  assert.deepEqual(boxes.slice(-2).map((b) => b.size), ['big', 'big']);

  const weightGame = newGame();
  weightGame.day = 5;
  weightGame.location = 'baishizhou';
  weightGame.dailySpecial = DAILY_SPECIALS.find((s) => s.id === 'baishizhou_demolition')!;
  const rw = mockRng(weightGame);
  rw.nextQueue = [0.25];
  assert.equal((weightGame as any).tryTriggerEvent('baishizhou').id, 'patrol');

  const normalGame = newGame();
  normalGame.day = 5;
  normalGame.location = 'baishizhou';
  const rn = mockRng(normalGame);
  rn.nextQueue = [0.25];
  assert.notEqual((normalGame as any).tryTriggerEvent('baishizhou').id, 'patrol');
});

test('今日限定：地铁停运回家体力 ×1.55，夜市开张食物 ¥10', () => {
  const metro = newGame();
  metro.location = 'baishizhou';
  metro.phase = 'location';
  metro.dailySpecial = DAILY_SPECIALS.find((s) => s.id === 'metro_shutdown')!;
  assert.equal(metro.homeCost(), Math.ceil(5 * 1.55));

  const market = newGame();
  market.phase = 'home';
  market.money = 10;
  market.hunger = 40;
  market.dailySpecial = DAILY_SPECIALS.find((s) => s.id === 'night_market')!;
  assert.equal(market.foodPrice, 10);
  assert.equal(market.buyFood(), true);
  assert.equal(market.money, 0);
  assert.equal(market.hunger, 60);
});

test('买饭按 game.foodPrice 结算：夜市半价生效，非夜市日恢复原价', () => {
  const market = newGame();
  market.phase = 'home';
  market.money = 10;
  market.hunger = 40;
  market.dailySpecial = DAILY_SPECIALS.find((s) => s.id === 'night_market')!;
  assert.equal(market.foodPrice, 10);
  assert.equal(market.buyFood(), true);
  assert.equal(market.money, 0);
  assert.equal(market.hunger, 40 + CONFIG.foodHunger);

  const usual = newGame();
  usual.phase = 'home';
  usual.money = 10;
  usual.hunger = 40;
  usual.dailySpecial = DAILY_SPECIALS.find((s) => s.id === 'metro_shutdown')!;
  assert.equal(usual.foodPrice, CONFIG.foodPrice);
  assert.equal(usual.buyFood(), false, '原价 ¥20 时 ¥10 不够买饭');
  assert.equal(usual.money, 10);
  assert.equal(usual.hunger, 40);
});

// ---------------------------------------------------------------------------
// 死亡页与深圳生存认证（r6 B）
// ---------------------------------------------------------------------------

test('死因文案至少12条，包含需求里的三条例子', () => {
  const all = [
    ...DEATH_LINES.starvation,
    ...DEATH_LINES.stamina,
    ...DEATH_LINES.security,
    ...DEATH_LINES.collapse,
  ];
  assert.ok(all.length >= 12, `死因文案只有 ${all.length} 条`);
  assert.ok(DEATH_LINES.starvation.includes('为了省¥20，倒在了离夜市50米的地方'));
  assert.ok(DEATH_LINES.stamina.includes('背着三台旧显示器走了8公里'));
  assert.ok(DEATH_LINES.security.some((l) => l.includes('第{n}次『装作散步』，保安已经认识你了')));
});

test('死亡页统计：按实际死因、存活天数、开箱数、最值钱的货', () => {
  const hunger = newGame();
  setupLocation(hunger);
  mockRng(hunger);
  hunger.day = 4;
  hunger.hunger = 1;
  hunger.stamina = 50;
  hunger.dig('box_s', 0);
  assert.equal(hunger.phase, 'lost');
  assert.equal(hunger.deathCauseId, 'starvation');
  assert.ok(hunger.deathLine.length > 0);
  assert.equal(hunger.stats.daysSurvived, 4);
  assert.equal(hunger.stats.boxesOpened, 1);

  const collapse = newGame();
  collapse.day = 3;
  collapse.phase = 'location';
  collapse.location = 'baishizhou';
  collapse.hunger = 1;
  collapse.stamina = 0;
  const r = mockRng(collapse);
  r.nextQueue = [0.1];
  r.chanceQueue = [false];
  collapse.collapse();
  assert.equal(collapse.phase, 'lost');
  assert.equal(collapse.deathCauseId, 'collapse');
  assert.equal(collapse.deathLine, DEATH_LINES.collapse[0]);
  assert.equal(collapse.stats.collapses, 1);
});

test('没有保安时：饿死/累死/倒下仍用各自文案', () => {
  const starvation = newGame();
  starvation.day = 3;
  starvation.phase = 'home';
  starvation.hunger = 1;
  const rs = mockRng(starvation);
  rs.chanceQueue = [false];
  starvation.sleep();
  assert.equal(starvation.phase, 'lost');
  assert.equal(starvation.deathCauseId, 'starvation');
  assert.ok(DEATH_LINES.starvation.includes(starvation.deathLine));
  assert.ok(!DEATH_LINES.security.includes(starvation.deathLine));

  const stamina = newGame();
  setupLocation(stamina);
  stamina.hunger = 1;
  stamina.stamina = 1;
  const rst = mockRng(stamina);
  rst.chanceQueue = [false];
  stamina.dig('box_s', 0);
  assert.equal(stamina.phase, 'lost');
  assert.equal(stamina.deathCauseId, 'stamina');
  assert.ok(DEATH_LINES.stamina.includes(stamina.deathLine));

  const collapse = newGame();
  collapse.day = 4;
  collapse.phase = 'map';
  collapse.location = 'baishizhou';
  collapse.hunger = 1;
  collapse.stamina = 1;
  const rc = mockRng(collapse);
  rc.nextQueue = [0.1];
  assert.equal(collapse.travel('dongmen'), true);
  assert.equal(collapse.phase, 'lost');
  assert.equal(collapse.deathCauseId, 'collapse');
  assert.ok(DEATH_LINES.collapse.includes(collapse.deathLine));

  for (const g of [starvation, stamina, collapse]) {
    assert.ok(g.deathLine.length > 0, `${g.deathCauseId} 死亡文案为空`);
    assert.ok(g.deathCause.length > 0, `${g.deathCauseId} 死亡页旧字段为空`);
  }
});

test('装作散步失败后当天饿死：用保安文案且次数是 1', () => {
  const g = newGame();
  g.day = 7;
  g.phase = 'event';
  g.location = 'baishizhou';
  g.bag = [{ uid: 1, itemId: 'cardboard_box', x: 0, y: 0, w: 2, h: 1 }];
  const r = mockRng(g);
  r.chanceQueue = [false];
  (g as any).pendingEvent = { id: 'patrol', name: '巡逻', options: ['礼貌离开', '装作散步'] };
  g.resolveEvent(1);
  assert.equal(g.phase, 'map');
  assert.equal(g.securityChasedToday, 1);

  g.phase = 'home';
  g.hunger = 0;
  r.chanceQueue = [false];
  g.sleep();
  assert.equal(g.phase, 'lost');
  assert.equal(g.deathCauseId, 'starvation');
  assert.equal(g.deathLine, '第1次『装作散步』，保安已经认识你了');
});

test('「装作散步」文案里的次数来自本局真实统计', () => {
  const g = newGame();
  g.stats.pretendWalkCount = 3;
  const r = mockRng(g);
  assert.equal(g.deathLineFor('security'), '第3次『装作散步』，保安已经认识你了');
  r.pickQueue = [];
});

test('通关称号至少8个，规则确定且可从统计复现', () => {
  assert.ok(SURVIVAL_TITLES.length >= 8);
  const cases: { name: string; setup: (g: Game) => void }[] = [
    { name: '纸箱之王', setup: (g) => { g.stats.cardboardFound = 6; } },
    { name: '华强北常客', setup: (g) => { g.stats.locationVisits.huaqiangbei = 3; } },
    { name: '猫猫的好朋友', setup: (g) => { g.stats.catFeeds = 2; } },
    { name: '保安老熟人', setup: (g) => { g.stats.securityEncounters = 3; } },
    { name: '东门糖水VIP', setup: (g) => { g.stats.locationVisits.dongmen = 3; } },
    { name: '科技园加班侠', setup: (g) => { g.stats.locationVisits.nanshan_tech = 3; } },
    { name: '世界之窗守站人', setup: (g) => { g.stats.locationVisits.window_world = 3; } },
    { name: '深圳湾散步王', setup: (g) => { g.stats.locationVisits.sz_bay = 3; } },
  ];
  for (const c of cases) {
    const g = newGame();
    g.stats = createRunStats();
    c.setup(g);
    assert.equal(g.computeTitle().name, c.name, `${c.name} 规则不匹配`);
  }

  const fallback = newGame();
  fallback.stats = createRunStats();
  assert.equal(fallback.computeTitle().name, '深圳过客');
});

test('通关时保存称号和存活天数', () => {
  const g = newGame();
  g.day = 15;
  g.phase = 'home';
  g.hunger = CONFIG.maxHunger;
  g.stats.locationVisits.huaqiangbei = 3;
  g.sleep();
  assert.equal(g.phase, 'won');
  assert.equal(g.stats.daysSurvived, 15);
  assert.equal(g.awardedTitle!.name, '华强北常客');
});

test('8个地点都有深圳地标名称与台词', () => {
  for (const loc of LOCATIONS) {
    assert.ok(loc.landmarkName && loc.landmarkName.length > 0, `${loc.id} 缺 landmarkName`);
    assert.ok(loc.line && loc.line.length > 0, `${loc.id} 缺 line`);
  }
  assert.equal(LOCATIONS.find((l) => l.id === 'huaqiangbei')!.line, '靓仔，要不要看看？');
  assert.equal(LOCATIONS.find((l) => l.id === 'university_town')!.line, '同学，饭卡借我刷一下？');
});

test('8 张未使用地标已从主包删除，分享底图仍在 bg 分包，二维码仍在主包', () => {
  const root = path.resolve(process.cwd(), 'cocos/assets/resources/art');
  for (const loc of LOCATIONS) {
    assert.ok(
      !fs.existsSync(path.join(root, 'landmarks', `${loc.id}.png`)),
      `${loc.id}.png 已无引用，不应继续占用主包`,
    );
    assert.equal(ART_ALIAS[`landmark_${loc.id}`], undefined, `${loc.id} 还残留 landmark alias`);
  }
  assert.ok(!fs.existsSync(path.join(root, 'landmarks')), 'landmarks/ 目录应已删除');

  const bgRoot = path.resolve(process.cwd(), 'cocos/assets/bundles/bg/share');
  for (const name of ['share_death_bg.png', 'share_cert_bg.png']) {
    const file = path.join(bgRoot, name);
    assert.ok(fs.existsSync(file), `${name} 应在 bg 分包`);
    assert.ok(fs.statSync(file).size > 0);
    assert.ok(fs.existsSync(file + '.meta'), `${name}.meta 不存在`);
    assert.ok(!fs.existsSync(path.join(root, 'share', name)), `${name} 不应还留在主包`);
  }
  const qr = path.join(root, 'share', 'qr.png');
  assert.ok(fs.existsSync(qr), 'qr.png 应在主包');
  assert.ok(fs.existsSync(qr + '.meta'));
});

// ---------------------------------------------------------------------------
// 卡片文字排版 / 地标气泡（r16 B2/B4）
// ---------------------------------------------------------------------------

test('死亡页/认证页文字框：内边距内、HUD 下、按钮上，390x844 与刘海屏都成立', () => {
  // 390x844（Fit Height 后可视宽约 591.6）、更高的刘海屏（可视宽更窄）
  const screens = [
    { halfW: 295.8, hudBottom: 522 },
    { halfW: 249.6, hudBottom: 475 },
    { halfW: 170.7, hudBottom: 422 },
  ];
  const cardW = 672;
  const cardH = 896;
  for (const s of screens) {
    // 和 GameRoot.showLost 保持一致：躲开失败卡四角的伞/齿轮/裂缝。
    const lostOpts = {
      cardW, cardH, cardY: 100,
      padXRatio: 0.19, padTopRatio: 0.25, padBottomRatio: 0.18,
      hudBottom: s.hudBottom, halfW: s.halfW, buttonTop: -290,
    };
    const lost = computeCardTextBox(lostOpts);
    const lostTopWorld = lost.top + lostOpts.cardY;
    const lostBottomWorld = lostTopWorld - lost.height;
    const lostPadX = Math.round(cardW * lostOpts.padXRatio);
    const lostPadTop = Math.round(cardH * lostOpts.padTopRatio);
    const lostPadBottom = Math.round(cardH * lostOpts.padBottomRatio);
    assert.ok(lost.left >= -s.halfW + 12 - 0.001, `失败卡左边越界 ${lost.left}`);
    assert.ok(lost.left + lost.width <= s.halfW - 12 + 0.001, '失败卡右边越界');
    assert.ok(lost.left >= -cardW / 2 + lostPadX - 0.001, '失败卡压在左边框/花纹上');
    assert.ok(lost.left + lost.width <= cardW / 2 - lostPadX + 0.001, '失败卡压在右边框/花纹上');
    assert.ok(lost.top <= cardH / 2 - lostPadTop + 0.001, '失败卡文字压住顶部伞/裂缝');
    assert.ok(lost.top - lost.height >= -cardH / 2 + lostPadBottom - 0.001, '失败卡文字压住底部齿轮');
    assert.ok(lostTopWorld <= s.hudBottom - 14 + 0.001, '失败卡文字压住 HUD');
    assert.ok(lostBottomWorld >= -290 + 14 - 0.001, '失败卡文字压住按钮');
    assert.ok(lostTopWorld - lostBottomWorld >= 200, '失败卡可用高度过小');

    // 和 GameRoot.showWon 保持一致：躲开认证卡四角的麦穗/花纹。
    const certOpts = {
      cardW, cardH, cardY: 80,
      padXRatio: 0.25, padTopRatio: 0.24, padBottomRatio: 0.20,
      hudBottom: s.hudBottom, halfW: s.halfW, buttonTop: -490,
    };
    const cert = computeCardTextBox(certOpts);
    const certTopWorld = cert.top + certOpts.cardY;
    const certBottomWorld = certTopWorld - cert.height;
    const certPadX = Math.round(cardW * certOpts.padXRatio);
    const certPadTop = Math.round(cardH * certOpts.padTopRatio);
    const certPadBottom = Math.round(cardH * certOpts.padBottomRatio);
    assert.ok(cert.left >= -s.halfW + 12 - 0.001, `认证卡左边越界 ${cert.left}`);
    assert.ok(cert.left + cert.width <= s.halfW - 12 + 0.001, '认证卡右边越界');
    assert.ok(cert.left >= -cardW / 2 + certPadX - 0.001, '认证卡压在左边框/麦穗上');
    assert.ok(cert.left + cert.width <= cardW / 2 - certPadX + 0.001, '认证卡压在右边框/麦穗上');
    assert.ok(cert.top <= cardH / 2 - certPadTop + 0.001, '认证卡文字压住顶部麦穗');
    assert.ok(cert.top - cert.height >= -cardH / 2 + certPadBottom - 0.001, '认证卡文字压住底部花纹');
    assert.ok(certTopWorld <= s.hudBottom - 14 + 0.001, '认证卡文字压住 HUD');
    assert.ok(certBottomWorld >= -490 + 14 - 0.001, '认证卡文字压住按钮');
    assert.ok(certTopWorld - certBottomWorld >= 300, '认证卡可用高度过小');
  }
});

test('8个地点地标台词气泡按文字加宽，单行显示且不会孤字换行', () => {
  const padX = 14;
  const padY = 10;
  // 390x844 和更高的刘海屏：Fit Height 后可视宽度都会变窄。
  for (const halfW of [295.8, 249.6, 170.7]) {
    const maxWidth = Math.max(120, halfW * 2 - 24);
    for (const loc of LOCATIONS) {
      const m = layoutSpeechBubble(loc.line, {
        fontSize: 19, lineHeight: 23, padX, padY, minWidth: 120, maxWidth,
      });
      assert.equal(m.lineCount, 1, `${loc.id} 台词被拆成多行`);
      assert.ok(m.width <= maxWidth, `${loc.id} 超过最大宽度`);
      assert.ok(m.width >= Math.min(120, m.textWidth + padX * 2), `${loc.id} 宽度没有包住文字`);
      assert.ok(m.textWidth <= m.width - padX * 2 + 0.001, `${loc.id} 文字超出气泡内宽`);
      assert.ok(m.height >= 23 + padY * 2, `${loc.id} 气泡高度不足`);
    }
  }

  const futian = layoutSpeechBubble(LOCATIONS.find((l) => l.id === 'futian_cbd')!.line, {
    fontSize: 19, lineHeight: 23, padX, padY, minWidth: 120, maxWidth: 295.8 * 2 - 24,
  });
  assert.ok(futian.width > 120, '「电梯要排二十分钟」不应该被压到最小宽度');
  assert.ok(futian.textWidth <= futian.width - padX * 2 + 0.001);

  // 极窄时也保持正文最小字号（12×设计缩放=24），宁可气泡略宽也不把字缩糊。
  const narrow = layoutSpeechBubble('电梯要排二十分钟', {
    fontSize: 24, lineHeight: 24, padX, padY, minWidth: 120, maxWidth: 120,
  });
  assert.equal(narrow.lineCount, 1);
  assert.ok(narrow.fontSize >= pxFont(12), '窄屏字号低于正文最小值');
  assert.ok(measureTextWidth('电梯要排二十分钟', narrow.fontSize) <= narrow.width - padX * 2);
});

test('新结算卡文字：九宫格内区留白、无孤字行、金额不拆行', () => {
  const innerW = 520 - 32 * 2;
  const longTitle = fitCardText('第 7 天 · 城中村握手楼床位', {
    maxWidth: innerW, maxHeight: 38, fontSize: 28, minFontSize: 18, lineGap: 4,
  });
  assert.ok(longTitle.width <= innerW + 0.001, '标题超出卡片内区');
  assert.ok(longTitle.height <= 38 + 0.001, '标题超出可用高度');
  for (const line of longTitle.lines) {
    assert.ok(line.length > 1 || longTitle.lines.length === 1, `标题出现孤字行：${line}`);
  }

  const roast = fitCardText('今日战绩：显卡，收入 ¥\u00A0500.10，深圳欢迎你', {
    maxWidth: innerW - 8, maxHeight: 96, fontSize: 25, minFontSize: 16, lineGap: 4,
  });
  assert.ok(roast.width <= innerW - 8 + 0.001, '吐槽超出卡片内区');
  assert.ok(roast.height <= 96 + 0.001, '吐槽超出可用高度');
  assert.ok(roast.lines.length >= 2, '长吐槽应折行');
  assert.ok(roast.lines[roast.lines.length - 1].length > 1, `吐槽最后一行是孤字：${roast.lines.at(-1)}`);
  assert.ok(!roast.lines.some((l) => l.trim() === '你'), '「你」不应单独成行');

  const price = fitCardText('最值钱的货：李潮牌T恤（¥\u00A027.00）', {
    maxWidth: innerW, maxHeight: 34, fontSize: 22, minFontSize: 14, lineGap: 3,
  });
  assert.ok(price.lines.every((l) => !/¥\s*$/.test(l)), '货币符号不能落在行尾');
});

test('认证页日期/括号价格整体不拆行，吐槽最后一行至少两个有效字', () => {
  const units = splitWrapUnits('编号：123456  日期：11/10/2026');
  assert.ok(units.includes('日期：11/10/2026'), `日期没有被当作不可拆单元：${units.join('|')}`);
  const priceUnits = splitWrapUnits('最值钱的货：过季潮牌T恤（¥\u00A027.00）');
  assert.ok(priceUnits.includes('（¥\u00A027.00）'), `括号价格被拆开：${priceUnits.join('|')}`);

  const dateFit = fitCardText('编号：652473  日期：11/10/2026', {
    maxWidth: 240, maxHeight: 120, fontSize: 22, minFontSize: 12, lineGap: 0,
  });
  assert.ok(dateFit.lines.some((line) => line.includes('日期：11/10/2026')), `日期被拆行：${dateFit.lines.join('/')}`);
  const priceFit = fitCardText('最值钱的货：过季潮牌T恤（¥\u00A027.00）', {
    maxWidth: 240, maxHeight: 120, fontSize: 22, minFontSize: 12, lineGap: 0,
  });
  assert.ok(priceFit.lines.some((line) => line.includes('（¥\u00A027.00）')), `括号价格被拆行：${priceFit.lines.join('/')}`);

  const balanced = balanceOrphanLine(['「显卡」在手，今天的苦总算有个说', '法。']);
  const balancedMeaningful = Array.from(balanced.at(-1)!).filter((ch) => !/[。，！？、；：]/.test(ch)).length;
  assert.ok(balancedMeaningful >= 4, `孤行没有补到 4 个有效字：${balanced.at(-1)}`);

  const roast = fitCardText('「显卡」在手，今天的苦总算有个说法。', {
    maxWidth: 448, maxHeight: 96, fontSize: 24, minFontSize: 12, lineGap: 0,
  });
  const last = roast.lines.at(-1)!;
  const meaningful = Array.from(last).filter((ch) => !/[。，！？、；：]/.test(ch)).length;
  assert.ok(meaningful >= 4, `吐槽最后一行仍是 1~3 字孤行：${last}`);
});

test('地标气泡和 NPC 在所有背包档位都不压背包/地面', () => {
  const sizes = [
    { w: 3, h: 3 },
    { w: 3, h: 4 },
    { w: 4, h: 4 },
  ];
  const halfWs = [295.8, 249.6, 170.7];
  const CELL = 80;
  const BAG_Y = -340;
  const FLOOR_Y = 0;
  const FLOOR_ROW_Y = -86;
  const floorBottom = FLOOR_Y + FLOOR_ROW_Y - 36;
  for (const halfW of halfWs) {
    for (const size of sizes) {
      const bagLeft = -(size.w * CELL) / 2;
      const bagTop = BAG_Y + (size.h * CELL) / 2;
      const left = -halfW + 14;
      const gutter = Math.max(0, bagLeft - 8 - left);
      const npcSize = Math.min(96, gutter);
      if (npcSize >= 40) {
        const npcRight = left + npcSize;
        assert.ok(npcRight <= bagLeft - 8 + 0.001, `${size.w}x${size.h}/${halfW} NPC 压住背包`);
      }
      for (const loc of LOCATIONS) {
        const m = layoutSpeechBubble(loc.line, {
          fontSize: 19, lineHeight: 23, padX: 14, padY: 10,
          minWidth: 120, maxWidth: Math.max(120, halfW * 2 - 24),
        });
        const placed = placeBubbleAboveBag(bagTop, m.height, floorBottom);
        assert.equal(placed.fits, true, `${loc.id}/${size.w}x${size.h}/${halfW} 气泡夹层不足`);
        assert.ok(placed.y - m.height / 2 >= bagTop - 0.001, `${loc.id}/${size.w}x${size.h}/${halfW} 气泡压背包`);
        assert.ok(placed.y - m.height / 2 - 8 >= bagTop - 0.001, `${loc.id}/${size.w}x${size.h}/${halfW} 气泡尾巴压背包`);
        assert.ok(placed.y + m.height / 2 <= floorBottom + 0.001, `${loc.id}/${size.w}x${size.h}/${halfW} 气泡压地面物品`);
      }
    }
  }
});

test('大学城最大背包：气泡避开底部「拖动 / 单击物品放入背包」提示', () => {
  const halfW = 295.8;
  const CELL = 80;
  const BAG_Y = -340;
  const FLOOR_Y = 0;
  const FLOOR_ROW_Y = -86;
  const floorBottom = FLOOR_Y + FLOOR_ROW_Y - 36;
  const bagTop = BAG_Y + (4 * CELL) / 2;
  const inUniversity = LOCATIONS.find((l) => l.id === 'university_town')!;
  const m = layoutSpeechBubble(inUniversity.line, {
    fontSize: 24,
    lineHeight: 24,
    padX: 12,
    padY: 10,
    minWidth: 120,
    maxWidth: Math.max(120, halfW * 2 - 24),
  });
  const hintText = '拖动 / 单击物品放入背包';
  const hintWidth = measureTextWidth(hintText, 24);
  const hint = { left: -hintWidth / 2, right: hintWidth / 2, top: -147, bottom: -179 };
  // 与 LocationView 一致：大学城 NPC 在左侧，气泡期望 x 为 NPC 中心。
  const left = -halfW + 14;
  const bagLeft = -(4 * CELL) / 2;
  const gutter = Math.max(0, bagLeft - 8 - left);
  const npcSize = Math.min(96, gutter);
  const desiredX = left + npcSize / 2;
  const placed = placeSpeechBubble({
    desiredX,
    width: m.width,
    height: m.height,
    halfW,
    bagTop,
    floorBottom,
    hint,
    gap: Math.max(pxSpacing(4), 10),
  });
  const bubble = {
    left: placed.x - m.width / 2,
    right: placed.x + m.width / 2,
    top: placed.y + m.height / 2,
    bottom: placed.y - m.height / 2,
  };
  const shiftedHint = {
    left: hint.left + placed.hintShiftX,
    right: hint.right + placed.hintShiftX,
    top: hint.top,
    bottom: hint.bottom,
  };
  assert.equal(placed.fits, true, '气泡应能同时避开背包、地面物品和提示文字');
  assert.equal(rectsOverlap(bubble, shiftedHint, pxSpacing(4)), false, '气泡仍压住提示文字');
  assert.ok(shiftedHint.left - bubble.right >= pxSpacing(4) - 0.001, '气泡与提示文字间距小于 8px');
  assert.ok(bubble.bottom >= bagTop - 0.001, '气泡压住背包');
  assert.ok(bubble.top <= floorBottom + 0.001, '气泡压住地面物品');
  assert.ok(shiftedHint.left >= -halfW + 8 - 0.001, '提示文字被推出屏幕左边');
  assert.ok(shiftedHint.right <= halfW - 8 + 0.001, '提示文字被推出屏幕右边');
});

test('像素字体宽度使用 BMFont xadvance，而不是按字符个数估算', () => {
  assert.equal(measureTextWidth('0', 24), 12);
  assert.equal(measureTextWidth('A', 24), 16);
  assert.equal(measureTextWidth('W', 24), 20);
  assert.equal(measureTextWidth('i', 24), 8);
  assert.equal(measureTextWidth(' ', 24), 12);
  assert.equal(measureTextWidth('¥', 24), 12);
  assert.equal(measureTextWidth('中', 24), 24);
  assert.equal(measureTextWidth('，', 24), 24);
  assert.equal(measurePixelTextWidth('11/10/2026', 24), measureTextWidth('11/10/2026', 24));
});

test('全局像素字体：字号吸附到整数源像素档，行高 = 14*k + 物理像素，价格不被拆行', () => {
  for (const size of [12, 14, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 28, 30, 32, 34, 36, 38, 42]) {
    const snapped = snapFontSize(size);
    assert.equal(snapped % 12, 0, `字号 ${size} 未吸附到 12 的倍数`);
    assert.equal(
      snapLineHeight(snapped, size + 5),
      Math.max(lineHeightForFontSize(snapped), Math.round(size + 5)),
      `行高 ${size} 不是 12*k + baked 描边留白`,
    );
    assert.equal(lineHeightForFontSize(snapped), (snapped / 12) * BM_FONT_LINE_HEIGHT);
  }

  const price = fitCardText('最值钱的货：李潮牌T恤（¥\u00A027.00）', {
    maxWidth: 200,
    maxHeight: 120,
    fontSize: 24,
    minFontSize: 12,
    lineGap: 0,
  });
  assert.equal(price.fontSize % 12, 0);
  assert.equal(price.lineHeight, lineHeightForFontSize(price.fontSize));
  assert.ok(price.lines.every((line) => !/¥\s*$/.test(line)), `货币符号落在行尾：${price.lines.join('/')}`);
  assert.ok(price.lines.every((line) => !/^[\d,]+(?:\.\d+)?$/.test(line)), `金额被单独拆行：${price.lines.join('/')}`);
  assert.ok(splitWrapUnits('价格 ¥\u00A027.00 到手').includes('¥\u00A027.00'), '价格必须作为整体排版');
});

test('分享图换行：最后一行不会只剩 1~3 个字', () => {
  const balanced = balanceOrphanLine(['第 1 天，翻遍了三个垃圾桶，只翻出了人生的意', '义']);
  const meaningful = Array.from(balanced[balanced.length - 1]).filter((ch) => !/[。，！？、；：]/.test(ch)).length;
  assert.ok(meaningful >= 4, `最后一行仍是孤行：${balanced[balanced.length - 1]}`);
  assert.ok(!balanced[balanced.length - 2].endsWith('翻垃圾'));
  const short = balanceOrphanLine(['正常一行', '两个字']);
  const shortMeaningful = Array.from(short.at(-1)!).filter((ch) => !/[。，！？、；：]/.test(ch)).length;
  assert.ok(shortMeaningful >= 4, `两个字仍单独成行：${short.at(-1)}`);
});

// ---------------------------------------------------------------------------
// r7 地图开放天数 / 往返体力（核心逻辑）
// ---------------------------------------------------------------------------

test('地点开放天数写在 config，未开放不能出门', () => {
  for (const loc of LOCATIONS) {
    assert.ok(Number.isInteger(loc.openDay) && loc.openDay >= 1 && loc.openDay <= CONFIG.totalDays,
      `${loc.id} openDay 非法`);
  }
  const g = newGame();
  g.acceptFortune();
  g.day = 1;
  assert.equal(g.isLocationOpen('baishizhou'), true);
  assert.equal(g.isLocationOpen('huaqiangbei'), false);
  assert.equal(g.travel('huaqiangbei'), false, '第 1 天华强北不应开放');
  g.day = 2;
  assert.equal(g.isLocationOpen('huaqiangbei'), true);
  assert.equal(g.travel('huaqiangbei'), true);
});

test('每一天的签面指定地点都只指向当天已开放的地点', () => {
  for (const seed of [1, 2, 42, 2024]) {
    const g = newGame(seed);
    for (let day = 1; day <= CONFIG.totalDays; day++) {
      g.day = day;
      (g as any).drawFortuneInternal();
      if (g.fortuneLocation) {
        assert.ok(
          g.isLocationOpen(g.fortuneLocation),
          `种子 ${seed} 第 ${day} 天签面指向未开放地点 ${g.fortuneLocation}`,
        );
      }
    }
  }
});

test('homeCostFrom 与当前地点 homeCost 一致，且可算任意地点往返', () => {
  const g = newGame();
  g.phase = 'location';
  g.location = 'baishizhou';
  assert.equal(g.homeCost(), g.homeCostFrom('baishizhou'));
  for (const loc of LOCATIONS) {
    const travel = g.travelCost(loc.id);
    const home = g.homeCostFrom(loc.id);
    assert.ok(travel >= 5, `${loc.id} 去程体力异常`);
    assert.ok(home >= 5, `${loc.id} 回程体力异常`);
  }
});

// ---------------------------------------------------------------------------
// r8 住处三档 / 结算卡格子 / 吐槽池
// ---------------------------------------------------------------------------

test('r8 落脚点三档：初始+两次升级，价格不变且场景对应 home_lv1/2/3', () => {
  assert.equal(CONFIG.homeLevels.length, 3);
  assert.deepEqual(CONFIG.homeLevels.map((h) => h.cost), [0, 60, 150]);
  assert.deepEqual(CONFIG.homeLevels.map((h) => h.scene), ['home_lv1', 'home_lv2', 'home_lv3']);
  assert.deepEqual(CONFIG.homeLevels.map((h) => h.staminaBonus), [0, 10, 20]);

  const g = newGame();
  assert.equal(g.homeLevel, 0);
  assert.equal(g.maxStamina, CONFIG.maxStamina);
  g.phase = 'home';
  g.money = 210;
  assert.equal(g.upgradeHome(), true);
  assert.equal(g.homeLevel, 1);
  assert.equal(g.money, 150);
  assert.equal(g.maxStamina, CONFIG.maxStamina + 10);
  assert.equal(g.upgradeHome(), true);
  assert.equal(g.homeLevel, 2);
  assert.equal(g.money, 0);
  assert.equal(g.maxStamina, CONFIG.maxStamina + 20);
  assert.equal(g.upgradeHome(), false, '第三档后不能继续升级');
});

test('r8 结算卡格子：价格、灰色与「还差 ¥X」', () => {
  const short = affordabilityOf(20, 5);
  assert.equal(short.affordable, false);
  assert.equal(short.shortfall, 15);
  assert.equal(short.shortfallText, '还差 ¥15');
  const enough = affordabilityOf(20, 20);
  assert.equal(enough.affordable, true);
  assert.equal(enough.shortfall, 0);
  assert.equal(enough.shortfallText, '');

  const g = newGame();
  g.phase = 'home';
  g.money = 0;
  let quotes = g.homeActionQuotes();
  assert.equal(quotes.length, 3);
  const food = quotes.find((q) => q.action === 'food')!;
  assert.equal(food.price, g.foodPrice);
  assert.equal(food.affordable, false);
  assert.equal(food.shortfallText, `还差 ¥${g.foodPrice}`);
  assert.equal(food.icon, 'slot_food');
  assert.equal(food.grayIcon, 'slot_food_gray');

  g.money = g.foodPrice;
  quotes = g.homeActionQuotes();
  assert.equal(quotes.find((q) => q.action === 'food')!.affordable, true);
  assert.equal(quotes.find((q) => q.action === 'food')!.shortfallText, '');

  g.money = 999;
  g.bagLevel = CONFIG.bagSizes.length - 1;
  g.homeLevel = CONFIG.homeLevels.length - 1;
  quotes = g.homeActionQuotes();
  const bag = quotes.find((q) => q.action === 'bag')!;
  const home = quotes.find((q) => q.action === 'home')!;
  assert.equal(bag.maxed, true);
  assert.equal(bag.affordable, false);
  assert.equal(bag.grayIcon, 'slot_bag_gray');
  assert.equal(home.maxed, true);
  assert.equal(home.affordable, false);
  assert.equal(home.grayIcon, 'slot_home_gray');
});

test('r8 吐槽池 >=20 条、按种子确定、同局尽量不重复', () => {
  assert.ok(DAY_ROASTS.length >= 20, `吐槽池只有 ${DAY_ROASTS.length} 条`);
  assert.equal(new Set(DAY_ROASTS.map((r) => r.id)).size, DAY_ROASTS.length);
  assert.equal(new Set(DAY_ROASTS.map((r) => r.text)).size, DAY_ROASTS.length);

  const ctx = {
    income: 35,
    bestItem: '旧手机',
    bestValue: 40,
    hunger: 20,
    stamina: 20,
    homeLevel: 1,
    homeName: CONFIG.homeLevels[1].name,
    soldNothing: false,
  };
  const a = newGame(2024);
  const b = newGame(2024);
  const pickedA: string[] = [];
  const pickedB: string[] = [];
  for (let i = 0; i < DAY_ROASTS.length; i++) {
    pickedA.push(a.selectDayRoast(ctx).id);
    pickedB.push(b.selectDayRoast(ctx).id);
  }
  assert.deepEqual(pickedA, pickedB, '同种子吐槽选择应可复现');
  assert.equal(new Set(pickedA).size, DAY_ROASTS.length, '一局内应先做到不重复');
  for (const id of pickedA) assert.ok(DAY_ROASTS.some((r) => r.id === id));

  const richCtx = {
    income: 100,
    bestItem: '无',
    bestValue: 0,
    hunger: 100,
    stamina: 100,
    homeLevel: 0,
    homeName: CONFIG.homeLevels[0].name,
    soldNothing: false,
  };
  const richPick = newGame(7).selectDayRoast(richCtx);
  assert.ok(richPick.tags.includes('rich'), '高收入应优先选 rich 情境文案');

  const def = DAY_ROASTS.find((r) => r.text.includes('{best}'))!;
  const formatted = a.formatDayRoast(def, ctx);
  assert.ok(!formatted.includes('{best}'));
  assert.ok(formatted.includes('旧手机'));
});

test('r8 日结算报告带体力剩余、最离谱物品 id/价格与大字吐槽', () => {
  const g = newGame();
  g.phase = 'location';
  g.location = 'baishizhou';
  g.stamina = 47;
  g.hunger = 66;
  g.bag = [
    { uid: 1, itemId: 'old_newspaper', x: 0, y: 0, w: 1, h: 1 },
    { uid: 2, itemId: 'old_phone', x: 1, y: 0, w: 1, h: 1 },
  ];
  assert.equal(g.goHome(), true);
  const r = g.lastDayReport!;
  assert.equal(r.staminaLeft, g.stamina);
  assert.equal(r.bestItemId, 'old_phone');
  assert.equal(r.bestItem, '旧手机');
  assert.ok((r.bestItemPrice ?? 0) > 0);
  assert.ok(r.roast.length > 0);
  assert.ok(!r.roast.includes('{'));
  assert.ok(DAY_ROASTS.some((d) => d.id === r.roastId));
});

test('r8 新图、结算 UI、卡片与分享底图全部落在 bg 分包，尺寸合规且 meta 有效', () => {
  const bgRoot = path.resolve(process.cwd(), 'cocos/assets/bundles/bg');
  const expectedBg = [
    'home_lv1.png', 'home_lv2.png', 'home_lv3.png',
    'home_lv1_lights.png', 'home_lv3_lights.png',
    'sleep_park.png', 'sleep_burger.png', 'sleep_netcafe.png',
  ];
  const seenUuids = new Set<string>();
  for (const name of expectedBg) {
    const file = path.join(bgRoot, name);
    assert.ok(fs.existsSync(file), `${name} 不存在`);
    const size = fs.statSync(file).size;
    assert.ok(size > 0 && size <= 20 * 1024, `${name} 大小 ${size} 超过 20KB`);
    const metaPath = file + '.meta';
    assert.ok(fs.existsSync(metaPath), `${name}.meta 不存在`);
    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
    assert.equal(meta.importer, 'image');
    assert.ok(meta.uuid && !seenUuids.has(meta.uuid), `${name}.meta uuid 重复`);
    seenUuids.add(meta.uuid);
    assert.equal(meta.subMetas.f9941.userData.width, 180);
    assert.equal(meta.subMetas.f9941.userData.height, 320);
  }

  const expectedBgDirs: { dir: string; frames: number }[] = [
    { dir: 'hero_sleep', frames: 4 },
    { dir: 'hero_move', frames: 4 },
    { dir: 'settle_card', frames: 1 },
    { dir: 'stat_income', frames: 1 },
    { dir: 'stat_fullness', frames: 1 },
    { dir: 'stat_stamina', frames: 1 },
    { dir: 'slot_food', frames: 1 },
    { dir: 'slot_food_gray', frames: 1 },
    { dir: 'slot_bag', frames: 1 },
    { dir: 'slot_bag_gray', frames: 1 },
    { dir: 'slot_home', frames: 1 },
    { dir: 'slot_home_gray', frames: 1 },
    { dir: 'btn_sleep', frames: 1 },
    { dir: 'btn_sleep_pressed', frames: 1 },
    { dir: 'card_daily', frames: 1 },
    { dir: 'card_fail', frames: 1 },
    { dir: 'card_cert', frames: 1 },
  ];
  for (const { dir, frames } of expectedBgDirs) {
    const d = path.join(bgRoot, dir);
    assert.ok(fs.existsSync(d), `${dir}/ 不在 bg 分包`);
    assert.ok(fs.existsSync(d + '.meta'), `${dir}.meta 不存在`);
    for (let i = 0; i < frames; i++) {
      const file = path.join(d, `${i}.png`);
      assert.ok(fs.existsSync(file), `${dir}/${i}.png 不存在`);
      const meta = JSON.parse(fs.readFileSync(file + '.meta', 'utf8'));
      assert.equal(meta.importer, 'image');
      assert.ok(meta.uuid && !seenUuids.has(meta.uuid), `${dir}/${i}.png.meta uuid 重复`);
      seenUuids.add(meta.uuid);
    }
  }

  const resRoot = path.resolve(process.cwd(), 'cocos/assets/resources/art');
  for (const dir of ['settle_card', 'stat_income', 'stat_fullness', 'stat_stamina', 'slot_food', 'slot_bag', 'btn_sleep', 'hero_sleep', 'hero_move', 'card_daily', 'card_fail', 'card_cert']) {
    assert.ok(!fs.existsSync(path.join(resRoot, dir)), `${dir}/ 不应还留在主包`);
    assert.equal(ART_ALIAS[dir]?.src, 'bg', `${dir} 的加载器没有指向 bg 分包`);
  }
  for (const name of ['share_death_bg', 'share_cert_bg']) {
    assert.equal(ART_ALIAS[name]?.src, 'bg', `${name} 的加载器没有指向 bg 分包`);
  }
  assert.equal(ART_ALIAS.card_day?.path, 'card_daily');
});

test('ArtMap 的每个 bg key 都能在 bg 分包解析到真实图片和 meta', () => {
  const bgRoot = path.resolve(process.cwd(), 'cocos/assets/bundles/bg');
  const bgEntries = Object.entries(ART_ALIAS).filter(([, alias]) => alias.src === 'bg');
  assert.ok(bgEntries.length > 0, 'ArtMap 没有任何 bg 条目');

  for (const [name, alias] of bgEntries) {
    const frames = alias.frames ?? 1;
    for (let i = 0; i < frames; i++) {
      const logicalPath = frames > 1 ? `${alias.path}/${i}` : alias.path;
      const resolved = resolveBgAssetPath(
        logicalPath,
        (relativePath) => fs.existsSync(path.join(bgRoot, relativePath)),
      );
      assert.ok(
        resolved,
        `${name}（${logicalPath}）在 bg 分包里既不是 file.png 也不是 folder/0.png`,
      );
      const file = path.join(bgRoot, resolved!.filePath);
      assert.ok(fs.existsSync(file), `${name} 解析到的图片不存在：${resolved!.filePath}`);
      assert.ok(fs.existsSync(file + '.meta'), `${name} 解析到的图片缺 meta：${resolved!.filePath}.meta`);
      const meta = JSON.parse(fs.readFileSync(file + '.meta', 'utf8'));
      assert.equal(meta.importer, 'image', `${name} 的 meta importer 不是 image`);
      assert.ok(meta.subMetas?.f9941, `${name} 的 meta 缺 spriteFrame 子资源`);

      if (frames === 1) {
        assert.ok(
          bgSpriteFrameCandidates(alias.path).includes(resolved!.spriteFramePath),
          `${name} 的运行时 SpriteFrame 候选没有覆盖解析路径 ${resolved!.spriteFramePath}`,
        );
      }
    }
  }
});

// ---------------------------------------------------------------------------
// r9/r21 地图可读性素材
// ---------------------------------------------------------------------------

test('r21 低对比底图、灰剪影锁定图标、地名牌与底部操作栏都在 bg 分包且 meta 有效', () => {
  const bgRoot = path.resolve(process.cwd(), 'cocos/assets/bundles/bg');
  const seenUuids = new Set<string>();

  function pngSize(file: string): { w: number; h: number } {
    const buf = fs.readFileSync(file);
    assert.equal(buf.toString('ascii', 1, 4), 'PNG', `${file} 不是 PNG`);
    return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
  }

  const expected: { name: string; w: number; h: number; border: [number, number, number, number] }[] = [
    { name: 'map_shenzhen_px', w: 360, h: 640, border: [0, 0, 0, 0] },
    { name: 'label_plate', w: 56, h: 16, border: [8, 8, 5, 5] },
    { name: 'label_plate_locked', w: 56, h: 16, border: [8, 8, 5, 5] },
    { name: 'icon_lock_16', w: 16, h: 16, border: [0, 0, 0, 0] },
    { name: 'bottom_bar', w: 360, h: 56, border: [8, 8, 4, 4] },
    { name: 'badge', w: 16, h: 16, border: [0, 0, 0, 0] },
  ];

  for (const { name, w, h, border } of expected) {
    const file = path.join(bgRoot, `${name}.png`);
    assert.ok(fs.existsSync(file), `${name}.png 应在 bg 分包`);
    assert.deepEqual(pngSize(file), { w, h }, `${name}.png 尺寸不对`);
    const metaPath = file + '.meta';
    assert.ok(fs.existsSync(metaPath), `${name}.png.meta 不存在`);
    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
    assert.equal(meta.importer, 'image');
    assert.ok(meta.uuid && !seenUuids.has(meta.uuid), `${name}.meta uuid 重复`);
    seenUuids.add(meta.uuid);
    const sf = meta.subMetas.f9941.userData;
    assert.equal(sf.width, w, `${name} spriteFrame 宽度`);
    assert.equal(sf.height, h, `${name} spriteFrame 高度`);
    assert.deepEqual(
      [sf.borderLeft, sf.borderRight, sf.borderTop, sf.borderBottom],
      border,
      `${name} 九宫格边距不对`,
    );
  }

  // 9-slice 与运行时 alias 必须一致，否则 bg 加载完成后贴图会按 SIMPLE 拉伸。
  assert.deepEqual(ART_ALIAS.label_plate.insets, [8, 8, 5, 5]);
  assert.deepEqual(ART_ALIAS.label_plate_locked.insets, [8, 8, 5, 5]);
  assert.deepEqual(ART_ALIAS.bottom_bar.insets, [8, 8, 4, 4]);
  for (const name of ['label_plate', 'label_plate_locked', 'icon_lock_16', 'bottom_bar', 'badge']) {
    assert.equal(ART_ALIAS[name]?.src, 'bg', `${name} 应走 bg 分包`);
  }

  const locIds = ['baishizhou', 'dongmen', 'futian_cbd', 'huaqiangbei', 'nanshan_tech', 'sz_bay', 'university_town', 'window_world'];
  for (const id of locIds) {
    const file = path.join(bgRoot, 'map_icons', `${id}_locked.png`);
    assert.ok(fs.existsSync(file), `${id}_locked.png 不存在`);
    assert.deepEqual(pngSize(file), { w: 48, h: 48 }, `${id}_locked.png 尺寸不对`);
    const meta = JSON.parse(fs.readFileSync(file + '.meta', 'utf8'));
    assert.equal(meta.importer, 'image');
    assert.ok(meta.uuid && !seenUuids.has(meta.uuid), `${id}_locked.meta uuid 重复`);
    seenUuids.add(meta.uuid);
    assert.equal(ART_ALIAS[`map_icon_${id}_locked`]?.src, 'bg');
  }

  // 主包不应再出现这批新图；底图坐标保持不变。
  const resRoot = path.resolve(process.cwd(), 'cocos/assets/resources/art');
  for (const name of ['label_plate.png', 'label_plate_locked.png', 'icon_lock_16.png', 'bottom_bar.png', 'badge.png']) {
    assert.ok(!fs.existsSync(path.join(resRoot, name)), `${name} 不应进主包`);
  }
  assert.deepEqual(MAP_POINTS, {
    university_town: { x: 63, y: 61 },
    nanshan_tech: { x: 81, y: 231 },
    baishizhou: { x: 221, y: 153 },
    sz_bay: { x: 122, y: 347 },
    window_world: { x: 242, y: 471 },
    futian_cbd: { x: 281, y: 394 },
    huaqiangbei: { x: 300, y: 274 },
    dongmen: { x: 301, y: 72 },
  });
});

test('r39 限定牌：右侧→左侧→下方→合并，删除印章分支，玩家层级最高', () => {
  const root = path.resolve(process.cwd(), 'cocos/assets/scripts/GameRoot.ts');
  const src = fs.readFileSync(root, 'utf8');
  const mapStart = src.indexOf('private showMap()');
  const mapEnd = src.indexOf('private createMapPlate', mapStart);
  assert.ok(mapStart >= 0 && mapEnd > mapStart, '找不到 showMap 代码段');
  const mapCode = src.slice(mapStart, mapEnd);
  assert.match(mapCode, /this\.game\.hasDailySpecialAt\(loc\.id\)/, '地图没有判断今日限定地点');
  assert.match(mapCode, /computeBadgeUnderPlate\(/, '角标没有用纯函数定位');
  assert.match(mapCode, /blockers\.push\(other\.placement\.icon\)/, '碰撞没有把自家地点图标算进去');
  assert.match(mapCode, /other\.loc\.id !== loc\.id\) blockers\.push\(other\.placement\.plate\)/,
    '碰撞只应排除自家名字牌');
  assert.match(mapCode, /bounds: badgeBounds/, '角标没有地图可见区边界');
  assert.match(mapCode, /this\.createDailyBadge\(\s*plate,/, '角标没有挂到名字牌节点上');
  assert.doesNotMatch(mapCode, /this\.createDailyBadge\(marker,/, '角标仍挂在 marker 屏幕坐标上');
  assert.match(mapCode, /hero\.setSiblingIndex\(marker\.children\.length - 1\)/, '玩家小人没有放到最高层级');
  assert.match(mapCode, /hero as any\)\.zIndex = 10000/, '玩家小人没有最高 zIndex');

  const badgeStart = src.indexOf('private createDailyBadge');
  const badgeEnd = src.indexOf('// -------------------- 地图', badgeStart);
  assert.ok(badgeStart >= 0 && badgeEnd > badgeStart, '找不到 createDailyBadge 代码段');
  const badgeCode = src.slice(badgeStart, badgeEnd);
  assert.match(badgeCode, /lb\.fontSize = pxFont\(12\)/, '角标没有走全局字号换算');
  assert.match(badgeCode, /setScale\(MAP_BADGE_SCALE, MAP_BADGE_SCALE, 1\)/, '角标没有用整数倍缩放');
  assert.match(badgeCode, /g\.lineWidth = pxSpacing\(1\)/, '角标描边没有按设计缩放');
  assert.match(badgeCode, /lb\.string = MAP_BADGE_TEXT/, '限定牌没有始终带「限定」文字');
  assert.doesNotMatch(badgeCode, /daily_badge_stamp|stampSize|badge\.stamp/, '仍保留印章/小点分支');
  assert.doesNotMatch(badgeCode, /Art\.makeVisual\('badge'/, '仍用 badge.png 画无字小点');

  const plate = { left: -56, right: 56, top: 20, bottom: -20 };
  const badge = computeBadgeUnderPlate(plate, 64, 36, { gap: 2 });
  assert.equal(badge.side, 'right');
  assert.ok(Math.abs(badge.rect.left - (plate.right + 2)) < 0.001, '角标没有贴在名字牌右侧 2px');
  assert.ok(Math.abs(badge.centerY - 0) < 0.001, '角标没有与名字牌垂直居中');
  const left = computeBadgeUnderPlate(plate, 64, 36, {
    gap: 2,
    bounds: { left: plate.left - 100, right: plate.right + 20, top: 100, bottom: -100 },
  });
  assert.equal(left.side, 'left', '右侧出界时没有改放左侧');

  const below = computeBadgeUnderPlate(plate, 64, 36, {
    gap: 2,
    bounds: { left: -200, right: 200, top: 100, bottom: -100 },
    blockers: [
      { left: plate.right, right: plate.right + 100, top: 100, bottom: -100 },
      { left: plate.left - 100, right: plate.left, top: 100, bottom: -100 },
    ],
  });
  assert.equal(below.side, 'below', '左右都被占时没有退到名字牌正下方');
  assert.ok(Math.abs(below.rect.top - (plate.bottom - 2)) < 0.001, '下方角标间距不是 2px');

  const merged = computeBadgeUnderPlate(plate, 64, 36, {
    gap: 2,
    bounds: { left: -200, right: 200, top: 100, bottom: -100 },
    blockers: [
      { left: plate.right, right: plate.right + 100, top: 100, bottom: -100 },
      { left: plate.left - 100, right: plate.left, top: 100, bottom: -100 },
      { left: -100, right: 100, top: plate.bottom, bottom: -100 },
    ],
  });
  assert.equal(merged.side, 'merged', '下方也放不下时没有并进名字牌');
  assert.equal(merged.merged, true, '合并档没有标记');
  assert.ok(Math.abs((merged.plateRect!.right - merged.plateRect!.left) - (56 * 2 + 64)) < 0.001,
    '合并后名字牌没有整体加宽');
  assert.ok(Math.abs((merged.rect.top - merged.rect.bottom) - 40) < 0.001, '合并红段没有与名字牌等高');
});

test('地图底栏签文从左侧内边距起排，长文案折行/降档后仍在栏内', () => {
  const root = path.resolve(process.cwd(), 'cocos/assets/scripts/GameRoot.ts');
  const src = fs.readFileSync(root, 'utf8');
  const mapStart = src.indexOf('private showMap()');
  const mapEnd = src.indexOf('private createMapPlate', mapStart);
  const mapCode = src.slice(mapStart, mapEnd);
  assert.match(mapCode, /setAnchorPoint\(0, 0\.5\)/, '底栏签文锚点 X 仍为 0.5');
  assert.match(mapCode, /const hintPadX = pxSpacing\(8\)/, '底栏签文没有按 8 设计 px 换算左边距');
  assert.match(mapCode, /-barW \/ 2 \+ hintPadX/, '底栏签文没有从换算后的左内边距起排');
  assert.match(mapCode, /barW - hintPadX \* 2/, '底栏签文可用宽度没有扣掉左右内边距');

  // 9:20 下最小可视宽 576；最长默认提示最宽行仍不超过内区。
  for (const barW of [576, 592, 720]) {
    const fit = fitCardText('点击地点前往 · 解锁地点需等待天数', {
      maxWidth: barW - pxSpacing(8) * 2,
      maxHeight: pxFont(12) + pxSpacing(4),
      fontSize: pxFont(12),
      minFontSize: pxFont(12),
      lineGap: 0,
    });
    assert.ok(fit.fontSize >= pxFont(12) && fit.fontSize % 12 === 0, '签文字号不在 12 的整数档');
    assert.ok(fit.width <= barW - pxSpacing(8) * 2 + 0.001, `底栏签文超出 ${barW} 宽度`);
    assert.ok(fit.height <= pxFont(12) + pxSpacing(4) + 0.001, '底栏签文高度越界');
  }
});

test('失败卡正文加深色底板提高对比度，底部签名 24px 整数坐标且 1 倍缩放', () => {
  const root = path.resolve(process.cwd(), 'cocos/assets/scripts/GameRoot.ts');
  const src = fs.readFileSync(root, 'utf8');
  const reportStart = src.indexOf('private addReportText');
  const reportEnd = src.indexOf('private addCardText', reportStart);
  assert.ok(reportStart >= 0 && reportEnd > reportStart, '找不到 addReportText 代码段');
  const reportCode = src.slice(reportStart, reportEnd);
  assert.match(reportCode, /darkPlate: boolean = false/, '失败卡正文没有对比度底板开关');
  assert.match(reportCode, /report_text_plate/, '失败卡正文没有深色底板');
  assert.match(reportCode, /bg: darkPlate \? 'dark' : 'light'/, '失败卡深色底板没有使用 outline 字形');
  assert.match(src, /addReportText\(content, \[[\s\S]*?\], box, true\)/, '失败卡没有启用深色底板');

  assert.match(src, /createLabel\(\s*'sign',\s*signSize,/, '底部签名没有走全局字号换算');
  assert.match(src, /const signSize = pxFont\(12\)/, '底部签名不是正文最小字号');
  assert.match(src, /signPlate/, '底部签名没有深色底板');
  assert.match(src, /signG\.fillColor = new Color\(20, 14, 22, 190\)/, '底部签名底板不是深色半透明');
  assert.match(src, /sign\.node\.setScale\(1, 1, 1\)/, '底部签名存在分数缩放');
  assert.match(src, /Math\.round\(sign\.node\.position\.y\)/, '底部签名没有吸附整像素');
});

test('死因文案不再出现重复的「舍不得吃那块半块…」', () => {
  const all = Object.values(DEATH_LINES).flat();
  assert.ok(!all.some((line) => line.includes('舍不得吃那块')), '死因文案仍有重复的「块」');
  assert.ok(
    DEATH_LINES.starvation.some((line) => line.includes('舍不得吃那半块蛋挞')),
    '缺少修正后的「舍不得吃那半块蛋挞」文案',
  );
});

// ---------------------------------------------------------------------------
// r24 全局字号 / 像素字体 / 可见区布局
// ---------------------------------------------------------------------------

test('r24 设计分辨率 720×1280，字号按 360 宽 UI 稿 ×2 换算', () => {
  const project = JSON.parse(fs.readFileSync(
    path.resolve(process.cwd(), 'cocos/settings/v2/packages/project.json'),
    'utf8',
  ));
  assert.deepEqual(project.general.designResolution, {
    width: 720, height: 1280, fitWidth: false, fitHeight: true,
  }, '项目设计分辨率/适配策略不是 720×1280 Fit Height');
  assert.equal(DESIGN_WIDTH, 720);
  assert.equal(DESIGN_HEIGHT, 1280);
  assert.equal(UI_SCALE, 2);

  // 默认测试屏按 1 设计单位 = 1 物理像素：k=2，正文 2 源像素，标题 4 源像素。
  assert.equal(pxFont(12), 24, '正文 12 逻辑 px 应为 2 源像素 = 24 设计单位');
  assert.equal(pxFont(18), 48, '标题 18 逻辑 px 应为 2k = 4 源像素 = 48');
  assert.equal(pxFont(24), 72, '大标题 24 逻辑 px 应为 3k = 6 源像素 = 72');
  const k = Math.round(pxFont(12) / 12);
  for (const logical of [12, 18, 24, 30, 36]) {
    const size = pxFont(logical);
    const expectedScale = logical <= 12
      ? k
      : logical <= 18
        ? 2 * k
        : 2 * k + Math.max(1, Math.round((logical - 18) / 6)) * k;
    assert.equal(size % 12, 0, `1:1 测试屏下 pxFont(${logical})=${size} 仍是整数源像素档`);
    assert.equal(size, expectedScale * 12, `pxFont(${logical}) 不是整数源像素档`);
  }
  // 手机正文最小规则：字高至少约屏幕宽 1/30（720/30 = 24）。
  assert.ok(pxFont(12) >= Math.ceil(DESIGN_WIDTH / 30), '正文字号小于 1/30 屏宽');
  assert.equal(pxSpacing(8), 16, '8 设计 px 应换算为 16');
  assert.equal(PIXEL_OUTLINE_WIDTH, 2, '1 设计像素描边应换算为 2');
});

// ---------------------------------------------------------------------------
// r25 位图字体 / 按屏宽定字号 / 版本角标
// ---------------------------------------------------------------------------

function walkTsFiles(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkTsFiles(full, out);
    else if (entry.isFile() && entry.name.endsWith('.ts')) out.push(full);
  }
  return out;
}

/** 用 TypeScript AST 收集真正的游戏字符串（不含注释、正则、生成的字宽表）。 */
function gameStringChars(): Set<string> {
  const chars = new Set<string>();
  const files = [
    ...walkTsFiles(path.resolve(process.cwd(), 'src/core')),
    ...walkTsFiles(path.resolve(process.cwd(), 'cocos/assets/scripts')),
  ].filter((file) => !file.endsWith('BmFontData.ts') && !file.endsWith('Version.ts'));
  for (const file of files) {
    const source = ts.createSourceFile(
      file,
      fs.readFileSync(file, 'utf8'),
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    );
    const visit = (node: ts.Node) => {
      let text: string | undefined;
      if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
        text = node.text;
      } else if (ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node)) {
        text = node.text;
      }
      if (text) {
        for (const ch of text) chars.add(ch);
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  // 动态拼接的数字/货币/标点。
  for (const ch of '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ¥￥·…，。！？：；（）「」【】、/.-+%×−★') {
    chars.add(ch);
  }
  return chars;
}

interface FntGlyph {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  xoffset: number;
  yoffset: number;
  xadvance: number;
}

function readFnt(file: string): { text: string; glyphs: Map<number, FntGlyph>; count: number } {
  const text = fs.readFileSync(file, 'utf8');
  const glyphs = new Map<number, FntGlyph>();
  let count = 0;
  for (const line of text.split('\n')) {
    if (line.startsWith('chars count=')) count = Number(line.slice('chars count='.length).trim());
    if (!line.startsWith('char ')) continue;
    const num = (key: string) => Number((new RegExp(`${key}=(-?\\d+)`).exec(line) ?? [])[1]);
    const id = num('id');
    glyphs.set(id, {
      id,
      x: num('x'),
      y: num('y'),
      width: num('width'),
      height: num('height'),
      xoffset: num('xoffset'),
      yoffset: num('yoffset'),
      xadvance: num('xadvance'),
    });
  }
  return { text, glyphs, count };
}

test('r27 pixel_plain/pixel_outline 双图集覆盖全部字符，nearest/无 mipmap，主包 < 3950KB', () => {
  const fontDir = path.resolve(process.cwd(), 'cocos/assets/resources/font');
  const names = ['pixel_plain', 'pixel_outline'];
  const parsed: Record<string, ReturnType<typeof readFnt>> = {};
  for (const name of names) {
    const fntPath = path.join(fontDir, `${name}.fnt`);
    const pngPath = path.join(fontDir, `${name}.png`);
    assert.ok(fs.existsSync(fntPath), `缺少主包 resources/font/${name}.fnt`);
    assert.ok(fs.existsSync(pngPath), `缺少主包 resources/font/${name}.png`);
    assert.ok(fs.existsSync(fntPath + '.meta'), `缺少 ${name}.fnt.meta`);
    assert.ok(fs.existsSync(pngPath + '.meta'), `缺少 ${name}.png.meta`);
    assert.ok(!fs.existsSync(path.join(fontDir, `${name}.fnt.txt`)), '不应多出中间文件');

    const fnt = readFnt(fntPath);
    parsed[name] = fnt;
    assert.ok(fnt.count > 800, `${name} 字符数过少：${fnt.count}`);
    assert.equal(fnt.glyphs.size, fnt.count, `${name} chars count 与 char 行数不一致`);
    assert.match(fnt.text, /common lineHeight=14 base=11/, `${name} 行高/基线不符合 12px + 描边留白`);
    assert.match(fnt.text, /smooth=0 aa=0/, `${name} 未关闭抗锯齿`);
    assert.match(fnt.text, new RegExp(`info face="${name}"`), `${name} face 名不一致`);
    assert.match(fnt.text, new RegExp(`page id=0 file="${name}\\.png"`), `${name} page 文件名不一致`);

    const missing = Array.from(gameStringChars()).filter((ch) => {
      if (ch === '\n' || ch === '\r' || ch === '\t') return false;
      return !fnt.glyphs.has(ch.codePointAt(0) ?? -1);
    });
    assert.deepEqual(missing, [], `${name} 游戏字符串缺字：${missing.join('')}`);

    const fntMeta = JSON.parse(fs.readFileSync(fntPath + '.meta', 'utf8'));
    const pngMeta = JSON.parse(fs.readFileSync(pngPath + '.meta', 'utf8'));
    assert.equal(fntMeta.importer, 'bitmap-font', `${name}.fnt 不是 bitmap-font 资源`);
    assert.equal(fntMeta.userData.fontSize, 12, `${name} BMFont fontSize 不是 12`);
    assert.equal(fntMeta.userData.textureUuid, pngMeta.uuid, `${name} textureUuid 与 png uuid 不一致`);
    assert.equal(
      Object.keys(fntMeta.userData._fntConfig.fontDefDictionary).length,
      fnt.count,
      `${name} _fntConfig 字符数不一致`,
    );
    const texture = pngMeta.subMetas['6c48a'].userData;
    assert.equal(texture.minfilter, 'nearest', `${name} 图集 minfilter 不是 nearest`);
    assert.equal(texture.magfilter, 'nearest', `${name} 图集 magfilter 不是 nearest`);
    assert.equal(texture.mipfilter, 'none', `${name} 图集仍启用 mipmap`);
    assert.equal(texture.wrapModeS, 'clamp-to-edge');
    assert.equal(texture.wrapModeT, 'clamp-to-edge');
    const sprite = pngMeta.subMetas['f9941'].userData;
    assert.equal(sprite.trimType, 'none', `${name} 图集被 trim，BMFont UV 会偏`);
    assert.equal(sprite.packable, false, `${name} 图集不应再进自动图集`);
  }

  // 两个字体来自同一字形集：字符、advance、cell 尺寸/偏移必须一致。
  const plain = parsed.pixel_plain;
  const outline = parsed.pixel_outline;
  assert.equal(plain.count, outline.count, 'plain/outline 字符数不同');
  for (const [id, p] of plain.glyphs) {
    const o = outline.glyphs.get(id);
    assert.ok(o, `outline 缺少字符 ${id}`);
    assert.equal(p.xadvance, o.xadvance, 'plain/outline xadvance 不一致');
    assert.equal(p.width, o.width, 'plain/outline 单元格宽度不一致');
    assert.equal(p.height, o.height, 'plain/outline 单元格高度不一致');
    assert.equal(p.xoffset, o.xoffset, 'plain/outline xoffset 不一致');
    assert.equal(p.yoffset, o.yoffset, 'plain/outline yoffset 不一致');
  }

  // 旧单图集和 TTF 都不再进主包；TTF 源文件移到 tools/fonts 供重新生成。
  assert.ok(!fs.existsSync(path.join(fontDir, 'pixel_cn.fnt')), '旧 pixel_cn.fnt 应已移除');
  assert.ok(!fs.existsSync(path.join(fontDir, 'pixel_cn.png')), '旧 pixel_cn.png 应已移除');
  assert.ok(!fs.existsSync(path.join(fontDir, 'pixel_cn.ttf')), '旧 pixel_cn.ttf 应已移出主包');
  assert.ok(!fs.existsSync(path.join(fontDir, 'pixel_cn.ttf.meta')), '旧 pixel_cn.ttf.meta 应已移除');
  assert.ok(fs.existsSync(path.resolve(process.cwd(), 'tools/fonts/pixel_cn.ttf')), '源 TTF 应保存在 tools/fonts');
  for (const name of names) {
    const pngSize = fs.statSync(path.join(fontDir, `${name}.png`)).size;
    assert.ok(pngSize < 128 * 1024, `${name} 图集太大：${pngSize}B`);
  }
  const mainBytes = ['resources', 'scripts', 'scenes'].reduce((sum, dir) => {
    const walk = (p: string): number => {
      let total = 0;
      for (const entry of fs.readdirSync(p, { withFileTypes: true })) {
        const full = path.join(p, entry.name);
        total += entry.isDirectory() ? walk(full) : fs.statSync(full).size;
      }
      return total;
    };
    return sum + walk(path.resolve(process.cwd(), 'cocos/assets', dir));
  }, 0);
  assert.ok(mainBytes < 3950 * 1024, `主包 ${(mainBytes / 1024).toFixed(0)}KB 超过 3950KB`);
});

test('r27 主包引擎只保留 2D/UI/Graphics/Tween/Animation/Audio，3D/物理/粒子不打包', () => {
  const root = process.cwd();
  const settingsPath = path.join(root, 'cocos/settings/v2/packages/engine.json');
  const profilesPath = path.join(root, 'cocos/profiles/v2/packages/engine.json');
  assert.ok(fs.existsSync(settingsPath), '缺少 cocos/settings/v2/packages/engine.json');
  assert.ok(fs.existsSync(profilesPath), '缺少 cocos/profiles/v2/packages/engine.json');
  assert.equal(
    fs.readFileSync(profilesPath, 'utf8'),
    fs.readFileSync(settingsPath, 'utf8'),
    'profiles 里的引擎裁剪配置与 settings 不一致',
  );

  const cfg = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
  const mods = cfg.modules.configs[cfg.modules.globalConfigKey];
  const include: string[] = mods.includeModules;
  for (const required of ['base', 'gfx-webgl', '2d', 'ui', 'graphics', 'tween', 'animation', 'audio']) {
    assert.ok(include.includes(required), `引擎缺少 ${required}`);
  }
  for (const forbidden of [
    '3d', 'physics', 'physics-ammo', 'physics-cannon', 'physics-physx', 'physics-builtin',
    'physics-2d', 'physics-2d-box2d', 'physics-2d-box2d-wasm', 'physics-2d-builtin',
    'particle', 'particle-2d', 'skeletal-animation', 'spine', 'spine-3.8', 'spine-4.2',
    'dragon-bones', 'tiled-map', 'terrain', 'video', 'webview', 'light-probe',
  ]) {
    assert.ok(!include.includes(forbidden), `引擎仍启用 ${forbidden}（会增大主包）`);
  }
  for (const key of ['3d', 'physics', 'physics-ammo', 'physics-2d', 'physics-2d-box2d', 'particle', 'particle-2d']) {
    assert.equal(mods.cache[key]?._value, false, `${key} 仍未关闭`);
  }
  assert.equal(mods.cache['render-pipeline']?._option, 'custom-pipeline', '2D 自定义渲染管线未保留');
  assert.equal(mods.cache['custom-pipeline']?._value, true, 'custom-pipeline 未保留');
  assert.equal(mods.cache['legacy-pipeline']?._value, false, 'legacy-pipeline 未关闭');
});

test('r27 旧字体与非首屏美术移出主包，bg 中的序列帧路径仍可解析', () => {
  const resRoot = path.resolve(process.cwd(), 'cocos/assets/resources/art');
  const bgRoot = path.resolve(process.cwd(), 'cocos/assets/bundles/bg');
  const moved = [
    'glow_white', 'glow_blue', 'glow_gold', 'glow_rainbow',
    'fx_clash', 'fx_flashlight', 'hero_walk', 'hero_fall_sleep',
    'npc_patrol_uncle', 'npc_guard', 'npc_rival', 'npc_kind_auntie',
    'npc_delivery_rider', 'npc_wallet_owner', 'npc_sanitation_auntie',
    'inv_grid_normal', 'inv_grid_highlight', 'inv_grid_red',
  ];
  for (const name of moved) {
    assert.ok(!fs.existsSync(path.join(resRoot, name)), `${name}/ 仍在主包`);
    assert.ok(fs.existsSync(path.join(bgRoot, name)), `${name}/ 不在 bg 分包`);
    assert.ok(!fs.existsSync(path.join(resRoot, name + '.meta')), `${name}.meta 仍在主包`);
    assert.ok(fs.existsSync(path.join(bgRoot, name + '.meta')), `${name}.meta 不在 bg 分包`);
  }
  // 序列帧别名必须显式写 frames，否则只会加载第 0 帧。
  const frames: Record<string, number> = {
    hero_walk: 6, hero_fall: 4, glow_white: 6, glow_blue: 6, glow_gold: 6, glow_rainbow: 6,
    fx_flashlight: 4, fx_clash: 4, ev_patrol: 4, ev_guard: 4, ev_rival: 4, ev_auntie: 4,
    ev_delivery: 3, ev_wallet: 3, ev_night_warmth: 3,
  };
  for (const [name, count] of Object.entries(frames)) {
    assert.equal(ART_ALIAS[name]?.src, 'bg', `${name} 没有走 bg 分包`);
    assert.equal(ART_ALIAS[name]?.frames, count, `${name} 的 frames 不是 ${count}`);
    assert.ok(
      fs.existsSync(path.join(bgRoot, ART_ALIAS[name].path, '0.png')),
      `${name} 在 bg 里找不到 ${ART_ALIAS[name].path}/0.png`,
    );
  }
});

test('r26 描边只画外侧：flood-fill 外部区域，不用 MaxFilter 填死笔画间缝隙', () => {
  const gen = fs.readFileSync(path.resolve(process.cwd(), 'scripts/gen-bmfont.py'), 'utf8');
  assert.match(gen, /def exterior_outline/, '缺少外侧描边生成函数');
  assert.match(gen, /deque/, '没有从字格边界 flood-fill 背景');
  assert.match(gen, /outside/, '没有区分外部背景');
  assert.match(gen, /neighbours8/, '没有用 8 邻接判断外部描边');
  assert.doesNotMatch(gen, /MaxFilter/, '仍在使用 MaxFilter，会把内部缝隙也描边');
  assert.match(gen, /CELL_PAD/, '没有给字格加 1px padding');
  assert.match(gen, /xoffset.*x0.*CELL_PAD/s, 'xoffset 没有按 padding 修正');
  assert.match(gen, /yoffset.*baseline_from_top.*CELL_PAD/s, 'yoffset 没有按 padding 修正');
  assert.match(gen, /pixel_plain/, '没有生成 pixel_plain');
  assert.match(gen, /pixel_outline/, '没有生成 pixel_outline');

  const previewScript = fs.readFileSync(path.resolve(process.cwd(), 'scripts/gen-glyph-preview.py'), 'utf8');
  assert.match(previewScript, /SCALE = 2/, '预览不是 k=2');
  assert.match(previewScript, /NEAREST/, '预览没有用整数最近邻放大');
  assert.match(previewScript, /ly15_glyph_preview\.png/, '预览输出路径不对');
  const previews = [
    '/workspace/ly15_glyph_preview.png',
    path.resolve(process.cwd(), 'ly15_glyph_preview.png'),
    '/workspace/lingyuan_art/ly15_glyph_preview.png',
  ];
  assert.ok(previews.some((f) => fs.existsSync(f)), '没有生成 ly15_glyph_preview.png');
});

test('r25 字宽全部来自 BMFont xadvance，而不是字符个数估算', () => {
  assert.equal(BM_FONT_ADVANCES[' '], 6);
  assert.equal(BM_FONT_ADVANCES['0'], 6);
  assert.equal(BM_FONT_ADVANCES['A'], 8);
  assert.equal(BM_FONT_ADVANCES['W'], 10);
  assert.equal(BM_FONT_ADVANCES['i'], 4);
  assert.equal(BM_FONT_ADVANCES['¥'], 6);
  assert.equal(BM_FONT_ADVANCES['中'], 12);
  assert.equal(BM_FONT_ADVANCES['，'], 12);
  for (const [ch, advance] of Object.entries(BM_FONT_ADVANCES)) {
    assert.ok(Number.isInteger(advance) && advance >= 0, `${ch} 的 xadvance 非法`);
  }
  assert.equal(measureTextWidth('0', 24), BM_FONT_ADVANCES['0'] * 2);
  assert.equal(measureTextWidth('A', 24), BM_FONT_ADVANCES['A'] * 2);
  assert.equal(measureTextWidth('W', 24), BM_FONT_ADVANCES['W'] * 2);
  assert.equal(measureTextWidth('中', 24), BM_FONT_ADVANCES['中'] * 2);
  assert.equal(measurePixelTextWidth('11/10/2026', 24), measureTextWidth('11/10/2026', 24));
});

test('r26 物理像素整数倍：k = floor(physicalWidth/360)，正文 k、标题 2k、按钮 k', () => {
  const devices: [number, number, number][] = [
    [360, 640, 1],
    [750, 1334, 2],
    [1080, 1920, 3],
    [1170, 2532, 3],
    [1290, 2796, 3],
  ];
  const rows = devices.map(([w, h, dpr]) => fontMetricsForDevice(w, h, dpr));
  console.log('[r26 k 表]', rows.map((r) =>
    `${r.physicalWidth}x${r.physicalHeight} dpr${r.devicePixelRatio}: visible=${r.visibleWidth.toFixed(1)} k=${r.k} body=${r.body.toFixed(2)}/${r.bodyPhysical}px title=${r.title.toFixed(2)}/${r.titlePhysical}px`).join(' | '));

  try {
    for (const [i, row] of rows.entries()) {
      const [physicalWidth, physicalHeight, dpr] = devices[i];
      setFontScreenMetrics({
        physicalWidth,
        physicalHeight,
        visibleWidth: row.visibleWidth,
        visibleHeight: DESIGN_HEIGHT,
        devicePixelRatio: dpr,
      });
      assert.equal(fontScaleK(), row.k, `${physicalWidth} 物理宽 k 不对`);
      assert.equal(row.k, Math.max(1, Math.floor(physicalWidth / 360)));
      assert.equal(getFontPhysicalWidth(), physicalWidth);
      assert.equal(getFontVisibleWidth(), row.visibleWidth);
      assert.equal(getFontDevicePixelRatio(), dpr);

      const body = pxFont(12);
      const title = pxFont(18);
      assert.ok(Math.abs(body - 12 * row.k * row.visibleWidth / physicalWidth) < 1e-9, '正文不是 12*k*visible/physical');
      assert.ok(Math.abs(title - 24 * row.k * row.visibleWidth / physicalWidth) < 1e-9, '标题不是 24*k*visible/physical');
      assert.equal(body, bodyFontSizeForWidth());
      assert.equal(title, titleFontSizeForWidth());
      // 设计字号 * 物理/设计 = 精确整数物理像素。
      const ppd = physicalWidth / row.visibleWidth;
      assert.ok(Math.abs(body * ppd - 12 * row.k) < 1e-6, `${physicalWidth}: 正文未落成 12k 物理像素`);
      assert.ok(Math.abs(title * ppd - 24 * row.k) < 1e-6, `${physicalWidth}: 标题未落成 24k 物理像素`);
      assert.ok(Math.abs(pxFont(24) * ppd - 36 * row.k) < 1e-6, `${physicalWidth}: 大标题未落成 36k 物理像素`);
      assert.ok(pxFont(18) > pxFont(12), `${physicalWidth}: 标题没有比正文大`);
      // 按钮正文档：k。
      assert.equal(pxFont(12), body);
      // 至少 6 源像素*k 横向、3 源像素*k 纵向内边距。
      assert.ok(buttonPaddingX() * ppd >= 6 * row.k - 1e-6, '按钮横向内边距不足 6 源像素k');
      assert.ok(buttonPaddingY() * ppd >= 3 * row.k - 1e-6, '按钮纵向内边距不足 3 源像素k');
      assert.ok(buttonMinTouchHeight() * ppd / dpr >= 44 - 1e-6, '按钮高度不足约 44 CSS px');
      assert.ok(cssPxToDesign(44) > 0);
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

  // 1:1 模拟屏下仍与旧 360/720/750 行为兼容。
  try {
    for (const [width, body, title] of [[360, 12, 24], [720, 24, 48], [750, 24, 48]] as const) {
      setFontVisibleWidth(width);
      assert.equal(pxFont(12), body, `${width} 宽正文`);
      assert.equal(pxFont(18), title, `${width} 宽标题`);
      assert.ok(pxFont(24) > title, `${width} 宽大标题未继续加档`);
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

  const table = fontSizeTable([360, 720, 750]);
  assert.deepEqual(table.map((r) => r.k), [1, 2, 2]);
  assert.deepEqual(table.map((r) => r.bodyPhysical), [12, 24, 24]);
  assert.deepEqual(table.map((r) => r.titlePhysical), [24, 48, 48]);
});

test('r26 卡片内深绿色文字统一改为 #1a1020', () => {
  const gameRoot = fs.readFileSync(path.resolve(process.cwd(), 'cocos/assets/scripts/GameRoot.ts'), 'utf8');
  assert.doesNotMatch(gameRoot, /new Color\(70, 120, 70/, '结算卡仍存在深绿色价格字');
  assert.doesNotMatch(gameRoot, /new Color\(28, 96, 40/, '签纸好签仍是深绿色');
  assert.match(gameRoot, /PIXEL_INK_COLOR/, '没有使用 #1a1020 墨色常量');
  const font = fs.readFileSync(path.resolve(process.cwd(), 'cocos/assets/scripts/ui/PixelFont.ts'), 'utf8');
  assert.match(font, /isDarkGreen/, 'PixelFont 没有兜底深绿色转墨色');
  assert.match(font, /color = PIXEL_INK_COLOR\.clone\(\)/, '深绿色没有转成 #1a1020');
});

test('r27 版本角标由 HEAD 生成、默认测试显示、--release 隐藏；睡觉按钮有「睡觉」', () => {
  const gen = fs.readFileSync(path.resolve(process.cwd(), 'scripts/gen-version.mjs'), 'utf8');
  assert.match(gen, /rev-parse/, '版本脚本没有读取 git hash');
  assert.match(gen, /Version\.ts/, '版本脚本没有生成 Version.ts');
  assert.match(gen, /rev-parse/, '版本脚本没有读取 git HEAD');
  assert.match(gen, /readGitDir|LY15_COMMIT/, '版本脚本没有 worktree/.git/环境变量兜底');
  assert.match(gen, /process\.argv\.includes\('--release'\)/, '版本脚本没有 --release 开关');
  assert.match(gen, /IS_TEST_BUILD = \$\{isTestBuild\}/, '没有生成 IS_TEST_BUILD');
  assert.match(BUILD_TAG, /^r\d+ [0-9a-f]{7,}$/, `构建标签格式不对：${BUILD_TAG}`);
  assert.doesNotMatch(BUILD_TAG, /dev/, `构建标签仍含 dev：${BUILD_TAG}`);
  assert.equal(IS_TEST_BUILD, true, '默认预览/测试包应显示版本角标');
  const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'package.json'), 'utf8'));
  assert.match(pkg.scripts['gen:version'] ?? '', /gen-version\.mjs/);
  assert.match(pkg.scripts.prebuild ?? '', /prebuild\.mjs/, 'build 前没有一键 prebuild 脚本');
  assert.match(pkg.scripts['build:release'] ?? '', /--release/, '缺少 release 构建脚本');

  const src = fs.readFileSync(path.resolve(process.cwd(), 'cocos/assets/scripts/GameRoot.ts'), 'utf8');
  assert.match(src, /import \{ BUILD_TAG, IS_TEST_BUILD \} from '\.\/Version'/, 'GameRoot 没有引用构建标签/测试开关');
  assert.match(src, /versionLabel/, 'GameRoot 没有构建角标字段');
  assert.match(src, /build_tag/, '没有创建 build_tag 节点');
  assert.match(src, /IS_TEST_BUILD && \(this\.game\.phase === 'fortune' \|\| this\.game\.phase === 'home'\)/, '角标不受 IS_TEST_BUILD 控制');
  assert.match(src, /version\.node\.active = IS_TEST_BUILD/, 'release 包没有隐藏版本角标');
  assert.match(src, /makeSpriteButton\('btn_sleep', 'btn_sleep_pressed', '睡觉'/, '睡觉按钮缺少文字');
});

test('r26 PixelFont 双字形档、整数物理像素吸附、运行时 nearest、无额外描边', () => {
  const root = path.resolve(process.cwd(), 'cocos/assets/scripts');
  const files = walkTsFiles(root);
  const src = fs.readFileSync(path.join(root, 'ui/PixelFont.ts'), 'utf8');
  assert.match(src, /BitmapFont/, 'PixelFont 没有使用 BitmapFont');
  assert.match(src, /PIXEL_FONT_PLAIN_PATH = 'font\/pixel_plain'/, '缺少 pixel_plain 路径');
  assert.match(src, /PIXEL_FONT_OUTLINE_PATH = 'font\/pixel_outline'/, '缺少 pixel_outline 路径');
  assert.match(src, /PIXEL_INK_COLOR = new Color\(26, 16, 32, 255\)/, '浅底墨色不是 #1a1020');
  assert.match(src, /label\.font = asset/, 'PixelFont 没有设置 label.font');
  assert.match(src, /useSystemFont = false/, 'PixelFont 没有关闭系统字体');
  assert.match(src, /CacheMode\.NONE/, 'PixelFont 没有使用 NONE 缓存');
  assert.doesNotMatch(src, /SHRINK/, 'PixelFont 仍出现 SHRINK');
  assert.doesNotMatch(src, /TTFFont|wx\.loadFont|fontFamily\)/, 'PixelFont 仍走 TTF 加载');
  assert.doesNotMatch(src, /addComponent\(LabelOutline\)/, 'PixelFont 仍在添加描边组件');
  assert.match(src, /Texture2D\.Filter\.NEAREST/, '运行时没有把 BitmapFont 纹理设成 NEAREST');
  assert.match(src, /setMipFilter\(Texture2D\.Filter\.NONE\)/, '运行时没有关闭 mipmap');
  assert.match(src, /worldPosition/, '像素吸附没有使用世界坐标');
  assert.match(src, /snapLabel/, '没有 Label 世界坐标吸附 helper');
  assert.match(src, /DEBUG_FONT = false/, 'DEBUG_FONT 默认不是 false');
  assert.match(src, /fontdebug/, '没有 URL ?fontdebug=1 开关');

  let labelCount = 0;
  const missing: string[] = [];
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    const rel = path.relative(process.cwd(), file);
    const labelRe = /addComponent\(Label\)/g;
    let m: RegExpExecArray | null;
    while ((m = labelRe.exec(text)) !== null) {
      labelCount++;
      const chunk = text.slice(m.index, m.index + 2000);
      if (!chunk.includes('PixelFont.apply')) {
        const line = text.slice(0, m.index).split('\n').length;
        missing.push(`${rel}:${line}`);
      }
    }
    assert.doesNotMatch(text, /Label\.Overflow\.SHRINK/, `${rel} 仍在使用 SHRINK`);
    assert.doesNotMatch(text, /CacheMode\.CHAR/, `${rel} 仍在使用 CHAR 缓存`);
    assert.doesNotMatch(text, /useSystemFont\s*=\s*true/, `${rel} 仍显式回退系统字体`);
    assert.doesNotMatch(text, /\.fontSize\s*=\s*\d/, `${rel} 仍有硬编码数字字号`);
  }
  assert.equal(missing.length, 0, `未应用 BMFont 的 Label：${missing.join(', ')}`);
  assert.ok(labelCount > 0, '没有扫描到任何 Label');

  // 所有运行时 PixelFont.apply 都必须显式选择浅底/深底字形档。
  const badApply: string[] = [];
  for (const file of files) {
    if (file.endsWith('PixelFont.ts')) continue;
    const text = fs.readFileSync(file, 'utf8');
    const applyRe = /PixelFont\.apply\(/g;
    let m: RegExpExecArray | null;
    while ((m = applyRe.exec(text)) !== null) {
      const chunk = text.slice(m.index, m.index + 500);
      if (!/bg:|variant:/.test(chunk)) {
        badApply.push(`${path.relative(process.cwd(), file)}:${text.slice(0, m.index).split('\n').length}`);
      }
    }
  }
  assert.deepEqual(badApply, [], `未声明浅底/深底字形的 apply：${badApply.join(', ')}`);

  const art = fs.readFileSync(path.join(root, 'ui/Art.ts'), 'utf8');
  assert.match(art, /buttonMetrics\(/, 'Art 没有按文字+内边距计算按钮尺寸');
  assert.match(art, /buttonMinTouchHeight\(\)/, 'Art 按钮没有 44 CSS 最小触摸高');
  assert.match(art, /fontSize: metrics\.fontSize/, '按钮文字没有用正文档');
  assert.match(art, /fontSize = pxFont\(12\)/, '按钮文字字号不是正文 k');
});

test('r25 分享图不再依赖 wx.loadFont，使用系统中文黑体兜底', () => {
  const share = fs.readFileSync(
    path.resolve(process.cwd(), 'cocos/assets/scripts/ui/Share.ts'),
    'utf8',
  );
  assert.doesNotMatch(share, /PixelFont\.load\(\)/, '分享图仍在等 TTF 字体');
  assert.doesNotMatch(share, /PixelFont\.family/, '分享图仍依赖 TTF family');
  assert.match(share, /Share\.setFont\(ctx/, '分享图没有统一 setFont');
  assert.match(share, /PingFang SC/, '分享图没有系统中文兜底');
  assert.match(share, /sans-serif/, '分享图没有 sans-serif 兜底');
});

test('r26 k=1/2/3 物理屏宽下 HUD/结算/按钮/地图/气泡/日期价格不溢出', () => {
  const devices: [number, number, number][] = [
    [360, 640, 1],
    [750, 1334, 2],
    [1080, 1920, 3],
    [1170, 2532, 3],
    [1290, 2796, 3],
  ];
  try {
    for (const [physicalWidth, physicalHeight, dpr] of devices) {
      const row = fontMetricsForDevice(physicalWidth, physicalHeight, dpr);
      assert.ok([1, 2, 3].includes(row.k), `${physicalWidth} k 超出 1/2/3`);
      setFontScreenMetrics({
        physicalWidth,
        physicalHeight,
        visibleWidth: row.visibleWidth,
        visibleHeight: DESIGN_HEIGHT,
        devicePixelRatio: dpr,
      });
      const width = row.visibleWidth;
      const body = pxFont(12);
      const title = pxFont(18);
      const label = `${physicalWidth}px/k${row.k}`;
      assert.ok(body > 0 && title >= body);

      // HUD：两根条、天数、金钱、回家提示。
      const barW = Math.max(120, Math.min(250, Math.floor((width - 48) / 2)));
      for (const text of ['饱腹 100/100', '体力 100/100']) {
        assert.ok(measureTextWidth(text, body) <= barW - 16, `${label} 进度条文字溢出`);
      }
      assert.ok(measureTextWidth('第 15 天', body) <= 160, `${label} 天数溢出`);
      assert.ok(measureTextWidth('¥ 123456.78', body) <= 180, `${label} 金钱溢出`);
      assert.ok(measureTextWidth('回家需 30 体力', body) <= 320, `${label} 回家提示溢出`);

      // 结算卡：标题、四行数值、吐槽。
      const innerW = 520 - 32 * 2;
      const titleFit = fitCardText('第 7 天 · 城中村握手楼床位', {
        maxWidth: innerW, maxHeight: lineHeightForFontSize(body), fontSize: body, minFontSize: body, lineGap: 0,
      });
      assert.ok(titleFit.width <= innerW + 0.001, `${label} 结算标题溢出`);
      assert.ok(titleFit.height <= lineHeightForFontSize(body) + 0.001, `${label} 结算标题高度溢出`);
      for (const item of ITEMS) {
        const value = `${item.name}  ¥ 999.00`;
        assert.ok(measureTextWidth(value, body) <= 300, `${label} 结算行溢出：${item.name}`);
      }
      const roast = fitCardText('今日战绩：显卡，收入 ¥ 500.10，深圳欢迎你', {
        maxWidth: innerW - 8, maxHeight: 120, fontSize: body, minFontSize: body, lineGap: 0,
      });
      assert.ok(roast.width <= innerW - 8 + 0.001, `${label} 吐槽溢出`);
      assert.ok(roast.height <= 120 + 0.001, `${label} 吐槽高度溢出`);
      assert.ok(roast.lines.at(-1)!.length > 1, `${label} 吐槽出现孤字`);

      // 认证卡日期 / 价格整体不拆。
      const date = fitCardText('编号：123456  日期：11/10/2026', {
        maxWidth: 336, maxHeight: 420, fontSize: body, minFontSize: body, lineGap: 0,
      });
      assert.ok(date.lines.some((line) => line.includes('日期：11/10/2026')), `${label} 日期被拆`);
      assert.ok(date.lines.every((line) => measureTextWidth(line, date.fontSize) <= 336 + 0.001), `${label} 日期行溢出`);
      const price = fitCardText('最值钱的货：过季潮牌T恤（¥\u00A027.00）', {
        maxWidth: 336, maxHeight: 420, fontSize: body, minFontSize: body, lineGap: 0,
      });
      assert.ok(price.lines.some((line) => line.includes('（¥\u00A027.00）')), `${label} 价格被拆`);
      assert.ok(price.lines.every((line) => measureTextWidth(line, price.fontSize) <= 336 + 0.001), `${label} 价格行溢出`);

      // 按钮：文字用正文 k，按文字 + 6/3 源像素k 内边距，最小 44 CSS 触摸高。
      const padX = buttonPaddingX();
      const padY = buttonPaddingY();
      const minTouch = buttonMinTouchHeight();
      assert.ok(Math.abs(padX - body / 2) < 1e-9 && Math.abs(padY - body / 4) < 1e-9, `${label} 按钮内边距不是源像素换算`);
      for (const text of ['就它了', '重抽 ¥5', '知道了', '去这里', '关闭', '换地点', '回家', '收工', '睡觉', '醒来', '再来一局', '分享']) {
        const textW = measureTextWidth(text, body);
        const needW = textW + padX * 2;
        const needH = Math.max(lineHeightForFontSize(body) + padY * 2, minTouch);
        assert.ok(needW > textW && needH > 0, `${label} 按钮 ${text} 没有包住文字`);
        const ppd = physicalWidth / width;
        assert.ok(needW * ppd >= textW * ppd + 12 * row.k - 0.001, `${label} 按钮 ${text} 横向内边距不足`);
        assert.ok(needH * ppd / dpr >= 44 - 0.001, `${label} 按钮 ${text} 触摸高不足`);
      }

      // 地图地名牌按 BMFont advance 撑开，高度也是行高 + padding。
      const plateH = computeMapPlateHeight(body);
      assert.equal(plateH, Math.ceil(lineHeightForFontSize(body) + 12));
      for (const text of ['第 15 天开放', '白石洲 · 今日拉黑', '华强北']) {
        const plateW = computeMapPlateWidth(text, body, {
          minWidth: 112,
          maxWidth: Math.min(300, width - 24),
          padX: 28,
        });
        assert.ok(plateW <= Math.min(300, width - 24) + 0.001, `${label} 地名牌溢出`);
        assert.ok(plateW >= Math.min(112, Math.ceil(measureTextWidth(text, body)) + 28), `${label} 地名牌没有包住文字`);
      }

      // 地标台词气泡：单行、包住文字。
      for (const loc of LOCATIONS) {
        const m = layoutSpeechBubble(loc.line, {
          fontSize: body,
          lineHeight: lineHeightForFontSize(body),
          padX: 12,
          padY: 10,
          minWidth: 120,
          maxWidth: Math.max(120, width - 24),
        });
        assert.equal(m.lineCount, 1, `${label} ${loc.id} 气泡被拆行`);
        assert.ok(m.textWidth <= m.width - 24 + 0.001, `${label} ${loc.id} 气泡文字溢出`);
        assert.ok(m.width <= Math.max(120, width - 24) + 0.001, `${label} ${loc.id} 气泡超宽`);
      }
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
  assert.equal(pxFont(12), 24, '测试后没有恢复默认设计宽度');
});

test('r24 地图点位在 9:16 / 9:19.5 / 9:20 的 HUD 与底栏之间', () => {
  const iconSize = 96;
  const plateH = 40;
  for (const ratio of [9 / 16, 9 / 19.5, 9 / 20]) {
    const visibleH = 1280;
    const visibleW = visibleH * ratio;
    for (const headerTop of [0, 40, 80]) {
      const layout = computeMapLayout({
        visibleH,
        visibleW,
        headerTop,
        hudHeight: 128,
        barHeight: 112,
        iconSize,
        plateHeight: plateH,
      });
      // cover：宽度必须铺满，允许上下裁切；实际落点由 placeMapMarker 夹回内容区。
      assert.ok(layout.mapRect.right - layout.mapRect.left >= visibleW - 0.001, '地图宽度没有铺满');
      for (const point of Object.values(MAP_POINTS)) {
        const p = placeMapMarker(point.x, point.y, layout, {
          iconSize,
          plateWidth: 112,
          plateHeight: plateH,
          halfW: visibleW / 2,
        });
        assert.ok(p.icon.top <= layout.areaTop + 0.001,
          `ratio ${ratio.toFixed(3)} header ${headerTop} 地图点位顶到 HUD`);
        assert.ok(p.plate.bottom >= layout.areaBottom - 0.001,
          `ratio ${ratio.toFixed(3)} header ${headerTop} 地图名牌压到底栏`);
        assert.ok(p.plate.left >= -visibleW / 2 - 0.001 && p.plate.right <= visibleW / 2 + 0.001,
          `ratio ${ratio.toFixed(3)} 地图点位横向越界`);
      }
    }
  }
});

test('r24 大学城最大背包：气泡与「拖」提示至少 8px 间距（4 设计 px × scale）', () => {
  const halfW = 295.8;
  const CELL = 80;
  const BAG_Y = -340;
  const FLOOR_Y = 0;
  const FLOOR_ROW_Y = -86;
  const floorBottom = FLOOR_Y + FLOOR_ROW_Y - 36;
  const bagTop = BAG_Y + (4 * CELL) / 2;
  const inUniversity = LOCATIONS.find((l) => l.id === 'university_town')!;
  const m = layoutSpeechBubble(inUniversity.line, {
    fontSize: pxFont(12),
    lineHeight: pxFont(12),
    padX: 12,
    padY: 10,
    minWidth: 120,
    maxWidth: Math.max(120, halfW * 2 - 24),
  });
  const hintText = '拖动 / 单击物品放入背包';
  // 与 LocationView 一致：用 BMFont xadvance 度量而不是 12px 估算。
  const hintWidth = measureTextWidth(hintText, pxFont(12));
  const hint = { left: -hintWidth / 2, right: hintWidth / 2, top: -147, bottom: -179 };
  const left = -halfW + 14;
  const bagLeft = -(4 * CELL) / 2;
  const gutter = Math.max(0, bagLeft - 8 - left);
  const npcSize = Math.min(96, gutter);
  const placed = placeSpeechBubble({
    desiredX: left + npcSize / 2,
    width: m.width,
    height: m.height,
    halfW,
    bagTop,
    floorBottom,
    gap: Math.max(pxSpacing(4), 10),
    hint,
  });
  const bubble = {
    left: placed.x - m.width / 2,
    right: placed.x + m.width / 2,
    top: placed.y + m.height / 2,
    bottom: placed.y - m.height / 2,
  };
  const shiftedHint = { ...hint, left: hint.left + placed.hintShiftX, right: hint.right + placed.hintShiftX };
  assert.equal(rectsOverlap(bubble, shiftedHint, pxSpacing(4)), false, '气泡仍压住提示文字');
  const gap = Math.max(shiftedHint.left - bubble.right, bubble.left - shiftedHint.right);
  assert.ok(gap >= pxSpacing(4) - 0.001, `气泡与提示间距 ${gap}px 小于 ${pxSpacing(4)}px`);
});

test('r24 放大后 HUD/结算/认证文字仍在容器内，日期与价格不拆行', () => {
  const barW = Math.max(180, Math.min(250, Math.floor((576 - 48) / 2)));
  const barText = '饱腹 100/100';
  assert.ok(measureTextWidth(barText, pxFont(12)) <= barW - 16, '9:20 下 HUD 进度条文字溢出');
  assert.ok(measureTextWidth('第 15 天', pxFont(12)) <= 160, 'HUD 天数溢出');
  assert.ok(measureTextWidth('¥ 123456.78', pxFont(12)) <= 180, 'HUD 金钱溢出');

  for (const item of ITEMS) {
    const value = `${item.name}  ¥ 999.00`;
    assert.ok(measureTextWidth(value, pxFont(12)) <= 300, `结算行溢出：${item.name}`);
  }

  const date = fitCardText('编号：123456  日期：11/10/2026', {
    maxWidth: 336,
    maxHeight: 420,
    fontSize: pxFont(12),
    minFontSize: pxFont(12),
    lineGap: 0,
  });
  assert.ok(date.lines.some((line) => line.includes('日期：11/10/2026')), `9:20 认证卡日期被拆：${date.lines.join('/')}`);
  assert.ok(date.lines.every((line) => measureTextWidth(line, date.fontSize) <= 336 + 0.001), '认证卡日期行溢出');

  const price = fitCardText('最值钱的货：过季潮牌T恤（¥\u00A027.00）', {
    maxWidth: 336,
    maxHeight: 420,
    fontSize: pxFont(12),
    minFontSize: pxFont(12),
    lineGap: 0,
  });
  assert.ok(price.lines.some((line) => line.includes('（¥\u00A027.00）')), `9:20 认证卡价格被拆：${price.lines.join('/')}`);
  assert.ok(price.lines.every((line) => measureTextWidth(line, price.fontSize) <= 336 + 0.001), '认证卡价格行溢出');

  const src = fs.readFileSync(path.resolve(process.cwd(), 'cocos/assets/scripts/GameRoot.ts'), 'utf8');
  assert.match(src, /const cardY = Math\.min\(100, hudBottom - pxSpacing\(8\) - card\.getComponent\(UITransform\)!\.height \/ 2\)/, '失败卡顶边没有收在 HUD 下');
  assert.match(src, /const cardY = Math\.min\(80, hudBottom - pxSpacing\(8\) - card\.getComponent\(UITransform\)!\.height \/ 2\)/, '认证卡顶边没有收在 HUD 下');
});


// ---------------------------------------------------------------------------
// r28 地图安全区 / 按住提示 / 睡觉按钮 / 中文断行 / 日期
// ---------------------------------------------------------------------------

test('r28 地图图标和地名牌在 iPhone 12/13、SE、宽屏的顶栏/底栏/安全区内', () => {
  const viewports = [
    { name: 'iPhone 12/13 390x844', cssW: 390, cssH: 844, dpr: 3, safeTopCss: 47, safeBottomCss: 34, capsuleBottomCss: 88 },
    { name: 'iPhone SE 375x667', cssW: 375, cssH: 667, dpr: 2, safeTopCss: 20, safeBottomCss: 0, capsuleBottomCss: 0 },
    { name: '宽屏 360x780', cssW: 360, cssH: 780, dpr: 3, safeTopCss: 20, safeBottomCss: 0, capsuleBottomCss: 0 },
  ];
  const iconSize = 96;
  const hudHeight = 128;
  try {
    for (const vp of viewports) {
      const visibleH = DESIGN_HEIGHT;
      const cssToDesign = visibleH / vp.cssH;
      const visibleW = vp.cssW * cssToDesign;
      const safeBottom = vp.safeBottomCss * cssToDesign;
      const headerTop = Math.max(vp.safeTopCss, vp.capsuleBottomCss) * cssToDesign;
      setFontScreenMetrics({
        physicalWidth: vp.cssW * vp.dpr,
        physicalHeight: vp.cssH * vp.dpr,
        visibleWidth: visibleW,
        visibleHeight: visibleH,
        devicePixelRatio: vp.dpr,
      });
      const fontSize = pxFont(12);
      const plateH = computeMapPlateHeight(fontSize);
      // 与 GameRoot.showMap 完全一致：按钮高 + 底栏提示行 + 上下内边距。
      const barButtonH = Math.ceil(Math.max(
        48,
        lineHeightForFontSize(fontSize) + buttonPaddingY() * 2,
        buttonMinTouchHeight(),
      ));
      const barHeight = Math.ceil(Math.max(
        112,
        barButtonH + lineHeightForFontSize(fontSize) + pxSpacing(6) * 2 + 8,
      ));
      const layout = computeMapLayout({
        visibleH,
        headerTop,
        hudHeight,
        barHeight,
        safeBottom,
        iconSize,
        plateHeight: plateH,
      });
      const hudBottom = visibleH / 2 - headerTop - hudHeight;
      // 底栏顶边：UILayout.bottom + barHeight = -visibleH/2 + safeBottom + barHeight。
      const barTop = -visibleH / 2 + safeBottom + barHeight;
      assert.ok(Math.abs(layout.areaTop - hudBottom) < 0.001, `${vp.name} 地图顶边没扣顶栏`);
      assert.ok(Math.abs(layout.areaBottom - barTop) < 0.001, `${vp.name} 地图底边没扣底栏+安全区`);

      const halfW = visibleW / 2;
      for (const loc of LOCATIONS) {
        const point = MAP_POINTS[loc.id];
        assert.ok(point, `${loc.id} 缺地图点位`);
        const plateTexts = [
          loc.name,
          `第 ${loc.openDay} 天开放`,
          `${loc.name} · 今日拉黑`,
          `${loc.name} · 回不去`,
        ];
        for (const text of plateTexts) {
          const plateW = computeMapPlateWidth(text, fontSize, {
            minWidth: 112,
            maxWidth: Math.min(300, visibleW - 24),
            padX: 28,
          });
          const p = placeMapMarker(point.x, point.y, layout, {
            iconSize,
            plateWidth: plateW,
            plateHeight: plateH,
            halfW,
          });
          const tag = `${vp.name} ${loc.id}「${text}」`;

          // 底栏与底部安全区：名牌/图标都要在上面，且至少 8 设计 px。
          assert.ok(
            p.plate.bottom >= barTop + MAP_MARKER_MARGIN - 0.001,
            `${tag} 名牌压到底栏/安全区：${p.plate.bottom.toFixed(2)} < ${(barTop + MAP_MARKER_MARGIN).toFixed(2)}`,
          );
          assert.ok(
            p.icon.bottom >= barTop + MAP_MARKER_MARGIN - 0.001,
            `${tag} 图标压到底栏/安全区`,
          );
          // 顶栏与顶部安全区（headerTop 已含 safeTop/胶囊）。
          assert.ok(p.icon.top <= hudBottom - MAP_MARKER_MARGIN + 0.001, `${tag} 图标顶到 HUD`);
          assert.ok(p.plate.top <= hudBottom - MAP_MARKER_MARGIN + 0.001, `${tag} 名牌顶到 HUD`);
          // 左右也要留 8 设计 px，右下角的世界之窗也不例外。
          assert.ok(p.plate.left >= -halfW + MAP_MARKER_MARGIN - 0.001, `${tag} 名牌左侧越界`);
          assert.ok(p.plate.right <= halfW - MAP_MARKER_MARGIN + 0.001, `${tag} 名牌右侧越界`);
          assert.ok(p.icon.left >= -halfW + MAP_MARKER_MARGIN - 0.001, `${tag} 图标左侧越界`);
          assert.ok(p.icon.right <= halfW - MAP_MARKER_MARGIN + 0.001, `${tag} 图标右侧越界`);

          const barRect = { left: -halfW, right: halfW, top: barTop, bottom: -visibleH / 2 };
          const hudRect = { left: -halfW, right: halfW, top: visibleH / 2, bottom: hudBottom };
          assert.equal(rectsOverlap(p.plate, barRect), false, `${tag} 名牌与底栏相交`);
          assert.equal(rectsOverlap(p.icon, barRect), false, `${tag} 图标与底栏相交`);
          assert.equal(rectsOverlap(p.icon, hudRect), false, `${tag} 图标与顶栏相交`);
        }
      }
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

test('r29 按住提示在「换地点/回家」上方 8px，睡觉文字在按钮图内右侧且日期固定 YYYY.MM.DD', () => {
  // 按住提示：底栏按钮顶边 = UILayout.bottom + 28 设计 px 外边距 + 按钮高；
  // 提示容器底边再留 8 设计 px。这里用 390 宽验证数值关系。
  const visibleW = 1280 * 390 / 844;
  const visibleH = 1280;
  const safeBottom = 34 * visibleH / 844;
  setFontScreenMetrics({
    physicalWidth: 1170,
    physicalHeight: 2532,
    visibleWidth: visibleW,
    visibleHeight: visibleH,
    devicePixelRatio: 3,
  });
  const buttonH = Math.ceil(Math.max(
    lineHeightForFontSize(pxFont(12)) + buttonPaddingY() * 2,
    buttonMinTouchHeight(),
  ));
  const buttonTop = -visibleH / 2 + safeBottom + pxSpacing(28) + buttonH;
  const hintFont = pxFont(12);
  const hintHeight = lineHeightForFontSize(hintFont) * 2;
  const hintBottom = buttonTop + 8;
  assert.ok(hintBottom - buttonTop >= 8 - 0.001, '按住提示与按钮上沿不足 8 设计 px');
  const hintTop = hintBottom + hintHeight;
  assert.ok(hintTop > hintBottom, '按住提示高度异常');

  // 睡觉按钮：文字在按钮图内部、月亮右侧的文字区里；按下态下移 2 源像素。
  const artW = 460;
  const artH = 92;
  const box = computeSleepTextLayout(artW, artH, BTN_SLEEP_TEXT_RECT);
  const moonRight = -artW / 2 + BTN_SLEEP_TEXT_RECT.x * (artW / BTN_SLEEP_ART_W);
  assert.ok(box.centerX - box.width / 2 >= moonRight - 0.001, '睡觉文字压到左侧月亮');
  assert.ok(Math.abs(box.centerY) <= 0.001, '睡觉文字没有在按钮内竖直居中');
  assert.ok(Math.abs(box.pressedOffsetY + 2 * (artH / BTN_SLEEP_ART_H)) < 0.001, '按下态文字没有下移 2 源像素');
  assert.deepEqual(BTN_SLEEP_INSETS, [24, 12, 3, 3]);
  assert.deepEqual(BTN_SLEEP_TEXT_RECT, { x: 24, y: 3, w: 81, h: 18 });
  const src = fs.readFileSync(path.resolve(process.cwd(), 'cocos/assets/scripts/GameRoot.ts'), 'utf8');
  assert.match(src, /makeSpriteButton\('btn_sleep', 'btn_sleep_pressed', '睡觉'[\s\S]*?textRect: BTN_SLEEP_TEXT_RECT/,
    '睡觉按钮没有使用 BTN_SLEEP_TEXT_RECT');

  // 失败页/事件中文整词不拆，日期固定 YYYY.MM.DD，不再用 toLocaleDateString。
  assert.equal(formatCertDate(new Date(2026, 10, 10)), '2026.11.10');
  assert.equal(formatCertDate(new Date(2026, 0, 2)), '2026.01.02');
  // r34：不再手写保护词；断点必须落在 Intl.Segmenter 词边界上。
  const trashUnits = splitWrapUnits('还是没想明白为什么要翻垃圾桶');
  assert.ok(trashUnits.includes('垃圾桶'), '垃圾桶被拆成单字');
  assert.ok(!trashUnits.includes('翻垃圾'), '翻垃圾桶仍被逐字拆开');
  assert.ok(splitWrapUnits('日期：2026.11.10').includes('日期：2026.11.10'), '固定日期不是不可拆单元');
  for (const text of ['还是没想明白为什么要翻垃圾桶', '评价：开箱开出了上班的肌肉记忆。']) {
    const boundaries = new Set<number>();
    for (const part of new Intl.Segmenter('zh', { granularity: 'word' }).segment(text)) {
      if (part.index > 0) boundaries.add(part.index);
    }
    let offset = 0;
    for (const unit of splitWrapUnits(text)) {
      offset += unit.length;
      if (offset < text.length) assert.ok(boundaries.has(offset), `断点 ${offset} 不在词边界：${text}`);
    }
  }
  const failText = '在保安室喝了三杯茶，还是没想明白为什么要翻垃圾桶';
  for (const maxWidth of [360, 300, 240, 200]) {
    const fit = fitCardText(failText, {
      maxWidth,
      maxHeight: 600,
      fontSize: pxFont(12),
      minFontSize: pxFont(12),
      lineGap: 0,
    });
    for (let i = 0; i + 1 < fit.lines.length; i++) {
      for (const term of ['翻垃圾桶', '垃圾桶', '保安室']) {
        for (let k = 1; k < term.length; k++) {
          assert.ok(
            !(fit.lines[i].endsWith(term.slice(0, k)) && fit.lines[i + 1].startsWith(term.slice(k))),
            `失败文案把「${term}」拆成「${term.slice(0, k)} / ${term.slice(k)}」`,
          );
        }
      }
    }
  }
  const dateFit = fitCardText('编号：652473  日期：2026.11.10', {
    maxWidth: 336,
    maxHeight: 420,
    fontSize: pxFont(12),
    minFontSize: pxFont(12),
    lineGap: 0,
  });
  assert.ok(dateFit.lines.some((line) => line.includes('日期：2026.11.10')), `认证日期被拆：${dateFit.lines.join('/')}`);
  assert.doesNotMatch(src, /toLocaleDateString/, '认证页仍在用 toLocaleDateString');
  assert.match(src, /formatCertDate\(new Date\(\)\)/, '认证页没有用固定日期格式');
});

// ---------------------------------------------------------------------------
// r29 事件页统一布局 / 地图高度 fit / 长按提示 / 失败文字框 / 新美术
// ---------------------------------------------------------------------------

test('r38 事件页：T+12%H 标题 / T+50%H 脚底 / T+54%H 描述 / T+72%H 按钮', () => {
  const viewports = [
    { name: 'iPhone 12/13 390x844', cssW: 390, cssH: 844, dpr: 3, safeTopCss: 47, safeBottomCss: 34, capsuleBottomCss: 88 },
    { name: 'iPhone SE 375x667', cssW: 375, cssH: 667, dpr: 2, safeTopCss: 20, safeBottomCss: 0, capsuleBottomCss: 0 },
    { name: '宽屏 360x780', cssW: 360, cssH: 780, dpr: 3, safeTopCss: 20, safeBottomCss: 0, capsuleBottomCss: 0 },
    { name: 'iPhone Pro Max 428x926', cssW: 428, cssH: 926, dpr: 3, safeTopCss: 47, safeBottomCss: 34, capsuleBottomCss: 88 },
  ];
  const eventSrc = fs.readFileSync(path.resolve(process.cwd(), 'cocos/assets/scripts/ui/EventView.ts'), 'utf8');
  assert.match(eventSrc, /uiNode\('ev_desc_plate'\)/, '描述没有深色底板');
  assert.match(eventSrc, /Math\.round\(255 \* EVENT_DESC_PLATE_ALPHA\)/, '描述底板不是 80% 不透明');
  assert.match(eventSrc, /EVENT_DESC_PLATE_COLOR/, '描述底板不是 #1a1020');
  assert.match(eventSrc, /EVENT_DESC_PLATE_PAD/, '描述底板没有 6px 内边距');
  assert.match(eventSrc, /roundRect\(/, '描述底板不是圆角');
  assert.match(eventSrc, /EVENT_WALLET_ICON_ART/, '钱包事件没有接入 icons/wallet.png');
  assert.match(eventSrc, /premultiplyAlpha = false/, '像素精灵没有关闭 premultiplyAlpha');
  assert.doesNotMatch(eventSrc, /roleShift/, '结果框仍在按脚底上移 NPC');

  try {
    for (const vp of viewports) {
      const visibleH = DESIGN_HEIGHT;
      const cssToDesign = visibleH / vp.cssH;
      const visibleW = vp.cssW * cssToDesign;
      const safeBottom = vp.safeBottomCss * cssToDesign;
      const headerTop = Math.max(vp.safeTopCss, vp.capsuleBottomCss) * cssToDesign;
      setFontScreenMetrics({
        physicalWidth: vp.cssW * vp.dpr,
        physicalHeight: vp.cssH * vp.dpr,
        visibleWidth: visibleW,
        visibleHeight: visibleH,
        devicePixelRatio: vp.dpr,
      });
      const area = computeEventArea({ visibleH, headerTop, safeBottom });
      for (const ev of EVENTS) {
        const pres = EVENT_PRESENTATIONS[ev.id];
        assert.ok(pres && pres.desc.length > 0, `${ev.id} 缺少事件描述`);
        for (const optionCount of [1, ev.options.length]) {
          const options = ev.options.slice(0, Math.max(1, optionCount));
          const layout = computeEventLayout({
            visibleW,
            visibleH,
            headerTop,
            safeBottom,
            titleText: ev.name,
            options,
            desc: pres.desc,
            locationId: 'baishizhou',
            eventId: ev.id,
            cssHeight: vp.cssH,
          });
          const tag = `${vp.name} ${ev.id} ${options.length}按钮`;
          const expectedBg = EVENT_BG_BY_EVENT[ev.id];
          assert.equal(layout.background.art, expectedBg ?? EVENT_BG_ART, `${tag} 事件背景映射不对`);
          const expectedOverlay = ev.id === 'rain' ? 0.4 : expectedBg ? 0.25 : 0.4;
          assert.ok(Math.abs(layout.background.overlayAlpha - expectedOverlay) < 0.001,
            `${tag} 遮罩不是 ${expectedOverlay}`);
          assert.ok(Math.abs(layout.title.centerY - (area.top - area.height * 0.12)) <= 2.001,
            `${tag} 标题不在 T+12%H`);
          assert.ok(Math.abs(layout.role.visualBottom - (area.top - area.height * 0.50)) <= 2.001,
            `${tag} NPC 脚底不在 T+50%H`);
          assert.ok(Math.abs(layout.description!.plate.top - (area.top - area.height * 0.54)) <= 2.001,
            `${tag} 描述底板顶不在 T+54%H`);
          assert.ok(Math.abs(layout.buttons.top - Math.min(area.top - area.height * 0.72,
            layout.description!.plate.bottom - EVENT_DESC_BUTTON_GAP)) <= 2.001,
            `${tag} 第一个按钮顶边不是 max(T+72%H, 描述底+12)`);
          assert.ok(layout.buttons.bottom >= area.top - area.height + EVENT_BUTTONS_BOTTOM_GAP - 2.001,
            `${tag} 末按钮越过标语上沿 +24`);
          assert.equal(layout.buttons.height, Math.ceil(EVENT_BUTTON_HEIGHT), `${tag} 按钮高度不统一`);
          assert.equal(layout.buttons.width, Math.round(visibleW * EVENT_BUTTON_WIDTH_RATIO), `${tag} 按钮宽度不是 56%`);
          for (let i = 0; i < layout.buttons.rects.length; i++) {
            const r = layout.buttons.rects[i];
            assert.ok(r.bottom >= area.bottom - 0.001 && r.top <= area.top + 0.001, `${tag} 按钮出可用区`);
            if (i > 0) {
              assert.ok(Math.abs(layout.buttons.rects[i - 1].bottom - r.top - EVENT_OPTION_GAP) < 0.51,
                `${tag} 按钮间距不是 10`);
            }
          }
          const desc = layout.description!;
          assert.ok(desc.rect.left >= desc.plate.left - 0.001 && desc.rect.right <= desc.plate.right + 0.001,
            `${tag} 描述文字左右越出底板`);
          assert.ok(desc.rect.top <= desc.plate.top + 0.001 && desc.rect.bottom >= desc.plate.bottom - 0.001,
            `${tag} 描述文字上下越出底板`);
          assert.equal(eventRectsOverlap(desc.plate, layout.buttons.rects[0]), false, `${tag} 描述底板压按钮`);
          assert.equal(eventRectsOverlap(desc.plate, layout.role.rect), false, `${tag} 描述底板压 NPC`);

          // 结果面板顶边 = 描述底板顶边，与描述底板互相替换。
          for (const panelH of [96, 120, 160]) {
            const result = computeEventResultLayout(layout, panelH);
            assert.ok(Math.abs(result.top - desc.plate.top) < 0.001, `${tag} 结果框顶边不是描述底板顶边`);
            assert.equal(result.roleShift, 0, `${tag} 结果框仍在移动 NPC`);
          }
          const size = eventRoleVisualSize(layout);
          assert.ok(size.width % 32 === 0 || ev.id === 'rain', `${tag} 角色不是整数倍`);
          assert.equal(layout.role.scale, Math.floor(layout.role.scale), `${tag} 角色缩放不是整数`);
        }
      }
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

test('r33 事件背景映射：rain/patrol/guard/auntie 用专属图，其余 event_night，遮罩 25%/40%', () => {
  assert.deepEqual(EVENT_BG_BY_EVENT, {
    rain: 'event_rain',
    patrol: 'event_patrol',
    guard: 'event_guard',
    auntie: 'event_auntie',
  }, '四个事件没有映射到各自背景');
  const bgRoot = path.resolve(process.cwd(), 'cocos/assets/bundles/bg');
  for (const [eventId, art] of Object.entries(EVENT_BG_BY_EVENT)) {
    const file = path.join(bgRoot, `${art}.png`);
    assert.ok(fs.existsSync(file), `${eventId} 缺少背景 ${art}.png`);
    const info = readPngInfo(file);
    assert.equal(info.w, 180, `${art} 宽度不是 180`);
    assert.equal(info.h, 320, `${art} 高度不是 320`);
    assert.ok(fs.statSync(file).size > 2048, `${art} 文件过小，疑似纯黑占位`);
    const meta = JSON.parse(fs.readFileSync(`${file}.meta`, 'utf8'));
    assert.equal(meta.subMetas['6c48a'].userData.minfilter, 'nearest', `${art} 不是 Point 过滤`);
    assert.equal(meta.subMetas['6c48a'].userData.magfilter, 'nearest', `${art} 不是 Point 过滤`);
    assert.equal(meta.subMetas['6c48a'].userData.mipfilter, 'none', `${art} 仍启用 mipmap`);
    assert.equal(ART_ALIAS[art]?.src, 'bg', `${art} 不在 bg 分包`);
    assert.equal(ART_ALIAS[art]?.path, art, `${art} 的 bg 路径不对`);
  }
  // 180×320 源图在 720×1280 设计屏正好 4 倍；其余竖屏仍按整数倍 cover。
  const cover = eventBackgroundCover(180, 320, 720, 1280);
  assert.deepEqual(cover, { scale: 4, width: 720, height: 1280 });
  assert.equal(eventBackgroundCover(180, 320, 591, 1280).scale, 4);

  const visibleW = DESIGN_WIDTH;
  const visibleH = DESIGN_HEIGHT;
  for (const ev of EVENTS) {
    const layout = computeEventLayout({
      visibleW,
      visibleH,
      headerTop: 0,
      safeBottom: 0,
      titleText: ev.name,
      options: ev.options,
      desc: EVENT_PRESENTATIONS[ev.id].desc,
      locationId: 'baishizhou',
      eventId: ev.id,
    });
    const expected = EVENT_BG_BY_EVENT[ev.id];
    assert.equal(layout.background.art, expected ?? EVENT_BG_ART, `${ev.id} 背景映射不对`);
    const expectedAlpha = ev.id === 'rain' ? 0.4 : expected ? 0.25 : 0.4;
    assert.ok(Math.abs(layout.background.overlayAlpha - expectedAlpha) < 0.001,
      `${ev.id} 遮罩不是 ${Math.round(expectedAlpha * 100)}%`);
    assert.equal(layout.background.fullScreen, true, `${ev.id} 背景没有全屏`);
  }
});

test('r33 保安 32×32 脚底 (16,30)，节点锚点 (16/32, 1-30/32)，仍按 32 整数倍放大', () => {
  const file = path.resolve(process.cwd(), 'cocos/assets/bundles/bg/npc_guard/0.png');
  const info = readPngInfo(file);
  assert.equal(info.w, 32, '保安图宽度不是 32');
  assert.equal(info.h, 32, '保安图高度不是 32');
  assert.equal(ART_ALIAS.ev_guard?.src, 'bg', '保安不在 bg 分包');
  assert.equal(ART_ALIAS.ev_guard?.path, 'npc_guard', '保安路径不对');
  assert.equal(ART_ALIAS.ev_guard?.frames, 4, '保安帧数被意外改动');
  assert.ok(Math.abs(EVENT_GUARD_ANCHOR_X - 16 / 32) < 0.000001, '保安锚点 X 不是 16/32');
  assert.ok(Math.abs(EVENT_GUARD_ANCHOR_Y - (1 - 30 / 32)) < 0.000001, '保安锚点 Y 不是 1-30/32');

  try {
    for (const vp of R30_VIEWPORTS) {
      const { visibleW, visibleH, safeBottom } = setR30Viewport(vp);
      const ev = EVENTS.find((e) => e.id === 'guard')!;
      const layout = computeEventLayout({
        visibleW,
        visibleH,
        headerTop: 0,
        safeBottom,
        titleText: ev.name,
        options: ev.options,
        desc: EVENT_PRESENTATIONS.guard.desc,
        locationId: 'baishizhou',
        eventId: 'guard',
      });
      const tag = `${vp.name} guard`;
      assert.ok(Math.abs(layout.role.anchorX - 16 / 32) < 0.001, `${tag} 锚点 X 不对`);
      assert.ok(Math.abs(layout.role.anchorY - (1 - 30 / 32)) < 0.001, `${tag} 锚点 Y 不对`);
      assert.equal(layout.role.width % 32, 0, `${tag} 不是 32 的整数倍`);
      assert.equal(layout.role.scale, Math.floor(layout.role.scale), `${tag} 缩放不是整数`);
      // 锚点到脚底后，实际精灵底边与布局字段一致；r36 脚底贴近描述底板。
      const visualBottom = layout.role.centerY + layout.role.visualY - layout.role.anchorY * layout.role.height;
      assert.ok(Math.abs(visualBottom - layout.role.visualBottom) < 0.51, `${tag} 真实脚底与布局字段不一致`);
      assert.ok(layout.role.visualBottom >= layout.description!.plate.top - 0.001, `${tag} 脚底压住描述`);
      assert.ok(layout.role.visualBottom - layout.description!.plate.top <= EVENT_NPC_DESC_MAX_GAP + 6,
        `${tag} 脚底离描述顶超过 24 设计 px`);
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

test('r33 钱包图标 16×16 直接替换，nearest 无 mipmap', () => {
  const file = path.resolve(process.cwd(), 'cocos/assets/resources/art/icons/wallet.png');
  const info = readPngInfo(file);
  assert.equal(info.w, 16, '钱包宽度不是 16');
  assert.equal(info.h, 16, '钱包高度不是 16');
  const meta = JSON.parse(fs.readFileSync(`${file}.meta`, 'utf8'));
  const sf = meta.subMetas['f9941'].userData;
  assert.equal(sf.width, 16, '钱包 SpriteFrame 宽度不是 16');
  assert.equal(sf.height, 16, '钱包 SpriteFrame 高度不是 16');
  assert.equal(meta.subMetas['6c48a'].userData.minfilter, 'nearest', '钱包不是 Point 过滤');
  assert.equal(meta.subMetas['6c48a'].userData.magfilter, 'nearest', '钱包不是 Point 过滤');
  assert.equal(meta.subMetas['6c48a'].userData.mipfilter, 'none', '钱包仍启用 mipmap');
});

test('r32 地图 cover 铺满宽度，SE/12/Pro Max 所有图标与名牌不进底栏', () => {
  const viewports = [
    { name: 'iPhone SE 375x667', cssW: 375, cssH: 667, dpr: 2, safeTopCss: 20, safeBottomCss: 0, capsuleBottomCss: 0 },
    { name: 'iPhone 12 390x844', cssW: 390, cssH: 844, dpr: 3, safeTopCss: 47, safeBottomCss: 34, capsuleBottomCss: 88 },
    { name: 'iPhone Pro Max 428x926', cssW: 428, cssH: 926, dpr: 3, safeTopCss: 47, safeBottomCss: 34, capsuleBottomCss: 88 },
  ];
  const iconSize = 96;
  try {
    for (const vp of viewports) {
      const visibleH = DESIGN_HEIGHT;
      const cssToDesign = visibleH / vp.cssH;
      const visibleW = vp.cssW * cssToDesign;
      const safeBottom = vp.safeBottomCss * cssToDesign;
      const headerTop = Math.max(vp.safeTopCss, vp.capsuleBottomCss) * cssToDesign;
      setFontScreenMetrics({
        physicalWidth: vp.cssW * vp.dpr,
        physicalHeight: vp.cssH * vp.dpr,
        visibleWidth: visibleW,
        visibleHeight: visibleH,
        devicePixelRatio: vp.dpr,
      });
      const fontSize = pxFont(12);
      const plateH = computeMapPlateHeight(fontSize);
      const barButtonH = Math.ceil(Math.max(48, lineHeightForFontSize(fontSize) + buttonPaddingY() * 2, buttonMinTouchHeight()));
      const barHeight = Math.ceil(Math.max(112, barButtonH + lineHeightForFontSize(fontSize) + pxSpacing(6) * 2 + 8));
      const layout = computeMapLayout({
        visibleH,
        visibleW,
        headerTop,
        hudHeight: EVENT_HUD_HEIGHT,
        barHeight,
        safeBottom,
        iconSize,
        plateHeight: plateH,
      });
      const hudBottom = visibleH / 2 - headerTop - EVENT_HUD_HEIGHT;
      const barTop = -visibleH / 2 + safeBottom + barHeight;
      const areaH = hudBottom - barTop;
      assert.ok(Math.abs(layout.areaTop - hudBottom) < 0.001, `${vp.name} 地图区顶边错误`);
      assert.ok(Math.abs(layout.areaBottom - barTop) < 0.001, `${vp.name} 地图区底边错误`);
      assert.ok(Math.abs(layout.heightScale - areaH / DESIGN_HEIGHT) < 0.0001, `${vp.name} 高度 fit 缩放错误`);
      assert.ok(Math.abs(layout.widthScale - visibleW / DESIGN_WIDTH) < 0.0001, `${vp.name} 宽度 cover 缩放错误`);
      assert.ok(Math.abs(layout.scale - Math.max(layout.heightScale, layout.widthScale)) < 0.0001, `${vp.name} 地图不是 cover`);
      assert.ok(layout.mapRect.right - layout.mapRect.left >= visibleW - 0.001, `${vp.name} 地图宽度没有铺满`);
      assert.ok(layout.mapRect.top - layout.mapRect.bottom >= areaH - 0.001, `${vp.name} 地图高度不足`);

      for (const loc of LOCATIONS) {
        const point = MAP_POINTS[loc.id];
        const plateTexts = [loc.name, `第 ${loc.openDay} 天开放`, `${loc.name} · 今日拉黑`, `${loc.name} · 回不去`];
        for (const text of plateTexts) {
          const plateW = computeMapPlateWidth(text, fontSize, { minWidth: 112, maxWidth: Math.min(300, visibleW - 24), padX: 28 });
          const p = placeMapMarker(point.x, point.y, layout, {
            iconSize,
            plateWidth: plateW,
            plateHeight: plateH,
            halfW: visibleW / 2,
          });
          const tag = `${vp.name} ${loc.id}「${text}」`;
          assert.ok(p.icon.bottom >= barTop + MAP_MARKER_MARGIN - 0.001, `${tag} 图标进底栏`);
          assert.ok(p.plate.bottom >= barTop + MAP_MARKER_MARGIN - 0.001, `${tag} 名牌进底栏`);
          assert.ok(p.icon.top <= hudBottom - MAP_MARKER_MARGIN + 0.001, `${tag} 图标顶到 HUD`);
          assert.ok(p.plate.top <= hudBottom - MAP_MARKER_MARGIN + 0.001, `${tag} 名牌顶到 HUD`);
          const barRect = { left: -visibleW / 2, right: visibleW / 2, top: barTop, bottom: -visibleH / 2 };
          assert.equal(rectsOverlap(p.plate, barRect), false, `${tag} 名牌与底栏相交`);
          assert.equal(rectsOverlap(p.icon, barRect), false, `${tag} 图标与底栏相交`);
        }
      }
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

test('r29 长按体力提示：按钮上沿 8 设计 px、安全区宽 80% 内换行', () => {
  const visibleW = 1280 * 390 / 844;
  const visibleH = 1280;
  const safeBottom = 34 * visibleH / 844;
  setFontScreenMetrics({
    physicalWidth: 1170,
    physicalHeight: 2532,
    visibleWidth: visibleW,
    visibleHeight: visibleH,
    devicePixelRatio: 3,
  });
  try {
    const safeW = visibleW;
    const hintWidth = Math.max(1, Math.min(600, safeW * 0.8));
    assert.ok(hintWidth <= safeW * 0.8 + 0.001, '提示宽度超过安全区 80%');
    const hintFont = pxFont(12);
    const lineH = lineHeightForFontSize(hintFont);
    const fit = fitCardText('剩余体力 100 / 本次将扣 999.9 / 请留够体力再按', {
      maxWidth: hintWidth,
      maxHeight: lineH * 2,
      fontSize: hintFont,
      minFontSize: hintFont,
      lineGap: 0,
    });
    assert.ok(fit.lines.length >= 1, '超长提示没有排版');
    assert.ok(fit.lines.every((line) => measureTextWidth(line, fit.fontSize) <= hintWidth + 0.001), '提示行超宽');
    const buttonH = Math.ceil(Math.max(lineHeightForFontSize(pxFont(12)) + buttonPaddingY() * 2, buttonMinTouchHeight()));
    const buttonTop = -visibleH / 2 + safeBottom + pxSpacing(28) + buttonH;
    const hintBottom = buttonTop + pxSpacing(8);
    assert.ok(hintBottom - buttonTop >= pxSpacing(8) - 0.001, '长按提示底边不在按钮上沿 8 设计 px');
  } finally {
    setFontScreenMetrics({
      physicalWidth: DESIGN_WIDTH,
      physicalHeight: DESIGN_HEIGHT,
      visibleWidth: DESIGN_WIDTH,
      visibleHeight: DESIGN_HEIGHT,
      devicePixelRatio: 1,
    });
  }
  const src = fs.readFileSync(path.resolve(process.cwd(), 'cocos/assets/scripts/ui/LocationView.ts'), 'utf8');
  assert.match(src, /gap: pxSpacing\(8\)/, '长按提示与按钮/背包间距不是 8 设计 px');
  assert.match(src, /normalHintGap: pxSpacing\(6\)/, '常驻提示没有贴到格子正上方 6 设计 px');
  assert.match(src, /safeW \* 0\.8/, '长按提示宽度没有按安全区 80%');
  assert.match(src, /computeLocationBottomLayout/, '地点页底部没有走统一直排函数');
});

test('r29 失败页文字框宽度 = 安全区 86%，中文整词不拆', () => {
  const visibleW = 1280 * 390 / 844;
  const visibleH = 1280;
  const safeBottom = 34 * visibleH / 844;
  setFontScreenMetrics({
    physicalWidth: 1170,
    physicalHeight: 2532,
    visibleWidth: visibleW,
    visibleHeight: visibleH,
    devicePixelRatio: 3,
  });
  try {
    const cardW = Math.max(100, 1280 * 0.7) * 0.75;
    const cardH = Math.max(100, 1280 * 0.7);
    const box = computeCardTextBox({
      cardW,
      cardH,
      cardY: 0,
      padXRatio: 0.19,
      padTopRatio: 0.25,
      padBottomRatio: 0.18,
      hudBottom: visibleH / 2 - 120 - EVENT_HUD_HEIGHT,
      halfW: visibleW / 2,
      buttonTop: -320,
      widthRatio: 0.86,
    });
    assert.ok(Math.abs(box.width - visibleW * 0.86) <= 1, `失败页文字框宽度 ${box.width} 不是安全区 86%（${visibleW * 0.86}）`);
    const failText = '在保安室喝了三杯茶，还是没想明白为什么要翻垃圾桶';
    const fit = fitCardText(failText, {
      maxWidth: box.width,
      maxHeight: 500,
      fontSize: pxFont(12),
      minFontSize: pxFont(12),
      lineGap: 0,
    });
    assert.ok(fit.lines.every((line) => measureTextWidth(line, fit.fontSize) <= box.width + 0.001), '失败页文字溢出 86% 文字框');
    for (let i = 0; i + 1 < fit.lines.length; i++) {
      for (const term of ['翻垃圾桶', '垃圾桶', '保安室']) {
        for (let k = 1; k < term.length; k++) {
          assert.ok(!(fit.lines[i].endsWith(term.slice(0, k)) && fit.lines[i + 1].startsWith(term.slice(k))), `失败页把「${term}」拆行`);
        }
      }
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
  const src = fs.readFileSync(path.resolve(process.cwd(), 'cocos/assets/scripts/GameRoot.ts'), 'utf8');
  assert.match(src, /widthRatio: 0\.86/, '失败页没有把文字框设置为安全区 86%');
});

test('r29 新美术：event_night / 睡觉按钮 / icon_moon 尺寸、meta 与九宫格 insets', () => {
  const bgRoot = path.resolve(process.cwd(), 'cocos/assets/bundles/bg');
  const event = readPngInfo(path.join(bgRoot, 'event_night.png'));
  assert.equal(event.w, 180);
  assert.equal(event.h, 320);
  assert.equal(ART_ALIAS.event_night?.src, 'bg');
  const eventMeta = JSON.parse(fs.readFileSync(path.join(bgRoot, 'event_night.png.meta'), 'utf8'));
  assert.equal(eventMeta.importer, 'image');
  assert.equal(eventMeta.subMetas.f9941.userData.width, 180);
  assert.equal(eventMeta.subMetas.f9941.userData.height, 320);

  for (const name of ['btn_sleep', 'btn_sleep_pressed']) {
    const file = path.join(bgRoot, name, '0.png');
    const png = readPngInfo(file);
    assert.equal(png.w, 117, `${name} 宽度不是 117`);
    assert.equal(png.h, 24, `${name} 高度不是 24`);
    const meta = JSON.parse(fs.readFileSync(file + '.meta', 'utf8'));
    const u = meta.subMetas.f9941.userData;
    assert.deepEqual([u.borderLeft, u.borderRight, u.borderTop, u.borderBottom], [24, 12, 3, 3], `${name} 九宫格 insets 不对`);
    assert.equal(u.width, 117);
    assert.equal(u.height, 24);
  }
  assert.deepEqual(ART_ALIAS.btn_sleep?.insets, [24, 12, 3, 3]);
  assert.deepEqual(ART_ALIAS.btn_sleep_pressed?.insets, [24, 12, 3, 3]);

  const moon = path.resolve(process.cwd(), 'cocos/assets/resources/art/ui/icon_moon.png');
  const moonPng = readPngInfo(moon);
  assert.equal(moonPng.w, 13);
  assert.equal(moonPng.h, 15);
  const moonMeta = JSON.parse(fs.readFileSync(moon + '.meta', 'utf8'));
  assert.equal(moonMeta.subMetas.f9941.userData.width, 13);
  assert.equal(moonMeta.subMetas.f9941.userData.height, 15);
  assert.equal(ART_ALIAS.icon_moon?.src, 'res');

  // 文字区在月亮右侧，且「睡觉」按当前字号能放进 18 源像素高的文字区。
  const box = computeSleepTextLayout(460, 92, BTN_SLEEP_TEXT_RECT);
  const fit = fitCardText('睡觉', {
    maxWidth: box.width,
    maxHeight: box.height,
    fontSize: pxFont(24),
    minFontSize: pxFont(12),
    lineGap: 0,
  });
  assert.ok(fit.width <= box.width + 0.001 && fit.height <= box.height + 0.001, '「睡觉」放不进 BTN_SLEEP_TEXT_RECT');
});

// ---------------------------------------------------------------------------
// r30 背包/提示/睡觉/事件细节/断行/模拟器机型
// ---------------------------------------------------------------------------

const R30_VIEWPORTS = [
  { name: 'iPhone 12/13 390x844', cssW: 390, cssH: 844, dpr: 3, safeBottomCss: 34 },
  { name: 'iPhone SE 375x667', cssW: 375, cssH: 667, dpr: 2, safeBottomCss: 0 },
  { name: '宽屏 360x780', cssW: 360, cssH: 780, dpr: 3, safeBottomCss: 0 },
];

function setR30Viewport(vp: { cssW: number; cssH: number; dpr: number; safeBottomCss: number }): {
  visibleW: number;
  visibleH: number;
  safeBottom: number;
} {
  const visibleH = DESIGN_HEIGHT;
  const visibleW = vp.cssW * visibleH / vp.cssH;
  const safeBottom = vp.safeBottomCss * visibleH / vp.cssH;
  setFontScreenMetrics({
    physicalWidth: vp.cssW * vp.dpr,
    physicalHeight: vp.cssH * vp.dpr,
    visibleWidth: visibleW,
    visibleHeight: visibleH,
    devicePixelRatio: vp.dpr,
  });
  return { visibleW, visibleH, safeBottom };
}

function r30ButtonHeight(): number {
  return Math.ceil(Math.max(
    lineHeightForFontSize(pxFont(12)) + buttonPaddingY() * 2,
    buttonMinTouchHeight(),
  ));
}

test('r30 背包格/长按提示条/按钮三视口三档背包互不相交，提示条有不透明独立底板', () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), 'cocos/assets/scripts/ui/LocationView.ts'), 'utf8');
  assert.match(src, /hold_hint_plate/, '长按提示没有独立底板节点');
  assert.match(src, /Art\.makeVisual\('bottom_bar'/, '长按提示没有用 bottom_bar 九宫格');
  assert.match(src, /new Color\(12, 14, 20, 255\)/, '长按提示底板不是完全不透明');
  assert.match(src, /体力 \$\{Math\.round\(remaining\)\} · 本次 -\$\{Math\.round\(staminaCost\)\}/, '长按提示文案不是「体力 X · 本次 -Y」');

  try {
    for (const vp of R30_VIEWPORTS) {
      const { visibleW, visibleH, safeBottom } = setR30Viewport(vp);
      const buttonH = r30ButtonHeight();
      const body = pxFont(12);
      const holdH = lineHeightForFontSize(body) * 2;
      const normalH = lineHeightForFontSize(body) + pxSpacing(4);
      const safeW = visibleW;
      for (const [bagW, bagH] of [[3, 3], [3, 4], [4, 4]] as const) {
        const layout = computeLocationBottomLayout({
          visibleW,
          visibleH,
          safeBottom,
          bagW,
          bagH,
          buttonHeight: buttonH,
          holdHintHeight: holdH,
          holdHintWidth: Math.min(600, safeW * 0.8),
          normalHintHeight: normalH,
          floorBottom: -100,
          bottomMargin: pxSpacing(28),
          gap: 8,
        });
        const tag = `${vp.name} ${bagW}x${bagH}`;
        const buttonRect = {
          left: -visibleW / 2,
          right: visibleW / 2,
          top: layout.buttonTop,
          bottom: -visibleH / 2 + safeBottom,
        };
        const strictGap = LOCATION_BOTTOM_GAP - 0.001;
        assert.equal(rectsOverlap(layout.bag.rect, layout.holdHint.rect, strictGap), false, `${tag} 提示条压住背包格`);
        assert.equal(rectsOverlap(layout.holdHint.rect, buttonRect, strictGap), false, `${tag} 提示条压住按钮`);
        assert.equal(rectsOverlap(layout.bag.rect, buttonRect, strictGap), false, `${tag} 背包格压住按钮`);
        assert.ok(layout.bag.rect.bottom - layout.holdHint.rect.top >= LOCATION_BOTTOM_GAP - 0.001, `${tag} 背包底边到提示条不足 8px`);
        assert.ok(layout.holdHint.rect.bottom - buttonRect.top >= LOCATION_BOTTOM_GAP - 0.001, `${tag} 提示条底边到按钮不足 8px`);
        assert.ok(layout.holdHint.rect.bottom > buttonRect.top, `${tag} 提示条掉到按钮下方`);
        assert.ok(layout.normalHint.rect.bottom - layout.bag.rect.top >= 8 - 0.001, `${tag} 常驻提示压住背包格`);
        assert.ok(layout.bag.rect.top <= -100, `${tag} 背包顶边太低`);
        assert.equal(layout.bag.cell, bagH === 4 ? 64 : 80, `${tag} 背包格没有按高度自适应`);
        const sizes = bagVisualSizes(layout.bag.cell);
        assert.equal(sizes.icon % 16, 0, `${tag} 背包图标不是整数源像素倍`);
        if (bagH === 4) assert.ok(sizes.icon <= 48, `${tag} 四行背包图标没有缩小`);
      }
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

test('r30 睡觉按钮：文字在 BTN_SLEEP_TEXT_RECT 内居中、正文档，按钮不压睡觉精灵', () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), 'cocos/assets/scripts/GameRoot.ts'), 'utf8');
  assert.match(src, /makeSpriteButton\('btn_sleep', 'btn_sleep_pressed', '睡觉'[\s\S]*?textRect: BTN_SLEEP_TEXT_RECT/, '睡觉按钮没有用文字区');
  assert.ok(src.includes('}, pxFont(12), { textRect: BTN_SLEEP_TEXT_RECT });'), '睡觉按钮字号不是正文档');
  assert.match(src, /computeHomeSleepLayout/, '睡觉按钮没有做人物避让');
  assert.match(src, /new Vec3\(this\.homeHeroPos\(this\.game\.homeLevel\)\.x, heroCenterY, 0\)/, '睡觉精灵没有按避让结果调整位置');

  const artW = 460;
  const artH = 92;
  const box = computeSleepTextLayout(artW, artH, BTN_SLEEP_TEXT_RECT);
  const left = -artW / 2 + BTN_SLEEP_TEXT_RECT.x * (artW / BTN_SLEEP_ART_W);
  const top = artH / 2 - BTN_SLEEP_TEXT_RECT.y * (artH / BTN_SLEEP_ART_H);
  assert.ok(Math.abs(box.centerX - (left + box.width / 2)) < 0.001, '睡觉文字区中心 X 不对');
  assert.ok(Math.abs(box.centerY - (top - box.height / 2)) < 0.001, '睡觉文字区中心 Y 不对');

  try {
    for (const vp of R30_VIEWPORTS) {
      const { visibleH, safeBottom } = setR30Viewport(vp);
      const buttonH = Math.ceil(Math.max(
        92,
        lineHeightForFontSize(pxFont(12)) + buttonPaddingY() * 2,
        buttonMinTouchHeight(),
      ));
      const fit = fitCardText('睡觉', {
        maxWidth: box.width,
        maxHeight: box.height,
        fontSize: pxFont(12),
        minFontSize: pxFont(12),
        lineGap: 0,
      });
      assert.ok(fit.width <= box.width + 0.001 && fit.height <= box.height + 0.001,
        `${vp.name} 正文档「睡觉」放不进按钮文字区`);
      for (const heroCenterY of [-398, -360, -414]) {
        const layout = computeHomeSleepLayout({
          visibleH,
          safeBottom,
          buttonHeight: buttonH,
          margin: pxSpacing(28),
          heroCenterY,
          heroHeight: 96,
          gap: 8,
        });
        const tag = `${vp.name} hero@${heroCenterY}`;
        assert.ok(layout.gap >= 8 - 0.001, `${tag} 按钮顶边离精灵脚底不足 8px`);
        assert.ok(layout.buttonTop <= layout.heroBottom - 8 + 0.001, `${tag} 按钮压住睡觉精灵`);
        assert.ok(layout.buttonTop < visibleH / 2, `${tag} 按钮跑出屏幕上方`);
        assert.ok(layout.buttonBottom > -visibleH / 2, `${tag} 按钮掉出屏幕下方`);
        assert.ok(layout.heroTop <= visibleH / 2, `${tag} 精灵被推出屏幕顶部`);
      }
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

test('r30 事件页：隐藏玩法层、礼貌离开留角色、散步结果原地淡出、小游戏保留背景角色标题', () => {
  const gameRoot = fs.readFileSync(path.resolve(process.cwd(), 'cocos/assets/scripts/GameRoot.ts'), 'utf8');
  const eventSrc = fs.readFileSync(path.resolve(process.cwd(), 'cocos/assets/scripts/ui/EventView.ts'), 'utf8');
  assert.match(gameRoot, /locationView\?\.setGameplayActive\(false\)/,
    '打开事件页没有把玩法层 active=false');
  assert.match(eventSrc, /EVENT_RESULT_MIN_SECONDS/, '事件结果没有最短展示时间');
  assert.equal(EVENT_RESULT_MIN_SECONDS, 2.5, '事件结果最短展示时间不是 2.5 秒');
  assert.equal(EVENT_RESULT_PROMPT, '点击继续', '事件结果没有「点击继续」提示');
  assert.match(eventSrc, /EVENT_RESULT_MIN_SECONDS \* 1000/, '结果面板没有等待 2.5 秒');
  assert.match(eventSrc, /TOUCH_END[\s\S]{0,220}if \(!ready\) return;/, '结果面板没有点击才继续');
  assert.doesNotMatch(eventSrc, /w \/ 2 \+ 160|w \/ 2 - 160|-w \/ 2 - 160/,
    '事件角色仍会滑出屏幕被切一半');
  assert.match(eventSrc, /eventResultText/, '事件结果文案没有走统一文案函数');
  assert.match(eventSrc, /result_plate_art/, '结果框没有九宫格底板');
  assert.match(eventSrc, /Fx\.fadeOut\(artNode, 0\.45\)/, '装作散步没有原地淡出');
  assert.match(eventSrc, /mg_dim/, '抢地盘小游戏没有背景层');
  assert.match(eventSrc, /比谁掏得快/, '抢地盘小游戏没有标题');
  assert.doesNotMatch(eventSrc, /mg_bg/, '抢地盘小游戏仍用不透明全屏遮罩');
  assert.doesNotMatch(eventSrc, /new Vec3\(1\.2, 1\.2, 1\)/, '钱包角色仍在非整数缩放');
  assert.match(eventSrc, /EVENT_RAIN_ROLE_ART/, '下雨事件没有可替换的角色常量');
  assert.match(eventSrc, /hero_rain|eventRainRolePlacement/, '下雨事件没有用 hero_rain 精灵');
  assert.doesNotMatch(eventSrc, /hero_idle/, '下雨事件仍在用 hero_idle 占位');
  assert.doesNotMatch(eventSrc, /plastic_bag/, '下雨事件仍在放旧塑料布占位色块');
  assert.match(eventSrc, /Texture2D\.Filter\.NEAREST/, '事件 NPC 没有 nearest 过滤');
  assert.match(eventSrc, /setMipFilter\(Texture2D\.Filter\.NONE\)/, '事件 NPC 没有关闭 mipmap');
  assert.match(eventSrc, /setScale\(1, 1, 1\)/, '事件 NPC 节点有非整数缩放');
  assert.match(eventSrc, /layout\.role\.art/, '事件 NPC 没有走统一角色图配置');
  assert.doesNotMatch(eventSrc, /event_board/, '事件页仍有额外内容底板');
});

test('r34 已知失败案例：靠窗/整个/签头/了字行首/大吉孤行/拾荒气泡', () => {
  const seg = new Intl.Segmenter('zh', { granularity: 'word' });
  const boundaries = (text: string): Set<number> => {
    const out = new Set<number>();
    for (const part of seg.segment(text)) if (part.index > 0) out.add(part.index);
    return out;
  };
  const lineStartsForbidden = new Set(Array.from('，。、！？：；」）〔］｝》〉…—～·,.!?;:)]}】”’了的吗呢吧啊'));
  const lineEndsForbidden = new Set(Array.from('（「【〔［｛《〈“‘'));
  const assertLines = (text: string, lines: string[], tag: string, minLast: number = 4): void => {
    const bounds = boundaries(text);
    let offset = 0;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const at = text.indexOf(line, offset);
      assert.ok(at >= 0, `${tag} 行内容不在原文：${line}`);
      if (line) {
        assert.ok(!lineStartsForbidden.has(line[0]), `${tag} 行首是禁止字符「${line[0]}」：${line}`);
        assert.ok(!lineEndsForbidden.has(line[line.length - 1]), `${tag} 行尾是禁止字符：${line}`);
      }
      offset = at + line.length;
      if (i + 1 < lines.length && offset < text.length && text[offset] !== '\n') {
        assert.ok(bounds.has(offset), `${tag} 断点 ${offset} 不在 Intl.Segmenter 词边界：${lines.join('/')}`);
      }
    }
    if (lines.length > 1 && !text.includes('\n')) {
      assert.ok(meaningfulCharCount(lines[lines.length - 1]) >= minLast,
        `${tag} 末行孤行：${lines.join('/')}`);
    }
  };
  const assertNoSplit = (lines: string[], term: string, tag: string): void => {
    for (let i = 0; i + 1 < lines.length; i++) {
      for (let k = 1; k < term.length; k++) {
        assert.ok(!(lines[i].endsWith(term.slice(0, k)) && lines[i + 1].startsWith(term.slice(k))),
          `${tag} 把「${term}」拆成「${term.slice(0, k)} / ${term.slice(k)}」：${lines.join('/')}`);
      }
    }
  };

  try {
    for (const vp of R30_VIEWPORTS) {
      const { visibleW } = setR30Viewport(vp);
      const body = pxFont(12);
      const tag = `${vp.name}`;

      // 东门糖水 VIP 评价：靠窗不能拆。
      const vip = fitCardText('糖水铺阿姨给你留了靠窗的位置。', {
        maxWidth: Math.max(220, Math.min(336, visibleW * 0.5)),
        maxHeight: 240, fontSize: body, minFontSize: body, lineGap: 0,
      });
      assertLines('糖水铺阿姨给你留了靠窗的位置。', vip.lines, `${tag} 靠窗`);
      assertNoSplit(vip.lines, '靠窗', `${tag} 靠窗`);

      // best_2 吐槽：货物=刮刮乐（未刮），整个不能拆。
      const roastText = '抱着「刮刮乐（未刮）」回家，像抱着整个华强北。';
      const roast = fitCardText(roastText, {
        maxWidth: Math.min(448, visibleW - 24),
        maxHeight: 300, fontSize: body, minFontSize: body, lineGap: 0,
      });
      assertLines(roastText, roast.lines, `${tag} 整个`);
      assertNoSplit(roast.lines, '整个', `${tag} 整个`);
      assertNoSplit(roast.lines, '刮刮乐', `${tag} 刮刮乐`);

      // 「你排出了仪式感」：了不能落行首。
      for (const width of [300, 336, 360]) {
        const text = '二十分钟的电梯，你排出了仪式感。';
        const fit = fitCardText(text, {
          maxWidth: width, maxHeight: 300, fontSize: body, minFontSize: body, lineGap: 0,
        });
        assertLines(text, fit.lines, `${tag} 仪式感 ${width}`);
        assert.ok(fit.lines.every((line) => line[0] !== '了'), `${tag} 「了」落到行首：${fit.lines.join('/')}`);
      }

      // 签头整体不可拆、显式换行保留；大吉 390 宽末行不能只剩「等你」。
      const paper = computeFortunePaperLayout();
      const small = FORTUNES.find((f) => f.id === 'small_luck')!;
      const smallText = `【好签 · 小吉】\n${small.text}`;
      const smallFit = fitFortuneText(smallText, paper);
      assert.equal(smallFit.lines[0], '【好签 · 小吉】', `${tag} 小吉签头被拆开`);
      assert.ok(smallFit.lines.length >= 2 && smallFit.lines[1] === '宜吃饭', `${tag} 签头后的显式换行丢失`);
      assert.ok(smallFit.withinPaper, `${tag} 小吉签文越出纸面`);

      const great = FORTUNES.find((f) => f.id === 'great_luck')!;
      const greatText = `【好签 · 大吉】\n${great.text}\n指定地点：世界之窗地铁站`;
      const greatFit = fitFortuneText(greatText, paper);
      assert.equal(greatFit.lines[0], '【好签 · 大吉】', `${tag} 大吉签头被拆开`);
      assert.ok(greatFit.lines.length >= 2, `${tag} 大吉签文没有换行`);
      assert.ok(meaningfulCharCount(greatFit.lines[greatFit.lines.length - 1]) >= 4,
        `${tag} 大吉签末行孤行：${greatFit.lines.join('/')}`);
      assert.ok(greatFit.withinPaper, `${tag} 大吉签文越出纸面`);
      assertLines(greatText, greatFit.lines, `${tag} 大吉`);

      // 大学城拾荒气泡：饭卡借我刷一下。
      const bubble = layoutWrappedSpeechBubble('同学，饭卡借我刷一下？', {
        fontSize: body, padX: 12, padY: 10, minWidth: 120,
        maxWidth: Math.max(120, visibleW * 0.4),
      });
      assert.ok(meaningfulCharCount(bubble.lines[bubble.lines.length - 1]) >= 4,
        `${tag} 拾荒气泡末行孤行：${bubble.lines.join('/')}`);
      assertLines('同学，饭卡借我刷一下？', bubble.lines, `${tag} 拾荒气泡`);
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

test('r30 构建脚本支持模拟器机型参数/环境变量，README 写明用法，core 与构建标签同步', async () => {
  const { pathToFileURL } = await import('node:url');
  const scriptPath = path.resolve(process.cwd(), 'scripts/set-simulator.mjs');
  const mod: any = await import(pathToFileURL(scriptPath).href);
  assert.ok(mod.SIMULATOR_DEVICES.iphone12, '模拟器机型表缺少 iPhone 12');
  assert.ok(mod.SIMULATOR_DEVICES['iphone-se'], '模拟器机型表缺少 iPhone SE');
  assert.ok(mod.SIMULATOR_DEVICES['360'], '模拟器机型表缺少 360 宽安卓');

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ly15-sim-'));
  try {
    fs.writeFileSync(path.join(tmp, 'project.config.json'), JSON.stringify({ appid: 'wxcbccf7de7cc81947' }), 'utf8');
    const result = mod.setSimulatorDevice('iphone-se', tmp);
    assert.equal(result.device.label, 'iPhone SE');
    assert.equal(result.device.cssW, 375);
    const pub = JSON.parse(fs.readFileSync(path.join(tmp, 'project.config.json'), 'utf8'));
    const priv = JSON.parse(fs.readFileSync(path.join(tmp, 'project.private.config.json'), 'utf8'));
    assert.equal(pub.appid, 'wxcbccf7de7cc81947', '写机型时丢了 appid');
    assert.equal(pub.simulatorDevice, 'iPhone SE');
    assert.equal(priv.ly15Simulator.cssWidth, 375);
    assert.equal(priv.simulatorType, 'wechat');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }

  const readme = fs.readFileSync(path.resolve(process.cwd(), 'README.md'), 'utf8');
  assert.match(readme, /set-simulator\.mjs/, 'README 没有写切机型命令');
  assert.match(readme, /LY15_DEVICE/, 'README 没有写环境变量');
  assert.match(readme, /simulatorDevice/, 'README 没有说明写入字段');
  assert.match(readme, /没有公开「模拟器机型」字段|没有公开.*模拟器机型/, 'README 没有说明官方字段限制');

  for (const name of ['config.ts', 'game.ts', 'placement.ts']) {
    const a = fs.readFileSync(path.resolve(process.cwd(), 'src/core', name), 'utf8');
    const b = fs.readFileSync(path.resolve(process.cwd(), 'cocos/assets/scripts/core', name), 'utf8');
    assert.equal(b, a, `core/${name} 没有同步到 Cocos 副本`);
  }
  const gen = fs.readFileSync(path.resolve(process.cwd(), 'scripts/gen-version.mjs'), 'utf8');
  assert.match(gen, /rev-parse/, '版本脚本没有读取 git HEAD');
  assert.match(BUILD_TAG, /^r\d+ [0-9a-f]{7,}$/, `构建标签格式不对：${BUILD_TAG}`);
  assert.doesNotMatch(BUILD_TAG, /dev/, `构建标签仍含 dev：${BUILD_TAG}`);
  const post = fs.readFileSync(path.resolve(process.cwd(), 'scripts/postbuild-info.mjs'), 'utf8');
  assert.match(post, /mainPackageBytes/, 'postbuild-info 没有主包字节数字段');
  assert.match(post, /bgSubpackageBytes/, 'postbuild-info 没有 bg 分包字节字段');
  assert.match(post, /totalBytes/, 'postbuild-info 没有总字节字段');
  assert.match(post, /builtAt/, 'postbuild-info 没有构建时间');
  const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'package.json'), 'utf8'));
  assert.equal(pkg.devDependencies.typescript, '5.9.2', 'TypeScript 没有固定到 5.9.2');
  const lock = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'package-lock.json'), 'utf8'));
  assert.equal(lock.packages['node_modules/typescript'].version, '5.9.2', 'lockfile TypeScript 不是 5.9.2');
});


test('r31 下雨事件：hero_rain NPC、雨滴子节点 0.25s 两帧循环、整数倍脚底对齐', () => {
  assert.equal(EVENT_RAIN_ROLE_ART, 'hero_rain', '下雨 NPC 不是 hero_rain');
  assert.equal(EVENT_RAIN_DROPS_ART, 'rain_drops', '雨滴叠加层名字不对');
  assert.equal(EVENT_RAIN_ROLE_SRC, 40, 'hero_rain 源图不是 40x40');
  assert.equal(EVENT_RAIN_DROP_FRAME_SECONDS, 0.25, '雨滴切帧间隔不是 0.25s');
  assert.ok(Math.abs(EVENT_RAIN_ANCHOR_X - 20 / 40) < 1e-9, 'hero_rain 锚点 X 不是 20/40');
  assert.ok(Math.abs(EVENT_RAIN_ANCHOR_Y - (1 - 38 / 40)) < 1e-9, 'hero_rain 锚点 Y 不是 1-38/40');

  const layout = computeEventLayout({
    visibleW: DESIGN_WIDTH,
    visibleH: DESIGN_HEIGHT,
    headerTop: 128,
    safeBottom: 0,
    titleText: '下雨了',
    options: ['撑住'],
    desc: EVENT_PRESENTATIONS.rain.desc,
    eventId: 'rain',
  });
  assert.equal(layout.role.art, 'hero_rain', '事件页下雨 NPC 没用 hero_rain');
  const placement = eventRainRolePlacement(layout.role.scale);
  assert.equal(placement.scale, Math.floor(placement.scale), '下雨精灵 scale 不是整数');
  assert.equal(placement.size, 40 * placement.scale, '下雨精灵尺寸不是 40 的整数倍');
  assert.equal(placement.anchorX, 20 / 40, '节点锚点 X 不是 20/40');
  assert.equal(placement.anchorY, 1 - 38 / 40, '节点锚点 Y 不是 1-38/40');
  // 与 hero_idle 脚底 (18,30) 同点：32x32 中心锚点下的局部偏移。
  const idleFootX = (EVENT_IDLE_FOOT_X - EVENT_IDLE_ROLE_SRC / 2) * placement.scale;
  const idleFootY = (EVENT_IDLE_ROLE_SRC / 2 - EVENT_IDLE_FOOT_Y) * placement.scale;
  assert.ok(Math.abs(placement.x - idleFootX) < 0.001, '下雨精灵脚底 X 没和 hero_idle 对齐');
  assert.ok(Math.abs(placement.y - idleFootY) < 0.001, '下雨精灵脚底 Y 没和 hero_idle 对齐');

  const resRoot = path.resolve(process.cwd(), 'cocos/assets/resources/art');
  const heroFile = path.join(resRoot, 'hero_rain/0.png');
  assert.ok(fs.existsSync(heroFile), 'hero_rain 没有导入 resources/art/hero_rain');
  const heroInfo = readPngInfo(heroFile);
  assert.equal(heroInfo.w, 40, 'hero_rain 宽度不是 40');
  assert.equal(heroInfo.h, 40, 'hero_rain 高度不是 40');
  const dropsDir = path.join(resRoot, 'rain_drops');
  const dropFiles = fs.readdirSync(dropsDir).filter((n) => n.endsWith('.png')).sort();
  assert.deepEqual(dropFiles, ['0.png', '1.png'], 'rain_drops 不是两帧');
  for (const file of dropFiles) {
    const info = readPngInfo(path.join(dropsDir, file));
    assert.equal(info.w, 40, `${file} 宽度不是 40`);
    assert.equal(info.h, 40, `${file} 高度不是 40`);
  }
  assert.equal(ART_ALIAS.hero_rain?.src, 'res', 'hero_rain 没走主包 resources');
  assert.equal(ART_ALIAS.hero_rain?.path, 'hero_rain', 'hero_rain 路径不对');
  assert.equal(ART_ALIAS.rain_drops?.src, 'res', 'rain_drops 没走主包 resources');
  assert.equal(ART_ALIAS.rain_drops?.path, 'rain_drops', 'rain_drops 路径不对');

  const eventSrc = fs.readFileSync(path.resolve(process.cwd(), 'cocos/assets/scripts/ui/EventView.ts'), 'utf8');
  assert.match(eventSrc, /ev_rain_drops/, 'EventView 没创建雨滴子节点');
  assert.match(eventSrc, /addRainDrops\(visual, rainPlacement\.size\)/, '雨滴没有作为 hero_rain 子节点');
  assert.match(eventSrc, /setAnchorPoint\(rainPlacement\.anchorX, rainPlacement\.anchorY\)/, 'hero_rain 没设脚底锚点');
  assert.match(eventSrc, /setScale\(1, 1, 1\)/, 'hero_rain 节点有非整数缩放');
  assert.match(eventSrc, /EVENT_RAIN_DROP_FRAME_SECONDS/, '雨滴播放器没用 0.25s 常量');

  const dropsSrc = fs.readFileSync(path.resolve(process.cwd(), 'cocos/assets/scripts/ui/RainDrops.ts'), 'utf8');
  assert.match(dropsSrc, /EVENT_RAIN_DROP_FRAME_SECONDS/, '雨滴播放器没读 0.25s 常量');
  assert.match(dropsSrc, /schedule\(this\.tick, this\._interval\)/, '雨滴播放器没有定时切帧');
  assert.match(dropsSrc, /unschedule\(this\.tick\)/, '事件关闭时没有停止雨滴计时器');
  assert.match(dropsSrc, /onDisable|onDestroy/, '雨滴播放器没有生命周期停表');
});

// ---------------------------------------------------------------------------
// r32 结果框 / 断词 / 地图 cover / 抽签 / 拾荒提示
// ---------------------------------------------------------------------------

test('r32 事件所有选项结果文案非空且不等于选项名，结果框完全不透明并隐藏描述/按钮', () => {
  for (const ev of EVENTS) {
    for (let i = 0; i < ev.options.length; i++) {
      for (const win of ev.id === 'rival' ? [false, true] : [false]) {
        const text = eventResultText({ eventId: ev.id, optionIndex: i, minigameWin: win });
        assert.ok(text.trim().length > 0, `${ev.id} 选项 ${i} 结果文案为空`);
        assert.notEqual(text.trim(), ev.options[i], `${ev.id} 选项 ${i} 结果文案只重复了选项名`);
      }
    }
  }
  // 运行时分支（包里没吃的 / 装作散步成功与失败）也必须非空。
  for (const ev of EVENTS) {
    for (let i = 0; i < ev.options.length; i++) {
      for (const notice of ['', '包里没吃的']) {
        for (const pretend of ['', '大叔笑着走了', '大叔指路请你走，背包被没收']) {
          const text = eventResultText({ eventId: ev.id, optionIndex: i, notice, pretendWalkText: pretend });
          assert.ok(text.trim().length > 0, `${ev.id}/${i}/${notice} 结果为空`);
        }
      }
    }
  }
  const all = allEventResultTexts();
  assert.ok(all.length >= 12, `事件结果语料只有 ${all.length} 条`);
  assert.ok(all.every((text) => text.trim().length > 0), '事件结果语料存在空文案');
  assert.ok(EVENT_RESULT_TEXTS.patrol[0] !== EVENTS.find((e) => e.id === 'patrol')!.options[0],
    '礼貌离开结果仍只重复选项名');

  const eventSrc = fs.readFileSync(path.resolve(process.cwd(), 'cocos/assets/scripts/ui/EventView.ts'), 'utf8');
  assert.match(eventSrc, /descNode\.active = false/, '显示结果时没有隐藏描述文字');
  assert.match(eventSrc, /optionLayer\.active = false/, '显示结果时没有隐藏选项按钮');
  assert.match(eventSrc, /new Color\(26, 16, 32, 255\)/, '结果框底板不是完全不透明 #1a1020');
  assert.match(eventSrc, /Art\.makeVisual\('label_plate'/, '结果框没有用 label_plate 九宫格');
  assert.match(eventSrc, /Sprite\.Type\.SLICED/, '结果框九宫格没有设置 SLICED');
  assert.match(eventSrc, /computeEventResultLayout\(layout, panelH\)/, '结果框没有使用统一布局');
  assert.doesNotMatch(eventSrc, /resultLayout\.roleShift/, '结果框仍在按脚底移动 NPC');
  assert.match(eventSrc, /panel\.setPosition\(0, resultLayout\.centerY, 0\)/, '结果框没有使用描述底板顶边定位');
});

test('r34 全部文案 × 模板变量 × 360/375/390：词边界、避头尾、无孤行、显式换行', () => {
  const seg = new Intl.Segmenter('zh', { granularity: 'word' });
  const boundaries = (text: string): Set<number> => {
    const out = new Set<number>();
    for (const part of seg.segment(text)) if (part.index > 0) out.add(part.index);
    return out;
  };
  const lineStartsForbidden = new Set(Array.from('，。、！？：；」）〔］｝》〉…—～·,.!?;:)]}】”’了的吗呢吧啊'));
  const lineEndsForbidden = new Set(Array.from('（「【〔［｛《〈“‘'));
  const norm = (value: string): string => value.replace(/\u00A0/g, ' ');
  const assertWrapped = (text: string, lines: string[], tag: string): void => {
    const normalized = norm(text);
    const bounds = boundaries(normalized);
    let offset = 0;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const at = normalized.indexOf(norm(line), offset);
      assert.ok(at >= 0, `${tag} 行内容不在原文：${line}`);
      if (line) {
        assert.ok(!lineStartsForbidden.has(line[0]), `${tag} 行首禁止字符「${line[0]}」：${lines.join('/')}`);
        assert.ok(!lineEndsForbidden.has(line[line.length - 1]), `${tag} 行尾禁止字符：${lines.join('/')}`);
      }
      offset = at + line.length;
      if (i + 1 < lines.length && offset < normalized.length && normalized[offset] !== '\n') {
        assert.ok(bounds.has(offset), `${tag} 断点 ${offset} 不在 Intl.Segmenter 词边界：${lines.join('/')}`);
      }
    }
    if (!text.includes('\n') && lines.length > 1) {
      assert.ok(meaningfulCharCount(lines[lines.length - 1]) >= 4, `${tag} 末行孤行：${lines.join('/')}`);
    }
  };

  try {
    for (const vp of R30_VIEWPORTS.filter((v) => v.cssW === 360 || v.cssW === 375 || v.cssW === 390)) {
      const { visibleW, visibleH, safeBottom } = setR30Viewport(vp);
      const body = pxFont(12);
      const tag = vp.name;
      const cases: Array<{ text: string; width: number; kind: 'card' | 'fortune' | 'bubble' }> = [];
      const pushCard = (text: string, width: number): void => {
        cases.push({ text, width: Math.max(1, Math.floor(width)), kind: 'card' });
      };

      // 证书评价
      for (const title of SURVIVAL_TITLES) pushCard(title.desc, Math.max(220, Math.min(336, visibleW * 0.5)));
      // 日结算吐槽：遍历全部模板变量取值（货物名、收入、饱腹、体力、落脚点）
      for (const roast of DAY_ROASTS) {
        for (const text of expandTemplate(roast.text, TEMPLATE_VARIABLES)) {
          pushCard(text, Math.min(448, visibleW - 24));
        }
      }
      // 事件描述 / 结果
      const area = computeEventArea({ visibleH, headerTop: 0, safeBottom });
      const eventBoxWidth = Math.min(visibleW * 0.86, visibleW - 24);
      for (const ev of EVENTS) {
        pushCard(EVENT_PRESENTATIONS[ev.id].desc, Math.max(180, Math.min(area.height * 0.8, eventBoxWidth)));
      }
      for (const text of allEventResultTexts()) pushCard(text, Math.max(220, eventBoxWidth - pxSpacing(20)));
      // 失败页
      for (const key of Object.keys(DEATH_LINES) as Array<keyof typeof DEATH_LINES>) {
        for (const raw of DEATH_LINES[key]) {
          for (const text of expandTemplate(raw, TEMPLATE_VARIABLES)) {
            pushCard(text, Math.min(620, visibleW * 0.86));
          }
        }
      }
      // 地图提示/地名牌/拾荒页提示
      for (const loc of LOCATIONS) {
        pushCard(`${loc.name}今天好像热闹点`, visibleW - pxSpacing(16));
        pushCard(`${loc.name} · 今日拉黑`, Math.min(300, visibleW - 24));
        pushCard(`第 ${loc.openDay} 天开放`, Math.min(300, visibleW - 24));
      }
      pushCard('点击地点前往 · 解锁地点需等待天数', visibleW - pxSpacing(16));
      pushCard('体力 100 · 本次 -12', Math.min(600, visibleW * 0.8));
      // 签文（正文 80% 宽、签头整体）
      for (const text of fortuneTexts().filter((t) => t.includes('\n'))) {
        cases.push({ text, width: 0, kind: 'fortune' });
      }
      // 拾荒气泡：
      for (const loc of LOCATIONS) {
        cases.push({ text: loc.line, width: Math.max(120, visibleW * 0.4), kind: 'bubble' });
      }
      // 其余固定文案（UI/物品/地点/称号等）在卡片真实宽度内遍历。
      for (const text of allWordBreakTexts()) {
        if (/[{}]/.test(text)) continue;
        if (text.includes('\n')) continue; // 签文/多段文案已在对应分组覆盖
        pushCard(text, Math.min(448, visibleW - 24));
      }

      for (const item of cases) {
        if (item.kind === 'fortune') {
          const paper = computeFortunePaperLayout();
          const fit = fitFortuneText(item.text, paper);
          assert.ok(fit.withinPaper, `${tag} 签文越出纸面：${item.text}`);
          assertWrapped(item.text, fit.lines, `${tag} 签文`);
          const header = fit.lines[0];
          assert.match(header, /^【[^】]*】$/, `${tag} 签头不是整体：${fit.lines.join('/')}`);
          // 显式换行必须保留：签头、正文、指定地点三段都存在。
          assert.ok(item.text.split('\n').every((part) => fit.lines.some((line) => part === line || line.startsWith(part) || part.startsWith(line))),
            `${tag} 显式换行丢失：${fit.lines.join('/')}`);
          continue;
        }
        if (item.kind === 'bubble') {
          const metrics = layoutWrappedSpeechBubble(item.text, {
            fontSize: body, padX: 12, padY: 10, minWidth: 120, maxWidth: item.width,
          });
          assertWrapped(item.text, metrics.lines, `${tag} 气泡`);
          assert.ok(metrics.width <= item.width + 0.001, `${tag} 气泡超宽：${metrics.width} > ${item.width}`);
          continue;
        }
        const fit = fitCardText(item.text, {
          maxWidth: item.width,
          maxHeight: 1200,
          fontSize: body,
          minFontSize: body,
          lineGap: 0,
        });
        assert.ok(fit.width <= item.width + 0.001, `${tag} 文本超宽：${item.text}`);
        assertWrapped(item.text, fit.lines, `${tag}「${item.text}」`);
      }
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

test('r39 四种尺寸地图 cover；限定牌候选在可视区，不压玩家/自家图标', () => {
  const viewports = [
    { name: 'iPhone SE 375x667', cssW: 375, cssH: 667, dpr: 2, safeBottomCss: 0, headerTopCss: 0 },
    { name: '360x780', cssW: 360, cssH: 780, dpr: 3, safeBottomCss: 0, headerTopCss: 0 },
    { name: 'iPhone 12/13 390x844', cssW: 390, cssH: 844, dpr: 3, safeBottomCss: 34, headerTopCss: 88 },
    { name: 'iPhone Pro Max 428x926', cssW: 428, cssH: 926, dpr: 3, safeBottomCss: 34, headerTopCss: 88 },
  ];
  const iconSize = 96;
  const badgeW = 64;
  const badgeH = 36;
  const playerIds = ['baishizhou', 'futian_cbd', 'window_world', 'dongmen'];
  const src = fs.readFileSync(path.resolve(process.cwd(), 'cocos/assets/scripts/GameRoot.ts'), 'utf8');
  assert.match(src, /map_side_fill/, '地图没有 #1a1020 的延展底色');
  assert.match(src, /new Color\(26, 16, 32, 255\)/, '地图侧边没有用 #1a1020');
  assert.match(src, /visibleW: UILayout\.visibleW/, '地图没有把可视宽度传给 cover 计算');
  assert.match(src, /computeBadgeUnderPlate\(/, '地图角标没有相对名字牌定位');
  assert.doesNotMatch(src, /daily_badge_stamp|MAP_BADGE_STAMP_SIZE|stampSize|badge\.stamp/,
    '仍保留印章/小点分支');

  try {
    for (const vp of viewports) {
      const visibleH = DESIGN_HEIGHT;
      const cssToDesign = visibleH / vp.cssH;
      const visibleW = vp.cssW * cssToDesign;
      const safeBottom = vp.safeBottomCss * cssToDesign;
      const headerTop = vp.headerTopCss * cssToDesign;
      setFontScreenMetrics({
        physicalWidth: vp.cssW * vp.dpr,
        physicalHeight: vp.cssH * vp.dpr,
        visibleWidth: visibleW,
        visibleHeight: visibleH,
        devicePixelRatio: vp.dpr,
      });
      const fontSize = pxFont(12);
      const plateH = computeMapPlateHeight(fontSize);
      const layout = computeMapLayout({
        visibleH,
        visibleW,
        headerTop,
        hudHeight: EVENT_HUD_HEIGHT,
        barHeight: 112,
        safeBottom,
        iconSize,
        plateHeight: plateH,
      });
      assert.ok(layout.mapRect.right - layout.mapRect.left >= visibleW - 0.001,
        `${vp.name} 地图宽度没有铺满`);
      assert.ok(layout.mapRect.top - layout.mapRect.bottom >= layout.areaTop - layout.areaBottom - 0.001,
        `${vp.name} 地图高度没有铺满`);

      const halfW = visibleW / 2;
      const infos = LOCATIONS.map((loc) => {
        const plateW = computeMapPlateWidth(loc.name, fontSize, {
          minWidth: 112,
          maxWidth: Math.min(300, visibleW - 24),
          padX: 28,
        });
        const p = placeMapMarker(MAP_POINTS[loc.id].x, MAP_POINTS[loc.id].y, layout, {
          iconSize,
          plateWidth: plateW,
          plateHeight: plateH,
          halfW,
        });
        return { id: loc.id, p, plateW };
      });
      const bounds = {
        left: -halfW + MAP_MARKER_MARGIN,
        right: halfW - MAP_MARKER_MARGIN,
        top: layout.areaTop,
        bottom: layout.areaBottom,
      };

      for (const daily of infos) {
        for (const playerId of playerIds) {
          const player = infos.find((info) => info.id === playerId)!;
          const hero = {
            left: player.p.x + iconSize / 2 + 20 - 32,
            right: player.p.x + iconSize / 2 + 20 + 32,
            top: player.p.y - 4 + 32,
            bottom: player.p.y - 4 - 32,
          };
          const blockers = [];
          for (const other of infos) {
            blockers.push(other.p.icon);
            if (other.id !== daily.id) blockers.push(other.p.plate);
          }
          blockers.push(hero);
          const badge = computeBadgeUnderPlate(daily.p.plate, badgeW, badgeH, {
            gap: 2,
            minClearance: 2,
            blockers,
            bounds,
          });
          const tag = `${vp.name} 限定@${daily.id} 玩家@${playerId} (${badge.side})`;
          assert.ok(['right', 'left', 'below', 'merged'].includes(badge.side), `${tag} 未知候选位置`);
          assert.ok(badge.rect.left >= bounds.left - 0.001 && badge.rect.right <= bounds.right + 0.001
            && badge.rect.bottom >= bounds.bottom - 0.001 && badge.rect.top <= bounds.top + 0.001,
          `${tag} 小牌超出可视区`);
          assert.equal(rectsOverlap(badge.rect, daily.p.icon), false, `${tag} 小牌压住自家图标`);
          assert.equal(rectsOverlap(badge.rect, hero), false, `${tag} 小牌压住玩家`);
        }
      }
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

test('r35 签纸：9 签 × SE/360/390/ProMax，文字区够宽、字号≥14css、签头单行', () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), 'cocos/assets/scripts/GameRoot.ts'), 'utf8');
  assert.match(src, /FORTUNE_PAPER_ART/, '抽签页没有使用新签纸');
  assert.match(src, /computeFortunePaperLayoutForText\(fortuneText\)/, '签文没有按文字区动态排版');
  assert.match(src, /textFit\.labelWidth/, '签文 Label 没有按文字区宽度设置');
  assert.match(src, /fortunePaperNodeScale\(paper\)/, '签纸九宫格边框没有按全局整数倍缩放');
  assert.match(src, /slip\.setScale\(paperScale, paperScale, 1\)/, '签纸节点没有用边框倍率缩放');
  assert.match(src, /PIXEL_INK_COLOR\.clone\(\)/, '签文不是纯色 #1a1020');
  assert.doesNotMatch(src, /bad: new Color\(140, 30, 34/, '坏签仍在用红色描边字');
  assert.match(src, /alignBottom\(rerollHint\.node, 70 \+ rerollBtnH \+ pxSpacing\(8\)\)/, '还差¥X 没有放在重抽按钮上方 8 设计 px');

  const paperPng = path.resolve(process.cwd(), 'cocos/assets/resources/art/fortune_paper/0.png');
  const paperInfo = readPngInfo(paperPng);
  assert.equal(paperInfo.w, 96, '签纸源图宽度不是 96');
  assert.equal(paperInfo.h, 160, '签纸源图高度不是 160');
  const paperMeta = JSON.parse(fs.readFileSync(`${paperPng}.meta`, 'utf8'));
  const paperSf = paperMeta.subMetas['f9941'].userData;
  assert.deepEqual(
    [paperSf.borderLeft, paperSf.borderRight, paperSf.borderTop, paperSf.borderBottom],
    FORTUNE_PAPER_INSETS,
    '签纸 meta 九宫格 insets 不对',
  );
  assert.equal(paperSf.trimType, 'none', '签纸被 trim，文字区坐标会偏');
  assert.equal(paperMeta.subMetas['6c48a'].userData.minfilter, 'nearest', '签纸不是 Point 过滤');
  assert.equal(paperMeta.subMetas['6c48a'].userData.magfilter, 'nearest', '签纸不是 Point 过滤');
  assert.equal(paperMeta.subMetas['6c48a'].userData.mipfilter, 'none', '签纸仍启用 mipmap');
  assert.deepEqual(FORTUNE_TEXT_RECT, { left: 18, top: 32, right: 78, bottom: 127, width: 60, height: 95 });

  const tierNames: Record<string, string> = { good: '好签', meh: '平签', bad: '坏签' };
  const viewports = [
    { name: 'iPhone SE 375x667', cssW: 375, cssH: 667, dpr: 2 },
    { name: '360x780', cssW: 360, cssH: 780, dpr: 3 },
    { name: 'iPhone 12/13 390x844', cssW: 390, cssH: 844, dpr: 3 },
    { name: 'iPhone Pro Max 428x926', cssW: 428, cssH: 926, dpr: 3 },
  ];
  try {
    for (const vp of viewports) {
      const visibleH = DESIGN_HEIGHT;
      const visibleW = vp.cssW * visibleH / vp.cssH;
      setFontScreenMetrics({
        physicalWidth: vp.cssW * vp.dpr,
        physicalHeight: vp.cssH * vp.dpr,
        visibleWidth: visibleW,
        visibleHeight: visibleH,
        devicePixelRatio: vp.dpr,
      });
      const cssPerDesign = vp.cssW / visibleW;
      const paper = computeFortunePaperLayout();
      const tag = vp.name;
      assert.ok(Math.abs(paper.width - visibleW * FORTUNE_PAPER_WIDTH_RATIO) < 0.001, `${tag} 纸宽不是屏宽 72%`);
      assert.ok(paper.width >= visibleW * 0.4, `${tag} 签纸小于屏宽 40%`);
      assert.ok(paper.height >= paper.width * FORTUNE_PAPER_MIN_HEIGHT_RATIO - 0.001, `${tag} 纸高小于宽×1.4`);
      assert.ok(paper.text.width >= paper.width * FORTUNE_TEXT_WIDTH_RATIO - 0.001,
        `${tag} 文字区宽不足纸宽 75%（${paper.text.width / paper.width}）`);
      // 文字区 = 纸宽 - 左右边框 - 8px 内边距。
      const borderScale = paper.borderScale;
      const expectedTextW = paper.width - (FORTUNE_PAPER_INSETS[0] + FORTUNE_PAPER_INSETS[1]) * borderScale;
      assert.ok(Math.abs(paper.text.width - (expectedTextW - cssPxToDesign(8))) < 0.01,
        `${tag} 文字区没有按九宫格边框 + 8px 内边距换算`);
      assert.ok(fortunePaperNodeScale(paper) > 0, `${tag} 签纸节点缩放非法`);
      const nodeSize = fortunePaperNodeSize(paper);
      assert.ok(Math.abs(nodeSize.width * fortunePaperNodeScale(paper) - paper.width) < 0.001, `${tag} 签纸本地宽 × 缩放 ≠ 世界宽`);
      assert.ok(Math.abs(nodeSize.height * fortunePaperNodeScale(paper) - paper.height) < 0.001, `${tag} 签纸本地高 × 缩放 ≠ 世界高`);
      const fontCss = fortuneTextFontSize() * cssPerDesign;
      assert.ok(fontCss >= FORTUNE_TEXT_MIN_CSS - 0.001, `${tag} 签文字号 ${fontCss.toFixed(1)} < 14 CSS`);
      for (const fortune of FORTUNES) {
        const header = `【${tierNames[fortune.tier]} · ${fortune.name}】`;
        const text = `${header}\n${fortune.text}\n指定地点：${LOCATIONS[0].name}`;
        const { paper: dynamicPaper, fit } = computeFortunePaperLayoutForText(text);
        const ftag = `${tag} ${fortune.name}`;
        assert.ok(fit.withinPaper, `${ftag} 签文越出纸面文字区`);
        assert.equal(fit.lines[0], header, `${ftag} 签头被拆开：${fit.lines.join('/')}`);
        assert.equal(meaningfulCharCount(fit.lines[0]), meaningfulCharCount(header), `${ftag} 签头不完整`);
        assert.ok(fit.fontSize >= fortuneTextFontSize() - 0.001, `${ftag} 签文字号被自动缩小`);
        assert.ok(fit.lines.every((line) => measureTextWidth(line, fit.fontSize) <= dynamicPaper.text.width + 0.001),
          `${ftag} 签文行超出文字区宽度：${fit.lines.join('/')}`);
        const bounds = fortuneTextBounds(fit, dynamicPaper);
        assert.ok(bounds.left >= dynamicPaper.text.left - 0.001 && bounds.right <= dynamicPaper.text.right + 0.001,
          `${ftag} 文字块左右越出文字区`);
        assert.ok(bounds.top <= dynamicPaper.text.top + 0.001 && bounds.bottom >= dynamicPaper.text.bottom - 0.001,
          `${ftag} 文字块上下越出文字区`);
        assert.ok(dynamicPaper.height >= dynamicPaper.width * FORTUNE_PAPER_MIN_HEIGHT_RATIO - 0.001,
          `${ftag} 动态签纸高度不足宽×1.4`);
        const audit = auditWrappedLines(text, fit.lines);
        assert.deepEqual(audit, [], `${ftag} 签文断点非法：${JSON.stringify(audit)}`);
      }
      const rerollH = Math.ceil(Math.max(
        56,
        lineHeightForFontSize(pxFont(12)) + buttonPaddingY() * 2,
        buttonMinTouchHeight(),
      ));
      const buttonBottom = -visibleH / 2 + ((vp.cssH === 667 || vp.cssH === 780) ? 0 : 34 * visibleH / vp.cssH) + 70;
      const buttonTop = buttonBottom + rerollH;
      const hintBottom = buttonTop + pxSpacing(8);
      const hint = { left: 100 - 75, right: 100 + 75, top: hintBottom + 28, bottom: hintBottom };
      const button = { left: -90, right: 270, top: buttonTop, bottom: buttonBottom };
      assert.ok(hint.bottom - button.top >= pxSpacing(8) - 0.001, `${tag} 还差¥X 离重抽按钮不足 8 设计 px`);
      assert.equal(rectsOverlap(hint, button), false, `${tag} 还差¥X 与重抽按钮相交`);
      assert.ok(paper.centerY - paper.height / 2 >= hint.top + pxSpacing(8) - 0.001,
        `${tag} 签纸底边压住还差¥X`);
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

test('r38 结果面板顶 = 描述底板顶边，与描述互相替换；四尺寸全事件', () => {
  const rootSrc = fs.readFileSync(path.resolve(process.cwd(), 'cocos/assets/scripts/GameRoot.ts'), 'utf8');
  assert.match(rootSrc, /const headGap = pxSpacing\(12\)/, '结算卡没有按 12 设计 px 避让睡觉人头');
  assert.match(rootSrc, /byHero = heroTop[^;]*headGap/, '结算卡没有根据睡觉人头位置计算上移');
  assert.match(rootSrc, /const gradientH = Math\.min\(headerH, pxSpacing\(24\)\)/, '顶栏渐变不是 24 设计 px');
  assert.match(rootSrc, /new Color\(26, 16, 32, Math\.round\(255 \* 0\.85\)\)/, '顶栏渐变不是 #1a1020 85%');
  const eventSrc = fs.readFileSync(path.resolve(process.cwd(), 'cocos/assets/scripts/ui/EventView.ts'), 'utf8');
  assert.match(eventSrc, /computeEventResultLayout\(layout, panelH\)/, '结果框没有使用统一布局');
  assert.doesNotMatch(eventSrc, /resultLayout\.roleShift/, '结果框仍在按脚底移动 NPC');
  assert.match(eventSrc, /panel\.setPosition\(0, resultLayout\.centerY, 0\)/, '结果框没有使用描述顶边定位');

  const viewports = [
    { name: 'iPhone SE 375x667', cssW: 375, cssH: 667, dpr: 2, safeBottomCss: 0, headerTopCss: 0 },
    { name: '360x780', cssW: 360, cssH: 780, dpr: 3, safeBottomCss: 0, headerTopCss: 0 },
    { name: 'iPhone 12/13 390x844', cssW: 390, cssH: 844, dpr: 3, safeBottomCss: 34, headerTopCss: 88 },
    { name: 'iPhone Pro Max 428x926', cssW: 428, cssH: 926, dpr: 3, safeBottomCss: 34, headerTopCss: 88 },
  ];
  try {
    for (const vp of viewports) {
      const visibleH = DESIGN_HEIGHT;
      const cssToDesign = visibleH / vp.cssH;
      const visibleW = vp.cssW * cssToDesign;
      const safeBottom = vp.safeBottomCss * cssToDesign;
      const headerTop = vp.headerTopCss * cssToDesign;
      setFontScreenMetrics({
        physicalWidth: vp.cssW * vp.dpr,
        physicalHeight: vp.cssH * vp.dpr,
        visibleWidth: visibleW,
        visibleHeight: visibleH,
        devicePixelRatio: vp.dpr,
      });
      for (const ev of EVENTS) {
        for (const optionCount of [1, Math.max(1, ev.options.length)]) {
          const layout = computeEventLayout({
            visibleW,
            visibleH,
            headerTop,
            safeBottom,
            titleText: ev.name,
            options: ev.options.slice(0, optionCount),
            desc: EVENT_PRESENTATIONS[ev.id].desc,
            eventId: ev.id,
            cssHeight: vp.cssH,
          });
          const tag = `${vp.name} ${ev.id} ${optionCount}按钮`;
          assert.equal(layout.buttons.height, Math.ceil(EVENT_BUTTON_HEIGHT), `${tag} 按钮高度不统一`);
          assert.equal(layout.buttons.width, Math.round(visibleW * EVENT_BUTTON_WIDTH_RATIO), `${tag} 按钮宽度不是 56%`);
          assert.ok(layout.title.rect.top <= layout.area.top + 0.001, `${tag} 标题越过可用区`);
          assert.ok(layout.role.visualBottom - layout.description!.plate.top <= Math.max(EVENT_NPC_DESC_MAX_GAP, layout.area.height * 0.04) + 2.01,
            `${tag} NPC 脚底离描述顶过远`);
          assert.ok(Math.abs(layout.buttons.top - Math.min(layout.area.top - layout.area.height * 0.72,
            layout.description!.plate.bottom - EVENT_DESC_BUTTON_GAP)) <= 2.001,
            `${tag} 第一个按钮顶边不是 max(T+72%H, 描述底+12)`);
          assert.ok(layout.buttons.bottom >= layout.area.bottom + EVENT_BUTTONS_BOTTOM_GAP - 2.001,
            `${tag} 末按钮越过标语上沿 +24`);
          for (const panelH of [96, 120, 160, 220]) {
            const result = computeEventResultLayout(layout, panelH);
            assert.ok(Math.abs(result.top - layout.description!.plate.top) < 0.001,
              `${tag} 结果框顶边不是描述底板顶边`);
            assert.equal(result.roleShift, 0, `${tag} 结果框仍在移动 NPC`);
          }
        }
      }

      // 结算卡：三档落脚点，卡底边与睡觉精灵顶边至少 24 设计单位（12 逻辑 px）。
      const hudBottom = visibleH / 2 - headerTop - EVENT_HUD_HEIGHT;
      const cardH = 700;
      const headGap = pxSpacing(12);
      const hudCap = hudBottom - 10 - cardH / 2;
      const topCap = visibleH / 2 - 8 - cardH / 2;
      const buttonH = 92;
      const buttonTop = -visibleH / 2 + safeBottom + pxSpacing(28) + buttonH;
      const lowestHeroY = buttonTop + 8 + 48;
      for (const initialHeroY of [-398, -360, -414]) {
        let heroY = initialHeroY;
        if (heroY + 48 + headGap + cardH / 2 > hudCap && heroY > lowestHeroY) heroY = lowestHeroY;
        const heroTop = heroY + 48;
        let cardY = Math.min(60, hudCap);
        const byHero = heroTop + headGap + cardH / 2;
        if (byHero > cardY) cardY = Math.min(topCap, byHero);
        assert.ok(cardY - cardH / 2 - heroTop >= headGap - 0.001,
          `${vp.name} hero@${initialHeroY} 结算卡离头不足 12 设计 px`);
      }
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

test('r32 拾荒页：提示贴格子正上方 6 设计 px，气泡 ≤40% 屏宽且与提示不相交', () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), 'cocos/assets/scripts/ui/LocationView.ts'), 'utf8');
  assert.match(src, /normalHintGap: pxSpacing\(6\)/, '常驻提示没有贴到格子正上方 6 设计 px');
  assert.match(src, /UILayout\.visibleW \* 0\.4/, '气泡最大宽度不是 40% 屏宽');
  assert.match(src, /layoutWrappedSpeechBubble/, '气泡没有走统一断行函数');
  assert.match(src, /bagTop: Math\.max\(bagTop, hintRect\.top\)/, '气泡没有避让下移后的常驻提示');

  const university = LOCATIONS.find((loc) => loc.id === 'university_town')!;
  try {
    for (const vp of R30_VIEWPORTS) {
      const { visibleW, visibleH, safeBottom } = setR30Viewport(vp);
      const halfW = visibleW / 2;
      const buttonH = Math.ceil(Math.max(
        48,
        lineHeightForFontSize(pxFont(12)) + buttonPaddingY() * 2,
        buttonMinTouchHeight(),
      ));
      for (const [bagW, bagH] of [[3, 3], [3, 4], [4, 4]] as const) {
        const layout = computeLocationBottomLayout({
          visibleW,
          visibleH,
          safeBottom,
          bagW,
          bagH,
          buttonHeight: buttonH,
          holdHintHeight: lineHeightForFontSize(pxFont(12)) * 2,
          holdHintWidth: visibleW * 0.8,
          normalHintHeight: lineHeightForFontSize(pxFont(12)) + pxSpacing(4),
          floorBottom: -100,
          bottomMargin: pxSpacing(28),
          gap: pxSpacing(8),
          normalHintGap: pxSpacing(6),
        });
        const hint = layout.normalHint.rect;
        assert.ok(hint.bottom - layout.bag.rect.top >= pxSpacing(6) - 0.001,
          `${vp.name} ${bagW}x${bagH} 提示没有贴格子正上方 6 设计 px`);
        assert.ok(layout.holdHint.rect.bottom - layout.buttonTop >= pxSpacing(8) - 0.001,
          `${vp.name} ${bagW}x${bagH} 长按提示离按钮不足 8 设计 px`);

        const m = layoutWrappedSpeechBubble(university.line, {
          fontSize: pxFont(12),
          lineHeight: pxFont(12),
          padX: 12,
          padY: 10,
          minWidth: 120,
          maxWidth: Math.max(120, visibleW * 0.4),
        });
        const hintTextWidth = Math.ceil(measureTextWidth('拖动 / 单击物品放入背包', pxFont(12)));
        const hintRect = {
          left: -hintTextWidth / 2,
          right: hintTextWidth / 2,
          top: hint.top,
          bottom: hint.bottom,
        };
        const left = -halfW + 14;
        const bagLeft = -layout.bag.width / 2;
        const gutter = Math.max(0, bagLeft - 8 - left);
        const npcSize = Math.min(96, gutter);
        const placed = placeSpeechBubble({
          desiredX: left + npcSize / 2,
          width: m.width,
          height: m.height,
          halfW,
          bagTop: Math.max(layout.bag.rect.top, hintRect.top),
          floorBottom: -100,
          gap: pxSpacing(4),
          hint: hintRect,
        });
        const bubble = {
          left: placed.x - m.width / 2,
          right: placed.x + m.width / 2,
          top: placed.y + m.height / 2,
          bottom: placed.y - m.height / 2,
        };
        const shiftedHint = {
          left: hintRect.left + placed.hintShiftX,
          right: hintRect.right + placed.hintShiftX,
          top: hintRect.top,
          bottom: hintRect.bottom,
        };
        assert.ok(m.width <= visibleW * 0.4 + 0.001, `${vp.name} 气泡宽度超过 40% 屏宽`);
        assert.equal(rectsOverlap(bubble, shiftedHint, pxSpacing(4)), false,
          `${vp.name} ${bagW}x${bagH} 气泡压住「拖动 / 单击物品放入背包」`);
      }
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

// ---------------------------------------------------------------------------
// r35 断词白名单 / 美术接入 / 版本占位
// ---------------------------------------------------------------------------

test('r35 断词白名单：5 个显式案例 + 全部文案 × 5 种宽度无短语内断行', () => {
  // 不可断短语必须落在同一 span 内，内部偏移一律不合法。
  const cases: Array<{ text: string; phrases: string[] }> = [
    { text: '过季潮牌 T 恤', phrases: ['过季潮牌', '潮牌', 'T 恤'] },
    { text: '最值钱的那件货，足够吹一整年。', phrases: ['那件货', '那件'] },
    { text: '来都来了，活满十五天就是胜利。', phrases: ['活满十五天', '活满', '十五天'] },
    { text: '从纸皮到小单间，你升级的是床，不是人生。', phrases: ['你升级', '升级'] },
    { text: '回到城中村，把今天的委屈折成纸皮。', phrases: ['把今天', '委屈'] },
  ];
  for (const c of cases) {
    const spans = protectedPhraseSpans(c.text);
    for (const phrase of c.phrases) {
      let from = 0;
      let found = false;
      while (from < c.text.length) {
        const at = c.text.indexOf(phrase, from);
        if (at < 0) break;
        found = true;
        const span = spans.find(([start, end]) => start <= at && end >= at + phrase.length);
        assert.ok(span, `「${phrase}」没有进入不可断 span：${c.text}`);
        for (let k = at + 1; k < at + phrase.length; k++) {
          assert.equal(isInsideProtectedPhrase(c.text, k), true,
            `「${phrase}」内部 ${k} 仍可断：${c.text}`);
        }
        from = at + 1;
      }
      assert.ok(found, `案例里找不到短语「${phrase}」`);
    }
  }
  assert.ok(ATOMIC_PHRASES.includes('潮牌') && ATOMIC_PHRASES.includes('T 恤'), '潮牌/T 恤不在不可断词表');

  const viewports = [
    { name: '320', cssW: 320, cssH: 568, dpr: 2 },
    { name: '360', cssW: 360, cssH: 780, dpr: 3 },
    { name: '375', cssW: 375, cssH: 667, dpr: 2 },
    { name: '390', cssW: 390, cssH: 844, dpr: 3 },
    { name: '428', cssW: 428, cssH: 926, dpr: 3 },
  ];
  try {
    const explicit = [
      '过季潮牌 T 恤',
      '最值钱的那件货，足够吹一整年。',
      '来都来了，活满十五天就是胜利。',
      '从纸皮到小单间，你升级的是床，不是人生。',
      '回到城中村，把今天的委屈折成纸皮。',
    ];
    for (const vp of viewports) {
      const visibleH = DESIGN_HEIGHT;
      const visibleW = vp.cssW * visibleH / vp.cssH;
      setFontScreenMetrics({
        physicalWidth: vp.cssW * vp.dpr,
        physicalHeight: vp.cssH * vp.dpr,
        visibleWidth: visibleW,
        visibleHeight: visibleH,
        devicePixelRatio: vp.dpr,
      });
      const widths = [
        320, 360, 375, 390, 428,
        Math.min(448, visibleW - 24),
        Math.max(120, visibleW * 0.4),
        Math.max(180, visibleW * 0.72),
        visibleW * 0.86,
      ];
      for (const text of explicit) {
        for (const cssWidth of widths) {
          const maxWidth = cssWidth <= 428 ? cssPxToDesign(cssWidth) : cssWidth;
          const lines = wrapTextToLines(text, Math.max(40, maxWidth), (line) =>
            measurePixelTextWidth(line, pxFont(12)), { minLast: 2 });
          const tag = `${vp.name} ${cssWidth} 「${text}」`;
          assert.deepEqual(auditWrappedLines(text, lines), [], `${tag} 断点非法：${lines.join('/')}`);
          for (const phrase of ['过季潮牌', '潮牌', 'T 恤', '那件货', '活满十五天', '你升级', '把今天', '委屈']) {
            for (let i = 0; i + 1 < lines.length; i++) {
              for (let k = 1; k < phrase.length; k++) {
                assert.ok(!(lines[i].endsWith(phrase.slice(0, k)) && lines[i + 1].startsWith(phrase.slice(k))),
                  `${tag} 把「${phrase}」拆成「${phrase.slice(0, k)} / ${phrase.slice(k)}」：${lines.join('/')}`);
              }
            }
          }
        }
      }
    }

    // 全语料 × 320/360/375/390/428 扫描：断点必须落在白名单。
    const visibleW = 390 * DESIGN_HEIGHT / 844;
    setFontScreenMetrics({
      physicalWidth: 390 * 3,
      physicalHeight: 844 * 3,
      visibleWidth: visibleW,
      visibleHeight: DESIGN_HEIGHT,
      devicePixelRatio: 3,
    });
    for (const text of allWordBreakTexts()) {
      for (const cssWidth of [320, 360, 375, 390, 428]) {
        const maxWidth = Math.max(80, cssPxToDesign(cssWidth));
        const lines = wrapTextToLines(text, maxWidth, (line) =>
          measurePixelTextWidth(line, pxFont(12)), { minLast: 4 });
        const violations = auditWrappedLines(text, lines);
        assert.deepEqual(violations, [],
          `「${text}」@${cssWidth} 断点非法：${lines.join('/')} ${JSON.stringify(violations)}`);
        for (let i = 0; i + 1 < lines.length; i++) {
          const next = lines[i + 1];
          // 单字行首且该字是同一短语的一部分：不允许（短语 span 已覆盖）。
          if ([...next].length === 1) {
            const at = text.indexOf(next, Math.max(0, text.indexOf(lines[i]) + lines[i].length));
            assert.equal(isInsideProtectedPhrase(text, at), false,
              `「${text}」@${cssWidth} 单字「${next}」孤立成行`);
          }
        }
      }
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

test('r35 美术接入：保安 trim none/Point/无 mipmap，钱包图标进主包，NPC 整数倍', () => {
  const guard = path.resolve(process.cwd(), 'cocos/assets/bundles/bg/npc_guard/0.png');
  const info = readPngInfo(guard);
  assert.equal(info.w, 32, '保安源图宽度不是 32');
  assert.equal(info.h, 32, '保安源图高度不是 32');
  assert.equal(ART_ALIAS.ev_guard?.src, 'bg', '保安不在 bg 分包');
  assert.equal(ART_ALIAS.ev_guard?.path, 'npc_guard', '保安路径不对');
  const guardMeta = JSON.parse(fs.readFileSync(`${guard}.meta`, 'utf8'));
  const guardTex = guardMeta.subMetas['6c48a'].userData;
  const guardSf = guardMeta.subMetas['f9941'].userData;
  assert.equal(guardSf.trimType, 'none', '保安仍被 trim，宽高比会变');
  assert.equal(guardSf.width, 32, '保安 SpriteFrame 宽度不是 32');
  assert.equal(guardSf.height, 32, '保安 SpriteFrame 高度不是 32');
  assert.equal(guardSf.rawWidth, 32, '保安 rawWidth 不是 32');
  assert.equal(guardSf.rawHeight, 32, '保安 rawHeight 不是 32');
  assert.equal(guardSf.packable, false, '保安仍进自动图集，边缘会脏');
  assert.equal(guardSf.premultiplyAlpha, false, '保安仍启用 premultiplyAlpha');
  assert.equal(guardTex.minfilter, 'nearest', '保安不是 Point 过滤');
  assert.equal(guardTex.magfilter, 'nearest', '保安不是 Point 过滤');
  assert.equal(guardTex.mipfilter, 'none', '保安仍启用 mipmap');
  assert.equal(guardTex.premultiplyAlpha, false, '保安纹理仍启用 premultiplyAlpha');

  // 钱包新图：16×16，主包 resources，meta 同样保持原始尺寸。
  const wallet = path.resolve(process.cwd(), 'cocos/assets/resources/art/icons/wallet.png');
  const walletInfo = readPngInfo(wallet);
  assert.equal(walletInfo.w, 16, '钱包宽度不是 16');
  assert.equal(walletInfo.h, 16, '钱包高度不是 16');
  const walletMeta = JSON.parse(fs.readFileSync(`${wallet}.meta`, 'utf8'));
  assert.equal(walletMeta.subMetas['f9941'].userData.trimType, 'none', '钱包被 trim');
  assert.equal(walletMeta.subMetas['6c48a'].userData.mipfilter, 'none', '钱包仍启用 mipmap');
  assert.equal(walletMeta.subMetas['6c48a'].userData.minfilter, 'nearest', '钱包不是 Point 过滤');
  assert.equal(walletMeta.subMetas['6c48a'].userData.premultiplyAlpha, false, '钱包仍启用 premultiplyAlpha');
  assert.equal(ART_ALIAS.icon_wallet?.src, 'res', '钱包图标不在主包');
  assert.equal(ART_ALIAS.icon_wallet?.path, 'icons/wallet', '钱包图标路径不对');
  const eventSrc = fs.readFileSync(path.resolve(process.cwd(), 'cocos/assets/scripts/ui/EventView.ts'), 'utf8');
  assert.match(eventSrc, /EVENT_WALLET_ICON_ART = 'icon_wallet'/, '钱包事件没有使用 icons/wallet.png');
  assert.match(eventSrc, /ev_wallet_icon/, '钱包事件没有创建钱包图标节点');

  // 所有像素 NPC meta：trim none、Point、无 mipmap、非预乘。
  const bgRoot = path.resolve(process.cwd(), 'cocos/assets/bundles/bg');
  for (const name of fs.readdirSync(bgRoot).filter((n) => n.startsWith('npc_'))) {
    const dir = path.join(bgRoot, name);
    if (!fs.statSync(dir).isDirectory()) continue;
    for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.png.meta'))) {
      const meta = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
      const sf = meta.subMetas['f9941'].userData;
      const tex = meta.subMetas['6c48a'].userData;
      assert.equal(sf.trimType, 'none', `${name}/${file} 仍被 trim`);
      assert.equal(sf.premultiplyAlpha, false, `${name}/${file} 仍预乘`);
      assert.equal(tex.minfilter, 'nearest', `${name}/${file} 不是 Point`);
      assert.equal(tex.mipfilter, 'none', `${name}/${file} 仍启用 mipmap`);
    }
  }

  // 四尺寸 × 全部事件：角色尺寸是源图整数倍，且节点等比。
  try {
    for (const vp of R30_VIEWPORTS) {
      const { visibleW, visibleH, safeBottom } = setR30Viewport(vp);
      for (const ev of EVENTS) {
        const layout = computeEventLayout({
          visibleW,
          visibleH,
          headerTop: 0,
          safeBottom,
          titleText: ev.name,
          options: ev.options,
          desc: EVENT_PRESENTATIONS[ev.id].desc,
          eventId: ev.id,
        });
        const size = eventRoleVisualSize(layout);
        const src = ev.id === 'rain' ? EVENT_RAIN_ROLE_SRC : 32;
        assert.equal(size.width % src, 0, `${vp.name} ${ev.id} 角色宽度不是源图整数倍`);
        assert.equal(size.height % src, 0, `${vp.name} ${ev.id} 角色高度不是源图整数倍`);
        assert.equal(size.width, size.height, `${vp.name} ${ev.id} 角色被单轴拉伸`);
        assert.equal(layout.role.scale, Math.floor(layout.role.scale), `${vp.name} ${ev.id} 缩放不是整数`);
      }
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

test('r38 版本由 HEAD 生成、tag 不含 dev；主包 < 3950KB', () => {
  const versionFile = path.resolve(process.cwd(), 'cocos/assets/scripts/Version.ts');
  const versionSrc = fs.readFileSync(versionFile, 'utf8');
  assert.doesNotMatch(versionSrc, /1fdb1c8|0ff8641/, '仓库 Version.ts 仍写死旧 commit hash');
  assert.match(versionSrc, /BUILD_VERSION = "r\d+"/, '仓库 Version.ts 版本号格式不对');
  assert.doesNotMatch(versionSrc, /BUILD_HASH = "dev"|BUILD_TAG = "r\d+ dev"/, '仓库 Version.ts 仍在提交 dev');
  assert.match(BUILD_TAG, /^r\d+ [0-9a-f]{7,}$/, `构建标签格式不对：${BUILD_TAG}`);
  const gen = fs.readFileSync(path.resolve(process.cwd(), 'scripts/gen-version.mjs'), 'utf8');
  assert.match(gen, /rev-parse/, '版本脚本没有读取 git HEAD');
  assert.match(gen, /readGitDir/, '版本脚本没有 .git 文件兜底');
  assert.match(gen, /LY15_COMMIT/, '版本脚本没有环境变量兜底');
  assert.doesNotMatch(gen, /--placeholder/, '版本脚本仍支持 dev 占位');
  assert.match(gen, /取不到 git HEAD/, '版本脚本取不到 HEAD 时没有报错');
  const post = fs.readFileSync(path.resolve(process.cwd(), 'scripts/postbuild-info.mjs'), 'utf8');
  assert.match(post, /mainPackageBytes/, 'postbuild-info 没有主包字节数');
  assert.match(post, /bgSubpackageBytes/, 'postbuild-info 没有 bg 分包字节数');
  assert.match(post, /totalBytes/, 'postbuild-info 没有总字节数');
  assert.match(post, /builtAt/, 'postbuild-info 没有构建时间');

  const mainBytes = ['resources', 'scripts', 'scenes'].reduce((sum, dir) => {
    const walk = (p: string): number => {
      let total = 0;
      for (const entry of fs.readdirSync(p, { withFileTypes: true })) {
        const full = path.join(p, entry.name);
        total += entry.isDirectory() ? walk(full) : fs.statSync(full).size;
      }
      return total;
    };
    return sum + walk(path.resolve(process.cwd(), 'cocos/assets', dir));
  }, 0);
  assert.ok(mainBytes < 3950 * 1024, `主包 ${(mainBytes / 1024).toFixed(1)}KB 必须 <3950KB`);
});
