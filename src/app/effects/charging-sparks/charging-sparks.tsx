"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef } from "react";
import styles from "./charging-sparks.module.css";

type ChargingSparksProps = {
  variant?: "detail" | "preview";
};

type ColorStop = {
  accent: string;
  beam: string;
  core: string;
  glow: string;
  hot: string;
  soft: string;
};

type EnergyState = ColorStop & {
  cx: number;
  cy: number;
  pulse: number;
  spin: number;
};

type Rgb = {
  b: number;
  g: number;
  r: number;
};

const stageWidth = 640;
const stageHeight = 360;
const loopDuration = 20.608;
const chargeParticleCount = 7;
const colorTimeline: Array<ColorStop & { at: number }> = [
  { accent: "#ff7a45", at: 0, beam: "#ff26dc", core: "#ff30d8", glow: "#d845b5", hot: "#fff1ed", soft: "#b04cff" },
  { accent: "#ffb33d", at: 2.4, beam: "#e8ff32", core: "#dfff39", glow: "#b9de49", hot: "#fffbd0", soft: "#55ff54" },
  { accent: "#72ff4b", at: 5.8, beam: "#80ff31", core: "#d7ff3c", glow: "#9adf4e", hot: "#fbffd3", soft: "#29eec4" },
  { accent: "#9f70ff", at: 8.5, beam: "#3de6ff", core: "#62f4ff", glow: "#39c9d0", hot: "#effcff", soft: "#5f7bff" },
  { accent: "#42dbff", at: 11.8, beam: "#58f7dc", core: "#66ffe1", glow: "#42d1ba", hot: "#ecfff9", soft: "#48ff71" },
  { accent: "#ff7a45", at: 14.2, beam: "#ff29da", core: "#ff36dd", glow: "#d54cc4", hot: "#fff1f5", soft: "#dc4dff" },
  { accent: "#ffb142", at: 17.2, beam: "#ff4bc5", core: "#fff060", glow: "#d78455", hot: "#fff7dc", soft: "#ff25dc" },
  { accent: "#ff7a45", at: loopDuration, beam: "#ff26dc", core: "#ff30d8", glow: "#d845b5", hot: "#fff1ed", soft: "#b04cff" },
];

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function fract(value: number) {
  return value - Math.floor(value);
}

function easeIn(value: number) {
  return value * value;
}

function hash(seed: number) {
  return fract(Math.sin(seed * 127.1 + 311.7) * 43758.5453123);
}

function hexToRgb(color: string): Rgb {
  const value = Number.parseInt(color.replace("#", ""), 16);

  return {
    b: value & 255,
    g: (value >> 8) & 255,
    r: (value >> 16) & 255,
  };
}

function rgbToHex(rgb: Rgb) {
  const toHex = (value: number) => Math.round(clamp(value, 0, 255)).toString(16).padStart(2, "0");

  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
}

function mixColor(from: string, to: string, amount: number) {
  const a = hexToRgb(from);
  const b = hexToRgb(to);

  return rgbToHex({
    b: a.b + (b.b - a.b) * amount,
    g: a.g + (b.g - a.g) * amount,
    r: a.r + (b.r - a.r) * amount,
  });
}

function rgba(color: string, alpha: number) {
  const rgb = hexToRgb(color);

  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

function currentPalette(time: number): ColorStop {
  const t = ((time % loopDuration) + loopDuration) % loopDuration;
  const index = colorTimeline.findIndex((stop, stopIndex) => {
    const next = colorTimeline[stopIndex + 1];

    return next && t >= stop.at && t < next.at;
  });
  const from = colorTimeline[Math.max(0, index)];
  const to = colorTimeline[Math.max(1, index + 1)];
  const local = clamp((t - from.at) / (to.at - from.at), 0, 1);
  const amount = local * local * (3 - 2 * local);

  return {
    accent: mixColor(from.accent, to.accent, amount),
    beam: mixColor(from.beam, to.beam, amount),
    core: mixColor(from.core, to.core, amount),
    glow: mixColor(from.glow, to.glow, amount),
    hot: mixColor(from.hot, to.hot, amount),
    soft: mixColor(from.soft, to.soft, amount),
  };
}

function getEnergyState(time: number): EnergyState {
  const palette = currentPalette(time);
  const flutter = Math.sin(time * 22.8) * 0.06 + Math.sin(time * 41.3) * 0.035;
  const pulse = 0.86 + Math.sin(time * 5.1) * 0.11 + Math.sin(time * 13.7) * 0.06 + flutter;

  return {
    ...palette,
    // 视频核心一直在原地附近高速抖动，不是固定点；这里用多频正弦模拟手里搓能量球的漂移。
    cx: 320 + Math.sin(time * 1.72) * 11 + Math.sin(time * 5.6) * 4 + Math.sin(time * 13.1) * 1.8,
    cy: 179 + Math.cos(time * 1.54) * 8 + Math.sin(time * 4.8) * 3 + Math.cos(time * 15.5) * 1.6,
    pulse: clamp(pulse, 0.72, 1.22),
    spin: time * 1.24 + Math.sin(time * 2.3) * 0.6,
  };
}

function drawSoftCircle(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string,
  alpha: number,
) {
  const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, rgba(color, alpha));
  gradient.addColorStop(0.42, rgba(color, alpha * 0.34));
  gradient.addColorStop(1, rgba(color, 0));

  context.fillStyle = gradient;
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.fill();
}

