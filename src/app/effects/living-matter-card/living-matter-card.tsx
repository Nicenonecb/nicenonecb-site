"use client";

import type { CSSProperties, ChangeEvent, PointerEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styles from "./living-matter-card.module.css";

type LivingMatterCardProps = {
  variant?: "detail" | "preview";
};

type HotId = "input" | "button" | null;

type TextureState = {
  focused: boolean;
  hovered: HotId;
  text: string;
};

type PointerState = {
  initialized: boolean;
  targetX: number;
  targetY: number;
  x: number;
  y: number;
};

type UiMetrics = {
  button: DOMRectReadOnly;
  input: DOMRectReadOnly;
};

const pageTextureSize = { height: 900, width: 1400 };
const offscreenPointer = -1_000_000;

const vertexShaderSource = `#version 300 es
in vec2 a_position;

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const fragmentShaderSource = `#version 300 es
precision highp float;

uniform vec2 iResolution;
uniform float iTime;
uniform vec2 iPointer;
uniform sampler2D uPageTexture;

out vec4 fragColor;

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash12(i);
  float b = hash12(i + vec2(1.0, 0.0));
  float c = hash12(i + vec2(0.0, 1.0));
  float d = hash12(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

float metaball(vec2 p, float time, vec2 face, float pull) {
  vec2 side = vec2(-face.y, face.x);
  vec2 c1 = vec2(0.0, 0.03) + 0.10 * vec2(sin(time * 0.82), cos(time * 0.67));
  vec2 c2 = -face * (0.16 + 0.12 * pull) + side * 0.06 + 0.08 * vec2(cos(time * 0.61), sin(time * 0.74));
  vec2 c3 = face * (0.19 + 0.18 * pull) - side * 0.04 + 0.07 * vec2(sin(time * 0.91 + 1.8), cos(time * 0.56));
  vec2 c4 = side * (0.18 + 0.06 * pull) + 0.06 * vec2(cos(time * 0.77 + 0.9), sin(time * 0.86));
  vec2 c5 = face * (0.31 + 0.16 * pull) + side * sin(time * 1.2) * 0.06;
  float v = 0.0;
  v += 0.085 / max(dot(p - c1, p - c1), 0.006);
  v += 0.062 / max(dot(p - c2, p - c2), 0.006);
  v += (0.056 + pull * 0.032) / max(dot(p - c3, p - c3), 0.006);
  v += 0.035 / max(dot(p - c4, p - c4), 0.006);
  v += pull * 0.026 / max(dot(p - c5, p - c5), 0.006);
  return v;
}

float matterField(vec2 p, float time, vec2 face, float pull) {
  vec2 side = vec2(-face.y, face.x);
  vec2 local = vec2(dot(p, face), dot(p, side));
  local.x /= 1.0 + pull * 0.28;
  local.y /= 1.0 - pull * 0.08;
  vec2 shaped = face * local.x + side * local.y;
  return metaball(shaped, time, face, pull);
}

float pulse01(float edge0, float edge1, float edge2, float edge3, float x) {
  return smoothstep(edge0, edge1, x) * (1.0 - smoothstep(edge2, edge3, x));
}

void main() {
  vec2 fragCoord = gl_FragCoord.xy;
  vec2 uv = fragCoord / iResolution;
  vec2 p = (uv * 2.0 - 1.0) * vec2(iResolution.x / iResolution.y, 1.0);
  vec2 pointer = iPointer / iResolution;
  float hasPointer = step(-1000.0, iPointer.x);
  vec2 pointerP = (pointer * 2.0 - 1.0) * vec2(iResolution.x / iResolution.y, 1.0);
  float t = mod(iTime, 12.0);
  float intro = smoothstep(0.18, 1.65, t);
  float melt = pulse01(7.05, 8.1, 10.05, 11.25, t);
  float reset = smoothstep(10.55, 11.9, t);
  float travel = smoothstep(7.1, 10.15, t);

  vec2 autoCenter = vec2(0.42 * sin(iTime * 0.41), 0.2 * cos(iTime * 0.33));
  vec2 lensCenter = mix(autoCenter, pointerP, hasPointer * 0.62);
  vec2 sweepCenter = vec2(mix(-1.45 * iResolution.x / iResolution.y, 1.45 * iResolution.x / iResolution.y, travel), 0.12 * sin(iTime * 0.8));
  vec2 membraneCenter = mix(lensCenter, sweepCenter, melt);
  vec2 autoFace = normalize(vec2(sin(iTime * 0.73), cos(iTime * 0.57 + 0.4)));
  vec2 targetFace = normalize(membraneCenter - p + vec2(0.0001));
  vec2 face = normalize(mix(autoFace, targetFace, 0.48 + melt * 0.34));
  float pull = 0.28 + hasPointer * 0.28 + melt * 0.92;
  vec2 fieldP = (p - membraneCenter) * mix(2.9, 0.72, melt);

  float field = matterField(fieldP, iTime, face, pull);
  float organic = noise(fieldP * 1.65 + face * iTime * 0.1) * 0.24 + noise(fieldP * 3.7 - iTime * 0.13) * 0.08;
  float body = smoothstep(0.9, 1.18, field + organic + melt * 0.95);
  float rim = smoothstep(0.74, 1.08, field + organic) - smoothstep(1.1, 1.42, field + organic);
  float directionalRim = rim * smoothstep(-0.35, 0.92, dot(normalize(fieldP + vec2(0.0001)), face));

  vec2 grad = vec2(
    matterField(fieldP + vec2(0.008, 0.0), iTime, face, pull) - matterField(fieldP - vec2(0.008, 0.0), iTime, face, pull),
    matterField(fieldP + vec2(0.0, 0.008), iTime, face, pull) - matterField(fieldP - vec2(0.0, 0.008), iTime, face, pull)
  );
  vec2 refractVec = normalize(grad + vec2(0.0001)) * (0.008 + body * 0.022 + melt * 0.045);

  vec2 pageUv = uv + refractVec * (body * 0.7 + melt * 1.28);
  pageUv += vec2(
    sin(uv.y * 16.0 + iTime * 1.2),
    cos(uv.x * 11.0 - iTime * 0.7)
  ) * melt * 0.005;
  pageUv.y += 0.012 * sin(iTime * 0.37 + uv.x * 5.0) * body;
  vec4 basePage = texture(uPageTexture, vec2(uv.x, 1.0 - uv.y));
  vec4 warpedPage = texture(uPageTexture, vec2(pageUv.x, 1.0 - pageUv.y));
  vec4 page = mix(basePage, warpedPage, 0.42 + melt * 0.24 + body * 0.12);

  vec3 black = vec3(0.015, 0.022, 0.019);
  float vignette = smoothstep(0.45, 1.65, length(p * vec2(0.76, 1.0)));
  vec3 color = mix(vec3(0.034, 0.052, 0.046), black, vignette * 0.55);

  float mist = noise(uv * vec2(3.0, 2.2) + iTime * 0.06);
  float introVeil = (1.0 - intro) * (0.55 + mist * 0.3);
  float meltVeil = melt * smoothstep(0.26, 1.05, body + rim * 1.6);
  float shelf = exp(-pow((uv.y - 0.235) * 14.0, 2.0)) * smoothstep(0.18, 0.72, uv.x) * smoothstep(0.92, 0.55, uv.x);
  color += vec3(0.38, 0.98, 0.76) * shelf * (0.18 + melt * 0.32);
  color = mix(color, page.rgb, page.a * intro);
  color = mix(color, vec3(0.82, 0.95, 0.88), introVeil * 0.42);

  vec3 matter = vec3(0.28, 0.78, 0.68) * body * (0.24 + organic * 0.18);
  matter += vec3(0.70, 1.0, 0.88) * rim * (0.3 + melt * 0.9);
  matter += vec3(0.80, 1.0, 0.91) * directionalRim * pull * 0.95;
  matter += vec3(0.07, 0.24, 0.22) * body * 0.32;
  color += matter * (0.2 + melt * 0.86 + hasPointer * 0.18);
  color = mix(color, color * vec3(0.72, 0.88, 0.82) + matter * 0.68, meltVeil * 0.28);

  float pointerGlow = exp(-dot((uv - pointer) * vec2(iResolution.x / iResolution.y, 1.0), (uv - pointer) * vec2(iResolution.x / iResolution.y, 1.0)) * 8.0);
  color += vec3(0.48, 1.0, 0.82) * pointerGlow * hasPointer * (0.05 + melt * 0.06);
  /* melt 结束后渐变回可读页面，不再暗黑重置 */
  color = mix(color, page.rgb, reset * 0.48);

  float grain = hash12(fragCoord + iTime * 35.0) - 0.5;
  color += grain * 0.045;
  color *= 1.0 - vignette * 0.06;

  fragColor = vec4(color, 1.0);
}
`;

function getDpr() {
  return Math.min(window.devicePixelRatio || 1, 2);
}

function ease(current: number, target: number, deltaSeconds: number, tau: number) {
  return current + (target - current) * (1 - Math.exp(-deltaSeconds / tau));
}

function createShader(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);

  if (!shader) {
    throw new Error("Unable to create shader");
  }

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader) ?? "Unknown shader compile error";

    gl.deleteShader(shader);
    throw new Error(message);
  }

  return shader;
}

function createProgram(gl: WebGL2RenderingContext) {
  const program = gl.createProgram();

  if (!program) {
    throw new Error("Unable to create WebGL program");
  }

  const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const message = gl.getProgramInfoLog(program) ?? "Unknown WebGL link error";

    gl.deleteProgram(program);
    throw new Error(message);
  }

  return program;
}

function createTexture(gl: WebGL2RenderingContext, unit: number) {
  const texture = gl.createTexture();

  if (!texture) {
    throw new Error("Unable to create texture");
  }

  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

  return texture;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
}

function drawTrackedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  tracking: number,
) {
  let cursor = x;

  for (const char of text) {
    ctx.fillText(char, cursor, y);
    cursor += ctx.measureText(char).width + tracking;
  }
}

function drawPageTexture(canvas: HTMLCanvasElement, state: TextureState) {
  if (canvas.width === 0 || canvas.height === 0) {
    canvas.width = pageTextureSize.width;
    canvas.height = pageTextureSize.height;
  }

  const ctx = canvas.getContext("2d");

  if (!ctx) {
    return;
  }

  const { height, width } = canvas;
  const compact = width < 900;
  const marginX = compact ? width * 0.1 : width * 0.105;
  const topY = compact ? height * 0.11 : height * 0.116;
  const titleSize = Math.min(compact ? width * 0.07 : width * 0.059, compact ? 48 : 88);
  const bodySize = Math.max(17, Math.min(compact ? width * 0.037 : width * 0.018, compact ? 23 : 28));
  const inputX = marginX;
  const inputY = compact ? height * 0.68 : height * 0.69;
  const inputWidth = compact ? width * 0.5 : width * 0.34;
  const inputHeight = compact ? height * 0.088 : height * 0.087;
  const buttonX = inputX + inputWidth + (compact ? width * 0.025 : width * 0.014);
  const buttonWidth = compact ? width * 0.27 : width * 0.16;

  ctx.clearRect(0, 0, width, height);

  const bg = ctx.createRadialGradient(width * 0.58, height * 0.34, 0, width * 0.58, height * 0.34, width * 0.86);
  bg.addColorStop(0, "rgba(57, 82, 72, 0.98)");
  bg.addColorStop(0.42, "rgba(21, 34, 31, 0.98)");
  bg.addColorStop(1, "rgba(5, 9, 9, 1)");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "rgba(215, 255, 237, 0.055)";
  ctx.lineWidth = 1;
  for (let x = 0; x < width; x += Math.max(36, width * 0.045)) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y < height; y += Math.max(36, height * 0.07)) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  ctx.globalCompositeOperation = "screen";
  const bloom = ctx.createRadialGradient(width * 0.72, height * 0.42, 0, width * 0.72, height * 0.42, width * 0.42);
  bloom.addColorStop(0, "rgba(147, 255, 217, 0.22)");
  bloom.addColorStop(0.42, "rgba(147, 255, 217, 0.07)");
  bloom.addColorStop(1, "rgba(147, 255, 217, 0)");
  ctx.fillStyle = bloom;
  ctx.fillRect(0, 0, width, height);

  const shelf = ctx.createLinearGradient(marginX, inputY - inputHeight * 0.72, width - marginX, inputY - inputHeight * 0.72);
  shelf.addColorStop(0, "rgba(93, 252, 202, 0)");
  shelf.addColorStop(0.5, "rgba(221, 255, 229, 0.72)");
  shelf.addColorStop(1, "rgba(93, 252, 202, 0)");
  ctx.fillStyle = shelf;
  ctx.fillRect(marginX, inputY - inputHeight * 0.72, width - marginX * 2, Math.max(9, height * 0.018));
  ctx.globalCompositeOperation = "source-over";

  ctx.fillStyle = "rgba(2, 7, 7, 0.42)";
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "rgba(232, 255, 242, 0.72)";
  ctx.font = `700 ${Math.max(12, Math.min(width * 0.014, 19))}px ui-monospace, SFMono-Regular, Menlo, monospace`;
  drawTrackedText(ctx, "METABALL OS", marginX, topY, compact ? 2.4 : 3.8);
  ctx.fillStyle = "rgba(232, 255, 242, 0.48)";
  drawTrackedText(
    ctx,
    compact ? "LIVE MATTER" : "LIVING INTERFACE ENGINE",
    compact ? width * 0.58 : width * 0.645,
    topY,
    compact ? 2.2 : 3.6,
  );

  ctx.fillStyle = "rgba(249, 255, 250, 0.96)";
  ctx.font = `800 ${titleSize}px system-ui, sans-serif`;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  if (compact) {
    ctx.fillText("Interfaces", marginX, height * 0.22);
    ctx.fillText("grown from", marginX, height * 0.31);
    ctx.fillText("living light.", marginX, height * 0.4);
  } else {
    ctx.fillText("Interfaces grown", marginX, height * 0.29);
    ctx.fillText("from living light.", marginX, height * 0.405);
  }

  ctx.font = `500 ${bodySize}px system-ui, sans-serif`;
  ctx.fillStyle = "rgba(237, 255, 245, 0.63)";
  ctx.fillText(
    compact ? "A responsive control surface" : "A responsive control surface rendered into one texture,",
    marginX,
    height * (compact ? 0.5 : 0.49),
  );
  ctx.fillText(
    compact ? "refracted through a soft field." : "then refracted through a soft computational field.",
    marginX,
    height * (compact ? 0.55 : 0.535),
  );

  if (!compact) {
    const panelX = width * 0.64;
    const panelY = height * 0.21;
    const panelW = width * 0.245;
    const panelH = height * 0.36;

    roundRect(ctx, panelX, panelY, panelW, panelH, 18);
    ctx.fillStyle = "rgba(235, 255, 244, 0.075)";
    ctx.fill();
    ctx.strokeStyle = "rgba(225, 255, 239, 0.19)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = "rgba(237, 255, 245, 0.62)";
    ctx.font = `700 ${width * 0.012}px ui-monospace, SFMono-Regular, Menlo, monospace`;
    drawTrackedText(ctx, "FIELD STATUS", panelX + panelW * 0.1, panelY + panelH * 0.16, 2);

    const rings = [
      [0.34, 0.42, "BEND"],
      [0.62, 0.55, "REFRACT"],
      [0.47, 0.74, "SYNC"],
    ] as const;

    rings.forEach(([cx, cy, label], index) => {
      const radius = panelW * (0.09 + index * 0.018);
      ctx.beginPath();
      ctx.arc(panelX + panelW * cx, panelY + panelH * cy, radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${index === 1 ? "251, 255, 219" : "155, 245, 209"}, ${0.34 + index * 0.12})`;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.fillStyle = "rgba(239, 255, 246, 0.62)";
      ctx.font = `700 ${width * 0.009}px ui-monospace, SFMono-Regular, Menlo, monospace`;
      ctx.fillText(label, panelX + panelW * cx - radius * 1.1, panelY + panelH * cy + radius * 1.85);
    });

    roundRect(ctx, panelX + panelW * 0.1, panelY + panelH * 0.76, panelW * 0.8, panelH * 0.12, 999);
    ctx.fillStyle = "rgba(8, 18, 16, 0.72)";
    ctx.fill();
    const progress = ctx.createLinearGradient(panelX, 0, panelX + panelW, 0);
    progress.addColorStop(0, "rgba(155, 245, 209, 0.82)");
    progress.addColorStop(1, "rgba(251, 255, 219, 0.9)");
    roundRect(ctx, panelX + panelW * 0.1, panelY + panelH * 0.76, panelW * 0.58, panelH * 0.12, 999);
    ctx.fillStyle = progress;
    ctx.fill();
  }

  const activeInput = state.focused || state.hovered === "input";
  const activeButton = state.hovered === "button";

  roundRect(ctx, inputX, inputY, inputWidth, inputHeight, inputHeight / 2);
  ctx.fillStyle = activeInput ? "rgba(232, 255, 241, 0.18)" : "rgba(232, 255, 241, 0.1)";
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = activeInput ? "rgba(214, 255, 229, 0.72)" : "rgba(230, 255, 240, 0.28)";
  ctx.stroke();

  ctx.fillStyle = state.text ? "rgba(248, 255, 245, 0.95)" : "rgba(248, 255, 245, 0.46)";
  ctx.font = `500 ${Math.max(16, Math.min(inputHeight * 0.36, 28))}px system-ui, sans-serif`;
  ctx.fillText(state.text || "describe the next surface", inputX + inputHeight * 0.43, inputY + inputHeight * 0.63);

  roundRect(ctx, buttonX, inputY, buttonWidth, inputHeight, inputHeight / 2);
  ctx.fillStyle = activeButton ? "rgba(251, 255, 219, 0.95)" : "rgba(7, 13, 11, 0.78)";
  ctx.fill();
  ctx.strokeStyle = activeButton ? "rgba(251, 255, 219, 0.98)" : "rgba(236, 255, 224, 0.32)";
  ctx.stroke();
  ctx.fillStyle = activeButton ? "rgba(4, 8, 6, 0.96)" : "rgba(249, 255, 227, 0.88)";
  ctx.font = `800 ${Math.max(12, Math.min(inputHeight * 0.28, 22))}px ui-monospace, SFMono-Regular, Menlo, monospace`;
  drawTrackedText(ctx, compact ? "MELT" : "MELT VIEW", buttonX + inputHeight * 0.42, inputY + inputHeight * 0.61, compact ? 1.2 : 2.2);

  const stats = [
    ["84", "FIELD NODES"],
    ["12", "PASS COUNT"],
    ["LIVE", "CANVAS UI"],
  ];

  stats.forEach(([value, label], index) => {
    const x = compact ? marginX + index * width * 0.29 : marginX + index * width * 0.214;
    ctx.fillStyle = "rgba(248, 255, 245, 0.92)";
    ctx.font = `800 ${Math.max(22, Math.min(compact ? width * 0.07 : width * 0.03, 44))}px system-ui, sans-serif`;
    ctx.fillText(value, x, height * (compact ? 0.875 : 0.891));
    ctx.fillStyle = "rgba(223, 255, 237, 0.5)";
    ctx.font = `700 ${Math.max(9, Math.min(compact ? width * 0.02 : width * 0.011, 15))}px ui-monospace, SFMono-Regular, Menlo, monospace`;
    drawTrackedText(ctx, label, x, height * (compact ? 0.93 : 0.929), compact ? 1 : 2);
  });
}

