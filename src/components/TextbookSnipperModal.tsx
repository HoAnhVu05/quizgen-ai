import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  X,
  Crop,
  Check,
  Upload,
  Camera,
  FileText,
  AlertCircle,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Search,
} from 'lucide-react';
import apiClient, { API_BASE } from '../services/apiClient';

export interface TextbookSnipperModalProps {
  isOpen: boolean;
  onClose: () => void;
  textbookName?: string;
  onApplyImage: (imageUrl: string, caption?: string) => void;
  initialCaption?: string;
}

interface DocumentItem {
  id: string;
  name: string;
  filename?: string;
  fileUrl?: string;
  totalPages?: number;
}

export const TextbookSnipperModal: React.FC<TextbookSnipperModalProps> = ({
  isOpen,
  onClose,
  textbookName,
  onApplyImage,
  initialCaption = '',
}) => {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string>('');
  const [docSearchQuery, setDocSearchQuery] = useState('');
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState(initialCaption || '');
  const [isProcessing, setIsProcessing] = useState(false);
  const localFileInputRef = useRef<HTMLInputElement | null>(null);

  // Snipping crop state
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isSnipping, setIsSnipping] = useState(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [cropRect, setCropRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  // Fetch documents on open
  useEffect(() => {
    if (!isOpen) return;
    const fetchDocs = async () => {
      setIsLoadingDocs(true);
      try {
        const res = await apiClient.fetch(`${API_BASE}/documents/documents`);
        if (res.ok) {
          const data = await res.json();
          const items: DocumentItem[] = Array.isArray(data)
            ? data
            : Array.isArray(data.items)
            ? data.items
            : [];
          setDocuments(items);

          // Auto-match textbookName if provided (so khớp thông minh 2 chiều, loại bỏ phần mở rộng)
          if (textbookName && items.length > 0) {
            const cleanTarget = textbookName.toLowerCase().replace(/\.(pdf|docx|doc)$/i, '').trim();
            const matched = items.find((d) => {
              const name = (d.name || d.filename || '').toLowerCase().replace(/\.(pdf|docx|doc)$/i, '').trim();
              return name === cleanTarget || name.includes(cleanTarget) || cleanTarget.includes(name);
            });
            if (matched) {
              setSelectedDocId(matched.id);
            } else {
              setSelectedDocId(items[0].id);
            }
          } else if (items.length > 0) {
            setSelectedDocId(items[0].id);
          }
        }
      } catch (err) {
        console.warn('Lỗi lấy danh sách tài liệu:', err);
      } finally {
        setIsLoadingDocs(false);
      }
    };
    fetchDocs();
  }, [isOpen, textbookName]);

  // Load selected document blob URL
  useEffect(() => {
    if (!isOpen || !selectedDocId) {
      if (pdfBlobUrl) {
        URL.revokeObjectURL(pdfBlobUrl);
        setPdfBlobUrl(null);
      }
      return;
    }

    let isMounted = true;
    const loadDocBlob = async () => {
      try {
        const docUrl = `${API_BASE}/documents/documents/${selectedDocId}/download?inline=true`;
        const res = await apiClient.fetch(docUrl);
        if (res.ok) {
          const blob = await res.blob();
          if (isMounted) {
            const url = URL.createObjectURL(blob);
            setPdfBlobUrl(url);
          }
        }
      } catch (err) {
        console.warn('Lỗi tải tệp giáo trình:', err);
      }
    };
    loadDocBlob();

    return () => {
      isMounted = false;
      if (pdfBlobUrl) {
        URL.revokeObjectURL(pdfBlobUrl);
      }
    };
  }, [isOpen, selectedDocId]);

  // Handle Ctrl+V paste image directly to crop
  useEffect(() => {
    if (!isOpen) return;
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            const reader = new FileReader();
            reader.onload = () => {
              setImageSrc(reader.result as string);
              setCropRect(null);
            };
            reader.readAsDataURL(blob);
            break;
          }
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isOpen]);

  const handleLocalFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        setImageSrc(reader.result as string);
        setCropRect(null);
      };
      reader.readAsDataURL(file);
    } else if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl);
      const url = URL.createObjectURL(file);
      setPdfBlobUrl(url);
      setImageSrc(null);
      setCropRect(null);
    }
  };

  const filteredDocuments = useMemo(() => {
    if (!docSearchQuery.trim()) return documents;
    const q = docSearchQuery.toLowerCase();
    return documents.filter((d) => (d.name || d.filename || '').toLowerCase().includes(q));
  }, [documents, docSearchQuery]);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setStartPos({ x, y });
    setCropRect({ x, y, width: 0, height: 0 });
    setIsSnipping(true);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isSnipping || !startPos) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const currentX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const currentY = Math.max(0, Math.min(e.clientY - rect.top, rect.height));

    const x = Math.min(startPos.x, currentX);
    const y = Math.min(startPos.y, currentY);
    const width = Math.abs(currentX - startPos.x);
    const height = Math.abs(currentY - startPos.y);

    setCropRect({ x, y, width, height });
  };

  const handleMouseUp = () => {
    setIsSnipping(false);
  };

  const uploadAndApply = async (dataUrl: string) => {
    setIsProcessing(true);
    try {
      const byteString = atob(dataUrl.split(',')[1] || '');
      const mimeString = dataUrl.split(',')[0].split(':')[1].split(';')[0];
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      const blob = new Blob([ab], { type: mimeString });

      const formData = new FormData();
      formData.append('file', blob, `snip-${Date.now()}.png`);

      const res = await apiClient.fetch(`${API_BASE}/documents/questions/upload-image`, {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        if (data.imageUrl) {
          onApplyImage(data.imageUrl, caption || 'Hình trích xuất từ giáo trình');
          setIsProcessing(false);
          onClose();
          return;
        }
      }
    } catch (err) {
      console.warn('Lỗi upload ảnh:', err);
    }
    onApplyImage(dataUrl, caption || 'Hình trích xuất từ giáo trình');
    setIsProcessing(false);
    onClose();
  };

  const handleApplyCrop = () => {
    if (!imgRef.current || !cropRect || cropRect.width < 10 || cropRect.height < 10) {
      if (imageSrc) {
        uploadAndApply(imageSrc);
      }
      return;
    }

    const img = imgRef.current;
    const canvas = document.createElement('canvas');
    const scaleX = img.naturalWidth / img.width;
    const scaleY = img.naturalHeight / img.height;

    canvas.width = cropRect.width * scaleX;
    canvas.height = cropRect.height * scaleY;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(
      img,
      cropRect.x * scaleX,
      cropRect.y * scaleY,
      cropRect.width * scaleX,
      cropRect.height * scaleY,
      0,
      0,
      canvas.width,
      canvas.height
    );

    const croppedDataUrl = canvas.toDataURL('image/png');
    uploadAndApply(croppedDataUrl);
  };

  const handleUploadImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setImageSrc(reader.result as string);
        setCropRect(null);
      };
      reader.readAsDataURL(file);
    }
  };

  if (!isOpen) return null;

  const currentDoc = documents.find((d) => d.id === selectedDocId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-xs select-none animate-in fade-in duration-100">
      <div className="relative w-full max-w-5xl h-[92vh] bg-slate-900 rounded-2xl shadow-2xl border border-slate-800 flex flex-col overflow-hidden text-slate-100">
        {/* Top Header */}
        <div className="h-12 px-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/20 flex items-center justify-center shrink-0">
              <Crop className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-100 flex items-center gap-2">
                <span>CẮT HÌNH MINH HỌA TỪ GIÁO TRÌNH</span>
                <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-teal-400 font-mono border border-slate-700">
                  PDF SNIPPER
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* Bộ lọc tìm kiếm nhanh giáo trình */}
            {documents.length > 5 && (
              <div className="relative">
                <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Lọc giáo trình..."
                  value={docSearchQuery}
                  onChange={(e) => setDocSearchQuery(e.target.value)}
                  className="w-28 sm:w-36 pl-6 pr-2 py-1 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500"
                />
              </div>
            )}

            {documents.length > 0 && (
              <select
                value={selectedDocId}
                onChange={(e) => setSelectedDocId(e.target.value)}
                className="max-w-[180px] sm:max-w-xs truncate px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                title="Chọn giáo trình cần cắt hình"
              >
                {filteredDocuments.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    {doc.name || doc.filename || 'Giáo trình'}
                  </option>
                ))}
              </select>
            )}

            {/* Nút tải tệp/ảnh từ máy tính */}
            <label
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium cursor-pointer transition-colors flex items-center gap-1.5 shrink-0"
              title="Chọn tệp PDF hoặc file ảnh minh họa từ máy tính để cắt ngay"
            >
              <Upload className="w-3.5 h-3.5 text-teal-400" />
              <span className="hidden sm:inline">Tải từ máy</span>
              <input
                ref={localFileInputRef}
                type="file"
                accept=".pdf,image/*"
                className="hidden"
                onChange={handleLocalFileSelect}
              />
            </label>

            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
              title="Đóng (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Instructions banner */}
        <div className="px-4 py-2 bg-slate-950/80 border-b border-slate-800/80 flex flex-wrap items-center justify-between text-[11px] text-slate-300 gap-2 shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-teal-400">Cách thao tác:</span>
            <span>
              1. Tìm hình trên giáo trình bên dưới → 2. Nhấn phím{' '}
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 font-mono text-white border border-slate-700">
                Win + Shift + S
              </kbd>{' '}
              để quét hình → 3. Nhấn{' '}
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 font-mono text-white border border-slate-700">
                Ctrl + V
              </kbd>{' '}
              vào đây để chỉnh crop và chèn!
            </span>
          </div>
          <label className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium cursor-pointer transition-colors text-xs">
            <Upload className="w-3.5 h-3.5 text-slate-400" />
            <span>Nạp ảnh chụp để crop</span>
            <input type="file" accept="image/*" className="hidden" onChange={handleUploadImageFile} />
          </label>
        </div>

        {/* Main Viewing Area */}
        <div className="flex-1 w-full bg-slate-950 overflow-hidden relative flex flex-col md:flex-row">
          {/* Left: Interactive Cropper (if imageSrc is pasted/loaded) */}
          {imageSrc ? (
            <div className="flex-1 w-full h-full flex flex-col p-4 bg-slate-950 items-center justify-center relative overflow-auto">
              <div
                className="relative max-w-full max-h-full cursor-crosshair border border-slate-700 rounded-lg overflow-hidden select-none bg-black/40"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
              >
                <img
                  ref={imgRef}
                  src={imageSrc}
                  alt="Ảnh trích xuất"
                  className="max-w-full max-h-[65vh] object-contain block pointer-events-none"
                  draggable={false}
                />
                {cropRect && cropRect.width > 0 && cropRect.height > 0 && (
                  <div
                    className="absolute border-2 border-teal-400 bg-teal-500/20 pointer-events-none"
                    style={{
                      left: cropRect.x,
                      top: cropRect.y,
                      width: cropRect.width,
                      height: cropRect.height,
                    }}
                  >
                    <span className="absolute -top-5 left-0 px-1 py-0.2 rounded bg-teal-600 text-white text-[10px] font-mono">
                      {Math.round(cropRect.width)} x {Math.round(cropRect.height)}
                    </span>
                  </div>
                )}
              </div>
              <div className="mt-2 text-center text-xs text-slate-400">
                Kéo chuột khoanh vùng cần lấy hoặc để nguyên ảnh rồi bấm &quot;Áp dụng vào câu hỏi&quot;
              </div>
            </div>
          ) : (
            /* Left/Center: Embedded PDF Reader to browse and find diagram */
            <div className="flex-1 w-full h-full flex flex-col bg-slate-950 relative">
              {pdfBlobUrl ? (
                <iframe
                  title="Textbook Reader"
                  src={`${pdfBlobUrl}#toolbar=1&navpanes=0`}
                  className="w-full h-full border-none bg-slate-100"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center text-slate-400">
                  <RefreshCw className="w-8 h-8 animate-spin text-teal-400 mb-3" />
                  <p className="text-xs">Đang mở tài liệu giáo trình...</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom Action Bar (Comfortable height, never covered by taskbar) */}
        <div className="min-h-[54px] py-2 px-4 pb-3 sm:pb-2.5 bg-slate-900 border-t border-slate-800 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 shrink-0">
          <div className="flex-1 max-w-md flex items-center gap-2">
            <span className="text-xs text-slate-400 shrink-0">Chú thích hình:</span>
            <input
              type="text"
              placeholder="Ví dụ: Hình 2.1: Sơ đồ dầm uốn chịu tải trọng phân bố..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {imageSrc && (
              <button
                type="button"
                onClick={() => {
                  setImageSrc(null);
                  setCropRect(null);
                }}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
              >
                Mở lại giáo trình
              </button>
            )}

            <button
              type="button"
              onClick={handleApplyCrop}
              disabled={isProcessing || !imageSrc}
              className="px-4 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Đang tải lên...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Áp dụng vào câu hỏi</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TextbookSnipperModal;
