import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Edit3,
  BookOpen,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  Save,
  CheckSquare,
  Sparkles,
  ArrowRight,
  Check,
} from 'lucide-react';
import { Question, BloomLevel, ScreenId, UserProfile, QuestionStatus } from '../types';

interface ReviewWorkspaceScreenProps {
  questions: Question[];
  onUpdateQuestion: (updated: Question) => void;
  onBatchApprove: () => void;
  onNavigate: (screen: ScreenId) => void;
  onShowToast: (
    type: 'success' | 'info' | 'warning' | 'error',
    title: string,
    message: string
  ) => void;
  currentUser?: UserProfile | null;
}

const BLOOM_ORDER: BloomLevel[] = ['Nhận biết', 'Thông hiểu', 'Vận dụng', 'Phân tích'];

const BLOOM_STYLE: Record<
  BloomLevel,
  { label: string; en: string; bg: string; color: string; border: string }
> = {
  'Nhận biết': {
    label: 'Nhận biết',
    en: 'Remember',
    bg: 'bg-sky-50',
    color: 'text-sky-700',
    border: 'border-sky-200',
  },
  'Thông hiểu': {
    label: 'Thông hiểu',
    en: 'Understand',
    bg: 'bg-[#e6f4f4]',
    color: 'text-[#008689]',
    border: 'border-[#b2d8d8]',
  },
  'Vận dụng': {
    label: 'Vận dụng',
    en: 'Apply',
    bg: 'bg-amber-50',
    color: 'text-amber-700',
    border: 'border-amber-200',
  },
  'Phân tích': {
    label: 'Phân tích',
    en: 'Analyze',
    bg: 'bg-rose-50',
    color: 'text-rose-700',
    border: 'border-rose-200',
  },
};

