import { CONFIG, LOCATIONS, ITEMS } from '../src/core/config';
import { Game } from '../src/core/game';
import * as fs from 'fs';
import * as path from 'path';

const totalDays = CONFIG.totalDays;
const N = parseInt(process.argv[2] || '2000', 10);

type StrategyId = 'greedy' | 'cautious' | 'random' | 'longhold' | 'upgrader' | 'smart';

interface StrategyResult {
  strategy: StrategyId;
  name: string;
  totalRuns: number;
  wins: number;
  winRate: number;
  avgSurvivalDays: number;
  avgCollapseCount: number;
  avgTotalIncome: number;
  avgDailyIncome: number;
  avgBuyFoodCount: number;
  avgEatCount: number;
  avgBagLevel: number;
  deathDist: Record<number, number>; // day -> count
  moneyCurve: (number | null)[]; // average per day
}

interface RunResult {
  survivalDays: number;
  clear: boolean;
  diedDay: number | null;
  collapseCount: number;
  dailyMoney: (number | null)[];
  totalIncome: number;
  bagLevel: number;
  finalMoney: number;
  buyFoodCount: number;
  eatCount: number;
}

function getHoldSeconds(strategy: StrategyId): number {
  switch (strategy) {
    case 'greedy':
      return 3.5;
    case 'cautious':
      return 2;
    case 'random':
      return 0.5 + Math.random() * 4.5; // 0.5~5
    case 'longhold':
      return 5;
    case 'upgrader':
      return 3.5;
    case 'smart':
      return 2.5;
    default:
      return 2;
  }
}

function isBagFull(game: Game): boolean {
  for (let y = 0; y < game.bagH; y++) {
    for (let x = 0; x < game.bagW; x++) {
      if (game.canPlace(1, x, y, false)) return false;
    }
  }
  return true;
}

function selectLocation(game: Game, strategy: StrategyId): string | null {
  const available = LOCATIONS.filter(loc => !game.bannedToday.includes(loc.id));
  if (available.length === 0) return null;
  if (strategy === 'random') {
    return available[Math.floor(Math.random() * available.length)].id;
  }

  const scored = available.map(loc => {
    let mul = 1;
    if (game.fortune?.effect === 'lootUp' && game.fortuneLocation === loc.id) {
      mul += CONFIG.fortuneEffects.lootUp;
    }
    const effectiveLoot = loc.lootRate * mul;
    return { id: loc.id, score: effectiveLoot, distance: loc.distance };
  });

  if (strategy === 'smart') {
    // 只去爆率高且距离近的地点
    const avgLoot = scored.reduce((sum, l) => sum + l.score, 0) / scored.length;
    const avgDist = scored.reduce((sum, l) => sum + l.distance, 0) / scored.length;
    let candidates = scored.filter(l => l.score >= avgLoot && l.distance <= avgDist);
    if (candidates.length === 0) {
      candidates = scored;
    }
    candidates.sort((a, b) => {
      const scoreA = a.score / (a.distance + 1);
      const scoreB = b.score / (b.distance + 1);
      if (scoreB !== scoreA) return scoreB - scoreA;
      return a.distance - b.distance;
    });
    return candidates[0].id;
  }

  // 按有效爆率排序，优先高爆率
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.distance - b.distance;
  });
  return scored[0].id;
}

function findPlacement(game: Game, itemId: string): { x: number; y: number; rotated: boolean } | null {
  const def = ITEMS.find(i => i.id === itemId);
  if (!def) return null;
  const cells = def.cells;
  const w = game.bagW;
  const h = game.bagH;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      // 先横放
      if (game.canPlace(cells, x, y, false)) {
        return { x, y, rotated: false };
      }
      // 再竖放（仅2格物品）
      if (cells === 2 && game.canPlace(cells, x, y, true)) {
        return { x, y, rotated: true };
      }
    }
  }
  return null;
}

function processFloorItems(
  game: Game,
  strategy: StrategyId,
  stats: { buyFoodCount: number; eatCount: number },
) {
  const items = [...game.floor];
  for (const item of items) {
    const def = ITEMS.find(i => i.id === item.itemId);
    if (!def) continue;
    const eatThreshold = strategy === 'smart' ? 45 : 50;
    if (def.edible && game.hunger < eatThreshold) {
      if (game.eat(item.uid)) {
        stats.eatCount++;
      }
      continue;
    }
    const placement = findPlacement(game, item.itemId);
    if (placement) {
      game.placeFromFloor(item.uid, placement.x, placement.y, placement.rotated);
    } else {
      game.discard(item.uid);
    }
  }
}

