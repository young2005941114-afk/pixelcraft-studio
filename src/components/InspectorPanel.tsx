import {
  Crop,
  Download,
  FlipHorizontal,
  FlipVertical,
  FolderArchive,
  Grid3X3,
  Image as ImageIcon,
  Palette,
  RotateCcw,
  RotateCw,
  SlidersHorizontal,
  Stamp,
  Type,
  Upload,
} from 'lucide-react';
import { useRef } from 'react';
import {
  FILTER_PRESETS,
  computeOutputDimensions,
  formatBytes,
  getOrientedDimensions,
} from '../engine/imageProcessor';
import type {
  AspectPreset,
  ColorSettings,
  EditorSettings,
  ExportFormat,
  ImageItem,
  ResizeMode,
  WatermarkPosition,
} from '../types/editor';
import { DEFAULT_COLOR_SETTINGS } from '../types/editor';
import { SliderField } from './SliderField';

export type InspectorTab = 'crop' | 'color' | 'watermark' | 'export';

interface InspectorPanelProps {
  activeTab: InspectorTab;
  onTabChange: (tab: InspectorTab) => void;
  activeItem: ImageItem | null;
  itemCount: number;
  settings: EditorSettings;
  estimatedSize: number | null;
  isExporting: boolean;
  exportProgress: { done: number; total: number } | null;
  onUpdateSettings: (updater: (prev: EditorSettings) => EditorSettings) => void;
  onAspectPresetChange: (preset: AspectPreset) => void;
  onApplyCropToAll: () => void;
  onResetCrop: () => void;
  onEnterCropMode: () => void;
  onWatermarkImageSelect: (file: File) => void;
  onDownloadCurrent: () => void;
  onDownloadBatchZip: () => void;
}

const ASPECT_OPTIONS: { id: AspectPreset; label: string }[] = [
  { id: 'free', label: '自由' },
  { id: '1:1', label: '1:1' },
  { id: '4:3', label: '4:3' },
  { id: '16:9', label: '16:9' },
  { id: '9:16', label: '9:16' },
  { id: '4:5', label: '4:5' },
];

const WATERMARK_ANCHORS: Exclude<WatermarkPosition, 'tile'>[] = [
  'top-left',
  'top-center',
  'top-right',
  'center-left',
  'center',
  'center-right',
  'bottom-left',
  'bottom-center',
  'bottom-right',
];

const FORMAT_OPTIONS: { id: ExportFormat; label: string; desc: string }[] = [
  { id: 'image/webp', label: 'WebP', desc: '體積最小、畫質優異' },
  { id: 'image/jpeg', label: 'JPG', desc: '相容性最高' },
  { id: 'image/png', label: 'PNG', desc: '無損畫質、支援透明' },
];

