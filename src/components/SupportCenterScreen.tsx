import React, { useState, useEffect, useRef } from 'react';
import {
  HelpCircle,
  LifeBuoy,
  BookOpen,
  MessageSquare,
  PlusCircle,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Send,
  Star,
  ChevronRight,
  ExternalLink,
  ThumbsUp,
  FileText,
  Cpu,
  Download,
  CreditCard,
  Sparkles,
  ArrowLeft,
  Filter,
  Image as ImageIcon,
  Paperclip,
  X,
  Maximize2,
  Volume2,
  Check,
  RefreshCw,
  Info,
  ShieldCheck,
  Inbox,
  AlertCircle
} from 'lucide-react';
import { UserProfile } from '../types';
import { API_BASE } from '../services/apiClient';
import { ImageLightboxModal } from './ImageLightboxModal';

interface SupportCenterScreenProps {
  currentUser?: UserProfile | null;
  onNavigateHome?: () => void;
}

interface FAQCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  articles_count: number;
}

interface FAQArticle {
  id: string;
  category_id: string;
  title: string;
  slug: string;
  content_markdown: string;
  tags?: string;
  view_count: number;
  helpful_count: number;
}

interface TicketAttachment {
  id: string;
  file_name: string;
  file_size_bytes: number;
  mime_type: string;
  file_path: string;
  file_url?: string;
  created_at: string;
}

interface TicketMessage {
  id: string;
  sender_id?: string;
  sender_name: string;
  sender_role: string;
  message_body: string;
  created_at: string;
  attachments?: TicketAttachment[];
}

interface SupportTicket {
  id: string;
  ticket_code: string;
  subject: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  sla_first_response_due: string;
  sla_resolution_due: string;
  created_at: string;
  updated_at?: string;
  error_context_json?: string;
  messages?: TicketMessage[];
  attachments?: TicketAttachment[];
  feedback?: {
    id?: string;
    rating_stars: number;
    feedback_text?: string;
    resolved_efficiently?: boolean;
    created_at?: string;
  };
}

