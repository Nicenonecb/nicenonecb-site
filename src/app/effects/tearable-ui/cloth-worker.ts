type InitMessage = {
  debug?: boolean;
  height: number;
  id: number;
  segX: number;
  segY: number;
  stiffness: number;
  tearThreshold: number;
  type: "init";
  width: number;
};

type DisposeMessage = {
  id: number;
  type: "dispose";
};

type GrabMessage = {
  id: number;
  radius: number;
  slot?: number;
  type: "grab";
  x: number;
  y: number;
  z: number;
};

type MoveGrabMessage = {
  id: number;
  slot?: number;
  strength: number;
  type: "moveGrab";
  x: number;
  y: number;
};

type ReleaseGrabMessage = {
  id: number;
  slot?: number;
  type: "releaseGrab";
};

type CutMessage = {
  id: number;
  mx: number;
  my: number;
  mz: number;
  px: number;
  py: number;
  radius: number;
  type: "cut";
};

type DropMessage = {
  id: number;
  type: "drop";
};

type StepMessage = {
  buffer?: ArrayBuffer;
  damping: number;
  gx: number;
  gy: number;
  gz: number;
  id: number;
  iterations: number;
  subSteps: number;
  type: "step";
};

type IncomingMessage =
  | CutMessage
  | DisposeMessage
  | DropMessage
  | GrabMessage
  | InitMessage
  | MoveGrabMessage
  | ReleaseGrabMessage
  | StepMessage;

type WorkerScope = {
  location: Location;
  onmessage: ((event: MessageEvent<IncomingMessage>) => void) | null;
  postMessage: (message: unknown, transfer?: Transferable[]) => void;
};

type WasmExports = {
  broken_count: () => number;
  constraint_count: () => number;
  cut: (mx: number, my: number, mz: number, px: number, py: number, radius: number) => void;
  drop_pins: () => void;
  grab: (slot: number, x: number, y: number, z: number, radius: number) => void;
  init: (
    width: number,
    height: number,
    segX: number,
    segY: number,
    tearThreshold: number,
    stiffness: number,
  ) => void;
  memory: WebAssembly.Memory;
  move_grab: (slot: number, x: number, y: number, strength: number) => void;
  particle_count: () => number;
  pos_len: () => number;
  pos_ptr: () => number;
  release_all_grabs: () => void;
  release_grab: (slot: number) => void;
  step: (
    gx: number,
    gy: number,
    gz: number,
    damping: number,
    iterations: number,
    subSteps: number,
  ) => void;
};

type ClothState = {
  exports: WasmExports;
  indexBuf: Uint32Array;
  maxLengthSq: number;
  normalsBuf: Float32Array;
  particleCount: number;
  pendingMessages: IncomingMessage[];
  posView: Float32Array;
  segX: number;
  segY: number;
  width: number;
};

const workerScope = self as unknown as WorkerScope;
const cloths = new Map<number, ClothState>();
const pendingInits: Array<{ id: number; msg: IncomingMessage }> = [];
let wasmReady = false;
let debug = false;

const wasmModulePromise = loadWasmModule();

wasmModulePromise
  .then(() => {
    wasmReady = true;
    pendingInits.splice(0).forEach(({ id, msg }) => handleMessage(id, msg));
  })
  .catch((error: unknown) => {
    console.error("[cloth.worker] WASM compile failed", error);
  });

workerScope.onmessage = (event: MessageEvent<IncomingMessage>) => {
  const message = event.data;

  if (!wasmReady) {
    pendingInits.push({ id: message.id, msg: message });
    return;
  }

  handleMessage(message.id, message);
};

async function loadWasmModule() {
  const wasmUrl = new URL("/effects/tearable-ui/cloth-sim.wasm", workerScope.location.origin);
  const response = await fetch(wasmUrl);

  if (!response.ok) {
    throw new Error(`Failed to fetch cloth-sim.wasm: ${response.status}`);
  }

  if (WebAssembly.compileStreaming) {
    return WebAssembly.compileStreaming(response);
  }

  return WebAssembly.compile(await response.arrayBuffer());
}