function withGlow(context: CanvasRenderingContext2D, color: string, blur: number, draw: () => void) {
  context.save();
  context.shadowColor = color;
  context.shadowBlur = blur;
  draw();
  context.restore();
}

function drawBackground(context: CanvasRenderingContext2D, time: number, state: EnergyState) {
  const base = context.createRadialGradient(318, 155, 0, 320, 190, 455);

  base.addColorStop(0, "#2d2d2d");
  base.addColorStop(0.48, "#202020");
  base.addColorStop(1, "#121212");
  context.fillStyle = base;
  context.fillRect(0, 0, stageWidth, stageHeight);

  drawSoftCircle(context, state.cx, state.cy, 148, state.glow, 0.14 * state.pulse);
  drawSoftCircle(context, state.cx - 6, state.cy + 18, 86, state.soft, 0.09);

  context.save();
  context.globalCompositeOperation = "screen";

  // 参考视频背景里有非常弱的方块纹理，靠近核心处才显现。
  for (let y = 102; y < 254; y += 6) {
    for (let x = 230; x < 414; x += 6) {
      const distance = Math.hypot(x - state.cx, y - state.cy);
      const alpha = clamp(1 - distance / 124, 0, 1) * (0.08 + Math.sin(x * 0.17 + y * 0.11 + time * 2.1) * 0.032);

      context.globalAlpha = alpha;
      context.fillStyle = state.glow;
      context.fillRect(x, y, 2.3, 2.3);
    }
  }

  context.restore();
}

function drawSparkLine(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  length: number,
  rotation: number,
  color: string,
  alpha: number,
  width = 1.8,
) {
  context.save();
  context.translate(x, y);
  context.rotate(rotation);
  context.globalCompositeOperation = "screen";
  context.strokeStyle = rgba(color, alpha);
  context.lineWidth = width;
  context.lineCap = "round";
  context.shadowColor = color;
  context.shadowBlur = 9;
  context.beginPath();
  context.moveTo(-length * 0.5, 0);
  context.lineTo(length * 0.5, 0);
  context.stroke();
  context.restore();
}

function drawConvergingBeams(context: CanvasRenderingContext2D, time: number, state: EnergyState) {
  for (let index = 0; index < 3; index += 1) {
    const cadence = 0.46 + index * 0.05;
    const age = fract(time / cadence + hash(index + 3) * 0.77);
    const flash = age < 0.18 ? Math.sin((age / 0.18) * Math.PI) : 0;

    if (flash <= 0.02) continue;

    const seed = Math.floor(time / cadence) * 37 + index * 91;
    const angle = state.spin * 0.18 + hash(seed + 1) * Math.PI * 2;
    const startDistance = 176 + hash(seed + 2) * 118;
    const endDistance = 10 + hash(seed + 3) * 14;
    const side = (hash(seed + 4) - 0.5) * 18;
    const color = index === 0 ? state.hot : index === 1 ? state.beam : state.soft;
    const sx = state.cx + Math.cos(angle) * startDistance - Math.sin(angle) * side;
    const sy = state.cy + Math.sin(angle) * startDistance * 0.8 + Math.cos(angle) * side;
    const ex = state.cx + Math.cos(angle) * endDistance;
    const ey = state.cy + Math.sin(angle) * endDistance * 0.8;

    context.save();
    context.globalCompositeOperation = "screen";

    const gradient = context.createLinearGradient(sx, sy, ex, ey);
    gradient.addColorStop(0, rgba(color, 0));
    gradient.addColorStop(0.58, rgba(color, flash * 0.34));
    gradient.addColorStop(0.86, rgba(color, flash * 0.82));
    gradient.addColorStop(1, rgba(state.hot, flash));

    context.shadowColor = color;
    context.shadowBlur = 12;
    context.strokeStyle = gradient;
    context.lineWidth = 0.7 + flash * 1.7;
    context.beginPath();
    context.moveTo(sx, sy);
    context.lineTo(ex, ey);
    context.stroke();

    drawSoftCircle(context, ex, ey, 18 + flash * 16, state.hot, flash * 0.22);
    context.restore();
  }
}

