import type { Metadata } from "next";
import Link from "next/link";
import { GlassPage } from "./glass-page/glass-page";
import { HexPathCard } from "./hex-path-card/hex-path-card";
import { LivingMatterCard } from "./living-matter-card/living-matter-card";
import { LiquidLayersDraw } from "./liquid-layers-draw/liquid-layers-draw";
import { LiquidMetalButton } from "./liquid-metal-button/liquid-metal-button";
import { MagneticNav } from "./magnetic-nav/magnetic-nav";
import { ProceduralComputer } from "./procedural-computer/procedural-computer";
import { QuantumNeuralNetwork } from "./quantum-neural-network/quantum-neural-network";
import { ReflectiveSignalCard } from "./reflective-signal-card/reflective-signal-card";
import { ScrambleTextLab } from "./scramble-text-lab/scramble-text-lab";
import { TearableUi } from "./tearable-ui/tearable-ui";
import { ChargingSparks } from "./charging-sparks/charging-sparks";
import { EffectBackLink } from "./effect-back-link";
import { EffectsPager } from "./effects-pager";
import styles from "./effects-gallery.module.css";

const effectsPageSize = 8;

const effects = [
  {
    href: "/effects/glass-page",
    index: "01",
    name: "GLASS PAGE",
    summary:
      "参考 liquid-glass-paralax 的黑场碎片舞台：巨型文字在玻璃层后方漂移，碎片随指针折射、外扩并拉出冷暖色散边。",
    stack: ["Three.js", "MeshPhysicalMaterial"],
    preview: <GlassPage variant="preview" />,
  },
  {
    href: "/effects/scramble-text-lab",
    index: "02",
    name: "Scramble Text Lab",
    summary:
      "基于帧推进和字符集切换的文字扰动实验，用可控随机信号制造解密式标题动效。",
    stack: ["React state", "CSS animation", "Timed frames", "Accessible live text"],
    preview: <ScrambleTextLab variant="preview" />,
  },
  {
    href: "/effects/magnetic-nav",
    index: "03",
    name: "Magnetic Nav",
    summary:
      "参考 Jhey 的 magnetic nav link：用 :has() 选中 hover/focus 链接，并通过 CSS Anchor Positioning 或测量回退让高亮层吸附到目标尺寸。",
    stack: ["CSS :has()", "Anchor Positioning", "ResizeObserver fallback", "Focus states"],
    preview: <MagneticNav variant="preview" />,
  },
  {
    href: "/effects/liquid-layers-draw",
    index: "04",
    name: "Liquid Layers",
    summary:
      "参考 grantkot.com/ll 默认效果：黑场底部四色液体层，按住拖拽时形成厚边界、空腔、液柱和回流。",
    stack: ["PVFS WASM", "WebGL points", "Pointer velocity", "Position fluid"],
    preview: <LiquidLayersDraw variant="preview" />,
  },
  {
    href: "/effects/tearable-ui",
    index: "05",
    name: "Tearable UI",
    summary:
      "参考 pushmatrix tearable：页面内容先绘制成 canvas 纹理，再贴到可变形 cloth 网格；拖拽拉伸会断开约束并重建三角索引，露出下一层页面。",
    stack: ["React Three Fiber", "CanvasTexture", "Verlet cloth worker", "Triangle index tearing"],
    preview: <TearableUi variant="preview" />,
  },
  {
    href: "/effects/procedural-computer",
    index: "06",
    name: "Procedural Computer",
    summary:
      "拆解 procedural.computer 的背景特效：WebGL2 中三组旋转椭圆环被 smooth-min 融合，指针生成横竖细线，滚轮与明暗/浮雕 uniform 平滑过渡。",
    stack: ["WebGL2", "SDF rings", "Pointer crosshair", "Scroll phase", "Emboss shader"],
    preview: <ProceduralComputer variant="preview" />,
  },
  {
    href: "/effects/hex-path-card",
    index: "07",
    name: "Hex Path",
    summary:
      "参考 shaders.com 的 Hex Path 1：黑蓝径向背景、稀疏六边形路径、青蓝霓虹辉光、film grain，以及随鼠标移动强化的亮光路径。",
    stack: ["WebGL2", "Hex SDF", "Pointer glow", "Chroma flow", "Film grain"],
    preview: <HexPathCard variant="preview" />,
  },
  {
    href: "/effects/living-matter-card",
    index: "08",
    name: "Living Matter",
    summary:
      "参考 X 视频的 metaball 网页转场：HTML-like 页面先绘入 canvas texture，再由 WebGL2 体积 blob 做折射、显现、吞没和 start 回环。",
    stack: ["HTML-in-canvas", "WebGL2", "Metaball SDF", "Texture refraction", "Live input"],
    preview: <LivingMatterCard variant="preview" />,
  },
  {
    href: "/effects/quantum-neural-network",
    index: "09",
    name: "Quantum Neural Network",
    summary:
      "参考 VoXelo 的 CodePen：黑场星云中漂浮的 3D 神经网络，玻璃控制面板切换主题、密度和结构，点击会向节点连线发送能量脉冲。",
    stack: ["Three.js", "OrbitControls", "UnrealBloomPass", "ShaderMaterial", "Energy pulses"],
    preview: <QuantumNeuralNetwork variant="preview" />,
  },
  {
    href: "/effects/liquid-metal-button",
    index: "10",
    name: "Liquid Metal Button",
    summary:
      "参考 Muhannad Hassan 的 Liquid metal button：黑色胶囊轨道承载灰色图标与圆形金属按钮，hover/focus 时 WebGL 液态高光与同色系金属圆环一起被激活。",
    stack: ["WebGL2", "CSS masks", "Pointer easing", "Chrome hover ring", "Accessible button"],
    preview: <LiquidMetalButton variant="preview" />,
  },
  {
    href: "/effects/charging-sparks",
    index: "11",
    name: "Charging Sparks",
    summary:
      "参考 damotime 视频的 PopcornFX idle：黑灰舞台中央的白热能量核持续搓动，按品红、黄绿、蓝青相位爆出胶囊粒子、弯曲光带和长斜向光刺。",
    stack: ["Canvas 2D", "Energy field", "Additive glow", "Halftone haze", "Video study"],
    preview: <ChargingSparks variant="preview" />,
  },
  {
    href: "/effects/reflective-signal-card",
    index: "12",
    name: "Reflective Signal",
    summary:
      "分析 React Bits 后抽取 spotlight、reflective sheen 和 tilt 的核心交互，改造成黑场荧光个人站风格的可点击特效卡片。",
    stack: ["React Bits study", "Pointer CSS vars", "3D tilt", "Reflective sheen", "Focus states"],
    preview: <ReflectiveSignalCard variant="preview" />,
  },
];

export const metadata: Metadata = {
  title: "Effects | Nicenonecb",
  description:
    "A card-based gallery for Nicenonecb frontend effects, with previews, descriptions, and implementation stack notes.",
};

export default function EffectsPage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <EffectBackLink href="/" label="返回主页" />
        <div className={styles.galleryIntro}>
          <h1>{effects.length} frontend effects</h1>
        </div>
      </header>

      <EffectsPager pageSize={effectsPageSize} total={effects.length}>
        {effects.map((effect) => (
          <article className={styles.card} key={effect.href}>
            <div className={styles.cardMeta}>
              <span>{effect.index}</span>
              <span>Live preview</span>
            </div>

            <div className={styles.previewFrame}>{effect.preview}</div>

            <div className={styles.cardBody}>
              <h2>{effect.name}</h2>
              <p>{effect.summary}</p>
              <div className={styles.stackList} aria-label={`${effect.name} 技术栈`}>
                {effect.stack.map((item) => (
                  <span key={item}>{item}</span>
                ))}
              </div>
              <Link className={styles.openLink} href={effect.href}>
                Open effect
              </Link>
            </div>
          </article>
        ))}
      </EffectsPager>
    </main>
  );
}
