"use client";

import type { CSSProperties, PointerEvent, WheelEvent } from "react";
import Image from "next/image";
import { useCallback, useMemo, useRef, useState } from "react";
import styles from "./infinite-product-canvas.module.css";

type InfiniteProductCanvasProps = {
  variant?: "detail" | "preview";
};

type Product = {
  id: string;
  title: string;
  price: string;
  status: "available" | "sold";
  image: string;
  note: string;
};

type PointerPoint = {
  x: number;
  y: number;
};

const products: Product[] = [
  {
    id: "baby-blue",
    title: "baby blue beanie",
    price: "£45.00",
    status: "available",
    image:
      "https://shop.ize.capital/cdn/shop/files/KiveImage_6.png?v=1776090908&width=600",
    note: "soft knit / cold signal",
  },
  {
    id: "cowhide",
    title: "beige cowhide beanie",
    price: "£60.00",
    status: "sold",
    image:
      "https://shop.ize.capital/cdn/shop/files/KiveImage_4.png?v=1776091545&width=600",
    note: "archive sample / sold",
  },
  {
    id: "tartan",
    title: "beige tartan beanie",
    price: "£45.00",
    status: "sold",
    image:
      "https://shop.ize.capital/cdn/shop/files/KiveImage_1.png?v=1776091124&width=600",
    note: "woven check / sold",
  },
  {
    id: "black-pink",
    title: "black and pink beanie",
    price: "£45.00",
    status: "available",
    image:
      "https://shop.ize.capital/cdn/shop/files/KiveImage_2.png?v=1776091167&width=600",
    note: "high contrast trim",
  },
  {
    id: "lambskin",
    title: "black lambskin beanie",
    price: "£60.00",
    status: "sold",
    image:
      "https://shop.ize.capital/cdn/shop/files/KiveImage_8.png?v=1776093346&width=600",
    note: "leather texture / sold",
  },
  {
    id: "black-black",
    title: "black on black beanie",
    price: "£45.00",
    status: "available",
    image:
      "https://shop.ize.capital/cdn/shop/files/KiveImage_7.png?v=1776093384&width=600",
    note: "low light uniform",
  },
  {
    id: "woodland",
    title: "grey woodland beanie",
    price: "£45.00",
    status: "available",
    image:
      "https://shop.ize.capital/cdn/shop/files/graywoodland.png?v=1776206855&width=600",
    note: "field camo repeat",
  },
  {
    id: "navy",
    title: "navy beanie",
    price: "£45.00",
    status: "sold",
    image:
      "https://shop.ize.capital/cdn/shop/files/KiveImage_5.png?v=1776091491&width=600",
    note: "deep blue / sold",
  },
];

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const seededUnit = (index: number, col: number, row: number) => {
  const signal = Math.sin((index + 1) * 12.9898 + col * 78.233 + row * 37.719);
  const hash = signal * 43758.5453;

  return hash - Math.floor(hash);
};

// 固定生成一批世界坐标节点，避免运行时随机导致服务端/客户端渲染不一致。
const gridSlots = Array.from({ length: 63 }, (_, index) => {
  const col = (index % 9) - 4;
  const row = Math.floor(index / 9) - 3;
  const stagger = Math.abs(col % 2) * 84;
  const jitterX = Math.sin(index * 17.17) * 46;
  const jitterY = Math.cos(index * 9.31) * 38;

  return {
    id: `${col}:${row}`,
    product: products[Math.floor(seededUnit(index, col, row) * products.length)],
    rotate: `${(Math.sin(index * 2.11) * 7).toFixed(3)}deg`,
    scale: (0.86 + ((index * 13) % 9) * 0.025).toFixed(3),
    x: `${(col * 276 + jitterX).toFixed(2)}px`,
    y: `${(row * 236 + stagger + jitterY).toFixed(2)}px`,
  };
});

function distanceBetween(points: PointerPoint[]) {
  return Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
}

