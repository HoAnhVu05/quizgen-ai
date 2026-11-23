import React from 'react';
import { Printer, FileQuestion } from 'lucide-react';
import MathRenderer from '../MathRenderer';
import { ExamVariantQuestion } from './types';

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
                    {q.imageUrl && (
                      <div className="my-2.5 flex flex-col items-center justify-center">
                        <img
                          src={q.imageUrl}
                          alt={q.imageCaption || `Sơ đồ câu ${index + 1}`}
                          className="max-h-56 max-w-full rounded-md object-contain border border-slate-200 shadow-2xs bg-white p-1 cursor-pointer hover:opacity-90 transition-opacity"
                          loading="lazy"
                          onClick={() => onImageClick(q.imageUrl!, q.imageCaption)}
                        />
                        {q.imageCaption && (
                          <span className="text-[11px] text-slate-500 italic mt-1 text-center font-medium">
                            ({q.imageCaption})
                          </span>
                        )}
                      </div>
                    )}
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

              {/* Phiếu làm bài trắc nghiệm OMR tiêu chuẩn đính kèm ở cuối bài thi khi in trực tiếp */}
              <div className="pt-8 border-t-4 border-dashed border-slate-300 mt-8 space-y-4 break-before-page">
                <div className="border-2 border-slate-900 p-4 rounded-lg bg-white space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 border-b-2 border-slate-900 pb-3 text-center">
                    <div>
                      <p className="text-[10px] font-bold uppercase text-slate-700">
                        {universityName || 'TRƯỜNG ĐẠI HỌC GIAO THÔNG VẬN TẢI TP.HCM'}
                      </p>
                      <p className="text-[11px] font-extrabold uppercase text-slate-900">
                        PHIẾU TRẢ LỜI TRẮC NGHIỆM
                      </p>
                    </div>
                    <div className="text-left text-[11px] space-y-1">
                      <p>Họ tên: ..............................................................</p>
                      <p>MSSV: ............................... Lớp: .........................</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="border border-slate-800 rounded p-1.5 text-center bg-slate-50">
                      <span className="font-bold block text-slate-700 text-[11px]">MÃ ĐỀ THI</span>
                      <span className="font-mono text-base font-extrabold text-slate-900">{activeExamCode}</span>
                      <span className="text-[9px] text-slate-500 italic block">(Thí sinh ghi đúng mã đề)</span>
                    </div>

                    <div className="border border-slate-800 rounded p-1 text-center bg-white">
                      <div className="grid grid-cols-2 divide-x divide-slate-300 text-[10px]">
                        <div>
                          <span className="font-bold block">CB Coi thi 1</span>
                          <span className="h-6 block" />
                        </div>
                        <div>
                          <span className="font-bold block">CB Coi thi 2</span>
                          <span className="h-6 block" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Hướng dẫn tô trắc nghiệm */}
                  <div className="bg-slate-100 border border-slate-300 rounded p-2 text-[10.5px] text-slate-800 leading-snug">
                    <strong>HƯỚNG DẪN TÔ TRẮC NGHIỆM:</strong> Dùng bút chì 2B tô đen kín hình tròn chứa đáp án: 
                    <span className="inline-flex items-center gap-1 mx-1.5 font-bold"><span className="w-3.5 h-3.5 rounded-full bg-slate-900 text-white text-[8px] flex items-center justify-center">A</span> [ĐÚNG]</span>; 
                    Tuyệt đối KHÔNG gạch chéo [X], KHÔNG đánh dấu tích [✓], KHÔNG tẩy xóa làm rách phiếu thi.
                  </div>

                  {/* Lưới ô tô đáp án OMR 4 cột cân đối */}
                  <div className="border-2 border-slate-900 rounded-lg p-3 bg-white space-y-2">
                    <div className="text-center font-bold text-xs uppercase text-slate-800 pb-1.5 border-b border-slate-200">
                      PHẦN TRẢ LỜI CÁC CÂU HỎI TRẮC NGHIỆM (TỔNG SỐ {activeVariantQuestions.length} CÂU)
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-3 gap-y-1.5 pt-1">
                      {activeVariantQuestions.map((_, i) => (
                        <div key={i} className="flex items-center justify-between px-2 py-1 rounded border border-slate-200 bg-slate-50/70 text-xs">
                          <span className="font-black text-slate-800 w-6 font-mono text-[11px]">{i + 1}.</span>
                          <div className="flex items-center gap-1">
                            {['A', 'B', 'C', 'D'].map((lbl) => (
                              <span
                                key={lbl}
                                className="w-4.5 h-4.5 rounded-full border border-slate-700 text-[9.5px] font-bold flex items-center justify-center text-slate-800 bg-white shadow-2xs"
                              >
                                {lbl}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Khung Điểm thi & Chữ ký Giám khảo */}
                  <div className="grid grid-cols-3 border-2 border-slate-900 rounded text-center divide-x-2 divide-slate-900 text-xs mt-2 bg-white">
                    <div className="p-2 space-y-1">
                      <span className="font-bold text-[11px] block text-slate-800">ĐIỂM BẰNG SỐ</span>
                      <div className="h-8 border border-dashed border-slate-300 rounded flex items-center justify-center font-bold text-sm text-slate-400">
                        ...
                      </div>
                    </div>
                    <div className="p-2 space-y-1">
                      <span className="font-bold text-[11px] block text-slate-800">ĐIỂM BẰNG CHỮ</span>
                      <div className="h-8 border border-dashed border-slate-300 rounded flex items-center justify-center font-bold text-xs text-slate-400">
                        ...
                      </div>
                    </div>
                    <div className="p-2 space-y-1">
                      <span className="font-bold text-[11px] block text-slate-800">CHỮ KÝ CÁN BỘ CHẤM THI</span>
                      <div className="h-8 flex items-center justify-center text-[10px] text-slate-400 italic">
                        (Ký và ghi rõ họ tên)
                      </div>
                    </div>
                  </div>
                </div>
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
