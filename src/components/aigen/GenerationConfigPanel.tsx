import React from 'react';
import {
  BookOpen,
  Library,
  UploadCloud,
  Check,
  Search,
  Sparkles,
  Eye,
  Layers,
  X,
} from 'lucide-react';
import { BloomDistribution, DocumentItem } from './aigenTypes';
import { PromptGuidanceSection } from './PromptGuidanceSection';
import { normalizeVietnameseLegacyFont } from '../../utils/vietnameseFontUtils';
import { ExamBlueprint } from '../../types/examBlueprint';

interface GenerationConfigPanelProps {
  selectedBook: string;
  selectedBooks?: string[];
  selectedDocument: DocumentItem | null;
  sharedDocuments: DocumentItem[];
  myDocuments: DocumentItem[];
  chaptersList: string[];
  filteredChapters: string[];
  selectedChapters: string[];
  chaptersGroupedByDocument?: Array<{
    documentId: string;
    documentName: string;
    chapters: string[];
  }>;
  onRemoveBook?: (bookId: string) => void;
  chapterSearchQuery: string;
  onChapterSearchChange: (query: string) => void;
  onToggleChapter: (ch: string) => void;
  onSelectAllChapters: (selectAll: boolean) => void;
  onOpenLibraryModal: (tab: 'my' | 'shared') => void;
  onNavigateUpload: () => void;
  onViewOriginalDocument?: () => void;
  bloomDistribution: BloomDistribution;
  onBloomDistributionChange: (dist: BloomDistribution) => void;
  totalQuestions: number;
  pedagogicalPrompt: string;
  onPedagogicalPromptChange: (val: string) => void;
  isGenerating: boolean;
  onStartGenerate: () => void;
  blueprint?: ExamBlueprint;
  onOpenBlueprintModal?: () => void;
}

