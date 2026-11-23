import React, { useState } from 'react';
import {
  Activity,
  Check,
  CheckCircle2,
  Clock,
  CreditCard,
  Crown,
  Edit3,
  RefreshCw,
  Search,
  Sliders,
  TrendingUp,
} from 'lucide-react';
import { PaymentOverviewData, PlanItem, OrderItem } from './adminTypes';
import { formatVietnameseDateTime } from '../../utils/dateUtils';

export interface AdminPaymentsTabProps {
  paymentData: PaymentOverviewData | null;
  isLoading: boolean;
  loadAllRealData: () => void;
  setEditingPlan: (plan: PlanItem) => void;
  handleApproveOrder: (order: OrderItem) => void;
  approvingOrderId: string | null;
}

export const AdminPaymentsTab: React.FC<AdminPaymentsTabProps> = ({
  paymentData,
  isLoading,
  loadAllRealData,
  setEditingPlan,
  handleApproveOrder,
  approvingOrderId,
}) => {
  const [paymentSearch, setPaymentSearch] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<'all' | 'COMPLETED' | 'PENDING' | 'EXPIRED'>('all');

  return (
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-amber-500" />
                <span>Quản Lý Gói Cước, Đơn Giá &amp; Cổng Thanh Toán TPBank VietQR</span>
              </h3>
              <p className="text-xs text-slate-500 max-w-3xl leading-relaxed">
                Theo dõi dòng tiền chuyển khoản thực tế về tài khoản ngân hàng TPBank (78757618888), điều chỉnh đơn giá niêm yết các gói PRO Giảng Viên, phê duyệt giao dịch và tự động đồng bộ quyền hạn kho giáo trình môn học.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={loadAllRealData}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-[#008689] ${isLoading ? 'animate-spin' : ''}`} />
                <span>Đối soát lại</span>
              </button>
            </div>
          </div>

          {/* 4 Financial KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                <span>Tổng Doanh Thu Hệ Thống</span>
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-emerald-600 tracking-tight">
                {(paymentData?.kpis?.totalRevenueVnd || 0).toLocaleString('vi-VN')} <span className="text-xs font-bold text-slate-500">VNĐ</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Từ {(paymentData?.kpis?.completedOrders || 0)} giao dịch chuyển khoản thành công
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                <span>Đơn Hàng Hoàn Thành</span>
                <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900 tracking-tight">
                {paymentData?.kpis?.completedOrders || 0} <span className="text-sm font-semibold text-slate-400">/ {paymentData?.kpis?.totalOrders || 0} đơn</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-sky-500 h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${
                      paymentData?.kpis?.totalOrders
                        ? Math.round(((paymentData.kpis.completedOrders || 0) / paymentData.kpis.totalOrders) * 100)
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                <span>Thuê Bao PRO Đang Hoạt Động</span>
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                  <Crown className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-amber-600 tracking-tight">
                {paymentData?.kpis?.activeSubscribers || 0} <span className="text-xs font-bold text-slate-500">tài khoản</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Đã mở khóa không giới hạn dung lượng giáo trình môn học
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                <span>Đơn Chờ Thanh Toán</span>
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-purple-600 tracking-tight">
                {paymentData?.kpis?.pendingOrders || 0} <span className="text-xs font-bold text-slate-500">đang đợi quét QR</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Thời hạn 15 phút mỗi mã VietQR
              </p>
            </div>
          </div>

          {/* MB Bank Real Account Config Banner (PayOS VietQR PRO) */}
          <div className="p-4 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-white border border-emerald-200 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-base shadow-xs shrink-0">
                MB
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-slate-900 text-sm">MB Bank (Ngân hàng Quân Đội)</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    Tài khoản nhận tiền thực tế PayOS
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 mt-1">
                  <span>Số tài khoản: <strong className="font-mono text-slate-900 text-sm">06020501360812</strong></span>
                  <span>•</span>
                  <span>Chủ tài khoản: <strong className="font-bold text-slate-900">HO ANH VU</strong></span>
                  <span>•</span>
                  <span className="text-emerald-700 font-semibold">Cổng VietQR PRO NAPAS 24/7 &amp; PayOS Auto-Detect</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 1: Subscription Plans Management Table */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs space-y-0">
            <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-[#008689]" />
                  <span>Quản Lý Danh Mục Gói Cước &amp; Thiết Lập Đơn Giá (payment.db)</span>
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Admin có quyền trực tiếp thay đổi đơn giá VNĐ, chu kỳ hạn dùng, hạn mức giáo trình và trạng thái mở bán.
                </p>
              </div>
              <span className="text-xs font-bold text-slate-500 px-3 py-1 bg-slate-50 rounded-xl border border-slate-200 self-start sm:self-auto">
                {paymentData?.plans?.length || 0} Gói cước niêm yết
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 text-slate-500 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-3.5 px-4">Mã Gói</th>
                    <th className="py-3.5 px-4">Tên Gói Cước</th>
                    <th className="py-3.5 px-4">Đơn Giá Niêm Yết</th>
                    <th className="py-3.5 px-4">Chu Kỳ</th>
                    <th className="py-3.5 px-4">Giới Hạn Tài Nguyên</th>
                    <th className="py-3.5 px-4">Thuê Bao Mua</th>
                    <th className="py-3.5 px-4">Trạng Thái</th>
                    <th className="py-3.5 px-4 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(paymentData?.plans || []).map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-700">
                        <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-800 text-[11px]">
                          {p.code}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{p.name}</span>
                          {p.is_popular ? (
                            <span className="px-1.5 py-0.2 rounded-full text-[9px] font-extrabold bg-amber-100 text-amber-800 border border-amber-300">
                              Phổ Biến
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-black text-amber-600 text-sm">
                          {p.price_vnd.toLocaleString('vi-VN')} VNĐ
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {p.duration_days === 0 ? 'Vĩnh viễn' : `${p.duration_days} ngày`}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 space-y-0.5">
                        <div>
                          Giáo trình:{' '}
                          <strong className="text-slate-800">
                            {p.max_documents >= 999999 ? 'Không giới hạn' : `${p.max_documents} files`}
                          </strong>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {p.max_questions_month >= 999999 ? 'Không giới hạn câu hỏi' : `${p.max_questions_month.toLocaleString('vi-VN')} câu hỏi/tháng`}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-800">
                          {p.subscriber_count ?? 0} người dùng
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                            p.is_active
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-slate-100 text-slate-500 border-slate-200'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${p.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                          {p.is_active ? 'Đang mở bán' : 'Tạm dừng'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => setEditingPlan(p)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-[#008689] hover:text-white text-slate-700 font-bold text-xs border border-slate-200 transition-colors shadow-2xs"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Chỉnh sửa gói &amp; ưu đãi</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 2: Orders & Transactions Table */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs space-y-4 p-5">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div>
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#008689]" />
                  <span>Nhật Ký Đơn Hàng &amp; Lịch Sử Giao Dịch Toàn Hệ Thống</span>
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Lưu trữ vĩnh viễn trong CSDL payment.db, đối soát chuẩn VietQR và hỗ trợ duyệt đơn thủ công.
                </p>
              </div>

              {/* Status Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto">
                {[
                  { id: 'all', label: 'Tất cả' },
                  { id: 'COMPLETED', label: 'Đã hoàn tất' },
                  { id: 'PENDING', label: 'Chờ thanh toán' },
                  { id: 'EXPIRED', label: 'Đã hết hạn' },
                ].map((st) => (
                  <button
                    key={st.id}
                    onClick={() => setPaymentStatusFilter(st.id as any)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
                      paymentStatusFilter === st.id
                        ? 'bg-[#008689] text-white border-[#008689]'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm kiếm theo mã đơn #QZ..., email giảng viên, tên hoặc mã tham chiếu..."
                value={paymentSearch}
                onChange={(e) => setPaymentSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:bg-white focus:border-[#008689]"
              />
            </div>

            {/* Orders Table */}
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 text-slate-500 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Mã Đơn Hàng</th>
                    <th className="py-3 px-4">Khách Hàng</th>
                    <th className="py-3 px-4">Gói Cước Đăng Ký</th>
                    <th className="py-3 px-4">Số Tiền</th>
                    <th className="py-3 px-4">Thời Gian Tạo / Thanh Toán</th>
                    <th className="py-3 px-4">Trạng Thái</th>
                    <th className="py-3 px-4">Mã Tham Chiếu</th>
                    <th className="py-3 px-4 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(paymentData?.orders || [])
                    .filter((ord) => {
                      const matchSearch =
                        ord.order_code.toLowerCase().includes(paymentSearch.toLowerCase()) ||
                        ord.user_email.toLowerCase().includes(paymentSearch.toLowerCase()) ||
                        (ord.user_name || '').toLowerCase().includes(paymentSearch.toLowerCase()) ||
                        (ord.bank_reference || '').toLowerCase().includes(paymentSearch.toLowerCase());
                      const matchStatus = paymentStatusFilter === 'all' || ord.status === paymentStatusFilter;
                      return matchSearch && matchStatus;
                    })
                    .map((ord) => (
                      <tr key={ord.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">
                          #{ord.order_code}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900">{ord.user_name || 'Giảng viên'}</div>
                          <div className="text-[11px] font-mono text-slate-500">{ord.user_email}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-slate-800">{ord.plan_name}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-amber-600 font-mono text-xs">
                            {ord.amount_vnd.toLocaleString('vi-VN')} VNĐ
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-500 space-y-0.5">
                          <div>Tạo: {formatVietnameseDateTime(ord.created_at)}</div>
                          {ord.paid_at && (
                            <div className="text-emerald-700 font-semibold">
                              Trả: {formatVietnameseDateTime(ord.paid_at)}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                              ord.status === 'COMPLETED'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : ord.status === 'PENDING'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-slate-100 text-slate-500 border-slate-200'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                ord.status === 'COMPLETED'
                                  ? 'bg-emerald-500'
                                  : ord.status === 'PENDING'
                                  ? 'bg-amber-500 animate-pulse'
                                  : 'bg-slate-400'
                              }`}
                            />
                            {ord.status === 'COMPLETED'
                              ? 'Đã thanh toán'
                              : ord.status === 'PENDING'
                              ? 'Chờ chuyển khoản'
                              : 'Hết hạn'}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                          {ord.bank_reference || '—'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {ord.status === 'PENDING' ? (
                            <button
                              onClick={() => handleApproveOrder(ord)}
                              disabled={approvingOrderId === ord.id}
                              className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors shadow-2xs disabled:opacity-50"
                            >
                              {approvingOrderId === ord.id ? (
                                <RefreshCw className="w-3 h-3 animate-spin" />
                              ) : (
                                <Check className="w-3 h-3" />
                              )}
                              <span>Duyệt thủ công</span>
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-400 font-mono">Đã xử lý</span>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

  );
};
