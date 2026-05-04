"use client";

import Link from "next/link";
import type { CSSProperties, RefObject } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import styles from "./glass-hero.module.css";

const TEXTURE_WIDTH = 1440;
const TEXTURE_HEIGHT = 900;
const WORLD_WIDTH = 8.6;
const WORLD_HEIGHT = 5.38;

type GlassHeroProps = {
  variant?: "page" | "preview";
};

type Point = [number, number];

type PaneSpec = {
  depth: number;
  floatOffset: number;
  id: string;
  points: Point[];
  radius: number;
  rotation: [number, number, number];
  z: number;
};

type PaneRuntime = {
  basePosition: THREE.Vector3;
  baseRotation: THREE.Euler;
  floatOffset: number;
  group: THREE.Group;
};

const PANE_SPECS: PaneSpec[] = [
  {
    id: "top-bar",
    points: [
      [-3.86, 2.15],
      [2.86, 2.08],
      [2.74, 1.66],
      [-3.95, 1.7],
    ],
    radius: 0.11,
    depth: 0.065,
    z: 0.18,
    rotation: [-0.015, 0.05, -0.006],
    floatOffset: 0,
  },
  {
    id: "headline-left",
    points: [
      [-3.54, 1.34],
      [-0.6, 1.22],
      [-0.78, -0.16],
      [-3.34, -0.02],
      [-3.7, 0.7],
    ],
    radius: 0.13,
    depth: 0.12,
    z: 0.32,
    rotation: [0.04, -0.08, 0.018],
    floatOffset: 0.7,
  },
  {
    id: "headline-right",
    points: [
      [-0.36, 1.2],
      [2.28, 1.02],
      [2.02, -0.48],
      [-0.72, -0.24],
    ],
    radius: 0.13,
    depth: 0.13,
    z: 0.46,
    rotation: [-0.02, 0.1, -0.022],
    floatOffset: 1.5,
  },
  {
    id: "copy-panel",
    points: [
      [-3.34, -0.36],
      [-1.04, -0.46],
      [-1.18, -1.66],
      [-3.18, -1.48],
      [-3.58, -0.84],
    ],
    radius: 0.12,
    depth: 0.1,
    z: 0.24,
    rotation: [-0.04, 0.06, -0.012],
    floatOffset: 2.2,
  },
  {
    id: "cta-panel",
    points: [
      [-0.78, -0.46],
      [2.76, -0.58],
      [2.48, -1.78],
      [-0.96, -1.62],
    ],
    radius: 0.12,
    depth: 0.12,
    z: 0.38,
    rotation: [0.03, -0.06, 0.016],
    floatOffset: 3,
  },
  {
    id: "right-shard",
    points: [
      [2.44, 1.56],
      [3.5, 1.2],
      [3.08, -0.18],
      [2.14, 0.1],
    ],
    radius: 0.1,
    depth: 0.1,
    z: 0.3,
    rotation: [0.02, 0.12, 0.055],
    floatOffset: 3.8,
  },
];

const CONTROL_ROWS = [
  ["Piece Count", "5"],
  ["Relax Iterations", "4"],
  ["Min Edge Length", "0.355"],
  ["Gap", "0.045"],
  ["Corner Radius", "0.045"],
  ["Corner Smoothness", "0.000"],
  ["Chamfer Enabled", "Off"],
  ["Pane Depth", "0.040"],
  ["Vertex Smoothing", "0.20"],
  ["Pane Padding", "0.26"],
  ["Hero Padding X", "126"],
  ["Hero Padding Y", "115"],
  ["Back Pane Scale", "1.00"],
];

function getNodeText(source: HTMLElement, selector: string) {
  return source.querySelector(selector)?.textContent?.trim() ?? "";
}

function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.min(radius, width / 2, height / 2);

  context.beginPath();
  context.moveTo(x + r, y);
  context.lineTo(x + width - r, y);
  context.quadraticCurveTo(x + width, y, x + width, y + r);
  context.lineTo(x + width, y + height - r);
  context.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  context.lineTo(x + r, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - r);
  context.lineTo(x, y + r);
  context.quadraticCurveTo(x, y, x + r, y);
  context.closePath();
}

