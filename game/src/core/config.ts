export type Rarity = 'common' | 'good' | 'rare' | 'epic' | 'mishap';
export type BoxSize = 'small' | 'big';
export type FortuneTier = 'good' | 'meh' | 'bad';
/** 可被「今日限定」加价的物品大类。 */
export type ItemCategory = 'electronics' | 'cardboard';

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
  category?: ItemCategory;
}

export interface LocationDef {
  id: string;
  name: string;
  lootRate: number;
  danger: number;
  distance: number;
  far: boolean;
  /** 第几天开放；未开放时地图只显示「第 N 天开放」。 */
  openDay: number;
  /** 深圳地标（第一行：地标物件；line：NPC 台词） */
  landmarkName: string;
  line: string;
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
  /** bg 分包中的落脚点场景（不含扩展名）：home_lv1 / home_lv2 / home_lv3。 */
  scene: string;
  /** 透明窗景灯光叠层（可选，按需闪烁）。 */
  lights?: string;
}

/** 日结算吐槽的触发情境；结算时按当天收入/物品/饱腹/体力/住处组合。 */
export type DayRoastTag =
  | 'rich'
  | 'poor'
  | 'empty'
  | 'best'
  | 'lucky'
  | 'hungry'
  | 'tired'
  | 'home'
  | 'generic';

/** 结算卡大字吐槽；{best}/{income}/{hunger}/{stamina}/{home} 由当天数据替换。 */
export interface DayRoastDef {
  id: string;
  tags: DayRoastTag[];
  text: string;
}

export interface RoastContext {
  income: number;
  bestItem: string;
  bestValue: number;
  hunger: number;
  stamina: number;
  homeLevel: number;
  homeName: string;
  soldNothing: boolean;
}

/** 买吃的 / 扩背包 / 升级落脚点的可负担性（结算卡格子）。 */
export interface Affordability {
  affordable: boolean;
  /** 还差多少钱（已够/已满级为 0）。 */
  shortfall: number;
  /** 「还差 ¥X」；已够钱或已满级为空字符串。 */
  shortfallText: string;
}

export interface FortuneEffectsConfig {
  lootUp: number;
  foodUp: number;
  nextGoodUp: number;
  patrolX2: number;
  mishapUp: number;
  windy: number;
}

/** 今日限定效果；所有数值都写在 DAILY_SPECIALS / DAILY_SPECIAL_CONFIG。 */
export type DailySpecialEffect =
  | 'electronicsSellMul'
  | 'baishizhouBoxBonus'
  | 'cardboardSellMul'
  | 'homeCostMul'
  | 'foodPrice';

export interface DailySpecialDef {
  id: string;
  name: string;
  desc: string;
  effect: DailySpecialEffect;
  bias: 'good' | 'bad';
  /** 角标挂在哪个地点；全局效果为 null。 */
  locationId: string | null;
  sellMul?: number;
  boxBonus?: { locationId: string; count: number; size: BoxSize };
  patrolMul?: number;
  homeCostMul?: number;
  foodPrice?: number;
}

export interface DailySpecialConfig {
  startDay: number;
  endDay: number;
  /** 好签/平签/坏签下，好事和坏事的抽取权重（平签两者相同 = 均匀）。 */
  weights: Record<FortuneTier, { good: number; bad: number }>;
}

export type DeathCauseId = 'starvation' | 'stamina' | 'security' | 'collapse';

export type TitleStat =
  | 'boxesOpened'
  | 'cardboardFound'
  | 'electronicsFound'
  | 'foodEaten'
  | 'catFeeds'
  | 'securityEncounters'
  | 'homeVisits'
  | 'bestItemValue';

export type TitleRule =
  | { kind: 'stat'; stat: TitleStat; min: number }
  | { kind: 'locationVisits'; locationId: string; min: number }
  | { kind: 'always' };

export interface SurvivalTitleDef {
  id: string;
  name: string;
  desc: string;
  priority: number;
  rule: TitleRule;
}

