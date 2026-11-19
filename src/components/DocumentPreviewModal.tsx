import React, { useState } from 'react';
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Download,
  ExternalLink,
  FileText,
  FileSpreadsheet,
  File as FileIcon,
  Eye,
  ArrowLeft,
  Share2,
} from 'lucide-react';

interface DocumentPreviewModalProps {
  isOpen: boolean;
  fileUrl: string;
  fileName: string;
  fileSize?: string;
  fileType?: string;
  onClose: () => void;
  onDownload: () => void;
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  isOpen,
  fileUrl,
  fileName,
  fileSize,
  fileType,
  onClose,
  onDownload,
}) => {
  const [zoomScale, setZoomScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isLiveViewerOpen, setIsLiveViewerOpen] = useState(false);

  if (!isOpen || !fileUrl) return null;

  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  const isImage =
    (fileType || '').startsWith('image/') ||
    ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(ext);
  const isVideo =
    (fileType || '').startsWith('video/') ||
    ['mp4', 'webm', 'ogg', 'mov'].includes(ext);
  const isAudio =
    (fileType || '').startsWith('audio/') ||
    ['mp3', 'wav', 'ogg', 'webm', 'm4a'].includes(ext);
  const isPdf = ext === 'pdf' || (fileType || '').includes('pdf');
  const isWord = ['docx', 'doc'].includes(ext);
  const isExcel = ['xlsx', 'xls', 'csv'].includes(ext);
  const isPpt = ['pptx', 'ppt'].includes(ext);

  const fullUrl = fileUrl.startsWith('http')
    ? fileUrl
    : `${window.location.origin}${fileUrl}`;
  const googleViewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(
    fullUrl
  )}&embedded=true`;

  const handleZoomIn = () => setZoomScale((s) => Math.min(s + 0.25, 3));
  const handleZoomOut = () => setZoomScale((s) => Math.max(s - 0.25, 0.5));
  const handleRotate = () => setRotation((r) => (r + 90) % 360);
  const handleResetZoom = () => {
    setZoomScale(1);
    setRotation(0);
  };

  // ── 1. IMAGE LIGHTBOX (Ultra-clean Floating View) ──────────────────────────
  if (isImage) {
    return (
      <div
        role="dialog"
        aria-modal="true"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none"
        onClick={onClose}
      >
        <div
          className="relative max-w-5xl max-h-[90vh] flex flex-col items-center"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute -top-12 right-0 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition-colors backdrop-blur-sm"
            title="Đóng"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Floating Image */}
          <div className="overflow-auto max-h-[78vh] flex items-center justify-center p-2">
            <img
              src={fileUrl}
              alt={fileName}
              style={{
                transform: `scale(${zoomScale}) rotate(${rotation}deg)`,
                transition: 'transform 0.15s ease-out',
              }}
              className="max-w-full max-h-[74vh] object-contain rounded-xl shadow-2xl select-none"
            />
          </div>

          {/* Sleek Floating Glass Pill Toolbar */}
          <div className="mt-3 flex items-center gap-2 bg-slate-900/80 backdrop-blur-md border border-white/10 text-white px-4 py-2 rounded-full shadow-xl text-xs">
            <span className="font-medium truncate max-w-[180px] sm:max-w-xs text-slate-200 pr-2 border-r border-white/10">
              {fileName}
            </span>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleZoomOut}
                className="p-1 hover:bg-white/15 rounded-md transition-colors cursor-pointer"
                title="Thu nhỏ"
              >
                <ZoomOut className="w-3.5 h-3.5 text-slate-300" />
              </button>
              <button
                type="button"
                onClick={handleResetZoom}
                className="px-1.5 py-0.5 text-[10px] font-mono hover:bg-white/15 rounded text-slate-300 cursor-pointer"
                title="Đặt lại 100%"
              >
                {Math.round(zoomScale * 100)}%
              </button>
              <button
                type="button"
                onClick={handleZoomIn}
                className="p-1 hover:bg-white/15 rounded-md transition-colors cursor-pointer"
                title="Phóng to"
              >
                <ZoomIn className="w-3.5 h-3.5 text-slate-300" />
              </button>
              <button
                type="button"
                onClick={handleRotate}
                className="p-1 hover:bg-white/15 rounded-md transition-colors cursor-pointer ml-1"
                title="Xoay 90°"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-300" />
              </button>
            </div>

            <div className="h-3 w-[1px] bg-white/20 mx-1" />

            <button
              type="button"
              onClick={onDownload}
              className="flex items-center gap-1 text-teal-400 hover:text-teal-300 font-semibold px-2 py-1 rounded-md hover:bg-white/10 transition-colors cursor-pointer"
              title="Tải ảnh về máy"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Tải về</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── 2. PDF VIEWER (Direct clean embedded reader) ──────────────────────────
  if (isPdf) {
    return (
      <div
        role="dialog"
        aria-modal="true"
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm animate-fade-in select-none"
        onClick={onClose}
      >
        <div
          className="relative max-w-5xl w-full h-[90vh] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-scale-up"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="h-12 px-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0 pr-3">
              <div className="w-6 h-6 rounded-md bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center shrink-0">
                <FileText className="w-3.5 h-3.5" />
              </div>
              <span className="font-semibold text-xs text-slate-800 truncate max-w-md">
                {fileName}
              </span>
              {fileSize && (
                <span className="text-[10px] text-slate-400 font-mono">
                  ({fileSize})
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <a
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                title="Mở tab mới"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
              <button
                type="button"
                onClick={onDownload}
                className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                title="Tải tệp về máy"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Tải về</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                title="Đóng"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 w-full bg-slate-100">
            <iframe
              src={`${fileUrl}#toolbar=0`}
              title={fileName}
              className="w-full h-full border-0 bg-white"
            />
          </div>
        </div>
      </div>
    );
  }

  // ── 3. EMBEDDED GOOGLE DOCS / OFFICE VIEWER (When user clicked "Xem trực tuyến")
  if (isLiveViewerOpen) {
    return (
      <div
        role="dialog"
        aria-modal="true"
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm animate-fade-in select-none"
        onClick={onClose}
      >
        <div
          className="relative max-w-5xl w-full h-[90vh] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-scale-up"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="h-12 px-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0 pr-3">
              <button
                type="button"
                onClick={() => setIsLiveViewerOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors flex items-center gap-1 text-xs font-medium cursor-pointer"
                title="Quay lại thẻ tệp"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Quay lại</span>
              </button>
              <span className="text-slate-300">|</span>
              <span className="font-semibold text-xs text-slate-800 truncate max-w-md">
                {fileName}
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <a
                href={googleViewerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                title="Mở toàn màn hình trong tab mới"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
              <button
                type="button"
                onClick={onDownload}
                className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                title="Tải tệp về máy"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Tải về</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                title="Đóng"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 w-full bg-slate-100">
            <iframe
              src={googleViewerUrl}
              title={fileName}
              className="w-full h-full border-0 bg-white"
            />
          </div>
        </div>
      </div>
    );
  }

  // ── 4. AIRY & LUXURIOUS QUICKLOOK CARD (Modern Apple / Linear Minimalist) ──
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs animate-fade-in select-none"
      onClick={onClose}
    >
      <div
        className="relative max-w-md w-full bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.18)] border border-slate-100 p-6 sm:p-7 text-center overflow-hidden animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
          title="Đóng"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Floating Minimalist Document Badge */}
        <div className="pt-2 flex justify-center">
          <div
            className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-md transition-transform ${
              isWord
                ? 'bg-blue-50 text-blue-600 border border-blue-100'
                : isExcel
                ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                : isPpt
                ? 'bg-amber-50 text-amber-600 border border-amber-100'
                : 'bg-slate-50 text-slate-600 border border-slate-200'
            }`}
          >
            {isWord ? (
              <FileText className="w-8 h-8" />
            ) : isExcel ? (
              <FileSpreadsheet className="w-8 h-8" />
            ) : (
              <FileIcon className="w-8 h-8" />
            )}
          </div>
        </div>

        {/* Document Title & Metadata */}
        <div className="mt-4 space-y-1">
          <h3 className="font-bold text-sm text-slate-900 truncate px-2" title={fileName}>
            {fileName}
          </h3>
          <p className="text-[11px] text-slate-400 font-medium flex items-center justify-center gap-1.5">
            {fileSize && (
              <span className="font-mono bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-semibold text-[10px]">
                {fileSize}
              </span>
            )}
            <span>
              {isWord
                ? 'Tài liệu Microsoft Word'
                : isExcel
                ? 'Bảng tính Microsoft Excel'
                : isPpt
                ? 'Bản trình chiếu PowerPoint'
                : isVideo
                ? 'Tệp video'
                : isAudio
                ? 'Tệp âm thanh'
                : 'Tài liệu học thuật'}
            </span>
          </p>
        </div>

        {/* Minimalist Info Pill */}
        <div className="mt-5 p-3 rounded-xl bg-slate-50 border border-slate-100 text-left text-[11px] text-slate-600 space-y-1">
          <p className="font-semibold text-slate-700">Tùy chọn xem &amp; tải tệp:</p>
          <p className="text-slate-500 leading-relaxed">
            Tệp được bảo toàn cấu trúc chuẩn. Bạn có thể mở xem trực tuyến bằng Google Docs hoặc tải về máy để chỉnh sửa.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex items-center gap-2">
          {/* Xem trực tuyến */}
          <button
            type="button"
            onClick={() => setIsLiveViewerOpen(true)}
            className="flex-1 py-2.5 px-3 rounded-xl bg-teal-600 hover:bg-teal-700 active:scale-95 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
            title="Xem trực tiếp trên trình duyệt"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Xem trực tuyến</span>
          </button>

          {/* Tải về */}
          <button
            type="button"
            onClick={onDownload}
            className="flex-1 py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-95 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
            title="Tải tệp về máy"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Tải về máy</span>
          </button>

          {/* Mở tab mới */}
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
            title="Mở tab mới"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
};
