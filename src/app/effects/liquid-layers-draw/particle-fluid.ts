export type FluidPointer = {
  velX: number;
  velY: number;
  x: number;
  y: number;
};

type PvfsModule = {
  HEAPF32: Float32Array;
  HEAPU8: Uint8Array;
  _pvfs_add_material: (
    sim: number,
    mass: number,
    restDensity: number,
    radius: number,
    viscosity: number,
  ) => void;
  _pvfs_add_particles: (
    sim: number,
    count: number,
    materialId: number,
    minX: number,
    minY: number,
    maxX: number,
    maxY: number,
  ) => void;
  _pvfs_delete_sim: (sim: number) => void;
  _pvfs_drag_particles: (
    sim: number,
    x: number,
    y: number,
    radius: number,
    velX: number,
    velY: number,
  ) => void;
  _pvfs_get_kernel_radius: (sim: number) => number;
  _pvfs_get_particle_count: (sim: number) => number;
  _pvfs_get_particle_material_ids: (sim: number) => number;
  _pvfs_get_particle_positions: (sim: number) => number;
  _pvfs_new_sim: (
    maxParticles: number,
    materialCount: number,
    maxConstraintCount: number,
    gridResolution: number,
  ) => number;
  _pvfs_set_parameters: (
    sim: number,
    sameRestDensity: number,
    diffRestDensity: number,
    stiffness: number,
    stiffnessNear: number,
    pMass0: number,
    pMass1: number,
    pMass2: number,
    pMass3: number,
  ) => void;
  _pvfs_set_sim_gravity: (sim: number, gravX: number, gravY: number) => void;
  _pvfs_set_sim_size: (
    sim: number,
    width: number,
    height: number,
    shiftX: number,
    shiftY: number,
    reset: boolean,
  ) => void;
  _pvfs_update_sim_after_collisions: (sim: number, dt: number) => void;
  _pvfs_update_sim_before_collisions: (sim: number, dt: number) => void;
  calledRun?: boolean;
  locateFile?: (path: string) => string;
  onRuntimeInitialized?: () => void;
  printErr?: (...messages: unknown[]) => void;
};

declare global {
  interface Window {
    Module?: Partial<PvfsModule> & Record<string, unknown>;
    __pvfsModulePromise?: Promise<PvfsModule>;
  }
}

const batchSize = 65536;
const brushSize = 100;
const materialColors = new Float32Array([
  0.9, 0.16, 0.22,
  1, 0.63, 0,
  0, 0.89, 0.19,
  0, 0.47, 0.95,
]);
const materialMasses = [1, 0.6, 0.36, 0.216] as const;
const particleCountPerMaterial = 5000;
const stepsPerFrame = 3;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function buildShader(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);

  if (!shader) throw new Error("Unable to create WebGL shader");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader) ?? "Unknown shader compile error";
    gl.deleteShader(shader);
    throw new Error(message);
  }

  return shader;
}

function hasPvfsRuntime(value: Partial<PvfsModule> | undefined): value is PvfsModule {
  return Boolean(value?._pvfs_new_sim && value?._pvfs_get_particle_positions && value?.calledRun);
}

function loadPvfsModule() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("PVFS can only run in the browser"));
  }

  if (hasPvfsRuntime(window.Module)) {
    return Promise.resolve(window.Module);
  }

  if (window.__pvfsModulePromise) {
    return window.__pvfsModulePromise;
  }

  // Emscripten 产物通过全局 Module 注入配置；保持单例可避免 React 严格模式重复加载 WASM。
  window.__pvfsModulePromise = new Promise<PvfsModule>((resolve, reject) => {
    window.Module = {
      ...window.Module,
      locateFile: (path: string) => `/effects/liquid-layers-draw/${path}`,
      onRuntimeInitialized: () => {
        if (!hasPvfsRuntime(window.Module)) {
          reject(new Error("PVFS runtime initialized without expected exports"));
          return;
        }

        resolve(window.Module);
      },
      printErr: (...messages: unknown[]) => console.error(...messages),
    };

    const existingScript = document.querySelector<HTMLScriptElement>("script[data-pvfs-module]");

    if (existingScript) {
      return;
    }

    const script = document.createElement("script");
    script.async = true;
    script.dataset.pvfsModule = "true";
    script.src = "/effects/liquid-layers-draw/pvfs2d_v2_7.js";
    script.onerror = () => reject(new Error("Unable to load PVFS WASM wrapper"));
    document.head.appendChild(script);
  });

  return window.__pvfsModulePromise;
}

