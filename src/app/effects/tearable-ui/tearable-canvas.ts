export const BASE_TEXTURE_SIZE = 1600;

export type TearableLayerKind = "intro" | "inputs" | "products" | "video" | "indestructible";

export type HitRegion = {
  height: number;
  hoverOnly?: boolean;
  id:
    | "dont-click"
    | "input-name"
    | "input-email"
    | "product-1"
    | "product-2"
    | "product-3"
    | "save-btn"
    | "slider-shininess"
    | "toggle-autosave"
    | "toggle-oily";
  type: "button" | "input" | "product" | "slider" | "toggle";
  width: number;
  x: number;
  y: number;
};

export type CanvasUiState = {
  activeField: "input-email" | "input-name" | null;
  autosave: boolean;
  buttonClicked: boolean;
  hoveredId: HitRegion["id"] | null;
  inputEmail: string;
  inputName: string;
  oily: boolean;
  savedCount: number;
  shininess: number;
};

type CanvasLike = HTMLCanvasElement | OffscreenCanvas;

type DrawContext = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

type TearableAssetName =
  | "bg1"
  | "bg2"
  | "bg3"
  | "bg4"
  | "bg5"
  | "logo"
  | "shirt1"
  | "shirt1Hover"
  | "shirt2"
  | "shirt2Hover"
  | "shirt3"
  | "shirt3Hover";

const assetBase = "/effects/tearable-ui/";

const imageSources: Record<TearableAssetName, string> = {
  bg1: `${assetBase}bg1-C7kEZsy7.jpg`,
  bg2: `${assetBase}bg2-hcuos61p.jpg`,
  bg3: `${assetBase}bg3-BWlRWQEf.jpg`,
  bg4: `${assetBase}bg4-nMo8kGgI.jpg`,
  bg5: `${assetBase}bg5-BvaJxAHw.jpg`,
  logo: `${assetBase}shopify_glyph_black-C9pJg8zi.png`,
  shirt1: `${assetBase}shirt1-CiieAn1N.webp`,
  shirt1Hover: `${assetBase}shirt1hover-BsMlQx8G.webp`,
  shirt2: `${assetBase}shirt2-BFEaPxyT.webp`,
  shirt2Hover: `${assetBase}shirt2hover-DWofFLcw.webp`,
  shirt3: `${assetBase}shirt3-N5m4Uu2T.webp`,
  shirt3Hover: `${assetBase}shirt3hover-ClLO2m6r.webp`,
};

const images = new Map<TearableAssetName, HTMLImageElement>();
let video: HTMLVideoElement | null = null;
let preloadPromise: Promise<void> | null = null;

const defaultUiState: CanvasUiState = {
  activeField: null,
  autosave: true,
  buttonClicked: false,
  hoveredId: null,
  inputEmail: "sarah.chen@company.com",
  inputName: "Sarah Chen",
  oily: true,
  savedCount: 0,
  shininess: 0.62,
};

export function cloneDefaultUiState(): CanvasUiState {
  return { ...defaultUiState };
}

