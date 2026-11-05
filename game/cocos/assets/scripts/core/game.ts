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
  hungerLeft: number;
  quip: string;
  warmth?: boolean;
}

export interface CollapseReport {
  day: number;
  spot: SleepSpotDef['id'];
  spotName: string;
  lostItems: string[];
  staminaNextDay: number;
  text: string;
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
  public raining: boolean;
  public catLuck: number;
  public deathCause: string;
  /** 刚结算的事件提示（例如喂猫时包里没吃的），UI 在事件结果里显示 */
  public lastEventNotice: string;
  /** 当晚是否触发夜间温情（由 sleep() 的 rng 决定，UI 只读这个结果） */
  public lastNightWarmth: boolean;
  public totalIncome: number;
  public log: string[];
  public lastDayReport: DayReport | null;
  public lastCollapse: CollapseReport | null;
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
    this.raining = false;
    this.catLuck = 0;
    this.deathCause = '';
    this.lastEventNotice = '';
    this.lastNightWarmth = false;
    this.totalIncome = 0;
    this.log = [];
    this.lastDayReport = null;
    this.lastCollapse = null;
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

  get dailyHunger(): number {
    return this.currentPhaseDef().dailyHunger;
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
    this.raining = false;
    this.catLuck = 0;
    this.deathCause = '';
    this.lastEventNotice = '';
    this.lastNightWarmth = false;
    this.totalIncome = 0;
    this.log = [];
    this.lastDayReport = null;
    this.lastCollapse = null;
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
    const loc = this.findLocation(this.location);
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
    return Math.max(5, cost);
  }

  travel(locId: string): boolean {
    if (this.phase !== 'map' && this.phase !== 'location') return false;
    if (this.bannedToday.includes(locId)) return false;
    const loc = this.findLocation(locId);
    if (!loc) return false;

    const cost = this.travelCost(locId);
    this.stamina -= cost;
    this.minute += this.cfg.travelMinutes;
    this.location = locId;
    this.phase = 'location';

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

    if (this.hunger <= 0) {
      this.phase = 'lost';
      this.deathCause = this.makeDeathCause();
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
          this.stamina = Math.max(0, this.stamina - this.cfg.patrolLeaveStamina);
          this.bannedToday.push(locId);
          this.phase = 'map';
        } else {
          if (this.rng.chance(0.5)) {
            this.phase = 'location';
          } else {
            this.mood = Math.max(0, this.mood + this.cfg.patrolMood);
            this.bannedToday.push(locId);
            // 装作散步失败被抓：背包被没收
            this.clearBag();
            this.phase = 'map';
          }
        }
        break;
      }
      case 'guard': {
        this.bannedToday.push(locId);
        // 被保安请出小区：背包没收
        this.clearBag();
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
    if (this.money < this.cfg.foodPrice) return false;
    this.money -= this.cfg.foodPrice;
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

  sleep(): void {
    if (this.phase !== 'home') return;

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
      this.phase = 'lost';
      this.deathCause = this.makeDeathCause();
      return;
    }
    if (this.day === this.cfg.totalDays) {
      this.phase = 'won';
      return;
    }

    this.day += 1;
    this.minute = this.cfg.dayStartMinute;
    this.floor = [];
    this.bag = [];
    this.bannedToday = [];
    this.raining = false;
    this.catLuck = 0;
    this.dayHasGoodOrAbove = false;
    this.fortuneGuaranteeUsed = false;
    this.todayEdibleSeen = [];
    this.pendingEvent = null;
    this.lastDayReport = null;
    this.drawFortune();
    this.phase = 'fortune';
  }

  collapse(): void {
    if (this.phase === 'won' || this.phase === 'lost') return;

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
      this.phase = 'lost';
      this.deathCause = this.makeDeathCause();
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
      this.phase = 'won';
      return;
    }

    this.history.push({ day: this.day, money: this.money, hunger: this.hunger, stamina: this.stamina });
    this.day += 1;
    this.minute = this.cfg.dayStartMinute;
    this.floor = [];
    // 倒下时已经只丢了一半，剩下的物品留到第二天，回家时再卖
    this.bannedToday = [];
    this.raining = false;
    this.catLuck = 0;
    this.dayHasGoodOrAbove = false;
    this.fortuneGuaranteeUsed = false;
    this.todayEdibleSeen = [];
    this.pendingEvent = null;
    this.lastCollapse = null;
    this.location = null;
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
      this.fortuneLocation = this.rng.pick(LOCATIONS).id;
    } else {
      this.fortuneLocation = null;
    }
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

  private sellBagAndReport(): void {
    let income = 0;
    const soldItems: string[] = [];
    let bestItem: string | undefined;
    let bestPrice = -Infinity;

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

      income += price;
      soldItems.push(def.name);

      if (price > bestPrice) {
        bestPrice = price;
        bestItem = def.name;
      }
    }

    this.money += income;
    this.totalIncome += income;
    this.bag = [];

    const report: DayReport = {
      day: this.day,
      income,
      soldItems,
      bestItem,
      hungerLeft: this.hunger,
      quip: this.makeDayQuip(soldItems, income, bestItem),
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

  private makeDeathCause(): string {
    const dayText = `第 ${this.day} 天`;
    if (this.todayEdibleSeen.length > 0) {
      const name = this.findItemDef(this.todayEdibleSeen[this.todayEdibleSeen.length - 1])?.name ?? '可吃的东西';
      return `${dayText}，舍不得吃那块${name}，饿晕了`;
    }
    const causes = [
      `${dayText}，在深圳的街头饿成了纸片人`,
      `${dayText}，以为喝西北风能饱，结果风停了`,
      `${dayText}，终于理解了什么叫“饿得前胸贴后背”`,
      `${dayText}，塑料袋翻了个遍，只找到了孤独`,
    ];
    return this.rng.pick(causes);
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
