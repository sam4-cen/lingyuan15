# 统一接口约定（所有文件都必须遵守）
纯 TypeScript，严格模式（strict），不依赖任何库、不用 Node API、不用 DOM，可同时在 Node(tsx) 和 Cocos Creator 3.8 中运行。相对导入不带扩展名。

## src/core/config.ts
导出：
- 类型 Rarity = 'common'|'good'|'rare'|'epic'|'mishap'；BoxSize='small'|'big'；FortuneTier='good'|'meh'|'bad'
- interface ItemDef { id:string; name:string; rarity:Rarity; cells:1|2; price:number; priceMax?:number; edible:boolean; hunger?:number; stamina?:number; mood?:number; desc:string; locations?:string[] /*特色地点id*/ }
- interface LocationDef { id:string; name:string; lootRate:number /*爆率倍数 低0.8 中1.0 高1.25*/; danger:number /*驱赶事件权重倍数 低0.6 中1.0 高1.6*/; distance:number /*移动和回家体力*/; far:boolean }
- interface FortuneDef { id:string; tier:FortuneTier; name:string; text:string; effect:'lootUp'|'bigGuaranteeGood'|'foodUp'|'none'|'nextGoodUp'|'patrolX2'|'mishapUp'|'windy'; needsLocation:boolean }
- interface EventDef { id:'patrol'|'guard'|'rival'|'auntie'|'delivery'|'wallet'|'cat'|'rain'; name:string; weight:number; options:string[] }
- interface SleepSpotDef { id:'bench'|'diner'|'netcafe'; name:string; prob:number; stamina:number; cost:number }
- const ITEMS: ItemDef[]  （文档第 8 节全部 34 种，id 用英文 snake_case；刮刮乐 price 0, priceMax 200；死老鼠 mood -10，猫毛 mood -5；"特色物品"写进 locations）
- const LOCATIONS: LocationDef[] 8 个：baishizhou 白石洲, dongmen 东门, huaqiangbei 华强北, futian_cbd 福田CBD, nanshan_tech 南山科技园, sz_bay 深圳湾公园, window_world 世界之窗地铁站, university_town 大学城（距离按文档 5/10/12/18/15/20/12/22）。回家体力 = 该地点 distance。
- const FORTUNES: FortuneDef[] 文档第 5 节 9 条
- const EVENTS: EventDef[] 8 种
- const SLEEP_SPOTS: SleepSpotDef[] 3 种（bench 50% 40 体力 ¥0；diner 30% 60 ¥5；netcafe 20% 80 ¥12）
- const CONFIG = { ... } 所有数值集中在这里，至少包含：
  totalDays:15, startHunger:60, maxHunger:100, startStamina:100, maxStamina:100, startMood:70, maxMood:100, startMoney:0,
  dayStartMinute:480 (8:00), midnightMinute:1440, minutesPerDig:{small:15,big:30}, minutesPerHoldSecond:2, travelMinutes:40,
  digStamina:{small:5,big:12}, holdStaminaPerSec:3, hungerPerDig:1, moodPerDay:-5,
  phases:[{fromDay:1,toDay:4,dailyHunger:25,lootMul:1.0,patrolBonus:0,rivalEnabled:false,badFortuneBonus:0,farTravelMul:1},{fromDay:5,toDay:9,dailyHunger:30,lootMul:0.9,patrolBonus:0.10,rivalEnabled:true,badFortuneBonus:0,farTravelMul:1},{fromDay:10,toDay:15,dailyHunger:40,lootMul:0.8,patrolBonus:0.10,rivalEnabled:true,badFortuneBonus:0.15,farTravelMul:1.5}],
  holdCurve: 函数参数表：按住秒数 t 对应 优良/稀有/史诗 基础概率：t<1: good 0.05 rare 0 epic 0；1<=t<2: good .15；2<=t<3: good .30 rare .02；t>=3: good .35 rare .08 epic .02（表形式，数组 [{minSec, good, rare, epic}]）
  mishapStartSec:4, mishapPerSec:0.10, maxHoldSec:6,
  itemsPerBox:{small:[1,1], big:[1,3]}, bigBoxBonusGood:0.10 (大盒优良以上概率额外+),
  boxesPerLocation:[3,6], boxCountFortuneDelta:{good:[1,2], meh:[0,0], bad:[-1,-1]}, bigBoxChance:{good:0.5, meh:0.35, bad:0.2},
  moodGoldLow:{threshold:30, mul:0.8}, moodGoldHigh:{threshold:80, mul:1.1},
  eventChancePerDig:0.12, fortuneWeights:{good:0.35, meh:0.40, bad:0.25},
  fortuneEffects:{lootUp:0.5, foodUp:0.2, nextGoodUp:0.10, patrolX2:2, mishapUp:0.15, windy:5},
  rainTravelExtra:5, rainMishapDelta:-0.10, catLuckDigs:3, catLuckMul:0.2,
  patrolLeaveStamina:5, patrolMood:-8, rivalYieldMood:-5, rivalLoseStamina:10, auntieHunger:30, auntieMood:15, deliveryHunger:25, walletMoney:20, walletMood:20,
  mishapMood:-10, rareMood:10, warmthMood:15, nightWarmthChance:0.15, nightWarmthHunger:15,
  bagSizes:[{w:3,h:3,cost:0},{w:3,h:4,cost:40},{w:4,h:4,cost:90}],
  foodPrice:8, foodHunger:30, rerollBase:5, rerollStep:5,
  homeLevels:[{name:'城中村床位',cost:0,staminaBonus:0},{name:'回收站角落',cost:60,staminaBonus:10},{name:'回收站小间',cost:150,staminaBonus:20}],
  benchGuardChance:0.2, benchGuardStamina:10, collapseLoseRatio:0.5,
  day1GuaranteeGood:true, adsEnabled:false }

