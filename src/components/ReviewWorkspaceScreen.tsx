import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  CheckCircle2,
  XCircle,
  Edit3,
  Sparkles,
  ChevronRight,
  ExternalLink,
  Save,
  RotateCcw,
  Check,
  AlertCircle,
  FileText,
  HelpCircle,
  Layers,
  ArrowLeft,
  Download,
  Filter,
  RefreshCw,
  Keyboard,
  Compass,
  CheckCheck
} from 'lucide-react';
import { Question, SourceChunk, BloomLevel, QuestionStatus, ScreenId } from '../types';

interface ReviewWorkspaceScreenProps {
  questions: Question[];
  onUpdateQuestion: (updated: Question) => void;
  onBatchApprove: () => void;
  onNavigate: (screen: ScreenId) => void;
  onShowToast: (type: 'success' | 'info' | 'warning' | 'error', title: string, message: string) => void;
}

const MOCK_SOURCE_CHUNKS: Record<string, SourceChunk> = {
  'chunk-1': {
    id: 'chunk-1',
    pageNumber: 42,
    chapter: 'Chương 3: Cung - Cầu và Giá cả thị trường',
    textSnippet:
      'Quy luật cầu (Law of Demand) chỉ ra rằng: trong điều kiện các yếu tố khác không đổi (ceteris paribus), khi giá của một hàng hóa hoặc dịch vụ tăng lên thì lượng cầu về hàng hóa hoặc dịch vụ đó sẽ giảm xuống và ngược lại. Mối quan hệ tỷ lệ nghịch này được thể hiện thông qua đường cầu dốc xuống từ trái sang phải trên đồ thị giá - lượng.',
    relevanceScore: 98,
  },
  'chunk-2': {
    id: 'chunk-2',
    pageNumber: 45,
    chapter: 'Chương 3: Cung - Cầu và Giá cả thị trường',
    textSnippet:
      'Hàng hóa thay thế (Substitute goods) là những cặp hàng hóa thỏa mãn cùng một nhu cầu. Khi giá của mặt hàng X tăng lên, người tiêu dùng có xu hướng giảm tiêu thụ X và chuyển sang sử dụng mặt hàng thay thế Y, làm cho lượng cầu của hàng hóa Y tăng lên dù giá của Y không đổi.',
    relevanceScore: 94,
  },
  'chunk-3': {
    id: 'chunk-3',
    pageNumber: 48,
    chapter: 'Chương 3: Cung - Cầu và Giá cả thị trường',
    textSnippet:
      'Hệ số co giãn của cầu theo giá (Price Elasticity of Demand - PED) đo lường mức độ phản ứng của lượng cầu trước sự thay đổi của giá cả. Nếu |PED| > 1, cầu được coi là co giãn nhiều (Elastic demand), việc giảm giá sẽ làm tăng tổng doanh thu (Total Revenue) của doanh nghiệp.',
    relevanceScore: 91,
  },
};

const getBloomBadgeColor = (level: BloomLevel) => {
  switch (level) {
    case 'Nhận biết':
      return 'bg-sky-500/10 text-sky-400 border-sky-500/20';
    case 'Thông hiểu':
      return 'bg-teal-500/10 text-teal-400 border-teal-500/20';
    case 'Vận dụng':
      return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    case 'Phân tích':
      return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
    default:
      return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
  }
};

