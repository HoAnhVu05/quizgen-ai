import React, { useState } from 'react';
import {
  Edit3,
  Trash2,
  RefreshCw,
  Check,
  X,
  Sparkles,
  HelpCircle,
  CheckCircle2,
} from 'lucide-react';
import { Question, BloomLevel, QuestionOption } from '../../types';
import MathRenderer from '../MathRenderer';

interface QuestionReviewCardProps {
  question: Question;
  index: number;
  onEdit?: (updated: Question) => void;
  onDelete?: (questionId: string) => void;
  onRegenerate?: (questionId: string) => void;
  isEditable?: boolean;
}

const BLOOM_COLORS: Record<BloomLevel, { bg: string; text: string; border: string }> = {
  'Nhận biết': { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200' },
  'Thông hiểu': { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200' },
  'Vận dụng': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  'Phân tích': { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
};

export const QuestionReviewCard: React.FC<QuestionReviewCardProps> = ({
  question,
  index,
  onEdit,
  onDelete,
  onRegenerate,
  isEditable = false,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(question.question);
  const [editExplanation, setEditExplanation] = useState(question.explanation || '');
  const [editOptions, setEditOptions] = useState<QuestionOption[]>(question.options);
  const [editCorrectId, setEditCorrectId] = useState(question.correctAnswerId);
  const [editBloom, setEditBloom] = useState<BloomLevel>(question.bloomLevel);

  const bloomStyle = BLOOM_COLORS[question.bloomLevel] || BLOOM_COLORS['Nhận biết'];

  const handleSave = () => {
    if (!onEdit) return;
    onEdit({
      ...question,
      question: editText,
      explanation: editExplanation,
      options: editOptions,
      correctAnswerId: editCorrectId,
      bloomLevel: editBloom,
      hasFormula: editText.includes('$') || editOptions.some((o) => o.text.includes('$')),
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditText(question.question);
    setEditExplanation(question.explanation || '');
    setEditOptions(question.options);
    setEditCorrectId(question.correctAnswerId);
    setEditBloom(question.bloomLevel);
    setIsEditing(false);
  };

  const handleOptionTextChange = (optId: string, val: string) => {
    setEditOptions((prev) =>
      prev.map((opt) => (opt.id === optId ? { ...opt, text: val } : opt))
    );
  };

  return (
    <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:border-slate-300 transition-all space-y-3">
      {/* Top Bar: Question Index & Bloom / LaTeX / Actions */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-2 py-0.5 rounded-md bg-[#e0f7fa] text-[#006d70] font-extrabold text-xs">
            Câu {index + 1}
          </span>
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-bold border ${bloomStyle.bg} ${bloomStyle.text} ${bloomStyle.border}`}
          >
            {question.bloomLevel}
          </span>
          {(question.hasFormula || question.question.includes('$')) && (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
              ∑ LaTeX
            </span>
          )}
          {question.confidenceScore !== undefined && (
            <span className="text-[10px] text-slate-400 font-medium">
              Độ tin cậy: {question.confidenceScore}%
            </span>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1 shrink-0">
          {onRegenerate && (
            <button
              onClick={() => onRegenerate(question.id)}
              title="Sinh lại câu hỏi này bằng AI"
              className="p-1 rounded-lg text-slate-400 hover:text-[#008689] hover:bg-teal-50 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}

          {isEditable && onEdit && !isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              title="Chỉnh sửa câu hỏi"
              className="p-1 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
          )}

          {onDelete && (
            <button
              onClick={() => onDelete(question.id)}
              title="Xóa câu hỏi"
              className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Question Content */}
      {isEditing ? (
        <div className="space-y-3 pt-1">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Nội dung câu hỏi (hỗ trợ $LaTeX$):
            </label>
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              rows={3}
              className="w-full p-2.5 rounded-xl border border-slate-300 text-xs bg-white focus:outline-none focus:border-[#008689]"
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-[11px] font-bold text-slate-700">Mức độ Bloom:</label>
            <select
              value={editBloom}
              onChange={(e) => setEditBloom(e.target.value as BloomLevel)}
              className="text-xs p-1.5 rounded-lg border border-slate-300 bg-white"
            >
              <option value="Nhận biết">Nhận biết</option>
              <option value="Thông hiểu">Thông hiểu</option>
              <option value="Vận dụng">Vận dụng</option>
              <option value="Phân tích">Phân tích</option>
            </select>
          </div>
        </div>
      ) : (
        <div className="text-xs font-semibold text-slate-900 leading-relaxed">
          <MathRenderer content={question.question} inline />
        </div>
      )}

      {/* Optional Image */}
      {question.hasImage && question.imageUrl && (
        <div className="p-2 bg-white rounded-lg border border-slate-200 text-center max-w-sm mx-auto">
          <img
            src={question.imageUrl}
            alt={question.imageCaption || 'Hình sơ đồ'}
            className="max-h-40 mx-auto rounded object-contain"
          />
          {question.imageCaption && (
            <p className="text-[10px] text-slate-500 italic mt-1">{question.imageCaption}</p>
          )}
        </div>
      )}

      {/* Options List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
        {(isEditing ? editOptions : question.options).map((opt) => {
          const isCorrect = isEditing
            ? opt.id === editCorrectId
            : opt.id === question.correctAnswerId;

          return (
            <div
              key={opt.id}
              onClick={() => {
                if (isEditing) setEditCorrectId(opt.id);
              }}
              className={`p-2.5 rounded-xl text-xs flex items-start gap-2 transition-all ${
                isEditing ? 'cursor-pointer' : ''
              } ${
                isCorrect
                  ? 'bg-emerald-50 border-2 border-emerald-400 text-emerald-900 font-semibold shadow-2xs'
                  : 'bg-white border border-slate-200 text-slate-700 hover:border-slate-300'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 font-bold text-[11px] ${
                  isCorrect
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                }`}
              >
                {opt.label}
              </span>

              {isEditing ? (
                <div className="flex-1 space-y-1">
                  <input
                    type="text"
                    value={opt.text}
                    onChange={(e) => handleOptionTextChange(opt.id, e.target.value)}
                    className="w-full p-1 text-xs border border-slate-200 rounded bg-white"
                  />
                  {isCorrect && (
                    <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Đáp án đúng
                    </span>
                  )}
                </div>
              ) : (
                <div className="flex-1 leading-snug">
                  <MathRenderer content={opt.text} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Explanation Box */}
      {isEditing ? (
        <div className="space-y-1 pt-1">
          <label className="block text-[11px] font-bold text-slate-700">Giải thích chi tiết:</label>
          <textarea
            value={editExplanation}
            onChange={(e) => setEditExplanation(e.target.value)}
            rows={2}
            className="w-full p-2 rounded-lg border border-slate-300 text-xs bg-white"
          />
        </div>
      ) : (
        question.explanation && (
          <div className="text-[11px] text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200 leading-relaxed">
            <strong className="text-slate-800">Giải thích: </strong>
            <MathRenderer content={question.explanation} inline />
          </div>
        )
      )}

      {/* Edit Action Buttons */}
      {isEditing && (
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
          <button
            onClick={handleCancel}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200 flex items-center gap-1"
          >
            <X className="w-3.5 h-3.5" /> Hủy
          </button>
          <button
            onClick={handleSave}
            className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 flex items-center gap-1 shadow-2xs"
          >
            <Check className="w-3.5 h-3.5" /> Lưu thay đổi
          </button>
        </div>
      )}
    </div>
  );
};

export default QuestionReviewCard;
