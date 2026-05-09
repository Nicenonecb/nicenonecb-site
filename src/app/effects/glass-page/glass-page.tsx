"use client";

import type { RefObject } from "react";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { EffectBackLink } from "../effect-back-link";
import styles from "./glass-page.module.css";

const TEXTURE_WIDTH = 1440;
const TEXTURE_HEIGHT = 900;
const TEXTURE_Z = -3.08;

type GlassPageProps = {
  variant?: "page" | "preview";
};

type Point = [number, number];

type EdgeMaterials = {
  cyan: THREE.LineBasicMaterial;
  cyanBase: number;
  red: THREE.LineBasicMaterial;
  redBase: number;
  white: THREE.LineBasicMaterial;
  whiteBase: number;
};

type ShardSpec = {
  bevel: number;
  depth: number;
  drift: THREE.Vector3;
  id: string;
  phase: number;
  points: Point[];
  pointerWeight: number;
  position: THREE.Vector3;
  radial: THREE.Vector2;
  rotation: THREE.Euler;
  rotationDrift: THREE.Vector3;
  roughness: number;
  speed: number;
  thickness: number;
};

type ShardRuntime = {
  baseOpacity: number;
  basePosition: THREE.Vector3;
  baseRoughness: number;
  baseRotation: THREE.Euler;
  edgeMaterials: EdgeMaterials;
  glassMaterial: THREE.MeshPhysicalMaterial;
  group: THREE.Group;
  radial: THREE.Vector2;
  shatter: number;
} & Pick<ShardSpec, "drift" | "phase" | "pointerWeight" | "rotationDrift" | "speed">;

function getNodeText(source: HTMLElement, selector: string) {
  return source.querySelector(selector)?.textContent?.trim() ?? "";
}

