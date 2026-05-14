import type { Metadata } from "next";
import { EffectBackLink } from "../effect-back-link";
import styles from "../effects-gallery.module.css";
import { LiquidMetalButton } from "./liquid-metal-button";

export const metadata: Metadata = {
  title: "Liquid Metal Button Effect | Nicenonecb",
  description:
    "A WebGL2 liquid metal button inspired by Muhannad Hassan's CodePen, with a chrome shader, capsule track, and tonal metal hover ring.",
};

export default function LiquidMetalButtonEffectPage() {
  return (
    <main className={styles.page}>
      <EffectBackLink />

      <section className={styles.detailShell}>
        <div className={styles.detailStage}>
          <LiquidMetalButton />
        </div>
      </section>
    </main>
  );
}