export const SupportCenterScreen: React.FC<SupportCenterScreenProps> = ({
  currentUser,
  onNavigateHome
}) => {
  const [activeTab, setActiveTab] = useState<'faq' | 'my_tickets' | 'create_ticket'>('faq');
  const [categories, setCategories] = useState<FAQCategory[]>([]);
  const [articles, setArticles] = useState<FAQArticle[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<FAQArticle | null>(null);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const selectedTicketIdRef = useRef<string | null>(null);
  const isFetchingDetailRef = useRef<boolean>(false);
  const isFetchingTicketsRef = useRef<boolean>(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshingTickets, setIsRefreshingTickets] = useState(false);

  // Form tạo ticket mới
  const [formSubject, setFormSubject] = useState('');
  const [formCategory, setFormCategory] = useState('EXAM_EXPORT_ERROR');
  const [formPriority, setFormPriority] = useState('MEDIUM');
  const [formDescription, setFormDescription] = useState('');
  const [aiTip, setAiTip] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitErrorMessage, setSubmitErrorMessage] = useState<string | null>(null);

  // Quản lý đính kèm ảnh / tệp lỗi khi tạo ticket
  const [createFiles, setCreateFiles] = useState<File[]>([]);
  const [createPreviews, setCreatePreviews] = useState<{ url: string; name: string; size: string; isImage: boolean }[]>([]);
  const [isDraggingCreate, setIsDraggingCreate] = useState(false);
  const createFileInputRef = useRef<HTMLInputElement>(null);

  // Tin nhắn trả lời trong modal ticket
  const [replyMessage, setReplyMessage] = useState('');
  const [replyFiles, setReplyFiles] = useState<File[]>([]);
  const [replyPreviews, setReplyPreviews] = useState<{ url: string; name: string; size: string; isImage: boolean }[]>([]);
  const replyFileInputRef = useRef<HTMLInputElement>(null);
  const [isSendingReply, setIsSendingReply] = useState(false);

  // Lightbox xem ảnh toàn màn hình
  const [lightboxImageUrl, setLightboxImageUrl] = useState<string | null>(null);
  const [lightboxCaption, setLightboxCaption] = useState<string>('');

  // Đánh giá sao CSAT khi ticket được RESOLVED / CLOSED
  const [csatRating, setCsatRating] = useState<number>(5);
  const [csatHover, setCsatHover] = useState<number>(0);
  const [csatComment, setCsatComment] = useState<string>('');
  const [isSubmittingCsat, setIsSubmittingCsat] = useState<boolean>(false);
  const [csatSuccess, setCsatSuccess] = useState<boolean>(false);

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

  // Thông báo âm thanh nhẹ nhàng
  const playNotificationChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch {}
  };

  // Tự động thu thập thông tin môi trường lỗi (Device & Environment Context)
  const getAutoErrorContext = () => {
    return JSON.stringify({
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
      screenResolution: typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : 'Desktop',
      platform: typeof navigator !== 'undefined' ? navigator.platform : 'Win32',
      url: typeof window !== 'undefined' ? window.location.href : '',
      timestamp: new Date().toISOString(),
      userEmail: currentUser?.email || 'lecturer@uth.edu.vn',
      userRole: currentUser?.role || 'lecturer'
    });
  };

  // Lắng nghe sự kiện Paste Clipboard (Ctrl + V) để bắt ảnh màn hình lỗi
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      const pastedImageFiles: File[] = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            const fileName = `screenshot_error_${Date.now()}_${i + 1}.png`;
            const file = new File([blob], fileName, { type: blob.type });
            pastedImageFiles.push(file);
          }
        }
      }

      if (pastedImageFiles.length > 0) {
        if (selectedTicket) {
          appendReplyFiles(pastedImageFiles);
        } else if (activeTab === 'create_ticket') {
          appendCreateFiles(pastedImageFiles);
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [activeTab, selectedTicket]);

  const appendCreateFiles = (newFiles: File[]) => {
    const combined = [...createFiles, ...newFiles].slice(0, 5);
    setCreateFiles(combined);

    const previews = combined.map((f) => ({
      url: URL.createObjectURL(f),
      name: f.name,
      size: `${(f.size / 1024).toFixed(1)} KB`,
      isImage: f.type.startsWith('image/')
    }));
    setCreatePreviews(previews);
  };

  const removeCreateFile = (index: number) => {
    const updatedFiles = createFiles.filter((_, i) => i !== index);
    setCreateFiles(updatedFiles);
    const updatedPreviews = createPreviews.filter((_, i) => i !== index);
    setCreatePreviews(updatedPreviews);
  };

  const appendReplyFiles = (newFiles: File[]) => {
    const combined = [...replyFiles, ...newFiles].slice(0, 5);
    setReplyFiles(combined);

    const previews = combined.map((f) => ({
      url: URL.createObjectURL(f),
      name: f.name,
      size: `${(f.size / 1024).toFixed(1)} KB`,
      isImage: f.type.startsWith('image/')
    }));
    setReplyPreviews(previews);
  };

  const removeReplyFile = (index: number) => {
    const updatedFiles = replyFiles.filter((_, i) => i !== index);
    setReplyFiles(updatedFiles);
    const updatedPreviews = replyPreviews.filter((_, i) => i !== index);
    setReplyPreviews(updatedPreviews);
  };

  // Tải danh mục và bài viết FAQ từ máy chủ
  useEffect(() => {
    fetchFAQData();
    fetchTickets();
  }, [currentUser?.email, currentUser?.id]);

  // Smart Polling: Khi ở tab "my_tickets" và KHÔNG mở phiếu, cập nhật danh sách mỗi 5s
  useEffect(() => {
    if (activeTab === 'my_tickets' && !selectedTicket) {
      void fetchTickets(true);
      const interval = setInterval(() => {
        void fetchTickets(true);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [activeTab, !selectedTicket, currentUser?.email, currentUser?.id]);

  // Smart Polling: Khi đang mở một ticket, tự động cập nhật tin nhắn & trạng thái mỗi 4s
  useEffect(() => {
    if (!selectedTicket?.id) {
      selectedTicketIdRef.current = null;
      return;
    }
    const ticketId = selectedTicket.id;
    selectedTicketIdRef.current = ticketId;

    void fetchTicketDetail(ticketId, true);

    const interval = setInterval(() => {
      if (selectedTicketIdRef.current === ticketId) {
        void fetchTicketDetail(ticketId, true);
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [selectedTicket?.id]);

  const fetchTicketDetail = async (ticketId: string, silent = false) => {
    if (selectedTicketIdRef.current !== ticketId) return;
    if (isFetchingDetailRef.current) return;
    isFetchingDetailRef.current = true;
    try {
      const headers: Record<string, string> = {
        'x-user-id': currentUser?.id || 'usr-lec-001',
        'x-user-email': currentUser?.email || 'nguyentann0804@gmail.com',
        'x-user-role': (currentUser?.role || 'lecturer').toUpperCase(),
        'x-user-tier': currentUser?.planTier || 'PRO'
      };
      const token = localStorage.getItem('quizgen_auth_token') || localStorage.getItem('quizgen_token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const res = await fetch(`${API_BASE}/support/tickets/${ticketId}`, { headers });
      if (res.ok) {
        if (selectedTicketIdRef.current !== ticketId) return; // Loại bỏ phản hồi trễ nếu người dùng đã đổi phiếu
        const data: SupportTicket = await res.json();
        setSelectedTicket((prev) => {
          if (!prev || selectedTicketIdRef.current !== data.id) return prev; // Không ghi đè hoặc tự chọn nếu đã quay lại danh sách
          const oldMsgCount = prev.messages?.length || 0;
          const newMsgCount = data.messages?.length || 0;
          if (newMsgCount > oldMsgCount) {
            playNotificationChime();
          }
          return data;
        });
        // Đồng bộ trạng thái tức thời sang danh sách tickets
        setTickets((prevList) =>
          prevList.map((t) => (t.id === data.id ? { ...t, status: data.status, updated_at: data.updated_at } : t))
        );
      }
    } catch {} finally {
      isFetchingDetailRef.current = false;
    }
  };

  const handleSelectTicket = (t: SupportTicket) => {
    selectedTicketIdRef.current = t.id;
    setSelectedTicket(t); // Mở ngay lập tức (Optimistic), xóa độ trễ lag
    void fetchTicketDetail(t.id, false);
  };

  const handleBackToList = () => {
    selectedTicketIdRef.current = null;
    setSelectedTicket(null);
  };

  // Gợi ý AI khi nhập mô tả
  useEffect(() => {
    if (formDescription.length > 15) {
      const lower = formDescription.toLowerCase();
      if (lower.includes('omr') || lower.includes('in') || lower.includes('a4') || lower.includes('lệch')) {
        setAiTip('💡 Mẹo in ấn OMR: Khi in file PDF trắc nghiệm, luôn chọn tỷ lệ Actual Size (100%) và khổ giấy A4 để máy in không làm lệch tọa độ ô tròn.');
      } else if (lower.includes('latex') || lower.includes('toán') || lower.includes('font') || lower.includes('vỡ')) {
        setAiTip('💡 Mẹo công thức LaTeX: QuizGen AI đã tích hợp bộ làm sạch Unicode học thuật tự động cho Word (.docx), bạn có thể xuất thử tệp PDF Vector để đảm bảo chuẩn mỹ thuật tuyệt đối.');
      } else if (lower.includes('vietqr') || lower.includes('tiền') || lower.includes('pro') || lower.includes('thanh toán')) {
        setAiTip('💡 Mẹo VietQR: Giao dịch được duyệt tự động trong 3 giây. Vui lòng đảm bảo giữ đúng cú pháp ORDER_xxxxxx trong nội dung chuyển khoản.');
      } else {
        setAiTip(null);
      }
    } else {
      setAiTip(null);
    }
  }, [formDescription]);

  const fetchFAQData = async () => {
    setIsLoading(true);
    try {
      const catRes = await fetch(`${API_BASE}/support/faq/categories`);
      if (catRes.ok) {
        const catData = await catRes.json();
        setCategories(catData);
      } else {
        setCategories([]);
      }

      const artRes = await fetch(`${API_BASE}/support/faq/articles`);
      if (artRes.ok) {
        const artData = await artRes.json();
        setArticles(artData);
      } else {
        setArticles([]);
      }
    } catch {
      setCategories([]);
      setArticles([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTickets = async (silent = false) => {
    if (isFetchingTicketsRef.current) return;
    isFetchingTicketsRef.current = true;
    if (!silent) setIsRefreshingTickets(true);
    try {
      const headers: Record<string, string> = {
        'x-user-id': currentUser?.id || 'usr-lec-001',
        'x-user-email': currentUser?.email || 'nguyentann0804@gmail.com',
        'x-user-role': (currentUser?.role || 'lecturer').toUpperCase(),
        'x-user-tier': currentUser?.planTier || 'PRO'
      };
      const token = localStorage.getItem('quizgen_auth_token') || localStorage.getItem('quizgen_token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const res = await fetch(`${API_BASE}/support/tickets`, { headers });
      if (res.ok) {
        const data = await res.json();
        setTickets(Array.isArray(data) ? data : []);
      }
    } catch {
      // Giữ nguyên danh sách hiện tại nếu polling gặp lỗi tạm thời
    } finally {
      if (!silent) setIsRefreshingTickets(false);
      isFetchingTicketsRef.current = false;
    }
  };

  const formatApiErrorMessage = (detail: any): string => {
    if (!detail) return 'Không thể tạo phiếu hỗ trợ, vui lòng thử lại.';
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) {
      return detail
        .map((item) => {
          if (typeof item === 'string') return item;
          if (item && typeof item === 'object') {
            const field = Array.isArray(item.loc) ? item.loc[item.loc.length - 1] : '';
            const msg = item.msg || item.message || JSON.stringify(item);
            return field ? `${field}: ${msg}` : msg;
          }
          return String(item);
        })
        .join('; ');
    }
    if (typeof detail === 'object') {
      return detail.msg || detail.message || JSON.stringify(detail);
    }
    return String(detail);
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formSubject || !formDescription) return;

    setIsSubmitting(true);
    setSubmitErrorMessage(null);
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-user-id': currentUser?.id || 'usr-lec-001',
        'x-user-email': currentUser?.email || 'lecturer@uth.edu.vn',
        'x-user-role': (currentUser?.role || 'lecturer').toUpperCase(),
        'x-user-tier': currentUser?.planTier || 'PRO'
      };

      const payload = {
        subject: formSubject,
        description: formDescription,
        category: formCategory,
        priority: formPriority,
        user_tier: currentUser?.planTier || 'PRO',
        error_context_json: getAutoErrorContext()
      };

      const res = await fetch(`${API_BASE}/support/tickets`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const newTicket = await res.json();

        // Nếu có ảnh/tệp đính kèm, upload ngay
        if (createFiles.length > 0) {
          const formData = new FormData();
          createFiles.forEach((f) => formData.append('files', f));

          await fetch(`${API_BASE}/support/tickets/${newTicket.id}/attachments`, {
            method: 'POST',
            headers: {
              'x-user-id': currentUser?.id || 'usr-lec-001',
              'x-user-email': currentUser?.email || 'lecturer@uth.edu.vn',
              'x-user-role': (currentUser?.role || 'lecturer').toUpperCase()
            },
            body: formData
          });
        }

        setSubmitSuccess(true);
        setFormSubject('');
        setFormDescription('');
        setCreateFiles([]);
        setCreatePreviews([]);
        // Đưa phiếu mới vào danh sách ngay tức thì để hiển thị ngay
        setTickets((prev) => [newTicket, ...prev.filter((t) => t.id !== newTicket.id)]);
        setActiveTab('my_tickets');
        handleBackToList();
        void fetchTickets(false);
      } else {
        const errJson = await res.json().catch(() => null);
        setSubmitErrorMessage(formatApiErrorMessage(errJson?.detail));
      }
    } catch (err: any) {
      setSubmitErrorMessage(err?.message || 'Lỗi kết nối máy chủ hỗ trợ.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendReply = async () => {
    if (!selectedTicket || (!replyMessage.trim() && replyFiles.length === 0)) return;

    setIsSendingReply(true);
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-user-id': currentUser?.id || 'usr-lec-001',
        'x-user-email': currentUser?.email || 'lecturer@uth.edu.vn',
        'x-user-role': (currentUser?.role || 'lecturer').toUpperCase()
      };

      const msgBody = replyMessage.trim() || 'Đã gửi ảnh/tệp minh chứng bổ sung.';
      const res = await fetch(`${API_BASE}/support/tickets/${selectedTicket.id}/messages`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ message_body: msgBody })
      });

      if (res.ok) {
        const newMsg = await res.json();

        // Upload kèm file nếu có
        if (replyFiles.length > 0) {
          const formData = new FormData();
          replyFiles.forEach((f) => formData.append('files', f));
          formData.append('message_id', newMsg.id);

          const attRes = await fetch(`${API_BASE}/support/tickets/${selectedTicket.id}/attachments`, {
            method: 'POST',
            headers: {
              'x-user-id': currentUser?.id || 'usr-lec-001',
              'x-user-email': currentUser?.email || 'lecturer@uth.edu.vn',
              'x-user-role': (currentUser?.role || 'lecturer').toUpperCase()
            },
            body: formData
          });
          if (attRes.ok) {
            const uploadedAtts = await attRes.json();
            newMsg.attachments = uploadedAtts;
          }
        }

        const updated = {
          ...selectedTicket,
          messages: [...(selectedTicket.messages || []), newMsg]
        };
        setSelectedTicket(updated);
        setReplyMessage('');
        setReplyFiles([]);
        setReplyPreviews([]);
      }
    } catch {} finally {
      setIsSendingReply(false);
    }
  };

  const handleSubmitCsatFeedback = async () => {
    if (!selectedTicket) return;
    setIsSubmittingCsat(true);
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-user-id': currentUser?.id || 'usr-lec-001',
        'x-user-email': currentUser?.email || 'nguyentann0804@gmail.com',
        'x-user-role': (currentUser?.role || 'lecturer').toUpperCase(),
      };
      const token = localStorage.getItem('quizgen_auth_token') || localStorage.getItem('quizgen_token');
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE}/support/tickets/${selectedTicket.id}/feedback`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          rating_stars: csatRating,
          feedback_text: csatComment.trim() || 'Hài lòng với tốc độ và giải pháp của kỹ thuật viên QuizGen AI.',
          resolved_efficiently: true,
        }),
      });
      if (res.ok) {
        const fbData = await res.json();
        setCsatSuccess(true);
        setSelectedTicket((prev) => (prev ? { ...prev, feedback: fbData } : null));
      }
    } catch (e) {
      console.error('Lỗi gửi đánh giá CSAT:', e);
    } finally {
      setIsSubmittingCsat(false);
    }
  };

  const filteredArticles = articles.filter(
    (a) =>
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.tags && a.tags.toLowerCase().includes(searchQuery.toLowerCase())) ||
      a.content_markdown.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 h-full overflow-y-auto bg-slate-50/70 text-slate-800 flex flex-col font-sans select-text">
      {/* ─── Top Academic Header (Matching Notion / Canvas UI Style) ─── */}
      <header className="px-6 py-5 border-b border-slate-200/90 bg-white/90 backdrop-blur-md sticky top-0 z-30 shadow-2xs">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-teal-50 border border-teal-200 text-[#008689] flex items-center justify-center shadow-2xs shrink-0">
              <LifeBuoy className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-extrabold tracking-tight text-slate-900">
                  Trung Tâm Hỗ Trợ &amp; Cẩm Nang Học Thuật
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  SLA Active
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Giải quyết trực tiếp sự cố bóc tách giáo trình, công thức LaTeX, in ấn phiếu OMR và tài khoản
              </p>
            </div>
          </div>

          {/* Tab Switcher */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200/80">
            <button
              onClick={() => {
                setActiveTab('faq');
                handleBackToList();
              }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'faq'
                  ? 'bg-white text-[#008689] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Cẩm nang FAQ</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('my_tickets');
                handleBackToList();
                void fetchTickets();
              }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all relative cursor-pointer ${
                activeTab === 'my_tickets'
                  ? 'bg-white text-[#008689] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Phiếu của tôi</span>
              {tickets.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-[#008689] text-white text-[10px] font-black">
                  {tickets.length}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                setActiveTab('create_ticket');
                handleBackToList();
              }}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'create_ticket'
                  ? 'bg-[#008689] text-white shadow-xs'
                  : 'bg-teal-50 text-[#008689] border border-teal-200/80 hover:bg-teal-100/60'
              }`}
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Tạo phiếu mới</span>
            </button>
          </div>
        </div>
      </header>

      {/* ─── Main Content Container ─── */}
      <div className="flex-1 max-w-6xl w-full mx-auto p-6 space-y-6">
        {/* --- TAB 1: FAQ KNOWLEDGE BASE --- */}
        {activeTab === 'faq' && (
          <div className="space-y-6">
            {/* Search Banner */}
            <div className="rounded-2xl bg-white border border-slate-200 p-6 text-center space-y-3 shadow-2xs">
              <h2 className="text-base font-extrabold text-slate-900">
                Tra cứu cẩm nang xử lý sự cố &amp; hướng dẫn chuẩn học thuật
              </h2>
              <p className="text-xs text-slate-500 max-w-xl mx-auto">
                Nhập từ khóa như: <span className="font-semibold text-[#008689]">in OMR A4</span>, <span className="font-semibold text-[#008689]">công thức LaTeX</span>, <span className="font-semibold text-[#008689]">VietQR</span>, <span className="font-semibold text-[#008689]">Canvas LMS</span>
              </p>
              <div className="max-w-xl mx-auto relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm kiếm giải pháp hoặc bài viết hướng dẫn..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#008689] focus:bg-white transition-all shadow-2xs"
                />
              </div>
            </div>

            {/* Selected Article Detail View */}
            {selectedArticle ? (
              <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs space-y-4">
                <button
                  onClick={() => setSelectedArticle(null)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#008689] hover:underline cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Quay lại cẩm nang</span>
                </button>
                <h2 className="text-lg font-extrabold text-slate-900">{selectedArticle.title}</h2>
                <div className="flex items-center gap-4 text-xs text-slate-400 pb-4 border-b border-slate-100">
                  <span>Lượt xem: {selectedArticle.view_count}</span>
                  <span>Đánh giá hữu ích: {selectedArticle.helpful_count} ⭐</span>
                  {selectedArticle.tags && (
                    <span className="text-[#008689] font-mono font-medium">#{selectedArticle.tags}</span>
                  )}
                </div>
                <div className="text-slate-700 text-xs sm:text-sm leading-relaxed whitespace-pre-line py-2">
                  {selectedArticle.content_markdown}
                </div>
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-500">Bài viết này có giúp Thầy/Cô giải quyết sự cố không?</span>
                  <button
                    onClick={() => alert('Cảm ơn Thầy/Cô đã gửi phản hồi đánh giá!')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-50 text-[#008689] hover:bg-teal-100 text-xs font-bold border border-teal-200 cursor-pointer"
                  >
                    <ThumbsUp className="w-3.5 h-3.5" />
                    <span>Hữu ích ({selectedArticle.helpful_count + 1})</span>
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* 4 Core Categories Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {categories.map((cat) => (
                    <div
                      key={cat.id}
                      onClick={() => setSearchQuery(cat.name.split('.')[1]?.trim() || cat.name)}
                      className="p-5 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200/90 hover:border-[#008689]/60 transition-all cursor-pointer group shadow-2xs"
                    >
                      <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-[#008689] mb-3 group-hover:scale-105 transition-transform">
                        {cat.icon === 'Download' ? (
                          <Download className="w-5 h-5" />
                        ) : cat.icon === 'CreditCard' ? (
                          <CreditCard className="w-5 h-5" />
                        ) : cat.icon === 'Cpu' ? (
                          <Cpu className="w-5 h-5" />
                        ) : (
                          <FileText className="w-5 h-5" />
                        )}
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 group-hover:text-[#008689] transition-colors">
                        {cat.name}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">{cat.description}</p>
                      <span className="inline-block mt-3 text-[11px] font-mono text-[#008689] font-bold">
                        {cat.articles_count} bài viết chuyên sâu →
                      </span>
                    </div>
                  ))}
                </div>

                {/* Articles List */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Bài viết cẩm nang phổ biến ({filteredArticles.length})
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {filteredArticles.map((art) => (
                      <div
                        key={art.id}
                        onClick={() => setSelectedArticle(art)}
                        className="p-4 rounded-xl bg-white hover:bg-slate-50 border border-slate-200/80 hover:border-[#008689]/50 transition-all cursor-pointer group flex items-start justify-between gap-3 shadow-2xs"
                      >
                        <div className="space-y-1">
                          <h4 className="text-xs font-bold text-slate-900 group-hover:text-[#008689] transition-colors">
                            {art.title}
                          </h4>
                          <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">{art.content_markdown}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 group-hover:text-[#008689] transition-all shrink-0 mt-1" />
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* --- TAB 2: MY TICKETS (LUỒNG GIAO TIẾP TỨC THÌ) --- */}
        {activeTab === 'my_tickets' && (
          <div>
            {selectedTicket ? (
              // Chi tiết hội thoại ticket 2 chiều
              <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs flex flex-col gap-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <button
                    onClick={handleBackToList}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-[#008689] transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Quay lại danh sách phiếu</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1.5 text-[11px] text-emerald-700 font-mono bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                      Live Chat Sync (3.5s)
                    </span>
                  </div>
                </div>

                {/* Ticket Header & SLA */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200/70">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-xs font-bold text-[#008689] bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-md">
                        {selectedTicket.ticket_code}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          selectedTicket.status === 'RESOLVED'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : selectedTicket.status === 'IN_PROGRESS'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}
                      >
                        {selectedTicket.status}
                      </span>
                      <span className="text-xs text-slate-500">Mức độ: <strong>{selectedTicket.priority}</strong></span>
                    </div>
                    <h2 className="text-base font-extrabold text-slate-900 mt-1">{selectedTicket.subject}</h2>
                  </div>

                  <div className="text-right text-xs text-slate-500">
                    <p className="flex items-center gap-1 justify-end text-amber-700 font-bold">
                      <Clock className="w-3.5 h-3.5" /> Cam kết phản hồi SLA:
                    </p>
                    <p className="font-mono text-slate-700 mt-0.5">
                      Trước {new Date(selectedTicket.sla_first_response_due).toLocaleTimeString('vi-VN')} ({new Date(selectedTicket.sla_first_response_due).toLocaleDateString('vi-VN')})
                    </p>
                  </div>
                </div>

                {/* Luồng tin nhắn đàm thoại */}
                <div className="py-2 space-y-3.5 max-h-[460px] overflow-y-auto pr-2 scrollbar-thin">
                  {/* Mô tả ban đầu */}
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span className="font-bold text-slate-800 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-[#008689]" /> Mô tả sự cố ban đầu
                      </span>
                      <span className="font-mono">{new Date(selectedTicket.created_at).toLocaleString('vi-VN')}</span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-700 whitespace-pre-line leading-relaxed">
                      {selectedTicket.description}
                    </p>

                    {/* Tệp đính kèm ban đầu của ticket nếu có */}
                    {selectedTicket.attachments && selectedTicket.attachments.length > 0 && (
                      <div className="pt-2 border-t border-slate-200/60 space-y-1.5">
                        <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                          <Paperclip className="w-3 h-3 text-[#008689]" /> Tệp đính kèm khi mở phiếu:
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {selectedTicket.attachments.map((att) => {
                            const isImg = att.mime_type.startsWith('image/');
                            return isImg ? (
                              <div
                                key={att.id}
                                onClick={() => {
                                  setLightboxImageUrl(att.file_url || `/api/v1/support/attachments/${att.file_name}`);
                                  setLightboxCaption(att.file_name);
                                }}
                                className="relative rounded-lg overflow-hidden border border-slate-200 group cursor-pointer hover:border-[#008689] transition-colors shadow-2xs"
                              >
                                <img
                                  src={att.file_url || `/api/v1/support/attachments/${att.file_name}`}
                                  alt={att.file_name}
                                  className="w-24 h-20 object-cover rounded-lg group-hover:scale-105 transition-transform"
                                />
                                <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                  <Maximize2 className="w-4 h-4 text-white" />
                                </div>
                              </div>
                            ) : (
                              <a
                                key={att.id}
                                href={att.file_url || `/api/v1/support/attachments/${att.file_name}`}
                                download
                                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-[#008689] text-xs text-slate-700 transition-colors shadow-2xs"
                              >
                                <FileText className="w-3.5 h-3.5 text-amber-500" />
                                <span className="max-w-[150px] truncate">{att.file_name}</span>
                                <Download className="w-3 h-3 text-slate-400" />
                              </a>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Khung trò chuyện Zalo / Messenger 2 bên */}
                  <div className="space-y-4 max-h-[460px] overflow-y-auto p-4 bg-slate-50/70 rounded-2xl border border-slate-200/80">
                    {selectedTicket.messages?.map((msg) => {
                      const isMe = msg.sender_role === 'USER' || msg.sender_id === (currentUser?.id || 'usr-lec-001');
                      const text = msg.message_body || (msg as any).content || '';

                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                        >
                          <div className="flex items-center gap-1.5 mb-1 px-1 text-[11px] text-slate-500">
                            {!isMe ? (
                              <>
                                <ShieldCheck className="w-3.5 h-3.5 text-[#008689]" />
                                <span className="font-bold text-slate-800">Kỹ sư QuizGen AI ({msg.sender_name})</span>
                                <span className="text-[10px] text-slate-400">• {formatVnDateTime(msg.created_at)}</span>
                              </>
                            ) : (
                              <>
                                <span className="text-[10px] text-slate-400">{formatVnDateTime(msg.created_at)} •</span>
                                <span className="font-bold text-[#008689]">Tôi (Giảng viên)</span>
                              </>
                            )}
                          </div>

                          <div
                            className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm max-w-[80%] leading-relaxed shadow-2xs whitespace-pre-line ${
                              isMe
                                ? 'bg-[#008689] text-white rounded-tr-xs'
                                : 'bg-white text-slate-800 rounded-tl-xs border border-slate-200/90'
                            }`}
                          >
                            <p>{text}</p>

                            {/* Tệp đính kèm trong tin nhắn */}
                            {msg.attachments && msg.attachments.length > 0 && (
                              <div className="mt-2.5 pt-2 border-t border-white/20 flex flex-wrap gap-2">
                                {msg.attachments.map((att) => {
                                  const isImg = att.mime_type.startsWith('image/');
                                  return isImg ? (
                                    <div
                                      key={att.id}
                                      onClick={() => {
                                        setLightboxImageUrl(att.file_url || `/api/v1/support/attachments/${att.file_name}`);
                                        setLightboxCaption(att.file_name);
                                      }}
                                      className="relative rounded-lg overflow-hidden border border-slate-200/60 group cursor-pointer hover:border-white transition-colors shadow-2xs"
                                    >
                                      <img
                                        src={att.file_url || `/api/v1/support/attachments/${att.file_name}`}
                                        alt={att.file_name}
                                        className="w-24 h-18 object-cover rounded-lg group-hover:scale-105 transition-transform"
                                      />
                                      <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                        <Maximize2 className="w-4 h-4 text-white" />
                                      </div>
                                    </div>
                                  ) : (
                                    <a
                                      key={att.id}
                                      href={att.file_url || `/api/v1/support/attachments/${att.file_name}`}
                                      download
                                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/90 text-slate-800 text-[11px] font-medium transition-colors shadow-2xs"
                                    >
                                      <FileText className="w-3.5 h-3.5 text-amber-500" />
                                      <span className="max-w-[120px] truncate">{att.file_name}</span>
                                      <Download className="w-3 h-3 text-slate-400" />
                                    </a>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* ─── KHỐI ĐÁNH GIÁ CHẤT LƯỢNG HỖ TRỢ (CSAT 5 SAO) KHI PHIẾU ĐÃ GIẢI QUYẾT ─── */}
                  {(selectedTicket.status === 'RESOLVED' || selectedTicket.status === 'CLOSED') && (
                    <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/70 border border-amber-200 shadow-2xs space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                          <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                            Đánh giá chất lượng xử lý sự cố (CSAT)
                          </h4>
                        </div>
                        <span className="text-[11px] font-bold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-full">
                          {csatSuccess || selectedTicket.feedback ? 'Đã hoàn tất đánh giá' : 'Tối đa 5 sao'}
                        </span>
                      </div>

                      {csatSuccess || selectedTicket.feedback ? (
                        <div className="p-3.5 bg-white border border-amber-200 rounded-xl space-y-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-800">Điểm đánh giá:</span>
                            <div className="flex items-center gap-1 text-amber-500">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`w-4 h-4 ${
                                    star <= ((selectedTicket.feedback?.rating_stars) || csatRating)
                                      ? 'fill-amber-400 text-amber-500'
                                      : 'text-slate-300'
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-xs font-bold text-amber-600">
                              ({(selectedTicket.feedback?.rating_stars) || csatRating}/5 sao)
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 italic">
                            "{selectedTicket.feedback?.feedback_text || csatComment || 'Hài lòng với tốc độ giải quyết sự cố của kỹ thuật viên QuizGen AI.'}"
                          </p>
                          <p className="text-[11px] text-emerald-600 font-medium flex items-center gap-1 pt-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Cảm ơn Thầy/Cô đã đánh giá, ý kiến giúp QuizGen AI nâng cao chất lượng phục vụ!
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3 bg-white p-3.5 rounded-xl border border-amber-200/90">
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5">
                              Thầy/Cô hài lòng thế nào với sự hỗ trợ của kỹ thuật viên?
                            </label>
                            <div className="flex items-center gap-2">
                              {[1, 2, 3, 4, 5].map((star) => {
                                const active = star <= (csatHover || csatRating);
                                return (
                                  <button
                                    key={star}
                                    type="button"
                                    onClick={() => setCsatRating(star)}
                                    onMouseEnter={() => setCsatHover(star)}
                                    onMouseLeave={() => setCsatHover(0)}
                                    className="p-1 transition-transform hover:scale-125 cursor-pointer"
                                  >
                                    <Star
                                      className={`w-6 h-6 transition-colors ${
                                        active
                                          ? 'text-amber-500 fill-amber-400'
                                          : 'text-slate-300 hover:text-amber-300'
                                      }`}
                                    />
                                  </button>
                                );
                              })}
                              <span className="text-xs font-bold text-amber-700 ml-2">
                                {csatRating === 5
                                  ? 'Rất hài lòng (5 sao)'
                                  : csatRating === 4
                                  ? 'Hài lòng (4 sao)'
                                  : csatRating === 3
                                  ? 'Bình thường (3 sao)'
                                  : csatRating === 2
                                  ? 'Chưa hài lòng (2 sao)'
                                  : 'Rất không hài lòng (1 sao)'}
                              </span>
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                              Nhận xét đóng góp ý kiến:
                            </label>
                            <textarea
                              rows={2}
                              value={csatComment}
                              onChange={(e) => setCsatComment(e.target.value)}
                              placeholder="Nhập cảm nhận của Thầy/Cô về tốc độ hỗ trợ, độ chính xác của giải pháp..."
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#008689] focus:bg-white resize-none"
                            />
                          </div>

                          <div className="flex items-center justify-end">
                            <button
                              type="button"
                              onClick={handleSubmitCsatFeedback}
                              disabled={isSubmittingCsat}
                              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold text-xs transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                            >
                              <Star className="w-3.5 h-3.5 fill-white" />
                              <span>{isSubmittingCsat ? 'Đang gửi...' : 'Gửi Đánh Giá CSAT'}</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Khay xem trước ảnh lỗi sắp gửi trong phản hồi */}
                {replyPreviews.length > 0 && (
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2 overflow-x-auto">
                    <span className="text-[10px] text-slate-500 font-bold uppercase shrink-0">Tệp đính kèm ({replyPreviews.length}):</span>
                    {replyPreviews.map((p, idx) => (
                      <div key={idx} className="relative group shrink-0 rounded-lg overflow-hidden border border-slate-200 bg-white p-1 flex items-center gap-2 shadow-2xs">
                        {p.isImage ? (
                          <img src={p.url} alt={p.name} className="w-10 h-10 object-cover rounded" />
                        ) : (
                          <FileText className="w-6 h-6 text-amber-500 mx-1" />
                        )}
                        <div className="text-[10px] max-w-[100px] truncate text-slate-700 font-medium">
                          {p.name}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeReplyFile(idx)}
                          className="p-1 text-slate-400 hover:text-rose-500 cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Khung gửi phản hồi 2 chiều & Đính kèm */}
                <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                  <input
                    type="file"
                    ref={replyFileInputRef}
                    multiple
                    accept="image/*,.pdf,.docx,.xlsx,.zip"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        appendReplyFiles(Array.from(e.target.files));
                      }
                    }}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => replyFileInputRef.current?.click()}
                    title="Đính kèm ảnh chụp lỗi hoặc tệp minh chứng (Hỗ trợ Ctrl+V)"
                    className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-[#008689] border border-slate-200 transition-colors cursor-pointer shrink-0"
                  >
                    <Paperclip className="w-4 h-4" />
                  </button>

                  <input
                    type="text"
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendReply();
                      }
                    }}
                    placeholder="Gửi phản hồi tới kỹ sư... (Bấm Win+Shift+S rồi Ctrl+V để dán ảnh chụp lỗi)"
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#008689] focus:bg-white"
                  />
                  <button
                    onClick={handleSendReply}
                    disabled={isSendingReply || (!replyMessage.trim() && replyFiles.length === 0)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#008689] hover:bg-[#006d70] text-white font-bold text-xs transition-all shadow-xs disabled:opacity-50 cursor-pointer shrink-0"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isSendingReply ? 'Đang gửi...' : 'Gửi'}</span>
                  </button>
                </div>
              </div>
            ) : (
              // Bảng danh sách ticket (XÓA DỮ LIỆU MẪU - EMPTY STATE HỌC THUẬT)
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900">Danh sách phiếu hỗ trợ của bạn</h3>
                    <button
                      onClick={() => fetchTickets(false)}
                      disabled={isRefreshingTickets}
                      className="p-1 text-slate-400 hover:text-[#008689] transition-colors rounded-lg hover:bg-slate-100 cursor-pointer"
                      title="Làm mới danh sách"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingTickets ? 'animate-spin text-[#008689]' : ''}`} />
                    </button>
                  </div>
                  <button
                    onClick={() => setActiveTab('create_ticket')}
                    className="flex items-center gap-1.5 text-xs text-[#008689] hover:underline font-bold cursor-pointer"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>Tạo phiếu mới</span>
                  </button>
                </div>

                {tickets.length === 0 ? (
                  // Empty State Học Thuật Tinh Gọn (Zero Mock Data)
                  <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-12 text-center space-y-3 shadow-2xs">
                    <div className="w-14 h-14 rounded-2xl bg-teal-50 border border-teal-100 text-[#008689] flex items-center justify-center mx-auto shadow-2xs">
                      <Inbox className="w-7 h-7" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-extrabold text-slate-800">Chưa có phiếu hỗ trợ nào</h4>
                      <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                        Mọi thắc mắc kỹ thuật về bóc tách giáo trình, công thức toán LaTeX, in ấn phiếu OMR hoặc tài khoản sẽ được Đội ngũ Kỹ sư tiếp nhận và xử lý theo cam kết SLA tại đây.
                      </p>
                    </div>
                    <button
                      onClick={() => setActiveTab('create_ticket')}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#008689] hover:bg-[#006d70] text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>Tạo phiếu hỗ trợ ngay</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {tickets.map((t) => (
                      <div
                        key={t.id}
                        onClick={() => handleSelectTicket(t)}
                        className="bg-white hover:bg-slate-50 border border-slate-200/90 hover:border-[#008689]/60 rounded-xl p-4.5 cursor-pointer transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 group shadow-2xs"
                      >
                        <div className="flex items-start gap-3.5">
                          <div className="font-mono text-xs font-bold text-[#008689] bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-md mt-0.5">
                            {t.ticket_code}
                          </div>
                          <div>
                            <h4 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-[#008689] transition-colors">
                              {t.subject}
                            </h4>
                            <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{t.description}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3.5 shrink-0">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              t.status === 'RESOLVED'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : t.status === 'IN_PROGRESS'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-blue-50 text-blue-700 border border-blue-200'
                            }`}
                          >
                            {t.status}
                          </span>
                          <span className="text-xs text-slate-400 font-mono">
                            {new Date(t.created_at).toLocaleDateString('vi-VN')}
                          </span>
                          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 group-hover:text-[#008689] transition-all" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* --- TAB 3: CREATE TICKET (KHAY ẢNH LỖI ĐẦY ĐỦ TIỆN NGHI) --- */}
        {activeTab === 'create_ticket' && (
          <div className="max-w-3xl mx-auto bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-2xs space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <LifeBuoy className="w-5 h-5 text-[#008689]" />
                <span>Tạo Phiếu Hỗ Trợ Kỹ Thuật &amp; Báo Lỗi Hệ Thống</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Kỹ sư QuizGen AI cam kết phản hồi trong vòng{' '}
                <strong className="text-[#008689]">
                  {currentUser?.planTier === 'ENTERPRISE' ? '1 giờ' : '4 giờ'}
                </strong>{' '}
                theo tiêu chuẩn chất lượng dịch vụ SLA.
              </p>
            </div>

            {submitSuccess ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-8 text-center my-6 animate-in zoom-in-95 duration-200">
                <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto mb-2 animate-bounce" />
                <h4 className="text-sm font-extrabold text-slate-900">Gửi phiếu hỗ trợ thành công!</h4>
                <p className="text-xs text-slate-600 mt-1">
                  Mã ticket đã được cấp phát. Đang mở luồng trao đổi trực tiếp với Đội ngũ Kỹ sư...
                </p>
              </div>
            ) : (
              <form onSubmit={handleCreateTicket} className="space-y-4 sm:space-y-5">
                {submitErrorMessage && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{typeof submitErrorMessage === 'string' ? submitErrorMessage : formatApiErrorMessage(submitErrorMessage)}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Tiêu đề sự cố / Yêu cầu <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formSubject}
                    onChange={(e) => setFormSubject(e.target.value)}
                    placeholder="VD: Lỗi vỡ font công thức toán khi xuất file Word hoặc lệch lề phiếu OMR"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#008689] focus:bg-white transition-all shadow-2xs"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Phân hệ phát sinh sự cố</label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-[#008689] focus:bg-white"
                    >
                      <option value="EXAM_EXPORT_ERROR">1. Đóng gói &amp; Xuất Word / PDF OMR / Canvas QTI</option>
                      <option value="DOC_PARSING_ERROR">2. Nạp &amp; Bóc tách Giáo trình (PDF/DOCX/OCR)</option>
                      <option value="AI_HALLUCINATION">3. Chất lượng câu hỏi AI &amp; Thang đo Bloom</option>
                      <option value="PAYMENT_BILLING">4. Cổng thanh toán VietQR &amp; Gói cước PRO</option>
                      <option value="ACCOUNT_SECURITY">5. Tài khoản &amp; Đăng nhập Google SSO</option>
                      <option value="FEATURE_REQUEST">6. Đề xuất Tính năng Mới</option>
                      <option value="GENERAL_INQUIRY">7. Hỏi đáp Chung</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Mức độ ưu tiên</label>
                    <select
                      value={formPriority}
                      onChange={(e) => setFormPriority(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-[#008689] focus:bg-white"
                    >
                      <option value="LOW">Thấp (Tư vấn, đóng góp ý kiến)</option>
                      <option value="MEDIUM">Trung bình (Lỗi thông thường)</option>
                      <option value="HIGH">Cao (Ảnh hưởng tiến độ biên soạn đề)</option>
                      <option value="CRITICAL">Khẩn cấp (Trường thi đang chờ in ấn gấp)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Mô tả chi tiết sự cố <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Mô tả cụ thể các bước gây ra lỗi, câu hỏi nào bị ảnh hưởng hoặc mã đề thi đang thao tác..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#008689] focus:bg-white leading-relaxed"
                  />
                </div>

                {/* ─── KHAY ĐÍNH KÈM ẢNH LỖI TIỆN LỢI (HỖ TRỢ CTRL+V & KÉO THẢ) ─── */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4 text-[#008689]" />
                      <span>Ảnh chụp màn hình lỗi &amp; Tệp minh chứng</span>
                    </label>
                    <span className="text-[11px] text-[#008689] font-mono">
                      (Bấm <strong>Win + Shift + S</strong> rồi <strong>Ctrl + V</strong> để dán ảnh)
                    </span>
                  </div>

                  {/* Vùng Dropzone & Chọn Tệp */}
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDraggingCreate(true);
                    }}
                    onDragLeave={() => setIsDraggingCreate(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDraggingCreate(false);
                      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                        appendCreateFiles(Array.from(e.dataTransfer.files));
                      }
                    }}
                    onClick={() => createFileInputRef.current?.click()}
                    className={`p-5 rounded-2xl border-2 border-dashed transition-all text-center cursor-pointer ${
                      isDraggingCreate
                        ? 'border-[#008689] bg-teal-50/50 scale-[1.01]'
                        : 'border-slate-300 hover:border-[#008689] bg-slate-50/60'
                    }`}
                  >
                    <input
                      type="file"
                      ref={createFileInputRef}
                      multiple
                      accept="image/*,.pdf,.docx,.xlsx,.zip"
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          appendCreateFiles(Array.from(e.target.files));
                        }
                      }}
                      className="hidden"
                    />
                    <div className="flex flex-col items-center gap-1.5">
                      <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-[#008689] shadow-2xs">
                        <ImageIcon className="w-5 h-5" />
                      </div>
                      <p className="text-xs font-bold text-slate-800 mt-1">
                        Bấm vào đây để chọn ảnh hoặc kéo thả tệp vào đây
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Hỗ trợ ảnh PNG, JPG, WEBP hoặc tệp Word, PDF, ZIP (Tối đa 5 tệp, 15MB/tệp)
                      </p>
                    </div>
                  </div>

                  {/* Khay hiển thị xem trước (Thumbnail Tray) */}
                  {createPreviews.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2">
                      {createPreviews.map((p, idx) => (
                        <div
                          key={idx}
                          className="relative group rounded-xl overflow-hidden border border-slate-200 bg-white p-2 flex items-center gap-2.5 shadow-2xs"
                        >
                          {p.isImage ? (
                            <img
                              src={p.url}
                              alt={p.name}
                              className="w-12 h-12 object-cover rounded-lg shrink-0 cursor-pointer hover:opacity-90 transition-opacity border border-slate-100"
                              onClick={(e) => {
                                e.stopPropagation();
                                setLightboxImageUrl(p.url);
                                setLightboxCaption(p.name);
                              }}
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shrink-0">
                              <FileText className="w-6 h-6" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-slate-800 truncate">{p.name}</p>
                            <span className="text-[10px] text-slate-400 font-mono">{p.size}</span>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeCreateFile(idx);
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                            title="Xóa tệp này"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Hộp gợi ý tự động của AI */}
                {aiTip && (
                  <div className="bg-teal-50 border border-teal-200 rounded-xl p-3.5 flex items-start gap-3">
                    <Sparkles className="w-4 h-4 text-[#008689] shrink-0 mt-0.5" />
                    <p className="text-xs text-teal-900 leading-relaxed font-medium">{aiTip}</p>
                  </div>
                )}

                {/* Thẻ thông báo tự động thu thập ngữ cảnh môi trường */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center gap-2.5 text-[11px] text-slate-500">
                  <Info className="w-4 h-4 text-[#008689] shrink-0" />
                  <span>
                    Hệ thống tự động ghi nhận phiên bản trình duyệt, độ phân giải màn hình và URL để kỹ thuật viên chẩn đoán lỗi nhanh nhất.
                  </span>
                </div>

                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveTab('faq')}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 cursor-pointer"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#008689] hover:bg-[#006d70] text-white font-bold text-xs transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    <span>{isSubmitting ? 'Đang gửi...' : 'Gửi phiếu hỗ trợ'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>

      {/* ─── Modal Phóng To Ảnh Nguyên Bản Toàn Màn Hình (Lightbox) ─── */}
      {lightboxImageUrl && (
        <ImageLightboxModal
          isOpen={!!lightboxImageUrl}
          imageUrl={lightboxImageUrl}
          imageCaption={lightboxCaption}
          title="Minh chứng Ảnh chụp Sự cố &amp; Lỗi Kỹ thuật"
          onClose={() => {
            setLightboxImageUrl(null);
            setLightboxCaption('');
          }}
        />
      )}
    </div>
  );
};