export class ParticleFluid {
  private aMaterial = 0;
  private aPosition = 0;
  private disposed = false;
  private dpr = 1;
  private height = 1;
  private materialBuffer: WebGLBuffer;
  private module: PvfsModule | null = null;
  private positionBuffer: WebGLBuffer;
  private program: WebGLProgram;
  private seeded = false;
  private sim = 0;
  private uColors: WebGLUniformLocation | null = null;
  private uPointSize: WebGLUniformLocation | null = null;
  private uResolution: WebGLUniformLocation | null = null;
  private width = 1;

  private readonly gl: WebGLRenderingContext;

  constructor(private readonly canvas: HTMLCanvasElement) {
    const gl = canvas.getContext("webgl", { alpha: false, antialias: false, depth: false });

    if (!gl) throw new Error("WebGL is not available");

    this.gl = gl;
    this.program = this.createProgram();
    this.positionBuffer = this.createBuffer(batchSize * 2 * Float32Array.BYTES_PER_ELEMENT);
    this.materialBuffer = this.createBuffer(batchSize);
    this.cacheLocations();
  }

  async initialize() {
    if (this.module || this.disposed) {
      return;
    }

    this.module = await loadPvfsModule();

    if (this.disposed) {
      return;
    }

    this.sim = this.module._pvfs_new_sim(40000, 4, 40000, 4096);
  }

  dispose() {
    this.disposed = true;

    if (this.module && this.sim) {
      this.module._pvfs_delete_sim(this.sim);
      this.sim = 0;
    }
  }

  resize(width: number, height: number, dpr: number) {
    this.width = Math.max(1, width);
    this.height = Math.max(1, height);
    this.dpr = Math.min(Math.max(1, dpr), 2);
    this.canvas.width = Math.floor(this.width * this.dpr);
    this.canvas.height = Math.floor(this.height * this.dpr);
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);

    if (!this.module || !this.sim) {
      return;
    }

    if (!this.seeded) {
      this.seedInitialFluid();
      this.seeded = true;
      return;
    }

