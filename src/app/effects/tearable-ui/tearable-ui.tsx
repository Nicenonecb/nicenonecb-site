"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import type { ChangeEvent, RefObject } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import {
  cloneDefaultUiState,
  createTextureCanvas,
  findHitRegion,
  getTextureSize,
  preloadTearableAssets,
  redrawLayer,
  type CanvasUiState,
  type HitRegion,
  type TearableLayerKind,
} from "./tearable-canvas";
import styles from "./tearable-ui.module.css";

type TearableUiProps = {
  variant?: "page" | "preview";
};

type LayerStatus = "active" | "inactive" | "dropped" | "hidden";

type WorkerFrame = {
  brokenCount: number;
  buffer: ArrayBuffer;
  drawCount: number;
  id: number;
  index: ArrayBuffer;
  normals: ArrayBuffer;
  type: "stepResult";
};

type WorkerReady = {
  constraintCount: number;
  id: number;
  particleCount: number;
  type: "ready";
};

type LayerState = {
  kind: TearableLayerKind;
  status: LayerStatus;
};

const layers: TearableLayerKind[] = ["intro", "inputs", "products", "video", "indestructible"];
const clothConfig = {
  constraintIterations: 2,
  cutRadius: 0.05,
  damping: 0.97,
  dropThreshold: 4.5,
  gravityY: -0.0003,
  mouseRadius: 0.4,
  mouseStrength: 0.6,
  stiffness: 0.25,
  subSteps: 1,
  tearThreshold: 5.5,
};

const mobileClothConfig = {
  ...clothConfig,
  constraintIterations: 1,
  gravityY: -0.0006,
  mouseRadius: 0.2,
  mouseStrength: 0.72,
  dropThreshold: 5.5,
  tearThreshold: 4.1,
};

