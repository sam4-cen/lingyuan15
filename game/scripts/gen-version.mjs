#!/usr/bin/env node
/**
 * 构建前生成 cocos/assets/scripts/Version.ts。
 *
 * 规则（r38）：
 *   - commit 取 git HEAD 的短 hash（7 位），不再写 "dev" 占位；
 *   - tag = "r<轮次> <hash>"，轮次取最近提交信息里的 rNN 最大值；
 *   - 非 git 目录（worktree 拷贝）优先读 LY15_COMMIT，再读 .git 文件；
 *   - HEAD 取不到时直接报错退出，绝不静默写 dev。
 *
 * 单测可直接 import { resolveGitInfo, writeVersionFile } 使用。
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SCRIPT_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_OUT = join('cocos', 'assets', 'scripts', 'Version.ts');
const HASH_RE = /^[0-9a-f]{7,40}$/i;

export function cleanGitEnv(env = process.env) {
  const next = { ...env };
  // CI 沙箱有时只导出 GIT_CONFIG_COUNT 而缺少 GIT_CONFIG_KEY_0。
  delete next.GIT_CONFIG_COUNT;
  delete next.GIT_CONFIG_KEY_0;
  delete next.GIT_CONFIG_VALUE_0;
  return next;
}

function normalizeHash(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  // 允许 "HEAD" / 完整 40 位 / 短 hash；只接受十六进制提交号。
  if (!HASH_RE.test(raw)) return null;
  return raw.slice(0, 7).toLowerCase();
}

function git(args, cwd) {
  try {
    return execFileSync('git', args, {
      cwd,
      env: cleanGitEnv(),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return null;
  }
}

function resolveCommitFromRefText(text, baseDir) {
  const raw = String(text ?? '').trim();
  if (!raw) return null;
  const ref = /^ref:\s*(.+)$/m.exec(raw)?.[1]?.trim();
  if (!ref) return normalizeHash(raw);
  const direct = join(baseDir, ref);
  if (existsSync(direct)) {
    const hash = normalizeHash(readFileSync(direct, 'utf8'));
    if (hash) return hash;
  }
  // worktree 的 HEAD 在 gitdir，refs 在 common dir。
  const commonFile = join(baseDir, 'commondir');
  if (existsSync(commonFile)) {
    const commonDir = resolve(baseDir, readFileSync(commonFile, 'utf8').trim());
    const commonRef = join(commonDir, ref);
    if (existsSync(commonRef)) {
      const hash = normalizeHash(readFileSync(commonRef, 'utf8'));
      if (hash) return hash;
    }
    const packed = join(commonDir, 'packed-refs');
    if (existsSync(packed)) {
      const hash = packedRefHash(packed, ref);
      if (hash) return hash;
    }
  }
  const packed = join(baseDir, 'packed-refs');
  if (existsSync(packed)) {
    const hash = packedRefHash(packed, ref);
    if (hash) return hash;
  }
  return null;
}

function packedRefHash(file, ref) {
  try {
    for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
      if (!line || line.startsWith('#') || line.startsWith('^')) continue;
      const [hash, name] = line.trim().split(/\s+/, 2);
      if (name === ref) return normalizeHash(hash);
    }
  } catch {
    // fall through
  }
  return null;
}

/** 找到 .git 目录；.git 可能是文件（git worktree）。 */
export function readGitDir(cwd) {
  const dotGit = join(cwd, '.git');
  if (!existsSync(dotGit)) return null;
  const st = statSync(dotGit);
  if (st.isDirectory()) return dotGit;
  const text = readFileSync(dotGit, 'utf8');
  const target = /^gitdir:\s*(.+)$/m.exec(text)?.[1]?.trim();
  if (!target) return null;
  const full = isAbsolute(target) ? target : resolve(cwd, target);
  return existsSync(full) ? full : null;
}

/** 从 .git 目录解析 HEAD，作为 git 命令不可用时的兜底。 */
export function readHeadFromGitDir(cwd) {
  const gitDir = readGitDir(cwd);
  if (!gitDir) return null;
  try {
    return resolveCommitFromRefText(readFileSync(join(gitDir, 'HEAD'), 'utf8'), gitDir);
  } catch {
    return null;
  }
}

