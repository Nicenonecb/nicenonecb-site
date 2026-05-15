# Reflective Signal Card

参考 `react-bits` 中 SpotlightCard、ReflectiveCard 一类组件的交互方向，做成适合个人站展示的独立特效卡片。

- Pointer Events 更新 CSS 变量，统一驱动聚光位置、反射高光和 3D 倾斜。
- CSS 多层背景制造金属屏、扫描线、荧光节点和指标读数，不额外引入依赖。
- 点击卡片会切换三种相位色彩；`variant="preview"` 用于画廊卡片。
