import type { Metadata } from "next";
import { EffectBackLink } from "../effect-back-link";
import styles from "../effects-gallery.module.css";
import { HexPathCard } from "./hex-path-card";

export const metadata: Metadata = {
  title: "Hex Path Effect | Nicenonecb",
  description:
    "A WebGL2 recreation of Shaders.com's Hex Path 1 card with cyan hex-grid glow, film grain, and pointer-driven light.",
};

export default function HexPathCardEffectPage() {
  return (
    <main className={styles.page}>
      <EffectBackLink />

      <section className={styles.detailShell}>
        <div className={styles.detailStage}>
          <HexPathCard />
        </div>
      </section>
    </main>
  );
}
