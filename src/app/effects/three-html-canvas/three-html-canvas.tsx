"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import styles from "./three-html-canvas.module.css";

type ThreeHtmlCanvasProps = {
  variant?: "detail" | "preview";
};

type Runtime = {
  animationFrame: number;
  camera: THREE.PerspectiveCamera;
  flatMaterial: THREE.MeshBasicMaterial;
  flatPlane: THREE.Mesh;
  group3d: THREE.Group;
  posterTexture: THREE.CanvasTexture;
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  smoothProgress: number;
  targetProgress: number;
  viewDistance: number;
};

const posterSize = { height: 900, width: 1600 };
const cardRed = "#ff4038";
const ink = "#1d1d1f";

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function lerp(from: number, to: number, amount: number) {
  return from + (to - from) * amount;
}

function smoothstep(edge0: number, edge1: number, value: number) {
  const t = clamp((value - edge0) / (edge1 - edge0));

  return t * t * (3 - 2 * t);
}

function pulse(edge0: number, edge1: number, edge2: number, edge3: number, value: number) {
  return smoothstep(edge0, edge1, value) * (1 - smoothstep(edge2, edge3, value));
}

function drawHeading(context: CanvasRenderingContext2D, text: string, x: number, y: number, align: CanvasTextAlign) {
  context.save();
  context.fillStyle = ink;
  context.font = "900 132px Arial, Helvetica, sans-serif";
  context.textAlign = align;
  context.textBaseline = "top";
  context.fillText(text, x, y);
  context.restore();
}

function drawCardText(context: CanvasRenderingContext2D, x: number, y: number, width: number) {
  context.save();
  context.fillStyle = ink;
  context.textAlign = "left";
  context.textBaseline = "top";
  context.font = "900 44px Arial, Helvetica, sans-serif";
  context.fillText("Cullen Webber", x, y);
  context.font = "900 16px Arial, Helvetica, sans-serif";
  context.fillText("TM", x + 338, y + 2);
  context.font = "800 24px Arial, Helvetica, sans-serif";
  const boldLines = ["Lorem ipsum dolor sit amet,", "consectetur adipiscing elit, sed", "do eiusmod tempor incididunt ut", "labore et dolore magna aliqua."];

  boldLines.forEach((line, index) => {
    context.fillText(line, x, y + 88 + index * 32);
  });

  context.font = "500 21px Arial, Helvetica, sans-serif";
  const bodyLines = ["Lorem ipsum dolor sit amet, consectetur", "adipiscing elit, sed do eiusmod tempor."];

  bodyLines.forEach((line, index) => {
    context.fillText(line, x, y + 270 + index * 28);
  });

  context.strokeStyle = ink;
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(x, y + 20);
  context.lineTo(x - 8, y + 20);
  context.stroke();
  context.fillRect(x - 11, y + 108, 2, 2);
  context.fillRect(x + width - 12, y + 106, 2, 2);
  context.fillRect(x - 10, y + 330, 2, 2);
  context.restore();
}

function createPosterCanvas() {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  canvas.width = posterSize.width;
  canvas.height = posterSize.height;

  if (!context) {
    return canvas;
  }

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  drawHeading(context, "Designing", 800, -72, "center");
  drawHeading(context, "Motion", 1015, 70, "center");
  drawHeading(context, "Crafting", 540, 245, "right");
  drawHeading(context, "Depth", 600, 390, "right");
  drawHeading(context, "Into", 1130, 520, "left");
  drawHeading(context, "Living", 1225, 665, "left");
  drawHeading(context, "Worlds", 1035, 810, "left");

  context.fillStyle = cardRed;
  context.fillRect(550, 140, 500, 500);
  drawCardText(context, 590, 180, 420);

  context.fillStyle = "#111111";
  context.font = "900 22px Arial, Helvetica, sans-serif";
  context.textAlign = "center";
  context.fillText("SCROLL DOWN", 800, 724);

  return canvas;
}

function createCardCanvas() {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  canvas.width = 900;
  canvas.height = 900;

  if (!context) {
    return canvas;
  }

  context.fillStyle = cardRed;
  context.fillRect(0, 0, canvas.width, canvas.height);
  drawCardText(context, 74, 90, 720);

  return canvas;
}

