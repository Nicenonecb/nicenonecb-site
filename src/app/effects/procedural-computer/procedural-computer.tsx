"use client";

import type { CSSProperties, KeyboardEvent, MouseEvent, PointerEvent, WheelEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styles from "./procedural-computer.module.css";

type ProceduralComputerProps = {
  variant?: "detail" | "preview";
};

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
uniform float uInvert;
uniform float uMobile;
uniform float uScroll;
uniform float uEmboss;

out vec4 fragColor;

float sdRect(vec2 p, vec2 size) {
  vec2 d = abs(p) - size;
  return length(max(d, vec2(0.0))) + min(max(d.x, d.y), 0.0);
}

mat4 rotationMatrix(vec3 axis, float angle) {
  vec3 a = normalize(axis);
  float s = sin(angle);
  float c = cos(angle);
  float oc = 1.0 - c;

  return mat4(
    oc * a.x * a.x + c,      oc * a.x * a.y - a.z * s,  oc * a.z * a.x + a.y * s,  0.0,
    oc * a.x * a.y + a.z * s, oc * a.y * a.y + c,       oc * a.y * a.z - a.x * s,  0.0,
    oc * a.z * a.x - a.y * s, oc * a.y * a.z + a.x * s, oc * a.z * a.z + c,        0.0,
    0.0,                     0.0,                       0.0,                      1.0
  );
}

float sminVal(float a, float b, float k) {
  float kk = k * 6.0;
  float h = max(kk - abs(a - b), 0.0) / kk;
  float m = h * h * h * 0.5;
  float s = m * kk * (1.0 / 3.0);
  return (a < b) ? a - s : b - s;
}

float opOnion(float d, float h) {
  return abs(d) - h;
}

float msign(float x) {
  return x < 0.0 ? -1.0 : 1.0;
}

float sdEllipse2(vec2 p, vec2 e, inout int iterations) {
  float x = p.x;
  float y = p.y;
  float ax = abs(p.x);
  float ay = abs(p.y);
  float a = e.x;
  float b = e.y;
  float aa = e.x * e.x;
  float bb = e.y * e.y;

  vec2 closest = vec2(0.0);
  iterations = 0;

  if (a * b <= 1e-15) {
    closest = clamp(p, -e, e);
    return length(closest - p);
  }

  if (e.x <= 0.0 || e.y <= 0.0) {
    return length(p);
  }

  if (abs(a - b) < 0.0001) {
    iterations = 0;
    return length(p) - a;
  }

  float epsilon = 1e-3;
  float diff = bb - aa;

  if (a < b) {
    if (ax <= epsilon * a) {
      if (ay * b < diff) {
        float yc = bb * y / diff;
        float xc = a * sqrt(1.0 - yc * yc / bb);
        closest = vec2(xc, yc);
        return -length(closest - p);
      }
      closest = vec2(x, b * msign(y));
      return ay - b;
    }
    if (ay <= epsilon * b) {
      closest = vec2(a * msign(x), y);
      return ax - a;
    }
  } else {
    if (ay <= epsilon * b) {
      if (ax * a < -diff) {
        float xc = aa * x / -diff;
        float yc = b * sqrt(1.0 - xc * xc / aa);
        closest = vec2(xc, yc);
        return -length(closest - p);
      }
      closest = vec2(a * msign(x), y);
      return ax - a;
    }
    if (ax <= epsilon * a) {
      closest = vec2(x, b * msign(y));
      return ay - b;
    }
  }

  float rx = x / a;
  float ry = y / b;
  float inside = rx * rx + ry * ry - 1.0;
  float s2 = sqrt(2.0);
  float tmin = max(a * ax - aa, b * ay - bb);
  float tmax = max(s2 * a * ax - aa, s2 * b * ay - bb);
  float xx = x * x * aa;
  float yy = y * y * bb;
  float rxx = rx * rx;
  float ryy = ry * ry;
  float t;

  if (inside < 0.0) {
    tmax = min(tmax, 0.0);
    if (ryy < 1.0) {
      tmin = max(tmin, sqrt(xx / (1.0 - ryy)) - aa);
    }
    if (rxx < 1.0) {
      tmin = max(tmin, sqrt(yy / (1.0 - rxx)) - bb);
    }
    t = tmin * 0.95;
  } else {
    tmin = max(tmin, 0.0);
    if (ryy < 1.0) {
      tmax = min(tmax, sqrt(xx / (1.0 - ryy)) - aa);
    }
    if (rxx < 1.0) {
      tmax = min(tmax, sqrt(yy / (1.0 - rxx)) - bb);
    }
    t = tmin;
  }

  t = clamp(t, tmin, tmax);

  int newtonSteps = 12;
  if (tmin >= tmax) {
    t = tmin;
    newtonSteps = 0;
  }

  int i = 0;
  for (i = 0; i < newtonSteps; i++) {
    float at = aa + t;
    float bt = bb + t;
    float abt = at * bt;
    float xxbt = xx * bt;
    float yyat = yy * at;
    float f0 = xxbt * bt + yyat * at - abt * abt;
    float f1 = 2.0 * (xxbt + yyat - abt * (bt + at));

    if (f0 < 0.0) {
      tmax = t;
    } else if (f0 > 0.0) {
      tmin = t;
    }

    float newton = f0 / abs(f1);
    newton = clamp(newton, tmin - t, tmax - t);
    newton = min(newton, a * b * 2.0);
    t += newton;

    if (abs(newton) < 1e-6 * (abs(t) + 0.1) || tmin >= tmax) {
      break;
    }
  }

  iterations = i;
  closest = vec2(x * a / (aa + t), y * b / (bb + t));
  closest = normalize(closest);
  closest *= e;

  return length(closest - p) * msign(inside);
}

float sdRing3D(vec2 p, mat4 Rmat, float ringR, float thickness) {
  vec2 u = (Rmat * vec4(ringR, 0.0, 0.0, 0.0)).xy;
  vec2 v = (Rmat * vec4(0.0, ringR, 0.0, 0.0)).xy;
  float uu = dot(u, u);
  float vv = dot(v, v);
  float uv = dot(u, v);
  float theta = 0.5 * atan(2.0 * uv, uu - vv + 1e-6);
  float ct = cos(theta);
  float st = sin(theta);
  vec2 ax1 = u * ct + v * st;
  vec2 ax2 = -u * st + v * ct;
  float s1 = length(ax1);
  float s2 = length(ax2);
  vec2 dir = ax1 / max(s1, 1e-6);
  vec2 perp = vec2(-dir.y, dir.x);
  vec2 pLocal = vec2(dot(p, dir), dot(p, perp));

  int iter = 0;
  return opOnion(sdEllipse2(pLocal, vec2(max(s1, 1e-4), max(s2, 1e-4)), iter), thickness);
}

float sceneSD(vec2 p, vec2 m, mat4 R, mat4 Rb, mat4 Rc, float b, float mobile, float ringT, float hairW) {
  float sd = sdRing3D(p, R, 0.75, ringT);
  sd = sminVal(sd, sdRing3D(p, Rb, 0.75, ringT), b);
  sd = sminVal(sd, sdRing3D(p, Rc, 0.75, ringT), b);

  if (mobile < 0.5) {
    sd = sminVal(sd, sdRect(p - vec2(0.0, m.y), vec2(2.0, hairW)), b);
    sd = sminVal(sd, sdRect(p - vec2(m.x, 0.0), vec2(hairW, 1.0)), b);
  }

  return sd;
}

void main() {
  vec2 fragCoord = gl_FragCoord.xy;
  vec2 res = iResolution;
  vec2 p = (2.0 * fragCoord - res) / res.y;
  vec2 m = (2.0 * iMouse - res) / res.y;

  float b = 0.020;
  const float DURATION = 15.0;
  const float TAU = 6.2831853;
  float playhead = fract(iTime / DURATION);
  float loopAng = playhead * TAU;

  mat4 R = rotationMatrix(normalize(vec3(1.0, 0.7, 0.3)), loopAng * 1.0 + uScroll);
  mat4 Rb = rotationMatrix(normalize(vec3(0.3, 1.0, -0.5)), loopAng * 2.0 + uScroll * 0.6);
  mat4 Rc = rotationMatrix(normalize(vec3(-0.5, 0.4, 1.0)), loopAng * 3.0 + uScroll * 1.5);

  float eps = 0.0025;
  float v0 = sceneSD(p, m, R, Rb, Rc, b, uMobile, 0.0015, 0.005);
  float v1 = sceneSD(p - vec2(eps, 0.0), m, R, Rb, Rc, b, uMobile, 0.0015, 0.005);
  float v2 = sceneSD(p + vec2(eps, 0.0), m, R, Rb, Rc, b, uMobile, 0.0015, 0.005);
  float v3 = sceneSD(p - vec2(0.0, eps), m, R, Rb, Rc, b, uMobile, 0.0015, 0.005);
  float v4 = sceneSD(p + vec2(0.0, eps), m, R, Rb, Rc, b, uMobile, 0.0015, 0.005);
  float v0f = sceneSD(p, m, R, Rb, Rc, b, uMobile, 0.005, 0.0025);

  float str = 0.015;
  float hXp = 1.0 - smoothstep(0.0, str, v1);
  float hXm = 1.0 - smoothstep(0.0, str, v2);
  float hYp = 1.0 - smoothstep(0.0, str, v3);
  float hYm = 1.0 - smoothstep(0.0, str, v4);
  float pp = smoothstep(0.0, str, v0);

  vec3 n = normalize(vec3((hXp - hXm) * uEmboss, (hYp - hYm) * uEmboss, 1.0 - 0.99));
  vec3 lightDir = normalize(vec3(-0.5, -0.8, 0.6));
  float nDotL = dot(n, lightDir);

  vec3 bgCol = mix(vec3(0.768), vec3(0.1), uInvert);
  vec3 lineCol = mix(vec3(0.1), vec3(0.768), uInvert);
  vec3 lineColOverlay = mix(lineCol, mix(lineCol, vec3(0.3), uInvert), uEmboss);
  float aa = max(fwidth(v0f), 1e-4);
  float lineFlat = 1.0 - smoothstep(-aa, aa, v0f);
  vec3 colFlat = mix(bgCol, lineColOverlay, lineFlat);

  float shade = clamp(0.5 + nDotL * 0.5, 0.0, 1.0);
  vec3 colEmboss = mix(bgCol, bgCol * (shade + 0.3), pp);
  vec3 col = mix(colFlat, colEmboss, uEmboss * 0.9);

  fragColor = vec4(col, 1.0);
}
`;

type ShaderUniforms = {
  emboss: number;
  embossTarget: number;
  invert: number;
  invertTarget: number;
  mouseInitialized: boolean;
  mouseTargetX: number;
  mouseTargetY: number;
  mouseX: number;
  mouseY: number;
  scrollOffset: number;
  scrollVelocity: number;
};

const offscreenMouse = -1_000_000;

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

function isMobileUserAgent() {
  return (
    typeof navigator !== "undefined" &&
    /mobile|tablet|ip(ad|hone|od)|android|silk|crios/i.test(navigator.userAgent)
  );
}

function getDpr() {
  return Math.min(window.devicePixelRatio || 1, 2);
}

function ease(current: number, target: number, deltaSeconds: number, tau: number) {
  return current + (target - current) * (1 - Math.exp(-deltaSeconds / tau));
}

export function ProceduralComputer({ variant = "detail" }: ProceduralComputerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const shellRef = useRef<HTMLElement>(null);
  const [isInverted, setIsInverted] = useState(false);
  const uniformsRef = useRef<ShaderUniforms>({
    emboss: 0,
    embossTarget: 0,
    invert: 0,
    invertTarget: 0,
    mouseInitialized: false,
    mouseTargetX: offscreenMouse,
    mouseTargetY: offscreenMouse,
    mouseX: offscreenMouse,
    mouseY: offscreenMouse,
    scrollOffset: 0,
    scrollVelocity: 0,
  });

  const cssVariables = useMemo(
    () =>
      ({
        "--procedural-min-height": variant === "preview" ? "100%" : "42rem",
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
    const nextX = (clientX - rect.left) * dpr;
    const nextY = (rect.bottom - clientY) * dpr;
    const uniforms = uniformsRef.current;

    uniforms.mouseTargetX = nextX;
    uniforms.mouseTargetY = nextY;

    if (!uniforms.mouseInitialized) {
      uniforms.mouseX = nextX;
      uniforms.mouseY = nextY;
      uniforms.mouseInitialized = true;
    }
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

  const handleWheel = useCallback((event: WheelEvent<HTMLElement>) => {
    const uniforms = uniformsRef.current;

    uniforms.scrollVelocity += event.deltaY * 0.002;
    uniforms.scrollVelocity = Math.max(-8, Math.min(8, uniforms.scrollVelocity));
  }, []);

  const toggleInvert = useCallback((event?: MouseEvent<HTMLButtonElement>) => {
    if (event) {
      const rect = event.currentTarget.getBoundingClientRect();

      updatePointer(rect.left + rect.width / 2, rect.top + rect.height / 2);
    }

    setIsInverted((current) => {
      const next = !current;

      uniformsRef.current.invertTarget = next ? 1 : 0;

      return next;
    });
  }, [updatePointer]);

  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLElement>) => {
    if (event.metaKey || event.ctrlKey || event.altKey) {
      return;
    }

    if (event.key.toLowerCase() === "t") {
      event.preventDefault();
      toggleInvert();
    }

    if (event.key.toLowerCase() === "b") {
      event.preventDefault();
      uniformsRef.current.embossTarget = uniformsRef.current.embossTarget > 0.5 ? 0 : 1;
    }
  }, [toggleInvert]);

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
    const invertUniform = gl.getUniformLocation(program, "uInvert");
    const mobileUniform = gl.getUniformLocation(program, "uMobile");
    const scrollUniform = gl.getUniformLocation(program, "uScroll");
    const embossUniform = gl.getUniformLocation(program, "uEmboss");
    const mobile = isMobileUserAgent();

    gl.uniform1f(mobileUniform, mobile ? 1 : 0);

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
      const uniforms = uniformsRef.current;

      previousFrameAt = now;

      uniforms.invert = ease(uniforms.invert, uniforms.invertTarget, deltaSeconds, 0.1);
      uniforms.emboss = ease(uniforms.emboss, uniforms.embossTarget, deltaSeconds, 0.35);
      uniforms.mouseX = ease(uniforms.mouseX, uniforms.mouseTargetX, deltaSeconds, 0.12);
      uniforms.mouseY = ease(uniforms.mouseY, uniforms.mouseTargetY, deltaSeconds, 0.12);

      // 滚轮只改变 shader 的旋转相位，不移动 DOM；用阻尼保留目标站的惯性手感。
      uniforms.scrollVelocity = ease(uniforms.scrollVelocity, 0, deltaSeconds, 0.6);
      uniforms.scrollOffset += uniforms.scrollVelocity * deltaSeconds;

      gl.uniform2f(resolutionUniform, canvas.width, canvas.height);
      gl.uniform1f(timeUniform, (now - startedAt) / 1000);
      gl.uniform2f(mouseUniform, uniforms.mouseX, uniforms.mouseY);
      gl.uniform1f(invertUniform, uniforms.invert);
      gl.uniform1f(scrollUniform, uniforms.scrollOffset);
      gl.uniform1f(embossUniform, uniforms.emboss);
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
      aria-label="Procedural computer shader effect"
      className={styles.shell}
      data-effect="procedural-computer"
      data-variant={variant}
      onKeyDown={handleKeyDown}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onWheel={handleWheel}
      ref={shellRef}
      style={cssVariables}
      tabIndex={0}
    >
      <canvas aria-hidden="true" className={styles.canvas} ref={canvasRef} />
      <button
        aria-keyshortcuts="T"
        aria-label="Toggle shader color mode"
        className={styles.themeButton}
        data-inverted={isInverted}
        onClick={toggleInvert}
        onPointerDown={(event) => {
          updatePointer(event.clientX, event.clientY);
          event.stopPropagation();
        }}
        type="button"
      >
        <span aria-hidden="true" className={styles.themeDot} />
        <kbd className={styles.themeKey}>T</kbd>
      </button>
    </section>
  );
}
