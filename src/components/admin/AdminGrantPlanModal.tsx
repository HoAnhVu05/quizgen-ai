import React, { useState } from 'react';
import { X, Crown, Calendar, Sparkles, Database, Check, ShieldAlert } from 'lucide-react';
import { UserProfile } from '../../types';

export interface GrantPlanPayload {
  userId: string;
  userEmail: string;
  planTier: string;
  durationDays: number; // 0 means permanent
  customQuotaExams: number; // -1 means unlimited
  customQuotaStorageMb: number;
  reason?: string;
}

export interface AdminGrantPlanModalProps {
  user: UserProfile;
  isOpen: boolean;
  onClose: () => void;
  onGrantPlan: (payload: GrantPlanPayload) => Promise<void>;
}

export const AdminGrantPlanModal: React.FC<AdminGrantPlanModalProps> = ({
  user,
  isOpen,
  onClose,
  onGrantPlan,
}) => {
  const getInitialPlan = (tier?: string) => {
    const raw = (tier || '').toUpperCase();
    if (raw === 'ENTERPRISE') return 'ENTERPRISE';
    if (raw === 'PRO_YEAR') return 'PRO_YEAR';
    if (raw === 'PRO_MONTH' || raw === 'PRO') return 'PRO_MONTH';
    return 'PRO_MONTH';
  };

  const [selectedPlan, setSelectedPlan] = useState<string>(getInitialPlan(user.planTier));
  const [durationOption, setDurationOption] = useState<string>('30d');
  const [customQuotaExams, setCustomQuotaExams] = useState<number>(100);
  const [customQuotaStorageMb, setCustomQuotaStorageMb] = useState<number>(2048);
  const [reason, setReason] = useState<string>('Đặc quyền Ban Giám hiệu / Quản trị viên cấp');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const planOptions = [
    {
      id: 'FREE',
      name: 'Gói Trải Nghiệm (Free)',
      desc: '3 giáo trình (≤ 15MB/tệp), 50 câu hỏi AI & 2 đề thi/tháng',
      badge: 'Cơ bản',
      color: 'border-slate-200 bg-slate-50 text-slate-700',
      activeColor: 'border-slate-400 bg-slate-100 ring-2 ring-slate-400',
      defaultExams: 2,
      defaultStorage: 100,
      defaultDuration: '30d',
    },
    {
      id: 'PRO_MONTH',
      name: 'Gói PRO Giảng Viên (1 Tháng)',
      desc: 'Giáo trình không giới hạn (≤ 50MB/tệp), 1.000 câu/tháng, 4 mức tư duy Bloom',
      badge: 'Phổ biến',
      color: 'border-teal-200 bg-teal-50 text-[#008689]',
      activeColor: 'border-[#008689] bg-teal-50/80 ring-2 ring-[#008689]',
      defaultExams: 100,
      defaultStorage: 2048,
      defaultDuration: '30d',
    },
    {
      id: 'PRO_YEAR',
      name: 'Gói PRO Giảng Viên (1 Năm)',
      desc: 'Đầy đủ đặc quyền PRO (≤ 50MB/tệp), RAG chuyên sâu, thời hạn trọn 365 ngày',
      badge: 'Ưu đãi 1 Năm',
      color: 'border-indigo-200 bg-indigo-50 text-indigo-700',
      activeColor: 'border-indigo-500 bg-indigo-50/80 ring-2 ring-indigo-500',
      defaultExams: 500,
      defaultStorage: 5120,
      defaultDuration: '365d',
    },
    {
      id: 'ENTERPRISE',
      name: 'Gói Bộ Môn / Viện (Enterprise)',
      desc: 'Tải tệp lớn (≤ 100MB/tệp), không giới hạn câu hỏi & đề thi, ngân hàng dùng chung',
      badge: 'Cao cấp',
      color: 'border-amber-200 bg-amber-50 text-amber-900',
      activeColor: 'border-amber-500 bg-amber-50/80 ring-2 ring-amber-500',
      defaultExams: -1,
      defaultStorage: 10240,
      defaultDuration: '365d',
    },
  ];

  const handleSelectPlan = (planId: string) => {
    setSelectedPlan(planId);
    const matched = planOptions.find((p) => p.id === planId);
    if (matched) {
      setCustomQuotaExams(matched.defaultExams);
      setCustomQuotaStorageMb(matched.defaultStorage);
      if (planId === 'FREE') {
        setDurationOption('permanent');
      } else if (matched.defaultDuration) {
        setDurationOption(matched.defaultDuration);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      let days = 30;
      if (selectedPlan === 'FREE' || durationOption === 'permanent') days = 0;
      else if (durationOption === '7d') days = 7;
      else if (durationOption === '30d') days = 30;
      else if (durationOption === '90d') days = 90;
      else if (durationOption === '365d') days = 365;

      await onGrantPlan({
        userId: user.id,
        userEmail: user.email,
        planTier: selectedPlan,
        durationDays: days,
        customQuotaExams,
        customQuotaStorageMb,
        reason: reason.trim(),
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-50 via-teal-50 to-emerald-50 px-6 py-5 border-b border-slate-200/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Cấp &amp; Tùy Biến Gói Dịch Vụ
              </h3>
              <p className="text-xs text-slate-600">
                Áp dụng đặc quyền cho: <span className="font-semibold text-slate-800">{user.fullName || user.email}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-white/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* User Profile Mini Bar */}
          <div className="bg-slate-50 border border-slate-200/70 rounded-2xl p-3.5 flex items-center justify-between text-xs">
            <div>
              <div className="font-bold text-slate-800">{user.fullName || 'Giảng viên'}</div>
              <div className="text-slate-500 font-mono text-[11px]">{user.email}</div>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-500 uppercase font-semibold">Gói hiện tại</span>
              <div className="font-bold text-[#008689] uppercase tracking-wide">
                {user.planTier || 'FREE'}
              </div>
            </div>
          </div>

          {/* 1. Chọn Gói */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Crown className="w-3.5 h-3.5 text-amber-500" />
              <span>1. Chọn Cấp Gói Dịch Vụ</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {planOptions.map((opt) => (
                <div
                  key={opt.id}
                  onClick={() => handleSelectPlan(opt.id)}
                  className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                    selectedPlan === opt.id ? opt.activeColor : `${opt.color} hover:bg-white`
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs">{opt.name}</span>
                    {selectedPlan === opt.id && <Check className="w-4 h-4 text-emerald-600" />}
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1 leading-snug">{opt.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 2. Thời hạn hiệu lực */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-sky-600" />
              <span>2. Thời Hạn Hiệu Lực</span>
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {[
                { id: '7d', label: '7 ngày' },
                { id: '30d', label: '30 ngày' },
                { id: '90d', label: '90 ngày' },
                { id: '365d', label: '1 năm' },
                { id: 'permanent', label: 'Vĩnh viễn' },
              ].map((dur) => (
                <button
                  type="button"
                  key={dur.id}
                  onClick={() => setDurationOption(dur.id)}
                  className={`py-2 px-1 text-xs font-semibold rounded-xl border transition-all text-center ${
                    durationOption === dur.id
                      ? 'bg-[#008689] text-white border-[#008689] shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {dur.label}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Tùy biến Quota (Số đề thi & Dung lượng) */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
              <span>3. Tùy Biến Quota Đặc Quyền (Override)</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3">
                <span className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Số đề thi AI/tháng (-1 = Không giới hạn):
                </span>
                <input
                  type="number"
                  value={customQuotaExams}
                  onChange={(e) => setCustomQuotaExams(parseInt(e.target.value, 10) || 0)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-sm font-bold text-slate-800 outline-none focus:border-[#008689]"
                />
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3">
                <span className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Dung lượng giáo trình RAG (MB):
                </span>
                <input
                  type="number"
                  value={customQuotaStorageMb}
                  onChange={(e) => setCustomQuotaStorageMb(parseInt(e.target.value, 10) || 0)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-sm font-bold text-slate-800 outline-none focus:border-[#008689]"
                />
              </div>
            </div>
          </div>

          {/* 4. Lý do cấp gói */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
              4. Ghi Chú / Lý Do Cấp Gói (Lưu Nhật Ký Kiểm Toán)
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="VD: Cấp gói cho Chủ nhiệm đề tài NCKH cấp Bộ..."
              className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 outline-none focus:border-[#008689]"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-[#008689] hover:bg-[#007376] text-white shadow-md shadow-teal-700/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Crown className="w-4 h-4" />
              <span>{isSubmitting ? 'Đang cập nhật...' : 'Xác Nhận Cấp Gói'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
