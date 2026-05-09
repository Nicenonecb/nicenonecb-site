import type { Metadata } from "next";
import { EffectBackLink } from "../effect-back-link";
import styles from "../effects-gallery.module.css";
import { ProceduralComputer } from "./procedural-computer";

export const metadata: Metadata = {
  title: "Procedural Computer Effect | Nicenonecb",
  description:
    "A WebGL2 shader recreation of procedural.computer's rotating ring field, pointer crosshair, scroll phase, and emboss mode.",
};

export default function ProceduralComputerEffectPage() {
  return (
    <main className={styles.page}>
      <EffectBackLink />

      <section className={styles.detailShell}>
        <div className={styles.detailStage}>
          <ProceduralComputer />
        </div>
      </section>
    </main>
  );
}
