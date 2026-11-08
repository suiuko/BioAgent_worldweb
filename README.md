# BioAgent-world

BioAgent-world 项目展示网站，第一版参考研究项目页的章节叙事与大幅视频布局，使用独立的品牌、文字、样式和示意图。

## 本地预览

需要 Node.js 22 或更新版本，无第三方构建依赖。

```sh
node scripts/serve.mjs
# http://127.0.0.1:4173
```

```sh
node scripts/check.mjs
node scripts/build.mjs
```

构建产物在 `dist/`，可部署到 GitHub Pages 或其他静态托管服务。GitHub Actions 工作流在推送 `main` 时构建并部署；仓库 Pages 的 Source 需为 GitHub Actions。

## 内容与素材

- 主品牌：**BioAgent-world**。
- 研究实现：[BioagentNav](https://github.com/suiuko/BioagentNav)。网站文案依据该仓库 README 与 DEVELOPMENT.md，审阅版本 `0dc7b4e27cca233e4000a5e72b31c4928d6b2a06`。
- 用户提供的实拍视频作为 BioAgent 演示，和 BioagentNav 离线重建的当前状态分别说明。
- `assets/bioagent-world-demo.mp4`：完整 4 分 10 秒、1920×1080、H.264/AAC、faststart，约 22.4 MB。由用户提供约 374 MB 原片压缩生成；保留全部时长与音轨，去除容器元数据。
- `assets/hero-loop.mp4`：24–40 秒片段，1600×900、静音，用于首页循环。
- `assets/demo-poster.jpg`：用户视频第 31 秒截帧。
- `assets/world-scene.svg`：自制概念占位示意图，不代表实验重建结果。后续可以替换为真实渲染图。
- `assets/favicon.svg`：本网站几何标识。
- 字体为 Google Fonts 的 DM Sans 和 Manrope，加载失败时使用系统字体。

未使用参考站的校徽、机构标识、作者信息、图片、视频、场景或源代码。

## 交互与后续替换

中英文切换会保存在浏览器本地；演示支持标签切换和键盘方向键。记忆区为明确标注的可交互结构示例。尊重减少动态效果的系统设置。

真实论文、作者名单和更多演示尚未提供，因此第一版未添加占位论文下载或编造作者信息。编辑 `index.html` 中的双语属性和 `app.js` 中的示例记录即可调整文案。

替换完整视频时同步更新时长标签、海报与首页短片，建议单个文件小于 100 MiB。
