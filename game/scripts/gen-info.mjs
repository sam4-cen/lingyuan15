#!/usr/bin/env node
/**
 * 兼容旧命令的薄封装：统一转到 scripts/postbuild-info.mjs。
 *
 *   npm run gen:info -- --build-dir build/wechatgame [输出路径...]
 *   npm run postbuild:info -- build/wechatgame [输出路径...]
 *
 * 旧的 --main-size N 已废弃：请构建后用构建目录统计，避免手填过期体积。
 */
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const postbuild = join(dirname(fileURLToPath(import.meta.url)), 'postbuild-info.mjs');
const argv = process.argv.slice(2);
const mainIndex = argv.indexOf('--main-size');

if (mainIndex >= 0) {
  console.error('[gen-info] --main-size 已废弃；请用 npm run postbuild:info -- <build/wechatgame>');
  process.exit(1);
}

const outputs = [];
let buildDir = null;
for (let i = 0; i < argv.length; i++) {
  const arg = argv[i];
  if (arg === '--build-dir') {
    buildDir = argv[++i];
  } else if (arg.startsWith('--build-dir=')) {
    buildDir = arg.slice('--build-dir='.length);
  } else {
    outputs.push(arg);
  }
}
if (!buildDir) buildDir = outputs.shift();
if (!buildDir) {
  console.error('[gen-info] 缺少构建目录；请用 npm run postbuild:info -- <build/wechatgame>');
  process.exit(1);
}

const result = spawnSync(process.execPath, [postbuild, buildDir, ...outputs], { stdio: 'inherit' });
process.exit(result.status ?? 1);
