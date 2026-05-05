# Magnetic Nav

## 特效名称

Magnetic Nav / Anchor Positioning Navigation Highlight

## 具体特效

一个导航链接吸附高亮效果。用户 hover、点击或键盘聚焦某个导航项时，发光高亮层会平滑移动到对应链接，并匹配它的位置和尺寸。卡片里展示 CSS Anchor Positioning 的核心代码，完整页面展示可交互的导航舞台。

## 实现原理

- 推文原理来自 Jhey 的 magnetic nav link：用 `li:has(a:is(:hover, :focus-visible))` 找到当前交互的导航项。
- 支持 Anchor Positioning 的浏览器可以让高亮层通过 `position-anchor`、`anchor()` 和 `anchor-size()` 读取当前链接的位置和尺寸。
- 组件同时使用 ResizeObserver 测量当前 active 项，写入 CSS 变量作为回退方案，避免实验性 CSS 不支持时效果失效。
- hover、pointer enter、focus 和 click 都会更新 activeIndex，键盘用户也能触发同一套吸附反馈。
- CSS transition 使用弹性感更强的 cubic-bezier，让高亮层有“被吸过去”的磁性移动感。

## 给 AI 的提示词

```text
请实现一个 magnetic navigation hover effect。导航是一组暗色面板里的链接，当前 hover、focus 或 click 的链接会被一块发光渐变高亮层吸附，高亮层需要平滑移动并匹配链接的宽高。优先使用 CSS :has() 和 CSS Anchor Positioning 表达核心原理：li:has(a:is(:hover, :focus-visible)) 设置 anchor-name，ul::before 通过 position-anchor、anchor(left)、anchor(top)、anchor-size(width/height) 定位。同时用 React + ResizeObserver 提供浏览器回退，把 active 项的位置尺寸写入 CSS 变量。请保证键盘 focus 可见，移动端可换行，代码中用中文注释说明回退定位逻辑。
```
