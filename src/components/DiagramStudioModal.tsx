import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  Check,
  Cpu,
  TrendingUp,
  Compass,
  Atom,
  Zap,
  Layers,
  Upload,
  Camera,
  Maximize2,
  Minimize2,
  ExternalLink,
  Info,
  Sliders,
  RefreshCw,
} from 'lucide-react';

export interface DiagramStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyImage: (imageUrl: string, caption?: string) => void;
  initialCaption?: string;
  initialImageUrl?: string;
}

export type StudioTab = 'drawio' | 'geogebra' | 'desmos' | 'molview' | 'circuit' | 'curve_engine';

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
  // Default to true for full-screen desktop software experience
  const [isFullscreen, setIsFullscreen] = useState(true);

  // ── Plotter State ────────────────────────────────────────────────────────
  const [plotType, setPlotType] = useState<'sine' | 'damped' | 'parabola' | 'supply_demand'>('sine');
  const [paramA, setParamA] = useState<number>(3);
  const [paramB, setParamB] = useState<number>(2);
  const [paramC, setParamC] = useState<number>(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // ── Draw.io Iframe State ─────────────────────────────────────────────────
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

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
            await handleFinishImage(msg.data, caption || 'Sơ đồ kỹ thuật Draw.io');
          }
        }
      } catch {
        // Ignored non-json message
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [isOpen, caption]);

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
  };

  // ── 2. ACADEMIC FUNCTION & CURVE PLOTTER ─────────────────────────────────
  const renderPlot = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Clean white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);

    if (plotType === 'supply_demand') {
      // Economics Supply & Demand Equilibrium
      const originX = 70;
      const originY = h - 60;

      // Coordinate axes
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1.75;
      ctx.beginPath();
      // O P (Price axis)
      ctx.moveTo(originX, originY);
      ctx.lineTo(originX, 40);
      // Arrow P
      ctx.lineTo(originX - 5, 50);
      ctx.moveTo(originX, 40);
      ctx.lineTo(originX + 5, 50);

      // O Q (Quantity axis)
      ctx.moveTo(originX, originY);
      ctx.lineTo(w - 50, originY);
      // Arrow Q
      ctx.lineTo(w - 60, originY - 5);
      ctx.moveTo(w - 50, originY);
      ctx.lineTo(w - 60, originY + 5);
      ctx.stroke();

      // Axis labels
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.fillText('P (Giá)', originX - 45, 50);
      ctx.fillText('Q (Sản lượng)', w - 100, originY + 30);
      ctx.fillText('O', originX - 18, originY + 18);

      // Supply curve (S)
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      const sStart = { x: originX + 40, y: originY - 40 };
      const sEnd = { x: w - 120, y: 70 };
      ctx.moveTo(sStart.x, sStart.y);
      ctx.lineTo(sEnd.x, sEnd.y);
      ctx.stroke();
      ctx.fillStyle = '#0284c7';
      ctx.font = 'bold 13px system-ui';
      ctx.fillText('S (Cung)', sEnd.x + 8, sEnd.y + 5);

      // Demand curve (D)
      ctx.strokeStyle = '#e11d48';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      const dStart = { x: originX + 40, y: 80 };
      const dEnd = { x: w - 120, y: originY - 50 };
      ctx.moveTo(dStart.x, dStart.y);
      ctx.lineTo(dEnd.x, dEnd.y);
      ctx.stroke();
      ctx.fillStyle = '#e11d48';
      ctx.fillText('D (Cầu)', dEnd.x + 8, dEnd.y + 5);

      // Equilibrium point E (Intersection)
      const eqX = (sStart.x + sEnd.x + dStart.x + dEnd.x) / 4 + 10;
      const eqY = (sStart.y + sEnd.y + dStart.y + dEnd.y) / 4 - 5;

      // Dashed lines to axes
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1.25;
      ctx.beginPath();
      ctx.moveTo(eqX, eqY);
      ctx.lineTo(originX, eqY);
      ctx.moveTo(eqX, eqY);
      ctx.lineTo(eqX, originY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Point E dot
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(eqX, eqY, 4.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = 'bold 13px system-ui';
      ctx.fillText('E (Điểm cân bằng)', eqX + 10, eqY - 8);
      ctx.font = '12px system-ui';
      ctx.fillText('P*', originX - 25, eqY + 4);
      ctx.fillText('Q*', eqX - 8, originY + 20);
    } else {
      // Cartesian Coordinate System (Oxy)
      const originX = w / 2;
      const originY = h / 2;
      const scaleX = 40;
      const scaleY = 35;

      // Grid
      ctx.strokeStyle = '#f1f5f9';
      ctx.lineWidth = 1;
      for (let x = originX % scaleX; x < w; x += scaleX) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = originY % scaleY; y < h; y += scaleY) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Ox and Oy Axes
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1.75;
      ctx.beginPath();
      ctx.moveTo(30, originY);
      ctx.lineTo(w - 30, originY);
      ctx.lineTo(w - 40, originY - 5);
      ctx.moveTo(w - 30, originY);
      ctx.lineTo(w - 40, originY + 5);

      ctx.moveTo(originX, h - 30);
      ctx.lineTo(originX, 30);
      ctx.lineTo(originX - 5, 40);
      ctx.moveTo(originX, 30);
      ctx.lineTo(originX + 5, 40);
      ctx.stroke();

      // Axis Marks
      ctx.fillStyle = '#475569';
      ctx.font = '11px system-ui';
      ctx.fillText('x', w - 25, originY + 16);
      ctx.fillText('y', originX + 12, 35);
      ctx.fillText('O', originX - 14, originY + 16);

      // Draw Main Curve
      ctx.strokeStyle = '#008689';
      ctx.lineWidth = 2.5;
      ctx.beginPath();

      let isFirst = true;
      for (let px = 30; px < w - 30; px += 1.5) {
        const xVal = (px - originX) / scaleX;
        let yVal = 0;

        if (plotType === 'sine') {
          yVal = paramA * Math.sin(paramB * xVal + (paramC * Math.PI) / 180);
        } else if (plotType === 'damped') {
          yVal = paramA * Math.exp(-0.35 * Math.abs(xVal)) * Math.cos(paramB * xVal);
        } else if (plotType === 'parabola') {
          yVal = 0.4 * (xVal - paramC) * (xVal - paramC) - paramA;
        }

        const py = originY - yVal * scaleY;
        if (py >= 20 && py <= h - 20) {
          if (isFirst) {
            ctx.moveTo(px, py);
            isFirst = false;
          } else {
            ctx.lineTo(px, py);
          }
        } else {
          isFirst = true;
        }
      }
      ctx.stroke();

      // Formula Label Box
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 12px system-ui';
      let title = '';
      if (plotType === 'sine') title = `x(t) = ${paramA} · cos(${paramB}t + ${paramC}°)`;
      else if (plotType === 'damped') title = `x(t) = ${paramA} · e^(-0.35t) · cos(${paramB}t)`;
      else if (plotType === 'parabola') title = `y = 0.4(x - ${paramC})² - ${paramA}`;
      ctx.fillText(title, 45, 45);
    }
  }, [plotType, paramA, paramB, paramC]);

  useEffect(() => {
    if (activeTab === 'curve_engine') {
      renderPlot();
    }
  }, [activeTab, renderPlot]);

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

  const handleApplyCurrentTab = () => {
    if (activeTab === 'drawio') {
      requestDrawioExport();
    } else if (activeTab === 'curve_engine') {
      const canvas = canvasRef.current;
      if (canvas) {
        const dataUrl = canvas.toDataURL('image/png');
        const cap =
          caption.trim() ||
          (plotType === 'supply_demand'
            ? 'Đồ thị mô hình Cân bằng Cung - Cầu thị trường'
            : plotType === 'sine'
            ? 'Đồ thị dao động điều hòa theo thời gian'
            : plotType === 'damped'
            ? 'Đồ thị dao động tắt dần'
            : 'Đồ thị hàm số bậc hai');
        handleFinishImage(dataUrl, cap);
      }
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950 w-screen h-screen overflow-hidden animate-in fade-in duration-100">
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

            <button
              onClick={() => setActiveTab('curve_engine')}
              className={`px-2.5 py-1 text-xs font-medium rounded flex items-center gap-1.5 transition-colors shrink-0 ${
                activeTab === 'curve_engine'
                  ? 'bg-slate-800 text-teal-300 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Đồ thị Oxy &amp; Kinh tế
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
      <div className="flex-1 w-full bg-slate-950 overflow-hidden relative">
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
            <iframe
              title="GeoGebra Classic Geometry"
              src="https://www.geogebra.org/classic"
              className="w-full h-full border-none bg-white"
            />
          </div>
        )}

        {/* TAB 3: DESMOS GRAPHING */}
        {activeTab === 'desmos' && (
          <div className="w-full h-full flex flex-col relative">
            <iframe
              title="Desmos Graphing Calculator"
              src="https://www.desmos.com/calculator?embed"
              className="w-full h-full border-none bg-white"
            />
          </div>
        )}

        {/* TAB 4: CHEMISTRY (EMBEDDABLE JSME + MOLVIEW DIRECT TAB) */}
        {activeTab === 'molview' && (
          <div className="w-full h-full flex flex-col relative bg-slate-900">
            {/* Top Assistant Bar */}
            <div className="px-4 py-2 bg-slate-800/90 border-b border-slate-700 flex items-center justify-between text-xs text-slate-300 shrink-0">
              <span className="flex items-center gap-2">
                <Atom className="w-4 h-4 text-teal-400" />
                <span>Trình vẽ cấu trúc phân tử JSME (Hỗ trợ nhúng không chặn CORS).</span>
              </span>
              <a
                href="https://molview.org"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-teal-600 hover:bg-teal-500 text-white font-medium shadow-xs transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Mở MolView.org toàn màn hình</span>
              </a>
            </div>

            <div className="flex-1 w-full bg-white relative">
              <iframe
                title="JSME Chemical Structure Editor"
                src="https://peter-ertl.com/jsme/JSME_2020-06-11/JSME.html"
                className="w-full h-full border-none bg-white"
              />
            </div>
          </div>
        )}

        {/* TAB 5: CIRCUITJS SIMULATOR */}
        {activeTab === 'circuit' && (
          <div className="w-full h-full flex flex-col relative">
            <iframe
              title="Falstad Circuit Simulator"
              src="https://www.falstad.com/circuit/circuitjs.html"
              className="w-full h-full border-none bg-white"
            />
          </div>
        )}

        {/* TAB 6: CURVE ENGINE */}
        {activeTab === 'curve_engine' && (
          <div className="w-full h-full flex flex-col md:flex-row bg-slate-900">
            <div className="w-full md:w-80 p-4 border-r border-slate-800 bg-slate-900 text-slate-200 flex flex-col gap-4 shrink-0 overflow-y-auto">
              <div>
                <label className="text-[11px] font-mono uppercase text-slate-400 block mb-1">
                  Mô hình khảo thí
                </label>
                <select
                  value={plotType}
                  onChange={(e) => setPlotType(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 rounded bg-slate-800 border border-slate-700 text-xs text-slate-100 focus:outline-none focus:border-teal-500"
                >
                  <option value="sine">Dao động điều hòa (Vật lý / Giải tích)</option>
                  <option value="damped">Dao động tắt dần (Cơ học / Kỹ thuật)</option>
                  <option value="parabola">Đồ thị Parabol y = ax² + bx + c</option>
                  <option value="supply_demand">Cân bằng Cung - Cầu (Kinh tế học)</option>
                </select>
              </div>

              {plotType !== 'supply_demand' && (
                <div className="space-y-3 pt-2 border-t border-slate-800">
                  <div>
                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                      <span>Biên độ / Hệ số A</span>
                      <span className="font-mono text-teal-400">{paramA}</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="6"
                      step="0.5"
                      value={paramA}
                      onChange={(e) => setParamA(parseFloat(e.target.value))}
                      className="w-full accent-teal-500"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                      <span>Tần số góc / Tốc độ biến thiên B</span>
                      <span className="font-mono text-teal-400">{paramB}</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="5"
                      step="0.5"
                      value={paramB}
                      onChange={(e) => setParamB(parseFloat(e.target.value))}
                      className="w-full accent-teal-500"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                      <span>Độ lệch pha / Dịch chuyển C</span>
                      <span className="font-mono text-teal-400">{paramC}</span>
                    </div>
                    <input
                      type="range"
                      min="-180"
                      max="180"
                      step="15"
                      value={paramC}
                      onChange={(e) => setParamC(parseFloat(e.target.value))}
                      className="w-full accent-teal-500"
                    />
                  </div>
                </div>
              )}

              <div className="mt-auto pt-3 border-t border-slate-800 text-[11px] text-slate-400">
                Đồ thị được tự động kết xuất ở độ phân giải 300 DPI theo tiêu chuẩn in ấn đề thi của Bộ GD&amp;ĐT.
              </div>
            </div>

            <div className="flex-1 p-4 flex items-center justify-center bg-slate-950">
              <div className="bg-white rounded-lg shadow-lg border border-slate-700 overflow-hidden p-2">
                <canvas
                  ref={canvasRef}
                  width={750}
                  height={500}
                  className="max-w-full max-h-[75vh] object-contain block bg-white"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Unified Action Dock (Ultra-compact 42px) */}
      <div className="h-11 px-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between gap-3 shrink-0">
        <div className="flex-1 max-w-lg flex items-center gap-2">
          <span className="text-xs text-slate-400 shrink-0">Chú thích sơ đồ:</span>
          <input
            type="text"
            placeholder="Ví dụ: Hình 1: Sơ đồ nguyên lý mạch dao động RLC..."
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            className="w-full px-2.5 py-1 rounded bg-slate-800 border border-slate-700 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500"
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] text-slate-400 hidden md:inline">
            Dán ảnh bằng <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-mono text-[10px]">Ctrl + V</kbd>
          </span>

          <label className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium cursor-pointer transition-colors flex items-center gap-1.5">
            <Upload className="w-3.5 h-3.5 text-slate-400" />
            <span>Tải file ảnh</span>
            <input type="file" accept="image/*" className="hidden" onChange={handleUploadLocalFile} />
          </label>

          {(activeTab === 'drawio' || activeTab === 'curve_engine') && (
            <button
              type="button"
              onClick={handleApplyCurrentTab}
              disabled={isProcessing}
              className="px-4 py-1.5 rounded bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Đang trích xuất...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Áp dụng vào câu hỏi</span>
                </>
              )}
            </button>
          )}

          {activeTab !== 'drawio' && activeTab !== 'curve_engine' && (
            <label className="px-4 py-1.5 rounded bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors">
              <Camera className="w-3.5 h-3.5" />
              <span>Chèn ảnh đã xuất / chụp</span>
              <input type="file" accept="image/*" className="hidden" onChange={handleUploadLocalFile} />
            </label>
          )}
        </div>
      </div>
    </div>
  );
};
export default DiagramStudioModal;