/** 一局跑下来的统计，死亡页/认证页/称号都只读这里。 */
export interface RunStats {
  daysSurvived: number;
  boxesOpened: number;
  itemsCollected: number;
  cardboardFound: number;
  electronicsFound: number;
  foodEaten: number;
  catFeeds: number;
  securityEncounters: number;
  pretendWalkCount: number;
  collapses: number;
  homeVisits: number;
  nightsSlept: number;
  totalIncome: number;
  bestItemName: string;
  bestItemValue: number;
  locationVisits: Record<string, number>;
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
  dailySpecial: DailySpecialConfig;
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
  /** 日结算吐槽的情境阈值。 */
  roastIncomeGood: number;
  roastHungerLow: number;
  roastStaminaLow: number;
  roastLuckyValue: number;
  homeLevels: HomeLevelDef[];
  benchGuardChance: number;
  benchGuardStamina: number;
  collapseLoseRatio: number;
  day1GuaranteeGood: boolean;
  /** 体力/饱腹低于该比例时顶栏变红闪烁并弹提示。 */
  uiLowRatio: number;
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
    category: 'cardboard',
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
    category: 'electronics',
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
    category: 'electronics',
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
    category: 'electronics',
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
    category: 'electronics',
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
    category: 'electronics',
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
    openDay: 1,
    landmarkName: '握手楼/晾衣杆',
    line: '后生仔，吃饭未啊？',
  },
  {
    id: 'dongmen',
    name: '东门',
    lootRate: 1.25,
    danger: 1.0,
    distance: 10,
    far: false,
    openDay: 1,
    landmarkName: '老街招牌/糖水铺',
    line: '糖水两蚊一碗啊',
  },
  {
    id: 'huaqiangbei',
    name: '华强北',
    lootRate: 1.25,
    danger: 1.6,
    distance: 12,
    far: false,
    openDay: 2,
    landmarkName: '电子摊/二手手机柜台',
    line: '靓仔，要不要看看？',
  },
  {
    id: 'futian_cbd',
    name: '福田 CBD',
    lootRate: 1.25,
    danger: 1.6,
    distance: 17,
    far: true,
    openDay: 5,
    landmarkName: '平安金融中心/写字楼玻璃幕墙',
    line: '电梯要排二十分钟',
  },
  {
    id: 'nanshan_tech',
    name: '南山科技园',
    lootRate: 1.25,
    danger: 1.0,
    distance: 14,
    far: true,
    openDay: 6,
    landmarkName: '工牌/外卖柜',
    line: '今晚又要加班',
  },
  {
    id: 'sz_bay',
    name: '深圳湾公园',
    lootRate: 1.25,
    danger: 0.6,
    distance: 18,
    far: true,
    openDay: 8,
    landmarkName: '海边步道/春笋大厦远景',
    line: '跑步的都比你有钱',
  },
  {
    id: 'window_world',
    name: '世界之窗地铁站',
    lootRate: 1.0,
    danger: 1.0,
    distance: 12,
    far: false,
    openDay: 3,
    landmarkName: '共享单车山',
    line: '又迟到了又迟到了',
  },
  {
    id: 'university_town',
    name: '大学城',
    lootRate: 1.25,
    danger: 0.6,
    distance: 19,
    far: true,
    openDay: 10,
    landmarkName: '图书馆/自行车棚',
    line: '同学，饭卡借我刷一下？',
  },
];

/**
 * 今日限定池。day 5~15 每天只抽 1 条。
 * locationId 只用于地图/地点页的「限定」角标，效果作用范围由 effect 决定。
 */
