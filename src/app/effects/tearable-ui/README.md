# Tearable UI

参考 Pushmatrix tearable page 实现的撕裂页面实验。每一层页面先绘制到 canvas，再作为 `CanvasTexture` 贴到可变形的 `BufferGeometry` 布料网格上。当前激活层会在 Web Worker 中运行纯 TypeScript Verlet 布料求解；当约束拉伸超过撕裂阈值时，worker 会标记约束断裂并重建三角形索引，让下层页面通过真实网格裂口露出。

## 效果目标

这个 demo 的重点不是用 DOM 做一层视觉遮罩，而是把页面当作一张真实可变形的“布料”。用户按住页面任意位置拖动时，命中的区域会被吸附到指针附近，周围网格产生弹性拉扯；继续拉开后，布料约束断裂，当前页面出现不规则裂口，下面的页面会从裂缝中露出来。

当前实现包含五层内容：

- Intro：标题页，展示 “THIS IS TEARABLE UI”。
- Inputs：表单页，包含输入框、slider、toggle 和保存按钮。
- Products：商品页，使用图片素材绘制商品卡片和 hover 状态。
- Video：视频页，将视频帧持续绘制到 canvas texture。
- Indestructible：最终页，`tearThreshold` 极高，理论上不会被撕裂。

## 核心架构

页面分成三部分：

- `tearable-canvas.ts`：负责把每一层 UI 画到 `HTMLCanvasElement` 或 `OffscreenCanvas`，同时返回可交互区域的 hit region。
- `tearable-ui.tsx`：负责 React 状态、R3F 场景、正交相机、材质、指针事件和层级切换。
- `cloth-worker.ts`：负责 Web Worker 里的纯 TypeScript 布料模拟，并把粒子位置、法线和索引缓冲传回主线程。

渲染链路是：

```text
Canvas 2D 绘制页面内容
  -> CanvasTexture
  -> Three.js BufferGeometry 平面网格
  -> Web Worker 更新粒子位置
  -> 主线程更新 position、normal、index buffer
  -> MeshStandardMaterial 渲染变形后的页面
```

因为裂口来自 index buffer 的重建，所以它不是 `clip-path` 或遮罩假效果。断裂后，当前层真的少了一部分三角形，下层网格自然露出。

## 布料模拟

桌面端使用 100x100 分段网格，移动端降级到 40x40。网格粒子、约束、抓取状态和断裂状态都由 `cloth-worker.ts` 维护，主线程每帧向 worker 发送 step 参数，worker 返回：

- position buffer：每个粒子的世界坐标。
- normal buffer：用于光照的法线。
- index buffer：当前仍可绘制的三角形索引。
- broken count：已断裂约束数量，用于判断掉落进度。

默认参数：

- `damping: 0.97`
- `stiffness: 0.25`
- `tearThreshold: 5.5`
- `mouseRadius: 0.4`
- `mouseStrength: 0.6`
- `gravityY: -0.0003`
- `constraintIterations: 2`

移动端参数：

- `tearThreshold: 4.1`
- `mouseRadius: 0.2`
- `mouseStrength: 0.72`
- `gravityY: -0.0006`
- `constraintIterations: 1`

撕裂进度达到阈值后，当前层会进入 `dropped` 状态：固定点被释放，页面开始受重力下落；下一层切换为 `active`；掉落层 4 秒后隐藏，避免继续占用渲染和交互资源。

## 交互逻辑

鼠标和触摸位置会被转换为正交相机下的世界坐标，并映射到当前层的 UV 坐标。

- 左键拖动：在命中点附近抓取一组粒子，按 `mouseStrength` 向指针目标吸附。
- 右键拖动：发送 cut 消息，沿拖动路径切断附近约束。
- 输入框点击：通过 UV 命中 canvas hit region，然后聚焦隐藏的真实 input 接收键盘输入。
- Slider / toggle / button：同样通过 UV hit region 更新 React 状态，再触发 canvas 重绘。
- 商品 hover：hover 状态写入 `uiState.hoveredId`，重新绘制对应商品图片。
- 视频层：每秒约 30 次把视频当前帧回写到 canvas texture。

所有 UI 元素本身都不直接作为 DOM 展示。隐藏 input 只负责键盘输入，真正看见的输入框仍然是 canvas 上的绘制结果。

## 视觉实现

场景使用 `@react-three/fiber` 渲染全屏 WebGL：

- 正交相机覆盖整个视口。
- `html`、`body` 和页面 root 固定 100%，禁用默认滚动和触摸滚动。
- `MeshStandardMaterial` 使用 `DoubleSide`、`vertexColors`、`CanvasTexture`。
- 场景包含 ambient light 和 directional light，撕裂后通过法线更新保留基本起伏和光照。
- 层与层之间使用 z 间距分开，避免深度精度导致下层纹理提前穿透。

## 素材

静态素材放在：

```text
public/effects/tearable-ui/
```

包含背景图、商品图、hover 图、logo 和视频。canvas 绘制函数会预加载这些素材；如果某个素材加载失败，页面仍会继续渲染，只是对应图片区域会退化为基础绘制。

## 文件说明

- `page.tsx`：Next.js App Router 页面入口。
- `tearable-ui.tsx`：主要交互和 R3F 场景。
- `tearable-canvas.ts`：canvas UI 绘制、素材加载、hit region 判断。
- `cloth-worker.ts`：Web Worker 封装、Verlet 物理求解、step/cut/grab/drop 消息处理。
- `tearable-ui.module.css`：全屏锁定、cursor、预览卡片样式。
- `README.md`：当前说明文档。

## 调试与修改建议

想调手感时，优先改 `tearable-ui.tsx` 顶部的 `clothConfig` 和 `mobileClothConfig`：

- 更容易撕裂：降低 `tearThreshold`。
- 拉扯更黏手：提高 `mouseStrength`。
- 抓取范围更大：提高 `mouseRadius`。
- 掉落更快：增大 `gravityY` 的绝对值。
- 更稳定但更耗性能：提高 `constraintIterations`。

想改页面内容时，优先改 `tearable-canvas.ts` 里的 `drawIntro`、`drawInputs`、`drawProducts`、`drawVideo` 和 `drawIndestructible`。如果新增可交互控件，需要同时返回对应 `HitRegion`，并在 `tearable-ui.tsx` 的 `handleUiHit` / `handleUiHover` 中处理。

## 本地运行

```bash
npm run dev
```

打开：

```text
http://localhost:5888/effects/tearable-ui
```

验证构建：

```bash
npm run lint
npm run build
```

## 验收点

- 桌面端使用 100x100 网格，移动端降级为 40x40 网格。
- 最后一层会把 `tearThreshold` 设得极高，形成不可撕裂页面。
- 层级顺序参考原效果：intro、inputs、products、video、indestructible。
- 输入框、按钮、slider、toggle 都绘制进 canvas 纹理，再通过 UV hit region 判断交互区域。
- 文本输入使用隐藏的真实 input 接收键盘输入，输入内容会重新绘制回 canvas 纹理。
- 商品 hover 状态和视频帧同样会回写到当前激活层的 canvas 纹理中。
- 拖动页面任意非控件区域时，页面纹理会跟随布料网格发生弹性形变。
- 继续拉扯后，当前层会通过真实三角索引重建产生不规则裂口。
- 撕裂进度达到阈值后，当前层掉落并激活下一层。
