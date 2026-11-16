/**
 * 中文断词/避头尾/平衡断行（纯计算，不依赖 cc）。
 *
 * 断点来源：
 *   1. 运行时环境有 Intl.Segmenter 时，直接调用
 *      Intl.Segmenter('zh', { granularity: 'word' })；
 *   2. 没有时使用构建期脚本 scripts/gen-wordbreak.mjs 生成的
 *      WordBreakData.ts（Node ICU 预计算），并可用同文件词表兜底动态文案。
 *
 * 运行时绝不再逐字换行：只允许在词边界断行，并按中文避头尾规则过滤断点。
 * 显式换行（\n）原样保留；签头【…】作为整体不拆。
 */
import { WORD_BREAKS, WORD_LEXICON } from './WordBreakData';
import { CONFIG, ITEMS, LOCATIONS, SLEEP_SPOTS, SURVIVAL_TITLES } from '../core/config';

export interface WordBreakOptions {
  /** 末行至少多少个有效字；默认 4。 */
  minLast?: number;
  /** 【…】签头整体不拆；默认 true。 */
  protectHeader?: boolean;
}

const ATOMIC_PATTERNS: RegExp[] = [
  // 带标签日期：日期：2026.11.10 / 时间：11/10/2026
  /(?:日期|时间)[：:][ \u00A0]*(?:\d{4}[.\/-]\d{1,2}[.\/-]\d{1,2}|\d{1,4}\/\d{1,2}\/\d{1,4})/g,
  // 括号价格/价格数字：保持「（¥ 27.00）」整体。
  /[（(][ \u00A0]*[¥￥][ \u00A0]*\d[\d,]*(?:\.\d+)?[ \u00A0]*[）)]/g,
  /[¥￥][ \u00A0]*\d[\d,]*(?:\.\d+)?/g,
  // 日期
  /\d{4}[.\/-]\d{1,2}[.\/-]\d{1,2}/g,
  /\d{1,4}\/\d{1,2}\/\d{1,4}/g,
  // 数字/价格数字不拆
  /\d[\d,]*(?:\.\d+)?/g,
  // 英文/型号不拆
  /[A-Za-z][A-Za-z0-9_+.-]*/g,
];

/**
 * r35 不可断短语/语法单元。
 *
 * 这些不是「手写全部词典」，而是补 Intl.Segmenter 在口语/网络文案里
 * 切得过碎的几类：
 *   1. 复合词：潮牌、T 恤、委屈、升级……
 *   2. 代词/介词 + 后续词：你升级、把今天、给你留……
 *   3. 数量词 + 名词：那件货、十五天、两个……
 * 断点白名单会拒绝落在这些 span 内部的偏移。
 */
export const ATOMIC_PHRASES: string[] = [
  '过季潮牌', '过季潮牌T恤', '潮牌', 'T 恤', 'T恤', 'T\u00A0恤',
  '大吉', '中吉', '小吉', '好签', '平签', '坏签',
  '宝贝在等你', '在等你', '等你', '别忘了', '别忘', '忘了',
  '活满十五天', '活满', '十五天',
  '你升级', '我升级', '他升级', '升级',
  '把今天', '今天的委屈', '委屈',
  '给你留了', '给你留', '给你', '给我', '给他',
  '那件货', '这件货', '哪件货', '每件货',
  '那件', '这件', '哪件', '每件', '一件', '两件', '三件', '几件', '半件',
  '这个', '那个', '哪个', '每个', '某个',
  '这些', '那些', '哪些', '一些',
  '两个', '三个', '一个', '几个', '半个',
  '现在', '已经', '还是', '就是', '不是', '没有', '可以', '因为', '所以', '小单间', '城中村', '华强北', '世界之窗', '地铁站', '外卖柜', '取餐码', '图书馆', '糖水铺', '小板凳',
];

/**
 * r36：所有物品名、地点名、称号 / 落脚点名都是不可拆的排版单元。
 * 名字内部若带空格（「过季潮牌 T 恤」「福田 CBD」），构建期统一换成
 * 不换行空格，保证 Label 也不会在空格处自行折行。这里同时登记去空格
 * 与 NBSP 变体，运行时无论数据来自配置还是旧存档都能命中。
 */