    this.module._pvfs_set_sim_size(this.sim, this.width, this.height, 0, 0, false);
  }

  step(pointers: FluidPointer[]) {
    if (!this.module || !this.sim) {
      return;
    }

    const pvfs = this.module;

    pvfs._pvfs_set_sim_gravity(this.sim, 0, 1);
    this.applyDefaultParameters();

    for (let substep = 0; substep < stepsPerFrame; substep += 1) {
      for (const pointer of pointers) {
        pvfs._pvfs_drag_particles(
          this.sim,
          pointer.x,
          pointer.y,
          brushSize,
          pointer.velX / stepsPerFrame,
          pointer.velY / stepsPerFrame,
        );
      }

      pvfs._pvfs_update_sim_before_collisions(this.sim, 1);
      pvfs._pvfs_update_sim_after_collisions(this.sim, 1);
    }
  }

  render() {
    const gl = this.gl;

    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    if (!this.module || !this.sim) {
      return;
    }

    const pvfs = this.module;
    const particleCount = pvfs._pvfs_get_particle_count(this.sim);
    const positionPointer = pvfs._pvfs_get_particle_positions(this.sim);
    const materialPointer = pvfs._pvfs_get_particle_material_ids(this.sim);
    const pointSize = Math.max(2, pvfs._pvfs_get_kernel_radius(this.sim) * this.dpr * 0.4);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.useProgram(this.program);
    gl.uniform2f(this.uResolution, this.width, this.height);
    gl.uniform1f(this.uPointSize, pointSize);
    gl.uniform3fv(this.uColors, materialColors);

    for (let start = 0; start < particleCount; start += batchSize) {
      const count = Math.min(batchSize, particleCount - start);
      const positions = new Float32Array(pvfs.HEAPF32.buffer, positionPointer + start * 8, count * 2);
      const materials = new Uint8Array(pvfs.HEAPU8.buffer, materialPointer + start, count);

      gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, positions);
      gl.enableVertexAttribArray(this.aPosition);
      gl.vertexAttribPointer(this.aPosition, 2, gl.FLOAT, false, 0, 0);

      gl.bindBuffer(gl.ARRAY_BUFFER, this.materialBuffer);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, materials);
      gl.enableVertexAttribArray(this.aMaterial);
      gl.vertexAttribPointer(this.aMaterial, 1, gl.UNSIGNED_BYTE, false, 0, 0);

      gl.drawArrays(gl.POINTS, 0, count);
    }
  }

  private addMaterials() {
    if (!this.module) {
      return;
    }

    for (const mass of materialMasses) {
      this.module._pvfs_add_material(this.sim, mass, 2, 0.25, 0.25);
    }
  }

  private applyDefaultParameters() {
    if (!this.module) {
      return;
    }

    this.module._pvfs_set_parameters(this.sim, 8, 0, 0.2, 2, 1, 0.6, 0.36, 0.216);
  }

  private seedInitialFluid() {
    if (!this.module) {
      return;
    }

    const pvfs = this.module;
    const liquidTop = this.height * 0.69;
    const liquidHeight = this.height * 0.3;
    const bandHeight = liquidHeight / 4;

    pvfs._pvfs_set_sim_size(this.sim, this.width, this.height, 0, 0, true);
    pvfs._pvfs_set_sim_gravity(this.sim, 0, 1);
    this.addMaterials();
    this.applyDefaultParameters();

    for (let materialId = 0; materialId < 4; materialId += 1) {
      const bandTop = clamp(liquidTop + bandHeight * materialId - 4, 0, this.height);
      const bandBottom = clamp(liquidTop + bandHeight * (materialId + 1) + 8, 0, this.height);

      // 初始只在底部铺 4 层高密度材料，避免首帧出现全屏随机散点。
      pvfs._pvfs_add_particles(
        this.sim,
        particleCountPerMaterial,
        materialId,
        0,
        bandTop,
        this.width,
        bandBottom,
      );
    }
  }

  private createBuffer(size: number) {
    const buffer = this.gl.createBuffer();

    if (!buffer) throw new Error("Unable to create WebGL buffer");
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, size, this.gl.STREAM_DRAW);

    return buffer;
  }

  private createProgram() {
    const vertex = buildShader(
      this.gl,
      this.gl.VERTEX_SHADER,
      `
        attribute vec2 a_position;
        attribute float a_material;
        uniform vec2 u_resolution;
        uniform float u_pointSize;
        uniform vec3 u_colors[4];
        varying vec3 v_color;

        void main() {
          vec2 clip = (a_position / u_resolution) * 2.0 - 1.0;
          gl_Position = vec4(clip * vec2(1.0, -1.0), 0.0, 1.0);
          gl_PointSize = u_pointSize;
          v_color = u_colors[int(a_material)];
        }
      `,
    );
    const fragment = buildShader(
      this.gl,
      this.gl.FRAGMENT_SHADER,
      `
        precision mediump float;
        varying vec3 v_color;

        void main() {
          vec2 coord = gl_PointCoord - vec2(0.5);
          float distanceFromCenter = length(coord);
          if (distanceFromCenter > 0.5) discard;
          gl_FragColor = vec4(v_color, 1.0);
        }
      `,
    );
    const program = this.gl.createProgram();

    if (!program) throw new Error("Unable to create WebGL program");
    this.gl.attachShader(program, vertex);
    this.gl.attachShader(program, fragment);
    this.gl.linkProgram(program);

    if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
      throw new Error(this.gl.getProgramInfoLog(program) ?? "Unable to link WebGL program");
    }

    return program;
  }

  private cacheLocations() {
    this.aPosition = this.gl.getAttribLocation(this.program, "a_position");
    this.aMaterial = this.gl.getAttribLocation(this.program, "a_material");
    this.uResolution = this.gl.getUniformLocation(this.program, "u_resolution");
    this.uPointSize = this.gl.getUniformLocation(this.program, "u_pointSize");
    this.uColors = this.gl.getUniformLocation(this.program, "u_colors");
  }
}
