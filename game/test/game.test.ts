import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { Game } from '../src/core/game';
import { CONFIG, ITEMS, LOCATIONS, FORTUNES } from '../src/core/config';
import { ICON_MAP } from '../cocos/assets/scripts/ui/ArtMap';
import { bagCellCenter, positionForAnchor } from '../src/core/placement';

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
  assert.equal(phase.badFortuneBonus, 0.15);
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
  assert.equal(g.buyFood(), true);
  assert.equal(g.money, 20 - CONFIG.foodPrice);
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

test('巡逻事件礼貌离开', () => {
  const g = newGame();
  g.phase = 'event';
  g.location = 'baishizhou';
  g.stamina = 50;
  (g as any).pendingEvent = { id: 'patrol', name: '巡逻', options: ['礼貌离开', '装作散步'] };
  g.resolveEvent(0);
  assert.equal(g.phase, 'map');
  assert.ok(g.bannedToday.includes('baishizhou'));
  assert.equal(g.stamina, 50 - CONFIG.patrolLeaveStamina);
});

test('保安事件禁止', () => {
  const g = newGame();
  g.phase = 'event';
  g.location = 'baishizhou';
  (g as any).pendingEvent = { id: 'guard', name: '保安', options: ['被请出小区'] };
  g.resolveEvent(0);
  assert.equal(g.phase, 'map');
  assert.ok(g.bannedToday.includes('baishizhou'));
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
  assert.ok(report.quip.includes('旧手机'), '吐槽应使用最离谱物品');
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

test('被抓后清空背包，换地点仍为空', () => {
  const guard = newGame();
  guard.day = 5;
  guard.phase = 'event';
  guard.location = 'baishizhou';
  guard.stamina = 50;
  guard.bag = [
    { uid: 1, itemId: 'empty_water_bottle', x: 0, y: 0, w: 1, h: 1 },
    { uid: 2, itemId: 'old_newspaper', x: 1, y: 0, w: 1, h: 1 },
  ];
  (guard as any).pendingEvent = { id: 'guard', name: '保安', options: ['被请出小区'] };
  guard.resolveEvent(0);
  assert.equal(guard.bag.length, 0, '保安事件应清空背包');
  assert.equal(guard.phase, 'map');
  assert.equal(guard.travel('dongmen'), true);
  assert.equal(guard.bag.length, 0, '换地点后背包仍为空');

  const patrol = newGame();
  patrol.day = 5;
  patrol.phase = 'event';
  patrol.location = 'baishizhou';
  patrol.stamina = 50;
  patrol.bag = [{ uid: 3, itemId: 'cardboard_box', x: 0, y: 0, w: 2, h: 1 }];
  const r = mockRng(patrol);
  r.chanceQueue = [false]; // 装作散步失败 = 被抓
  (patrol as any).pendingEvent = { id: 'patrol', name: '巡逻', options: ['礼貌离开', '装作散步'] };
  patrol.resolveEvent(1);
  assert.equal(patrol.bag.length, 0, '巡逻被抓也应清空背包');
  assert.equal(patrol.travel('dongmen'), true);
  assert.equal(patrol.bag.length, 0);
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

test('音效文件存在且小于 20KB', () => {
  for (const name of ['snap.wav', 'bounce.wav']) {
    const file = path.resolve(process.cwd(), 'cocos/assets/resources/sfx', name);
    assert.ok(fs.existsSync(file), `${name} 不存在`);
    const size = fs.statSync(file).size;
    assert.ok(size > 0 && size < 20 * 1024, `${name} 大小 ${size}`);
  }
});