function getAbsorptionEnergy(time: number) {
  let energy = 0;

  for (let index = 0; index < chargeParticleCount; index += 1) {
    const seed = index * 131.7;
    const life = 0.26 + hash(seed + 1) * 0.18;
    const local = fract(time / life + hash(seed + 2));
    const hit = Math.sin(clamp((local - 0.78) / 0.22, 0, 1) * Math.PI);

    energy += hit * hit * (0.72 + hash(seed + 6) * 0.62);
  }

  return clamp(energy / 1.55, 0, 1);
}

function drawChargeAura(context: CanvasRenderingContext2D, time: number, state: EnergyState, absorption: number) {
  context.save();
  context.translate(state.cx, state.cy);
  context.globalCompositeOperation = "screen";
  context.lineCap = "round";

  for (let index = 0; index < 2; index += 1) {
    const phase = fract(time * (3.2 + index * 0.44) + index * 0.32);
    const radius = 58 - phase * (28 + absorption * 18);
    const alpha = Math.sin(phase * Math.PI) * (0.08 - index * 0.018 + absorption * 0.18);

    context.save();
    context.rotate(state.spin * 0.22 + index * 0.9);
    context.strokeStyle = rgba(index === 1 ? state.hot : state.beam, alpha);
    context.lineWidth = 0.8 + (1 - phase) * 1 + absorption * 1.5;
    context.shadowColor = index === 1 ? state.hot : state.beam;
    context.shadowBlur = 10 + absorption * 14;
    context.beginPath();
    context.ellipse(0, 0, radius, radius * 0.48, 0, Math.PI * 0.12, Math.PI * 1.36);
    context.stroke();
    context.restore();
  }

  for (let index = 0; index < 4; index += 1) {
    const phase = time * 9.4 + index * 1.14;
    const length = 8 + Math.sin(phase * 1.4) * 4 + absorption * 7;
    const distance = 26 + Math.sin(phase) * 5;

    drawSparkLine(
      context,
      Math.cos(phase) * distance,
      Math.sin(phase * 1.17) * distance * 0.68,
      length,
      phase + Math.PI * 0.5,
      index % 2 === 0 ? state.hot : state.beam,
      0.14 + absorption * 0.18 + Math.max(0, Math.sin(phase * 2.3)) * 0.18,
      1,
    );
  }

  context.restore();
}

function drawParticleField(context: CanvasRenderingContext2D, time: number, state: EnergyState) {
  for (let index = 0; index < chargeParticleCount; index += 1) {
    const seed = index * 131.7;
    const life = 0.26 + hash(seed + 1) * 0.18;
    const local = fract(time / life + hash(seed + 2));
    const progress = easeIn(clamp(local, 0, 1));
    const angle = hash(seed + 3) * Math.PI * 2 + Math.sin(time * 0.28 + index) * 0.22;
    const startDistance = 156 + hash(seed + 4) * 112;
    const endDistance = 3 + hash(seed + 5) * 7;
    const distance = startDistance + (endDistance - startDistance) * progress;
    const orbit = state.spin * 0.12 + (1 - progress) * (0.18 + hash(seed + 6) * 0.36);
    const inwardAngle = angle + orbit + progress * 0.1;
    const x = state.cx + Math.cos(inwardAngle) * distance + Math.sin(time * 3.4 + index) * (1 - progress) * 4;
    const y = state.cy + Math.sin(inwardAngle) * distance * 0.78 + Math.cos(time * 2.8 + index) * (1 - progress) * 3;
    const fadeIn = clamp(local / 0.06, 0, 1);
    const fadeOut = 1 - easeIn(clamp((local - 0.82) / 0.18, 0, 1));
    const impact = Math.sin(clamp((local - 0.78) / 0.22, 0, 1) * Math.PI);
    const fade = fadeIn * fadeOut;
    const alpha = clamp(fade, 0, 1) * (0.22 + hash(seed + 6) * 0.42);
    const colorRoll = hash(seed + 7);
    const color = colorRoll > 0.76 ? state.hot : colorRoll > 0.5 ? state.soft : colorRoll > 0.22 ? state.beam : state.accent;
    const rotation = inwardAngle + Math.PI * 0.5 + time * (0.45 + hash(seed + 9) * 1.5);

    if (alpha <= 0.02) continue;

    const trailLength = 22 + hash(seed + 18) * 42;
    drawSparkLine(context, x, y, trailLength * (0.55 + progress * 0.45), inwardAngle + Math.PI * 0.5, color, alpha * 0.5, 0.9);
    drawSoftCircle(context, x, y, 5 + hash(seed + 12) * 8, color, alpha * 0.32);
    drawSparkLine(context, x, y, 7 + hash(seed + 15) * 18, rotation, color, alpha * 0.7, 0.9 + alpha * 0.7);

    if (impact > 0.08) {
      const hitX = state.cx + Math.cos(inwardAngle) * (6 + hash(seed + 16) * 5);
      const hitY = state.cy + Math.sin(inwardAngle) * (5 + hash(seed + 17) * 5);

      drawSoftCircle(context, hitX, hitY, 24 + impact * 34, state.hot, impact * alpha * 0.58);
      drawSparkLine(context, hitX, hitY, 18 + impact * 26, inwardAngle + Math.PI * 0.5, state.hot, impact * alpha * 1.2, 1.3 + impact * 1.7);
    }
  }
}