## src/core/game.ts
导出 class Rng { constructor(seed:number); next():number /*[0,1) mulberry32*/; int(a:number,b:number):number /*含两端*/; pick<T>(arr:T[]):T; chance(p:number):boolean }
导出类型：
- Phase = 'fortune'|'map'|'location'|'event'|'home'|'collapsed'|'won'|'lost'
- interface Box { id:string; size:BoxSize; opened:boolean }
- interface ItemInst { uid:number; itemId:string; scratchValue?:number }
- interface Placed { uid:number; itemId:string; x:number; y:number; w:number; h:number; scratchValue?:number }
- interface DigResult { ok:boolean; reason?:string; items:ItemInst[]; mishap:boolean; glow:'white'|'blue'|'gold'|'rainbow'; staminaCost:number; quip:string; event?:PendingEvent; collapsed?:boolean }
- interface PendingEvent { id:EventDef['id']; name:string; options:string[] }
- interface DayReport { day:number; income:number; soldItems:string[]; bestItem?:string; hungerLeft:number; quip:string; warmth?:boolean }
- interface CollapseReport { day:number; spot:SleepSpotDef['id']; spotName:string; lostItems:string[]; staminaNextDay:number; text:string }
导出 class Game：
- constructor(seed:number, cfg = CONFIG)
- 公开只读字段（public）：day, minute, hunger, stamina, mood, money, phase, location:string|null, fortune:FortuneDef|null, fortuneLocation:string|null, rerollCount, bagLevel, homeLevel, bag:Placed[], floor:ItemInst[], bannedToday:string[], raining:boolean, catLuck:number, deathCause:string, totalIncome, log:string[], lastDayReport:DayReport|null, lastCollapse:CollapseReport|null, history:{day:number,money:number,hunger:number,stamina:number}[]
- get bagW/bagH; get maxStamina; get dailyHunger
- startGame(): 进入第 1 天 fortune 阶段（自动抽签，phase='fortune'）
- drawFortune(): 内部，按权重（第 10 天起坏签 +15%，上次"运气在充电"则好签 +10%）抽签，需要地点的签随机指定地点
- rerollCost():number; rerollFortune():boolean（扣钱 rerollBase+rerollStep*rerollCount）
- acceptFortune(): phase -> 'map'，为每个地点生成今天的盒子（3~6 个随签增减，至少 1 个；大盒概率随签）
- boxesAt(locId):Box[]
- travelCost(locId):number （从当前位置：在家=distance；在别的地点=两地 distance 差的绝对值+5，最少5；风大+5；下雨+5；第10天起 far 地点 ×1.5 取整）
- homeCost():number 当前地点回家体力（在家为0；下雨/风大同样加；台风×1.5）—界面常驻显示
- travel(locId):boolean 扣体力推时钟；被保安禁止的地点不能去；体力不足则仍然出发但触发倒下（collapse）
- goldChance(holdSec, boxId):number 给 UI 预览发光颜色用（不消耗随机数）
- glowFor(holdSec, boxId): 'white'|'blue'|'gold'|'rainbow' 用当前按住时长能达到的最高稀有度决定颜色（UI 按住时调用）
- dig(boxId, holdSec):DigResult — 扣体力（盒子基础 + holdStaminaPerSec*秒）、扣饱腹1、推时钟；按 holdCurve*地点爆率*阶段爆率*签效果*猫运*心情修正 掷稀有度；超过 mishapStartSec 每秒 +mishapPerSec 翻车率（签"猫多"+15%，下雨 -10%）→ 翻车出 死老鼠/猫毛，扣心情；大盒出 1~3 件、小盒 1 件；按稀有度从 ITEMS 里选（本地点特色物品权重 ×3）；物品放进 floor；稀有/史诗 心情 +10；第 1 天第一次大盒保底一件优良（若当天还没出过优良以上）；“中吉”签指定地点大盒第一次必出优良以上；然后 eventChancePerDig 概率触发事件（按权重，patrol 权重乘地点 danger、阶段 patrolBonus、patrolX2；rival 前4天不出；rain 当天已下雨则不再出），设置 phase='event'；体力<=0 且不在家 → 倒下 collapse()；午夜后：若体力够回家则自动回家，否则倒下
- resolveEvent(optionIndex:number, minigameWin?:boolean): 按文档第 6 节结算；patrol 选0=礼貌离开（体力-5，回到 map 阶段，location 设为 null 表示在路上? 不：保持 location 但当天该地点 banned），选1=装散步 50%；guard=该地点 banned 并回 map；rival 选0 让=心情-5 当前盒子之外无变化，选1 比赛 赢=额外刷 1 个大盒，输=体力-10；wallet 只有归还；cat 选0 喂（消耗 floor 或 bag 中一件可吃物品，没有就等同不喂）→ catLuck=3；rain → raining=true。结算后 phase 回 'location'（被请走则 'map' 且 location=null... 规定：被请走时 location 保持为该地点用于计算路程，但不能再 dig，phase='map'）
- canPlace(itemCells, x, y, rotated):boolean ；placeFromFloor(uid, x, y, rotated=false):boolean （2格物品默认横放 w=2,h=1；rotated 竖放）；moveToFloor(uid):boolean 把包里物品拿出来放回 floor；discard(uid):boolean 从 floor 丢掉；eat(uid):boolean 从 floor 或 bag 吃掉可吃物品（小吉签食物 +20%），回饱腹/体力上限截断
- leaveLocation(): 离开地点回地图，floor 上没装的东西全部丢失（记 log）
- goHome(): 体力 >= homeCost 才能回；扣体力，phase='home'，自动卖掉 bag 全部物品（刮刮乐此时揭晓 0~200 随机，概率：60%为0，30% 5~20，9% 30~80，1% 200），生成 lastDayReport；体力不够返回 false
- endDayAway(): 主动收工：等同 goHome，回不去就 collapse
- buyFood():boolean 在家，¥8 饱腹+30
- expandBag():boolean 下一档背包；已摆放物品保持坐标
- upgradeHome():boolean
- sleep(): 在家：可能触发夜间温情（nightWarmthChance，饱腹+15 心情+15），扣当日饱腹（按阶段 dailyHunger），心情 moodPerDay，体力回满（maxStamina 包含落脚点加成）；饱腹<=0 → phase='lost' 并生成 deathCause；如果 day==totalDays 且活着 → phase='won'；否则 day+1，minute=dayStartMinute，清空 floor、banned、raining、catLuck，抽新签 phase='fortune'；记录 history
- collapse(): 不在家体力耗尽或午夜回不了家时调用：按 SLEEP_SPOTS 概率选，钱不够按公园；bench 20% 被保安叫醒体力再 -10；背包物品随机丢 floor(n*0.5)；floor 清空；不卖货；扣当日饱腹；心情 moodPerDay；饱腹<=0 失败；第二天体力=spot 体力；生成 lastCollapse；phase='collapsed'；然后需调用 wakeUp() 进入下一天 fortune（若 day==15 且活着则 won）
- wakeUp()
- deathCause：中文沙雕死因，含天数，例如「第 4 天，舍不得吃那块蛋挞，饿晕了」，若包里/今天出过可吃的东西没吃就用它的名字
- 所有数值从 cfg 读，不硬编码。
