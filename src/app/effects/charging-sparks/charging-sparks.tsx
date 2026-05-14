"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import styles from "./charging-sparks.module.css";

type ChargingSparksProps = {
  variant?: "detail" | "preview";
};

type ParticleKind = "circle" | "capsule" | "shard" | "spark";

type ParticleSpec = {
  angle: number;
  color: THREE.Color;
  drift: number;
  duration: number;
  kind: ParticleKind;
  radius: number;
  rotation: number;
  rotationSpeed: number;
  scale: number;
  start: number;
  stretch: number;
};

type BeamSpec = {
  angle: number;
  color: THREE.Color;
  duration: number;
  length: number;
  offset: number;
  start: number;
};

const loopDuration = 20.6;
const palette = [0xff44de, 0xd750ff, 0x72fff2, 0x74ff57, 0xfff45a, 0xff79d8];

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

function easeOutExpo(value: number) {
  return value >= 1 ? 1 : 1 - 2 ** (-8 * value);
}

function pulse(value: number) {
  return Math.sin(Math.PI * THREE.MathUtils.clamp(value, 0, 1));
}

function createStarGeometry() {
  const shape = new THREE.Shape();
  const points = 14;

  for (let index = 0; index <= points; index += 1) {
    const angle = (index / points) * Math.PI * 2 - Math.PI / 2;
    const radius = index % 2 === 0 ? 0.58 : 0.18;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;

    if (index === 0) {
      shape.moveTo(x, y);
    } else {
      shape.lineTo(x, y);
    }
  }

  return new THREE.ShapeGeometry(shape);
}

function createTriangleGeometry() {
  const shape = new THREE.Shape();

  shape.moveTo(0, 0.72);
  shape.lineTo(-0.5, -0.36);
  shape.lineTo(0.54, -0.28);
  shape.closePath();

  return new THREE.ShapeGeometry(shape);
}

function createCapsuleGeometry() {
  const shape = new THREE.Shape();
  const radius = 0.32;
  const half = 0.78;

  shape.absarc(-half, 0, radius, Math.PI / 2, -Math.PI / 2, true);
  shape.absarc(half, 0, radius, -Math.PI / 2, Math.PI / 2, true);
  shape.closePath();

  return new THREE.ShapeGeometry(shape);
}

function createCoreLineGeometry() {
  const positions: number[] = [];
  const zigzags = [
    [-0.54, 0.34, -0.2, 0.08, 0.12, 0.26, 0.52, -0.2],
    [-0.35, -0.5, -0.08, -0.15, 0.2, -0.24, 0.44, 0.44],
    [-0.62, -0.12, -0.25, -0.02, 0.05, -0.43, 0.5, -0.1],
  ];

  zigzags.forEach((path) => {
    for (let index = 0; index < path.length - 2; index += 2) {
      positions.push(path[index], path[index + 1], 0.04, path[index + 2], path[index + 3], 0.04);
    }
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));

  return geometry;
}

function createGlowTexture() {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  canvas.width = 256;
  canvas.height = 256;

  if (!context) {
    return new THREE.CanvasTexture(canvas);
  }

  const gradient = context.createRadialGradient(128, 128, 0, 128, 128, 128);
  gradient.addColorStop(0, "rgba(255, 255, 255, 0.8)");
  gradient.addColorStop(0.22, "rgba(255, 120, 235, 0.34)");
  gradient.addColorStop(0.54, "rgba(152, 255, 130, 0.12)");
  gradient.addColorStop(1, "rgba(255, 255, 255, 0)");

  context.fillStyle = gradient;
  context.fillRect(0, 0, 256, 256);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;

  return texture;
}

function makeParticleSpecs(variant: ChargingSparksProps["variant"]) {
  const random = seededRandom(50814);
  const count = variant === "preview" ? 54 : 104;
  const specs: ParticleSpec[] = [];
  const kinds: ParticleKind[] = ["spark", "capsule", "circle", "shard"];

  for (let index = 0; index < count; index += 1) {
    const cluster = index % 11;
    const start = (index / count) * loopDuration + random() * 0.5;
    const kind = kinds[Math.floor(random() * kinds.length)];
    const color = new THREE.Color(palette[(cluster + Math.floor(random() * 3)) % palette.length]);

    specs.push({
      angle: random() * Math.PI * 2,
      color,
      drift: THREE.MathUtils.randFloatSpread(0.55),
      duration: THREE.MathUtils.lerp(1.05, 2.75, random()),
      kind,
      radius: THREE.MathUtils.lerp(0.55, variant === "preview" ? 2.1 : 2.75, random()),
      rotation: random() * Math.PI,
      rotationSpeed: THREE.MathUtils.randFloatSpread(4.2),
      scale: THREE.MathUtils.lerp(0.06, kind === "circle" ? 0.25 : 0.24, random()),
      start: start % loopDuration,
      stretch: kind === "spark" || kind === "capsule" ? THREE.MathUtils.lerp(1.8, 3.9, random()) : THREE.MathUtils.lerp(0.65, 1.15, random()),
    });
  }

  return specs;
}

