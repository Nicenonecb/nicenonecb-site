import type { Metadata } from "next";
import { EffectBackLink } from "../effect-back-link";
import styles from "../effects-gallery.module.css";
import { ReflectiveSignalCard } from "./reflective-signal-card";

export const metadata: Metadata = {
  title: "Reflective Signal Card Effect | Nicenonecb",
  description:
    "A pointer-reactive reflective signal card inspired by React Bits, with metallic sheen, live spotlight, and compact motion telemetry.",
};

export default function ReflectiveSignalCardEffectPage() {
  return (
    <main className={styles.page}>
      <EffectBackLink />

      <section className={styles.detailShell}>
        <div className={styles.detailIntro}>
          <h1>Reflective Signal Card</h1>
          <p>
            参考 React Bits 的可复制动效组件思路，将 spotlight、reflective sheen
            和轻量 3D tilt 融合成适合个人站的交互卡片。
          </p>
        </div>
        <div className={styles.detailStage}>
          <ReflectiveSignalCard />
        </div>
      </section>
    </main>
  );
}
