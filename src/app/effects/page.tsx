import type { Metadata } from "next";
import Link from "next/link";
import { GlassPage } from "./glass-page";
import { ScrambleTextLab } from "./scramble-text-lab";
import styles from "./effects-gallery.module.css";

const effects = [
  {
    href: "/effects/glass-page",
    index: "01",
    name: "glass-page",
    summary:
      "参考 liquid-glass-paralax 的黑场碎片舞台：巨型文字在玻璃层后方漂移，碎片随指针折射、外扩并拉出冷暖色散边。",
    stack: ["Next.js App Router", "React Client Component", "Three.js", "MeshPhysicalMaterial"],
    preview: <GlassPage variant="preview" />,
  },
  {
    href: "/effects/scramble-text-lab",
    index: "02",
    name: "Scramble Text Lab",
    summary:
      "基于帧推进和字符集切换的文字扰动实验，用可控随机信号制造解密式标题动效。",
    stack: ["React state", "CSS animation", "Timed frames", "Accessible live text"],
    preview: <ScrambleTextLab />,
  },
];

export const metadata: Metadata = {
  title: "Effects Lab | NiceNoneCB",
  description:
    "A card-based gallery for NiceNoneCB frontend effects, with previews, descriptions, and implementation stack notes.",
};

export default function EffectsPage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/" className={styles.logo}>
          NiceNoneCB
        </Link>
        <nav className={styles.nav} aria-label="Effects navigation">
          <Link href="/">Home</Link>
          <a href="mailto:nicenonecb@gmail.com">Contact</a>
        </nav>
      </header>

      <section className={styles.hero} aria-labelledby="effects-title">
        <p className={styles.eyebrow}>Frontend Effects</p>
        <h1 id="effects-title">Effects Lab</h1>
        <p>
          当前已整理两个独立效果。每张卡片都包含实时预览、效果描述和技术栈信息，点击进入后可以查看完整版本。
        </p>
      </section>

      <section className={styles.grid} aria-label="Effects list">
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
      </section>
    </main>
  );
}
