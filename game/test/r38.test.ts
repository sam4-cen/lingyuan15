import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';
import { EVENTS, LOCATIONS } from '../src/core/config';
import {
  DESIGN_HEIGHT,
  DESIGN_WIDTH,
  pxFont,
  pxSpacing,
  setFontScreenMetrics,
} from '../cocos/assets/scripts/ui/PixelFontMetrics';
import {
  EVENT_DESC_BUTTON_GAP,
  EVENT_HUD_HEIGHT,
  EVENT_OPTION_GAP,
  EVENT_PRESENTATIONS,
  computeEventArea,
  computeEventLayout,
  computeEventResultLayout,
} from '../cocos/assets/scripts/ui/EventLayout';
import {
  MAP_MARKER_MARGIN,
  computeBadgeUnderPlate,
  computeMapLayout,
  computeMapPlateHeight,
  computeMapPlateWidth,
  placeMapMarker,
} from '../cocos/assets/scripts/ui/MapLayout';
import { MAP_POINTS } from '../cocos/assets/scripts/ui/ArtMap';

const ROOT = process.cwd();
const GEN_VERSION = path.join(ROOT, 'scripts/gen-version.mjs');
const POSTBUILD_INFO = path.join(ROOT, 'scripts/postbuild-info.mjs');

const EVENT_VIEWPORTS = [
  { name: '375x667', cssW: 375, cssH: 667, dpr: 2, safeBottomCss: 0, headerTopCss: 0 },
  { name: '360x780', cssW: 360, cssH: 780, dpr: 3, safeBottomCss: 0, headerTopCss: 0 },
  { name: '390x844', cssW: 390, cssH: 844, dpr: 3, safeBottomCss: 34, headerTopCss: 88 },
  { name: '428x926', cssW: 428, cssH: 926, dpr: 3, safeBottomCss: 34, headerTopCss: 88 },
];

function cleanEnv(extra: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
  const env = { ...process.env, ...extra };
  delete env.GIT_CONFIG_COUNT;
  delete env.GIT_CONFIG_KEY_0;
  delete env.GIT_CONFIG_VALUE_0;
  delete env.LY15_COMMIT;
  delete env.LY15_ROUND;
  delete env.LY15_VERSION_OUT;
  delete env.LY15_ROOT;
  return env;
}

function git(cwd: string, args: string[]): string {
  return execFileSync('git', args, {
    cwd,
    env: cleanEnv(),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function tempDir(tag: string): string {
  return fs.mkdtempSync(path.join(ROOT, `.tmp-r38-${tag}-`));
}

function removeDir(dir: string): void {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    // best effort
  }
}

function parseVersionTs(src: string): { version: string; hash: string; tag: string; testBuild: boolean } {
  return {
    version: /BUILD_VERSION = "([^"]+)"/.exec(src)?.[1] ?? '',
    hash: /BUILD_HASH = "([^"]+)"/.exec(src)?.[1] ?? '',
    tag: /BUILD_TAG = "([^"]+)"/.exec(src)?.[1] ?? '',
    testBuild: /IS_TEST_BUILD = (true|false)/.exec(src)?.[1] === 'true',
  };
}

