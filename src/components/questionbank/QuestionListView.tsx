import React from 'react';
import {
  Search,
  CheckCircle2,
  BookOpen,
  ChevronDown,
  ChevronUp,
  FileQuestion,
  Trash2,
  Edit2,
  Eye,
} from 'lucide-react';
import { Question, BloomLevel } from '../../types';
import MathRenderer from '../MathRenderer';
import { BLOOM_ORDER, BLOOM_STYLE } from './types';

interface QuestionListViewProps {
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  selectedSubject: string;
  onSubjectChange: (subject: string) => void;
  subjects: string[];
  totalPoolCount: number;
  selectedBloom: 'all' | BloomLevel;
  onBloomChange: (bloom: 'all' | BloomLevel) => void;
  filteredQuestions: Question[];
  paginatedQuestions: Question[];
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onSelectAll: () => void;
  currentPage: number;
  totalPages: number;
  totalFiltered: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (items: number) => void;
  expandedId: string | null;
  onToggleExpand: (id: string) => void;
  onImageClick: (url: string, caption?: string) => void;
  onViewDetail?: (question: Question) => void;
  onEditQuestion?: (question: Question) => void;
  onDeleteQuestion?: (id: string) => void;
}

export const QuestionListView: React.FC<QuestionListViewProps> = ({
  searchQuery,
  onSearchQueryChange,
  selectedSubject,
  onSubjectChange,
  subjects,
  totalPoolCount,
  selectedBloom,
  onBloomChange,
  filteredQuestions,
  paginatedQuestions,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  currentPage,
  totalPages,
  totalFiltered,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  expandedId,
  onToggleExpand,
  onImageClick,
  onViewDetail,
  onEditQuestion,
  onDeleteQuestion,
}) => {
  const currentDisplayPage = Math.min(currentPage, totalPages);

  return (
    <div className="space-y-4">
      {/* Search & Filters Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-wrap items-center gap-2.5">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            placeholder="Tìm kiếm nội dung câu hỏi hoặc chương mục..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-[#008689]"
          />
        </div>

        <select
          value={selectedSubject}
          onChange={(e) => onSubjectChange(e.target.value)}
          className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:border-[#008689] cursor-pointer"
        >
          <option value="all">Tất cả giáo trình ({totalPoolCount})</option>
          {subjects.map((sub) => (
            <option key={sub} value={sub}>
              {sub}
            </option>
          ))}
        </select>

        <select
          value={selectedBloom}
          onChange={(e) => onBloomChange(e.target.value as typeof selectedBloom)}
          className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:border-[#008689] cursor-pointer"
        >
          <option value="all">Tất cả mức Bloom</option>
          {BLOOM_ORDER.map((lvl) => (
            <option key={lvl} value={lvl}>
              {BLOOM_STYLE[lvl].label} ({BLOOM_STYLE[lvl].en})
            </option>
          ))}
        </select>
      </div>

      {/* Questions Card Container */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Bulk select header */}
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs font-semibold text-slate-600">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={
                filteredQuestions.length > 0 &&
                selectedIds.length === filteredQuestions.length
              }
              onChange={onSelectAll}
              className="rounded border-slate-300 text-[#008689] focus:ring-[#008689] cursor-pointer"
            />
            <span>
              Hiển thị <strong>{filteredQuestions.length}</strong> câu hỏi trong Ngân hàng Đề
              {selectedIds.length > 0 && ` (Đã chọn ${selectedIds.length} câu để đưa vào đề)`}
            </span>
          </div>
          <span className="text-emerald-700 flex items-center gap-1 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" />
            100% Có trích dẫn RAG
          </span>
        </div>

        {/* Question Items List */}
        <div className="divide-y divide-slate-100">
          {paginatedQuestions.map((q, index) => {
            const globalIndex = (currentDisplayPage - 1) * itemsPerPage + index + 1;
            const isExpanded = expandedId === q.id;
            const isSelected = selectedIds.includes(q.id);
            const bloomCfg = BLOOM_STYLE[q.bloomLevel] || BLOOM_STYLE['Nhận biết'];
            const qImg = q.imageUrl || (q as any).image_url;
            const qCaption = q.imageCaption || (q as any).image_caption;

            return (
              <div key={q.id} className="p-4 hover:bg-slate-50/60 transition-colors">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleSelect(q.id)}
                    className="mt-1 rounded border-slate-300 text-[#008689] focus:ring-[#008689] cursor-pointer"
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <span className="text-xs font-bold text-slate-500">#{globalIndex}</span>
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${bloomCfg.bg} ${bloomCfg.color} ${bloomCfg.border}`}
                      >
                        {bloomCfg.label} ({bloomCfg.en})
                      </span>
                      <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        {q.textbookName} — {q.chapter}
                      </span>
                      {(q.hasFormula || q.question.includes('$')) && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                          ∑ Toán - Lý (LaTeX)
                        </span>
                      )}
                      {(q.hasImage || !!qImg) && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                          📷 Sơ đồ
                        </span>
                      )}
                    </div>

                    <div className="text-sm font-semibold text-slate-800 leading-relaxed">
                      <MathRenderer content={q.question} />
                      {(q.hasImage || !!qImg) && qImg && (
                        <div className="mt-2.5 p-2 bg-slate-50 border border-slate-200 rounded max-w-sm">
                          <img
                            src={qImg}
                            alt={qCaption || 'Hình sơ đồ'}
                            className="max-h-48 rounded object-contain mx-auto cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => onImageClick(qImg, qCaption)}
                          />
                          {qCaption && (
                            <p className="text-[10px] text-slate-500 italic mt-1 text-center">
                              {qCaption}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {isExpanded && (
                      <div className="mt-4 space-y-3 pt-3 border-t border-slate-100">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {q.options.map((opt) => {
                            const isCorrect = opt.id === q.correctAnswerId;
                            return (
                              <div
                                key={opt.id}
                                className={`p-2.5 rounded-lg border text-xs flex items-start gap-2 ${
                                  isCorrect
                                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-semibold'
                                    : 'bg-white border-slate-200 text-slate-600'
                                }`}
                              >
                                <span className="font-bold shrink-0">{opt.label}.</span>
                                <span className="flex-1">
                                  <MathRenderer content={opt.text} />
                                </span>
                              </div>
                            );
                          })}
                        </div>

                        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
                          <div>
                            <strong className="text-slate-700">Giải thích: </strong>
                            <MathRenderer content={q.explanation} inline />
                          </div>
                          <div className="flex items-center gap-2 text-slate-500 pt-1">
                            <BookOpen className="w-3.5 h-3.5 text-[#008689]" />
                            <span>
                              Nguồn: <strong>{q.textbookName}</strong> ({q.chapter} —{' '}
                              {q.sourceChunkId})
                            </span>
                          </div>
                        </div>

                        {/* Optional action buttons */}
                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                          {onViewDetail && (
                            <button
                              type="button"
                              onClick={() => onViewDetail(q)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold text-[#008689] bg-teal-50 hover:bg-teal-100 border border-teal-200 transition-colors shadow-2xs cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Xem Chi Tiết &amp; Căn Cứ RAG</span>
                            </button>
                          )}
                          {onEditQuestion && (
                              <button
                                type="button"
                                onClick={() => onEditQuestion(q)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                                <span>Chỉnh sửa</span>
                              </button>
                            )}
                            {onDeleteQuestion && (
                              <button
                                type="button"
                                onClick={() => onDeleteQuestion(q.id)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Xóa</span>
                              </button>
                            )}
                          </div>
                      </div>
                    )}
                  </div>

                  {onViewDetail && (
                    <button
                      type="button"
                      onClick={() => onViewDetail(q)}
                      className="p-1.5 rounded-lg text-teal-600 hover:text-teal-800 hover:bg-teal-50 transition-colors cursor-pointer"
                      title="Xem nội dung chi tiết &amp; căn cứ trích dẫn RAG"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  )}

                  <button
                    onClick={() => onToggleExpand(q.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                    title={isExpanded ? 'Thu gọn' : 'Xem chi tiết'}
                  >
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            );
          })}

          {filteredQuestions.length === 0 && (
            <div className="p-12 text-center text-sm text-slate-500 space-y-2">
              <FileQuestion className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="font-semibold text-slate-700">
                {totalPoolCount === 0
                  ? 'Ngân hàng câu hỏi hiện đang trống'
                  : 'Không tìm thấy câu hỏi nào khớp với bộ lọc'}
              </p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {totalPoolCount === 0
                  ? 'Chưa có câu hỏi nào được lưu. Hãy tải lên tài liệu giáo trình ở Bước 1 và tạo câu hỏi để bắt đầu.'
                  : 'Thử điều chỉnh lại từ khóa tìm kiếm hoặc mức độ Bloom.'}
              </p>
            </div>
          )}

          {/* Pagination Controls */}
          {totalFiltered > 0 && (
            <div className="p-4 bg-slate-50/80 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <span>Hiển thị</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
                  className="px-2 py-1 rounded border border-slate-300 bg-white font-medium text-slate-700 focus:outline-none cursor-pointer"
                >
                  <option value={10}>10 câu / trang</option>
                  <option value={25}>25 câu / trang</option>
                  <option value={50}>50 câu / trang</option>
                  <option value={100}>100 câu / trang</option>
                </select>
                <span>
                  ({(currentDisplayPage - 1) * itemsPerPage + 1} -{' '}
                  {Math.min(currentDisplayPage * itemsPerPage, totalFiltered)} trong {totalFiltered}{' '}
                  câu)
                </span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={currentDisplayPage <= 1}
                  onClick={() => onPageChange(Math.max(1, currentDisplayPage - 1))}
                  className="px-3 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium transition-colors cursor-pointer"
                >
                  Trước
                </button>
                {Array.from({ length: totalPages }).map((_, i) => {
                  const p = i + 1;
                  if (
                    p === 1 ||
                    p === totalPages ||
                    (p >= currentDisplayPage - 1 && p <= currentDisplayPage + 1)
                  ) {
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => onPageChange(p)}
                        className={`min-w-[32px] py-1.5 px-2 rounded font-semibold text-xs transition-colors cursor-pointer ${
                          currentDisplayPage === p
                            ? 'bg-[#008689] text-white shadow-xs'
                            : 'border border-slate-300 bg-white hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        {p}
                      </button>
                    );
                  }
                  if (p === currentDisplayPage - 2 || p === currentDisplayPage + 2) {
                    return (
                      <span key={p} className="px-1 text-slate-400">
                        ...
                      </span>
                    );
                  }
                  return null;
                })}
                <button
                  type="button"
                  disabled={currentDisplayPage >= totalPages}
                  onClick={() => onPageChange(Math.min(totalPages, currentDisplayPage + 1))}
                  className="px-3 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium transition-colors cursor-pointer"
                >
                  Sau
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
