export type Rarity = 'common' | 'good' | 'rare' | 'epic' | 'mishap';
export type BoxSize = 'small' | 'big';
export type FortuneTier = 'good' | 'meh' | 'bad';

export interface ItemDef {
  id: string;
  name: string;
  rarity: Rarity;
  cells: 1 | 2;
  price: number;
  priceMax?: number;
  edible: boolean;
  hunger?: number;
  stamina?: number;
  mood?: number;
  desc: string;
  locations?: string[];
}

export interface LocationDef {
  id: string;
  name: string;
  lootRate: number;
  danger: number;
  distance: number;
  far: boolean;
}

export interface FortuneDef {
  id: string;
  tier: FortuneTier;
  name: string;
  text: string;
  effect:
    | 'lootUp'
    | 'bigGuaranteeGood'
    | 'foodUp'
    | 'none'
    | 'nextGoodUp'
    | 'patrolX2'
    | 'mishapUp'
    | 'windy';
  needsLocation: boolean;
}

export interface EventDef {
  id: 'patrol' | 'guard' | 'rival' | 'auntie' | 'delivery' | 'wallet' | 'cat' | 'rain';
  name: string;
  weight: number;
  options: string[];
}

export interface SleepSpotDef {
  id: 'bench' | 'diner' | 'netcafe';
  name: string;
  prob: number;
  stamina: number;
  cost: number;
}

export interface HoldCurveStep {
  minSec: number;
  good: number;
  rare: number;
  epic: number;
}

export interface PhaseDef {
  fromDay: number;
  toDay: number;
  dailyHunger: number;
  lootMul: number;
  patrolBonus: number;
  rivalEnabled: boolean;
  badFortuneBonus: number;
  farTravelMul: number;
}

export interface BagSizeDef {
  w: number;
  h: number;
  cost: number;
}

export interface HomeLevelDef {
  name: string;
  cost: number;
  staminaBonus: number;
}

export interface FortuneEffectsConfig {
  lootUp: number;
  foodUp: number;
  nextGoodUp: number;
  patrolX2: number;
  mishapUp: number;
  windy: number;
}

export interface Config {
  totalDays: number;
  startHunger: number;
  maxHunger: number;
  startStamina: number;
  maxStamina: number;
  startMood: number;
  maxMood: number;
  startMoney: number;
  dayStartMinute: number;
  midnightMinute: number;
  minutesPerDig: Record<BoxSize, number>;
  minutesPerHoldSecond: number;
  travelMinutes: number;
  digStamina: Record<BoxSize, number>;
  holdStaminaPerSec: number;
  hungerPerDig: number;
  moodPerDay: number;
  phases: PhaseDef[];
  holdCurve: HoldCurveStep[];
  mishapStartSec: number;
  mishapPerSec: number;
  maxHoldSec: number;
  itemsPerBox: Record<BoxSize, [number, number]>;
  bigBoxBonusGood: number;
  boxesPerLocation: [number, number];
  boxCountFortuneDelta: Record<FortuneTier, [number, number]>;
  bigBoxChance: Record<FortuneTier, number>;
  moodGoldLow: { threshold: number; mul: number };
  moodGoldHigh: { threshold: number; mul: number };
  eventChancePerDig: number;
  fortuneWeights: Record<FortuneTier, number>;
  fortuneEffects: FortuneEffectsConfig;
  rainTravelExtra: number;
  rainMishapDelta: number;
  catLuckDigs: number;
  catLuckMul: number;
  patrolLeaveStamina: number;
  patrolMood: number;
  rivalYieldMood: number;
  rivalLoseStamina: number;
  auntieHunger: number;
  auntieMood: number;
  deliveryHunger: number;
  walletMoney: number;
  walletMood: number;
  mishapMood: number;
  rareMood: number;
  warmthMood: number;
  nightWarmthChance: number;
  nightWarmthHunger: number;
  bagSizes: BagSizeDef[];
  foodPrice: number;
  foodHunger: number;
  rerollBase: number;
  rerollStep: number;
  homeLevels: HomeLevelDef[];
  benchGuardChance: number;
  benchGuardStamina: number;
  collapseLoseRatio: number;
  day1GuaranteeGood: boolean;
  adsEnabled: boolean;
}