function createTextCanvas(text: string, width: number, height: number, size: number) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  canvas.width = width;
  canvas.height = height;

  if (!context) {
    return canvas;
  }

  context.clearRect(0, 0, width, height);
  context.fillStyle = ink;
  context.font = `900 ${size}px Arial, Helvetica, sans-serif`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(text, width / 2, height / 2);

  return canvas;
}

function createTexture(canvas: HTMLCanvasElement) {
  const texture = new THREE.CanvasTexture(canvas);

  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.needsUpdate = true;

  return texture;
}

function createRoundedShape(width: number, height: number, radius: number) {
  const x = -width / 2;
  const y = -height / 2;
  const shape = new THREE.Shape();

  shape.moveTo(x + radius, y);
  shape.lineTo(x + width - radius, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + radius);
  shape.lineTo(x + width, y + height - radius);
  shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  shape.lineTo(x + radius, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - radius);
  shape.lineTo(x, y + radius);
  shape.quadraticCurveTo(x, y, x + radius, y);

  return shape;
}

function createArch(material: THREE.Material) {
  const group = new THREE.Group();
  const torus = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.072, 24, 72, Math.PI), material);

  torus.position.y = 0.08;
  group.add(torus);

  for (const x of [-0.62, 0.62]) {
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.074, 0.074, 1.15, 24), material);

    pillar.position.set(x, -0.52, 0);
    group.add(pillar);
  }

  return group;
}

function createTextPlane(text: string, width: number, height: number, fontSize: number) {
  const texture = createTexture(createTextCanvas(text, 1200, 280, fontSize));
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);

  mesh.userData.texture = texture;

  return mesh;
}

function createScene() {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);

  camera.position.set(0, 0, 8);
  scene.background = new THREE.Color("#ffffff");
  scene.add(new THREE.AmbientLight(0xffffff, 1.35));

  const keyLight = new THREE.DirectionalLight(0xffffff, 1.5);

  keyLight.position.set(2.6, 4.2, 5.5);
  scene.add(keyLight);

  const posterTexture = createTexture(createPosterCanvas());
  const flatMaterial = new THREE.MeshBasicMaterial({ map: posterTexture, transparent: true });
  const flatPlane = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), flatMaterial);

  scene.add(flatPlane);

  const group3d = createDepthGroup();

  group3d.visible = false;
  scene.add(group3d);

  return { camera, flatMaterial, flatPlane, group3d, posterTexture, scene };
}

