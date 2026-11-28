import React, { useState } from 'react';
import {
  Printer,
  FileQuestion,
  Image as ImageIcon,
  Edit3,
  Check,
  X,
  BookOpen,
  Scale,
  Plus,
  Trash2,
} from 'lucide-react';
import MathRenderer from '../MathRenderer';
import { ExamVariantQuestion } from './types';
import { resolveImageUrl } from '../../services/apiClient';

interface PaperPreviewViewProps {
  activeExamCode: string;
  availableCodes: string[];
  onSelectExamCode: (code: string) => void;
  onPrint: () => void;
  universityName: string;
  facultyName: string;
  examTitle: string;
  subjectName: string;
  examDuration: number;
  activeVariantQuestions: ExamVariantQuestion[];
  onImageClick: (url: string, caption?: string) => void;
  onViewAnswerKey: () => void;
  onQuickEditQuestion?: (questionId: string, updatedData: any) => void;
}

export const PaperPreviewView: React.FC<PaperPreviewViewProps> = ({
  activeExamCode,
  availableCodes,
  onSelectExamCode,
  onPrint,
  universityName,
  facultyName,
  examTitle,
  subjectName,
  examDuration,
  activeVariantQuestions,
  onImageClick,
  onViewAnswerKey,
  onQuickEditQuestion,
}) => {
  const [brokenImageIds, setBrokenImageIds] = useState<Record<string, boolean>>({});
  const [editingQId, setEditingQId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [editOptions, setEditOptions] = useState<
    Array<{ id: string; label: string; text: string; isCorrect: boolean }>
  >([]);
  const [editCorrectId, setEditCorrectId] = useState('');
  const [editCorrectIds, setEditCorrectIds] = useState<string[]>([]);
  const [editStatements, setEditStatements] = useState<
    Array<{ id: string; label: string; text: string; isCorrect: boolean; explanation?: string }>
  >([]);
  const [editPassageTitle, setEditPassageTitle] = useState('');
  const [editPassageContent, setEditPassageContent] = useState('');
  const [editShortAnswer, setEditShortAnswer] = useState('');
  const [editExplanation, setEditExplanation] = useState('');

  const handleStartEdit = (q: ExamVariantQuestion) => {
    setEditingQId(q.id);
    setEditText(q.question);
    const opts = q.options ? q.options.map((o) => ({ ...o })) : [];
    setEditOptions(opts);
    const corrOpts = opts.filter((o) => o.isCorrect);
    const corr = corrOpts[0];
    const initialCorrectId = corr ? corr.id : (q.correctAnswerId || opts[0]?.id || '');
    setEditCorrectId(initialCorrectId);
    setEditCorrectIds(
      q.correctAnswerIds && q.correctAnswerIds.length > 0
        ? q.correctAnswerIds
        : corrOpts.length > 0
        ? corrOpts.map((o) => o.id)
        : initialCorrectId
        ? [initialCorrectId]
        : []
    );
    setEditStatements(
      q.statements && q.statements.length > 0
        ? q.statements.map((s) => ({ ...s }))
        : [
            { id: 'stmt-a', label: 'a', text: 'Nhận định a', isCorrect: true },
            { id: 'stmt-b', label: 'b', text: 'Nhận định b', isCorrect: false },
            { id: 'stmt-c', label: 'c', text: 'Nhận định c', isCorrect: true },
            { id: 'stmt-d', label: 'd', text: 'Nhận định d', isCorrect: false },
          ]
    );
    setEditPassageTitle(q.passageData?.title || '');
    setEditPassageContent(q.passageData?.content || '');
    setEditShortAnswer(q.shortAnswer !== undefined ? String(q.shortAnswer) : '');
    setEditExplanation(q.explanation || '');
  };

  const handleSaveEdit = (q: ExamVariantQuestion) => {
    if (!onQuickEditQuestion) return;
    const isTf =
      q.questionType === 'TRUE_FALSE_GROUP' ||
      Boolean(q.statements && q.statements.length > 0);
    const isShort = q.questionType === 'SHORT_ANSWER';
    const isPassage = Boolean(q.passageData);
    const isMultiple = q.questionType === 'MULTIPLE_RESPONSE' || editCorrectIds.length > 1;

    const payload: any = {
      question: editText,
      explanation: editExplanation,
      hasFormula: editText.includes('$') || editOptions.some((o) => o.text.includes('$')),
    };

    if (isTf) {
      payload.statements = editStatements;
    }

    if (isPassage) {
      payload.passageData = {
        ...q.passageData,
        title: editPassageTitle,
        content: editPassageContent,
      };
    }

    if (isShort || editShortAnswer.trim()) {
      payload.shortAnswer = editShortAnswer.trim();
    }

    if (editOptions && editOptions.length > 0) {
      const labels = ['A', 'B', 'C', 'D', 'E', 'F'];
      payload.options = editOptions.map((o, idx) => ({
        id: o.id || `opt-${idx}`,
        label: labels[idx] || String(idx + 1),
        text: o.text,
      }));
      if (isMultiple) {
        payload.correctAnswerIds = editCorrectIds.length > 0 ? editCorrectIds : [editOptions[0]?.id || 'opt-a'];
        payload.correctAnswerId = payload.correctAnswerIds[0];
      } else {
        payload.correctAnswerId = editCorrectId || editOptions[0]?.id || 'opt-a';
        payload.correctAnswerIds = [payload.correctAnswerId];
      }
    }

    onQuickEditQuestion(q.id, payload);
    setEditingQId(null);
  };
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left: A4 Exam Paper Preview */}
      <div className="lg:col-span-8 bg-white rounded-xl border border-slate-300 shadow-sm p-3.5 sm:p-6 sm:p-8 space-y-4 sm:space-y-6">
        {/* Code Switcher Bar (Ẩn khi in) */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-slate-200 no-print">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase">
              Chọn Mã Đề Xem Trước:
            </span>
            {availableCodes.map((code) => (
              <button
                key={code}
                onClick={() => onSelectExamCode(code)}
                className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                  activeExamCode === code
                    ? 'bg-[#008689] text-white border-[#008689]'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                Mã đề {code}
              </button>
            ))}
          </div>

          <button
            onClick={onPrint}
            disabled={activeVariantQuestions.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            title="In trực tiếp tờ đề hiện tại ra máy in hoặc lưu file PDF (Chỉ in nội dung tờ đề)"
          >
            <Printer className="w-3.5 h-3.5 text-[#008689]" />
            In trực tiếp tờ đề này
          </button>
        </div>

        {/* Printable Exam Paper Container: Chỉ in toàn bộ nội dung trong tờ đề này */}
        <div id="printable-exam-paper" className="space-y-6">
          {/* Official University Header on A4 Paper */}
          <div className="border-2 border-slate-800 p-4 rounded-lg exam-header-box">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-center border-b border-slate-300 pb-3">
              <div className="space-y-0.5">
                <p className="text-[11px] font-bold uppercase text-slate-700">
                  {universityName || 'TRƯỜNG ĐẠI HỌC GIAO THÔNG VẬN TẢI TP.HCM'}
                </p>
                <p className="text-xs font-extrabold uppercase text-slate-900">
                  {facultyName || 'KHOA CÔNG NGHỆ THÔNG TIN'}
                </p>
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-extrabold uppercase text-slate-900">{examTitle}</p>
                <p className="text-[11px] font-semibold text-slate-700">
                  Học phần:{' '}
                  <span className="font-bold text-slate-900">
                    {subjectName || 'Chưa đặt tên học phần'}
                  </span>
                </p>
                <p className="text-[11px] text-slate-600">
                  Thời gian làm bài: <strong>{examDuration} phút</strong> (Không kể thời gian phát đề)
                </p>
              </div>
            </div>

            <div className="pt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-700">
              <div>
                Họ và tên sinh viên: ..........................................................
                MSSV: ..........................
              </div>
              <div className="px-3 py-1 border-2 border-slate-900 font-extrabold text-slate-900 uppercase">
                MÃ ĐỀ: {activeExamCode}
              </div>
            </div>
          </div>

          {/* Shuffled Questions List on A4 Paper or Empty State */}
          {activeVariantQuestions.length === 0 ? (
            <div className="py-12 px-4 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50 space-y-3">
              <div className="w-12 h-12 rounded-full bg-teal-50 text-[#008689] flex items-center justify-center mx-auto">
                <FileQuestion className="w-6 h-6" />
              </div>
              <div className="space-y-1 max-w-md mx-auto">
                <h4 className="text-sm font-bold text-slate-800">
                  Chưa có câu hỏi nào trong đề thi
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Hệ thống đã dọn dẹp sạch toàn bộ dữ liệu câu hỏi ảo. Để xuất đề thi, vui lòng tải lên tài liệu giáo trình tại <strong>Bước 1</strong> và thực hiện tạo câu hỏi tại <strong>Bước 2 & Bước 3</strong>.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-5 pt-2">
                {activeVariantQuestions.map((q, index) => {
                  const isFirstOfPassage =
                    q.passageData &&
                    (index === 0 || activeVariantQuestions[index - 1]?.passageData?.id !== q.passageData.id);
                  const isInlineEditing = editingQId === q.id;

                  return (
                    <React.Fragment key={`${activeExamCode}-${q.id}`}>
                      {/* Passage Header & Content (Render 1 lần cho cụm câu hỏi chùm) */}
                      {isFirstOfPassage && q.passageData && (
                        <div className="my-3 p-3.5 rounded-xl bg-purple-50/70 border border-purple-200 text-xs text-slate-800 space-y-2 print:border-slate-300 print:bg-white">
                          <div className="flex items-center gap-2 font-bold text-purple-900 text-xs uppercase tracking-wide">
                            <BookOpen className="w-4 h-4 text-purple-700 shrink-0" />
                            <span>{q.passageData.title || 'Bài đọc / Kịch bản Tình huống dùng chung'}</span>
                          </div>
                          <div className="text-slate-800 leading-relaxed text-xs whitespace-pre-wrap font-sans">
                            {q.passageData.content}
                          </div>
                          {q.passageData.imageUrl && (
                            <div className="text-center pt-1">
                              <img
                                src={resolveImageUrl(q.passageData.imageUrl)}
                                alt={q.passageData.imageCaption || 'Sơ đồ bài đọc'}
                                className="max-h-48 mx-auto rounded object-contain border border-purple-200"
                              />
                            </div>
                          )}
                        </div>
                      )}

                      <div className="space-y-2 text-sm text-slate-900 exam-question-item group relative">
                        {/* Question Text & Inline Comprehensive Edit */}
                        {isInlineEditing ? (
                          <div className="p-4 rounded-xl border-2 border-teal-500 bg-teal-50/20 space-y-3.5 no-print shadow-sm">
                            <div className="flex items-center justify-between pb-2 border-b border-teal-200">
                              <span className="text-xs font-bold text-teal-800 uppercase flex items-center gap-1.5">
                                <Edit3 className="w-3.5 h-3.5 text-teal-600" />
                                Chỉnh sửa toàn diện câu {index + 1}
                              </span>
                              <span className="text-[11px] text-teal-600 font-medium">
                                Sửa nhanh câu hỏi, đáp án, bài đọc và giải thích
                              </span>
                            </div>

                            {/* Passage Editor if question has passageData */}
                            {q.passageData && (
                              <div className="p-3 rounded-lg bg-purple-50/60 border border-purple-200 space-y-2">
                                <label className="text-[11px] font-bold text-purple-900 flex items-center gap-1">
                                  <BookOpen className="w-3.5 h-3.5 text-purple-700" /> Tiêu đề & Nội dung bài đọc chung (Passage):
                                </label>
                                <input
                                  type="text"
                                  value={editPassageTitle}
                                  onChange={(e) => setEditPassageTitle(e.target.value)}
                                  placeholder="Tiêu đề bài đọc / tình huống..."
                                  className="w-full p-2 text-xs border border-purple-200 rounded bg-white text-slate-800 focus:outline-none focus:border-purple-400 font-semibold"
                                />
                                <textarea
                                  value={editPassageContent}
                                  onChange={(e) => setEditPassageContent(e.target.value)}
                                  rows={3}
                                  placeholder="Nội dung bài đọc..."
                                  className="w-full p-2 text-xs border border-purple-200 rounded bg-white text-slate-800 focus:outline-none focus:border-purple-400 font-sans leading-relaxed"
                                />
                              </div>
                            )}

                            {/* Question Text */}
                            <div className="space-y-1">
                              <label className="text-[11px] font-bold text-slate-700">Nội dung câu hỏi (hỗ trợ $LaTeX$):</label>
                              <textarea
                                value={editText}
                                onChange={(e) => setEditText(e.target.value)}
                                rows={2}
                                className="w-full p-2 text-xs border border-slate-300 rounded bg-white text-slate-800 focus:outline-none focus:border-teal-500 font-medium"
                              />
                              {(editText.includes('$') || editText.includes('\\')) && (
                                <div className="px-2 py-1 rounded bg-slate-100 border border-slate-200 text-xs text-slate-700 flex items-center gap-1.5">
                                  <span className="text-[10px] font-mono uppercase text-slate-400 font-bold shrink-0">KaTeX:</span>
                                  <div className="overflow-x-auto">
                                    <MathRenderer content={editText} inline />
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* True / False Statements Editor */}
                            {(q.questionType === 'TRUE_FALSE_GROUP' || (q.statements && q.statements.length > 0)) ? (
                              <div className="space-y-2 pt-1">
                                <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                                  <Scale className="w-3.5 h-3.5 text-emerald-600" /> Các nhận định đánh giá Đúng / Sai:
                                </label>
                                {editStatements.map((stmt, sIdx) => (
                                  <div key={stmt.id || sIdx} className="flex items-center gap-2 p-2 rounded-lg bg-white border border-slate-200">
                                    <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 font-bold text-[11px] flex items-center justify-center shrink-0 border border-slate-200">
                                      {stmt.label || String.fromCharCode(97 + sIdx)})
                                    </span>
                                    <input
                                      type="text"
                                      value={stmt.text}
                                      onChange={(e) => {
                                        const next = [...editStatements];
                                        next[sIdx] = { ...next[sIdx], text: e.target.value };
                                        setEditStatements(next);
                                      }}
                                      className="flex-1 p-1 text-xs border border-slate-200 rounded bg-white focus:outline-none focus:border-teal-500"
                                      placeholder="Nội dung nhận định..."
                                    />
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const next = [...editStatements];
                                        next[sIdx] = { ...next[sIdx], isCorrect: true };
                                        setEditStatements(next);
                                      }}
                                      className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                                        stmt.isCorrect
                                          ? 'bg-emerald-600 text-white shadow-2xs'
                                          : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                                      }`}
                                    >
                                      ĐÚNG
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const next = [...editStatements];
                                        next[sIdx] = { ...next[sIdx], isCorrect: false };
                                        setEditStatements(next);
                                      }}
                                      className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                                        !stmt.isCorrect
                                          ? 'bg-rose-600 text-white shadow-2xs'
                                          : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                                      }`}
                                    >
                                      SAI
                                    </button>
                                  </div>
                                ))}
                              </div>
                            ) : q.questionType === 'SHORT_ANSWER' ? (
                              <div className="space-y-1 pt-1">
                                <label className="text-[11px] font-bold text-slate-700">Đáp án ngắn / Giá trị điền số:</label>
                                <input
                                  type="text"
                                  value={editShortAnswer}
                                  onChange={(e) => setEditShortAnswer(e.target.value)}
                                  placeholder="Nhập giá trị đáp án chính xác..."
                                  className="w-full p-2 text-xs border border-slate-300 rounded bg-white text-slate-800 focus:outline-none focus:border-teal-500 font-mono font-bold"
                                />
                              </div>
                            ) : (
                              /* Options Editor for SINGLE_CHOICE / MULTIPLE_RESPONSE */
                              (() => {
                                const isMultiple = q.questionType === 'MULTIPLE_RESPONSE' || editCorrectIds.length > 1;
                                return (
                                  <div className="space-y-2 pt-1">
                                    <div className="flex items-center justify-between">
                                      <label className="text-[11px] font-bold text-slate-700">
                                        {isMultiple
                                          ? 'Các phương án trả lời (chọn ô vuông để đánh dấu các đáp án đúng):'
                                          : 'Các phương án trả lời (chọn nút tròn để đánh dấu đáp án đúng):'}
                                      </label>
                                      {editOptions.length < 6 && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const nextIdx = editOptions.length;
                                            const labels = ['A', 'B', 'C', 'D', 'E', 'F'];
                                            setEditOptions([
                                              ...editOptions,
                                              {
                                                id: `opt-${String.fromCharCode(97 + nextIdx)}`,
                                                label: labels[nextIdx] || String(nextIdx + 1),
                                                text: `Phương án ${labels[nextIdx] || nextIdx + 1}`,
                                                isCorrect: false,
                                              },
                                            ]);
                                          }}
                                          className="text-[11px] font-semibold text-teal-600 hover:underline flex items-center gap-1 cursor-pointer"
                                        >
                                          <Plus className="w-3 h-3" /> Thêm lựa chọn
                                        </button>
                                      )}
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                      {editOptions.map((opt, oIdx) => {
                                        const isCorr = isMultiple
                                          ? editCorrectIds.includes(opt.id)
                                          : opt.id === editCorrectId;
                                        return (
                                          <div
                                            key={opt.id || oIdx}
                                            className={`p-2 rounded-lg border text-xs flex items-center gap-2 transition-all ${
                                              isCorr
                                                ? 'bg-emerald-50/70 border-emerald-400 ring-1 ring-emerald-300'
                                                : 'bg-white border-slate-200'
                                            }`}
                                          >
                                            <input
                                              type={isMultiple ? 'checkbox' : 'radio'}
                                              name={isMultiple ? undefined : `correct-choice-${q.id}`}
                                              checked={isCorr}
                                              onChange={() => {
                                                if (isMultiple) {
                                                  setEditCorrectIds((prev) =>
                                                    prev.includes(opt.id)
                                                      ? prev.filter((id) => id !== opt.id)
                                                      : [...prev, opt.id]
                                                  );
                                                } else {
                                                  setEditCorrectId(opt.id);
                                                  setEditCorrectIds([opt.id]);
                                                }
                                              }}
                                              className={`cursor-pointer ${isMultiple ? 'rounded' : ''} text-emerald-600 focus:ring-emerald-500`}
                                              title={isMultiple ? 'Đánh dấu đáp án đúng' : 'Chọn làm đáp án đúng'}
                                            />
                                            <span
                                              className={`w-5 h-5 rounded-full font-bold text-[11px] flex items-center justify-center shrink-0 ${
                                                isCorr
                                                  ? 'bg-emerald-600 text-white'
                                                  : 'bg-slate-100 text-slate-600 border border-slate-200'
                                              }`}
                                            >
                                              {['A', 'B', 'C', 'D', 'E', 'F'][oIdx] || opt.label}
                                            </span>
                                            <input
                                              type="text"
                                              value={opt.text}
                                              onChange={(e) => {
                                                const next = [...editOptions];
                                                next[oIdx] = { ...next[oIdx], text: e.target.value };
                                                setEditOptions(next);
                                              }}
                                              className="flex-1 p-1 text-xs border border-slate-200 rounded bg-white focus:outline-none focus:border-teal-500"
                                            />
                                            {editOptions.length > 2 && (
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  const next = editOptions.filter((_, idx) => idx !== oIdx);
                                                  setEditOptions(next);
                                                  if (opt.id === editCorrectId && next.length > 0) {
                                                    setEditCorrectId(next[0].id);
                                                  }
                                                  setEditCorrectIds((prev) => prev.filter((id) => id !== opt.id));
                                                }}
                                                className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                                                title="Xóa lựa chọn này"
                                              >
                                                <Trash2 className="w-3.5 h-3.5" />
                                              </button>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              })()
                            )}

                            {/* Explanation */}
                            <div className="space-y-1 pt-1">
                              <label className="text-[11px] font-bold text-slate-700">Lời giải thích chi tiết:</label>
                              <textarea
                                value={editExplanation}
                                onChange={(e) => setEditExplanation(e.target.value)}
                                rows={2}
                                className="w-full p-2 text-xs border border-slate-300 rounded bg-white text-slate-800 focus:outline-none focus:border-teal-500"
                                placeholder="Giải thích phương án đúng..."
                              />
                            </div>

                            {/* Actions */}
                            <div className="flex items-center justify-end gap-2 pt-2 border-t border-teal-200">
                              <button
                                type="button"
                                onClick={() => setEditingQId(null)}
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-200 cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5 inline mr-1" /> Hủy
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSaveEdit(q)}
                                className="px-4 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                              >
                                <Check className="w-4 h-4" /> Lưu thay đổi
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="font-semibold leading-relaxed flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <span className="font-extrabold mr-1">Câu {index + 1}:</span>
                              <MathRenderer content={q.question} inline />
                            </div>
                            {onQuickEditQuestion && (
                              <button
                                type="button"
                                onClick={() => handleStartEdit(q)}
                                className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-teal-600 transition-opacity no-print cursor-pointer"
                                title="Sửa toàn diện câu này (câu hỏi, phương án, giải thích)"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        )}

                        {/* Tự động chèn hình vẽ sơ đồ vào ngay dưới nội dung câu hỏi (chỉ render khi không sửa) */}
                        {!isInlineEditing && (() => {
                          const rawImg = q.imageUrl || (q as any).image_url;
                          if (!rawImg) return null;
                          const normalizedSrc = resolveImageUrl(rawImg);
                          const isBroken = brokenImageIds[q.id];

                          return (
                            <div className="my-2.5 flex flex-col items-center justify-center print:break-inside-avoid print:my-2">
                              {!isBroken ? (
                                <img
                                  src={normalizedSrc}
                                  alt={q.imageCaption || (q as any).image_caption || `Sơ đồ câu ${index + 1}`}
                                  className="max-h-64 max-w-full rounded-md object-contain border border-slate-200 shadow-2xs bg-white p-1 cursor-pointer hover:opacity-90 transition-opacity print:border-none print:shadow-none"
                                  loading="eager"
                                  onError={(e) => {
                                    if (rawImg && e.currentTarget.src !== rawImg && !e.currentTarget.dataset.retried) {
                                      e.currentTarget.dataset.retried = 'true';
                                      e.currentTarget.src = rawImg;
                                    } else {
                                      setBrokenImageIds((prev) => ({ ...prev, [q.id]: true }));
                                    }
                                  }}
                                  onClick={() => onImageClick(normalizedSrc, q.imageCaption || (q as any).image_caption)}
                                />
                              ) : (
                                <div
                                  className="w-full max-w-md p-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center text-center space-y-1 cursor-pointer hover:bg-slate-100 transition-colors print:bg-white print:border-slate-300"
                                  onClick={() => onImageClick(normalizedSrc, q.imageCaption || (q as any).image_caption)}
                                >
                                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                                    <ImageIcon className="w-4 h-4 text-slate-500" />
                                    <span>{q.imageCaption || (q as any).image_caption || `Sơ đồ câu ${index + 1}`}</span>
                                  </div>
                                  <span className="text-[10px] text-slate-400 italic">
                                    (Hình vẽ sơ đồ học thuật đính kèm theo đề thi)
                                  </span>
                                </div>
                              )}
                              {(q.imageCaption || (q as any).image_caption) && !isBroken && (
                                <span className="text-[11px] text-slate-500 italic mt-1 text-center font-medium print:text-[10px] print:text-slate-600">
                                  ({q.imageCaption || (q as any).image_caption})
                                </span>
                              )}
                            </div>
                          );
                        })()}

                        {/* Render options / statements / shortAnswer (chỉ khi không sửa inline) */}
                        {!isInlineEditing && (
                          <>
                            {q.statements && q.statements.length > 0 ? (
                              <div className="space-y-1.5 pl-2 pt-1">
                                {q.statements.map((stmt, sIdx) => (
                                  <div
                                    key={stmt.id || sIdx}
                                    className="text-xs sm:text-sm text-slate-800 flex items-start justify-between gap-2 border-b border-slate-100 pb-1"
                                  >
                                    <div className="flex items-start gap-1 flex-1">
                                      <span className="font-bold shrink-0">{stmt.label || String.fromCharCode(97 + sIdx)})</span>
                                      <span>
                                        <MathRenderer content={stmt.text} inline />
                                      </span>
                                    </div>
                                    <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 shrink-0">
                                      [ {stmt.isCorrect ? 'Đ' : 'S'} ]
                                    </span>
                                  </div>
                                ))}
                              </div>
                            ) : q.questionType === 'SHORT_ANSWER' || (q.shortAnswer !== undefined && q.shortAnswer !== '') ? (
                              <div className="pl-2 pt-1">
                                <div className="text-xs text-slate-700 bg-amber-50/70 border border-amber-200 rounded-lg p-2.5 flex items-center gap-2">
                                  <span className="font-bold text-amber-800">Đáp án ngắn:</span>
                                  <span className="font-mono bg-white px-2 py-0.5 rounded border border-amber-300 font-bold text-slate-900">
                                    {String(q.shortAnswer || '')}
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-2">
                                {q.options.map((opt) => (
                                  <div key={opt.id} className="text-xs sm:text-sm text-slate-800 flex items-start gap-1">
                                    <span className="font-bold shrink-0">{opt.label}.</span>
                                    <span className="flex-1">
                                      <MathRenderer content={opt.text} />
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>

              <div className="pt-4 border-t border-slate-200 text-center text-xs font-bold text-slate-500 uppercase exam-footer-note">
                — HẾT (Sinh viên không được sử dụng tài liệu) —
              </div>
            </>
          )}
        </div>
      </div>

      {/* Right: OMR Answer Sheet Preview & Quick Answer Key (Không in) */}
      <div className="lg:col-span-4 space-y-4 no-print">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                Phiếu Tô Trắc Nghiệm OMR
              </h3>
              <p className="text-[11px] text-slate-500">
                Đính kèm tự động khi xuất PDF — Mã đề {activeExamCode}
              </p>
            </div>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-[#e6f4f4] text-[#008689]">
              Chuẩn máy chấm
            </span>
          </div>

          {activeVariantQuestions.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              Chưa có câu hỏi để hiển thị phiếu OMR
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2.5 max-h-[340px] overflow-y-auto pr-1">
              {activeVariantQuestions.map((_, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs"
                >
                  <span className="font-bold text-slate-700 w-7">{i + 1}.</span>
                  <div className="flex items-center gap-1.5">
                    {['A', 'B', 'C', 'D'].map((lbl) => (
                      <span
                        key={lbl}
                        className="w-5 h-5 rounded-full border border-slate-400 text-[10px] font-bold flex items-center justify-center text-slate-600 bg-white"
                      >
                        {lbl}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Teacher's Live Answer Key for Active Code */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-800 uppercase">
              Đáp Án Chấm Nhanh — Mã Đề {activeExamCode}
            </h4>
            <button
              onClick={onViewAnswerKey}
              className="text-[11px] font-bold text-[#008689] hover:underline cursor-pointer"
            >
              Xem đủ {availableCodes.length} mã đề →
            </button>
          </div>
          {activeVariantQuestions.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-400">
              Chưa có đáp án chấm
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {activeVariantQuestions.map((q, idx) => (
                <div
                  key={idx}
                  className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-center text-xs"
                >
                  <span className="font-semibold text-slate-600">{idx + 1}: </span>
                  <strong className="text-emerald-800">{q.correctLabel}</strong>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
