import React, { useState, useEffect } from 'react';
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Download,
  ExternalLink,
  FileText,
  FileSpreadsheet,
  FileCode,
  File as FileIcon,
  Maximize2,
  Check,
  Eye,
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
  const [textContent, setTextContent] = useState<string | null>(null);
  const [loadingText, setLoadingText] = useState(false);

  useEffect(() => {
    setZoomScale(1);
    setRotation(0);
    setTextContent(null);

    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    const isText = ['txt', 'json', 'csv', 'md', 'log', 'py', 'js', 'html', 'css', 'sql'].includes(ext);

    if (isOpen && isText && fileUrl) {
      setLoadingText(true);
      fetch(fileUrl)
        .then((r) => r.text())
        .then((t) => {
          setTextContent(t);
          setLoadingText(false);
        })
        .catch(() => {
          setLoadingText(false);
        });
    }
  }, [isOpen, fileUrl, fileName]);

  if (!isOpen || !fileUrl) return null;

  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  const isImage = (fileType || '').startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(ext);
  const isVideo = (fileType || '').startsWith('video/') || ['mp4', 'webm', 'ogg', 'mov'].includes(ext);
  const isAudio = (fileType || '').startsWith('audio/') || ['mp3', 'wav', 'ogg', 'webm', 'm4a'].includes(ext);
  const isPdf = ext === 'pdf' || (fileType || '').includes('pdf');
  const isWord = ['doc', 'docx'].includes(ext);
  const isExcel = ['xls', 'xlsx'].includes(ext);
  const isPpt = ['ppt', 'pptx'].includes(ext);
  const isOffice = isWord || isExcel || isPpt;

  const handleZoomIn = () => setZoomScale((s) => Math.min(s + 0.25, 3));
  const handleZoomOut = () => setZoomScale((s) => Math.max(s - 0.25, 0.5));
  const handleRotate = () => setRotation((r) => (r + 90) % 360);
  const handleReset = () => {
    setZoomScale(1);
    setRotation(0);
  };

  // Convert relative url to absolute url for Google Docs Viewer
  const getAbsoluteUrl = () => {
    if (fileUrl.startsWith('http')) return fileUrl;
    return `${window.location.origin}${fileUrl}`;
  };

  const googleViewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(getAbsoluteUrl())}&embedded=true`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-3 sm:p-5 animate-fade-in select-none"
      onClick={onClose}
    >
      <div
        className="relative max-w-5xl w-full bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-white animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-2.5 min-w-0 pr-3">
            <div className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-400 border border-teal-500/30 flex items-center justify-center shrink-0">
              {isImage ? (
                <Maximize2 className="w-4 h-4" />
              ) : isWord ? (
                <FileText className="w-4 h-4" />
              ) : isExcel ? (
                <FileSpreadsheet className="w-4 h-4" />
              ) : isPdf ? (
                <FileText className="w-4 h-4 text-rose-400" />
              ) : (
                <FileIcon className="w-4 h-4" />
              )}
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-sm text-slate-100 truncate max-w-sm sm:max-w-md md:max-w-xl">
                {fileName}
              </h3>
              <p className="text-[11px] text-slate-400">
                {fileSize ? `${fileSize} • ` : ''}
                {isImage
                  ? 'Tệp hình ảnh'
                  : isVideo
                  ? 'Video đa phương tiện'
                  : isAudio
                  ? 'Âm thanh / Voice'
                  : isPdf
                  ? 'Tài liệu PDF'
                  : isWord
                  ? 'Tài liệu Microsoft Word'
                  : isExcel
                  ? 'Bảng tính Microsoft Excel'
                  : 'Tệp đính kèm'}
              </p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Image Zoom & Rotate Controls */}
            {isImage && (
              <div className="hidden sm:flex items-center bg-slate-800/90 rounded-lg p-0.5 border border-slate-700/80">
                <button
                  type="button"
                  onClick={handleZoomIn}
                  className="p-1.5 hover:bg-slate-700 rounded text-slate-300 hover:text-white transition-colors cursor-pointer"
                  title="Phóng to"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleZoomOut}
                  className="p-1.5 hover:bg-slate-700 rounded text-slate-300 hover:text-white transition-colors cursor-pointer"
                  title="Thu nhỏ"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleRotate}
                  className="p-1.5 hover:bg-slate-700 rounded text-slate-300 hover:text-white transition-colors cursor-pointer"
                  title="Xoay hình 90°"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-2 py-1 text-xs hover:bg-slate-700 rounded text-slate-300 hover:text-white transition-colors font-mono cursor-pointer"
                  title="Khôi phục kích thước 100%"
                >
                  {Math.round(zoomScale * 100)}%
                </button>
              </div>
            )}

            {/* Mở tab mới */}
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors cursor-pointer"
              title="Mở trong tab mới"
            >
              <ExternalLink className="w-4 h-4" />
            </a>

            {/* Nút tải về duy nhất */}
            <button
              type="button"
              onClick={onDownload}
              className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer active:scale-95"
              title="Tải tệp về máy"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Tải về</span>
            </button>

            {/* Nút Đóng */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition-colors cursor-pointer"
              title="Đóng xem trước"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Viewport Body */}
        <div className="flex-1 overflow-auto bg-slate-950 flex items-center justify-center min-h-[350px] max-h-[78vh] p-3">
          {isImage ? (
            <div className="overflow-auto max-w-full max-h-full flex items-center justify-center p-2">
              <img
                src={fileUrl}
                alt={fileName}
                style={{
                  transform: `scale(${zoomScale}) rotate(${rotation}deg)`,
                  transition: 'transform 0.2s ease-in-out',
                }}
                className="max-w-full max-h-[72vh] object-contain rounded-lg shadow-2xl select-none"
              />
            </div>
          ) : isVideo ? (
            <div className="w-full max-w-3xl flex items-center justify-center">
              <video src={fileUrl} controls autoPlay className="max-h-[72vh] max-w-full rounded-xl shadow-2xl" />
            </div>
          ) : isAudio ? (
            <div className="p-8 text-center space-y-4 max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl">
              <div className="w-16 h-16 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center mx-auto">
                <FileIcon className="w-8 h-8" />
              </div>
              <p className="font-bold text-sm text-slate-200">{fileName}</p>
              <audio src={fileUrl} controls autoPlay className="w-full" />
            </div>
          ) : isPdf ? (
            <iframe
              src={`${fileUrl}#toolbar=0`}
              title={fileName}
              className="w-full h-[72vh] rounded-xl border border-slate-800 bg-white shadow-2xl"
            />
          ) : textContent !== null ? (
            <div className="w-full h-[72vh] overflow-auto bg-slate-900 p-4 rounded-xl font-mono text-xs text-slate-200 leading-relaxed border border-slate-800 select-text">
              <pre>{textContent}</pre>
            </div>
          ) : loadingText ? (
            <div className="py-12 text-slate-400 text-xs italic flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
              <span>Đang tải nội dung văn bản...</span>
            </div>
          ) : isOffice ? (
            /* Microsoft Office Document Preview */
            <div className="flex flex-col items-center justify-center p-6 sm:p-10 max-w-xl w-full text-center space-y-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl">
              <div className={`w-20 h-20 rounded-2xl flex items-center justify-center shadow-lg ${
                isWord ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : isExcel ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-600/20 text-amber-400 border border-amber-500/30'
              }`}>
                {isWord ? (
                  <FileText className="w-10 h-10" />
                ) : isExcel ? (
                  <FileSpreadsheet className="w-10 h-10" />
                ) : (
                  <FileIcon className="w-10 h-10" />
                )}
              </div>
              <div className="space-y-1.5">
                <h4 className="text-base font-bold text-slate-100">{fileName}</h4>
                <p className="text-xs text-slate-400">
                  {fileSize ? `Kích thước: ${fileSize} • ` : ''}Định dạng tài liệu văn phòng
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60 text-xs text-slate-300 leading-relaxed text-left space-y-1 w-full">
                <span className="font-bold text-teal-400 uppercase text-[10px] tracking-wide block">Xem trực tuyến</span>
                <p>
                  Trình duyệt không hỗ trợ dựng sẵn tệp Word/Excel nhị phân trực tiếp. Quý Thầy/Cô có thể xem trực tuyến thông qua Google Docs Viewer hoặc tải tệp về máy để mở bằng Microsoft Office.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 w-full">
                <a
                  href={googleViewerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition-all cursor-pointer"
                >
                  <Eye className="w-4 h-4" />
                  <span>Xem qua Google Docs Viewer</span>
                </a>
                <button
                  type="button"
                  onClick={onDownload}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center gap-2 border border-slate-700 transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Tải tệp về máy</span>
                </button>
              </div>
            </div>
          ) : (
            /* General File Preview Card */
            <div className="flex flex-col items-center justify-center p-8 max-w-md w-full text-center space-y-4 bg-slate-900 border border-slate-800 rounded-2xl">
              <div className="w-16 h-16 rounded-2xl bg-slate-800 text-slate-300 border border-slate-700 flex items-center justify-center">
                <FileIcon className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-100">{fileName}</h4>
                <p className="text-xs text-slate-400">{fileSize || 'Tệp đính kèm'}</p>
              </div>
              <button
                type="button"
                onClick={onDownload}
                className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs flex items-center gap-2 shadow-xs cursor-pointer transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Tải tệp về máy</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
