import type {
  AspectPreset,
  ColorSettings,
  CropRect,
  EditorSettings,
  ExportFormat,
  ImageItem,
  ResizeSettings,
  TransformSettings,
  WatermarkPosition,
  WatermarkSettings,
} from '../types/editor';

export interface FilterPreset {
  id: string;
  name: string;
  settings: Omit<ColorSettings, 'presetId'>;
}

export const FILTER_PRESETS: FilterPreset[] = [
  {
    id: 'original',
    name: '原圖',
    settings: { brightness: 100, contrast: 100, saturate: 100, grayscale: 0, sepia: 0, hueRotate: 0, blur: 0 },
  },
  {
    id: 'vivid',
    name: '鮮明',
    settings: { brightness: 105, contrast: 118, saturate: 135, grayscale: 0, sepia: 0, hueRotate: 0, blur: 0 },
  },
  {
    id: 'noir',
    name: '黑白底片',
    settings: { brightness: 102, contrast: 135, saturate: 0, grayscale: 100, sepia: 0, hueRotate: 0, blur: 0 },
  },
  {
    id: 'vintage',
    name: '復古暖陽',
    settings: { brightness: 104, contrast: 96, saturate: 90, grayscale: 0, sepia: 45, hueRotate: -6, blur: 0 },
  },
  {
    id: 'cool',
    name: '冷調青影',
    settings: { brightness: 100, contrast: 110, saturate: 95, grayscale: 0, sepia: 0, hueRotate: 14, blur: 0 },
  },
  {
    id: 'dreamy',
    name: '柔焦夢幻',
    settings: { brightness: 112, contrast: 90, saturate: 112, grayscale: 0, sepia: 12, hueRotate: 0, blur: 1.5 },
  },
];

const ASPECT_RATIO_MAP: Record<Exclude<AspectPreset, 'free'>, number> = {
  '1:1': 1,
  '4:3': 4 / 3,
  '16:9': 16 / 9,
  '9:16': 9 / 16,
  '4:5': 4 / 5,
};

/** Returns numeric width/height aspect ratio or null for freeform crop. */
export function getAspectRatioValue(preset: AspectPreset): number | null {
  return preset === 'free' ? null : ASPECT_RATIO_MAP[preset];
}

/** Returns oriented dimensions after 90-degree step rotation. */
export function getOrientedDimensions(
  width: number,
  height: number,
  rotate90: TransformSettings['rotate90']
): { width: number; height: number } {
  return rotate90 === 90 || rotate90 === 270
    ? { width: height, height: width }
    : { width, height };
}

/** Computes a centered normalized crop rectangle [0..1] fitting the target aspect ratio. */
export function computeCropRectForAspect(
  orientedWidth: number,
  orientedHeight: number,
  preset: AspectPreset
): CropRect {
  const targetRatio = getAspectRatioValue(preset);
  if (!targetRatio || orientedWidth <= 0 || orientedHeight <= 0) {
    return { x: 0, y: 0, width: 1, height: 1 };
  }

  const currentRatio = orientedWidth / orientedHeight;
  if (Math.abs(currentRatio - targetRatio) < 0.0001) {
    return { x: 0, y: 0, width: 1, height: 1 };
  }

  if (currentRatio > targetRatio) {
    const normWidth = (orientedHeight * targetRatio) / orientedWidth;
    return {
      x: (1 - normWidth) / 2,
      y: 0,
      width: normWidth,
      height: 1,
    };
  }

  const normHeight = orientedWidth / (orientedHeight * targetRatio);
  return {
    x: 0,
    y: (1 - normHeight) / 2,
    width: 1,
    height: normHeight,
  };
}

/** Clamps a normalized crop rectangle safely inside [0, 1] with a minimum size. */
export function clampCropRect(rect: CropRect, minSize = 0.04): CropRect {
  const width = Math.min(1, Math.max(minSize, rect.width));
  const height = Math.min(1, Math.max(minSize, rect.height));
  const x = Math.min(1 - width, Math.max(0, rect.x));
  const y = Math.min(1 - height, Math.max(0, rect.y));
  return { x, y, width, height };
}

/** Computes final pixel output dimensions from cropped source size and resize settings. */
export function computeOutputDimensions(
  croppedWidth: number,
  croppedHeight: number,
  resize: ResizeSettings
): { width: number; height: number } {
  const safeW = Math.max(1, Math.round(croppedWidth));
  const safeH = Math.max(1, Math.round(croppedHeight));

  if (resize.mode === 'scale') {
    const factor = Math.max(0.05, Math.min(4, resize.scalePercent / 100));
    return {
      width: Math.max(1, Math.round(safeW * factor)),
      height: Math.max(1, Math.round(safeH * factor)),
    };
  }

  if (resize.mode === 'dimensions') {
    const targetW = Math.max(1, Math.round(resize.width));
    const targetH = Math.max(1, Math.round(resize.height));
    if (resize.lockAspect) {
      const ratio = safeW / safeH;
      return {
        width: targetW,
        height: Math.max(1, Math.round(targetW / ratio)),
      };
    }
    return { width: targetW, height: targetH };
  }

  return { width: safeW, height: safeH };
}

