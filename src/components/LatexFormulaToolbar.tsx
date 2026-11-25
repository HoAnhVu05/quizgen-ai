import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Sigma, ChevronDown, ChevronUp, Check, X, Search, Pin, PinOff } from 'lucide-react';
import { MathRenderer } from './MathRenderer';

export interface LatexFormulaToolbarProps {
  onInsert: (snippet: string) => void;
  className?: string;
  compact?: boolean;
}

interface FormulaItem {
  label: string;
  snippet: string;
  description: string;
}

const QUICK_COMMONS: FormulaItem[] = [
  { label: 'a/b', snippet: '$\\frac{a}{b}$', description: 'Phân số' },
  { label: 'x²', snippet: '$x^{2}$', description: 'Số mũ / Lũy thừa' },
  { label: 'x₁', snippet: '$x_{1}$', description: 'Chỉ số dưới' },
  { label: '√x', snippet: '$\\sqrt{x}$', description: 'Căn bậc hai' },
  { label: '∫', snippet: '$\\int f(x) dx$', description: 'Tích phân' },
  { label: '∑', snippet: '$\\sum_{i=1}^{n} x_i$', description: 'Tổng Sigma' },
  { label: 'lim', snippet: '$\\lim_{x \\to 0} f(x)$', description: 'Giới hạn' },
  { label: '±', snippet: '$\\pm$', description: 'Cộng trừ' },
  { label: '≈', snippet: '$\\approx$', description: 'Xấp xỉ' },
  { label: '≠', snippet: '$\\neq$', description: 'Khác' },
  { label: 'α', snippet: '$\\alpha$', description: 'Alpha' },
  { label: 'β', snippet: '$\\beta$', description: 'Beta' },
  { label: 'Δ', snippet: '$\\Delta$', description: 'Delta' },
  { label: 'Ω', snippet: '$\\Omega$', description: 'Ohm / Omega' },
  { label: 'λ', snippet: '$\\lambda$', description: 'Bước sóng Lambda' },
  { label: 'π', snippet: '$\\pi$', description: 'Số Pi' },
  { label: '→', snippet: '$\\rightarrow$', description: 'Suy ra / Phản ứng' },
  { label: '⇌', snippet: '$\\rightleftharpoons$', description: 'Thuận nghịch' },
  { label: 'O(n)', snippet: '$\\mathcal{O}(n \\log n)$', description: 'Độ phức tạp' },
];

