"use client";

import type { CSSProperties, KeyboardEvent, PointerEvent } from "react";
import { useMemo, useRef, useState } from "react";
import styles from "./reflective-signal-card.module.css";

type ReflectiveSignalCardProps = {
  variant?: "detail" | "preview";
};

type SignalStyle = CSSProperties & Record<`--${string}`, string>;

const metrics = [
  { label: "Graph RAG", value: "94", tone: "cyan" },
  { label: "KV Cache", value: "37", tone: "gold" },
  { label: "Agent Loop", value: "12", tone: "red" },
] as const;

export function ReflectiveSignalCard({ variant = "detail" }: ReflectiveSignalCardProps) {
  const cardRef = useRef<HTMLButtonElement>(null);
  const [active, setActive] = useState(false);
  const [phase, setPhase] = useState(0);

  const shellStyle = useMemo(
    () =>
      ({
        "--signal-card-min-height": variant === "preview" ? "100%" : "40rem",
      }) as SignalStyle,
    [variant],
  );

  const handlePointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    const card = cardRef.current;

    if (!card) {
      return;
    }

    const rect = card.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const xRatio = x / rect.width;
    const yRatio = y / rect.height;
    const rotateX = (0.5 - yRatio) * 12;
    const rotateY = (xRatio - 0.5) * 16;

    // 指针坐标同时驱动聚光、反射带和 3D 倾斜，让卡片像一块被手电扫过的金属屏。
    card.style.setProperty("--pointer-x", `${x}px`);
    card.style.setProperty("--pointer-y", `${y}px`);
    card.style.setProperty("--tilt-x", `${rotateX}deg`);
    card.style.setProperty("--tilt-y", `${rotateY}deg`);
    card.style.setProperty("--shine-x", `${xRatio * 100}%`);
    card.style.setProperty("--shine-offset", `${(xRatio - 0.5) * 2.8}rem`);
  };

  const resetPointer = () => {
    const card = cardRef.current;

    if (!card) {
      return;
    }

    setActive(false);
    card.style.setProperty("--tilt-x", "0deg");
    card.style.setProperty("--tilt-y", "0deg");
    card.style.setProperty("--shine-x", "50%");
    card.style.setProperty("--shine-offset", "0rem");
  };

  const cyclePhase = () => {
    setPhase((current) => (current + 1) % 3);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    cyclePhase();
  };

  return (
    <section
      className={styles.shell}
      data-effect="reflective-signal-card"
      data-variant={variant}
      style={shellStyle}
    >
      <button
        ref={cardRef}
        aria-label={`Reflective Signal Card phase ${phase + 1}`}
        className={styles.card}
        data-active={active}
        data-phase={phase}
        onBlur={resetPointer}
        onFocus={() => setActive(true)}
        onKeyDown={handleKeyDown}
        onPointerEnter={() => setActive(true)}
        onPointerLeave={resetPointer}
        onPointerMove={handlePointerMove}
        onPointerUp={cyclePhase}
        type="button"
      >
        <span className={styles.scanline} />
        <span className={styles.spotlight} />
        <span className={styles.reflection} />

        <span className={styles.header}>
          <span>
            <span className={styles.eyebrow}>React Bits Study</span>
            <strong>Reflective Signal</strong>
          </span>
          <span className={styles.status}>LIVE</span>
        </span>

        <span className={styles.core}>
          <span className={styles.orbit}>
            <span className={styles.orbitRing} />
            <span className={styles.orbitRing} />
            <span className={styles.orbitRing} />
            <span className={styles.node} />
          </span>
          <span className={styles.coreText}>
            <span>Nicenonecb</span>
            <strong>motion card</strong>
          </span>
        </span>

        <span className={styles.metrics}>
          {metrics.map((metric) => (
            <span className={styles.metric} data-tone={metric.tone} key={metric.label}>
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
            </span>
          ))}
        </span>

        <span className={styles.footer}>
          <span>Pointer reactive</span>
          <span>Phase 0{phase + 1}</span>
        </span>
      </button>
    </section>
  );
}
