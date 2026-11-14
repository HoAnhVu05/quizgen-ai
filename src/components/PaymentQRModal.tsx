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
  Crown,
  Building2,
  CheckCircle2,
  Zap,
  ArrowRight,
  Smartphone,
  CheckCheck
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
      <div className="bg-white rounded-3xl max-w-4xl w-full overflow-hidden shadow-2xl border border-slate-200/90 flex flex-col max-h-[96vh] animate-in zoom-in-95 duration-200">
        
        {/* ===== 1. COMPACT SLIM WAVE CANOPY (Thanh trên cùng thu nhỏ gọn, tinh tế) ===== */}
        <div className="wave-canopy-flow relative text-white px-5 sm:px-6 pt-3.5 pb-7 overflow-visible shadow-xs shrink-0">
          {/* Subtle Ambient Organic Floating Blobs */}
          <div className="fluid-blob-animate absolute top-0 right-1/4 w-64 h-64 bg-white/15 blur-2xl pointer-events-none" />
          
          <div className="relative z-20 flex items-center justify-between gap-3">
            {/* Left: Identity & Order Info */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="w-7 h-7 rounded-lg bg-white/20 text-white flex items-center justify-center border border-white/30 shadow-xs backdrop-blur-xs">
                <QrCode className="w-3.5 h-3.5 text-amber-200" />
              </div>
              <h3 className="font-extrabold text-xs sm:text-sm text-white tracking-tight flex items-center gap-2">
                <span>Thanh Toán VietQR NAPAS 24/7</span>
              </h3>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-white/20 text-amber-200 border border-white/30">
                <Crown className="w-3 h-3 text-amber-300" />
                {order.plan_name}
              </span>
              <span className="text-[11px] font-mono font-medium text-white/80 hidden sm:inline">
                #{order.order_code}
              </span>
            </div>

            {/* Right: Compact Total Amount & Close Button */}
            <div className="flex items-center gap-2.5 shrink-0">
              <div className="bg-white/15 backdrop-blur-xs px-2.5 py-1 rounded-lg border border-white/25 flex items-baseline gap-1 shadow-2xs">
                <span className="text-[10px] text-teal-100 uppercase font-bold">Tổng:</span>
                <span className="text-sm sm:text-base font-black text-white tracking-tight">
                  {order.amount_vnd.toLocaleString('vi-VN')}
                </span>
                <span className="text-[10px] text-amber-200 font-bold">đ</span>
              </div>

              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-white/80 hover:text-white bg-white/10 hover:bg-white/20 border border-white/25 transition-all cursor-pointer shadow-xs"
                title="Đóng (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Minimal Undulating Organic Wave Crest */}
          <div className="absolute -bottom-0.5 left-0 w-full overflow-hidden leading-none pointer-events-none z-10">
            <svg
              className="relative block w-[200%] h-4 sm:h-5"
              viewBox="0 0 1200 60"
              preserveAspectRatio="none"
            >
              <path
                d="M0,0 C150,45 350,-20 500,25 C650,55 900,-15 1200,30 L1200,60 L0,60 Z"
                fill="rgba(6, 182, 212, 0.35)"
                className="wave-animate-back"
              />
              <path
                d="M0,20 C150,50 350,5 600,35 C850,60 1050,15 1200,35 L1200,60 L0,60 Z"
                fill="#f8fafc"
              />
            </svg>
          </div>
        </div>

        {/* ===== 2. MODAL BODY (Ưu tiên mã QR to lên, các mục khác nhỏ gọn) ===== */}
        <div className="overflow-y-auto flex-1 bg-[#f8fafc] p-4 sm:p-5">
          {isSuccess ? (
            /* ===== SUCCESS CELEBRATION VIEW ===== */
            <div className="py-6 sm:py-8 text-center space-y-5 max-w-md mx-auto animate-in zoom-in-95 duration-300">
              <div className="relative mx-auto w-16 h-16">
                <div className="absolute inset-0 rounded-full bg-emerald-400/20 animate-ping" />
                <div className="relative w-16 h-16 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30">
                  <PartyPopper className="w-8 h-8 animate-bounce" />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300">
                  <Crown className="w-3 h-3 text-amber-600" />
                  Đã Kích Hoạt Bản Quyền Thành Công
                </div>
                <h4 className="text-xl font-black text-slate-900 tracking-tight">
                  Chúc Mừng Giảng Viên!
                </h4>
                <p className="text-xs text-slate-600 max-w-xs mx-auto">
                  Gói cước <strong className="text-[#008689]">{order.plan_name}</strong> đã được mở khóa ngay lập tức trên tài khoản của bạn.
                </p>
              </div>

              {/* Transaction Receipt Card */}
              <div className="bg-white border border-slate-200/90 rounded-2xl p-4 text-left text-xs space-y-2 shadow-2xs">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Mã đơn hàng:</span>
                  <span className="font-mono font-bold text-slate-900">#{order.order_code}</span>
                </div>
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Số tiền:</span>
                  <span className="font-extrabold text-emerald-600">{order.amount_vnd.toLocaleString('vi-VN')} VNĐ</span>
                </div>
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Hình thức:</span>
                  <span className="font-semibold text-slate-800">VietQR Napas 24/7 (TPBank)</span>
                </div>
                <div className="flex items-center gap-1.5 pt-1 text-[11px] text-emerald-700 bg-emerald-50 p-2 rounded-xl border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Hóa đơn điện tử đã được gửi tới email của bạn.</span>
                </div>
              </div>

              <button
                onClick={() => {
                  onSuccess();
                  onClose();
                }}
                className="w-full py-3 px-5 bg-gradient-to-r from-[#008689] to-teal-700 hover:from-[#007073] hover:to-teal-800 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Bắt Đầu Nạp Giáo Trình & Sinh Đề Thi Ngay</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            /* ===== 2-COLUMN BALANCED CHECKOUT VIEW ===== */
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
              
              {/* --- LEFT COLUMN: MÃ QR ĐƯỢC ƯU TIÊN TO LÊN RÕ RÀNG (6 cols) --- */}
              <div className="md:col-span-6 bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs space-y-3 flex flex-col items-center">
                
                {/* Timer Header */}
                <div className="w-full flex items-center justify-between px-3 py-1 rounded-xl bg-slate-50 border border-slate-200/70 text-xs">
                  <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-amber-500" /> Hết hạn sau:
                  </span>
                  <span className={`font-mono font-black ${timeLeft < 180 ? 'text-rose-600 animate-pulse' : 'text-slate-800'}`}>
                    {formattedTime}
                  </span>
                </div>

                {/* Big Hero VietQR Frame */}
                <div className="relative p-3 bg-white rounded-2xl border-2 border-slate-200/90 shadow-sm">
                  {/* Glowing Corner Accents */}
                  <div className="absolute top-2 left-2 w-5 h-5 border-t-2 border-l-2 border-[#008689] rounded-tl-md" />
                  <div className="absolute top-2 right-2 w-5 h-5 border-t-2 border-r-2 border-[#008689] rounded-tr-md" />
                  <div className="absolute bottom-2 left-2 w-5 h-5 border-b-2 border-l-2 border-[#008689] rounded-bl-md" />
                  <div className="absolute bottom-2 right-2 w-5 h-5 border-b-2 border-r-2 border-[#008689] rounded-br-md" />

                  {/* QR Image: To lên rõ ràng, scan cực nhạy */}
                  <img
                    src={order.qr_url}
                    alt={`VietQR ${order.order_code}`}
                    className="w-60 sm:w-68 md:w-72 h-auto rounded-lg mx-auto transition-transform hover:scale-[1.01]"
                  />
                </div>

                {/* Pulsing Radar Status Badge */}
                <div className="flex items-center gap-2 text-[11px] text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 font-bold shadow-2xs text-center">
                  <span className="relative flex h-2 w-2 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                  <span>Đang tự động quét biến động số dư TPBank...</span>
                </div>

                <div className="text-[10px] text-slate-400 text-center flex items-center justify-center gap-1">
                  <Smartphone className="w-3 h-3 text-teal-600 shrink-0" />
                  <span>Quét bằng app ngân hàng bất kỳ (TPBank, VCB, MB, Techcombank, Momo...)</span>
                </div>
              </div>

              {/* --- RIGHT COLUMN: CÁC MỤC THÔNG TIN NHỎ GỌN LẠI (6 cols) --- */}
              <div className="md:col-span-6 bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs space-y-3">
                
                {/* Bank Header Strip */}
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-3.5 h-3.5 text-[#008689]" />
                    <span className="text-xs font-bold text-slate-800">Ngân hàng TPBank</span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-teal-50 text-[#008689] border border-teal-200">
                    Napas 247
                  </span>
                </div>

                {/* Compact Bank Fields */}
                <div className="space-y-2 text-xs">
                  {/* Account No */}
                  <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200/70">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Số tài khoản:</span>
                      <span className="font-mono font-black text-slate-900 text-sm tracking-wider">
                        {order.bank_info.account_no}
                      </span>
                    </div>
                    <button
                      onClick={() => copyToClipboard(order.bank_info.account_no, 'Số tài khoản')}
                      className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700 font-bold text-[11px] transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
                    >
                      {copiedField === 'Số tài khoản' ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600 stroke-[3]" />
                          <span className="text-emerald-600">Đã chép</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 text-slate-400" />
                          <span>Chép</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Account Name */}
                  <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200/70">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Chủ tài khoản:</span>
                      <span className="font-extrabold text-slate-800 uppercase tracking-wide text-xs">
                        {order.bank_info.account_name}
                      </span>
                    </div>
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Chính chủ
                    </span>
                  </div>

                  {/* Amount */}
                  <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200/70">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Số tiền chính xác:</span>
                      <span className="font-black text-[#da1c2d] text-sm">
                        {order.amount_vnd.toLocaleString('vi-VN')} VNĐ
                      </span>
                    </div>
                    <button
                      onClick={() => copyToClipboard(String(order.amount_vnd), 'Số tiền')}
                      className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700 font-bold text-[11px] transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
                    >
                      {copiedField === 'Số tiền' ? (
                        <span className="text-emerald-600 font-bold">Đã chép</span>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 text-slate-400" />
                          <span>Chép</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Transfer Content */}
                  <div className="p-2.5 rounded-xl bg-amber-50/90 border border-amber-300/80 flex items-center justify-between gap-2 shadow-2xs">
                    <div>
                      <span className="text-[10px] text-amber-900 font-extrabold uppercase tracking-wider block">
                        Nội dung chuyển khoản (bắt buộc):
                      </span>
                      <span className="font-mono font-black text-[#da1c2d] text-sm tracking-wider">
                        {order.transfer_content}
                      </span>
                    </div>
                    <button
                      onClick={() => copyToClipboard(order.transfer_content, 'Nội dung chuyển khoản')}
                      className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-extrabold rounded-lg text-[11px] shadow-2xs transition-all shrink-0 flex items-center gap-1 cursor-pointer"
                    >
                      {copiedField === 'Nội dung chuyển khoản' ? (
                        <>
                          <Check className="w-3 h-3 stroke-[3]" />
                          <span>Đã chép</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Sao chép</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Primary Action Button */}
                <div className="pt-1.5 space-y-1.5">
                  <button
                    onClick={handleManualConfirm}
                    disabled={isConfirmingManual}
                    className="w-full py-2.5 px-3 bg-gradient-to-r from-[#008689] to-teal-700 hover:from-[#007073] hover:to-teal-800 text-white font-extrabold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isConfirmingManual ? 'animate-spin' : ''}`} />
                    <span>
                      {isConfirmingManual ? 'Đang nhận diện biến động số dư...' : 'Tôi Đã Chuyển Khoản — Nhận Diện Ngay'}
                    </span>
                  </button>

                  <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-400 text-center">
                    <ShieldCheck className="w-3 h-3 text-emerald-500" />
                    <span>Tự động quét TPBank 2.0s • Kích hoạt tức thì</span>
                  </div>
                </div>

              </div>

            </div>
          )}
        </div>

      </div>
    </div>
  );
};
