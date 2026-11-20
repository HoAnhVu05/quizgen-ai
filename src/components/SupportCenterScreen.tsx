import React, { useState, useEffect } from 'react';
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
  Filter
} from 'lucide-react';
import { UserProfile } from '../types';
import { API_BASE } from '../services/apiClient';

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

interface TicketMessage {
  id: string;
  sender_name: string;
  sender_role: string;
  message_body: string;
  created_at: string;
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
  messages?: TicketMessage[];
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

  // Tin nhắn trả lời trong modal ticket
  const [replyMessage, setReplyMessage] = useState('');
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  // Tải danh mục và bài viết FAQ
  useEffect(() => {
    fetchFAQData();
    fetchTickets();
  }, []);

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
        user_tier: currentUser?.planTier || 'PRO'
      };

      const res = await fetch(`${API_BASE}/support/tickets`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setSubmitSuccess(true);
        setFormSubject('');
        setFormDescription('');
        setTimeout(() => {
          setSubmitSuccess(false);
          setActiveTab('my_tickets');
          fetchTickets();
        }, 1500);
      } else {
        // Fallback thêm cục bộ
        const newTicket: SupportTicket = {
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
        setTickets([newTicket, ...tickets]);
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
    if (!selectedTicket || !replyMessage.trim()) return;

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-user-id': currentUser?.id || 'usr-lec-001',
        'x-user-email': currentUser?.email || 'lecturer@uth.edu.vn',
        'x-user-role': (currentUser?.role || 'lecturer').toUpperCase()
      };

      const res = await fetch(`${API_BASE}/support/tickets/${selectedTicket.id}/messages`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ message_body: replyMessage })
      });

      if (res.ok) {
        const newMsg = await res.json();
        const updated = {
          ...selectedTicket,
          messages: [...(selectedTicket.messages || []), newMsg]
        };
        setSelectedTicket(updated);
        setReplyMessage('');
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
      }
    } catch {
      // Mock update
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
    }
  };

  const filteredArticles = articles.filter(
    (a) =>
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.tags && a.tags.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col">
      {/* Top Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border-b border-white/[0.08] px-6 py-8">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-2">
              <LifeBuoy className="w-3.5 h-3.5" />
              Academic Support Service (Port 8008)
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Trung tâm Hỗ trợ & Cẩm nang Khảo thí
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Giải đáp thắc mắc về nạp giáo trình, thang đo Bloom, xuất Word, PDF OMR, QTI Canvas và thanh toán VietQR.
            </p>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center bg-slate-900/80 p-1.5 rounded-xl border border-white/[0.08] shadow-inner">
            <button
              onClick={() => {
                setActiveTab('faq');
                setSelectedArticle(null);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'faq'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              Cẩm nang FAQ
            </button>
            <button
              onClick={() => {
                setActiveTab('my_tickets');
                setSelectedTicket(null);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'my_tickets'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              Yêu cầu của tôi ({tickets.length})
            </button>
            <button
              onClick={() => setActiveTab('create_ticket')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'create_ticket'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-emerald-400 hover:text-white hover:bg-emerald-500/10'
              }`}
            >
              <PlusCircle className="w-4 h-4" />
              Tạo Ticket
            </button>
          </div>
        </div>

        {/* Global Search Bar */}
        {activeTab === 'faq' && !selectedArticle && (
          <div className="max-w-2xl mx-auto mt-6 relative">
            <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm giải pháp: in ấn phiếu OMR, công thức LaTeX, bóc tách PDF scan, Canvas QTI..."
              className="w-full bg-slate-900/90 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-lg"
            />
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="max-w-6xl mx-auto px-6 py-8 flex-1 w-full">
        {/* --- TAB 1: FAQ KNOWLEDGE BASE --- */}
        {activeTab === 'faq' && (
          <div>
            {selectedArticle ? (
              // Chi tiết bài viết
              <div className="bg-slate-900/60 border border-white/[0.08] rounded-2xl p-8 backdrop-blur-xl shadow-2xl">
                <button
                  onClick={() => setSelectedArticle(null)}
                  className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-indigo-400 mb-6 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Quay lại danh mục cẩm nang
                </button>
                <h2 className="text-2xl font-bold text-white mb-4">{selectedArticle.title}</h2>
                <div className="flex items-center gap-4 text-xs text-slate-400 pb-6 border-b border-white/[0.08] mb-6">
                  <span>Lượt xem: {selectedArticle.view_count}</span>
                  <span>•</span>
                  <span>Hữu ích: {selectedArticle.helpful_count} 👍</span>
                </div>
                <div className="prose prose-invert max-w-none text-slate-300 text-sm leading-relaxed whitespace-pre-line">
                  {selectedArticle.content_markdown}
                </div>
                <div className="mt-8 pt-6 border-t border-white/[0.08] flex items-center justify-between">
                  <span className="text-xs text-slate-400">Bài viết này có giúp ích cho bạn không?</span>
                  <div className="flex items-center gap-2">
                    <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-medium hover:bg-emerald-500/20 transition-all">
                      <ThumbsUp className="w-3.5 h-3.5" /> Có ích
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              // Danh sách danh mục & bài viết
              <div className="space-y-8">
                {/* 4 Khối Danh mục nhanh */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {categories.map((cat) => (
                    <div
                      key={cat.id}
                      className="bg-slate-900/60 border border-white/[0.08] hover:border-indigo-500/40 rounded-xl p-5 backdrop-blur-md transition-all group cursor-pointer"
                    >
                      <div className="w-10 h-10 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                        {cat.icon === 'FileText' && <FileText className="w-5 h-5" />}
                        {cat.icon === 'Cpu' && <Cpu className="w-5 h-5" />}
                        {cat.icon === 'Download' && <Download className="w-5 h-5" />}
                        {cat.icon === 'CreditCard' && <CreditCard className="w-5 h-5" />}
                      </div>
                      <h3 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors line-clamp-1">
                        {cat.name}
                      </h3>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">{cat.description}</p>
                    </div>
                  ))}
                </div>

                {/* Danh sách bài viết gợi ý */}
                <div>
                  <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                    Các bài viết cẩm nang được xem nhiều nhất
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredArticles.map((art) => (
                      <div
                        key={art.id}
                        onClick={() => setSelectedArticle(art)}
                        className="bg-slate-900/40 hover:bg-slate-900/80 border border-white/[0.06] hover:border-white/10 rounded-xl p-5 cursor-pointer transition-all flex items-start justify-between gap-4 group"
                      >
                        <div>
                          <h4 className="text-sm font-semibold text-slate-200 group-hover:text-indigo-400 transition-colors">
                            {art.title}
                          </h4>
                          <p className="text-xs text-slate-400 mt-2 line-clamp-2">
                            {art.content_markdown.replace(/#/g, '').slice(0, 140)}...
                          </p>
                          <div className="flex items-center gap-2 mt-3">
                            {art.tags?.split(',').map((tag) => (
                              <span
                                key={tag}
                                className="px-2 py-0.5 rounded-md bg-white/[0.04] text-[10px] text-slate-400"
                              >
                                #{tag.trim()}
                              </span>
                            ))}
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-white group-hover:translate-x-1 transition-all shrink-0 mt-1" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* --- TAB 2: MY TICKETS --- */}
        {activeTab === 'my_tickets' && (
          <div>
            {selectedTicket ? (
              // Chi tiết hội thoại ticket
              <div className="bg-slate-900/70 border border-white/[0.08] rounded-2xl p-6 backdrop-blur-xl shadow-2xl">
                <button
                  onClick={() => setSelectedTicket(null)}
                  className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-indigo-400 mb-6 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Quay lại danh sách ticket
                </button>

                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-md">
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
                      <span className="text-xs text-slate-400">Độ ưu tiên: {selectedTicket.priority}</span>
                    </div>
                    <h2 className="text-xl font-bold text-white mt-2">{selectedTicket.subject}</h2>
                  </div>

                  <div className="text-right text-xs text-slate-400">
                    <p>Cam kết phản hồi trước:</p>
                    <p className="font-mono text-amber-300 font-semibold mt-0.5">
                      {new Date(selectedTicket.sla_first_response_due).toLocaleTimeString('vi-VN')} -{' '}
                      {new Date(selectedTicket.sla_first_response_due).toLocaleDateString('vi-VN')}
                    </p>
                  </div>
                </div>

                {/* Luồng tin nhắn đàm thoại */}
                <div className="py-6 space-y-4 max-h-[380px] overflow-y-auto pr-2">
                  <div className="bg-slate-800/40 rounded-xl p-4 border border-white/[0.04]">
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                      <span className="font-bold text-slate-200">Mô tả sự cố ban đầu</span>
                      <span>{new Date(selectedTicket.created_at).toLocaleString('vi-VN')}</span>
                    </div>
                    <p className="text-sm text-slate-300">{selectedTicket.description}</p>
                  </div>

                  {selectedTicket.messages?.map((msg) => (
                    <div
                      key={msg.id}
                      className={`p-4 rounded-xl text-sm ${
                        msg.sender_role === 'USER'
                          ? 'bg-indigo-950/40 border border-indigo-500/20 ml-6'
                          : 'bg-emerald-950/30 border border-emerald-500/20 mr-6'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                        <span className="font-bold text-white">
                          {msg.sender_role === 'USER' ? 'Tôi' : `Kỹ sư QuizGen AI (${msg.sender_name})`}
                        </span>
                        <span>{new Date(msg.created_at).toLocaleTimeString('vi-VN')}</span>
                      </div>
                      <p className="text-slate-200">{msg.message_body}</p>
                    </div>
                  ))}
                </div>

                {/* Khung gửi phản hồi */}
                <div className="pt-4 border-t border-white/[0.08] flex gap-3">
                  <input
                    type="text"
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    placeholder="Gửi thêm thông tin hoặc phản hồi tới kỹ sư..."
                    className="flex-1 bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    onClick={handleSendReply}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all shadow-md"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Gửi
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
                    className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
                  >
                    <PlusCircle className="w-4 h-4" />
                    Tạo yêu cầu mới
                  </button>
                </div>

                {tickets.length === 0 ? (
                  <div className="bg-slate-900/40 border border-white/[0.06] rounded-2xl p-12 text-center">
                    <CheckCircle2 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                    <h4 className="text-sm font-bold text-slate-300">Bạn chưa có ticket hỗ trợ nào</h4>
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
                        className="bg-slate-900/60 hover:bg-slate-900/90 border border-white/[0.06] hover:border-indigo-500/30 rounded-xl p-5 cursor-pointer transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 group"
                      >
                        <div className="flex items-start gap-4">
                          <div className="font-mono text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-md mt-0.5">
                            {t.ticket_code}
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors">
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
                          <span className="text-xs text-slate-500">
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

        {/* --- TAB 3: CREATE TICKET --- */}
        {activeTab === 'create_ticket' && (
          <div className="max-w-2xl mx-auto bg-slate-900/70 border border-white/[0.08] rounded-2xl p-8 backdrop-blur-xl shadow-2xl">
            <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-2">
              <LifeBuoy className="w-5 h-5 text-indigo-400" />
              Tạo Yêu cầu Hỗ trợ Kỹ thuật & Nghiệp vụ
            </h2>
            <p className="text-xs text-slate-400 mb-6">
              Đội ngũ Kỹ sư QuizGen AI cam kết phản hồi trong vòng{' '}
              <strong className="text-amber-300">
                {currentUser?.planTier === 'ENTERPRISE' ? '1 giờ' : '4 giờ'}
              </strong>{' '}
              theo chính sách SLA.
            </p>

            {submitSuccess ? (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-6 text-center my-6 animate-pulse">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-2" />
                <h4 className="text-base font-bold text-white">Gửi yêu cầu hỗ trợ thành công!</h4>
                <p className="text-xs text-slate-300 mt-1">
                  Mã ticket đã được cấp phát. Đang chuyển bạn đến danh sách theo dõi...
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
                    placeholder="VD: Lỗi vỡ font công thức tích phân khi xuất file Word đề thi"
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">Phân hệ sự cố</label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="EXAM_EXPORT_ERROR">Đóng gói & Xuất Word / PDF OMR / QTI</option>
                      <option value="DOC_PARSING_ERROR">Nạp & Bóc tách Giáo trình (PDF Scan)</option>
                      <option value="AI_HALLUCINATION">Chất lượng câu hỏi AI & Thang đo Bloom</option>
                      <option value="PAYMENT_BILLING">Cổng thanh toán & Gói cước VietQR</option>
                      <option value="ACCOUNT_SECURITY">Tài khoản & Đăng nhập Google SSO</option>
                      <option value="FEATURE_REQUEST">Đề xuất Tính năng Mới</option>
                      <option value="GENERAL_INQUIRY">Hỏi đáp Chung</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">Mức độ ưu tiên</label>
                    <select
                      value={formPriority}
                      onChange={(e) => setFormPriority(e.target.value)}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="LOW">Thấp (Tư vấn, góp ý)</option>
                      <option value="MEDIUM">Trung bình (Lỗi thông thường)</option>
                      <option value="HIGH">Cao (Ảnh hưởng tiến độ ra đề)</option>
                      <option value="CRITICAL">Khẩn cấp (Trường thi đang chờ in ấn)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Mô tả chi tiết <span className="text-rose-400">*</span>
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Mô tả cụ thể các bước gây ra lỗi, mã đề thi hoặc tên giáo trình bị ảnh hưởng..."
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Hộp gợi ý tự động của AI */}
                {aiTip && (
                  <div className="bg-indigo-950/40 border border-indigo-500/30 rounded-xl p-3.5 flex items-start gap-3">
                    <Sparkles className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-indigo-200 leading-relaxed">{aiTip}</p>
                  </div>
                )}

                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveTab('faq')}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/[0.04]"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-lg hover:shadow-emerald-500/20 disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                    {isSubmitting ? 'Đang gửi...' : 'Gửi yêu cầu hỗ trợ'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
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
    name: '2. Khởi tạo Đề thi AI & Bloom',
    slug: 'ai-bloom-matrix',
    description: 'Cách thiết lập ma trận đề thi 4 bậc nhận thức và soạn công thức toán LaTeX.',
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
