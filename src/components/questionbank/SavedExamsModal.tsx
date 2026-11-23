import React from 'react';
import { FolderOpen, X, FileQuestion, Printer } from 'lucide-react';
import { SavedExamItem } from './types';

interface SavedExamsModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedExams: SavedExamItem[];
  onLoadExam: (exam: SavedExamItem) => void;
  onDeleteExam: (id: string) => void;
}

export const SavedExamsModal: React.FC<SavedExamsModalProps> = ({
  isOpen,
  onClose,
  savedExams,
  onLoadExam,
  onDeleteExam,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-slate-900/50 p-4 no-print">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-fade-in">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-50 text-[#008689] flex items-center justify-center font-bold">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                Kho Đề Thi Đã Sinh & Đóng Gói
              </h3>
              <p className="text-[11px] text-slate-500">
                Chọn một bộ đề thi trước đó để nạp lại vào bản in A4, phiếu OMR và bảng đáp án
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Exams List */}
        <div className="p-5 overflow-y-auto space-y-3 flex-1">
          {savedExams.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <FileQuestion className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-xs font-semibold text-slate-700">
                Chưa có đề thi nào trong kho lưu trữ
              </p>
              <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                Mỗi khi bạn thực hiện xuất bản đề thi (Word, PDF, QTI), bài thi sẽ được lưu tự động tại đây để bạn có thể chọn và in lại bất kỳ lúc nào.
              </p>
            </div>
          ) : (
            savedExams.map((exam) => (
              <div
                key={exam.id}
                className="p-4 rounded-2xl border border-slate-200 hover:border-[#008689] bg-white transition-all space-y-2.5 shadow-2xs"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{exam.title}</h4>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 mt-1">
                      <span className="font-semibold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                        Môn: {exam.subject}
                      </span>
                      <span>•</span>
                      <span>{exam.questionCount} câu hỏi</span>
                      <span>•</span>
                      <span>{exam.durationMinutes} phút</span>
                      <span>•</span>
                      <span className="font-bold text-[#008689]">
                        {exam.examCodes?.length || 4} mã đề ({exam.examCodes?.join(', ') || '101-104'})
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {exam.createdAt}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                  <span className="text-slate-500 text-[11px] truncate max-w-[280px]">
                    {exam.university} — {exam.faculty}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onDeleteExam(exam.id)}
                      className="px-2.5 py-1 rounded-lg text-rose-600 hover:bg-rose-50 text-[11px] font-semibold transition-colors cursor-pointer"
                    >
                      Xóa
                    </button>
                    <button
                      onClick={() => onLoadExam(exam)}
                      className="px-3.5 py-1.5 rounded-xl bg-[#008689] hover:bg-[#006f72] text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      Chọn đề này để in / xuất
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
          <span className="text-slate-500">
            Tổng cộng: <strong>{savedExams.length}</strong> bài thi đã lưu
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
