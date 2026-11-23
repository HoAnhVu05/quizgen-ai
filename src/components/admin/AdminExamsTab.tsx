import React from 'react';
import { CheckCircle2, Database } from 'lucide-react';
import { ExamComplianceData } from './adminTypes';

export interface AdminExamsTabProps {
  complianceData: ExamComplianceData | null;
  totalQuestions?: number;
}

export const AdminExamsTab: React.FC<AdminExamsTabProps> = ({
  complianceData,
  totalQuestions = 0,
}) => {
  return (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-2 shadow-xs">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Database className="w-4 h-4 text-[#008689]" />
              <span>Kho Đề Thi &amp; Kiểm Định Chất Lượng Toàn Trường (exam.db)</span>
            </h3>
            <p className="text-xs text-slate-500">
              Kiểm soát quy trình đóng gói đề thi của các Bộ môn từ dữ liệu CSDL thực tế exam.db, đảm bảo tuân thủ cấu trúc 4 mã đề hoán vị và chuẩn đầu ra Bloom.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-2 shadow-xs">
              <span className="text-xs font-bold text-slate-700 block border-b border-slate-100 pb-2">
                Phân Phối Ma Trận Bloom Thực Tế ({complianceData?.totalQuestionsAudited ?? totalQuestions} Câu hỏi)
              </span>
              <div className="space-y-1.5 text-xs text-slate-600 pt-1">
                <div className="flex justify-between">
                  <span>Nhận biết (L1):</span>
                  <span className="font-bold text-sky-600">
                    {complianceData?.bloomDistribution?.remember ?? 30}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Thông hiểu (L2):</span>
                  <span className="font-bold text-emerald-600">
                    {complianceData?.bloomDistribution?.understand ?? 40}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Vận dụng (L3):</span>
                  <span className="font-bold text-amber-600">
                    {complianceData?.bloomDistribution?.apply ?? 20}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Phân tích (L4):</span>
                  <span className="font-bold text-[#da1c2d]">
                    {complianceData?.bloomDistribution?.analyze ?? 10}%
                  </span>
                </div>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-2 shadow-xs">
              <span className="text-xs font-bold text-slate-700 block border-b border-slate-100 pb-2">
                Định Dạng Đóng Gói Khảo Thí
              </span>
              <div className="space-y-1.5 text-xs text-slate-600 pt-1">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>DOCX Đề thi &amp; Bảng đáp án</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>PDF Phiếu trả lời trắc nghiệm OMR (50 câu)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Gói QTI 2.1 tích hợp LMS Canvas/Moodle</span>
                </div>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-2 shadow-xs">
              <span className="text-xs font-bold text-slate-700 block border-b border-slate-100 pb-2">
                Chính Sách Khảo Thí UTH
              </span>
              <p className="text-xs text-slate-500 leading-relaxed pt-1">
                Mọi đề thi đều phải trải qua kiểm định trích dẫn RAG từ giáo trình và được Trưởng bộ môn phê duyệt trước khi được in ấn khảo thí.
              </p>
            </div>
          </div>

          {/* Real Exams Table from exam.db */}
          {complianceData?.recentApprovals && complianceData.recentApprovals.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
              <div className="p-4 border-b border-slate-100">
                <h4 className="text-xs font-bold uppercase text-slate-800">
                  Danh sách đề thi thực tế trong CSDL ({complianceData.recentApprovals.length})
                </h4>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-[11px] text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Mã Đề</th>
                      <th className="py-3 px-4">Môn Học</th>
                      <th className="py-3 px-4">Thời Lượng</th>
                      <th className="py-3 px-4">Số Mã Đề Hoán Vị</th>
                      <th className="py-3 px-4">Trạng Thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-normal">
                    {complianceData.recentApprovals.map((ex) => (
                      <tr key={ex.examId} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-800">{ex.examId}</td>
                        <td className="py-3 px-4 font-semibold text-slate-900">{ex.courseName}</td>
                        <td className="py-3 px-4">{ex.durationMinutes} phút</td>
                        <td className="py-3 px-4">{ex.variantsCount} mã đề</td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Chuẩn khảo thí
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

  );
};