function seededRandom(seed: number) {
  let value = seed >>> 0;

  return () => {
    value += 0x6d2b79f5;
    let mixed = value;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

function polygonArea(points: Point[]) {
  let area = 0;

  points.forEach((point, index) => {
    const next = points[(index + 1) % points.length];
    area += point[0] * next[1] - next[0] * point[1];
  });

  return area * 0.5;
}

function polygonCentroid(points: Point[]) {
  const signedArea = polygonArea(points) || 1;
  let x = 0;
  let y = 0;

  points.forEach((point, index) => {
    const next = points[(index + 1) % points.length];
    const factor = point[0] * next[1] - next[0] * point[1];
    x += (point[0] + next[0]) * factor;
    y += (point[1] + next[1]) * factor;
  });

  return new THREE.Vector2(x / (6 * signedArea), y / (6 * signedArea));
}

function drawBackdropTexture(source: HTMLElement, canvas: HTMLCanvasElement) {
  const context = canvas.getContext("2d");

  if (!context) {
    return;
  }

  const title = getNodeText(source, `.${styles.textureTitle}`) || "Liquid Glass Design";
  const label = getNodeText(source, `.${styles.textureLabel}`) || "Telecladius x Three.js";

  canvas.width = TEXTURE_WIDTH;
  canvas.height = TEXTURE_HEIGHT;
  context.clearRect(0, 0, TEXTURE_WIDTH, TEXTURE_HEIGHT);

  const base = context.createLinearGradient(0, 0, TEXTURE_WIDTH, TEXTURE_HEIGHT);
  base.addColorStop(0, "#030407");
  base.addColorStop(0.52, "#080b12");
  base.addColorStop(1, "#030407");
  context.fillStyle = base;
  context.fillRect(0, 0, TEXTURE_WIDTH, TEXTURE_HEIGHT);

  const coolGlow = context.createRadialGradient(980, 290, 0, 980, 290, 620);
  coolGlow.addColorStop(0, "rgba(142, 219, 255, 0.18)");
  coolGlow.addColorStop(0.5, "rgba(142, 219, 255, 0.05)");
  coolGlow.addColorStop(1, "rgba(3, 4, 7, 0)");
  context.fillStyle = coolGlow;
  context.fillRect(0, 0, TEXTURE_WIDTH, TEXTURE_HEIGHT);

  const mintGlow = context.createRadialGradient(255, 670, 0, 255, 670, 520);
  mintGlow.addColorStop(0, "rgba(155, 245, 209, 0.1)");
  mintGlow.addColorStop(1, "rgba(3, 4, 7, 0)");
  context.fillStyle = mintGlow;
  context.fillRect(0, 0, TEXTURE_WIDTH, TEXTURE_HEIGHT);

  context.save();
  context.globalCompositeOperation = "screen";
  context.fillStyle = "rgba(255, 255, 255, 0.14)";
  for (let index = 0; index < 9; index += 1) {
    context.fillRect((index % 2) * 180, 110 + index * 73, TEXTURE_WIDTH * 0.64, 4);
  }
  context.restore();

  let fontSize = 142;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = `900 ${fontSize}px Arial, Helvetica, sans-serif`;

  while (context.measureText(title).width > TEXTURE_WIDTH * 0.86 && fontSize > 52) {
    fontSize -= 4;
    context.font = `900 ${fontSize}px Arial, Helvetica, sans-serif`;
  }

  context.shadowColor = "rgba(255,255,255,0.25)";
  context.shadowBlur = fontSize * 0.13;
  context.fillStyle = "rgba(248, 249, 253, 0.96)";
  context.fillText(title, TEXTURE_WIDTH * 0.5, TEXTURE_HEIGHT * 0.48);

  context.shadowBlur = 0;
  context.font = "700 18px Arial, Helvetica, sans-serif";
  context.fillStyle = "rgba(248, 248, 251, 0.62)";
  context.fillText(label.toUpperCase(), TEXTURE_WIDTH * 0.5, TEXTURE_HEIGHT * 0.68);
}

function createEnvironmentMap(renderer: THREE.WebGLRenderer) {
  const envCanvas = document.createElement("canvas");
  const context = envCanvas.getContext("2d");

  envCanvas.width = 1024;
  envCanvas.height = 512;

  if (!context) {
    return null;
  }

  const base = context.createLinearGradient(0, 0, envCanvas.width, envCanvas.height);
  base.addColorStop(0, "#020307");
  base.addColorStop(0.18, "#ffffff");
  base.addColorStop(0.24, "#7fdcff");
  base.addColorStop(0.42, "#07101c");
  base.addColorStop(0.58, "#ffffff");
  base.addColorStop(0.64, "#b7ffed");
  base.addColorStop(0.82, "#0b0c12");
  base.addColorStop(1, "#020307");
  context.fillStyle = base;
  context.fillRect(0, 0, envCanvas.width, envCanvas.height);

  context.globalCompositeOperation = "screen";
  for (let index = 0; index < 9; index += 1) {
    const y = 36 + index * 52;
    context.fillStyle = `rgba(255, 255, 255, ${index % 3 === 0 ? 0.22 : 0.1})`;
    context.fillRect((index % 2) * 120, y, envCanvas.width * 0.72, 4 + (index % 3) * 2);
  }

  const texture = new THREE.CanvasTexture(envCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.mapping = THREE.EquirectangularReflectionMapping;

  const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = pmrem.fromEquirectangular(texture).texture;
  texture.dispose();
  pmrem.dispose();

  return environment;
}

function createLightBands() {
  const group = new THREE.Group();
  const specs: Array<[number, number, number, number, number, number, number, number]> = [
    [-2.8, 1.45, -1.78, 3.2, 0.035, 0.13, 0x9edaff, 0.24],
    [2.7, -1.24, -1.76, 3, 0.032, -0.1, 0x9bf5d1, 0.16],
    [0, 2.05, -1.82, 5.2, 0.026, 0.02, 0xffffff, 0.13],
    [-0.55, -1.92, -1.8, 4.2, 0.024, -0.03, 0xc7f6ff, 0.1],
  ];

  specs.forEach(([x, y, z, width, height, rotation, color, opacity]) => {
    const material = new THREE.MeshBasicMaterial({
      blending: THREE.AdditiveBlending,
      color,
      depthWrite: false,
      opacity,
      transparent: true,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
    mesh.position.set(x, y, z);
    mesh.rotation.z = rotation;
    group.add(mesh);
  });

  return group;
}

function fractureSpecs(isMobile: boolean, isPreview: boolean) {
  const layout = isPreview
    ? { columns: 6, height: 5.35, rows: 4, seed: 4227, width: 8.95 }
    : isMobile
      ? { columns: 5, height: 8.08, rows: 8, seed: 8143, width: 4.72 }
      : { columns: 9, height: 5.78, rows: 6, seed: 5297, width: 9.7 };
  const rng = seededRandom(layout.seed);
  const cellWidth = layout.width / layout.columns;
  const cellHeight = layout.height / layout.rows;
  const nodes: Point[][] = [];

  for (let row = 0; row <= layout.rows; row += 1) {
    nodes[row] = [];

    for (let col = 0; col <= layout.columns; col += 1) {
      const isEdge =
        row === 0 || col === 0 || row === layout.rows || col === layout.columns;
      const jitterX = isEdge ? 0 : (rng() - 0.5) * cellWidth * 0.42;
      const jitterY = isEdge ? 0 : (rng() - 0.5) * cellHeight * 0.42;
      nodes[row][col] = [
        col * cellWidth - layout.width / 2 + jitterX,
        layout.height / 2 - row * cellHeight + jitterY,
      ];
    }
  }

  const specs: ShardSpec[] = [];

  for (let row = 0; row < layout.rows; row += 1) {
    for (let col = 0; col < layout.columns; col += 1) {
      const cell = [
        nodes[row][col],
        nodes[row][col + 1],
        nodes[row + 1][col + 1],
        nodes[row + 1][col],
      ];
      const centroid = polygonCentroid(cell);
      const area = Math.abs(polygonArea(cell));
      const radial = new THREE.Vector2(centroid.x, centroid.y);
      const radialLength = Math.max(radial.length(), 0.001);
      const gapScale = isPreview ? 0.945 : 0.954;
      const outward = 0.046 + rng() * (isMobile ? 0.08 : 0.105);
      const depthLift = (area / (layout.width * layout.height)) * (isMobile ? 1.12 : 1.42);

      radial.divideScalar(radialLength);

      specs.push({
        id: `${row}-${col}`,
        points: cell.map(
          ([x, y]) => [(x - centroid.x) * gapScale, (y - centroid.y) * gapScale] as Point,
        ),
        bevel: Math.min(isMobile ? 0.088 : 0.108, Math.sqrt(area) * 0.095),
        depth: 0.16 + rng() * 0.11,
        drift: new THREE.Vector3(
          0.018 + rng() * 0.03,
          0.016 + rng() * 0.026,
          0.06 + rng() * 0.095,
        ),
        phase: row * 0.67 + col * 0.41 + rng() * 4,
        pointerWeight: 0.038 + rng() * 0.052,
        position: new THREE.Vector3(
          centroid.x + radial.x * outward,
          centroid.y + radial.y * outward,
          0.26 + depthLift + rng() * 0.18,
        ),
        radial,
        rotation: new THREE.Euler(
          (rng() - 0.5) * 0.074,
          (rng() - 0.5) * 0.086,
          (rng() - 0.5) * 0.052,
        ),
        rotationDrift: new THREE.Vector3(
          0.014 + rng() * 0.026,
          0.017 + rng() * 0.03,
          0.007 + rng() * 0.016,
        ),
        roughness: (row + col) % 7 === 0 ? 0.08 + rng() * 0.035 : 0.012 + rng() * 0.038,
        speed: 0.26 + rng() * 0.18,
        thickness: 1.3 + rng() * 1.35,
      });
    }
  }

  return specs;
}

function shardGeometry(spec: ShardSpec, isMobile: boolean) {
  const shape = new THREE.Shape();

  spec.points.forEach(([x, y], index) => {
    if (index === 0) {
      shape.moveTo(x, y);
    } else {
      shape.lineTo(x, y);
    }
  });
  shape.closePath();

  const geometry = new THREE.ExtrudeGeometry(shape, {
    bevelEnabled: true,
    bevelSegments: isMobile ? 7 : 11,
    bevelSize: spec.bevel,
    bevelThickness: spec.bevel,
    curveSegments: 2,
    depth: spec.depth,
    steps: 2,
  });

  geometry.center();
  geometry.computeVertexNormals();

  return geometry;
}

function glassMaterial(spec: ShardSpec) {
  const material = new THREE.MeshPhysicalMaterial({
    attenuationColor: new THREE.Color(0xe5f8ff),
    attenuationDistance: 12,
    clearcoat: 1,
    clearcoatRoughness: Math.min(0.12, spec.roughness + 0.035),
    color: 0xf7fbff,
    envMapIntensity: 2.1,
    ior: 1.55,
    metalness: 0,
    opacity: 0.76,
    roughness: spec.roughness,
    side: THREE.DoubleSide,
    specularIntensity: 1,
    thickness: spec.thickness,
    transmission: 1,
    transparent: true,
  });

  // Three 版本不同，dispersion 字段可能不在类型里；运行时存在时再启用色散。
  if ("dispersion" in material) {
    (material as THREE.MeshPhysicalMaterial & { dispersion: number }).dispersion =
      spec.roughness > 0.08 ? 1.65 : 2.75;
  }

  return material;
}

function addEdges(pane: THREE.Group, geometry: THREE.BufferGeometry, spec: ShardSpec) {
  const edgeGeometry = new THREE.EdgesGeometry(geometry, 18);
  const white = new THREE.LineBasicMaterial({
    blending: THREE.AdditiveBlending,
    color: 0xffffff,
    depthWrite: false,
    opacity: spec.roughness > 0.08 ? 0.32 : 0.44,
    transparent: true,
  });
  const cyan = new THREE.LineBasicMaterial({
    blending: THREE.AdditiveBlending,
    color: 0x72e8ff,
    depthWrite: false,
    opacity: 0.18,
    transparent: true,
  });
  const red = new THREE.LineBasicMaterial({
    blending: THREE.AdditiveBlending,
    color: 0xff6f8d,
    depthWrite: false,
    opacity: 0.14,
    transparent: true,
  });

  const edge = new THREE.LineSegments(edgeGeometry, white);
  const cyanEdge = new THREE.LineSegments(edgeGeometry.clone(), cyan);
  const redEdge = new THREE.LineSegments(edgeGeometry.clone(), red);

  cyanEdge.position.set(0.012, -0.004, -0.01);
  redEdge.position.set(-0.012, 0.004, 0.008);
  pane.add(edge, cyanEdge, redEdge);

  return {
    cyan,
    cyanBase: cyan.opacity,
    red,
    redBase: red.opacity,
    white,
    whiteBase: white.opacity,
  };
}

function viewportAtZ(camera: THREE.PerspectiveCamera, z: number) {
  const distance = camera.position.z - z;
  const height = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5)) * distance;

  return { height, width: height * camera.aspect };
}

function disposeGroup(group: THREE.Group) {
  group.traverse((node) => {
    const object = node as THREE.Object3D & {
      geometry?: THREE.BufferGeometry;
      material?: THREE.Material | THREE.Material[];
    };

    object.geometry?.dispose();

    if (object.material) {
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach((material) => material.dispose());
    }
  });
}

function TextureSource({ sourceRef }: { sourceRef: RefObject<HTMLDivElement | null> }) {
  return (
    <div ref={sourceRef} className={styles.textureSource} aria-hidden="true">
      <p className={styles.textureLabel}>Telecladius x Three.js</p>
      <h2 className={styles.textureTitle}>Liquid Glass Design</h2>
    </div>
  );
}

function FallbackScene() {
  return (
    <div className={styles.fallbackScene} aria-hidden="true">
      <div className={`${styles.fallbackPane} ${styles.fallbackTop}`}>
        <span>Liquid</span>
        <span>Glass / Parallax / Fracture</span>
      </div>
      <div className={`${styles.fallbackPane} ${styles.fallbackDesigned}`}>Liquid</div>
      <div className={`${styles.fallbackPane} ${styles.fallbackGlass}`}>Glass</div>
      <div className={`${styles.fallbackPane} ${styles.fallbackCopy}`}>
        Refraction, chromatic rims, and pointer-driven shard movement.
      </div>
      <div className={`${styles.fallbackPane} ${styles.fallbackFooter}`}>
        <span>Three.js</span>
        <span>MeshPhysicalMaterial</span>
      </div>
    </div>
  );
}

export function GlassPage({ variant = "page" }: GlassPageProps) {
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

    const isMobileQuery = window.matchMedia("(max-width: 760px), (pointer: coarse)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let isMobile = isMobileQuery.matches && !isPreview;
    let renderer: THREE.WebGLRenderer;

    try {
      renderer = new THREE.WebGLRenderer({
        alpha: false,
        antialias: !isMobile,
        powerPreference: "high-performance",
      });
    } catch {
      markWebglFailed();
      return;
    }

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(isMobile ? 39 : 34, 1, 0.1, 80);
    const rig = new THREE.Group();
    const textRig = new THREE.Group();
    const glassRig = new THREE.Group();
    const clock = new THREE.Clock();
    const pointer = new THREE.Vector2(0.16, 0.04);
    const pointerTarget = new THREE.Vector2(0.16, 0.04);
    const pointerWorld = new THREE.Vector2();
    const state = { disposed: false, frame: 0 };
    const openReveal = { current: 0, target: 0 };
    const shards: ShardRuntime[] = [];
    const textureCanvas = document.createElement("canvas");
    const backdropTexture = new THREE.CanvasTexture(textureCanvas);
    const backdropMaterial = new THREE.MeshBasicMaterial({
      map: backdropTexture,
      toneMapped: false,
    });
    const backdrop = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), backdropMaterial);
    const lightBands = createLightBands();

    backdropTexture.colorSpace = THREE.SRGBColorSpace;
    backdropTexture.magFilter = THREE.LinearFilter;
    backdropTexture.minFilter = THREE.LinearFilter;
    backdropTexture.wrapS = THREE.ClampToEdgeWrapping;
    backdropTexture.wrapT = THREE.ClampToEdgeWrapping;

    renderer.setClearColor(0x030407, 1);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isPreview ? 1.35 : isMobile ? 1.35 : 1.9));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    if ("transmissionResolutionScale" in renderer) {
      (renderer as THREE.WebGLRenderer & { transmissionResolutionScale: number }).transmissionResolutionScale =
        isPreview ? 0.72 : isMobile ? 0.88 : 1;
    }
    mount.appendChild(renderer.domElement);

    scene.background = new THREE.Color(0x030407);
    scene.environment = createEnvironmentMap(renderer);
    scene.add(rig);
    rig.add(textRig, glassRig, lightBands);
    textRig.add(backdrop);
    backdrop.position.z = TEXTURE_Z;
    backdrop.renderOrder = -4;

    scene.add(new THREE.HemisphereLight(0xe8f0ff, 0x07040b, 1.1));
    const keyLight = new THREE.DirectionalLight(0xffffff, 3.4);
    const edgeLight = new THREE.PointLight(0x8bdcff, 14, 12);
    const warmLight = new THREE.PointLight(0x9bf5d1, 5.6, 12);
    keyLight.position.set(-3.8, 4.4, 5.6);
    edgeLight.position.set(3.1, 1.4, 3.4);
    warmLight.position.set(-4.4, -2.2, 3.2);
    scene.add(keyLight, edgeLight, warmLight);

    const pixelRatio = () =>
      Math.min(window.devicePixelRatio || 1, isPreview ? 1.35 : isMobile ? 1.35 : 1.9);

    const cameraDistance = () => (isPreview ? 10.4 : isMobile ? 11.4 : 9.35);

    const drawTexture = () => {
      drawBackdropTexture(source, textureCanvas);
      backdropTexture.needsUpdate = true;
    };

    const updateBackdropLayout = () => {
      const viewport = viewportAtZ(camera, TEXTURE_Z);
      backdrop.geometry.dispose();
      backdrop.geometry = new THREE.PlaneGeometry(viewport.width * 1.18, viewport.height * 1.18);
    };

    const clearGlassRig = () => {
      shards.length = 0;
      while (glassRig.children.length) {
        const child = glassRig.children[0];
        glassRig.remove(child);
        disposeGroup(child as THREE.Group);
      }
    };

    const buildGlassRig = () => {
      clearGlassRig();

      fractureSpecs(isMobile, isPreview).forEach((spec, index) => {
        const pane = new THREE.Group();
        const geometry = shardGeometry(spec, isMobile);
        const material = glassMaterial(spec);
        const mesh = new THREE.Mesh(geometry, material);
        const edgeMaterials = addEdges(pane, geometry, spec);

        mesh.renderOrder = 4 + index;
        pane.add(mesh);
        pane.position.copy(spec.position);
        pane.rotation.copy(spec.rotation);
        glassRig.add(pane);
        shards.push({
          baseOpacity: material.opacity,
          basePosition: spec.position.clone(),
          baseRoughness: material.roughness,
          baseRotation: spec.rotation.clone(),
          drift: spec.drift,
          edgeMaterials,
          glassMaterial: material,
          group: pane,
          phase: spec.phase,
          pointerWeight: spec.pointerWeight,
          radial: spec.radial,
          rotationDrift: spec.rotationDrift,
          shatter: 0,
          speed: reducedMotion ? 0.12 : spec.speed,
        });
      });
    };

    const applyGlassLayout = () => {
      const scale = isPreview ? 0.82 : isMobile ? 0.96 : 1.025;
      glassRig.scale.setScalar(scale);
      glassRig.position.set(isPreview ? 0 : isMobile ? 0.02 : 0, isPreview ? -0.04 : isMobile ? 0.08 : 0, 0.08);
    };

    const resize = () => {
      const layoutChanged = isMobile !== (isMobileQuery.matches && !isPreview);
      isMobile = isMobileQuery.matches && !isPreview;
      const width = mount.clientWidth || window.innerWidth;
      const height = mount.clientHeight || window.innerHeight;

      camera.fov = isMobile ? 39 : 34;
      camera.aspect = width / Math.max(height, 1);
      camera.position.z = cameraDistance();
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(pixelRatio());
      renderer.setSize(width, height, false);
      if ("transmissionResolutionScale" in renderer) {
        (renderer as THREE.WebGLRenderer & { transmissionResolutionScale: number }).transmissionResolutionScale =
          isPreview ? 0.72 : isMobile ? 0.88 : 1;
      }
      updateBackdropLayout();
      applyGlassLayout();
      if (layoutChanged) {
        buildGlassRig();
        applyGlassLayout();
      }
    };

    const updatePointer = (clientX: number, clientY: number) => {
      const bounds = mount.getBoundingClientRect();
      const x = (clientX - bounds.left) / Math.max(bounds.width, 1);
      const y = (clientY - bounds.top) / Math.max(bounds.height, 1);

      pointerTarget.set((x - 0.5) * 2, (0.5 - y) * 2);
    };

    const handlePointerMove = (event: PointerEvent) => {
      updatePointer(event.clientX, event.clientY);
    };

    const handlePointerLeave = () => {
      pointerTarget.set(0.16, 0.04);
    };

    const handlePointerDown = () => {
      openReveal.target = openReveal.target > 0 ? 0 : 1;
    };

    const updatePointerWorld = () => {
      pointerWorld.set(pointer.x * (isMobile ? 2.22 : 4.86), pointer.y * (isMobile ? 3.86 : 2.84));
    };

    const updatePaneMaterial = (runtime: ShardRuntime, hidden: number) => {
      const shatter = runtime.shatter;
      const visibility = Math.pow(1 - hidden, 1.65);

      runtime.glassMaterial.opacity = (runtime.baseOpacity + shatter * 0.1) * visibility;
      runtime.glassMaterial.roughness = Math.min(0.14, runtime.baseRoughness + shatter * 0.048);
      runtime.edgeMaterials.white.opacity =
        (runtime.edgeMaterials.whiteBase + shatter * 0.34) * visibility;
      runtime.edgeMaterials.cyan.opacity =
        (runtime.edgeMaterials.cyanBase + shatter * 0.22) * visibility;
      runtime.edgeMaterials.red.opacity =
        (runtime.edgeMaterials.redBase + shatter * 0.2) * visibility;
    };

    const animate = () => {
      const elapsed = clock.elapsedTime;

      pointer.lerp(pointerTarget, reducedMotion ? 0.04 : 0.075);
      openReveal.current +=
        (openReveal.target - openReveal.current) * (reducedMotion ? 0.08 : 0.12);
      camera.position.x += (pointer.x * (isMobile ? 0.22 : 0.38) - camera.position.x) * 0.052;
      camera.position.y += (-pointer.y * (isMobile ? 0.18 : 0.27) - camera.position.y) * 0.052;
      camera.lookAt(0, 0, 0);

      textRig.position.x += (-pointer.x * (isMobile ? 0.34 : 0.56) - textRig.position.x) * 0.055;
      textRig.position.y += (pointer.y * (isMobile ? 0.24 : 0.36) - textRig.position.y) * 0.055;
      textRig.position.z = Math.sin(elapsed * 0.28) * 0.018;
      textRig.rotation.x += (pointer.y * (isMobile ? 0.018 : 0.028) - textRig.rotation.x) * 0.055;
      textRig.rotation.y += (pointer.x * (isMobile ? 0.026 : 0.042) - textRig.rotation.y) * 0.055;

      glassRig.rotation.x += (-pointer.y * (isMobile ? 0.045 : 0.064) - glassRig.rotation.x) * 0.048;
      glassRig.rotation.y += (pointer.x * (isMobile ? 0.052 : 0.078) - glassRig.rotation.y) * 0.048;
      updatePointerWorld();

      shards.forEach((runtime, index) => {
        const t = elapsed * runtime.speed + runtime.phase;
        const pointerDistance = pointerWorld.distanceTo(runtime.basePosition);
        const revealRadius = isMobile ? 2.85 : 2.55;
        const reveal = Math.pow(Math.max(0, 1 - pointerDistance / revealRadius), 2);
        const hoverReveal = THREE.MathUtils.smoothstep(reveal, 0.04, 0.34);
        const hidden = THREE.MathUtils.clamp(
          Math.max(hoverReveal, openReveal.current),
          0,
          0.94,
        );
        const shatterTarget = reveal * (isMobile ? 0.28 : 0.36);
        const shatterEase = shatterTarget > runtime.shatter ? 0.092 : 0.018;
        const awayX = runtime.basePosition.x - pointerWorld.x;
        const awayY = runtime.basePosition.y - pointerWorld.y;
        const awayLength = Math.max(Math.hypot(awayX, awayY), 0.001);
        const shatter = reducedMotion ? runtime.shatter * 0.18 : runtime.shatter;
        const revealSpread = reveal * (isMobile ? 0.18 : 0.24) + hidden * (isMobile ? 0.48 : 0.72);
        const shatterSpread = shatter * (isMobile ? 0.46 : 0.68);
        const pointerSlide = runtime.pointerWeight * (isMobile ? 1.45 : 1.9);

        // 指针附近的玻璃会顺着离心方向张开，形成参考 demo 的碎片化 reveal。
        runtime.shatter += (shatterTarget - runtime.shatter) * shatterEase;
        runtime.shatter = THREE.MathUtils.clamp(runtime.shatter * 0.992, 0, 1.15);
        runtime.group.position.x =
          runtime.basePosition.x +
          Math.sin(t * 0.42) * runtime.drift.x +
          pointer.x * pointerSlide +
          (awayX / awayLength) * (revealSpread + shatterSpread) +
          runtime.radial.x * openReveal.current * (isMobile ? 0.52 : 0.9);
        runtime.group.position.y =
          runtime.basePosition.y +
          Math.cos(t * 0.38) * runtime.drift.y -
          pointer.y * pointerSlide * 0.72 +
          (awayY / awayLength) * (revealSpread + shatterSpread * 0.84) +
          runtime.radial.y * openReveal.current * (isMobile ? 0.52 : 0.9);
        runtime.group.position.z =
          runtime.basePosition.z +
          Math.sin(t * 0.52 + index) * runtime.drift.z +
          reveal * (isMobile ? 0.2 : 0.32) +
          shatter * (isMobile ? 0.48 : 0.74) +
          hidden * (isMobile ? 0.82 : 1.18);
        runtime.group.rotation.x =
          runtime.baseRotation.x +
          Math.sin(t * 0.46) * runtime.rotationDrift.x -
          pointer.y * runtime.pointerWeight * 1.15 +
          reveal * (awayY / awayLength) * 0.16 +
          shatter * (awayY / awayLength) * (isMobile ? 0.38 : 0.58);
        runtime.group.rotation.y =
          runtime.baseRotation.y +
          Math.cos(t * 0.43) * runtime.rotationDrift.y +
          pointer.x * runtime.pointerWeight * 1.38 -
          reveal * (awayX / awayLength) * 0.2 -
          shatter * (awayX / awayLength) * (isMobile ? 0.44 : 0.66);
        runtime.group.rotation.z =
          runtime.baseRotation.z +
          Math.sin(t * 0.34) * runtime.rotationDrift.z +
          reveal * Math.sin(t + index) * 0.028 +
          shatter * (runtime.radial.x * awayY - runtime.radial.y * awayX) * 0.18 +
          openReveal.current * runtime.radial.x * 0.16;
        updatePaneMaterial(runtime, hidden);
      });

      edgeLight.position.x = 3.1 + pointer.x * 0.9;
      edgeLight.position.y = 1.4 + pointer.y * 0.55;
      warmLight.position.x = -4.4 - pointer.x * 0.65;
      renderer.render(scene, camera);
      state.frame = window.requestAnimationFrame(animate);
    };

    drawTexture();
    buildGlassRig();
    resize();
    animate();

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(mount);
    window.addEventListener("resize", resize);
    isMobileQuery.addEventListener("change", resize);
    mount.addEventListener("pointermove", handlePointerMove);
    mount.addEventListener("pointerleave", handlePointerLeave);
    mount.addEventListener("pointerdown", handlePointerDown);

    return () => {
      state.disposed = true;
      window.cancelAnimationFrame(state.frame);
      resizeObserver.disconnect();
      window.removeEventListener("resize", resize);
      isMobileQuery.removeEventListener("change", resize);
      mount.removeEventListener("pointermove", handlePointerMove);
      mount.removeEventListener("pointerleave", handlePointerLeave);
      mount.removeEventListener("pointerdown", handlePointerDown);
      clearGlassRig();
      disposeGroup(lightBands);
      backdrop.geometry.dispose();
      backdropMaterial.dispose();
      backdropTexture.dispose();
      scene.environment?.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [isPreview]);

  if (isPreview) {
    return (
      <div className={`${styles.page} ${styles.previewRoot}`} aria-label="glass effect preview">
        <div ref={mountRef} className={styles.canvasMount} aria-hidden="true" />
        {webglFailed && <FallbackScene />}
        <TextureSource sourceRef={sourceRef} />
      </div>
    );
  }

  return (
    <main className={styles.page}>
      <div ref={mountRef} className={styles.canvasMount} aria-hidden="true" />
      {webglFailed && <FallbackScene />}

      <EffectBackLink />

      <h1 className={styles.srTitle}>Liquid Glass Design</h1>
      <TextureSource sourceRef={sourceRef} />
    </main>
  );
}
