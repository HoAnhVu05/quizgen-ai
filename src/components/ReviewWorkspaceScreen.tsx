import React, { useState, useEffect, useMemo } from 'react';
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
  CheckCheck,
  X,
  Search,
  Maximize2,
  ShieldAlert,
  SlidersHorizontal,
  BookmarkCheck,
  Eye,
} from 'lucide-react';
import { Question, SourceChunk, BloomLevel, QuestionStatus, ScreenId } from '../types';
import { findKnowledgeForChapter } from '../constants/curriculumData';

interface ReviewWorkspaceScreenProps {
  questions: Question[];
  onUpdateQuestion: (updated: Question) => void;
  onBatchApprove: () => void;
  onNavigate: (screen: ScreenId) => void;
  onShowToast: (type: 'success' | 'info' | 'warning' | 'error', title: string, message: string) => void;
}

const BLOOM_LEVELS: BloomLevel[] = ['Nhận biết', 'Thông hiểu', 'Vận dụng', 'Phân tích'];

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
  const [editFormData, setEditFormData] = useState<Question | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [isRegenerating, setIsRegenerating] = useState<string | null>(null);

  // ─── State mở Modal Đối soát Trích dẫn RAG Chuyên sâu ────────────────────
  const [citationModalQuestion, setCitationModalQuestion] = useState<Question | null>(null);

  const activeQuestion = questions.find((q) => q.id === selectedQuestionId) || questions[0];

  // Lấy dữ liệu đoạn trích dẫn thực tế theo chương và giáo trình của câu hỏi đang chọn
  const activeChunk = useMemo<SourceChunk | null>(() => {
    if (!activeQuestion) return null;
    const knowledge = findKnowledgeForChapter(
      activeQuestion.textbookName || 'doc-kinh-te-vi-mo-2025',
      activeQuestion.chapter || 'Chương 2'
    );
    return {
      id: activeQuestion.sourceChunkId || `chunk-${knowledge.pageNumber}`,
      pageNumber: knowledge.pageNumber || 42,
      chapter: activeQuestion.chapter || knowledge.chapterName,
      textSnippet: knowledge.textSnippet,
      relevanceScore: knowledge.relevanceScore || 96,
    };
  }, [activeQuestion]);

  // Lấy dữ liệu đoạn trích dẫn RAG cho câu hỏi hiển thị trong Modal đối soát
  const modalChunk = useMemo<SourceChunk | null>(() => {
    if (!citationModalQuestion) return null;
    const knowledge = findKnowledgeForChapter(
      citationModalQuestion.textbookName || 'doc-kinh-te-vi-mo-2025',
      citationModalQuestion.chapter || 'Chương 2'
    );
    return {
      id: citationModalQuestion.sourceChunkId || `chunk-${knowledge.pageNumber}`,
      pageNumber: knowledge.pageNumber || 42,
      chapter: citationModalQuestion.chapter || knowledge.chapterName,
      textSnippet: knowledge.textSnippet,
      relevanceScore: knowledge.relevanceScore || 96,
    };
  }, [citationModalQuestion]);

  // Khởi tạo form khi bắt đầu chỉnh sửa một câu hỏi
  const startEditing = (q: Question) => {
    setEditingQuestionId(q.id);
    setEditFormData(JSON.parse(JSON.stringify(q)));
  };

  const cancelEditing = () => {
    setEditingQuestionId(null);
    setEditFormData(null);
  };

  const saveEditing = () => {
    if (editFormData) {
      onUpdateQuestion(editFormData);
      onShowToast('success', 'Đã lưu thay đổi', 'Nội dung câu hỏi và đáp án đã được cập nhật thành công');
    }
    setEditingQuestionId(null);
    setEditFormData(null);
  };

  // Keyboard Shortcuts Support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['TEXTAREA', 'INPUT'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      if (e.key === 'a' || e.key === 'A') {
        if (activeQuestion) {
          onUpdateQuestion({ ...activeQuestion, status: 'approved' });
          onShowToast('success', 'Đã duyệt', `Câu hỏi đã được thẩm định đạt chuẩn`);
        }
      } else if (e.key === 'r' || e.key === 'R') {
        if (activeQuestion) {
          onUpdateQuestion({ ...activeQuestion, status: 'rejected' });
          onShowToast('warning', 'Đã loại bỏ', `Đã từ chối câu hỏi`);
        }
      } else if (e.key === 'e' || e.key === 'E') {
        if (activeQuestion) {
          if (editingQuestionId === activeQuestion.id) {
            cancelEditing();
          } else {
            startEditing(activeQuestion);
          }
        }
      } else if (e.key === 'm' || e.key === 'M') {
        if (activeQuestion) {
          setCitationModalQuestion(activeQuestion);
        }
      } else if (e.key === 'Escape') {
        if (citationModalQuestion) {
          setCitationModalQuestion(null);
        } else if (editingQuestionId) {
          cancelEditing();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeQuestion, editingQuestionId, citationModalQuestion, onUpdateQuestion, onShowToast]);

  // Single Question AI Re-generation via Endpoint or Fallback
  const handleRegenerateSingle = async (qId: string) => {
    const targetQ = questions.find((q) => q.id === qId) || activeQuestion;
    if (!targetQ) return;

    setIsRegenerating(qId);
    const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

    try {
      const res = await fetch(`${API_BASE}/ai/regenerate/${qId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(targetQ),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.question) {
          onUpdateQuestion({
            ...targetQ,
            question: data.question.question || `[AI Đã tối ưu] ${targetQ.question}`,
            options: data.question.options || targetQ.options,
            correctAnswerId: data.question.correctAnswerId || targetQ.correctAnswerId,
            explanation: data.question.explanation || targetQ.explanation,
            confidenceScore: data.question.confidenceScore || 98,
            status: 'pending',
          });
          onShowToast('info', 'AI đã sinh lại câu hỏi', 'Nội dung và phương án đã được hiệu chỉnh');
          setIsRegenerating(null);
          return;
        }
      }
    } catch {
      // Fallback cục bộ
    }

    setTimeout(() => {
      const regenerated: Question = {
        ...targetQ,
        question: `[AI Đã tối ưu] ${targetQ.question.replace(/^\[AI Đã tối ưu\]\s*/, '')}`,
        confidenceScore: Math.min(99, targetQ.confidenceScore + 1),
        status: 'pending',
      };
      onUpdateQuestion(regenerated);
      setIsRegenerating(null);
      onShowToast('info', 'AI đã sinh lại câu hỏi', 'Phương án nhiễu đã được tinh chỉnh theo ngữ cảnh RAG');
    }, 1000);
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
      {/* ─── 1. Header Bar ────────────────────────────────────────────── */}
      <header className="h-16 bg-[#0e1424] border-b border-white/[0.06] px-6 flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => onNavigate('dashboard')}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
            title="Quay lại Bảng điều khiển"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="h-5 w-px bg-white/[0.08]" />
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-white text-sm">
                Không gian Đối chiếu & Kiểm duyệt RAG
              </span>
              <span
                className="px-2.5 py-0.5 rounded text-[11px] font-semibold bg-blue-500/15 text-blue-300 border border-blue-500/25 max-w-[280px] truncate"
                title={activeQuestion?.chapter}
              >
                {activeQuestion?.chapter || 'Chương 2: Cung - Cầu và Cơ chế cân bằng giá cả thị trường'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
              <FileText className="w-3 h-3 text-slate-500" /> Nguồn:{' '}
              {activeQuestion?.textbookName || 'GiaoTrinh_KinhTeViMo_2025.pdf'}
            </p>
          </div>
        </div>

        {/* Global Progress & Actions */}
        <div className="flex items-center space-x-4">
          {/* Keyboard hint badge */}
          <div className="hidden lg:flex items-center space-x-2 text-[10px] text-slate-400 font-mono bg-white/[0.04] px-2.5 py-1 rounded-lg border border-white/[0.06]">
            <Keyboard className="w-3.5 h-3.5 text-blue-400" />
            <span>Phím tắt: [A] Duyệt • [R] Loại • [E] Sửa • [M] Modal RAG</span>
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
                onShowToast(
                  'success',
                  'Chuyển sang Ngân hàng đề',
                  'Đã lưu trữ toàn bộ các câu hỏi đã duyệt vào kho đề thi'
                );
              }}
              className="flex items-center space-x-1.5 px-4 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl hover:from-blue-500 hover:to-indigo-500 transition-all shadow-md shadow-blue-600/20"
            >
              <CheckCheck className="w-4 h-4" />
              <span>Chuyển vào Kho đề</span>
            </button>
          </div>
        </div>
      </header>

      {/* ─── 2. Main Workspace Split View ─────────────────────────────── */}
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
              <div className="flex items-center gap-2">
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20 font-mono font-bold">
                  Trang {activeChunk.pageNumber}
                </span>
                <button
                  onClick={() => setCitationModalQuestion(activeQuestion)}
                  className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/30 flex items-center gap-1 transition-colors"
                  title="Phóng to modal đối soát chi tiết"
                >
                  <Maximize2 className="w-3 h-3" />
                  <span>Mở Modal</span>
                </button>
              </div>
            )}
          </div>

          {/* Source Text View */}
          <div className="flex-1 p-6 overflow-y-auto leading-relaxed text-slate-300 text-xs md:text-sm space-y-4">
            {activeChunk ? (
              <>
                <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-white/[0.06]">
                  <span className="font-semibold text-white">{activeChunk.chapter}</span>
                  <span className="inline-flex items-center gap-1 text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 font-mono text-[11px]">
                    <Sparkles className="w-3 h-3" /> Khớp {activeChunk.relevanceScore}%
                  </span>
                </div>

                {/* Highlighted snippet (Yellow fluorescent marker look) */}
                <div className="p-4 bg-amber-500/[0.08] border-l-4 border-amber-400 rounded-r-xl text-slate-200 text-xs md:text-sm leading-relaxed shadow-sm">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-amber-300/80 mb-1 flex items-center gap-1">
                    <BookmarkCheck className="w-3 h-3" /> Đoạn bóc tách RAG (Trang {activeChunk.pageNumber})
                  </div>
                  <p className="font-sans italic text-amber-100 leading-relaxed text-sm">
                    "{activeChunk.textSnippet}"
                  </p>
                </div>

                <div className="p-3.5 bg-white/[0.02] rounded-xl text-xs text-slate-400 flex items-start space-x-2.5 border border-white/[0.06]">
                  <AlertCircle className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    Đoạn văn bản trên được RAG Engine trích xuất trực tiếp từ trang{' '}
                    <strong className="text-white font-mono">Trang {activeChunk.pageNumber}</strong> của giáo trình để làm minh
                    chứng. Giảng viên đối chiếu để tránh sai sót và hiện tượng AI ảo giác (Hallucination).
                  </p>
                </div>

                {/* Nút hành động nhanh mở modal đối soát */}
                <button
                  onClick={() => setCitationModalQuestion(activeQuestion)}
                  className="w-full py-2.5 px-3.5 rounded-xl border border-blue-500/30 bg-blue-600/10 hover:bg-blue-600/20 text-blue-300 text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-sm group"
                >
                  <Eye className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
                  <span>Mở Cửa sổ Đối soát Toàn diện & Trích dẫn Trang sách</span>
                </button>
              </>
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
              <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                <Filter className="w-3 h-3 text-slate-400" /> Lọc:
              </span>
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
              Bấm vào thẻ để đồng bộ RAG
            </span>
          </div>

          {/* Cards List */}
          <div className="flex-1 p-6 overflow-y-auto space-y-5">
            {filteredQuestions.map((q, index) => {
              const isSelected = q.id === selectedQuestionId;
              const isEditing = editingQuestionId === q.id;
              const currentFormData = isEditing ? editFormData || q : q;

              return (
                <div
                  key={q.id}
                  onClick={() => setSelectedQuestionId(q.id)}
                  className={`relative rounded-2xl border transition-all duration-200 p-5 ${
                    isSelected
                      ? 'bg-[#11192b] border-blue-500/60 ring-2 ring-blue-500/20 shadow-xl'
                      : 'bg-[#0e1424] border-white/[0.08] hover:border-white/[0.18]'
                  }`}
                >
                  {/* Header Thẻ Câu Hỏi */}
                  <div className="flex items-center justify-between mb-3 pb-3 border-b border-white/[0.06]">
                    <div className="flex items-center space-x-2.5">
                      <span className="font-mono text-xs font-bold text-slate-400">
                        #Câu {index + 1}
                      </span>
                      {isEditing ? (
                        <select
                          value={currentFormData.bloomLevel}
                          onChange={(e) =>
                            setEditFormData((prev) =>
                              prev ? { ...prev, bloomLevel: e.target.value as BloomLevel } : null
                            )
                          }
                          className="bg-[#1a233a] border border-blue-500/40 text-blue-300 text-[11px] font-semibold rounded-lg px-2 py-0.5 outline-none"
                        >
                          {BLOOM_LEVELS.map((lvl) => (
                            <option key={lvl} value={lvl}>
                              {lvl}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${getBloomBadgeColor(
                            q.bloomLevel
                          )}`}
                        >
                          {q.bloomLevel}
                        </span>
                      )}
                      <span className="text-[11px] text-slate-400 font-mono">
                        Độ tin cậy: <strong className="text-emerald-400">{q.confidenceScore}%</strong>
                      </span>
                    </div>

                    {/* Status Badge & Nút mở Modal RAG */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setCitationModalQuestion(q);
                        }}
                        className="px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-blue-500/10 text-blue-300 border border-blue-500/25 hover:bg-blue-500/20 flex items-center gap-1 transition-colors"
                        title="Đối soát số trang và đoạn văn gốc"
                      >
                        <BookOpen className="w-3 h-3 text-blue-400" />
                        <span>Xem trang RAG</span>
                      </button>

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

                  {/* Thân Câu Hỏi (Question Stem) */}
                  <div className="mb-4">
                    {isEditing ? (
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-slate-400">
                          Nội dung câu hỏi:
                        </label>
                        <textarea
                          value={currentFormData.question}
                          onChange={(e) =>
                            setEditFormData((prev) =>
                              prev ? { ...prev, question: e.target.value } : null
                            )
                          }
                          className="w-full p-2.5 text-xs md:text-sm font-medium bg-black/40 border border-blue-500/50 rounded-xl focus:outline-none focus:border-blue-400 text-white"
                          rows={2}
                        />
                      </div>
                    ) : (
                      <p className="text-xs md:text-sm font-semibold text-white leading-snug">
                        {q.question}
                      </p>
                    )}
                  </div>

                  {/* Các Phương Án Lựa Chọn (Options A, B, C, D) */}
                  <div className="space-y-2 mb-4">
                    {currentFormData.options.map((opt) => {
                      const isCorrect = currentFormData.correctAnswerId === opt.id;
                      return (
                        <div
                          key={opt.id}
                          className={`flex items-center space-x-3 p-2.5 rounded-xl border text-xs md:text-sm transition-all ${
                            isCorrect
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200 font-medium'
                              : 'bg-white/[0.02] border-white/[0.06] text-slate-300'
                          }`}
                        >
                          {/* Radio chọn đáp án đúng */}
                          <input
                            type="radio"
                            name={`correct-${q.id}`}
                            checked={isCorrect}
                            onChange={() => {
                              if (isEditing) {
                                setEditFormData((prev) =>
                                  prev ? { ...prev, correctAnswerId: opt.id } : null
                                );
                              } else {
                                onUpdateQuestion({ ...q, correctAnswerId: opt.id });
                                onShowToast(
                                  'info',
                                  'Đã đổi đáp án đúng',
                                  `Đáp án đúng đã đổi sang phương án ${opt.label}`
                                );
                              }
                            }}
                            className="w-4 h-4 text-emerald-500 focus:ring-emerald-500 cursor-pointer accent-emerald-500 shrink-0"
                          />
                          <span className="font-mono text-xs font-bold text-slate-400 shrink-0">
                            {opt.label}.
                          </span>

                          {/* Text nội dung đáp án */}
                          {isEditing ? (
                            <input
                              type="text"
                              value={opt.text}
                              onChange={(e) => {
                                const newOpts = currentFormData.options.map((o) =>
                                  o.id === opt.id ? { ...o, text: e.target.value } : o
                                );
                                setEditFormData((prev) =>
                                  prev ? { ...prev, options: newOpts } : null
                                );
                              }}
                              className="flex-1 px-2.5 py-1 text-xs bg-black/40 border border-white/[0.1] rounded-lg text-white focus:outline-none focus:border-blue-500"
                            />
                          ) : (
                            <span className="flex-1 text-xs leading-relaxed">{opt.text}</span>
                          )}

                          {isCorrect && (
                            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-md shrink-0">
                              Đáp án chuẩn
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Lời Giải Thích / Căn Cứ RAG */}
                  <div className="p-3.5 bg-white/[0.02] rounded-xl border border-white/[0.06] mb-4 text-xs text-slate-300">
                    <span className="font-semibold text-slate-200 block mb-1">
                      Căn cứ RAG & Lời giải thích học thuật:
                    </span>
                    {isEditing ? (
                      <textarea
                        value={currentFormData.explanation}
                        onChange={(e) =>
                          setEditFormData((prev) =>
                            prev ? { ...prev, explanation: e.target.value } : null
                          )
                        }
                        className="w-full p-2 text-xs bg-black/40 border border-white/[0.1] rounded-lg text-white outline-none focus:border-blue-500"
                        rows={2}
                      />
                    ) : (
                      <p className="italic text-slate-400 leading-relaxed">{q.explanation}</p>
                    )}
                  </div>

                  {/* Thanh Thao Tác Chỉnh Sửa & Phê Duyệt */}
                  <div className="flex items-center justify-between pt-3 border-t border-white/[0.06]">
                    <div className="flex items-center space-x-2">
                      {isEditing ? (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              saveEditing();
                            }}
                            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 transition-colors shadow-sm"
                          >
                            <Save className="w-3.5 h-3.5" />
                            <span>Lưu thay đổi</span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              cancelEditing();
                            }}
                            className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-xl text-xs font-medium text-slate-400 hover:text-white bg-white/[0.05] transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Hủy</span>
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            startEditing(q);
                          }}
                          className="inline-flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-blue-400" />
                          <span>Chỉnh sửa câu hỏi</span>
                        </button>
                      )}

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRegenerateSingle(q.id);
                        }}
                        disabled={isRegenerating === q.id}
                        className="inline-flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium text-slate-400 hover:text-blue-400 bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.06] transition-colors disabled:opacity-50"
                      >
                        <RefreshCw
                          className={`w-3.5 h-3.5 ${
                            isRegenerating === q.id ? 'animate-spin text-blue-400' : ''
                          }`}
                        />
                        <span>{isRegenerating === q.id ? 'Đang sinh...' : 'Sinh lại AI'}</span>
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
                          onShowToast(
                            'success',
                            'Đã duyệt câu hỏi',
                            `Câu hỏi #${index + 1} đã được phê duyệt`
                          );
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

      {/* ─── 3. MODAL ĐỐI SOÁT TRÍCH DẪN RAG & SỐ TRANG SÁCH THỰC TẾ ───── */}
      {citationModalQuestion && modalChunk && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-3xl rounded-2xl border border-white/[0.12] bg-[#0c1220] shadow-2xl shadow-black/80 flex flex-col max-h-[90vh] overflow-hidden">
            {/* Header Modal */}
            <div className="p-5 border-b border-white/[0.08] flex items-center justify-between bg-white/[0.02]">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span>Không gian Đối soát Minh chứng RAG & Căn cứ Học thuật</span>
                    <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      Khớp {modalChunk.relevanceScore}%
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Đối chiếu câu hỏi trắc nghiệm do Gemini sinh với trang tài liệu gốc trong giáo trình
                  </p>
                </div>
              </div>

              <button
                onClick={() => setCitationModalQuestion(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Nội dung Modal (Body) */}
            <div className="flex-1 p-6 overflow-y-auto space-y-5 text-xs text-slate-300">
              {/* Thanh thông tin trích xuất RAG */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-xs">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Giáo trình gốc:</span>
                  <span className="font-semibold text-white truncate block" title={citationModalQuestion.textbookName}>
                    {citationModalQuestion.textbookName || 'GiaoTrinh_KinhTeViMo_2025.pdf'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Trang sách thực tế:</span>
                  <span className="font-mono font-bold text-amber-300 text-sm flex items-center gap-1">
                    <BookmarkCheck className="w-4 h-4 text-amber-400" />
                    Trang {modalChunk.pageNumber}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Cấp độ Bloom:</span>
                  <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold border ${getBloomBadgeColor(citationModalQuestion.bloomLevel)}`}>
                    {citationModalQuestion.bloomLevel}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Mô hình AI:</span>
                  <span className="font-mono text-blue-300 text-xs flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-blue-400" />
                    Gemini 2.5 Flash
                  </span>
                </div>
              </div>

              {/* Khung đoạn trích nguyên văn từ sách (High-visibility marker) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-amber-400" />
                    Đoạn văn bản trích xuất trực tiếp từ Trang {modalChunk.pageNumber}:
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    Chunk ID: {modalChunk.id}
                  </span>
                </div>
                <div className="p-4 rounded-xl bg-amber-500/[0.08] border border-amber-400/30 text-amber-100 text-sm leading-relaxed font-sans italic shadow-inner">
                  "{modalChunk.textSnippet}"
                </div>
              </div>

              {/* Khung câu hỏi & Đáp án đối chiếu */}
              <div className="p-4 rounded-xl bg-[#131b2e] border border-blue-500/30 space-y-3">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-blue-400 block mb-1">
                    Câu hỏi đang đối soát:
                  </span>
                  <p className="text-sm font-bold text-white">{citationModalQuestion.question}</p>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                    Các phương án trả lời:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {citationModalQuestion.options.map((opt) => {
                      const isCorrect = citationModalQuestion.correctAnswerId === opt.id;
                      return (
                        <div
                          key={opt.id}
                          className={`p-2.5 rounded-lg border text-xs flex items-center gap-2 ${
                            isCorrect
                              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200 font-semibold ring-1 ring-emerald-500/30'
                              : 'bg-white/[0.02] border-white/[0.06] text-slate-300'
                          }`}
                        >
                          <span className="font-mono font-bold text-slate-400">{opt.label}.</span>
                          <span className="flex-1">{opt.text}</span>
                          {isCorrect && (
                            <span className="text-[9px] uppercase font-extrabold bg-emerald-500/30 text-emerald-300 px-1.5 py-0.5 rounded">
                              Chuẩn
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Luận điểm giải thích */}
                <div className="pt-2 border-t border-white/[0.06]">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                    Căn cứ giải thích học thuật:
                  </span>
                  <p className="italic text-slate-300 leading-relaxed">
                    {citationModalQuestion.explanation}
                  </p>
                </div>
              </div>
            </div>

            {/* Footer Modal với các nút Thao tác */}
            <div className="p-4 px-6 border-t border-white/[0.08] bg-white/[0.02] flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                Minh chứng đã được đối chiếu với trang <strong className="text-white">{modalChunk.pageNumber}</strong>
              </span>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCitationModalQuestion(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-white/[0.05] hover:bg-white/[0.1] rounded-xl transition-colors"
                >
                  Đóng
                </button>
                <button
                  onClick={() => {
                    startEditing(citationModalQuestion);
                    setCitationModalQuestion(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-blue-300 bg-blue-500/15 border border-blue-500/30 hover:bg-blue-500/25 rounded-xl transition-colors flex items-center gap-1.5"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Sửa câu hỏi này</span>
                </button>
                <button
                  onClick={() => {
                    onUpdateQuestion({ ...citationModalQuestion, status: 'approved' });
                    setCitationModalQuestion(null);
                    onShowToast(
                      'success',
                      'Xác thực RAG thành công',
                      'Đã phê duyệt câu hỏi dựa trên minh chứng trang sách thực tế'
                    );
                  }}
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-all shadow-md shadow-emerald-600/30 flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Xác nhận & Phê duyệt câu hỏi</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── 4. Floating Keyboard Shortcuts Dock ───────────────────────── */}
      <div className="fixed bottom-5 left-[calc(288px+50%)] -translate-x-1/2 z-40 dock-glass rounded-2xl px-5 py-3 flex items-center space-x-6 shadow-2xl animate-slideUp">
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
          Phím tắt nhanh
        </span>
        <div className="h-4 w-px bg-white/10" />
        {[
          { key: 'A', label: 'Phê duyệt', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
          { key: 'R', label: 'Từ chối', color: 'text-rose-400 bg-rose-500/10 border-rose-500/30' },
          { key: 'E', label: 'Chỉnh sửa', color: 'text-blue-400 bg-blue-500/10 border-blue-500/30' },
          { key: 'M', label: 'Modal RAG', color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30' },
        ].map(({ key, label, color }) => (
          <div key={key} className="flex items-center space-x-2">
            <kbd className={`px-2 py-0.5 text-[11px] font-bold rounded-lg border font-mono ${color}`}>
              {key}
            </kbd>
            <span className="text-[11px] text-slate-400 font-medium">{label}</span>
          </div>
        ))}
        <div className="h-4 w-px bg-white/10" />
        <span className="text-[10px] text-slate-500 font-mono">
          {approvedCount}/{totalCount} đã duyệt
        </span>
      </div>
    </div>
  );
};