function runGenVersion(cwd: string, env: NodeJS.ProcessEnv = cleanEnv()): { status: number | null; stdout: string; stderr: string } {
  const result = spawnSync(process.execPath, [GEN_VERSION], {
    cwd,
    env,
    encoding: 'utf8',
    timeout: 30_000,
  });
  return { status: result.status, stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
}

// ---------------------------------------------------------------------------
// r38 ① gen-version：git 仓库 / worktree 都产出 HEAD 短 hash，tag 不含 dev
// ---------------------------------------------------------------------------

test('r38 gen-version：git 仓库取 HEAD 短 hash，轮次取提交信息 rNN 最大值', () => {
  const repo = tempDir('git');
  try {
    git(repo, ['init', '-q']);
    git(repo, ['config', 'user.email', 'r38@example.com']);
    git(repo, ['config', 'user.name', 'r38']);
    fs.writeFileSync(path.join(repo, 'a.txt'), 'a');
    git(repo, ['add', 'a.txt']);
    git(repo, ['commit', '-q', '-m', 'r36 初始提交']);
    fs.writeFileSync(path.join(repo, 'b.txt'), 'b');
    git(repo, ['add', 'b.txt']);
    git(repo, ['commit', '-q', '-m', 'r37 修复一版']);
    fs.writeFileSync(path.join(repo, 'c.txt'), 'c');
    git(repo, ['add', 'c.txt']);
    git(repo, ['commit', '-q', '-m', 'r38 定稿：版本号/事件页/限定牌']);

    const head = git(repo, ['rev-parse', '--short=7', 'HEAD']);
    const result = runGenVersion(repo);
    assert.equal(result.status, 0, `gen-version 失败：${result.stderr}`);
    const versionFile = path.join(repo, 'cocos/assets/scripts/Version.ts');
    assert.ok(fs.existsSync(versionFile), '没有生成 Version.ts');
    const info = parseVersionTs(fs.readFileSync(versionFile, 'utf8'));
    assert.equal(info.hash, head, 'BUILD_HASH 不是 git HEAD 短 hash');
    assert.equal(info.version, 'r38', 'BUILD_VERSION 不是最近的轮次');
    assert.equal(info.tag, `r38 ${head}`, 'BUILD_TAG 格式不是 r<轮次> <hash>');
    assert.doesNotMatch(info.tag, /dev/, 'tag 仍含 dev');
    assert.equal(info.testBuild, true, '默认测试包没有显示角标');
  } finally {
    removeDir(repo);
  }
});

test('r38 gen-version：worktree 拷贝无 git 命令时从 .git 文件取 hash，tag 不含 dev', () => {
  const repo = tempDir('wt-src');
  const worktree = tempDir('wt-copy');
  try {
    git(repo, ['init', '-q']);
    git(repo, ['config', 'user.email', 'r38@example.com']);
    git(repo, ['config', 'user.name', 'r38']);
    fs.writeFileSync(path.join(repo, 'a.txt'), 'a');
    git(repo, ['add', 'a.txt']);
    git(repo, ['commit', '-q', '-m', 'r37 基线']);
    fs.writeFileSync(path.join(repo, 'b.txt'), 'b');
    git(repo, ['add', 'b.txt']);
    git(repo, ['commit', '-q', '-m', 'r38 worktree 提交']);
    const head = git(repo, ['rev-parse', '--short=7', 'HEAD']);

    fs.rmSync(worktree, { recursive: true, force: true });
    git(repo, ['worktree', 'add', '-q', '--detach', worktree, 'HEAD']);
    assert.ok(fs.statSync(path.join(worktree, '.git')).isFile(), 'worktree 的 .git 不是文件');

    // PATH 置空模拟「非 git 目录」：git 命令不可用，只能读 .git 文件。
    const result = runGenVersion(worktree, cleanEnv({ PATH: '' }));
    assert.equal(result.status, 0, `worktree gen-version 失败：${result.stderr}`);
    const info = parseVersionTs(fs.readFileSync(path.join(worktree, 'cocos/assets/scripts/Version.ts'), 'utf8'));
    assert.equal(info.hash, head, 'worktree 的 hash 不是 HEAD');
    assert.equal(info.version, 'r38', 'worktree 的轮次没有从 logs/HEAD 解析');
    assert.doesNotMatch(info.tag, /dev/, 'worktree tag 仍含 dev');
  } finally {
    removeDir(worktree);
    removeDir(repo);
  }
});

test('r38 gen-version：完全取不到 HEAD 时非 0 退出，绝不写 dev', () => {
  const empty = tempDir('empty');
  try {
    const result = runGenVersion(empty, cleanEnv({ PATH: '' }));
    assert.notEqual(result.status, 0, '没有 HEAD 时 gen-version 仍然成功');
    assert.ok(!fs.existsSync(path.join(empty, 'cocos/assets/scripts/Version.ts')), '失败时仍写了 Version.ts');
    assert.doesNotMatch(result.stderr, /dev/, '错误信息不应诱导写 dev');
  } finally {
    removeDir(empty);
  }
});

// ---------------------------------------------------------------------------
// r38 ② postbuild-info：主包排除 subpackages，大小/JSON/多输出正确
// ---------------------------------------------------------------------------

test('r38 postbuild-info：假 build 目录的 main/bg/total 字节与多输出路径', async () => {
  const root = tempDir('postbuild');
  const build = path.join(root, 'build/wechatgame');
  const out1 = path.join(root, 'ly15_info.json');
  const out2 = path.join(root, 'Documents/ly15_info.json');
  try {
    const write = (rel: string, bytes: number) => {
      const file = path.join(build, rel);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, Buffer.alloc(bytes, 1));
    };
    write('game.js', 100);
    write('assets/a.bin', 200);
    write('subpackages/bg/bg.bin', 300);
    write('subpackages/other/x.bin', 50);

    const mod = await import(pathToFileURL(POSTBUILD_INFO).href);
    assert.deepEqual(mod.measureBuild(build), {
      mainPackageBytes: 300,
      bgSubpackageBytes: 300,
      totalBytes: 650,
      buildDir: path.resolve(build),
    }, '假 build 目录统计口径不对');

    const result = spawnSync(process.execPath, [POSTBUILD_INFO, build, out1, out2], {
      cwd: ROOT,
      env: cleanEnv(),
      encoding: 'utf8',
      timeout: 30_000,
    });
    assert.equal(result.status, 0, `postbuild-info 失败：${result.stderr}`);
    for (const file of [out1, out2]) {
      assert.ok(fs.existsSync(file), `没有写输出 ${file}`);
      const info = JSON.parse(fs.readFileSync(file, 'utf8'));
      assert.equal(info.mainPackageBytes, 300, `${file} mainPackageBytes 不对`);
      assert.equal(info.mainPackageKB, 0.3, `${file} mainPackageKB 不对`);
      assert.equal(info.bgSubpackageBytes, 300, `${file} bgSubpackageBytes 不对`);
      assert.equal(info.totalBytes, 650, `${file} totalBytes 不对`);
      assert.match(info.commit, /^[0-9a-f]{7,}$/, `${file} commit 不是短 hash`);
      assert.match(info.tag, new RegExp(`^r\\d+ ${info.commit}$`), `${file} tag 格式不对`);
      assert.doesNotMatch(info.tag, /dev/, `${file} tag 仍含 dev`);
      assert.ok(Number.isFinite(Date.parse(info.builtAt)), `${file} builtAt 不是 ISO 时间`);
      assert.equal(info.withinLimit, true, `${file} withinLimit 不对`);
    }
  } finally {
    removeDir(root);
  }
});

