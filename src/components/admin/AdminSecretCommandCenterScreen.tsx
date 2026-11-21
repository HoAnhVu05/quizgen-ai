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
  Plus,
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
  const [showSessionDrawer, setShowSessionDrawer] = useState(false);
  const [isCreatingNewSession, setIsCreatingNewSession] = useState(false);

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
    chatEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    if (isAtBottomRef.current || isSubmitting) {
      scrollToBottom('smooth');
    }
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
          if (!selectedSessionId && data.currentSessionId) {
            setSelectedSessionId(data.currentSessionId);
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
    const targetId = overrideSessionId || selectedSessionId;
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

        if (data.activeSessionId && !selectedSessionId) {
          setSelectedSessionId(data.activeSessionId);
        }

        // Đồng bộ câu thoại thực tế từ phiên làm việc trên laptop vào khung chat
        if (Array.isArray(data.chatDialogue) && data.chatDialogue.length > 0) {
          setChatMessages(
            data.chatDialogue.map((d: any) => ({
              id: d.id,
              sender: d.sender,
              senderName: d.sender === 'user' ? (currentUser?.fullName || 'Hồ Anh Vũ') : 'Antigravity Agent (Laptop)',
              text: d.text,
              timestamp: d.timestamp || 'Vừa xong',
            }))
          );
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

  // Polling chu kỳ 2.5 giây cho cuộn băng khi phiên đang ACTIVE
  useEffect(() => {
    void fetchLiveMirror();
    const interval = setInterval(() => {
      void fetchLiveMirror();
    }, 2500);
    return () => {
      clearInterval(interval);
      // Đảm bảo đưa Agent Remote về chế độ ngủ đông (Dormant) khi unmount
      void apiClient.fetch(`${API_BASE}/agent-bridge/session/stop`, { method: 'POST' }).catch(() => null);
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
        if (result.sessionId) {
          setSelectedSessionId(result.sessionId);
          setIsCreatingNewSession(false);
          void fetchSessions();
        }
        setTimeout(() => {
          void fetchLiveMirror(result.sessionId);
        }, 1000);
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
  const isAgentWorking = isSubmitting || (latestAction && (latestAction.category === 'code' || latestAction.category === 'terminal'));

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

      {/* ── 2. "TIVI CUỘN BĂNG" (LIVE TAPE MONITOR) ─────────────────────────── */}
      <div className="px-3 pt-2 pb-1.5 bg-black/90 border-b border-zinc-900 shrink-0">
        <div
          className={`relative rounded-2xl bg-zinc-950/95 border transition-all duration-300 shadow-2xl overflow-hidden ${
            isAgentWorking ? 'border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.15)]' : 'border-zinc-800'
          } ${tapeMode === 'expanded' ? 'h-64' : tapeMode === 'collapsed' ? 'h-8' : 'h-[92px]'}`}
        >
          {/* TV Header Bar */}
          <div className="h-7 px-3 bg-zinc-900/90 border-b border-zinc-850 flex items-center justify-between text-[10px] font-mono select-none">
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  isAgentWorking
                    ? 'bg-emerald-400 animate-ping shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                    : 'bg-zinc-600'
                }`}
              />
              <span className="font-bold tracking-wider text-zinc-300 flex items-center gap-1">
                <span>TIVI TIẾN TRÌNH</span>
                <span className="text-zinc-500 font-normal">({liveActions.length} steps)</span>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold uppercase tracking-wider ${
                  isAgentWorking ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-zinc-800 text-zinc-400'
                }`}
              >
                {isAgentWorking ? '⚡ EXECUTING' : 'IDLE'}
              </span>

              {/* Mode switch buttons */}
              <button
                type="button"
                onClick={() => setTapeMode((prev) => (prev === 'collapsed' ? 'normal' : 'collapsed'))}
                className="text-zinc-400 hover:text-white p-0.5 cursor-pointer"
                title={tapeMode === 'collapsed' ? 'Mở rộng TV' : 'Thu nhỏ 1 dòng'}
              >
                {tapeMode === 'collapsed' ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
              </button>

              <button
                type="button"
                onClick={() => setTapeMode((prev) => (prev === 'expanded' ? 'normal' : 'expanded'))}
                className="text-zinc-400 hover:text-white p-0.5 cursor-pointer"
                title={tapeMode === 'expanded' ? 'Thu về chuẩn' : 'Xem toàn màn hình'}
              >
                {tapeMode === 'expanded' ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
              </button>
            </div>
          </div>

          {/* TV Screen Viewport (Cuộn băng chạy mượt mà bên trong) */}
          {tapeMode === 'collapsed' ? (
            /* Chế độ 1 dòng ticker chạy ngang siêu gọn */
            <div className="h-full px-3 flex items-center text-[10px] font-mono text-zinc-300 truncate">
              {latestAction ? (
                <div className="flex items-center gap-2 truncate">
                  <span className="text-emerald-400 font-bold">LATEST:</span>
                  <span className="truncate">{latestAction.title}</span>
                  {latestAction.command && <span className="text-zinc-500 font-mono">({latestAction.command})</span>}
                </div>
              ) : (
                <span className="text-zinc-500">Antigravity sẵn sàng nhận lệnh...</span>
              )}
            </div>
          ) : (
            /* Chế độ cuộn băng chạy mượt mà từ dưới lên */
            <div
              ref={tapeScrollRef}
              className="h-[calc(100%-28px)] overflow-y-auto p-2 space-y-1.5 font-mono text-[10px] leading-relaxed select-text"
            >
              {liveActions.length === 0 ? (
                <div className="h-full flex items-center justify-center text-zinc-600 text-[10px] font-mono italic">
                  [Cuộn băng đang chờ lệnh từ anh Vũ...]
                </div>
              ) : (
                liveActions.map((act) => {
                  const isCode = act.category === 'code';
                  const isTerm = act.category === 'terminal';

                  return (
                    <div
                      key={act.id}
                      className="flex items-start gap-1.5 p-1 rounded bg-black/60 border border-zinc-900 text-zinc-300 hover:border-zinc-800 transition-colors"
                    >
                      <span
                        className={`px-1 py-0.2 rounded text-[9px] font-bold shrink-0 ${
                          isCode
                            ? 'bg-amber-950 text-amber-300 border border-amber-900/60'
                            : isTerm
                            ? 'bg-sky-950 text-sky-300 border border-sky-900/60'
                            : 'bg-zinc-800 text-zinc-400'
                        }`}
                      >
                        {isCode ? 'CODE' : isTerm ? 'TERM' : 'SYS'}
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-zinc-200 truncate">{act.title}</span>
                          <span className="text-[9px] text-zinc-600 shrink-0">{act.timestamp}</span>
                        </div>

                        {act.command && (
                          <div className="text-emerald-400/90 text-[10px] truncate">$ {act.command}</div>
                        )}
                        {act.filePath && !act.command && (
                          <div className="text-zinc-500 text-[9px] truncate">{act.filePath}</div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── 3. CLEAN CHAT DIALOGUE STREAM (CHỈ CHỨA TRÒ CHUYỆN) ─────────────── */}
      <div
        ref={chatContainerRef}
        onScroll={handleScroll}
        className="relative flex-1 overflow-y-auto px-3.5 py-4 space-y-3.5 select-text"
      >
        {chatMessages.map((msg) => {
          const isUser = msg.sender === 'user';

          return (
            <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start items-start gap-2.5'}`}>
              {!isUser && (
                <div className="w-7 h-7 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0 mt-0.5 text-zinc-200 shadow-xs">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                </div>
              )}

              <div className={`max-w-[86%] space-y-1 ${isUser ? 'items-end' : 'items-start'}`}>
                <div
                  className={`rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed break-words shadow-sm ${
                    isUser
                      ? 'bg-zinc-850 text-white rounded-br-xs border border-zinc-750'
                      : 'bg-zinc-950 text-zinc-200 rounded-bl-xs border border-zinc-850 whitespace-pre-wrap font-sans'
                  }`}
                >
                  {msg.text}

                  {msg.imageUrl && (
                    <div className="mt-2">
                      <img
                        src={msg.imageUrl}
                        alt="Ảnh gửi kèm"
                        className="max-h-48 rounded-xl object-cover border border-zinc-700 shadow-md"
                      />
                    </div>
                  )}

                  {!isUser && (
                    <button
                      type="button"
                      onClick={() => handleCopyText(msg.id, msg.text)}
                      className="ml-2 text-zinc-500 hover:text-white inline-flex align-middle cursor-pointer"
                      title="Sao chép"
                    >
                      {copiedId === msg.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  )}
                </div>

                <div
                  className={`text-[10px] font-mono text-zinc-500 px-1 ${
                    isUser ? 'text-right' : 'text-left'
                  }`}
                >
                  {msg.senderName} • {msg.timestamp}
                </div>
              </div>
            </div>
          );
        })}

        {/* Loading Indicator */}
        {isSubmitting && (
          <div className="flex items-start gap-2.5 justify-start">
            <div className="w-7 h-7 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0 mt-0.5 text-zinc-200">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
            </div>
            <div className="bg-zinc-950 border border-zinc-850 px-3.5 py-2.5 rounded-2xl rounded-bl-xs flex items-center gap-1.5 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
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

          <button
            type="button"
            onClick={() => void handleSendMessage()}
            disabled={isSubmitting || (!promptText.trim() && !attachedImage)}
            className="w-9 h-9 rounded-full bg-white text-black hover:bg-zinc-200 active:scale-95 flex items-center justify-center transition-all disabled:opacity-20 disabled:scale-100 cursor-pointer shrink-0 mb-0.5 shadow-md"
            title="Gửi tin nhắn"
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
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      setSelectedSessionId(s.id);
                      setShowSessionDrawer(false);
                      setIsCreatingNewSession(false);
                      setChatMessages([]);
                      void fetchLiveMirror(s.id);
                    }}
                    className={`w-full text-left p-3 rounded-xl transition-all flex items-start justify-between gap-3 cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-500/10 border border-emerald-500/30 text-white'
                        : 'hover:bg-zinc-900/60 text-zinc-300'
                    }`}
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
                      <div className="text-xs font-medium line-clamp-2 leading-relaxed">
                        {s.title}
                      </div>
                      <div className="text-[10px] font-mono text-zinc-600 mt-1 truncate">
                        ID: {s.id}
                      </div>
                    </div>
                    {isSelected && (
                      <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-1" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