export const ReviewWorkspaceScreen: React.FC<ReviewWorkspaceScreenProps> = ({
  questions,
  onUpdateQuestion,
  onBatchApprove,
  onNavigate,
  onShowToast,
}) => {
  const [selectedId, setSelectedId] = useState<string>(questions[0]?.id || '');
  const [filterStatus, setFilterStatus] = useState<'all' | QuestionStatus>('all');
  const [filterBloom, setFilterBloom] = useState<'all' | BloomLevel>('all');
  const [isEditing, setIsEditing] = useState(false);

  // Edit Buffer
  const [editStem, setEditStem] = useState('');
  const [editOptions, setEditOptions] = useState<Question['options']>([]);
  const [editCorrectId, setEditCorrectId] = useState('');
  const [editExplanation, setEditExplanation] = useState('');
  const [editBloom, setEditBloom] = useState<BloomLevel>('Thông hiểu');

  const filteredQuestions = questions.filter((q) => {
    const matchStatus = filterStatus === 'all' || q.status === filterStatus;
    const matchBloom = filterBloom === 'all' || q.bloomLevel === filterBloom;
    return matchStatus && matchBloom;
  });

  const activeQuestion =
    questions.find((q) => q.id === selectedId) || filteredQuestions[0] || questions[0];

  useEffect(() => {
    if (activeQuestion) {
      setEditStem(activeQuestion.question);
      setEditOptions(activeQuestion.options.map((o) => ({ ...o })));
      setEditCorrectId(activeQuestion.correctAnswerId);
      setEditExplanation(activeQuestion.explanation);
      setEditBloom(activeQuestion.bloomLevel);
      setIsEditing(false);
    }
  }, [activeQuestion?.id]);

  const handleStatusChange = useCallback(
    (status: QuestionStatus) => {
      if (!activeQuestion) return;
      onUpdateQuestion({
        ...activeQuestion,
        status,
      });

      if (status === 'approved') {
        onShowToast(
          'success',
          'Đã chốt câu hỏi vào Ngân hàng Đề',
          `Câu hỏi thuộc "${activeQuestion.chapter}" đã sẵn sàng để đóng gói đề thi.`
        );
      } else if (status === 'rejected') {
        onShowToast(
          'warning',
          'Đã đánh dấu loại bỏ câu hỏi',
          `Câu hỏi thuộc "${activeQuestion.chapter}" đã được loại khỏi bộ đề.`
        );
      }

      const currentIndex = filteredQuestions.findIndex((q) => q.id === activeQuestion.id);
      if (currentIndex >= 0 && currentIndex < filteredQuestions.length - 1) {
        setSelectedId(filteredQuestions[currentIndex + 1].id);
      }
    },
    [activeQuestion, filteredQuestions, onUpdateQuestion, onShowToast]
  );

  // Keyboard shortcuts for fast teacher review (A = Approve, R = Reject, E = Edit)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || isEditing) return;

      if (e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        handleStatusChange('approved');
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        handleStatusChange('rejected');
      } else if (e.key === 'e' || e.key === 'E') {
        e.preventDefault();
        setIsEditing(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleStatusChange, isEditing]);

  const handleSaveEdit = () => {
    if (!activeQuestion) return;
    onUpdateQuestion({
      ...activeQuestion,
      question: editStem,
      options: editOptions,
      correctAnswerId: editCorrectId,
      explanation: editExplanation,
      bloomLevel: editBloom,
    });
    setIsEditing(false);
    onShowToast('info', 'Đã lưu chỉnh sửa', 'Nội dung câu hỏi và mức độ Bloom đã được cập nhật.');
  };

  const handleQuickBloomCycle = () => {
    if (!activeQuestion) return;
    const idx = BLOOM_ORDER.indexOf(activeQuestion.bloomLevel);
    const nextBloom = BLOOM_ORDER[(idx + 1) % BLOOM_ORDER.length];
    onUpdateQuestion({
      ...activeQuestion,
      bloomLevel: nextBloom,
    });
    onShowToast(
      'info',
      'Đã đổi mức độ Bloom',
      `Đã chuyển câu hỏi sang mức "${BLOOM_STYLE[nextBloom].label}" (${BLOOM_STYLE[nextBloom].en}).`
    );
  };

  const handleOptionTextChange = (optId: string, newText: string) => {
    setEditOptions((prev) =>
      prev.map((o) => (o.id === optId ? { ...o, text: newText } : o))
    );
  };

  const handleApproveAllAndProceedToExport = () => {
    onBatchApprove();
    onNavigate('bank');
  };

  const pendingCount = questions.filter((q) => q.status === 'pending').length;
  const approvedCount = questions.filter(
    (q) => q.status === 'approved' || q.status === 'locked_for_exam'
  ).length;
  const rejectedCount = questions.filter((q) => q.status === 'rejected').length;

  const getStatusBadge = (status: QuestionStatus) => {
    switch (status) {
      case 'approved':
      case 'locked_for_exam':
        return {
          label: 'Đã chốt vào Đề thi',
          className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />,
        };
      case 'rejected':
        return {
          label: 'Đã loại bỏ',
          className: 'bg-rose-50 text-rose-700 border-rose-200',
          icon: <XCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />,
        };
      default:
        return {
          label: 'Chờ kiểm tra',
          className: 'bg-amber-50 text-amber-700 border-amber-200',
          icon: <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />,
        };
    }
  };

  if (questions.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto p-6">
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-sm">
          <Sparkles className="w-10 h-10 text-[#008689] mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-800">
            Chưa có câu hỏi nào trong phiên làm việc
          </h3>
          <p className="text-sm text-slate-500 mt-1 mb-5">
            Hãy chạy trình sinh câu hỏi AI ở Bước 2 trước khi đối soát và biên tập đề.
          </p>
          <button
            onClick={() => onNavigate('generate')}
            className="px-5 py-2.5 bg-[#008689] text-white font-semibold text-sm rounded-lg hover:bg-[#006f72] transition-colors"
          >
            Quay lại Bước 2: Sinh Câu Hỏi AI
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-4">
      {/* Top Connected Workflow Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
            {[
              { id: 'all', label: `Tất cả (${questions.length})` },
              { id: 'pending', label: `Chờ kiểm tra (${pendingCount})` },
              { id: 'approved', label: `Đã chốt (${approvedCount})` },
              { id: 'rejected', label: `Đã loại (${rejectedCount})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterStatus(tab.id as typeof filterStatus)}
                className={`px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  filterStatus === tab.id
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <select
            value={filterBloom}
            onChange={(e) => setFilterBloom(e.target.value as typeof filterBloom)}
            className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:border-[#008689]"
          >
            <option value="all">Tất cả mức Bloom</option>
            {BLOOM_ORDER.map((lvl) => (
              <option key={lvl} value={lvl}>
                {BLOOM_STYLE[lvl].label} ({BLOOM_STYLE[lvl].en})
              </option>
            ))}
          </select>
        </div>

        {/* Action Buttons connecting Step 3 -> Step 4 */}
        <div className="flex flex-wrap items-center gap-2">
          {pendingCount > 0 && (
            <button
              onClick={onBatchApprove}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-semibold text-xs rounded-lg transition-colors"
            >
              <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
              Chốt nhanh tất cả ({pendingCount} câu)
            </button>
          )}

          <button
            onClick={handleApproveAllAndProceedToExport}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#008689] hover:bg-[#006f72] text-white font-bold text-xs rounded-lg transition-colors shadow-sm"
          >
            <span>Bước 4: Đóng gói Tờ Đề A4 & Xuất File ({questions.length} câu)</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Split-View Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left List */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              Danh sách câu hỏi ({filteredQuestions.length})
            </span>
          </div>
          <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
            {filteredQuestions.map((q, idx) => {
              const isSelected = activeQuestion?.id === q.id;
              const bloomCfg = BLOOM_STYLE[q.bloomLevel];
              const badge = getStatusBadge(q.status);
              return (
                <button
                  key={q.id}
                  onClick={() => setSelectedId(q.id)}
                  className={`w-full text-left p-3.5 transition-colors flex items-start gap-2.5 ${
                    isSelected
                      ? 'bg-[#e6f4f4]/60 border-l-4 border-l-[#008689]'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="mt-0.5">{badge.icon}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold text-slate-700">Câu {idx + 1}</span>
                      <span
                        className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${bloomCfg.bg} ${bloomCfg.color} ${bloomCfg.border}`}
                      >
                        {q.bloomLevel}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 line-clamp-2 mt-1">{q.question}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Center Question Inspector & Editor */}
        {activeQuestion && (
          <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5 gap-2 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`text-xs font-semibold px-2.5 py-0.5 rounded border ${
                    BLOOM_STYLE[activeQuestion.bloomLevel].bg
                  } ${BLOOM_STYLE[activeQuestion.bloomLevel].color} ${
                    BLOOM_STYLE[activeQuestion.bloomLevel].border
                  }`}
                >
                  {BLOOM_STYLE[activeQuestion.bloomLevel].label} (
                  {BLOOM_STYLE[activeQuestion.bloomLevel].en})
                </span>
                <span
                  className={`text-xs font-semibold px-2.5 py-0.5 rounded border ${
                    getStatusBadge(activeQuestion.status).className
                  }`}
                >
                  {getStatusBadge(activeQuestion.status).label}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                {!isEditing ? (
                  <>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Chỉnh sửa (E)
                    </button>
                    <button
                      onClick={handleQuickBloomCycle}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-[#008689] bg-[#e6f4f4] hover:bg-[#d5ecec]"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Đổi Bloom
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleSaveEdit}
                    className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold bg-[#008689] text-white hover:bg-[#006f72]"
                  >
                    <Save className="w-3.5 h-3.5" />
                    Lưu thay đổi
                  </button>
                )}
              </div>
            </div>

            {/* Question Stem */}
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1.5">
                Nội dung câu hỏi — {activeQuestion.chapter}
              </label>
              {isEditing ? (
                <div className="space-y-2">
                  <textarea
                    rows={3}
                    value={editStem}
                    onChange={(e) => setEditStem(e.target.value)}
                    className="w-full p-3 rounded-lg border border-slate-300 text-sm text-slate-800 focus:outline-none focus:border-[#008689]"
                  />
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-600">Mức độ Bloom:</span>
                    <select
                      value={editBloom}
                      onChange={(e) => setEditBloom(e.target.value as BloomLevel)}
                      className="px-2.5 py-1 rounded border border-slate-300 text-xs font-semibold text-slate-700"
                    >
                      {BLOOM_ORDER.map((lvl) => (
                        <option key={lvl} value={lvl}>
                          {BLOOM_STYLE[lvl].label} ({BLOOM_STYLE[lvl].en})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                <p className="text-sm font-semibold text-slate-800 leading-relaxed">
                  {activeQuestion.question}
                </p>
              )}
            </div>

            {/* Options */}
            <div className="space-y-2.5">
              <label className="block text-[11px] font-bold text-slate-400 uppercase">
                Phương án trả lời {isEditing && '(Bấm vào A/B/C/D để chọn đáp án đúng)'}
              </label>
              {(isEditing ? editOptions : activeQuestion.options).map((opt) => {
                const isCorrect =
                  (isEditing ? editCorrectId : activeQuestion.correctAnswerId) === opt.id;
                return (
                  <div
                    key={opt.id}
                    className={`p-3 rounded-lg border text-sm flex items-start gap-3 ${
                      isCorrect
                        ? 'bg-emerald-50/60 border-emerald-300 text-emerald-950'
                        : 'bg-slate-50/60 border-slate-200 text-slate-700'
                    }`}
                  >
                    <button
                      type="button"
                      disabled={!isEditing}
                      onClick={() => setEditCorrectId(opt.id)}
                      className={`w-6 h-6 rounded-md text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 ${
                        isCorrect
                          ? 'bg-emerald-600 text-white'
                          : 'bg-white border border-slate-300 text-slate-600'
                      }`}
                    >
                      {opt.label}
                    </button>
                    {isEditing ? (
                      <input
                        type="text"
                        value={opt.text}
                        onChange={(e) => handleOptionTextChange(opt.id, e.target.value)}
                        className="flex-1 bg-white px-2.5 py-1 rounded border border-slate-300 text-sm focus:outline-none focus:border-[#008689]"
                      />
                    ) : (
                      <span className="flex-1 leading-relaxed">{opt.text}</span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Explanation */}
            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
              <span className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                Giải thích đáp án & Hướng dẫn chấm
              </span>
              {isEditing ? (
                <textarea
                  rows={2}
                  value={editExplanation}
                  onChange={(e) => setEditExplanation(e.target.value)}
                  className="w-full p-2 rounded border border-slate-300 text-xs text-slate-700 bg-white focus:outline-none"
                />
              ) : (
                <p className="text-xs text-slate-600 leading-relaxed">
                  {activeQuestion.explanation}
                </p>
              )}
            </div>

            {/* Decision Bar */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
              <button
                onClick={() => handleStatusChange('rejected')}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold transition-colors"
              >
                <X className="w-4 h-4" />
                Loại câu này (R)
              </button>
              <button
                onClick={() => handleStatusChange('approved')}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-[#008689] text-white hover:bg-[#006f72] text-xs font-semibold transition-colors"
              >
                <Check className="w-4 h-4" />
                Chốt câu hỏi vào Đề (A)
              </button>
            </div>
          </div>
        )}

        {/* Right Source Citation Panel (RAG Grounding) */}
        {activeQuestion && (
          <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#008689]" />
                <h3 className="text-sm font-bold text-slate-800">
                  Đối chiếu Giáo trình Gốc (RAG)
                </h3>
              </div>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Độ khớp: {activeQuestion.confidenceScore}%
              </span>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                <FileText className="w-3.5 h-3.5 text-[#008689] shrink-0" />
                <span className="truncate">{activeQuestion.textbookName}</span>
              </div>
              <p className="text-xs text-slate-500">
                Chương mục:{' '}
                <strong className="text-slate-700">{activeQuestion.chapter}</strong>
              </p>
              <p className="text-xs text-slate-500">
                Vị trí trích xuất:{' '}
                <strong className="text-slate-700">{activeQuestion.sourceChunkId}</strong>
              </p>
            </div>

            <div>
              <span className="block text-[11px] font-bold text-slate-400 uppercase mb-2">
                Minh chứng kiến thức trong sách
              </span>
              <blockquote className="p-4 rounded-lg bg-[#e6f4f4]/50 border-l-4 border-[#008689] text-xs text-slate-700 leading-relaxed italic">
                "{activeQuestion.explanation}"
              </blockquote>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
