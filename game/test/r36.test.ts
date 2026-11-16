import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  CONFIG,
  DAY_ROASTS,
  EVENTS,
  FORTUNES,
  ITEMS,
  LOCATIONS,
  SURVIVAL_TITLES,
} from '../src/core/config';
import {
  DESIGN_HEIGHT,
  DESIGN_WIDTH,
  cssPxToDesign,
  measurePixelTextWidth,
  nodeScaleForSourcePixels,
  physicalPixelsPerDesign,
  physicalPixelsPerSourcePixel,
  pxFont,
  pxSpacing,
  setFontScreenMetrics,
  sourcePixelScaleForTarget,
} from '../cocos/assets/scripts/ui/PixelFontMetrics';
import { fitCardText } from '../cocos/assets/scripts/ui/CardTextLayout';
import {
  ATOMIC_NAMES,
  ATOMIC_PHRASES,
  auditWrappedLines,
  meaningfulCharCount,
  protectAtomicNameSpaces,
  protectedPhraseSpans,
  wrapTextToLines,
} from '../cocos/assets/scripts/ui/WordBreak';
import {
  FORTUNE_TIER_NAMES,
  buildFortuneText,
  computeFortunePaperLayout,
  computeFortunePaperLayoutForText,
  fitFortuneText,
} from '../cocos/assets/scripts/ui/FortuneLayout';
import {
  EVENT_BUTTONS_BOTTOM_GAP,
  EVENT_DESC_BUTTON_GAP,
  EVENT_HUD_HEIGHT,
  EVENT_NPC_DESC_MAX_GAP,
  EVENT_PRESENTATIONS,
  EVENT_RESULT_TEXT_PADDING,
  computeEventArea,
  computeEventLayout,
  computeEventResultLayout,
  eventResultTextWidth,
} from '../cocos/assets/scripts/ui/EventLayout';
import { allEventResultTexts } from '../cocos/assets/scripts/ui/EventCopy';
import {
  MAP_BADGE_MIN_CLEARANCE,
  computeBadgeUnderPlate,
  computeMapLayout,
  computeMapPlateHeight,
  computeMapPlateWidth,
  placeMapMarker,
  rectDistance,
  rectsWithinDistance,
} from '../cocos/assets/scripts/ui/MapLayout';
import { MAP_POINTS } from '../cocos/assets/scripts/ui/ArtMap';
import { BUILD_VERSION, BUILD_HASH, BUILD_TAG, IS_TEST_BUILD } from '../cocos/assets/scripts/Version';

const VIEWPORTS = [
  { name: '320x568', cssW: 320, cssH: 568, dpr: 2, safeBottomCss: 0, headerTopCss: 0 },
  { name: '360x780', cssW: 360, cssH: 780, dpr: 3, safeBottomCss: 0, headerTopCss: 0 },
  { name: '375x667', cssW: 375, cssH: 667, dpr: 2, safeBottomCss: 0, headerTopCss: 0 },
  { name: '390x844', cssW: 390, cssH: 844, dpr: 3, safeBottomCss: 34, headerTopCss: 88 },
  { name: '428x926', cssW: 428, cssH: 926, dpr: 3, safeBottomCss: 34, headerTopCss: 88 },
];

function setViewport(vp: typeof VIEWPORTS[number]): { visibleW: number; visibleH: number; safeBottom: number; headerTop: number } {
  const visibleH = DESIGN_HEIGHT;
  const visibleW = vp.cssW * visibleH / vp.cssH;
  const safeBottom = vp.safeBottomCss * visibleH / vp.cssH;
  const headerTop = vp.headerTopCss * visibleH / vp.cssH;
  setFontScreenMetrics({
    physicalWidth: vp.cssW * vp.dpr,
    physicalHeight: vp.cssH * vp.dpr,
    visibleWidth: visibleW,
    visibleHeight: visibleH,
    devicePixelRatio: vp.dpr,
  });
  return { visibleW, visibleH, safeBottom, headerTop };
}

function resetMetrics(): void {
  setFontScreenMetrics({
    physicalWidth: DESIGN_WIDTH,
    physicalHeight: DESIGN_HEIGHT,
    visibleWidth: DESIGN_WIDTH,
    visibleHeight: DESIGN_HEIGHT,
    devicePixelRatio: 1,
  });
}

