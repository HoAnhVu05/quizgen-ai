import React from 'react';
import {
  Sparkles,
  Brain,
  Columns2,
  RotateCcw,
  Maximize2,
  Minimize2,
  X,
  Trash2,
} from 'lucide-react';
import { Question } from '../../types';

interface CopilotHeaderProps {
  screenLabel: string;
  isMinimized: boolean;
  isWide: boolean;
  showMemoryPanel: boolean;
  academicMemory: any;
  isDraggingFile: boolean;
  effectiveActiveQuestion: Question | null;
  onToggleMemoryPanel: () => void;
  onResetMemory: () => void;
  onToggleWide: () => void;
  onClearHistory: () => void;
  onToggleMinimize: () => void;
  onClose: () => void;
  onDismissQuestion: (id: string) => void;
}

export const CopilotHeader: React.FC<CopilotHeaderProps> = ({
  screenLabel,
  isMinimized,
  isWide,
  showMemoryPanel,
  academicMemory,
  isDraggingFile,
  effectiveActiveQuestion,
  onToggleMemoryPanel,
  onResetMemory,
  onToggleWide,
  onClearHistory,
  onToggleMinimize,
  onClose,
  onDismissQuestion,
}) => {
  return (
    <>
      <div className="bg-gradient-to-r from-[#008689] via-[#007678] to-[#006062] px-4 py-3 text-white flex items-center justify-between shadow-sm select-none">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/20 shrink-0">
            <Sparkles className="w-4 h-4 text-emerald-300" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs font-extrabold tracking-tight truncate">Quanta</h3>
              <span className="inline-flex items-center px-1.5 py-0.2 text-[9px] font-bold rounded-full bg-emerald-400/20 text-emerald-200 border border-emerald-400/30">
                AI Scholar
              </span>
            </div>
            <p className="text-[10px] text-white/80 truncate">
              Đang xem: <strong className="text-white font-medium">{screenLabel}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={onToggleMemoryPanel}
            title="Trí nhớ học thuật động của Quanta"
            className={`p-1.5 rounded-lg transition-colors ${
              showMemoryPanel ? 'bg-white/25 text-white' : 'hover:bg-white/10 text-white/80 hover:text-white'
            }`}
          >
            <Brain className="w-3.5 h-3.5" />
          </button>
          {!isMinimized && (
            <button
              onClick={onToggleWide}
              title={isWide ? 'Thu gọn chiều ngang' : 'Mở rộng chiều ngang'}
              className="hidden sm:inline-flex p-1.5 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors"
            >
              <Columns2 className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={onClearHistory}
            title="Xóa lịch sử chat (Bắt đầu phiên mới)"
            className="p-1.5 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onToggleMinimize}
            title={isMinimized ? 'Mở rộng' : 'Thu nhỏ'}
            className="p-1.5 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors"
          >
            {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={onClose}
            title="Đóng cửa sổ"
            className="p-1.5 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!isMinimized && showMemoryPanel && (
        <div className="px-3.5 py-2.5 bg-slate-50 border-b border-slate-200 text-[11px] text-slate-700 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-800 flex items-center gap-1.5">
              <Brain className="w-3.5 h-3.5 text-[#008689]" />
              Trí nhớ Học thuật Động ({academicMemory?.interaction_count || 0} lượt)
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={onResetMemory}
                className="text-[10px] text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-0.5"
              >
                <Trash2 className="w-3 h-3" />
                Đặt lại
              </button>
              <button onClick={onToggleMemoryPanel} className="p-0.5 rounded hover:bg-slate-200 text-slate-500">
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
          <div className="text-[10px] text-slate-600 space-y-1">
            <div>
              <span className="font-semibold">Môn/Giáo trình gần đây:</span>{' '}
              {academicMemory?.subject_areas?.length
                ? academicMemory.subject_areas.join(', ')
                : 'Chưa ghi nhận (sẽ tự học khi trò chuyện)'}
            </div>
            {academicMemory?.preferred_bloom_ratio && (
              <div>
                <span className="font-semibold">Tỉ lệ Bloom ưa thích:</span>{' '}
                {JSON.stringify(academicMemory.preferred_bloom_ratio)}
              </div>
            )}
            {academicMemory?.custom_notes?.length > 0 && (
              <div>
                <span className="font-semibold">Ghi chú đã học:</span>{' '}
                {academicMemory.custom_notes.slice(-3).join(' · ')}
              </div>
            )}
          </div>
        </div>
      )}

      {!isMinimized && isDraggingFile && (
        <div className="px-3 py-2 bg-teal-50 border-b border-teal-200 text-[11px] font-semibold text-teal-800 text-center">
          Thả ảnh, PDF hoặc tệp văn bản vào đây để đính kèm cho Quanta...
        </div>
      )}

      {!isMinimized && effectiveActiveQuestion && (
        <div className="px-3 py-1 bg-teal-50/90 border-b border-teal-100 flex items-center justify-between text-[11px] text-slate-700 animate-fade-in">
          <div className="flex items-center gap-1.5 truncate">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-600 shrink-0 animate-pulse" />
            <span className="truncate">
              Gắn câu hỏi: <strong className="text-teal-800 font-mono">{effectiveActiveQuestion.id}</strong>{' '}
              <span className="text-[10px] text-teal-700 bg-teal-100/70 px-1.5 py-0.2 rounded-full font-semibold">
                {effectiveActiveQuestion.bloomLevel}
              </span>
            </span>
          </div>
          <button
            onClick={() => onDismissQuestion(effectiveActiveQuestion.id)}
            className="p-0.5 hover:bg-teal-100 rounded text-slate-400 hover:text-slate-600 transition-colors shrink-0 cursor-pointer"
            title="Bỏ ghim câu hỏi này"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}
    </>
  );
};