function drawWrappedText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
) {
  const words = text.split(" ");
  let line = "";
  let currentY = y;

  words.forEach((word, index) => {
    const testLine = line ? `${line} ${word}` : word;
    const isLast = index === words.length - 1;

    if (context.measureText(testLine).width > maxWidth && line) {
      context.fillText(line, x, currentY);
      line = word;
      currentY += lineHeight;
    } else {
      line = testLine;
    }

    if (isLast && line) {
      context.fillText(line, x, currentY);
    }
  });
}

function captureHeroToTextureCanvas(source: HTMLElement, canvas: HTMLCanvasElement) {
  const context = canvas.getContext("2d");

  if (!context) {
    return Promise.reject(new Error("2D canvas context is unavailable."));
  }

  const navItems = Array.from(
    source.querySelectorAll(`.${styles.textureLinks} span`),
    (item) => item.textContent?.trim() ?? "",
  );
  const headline = Array.from(
    source.querySelectorAll(`.${styles.textureHeadline} span`),
    (item) => item.textContent?.trim() ?? "",
  );
  const footerItems = Array.from(
    source.querySelectorAll(`.${styles.textureFooter} span`),
    (item) => item.textContent?.trim() ?? "",
  );

  context.clearRect(0, 0, TEXTURE_WIDTH, TEXTURE_HEIGHT);
  context.fillStyle = "#0a0a0c";
  context.fillRect(0, 0, TEXTURE_WIDTH, TEXTURE_HEIGHT);

  const glow = context.createRadialGradient(370, 420, 0, 370, 420, 620);
  glow.addColorStop(0, "rgba(255, 255, 255, 0.055)");
  glow.addColorStop(0.52, "rgba(87, 255, 168, 0.026)");
  glow.addColorStop(1, "rgba(10, 10, 12, 0)");
  context.fillStyle = glow;
  context.fillRect(0, 0, TEXTURE_WIDTH, TEXTURE_HEIGHT);

  const x = 126;
  const top = 115;

  context.textBaseline = "alphabetic";
  context.font = "500 14px Arial, Helvetica, sans-serif";
  context.fillStyle = "#ffffff";
  roundedRect(context, x, top + 5, 9, 9, 2);
  context.fill();
  context.fillText(getNodeText(source, `.${styles.textureBrand}`), x + 18, top + 15);

  context.fillStyle = "#b8b8be";
  navItems.forEach((item, index) => {
    context.fillText(item, x + 172 + index * 92, top + 15);
  });
  context.textAlign = "right";
  context.fillText(getNodeText(source, `.${styles.textureSignIn}`), TEXTURE_WIDTH - x, top + 15);
  context.textAlign = "left";

  context.font = "400 12px Arial, Helvetica, sans-serif";
  context.fillStyle = "#6e6e76";
  context.fillText(getNodeText(source, `.${styles.textureEyebrow}`).toUpperCase(), x, 330);

  context.font = "500 132px Arial, Helvetica, sans-serif";
  context.fillStyle = "#ffffff";
  context.fillText(headline[0] ?? "", x, 460);
  context.fillText(headline[1] ?? "", x, 582);

  context.font = "400 18px Arial, Helvetica, sans-serif";
  context.fillStyle = "#8a8a92";
  drawWrappedText(
    context,
    getNodeText(source, `.${styles.textureSub}`),
    x,
    644,
    520,
    28,
  );

  roundedRect(context, x, 714, 142, 40, 8);
  context.fillStyle = "#ffffff";
  context.fill();
  context.fillStyle = "#0a0a0c";
  context.font = "500 13px Arial, Helvetica, sans-serif";
  context.fillText(getNodeText(source, `.${styles.texturePrimary}`), x + 18, 739);

  context.fillStyle = "#ffffff";
  context.fillText(getNodeText(source, `.${styles.textureSecondary}`), x + 178, 739);

  context.strokeStyle = "rgba(255, 255, 255, 0.06)";
  context.beginPath();
  context.moveTo(x, 810);
  context.lineTo(TEXTURE_WIDTH - x, 810);
  context.stroke();

  context.font = "400 12px Arial, Helvetica, sans-serif";
  context.fillStyle = "#6e6e76";
  context.fillText(footerItems[0] ?? "", x, 846);
  context.textAlign = "right";
  context.fillText(footerItems[1] ?? "", TEXTURE_WIDTH - x, 846);
  context.textAlign = "left";

  return Promise.resolve();
}

