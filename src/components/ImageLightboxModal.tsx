import React, { useState } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw, Download, Maximize2 } from 'lucide-react';

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
  onClose
}) => {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);

  if (!isOpen || !imageUrl) return null;

  const handleZoomIn = () => setScale((s) => Math.min(s + 0.25, 3));
  const handleZoomOut = () => setScale((s) => Math.max(s - 0.25, 0.5));
  const handleRotate = () => setRotation((r) => (r + 90) % 360);
  const handleReset = () => {
    setScale(1);
    setRotation(0);
  };

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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative max-w-4xl w-full bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-2">
            <Maximize2 className="w-4 h-4 text-indigo-400" />
            <h3 className="font-semibold text-slate-100 text-sm sm:text-base">{title}</h3>
          </div>
          <div className="flex items-center gap-2">
            {/* Control buttons */}
            <div className="flex items-center bg-slate-800 rounded-lg p-1 border border-slate-700/60">
              <button
                type="button"
                onClick={handleZoomIn}
                className="p-1.5 hover:bg-slate-700 rounded text-slate-300 hover:text-white transition-colors"
                title="Phóng to"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleZoomOut}
                className="p-1.5 hover:bg-slate-700 rounded text-slate-300 hover:text-white transition-colors"
                title="Thu nhỏ"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleRotate}
                className="p-1.5 hover:bg-slate-700 rounded text-slate-300 hover:text-white transition-colors"
                title="Xoay hình"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="px-2 py-1 text-xs hover:bg-slate-700 rounded text-slate-300 hover:text-white transition-colors font-mono"
                title="Khôi phục kích thước ban đầu"
              >
                {Math.round(scale * 100)}%
              </button>
              <button
                type="button"
                onClick={handleDownload}
                className="p-1.5 hover:bg-slate-700 rounded text-slate-300 hover:text-white transition-colors"
                title="Tải ảnh về máy"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-slate-700/60 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Image viewport */}
        <div className="flex-1 overflow-auto p-6 flex items-center justify-center bg-slate-950/60 min-h-[300px]">
          <div
            style={{
              transform: `scale(${scale}) rotate(${rotation}deg)`,
              transition: 'transform 0.15s ease-out'
            }}
            className="flex items-center justify-center"
          >
            <img
              src={imageUrl}
              alt={imageCaption || 'Minh họa câu hỏi'}
              className="max-h-[65vh] max-w-full rounded-lg shadow-lg border border-slate-800 object-contain select-none"
            />
          </div>
        </div>

        {/* Footer with caption */}
        {imageCaption && (
          <div className="px-5 py-3 bg-slate-950/90 border-t border-slate-800/80 text-xs text-slate-300 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-indigo-400">Chú thích hình ảnh:</span>
              <span className="italic">{imageCaption}</span>
            </div>
            <span className="text-[11px] text-slate-500 font-mono">Học liệu trích xuất</span>
          </div>
        )}
      </div>
    </div>
  );
};
