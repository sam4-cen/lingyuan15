import { EventDef } from '../core/config';

/**
 * 事件页文案（纯数据，不依赖 cc）。
 *
 * 结果文案必须描述「发生了什么、NPC 怎么反应、主角接下来去哪」，
 * 不能只重复选项名。所有事件的所有选项都在 eventResultText 里集中处理，
 * 单测会逐个断言结果非空且不等于选项文字。
 */
export interface EventPresentation {
  /** 描述文字；空字符串则事件页不显示描述。 */
  desc: string;
  /** 角色图逻辑名（和 Art.frames 一致）。 */
  roleArt: string;
}

/** 代码里实际的事件列表逐个覆盖；新增事件若漏配会在单测里被发现。 */
export const EVENT_PRESENTATIONS: Record<EventDef['id'], EventPresentation> = {
  patrol: { desc: '大叔拿着手电扫过来，别让他看见你包里的东西。', roleArt: 'ev_patrol' },
  guard: { desc: '小区门口的门禁亮着红灯，保安正看着你。', roleArt: 'ev_guard' },
  rival: { desc: '另一个捡东西的人按住了纸箱，感觉不太对。', roleArt: 'ev_rival' },
  auntie: { desc: '环卫阿姨打开饭盒，热气在路灯下冒出来。', roleArt: 'ev_auntie' },
  delivery: { desc: '外卖小哥停在路口，单上的门牌号看起来都不对。', roleArt: 'ev_delivery' },
  wallet: { desc: '路灯下躺着一只钱包，鼓得像别人一天的收入。', roleArt: 'ev_wallet' },
  cat: { desc: '一只小猫从纸箱里露出头，围着你转了两圈。', roleArt: 'ev_cat' },
  rain: { desc: '雨点落在铁皮棚上，整条街的猫都躲了起来。', roleArt: 'hero_rain' },
};

/** 固定结果文案（不含运行时结算差异），供 UI 与断词语料共用。 */
export const EVENT_RESULT_TEXTS: Record<EventDef['id'], string[]> = {
  patrol: [
    '大叔摆摆手，你转身离开这条街',
    '大叔笑着走了，你继续在这条街翻',
    '大叔指路请你走，背包被没收',
  ],
  guard: [
    '保安把你请出小区，今天进不去了',
    '被请出小区，今天不能再来',
  ],
  rival: [
    '你认怂了，抱着纸箱去了下一条街',
    '对方耸肩离开，你多了一个大纸箱',
    '被压扁了，体力见底',
  ],
  auntie: ['阿姨塞给你热饭，你在路边吃完了'],
  delivery: ['你收下送错的外卖，在楼道里吃完了'],
  wallet: ['你把钱包还了回去，失主塞给你 ¥20'],
  cat: [
    '包里没吃的，小猫看了看就走了',
    '小猫跟着你，幸运 +3 次',
    '你摆摆手，小猫转身回了纸箱',
  ],
  rain: ['雨越下越大，你撑住等雨停，猫都躲起来了'],
};

export interface EventResultInput {
  eventId: EventDef['id'];
  optionIndex: number;
  /** 抢地盘小游戏是否获胜。 */
  minigameWin?: boolean;
  /** 逻辑层提示（例如「包里没吃的」）；为空时用默认文案。 */
  notice?: string;
  /** 「装作散步」真实结算文案，保持与 game.pretendWalkResultText 一致。 */
  pretendWalkText?: string;
}

/**
 * 事件选项 → 结果文案。
 * 返回空串时 UI 不显示结果框；当前所有事件所有选项都必须返回非空文案。
 */
export function eventResultText(input: EventResultInput): string {
  const { eventId, optionIndex, minigameWin, notice } = input;
  switch (eventId) {
    case 'patrol':
      return optionIndex === 0
        ? EVENT_RESULT_TEXTS.patrol[0]
        : (input.pretendWalkText || EVENT_RESULT_TEXTS.patrol[1]);
    case 'guard':
      return notice || EVENT_RESULT_TEXTS.guard[0];
    case 'rival':
      if (optionIndex === 0) return EVENT_RESULT_TEXTS.rival[0];
      return minigameWin ? EVENT_RESULT_TEXTS.rival[1] : EVENT_RESULT_TEXTS.rival[2];
    case 'auntie':
      return EVENT_RESULT_TEXTS.auntie[0];
    case 'delivery':
      return EVENT_RESULT_TEXTS.delivery[0];
    case 'wallet':
      return EVENT_RESULT_TEXTS.wallet[0];
    case 'cat':
      if (optionIndex === 0) {
        return notice ? EVENT_RESULT_TEXTS.cat[0] : EVENT_RESULT_TEXTS.cat[1];
      }
      return EVENT_RESULT_TEXTS.cat[2];
    case 'rain':
      return EVENT_RESULT_TEXTS.rain[0];
    default:
      return '';
  }
}

/** 所有事件结果的完整语料（含运行时分支），供断词/字体覆盖单测遍历。 */
export function allEventResultTexts(): string[] {
  const out: string[] = [];
  const push = (text: string) => {
    if (text && !out.includes(text)) out.push(text);
  };
  for (const texts of Object.values(EVENT_RESULT_TEXTS)) {
    for (const text of texts) push(text);
  }
  // 逻辑层实际会返回的「装作散步」两套结算文案。
  push('大叔笑着走了');
  push('大叔指路请你走，背包被没收');
  return out;
}
