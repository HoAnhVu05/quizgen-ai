import React, { useEffect } from 'react';
import { ArrowLeft, X, Download, ZoomIn, ZoomOut, RotateCcw, Move } from 'lucide-react';
import { usePinchZoom } from '../../hooks/usePinchZoom';
import { downloadFileSafely } from '../../utils/fileDownloadHelper';

export interface PreviewMedia {
  url: string;
  name: string;
}

interface MediaLightboxModalProps {
  previewMedia: PreviewMedia | null;
  onClose: () => void;
}

export const MediaLightboxModal: React.FC<MediaLightboxModalProps> = ({
  previewMedia,
  onClose,
}) => {
  const {
    scale,
    containerRef,
    zoomIn,
    zoomOut,
    rotate,
    reset,
    transformStyle,
    bind,
  } = usePinchZoom({ minScale: 0.5, maxScale: 5, step: 0.25 });

  // Reset zoom on open/close
  useEffect(() => {
    if (previewMedia) {
      reset();
    }
  }, [previewMedia, reset]);

  // Handle escape key
  useEffect(() => {
    if (!previewMedia) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewMedia, onClose]);

  if (!previewMedia) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-md animate-fadeIn select-none"
      onClick={onClose}
    >
      {/* Mobile-Safe Fixed Top Header */}
      <div
        className="fixed top-0 left-0 right-0 z-50 px-3 py-3 sm:px-6 bg-gradient-to-b from-black/90 via-black/60 to-transparent flex items-center justify-between"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-white/20 hover:bg-white/30 active:bg-white/40 text-white font-medium text-xs backdrop-blur-sm transition-all"
          title="Quay lại"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Quay lại</span>
        </button>

        <span className="text-xs text-white/90 font-medium truncate max-w-[150px] sm:max-w-md mx-2 text-center">
          {previewMedia.name}
        </span>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="flex items-center bg-black/50 border border-white/20 rounded-full p-0.5 sm:p-1 backdrop-blur-sm">
            <button
              type="button"
              onClick={zoomIn}
              className="p-1 sm:p-1.5 hover:bg-white/20 rounded-full text-white/90 hover:text-white transition-colors"
              title="Phóng to"
            >
              <ZoomIn className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
            <button
              type="button"
              onClick={zoomOut}
              className="p-1 sm:p-1.5 hover:bg-white/20 rounded-full text-white/90 hover:text-white transition-colors"
              title="Thu nhỏ"
            >
              <ZoomOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
            <button
              type="button"
              onClick={rotate}
              className="p-1 sm:p-1.5 hover:bg-white/20 rounded-full text-white/90 hover:text-white transition-colors"
              title="Xoay hình"
            >
              <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
            <button
              type="button"
              onClick={reset}
              className="px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs text-white/80 hover:text-white font-mono"
              title="Khôi phục kích thước ban đầu"
            >
              {Math.round(scale * 100)}%
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/20 hover:bg-white/30 active:bg-white/40 text-white flex items-center justify-center transition-all"
            title="Đóng xem ảnh"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>

      {/* Main Image Viewport with Touch/Pinch Gestures */}
      <div
        ref={containerRef}
        className="relative w-full h-[78vh] sm:h-[82vh] flex flex-col items-center justify-center my-auto overflow-hidden touch-none"
        onClick={(e) => e.stopPropagation()}
        {...bind}
      >
        <div style={transformStyle} className="flex items-center justify-center pointer-events-none">
          <img
            src={previewMedia.url}
            alt={previewMedia.name}
            draggable={false}
            className="max-w-[92vw] max-h-[72vh] sm:max-h-[78vh] object-contain rounded-xl shadow-2xl border border-white/10 select-none pointer-events-none"
          />
        </div>

        {/* Floating Mobile Tip */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[10px] sm:text-xs text-white/80 flex items-center gap-1.5 pointer-events-none shadow-lg whitespace-nowrap">
          <Move className="w-3 h-3 text-teal-400" />
          <span>Chụm 2 ngón thu/phóng • Lăn chuột phóng to tại con trỏ • Kéo rê di chuyển</span>
        </div>
      </div>

      {/* Floating Bottom Download Pill */}
      <div
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 sm:gap-4 bg-slate-900/90 text-white px-4 py-2 rounded-full text-xs shadow-2xl backdrop-blur-md border border-white/15"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="font-medium truncate max-w-[120px] sm:max-w-sm">{previewMedia.name}</span>
        <div className="h-3 w-[1px] bg-white/20 mx-1" />
        <button
          type="button"
          onClick={() => downloadFileSafely(previewMedia.name, previewMedia.url)}
          className="flex items-center gap-1.5 text-teal-400 hover:text-teal-300 font-bold cursor-pointer hover:underline"
        >
          <Download className="w-4 h-4" />
          <span>Tải về</span>
        </button>
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-1 text-rose-300 hover:text-rose-200 font-semibold px-2 py-0.5 rounded hover:bg-white/10"
          title="Đóng xem ảnh"
        >
          <X className="w-3.5 h-3.5" />
          <span>Đóng</span>
        </button>
      </div>
    </div>
  );
};