function handleHome(
  game: Game,
  strategy: StrategyId,
  stats: { buyFoodCount: number; eatCount: number },
) {
  let threshold: number;
  switch (strategy) {
    case 'greedy':
      threshold = 15;
      break;
    case 'cautious':
      threshold = 30;
      break;
    case 'upgrader':
      threshold = 10;
      break;
    case 'random':
      threshold = Math.random() * 20;
      break;
    case 'longhold':
      threshold = 10;
      break;
    case 'smart':
      threshold = 25;
      break;
    default:
      threshold = 10;
  }

  // 所有策略：只要钱够且 (hunger - dailyHunger) < 阈值 就继续买饭。
  // 限制 1：饱腹已满时停止，否则 dailyHunger + 阈值 > maxHunger 会一直买到没钱；
  // 限制 2：每次回家最多买 5 份，避免极端情况下把全部现金都砸进饭里。
  const MAX_MEALS_PER_HOME = 5;
  let mealsBought = 0;
  while (
    mealsBought < MAX_MEALS_PER_HOME &&
    game.hunger < CONFIG.maxHunger &&
    game.money >= CONFIG.foodPrice &&
    game.hunger - game.dailyHunger < threshold
  ) {
    if (game.buyFood()) {
      stats.buyFoodCount++;
      mealsBought++;
    } else {
      break;
    }
  }

  // 买饭优先于扩背包；upgrader 先保证阈值 10，再扩背包/升级
  switch (strategy) {
    case 'greedy': {
      const cost = CONFIG.bagSizes[game.bagLevel + 1]?.cost;
      if (
        game.bagLevel < CONFIG.bagSizes.length - 1 &&
        cost != null &&
        game.money >= cost
      ) {
        game.expandBag();
      }
      break;
    }
    case 'cautious': {
      const cost = CONFIG.bagSizes[game.bagLevel + 1]?.cost;
      if (
        game.bagLevel < CONFIG.bagSizes.length - 1 &&
        cost != null &&
        game.money >= cost
      ) {
        game.expandBag();
      }
      break;
    }
    case 'upgrader': {
      while (
        game.bagLevel < CONFIG.bagSizes.length - 1 &&
        game.money >= CONFIG.bagSizes[game.bagLevel + 1].cost
      ) {
        game.expandBag();
      }
      while (
        game.homeLevel < CONFIG.homeLevels.length - 1 &&
        game.money >= CONFIG.homeLevels[game.homeLevel + 1].cost
      ) {
        game.upgradeHome();
      }
      break;
    }
    case 'random': {
      if (
        Math.random() < 0.3 &&
        game.bagLevel < CONFIG.bagSizes.length - 1 &&
        game.money >= CONFIG.bagSizes[game.bagLevel + 1].cost
      ) {
        game.expandBag();
      }
      if (
        Math.random() < 0.2 &&
        game.homeLevel < CONFIG.homeLevels.length - 1 &&
        game.money >= CONFIG.homeLevels[game.homeLevel + 1].cost
      ) {
        game.upgradeHome();
      }
      break;
    }
    case 'longhold': {
      // 不扩背包
      break;
    }
    case 'smart': {
      // 钱 >= 60 才扩背包
      while (
        game.bagLevel < CONFIG.bagSizes.length - 1 &&
        game.money >= 60 &&
        game.money >= CONFIG.bagSizes[game.bagLevel + 1].cost
      ) {
        game.expandBag();
      }
      break;
    }
  }
}

function selectEventOption(
  game: Game,
  event: { id: string; name: string; options: string[] },
  strategy: StrategyId,
): number {
  switch (event.id) {
    case 'patrol': {
      if (strategy === 'cautious' || strategy === 'smart') return 0;
      return 1;
    }
    case 'guard':
      return 0;
    case 'rival': {
      if (strategy === 'cautious' || strategy === 'smart') return 0;
      return 1;
    }
    case 'cat': {
      const hasFood = [...game.floor, ...game.bag].some(item => {
        const def = ITEMS.find(i => i.id === item.itemId);
        return def?.edible === true;
      });
      return hasFood ? 0 : 1;
    }
    default:
      return 0;
  }
}