// ---------------------------------------------------------------------------
// r38 ③ 事件页 T/H 定稿：四尺寸 × 单/双按钮 × 短/长描述
// ---------------------------------------------------------------------------

function designPerCss(vp: typeof EVENT_VIEWPORTS[number]): number {
  return DESIGN_HEIGHT / vp.cssH;
}

function setupEventViewport(vp: typeof EVENT_VIEWPORTS[number]): {
  visibleW: number;
  visibleH: number;
  safeBottom: number;
  headerTop: number;
  sloganTop: number;
} {
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
  const safeAreaBottom = -visibleH / 2 + safeBottom;
  // 与 GameRoot.footerSloganTop 同口径：标语底边贴安全区 +2，高 = 字高 + 8 设计 px。
  const sloganTop = safeAreaBottom + 2 + pxFont(12) + pxSpacing(8);
  return { visibleW, visibleH, safeBottom, headerTop, sloganTop };
}

function overlap(a: { left: number; right: number; top: number; bottom: number }, b: typeof a): boolean {
  return a.left < b.right - 0.001 && a.right > b.left + 0.001
    && a.top > b.bottom + 0.001 && a.bottom < b.top - 0.001;
}

test('r38 事件页定稿：标题12%H / NPC脚底50%H / 描述54%H / 按钮72%H，无重叠', () => {
  try {
    for (const vp of EVENT_VIEWPORTS) {
      const { visibleW, visibleH, safeBottom, headerTop, sloganTop } = setupEventViewport(vp);
      const area = computeEventArea({ visibleH, headerTop, safeBottom, sloganTop });
      assert.ok(area.height > 0, `${vp.name} 可用区高度异常`);
      for (const ev of EVENTS) {
        for (const optionCount of [1, 2]) {
          for (const desc of ['雨大，路滑。', EVENT_PRESENTATIONS[ev.id].desc]) {
            const options = ev.options.slice(0, Math.min(optionCount, ev.options.length));
            while (options.length < optionCount) options.push('继续');
            const layout = computeEventLayout({
              visibleW,
              visibleH,
              headerTop,
              safeBottom,
              sloganTop,
              titleText: ev.name,
              options,
              desc,
              eventId: ev.id,
              dpr: vp.dpr,
            });
            const tag = `${vp.name} ${ev.id} ${optionCount}按钮 ${desc.length > 8 ? '长描述' : '短描述'}`;
            // 标题中心 T + 12%H。
            assert.ok(Math.abs(layout.title.centerY - (area.top - area.height * 0.12)) <= 2.001,
              `${tag} 标题中心不是 T+12%H: ${layout.title.centerY}`);
            const topGapCss = (area.top - layout.title.rect.top) / designPerCss(vp);
            assert.ok(topGapCss <= 80.001, `${tag} 顶栏到标题空隙 ${topGapCss.toFixed(1)} > 80 css`);
            // NPC 脚底 T + 50%H，高度 ≤30%H 且整数倍。
            assert.ok(Math.abs(layout.role.visualBottom - (area.top - area.height * 0.50)) <= 2.001,
              `${tag} NPC 脚底不是 T+50%H: ${layout.role.visualBottom}`);
            assert.ok(layout.role.height <= area.height * 0.30 + 0.51, `${tag} NPC 超过 30%H`);
            assert.equal(layout.role.scale, Math.floor(layout.role.scale), `${tag} NPC 缩放不是整数倍`);
            assert.equal(layout.role.width % 32, 0, `${tag} NPC 宽度不是源图整数倍`);
            // 描述底板顶 T + 54%H；NPC 脚到描述顶 ≤40 css。
            assert.ok(Math.abs(layout.description!.plate.top - (area.top - area.height * 0.54)) <= 2.001,
              `${tag} 描述顶不是 T+54%H: ${layout.description!.plate.top}`);
            const npcDescCss = (layout.role.visualBottom - layout.description!.plate.top) / designPerCss(vp);
            assert.ok(npcDescCss <= 40.001, `${tag} NPC 脚到描述顶 ${npcDescCss.toFixed(1)} > 40 css`);
            // 第一个按钮顶 = max(T+72%H, 描述底+12)；间距 10；末按钮底 ≤ T+H-24。
            const expectedButtonTop = Math.min(
              area.top - area.height * 0.72,
              layout.description!.plate.bottom - EVENT_DESC_BUTTON_GAP,
            );
            assert.ok(Math.abs(layout.buttons.top - expectedButtonTop) <= 2.001,
              `${tag} 首按钮顶不是 max(T+72%H, 描述底+12): ${layout.buttons.top} vs ${expectedButtonTop}`);
            assert.equal(layout.buttons.rects.length, optionCount, `${tag} 按钮数量不对`);
            for (let i = 1; i < layout.buttons.rects.length; i++) {
              const gap = layout.buttons.rects[i - 1].bottom - layout.buttons.rects[i].top;
              assert.ok(Math.abs(gap - EVENT_OPTION_GAP) <= 0.001, `${tag} 按钮间距 ${gap} 不是 10`);
            }
            assert.ok(layout.buttons.bottom >= area.top - area.height + 24 - 2.001,
              `${tag} 末按钮越过 T+H-24: ${layout.buttons.bottom} < ${area.top - area.height + 24}`);
            // 无元素重叠。
            assert.equal(overlap(layout.title.rect, layout.role.rect), false, `${tag} 标题压 NPC`);
            assert.equal(overlap(layout.title.rect, layout.description!.plate), false, `${tag} 标题压描述`);
            assert.equal(overlap(layout.role.rect, layout.description!.plate), false, `${tag} NPC 压描述`);
            assert.equal(overlap(layout.description!.plate, layout.buttons.rects[0]), false, `${tag} 描述压按钮`);
            for (let i = 1; i < layout.buttons.rects.length; i++) {
              assert.equal(overlap(layout.buttons.rects[i - 1], layout.buttons.rects[i]), false,
                `${tag} 按钮互相重叠`);
            }
            // 结果面板顶 = 描述底板顶，与描述互相替换。
            for (const panelH of [96, 140]) {
              const result = computeEventResultLayout(layout, panelH);
              assert.ok(Math.abs(result.top - layout.description!.plate.top) < 0.001,
                `${tag} 结果面板顶不是描述底板顶`);
              assert.equal(result.roleShift, 0, `${tag} 结果面板仍在移动 NPC`);
              assert.ok(Math.abs(result.bottom - (result.top - panelH)) < 0.001, `${tag} 结果面板高度不对`);
            }
          }
        }
      }
    }
  } finally {
    setFontScreenMetrics({
      physicalWidth: DESIGN_WIDTH,
      physicalHeight: DESIGN_HEIGHT,
      visibleWidth: DESIGN_WIDTH,
      visibleHeight: DESIGN_HEIGHT,
      devicePixelRatio: 1,
    });
  }
});