/** Builds a CanvasRenderingContext2D filter string from color settings. */
export function buildCssFilterString(color: ColorSettings, blurScale = 1): string {
  const blurPx = Math.max(0, color.blur * blurScale);
  return [
    `brightness(${color.brightness}%)`,
    `contrast(${color.contrast}%)`,
    `saturate(${color.saturate}%)`,
    `grayscale(${color.grayscale}%)`,
    `sepia(${color.sepia}%)`,
    `hue-rotate(${color.hueRotate}deg)`,
    `blur(${blurPx.toFixed(2)}px)`,
  ].join(' ');
}

const ANCHOR_FACTORS: Record<Exclude<WatermarkPosition, 'tile'>, { ax: number; ay: number }> = {
  'top-left': { ax: 0, ay: 0 },
  'top-center': { ax: 0.5, ay: 0 },
  'top-right': { ax: 1, ay: 0 },
  'center-left': { ax: 0, ay: 0.5 },
  center: { ax: 0.5, ay: 0.5 },
  'center-right': { ax: 1, ay: 0.5 },
  'bottom-left': { ax: 0, ay: 1 },
  'bottom-center': { ax: 0.5, ay: 1 },
  'bottom-right': { ax: 1, ay: 1 },
};

/** Computes center coordinates (cx, cy) for a watermark bounding box inside a canvas. */
export function computeWatermarkCenter(
  canvasW: number,
  canvasH: number,
  boxW: number,
  boxH: number,
  position: Exclude<WatermarkPosition, 'tile'>,
  margin: number
): { cx: number; cy: number } {
  const { ax, ay } = ANCHOR_FACTORS[position];
  const minX = margin + boxW / 2;
  const maxX = Math.max(minX, canvasW - margin - boxW / 2);
  const minY = margin + boxH / 2;
  const maxY = Math.max(minY, canvasH - margin - boxH / 2);

  return {
    cx: minX + (maxX - minX) * ax,
    cy: minY + (maxY - minY) * ay,
  };
}

function drawOrientedSource(
  source: HTMLImageElement,
  transform: TransformSettings
): HTMLCanvasElement {
  const { width, height } = getOrientedDimensions(
    source.naturalWidth,
    source.naturalHeight,
    transform.rotate90
  );
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.save();
  ctx.translate(width / 2, height / 2);
  ctx.rotate((transform.rotate90 * Math.PI) / 180);
  ctx.scale(transform.flipH ? -1 : 1, transform.flipV ? -1 : 1);
  ctx.drawImage(source, -source.naturalWidth / 2, -source.naturalHeight / 2);
  ctx.restore();

  return canvas;
}

function drawWatermarkLayer(
  ctx: CanvasRenderingContext2D,
  canvasW: number,
  canvasH: number,
  watermark: WatermarkSettings,
  watermarkImg: HTMLImageElement | null
): void {
  if (!watermark.enabled) return;

  const refScale = Math.min(canvasW, canvasH) / 1000;
  const marginPx = watermark.margin * refScale;
  const rad = (watermark.rotation * Math.PI) / 180;

  let drawFn: ((cx: number, cy: number) => void) | null = null;
  let boxW = 0;
  let boxH = 0;

  if (watermark.type === 'text') {
    const text = watermark.text.trim();
    if (!text) return;

    const fontPx = Math.max(10, Math.round(watermark.fontSize * refScale));
    const fontStyle = `${watermark.italic ? 'italic ' : ''}${watermark.bold ? 'bold ' : ''}${fontPx}px "Inter", "Noto Sans TC", system-ui, sans-serif`;
    ctx.font = fontStyle;
    const metrics = ctx.measureText(text);
    boxW = metrics.width;
    boxH = fontPx * 1.15;

    drawFn = (cx, cy) => {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rad);
      ctx.font = fontStyle;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = watermark.color;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
      ctx.shadowBlur = Math.max(2, fontPx * 0.12);
      ctx.fillText(text, 0, 0);
      ctx.restore();
    };
  } else if (watermark.type === 'image' && watermarkImg && watermarkImg.naturalWidth > 0) {
    boxW = Math.max(16, (canvasW * watermark.imageScale) / 100);
    boxH = boxW * (watermarkImg.naturalHeight / watermarkImg.naturalWidth);

    drawFn = (cx, cy) => {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rad);
      ctx.drawImage(watermarkImg, -boxW / 2, -boxH / 2, boxW, boxH);
      ctx.restore();
    };
  }

  if (!drawFn) return;

  ctx.save();
  ctx.globalAlpha = watermark.opacity;

  if (watermark.position === 'tile') {
    const stepX = Math.max(boxW + Math.max(40, canvasW * 0.12), canvasW / 3.5);
    const stepY = Math.max(boxH + Math.max(40, canvasH * 0.12), canvasH / 3.5);
    for (let y = stepY * 0.45, row = 0; y < canvasH + stepY * 0.5; y += stepY, row++) {
      const offsetX = row % 2 === 1 ? stepX * 0.5 : 0;
      for (let x = -stepX * 0.25 + offsetX; x < canvasW + stepX * 0.5; x += stepX) {
        drawFn(x, y);
      }
    }
  } else {
    const { cx, cy } = computeWatermarkCenter(
      canvasW,
      canvasH,
      boxW,
      boxH,
      watermark.position,
      marginPx
    );
    drawFn(cx, cy);
  }

  ctx.restore();
}

