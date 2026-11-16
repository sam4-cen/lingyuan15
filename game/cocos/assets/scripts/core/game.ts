import {
  CONFIG,
  ITEMS,
  LOCATIONS,
  FORTUNES,
  EVENTS,
  SLEEP_SPOTS,
  Rarity,
  BoxSize,
  FortuneTier,
  ItemDef,
  LocationDef,
  FortuneDef,
  EventDef,
  SleepSpotDef,
  Config,
  PhaseDef,
  DailySpecialDef,
  DAILY_SPECIALS,
  DeathCauseId,
  DEATH_LINES,
  RunStats,
  SurvivalTitleDef,
  SURVIVAL_TITLES,
  DAY_ROASTS,
  DayRoastDef,
  RoastContext,
  affordabilityOf,
} from './config';

export type Phase = 'fortune' | 'map' | 'location' | 'event' | 'home' | 'collapsed' | 'won' | 'lost';

export interface Box {
  id: string;
  size: BoxSize;
  opened: boolean;
}

export interface ItemInst {
  uid: number;
  itemId: string;
  scratchValue?: number;
}

export interface Placed {
  uid: number;
  itemId: string;
  x: number;
  y: number;
  w: number;
  h: number;
  scratchValue?: number;
}

export interface DigResult {
  ok: boolean;
  reason?: string;
  items: ItemInst[];
  mishap: boolean;
  glow: 'white' | 'blue' | 'gold' | 'rainbow';
  staminaCost: number;
  quip: string;
  event?: PendingEvent;
  collapsed?: boolean;
}

export interface PendingEvent {
  id: EventDef['id'];
  name: string;
  options: string[];
}

export interface DayReport {
  day: number;
  income: number;
  soldItems: string[];
  bestItem?: string;
  /** 最离谱物品的 id，结算卡据此显示物品图标。 */
  bestItemId?: string;
  /** 最离谱物品的卖价，结算卡显示在物品名旁边。 */
  bestItemPrice?: number;
  hungerLeft: number;
  /** 回家结算时的剩余体力（不是睡觉后的体力）。 */
  staminaLeft: number;
  /** r8 结算卡大字吐槽（来自 DAY_ROASTS，按当天情境轮换）。 */
  roast: string;
  /** 选中的吐槽 id，便于保证一局内不重复。 */
  roastId: string;
  /** 兼容旧日结算的文案（当天吐槽 + 最离谱物品 + 收入）。 */
  quip: string;
  warmth?: boolean;
}

export type HomeAction = 'food' | 'bag' | 'home';

export interface HomeActionQuote {
  action: HomeAction;
  name: string;
  icon: string;
  grayIcon: string;
  price: number;
  maxed: boolean;
  affordable: boolean;
  shortfall: number;
  /** 钱不够时的「还差 ¥X」；够钱或已满级为空。 */
  shortfallText: string;
}

export interface CollapseReport {
  day: number;
  spot: SleepSpotDef['id'];
  spotName: string;
  lostItems: string[];
  staminaNextDay: number;
  text: string;
}

export function createRunStats(): RunStats {
  return {
    daysSurvived: 0,
    boxesOpened: 0,
    itemsCollected: 0,
    cardboardFound: 0,
    electronicsFound: 0,
    foodEaten: 0,
    catFeeds: 0,
    securityEncounters: 0,
    pretendWalkCount: 0,
    collapses: 0,
    homeVisits: 0,
    nightsSlept: 0,
    totalIncome: 0,
    bestItemName: '',
    bestItemValue: 0,
    locationVisits: {},
  };
}

export class Rng {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  int(a: number, b: number): number {
    const min = Math.ceil(a);
    const max = Math.floor(b);
    if (min > max) return min;
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  pick<T>(arr: T[]): T {
    if (arr.length === 0) throw new Error('pick from empty array');
    return arr[Math.floor(this.next() * arr.length)];
  }

  chance(p: number): boolean {
    return this.next() < p;
  }
}

export class Game {
  private readonly cfg: Config;
  private rng: Rng;

  public day: number;
  public minute: number;
  public hunger: number;
  public stamina: number;
  public mood: number;
  public money: number;
  public phase: Phase;
  public location: string | null;
  public fortune: FortuneDef | null;
  public fortuneLocation: string | null;
  public rerollCount: number;
  public bagLevel: number;
  public homeLevel: number;
  public bag: Placed[];
  public floor: ItemInst[];
  public bannedToday: string[];
  /** 今天是否已被保安赶走过（用于在饿死/累死时改用保安死因文案）。 */
  public securityChasedToday: number;
  public raining: boolean;
  public catLuck: number;
  public deathCause: string;
  public deathLine: string;
  public deathCauseId: DeathCauseId | '';
  /** 今日限定（第 5~15 天，每天一条；其余时间为 null）。 */
  public dailySpecial: DailySpecialDef | null;
  public dailySpecialDay: number;
  /** 整局统计：死亡页、认证页、称号都只读这里。 */
  public stats: RunStats;
  public awardedTitle: SurvivalTitleDef | null;
  /** 刚结算的事件提示（例如喂猫时包里没吃的），UI 在事件结果里显示 */
  public lastEventNotice: string;
  /** 最近一次「装作散步」是否成功：true=背包保留，false=背包被没收且地点拉黑。 */
  public lastPatrolWalkKept: boolean | null;
  /** 当晚是否触发夜间温情（由 sleep() 的 rng 决定，UI 只读这个结果） */
  public lastNightWarmth: boolean;
  public totalIncome: number;
  public log: string[];
  public lastDayReport: DayReport | null;
  public lastCollapse: CollapseReport | null;
  /** 本局已用过的结算吐槽 id，保证一局内尽量不重复。 */
  public usedRoasts: string[];
  public history: { day: number; money: number; hunger: number; stamina: number }[];

  private boxes: Map<string, Box[]>;
  private nextUid: number;
  private pendingEvent: PendingEvent | null;
  private dayHasGoodOrAbove: boolean;
  private fortuneGuaranteeUsed: boolean;
  private todayEdibleSeen: string[];

  constructor(seed: number, cfg: Config = CONFIG) {
    this.cfg = cfg;
    this.rng = new Rng(seed);

    this.day = 1;
    this.minute = cfg.dayStartMinute;
    this.hunger = cfg.startHunger;
    this.stamina = cfg.startStamina;
    this.mood = cfg.startMood;
    this.money = cfg.startMoney;
    this.phase = 'fortune';
    this.location = null;
    this.fortune = null;
    this.fortuneLocation = null;
    this.rerollCount = 0;
    this.bagLevel = 0;
    this.homeLevel = 0;
    this.bag = [];
    this.floor = [];
    this.bannedToday = [];
    this.securityChasedToday = 0;
    this.raining = false;
    this.catLuck = 0;
    this.deathCause = '';
    this.deathLine = '';
    this.deathCauseId = '';
    this.dailySpecial = null;
    this.dailySpecialDay = 0;
    this.stats = createRunStats();
    this.awardedTitle = null;
    this.lastEventNotice = '';
    this.lastPatrolWalkKept = null;
    this.lastNightWarmth = false;
    this.totalIncome = 0;
    this.log = [];
    this.lastDayReport = null;
    this.lastCollapse = null;
    this.usedRoasts = [];
    this.history = [];
    this.boxes = new Map();
    this.nextUid = 1;
    this.pendingEvent = null;
    this.dayHasGoodOrAbove = false;
    this.fortuneGuaranteeUsed = false;
    this.todayEdibleSeen = [];
  }

