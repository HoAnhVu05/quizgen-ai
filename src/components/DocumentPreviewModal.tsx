import React, { useState, useEffect, useMemo } from 'react';
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
  Search,
  Table,
  Layers,
  ChevronDown,
  AlertCircle,
  Loader2,
} from 'lucide-react';
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

// Convert 0 -> A, 1 -> B, 25 -> Z, 26 -> AA
const getColumnLetter = (colIndex: number): string => {
  let letter = '';
  let temp = colIndex;
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
};

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

  // ── Excel native state ──────────────────────────────────────────────────
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [activeSheetName, setActiveSheetName] = useState<string>('');
  const [isLoadingExcel, setIsLoadingExcel] = useState(false);

  // ── Mobile Back Gesture & History Popstate Handler ───────────────────────
  useEffect(() => {
    if (!isOpen) return;
    try {
      window.history.pushState({ modal: 'doc-preview' }, '');
    } catch {}

    const handlePopState = () => {
      onClose();
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isOpen, onClose]);

  const handleSafeClose = () => {
    try {
      if (window.history.state?.modal === 'doc-preview') {
        window.history.back();
        return;
      }
    } catch {}
    onClose();
  };
  const [excelError, setExcelError] = useState<string | null>(null);
  const [excelSearch, setExcelSearch] = useState('');
  const [visibleRowsLimit, setVisibleRowsLimit] = useState(100);

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

  // ── Load Excel natively with SheetJS ───────────────────────────────────
  useEffect(() => {
    if (!isOpen || !isExcel || !fileUrl) {
      setWorkbook(null);
      setActiveSheetName('');
      setExcelError(null);
      return;
    }

    let isMounted = true;
    setIsLoadingExcel(true);
    setExcelError(null);
    setVisibleRowsLimit(100);
    setExcelSearch('');

    fetch(fileUrl)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: Không thể tải tệp bảng tính.`);
        }
        return res.arrayBuffer();
      })
      .then((ab) => {
        if (!isMounted) return;
        try {
          const wb = XLSX.read(ab, { type: 'array' });
          setWorkbook(wb);
          if (wb.SheetNames && wb.SheetNames.length > 0) {
            setActiveSheetName(wb.SheetNames[0]);
          }
          setIsLoadingExcel(false);
        } catch (parseErr: any) {
          throw new Error('Định dạng tệp Excel không hợp lệ hoặc bị mã hóa.');
        }
      })
      .catch((err: any) => {
        if (!isMounted) return;
        console.error('Lỗi khi đọc file Excel:', err);
        setExcelError(err.message || 'Không thể đọc nội dung tệp Excel.');
        setIsLoadingExcel(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, fileUrl, isExcel]);

  // Extract raw rows of active sheet
  const rawSheetRows = useMemo(() => {
    if (!workbook || !activeSheetName) return [];
    const sheet = workbook.Sheets[activeSheetName];
    if (!sheet) return [];
    return XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as any[][];
  }, [workbook, activeSheetName]);

  // Maximum columns across rows
  const maxColumnsCount = useMemo(() => {
    let max = 0;
    const sampleLimit = Math.min(rawSheetRows.length, 300);
    for (let i = 0; i < sampleLimit; i++) {
      if (rawSheetRows[i]?.length > max) {
        max = rawSheetRows[i].length;
      }
    }
    return Math.max(max, 1);
  }, [rawSheetRows]);

  // Search filter
  const filteredRows = useMemo(() => {
    if (!excelSearch.trim()) return rawSheetRows;
    const q = excelSearch.toLowerCase().trim();
    return rawSheetRows.filter((row, idx) => {
      if (idx === 0) return true; // always keep first row for context
      return row.some((cell) => String(cell ?? '').toLowerCase().includes(q));
    });
  }, [rawSheetRows, excelSearch]);

  const displayedRows = useMemo(() => {
    return filteredRows.slice(0, visibleRowsLimit);
  }, [filteredRows, visibleRowsLimit]);

  // ── 1. IMAGE LIGHTBOX (Ultra-clean Floating View) ──────────────────────────
  if (isImage) {
    return (
      <div
        role="dialog"
        aria-modal="true"
        className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in select-none"
        onClick={handleSafeClose}
      >
        {/* Mobile-Safe Fixed Top Header */}
        <div
          className="fixed top-0 left-0 right-0 z-50 px-3 py-3 sm:px-6 bg-gradient-to-b from-black/90 via-black/50 to-transparent flex items-center justify-between"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={handleSafeClose}
            className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-white/20 hover:bg-white/30 active:bg-white/40 text-white font-medium text-xs backdrop-blur-md transition-all cursor-pointer shadow-md"
            title="Quay lại"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Quay lại</span>
          </button>

          <span className="text-xs text-white/90 font-medium truncate max-w-[180px] sm:max-w-md mx-2">
            {fileName}
          </span>

          <button
            type="button"
            onClick={handleSafeClose}
            className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 active:bg-white/40 text-white flex items-center justify-center backdrop-blur-md cursor-pointer transition-all shadow-md"
            title="Đóng xem ảnh"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div
          className="relative max-w-5xl w-full max-h-[85vh] flex flex-col items-center mt-12 sm:mt-6"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Floating Image */}
          <div className="overflow-auto max-h-[70vh] sm:max-h-[76vh] flex items-center justify-center p-2">
            <img
              src={fileUrl}
              alt={fileName}
              style={{
                transform: `scale(${zoomScale}) rotate(${rotation}deg)`,
                transition: 'transform 0.15s ease-out',
              }}
              className="max-w-full max-h-[66vh] sm:max-h-[72vh] object-contain rounded-xl shadow-2xl select-none"
            />
          </div>

          {/* Sleek Floating Glass Pill Toolbar */}
          <div className="mt-3 flex items-center gap-2 bg-slate-900/90 backdrop-blur-md border border-white/10 text-white px-3 sm:px-4 py-2 rounded-full shadow-2xl text-xs flex-wrap justify-center">
            <span className="font-medium truncate max-w-[120px] sm:max-w-xs text-slate-200 pr-2 border-r border-white/10 hidden sm:inline">
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

            <button
              type="button"
              onClick={handleSafeClose}
              className="flex items-center gap-1 text-rose-300 hover:text-rose-200 font-semibold px-2 py-1 rounded-md hover:bg-white/10 transition-colors cursor-pointer"
              title="Đóng cửa sổ"
            >
              <X className="w-3.5 h-3.5" />
              <span>Đóng</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── 2. NATIVE EXCEL SPREADSHEET VIEWER (100% Client-side, Blazing Fast) ───
  if (isExcel) {
    return (
      <div
        role="dialog"
        aria-modal="true"
        className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/60 backdrop-blur-sm animate-fade-in select-none"
        onClick={handleSafeClose}
      >
        <div
          className="relative max-w-6xl w-full h-[92vh] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-scale-up"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top Bar Header */}
          <div className="h-14 px-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0 gap-3">
            {/* File info */}
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center shrink-0 shadow-xs">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs sm:text-sm text-slate-900 truncate max-w-[200px] sm:max-w-md">
                    {fileName}
                  </span>
                  {fileSize && (
                    <span className="text-[10px] text-emerald-700 bg-emerald-100/70 border border-emerald-200/60 font-mono px-1.5 py-0.2 rounded font-semibold shrink-0">
                      {fileSize}
                    </span>
                  )}
                </div>
                {!isLoadingExcel && !excelError && rawSheetRows.length > 0 && (
                  <p className="text-[10px] text-slate-500 font-medium">
                    {rawSheetRows.length.toLocaleString()} hàng • {maxColumnsCount} cột
                    {excelSearch && ` • Khớp ${filteredRows.length.toLocaleString()} hàng`}
                  </p>
                )}
              </div>
            </div>

            {/* Quick Search in Sheet */}
            {!isLoadingExcel && !excelError && rawSheetRows.length > 0 && (
              <div className="hidden sm:flex items-center relative max-w-xs w-full">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
                <input
                  type="text"
                  value={excelSearch}
                  onChange={(e) => setExcelSearch(e.target.value)}
                  placeholder="Tìm kiếm trong bảng..."
                  className="w-full text-xs pl-8 pr-7 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 text-slate-800 placeholder-slate-400"
                />
                {excelSearch && (
                  <button
                    type="button"
                    onClick={() => setExcelSearch('')}
                    className="absolute right-2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={onDownload}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                title="Tải tệp Excel về máy"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Tải về</span>
              </button>
              <button
                type="button"
                onClick={handleSafeClose}
                className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                title="Đóng xem trước"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Sheet Selector Tabs Bar (If file has sheets) */}
          {workbook && workbook.SheetNames && workbook.SheetNames.length > 0 && (
            <div className="h-9 px-4 border-b border-slate-200 bg-slate-100 flex items-center gap-1 overflow-x-auto shrink-0 scrollbar-none">
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mr-1 flex items-center gap-1 shrink-0">
                <Layers className="w-3 h-3" /> Trang tính:
              </span>
              {workbook.SheetNames.map((sheetName) => (
                <button
                  key={sheetName}
                  type="button"
                  onClick={() => {
                    setActiveSheetName(sheetName);
                    setVisibleRowsLimit(100);
                  }}
                  className={`px-3 py-1 text-xs font-semibold rounded-t-md transition-all shrink-0 cursor-pointer border-t-2 ${
                    activeSheetName === sheetName
                      ? 'bg-white text-emerald-700 border-emerald-600 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200 border-transparent'
                  }`}
                >
                  {sheetName}
                </button>
              ))}
            </div>
          )}

          {/* Main Grid Body */}
          <div className="flex-1 w-full bg-slate-100 overflow-auto relative">
            {isLoadingExcel ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-white/80 backdrop-blur-xs">
                <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mb-3" />
                <h4 className="font-bold text-sm text-slate-800">
                  Đang phân tích bảng tính Excel...
                </h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">
                  Hệ thống đang đọc cấu trúc dữ liệu bảng tính trực tiếp trong trình duyệt để hiển thị nguyên vẹn.
                </p>
              </div>
            ) : excelError ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-white">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mb-3">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-sm text-slate-800">
                  Không thể mở xem trực tuyến tệp bảng tính này
                </h4>
                <p className="text-xs text-slate-500 mt-1 max-w-md">
                  {excelError}
                </p>
                <div className="mt-4 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onDownload}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Tải tệp về mở trên Excel</span>
                  </button>
                </div>
              </div>
            ) : rawSheetRows.length === 0 ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-white">
                <FileSpreadsheet className="w-10 h-10 text-slate-300 mb-2" />
                <p className="text-xs text-slate-500 font-medium">
                  Trang tính "{activeSheetName}" không có dữ liệu để hiển thị.
                </p>
              </div>
            ) : (
              <div className="min-w-full inline-block align-top bg-white">
                <table className="w-full border-collapse text-left text-xs">
                  {/* Sticky Column Letter Header */}
                  <thead className="sticky top-0 z-20 bg-slate-100 text-slate-600 shadow-xs select-none">
                    <tr>
                      <th className="sticky left-0 z-30 bg-slate-200 text-slate-500 border-b border-r border-slate-300 w-12 px-2 py-1.5 text-center font-mono text-[10px] uppercase font-bold">
                        #
                      </th>
                      {Array.from({ length: maxColumnsCount }).map((_, cIdx) => (
                        <th
                          key={cIdx}
                          className="border-b border-r border-slate-200 px-3 py-1.5 font-mono text-[11px] font-semibold text-slate-600 text-center uppercase min-w-[120px]"
                        >
                          {getColumnLetter(cIdx)}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  {/* Table Rows */}
                  <tbody className="divide-y divide-slate-100">
                    {displayedRows.map((row, rIdx) => {
                      const isHeaderRow = rIdx === 0;
                      return (
                        <tr
                          key={rIdx}
                          className={`transition-colors ${
                            isHeaderRow
                              ? 'bg-slate-50/90 font-semibold text-slate-900 border-b-2 border-slate-200'
                              : rIdx % 2 === 0
                              ? 'bg-white hover:bg-emerald-50/40'
                              : 'bg-slate-50/30 hover:bg-emerald-50/40'
                          }`}
                        >
                          {/* Row Number */}
                          <td className="sticky left-0 z-10 bg-slate-100 text-slate-400 border-r border-slate-200 px-2 py-1.5 text-center font-mono text-[10px] select-none font-medium">
                            {rIdx + 1}
                          </td>

                          {/* Columns */}
                          {Array.from({ length: maxColumnsCount }).map((_, cIdx) => {
                            const cellVal = row[cIdx];
                            const cellStr = cellVal !== undefined && cellVal !== null ? String(cellVal) : '';
                            const isNumeric = cellStr !== '' && !isNaN(Number(cellStr));

                            return (
                              <td
                                key={cIdx}
                                className={`border-r border-slate-100 px-3 py-1.5 text-[11px] text-slate-700 whitespace-nowrap max-w-xs truncate ${
                                  isNumeric ? 'text-right font-mono' : 'text-left'
                                }`}
                                title={cellStr}
                              >
                                {cellStr}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Pagination / Load More Footer */}
                {displayedRows.length < filteredRows.length && (
                  <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
                    <span>
                      Đang hiển thị <strong>{displayedRows.length.toLocaleString()}</strong> trong tổng số{' '}
                      <strong>{filteredRows.length.toLocaleString()}</strong> hàng
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setVisibleRowsLimit((prev) => prev + 100)}
                        className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-medium transition-colors cursor-pointer shadow-2xs"
                      >
                        + Xem thêm 100 hàng
                      </button>
                      <button
                        type="button"
                        onClick={() => setVisibleRowsLimit(filteredRows.length)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 font-semibold transition-colors cursor-pointer"
                      >
                        Xem toàn bộ ({filteredRows.length.toLocaleString()} hàng)
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── 3. PDF VIEWER (Direct clean embedded reader) ──────────────────────────
  if (isPdf) {
    return (
      <div
        role="dialog"
        aria-modal="true"
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm animate-fade-in select-none"
        onClick={handleSafeClose}
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
                onClick={handleSafeClose}
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

  // ── 4. EMBEDDED GOOGLE DOCS / OFFICE VIEWER (When user clicked "Xem trực tuyến" for Word/PPT)
  if (isLiveViewerOpen) {
    return (
      <div
        role="dialog"
        aria-modal="true"
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm animate-fade-in select-none"
        onClick={handleSafeClose}
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
                onClick={handleSafeClose}
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

  // ── 5. AIRY & LUXURIOUS QUICKLOOK CARD (Modern Apple / Linear Minimalist for Word/Other) ──
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs animate-fade-in select-none"
      onClick={handleSafeClose}
    >
      <div
        className="relative max-w-md w-full bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.18)] border border-slate-100 p-6 sm:p-7 text-center overflow-hidden animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Close Button */}
        <button
          type="button"
          onClick={handleSafeClose}
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
                : isPpt
                ? 'bg-amber-50 text-amber-600 border border-amber-100'
                : 'bg-slate-50 text-slate-600 border border-slate-200'
            }`}
          >
            {isWord ? (
              <FileText className="w-8 h-8" />
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
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>
    </div>
  );
};
