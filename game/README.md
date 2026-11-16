# 《0元深圳15天》开发仓库

Cocos Creator 3.8.8 微信小游戏项目 + 与引擎无关的纯逻辑层。

## 目录

- `src/core/`：纯 TypeScript 数值/规则逻辑（唯一事实来源）。
- `cocos/assets/scripts/core/`：`src/core` 的副本，改完 `src/core` 必须同步过去。
- `cocos/assets/scripts/ui/`：代码创建的 UI、排版纯函数、事件页/地点页。
- `test/game.test.ts`：逻辑 + 排版 + 资源/包体单测。
- `scripts/gen-version.mjs`：从 git HEAD 生成 `Version.ts`（`r<轮次> <短 hash>`，不写 dev）；worktree 拷贝会读 `LY15_COMMIT` 或 `.git` 文件。
- `scripts/prebuild.mjs`：构建前一键生成 `Version.ts` + 词边界数据；取不到 HEAD 直接失败。
- `scripts/postbuild-info.mjs`：构建后统计主包/bg 分包/总字节，回填 `ly15_info.json`（可写多个输出路径）。
- `scripts/gen-wordbreak.mjs`：用 Node ICU `Intl.Segmenter` 生成全部中文文案的词边界数据 `WordBreakData.ts`。
- `scripts/set-simulator.mjs`：选择微信开发者工具模拟器机型。
- `cocos/assets/resources/art/`：主包美术；`cocos/assets/bundles/bg/`：bg 分包美术。

## 常用命令

```bash
npm test                       # 全部单测
npx tsc -p cocos/tsconfig.check.json   # TypeScript 5.9.2，0 错误检查
npm run prebuild               # 构建前：Version.ts + WordBreakData.ts
npm run gen:version            # 只生成 Version.ts（r<轮次> + 当前 HEAD 短 hash）
npm run postbuild:info -- build/wechatgame ly15_info.json ~/Documents/ly15_info.json
npm run gen:wordbreak          # 只生成中文词边界数据
node scripts/set-simulator.mjs --help  # 查看模拟器机型表
```

## 同步 core

```bash
cp src/core/*.ts cocos/assets/scripts/core/
cmp src/core/config.ts cocos/assets/scripts/core/config.ts
```

`npm test` 里也会检查 `src/core` 与 Cocos 副本一致。

## 构建微信小游戏

1. 在 Cocos Creator 3.8.8 里构建平台「微信小游戏」，产物目录 `build/wechatgame`。
2. 构建后确认 `build/wechatgame/project.config.json` 的 `appid` 是 `wxcbccf7de7cc81947`。
3. 用微信开发者工具打开 `build/wechatgame`。

## 用命令行切换开发者工具模拟器机型

脚本支持参数和环境变量两种写法：

```bash
# 参数（推荐）
node scripts/set-simulator.mjs --device=iphone12
node scripts/set-simulator.mjs --device=iphone-se --dir=build/wechatgame

# npm 脚本
npm run set:device -- --device=iphone12
npm run build:wechat -- --device=iphone12

# 环境变量
LY15_DEVICE=iphone-se npm run set:device
LY15_DEVICE=360 LY15_BUILD_DIR=build/wechatgame npm run set:device
```

机型表：

| 参数值 | 模拟器 | CSS 尺寸 |
| --- | --- | --- |
| `iphone12` | iPhone 12/13 | 390×844 @3x |
| `iphone-se` | iPhone SE | 375×667 @2x |
| `iphone14promax` | iPhone 14 Pro Max | 430×932 @3x |
| `360` | Android 360×780 | 360×780 @3x |

脚本会在 `build/wechatgame` 下的 `project.config.json` / `project.private.config.json`
存在时写入：

```json
{
  "simulatorType": "wechat",
  "simulatorDevice": "iPhone 12/13",
  "ly15Simulator": { "id": "iphone12", "cssWidth": 390, "cssHeight": 844, "devicePixelRatio": 3 }
}
```

说明（r32 已排查）：截至当前，[微信官方 project.config.json 文档](https://developers.weixin.qq.com/miniprogram/dev/devtools/projectconfig.html)
没有公开「模拟器机型」字段；`condition` 只描述编译模式/页面参数，`simulatorType` 只区分
`wechat` / `plugin` 等模拟器类型，都不是机型。[DevTools CLI](https://developers.weixin.qq.com/miniprogram/dev/devtools/cli.html)
的 `open` 也没有 `--device` / 机型参数。开发者工具选中的机型保存在工具自己的全局用户数据里，
不随项目配置走，所以 `simulatorDevice` 只是 best-effort 写入，`cli open` 仍可能显示上一次的
iPhone 12/13。**脚本无法可靠切换机型时，请在开发者工具模拟器顶部的机型下拉框手动选择 iPhone SE
（375×667）；这一步不影响构建和本轮提交。**
脚本打印的 CSS 尺寸可直接给截图/自动化脚本使用（本仓库的排版单测也按同一组尺寸覆盖 390/375/360）。
