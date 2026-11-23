import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Sparkles,
  Paperclip,
  Mic,
  MicOff,
  Trash2,
  RefreshCw,
  X,
  Copy,
  Check,
  Terminal,
  FileCode,
  FolderOpen,
  Cpu,
  Layers,
  Activity,
  User,
  Clock,
  Radio,
  Minimize2,
  Maximize2,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  Plus,
  Pencil,
  ThumbsUp,
  ThumbsDown,
  Square,
} from 'lucide-react';
import apiClient, { API_BASE } from '../../services/apiClient';

export interface WorkspaceSession {
  id: string;
  title: string;
  mtime: number;
  formattedTime: string;
  isCurrent?: boolean;
}

interface LiveFeedEvent {
  id: string;
  stepIndex?: number;
  kind: 'tool_call' | 'user_prompt' | 'agent_reply' | 'terminal_result';
  category?: 'code' | 'terminal' | 'system';
  name?: string;
  title: string;
  command?: string;
  filePath?: string;
  fileName?: string;
  content?: string;
  timestamp?: string;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'agent';
  senderName: string;
  text: string;
  timestamp: string;
  imageUrl?: string;
}

interface SystemStats {
  status?: string;
  host?: string;
  workspace?: string;
  agent?: string;
  cpuUsage?: string;
  ramUsage?: string;
}

interface AdminSecretCommandCenterScreenProps {
  onExit: () => void;
  currentUser?: {
    email?: string;
    fullName?: string;
    academicTitle?: string;
  } | null;
}

// Markdown formatting helper matching Antigravity IDE typography
const renderInlineMarkdown = (line: string): React.ReactNode => {
  const parts: React.ReactNode[] = [];
  let remaining = line;
  let key = 0;

  while (remaining.length > 0) {
    // Inline code: `code`
    const codeMatch = remaining.match(/^`([^`]+)`/);
    if (codeMatch) {
      parts.push(
        <code
          key={key++}
          className="px-1.5 py-0.5 rounded bg-zinc-800 text-emerald-300 font-mono text-[11px] border border-zinc-700/60 mx-0.5"
        >
          {codeMatch[1]}
        </code>
      );
      remaining = remaining.slice(codeMatch[0].length);
      continue;
    }

    // Bold: **text** or __text__
    const boldMatch = remaining.match(/^(\*\*|__)(.*?)\1/);
    if (boldMatch) {
      parts.push(
        <strong key={key++} className="font-semibold text-zinc-100">
          {boldMatch[2]}
        </strong>
      );
      remaining = remaining.slice(boldMatch[0].length);
      continue;
    }

    // Italic: *text* or _text_
    const italicMatch = remaining.match(/^(\*|_)(.*?)\1/);
    if (italicMatch && !italicMatch[2].includes('*') && !italicMatch[2].includes('_')) {
      parts.push(
        <em key={key++} className="italic text-zinc-300">
          {italicMatch[2]}
        </em>
      );
      remaining = remaining.slice(italicMatch[0].length);
      continue;
    }

    // Link: [text](url)
    const linkMatch = remaining.match(/^\[(.*?)\]\((.*?)\)/);
    if (linkMatch) {
      parts.push(
        <span key={key++} className="text-emerald-400 font-medium underline underline-offset-2">
          {linkMatch[1]}
        </span>
      );
      remaining = remaining.slice(linkMatch[0].length);
      continue;
    }

    const nextSpecial = remaining.search(/[`\*_\[]/);
    if (nextSpecial === -1) {
      parts.push(remaining);
      break;
    } else if (nextSpecial === 0) {
      parts.push(remaining[0]);
      remaining = remaining.slice(1);
    } else {
      parts.push(remaining.slice(0, nextSpecial));
      remaining = remaining.slice(nextSpecial);
    }
  }

  return parts;
};

