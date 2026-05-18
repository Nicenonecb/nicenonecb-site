"use client";

import type { CSSProperties } from "react";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import styles from "./three-html-canvas.module.css";

type ThreeHtmlCanvasProps = {
  variant?: "detail" | "preview";
};

type Projector = {
  applyTo: (mesh: THREE.Mesh) => void;
  camera: THREE.PerspectiveCamera;
  dispose: () => void;
  uniforms: {
    projectedTexture: { value: THREE.Texture };
    projectorPosition: { value: THREE.Vector3 };
    projectorProjectionMatrix: { value: THREE.Matrix4 };
    projectorViewMatrix: { value: THREE.Matrix4 };
    uLitness: { value: number };
  };
  update: () => void;
};

type Runtime = {
  animationFrame: number;
  camera: THREE.PerspectiveCamera;
  htmlCapture: HtmlToCanvas;
  projector: Projector;
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  smoothProgress: number;
  targetProgress: number;
};

type Keyframe = {
  roll: number;
  x: number;
  y: number;
  z: number;
};

const cameraFov = 45;
const restPosition = new THREE.Vector3(0, 0, 15);
const lookTarget = new THREE.Vector3(0, -1, -4);
const keyframes: Keyframe[] = [
  { roll: 0, x: 0, y: 0, z: 0 },
  { roll: 0.22, x: 20, y: -2, z: -10 },
  { roll: -0.22, x: -15, y: 10, z: -5 },
  { roll: 0, x: 0, y: 0, z: 0 },
];

const sourceShellStyle: CSSProperties = {
  alignItems: "center",
  background: "#ffffff",
  color: "#222222",
  display: "flex",
  fontFamily: "Arial, Helvetica, sans-serif",
  height: "100%",
  justifyContent: "center",
  overflow: "hidden",
  padding: "0 16px",
  position: "relative",
  width: "100%",
};

const headingStyle: CSSProperties = {
  fontSize: "clamp(3rem, 7.5vw, 6rem)",
  fontWeight: 900,
  letterSpacing: "-0.055em",
  lineHeight: 0.86,
  margin: 0,
};

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function mix(from: number, to: number, amount: number) {
  return from + (to - from) * amount;
}

function smoothstep(value: number) {
  return value * value * (3 - 2 * value);
}

function keyframeValue(progress: number) {
  const segments = keyframes.length - 1;
  const scaled = clamp(progress) * segments;
  const index = Math.min(Math.floor(scaled), segments - 1);
  const local = smoothstep(scaled - index);
  const from = keyframes[index];
  const to = keyframes[index + 1];

  return {
    roll: mix(from.roll, to.roll, local),
    x: mix(from.x, to.x, local),
    y: mix(from.y, to.y, local),
    z: mix(from.z, to.z, local),
  };
}

class HtmlToCanvas {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  element: HTMLElement;
  extraCss = "";
  height: number;
  pixelRatio: number;
  texture: THREE.CanvasTexture;
  width: number;

  private current: Promise<void> | null = null;
  private pending = false;
  private rendering = false;

  constructor(element: HTMLElement, { height, pixelRatio = 2, width }: { height: number; pixelRatio?: number; width: number }) {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      throw new Error("Unable to create 2D canvas context");
    }

    this.canvas = canvas;
    this.ctx = ctx;
    this.element = element;
    this.height = height;
    this.pixelRatio = pixelRatio;
    this.width = width;
    this.texture = new THREE.CanvasTexture(canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.generateMipmaps = false;
    this.texture.magFilter = THREE.LinearFilter;
    this.texture.minFilter = THREE.LinearFilter;
  }

