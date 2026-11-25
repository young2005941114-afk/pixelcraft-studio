import { ImagePlus, Sparkles, Trash2, X } from 'lucide-react';
import { useRef, useState } from 'react';
import {
  computeOutputDimensions,
  formatBytes,
  getOrientedDimensions,
} from '../engine/imageProcessor';
import type { EditorSettings, ImageItem } from '../types/editor';

interface FilmstripSidebarProps {
  items: ImageItem[];
  activeId: string | null;
  settings: EditorSettings;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  onClearAll: () => void;
  onAddFiles: (files: FileList | File[]) => void;
  onLoadSamples: () => void;
}

export function FilmstripSidebar({
  items,
  activeId,
  settings,
  onSelect,
  onRemove,
  onClearAll,
  onAddFiles,
  onLoadSamples,
}: FilmstripSidebarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      onAddFiles(e.dataTransfer.files);
    }
  };

  return (
    <aside className="sidebar-left">
      <div className="sidebar-header">
        <span>圖片佇列 ({items.length})</span>
        {items.length > 0 && (
          <button type="button" className="text-btn danger" onClick={onClearAll} title="清空佇列">
            <Trash2 size={13} /> 清空
          </button>
        )}
      </div>

      <div
        className={`dropzone-mini ${isDragging ? 'dragging' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
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
        <ImagePlus size={18} />
        <span>點擊或拖放加入圖片</span>
      </div>

      {items.length === 0 ? (
        <div className="sidebar-empty">
          <p>支援 PNG、JPG、WebP 等格式，所有運算皆於瀏覽器本地完成。</p>
          <button type="button" className="btn-secondary full-width" onClick={onLoadSamples}>
            <Sparkles size={15} />
            載入 3 張範例圖片
          </button>
        </div>
      ) : (
        <div className="filmstrip-list">
          {items.map((item) => {
            const oriented = getOrientedDimensions(
              item.originalWidth,
              item.originalHeight,
              settings.transform.rotate90
            );
            const croppedW = oriented.width * item.cropRect.width;
            const croppedH = oriented.height * item.cropRect.height;
            const out = computeOutputDimensions(croppedW, croppedH, settings.resize);
            const isActive = item.id === activeId;

            return (
              <div
                key={item.id}
                className={`filmstrip-card ${isActive ? 'active' : ''}`}
                onClick={() => onSelect(item.id)}
              >
                <img src={item.url} alt={item.name} className="filmstrip-thumb" />
                <div className="filmstrip-meta">
                  <div className="filmstrip-name" title={item.name}>
                    {item.name}
                  </div>
                  <div className="filmstrip-dims">
                    {out.width} × {out.height} · {formatBytes(item.fileSize)}
                  </div>
                </div>
                <button
                  type="button"
                  className="filmstrip-remove"
                  title="移除圖片"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(item.id);
                  }}
                >
                  <X size={13} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </aside>
  );
}
