import React, { useState } from 'react';
import { Printer, FileQuestion, Image as ImageIcon } from 'lucide-react';
import MathRenderer from '../MathRenderer';
import { ExamVariantQuestion } from './types';
import { resolveImageUrl } from '../../services/apiClient';

interface PaperPreviewViewProps {
  activeExamCode: string;
  availableCodes: string[];
  onSelectExamCode: (code: string) => void;
  onPrint: () => void;
  universityName: string;
  facultyName: string;
  examTitle: string;
  subjectName: string;
  examDuration: number;
  activeVariantQuestions: ExamVariantQuestion[];
  onImageClick: (url: string, caption?: string) => void;
  onViewAnswerKey: () => void;
}

export const PaperPreviewView: React.FC<PaperPreviewViewProps> = ({
  activeExamCode,
  availableCodes,
  onSelectExamCode,
  onPrint,
  universityName,
  facultyName,
  examTitle,
  subjectName,
  examDuration,
  activeVariantQuestions,
  onImageClick,
  onViewAnswerKey,
}) => {
  const [brokenImageIds, setBrokenImageIds] = useState<Record<string, boolean>>({});
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left: A4 Exam Paper Preview */}
      <div className="lg:col-span-8 bg-white rounded-xl border border-slate-300 shadow-sm p-3.5 sm:p-6 sm:p-8 space-y-4 sm:space-y-6">
        {/* Code Switcher Bar (Ẩn khi in) */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-slate-200 no-print">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase">
              Chọn Mã Đề Xem Trước:
            </span>
            {availableCodes.map((code) => (
              <button
                key={code}
                onClick={() => onSelectExamCode(code)}
                className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                  activeExamCode === code
                    ? 'bg-[#008689] text-white border-[#008689]'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                Mã đề {code}
              </button>
            ))}
          </div>

          <button
            onClick={onPrint}
            disabled={activeVariantQuestions.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            title="In trực tiếp tờ đề hiện tại ra máy in hoặc lưu file PDF (Chỉ in nội dung tờ đề)"
          >
            <Printer className="w-3.5 h-3.5 text-[#008689]" />
            In trực tiếp tờ đề này
          </button>
        </div>

        {/* Printable Exam Paper Container: Chỉ in toàn bộ nội dung trong tờ đề này */}
        <div id="printable-exam-paper" className="space-y-6">
          {/* Official University Header on A4 Paper */}
          <div className="border-2 border-slate-800 p-4 rounded-lg exam-header-box">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-center border-b border-slate-300 pb-3">
              <div className="space-y-0.5">
                <p className="text-[11px] font-bold uppercase text-slate-700">
                  {universityName || 'TRƯỜNG ĐẠI HỌC GIAO THÔNG VẬN TẢI TP.HCM'}
                </p>
                <p className="text-xs font-extrabold uppercase text-slate-900">
                  {facultyName || 'KHOA CÔNG NGHỆ THÔNG TIN'}
                </p>
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-extrabold uppercase text-slate-900">{examTitle}</p>
                <p className="text-[11px] font-semibold text-slate-700">
                  Học phần:{' '}
                  <span className="font-bold text-slate-900">
                    {subjectName || 'Chưa đặt tên học phần'}
                  </span>
                </p>
                <p className="text-[11px] text-slate-600">
                  Thời gian làm bài: <strong>{examDuration} phút</strong> (Không kể thời gian phát đề)
                </p>
              </div>
            </div>

            <div className="pt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-700">
              <div>
                Họ và tên sinh viên: ..........................................................
                MSSV: ..........................
              </div>
              <div className="px-3 py-1 border-2 border-slate-900 font-extrabold text-slate-900 uppercase">
                MÃ ĐỀ: {activeExamCode}
              </div>
            </div>
          </div>

          {/* Shuffled Questions List on A4 Paper or Empty State */}
          {activeVariantQuestions.length === 0 ? (
            <div className="py-12 px-4 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50 space-y-3">
              <div className="w-12 h-12 rounded-full bg-teal-50 text-[#008689] flex items-center justify-center mx-auto">
                <FileQuestion className="w-6 h-6" />
              </div>
              <div className="space-y-1 max-w-md mx-auto">
                <h4 className="text-sm font-bold text-slate-800">
                  Chưa có câu hỏi nào trong đề thi
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Hệ thống đã dọn dẹp sạch toàn bộ dữ liệu câu hỏi ảo. Để xuất đề thi, vui lòng tải lên tài liệu giáo trình tại <strong>Bước 1</strong> và thực hiện tạo câu hỏi tại <strong>Bước 2 & Bước 3</strong>.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-5 pt-2">
                {activeVariantQuestions.map((q, index) => (
                  <div key={`${activeExamCode}-${q.id}`} className="space-y-2 text-sm text-slate-900 exam-question-item">
                    <div className="font-semibold leading-relaxed">
                      <span className="font-extrabold mr-1">Câu {index + 1}:</span>
                      <MathRenderer content={q.question} inline />
                    </div>

                    {/* Tự động chèn hình vẽ sơ đồ vào ngay dưới nội dung câu hỏi */}
                    {(() => {
                      const rawImg = q.imageUrl || (q as any).image_url;
                      if (!rawImg) return null;
                      const normalizedSrc = resolveImageUrl(rawImg);
                      const isBroken = brokenImageIds[q.id];

                      return (
                        <div className="my-2.5 flex flex-col items-center justify-center print:break-inside-avoid print:my-2">
                          {!isBroken ? (
                            <img
                              src={normalizedSrc}
                              alt={q.imageCaption || (q as any).image_caption || `Sơ đồ câu ${index + 1}`}
                              className="max-h-64 max-w-full rounded-md object-contain border border-slate-200 shadow-2xs bg-white p-1 cursor-pointer hover:opacity-90 transition-opacity print:border-none print:shadow-none"
                              loading="eager"
                              onError={(e) => {
                                if (rawImg && e.currentTarget.src !== rawImg && !e.currentTarget.dataset.retried) {
                                  e.currentTarget.dataset.retried = 'true';
                                  e.currentTarget.src = rawImg;
                                } else {
                                  setBrokenImageIds((prev) => ({ ...prev, [q.id]: true }));
                                }
                              }}
                              onClick={() => onImageClick(normalizedSrc, q.imageCaption || (q as any).image_caption)}
                            />
                          ) : (
                            <div
                              className="w-full max-w-md p-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center text-center space-y-1 cursor-pointer hover:bg-slate-100 transition-colors print:bg-white print:border-slate-300"
                              onClick={() => onImageClick(normalizedSrc, q.imageCaption || (q as any).image_caption)}
                            >
                              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                                <ImageIcon className="w-4 h-4 text-slate-500" />
                                <span>{q.imageCaption || (q as any).image_caption || `Sơ đồ câu ${index + 1}`}</span>
                              </div>
                              <span className="text-[10px] text-slate-400 italic">
                                (Hình vẽ sơ đồ học thuật đính kèm theo đề thi)
                              </span>
                            </div>
                          )}
                          {(q.imageCaption || (q as any).image_caption) && !isBroken && (
                            <span className="text-[11px] text-slate-500 italic mt-1 text-center font-medium print:text-[10px] print:text-slate-600">
                              ({q.imageCaption || (q as any).image_caption})
                            </span>
                          )}
                        </div>
                      );
                    })()}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-2">
                      {q.options.map((opt) => (
                        <div key={opt.id} className="text-xs sm:text-sm text-slate-800 flex items-start gap-1">
                          <span className="font-bold shrink-0">{opt.label}.</span>
                          <span className="flex-1"><MathRenderer content={opt.text} /></span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-slate-200 text-center text-xs font-bold text-slate-500 uppercase exam-footer-note">
                — HẾT (Sinh viên không được sử dụng tài liệu) —
              </div>
            </>
          )}
        </div>
      </div>

      {/* Right: OMR Answer Sheet Preview & Quick Answer Key (Không in) */}
      <div className="lg:col-span-4 space-y-4 no-print">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                Phiếu Tô Trắc Nghiệm OMR
              </h3>
              <p className="text-[11px] text-slate-500">
                Đính kèm tự động khi xuất PDF — Mã đề {activeExamCode}
              </p>
            </div>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-[#e6f4f4] text-[#008689]">
              Chuẩn máy chấm
            </span>
          </div>

          {activeVariantQuestions.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              Chưa có câu hỏi để hiển thị phiếu OMR
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2.5 max-h-[340px] overflow-y-auto pr-1">
              {activeVariantQuestions.map((_, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs"
                >
                  <span className="font-bold text-slate-700 w-7">{i + 1}.</span>
                  <div className="flex items-center gap-1.5">
                    {['A', 'B', 'C', 'D'].map((lbl) => (
                      <span
                        key={lbl}
                        className="w-5 h-5 rounded-full border border-slate-400 text-[10px] font-bold flex items-center justify-center text-slate-600 bg-white"
                      >
                        {lbl}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Teacher's Live Answer Key for Active Code */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-800 uppercase">
              Đáp Án Chấm Nhanh — Mã Đề {activeExamCode}
            </h4>
            <button
              onClick={onViewAnswerKey}
              className="text-[11px] font-bold text-[#008689] hover:underline cursor-pointer"
            >
              Xem đủ {availableCodes.length} mã đề →
            </button>
          </div>
          {activeVariantQuestions.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-400">
              Chưa có đáp án chấm
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {activeVariantQuestions.map((q, idx) => (
                <div
                  key={idx}
                  className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-center text-xs"
                >
                  <span className="font-semibold text-slate-600">{idx + 1}: </span>
                  <strong className="text-emerald-800">{q.correctLabel}</strong>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
