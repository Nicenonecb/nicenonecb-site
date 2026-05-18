# Three HTML Canvas

References:

- `https://cullenwebber.github.io/three-html-to-canvas/`
- `https://github.com/cullenwebber/three-html-to-canvas`

This effect studies a fixed WebGL canvas that renders an offscreen HTML-like poster. At the top of the scroll range it looks like a flat white editorial page: huge black typography, a centered red square content panel, and a small `SCROLL DOWN` label. In the middle of the scroll range the same red/white/black visual language becomes a perspective Three.js scene with skewed red panels, rounded arches, vertical columns, white spheres, and black typography planes.

## Implementation Notes

- `three-html-canvas.tsx` owns the Three.js renderer, projected-material shader patch, HTML rasterization, scene, scroll timeline, and disposal.
- The offscreen source page is cloned into an SVG `foreignObject`, decoded as an image, drawn into a 2D canvas, and uploaded as a `THREE.CanvasTexture`. This follows the reference repo's `HtmlToCanvas` approach instead of hand-drawing the texture.
- The HTML texture is projected through a fixed projector camera onto the 3D meshes. Native page scroll only moves the main camera through the same keyframe shape as the reference repo: rest, right/down/forward, left/up, then rest again.
- `uLitness` blends from flat projected color toward real Three.js lighting as the camera leaves the original projection view, matching the reference repo's `ProjectedMaterial` idea.
- Detail mode uses a tall wrapper with a fixed canvas. Native page scroll becomes a normalized progress value, then the render loop eases toward it.
- Preview mode does not listen to page scroll. It gently oscillates around the 3D phase so the gallery card stays alive without forcing the page to scroll.
- 复杂点在投影纹理和生命周期：投影相机必须固定在首屏视角，滚动只驱动主相机；组件卸载时必须释放 renderer、geometry、material 和 texture，避免切换页面后残留 WebGL 资源。

## Visual Checklist

- Top scroll position: white background, oversized black `Designing / Motion / Crafting / Depth / Into / Living / Worlds` typography, centered red panel, bottom `SCROLL DOWN`.
- Mid scroll position: scene becomes 3D with red rounded slabs, red/white arches, columns, white spheres, and perspective black text planes.
- Scroll back upward: the poster returns without a full canvas reset or blank frame.
- Gallery preview: compact 3D phase remains contained in the 16:10 card frame.
