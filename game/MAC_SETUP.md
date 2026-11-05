# 《0元深圳15天》Mac 上接入步骤（Cocos Creator 3.8.8）

拷贝包：`lingyuan15_cocos.tgz`（解开后是 `assets/` 目录：scripts、resources/art、bundles/bg、scenes）。

1. Cocos Dashboard → 新建项目 → 选 **3.8.8 / Empty(2D)**，名字 `lingyuan15`，放在 `~/Documents/lingyuan15`（**不要**放进 ~/Documents/laohuadian）。
2. 关掉编辑器，把 tgz 解到项目根目录：`tar xzf lingyuan15_cocos.tgz -C ~/Documents/lingyuan15`（会合并进 `assets/`）。重新打开项目，等资源导入完。
3. 检查分包：在资源管理器选中 `assets/bundles/bg` 文件夹 → 属性检查器里确认勾选「配置为 Bundle」，Bundle 名 `bg`，微信小游戏的压缩类型选 **小游戏分包**，点「应用」。`bg.meta` 的 `userData` 已带 `isBundle: true` 和 `bundleConfigID: "subpkg"`；若编辑器重新生成 meta，就手动再勾一次。
4. `assets/resources/art` 下的 156 张图已带 sprite-frame 的 `.meta`（含 `spriteFrame` 子资源、Filter nearest）。打开项目后等资源重新导入；若某张图仍显示为 texture，选中它把 Type 改成 **sprite-frame**、Filter 改成 **nearest**。
5. 启动场景：项目已带 `assets/scenes/main.scene`（场景 uuid `b1e8c0a2-6f3d-4c2e-9a1b-2d3e4f5a6b7c`），直接双击打开，Canvas 上已挂 `GameRoot`。在「项目设置 → 项目数据 → 启动场景」选 `main.scene`。如果场景被误删，可运行 `python3 tools/gen_scene.py` 重新生成。
6. 项目设置 → 项目数据：设计分辨率 **720×1280**，勾选「适配高度」（Fit Height）。
7. 项目设置 → 功能裁剪：只留 2D、UI、Graphics、Tween、Animation、Audio（关 3D、物理、粒子3D、Spine、DragonBones、TiledMap、VideoPlayer、WebView），压主包。
8. 先在编辑器里点预览（浏览器）跑通一局。
9. 项目 → 构建发布：平台 **微信小游戏**，AppID `wxcbccf7de7cc81947`，屏幕方向 **Portrait**，勾选「主包压缩 / MD5 Cache」可选；构建。
10. 构建后检查 `build/wechatgame/project.config.json`，把 `appid` 改为 **`wxcbccf7de7cc81947`**（构建界面的 AppID 不一定会写进这个文件，必须手动确认）。
11. 构建完看 `build/wechatgame` 主包大小（不含 subpackages/bg）应 < 4MB。用微信开发者工具打开 `build/wechatgame` → 预览 → 扫码真机测试。

注意：分享按钮只调用 wx.shareAppMessage，无奖励；adsEnabled=false，不出广告按钮；排行榜（开放数据域）未做。