function getCornerData(points: Point[], radius: number) {
  return points.map((point, index) => {
    const previous = points[(index + points.length - 1) % points.length];
    const next = points[(index + 1) % points.length];
    const toPrevious = new THREE.Vector2(previous[0] - point[0], previous[1] - point[1]);
    const toNext = new THREE.Vector2(next[0] - point[0], next[1] - point[1]);
    const prevLength = toPrevious.length();
    const nextLength = toNext.length();
    const cornerRadius = Math.min(radius, prevLength * 0.42, nextLength * 0.42);

    toPrevious.normalize();
    toNext.normalize();

    return {
      control: new THREE.Vector2(point[0], point[1]),
      end: new THREE.Vector2(
        point[0] + toNext.x * cornerRadius,
        point[1] + toNext.y * cornerRadius,
      ),
      start: new THREE.Vector2(
        point[0] + toPrevious.x * cornerRadius,
        point[1] + toPrevious.y * cornerRadius,
      ),
    };
  });
}

function setGlobalUv(geometry: THREE.BufferGeometry, center: THREE.Vector2) {
  const position = geometry.getAttribute("position") as THREE.BufferAttribute;
  const uv = new Float32Array(position.count * 2);

  // UV 按整张 hero 画布的世界坐标计算，每个碎片只显示自己覆盖的那一块内容。
  for (let index = 0; index < position.count; index += 1) {
    const worldX = position.getX(index) + center.x;
    const worldY = position.getY(index) + center.y;

    uv[index * 2] = THREE.MathUtils.clamp((worldX + WORLD_WIDTH / 2) / WORLD_WIDTH, 0, 1);
    uv[index * 2 + 1] = THREE.MathUtils.clamp((worldY + WORLD_HEIGHT / 2) / WORLD_HEIGHT, 0, 1);
  }

  geometry.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
}

function makePaneGeometry(spec: PaneSpec) {
  const center = spec.points.reduce(
    (sum, point) => sum.add(new THREE.Vector2(point[0], point[1])),
    new THREE.Vector2(),
  );
  center.divideScalar(spec.points.length);

  const localPoints = spec.points.map(
    (point) => [point[0] - center.x, point[1] - center.y] as Point,
  );
  const corners = getCornerData(localPoints, spec.radius);
  const shape = new THREE.Shape();

  corners.forEach((corner, index) => {
    if (index === 0) {
      shape.moveTo(corner.start.x, corner.start.y);
    } else {
      shape.lineTo(corner.start.x, corner.start.y);
    }

    shape.quadraticCurveTo(corner.control.x, corner.control.y, corner.end.x, corner.end.y);
  });
  shape.closePath();

  const geometry = new THREE.ExtrudeGeometry(shape, {
    bevelEnabled: true,
    bevelSegments: 6,
    bevelSize: spec.depth * 0.42,
    bevelThickness: spec.depth * 0.46,
    curveSegments: 24,
    depth: spec.depth,
    steps: 1,
  });

  geometry.translate(0, 0, -spec.depth / 2);
  setGlobalUv(geometry, center);
  geometry.computeVertexNormals();

  return { center, geometry };
}

function TextureSource({ sourceRef }: { sourceRef: RefObject<HTMLDivElement | null> }) {
  return (
    <div
      ref={sourceRef}
      className={styles.textureSource}
      data-shaderdeck-source
      aria-hidden="true"
    >
      <div className={styles.textureHero}>
        <div className={styles.textureNav}>
          <div className={styles.textureBrandGroup}>
            <span className={styles.textureMark} />
            <span className={styles.textureBrand}>Prism</span>
          </div>
          <div className={styles.textureLinks}>
            <span>Studio</span>
            <span>Materials</span>
            <span>Pricing</span>
          </div>
          <span className={styles.textureSignIn}>Sign in</span>
        </div>
        <main className={styles.textureMain}>
          <span className={styles.textureEyebrow}>Real-time material studio</span>
          <h2 className={styles.textureHeadline}>
            <span>Designed</span>
            <span>in glass.</span>
          </h2>
          <p className={styles.textureSub}>
            Author dispersion, transmission, and refraction in the browser. Live
            previews, real materials.
          </p>
          <div className={styles.textureCtas}>
            <span className={styles.texturePrimary}>Open studio</span>
            <span className={styles.textureSecondary}>{"Read paper ->"}</span>
          </div>
        </main>
        <footer className={styles.textureFooter}>
          <span>© Prism Lab</span>
          <span>KHR_materials_dispersion</span>
        </footer>
      </div>
    </div>
  );
}

