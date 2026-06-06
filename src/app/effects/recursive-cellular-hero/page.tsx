import type { Metadata } from "next";
import { EffectBackLink } from "../effect-back-link";
import styles from "./recursive-cellular-hero.module.css";
import { RecursiveCellularHero } from "./recursive-cellular-hero";

export const metadata: Metadata = {
  title: "Recursive Cellular Hero Effect | Nicenonecb",
  description:
    "A centered Canvas 2D recursive cellular growth effect with orange square cells, spark-like growth agents, and exponential zoom resets.",
};

export default function RecursiveCellularHeroEffectPage() {
  return (
    <main className={styles.detailPage}>
      <EffectBackLink />
      <RecursiveCellularHero />
    </main>
  );
}