export function createTextureCanvas(width = BASE_TEXTURE_SIZE, height = BASE_TEXTURE_SIZE) {
  if (typeof OffscreenCanvas !== "undefined") {
    return new OffscreenCanvas(width, height);
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

export function getTextureSize(aspect: number, isMobile: boolean) {
  const base = isMobile ? 768 : BASE_TEXTURE_SIZE;

  if (aspect > 1) {
    return {
      height: base,
      width: Math.round(base * aspect),
    };
  }

  return {
    height: Math.round(base / Math.max(aspect, 0.001)),
    width: base,
  };
}

export function findHitRegion(
  regions: HitRegion[],
  uv: { x: number; y: number },
  width: number,
  height: number,
) {
  const x = uv.x * width;
  const y = (1 - uv.y) * height;

  return regions.find(
    (region) =>
      x >= region.x &&
      x <= region.x + region.width &&
      y >= region.y &&
      y <= region.y + region.height,
  );
}

export function getVideoElement() {
  if (typeof document === "undefined") {
    return null;
  }

  if (!video) {
    video = document.createElement("video");
    video.src = `${assetBase}mechmerchant-CkZgks3O.mp4`;
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    video.autoplay = true;
  }

  return video;
}

export function preloadTearableAssets() {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }

  if (preloadPromise) {
    return preloadPromise;
  }

  const imageLoads = (Object.keys(imageSources) as TearableAssetName[]).map(
    (name) =>
      new Promise<void>((resolve) => {
        const image = getImage(name);

        if (!image || (image.complete && image.naturalWidth > 0)) {
          resolve();
          return;
        }

        image.onload = () => resolve();
        image.onerror = () => resolve();
      }),
  );

  const fontLoad =
    "fonts" in document
      ? document.fonts.load('400 48px "Special Gothic Expanded One"').then(() => undefined)
      : Promise.resolve();

  const media = getVideoElement();
  const videoLoad = new Promise<void>((resolve) => {
    if (!media) {
      resolve();
      return;
    }

    media.addEventListener("loadeddata", () => resolve(), { once: true });
    media.addEventListener("error", () => resolve(), { once: true });
    media.play().catch(() => undefined);
    window.setTimeout(resolve, 1200);
  });

  preloadPromise = Promise.all([...imageLoads, fontLoad, videoLoad]).then(() => undefined);
  return preloadPromise;
}

export function redrawLayer(
  canvas: CanvasLike,
  layer: TearableLayerKind,
  uiState: CanvasUiState = defaultUiState,
) {
  const context = canvas.getContext("2d") as DrawContext | null;

  if (!context) {
    return [];
  }

  const width = canvas.width;
  const height = canvas.height;
  context.clearRect(0, 0, width, height);

  if (layer === "intro") {
    return drawIntro(context, width, height, uiState);
  }

  if (layer === "inputs") {
    return drawInputs(context, width, height, uiState);
  }

  if (layer === "products") {
    return drawProducts(context, width, height, uiState);
  }

  if (layer === "video") {
    return drawVideo(context, width, height);
  }

  drawIndestructible(context, width, height);
  return [];
}

function drawIntro(context: DrawContext, width: number, height: number, uiState: CanvasUiState) {
  const scale = getResponsiveScale(width, height);
  const lift = height / 2 - 40 * scale;

  context.fillStyle = "#f6f2ea";
  context.fillRect(0, 0, width, height);
  drawCenteredImage(context, getImage("bg1"), width, height, scale * (width < height ? 1 : 0.75));
  drawLogo(context, width, scale);

  context.textAlign = "center";
  context.textBaseline = "middle";
  context.lineJoin = "round";
  context.font = gothicFont(Math.min(110 * scale, width * 0.11));
  context.letterSpacing = `${3 * scale}px`;

  // 标题先画阴影描边，再用页面底色抠一层，目标页会形成清晰的双描边质感。
  drawOutlinedText(context, "THIS IS", width / 2, lift - Math.min(110 * scale, width * 0.11) * 0.55);
  drawOutlinedText(
    context,
    "TEARABLE UI",
    width / 2,
    lift + Math.min(110 * scale, width * 0.11) * 0.55,
  );
  context.letterSpacing = "0px";

  const subtitleY = lift + Math.min(110 * scale, width * 0.11) * 1.5;
  context.font = gothicFont(Math.min(26 * scale, width * 0.025));
  context.fillStyle = "#555555";
  context.letterSpacing = `${1 * scale}px`;
  context.fillText("Go ahead. Grab it. Rip it. Shred it. You do you.", width / 2, subtitleY);
  context.letterSpacing = "0px";

  const buttonWidth = Math.min(340 * scale, width * 0.7);
  const buttonHeight = 56 * scale;
  const buttonX = (width - buttonWidth) / 2;
  const buttonY = subtitleY + 80 * scale;
  const isHovering = uiState.hoveredId === "dont-click";

  context.fillStyle = isHovering ? "#1a1a1a" : "#2d2d2d";
  roundedRect(context, buttonX, buttonY, buttonWidth, buttonHeight, buttonHeight / 2);
  context.fill();
  context.fillStyle = "#ffffff";
  context.font = `600 ${18 * scale}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  context.fillText(
    uiState.buttonClicked ? "Now rip it" : "Or click this button",
    width / 2,
    buttonY + buttonHeight / 2,
  );

  return [
    {
      height: buttonHeight,
      id: "dont-click",
      type: "button",
      width: buttonWidth,
      x: buttonX,
      y: buttonY,
    },
  ] satisfies HitRegion[];
}

function drawInputs(context: DrawContext, width: number, height: number, uiState: CanvasUiState) {
  const scale = getResponsiveScale(width, height);
  const regions: HitRegion[] = [];

  context.fillStyle = "#91abdb";
  context.fillRect(0, 0, width, height);
  drawCenteredImage(context, getImage("bg2"), width, height, scale * (width < height ? 0.5 : 0.375));
  drawLayerTitle(context, "It works with inputs", width, 180 * scale, scale);

  const formScale = scale * (width < height ? 1.6 : 1);
  const panelWidth = Math.min(500 * formScale, width * 0.85);
  const panelHeight = Math.min(530 * formScale, height * 0.55);
  const panelX = (width - panelWidth) / 2;
  const panelY = (height - panelHeight) / 2 + 40 * scale;
  const gutter = 32 * formScale;

  drawSoftPanel(context, panelX, panelY, panelWidth, panelHeight, 16 * formScale);
  context.fillStyle = "#1a1a1a";
  context.font = `600 ${24 * formScale}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  context.textAlign = "left";
  context.textBaseline = "top";
  context.fillText("Settings", panelX + gutter, panelY + gutter);

  const fieldTop = panelY + gutter + 50 * formScale;
  const fieldWidth = panelWidth - gutter * 2;
  const fieldHeight = 44 * formScale;
  const gap = 78 * formScale;

  regions.push(
    drawInputField(context, {
      focused: uiState.activeField === "input-name",
      hovered: uiState.hoveredId === "input-name",
      id: "input-name",
      label: "Name",
      value: uiState.inputName,
      x: panelX + gutter,
      y: fieldTop,
      width: fieldWidth,
      height: fieldHeight,
      scale: formScale,
    }),
  );

  regions.push(
    drawInputField(context, {
      focused: uiState.activeField === "input-email",
      hovered: uiState.hoveredId === "input-email",
      id: "input-email",
      label: "Email",
      value: uiState.inputEmail,
      x: panelX + gutter,
      y: fieldTop + gap,
      width: fieldWidth,
      height: fieldHeight,
      scale: formScale,
    }),
  );

  const sliderY = fieldTop + gap * 2 + 8 * formScale;
  regions.push(drawSlider(context, panelX + gutter, sliderY, fieldWidth, formScale, uiState));

  const toggleY = sliderY + 76 * formScale;
  regions.push(
    drawToggle(context, "Oily material", "toggle-oily", uiState.oily, panelX + gutter, toggleY, formScale, uiState),
  );
  regions.push(
    drawToggle(
      context,
      "Autosave",
      "toggle-autosave",
      uiState.autosave,
      panelX + gutter,
      toggleY + 52 * formScale,
      formScale,
      uiState,
    ),
  );

  const saveWidth = 130 * formScale;
  const saveHeight = 42 * formScale;
  const saveX = panelX + panelWidth - gutter - saveWidth;
  const saveY = panelY + panelHeight - gutter - saveHeight;
  const saveHover = uiState.hoveredId === "save-btn";
  context.fillStyle = saveHover ? "#111111" : "#2d2d2d";
  roundedRect(context, saveX, saveY, saveWidth, saveHeight, 999);
  context.fill();
  context.fillStyle = "#ffffff";
  context.font = `600 ${14 * formScale}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(uiState.savedCount ? `Saved ${uiState.savedCount}` : "Save changes", saveX + saveWidth / 2, saveY + saveHeight / 2);
  regions.push({ height: saveHeight, id: "save-btn", type: "button", width: saveWidth, x: saveX, y: saveY });

  return regions;
}

function drawProducts(context: DrawContext, width: number, height: number, uiState: CanvasUiState) {
  const scale = getResponsiveScale(width, height);
  const cardScale = scale * (width < height ? 1.6 : 1);
  const regions: HitRegion[] = [];

  context.fillStyle = "#9acb89";
  context.fillRect(0, 0, width, height);
  drawCenteredImage(context, getImage("bg3"), width, height, scale * (width < height ? 0.5 : 0.375));
  drawLayerTitle(context, "It works with images", width, Math.min(140 * scale, height * 0.24), scale);

  const panelWidth = Math.min(900 * cardScale, width * 0.7);
  const gutter = 40 * cardScale;
  const gap = 30 * cardScale;
  const itemWidth = (panelWidth - gutter * 2 - gap * 2) / 3;
  const imageHeight = itemWidth * 1.04;
  const panelHeight = imageHeight + 60 * cardScale + gutter * 2 + 60 * cardScale;
  const panelX = (width - panelWidth) / 2;
  const panelY = (height - panelHeight) / 2;

  drawSoftPanel(context, panelX, panelY, panelWidth, panelHeight, 16 * cardScale);
  context.fillStyle = "#1a1a1a";
  context.font = `700 ${32 * cardScale}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  context.textAlign = "left";
  context.textBaseline = "top";
  context.fillText("Featured products", panelX + gutter, panelY + gutter);

  const products = [
    {
      id: "product-1" as const,
      image: uiState.hoveredId === "product-1" ? ("shirt1Hover" as const) : ("shirt1" as const),
      name: "Michael Shaggy Wool Cardigan",
      price: "$200.00",
    },
    {
      id: "product-2" as const,
      image: uiState.hoveredId === "product-2" ? ("shirt2Hover" as const) : ("shirt2" as const),
      name: "Sofia Lightweight Turtleneck Top",
      price: "$65.00",
    },
    {
      id: "product-3" as const,
      image: uiState.hoveredId === "product-3" ? ("shirt3Hover" as const) : ("shirt3" as const),
      name: "Striped Waffle LS Tee",
      price: "$53.00",
    },
  ];

  const productY = panelY + gutter + 60 * cardScale;
  products.forEach((product, index) => {
    const productX = panelX + gutter + index * (itemWidth + gap);
    drawProduct(context, product.image, product.name, product.price, productX, productY, itemWidth, imageHeight, cardScale);
    regions.push({
      height: imageHeight + 60 * cardScale,
      hoverOnly: true,
      id: product.id,
      type: "product",
      width: itemWidth,
      x: productX,
      y: productY,
    });
  });

  return regions;
}

function drawVideo(context: DrawContext, width: number, height: number) {
  const scale = getResponsiveScale(width, height);
  const mediaScale = scale * (width < height ? 1.6 : 1);

  context.fillStyle = "#d8a563";
  context.fillRect(0, 0, width, height);
  drawCenteredImage(context, getImage("bg4"), width, height, scale * (width < height ? 0.5 : 0.375));
  drawLayerTitle(context, "even video!", width, 180 * scale, scale);

  const videoWidth = Math.min(800 * mediaScale, width * 0.85);
  const videoHeight = videoWidth * (450 / 800);
  const padding = 20 * mediaScale;
  const panelWidth = videoWidth + padding * 2;
  const panelHeight = videoHeight + padding * 2;
  const panelX = (width - panelWidth) / 2;
  const panelY = (height - panelHeight) / 2 + 40 * scale;

  drawSoftPanel(context, panelX, panelY, panelWidth, panelHeight, 16 * mediaScale);
  const media = getVideoElement();
  const mediaX = panelX + padding;
  const mediaY = panelY + padding;
  if (media && media.readyState >= 2) {
    context.drawImage(media, mediaX, mediaY, videoWidth, videoHeight);
  } else {
    context.fillStyle = "#000000";
    context.fillRect(mediaX, mediaY, videoWidth, videoHeight);
    context.fillStyle = "#ffffff";
    context.font = `400 ${24 * mediaScale}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText("Loading video...", mediaX + videoWidth / 2, mediaY + videoHeight / 2);
  }

  return [];
}

function drawIndestructible(context: DrawContext, width: number, height: number) {
  const scale = getResponsiveScale(width, height);
  const centerY = height / 2;

  context.fillStyle = "#ae84e6";
  context.fillRect(0, 0, width, height);
  drawCenteredImage(context, getImage("bg5"), width, height, scale * (width < height ? 0.5 : 0.375));

  context.textAlign = "center";
  context.textBaseline = "middle";
  context.lineJoin = "round";
  context.font = gothicFont(Math.min(70 * scale, width * 0.052));
  context.letterSpacing = `${2 * scale}px`;
  drawOutlinedText(context, "THIS PAGE IS", width / 2, centerY - 50 * scale);
  drawOutlinedText(context, "INDESTRUCTIBLE", width / 2, centerY + 50 * scale);
  context.letterSpacing = "0px";
}

function drawLayerTitle(context: DrawContext, text: string, width: number, y: number, scale: number) {
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.lineJoin = "round";
  context.font = gothicFont(Math.min(80 * scale, width * 0.058));
  context.letterSpacing = `${2 * scale}px`;
  drawOutlinedText(context, text, width / 2, y);
  context.letterSpacing = "0px";
}

function drawOutlinedText(context: DrawContext, text: string, x: number, y: number) {
  context.strokeStyle = "rgba(0, 0, 0, 0.3)";
  context.lineWidth = 5;
  context.strokeText(text, x + 2, y + 2);
  context.strokeStyle = "#ffffff";
  context.strokeText(text, x, y);
  context.fillStyle = "#1a1a1a";
  context.fillText(text, x, y);
}

function drawLogo(context: DrawContext, width: number, scale: number) {
  const logo = getImage("logo");

  if (!logo || !logo.complete || logo.naturalWidth === 0) {
    return;
  }

  const height = 36 * scale;
  const imageWidth = height * (logo.naturalWidth / logo.naturalHeight);
  context.drawImage(logo, 60 * scale, 50 * scale - height / 2, imageWidth, height);
}

function drawInputField(
  context: DrawContext,
  {
    focused,
    height,
    hovered,
    id,
    label,
    scale,
    value,
    width,
    x,
    y,
  }: {
    focused: boolean;
    height: number;
    hovered: boolean;
    id: "input-email" | "input-name";
    label: string;
    scale: number;
    value: string;
    width: number;
    x: number;
    y: number;
  },
) {
  context.fillStyle = "#666666";
  context.font = `500 ${14 * scale}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  context.textAlign = "left";
  context.textBaseline = "top";
  context.fillText(label, x, y);

  const fieldY = y + 20 * scale;
  context.fillStyle = "#f8f8f8";
  roundedRect(context, x, fieldY, width, height, 8 * scale);
  context.fill();
  context.strokeStyle = focused ? "#3b82f6" : hovered ? "#999999" : "#dddddd";
  context.lineWidth = focused ? 2 * scale : 1 * scale;
  context.stroke();

  context.fillStyle = "#1a1a1a";
  context.font = `400 ${16 * scale}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  context.textBaseline = "middle";
  context.fillText(value, x + 12 * scale, fieldY + height / 2);

  if (focused) {
    const textWidth = context.measureText(value).width;
    context.fillRect(x + 12 * scale + textWidth + 3 * scale, fieldY + 10 * scale, 2 * scale, height - 20 * scale);
  }

  return {
    height,
    id,
    type: "input",
    width,
    x,
    y: fieldY,
  } satisfies HitRegion;
}

function drawSlider(
  context: DrawContext,
  x: number,
  y: number,
  width: number,
  scale: number,
  uiState: CanvasUiState,
) {
  context.fillStyle = "#666666";
  context.font = `500 ${14 * scale}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  context.textAlign = "left";
  context.textBaseline = "top";
  context.fillText("Shininess", x, y);

  const trackY = y + 30 * scale;
  context.fillStyle = "#e4e4e4";
  roundedRect(context, x, trackY, width, 8 * scale, 999);
  context.fill();
  context.fillStyle = "#1a1a1a";
  roundedRect(context, x, trackY, width * uiState.shininess, 8 * scale, 999);
  context.fill();
  context.beginPath();
  context.arc(x + width * uiState.shininess, trackY + 4 * scale, 13 * scale, 0, Math.PI * 2);
  context.fill();

  return {
    height: 30 * scale,
    id: "slider-shininess",
    type: "slider",
    width,
    x,
    y: trackY - 12 * scale,
  } satisfies HitRegion;
}

function drawToggle(
  context: DrawContext,
  label: string,
  id: "toggle-autosave" | "toggle-oily",
  value: boolean,
  x: number,
  y: number,
  scale: number,
  uiState: CanvasUiState,
) {
  const switchWidth = 46 * scale;
  const switchHeight = 26 * scale;
  const isHovering = uiState.hoveredId === id;

  context.fillStyle = "#1a1a1a";
  context.font = `500 ${15 * scale}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  context.textAlign = "left";
  context.textBaseline = "middle";
  context.fillText(label, x, y + switchHeight / 2);

  const switchX = x + 250 * scale;
  context.fillStyle = value ? "#1a1a1a" : "#d7d7d7";
  roundedRect(context, switchX, y, switchWidth, switchHeight, switchHeight / 2);
  context.fill();
  if (isHovering) {
    context.strokeStyle = "#777777";
    context.lineWidth = 1 * scale;
    context.stroke();
  }

  context.fillStyle = "#ffffff";
  context.beginPath();
  context.arc(switchX + (value ? switchWidth - 13 * scale : 13 * scale), y + switchHeight / 2, 10 * scale, 0, Math.PI * 2);
  context.fill();

  return {
    height: switchHeight + 8 * scale,
    id,
    type: "toggle",
    width: switchWidth,
    x: switchX,
    y: y - 4 * scale,
  } satisfies HitRegion;
}

function drawProduct(
  context: DrawContext,
  imageName: TearableAssetName,
  name: string,
  price: string,
  x: number,
  y: number,
  width: number,
  imageHeight: number,
  scale: number,
) {
  const image = getImage(imageName);
  if (image && image.complete && image.naturalWidth > 0) {
    const aspect = image.naturalWidth / image.naturalHeight;
    let drawWidth = width;
    let drawHeight = width / aspect;
    if (drawHeight > imageHeight) {
      drawHeight = imageHeight;
      drawWidth = imageHeight * aspect;
    }
    context.drawImage(image, x + (width - drawWidth) / 2, y, drawWidth, drawHeight);
  }

  const nameSize = Math.min(16 * scale, width * 0.08);
  context.fillStyle = "#1a1a1a";
  context.font = `500 ${nameSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  context.textAlign = "left";
  context.textBaseline = "top";
  context.fillText(name, x, y + imageHeight + 12 * scale, width);
  context.fillStyle = "#666666";
  context.font = `400 ${Math.min(15 * scale, width * 0.075)}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  context.fillText(price, x, y + imageHeight + 12 * scale + nameSize + 8 * scale);
}

function drawCenteredImage(
  context: DrawContext,
  image: HTMLImageElement | undefined,
  width: number,
  height: number,
  scale: number,
) {
  if (!image || !image.complete || image.naturalWidth === 0) {
    return;
  }

  const drawWidth = image.naturalWidth * scale;
  const drawHeight = image.naturalHeight * scale;
  context.drawImage(image, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
}

function drawSoftPanel(
  context: DrawContext,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  context.shadowColor = "rgba(0, 0, 0, 0.2)";
  context.shadowBlur = 30;
  context.shadowOffsetY = 10;
  context.fillStyle = "#ffffff";
  roundedRect(context, x, y, width, height, radius);
  context.fill();
  context.shadowColor = "transparent";
  context.shadowBlur = 0;
  context.shadowOffsetY = 0;
}

function getResponsiveScale(width: number, height: number) {
  return (width < height ? 1.6 : 1) * (height / 1024);
}

function gothicFont(size: number) {
  return `400 ${size}px "Special Gothic Expanded One", Impact, sans-serif`;
}

function getImage(name: TearableAssetName) {
  if (typeof window === "undefined") {
    return undefined;
  }

  const cached = images.get(name);
  if (cached) {
    return cached;
  }

  const image = new Image();
  image.crossOrigin = "anonymous";
  image.src = imageSources[name];
  images.set(name, image);
  return image;
}

function roundedRect(
  context: DrawContext,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.arcTo(x + width, y, x + width, y + height, safeRadius);
  context.arcTo(x + width, y + height, x, y + height, safeRadius);
  context.arcTo(x, y + height, x, y, safeRadius);
  context.arcTo(x, y, x + width, y, safeRadius);
  context.closePath();
}
