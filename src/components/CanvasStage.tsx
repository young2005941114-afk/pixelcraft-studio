import { Crop, Eye, ImagePlus, Sparkles } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import {
  clampCropRect,
  getAspectRatioValue,
  getOrientedDimensions,
  renderProcessedImage,
} from '../engine/imageProcessor';
import type { CropRect, EditorSettings, ImageItem } from '../types/editor';

export type StageMode = 'preview' | 'crop';

type DragHandle = 'move' | 'nw' | 'ne' | 'sw' | 'se';

interface CanvasStageProps {
  activeItem: ImageItem | null;
  settings: EditorSettings;
  watermarkImg: HTMLImageElement | null;
  stageMode: StageMode;
  onStageModeChange: (mode: StageMode) => void;
  onCropChange: (rect: CropRect) => void;
  onAddFiles: (files: FileList | File[]) => void;
  onLoadSamples: () => void;
}

const HANDLE_DIRS: Record<Exclude<DragHandle, 'move'>, { right: boolean; bottom: boolean }> = {
  nw: { right: false, bottom: false },
  ne: { right: true, bottom: false },
  sw: { right: false, bottom: true },
  se: { right: true, bottom: true },
};

export function CanvasStage({
  activeItem,
  settings,
  watermarkImg,
  stageMode,
  onStageModeChange,
  onCropChange,
  onAddFiles,
  onLoadSamples,
}: CanvasStageProps) {
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const cropCanvasRef = useRef<HTMLCanvasElement>(null);
  const cropBoxContainerRef = useRef<HTMLDivElement>(null);
  const emptyFileInputRef = useRef<HTMLInputElement>(null);

  const [showOriginal, setShowOriginal] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [outputDims, setOutputDims] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });

  const dragStateRef = useRef<{
    handle: DragHandle;
    startX: number;
    startY: number;
    startRect: CropRect;
    boxW: number;
    boxH: number;
  } | null>(null);

  // Render preview canvas
  useEffect(() => {
    if (!activeItem || stageMode !== 'preview' || !previewCanvasRef.current) return;
    const result = renderProcessedImage(activeItem, settings, watermarkImg, {
      targetCanvas: previewCanvasRef.current,
      previewMaxDim: 1400,
      skipEffects: showOriginal,
    });
    setOutputDims({ width: result.outputWidth, height: result.outputHeight });
  }, [activeItem, settings, watermarkImg, stageMode, showOriginal]);

  // Render full uncropped oriented image underneath crop overlay
  useEffect(() => {
    if (!activeItem || stageMode !== 'crop' || !cropCanvasRef.current) return;
    const uncroppedItem: ImageItem = {
      ...activeItem,
      cropRect: { x: 0, y: 0, width: 1, height: 1 },
    };
    const cropViewSettings: EditorSettings = {
      ...settings,
      resize: { ...settings.resize, mode: 'original' },
      watermark: { ...settings.watermark, enabled: false },
    };
    renderProcessedImage(uncroppedItem, cropViewSettings, null, {
      targetCanvas: cropCanvasRef.current,
      previewMaxDim: 1200,
    });
  }, [activeItem, settings, stageMode]);

  // Global pointer listeners for smooth crop dragging
  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      const drag = dragStateRef.current;
      if (!drag) return;

      const dx = e.clientX - drag.startX;
      const dy = e.clientY - drag.startY;
      const { boxW, boxH, startRect, handle } = drag;

      if (handle === 'move') {
        const nx = Math.min(1 - startRect.width, Math.max(0, startRect.x + dx / boxW));
        const ny = Math.min(1 - startRect.height, Math.max(0, startRect.y + dy / boxH));
        onCropChange({ ...startRect, x: nx, y: ny });
        return;
      }

      const { right, bottom } = HANDLE_DIRS[handle];
      const px = startRect.x * boxW;
      const py = startRect.y * boxH;
      const pw = startRect.width * boxW;
      const ph = startRect.height * boxH;

      const anchorX = right ? px : px + pw;
      const anchorY = bottom ? py : py + ph;
      const rawMovingX = right ? px + pw + dx : px + dx;
      const rawMovingY = bottom ? py + ph + dy : py + dy;

      const clampedMovingX = Math.min(boxW, Math.max(0, rawMovingX));
      const clampedMovingY = Math.min(boxH, Math.max(0, rawMovingY));

      const minPx = 24;
      const maxW = right ? boxW - anchorX : anchorX;
      const maxH = bottom ? boxH - anchorY : anchorY;

      let w = Math.min(maxW, Math.max(minPx, right ? clampedMovingX - anchorX : anchorX - clampedMovingX));
      let h = Math.min(maxH, Math.max(minPx, bottom ? clampedMovingY - anchorY : anchorY - clampedMovingY));

      const aspect = getAspectRatioValue(settings.transform.aspectPreset);
      if (aspect) {
        h = w / aspect;
        if (h > maxH) {
          h = maxH;
          w = h * aspect;
        }
        if (w < minPx) {
          w = minPx;
          h = w / aspect;
        }
      }

      const left = right ? anchorX : anchorX - w;
      const top = bottom ? anchorY : anchorY - h;

      onCropChange(
        clampCropRect({
          x: left / boxW,
          y: top / boxH,
          width: w / boxW,
          height: h / boxH,
        })
      );
    };

    const handlePointerUp = () => {
      dragStateRef.current = null;
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [onCropChange, settings.transform.aspectPreset]);

  const startCropDrag = (handle: DragHandle, e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!activeItem || !cropBoxContainerRef.current) return;
    const rect = cropBoxContainerRef.current.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    dragStateRef.current = {
      handle,
      startX: e.clientX,
      startY: e.clientY,
      startRect: activeItem.cropRect,
      boxW: rect.width,
      boxH: rect.height,
    };
  };

  if (!activeItem) {
    return (
      <main
        className={`stage-empty ${isDraggingFile ? 'dragging' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDraggingFile(true);
        }}
        onDragLeave={() => setIsDraggingFile(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDraggingFile(false);
          if (e.dataTransfer.files.length > 0) {
            onAddFiles(e.dataTransfer.files);
          }
        }}
      >
        <input
          ref={emptyFileInputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            if (e.target.files?.length) {
              onAddFiles(e.target.files);
              e.target.value = '';
            }
          }}
        />
        <div className="empty-card">
          <div className="empty-icon">
            <ImagePlus size={36} />
          </div>
          <h2>將圖片拖放到這裡開始編輯</h2>
          <p>支援批次裁切縮放、文字與 Logo 浮水印、即時調色濾鏡與一鍵 ZIP 打包匯出。</p>
          <div className="empty-actions">
            <button
              type="button"
              className="btn-primary"
              onClick={() => emptyFileInputRef.current?.click()}
            >
              <ImagePlus size={16} />
              選擇本機圖片
            </button>
            <button type="button" className="btn-secondary" onClick={onLoadSamples}>
              <Sparkles size={16} />
              載入範例圖片試用
            </button>
          </div>
        </div>
      </main>
    );
  }

  const oriented = getOrientedDimensions(
    activeItem.originalWidth,
    activeItem.originalHeight,
    settings.transform.rotate90
  );
  const crop = activeItem.cropRect;

  return (
    <main className="stage-main">
      <div className="stage-toolbar">
        <div className="segmented-control">
          <button
            type="button"
            className={stageMode === 'preview' ? 'active' : ''}
            onClick={() => onStageModeChange('preview')}
          >
            <Eye size={14} /> 預覽結果
          </button>
          <button
            type="button"
            className={stageMode === 'crop' ? 'active' : ''}
            onClick={() => onStageModeChange('crop')}
          >
            <Crop size={14} /> 互動裁切
          </button>
        </div>

        <div className="stage-info-pill">
          <span>
            原圖 {activeItem.originalWidth}×{activeItem.originalHeight}
          </span>
          <span className="arrow">→</span>
          <strong>
            輸出{' '}
            {stageMode === 'preview'
              ? `${outputDims.width}×${outputDims.height}`
              : `${Math.round(oriented.width * crop.width)}×${Math.round(oriented.height * crop.height)}`}
          </strong>
        </div>

        {stageMode === 'preview' && (
          <button
            type="button"
            className={`btn-compare ${showOriginal ? 'active' : ''}`}
            onPointerDown={() => setShowOriginal(true)}
            onPointerUp={() => setShowOriginal(false)}
            onPointerLeave={() => setShowOriginal(false)}
          >
            {showOriginal ? '顯示原圖中' : '按住檢視原圖'}
          </button>
        )}
      </div>

      <div className="canvas-viewport">
        {stageMode === 'preview' ? (
          <div className="preview-frame checkerboard">
            <canvas ref={previewCanvasRef} className="stage-canvas" />
          </div>
        ) : (
          <div className="crop-wrapper" ref={cropBoxContainerRef}>
            <canvas ref={cropCanvasRef} className="stage-canvas" />
            <div className="crop-scrim">
              <div
                className="crop-box"
                style={{
                  left: `${crop.x * 100}%`,
                  top: `${crop.y * 100}%`,
                  width: `${crop.width * 100}%`,
                  height: `${crop.height * 100}%`,
                }}
                onPointerDown={(e) => startCropDrag('move', e)}
              >
                <div className="crop-grid-h" />
                <div className="crop-grid-v" />
                {(['nw', 'ne', 'sw', 'se'] as const).map((dir) => (
                  <div
                    key={dir}
                    className={`crop-handle handle-${dir}`}
                    onPointerDown={(e) => startCropDrag(dir, e)}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
