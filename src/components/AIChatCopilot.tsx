import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  X,
  Send,
  RotateCcw,
  Bot,
  User,
  ChevronDown,
  BookOpen,
  CheckCircle2,
  Copy,
  Check,
  Maximize2,
  Minimize2,
  FileText,
} from 'lucide-react';
import { ScreenId, UserProfile, Question } from '../types';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  suggestedActions?: string[];
}

interface AIChatCopilotProps {
  currentScreen: ScreenId;
  currentUser: UserProfile | null;
  activeQuestion?: Question | null;
  onNavigate?: (screen: ScreenId) => void;
}

const SCREEN_LABELS: Record<ScreenId, string> = {
  dashboard: 'Tổng quan Học thuật',
  upload: 'Bước 1: Kho Giáo trình',
  generate: 'Bước 2: Sinh Câu hỏi AI',
  review: 'Bước 3: Đối soát & Biên tập',
  bank: 'Bước 4: Đóng gói & Xuất Đề Thi',
  admin_portal: 'Cổng Quản trị Hệ thống',
};

const DEFAULT_WELCOME_MESSAGE = (userName: string, screenLabel: string, bookName?: string): ChatMessage => ({
  id: 'welcome-msg',
  role: 'assistant',
  content: `Kính chào **${userName || 'Thầy/Cô'}**! Tôi là **Quanta** — Trợ lý Khảo thí Học thuật & Phân tích Giáo trình AI của hệ thống QuizGen AI.\n\n` +
    `Tôi có toàn quyền **truy cập, đọc hiểu và phân tích sâu toàn bộ giáo trình/tài liệu** mà Thầy/Cô đã nạp${bookName ? ` (đang kết nối trực tiếp: *${bookName}*)` : ''}.\n\n` +
    `Thầy/Cô có thể yêu cầu tôi bất kỳ điều gì: tóm tắt giáo trình, tra cứu định nghĩa hay công thức ở trang mấy, phân tích ma trận Bloom, hoặc giải thích câu hỏi chuyên sâu!`,
  timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
  suggestedActions: [
    '📖 Tóm tắt giáo trình này',
    '📑 Liệt kê cấu trúc các chương',
    '💡 Giải thích chi tiết đáp án',
    '📊 Đề xuất ma trận Bloom',
  ],
});