export const ReviewWorkspaceScreen: React.FC<ReviewWorkspaceScreenProps> = ({
  questions,
  onUpdateQuestion,
  onBatchApprove,
  onNavigate,
  onShowToast,
}) => {
  const [selectedQuestionId, setSelectedQuestionId] = useState<string>(
    questions[0]?.id || 'q-1'
  );
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [isRegenerating, setIsRegenerating] = useState<string | null>(null);

  const activeQuestion = questions.find((q) => q.id === selectedQuestionId) || questions[0];
  const activeChunk = activeQuestion ? MOCK_SOURCE_CHUNKS[activeQuestion.sourceChunkId] || MOCK_SOURCE_CHUNKS['chunk-1'] : null;

  // Keyboard Shortcuts Support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['TEXTAREA', 'INPUT'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      if (e.key === 'a' || e.key === 'A') {
        if (activeQuestion) {
          onUpdateQuestion({ ...activeQuestion, status: 'approved' });
          onShowToast('success', 'Đã duyệt', `Câu hỏi đã được đánh dấu thẩm định đạt chuẩn`);
        }
      } else if (e.key === 'r' || e.key === 'R') {
        if (activeQuestion) {
          onUpdateQuestion({ ...activeQuestion, status: 'rejected' });
          onShowToast('warning', 'Đã loại bỏ', `Đã từ chối câu hỏi`);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeQuestion, onUpdateQuestion, onShowToast]);

  // Single Question AI Re-generation
  const handleRegenerateSingle = (qId: string) => {
    setIsRegenerating(qId);
    setTimeout(() => {
      if (activeQuestion) {
        const regenerated: Question = {
          ...activeQuestion,
          question: `[AI Đã tối ưu] ${activeQuestion.question}`,
          confidenceScore: 99,
          status: 'pending'
        };
        onUpdateQuestion(regenerated);
      }
      setIsRegenerating(null);
      onShowToast('info', 'AI đã sinh lại câu hỏi', 'Phương án nhiễu đã được hiệu chỉnh học thuật');
    }, 1200);
  };

  // Stats
  const totalCount = questions.length;
  const approvedCount = questions.filter((q) => q.status === 'approved').length;
  const rejectedCount = questions.filter((q) => q.status === 'rejected').length;
  const pendingCount = questions.filter((q) => q.status === 'pending').length;

  const filteredQuestions = questions.filter((q) => {
    if (filter === 'all') return true;
    return q.status === filter;
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0b0f19] text-slate-100 font-sans overflow-hidden">
      {/* 1. Header Bar */}
      <header className="h-16 bg-[#0e1424] border-b border-white/[0.06] px-6 flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => onNavigate('dashboard')}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="h-5 w-px bg-white/[0.08]" />
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-white text-sm">
                Không gian Đối chiếu & Kiểm duyệt RAG
              </span>
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/25">
                Chương 3: Cung - Cầu
              </span>
            </div>
            <p className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
              <FileText className="w-3 h-3 text-slate-500" /> Nguồn: GiaoTrinh_KinhTeViMo_2025.pdf
            </p>
          </div>
        </div>

        {/* Global Progress & Actions */}
        <div className="flex items-center space-x-4">
          {/* Keyboard hint badge */}
          <div className="hidden lg:flex items-center space-x-2 text-[10px] text-slate-400 font-mono bg-white/[0.04] px-2.5 py-1 rounded-lg border border-white/[0.06]">
            <Keyboard className="w-3.5 h-3.5 text-blue-400" />
            <span>Phím tắt: [A] Duyệt • [R] Loại bỏ</span>
          </div>

          <div className="hidden md:flex items-center space-x-2 text-xs">
            <span className="flex items-center gap-1.5 font-medium text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Duyệt: {approvedCount}
            </span>
            <span className="flex items-center gap-1.5 font-medium text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Chờ: {pendingCount}
            </span>
            <span className="flex items-center gap-1.5 font-medium text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-full border border-rose-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400" /> Hủy: {rejectedCount}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                onBatchApprove();
                onShowToast('success', 'Đã duyệt toàn bộ', 'Tất cả các câu hỏi đang chờ đã được thông qua');
              }}
              className="px-3 py-1.5 text-xs font-semibold text-slate-200 bg-white/[0.05] border border-white/[0.1] rounded-xl hover:bg-white/[0.08] transition-colors"
            >
              Duyệt tất cả
            </button>
            <button
              onClick={() => {
                onNavigate('bank');
                onShowToast('success', 'Chuyển sang Ngân hàng đề', 'Đã lưu trữ toàn bộ các câu hỏi đã duyệt vào kho đề thi');
              }}
              className="flex items-center space-x-1.5 px-4 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl hover:from-blue-500 hover:to-indigo-500 transition-all shadow-md shadow-blue-600/20"
            >
              <CheckCheck className="w-4 h-4" />
              <span>Chuyển vào Kho đề</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. Main Workspace Split View */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT PANE: RAG Grounding Source Text (Digital Paper Preview) */}
        <div className="w-5/12 border-r border-white/[0.06] bg-[#0c1220] flex flex-col">
          <div className="p-4 border-b border-white/[0.06] flex items-center justify-between bg-white/[0.02]">
            <div className="flex items-center space-x-2">
              <BookOpen className="w-4 h-4 text-blue-400" />
              <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                Minh chứng RAG (Ngữ cảnh gốc)
              </h2>
            </div>
            {activeChunk && (
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20 font-mono">
                Trang {activeChunk.pageNumber}
              </span>
            )}
          </div>

          {/* Source Text View */}
          <div className="flex-1 p-6 overflow-y-auto leading-relaxed text-slate-300 text-xs md:text-sm">
            {activeChunk ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-white/[0.06]">
                  <span className="font-semibold text-white">{activeChunk.chapter}</span>
                  <span className="inline-flex items-center gap-1 text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 font-mono text-[11px]">
                    <Sparkles className="w-3 h-3" /> Khớp {activeChunk.relevanceScore}%
                  </span>
                </div>

                {/* Highlighted snippet (Yellow fluorescent marker look) */}
                <div className="p-4 bg-amber-500/[0.07] border-l-4 border-amber-400 rounded-r-xl text-slate-200 text-xs md:text-sm leading-relaxed shadow-sm">
                  <p className="font-serif italic text-amber-100">
                    "{activeChunk.textSnippet}"
                  </p>
                </div>

                <div className="p-3.5 bg-white/[0.02] rounded-xl text-xs text-slate-400 flex items-start space-x-2.5 border border-white/[0.06]">
                  <AlertCircle className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    Đoạn văn bản trên được RAG Engine trích xuất trực tiếp từ trang <strong className="text-white">{activeChunk.pageNumber}</strong> của giáo trình để làm minh chứng. Giảng viên đối chiếu để tránh sai sót và hiện tượng AI ảo giác (Hallucination).
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-500 text-xs">
                <FileText className="w-8 h-8 mb-2 stroke-1" />
                <p>Chọn câu hỏi bên phải để xem tài liệu đối chiếu</p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANE: Question Cards Feed */}
        <div className="w-7/12 bg-[#080c16] flex flex-col">
          {/* Subheader / Filter */}
          <div className="p-3.5 px-6 border-b border-white/[0.06] bg-white/[0.01] flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-[11px] font-semibold text-slate-400">Lọc:</span>
              {(['all', 'pending', 'approved', 'rejected'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setFilter(mode)}
                  className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                    filter === mode
                      ? 'bg-blue-600 text-white shadow-glow-sm'
                      : 'bg-white/[0.04] text-slate-400 hover:bg-white/[0.08] hover:text-white'
                  }`}
                >
                  {mode === 'all' && `Tất cả (${totalCount})`}
                  {mode === 'pending' && `Chờ duyệt (${pendingCount})`}
                  {mode === 'approved' && `Đã duyệt (${approvedCount})`}
                  {mode === 'rejected' && `Đã loại (${rejectedCount})`}
                </button>
              ))}
            </div>

            <span className="text-[11px] text-slate-400 font-mono">
              Bấm vào thẻ để đồng bộ đoạn sách
            </span>
          </div>

          {/* Cards List */}
          <div className="flex-1 p-6 overflow-y-auto space-y-5">
            {filteredQuestions.map((q, index) => {
              const isSelected = q.id === selectedQuestionId;
              const isEditing = editingQuestionId === q.id;

              return (
                <div
                  key={q.id}
                  onClick={() => setSelectedQuestionId(q.id)}
                  className={`relative rounded-2xl border transition-all duration-200 cursor-pointer p-5 ${
                    isSelected
                      ? 'bg-[#11192b] border-blue-500/60 ring-2 ring-blue-500/20 shadow-xl'
                      : 'glass-card hover:border-white/[0.15]'
                  }`}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between mb-3 pb-3 border-b border-white/[0.06]">
                    <div className="flex items-center space-x-2.5">
                      <span className="font-mono text-xs font-bold text-slate-400">
                        #Câu {index + 1}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${getBloomBadgeColor(
                          q.bloomLevel
                        )}`}
                      >
                        {q.bloomLevel}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        Độ tin cậy: <strong className="text-emerald-400">{q.confidenceScore}%</strong>
                      </span>
                    </div>

                    {/* Status Badge */}
                    <div>
                      {q.status === 'approved' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Đã thẩm định
                        </span>
                      )}
                      {q.status === 'rejected' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-400 bg-rose-500/10 px-2.5 py-0.5 rounded-full border border-rose-500/20">
                          <XCircle className="w-3.5 h-3.5" /> Đã loại bỏ
                        </span>
                      )}
                      {q.status === 'pending' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                          Chờ giảng viên duyệt
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Question Stem */}
                  <div className="mb-4">
                    {isEditing ? (
                      <textarea
                        value={q.question}
                        onChange={(e) =>
                          onUpdateQuestion({ ...q, question: e.target.value })
                        }
                        className="w-full p-2.5 text-xs md:text-sm font-medium bg-black/30 border border-blue-500/40 rounded-xl focus:outline-none focus:border-blue-400 text-white"
                        rows={2}
                      />
                    ) : (
                      <p className="text-xs md:text-sm font-semibold text-white leading-snug">
                        {q.question}
                      </p>
                    )}
                  </div>

                  {/* Options */}
                  <div className="space-y-2 mb-4">
                    {q.options.map((opt) => {
                      const isCorrect = q.correctAnswerId === opt.id;
                      return (
                        <div
                          key={opt.id}
                          className={`flex items-center space-x-3 p-2.5 rounded-xl border text-xs md:text-sm transition-all ${
                            isCorrect
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200 font-medium'
                              : 'bg-white/[0.02] border-white/[0.06] text-slate-300'
                          }`}
                        >
                          <input
                            type="radio"
                            name={`correct-${q.id}`}
                            checked={isCorrect}
                            onChange={() => {
                              onUpdateQuestion({ ...q, correctAnswerId: opt.id });
                              onShowToast('info', 'Đã đổi đáp án đúng', `Đáp án đúng đã đổi sang phương án ${opt.label}`);
                            }}
                            className="w-4 h-4 text-emerald-500 focus:ring-emerald-500 cursor-pointer accent-emerald-500"
                          />
                          <span className="font-mono text-xs font-bold text-slate-400">
                            {opt.label}.
                          </span>

                          {isEditing ? (
                            <input
                              type="text"
                              value={opt.text}
                              onChange={(e) => {
                                const newOpts = q.options.map((o) =>
                                  o.id === opt.id ? { ...o, text: e.target.value } : o
                                );
                                onUpdateQuestion({ ...q, options: newOpts });
                              }}
                              className="flex-1 px-2 py-1 text-xs bg-black/40 border border-white/[0.1] rounded-lg text-white focus:outline-none focus:border-blue-500"
                            />
                          ) : (
                            <span className="flex-1 text-xs">{opt.text}</span>
                          )}

                          {isCorrect && (
                            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-md">
                              Đáp án chuẩn
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Explanation */}
                  <div className="p-3.5 bg-white/[0.02] rounded-xl border border-white/[0.06] mb-4 text-xs text-slate-300">
                    <span className="font-semibold text-slate-200 block mb-1">
                      Căn cứ RAG & Lời giải thích:
                    </span>
                    {isEditing ? (
                      <textarea
                        value={q.explanation}
                        onChange={(e) =>
                          onUpdateQuestion({ ...q, explanation: e.target.value })
                        }
                        className="w-full p-2 text-xs bg-black/40 border border-white/[0.1] rounded-lg text-white"
                        rows={2}
                      />
                    ) : (
                      <p className="italic text-slate-400">{q.explanation}</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-3 border-t border-white/[0.06]">
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingQuestionId(isEditing ? null : q.id);
                          if (isEditing) {
                            onShowToast('success', 'Đã lưu', 'Nội dung chỉnh sửa đã được lưu');
                          }
                        }}
                        className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
                      >
                        {isEditing ? (
                          <>
                            <Save className="w-3.5 h-3.5 text-blue-400" />
                            <span className="text-blue-400">Lưu thay đổi</span>
                          </>
                        ) : (
                          <>
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Chỉnh sửa nội dung</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRegenerateSingle(q.id);
                        }}
                        className="inline-flex items-center space-x-1.5 text-xs font-medium text-slate-400 hover:text-blue-400 transition-colors"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isRegenerating === q.id ? 'animate-spin text-blue-400' : ''}`} />
                        <span>Sinh lại bằng AI</span>
                      </button>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onUpdateQuestion({ ...q, status: 'rejected' });
                          onShowToast('warning', 'Đã loại bỏ', `Đã từ chối câu hỏi #${index + 1}`);
                        }}
                        className={`inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                          q.status === 'rejected'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : 'bg-white/[0.04] border border-white/[0.08] text-rose-400 hover:bg-rose-500/10'
                        }`}
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Loại bỏ</span>
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onUpdateQuestion({ ...q, status: 'approved' });
                          onShowToast('success', 'Đã duyệt câu hỏi', `Câu hỏi #${index + 1} đã được phê duyệt`);
                        }}
                        className={`inline-flex items-center space-x-1 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
                          q.status === 'approved'
                            ? 'bg-emerald-600 text-white shadow-glow-emerald'
                            : 'bg-white/[0.04] border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Duyệt câu hỏi</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
