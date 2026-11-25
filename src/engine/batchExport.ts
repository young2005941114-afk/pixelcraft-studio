import JSZip from 'jszip';
import {
  buildOutputFilename,
  computeCropRectForAspect,
  exportSingleImageBlob,
  getOrientedDimensions,
} from './imageProcessor';
import type { AspectPreset, EditorSettings, ImageItem, TransformSettings } from '../types/editor';

export function loadImageElement(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('圖片載入失敗'));
    img.src = url;
  });
}

export async function loadImageItemsFromFiles(
  files: FileList | File[],
  aspectPreset: AspectPreset,
  rotate90: TransformSettings['rotate90']
): Promise<ImageItem[]> {
  const validFiles = Array.from(files).filter((file) => file.type.startsWith('image/'));
  const results: ImageItem[] = [];

  for (const file of validFiles) {
    const url = URL.createObjectURL(file);
    try {
      const element = await loadImageElement(url);
      const oriented = getOrientedDimensions(element.naturalWidth, element.naturalHeight, rotate90);
      results.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        name: file.name,
        fileSize: file.size,
        originalWidth: element.naturalWidth,
        originalHeight: element.naturalHeight,
        url,
        element,
        cropRect: computeCropRectForAspect(oriented.width, oriented.height, aspectPreset),
      });
    } catch {
      URL.revokeObjectURL(url);
    }
  }

  return results;
}

export function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Exports all queued images with current settings into a single ZIP archive. */
export async function exportBatchZip(
  items: ImageItem[],
  settings: EditorSettings,
  watermarkImg: HTMLImageElement | null,
  onProgress?: (completed: number, total: number) => void
): Promise<Blob> {
  const zip = new JSZip();
  const usedNames = new Map<string, number>();

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const blob = await exportSingleImageBlob(item, settings, watermarkImg);
    let filename = buildOutputFilename(
      item.name,
      settings.export.filenamePrefix,
      settings.export.format
    );

    const count = usedNames.get(filename) ?? 0;
    if (count > 0) {
      filename = filename.replace(/(\.[^.]+)$/, `_${count + 1}$1`);
    }
    usedNames.set(filename, count + 1);

    zip.file(filename, blob);
    onProgress?.(i + 1, items.length);
  }

  return zip.generateAsync({ type: 'blob' });
}
