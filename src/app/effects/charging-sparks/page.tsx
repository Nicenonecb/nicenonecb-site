import type { Metadata } from "next";
import { EffectBackLink } from "../effect-back-link";
import styles from "../effects-gallery.module.css";
import { ChargingSparks } from "./charging-sparks";

export const metadata: Metadata = {
  title: "Charging Sparks Effect | Nicenonecb",
  description:
    "A realtime PopcornFX-style charging core loop with a constantly moving white-hot energy ball, magenta/yellow/cyan pulses, and diagonal electric spears.",
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