export function InfiniteProductCanvas({
  variant = "detail",
}: InfiniteProductCanvasProps) {
  const [camera, setCameraState] = useState({ x: 0, y: 0 });
  const [zoom, setZoomState] = useState(variant === "preview" ? 0.58 : 0.78);
  const [selected, setSelected] = useState<Product>(products[0]);
  const pointersRef = useRef(new Map<number, PointerPoint>());
  const lastPointerRef = useRef<PointerPoint | null>(null);
  const cameraRef = useRef(camera);
  const zoomRef = useRef(zoom);
  const dragDistanceRef = useRef(0);
  const pinchRef = useRef<{ distance: number; zoom: number } | null>(null);

  const setCamera = useCallback((next: { x: number; y: number }) => {
    cameraRef.current = next;
    setCameraState(next);
  }, []);

  const setZoom = useCallback((next: number) => {
    const clamped = clamp(next, 0.38, 1.85);
    zoomRef.current = clamped;
    setZoomState(clamped);
  }, []);

  const resetView = useCallback(() => {
    setCamera({ x: 0, y: 0 });
    setZoom(variant === "preview" ? 0.58 : 0.78);
  }, [setCamera, setZoom, variant]);

  const worldStyle = useMemo(
    () =>
      ({
        "--canvas-x": `${camera.x}px`,
        "--canvas-y": `${camera.y}px`,
        "--canvas-zoom": zoom,
      }) as CSSProperties,
    [camera, zoom],
  );

  const handlePointerDown = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (event.pointerType === "mouse" && event.button !== 0) {
        return;
      }

      event.currentTarget.setPointerCapture(event.pointerId);
      pointersRef.current.set(event.pointerId, {
        x: event.clientX,
        y: event.clientY,
      });

      dragDistanceRef.current = 0;

      if (pointersRef.current.size >= 2) {
        const points = Array.from(pointersRef.current.values()).slice(0, 2);
        pinchRef.current = {
          distance: distanceBetween(points),
          zoom: zoomRef.current,
        };
        lastPointerRef.current = null;
        return;
      }

      lastPointerRef.current = {
        x: event.clientX,
        y: event.clientY,
      };
    },
    [],
  );

  const handlePointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (!pointersRef.current.has(event.pointerId)) {
        return;
      }

      pointersRef.current.set(event.pointerId, {
        x: event.clientX,
        y: event.clientY,
      });

      if (pointersRef.current.size >= 2) {
        event.preventDefault();
        const points = Array.from(pointersRef.current.values()).slice(0, 2);
        const pinch = pinchRef.current;

        // 双指缩放只看两指距离比例，缩放中心保持在舞台中央以降低实现复杂度。
        if (!pinch) {
          pinchRef.current = {
            distance: distanceBetween(points),
            zoom: zoomRef.current,
          };
          return;
        }

        const ratio = distanceBetween(points) / pinch.distance;
        setZoom(pinch.zoom * ratio);
        return;
      }

      const lastPointer = lastPointerRef.current;

      if (!lastPointer) {
        return;
      }

      const dx = event.clientX - lastPointer.x;
      const dy = event.clientY - lastPointer.y;

      dragDistanceRef.current += Math.hypot(dx, dy);
      lastPointerRef.current = {
        x: event.clientX,
        y: event.clientY,
      };

      setCamera({
        x: cameraRef.current.x + dx,
        y: cameraRef.current.y + dy,
      });
    },
    [setCamera, setZoom],
  );

  const handlePointerEnd = useCallback((event: PointerEvent<HTMLDivElement>) => {
    pointersRef.current.delete(event.pointerId);
    pinchRef.current = null;

    if (pointersRef.current.size === 1) {
      const point = Array.from(pointersRef.current.values())[0];
      lastPointerRef.current = point;
      return;
    }

    lastPointerRef.current = null;
  }, []);

  const handleWheel = useCallback(
    (event: WheelEvent<HTMLDivElement>) => {
      event.preventDefault();
      const nextZoom = zoomRef.current * (1 - event.deltaY * 0.0016);
      setZoom(nextZoom);
    },
    [setZoom],
  );

  const handleTileClick = useCallback((product: Product) => {
    // 拖拽结束后浏览器仍会触发 click，这里用移动距离过滤误触。
    if (dragDistanceRef.current > 8) {
      return;
    }

    setSelected(product);
  }, []);

  return (
    <section className={styles.shell} data-variant={variant}>
      <div className={styles.toolbar}>
        <div>
          <span>Infinite Product Canvas</span>
          <strong>{Math.round(zoom * 100)}%</strong>
        </div>
        <button onClick={resetView} type="button">
          Reset
        </button>
      </div>

      <div
        aria-label="可拖拽和缩放的商品画布"
        className={styles.viewport}
        onPointerCancel={handlePointerEnd}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onWheel={handleWheel}
        role="application"
      >
        <div className={styles.world} style={worldStyle}>
          {gridSlots.map((slot) => (
            <button
              aria-label={`显示 ${slot.product.title}`}
              className={styles.tile}
              data-status={slot.product.status}
              key={slot.id}
              onClick={() => handleTileClick(slot.product)}
              style={
                {
                  "--tile-rotate": slot.rotate,
                  "--tile-scale": slot.scale,
                  "--tile-x": slot.x,
                  "--tile-y": slot.y,
                } as CSSProperties
              }
              type="button"
            >
              <span className={styles.imagePlate}>
                <Image
                  alt=""
                  draggable="false"
                  fill
                  sizes={variant === "preview" ? "120px" : "180px"}
                  src={slot.product.image}
                  unoptimized
                />
              </span>
              <span className={styles.tileInfo}>
                <span>{slot.product.title}</span>
                <span>{slot.product.price}</span>
              </span>
              {slot.product.status === "sold" ? (
                <span className={styles.soldStamp}>Sold</span>
              ) : null}
            </button>
          ))}
        </div>
        <div className={styles.vignette} aria-hidden="true" />
      </div>

      <aside className={styles.detailPanel} aria-live="polite">
        <Image
          alt={selected.title}
          height={96}
          src={selected.image}
          unoptimized
          width={96}
        />
        <div>
          <p>{selected.status === "sold" ? "Archive item" : "Selected item"}</p>
          <h2>{selected.title}</h2>
          <span>{selected.note}</span>
        </div>
        <strong>{selected.price}</strong>
      </aside>
    </section>
  );
}
