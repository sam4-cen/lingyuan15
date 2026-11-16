# 0元深圳15天

微信小游戏项目 - 基于 Cocos Creator 3.8 开发的城市生存模拟游戏

## 项目结构

```
├── game/              Cocos Creator 3.8 微信小游戏主项目
│   ├── src/          游戏源代码
│   ├── assets/       游戏资源
│   ├── prompts/      AI 提示词
│   ├── sim/          模拟器
│   └── test/         单元测试
├── docs/             项目文档
│   ├── 0元深圳15天_交接总文档.md  项目交接总文档(进度、问题、产品计划)
│   └── lingyuan15_v2.md           设计文档
├── art/              美术资源
│   └── processed/    已处理的美术资源
├── scripts/          辅助脚本
└── test/             测试资源
    └── lingyuan15_qr.png  小程序二维码
├── workspaces/       机器人工作区交接
│   ├── deepseek/     DeepSeek 需求、补丁、设计稿、场景与网页测试构建、harness 日志
│   └── tester/       测试机器人工作区（最新预览二维码）
```

## 工作区

- `workspaces/deepseek/`：DeepSeek 机器人工作区。含 `req_r*` 需求记录、补丁、设计文档（v1/v2）、`ly15scene`、`ly15web_srv` 网页测试构建，以及已脱敏的 harness 日志与会话。
- `workspaces/tester/`：测试机器人工作区，含最新预览二维码。测试截图仍在 `test/shots/`。

## 关键文档

- **交接文档**: [`docs/0元深圳15天_交接总文档.md`](docs/0元深圳15天_交接总文档.md) - 包含项目进度、已知问题和产品规划
- **设计文档**: [`docs/lingyuan15_v2.md`](docs/lingyuan15_v2.md) - 游戏设计文档

## 游戏介绍

《0元深圳15天》是一款模拟在深圳零资金生存15天的微信小游戏。玩家需要通过合理规划时间、选择工作和管理资源来完成挑战。

## 技术栈

- **引擎**: Cocos Creator 3.8
- **平台**: 微信小游戏
- **语言**: TypeScript

## 开发环境设置

详见 `game/` 目录下的开发文档。

## 当前快照

`game/` 对应当地游戏仓提交 `d3d65b662c29b5a9d2103a011a5c2bb87f3a2edb`（r40：限定牌正下方水平居中）。这是代码快照，不表示 r40 已验收通过。未纳入：凭据、Harness 程序与会话、截图堆、第三方引擎参考包，以及测试机 Mac 操作笔记。

## 资源说明

- `art/processed/` - 已处理并可直接使用的美术资源
- `art/raw/` - 原始美术素材(将在后续提交中添加)
- `art_sources/` - 未入库美术原稿（不含第三方引擎参考）
- `test/shots/` - 测试截图(将在后续提交中添加)