  get bagW(): number {
    return this.cfg.bagSizes[this.bagLevel].w;
  }

  get bagH(): number {
    return this.cfg.bagSizes[this.bagLevel].h;
  }

  get maxStamina(): number {
    return this.cfg.maxStamina + this.cfg.homeLevels[this.homeLevel].staminaBonus;
  }

  /** 当前落脚点名称/场景名（bg 分包路径 home_lv1/2/3）。 */
  get homeName(): string {
    return this.cfg.homeLevels[this.homeLevel].name;
  }

  get homeScene(): string {
    return this.cfg.homeLevels[this.homeLevel].scene;
  }

  get dailyHunger(): number {
    return this.currentPhaseDef().dailyHunger;
  }

  /** 今日限定后的实际饭价（夜市开张 = ¥10）。 */
  get foodPrice(): number {
    if (this.dailySpecial?.effect === 'foodPrice' && this.dailySpecial.foodPrice != null) {
      return this.dailySpecial.foodPrice;
    }
    return this.cfg.foodPrice;
  }

  get boxesOpened(): number {
    return this.stats.boxesOpened;
  }

  get daysSurvived(): number {
    return this.stats.daysSurvived || this.day;
  }

  get bestItemName(): string {
    return this.stats.bestItemName || '无';
  }

  startGame(): void {
    this.day = 1;
    this.minute = this.cfg.dayStartMinute;
    this.hunger = this.cfg.startHunger;
    this.stamina = this.cfg.startStamina;
    this.mood = this.cfg.startMood;
    this.money = this.cfg.startMoney;
    this.phase = 'fortune';
    this.location = null;
    this.fortune = null;
    this.fortuneLocation = null;
    this.rerollCount = 0;
    this.bagLevel = 0;
    this.homeLevel = 0;
    this.bag = [];
    this.floor = [];
    this.bannedToday = [];
    this.securityChasedToday = 0;
    this.raining = false;
    this.catLuck = 0;
    this.deathCause = '';
    this.deathLine = '';
    this.deathCauseId = '';
    this.dailySpecial = null;
    this.dailySpecialDay = 0;
    this.stats = createRunStats();
    this.awardedTitle = null;
    this.lastEventNotice = '';
    this.lastPatrolWalkKept = null;
    this.lastNightWarmth = false;
    this.totalIncome = 0;
    this.log = [];
    this.lastDayReport = null;
    this.lastCollapse = null;
    this.usedRoasts = [];
    this.history = [];
    this.boxes = new Map();
    this.nextUid = 1;
    this.pendingEvent = null;
    this.dayHasGoodOrAbove = false;
    this.fortuneGuaranteeUsed = false;
    this.todayEdibleSeen = [];
    this.drawFortune();
    this.phase = 'fortune';
  }

  drawFortune(): void {
    this.drawFortuneInternal();
  }

  /**
   * 按签运抽一条今日限定：好签偏好事、坏签偏坏事、平签均匀。
   * 使用同一个 seeded rng，因此同种子结果可复现。
   */
  public selectDailySpecial(tier: FortuneTier): DailySpecialDef {
    const weights = this.cfg.dailySpecial.weights[tier];
    const entries = DAILY_SPECIALS.map((special) => ({
      special,
      weight: special.bias === 'good' ? weights.good : weights.bad,
    }));
    let total = 0;
    for (const entry of entries) total += Math.max(0, entry.weight);
    if (total <= 0) {
      return this.rng.pick(DAILY_SPECIALS);
    }
    let roll = this.rng.next() * total;
    for (const entry of entries) {
      roll -= Math.max(0, entry.weight);
      if (roll < 0) return entry.special;
    }
    return entries[entries.length - 1].special;
  }

  /** 每天只生成一次；同一天重抽不会换限定。 */
  private ensureDailySpecial(): void {
    const start = this.cfg.dailySpecial.startDay;
    const end = this.cfg.dailySpecial.endDay;
    if (this.day < start || this.day > end) {
      this.dailySpecial = null;
      this.dailySpecialDay = 0;
      return;
    }
    if (this.dailySpecial && this.dailySpecialDay === this.day) return;
    this.dailySpecial = this.selectDailySpecial(this.fortune?.tier ?? 'meh');
    this.dailySpecialDay = this.day;
  }

  /** 今日限定是否给某个地点挂「限定」角标。 */
  public hasDailySpecialAt(locId: string): boolean {
    return !!this.dailySpecial && this.dailySpecial.locationId === locId;
  }

  rerollCost(): number {
    return this.cfg.rerollBase + this.cfg.rerollStep * this.rerollCount;
  }

  rerollFortune(): boolean {
    if (this.phase !== 'fortune') return false;
    const cost = this.rerollCost();
    if (this.money < cost) return false;
    this.money -= cost;
    this.rerollCount++;
    this.drawFortune();
    return true;
  }

  acceptFortune(): void {
    if (this.phase !== 'fortune' || !this.fortune) return;
    const tier = this.fortune.tier;
    const delta = this.cfg.boxCountFortuneDelta[tier];
    const minBase = this.cfg.boxesPerLocation[0];
    const maxBase = this.cfg.boxesPerLocation[1];

    this.boxes = new Map();
    for (const loc of LOCATIONS) {
      let count = this.rng.int(minBase + delta[0], maxBase + delta[1]);
      count = Math.max(1, count);
      const boxes: Box[] = [];
      for (let i = 0; i < count; i++) {
        const size: BoxSize = this.rng.chance(this.cfg.bigBoxChance[tier]) ? 'big' : 'small';
        boxes.push({ id: `box_${loc.id}_${i}`, size, opened: false });
      }
      const bonus = this.dailySpecial?.effect === 'baishizhouBoxBonus'
        ? this.dailySpecial.boxBonus
        : undefined;
      if (bonus && bonus.locationId === loc.id) {
        for (let i = 0; i < bonus.count; i++) {
          boxes.push({ id: `box_${loc.id}_daily_${i}`, size: bonus.size, opened: false });
        }
      }
      this.boxes.set(loc.id, boxes);
    }
    this.phase = 'map';
    this.bannedToday = [];
  }

  boxesAt(locId: string): Box[] {
    return this.boxes.get(locId) ?? [];
  }

  /** 当前待处理事件（UI 在 event 状态刷新时重新打开事件界面用）。 */
  get currentEvent(): PendingEvent | null {
    return this.pendingEvent;
  }

  /** 被抓/被没收时清空整个背包（含大件和已摆放坐标）。 */
  clearBag(): void {
    this.bag = [];
    this.lastEventNotice = '背包被没收了';
  }

  travelCost(locId: string): number {
    const loc = this.findLocation(locId);
    if (!loc) return this.cfg.maxStamina * 10;
    let cost: number;
    if (this.location == null) {
      cost = loc.distance;
    } else {
      const curLoc = this.findLocation(this.location);
      if (!curLoc) cost = loc.distance;
      else cost = Math.abs(curLoc.distance - loc.distance) + 5;
    }
    cost = Math.max(5, cost);

    const phaseDef = this.currentPhaseDef();
    if (loc.far && phaseDef.farTravelMul !== 1) {
      cost = Math.floor(cost * phaseDef.farTravelMul);
    }
    if (this.fortune?.effect === 'windy') {
      cost += this.cfg.fortuneEffects.windy;
    }
    if (this.raining) {
      cost += this.cfg.rainTravelExtra;
    }
    return Math.max(5, cost);
  }

