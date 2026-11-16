/**
 * 断词语料（纯数据，不依赖 cc）。
 *
 * 构建期脚本 scripts/gen-wordbreak.mjs 从这里取出全部固定文案和模板变量取值，
 * 用 Node 自带 ICU 的 Intl.Segmenter('zh', { granularity: 'word' }) 预计算断点。
 * 运行时只使用这些断点（有 Intl.Segmenter 时直接运行时分词），不再维护手写保护词表。
 */
import {
  CONFIG,
  DAILY_SPECIALS,
  DAY_ROASTS,
  DEATH_LINES,
  EVENTS,
  FORTUNES,
  ITEMS,
  LOCATIONS,
  SLEEP_SPOTS,
  SURVIVAL_TITLES,
  type DeathCauseId,
} from '../core/config';
import { EVENT_PRESENTATIONS, EVENT_RESULT_TEXTS, allEventResultTexts } from './EventCopy';
import { buildFortuneText } from './FortuneLayout';
import { protectAtomicNameSpaces } from './WordBreak';

/** 去重并保持首次出现顺序。 */
export function uniqueTexts(texts: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of texts) {
    const text = String(raw ?? '');
    if (!text || seen.has(text)) continue;
    seen.add(text);
    out.push(text);
  }
  return out;
}

const TIER_NAMES: Record<string, string> = { good: '好签', meh: '平签', bad: '坏签' };

/** 展开模板变量：变量值本身也必须作为词片段参与分词。 */
export function expandTemplate(
  template: string,
  vars: Record<string, string[]>,
): string[] {
  let results = [template];
  for (const [key, values] of Object.entries(vars)) {
    const token = `{${key}}`;
    if (!template.includes(token)) continue;
    const next: string[] = [];
    for (const text of results) {
      for (const value of values) next.push(text.split(token).join(value));
    }
    results = next;
  }
  return results;
}

const ITEM_NAMES = ITEMS.map((item) => item.name);
const LOCATION_NAMES = LOCATIONS.map((loc) => loc.name);
const HOME_NAMES = CONFIG.homeLevels.map((home) => home.name);
const DAY_VALUES = ['1', '5', '7', '10', '15'];
const SMALL_NUMBERS = ['0', '1', '2', '3', '12', '100'];
const MONEY_VALUES = ['0', '12', '500.10', '9999'];

/** 固定 UI 文案：按钮、提示、气泡、事件页、分享图等。 */
export const UI_COPY: string[] = [
  '本游戏纯属虚构，现实请勿模仿',
  '深圳生存 · 垃圾人生模拟器',
  '拖动 / 单击物品放入背包',
  '换地点',
  '回家',
  '收工',
  '睡觉',
  '点击地点前往 · 解锁地点需等待天数',
  '今天风大，出门好像不太顺',
  '今日限定',
  '第 7 天 · 只在今天生效',
  '知道了',
  '就它了',
  '重抽',
  '还差',
  '够钱',
  '钱不够',
  '体力不足',
  '今天被拉黑了',
  '去了回不来',
  '开放',
  '往返体力',
  '去这里',
  '去不了',
  '关闭',
  '点击继续',
  '环卫阿姨塞给你一个热包子',
  '比谁掏得快',
  '狂点屏幕！',
  '点击屏幕',
  '体力',
  '本次',
  '剩余体力',
  '请留够体力再按',
  '回家消耗',
  '回家需',
  '今日收入',
  '最离谱',
  '饱腹剩余',
  '体力剩余',
  '今日战绩',
  '深圳欢迎你',
  '深圳生存失败',
  '深圳生存认证',
  '存活天数',
  '开箱数',
  '最值钱的货',
  '总收入',
  '编号',
  '日期',
  '称号',
  '二维码',
  '第 10 天',
  '今天一无所获，深圳的天空依旧灰蒙蒙',
  '手一抖，掏出了一团糟糕',
  '猫主子给了你一巴掌',
  '今天的垃圾桶格外暴躁',
  '你被垃圾教育了',
  '离开时，没装的东西落在了原地',
  '回家路上，面前的宝贝不见了',
  '倒下后，面前的宝贝消失了',
  '背包被没收了',
  '包里没吃的',
  '大叔笑着走了',
  '大叔指路请你走，背包被没收',
  '未知',
  '大盒',
  '小盒',
  '雨',
  '限定',
];

/** 带模板变量的固定文案（会按所有变量取值展开）。 */
export const TEMPLATE_COPY: string[] = [
  ...DAY_ROASTS.map((roast) => roast.text),
  ...(Object.keys(DEATH_LINES) as DeathCauseId[]).reduce<string[]>((all, key) => all.concat(DEATH_LINES[key]), []),
  ...Object.values(EVENT_PRESENTATIONS).map((pres) => pres.desc),
  ...allEventResultTexts(),
  '掏出：{items}，深圳欢迎你',
  '体力 {stamina} · 本次 -{cost}',
  '第 {day} 天 · 只在今天生效',
  '第 {day} 天 · {home}',
  '重抽 ¥{cost}',
  '还差 ¥{cost}',
  '你在{spot}睡着了，醒来还是身无分文，但至少没丢东西。',
  '你在{spot}睡着了，醒来少了 {n} 样东西：{items}。',
  '第 {day} 天卖出：{items}，收入 ¥{income}',
  '我在深圳只活了 {day} 天',
  '我拿到了深圳生存认证：{title}',
  '称号：{title}',
  '存活 {day} 天 · 开箱 {n} 个',
  '最值钱的货：{best}（¥\u00A0{income}）',
  '编号：{n}  日期：{date}',
  '今天收入 ¥\u00A0{income}，深圳的垃圾桶都开始尊重你了。',
  '抱着「{best}」回家，像抱着整个华强北。',
  '今天捡到「{best}」，运气好得不像在深圳。',
  '住进{home}，至少梦里不用再躲城管。',
  '回到{home}，把今天的委屈折成纸皮。',
];

