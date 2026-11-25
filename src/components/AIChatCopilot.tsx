import React, { useState, useEffect, useRef, useMemo } from 'react';
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
import { useTheme } from '../context/ThemeContext';
import apiClient, { API_BASE } from '../services/apiClient';
import {
  QuantaMarkdownRenderer,
  SupportTicketActionData,
  ExamBlueprintActionData,
  PatchQuestionActionData,
  ImportExamActionData,
} from './QuantaMarkdownRenderer';

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
  onGenerateSuccess?: (newQuestions: Question[], targetScreen?: ScreenId) => void;
  onUpdateQuestion?: (updated: Question) => void;
  onShowToast?: (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => void;
}

const SCREEN_LABELS: Record<ScreenId, string> = {
  dashboard: 'Tổng quan Học thuật',
  forum: 'Diễn đàn Học thuật',
  qgroup: 'Hội nhóm Q-Group',
  upload: 'Bước 1: Kho Giáo trình',
  generate: 'Bước 2: Sinh Câu hỏi AI',
  review: 'Bước 3: Đối soát & Biên tập',
  bank: 'Bước 4: Đóng gói & Xuất Đề Thi',
  admin_portal: 'Cổng Quản trị Hệ thống',
  support: 'Trung tâm Hỗ trợ & FAQ',
};

const getUserHonorific = (user: UserProfile | null): string => {
  if (!user) return 'Thầy/Cô';
  if (user.academicTitle && user.fullName) {
    return `${user.academicTitle}. ${user.fullName}`;
  }
  if (user.fullName) {
    return `Thầy/Cô ${user.fullName}`;
  }
  return 'Thầy/Cô';
};

const DEFAULT_WELCOME_MESSAGE = (honorific: string, screenLabel: string, bookName?: string): ChatMessage => ({
  id: 'welcome-msg',
  role: 'assistant',
  content: `Kính chào **${honorific}**! Em là **Quanta** — Quản gia Khảo thí Học thuật & Trợ lý Điều hành AI của hệ thống QuizGen AI.\n\n` +
    `Em có toàn quyền **am hiểu hệ thống, đọc hiểu sâu giáo trình**${bookName ? ` (đang kết nối trực tiếp: *${bookName}*)` : ''} và sẵn sàng can thiệp giải quyết mọi tác vụ giúp ${honorific}:\n\n` +
    `• ⚡ **Tự động hóa 4 bước tạo đề:** Lên ma trận Bloom, cấu hình đề và đưa Thầy/Cô sang đối soát câu hỏi.\n` +
    `• 📖 **Tra cứu & thẩm định tài liệu:** Tìm công thức, định lý, trích xuất luận điểm học thuật.\n` +
    `• 🛠️ **Hỗ trợ kỹ thuật 1-chạm:** Tự động tạo và gửi ticket hỗ trợ trực tiếp khi gặp sự cố hoặc đối soát nạp tiền.\n\n` +
    `*${honorific} có thể ra lệnh hoặc chọn nhanh gợi ý bên dưới để em bắt đầu ngay ạ!*`,
  timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
  suggestedActions: [
    '⚡ Tạo đề thi 4 bước mẫu',
    '📖 Tóm tắt giáo trình này',
    '📊 Đề xuất ma trận Bloom',
    '💡 Giải thích chi tiết đáp án',
    '🎧 Hỗ trợ kỹ thuật & thanh toán',
  ],
});

