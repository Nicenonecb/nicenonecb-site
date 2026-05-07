# Infinite Product Canvas

Shop-style infinite canvas effect inspired by `shop.ize.capital`.

## 核心实现

- 商品节点是普通 DOM button，不使用 canvas 或 WebGL。
- `.world` 作为世界坐标层，使用 `translate3d + scale` 模拟相机移动和缩放。
- Pointer Events 统一处理鼠标拖拽、触控拖拽和双指缩放。
- 点击节点时只更新当前选中商品，避免拖拽过程误触。

## 交互

- 拖拽：移动整个商品世界。
- 滚轮：放大 / 缩小。
- 双指：移动端 pinch zoom。
- 点击商品：底部详情栏显示对应商品。