function assertNoPhraseSplit(text: string, lines: string[], phrases: string[], tag: string): void {
  for (const phrase of phrases) {
    let from = 0;
    while (from < text.length) {
      const at = text.indexOf(phrase, from);
      if (at < 0) break;
      let offset = 0;
      for (let i = 0; i + 1 < lines.length; i++) {
        offset += lines[i].length;
        if (offset > at && offset < at + phrase.length) {
          assert.fail(`${tag} 「${phrase}」被拆行：${lines.join('/')}`);
        }
      }
      from = at + 1;
    }
  }
}

function assertNoSingleCharLine(lines: string[], tag: string): void {
  for (const line of lines) {
    assert.ok(!(meaningfulCharCount(line) === 1 && lines.length > 1), `${tag} 出现单字孤行：${lines.join('/')}`);
  }
}

// ---------------------------------------------------------------------------
// r36 ① 签文统一走断行器；Label 不再自行折行
// ---------------------------------------------------------------------------

test('r36 签文：所有签 × 五宽度（18号字/真实文字区）无词内断、无单字孤行', () => {
  const rootSrc = fs.readFileSync(path.resolve(process.cwd(), 'cocos/assets/scripts/GameRoot.ts'), 'utf8');
  const layoutSrc = fs.readFileSync(path.resolve(process.cwd(), 'cocos/assets/scripts/ui/FortuneLayout.ts'), 'utf8');
  // 实际签文渲染路径：统一构造 → FortuneLayout(fitFortuneText → wrapTextToLines) → Label 关闭自动换行。
  assert.match(rootSrc, /private currentFortuneText\(\)/, '签文仍在渲染处临时拼接，没有统一构造入口');
  assert.match(rootSrc, /buildFortuneText\(/, '签文没有走统一的签头/正文/指定地点构造器');
  assert.match(rootSrc, /computeFortunePaperLayoutForText\(this\.currentFortuneText\(\)\)/, '签文没有走签纸断行器');
  assert.match(rootSrc, /fortuneLabel\.enableWrapText = false/, '签文 Label 仍允许自带换行');
  assert.match(rootSrc, /fortuneLabel\.overflow = Label\.Overflow\.CLAMP/, '签文 Label 不是 CLAMP');
  assert.match(layoutSrc, /wrapTextToLines\(text, layout\.text\.maxWidth/, 'FortuneLayout 没有调用统一断行器');
  assert.match(layoutSrc, /protectHeader: true/, '签头没有整体保护');

  assert.ok(ATOMIC_PHRASES.includes('大吉') && ATOMIC_PHRASES.includes('小吉')
    && ATOMIC_PHRASES.includes('中吉') && ATOMIC_PHRASES.includes('好签'), '大吉/小吉/中吉/好签不在不可断词表');
  assert.ok(ATOMIC_PHRASES.includes('华强北'), '华强北不在不可断词表');
  for (const phrase of ['大吉', '小吉', '中吉', '好签', '华强北']) {
    const spans = protectedPhraseSpans(`今日${phrase}，宝贝在等你`);
    const at = `今日${phrase}，宝贝在等你`.indexOf(phrase);
    assert.ok(spans.some(([start, end]) => start <= at && end >= at + phrase.length), `${phrase} 没有进入不可断 span`);
  }

  try {
    for (const vp of VIEWPORTS) {
      setViewport(vp);
      const paper = computeFortunePaperLayout();
      const font18 = pxFont(18);
      for (const fortune of FORTUNES) {
        assert.ok(FORTUNE_TIER_NAMES[fortune.tier], `未知签档：${fortune.tier}`);
        for (const loc of [...LOCATIONS, null]) {
          const text = buildFortuneText(fortune, loc?.name ?? null);
          const tag = `${vp.name} ${fortune.name} ${loc?.id ?? '无地点'}`;
          // 需求指定：用签纸真实文字区宽度、18 号字断行。
          const lines18 = wrapTextToLines(text, paper.text.width, (line) =>
            measurePixelTextWidth(line, font18), { minLast: 4, protectHeader: true });
          assertNoPhraseSplit(text, lines18, ['大吉', '小吉', '中吉', '好签', '华强北', '【好签', '中吉】'], tag);
          assertNoSingleCharLine(lines18, tag);
          assert.deepEqual(auditWrappedLines(text, lines18), [], `${tag} 18号字断点非法：${lines18.join('/')}`);
          for (const line of lines18) {
            assert.ok(measurePixelTextWidth(line, font18) <= paper.text.width + 0.001,
              `${tag} 18号字行超宽：${line}`);
          }

          // 实际渲染字号/签纸动态排版也必须满足同一规则。
          const { paper: dynamicPaper, fit } = computeFortunePaperLayoutForText(text);
          assertNoPhraseSplit(text, fit.lines, ['大吉', '小吉', '中吉', '好签', '华强北'], `${tag} 实际渲染`);
          assertNoSingleCharLine(fit.lines, `${tag} 实际渲染`);
          assert.deepEqual(auditWrappedLines(text, fit.lines), [], `${tag} 实际渲染断点非法：${fit.lines.join('/')}`);
          assert.ok(fit.lines.every((line) => measurePixelTextWidth(line, fit.fontSize) <= dynamicPaper.text.width + 0.001),
            `${tag} 实际渲染超宽：${fit.lines.join('/')}`);
          assert.equal(fit.lines[0], `【${FORTUNE_TIER_NAMES[fortune.tier]} · ${fortune.name}】`, `${tag} 签头被拆`);
        }
      }
    }

    // 极窄空间：整行放不下时只能语义拆成「【好签】」「大吉」，不得从中间断字。
    const vp = VIEWPORTS[2];
    setViewport(vp);
    const narrow = wrapTextToLines('【好签 · 大吉】', 100, (line) => measurePixelTextWidth(line, pxFont(18)), {
      minLast: 4,
      protectHeader: true,
    });
    assert.deepEqual(narrow, ['【好签】', '大吉'], `签头窄宽拆分不是语义两行：${narrow.join('/')}`);
  } finally {
    resetMetrics();
  }
});

// ---------------------------------------------------------------------------
// r36 ② 所有品名作为不可断单元
// ---------------------------------------------------------------------------

test('r36 品名：证书/吐槽 × 全部物品名 × 五宽度不被拆开，内部空格为 NBSP', () => {
  assert.match(protectAtomicNameSpaces('过季潮牌 T 恤'), /T\u00A0恤/, 'T 恤内部空格没有换成 NBSP');
  assert.match(protectAtomicNameSpaces('福田 CBD'), /福田\u00A0CBD/, '地点名内部空格没有换成 NBSP');
  for (const item of ITEMS) {
    assert.ok(ATOMIC_NAMES.includes(item.name) || ATOMIC_NAMES.includes(item.name.replace(/[ \u00A0]+/g, '')),
      `物品名没有进入不可断单元：${item.name}`);
  }
  for (const loc of LOCATIONS) {
    assert.ok(ATOMIC_NAMES.includes(loc.name) || ATOMIC_NAMES.includes(loc.name.replace(/[ \u00A0]+/g, '')),
      `地点名没有进入不可断单元：${loc.name}`);
  }
  for (const title of SURVIVAL_TITLES) {
    assert.ok(ATOMIC_NAMES.includes(title.name), `称号没有进入不可断单元：${title.name}`);
  }

  const names = [...ITEMS.map((item) => item.name), ...LOCATIONS.map((loc) => loc.name), ...SURVIVAL_TITLES.map((title) => title.name)];
  const templates: string[] = DAY_ROASTS.map((roast) => roast.text);
  for (const name of names) {
    templates.push(`称号：${name}`, `最值钱的货：${name}（¥\u00A0123.45）`, `指定地点：${name}`);
  }

  try {
    for (const vp of VIEWPORTS) {
      setViewport(vp);
      for (const cssWidth of [320, 360, 375, 390, 428]) {
        const maxWidth = cssPxToDesign(cssWidth);
        for (const template of templates) {
          const text = template.replace(/\{best\}/g, names[(cssWidth + template.length) % names.length]);
          const fit = fitCardText(text, {
            maxWidth,
            maxHeight: 3000,
            fontSize: pxFont(12),
            minFontSize: pxFont(12),
            lineGap: 0,
          });
          const compactLines = fit.lines.map((line) => line.replace(/[ \u00A0]+/g, ''));
          const joined = compactLines.join('');
          let boundary = 0;
          const boundaries: number[] = [];
          for (const line of compactLines) {
            boundary += line.length;
            boundaries.push(boundary);
          }
          for (const name of names) {
            const compactName = name.replace(/[ \u00A0]+/g, '');
            let from = 0;
            while (from < joined.length) {
              const at = joined.indexOf(compactName, from);
              if (at < 0) break;
              for (const b of boundaries) {
                assert.ok(!(b > at && b < at + compactName.length),
                  `${vp.name}@${cssWidth} 品名「${name}」被拆开：${fit.lines.join('/')}`);
              }
              from = at + 1;
            }
          }
        }
      }
    }
  } finally {
    resetMetrics();
  }
});

// ---------------------------------------------------------------------------
// r39 ③ 「限定」小牌避让：右 → 左 → 下方 → 并进名字牌左端
// ---------------------------------------------------------------------------

test('r39 限定小牌：删除印章分支，右侧→左侧→下方→合并', () => {
  const rootSrc = fs.readFileSync(path.resolve(process.cwd(), 'cocos/assets/scripts/GameRoot.ts'), 'utf8');
  assert.match(rootSrc, /blockers\.push\(other\.placement\.icon\)/, '小牌没有把自家地点图标算进碰撞');
  assert.match(rootSrc, /other\.loc\.id !== loc\.id\) blockers\.push\(other\.placement\.plate\)/,
    '小牌没有排除自家名字牌、检测其他名字牌');
  assert.match(rootSrc, /bounds: badgeBounds/, '小牌没有地图可见区边界');
  assert.match(rootSrc, /badge\.merged/, '小牌没有使用合并兜底');
  assert.match(rootSrc, /lb\.string = MAP_BADGE_TEXT/, '限定牌没有始终带「限定」文字');
  assert.doesNotMatch(rootSrc, /Art\.makeVisual\('badge'|daily_badge_stamp|stampSize|badge\.stamp/,
    '仍保留名字牌内红印章/无字小点分支');

  const plate = { left: -56, right: 56, top: 20, bottom: -20 };
  const right = computeBadgeUnderPlate(plate, 64, 36, { gap: 2 });
  assert.equal(right.side, 'right', '默认没有放右侧');
  assert.ok(Math.abs(right.rect.left - (plate.right + 2)) < 0.001, '右侧间距不是 2px');
  assert.ok(Math.abs(right.centerY - 0) < 0.001, '右侧没有垂直居中');

  const left = computeBadgeUnderPlate(plate, 64, 36, {
    gap: 2,
    bounds: { left: plate.left - 100, right: plate.right + 20, top: 100, bottom: -100 },
  });
  assert.equal(left.side, 'left', '右侧出界时没有改左侧');

  const below = computeBadgeUnderPlate(plate, 64, 36, {
    gap: 2,
    bounds: { left: -200, right: 200, top: 100, bottom: -100 },
    blockers: [
      { left: plate.right, right: plate.right + 100, top: 100, bottom: -100 },
      { left: plate.left - 100, right: plate.left, top: 100, bottom: -100 },
    ],
  });
  assert.equal(below.side, 'below', '左右都被占时没有退到下方');
  assert.ok(Math.abs(below.centerX - 0) < 0.001, '下方首选没有水平居中');

  const merged = computeBadgeUnderPlate(plate, 64, 36, {
    gap: 2,
    bounds: { left: -200, right: 200, top: 100, bottom: -100 },
    blockers: [
      { left: plate.right, right: plate.right + 100, top: 100, bottom: -100 },
      { left: plate.left - 100, right: plate.left, top: 100, bottom: -100 },
      { left: -100, right: 100, top: plate.bottom, bottom: -100 },
    ],
  });
  assert.equal(merged.side, 'merged', '下方也放不下时没有并进名字牌');
  assert.equal(merged.merged, true, '合并档没有 merged 标记');
  assert.ok(Math.abs((merged.plateRect!.right - merged.plateRect!.left) - (56 * 2 + 64)) < 0.001,
    '合并后名字牌没有整体加宽');
  assert.equal('stamp' in merged, false, '仍返回 stamp 分支');
  resetMetrics();
});

test('r38 事件页：四尺寸 × 单/双按钮，T/H 定稿位置与结果面板替换', () => {
  const viewSrc = fs.readFileSync(path.resolve(process.cwd(), 'cocos/assets/scripts/ui/EventView.ts'), 'utf8');
  assert.match(viewSrc, /sloganTop: options\.sloganTop/, '事件页没有把标语真实顶边传给布局');
  assert.match(viewSrc, /eventResultTextWidth\(panelW\)/, '结果文字宽度没有走统一内边距函数');
  assert.doesNotMatch(viewSrc, /roleShift/, '结果面板仍在按角色脚底移动');

  try {
    for (const vp of VIEWPORTS) {
      const { visibleW, visibleH, safeBottom, headerTop } = setViewport(vp);
      const safeAreaBottom = -visibleH / 2 + safeBottom;
      const sloganTop = safeAreaBottom + 2 + pxFont(12) + pxSpacing(8);
      const area = computeEventArea({ visibleH, headerTop, safeBottom, sloganTop });
      for (const ev of EVENTS) {
        for (const optionCount of [1, ev.options.length]) {
          const layout = computeEventLayout({
            visibleW,
            visibleH,
            headerTop,
            safeBottom,
            sloganTop,
            titleText: ev.name,
            options: ev.options.slice(0, optionCount),
            desc: EVENT_PRESENTATIONS[ev.id].desc,
            eventId: ev.id,
            cssHeight: vp.cssH,
            dpr: vp.dpr,
          });
          const tag = `${vp.name} ${ev.id} ${optionCount}按钮`;
          assert.ok(Math.abs(layout.title.centerY - (area.top - area.height * 0.12)) <= 2.001,
            `${tag} 标题中心不是 T+12%H`);
          assert.ok(Math.abs(layout.role.visualBottom - (area.top - area.height * 0.50)) <= 2.001,
            `${tag} NPC 脚底不是 T+50%H`);
          assert.ok(Math.abs(layout.description!.plate.top - (area.top - area.height * 0.54)) <= 2.001,
            `${tag} 描述顶不是 T+54%H`);
          assert.ok(Math.abs(layout.buttons.top - Math.min(area.top - area.height * 0.72,
            layout.description!.plate.bottom - EVENT_DESC_BUTTON_GAP)) <= 2.001,
            `${tag} 首按钮顶不是 max(T+72%H, 描述底+12)`);
          assert.ok(layout.buttons.bottom >= area.bottom + EVENT_BUTTONS_BOTTOM_GAP - 2.001,
            `${tag} 末按钮越过标语上沿 +24`);
          assert.ok(layout.buttons.bottom - area.bottom <= area.height,
            `${tag} 按钮组超出可用区`);
          for (let i = 1; i < layout.buttons.rects.length; i++) {
            assert.ok(Math.abs(layout.buttons.rects[i - 1].bottom - layout.buttons.rects[i].top - 10) < 0.51,
              `${tag} 按钮间距不是 10`);
          }
          assert.ok(layout.role.height <= area.height * 0.30 + 0.51, `${tag} NPC 超过可用区 30%`);
          assert.equal(layout.role.scale, Math.floor(layout.role.scale), `${tag} NPC 缩放不是整数倍`);
          const result = computeEventResultLayout(layout, 120);
          assert.ok(Math.abs(result.top - layout.description!.plate.top) < 0.001,
            `${tag} 结果面板顶边不是描述底板顶边`);
          assert.equal(result.roleShift, 0, `${tag} 结果面板仍在挪 NPC`);
        }
      }

      assert.ok(EVENT_RESULT_TEXT_PADDING >= 12 - 0.001,
        `结果文字内边距 ${EVENT_RESULT_TEXT_PADDING} 小于 12 设计 px`);
      const safeW = Math.max(1, visibleW * 0.86);
      for (const text of allEventResultTexts()) {
        const panelW = Math.max(240, Math.min(520, Math.max(safeW * 0.8 + pxSpacing(16), safeW * 0.76)));
        const maxWidth = eventResultTextWidth(panelW);
        assert.equal(maxWidth, panelW - EVENT_RESULT_TEXT_PADDING * 2, '结果文字宽度上限没有扣左右内边距');
        const fit = fitCardText(text, {
          maxWidth,
          maxHeight: Math.max(pxFont(12), area.height * 0.2),
          fontSize: pxFont(12),
          minFontSize: pxFont(12),
          lineGap: 0,
        });
        assert.ok(fit.width <= panelW - EVENT_RESULT_TEXT_PADDING * 2 + 0.001,
          `${vp.name} 结果文字顶满面板：${text}`);
      }
    }
  } finally {
    resetMetrics();
  }
});

// ---------------------------------------------------------------------------
// r36 ⑤ info 同步 + 每源像素物理整数倍
// ---------------------------------------------------------------------------

test('r38 ly15_info：gen-version 只写 Version.ts，postbuild 回填主包/分包/总字节与时间', () => {
  const gen = fs.readFileSync(path.resolve(process.cwd(), 'scripts/gen-version.mjs'), 'utf8');
  assert.match(gen, /rev-parse/, 'gen-version 没有读取 git HEAD');
  assert.match(gen, /readGitDir/, 'gen-version 没有 .git 文件兜底');
  assert.match(gen, /LY15_COMMIT/, 'gen-version 没有环境变量兜底');
  assert.doesNotMatch(gen, /--placeholder|BUILD_HASH\s*=\s*[\"']dev/, 'gen-version 仍允许写 dev');
  const post = fs.readFileSync(path.resolve(process.cwd(), 'scripts/postbuild-info.mjs'), 'utf8');
  assert.match(post, /measureBuild/, 'postbuild-info 没有可单测的 measureBuild');
  assert.match(post, /bgSubpackageBytes/, 'postbuild-info 没有 bg 分包字节');
  assert.match(post, /totalBytes/, 'postbuild-info 没有总字节');
  assert.match(post, /builtAt/, 'postbuild-info 没有 builtAt');
  const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'package.json'), 'utf8'));
  assert.match(pkg.scripts['postbuild:info'] ?? '', /postbuild-info\.mjs/, '缺少 npm run postbuild:info');
  assert.match(pkg.scripts.prebuild ?? '', /prebuild\.mjs/, '缺少 npm run prebuild');
  assert.ok(fs.existsSync(path.resolve(process.cwd(), 'ly15_info.example.json')), '缺少 ly15_info.example.json');
  assert.match(fs.readFileSync(path.resolve(process.cwd(), '.gitignore'), 'utf8'), /ly15_info\.json/,
    'ly15_info.json 没有被 gitignore');
  assert.equal(BUILD_VERSION, `r${BUILD_TAG.split(' ')[0].slice(1)}`, 'Version.ts 版本号与 tag 不同步');
  assert.match(BUILD_HASH, /^[0-9a-f]{7,}$/, 'Version.ts commit 不是短 hash');
  assert.doesNotMatch(BUILD_TAG, /dev/, 'Version.ts tag 仍含 dev');
  assert.equal(IS_TEST_BUILD, true, '默认测试包应显示版本角标');
});

test('r36 每源像素物理像素数：dpr 2/3 下取整为整数，地图/UI/NPC 统一', () => {
  try {
    for (const vp of VIEWPORTS) {
      const { visibleW, visibleH, safeBottom } = setViewport(vp);
      const ppd = physicalPixelsPerDesign();
      const targetPhysical = 32 * 10.56; // 反馈里的 10.56 → 应取整到 10
      const k = sourcePixelScaleForTarget(targetPhysical, 32);
      assert.equal(k, 10, `${vp.name} 每源像素没有从 10.56 取整到 10`);
      const nodeScale = nodeScaleForSourcePixels(k, vp.dpr);
      assert.equal(physicalPixelsPerSourcePixel(nodeScale, vp.dpr), k,
        `${vp.name} dpr${vp.dpr} 每源像素物理像素不是整数`);
      assert.equal((nodeScale * vp.dpr) % 1, 0, `${vp.name} nodeScale × dpr 不是整数`);

      // 地图图标（48 源像素）与 UI 图标（16 源像素）同一规则。
      for (const [designSize, sourceSize] of [[96, 48], [16, 16], [32, 32]] as const) {
        const scale = sourcePixelScaleForTarget(designSize * ppd, sourceSize);
        assert.equal(scale, Math.floor(scale), `${vp.name} ${sourceSize}px 源图缩放不是整数档`);
        assert.ok(scale >= 1, `${vp.name} ${sourceSize}px 源图缩放过小`);
      }

      const events = EVENTS.slice(0, 4);
      for (const ev of events) {
        const layout = computeEventLayout({
          visibleW,
          visibleH,
          headerTop: 0,
          safeBottom,
          titleText: ev.name,
          options: ev.options,
          desc: EVENT_PRESENTATIONS[ev.id].desc,
          eventId: ev.id,
          dpr: vp.dpr,
        });
        assert.equal(layout.role.sourcePixelScale, Math.floor(layout.role.sourcePixelScale),
          `${vp.name} ${ev.id} NPC 每源像素物理像素不是整数`);
        assert.equal(layout.role.nodeScale * vp.dpr, layout.role.sourcePixelScale,
          `${vp.name} ${ev.id} nodeScale ≠ k/dpr`);
      }
    }
  } finally {
    resetMetrics();
  }
});
