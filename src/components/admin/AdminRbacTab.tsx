import React from 'react';
import { Check, Layers, X } from 'lucide-react';

export interface AdminRbacTabProps {
  lecCount: number;
  hodCount: number;
  adminCount: number;
}

export const AdminRbacTab: React.FC<AdminRbacTabProps> = ({
  lecCount,
  hodCount,
  adminCount,
}) => {
  return (
        <div className="space-y-5">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-2 shadow-xs">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#008689]" />
              <span>Ma Trận Phân Quyền Vai Trò Hệ Thống (Role-Based Access Control - RBAC)</span>
            </h3>
            <p className="text-xs text-slate-500">
              Kiểm soát ranh giới quyền hạn nghiêm ngặt giữa Quản trị viên, Trưởng bộ môn và Giảng viên trong quy trình biên soạn đề thi UTH.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Lecturer Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3.5 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#008689]" />
                  <h4 className="font-bold text-sm text-slate-900">Giảng Viên (Lecturer)</h4>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-teal-50 text-[#008689] font-bold border border-teal-200">
                  {lecCount} Người
                </span>
              </div>
              <ul className="space-y-2 text-xs text-slate-600">
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Nạp giáo trình, tài liệu môn học PDF/DOCX (tối đa 25MB)</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Sinh câu hỏi tự động qua AI theo 4 mức độ tư duy Bloom</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Biên tập, chỉnh sửa câu hỏi trong Không gian Làm việc</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Trộn 4 mã đề hoán vị và xuất file DOCX / PDF OMR</span>
                </li>
                <li className="flex items-start gap-2 text-slate-400">
                  <X className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <span>Không được duyệt đề thi chính thức toàn bộ môn</span>
                </li>
                <li className="flex items-start gap-2 text-slate-400">
                  <X className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <span>Không được truy cập Trung tâm Quản trị Admin</span>
                </li>
              </ul>
            </div>

            {/* HOD Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3.5 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                  <h4 className="font-bold text-sm text-slate-900">Trưởng Bộ Môn (HOD)</h4>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-bold border border-indigo-200">
                  {hodCount} Người
                </span>
              </div>
              <ul className="space-y-2 text-xs text-slate-600">
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Bao gồm toàn bộ quyền hạn của Giảng viên</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Kiểm tra tuân thủ ma trận chuẩn đầu ra Bloom bộ môn</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Phê duyệt đề thi chính thức chuyển sang Phòng Khảo thí</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Xem ngân hàng câu hỏi dùng chung của Bộ môn</span>
                </li>
                <li className="flex items-start gap-2 text-slate-400">
                  <X className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <span>Không có quyền khóa/xóa tài khoản giảng viên</span>
                </li>
                <li className="flex items-start gap-2 text-slate-400">
                  <X className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <span>Không được can thiệp cấu hình bảo mật hạ tầng</span>
                </li>
              </ul>
            </div>

            {/* Admin Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3.5 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#da1c2d]" />
                  <h4 className="font-bold text-sm text-slate-900">Quản Trị Viên (Admin)</h4>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-50 text-[#da1c2d] font-bold border border-rose-200">
                  {adminCount} Người
                </span>
              </div>
              <ul className="space-y-2 text-xs text-slate-600">
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Toàn quyền quản trị tài khoản, tạo mới, đặt lại mật khẩu</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Phân quyền vai trò RBAC cho toàn bộ tài khoản</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Khóa tài khoản (Tạm khóa có hẹn giờ / Khóa vĩnh viễn) tức thì</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Mở khóa tài khoản bất cứ lúc nào</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Giám sát thời gian thực 7 Microservices (Ports 8000–8006)</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Bảo vệ 2 lớp với Mã PIN 2FA 6 chữ số cấp hệ thống</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

  );
};