function nameVariants(name: string): string[] {
  const raw = String(name ?? '');
  if (!raw) return [];
  const compact = raw.replace(/[ \u00A0]+/g, '');
  const nbsp = raw.replace(/[ \u00A0]+/g, '\u00A0');
  return [raw, compact, nbsp].filter((value, index, all) => value && all.indexOf(value) === index);
}

export const ATOMIC_NAMES: string[] = (() => {
  const names: string[] = [];
  const add = (value: string): void => {
    for (const variant of nameVariants(value)) if (!names.includes(variant)) names.push(variant);
  };
  for (const item of ITEMS) add(item.name);
  for (const loc of LOCATIONS) add(loc.name);
  for (const title of SURVIVAL_TITLES) add(title.name);
  for (const spot of SLEEP_SPOTS) add(spot.name);
  for (const home of CONFIG.homeLevels) add(home.name);
  return names;
})();

/** 把所有已知品名内部的普通空格替换成不换行空格（长度不变，offset 不变）。 */
export function protectAtomicNameSpaces(text: string): string {
  let value = String(text ?? '');
  if (!value) return value;
  for (const name of ATOMIC_NAMES) {
    if (!/[ \u00A0]/.test(name)) continue;
    const compact = name.replace(/[ \u00A0]+/g, '');
    if (!compact) continue;
    // 同时匹配普通空格版和 NBSP 版，输出统一为 NBSP。
    const pattern = new RegExp(compact.split('').map((ch) => ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('[ \u00A0]*'), 'g');
    value = value.replace(pattern, (match) => {
      const nbsp = match.replace(/[ \u00A0]+/g, '\u00A0');
      return nbsp;
    });
  }
  return value;
}

const PRONOUNS = '我|你|他|它';
const PREPOSITIONS = '把|被|让|给|对|向|从|在|为|与|和|跟|同|将|替|往|按|用|拿|比';
const MEASURES = '件|个|只|条|张|天|年|夜|次|箱|块|元|米|人|份|套|双|把|本|台|部|辆|家|间|层|楼|步|秒|分|小时|位|名|口|碗|杯|瓶|袋|包|盒';
const NUMBER = '[0-9零一二两三四五七九十几半]+';
const HAN = '[\\u4E00-\\u9FFF]';

/** 代词/介词 + 后一个字：禁止在代词、介词后立刻断行。 */
const PRONOUN_PREP_RE = new RegExp(`(?:${PRONOUNS}|${PREPOSITIONS})${HAN}`, 'g');
/** 数量词 + 量词 + 可选名词：整段不可断。 */
const QUANTITY_RE = new RegExp(`${NUMBER}(?:${MEASURES})${HAN}?`, 'g');
/** 英文型号/字母 + 空格 + 汉字：T 恤、A 股。 */
const ASCII_CJK_RE = /[A-Za-z][A-Za-z0-9_+.-]*[ \u00A0]+[\u4e00-\u9fff]/g;
const ASCII_CJK_TIGHT_RE = /[A-Za-z][A-Za-z0-9_+.-]*[\u4e00-\u9fff]/g;

function addSpan(spans: Array<[number, number]>, start: number, end: number): void {
  if (end > start) spans.push([start, end]);
}

/** 返回文本中所有不可断的 UTF-16 区间（已合并重叠区间）。 */
export function protectedPhraseSpans(text: string): Array<[number, number]> {
  const value = String(text ?? '');
  if (!value) return [];
  const spans: Array<[number, number]> = [];
  for (const phrase of ATOMIC_PHRASES.concat(ATOMIC_NAMES)) {
    let from = 0;
    while (from < value.length) {
      const at = value.indexOf(phrase, from);
      if (at < 0) break;
      addSpan(spans, at, at + phrase.length);
      from = at + 1;
    }
  }
  for (const re of [PRONOUN_PREP_RE, QUANTITY_RE, ASCII_CJK_RE, ASCII_CJK_TIGHT_RE]) {
    re.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = re.exec(value)) !== null) {
      addSpan(spans, match.index, match.index + match[0].length);
      if (match[0].length === 0) re.lastIndex++;
    }
  }
  if (spans.length === 0) return [];
  spans.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const merged: Array<[number, number]> = [];
  for (const span of spans) {
    const last = merged[merged.length - 1];
    if (last && span[0] <= last[1]) {
      last[1] = Math.max(last[1], span[1]);
    } else {
      merged.push([span[0], span[1]]);
    }
  }
  return merged;
}

