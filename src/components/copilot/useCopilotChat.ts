import { useState, useEffect, useRef, useCallback } from 'react';
import apiClient, { API_BASE } from '../../services/apiClient';
import { ScreenId, UserProfile, Question } from '../../types';
import { QuantaAction } from '../QuantaMarkdownRenderer';
import { ChatAttachment, ChatMessage, DEFAULT_WELCOME_MESSAGE } from './types';
import {
  readChatFiles,
  buildCopilotRequestBody,
  streamCopilotReply,
  buildCopilotErrorMessage,
} from './copilotChatHelpers';

interface UseCopilotChatParams {
  isOpen: boolean;
  isMinimized: boolean;
  currentScreen: ScreenId;
  screenLabel: string;
  currentUser: UserProfile | null;
  userHonorific: string;
  userName: string;
  activeBook: any;
  uploadedBooks: any[];
  effectiveActiveQuestion: Question | null;
  onShowToast?: (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => void;
}

export function useCopilotChat({
  isOpen,
  isMinimized,
  currentScreen,
  screenLabel,
  currentUser,
  userHonorific,
  userName,
  activeBook,
  uploadedBooks,
  effectiveActiveQuestion,
  onShowToast,
}: UseCopilotChatParams) {
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamStatus, setStreamStatus] = useState<string>('');
  const [pendingAttachments, setPendingAttachments] = useState<ChatAttachment[]>([]);
  const [academicMemory, setAcademicMemory] = useState<any>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const userChatKey = currentUser?.email
    ? `quizgen_copilot_chat_${currentUser.email.toLowerCase().trim()}`
    : 'quizgen_copilot_chat';

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const email = currentUser?.email?.toLowerCase().trim();
      const specificKey = email ? `quizgen_copilot_chat_${email}` : null;
      const saved =
        (specificKey ? localStorage.getItem(specificKey) : null) ||
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

  const fetchServerHistory = useCallback(
    async (isCancelled?: () => boolean) => {
      if (isLoading) return;
      try {
        const res = await apiClient.fetch(`${API_BASE}/ai/chat/history?limit=100`, { method: 'GET' });
        if (res.ok && !(isCancelled && isCancelled())) {
          const data = await res.json();
          const serverMsgs: ChatMessage[] = Array.isArray(data?.messages) ? data.messages : [];
          if (serverMsgs.length > 0) {
            setMessages((prev) => {
              const prevNonWelcome = prev.filter((m) => !m.id.startsWith('welcome'));
              const lastPrev = prevNonWelcome[prevNonWelcome.length - 1];
              const lastSrv = serverMsgs[serverMsgs.length - 1];
              if (
                prevNonWelcome.length === serverMsgs.length &&
                lastPrev?.id === lastSrv?.id &&
                lastPrev?.content === lastSrv?.content
              ) {
                return prev;
              }
              const welcome = DEFAULT_WELCOME_MESSAGE(userHonorific, screenLabel, activeBook?.name);
              return [welcome, ...serverMsgs];
            });
          }
        }
      } catch {}
    },
    [isLoading, userHonorific, screenLabel, activeBook?.name]
  );

  useEffect(() => {
    let cancelled = false;
    const syncHistoryFromBackend = async () => {
      if (currentUser?.email) {
        try {
          const specificKey = `quizgen_copilot_chat_${currentUser.email.toLowerCase().trim()}`;
          const saved = localStorage.getItem(specificKey) || localStorage.getItem('quizgen_copilot_chat');
          if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length > 1 && !cancelled) setMessages(parsed);
          }
        } catch {}
      }
      await fetchServerHistory(() => cancelled);
    };