export function TearableUi({ variant = "page" }: TearableUiProps) {
  const rootRef = useRef<HTMLElement | null>(null);
  const [uiState, setUiState] = useState<CanvasUiState>(() => cloneDefaultUiState());
  const [assetVersion, setAssetVersion] = useState(0);
  const [windowSize, setWindowSize] = useState({ height: 1, width: 1 });
  const [layerStates, setLayerStates] = useState<LayerState[]>(() =>
    layers.map((kind, index) => ({
      kind,
      status: index === 0 ? "active" : "inactive",
    })),
  );
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const activeLayerIndex = layerStates.findIndex((layer) => layer.status === "active");

  useEffect(() => {
    if (variant !== "page") {
      return;
    }

    document.documentElement.classList.add(styles.documentLock);
    document.body.classList.add(styles.documentLock);
    return () => {
      document.documentElement.classList.remove(styles.documentLock);
      document.body.classList.remove(styles.documentLock);
    };
  }, [variant]);

  useEffect(() => {
    preloadTearableAssets().then(() => setAssetVersion((current) => current + 1));
  }, []);

  useEffect(() => {
    const updateWindowSize = () => {
      const bounds = rootRef.current?.getBoundingClientRect();

      setWindowSize({
        height: bounds?.height || window.innerHeight,
        width: bounds?.width || window.innerWidth,
      });
    };

    updateWindowSize();
    window.addEventListener("resize", updateWindowSize);

    const resizeObserver = new ResizeObserver(updateWindowSize);
    if (rootRef.current) {
      resizeObserver.observe(rootRef.current);
    }

    return () => {
      window.removeEventListener("resize", updateWindowSize);
      resizeObserver.disconnect();
    };
  }, []);

  const handleDrop = useCallback((index: number) => {
    setLayerStates((current) =>
      current.map((layer, layerIndex) => {
        if (layerIndex === index) {
          return { ...layer, status: "dropped" };
        }

        if (layerIndex === index + 1 && layer.status !== "hidden") {
          return { ...layer, status: "active" };
        }

        return layer;
      }),
    );

    window.setTimeout(() => {
      setLayerStates((current) =>
        current.map((layer, layerIndex) =>
          layerIndex === index ? { ...layer, status: "hidden" } : layer,
        ),
      );
    }, 4000);
  }, []);

  const handleUiHover = useCallback((region: HitRegion | undefined) => {
    const nextHoveredId = region?.id ?? null;
    setUiState((current) =>
      current.hoveredId === nextHoveredId ? current : { ...current, hoveredId: nextHoveredId },
    );
  }, []);

  const handleUiHit = useCallback((region: HitRegion | undefined, uv: THREE.Vector2, textureWidth: number) => {
    if (!region) {
      setUiState((current) => ({ ...current, activeField: null }));
      return;
    }

    if (region.type === "input") {
      setUiState((current) => ({ ...current, activeField: region.id as CanvasUiState["activeField"] }));
      window.requestAnimationFrame(() => inputRef.current?.focus());
      return;
    }

    if (region.type === "slider") {
      const textureX = uv.x * textureWidth;
      const value = Math.min(1, Math.max(0, (textureX - region.x) / region.width));
      setUiState((current) => ({ ...current, activeField: null, shininess: value }));
      return;
    }

    if (region.type === "toggle") {
      setUiState((current) => ({
        ...current,
        activeField: null,
        autosave: region.id === "toggle-autosave" ? !current.autosave : current.autosave,
        oily: region.id === "toggle-oily" ? !current.oily : current.oily,
      }));
      return;
    }

    setUiState((current) => ({
      ...current,
      activeField: null,
      buttonClicked: region.id === "dont-click" ? true : current.buttonClicked,
      savedCount: region.id === "save-btn" ? current.savedCount + 1 : current.savedCount,
    }));
  }, []);

  const handleInputChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setUiState((current) => {
      if (current.activeField === "input-email") {
        return { ...current, inputEmail: event.target.value.slice(0, 42) };
      }

      if (current.activeField === "input-name") {
        return { ...current, inputName: event.target.value.slice(0, 28) };
      }

      return current;
    });
  }, []);

  const aspect = windowSize.width / windowSize.height;
  const cameraBounds =
    aspect > 1
      ? { bottom: -1, left: -aspect, right: aspect, top: 1 }
      : { bottom: -1 / aspect, left: -1, right: 1, top: 1 / aspect };

  return (
    <main
      className={`${styles.root} ${variant === "preview" ? styles.previewRoot : ""} ${
        isDragging ? styles.dragging : ""
      }`}
      data-effect="tearable-ui"
      onContextMenu={(event) => event.preventDefault()}
      ref={rootRef}
    >
      <Canvas
        className={styles.canvas}
        dpr={[1, 1.75]}
        camera={{
          bottom: cameraBounds.bottom,
          far: 100,
          left: cameraBounds.left,
          near: 0.1,
          position: [0, 0, 5],
          right: cameraBounds.right,
          top: cameraBounds.top,
        }}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: "high-performance",
        }}
        orthographic
        shadows
      >
        <color attach="background" args={["#d0cdca"]} />
        <ambientLight intensity={1.5} />
        <directionalLight
          castShadow
          intensity={0.4}
          position={[0.3, 0.3, 5]}
          shadow-mapSize-height={1024}
          shadow-mapSize-width={1024}
        />
        <directionalLight intensity={1.2} position={[0, 5, 4]} />
        <TearableScene
          activeLayerIndex={activeLayerIndex}
          layerStates={layerStates}
          assetVersion={assetVersion}
          interactionRootRef={rootRef}
          onDrop={handleDrop}
          onDragStateChange={setIsDragging}
          onUiHover={handleUiHover}
          onUiHit={handleUiHit}
          uiState={uiState}
        />
      </Canvas>

      <input
        ref={inputRef}
        aria-label="Canvas texture input"
        className={styles.hiddenInput}
        value={uiState.activeField === "input-email" ? uiState.inputEmail : uiState.inputName}
        onChange={handleInputChange}
      />
    </main>
  );
}