  resize(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  async update() {
    if (this.rendering) {
      this.pending = true;
      return this.current;
    }

    this.rendering = true;
    this.current = this.renderLoop();

    return this.current;
  }

  dispose() {
    this.texture.dispose();
  }

  private async renderLoop() {
    try {
      do {
        this.pending = false;
        const width = Math.max(1, Math.floor(this.width * this.pixelRatio));
        const height = Math.max(1, Math.floor(this.height * this.pixelRatio));

        if (this.canvas.width !== width || this.canvas.height !== height) {
          this.canvas.width = width;
          this.canvas.height = height;
          this.texture.dispose();
        }

        const image = new Image();

        image.src = this.buildSvgDataUrl();
        await image.decode();
        this.ctx.clearRect(0, 0, width, height);
        this.ctx.drawImage(image, 0, 0, width, height);
        this.texture.needsUpdate = true;
      } while (this.pending);
    } finally {
      this.rendering = false;
      this.current = null;
    }
  }

  private buildSvgDataUrl() {
    const serialized = new XMLSerializer().serializeToString(this.element);
    const css = `
      * { box-sizing: border-box; }
      body { margin: 0; }
      .three-html-capture-root { width: ${this.width}px; height: ${this.height}px; }
      ${this.extraCss}
    `;
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${this.width}" height="${this.height}">
        <foreignObject width="100%" height="100%">
          <div xmlns="http://www.w3.org/1999/xhtml" class="three-html-capture-root">
            <style>${css}</style>
            ${serialized}
          </div>
        </foreignObject>
      </svg>
    `;

    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }
}

function createProjector({ camera, texture }: { camera: THREE.PerspectiveCamera; texture: THREE.Texture }): Projector {
  const materials = new Set<THREE.Material>();
  const uniforms = {
    projectedTexture: { value: texture },
    projectorPosition: { value: new THREE.Vector3() },
    projectorProjectionMatrix: { value: new THREE.Matrix4() },
    projectorViewMatrix: { value: new THREE.Matrix4() },
    uLitness: { value: 0 },
  };

  const applyTo = (mesh: THREE.Mesh) => {
    const material = mesh.material;

    if (!material || Array.isArray(material)) {
      return;
    }

    material.onBeforeCompile = (shader) => {
      shader.uniforms.projectedTexture = uniforms.projectedTexture;
      shader.uniforms.projectorPosition = uniforms.projectorPosition;
      shader.uniforms.projectorProjectionMatrix = uniforms.projectorProjectionMatrix;
      shader.uniforms.projectorViewMatrix = uniforms.projectorViewMatrix;
      shader.uniforms.uLitness = uniforms.uLitness;

      shader.vertexShader = shader.vertexShader
        .replace(
          "#include <common>",
          `#include <common>
          uniform mat4 projectorViewMatrix;
          uniform mat4 projectorProjectionMatrix;
          uniform vec3 projectorPosition;
          varying vec4 vProjectedCoord;
          varying vec3 vProjectorDir;
          varying vec3 vProjectorNormal;`,
        )
        .replace(
          "#include <begin_vertex>",
          `#include <begin_vertex>
          vec4 projectionWorldPosition = modelMatrix * vec4(transformed, 1.0);
          vProjectedCoord = projectorProjectionMatrix * projectorViewMatrix * projectionWorldPosition;
          vProjectorDir = normalize(projectorPosition - projectionWorldPosition.xyz);
          vProjectorNormal = normalize(mat3(modelMatrix) * normal);`,
        );

      shader.fragmentShader = shader.fragmentShader
        .replace(
          "#include <common>",
          `#include <common>
          uniform sampler2D projectedTexture;
          uniform float uLitness;
          varying vec4 vProjectedCoord;
          varying vec3 vProjectorDir;
          varying vec3 vProjectorNormal;`,
        )
        .replace(
          "#include <color_fragment>",
          `#include <color_fragment>
          vec3 projectedNdc = vProjectedCoord.xyz / vProjectedCoord.w;
          vec2 projectedUv = projectedNdc.xy * 0.5 + 0.5;
          float inFrustum = step(0.0, projectedUv.x) * step(projectedUv.x, 1.0)
            * step(0.0, projectedUv.y) * step(projectedUv.y, 1.0)
            * step(-1.0, projectedNdc.z) * step(projectedNdc.z, 1.0);
          float facingProjector = step(0.0, dot(vProjectorNormal, vProjectorDir));
          vec4 projectedColor = texture2D(projectedTexture, projectedUv);
          float projectionMask = inFrustum * facingProjector * projectedColor.a;
          diffuseColor.rgb = mix(diffuseColor.rgb, projectedColor.rgb, projectionMask);
          vec3 flatProjectedDiffuse = diffuseColor.rgb;`,
        )
        .replace(
          "#include <opaque_fragment>",
          `#include <opaque_fragment>
          gl_FragColor.rgb = mix(flatProjectedDiffuse, gl_FragColor.rgb, uLitness);`,
        );
    };

    material.needsUpdate = true;
    materials.add(material);
  };

  const update = () => {
    camera.updateMatrixWorld();
    uniforms.projectorPosition.value.setFromMatrixPosition(camera.matrixWorld);
    uniforms.projectorProjectionMatrix.value.copy(camera.projectionMatrix);
    uniforms.projectorViewMatrix.value.copy(camera.matrixWorldInverse);
  };

  const dispose = () => {
    materials.forEach((material) => {
      material.onBeforeCompile = () => undefined;
      material.dispose();
    });
  };

  update();

  return { applyTo, camera, dispose, uniforms, update };
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
  const arch = new THREE.Mesh(new THREE.TorusGeometry(0.82, 0.09, 24, 72, Math.PI), material);

  arch.position.y = 0.3;
  group.add(arch);

  for (const x of [-0.82, 0.82]) {
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.45, 28), material);

    pillar.position.set(x, -0.42, 0);
    group.add(pillar);
  }

  return group;
}

function createProjectedStage(material: THREE.MeshStandardMaterial) {
  const group = new THREE.Group();
  const background = new THREE.Mesh(new THREE.PlaneGeometry(38, 19), material);

  background.position.set(0, -1, -4);
  background.receiveShadow = true;
  group.add(background);

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 16), material);

  floor.position.set(0, -4.72, -1.8);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  group.add(floor);

  const rounded = createRoundedShape(4.9, 4.1, 0.36);
  const heroCard = new THREE.Mesh(
    new THREE.ExtrudeGeometry(rounded, { bevelEnabled: false, depth: 0.22, steps: 1 }),
    material,
  );

  heroCard.position.set(2.35, -1.2, -1.2);
  heroCard.rotation.set(-0.05, -0.2, 0.05);
  heroCard.castShadow = true;
  heroCard.receiveShadow = true;
  group.add(heroCard);

  for (let index = 0; index < 4; index += 1) {
    const step = new THREE.Mesh(new THREE.BoxGeometry(2.35 - index * 0.18, 0.16, 0.42), material);

    step.position.set(-1.25 + index * 0.18, -2.15 + index * 0.16, -0.6 - index * 0.2);
    step.rotation.y = -0.16;
    step.castShadow = true;
    step.receiveShadow = true;
    group.add(step);
  }

  const archBack = createArch(material);

  archBack.position.set(-1.55, -1.22, -0.46);
  archBack.rotation.y = -0.2;
  archBack.scale.setScalar(1.25);
  group.add(archBack);

  const archFront = createArch(material);

  archFront.position.set(-1.75, -1.48, 0.08);
  archFront.rotation.y = -0.22;
  archFront.scale.setScalar(0.94);
  group.add(archFront);

  for (const item of [
    { height: 2.55, radius: 0.16, x: -3.25, y: -1.63, z: 0.2 },
    { height: 2.65, radius: 0.16, x: -0.08, y: -1.35, z: -0.14 },
    { height: 2.3, radius: 0.16, x: 0.3, y: -1.48, z: 0.42 },
  ]) {
    const column = new THREE.Mesh(new THREE.CylinderGeometry(item.radius, item.radius, item.height, 36), material);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(item.radius * 1.45, 36, 18), material);

    column.position.set(item.x, item.y, item.z);
    column.castShadow = true;
    column.receiveShadow = true;
    cap.position.set(item.x, item.y + item.height / 2 + item.radius, item.z);
    cap.castShadow = true;
    cap.receiveShadow = true;
    group.add(column, cap);
  }

  for (const item of [
    { radius: 0.62, x: -0.95, y: -2.64, z: 0.62 },
    { radius: 0.34, x: -3.12, y: -2.32, z: 0.7 },
    { radius: 0.24, x: -2.45, y: -1.8, z: 0.64 },
  ]) {
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(item.radius, 48, 24), material);

    sphere.position.set(item.x, item.y, item.z);
    sphere.castShadow = true;
    sphere.receiveShadow = true;
    group.add(sphere);
  }

  group.traverse((object) => {
    if ((object as THREE.Mesh).isMesh) {
      (object as THREE.Mesh).castShadow = true;
      (object as THREE.Mesh).receiveShadow = true;
    }
  });
  group.scale.setScalar(1.16);
  group.position.set(-0.18, 0.05, 0.25);

  return group;
}

function createScene(texture: THREE.Texture, width: number, height: number) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(cameraFov, width / height, 1, 100);
  const projectorCamera = new THREE.PerspectiveCamera(cameraFov, width / height, 1, 100);
  const material = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.42, metalness: 0.02 });
  const projector = createProjector({ camera: projectorCamera, texture });
  const stage = createProjectedStage(material);
  const ambient = new THREE.AmbientLight(0xffffff, 1);
  const key = new THREE.DirectionalLight(0xffffff, 2.6);

  scene.background = new THREE.Color(0xffffff);
  camera.position.copy(restPosition);
  camera.lookAt(lookTarget);
  projectorCamera.position.copy(restPosition);
  projectorCamera.lookAt(lookTarget);
  projectorCamera.updateMatrixWorld();
  key.position.set(5, 8, 6);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 50;
  key.shadow.camera.left = -15;
  key.shadow.camera.right = 15;
  key.shadow.camera.top = 15;
  key.shadow.camera.bottom = -15;
  key.shadow.bias = -0.0001;
  key.shadow.normalBias = 0.02;

  stage.traverse((object) => {
    if ((object as THREE.Mesh).isMesh) {
      projector.applyTo(object as THREE.Mesh);
    }
  });

  scene.add(ambient, key, stage);
  projector.update();

  return { camera, projector, scene };
}

function updateCamera(runtime: Runtime, progress: number) {
  const keyframe = keyframeValue(progress);

  runtime.camera.position.set(
    restPosition.x + keyframe.x,
    restPosition.y + keyframe.y,
    restPosition.z + keyframe.z,
  );
  runtime.camera.lookAt(lookTarget);
  runtime.camera.rotateZ(keyframe.roll);

  // 参考实现会在离开首屏视角时逐步恢复 Three.js 光照，让平面投影变成真实 3D 物体。
  const distanceFromRest = Math.min(progress, 1 - progress) * 2;
  runtime.projector.uniforms.uLitness.value = smoothstep(clamp(distanceFromRest));
}

function resizeRuntime(runtime: Runtime, canvas: HTMLCanvasElement, width: number, height: number) {
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

  runtime.renderer.setPixelRatio(pixelRatio);
  runtime.renderer.setSize(width, height, false);
  runtime.camera.aspect = width / Math.max(1, height);
  runtime.camera.updateProjectionMatrix();
  runtime.projector.camera.aspect = runtime.camera.aspect;
  runtime.projector.camera.updateProjectionMatrix();
  runtime.projector.update();
  runtime.htmlCapture.pixelRatio = pixelRatio;
  runtime.htmlCapture.resize(width, height);
  void runtime.htmlCapture.update();
  canvas.style.width = "100%";
  canvas.style.height = "100%";
}

function disposeRuntime(runtime: Runtime) {
  cancelAnimationFrame(runtime.animationFrame);
  runtime.projector.dispose();
  runtime.htmlCapture.dispose();
  runtime.scene.traverse((object) => {
    const mesh = object as THREE.Mesh;

    mesh.geometry?.dispose();
  });
  runtime.renderer.dispose();
}

export function ThreeHtmlCanvas({ variant = "detail" }: ThreeHtmlCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const sourceRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const source = sourceRef.current;

    if (!canvas || !source) {
      return;
    }

    const width = Math.max(1, canvas.clientWidth || window.innerWidth);
    const height = Math.max(1, canvas.clientHeight || window.innerHeight);
    const renderer = new THREE.WebGLRenderer({ antialias: true, canvas });
    const htmlCapture = new HtmlToCanvas(source, {
      height,
      pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
      width,
    });
    const { camera, projector, scene } = createScene(htmlCapture.texture, width, height);
    const runtime: Runtime = {
      animationFrame: 0,
      camera,
      htmlCapture,
      projector,
      renderer,
      scene,
      smoothProgress: variant === "preview" ? 0.36 : 0,
      targetProgress: variant === "preview" ? 0.36 : 0,
    };

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.VSMShadowMap;

    const updateScrollProgress = () => {
      if (variant === "preview") {
        return;
      }

      const root = rootRef.current;

      if (!root) {
        runtime.targetProgress = 0;
        return;
      }

      const rect = root.getBoundingClientRect();
      const range = Math.max(1, rect.height - window.innerHeight);

      // 与参考仓库一致：滚动只改变主相机，HTML 纹理投影相机固定在首屏视角。
      runtime.targetProgress = clamp(-rect.top / range);
    };

    const resize = () => {
      const nextWidth = Math.max(1, canvas.clientWidth || window.innerWidth);
      const nextHeight = Math.max(1, canvas.clientHeight || window.innerHeight);

      resizeRuntime(runtime, canvas, nextWidth, nextHeight);
      updateScrollProgress();
    };

    const animate = (time: number) => {
      if (variant === "preview") {
        runtime.targetProgress = 0.32 + Math.sin(time * 0.00042) * 0.09;
      }

      runtime.smoothProgress += (runtime.targetProgress - runtime.smoothProgress) * 0.08;
      updateCamera(runtime, runtime.smoothProgress);
      renderer.render(scene, camera);
      runtime.animationFrame = requestAnimationFrame(animate);
    };

    const start = async () => {
      if (document.fonts?.ready) {
        await document.fonts.ready;
      }

      resize();
      await htmlCapture.update();
      updateCamera(runtime, runtime.smoothProgress);
      renderer.render(scene, camera);
      runtime.animationFrame = requestAnimationFrame(animate);
    };

    void start();
    window.addEventListener("resize", resize);
    window.addEventListener("scroll", updateScrollProgress, { passive: true });

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("scroll", updateScrollProgress);
      disposeRuntime(runtime);
    };
  }, [variant]);

  return (
    <div className={styles.effect} data-effect="three-html-canvas" data-variant={variant} ref={rootRef}>
      <canvas
        aria-label="Scroll-driven Three.js scene using a projected HTML canvas texture."
        className={variant === "detail" ? styles.detailCanvas : styles.previewCanvas}
        ref={canvasRef}
        role="img"
      />
      <SourcePage ref={sourceRef} />
    </div>
  );
}

function SourcePage({ ref }: { ref: React.RefObject<HTMLDivElement | null> }) {
  return (
    <div aria-hidden="true" className={styles.sourceLayout} ref={ref}>
      <div style={sourceShellStyle}>
        <p
          style={{
            bottom: 16,
            fontSize: 16,
            fontWeight: 800,
            left: "50%",
            margin: 0,
            position: "absolute",
            transform: "translateX(-50%)",
          }}
        >
          SCROLL DOWN
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "clamp(2rem, 5vw, 3.5rem)", maxWidth: 1120, width: "100%" }}>
          <div style={{ alignSelf: "center", display: "flex", flexDirection: "column", maxWidth: 520, width: "48%" }}>
            <h1 style={{ ...headingStyle, alignSelf: "flex-start" }}>Designing</h1>
            <h2 style={{ ...headingStyle, alignSelf: "flex-end" }}>Motion</h2>
          </div>
          <div style={{ alignSelf: "flex-start", display: "flex", flexDirection: "column", maxWidth: 400, width: "40%" }}>
            <h2 style={{ ...headingStyle, alignSelf: "flex-start" }}>Crafting</h2>
            <h2 style={{ ...headingStyle, alignSelf: "flex-end" }}>Depth</h2>
          </div>
          <div style={{ alignSelf: "flex-end", display: "flex", flexDirection: "column", maxWidth: 410, width: "42%" }}>
            <h2 style={{ ...headingStyle, alignSelf: "flex-start" }}>Into</h2>
            <h2 style={{ ...headingStyle, alignSelf: "flex-end" }}>Living</h2>
            <h2 style={{ ...headingStyle, alignSelf: "flex-start" }}>Worlds</h2>
          </div>
        </div>

        <article
          style={{
            aspectRatio: "1",
            background: "#fd453a",
            color: "#222222",
            display: "flex",
            flexDirection: "column",
            gap: "clamp(1rem, 3vw, 2rem)",
            left: "50%",
            padding: "clamp(1.5rem, 4vw, 2rem)",
            position: "absolute",
            top: "50%",
            transform: "translate(-50%, -50%)",
            width: "min(70vw, 400px)",
          }}
        >
          <strong style={{ fontSize: "clamp(1.65rem, 4vw, 2rem)", fontWeight: 900, lineHeight: 1 }}>
            Nicenonecb <sup style={{ fontSize: 12 }}>TM</sup>
          </strong>
          <p style={{ fontSize: "clamp(1rem, 2.3vw, 1.125rem)", fontWeight: 800, lineHeight: 1.2, margin: 0 }}>
            Interface surfaces become spatial material, letting scroll carve depth out of a living page.
          </p>
          <p style={{ fontSize: "clamp(0.8rem, 2vw, 1rem)", lineHeight: 1.35, margin: 0 }}>
            HTML is captured once, projected through a camera, and revealed again as dimensional geometry.
          </p>
        </article>
      </div>
    </div>
  );
}