export function InspectorPanel({
  activeTab,
  onTabChange,
  activeItem,
  itemCount,
  settings,
  estimatedSize,
  isExporting,
  exportProgress,
  onUpdateSettings,
  onAspectPresetChange,
  onApplyCropToAll,
  onResetCrop,
  onEnterCropMode,
  onWatermarkImageSelect,
  onDownloadCurrent,
  onDownloadBatchZip,
}: InspectorPanelProps) {
  const wmFileRef = useRef<HTMLInputElement>(null);

  const oriented = activeItem
    ? getOrientedDimensions(
        activeItem.originalWidth,
        activeItem.originalHeight,
        settings.transform.rotate90
      )
    : { width: 1200, height: 800 };

  const croppedW = activeItem ? Math.round(oriented.width * activeItem.cropRect.width) : 1200;
  const croppedH = activeItem ? Math.round(oriented.height * activeItem.cropRect.height) : 800;
  const outDims = computeOutputDimensions(croppedW, croppedH, settings.resize);

  const updateColor = (patch: Partial<ColorSettings>) => {
    onUpdateSettings((prev) => ({
      ...prev,
      color: { ...prev.color, ...patch, presetId: patch.presetId ?? 'custom' },
    }));
  };

  return (
    <aside className="inspector-right">
      <nav className="inspector-tabs">
        <button
          type="button"
          className={activeTab === 'crop' ? 'active' : ''}
          onClick={() => onTabChange('crop')}
        >
          <Crop size={15} />
          <span>裁切尺寸</span>
        </button>
        <button
          type="button"
          className={activeTab === 'color' ? 'active' : ''}
          onClick={() => onTabChange('color')}
        >
          <Palette size={15} />
          <span>調色濾鏡</span>
        </button>
        <button
          type="button"
          className={activeTab === 'watermark' ? 'active' : ''}
          onClick={() => onTabChange('watermark')}
        >
          <Stamp size={15} />
          <span>浮水印</span>
        </button>
        <button
          type="button"
          className={activeTab === 'export' ? 'active' : ''}
          onClick={() => onTabChange('export')}
        >
          <Download size={15} />
          <span>匯出</span>
        </button>
      </nav>

      <div className="inspector-body">
        {activeTab === 'crop' && (
          <div className="panel-section">
            <div className="section-title">翻轉與旋轉</div>
            <div className="button-grid-4">
              <button
                type="button"
                className="tool-chip"
                onClick={() =>
                  onUpdateSettings((prev) => ({
                    ...prev,
                    transform: {
                      ...prev.transform,
                      rotate90: (((prev.transform.rotate90 + 270) % 360) as 0 | 90 | 180 | 270),
                    },
                  }))
                }
              >
                <RotateCcw size={15} />
                <span>左轉 90°</span>
              </button>
              <button
                type="button"
                className="tool-chip"
                onClick={() =>
                  onUpdateSettings((prev) => ({
                    ...prev,
                    transform: {
                      ...prev.transform,
                      rotate90: (((prev.transform.rotate90 + 90) % 360) as 0 | 90 | 180 | 270),
                    },
                  }))
                }
              >
                <RotateCw size={15} />
                <span>右轉 90°</span>
              </button>
              <button
                type="button"
                className={`tool-chip ${settings.transform.flipH ? 'active' : ''}`}
                onClick={() =>
                  onUpdateSettings((prev) => ({
                    ...prev,
                    transform: { ...prev.transform, flipH: !prev.transform.flipH },
                  }))
                }
              >
                <FlipHorizontal size={15} />
                <span>水平翻轉</span>
              </button>
              <button
                type="button"
                className={`tool-chip ${settings.transform.flipV ? 'active' : ''}`}
                onClick={() =>
                  onUpdateSettings((prev) => ({
                    ...prev,
                    transform: { ...prev.transform, flipV: !prev.transform.flipV },
                  }))
                }
              >
                <FlipVertical size={15} />
                <span>垂直翻轉</span>
              </button>
            </div>

            <div className="section-title-row">
              <span>裁切長寬比</span>
              <button type="button" className="text-btn" onClick={onResetCrop}>
                重設裁切
              </button>
            </div>
            <div className="chip-grid-3">
              {ASPECT_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  className={`aspect-chip ${settings.transform.aspectPreset === opt.id ? 'active' : ''}`}
                  onClick={() => onAspectPresetChange(opt.id)}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="inline-actions">
              <button type="button" className="btn-secondary full-width" onClick={onEnterCropMode}>
                <Crop size={14} /> 調整裁切框
              </button>
              {itemCount > 1 && (
                <button
                  type="button"
                  className="btn-secondary full-width"
                  onClick={onApplyCropToAll}
                >
                  套用比例至全部
                </button>
              )}
            </div>

            <div className="divider" />

            <div className="section-title">輸出尺寸縮放</div>
            <div className="segmented-control full-width">
              {(
                [
                  { id: 'original', label: '原尺寸' },
                  { id: 'scale', label: '百分比' },
                  { id: 'dimensions', label: '指定像素' },
                ] as { id: ResizeMode; label: string }[]
              ).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className={settings.resize.mode === m.id ? 'active' : ''}
                  onClick={() =>
                    onUpdateSettings((prev) => ({
                      ...prev,
                      resize: {
                        ...prev.resize,
                        mode: m.id,
                        width: m.id === 'dimensions' ? croppedW : prev.resize.width,
                        height: m.id === 'dimensions' ? croppedH : prev.resize.height,
                      },
                    }))
                  }
                >
                  {m.label}
                </button>
              ))}
            </div>

            {settings.resize.mode === 'scale' && (
              <SliderField
                label="縮放比例"
                value={settings.resize.scalePercent}
                min={10}
                max={200}
                step={5}
                unit="%"
                defaultValue={100}
                onChange={(val) =>
                  onUpdateSettings((prev) => ({
                    ...prev,
                    resize: { ...prev.resize, scalePercent: val },
                  }))
                }
              />
            )}

            {settings.resize.mode === 'dimensions' && (
              <div className="dims-editor">
                <div className="dims-row">
                  <label className="input-box">
                    <span>寬度 (px)</span>
                    <input
                      type="number"
                      min={1}
                      max={8000}
                      value={settings.resize.width}
                      onChange={(e) => {
                        const w = Math.max(1, Number(e.target.value) || 1);
                        const ratio = croppedW / Math.max(1, croppedH);
                        onUpdateSettings((prev) => ({
                          ...prev,
                          resize: {
                            ...prev.resize,
                            width: w,
                            height: prev.resize.lockAspect ? Math.max(1, Math.round(w / ratio)) : prev.resize.height,
                          },
                        }));
                      }}
                    />
                  </label>
                  <label className="input-box">
                    <span>高度 (px)</span>
                    <input
                      type="number"
                      min={1}
                      max={8000}
                      value={settings.resize.height}
                      disabled={settings.resize.lockAspect}
                      onChange={(e) => {
                        const h = Math.max(1, Number(e.target.value) || 1);
                        onUpdateSettings((prev) => ({
                          ...prev,
                          resize: { ...prev.resize, height: h },
                        }));
                      }}
                    />
                  </label>
                </div>
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={settings.resize.lockAspect}
                    onChange={(e) =>
                      onUpdateSettings((prev) => ({
                        ...prev,
                        resize: { ...prev.resize, lockAspect: e.target.checked },
                      }))
                    }
                  />
                  <span>鎖定裁切後長寬比</span>
                </label>
              </div>
            )}

            <div className="info-banner">
              <SlidersHorizontal size={14} />
              <span>
                預期輸出解析度：{outDims.width} × {outDims.height} px
              </span>
            </div>
          </div>
        )}

        {activeTab === 'color' && (
          <div className="panel-section">
            <div className="section-title-row">
              <span>快速風格濾鏡</span>
              <button
                type="button"
                className="text-btn"
                onClick={() => updateColor({ ...DEFAULT_COLOR_SETTINGS })}
              >
                全部重設
              </button>
            </div>

            <div className="preset-grid">
              {FILTER_PRESETS.map((preset) => {
                const isSelected = settings.color.presetId === preset.id;
                const cssFilter = `brightness(${preset.settings.brightness}%) contrast(${preset.settings.contrast}%) saturate(${preset.settings.saturate}%) grayscale(${preset.settings.grayscale}%) sepia(${preset.settings.sepia}%) hue-rotate(${preset.settings.hueRotate}deg) blur(${preset.settings.blur}px)`;

                return (
                  <button
                    key={preset.id}
                    type="button"
                    className={`preset-card ${isSelected ? 'active' : ''}`}
                    onClick={() => updateColor({ ...preset.settings, presetId: preset.id })}
                  >
                    <div className="preset-thumb-wrap">
                      {activeItem ? (
                        <img
                          src={activeItem.url}
                          alt={preset.name}
                          style={{ filter: cssFilter }}
                        />
                      ) : (
                        <div className="preset-swatch" style={{ filter: cssFilter }} />
                      )}
                    </div>
                    <span>{preset.name}</span>
                  </button>
                );
              })}
            </div>

            <div className="divider" />

            <div className="section-title">精細調色</div>
            <SliderField
              label="亮度"
              value={settings.color.brightness}
              min={30}
              max={180}
              unit="%"
              defaultValue={100}
              onChange={(brightness) => updateColor({ brightness })}
            />
            <SliderField
              label="對比度"
              value={settings.color.contrast}
              min={40}
              max={180}
              unit="%"
              defaultValue={100}
              onChange={(contrast) => updateColor({ contrast })}
            />
            <SliderField
              label="飽和度"
              value={settings.color.saturate}
              min={0}
              max={200}
              unit="%"
              defaultValue={100}
              onChange={(saturate) => updateColor({ saturate })}
            />
            <SliderField
              label="色相偏移"
              value={settings.color.hueRotate}
              min={-180}
              max={180}
              unit="°"
              defaultValue={0}
              onChange={(hueRotate) => updateColor({ hueRotate })}
            />
            <SliderField
              label="黑白強度"
              value={settings.color.grayscale}
              min={0}
              max={100}
              unit="%"
              defaultValue={0}
              onChange={(grayscale) => updateColor({ grayscale })}
            />
            <SliderField
              label="復古懷舊"
              value={settings.color.sepia}
              min={0}
              max={100}
              unit="%"
              defaultValue={0}
              onChange={(sepia) => updateColor({ sepia })}
            />
            <SliderField
              label="高斯模糊"
              value={settings.color.blur}
              min={0}
              max={12}
              step={0.5}
              unit="px"
              defaultValue={0}
              onChange={(blur) => updateColor({ blur })}
            />
          </div>
        )}

        {activeTab === 'watermark' && (
          <div className="panel-section">
            <label className="switch-row">
              <span>啟用浮水印圖層</span>
              <input
                type="checkbox"
                className="studio-switch"
                checked={settings.watermark.enabled}
                onChange={(e) =>
                  onUpdateSettings((prev) => ({
                    ...prev,
                    watermark: { ...prev.watermark, enabled: e.target.checked },
                  }))
                }
              />
            </label>

            <div className="segmented-control full-width">
              <button
                type="button"
                className={settings.watermark.type === 'text' ? 'active' : ''}
                onClick={() =>
                  onUpdateSettings((prev) => ({
                    ...prev,
                    watermark: { ...prev.watermark, enabled: true, type: 'text' },
                  }))
                }
              >
                <Type size={14} /> 文字浮水印
              </button>
              <button
                type="button"
                className={settings.watermark.type === 'image' ? 'active' : ''}
                onClick={() =>
                  onUpdateSettings((prev) => ({
                    ...prev,
                    watermark: { ...prev.watermark, enabled: true, type: 'image' },
                  }))
                }
              >
                <ImageIcon size={14} /> 圖片 Logo
              </button>
            </div>

            {settings.watermark.type === 'text' ? (
              <div className="wm-text-controls">
                <label className="input-box">
                  <span>浮水印文字</span>
                  <input
                    type="text"
                    value={settings.watermark.text}
                    placeholder="輸入版權或品牌文字..."
                    onChange={(e) =>
                      onUpdateSettings((prev) => ({
                        ...prev,
                        watermark: { ...prev.watermark, enabled: true, text: e.target.value },
                      }))
                    }
                  />
                </label>

                <div className="wm-style-row">
                  <label className="color-picker-btn">
                    <span>文字顏色</span>
                    <input
                      type="color"
                      value={settings.watermark.color}
                      onChange={(e) =>
                        onUpdateSettings((prev) => ({
                          ...prev,
                          watermark: { ...prev.watermark, color: e.target.value },
                        }))
                      }
                    />
                  </label>
                  <button
                    type="button"
                    className={`tool-chip compact ${settings.watermark.bold ? 'active' : ''}`}
                    onClick={() =>
                      onUpdateSettings((prev) => ({
                        ...prev,
                        watermark: { ...prev.watermark, bold: !prev.watermark.bold },
                      }))
                    }
                  >
                    <strong>B</strong>
                  </button>
                  <button
                    type="button"
                    className={`tool-chip compact ${settings.watermark.italic ? 'active' : ''}`}
                    onClick={() =>
                      onUpdateSettings((prev) => ({
                        ...prev,
                        watermark: { ...prev.watermark, italic: !prev.watermark.italic },
                      }))
                    }
                  >
                    <em>I</em>
                  </button>
                </div>

                <SliderField
                  label="文字大小"
                  value={settings.watermark.fontSize}
                  min={14}
                  max={120}
                  defaultValue={42}
                  onChange={(fontSize) =>
                    onUpdateSettings((prev) => ({
                      ...prev,
                      watermark: { ...prev.watermark, fontSize },
                    }))
                  }
                />
              </div>
            ) : (
              <div className="wm-image-controls">
                <input
                  ref={wmFileRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      onWatermarkImageSelect(file);
                      e.target.value = '';
                    }
                  }}
                />
                <button
                  type="button"
                  className="btn-secondary full-width"
                  onClick={() => wmFileRef.current?.click()}
                >
                  <Upload size={15} />
                  {settings.watermark.imageName ? '更換 Logo 圖片' : '上傳透明 PNG Logo'}
                </button>
                {settings.watermark.imageUrl && (
                  <div className="wm-preview-box checkerboard">
                    <img src={settings.watermark.imageUrl} alt="Logo" />
                    <span>{settings.watermark.imageName}</span>
                  </div>
                )}
                <SliderField
                  label="Logo 寬度比例"
                  value={settings.watermark.imageScale}
                  min={5}
                  max={60}
                  unit="%"
                  defaultValue={20}
                  onChange={(imageScale) =>
                    onUpdateSettings((prev) => ({
                      ...prev,
                      watermark: { ...prev.watermark, imageScale },
                    }))
                  }
                />
              </div>
            )}

            <SliderField
              label="不透明度"
              value={Math.round(settings.watermark.opacity * 100)}
              min={10}
              max={100}
              unit="%"
              defaultValue={70}
              onChange={(val) =>
                onUpdateSettings((prev) => ({
                  ...prev,
                  watermark: { ...prev.watermark, opacity: val / 100 },
                }))
              }
            />
            <SliderField
              label="旋轉角度"
              value={settings.watermark.rotation}
              min={-45}
              max={45}
              unit="°"
              defaultValue={0}
              onChange={(rotation) =>
                onUpdateSettings((prev) => ({
                  ...prev,
                  watermark: { ...prev.watermark, rotation },
                }))
              }
            />
            <SliderField
              label="邊界安全距離"
              value={settings.watermark.margin}
              min={0}
              max={120}
              unit="px"
              defaultValue={32}
              onChange={(margin) =>
                onUpdateSettings((prev) => ({
                  ...prev,
                  watermark: { ...prev.watermark, margin },
                }))
              }
            />

            <div className="section-title">位置對齊</div>
            <div className="anchor-layout">
              <div className="anchor-grid">
                {WATERMARK_ANCHORS.map((pos) => (
                  <button
                    key={pos}
                    type="button"
                    className={`anchor-cell ${settings.watermark.position === pos ? 'active' : ''}`}
                    title={pos}
                    onClick={() =>
                      onUpdateSettings((prev) => ({
                        ...prev,
                        watermark: { ...prev.watermark, enabled: true, position: pos },
                      }))
                    }
                  >
                    <span className="anchor-dot" />
                  </button>
                ))}
              </div>
              <button
                type="button"
                className={`tile-btn ${settings.watermark.position === 'tile' ? 'active' : ''}`}
                onClick={() =>
                  onUpdateSettings((prev) => ({
                    ...prev,
                    watermark: { ...prev.watermark, enabled: true, position: 'tile' },
                  }))
                }
              >
                <Grid3X3 size={18} />
                <span>滿版平鋪</span>
              </button>
            </div>
          </div>
        )}

        {activeTab === 'export' && (
          <div className="panel-section">
            <div className="section-title">輸出格式</div>
            <div className="format-list">
              {FORMAT_OPTIONS.map((fmt) => (
                <button
                  key={fmt.id}
                  type="button"
                  className={`format-card ${settings.export.format === fmt.id ? 'active' : ''}`}
                  onClick={() =>
                    onUpdateSettings((prev) => ({
                      ...prev,
                      export: { ...prev.export, format: fmt.id },
                    }))
                  }
                >
                  <strong>{fmt.label}</strong>
                  <span>{fmt.desc}</span>
                </button>
              ))}
            </div>

            {settings.export.format !== 'image/png' ? (
              <SliderField
                label="壓縮畫質"
                value={Math.round(settings.export.quality * 100)}
                min={20}
                max={100}
                unit="%"
                defaultValue={90}
                onChange={(val) =>
                  onUpdateSettings((prev) => ({
                    ...prev,
                    export: { ...prev.export, quality: val / 100 },
                  }))
                }
              />
            ) : (
              <div className="info-banner">PNG 為無損格式，將保留最高畫質與透明通道。</div>
            )}

            <label className="input-box">
              <span>輸出檔名前綴</span>
              <input
                type="text"
                value={settings.export.filenamePrefix}
                placeholder="例如 edited_"
                onChange={(e) =>
                  onUpdateSettings((prev) => ({
                    ...prev,
                    export: { ...prev.export, filenamePrefix: e.target.value },
                  }))
                }
              />
            </label>

            {activeItem && (
              <div className="export-summary">
                <div>
                  <span>目前圖片預估大小</span>
                  <strong>{estimatedSize ? formatBytes(estimatedSize) : '計算中...'}</strong>
                </div>
                <div>
                  <span>原始檔案大小</span>
                  <span>{formatBytes(activeItem.fileSize)}</span>
                </div>
                <div>
                  <span>輸出尺寸</span>
                  <span>
                    {outDims.width} × {outDims.height} px
                  </span>
                </div>
              </div>
            )}

            <div className="export-actions">
              <button
                type="button"
                className="btn-secondary full-width"
                disabled={!activeItem || isExporting}
                onClick={onDownloadCurrent}
              >
                <Download size={16} />
                下載目前這張圖片
              </button>
              <button
                type="button"
                className="btn-primary full-width"
                disabled={itemCount === 0 || isExporting}
                onClick={onDownloadBatchZip}
              >
                <FolderArchive size={16} />
                {isExporting && exportProgress
                  ? `打包處理中 (${exportProgress.done}/${exportProgress.total})...`
                  : `批次打包下載 ZIP (${itemCount} 張)`}
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
