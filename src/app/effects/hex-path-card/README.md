# Hex Path Card

参考 `shaders.com/collection/hex-path/b21d7e97-06b1-4fc0-ae45-33d123b86598` 的交互卡片效果。

- WebGL2 fragment shader 绘制黑蓝径向背景、稀疏六边形路径、蓝青辉光和低强度 film grain。
- Pointer Events 将鼠标位置传入 shader，shader 内部做惯性缓动，形成跟随鼠标的亮光和路径强化。
- `variant="preview"` 用于画廊卡片，详情页使用完整高度。