const FORMULA_CATEGORIES: { name: string; items: FormulaItem[] }[] = [
  {
    name: 'Toán học & Giải tích',
    items: [
      { label: 'a/b', snippet: '$\\frac{a}{b}$', description: 'Phân số' },
      { label: 'x²', snippet: '$x^{2}$', description: 'Số mũ' },
      { label: 'x₁', snippet: '$x_{1}$', description: 'Chỉ số dưới' },
      { label: '√x', snippet: '$\\sqrt{x}$', description: 'Căn bậc hai' },
      { label: 'ⁿ√x', snippet: '$\\sqrt[n]{x}$', description: 'Căn bậc n' },
      { label: '∫ dx', snippet: '$\\int f(x) dx$', description: 'Tích phân bất định' },
      { label: '∫ₐᵇ', snippet: '$\\int_{a}^{b} f(x) dx$', description: 'Tích phân xác định' },
      { label: '∑', snippet: '$\\sum_{i=1}^{n} x_i$', description: 'Tổng Sigma' },
      { label: '∏', snippet: '$\\prod_{i=1}^{n} a_i$', description: 'Tích Pi' },
      { label: 'lim', snippet: '$\\lim_{x \\to 0} f(x)$', description: 'Giới hạn' },
      { label: 'df/dx', snippet: '$\\frac{df}{dx}$', description: 'Đạo hàm' },
      { label: '∂f/∂x', snippet: '$\\frac{\\partial f}{\\partial x}$', description: 'Đạo hàm riêng' },
      { label: '∞', snippet: '$\\infty$', description: 'Vô cực' },
      { label: 'Vector', snippet: '$\\vec{v} = (x, y)$', description: 'Vector' },
      { label: 'Ma trận', snippet: '$\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}$', description: 'Ma trận vuông' },
      { label: 'Định thức', snippet: '$\\begin{vmatrix} a & b \\\\ c & d \\end{vmatrix}$', description: 'Định thức ma trận' },
    ],
  },
  {
    name: 'Vật lý & Kỹ thuật',
    items: [
      { label: 'Dao động x(t)', snippet: '$x(t) = A \\cos(\\omega t + \\varphi)$', description: 'Phương trình dao động' },
      { label: 'Vận tốc v', snippet: '$v = -\\omega A \\sin(\\omega t + \\varphi)$', description: 'Vận tốc dao động' },
      { label: 'Gia tốc a', snippet: '$a = -\\omega^2 x$', description: 'Gia tốc dao động' },
      { label: 'Trở kháng Z', snippet: '$Z = \\sqrt{R^2 + (Z_L - Z_C)^2}$', description: 'Tổng trở mạch RLC' },
      { label: 'Tần số góc ω', snippet: '$\\omega = \\frac{2\\pi}{T} = 2\\pi f$', description: 'Tần số góc' },
      { label: 'Định luật II', snippet: '$\\vec{F} = m\\vec{a}$', description: 'Định luật Newton' },
      { label: 'Nhiệt dung Q', snippet: '$Q = mc\\Delta t$', description: 'Nhiệt lượng' },
      { label: 'Điện trở Ω', snippet: '$R = 100\\ \\Omega$', description: 'Đơn vị Ohm' },
      { label: 'Tụ điện μF', snippet: '$C = 10\\ \\mu\\text{F}$', description: 'Điện dung Microfarad' },
      { label: 'Cuộn cảm mH', snippet: '$L = 20\\ \\text{mH}$', description: 'Độ tự cảm Henry' },
    ],
  },
  {
    name: 'Hóa học & Sinh học',
    items: [
      { label: 'Mũi tên →', snippet: '$\\rightarrow$', description: 'Phản ứng một chiều' },
      { label: 'Thuận nghịch ⇌', snippet: '$\\rightleftharpoons$', description: 'Phản ứng thuận nghịch' },
      { label: 'Khí bay lên ↑', snippet: '$\\uparrow$', description: 'Chất khí thoát ra' },
      { label: 'Kết tủa ↓', snippet: '$\\downarrow$', description: 'Chất kết tủa' },
      { label: 'Nhiệt độ t°', snippet: '$\\xrightarrow{t^\\circ}$', description: 'Xúc tác nhiệt độ' },
      { label: 'Nước H₂O', snippet: '$\\text{H}_2\\text{O}$', description: 'Phân tử nước' },
      { label: 'Axit H₂SO₄', snippet: '$\\text{H}_2\\text{SO}_4$', description: 'Axit Sunfuric' },
      { label: 'Nồng độ mol', snippet: '$C_M = \\frac{n}{V}\\text{ (mol/L)}$', description: 'Nồng độ mol/lít' },
      { label: 'Biến thiên Enthalpy', snippet: '$\\Delta H^\\circ_{298}$', description: 'Nhiệt tạo thành' },
      { label: 'pH dung dịch', snippet: '$\\text{pH} = -\\log[\\text{H}^+]$', description: 'Độ pH dung dịch' },
    ],
  },
  {
    name: 'Tin học & Logic',
    items: [
      { label: 'Hội (AND) ∧', snippet: '$A \\land B$', description: 'Phép hội logic AND' },
      { label: 'Tuyển (OR) ∨', snippet: '$A \\lor B$', description: 'Phép tuyển logic OR' },
      { label: 'Phủ định (NOT) ¬', snippet: '$\\neg A$', description: 'Phủ định logic NOT' },
      { label: 'Tuyển loại ⊕', snippet: '$A \\oplus B$', description: 'Phép XOR' },
      { label: 'Kéo theo ⇒', snippet: '$A \\Rightarrow B$', description: 'Phép suy luận kéo theo' },
      { label: 'Tương đương ⇔', snippet: '$A \\Leftrightarrow B$', description: 'Tương đương logic' },
      { label: 'Với mọi ∀', snippet: '$\\forall x \\in X$', description: 'Lượng từ với mọi' },
      { label: 'Tồn tại ∃', snippet: '$\\exists x \\in X$', description: 'Lượng từ tồn tại' },
      { label: 'Độ phức tạp O(n)', snippet: '$\\mathcal{O}(n \\log n)$', description: 'Độ phức tạp Big-O' },
      { label: 'Thuộc tập ∈', snippet: '$x \\in \\mathbb{R}$', description: 'Phần tử thuộc tập hợp' },
    ],
  },
  {
    name: 'Kinh tế & Thống kê',
    items: [
      { label: 'Trung bình X̄', snippet: '$\\bar{X} = \\frac{1}{n}\\sum_{i=1}^{n} X_i$', description: 'Số trung bình mẫu' },
      { label: 'Phương sai s²', snippet: '$s^2 = \\frac{1}{n-1}\\sum (X_i - \\bar{X})^2$', description: 'Phương sai mẫu' },
      { label: 'Kỳ vọng E(X)', snippet: '$\\mathbb{E}[X]$', description: 'Kỳ vọng toán' },
      { label: 'Độ lệch chuẩn σ', snippet: '$\\sigma = \\sqrt{\\text{Var}(X)}$', description: 'Độ lệch chuẩn' },
      { label: 'Hồi quy ŷ', snippet: '$\\hat{y} = \\beta_0 + \\beta_1 x$', description: 'Phương trình hồi quy' },
      { label: 'Hệ số tương quan r', snippet: '$r_{xy}$', description: 'Hệ số tương quan Pearson' },
      { label: 'Độ co giãn Ed', snippet: '$E_d = \\frac{\\%\\Delta Q}{\\%\\Delta P}$', description: 'Độ co giãn của cầu theo giá' },
      { label: 'Điểm cân bằng E₀', snippet: '$E_0(P^*, Q^*)$', description: 'Cân bằng thị trường' },
    ],
  },
  {
    name: 'Ký tự Hy Lạp',
    items: [
      { label: 'α (alpha)', snippet: '$\\alpha$', description: 'Alpha' },
      { label: 'β (beta)', snippet: '$\\beta$', description: 'Beta' },
      { label: 'γ (gamma)', snippet: '$\\gamma$', description: 'Gamma' },
      { label: 'Δ (Delta)', snippet: '$\\Delta$', description: 'Delta lớn' },
      { label: 'θ (theta)', snippet: '$\\theta$', description: 'Theta' },
      { label: 'λ (lambda)', snippet: '$\\lambda$', description: 'Lambda' },
      { label: 'μ (mu)', snippet: '$\\mu$', description: 'Mu (vi lượng)' },
      { label: 'π (pi)', snippet: '$\\pi$', description: 'Số Pi' },
      { label: 'σ (sigma)', snippet: '$\\sigma$', description: 'Sigma nhỏ' },
      { label: 'ω (omega)', snippet: '$\\omega$', description: 'Omega nhỏ' },
      { label: 'Ω (Ohm)', snippet: '$\\Omega$', description: 'Ohm / Omega lớn' },
      { label: 'φ (phi)', snippet: '$\\varphi$', description: 'Góc pha Phi' },
    ],
  },
];

