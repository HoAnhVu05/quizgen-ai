import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Check,
  Cpu,
  TrendingUp,
  Compass,
  Atom,
  Zap,
  Upload,
  Camera,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';

export interface DiagramStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyImage: (imageUrl: string, caption?: string) => void;
  initialCaption?: string;
  initialImageUrl?: string;
}

export type StudioTab = 'drawio' | 'geogebra' | 'desmos' | 'molview' | 'circuit';

export const DiagramStudioModal: React.FC<DiagramStudioModalProps> = ({
  isOpen,
  onClose,
  onApplyImage,
  initialCaption = '',
  initialImageUrl = '',
}) => {
  const [activeTab, setActiveTab] = useState<StudioTab>('drawio');
  const [caption, setCaption] = useState(initialCaption || '');
  const [isProcessing, setIsProcessing] = useState(false);

  // ── Draw.io & Chemistry Iframe State ─────────────────────────────────────
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const chemIframeRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    if (isOpen && initialCaption && !caption) {
      setCaption(initialCaption);
    }
  }, [isOpen, initialCaption, caption]);

  // Handle Ctrl+V paste image from clipboard anywhere in modal
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
              handleFinishImage(reader.result as string, caption || 'Sơ đồ trích xuất từ bảng vẽ');
            };
            reader.readAsDataURL(blob);
            break;
          }
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isOpen, caption]);

  // Handle Esc to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // ── 1. DRAW.IO POSTMESSAGE PROTOCOL ──────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;

    const handleMessage = async (evt: MessageEvent) => {
      if (!evt.data || typeof evt.data !== 'string') return;
      try {
        const msg = JSON.parse(evt.data);
        if (msg.event === 'init') {
          // Initialize Draw.io
          iframeRef.current?.contentWindow?.postMessage(
            JSON.stringify({
              action: 'load',
              xml: '',
              autosave: 0,
            }),
            '*'
          );
        } else if (msg.event === 'save' || msg.event === 'export') {
          if (msg.data) {
            await handleFinishImage(
              msg.data,
              caption || (activeTab === 'molview' ? 'Công thức cấu tạo phân tử Hóa học' : 'Sơ đồ kỹ thuật Draw.io')
            );
          }
        } else if (msg.event === 'export_cancel') {
          setIsProcessing(false);
        }
      } catch {
        // Ignored non-json message
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [isOpen, caption, activeTab]);

  const requestDrawioExport = () => {
    if (!iframeRef.current?.contentWindow) return;
    setIsProcessing(true);
    iframeRef.current.contentWindow.postMessage(
      JSON.stringify({
        action: 'export',
        format: 'png',
        spin: 'Đang trích xuất ảnh vector...',
      }),
      '*'
    );
    setTimeout(() => {
      setIsProcessing((prev) => (prev ? false : false));
    }, 6000);
  };

  const handleFinishImage = async (dataUrl: string, finalCaption: string) => {
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
      formData.append('file', blob, `diagram-${Date.now()}.png`);

      const res = await fetch('/api/v1/documents/questions/upload-image', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        if (data.imageUrl) {
          onApplyImage(data.imageUrl, finalCaption);
          setIsProcessing(false);
          onClose();
          return;
        }
      }
    } catch (err) {
      console.warn('Lỗi lưu ảnh cục bộ fallback:', err);
    }

    onApplyImage(dataUrl, finalCaption);
    setIsProcessing(false);
    onClose();
  };

  const requestChemExport = () => {
    if (!chemIframeRef.current?.contentWindow) return;
    setIsProcessing(true);
    chemIframeRef.current.contentWindow.postMessage(
      JSON.stringify({
        action: 'export',
      }),
      '*'
    );
    setTimeout(() => {
      setIsProcessing((prev) => (prev ? false : false));
    }, 6000);
  };

  const handleApplyCurrentTab = () => {
    if (activeTab === 'drawio') {
      requestDrawioExport();
    } else if (activeTab === 'molview') {
      requestChemExport();
    }
  };

  const handleUploadLocalFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        handleFinishImage(reader.result as string, caption || file.name);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePasteFromClipboardButton = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.read) {
        const clipboardItems = await navigator.clipboard.read();
        for (const item of clipboardItems) {
          const imageType = item.types.find((t) => t.startsWith('image/'));
          if (imageType) {
            const blob = await item.getType(imageType);
            const reader = new FileReader();
            reader.onload = () => {
              handleFinishImage(
                reader.result as string,
                caption || 'Sơ đồ trích xuất từ bảng vẽ'
              );
            };
            reader.readAsDataURL(blob);
            return;
          }
        }
      }
      alert(
        'Không tìm thấy ảnh trong bộ nhớ tạm (Clipboard). Thầy/Cô vui lòng nhấn phím tắt Win + Shift + S để quét chụp vùng vẽ rồi nhấn lại nút này hoặc bấm Ctrl + V!'
      );
    } catch {
      alert(
        'Trình duyệt cần quyền truy cập Clipboard hoặc Thầy/Cô có thể nhấn trực tiếp phím Ctrl + V trên bàn phím để dán ảnh ngay!'
      );
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950 w-full h-full max-h-[100dvh] overflow-hidden select-none animate-in fade-in duration-100">
      {/* Top Header Bar with integrated tabs (Monochrome IDE style, ultra-thin 38px) */}
      <div className="h-10 px-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0 select-none">
        {/* Left: Studio Branding & Tab Bar */}
        <div className="flex items-center gap-3 overflow-x-auto scrollbar-none flex-1 min-w-0">
          <div className="flex items-center gap-2 shrink-0">
            <span className="w-2 h-2 rounded-full bg-teal-500"></span>
            <span className="text-xs font-bold tracking-wider text-slate-100 hidden sm:inline uppercase">
              Academic Studio
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
              PRO
            </span>
          </div>

          <div className="h-4 w-px bg-slate-700 shrink-0"></div>

          {/* Integrated Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
            <button
              onClick={() => setActiveTab('drawio')}
              className={`px-2.5 py-1 text-xs font-medium rounded flex items-center gap-1.5 transition-colors shrink-0 ${
                activeTab === 'drawio'
                  ? 'bg-slate-800 text-teal-300 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              Draw.io
            </button>

            <button
              onClick={() => setActiveTab('geogebra')}
              className={`px-2.5 py-1 text-xs font-medium rounded flex items-center gap-1.5 transition-colors shrink-0 ${
                activeTab === 'geogebra'
                  ? 'bg-slate-800 text-teal-300 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              GeoGebra
            </button>

            <button
              onClick={() => setActiveTab('desmos')}
              className={`px-2.5 py-1 text-xs font-medium rounded flex items-center gap-1.5 transition-colors shrink-0 ${
                activeTab === 'desmos'
                  ? 'bg-slate-800 text-teal-300 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              Desmos
            </button>

            <button
              onClick={() => setActiveTab('molview')}
              className={`px-2.5 py-1 text-xs font-medium rounded flex items-center gap-1.5 transition-colors shrink-0 ${
                activeTab === 'molview'
                  ? 'bg-slate-800 text-teal-300 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <Atom className="w-3.5 h-3.5" />
              Hóa học (JSME)
            </button>

            <button
              onClick={() => setActiveTab('circuit')}
              className={`px-2.5 py-1 text-xs font-medium rounded flex items-center gap-1.5 transition-colors shrink-0 ${
                activeTab === 'circuit'
                  ? 'bg-slate-800 text-teal-300 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              CircuitJS
            </button>
          </div>
        </div>

        {/* Right Window Controls */}
        <div className="flex items-center gap-1.5 shrink-0 pl-2">
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
            title="Đóng Studio (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Studio Workspace Canvas Area (Takes full remaining screen) */}
      <div className="flex-1 w-full min-h-0 bg-slate-950 overflow-hidden relative">
        {/* TAB 1: DRAW.IO FULL ENGINE */}
        {activeTab === 'drawio' && (
          <div className="w-full h-full flex flex-col relative">
            <iframe
              ref={iframeRef}
              title="Draw.io Professional Workspace"
              src="https://embed.diagrams.net/?embed=1&ui=atlas&spin=1&proto=json&lang=vi&libs=electrical;logic;flowchart;general;advanced"
              className="w-full h-full border-none bg-white"
            />
          </div>
        )}

        {/* TAB 2: GEOGEBRA GEOMETRY */}
        {activeTab === 'geogebra' && (
          <div className="w-full h-full flex flex-col relative">
            <div className="px-3 py-1.5 bg-slate-800/90 border-b border-slate-700 flex items-center justify-between text-xs text-slate-300 shrink-0">
              <span className="flex items-center gap-2">
                <Compass className="w-3.5 h-3.5 text-teal-400" />
                <span>GeoGebra Hình học & Không gian: Dựng hình xong, nhấn <kbd className="px-1 py-0.5 rounded bg-slate-700 font-mono text-[10px]">Win + Shift + S</kbd> chụp vùng vẽ rồi nhấn [Dán ảnh từ Clipboard] bên dưới.</span>
              </span>
            </div>
            <iframe
              title="GeoGebra Classic Geometry"
              src="https://www.geogebra.org/classic"
              className="w-full flex-1 border-none bg-white"
            />
          </div>
        )}

        {/* TAB 3: DESMOS GRAPHING (FULL EXPRESSION PANEL) */}
        {activeTab === 'desmos' && (
          <div className="w-full h-full flex flex-col relative">
            <div className="px-3 py-1.5 bg-slate-800/90 border-b border-slate-700 flex items-center justify-between text-xs text-slate-300 shrink-0">
              <span className="flex items-center gap-2">
                <TrendingUp className="w-3.5 h-3.5 text-teal-400" />
                <span>Desmos Khảo sát hàm số: Nhập biểu thức toán bất kỳ bên trái (vd: y = x³ - 3x). Nhấn <kbd className="px-1 py-0.5 rounded bg-slate-700 font-mono text-[10px]">Win + Shift + S</kbd> chụp rồi bấm [Dán ảnh từ Clipboard].</span>
              </span>
            </div>
            <iframe
              title="Desmos Graphing Calculator"
              src="https://www.desmos.com/calculator"
              className="w-full flex-1 border-none bg-white"
            />
          </div>
        )}

        {/* TAB 4: CHEMISTRY (JSME CDN + MOLVIEW 3D) */}
        {activeTab === 'molview' && (
          <div className="w-full h-full flex flex-col relative bg-slate-900">
            {/* Top Assistant Bar */}
            <div className="px-4 py-2 bg-slate-800/90 border-b border-slate-700 flex items-center justify-between text-xs text-slate-300 shrink-0">
              <span className="flex items-center gap-2">
                <Atom className="w-4 h-4 text-teal-400 shrink-0" />
                <span>
                  Bảng vẽ công thức phân tử Hóa học (JSME): Vẽ cấu trúc rồi bấm nút <strong>Áp dụng vào câu hỏi</strong> bên dưới để tự động căn cắt vùng vẽ chuẩn đẹp.
                </span>
              </span>
              <a
                href="https://molview.org"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-medium border border-slate-600 transition-colors shrink-0"
                title="Mở MolView.org để khám phá mô hình phân tử 3D không gian"
              >
                <ExternalLink className="w-3.5 h-3.5 text-teal-400" />
                <span>Mở MolView 3D</span>
              </a>
            </div>

            <div className="flex-1 w-full bg-white relative">
              <iframe
                ref={chemIframeRef}
                title="JSME Chemical Structure Editor"
                src="/chem-editor.html"
                className="w-full h-full border-none bg-white"
              />
            </div>
          </div>
        )}

        {/* TAB 5: CIRCUITJS SIMULATOR */}
        {activeTab === 'circuit' && (
          <div className="w-full h-full flex flex-col relative">
            <div className="px-3 py-1.5 bg-slate-800/90 border-b border-slate-700 flex items-center justify-between text-xs text-slate-300 shrink-0">
              <span className="flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-teal-400" />
                <span>CircuitJS Mô phỏng mạch điện: Sau khi thiết lập mạch, nhấn <kbd className="px-1 py-0.5 rounded bg-slate-700 font-mono text-[10px]">Win + Shift + S</kbd> rồi bấm [Dán ảnh từ Clipboard] bên dưới.</span>
              </span>
            </div>
            <iframe
              title="Falstad Circuit Simulator"
              src="https://www.falstad.com/circuit/circuitjs.html"
              className="w-full flex-1 border-none bg-white"
            />
          </div>
        )}
      </div>

      {/* Bottom Unified Action Dock (Comfortable height, never covered by taskbar) */}
      <div className="min-h-[50px] py-2 px-3 bg-slate-900 border-t border-slate-800 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5 shrink-0 z-30">
        <div className="flex-1 max-w-lg flex items-center gap-2 min-w-[200px]">
          <span className="text-xs text-slate-400 shrink-0">Chú thích sơ đồ:</span>
          <input
            type="text"
            placeholder="Ví dụ: Hình 1: Sơ đồ nguyên lý mạch dao động RLC..."
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            className="w-full px-2.5 py-1.5 rounded bg-slate-800 border border-slate-700 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500"
          />
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <span className="text-[11px] text-slate-400 hidden lg:inline">
            Dán ảnh bằng <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-mono text-[10px]">Ctrl + V</kbd>
          </span>

          <button
            type="button"
            onClick={handlePasteFromClipboardButton}
            className="px-3 py-1.5 rounded bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Dán nhanh ảnh vừa chụp từ bộ nhớ tạm"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Dán ảnh từ Clipboard (Ctrl + V)</span>
          </button>

          <label className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium cursor-pointer transition-colors flex items-center gap-1.5">
            <Upload className="w-3.5 h-3.5 text-slate-400" />
            <span>Tải file ảnh</span>
            <input type="file" accept="image/*" className="hidden" onChange={handleUploadLocalFile} />
          </label>

          {(activeTab === 'drawio' || activeTab === 'molview') && (
            <button
              type="button"
              onClick={handleApplyCurrentTab}
              disabled={isProcessing}
              className="px-4 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Đang xuất ảnh...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Áp dụng vào câu hỏi</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
export default DiagramStudioModal;