export const GenerationConfigPanel: React.FC<GenerationConfigPanelProps> = ({
  selectedBook,
  selectedBooks = [],
  selectedDocument,
  sharedDocuments,
  myDocuments,
  chaptersList,
  filteredChapters,
  selectedChapters,
  chaptersGroupedByDocument,
  onRemoveBook,
  chapterSearchQuery,
  onChapterSearchChange,
  onToggleChapter,
  onSelectAllChapters,
  onOpenLibraryModal,
  onNavigateUpload,
  onViewOriginalDocument,
  bloomDistribution,
  onBloomDistributionChange,
  totalQuestions,
  pedagogicalPrompt,
  onPedagogicalPromptChange,
  isGenerating,
  onStartGenerate,
  blueprint,
  onOpenBlueprintModal,
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
                title="Liên kết và mở Thư viện giáo trình"
              >
                <Library className="w-3.5 h-3.5" />
                Liên kết Thư viện
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
                      if (onViewOriginalDocument) {
                        onViewOriginalDocument();
                      } else {
                        onOpenLibraryModal(
                          myDocuments.some((d) => d.id === selectedBook) ? 'my' : 'shared'
                        );
                      }
                    }}
                    className="px-3 py-1.5 rounded-xl bg-white border border-teal-200 hover:bg-teal-50 text-[#008689] font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                    title="Xem trước tệp giáo trình học liệu gốc (PDF/Word)"
                  >
                    <Eye className="w-3.5 h-3.5 text-[#008689]" />
                    Xem tập gốc
                  </button>
                </div>
              </div>

              {/* [SCRUM-145] Multi-Document Connected Strip */}
              {selectedBooks && selectedBooks.length > 1 && (
                <div className="flex flex-wrap items-center gap-2 p-2.5 rounded-2xl bg-teal-50/60 border border-teal-200">
                  <span className="text-xs font-bold text-teal-900 flex items-center gap-1.5">
                    <Library className="w-3.5 h-3.5 text-[#008689]" />
                    Đã liên kết {selectedBooks.length} tài liệu giáo trình:
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {selectedBooks.map((bId) => {
                      const doc = [...sharedDocuments, ...myDocuments].find((d) => d.id === bId);
                      return (
                        <span
                          key={bId}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold bg-white border border-teal-200 text-teal-800 shadow-2xs"
                        >
                          <span className="max-w-[180px] truncate">{doc?.name || bId}</span>
                          {onRemoveBook && selectedBooks.length > 1 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onRemoveBook(bId);
                              }}
                              className="text-slate-400 hover:text-rose-600 rounded cursor-pointer p-0.5"
                              title="Gỡ tài liệu này"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </span>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => onOpenLibraryModal('shared')}
                      className="px-2 py-1 text-xs font-bold text-[#008689] hover:bg-teal-100 rounded-lg transition-colors cursor-pointer"
                    >
                      + Chọn thêm tài liệu
                    </button>
                  </div>
                </div>
              )}

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

                {/* [SCRUM-145] Chapters List: Hỗ trợ phân nhóm theo từng tài liệu khi chọn nhiều sách */}
                {chaptersGroupedByDocument && chaptersGroupedByDocument.length > 1 ? (
                  <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                    {chaptersGroupedByDocument.map((group) => {
                      const groupChapters = filteredChapters.filter((ch) => group.chapters.includes(ch));
                      if (groupChapters.length === 0) return null;
                      const groupAllSelected = groupChapters.every((ch) => selectedChapters.includes(ch));
                      return (
                        <div key={group.documentId} className="space-y-1.5 rounded-xl border border-slate-200 bg-slate-50/50 p-2.5">
                          <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 truncate max-w-[70%]">
                              <BookOpen className="w-3.5 h-3.5 text-[#008689] shrink-0" />
                              <span className="truncate">{group.documentName}</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                if (groupAllSelected) {
                                  groupChapters.forEach((ch) => {
                                    if (selectedChapters.includes(ch)) onToggleChapter(ch);
                                  });
                                } else {
                                  groupChapters.forEach((ch) => {
                                    if (!selectedChapters.includes(ch)) onToggleChapter(ch);
                                  });
                                }
                              }}
                              className="text-[11px] font-semibold text-[#008689] hover:underline cursor-pointer"
                            >
                              {groupAllSelected ? 'Bỏ chọn' : 'Chọn hết'}
                            </button>
                          </div>
                          <div className="space-y-1">
                            {groupChapters.map((ch) => {
                              const isChecked = selectedChapters.includes(ch);
                              return (
                                <div
                                  key={ch}
                                  onClick={() => onToggleChapter(ch)}
                                  className={`p-2 px-2.5 rounded-lg border cursor-pointer transition-all flex items-center justify-between ${
                                    isChecked
                                      ? 'bg-[#e0f7fa]/60 border-[#008689]/40 text-[#006d70] font-semibold shadow-2xs'
                                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                  }`}
                                >
                                  <span className="text-xs truncate pr-2" title={normalizeVietnameseLegacyFont(ch)}>
                                    {normalizeVietnameseLegacyFont(ch)}
                                  </span>
                                  <div
                                    className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                                      isChecked ? 'bg-[#008689] border-[#008689] text-white' : 'border-slate-300 bg-white'
                                    }`}
                                  >
                                    {isChecked && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
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
                          <span className="text-xs truncate pr-2" title={normalizeVietnameseLegacyFont(ch)}>
                            {normalizeVietnameseLegacyFont(ch)}
                          </span>
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
                )}
              </div>
            </div>
          )}
        </div>

        {/* Nút mở Blueprint Đa dạng loại câu hỏi */}
        {onOpenBlueprintModal && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-50 via-indigo-50 to-teal-50 border border-purple-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-600 text-white shadow-xs shrink-0">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                  <span>Cấu hình Cấu trúc Đề thi Đa phần (Blueprint)</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-100 text-purple-700 border border-purple-300">
                    {blueprint?.sections?.length || 1} Phần thi kết hợp
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Tùy biến phối hợp: Trắc nghiệm đơn, Đọc hiểu bài đọc chùm, Đúng/Sai 4 ý theo chuẩn trường.
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={onOpenBlueprintModal}
              className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-purple-50 text-purple-700 hover:text-purple-800 text-xs font-bold border border-purple-300 shadow-xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Tùy biến Cấu trúc Đề</span>
            </button>
          </div>
        )}

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
            {blueprint && (
              <div className="flex justify-between text-slate-500 pt-1 border-t border-slate-100">
                <span>Cấu trúc đề:</span>
                <span className="font-semibold text-purple-700">
                  {blueprint.sections?.length || 1} phần thi đa dạng
                </span>
              </div>
            )}
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

          {/* Quanta Proactive Butler: Cảnh báo khảo thí thông minh khi ma trận Bloom lệch chuẩn */}
          {totalQuestions > 0 && ((bloomDistribution.vanDung + bloomDistribution.phanTich) / totalQuestions) > 0.6 && (
            <div className="p-2.5 bg-amber-50/90 border border-amber-200/80 rounded-xl flex items-start justify-between gap-2 text-[11px] text-amber-900 shadow-2xs">
              <div className="flex items-start gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Quanta gợi ý khảo thí: </span>
                  <span>
                    Tỷ lệ Vận dụng & Phân tích đang chiếm {Math.round(((bloomDistribution.vanDung + bloomDistribution.phanTich) / totalQuestions) * 100)}%, đề thi có thể gây quá tải cho người học.
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  const nb = Math.round(totalQuestions * 0.3);
                  const th = Math.round(totalQuestions * 0.4);
                  const vd = Math.round(totalQuestions * 0.2);
                  const vdc = Math.max(0, totalQuestions - nb - th - vd);
                  onBloomDistributionChange({ nhanBiet: nb, thongHieu: th, vanDung: vd, phanTich: vdc });
                }}
                className="px-2 py-1 bg-white hover:bg-amber-100 border border-amber-300 text-amber-800 font-semibold rounded-lg text-[10px] whitespace-nowrap shrink-0 transition-colors cursor-pointer"
              >
                Cân bằng chuẩn 3-4-2-1
              </button>
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