  homeCost(): number {
    if (this.location == null) return 0;
    return this.homeCostFrom(this.location);
  }

  /** 从指定地点回家的体力消耗（地图详情里算往返消耗用，不改变当前状态）。 */
  homeCostFrom(locId: string): number {
    const loc = this.findLocation(locId);
    if (!loc) return 0;
    let cost = loc.distance;
    const phaseDef = this.currentPhaseDef();
    if (loc.far && phaseDef.farTravelMul !== 1) {
      cost = Math.floor(cost * phaseDef.farTravelMul);
    }
    if (this.fortune?.effect === 'windy') {
      cost += this.cfg.fortuneEffects.windy;
    }
    if (this.raining) {
      cost += this.cfg.rainTravelExtra;
    }
    if (this.dailySpecial?.effect === 'homeCostMul' && this.dailySpecial.homeCostMul != null) {
      cost = Math.ceil(cost * this.dailySpecial.homeCostMul);
    }
    return Math.max(5, cost);
  }

  /** 地点是否已开放（第 N 天开放；未开放地点不能出门）。 */
  isLocationOpen(locId: string): boolean {
    const loc = this.findLocation(locId);
    if (!loc) return false;
    return this.day >= loc.openDay;
  }

  /** 地点开放天数（找不到时按第 1 天）。 */
  openDayFor(locId: string): number {
    const loc = this.findLocation(locId);
    return loc ? loc.openDay : 1;
  }

  travel(locId: string): boolean {
    if (this.phase !== 'map' && this.phase !== 'location') return false;
    if (this.bannedToday.includes(locId)) return false;
    const loc = this.findLocation(locId);
    if (!loc) return false;
    if (!this.isLocationOpen(locId)) return false;

    const cost = this.travelCost(locId);
    this.stamina -= cost;
    this.minute += this.cfg.travelMinutes;
    this.location = locId;
    this.phase = 'location';
    this.stats.locationVisits[locId] = (this.stats.locationVisits[locId] ?? 0) + 1;

    if (this.stamina <= 0) {
      this.collapse();
      return true;
    }

    this.checkMidnight();
    return true;
  }

  goldChance(holdSec: number, boxId: string): number {
    const box = this.findBox(boxId);
    if (!box || !this.location) return 0;
    const clampHold = Math.min(Math.max(0, holdSec), this.cfg.maxHoldSec);
    let goodP = 0;
    let rareP = 0;
    let epicP = 0;
    for (const step of this.cfg.holdCurve) {
      if (step.minSec <= clampHold) {
        goodP = step.good;
        rareP = step.rare;
        epicP = step.epic;
      } else break;
    }

    const locId = this.location;
    const loc = this.findLocation(locId);
    if (!loc) return 0;
    const phaseDef = this.currentPhaseDef();
    let mul = loc.lootRate * phaseDef.lootMul;
    if (this.fortune?.effect === 'lootUp' && this.fortuneLocation === locId) {
      mul *= 1 + this.cfg.fortuneEffects.lootUp;
    }
    if (this.catLuck > 0) {
      mul *= 1 + this.cfg.catLuckMul;
    }
    if (this.mood < this.cfg.moodGoldLow.threshold) {
      mul *= this.cfg.moodGoldLow.mul;
    } else if (this.mood >= this.cfg.moodGoldHigh.threshold) {
      mul *= this.cfg.moodGoldHigh.mul;
    }

    rareP *= mul;
    epicP *= mul;
    rareP = Math.min(1, Math.max(0, rareP));
    epicP = Math.min(1, Math.max(0, epicP));
    return Math.min(1, rareP + epicP);
  }

  glowFor(holdSec: number, boxId: string): 'white' | 'blue' | 'gold' | 'rainbow' {
    const box = this.findBox(boxId);
    if (!box || !this.location) return 'white';
    const clampHold = Math.min(Math.max(0, holdSec), this.cfg.maxHoldSec);
    let goodP = 0;
    let rareP = 0;
    let epicP = 0;
    for (const step of this.cfg.holdCurve) {
      if (step.minSec <= clampHold) {
        goodP = step.good;
        rareP = step.rare;
        epicP = step.epic;
      } else break;
    }

    const locId = this.location;
    const loc = this.findLocation(locId);
    if (!loc) return 'white';
    const phaseDef = this.currentPhaseDef();
    let mul = loc.lootRate * phaseDef.lootMul;
    if (this.fortune?.effect === 'lootUp' && this.fortuneLocation === locId) {
      mul *= 1 + this.cfg.fortuneEffects.lootUp;
    }
    if (this.catLuck > 0) {
      mul *= 1 + this.cfg.catLuckMul;
    }
    if (this.mood < this.cfg.moodGoldLow.threshold) {
      mul *= this.cfg.moodGoldLow.mul;
    } else if (this.mood >= this.cfg.moodGoldHigh.threshold) {
      mul *= this.cfg.moodGoldHigh.mul;
    }

    goodP *= mul;
    rareP *= mul;
    epicP *= mul;
    if (box.size === 'big') {
      goodP += this.cfg.bigBoxBonusGood;
    }
    goodP = Math.min(1, Math.max(0, goodP));
    rareP = Math.min(1, Math.max(0, rareP));
    epicP = Math.min(1, Math.max(0, epicP));

    if (epicP > 0) return 'rainbow';
    if (rareP > 0) return 'gold';
    if (goodP > 0) return 'blue';
    return 'white';
  }

