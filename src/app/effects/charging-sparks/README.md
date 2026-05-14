# Charging Sparks

参考 `https://x.com/damotime/status/2054584815849021838` 里的 PopcornFX 风格火花 idle。原视频约 20.6 秒，画面是黑灰雾化背景中一个小型充能核心不断闪烁，周围弹出简单图形粒子，并偶尔出现穿过核心的长斜向电弧。

## 视觉拆解

- 中心核心：星形/碎片状高亮团块，持续轻微旋转和高频闪烁。
- 简单图形：圆片、软圆、胶囊短条、三角碎片、短线火花。
- 长电弧：低频出现的细长斜线，快速闪出、滑动并衰减。
- 色彩节奏：粉紫为主，穿插青绿、黄绿和暖黄色的短促阶段。
- 背景：低对比黑灰舞台，中心附近有软雾和轻微 grain，突出发光粒子。

## 实现方式

- `charging-sparks.tsx` 使用 React Three Fiber 渲染一个小型 Three.js 场景。
- 粒子来自确定性 seeded timeline，而不是实时随机数，保证 idle 循环有稳定节奏。
- 所有可见元素都是程序化简单几何：`CircleGeometry`、自定义胶囊 `ShapeGeometry`、三角碎片、短线平面和星形核心。
- 材质使用 `THREE.AdditiveBlending` 和透明度曲线叠加，模拟参考视频里的 bloom/发光观感。
- `variant="preview"` 会降低粒子数量和舞台高度，用于 effects gallery 卡片。

## 调参入口

- `loopDuration`：对齐参考视频的循环长度。
- `palette`：控制粉紫、青绿、黄绿等发光相位。
- `makeParticleSpecs`：控制粒子数量、半径、生命周期、形状分布和喷发节奏。
- `makeBeamSpecs`：控制长斜向电弧出现时间、角度、长度和颜色。
- `charging-sparks.module.css`：控制背景雾、暗角、grain 和详情/预览尺寸。

## 验证重点

- `/effects/charging-sparks` 中核心应始终居中，画面不应空白。
- `/effects` 的预览卡片应保持 16:10 框内布局，不溢出或挤压卡片文字。
- 动画应出现粉紫、青绿、黄绿三个明显色彩阶段。
- 约每几秒应能看到一根长斜向电弧穿过核心。
- 移动端宽度下，画面仍保持中心构图，文字和预览不重叠。