export const ITEMS: ItemDef[] = [
  {
    id: 'empty_water_bottle',
    name: '空矿泉水瓶',
    rarity: 'common',
    cells: 1,
    price: 1,
    edible: false,
    desc: '深圳最稳定的理财产品',
  },
  {
    id: 'crushed_can',
    name: '压扁的易拉罐',
    rarity: 'common',
    cells: 1,
    price: 1.5,
    edible: false,
    desc: '被人踩过，但它没放弃',
  },
  {
    id: 'old_newspaper',
    name: '旧报纸',
    rarity: 'common',
    cells: 1,
    price: 0.5,
    edible: false,
    desc: '头条写着「就业形势向好」',
  },
  {
    id: 'cardboard_box',
    name: '纸箱',
    rarity: 'common',
    cells: 2,
    price: 7.5,
    edible: false,
    desc: '白天能卖钱，晚上能当被子',
  },
  {
    id: 'left_slipper',
    name: '左脚拖鞋',
    rarity: 'common',
    cells: 1,
    price: 0,
    edible: false,
    desc: '右脚在哪？这是一个哲学问题',
  },
  {
    id: 'broken_umbrella',
    name: '坏掉的雨伞',
    rarity: 'common',
    cells: 2,
    price: 2.5,
    edible: false,
    desc: '只能挡住一半的命运',
  },
  {
    id: 'half_cup_milk_tea',
    name: '半杯奶茶',
    rarity: 'common',
    cells: 1,
    price: 0,
    edible: true,
    hunger: 5,
    desc: '三分糖，七分别人的口水',
    locations: ['dongmen'],
  },
  {
    id: 'cold_bun',
    name: '冷掉的包子',
    rarity: 'common',
    cells: 1,
    price: 0,
    edible: true,
    hunger: 15,
    desc: '皮比你的人生还硬',
  },
  {
    id: 'half_egg_tart',
    name: '半块蛋挞',
    rarity: 'common',
    cells: 1,
    price: 0,
    edible: true,
    hunger: 10,
    desc: '前主人只咬了一个梦想',
  },
  {
    id: 'expired_bread',
    name: '过期 1 天的面包',
    rarity: 'common',
    cells: 1,
    price: 0,
    edible: true,
    hunger: 20,
    desc: '保质期只是一个建议',
  },
  {
    id: 'disposable_chopsticks',
    name: '一次性筷子',
    rarity: 'common',
    cells: 1,
    price: 0.5,
    edible: false,
    desc: '恭喜你，离吃饭只差饭了',
  },
  {
    id: 'plastic_flower',
    name: '塑料花',
    rarity: 'common',
    cells: 1,
    price: 2.5,
    edible: false,
    desc: '永不凋谢，就像你的贫穷',
  },
  {
    id: 'old_clothes',
    name: '旧衣服',
    rarity: 'good',
    cells: 2,
    price: 4,
    edible: false,
    desc: '还有香水味，比你体面',
  },
  {
    id: 'charging_cable',
    name: '充电线',
    rarity: 'good',
    cells: 1,
    price: 4,
    edible: false,
    desc: '只有一头能用，像一段感情',
  },
  {
    id: 'energy_drink',
    name: '能量饮料',
    rarity: 'good',
    cells: 1,
    price: 0,
    edible: true,
    stamina: 15,
    desc: '喝完感觉还能再翻 5 个桶',
  },
  {
    id: 'unopened_rice_ball',
    name: '没拆封的饭团',
    rarity: 'good',
    cells: 1,
    price: 0,
    edible: true,
    hunger: 30,
    desc: '今日大奖！双手合十',
  },
  {
    id: 'delivery_set_meal',
    name: '外卖套餐',
    rarity: 'good',
    cells: 1,
    price: 0,
    edible: true,
    hunger: 35,
    stamina: 5,
    desc: '备注写着「不要香菜」',
    locations: ['university_town'],
  },
  {
    id: 'old_rice_cooker',
    name: '旧电饭煲',
    rarity: 'good',
    cells: 2,
    price: 20,
    edible: false,
    desc: '煮过无数人的梦想',
    locations: ['baishizhou', 'university_town'],
  },
  {
    id: 'half_bag_rice',
    name: '半袋大米',
    rarity: 'good',
    cells: 2,
    price: 7,
    edible: true,
    hunger: 25,
    desc: '生吃需要勇气',
    locations: ['baishizhou'],
  },
  {
    id: 'exam_materials',
    name: '考研资料',
    rarity: 'good',
    cells: 2,
    price: 20,
    edible: false,
    desc: '上一位主人已经上岸了',
    locations: ['university_town'],
  },
  {
    id: 'plaid_shirt',
    name: '格子衫',
    rarity: 'good',
    cells: 1,
    price: 10,
    edible: false,
    desc: '穿上它，南山欢迎你',
    locations: ['nanshan_tech'],
  },
  {
    id: 'metro_card',
    name: '地铁卡',
    rarity: 'good',
    cells: 1,
    price: 12,
    edible: false,
    desc: '余额 ¥10，够你逃离一次',
    locations: ['window_world'],
  },
  {
    id: 'kite',
    name: '风筝',
    rarity: 'good',
    cells: 2,
    price: 20,
    edible: false,
    desc: '它也想飞，你也想',
    locations: ['sz_bay'],
  },
  {
    id: 'power_bank',
    name: '充电宝',
    rarity: 'rare',
    cells: 1,
    price: 20,
    edible: false,
    desc: '剩 3% 电，和你一样',
    locations: ['huaqiangbei'],
  },
  {
    id: 'mechanical_keyboard',
    name: '机械键盘',
    rarity: 'rare',
    cells: 2,
    price: 75,
    edible: false,
    desc: '少了一个 Enter，所以没法回车',
    locations: ['nanshan_tech'],
  },
  {
    id: 'old_phone',
    name: '旧手机',
    rarity: 'rare',
    cells: 1,
    price: 54,
    edible: false,
    desc: '屏碎了，但相册里全是自拍',
    locations: ['huaqiangbei'],
  },
  {
    id: 'unopened_mooncake',
    name: '没拆封的月饼',
    rarity: 'rare',
    cells: 1,
    price: 36,
    edible: true,
    hunger: 40,
    desc: '是五仁的，懂的都懂',
    locations: ['futian_cbd'],
  },
  {
    id: 'brand_briefcase',
    name: '名牌公文包',
    rarity: 'rare',
    cells: 2,
    price: 105,
    edible: false,
    desc: '里面装着别人的 KPI',
    locations: ['futian_cbd'],
  },
  {
    id: 'off_season_tshirt',
    name: '过季潮牌 T 恤',
    rarity: 'rare',
    cells: 1,
    price: 27,
    edible: false,
    desc: '胸口印着「LUCKY」，讽刺拉满',
    locations: ['dongmen'],
  },
  {
    id: 'graphics_card',
    name: '显卡',
    rarity: 'epic',
    cells: 2,
    price: 120,
    edible: false,
    desc: '华强北的传说，挖矿遗孤',
    locations: ['huaqiangbei'],
  },
  {
    id: 'golden_koi',
    name: '金色锦鲤摆件',
    rarity: 'epic',
    cells: 1,
    price: 60,
    edible: false,
    desc: '转发它，然后继续穷',
  },
  {
    id: 'scratch_card',
    name: '刮刮乐（未刮）',
    rarity: 'epic',
    cells: 1,
    price: 0,
    priceMax: 200,
    edible: false,
    desc: '回家才揭晓，人生就是赌',
  },
  {
    id: 'dead_mouse',
    name: '死老鼠',
    rarity: 'mishap',
    cells: 1,
    price: 0,
    edible: false,
    mood: -10,
    desc: '它比你先放弃了深圳',
  },
  {
    id: 'cat_hair',
    name: '猫毛一团',
    rarity: 'mishap',
    cells: 1,
    price: 0,
    edible: false,
    mood: -5,
    desc: '被抓伤后的纪念品',
  },
];