/** 该 UTF-16 offset 是否落在不可断短语内部。 */
export function isInsideProtectedPhrase(text: string, offset: number): boolean {
  if (!Number.isInteger(offset) || offset <= 0) return false;
  return protectedPhraseSpans(text).some(([start, end]) => offset > start && offset < end);
}

/** r35 断点白名单：词边界 + 避头尾 + 不在不可断短语内部。 */
export function isWordBreakWhitelisted(text: string, offset: number): boolean {
  const value = String(text ?? '');
  if (!Number.isInteger(offset) || offset <= 0 || offset >= value.length) return true;
  const prev = value[offset - 1];
  const next = value[offset];
  if (!prev || !next) return true;
  if (prev === '\n' || next === '\n' || prev === '\r' || next === '\r') return false;
  const spans = protectedPhraseSpans(value);
  if (spans.some(([start, end]) => offset > start && offset < end)) return false;
  const isPhraseBoundary = spans.some(([start, end]) => offset === start || offset === end);
  if (!rawWordOffsets(value).includes(offset) && !isPhraseBoundary) return false;
  if (LINE_START_FORBIDDEN.has(next)) return false;
  if (LINE_END_FORBIDDEN.has(prev)) return false;
  if (isAsciiWordChar(prev) && isAsciiWordChar(next)) return false;
  if (prev === '¥' || prev === '￥') return false;
  return true;
}

/**
 * 审计一段已排好的行：返回所有非法断点（用于单测/构建期校验）。
 * 不合法原因：断在不可断短语内部、行首/行尾避头尾字符。
 */
export interface WordBreakViolation {
  line: number;
  offset: number;
  prev: string;
  next: string;
  reason: 'phrase' | 'line-start' | 'line-end';
}

export function auditWrappedLines(text: string, lines: string[]): WordBreakViolation[] {
  const value = String(text ?? '');
  const normalized = value.replace(/\u00A0/g, ' ');
  const out: WordBreakViolation[] = [];
  let offset = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? '';
    const normalizedLine = line.replace(/\u00A0/g, ' ');
    // 行内容可能因 trim / 不换行空格与原文略有差异；用归一化后的原文顺序查找。
    const at = line.length === 0 ? offset : normalized.indexOf(normalizedLine, offset);
    if (at < 0) break;
    if (i > 0) {
      const prev = value[at - 1];
      const next = value[at];
      if (isInsideProtectedPhrase(value, at)) {
        out.push({ line: i, offset: at, prev, next, reason: 'phrase' });
      } else if (LINE_START_FORBIDDEN.has(next)) {
        out.push({ line: i, offset: at, prev, next, reason: 'line-start' });
      } else if (LINE_END_FORBIDDEN.has(prev)) {
        out.push({ line: i, offset: at, prev, next, reason: 'line-end' });
      }
    }
    offset = at + line.length;
    if (value[offset] === '\n') offset++;
  }
  return out;
}

/** 显式换行拆分后逐段审计；行内容按原顺序拼接。 */
export function auditTextWrap(text: string, lines: string[]): WordBreakViolation[] {
  return auditWrappedLines(text, lines);
}

/**
 * 行首禁止字符（避头）：标点、右括号、以及「了的吗呢吧啊」。
 * 用码点构造而不是直接写字符串，避免把纯排版规则字符加进 BMFont 覆盖集。
 */