  dig(boxId: string, holdSec: number): DigResult {
    if (this.phase !== 'location' || this.location == null) {
      return { ok: false, reason: '当前不能挖', items: [], mishap: false, glow: 'white', staminaCost: 0, quip: '' };
    }
    const locId = this.location;
    const boxes = this.boxes.get(locId) ?? [];
    const box = boxes.find((b) => b.id === boxId);
    if (!box) {
      return { ok: false, reason: '盒子不存在', items: [], mishap: false, glow: 'white', staminaCost: 0, quip: '' };
    }
    if (box.opened) {
      return { ok: false, reason: '盒子已经被掏过了', items: [], mishap: false, glow: 'white', staminaCost: 0, quip: '' };
    }

    const clampHold = Math.min(Math.max(0, holdSec), this.cfg.maxHoldSec);
    const staminaCost = this.cfg.digStamina[box.size] + clampHold * this.cfg.holdStaminaPerSec;
    this.stamina -= staminaCost;
    this.hunger = Math.max(0, this.hunger - this.cfg.hungerPerDig);
    this.minute += this.cfg.minutesPerDig[box.size] + clampHold * this.cfg.minutesPerHoldSecond;
    box.opened = true;
    this.stats.boxesOpened++;

    if (this.hunger <= 0) {
      this.die(this.stamina <= 0 ? 'stamina' : 'starvation');
      return {
        ok: false,
        reason: '饿晕了',
        items: [],
        mishap: false,
        glow: 'white',
        staminaCost,
        quip: '',
        collapsed: false,
      };
    }

    let mishapProb = 0;
    if (clampHold > this.cfg.mishapStartSec) {
      mishapProb = (clampHold - this.cfg.mishapStartSec) * this.cfg.mishapPerSec;
    }
    if (this.fortune?.effect === 'mishapUp' && this.fortuneLocation === locId) {
      mishapProb += this.cfg.fortuneEffects.mishapUp;
    }
    if (this.raining) {
      mishapProb += this.cfg.rainMishapDelta;
    }
    mishapProb = Math.min(1, Math.max(0, mishapProb));
    const isMishap = this.rng.chance(mishapProb);

    const items: ItemInst[] = [];
    let glow: 'white' | 'blue' | 'gold' | 'rainbow' = 'white';
    let quip = '';

    if (isMishap) {
      const mishapDef = this.rng.pick(ITEMS.filter((i) => i.rarity === 'mishap'));
      items.push({ uid: this.nextUid++, itemId: mishapDef.id });
      this.recordAcquiredItem(mishapDef);
      this.mood = Math.max(0, this.mood + this.cfg.mishapMood);
      quip = this.makeMishapQuip();
    } else {
      const itemCount = box.size === 'big'
        ? this.rng.int(this.cfg.itemsPerBox.big[0], this.cfg.itemsPerBox.big[1])
        : this.cfg.itemsPerBox.small[0];

      const day1Guarantee = this.day === 1 && this.cfg.day1GuaranteeGood && box.size === 'big' && !this.dayHasGoodOrAbove;
      const fortuneGuarantee =
        this.fortune?.effect === 'bigGuaranteeGood' &&
        this.fortuneLocation === locId &&
        box.size === 'big' &&
        !this.fortuneGuaranteeUsed;
      const needGuarantee = day1Guarantee || fortuneGuarantee;
      let guaranteedFulfilled = false;

      for (let i = 0; i < itemCount; i++) {
        let rarity = this.rollRarity(clampHold, box.size, locId);
        if (rarity === 'common' && needGuarantee && !guaranteedFulfilled) {
          rarity = 'good';
        }
        if (rarity === 'good' || rarity === 'rare' || rarity === 'epic') {
          this.dayHasGoodOrAbove = true;
          if (needGuarantee && rarity === 'good') {
            guaranteedFulfilled = true;
          }
        }
        if (rarity === 'rare' || rarity === 'epic') {
          this.mood = Math.min(this.cfg.maxMood, this.mood + this.cfg.rareMood);
        }

        const def = this.pickItemByRarity(rarity, locId);
        items.push({ uid: this.nextUid++, itemId: def.id });
        this.recordAcquiredItem(def);
        if (def.edible) {
          this.todayEdibleSeen.push(def.id);
        }
        if (rarity === 'epic') {
          glow = 'rainbow';
        } else if (rarity === 'rare' && glow !== 'rainbow') {
          glow = 'gold';
        } else if (rarity === 'good' && glow === 'white') {
          glow = 'blue';
        }
      }

      if (needGuarantee && guaranteedFulfilled) {
        if (fortuneGuarantee) {
          this.fortuneGuaranteeUsed = true;
        }
      }
      quip = this.makeQuip(items);
    }

    if (this.catLuck > 0) {
      this.catLuck--;
    }

    this.floor.push(...items);

    let event: PendingEvent | undefined;
    let collapsed = false;

    if (!isMishap && this.rng.chance(this.cfg.eventChancePerDig)) {
      event = this.tryTriggerEvent(locId);
      if (event) {
        this.pendingEvent = event;
        this.phase = 'event';
      }
    }

    if (this.stamina <= 0) {
      this.collapse();
      collapsed = true;
      event = undefined;
      this.pendingEvent = null;
    } else {
      this.checkMidnight();
      if ((this.phase as Phase) === 'collapsed') {
        collapsed = true;
        event = undefined;
      }
    }

    return {
      ok: true,
      items,
      mishap: isMishap,
      glow,
      staminaCost,
      quip,
      event,
      collapsed,
    };
  }

  resolveEvent(optionIndex: number, minigameWin: boolean = false): void {
    if (this.phase !== 'event' || !this.pendingEvent) return;
    this.lastEventNotice = '';
    this.lastPatrolWalkKept = null;
    const ev = this.pendingEvent;
    const locId = this.location;
    this.pendingEvent = null;

    if (!locId) {
      this.phase = 'map';
      return;
    }

    switch (ev.id) {
      case 'patrol': {
        if (optionIndex === 0) {
          // 礼貌离开只是今天先离开这里，不算被抓：不没收背包、不结束本局。
          this.stamina = Math.max(0, this.stamina - this.cfg.patrolLeaveStamina);
          this.bannedToday.push(locId);
          this.phase = 'map';
        } else {
          this.stats.pretendWalkCount++;
          if (this.rng.chance(0.5)) {
            this.lastPatrolWalkKept = true;
            this.phase = 'location';
          } else {
            this.lastPatrolWalkKept = false;
            this.stats.securityEncounters++;
            this.securityChasedToday++;
            this.mood = Math.max(0, this.mood + this.cfg.patrolMood);
            this.bannedToday.push(locId);
            // 装作散步失败：背包被没收，本地点今天不能再进；人还活着。
            this.clearBag();
            this.phase = 'map';
          }
        }
        break;
      }
      case 'guard': {
        this.stats.securityEncounters++;
        this.securityChasedToday++;
        this.bannedToday.push(locId);
        // 小区保安只把人请出小区，不没收背包、不结束本局。
        this.phase = 'map';
        break;
      }
      case 'rival': {
        if (optionIndex === 0) {
          this.mood = Math.max(0, this.mood + this.cfg.rivalYieldMood);
          this.phase = 'location';
        } else {
          if (minigameWin) {
            const boxes = this.boxes.get(locId) ?? [];
            boxes.push({ id: `box_extra_${this.nextUid++}`, size: 'big', opened: false });
            this.phase = 'location';
          } else {
            this.stamina = Math.max(0, this.stamina - this.cfg.rivalLoseStamina);
            this.phase = 'location';
            if (this.stamina <= 0) {
              this.collapse();
            }
          }
        }
        break;
      }
      case 'auntie': {
        this.hunger = Math.min(this.cfg.maxHunger, this.hunger + this.cfg.auntieHunger);
        this.mood = Math.min(this.cfg.maxMood, this.mood + this.cfg.auntieMood);
        this.phase = 'location';
        break;
      }
      case 'delivery': {
        this.hunger = Math.min(this.cfg.maxHunger, this.hunger + this.cfg.deliveryHunger);
        this.phase = 'location';
        break;
      }
      case 'wallet': {
        this.money += this.cfg.walletMoney;
        this.mood = Math.min(this.cfg.maxMood, this.mood + this.cfg.walletMood);
        this.phase = 'location';
        break;
      }
      case 'cat': {
        if (optionIndex === 0) {
          // 只消耗背包里的一份食物，不加玩家饱腹
          const foodUid = this.findBagEdibleUid();
          if (foodUid != null) {
            const idx = this.bag.findIndex((p) => p.uid === foodUid);
            if (idx >= 0) this.bag.splice(idx, 1);
            this.catLuck = this.cfg.catLuckDigs;
            this.stats.catFeeds++;
          } else {
            this.lastEventNotice = '包里没吃的';
          }
        }
        this.phase = 'location';
        break;
      }
      case 'rain': {
        this.raining = true;
        this.phase = 'location';
        break;
      }
    }
  }

