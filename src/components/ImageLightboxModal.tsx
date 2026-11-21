import React, { useEffect } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw, Download, Maximize2, Move } from 'lucide-react';
import { usePinchZoom } from '../hooks/usePinchZoom';

interface ImageLightboxModalProps {
  isOpen: boolean;
  imageUrl: string;
  imageCaption?: string;
  title?: string;
  onClose: () => void;
}

export const ImageLightboxModal: React.FC<ImageLightboxModalProps> = ({
  isOpen,
  imageUrl,
  imageCaption,
  title = 'Minh chứng Hình ảnh & Sơ đồ Câu hỏi',
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

  // ── Mobile Back Gesture & History Popstate Handler ───────────────────────
  useEffect(() => {
    if (!isOpen) return;
    try {
      window.history.pushState({ modal: 'lightbox-preview' }, '');
    } catch {}

    const handlePopState = () => {
      onClose();
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isOpen, onClose]);

  // Reset zoom state whenever modal is opened
  useEffect(() => {
    if (isOpen) {
      reset();
    }
  }, [isOpen, reset]);

  const handleSafeClose = () => {
    try {
      if (window.history.state?.modal === 'lightbox-preview') {
        window.history.back();
        return;
      }
    } catch {}
    onClose();
  };

  if (!isOpen || !imageUrl) return null;

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `quizgen-image-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4 animate-in fade-in duration-200 select-none"
      onClick={handleSafeClose}
    >
      <div
        className="relative max-w-4xl w-full bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 sm:px-5 py-3 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-2 truncate mr-2">
            <Maximize2 className="w-4 h-4 text-teal-400 shrink-0" />
            <h3 className="font-semibold text-slate-100 text-xs sm:text-base truncate">{title}</h3>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Control buttons */}
            <div className="flex items-center bg-slate-800 rounded-lg p-0.5 sm:p-1 border border-slate-700/60">
              <button
                type="button"
                onClick={zoomIn}
                className="p-1 sm:p-1.5 hover:bg-slate-700 rounded text-slate-300 hover:text-white transition-colors"
                title="Phóng to"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={zoomOut}
                className="p-1 sm:p-1.5 hover:bg-slate-700 rounded text-slate-300 hover:text-white transition-colors"
                title="Thu nhỏ"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={rotate}
                className="p-1 sm:p-1.5 hover:bg-slate-700 rounded text-slate-300 hover:text-white transition-colors"
                title="Xoay hình"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={reset}
                className="px-1.5 sm:px-2 py-0.5 sm:py-1 text-[11px] sm:text-xs hover:bg-slate-700 rounded text-slate-300 hover:text-white transition-colors font-mono"
                title="Khôi phục kích thước ban đầu (100%)"
              >
                {Math.round(scale * 100)}%
              </button>
              <button
                type="button"
                onClick={handleDownload}
                className="p-1 sm:p-1.5 hover:bg-slate-700 rounded text-slate-300 hover:text-white transition-colors"
                title="Tải ảnh về máy"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={handleSafeClose}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-slate-700/60 transition-colors"
              title="Đóng (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Image viewport with Touch/Pinch Gestures */}
        <div
          ref={containerRef}
          className="relative flex-1 overflow-hidden p-2 sm:p-6 flex items-center justify-center bg-slate-950/70 min-h-[300px] touch-none cursor-grab active:cursor-grabbing"
          {...bind}
        >
          <div style={transformStyle} className="flex items-center justify-center pointer-events-none">
            <img
              src={imageUrl}
              alt={imageCaption || 'Minh họa câu hỏi'}
              draggable={false}
              className="max-h-[62vh] sm:max-h-[68vh] max-w-full rounded-lg shadow-2xl border border-slate-800 object-contain select-none pointer-events-none"
            />
          </div>

          {/* Floating Mobile Tip */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-slate-900/80 backdrop-blur-md border border-white/10 text-[10px] sm:text-xs text-slate-300 flex items-center gap-1.5 pointer-events-none shadow-lg">
            <Move className="w-3 h-3 text-teal-400" />
            <span>Chụm 2 ngón thu/phóng • Lăn chuột phóng to tại con trỏ • Kéo rê di chuyển</span>
          </div>
        </div>

        {/* Footer with caption */}
        {imageCaption && (
          <div className="px-4 sm:px-5 py-2.5 bg-slate-950/90 border-t border-slate-800/80 text-xs text-slate-300 flex items-center justify-between">
            <div className="flex items-center gap-2 truncate mr-2">
              <span className="font-semibold text-teal-400 shrink-0">Chú thích:</span>
              <span className="italic truncate">{imageCaption}</span>
            </div>
            <span className="text-[10px] sm:text-[11px] text-slate-500 font-mono shrink-0">Học liệu trích xuất</span>
          </div>
        )}
      </div>
    </div>
  );
};
