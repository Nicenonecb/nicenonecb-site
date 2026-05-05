import type { Metadata } from "next";
import Link from "next/link";
import styles from "../effects-gallery.module.css";
import { ScrambleTextLab } from "./scramble-text-lab";

export const metadata: Metadata = {
  title: "Scramble Text Lab | NiceNoneCB",
  description:
    "A frame-driven variable text and character scrambling experiment for NiceNoneCB effects.",
};

export default function ScrambleTextLabPage() {
  return (
    <main className={styles.page}>
      <Link className={styles.detailBack} href="/effects">
        ← back
      </Link>

      <section className={styles.detailShell}>
        <div className={styles.detailIntro}>
          <p className={styles.eyebrow}>React / CSS animation</p>
          <h1>Scramble Text Lab</h1>
          <p>
            用帧计数、字符集和固定高度渲染来控制文字扰动。标题每次重放都会换 payload，适合用在命令行风格首页、加载态或品牌动效里。
          </p>
        </div>
        <div className={styles.detailStage}>
          <ScrambleTextLab />
        </div>
      </section>
    </main>
  );
}
