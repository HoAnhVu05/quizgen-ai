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
  AlertCircle
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
  const [isChecking, setIsChecking] = useState<boolean>(false);
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

  // Smart Polling status every 2 seconds for real-time detection
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
    onShowToast('info', 'Đã sao chép', `Đã sao chép ${fieldName} vào clipboard.`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleManualConfirm = async () => {
    setIsConfirmingManual(true);
    try {
      const res = await apiClient.fetch(`${API_BASE}/payment/orders/${order.order_id}/confirm`, {
        method: 'POST'
      });
      if (res.ok) {
        setIsSuccess(true);
        onShowToast('success', 'Kích hoạt thành công', `Chúc mừng! Bạn đã nâng cấp thành công ${order.plan_name}.`);
      } else {
        const err = await res.json();
        throw new Error(err.detail || 'Chưa nhận được giao dịch.');
      }
    } catch (err: any) {
      onShowToast('warning', 'Đang xác thực', 'Hệ thống đang kiểm tra biến động số dư. Vui lòng đợi trong giây lát hoặc thử lại.');
    } finally {
      setIsConfirmingManual(false);
    }
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 flex flex-col max-h-[95vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <QrCode className="w-5 h-5 text-[#008689]" />
            <h3 className="font-bold text-sm">Thanh Toán Quét Mã VietQR (NAPAS 247)</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 bg-slate-50 flex-1">
          {isSuccess ? (
            /* Success Celebration View */
            <div className="py-6 text-center space-y-4 animate-in zoom-in-95 duration-300">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                <PartyPopper className="w-8 h-8 animate-bounce" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xl font-extrabold text-slate-900">Thanh Toán Thành Công!</h4>
                <p className="text-xs text-slate-500">
                  Gói cước <strong className="text-[#008689]">{order.plan_name}</strong> đã được kích hoạt trên tài khoản của bạn.
                </p>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-xs text-emerald-800 text-left space-y-1.5">
                <div className="font-bold flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-600" />
                  Hóa đơn điện tử đã được gửi tới email của bạn.
                </div>
                <p className="text-emerald-700/80">
                  Mã giao dịch: <strong>{order.order_code}</strong> • Số tiền: <strong>{order.amount_vnd.toLocaleString('vi-VN')}đ</strong>
                </p>
              </div>

              <button
                onClick={() => {
                  onSuccess();
                  onClose();
                }}
                className="w-full py-3 px-4 bg-[#008689] hover:bg-[#006e71] text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
              >
                Bắt Đầu Trải Nghiệm Tính Năng
              </button>
            </div>
          ) : (
            /* QR Payment View */
            <>
              {/* Order Info & Countdown */}
              <div className="flex items-center justify-between p-3 bg-white rounded-2xl border border-slate-200 text-xs shadow-2xs">
                <div>
                  <span className="text-slate-400 block text-[10px]">Đơn hàng:</span>
                  <span className="font-mono font-bold text-slate-800">#{order.order_code}</span>
                </div>
                <div className="text-center">
                  <span className="text-slate-400 block text-[10px]">Số tiền:</span>
                  <span className="font-extrabold text-[#da1c2d] text-sm">
                    {order.amount_vnd.toLocaleString('vi-VN')}đ
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[10px] flex items-center gap-1 justify-end">
                    <Clock className="w-3 h-3 text-amber-500" /> Còn lại:
                  </span>
                  <span className={`font-mono font-bold ${timeLeft < 180 ? 'text-rose-600 animate-pulse' : 'text-slate-800'}`}>
                    {formattedTime}
                  </span>
                </div>
              </div>

              {/* VietQR Image Display */}
              <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center justify-center space-y-3">
                <div className="relative group">
                  <img
                    src={order.qr_url}
                    alt={`VietQR ${order.order_code}`}
                    className="w-56 h-auto rounded-2xl border border-slate-100 shadow-inner"
                  />
                  <div className="absolute inset-0 rounded-2xl bg-slate-900/0 hover:bg-slate-900/5 transition-colors pointer-events-none" />
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping shrink-0" />
                  <span>Đang tự động quét biến động số dư TPBank ({order.bank_info.account_no})...</span>
                </div>
              </div>

              {/* Transfer Details Card with One-Click Copy */}
              <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Ngân hàng:</span>
                  <span className="font-bold text-slate-800">{order.bank_info.bank_name}</span>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                  <span className="text-slate-500">Số tài khoản:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-900">{order.bank_info.account_no}</span>
                    <button
                      onClick={() => copyToClipboard(order.bank_info.account_no, 'Số tài khoản')}
                      className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-700 transition-colors"
                      title="Sao chép"
                    >
                      {copiedField === 'Số tài khoản' ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                  <span className="text-slate-500">Tên chủ tài khoản:</span>
                  <span className="font-bold text-slate-800 uppercase">{order.bank_info.account_name}</span>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-100 bg-amber-50/60 -mx-4 -mb-4 p-3 rounded-b-2xl border-amber-200">
                  <div>
                    <span className="text-amber-800 font-semibold block text-[11px]">Nội dung chuyển khoản (bắt buộc):</span>
                    <span className="font-mono font-extrabold text-[#da1c2d] text-sm tracking-wider">
                      {order.transfer_content}
                    </span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(order.transfer_content, 'Nội dung chuyển khoản')}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg text-[11px] shadow-2xs transition-colors shrink-0"
                  >
                    {copiedField === 'Nội dung chuyển khoản' ? (
                      <>
                        <Check className="w-3 h-3" />
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

              {/* Action Buttons */}
              <div className="space-y-2 pt-1">
                <button
                  onClick={handleManualConfirm}
                  disabled={isConfirmingManual}
                  className="w-full py-2.5 px-4 bg-[#008689] hover:bg-[#006e71] text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isConfirmingManual ? 'animate-spin' : ''}`} />
                  <span>{isConfirmingManual ? 'Đang nhận diện giao dịch...' : 'Kiểm Tra & Nhận Diện Tiền Về Ngay'}</span>
                </button>
                <p className="text-[10px] text-center text-slate-400">
                  Hệ thống tự động kích hoạt gói cước ngay khi nhận diện được biến động số dư.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
