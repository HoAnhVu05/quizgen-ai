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
  AlertCircle,
  Flame,
  CheckCircle2,
  Lock,
  Cpu,
  Download,
  BookOpen,
  Headphones
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
  const [selectedPlanCode, setSelectedPlanCode] = useState<string>('PRO_YEAR');

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
        const rawPlans: SubscriptionPlan[] = data.plans || [];
        // Ưu tiên hiển thị: Free, Pro Tháng, Pro Năm
        setPlans(rawPlans.filter((p) => p.code !== 'ENTERPRISE'));
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
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Không thể tạo đơn hàng thanh toán.');
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
  const isUserPro = currentPlanCode === 'PRO_MONTH' || currentPlanCode === 'PRO_YEAR';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-5xl w-full max-h-[94vh] overflow-hidden shadow-2xl border border-slate-200/80 flex flex-col animate-in zoom-in-95 duration-200">
        
        {/* ===== 1. Premium Hero Header ===== */}
        <div className="relative px-6 py-6 bg-gradient-to-r from-slate-950 via-slate-900 to-[#005a5d] text-white shrink-0 overflow-hidden border-b border-white/10">
          {/* Subtle Ambient Glowing Orbs */}
          <div className="absolute top-0 right-1/4 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-10 left-10 w-60 h-60 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 flex items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-gradient-to-r from-amber-400/20 to-teal-400/20 text-amber-300 border border-amber-300/30 shadow-xs">
                  <Crown className="w-3.5 h-3.5 text-amber-400" />
                  Nâng Cấp Bản Quyền Giảng Viên
                </span>
                {isUserPro && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    <CheckCircle2 className="w-3 h-3" /> Đã Kích Hoạt PRO
                  </span>
                )}
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                Mở Khóa Toàn Bộ Sức Mạnh QuizGen AI
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
                Lưu trữ giáo trình không giới hạn, sinh câu hỏi chuẩn kiểm định 6 bậc Bloom và xuất trực tiếp Canvas LMS / Word chuẩn đề thi.
              </p>
            </div>

            <button
              onClick={onClose}
              className="p-2.5 rounded-2xl text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-all shrink-0 cursor-pointer"
              title="Đóng (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ===== 2. Content Body ===== */}
        <div className="p-5 sm:p-7 overflow-y-auto space-y-6 flex-1 bg-[#f8fafc]">
          
          {/* Current Quota Mini Status */}
          {subscriptionInfo && (
            <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                  isUserPro ? 'bg-amber-50 text-amber-600 border border-amber-200' : 'bg-teal-50 text-[#008689] border border-teal-200'
                }`}>
                  {isUserPro ? <Crown className="w-5 h-5" /> : <Zap className="w-5 h-5" />}
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800 flex items-center gap-2">
                    <span>Gói hiện tại:</span>
                    <span className="font-extrabold text-[#008689]">{subscriptionInfo.plan_name}</span>
                    {subscriptionInfo.expires_at && (
                      <span className="text-[11px] font-normal text-slate-500">
                        (Hạn dùng: {subscriptionInfo.expires_at.slice(0, 10)})
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Hạn mức đã dùng:{' '}
                    <strong className="text-slate-700">
                      {subscriptionInfo.quotas.documents_used} / {subscriptionInfo.quotas.max_documents >= 99999 ? 'Không giới hạn' : `${subscriptionInfo.quotas.max_documents} tài liệu`}
                    </strong>
                    {' • '}
                    <strong className="text-slate-700">
                      {subscriptionInfo.quotas.questions_used_month} / {subscriptionInfo.quotas.max_questions_month >= 99999 ? 'Không giới hạn' : `${subscriptionInfo.quotas.max_questions_month} câu/tháng`}
                    </strong>
                  </div>
                </div>
              </div>

              <div className="text-[11px] font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                Mã tài khoản: {currentUser?.id || 'Lecturer'}
              </div>
            </div>
          )}

          {/* Pricing Tier Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {plans.map((p) => {
              const isCurrent = currentPlanCode === p.code;
              const isHeroPlan = p.code === 'PRO_YEAR';
              const isProMonth = p.code === 'PRO_MONTH';
              const isFree = p.code === 'FREE';

              return (
                <div
                  key={p.id}
                  className={`relative rounded-3xl p-6 transition-all duration-300 flex flex-col justify-between ${
                    isHeroPlan
                      ? 'bg-gradient-to-b from-amber-500/[0.04] via-white to-teal-500/[0.04] border-2 border-amber-400 shadow-xl shadow-amber-500/10 ring-4 ring-amber-400/15 scale-[1.02]'
                      : isProMonth
                      ? 'bg-white border-2 border-teal-500/60 shadow-md hover:shadow-lg hover:border-[#008689]'
                      : 'bg-white border border-slate-200 shadow-2xs hover:border-slate-300'
                  }`}
                >
                  {/* Top Floating Badge */}
                  {isHeroPlan && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-amber-500 to-amber-600 text-white text-[11px] font-black uppercase tracking-wider rounded-full shadow-md flex items-center gap-1.5 shrink-0 whitespace-nowrap">
                      <Flame className="w-3.5 h-3.5 text-yellow-200 fill-yellow-200" />
                      <span>Tiết kiệm 80% • Khuyên Dùng</span>
                    </div>
                  )}

                  {isProMonth && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-[#008689] text-white text-[10px] font-bold uppercase tracking-wider rounded-full shadow-xs">
                      Linh Hoạt Từng Tháng
                    </div>
                  )}

                  <div className="space-y-4">
                    {/* Header of Card */}
                    <div className="pt-1">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className={`text-[11px] font-black uppercase tracking-wider ${
                          isHeroPlan ? 'text-amber-700' : isProMonth ? 'text-[#008689]' : 'text-slate-500'
                        }`}>
                          {isFree ? 'Trải Nghiệm' : isProMonth ? 'Gói Tháng' : 'Gói 1 Năm VIP'}
                        </span>
                        {isCurrent && (
                          <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                            Đang Hoạt Động
                          </span>
                        )}
                      </div>

                      <h3 className="font-extrabold text-slate-900 text-lg">{p.name}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {isFree
                          ? 'Dành cho giảng viên muốn thử nghiệm tính năng cơ bản.'
                          : isProMonth
                          ? 'Mở khóa toàn bộ tính năng theo từng tháng.'
                          : 'Tối ưu nhất cho cả năm học, sinh đề không giới hạn.'}
                      </p>

                      {/* Pricing Tag */}
                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-baseline gap-1.5">
                        <span className={`text-3xl font-black tracking-tight ${
                          isHeroPlan ? 'text-amber-600' : isProMonth ? 'text-[#008689]' : 'text-slate-900'
                        }`}>
                          {p.price_vnd === 0 ? '0đ' : `${p.price_vnd.toLocaleString('vi-VN')}đ`}
                        </span>
                        {p.duration_days > 0 ? (
                          <span className="text-xs text-slate-500 font-semibold">
                            / {p.duration_days === 365 ? 'năm (chỉ ~416đ/tháng)' : 'tháng'}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 font-medium">/ vĩnh viễn</span>
                        )}
                      </div>
                    </div>

                    {/* Features List */}
                    <div className="border-t border-slate-100 pt-4 space-y-2.5">
                      <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                        Đặc quyền gói cước:
                      </div>

                      {p.features.map((featureText, idx) => (
                        <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-700 leading-snug">
                          <div className={`mt-0.5 w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                            isHeroPlan
                              ? 'bg-amber-100 text-amber-700'
                              : isProMonth
                              ? 'bg-teal-100 text-[#008689]'
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </div>
                          <span className={idx < 2 ? 'font-semibold text-slate-900' : ''}>
                            {featureText}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* CTA Button */}
                  <div className="pt-6 mt-6 border-t border-slate-100">
                    <button
                      onClick={() => handleBuyPlan(p)}
                      disabled={isCurrent || isCreatingOrder}
                      className={`w-full py-3 px-4 rounded-xl text-xs font-bold transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${
                        isCurrent
                          ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                          : isHeroPlan
                          ? 'bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:from-amber-600 hover:to-amber-800 text-white shadow-md shadow-amber-500/25 hover:scale-[1.01]'
                          : isProMonth
                          ? 'bg-[#008689] hover:bg-[#006e71] text-white shadow-sm hover:scale-[1.01]'
                          : 'bg-slate-800 hover:bg-slate-900 text-white'
                      }`}
                    >
                      {isCurrent ? (
                        <span>✓ Bạn Đang Dùng Gói Này</span>
                      ) : isFree ? (
                        <span>Gói Mặc Định</span>
                      ) : isHeroPlan ? (
                        <>
                          <Crown className="w-4 h-4 text-amber-200" />
                          <span>Nâng Cấp Trọn Năm (5.000đ)</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      ) : (
                        <>
                          <span>Nâng Cấp 1 Tháng (2.000đ)</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ===== 3. Feature Highlights Comparison Strip ===== */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs space-y-3">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
              Tại sao nên nâng cấp Gói PRO Giảng Viên?
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="w-8 h-8 rounded-lg bg-teal-100 text-[#008689] flex items-center justify-center shrink-0">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800">Không Giới Hạn Tệp</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Nạp hàng chục giáo trình PDF/DOCX phục vụ nghiên cứu & giảng dạy.</div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <Cpu className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800">Chuẩn 6 Mức Bloom</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Sinh câu hỏi từ Nhận biết đến Đánh giá & Sáng tạo chuẩn kiểm định ABET.</div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                  <Download className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800">Xuất Đề Đa Định Dạng</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Xuất file Word đề & đáp án, gói QTI nạp trực tiếp Canvas, Moodle LMS.</div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800">Ưu Tiên Băng Thông</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Thời gian sinh đề & bóc tách tài liệu dưới 15 giây, không chờ đợi.</div>
                </div>
              </div>
            </div>
          </div>

          {/* ===== 4. Trust & Security Guarantee Footer ===== */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 text-white flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-emerald-300">Thanh toán chuẩn VietQR NAPAS 24/7 an toàn tuyệt đối.</span>
                <span className="text-slate-300 block text-[11px]">
                  Tự động quét biến động số dư TPBank và mở khóa gói cước tức thì sau 2 giây.
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-300 shrink-0">
              <Headphones className="w-3.5 h-3.5 text-teal-400" />
              <span>Hỗ trợ kỹ thuật: <strong>quizgen.ai.team@gmail.com</strong></span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
