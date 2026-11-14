import React, { useState, useEffect } from 'react';
import {
  X,
  Check,
  Crown,
  Zap,
  Sparkles,
  ShieldCheck,
  ArrowRight,
  Clock,
  Layers,
  FileText,
  HelpCircle,
  AlertCircle
} from 'lucide-react';
import { SubscriptionPlan, UserSubscriptionInfo, OrderData, UserProfile } from '../types';
import { apiClient, API_BASE } from '../services/apiClient';

interface PricingPlansModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  subscriptionInfo: UserSubscriptionInfo | null;
  onSelectOrder: (order: OrderData) => void;
  onShowToast: (type: 'success' | 'info' | 'warning' | 'error', title: string, message: string) => void;
}

export const PricingPlansModal: React.FC<PricingPlansModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  subscriptionInfo,
  onSelectOrder,
  onShowToast
}) => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isCreatingOrder, setIsCreatingOrder] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      loadPlans();
    }
  }, [isOpen]);

  const loadPlans = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.fetch(`${API_BASE}/payment/plans`);
      if (res.ok) {
        const data = await res.json();
        setPlans(data.plans || []);
      }
    } catch (err) {
      console.error('Lỗi tải danh mục gói cước:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBuyPlan = async (plan: SubscriptionPlan) => {
    if (!currentUser) {
      onShowToast('error', 'Chưa đăng nhập', 'Vui lòng đăng nhập để nâng cấp gói cước.');
      return;
    }

    if (plan.code === 'FREE') {
      onShowToast('info', 'Gói Miễn Phí', 'Tài khoản của bạn đã có sẵn hạn mức gói Miễn Phí.');
      return;
    }

    setIsCreatingOrder(true);
    try {
      const res = await apiClient.fetch(`${API_BASE}/payment/orders/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan_id: plan.id,
          user_id: currentUser.id,
          user_email: currentUser.email,
          user_name: currentUser.fullName,
          payment_method: 'VIETQR'
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Không thể tạo đơn hàng');
      }

      const orderData: OrderData = await res.json();
      onClose();
      onSelectOrder(orderData);
    } catch (err: any) {
      onShowToast('error', 'Lỗi tạo đơn', err.message || 'Có lỗi xảy ra khi tạo mã QR thanh toán.');
    } finally {
      setIsCreatingOrder(false);
    }
  };

  if (!isOpen) return null;

  const currentPlanCode = subscriptionInfo?.plan_code || 'FREE';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] overflow-hidden shadow-2xl border border-slate-200 flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-slate-800 to-[#008689] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
              <Crown className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Nâng Cấp Gói Cước & Mở Khóa Tính Năng</h2>
              <p className="text-xs text-slate-300">
                Đang sử dụng:{' '}
                <span className="font-bold text-amber-300">
                  {subscriptionInfo?.plan_name || 'Gói Trải Nghiệm Miễn Phí'}
                </span>
                {subscriptionInfo?.expires_at && (
                  <span className="ml-1 text-slate-400">
                    (Hạn dùng: {subscriptionInfo.expires_at.slice(0, 10)})
                  </span>
                )}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50">
          {/* Current Quota Mini Summary */}
          {subscriptionInfo && (
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-teal-50 text-[#008689] flex items-center justify-center font-bold text-xs">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800">Hạn mức hiện tại trong tháng:</div>
                  <div className="text-[11px] text-slate-500">
                    Đã sinh {subscriptionInfo.quotas.questions_used_month}/
                    {subscriptionInfo.quotas.max_questions_month >= 99999
                      ? 'Vô hạn'
                      : subscriptionInfo.quotas.max_questions_month}{' '}
                    câu hỏi • {subscriptionInfo.quotas.documents_used}/
                    {subscriptionInfo.quotas.max_documents >= 99999
                      ? 'Vô hạn'
                      : subscriptionInfo.quotas.max_documents}{' '}
                    tài liệu
                  </div>
                </div>
              </div>
              <div className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-100 text-slate-700">
                Gói {subscriptionInfo.plan_code}
              </div>
            </div>
          )}

          {/* Pricing Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {plans.map((p) => {
              const isCurrent = currentPlanCode === p.code;
              const isPro = p.code === 'PRO_MONTH' || p.code === 'PRO_YEAR';

              return (
                <div
                  key={p.id}
                  className={`relative rounded-3xl p-6 transition-all flex flex-col justify-between ${
                    p.is_popular
                      ? 'bg-white border-2 border-[#008689] shadow-lg ring-4 ring-[#008689]/10'
                      : 'bg-white border border-slate-200 shadow-2xs hover:border-slate-300'
                  }`}
                >
                  {p.is_popular && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 bg-[#008689] text-white text-[11px] font-extrabold uppercase tracking-wider rounded-full shadow-xs flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-300" />
                      Được Đề Xuất
                    </div>
                  )}

                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-slate-900 text-base">{p.name}</h3>
                        {isCurrent && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Đang dùng
                          </span>
                        )}
                      </div>
                      <div className="mt-3 flex items-baseline gap-1">
                        <span className="text-2xl font-black text-slate-900">
                          {p.price_vnd === 0 ? 'Miễn Phí' : `${(p.price_vnd).toLocaleString('vi-VN')}đ`}
                        </span>
                        {p.duration_days > 0 && (
                          <span className="text-xs text-slate-500 font-medium">
                            /{p.duration_days === 365 ? 'năm' : 'tháng'}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="border-t border-slate-100 pt-4 space-y-2.5">
                      {p.features.map((f, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs text-slate-600">
                          <Check className="w-3.5 h-3.5 text-[#008689] shrink-0 mt-0.5" />
                          <span className="leading-tight">{f}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-6 mt-4 border-t border-slate-100">
                    <button
                      onClick={() => handleBuyPlan(p)}
                      disabled={isCurrent || isCreatingOrder}
                      className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                        isCurrent
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          : p.is_popular
                          ? 'bg-[#008689] hover:bg-[#006e71] text-white shadow-xs'
                          : 'bg-slate-900 hover:bg-slate-800 text-white'
                      }`}
                    >
                      {isCurrent ? (
                        'Gói Đang Hoạt Động'
                      ) : p.price_vnd === 0 ? (
                        'Chọn Gói Này'
                      ) : (
                        <>
                          <span>Nâng Cấp Ngay</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Security & Support Guarantee */}
          <div className="p-4 rounded-2xl bg-slate-100 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Thanh toán chuẩn VietQR 24/7 bảo mật tự động, kích hoạt tức thì sau 3 giây.</span>
            </div>
            <div className="text-[11px] text-slate-500 font-mono">Hỗ trợ: quizgen.ai.team@gmail.com</div>
          </div>
        </div>
      </div>
    </div>
  );
};