const LINE_START_FORBIDDEN = new Set([
  0xff0c, 0x3002, 0x3001, 0xff01, 0xff1f, 0xff1a, 0xff1b, 0x300d, 0xff09,
  0x3015, 0xff3d, 0xff5d, 0x300b, 0x3009, 0x2026, 0x2014, 0xff5e, 0xb7,
  0x2c, 0x2e, 0x21, 0x3f, 0x3b, 0x3a, 0x29, 0x5d, 0x7d, 0x3011, 0x201d,
  0x2019, 0x4e86, 0x7684, 0x5417, 0x5462, 0x5427, 0x554a,
].map((code) => String.fromCharCode(code)));
/** 行尾禁止字符（避尾）：左括号/左引号。 */
const LINE_END_FORBIDDEN = new Set([
  0xff08, 0x300c, 0x3010, 0x3014, 0xff3b, 0xff5b, 0x300a, 0x3008, 0x201c,
  0x2018,
].map((code) => String.fromCharCode(code)));
/** 有效字统计时忽略的标点/符号。 */
const PUNCTUATION = /[\u0021-\u002F\u003A-\u0040\u005B-\u0060\u007B-\u007E\u00A5\u00B7\u2000-\u206F\u3000-\u303F\uFE10-\uFE1F\uFE30-\uFE4F\uFF01-\uFF0F\uFF1A-\uFF20\uFF3B-\uFF40\uFF5B-\uFF65\uFFE5]/;

let cachedSegmenter: any = null;
let segmenterChecked = false;

function runtimeSegmenter(): any {
  if (segmenterChecked) return cachedSegmenter;
  segmenterChecked = true;
  try {
    const IntlAny = (globalThis as any).Intl;
    if (IntlAny && typeof IntlAny.Segmenter === 'function') {
      cachedSegmenter = new IntlAny.Segmenter('zh', { granularity: 'word' });
    }
  } catch (e) {
    cachedSegmenter = null;
  }
  return cachedSegmenter;
}

function collectAtomicSpans(text: string): Array<[number, number]> {
  const spans: Array<[number, number]> = [];
  for (const pattern of ATOMIC_PATTERNS) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      const start = match.index;
      const end = start + match[0].length;
      if (end > start) spans.push([start, end]);
      if (match[0].length === 0) pattern.lastIndex++;
    }
  }
  return spans;
}

function insideAtomicSpan(index: number, spans: Array<[number, number]>): boolean {
  for (const [start, end] of spans) {
    if (index > start && index < end) return true;
  }
  return false;
}

/** 无 Intl.Segmenter 时：用生成词表做最长匹配，得到词边界。 */
function lexiconOffsets(text: string): number[] {
  const offsets: number[] = [];
  let i = 0;
  while (i < text.length) {
    let matched = '';
    for (const word of WORD_LEXICON) {
      if (word.length <= matched.length) continue;
      if (text.startsWith(word, i)) matched = word;
    }
    if (matched) {
      i += matched.length;
      if (i < text.length) offsets.push(i);
      continue;
    }
    // 未知字符：按单个码点前进，但不把该位置当断点，让调用方最终按整段处理。
    const cp = text.codePointAt(i) ?? 1;
    i += cp > 0xffff ? 2 : 1;
  }
  return offsets;
}

function rawWordOffsets(text: string): number[] {
  const segmenter = runtimeSegmenter();
  if (segmenter) {
    const offsets: number[] = [];
    for (const part of segmenter.segment(text)) {
      const index = typeof part.index === 'number' ? part.index : 0;
      if (index > 0) offsets.push(index);
    }
    return offsets;
  }
  const precomputed = WORD_BREAKS[text]
    ?? WORD_BREAKS[text.replace(/\u00A0/g, ' ')]
    ?? WORD_BREAKS[text.replace(/[ \u00A0]+/g, '')];
  if (precomputed) return precomputed.slice();
  return lexiconOffsets(text);
}

function isAsciiWordChar(ch: string | undefined): boolean {
  return !!ch && /[A-Za-z0-9_]/.test(ch);
}

/**
 * 当前文本的合法词边界（UTF-16 offset）。过滤避头尾、价格/日期/英文/数字内部。
 */
export function wordBreakOffsets(text: string): number[] {
  const value = protectAtomicNameSpaces(String(text ?? ''));
  if (!value) return [];
  const spans = collectAtomicSpans(value);
  const out: number[] = [];
  let last = 0;
  for (const index of rawWordOffsets(value)) {
    if (index <= last || index <= 0 || index >= value.length) continue;
    const prev = value[index - 1];
    const next = value[index];
    if (!prev || !next) continue;
    if (prev === '\n' || next === '\n' || prev === '\r' || next === '\r') continue;
    if (insideAtomicSpan(index, spans)) continue;
    if (LINE_START_FORBIDDEN.has(next)) continue;
    if (LINE_END_FORBIDDEN.has(prev)) continue;
    if (isAsciiWordChar(prev) && isAsciiWordChar(next)) continue;
    if (prev === '¥' || prev === '￥') continue;
    if (isInsideProtectedPhrase(value, index)) continue;
    out.push(index);
    last = index;
  }
  return out;
}