export interface RenderResult {
  canvas: HTMLCanvasElement;
  outputWidth: number;
  outputHeight: number;
}

/**
 * Renders an ImageItem through the full pipeline (orient -> crop -> resize -> color filter -> watermark).
 * When `previewMaxDim` is specified, scales down rendering proportionally for responsive live preview.
 */
export function renderProcessedImage(
  item: ImageItem,
  settings: EditorSettings,
  watermarkImg: HTMLImageElement | null,
  options?: {
    targetCanvas?: HTMLCanvasElement;
    previewMaxDim?: number;
    skipEffects?: boolean;
  }
): RenderResult {
  const orientedCanvas = drawOrientedSource(item.element, settings.transform);
  const srcX = Math.round(item.cropRect.x * orientedCanvas.width);
  const srcY = Math.round(item.cropRect.y * orientedCanvas.height);
  const srcW = Math.max(1, Math.round(item.cropRect.width * orientedCanvas.width));
  const srcH = Math.max(1, Math.round(item.cropRect.height * orientedCanvas.height));

  const fullDims = computeOutputDimensions(srcW, srcH, settings.resize);
  let renderW = fullDims.width;
  let renderH = fullDims.height;
  let previewRatio = 1;

  if (options?.previewMaxDim && Math.max(renderW, renderH) > options.previewMaxDim) {
    previewRatio = options.previewMaxDim / Math.max(renderW, renderH);
    renderW = Math.max(1, Math.round(renderW * previewRatio));
    renderH = Math.max(1, Math.round(renderH * previewRatio));
  }

  const canvas = options?.targetCanvas ?? document.createElement('canvas');
  canvas.width = renderW;
  canvas.height = renderH;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return { canvas, outputWidth: fullDims.width, outputHeight: fullDims.height };
  }

  ctx.clearRect(0, 0, renderW, renderH);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  ctx.save();
  if (!options?.skipEffects) {
    ctx.filter = buildCssFilterString(settings.color, previewRatio);
  }
  ctx.drawImage(orientedCanvas, srcX, srcY, srcW, srcH, 0, 0, renderW, renderH);
  ctx.restore();

  if (!options?.skipEffects) {
    drawWatermarkLayer(ctx, renderW, renderH, settings.watermark, watermarkImg);
  }

  return {
    canvas,
    outputWidth: fullDims.width,
    outputHeight: fullDims.height,
  };
}

export function getExtensionForFormat(format: ExportFormat): string {
  switch (format) {
    case 'image/png':
      return 'png';
    case 'image/jpeg':
      return 'jpg';
    case 'image/webp':
      return 'webp';
  }
}

export function buildOutputFilename(
  originalName: string,
  prefix: string,
  format: ExportFormat
): string {
  const baseName = originalName.replace(/\.[^.]+$/, '');
  const ext = getExtensionForFormat(format);
  return `${prefix}${baseName}.${ext}`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function canvasToBlob(
  canvas: HTMLCanvasElement,
  format: ExportFormat,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('無法產生圖片檔案'));
      },
      format,
      format === 'image/png' ? undefined : quality
    );
  });
}

export async function exportSingleImageBlob(
  item: ImageItem,
  settings: EditorSettings,
  watermarkImg: HTMLImageElement | null
): Promise<Blob> {
  const { canvas } = renderProcessedImage(item, settings, watermarkImg);
  return canvasToBlob(canvas, settings.export.format, settings.export.quality);
}
