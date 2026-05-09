import type { Metadata } from "next";
import { EffectBackLink } from "../effect-back-link";
import styles from "../effects-gallery.module.css";
import { MagneticNav } from "./magnetic-nav";

export const metadata: Metadata = {
  title: "Magnetic Nav Effect | Nicenonecb",
  description:
    "A CSS anchor positioning inspired magnetic navigation hover effect with a measured fallback.",
};

export default function MagneticNavEffectPage() {
  return (
    <main className={styles.page}>
      <EffectBackLink />

      <section className={styles.detailShell}>
        <div className={styles.detailIntro}>
          <p className={styles.eyebrow}>CSS :has / Anchor Positioning</p>
          <h1>Magnetic Nav</h1>
          <p>
            参考 Jhey 的 magnetic nav link 思路：hover 或键盘聚焦时让当前链接成为
            anchor，高亮层用 anchor() 读取位置和尺寸；同时保留测量回退，保证不支持
            Anchor Positioning 的浏览器也能看到吸附动效。
          </p>
        </div>
        <div className={styles.detailStage}>
          <MagneticNav />
        </div>
      </section>
    </main>
  );
}