    void syncHistoryFromBackend();
    return () => {
      cancelled = true;
    };
  }, [currentUser?.email, fetchServerHistory]);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    void fetchServerHistory(() => cancelled);

    const handleFocus = () => {
      if (!cancelled) void fetchServerHistory(() => cancelled);
    };
    window.addEventListener('focus', handleFocus);

    const intervalId = !isMinimized
      ? setInterval(() => {
          if (!cancelled && document.visibilityState === 'visible') {
            void fetchServerHistory(() => cancelled);
          }
        }, 8000)
      : null;

    return () => {
      cancelled = true;
      window.removeEventListener('focus', handleFocus);
      if (intervalId) clearInterval(intervalId);
    };
  }, [isOpen, isMinimized, fetchServerHistory]);

  useEffect(() => {
    if (!messages || messages.length === 0) return;
    try {
      const compactMsgs = messages.slice(-100).map((m) => {
        if (!m.attachments || m.attachments.length === 0) return m;
        return {
          ...m,
          attachments: m.attachments.map((att) =>
            att.data && att.data.length > 65536
              ? { ...att, data: att.url ? undefined : att.data.slice(0, 65536) }
              : att
          ),
        };
      });
      const payload = JSON.stringify(compactMsgs);
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

  const loadAcademicMemory = useCallback(async () => {
    try {
      const res = await apiClient.fetch(`${API_BASE}/ai/chat/memory`, { method: 'GET' });
      if (res.ok) {
        const data = await res.json();
        setAcademicMemory(data?.memory || null);
      }
    } catch {}
  }, []);

  const handleResetAcademicMemory = useCallback(async () => {
    if (!window.confirm('Đặt lại toàn bộ trí nhớ học thuật đã học của Quanta về mặc định?')) return;
    try {
      const res = await apiClient.fetch(`${API_BASE}/ai/chat/memory`, { method: 'DELETE' });
      if (res.ok) {
        setAcademicMemory(null);
        onShowToast?.('info', 'Đã đặt lại trí nhớ Quanta', 'Hồ sơ học thuật động đã được làm mới.');
      }
    } catch {}
  }, [onShowToast]);

  const handleAddChatFiles = useCallback(
    async (fileList: FileList | File[]) => {
      const next = await readChatFiles(fileList, pendingAttachments.length, onShowToast);
      if (next.length > 0) setPendingAttachments((prev) => [...prev, ...next]);
    },
    [pendingAttachments.length, onShowToast]
  );

  const handleStopStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
    setStreamStatus('');
  }, []);

  const handleSendMessage = useCallback(
    async (
      onAfterReply: (userText: string, replyContent: string, structuredActions?: QuantaAction[]) => void,
      textToSend?: string
    ) => {
      const text = (textToSend || inputMessage).trim();
      const attachmentsToSend = textToSend ? [] : [...pendingAttachments];
      if ((!text && attachmentsToSend.length === 0) || isLoading) return;

      const userMsg: ChatMessage = {
        id: `usr-${Date.now()}`,
        role: 'user',
        content: text || '(Đã gửi tệp đính kèm)',
        attachments: attachmentsToSend.length > 0 ? attachmentsToSend : undefined,
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, userMsg]);
      if (!textToSend) {
        setInputMessage('');
        setPendingAttachments([]);
        if (textareaRef.current) textareaRef.current.style.height = 'auto';
      }
      setIsLoading(true);
      setStreamStatus('Đang kết nối Quanta...');

      const controller = new AbortController();
      abortControllerRef.current = controller;
      const botMsgId = `bot-${Date.now()}`;

      try {
        const requestBody = buildCopilotRequestBody({
          text,
          messages,
          attachments: attachmentsToSend,
          currentScreen,
          screenLabel,
          userName,
          currentUser,
          activeBook,
          uploadedBooks,
          effectiveActiveQuestion,
        });

        let result = {
          replyContent: '',
          suggestions: [] as string[],
          structuredActions: [] as QuantaAction[],
          ragSources: [] as any[],
          streamedSuccessfully: false,
        };

        try {
          result = await streamCopilotReply({
            requestBody,
            signal: controller.signal,
            botMsgId,
            setStreamStatus,
            setMessages,
          });
        } catch (streamErr: any) {
          if (streamErr?.name === 'AbortError') throw streamErr;
        }

        if (!result.streamedSuccessfully) {
          const res = await apiClient.fetch(`${API_BASE}/ai/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: requestBody,
            signal: controller.signal,
          });

          if (res.ok) {
            const data = await res.json();
            result.replyContent = data.reply || 'Đã ghi nhận yêu cầu của Thầy/Cô.';
            result.suggestions = data.suggestedActions || [];
            result.structuredActions = Array.isArray(data.actions) ? data.actions : [];
            result.ragSources = Array.isArray(data.ragSources) ? data.ragSources : [];
          } else {
            result.replyContent =
              'Hệ thống AI đang xử lý lưu lượng cao. Thầy/Cô vui lòng gửi lại câu hỏi hoặc thử lại sau giây lát.';
          }

          if (
            /thanh toán|nạp tiền|lỗi|support|hỗ trợ|liên hệ|hotline|zalo|gói|tiền/i.test(text) &&
            result.suggestions.length === 0
          ) {
            result.suggestions = ['📞 Zalo Hotline: 0364591363', '📧 quizgen.ai.team@gmail.com', '💳 Hướng dẫn đối soát'];
          }

          setMessages((prev) => [
            ...prev.filter((m) => m.id !== botMsgId),
            {
              id: botMsgId,
              role: 'assistant',
              content: result.replyContent,
              actions: result.structuredActions,
              ragSources: result.ragSources,
              timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
              suggestedActions: result.suggestions,
            },
          ]);
        }

        onAfterReply(text, result.replyContent, result.structuredActions);
      } catch (err: any) {
        if (err?.name === 'AbortError') {
          setMessages((prev) =>
            prev.some((m) => m.id === botMsgId)
              ? prev
              : [
                  ...prev,
                  {
                    id: botMsgId,
                    role: 'assistant',
                    content: '⏹️ *Đã dừng phản hồi theo yêu cầu của Thầy/Cô.*',
                    timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
                  },
                ]
          );
          return;
        }
        setMessages((prev) => [...prev, buildCopilotErrorMessage(text)]);
      } finally {
        abortControllerRef.current = null;
        setIsLoading(false);
        setStreamStatus('');
      }
    },
    [
      inputMessage,
      pendingAttachments,
      isLoading,
      messages,
      currentScreen,
      screenLabel,
      userName,
      currentUser,
      activeBook,
      uploadedBooks,
      effectiveActiveQuestion,
    ]
  );

  const handleClearHistory = useCallback(async () => {
    if (
      !window.confirm('Thầy/Cô có chắc chắn muốn làm mới và xóa toàn bộ lịch sử trò chuyện hiện tại với Quanta không?')
    ) {
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
    try {
      await apiClient.fetch(`${API_BASE}/ai/chat/history`, { method: 'DELETE' });
    } catch {}
  }, [userHonorific, screenLabel, activeBook?.name, userChatKey]);

  return {
    messages,
    setMessages,
    inputMessage,
    setInputMessage,
    isLoading,
    streamStatus,
    pendingAttachments,
    setPendingAttachments,
    academicMemory,
    textareaRef,
    loadAcademicMemory,
    handleResetAcademicMemory,
    handleAddChatFiles,
    handleStopStreaming,
    handleSendMessage,
    handleClearHistory,
  };
}