export const LatexFormulaToolbar: React.FC<LatexFormulaToolbarProps> = ({
  onInsert,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [activeCategory, setActiveCategory] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const handleInsert = (snippet: string) => {
    onInsert(snippet);
    setCopiedSnippet(snippet);
    setTimeout(() => setCopiedSnippet(null), 900);
  };

  // Close unpinned popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!isPinned && panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen && !isPinned) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, isPinned]);

  // Search filtered results across ALL categories
  const filteredSearchResults = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const q = searchQuery.toLowerCase().trim();
    const matches: FormulaItem[] = [];
    for (const cat of FORMULA_CATEGORIES) {
      for (const item of cat.items) {
        if (
          item.label.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          item.snippet.toLowerCase().includes(q)
        ) {
          matches.push(item);
        }
      }
    }
    return matches;
  }, [searchQuery]);

  const shouldShowPanel = isOpen || isPinned;

  return (
    <div className={`space-y-1.5 ${className}`}>
      {/* Main Single-line Bar */}
      <div className="flex items-center justify-between gap-1.5 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs">
        {/* Left: Quick Symbols Carousel */}
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-0.5 flex-1">
          <span className="flex items-center gap-1 text-[11px] font-mono uppercase text-slate-500 font-bold shrink-0 mr-1 select-none">
            <Sigma className="w-3.5 h-3.5 text-[#008689]" />
            LaTeX:
          </span>

          {QUICK_COMMONS.map((item, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleInsert(item.snippet)}
              title={item.description}
              className="px-2 py-0.5 rounded bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 font-mono text-[11px] transition-colors shrink-0 cursor-pointer shadow-2xs active:scale-95 flex items-center justify-center min-w-[24px]"
            >
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        {/* Right: Expand / Pin Action Buttons */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setIsPinned(!isPinned)}
            title={isPinned ? 'Bỏ ghim bảng phím ảo' : 'Ghim bảng phím ký hiệu cố định'}
            className={`p-1.5 rounded text-xs transition-colors cursor-pointer border ${
              isPinned
                ? 'bg-teal-50 border-teal-300 text-[#008689]'
                : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-500'
            }`}
          >
            {isPinned ? <Pin className="w-3.5 h-3.5" /> : <PinOff className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium border transition-colors cursor-pointer ${
              shouldShowPanel
                ? 'bg-[#008689] text-white border-[#008689]'
                : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
            }`}
          >
            <span>Bảng ký hiệu</span>
            {shouldShowPanel ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Expandable Virtual Academic Keypad (Pinned or Popover) */}
      {shouldShowPanel && (
        <div
          ref={panelRef}
          className={`bg-white rounded-xl border border-slate-200 shadow-md p-3 space-y-2.5 ${
            isPinned ? 'w-full' : 'w-full'
          } animate-in fade-in duration-100`}
        >
          {/* Search Bar + Controls */}
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm nhanh: alpha, tích phân, ohm, căn, lim..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-7 py-1 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-[#008689]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="text-[11px] hidden sm:inline">
                {isPinned ? 'Đang ghim cố định' : 'Bấm liên tiếp ký hiệu để chèn'}
              </span>
              {!isPinned && (
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* If Search Active: Show search results */}
          {filteredSearchResults !== null ? (
            <div>
              <div className="text-[11px] font-semibold text-slate-500 mb-1.5">
                Kết quả tìm kiếm ({filteredSearchResults.length} ký hiệu):
              </div>
              {filteredSearchResults.length === 0 ? (
                <div className="py-4 text-center text-xs text-slate-400">
                  Không tìm thấy ký hiệu phù hợp với "{searchQuery}"
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-1.5 max-h-48 overflow-y-auto p-1 scrollbar-thin">
                  {filteredSearchResults.map((item, idx) => {
                    const isCopied = copiedSnippet === item.snippet;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleInsert(item.snippet)}
                        title={item.description}
                        className="group relative flex flex-col items-center justify-center p-1.5 rounded-lg bg-slate-50 hover:bg-teal-50 border border-slate-200 hover:border-teal-300 transition-colors cursor-pointer text-center min-h-[46px]"
                      >
                        <div className="text-xs font-semibold text-slate-800 group-hover:text-[#008689] pointer-events-none mb-0.5">
                          <MathRenderer content={item.snippet} />
                        </div>
                        <div className="text-[9px] text-slate-400 truncate max-w-full">
                          {item.label}
                        </div>
                        {isCopied && (
                          <span className="absolute inset-0 flex items-center justify-center bg-[#008689] text-white text-[10px] rounded-lg font-bold">
                            <Check className="w-3 h-3 mr-0.5" /> Đã chèn
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* Category Tabs + Grid */
            <>
              <div className="flex items-center gap-1 border-b border-slate-100 pb-1.5 overflow-x-auto scrollbar-none">
                {FORMULA_CATEGORIES.map((cat, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveCategory(idx)}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                      activeCategory === idx
                        ? 'bg-teal-50 text-[#008689] border border-teal-200 font-semibold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-transparent'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-1.5 max-h-48 overflow-y-auto p-1 scrollbar-thin">
                {FORMULA_CATEGORIES[activeCategory].items.map((item, idx) => {
                  const isCopied = copiedSnippet === item.snippet;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleInsert(item.snippet)}
                      title={item.description}
                      className="group relative flex flex-col items-center justify-center p-1.5 rounded-lg bg-slate-50 hover:bg-teal-50 border border-slate-200 hover:border-teal-300 transition-colors cursor-pointer text-center min-h-[46px]"
                    >
                      <div className="text-xs font-semibold text-slate-800 group-hover:text-[#008689] pointer-events-none mb-0.5">
                        <MathRenderer content={item.snippet} />
                      </div>
                      <div className="text-[9px] text-slate-400 truncate max-w-full">
                        {item.description}
                      </div>
                      {isCopied && (
                        <span className="absolute inset-0 flex items-center justify-center bg-[#008689] text-white text-[10px] rounded-lg font-bold">
                          <Check className="w-3 h-3 mr-0.5" /> Đã chèn
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100">
            <span>Bấm vào ký tự để chèn vào vị trí con trỏ đang soạn thảo</span>
            <span className="font-mono text-slate-400">$...$ công thức toán</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default LatexFormulaToolbar;