function TearableScene({
  activeLayerIndex,
  assetVersion,
  interactionRootRef,
  layerStates,
  onDragStateChange,
  onDrop,
  onUiHover,
  onUiHit,
  uiState,
}: {
  activeLayerIndex: number;
  assetVersion: number;
  interactionRootRef: RefObject<HTMLElement | null>;
  layerStates: LayerState[];
  onDragStateChange: (isDragging: boolean) => void;
  onDrop: (index: number) => void;
  onUiHover: (region: HitRegion | undefined) => void;
  onUiHit: (region: HitRegion | undefined, uv: THREE.Vector2, textureWidth: number) => void;
  uiState: CanvasUiState;
}) {
  const { size } = useThree();
  const isMobile = size.width < 760;
  const aspect = size.width / size.height;
  const planeWidth = aspect > 1 ? aspect * 2 : 2;
  const planeHeight = aspect > 1 ? 2 : 2 / aspect;

  return (
    <group>
      {[...layerStates].reverse().map((layer, reverseIndex) => {
        const layerIndex = layerStates.length - 1 - reverseIndex;
        if (layer.status === "hidden") {
          return null;
        }

        return (
          <ClothLayer
            activeLayerIndex={activeLayerIndex}
            assetVersion={assetVersion}
            isMobile={isMobile}
            key={layer.kind}
            layerIndex={layerIndex}
            layerKind={layer.kind}
            interactionRootRef={interactionRootRef}
            onDragStateChange={onDragStateChange}
            onDrop={onDrop}
            onUiHover={onUiHover}
            onUiHit={onUiHit}
            status={layer.status}
            uiState={uiState}
            viewportHeight={planeHeight}
            viewportWidth={planeWidth}
          />
        );
      })}
    </group>
  );
}