export const AIChatCopilot: React.FC<AIChatCopilotProps> = ({
  currentScreen,
  currentUser,
  activeQuestion,
  onNavigate,
  onGenerateSuccess,
  onUpdateQuestion,
  onShowToast,
}) => {
  const { activeThemeId } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [dismissedQuestionId, setDismissedQuestionId] = useState<string | null>(null);

  const effectiveActiveQuestion = activeQuestion && activeQuestion.id !== dismissedQuestionId ? activeQuestion : null;

  // ─── Vị trí Draggable của Nút Quanta AI FAB (Có Lực Hút Snap 2 Bên Cánh) ───
  const [fabPosition, setFabPosition] = useState<{ x: number; y: number; side?: 'left' | 'right' } | null>(() => {
    try {
      const saved = localStorage.getItem('quizgen_quanta_fab_pos');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Bảo đảm không che thanh Header trên Mobile (Header cao ~120px)
        if (typeof parsed?.x === 'number' && typeof parsed?.y === 'number' && parsed.y >= 140) {
          return parsed;
        }
      }
    } catch {}
    return null;
  });

  const [snapSide, setSnapSide] = useState<'left' | 'right'>(() => {
    try {
      const saved = localStorage.getItem('quizgen_quanta_fab_pos');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.side === 'left' || parsed?.side === 'right') return parsed.side;
        if (typeof parsed?.x === 'number' && typeof window !== 'undefined') {
          return parsed.x < window.innerWidth / 2 ? 'left' : 'right';
        }
      }
    } catch {}
    return 'right';
  });

  const [isCurrentlyDragging, setIsCurrentlyDragging] = useState(false);
  const fabElementRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    isDragging: boolean;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    hasMoved: boolean;
  }>({
    isDragging: false,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
    hasMoved: false,
  });

  // Tự động kiểm tra giới hạn mép màn hình khi cửa sổ resize và hút lại vào cánh
  useEffect(() => {
    const handleWindowResize = () => {
      setFabPosition((prev) => {
        if (!prev) return null;
        const midX = window.innerWidth / 2;
        const side: 'left' | 'right' = prev.x < midX ? 'left' : 'right';
        const snappedX = side === 'left' ? 16 : Math.max(16, window.innerWidth - 72);
        const maxY = Math.max(16, window.innerHeight - 80);
        const clampedY = Math.min(Math.max(16, prev.y), maxY);
        const clamped = { x: snappedX, y: clampedY, side };
        setSnapSide(side);
        try {
          localStorage.setItem('quizgen_quanta_fab_pos', JSON.stringify(clamped));
        } catch {}
        return clamped;
      });
    };

    window.addEventListener('resize', handleWindowResize);
    return () => window.removeEventListener('resize', handleWindowResize);
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    // Chỉ xử lý phím chuột trái hoặc chạm ngón tay
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    const rect = fabElementRef.current?.getBoundingClientRect();
    const currentX = rect ? rect.left : (fabPosition?.x ?? (window.innerWidth - 80));
    const currentY = rect ? rect.top : (fabPosition?.y ?? (window.innerHeight - 80));

    dragRef.current = {
      isDragging: true,
      startX: e.clientX,
      startY: e.clientY,
      originX: currentX,
      originY: currentY,
      hasMoved: false,
    };

    const handlePointerMove = (moveEv: PointerEvent) => {
      if (!dragRef.current.isDragging) return;
      const dx = moveEv.clientX - dragRef.current.startX;
      const dy = moveEv.clientY - dragRef.current.startY;

      if (!dragRef.current.hasMoved && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) {
        dragRef.current.hasMoved = true;
        setIsCurrentlyDragging(true);
      }

      if (dragRef.current.hasMoved) {
        const elWidth = fabElementRef.current?.offsetWidth || 56;
        const maxX = Math.max(16, window.innerWidth - elWidth - 16);
        const maxY = Math.max(140, window.innerHeight - 80);
        const newX = Math.min(Math.max(16, dragRef.current.originX + dx), maxX);
        const newY = Math.min(Math.max(140, dragRef.current.originY + dy), maxY);
        setFabPosition({ x: newX, y: newY });
      }
    };

    const handlePointerUp = () => {
      if (!dragRef.current.isDragging) return;

      const moved = dragRef.current.hasMoved;
      dragRef.current.isDragging = false;
      setIsCurrentlyDragging(false);

      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);

      if (moved) {
        // Lực hút (Snap) tự động dạt về mép trái hoặc mép phải gần nhất
        const rect = fabElementRef.current?.getBoundingClientRect();
        const curX = rect ? rect.left : (fabPosition?.x ?? (window.innerWidth - 80));
        const curY = rect ? rect.top : (fabPosition?.y ?? (window.innerHeight - 80));

        const midX = window.innerWidth / 2;
        const targetSide: 'left' | 'right' = curX < midX ? 'left' : 'right';
        const snappedX = targetSide === 'left' ? 16 : Math.max(16, window.innerWidth - 80);
        const clampedY = Math.min(Math.max(140, curY), window.innerHeight - 80);

        const finalPos = { x: Math.round(snappedX), y: Math.round(clampedY), side: targetSide };
        setFabPosition(finalPos);
        setSnapSide(targetSide);
        try {
          localStorage.setItem('quizgen_quanta_fab_pos', JSON.stringify(finalPos));
        } catch {}
      } else {
        // Nhấp chuột thông thường -> Mở khung chat
        setIsOpen(true);
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

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

  // Lắng nghe sự kiện người dùng chọn sách ở Bước 1, Bước 2 để cập nhật ngay lập tức
  useEffect(() => {
    const handleBookSelected = (e: any) => {
      const doc = e.detail;
      if (doc && doc.id) {
        setSelectedBookId(doc.id);
        setUploadedBooks((prev) => {
          if (prev.some((b: any) => b.id === doc.id)) {
            return prev.map((b: any) =>
              b.id === doc.id
                ? { ...b, name: doc.name || b.name, totalPages: doc.totalPages || b.totalPages }
                : b
            );
          }
          return [
            {
              id: doc.id,
              name: doc.name || 'Tài liệu giáo trình',
              totalPages: doc.totalPages || 120,
              chaptersCount: 4,
              isShared: false,
            },
            ...prev,
          ];
        });
      }
    };
    window.addEventListener('quizgen_book_selected', handleBookSelected);
    return () => window.removeEventListener('quizgen_book_selected', handleBookSelected);
  }, []);

  // Tự động đồng bộ toàn bộ tài liệu (cả tài liệu cá nhân và thư viện giáo trình dùng chung)
  useEffect(() => {
    const syncRealDocuments = async () => {
      try {
        const [myRes, sharedRes] = await Promise.all([
          apiClient.get<any[]>('/documents/documents?scope=my').catch(() =>
            apiClient.get<any[]>('/documents?scope=my').catch(() => [])
          ),
          apiClient.get<any[]>('/documents/documents?scope=shared').catch(() =>
            apiClient.get<any[]>('/documents?scope=shared').catch(() => [])
          ),
        ]);

        const rawList = [
          ...(Array.isArray(myRes) ? myRes : []),
          ...(Array.isArray(sharedRes) ? sharedRes : []),
        ];

        if (rawList.length > 0) {
          const normalized = rawList
            .filter(Boolean)
            .map((b: any) => ({
              id: String(b.id),
              name: String(b.name || b.title || 'Tài liệu giáo trình'),
              totalPages: Number(b.totalPages || b.total_pages || 120),
              chaptersCount: Number(b.chaptersCount || b.chapters_count || 4),
              isShared: Boolean(b.isShared || b.is_shared),
            }));

          const unique = normalized.filter(
            (doc, index, self) => index === self.findIndex((d) => d.id === doc.id)
          );

          setUploadedBooks(unique);
          try {
            localStorage.setItem('quizgen_uploaded_documents', JSON.stringify(unique));
          } catch {}

          const selId = localStorage.getItem('quizgen_selected_book_id');
          const selName = localStorage.getItem('quizgen_selected_book_name');

          if (selId && unique.some((b) => b.id === selId)) {
            setSelectedBookId(selId);
          } else if (selName && unique.some((b) => b.name === selName)) {
            const found = unique.find((b) => b.name === selName);
            if (found) setSelectedBookId(found.id);
          } else if (selId) {
            setSelectedBookId(selId);
          } else if (unique.length > 0) {
            setSelectedBookId(unique[0].id);
          }
          return;
        }
      } catch {}

      // Fallback từ localStorage nếu offline
      try {
        const books = JSON.parse(localStorage.getItem('quizgen_uploaded_documents') || '[]');
        if (Array.isArray(books) && books.length > 0) {
          setUploadedBooks(books);
          const selId = localStorage.getItem('quizgen_selected_book_id');
          const selName = localStorage.getItem('quizgen_selected_book_name');
          if (selId && books.some((b: any) => b.id === selId)) {
            setSelectedBookId(selId);
          } else if (selName && books.some((b: any) => b.name === selName)) {
            const found = books.find((b: any) => b.name === selName);
            if (found) setSelectedBookId(found.id);
          } else if (selId) {
            setSelectedBookId(selId);
          } else if (books.length > 0) {
            setSelectedBookId(books[0].id);
          }
        }
      } catch {}
    };

    syncRealDocuments();
  }, [isOpen, currentScreen]);

  const activeBook = useMemo(() => {
    // 1. Tìm theo selectedBookId trong danh sách uploadedBooks
    if (selectedBookId) {
      const match = uploadedBooks.find((b: any) => b.id === selectedBookId || b.name === selectedBookId);
      if (match) return match;
    }

    // 2. Tìm theo thông tin sách đã lưu trong localStorage (từ AIGenerationScreen / TextbookUploadScreen)
    const savedId = localStorage.getItem('quizgen_selected_book_id');
    const savedName = localStorage.getItem('quizgen_selected_book_name');
    const savedPages = localStorage.getItem('quizgen_selected_book_pages');

    if (savedName || savedId) {
      const matchSaved = uploadedBooks.find(
        (b: any) => (savedId && b.id === savedId) || (savedName && b.name === savedName)
      );
      if (matchSaved) return matchSaved;
      return {
        id: savedId || 'doc-active',
        name: savedName || 'Giáo trình đã chọn',
        totalPages: Number(savedPages) || 120,
      };
    }

    return uploadedBooks.length > 0 ? uploadedBooks[0] : null;
  }, [uploadedBooks, selectedBookId]);

  const userHonorific = getUserHonorific(currentUser);
  const userChatKey = currentUser?.email
    ? `quizgen_copilot_chat_${currentUser.email.toLowerCase().trim()}`
    : 'quizgen_copilot_chat';

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const email = currentUser?.email?.toLowerCase().trim();
      const specificKey = email ? `quizgen_copilot_chat_${email}` : null;
      const saved = (specificKey ? localStorage.getItem(specificKey) : null) ||
        localStorage.getItem('quizgen_copilot_chat') ||
        (specificKey ? sessionStorage.getItem(specificKey) : null) ||
        sessionStorage.getItem('quizgen_copilot_chat');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [DEFAULT_WELCOME_MESSAGE(userHonorific, screenLabel, activeBook?.name)];
  });

  // Tự động khôi phục tin nhắn khi thông tin người dùng được nạp thành công
  useEffect(() => {
    if (!currentUser?.email) return;
    try {
      const specificKey = `quizgen_copilot_chat_${currentUser.email.toLowerCase().trim()}`;
      const saved = localStorage.getItem(specificKey) || localStorage.getItem('quizgen_copilot_chat');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 1) {
          setMessages(parsed);
        }
      }
    } catch {}
  }, [currentUser?.email]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  // Handler xử lý khi người dùng gửi ticket hỗ trợ từ Quanta Action Card
  const handleSubmitSupportTicket = async (ticketData: SupportTicketActionData) => {
    try {
      const payload = {
        subject: ticketData.title || 'Yêu cầu hỗ trợ & đối soát từ Quanta Copilot',
        description: ticketData.description || 'Người dùng gửi yêu cầu hỗ trợ qua Quanta Butler',
        category: ticketData.category === 'payment' ? 'PAYMENT_BILLING' : 'GENERAL_INQUIRY',
        priority: 'HIGH',
        user_tier: currentUser?.planTier || 'FREE',
        error_context_json: JSON.stringify({
          source: 'Quanta Butler Copilot',
          currentScreen,
          screenLabel,
          userEmail: currentUser?.email,
          userName: userHonorific,
          hasAttachments: Boolean(ticketData.files && ticketData.files.length > 0),
          attachmentCount: ticketData.files?.length || 0,
          timestamp: new Date().toISOString(),
        }),
      };

      // 1. Tạo ticket trên backend support-service qua api-gateway (port 8008)
      let createdTicket: any = null;
      try {
        createdTicket = await apiClient.post('/support/tickets', payload);
      } catch (err) {
        console.warn('Lỗi gọi API support/tickets:', err);
      }

      // 2. Nếu có đính kèm ảnh (biên lai thanh toán / screenshot lỗi), upload ngay
      const ticketId = createdTicket?.id;
      if (ticketId && ticketData.files && ticketData.files.length > 0) {
        try {
          const formData = new FormData();
          for (const file of ticketData.files) {
            formData.append('files', file);
          }
          await apiClient.post(`/support/tickets/${ticketId}/attachments`, formData);
        } catch (uploadErr) {
          console.warn('Lỗi upload file đính kèm ticket:', uploadErr);
        }
      }

      // 3. Lưu local cache để đối soát
      const savedTickets = JSON.parse(localStorage.getItem('quizgen_support_tickets') || '[]');
      savedTickets.unshift({
        id: createdTicket?.ticket_code || `TK-${Date.now().toString(36).toUpperCase()}`,
        ticketId: ticketId,
        createdAt: new Date().toISOString(),
        userEmail: currentUser?.email || 'guest@quizgen.vn',
        userName: userHonorific,
        ...payload,
        hasAttachments: Boolean(ticketData.files && ticketData.files.length > 0),
        status: 'OPEN',
      });
      localStorage.setItem('quizgen_support_tickets', JSON.stringify(savedTickets));

      if (onShowToast) {
        onShowToast(
          'success',
          'Đã gửi phiếu hỗ trợ thành công',
          ticketData.files && ticketData.files.length > 0
            ? `Đã gửi kèm ${ticketData.files.length} ảnh biên lai/chứng từ tới Ban Quản Trị.`
            : 'Admin sẽ tiếp nhận và phản hồi sớm nhất.'
        );
      }

      return true;
    } catch (e) {
      console.error('Lỗi gửi ticket:', e);
      return false;
    }
  };

  // Handler xử lý khi Quanta đề xuất tinh chỉnh / sửa câu hỏi 1-chạm (Trọng tâm 2)
  const handlePatchQuestion = async (patchData: PatchQuestionActionData) => {
    try {
      if (!patchData || !patchData.questionId) return false;

      // 1. Tìm câu hỏi trong localStorage hoặc activeQuestion
      const savedQuestions: Question[] = JSON.parse(
        localStorage.getItem('quizgen_questions') ||
        localStorage.getItem('quizgen_pending_review_questions') ||
        '[]'
      );

      const targetQ = savedQuestions.find((q) => q.id === patchData.questionId) ||
        (activeQuestion?.id === patchData.questionId ? activeQuestion : null);

      if (!targetQ) {
        if (onShowToast) {
          onShowToast('warning', 'Không tìm thấy câu hỏi', `Không tìm thấy câu hỏi ID ${patchData.questionId} để cập nhật.`);
        }
        return false;
      }

      // 2. Hợp nhất các trường đã tinh chỉnh
      const patch = patchData.patch || {};
      const updatedQ: Question = {
        ...targetQ,
        question: patch.question || targetQ.question,
        options: patch.options && patch.options.length > 0 ? patch.options.map((o) => ({
          id: o.id,
          label: o.label || o.id,
          text: o.text,
        })) : targetQ.options,
        correctAnswerId: patch.correctAnswerId || targetQ.correctAnswerId,
        explanation: patch.explanation || targetQ.explanation,
        bloomLevel: (patch.bloomLevel as any) || targetQ.bloomLevel,
      };

      // 3. Cập nhật state ở tầng App
      if (onUpdateQuestion) {
        onUpdateQuestion(updatedQ);
      }

      // 4. Lưu đồng bộ vào localStorage
      const updatedList = savedQuestions.map((q) => (q.id === updatedQ.id ? updatedQ : q));
      if (!savedQuestions.some((q) => q.id === updatedQ.id)) {
        updatedList.unshift(updatedQ);
      }
      localStorage.setItem('quizgen_questions', JSON.stringify(updatedList));
      localStorage.setItem('quizgen_pending_review_questions', JSON.stringify(updatedList));

      // 5. Cập nhật CSDL backend qua API PUT
      try {
        await apiClient.fetch(`${API_BASE}/questions/${updatedQ.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedQ),
        });
      } catch (dbErr) {
        console.warn('Lỗi đồng bộ CSDL questions PUT:', dbErr);
      }

      if (onShowToast) {
        onShowToast('success', 'Quanta đã cập nhật câu hỏi!', patchData.diffSummary || `Đã cập nhật câu hỏi ${updatedQ.id} thành công.`);
      }

      // Thêm phản hồi xác nhận của Quanta vào chat
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now()}`,
          role: 'assistant',
          content: `✅ Quanta đã cập nhật trực tiếp câu hỏi **${updatedQ.id}** vào bộ đề tại Bước 3 theo yêu cầu của Thầy/Cô!\n\n• **Đáp án đúng:** Phương án ${updatedQ.correctAnswerId}\n• **Mức độ Bloom:** ${updatedQ.bloomLevel}\n\nThầy/Cô có thể kiểm tra ngay trong Không gian Thẩm định.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);

      return true;
    } catch (e) {
      console.error('Lỗi khi Quanta patch câu hỏi:', e);
      return false;
    }
  };

  // Handler xử lý khi Quanta nạp đề thi / câu hỏi mới vào Bước 4 (In đề) hoặc Bước 3 (Thẩm định)
  const handleImportExam = async (importData: ImportExamActionData, targetScreen: ScreenId = 'bank') => {
    try {
      if (!importData || !importData.questions || importData.questions.length === 0) return false;

      const labels = ['A', 'B', 'C', 'D'];
      const targetDocName = activeBook?.name || 'Giáo trình Quanta AI';
      const mappedQuestions: Question[] = importData.questions.map((rawQ: any, idx: number) => {
        let opts = rawQ.options || [];
        if (Array.isArray(opts)) {
          opts = opts.map((opt: any, optIdx: number) => {
            if (typeof opt === 'string') {
              const char = labels[optIdx] || String.fromCharCode(65 + optIdx);
              return { id: char, label: char, text: opt };
            }
            const char = opt.label || labels[optIdx] || String.fromCharCode(65 + optIdx);
            return {
              id: opt.id || char,
              label: char,
              text: opt.text || opt.content || '',
            };
          });
        }

        const bloomRaw = String(rawQ.bloomLevel || rawQ.bloom_level || 'Thông hiểu').toLowerCase();
        let bloomLevel: Question['bloomLevel'] = 'Thông hiểu';
        if (bloomRaw.includes('nhận biết') || bloomRaw.includes('remember')) bloomLevel = 'Nhận biết';
        else if (bloomRaw.includes('vận dụng cao') || bloomRaw.includes('phân tích') || bloomRaw.includes('analyze')) bloomLevel = 'Phân tích';
        else if (bloomRaw.includes('vận dụng') || bloomRaw.includes('apply')) bloomLevel = 'Vận dụng';

        return {
          id: String(rawQ.id || `q-quanta-${Date.now()}-${idx + 1}`),
          sourceChunkId: `chunk-quanta-${idx + 1}`,
          textbookName: rawQ.textbookName || targetDocName,
          chapter: rawQ.chapter || 'Chương tổng hợp',
          bloomLevel,
          question: String(rawQ.question || rawQ.questionText || ''),
          options: opts,
          correctAnswerId: String(rawQ.correctAnswerId || rawQ.correctAnswer || opts[0]?.id || 'A'),
          explanation: String(rawQ.explanation || 'Lời giải thích được Quanta AI biên soạn bám sát chuẩn khảo thí.'),
          confidenceScore: 98,
          status: (targetScreen === 'bank' ? 'approved' : 'pending') as any,
          createdAt: 'Hôm nay',
          hasFormula: Boolean(rawQ.hasFormula || String(rawQ.question || '').includes('$')),
        };
      });

      // 1. Cập nhật localStorage
      const existing: Question[] = JSON.parse(
        localStorage.getItem('quizgen_questions') ||
        localStorage.getItem('quizgen_pending_review_questions') ||
        '[]'
      );
      const combined = [...mappedQuestions, ...existing.filter((eq) => !mappedQuestions.some((mq) => mq.id === eq.id))];
      try {
        localStorage.setItem('quizgen_questions', JSON.stringify(combined));
        localStorage.setItem('quizgen_pending_review_questions', JSON.stringify(combined));
      } catch {}

      // 2. Nếu nạp vào Bước 4 (In đề), tạo sẵn gói đề thi hoàn chỉnh trong quizgen_saved_exams
      if (targetScreen === 'bank') {
        try {
          const savedExamsRaw = localStorage.getItem('quizgen_saved_exams');
          const savedExamsList = savedExamsRaw ? JSON.parse(savedExamsRaw) : [];
          const examRecord = {
            id: `exam-${Date.now()}`,
            title: importData.title || `Bộ Đề Khảo Thí Quanta (${mappedQuestions.length} câu)`,
            subject: targetDocName.replace(/\.[^/.]+$/, ''),
            faculty: currentUser?.faculty || 'KHOA CÔNG NGHỆ THÔNG TIN',
            university: currentUser?.university || 'TRƯỜNG ĐẠI HỌC GIAO THÔNG VẬN TẢI TP.HCM (UTH)',
            durationMinutes: Math.max(15, mappedQuestions.length * 2),
            examCodeCount: 4,
            examCodes: ['101', '102', '103', '104'],
            questionCount: mappedQuestions.length,
            questions: mappedQuestions,
            createdAt: new Date().toLocaleString('vi-VN'),
            format: 'docx',
          };
          const updatedSavedExams = [examRecord, ...savedExamsList].slice(0, 50);
          localStorage.setItem('quizgen_saved_exams', JSON.stringify(updatedSavedExams));
        } catch {}
      }

      // 3. Cập nhật State toàn cục qua onGenerateSuccess
      if (onGenerateSuccess) {
        onGenerateSuccess(combined, targetScreen);
      }

      // 4. Điều hướng
      if (onNavigate) {
        onNavigate(targetScreen);
      }

      if (onShowToast) {
        onShowToast(
          'success',
          'Quanta đã nạp đề thi thành công!',
          `Đã nạp ${mappedQuestions.length} câu hỏi vào ${targetScreen === 'bank' ? 'Bước 4 (In ấn & Ngân hàng đề)' : 'Bước 3 (Thẩm định)'}.`
        );
      }

      // 5. Thêm phản hồi xác nhận vào chat
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-import-${Date.now()}`,
          role: 'assistant',
          content: `✅ Quanta đã nạp thành công **${mappedQuestions.length} câu hỏi** vào **${targetScreen === 'bank' ? 'Bước 4: Ngân hàng đề & In đề' : 'Bước 3: Không gian Thẩm định'}** theo yêu cầu của Thầy/Cô!\n\n` +
            `• **Đề thi:** ${importData.title || 'Bộ đề thi Quanta AI'}\n` +
            `• **Số lượng câu hỏi:** ${mappedQuestions.length} câu đã sẵn sàng tạo mã đề (101, 102...) và xuất bản in A4 / file Word (.docx) / phiếu OMR.\n\n` +
            `*Hệ thống đã tự động chuyển màn hình sang Bước ${targetScreen === 'bank' ? '4' : '3'} để Thầy/Cô thao tác ngay ạ!*`,
          timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
          suggestedActions: targetScreen === 'bank'
            ? ['🖨️ Xuất file Word (.docx)', '📋 Tạo mã đề hoán vị', '📝 Quay lại duyệt Bước 3']
            : ['🚀 Chuyển sang Bước 4 in đề', '💡 Đổi câu hỏi khó hơn', '📊 Xem thống kê Bloom'],
        },
      ]);

      return true;
    } catch (e) {
      console.error('Lỗi khi Quanta import đề thi:', e);
      return false;
    }
  };

  // Handler xử lý khi người dùng xác nhận kế hoạch sinh đề 4 bước từ Quanta Action Card (Full Agentic Execution)
  const handleAutoGenerateExam = async (blueprint: ExamBlueprintActionData) => {
    // 1. Lưu blueprint vào localStorage để màn hình Bước 2 (AIGenerationScreen) có thể nạp khi cần 'Tự chỉnh'
    try {
      localStorage.setItem('quizgen_pending_exam_blueprint', JSON.stringify({
        ...blueprint,
        createdAt: Date.now(),
      }));
    } catch {}

    const targetDocName = blueprint.documentName || activeBook?.name || 'Giáo trình Kỹ thuật đồ họa - 2018';
    const targetDocId = blueprint.documentId || activeBook?.id || 'tb-039';
    const count = Number(blueprint.questionCount || 20);
    const ratio = blueprint.bloomRatio || { know: 30, understand: 40, apply: 20, analyze: 10 };

    const nb = Math.round((count * (ratio.know || 25)) / 100);
    const th = Math.round((count * (ratio.understand || 25)) / 100);
    const vd = Math.round((count * (ratio.apply || 25)) / 100);
    const vdc = Math.max(0, count - nb - th - vd);

    // Bắn tin nhắn loading từ Quanta
    const loadingMsgId = `bot-loading-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      {
        id: loadingMsgId,
        role: 'assistant',
        content: `⏳ **Quanta đang kích hoạt quy trình sinh đề thi tự động:**\n\n` +
          `• 📖 **Giáo trình:** *${targetDocName}*\n` +
          `• 📑 **Chương:** *${blueprint.chapter || 'Chương 2: Các thuật toán cơ sở và Phép biến đổi hình học 2D/3D'}*\n` +
          `• 📊 **Quy mô ma trận:** ${count} câu hỏi (Nhận biết: ${nb}, Thông hiểu: ${th}, Vận dụng: ${vd}, Vận dụng cao: ${vdc})\n\n` +
          `*Quanta đang nạp ngữ cảnh trích đoạn và gọi Gemini AI sinh đề trắc nghiệm thật sự... Vui lòng đợi trong giây lát ạ!*`,
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      },
    ]);

    try {
      const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || '/api/v1';
      const token = localStorage.getItem('quizgen_auth_token') || sessionStorage.getItem('quizgen_token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const payload = {
        documentId: targetDocId,
        document_id: targetDocId,
        documentName: targetDocName,
        document_name: targetDocName,
        chapters: blueprint.chapter ? [blueprint.chapter] : [],
        bloomMatrix: {
          nhanBiet: nb,
          thongHieu: th,
          vanDung: vd,
          phanTich: vdc,
        },
        bloom_matrix: {
          nhanBiet: nb,
          thongHieu: th,
          vanDung: vd,
          phanTich: vdc,
        },
        pedagogicalPrompt: 'Sinh câu hỏi trắc nghiệm chất lượng cao bám sát giáo trình',
      };

      const res = await apiClient.fetch(`${API_BASE}/ai/generate`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`AI Service phản hồi mã ${res.status}`);
      }

      const data = await res.json();
      const rawList: any[] = Array.isArray(data) ? data : Array.isArray(data?.questions) ? data.questions : [];

      if (rawList.length === 0) {
        throw new Error('AI không trả về danh sách câu hỏi phù hợp.');
      }

      const labels = ['A', 'B', 'C', 'D'];
      const mappedQuestions: Question[] = rawList.map((item: any, idx: number) => {
        let opts = item.options || [];
        if (Array.isArray(opts)) {
          opts = opts.map((opt: any, optIdx: number) => {
            if (typeof opt === 'string') {
              return {
                id: `opt-${String.fromCharCode(97 + optIdx)}`,
                label: labels[optIdx] || String(optIdx + 1),
                text: opt,
              };
            }
            return {
              id: String(opt.id || `opt-${String.fromCharCode(97 + optIdx)}`),
              label: String(opt.label || String.fromCharCode(65 + optIdx)),
              text: String(opt.text || opt.content || ''),
            };
          });
        }

        const bloomRaw = String(item.bloomLevel || item.bloom_level || 'Nhận biết').toLowerCase();
        let bloomLevel: Question['bloomLevel'] = 'Nhận biết';
        if (bloomRaw.includes('thông hiểu') || bloomRaw.includes('understand')) bloomLevel = 'Thông hiểu';
        else if (bloomRaw.includes('vận dụng cao') || bloomRaw.includes('phân tích') || bloomRaw.includes('analyze')) bloomLevel = 'Phân tích';
        else if (bloomRaw.includes('vận dụng') || bloomRaw.includes('apply')) bloomLevel = 'Vận dụng';

        return {
          id: String(item.id || `q-quanta-${Date.now()}-${idx + 1}`),
          sourceChunkId: String(item.sourceChunkId || item.source_chunk_id || `chunk-${idx + 1}`),
          textbookName: targetDocName,
          chapter: String(item.chapter || blueprint.chapter || 'Chương tổng hợp'),
          bloomLevel,
          question: String(item.question || item.questionText || item.question_text || ''),
          options: opts,
          correctAnswerId: String(item.correctAnswerId || item.correct_answer_id || opts[0]?.id || 'opt-a'),
          explanation: String(item.explanation || 'Minh chứng trích xuất từ tài liệu giáo trình.'),
          confidenceScore: Number(item.confidenceScore ?? item.confidence_score ?? 96),
          status: 'pending',
          createdAt: 'Hôm nay',
          hasFormula: Boolean(item.hasFormula || item.has_formula || String(item.question || '').includes('$')),
          hasImage: Boolean(item.hasImage || item.has_image || item.imageUrl),
          imageUrl: item.imageUrl || undefined,
        };
      });

      // Cập nhật câu hỏi thật vào toàn hệ thống
      if (onGenerateSuccess) {
        onGenerateSuccess(mappedQuestions);
      }
      try {
        localStorage.setItem('quizgen_questions', JSON.stringify(mappedQuestions));
        localStorage.setItem('quizgen_pending_review_questions', JSON.stringify(mappedQuestions));
      } catch {}

      if (onShowToast) {
        onShowToast('success', 'Quanta sinh đề thành công!', `Đã sinh thành công ${mappedQuestions.length} câu hỏi mới.`);
      }

      // Cập nhật tin nhắn thành công
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== loadingMsgId),
        {
          id: `bot-done-${Date.now()}`,
          role: 'assistant',
          content: `🎉 **Quanta đã sinh thành công bộ đề thi mới gồm ${mappedQuestions.length} câu hỏi!**\n\n` +
            `• **Tài liệu nguồn:** *${targetDocName}*\n` +
            `• **Số lượng câu hỏi mới:** ${mappedQuestions.length} câu đã được tải vào Không gian Đối soát.\n\n` +
            `*Em đã đưa Thầy/Cô sang Bước 3 (Đối soát & Biên tập) để kiểm duyệt đáp án và giải thích chi tiết ngay ạ!*`,
          timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
          suggestedActions: ['💡 Đổi câu hỏi khó hơn', '📊 Xem thống kê ma trận', '🖨️ Sang Bước 4: Xuất đề Word'],
        },
      ]);

      if (onNavigate) {
        onNavigate('review');
      }
    } catch (err: any) {
      console.error('Lỗi sinh đề từ Quanta:', err);
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== loadingMsgId),
        {
          id: `bot-err-${Date.now()}`,
          role: 'assistant',
          content: `⚠️ **Quanta không thể tự động sinh đề do:** ${err.message || 'Lỗi kết nối AI Service'}.\n\n` +
            `Thầy/Cô có thể bấm nút **Tự chỉnh** ở trên để chuyển sang Bước 2 và tự bấm sinh đề với cấu hình này ạ!`,
          timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
          suggestedActions: ['⚙️ Mở Bước 2: Tự chỉnh', '🎧 Báo lỗi kỹ thuật'],
        },
      ]);
    }
  };

  // Lưu lịch sử chat an toàn và bền vững (tối đa 100 tin nhắn, lưu đa tầng localStorage & sessionStorage)
  useEffect(() => {
    if (!messages || messages.length === 0) return;
    try {
      const payload = JSON.stringify(messages.slice(-100));
      if (userChatKey) {
        localStorage.setItem(userChatKey, payload);
        sessionStorage.setItem(userChatKey, payload);
      }
      localStorage.setItem('quizgen_copilot_chat', payload);
      sessionStorage.setItem('quizgen_copilot_chat', payload);
    } catch (e) {
      console.warn('Lỗi lưu lịch sử chat Quanta:', e);
    }
  }, [messages, userChatKey]);

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
      const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || '/api/v1';
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
        activeQuestion: effectiveActiveQuestion
          ? {
              id: effectiveActiveQuestion.id,
              question: effectiveActiveQuestion.question,
              bloomLevel: effectiveActiveQuestion.bloomLevel,
              correctAnswerId: effectiveActiveQuestion.correctAnswerId,
              explanation: effectiveActiveQuestion.explanation,
              options: effectiveActiveQuestion.options,
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

        // Tự động gửi Ticket lên support-service & Admin Portal ngay lập tức khi Quanta tạo action:support_ticket
        const ticketMatch = /```action:support_ticket\s*([\s\S]*?)```/.exec(replyContent);
        if (ticketMatch) {
          try {
            const ticketPayload: SupportTicketActionData = JSON.parse(ticketMatch[1].trim());
            setTimeout(() => {
              handleSubmitSupportTicket(ticketPayload);
            }, 300);
          } catch (tErr) {
            console.warn('Lỗi auto-submit support ticket:', tErr);
          }
        }

        // Kiểm tra xem Quanta có trả về khối action:import_exam không
        const importMatch = /```action:import_exam\s*([\s\S]*?)```/.exec(replyContent);
        const isAutoRequested = /nạp|đưa vào|chuyển qua|vào bước 4|vào bước 3|in đề|xuất đề/i.test(text);

        if (importMatch) {
          try {
            const importPayload: ImportExamActionData = JSON.parse(importMatch[1].trim());
            if (isAutoRequested || importPayload.autoExecute) {
              const targetScreen = /bước 3|duyệt|thẩm định/i.test(text) ? 'review' : (importPayload.targetScreen || 'bank');
              setTimeout(() => {
                handleImportExam(importPayload, targetScreen);
              }, 500);
            }
          } catch (parseErr) {
            console.warn('Lỗi auto-import:', parseErr);
          }
        } else if (isAutoRequested) {
          // Fallback an toàn: Nếu người dùng yêu cầu nạp vào bước 4 mà Gemini chưa chèn khối action
          // Tự động quét tìm câu hỏi trong nội dung phản hồi hiện tại hoặc tin nhắn trước
          const parseQuestions = (rawText: string) => {
            const parsed: any[] = [];
            const qBlocks = rawText.split(/(?:(?:\*\*)?(?:Câu\s+\d+|Question\s+\d+|\d+\.)(?:\*\*)?[:\.\-])/i);
            if (qBlocks.length > 1) {
              for (let bIdx = 1; bIdx < qBlocks.length; bIdx++) {
                const block = qBlocks[bIdx];
                const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
                if (lines.length === 0) continue;
                const qText = lines[0].replace(/^[:\-\s]+/, '');
                const optLines = lines.filter((l) => /^[A-D][\.\:\)]\s*/i.test(l));
                if (optLines.length >= 2) {
                  const opts = optLines.map((ol, idx) => {
                    const char = String.fromCharCode(65 + idx);
                    return {
                      id: char,
                      label: char,
                      text: ol.replace(/^[A-D][\.\:\)]\s*/i, ''),
                    };
                  });
                  const ansMatch = /đáp án(?:\s+đúng)?[:\s]+(?:phương án\s+)?([A-D])/i.exec(block);
                  parsed.push({
                    question: qText,
                    options: opts,
                    correctAnswerId: ansMatch ? ansMatch[1].toUpperCase() : 'A',
                    bloomLevel: 'Thông hiểu',
                  });
                }
              }
            }
            return parsed;
          };

          let foundQs = parseQuestions(replyContent);
          if (foundQs.length === 0 && messages.length > 0) {
            for (let i = messages.length - 1; i >= 0 && messages.length - i <= 3; i--) {
              if (messages[i].role === 'assistant') {
                foundQs = parseQuestions(messages[i].content);
                if (foundQs.length > 0) break;
              }
            }
          }

          if (foundQs.length > 0) {
            const fallbackPayload: ImportExamActionData = {
              title: 'Bộ Đề Khảo Thí Quanta Trích Xuất',
              targetScreen: /bước 3|duyệt|thẩm định/i.test(text) ? 'review' : 'bank',
              questions: foundQs,
            };
            setTimeout(() => {
              handleImportExam(fallbackPayload, fallbackPayload.targetScreen || 'bank');
            }, 500);
          }
        }
      } else {
        replyContent =
          'Hệ thống AI đang xử lý lưu lượng cao. Thầy/Cô vui lòng gửi lại câu hỏi hoặc thử lại sau giây lát.';
      }

      const isSupportQuery = /thanh toán|nạp tiền|lỗi|support|hỗ trợ|liên hệ|hotline|zalo|gói|tiền/i.test(text);
      if (isSupportQuery && (!suggestions || suggestions.length === 0)) {
        suggestions = ['📞 Zalo Hotline: 0364591363', '📧 quizgen.ai.team@gmail.com', '💳 Hướng dẫn đối soát'];
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
      const isSupportQuery = /thanh toán|nạp tiền|lỗi|support|hỗ trợ|liên hệ|hotline|zalo|gói|tiền/i.test(text);
      const errorContent = isSupportQuery
        ? `Dạ Thầy/Cô đang gặp sự cố thanh toán hoặc cần hỗ trợ kỹ thuật? Quanta đã kích hoạt kênh tiếp nhận khẩn cấp:\n\n` +
          `• **Hotline / Zalo hỗ trợ kỹ thuật:** **0364591363**\n` +
          `• **Email đối soát:** quizgen.ai.team@gmail.com\n\n` +
          `\`\`\`action:support_ticket\n` +
          `{\n` +
          `  "title": "Yêu cầu hỗ trợ kỹ thuật & đối soát",\n` +
          `  "category": "payment",\n` +
          `  "description": "Người dùng gửi yêu cầu hỗ trợ sự cố từ khung chat Quanta Copilot."\n` +
          `}\n` +
          `\`\`\`\n\n` +
          `*Thầy/Cô có thể bấm 'Gửi Ticket' ở thẻ trên hoặc nhắn trực tiếp qua Zalo 0364591363 để được xử lý ngay trong 5-15 phút ạ!*`
        : 'Không thể kết nối tới máy chủ AI Copilot. Vui lòng kiểm tra lại dịch vụ hoặc thử các tùy chọn bên dưới.';

      const errorMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: 'assistant',
        content: errorContent,
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        suggestedActions: isSupportQuery
          ? ['📞 Zalo: 0364591363', '📧 quizgen.ai.team@gmail.com', '💳 Đối soát chuyển khoản']
          : ['💡 Thử lại', '📊 Tư vấn ma trận Bloom', '🖨️ Xuất đề thi'],
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = () => {
    if (!window.confirm('Thầy/Cô có chắc chắn muốn làm mới và xóa toàn bộ lịch sử trò chuyện hiện tại với Quanta không?')) {
      return;
    }
    const welcome = DEFAULT_WELCOME_MESSAGE(userHonorific, screenLabel, activeBook?.name);
    setMessages([welcome]);
    try {
      if (userChatKey) {
        localStorage.removeItem(userChatKey);
        sessionStorage.removeItem(userChatKey);
      }
      localStorage.removeItem('quizgen_copilot_chat');
      sessionStorage.removeItem('quizgen_copilot_chat');
    } catch {}
  };

  const handleCopy = (id: string, text: string) => {
    void navigator.clipboard?.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const fabStyle: React.CSSProperties = isCurrentlyDragging && fabPosition
    ? {
        position: 'fixed',
        left: `${fabPosition.x}px`,
        top: `${fabPosition.y}px`,
        right: 'auto',
        bottom: 'auto',
        touchAction: 'none',
        transition: 'none',
      }
    : fabPosition
    ? {
        position: 'fixed',
        top: `${fabPosition.y}px`,
        ...(snapSide === 'left'
          ? { left: '16px', right: 'auto' }
          : { right: '16px', left: 'auto' }),
        bottom: 'auto',
        touchAction: 'none',
        transition: 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
      }
    : {
        position: 'fixed',
        bottom: '24px',
        right: '16px',
        touchAction: 'none',
        transition: 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
      };

  return (
    <>
      {/* ─── Floating Action Button (FAB) (Draggable kéo thả + Tự hút 2 cánh + Morphing) ─── */}
      <div
        ref={fabElementRef}
        onPointerDown={handlePointerDown}
        style={fabStyle}
        className={`fixed z-40 w-12 h-12 sm:w-14 sm:h-14 select-none group transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isCurrentlyDragging ? 'cursor-grabbing scale-105' : 'cursor-grab'
        } ${
          isOpen ? 'scale-0 opacity-0 pointer-events-none' : 'scale-100 opacity-100 pointer-events-auto'
        }`}
        title="Nhấp để mở Quanta AI — kéo ra đâu cũng được, khi buông tay sẽ tự hút về mép trái/phải"
      >
        {/* Subtle floating badge tooltip - Neo chính xác bên trái hoặc phải của nút tròn không làm lệch nút */}
        {!isCurrentlyDragging && (
          <div
            className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold shadow-md pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-200 shrink-0 absolute top-1/2 -translate-y-1/2 whitespace-nowrap ${
              snapSide === 'left' ? 'left-full ml-3' : 'right-full mr-3'
            } ${
              activeThemeId === 'spring'
                ? 'bg-[#FFF8E9] text-[#8F171C] border border-[#E7B947]'
                : 'bg-white/95 text-slate-700 border border-slate-200'
            }`}
          >
            <Sparkles className={`w-3.5 h-3.5 ${activeThemeId === 'spring' ? 'text-[#E7B947]' : 'text-[#008689]'}`} />
            <span>Hỏi Quanta AI</span>
          </div>
        )}

        <button
          type="button"
          aria-label="Mở Trợ lý Khảo thí AI"
          className={`w-full h-full rounded-full text-white shadow-xl hover:shadow-2xl transition-all duration-300 flex items-center justify-center relative ${
            isCurrentlyDragging ? 'ring-4 ring-teal-400/60 scale-105 shadow-2xl' : 'hover:scale-105 active:scale-95'
          } ${
            activeThemeId === 'spring'
              ? 'bg-gradient-to-tr from-[#087E79] to-[#00a3a8] ring-2 ring-[#E7B947] ring-offset-2 tet-gold-glow'
              : 'bg-gradient-to-tr from-[#008689] to-[#00b4b8]'
          }`}
        >
          {!isCurrentlyDragging && (
            <div className="absolute inset-0 rounded-full bg-[#008689] opacity-25 animate-ping pointer-events-none" />
          )}
          <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-white group-hover:rotate-12 transition-transform duration-300 relative z-10 pointer-events-none" />
          <span className="absolute top-0 right-0 w-3 h-3 sm:w-3.5 sm:h-3.5 bg-emerald-400 border-2 border-white rounded-full pointer-events-none" />
        </button>
      </div>

      {/* ─── Modern AI Chat Drawer / Window (Dãn nở mượt mà từ bong bóng & Co rút khi đóng) ──── */}
      <div
        className={`fixed z-50 bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] inset-x-3 bottom-3 sm:inset-x-auto sm:bottom-6 sm:w-96 ${
          snapSide === 'left'
            ? 'sm:left-6 sm:right-auto origin-bottom-left'
            : 'sm:right-6 sm:left-auto origin-bottom-right'
        } ${
          isMinimized ? 'h-14 sm:h-16' : 'h-[520px] max-h-[82vh] sm:max-h-[85vh]'
        } ${
          isOpen
            ? 'scale-100 opacity-100 pointer-events-auto translate-y-0'
            : 'scale-0 opacity-0 pointer-events-none translate-y-4'
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
                title="Xóa lịch sử chat (Bắt đầu phiên mới)"
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
              {/* Linked Question Chip Indicator (Gọn gàng, mỏng nhẹ, có thể đóng) */}
              {effectiveActiveQuestion && (
                <div className="px-3 py-1 bg-teal-50/90 border-b border-teal-100 flex items-center justify-between text-[11px] text-slate-700 animate-fade-in">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-600 shrink-0 animate-pulse" />
                    <span className="truncate">
                      Gắn câu hỏi: <strong className="text-teal-800 font-mono">{effectiveActiveQuestion.id}</strong>{' '}
                      <span className="text-[10px] text-teal-700 bg-teal-100/70 px-1.5 py-0.2 rounded-full font-semibold">
                        {effectiveActiveQuestion.bloomLevel}
                      </span>
                    </span>
                  </div>
                  <button
                    onClick={() => setDismissedQuestionId(effectiveActiveQuestion.id)}
                    className="p-0.5 hover:bg-teal-100 rounded text-slate-400 hover:text-slate-600 transition-colors shrink-0 cursor-pointer"
                    title="Bỏ ghim câu hỏi này"
                  >
                    <X className="w-3 h-3" />
                  </button>
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
                          className={`p-3 rounded-2xl leading-relaxed shadow-sm relative group ${
                            isUser
                              ? 'bg-[#008689] text-white rounded-tr-none whitespace-pre-wrap break-words'
                              : 'bg-white text-slate-800 border border-slate-200/80 rounded-tl-none'
                          }`}
                        >
                          {isUser ? (
                            m.content
                          ) : (
                            <QuantaMarkdownRenderer
                              content={m.content}
                              onNavigate={onNavigate}
                              onSubmitTicket={handleSubmitSupportTicket}
                              onAutoGenerateExam={handleAutoGenerateExam}
                              onPatchQuestion={handlePatchQuestion}
                              onImportExam={handleImportExam}
                            />
                          )}

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
    </>
  );
};