export const LOCATIONS: LocationDef[] = [
  {
    id: 'baishizhou',
    name: '白石洲',
    lootRate: 1.0,
    danger: 0.6,
    distance: 5,
    far: false,
  },
  {
    id: 'dongmen',
    name: '东门',
    lootRate: 1.25,
    danger: 1.0,
    distance: 10,
    far: false,
  },
  {
    id: 'huaqiangbei',
    name: '华强北',
    lootRate: 1.25,
    danger: 1.6,
    distance: 12,
    far: false,
  },
  {
    id: 'futian_cbd',
    name: '福田 CBD',
    lootRate: 1.25,
    danger: 1.6,
    distance: 17,
    far: true,
  },
  {
    id: 'nanshan_tech',
    name: '南山科技园',
    lootRate: 1.25,
    danger: 1.0,
    distance: 14,
    far: true,
  },
  {
    id: 'sz_bay',
    name: '深圳湾公园',
    lootRate: 1.25,
    danger: 0.6,
    distance: 18,
    far: true,
  },
  {
    id: 'window_world',
    name: '世界之窗地铁站',
    lootRate: 1.0,
    danger: 1.0,
    distance: 12,
    far: false,
  },
  {
    id: 'university_town',
    name: '大学城',
    lootRate: 1.25,
    danger: 0.6,
    distance: 19,
    far: true,
  },
];

