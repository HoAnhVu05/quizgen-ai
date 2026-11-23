import React from 'react';
import { Mail, X, FileText, Send } from 'lucide-react';
import { TextbookFile } from '../../types';

export interface ShareEmailModalProps {
  isOpen: boolean;
  selectedBook: TextbookFile | null;
  onClose: () => void;
  targetColleagueEmail: string;
  setTargetColleagueEmail: (email: string) => void;
  shareEmailMessage: string;
  setShareEmailMessage: (msg: string) => void;
  onSubmit: (e: React.FormEvent) => void | Promise<void>;
}

export const ShareEmailModal: React.FC<ShareEmailModalProps> = ({
  isOpen,
  selectedBook,
  onClose,
  targetColleagueEmail,
  setTargetColleagueEmail,
  shareEmailMessage,
  setShareEmailMessage,
  onSubmit,
}) => {
  if (!isOpen || !selectedBook) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col p-6 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-indigo-600" />
            <h3 className="font-extrabold text-slate-900 text-sm">Gửi Riêng Giáo Trình Qua Email</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3 bg-indigo-50/60 rounded-2xl border border-indigo-100 text-xs flex items-center gap-2.5">
          <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
          <div className="truncate">
            <strong className="text-slate-900 block truncate">{selectedBook.name}</strong>
            <span className="text-[10px] text-slate-500 font-mono">
              {selectedBook.size} • {selectedBook.totalPages} trang
            </span>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-3 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Email giảng viên đồng nghiệp *</label>
            <input
              type="email"
              required
              value={targetColleagueEmail}
              onChange={(e) => setTargetColleagueEmail(e.target.value)}
              placeholder="Ví dụ: colleague@ut.edu.vn..."
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-indigo-600"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Lời nhắn gửi kèm (Tùy chọn)</label>
            <textarea
              value={shareEmailMessage}
              onChange={(e) => setShareEmailMessage(e.target.value)}
              placeholder="Gửi Thầy/Cô giáo trình để tham khảo sinh đề thi giữa kỳ..."
              rows={2}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-indigo-600 resize-none"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 font-bold text-slate-600"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-xs flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Xác Nhận Gửi</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ShareEmailModal;