function StaticControls() {
  return (
    <aside className={styles.dialPanel} aria-label="glass controls preview">
      <div className={styles.dialHeader}>
        <strong>glass</strong>
        <span aria-hidden="true">::</span>
      </div>
      <div className={styles.dialToolbar}>
        <button type="button" aria-label="Add control">
          +
        </button>
        <button type="button">Version 1</button>
        <button type="button">Copy</button>
      </div>
      <button className={styles.regenerateButton} type="button">
        Regenerate
      </button>
      <div className={styles.dialSection}>Pane</div>
      <div className={styles.dialRows}>
        {CONTROL_ROWS.map(([label, value], index) => (
          <div className={styles.dialRow} key={label}>
            <span>{label}</span>
            <span>{value}</span>
            <i style={{ width: `${28 + (index % 5) * 9}%` }} />
          </div>
        ))}
      </div>
    </aside>
  );
}

function FunBadge() {
  const columns = useMemo(() => Array.from({ length: 20 }, (_, index) => index), []);

  return (
    <a className={styles.funBadge} href="mailto:nicenonecb@gmail.com">
      <span className={styles.funCopy}>
        <span>Need</span>
        <span>something</span>
      </span>
      <span className={styles.funPixels} aria-label="FUN?">
        {columns.map((index) => (
          <i
            key={index}
            style={
              {
                "--dot-opacity": 0.22 + (index % 5) * 0.11,
                "--dot-x": index % 10,
                "--dot-y": Math.floor(index / 5),
              } as CSSProperties
            }
          />
        ))}
        <strong>FUN?</strong>
      </span>
    </a>
  );
}

function FallbackScene() {
  return (
    <div className={styles.fallbackScene} aria-hidden="true">
      <div className={`${styles.fallbackPane} ${styles.fallbackTop}`}>
        <span>Prism</span>
        <span>Studio / Materials / Pricing</span>
      </div>
      <div className={`${styles.fallbackPane} ${styles.fallbackDesigned}`}>Designed</div>
      <div className={`${styles.fallbackPane} ${styles.fallbackGlass}`}>in glass.</div>
      <div className={`${styles.fallbackPane} ${styles.fallbackCopy}`}>
        Author dispersion, transmission, and refraction in the browser.
      </div>
      <div className={`${styles.fallbackPane} ${styles.fallbackFooter}`}>
        <span>Open studio</span>
        <span>KHR_materials_dispersion</span>
      </div>
    </div>
  );
}

