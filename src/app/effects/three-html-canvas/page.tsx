import type { Metadata } from "next";
import { EffectBackLink } from "../effect-back-link";
import galleryStyles from "../effects-gallery.module.css";
import styles from "./three-html-canvas.module.css";
import { ThreeHtmlCanvas } from "./three-html-canvas";

export const metadata: Metadata = {
  title: "Three HTML Canvas Effect | Nicenonecb",
  description:
    "A scroll-driven Three.js recreation of an HTML poster turning into a red, white, and black depth scene.",
};

export default function ThreeHtmlCanvasEffectPage() {
  return (
    <main className={`${galleryStyles.page} ${styles.detailPage}`}>
      <div className={styles.backLinkLayer}>
        <EffectBackLink />
      </div>
      <ThreeHtmlCanvas />
    </main>
  );
}