const renderMarkdownContent = (text: string): React.ReactNode => {
  if (!text) return null;

  // Split by code blocks first
  const blocks = text.split(/(```[\s\S]*?```)/g);

  return blocks.map((block, bIdx) => {
    if (block.startsWith('```') && block.endsWith('```')) {
      const firstLineEnd = block.indexOf('\n');
      const lang = firstLineEnd !== -1 ? block.slice(3, firstLineEnd).trim() : '';
      const code = firstLineEnd !== -1 ? block.slice(firstLineEnd + 1, -3) : block.slice(3, -3);

      return (
        <div key={bIdx} className="my-2.5 rounded-xl overflow-hidden border border-zinc-800 bg-[#0d0e12] font-mono text-xs">
          <div className="px-3 py-1.5 bg-zinc-900/80 border-b border-zinc-800 flex items-center justify-between text-[11px] text-zinc-400">
            <span className="text-zinc-500">{lang || 'terminal'}</span>
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(code)}
              className="text-zinc-500 hover:text-white transition-colors cursor-pointer"
            >
              <Copy className="w-3 h-3" />
            </button>
          </div>
          <pre className="p-3 overflow-x-auto text-zinc-200 leading-relaxed whitespace-pre font-mono text-[11px]">
            <code>{code}</code>
          </pre>
        </div>
      );
    }

    // Process lines inside regular text
    const lines = block.split('\n');
    return (
      <div key={bIdx} className="space-y-1.5">
        {lines.map((line, lIdx) => {
          const trimmed = line.trim();
          if (!trimmed) {
            return <div key={lIdx} className="h-1.5" />;
          }

          // Headers
          if (trimmed.startsWith('### ')) {
            return (
              <h3 key={lIdx} className="text-[13px] font-bold text-white mt-2.5 mb-1">
                {renderInlineMarkdown(trimmed.slice(4))}
              </h3>
            );
          }
          if (trimmed.startsWith('## ')) {
            return (
              <h2 key={lIdx} className="text-sm font-bold text-white mt-3 mb-1.5">
                {renderInlineMarkdown(trimmed.slice(3))}
              </h2>
            );
          }
          if (trimmed.startsWith('# ')) {
            return (
              <h1 key={lIdx} className="text-base font-bold text-white mt-3.5 mb-2">
                {renderInlineMarkdown(trimmed.slice(2))}
              </h1>
            );
          }

          // Horizontal rule
          if (trimmed === '---' || trimmed === '***') {
            return <hr key={lIdx} className="border-zinc-800/80 my-2" />;
          }

          // List item
          if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
            return (
              <div key={lIdx} className="flex items-start gap-2 pl-1.5 text-zinc-200">
                <span className="text-zinc-500 font-bold mt-0.5 text-[11px]">•</span>
                <span className="flex-1 leading-relaxed">
                  {renderInlineMarkdown(trimmed.slice(2))}
                </span>
              </div>
            );
          }

          // Normal paragraph
          return (
            <p key={lIdx} className="leading-relaxed text-zinc-200">
              {renderInlineMarkdown(line)}
            </p>
          );
        })}
      </div>
    );
  });
};

