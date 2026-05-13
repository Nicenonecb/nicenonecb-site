"use client";

import type { CSSProperties, PointerEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import styles from "./quantum-neural-network.module.css";

type QuantumNeuralNetworkProps = {
  variant?: "detail" | "preview";
};

type NetworkNode = {
  colorIndex: number;
  connections: number[];
  position: THREE.Vector3;
  size: number;
};

type PulseUniforms = {
  uBaseNodeSize: { value: number };
  uPulseColors: { value: THREE.Color[] };
  uPulsePositions: { value: THREE.Vector3[] };
  uPulseTimes: { value: number[] };
  uTime: { value: number };
};

type Runtime = {
  camera: THREE.PerspectiveCamera;
  composer: EffectComposer;
  connectionsMesh: THREE.LineSegments | null;
  controls: OrbitControls;
  disposeNetwork: () => void;
  nodesMesh: THREE.Points | null;
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  starField: THREE.Points;
};

type Theme = {
  id: string;
  label: string;
  colors: number[];
};

const themes: Theme[] = [
  { id: "nebula", label: "Purple Nebula", colors: [0x667eea, 0x764ba2, 0xf093fb, 0x9d50bb, 0x6e48aa] },
  { id: "sunset", label: "Sunset Fire", colors: [0xf857a6, 0xff5858, 0xfeca57, 0xff6348, 0xff9068] },
  { id: "aurora", label: "Ocean Aurora", colors: [0x4facfe, 0x00f2fe, 0x43e97b, 0x38f9d7, 0x4484ce] },
];

const offscreenPulse = new THREE.Vector3(1_000, 1_000, 1_000);

const nodeVertexShader = `
attribute float nodeSize;
attribute vec3 nodeColor;
varying vec3 vColor;
varying float vPulse;
uniform float uTime;
uniform float uBaseNodeSize;
uniform vec3 uPulsePositions[3];
uniform float uPulseTimes[3];

void main() {
  vec3 animated = position;
  animated += normal * sin(uTime * 0.9 + position.x * 0.13 + position.y * 0.08) * 0.08;

  float pulse = 0.0;
  for (int i = 0; i < 3; i++) {
    float age = uTime - uPulseTimes[i];
    float ring = abs(distance(animated, uPulsePositions[i]) - age * 15.0);
    pulse += (1.0 - smoothstep(0.0, 2.25, ring)) * (1.0 - smoothstep(0.0, 3.2, age));
  }

  vec4 mvPosition = modelViewMatrix * vec4(animated, 1.0);
  vPulse = clamp(pulse, 0.0, 1.6);
  vColor = nodeColor;
  gl_PointSize = (nodeSize * uBaseNodeSize + vPulse * 7.5) * (320.0 / -mvPosition.z);
  gl_Position = projectionMatrix * mvPosition;
}
`;

const nodeFragmentShader = `
varying vec3 vColor;
varying float vPulse;

void main() {
  vec2 center = gl_PointCoord - 0.5;
  float dist = length(center);
  if (dist > 0.5) discard;

  float core = 1.0 - smoothstep(0.0, 0.18, dist);
  float halo = 1.0 - smoothstep(0.08, 0.5, dist);
  vec3 color = vColor * (0.85 + halo * 1.6) + vec3(1.0) * core * 0.65;
  color += vec3(1.0, 0.92, 1.0) * vPulse * (0.8 + core);

  gl_FragColor = vec4(color, max(core, halo * 0.72) * (0.66 + vPulse * 0.28));
}
`;

const connectionVertexShader = `
attribute vec3 connectionColor;
attribute float connectionStrength;
varying vec3 vColor;
varying float vPulse;
varying float vStrength;
uniform float uTime;
uniform vec3 uPulsePositions[3];
uniform float uPulseTimes[3];

void main() {
  vec3 animated = position + normal * sin(uTime * 0.36 + position.z * 0.08) * 0.03;
  float pulse = 0.0;

  for (int i = 0; i < 3; i++) {
    float age = uTime - uPulseTimes[i];
    float ring = abs(distance(animated, uPulsePositions[i]) - age * 15.0);
    pulse += (1.0 - smoothstep(0.0, 1.6, ring)) * (1.0 - smoothstep(0.0, 3.1, age));
  }

  vColor = connectionColor;
  vPulse = clamp(pulse, 0.0, 1.4);
  vStrength = connectionStrength;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(animated, 1.0);
}
`;

const connectionFragmentShader = `
varying vec3 vColor;
varying float vPulse;
varying float vStrength;

void main() {
  vec3 color = vColor * (0.42 + vStrength * 0.75) + vec3(1.0, 0.9, 1.0) * vPulse;
  float alpha = 0.18 + vStrength * 0.2 + vPulse * 0.48;
  gl_FragColor = vec4(color, alpha);
}
`;

const starVertexShader = `
attribute float starSize;
attribute vec3 starColor;
varying vec3 vColor;
uniform float uTime;

void main() {
  vColor = starColor;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  float twinkle = 0.72 + sin(uTime * 2.0 + position.x * 7.3) * 0.28;
  gl_PointSize = starSize * twinkle * (300.0 / -mvPosition.z);
  gl_Position = projectionMatrix * mvPosition;
}
`;

const starFragmentShader = `
varying vec3 vColor;

void main() {
  vec2 center = gl_PointCoord - 0.5;
  float dist = length(center);
  if (dist > 0.5) discard;
  float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
  gl_FragColor = vec4(vColor, alpha * 0.72);
}
`;

function getDpr() {
  return Math.min(window.devicePixelRatio || 1, 2);
}

function randomColor(base: THREE.Color, jitter = 0.07) {
  const color = base.clone();

  color.offsetHSL(THREE.MathUtils.randFloatSpread(jitter * 0.5), THREE.MathUtils.randFloatSpread(jitter), THREE.MathUtils.randFloatSpread(jitter));

  return color;
}

function addConnection(nodes: NetworkNode[], a: number, b: number) {
  if (a === b || nodes[a].connections.includes(b)) {
    return;
  }

  nodes[a].connections.push(b);
  nodes[b].connections.push(a);
}

function generateSphere(count: number) {
  const nodes: NetworkNode[] = [];

  for (let i = 0; i < count; i++) {
    const radius = 1.4 + Math.pow(Math.random(), 0.58) * 13.8;
    const phi = Math.acos(THREE.MathUtils.randFloatSpread(2));
    const theta = THREE.MathUtils.randFloat(0, Math.PI * 2);
    const position = new THREE.Vector3(
      radius * Math.sin(phi) * Math.cos(theta),
      radius * Math.sin(phi) * Math.sin(theta),
      radius * Math.cos(phi),
    );

    nodes.push({
      colorIndex: Math.min(themes[0].colors.length - 1, Math.floor((radius / 15) * themes[0].colors.length)),
      connections: [],
      position,
      size: THREE.MathUtils.randFloat(0.52, 1.38),
    });
  }

  return nodes;
}

function generateHelix(count: number) {
  const nodes: NetworkNode[] = [];

  for (let i = 0; i < count; i++) {
    const t = i / Math.max(1, count - 1);
    const turn = t * Math.PI * 10.5;
    const radius = 5.5 + Math.sin(t * Math.PI * 4) * 2.8 + Math.random() * 3.4;
    const y = (t - 0.5) * 25;
    const position = new THREE.Vector3(
      Math.cos(turn) * radius + THREE.MathUtils.randFloatSpread(2.2),
      y + THREE.MathUtils.randFloatSpread(1.2),
      Math.sin(turn) * radius + THREE.MathUtils.randFloatSpread(2.2),
    );

    nodes.push({
      colorIndex: Math.min(themes[0].colors.length - 1, Math.floor(t * themes[0].colors.length)),
      connections: [],
      position,
      size: THREE.MathUtils.randFloat(0.5, 1.26),
    });
  }

  return nodes;
}

function generateFractal(count: number) {
  const nodes: NetworkNode[] = [
    {
      colorIndex: 0,
      connections: [],
      position: new THREE.Vector3(0, 0, 0),
      size: 1.7,
    },
  ];

  let cursor = 0;

  // 以分支方式生成结构，避免随机点云过散，形状更接近参考里的晶体神经网络。
  while (nodes.length < count && cursor < nodes.length) {
    const root = nodes[cursor];
    const branches = cursor === 0 ? 9 : THREE.MathUtils.randInt(1, 3);

    for (let i = 0; i < branches && nodes.length < count; i++) {
      const direction = new THREE.Vector3().randomDirection();
      const distance = THREE.MathUtils.randFloat(2.0, 5.2) * (1 + root.position.length() / 22);
      const next = root.position.clone().add(direction.multiplyScalar(distance));

      if (next.length() < 16.5) {
        const index = nodes.length;
        nodes.push({
          colorIndex: Math.min(themes[0].colors.length - 1, Math.floor(next.length() / 4.3)),
          connections: [],
          position: next,
          size: THREE.MathUtils.randFloat(0.48, 1.24),
        });
        addConnection(nodes, cursor, index);
      }
    }

    cursor += 1;
  }

  return nodes;
}

function wireNearbyNodes(nodes: NetworkNode[], densityFactor: number, formation: number) {
  const maxConnections = formation === 2 ? 4 : formation === 1 ? 5 : 6;
  const distanceLimit = formation === 1 ? 5.9 : 7.8;

  nodes.forEach((node, index) => {
    const nearby = nodes
      .map((candidate, candidateIndex) => ({
        candidateIndex,
        distance: candidate.position.distanceTo(node.position),
      }))
      .filter((item) => item.candidateIndex !== index && item.distance < distanceLimit)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, maxConnections);

    nearby.forEach((item, rank) => {
      const probability = (0.78 - rank * 0.14) * densityFactor;

      if (Math.random() < probability) {
        addConnection(nodes, index, item.candidateIndex);
      }
    });
  });
}

