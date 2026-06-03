# glass-page

## 特效名称

glass-page / Fragmented Liquid Glass Stage

## 具体特效

一个黑场玻璃碎片舞台。页面背后有巨型文字和冷暖光带，前景用 Three.js 生成多块不规则玻璃碎片。碎片会随时间轻微漂移，并在指针靠近时向外扩散、折射背景、拉出青红色散边缘。

## 参考来源

- liquid-glass-paralax

## 实现原理

- 用 CanvasTexture 绘制背后的文字、光带和暗色背景，再把它放到 Three.js 场景深处。
- 用带抖动的网格点生成不规则多边形，挤出成有厚度的玻璃碎片。
- 每块碎片使用 MeshPhysicalMaterial，依赖 transmission、roughness、thickness 和环境贴图制造玻璃质感。
- 指针位置会转换成场景坐标，影响碎片位移、旋转、粗糙度和边缘线透明度。
- 预览模式和完整页面使用不同分辨率、碎片数量和舞台尺寸，保证卡片里也能稳定展示。

## 给 AI 的提示词

```text
请实现一个 Next.js + React + Three.js 的 fragmented liquid glass effect。画面是暗色高对比舞台，背景有巨型发光标题和横向光带，前景是一组不规则玻璃碎片。玻璃碎片需要有透明折射、厚度、环境反射、青红色散边缘，并随鼠标靠近产生轻微外扩、旋转和粗糙度变化。组件需要支持完整页面和卡片预览两种尺寸，预览模式要固定高度，避免布局跳动。请保留简明中文注释说明碎片生成、CanvasTexture 背景和指针交互逻辑。
```