export const DAILY_SPECIALS: DailySpecialDef[] = [
  {
    id: 'huaqiangbei_clearance',
    name: '华强北清仓',
    desc: '电子类卖价 ×1.7',
    effect: 'electronicsSellMul',
    bias: 'good',
    locationId: 'huaqiangbei',
    sellMul: 1.7,
  },
  {
    id: 'baishizhou_demolition',
    name: '城中村拆迁',
    desc: '白石洲 +2 大箱，巡逻 ×2',
    effect: 'baishizhouBoxBonus',
    bias: 'bad',
    locationId: 'baishizhou',
    boxBonus: { locationId: 'baishizhou', count: 2, size: 'big' },
    patrolMul: 2,
  },
  {
    id: 'recycler_cardboard',
    name: '回收商高价收纸箱',
    desc: '纸箱类卖价 ×2.4',
    effect: 'cardboardSellMul',
    bias: 'good',
    locationId: 'baishizhou',
    sellMul: 2.4,
  },
  {
    id: 'metro_shutdown',
    name: '地铁停运',
    desc: '回家体力 ×1.55',
    effect: 'homeCostMul',
    bias: 'bad',
    locationId: 'window_world',
    homeCostMul: 1.55,
  },
  {
    id: 'night_market',
    name: '夜市开张',
    desc: '食物半价 ¥10',
    effect: 'foodPrice',
    bias: 'good',
    locationId: 'dongmen',
    foodPrice: 10,
  },
];

export const DAILY_SPECIAL_CONFIG: DailySpecialConfig = {
  startDay: 5,
  endDay: 15,
  weights: {
    good: { good: 3, bad: 1 },
    meh: { good: 1, bad: 1 },
    bad: { good: 1, bad: 3 },
  },
};

/** 死因 → 搞笑文案；{n}=本局被保安请出的真实次数，{day}=第几天。 */
export const DEATH_LINES: Record<DeathCauseId, string[]> = {
  starvation: [
    '为了省¥20，倒在了离夜市50米的地方',
    '第 {day} 天，翻遍了三个垃圾桶，只翻出了人生的意义',
    '最后一口饭留给了明天，明天没来',
    '饿到看见肠粉在跳舞，伸手一抓是空气',
    '把最后半瓶水让给了猫，猫活蹦乱跳，你倒下了',
    '第 {day} 天，舍不得吃那半块蛋挞，饿晕了',
  ],
  stamina: [
    '背着三台旧显示器走了8公里',
    '为了多掏一个纸箱，把最后一点体力押给了深圳',
    '在人才公园门口走完了人生最后一步',
    '手机步数第一，人生进度条归零',
  ],
  security: [
    '第{n}次『装作散步』，保安已经认识你了',
    '被保安请出小区时，还不忘回头看了一眼那个纸箱',
    '在保安室喝了三杯茶，还是没想明白为什么要翻垃圾桶',
  ],
  collapse: [
    '在公园长椅上睡着了，梦里终于有了房',
    '倒下的姿势很专业，路人以为在拍深圳宣传片',
    '最后一觉睡得很香，就是没醒来',
  ],
};