export const AIChatCopilot: React.FC<AIChatCopilotProps> = ({
  currentScreen,
  currentUser,
  activeQuestion,
  onNavigate,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // ─── Danh sách Giáo trình Người dùng Tải lên ─────────────────────────────
  const [uploadedBooks, setUploadedBooks] = useState<any[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('quizgen_uploaded_documents') || '[]');
    } catch {
      return [];
    }
  });

  const [selectedBookId, setSelectedBookId] = useState<string>(() => {
    return localStorage.getItem('quizgen_selected_book_id') || '';
  });

  const screenLabel = SCREEN_LABELS[currentScreen] || 'Không gian làm việc';
  const userName = currentUser?.academicTitle
    ? `${currentUser.academicTitle} ${currentUser.fullName}`
    : currentUser?.fullName || 'Thầy/Cô';

  // Tự động đồng bộ tài liệu mới nhất mỗi khi mở chat hoặc chuyển màn hình
  useEffect(() => {
    try {
      const books = JSON.parse(localStorage.getItem('quizgen_uploaded_documents') || '[]');
      setUploadedBooks(books);
      const selId = localStorage.getItem('quizgen_selected_book_id');
      if (selId && books.some((b: any) => b.id === selId)) {
        setSelectedBookId(selId);
      } else if (books.length > 0) {
        setSelectedBookId(books[0].id);
      }
    } catch {}
  }, [isOpen, currentScreen]);

  const activeBook = uploadedBooks.find((b: any) => b.id === selectedBookId) || (uploadedBooks.length > 0 ? uploadedBooks[0] : null);

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem('quizgen_copilot_chat');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [DEFAULT_WELCOME_MESSAGE(userName, screenLabel, activeBook?.name)];
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  // Lưu lịch sử chat
  useEffect(() => {
    try {
      localStorage.setItem('quizgen_copilot_chat', JSON.stringify(messages.slice(-20)));
    } catch {}
  }, [messages]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';
      const historyPayload = messages.slice(-6).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      // Nạp sâu toàn bộ dữ liệu giáo trình và câu hỏi vào context gửi sang Gemini
      const contextPayload = {
        currentScreen,
        screenLabel,
        userName,
        documentId: activeBook?.id || null,
        documentName: activeBook?.name || null,
        documentPages: activeBook?.totalPages || null,
        allDocuments: uploadedBooks.map((b: any) => ({
          id: b.id,
          name: b.name,
          totalPages: b.totalPages,
          chaptersCount: b.chaptersCount,
        })),
        activeQuestion: activeQuestion
          ? {
              id: activeQuestion.id,
              question: activeQuestion.question,
              bloomLevel: activeQuestion.bloomLevel,
              correctAnswerId: activeQuestion.correctAnswerId,
              explanation: activeQuestion.explanation,
              options: activeQuestion.options,
            }
          : null,
      };

      const res = await fetch(`${API_BASE}/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: historyPayload,
          context: contextPayload,
        }),
      });

      let replyContent = '';
      let suggestions: string[] = [];

      if (res.ok) {
        const data = await res.json();
        replyContent = data.reply || 'Đã ghi nhận yêu cầu của Thầy/Cô.';
        suggestions = data.suggestedActions || [];
      } else {
        replyContent =
          'Hệ thống AI đang xử lý lưu lượng cao. Thầy/Cô vui lòng gửi lại câu hỏi hoặc thử lại sau giây lát.';
      }

      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: 'assistant',
        content: replyContent,
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        suggestedActions: suggestions,
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      const errorMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: 'assistant',
        content:
          'Không thể kết nối tới máy chủ AI Copilot. Vui lòng kiểm tra lại dịch vụ hoặc thử các tùy chọn bên dưới.',
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        suggestedActions: ['💡 Thử lại', '📊 Tư vấn ma trận Bloom', '🖨️ Xuất đề thi'],
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = () => {
    const welcome = DEFAULT_WELCOME_MESSAGE(userName, screenLabel, activeBook?.name);
    setMessages([welcome]);
    try {
      localStorage.removeItem('quizgen_copilot_chat');
    } catch {}
  };

  const handleCopy = (id: string, text: string) => {
    void navigator.clipboard?.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <>
      {/* ─── Floating Action Button (FAB) ─────────────────────────────────── */}
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-40 flex items-center gap-3">
          {/* Subtle floating badge tooltip */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/95 text-slate-700 text-xs font-semibold shadow-md border border-slate-200 select-none animate-bounce">
            <Sparkles className="w-3.5 h-3.5 text-[#008689]" />
            <span>Hỏi Quanta AI</span>
          </div>

          <button
            onClick={() => setIsOpen(true)}
            aria-label="Mở Trợ lý Khảo thí AI"
            className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#008689] to-[#00b4b8] text-white shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-300 flex items-center justify-center relative group"
          >
            <div className="absolute inset-0 rounded-full bg-[#008689] opacity-25 animate-ping" />
            <Sparkles className="w-6 h-6 text-white group-hover:rotate-12 transition-transform duration-300 relative z-10" />
            <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-emerald-400 border-2 border-white rounded-full" />
          </button>
        </div>
      )}

      {/* ─── Modern AI Chat Drawer / Window ───────────────────────────────── */}
      {isOpen && (
        <div
          className={`fixed bottom-6 right-6 z-50 w-96 max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden transition-all duration-300 ${
            isMinimized ? 'h-16' : 'h-[540px] max-h-[85vh]'
          }`}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-[#008689] via-[#007678] to-[#006062] px-4 py-3 text-white flex items-center justify-between shadow-sm select-none">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/20 shrink-0">
                <Sparkles className="w-4 h-4 text-emerald-300" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs font-extrabold tracking-tight truncate">Quanta</h3>
                  <span className="inline-flex items-center px-1.5 py-0.2 text-[9px] font-bold rounded-full bg-emerald-400/20 text-emerald-200 border border-emerald-400/30">
                    AI Scholar
                  </span>
                </div>
                <p className="text-[10px] text-white/80 truncate">
                  Đang xem: <strong className="text-white font-medium">{screenLabel}</strong>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleClearHistory}
                title="Làm mới cuộc trò chuyện"
                className="p-1.5 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsMinimized((prev) => !prev)}
                title={isMinimized ? 'Mở rộng' : 'Thu nhỏ'}
                className="p-1.5 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors"
              >
                {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Đóng cửa sổ"
                className="p-1.5 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Body when not minimized */}
          {!isMinimized && (
            <>
              {/* Linked Textbook Context Selector */}
              {uploadedBooks.length > 0 && (
                <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-[11px] gap-2">
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    <BookOpen className="w-3.5 h-3.5 text-[#008689] shrink-0" />
                    <span className="text-slate-500 shrink-0 font-medium">Giáo trình:</span>
                    <select
                      value={activeBook?.id || ''}
                      onChange={(e) => {
                        const newId = e.target.value;
                        setSelectedBookId(newId);
                        try {
                          localStorage.setItem('quizgen_selected_book_id', newId);
                          const matched = uploadedBooks.find((b) => b.id === newId);
                          if (matched) {
                            localStorage.setItem('quizgen_selected_book_name', matched.name);
                          }
                        } catch {}
                      }}
                      className="bg-white border border-slate-200 rounded px-1.5 py-0.5 text-[11px] font-semibold text-slate-700 outline-none truncate max-w-[170px]"
                    >
                      {uploadedBooks.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name} ({b.totalPages || '?'} tr)
                        </option>
                      ))}
                    </select>
                  </div>
                  <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 shrink-0">
                    RAG Connected
                  </span>
                </div>
              )}

              {/* Active Question Banner if available */}
              {activeQuestion && (
                <div className="px-3 py-1 bg-[#e0f7fa]/60 border-b border-[#008689]/15 flex items-center justify-between text-[10px] text-slate-700">
                  <div className="flex items-center gap-1.5 truncate">
                    <CheckCircle2 className="w-3 h-3 text-[#008689] shrink-0" />
                    <span className="truncate">
                      Liên kết câu hỏi: <strong className="text-[#008689]">{activeQuestion.id}</strong> ({activeQuestion.bloomLevel})
                    </span>
                  </div>
                  <span className="text-[9px] text-slate-400 shrink-0">Sẵn sàng phân tích</span>
                </div>
              )}

              {/* Chat Message Stream */}
              <div className="flex-1 p-3.5 overflow-y-auto space-y-3 bg-[#f8fafc] text-xs">
                {messages.map((m) => {
                  const isUser = m.role === 'user';
                  return (
                    <div
                      key={m.id}
                      className={`flex gap-2 items-start ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                    >
                      {/* Avatar */}
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-white text-[10px] ${
                          isUser ? 'bg-slate-700' : 'bg-[#008689]'
                        }`}
                      >
                        {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                      </div>

                      {/* Bubble */}
                      <div className={`max-w-[82%] space-y-1.5 ${isUser ? 'items-end' : 'items-start'}`}>
                        <div
                          className={`p-3 rounded-2xl leading-relaxed whitespace-pre-wrap break-words shadow-sm relative group ${
                            isUser
                              ? 'bg-[#008689] text-white rounded-tr-none'
                              : 'bg-white text-slate-800 border border-slate-200/80 rounded-tl-none'
                          }`}
                        >
                          {m.content}

                          {!isUser && (
                            <button
                              onClick={() => handleCopy(m.id, m.content)}
                              title="Sao chép câu trả lời"
                              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 transition-opacity"
                            >
                              {copiedId === m.id ? (
                                <Check className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          )}
                        </div>

                        {/* Timestamp */}
                        <div className={`text-[10px] text-slate-400 px-1 ${isUser ? 'text-right' : 'text-left'}`}>
                          {m.timestamp}
                        </div>

                        {/* Suggested Action Chips */}
                        {!isUser && m.suggestedActions && m.suggestedActions.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {m.suggestedActions.map((action, idx) => (
                              <button
                                key={idx}
                                disabled={isLoading}
                                onClick={() => handleSendMessage(action)}
                                className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-white hover:bg-[#e0f7fa] text-slate-700 hover:text-[#008689] border border-slate-200 hover:border-[#008689]/40 shadow-2xs transition-all active:scale-95 text-left"
                              >
                                {action}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Loading indicator */}
                {isLoading && (
                  <div className="flex gap-2 items-start">
                    <div className="w-6 h-6 rounded-full bg-[#008689] flex items-center justify-center shrink-0 text-white">
                      <Bot className="w-3.5 h-3.5" />
                    </div>
                    <div className="px-3.5 py-2.5 rounded-2xl rounded-tl-none bg-white border border-slate-200 shadow-sm flex items-center gap-1.5 text-slate-400 text-xs">
                      <span>Quanta đang tra cứu tài liệu & suy nghĩ</span>
                      <span className="flex gap-1 items-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#008689] animate-bounce" />
                        <span className="w-1.5 h-1.5 rounded-full bg-[#008689] animate-bounce [animation-delay:0.2s]" />
                        <span className="w-1.5 h-1.5 rounded-full bg-[#008689] animate-bounce [animation-delay:0.4s]" />
                      </span>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input Bar */}
              <div className="p-2.5 bg-white border-t border-slate-200">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="Hỏi về giáo trình, khái niệm trang mấy, công thức..."
                    disabled={isLoading}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 outline-none focus:bg-white focus:border-[#008689] focus:ring-1 focus:ring-[#008689]/20 transition-all disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={!inputMessage.trim() || isLoading}
                    className="w-8 h-8 rounded-xl bg-[#008689] hover:bg-[#007072] disabled:bg-slate-200 text-white disabled:text-slate-400 flex items-center justify-center shrink-0 transition-colors shadow-sm"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
                <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-400 px-1">
                  <span>Trợ lý Khảo thí Học thuật AI</span>
                  <span>Gemini 2.5 Flash</span>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
};