function makeBeamSpecs() {
  return [
    { angle: -1.02, color: new THREE.Color(0xff35e8), duration: 0.78, length: 5.8, offset: 0.08, start: 2.1 },
    { angle: 0.77, color: new THREE.Color(0xc54cff), duration: 0.62, length: 6.6, offset: -0.12, start: 4.35 },
    { angle: -2.05, color: new THREE.Color(0x69ff85), duration: 0.72, length: 5.3, offset: 0.16, start: 7.6 },
    { angle: -1.88, color: new THREE.Color(0xff37d4), duration: 0.88, length: 7.2, offset: -0.1, start: 11.25 },
    { angle: 0.1, color: new THREE.Color(0xff6eee), duration: 0.52, length: 3.6, offset: 0.22, start: 15.4 },
    { angle: 0.48, color: new THREE.Color(0xf5ff6a), duration: 0.72, length: 4.8, offset: -0.06, start: 18.9 },
  ] satisfies BeamSpec[];
}

function getLoopAge(time: number, start: number, duration: number) {
  const age = (time - start + loopDuration) % loopDuration;

  return age <= duration ? age : -1;
}

function BloomPipeline({ variant }: Required<ChargingSparksProps>) {
  const { camera, gl, scene, size } = useThree();
  const composerRef = useRef<EffectComposer | null>(null);

  useEffect(() => {
    const composer = new EffectComposer(gl);
    const bloom = new UnrealBloomPass(
      new THREE.Vector2(size.width, size.height),
      variant === "preview" ? 0.34 : 0.42,
      variant === "preview" ? 0.18 : 0.22,
      0.16,
    );

    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(bloom);
    composer.addPass(new OutputPass());
    composerRef.current = composer;

    return () => {
      composer.dispose();
      composerRef.current = null;
    };
  }, [camera, gl, scene, size.height, size.width, variant]);

  useEffect(() => {
    composerRef.current?.setSize(size.width, size.height);
  }, [size.height, size.width]);

  useFrame(() => {
    composerRef.current?.render();
  }, 1);

  return null;
}

