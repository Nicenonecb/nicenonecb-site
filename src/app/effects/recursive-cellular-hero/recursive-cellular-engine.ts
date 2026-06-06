type RecursiveCellularVariant = "detail" | "preview";

type TargetCell = {
  dist: number;
  gx: number;
  gy: number;
  idx: number;
};

type Agent = {
  bornAt: number;
  dieAt: number;
  idx: number;
  prev: number;
  since: number;
};

type GrowthState = {
  agents: Agent[];
  cells: Map<number, number>;
  doneAt: number;
  lastTick: number;
  ticks: number;
};

type Layout = {
  centerX: number;
  centerY: number;
  height: number;
  renderBase: number;
  width: number;
};

type RecursiveTexture = {
  flip: HTMLCanvasElement[];
  full: HTMLCanvasElement[];
  solid: HTMLCanvasElement;
};

type Target = {
  cells: TargetCell[];
  connectedCount: number;
  map: Map<number, TargetCell>;
  neighbors: Map<number, number[]>;
};

const gridSize = 19;
const gridCenter = 9;
const centerIndex = gridCenter * gridSize + gridCenter;
const tickMs = 450;
const maxRecursiveLevel = 2;
const recursiveZoomStep = Math.log(19 / 0.78);
const backgroundColor = "#faf9f5";
const gridColor = "#c9c6bc";
const textureColors = ["#D97757", "#E08B6E", "#DD8263", "#E29478", "#D17A60", "#E6A085"];
const solidColors = ["#CE6C4C", "#C9694C", "#D17052", "#CB6B4E"];
const sparkPathData =
  "M18.3658 62.2435L36.7823 51.9165L37.0858 51.012L36.7823 50.5083H35.8716L32.7853 50.3206L22.2616 50.0389L13.154" +
  "6 49.6634L4.30054 49.194L2.07438 48.7246L0 45.9551L0.202378 44.5938L2.07438 43.3264L4.75589 43.5611L10.6755 43" +
  ".9836L19.5801 44.5938L26.0056 44.9693L35.568 45.9551H37.0858L37.2882 45.3448L36.7823 44.9693L36.3775 44.5938L2" +
  "7.1693 38.3507L17.2022 31.7789L11.9909 27.9767L9.20822 26.0522L7.79157 24.2684L7.18443 20.3254L9.71416 17.5089" +
  "L13.1546 17.7436L14.0147 17.9783L17.5057 20.654L24.9431 26.4277L34.6573 33.5627L36.0739 34.7362L36.6444 34.351" +
  "2L36.7317 34.079L36.0739 32.9994L30.8121 23.4704L25.1961 13.7537L22.6664 9.71675L22.0086 7.32277C21.7539 6.318" +
  "12 21.6039 5.48695 21.6039 4.45938L24.4878 0.516349L26.1068 0L30.0026 0.516349L31.6216 1.92457L34.0502 7.46359" +
  "L37.9459 16.1476L44.0173 27.9767L45.7881 31.4973L46.7494 34.7362L47.1036 35.722H47.7107V35.1587L48.2166 28.493" +
  "1L49.1274 20.3254L50.0381 9.81063L50.3416 6.85336L51.8089 3.28586L54.7434 1.36128L57.0201 2.44092L58.8921 5.11" +
  "655L58.6391 6.85336L57.5261 14.0822L55.3505 25.395L53.9338 32.9994H54.7434L55.7047 32.0136L59.5498 26.944L65.9" +
  "753 18.8702L68.8086 15.6782L72.1479 12.1577L74.2729 10.4678H78.3204L81.2549 14.8802L79.9395 19.4335L75.7907 24" +
  ".6909L72.3503 29.1503L67.4173 35.7593L64.3563 41.0732L64.6308 41.5116L65.3682 41.4487L76.499 39.0548L82.5198 3" +
  "7.9751L89.7042 36.7547L92.9423 38.2568L93.2964 39.8058L92.0316 42.9509L84.3412 44.8285L75.3354 46.6592L61.9245" +
  " 49.8162L61.776 49.9356L61.9513 50.1956L67.9991 50.743L70.5795 50.8839H76.9038L88.6923 51.7757L91.7786 53.7942" +
  "L93.6 56.282L93.2964 58.2066L88.5405 60.6006L82.1656 59.0985L67.2402 55.531L62.1302 54.2636H61.4218V54.6861L65" +
  ".6718 58.8638L73.514 65.9049L83.2787 75.0114L83.7846 77.2646L82.5198 79.0483L81.2043 78.8606L72.6032 72.3827L6" +
  "9.264 69.4724L61.776 63.1354H61.2701V63.7926L62.9903 66.3274L72.1479 80.081L72.6032 84.3057L71.9455 85.667L69." +
  "5676 86.5119L66.9872 86.0425L61.5736 78.4851L56.0588 70.0357L51.6065 62.4313L51.0687 62.7708L48.419 91.0652L47" +
  ".2048 92.5204L44.3715 93.6L41.9935 91.8162L40.7286 88.9059L41.9935 83.1322L43.5114 75.6217L44.7256 69.6602L45." +
  "8387 62.2435L46.5185 59.7659L46.4584 59.6001L45.9153 59.6914L40.3239 67.3601L31.824 78.8606L25.0949 86.0425L23" +
  ".4759 86.6997L20.6932 85.2445L20.9462 82.6628L22.5146 80.3627L31.824 68.5336L37.44 61.1639L41.0595 56.9335L41." +
  "0243 56.3216L40.8245 56.3046L16.0891 72.4297L11.6874 72.993L9.76476 71.2092L10.0177 68.2989L10.9284 67.3601L18" +
  ".3658 62.2435Z";

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function seededRandom(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;

    let value = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);

    return ((value ^ (value >>> 14)) >>> 0) / 0x100000000;
  };
}

