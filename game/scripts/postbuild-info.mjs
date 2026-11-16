#!/usr/bin/env node
/**
 * 构建后回填 ly15_info.json（r38）。
 *
 * 用法：
 *   npm run postbuild:info -- build/wechatgame
 *   npm run postbuild:info -- build/wechatgame ly15_info.json ~/Documents/ly15_info.json
 *   npm run postbuild:info -- --report devtools-report.json out.json
 *
 * 统计口径：主包 = build/wechatgame 下除 subpackages 目录外的所有文件字节；
 * bgSubpackageBytes = subpackages/bg 的字节；totalBytes = 全部文件字节。
 */
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { resolveGitInfo } from './gen-version.mjs';

export const MAIN_PACKAGE_LIMIT_KB = 3950;
export const DEFAULT_OUTPUTS = ['ly15_info.json', join('Documents', 'ly15_info.json')];

function isDir(path) {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

/** 递归统计目录字节；shouldSkip 返回 true 的目录不计入。 */
export function directoryBytes(dir, shouldSkip = null) {
  let total = 0;
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return 0;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (shouldSkip && shouldSkip(full, entry.name)) continue;
      total += directoryBytes(full, shouldSkip);
    } else if (entry.isFile()) {
      try {
        total += statSync(full).size;
      } catch {
        // 构建中可能刚好有文件被替换；跳过单个文件。
      }
    }
  }
  return total;
}

/** 对假 build 目录计算 main/bg/total 字节；单测直接调用。 */
export function measureBuild(buildDir) {
  const root = resolve(buildDir);
  if (!isDir(root)) throw new Error(`[postbuild-info] 构建目录不存在：${root}`);
  const subpackages = join(root, 'subpackages');
  const totalBytes = directoryBytes(root);
  const mainPackageBytes = directoryBytes(root, (_full, name) => name === 'subpackages');
  const bgDir = join(subpackages, 'bg');
  const bgSubpackageBytes = isDir(bgDir) ? directoryBytes(bgDir) : 0;
  return { mainPackageBytes, bgSubpackageBytes, totalBytes, buildDir: root };
}

function expandHome(file) {
  if (file === '~') return homedir();
  if (file.startsWith('~/')) return join(homedir(), file.slice(2));
  return file;
}

function parseArgs(argv) {
  const flags = {};
  const positionals = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--build-dir' || arg === '--report') {
      flags[arg] = argv[++i];
    } else if (arg.startsWith('--build-dir=')) {
      flags['--build-dir'] = arg.slice('--build-dir='.length);
    } else if (arg.startsWith('--report=')) {
      flags['--report'] = arg.slice('--report='.length);
    } else if (arg === '--help' || arg === '-h') {
      flags.help = true;
    } else {
      positionals.push(arg);
    }
  }
  return { flags, positionals };
}

function readReport(file) {
  const report = JSON.parse(readFileSync(expandHome(file), 'utf8'));
  const pick = (...keys) => {
    for (const key of keys) {
      const n = Number(report?.[key]);
      if (Number.isFinite(n) && n >= 0) return Math.round(n);
    }
    return null;
  };
  return {
    mainPackageBytes: pick('mainPackageBytes', 'mainPackage', 'mainPackageSize'),
    bgSubpackageBytes: pick('bgSubpackageBytes', 'bgSubpackage', 'subpackageBytes'),
    totalBytes: pick('totalBytes', 'total'),
  };
}

export function buildInfo({ buildDir, report, root = process.cwd(), env = process.env } = {}) {
  const meta = resolveGitInfo(root, env);
  let sizes;
  if (report) {
    const fromReport = readReport(report);
    sizes = {
      mainPackageBytes: fromReport.mainPackageBytes ?? 0,
      bgSubpackageBytes: fromReport.bgSubpackageBytes ?? 0,
      totalBytes: fromReport.totalBytes
        ?? (fromReport.mainPackageBytes ?? 0) + (fromReport.bgSubpackageBytes ?? 0),
    };
  } else {
    sizes = measureBuild(buildDir);
  }
  const mainPackageBytes = sizes.mainPackageBytes;
  return {
    version: meta.version,
    tag: meta.tag,
    commit: meta.hash,
    mainPackageBytes,
    mainPackageKB: Number((mainPackageBytes / 1024).toFixed(1)),
    bgSubpackageBytes: sizes.bgSubpackageBytes,
    totalBytes: sizes.totalBytes,
    builtAt: new Date().toISOString(),
    mainPackageLimitKB: MAIN_PACKAGE_LIMIT_KB,
    withinLimit: mainPackageBytes < MAIN_PACKAGE_LIMIT_KB * 1024,
  };
}

/** 写一个或多个输出路径；返回实际写入的绝对路径。 */
export function writeInfo(info, outputs, cwd = process.cwd()) {
  const files = [];
  for (const output of outputs) {
    const file = resolve(cwd, expandHome(output));
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, `${JSON.stringify(info, null, 2)}\n`, 'utf8');
    files.push(file);
  }
  return files;
}

function isMain(metaUrl) {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    return metaUrl === pathToFileURL(resolve(entry)).href;
  } catch {
    return false;
  }
}

if (isMain(import.meta.url)) {
  const { flags, positionals } = parseArgs(process.argv.slice(2));
  if (flags.help) {
    console.log('用法: npm run postbuild:info -- <build/wechatgame 路径> [输出路径...]');
    process.exit(0);
  }
  const root = resolve(process.env.LY15_ROOT || process.cwd());
  let buildDir = flags['--build-dir'] || positionals.shift();
  if (!buildDir && !flags['--report']) {
    console.error('[postbuild-info] 缺少 build/wechatgame 路径（或 --report JSON）');
    process.exit(1);
  }
  const outputs = positionals.length > 0
    ? positionals
    : [join(root, 'ly15_info.json'), join(homedir(), 'Documents', 'ly15_info.json')];
  try {
    const info = buildInfo({
      buildDir: buildDir ? resolve(root, buildDir) : undefined,
      report: flags['--report'] ? resolve(root, flags['--report']) : undefined,
      root,
    });
    const files = writeInfo(info, outputs, root);
    console.log(`[postbuild-info] ${info.tag} main=${info.mainPackageKB}KB bg=${info.bgSubpackageBytes}B total=${info.totalBytes}B`);
    for (const file of files) console.log(`[postbuild-info] -> ${file}`);
    if (!info.withinLimit) {
      console.error(`[postbuild-info] 主包 ${info.mainPackageKB}KB 超过 ${MAIN_PACKAGE_LIMIT_KB}KB`);
      process.exitCode = 1;
    }
  } catch (error) {
    console.error(String(error?.message ?? error));
    process.exit(1);
  }
}