function firstNonSpace(text: string): string {
  for (const ch of text) if (!/\s/.test(ch)) return ch;
  return '';
}

function lastNonSpace(text: string): string {
  const chars = Array.from(text);
  for (let i = chars.length - 1; i >= 0; i--) if (!/\s/.test(chars[i])) return chars[i];
  return '';
}

/** 把标点/「的」等粘到相邻词上，保证 line breaker 没有机会在避头尾位置断行。 */
function normalizeUnits(units: string[]): string[] {
  const out: string[] = [];
  for (const unit of units) {
    if (!unit) continue;
    if (out.length === 0) {
      out.push(unit);
      continue;
    }
    const startsForbidden = LINE_START_FORBIDDEN.has(firstNonSpace(unit));
    let last = out.length - 1;
    const endsForbidden = LINE_END_FORBIDDEN.has(lastNonSpace(out[last]));
    if (startsForbidden || endsForbidden) {
      // 如果末尾只是空格，连同前面的词一起粘住，避免断行后行首仍是标点。
      if (last > 0 && /^\s+$/.test(out[last])) {
        out[last - 1] += out[last] + unit;
        out.pop();
      } else {
        out[last] += unit;
      }
      continue;
    }
    out.push(unit);
  }
  return out;
}

/** 把文本切成换行单元：词/原子价格/日期/显式换行。 */
export function splitWordUnits(text: string): string[] {
  const value = protectAtomicNameSpaces(String(text ?? ''));
  const units: string[] = [];
  const paragraphs = value.split('\n');
  for (let p = 0; p < paragraphs.length; p++) {
    const paragraph = paragraphs[p];
    const offsets = [0, ...wordBreakOffsets(paragraph), paragraph.length];
    const raw: string[] = [];
    for (let i = 0; i + 1 < offsets.length; i++) {
      const piece = paragraph.slice(offsets[i], offsets[i + 1]);
      if (piece) raw.push(piece);
    }
    units.push(...normalizeUnits(raw));
    if (p < paragraphs.length - 1) units.push('\n');
  }
  return units;
}

/** 有效字符数：标点、符号、空格不算。用于孤行判断。 */
export function meaningfulCharCount(text: string): number {
  let count = 0;
  for (const ch of String(text ?? '')) {
    if (PUNCTUATION.test(ch) || /\s/.test(ch)) continue;
    count++;
  }
  return count;
}

function isProtectedHeader(paragraph: string): boolean {
  return /^【[^】]*】$/.test(paragraph);
}

/**
 * r36：签头「【好签 · 大吉】」整体不可拆；只有整行放不下时才按语义
 * 拆成「【好签】」和「大吉」两行，绝不从中间任意断字。
 */
function splitFortuneHeader(
  header: string,
  maxWidth: number,
  measure: (text: string) => number,
): string[] {
  if (measure(header) <= maxWidth + 0.001) return [header];
  const match = /^【([^】·]+?)\s*·\s*([^】]+?)】$/.exec(header);
  if (!match) return [header];
  const tier = `【${match[1].trim()}】`;
  const name = match[2].trim();
  const lines: string[] = [];
  for (const part of [tier, name]) {
    if (measure(part) <= maxWidth + 0.001 || lines.length === 0) lines.push(part);
    else lines.push(part);
  }
  return lines;
}

function trimLine(text: string): string {
  return text.replace(/^\s+|\s+$/g, '');
}

/**
 * 品名/称号本身长于整行时，才允许退回按词断（而不是让整段溢出屏幕）。
 * 这里故意忽略「品名整体保护」，只保留避头尾与英文/数字内部不断。
 */