function drawCoreShard(
  context: CanvasRenderingContext2D,
  radius: number,
  rotation: number,
  color: string,
  alpha: number,
  jag: number,
) {
  context.save();
  context.rotate(rotation);
  context.globalCompositeOperation = "screen";

  withGlow(context, color, 17, () => {
    context.fillStyle = rgba(color, alpha);
    context.beginPath();

    const points = 11;
    for (let index = 0; index < points; index += 1) {
      const angle = (index / points) * Math.PI * 2;
      const spike = index % 2 === 0 ? 1.05 + Math.sin(jag + index * 1.9) * 0.28 : 0.45 + Math.cos(jag + index * 1.3) * 0.18;
      const x = Math.cos(angle) * radius * spike;
      const y = Math.sin(angle) * radius * spike * (0.82 + Math.sin(jag * 0.7) * 0.08);

      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    }

    context.closePath();
    context.fill();
  });

  context.restore();
}

function drawEnergyCore(context: CanvasRenderingContext2D, time: number, state: EnergyState, absorption: number) {
  const flash = Math.max(0, Math.sin(time * 9.4)) ** 10;
  const flicker = 0.92 + Math.sin(time * 32) * 0.08 + Math.sin(time * 71) * 0.045 + flash * 0.16 + absorption * 0.34;
  const radius = 23 * state.pulse * flicker;

  drawSoftCircle(context, state.cx, state.cy, 72 * state.pulse, state.beam, 0.14 + absorption * 0.18);
  drawSoftCircle(context, state.cx, state.cy, 46 * state.pulse, state.hot, 0.32 + flash * 0.2 + absorption * 0.44);

  context.save();
  context.translate(state.cx, state.cy);
  context.scale(1 + Math.sin(time * 18.2) * 0.035, 1 + Math.cos(time * 17.1) * 0.045);

  drawCoreShard(context, radius * 1.18, state.spin, state.core, 0.78, time * 7.4);
  drawCoreShard(context, radius * 0.92, -state.spin * 1.36, state.hot, 0.82, time * 9.8 + 2);
  drawCoreShard(context, radius * 0.72, state.spin * 1.9, state.soft, 0.48, time * 8.3 + 5);

  context.globalCompositeOperation = "screen";
  context.strokeStyle = rgba(state.hot, 0.86);
  context.lineWidth = 2.4;
  context.lineCap = "round";
  context.lineJoin = "round";
  context.shadowColor = state.hot;
  context.shadowBlur = 18;
  context.rotate(state.spin * 0.35);
  context.beginPath();
  context.moveTo(-radius * 0.7, radius * 0.08);
  context.lineTo(-radius * 0.14, -radius * 0.56);
  context.lineTo(radius * 0.52, -radius * 0.18);
  context.moveTo(-radius * 0.35, radius * 0.44);
  context.lineTo(radius * 0.34, radius * 0.12);
  context.stroke();

  const gradient = context.createRadialGradient(0, 0, 0, 0, 0, radius * 0.78);
  gradient.addColorStop(0, rgba("#ffffff", 0.98));
  gradient.addColorStop(0.48, rgba(state.hot, 0.7));
  gradient.addColorStop(1, rgba(state.hot, 0));
  context.fillStyle = gradient;
  context.beginPath();
  context.arc(0, 0, radius * 0.78, 0, Math.PI * 2);
  context.fill();

  context.strokeStyle = rgba(state.hot, 0.34 + flash * 0.38 + absorption * 0.56);
  context.lineWidth = 1.1 + flash * 1.1 + absorption * 2.4;
  context.shadowColor = state.hot;
  context.shadowBlur = 18 + flash * 14 + absorption * 26;
  for (let index = 0; index < 4; index += 1) {
    const angle = state.spin * 0.6 + index * (Math.PI / 2) + Math.sin(time * 11 + index) * 0.08;

    context.save();
    context.rotate(angle);
    context.beginPath();
    context.moveTo(-radius * (1.08 + flash * 0.35 + absorption * 0.72), 0);
    context.lineTo(radius * (1.08 + flash * 0.35 + absorption * 0.72), 0);
    context.stroke();
    context.restore();
  }

  if (absorption > 0.06) {
    context.strokeStyle = rgba("#ffffff", absorption * 0.72);
    context.lineWidth = 1.2 + absorption * 2;
    context.shadowColor = state.hot;
    context.shadowBlur = 24 + absorption * 18;
    context.beginPath();
    context.arc(0, 0, radius * (0.88 + absorption * 0.5), 0, Math.PI * 2);
    context.stroke();
  }

  for (let index = 0; index < 6; index += 1) {
    const phase = time * (9 + index * 1.7) + index * 2.1;
    const sparkAlpha = 0.28 + Math.sin(phase * 1.8) * 0.22;

    drawSparkLine(
      context,
      Math.cos(phase) * radius * 0.42,
      Math.sin(phase * 1.2) * radius * 0.34,
      radius * (0.7 + Math.sin(phase) * 0.2),
      phase,
      index % 2 === 0 ? state.hot : state.beam,
      clamp(sparkAlpha, 0.08, 0.52),
      1.2,
    );
  }

  context.restore();
}

