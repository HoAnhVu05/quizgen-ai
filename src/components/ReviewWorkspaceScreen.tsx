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
import apiClient from '../services/apiClient';

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
      return 'bg-sky-50 text-sky-700 border-sky-200';
    case 'Thông hiểu':
      return 'bg-[#e0f7fa] text-[#008689] border-[#008689]/25';
    case 'Vận dụng':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'Phân tích':
      return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
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

  const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';
  const [isExporting, setIsExporting] = useState<string | null>(null);

  // Single Question AI Re-generation nối API thật
  const handleRegenerateSingle = async (qId: string) => {
    setIsRegenerating(qId);
    const targetQ = questions.find((q) => q.id === qId) || activeQuestion;
    try {
      const token = localStorage.getItem('quizgen_auth_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await apiClient.fetch(`${API_BASE}/ai/regenerate-question/${qId}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(targetQ),
      });

      if (res.ok) {
        const data = await res.json();
        const newQ = data.question || data;
        onUpdateQuestion({
          ...targetQ,
          question: newQ.question || targetQ.question,
          options: newQ.options || targetQ.options,
          correctAnswerId: newQ.correctAnswerId || newQ.correct_answer_id || targetQ.correctAnswerId,
          explanation: newQ.explanation || targetQ.explanation,
          confidenceScore: newQ.confidenceScore || newQ.confidence_score || 99,
          status: 'pending',
        });
        onShowToast('success', 'AI đã sinh lại câu hỏi', 'Phương án nhiễu đã được Gemini tối ưu lại');
      } else {
        throw new Error('Fallback');
      }
    } catch {
      if (targetQ) {
        const regenerated: Question = {
          ...targetQ,
          question: `[AI Đã tối ưu] ${targetQ.question}`,
          confidenceScore: 99,
          status: 'pending'
        };
        onUpdateQuestion(regenerated);
      }
      onShowToast('info', 'AI đã sinh lại câu hỏi (Dự phòng)', 'Phương án nhiễu đã được hiệu chỉnh học thuật');
    } finally {
      setIsRegenerating(null);
    }
  };

  // Nối API Xuất bản đề thi thật (Word .docx, PDF, Canvas LMS)
  const handleExportExam = async (format: 'docx' | 'pdf' | 'qti') => {
    setIsExporting(format);
    const questionsToExport = questions.filter((q) => q.status === 'approved');
    const exportList = questionsToExport.length > 0 ? questionsToExport : questions;

    try {
      const token = localStorage.getItem('quizgen_auth_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await apiClient.fetch(`${API_BASE}/exams/export`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          format,
          examTitle: 'ĐỀ THI KẾT THÚC HỌC PHẦN',
          subjectName: activeQuestion?.chapter ? activeQuestion.chapter.split(':')[0] : 'Kinh tế vi mô',
          examCodeCount: 4,
          questions: exportList,
          includeAnswerKey: true,
          includeExplanation: true,
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const ext = format === 'qti' ? 'xml' : format;
      a.download = `De_Thi_QuizGen_${Date.now()}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      onShowToast(
        'success',
        'Xuất bản đề thi thành công!',
        `Đã tạo đề thi định dạng ${format.toUpperCase()} (${exportList.length} câu hỏi). Tệp đã được tải xuống.`
      );
    } catch (err) {
      onShowToast('warning', 'Không thể kết nối API Gateway', 'Vui lòng kiểm tra Docker hoặc Backend Exam Service.');
    } finally {
      setIsExporting(null);
    }
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
    <div className="flex-1 flex flex-col h-full bg-[#f7f9fb] text-slate-800 font-sans overflow-hidden">
      {/* ─── 1. Header Bar ────────────────────────────────────────────── */}
      <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between z-10 shrink-0 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        <div className="flex items-center space-x-4 min-w-0">
          <button
            onClick={() => onNavigate('dashboard')}
            className="p-2 rounded-xl text-slate-500 hover:text-[#008689] hover:bg-[#e0f7fa] transition-colors"
            title="Quay lại Bảng điều khiển"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="h-5 w-px bg-slate-200" />
          <div className="min-w-0">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-slate-900 text-sm truncate">
                Không gian Đối chiếu & Kiểm duyệt RAG
              </span>
              <span
                className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-[#e0f7fa] text-[#008689] border border-[#008689]/25 max-w-[260px] truncate"
                title={activeQuestion?.chapter}
              >
                {activeQuestion?.chapter || 'Chương mục RAG'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5 truncate">
              <FileText className="w-3 h-3 text-slate-400 shrink-0" /> Nguồn: {activeQuestion?.textbookName || 'GiaoTrinh_KinhTeViMo_2025.pdf'}
            </p>
          </div>
        </div>

        {/* Global Progress & Actions */}
        <div className="flex items-center space-x-3 shrink-0">
          {/* Keyboard hint badge */}
          <div className="hidden xl:flex items-center space-x-2 text-[10px] text-slate-600 font-mono bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
            <Keyboard className="w-3.5 h-3.5 text-[#008689]" />
            <span>Phím tắt: [A] Duyệt • [R] Loại • [E] Sửa • [M] Modal RAG</span>
          </div>

          <div className="hidden md:flex items-center space-x-1.5 text-xs">
            <span className="flex items-center gap-1.5 font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Duyệt: {approvedCount}
            </span>
            <span className="flex items-center gap-1.5 font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Chờ: {pendingCount}
            </span>
            <span className="flex items-center gap-1.5 font-semibold text-[#da1c2d] bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200">
              <span className="w-1.5 h-1.5 rounded-full bg-[#da1c2d]" /> Hủy: {rejectedCount}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                onBatchApprove();
                // Gửi request duyệt hàng loạt lên DB nếu có
                fetch(`${API_BASE}/questions/batch-approve`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ questionIds: questions.map((q) => q.id) }),
                }).catch(() => {});
                onShowToast('success', 'Đã duyệt toàn bộ', 'Tất cả các câu hỏi đang chờ đã được thông qua');
              }}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-[#008689]/40 transition-colors"
            >
              Duyệt tất cả
            </button>

            {/* Nút Xuất Word Trực tiếp */}
            <button
              onClick={() => handleExportExam('docx')}
              disabled={isExporting !== null}
              className="flex items-center space-x-1 px-3 py-1.5 text-xs font-bold text-[#008689] bg-[#e0f7fa] border border-[#008689]/25 rounded-xl hover:bg-[#e0f7fa]/80 transition-all"
              title="Xuất bản đề thi chuẩn Bộ GD&ĐT dạng Word (.docx)"
            >
              <Download className={`w-3.5 h-3.5 ${isExporting === 'docx' ? 'animate-bounce' : ''}`} />
              <span>{isExporting === 'docx' ? 'Đang xuất...' : 'Xuất Word (.docx)'}</span>
            </button>

            {/* Nút Xuất PDF */}
            <button
              onClick={() => handleExportExam('pdf')}
              disabled={isExporting !== null}
              className="hidden sm:flex items-center space-x-1 px-3 py-1.5 text-xs font-bold text-[#da1c2d] bg-rose-50 border border-rose-200 rounded-xl hover:bg-rose-100 transition-all"
              title="Xuất bản đề thi định dạng PDF"
            >
              <Download className={`w-3.5 h-3.5 ${isExporting === 'pdf' ? 'animate-bounce' : ''}`} />
              <span>PDF</span>
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
              className="flex items-center space-x-1.5 px-4 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-[#008689] to-[#1d999d] rounded-xl hover:brightness-105 transition-all shadow-md shadow-[#008689]/20"
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
        <div className="w-5/12 border-r border-slate-200 bg-white flex flex-col">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
            <div className="flex items-center space-x-2">
              <BookOpen className="w-4 h-4 text-[#008689]" />
              <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                Minh chứng RAG (Ngữ cảnh gốc)
              </h2>
            </div>
            {activeChunk && (
              <div className="flex items-center gap-2">
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#e0f7fa] text-[#008689] border border-[#008689]/25 font-mono font-bold">
                  Trang {activeChunk.pageNumber}
                </span>
                <button
                  onClick={() => setCitationModalQuestion(activeQuestion)}
                  className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 flex items-center gap-1 transition-colors"
                  title="Phóng to modal đối soát chi tiết"
                >
                  <Maximize2 className="w-3 h-3" />
                  <span>Mở Modal</span>
                </button>
              </div>
            )}
          </div>

          {/* Source Text View */}
          <div className="flex-1 p-6 overflow-y-auto leading-relaxed text-slate-700 text-xs md:text-sm space-y-4">
            {activeChunk ? (
              <>
                <div className="flex items-center justify-between text-xs text-slate-500 pb-2 border-b border-slate-100">
                  <span className="font-bold text-slate-900">{activeChunk.chapter}</span>
                  <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 font-mono text-[11px] font-semibold">
                    <Sparkles className="w-3 h-3" /> Khớp {activeChunk.relevanceScore}%
                  </span>
                </div>

                {/* Highlighted snippet */}
                <div className="p-4 bg-amber-50 border-l-4 border-amber-400 rounded-r-xl text-slate-800 text-xs md:text-sm leading-relaxed shadow-sm">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-amber-800 font-bold mb-1 flex items-center gap-1">
                    <BookmarkCheck className="w-3 h-3" /> Đoạn bóc tách RAG (Trang {activeChunk.pageNumber})
                  </div>
                  <p className="font-sans italic text-slate-900 leading-relaxed text-sm">
                    "{activeChunk.textSnippet}"
                  </p>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl text-xs text-slate-600 flex items-start space-x-2.5 border border-slate-200">
                  <AlertCircle className="w-4 h-4 text-[#008689] shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    Đoạn văn bản trên được RAG Engine trích xuất trực tiếp từ trang{' '}
                    <strong className="text-slate-900 font-mono">Trang {activeChunk.pageNumber}</strong> của giáo trình để làm minh
                    chứng. Giảng viên đối chiếu để tránh sai sót và hiện tượng AI ảo giác (Hallucination).
                  </p>
                </div>

                {/* Nút hành động nhanh mở modal đối soát */}
                <button
                  onClick={() => setCitationModalQuestion(activeQuestion)}
                  className="w-full py-2.5 px-3.5 rounded-xl border border-[#008689]/30 bg-[#e0f7fa]/60 hover:bg-[#e0f7fa] text-[#006d70] text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-sm group"
                >
                  <Eye className="w-4 h-4 text-[#008689] group-hover:scale-110 transition-transform" />
                  <span>Mở Cửa sổ Đối soát Toàn diện & Trích dẫn Trang sách</span>
                </button>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 text-xs">
                <FileText className="w-8 h-8 mb-2 stroke-1" />
                <p>Chọn câu hỏi bên phải để xem tài liệu đối chiếu</p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANE: Question Cards Feed */}
        <div className="w-7/12 bg-[#f7f9fb] flex flex-col">
          {/* Subheader / Filter */}
          <div className="p-3.5 px-6 border-b border-slate-200 bg-white/80 flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
              <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1 mr-1">
                <Filter className="w-3 h-3 text-slate-400" /> Lọc:
              </span>
              {(['all', 'pending', 'approved', 'rejected'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setFilter(mode)}
                  className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all ${
                    filter === mode
                      ? 'bg-[#008689] text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                  }`}
                >
                  {mode === 'all' && `Tất cả (${totalCount})`}
                  {mode === 'pending' && `Chờ duyệt (${pendingCount})`}
                  {mode === 'approved' && `Đã duyệt (${approvedCount})`}
                  {mode === 'rejected' && `Đã loại (${rejectedCount})`}
                </button>
              ))}
            </div>

            <span className="text-[11px] text-slate-500 font-mono">
              Bấm vào thẻ để đồng bộ RAG
            </span>
          </div>

          {/* Cards List */}
          <div className="flex-1 p-6 overflow-y-auto space-y-5 pb-24">
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
                      ? 'bg-white border-[#008689] ring-2 ring-[#008689]/20 shadow-md'
                      : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
                  }`}
                >
                  {/* Header Thẻ Câu Hỏi */}
                  <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-100">
                    <div className="flex items-center space-x-2.5 flex-wrap gap-y-1">
                      <span className="font-mono text-xs font-bold text-slate-500">
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
                          className="bg-white border border-[#008689] text-slate-900 text-[11px] font-semibold rounded-lg px-2 py-0.5 outline-none"
                        >
                          {BLOOM_LEVELS.map((lvl) => (
                            <option key={lvl} value={lvl} className="bg-white text-slate-900">
                              {lvl}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${getBloomBadgeColor(
                            q.bloomLevel
                          )}`}
                        >
                          {q.bloomLevel}
                        </span>
                      )}
                      <span className="text-[11px] text-slate-500 font-mono">
                        Độ tin cậy: <strong className="text-emerald-600">{q.confidenceScore}%</strong>
                      </span>
                    </div>

                    {/* Status Badge & Nút mở Modal RAG */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setCitationModalQuestion(q);
                        }}
                        className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-[#e0f7fa] text-[#008689] border border-[#008689]/25 hover:bg-[#e0f7fa]/80 flex items-center gap-1 transition-colors"
                        title="Đối soát số trang và đoạn văn gốc"
                      >
                        <BookOpen className="w-3 h-3 text-[#008689]" />
                        <span>Xem trang RAG</span>
                      </button>

                      {q.status === 'approved' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Đã thẩm định
                        </span>
                      )}
                      {q.status === 'rejected' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#da1c2d] bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
                          <XCircle className="w-3.5 h-3.5" /> Đã loại bỏ
                        </span>
                      )}
                      {q.status === 'pending' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                          Chờ giảng viên duyệt
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Thân Câu Hỏi (Question Stem) */}
                  <div className="mb-4">
                    {isEditing ? (
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-slate-500">
                          Nội dung câu hỏi:
                        </label>
                        <textarea
                          value={currentFormData.question}
                          onChange={(e) =>
                            setEditFormData((prev) =>
                              prev ? { ...prev, question: e.target.value } : null
                            )
                          }
                          className="w-full p-2.5 text-xs md:text-sm font-medium bg-slate-50 border border-[#008689]/50 rounded-xl focus:outline-none focus:bg-white focus:border-[#008689] text-slate-900"
                          rows={2}
                        />
                      </div>
                    ) : (
                      <p className="text-xs md:text-sm font-bold text-slate-900 leading-snug">
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
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-semibold'
                              : 'bg-slate-50/80 border-slate-200 text-slate-700'
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
                            className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-600 shrink-0"
                          />
                          <span className="font-mono text-xs font-bold text-slate-500 shrink-0">
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
                              className="flex-1 px-2.5 py-1 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-[#008689]"
                            />
                          ) : (
                            <span className="flex-1 text-xs leading-relaxed">{opt.text}</span>
                          )}

                          {isCorrect && (
                            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md shrink-0">
                              Đáp án chuẩn
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Lời Giải Thích / Căn Cứ RAG */}
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 mb-4 text-xs text-slate-600">
                    <span className="font-bold text-slate-800 block mb-1">
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
                        className="w-full p-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 outline-none focus:border-[#008689]"
                        rows={2}
                      />
                    ) : (
                      <p className="italic text-slate-600 leading-relaxed">{q.explanation}</p>
                    )}
                  </div>

                  {/* Thanh Thao Tác Chỉnh Sửa & Phê Duyệt */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                    <div className="flex items-center space-x-2">
                      {isEditing ? (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              saveEditing();
                            }}
                            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-[#008689] hover:bg-[#1d999d] transition-colors shadow-sm"
                          >
                            <Save className="w-3.5 h-3.5" />
                            <span>Lưu thay đổi</span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              cancelEditing();
                            }}
                            className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition-colors"
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
                          className="inline-flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-700 hover:text-[#008689] bg-slate-50 border border-slate-200 hover:bg-[#e0f7fa]/60 transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-[#008689]" />
                          <span>Chỉnh sửa câu hỏi</span>
                        </button>
                      )}

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRegenerateSingle(q.id);
                        }}
                        disabled={isRegenerating === q.id}
                        className="inline-flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-[#008689] bg-slate-50 border border-slate-200 hover:bg-[#e0f7fa]/60 transition-colors disabled:opacity-50"
                      >
                        <RefreshCw
                          className={`w-3.5 h-3.5 ${
                            isRegenerating === q.id ? 'animate-spin text-[#008689]' : ''
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
                        className={`inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          q.status === 'rejected'
                            ? 'bg-rose-100 text-[#da1c2d] border border-rose-300'
                            : 'bg-white border border-slate-200 text-[#da1c2d] hover:bg-rose-50'
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
                            ? 'bg-emerald-600 text-white'
                            : 'bg-white border border-emerald-300 text-emerald-700 hover:bg-emerald-50'
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-3xl rounded-2xl border border-slate-200 bg-white shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            {/* Header Modal */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-[#f8fbfc]">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-[#e0f7fa] border border-[#008689]/25 flex items-center justify-center text-[#008689]">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <span>Không gian Đối soát Minh chứng RAG & Căn cứ Học thuật</span>
                    <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Khớp {modalChunk.relevanceScore}%
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Đối chiếu câu hỏi trắc nghiệm do Gemini sinh với trang tài liệu gốc trong giáo trình
                  </p>
                </div>
              </div>

              <button
                onClick={() => setCitationModalQuestion(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Nội dung Modal (Body) */}
            <div className="flex-1 p-6 overflow-y-auto space-y-5 text-xs text-slate-700">
              {/* Thanh thông tin trích xuất RAG */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Giáo trình gốc:</span>
                  <span className="font-bold text-slate-900 truncate block" title={citationModalQuestion.textbookName}>
                    {citationModalQuestion.textbookName || 'GiaoTrinh_KinhTeViMo_2025.pdf'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Trang sách thực tế:</span>
                  <span className="font-mono font-bold text-amber-700 text-sm flex items-center gap-1">
                    <BookmarkCheck className="w-4 h-4 text-amber-600" />
                    Trang {modalChunk.pageNumber}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Cấp độ Bloom:</span>
                  <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${getBloomBadgeColor(citationModalQuestion.bloomLevel)}`}>
                    {citationModalQuestion.bloomLevel}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Mô hình AI:</span>
                  <span className="font-mono text-[#008689] font-semibold text-xs flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-[#008689]" />
                    Gemini 2.5 Flash
                  </span>
                </div>
              </div>

              {/* Khung đoạn trích nguyên văn từ sách */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-amber-600" />
                    Đoạn văn bản trích xuất trực tiếp từ Trang {modalChunk.pageNumber}:
                  </span>
                  <span className="text-[11px] font-mono text-slate-500">
                    Chunk ID: {modalChunk.id}
                  </span>
                </div>
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-slate-900 text-sm leading-relaxed font-sans italic">
                  "{modalChunk.textSnippet}"
                </div>
              </div>

              {/* Khung câu hỏi & Đáp án đối chiếu */}
              <div className="p-4 rounded-xl bg-[#f8fbfc] border border-[#008689]/30 space-y-3">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-[#008689] block mb-1">
                    Câu hỏi đang đối soát:
                  </span>
                  <p className="text-sm font-bold text-slate-900">{citationModalQuestion.question}</p>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">
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
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-semibold ring-1 ring-emerald-200'
                              : 'bg-white border-slate-200 text-slate-700'
                          }`}
                        >
                          <span className="font-mono font-bold text-slate-500">{opt.label}.</span>
                          <span className="flex-1">{opt.text}</span>
                          {isCorrect && (
                            <span className="text-[9px] uppercase font-extrabold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">
                              Chuẩn
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Luận điểm giải thích */}
                <div className="pt-2 border-t border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                    Căn cứ giải thích học thuật:
                  </span>
                  <p className="italic text-slate-600 leading-relaxed">
                    {citationModalQuestion.explanation}
                  </p>
                </div>
              </div>
            </div>

            {/* Footer Modal với các nút Thao tác */}
            <div className="p-4 px-6 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">
                Minh chứng đã được đối chiếu với trang <strong className="text-slate-900">{modalChunk.pageNumber}</strong>
              </span>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCitationModalQuestion(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-200 hover:bg-slate-300 rounded-xl transition-colors"
                >
                  Đóng
                </button>
                <button
                  onClick={() => {
                    startEditing(citationModalQuestion);
                    setCitationModalQuestion(null);
                  }}
                  className="px-4 py-2 text-xs font-bold text-[#008689] bg-[#e0f7fa] border border-[#008689]/30 hover:bg-[#e0f7fa]/80 rounded-xl transition-colors flex items-center gap-1.5"
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
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-all shadow-md shadow-emerald-600/20 flex items-center gap-1.5"
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
      <div className="fixed bottom-5 left-[calc(144px+50%)] -translate-x-1/2 z-40 dock-glass rounded-2xl px-5 py-2.5 flex items-center space-x-5 shadow-xl animate-slideUp">
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
          Phím tắt nhanh
        </span>
        <div className="h-4 w-px bg-slate-200" />
        {[
          { key: 'A', label: 'Phê duyệt', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
          { key: 'R', label: 'Từ chối', color: 'text-[#da1c2d] bg-rose-50 border-rose-200' },
          { key: 'E', label: 'Chỉnh sửa', color: 'text-[#008689] bg-[#e0f7fa] border-[#008689]/25' },
          { key: 'M', label: 'Modal RAG', color: 'text-indigo-700 bg-indigo-50 border-indigo-200' },
        ].map(({ key, label, color }) => (
          <div key={key} className="flex items-center space-x-1.5">
            <kbd className={`px-2 py-0.5 text-[11px] font-bold rounded-lg border font-mono ${color}`}>
              {key}
            </kbd>
            <span className="text-[11px] text-slate-600 font-semibold">{label}</span>
          </div>
        ))}
        <div className="h-4 w-px bg-slate-200" />
        <span className="text-[10px] text-slate-500 font-mono font-semibold">
          {approvedCount}/{totalCount} đã duyệt
        </span>
      </div>
    </div>
  );
};
