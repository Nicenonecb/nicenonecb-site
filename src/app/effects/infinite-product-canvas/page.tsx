import type { Metadata } from "next";
import { EffectBackLink } from "../effect-back-link";
import styles from "../effects-gallery.module.css";
import { InfiniteProductCanvas } from "./infinite-product-canvas";

export const metadata: Metadata = {
  title: "Infinite Product Canvas | Nicenonecb",
  description:
    "A draggable and zoomable product canvas inspired by shop.ize.capital, with click-to-preview product selection.",
};

export default function InfiniteProductCanvasPage() {
  return (
    <main className={styles.page}>
      <EffectBackLink />

      <section className={styles.detailShell}>
        <div className={styles.detailIntro}>
          <p className={styles.eyebrow}>Pointer events / transform camera</p>
          <h1>Infinite Product Canvas</h1>
          <p>
            参考 shop.ize.capital 首页的商品宇宙：商品卡片铺在世界坐标里，拖拽移动相机，滚轮或双指缩放，点击某个商品会在底部详情栏显示出来。
          </p>
        </div>
        <div className={styles.detailStage}>
          <InfiniteProductCanvas />
        </div>
      </section>
    </main>
  );
}