async function createCloth(
  width: number,
  height: number,
  segX: number,
  segY: number,
  tearThreshold: number,
  stiffness: number,
) {
  const wasmModule = await wasmModulePromise;
  const instance = await WebAssembly.instantiate(wasmModule, {});
  const exports = instance.exports as unknown as WasmExports;
  exports.init(width, height, segX, segY, tearThreshold, stiffness);

  const posView = new Float32Array(exports.memory.buffer, exports.pos_ptr(), exports.pos_len());
  const particleCount = exports.particle_count();
  const maxEdgeLength = (width / segX) * tearThreshold;

  return {
    exports,
    indexBuf: new Uint32Array(segX * segY * 6),
    maxLengthSq: maxEdgeLength * maxEdgeLength,
    normalsBuf: new Float32Array(particleCount * 3),
    particleCount,
    pendingMessages: [],
    posView,
    segX,
    segY,
    width,
  } satisfies ClothState;
}

function handleMessage(id: number, message: IncomingMessage) {
  if (message.type === "init") {
    debug = Boolean(message.debug);
    createCloth(message.width, message.height, message.segX, message.segY, message.tearThreshold, message.stiffness)
      .then((cloth) => {
        cloths.set(id, cloth);
        workerScope.postMessage({
          constraintCount: cloth.exports.constraint_count(),
          id,
          particleCount: cloth.exports.particle_count(),
          type: "ready",
        });
        cloth.pendingMessages.splice(0).forEach((pending) => handleMessage(id, pending));
      })
      .catch((error: unknown) => {
        console.error("[cloth.worker] init failed", error);
      });
    return;
  }

  if (message.type === "dispose") {
    cloths.delete(id);
    return;
  }

  const cloth = cloths.get(id);
  if (!cloth) {
    return;
  }

  if (message.type === "grab") {
    cloth.exports.grab(message.slot ?? 0, message.x, message.y, message.z, message.radius);
    return;
  }

  if (message.type === "moveGrab") {
    cloth.exports.move_grab(message.slot ?? 0, message.x, message.y, message.strength);
    return;
  }

  if (message.type === "releaseGrab") {
    if (typeof message.slot === "number") {
      cloth.exports.release_grab(message.slot);
    } else {
      cloth.exports.release_all_grabs();
    }
    return;
  }

  if (message.type === "cut") {
    cloth.exports.cut(message.mx, message.my, message.mz, message.px, message.py, message.radius);
    return;
  }

  if (message.type === "drop") {
    cloth.exports.drop_pins();
    return;
  }

  if (message.type === "step") {
    stepCloth(id, cloth, message);
  }
}

function stepCloth(id: number, cloth: ClothState, message: StepMessage) {
  const startedAt = debug ? performance.now() : 0;
  cloth.exports.step(message.gx, message.gy, message.gz, message.damping, message.iterations, message.subSteps);

  if (debug) {
    const duration = performance.now() - startedAt;
    if (duration > 10) {
      console.warn(`[cloth.worker SPIKE id=${id}] step=${duration.toFixed(1)}ms`);
    }
  }

  let positions = cloth.posView;
  if (
    positions.buffer !== cloth.exports.memory.buffer ||
    positions.length !== cloth.exports.pos_len()
  ) {
    positions = new Float32Array(cloth.exports.memory.buffer, cloth.exports.pos_ptr(), cloth.exports.pos_len());
    cloth.posView = positions;
  }

  const positionBuffer =
    message.buffer instanceof ArrayBuffer && message.buffer.byteLength === positions.byteLength
      ? message.buffer
      : new ArrayBuffer(positions.byteLength);
  new Float32Array(positionBuffer).set(positions);

  const drawCount = rebuildMeshBuffers(cloth);
  const normalBuffer = new ArrayBuffer(cloth.normalsBuf.byteLength);
  new Float32Array(normalBuffer).set(cloth.normalsBuf);
  const indexBuffer = new ArrayBuffer(drawCount * 4);
  new Uint32Array(indexBuffer).set(cloth.indexBuf.subarray(0, drawCount));

  workerScope.postMessage(
    {
      brokenCount: cloth.exports.broken_count(),
      buffer: positionBuffer,
      drawCount,
      id,
      index: indexBuffer,
      normals: normalBuffer,
      type: "stepResult",
    },
    [positionBuffer, normalBuffer, indexBuffer],
  );
}