function simulateRun(strategy: StrategyId, seed: number): RunResult {
  const game = new Game(seed, CONFIG);
  game.startGame();

  const stats = { buyFoodCount: 0, eatCount: 0 };
  let steps = 0;
  const maxSteps = 10000;
  let collapseCount = 0;
  let lastDay = game.day;
  const dailyMoney: (number | null)[] = new Array(totalDays).fill(null);
  let currentEvent: { id: string; name: string; options: string[] } | null = null;

  while (steps < maxSteps && game.phase !== 'won' && game.phase !== 'lost') {
    const phase = game.phase;
    switch (phase) {
      case 'fortune': {
        if (
          game.fortune &&
          game.fortune.tier === 'bad' &&
          (strategy === 'greedy' || strategy === 'upgrader')
        ) {
          if (game.money >= game.rerollCost()) {
            game.rerollFortune();
          }
        }
        game.acceptFortune();
        break;
      }
      case 'map': {
        const locId = selectLocation(game, strategy);
        if (locId) {
          game.travel(locId);
        } else {
          game.goHome();
        }
        break;
      }
      case 'location': {
        if (strategy === 'smart') {
          const needHome =
            isBagFull(game) || game.stamina < game.homeCost() + 15;
          if (needHome) {
            game.endDayAway();
            break;
          }
        }

        const boxes = game.boxesAt(game.location!);
        const unopened = boxes.filter(b => !b.opened);
        if (unopened.length === 0) {
          game.endDayAway();
          break;
        }
        // 优先挖大盒子
        const bigBoxes = unopened.filter(b => b.size === 'big');
        const smallBoxes = unopened.filter(b => b.size === 'small');
        const box = bigBoxes.length > 0 ? bigBoxes[0] : smallBoxes[0];
        const holdSec = getHoldSeconds(strategy);
        const result = game.dig(box.id, holdSec);
        if (!result.ok) {
          // 饿晕等情况，循环会退出
          break;
        }
        if (result.event) {
          currentEvent = result.event;
        }
        processFloorItems(game, strategy, stats);
        break;
      }
      case 'event': {
        if (!currentEvent) {
          game.resolveEvent(0, false);
          currentEvent = null;
        } else {
          const optionIndex = selectEventOption(game, currentEvent, strategy);
          const minigameWin =
            currentEvent.id === 'rival' ? Math.random() < 0.5 : false;
          game.resolveEvent(optionIndex, minigameWin);
          currentEvent = null;
        }
        break;
      }
      case 'home': {
        handleHome(game, strategy, stats);
        game.sleep();
        break;
      }
      case 'collapsed': {
        collapseCount++;
        game.wakeUp();
        break;
      }
      default:
        break;
    }

    // 每天结束（无论回家睡还是倒下 wakeUp）都记录当时的金钱
    if (game.day > lastDay) {
      dailyMoney[lastDay - 1] = game.money;
      lastDay = game.day;
    }

    steps++;
  }

  // 如果胜利，记录最后一天结束金钱
  if (game.phase === 'won') {
    dailyMoney[game.day - 1] = game.money;
  }

  const survivalDays = game.phase === 'won' ? totalDays : game.day;
  const clear = game.phase === 'won';
  const diedDay = game.phase === 'lost' ? game.day : null;

  return {
    survivalDays,
    clear,
    diedDay,
    collapseCount,
    dailyMoney,
    totalIncome: game.totalIncome,
    bagLevel: game.bagLevel,
    finalMoney: game.money,
    buyFoodCount: stats.buyFoodCount,
    eatCount: stats.eatCount,
  };
}

function computeStrategyResult(
  strategy: StrategyId,
  strategyName: string,
  runs: RunResult[],
): StrategyResult {
  const totalRuns = runs.length;
  const wins = runs.filter(r => r.clear).length;
  const winRate = wins / totalRuns;
  const avgSurvivalDays =
    runs.reduce((sum, r) => sum + r.survivalDays, 0) / totalRuns;
  const avgCollapseCount =
    runs.reduce((sum, r) => sum + r.collapseCount, 0) / totalRuns;
  const avgTotalIncome =
    runs.reduce((sum, r) => sum + r.totalIncome, 0) / totalRuns;
  const avgDailyIncome =
    runs.reduce(
      (sum, r) =>
        sum + (r.survivalDays > 0 ? r.totalIncome / r.survivalDays : 0),
      0,
    ) / totalRuns;
  const avgBuyFoodCount =
    runs.reduce((sum, r) => sum + r.buyFoodCount, 0) / totalRuns;
  const avgEatCount =
    runs.reduce((sum, r) => sum + r.eatCount, 0) / totalRuns;
  const avgBagLevel =
    runs.reduce((sum, r) => sum + r.bagLevel, 0) / totalRuns;

  const deathDist: Record<number, number> = {};
  for (let d = 1; d <= totalDays; d++) deathDist[d] = 0;
  for (const r of runs) {
    if (r.diedDay !== null) {
      deathDist[r.diedDay] = (deathDist[r.diedDay] || 0) + 1;
    }
  }

  const moneyCurve: (number | null)[] = new Array(totalDays).fill(null);
  for (let d = 1; d <= totalDays; d++) {
    const values: number[] = [];
    for (const r of runs) {
      const val = r.dailyMoney[d - 1];
      if (val !== null && val !== undefined) {
        values.push(val);
      }
    }
    if (values.length > 0) {
      moneyCurve[d - 1] =
        values.reduce((sum, v) => sum + v, 0) / values.length;
    }
  }

  return {
    strategy,
    name: strategyName,
    totalRuns,
    wins,
    winRate,
    avgSurvivalDays,
    avgCollapseCount,
    avgTotalIncome,
    avgDailyIncome,
    avgBuyFoodCount,
    avgEatCount,
    avgBagLevel,
    deathDist,
    moneyCurve,
  };
}