  /** 「装作散步」结果文案：必须跟 resolveEvent 实际结算一致。 */
  public pretendWalkResultText(): string {
    return this.lastPatrolWalkKept === true
      ? '大叔笑着走了'
      : '大叔指路请你走，背包被没收';
  }

  canPlace(itemCells: number, x: number, y: number, rotated: boolean): boolean {
    const w = itemCells === 2 ? (rotated ? 1 : 2) : 1;
    const h = itemCells === 2 ? (rotated ? 2 : 1) : 1;
    if (x < 0 || y < 0 || x + w > this.bagW || y + h > this.bagH) return false;
    for (const p of this.bag) {
      if (this.rectsOverlap(x, y, w, h, p.x, p.y, p.w, p.h)) return false;
    }
    return true;
  }

  placeFromFloor(uid: number, x: number, y: number, rotated: boolean = false): boolean {
    const idx = this.floor.findIndex((i) => i.uid === uid);
    if (idx === -1) return false;
    const item = this.floor[idx];
    const def = this.findItemDef(item.itemId);
    if (!def) return false;
    if (!this.canPlace(def.cells, x, y, rotated)) return false;

    const w = def.cells === 2 ? (rotated ? 1 : 2) : 1;
    const h = def.cells === 2 ? (rotated ? 2 : 1) : 1;
    this.floor.splice(idx, 1);
    this.bag.push({ uid: item.uid, itemId: item.itemId, x, y, w, h, scratchValue: item.scratchValue });
    return true;
  }

  moveToFloor(uid: number): boolean {
    const idx = this.bag.findIndex((p) => p.uid === uid);
    if (idx === -1) return false;
    const p = this.bag[idx];
    this.bag.splice(idx, 1);
    this.floor.push({ uid: p.uid, itemId: p.itemId, scratchValue: p.scratchValue });
    return true;
  }

  discard(uid: number): boolean {
    const idx = this.floor.findIndex((i) => i.uid === uid);
    if (idx === -1) return false;
    this.floor.splice(idx, 1);
    return true;
  }

  eat(uid: number): boolean {
    let idx = this.floor.findIndex((i) => i.uid === uid);
    let isBag = false;
    if (idx === -1) {
      idx = this.bag.findIndex((p) => p.uid === uid);
      isBag = true;
    }
    if (idx === -1) return false;

    const item = isBag ? this.bag[idx] : this.floor[idx];
    const def = this.findItemDef(item.itemId);
    if (!def || !def.edible) return false;

    let foodMul = 1;
    if (this.fortune?.effect === 'foodUp') {
      foodMul = 1 + this.cfg.fortuneEffects.foodUp;
    }
    if (def.hunger) {
      this.hunger = Math.min(this.cfg.maxHunger, this.hunger + Math.round(def.hunger * foodMul));
    }
    if (def.stamina) {
      this.stamina = Math.min(this.maxStamina, this.stamina + def.stamina);
    }
    if (def.mood) {
      this.mood = Math.min(this.cfg.maxMood, this.mood + def.mood);
    }

    if (isBag) {
      this.bag.splice(idx, 1);
    } else {
      this.floor.splice(idx, 1);
    }
    this.stats.foodEaten++;
    return true;
  }

  leaveLocation(): void {
    if (this.location == null) return;
    this.clearFloor('离开时，没装的东西落在了原地');
    this.location = null;
    this.phase = 'map';
  }

  goHome(): boolean {
    if (this.phase === 'won' || this.phase === 'lost' || this.phase === 'collapsed') return false;
    if (this.location == null) {
      if (this.phase === 'home') return true;
      this.phase = 'home';
      this.sellBagAndReport();
      return true;
    }

    const cost = this.homeCost();
    if (this.stamina < cost) return false;
    this.stamina -= cost;
    this.location = null;
    this.phase = 'home';
    this.stats.homeVisits++;
    this.clearFloor('回家路上，面前的宝贝不见了');
    this.sellBagAndReport();
    return true;
  }

  endDayAway(): void {
    if (!this.goHome()) {
      this.collapse();
    }
  }

  buyFood(): boolean {
    if (this.phase !== 'home') return false;
    const price = this.foodPrice;
    if (this.money < price) return false;
    this.money -= price;
    this.hunger = Math.min(this.cfg.maxHunger, this.hunger + this.cfg.foodHunger);
    return true;
  }

  expandBag(): boolean {
    if (this.bagLevel >= this.cfg.bagSizes.length - 1) return false;
    const cost = this.cfg.bagSizes[this.bagLevel + 1].cost;
    if (this.money < cost) return false;
    this.money -= cost;
    this.bagLevel++;
    return true;
  }

  upgradeHome(): boolean {
    if (this.homeLevel >= this.cfg.homeLevels.length - 1) return false;
    const cost = this.cfg.homeLevels[this.homeLevel + 1].cost;
    if (this.money < cost) return false;
    this.money -= cost;
    this.homeLevel++;
    return true;
  }

  /** 结算卡三个功能格子的价格/灰色/「还差 ¥X」统一由这里给出。 */
  homeActionQuotes(): HomeActionQuote[] {
    const bagMaxed = this.bagLevel >= this.cfg.bagSizes.length - 1;
    const bagPrice = bagMaxed ? 0 : this.cfg.bagSizes[this.bagLevel + 1].cost;
    const homeMaxed = this.homeLevel >= this.cfg.homeLevels.length - 1;
    const homePrice = homeMaxed ? 0 : this.cfg.homeLevels[this.homeLevel + 1].cost;
    return [
      this.makeHomeQuote('food', '买吃的', 'slot_food', 'slot_food_gray', this.foodPrice, false),
      this.makeHomeQuote('bag', '扩背包', 'slot_bag', 'slot_bag_gray', bagPrice, bagMaxed),
      this.makeHomeQuote('home', '升级落脚点', 'slot_home', 'slot_home_gray', homePrice, homeMaxed),
    ];
  }

  private makeHomeQuote(
    action: HomeAction,
    name: string,
    icon: string,
    grayIcon: string,
    price: number,
    maxed: boolean,
  ): HomeActionQuote {
    const aff = maxed
      ? { affordable: false, shortfall: 0, shortfallText: '' }
      : affordabilityOf(price, this.money);
    return {
      action,
      name,
      icon,
      grayIcon,
      price,
      maxed,
      affordable: aff.affordable,
      shortfall: aff.shortfall,
      shortfallText: aff.shortfallText,
    };
  }

  /** 按当天情境给吐槽池打标签。 */
  private roastTags(ctx: RoastContext): string[] {
    const tags: string[] = [];
    if (ctx.soldNothing || ctx.income <= 0) tags.push('empty');
    else if (ctx.income >= this.cfg.roastIncomeGood) tags.push('rich');
    else tags.push('poor');
    if (ctx.bestItem && ctx.bestItem !== '无') tags.push('best');
    if (ctx.bestValue >= this.cfg.roastLuckyValue) tags.push('lucky');
    if (ctx.hunger <= this.cfg.roastHungerLow) tags.push('hungry');
    if (ctx.stamina <= this.cfg.roastStaminaLow) tags.push('tired');
    if (ctx.homeLevel > 0) tags.push('home');
    tags.push('generic');
    return tags;
  }