function getContext(canvas: HTMLCanvasElement, willReadFrequently = false) {
  const context = canvas.getContext("2d", { willReadFrequently });

  if (!context) {
    throw new Error("Recursive cellular hero requires Canvas 2D support.");
  }

  return context;
}

function makeCanvas(size: number) {
  const canvas = document.createElement("canvas");

  canvas.width = size;
  canvas.height = size;

  return canvas;
}

function cellIndex(gx: number, gy: number) {
  return gy * gridSize + gx;
}

function cellXY(idx: number) {
  return {
    gx: idx % gridSize,
    gy: Math.floor(idx / gridSize),
  };
}

function buildTarget(): Target {
  const mask = makeCanvas(152);
  const context = getContext(mask, true);
  const normalizedPath = new Path2D();

  normalizedPath.addPath(new Path2D(sparkPathData), new DOMMatrix().scale(1 / 94, 1 / 94));
  context.save();
  context.scale(152, 152);
  context.fillStyle = "#000";
  context.fill(normalizedPath);
  context.globalCompositeOperation = "destination-out";
  context.lineJoin = "round";
  context.lineWidth = 0.025;
  context.strokeStyle = "#000";
  context.stroke(normalizedPath);
  context.restore();

  const data = context.getImageData(0, 0, 152, 152).data;
  const cells: TargetCell[] = [];

  // 原站把 152px mask 切成 19x19，每格 8x8；命中超过 18% 才纳入目标形状。
  for (let gy = 0; gy < gridSize; gy += 1) {
    for (let gx = 0; gx < gridSize; gx += 1) {
      let hits = 0;

      for (let sy = 0; sy < 8; sy += 1) {
        for (let sx = 0; sx < 8; sx += 1) {
          if (data[((8 * gy + sy) * 152 + (8 * gx + sx)) * 4 + 3] > 8) {
            hits += 1;
          }
        }
      }

      if (hits >= 11.52) {
        const dx = gx - gridCenter;
        const dy = gy - gridCenter;

        cells.push({ dist: Math.hypot(dx, dy), gx, gy, idx: cellIndex(gx, gy) });
      }
    }
  }

  cells.sort((a, b) => a.dist - b.dist || a.idx - b.idx);

  const map = new Map(cells.map((cell) => [cell.idx, cell]));
  const neighbors = new Map<number, number[]>();

  for (const cell of cells) {
    const linked: number[] = [];

    for (const [ox, oy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const x = cell.gx + ox;
      const y = cell.gy + oy;
      const idx = cellIndex(x, y);

      if (x >= 0 && y >= 0 && x < gridSize && y < gridSize && map.has(idx)) {
        linked.push(idx);
      }
    }

    neighbors.set(cell.idx, linked);
  }

  const connected = new Set([centerIndex]);
  const queue = [centerIndex];

  while (queue.length) {
    const idx = queue.shift() ?? centerIndex;

    for (const next of neighbors.get(idx) ?? []) {
      if (!connected.has(next)) {
        connected.add(next);
        queue.push(next);
      }
    }
  }

  return { cells, connectedCount: connected.size, map, neighbors };
}

function createCellTexture(seed: number) {
  const random = seededRandom(9301 * seed + 49297);
  const canvas = makeCanvas(128);
  const context = getContext(canvas);

  context.globalAlpha = 0.88;
  context.fillStyle = textureColors[Math.floor(random() * textureColors.length)];
  context.fillRect(0, 0, 128, 128);

  for (let index = 0; index < 5; index += 1) {
    const x = 128 * random();
    const y = 128 * random();
    const radius = 128 * (0.25 + 0.35 * random());
    const gradient = context.createRadialGradient(x, y, 0, x, y, radius);

    gradient.addColorStop(0, textureColors[Math.floor(random() * textureColors.length)]);
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    context.globalAlpha = 0.14 + 0.14 * random();
    context.fillStyle = gradient;
    context.fillRect(0, 0, 128, 128);
  }

  context.globalAlpha = 0.06;

  for (let index = 0; index < 220; index += 1) {
    const size = 1 + 2 * random();

    context.fillStyle = textureColors[Math.floor(random() * textureColors.length)];
    context.fillRect(128 * random(), 128 * random(), size, size);
  }

  context.globalAlpha = 0.14;
  context.strokeStyle = "#CF6E50";
  context.lineWidth = 6.4;
  context.shadowBlur = 12.8;
  context.shadowColor = "#CF6E50";
  context.beginPath();
  context.roundRect(8.96, 8.96, 110.08, 110.08, 25.6);
  context.stroke();
  context.shadowBlur = 0;
  context.globalAlpha = 1;
  context.globalCompositeOperation = "destination-in";
  context.fillStyle = "#000";

  const phaseA = random() * Math.PI * 2;
  const phaseB = random() * Math.PI * 2;
  const phaseC = random() * Math.PI * 2;

  context.beginPath();

  for (let index = 0; index <= 56; index += 1) {
    const theta = (index / 56) * Math.PI * 2;
    const cos = Math.cos(theta);
    const sin = Math.sin(theta);
    const radius =
      (58.88 / (cos ** 4 + sin ** 4) ** 0.25) *
      (1 + 0.03 * Math.sin(3 * theta + phaseA) + 0.018 * Math.sin(7 * theta + phaseB) + 0.01 * Math.sin(11 * theta + phaseC));
    const x = 64 + cos * radius;
    const y = 64 + sin * radius;

    if (index === 0) {
      context.moveTo(x, y);
    } else {
      context.lineTo(x, y);
    }
  }

  context.closePath();
  context.fill();
  context.globalCompositeOperation = "source-over";

  return canvas;
}

function createMips(source: HTMLCanvasElement) {
  const mips = [source];
  let current = source;

  while (current.width > 38) {
    const nextSize = Math.max(19, current.width >> 1);
    const next = makeCanvas(nextSize);
    const context = getContext(next);

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(current, 0, 0, nextSize, nextSize);
    mips.push(next);
    current = next;
  }

  return mips;
}

function selectMip(mips: HTMLCanvasElement[], targetSize: number) {
  for (let index = mips.length - 1; index >= 0; index -= 1) {
    if (mips[index].width >= targetSize) {
      return mips[index];
    }
  }

  return mips[0];
}

function createRecursiveOrder(seed: number) {
  const random = seededRandom((0x9e3779b1 * seed) >>> 0);
  const toIndex = (gx: number, gy: number) => cellIndex(gx, gy);
  const used = new Set<number>();
  const order: Array<{ gx: number; gy: number }> = [];
  const add = (gx: number, gy: number) => {
    const idx = toIndex(gx, gy);

    if (used.has(idx)) {
      return false;
    }

    used.add(idx);
    order.push({ gx, gy });

    return true;
  };

  add(gridCenter, gridCenter);

  const armCount = 5 + Math.floor(3 * random());

  for (let arm = 0; arm < armCount; arm += 1) {
    let gx = gridCenter;
    let gy = gridCenter;

    for (let step = 0; step < 38; step += 1) {
      const options = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ].filter(([ox, oy]) => {
        const nextX = gx + ox;
        const nextY = gy + oy;

        return nextX >= 0 && nextY >= 0 && nextX < gridSize && nextY < gridSize && !used.has(toIndex(nextX, nextY));
      });

      if (!options.length) {
        break;
      }

      let chosen = options[0];
      let bestScore = -Infinity;

      for (const option of options) {
        const score = Math.hypot(gx + option[0] - gridCenter, gy + option[1] - gridCenter) + 1.2 * random();

        if (score > bestScore) {
          chosen = option;
          bestScore = score;
        }
      }

      gx += chosen[0];
      gy += chosen[1];
      add(gx, gy);

      if (gx === 0 || gy === 0 || gx === gridSize - 1 || gy === gridSize - 1) {
        break;
      }
    }
  }

  const frontier: Array<{ gx: number; gy: number }> = [];
  const pushFrontier = (gx: number, gy: number) => {
    for (const [ox, oy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const x = gx + ox;
      const y = gy + oy;

      if (x >= 0 && y >= 0 && x < gridSize && y < gridSize && !used.has(toIndex(x, y))) {
        frontier.push({ gx: x, gy: y });
      }
    }
  };

  for (const cell of order) {
    pushFrontier(cell.gx, cell.gy);
  }

  while (order.length < gridSize * gridSize) {
    let next: { gx: number; gy: number } | undefined;

    do {
      const index = Math.floor(random() * frontier.length);

      next = frontier[index];
      frontier[index] = frontier[frontier.length - 1];
      frontier.pop();
    } while (next && used.has(toIndex(next.gx, next.gy)));

    if (!next) {
      break;
    }

    add(next.gx, next.gy);
    pushFrontier(next.gx, next.gy);
  }

  return order;
}

function drawTextureTile(context: CanvasRenderingContext2D, textures: HTMLCanvasElement[], gx: number, gy: number, size: number, seed: number) {
  const tileSeed = ((0x466f45d * gx) ^ (0x127409f * gy) ^ (0x4f9ffb7 * seed)) >>> 0;
  const texture = textures[tileSeed % textures.length];

  context.save();
  context.translate(gx + size / 2, gy + size / 2);
  context.scale(tileSeed & (1 << 4) ? -1 : 1, tileSeed & (1 << 5) ? -1 : 1);
  context.drawImage(texture, -size / 2, -size / 2, size, size);
  context.restore();
}

function createRecursiveGrid(seed: number, canvasSize: number, order: Array<{ gx: number; gy: number }>, count: number, textures: HTMLCanvasElement[]) {
  const canvas = makeCanvas(canvasSize);
  const context = getContext(canvas);
  const pitch = canvasSize / gridSize;
  const cellSize = 0.78 * pitch;
  const offset = (pitch - cellSize) / 2;
  const limit = Math.min(count, order.length);

  for (let index = 0; index < limit; index += 1) {
    const cell = order[index];

    drawTextureTile(context, textures, cell.gx * pitch + offset, cell.gy * pitch + offset, cellSize, seed);
  }

  context.globalCompositeOperation = "destination-in";
  context.fillStyle = "#000";
  context.beginPath();
  context.roundRect(0, 0, canvasSize, canvasSize, 0.18 * canvasSize);
  context.fill();

  return canvas;
}

function createSolidTexture(seed: number) {
  const random = seededRandom((0x165667b1 * seed) >>> 0);
  const canvas = makeCanvas(152);
  const context = getContext(canvas);

  context.beginPath();
  context.roundRect(0, 0, 152, 152, 27.36);
  context.fillStyle = solidColors[seed % solidColors.length];
  context.fill();
  context.save();
  context.clip();

  for (let index = 0; index < 4; index += 1) {
    const x = 152 * random();
    const y = 152 * random();
    const radius = 152 * (0.35 + 0.35 * random());
    const gradient = context.createRadialGradient(x, y, 0, x, y, radius);

    gradient.addColorStop(0, solidColors[Math.floor(random() * solidColors.length)]);
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    context.globalAlpha = 0.22;
    context.fillStyle = gradient;
    context.fillRect(0, 0, 152, 152);
  }

  context.restore();

  return canvas;
}

function createRecursiveTextures() {
  const baseTextures = Array.from({ length: 12 }, (_unused, index) => createCellTexture(index + 1));

  return Array.from({ length: 8 }, (_unused, index) => {
    const seed = index + 1;
    const order = createRecursiveOrder(seed);

    return {
      flip: Array.from({ length: 8 }, (_frame, frameIndex) =>
        createRecursiveGrid(seed, 152, order, Math.ceil(((frameIndex + 1) / 8) * gridSize * gridSize), baseTextures),
      ),
      full: createMips(createRecursiveGrid(seed, 608, order, gridSize * gridSize, baseTextures)),
      solid: createSolidTexture(seed),
    };
  });
}

function createAgentSprites(target: Target, textures: RecursiveTexture[]) {
  const canvas = makeCanvas(608);
  const context = getContext(canvas);
  const pitch = 32;
  const cellSize = 24.96;

  for (const cell of target.cells) {
    const x = cell.gx * pitch + (pitch - cellSize) / 2;
    const y = cell.gy * pitch + (pitch - cellSize) / 2;

    context.drawImage(textures[cell.idx % textures.length].solid, x, y, cellSize, cellSize);
  }

  return createMips(canvas);
}

function createState(now: number): GrowthState {
  return {
    agents: [],
    cells: new Map(),
    doneAt: 0,
    lastTick: now,
    ticks: 0,
  };
}

function seedCenterAgent(state: GrowthState, now: number, mature: boolean) {
  state.agents.push({
    bornAt: mature ? -Infinity : now,
    dieAt: 0,
    idx: centerIndex,
    prev: centerIndex,
    since: now,
  });
}

function completeState(now: number, target: Target) {
  const state = createState(now);
  const bornAt = now - 2300;

  for (const cell of target.cells) {
    state.cells.set(cell.idx, bornAt);
  }

  state.doneAt = now;

  return state;
}

function getFrontier(state: GrowthState, target: Target) {
  const frontier: number[] = [];
  const queued = new Set<number>();

  for (const idx of state.cells.keys()) {
    for (const next of target.neighbors.get(idx) ?? []) {
      if (!state.cells.has(next) && !queued.has(next)) {
        queued.add(next);
        frontier.push(next);
      }
    }
  }

  return frontier;
}

function updateGrowth(state: GrowthState, now: number, target: Target, random: () => number, recursiveLevel: number) {
  if (state.doneAt) {
    return;
  }

  while (now - state.lastTick >= tickMs) {
    state.lastTick += tickMs;
    state.ticks += 1;

    const tickTime = state.lastTick;
    const occupied = new Set(state.agents.filter((agent) => !agent.dieAt).map((agent) => agent.idx));
    const nextAgents: Agent[] = [];

    for (const agent of state.agents) {
      if (agent.dieAt) {
        if (tickTime - agent.dieAt < 350) {
          nextAgents.push(agent);
        }

        continue;
      }

      const options = (target.neighbors.get(agent.idx) ?? []).filter((idx) => !state.cells.has(idx) && !occupied.has(idx));

      state.cells.set(agent.idx, tickTime);

      if (!options.length) {
        agent.dieAt = tickTime;
        nextAgents.push(agent);
        continue;
      }

      const next = options[Math.floor(random() * options.length)];

      agent.prev = agent.idx;
      agent.idx = next;
      agent.since = tickTime;
      occupied.add(next);
      nextAgents.push(agent);
    }

    state.agents = nextAgents;

    const liveCount = state.agents.filter((agent) => !agent.dieAt).length;
    const frontier = getFrontier(state, target).filter((idx) => !occupied.has(idx));

    if (!frontier.length && !liveCount) {
      state.doneAt = tickTime;
      break;
    }

    const spreadRate = 7 / (1 + 0.25 * recursiveLevel);
    const targetAgents = Math.min(48, Math.max(1, Math.floor((state.ticks / spreadRate) ** 2)));
    let activeCount = liveCount;

    while (activeCount < targetAgents && frontier.length) {
      const index = Math.floor(random() * frontier.length);
      const idx = frontier[index];

      frontier[index] = frontier[frontier.length - 1];
      frontier.pop();
      occupied.add(idx);
      state.agents.push({ bornAt: tickTime, dieAt: 0, idx, prev: idx, since: tickTime });
      activeCount += 1;
    }
  }
}

function getLayout(root: HTMLElement, variant: RecursiveCellularVariant): Layout {
  const width = Math.max(1, root.clientWidth);
  const height = Math.max(1, root.clientHeight);
  const desktop = width >= 992;

  if (variant === "preview") {
    return {
      centerX: width * 0.5,
      centerY: height * 0.5,
      height,
      renderBase: 0.5 * Math.min(0.92 * width, 0.62 * height),
      width,
    };
  }

  // 详情页去掉文章标题后仍保留原站 canvas 的有效高度比例，让递归尺寸和原首屏一致。
  const virtualHeroHeight = desktop ? Math.min(height, width * 0.5) : height;

  return {
    centerX: width * 0.5,
    centerY: desktop ? height * 0.5 : height * 0.62,
    height,
    renderBase: desktop ? 0.58 * Math.min(0.6 * width, virtualHeroHeight) : 0.5 * Math.min(0.92 * width, 0.62 * height),
    width,
  };
}

function drawDotGrid(
  context: CanvasRenderingContext2D,
  layout: Layout,
  spacing: number,
  alpha: number,
) {
  if (spacing < 2 || ((layout.width / spacing) + 2) * ((layout.height / spacing) + 2) > 12000) {
    return;
  }

  const fade = clamp((spacing - 2) / 7);
  const opacity = (0.45 + 0.45 * Math.min(1, spacing / 90)) * alpha * fade;

  if (opacity < 0.01) {
    return;
  }

  const offsetX = ((layout.centerX + spacing / 2) % spacing + spacing) % spacing;
  const offsetY = ((layout.centerY + spacing / 2) % spacing + spacing) % spacing;

  context.fillStyle = gridColor;
  context.globalAlpha = opacity;

  for (let y = offsetY; y <= layout.height; y += spacing) {
    for (let x = offsetX; x <= layout.width; x += spacing) {
      context.fillRect(x - 1, y - 1, 2, 2);
    }
  }

  context.globalAlpha = 1;
}

function cellPoint(idx: number, layout: Layout, renderSize: number) {
  const cell = cellXY(idx);
  const unit = renderSize / gridSize;

  return {
    x: layout.centerX + 2 * unit * (cell.gx - gridCenter),
    y: layout.centerY + 2 * unit * (cell.gy - gridCenter),
  };
}

function drawCells(
  context: CanvasRenderingContext2D,
  state: GrowthState,
  layout: Layout,
  textures: RecursiveTexture[],
  now: number,
  renderSize: number,
  dpr: number,
) {
  const unit = renderSize / gridSize;
  const cellSize = 2 * unit * 0.78;

  if (cellSize < 0.4) {
    return;
  }

  for (const [idx, bornAt] of state.cells) {
    const point = cellPoint(idx, layout, renderSize);
    const age = now - bornAt;
    const texture = textures[idx % textures.length];

    if (age < 700) {
      const frame = Math.min(7, Math.floor((age / 700) * 8));

      context.drawImage(texture.flip[frame], point.x - cellSize / 2, point.y - cellSize / 2, cellSize, cellSize);
      continue;
    }

    const fullAlpha = Math.min(1, (age - 700) / 1600);

    if (fullAlpha < 1) {
      context.drawImage(selectMip(texture.full, cellSize * dpr), point.x - cellSize / 2, point.y - cellSize / 2, cellSize, cellSize);
    }

    if (fullAlpha > 0) {
      context.globalAlpha = fullAlpha;
      context.drawImage(texture.solid, point.x - cellSize / 2, point.y - cellSize / 2, cellSize, cellSize);
      context.globalAlpha = 1;
    }
  }
}

function drawAgents(
  context: CanvasRenderingContext2D,
  state: GrowthState,
  layout: Layout,
  agentSprites: HTMLCanvasElement[],
  now: number,
  renderSize: number,
  dpr: number,
) {
  const unit = renderSize / gridSize;

  if (unit < 0.4) {
    return;
  }

  for (const agent of state.agents) {
    const from = cellPoint(agent.prev, layout, renderSize);
    const to = cellPoint(agent.idx, layout, renderSize);
    const progress = Math.min(1, (now - agent.since) / tickMs);
    const eased = 1 - (1 - progress) * (1 - progress);
    const birth = 1 - (1 - Math.min(1, (now - agent.bornAt) / 350)) ** 3;
    const death = agent.dieAt ? (1 - Math.min(1, (now - agent.dieAt) / 350)) ** 2 : 1;
    const alpha = agent.dieAt ? death : birth;
    const agentUnit = unit * alpha;
    const spriteSize = 2 * agentUnit * 0.78;

    if (spriteSize < 0.4) {
      continue;
    }

    context.drawImage(
      selectMip(agentSprites, spriteSize * dpr),
      from.x + (to.x - from.x) * eased - spriteSize / 2,
      from.y + (to.y - from.y) * eased - spriteSize / 2,
      spriteSize,
      spriteSize,
    );
  }
}

function drawFrame(
  context: CanvasRenderingContext2D,
  state: GrowthState,
  layout: Layout,
  textures: RecursiveTexture[],
  agentSprites: HTMLCanvasElement[],
  now: number,
  renderSize: number,
  dpr: number,
) {
  const spacing = (renderSize / gridSize) * 2;

  context.fillStyle = backgroundColor;
  context.fillRect(0, 0, layout.width, layout.height);

  drawDotGrid(context, layout, spacing, 1);
  drawDotGrid(context, layout, (0.78 * spacing) / gridSize, 1);
  drawCells(context, state, layout, textures, now, renderSize, dpr);
  drawAgents(context, state, layout, agentSprites, now, renderSize, dpr);
}

function integrateZoom(targetZoom: number, zoom: number, velocity: number, deltaMs: number) {
  const steps = Math.max(1, Math.ceil(deltaMs / 12));
  const stepMs = deltaMs / steps;
  let nextZoom = zoom;
  let nextVelocity = velocity;

  for (let index = 0; index < steps; index += 1) {
    const acceleration = 0.00000081 * (targetZoom - nextZoom) - 0.00153 * nextVelocity;

    nextVelocity += acceleration * stepMs;
    nextZoom += nextVelocity * stepMs;
  }

  return { velocity: nextVelocity, zoom: nextZoom };
}

export function startRecursiveCellularHero(
  root: HTMLElement,
  canvas: HTMLCanvasElement,
  variant: RecursiveCellularVariant,
) {
  const context = getContext(canvas);
  const target = buildTarget();
  const textures = createRecursiveTextures();
  const agentSprites = createAgentSprites(target, textures);
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  let layout = getLayout(root, variant);
  let dpr = 1;
  let state = createState(performance.now());
  let random = seededRandom(0xc1a0de);
  let animationFrame = 0;
  let active = false;
  let destroyed = false;
  let lastFrameTime = 0;
  let recursiveLevel = 0;
  let zoom = -0.04 * recursiveZoomStep;
  let zoomVelocity = 0;

  const resize = () => {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    layout = getLayout(root, variant);
    canvas.width = Math.round(layout.width * dpr);
    canvas.height = Math.round(layout.height * dpr);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";

    drawFrame(context, state, layout, textures, agentSprites, performance.now(), layout.renderBase * Math.exp(recursiveLevel * recursiveZoomStep - zoom), dpr);
  };

  const drawReducedMotion = () => {
    const now = performance.now();

    state = completeState(now, target);
    recursiveLevel = 0;
    zoom = 0;
    zoomVelocity = 0;
    drawFrame(context, state, layout, textures, agentSprites, now, layout.renderBase, dpr);
  };

  const restart = (now: number) => {
    random = seededRandom(0xc1a0de);
    state = createState(now);
    seedCenterAgent(state, now, false);
    recursiveLevel = 0;
    zoom = -0.04 * recursiveZoomStep;
    zoomVelocity = 0;
    lastFrameTime = now;
  };

  const render = (now: number) => {
    if (destroyed || !active) {
      return;
    }

    const delta = Math.min(50, now - lastFrameTime);

    lastFrameTime = now;
    updateGrowth(state, now, target, random, recursiveLevel);

    const isFinalLayer = recursiveLevel >= maxRecursiveLevel;

    if (state.doneAt && now - state.doneAt >= 500 && !isFinalLayer) {
      state = createState(now);
      seedCenterAgent(state, now, true);
      recursiveLevel += 1;
    }

    const fillRatio = state.cells.size / target.connectedCount;
    const layerProgress = state.doneAt && !isFinalLayer ? 1 : -0.04 + 0.34 * fillRatio;
    const zoomTarget = (recursiveLevel + layerProgress) * recursiveZoomStep;
    const integrated = integrateZoom(zoomTarget, zoom, zoomVelocity, delta);

    zoom = integrated.zoom;
    zoomVelocity = integrated.velocity;

    const renderSize = layout.renderBase * Math.exp(recursiveLevel * recursiveZoomStep - zoom);

    drawFrame(context, state, layout, textures, agentSprites, now, renderSize, dpr);

    if (isFinalLayer && state.doneAt && now - state.doneAt >= 2300 && Math.abs(zoomVelocity) < 0.00001) {
      active = false;
      return;
    }

    animationFrame = window.requestAnimationFrame(render);
  };

  const start = () => {
    if (active || prefersReducedMotion.matches) {
      return;
    }

    active = true;
    restart(performance.now());
    animationFrame = window.requestAnimationFrame(render);
  };

  const stop = () => {
    active = false;
    window.cancelAnimationFrame(animationFrame);
  };

  resize();

  if (prefersReducedMotion.matches) {
    drawReducedMotion();
  }

  const resizeObserver = new ResizeObserver(() => {
    resize();

    if (prefersReducedMotion.matches) {
      drawReducedMotion();
    }
  });
  const intersectionObserver = new IntersectionObserver(
    ([entry]) => {
      if (entry?.isIntersecting) {
        start();
      } else {
        stop();
      }
    },
    { threshold: 0.1 },
  );

  resizeObserver.observe(root);
  intersectionObserver.observe(root);

  return () => {
    destroyed = true;
    stop();
    resizeObserver.disconnect();
    intersectionObserver.disconnect();
  };
}