function printResults(results: StrategyResult[]) {
  console.log('策略模拟结果（每策略局数: ' + N + '）');
  console.log('-'.repeat(140));
  console.log(
    '策略'.padEnd(8) +
      ' 平均存活(天)'.padStart(12) +
      ' 通关率'.padStart(8) +
      ' 平均倒下'.padStart(10) +
      ' 平均累计收入'.padStart(14) +
      ' 平均每日收入'.padStart(14) +
      ' 平均买饭'.padStart(10) +
      ' 平均当场吃'.padStart(12) +
      ' 平均扩背包'.padStart(12),
  );
  for (const r of results) {
    console.log(
      r.name.padEnd(8) +
        r.avgSurvivalDays.toFixed(2).padStart(12) +
        (r.winRate * 100).toFixed(1).padStart(7) +
        '%' +
        r.avgCollapseCount.toFixed(2).padStart(10) +
        r.avgTotalIncome.toFixed(2).padStart(14) +
        r.avgDailyIncome.toFixed(2).padStart(14) +
        r.avgBuyFoodCount.toFixed(2).padStart(10) +
        r.avgEatCount.toFixed(2).padStart(12) +
        r.avgBagLevel.toFixed(2).padStart(12),
    );
  }

  console.log('\n死亡天数分布（局数）:');
  console.log(
    '策略'.padEnd(8) +
      Array.from({ length: totalDays }, (_, i) =>
        `D${i + 1}`.padStart(4),
      ).join(''),
  );
  for (const r of results) {
    const distStr = Array.from({ length: totalDays }, (_, i) =>
      (r.deathDist[i + 1] || 0).toString().padStart(4),
    ).join('');
    console.log(r.name.padEnd(8) + distStr);
  }

  console.log('\n每天结束平均金钱（¥）:');
  console.log(
    '策略'.padEnd(8) +
      Array.from({ length: totalDays }, (_, i) =>
        `D${i + 1}`.padStart(8),
      ).join(''),
  );
  for (const r of results) {
    const moneyStr = Array.from({ length: totalDays }, (_, i) => {
      const v = r.moneyCurve[i];
      return v === null ? '   -   '.padStart(8) : v.toFixed(2).padStart(8);
    }).join('');
    console.log(r.name.padEnd(8) + moneyStr);
  }
}

// 主程序
const strategies: { id: StrategyId; name: string }[] = [
  { id: 'greedy', name: '贪婪' },
  { id: 'cautious', name: '谨慎' },
  { id: 'random', name: '随机' },
  { id: 'longhold', name: '豪赌' },
  { id: 'upgrader', name: '升级' },
  { id: 'smart', name: '智能' },
];

const allResults: StrategyResult[] = [];

console.log(`开始模拟，每种策略 ${N} 局...`);

for (const strat of strategies) {
  const runs: RunResult[] = [];
  for (let seed = 1; seed <= N; seed++) {
    const run = simulateRun(strat.id, seed);
    runs.push(run);
  }
  const result = computeStrategyResult(strat.id, strat.name, runs);
  allResults.push(result);
  console.log(`策略 ${strat.name} 模拟完成`);
}

// 确保 sim 目录存在
const simDir = path.resolve(process.cwd(), 'sim');
if (!fs.existsSync(simDir)) {
  fs.mkdirSync(simDir, { recursive: true });
}

// 写入 JSON
const output = {
  totalRunsPerStrategy: N,
  strategies: allResults,
};
const outPath = path.resolve(simDir, 'result.json');
fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
console.log(`结果已写入 ${outPath}`);

// 打印表格
printResults(allResults);