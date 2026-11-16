# R40 构建 Runbook

## 输入

全新源码副本：

`/Users/[REDACTED]/Documents/ly15_r40_src_d3d65b6_20261116`

全新构建输出目录（必须不存在）：

`/Users/[REDACTED]/Documents/ly15_r40_build_d3d65b6_20261116`

工具目录：

`/Users/[REDACTED]/Documents/ly15_probe_tools_r40_d3d65b6_20261116`

旧 build 保留，不覆盖。

## 1. 只读核验 Cocos 路径

历史记录（r31_HOWTO）曾使用：

`/Applications/Cocos/Creator/3.8.8/CocosCreator.app/Contents/MacOS/CocosCreator`

这是**历史已用**，不是当前 Mac 已证实；只允许一项正规只读核验：

```bash
/bin/test -x "/Applications/Cocos/Creator/3.8.8/CocosCreator.app/Contents/MacOS/CocosCreator" \
  && echo COCOS_PRESENT || echo COCOS_PATH_UNKNOWN
```

`COCOS_PATH_UNKNOWN` 时停止，不扫描 Library、不安装、不猜路径。

## 2. 平台/buildPath 参数

已获准历史只证明 web-mobile：

```text
--project ~/Documents/lingyuan15 --build 'platform=web-mobile;buildPath=/tmp/ly15r20web;debug=false'
```

**没有已证实的 WeChat CLI 平台值/buildPath 参数**。不要编 `wechatgame`、不要套用 web-mobile 参数。

本次建议由小游戏在 Cocos Creator 3.8.8 图形界面中：
- 打开新源码副本；
- 构建平台选微信小游戏；
- 构建输出目录手动设为：
  `/Users/[REDACTED]/Documents/ly15_r40_build_d3d65b6_20261116`
- 不使用旧 `build/wechatgame`，不删除旧 build。

## 3. Version 与 ly15_info

现有 box `scripts/prebuild.mjs`：
- 不删除文件；
- 写 `cocos/assets/scripts/Version.ts`；
- 运行 `gen-wordbreak.mjs` 写 `cocos/assets/scripts/ui/WordBreakData.ts`；
- 依赖 git 或 `LY15_COMMIT`/`LY15_ROUND`。

现有 `postbuild-info.mjs`：
- 不删除文件；
- 默认写根 `ly15_info.json` 和 `~/Documents/ly15_info.json`；
- 依赖 git 信息，默认输出可能覆盖旧文件。

Mac 根项目没有 `cocos/`、没有 `scripts/`、没有 `.git`，所以**不在 Mac 根项目运行 npm prebuild/postbuild**。

使用独立工具：

`r40_prebuild_safe.py`

在新源码副本写 `assets/scripts/Version.ts`：

```bash
/usr/bin/python3 /Users/[REDACTED]/Documents/ly15_probe_tools_r40_d3d65b6_20261116/r40_prebuild_safe.py \
  version --approved \
  --project-root /Users/[REDACTED]/Documents/ly15_r40_src_d3d65b6_20261116
```

构建完成后，对**新构建目录**写 `ly15_info.json` 和 `r40_build_manifest.json`：

```bash
/usr/bin/python3 /Users/[REDACTED]/Documents/ly15_probe_tools_r40_d3d65b6_20261116/r40_prebuild_safe.py \
  seal --approved \
  --project-root /Users/[REDACTED]/Documents/ly15_r40_src_d3d65b6_20261116 \
  --build-dir /Users/[REDACTED]/Documents/ly15_r40_build_d3d65b6_20261116 \
  --info-out /Users/[REDACTED]/Documents/ly15_r40_build_d3d65b6_20261116/ly15_info.json \
  --manifest-out /Users/[REDACTED]/Documents/ly15_r40_build_d3d65b6_20261116/r40_build_manifest.json
```

期望：

```text
VERSION_WRITTEN: .../assets/scripts/Version.ts
INFO_WRITTEN: .../ly15_info.json
MANIFEST_WRITTEN: .../r40_build_manifest.json
```

`ly15_info.json` 必须含：

- `version: "r40"`
- `tag: "r40 d3d65b6"`
- `commit: "d3d65b662c29b5a9d2103a011a5c2bb87f3a2edb"`
- 新构建的 `mainPackageBytes` / `bgSubpackageBytes` / `totalBytes`
- `withinLimit` 为真实计算结果

两份输出文件必须不存在；不覆盖旧 info/manifest。

## 4. 构建后

确认新构建根含：

```text
game.js
game.json
project.config.json
project.private.config.json
```

不把旧 build 复制进新目录。旧 build 保留。

然后进入 probe 工具准备。