export const FORTUNES: FortuneDef[] = [
  {
    id: 'great_luck',
    tier: 'good',
    name: '大吉',
    text: '今日华强北大吉，宝贝在等你',
    effect: 'lootUp',
    needsLocation: true,
  },
  {
    id: 'mid_luck',
    tier: 'good',
    name: '中吉',
    text: '东门有人刚搬家',
    effect: 'bigGuaranteeGood',
    needsLocation: true,
  },
  {
    id: 'small_luck',
    tier: 'good',
    name: '小吉',
    text: '宜吃饭',
    effect: 'foodUp',
    needsLocation: false,
  },
  {
    id: 'flat',
    tier: 'meh',
    name: '平',
    text: '今天适合呼吸',
    effect: 'none',
    needsLocation: false,
  },
  {
    id: 'lazy',
    tier: 'meh',
    name: '烂',
    text: '今日宜躺平，忌努力',
    effect: 'none',
    needsLocation: false,
  },
  {
    id: 'charging',
    tier: 'meh',
    name: '烂',
    text: '你的运气在充电',
    effect: 'nextGoodUp',
    needsLocation: false,
  },
  {
    id: 'patrol_warning',
    tier: 'bad',
    name: '凶',
    text: '今日福田 CBD 有巡逻大叔',
    effect: 'patrolX2',
    needsLocation: true,
  },
  {
    id: 'cat_many',
    tier: 'bad',
    name: '凶',
    text: '南山猫多',
    effect: 'mishapUp',
    needsLocation: true,
  },
  {
    id: 'windy',
    tier: 'bad',
    name: '大凶',
    text: '今天风大',
    effect: 'windy',
    needsLocation: false,
  },
];

export const EVENTS: EventDef[] = [
  {
    id: 'patrol',
    name: '巡逻大叔来了',
    weight: 30,
    options: ['礼貌离开', '装作散步'],
  },
  {
    id: 'guard',
    name: '小区保安',
    weight: 12,
    options: ['被请出小区'],
  },
  {
    id: 'rival',
    name: '同行抢地盘',
    weight: 15,
    options: ['让给他', '比谁掏得快'],
  },
  {
    id: 'auntie',
    name: '好心阿姨送饭',
    weight: 10,
    options: ['谢谢阿姨'],
  },
  {
    id: 'delivery',
    name: '外卖小哥送单错了',
    weight: 10,
    options: ['收下外卖'],
  },
  {
    id: 'wallet',
    name: '捡到钱包',
    weight: 5,
    options: ['归还钱包'],
  },
  {
    id: 'cat',
    name: '流浪猫跟着你',
    weight: 10,
    options: ['喂它', '不喂'],
  },
  {
    id: 'rain',
    name: '下雨了',
    weight: 8,
    options: ['撑住'],
  },
];

export const SLEEP_SPOTS: SleepSpotDef[] = [
  {
    id: 'bench',
    name: '公园长椅',
    prob: 0.5,
    stamina: 40,
    cost: 0,
  },
  {
    id: 'diner',
    name: '通宵堡',
    prob: 0.3,
    stamina: 60,
    cost: 5,
  },
  {
    id: 'netcafe',
    name: '星河网咖',
    prob: 0.2,
    stamina: 80,
    cost: 12,
  },
];

