"use client";

import { useEffect, useRef } from "react";
import { startRecursiveCellularHero } from "./recursive-cellular-engine";
import styles from "./recursive-cellular-hero.module.css";

type RecursiveCellularHeroProps = {
  variant?: "detail" | "preview";
};

export function RecursiveCellularHero({ variant = "detail" }: RecursiveCellularHeroProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const root = rootRef.current;

    if (!canvas || !root) {
      return;
    }

    return startRecursiveCellularHero(root, canvas, variant);
  }, [variant]);

  return (
    <section
      aria-label="Recursive cellular hero effect"
      className={styles.effect}
      data-effect="recursive-cellular-hero"
      data-variant={variant}
      ref={rootRef}
    >
      <canvas aria-hidden="true" className={styles.canvas} ref={canvasRef} />
    </section>
  );
}
