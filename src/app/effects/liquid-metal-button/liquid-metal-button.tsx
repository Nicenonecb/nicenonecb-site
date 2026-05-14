"use client";

import type { CSSProperties, MouseEvent, PointerEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styles from "./liquid-metal-button.module.css";

type LiquidMetalButtonProps = {
  variant?: "detail" | "preview";
};

type ShaderState = {
  hover: number;
  hoverTarget: number;
  pointerInitialized: boolean;
  pointerTargetX: number;
  pointerTargetY: number;
  pointerX: number;
  pointerY: number;
};

const hiddenPointer = -1_000_000;

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
uniform float iHover;

out vec4 fragColor;

mat2 rotate2d(float angle) {
  float s = sin(angle);
  float c = cos(angle);

  return mat2(c, -s, s, c);
}

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);

  return mix(
    mix(hash12(i), hash12(i + vec2(1.0, 0.0)), u.x),
    mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;

  for (int i = 0; i < 5; i++) {
    value += amplitude * noise(p);
    p = mat2(1.62, 1.18, -1.18, 1.62) * p + 0.27;
    amplitude *= 0.5;
  }

  return value;
}

void main() {
  vec2 fragCoord = gl_FragCoord.xy;
  vec2 res = iResolution;
  vec2 uv = (2.0 * fragCoord - res) / min(res.x, res.y);
  vec2 pointer = (2.0 * iPointer - res) / min(res.x, res.y);
  bool hasPointer = iPointer.x > -1000.0;

  float radius = length(uv);
  float angle = atan(uv.y, uv.x);
  float edge = smoothstep(1.045, 0.81, radius);
  float dome = smoothstep(1.0, 0.18, radius);
  float bevel = smoothstep(1.0, 0.78, radius) - smoothstep(0.7, 0.48, radius);
  float pointerWave = hasPointer ? exp(-dot(uv - pointer, uv - pointer) * 3.8) : 0.0;

  vec2 swirlUv = rotate2d(sin(iTime * 0.18) * 0.22) * uv;
  vec2 flowUv = swirlUv * (2.7 + iHover * 0.55);
  flowUv += vec2(
    sin(angle * 4.0 + iTime * 0.86),
    cos(angle * 3.0 - iTime * 0.74)
  ) * (0.18 + iHover * 0.08);
  flowUv += normalize(uv + vec2(0.001)) * pointerWave * (0.28 + iHover * 0.18);

  float liquid = fbm(flowUv + vec2(iTime * 0.2, -iTime * 0.11));
  float fineLiquid = fbm(flowUv * 2.2 - vec2(iTime * 0.08, iTime * 0.12));
  float ribbonA = sin((uv.x * 2.4 + uv.y * 1.9) * 5.8 + liquid * 8.0 + iTime * 1.55);
  float ribbonB = sin((uv.x * -1.4 + uv.y * 2.9) * 7.2 + fineLiquid * 5.0 - iTime * 1.1);
  float chromeSignal = ribbonA + ribbonB * 0.36 + liquid * 0.88 - radius * 0.22;
  float chrome = smoothstep(-0.58, 0.92, chromeSignal);
  float mercury = smoothstep(0.18, 0.94, abs(chromeSignal));
  float hardLine = smoothstep(0.975, 1.0, sin(angle * 10.0 + liquid * 6.0 + iTime * 1.6) * 0.5 + 0.5);
  float highlight = pow(max(0.0, 1.0 - length(uv - vec2(-0.36, 0.46)) * 1.18), 5.4);
  float lowlight = pow(max(0.0, 1.0 - length(uv - vec2(0.38, -0.42)) * 1.45), 3.2);
  float caustic = pow(max(0.0, ribbonA * 0.5 + ribbonB * 0.38 + 0.34), 2.8);
  float spectralEdge = pow(max(0.0, 1.0 - abs(radius - 0.72) * 4.0), 3.0);
  float scan = smoothstep(0.012, 0.0, abs(fract(angle / 6.28318 + iTime * 0.09) - 0.5)) * bevel;

  vec3 black = vec3(0.026, 0.029, 0.03);
  vec3 oil = vec3(0.075, 0.083, 0.085);
  vec3 graphite = vec3(0.31, 0.305, 0.285);
  vec3 silver = vec3(0.91, 0.91, 0.84);
  vec3 whiteHot = vec3(1.0, 0.98, 0.88);
  vec3 color = mix(black, oil, dome);
  color = mix(color, graphite, 0.32 + liquid * 0.56);
  color = mix(color, silver, (chrome * 0.46 + mercury * 0.16) * (0.82 + iHover * 0.18));
  color += whiteHot * highlight * (0.48 + iHover * 0.24);
  color -= vec3(0.1, 0.095, 0.085) * lowlight;
  color += vec3(0.1, 0.72, 1.0) * caustic * (0.045 + iHover * 0.14);
  color += vec3(1.0, 0.14, 0.18) * hardLine * (0.018 + iHover * 0.075);
  color += vec3(0.98, 0.78, 0.26) * spectralEdge * (0.035 + iHover * 0.07);
  color += vec3(0.78, 0.96, 1.0) * scan * (0.18 + iHover * 0.22);
  color += vec3(0.5, 0.86, 1.0) * pointerWave * iHover * 0.18;
  color += vec3(1.0, 0.88, 0.58) * pow(pointerWave, 4.0) * iHover * 0.2;

  float grain = hash12(fragCoord + iTime * 24.0) - 0.5;
  color += grain * 0.028;
  color *= edge;

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

function AttachmentIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20">
      <path d="M6.0678 2.16105C7.46414 1.61127 9.04215 2.29797 9.59221 3.69425L12.7983 11.8339C13.1238 12.6606 12.7177 13.5952 11.891 13.9208L11.8149 13.9511C10.9883 14.2765 10.0535 13.8695 9.72795 13.0429L8.02678 8.7255C7.92565 8.46868 8.05228 8.17836 8.30901 8.07706C8.56594 7.97586 8.85624 8.10236 8.95744 8.35929L10.6586 12.6767C10.7819 12.9894 11.1359 13.1436 11.4487 13.0204L11.5248 12.9901C11.8377 12.8669 11.9908 12.5129 11.8676 12.2001L8.66155 4.06046C8.31383 3.17839 7.31727 2.74467 6.43498 3.09171L6.28069 3.15226C5.39843 3.49996 4.96466 4.4974 5.31194 5.3798L9.18108 15.2011C9.75314 16.6533 11.3938 17.3667 12.8461 16.7948L13.0766 16.705C14.5288 16.1329 15.2432 14.4913 14.6713 13.039L12.308 7.03898C12.2069 6.78212 12.3325 6.49177 12.5893 6.39054C12.8461 6.28961 13.1365 6.41605 13.2377 6.67277L15.601 12.6728C16.3753 14.6389 15.4089 16.8601 13.4428 17.6347L13.2133 17.7255C11.2472 18.4998 9.025 17.5342 8.25041 15.5683L4.38225 5.74698C3.83217 4.35052 4.51801 2.77168 5.91448 2.22159L6.0678 2.16105Z" />
    </svg>
  );
}

function SparklesIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 30 30">
      <path d="M14.217 19.707l-1.112 2.547c-.427.979-1.782.979-2.21 0l-1.112-2.547c-.99-2.267-2.771-4.071-4.993-5.057l-3.06-1.358c-.973-.432-.973-1.848 0-2.28l2.965-1.316C6.974 8.684 8.787 6.813 9.76 4.47l1.126-2.714c.418-1.007 1.81-1.007 2.228 0L14.24 4.47c.973 2.344 2.786 4.215 5.065 5.226l2.965 1.316c.973.432.973 1.848 0 2.28l-3.061 1.359c-2.221.986-4.003 2.79-4.992 5.056z" />
      <path d="M24.481 27.796l-.339.777c-.248.569-1.036.569-1.284 0l-.339-.777c-.604-1.385-1.693-2.488-3.051-3.092l-1.044-.464c-.565-.251-.565-1.072 0-1.323l.986-.438c1.393-.619 2.501-1.763 3.095-3.195l.348-.84c.243-.585 1.052-.585 1.294 0l.348.84c.594 1.432 1.702 2.576 3.095 3.195l.986.438c.565.251.565 1.072 0 1.323l-1.044.464c-1.354.604-2.443 1.707-3.047 3.092z" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 1024 1024">
      <path d="M843.968 896a51.072 51.072 0 0 1-51.968-52.032V232H180.032A51.072 51.072 0 0 1 128 180.032C128 150.592 150.528 128 180.032 128h663.936C873.408 128 896 150.528 896 180.032v663.936C896 873.408 873.408 896 843.968 896z" />
      <path d="M180.032 896a49.92 49.92 0 0 1-36.48-15.616c-20.736-20.8-20.736-53.76 0-72.832l664.064-663.936c20.864-20.8 53.76-20.8 72.832 0 20.8 20.8 20.8 53.76 0 72.768L216.384 880.384A47.232 47.232 0 0 1 180.032 896z" />
    </svg>
  );
}

