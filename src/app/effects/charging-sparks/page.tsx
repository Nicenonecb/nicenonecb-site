import type { Metadata } from "next";
import { EffectBackLink } from "../effect-back-link";
import styles from "../effects-gallery.module.css";
import { ChargingSparks } from "./charging-sparks";

export const metadata: Metadata = {
  title: "Charging Sparks Effect | Nicenonecb",
  description:
    "A realtime PopcornFX-style charging sparks idle loop with simple glowing shapes, a pulsing shard core, and diagonal electric streaks.",
};

export default function ChargingSparksEffectPage() {
  return (
    <main className={styles.page}>
      <EffectBackLink />

      <section className={styles.detailShell}>
        <div className={styles.detailStage}>
          <ChargingSparks />
        </div>
      </section>
    </main>
  );
}