  /**
   * 选一条当天吐槽：优先同情境且本局未用过，其次任意未用过；
   * 全部用完后清空记录再选，保证确定性（只用 this.rng）。
   */
  public selectDayRoast(ctx: RoastContext): DayRoastDef {
    const tags = this.roastTags(ctx);
    const specific = DAY_ROASTS.filter(
      (r) => r.tags.some((t) => t !== 'generic' && tags.includes(t)),
    );
    const eligible = specific.length > 0 ? specific : DAY_ROASTS.filter((r) => r.tags.includes('generic'));
    const used = new Set(this.usedRoasts);
    let pool = eligible.filter((r) => !used.has(r.id));
    if (pool.length === 0) {
      const anyUnused = DAY_ROASTS.filter((r) => !used.has(r.id));
      if (anyUnused.length > 0) {
        pool = anyUnused;
      } else {
        this.usedRoasts = [];
        pool = eligible.length > 0 ? eligible : DAY_ROASTS;
      }
    }
    const def = this.rng.pick(pool.length > 0 ? pool : DAY_ROASTS);
    this.usedRoasts.push(def.id);
    return def;
  }

  /** 把吐槽模板里的占位符换成当天真实数据。 */
  public formatDayRoast(def: DayRoastDef, ctx: RoastContext): string {
    return def.text
      .replace(/\{best\}/g, ctx.bestItem || '无')
      .replace(/\{income\}/g, ctx.income.toFixed(2))
      .replace(/\{hunger\}/g, String(Math.max(0, Math.round(ctx.hunger))))
      .replace(/\{stamina\}/g, String(Math.max(0, Math.round(ctx.stamina))))
      .replace(/\{home\}/g, ctx.homeName);
  }

  sleep(): void {
    if (this.phase !== 'home') return;
    this.stats.nightsSlept++;

    // 统一在逻辑层 roll，并把结果保留下来给 UI 播动画
    this.lastNightWarmth = this.rng.chance(this.cfg.nightWarmthChance);
    if (this.lastNightWarmth) {
      this.hunger = Math.min(this.cfg.maxHunger, this.hunger + this.cfg.nightWarmthHunger);
      this.mood = Math.min(this.cfg.maxMood, this.mood + this.cfg.warmthMood);
    }

    this.hunger -= this.dailyHunger;
    this.mood += this.cfg.moodPerDay;
    this.mood = Math.max(0, Math.min(this.cfg.maxMood, this.mood));
    this.stamina = this.maxStamina;

    this.history.push({ day: this.day, money: this.money, hunger: this.hunger, stamina: this.stamina });

    if (this.hunger <= 0) {
      this.die('starvation');
      return;
    }
    if (this.day === this.cfg.totalDays) {
      this.stats.daysSurvived = this.day;
      this.awardedTitle = this.computeTitle();
      this.phase = 'won';
      return;
    }

    this.day += 1;
    this.minute = this.cfg.dayStartMinute;
    this.floor = [];
    this.bag = [];
    this.bannedToday = [];
    this.securityChasedToday = 0;
    this.raining = false;
    this.catLuck = 0;
    this.dayHasGoodOrAbove = false;
    this.fortuneGuaranteeUsed = false;
    this.todayEdibleSeen = [];
    this.pendingEvent = null;
    this.lastDayReport = null;
    this.dailySpecial = null;
    this.dailySpecialDay = 0;
    this.drawFortune();
    this.phase = 'fortune';
  }

  collapse(): void {
    if (this.phase === 'won' || this.phase === 'lost') return;
    this.stats.collapses++;

    const spot = this.chooseSleepSpot();
    const lostItems: string[] = [];
    // 至少丢 1 件（有物品时），其余按比例向下取整
    const loseCount =
      this.bag.length === 0
        ? 0
        : Math.max(1, Math.floor(this.bag.length * this.cfg.collapseLoseRatio));
    for (let i = 0; i < loseCount && this.bag.length > 0; i++) {
      const idx = Math.floor(this.rng.next() * this.bag.length);
      const removed = this.bag.splice(idx, 1)[0];
      const def = this.findItemDef(removed.itemId);
      if (def) lostItems.push(def.name);
    }

    this.clearFloor('倒下后，面前的宝贝消失了');

    this.hunger -= this.dailyHunger;
    this.mood += this.cfg.moodPerDay;
    this.mood = Math.max(0, Math.min(this.cfg.maxMood, this.mood));

    if (this.hunger <= 0) {
      // 这一局是被「倒下过夜」结束的，死因记为 collapse（体力/饥饿只是诱因）
      this.die('collapse');
      return;
    }

    let finalSpot = spot;
    let staminaNext = spot.stamina;
    if (spot.cost > 0) {
      if (this.money >= spot.cost) {
        this.money -= spot.cost;
      } else {
        finalSpot = SLEEP_SPOTS[0];
        staminaNext = finalSpot.stamina;
        if (this.rng.chance(this.cfg.benchGuardChance)) {
          staminaNext -= this.cfg.benchGuardStamina;
        }
      }
    } else {
      if (finalSpot.id === 'bench' && this.rng.chance(this.cfg.benchGuardChance)) {
        staminaNext -= this.cfg.benchGuardStamina;
      }
    }
    staminaNext = Math.max(0, staminaNext);
    this.stamina = staminaNext;

    this.lastCollapse = {
      day: this.day,
      spot: finalSpot.id,
      spotName: finalSpot.name,
      lostItems,
      staminaNextDay: staminaNext,
      text: this.makeCollapseText(finalSpot.name, lostItems),
    };
    this.phase = 'collapsed';
    this.pendingEvent = null;
  }

  wakeUp(): void {
    if (this.phase !== 'collapsed') return;
    if (this.day === this.cfg.totalDays) {
      this.stats.daysSurvived = this.day;
      this.awardedTitle = this.computeTitle();
      this.phase = 'won';
      return;
    }

    this.history.push({ day: this.day, money: this.money, hunger: this.hunger, stamina: this.stamina });
    this.day += 1;
    this.minute = this.cfg.dayStartMinute;
    this.floor = [];
    // 倒下时已经只丢了一半，剩下的物品留到第二天，回家时再卖
    this.bannedToday = [];
    this.securityChasedToday = 0;
    this.raining = false;
    this.catLuck = 0;
    this.dayHasGoodOrAbove = false;
    this.fortuneGuaranteeUsed = false;
    this.todayEdibleSeen = [];
    this.pendingEvent = null;
    this.lastCollapse = null;
    this.location = null;
    this.dailySpecial = null;
    this.dailySpecialDay = 0;
    this.drawFortune();
    this.phase = 'fortune';
  }

  private drawFortuneInternal(): void {
    const previousFortune = this.fortune;
    let goodWeight = this.cfg.fortuneWeights.good;
    let mehWeight = this.cfg.fortuneWeights.meh;
    let badWeight = this.cfg.fortuneWeights.bad;

    if (previousFortune?.effect === 'nextGoodUp') {
      goodWeight += this.cfg.fortuneEffects.nextGoodUp;
    }

    const phaseDef = this.currentPhaseDef();
    if (phaseDef.badFortuneBonus > 0) {
      badWeight += phaseDef.badFortuneBonus;
    }

    const total = goodWeight + mehWeight + badWeight;
    const roll = this.rng.next() * total;
    let tier: FortuneTier;
    if (roll < goodWeight) {
      tier = 'good';
    } else if (roll < goodWeight + mehWeight) {
      tier = 'meh';
    } else {
      tier = 'bad';
    }

    const candidates = FORTUNES.filter((f) => f.tier === tier);
    const fortune = this.rng.pick(candidates);

    this.fortune = fortune;
    if (fortune.needsLocation) {
      // 签面提示只能指向当天已经开放的地点，不能把玩家引到还没解锁的地方。
      const openLocations = LOCATIONS.filter((loc) => this.isLocationOpen(loc.id));
      this.fortuneLocation = this.rng.pick(openLocations.length > 0 ? openLocations : LOCATIONS).id;
    } else {
      this.fortuneLocation = null;
    }
    this.ensureDailySpecial();
  }