export function LiquidMetalButton({ variant = "detail" }: LiquidMetalButtonProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const stateRef = useRef<ShaderState>({
    hover: 0,
    hoverTarget: 0,
    pointerInitialized: false,
    pointerTargetX: hiddenPointer,
    pointerTargetY: hiddenPointer,
    pointerX: hiddenPointer,
    pointerY: hiddenPointer,
  });
  const [pressed, setPressed] = useState(false);
  const [active, setActive] = useState(false);

  const shellStyle = useMemo(
    () =>
      ({
        "--liquid-metal-min-height": variant === "preview" ? "100%" : "40rem",
      }) as CSSProperties,
    [variant],
  );

  const updatePointer = useCallback((clientX: number, clientY: number) => {
    const button = buttonRef.current;

    if (!button) {
      return;
    }

    const rect = button.getBoundingClientRect();
    const dpr = getDpr();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const state = stateRef.current;

    state.pointerTargetX = x * dpr;
    state.pointerTargetY = (rect.height - y) * dpr;
    // 指针坐标同时喂给 shader 和 CSS，让外圈光斑与内部金属流动保持同源。
    button.style.setProperty("--pointer-x", `${(x / rect.width) * 100}%`);
    button.style.setProperty("--pointer-y", `${(y / rect.height) * 100}%`);

    if (!state.pointerInitialized) {
      state.pointerX = state.pointerTargetX;
      state.pointerY = state.pointerTargetY;
      state.pointerInitialized = true;
    }
  }, []);

  const activate = useCallback(() => {
    setActive(true);
    stateRef.current.hoverTarget = 1;
  }, []);

  const deactivate = useCallback(() => {
    const state = stateRef.current;

    setActive(false);
    setPressed(false);
    state.hoverTarget = 0;
    state.pointerInitialized = false;
    state.pointerTargetX = hiddenPointer;
    state.pointerTargetY = hiddenPointer;
  }, []);

  const handlePointerMove = useCallback(
    (event: PointerEvent<HTMLButtonElement>) => {
      updatePointer(event.clientX, event.clientY);
    },
    [updatePointer],
  );

  const handleMouseMove = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      updatePointer(event.clientX, event.clientY);
    },
    [updatePointer],
  );

  const handlePointerDown = useCallback(
    (event: PointerEvent<HTMLButtonElement>) => {
      event.currentTarget.setPointerCapture(event.pointerId);
      setPressed(true);
      activate();
      updatePointer(event.clientX, event.clientY);
    },
    [activate, updatePointer],
  );

  const handlePointerUp = useCallback(() => {
    setPressed(false);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const button = buttonRef.current;

    if (!(canvas && button)) {
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
    const pointerUniform = gl.getUniformLocation(program, "iPointer");
    const hoverUniform = gl.getUniformLocation(program, "iHover");

    let animationFrame = 0;
    let stopped = false;
    let startedAt = performance.now();
    let previousFrameAt = startedAt;

    const resizeCanvas = () => {
      const rect = button.getBoundingClientRect();
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
    resizeObserver.observe(button);
    resizeCanvas();

    const render = () => {
      if (stopped) {
        return;
      }

      const now = performance.now();
      const deltaSeconds = Math.max(0.001, (now - previousFrameAt) / 1000);
      const state = stateRef.current;

      previousFrameAt = now;

      // shader 的指针和 hover 强度单独缓动，避免液态高光在进出按钮时突跳。
      state.pointerX = ease(state.pointerX, state.pointerTargetX, deltaSeconds, 0.15);
      state.pointerY = ease(state.pointerY, state.pointerTargetY, deltaSeconds, 0.15);
      state.hover = ease(state.hover, state.hoverTarget, deltaSeconds, 0.2);

      gl.uniform2f(resolutionUniform, canvas.width, canvas.height);
      gl.uniform1f(timeUniform, (now - startedAt) / 1000);
      gl.uniform2f(pointerUniform, state.pointerX, state.pointerY);
      gl.uniform1f(hoverUniform, state.hover);
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
      aria-label="Liquid metal button shader effect"
      className={styles.shell}
      data-active={active}
      data-effect="liquid-metal-button"
      data-variant={variant}
      style={shellStyle}
    >
      <div className={styles.textBox}>
        <span aria-hidden="true" className={styles.trackPulse} />
        <span aria-hidden="true" className={`${styles.energyOrb} ${styles.orbOne}`} />
        <span aria-hidden="true" className={`${styles.energyOrb} ${styles.orbTwo}`} />
        <span aria-hidden="true" className={`${styles.energyOrb} ${styles.orbThree}`} />
        <span className={`${styles.sideIcon} ${styles.attachment}`}>
          <AttachmentIcon />
        </span>
        <span className={`${styles.sideIcon} ${styles.sparkles}`}>
          <SparklesIcon />
        </span>
        <button
          aria-label="Activate liquid metal button"
          className={styles.liquidButton}
          data-pressed={pressed}
          onBlur={deactivate}
          onFocus={activate}
          onMouseEnter={activate}
          onMouseLeave={deactivate}
          onMouseMove={handleMouseMove}
          onPointerCancel={deactivate}
          onPointerDown={handlePointerDown}
          onPointerEnter={activate}
          onPointerLeave={deactivate}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          ref={buttonRef}
          type="button"
        >
          <span aria-hidden="true" className={styles.prismTail} />
          <span aria-hidden="true" className={styles.auraField} />
          <span aria-hidden="true" className={styles.buttonHalo} />
          <span aria-hidden="true" className={styles.shockRing} />
          <canvas aria-hidden="true" className={styles.metalCanvas} ref={canvasRef} />
          <span aria-hidden="true" className={styles.metalBase} />
          <span aria-hidden="true" className={styles.innerLens} />
          <span aria-hidden="true" className={styles.outline} />
          <span aria-hidden="true" className={styles.sparkBelt} />
          <span aria-hidden="true" className={styles.energyRing} />
          <span aria-hidden="true" className={styles.scanLine} />
          <span aria-hidden="true" className={styles.arrowIcon}>
            <ArrowIcon />
          </span>
        </button>
      </div>
    </section>
  );
}
