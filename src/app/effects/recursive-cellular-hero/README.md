# Recursive Cellular Hero

复刻 `anthropic.com/institute/recursive-self-improvement` 首屏 hero 的核心 canvas 动效：象牙白背景点阵里，橙色细胞格从中心种子向外生长；填满一层后整组格子被指数缩放压回中心，再递归长出下一层。

## 视觉拆解

- 画面结构：只保留中心 canvas 动效，没有导航、标题或 CTA 文案。
- 背景：象牙白底叠两层低透明度点阵，点阵和细胞尺寸保持比例关系。
- 细胞：暖橙圆角方块，内部有径向渐变、噪点、轻微边缘高光。
- 出生状态：每个细胞先以小碎块/网格片出现，再渐变成完整色块。
- 生长头：不是手画射线，而是完整目标图形的缩略 sprite，会沿网格边移动，停住后消散。
- 递归感：细胞内部纹理、移动生长头和整体缩放都复用同一套目标图形，所以画面会出现“图形里套图形”的递归感。

## 实现方式

- `recursive-cellular-engine.ts` 使用 Canvas 2D，不用图片、视频或 DOM 方块堆叠。
- 目标形状来自原站同款 `Path2D`，先归一化到 `152x152` mask，再采样成 `19x19` 栅格。
- 栅格为每个目标 cell 建立上下左右邻接表；动态生长只沿中心可达区域扩散。
- 每轮动画从中心 cell 投放 agent；agent 每 450ms 走到一个未访问邻居，并留下出生时间。
- 每个 tick 按原站曲线增加 agent 数量：`floor((ticks / spreadRate) ** 2)`，递归层越深扩散越快。
- cell 的 `bornAt` 决定绘制状态：前 700ms 画递归小网格 flip texture，随后用 1600ms 淡入 solid texture。
- `recursiveLevel`、`zoom` 和 `zoomVelocity` 组成原站同款弹簧缩放；完成态会先压回中心，再播下一层。
- `IntersectionObserver` 控制进入视口才播放；`ResizeObserver` 跟随预览卡片和详情页尺寸重绘。
- `prefers-reduced-motion` 下直接绘制完成态，避免自动循环。

## 调参入口

- `gridSize` / `gridCenter`：目标栅格精度。
- `sparkPathData` / `buildTarget()`：原站目标形状、mask 采样和连通性统计。
- `tickMs`：agent 前进一步的节奏。
- `updateGrowth()`：并行生长头数量曲线和邻接扩散。
- `getLayout()`：详情页和预览卡片里的中心舞台比例。
- `recursiveZoomStep` / `maxRecursiveLevel`：递归缩放的层级距离和循环层数。
- `createRecursiveTextures()` / `createAgentSprites()`：细胞内部递归网格、solid 状态和移动 agent sprite。

## 验证重点

- `/effects/recursive-cellular-hero` 首屏应是浅色象牙白页面，不应出现黑色 gallery 壳。
- 详情页内部不应出现导航、标题或 CTA；保留全站统一的浮动返回按钮。
- 动画应从少量中心 sprite 开始生长，约 8-11 秒进入大形态，随后缩入中心并递归播下一层。