  private currentPhaseDef(): PhaseDef {
    for (const phase of this.cfg.phases) {
      if (this.day >= phase.fromDay && this.day <= phase.toDay) {
        return phase;
      }
    }
    return this.cfg.phases[this.cfg.phases.length - 1];
  }

  private findLocation(id: string): LocationDef | undefined {
    return LOCATIONS.find((loc) => loc.id === id);
  }

  private findBox(boxId: string): Box | undefined {
    for (const boxes of this.boxes.values()) {
      for (const box of boxes) {
        if (box.id === boxId) {
          return box;
        }
      }
    }
    return undefined;
  }

  private rollRarity(holdSec: number, boxSize: BoxSize, locId: string): Rarity {
    const clampHold = Math.min(Math.max(0, holdSec), this.cfg.maxHoldSec);
    let goodP = 0;
    let rareP = 0;
    let epicP = 0;

    for (const step of this.cfg.holdCurve) {
      if (step.minSec <= clampHold) {
        goodP = step.good;
        rareP = step.rare;
        epicP = step.epic;
      } else {
        break;
      }
    }

    const loc = this.findLocation(locId);
    if (!loc) return 'common';
    const phaseDef = this.currentPhaseDef();
    let mul = loc.lootRate * phaseDef.lootMul;

    if (this.fortune?.effect === 'lootUp' && this.fortuneLocation === locId) {
      mul *= 1 + this.cfg.fortuneEffects.lootUp;
    }

    if (this.catLuck > 0) {
      mul *= 1 + this.cfg.catLuckMul;
    }

    if (this.mood < this.cfg.moodGoldLow.threshold) {
      mul *= this.cfg.moodGoldLow.mul;
    } else if (this.mood >= this.cfg.moodGoldHigh.threshold) {
      mul *= this.cfg.moodGoldHigh.mul;
    }

    goodP *= mul;
    rareP *= mul;
    epicP *= mul;

    if (boxSize === 'big') {
      goodP += this.cfg.bigBoxBonusGood;
    }

    goodP = Math.min(1, Math.max(0, goodP));
    rareP = Math.min(1, Math.max(0, rareP));
    epicP = Math.min(1, Math.max(0, epicP));

    const roll = this.rng.next();
    if (roll < epicP) {
      return 'epic';
    } else if (roll < epicP + rareP) {
      return 'rare';
    } else if (roll < epicP + rareP + goodP) {
      return 'good';
    } else {
      return 'common';
    }
  }

  private pickItemByRarity(rarity: Rarity, locId: string): ItemDef {
    const candidates = ITEMS.filter((item) => item.rarity === rarity);
    if (candidates.length === 0) return ITEMS[0];

    const weights = candidates.map((item) => {
      return item.locations?.includes(locId) ? 3 : 1;
    });

    let totalWeight = 0;
    for (const weight of weights) {
      totalWeight += weight;
    }

    let roll = this.rng.next() * totalWeight;
    for (let i = 0; i < candidates.length; i++) {
      if (roll < weights[i]) {
        return candidates[i];
      }
      roll -= weights[i];
    }

    return candidates[candidates.length - 1];
  }

  private makeQuip(items: ItemInst[]): string {
    if (items.length === 0) return '';
    const names = items.map((i) => this.findItemDef(i.itemId)?.name ?? '未知');
    const joined = names.join('、');
    return `掏出：${joined}，深圳欢迎你`;
  }

  private makeMishapQuip(): string {
    const quips = [
      '手一抖，掏出了一团糟糕',
      '猫主子给了你一巴掌',
      '今天的垃圾桶格外暴躁',
      '你被垃圾教育了',
    ];
    return this.rng.pick(quips);
  }

  private tryTriggerEvent(locId: string): PendingEvent | undefined {
    const available: EventDef[] = [];
    const weights: number[] = [];

    for (const ev of EVENTS) {
      let weight = ev.weight;
      let allowed = true;

      if (ev.id === 'patrol') {
        const loc = this.findLocation(locId);
        if (loc) {
          weight *= loc.danger;
        }
        weight *= 1 + this.currentPhaseDef().patrolBonus;
        if (this.fortune?.effect === 'patrolX2' && this.fortuneLocation === locId) {
          weight *= this.cfg.fortuneEffects.patrolX2;
        }
        if (
          this.dailySpecial?.effect === 'baishizhouBoxBonus' &&
          this.dailySpecial.boxBonus?.locationId === locId &&
          this.dailySpecial.patrolMul != null
        ) {
          weight *= this.dailySpecial.patrolMul;
        }
      }

      if (ev.id === 'rival' && !this.currentPhaseDef().rivalEnabled) {
        allowed = false;
      }

      if (ev.id === 'rain' && this.raining) {
        allowed = false;
      }

      if (allowed && weight > 0) {
        available.push(ev);
        weights.push(weight);
      }
    }

    if (available.length === 0) return undefined;

    let totalWeight = 0;
    for (const weight of weights) {
      totalWeight += weight;
    }

    let roll = this.rng.next() * totalWeight;
    for (let i = 0; i < available.length; i++) {
      if (roll < weights[i]) {
        const ev = available[i];
        return { id: ev.id, name: ev.name, options: [...ev.options] };
      }
      roll -= weights[i];
    }

    return undefined;
  }

  private findBagEdibleUid(): number | null {
    for (const item of this.bag) {
      const def = this.findItemDef(item.itemId);
      if (def?.edible) return item.uid;
    }
    return null;
  }

  private rectsOverlap(
    x1: number, y1: number, w1: number, h1: number,
    x2: number, y2: number, w2: number, h2: number,
  ): boolean {
    return x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2;
  }

  private clearFloor(text: string): void {
    if (this.floor.length > 0) {
      this.log.push(`${text}，${this.floor.length} 件物品消失`);
      this.floor = [];
    }
  }

  /** 对外只读：某件物品在今日限定下的实际卖价。 */
  public sellPriceFor(itemId: string, basePrice?: number): number {
    const def = this.findItemDef(itemId);
    if (!def) return basePrice ?? 0;
    return this.applyDailySellMul(def, basePrice ?? def.price);
  }

  private applyDailySellMul(def: ItemDef, price: number): number {
    const special = this.dailySpecial;
    if (!special || special.sellMul == null) return price;
    if (special.effect === 'electronicsSellMul' && def.category === 'electronics') {
      return price * special.sellMul;
    }
    if (special.effect === 'cardboardSellMul' && def.category === 'cardboard') {
      return price * special.sellMul;
    }
    return price;
  }

  private recordAcquiredItem(def: ItemDef): void {
    this.stats.itemsCollected++;
    if (def.category === 'cardboard') this.stats.cardboardFound++;
    if (def.category === 'electronics') this.stats.electronicsFound++;
    const value = def.priceMax ?? def.price;
    if (value > this.stats.bestItemValue) {
      this.stats.bestItemValue = value;
      this.stats.bestItemName = def.name;
    }
  }

