"use client";

import type { CSSProperties, PointerEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styles from "./hex-path-card.module.css";

type HexPathCardProps = {
  variant?: "detail" | "preview";
};

type ShaderState = {
  mouseInitialized: boolean;
  mouseTargetX: number;
  mouseTargetY: number;
  mouseX: number;
  mouseY: number;
};

const offscreenMouse = -1_000_000;

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
uniform vec2 iMouse;

out vec4 fragColor;

const float SQRT3 = 1.73205080757;

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

vec2 pixelToAxial(vec2 p, float size) {
  return vec2((2.0 / 3.0 * p.x) / size, (-p.x / 3.0 + SQRT3 / 3.0 * p.y) / size);
}

vec2 axialToPixel(vec2 h, float size) {
  return vec2(size * 1.5 * h.x, size * SQRT3 * (h.y + h.x * 0.5));
}

vec2 roundHex(vec2 h) {
  vec3 cube = vec3(h.x, -h.x - h.y, h.y);
  vec3 rounded = floor(cube + 0.5);
  vec3 diff = abs(rounded - cube);

  if (diff.x > diff.y && diff.x > diff.z) {
    rounded.x = -rounded.y - rounded.z;
  } else if (diff.y > diff.z) {
    rounded.y = -rounded.x - rounded.z;
  } else {
    rounded.z = -rounded.x - rounded.y;
  }

  return vec2(rounded.x, rounded.z);
}

float sdHex(vec2 p, float radius) {
  const vec3 k = vec3(-0.866025404, 0.5, 0.577350269);
  p = abs(p);
  p -= 2.0 * min(dot(k.xy, p), 0.0) * k.xy;
  p -= vec2(clamp(p.x, -k.z * radius, k.z * radius), radius);
  return length(p) * sign(p.y);
}

float clusterMask(vec2 id) {
  float left = (1.0 - smoothstep(0.58, 1.15, abs(id.x + 4.15))) *
    (1.0 - smoothstep(2.4, 3.6, abs(id.y - 0.15)));
  float center = 1.0 - smoothstep(1.35, 2.3, length((id - vec2(0.75, 0.2)) * vec2(0.92, 0.68)));
  float right = (1.0 - smoothstep(0.52, 1.05, abs(id.x - 4.55))) *
    (1.0 - smoothstep(2.25, 3.5, abs(id.y - 0.05)));
  float bridge = (1.0 - smoothstep(0.65, 1.2, abs(id.y + 0.2))) *
    (1.0 - smoothstep(1.05, 2.2, abs(id.x - 1.75)));
  float scattered = step(0.76, hash12(floor(id * 1.7) + 9.4));

  return clamp(max(max(left, center), max(right, bridge * 0.44)) + scattered * 0.08, 0.0, 1.0);
}

vec3 chromaFlow(vec2 p, vec2 mouse) {
  vec3 cyan = vec3(0.0, 0.765, 1.0);
  vec3 blue = vec3(0.145, 0.2, 1.0);
  vec3 lightBlue = vec3(0.49, 0.49, 0.98);
  vec3 purple = vec3(0.34, 0.04, 1.0);
  vec2 dir = normalize(p - mouse + vec2(0.0001));
  vec3 vertical = mix(blue, cyan, smoothstep(-0.45, 0.95, dir.y));
  vec3 horizontal = mix(purple, lightBlue, smoothstep(-0.9, 0.9, dir.x));

  return mix(vertical, horizontal, 0.42 + 0.18 * sin(iTime * 0.52 + p.x * 1.6));
}

void main() {
  vec2 fragCoord = gl_FragCoord.xy;
  vec2 res = iResolution;
  vec2 uv = (2.0 * fragCoord - res) / res.y;
  vec2 mouse = (2.0 * iMouse - res) / res.y;
  bool hasMouse = iMouse.x > -1000.0;

  vec2 gridUv = uv * 2.05 + vec2(0.0, 0.08);
  float hexSize = 0.56;
  vec2 id = roundHex(pixelToAxial(gridUv, hexSize));
  vec2 local = gridUv - axialToPixel(id, hexSize);
  float mask = clusterMask(id);

  float signedDistance = sdHex(local, hexSize * 0.86);
  float edgeDistance = abs(signedDistance);
  float aa = max(fwidth(edgeDistance), 0.001);
  float lineWidth = 0.006 + mask * 0.006;
  float line = (1.0 - smoothstep(lineWidth, lineWidth + aa * 2.0, edgeDistance)) * mask;

  float gridRipple = 0.5 + 0.5 * sin(length(local) * 9.0 - iTime * 1.35 + hash12(id) * 6.28318);
  float ambientLine = line * (0.16 + gridRipple * 0.13);

  float mouseDistance = hasMouse ? length(uv - mouse) : 12.0;
  float glow = exp(-mouseDistance * mouseDistance * 4.8);
  float tightGlow = exp(-mouseDistance * mouseDistance * 19.0);
  float ripple = hasMouse ? 0.5 + 0.5 * sin(mouseDistance * 22.0 - iTime * 5.2) : 0.0;
  float activeLine = line * glow * (2.45 + ripple * 0.8);

  float vignette = smoothstep(0.0, 1.45, length(uv * vec2(0.86, 1.08)));
  vec3 centerBlack = vec3(0.031, 0.031, 0.031);
  vec3 navyEdge = vec3(0.071, 0.071, 0.129);
  vec3 color = mix(centerBlack, navyEdge, vignette);
  color += vec3(0.02, 0.07, 0.18) * (0.12 + vignette * 0.28);

  vec3 lineColor = mix(vec3(0.02, 0.17, 0.41), vec3(0.36, 0.61, 0.96), ambientLine);
  vec3 hotColor = chromaFlow(uv, mouse);

  color += lineColor * ambientLine * 1.55;
  color += hotColor * activeLine * 1.4;
  color += hotColor * tightGlow * 0.18;
  color += vec3(0.0, 0.765, 1.0) * glow * 0.06;

  float bloom = smoothstep(0.0, 0.06, line) * mask;
  color += vec3(0.0, 0.35, 0.9) * bloom * 0.11;

  // 目标页有明显细颗粒感；这里用屏幕空间哈希模拟 film grain，并保持强度很低。
  float grain = hash12(fragCoord + iTime * 24.0) - 0.5;
  color += grain * 0.052;
  color *= 1.0 - smoothstep(1.0, 1.85, length(uv)) * 0.26;

  fragColor = vec4(color, 1.0);
}
`;

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

function getDpr() {
  return Math.min(window.devicePixelRatio || 1, 2);
}

function ease(current: number, target: number, deltaSeconds: number, tau: number) {
  return current + (target - current) * (1 - Math.exp(-deltaSeconds / tau));
}

export function HexPathCard({ variant = "detail" }: HexPathCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const shellRef = useRef<HTMLElement>(null);
  const [cursorStyle, setCursorStyle] = useState<CSSProperties>({
    "--hex-path-cursor-opacity": 0,
  } as CSSProperties);
  const stateRef = useRef<ShaderState>({
    mouseInitialized: false,
    mouseTargetX: offscreenMouse,
    mouseTargetY: offscreenMouse,
    mouseX: offscreenMouse,
    mouseY: offscreenMouse,
  });

  const shellStyle = useMemo(
    () =>
      ({
        "--hex-path-min-height": variant === "preview" ? "100%" : "42rem",
      }) as CSSProperties,
    [variant],
  );

  const updatePointer = useCallback((clientX: number, clientY: number) => {
    const shell = shellRef.current;

    if (!shell) {
      return;
    }

    const rect = shell.getBoundingClientRect();
    const dpr = getDpr();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const state = stateRef.current;

    state.mouseTargetX = x * dpr;
    state.mouseTargetY = (rect.height - y) * dpr;

    if (!state.mouseInitialized) {
      state.mouseX = state.mouseTargetX;
      state.mouseY = state.mouseTargetY;
      state.mouseInitialized = true;
    }

    setCursorStyle({
      "--hex-path-cursor-opacity": 1,
      "--hex-path-cursor-x": `${x}px`,
      "--hex-path-cursor-y": `${y}px`,
    } as CSSProperties);
  }, []);

  const hidePointer = useCallback(() => {
    const state = stateRef.current;

    state.mouseTargetX = offscreenMouse;
    state.mouseTargetY = offscreenMouse;
    state.mouseInitialized = false;
    setCursorStyle({
      "--hex-path-cursor-opacity": 0,
    } as CSSProperties);
  }, []);

  const handlePointerMove = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      updatePointer(event.clientX, event.clientY);
    },
    [updatePointer],
  );

  const handlePointerDown = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      event.currentTarget.setPointerCapture(event.pointerId);
      updatePointer(event.clientX, event.clientY);
    },
    [updatePointer],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    const shell = shellRef.current;

    if (!(canvas && shell)) {
      return;
    }

    const gl = canvas.getContext("webgl2", { alpha: false, antialias: true });

    if (!gl) {
      return;
    }

    const program = createProgram(gl);
    const vertexArray = gl.createVertexArray();
    const buffer = gl.createBuffer();

    gl.useProgram(program);
    gl.bindVertexArray(vertexArray);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    const resolutionUniform = gl.getUniformLocation(program, "iResolution");
    const timeUniform = gl.getUniformLocation(program, "iTime");
    const mouseUniform = gl.getUniformLocation(program, "iMouse");

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

      gl.viewport(0, 0, nextWidth, nextHeight);
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
      const state = stateRef.current;

      previousFrameAt = now;

      // 指针亮光需要比 DOM 光标更柔和，shader 坐标单独做惯性缓动。
      state.mouseX = ease(state.mouseX, state.mouseTargetX, deltaSeconds, 0.13);
      state.mouseY = ease(state.mouseY, state.mouseTargetY, deltaSeconds, 0.13);

      gl.uniform2f(resolutionUniform, canvas.width, canvas.height);
      gl.uniform1f(timeUniform, (now - startedAt) / 1000);
      gl.uniform2f(mouseUniform, state.mouseX, state.mouseY);
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
      gl.deleteProgram(program);
      startedAt = 0;
    };
  }, []);

  return (
    <section
      aria-label="Hex path interactive shader effect"
      className={styles.shell}
      data-effect="hex-path-card"
      data-variant={variant}
      onPointerCancel={hidePointer}
      onPointerDown={handlePointerDown}
      onPointerLeave={hidePointer}
      onPointerMove={handlePointerMove}
      ref={shellRef}
      style={shellStyle}
      tabIndex={0}
    >
      <canvas aria-hidden="true" className={styles.canvas} ref={canvasRef} />
      <span aria-hidden="true" className={styles.cursor} style={cursorStyle} />
    </section>
  );
}