function generateNetwork(formation: number, densityFactor: number, variant: QuantumNeuralNetworkProps["variant"]) {
  const baseCount = variant === "preview" ? 92 : 210;
  const count = Math.max(34, Math.round(baseCount * (0.34 + densityFactor * 0.66)));
  const nodes = formation === 0 ? generateSphere(count) : formation === 1 ? generateHelix(count) : generateFractal(count);

  wireNearbyNodes(nodes, densityFactor, formation);

  return nodes;
}

function createPulseUniforms(theme: Theme, variant: QuantumNeuralNetworkProps["variant"]): PulseUniforms {
  const colors = theme.colors.slice(0, 3).map((color) => new THREE.Color(color));

  return {
    uBaseNodeSize: { value: variant === "preview" ? 0.47 : 0.62 },
    uPulseColors: { value: colors },
    uPulsePositions: { value: [offscreenPulse.clone(), offscreenPulse.clone(), offscreenPulse.clone()] },
    uPulseTimes: { value: [-1_000, -1_000, -1_000] },
    uTime: { value: 0 },
  };
}

function createStarField(count: number) {
  const positions: number[] = [];
  const colors: number[] = [];
  const sizes: number[] = [];

  for (let i = 0; i < count; i++) {
    const radius = THREE.MathUtils.randFloat(46, 128);
    const direction = new THREE.Vector3().randomDirection().multiplyScalar(radius);
    const warmth = Math.random();

    positions.push(direction.x, direction.y, direction.z);
    sizes.push(THREE.MathUtils.randFloat(0.14, 0.42));

    if (warmth < 0.74) {
      colors.push(0.92, 0.92, 1);
    } else if (warmth < 0.9) {
      colors.push(0.62, 0.72, 1);
    } else {
      colors.push(1, 0.78, 0.62);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("starColor", new THREE.Float32BufferAttribute(colors, 3));
  geometry.setAttribute("starSize", new THREE.Float32BufferAttribute(sizes, 1));

  const material = new THREE.ShaderMaterial({
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fragmentShader: starFragmentShader,
    transparent: true,
    uniforms: { uTime: { value: 0 } },
    vertexShader: starVertexShader,
  });

  return new THREE.Points(geometry, material);
}

function createNetworkObjects(nodes: NetworkNode[], theme: Theme, variant: QuantumNeuralNetworkProps["variant"]) {
  const palette = theme.colors.map((color) => new THREE.Color(color));
  const nodePositions: number[] = [];
  const nodeColors: number[] = [];
  const nodeSizes: number[] = [];
  const connectionPositions: number[] = [];
  const connectionColors: number[] = [];
  const connectionStrengths: number[] = [];
  const seen = new Set<string>();

  nodes.forEach((node, index) => {
    const color = randomColor(palette[node.colorIndex % palette.length]);

    nodePositions.push(node.position.x, node.position.y, node.position.z);
    nodeColors.push(color.r, color.g, color.b);
    nodeSizes.push(node.size);

    node.connections.forEach((targetIndex) => {
      const key = `${Math.min(index, targetIndex)}:${Math.max(index, targetIndex)}`;

      if (seen.has(key)) {
        return;
      }

      seen.add(key);

      const target = nodes[targetIndex];
      const connectionColor = randomColor(palette[Math.min(node.colorIndex, target.colorIndex) % palette.length], 0.1);
      const strength = THREE.MathUtils.clamp(1 - node.position.distanceTo(target.position) / 8.5, 0.14, 0.72);

      connectionPositions.push(node.position.x, node.position.y, node.position.z, target.position.x, target.position.y, target.position.z);
      connectionColors.push(connectionColor.r, connectionColor.g, connectionColor.b, connectionColor.r, connectionColor.g, connectionColor.b);
      connectionStrengths.push(strength, strength);
    });
  });

  const pulseUniforms = createPulseUniforms(theme, variant);
  const nodesGeometry = new THREE.BufferGeometry();
  nodesGeometry.setAttribute("position", new THREE.Float32BufferAttribute(nodePositions, 3));
  nodesGeometry.setAttribute("normal", new THREE.Float32BufferAttribute(nodePositions, 3));
  nodesGeometry.setAttribute("nodeColor", new THREE.Float32BufferAttribute(nodeColors, 3));
  nodesGeometry.setAttribute("nodeSize", new THREE.Float32BufferAttribute(nodeSizes, 1));

  const nodesMaterial = new THREE.ShaderMaterial({
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fragmentShader: nodeFragmentShader,
    transparent: true,
    uniforms: THREE.UniformsUtils.clone(pulseUniforms),
    vertexShader: nodeVertexShader,
  });

  const connectionsGeometry = new THREE.BufferGeometry();
  connectionsGeometry.setAttribute("position", new THREE.Float32BufferAttribute(connectionPositions, 3));
  connectionsGeometry.setAttribute("normal", new THREE.Float32BufferAttribute(connectionPositions, 3));
  connectionsGeometry.setAttribute("connectionColor", new THREE.Float32BufferAttribute(connectionColors, 3));
  connectionsGeometry.setAttribute("connectionStrength", new THREE.Float32BufferAttribute(connectionStrengths, 1));

  const connectionsMaterial = new THREE.ShaderMaterial({
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fragmentShader: connectionFragmentShader,
    transparent: true,
    uniforms: THREE.UniformsUtils.clone(pulseUniforms),
    vertexShader: connectionVertexShader,
  });

  return {
    connectionsMesh: new THREE.LineSegments(connectionsGeometry, connectionsMaterial),
    nodesMesh: new THREE.Points(nodesGeometry, nodesMaterial),
  };
}

function disposeObject(object: THREE.Object3D | null) {
  if (!object) {
    return;
  }

  if ("geometry" in object && object.geometry instanceof THREE.BufferGeometry) {
    object.geometry.dispose();
  }

  if ("material" in object) {
    const material = object.material;

    if (Array.isArray(material)) {
      material.forEach((item) => item.dispose());
    } else if (material instanceof THREE.Material) {
      material.dispose();
    }
  }
}

function updatePulseUniform(mesh: THREE.LineSegments | THREE.Points | null, time: number, position: THREE.Vector3, index: number) {
  const material = mesh?.material;

  if (!(material instanceof THREE.ShaderMaterial)) {
    return;
  }

  material.uniforms.uPulsePositions.value[index].copy(position);
  material.uniforms.uPulseTimes.value[index] = time;
}

export function QuantumNeuralNetwork({ variant = "detail" }: QuantumNeuralNetworkProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const shellRef = useRef<HTMLElement>(null);
  const runtimeRef = useRef<Runtime | null>(null);
  const elapsedRef = useRef(0);
  const pulseIndexRef = useRef(0);
  const [themeIndex, setThemeIndex] = useState(0);
  const [formation, setFormation] = useState(0);
  const [density, setDensity] = useState(variant === "preview" ? 0.82 : 1);
  const [paused, setPaused] = useState(false);

  const shellStyle = useMemo(
    () =>
      ({
        "--quantum-min-height": variant === "preview" ? "100%" : "44rem",
      }) as CSSProperties,
    [variant],
  );

  const rebuildNetwork = useCallback(() => {
    const runtime = runtimeRef.current;

    if (!runtime) {
      return;
    }

    runtime.disposeNetwork();

    const nodes = generateNetwork(formation, density, variant);
    const objects = createNetworkObjects(nodes, themes[themeIndex], variant);

    runtime.nodesMesh = objects.nodesMesh;
    runtime.connectionsMesh = objects.connectionsMesh;
    runtime.scene.add(objects.connectionsMesh);
    runtime.scene.add(objects.nodesMesh);
  }, [density, formation, themeIndex, variant]);

  const triggerPulse = useCallback((clientX: number, clientY: number) => {
    const runtime = runtimeRef.current;
    const shell = shellRef.current;

    if (!(runtime && shell) || paused) {
      return;
    }

    const rect = shell.getBoundingClientRect();
    const pointer = new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -(((clientY - rect.top) / rect.height) * 2 - 1));
    const raycaster = new THREE.Raycaster();
    const plane = new THREE.Plane();
    const point = new THREE.Vector3();
    const cameraDirection = runtime.camera.position.clone().normalize();

    plane.setFromNormalAndCoplanarPoint(cameraDirection, cameraDirection.clone().multiplyScalar(12));
    raycaster.setFromCamera(pointer, runtime.camera);

    if (!raycaster.ray.intersectPlane(plane, point)) {
      return;
    }

    pulseIndexRef.current = (pulseIndexRef.current + 1) % 3;
    const elapsed = elapsedRef.current;

    updatePulseUniform(runtime.nodesMesh, elapsed, point, pulseIndexRef.current);
    updatePulseUniform(runtime.connectionsMesh, elapsed, point, pulseIndexRef.current);
  }, [paused]);

  const handlePointerDown = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      event.currentTarget.setPointerCapture(event.pointerId);
      triggerPulse(event.clientX, event.clientY);
    },
    [triggerPulse],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    const shell = shellRef.current;

    if (!(canvas && shell)) {
      return;
    }

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000000, 0.002);

    const camera = new THREE.PerspectiveCamera(64, 1, 0.1, 1_000);
    camera.position.set(0, 8, variant === "preview" ? 31 : 28);

    const renderer = new THREE.WebGLRenderer({
      alpha: false,
      antialias: true,
      canvas,
      powerPreference: "high-performance",
    });

    renderer.setClearColor(0x000000, 1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.22;
    controls.dampingFactor = 0.055;
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.maxDistance = 76;
    controls.minDistance = 8;
    controls.rotateSpeed = 0.58;

    const composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(1, 1), variant === "preview" ? 1.35 : 1.7, 0.55, 0.7);
    const outputPass = new OutputPass();

    composer.addPass(renderPass);
    composer.addPass(bloomPass);
    composer.addPass(outputPass);

    const starField = createStarField(variant === "preview" ? 820 : 1_800);
    scene.add(starField);

    const runtime: Runtime = {
      camera,
      composer,
      connectionsMesh: null,
      controls,
      disposeNetwork: () => {
        if (runtime.nodesMesh) {
          scene.remove(runtime.nodesMesh);
          disposeObject(runtime.nodesMesh);
          runtime.nodesMesh = null;
        }

        if (runtime.connectionsMesh) {
          scene.remove(runtime.connectionsMesh);
          disposeObject(runtime.connectionsMesh);
          runtime.connectionsMesh = null;
        }
      },
      nodesMesh: null,
      renderer,
      scene,
      starField,
    };

    runtimeRef.current = runtime;

    let animationFrame = 0;
    let stopped = false;
    let startedAt = performance.now();

    const resizeCanvas = () => {
      const rect = shell.getBoundingClientRect();
      const dpr = getDpr();
      const width = Math.max(1, Math.floor(rect.width * dpr));
      const height = Math.max(1, Math.floor(rect.height * dpr));

      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(dpr);
      renderer.setSize(rect.width, rect.height, false);
      composer.setSize(rect.width, rect.height);
      bloomPass.resolution.set(width, height);
    };

    const resizeObserver = new ResizeObserver(resizeCanvas);
    resizeObserver.observe(shell);
    resizeCanvas();
    rebuildNetwork();

    const render = () => {
      if (stopped) {
        return;
      }

      const elapsed = (performance.now() - startedAt) / 1000;
      const starMaterial = starField.material;

      elapsedRef.current = elapsed;

      if (starMaterial instanceof THREE.ShaderMaterial) {
        starMaterial.uniforms.uTime.value = elapsed;
      }

      starField.rotation.y += 0.00018;

      if (!paused) {
        if (runtime.nodesMesh) {
          runtime.nodesMesh.rotation.y = Math.sin(elapsed * 0.04) * 0.05;
          const material = runtime.nodesMesh.material;

          if (material instanceof THREE.ShaderMaterial) {
            material.uniforms.uTime.value = elapsed;
          }
        }

        if (runtime.connectionsMesh) {
          runtime.connectionsMesh.rotation.y = Math.sin(elapsed * 0.04) * 0.05;
          const material = runtime.connectionsMesh.material;

          if (material instanceof THREE.ShaderMaterial) {
            material.uniforms.uTime.value = elapsed;
          }
        }
      }

      controls.autoRotate = !paused;
      controls.update();
      composer.render();
      animationFrame = requestAnimationFrame(render);
    };

    animationFrame = requestAnimationFrame(render);

    return () => {
      stopped = true;
      cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      runtime.disposeNetwork();
      disposeObject(starField);
      composer.dispose();
      renderer.dispose();
      controls.dispose();
      runtimeRef.current = null;
      startedAt = 0;
    };
  }, [paused, rebuildNetwork, variant]);

  useEffect(() => {
    rebuildNetwork();
  }, [rebuildNetwork]);

  const handleMorph = useCallback(() => {
    setFormation((current) => (current + 1) % 3);
  }, []);

  const handleReset = useCallback(() => {
    const runtime = runtimeRef.current;

    if (!runtime) {
      return;
    }

    runtime.controls.reset();
    runtime.camera.position.set(0, 8, variant === "preview" ? 31 : 28);
  }, [variant]);

  return (
    <section
      aria-label="Quantum neural network interactive Three.js effect"
      className={styles.shell}
      data-effect="quantum-neural-network"
      data-variant={variant}
      onPointerDown={handlePointerDown}
      ref={shellRef}
      style={shellStyle}
      tabIndex={0}
    >
      <canvas aria-hidden="true" className={styles.canvas} ref={canvasRef} />

      <div className={`${styles.panel} ${styles.instructions}`}>
        <h2>Quantum Neural Network</h2>
        <p>
          Click to send energy pulses.
          <br />
          Drag to explore the structure.
        </p>
      </div>

      <div className={`${styles.panel} ${styles.themeSelector}`} onPointerDown={(event) => event.stopPropagation()}>
        <div className={styles.themeColumn}>
          <span className={styles.panelLabel}>Crystal Theme</span>
          <div className={styles.themeGrid}>
            {themes.map((theme, index) => (
              <button
                aria-label={theme.label}
                className={styles.themeButton}
                data-active={index === themeIndex}
                data-theme={theme.id}
                key={theme.id}
                onClick={() => setThemeIndex(index)}
                type="button"
              />
            ))}
          </div>
        </div>

        <label className={styles.densityControl}>
          <span>
            Density <strong>{Math.round(density * 100)}%</strong>
          </span>
          <input
            aria-label="Network Density"
            max="100"
            min="30"
            onChange={(event) => setDensity(Number(event.currentTarget.value) / 100)}
            type="range"
            value={Math.round(density * 100)}
          />
        </label>
      </div>

      <div className={styles.controlBar} onPointerDown={(event) => event.stopPropagation()}>
        <button onClick={handleMorph} type="button">
          Morph
        </button>
        <button onClick={() => setPaused((value) => !value)} type="button">
          {paused ? "Play" : "Freeze"}
        </button>
        <button onClick={handleReset} type="button">
          Reset
        </button>
      </div>
    </section>
  );
}