  private sellBagAndReport(): void {
    let income = 0;
    const soldItems: string[] = [];
    let bestItem: string | undefined;
    let bestItemId: string | undefined;
    let bestPrice = 0;
    let foundBest = false;

    for (const item of this.bag) {
      const def = this.findItemDef(item.itemId);
      if (!def) continue;

      let price = def.price;
      if (def.id === 'scratch_card') {
        price = this.revealScratchValue();
        item.scratchValue = price;
      } else if (def.priceMax != null && def.priceMax > def.price) {
        price = def.price;
      }
      price = this.applyDailySellMul(def, price);

      income += price;
      soldItems.push(def.name);

      if (!foundBest || price > bestPrice) {
        bestPrice = price;
        bestItem = def.name;
        bestItemId = def.id;
        foundBest = true;
      }
      if (price > this.stats.bestItemValue) {
        this.stats.bestItemValue = price;
        this.stats.bestItemName = def.name;
      }
    }

    this.money += income;
    this.totalIncome += income;
    this.stats.totalIncome += income;
    this.bag = [];

    const ctx: RoastContext = {
      income,
      bestItem: bestItem ?? '无',
      bestValue: foundBest ? bestPrice : 0,
      hunger: this.hunger,
      stamina: this.stamina,
      homeLevel: this.homeLevel,
      homeName: this.cfg.homeLevels[this.homeLevel].name,
      soldNothing: soldItems.length === 0,
    };
    const roastDef = this.selectDayRoast(ctx);

    const report: DayReport = {
      day: this.day,
      income,
      soldItems,
      bestItem,
      bestItemId,
      bestItemPrice: foundBest ? bestPrice : 0,
      hungerLeft: this.hunger,
      staminaLeft: this.stamina,
      roast: this.formatDayRoast(roastDef, ctx),
      roastId: roastDef.id,
      // 兼容旧日结算：保留「最离谱 + 收入」信息，同时把当天吐槽带在 quip 里。
      quip: `${this.formatDayRoast(roastDef, ctx)}（${bestItem ?? '无'}，收入 ¥\u00A0${income.toFixed(2)}）`,
    };

    if (this.lastDayReport?.warmth) {
      report.warmth = true;
    }

    this.lastDayReport = report;
    this.log.push(`第 ${this.day} 天卖出：${soldItems.join('、') || '无'}，收入 ¥${income.toFixed(2)}`);
  }

  private revealScratchValue(): number {
    const roll = this.rng.next() * 100;
    if (roll < 60) {
      return 0;
    } else if (roll < 90) {
      return this.rng.int(5, 20);
    } else if (roll < 99) {
      return this.rng.int(30, 80);
    } else {
      return 200;
    }
  }

  private makeDayQuip(soldItems: string[], income: number, bestItem?: string): string {
    if (soldItems.length === 0) {
      return '今天一无所获，深圳的天空依旧灰蒙蒙';
    }
    // 和结算卡的「最离谱」用同一件物品；金额用不换行空格连成一个整体
    const best = bestItem ?? soldItems[soldItems.length - 1];
    return `今日战绩：${best}，收入 ¥\u00A0${income.toFixed(2)}，深圳欢迎你`;
  }

  private chooseSleepSpot(): SleepSpotDef {
    let roll = this.rng.next();
    for (const spot of SLEEP_SPOTS) {
      if (roll < spot.prob) {
        return spot;
      }
      roll -= spot.prob;
    }
    return SLEEP_SPOTS[0];
  }

  /** 按实际死因抽一句文案；{n}/{day}/{boxes} 用本局真实统计替换。 */
  public deathLineFor(cause: DeathCauseId): string {
    // 当天先被保安赶过、随后饿死/累死时，死亡页改用「被保安…」文案；
    // 倒下（collapse）仍然用倒下文案。
    const textCause: DeathCauseId =
      this.securityChasedToday > 0 && (cause === 'starvation' || cause === 'stamina')
        ? 'security'
        : cause;
    let lines = DEATH_LINES[textCause] ?? DEATH_LINES.starvation;
    if (textCause === 'security') {
      // 「第{n}次装作散步」只在真的选过这个选项时才有意义；
      // 只被小区保安请出去过的局，不能冒出「第0次/第1次装作散步」。
      const pretend = Math.max(0, this.stats.pretendWalkCount);
      const matched = lines.filter((line) => !line.includes('{n}') || pretend > 0);
      if (matched.length > 0) lines = matched;
    }
    const raw = this.rng.pick(lines);
    return raw
      // {n} 与「装作散步」这个动作绑定，不用保安总次数冒充。
      .replace(/\{n\}/g, String(Math.max(0, this.stats.pretendWalkCount)))
      .replace(/\{day\}/g, String(this.day))
      .replace(/\{boxes\}/g, String(this.stats.boxesOpened))
      .replace(/\{best\}/g, this.stats.bestItemName || '无');
  }

  /** 统一入口：记录真实死因、存活天数，并生成死亡页文案。 */
  private die(cause: DeathCauseId): void {
    this.stats.daysSurvived = this.day;
    this.deathCauseId = cause;
    this.deathLine = this.deathLineFor(cause);
    // 保留旧字段「饿」语义，避免旧逻辑/文案依赖失效。
    this.deathCause = cause === 'starvation' ? `饿晕：${this.deathLine}` : this.deathLine;
    this.phase = 'lost';
  }

  /** 通关称号：按 priority 从上到下取第一个满足条件的规则，最后一个是保底。 */
  public computeTitle(): SurvivalTitleDef {
    const sorted = [...SURVIVAL_TITLES].sort((a, b) => b.priority - a.priority);
    for (const title of sorted) {
      if (this.matchesTitle(title)) return title;
    }
    return sorted[sorted.length - 1];
  }

  /** 结算并保存称号（供认证页显示）。 */
  public awardTitle(): SurvivalTitleDef {
    this.awardedTitle = this.computeTitle();
    return this.awardedTitle;
  }

  private matchesTitle(title: SurvivalTitleDef): boolean {
    const rule = title.rule;
    if (rule.kind === 'always') return true;
    if (rule.kind === 'stat') {
      return this.stats[rule.stat] >= rule.min;
    }
    if (rule.kind === 'locationVisits') {
      return (this.stats.locationVisits[rule.locationId] ?? 0) >= rule.min;
    }
    return false;
  }

  private makeCollapseText(spotName: string, lostItems: string[]): string {
    if (lostItems.length === 0) {
      return `你在${spotName}睡着了，醒来还是身无分文，但至少没丢东西。`;
    }
    const names = lostItems.join('、');
    return `你在${spotName}睡着了，醒来少了 ${lostItems.length} 样东西：${names}。`;
  }

  private findItemDef(id: string): ItemDef | undefined {
    return ITEMS.find((item) => item.id === id);
  }
  private checkMidnight(): void {
    if (this.phase === 'won' || this.phase === 'lost' || this.phase === 'collapsed' || this.phase === 'home') return;
    if (this.location == null) return;
    if (this.minute < this.cfg.midnightMinute) return;

    if (this.stamina >= this.homeCost()) {
      this.goHome();
    } else {
      this.collapse();
    }
  }

}
