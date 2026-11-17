import React, { useState } from 'react';
import { Sigma, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';
import { MathRenderer } from './MathRenderer';

interface LatexFormulaToolbarProps {
  onInsert: (snippet: string) => void;
  className?: string;
  compact?: boolean;
}

interface FormulaItem {
  label: string;
  snippet: string;
  description: string;
}

const FORMULA_CATEGORIES: { name: string; items: FormulaItem[] }[] = [
  {
    name: 'Cơ bản & Đại số',
    items: [
      { label: 'a/b', snippet: '$\\frac{a}{b}$', description: 'Phân số' },
      { label: 'x²', snippet: '$x^{2}$', description: 'Lũy thừa / Số mũ' },
      { label: 'x₁', snippet: '$x_{1}$', description: 'Chỉ số dưới' },
      { label: '√x', snippet: '$\\sqrt{x}$', description: 'Căn bậc hai' },
      { label: 'ⁿ√x', snippet: '$\\sqrt[n]{x}$', description: 'Căn bậc n' },
      { label: '±', snippet: '$\\pm$', description: 'Cộng trừ' },
      { label: '×', snippet: '$\\times$', description: 'Dấu nhân' },
      { label: '÷', snippet: '$\\div$', description: 'Dấu chia' },
    ]
  },
  {
    name: 'Giải tích & Chuỗi',
    items: [
      { label: '∫ dx', snippet: '$\\int f(x) dx$', description: 'Tích phân bất định' },
      { label: '∫ₐᵇ', snippet: '$\\int_{a}^{b} f(x) dx$', description: 'Tích phân xác định' },
      { label: '∑', snippet: '$\\sum_{i=1}^{n} x_i$', description: 'Tổng Sigma' },
      { label: '∏', snippet: '$\\prod_{i=1}^{n} a_i$', description: 'Tích Pi' },
      { label: 'lim', snippet: '$\\lim_{x \\to 0} f(x)$', description: 'Giới hạn' },
      { label: 'df/dx', snippet: '$\\frac{df}{dx}$', description: 'Đạo hàm' },
      { label: '∂f/∂x', snippet: '$\\frac{\\partial f}{\\partial x}$', description: 'Đạo hàm riêng' },
      { label: '∞', snippet: '$\\infty$', description: 'Vô cực' },
    ]
  },
  {
    name: 'Ký tự Hy Lạp',
    items: [
      { label: 'α', snippet: '$\\alpha$', description: 'Alpha' },
      { label: 'β', snippet: '$\\beta$', description: 'Beta' },
      { label: 'γ', snippet: '$\\gamma$', description: 'Gamma' },
      { label: 'Δ', snippet: '$\\Delta$', description: 'Delta lớn' },
      { label: 'θ', snippet: '$\\theta$', description: 'Theta' },
      { label: 'λ', snippet: '$\\lambda$', description: 'Lambda' },
      { label: 'μ', snippet: '$\\mu$', description: 'Mu (vi lượng)' },
      { label: 'π', snippet: '$\\pi$', description: 'Số Pi' },
      { label: 'σ', snippet: '$\\sigma$', description: 'Sigma nhỏ' },
      { label: 'ω', snippet: '$\\omega$', description: 'Omega nhỏ' },
      { label: 'Ω', snippet: '$\\Omega$', description: 'Ohm / Omega lớn' },
    ]
  },
  {
    name: 'Quan hệ & Logic',
    items: [
      { label: '≠', snippet: '$\\neq$', description: 'Khác' },
      { label: '≈', snippet: '$\\approx$', description: 'Xấp xỉ' },
      { label: '≤', snippet: '$\\le$', description: 'Nhỏ hơn hoặc bằng' },
      { label: '≥', snippet: '$\\ge$', description: 'Lớn hơn hoặc bằng' },
      { label: '∈', snippet: '$\\in$', description: 'Thuộc tập hợp' },
      { label: '∉', snippet: '$\\notin$', description: 'Không thuộc' },
      { label: '⊂', snippet: '$\\subset$', description: 'Tập con' },
      { label: '→', snippet: '$\\rightarrow$', description: 'Mũi tên suy ra' },
      { label: '⇒', snippet: '$\\Rightarrow$', description: 'Kéo theo' },
      { label: '⇔', snippet: '$\\Leftrightarrow$', description: 'Tương đương' },
    ]
  },
  {
    name: 'Ma trận & Hệ phương trình',
    items: [
      {
        label: 'Ma trận 2x2',
        snippet: '$\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}$',
        description: 'Ma trận vuông cấp 2'
      },
      {
        label: 'Định thức |A|',
        snippet: '$\\begin{vmatrix} a & b \\\\ c & d \\end{vmatrix}$',
        description: 'Định thức ma trận'
      },
      {
        label: 'Hệ PT',
        snippet: '$\\begin{cases} a_1 x + b_1 y = c_1 \\\\ a_2 x + b_2 y = c_2 \\end{cases}$',
        description: 'Hệ phương trình tuyến tính'
      },
      {
        label: 'Vector',
        snippet: '$\\vec{v} = (x, y, z)$',
        description: 'Ký hiệu vector'
      }
    ]
  }
];

export const LatexFormulaToolbar: React.FC<LatexFormulaToolbarProps> = ({
  onInsert,
  className = '',
  compact = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState(0);
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);

  const handleInsert = (snippet: string) => {
    onInsert(snippet);
    setCopiedSnippet(snippet);
    setTimeout(() => setCopiedSnippet(null), 1500);
  };

  return (
    <div className={`rounded-lg border border-slate-700/70 bg-slate-900/90 text-xs shadow-sm ${className}`}>
      {/* Header bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-800/80 rounded-t-lg border-b border-slate-700/60">
        <div className="flex items-center gap-2">
          <Sigma className="w-3.5 h-3.5 text-indigo-400" />
          <span className="font-semibold text-slate-200">Ký hiệu Công thức Toán/Lý/Hóa (LaTeX)</span>
          <span className="text-[10px] text-slate-400 font-normal">Click để chèn vào vị trí con trỏ</span>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1 text-[11px] font-medium text-indigo-400 hover:text-indigo-300 transition-colors py-0.5 px-2 rounded hover:bg-slate-700/50"
        >
          <span>{isOpen ? 'Thu gọn' : 'Mở bảng ký hiệu'}</span>
          {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Quick single row (always visible or when compact) */}
      {!isOpen && (
        <div className="flex flex-wrap items-center gap-1.5 p-2 overflow-x-auto scrollbar-thin">
          <span className="text-[10px] text-slate-400 mr-1">Chèn nhanh:</span>
          {FORMULA_CATEGORIES[0].items.slice(0, 5).map((item, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleInsert(item.snippet)}
              title={item.description}
              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-indigo-600/40 text-slate-200 hover:text-indigo-200 border border-slate-700/80 transition-all font-mono font-medium hover:border-indigo-500/50 flex items-center gap-1"
            >
              <span>{item.label}</span>
            </button>
          ))}
          {FORMULA_CATEGORIES[1].items.slice(0, 3).map((item, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleInsert(item.snippet)}
              title={item.description}
              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-indigo-600/40 text-slate-200 hover:text-indigo-200 border border-slate-700/80 transition-all font-mono font-medium hover:border-indigo-500/50 flex items-center gap-1"
            >
              <span>{item.label}</span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="text-[10px] text-indigo-400 hover:text-indigo-300 underline underline-offset-2 ml-1"
          >
            + xem thêm...
          </button>
        </div>
      )}

      {/* Expanded full palette */}
      {isOpen && (
        <div className="p-3 space-y-3">
          {/* Category Tabs */}
          <div className="flex flex-wrap gap-1 border-b border-slate-800 pb-2">
            {FORMULA_CATEGORIES.map((cat, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveCategory(idx)}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all ${
                  activeCategory === idx
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Category items grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2 max-h-48 overflow-y-auto p-1 scrollbar-thin">
            {FORMULA_CATEGORIES[activeCategory].items.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleInsert(item.snippet)}
                title={`Click để chèn: ${item.description}`}
                className="group relative flex flex-col items-center justify-center p-2 rounded-lg bg-slate-800/80 hover:bg-indigo-950/60 border border-slate-700/70 hover:border-indigo-500/60 transition-all text-center"
              >
                <div className="text-sm font-semibold text-indigo-300 group-hover:text-white transition-colors mb-1 min-h-[20px] flex items-center justify-center">
                  <MathRenderer content={item.snippet} />
                </div>
                <div className="text-[10px] text-slate-400 group-hover:text-slate-200 truncate max-w-full">
                  {item.description}
                </div>
                {copiedSnippet === item.snippet && (
                  <span className="absolute inset-0 flex items-center justify-center bg-indigo-600/90 text-white text-[10px] rounded-lg font-bold">
                    <Check className="w-3.5 h-3.5 mr-1" /> Đã chèn
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800">
            <span>Mẹo: Bạn có thể đặt công thức giữa cặp dấu <code>$công thức$</code> để hiển thị KaTeX sắc nét.</span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-slate-200"
            >
              Đóng bảng
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
