import React, { useState, useRef, useEffect } from 'react';
import {
  Edit3,
  Trash2,
  RefreshCw,
  Check,
  X,
  Sparkles,
  HelpCircle,
  CheckCircle2,
  Image as ImageIcon,
  PenTool,
  Upload,
  Link2,
  Plus,
} from 'lucide-react';
import { Question, BloomLevel, QuestionOption } from '../../types';
import MathRenderer from '../MathRenderer';
import { DiagramStudioModal } from '../DiagramStudioModal';
import { resolveImageUrl } from '../../services/apiClient';

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
  const [editHasImage, setEditHasImage] = useState(Boolean(question.hasImage || question.imageUrl));
  const [editImageUrl, setEditImageUrl] = useState(question.imageUrl || '');
  const [editImageCaption, setEditImageCaption] = useState(question.imageCaption || '');
  const [imgError, setImgError] = useState(false);
  const [isStudioOpen, setIsStudioOpen] = useState(false);
  const [isAttachPopoverOpen, setIsAttachPopoverOpen] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const attachPopoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (attachPopoverRef.current && !attachPopoverRef.current.contains(event.target as Node)) {
        setIsAttachPopoverOpen(false);
      }
    }
    if (isAttachPopoverOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isAttachPopoverOpen]);

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
      hasImage: editHasImage && Boolean(editImageUrl),
      imageUrl: editHasImage && editImageUrl ? editImageUrl : undefined,
      imageCaption: editHasImage && editImageUrl ? editImageCaption : undefined,
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
    setEditHasImage(Boolean(question.hasImage || question.imageUrl));
    setEditImageUrl(question.imageUrl || '');
    setEditImageCaption(question.imageCaption || '');
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
            {/* Live KaTeX Preview for Question */}
            {(editText.includes('$') || editText.includes('\\')) && (
              <div className="mt-1 px-2.5 py-1 rounded bg-slate-100 border border-slate-200 text-xs text-slate-800 flex items-start gap-1.5">
                <span className="text-[10px] font-mono uppercase text-slate-400 font-semibold shrink-0 mt-0.5">
                  KaTeX:
                </span>
                <div className="flex-1 overflow-x-auto text-xs">
                  <MathRenderer content={editText} inline />
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
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

                    {/* Compact Media Attachment Trigger */}
                    {!editImageUrl && (
                      <div className="relative inline-block" ref={attachPopoverRef}>
                        <button
                          type="button"
                          onClick={() => setIsAttachPopoverOpen(!isAttachPopoverOpen)}
                          className="flex items-center gap-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 px-2 py-1.5 rounded-lg border border-slate-200 shadow-2xs transition-colors"
                        >
                          <ImageIcon className="w-3.5 h-3.5 text-teal-600" />
                          <span>+ Đính kèm sơ đồ / ảnh</span>
                        </button>

                        {isAttachPopoverOpen && (
                          <div className="absolute right-0 mt-1.5 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-1 z-30 text-xs animate-in fade-in slide-in-from-top-1">
                            <button
                              type="button"
                              onClick={() => {
                                setIsStudioOpen(true);
                                setIsAttachPopoverOpen(false);
                              }}
                              className="w-full flex items-center gap-2.5 px-3 py-2 text-slate-700 hover:bg-slate-50 hover:text-[#008689] text-left transition-colors font-medium"
                            >
                              <PenTool className="w-3.5 h-3.5 text-slate-500" />
                              <div>
                                <div className="font-semibold text-slate-800">Mở Studio kỹ thuật</div>
                                <div className="text-[10px] text-slate-400">Draw.io, GeoGebra, Desmos</div>
                              </div>
                            </button>
                            <label className="w-full flex items-center gap-2.5 px-3 py-2 text-slate-700 hover:bg-slate-50 text-left cursor-pointer transition-colors font-medium">
                              <Upload className="w-3.5 h-3.5 text-slate-500" />
                              <div>
                                <div className="font-semibold text-slate-800">Tải ảnh từ máy</div>
                                <div className="text-[10px] text-slate-400">PNG, JPG, SVG, WebP</div>
                              </div>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    setIsAttachPopoverOpen(false);
                                    try {
                                      const formData = new FormData();
                                      formData.append('file', file);
                                      const uploadRes = await fetch('/api/v1/documents/questions/upload-image', {
                                        method: 'POST',
                                        body: formData,
                                      });
                                      if (uploadRes.ok) {
                                        const uploadData = await uploadRes.json();
                                        if (uploadData.imageUrl) {
                                          setEditImageUrl(uploadData.imageUrl);
                                          setEditHasImage(true);
                                          return;
                                        }
                                      }
                                    } catch (err) {
                                      console.warn('Lỗi tải ảnh server, dùng Data URL', err);
                                    }
                                    const reader = new FileReader();
                                    reader.onload = () => {
                                      setEditImageUrl(reader.result as string);
                                      setEditHasImage(true);
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                }}
                              />
                            </label>
                            <button
                              type="button"
                              onClick={() => {
                                setShowUrlInput(true);
                                setIsAttachPopoverOpen(false);
                              }}
                              className="w-full flex items-center gap-2.5 px-3 py-2 text-slate-700 hover:bg-slate-50 text-left transition-colors font-medium"
                            >
                              <Link2 className="w-3.5 h-3.5 text-slate-500" />
                              <div>
                                <div className="font-semibold text-slate-800">Dán URL ảnh</div>
                                <div className="text-[10px] text-slate-400">Liên kết ảnh từ web</div>
                              </div>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Inline URL Input */}
                  {showUrlInput && !editImageUrl && (
                    <div className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                      <input
                        type="text"
                        placeholder="Dán link ảnh (https://...) rồi nhấn Enter"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && (e.target as HTMLInputElement).value) {
                            setEditImageUrl((e.target as HTMLInputElement).value);
                            setEditHasImage(true);
                            setShowUrlInput(false);
                          } else if (e.key === 'Escape') {
                            setShowUrlInput(false);
                          }
                        }}
                        className="flex-1 px-2.5 py-1 rounded border border-slate-300 text-xs focus:outline-none focus:border-[#008689] bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => setShowUrlInput(false)}
                        className="text-slate-400 hover:text-slate-600 px-1 text-xs"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Compact Media Card when image is attached */}
                  {editImageUrl && (
                    <div className="flex items-center gap-3 p-2 bg-white border border-slate-200 rounded-xl text-xs">
                      <div className="relative group shrink-0 w-20 h-16 rounded overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center">
                        <img
                          src={resolveImageUrl(editImageUrl)}
                          alt="Minh họa"
                          className="w-full h-full object-contain p-0.5"
                        />
                      </div>

                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-semibold text-slate-700">Sơ đồ đính kèm:</span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setIsStudioOpen(true)}
                              className="px-2 py-0.5 rounded text-[11px] font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors flex items-center gap-1"
                            >
                              <PenTool className="w-3 h-3 text-slate-500" />
                              <span>Sửa Studio</span>
                            </button>
                            <label className="px-2 py-0.5 rounded text-[11px] font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 cursor-pointer transition-colors flex items-center gap-1">
                              <Upload className="w-3 h-3 text-slate-500" />
                              <span>Đổi ảnh</span>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    try {
                                      const formData = new FormData();
                                      formData.append('file', file);
                                      const uploadRes = await fetch('/api/v1/documents/questions/upload-image', {
                                        method: 'POST',
                                        body: formData,
                                      });
                                      if (uploadRes.ok) {
                                        const uploadData = await uploadRes.json();
                                        if (uploadData.imageUrl) {
                                          setEditImageUrl(uploadData.imageUrl);
                                          return;
                                        }
                                      }
                                    } catch (err) {
                                      console.warn('Lỗi tải ảnh server, dùng Data URL', err);
                                    }
                                    const reader = new FileReader();
                                    reader.onload = () => {
                                      setEditImageUrl(reader.result as string);
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                }}
                              />
                            </label>
                            <button
                              type="button"
                              onClick={() => {
                                setEditImageUrl('');
                                setEditImageCaption('');
                                setEditHasImage(false);
                              }}
                              className="px-1.5 py-0.5 rounded text-[11px] font-medium text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors flex items-center gap-1"
                              title="Gỡ bỏ hình ảnh"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Gỡ</span>
                            </button>
                          </div>
                        </div>
                        <input
                          type="text"
                          placeholder="Chú thích sơ đồ (tùy chọn)..."
                          value={editImageCaption}
                          onChange={(e) => setEditImageCaption(e.target.value)}
                          className="w-full px-2.5 py-1 text-xs rounded border border-slate-200 bg-white focus:outline-none focus:border-[#008689] text-slate-700 placeholder-slate-400"
                        />
                      </div>
                    </div>
                  )}
        </div>
      ) : (
        <div className="text-xs font-semibold text-slate-900 leading-relaxed">
          <MathRenderer content={question.question} inline />
        </div>
      )}

      {/* Optional Image */}
      {question.hasImage && question.imageUrl && (
        <div className="p-2 bg-white rounded-lg border border-slate-200 text-center max-w-sm mx-auto">
          {imgError ? (
            <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-center space-y-1.5">
              <p className="text-[11px] text-amber-800 font-semibold">Không thể hiển thị hình ảnh của câu hỏi</p>
              <div className="flex items-center justify-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(true);
                    setEditHasImage(true);
                  }}
                  className="px-2 py-1 text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-300 rounded hover:bg-slate-200 flex items-center gap-1"
                >
                  <Upload className="w-3 h-3" />
                  <span>Tải ảnh</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsStudioOpen(true)}
                  className="px-2 py-1 text-[10px] font-semibold bg-teal-50 text-[#008689] border border-teal-200 rounded hover:bg-teal-100 flex items-center gap-1"
                >
                  <PenTool className="w-3 h-3" />
                  <span>Vẽ hình</span>
                </button>
                {onEdit && (
                  <button
                    type="button"
                    onClick={() => {
                      onEdit({
                        ...question,
                        hasImage: false,
                        imageUrl: undefined,
                        imageCaption: undefined,
                      });
                      setImgError(false);
                    }}
                    className="px-2 py-1 text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 rounded hover:bg-rose-100 flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Gỡ ảnh</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <>
              <img
                src={resolveImageUrl(question.imageUrl)}
                alt={question.imageCaption || 'Hình sơ đồ'}
                className="max-h-40 mx-auto rounded object-contain"
                onError={() => setImgError(true)}
              />
              {question.imageCaption && (
                <p className="text-[10px] text-slate-500 italic mt-1">{question.imageCaption}</p>
              )}
            </>
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
                  {(opt.text.includes('$') || opt.text.includes('\\')) && (
                    <div className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-[11px] text-slate-800 flex items-start gap-1">
                      <span className="text-[9px] font-mono uppercase text-slate-400 font-semibold shrink-0">KaTeX:</span>
                      <div className="overflow-x-auto">
                        <MathRenderer content={opt.text} inline />
                      </div>
                    </div>
                  )}
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

      {/* Multimodal Diagram Studio Modal */}
      <DiagramStudioModal
        isOpen={isStudioOpen}
        onClose={() => setIsStudioOpen(false)}
        initialCaption={editImageCaption || question.imageCaption}
        initialImageUrl={editImageUrl || question.imageUrl}
        onApplyImage={(imgUrl, cap) => {
          setEditImageUrl(imgUrl);
          setEditHasImage(true);
          if (cap) setEditImageCaption(cap);
          setImgError(false);
          if (!isEditing && onEdit) {
            onEdit({
              ...question,
              hasImage: true,
              imageUrl: imgUrl,
              imageCaption: cap || question.imageCaption,
            });
          }
        }}
      />
    </div>
  );
};

export default QuestionReviewCard;
