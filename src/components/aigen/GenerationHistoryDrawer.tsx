import React, { useState, useMemo } from 'react';
import {
  History,
  Sparkles,
  BookOpen,
  Clock,
  Trash2,
  RotateCcw,
  Eye,
  ArrowRight,
  X,
} from 'lucide-react';
import { Question } from '../../types';
import { GenerationHistoryRecord } from './aigenTypes';
import QuestionReviewCard from './QuestionReviewCard';

interface GenerationHistoryDrawerProps {
  history: GenerationHistoryRecord[];
  onRestoreConfig: (record: GenerationHistoryRecord) => void;
  onApplyQuestions: (questions: Question[]) => void;
  onDeleteRecord: (id: string) => void;
  onNavigateToGenerate: () => void;
}

export const GenerationHistoryDrawer: React.FC<GenerationHistoryDrawerProps> = ({
  history,
  onRestoreConfig,
  onApplyQuestions,
  onDeleteRecord,
  onNavigateToGenerate,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [previewRecord, setPreviewRecord] = useState<GenerationHistoryRecord | null>(null);

  const filteredHistory = useMemo(() => {
    if (!searchQuery.trim()) return history;
    const q = searchQuery.toLowerCase();
    return history.filter(
      (h) =>
        h.documentName.toLowerCase().includes(q) ||
        h.chapters.some((c) => c.toLowerCase().includes(q))
    );
  }, [history, searchQuery]);

  return (
    <div className="space-y-4">
      {/* Header & Filter Search for History */}
      <div className="bg-white border border-slate-200 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Lịch sử các đợt sinh câu hỏi AI ({filteredHistory.length})
          </span>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo giáo trình hoặc chương..."
            className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:bg-white focus:border-[#008689] outline-none"
          />
          <button
            onClick={onNavigateToGenerate}
            className="px-3.5 py-1.5 rounded-xl bg-[#008689] hover:bg-[#006f72] text-white font-bold text-xs flex items-center gap-1.5 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Sinh câu hỏi mới
          </button>
        </div>
      </div>

      {filteredHistory.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
            <History className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-slate-800">
            Chưa có lịch sử sinh câu hỏi nào
          </h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            Sau khi bạn thực hiện sinh câu hỏi bằng mô hình AI, các đợt sinh cùng toàn bộ danh sách
            câu hỏi đã tạo sẽ được lưu trữ tự động tại đây để bạn kiểm tra lại hoặc nạp lại bất cứ
            lúc nào.
          </p>
          <button
            onClick={onNavigateToGenerate}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#008689] text-white text-xs font-bold hover:bg-[#006f72] transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Bắt đầu sinh câu hỏi ngay
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredHistory.map((item) => (
            <div
              key={item.id}
              className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-[#008689]/40 hover:shadow-sm transition-all space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-teal-50 text-[#008689] flex items-center justify-center font-bold">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{item.documentName}</h4>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>{item.createdAt}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {item.totalQuestions} câu hỏi đã sinh
                  </span>
                  <button
                    onClick={() => onDeleteRecord(item.id)}
                    title="Xóa đợt sinh này khỏi lịch sử"
                    className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Chapters */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="text-slate-500 font-medium">Chương áp dụng:</span>
                {item.chapters.map((ch, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-semibold"
                  >
                    {ch}
                  </span>
                ))}
              </div>

              {/* Bloom Breakdown */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-xs text-slate-500 font-medium">Ma trận Bloom:</span>
                <span className="px-2 py-0.5 rounded-lg bg-sky-50 text-sky-700 text-[11px] font-bold border border-sky-200">
                  Nhận biết: {item.bloomDistribution?.nhanBiet ?? 0}
                </span>
                <span className="px-2 py-0.5 rounded-lg bg-teal-50 text-teal-700 text-[11px] font-bold border border-teal-200">
                  Thông hiểu: {item.bloomDistribution?.thongHieu ?? 0}
                </span>
                <span className="px-2 py-0.5 rounded-lg bg-amber-50 text-amber-700 text-[11px] font-bold border border-amber-200">
                  Vận dụng: {item.bloomDistribution?.vanDung ?? 0}
                </span>
                <span className="px-2 py-0.5 rounded-lg bg-rose-50 text-rose-700 text-[11px] font-bold border border-rose-200">
                  Phân tích: {item.bloomDistribution?.phanTich ?? 0}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  onClick={() => onRestoreConfig(item)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-[#008689]" />
                  Dùng lại cấu hình này
                </button>

                {item.questions && item.questions.length > 0 && (
                  <button
                    onClick={() => setPreviewRecord(item)}
                    className="px-3 py-1.5 rounded-xl border border-[#008689] text-[#008689] bg-[#e6f4f4]/40 hover:bg-[#e6f4f4] text-xs font-bold transition-colors flex items-center gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Xem chi tiết câu hỏi ({item.questions.length})
                  </button>
                )}

                {item.questions && item.questions.length > 0 && (
                  <button
                    onClick={() => onApplyQuestions(item.questions)}
                    className="px-3.5 py-1.5 rounded-xl bg-[#008689] hover:bg-[#006f72] text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                    Nạp vào Bước 3 (Kiểm duyệt)
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preview Modal for Questions in a Record */}
      {previewRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-slate-900/50 p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-3xl w-full max-h-[88vh] flex flex-col overflow-hidden animate-fade-in">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-50 text-[#008689] flex items-center justify-center font-bold">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Chi tiết đợt sinh: {previewRecord.documentName}
                  </h3>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                    <span>{previewRecord.createdAt}</span>
                    <span>•</span>
                    <span className="font-semibold text-teal-700">
                      {previewRecord.totalQuestions} câu hỏi
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setPreviewRecord(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Questions List */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {previewRecord.questions.map((q, idx) => (
                <QuestionReviewCard
                  key={q.id || idx}
                  question={q}
                  index={idx}
                />
              ))}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                onClick={() => setPreviewRecord(null)}
                className="px-4 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs"
              >
                Đóng
              </button>

              <button
                onClick={() => {
                  onApplyQuestions(previewRecord.questions);
                  setPreviewRecord(null);
                }}
                className="px-4 py-2 rounded-xl bg-[#008689] hover:bg-[#006f72] text-white font-bold text-xs flex items-center gap-1.5 shadow-sm"
              >
                <ArrowRight className="w-3.5 h-3.5" />
                Nạp bộ câu hỏi này vào Bước 3 (Kiểm duyệt)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GenerationHistoryDrawer;
