# Quantum Neural Network

参考 `codepen.io/VoXelo/pen/dPMeGze` 的 Three.js 神经网络卡片效果。

- Three.js 绘制发光节点、连线和低密度星场，配合 `UnrealBloomPass` 形成紫色/粉橙/蓝绿霓虹辉光。
- 点击舞台会向网络发送能量脉冲；拖拽由 `OrbitControls` 控制相机旋转。
- `Morph` 在球状晶体、螺旋格栅、分形网络之间切换；密度滑杆会重新生成节点和连线。
- `variant="preview"` 用于画廊卡片，降低星点和节点数量以控制卡片列表性能。
