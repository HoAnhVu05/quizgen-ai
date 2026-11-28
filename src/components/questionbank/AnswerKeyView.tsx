import React from 'react';
import { Download, FileQuestion } from 'lucide-react';
import { Question } from '../../types';
import { ExamVariantQuestion } from './types';

interface AnswerKeyViewProps {
  availableCodes: string[];
  targetExamQuestions: Question[];
  examVariants: Record<string, ExamVariantQuestion[]>;
  onDownloadAnswerKey: () => void;
}

export const AnswerKeyView: React.FC<AnswerKeyViewProps> = ({
  availableCodes,
  targetExamQuestions,
  examVariants,
  onDownloadAnswerKey,
}) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div>
          <h3 className="text-base font-bold text-slate-800">
            Bảng Đáp Án Chấm Thi Tổng Hợp ({availableCodes.length} Mã Đề: {availableCodes.join(', ')})
          </h3>
          <p className="text-xs text-slate-500">
            Dành cho Giảng viên lưu hồ sơ chấm thi sau khi trộn {availableCodes.length} mã đề bằng thuật toán Fisher-Yates
          </p>
        </div>
        <button
          onClick={onDownloadAnswerKey}
          disabled={targetExamQuestions.length === 0}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#008689] hover:bg-[#006f72] text-white text-xs font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          Tải Bảng Đáp Án & Lời Giải (.txt)
        </button>
      </div>

      {targetExamQuestions.length === 0 ? (
        <div className="py-12 px-4 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50 space-y-2">
          <FileQuestion className="w-8 h-8 text-slate-400 mx-auto" />
          <p className="text-sm font-semibold text-slate-700">Chưa có câu hỏi để tạo bảng đáp án {availableCodes.length} mã đề</p>
          <p className="text-xs text-slate-400">Vui lòng tải lên tài liệu giáo trình và tạo câu hỏi trước khi lập bảng đáp án.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase">
                <th className="py-3 px-4">Thứ tự câu trên đề</th>
                {availableCodes.map((code) => (
                  <th key={code} className="py-3 px-4 text-center">
                    Mã đề {code}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {targetExamQuestions.map((_, idx) => (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-bold text-slate-800">Câu {idx + 1}</td>
                  {availableCodes.map((code) => (
                    <td key={code} className="py-3 px-4 text-center">
                      <span className="inline-flex items-center justify-center min-w-[28px] px-2 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 font-extrabold text-xs">
                        {examVariants[code]?.[idx]?.correctLabel || 'A'}
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