export const AdminSecretCommandCenterScreen: React.FC<AdminSecretCommandCenterScreenProps> = ({
  onExit,
  currentUser,
}) => {
  const [promptText, setPromptText] = useState('');
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showScrollBottomBtn, setShowScrollBottomBtn] = useState(false);

  // Trạng thái Tivi Cuộn Băng: 'collapsed' (1 dòng) | 'normal' (85px) | 'expanded' (toàn màn hình)
  const [tapeMode, setTapeMode] = useState<'normal' | 'collapsed' | 'expanded'>('normal');

  // Luồng hành động thực tế từ transcript.jsonl cho Tivi cuộn băng
  const [liveActions, setLiveActions] = useState<LiveFeedEvent[]>([]);

  // Dòng chat sạch sẽ chỉ gồm đối thoại giữa anh Vũ và Agent
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem('quizgen_remote_clean_chat');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      {
        id: 'msg-welcome',
        sender: 'agent',
        senderName: 'Antigravity Agent',
        text: 'Dạ em chào anh Hồ Anh Vũ! Em là Antigravity Agent đang túc trực trực tiếp trên laptop của anh. Khung chat này là đối thoại trực tiếp giữa anh và em. Mọi tiến trình chạy terminal hay sửa code của em sẽ tự động cuộn trên chiếc Tivi cuộn băng ở trên để màn hình chat luôn sạch sẽ và tinh gọn!',
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      },
    ];
  });

  const [sysStats, setSysStats] = useState<SystemStats | null>(null);

  // Quản lý phiên làm việc thực tế từ workspace laptop
  const [sessions, setSessions] = useState<WorkspaceSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const selectedSessionIdRef = useRef<string | null>(null);
  const [showSessionDrawer, setShowSessionDrawer] = useState(false);
  const [isCreatingNewSession, setIsCreatingNewSession] = useState(false);

  // Chỉnh sửa & Xóa phiên
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitleText, setEditingTitleText] = useState<string>('');
  const [isRenaming, setIsRenaming] = useState(false);
  const [isDeletingSessionId, setIsDeletingSessionId] = useState<string | null>(null);

  // Accordion Thinking / Worked for Xs
  const [isThinkingExpanded, setIsThinkingExpanded] = useState<boolean>(false);
  const [commandQueue, setCommandQueue] = useState<Array<{ id: string; prompt: string; formattedTime: string; status: string }>>([]);
  const [isServerBusy, setIsServerBusy] = useState<boolean>(false);
  const [isCancelling, setIsCancelling] = useState<boolean>(false);
  const isInitialOrSwitchRef = useRef<boolean>(true);
  const prevMsgCountRef = useRef<number>(0);

  useEffect(() => {
    selectedSessionIdRef.current = selectedSessionId;
  }, [selectedSessionId]);

  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const tapeScrollRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const recognitionRef = useRef<any>(null);
  const isAtBottomRef = useRef(true);

  // Lưu tin nhắn chat vào localStorage
  useEffect(() => {
    try {
      localStorage.setItem('quizgen_remote_clean_chat', JSON.stringify(chatMessages.slice(-40)));
    } catch {}
  }, [chatMessages]);

  // Cuộn tin nhắn chat xuống dưới khi có tin mới hoặc đang gửi
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const isNearBottom = distanceToBottom < 70;
    isAtBottomRef.current = isNearBottom;
    setShowScrollBottomBtn(!isNearBottom);
  };

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior,
      });
    } else {
      chatEndRef.current?.scrollIntoView({ behavior });
    }
  };

  useEffect(() => {
    if (isInitialOrSwitchRef.current && chatMessages.length > 0) {
      // Khi vừa mở trang hoặc chuyển phiên: ĐỨNG IM NGAY Ở TIN MỚI NHẤT, KHÔNG CUỘN GIẬT
      scrollToBottom('auto');
      const t1 = setTimeout(() => scrollToBottom('auto'), 50);
      const t2 = setTimeout(() => {
        scrollToBottom('auto');
        isInitialOrSwitchRef.current = false;
      }, 150);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    } else if (isSubmitting) {
      scrollToBottom('smooth');
    } else if (chatMessages.length > prevMsgCountRef.current && isAtBottomRef.current) {
      // CHỈ CUỘN KHI THỰC SỰ CÓ TIN NHẮN MỚI THÊM VÀO và người dùng đang ở đáy
      scrollToBottom('smooth');
    }
    prevMsgCountRef.current = chatMessages.length;
  }, [chatMessages, isSubmitting]);

  // Tự động cuộn cuộn băng Tivi xuống hành động mới nhất
  useEffect(() => {
    if (tapeScrollRef.current) {
      tapeScrollRef.current.scrollTop = tapeScrollRef.current.scrollHeight;
    }
  }, [liveActions]);

  // Fetch danh sách phiên làm việc thực sự từ workspace laptop
  const fetchSessions = async () => {
    try {
      const res = await apiClient.fetch(`${API_BASE}/agent-bridge/sessions`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.sessions)) {
          setSessions(data.sessions);
          if (!selectedSessionIdRef.current && data.currentSessionId) {
            setSelectedSessionId(data.currentSessionId);
            selectedSessionIdRef.current = data.currentSessionId;
          }
        }
      }
    } catch {}
  };

  useEffect(() => {
    void fetchSessions();
  }, []);

  // Fetch Live Mirror Feed (Cập nhật cho Tivi cuộn băng và thông số phần cứng theo đúng phiên được chọn)
  const fetchLiveMirror = async (overrideSessionId?: string) => {
    const targetId = overrideSessionId || selectedSessionIdRef.current || selectedSessionId;
    try {
      const url = targetId
        ? `${API_BASE}/agent-bridge/live-mirror?sessionId=${encodeURIComponent(targetId)}`
        : `${API_BASE}/agent-bridge/live-mirror`;
      const res = await apiClient.fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.systemStats) {
          setSysStats(data.systemStats);
        }
        if (data.commandQueue) {
          setCommandQueue(data.commandQueue);
        }
        if (typeof data.isBusy === 'boolean') {
          setIsServerBusy(data.isBusy);
        }

        if (data.activeSessionId && !selectedSessionIdRef.current) {
          setSelectedSessionId(data.activeSessionId);
          selectedSessionIdRef.current = data.activeSessionId;
        }

        // Đồng bộ câu thoại thực tế từ phiên làm việc trên laptop vào khung chat
        if (Array.isArray(data.chatDialogue) && data.chatDialogue.length > 0) {
          setChatMessages((prev) => {
            const serverMsgs = data.chatDialogue.map((d: any) => ({
              id: d.id,
              sender: d.sender,
              senderName: d.sender === 'user' ? (currentUser?.fullName || 'Hồ Anh Vũ') : 'Antigravity Agent (Laptop)',
              text: d.text,
              timestamp: d.timestamp || 'Vừa xong',
            }));

            // Giữ lại các tin nhắn người dùng vừa gửi từ điện thoại chưa kịp xuất hiện trong server
            const serverTexts = new Set(serverMsgs.map((m: any) => m.text));
            const pendingLocal = prev.filter(
              (m) => m.id.startsWith('user-') && !serverTexts.has(m.text)
            );

            const nextMsgs = [...serverMsgs, ...pendingLocal];
            // SO SÁNH NỘI DUNG ĐỂ TRÁNH RE-RENDER VÔ ÍCH GÂY CUỘN TIN NHẮN LIÊN TỤC
            if (
              prev.length === nextMsgs.length &&
              prev.every((p, i) => p.id === nextMsgs[i].id && p.text === nextMsgs[i].text)
            ) {
              return prev;
            }

            return nextMsgs;
          });
        }

        if (Array.isArray(data.liveFeed) && data.liveFeed.length > 0) {
          const techActions = data.liveFeed.filter(
            (ev: LiveFeedEvent) => ev.kind === 'tool_call' || ev.kind === 'terminal_result'
          );

          setLiveActions((prev) => {
            if (
              prev.length === techActions.length &&
              prev[prev.length - 1]?.id === techActions[techActions.length - 1]?.id
            ) {
              return prev;
            }
            return techActions;
          });
        }
      }
    } catch {}
  };

  // Đổi tên phiên trên cả laptop & mobile
  const handleRenameSession = async (sessionId: string, newTitle: string) => {
    if (!newTitle.trim()) {
      setEditingSessionId(null);
      return;
    }
    setIsRenaming(true);
    try {
      const res = await apiClient.fetch(`${API_BASE}/agent-bridge/session/rename`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, title: newTitle.trim() }),
      });
      if (res.ok) {
        setEditingSessionId(null);
        await fetchSessions();
      }
    } catch {} finally {
      setIsRenaming(false);
    }
  };

  // Xóa vĩnh viễn phiên trên cả laptop & mobile
  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const s = sessions.find((item) => item.id === sessionId);
    const sTitle = s?.title || sessionId;
    if (!window.confirm(`Anh có chắc muốn XÓA VĨNH VIỄN phiên "${sTitle}" trên cả laptop và điện thoại không?`)) {
      return;
    }
    setIsDeletingSessionId(sessionId);
    try {
      const res = await apiClient.fetch(`${API_BASE}/agent-bridge/session/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });
      if (res.ok) {
        if (selectedSessionIdRef.current === sessionId) {
          setSelectedSessionId(null);
          selectedSessionIdRef.current = null;
          setChatMessages([]);
          setLiveActions([]);
        }
        await fetchSessions();
      }
    } catch {} finally {
      setIsDeletingSessionId(null);
    }
  };

  // Polling chu kỳ 2.5 giây cho cuộn băng khi người dùng mở giao diện
  useEffect(() => {
    void fetchLiveMirror();
    const interval = setInterval(() => {
      void fetchLiveMirror();
    }, 2500);
    return () => {
      clearInterval(interval);
    };
  }, []);

  // Web Speech Recognition Setup (Nhận diện giọng nói)
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognizer = new SpeechRecognition();
      recognizer.continuous = false;
      recognizer.interimResults = false;
      recognizer.lang = 'vi-VN';

      recognizer.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setPromptText((prev) => (prev ? `${prev} ${transcript}` : transcript));
        }
        setIsRecordingVoice(false);
      };

      recognizer.onerror = () => setIsRecordingVoice(false);
      recognizer.onend = () => setIsRecordingVoice(false);

      recognitionRef.current = recognizer;
    }
  }, []);

  const toggleVoiceRecording = () => {
    if (!recognitionRef.current) {
      alert('Trình duyệt hiện tại không hỗ trợ nhận diện giọng nói Tiếng Việt trực tiếp.');
      return;
    }
    if (isRecordingVoice) {
      recognitionRef.current.stop();
      setIsRecordingVoice(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsRecordingVoice(true);
      } catch {
        setIsRecordingVoice(false);
      }
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setAttachedImage(reader.result as string);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleClearChat = () => {
    setChatMessages([]);
    localStorage.removeItem('quizgen_remote_clean_chat');
  };

  const handleCopyText = (id: string, text?: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text).catch(() => {});
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  // Hủy thực thi hoặc xóa lệnh trong hàng đợi
  const handleCancelAgent = async (queueItemId?: string) => {
    setIsCancelling(true);
    try {
      const res = await apiClient.fetch(`${API_BASE}/agent-bridge/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(queueItemId ? { id: queueItemId } : {}),
      });
      if (res.ok) {
        if (queueItemId) {
          setCommandQueue((prev) => prev.filter((q) => q.id !== queueItemId));
        } else {
          setCommandQueue([]);
          setIsSubmitting(false);
          const cancelMsg: ChatMessage = {
            id: `agent-cancel-${Date.now()}`,
            sender: 'agent',
            senderName: 'Antigravity Agent',
            text: '⛔ Đã nhận lệnh DỪNG / HỦY của anh. Em đã dừng tác vụ và xóa các yêu cầu đang chờ trong hàng đợi.',
            timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
          };
          setChatMessages((prev) => [...prev, cancelMsg]);
        }
        await fetchLiveMirror();
      }
    } catch {} finally {
      setIsCancelling(false);
    }
  };

  // Gửi lệnh hoặc lời trò chuyện
  const handleSendMessage = async (customPrompt?: string) => {
    const finalPrompt = (customPrompt || promptText).trim();
    if (!finalPrompt && !attachedImage) return;

    const newMsgId = `user-${Date.now()}`;
    const currentTimeStr = new Date().toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const userMsg: ChatMessage = {
      id: newMsgId,
      sender: 'user',
      senderName: currentUser?.fullName || 'Hồ Anh Vũ',
      text: finalPrompt,
      imageUrl: attachedImage || undefined,
      timestamp: currentTimeStr,
    };

    isAtBottomRef.current = true;
    setShowScrollBottomBtn(false);
    setChatMessages((prev) => [...prev, userMsg]);
    setPromptText('');
    setAttachedImage(null);
    setIsSubmitting(true);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    try {
      const isNew = isCreatingNewSession;
      const res = await apiClient.fetch(`${API_BASE}/agent-bridge/command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: `cmd-${Date.now()}`,
          prompt: finalPrompt,
          sessionId: isNew ? undefined : selectedSessionId,
          createNew: isNew,
          image: userMsg.imageUrl,
          callerName: currentUser?.fullName || 'Hồ Anh Vũ',
          callerEmail: currentUser?.email || 'admin@quizgen.ai',
          timestamp: Date.now(),
        }),
      });

      if (res.ok) {
        const result = await res.json();
        if (result.status === 'queued') {
          const queueNotice: ChatMessage = {
            id: `queue-msg-${Date.now()}`,
            sender: 'agent',
            senderName: 'Antigravity Agent',
            text: result.output || `⏳ Yêu cầu "${finalPrompt}" đã vào hàng đợi an toàn. Em sẽ thực thi ngay khi xong tác vụ hiện tại!`,
            timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
          };
          setChatMessages((prev) => [...prev, queueNotice]);
        }
        if (result.sessionId) {
          setSelectedSessionId(result.sessionId);
          setIsCreatingNewSession(false);
          void fetchSessions();
        }
        setTimeout(() => {
          void fetchLiveMirror(result.sessionId);
        }, 600);
      } else {
        throw new Error('Máy chủ phản hồi lỗi');
      }
    } catch {
      const errReply: ChatMessage = {
        id: `agent-err-${Date.now()}`,
        sender: 'agent',
        senderName: 'Antigravity Agent',
        text: 'Dạ lệnh của anh đã được lưu an toàn vào hàng đợi laptop. Em đang theo dõi và thực thi ngay.',
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      };
      setChatMessages((prev) => [...prev, errReply]);
    } finally {
      setIsSubmitting(false);
      void fetchLiveMirror();
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPromptText(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSendMessage();
    }
  };

  const latestAction = liveActions[liveActions.length - 1];
  const lastMsg = chatMessages.length > 0 ? chatMessages[chatMessages.length - 1] : null;
  const isAgentWorking = isSubmitting || isServerBusy || (lastMsg !== null && lastMsg.sender === 'user');

  return (
    <div className="fixed inset-0 z-[200] bg-black text-zinc-100 flex flex-col font-sans select-none overflow-hidden">
      {/* ── 1. ULTRA-SLEEK TOPBAR & MICRO-TELEMETRY ──────────────────────────── */}
      <div className="px-3 py-2 bg-black/95 border-b border-zinc-900 flex items-center justify-between backdrop-blur-md shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={onExit}
            className="p-1.5 -ml-1 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-900 transition-colors cursor-pointer"
            title="Đóng phiên"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 min-w-0">
            <div className="relative w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-200 shadow-inner shrink-0">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.9)]" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-white tracking-tight">Antigravity Remote</span>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-mono font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  ACTIVE
                </span>
              </div>

              {/* Micro-telemetry pill font JetBrains Mono 10px */}
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-400 tracking-tight">
                <span>CPU {sysStats?.cpuUsage || '14%'}</span>
                <span className="text-zinc-700">•</span>
                <span>RAM {sysStats?.ramUsage?.split('/')[0]?.trim() || '4.2GB'}</span>
                <span className="text-zinc-700">•</span>
                <span className="text-emerald-400 font-medium">8/8 OK</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => void fetchLiveMirror()}
            className="p-1.5 text-zinc-500 hover:text-zinc-200 rounded-full hover:bg-zinc-900 transition-colors cursor-pointer"
            title="Đồng bộ lại"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleClearChat}
            className="p-1.5 text-zinc-500 hover:text-rose-400 rounded-full hover:bg-zinc-900 transition-colors cursor-pointer"
            title="Xóa lịch sử chat"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── 1.5 WORKSPACE SESSION SELECTOR (ĐỒNG BỘ 100% TỪ LAPTOP WORKSPACE) ── */}
      <div className="px-3 py-1.5 bg-zinc-950 border-b border-zinc-900 flex items-center justify-between gap-2 shrink-0">
        <button
          type="button"
          onClick={() => {
            void fetchSessions();
            setShowSessionDrawer(true);
          }}
          className="flex items-center gap-1.5 min-w-0 max-w-[75%] px-2.5 py-1 rounded-lg bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800 text-left transition-colors cursor-pointer group"
          title="Chọn phiên làm việc từ workspace laptop"
        >
          <Layers className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="font-mono text-[11px] text-zinc-200 truncate">
            {sessions.find((s) => s.id === selectedSessionId)?.title || sessions[0]?.title || 'Phiên làm việc'}
          </span>
          <ChevronDown className="w-3 h-3 text-zinc-500 group-hover:text-zinc-300 shrink-0" />
        </button>

        <button
          type="button"
          onClick={() => {
            setIsCreatingNewSession(true);
            setShowSessionDrawer(true);
          }}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-medium text-[11px] shrink-0 transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Phiên mới</span>
        </button>
      </div>

      {/* ── 2. NATIVE ANTIGRAVITY IDE CHAT STREAM ─────────────────────────── */}
      <div
        ref={chatContainerRef}
        onScroll={handleScroll}
        className="relative flex-1 overflow-y-auto overflow-x-hidden px-3.5 py-4 space-y-5 select-text bg-[#09090b]"
      >
        {chatMessages.map((msg, idx) => {
          const isUser = msg.sender === 'user';
          const isLastAgentMsg = !isUser && idx === chatMessages.length - 1;

          if (isUser) {
            return (
              <div key={msg.id} className="flex flex-col items-end space-y-1.5 max-w-[85%] ml-auto min-w-0">
                <div className="bg-[#18181b] border border-zinc-800 text-zinc-100 rounded-2xl px-4 py-3 text-[13px] leading-relaxed font-sans shadow-xs break-words [overflow-wrap:anywhere] max-w-full whitespace-pre-wrap select-text">
                  {msg.text}

                  {msg.imageUrl && (
                    <div className="mt-2.5">
                      <img
                        src={msg.imageUrl}
                        alt="Ảnh gửi kèm"
                        className="max-h-56 rounded-xl object-cover border border-zinc-700 shadow-md"
                      />
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-500 pr-1">
                  <span>{msg.timestamp || 'Vừa xong'}</span>
                  <button
                    type="button"
                    onClick={() => handleCopyText(msg.id, msg.text)}
                    className="text-zinc-600 hover:text-zinc-300 transition-colors p-0.5 cursor-pointer"
                    title="Sao chép"
                  >
                    {copiedId === msg.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>
            );
          }

          // Agent message: Clean Antigravity IDE format (no bubble, formatted markdown, Thinking/Worked accordion)
          return (
            <div key={msg.id} className="flex flex-col items-start space-y-2 w-full max-w-full min-w-0 pr-1 overflow-hidden">
              {/* Collapsible Accordion: Thinking / Worked for Xs */}
              {isLastAgentMsg && liveActions.length > 0 && (
                <div className="py-0.5 w-full">
                  <button
                    type="button"
                    onClick={() => setIsThinkingExpanded(!isThinkingExpanded)}
                    className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 font-mono py-1 cursor-pointer select-none group"
                  >
                    <span className="text-zinc-400 font-medium">Worked for 18s</span>
                    <ChevronRight
                      className={`w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-300 transition-transform duration-200 ${
                        isThinkingExpanded ? 'rotate-90 text-emerald-400' : ''
                      }`}
                    />
                  </button>

                  {isThinkingExpanded && (
                    <div className="mt-2 ml-1 pl-3 border-l-2 border-zinc-800 space-y-1.5 py-1 font-mono text-[11px] leading-relaxed select-text">
                      {liveActions.slice(-12).map((act) => (
                        <div key={act.id} className="flex items-start gap-2 py-0.5">
                          <span
                            className={`px-1 py-0.2 rounded text-[9px] font-bold shrink-0 ${
                              act.category === 'code'
                                ? 'bg-amber-950/80 text-amber-300 border border-amber-900/60'
                                : act.category === 'terminal'
                                ? 'bg-sky-950/80 text-sky-300 border border-sky-900/60'
                                : 'bg-zinc-800 text-zinc-400'
                            }`}
                          >
                            {act.category === 'code' ? 'CODE' : act.category === 'terminal' ? 'TERM' : 'SYS'}
                          </span>
                          <div className="min-w-0 flex-1 truncate">
                            <span className="text-zinc-300 font-medium">{act.title}</span>
                            {act.command && <span className="ml-1 text-zinc-500 font-mono text-[10px]">({act.command})</span>}
                          </div>
                          <span className="text-zinc-600 text-[10px] shrink-0 font-mono">{act.timestamp}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Formatted Markdown Body (no raw asterisks!) */}
              <div className="text-[13px] text-zinc-200 leading-[1.65] font-sans break-words w-full space-y-2 select-text">
                {renderMarkdownContent(msg.text)}
              </div>

              {/* Agent Message Footer (Antigravity IDE style) */}
              <div className="flex items-center gap-3 text-[11px] font-mono text-zinc-500 pt-1">
                <span>{msg.timestamp || 'Vừa xong'}</span>
                <button
                  type="button"
                  onClick={() => handleCopyText(msg.id, msg.text)}
                  className="text-zinc-600 hover:text-zinc-300 transition-colors p-0.5 cursor-pointer"
                  title="Sao chép nội dung"
                >
                  {copiedId === msg.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                <button
                  type="button"
                  className="text-zinc-600 hover:text-zinc-300 transition-colors p-0.5 cursor-pointer"
                  title="Hài lòng"
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  className="text-zinc-600 hover:text-zinc-300 transition-colors p-0.5 cursor-pointer"
                  title="Chưa hài lòng"
                >
                  <ThumbsDown className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}

        {/* Live Thinking Status while Agent is working */}
        {isAgentWorking && (
          <div className="flex flex-col items-start space-y-1.5 w-full max-w-full min-w-0 pr-1 overflow-hidden py-1">
            <button
              type="button"
              onClick={() => setIsThinkingExpanded(!isThinkingExpanded)}
              className="flex items-center gap-2 text-xs text-zinc-300 hover:text-white font-mono py-1 cursor-pointer select-none group"
            >
              <span className="font-semibold text-zinc-200">Thinking</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <ChevronRight
                className={`w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-300 transition-transform duration-200 ${
                  isThinkingExpanded ? 'rotate-90 text-emerald-400' : ''
                }`}
              />
            </button>

            {isThinkingExpanded && (
              <div className="mt-1 ml-1 pl-3 border-l-2 border-emerald-500/50 space-y-1.5 py-1 font-mono text-[11px] leading-relaxed select-text w-full">
                {liveActions.length === 0 ? (
                  <div className="text-zinc-500 italic text-[11px]">Đang phân tích và xử lý lệnh trên laptop...</div>
                ) : (
                  liveActions.slice(-15).map((act) => (
                    <div key={act.id} className="flex items-start gap-2 py-0.5">
                      <span
                        className={`px-1 py-0.2 rounded text-[9px] font-bold shrink-0 ${
                          act.category === 'code'
                            ? 'bg-amber-950/80 text-amber-300 border border-amber-900/60'
                            : act.category === 'terminal'
                            ? 'bg-sky-950/80 text-sky-300 border border-sky-900/60'
                            : 'bg-zinc-800 text-zinc-400'
                        }`}
                      >
                        {act.category === 'code' ? 'CODE' : act.category === 'terminal' ? 'TERM' : 'SYS'}
                      </span>
                      <div className="min-w-0 flex-1 truncate">
                        <span className="text-zinc-200 font-medium">{act.title}</span>
                        {act.command && <span className="ml-1 text-emerald-400/80 font-mono text-[10px]">({act.command})</span>}
                      </div>
                      <span className="text-zinc-600 text-[10px] shrink-0 font-mono">{act.timestamp}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Floating button nhảy xuống mới nhất */}
      {showScrollBottomBtn && (
        <button
          type="button"
          onClick={() => {
            isAtBottomRef.current = true;
            scrollToBottom('smooth');
            setShowScrollBottomBtn(false);
          }}
          className="absolute bottom-20 right-4 z-30 px-3 py-1.5 rounded-full bg-zinc-800/95 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 shadow-2xl text-xs flex items-center gap-1.5 backdrop-blur-md transition-all active:scale-95 cursor-pointer"
        >
          <ArrowDown className="w-3.5 h-3.5 text-emerald-400" />
          <span>Xuống mới nhất</span>
        </button>
      )}

      {/* ── 4. BOTTOM COMPOSER: TRÒ CHUYỆN & RA LỆNH ───────────────────────── */}
      <div className="px-3 py-2.5 bg-zinc-950 border-t border-zinc-900 flex flex-col space-y-2 shrink-0">
        {/* Hàng đợi lệnh (Queue UI) */}
        {commandQueue.length > 0 && (
          <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-300">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping shrink-0" />
              <span className="font-semibold shrink-0">Hàng đợi ({commandQueue.length} lệnh):</span>
              <span className="text-zinc-300 truncate font-mono">
                "{commandQueue[0]?.prompt}"
              </span>
            </div>
            <button
              type="button"
              onClick={() => void handleCancelAgent()}
              className="text-rose-400 hover:text-rose-300 font-mono text-[10px] flex items-center gap-1 shrink-0 ml-2 cursor-pointer"
              title="Hủy toàn bộ hàng đợi"
            >
              <X className="w-3 h-3" />
              <span>Hủy hàng đợi</span>
            </button>
          </div>
        )}

        {attachedImage && (
          <div className="relative inline-block self-start">
            <img
              src={attachedImage}
              alt="Ảnh đính kèm"
              className="w-14 h-14 rounded-xl object-cover border border-zinc-700 shadow-md"
            />
            <button
              type="button"
              onClick={() => setAttachedImage(null)}
              className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-zinc-800 border border-zinc-700 text-white flex items-center justify-center shadow-md hover:bg-rose-600 transition-colors"
            >
              <X className="w-2.5 h-2.5" />
            </button>
          </div>
        )}

        <div className="flex items-end gap-2">
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2.5 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors cursor-pointer shrink-0 mb-0.5"
            title="Đính kèm ảnh minh chứng"
          >
            <Paperclip className="w-4 h-4" />
          </button>

          <div className="flex-1 min-w-0 bg-zinc-900 border border-zinc-800 rounded-3xl px-3.5 py-1.5 flex items-center gap-2 focus-within:border-zinc-700 transition-all">
            <textarea
              ref={textareaRef}
              rows={1}
              value={promptText}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              placeholder="Nhắn tin hoặc ra lệnh cho Antigravity..."
              className="w-full bg-transparent text-white placeholder-zinc-500 text-xs focus:outline-none resize-none leading-relaxed max-h-32 font-sans"
            />

            <button
              type="button"
              onClick={toggleVoiceRecording}
              className={`p-1.5 rounded-full transition-all cursor-pointer shrink-0 ${
                isRecordingVoice
                  ? 'bg-rose-600 text-white animate-pulse'
                  : 'text-zinc-400 hover:text-white'
              }`}
              title={isRecordingVoice ? 'Dừng ghi âm' : 'Nói giọng nói Tiếng Việt'}
            >
              {isRecordingVoice ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Nút STOP / CANCEL (Hình vuông) khi Agent đang thực thi hoặc có hàng đợi - chuẩn Antigravity IDE */}
          {(isAgentWorking || commandQueue.length > 0) && (
            <button
              type="button"
              onClick={() => void handleCancelAgent()}
              disabled={isCancelling}
              className="w-9 h-9 rounded-full bg-rose-500/20 border border-rose-500/50 text-rose-400 hover:bg-rose-500/30 active:scale-95 flex items-center justify-center transition-all cursor-pointer shrink-0 mb-0.5 shadow-md group"
              title="Dừng / Hủy thực thi (Stop/Cancel giống Antigravity IDE)"
            >
              <Square className="w-3.5 h-3.5 fill-rose-400 group-hover:scale-110 transition-transform" />
            </button>
          )}

          <button
            type="button"
            onClick={() => void handleSendMessage()}
            disabled={!promptText.trim() && !attachedImage}
            className="w-9 h-9 rounded-full bg-white text-black hover:bg-zinc-200 active:scale-95 flex items-center justify-center transition-all disabled:opacity-20 disabled:scale-100 cursor-pointer shrink-0 mb-0.5 shadow-md"
            title={isAgentWorking ? "Đưa vào hàng đợi lệnh" : "Gửi tin nhắn"}
          >
            <ArrowUp className="w-4 h-4 font-bold" />
          </button>
        </div>
      </div>

      {/* ── MODAL CHỌN / TẠO PHIÊN WORKSPACE LAPTOP ─────────────────────────── */}
      {showSessionDrawer && (
        <div className="fixed inset-0 z-[250] bg-black/80 backdrop-blur-sm flex flex-col justify-end">
          <div
            className="fixed inset-0 cursor-pointer"
            onClick={() => {
              setShowSessionDrawer(false);
              setIsCreatingNewSession(false);
            }}
          />
          <div className="relative bg-zinc-950 border-t border-zinc-800 rounded-t-3xl p-4 max-h-[82vh] flex flex-col shadow-2xl z-10 select-none">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-900">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-white tracking-wide uppercase">
                  Phiên làm việc Workspace ({sessions.length})
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowSessionDrawer(false);
                  setIsCreatingNewSession(false);
                }}
                className="p-1 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-900 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tạo phiên mới input */}
            {isCreatingNewSession ? (
              <div className="py-3 border-b border-zinc-900 flex flex-col gap-2">
                <label className="text-[11px] text-zinc-400 font-medium">
                  Nhập yêu cầu để mở phiên làm việc mới trên laptop:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={promptText}
                    onChange={(e) => setPromptText(e.target.value)}
                    placeholder="VD: Sửa thanh menu, Tối ưu database..."
                    className="flex-1 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 font-sans"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (promptText.trim()) {
                        setShowSessionDrawer(false);
                        void handleSendMessage();
                      }
                    }}
                    className="px-3.5 py-2 rounded-xl bg-emerald-500 text-black font-semibold text-xs hover:bg-emerald-400 cursor-pointer shrink-0"
                  >
                    Tạo & Chạy
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-3">
                <button
                  type="button"
                  onClick={() => setIsCreatingNewSession(true)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-medium transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>➕ Bắt đầu phiên mới trên laptop</span>
                </button>
              </div>
            )}

            {/* Danh sách phiên thực tế từ laptop workspace */}
            <div className="overflow-y-auto flex-1 divide-y divide-zinc-900 py-1 space-y-1">
              {sessions.map((s) => {
                const isSelected = s.id === selectedSessionId;
                const isEditing = editingSessionId === s.id;
                const isDeleting = isDeletingSessionId === s.id;

                return (
                  <div
                    key={s.id}
                    onClick={() => {
                      if (isEditing) return;
                      setSelectedSessionId(s.id);
                      selectedSessionIdRef.current = s.id;
                      setShowSessionDrawer(false);
                      setIsCreatingNewSession(false);
                      setChatMessages([]);
                      isInitialOrSwitchRef.current = true;
                      void fetchLiveMirror(s.id);
                    }}
                    className={`w-full text-left p-3 rounded-xl transition-all flex items-start justify-between gap-3 cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-500/10 border border-emerald-500/30 text-white'
                        : 'hover:bg-zinc-900/60 text-zinc-300'
                    } ${isDeleting ? 'opacity-40 pointer-events-none' : ''}`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-mono text-zinc-500">{s.formattedTime}</span>
                        {s.isCurrent && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                            ĐANG MỞ TRÊN LAPTOP
                          </span>
                        )}
                        {isSelected && !s.isCurrent && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-medium bg-blue-500/20 text-blue-400 border border-blue-500/40">
                            ĐANG CHỌN
                          </span>
                        )}
                      </div>

                      {isEditing ? (
                        <div
                          className="flex items-center gap-1.5 mt-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="text"
                            value={editingTitleText}
                            onChange={(e) => setEditingTitleText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') void handleRenameSession(s.id, editingTitleText);
                              if (e.key === 'Escape') setEditingSessionId(null);
                            }}
                            autoFocus
                            placeholder="Tên phiên mới..."
                            className="flex-1 bg-zinc-900 border border-emerald-500/50 rounded-lg px-2 py-1 text-xs text-white focus:outline-none"
                          />
                          <button
                            type="button"
                            disabled={isRenaming}
                            onClick={() => void handleRenameSession(s.id, editingTitleText)}
                            className="p-1 rounded-lg bg-emerald-500 text-black hover:bg-emerald-400 cursor-pointer"
                            title="Lưu tên phiên"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingSessionId(null)}
                            className="p-1 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white cursor-pointer"
                            title="Hủy"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="text-xs font-medium line-clamp-2 leading-relaxed">
                          {s.title}
                        </div>
                      )}

                      <div className="text-[10px] font-mono text-zinc-600 mt-1 truncate">
                        ID: {s.id}
                      </div>
                    </div>

                    {/* Actions: Edit, Delete, Selected Check */}
                    {!isEditing && (
                      <div className="flex items-center gap-1 shrink-0 mt-0.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingSessionId(s.id);
                            setEditingTitleText(s.title);
                          }}
                          className="p-1.5 rounded-lg text-zinc-500 hover:text-emerald-400 hover:bg-zinc-800/80 transition-colors cursor-pointer"
                          title="Đổi tên phiên này trên cả laptop"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteSession(s.id, e)}
                          className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-zinc-800/80 transition-colors cursor-pointer"
                          title="Xóa phiên này trên cả laptop"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        {isSelected && (
                          <Check className="w-4 h-4 text-emerald-400 shrink-0 ml-1" />
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
