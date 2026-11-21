import React from 'react';
import {
  AlertTriangle,
  FileCheck2,
  BookOpen,
  ArrowRight,
  X,
  Layers,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import { TextbookFile } from '../../types';

export interface SmartDeduplicationModalProps {
  isOpen: boolean;
  duplicateInfo: {
    type: 'exact' | 'similar_name' | 'similar_content';
    message: string;
    existingDocument: TextbookFile;
    newFileName?: string;
  } | null;
  onClose: () => void;
  onSelectExisting: (doc: TextbookFile) => void;
}

export const SmartDeduplicationModal: React.FC<SmartDeduplicationModalProps> = ({
  isOpen,
  duplicateInfo,
  onClose,
  onSelectExisting,
}) => {
  if (!isOpen || !duplicateInfo) return null;

  const doc = duplicateInfo.existingDocument;
  const isExact = duplicateInfo.type === 'exact';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-200 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">
                {isExact
                  ? 'Phát hiện Giáo trình Trùng lặp (SHA-256)'
                  : 'Phát hiện Giáo trình Trùng tên / Phiên bản mới'}
              </h3>
              <p className="text-xs text-amber-800 mt-0.5">
                {isExact
                  ? 'Hệ thống đã nhận diện nội dung tệp khớp 100% với tài liệu đã có.'
                  : 'Tài liệu cùng tên đã có trong kho dữ liệu của Thầy/Cô.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            {duplicateInfo.message}
          </p>

          {/* Original Document Card */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <BookOpen className="w-5 h-5 text-[#008689] shrink-0" />
                <span className="text-xs font-bold text-slate-800 truncate">
                  {doc.name}
                </span>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 shrink-0">
                Sẵn sàng sử dụng
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200/80 text-[11px] text-slate-600">
              <div>
                <span className="text-slate-400 block text-[10px]">Dung lượng:</span>
                <span className="font-semibold text-slate-700">{doc.size}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Số trang:</span>
                <span className="font-semibold text-slate-700">{doc.totalPages} trang</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Chương mục:</span>
                <span className="font-semibold text-slate-700">{doc.chaptersCount} chương</span>
              </div>
            </div>

            {doc.uploadedAt && (
              <p className="text-[10px] text-slate-400 pt-1">
                Thời điểm nạp: <strong className="text-slate-600">{doc.uploadedAt}</strong>
              </p>
            )}
          </div>

          <div className="p-3 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 text-xs flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#008689] shrink-0" />
            <span>
              Tài liệu đã được bóc tách và nạp sẵn vào Vector Database RAG. Thầy/Cô có thể sử dụng ngay mà không mất thời gian chờ xử lý lại!
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            Đóng
          </button>
          <button
            type="button"
            onClick={() => {
              onSelectExisting(doc);
              onClose();
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#008689] hover:bg-[#006d70] transition-colors shadow-sm cursor-pointer"
          >
            <span>Dùng ngay giáo trình này</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