function splitOverlongUnit(
  unit: string,
  maxWidth: number,
  measure: (text: string) => number,
): string[] {
  if (!unit || measure(unit) <= maxWidth + 0.001) return [unit];
  const offsets = [0];
  for (const index of rawWordOffsets(unit)) {
    if (index <= 0 || index >= unit.length) continue;
    const prev = unit[index - 1];
    const next = unit[index];
    if (!prev || !next) continue;
    if (LINE_START_FORBIDDEN.has(next) || LINE_END_FORBIDDEN.has(prev)) continue;
    if (isAsciiWordChar(prev) && isAsciiWordChar(next)) continue;
    offsets.push(index);
  }
  offsets.push(unit.length);
  offsets.sort((a, b) => a - b);
  const pieces: string[] = [];
  for (let i = 0; i + 1 < offsets.length; i++) {
    const piece = unit.slice(offsets[i], offsets[i + 1]);
    if (piece) pieces.push(piece);
  }
  if (pieces.length <= 1) {
    // 连词边界都没有：按码点兜底，至少不会把整段顶出纸面。
    return Array.from(unit);
  }
  const lines: string[] = [];
  let line = '';
  for (const piece of pieces) {
    const test = line + piece;
    if (line && measure(trimLine(test)) > maxWidth + 0.001) {
      lines.push(trimLine(line));
      line = piece;
    } else {
      line = test;
    }
  }
  if (line || lines.length === 0) lines.push(trimLine(line));
  return lines;
}

function wrapParagraph(
  paragraph: string,
  maxWidth: number,
  measure: (text: string) => number,
  options: Required<Pick<WordBreakOptions, 'minLast' | 'protectHeader'>>,
): string[] {
  if (!paragraph) return [''];
  if (options.protectHeader) {
    // 签头【…】整体不拆：即使后面紧跟正文，也先单独成行。
    const headerMatch = /^(【[^】]*】)(.+)$/.exec(paragraph);
    if (headerMatch) {
      const header = headerMatch[1];
      const rest = headerMatch[2];
      if (measure(paragraph) > maxWidth + 0.001) {
        return [...splitFortuneHeader(header, maxWidth, measure), ...wrapParagraph(rest, maxWidth, measure, options)];
      }
    }
    if (isProtectedHeader(paragraph)) return splitFortuneHeader(paragraph, maxWidth, measure);
  }
  let units = splitWordUnits(paragraph).filter((unit) => unit !== '\n');
  if (units.length === 0) return [''];
  // 普通品名整词放不下时才退化按词断，避免为了保整名把整行顶出文字区。
  units = units.reduce<string[]>((all, unit) => {
    if (measure(unit) > maxWidth + 0.001) all.push(...splitOverlongUnit(unit, maxWidth, measure));
    else all.push(unit);
    return all;
  }, []);
  // 整段放得下就不拆。
  if (measure(paragraph) <= maxWidth + 0.001) return [paragraph];

  const n = units.length;
  const prefixWidth = new Array<number>(n + 1).fill(0);
  for (let i = 0; i < n; i++) prefixWidth[i + 1] = prefixWidth[i] + measure(units[i]);
  const lineWidth = (i: number, j: number): number => {
    let line = units.slice(i, j).join('');
    line = trimLine(line);
    return measure(line);
  };

  const cost = new Array<number>(n + 1).fill(Number.POSITIVE_INFINITY);
  const prev = new Array<number>(n + 1).fill(-1);
  cost[0] = 0;
  const orphanPenalty = 1_000_000;
  const preferPunctuationBreak = (unit: string): number => {
    const last = lastNonSpace(unit);
    return /[，。、！？：；,.!?;:、】」』）]/.test(last) || /\s/.test(unit.slice(-1)) ? 0 : 25;
  };
  for (let i = 0; i < n; i++) {
    if (!Number.isFinite(cost[i])) continue;
    let j = i + 1;
    // 单行至少一个单元；如果单个单元就超宽，也允许它单独成行（后续由字号降档处理）。
    while (j <= n) {
      const width = lineWidth(i, j);
      if (width > maxWidth + 0.001 && j > i + 1) break;
      const slack = Math.max(0, maxWidth - width);
      // U3：标点/空格处优先于普通词边界（25 远小于行宽差的平方，只做同分优先）。
      let candidate = cost[i] + slack * slack + 1 + preferPunctuationBreak(units[j - 1]);
      const lineText = trimLine(units.slice(i, j).join(''));
      const lineChars = meaningfulCharCount(lineText);
      // r36：任何一行（不只是末行）都不能只剩一个有效字，避免「等/你」「别/忘了」。
      if (lineChars === 1 && n > 1) candidate += orphanPenalty * 4;
      if (j === n && i > 0 && lineChars < options.minLast) candidate += orphanPenalty;
      if (candidate < cost[j]) {
        cost[j] = candidate;
        prev[j] = i;
      }
      if (width > maxWidth + 0.001) break;
      j++;
    }
  }

  let lines: string[] = [];
  if (Number.isFinite(cost[n]) && prev[n] >= 0) {
    let cursor = n;
    while (cursor > 0) {
      const start = prev[cursor];
      if (start < 0) break;
      lines.unshift(trimLine(units.slice(start, cursor).join('')));
      cursor = start;
    }
  }
  if (lines.length === 0) {
    // 兜底：逐单元塞行，保证不丢字。
    let line = '';
    for (const unit of units) {
      const test = line + unit;
      if (line && measure(trimLine(test)) > maxWidth + 0.001) {
        lines.push(trimLine(line));
        line = unit;
      } else {
        line = test;
      }
    }
    if (line || lines.length === 0) lines.push(trimLine(line));
  }
  return lines;
}

