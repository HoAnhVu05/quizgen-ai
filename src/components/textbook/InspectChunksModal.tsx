import React from 'react';
import { BookOpen, X, RefreshCw } from 'lucide-react';
import { TextbookFile } from '../../types';

export interface InspectChunksModalProps {
  inspectingBook: TextbookFile | null;
  onClose: () => void;
  isFetchingChunks: boolean;
  inspectingChunks: string[];
}

export const InspectChunksModal: React.FC<InspectChunksModalProps> = ({
  inspectingBook,
  onClose,
  isFetchingChunks,
  inspectingChunks,
}) => {
  if (!inspectingBook) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-[#f8fbfc]">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#e0f7fa] border border-[#008689]/25 text-[#008689] flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-xs">{inspectingBook.name}</h3>
              <p className="text-[11px] text-slate-500 font-mono">
                {inspectingBook.totalPages} trang • {inspectingBook.chaptersCount} chương
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-3 flex-1 bg-white">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Mục lục &amp; Trích đoạn giáo trình (20 đoạn tiêu biểu)
            </span>
            {isFetchingChunks && (
              <span className="text-[11px] text-[#008689] flex items-center space-x-1 font-mono">
                <RefreshCw className="w-3 h-3 animate-spin" />
                <span>Đang trích xuất nội dung...</span>
              </span>
            )}
          </div>

          {!isFetchingChunks && inspectingChunks.length === 0 && (
            <div className="text-center py-8 text-slate-400 text-xs">
              Nội dung giáo trình đang trong tiến trình xử lý mục lục.
            </div>
          )}

          {inspectingChunks.map((chunk, idx) => (
            <div
              key={idx}
              className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs text-slate-700 leading-relaxed font-mono"
            >
              {chunk}
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default InspectChunksModal;