function ClothLayer({
  activeLayerIndex,
  assetVersion,
  interactionRootRef,
  isMobile,
  layerIndex,
  layerKind,
  onDragStateChange,
  onDrop,
  onUiHover,
  onUiHit,
  status,
  uiState,
  viewportHeight,
  viewportWidth,
}: {
  activeLayerIndex: number;
  assetVersion: number;
  interactionRootRef: RefObject<HTMLElement | null>;
  isMobile: boolean;
  layerIndex: number;
  layerKind: TearableLayerKind;
  onDragStateChange: (isDragging: boolean) => void;
  onDrop: (index: number) => void;
  onUiHover: (region: HitRegion | undefined) => void;
  onUiHit: (region: HitRegion | undefined, uv: THREE.Vector2, textureWidth: number) => void;
  status: LayerStatus;
  uiState: CanvasUiState;
  viewportHeight: number;
  viewportWidth: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const geometryRef = useRef<THREE.BufferGeometry>(null);
  const workerRef = useRef<Worker | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | OffscreenCanvas | null>(null);
  const activePointerRef = useRef<{
    button: number;
    lastPoint: THREE.Vector3;
    moved: boolean;
    startUv: THREE.Vector2;
  } | null>(null);
  const regionsRef = useRef<HitRegion[]>([]);
  const textureRef = useRef<THREE.Texture | null>(null);
  const droppedRef = useRef(false);
  const hasDroppedRef = useRef(false);
  const clothIdRef = useRef(0);
  const constraintCountRef = useRef(1);
  const inFlightRef = useRef(false);
  const readyRef = useRef(false);
  const lastVideoFrameRef = useRef(0);
  const meshDataVersionRef = useRef(0);
  const tearPercentRef = useRef(0);
  const transitBufferRef = useRef<ArrayBuffer | null>(null);
  const statusRef = useRef(status);
  const isActive = status === "active";
  const isPhysicsLayer = status === "active" || status === "dropped";
  const segments = isMobile ? 40 : 100;
  const z = (layers.length - layerIndex) * 0.35;
  const config = isMobile ? mobileClothConfig : clothConfig;
  const tearThreshold = layerKind === "indestructible" ? 9999 : config.tearThreshold;
  const textureSize = useMemo(
    () => getTextureSize(viewportWidth / viewportHeight, isMobile),
    [isMobile, viewportHeight, viewportWidth],
  );

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const textureBundle = useMemo(() => {
    const canvas = createTextureCanvas(textureSize.width, textureSize.height);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    texture.needsUpdate = true;

    return { canvas, texture };
  }, [textureSize.height, textureSize.width]);

  useEffect(() => {
    canvasRef.current = textureBundle.canvas;
    textureRef.current = textureBundle.texture;
    regionsRef.current = redrawLayer(textureBundle.canvas, layerKind, uiState);
    textureRef.current.needsUpdate = true;
  }, [assetVersion, layerKind, textureBundle, uiState]);

  useEffect(() => {
    const texture = textureBundle.texture;

    return () => {
      texture.dispose();
    };
  }, [textureBundle]);

  const flatGeometry = useMemo(() => {
    return createPlaneGeometry(viewportWidth, viewportHeight, segments, segments);
  }, [segments, viewportHeight, viewportWidth]);

  useEffect(() => {
    geometryRef.current = flatGeometry;
  }, [flatGeometry]);

  useEffect(() => {
    return () => {
      flatGeometry.dispose();
    };
  }, [flatGeometry]);

  useEffect(() => {
    const geometry = geometryRef.current;

    if (!geometry || !isPhysicsLayer) {
      return;
    }

    hasDroppedRef.current = false;
    constraintCountRef.current = 1;
    inFlightRef.current = false;
    readyRef.current = false;
    meshDataVersionRef.current = 0;
    tearPercentRef.current = 0;
    transitBufferRef.current = null;
    clothIdRef.current += 1;
    const clothId = clothIdRef.current;
    const worker = new Worker(new URL("./cloth-worker.ts", import.meta.url), { type: "module" });
    workerRef.current = worker;

    worker.postMessage({
      height: viewportHeight,
      id: clothId,
      segX: segments,
      segY: segments,
      stiffness: 0.25,
      tearThreshold,
      type: "init",
      width: viewportWidth,
    });

    worker.onmessage = (event: MessageEvent<WorkerFrame | WorkerReady>) => {
      const frame = event.data;
      if (frame.id !== clothId) {
        return;
      }

      if (frame.type === "ready") {
        constraintCountRef.current = frame.constraintCount || 1;
        readyRef.current = true;
        return;
      }

      const positionAttribute = geometry.getAttribute("position") as THREE.BufferAttribute | undefined;
      const normalAttribute = geometry.getAttribute("normal") as THREE.BufferAttribute | undefined;

      const positions = new Float32Array(frame.buffer);
      if (!positionAttribute || positions.length !== positionAttribute.array.length) {
        return;
      }

      positionAttribute.array.set(positions);
      positionAttribute.needsUpdate = true;
      transitBufferRef.current = frame.buffer;

      if (normalAttribute) {
        const normals = new Float32Array(frame.normals);
        if (normals.length === normalAttribute.array.length) {
          normalAttribute.array.set(normals);
          normalAttribute.needsUpdate = true;
        }
      }

      const indices = new Uint32Array(frame.index);
      const indexAttribute = geometry.getIndex();
      if (indexAttribute && indexAttribute.array.length >= indices.length) {
        indexAttribute.array.set(indices);
        indexAttribute.needsUpdate = true;
      } else {
        geometry.setIndex(new THREE.BufferAttribute(indices, 1));
      }
      geometry.setDrawRange(0, frame.drawCount);
      meshDataVersionRef.current += 1;
      inFlightRef.current = false;

      const tearPercent = (frame.brokenCount / constraintCountRef.current) * 100;
      tearPercentRef.current = tearPercent;

      if (
        layerKind !== "indestructible" &&
        statusRef.current === "active" &&
        tearPercent >= (isMobile ? mobileClothConfig.dropThreshold : clothConfig.dropThreshold) &&
        !hasDroppedRef.current
      ) {
        hasDroppedRef.current = true;
        droppedRef.current = true;
        worker.postMessage({ id: clothId, type: "drop" });
        onDrop(layerIndex);
      }
    };

    return () => {
      worker.postMessage({ id: clothId, type: "dispose" });
      worker.terminate();
      workerRef.current = null;
      droppedRef.current = false;
      readyRef.current = false;
      activePointerRef.current = null;
    };
  }, [
    config.tearThreshold,
    isMobile,
    isPhysicsLayer,
    layerIndex,
    layerKind,
    onDrop,
    segments,
    tearThreshold,
    viewportHeight,
    viewportWidth,
  ]);

  useEffect(() => {
    if (status === "dropped") {
      workerRef.current?.postMessage({ id: clothIdRef.current, type: "drop" });
    }
  }, [status]);

  useFrame((_, delta) => {
    if (!meshRef.current) {
      return;
    }

    if (status === "inactive") {
      meshRef.current.position.z = z - Math.max(0, layerIndex - activeLayerIndex) * 0.08;
      return;
    }

    meshRef.current.position.z = status === "dropped" ? z + 0.12 : z;
    const worker = workerRef.current;

    if (worker && readyRef.current && isPhysicsLayer && !inFlightRef.current) {
      const activePointer = activePointerRef.current;
      if (isActive && activePointer && activePointer.button === 0) {
        worker.postMessage({
          id: clothIdRef.current,
          slot: 0,
          strength: config.mouseStrength,
          type: "moveGrab",
          x: activePointer.lastPoint.x,
          y: activePointer.lastPoint.y,
        });
      }

      const hasTears =
        meshDataVersionRef.current > 1 && constraintCountRef.current > 1 && tearPercentRef.current > 0;
      const hasGravity = status === "dropped" || hasTears;
      const frameScale = Math.min(3, Math.max(0.5, delta * 60));
      const gravityScale = status === "dropped" ? 3 : hasTears ? 2.5 : 1;
      inFlightRef.current = true;
      const transferBuffer = transitBufferRef.current;
      transitBufferRef.current = null;
      const message = {
        buffer: transferBuffer ?? undefined,
        damping: config.damping,
        gx: 0,
        gy: hasGravity ? config.gravityY * gravityScale * frameScale : 0,
        gz: 0,
        id: clothIdRef.current,
        iterations: config.constraintIterations,
        subSteps: config.subSteps,
        type: "step" as const,
      };

      if (transferBuffer) {
        worker.postMessage(message, [transferBuffer]);
      } else {
        worker.postMessage(message);
      }
    }

    if (layerKind === "video" && !droppedRef.current) {
      lastVideoFrameRef.current += delta;
      if (lastVideoFrameRef.current > 1 / 30) {
        const canvas = canvasRef.current;
        const texture = textureRef.current;

        lastVideoFrameRef.current = 0;
        if (canvas && texture) {
          redrawLayer(canvas, layerKind, uiState);
          texture.needsUpdate = true;
        }
      }
    }
  });

  useEffect(() => {
    if (!isActive || !isPhysicsLayer) {
      return;
    }

    const getInteractionBounds = () => {
      return (
        interactionRootRef.current?.getBoundingClientRect() ?? {
          height: window.innerHeight,
          left: 0,
          top: 0,
          width: window.innerWidth,
        }
      );
    };

    const clientToPoint = (clientX: number, clientY: number) => {
      const bounds = getInteractionBounds();
      const x = ((clientX - bounds.left) / Math.max(bounds.width, 1) - 0.5) * viewportWidth;
      const y = (0.5 - (clientY - bounds.top) / Math.max(bounds.height, 1)) * viewportHeight;
      return new THREE.Vector3(x, y, 0);
    };

    const clientToUv = (clientX: number, clientY: number) => {
      const bounds = getInteractionBounds();

      return new THREE.Vector2(
        (clientX - bounds.left) / Math.max(bounds.width, 1),
        1 - (clientY - bounds.top) / Math.max(bounds.height, 1),
      );
    };

    const handleMouseDown = (event: MouseEvent) => {
      const uv = clientToUv(event.clientX, event.clientY);
      const region = findHitRegion(regionsRef.current, uv, textureBundle.canvas.width, textureBundle.canvas.height);
      onUiHit(region, uv, textureBundle.canvas.width);

      if (region) {
        return;
      }

      event.preventDefault();
      const point = clientToPoint(event.clientX, event.clientY);
      activePointerRef.current = {
        button: event.button,
        lastPoint: point,
        moved: false,
        startUv: uv,
      };
      onDragStateChange(true);

      if (event.button === 0) {
        workerRef.current?.postMessage({
          id: clothIdRef.current,
          radius: config.mouseRadius,
          slot: 0,
          type: "grab",
          x: point.x,
          y: point.y,
          z: point.z,
        });
      }
    };

    const handleMouseMove = (event: MouseEvent) => {
      const uv = clientToUv(event.clientX, event.clientY);
      onUiHover(findHitRegion(regionsRef.current, uv, textureBundle.canvas.width, textureBundle.canvas.height));

      const activePointer = activePointerRef.current;
      if (!activePointer) {
        return;
      }

      const point = clientToPoint(event.clientX, event.clientY);
      const previous = activePointer.lastPoint.clone();
      activePointer.moved =
        activePointer.moved || point.distanceTo(activePointer.lastPoint) > 0.02;
      activePointer.lastPoint = point;

      if (activePointer.button === 2) {
        workerRef.current?.postMessage({
          id: clothIdRef.current,
          mx: point.x,
          my: point.y,
          mz: point.z,
          px: previous.x,
          py: previous.y,
          radius: config.cutRadius,
          type: "cut",
        });
      } else {
        workerRef.current?.postMessage({
          id: clothIdRef.current,
          slot: 0,
          strength: config.mouseStrength,
          type: "moveGrab",
          x: point.x,
          y: point.y,
        });
      }
    };

    const handleMouseUp = () => {
      workerRef.current?.postMessage({ id: clothIdRef.current, type: "releaseGrab" });
      activePointerRef.current = null;
      onDragStateChange(false);
    };

    const handleMouseLeave = () => {
      workerRef.current?.postMessage({ id: clothIdRef.current, type: "releaseGrab" });
      activePointerRef.current = null;
      onUiHover(undefined);
      onDragStateChange(false);
    };

    const interactionElement = interactionRootRef.current;

    if (interactionElement) {
      interactionElement.addEventListener("mousedown", handleMouseDown);
      interactionElement.addEventListener("mouseleave", handleMouseLeave);
    } else {
      window.addEventListener("mousedown", handleMouseDown);
      window.addEventListener("mouseleave", handleMouseLeave);
    }

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      if (interactionElement) {
        interactionElement.removeEventListener("mousedown", handleMouseDown);
        interactionElement.removeEventListener("mouseleave", handleMouseLeave);
      } else {
        window.removeEventListener("mousedown", handleMouseDown);
        window.removeEventListener("mouseleave", handleMouseLeave);
      }

      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [
    config.cutRadius,
    config.mouseRadius,
    config.mouseStrength,
    interactionRootRef,
    isActive,
    isPhysicsLayer,
    onDragStateChange,
    onUiHit,
    onUiHover,
    textureBundle,
    viewportHeight,
    viewportWidth,
  ]);

  return (
    <mesh
      castShadow
      receiveShadow
      geometry={flatGeometry}
      ref={meshRef}
    >
      <meshStandardMaterial
        color="#ffffff"
        map={textureBundle.texture}
        metalness={layerKind === "inputs" && uiState.oily ? 0.3 : 0.1}
        roughness={layerKind === "inputs" && uiState.oily ? 0.1 : 1}
        side={THREE.DoubleSide}
        vertexColors
      />
    </mesh>
  );
}

function createPlaneGeometry(width: number, height: number, segmentsX: number, segmentsY: number) {
  const vertexCount = (segmentsX + 1) * (segmentsY + 1);
  const positions = new Float32Array(vertexCount * 3);
  const uvs = new Float32Array(vertexCount * 2);
  const colors = new Float32Array(vertexCount * 3);
  const indices: number[] = [];

  for (let y = 0; y <= segmentsY; y += 1) {
    for (let x = 0; x <= segmentsX; x += 1) {
      const index = y * (segmentsX + 1) + x;
      const u = x / segmentsX;
      const v = y / segmentsY;
      const offset = index * 3;

      positions[offset] = (u - 0.5) * width;
      positions[offset + 1] = (0.5 - v) * height;
      positions[offset + 2] = 0;
      uvs[index * 2] = u;
      uvs[index * 2 + 1] = 1 - v;
      colors[offset] = 0.95 + Math.sin(u * Math.PI) * 0.05;
      colors[offset + 1] = 0.95 + Math.sin(v * Math.PI) * 0.05;
      colors[offset + 2] = 0.95;
    }
  }

  for (let y = 0; y < segmentsY; y += 1) {
    for (let x = 0; x < segmentsX; x += 1) {
      const a = y * (segmentsX + 1) + x;
      const b = a + 1;
      const c = a + segmentsX + 1;
      const d = c + 1;
      indices.push(a, b, d, a, d, c);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  return geometry;
}