/**
 * 平衡断行：显式换行保留，段内用 DP 选择令各行长度尽量均衡的词边界；
 * 末行不足 minLast 个有效字时给高惩罚，最后再由 balanceOrphanLine 兜底。
 */
export function wrapTextToLines(
  text: string,
  maxWidth: number,
  measure: (text: string) => number,
  options: WordBreakOptions = {},
): string[] {
  const value = String(text ?? '');
  const width = Math.max(1, maxWidth);
  const opts = {
    minLast: Math.max(1, options.minLast ?? 4),
    protectHeader: options.protectHeader !== false,
  };
  const paragraphs = value.split('\n');
  const lines: string[] = [];
  for (let i = 0; i < paragraphs.length; i++) {
    const wrapped = wrapParagraph(paragraphs[i], width, measure, opts);
    // 孤行只在同一段内调整；绝不跨显式换行把签头拆开。
    const balanced = balanceOrphanLine(wrapped, {
      maxWidth: width,
      measure,
      minLast: opts.minLast,
    });
    for (const line of balanced) lines.push(line);
  }
  if (lines.length === 0) lines.push('');
  return lines;
}

/**
 * 末行不足 4 个有效字时，从上一行按词边界挪单元下来。
 * 传入 measure + maxWidth 时会复检，挪下来会超宽就停止。
 */
export function balanceOrphanLine(
  lines: string[],
  options: {
    minLast?: number;
    maxWidth?: number;
    fontSize?: number;
    measure?: (text: string) => number;
  } = {},
): string[] {
  if (!Array.isArray(lines) || lines.length < 2) return Array.isArray(lines) ? lines.slice() : [];
  const minLast = Math.max(1, options.minLast ?? 4);
  const out = lines.slice();
  for (let guard = 0; guard < 64; guard++) {
    const lastIndex = out.length - 1;
    const prevIndex = lastIndex - 1;
    if (prevIndex < 0) break;
    if (meaningfulCharCount(out[lastIndex]) >= minLast) break;
    const prevText = out[prevIndex];
    if (isProtectedHeader(prevText)) break;
    const prevUnits = splitWordUnits(prevText).filter((unit) => unit !== '\n');
    if (prevUnits.length <= 1) break;
    const moved = prevUnits[prevUnits.length - 1];
    if (!moved) break;
    const candidateLast = moved + out[lastIndex];
    if (options.measure && options.maxWidth != null) {
      if (options.measure(candidateLast) > options.maxWidth + 0.001) break;
    } else if (options.maxWidth != null && options.fontSize != null) {
      // 延迟 require 会破坏 bundler，这里调用调用方注入的 measure；没有 measure 时用字宽估算。
      const approx = Array.from(candidateLast).length * options.fontSize;
      if (approx > options.maxWidth + 0.001) break;
    }
    prevUnits.pop();
    out[prevIndex] = prevUnits.join('');
    out[lastIndex] = candidateLast;
  }
  return out;
}
