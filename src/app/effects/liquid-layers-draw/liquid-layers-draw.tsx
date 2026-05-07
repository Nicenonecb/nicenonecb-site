"use client";

import type { PointerEvent } from "react";
import { useCallback, useEffect, useRef } from "react";
import { ParticleFluid, type FluidPointer } from "./particle-fluid";
import styles from "./liquid-layers-draw.module.css";

type LiquidLayersDrawProps = {
  variant?: "detail" | "preview";
};

type ActivePointer = {
  hasMoved: boolean;
  id: number;
  lastX: number;
  lastY: number;
  x: number;
  y: number;
};

function hasVelocity(pointer: ActivePointer) {
  return Math.abs(pointer.x - pointer.lastX) > 0.001 || Math.abs(pointer.y - pointer.lastY) > 0.001;
}

export function LiquidLayersDraw({ variant = "detail" }: LiquidLayersDrawProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fluidRef = useRef<ParticleFluid | null>(null);
  const pointersRef = useRef(new Map<number, ActivePointer>());

  const rootClassName =
    variant === "preview" ? `${styles.root} ${styles.previewRoot}` : styles.root;

  const getLocalPoint = useCallback((event: PointerEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();

    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }, []);

  const handlePointerDown = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      if (event.pointerType === "mouse" && event.button !== 0) {
        return;
      }

      const point = getLocalPoint(event);

      event.currentTarget.setPointerCapture(event.pointerId);
      pointersRef.current.set(event.pointerId, {
        hasMoved: false,
        id: event.pointerId,
        lastX: point.x,
        lastY: point.y,
        x: point.x,
        y: point.y,
      });
    },
    [getLocalPoint],
  );

  const handlePointerMove = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      const pointer = pointersRef.current.get(event.pointerId);

      if (!pointer) {
        return;
      }

      const point = getLocalPoint(event);

      pointer.hasMoved = true;
      pointer.x = point.x;
      pointer.y = point.y;
    },
    [getLocalPoint],
  );

  const handlePointerEnd = useCallback((event: PointerEvent<HTMLElement>) => {
    pointersRef.current.delete(event.pointerId);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    let cancelled = false;
    let frameId = 0;
    const fluid = new ParticleFluid(canvas);
    const activePointerMap = pointersRef.current;
    fluidRef.current = fluid;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;

      fluid.resize(Math.max(1, rect.width), Math.max(1, rect.height), dpr);
    };

    const collectPointers = () => {
      const pointers: FluidPointer[] = [];

      activePointerMap.forEach((pointer) => {
        if (pointer.hasMoved && hasVelocity(pointer)) {
          // 每帧按当前位置与上一帧位置计算速度；pointerdown 自身不产生扰动。
          pointers.push({
            velX: pointer.x - pointer.lastX,
            velY: pointer.y - pointer.lastY,
            x: pointer.x,
            y: pointer.y,
          });
        }

        pointer.lastX = pointer.x;
        pointer.lastY = pointer.y;
        pointer.hasMoved = false;
      });

      return pointers;
    };

    const render = () => {
      const activePointers = collectPointers();

      fluid.step(activePointers);
      fluid.render();
      frameId = window.requestAnimationFrame(render);
    };

    const start = async () => {
      try {
        await fluid.initialize();
      } catch (error) {
        console.error(error);
        return;
      }

      if (cancelled) {
        fluid.dispose();
        return;
      }

      resize();
      render();
      window.addEventListener("resize", resize);
    };

    start();

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", resize);
      activePointerMap.clear();
      fluid.dispose();
      fluidRef.current = null;
    };
  }, []);

  return (
    <section
      aria-label="Liquid Layers"
      className={rootClassName}
      data-effect="liquid-layers"
      onPointerCancel={handlePointerEnd}
      onPointerDown={handlePointerDown}
      onPointerLeave={handlePointerEnd}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
    >
      <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
    </section>
  );
}