/** 模板变量的真实取值：货物名/地点名/落脚点名/数字都参与分词。 */
export const TEMPLATE_VARIABLES: Record<string, string[]> = {
  best: ITEM_NAMES,
  items: ITEM_NAMES,
  home: HOME_NAMES,
  spot: SLEEP_SPOTS.map((spot) => spot.name),
  title: SURVIVAL_TITLES.map((title) => title.name),
  day: DAY_VALUES,
  n: SMALL_NUMBERS,
  income: MONEY_VALUES,
  cost: MONEY_VALUES,
  stamina: SMALL_NUMBERS,
  hunger: SMALL_NUMBERS,
  date: ['2026.11.10', '11/10/2026'],
};

/** 签文/签头/指定地点：三档签头都要覆盖。 */
export function fortuneTexts(): string[] {
  const out: string[] = [];
  for (const fortune of FORTUNES) {
    const header = `【${TIER_NAMES[fortune.tier] ?? '签'} · ${fortune.name}】`;
    out.push(header, fortune.text, buildFortuneText(fortune));
    for (const loc of LOCATIONS) {
      out.push(buildFortuneText(fortune, loc.name), `指定地点：${loc.name}`);
    }
  }
  return out;
}

/** 地图/拾荒页/地点页的动态文案。 */
export function dynamicUiTexts(): string[] {
  const out: string[] = [];
  for (const loc of LOCATIONS) {
    out.push(`${loc.name}今天好像热闹点`, `${loc.name}感觉不太妙`);
    out.push(`${loc.name} · 今日拉黑`, `${loc.name} · 回不去`);
    for (const day of DAY_VALUES) out.push(`第 ${day} 天开放`, `开放：第 ${day} 天`);
    out.push(`往返体力：${loc.distance * 2}（去 ${loc.distance} / 回 ${loc.distance}）`);
    out.push(`今日限定：${loc.name}`, `今日限定：无`, loc.line);
  }
  for (const special of DAILY_SPECIALS) out.push(special.name, special.desc);
  for (const item of ITEMS) {
    out.push(`掏出：${item.name}，深圳欢迎你`);
    out.push(`最值钱的货：${item.name}（¥\u00A0123.45）`);
    out.push(`抱着「${item.name}」回家，像抱着整个华强北。`);
    out.push(`今天捡到「${item.name}」，运气好得不像在深圳。`);
  }
  out.push('体力 100 / 本次将扣 999.9 / 请留够体力再按');
  out.push('剩余体力 100 / 本次将扣 999.9 / 请留够体力再按');
  return out;
}

/** 原始固定文案（不含模板展开）。 */
export const COPY_CORPUS: string[] = uniqueTexts([
  ...ITEM_NAMES,
  ...ITEMS.map((item) => item.desc),
  ...LOCATIONS.reduce<string[]>((all, loc) => all.concat(loc.name, loc.landmarkName, loc.line), []),
  ...FORTUNES.reduce<string[]>((all, fortune) => all.concat(fortune.name, fortune.text), []),
  ...DAILY_SPECIALS.reduce<string[]>((all, special) => all.concat(special.name, special.desc), []),
  ...SURVIVAL_TITLES.reduce<string[]>((all, title) => all.concat(title.name, title.desc), []),
  ...(Object.keys(DEATH_LINES) as DeathCauseId[]).reduce<string[]>((all, key) => all.concat(DEATH_LINES[key]), []),
  ...DAY_ROASTS.map((roast) => roast.text),
  ...EVENTS.reduce<string[]>((all, ev) => all.concat(ev.name, ...ev.options), []),
  ...Object.values(EVENT_PRESENTATIONS).map((pres) => pres.desc),
  ...Object.keys(EVENT_RESULT_TEXTS).reduce<string[]>((all, key) => all.concat(EVENT_RESULT_TEXTS[key as keyof typeof EVENT_RESULT_TEXTS]), []),
  ...SLEEP_SPOTS.map((spot) => spot.name),
  ...CONFIG.homeLevels.map((home) => home.name),
  ...UI_COPY,
  ...TEMPLATE_COPY,
  ...fortuneTexts(),
  ...dynamicUiTexts(),
]);

/** 全部需要预计算断点的文案：固定文案 + 所有模板变量展开值。 */
export function allWordBreakTexts(): string[] {
  const expanded: string[] = [];
  for (const template of TEMPLATE_COPY) {
    expanded.push(...expandTemplate(template, TEMPLATE_VARIABLES));
  }
  return uniqueTexts([
    ...COPY_CORPUS,
    ...expanded,
    ...fortuneTexts(),
    ...dynamicUiTexts(),
  ].map((text) => protectAtomicNameSpaces(text)));
}
