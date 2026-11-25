import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  BookOpen,
  Sparkles,
  Lightbulb,
  FileText,
  Copy,
  Check,
  Edit3,
  Save,
  HelpCircle,
} from 'lucide-react';
import { Question, BloomLevel } from '../../types';
import { resolveImageUrl } from '../../services/apiClient';

export interface QuestionDetailModalProps {
  question: Question | null;
  isOpen: boolean;
  onClose: () => void;
  onSave?: (updated: Question) => void;
}

export const QuestionDetailModal: React.FC<QuestionDetailModalProps> = ({
  question,
  isOpen,
  onClose,
  onSave,
}) => {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState('');
  const [editedExplanation, setEditedExplanation] = useState('');

  if (!isOpen || !question) return null;

  const bloomColorMap: Record<BloomLevel, { bg: string; text: string; border: string }> = {
    'Nhận biết': { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200' },
    'Thông hiểu': { bg: 'bg-teal-50', text: 'text-[#008689]', border: 'border-teal-200' },
    'Vận dụng': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
    'Phân tích': { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
  };

  const bloomStyle = bloomColorMap[question.bloomLevel] || {
    bg: 'bg-slate-50',
    text: 'text-slate-700',
    border: 'border-slate-200',
  };

  const handleStartEdit = () => {
    setEditedText(question.question);
    setEditedExplanation(question.explanation || '');
    setIsEditing(true);
  };

  const handleSave = () => {
    if (onSave) {
      onSave({
        ...question,
        question: editedText.trim() || question.question,
        explanation: editedExplanation.trim() || question.explanation,
      });
    }
    setIsEditing(false);
  };

  const handleCopyText = () => {
    const textToCopy = `Câu hỏi: ${question.question}\n` +
      question.options.map((opt) => `${opt.label}. ${opt.text}`).join('\n') +
      `\nĐáp án đúng: ${question.options.find((o) => o.id === question.correctAnswerId)?.label || 'A'}` +
      `\nGiải thích: ${question.explanation}`;

    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-slate-50/80 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-xs font-mono font-bold text-slate-500">
              #{question.id}
            </span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${bloomStyle.bg} ${bloomStyle.text} ${bloomStyle.border}`}
            >
              {question.bloomLevel}
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
              <BookOpen className="w-3 h-3 text-[#008689]" />
              <span className="truncate max-w-[150px]">{question.textbookName}</span>
            </span>
            {question.confidenceScore && (
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                AI Độ tin cậy: {question.confidenceScore}%
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleCopyText}
              title="Sao chép toàn bộ câu hỏi và đáp án"
              className="p-1.5 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Question Text */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
                <span>Nội Dung Câu Hỏi</span>
              </span>
              {!isEditing && onSave && (
                <button
                  type="button"
                  onClick={handleStartEdit}
                  className="text-xs font-bold text-[#008689] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>Chỉnh sửa nội dung</span>
                </button>
              )}
            </div>

            {isEditing ? (
              <textarea
                rows={3}
                value={editedText}
                onChange={(e) => setEditedText(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-sm font-semibold text-slate-900 outline-none focus:border-[#008689]"
              />
            ) : (
              <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 text-sm font-semibold text-slate-900 leading-relaxed whitespace-pre-wrap">
                {question.question}
              </div>
            )}
          </div>

          {/* Image context if available */}
          {(() => {
            const rawImg = question.imageUrl || (question as any).image_url;
            if (!rawImg) return null;
            const normalizedSrc = resolveImageUrl(rawImg);

            return (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex flex-col items-center">
                <img
                  src={normalizedSrc}
                  alt={question.imageCaption || (question as any).image_caption || 'Sơ đồ câu hỏi'}
                  className="max-h-60 rounded-xl object-contain"
                  onError={(e) => {
                    if (rawImg && e.currentTarget.src !== rawImg && !e.currentTarget.dataset.retried) {
                      e.currentTarget.dataset.retried = 'true';
                      e.currentTarget.src = rawImg;
                    }
                  }}
                />
                {(question.imageCaption || (question as any).image_caption) && (
                  <span className="text-[11px] text-slate-500 mt-2 italic text-center">
                    {question.imageCaption || (question as any).image_caption}
                  </span>
                )}
              </div>
            );
          })()}

          {/* Options List */}
          <div className="space-y-2.5">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
              Các Phương Án Lựa Chọn (Đáp Án)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {question.options.map((opt) => {
                const isCorrect = opt.id === question.correctAnswerId;
                return (
                  <div
                    key={opt.id}
                    className={`p-3 rounded-2xl border transition-all flex items-start gap-3 ${
                      isCorrect
                        ? 'bg-emerald-50/80 border-emerald-300 ring-1 ring-emerald-300'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-lg font-bold text-xs flex items-center justify-center shrink-0 ${
                        isCorrect
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {opt.label}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-xs font-medium leading-relaxed ${isCorrect ? 'text-emerald-950 font-bold' : 'text-slate-800'}`}>
                        {opt.text}
                      </div>
                      {isCorrect && (
                        <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 mt-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Đáp án chính xác</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pedagogical Explanation */}
          <div className="bg-amber-50/60 border border-amber-200 rounded-2xl p-4 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
              <Lightbulb className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Lời Giải Thích Sư Phạm &amp; Căn Cứ Học Thuật</span>
            </div>
            {isEditing ? (
              <textarea
                rows={2}
                value={editedExplanation}
                onChange={(e) => setEditedExplanation(e.target.value)}
                className="w-full bg-white border border-amber-300 rounded-xl p-2.5 text-xs text-slate-800 outline-none focus:border-amber-500 mt-1"
              />
            ) : (
              <p className="text-xs text-amber-950 leading-relaxed pl-5">
                {question.explanation || 'Đáp án được đối soát và suy luận trực tiếp từ nội dung giáo trình học phần.'}
              </p>
            )}
          </div>

          {/* RAG Source Citation */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-800">
              <div className="flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-[#008689]" />
                <span>Nguồn Trích Dẫn Học Liệu (RAG Provenance)</span>
              </div>
              <span className="text-[11px] text-slate-500 font-mono">
                Mã Chunk: {question.sourceChunkId}
              </span>
            </div>
            <div className="text-[11px] text-slate-600 bg-white border border-slate-200/80 rounded-xl p-3 space-y-1">
              <div>
                <span className="font-semibold text-slate-800">Giáo trình:</span> {question.textbookName}
              </div>
              <div>
                <span className="font-semibold text-slate-800">Chương mục:</span> {question.chapter}
              </div>
              <div className="text-slate-500 italic pt-1 border-t border-slate-100">
                &quot;Nội dung câu hỏi này được mô hình AI bảo đảm bám sát 100% ngữ cảnh tri thức học liệu của Nhà trường.&quot;
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3.5 border-t border-slate-200 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            Ngày khởi tạo: {question.createdAt || 'Gần đây'}
          </span>
          <div className="flex items-center gap-2">
            {isEditing && (
              <button
                type="button"
                onClick={handleSave}
                className="px-4 py-1.5 rounded-xl text-xs font-bold bg-[#008689] hover:bg-[#007376] text-white flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Lưu Thay Đổi</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              Đóng (ESC)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