function createDepthGroup() {
  const group = new THREE.Group();
  const red = new THREE.MeshStandardMaterial({ color: cardRed, roughness: 0.46, metalness: 0.03 });
  const redDark = new THREE.MeshStandardMaterial({ color: "#d92e27", roughness: 0.55, metalness: 0.02 });
  const white = new THREE.MeshStandardMaterial({ color: "#f8f8f4", roughness: 0.38, metalness: 0.08 });
  const cardTexture = createTexture(createCardCanvas());
  const cardMaterial = new THREE.MeshBasicMaterial({ map: cardTexture, side: THREE.DoubleSide });
  const rounded = createRoundedShape(2.75, 2.75, 0.24);

  for (let index = 0; index < 3; index += 1) {
    const slab = new THREE.Mesh(new THREE.ShapeGeometry(rounded), index === 0 ? cardMaterial : red);

    slab.position.set(0.98 - index * 0.92, 0.03 - index * 0.08, 0.42 - index * 0.72);
    slab.rotation.set(-0.08 + index * 0.02, -0.24 + index * 0.16, 0.04 - index * 0.08);
    slab.scale.setScalar(1 - index * 0.08);
    group.add(slab);
  }

  const floorText = createTextPlane("Crafting Depth", 6.6, 1.55, 170);

  floorText.position.set(-0.9, -1.5, 1.05);
  floorText.rotation.set(-Math.PI / 2.18, 0, -0.16);
  group.add(floorText);

  const rearText = createTextPlane("Designing Motion", 6.2, 1.45, 150);

  rearText.position.set(0.38, 1.42, -1.9);
  rearText.rotation.set(0.16, 0.08, -0.08);
  group.add(rearText);

  for (let index = 0; index < 5; index += 1) {
    const step = new THREE.Mesh(new THREE.BoxGeometry(1.6 - index * 0.11, 0.09, 0.24), index % 2 === 0 ? red : redDark);

    step.position.set(-0.82 + index * 0.13, -0.92 + index * 0.1, 0.7 - index * 0.18);
    step.rotation.y = -0.16;
    group.add(step);
  }

  const archBack = createArch(white);

  archBack.position.set(-0.92, -0.12, 0.48);
  archBack.rotation.set(0.05, -0.22, 0);
  archBack.scale.set(1.13, 1.13, 1.13);
  group.add(archBack);

  const archFront = createArch(red);

  archFront.position.set(-1.04, -0.2, 0.74);
  archFront.rotation.set(0.05, -0.22, 0);
  archFront.scale.set(0.82, 0.82, 0.82);
  group.add(archFront);

  for (const item of [
    { color: red, height: 1.34, x: -1.72, z: 0.9 },
    { color: white, height: 1.72, x: 0.02, z: 0.55 },
    { color: red, height: 1.5, x: 0.2, z: 0.72 },
  ]) {
    const column = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, item.height, 32), item.color);

    column.position.set(item.x, -0.23, item.z);
    column.rotation.z = -0.05;
    group.add(column);

    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.18, 32, 18), item.color);

    cap.position.set(item.x - 0.02, -0.23 + item.height / 2 + 0.08, item.z);
    group.add(cap);
  }

  for (const item of [
    { radius: 0.38, x: -0.23, y: -0.92, z: 1.28 },
    { radius: 0.22, x: -1.96, y: -0.74, z: 1.28 },
    { radius: 0.16, x: -1.35, y: -0.46, z: 1.08 },
  ]) {
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(item.radius, 48, 24), white);

    sphere.position.set(item.x, item.y, item.z);
    group.add(sphere);
  }

  const cMark = createTextPlane("C", 0.42, 0.42, 220);

  cMark.position.set(-0.23, -0.91, 1.67);
  cMark.rotation.set(0.02, -0.08, -0.16);
  group.add(cMark);

  group.scale.setScalar(0.72);

  return group;
}

function fitFlatPlane(runtime: Runtime, width: number, height: number) {
  const aspect = width / Math.max(1, height);
  const posterAspect = posterSize.width / posterSize.height;
  const viewHeight = 2 * Math.tan(THREE.MathUtils.degToRad(runtime.camera.fov) / 2) * runtime.viewDistance;
  const viewWidth = viewHeight * aspect;

  if (aspect > posterAspect) {
    runtime.flatPlane.scale.set(viewWidth * 1.02, (viewWidth / posterAspect) * 1.02, 1);
  } else {
    runtime.flatPlane.scale.set(viewHeight * posterAspect * 1.02, viewHeight * 1.02, 1);
  }

  runtime.camera.aspect = aspect;
  runtime.camera.updateProjectionMatrix();
}

function setGroupOpacity(group: THREE.Group, opacity: number) {
  group.traverse((object) => {
    const mesh = object as THREE.Mesh;

    if (!mesh.material) {
      return;
    }

    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];

    materials.forEach((material) => {
      material.transparent = true;
      material.opacity = opacity;
    });
  });
}

function updateScene(runtime: Runtime, progress: number, variant: "detail" | "preview") {
  const depth = variant === "preview" ? 0.92 : pulse(0.08, 0.34, 0.76, 0.98, progress);
  const settle = smoothstep(0.18, 0.62, progress);
  const returnPhase = smoothstep(0.78, 1, progress);
  const orbit = progress * Math.PI * 2;

  runtime.group3d.visible = depth > 0.01;
  runtime.flatMaterial.opacity = 1 - depth * 0.92;
  setGroupOpacity(runtime.group3d, clamp(depth * 1.16));

  runtime.camera.position.set(
    lerp(0, -0.72, depth) + Math.sin(orbit) * 0.06 * depth,
    lerp(0, 0.1, depth),
    lerp(runtime.viewDistance, 5.95, depth) + returnPhase * 2.8,
  );
  runtime.camera.rotation.set(0, lerp(0, -0.08, depth), lerp(0, -0.02, depth));
  runtime.camera.lookAt(lerp(0, 0.03, depth), lerp(0, -0.1, depth), lerp(0, 0.2, depth));

  runtime.group3d.position.set(lerp(-0.18, -0.04, settle), lerp(-0.04, 0.02, settle), lerp(-0.2, 0.1, settle));
  runtime.group3d.rotation.set(
    lerp(0, -0.24, depth) + returnPhase * 0.16,
    lerp(0, -0.36, depth) + Math.sin(orbit * 0.7) * 0.05 * depth,
    lerp(0, 0.08, depth),
  );
  runtime.group3d.scale.setScalar(lerp(0.95, 1.08, depth));
}