function drawFrame(context: CanvasRenderingContext2D, time: number, variant: ChargingSparksProps["variant"]) {
  const state = getEnergyState(time);
  const absorption = getAbsorptionEnergy(time);
  const scale = variant === "preview" ? 0.98 : 0.84;

  context.save();
  context.clearRect(0, 0, stageWidth, stageHeight);
  drawBackground(context, time, state);

  context.translate(stageWidth / 2, stageHeight / 2);
  context.scale(scale, scale);
  context.translate(-stageWidth / 2, -stageHeight / 2);

  drawConvergingBeams(context, time, state);
  drawChargeAura(context, time, state, absorption);
  drawParticleField(context, time, state);
  drawEnergyCore(context, time, state, absorption);
  context.restore();
}

export function ChargingSparks({ variant = "detail" }: ChargingSparksProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rootStyle = useMemo(
    () =>
      ({
        "--charging-sparks-min-height": variant === "preview" ? "100%" : "42rem",
      }) as CSSProperties,
    [variant],
  );

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) return undefined;

    const context = canvas.getContext("2d", { alpha: true });

    if (!context) return undefined;

    let frameId = 0;
    let disposed = false;
    let viewport = { scale: 1, x: 0, y: 0 };
    const startedAt = performance.now();

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(1, Math.floor(rect.width * dpr));
      const height = Math.max(1, Math.floor(rect.height * dpr));
      const scale = Math.min(width / stageWidth, height / stageHeight);

      canvas.width = width;
      canvas.height = height;
      viewport = {
        scale,
        x: (width - stageWidth * scale) / 2,
        y: (height - stageHeight * scale) / 2,
      };
    };

    const render = () => {
      if (disposed) return;

      const elapsed = ((performance.now() - startedAt) / 1000) % loopDuration;

      context.setTransform(1, 0, 0, 1, 0, 0);
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.setTransform(viewport.scale, 0, 0, viewport.scale, viewport.x, viewport.y);
      drawFrame(context, elapsed, variant);
      frameId = requestAnimationFrame(render);
    };

    resize();
    window.addEventListener("resize", resize);
    render();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", resize);
    };
  }, [variant]);

  return (
    <section
      className={`${styles.root} ${variant === "preview" ? styles.preview : ""}`}
      data-effect="charging-sparks"
      style={rootStyle}
    >
      <canvas className={styles.canvas} ref={canvasRef} />
      <div className={styles.vignette} />
      <div className={styles.grain} />
    </section>
  );
}
