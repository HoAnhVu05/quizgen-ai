import React from 'react';
import { BookOpen, FileCheck2, X, Send } from 'lucide-react';
import { TextbookFile } from '../../types';

interface QGroupAttachModalsProps {
  isAttachTextbookOpen: boolean;
  onCloseAttachTextbook: () => void;
  textbooks: TextbookFile[];
  onShareTextbook: (book: TextbookFile) => void;
  isAttachExamOpen: boolean;
  onCloseAttachExam: () => void;
  onShareExam: (exam: any) => void;
}

const getSavedExams = (): any[] => {
  try {
    const stored = localStorage.getItem('quizgen_saved_exams');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return [
    {
      id: 'exam-os-midterm-40q',
      title: 'Đề Thi Giữa Kỳ Môn Hệ Điều Hành - Mã 101',
      name: 'Đề Thi Giữa Kỳ Môn Hệ Điều Hành - Mã 101',
      subject: 'Hệ Điều Hành & Mạng',
      questionCount: 40,
      durationMinutes: 60,
    },
    {
      id: 'exam-ktvm-final-50q',
      title: 'Đề Thi Cuối Kỳ Kinh Tế Vi Mô - 50 Câu Chuẩn Bộ GD',
      name: 'Đề Thi Cuối Kỳ Kinh Tế Vi Mô - 50 Câu Chuẩn Bộ GD',
      subject: 'Kinh Tế Vi Mô',
      questionCount: 50,
      durationMinutes: 75,
    },
  ];
};

export const QGroupAttachModals: React.FC<QGroupAttachModalsProps> = ({
  isAttachTextbookOpen,
  onCloseAttachTextbook,
  textbooks,
  onShareTextbook,
  isAttachExamOpen,
  onCloseAttachExam,
  onShareExam,
}) => {
  return (
    <>
      {isAttachTextbookOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-teal-50/50">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#008689]" />
                <h3 className="font-extrabold text-slate-900 text-xs">Chọn Giáo Trình Để Chia Sẻ Vào Nhóm</h3>
              </div>
              <button onClick={onCloseAttachTextbook} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto space-y-2 flex-1 text-xs">
              {textbooks.length === 0 ? (
                <div className="py-8 text-center text-slate-400">
                  Kho của bạn chưa có giáo trình nào. Vui lòng tải lên giáo trình trước!
                </div>
              ) : (
                textbooks.map((book) => (
                  <div key={book.id} className="p-3 rounded-2xl border border-slate-200 hover:border-teal-300 bg-white flex items-center justify-between gap-3 shadow-2xs">
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 text-xs truncate" title={book.name}>{book.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{book.totalPages} trang • {book.size}</div>
                    </div>
                    <button
                      onClick={() => onShareTextbook(book)}
                      className="px-3 py-1.5 bg-[#008689] hover:bg-[#007073] text-white rounded-xl font-bold text-xs shrink-0 shadow-xs transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <Send className="w-3 h-3" />
                      <span>Gửi Vào Nhóm</span>
                    </button>
                  </div>
                ))
              )}
            </div>
            <div className="p-3 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button onClick={onCloseAttachTextbook} className="px-4 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs">
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}

      {isAttachExamOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-indigo-50/50">
              <div className="flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-indigo-600" />
                <h3 className="font-extrabold text-slate-900 text-xs">Chọn Bộ Đề Thi Để Chia Sẻ Vào Nhóm</h3>
              </div>
              <button onClick={onCloseAttachExam} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto space-y-2 flex-1 text-xs">
              {getSavedExams().map((exam) => (
                <div key={exam.id} className="p-3 rounded-2xl border border-slate-200 hover:border-indigo-300 bg-white flex items-center justify-between gap-3 shadow-2xs">
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 text-xs truncate" title={exam.title || exam.name}>{exam.title || exam.name}</div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      Môn: {exam.subject} • {exam.questionCount || 40} câu • {exam.durationMinutes || 60} phút
                    </div>
                  </div>
                  <button
                    onClick={() => onShareExam(exam)}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shrink-0 shadow-xs transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <Send className="w-3 h-3" />
                    <span>Gửi Đề Vào Nhóm</span>
                  </button>
                </div>
              ))}
            </div>
            <div className="p-3 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button onClick={onCloseAttachExam} className="px-4 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs">
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
