#!/usr/bin/env node
/**
 * 一键构建前脚本（npm run prebuild）：
 *   1) 从 git HEAD 生成 Version.ts（取不到 HEAD 直接失败）
 *   2) 生成 wordbreak 数据
 *
 * 支持透传 --release 给 gen-version。
 */
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanGitEnv, writeVersionFile } from './gen-version.mjs';

const root = resolve(process.env.LY15_ROOT || process.cwd());
const scriptRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const release = process.argv.includes('--release');

try {
  const { info, file } = writeVersionFile({ root, release });
  console.log(`[prebuild] ${info.tag}${release ? ' (release)' : ''} -> ${file}`);

  const inRoot = join(root, 'scripts', 'gen-wordbreak.mjs');
  const inScript = join(scriptRoot, 'scripts', 'gen-wordbreak.mjs');
  const wordbreak = existsSync(inRoot) ? inRoot : inScript;
  if (!existsSync(wordbreak)) throw new Error(`找不到 gen-wordbreak.mjs：${wordbreak}`);
  execFileSync(process.execPath, ['--import', 'tsx', wordbreak], {
    cwd: root,
    env: cleanGitEnv(),
    stdio: 'inherit',
  });
  console.log('[prebuild] wordbreak 数据已生成');
} catch (error) {
  console.error(`[prebuild] ${error?.message ?? error}`);
  process.exit(1);
}