export function GlassHero({ variant = "page" }: GlassHeroProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sourceRef = useRef<HTMLDivElement>(null);
  const isPreview = variant === "preview";
  const [webglFailed, setWebglFailed] = useState(false);

  useEffect(() => {
    const mount = mountRef.current;
    const source = sourceRef.current;

    if (!mount || !source) {
      return;
    }

    const probeCanvas = document.createElement("canvas");
    const probeContext = probeCanvas.getContext("webgl2") || probeCanvas.getContext("webgl");
    const markWebglFailed = () => {
      window.setTimeout(() => setWebglFailed(true), 0);
    };

    if (!probeContext) {
      markWebglFailed();
      return;
    }

    let renderer: THREE.WebGLRenderer;

    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: "high-performance",
      });
    } catch {
      markWebglFailed();
      return;
    }

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 60);
    const textureCanvas = document.createElement("canvas");
    const htmlTexture = new THREE.CanvasTexture(textureCanvas);
    const pointer = new THREE.Vector2(0, 0);
    const targetPointer = new THREE.Vector2(0, 0);
    const glassGroup = new THREE.Group();
    const startTime = performance.now();
    const state = { disposed: false, frame: 0 };
    const paneRuntimes: PaneRuntime[] = [];
    const paneGeometries: THREE.BufferGeometry[] = [];
    const edgeGeometries: THREE.BufferGeometry[] = [];

    textureCanvas.width = TEXTURE_WIDTH;
    textureCanvas.height = TEXTURE_HEIGHT;

    htmlTexture.colorSpace = THREE.SRGBColorSpace;
    htmlTexture.magFilter = THREE.LinearFilter;
    htmlTexture.minFilter = THREE.LinearFilter;
    htmlTexture.wrapS = THREE.ClampToEdgeWrapping;
    htmlTexture.wrapT = THREE.ClampToEdgeWrapping;

    renderer.setClearColor(0x0a0a0c, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
    mount.appendChild(renderer.domElement);

    camera.position.set(0, 0, isPreview ? 9.2 : 9.6);

    const decalMaterial = new THREE.MeshBasicMaterial({
      map: htmlTexture,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    decalMaterial.polygonOffset = true;
    decalMaterial.polygonOffsetFactor = 1;
    decalMaterial.polygonOffsetUnits = 1;

    const glassMaterial = new THREE.MeshPhysicalMaterial({
      clearcoat: 1,
      clearcoatRoughness: 0.59,
      color: new THREE.Color("#ffffff"),
      ior: 2.14,
      metalness: 0,
      opacity: 0.18,
      roughness: 0.41,
      side: THREE.DoubleSide,
      specularColor: new THREE.Color("#ffffff"),
      specularIntensity: 1,
      thickness: 1.35,
      transmission: 0.2,
      transparent: true,
    });
    glassMaterial.depthWrite = false;
    const matcapGlow = new THREE.MeshBasicMaterial({
      blending: THREE.AdditiveBlending,
      color: new THREE.Color("#dfeaff"),
      depthWrite: false,
      opacity: 0.16,
      side: THREE.DoubleSide,
      transparent: true,
    });
    const rimMaterial = new THREE.LineBasicMaterial({
      color: 0xffffff,
      opacity: 0.56,
      transparent: true,
    });
    const cyanRimMaterial = new THREE.LineBasicMaterial({
      color: 0x74f7ff,
      opacity: 0.22,
      transparent: true,
    });
    const roseRimMaterial = new THREE.LineBasicMaterial({
      color: 0xff7ac8,
      opacity: 0.18,
      transparent: true,
    });

    PANE_SPECS.forEach((spec) => {
      const { center, geometry } = makePaneGeometry(spec);
      const pane = new THREE.Group();
      const decal = new THREE.Mesh(geometry, decalMaterial);
      const glass = new THREE.Mesh(geometry, glassMaterial);
      const glow = new THREE.Mesh(geometry, matcapGlow);
      const edgeGeometry = new THREE.EdgesGeometry(geometry, 18);
      const rim = new THREE.LineSegments(edgeGeometry, rimMaterial);
      const cyanRim = new THREE.LineSegments(edgeGeometry, cyanRimMaterial);
      const roseRim = new THREE.LineSegments(edgeGeometry, roseRimMaterial);

      decal.renderOrder = 1;
      glass.renderOrder = 2;
      glow.renderOrder = 3;
      rim.renderOrder = 4;
      cyanRim.renderOrder = 5;
      roseRim.renderOrder = 5;
      glass.position.z = 0.012;
      glow.position.z = 0.022;
      cyanRim.position.set(0.018, -0.012, 0.035);
      roseRim.position.set(-0.014, 0.01, 0.032);
      pane.position.set(center.x, center.y, spec.z);
      pane.rotation.set(...spec.rotation);
      pane.add(decal, glass, glow, rim, cyanRim, roseRim);
      glassGroup.add(pane);

      paneRuntimes.push({
        basePosition: pane.position.clone(),
        baseRotation: pane.rotation.clone(),
        floatOffset: spec.floatOffset,
        group: pane,
      });
      paneGeometries.push(geometry);
      edgeGeometries.push(edgeGeometry);
    });

    scene.add(glassGroup);

    const ambient = new THREE.AmbientLight(0xffffff, 1.35);
    const key = new THREE.SpotLight(0xffffff, 8.5, 18, Math.PI / 4, 0.48, 1);
    const cool = new THREE.PointLight(0xccddff, 5.2, 12);
    const mint = new THREE.PointLight(0x57ffa8, 2.4, 10);

    key.position.set(0, 7.1, 3);
    cool.position.set(0, -3, 2);
    mint.position.set(-3.5, 1.6, 2.4);
    scene.add(ambient, key, cool, mint);

    const resize = () => {
      const width = mount.clientWidth || window.innerWidth;
      const height = mount.clientHeight || window.innerHeight;
      const aspect = width / Math.max(height, 1);
      const visibleHeight =
        2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
      const visibleWidth = visibleHeight * aspect;
      const containScale = Math.min(visibleWidth / WORLD_WIDTH, visibleHeight / WORLD_HEIGHT);
      const tallScale = visibleHeight / WORLD_HEIGHT;
      const scale =
        width < 700 && !isPreview
          ? tallScale * 0.45
          : containScale * (isPreview ? 0.92 : 0.86);

      renderer.setSize(width, height, false);
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
      glassGroup.scale.setScalar(scale);
      glassGroup.position.set(
        isPreview ? 0 : width > 1080 ? -0.24 : width < 700 ? 0.58 : -0.1,
        isPreview ? -0.06 : -0.08,
        0,
      );
    };

    const syncTexture = async () => {
      try {
        await captureHeroToTextureCanvas(source, textureCanvas);

        if (!state.disposed) {
          htmlTexture.needsUpdate = true;
        }
      } catch {
        // 纹理失败时保留黑底，避免一次 Canvas 绘制错误拖垮 WebGL 预览。
      }
    };

    const handlePointerMove = (event: PointerEvent) => {
      const bounds = mount.getBoundingClientRect();
      const x = (event.clientX - bounds.left) / Math.max(bounds.width, 1);
      const y = (event.clientY - bounds.top) / Math.max(bounds.height, 1);

      targetPointer.set((x - 0.5) * 2, (0.5 - y) * 2);
    };

    const animate = () => {
      const elapsed = (performance.now() - startTime) / 1000;

      pointer.lerp(targetPointer, 0.075);
      glassGroup.rotation.y = THREE.MathUtils.lerp(
        glassGroup.rotation.y,
        pointer.x * 0.08 + Math.sin(elapsed * 0.28) * 0.025,
        0.08,
      );
      glassGroup.rotation.x = THREE.MathUtils.lerp(
        glassGroup.rotation.x,
        pointer.y * 0.055 + Math.cos(elapsed * 0.24) * 0.018,
        0.08,
      );

      paneRuntimes.forEach((runtime, index) => {
        const pulse = elapsed * (0.82 + index * 0.08) + runtime.floatOffset;
        runtime.group.position.z = runtime.basePosition.z + Math.sin(pulse) * 0.095;
        runtime.group.position.y = runtime.basePosition.y + Math.sin(pulse * 0.72) * 0.025;
        runtime.group.rotation.x =
          runtime.baseRotation.x + pointer.y * 0.045 + Math.cos(pulse) * 0.018;
        runtime.group.rotation.y =
          runtime.baseRotation.y + pointer.x * 0.055 + Math.sin(pulse * 0.9) * 0.02;
      });

      renderer.render(scene, camera);
      state.frame = window.requestAnimationFrame(animate);
    };

    resize();
    void syncTexture();
    if ("fonts" in document) {
      void document.fonts.ready.then(syncTexture);
    }
    animate();

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(mount);
    window.addEventListener("resize", resize);
    mount.addEventListener("pointermove", handlePointerMove);

    return () => {
      state.disposed = true;
      window.cancelAnimationFrame(state.frame);
      resizeObserver.disconnect();
      window.removeEventListener("resize", resize);
      mount.removeEventListener("pointermove", handlePointerMove);

      paneGeometries.forEach((geometry) => geometry.dispose());
      edgeGeometries.forEach((geometry) => geometry.dispose());
      htmlTexture.dispose();
      decalMaterial.dispose();
      glassMaterial.dispose();
      matcapGlow.dispose();
      rimMaterial.dispose();
      cyanRimMaterial.dispose();
      roseRimMaterial.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [isPreview]);

  if (isPreview) {
    return (
      <div className={`${styles.page} ${styles.previewRoot}`} aria-label="glass effect preview">
        <div ref={mountRef} className={styles.canvasMount} aria-hidden="true" />
        {webglFailed && <FallbackScene />}
        <FunBadge />
        <TextureSource sourceRef={sourceRef} />
      </div>
    );
  }

  return (
    <main className={styles.page}>
      <div ref={mountRef} className={styles.canvasMount} aria-hidden="true" />
      {webglFailed && <FallbackScene />}

      <Link className={styles.backLink} href="/effects">
        ← back
      </Link>

      <h1 className={styles.srTitle}>glass</h1>
      <FunBadge />
      <StaticControls />
      <TextureSource sourceRef={sourceRef} />
    </main>
  );
}