function rectFromBox(x: number, y: number, width: number, height: number) {
  return {
    bottom: y + height,
    height,
    left: x,
    right: x + width,
    top: y,
    width,
    x,
    y,
    toJSON: () => ({}),
  } as DOMRectReadOnly;
}

export function LivingMatterCard({ variant = "detail" }: LivingMatterCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pageCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const shellRef = useRef<HTMLElement>(null);
  const textureStateRef = useRef<TextureState>({ focused: false, hovered: null, text: "" });
  const metricsRef = useRef<UiMetrics | null>(null);
  const elapsedRef = useRef(0);
  const textureDirtyRef = useRef(true);
  const timelineJumpRef = useRef<number | null>(null);
  const lastTriggerRef = useRef(0);
  const pointerRef = useRef<PointerState>({
    initialized: false,
    targetX: offscreenPointer,
    targetY: offscreenPointer,
    x: offscreenPointer,
    y: offscreenPointer,
  });
  const [text, setText] = useState("");
  const [cursorStyle, setCursorStyle] = useState<CSSProperties>({
    "--living-matter-cursor-opacity": 0,
  } as CSSProperties);
  const [inputStyle, setInputStyle] = useState<CSSProperties>({});

  const shellStyle = useMemo(
    () =>
      ({
        "--living-matter-min-height": variant === "preview" ? "100%" : "43rem",
      }) as CSSProperties,
    [variant],
  );

  const updateMetrics = useCallback(() => {
    const shell = shellRef.current;

    if (!shell) {
      return;
    }

    const rect = shell.getBoundingClientRect();
    const compact = rect.width < 620;
    const contentWidth = compact ? rect.width * 0.5 : rect.width * 0.34;
    const contentHeight = compact ? rect.height * 0.088 : rect.height * 0.087;
    const inputLeft = compact ? rect.width * 0.1 : rect.width * 0.105;
    const inputTop = compact ? rect.height * 0.68 : rect.height * 0.69;
    const buttonLeft = inputLeft + contentWidth + (compact ? rect.width * 0.025 : rect.width * 0.014);
    const buttonWidth = compact ? rect.width * 0.27 : rect.width * 0.16;

    metricsRef.current = {
      button: rectFromBox(buttonLeft, inputTop, buttonWidth, contentHeight),
      input: rectFromBox(inputLeft, inputTop, contentWidth, contentHeight),
    };

    setInputStyle({
      "--living-matter-input-height": `${contentHeight}px`,
      "--living-matter-input-width": `${contentWidth}px`,
      "--living-matter-input-x": `${inputLeft + contentWidth / 2}px`,
      "--living-matter-input-y": `${inputTop + contentHeight / 2}px`,
    } as CSSProperties);
  }, []);

  const setHovered = useCallback((hovered: HotId) => {
    if (textureStateRef.current.hovered === hovered) {
      return;
    }

    textureStateRef.current.hovered = hovered;
    textureDirtyRef.current = true;
  }, []);

  const updatePointer = useCallback(
    (clientX: number, clientY: number) => {
      const shell = shellRef.current;

      if (!shell) {
        return;
      }

      const rect = shell.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      const dpr = getDpr();
      const pointer = pointerRef.current;
      const metrics = metricsRef.current;
      const hovered =
        metrics && x >= metrics.button.left && x <= metrics.button.right && y >= metrics.button.top && y <= metrics.button.bottom
          ? "button"
          : metrics && x >= metrics.input.left && x <= metrics.input.right && y >= metrics.input.top && y <= metrics.input.bottom
            ? "input"
            : null;

      pointer.targetX = x * dpr;
      pointer.targetY = (rect.height - y) * dpr;

      if (!pointer.initialized) {
        pointer.x = pointer.targetX;
        pointer.y = pointer.targetY;
        pointer.initialized = true;
      }

      setHovered(hovered);
      setCursorStyle({
        "--living-matter-cursor-opacity": 1,
        "--living-matter-cursor-x": `${x}px`,
        "--living-matter-cursor-y": `${y}px`,
      } as CSSProperties);
    },
    [setHovered],
  );

  const hidePointer = useCallback(() => {
    const pointer = pointerRef.current;

    pointer.targetX = offscreenPointer;
    pointer.targetY = offscreenPointer;
    pointer.initialized = false;
    setHovered(null);
    setCursorStyle({
      "--living-matter-cursor-opacity": 0,
    } as CSSProperties);
  }, [setHovered]);

  const handlePointerMove = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      updatePointer(event.clientX, event.clientY);
    },
    [updatePointer],
  );

  /* 统一的 melt 触发：点击或键盘 Space/Enter，带 1.2s 冷却防连点 */
  const triggerMelt = useCallback(() => {
    const now = performance.now();

    if (now - lastTriggerRef.current < 1200) {
      return;
    }

    lastTriggerRef.current = now;
    timelineJumpRef.current = 7.08;
  }, []);

  const handlePointerDown = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      event.currentTarget.setPointerCapture(event.pointerId);
      updatePointer(event.clientX, event.clientY);

      if (textureStateRef.current.hovered === "input") {
        inputRef.current?.focus();
        return;
      }

      triggerMelt();
    },
    [updatePointer, triggerMelt],
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLElement>) => {
      if (event.key === " " || event.key === "Enter") {
        event.preventDefault();
        triggerMelt();
      }
    },
    [triggerMelt],
  );

  const handleInputChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const nextText = event.target.value.slice(0, 32);

    textureStateRef.current.text = nextText;
    textureDirtyRef.current = true;
    setText(nextText);
  }, []);

  const handleInputFocus = useCallback(() => {
    textureStateRef.current.focused = true;
    textureDirtyRef.current = true;
  }, []);

  const handleInputBlur = useCallback(() => {
    textureStateRef.current.focused = false;
    textureDirtyRef.current = true;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const shell = shellRef.current;

    if (!(canvas && shell)) {
      return;
    }

    const gl = canvas.getContext("webgl2", {
      alpha: false,
      antialias: true,
      preserveDrawingBuffer: true,
    });

    if (!gl) {
      return;
    }

    const program = createProgram(gl);
    const vertexArray = gl.createVertexArray();
    const buffer = gl.createBuffer();
    const pageCanvas = document.createElement("canvas");
    const pageTexture = createTexture(gl, 0);

    pageCanvasRef.current = pageCanvas;
    drawPageTexture(pageCanvas, textureStateRef.current);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, pageTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, pageCanvas);

    gl.useProgram(program);
    gl.bindVertexArray(vertexArray);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    const resolutionUniform = gl.getUniformLocation(program, "iResolution");
    const timeUniform = gl.getUniformLocation(program, "iTime");
    const pointerUniform = gl.getUniformLocation(program, "iPointer");
    const pageTextureUniform = gl.getUniformLocation(program, "uPageTexture");

    gl.uniform1i(pageTextureUniform, 0);

    let animationFrame = 0;
    let stopped = false;
    let startedAt = performance.now();
    let previousFrameAt = startedAt;

    const resizeCanvas = () => {
      const rect = shell.getBoundingClientRect();
      const dpr = getDpr();
      const nextWidth = Math.max(1, Math.floor(rect.width * dpr));
      const nextHeight = Math.max(1, Math.floor(rect.height * dpr));

      if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
        canvas.width = nextWidth;
        canvas.height = nextHeight;
      }

      const textureWidth = Math.max(560, Math.min(1800, nextWidth));
      const textureHeight = Math.max(560, Math.min(1300, nextHeight));

      if (pageCanvas.width !== textureWidth || pageCanvas.height !== textureHeight) {
        pageCanvas.width = textureWidth;
        pageCanvas.height = textureHeight;
        textureDirtyRef.current = true;
      }

      gl.viewport(0, 0, nextWidth, nextHeight);
      updateMetrics();
    };

    const resizeObserver = new ResizeObserver(resizeCanvas);
    resizeObserver.observe(shell);
    resizeCanvas();

    const render = () => {
      if (stopped) {
        return;
      }

      const now = performance.now();
      const deltaSeconds = Math.max(0.001, (now - previousFrameAt) / 1000);
      const pointer = pointerRef.current;

      previousFrameAt = now;

      if (timelineJumpRef.current !== null) {
        startedAt = now - timelineJumpRef.current * 1000;
        timelineJumpRef.current = null;
      }

      pointer.x = ease(pointer.x, pointer.targetX, deltaSeconds, 0.16);
      pointer.y = ease(pointer.y, pointer.targetY, deltaSeconds, 0.16);
      elapsedRef.current = (now - startedAt) / 1000;

      if (textureDirtyRef.current) {
        drawPageTexture(pageCanvas, textureStateRef.current);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, pageTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, pageCanvas);
        textureDirtyRef.current = false;
      }

      gl.uniform2f(resolutionUniform, canvas.width, canvas.height);
      gl.uniform1f(timeUniform, elapsedRef.current);
      gl.uniform2f(pointerUniform, pointer.x, pointer.y);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      animationFrame = requestAnimationFrame(render);
    };

    animationFrame = requestAnimationFrame(render);

    return () => {
      stopped = true;
      cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      gl.deleteBuffer(buffer);
      gl.deleteVertexArray(vertexArray);
      gl.deleteTexture(pageTexture);
      gl.deleteProgram(program);
    };
  }, [updateMetrics]);

  return (
    <section
      aria-label="Living matter html-in-canvas shader effect"
      className={styles.shell}
      data-effect="living-matter-card"
      data-variant={variant}
      onKeyDown={handleKeyDown}
      onPointerCancel={hidePointer}
      onPointerDown={handlePointerDown}
      onPointerLeave={hidePointer}
      onPointerMove={handlePointerMove}
      ref={shellRef}
      style={shellStyle}
      tabIndex={0}
    >
      <canvas aria-hidden="true" className={styles.canvas} ref={canvasRef} />
      <input
        aria-label="Living matter canvas text input"
        className={styles.inputProxy}
        onBlur={handleInputBlur}
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        ref={inputRef}
        style={inputStyle}
        value={text}
      />
      <span aria-hidden="true" className={styles.cursor} style={cursorStyle} />
    </section>
  );
}
