#!/usr/bin/env node
/**
 * 选择微信开发者工具的模拟器机型。
 *
 * 用法：
 *   node scripts/set-simulator.mjs --device=iphone12
 *   LY15_DEVICE=iphone-se node scripts/set-simulator.mjs
 *   node scripts/set-simulator.mjs --device=360 --dir=build/wechatgame
 *
 * 注意：微信开发者工具的 project.config.json / project.private.config.json
 * 官方字段里没有「模拟器机型」；condition 是编译模式，simulatorType 是模拟器类型，
 * CLI `open` 也没有机型参数。开发者工具把当前机型存在自己的全局用户数据里，
 * 不随项目配置走，所以下面的 simulatorDevice 只是 best-effort：
 *   1. 在 build/wechatgame 的 project.config.json / project.private.config.json
 *      存在时写入 simulatorType 与 simulatorDevice（best-effort，工具版本支持时生效）；
 *   2. 同时写 ly15Simulator 字段，供本项目自己的测试脚本读取；
 *   3. 打印机型 CSS/物理尺寸，方便截图脚本按同一尺寸跑。
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/** 与测试/截图一致的机型表；css 尺寸用于开发者工具模拟器。 */
export const SIMULATOR_DEVICES = {
  'iphone12': { label: 'iPhone 12/13', cssW: 390, cssH: 844, dpr: 3, safeTop: 47, safeBottom: 34 },
  'iphone-12': { label: 'iPhone 12/13', cssW: 390, cssH: 844, dpr: 3, safeTop: 47, safeBottom: 34 },
  'iphone-se': { label: 'iPhone SE', cssW: 375, cssH: 667, dpr: 2, safeTop: 20, safeBottom: 0 },
  'iphone-se2': { label: 'iPhone SE', cssW: 375, cssH: 667, dpr: 2, safeTop: 20, safeBottom: 0 },
  'iphone14promax': { label: 'iPhone 14 Pro Max', cssW: 430, cssH: 932, dpr: 3, safeTop: 59, safeBottom: 34 },
  'iphone-14-pro-max': { label: 'iPhone 14 Pro Max', cssW: 430, cssH: 932, dpr: 3, safeTop: 59, safeBottom: 34 },
  '360': { label: 'Android 360×780', cssW: 360, cssH: 780, dpr: 3, safeTop: 20, safeBottom: 0 },
  'android-360': { label: 'Android 360×780', cssW: 360, cssH: 780, dpr: 3, safeTop: 20, safeBottom: 0 },
};

function parseArgs(argv) {
  let device = process.env.LY15_DEVICE || process.env.LY15_SIMULATOR || '';
  let dir = process.env.LY15_BUILD_DIR || join(root, 'build', 'wechatgame');
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') return { help: true, device, dir };
    if (arg.startsWith('--device=')) device = arg.slice('--device='.length);
    else if (arg === '--device') device = argv[++i] || '';
    else if (arg.startsWith('--dir=')) dir = arg.slice('--dir='.length);
    else if (arg === '--dir') dir = argv[++i] || dir;
    else if (!arg.startsWith('-') && !device) device = arg;
  }
  return { help: false, device: device.trim(), dir };
}

function normalizeKey(value) {
  return String(value || '').trim().toLowerCase().replace(/[\s_]+/g, '-');
}

function resolveDevice(input) {
  const key = normalizeKey(input);
  if (!key) return null;
  if (SIMULATOR_DEVICES[key]) return { key, ...SIMULATOR_DEVICES[key] };
  for (const [id, dev] of Object.entries(SIMULATOR_DEVICES)) {
    if (normalizeKey(dev.label) === key) return { key: id, ...dev };
  }
  return null;
}

function readJson(file) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch (e) {
    return {};
  }
}

function writeJson(file, value) {
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function printHelp() {
  console.log('用法: node scripts/set-simulator.mjs --device=<机型> [--dir=build/wechatgame]');
  console.log('环境变量: LY15_DEVICE=<机型>  LY15_BUILD_DIR=<构建目录>');
  console.log('机型:');
  for (const [id, dev] of Object.entries(SIMULATOR_DEVICES)) {
    console.log(`  ${id.padEnd(18)} ${dev.label} ${dev.cssW}×${dev.cssH} @${dev.dpr}x`);
  }
}

export function setSimulatorDevice(deviceInput, buildDir = join(root, 'build', 'wechatgame')) {
  const device = resolveDevice(deviceInput);
  if (!device) {
    const error = new Error(`未知机型：${deviceInput || '(空)'}`);
    error.devices = SIMULATOR_DEVICES;
    throw error;
  }
  const dir = isAbsolute(buildDir) ? buildDir : resolve(root, buildDir);
  const publicFile = join(dir, 'project.config.json');
  const privateFile = join(dir, 'project.private.config.json');
  const patch = {
    simulatorType: 'wechat',
    // 官方 schema 没有机型字段；这是 best-effort 写入，工具版本支持时生效。
    simulatorDevice: device.label,
    ly15Simulator: {
      id: device.key,
      label: device.label,
      cssWidth: device.cssW,
      cssHeight: device.cssH,
      devicePixelRatio: device.dpr,
      safeTop: device.safeTop,
      safeBottom: device.safeBottom,
    },
  };

  const updated = [];
  if (existsSync(publicFile)) {
    writeJson(publicFile, { ...readJson(publicFile), ...patch });
    updated.push(publicFile);
  }
  // 构建目录存在时总是写 private 配置（微信会优先读它）；目录不存在则交给上层报错。
  if (existsSync(dir)) {
    writeJson(privateFile, { ...readJson(privateFile), ...patch });
    updated.push(privateFile);
  }

  return { device, dir, updated, publicFile, privateFile };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    process.exit(0);
  }
  try {
    const result = setSimulatorDevice(args.device, args.dir);
    console.log(`[set-simulator] ${result.device.label} (${result.device.cssW}×${result.device.cssH} @${result.device.dpr}x)`);
    if (result.updated.length === 0) {
      console.log(`[set-simulator] 未找到构建目录 ${result.dir}（project.config.json / project.private.config.json 也不存在）。`);
      console.log('[set-simulator] 请先用 Cocos 构建微信小游戏，再执行本脚本；或用 --dir 指向构建产物目录。');
      console.log('[set-simulator] 说明：微信官方 project.config.json 没有公开的模拟器机型字段，');
      console.log('                实际切换仍可在开发者工具模拟器顶部机型下拉框选择。');
      process.exitCode = 2;
    } else {
      for (const file of result.updated) console.log(`[set-simulator] 已写入 ${file}`);
      console.log('[set-simulator] 注意：官方配置没有机型字段，DevTools CLI open 也没有 --device；');
      console.log('                若模拟器仍显示旧机型，请在模拟器顶部下拉框手动选择。');
      if (!existsSync(result.publicFile)) {
        console.log('[set-simulator] 未找到 project.config.json，只写了 project.private.config.json。');
      }
    }
  } catch (e) {
    console.error(`[set-simulator] ${e.message}`);
    printHelp();
    process.exit(1);
  }
}
