# Procedural Computer

复刻 `procedural.computer` 首页中真正的 WebGL 背景部分，不包含原页面的标题、Contact、社交链接和主题按钮覆盖层。

## 交互

- 指针移动会把横竖细线吸附到当前位置。
- 滚轮会给三组旋转 ring 增加带阻尼的相位偏移。
- 点击右上角的圆点按钮或在组件聚焦后按 `T` 切换明暗反相，按 `B` 切换浮雕质感。

## 实现

核心是 WebGL2 full-screen triangle。fragment shader 使用 3D ring 投影到 2D 椭圆 SDF，再用 smooth-min 合并三组 ring 和指针十字线；浮雕模式通过相邻采样估算法线并改变明暗。
