import { Download, FolderArchive, Layers, RotateCcw, Sparkles } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { CanvasStage, type StageMode } from './components/CanvasStage';
import { FilmstripSidebar } from './components/FilmstripSidebar';
import { InspectorPanel, type InspectorTab } from './components/InspectorPanel';
import {
  exportBatchZip,
  loadImageElement,
  loadImageItemsFromFiles,
  triggerBlobDownload,
} from './engine/batchExport';
import {
  buildOutputFilename,
  computeCropRectForAspect,
  exportSingleImageBlob,
  getOrientedDimensions,
} from './engine/imageProcessor';
import { generateSampleFiles } from './engine/sampleImages';
import {
  DEFAULT_EDITOR_SETTINGS,
  type AspectPreset,
  type CropRect,
  type EditorSettings,
  type ImageItem,
} from './types/editor';

export function App() {
  const [items, setItems] = useState<ImageItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [settings, setSettings] = useState<EditorSettings>(DEFAULT_EDITOR_SETTINGS);
  const [activeTab, setActiveTab] = useState<InspectorTab>('crop');
  const [stageMode, setStageMode] = useState<StageMode>('preview');
  const [watermarkImg, setWatermarkImg] = useState<HTMLImageElement | null>(null);
  const [estimateRecord, setEstimateRecord] = useState<{ key: string; size: number } | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<{ done: number; total: number } | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const activeItem = useMemo(
    () => items.find((it) => it.id === activeId) ?? null,
    [items, activeId]
  );

  const estimateKey = useMemo(
    () =>
      activeItem
        ? JSON.stringify({
            id: activeItem.id,
            crop: activeItem.cropRect,
            settings,
            wm: watermarkImg?.src ?? null,
          })
        : '',
    [activeItem, settings, watermarkImg]
  );

  const estimatedSize =
    activeTab === 'export' && activeItem && estimateRecord?.key === estimateKey
      ? estimateRecord.size
      : null;

  const showToast = useCallback((msg: string) => {
    setToast(msg);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(timer);
  }, [toast]);

  // Estimate exported file size when user views Export tab
  useEffect(() => {
    if (activeTab !== 'export' || !activeItem) return;

    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const blob = await exportSingleImageBlob(activeItem, settings, watermarkImg);
        if (!cancelled) {
          setEstimateRecord({ key: estimateKey, size: blob.size });
        }
      } catch {
        // Ignore transient estimation errors
      }
    }, 220);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [activeTab, activeItem, settings, watermarkImg, estimateKey]);

  const handleAddFiles = useCallback(
    async (files: FileList | File[]) => {
      const loaded = await loadImageItemsFromFiles(
        files,
        settings.transform.aspectPreset,
        settings.transform.rotate90
      );
      if (loaded.length === 0) {
        showToast('未偵測到有效的圖片檔案');
        return;
      }

      setItems((prev) => [...prev, ...loaded]);
      setActiveId((prev) => prev ?? loaded[0].id);
      showToast(`已加入 ${loaded.length} 張圖片`);
    },
    [settings.transform.aspectPreset, settings.transform.rotate90, showToast]
  );

  const handleLoadSamples = useCallback(async () => {
    const sampleFiles = await generateSampleFiles();
    await handleAddFiles(sampleFiles);
  }, [handleAddFiles]);

  const handleRemoveItem = useCallback(
    (id: string) => {
      setItems((prev) => {
        const target = prev.find((it) => it.id === id);
        if (target) URL.revokeObjectURL(target.url);
        const next = prev.filter((it) => it.id !== id);
        if (activeId === id) {
          setActiveId(next[0]?.id ?? null);
        }
        return next;
      });
    },
    [activeId]
  );

  const handleClearAll = useCallback(() => {
    setItems((prev) => {
      prev.forEach((it) => URL.revokeObjectURL(it.url));
      return [];
    });
    setActiveId(null);
  }, []);

  const handleCropChange = useCallback(
    (rect: CropRect) => {
      if (!activeId) return;
      setItems((prev) =>
        prev.map((item) => (item.id === activeId ? { ...item, cropRect: rect } : item))
      );
    },
    [activeId]
  );

  const handleAspectPresetChange = useCallback(
    (preset: AspectPreset) => {
      setSettings((prev) => ({
        ...prev,
        transform: { ...prev.transform, aspectPreset: preset },
      }));

      if (!activeId) return;
      setItems((prev) =>
        prev.map((item) => {
          if (item.id !== activeId) return item;
          const oriented = getOrientedDimensions(
            item.originalWidth,
            item.originalHeight,
            settings.transform.rotate90
          );
          return {
            ...item,
            cropRect: computeCropRectForAspect(oriented.width, oriented.height, preset),
          };
        })
      );
    },
    [activeId, settings.transform.rotate90]
  );

  const handleApplyCropToAll = useCallback(() => {
    const preset = settings.transform.aspectPreset;
    setItems((prev) =>
      prev.map((item) => {
        const oriented = getOrientedDimensions(
          item.originalWidth,
          item.originalHeight,
          settings.transform.rotate90
        );
        return {
          ...item,
          cropRect: computeCropRectForAspect(oriented.width, oriented.height, preset),
        };
      })
    );
    showToast('已將裁切比例套用至所有圖片');
  }, [settings.transform.aspectPreset, settings.transform.rotate90, showToast]);

  const handleResetCrop = useCallback(() => {
    handleAspectPresetChange('free');
    if (!activeId) return;
    setItems((prev) =>
      prev.map((item) =>
        item.id === activeId ? { ...item, cropRect: { x: 0, y: 0, width: 1, height: 1 } } : item
      )
    );
  }, [activeId, handleAspectPresetChange]);

  const handleWatermarkImageSelect = useCallback(
    async (file: File) => {
      const url = URL.createObjectURL(file);
      try {
        const img = await loadImageElement(url);
        setWatermarkImg((prev) => {
          if (prev?.src.startsWith('blob:')) URL.revokeObjectURL(prev.src);
          return img;
        });
        setSettings((prev) => ({
          ...prev,
          watermark: {
            ...prev.watermark,
            enabled: true,
            type: 'image',
            imageUrl: url,
            imageName: file.name,
          },
        }));
      } catch {
        URL.revokeObjectURL(url);
        showToast('Logo 圖片載入失敗');
      }
    },
    [showToast]
  );

  const handleResetAllSettings = useCallback(() => {
    setSettings(DEFAULT_EDITOR_SETTINGS);
    setItems((prev) =>
      prev.map((item) => ({ ...item, cropRect: { x: 0, y: 0, width: 1, height: 1 } }))
    );
    showToast('已重設所有編輯參數');
  }, [showToast]);

  const handleDownloadCurrent = useCallback(async () => {
    if (!activeItem || isExporting) return;
    setIsExporting(true);
    try {
      const blob = await exportSingleImageBlob(activeItem, settings, watermarkImg);
      const filename = buildOutputFilename(
        activeItem.name,
        settings.export.filenamePrefix,
        settings.export.format
      );
      triggerBlobDownload(blob, filename);
      showToast(`已下載 ${filename}`);
    } finally {
      setIsExporting(false);
    }
  }, [activeItem, isExporting, settings, watermarkImg, showToast]);

  const handleDownloadBatchZip = useCallback(async () => {
    if (items.length === 0 || isExporting) return;
    setIsExporting(true);
    setExportProgress({ done: 0, total: items.length });
    try {
      const zipBlob = await exportBatchZip(items, settings, watermarkImg, (done, total) => {
        setExportProgress({ done, total });
      });
      triggerBlobDownload(zipBlob, `pixelcraft-batch-${items.length}.zip`);
      showToast(`已成功打包下載 ${items.length} 張圖片`);
    } finally {
      setIsExporting(false);
      setExportProgress(null);
    }
  }, [items, isExporting, settings, watermarkImg, showToast]);

  return (
    <div className="studio-shell">
      <header className="studio-topbar">
        <div className="brand">
          <div className="brand-badge">
            <Layers size={18} />
          </div>
          <div>
            <h1>PixelCraft Studio</h1>
            <span>純前端批次影像裁切・浮水印・調色工具</span>
          </div>
        </div>

        <div className="topbar-actions">
          {items.length === 0 && (
            <button type="button" className="btn-secondary" onClick={handleLoadSamples}>
              <Sparkles size={15} />
              載入範例圖片
            </button>
          )}
          <button
            type="button"
            className="btn-ghost"
            onClick={handleResetAllSettings}
            title="重設全部編輯參數"
          >
            <RotateCcw size={15} />
            重設參數
          </button>
          <button
            type="button"
            className="btn-secondary"
            disabled={!activeItem || isExporting}
            onClick={handleDownloadCurrent}
          >
            <Download size={15} />
            匯出單張
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={items.length === 0 || isExporting}
            onClick={handleDownloadBatchZip}
          >
            <FolderArchive size={15} />
            {isExporting && exportProgress
              ? `打包中 ${exportProgress.done}/${exportProgress.total}`
              : `批次下載 ZIP (${items.length})`}
          </button>
        </div>
      </header>

      <div className="studio-workspace">
        <FilmstripSidebar
          items={items}
          activeId={activeId}
          settings={settings}
          onSelect={setActiveId}
          onRemove={handleRemoveItem}
          onClearAll={handleClearAll}
          onAddFiles={handleAddFiles}
          onLoadSamples={handleLoadSamples}
        />

        <CanvasStage
          activeItem={activeItem}
          settings={settings}
          watermarkImg={watermarkImg}
          stageMode={stageMode}
          onStageModeChange={setStageMode}
          onCropChange={handleCropChange}
          onAddFiles={handleAddFiles}
          onLoadSamples={handleLoadSamples}
        />

        <InspectorPanel
          activeTab={activeTab}
          onTabChange={setActiveTab}
          activeItem={activeItem}
          itemCount={items.length}
          settings={settings}
          estimatedSize={estimatedSize}
          isExporting={isExporting}
          exportProgress={exportProgress}
          onUpdateSettings={setSettings}
          onAspectPresetChange={handleAspectPresetChange}
          onApplyCropToAll={handleApplyCropToAll}
          onResetCrop={handleResetCrop}
          onEnterCropMode={() => setStageMode('crop')}
          onWatermarkImageSelect={handleWatermarkImageSelect}
          onDownloadCurrent={handleDownloadCurrent}
          onDownloadBatchZip={handleDownloadBatchZip}
        />
      </div>

      {toast && <div className="studio-toast">{toast}</div>}
    </div>
  );
}

export default App;
