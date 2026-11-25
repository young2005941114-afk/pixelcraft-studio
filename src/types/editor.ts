export type AspectPreset = 'free' | '1:1' | '4:3' | '16:9' | '9:16' | '4:5';

export type ResizeMode = 'original' | 'scale' | 'dimensions';

export type WatermarkPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'center-left'
  | 'center'
  | 'center-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right'
  | 'tile';

export type ExportFormat = 'image/png' | 'image/jpeg' | 'image/webp';

/** Normalized crop rectangle with values in [0, 1]. */
export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TransformSettings {
  aspectPreset: AspectPreset;
  rotate90: 0 | 90 | 180 | 270;
  flipH: boolean;
  flipV: boolean;
}

export interface ResizeSettings {
  mode: ResizeMode;
  scalePercent: number;
  width: number;
  height: number;
  lockAspect: boolean;
}

export interface ColorSettings {
  presetId: string;
  brightness: number; // 0..200 (100 default)
  contrast: number;   // 0..200 (100 default)
  saturate: number;   // 0..200 (100 default)
  grayscale: number;  // 0..100 (0 default)
  sepia: number;      // 0..100 (0 default)
  hueRotate: number;  // -180..180 (0 default)
  blur: number;       // 0..20 px (0 default)
}

export interface WatermarkSettings {
  enabled: boolean;
  type: 'text' | 'image';
  text: string;
  fontSize: number; // relative scale 10..120 (interpreted vs 1000px reference)
  color: string;
  bold: boolean;
  italic: boolean;
  imageUrl: string | null;
  imageName: string | null;
  imageScale: number; // percentage 5..60 of output width
  opacity: number; // 0.05..1
  position: WatermarkPosition;
  margin: number; // px relative to 1000px reference
  rotation: number; // -45..45 degrees
}

export interface ExportSettings {
  format: ExportFormat;
  quality: number; // 0.1..1.0
  filenamePrefix: string;
}

export interface EditorSettings {
  transform: TransformSettings;
  resize: ResizeSettings;
  color: ColorSettings;
  watermark: WatermarkSettings;
  export: ExportSettings;
}

export interface ImageItem {
  id: string;
  name: string;
  fileSize: number;
  originalWidth: number;
  originalHeight: number;
  url: string;
  element: HTMLImageElement;
  cropRect: CropRect;
}

export const DEFAULT_CROP_RECT: CropRect = {
  x: 0,
  y: 0,
  width: 1,
  height: 1,
};

export const DEFAULT_COLOR_SETTINGS: ColorSettings = {
  presetId: 'original',
  brightness: 100,
  contrast: 100,
  saturate: 100,
  grayscale: 0,
  sepia: 0,
  hueRotate: 0,
  blur: 0,
};

export const DEFAULT_EDITOR_SETTINGS: EditorSettings = {
  transform: {
    aspectPreset: 'free',
    rotate90: 0,
    flipH: false,
    flipV: false,
  },
  resize: {
    mode: 'original',
    scalePercent: 100,
    width: 1200,
    height: 800,
    lockAspect: true,
  },
  color: { ...DEFAULT_COLOR_SETTINGS },
  watermark: {
    enabled: false,
    type: 'text',
    text: '© PixelCraft Studio',
    fontSize: 42,
    color: '#ffffff',
    bold: true,
    italic: false,
    imageUrl: null,
    imageName: null,
    imageScale: 20,
    opacity: 0.7,
    position: 'bottom-right',
    margin: 32,
    rotation: 0,
  },
  export: {
    format: 'image/webp',
    quality: 0.9,
    filenamePrefix: 'edited_',
  },
};