/** 通关称号：priority 大的先匹配；最后一个是保底。 */
export const SURVIVAL_TITLES: SurvivalTitleDef[] = [
  {
    id: 'cardboard_king',
    name: '纸箱之王',
    desc: '纸箱见到你都得主动躺平。',
    priority: 120,
    rule: { kind: 'stat', stat: 'cardboardFound', min: 6 },
  },
  {
    id: 'huaqiangbei_regular',
    name: '华强北常客',
    desc: '柜台老板已经给你留了专属小板凳。',
    priority: 110,
    rule: { kind: 'locationVisits', locationId: 'huaqiangbei', min: 3 },
  },
  {
    id: 'cat_friend',
    name: '猫猫的好朋友',
    desc: '整条街的猫都记得你背包里的饭团。',
    priority: 100,
    rule: { kind: 'stat', stat: 'catFeeds', min: 2 },
  },
  {
    id: 'security_familiar',
    name: '保安老熟人',
    desc: '巡逻大叔已经开始和你打招呼了。',
    priority: 95,
    rule: { kind: 'stat', stat: 'securityEncounters', min: 3 },
  },
  {
    id: 'dongmen_dessert_vip',
    name: '东门糖水VIP',
    desc: '糖水铺阿姨给你留了靠窗的位置。',
    priority: 90,
    rule: { kind: 'locationVisits', locationId: 'dongmen', min: 3 },
  },
  {
    id: 'nanshan_overtime_hero',
    name: '科技园加班侠',
    desc: '外卖柜都认识你的取餐码了。',
    priority: 85,
    rule: { kind: 'locationVisits', locationId: 'nanshan_tech', min: 3 },
  },
  {
    id: 'window_world_commuter',
    name: '世界之窗守站人',
    desc: '共享单车山的每一辆都被你扶过。',
    priority: 80,
    rule: { kind: 'locationVisits', locationId: 'window_world', min: 3 },
  },
  {
    id: 'sz_bay_runner',
    name: '深圳湾散步王',
    desc: '跑步的人有钱，你有海风。',
    priority: 75,
    rule: { kind: 'locationVisits', locationId: 'sz_bay', min: 3 },
  },
  {
    id: 'university_auditor',
    name: '大学城编外生',
    desc: '图书馆阿姨已经默认你是本校的了。',
    priority: 70,
    rule: { kind: 'locationVisits', locationId: 'university_town', min: 3 },
  },
  {
    id: 'futian_elevator_queuer',
    name: '福田电梯排队王',
    desc: '二十分钟的电梯，你排出了仪式感。',
    priority: 65,
    rule: { kind: 'locationVisits', locationId: 'futian_cbd', min: 3 },
  },
  {
    id: 'lucky_finder',
    name: '捡漏王',
    desc: '最值钱的那件货，足够吹一整年。',
    priority: 60,
    rule: { kind: 'stat', stat: 'bestItemValue', min: 100 },
  },
  {
    id: 'box_grinder',
    name: '天选打工人',
    desc: '开箱开出了上班的肌肉记忆。',
    priority: 55,
    rule: { kind: 'stat', stat: 'boxesOpened', min: 25 },
  },
  {
    id: 'shenzhen_passenger',
    name: '深圳过客',
    desc: '来都来了，活满十五天就是胜利。',
    priority: 0,
    rule: { kind: 'always' },
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

/**
 * 日结算大字吐槽池（r8）。
 * 每条按 tags 匹配当天情境；选择时优先未用过的同情境文案，
 * 同情境用完后从仍未用过的任意文案里挑，整局尽量不重复。
 */
export const DAY_ROASTS: DayRoastDef[] = [
  { id: 'rich_1', tags: ['rich'], text: '今天收入 ¥\u00A0{income}，深圳的垃圾桶都开始尊重你了。' },
  { id: 'rich_2', tags: ['rich'], text: '进账 ¥\u00A0{income}，建议立刻忘记昨天睡天桥的自己。' },
  { id: 'rich_3', tags: ['rich'], text: '钱包鼓到 ¥\u00A0{income}，但房东的微信依旧不回。' },
  { id: 'rich_4', tags: ['rich', 'tired'], text: '赚了 ¥\u00A0{income}，累得像被生活按在地上摩擦。' },
  { id: 'rich_5', tags: ['rich'], text: '¥\u00A0{income} 入账，今晚的泡面可以加根肠。' },
  { id: 'poor_1', tags: ['poor'], text: '忙一天只换来 ¥\u00A0{income}，地铁口的风都替你心疼。' },
  { id: 'poor_2', tags: ['poor'], text: '收入 ¥\u00A0{income}，还不够给手机充一次电。' },
  { id: 'poor_3', tags: ['poor', 'hungry'], text: '钱没赚到，饭没吃饱，觉还得睡。' },
  { id: 'empty_1', tags: ['empty'], text: '今天一个纸箱都没开，你和深圳互相晾着。' },
  { id: 'empty_2', tags: ['empty'], text: '空手而归，连蚊子都懒得叮你。' },
  { id: 'best_1', tags: ['best'], text: '最离谱的是「{best}」，这玩意儿居然真有人收。' },
  { id: 'best_2', tags: ['best'], text: '抱着「{best}」回家，像抱着整个华强北。' },
  { id: 'best_3', tags: ['best'], text: '今天最魔幻的收获是「{best}」，建议供起来。' },
  { id: 'best_4', tags: ['best', 'lucky'], text: '「{best}」在手，今天的苦总算有个说法。' },
  { id: 'lucky_1', tags: ['lucky', 'best'], text: '今天捡到「{best}」，运气好得不像在深圳。' },
  { id: 'hungry_1', tags: ['hungry'], text: '饱腹只剩 {hunger}，再不吃点东西就要成仙了。' },
  { id: 'hungry_2', tags: ['hungry'], text: '肚子叫得比地铁还响，建议先买吃的再谈梦想。' },
  { id: 'tired_1', tags: ['tired'], text: '体力只剩 {stamina}，今晚的床比任何 KPI 都重要。' },
  { id: 'tired_2', tags: ['tired'], text: '腿已经不属于你了，睡觉按钮在向你招手。' },
  { id: 'tired_3', tags: ['tired'], text: '体力见底，别硬撑，床不会嘲笑你。' },
  { id: 'home_1', tags: ['home'], text: '住进{home}，至少梦里不用再躲城管。' },
  { id: 'home_2', tags: ['home'], text: '从纸皮到小单间，你升级的是床，不是人生。' },
  { id: 'home_3', tags: ['home', 'empty'], text: '回到{home}，把今天的委屈折成纸皮。' },
  { id: 'generic_1', tags: ['generic'], text: '深圳不相信眼泪，但相信明天的垃圾桶。' },
  { id: 'generic_2', tags: ['generic'], text: '今天没发财，也没饿死，算稳定发挥。' },
  { id: 'generic_3', tags: ['generic'], text: '你负责努力，深圳负责下雨。' },
  { id: 'generic_4', tags: ['generic'], text: '别灰心，明天的纸箱说不定更值钱。' },
  { id: 'generic_5', tags: ['generic'], text: '这座城市很大，大到你的辛苦没人看见。' },
];

/** 价格可负担性：钱够返回空 shortfallText，不够返回「还差 ¥X」。 */
export function affordabilityOf(price: number, money: number): Affordability {
  const safePrice = Math.max(0, price);
  const shortfall = Math.max(0, safePrice - Math.max(0, money));
  const affordable = shortfall <= 0.001;
  return {
    affordable,
    shortfall: affordable ? 0 : shortfall,
    shortfallText: affordable ? '' : `还差 ¥${Math.ceil(shortfall)}`,
  };
}

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
      dailyHunger: 42,
      lootMul: 0.66,
      patrolBonus: 0.11,
      rivalEnabled: true,
      badFortuneBonus: 0,
      farTravelMul: 1,
    },
    {
      fromDay: 10,
      toDay: 15,
      dailyHunger: 70,
      lootMul: 0.46,
      patrolBonus: 0.13,
      rivalEnabled: true,
      badFortuneBonus: 0.16,
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
  dailySpecial: DAILY_SPECIAL_CONFIG,

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
  roastIncomeGood: 30,
  roastHungerLow: 30,
  roastStaminaLow: 30,
  roastLuckyValue: 30,

  homeLevels: [
    { name: '天桥底纸皮铺', cost: 0, staminaBonus: 0, scene: 'home_lv1', lights: 'home_lv1_lights' },
    { name: '城中村握手楼床位', cost: 60, staminaBonus: 10, scene: 'home_lv2' },
    { name: '带窗户和风扇的小单间', cost: 150, staminaBonus: 20, scene: 'home_lv3', lights: 'home_lv3_lights' },
  ],

  benchGuardChance: 0.2,
  benchGuardStamina: 10,
  collapseLoseRatio: 0.5,

  day1GuaranteeGood: true,
  uiLowRatio: 0.3,
  adsEnabled: false,
};
