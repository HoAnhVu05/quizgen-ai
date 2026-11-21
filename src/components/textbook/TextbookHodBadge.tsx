import React, { useState } from 'react';
import { ShieldCheck, Award, CheckCircle2, Flame, Sparkles } from 'lucide-react';
import { TextbookFile, UserProfile } from '../../types';
import apiClient from '../../services/apiClient';

interface TextbookHodBadgeProps {
  textbook: TextbookFile;
  currentUser?: UserProfile | null;
  onStatusChange?: (updated: TextbookFile) => void;
  onShowToast?: (type: 'success' | 'info' | 'warning' | 'error', title: string, message: string) => void;
}

export const TextbookHodBadge: React.FC<TextbookHodBadgeProps> = ({
  textbook,
  currentUser,
  onStatusChange,
  onShowToast,
}) => {
  const [isApproving, setIsApproving] = useState(false);

  const isHodOrAdmin =
    currentUser?.role === 'head_of_department' ||
    currentUser?.role === 'admin' ||
    (currentUser as any)?.email === 'truongbomon@vnu.edu.vn' ||
    (currentUser as any)?.email?.includes('admin');

  const handleToggleApprove = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isHodOrAdmin) return;

    setIsApproving(true);
    try {
      const res = await apiClient.post<any>(`/documents/${textbook.id}/approve`, {
        is_approved: !textbook.isApproved,
      });

      const updated = {
        ...textbook,
        isApproved: res.isApproved,
        approvedBy: res.approvedBy,
        approvedAt: res.approvedAt,
      };

      if (onStatusChange) onStatusChange(updated);
      if (onShowToast) {
        onShowToast(
          'success',
          res.isApproved ? 'Đã đóng dấu thẩm định!' : 'Đã thu hồi con dấu',
          res.message || 'Cập nhật trạng thái thẩm định giáo trình thành công'
        );
      }
    } catch (err: any) {
      if (onShowToast) {
        onShowToast(
          'error',
          'Lỗi thẩm định',
          err?.response?.data?.detail || err?.message || 'Không thể đóng dấu thẩm định'
        );
      }
    } finally {
      setIsApproving(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* 1. Con dấu Thẩm định Bộ môn (Tier 2 Badge) */}
      {textbook.isApproved ? (
        <div
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-800 text-[11px] font-bold shadow-2xs"
          title={`Được phê duyệt bởi ${textbook.approvedBy || 'Trưởng bộ môn'}${
            textbook.approvedAt ? ` vào lúc ${textbook.approvedAt}` : ''
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>🛡️ Giáo trình chuẩn (HOD Phê duyệt)</span>
        </div>
      ) : (
        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 text-[10px] font-medium">
          <Sparkles className="w-3 h-3 text-slate-400" />
          <span>Đã lọc AI Cấp 1</span>
        </div>
      )}

      {/* 2. Chỉ số uy tín / Số lần sử dụng (Usage count) */}
      {(textbook.usageCount ?? 0) > 0 && (
        <div
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-semibold"
          title={`Giáo trình này đã được ${textbook.usageCount} giảng viên nạp để tạo đề thi`}
        >
          <Flame className="w-3 h-3 text-amber-600 fill-amber-500" />
          <span>{textbook.usageCount} lượt dùng</span>
        </div>
      )}

      {/* 3. Nút đóng dấu / Thu hồi dành riêng cho Trưởng bộ môn & Admin */}
      {isHodOrAdmin && (
        <button
          type="button"
          onClick={handleToggleApprove}
          disabled={isApproving}
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-2xs ${
            textbook.isApproved
              ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
              : 'bg-[#008689] text-white hover:bg-[#006d70] border border-[#008689]'
          }`}
          title={
            textbook.isApproved
              ? 'Thu hồi con dấu thẩm định khỏi giáo trình này'
              : 'Xác nhận giáo trình đạt chuẩn chuyên môn bộ môn và đóng dấu uy tín'
          }
        >
          <Award className="w-3.5 h-3.5 shrink-0" />
          <span>
            {isApproving
              ? 'Đang xử lý...'
              : textbook.isApproved
              ? 'Thu hồi dấu HOD'
              : '🛡️ Đóng dấu Thẩm định'}
          </span>
        </button>
      )}
    </div>
  );
};
