import type { Metadata } from "next";
import { EffectBackLink } from "../effect-back-link";
import styles from "../effects-gallery.module.css";
import { LivingMatterCard } from "./living-matter-card";

export const metadata: Metadata = {
  title: "Living Matter Card Effect | Nicenonecb",
  description:
    "An html-in-canvas WebGL2 card where a raymarched metaball reveals, refracts, and swallows a live interface texture.",
};

export default function LivingMatterCardEffectPage() {
  return (
    <main className={styles.page}>
      <EffectBackLink />

      <section className={styles.detailShell}>
        <div className={styles.detailStage}>
          <LivingMatterCard />
        </div>
      </section>
    </main>
  );
}