function readMessagesFromGitDir(cwd) {
  // worktree 的 logs/HEAD 在 common dir 或 gitdir；格式：<old> <new> <msg>。
  const gitDir = readGitDir(cwd);
  if (!gitDir) return [];
  const candidates = [join(gitDir, 'logs', 'HEAD')];
  try {
    const common = readFileSync(join(gitDir, 'commondir'), 'utf8').trim();
    if (common) candidates.push(join(resolve(gitDir, common), 'logs', 'HEAD'));
  } catch {
    // no commondir
  }
  const messages = [];
  for (const file of candidates) {
    if (!existsSync(file)) continue;
    try {
      for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
        const at = line.indexOf(' ', line.indexOf(' ') + 1);
        if (at >= 0) messages.push(line.slice(at + 1));
      }
    } catch {
      // ignore
    }
  }
  return messages;
}

function maxRound(messages) {
  let max = 0;
  for (const message of messages) {
    const re = /\br(\d{1,4})\b/gi;
    let match;
    while ((match = re.exec(String(message ?? '')))) {
      const n = Number(match[1]);
      if (Number.isFinite(n)) max = Math.max(max, n);
    }
  }
  return max > 0 ? max : null;
}

function existingRound(cwd) {
  try {
    const src = readFileSync(join(cwd, DEFAULT_OUT), 'utf8');
    const version = /BUILD_VERSION\s*=\s*"r(\d+)"/.exec(src)?.[1];
    return version ? Number(version) : null;
  } catch {
    return null;
  }
}

/**
 * 解析构建元信息，失败时抛出（调用方必须退出非 0）。
 * 返回 { hash, version, tag, messages, source }。
 */
export function resolveGitInfo(cwd = process.cwd(), env = process.env) {
  const root = resolve(cwd);
  const fromGitHash = normalizeHash(git(['rev-parse', '--short=7', 'HEAD'], root));
  // 轮次只取「最近一次」提交信息；同一条信息里出现 r36/r37 时取最大值。
  const headMessage = fromGitHash ? git(['log', '-1', '--format=%B'], root) : null;
  const messages = headMessage ? [headMessage] : [];

  let hash = fromGitHash;
  let source = fromGitHash ? 'git' : null;
  if (!hash) {
    hash = normalizeHash(env.LY15_COMMIT);
    if (hash) source = 'LY15_COMMIT';
  }
  if (!hash) {
    hash = readHeadFromGitDir(root);
    if (hash) source = '.git';
  }
  if (!hash) {
    throw new Error(
      '[gen-version] 取不到 git HEAD：请在仓库内运行，或设置 LY15_COMMIT / 提供可解析的 .git 文件。',
    );
  }

  if (!messages.length) {
    const logMessages = readMessagesFromGitDir(root);
    if (logMessages.length > 0) messages.push(logMessages[logMessages.length - 1]);
  }
  let round = maxRound(messages);
  if (!round && env.LY15_ROUND) {
    const n = Number(env.LY15_ROUND);
    if (Number.isFinite(n) && n > 0) round = Math.floor(n);
  }
  if (!round) round = existingRound(root);
  if (!round) round = 0;
  const version = `r${round}`;
  return { hash, version, tag: `${version} ${hash}`, messages, source };
}

export function versionFileContent(info, { release = false } = {}) {
  const isTestBuild = !release;
  return `// Generated by scripts/gen-version.mjs — do not edit by hand.
export const BUILD_VERSION = ${JSON.stringify(info.version)};
export const BUILD_HASH = ${JSON.stringify(info.hash)};
export const BUILD_TAG = ${JSON.stringify(info.tag)};
export const IS_TEST_BUILD = ${isTestBuild};
`;
}

/** 生成 Version.ts，返回 { file, info }。 */
export function writeVersionFile({
  root = process.env.LY15_ROOT || process.cwd(),
  outFile,
  release = false,
} = {}) {
  const cwd = resolve(root);
  const info = resolveGitInfo(cwd);
  const file = outFile
    ? resolve(isAbsolute(outFile) ? outFile : join(cwd, outFile))
    : join(cwd, DEFAULT_OUT);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, versionFileContent(info, { release }), 'utf8');
  return { file, info };
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
  try {
    const release = process.argv.includes('--release');
    const root = resolve(process.env.LY15_ROOT || process.cwd());
    const outFile = process.env.LY15_VERSION_OUT || undefined;
    const { file, info } = writeVersionFile({ root, outFile, release });
    console.log(`[gen-version] ${info.tag} (${release ? 'release' : 'test'}) -> ${file}`);
  } catch (error) {
    console.error(String(error?.message ?? error));
    process.exit(1);
  }
}
