import React, { useState, useEffect } from 'react';
import {
  X,
  Copy,
  Check,
  Clock,
  QrCode,
  ShieldCheck,
  RefreshCw,
  Sparkles,
  PartyPopper,
  AlertCircle,
  Crown,
  CreditCard,
  Building2,
  CheckCircle2,
  Zap,
  Info,
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import { OrderData } from '../types';
import { apiClient, API_BASE } from '../services/apiClient';

interface PaymentQRModalProps {
  order: OrderData | null;
  onClose: () => void;
  onSuccess: () => void;
  onShowToast: (type: 'success' | 'info' | 'warning' | 'error', title: string, message: string) => void;
}

export const PaymentQRModal: React.FC<PaymentQRModalProps> = ({
  order,
  onClose,
  onSuccess,
  onShowToast
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(order?.countdown_seconds || 900);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [isConfirmingManual, setIsConfirmingManual] = useState<boolean>(false);

  // Countdown Timer
  useEffect(() => {
    if (!order || isSuccess) return;

    setTimeLeft(order.countdown_seconds || 900);
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [order, isSuccess]);

  // Smart Polling status every 2 seconds for real-time TPBank transaction detection
  useEffect(() => {
    if (!order || isSuccess) return;

    const pollInterval = setInterval(async () => {
      try {
        const res = await apiClient.fetch(`${API_BASE}/payment/orders/${order.order_id}/status`);
        if (res.ok) {
          const data = await res.json();
          if (data.status === 'COMPLETED') {
            setIsSuccess(true);
            clearInterval(pollInterval);
            onShowToast('success', 'Nhận diện tiền về thành công!', `Đã kích hoạt ${order.plan_name}.`);
          }
        }
      } catch (err) {
        // Silent poll error
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [order, isSuccess]);

  if (!order) return null;

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    onShowToast('info', 'Đã sao chép', `Đã sao chép ${fieldName} vào bộ nhớ tạm.`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleManualConfirm = async () => {
    setIsConfirmingManual(true);
    try {
      const res = await apiClient.fetch(`${API_BASE}/payment/orders/${order.order_id}/auto-detect`, {
        method: 'POST'
      });
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'COMPLETED') {
          setIsSuccess(true);
          onShowToast('success', 'Kích hoạt thành công', `Chúc mừng! Bạn đã nâng cấp thành công ${order.plan_name}.`);
          return;
        }
      }

      // Fallback gọi confirm chuẩn
      const confirmRes = await apiClient.fetch(`${API_BASE}/payment/orders/${order.order_id}/confirm`, {
        method: 'POST'
      });
      if (confirmRes.ok) {
        setIsSuccess(true);
        onShowToast('success', 'Kích hoạt thành công', `Chúc mừng! Bạn đã nâng cấp thành công ${order.plan_name}.`);
      } else {
        const err = await confirmRes.json().catch(() => ({}));
        throw new Error(err.detail || 'Chưa nhận diện được số dư. Vui lòng thử lại sau 3-5 giây.');
      }
    } catch (err: any) {
      onShowToast('warning', 'Đang xác thực', 'Hệ thống đang quét biến động số dư TPBank. Vui lòng đợi trong giây lát hoặc thử lại.');
    } finally {
      setIsConfirmingManual(false);
    }
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-4xl w-full overflow-hidden shadow-2xl border border-slate-200/80 flex flex-col max-h-[95vh] animate-in zoom-in-95 duration-200">
        
        {/* Modal Top Bar with Fluid Waving Gradient */}
        <div className="wave-gradient-flow relative px-6 pt-5 pb-9 text-white flex items-center justify-between shrink-0 shadow-md overflow-hidden">
          {/* Subtle Ambient Glowing Orbs */}
          <div className="fluid-blob-animate absolute top-0 right-1/4 w-72 h-72 bg-white/15 rounded-full blur-2xl pointer-events-none" />
          
          <div className="relative z-20 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/20 text-white flex items-center justify-center border border-white/30 shadow-xs">
              <QrCode className="w-4 h-4 text-amber-200" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                Cổng Thanh Toán VietQR Chuẩn NAPAS 24/7
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-white/20 text-white border border-white/30 shadow-2xs">
                  Tự Động 100%
                </span>
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="relative z-20 p-1.5 rounded-xl text-white/80 hover:text-white bg-white/10 hover:bg-white/20 border border-white/20 transition-colors cursor-pointer"
            title="Đóng (Esc)"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Undulating Wave Crest spilling down */}
          <div className="absolute -bottom-1 left-0 w-full overflow-hidden leading-none pointer-events-none z-10">
            <svg
              className="relative block w-[200%] h-6 sm:h-7"
              viewBox="0 0 1200 120"
              preserveAspectRatio="none"
            >
              <path
                d="M0,0 C150,90 350,-40 500,45 C650,110 900,-30 1200,60 L1200,120 L0,120 Z"
                fill="rgba(6, 182, 212, 0.4)"
                className="wave-animate-back"
              />
              <path
                d="M0,45 C150,110 350,15 600,80 C850,135 1050,35 1200,75 L1200,120 L0,120 Z"
                fill="#f8fafc"
              />
            </svg>
          </div>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto flex-1 bg-slate-50">
          {isSuccess ? (
            /* ===== SUCCESS CELEBRATION VIEW ===== */
            <div className="p-8 sm:p-12 text-center space-y-6 max-w-lg mx-auto animate-in zoom-in-95 duration-300">
              <div className="relative mx-auto w-20 h-20">
                <div className="absolute inset-0 rounded-full bg-emerald-400/20 animate-ping" />
                <div className="relative w-20 h-20 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30">
                  <PartyPopper className="w-10 h-10 animate-bounce" />
                </div>
              </div>

              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300">
                  <Crown className="w-3.5 h-3.5 text-amber-600" />
                  Đã Kích Hoạt Bản Quyền Thành Công
                </div>
                <h4 className="text-2xl font-black text-slate-900 tracking-tight">
                  Chúc Mừng Giảng Viên!
                </h4>
                <p className="text-xs sm:text-sm text-slate-600 max-w-sm mx-auto">
                  Gói cước <strong className="text-[#008689]">{order.plan_name}</strong> đã được mở khóa ngay lập tức trên tài khoản của bạn.
                </p>
              </div>

              {/* Transaction Receipt Card */}
              <div className="bg-white border border-slate-200/90 rounded-2xl p-5 text-left text-xs space-y-2.5 shadow-2xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <span className="text-slate-500">Mã đơn hàng:</span>
                  <span className="font-mono font-bold text-slate-900">#{order.order_code}</span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <span className="text-slate-500">Số tiền thanh toán:</span>
                  <span className="font-extrabold text-emerald-600 text-sm">{order.amount_vnd.toLocaleString('vi-VN')} VNĐ</span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <span className="text-slate-500">Hình thức:</span>
                  <span className="font-semibold text-slate-800">VietQR Napas 24/7 (TPBank)</span>
                </div>
                <div className="flex items-center gap-2 pt-1 text-[11px] text-emerald-700 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Hóa đơn điện tử và hướng dẫn tính năng đã được gửi tới email của bạn.</span>
                </div>
              </div>

              <button
                onClick={() => {
                  onSuccess();
                  onClose();
                }}
                className="w-full py-3.5 px-6 bg-gradient-to-r from-[#008689] to-teal-700 hover:from-[#007073] hover:to-teal-800 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Bắt Đầu Nạp Giáo Trình & Sinh Đề Thi Ngay</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            /* ===== DUAL-PANEL FINTECH CHECKOUT VIEW ===== */
            <div className="grid grid-cols-1 md:grid-cols-12 min-h-[500px]">
              
              {/* --- LEFT PANEL: Waving Liquid Ocean Column overflowing into Right Panel (40%) --- */}
              <div className="wave-panel-flow relative md:col-span-5 text-white p-6 sm:p-7 flex flex-col justify-between overflow-hidden shadow-xl">
                {/* Organic Liquid Drifting Blobs inside */}
                <div className="fluid-blob-animate absolute top-0 right-0 w-72 h-72 bg-white/15 blur-3xl pointer-events-none" />
                <div className="fluid-blob-animate absolute bottom-0 left-0 w-64 h-64 bg-cyan-400/20 blur-2xl pointer-events-none" style={{ animationDelay: '-4s' }} />

                <div className="relative z-20 space-y-6">
                  {/* Order Tag */}
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-teal-100/90 block mb-1">
                      Đơn hàng thanh toán
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-black text-white font-mono">#{order.order_code}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white/20 text-amber-200 border border-white/30 shadow-xs">
                        Chờ Chuyển Khoản
                      </span>
                    </div>
                  </div>

                  {/* Plan Card Spotlight */}
                  <div className="p-4 rounded-2xl bg-white/15 backdrop-blur-xs border border-white/25 space-y-2 shadow-xs">
                    <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                      <Crown className="w-4 h-4 text-amber-300" />
                      <span>{order.plan_name}</span>
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-2xl sm:text-3xl font-black text-white">
                        {order.amount_vnd.toLocaleString('vi-VN')}
                      </span>
                      <span className="text-xs text-white/80 font-bold">VNĐ</span>
                    </div>
                    <p className="text-[11px] text-white/85 leading-relaxed">
                      Áp dụng ưu đãi hỗ trợ giảng viên kiểm thử hệ thống trực tiếp bằng tiền thật.
                    </p>
                  </div>

                  {/* Instant Benefits List */}
                  <div className="space-y-2.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-teal-100/90 block">
                      Đặc quyền mở khóa ngay:
                    </span>
                    <div className="space-y-2.5 text-xs text-white/95">
                      <div className="flex items-start gap-2">
                        <div className="w-4 h-4 rounded-full bg-white/25 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                          <Check className="w-2.5 h-2.5 text-emerald-200 stroke-[3]" />
                        </div>
                        <span><strong>Không giới hạn tài liệu</strong> nạp vào Vector Store.</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="w-4 h-4 rounded-full bg-white/25 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                          <Check className="w-2.5 h-2.5 text-emerald-200 stroke-[3]" />
                        </div>
                        <span><strong>Sinh 6 mức độ Bloom</strong> chuẩn kiểm định giáo dục.</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="w-4 h-4 rounded-full bg-white/25 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                          <Check className="w-2.5 h-2.5 text-emerald-200 stroke-[3]" />
                        </div>
                        <span><strong>Xuất gói QTI Canvas LMS</strong> và file Word kèm ma trận.</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="w-4 h-4 rounded-full bg-white/25 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                          <Check className="w-2.5 h-2.5 text-emerald-200 stroke-[3]" />
                        </div>
                        <span><strong>Tốc độ xử lý ưu tiên</strong> GPU Cloud dưới 15 giây.</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Left Footer Security */}
                <div className="relative z-20 pt-6 border-t border-white/20 flex items-center gap-2.5 text-[11px] text-white/85">
                  <ShieldCheck className="w-4 h-4 text-emerald-300 shrink-0" />
                  <span>Mỗi mã QR gắn liền duy nhất với 01 đơn hàng để tự động hóa tuyệt đối.</span>
                </div>

                {/* Undulating Vertical Wave Spilling into the Right Panel */}
                <div className="hidden md:block absolute -right-5 top-0 bottom-0 w-8 overflow-hidden pointer-events-none z-10">
                  <svg
                    className="h-[200%] w-full"
                    viewBox="0 0 100 1200"
                    preserveAspectRatio="none"
                  >
                    {/* Back wave layer */}
                    <path
                      d="M0,0 C60,150 -30,350 40,550 C90,750 -20,950 50,1150 C90,1350 -10,1550 40,1750 C80,1950 -20,2150 30,2350 L0,2400 Z"
                      fill="rgba(6, 182, 212, 0.4)"
                      className="wave-animate-vertical-back"
                    />
                    {/* Front wave blending into right side */}
                    <path
                      d="M0,0 C40,200 -20,400 50,650 C100,850 -10,1050 40,1300 C80,1500 -20,1700 50,1950 C90,2150 -10,2350 40,2400 L0,2400 Z"
                      fill="#ffffff"
                    />
                  </svg>
                </div>
              </div>

              {/* --- RIGHT PANEL: VietQR Scanner & Live Bank Details (60%) --- */}
              <div className="md:col-span-7 p-6 sm:p-7 space-y-5 flex flex-col justify-between bg-white">
                
                {/* Top Timer Bar */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200/90 text-xs shadow-2xs">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Building2 className="w-4 h-4 text-[#008689]" />
                    <span className="font-bold text-slate-800">TPBank (Tiên Phong Bank)</span>
                  </div>

                  <div className="flex items-center gap-1.5 font-mono">
                    <Clock className="w-3.5 h-3.5 text-amber-500" />
                    <span className="text-[11px] text-slate-500">Hết hạn:</span>
                    <span className={`font-black ${timeLeft < 180 ? 'text-rose-600 animate-pulse' : 'text-slate-900'}`}>
                      {formattedTime}
                    </span>
                  </div>
                </div>

                {/* QR Code Interactive Box */}
                <div className="flex flex-col items-center justify-center space-y-3 py-1">
                  <div className="relative p-3 bg-white rounded-3xl border-2 border-slate-200/80 shadow-md group">
                    {/* Scanner Decorative Corner Brackets */}
                    <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-[#008689] rounded-tl" />
                    <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-[#008689] rounded-tr" />
                    <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-[#008689] rounded-bl" />
                    <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-[#008689] rounded-br" />

                    <img
                      src={order.qr_url}
                      alt={`VietQR ${order.order_code}`}
                      className="w-48 sm:w-56 h-auto rounded-xl mx-auto"
                    />
                  </div>

                  {/* Pulsing Live Radar Indicator */}
                  <div className="flex items-center gap-2 text-[11px] text-emerald-800 bg-emerald-50 px-3.5 py-1.5 rounded-full border border-emerald-200 font-bold shadow-2xs">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                    </span>
                    <span>Đang tự động quét biến động số dư TPBank ({order.bank_info.account_no})...</span>
                  </div>
                </div>

                {/* Bank Information Details Card */}
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/90 shadow-2xs space-y-2.5 text-xs">
                  {/* Account Number */}
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Số tài khoản:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-slate-900 text-sm tracking-wider">
                        {order.bank_info.account_no}
                      </span>
                      <button
                        onClick={() => copyToClipboard(order.bank_info.account_no, 'Số tài khoản')}
                        className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-600 font-bold text-[11px] transition-colors flex items-center gap-1 cursor-pointer"
                        title="Sao chép số tài khoản"
                      >
                        {copiedField === 'Số tài khoản' ? (
                          <span className="text-emerald-600 font-bold">Đã chép</span>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Chép</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Account Name */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                    <span className="text-slate-500">Chủ tài khoản:</span>
                    <span className="font-extrabold text-slate-800 uppercase tracking-wide">
                      {order.bank_info.account_name}
                    </span>
                  </div>

                  {/* Amount */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                    <span className="text-slate-500">Số tiền chuyển:</span>
                    <span className="font-black text-[#da1c2d] text-sm">
                      {order.amount_vnd.toLocaleString('vi-VN')} VNĐ
                    </span>
                  </div>

                  {/* Crucial: Transfer Content with Copy */}
                  <div className="pt-2 border-t border-slate-200/80 bg-amber-50/80 -mx-4 -mb-4 p-3 rounded-b-2xl border-amber-200 flex items-center justify-between gap-2">
                    <div>
                      <span className="text-amber-900 font-bold block text-[10px] uppercase tracking-wider">
                        Nội dung chuyển khoản (Bắt buộc giữ nguyên):
                      </span>
                      <span className="font-mono font-black text-[#da1c2d] text-sm tracking-wider">
                        {order.transfer_content}
                      </span>
                    </div>

                    <button
                      onClick={() => copyToClipboard(order.transfer_content, 'Nội dung chuyển khoản')}
                      className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-extrabold rounded-xl text-[11px] shadow-2xs transition-all shrink-0 flex items-center gap-1.5 cursor-pointer"
                    >
                      {copiedField === 'Nội dung chuyển khoản' ? (
                        <>
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                          <span>Đã chép</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Sao chép</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Primary Action Button */}
                <div className="space-y-2 pt-1">
                  <button
                    onClick={handleManualConfirm}
                    disabled={isConfirmingManual}
                    className="w-full py-3 px-4 bg-gradient-to-r from-[#008689] to-teal-700 hover:from-[#007073] hover:to-teal-800 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isConfirmingManual ? 'animate-spin' : ''}`} />
                    <span>
                      {isConfirmingManual ? 'Đang nhận diện biến động số dư...' : 'Tôi Đã Chuyển Khoản — Nhận Diện & Kích Hoạt Ngay'}
                    </span>
                  </button>
                  <p className="text-[10px] text-center text-slate-400">
                    Hệ thống Polling tự động quét tài khoản TPBank mỗi 2.0 giây. Ngay khi tiền vào, gói cước sẽ tự động kích hoạt.
                  </p>
                </div>

              </div>

            </div>
          )}
        </div>

      </div>
    </div>
  );
};
