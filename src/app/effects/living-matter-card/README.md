# living-matter-card

## 特效名称

Living Matter Card / HTML-in-Canvas Melt View

## 具体特效

参考 X 视频里的 living matter 网页转场，但去掉首屏 `start` button 球。画面直接进入一张更完整的 html-in-canvas 控制台：标题、输入框、普通按钮、状态面板和数据块都先绘入 canvas texture。鼠标移动时页面上有一层轻微折射的 living-matter 镜头，点击页面或按钮会触发后半段过渡：一片青绿色半透明体积膜横向扫过界面，把真实 canvas UI 拉伸、重影、折射，再回到可读页面。

## 实现原理

- 用 2D canvas 绘制“HTML-like”界面纹理，包含顶部标签、标题、输入框、普通按钮、状态面板、数据块和底部光带。
- 用一个隐藏输入框接收真实键盘输入，再把文字同步重绘到 canvas texture，实现 html-in-canvas 的交互感。
- WebGL2 fragment shader 里用多颗运动圆场做 metaball mask，并把它从首屏按钮改成页面上的折射镜头和后段横向熔化膜。
- shader 同时采样原始 canvas texture 和折射后的 texture，避免过渡阶段把页面完全糊掉。
- 点击页面会把时间线跳到 `melt view` 段；不点击时仍自动循环播放。
- 通过噪声、Fresnel、折射偏移、体积雾和 film grain 叠出玻璃/液体质感。
- 时间线拆成 `fog reveal`、稳定交互、`melt view` 横扫、回到可读页面四段。
- 预览模式和详情模式共享同一组件，只改变最小高度和绘制尺度，保证画廊卡片不会布局跳动。

## 给 AI 的提示词

```text
请实现一个 Next.js + React + WebGL2 的 living matter interface effect。不要做首屏 start button 球；画面直接显示一张由 2D canvas 绘制的真实控制台纹理，包含标题、输入框、普通按钮、状态面板和数据块。鼠标移动时有一层轻微折射镜头，点击页面后进入 melt view：青绿色半透明 metaball 膜横向扫过页面，把 canvas UI 拉伸、重影、折射，但仍保留可读的原始页面采样。shader 需要做 metaball 场、Fresnel 边缘光、双重 texture 采样、体积雾、底部光带和 film grain。请保留简明中文注释说明 canvas 纹理、交互热区和 shader 时间线。
```