function rebuildMeshBuffers(cloth: ClothState) {
  const { indexBuf, maxLengthSq, normalsBuf, particleCount, posView, segX, segY } = cloth;
  const row = segX + 1;
  normalsBuf.fill(0);
  let drawCount = 0;

  for (let y = 0; y < segY; y += 1) {
    for (let x = 0; x < segX; x += 1) {
      const topLeft = x + row * y;
      const bottomLeft = x + row * (y + 1);
      const bottomRight = x + 1 + row * (y + 1);
      const topRight = x + 1 + row * y;

      if (edgeLengthSq(posView, topLeft, bottomLeft) < maxLengthSq && edgeLengthSq(posView, topLeft, topRight) < maxLengthSq) {
        indexBuf[drawCount++] = topLeft;
        indexBuf[drawCount++] = bottomLeft;
        indexBuf[drawCount++] = topRight;
        accumulateNormal(posView, normalsBuf, topLeft, bottomLeft, topRight);
      }

      if (edgeLengthSq(posView, bottomLeft, bottomRight) < maxLengthSq && edgeLengthSq(posView, bottomRight, topRight) < maxLengthSq) {
        indexBuf[drawCount++] = bottomLeft;
        indexBuf[drawCount++] = bottomRight;
        indexBuf[drawCount++] = topRight;
        accumulateNormal(posView, normalsBuf, bottomLeft, bottomRight, topRight);
      }
    }
  }

  for (let index = 0; index < particleCount; index += 1) {
    const offset = index * 3;
    const nx = normalsBuf[offset];
    const ny = normalsBuf[offset + 1];
    const nz = normalsBuf[offset + 2];
    const length = Math.hypot(nx, ny, nz);

    if (length > 0.000001) {
      normalsBuf[offset] = nx / length;
      normalsBuf[offset + 1] = ny / length;
      normalsBuf[offset + 2] = nz / length;
    } else {
      normalsBuf[offset] = 0;
      normalsBuf[offset + 1] = 0;
      normalsBuf[offset + 2] = 1;
    }
  }

  return drawCount;
}

function edgeLengthSq(positions: Float32Array, a: number, b: number) {
  const offsetA = a * 3;
  const offsetB = b * 3;
  const dx = positions[offsetA] - positions[offsetB];
  const dy = positions[offsetA + 1] - positions[offsetB + 1];
  const dz = positions[offsetA + 2] - positions[offsetB + 2];
  return dx * dx + dy * dy + dz * dz;
}

function accumulateNormal(
  positions: Float32Array,
  normals: Float32Array,
  a: number,
  b: number,
  c: number,
) {
  const offsetA = a * 3;
  const offsetB = b * 3;
  const offsetC = c * 3;
  const abx = positions[offsetB] - positions[offsetA];
  const aby = positions[offsetB + 1] - positions[offsetA + 1];
  const abz = positions[offsetB + 2] - positions[offsetA + 2];
  const acx = positions[offsetC] - positions[offsetA];
  const acy = positions[offsetC + 1] - positions[offsetA + 1];
  const acz = positions[offsetC + 2] - positions[offsetA + 2];
  const nx = aby * acz - abz * acy;
  const ny = abz * acx - abx * acz;
  const nz = abx * acy - aby * acx;

  normals[offsetA] += nx;
  normals[offsetA + 1] += ny;
  normals[offsetA + 2] += nz;
  normals[offsetB] += nx;
  normals[offsetB + 1] += ny;
  normals[offsetB + 2] += nz;
  normals[offsetC] += nx;
  normals[offsetC + 1] += ny;
  normals[offsetC + 2] += nz;
}

export {};
