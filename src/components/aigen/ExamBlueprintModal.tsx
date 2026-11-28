import React, { useState } from 'react';
import {
  X,
  Plus,
  Trash2,
  Layers,
  BookOpen,
  CheckCircle2,
  Scale,
  CheckSquare,
  Hash,
  GitFork,
  Sparkles,
  ArrowUp,
  ArrowDown,
  Check,
  RotateCcw
} from 'lucide-react';
import {
  ExamBlueprint,
  ExamSection,
  QuestionType,
  QUESTION_TYPES_CATALOG,
  EXAM_PRESETS
} from '../../types/examBlueprint';

interface ExamBlueprintModalProps {
  isOpen: boolean;
  onClose: () => void;
  blueprint: ExamBlueprint;
  onSaveBlueprint: (newBlueprint: ExamBlueprint) => void;
}

export const ExamBlueprintModal: React.FC<ExamBlueprintModalProps> = ({
  isOpen,
  onClose,
  blueprint,
  onSaveBlueprint,
}) => {
  const [sections, setSections] = useState<ExamSection[]>(blueprint.sections || []);
  const [examTitle, setExamTitle] = useState(blueprint.title || 'Đề thi Đa phần Chuẩn hóa');
  const [duration, setDuration] = useState(blueprint.durationMinutes || 60);

  if (!isOpen) return null;

  const totalQuestions = sections.reduce((sum, s) => sum + (s.totalQuestions || 0), 0);
  const totalScore = sections.reduce(
    (sum, s) => sum + (s.totalQuestions || 0) * (s.scorePerQuestion || 0),
    0
  );

  const getQuestionTypeIcon = (type: QuestionType) => {
    switch (type) {
      case 'GROUP_PASSAGE':
        return <BookOpen className="w-4 h-4 text-purple-600" />;
      case 'SINGLE_CHOICE':
        return <CheckCircle2 className="w-4 h-4 text-blue-600" />;
      case 'TRUE_FALSE_GROUP':
        return <Scale className="w-4 h-4 text-emerald-600" />;
      case 'MULTIPLE_RESPONSE':
        return <CheckSquare className="w-4 h-4 text-indigo-600" />;
      case 'SHORT_ANSWER':
        return <Hash className="w-4 h-4 text-amber-600" />;
      case 'MATCHING':
        return <GitFork className="w-4 h-4 text-cyan-600" />;
      default:
        return <CheckCircle2 className="w-4 h-4 text-slate-600" />;
    }
  };

  const handleApplyPreset = (presetId: string) => {
    const preset = EXAM_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    const newSecs: ExamSection[] = preset.sections.map((s, idx) => ({
      ...s,
      id: `sec-${Date.now()}-${idx + 1}`,
      questions: [],
    }));
    setSections(newSecs);
  };

  const handleAddSection = () => {
    const newSec: ExamSection = {
      id: `sec-${Date.now()}-${sections.length + 1}`,
      order: sections.length + 1,
      title: `PHẦN ${sections.length + 1}: CÂU HỎI MỚI`,
      instruction: 'Thí sinh hoàn thành các câu hỏi trong phần này.',
      questionType: 'SINGLE_CHOICE',
      scorePerQuestion: 0.25,
      totalQuestions: 10,
      questions: [],
    };
    setSections([...sections, newSec]);
  };

  const handleRemoveSection = (secId: string) => {
    if (sections.length <= 1) {
      alert('Đề thi phải có ít nhất 1 phần thi!');
      return;
    }
    setSections(sections.filter((s) => s.id !== secId).map((s, idx) => ({ ...s, order: idx + 1 })));
  };

  const handleMoveSection = (idx: number, dir: 'up' | 'down') => {
    const targetIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= sections.length) return;
    const newArr = [...sections];
    const temp = newArr[idx];
    newArr[idx] = newArr[targetIdx];
    newArr[targetIdx] = temp;
    setSections(newArr.map((s, i) => ({ ...s, order: i + 1 })));
  };

  const handleUpdateSection = (secId: string, updates: Partial<ExamSection>) => {
    setSections(sections.map((s) => (s.id === secId ? { ...s, ...updates } : s)));
  };

  const handleSave = () => {
    onSaveBlueprint({
      ...blueprint,
      title: examTitle,
      durationMinutes: duration,
      totalScore: Number(totalScore.toFixed(2)),
      sections,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden text-slate-800">
        {/* Header */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base flex items-center gap-2">
                <span>Cấu hình Cấu trúc Đề thi Đa phần (Multi-Part Blueprint)</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-teal-400 text-slate-950">
                  PRO
                </span>
              </h3>
              <p className="text-xs text-slate-300">
                Tự do phối hợp nhiều dạng câu hỏi: Trắc nghiệm đơn, Đọc hiểu bài đọc chùm, Đúng/Sai 4 ý
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Quick Presets */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Mẫu đề thi chuẩn hóa cài sẵn (1-Chạm):
              </span>
              <button
                type="button"
                onClick={() => handleApplyPreset('preset_university_mcq')}
                className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                Mặc định
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {EXAM_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleApplyPreset(preset.id)}
                  className="p-2.5 rounded-lg bg-white border border-slate-200 hover:border-teal-500 hover:shadow-xs transition-all text-left group"
                >
                  <div className="font-semibold text-xs text-slate-800 group-hover:text-teal-700">
                    {preset.name}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">
                    {preset.description}
                  </div>
                  <div className="text-[10px] font-medium text-teal-600 mt-1">
                    {preset.sections.length} phần thi kết hợp
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Exam Info Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Tiêu đề / Tên bài thi:
              </label>
              <input
                type="text"
                value={examTitle}
                onChange={(e) => setExamTitle(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs focus:outline-none focus:border-teal-600"
                placeholder="Ví dụ: Đề thi Kết thúc Học phần - Học kỳ I"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Thời gian làm bài (phút):
              </label>
              <input
                type="number"
                min={15}
                max={180}
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs focus:outline-none focus:border-teal-600"
              />
            </div>
          </div>

          {/* Section List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Danh sách các Phần thi ({sections.length} phần)
              </h4>
              <button
                type="button"
                onClick={handleAddSection}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold shadow-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Thêm phần thi</span>
              </button>
            </div>

            {sections.map((sec, idx) => (
              <div
                key={sec.id}
                className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs hover:border-slate-300 transition-all space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 font-bold text-[11px] flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <input
                      type="text"
                      value={sec.title}
                      onChange={(e) => handleUpdateSection(sec.id, { title: e.target.value })}
                      className="font-bold text-xs text-slate-800 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-teal-600 focus:outline-none px-1"
                      placeholder="Tên phần thi (ví dụ: PHẦN I: TRẮC NGHIỆM)"
                    />
                  </div>

                  {/* Actions & Ordering */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMoveSection(idx, 'up')}
                      className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30"
                      title="Chuyển lên"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === sections.length - 1}
                      onClick={() => handleMoveSection(idx, 'down')}
                      className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30"
                      title="Chuyển xuống"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveSection(sec.id)}
                      className="p-1 rounded text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                      title="Xóa phần này"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Section Controls Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 mb-1">
                      Dạng câu hỏi:
                    </label>
                    <div className="relative">
                      <select
                        value={sec.questionType}
                        onChange={(e) =>
                          handleUpdateSection(sec.id, {
                            questionType: e.target.value as QuestionType,
                          })
                        }
                        className="w-full pl-8 pr-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 focus:outline-none focus:border-teal-600 appearance-none"
                      >
                        {QUESTION_TYPES_CATALOG.map((cat) => (
                          <option key={cat.type} value={cat.type}>
                            {cat.label}
                          </option>
                        ))}
                      </select>
                      <div className="absolute left-2.5 top-2 pointer-events-none">
                        {getQuestionTypeIcon(sec.questionType)}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 mb-1">
                      Số lượng câu hỏi:
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={sec.totalQuestions}
                      onChange={(e) =>
                        handleUpdateSection(sec.id, {
                          totalQuestions: Math.max(1, Number(e.target.value)),
                        })
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold focus:outline-none focus:border-teal-600"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 mb-1">
                      Điểm mỗi câu:
                    </label>
                    <input
                      type="number"
                      step={0.05}
                      min={0.1}
                      max={10}
                      value={sec.scorePerQuestion}
                      onChange={(e) =>
                        handleUpdateSection(sec.id, {
                          scorePerQuestion: Number(e.target.value),
                        })
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold focus:outline-none focus:border-teal-600"
                    />
                  </div>
                </div>

                {/* Sub-description & Instruction */}
                <div>
                  <input
                    type="text"
                    value={sec.instruction}
                    onChange={(e) => handleUpdateSection(sec.id, { instruction: e.target.value })}
                    className="w-full px-2.5 py-1 rounded border border-slate-200 text-[11px] text-slate-600 placeholder-slate-400 focus:outline-none focus:border-teal-500 bg-slate-50/50"
                    placeholder="Lời dặn thí sinh (ví dụ: Đọc kỹ bài khóa sau và chọn đáp án chính xác...)"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Summary */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-4 text-xs">
            <div>
              <span className="text-slate-500">Tổng số câu: </span>
              <strong className="text-slate-800 text-sm">{totalQuestions} câu</strong>
            </div>
            <div>
              <span className="text-slate-500">Tổng điểm: </span>
              <strong className="text-teal-700 text-sm">{totalScore.toFixed(2)} điểm</strong>
            </div>
            <div>
              <span className="text-slate-500">Số phần thi: </span>
              <strong className="text-purple-700 text-sm">{sections.length} phần</strong>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 text-xs font-medium transition-colors"
            >
              Hủy bỏ
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Áp dụng cấu trúc này</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExamBlueprintModal;
