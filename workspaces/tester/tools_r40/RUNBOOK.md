# R40 Probe RUNBOOK

## 工具/目录

- Mac 工具：`/Users/[REDACTED]/Documents/ly15_probe_tools_r40_d3d65b6_20261116`
- 候选根：`/Users/[REDACTED]/Documents/ly15_probe_cases_r40_d3d65b6_20261116`
- 子目录：`futian_cbd`、`dongmen`；player=`baishizhou`
- 新构建：`/Users/[REDACTED]/Documents/ly15_r40_build_d3d65b6_20261116`
- 新源码：`/Users/[REDACTED]/Documents/ly15_r40_src_d3d65b6_20261116`

## 1. 传工具

经 CopyFromBox 传：

- `probe_prepare.py`
- `probe_driver.js`
- `r40_prebuild_safe.py`
- `R40_BUILD_RUNBOOK.md`
- `R40_TWO_FILE_HANDOFF.md`
- `RUNBOOK.md`

到 Mac 工具目录。不要用 scp/共享路径假设。

## 2. 必要文件

prepare 前必须存在：

- 新源码副本
- 新构建目录
- 新构建的 `ly15_info.json`
- 新构建的 `r40_build_manifest.json`
- 上述两文件的 `commit` 必须为 `d3d65b662c29b5a9d2103a011a5c2bb87f3a2edb`
- `version=r40`、`tag=r40 d3d65b6`

缺少任何一项：停止，不猜 hash、不复用旧 case。

## 3. Prepare

```bash
/usr/bin/python3 /Users/[REDACTED]/Documents/ly15_probe_tools_r40_d3d65b6_20261116/probe_prepare.py \
  --approved \
  --build-dir /Users/[REDACTED]/Documents/ly15_r40_build_d3d65b6_20261116 \
  --source-root /Users/[REDACTED]/Documents/ly15_r40_src_d3d65b6_20261116 \
  --info /Users/[REDACTED]/Documents/ly15_r40_build_d3d65b6_20261116/ly15_info.json \
  --manifest /Users/[REDACTED]/Documents/ly15_r40_build_d3d65b6_20261116/r40_build_manifest.json \
  --out-root /Users/[REDACTED]/Documents/ly15_probe_cases_r40_d3d65b6_20261116
```

期望：

```text
PREPARED: /Users/[REDACTED]/Documents/ly15_probe_cases_r40_d3d65b6_20261116
CASES: futian_cbd, dongmen
```

## 4. 打开与 READY

每窗只开一个 case：

```bash
/Applications/wechatwebdevtools.app/Contents/MacOS/cli open \
  --project /Users/[REDACTED]/Documents/ly15_probe_cases_r40_d3d65b6_20261116/futian_cbd
```

东门单独：

```bash
/Applications/wechatwebdevtools.app/Contents/MacOS/cli open \
  --project /Users/[REDACTED]/Documents/ly15_probe_cases_r40_d3d65b6_20261116/dongmen
```

Console 只认：

```text
LY15_PROBE: START {...}
LY15_PROBE: READY {...}
LY15_PROBE: LOG_PATH <path>
LY15_PROBE: FAIL {...}
```

READY 需含 `probeVersion`、`case`、`player=baishizhou`、`rootBy`、`badgeText` 含“限定”、`badgeBounds`、`plateBounds`、`dx`、`logOk:true`。  
没有 READY 不截图；FAIL/字段缺失即停止。

## 5. 截图

READY 后由测试用现有获准窗口枚举取**本次新窗**，不得复用旧 ID。  
单次新文件：

```bash
/bin/test ! -e "/Users/[REDACTED]/Documents/ly15_probe_cases_r40_d3d65b6_20261116/futian_cbd/ly15_probe_futian.png"
/usr/sbin/screencapture -x -l "<NEW_WINDOW_ID>" \
  "/Users/[REDACTED]/Documents/ly15_probe_cases_r40_d3d65b6_20261116/futian_cbd/ly15_probe_futian.png"
```

东门同理，另取新窗口 ID、新文件。  
不 sleep 盲拍；不坐标点击；不抢焦点。

## 6. 指标

- below：`abs(dx) <= 0.5` 屏幕像素，badge 在 plate 下方水平居中；不压玩家/自家图标/邻居，不出界，文字“限定”。
- merged：红段高度等于 plate 高度、红段左端贴 plate 左端、文字完整；不压玩家/自家图标，不出界；允许靠近邻居。
- right/left：垂直居中；不压玩家/自家图标/邻居。
- 当前 `dx=36.5` 是屏幕像素，约 18.25 CSS；不能直接与 CSS 历史值混算。
- 注入测试仍标“非正常触摸/非全流程”。

## 7. 失败/保留

- 失败保留候选、日志、截图；不删除、不覆盖原项目/旧 build。
- 不补 app.json、不改配置、不安装包、不清缓存、不改安全设置/端口。
- 未实测、未执行、未签完整验收。