export const CONFIG: Config = {
  totalDays: 15,
  startHunger: 80,
  maxHunger: 100,
  startStamina: 100,
  maxStamina: 135,
  startMood: 70,
  maxMood: 100,
  startMoney: 0,

  dayStartMinute: 480,
  midnightMinute: 1440,
  minutesPerDig: { small: 15, big: 30 },
  minutesPerHoldSecond: 2,
  travelMinutes: 40,

  digStamina: { small: 5, big: 12 },
  holdStaminaPerSec: 3,
  hungerPerDig: 1,
  moodPerDay: -5,

  phases: [
    {
      fromDay: 1,
      toDay: 4,
      dailyHunger: 12,
      lootMul: 1.0,
      patrolBonus: 0,
      rivalEnabled: false,
      badFortuneBonus: 0,
      farTravelMul: 1,
    },
    {
      fromDay: 5,
      toDay: 9,
      dailyHunger: 38,
      lootMul: 0.7,
      patrolBonus: 0.1,
      rivalEnabled: true,
      badFortuneBonus: 0,
      farTravelMul: 1,
    },
    {
      fromDay: 10,
      toDay: 15,
      dailyHunger: 66,
      lootMul: 0.5,
      patrolBonus: 0.1,
      rivalEnabled: true,
      badFortuneBonus: 0.15,
      farTravelMul: 1.5,
    },
  ],

  holdCurve: [
    { minSec: 0, good: 0.05, rare: 0, epic: 0 },
    { minSec: 1, good: 0.15, rare: 0, epic: 0 },
    { minSec: 2, good: 0.28, rare: 0.015, epic: 0 },
    { minSec: 2.5, good: 0.3, rare: 0.025, epic: 0.004 },
    { minSec: 3, good: 0.36, rare: 0.08, epic: 0.02 },
    { minSec: 4, good: 0.42, rare: 0.13, epic: 0.04 },
    { minSec: 5, good: 0.48, rare: 0.21, epic: 0.09 },
  ],
  mishapStartSec: 4,
  mishapPerSec: 0.06,
  maxHoldSec: 6,

  itemsPerBox: { small: [1, 1], big: [1, 2] },
  bigBoxBonusGood: 0.1,
  boxesPerLocation: [3, 5],
  boxCountFortuneDelta: {
    good: [1, 1],
    meh: [0, 0],
    bad: [0, -1],
  },
  bigBoxChance: {
    good: 0.5,
    meh: 0.35,
    bad: 0.2,
  },

  moodGoldLow: { threshold: 30, mul: 0.8 },
  moodGoldHigh: { threshold: 80, mul: 1.1 },

  eventChancePerDig: 0.12,
  fortuneWeights: {
    good: 0.35,
    meh: 0.4,
    bad: 0.25,
  },
  fortuneEffects: {
    lootUp: 0.5,
    foodUp: 0.2,
    nextGoodUp: 0.1,
    patrolX2: 2,
    mishapUp: 0.15,
    windy: 5,
  },

  rainTravelExtra: 5,
  rainMishapDelta: -0.1,
  catLuckDigs: 3,
  catLuckMul: 0.2,

  patrolLeaveStamina: 5,
  patrolMood: -8,
  rivalYieldMood: -5,
  rivalLoseStamina: 10,
  auntieHunger: 30,
  auntieMood: 15,
  deliveryHunger: 25,
  walletMoney: 20,
  walletMood: 20,

  mishapMood: -10,
  rareMood: 10,
  warmthMood: 15,
  nightWarmthChance: 0.2,
  nightWarmthHunger: 15,

  bagSizes: [
    { w: 3, h: 3, cost: 0 },
    { w: 3, h: 4, cost: 40 },
    { w: 4, h: 4, cost: 90 },
  ],

  foodPrice: 20,
  foodHunger: 20,
  rerollBase: 5,
  rerollStep: 5,

  homeLevels: [
    { name: '城中村床位', cost: 0, staminaBonus: 0 },
    { name: '回收站角落', cost: 60, staminaBonus: 10 },
    { name: '回收站小间', cost: 150, staminaBonus: 20 },
  ],

  benchGuardChance: 0.2,
  benchGuardStamina: 10,
  collapseLoseRatio: 0.5,

  day1GuaranteeGood: true,
  adsEnabled: false,
};
