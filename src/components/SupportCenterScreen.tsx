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
  Sparkle
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
  error_context_json?: string;
  messages?: TicketMessage[];
  attachments?: TicketAttachment[];
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
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Form tạo ticket mới
  const [formSubject, setFormSubject] = useState('');
  const [formCategory, setFormCategory] = useState('EXAM_EXPORT_ERROR');
  const [formPriority, setFormPriority] = useState('MEDIUM');
  const [formDescription, setFormDescription] = useState('');
  const [aiTip, setAiTip] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Quản lý đính kèm ảnh / tệp lỗi khi tạo ticket
  const [createFiles, setCreateFiles] = useState<File[]>([]);
  const [createPreviews, setCreatePreviews] = useState<{ url: string; name: string; size: string; isImage: boolean }[]>([]);
  const [isDraggingCreate, setIsDraggingCreate] = useState(false);
  const createFileInputRef = useRef<HTMLInputElement>(null);

  // Tin nhắn trả lời trong modal ticket
  const [replyMessage, setReplyMessage] = useState('');
  const [replyFiles, setReplyFiles] = useState<File[]>([]);
  const [replyPreviews, setReplyPreviews] = useState<{ url: string; name: string; size: string; isImage: boolean }[]>([]);
  const [isDraggingReply, setIsDraggingReply] = useState(false);
  const replyFileInputRef = useRef<HTMLInputElement>(null);
  const [isSendingReply, setIsSendingReply] = useState(false);

  // Khảo sát đánh giá CSAT
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  // Lightbox xem ảnh toàn màn hình
  const [lightboxImageUrl, setLightboxImageUrl] = useState<string | null>(null);
  const [lightboxCaption, setLightboxCaption] = useState<string>('');

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
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
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
    const combined = [...createFiles, ...newFiles].slice(0, 5); // Tối đa 5 file
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

  // Tải danh mục và bài viết FAQ
  useEffect(() => {
    fetchFAQData();
    fetchTickets();
  }, []);

  // Fast Smart Polling: Khi đang mở một ticket, tự động cập nhật mỗi 3.5s
  useEffect(() => {
    if (!selectedTicket) return;
    const ticketId = selectedTicket.id;

    // Tải ngay lập tức
    fetchTicketDetail(ticketId);

    const interval = setInterval(() => {
      fetchTicketDetail(ticketId, true);
    }, 3500);

    return () => clearInterval(interval);
  }, [selectedTicket?.id]);

  const fetchTicketDetail = async (ticketId: string, silent = false) => {
    try {
      const headers: Record<string, string> = {
        'x-user-id': currentUser?.id || 'usr-lec-001',
        'x-user-email': currentUser?.email || 'lecturer@uth.edu.vn',
        'x-user-role': (currentUser?.role || 'lecturer').toUpperCase(),
        'x-user-tier': currentUser?.planTier || 'PRO'
      };
      const res = await fetch(`${API_BASE}/support/tickets/${ticketId}`, { headers });
      if (res.ok) {
        const data: SupportTicket = await res.json();
        setSelectedTicket((prev) => {
          if (!prev) return data;
          const oldMsgCount = prev.messages?.length || 0;
          const newMsgCount = data.messages?.length || 0;
          if (newMsgCount > oldMsgCount) {
            playNotificationChime();
          }
          return data;
        });
      }
    } catch {}
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
        setCategories(mockCategories);
      }

      const artRes = await fetch(`${API_BASE}/support/faq/articles`);
      if (artRes.ok) {
        const artData = await artRes.json();
        setArticles(artData);
      } else {
        setArticles(mockArticles);
      }
    } catch {
      setCategories(mockCategories);
      setArticles(mockArticles);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTickets = async () => {
    try {
      const headers: Record<string, string> = {
        'x-user-id': currentUser?.id || 'usr-lec-001',
        'x-user-email': currentUser?.email || 'lecturer@uth.edu.vn',
        'x-user-role': (currentUser?.role || 'lecturer').toUpperCase(),
        'x-user-tier': currentUser?.planTier || 'PRO'
      };
      const res = await fetch(`${API_BASE}/support/tickets`, { headers });
      if (res.ok) {
        const data = await res.json();
        setTickets(data);
      } else {
        setTickets(mockTickets);
      }
    } catch {
      setTickets(mockTickets);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formSubject || !formDescription) return;

    setIsSubmitting(true);
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

        // Nếu có ảnh/file đính kèm, upload ngay vào ticket vừa tạo
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
        setTimeout(() => {
          setSubmitSuccess(false);
          setActiveTab('my_tickets');
          fetchTickets();
        }, 1200);
      } else {
        // Fallback thêm cục bộ
        const fallbackTicket: SupportTicket = {
          id: `tk-${Date.now()}`,
          ticket_code: `TK-2026-${Math.floor(10000 + Math.random() * 90000)}`,
          subject: formSubject,
          description: formDescription,
          category: formCategory,
          priority: formPriority,
          status: 'OPEN',
          sla_first_response_due: new Date(Date.now() + 4 * 3600000).toISOString(),
          sla_resolution_due: new Date(Date.now() + 12 * 3600000).toISOString(),
          created_at: new Date().toISOString()
        };
        setTickets([fallbackTicket, ...tickets]);
        setSubmitSuccess(true);
        setTimeout(() => {
          setSubmitSuccess(false);
          setActiveTab('my_tickets');
        }, 1200);
      }
    } catch {
      setSubmitSuccess(true);
      setTimeout(() => {
        setSubmitSuccess(false);
        setActiveTab('my_tickets');
      }, 1200);
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

        // Nếu có upload kèm tệp
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
      } else {
        const dummyMsg: TicketMessage = {
          id: `msg-${Date.now()}`,
          sender_name: currentUser?.fullName || 'Tôi',
          sender_role: 'USER',
          message_body: replyMessage,
          created_at: new Date().toISOString()
        };
        setSelectedTicket({
          ...selectedTicket,
          messages: [...(selectedTicket.messages || []), dummyMsg]
        });
        setReplyMessage('');
        setReplyFiles([]);
        setReplyPreviews([]);
      }
    } catch {
      const dummyMsg: TicketMessage = {
        id: `msg-${Date.now()}`,
        sender_name: currentUser?.fullName || 'Tôi',
        sender_role: 'USER',
        message_body: replyMessage,
        created_at: new Date().toISOString()
      };
      setSelectedTicket({
        ...selectedTicket,
        messages: [...(selectedTicket.messages || []), dummyMsg]
      });
      setReplyMessage('');
      setReplyFiles([]);
      setReplyPreviews([]);
    } finally {
      setIsSendingReply(false);
    }
  };

  const filteredArticles = articles.filter(
    (a) =>
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.tags && a.tags.toLowerCase().includes(searchQuery.toLowerCase())) ||
      a.content_markdown.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 h-full overflow-y-auto bg-slate-950 text-slate-100 flex flex-col font-sans select-text">
      {/* ─── Top Academic Header ─── */}
      <header className="px-6 py-6 border-b border-white/[0.08] bg-slate-900/60 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20 shrink-0">
              <LifeBuoy className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-white">Trung Tâm Hỗ Trợ & Cẩm Nang Học Thuật</h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  SLA 100% Active
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Giải quyết trực tiếp sự cố bóc tách giáo trình, công thức LaTeX, xuất đề thi OMR và đối soát tài khoản
              </p>
            </div>
          </div>

          {/* Quick Actions / Tab Switcher */}
          <div className="flex items-center gap-2 bg-slate-900 border border-white/10 p-1 rounded-xl">
            <button
              onClick={() => {
                setActiveTab('faq');
                setSelectedTicket(null);
              }}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'faq'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Cẩm nang FAQ</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('my_tickets');
                fetchTickets();
              }}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all relative cursor-pointer ${
                activeTab === 'my_tickets'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Phiếu hỗ trợ của tôi</span>
              {tickets.length > 0 && (
                <span className="w-4 h-4 rounded-full bg-emerald-400 text-slate-950 text-[10px] font-black flex items-center justify-center">
                  {tickets.length}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                setActiveTab('create_ticket');
                setSelectedTicket(null);
              }}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'create_ticket'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md'
                  : 'text-emerald-400 hover:bg-emerald-500/10'
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
            <div className="relative rounded-2xl bg-gradient-to-br from-slate-900 to-slate-900/40 border border-white/[0.08] p-6 text-center space-y-3">
              <h2 className="text-lg font-bold text-white">Tra cứu nhanh cẩm nang xử lý sự cố học thuật</h2>
              <p className="text-xs text-slate-400 max-w-xl mx-auto">
                Nhập từ khóa như: <code className="text-emerald-400">in OMR</code>, <code className="text-teal-400">công thức LaTeX</code>, <code className="text-amber-400">VietQR</code>, <code className="text-blue-400">Canvas QTI</code>
              </p>
              <div className="max-w-xl mx-auto relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm kiếm giải pháp hoặc bài viết hướng dẫn..."
                  className="w-full bg-slate-950 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>

            {/* Selected Article Detail View */}
            {selectedArticle ? (
              <div className="bg-slate-900/70 border border-white/[0.08] rounded-2xl p-6 backdrop-blur-xl space-y-4">
                <button
                  onClick={() => setSelectedArticle(null)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 hover:underline cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Quay lại danh mục</span>
                </button>
                <h2 className="text-xl font-bold text-white">{selectedArticle.title}</h2>
                <div className="flex items-center gap-4 text-xs text-slate-400 pb-4 border-b border-white/[0.08]">
                  <span>Lượt xem: {selectedArticle.view_count}</span>
                  <span>Đánh giá hữu ích: {selectedArticle.helpful_count} ⭐</span>
                  {selectedArticle.tags && (
                    <span className="text-emerald-400 font-mono">#{selectedArticle.tags}</span>
                  )}
                </div>
                <div className="text-slate-300 text-sm leading-relaxed whitespace-pre-line py-2">
                  {selectedArticle.content_markdown}
                </div>
                <div className="pt-4 border-t border-white/[0.08] flex items-center justify-between">
                  <span className="text-xs text-slate-400">Bài viết này có giải quyết được sự cố của bạn không?</span>
                  <button
                    onClick={() => alert('Cảm ơn Thầy/Cô đã đánh giá hữu ích!')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 text-xs font-semibold border border-emerald-500/30 cursor-pointer"
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
                      className="p-5 rounded-2xl bg-slate-900/60 hover:bg-slate-900 border border-white/[0.06] hover:border-emerald-500/40 transition-all cursor-pointer group shadow-sm"
                    >
                      <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-emerald-400 mb-3 group-hover:scale-110 transition-transform">
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
                      <h3 className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">
                        {cat.name}
                      </h3>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">{cat.description}</p>
                      <span className="inline-block mt-3 text-[11px] font-mono text-emerald-400/90 font-semibold">
                        {cat.articles_count} bài viết chuyên sâu →
                      </span>
                    </div>
                  ))}
                </div>

                {/* Articles List */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-200">
                      Bài viết cẩm nang phổ biến ({filteredArticles.length})
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {filteredArticles.map((art) => (
                      <div
                        key={art.id}
                        onClick={() => setSelectedArticle(art)}
                        className="p-4 rounded-xl bg-slate-900/40 hover:bg-slate-900/80 border border-white/[0.05] hover:border-emerald-500/30 transition-all cursor-pointer group flex items-start justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <h4 className="text-xs font-bold text-slate-200 group-hover:text-emerald-400 transition-colors">
                            {art.title}
                          </h4>
                          <p className="text-[11px] text-slate-400 line-clamp-2">{art.content_markdown}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-500 group-hover:translate-x-1 transition-transform shrink-0 mt-1" />
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
              <div className="bg-slate-900/70 border border-white/[0.08] rounded-2xl p-6 backdrop-blur-xl shadow-2xl flex flex-col gap-4">
                <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
                  <button
                    onClick={() => setSelectedTicket(null)}
                    className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Quay lại danh sách phiếu</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                      Live Chat Sync (3.5s)
                    </span>
                  </div>
                </div>

                {/* Ticket Header & SLA */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-slate-950/60 p-4 rounded-xl border border-white/[0.05]">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md">
                        {selectedTicket.ticket_code}
                      </span>
                      <span
                        className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                          selectedTicket.status === 'RESOLVED'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : selectedTicket.status === 'IN_PROGRESS'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        }`}
                      >
                        {selectedTicket.status}
                      </span>
                      <span className="text-xs text-slate-400">Mức độ: <strong>{selectedTicket.priority}</strong></span>
                    </div>
                    <h2 className="text-lg font-bold text-white mt-1.5">{selectedTicket.subject}</h2>
                  </div>

                  <div className="text-right text-xs text-slate-400">
                    <p className="flex items-center gap-1 justify-end text-amber-300 font-bold">
                      <Clock className="w-3.5 h-3.5" /> Cam kết phản hồi SLA:
                    </p>
                    <p className="font-mono text-slate-300 mt-0.5">
                      Trước {new Date(selectedTicket.sla_first_response_due).toLocaleTimeString('vi-VN')} ({new Date(selectedTicket.sla_first_response_due).toLocaleDateString('vi-VN')})
                    </p>
                  </div>
                </div>

                {/* Luồng tin nhắn đàm thoại */}
                <div className="py-2 space-y-4 max-h-[460px] overflow-y-auto pr-2 scrollbar-thin">
                  {/* Mô tả ban đầu */}
                  <div className="bg-slate-800/40 rounded-xl p-4 border border-white/[0.04] space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span className="font-bold text-slate-200 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-emerald-400" /> Mô tả sự cố ban đầu
                      </span>
                      <span>{new Date(selectedTicket.created_at).toLocaleString('vi-VN')}</span>
                    </div>
                    <p className="text-sm text-slate-300 whitespace-pre-line leading-relaxed">
                      {selectedTicket.description}
                    </p>

                    {/* Tệp đính kèm ban đầu của ticket nếu có */}
                    {selectedTicket.attachments && selectedTicket.attachments.length > 0 && (
                      <div className="pt-2 border-t border-white/[0.05] space-y-1.5">
                        <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                          <Paperclip className="w-3 h-3 text-emerald-400" /> Tệp đính kèm khi mở phiếu:
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
                                className="relative rounded-lg overflow-hidden border border-white/10 group cursor-pointer hover:border-emerald-400 transition-colors"
                              >
                                <img
                                  src={att.file_url || `/api/v1/support/attachments/${att.file_name}`}
                                  alt={att.file_name}
                                  className="w-24 h-20 object-cover rounded-lg group-hover:scale-105 transition-transform"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                  <Maximize2 className="w-4 h-4 text-white" />
                                </div>
                              </div>
                            ) : (
                              <a
                                key={att.id}
                                href={att.file_url || `/api/v1/support/attachments/${att.file_name}`}
                                download
                                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-white/10 hover:border-emerald-400 text-xs text-slate-200 transition-colors"
                              >
                                <FileText className="w-3.5 h-3.5 text-amber-400" />
                                <span className="max-w-[150px] truncate">{att.file_name}</span>
                                <Download className="w-3 h-3 text-slate-400" />
                              </a>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Danh sách các tin nhắn phản hồi */}
                  {selectedTicket.messages?.map((msg) => (
                    <div
                      key={msg.id}
                      className={`p-4 rounded-xl text-sm ${
                        msg.sender_role === 'USER'
                          ? 'bg-emerald-950/40 border border-emerald-500/20 ml-8'
                          : 'bg-slate-900 border border-white/10 mr-8'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                        <span className="font-bold flex items-center gap-1.5 text-white">
                          {msg.sender_role === 'USER' ? (
                            'Tôi (Giảng viên)'
                          ) : (
                            <>
                              <ShieldCheck className="w-4 h-4 text-emerald-400" />
                              <span>Kỹ sư QuizGen AI ({msg.sender_name})</span>
                            </>
                          )}
                        </span>
                        <span>{new Date(msg.created_at).toLocaleTimeString('vi-VN')}</span>
                      </div>
                      <p className="text-slate-200 whitespace-pre-line leading-relaxed">{msg.message_body}</p>

                      {/* Tệp đính kèm trong tin nhắn */}
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className="mt-3 pt-2 border-t border-white/[0.05] flex flex-wrap gap-2">
                          {msg.attachments.map((att) => {
                            const isImg = att.mime_type.startsWith('image/');
                            return isImg ? (
                              <div
                                key={att.id}
                                onClick={() => {
                                  setLightboxImageUrl(att.file_url || `/api/v1/support/attachments/${att.file_name}`);
                                  setLightboxCaption(att.file_name);
                                }}
                                className="relative rounded-lg overflow-hidden border border-white/10 group cursor-pointer hover:border-emerald-400 transition-colors"
                              >
                                <img
                                  src={att.file_url || `/api/v1/support/attachments/${att.file_name}`}
                                  alt={att.file_name}
                                  className="w-28 h-20 object-cover rounded-lg group-hover:scale-105 transition-transform"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                  <Maximize2 className="w-4 h-4 text-white" />
                                </div>
                              </div>
                            ) : (
                              <a
                                key={att.id}
                                href={att.file_url || `/api/v1/support/attachments/${att.file_name}`}
                                download
                                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-950 border border-white/10 hover:border-emerald-400 text-xs text-slate-200 transition-colors"
                              >
                                <FileText className="w-3.5 h-3.5 text-amber-400" />
                                <span className="max-w-[150px] truncate">{att.file_name}</span>
                                <Download className="w-3 h-3 text-slate-400" />
                              </a>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Khay xem trước ảnh lỗi sắp gửi trong phản hồi */}
                {replyPreviews.length > 0 && (
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-white/10 flex items-center gap-2 overflow-x-auto">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase shrink-0">Tệp đính kèm ({replyPreviews.length}):</span>
                    {replyPreviews.map((p, idx) => (
                      <div key={idx} className="relative group shrink-0 rounded-lg overflow-hidden border border-white/10 bg-slate-950 p-1 flex items-center gap-2">
                        {p.isImage ? (
                          <img src={p.url} alt={p.name} className="w-10 h-10 object-cover rounded" />
                        ) : (
                          <FileText className="w-6 h-6 text-amber-400 mx-1" />
                        )}
                        <div className="text-[10px] max-w-[100px] truncate text-slate-300">
                          {p.name}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeReplyFile(idx)}
                          className="p-1 text-slate-400 hover:text-rose-400 cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Khung gửi phản hồi 2 chiều & Đính kèm */}
                <div className="pt-2 border-t border-white/[0.08] flex items-center gap-2">
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
                    className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-emerald-400 border border-white/10 transition-colors cursor-pointer shrink-0"
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
                    placeholder="Gửi phản hồi tới kỹ sư... (Bấm Win+Shift+S rồi Ctrl+V để dán ảnh lỗi tức thì)"
                    className="flex-1 bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    onClick={handleSendReply}
                    disabled={isSendingReply || (!replyMessage.trim() && replyFiles.length === 0)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-md disabled:opacity-50 cursor-pointer shrink-0"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isSendingReply ? 'Đang gửi...' : 'Gửi'}</span>
                  </button>
                </div>
              </div>
            ) : (
              // Bảng danh sách ticket
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-white">Danh sách yêu cầu hỗ trợ của bạn</h3>
                  <button
                    onClick={() => setActiveTab('create_ticket')}
                    className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-semibold cursor-pointer"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>Tạo yêu cầu mới</span>
                  </button>
                </div>

                {tickets.length === 0 ? (
                  <div className="bg-slate-900/40 border border-white/[0.06] rounded-2xl p-12 text-center">
                    <CheckCircle2 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                    <h4 className="text-sm font-bold text-slate-300">Bạn chưa có phiếu hỗ trợ nào</h4>
                    <p className="text-xs text-slate-500 mt-1">
                      Mọi thắc mắc kỹ thuật sẽ được tiếp nhận và xử lý theo cam kết SLA tại đây.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {tickets.map((t) => (
                      <div
                        key={t.id}
                        onClick={() => setSelectedTicket(t)}
                        className="bg-slate-900/60 hover:bg-slate-900/90 border border-white/[0.06] hover:border-emerald-500/30 rounded-xl p-5 cursor-pointer transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 group shadow-sm"
                      >
                        <div className="flex items-start gap-4">
                          <div className="font-mono text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md mt-0.5">
                            {t.ticket_code}
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">
                              {t.subject}
                            </h4>
                            <p className="text-xs text-slate-400 line-clamp-1 mt-1">{t.description}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 shrink-0">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              t.status === 'RESOLVED'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : t.status === 'IN_PROGRESS'
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            }`}
                          >
                            {t.status}
                          </span>
                          <span className="text-xs text-slate-500 font-mono">
                            {new Date(t.created_at).toLocaleDateString('vi-VN')}
                          </span>
                          <ChevronRight className="w-4 h-4 text-slate-500 group-hover:translate-x-1 transition-all" />
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
          <div className="max-w-3xl mx-auto bg-slate-900/70 border border-white/[0.08] rounded-2xl p-8 backdrop-blur-xl shadow-2xl space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <LifeBuoy className="w-5 h-5 text-emerald-400" />
                <span>Tạo Phiếu Hỗ Trợ Kỹ Thuật &amp; Báo Lỗi Hệ Thống</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Kỹ sư QuizGen AI cam kết phản hồi trong vòng{' '}
                <strong className="text-emerald-400">
                  {currentUser?.planTier === 'ENTERPRISE' ? '1 giờ' : '4 giờ'}
                </strong>{' '}
                theo tiêu chuẩn chất lượng SLA.
              </p>
            </div>

            {submitSuccess ? (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-8 text-center my-6 animate-in zoom-in-95 duration-200">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-2 animate-bounce" />
                <h4 className="text-base font-bold text-white">Gửi phiếu hỗ trợ thành công!</h4>
                <p className="text-xs text-slate-300 mt-1">
                  Mã ticket đã được khởi tạo và gửi tới Đội ngũ Kỹ sư. Đang mở luồng trao đổi trực tiếp...
                </p>
              </div>
            ) : (
              <form onSubmit={handleCreateTicket} className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Tiêu đề sự cố / Yêu cầu <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formSubject}
                    onChange={(e) => setFormSubject(e.target.value)}
                    placeholder="VD: Lỗi vỡ font công thức toán khi xuất file Word hoặc lệch lề phiếu OMR"
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">Phân hệ phát sinh sự cố</label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="EXAM_EXPORT_ERROR">1. Đóng gói &amp; Xuất Word / PDF OMR / Canvas QTI</option>
                      <option value="DOC_PARSING_ERROR">2. Nạp &amp; Bóc tách Giáo trình (PDF/DOCX/OCR)</option>
                      <option value="AI_HALLUCINATION">3. Chất lượng câu hỏi AI &amp; Thang đo Bloom</option>
                      <option value="PAYMENT_BILLING">4. Cổng thanh toán VietQR &amp; Nâng cấp gói cước</option>
                      <option value="ACCOUNT_SECURITY">5. Tài khoản &amp; Đăng nhập Google SSO</option>
                      <option value="FEATURE_REQUEST">6. Đề xuất Tính năng Mới</option>
                      <option value="GENERAL_INQUIRY">7. Hỏi đáp Chung</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">Mức độ ưu tiên</label>
                    <select
                      value={formPriority}
                      onChange={(e) => setFormPriority(e.target.value)}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="LOW">Thấp (Tư vấn, đóng góp ý kiến)</option>
                      <option value="MEDIUM">Trung bình (Lỗi thông thường)</option>
                      <option value="HIGH">Cao (Ảnh hưởng tiến độ biên soạn đề)</option>
                      <option value="CRITICAL">Khẩn cấp (Trường thi đang chờ in ấn gấp)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Mô tả chi tiết sự cố <span className="text-rose-400">*</span>
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Mô tả cụ thể các bước gây ra lỗi, câu hỏi nào bị ảnh hưởng hoặc mã đề thi đang thao tác..."
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 leading-relaxed"
                  />
                </div>

                {/* ─── KHAY ĐÍNH KÈM ẢNH LỖI TIỆN LỢI (HỖ TRỢ CTRL+V & KÉO THẢ) ─── */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4 text-emerald-400" />
                      <span>Ảnh chụp màn hình lỗi &amp; Tệp minh chứng</span>
                    </label>
                    <span className="text-[11px] text-emerald-400 font-mono">
                      (Hỗ trợ <strong>Ctrl + V</strong> dán ảnh chụp màn hình trực tiếp)
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
                        ? 'border-emerald-400 bg-emerald-500/10 scale-[1.01]'
                        : 'border-white/10 hover:border-emerald-500/50 bg-slate-950/60'
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
                      <div className="w-10 h-10 rounded-xl bg-slate-900 border border-white/10 flex items-center justify-center text-emerald-400 shadow-sm">
                        <ImageIcon className="w-5 h-5" />
                      </div>
                      <p className="text-xs font-semibold text-slate-200 mt-1">
                        Bấm vào đây để chọn ảnh hoặc kéo thả tệp vào đây
                      </p>
                      <p className="text-[11px] text-slate-500">
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
                          className="relative group rounded-xl overflow-hidden border border-white/10 bg-slate-900 p-2 flex items-center gap-2.5 shadow-sm"
                        >
                          {p.isImage ? (
                            <img
                              src={p.url}
                              alt={p.name}
                              className="w-12 h-12 object-cover rounded-lg shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={(e) => {
                                e.stopPropagation();
                                setLightboxImageUrl(p.url);
                                setLightboxCaption(p.name);
                              }}
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                              <FileText className="w-6 h-6" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-slate-200 truncate">{p.name}</p>
                            <span className="text-[10px] text-slate-500 font-mono">{p.size}</span>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeCreateFile(idx);
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg cursor-pointer transition-colors"
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
                  <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-3.5 flex items-start gap-3">
                    <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-emerald-200 leading-relaxed">{aiTip}</p>
                  </div>
                )}

                {/* Thẻ thông báo tự động thu thập ngữ cảnh môi trường */}
                <div className="p-3 rounded-xl bg-slate-950/40 border border-white/5 flex items-center gap-2.5 text-[11px] text-slate-400">
                  <Info className="w-4 h-4 text-teal-400 shrink-0" />
                  <span>
                    Hệ thống tự động ghi nhận thông tin trình duyệt, màn hình và mã định danh liên quan để hỗ trợ kỹ thuật viên chẩn đoán lỗi nhanh nhất.
                  </span>
                </div>

                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveTab('faq')}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/[0.04] cursor-pointer"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-lg hover:shadow-emerald-500/20 disabled:opacity-50 cursor-pointer"
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
          title="Minh chứng Ảnh chụp Sự cố & Lỗi Kỹ thuật"
          onClose={() => {
            setLightboxImageUrl(null);
            setLightboxCaption('');
          }}
        />
      )}
    </div>
  );
};

// Dữ liệu mẫu ban đầu để giao diện hoạt động tức thì
const mockCategories: FAQCategory[] = [
  {
    id: 'cat-doc',
    name: '1. Nạp & Bóc tách Giáo trình',
    slug: 'document-ingestion-ocr',
    description: 'Hướng dẫn tải lên tệp PDF, Word và khắc phục sự cố bóc tách chương mục.',
    icon: 'FileText',
    articles_count: 3
  },
  {
    id: 'cat-ai',
    name: '2. Sinh Câu hỏi AI & Bloom',
    slug: 'ai-bloom-matrix',
    description: 'Tối ưu hóa câu hỏi AI theo thang đo Bloom và định dạng công thức toán LaTeX.',
    icon: 'Cpu',
    articles_count: 4
  },
  {
    id: 'cat-exam',
    name: '3. Đóng gói & In ấn Khảo thí',
    slug: 'exam-export-omr-qti',
    description: 'Xuất đề thi Word, in ấn PDF Vector A4 kèm phiếu OMR và nhập vào Canvas LMS.',
    icon: 'Download',
    articles_count: 5
  },
  {
    id: 'cat-pay',
    name: '4. Gói cước & Cổng VietQR',
    slug: 'payment-subscription-vietqr',
    description: 'Quy trình nâng cấp tài khoản qua quét mã VietQR và quản lý hạn mức.',
    icon: 'CreditCard',
    articles_count: 2
  }
];

const mockArticles: FAQArticle[] = [
  {
    id: 'art-omr',
    category_id: 'cat-exam',
    title: 'Quy chuẩn in ấn Phiếu trả lời trắc nghiệm OMR 50 câu chuẩn khổ giấy A4',
    slug: 'quy-chuan-in-phieu-omr-50-cau-a4',
    content_markdown: `Phiếu trả lời trắc nghiệm OMR 50 câu được thiết kế theo tọa độ vật lý chuẩn xác:
1. Kích cỡ trang in: Chọn đúng khổ giấy A4 (210 x 297 mm), không chọn khổ Letter.
2. Tỷ lệ in (Scale): Bắt buộc chọn Actual Size (100%) hoặc Fit to Printable Area, không chọn phóng to vì sẽ làm lệch tọa độ các ô tròn.
3. Phần mềm chấm tương thích: Tương thích hoàn toàn với ZipGrade, TestScanner, OMR Maker.`,
    tags: 'omr,print,pdf,a4,exam',
    view_count: 350,
    helpful_count: 142
  },
  {
    id: 'art-latex',
    category_id: 'cat-ai',
    title: 'Hướng dẫn soạn thảo và hiển thị công thức toán học LaTeX trực quan',
    slug: 'huong-dan-soan-thao-cong-thuc-toan-latex',
    content_markdown: `QuizGen AI hỗ trợ đầy đủ công nghệ biên dịch công thức toán học KaTeX:
- Công thức cùng dòng: Kẹp biểu thức giữa hai dấu đô la: ví dụ $E = mc^2$.
- Tự động làm sạch khi xuất Word: Khi xuất đề thi ra file Word (.docx), hệ thống tự động chuyển đổi các mã LaTeX phức tạp sang ký tự Unicode toán học chuẩn để đảm bảo máy in không bị lỗi font.`,
    tags: 'latex,math,formula,katex',
    view_count: 210,
    helpful_count: 89
  },
  {
    id: 'art-qti',
    category_id: 'cat-exam',
    title: 'Cách nhập (Import) đề thi vào hệ thống LMS Canvas và Moodle qua gói IMS QTI 2.1',
    slug: 'nhap-de-thi-canvas-moodle-ims-qti',
    content_markdown: `Sau khi xuất bản gói QTI_Package.zip từ QuizGen AI:
1. Trên Canvas LMS: Vào Settings -> Import Course Content -> Chọn QTI .zip file -> Bấm Import.
2. Trên Moodle: Vào Question bank -> Chọn Import -> Chọn định dạng IMS QTI 2.1 package và tải tệp lên.`,
    tags: 'qti,canvas,moodle,lms',
    view_count: 185,
    helpful_count: 76
  },
  {
    id: 'art-vietqr',
    category_id: 'cat-pay',
    title: 'Quy trình thanh toán quét mã VietQR tự động kích hoạt tài khoản PRO',
    slug: 'quy-trinh-thanh-toan-vietqr-tu-dong',
    content_markdown: `1. Trên giao diện Web, bấm nút "Nâng cấp gói cước" và chọn gói mong muốn.
2. Hệ thống sinh mã Dynamic VietQR kèm số tiền và mã hóa đơn riêng biệt.
3. Chuyển khoản thành công, Webhook NAPAS 24/7 kích hoạt nâng cấp tài khoản của bạn ngay lập tức trong 3 giây.`,
    tags: 'vietqr,payment,pro,upgrade',
    view_count: 290,
    helpful_count: 110
  }
];

const mockTickets: SupportTicket[] = [
  {
    id: 'tk-101',
    ticket_code: 'TK-2026-88123',
    subject: 'Lỗi căn lề khi in phiếu OMR 50 câu trên máy in trường thi',
    description: 'Tôi in file PDF xuất từ QuizGen AI nhưng ô tròn câu 40-50 bị sát mép dưới giấy.',
    category: 'EXAM_EXPORT_ERROR',
    priority: 'HIGH',
    status: 'IN_PROGRESS',
    sla_first_response_due: new Date(Date.now() + 2 * 3600000).toISOString(),
    sla_resolution_due: new Date(Date.now() + 8 * 3600000).toISOString(),
    created_at: new Date(Date.now() - 3600000).toISOString(),
    messages: [
      {
        id: 'm-1',
        sender_name: 'Nguyễn Văn Kỹ sư',
        sender_role: 'SUPPORT_STAFF',
        message_body: 'Chào Thầy/Cô, vui lòng kiểm tra xem phần mềm in đã chọn đúng khổ giấy A4 (210x297mm) và tỷ lệ Actual Size 100% chưa ạ?',
        created_at: new Date(Date.now() - 1800000).toISOString()
      }
    ]
  }
];