// ---------------------------------------------------------------------------
// r39 ④ 限定牌：右侧居中 2px → 左侧 → 下方 → 并进名字牌左端
// ---------------------------------------------------------------------------

test('r39 限定牌：右侧→左侧→下方→合并，任何档位都不缩成无字小点', () => {
  const src = fs.readFileSync(path.join(ROOT, 'cocos/assets/scripts/GameRoot.ts'), 'utf8');
  assert.match(src, /computeBadgeUnderPlate\(/, '地图没有使用纯函数定位限定牌');
  assert.match(src, /lb\.string = MAP_BADGE_TEXT/, '限定牌没有始终显示「限定」二字');
  assert.doesNotMatch(src, /daily_badge_stamp|MAP_BADGE_STAMP_SIZE|stampSize|badge\.stamp/,
    '仍保留印章/小点分支');
  assert.doesNotMatch(src, /Art\.makeVisual\('badge'/, '仍使用 badge.png 画无字小点');

  const plate = { left: -56, right: 56, top: 20, bottom: -20 };
  const right = computeBadgeUnderPlate(plate, 64, 36, { gap: 2 });
  assert.equal(right.side, 'right');
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
  assert.ok(Math.abs(below.rect.top - (plate.bottom - 2)) < 0.001, '下方间距不是 2px');

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
  assert.ok(Math.abs((merged.rect.top - merged.rect.bottom) - 40) < 0.001, '合并红段没有与名字牌等高');
  assert.equal('stamp' in merged, false, '仍返回 stamp 分支');
});
