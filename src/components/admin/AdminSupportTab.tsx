import React, { useState, useEffect, useRef } from 'react';
import {
  LifeBuoy,
  RefreshCw,
  Search,
  MessageSquare,
  X,
  Activity,
  Paperclip,
  Maximize2,
  Star,
  Send,
  ShieldCheck,
} from 'lucide-react';
import { UserProfile } from '../../types';
import { apiClient, API_BASE } from '../../services/apiClient';
import { ImageLightboxModal } from '../ImageLightboxModal';

export interface AdminSupportTabProps {
  currentUser: UserProfile | null;
  onShowToast: (
    type: 'success' | 'info' | 'warning' | 'error',
    title: string,
    message: string
  ) => void;
}

export const AdminSupportTab: React.FC<AdminSupportTabProps> = ({
  currentUser,
  onShowToast,
}) => {
  // ─── Support & Helpdesk Command Center State (Port 8008) ────────────────────
  const [adminSupportTickets, setAdminSupportTickets] = useState<any[]>([]);
  const [adminSupportMetrics, setAdminSupportMetrics] = useState<any | null>(null);
  const [adminSupportSearch, setAdminSupportSearch] = useState('');
  const [adminSupportStatusFilter, setAdminSupportStatusFilter] = useState<string>('all');
  const [adminSupportPriorityFilter, setAdminSupportPriorityFilter] = useState<string>('all');
  const [adminSelectedTicket, setAdminSelectedTicket] = useState<any | null>(null);
  const adminSelectedTicketIdRef = useRef<string | null>(null);
  const isFetchingAdminDetailRef = useRef<boolean>(false);
  const isFetchingAdminSupportRef = useRef<boolean>(false);
  const [adminReplyText, setAdminReplyText] = useState('');
  const [adminIsSendingReply, setAdminIsSendingReply] = useState(false);
  const [adminStatusUpdate, setAdminStatusUpdate] = useState<string>('');
  const [adminIsUpdatingStatus, setAdminIsUpdatingStatus] = useState(false);
  const [isLoadingSupport, setIsLoadingSupport] = useState(false);
  const [adminLightboxImage, setAdminLightboxImage] = useState<string | null>(null);

  const formatVnDateTime = (dtStr?: string) => {
    if (!dtStr) return '';
    const iso = dtStr.includes('Z') || dtStr.includes('+') ? dtStr : `${dtStr}Z`;
    try {
      const d = new Date(iso);
      const time = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
      const date = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
      return `${time} • ${date}`;
    } catch {
      return dtStr;
    }
  };

  const fetchAdminSupportData = async (silent = false) => {
    if (isFetchingAdminSupportRef.current) return;
    isFetchingAdminSupportRef.current = true;
    if (!silent) setIsLoadingSupport(true);
    try {
      const headers: Record<string, string> = {
        'x-user-role': 'ADMIN',
        'x-user-email': currentUser?.email || 'quizgen.ai.team@gmail.com',
        'x-user-id': currentUser?.id || 'usr-adm-quizgen',
      };
      const [ticketsRes, metricsRes] = await Promise.all([
        apiClient.fetch(`${API_BASE}/support/tickets`, { headers }),
        apiClient.fetch(`${API_BASE}/support/admin/metrics`, { headers }),
      ]);
      if (ticketsRes.ok) {
        const data = await ticketsRes.json();
        const list = Array.isArray(data) ? data : [];
        setAdminSupportTickets(list);
      }
      if (metricsRes.ok) {
        const metrics = await metricsRes.json();
        setAdminSupportMetrics(metrics);
      }
    } catch (err) {
      console.warn('[ADMIN SUPPORT] Lỗi tải dữ liệu hỗ trợ:', err);
    } finally {
      if (!silent) setIsLoadingSupport(false);
      isFetchingAdminSupportRef.current = false;
    }
  };

  const fetchAdminTicketDetail = async (ticketId: string) => {
    if (adminSelectedTicketIdRef.current !== ticketId) return;
    if (isFetchingAdminDetailRef.current) return;
    isFetchingAdminDetailRef.current = true;
    try {
      const headers: Record<string, string> = {
        'x-user-role': 'ADMIN',
        'x-user-email': currentUser?.email || 'quizgen.ai.team@gmail.com',
        'x-user-id': currentUser?.id || 'usr-adm-quizgen',
      };
      const res = await apiClient.fetch(`${API_BASE}/support/tickets/${ticketId}`, { headers });
      if (res.ok) {
        if (adminSelectedTicketIdRef.current !== ticketId) return; // Loại bỏ phản hồi trễ của phiếu khác
        const detail = await res.json();
        setAdminSelectedTicket(detail);
        setAdminStatusUpdate(detail.status);
      }
    } catch (err) {
      console.error('[ADMIN SUPPORT] Lỗi tải chi tiết ticket:', err);
    } finally {
      isFetchingAdminDetailRef.current = false;
    }
  };

  const handleAdminSelectTicket = (t: any) => {
    adminSelectedTicketIdRef.current = t.id;
    setAdminSelectedTicket(t); // Chọn tức thì (Optimistic UI), không bị lag
    setAdminStatusUpdate(t.status);
    void fetchAdminTicketDetail(t.id);
  };

  const handleAdminDeselectTicket = () => {
    adminSelectedTicketIdRef.current = null;
    setAdminSelectedTicket(null);
  };

  const handleAdminSendReply = async () => {
    if (!adminSelectedTicket || !adminReplyText.trim()) return;
    setAdminIsSendingReply(true);
    try {
      const res = await apiClient.fetch(`${API_BASE}/support/tickets/${adminSelectedTicket.id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'ADMIN',
          'x-user-email': currentUser?.email || 'quizgen.ai.team@gmail.com',
          'x-user-id': currentUser?.id || 'usr-adm-quizgen',
        },
        body: JSON.stringify({
          sender_role: 'ADMIN',
          sender_name: currentUser?.fullName || 'Chuyên viên Hỗ trợ Kỹ thuật QuizGen AI',
          content: adminReplyText.trim(),
          message_body: adminReplyText.trim(),
        }),
      });
      if (res.ok) {
        setAdminReplyText('');
        onShowToast('success', 'Đã Gửi Phản Hồi', 'Giảng viên sẽ nhận được thông báo phản hồi ngay.');
        await fetchAdminTicketDetail(adminSelectedTicket.id);
        await fetchAdminSupportData(true);
      } else {
        const err = await res.json().catch(() => ({}));
        const errMsg = typeof err?.detail === 'string'
          ? err.detail
          : Array.isArray(err?.detail)
          ? err.detail.map((i: any) => i?.msg || String(i)).join('; ')
          : 'Lỗi server';
        onShowToast('error', 'Không thể gửi phản hồi', errMsg);
      }
    } catch (err: any) {
      onShowToast('error', 'Lỗi kết nối', err.message);
    } finally {
      setAdminIsSendingReply(false);
    }
  };

  const handleAdminUpdateStatus = async (newStatus: string) => {
    if (!adminSelectedTicket || !newStatus) return;
    setAdminIsUpdatingStatus(true);
    try {
      const res = await apiClient.fetch(`${API_BASE}/support/tickets/${adminSelectedTicket.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'ADMIN',
          'x-user-email': currentUser?.email || 'quizgen.ai.team@gmail.com',
          'x-user-id': currentUser?.id || 'usr-adm-quizgen',
        },
        body: JSON.stringify({
          status: newStatus,
          note: `Trạng thái cập nhật bởi Admin ${currentUser?.fullName || 'QuizGen AI Team'}`,
        }),
      });
      if (res.ok) {
        onShowToast('success', 'Đã Cập Nhật Trạng Thái', `Ticket chuyển sang ${newStatus}`);
        setAdminStatusUpdate(newStatus);
        setAdminSelectedTicket((prev: any) => (prev ? { ...prev, status: newStatus } : null));
        setAdminSupportTickets((prev) =>
          prev.map((t) => (t.id === adminSelectedTicket.id ? { ...t, status: newStatus } : t))
        );
        await fetchAdminTicketDetail(adminSelectedTicket.id);
        await fetchAdminSupportData(true);
      } else {
        const err = await res.json().catch(() => ({}));
        const errMsg = typeof err?.detail === 'string'
          ? err.detail
          : Array.isArray(err?.detail)
          ? err.detail.map((i: any) => i?.msg || String(i)).join('; ')
          : 'Lỗi server';
        onShowToast('error', 'Cập nhật thất bại', errMsg);
      }
    } catch (err: any) {
      onShowToast('error', 'Lỗi kết nối', err.message);
    } finally {
      setAdminIsUpdatingStatus(false);
    }
  };

  // Smart Polling: Khi ở tab "support" và KHÔNG mở phiếu, cập nhật hàng đợi mỗi 5s
  useEffect(() => {
    if (!adminSelectedTicket) {
      void fetchAdminSupportData(false);
      const interval = setInterval(() => {
        void fetchAdminSupportData(true);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [!adminSelectedTicket]);

  // Smart Polling: Khi đang mở một ticket, tự động cập nhật chi tiết & tin nhắn phiếu đó mỗi 4s
  useEffect(() => {
    if (!adminSelectedTicket?.id) {
      adminSelectedTicketIdRef.current = null;
      return;
    }
    const ticketId = adminSelectedTicket.id;
    adminSelectedTicketIdRef.current = ticketId;

    const interval = setInterval(() => {
      if (adminSelectedTicketIdRef.current === ticketId) {
        void fetchAdminTicketDetail(ticketId);
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [adminSelectedTicket?.id]);

  const filteredTickets = adminSupportTickets.filter((t) => {
    const matchSearch =
      !adminSupportSearch.trim() ||
      (t.subject || t.title || '').toLowerCase().includes(adminSupportSearch.toLowerCase()) ||
      t.user_email?.toLowerCase().includes(adminSupportSearch.toLowerCase()) ||
      t.id?.toLowerCase().includes(adminSupportSearch.toLowerCase());
    const matchStatus = adminSupportStatusFilter === 'all' || t.status === adminSupportStatusFilter;
    const matchPriority = adminSupportPriorityFilter === 'all' || t.priority === adminSupportPriorityFilter;
    return matchSearch && matchStatus && matchPriority;
  });

  const statusBadges: Record<string, { label: string; bg: string; text: string; border: string }> = {
    OPEN: { label: 'Chờ xử lý', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
    IN_PROGRESS: { label: 'Đang giải quyết', bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200' },
    RESOLVED: { label: 'Đã giải quyết', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
    CLOSED: { label: 'Đã đóng', bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200' },
  };

  const priorityBadges: Record<string, { label: string; bg: string }> = {
    CRITICAL: { label: 'Khẩn cấp', bg: 'bg-rose-100 text-rose-700' },
    HIGH: { label: 'Ưu tiên cao', bg: 'bg-amber-100 text-amber-800' },
    MEDIUM: { label: 'Trung bình', bg: 'bg-blue-100 text-blue-800' },
    LOW: { label: 'Thấp', bg: 'bg-slate-100 text-slate-700' },
  };

  const cannedResponses = [
    'Kính chào Thầy/Cô, đội ngũ kỹ thuật QuizGen AI đã tiếp nhận sự cố và đang tiến hành xử lý.',
    'Sự cố đã được kiểm tra và khắc phục hoàn tất. Kính mời Thầy/Cô tải lại trang (F5) để kiểm tra lại kết quả.',
    'Để hỗ trợ chính xác hơn, kính nhờ Thầy/Cô cung cấp thêm ảnh chụp màn hình F12 Console hoặc thông tin chi tiết.',
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-teal-50 border border-teal-200 text-[#008689] flex items-center justify-center shadow-xs">
              <LifeBuoy className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                Tiếp Nhận &amp; CSKH Kỹ Thuật (Helpdesk)
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-[#008689]">
                  Port 8008 • SLA Live
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Điều phối ticket sự cố, tra cứu nhật ký lỗi đính kèm, phản hồi tức thì cho Giảng viên và giám sát SLA cam kết.
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => fetchAdminSupportData(false)}
            disabled={isLoadingSupport}
            className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isLoadingSupport ? 'animate-spin' : ''}`} />
            <span>Làm mới danh sách</span>
          </button>
        </div>
      </div>

      {/* Metrics Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="p-4 bg-white border border-slate-200/90 rounded-2xl shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Tổng số phiếu</div>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {adminSupportMetrics?.total_tickets ?? adminSupportTickets.length}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5 font-medium">Toàn hệ thống</div>
        </div>
        <div className="p-4 bg-white border border-amber-200/80 rounded-2xl shadow-2xs bg-amber-50/20">
          <div className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider">Chờ &amp; Đang xử lý</div>
          <div className="text-2xl font-black text-amber-600 mt-1">
            {adminSupportMetrics?.open_tickets ?? adminSupportTickets.filter((t) => t.status === 'OPEN' || t.status === 'IN_PROGRESS').length}
          </div>
          <div className="text-[10px] text-amber-600/80 mt-0.5 font-medium">Cần xử lý kịp thời</div>
        </div>
        <div className="p-4 bg-white border border-emerald-200/80 rounded-2xl shadow-2xs bg-emerald-50/20">
          <div className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">Đã giải quyết</div>
          <div className="text-2xl font-black text-emerald-600 mt-1">
            {adminSupportMetrics?.resolved_tickets ?? adminSupportTickets.filter((t) => t.status === 'RESOLVED' || t.status === 'CLOSED').length}
          </div>
          <div className="text-[10px] text-emerald-600/80 mt-0.5 font-medium">Hoàn tất hỗ trợ</div>
        </div>
        <div className="p-4 bg-white border border-slate-200/90 rounded-2xl shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Tỷ lệ đạt SLA</div>
          <div className="text-2xl font-black text-[#008689] mt-1">
            {adminSupportMetrics?.sla_compliance_rate_percent != null
              ? `${adminSupportMetrics.sla_compliance_rate_percent}%`
              : adminSupportMetrics?.sla_compliance_rate != null
              ? `${adminSupportMetrics.sla_compliance_rate}%`
              : '100%'}
          </div>
          <div className="text-[10px] text-teal-600 mt-0.5 font-medium">Cam kết &lt; 30 phút</div>
        </div>
        <div className="p-4 bg-white border border-slate-200/90 rounded-2xl shadow-2xs col-span-2 sm:col-span-1">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Hài lòng CSAT</div>
          <div className="text-2xl font-black text-amber-500 mt-1 flex items-center gap-1">
            {adminSupportMetrics?.average_csat_stars != null ? (
              <>
                <span>{Number(adminSupportMetrics.average_csat_stars).toFixed(1)}</span>
                <span className="text-sm text-slate-400">/ 5.0</span>
              </>
            ) : (
              <span className="text-base text-slate-400 font-bold">Chưa có</span>
            )}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5 font-medium">
            {adminSupportMetrics?.total_feedbacks != null
              ? `${adminSupportMetrics.total_feedbacks} lượt đánh giá thực tế`
              : 'Đánh giá từ Giảng viên'}
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={adminSupportSearch}
            onChange={(e) => setAdminSupportSearch(e.target.value)}
            placeholder="Tìm theo tiêu đề, email giảng viên hoặc mã phiếu..."
            className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-[#008689]"
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            value={adminSupportStatusFilter}
            onChange={(e) => setAdminSupportStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 font-semibold focus:outline-none focus:bg-white focus:border-[#008689]"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="OPEN">Chờ xử lý (OPEN)</option>
            <option value="IN_PROGRESS">Đang xử lý (IN_PROGRESS)</option>
            <option value="RESOLVED">Đã giải quyết (RESOLVED)</option>
            <option value="CLOSED">Đã đóng (CLOSED)</option>
          </select>
          <select
            value={adminSupportPriorityFilter}
            onChange={(e) => setAdminSupportPriorityFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 font-semibold focus:outline-none focus:bg-white focus:border-[#008689]"
          >
            <option value="all">Mọi mức ưu tiên</option>
            <option value="CRITICAL">Khẩn cấp</option>
            <option value="HIGH">Ưu tiên cao</option>
            <option value="MEDIUM">Trung bình</option>
            <option value="LOW">Thấp</option>
          </select>
        </div>
      </div>

      {/* Split Workspace: Left List & Right Detail Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Tickets Queue */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-600 px-1">
            <span>Hàng đợi tiếp nhận ({filteredTickets.length})</span>
            {isLoadingSupport && <span className="text-[11px] text-[#008689] font-normal animate-pulse">Đang đồng bộ...</span>}
          </div>

          {filteredTickets.length === 0 ? (
            <div className="bg-white border border-slate-200/90 rounded-2xl p-8 text-center shadow-2xs space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                <LifeBuoy className="w-6 h-6" />
              </div>
              <div>
                <div className="font-bold text-slate-800 text-xs">Không có phiếu hỗ trợ nào</div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Hiện tại không có ticket nào phù hợp với bộ lọc tìm kiếm.
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[750px] overflow-y-auto pr-1">
              {filteredTickets.map((t) => {
                const isSelected = adminSelectedTicket?.id === t.id;
                const sBadge = statusBadges[t.status] || statusBadges.OPEN;
                const pBadge = priorityBadges[t.priority] || priorityBadges.MEDIUM;

                return (
                  <div
                    key={t.id}
                    onClick={() => handleAdminSelectTicket(t)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer text-left ${
                      isSelected
                        ? 'bg-teal-50/60 border-[#008689] shadow-sm ring-1 ring-[#008689]/40'
                        : 'bg-white border-slate-200/90 hover:border-slate-300 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="font-mono text-[10px] font-bold text-slate-400">
                        #{t.id.slice(0, 8)}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${pBadge.bg}`}>
                          {pBadge.label}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${sBadge.bg} ${sBadge.text} ${sBadge.border}`}>
                          {sBadge.label}
                        </span>
                      </div>
                    </div>
                    <div className="font-bold text-xs text-slate-900 line-clamp-1 mb-1">
                      {t.subject || t.title}
                    </div>
                    <div className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed mb-2.5">
                      {t.description}
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-2 border-t border-slate-100">
                      <span className="truncate max-w-[200px] text-slate-600 font-medium">
                        {t.user_email}
                      </span>
                      <span>{new Date(t.created_at || Date.now()).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Ticket Inspection & Resolution Command Center */}
        <div className="lg:col-span-7">
          {!adminSelectedTicket ? (
            <div className="bg-white border border-slate-200/90 rounded-2xl p-12 text-center shadow-2xs space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-teal-50 border border-teal-100 text-[#008689] mx-auto flex items-center justify-center">
                <MessageSquare className="w-7 h-7" />
              </div>
              <div>
                <div className="font-bold text-slate-800 text-sm">Chưa chọn phiếu hỗ trợ</div>
                <div className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  Vui lòng nhấp vào một phiếu bên danh sách để xem chi tiết thông số lỗi, kiểm tra ảnh chụp màn hình và gửi phản hồi cho Giảng viên.
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs space-y-5">
              {/* Header: Title + Status Modifier */}
              <div className="pb-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs font-bold text-slate-400">
                      #{adminSelectedTicket.id}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${priorityBadges[adminSelectedTicket.priority]?.bg || 'bg-slate-100 text-slate-700'}`}>
                      {priorityBadges[adminSelectedTicket.priority]?.label || adminSelectedTicket.priority}
                    </span>
                  </div>
                  <h4 className="text-base font-bold text-slate-900">
                    {adminSelectedTicket.subject || adminSelectedTicket.title}
                  </h4>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Giảng viên: <span className="font-semibold text-slate-700">{adminSelectedTicket.user_email}</span> • Gói: <span className="font-bold text-[#008689] uppercase">{adminSelectedTicket.user_tier || adminSelectedTicket.user_plan_tier || 'FREE'}</span>
                  </div>
                </div>

                {/* Status Selector */}
                <div className="flex items-center gap-2 shrink-0">
                  <select
                    value={adminStatusUpdate}
                    onChange={(e) => setAdminStatusUpdate(e.target.value)}
                    className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#008689]"
                  >
                    <option value="OPEN">Chờ xử lý (OPEN)</option>
                    <option value="IN_PROGRESS">Đang xử lý (IN_PROGRESS)</option>
                    <option value="RESOLVED">Đã giải quyết (RESOLVED)</option>
                    <option value="CLOSED">Đã đóng (CLOSED)</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => handleAdminUpdateStatus(adminStatusUpdate)}
                    disabled={adminIsUpdatingStatus || adminStatusUpdate === adminSelectedTicket.status}
                    className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-semibold transition-all cursor-pointer"
                  >
                    {adminIsUpdatingStatus ? 'Đang lưu...' : 'Lưu'}
                  </button>
                  <button
                    type="button"
                    onClick={handleAdminDeselectTicket}
                    className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                    title="Đóng chi tiết phiếu (Trở về hàng đợi)"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Technical Error & Environment Context (F12 Diagnostic) */}
              {adminSelectedTicket.error_context_json && (
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
                  <div className="font-bold text-slate-700 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                    <Activity className="w-3.5 h-3.5 text-[#008689]" />
                    <span>Thông số kỹ thuật đính kèm tự động</span>
                  </div>
                  {(() => {
                    try {
                      const errCtx = typeof adminSelectedTicket.error_context_json === 'string'
                        ? JSON.parse(adminSelectedTicket.error_context_json)
                        : adminSelectedTicket.error_context_json;
                      return (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] font-mono">
                          <div className="p-2 bg-white rounded-lg border border-slate-200/80">
                            <span className="text-slate-400 block text-[10px]">Hệ điều hành</span>
                            <span className="font-semibold text-slate-800">{errCtx.os || 'Windows'}</span>
                          </div>
                          <div className="p-2 bg-white rounded-lg border border-slate-200/80">
                            <span className="text-slate-400 block text-[10px]">Trình duyệt</span>
                            <span className="font-semibold text-slate-800">{errCtx.browser || 'Chrome/Edge'}</span>
                          </div>
                          <div className="p-2 bg-white rounded-lg border border-slate-200/80">
                            <span className="text-slate-400 block text-[10px]">Độ phân giải</span>
                            <span className="font-semibold text-slate-800">{errCtx.resolution || '1920x1080'}</span>
                          </div>
                          {errCtx.url && (
                            <div className="p-2 bg-white rounded-lg border border-slate-200/80 col-span-2">
                              <span className="text-slate-400 block text-[10px]">Đường dẫn gặp sự cố</span>
                              <span className="font-semibold text-slate-800 truncate block">{errCtx.url}</span>
                            </div>
                          )}
                          {errCtx.last_http_status && (
                            <div className="p-2 bg-rose-50 rounded-lg border border-rose-200">
                              <span className="text-rose-600 block text-[10px]">HTTP Status</span>
                              <span className="font-bold text-rose-700">{errCtx.last_http_status}</span>
                            </div>
                          )}
                        </div>
                      );
                    } catch {
                      return null;
                    }
                  })()}
                </div>
              )}

              {/* Original Problem Description */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Nội dung phản ánh từ Giảng viên
                </div>
                <div className="p-3.5 bg-slate-50/70 border border-slate-200/80 rounded-xl text-xs text-slate-800 leading-relaxed whitespace-pre-line">
                  {adminSelectedTicket.description}
                </div>
              </div>

              {/* Attached Error Screenshots (Lightbox Integration) */}
              {adminSelectedTicket.attachments && adminSelectedTicket.attachments.length > 0 && (
                <div className="space-y-2">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5 text-slate-500" />
                    <span>Ảnh chụp sự cố đính kèm ({adminSelectedTicket.attachments.length})</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {adminSelectedTicket.attachments.map((att: any, idx: number) => {
                      const isImg = att.file_name?.match(/\.(png|jpg|jpeg|webp|gif)$/i) || att.file_url?.match(/\.(png|jpg|jpeg|webp|gif)$/i) || att.file_url?.startsWith('data:image');
                      return (
                        <div
                          key={att.id || idx}
                          onClick={() => isImg && setAdminLightboxImage(att.file_url)}
                          className="group relative rounded-xl overflow-hidden border border-slate-200 bg-slate-100 aspect-video flex items-center justify-center cursor-pointer hover:border-[#008689] transition-all shadow-2xs"
                        >
                          {isImg ? (
                            <img
                              src={att.file_url}
                              alt={att.file_name || 'Screenshot'}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                          ) : (
                            <div className="text-center p-2">
                              <Paperclip className="w-5 h-5 text-slate-400 mx-auto mb-1" />
                              <span className="text-[10px] font-mono text-slate-600 truncate block max-w-[120px]">{att.file_name}</span>
                            </div>
                          )}
                          <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[11px] font-bold gap-1">
                            <Maximize2 className="w-3.5 h-3.5" />
                            <span>Phóng to</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* CSAT Real Feedback from Teacher */}
              {adminSelectedTicket.feedback ? (
                <div className="p-4 bg-amber-50/70 border border-amber-200/90 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
                      <span className="text-xs font-bold text-slate-800">Đánh giá từ Giảng viên (CSAT Thực tế)</span>
                    </div>
                    <span className="text-xs font-black text-amber-700 bg-amber-100/90 border border-amber-200 px-2.5 py-0.5 rounded-full">
                      {adminSelectedTicket.feedback.rating_stars} / 5 ⭐
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-3.5 h-3.5 ${
                          star <= adminSelectedTicket.feedback.rating_stars
                            ? 'text-amber-500 fill-amber-400'
                            : 'text-slate-300'
                        }`}
                      />
                    ))}
                    <span className="text-[11px] font-bold text-amber-800 ml-1.5">
                      {adminSelectedTicket.feedback.rating_stars === 5
                        ? 'Rất hài lòng (5 sao)'
                        : adminSelectedTicket.feedback.rating_stars === 4
                        ? 'Hài lòng (4 sao)'
                        : adminSelectedTicket.feedback.rating_stars === 3
                        ? 'Bình thường (3 sao)'
                        : adminSelectedTicket.feedback.rating_stars === 2
                        ? 'Chưa hài lòng (2 sao)'
                        : 'Rất không hài lòng (1 sao)'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 bg-white p-3 rounded-xl border border-amber-200/60 italic leading-relaxed">
                    "{adminSelectedTicket.feedback.feedback_text || '(Giảng viên không để lại lời bình luận)'}"
                  </p>
                  {adminSelectedTicket.feedback.created_at && (
                    <div className="text-[10px] text-slate-400 text-right">
                      Đã đánh giá: {formatVnDateTime(adminSelectedTicket.feedback.created_at)}
                    </div>
                  )}
                </div>
              ) : (
                (adminSelectedTicket.status === 'RESOLVED' || adminSelectedTicket.status === 'CLOSED') && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs text-slate-500">
                    <span className="flex items-center gap-1.5">
                      <Star className="w-3.5 h-3.5 text-slate-400" />
                      Giảng viên chưa gửi đánh giá CSAT cho phiếu này.
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">Chưa đánh giá</span>
                  </div>
                )
              )}

              {/* Conversation History Thread */}
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Lịch sử trao đổi &amp; giải quyết</span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    {adminSelectedTicket.messages?.length || 0} tin nhắn
                  </span>
                </div>

                <div className="space-y-3.5 max-h-80 overflow-y-auto pr-1 p-3 bg-slate-50/60 rounded-2xl border border-slate-200/80">
                  {(adminSelectedTicket.messages || []).map((msg: any) => {
                    const roleUpper = (msg.sender_role || '').toUpperCase();
                    const isAdminSender = ['ADMIN', 'SUPER_ADMIN', 'SUPPORT_STAFF', 'STAFF'].includes(roleUpper);
                    const text = msg.message_body || msg.content || '';

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isAdminSender ? 'items-end' : 'items-start'}`}
                      >
                        <div className="flex items-center gap-1.5 mb-1 px-1 text-[11px] text-slate-500">
                          {!isAdminSender ? (
                            <>
                              <span className="font-bold text-slate-800">{msg.sender_name || 'Giảng viên'}</span>
                              <span className="text-[10px] text-slate-400">• {formatVnDateTime(msg.created_at)}</span>
                            </>
                          ) : (
                            <>
                              <span className="text-[10px] text-slate-400">{formatVnDateTime(msg.created_at)} •</span>
                              <span className="px-1.5 py-0.5 rounded-md bg-teal-100 text-[#008689] font-bold text-[9px]">
                                Tôi (Kỹ thuật viên)
                              </span>
                            </>
                          )}
                        </div>
                        <div
                          className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm max-w-[80%] leading-relaxed shadow-2xs whitespace-pre-line ${
                            isAdminSender
                              ? 'bg-[#008689] text-white rounded-tr-xs'
                              : 'bg-white text-slate-800 rounded-tl-xs border border-slate-200/90'
                          }`}
                        >
                          {text}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Canned Quick Responses */}
              <div className="space-y-1.5 pt-2">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Phản hồi nhanh (Canned templates)
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {cannedResponses.map((cr, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setAdminReplyText(cr)}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-teal-50 hover:text-[#008689] text-slate-600 text-[11px] transition-colors cursor-pointer text-left line-clamp-1 border border-slate-200/60"
                    >
                      "{cr.slice(0, 48)}..."
                    </button>
                  ))}
                </div>
              </div>

              {/* Reply Input Form */}
              <div className="space-y-2 pt-2">
                <textarea
                  value={adminReplyText}
                  onChange={(e) => setAdminReplyText(e.target.value)}
                  placeholder="Nhập nội dung phản hồi, hướng dẫn xử lý gửi trực tiếp đến Giảng viên..."
                  rows={3}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-[#008689] leading-relaxed resize-none"
                />
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">
                    Giảng viên sẽ nhận chuông thông báo âm thanh và cập nhật tức thì (3.5s).
                  </span>
                  <button
                    type="button"
                    onClick={handleAdminSendReply}
                    disabled={adminIsSendingReply || !adminReplyText.trim()}
                    className="px-4 py-2 rounded-xl bg-[#008689] hover:bg-[#007376] disabled:opacity-50 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{adminIsSendingReply ? 'Đang gửi...' : 'Gửi Phản Hồi'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Diagnostic Footer */}
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-600">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-teal-50 text-[#008689] flex items-center justify-center font-bold shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <p>
            <strong>Tiêu chuẩn CSKH Học Thuật:</strong> Toàn bộ dữ liệu ticket được đồng bộ tập trung qua SQLite WAL trên Port 8008, hỗ trợ giám sát SLA phản hồi và bảo vệ thông tin cá nhân của Giảng viên.
          </p>
        </div>
        <div className="text-[11px] font-mono text-slate-400 shrink-0">
          CSDL: support.db • Port 8008 Live
        </div>
      </div>

      {/* Lightbox Modal for Screenshots */}
      <ImageLightboxModal
        isOpen={Boolean(adminLightboxImage)}
        imageUrl={adminLightboxImage || ''}
        onClose={() => setAdminLightboxImage(null)}
        title="Ảnh chụp sự cố đính kèm (Helpdesk Diagnostic)"
      />
    </div>
  );
};
