import React from 'react';
import {
  BookOpen,
  Library,
  UploadCloud,
  Check,
  Search,
  Sparkles,
} from 'lucide-react';
import { BloomDistribution, DocumentItem } from './aigenTypes';
import { PromptGuidanceSection } from './PromptGuidanceSection';

interface GenerationConfigPanelProps {
  selectedBook: string;
  selectedDocument: DocumentItem | null;
  sharedDocuments: DocumentItem[];
  myDocuments: DocumentItem[];
  chaptersList: string[];
  filteredChapters: string[];
  selectedChapters: string[];
  chapterSearchQuery: string;
  onChapterSearchChange: (query: string) => void;
  onToggleChapter: (ch: string) => void;
  onSelectAllChapters: (selectAll: boolean) => void;
  onOpenLibraryModal: (tab: 'my' | 'shared') => void;
  onNavigateUpload: () => void;
  bloomDistribution: BloomDistribution;
  onBloomDistributionChange: (dist: BloomDistribution) => void;
  totalQuestions: number;
  pedagogicalPrompt: string;
  onPedagogicalPromptChange: (val: string) => void;
  isGenerating: boolean;
  onStartGenerate: () => void;
}

export const GenerationConfigPanel: React.FC<GenerationConfigPanelProps> = ({
  selectedBook,
  selectedDocument,
  sharedDocuments,
  myDocuments,
  chaptersList,
  filteredChapters,
  selectedChapters,
  chapterSearchQuery,
  onChapterSearchChange,
  onToggleChapter,
  onSelectAllChapters,
  onOpenLibraryModal,
  onNavigateUpload,
  bloomDistribution,
  onBloomDistributionChange,
  totalQuestions,
  pedagogicalPrompt,
  onPedagogicalPromptChange,
  isGenerating,
  onStartGenerate,
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Form: Parameters (2 Cols) */}
      <div className="lg:col-span-2 space-y-5">
        {/* Card 1: Chọn giáo trình & chương (Modern Unified UX) */}
        <div className="bg-white border border-slate-200 p-5 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-[#008689]" />
              1. Giáo trình & Chương mục
            </h2>
            {selectedBook && (
              <button
                type="button"
                onClick={() => {
                  onOpenLibraryModal(
                    myDocuments.some((d) => d.id === selectedBook) ? 'my' : 'shared'
                  );
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#008689] bg-[#e0f7fa] hover:bg-[#b2ebf2] border border-[#008689]/30 rounded-xl transition-all shadow-2xs cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5" />
                Đổi giáo trình khác
              </button>
            )}
          </div>

          {!selectedBook ? (
            <div className="p-7 rounded-2xl border-2 border-dashed border-teal-200 bg-gradient-to-br from-teal-50/40 via-white to-teal-50/20 text-center space-y-3.5">
              <div className="w-14 h-14 rounded-2xl bg-teal-100/80 text-[#008689] flex items-center justify-center mx-auto shadow-xs">
                <BookOpen className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900">
                  Chưa chọn giáo trình để biên soạn đề
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                  Chọn nhanh từ Thư viện giáo trình dùng chung ({sharedDocuments.length} môn) hoặc
                  nạp giáo trình riêng của Thầy/Cô để AI bóc tách chương mục và ma trận câu hỏi.
                </p>
              </div>
              <div className="flex items-center justify-center gap-3 pt-1 flex-wrap">
                <button
                  type="button"
                  onClick={() => onOpenLibraryModal('shared')}
                  className="px-4 py-2.5 rounded-xl bg-[#008689] hover:bg-[#006f72] text-white font-bold text-xs flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
                >
                  <Library className="w-4 h-4" />
                  Chọn từ Thư viện giáo trình ({sharedDocuments.length})
                </button>
                <button
                  type="button"
                  onClick={onNavigateUpload}
                  className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-2 shadow-2xs transition-colors cursor-pointer"
                >
                  <UploadCloud className="w-4 h-4 text-[#008689]" />
                  Nạp giáo trình cá nhân
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Selected Textbook Showcase Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-teal-50/80 via-white to-cyan-50/30 border border-teal-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-2xl bg-[#008689] text-white flex items-center justify-center shrink-0 shadow-xs">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-extrabold text-slate-900 truncate">
                        {selectedDocument?.name || selectedBook}
                      </h3>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          myDocuments.some((d) => d.id === selectedBook)
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        }`}
                      >
                        {myDocuments.some((d) => d.id === selectedBook) ? 'Cá nhân' : 'Dùng chung'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
                      <span>{chaptersList.length} chương mục</span>
                      <span>•</span>
                      <span>{selectedDocument?.totalPages || '?'} trang</span>
                      <span>•</span>
                      <span className="font-bold text-[#008689]">
                        Đã chọn {selectedChapters.length}/{chaptersList.length} chương
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() => {
                      onOpenLibraryModal(
                        myDocuments.some((d) => d.id === selectedBook) ? 'my' : 'shared'
                      );
                    }}
                    className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-[#008689]" />
                    Đổi giáo trình
                  </button>
                </div>
              </div>

              {/* Chapter Selection Controls */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                      Chương mục áp dụng ({selectedChapters.length}/{chaptersList.length})
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const allSelected = selectedChapters.length === chaptersList.length;
                        onSelectAllChapters(!allSelected);
                      }}
                      className="text-xs font-semibold text-[#008689] hover:underline cursor-pointer"
                    >
                      {selectedChapters.length === chaptersList.length
                        ? 'Bỏ chọn tất cả'
                        : 'Chọn tất cả'}
                    </button>
                  </div>
                </div>

                {chaptersList.length > 5 && (
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={chapterSearchQuery}
                      onChange={(e) => onChapterSearchChange(e.target.value)}
                      placeholder="Lọc nhanh danh sách chương..."
                      className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:bg-white focus:border-[#008689]"
                    />
                  </div>
                )}

                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {chaptersList.length === 0 && (
                    <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-400 text-center">
                      Chưa có danh sách chương mục cho tài liệu này.
                    </div>
                  )}
                  {filteredChapters.map((ch) => {
                    const isChecked = selectedChapters.includes(ch);
                    return (
                      <div
                        key={ch}
                        onClick={() => onToggleChapter(ch)}
                        className={`p-2.5 px-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                          isChecked
                            ? 'bg-[#e0f7fa]/60 border-[#008689]/40 text-[#006d70] font-semibold shadow-2xs'
                            : 'bg-slate-50/70 border-slate-200 text-slate-600 hover:bg-white'
                        }`}
                      >
                        <span className="text-xs truncate pr-2">{ch}</span>
                        <div
                          className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                            isChecked
                              ? 'bg-[#008689] border-[#008689]'
                              : 'border-slate-300 bg-white'
                          }`}
                        >
                          {isChecked && <Check className="w-3 h-3 text-white" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Card 2: Thang đo Bloom */}
        <div className="bg-white border border-slate-200 p-5 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              2. Phân bổ mức độ nhận thức Bloom
            </h2>
            <span className="text-xs font-mono font-bold text-[#008689]">
              Tổng: {totalQuestions} câu
            </span>
          </div>

          <div className="space-y-4">
            {[
              { key: 'nhanBiet' as const, label: 'Mức 1: Nhận biết', accent: 'accent-sky-500' },
              { key: 'thongHieu' as const, label: 'Mức 2: Thông hiểu', accent: 'accent-teal-600' },
              { key: 'vanDung' as const, label: 'Mức 3: Vận dụng', accent: 'accent-amber-500' },
              { key: 'phanTich' as const, label: 'Mức 4: Phân tích', accent: 'accent-indigo-600' },
            ].map(({ key, label, accent }) => (
              <div key={key} className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-700">{label}</span>
                  <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-lg">
                    {bloomDistribution[key]} câu
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="20"
                  value={bloomDistribution[key]}
                  onChange={(e) =>
                    onBloomDistributionChange({
                      ...bloomDistribution,
                      [key]: parseInt(e.target.value) || 0,
                    })
                  }
                  className={`w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer ${accent}`}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Summary Sidebar (1 Col) */}
      <div>
        <div className="bg-white border border-slate-200 p-4 sm:p-5 rounded-2xl space-y-4 sticky lg:top-6">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider pb-3 border-b border-slate-100">
            Tóm tắt cấu hình
          </h3>

          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between text-slate-500">
              <span>Tổng số câu:</span>
              <span className="font-bold text-slate-900 font-mono">{totalQuestions} câu</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Giáo trình:</span>
              <span
                className="font-semibold text-slate-800 truncate max-w-[160px]"
                title={selectedDocument?.name || ''}
              >
                {selectedDocument?.name || 'Chưa chọn'}
              </span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Số chương:</span>
              <span className="font-semibold text-slate-800">
                {selectedChapters.length} chương
              </span>
            </div>
          </div>

          {totalQuestions > 0 && (
            <div className="w-full h-2 rounded-full flex overflow-hidden bg-slate-100">
              <div
                style={{ width: `${(bloomDistribution.nhanBiet / totalQuestions) * 100}%` }}
                className="bg-sky-500"
              />
              <div
                style={{ width: `${(bloomDistribution.thongHieu / totalQuestions) * 100}%` }}
                className="bg-[#008689]"
              />
              <div
                style={{ width: `${(bloomDistribution.vanDung / totalQuestions) * 100}%` }}
                className="bg-amber-500"
              />
              <div
                style={{ width: `${(bloomDistribution.phanTich / totalQuestions) * 100}%` }}
                className="bg-indigo-500"
              />
            </div>
          )}

          {/* 3. Khung Định hướng & Yêu cầu Sư phạm Bổ sung */}
          <PromptGuidanceSection
            value={pedagogicalPrompt}
            onChange={onPedagogicalPromptChange}
          />

          <button
            onClick={onStartGenerate}
            disabled={
              isGenerating || totalQuestions === 0 || selectedChapters.length === 0 || !selectedBook
            }
            className={`w-full py-3 text-xs font-bold rounded-xl flex items-center justify-center space-x-2 transition-all ${
              totalQuestions === 0 || selectedChapters.length === 0 || !selectedBook
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-600/25'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>
              {isGenerating ? 'Đang sinh câu hỏi...' : `Sinh ${totalQuestions} câu hỏi AI (Bước 2)`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default GenerationConfigPanel;