function disposeRuntime(runtime: Runtime) {
  cancelAnimationFrame(runtime.animationFrame);
  runtime.scene.traverse((object) => {
    const mesh = object as THREE.Mesh;

    mesh.geometry?.dispose();

    if (mesh.material) {
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];

      materials.forEach((material) => {
        const withMap = material as THREE.Material & { map?: THREE.Texture };

        withMap.map?.dispose();
        material.dispose();
      });
    }

    (mesh.userData.texture as THREE.Texture | undefined)?.dispose();
  });
  runtime.posterTexture.dispose();
  runtime.renderer.dispose();
}

export function ThreeHtmlCanvas({ variant = "detail" }: ThreeHtmlCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const { camera, flatMaterial, flatPlane, group3d, posterTexture, scene } = createScene();
    const renderer = new THREE.WebGLRenderer({ alpha: false, antialias: true, canvas });
    const runtime: Runtime = {
      animationFrame: 0,
      camera,
      flatMaterial,
      flatPlane,
      group3d,
      posterTexture,
      renderer,
      scene,
      smoothProgress: variant === "preview" ? 0.42 : 0,
      targetProgress: variant === "preview" ? 0.42 : 0,
      viewDistance: 8,
    };

    renderer.setClearColor("#ffffff", 1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    const updateProgress = () => {
      if (variant === "preview") {
        return;
      }

      const root = rootRef.current;

      if (!root) {
        runtime.targetProgress = 0;
        return;
      }

      const rect = root.getBoundingClientRect();
      const scrollable = Math.max(1, rect.height - window.innerHeight);

      // 固定 canvas 不跟随 DOM 滚动，滚动量只作为 Three.js 时间轴输入。
      runtime.targetProgress = clamp(-rect.top / scrollable);
    };

    const resize = () => {
      const width = Math.max(1, canvas.clientWidth || window.innerWidth);
      const height = Math.max(1, canvas.clientHeight || window.innerHeight);

      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(width, height, false);
      fitFlatPlane(runtime, width, height);
      updateProgress();
    };

    const animate = (time: number) => {
      if (variant === "preview") {
        runtime.targetProgress = 0.45 + Math.sin(time * 0.00045) * 0.14;
      }

      runtime.smoothProgress = lerp(runtime.smoothProgress, runtime.targetProgress, 0.09);
      updateScene(runtime, runtime.smoothProgress, variant);
      renderer.render(scene, camera);
      runtime.animationFrame = requestAnimationFrame(animate);
    };

    resize();
    updateProgress();
    window.addEventListener("resize", resize);
    window.addEventListener("scroll", updateProgress, { passive: true });
    runtime.animationFrame = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("scroll", updateProgress);
      disposeRuntime(runtime);
    };
  }, [variant]);

  return (
    <div className={styles.effect} data-effect="three-html-canvas" data-variant={variant} ref={rootRef}>
      <canvas
        aria-label="Scroll-driven Three.js scene turning a flat HTML poster into a red, white, and black 3D composition."
        className={variant === "detail" ? styles.detailCanvas : styles.previewCanvas}
        ref={canvasRef}
        role="img"
      />
      <div aria-hidden="true" className={styles.sourceLayout}>
        <p>SCROLL DOWN</p>
        <h1>Designing Motion</h1>
        <h2>Crafting Depth Into Living Worlds</h2>
        <article>
          <strong>Cullen Webber ™</strong>
          <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore.</p>
        </article>
      </div>
    </div>
  );
}