function SparkScene({ variant }: Required<ChargingSparksProps>) {
  const particleRefs = useRef<Array<THREE.Mesh | null>>([]);
  const beamRefs = useRef<Array<THREE.Mesh | null>>([]);
  const coreRef = useRef<THREE.Mesh>(null);
  const haloRef = useRef<THREE.Sprite>(null);
  const lineRef = useRef<THREE.LineSegments>(null);
  const particles = useMemo(() => makeParticleSpecs(variant), [variant]);
  const beams = useMemo(() => makeBeamSpecs(), []);
  const geometries = useMemo(
    () => ({
      capsule: createCapsuleGeometry(),
      circle: new THREE.CircleGeometry(1, 36),
      shard: createTriangleGeometry(),
      spark: new THREE.PlaneGeometry(1, 0.07),
    }),
    [],
  );
  const coreGeometry = useMemo(() => createStarGeometry(), []);
  const coreLineGeometry = useMemo(() => createCoreLineGeometry(), []);
  const beamGeometry = useMemo(() => new THREE.PlaneGeometry(1, 0.035), []);
  const glowTexture = useMemo(() => createGlowTexture(), []);

  useFrame(({ clock }) => {
    const time = clock.elapsedTime % loopDuration;
    const colorWave = (Math.sin(time * 0.58) + 1) * 0.5;
    const coreColor = new THREE.Color().lerpColors(new THREE.Color(0xff3ee5), new THREE.Color(0xdfff55), colorWave);
    const coreFlicker = 0.82 + Math.sin(time * 18.0) * 0.08 + Math.sin(time * 4.7) * 0.1;

    // 中央核心用高频闪烁和轻微旋转模拟参考视频里的充能收缩感。
    if (coreRef.current) {
      const material = coreRef.current.material as THREE.MeshBasicMaterial;
      coreRef.current.rotation.z = time * 0.42 + Math.sin(time * 1.7) * 0.18;
      coreRef.current.scale.setScalar((variant === "preview" ? 0.52 : 0.64) * coreFlicker);
      material.color.copy(coreColor);
      material.opacity = 0.88;
    }

    if (haloRef.current) {
      const material = haloRef.current.material as THREE.SpriteMaterial;
      const haloScale = (variant === "preview" ? 2.55 : 3.25) + Math.sin(time * 2.2) * 0.22;
      haloRef.current.scale.set(haloScale, haloScale * 0.8, 1);
      material.color.copy(coreColor);
      material.opacity = 0.28 + Math.sin(time * 3.1) * 0.055;
    }

    if (lineRef.current) {
      const material = lineRef.current.material as THREE.LineBasicMaterial;
      lineRef.current.rotation.z = -time * 0.27;
      lineRef.current.scale.setScalar(variant === "preview" ? 0.72 : 0.92);
      material.color.copy(coreColor);
      material.opacity = 0.5 + Math.sin(time * 12) * 0.16;
    }

    particles.forEach((spec, index) => {
      const mesh = particleRefs.current[index];

      if (!mesh) {
        return;
      }

      const age = getLoopAge(time, spec.start, spec.duration);

      if (age < 0) {
        mesh.visible = false;
        return;
      }

      const progress = age / spec.duration;
      const flash = pulse(progress);
      const travel = easeOutExpo(progress);
      const angle = spec.angle + spec.drift * Math.sin(progress * Math.PI * 2);
      const radius = spec.radius * travel;
      const x = Math.cos(angle) * radius + Math.sin(time * 1.6 + index) * 0.08 * (1 - progress);
      const y = Math.sin(angle) * radius * 0.78 + Math.cos(time * 1.1 + index) * 0.08 * (1 - progress);
      const material = mesh.material as THREE.MeshBasicMaterial;
      const pop = Math.min(1, progress / 0.16) * (1 - progress * 0.52);

      mesh.visible = true;
      mesh.position.set(x, y, 0.15 + (index % 5) * 0.01);
      mesh.rotation.z = spec.rotation + angle * 0.22 + progress * spec.rotationSpeed;
      mesh.scale.set(spec.scale * spec.stretch * pop, spec.scale * pop, 1);
      material.color.copy(spec.color).lerp(coreColor, 0.18 + flash * 0.18);
      material.opacity = flash * (spec.kind === "circle" ? 0.44 : 0.9);
    });

    beams.forEach((beam, index) => {
      const mesh = beamRefs.current[index];

      if (!mesh) {
        return;
      }

      const age = getLoopAge(time, beam.start, beam.duration);

      if (age < 0) {
        mesh.visible = false;
        return;
      }

      const progress = age / beam.duration;
      const material = mesh.material as THREE.MeshBasicMaterial;
      const opacity = pulse(progress) * 0.58;
      const slide = (progress - 0.5) * 0.42;

      mesh.visible = true;
      mesh.position.set(Math.cos(beam.angle + Math.PI / 2) * beam.offset + Math.cos(beam.angle) * slide, Math.sin(beam.angle + Math.PI / 2) * beam.offset + Math.sin(beam.angle) * slide, 0.08);
      mesh.rotation.z = beam.angle;
      mesh.scale.set(beam.length * (0.72 + progress * 0.35), 1, 1);
      material.color.copy(beam.color);
      material.opacity = opacity;
    });
  });

  return (
    <group>
      <sprite ref={haloRef} position={[0, 0, -0.08]}>
        <spriteMaterial blending={THREE.AdditiveBlending} color={0xff4bd8} depthWrite={false} map={glowTexture} opacity={0.28} transparent />
      </sprite>

      <lineSegments ref={lineRef} geometry={coreLineGeometry}>
        <lineBasicMaterial blending={THREE.AdditiveBlending} color={0xffeeff} depthWrite={false} opacity={0.58} transparent />
      </lineSegments>

      <mesh ref={coreRef} geometry={coreGeometry} position={[0, 0, 0.12]}>
        <meshBasicMaterial blending={THREE.AdditiveBlending} color={0xff45df} depthWrite={false} opacity={0.9} transparent />
      </mesh>

      {particles.map((spec, index) => (
        <mesh
          geometry={geometries[spec.kind]}
          key={`${spec.kind}-${index}`}
          ref={(node) => {
            particleRefs.current[index] = node;
          }}
          visible={false}
        >
          <meshBasicMaterial blending={THREE.AdditiveBlending} color={spec.color} depthWrite={false} opacity={0} transparent />
        </mesh>
      ))}

      {beams.map((beam, index) => (
        <mesh
          geometry={beamGeometry}
          key={`beam-${index}`}
          ref={(node) => {
            beamRefs.current[index] = node;
          }}
          visible={false}
        >
          <meshBasicMaterial blending={THREE.AdditiveBlending} color={beam.color} depthWrite={false} opacity={0} transparent />
        </mesh>
      ))}
    </group>
  );
}

export function ChargingSparks({ variant = "detail" }: ChargingSparksProps) {
  const rootStyle = useMemo(
    () =>
      ({
        "--charging-sparks-min-height": variant === "preview" ? "100%" : "42rem",
      }) as CSSProperties,
    [variant],
  );

  return (
    <section className={`${styles.root} ${variant === "preview" ? styles.preview : ""}`} data-effect="charging-sparks" style={rootStyle}>
      <Canvas
        className={styles.canvas}
        dpr={[1, 1.75]}
        gl={{ alpha: true, antialias: true, preserveDrawingBuffer: true }}
        orthographic
        camera={{ position: [0, 0, 8], zoom: variant === "preview" ? 82 : 96 }}
      >
        <color args={["#111111"]} attach="background" />
        <SparkScene variant={variant} />
        <BloomPipeline variant={variant} />
      </Canvas>
      <div className={styles.vignette} />
      <div className={styles.grain} />
    </section>
  );
}
