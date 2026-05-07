# Liquid Layers

复刻 `https://grantkot.com/ll/` 默认 Liquid Layers 效果：全屏黑色画布、底部高密度四色液体层、按住拖拽时用 PVFS 的 `drag_particles` 扰动液体。

实现重点：

- 直接加载 `public/effects/liquid-layers-draw/pvfs2d_v2_7.js/.wasm`，使用原站同类 PVFS/PBF 求解器。
- 每种材料 5000 个粒子，总计约 20000；默认参数保持 `sameRestDensity=8`、`diffRestDensity=0`、`stiffness=0.2`、`stiffnessNear=2`。
- 交互只在 `pointermove` 且按下时生效，每帧按位移速度分 3 个 substep 调用 `drag_particles`。
- WebGL 点渲染使用 `kernelRadius * dpr * 0.4` 附近的点尺寸，保持厚液体边界而不叠加 GUI、广告或说明面板。
