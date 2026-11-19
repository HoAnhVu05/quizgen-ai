import React, { useState, useEffect, useRef } from 'react';
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
  Eye,
  Maximize2,
  Table,
} from 'lucide-react';
import { renderAsync } from 'docx-preview';
import * as XLSX from 'xlsx';

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
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Text content
  const [textContent, setTextContent] = useState<string | null>(null);

  // Excel content
  const [excelSheets, setExcelSheets] = useState<{ name: string; data: (string | number)[][] }[]>([]);
  const [activeSheetIdx, setActiveSheetIdx] = useState(0);

  // Docx container ref
  const docxContainerRef = useRef<HTMLDivElement | null>(null);

  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  const isImage = (fileType || '').startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(ext);
  const isVideo = (fileType || '').startsWith('video/') || ['mp4', 'webm', 'ogg', 'mov'].includes(ext);
  const isAudio = (fileType || '').startsWith('audio/') || ['mp3', 'wav', 'ogg', 'webm', 'm4a'].includes(ext);
  const isPdf = ext === 'pdf' || (fileType || '').includes('pdf');
  const isWord = ['docx', 'doc'].includes(ext);
  const isExcel = ['xlsx', 'xls', 'csv'].includes(ext);
  const isText = ['txt', 'json', 'md', 'log', 'py', 'js', 'html', 'css', 'sql', 'ts', 'tsx'].includes(ext);

  useEffect(() => {
    if (!isOpen || !fileUrl) return;

    setZoomScale(1);
    setRotation(0);
    setLoading(true);
    setErrorMsg(null);
    setTextContent(null);
    setExcelSheets([]);
    setActiveSheetIdx(0);

    // If text file: fetch text directly
    if (isText) {
      fetch(fileUrl)
        .then((r) => {
          if (!r.ok) throw new Error('Không thể tải tệp văn bản');
          return r.text();
        })
        .then((text) => {
          setTextContent(text);
          setLoading(false);
        })
        .catch((err) => {
          setErrorMsg(err.message || 'Lỗi đọc tệp');
          setLoading(false);
        });
      return;
    }

    // If Word docx: fetch binary and render via docx-preview
    if (ext === 'docx') {
      fetch(fileUrl)
        .then((r) => {
          if (!r.ok) throw new Error('Không thể tải tệp Word');
          return r.arrayBuffer();
        })
        .then(async (buffer) => {
          if (docxContainerRef.current) {
            docxContainerRef.current.innerHTML = '';
            await renderAsync(buffer, docxContainerRef.current, undefined, {
              className: 'docx-doc-render',
              inWrapper: true,
              ignoreWidth: false,
              ignoreHeight: false,
              breakPages: true,
              renderHeaders: true,
              renderFooters: true,
            });
          }
          setLoading(false);
        })
        .catch((err) => {
          console.warn('docx render fallback:', err);
          setErrorMsg('Không thể dựng trực tiếp nội dung Word.');
          setLoading(false);
        });
      return;
    }

    // If Excel / CSV: parse workbook
    if (isExcel) {
      fetch(fileUrl)
        .then((r) => {
          if (!r.ok) throw new Error('Không thể tải tệp Excel');
          return r.arrayBuffer();
        })
        .then((buffer) => {
          const workbook = XLSX.read(buffer, { type: 'array' });
          const sheets = workbook.SheetNames.map((name) => {
            const sheet = workbook.Sheets[name];
            const data = (XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as (string | number)[][]) || [];
            return { name, data };
          });
          setExcelSheets(sheets);
          setLoading(false);
        })
        .catch((err) => {
          console.warn('Excel parse fallback:', err);
          setErrorMsg('Không thể dựng trực tiếp bảng tính.');
          setLoading(false);
        });
      return;
    }

    // Other formats (PDF, Image, Video, Audio) are handled natively by HTML elements
    setLoading(false);
  }, [isOpen, fileUrl, ext, isText, isExcel]);

  if (!isOpen || !fileUrl) return null;

  const handleZoomIn = () => setZoomScale((s) => Math.min(s + 0.25, 3));
  const handleZoomOut = () => setZoomScale((s) => Math.max(s - 0.25, 0.5));
  const handleRotate = () => setRotation((r) => (r + 90) % 360);
  const handleReset = () => {
    setZoomScale(1);
    setRotation(0);
  };

  const fullUrl = fileUrl.startsWith('http') ? fileUrl : `${window.location.origin}${fileUrl}`;
  const googleViewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(fullUrl)}&embedded=true`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/45 backdrop-blur-md animate-fade-in select-none"
      onClick={onClose}
    >
      <div
        className="relative max-w-5xl w-full bg-white/95 backdrop-blur-2xl rounded-2xl shadow-[0_20px_70px_-15px_rgba(0,0,0,0.3)] border border-slate-200/90 overflow-hidden flex flex-col max-h-[92vh] animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Floating Minimalist Header (Airy & Modern QuickLook Style) */}
        <div className="h-14 px-4 sm:px-6 border-b border-slate-100 flex items-center justify-between bg-white/80 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-3 min-w-0 pr-3">
            {/* Elegant Brand Icon Badge */}
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${
                isWord
                  ? 'bg-[#185ABD] text-white'
                  : isExcel
                  ? 'bg-[#107C41] text-white'
                  : isPdf
                  ? 'bg-[#EA4335] text-white'
                  : isImage
                  ? 'bg-teal-600 text-white'
                  : isText
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-700 text-white'
              }`}
            >
              {isImage ? (
                <Maximize2 className="w-4 h-4" />
              ) : isWord ? (
                <FileText className="w-4 h-4" />
              ) : isExcel ? (
                <FileSpreadsheet className="w-4 h-4" />
              ) : isPdf ? (
                <FileText className="w-4 h-4" />
              ) : isText ? (
                <FileCode className="w-4 h-4" />
              ) : (
                <FileIcon className="w-4 h-4" />
              )}
            </div>

            <div className="min-w-0">
              <h3 className="font-bold text-xs sm:text-sm text-slate-900 truncate max-w-xs sm:max-w-md md:max-w-xl">
                {fileName}
              </h3>
              <p className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5">
                {fileSize && <span>{fileSize}</span>}
                {fileSize && <span>•</span>}
                <span>
                  {isWord
                    ? 'Microsoft Word (.docx)'
                    : isExcel
                    ? 'Microsoft Excel (.xlsx)'
                    : isPdf
                    ? 'Tài liệu PDF'
                    : isImage
                    ? 'Tệp hình ảnh'
                    : isVideo
                    ? 'Video đa phương tiện'
                    : isAudio
                    ? 'Âm thanh'
                    : 'Tệp đính kèm'}
                </span>
              </p>
            </div>
          </div>

          {/* Minimalist Action Toolbar */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Image zoom controls pill */}
            {isImage && (
              <div className="hidden sm:flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200/80 mr-1">
                <button
                  type="button"
                  onClick={handleZoomIn}
                  className="p-1 hover:bg-white rounded text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                  title="Phóng to"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleZoomOut}
                  className="p-1 hover:bg-white rounded text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                  title="Thu nhỏ"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleRotate}
                  className="p-1 hover:bg-white rounded text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                  title="Xoay 90°"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-1.5 py-0.5 text-[10px] hover:bg-white rounded text-slate-600 hover:text-slate-900 transition-colors font-mono cursor-pointer"
                  title="Đặt lại 100%"
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
              className="p-1.5 sm:p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
              title="Mở trong tab mới"
            >
              <ExternalLink className="w-4 h-4" />
            </a>

            {/* Tải về */}
            <button
              type="button"
              onClick={onDownload}
              className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 active:scale-95 text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
              title="Tải tệp về máy"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Tải về</span>
            </button>

            {/* Đóng */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 sm:p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              title="Đóng xem trước"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Viewport Content Area */}
        <div className="flex-1 overflow-auto bg-[#f8fafc] flex flex-col items-center justify-start min-h-[360px] max-h-[78vh] relative">
          {/* Loading Indicator */}
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 z-20 gap-2">
              <span className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-slate-500 font-medium">Đang kết xuất nội dung...</p>
            </div>
          )}

          {/* 1. IMAGE PREVIEW */}
          {isImage ? (
            <div className="w-full h-full flex items-center justify-center p-4 overflow-auto">
              <img
                src={fileUrl}
                alt={fileName}
                style={{
                  transform: `scale(${zoomScale}) rotate(${rotation}deg)`,
                  transition: 'transform 0.15s ease-out',
                }}
                className="max-w-full max-h-[70vh] object-contain rounded-xl shadow-lg select-none"
              />
            </div>
          ) : isPdf ? (
            /* 2. PDF VIEWER */
            <iframe
              src={`${fileUrl}#toolbar=0`}
              title={fileName}
              className="w-full h-[75vh] border-0 bg-white shadow-xs"
            />
          ) : ext === 'docx' ? (
            /* 3. WORD DOCX HIGH FIDELITY IN-BROWSER RENDER */
            <div className="w-full h-full overflow-y-auto p-4 sm:p-8 flex justify-center bg-slate-100/70">
              <div
                ref={docxContainerRef}
                className="bg-white shadow-xl rounded-xl border border-slate-200/80 p-6 sm:p-12 max-w-3xl w-full min-h-[60vh] text-slate-800 text-xs sm:text-sm leading-relaxed docx-preview-surface"
              />
            </div>
          ) : isExcel && excelSheets.length > 0 ? (
            /* 4. EXCEL MULTI-SHEET DATA GRID */
            <div className="w-full h-full flex flex-col bg-white">
              <div className="flex-1 overflow-auto p-4">
                <table className="w-full text-xs text-left border-collapse border border-slate-200">
                  <tbody>
                    {(excelSheets[activeSheetIdx]?.data || []).map((row, rIdx) => (
                      <tr
                        key={rIdx}
                        className={
                          rIdx === 0
                            ? 'bg-slate-100/90 font-bold text-slate-800 sticky top-0 border-b border-slate-300'
                            : rIdx % 2 === 0
                            ? 'bg-slate-50/50 hover:bg-teal-50/40'
                            : 'bg-white hover:bg-teal-50/40'
                        }
                      >
                        <td className="px-2 py-1.5 text-center text-[10px] text-slate-400 font-mono bg-slate-100/80 border-r border-b border-slate-200 select-none w-10">
                          {rIdx + 1}
                        </td>
                        {row.map((cell, cIdx) => (
                          <td
                            key={cIdx}
                            className="px-3 py-1.5 border-r border-b border-slate-200 text-slate-700 whitespace-nowrap max-w-xs truncate"
                          >
                            {String(cell)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Sheet tabs selector */}
              {excelSheets.length > 1 && (
                <div className="flex items-center gap-1 px-4 py-2 bg-slate-50 border-t border-slate-200 overflow-x-auto shrink-0">
                  <span className="text-[11px] font-semibold text-slate-500 mr-2 flex items-center gap-1">
                    <Table className="w-3.5 h-3.5" />
                    <span>Trang tính:</span>
                  </span>
                  {excelSheets.map((s, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveSheetIdx(idx)}
                      className={`px-3 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors ${
                        activeSheetIdx === idx
                          ? 'bg-white text-emerald-700 shadow-xs border border-slate-200 font-bold'
                          : 'text-slate-600 hover:bg-slate-200/60'
                      }`}
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : textContent !== null ? (
            /* 5. CODE / TEXT VIEWER */
            <div className="w-full h-full overflow-auto p-4 sm:p-6 bg-slate-900 text-slate-100 font-mono text-xs leading-relaxed select-text">
              <pre>{textContent}</pre>
            </div>
          ) : isVideo ? (
            /* 6. VIDEO VIEWER */
            <div className="w-full h-full flex items-center justify-center p-4">
              <video src={fileUrl} controls autoPlay className="max-h-[72vh] max-w-full rounded-xl shadow-lg" />
            </div>
          ) : isAudio ? (
            /* 7. AUDIO VIEWER */
            <div className="p-8 text-center space-y-4 max-w-md w-full bg-white border border-slate-200 rounded-2xl shadow-sm my-auto">
              <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-600 border border-teal-100 flex items-center justify-center mx-auto">
                <FileIcon className="w-7 h-7" />
              </div>
              <p className="font-bold text-sm text-slate-800">{fileName}</p>
              <audio src={fileUrl} controls autoPlay className="w-full" />
            </div>
          ) : (
            /* 8. ETHEREAL QUICKLOOK FALLBACK CARD */
            <div className="flex flex-col items-center justify-center p-8 sm:p-12 max-w-md w-full text-center space-y-4 my-auto">
              <div
                className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-md ${
                  isWord
                    ? 'bg-blue-50 text-blue-600 border border-blue-200'
                    : isExcel
                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                    : 'bg-slate-100 text-slate-600 border border-slate-200'
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

              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-800">{fileName}</h4>
                <p className="text-xs text-slate-400">{fileSize || 'Tài liệu'}</p>
              </div>

              {errorMsg && (
                <p className="text-[11px] text-amber-700 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200">
                  {errorMsg}
                </p>
              )}

              <div className="flex items-center gap-2 pt-2">
                <a
                  href={googleViewerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Google Docs</span>
                </a>
                <button
                  type="button"
                  onClick={onDownload}
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer active:scale-95"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Tải về</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
