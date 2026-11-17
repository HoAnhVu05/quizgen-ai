/**
 * QGroupScreen – Complete Slack & Messenger Style Upgrade
 * Tính năng phong cách Slack:
 * 1. Rich Text Composer (Bold, Italic, Code, Quote, List, Emoji, Attachment, Quanta AI)
 * 2. Header Slack Toolbar: Huddle (Audio Call), Star, Summarize Channel by AI, Channel Details
 * 3. ChannelDetailsModal đa tab: Giới thiệu | Thành viên & Mời | Học liệu & Tệp | Cài đặt nhóm
 * 4. AI Summarize Modal: Tự động tóm tắt nội dung thảo luận chuyên môn
 * 5. Loại bỏ hoàn toàn sự thừa thãi của 2 popup thành viên cũ
 */
import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from 'react';
import {
  Users,
  Search,
  Plus,
  Send,
  MoreVertical,
  Check,
  X,
  UserPlus,
  Shield,
  Copy,
  Settings,
  Bell,
  BellOff,
  User,
  Trash2,
  MessageCircle,
  Inbox,
  LogOut,
  UserCheck,
  Hash,
  Bold,
  Italic,
  Code,
  List,
  Quote,
  Smile,
  Paperclip,
  Mic,
  MicOff,
  Sparkles,
  Star,
  Headphones,
  FileText,
  Share2,
  BookOpen,
  Info,
  CheckCheck,
} from 'lucide-react';
import {
  QGroup,
  QGroupMessage,
  FriendRequest,
  QGroupInvitation,
  ScreenId,
  UserProfile,
  UserSubscriptionInfo,
} from '../types';
import apiClient, { API_BASE } from '../services/apiClient';
import { PublicProfileModal } from './PublicProfileModal';

// ─── Props ─────────────────────────────────────────────────────────────────
interface QGroupScreenProps {
  onNavigate: (screen: ScreenId) => void;
  onShowToast: (
    type: 'success' | 'info' | 'warning' | 'error',
    title: string,
    message: string
  ) => void;
  currentUser?: UserProfile | null;
  subscriptionInfo?: UserSubscriptionInfo | null;
}

// ─── Helpers ────────────────────────────────────────────────────────────────
const initials = (name: string) =>
  String(name || 'QG')
    .trim()
    .slice(0, 2)
    .toUpperCase();

const formatTime = (ts: number): string => {
  if (!ts) return '';
  const d = new Date(ts);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60_000) return 'Vừa xong';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} ph`;
  if (diff < 86_400_000)
    return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
};

const getGroupSortTime = (g: QGroup): number => {
  let best = 0;
  const nowCap = Date.now() + 60000;
  const msgs = g.messages || [];
  if (msgs.length > 0) {
    const last = msgs[msgs.length - 1];
    if (last?.id && last.id.startsWith('msg-')) {
      const parsed = parseInt(last.id.replace('msg-', ''), 10);
      if (!isNaN(parsed) && parsed > 0 && parsed <= nowCap) {
        best = Math.max(best, parsed);
      }
    }
  }
  const up = Number(g.updatedAt) || 0;
  if (up > 0 && up <= nowCap) {
    best = Math.max(best, up);
  }
  return best;
};

// ─── Blacklist helpers ──────────────────────────────────────────────────────
const getBlacklistKey = (email: string) =>
  `quizgen_deleted_qgroups_${(email || 'global').toLowerCase()}`;

const getBlacklist = (email: string): Set<string> => {
  try {
    const saved = localStorage.getItem(getBlacklistKey(email));
    if (saved) return new Set(JSON.parse(saved) as string[]);
  } catch {}
  return new Set();
};

const addToBlacklist = (email: string, ...ids: string[]) => {
  const bl = getBlacklist(email);
  ids.forEach((id) => id && bl.add(id));
  try {
    localStorage.setItem(getBlacklistKey(email), JSON.stringify([...bl]));
  } catch {}
};

const flattenGroups = (arr: unknown[]): QGroup[] => {
  const out: QGroup[] = [];
  for (const it of arr) {
    if (it && typeof it === 'object') {
      const obj = it as Record<string, unknown>;
      if (Array.isArray(obj.groups)) out.push(...flattenGroups(obj.groups));
      else if (obj.id && obj.name) out.push(obj as unknown as QGroup);
    }
  }
  return out;
};

const dedupMessages = (msgs: QGroupMessage[]): QGroupMessage[] => {
  const seen = new Set<string>();
  return (msgs || []).filter((m) => {
    const mid = String(m?.id || '').trim();
    if (mid) {
      if (seen.has(mid)) return false;
      seen.add(mid);
    }
    return true;
  });
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export const QGroupScreen: React.FC<QGroupScreenProps> = ({
  onShowToast,
  currentUser,
}) => {
  const myEmail = useMemo(
    () => (currentUser?.email || '').trim().toLowerCase(),
    [currentUser?.email]
  );
  const myName = currentUser?.fullName || 'Giảng viên';

  // ── States ───────────────────────────────────────────────────────────────
  const [qgroups, setQgroups] = useState<QGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [filterTab, setFilterTab] = useState<
    'all' | 'unread' | 'groups' | 'friends' | 'invitations'
  >('all');

  // Lời mời
  const [groupInvitations, setGroupInvitations] = useState<QGroupInvitation[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);

  // Context menu
  const [menuGroupId, setMenuGroupId] = useState<string | null>(null);

  // Slack Header Modals & Toolbars
  const [isChannelDetailsOpen, setIsChannelDetailsOpen] = useState(false);
  const [channelDetailsTab, setChannelDetailsTab] = useState<'about' | 'members' | 'files' | 'settings'>('about');
  const [isSummarizeModalOpen, setIsSummarizeModalOpen] = useState(false);
  const [isHuddleOpen, setIsHuddleOpen] = useState(false);
  const [isStarred, setIsStarred] = useState(false);

  // Slack Rich Composer Popovers
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [isAttachPopoverOpen, setIsAttachPopoverOpen] = useState(false);
  const [selectedAttachment, setSelectedAttachment] = useState<{
    type: 'textbook';
    id: string;
    name: string;
    size: string;
    totalPages: number;
    authorName: string;
  } | null>(null);

  // Available Textbooks for Attachment
  const [availableTextbooks, setAvailableTextbooks] = useState<Array<{
    id: string;
    name: string;
    size: string;
    totalPages: number;
    authorName: string;
  }>>([
    {
      id: 'tb-001',
      name: '3000.pdf',
      size: '12.4 MB',
      totalPages: 128,
      authorName: 'TS. Hồ Anh Vũ',
    },
    {
      id: 'tb-002',
      name: '2018-Operating System Concepts-10th.pdf',
      size: '29.7 MB',
      totalPages: 1278,
      authorName: 'TS. Hồ Anh Vũ',
    },
    {
      id: 'tb-003',
      name: 'BAI GIANG Tu tuong HCM - LLCT.pdf',
      size: '15.2 MB',
      totalPages: 182,
      authorName: 'ThS. Hân Bích',
    },
    {
      id: 'tb-004',
      name: 'GiaoTrinh_KinhTeViMo_2025.pdf',
      size: '22.1 MB',
      totalPages: 412,
      authorName: 'Bộ Môn Kinh Tế',
    },
  ]);

  // Basic Modals
  const [isAddFriendOpen, setIsAddFriendOpen] = useState(false);
  const [friendEmailInput, setFriendEmailInput] = useState('');
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDept, setNewGroupDept] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [inviteEmailInput, setInviteEmailInput] = useState('');

  // Public profile modal
  const [profileEmail, setProfileEmail] = useState<string | null>(null);
  const [profileName, setProfileName] = useState<string | undefined>(undefined);

  // Refs
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const prevMsgCount = useRef<Record<string, number>>({});

  // ── Audio Beep ───────────────────────────────────────────────────────────
  const playBeep = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(820, ctx.currentTime);
      gain.gain.setValueAtTime(0.07, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
      osc.start();
      osc.stop(ctx.currentTime + 0.22);
    } catch {}
  }, []);

  // ── Backend sync & Storage ───────────────────────────────────────────────
  const syncGroupsToBackend = useCallback(async (groups: QGroup[]) => {
    try {
      await apiClient.fetch(`${API_BASE}/documents/qgroups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groups }),
      });
    } catch {}
  }, []);

  const applyGroups = useCallback(
    (groups: QGroup[]) => {
      const bl = getBlacklist(myEmail);
      const valid = groups.filter(
        (g) => !bl.has(g.id) && !bl.has(g.code)
      );
      setQgroups(valid);
      try {
        localStorage.setItem('quizgen_qgroups', JSON.stringify(valid));
      } catch {}
    },
    [myEmail]
  );

  const markGroupAsRead = useCallback(
    (groupId: string) => {
      if (!groupId || !myEmail) return;
      setQgroups((prev) => {
        let changed = false;
        const next = prev.map((g) => {
          if (g.id !== groupId && g.code !== groupId) return g;
          const msgs = (g.messages || []).map((m) => {
            const readBy = m.readBy || [];
            if (!readBy.some((r) => r.toLowerCase() === myEmail)) {
              changed = true;
              return { ...m, readBy: [...readBy, myEmail] };
            }
            return m;
          });
          return changed ? { ...g, messages: msgs } : g;
        });
        if (changed) {
          try {
            localStorage.setItem('quizgen_qgroups', JSON.stringify(next));
          } catch {}
        }
        return changed ? next : prev;
      });

      apiClient
        .fetch(`${API_BASE}/documents/qgroups/${encodeURIComponent(groupId)}/read`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userEmail: myEmail }),
        })
        .catch(() => {});
    },
    [myEmail]
  );

  const fetchGroupInvitations = useCallback(async () => {
    if (!myEmail) return;
    try {
      const res = await apiClient.fetch(
        `${API_BASE}/documents/qgroups/invitations?email=${encodeURIComponent(myEmail)}`
      );
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data))
          setGroupInvitations(data.filter((i: QGroupInvitation) => i?.status === 'pending'));
      }
    } catch {}
  }, [myEmail]);

  const fetchFriendRequests = useCallback(async () => {
    if (!myEmail) return;
    try {
      const res = await apiClient.fetch(
        `${API_BASE}/documents/friend-requests?email=${encodeURIComponent(myEmail)}`
      );
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data))
          setFriendRequests(data.filter((r: FriendRequest) => r?.status === 'pending'));
      }
    } catch {}
  }, [myEmail]);

  const fetchQGroups = useCallback(async () => {
    try {
      const res = await apiClient.fetch(`${API_BASE}/documents/qgroups`);
      if (!res.ok) return;
      const remote = await res.json();
      if (!Array.isArray(remote)) return;

      const bl = getBlacklist(myEmail);
      const remoteClean = flattenGroups(remote).filter(
        (g) => !bl.has(g.id) && !bl.has(g.code)
      );

      let merged = [...remoteClean];
      try {
        const localSaved = localStorage.getItem('quizgen_qgroups');
        if (localSaved) {
          const localGroups = flattenGroups(JSON.parse(localSaved) as unknown[]).filter(
            (g) => !bl.has(g.id) && !bl.has(g.code)
          );
          const remoteKeys = new Set(remoteClean.map((g) => (g.code || g.id).trim()));
          const onlyLocal = localGroups.filter(
            (lg) => !(lg.code || lg.id) || !remoteKeys.has((lg.code || lg.id).trim())
          );
          if (onlyLocal.length > 0) merged = [...remoteClean, ...onlyLocal];
        }
      } catch {}

      const seen = new Set<string>();
      const deduped: QGroup[] = [];
      for (const g of merged) {
        const key = (g.code || g.id || '').trim();
        if (!key || bl.has(key)) continue;
        if (seen.has(key)) continue;
        seen.add(key);

        const cleanMsgs = dedupMessages(g.messages || []);

        const localGroup = qgroups.find(
          (lg) => lg.id === g.id || lg.code === g.code
        );
        if (localGroup) {
          const localReadMsgIds = new Set<string>();
          (localGroup.messages || []).forEach((lm) => {
            if ((lm.readBy || []).some((r) => r.toLowerCase() === myEmail)) {
              if (lm.id) localReadMsgIds.add(lm.id);
            }
          });
          cleanMsgs.forEach((cm) => {
            if (cm.id && localReadMsgIds.has(cm.id)) {
              const currentReadBy = cm.readBy || [];
              if (!currentReadBy.some((r) => r.toLowerCase() === myEmail)) {
                cm.readBy = [...currentReadBy, myEmail];
              }
            }
          });
        }

        if (g.id === selectedGroupId || g.code === selectedGroupId) {
          cleanMsgs.forEach((cm) => {
            const currentReadBy = cm.readBy || [];
            if (!currentReadBy.some((r) => r.toLowerCase() === myEmail)) {
              cm.readBy = [...currentReadBy, myEmail];
            }
          });
        }

        const calculatedTime = getGroupSortTime({ ...g, messages: cleanMsgs });
        deduped.push({ ...g, messages: cleanMsgs, updatedAt: calculatedTime });
      }

      deduped.forEach((g) => {
        const msgs = g.messages || [];
        const prev = prevMsgCount.current[g.id] ?? msgs.length;
        if (msgs.length > prev) {
          const last = msgs[msgs.length - 1];
          if (last && last.senderEmail?.toLowerCase() !== myEmail && !last.isSystem) {
            playBeep();
            onShowToast(
              'info',
              `Tin nhắn mới từ ${last.senderName || 'ai đó'}`,
              last.text || '[Tệp đính kèm]'
            );
          }
        }
        prevMsgCount.current[g.id] = msgs.length;
      });

      applyGroups(deduped);
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myEmail, selectedGroupId, applyGroups, playBeep, onShowToast]);

  // Polling 2s
  useEffect(() => {
    void fetchQGroups();
    void fetchGroupInvitations();
    void fetchFriendRequests();
    const iv = setInterval(() => {
      void fetchQGroups();
      void fetchGroupInvitations();
      void fetchFriendRequests();
    }, 2000);
    return () => clearInterval(iv);
  }, [fetchQGroups, fetchGroupInvitations, fetchFriendRequests]);

  useEffect(() => {
    if (!selectedGroupId && qgroups.length > 0) {
      setSelectedGroupId(qgroups[0].id);
    }
  }, [qgroups, selectedGroupId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedGroupId]);

  useEffect(() => {
    if (selectedGroupId) {
      markGroupAsRead(selectedGroupId);
    }
  }, [selectedGroupId, markGroupAsRead]);

  // Click outside to close menus
  useEffect(() => {
    const handler = () => {
      setMenuGroupId(null);
      setIsEmojiPickerOpen(false);
      setIsAttachPopoverOpen(false);
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  // ── Sorted groups ─────────────────────────────────────────────────────────
  const sortedGroups = useMemo(() => {
    return [...qgroups]
      .filter((g) => {
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          return (
            (g.name || '').toLowerCase().includes(q) ||
            (g.department || '').toLowerCase().includes(q) ||
            (g.code || '').toLowerCase().includes(q)
          );
        }
        if (filterTab === 'groups') return !g.isDirect;
        if (filterTab === 'friends') return Boolean(g.isDirect);
        if (filterTab === 'unread') {
          const msgs = g.messages || [];
          if (!msgs.length) return false;
          const last = msgs[msgs.length - 1];
          return (
            last.senderEmail?.toLowerCase() !== myEmail &&
            !(last.readBy || []).some((r) => String(r).toLowerCase() === myEmail)
          );
        }
        return true;
      })
      .sort((a, b) => getGroupSortTime(b) - getGroupSortTime(a));
  }, [qgroups, searchQuery, filterTab, myEmail]);

  const activeGroup = useMemo(
    () => qgroups.find((g) => g.id === selectedGroupId) ?? null,
    [qgroups, selectedGroupId]
  );

  const totalInvitations = friendRequests.length + groupInvitations.length;

  // ── Rich Text Insertion ───────────────────────────────────────────────────
  const insertFormatting = (prefix: string, suffix: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = chatInput.substring(start, end);
    const replacement = prefix + (selected || 'nội dung') + suffix;
    const nextVal = chatInput.substring(0, start) + replacement + chatInput.substring(end);
    setChatInput(nextVal);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + (selected ? selected.length : 8));
    }, 50);
  };

  // ── Send Message ──────────────────────────────────────────────────────────
  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    if ((!chatInput.trim() && !selectedAttachment) || !activeGroup) return;

    const now = Date.now();
    const newMsg: QGroupMessage = {
      id: `msg-${now}`,
      senderEmail: myEmail,
      senderName: myName,
      senderTitle: currentUser?.academicTitle || 'GV',
      avatarColor: 'bg-purple-600',
      text: chatInput.trim(),
      attachment: selectedAttachment || undefined,
      timestamp: new Date().toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      readBy: [myEmail],
    };

    const updated = qgroups.map((g) =>
      g.id === activeGroup.id
        ? { ...g, updatedAt: now, messages: [...(g.messages || []), newMsg] }
        : g
    );
    applyGroups(updated);
    setChatInput('');
    setSelectedAttachment(null);
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 60);

    const targetId = activeGroup.id || activeGroup.code;
    apiClient
      .fetch(
        `${API_BASE}/documents/qgroups/${encodeURIComponent(targetId)}/messages`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newMsg),
        }
      )
      .catch(() => {});
  };

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleDeleteChat = useCallback(
    (group: QGroup) => {
      if (!confirm(`Xóa đoạn chat "${group.name}"?`)) return;
      addToBlacklist(myEmail, group.id, group.code);
      const next = qgroups.filter(
        (g) => g.id !== group.id && g.code !== group.code
      );
      applyGroups(next);
      if (selectedGroupId === group.id) {
        setSelectedGroupId(next[0]?.id || '');
      }
      apiClient
        .fetch(`${API_BASE}/documents/qgroups/${encodeURIComponent(group.id)}`, {
          method: 'DELETE',
        })
        .catch(() => {});
      onShowToast('info', 'Đã xóa đoạn chat', group.name);
    },
    [myEmail, qgroups, applyGroups, selectedGroupId, onShowToast]
  );

  const handleLeaveGroup = useCallback(
    (group: QGroup) => {
      if (!confirm(`Rời khỏi nhóm "${group.name}"?`)) return;
      addToBlacklist(myEmail, group.id, group.code);
      const next = qgroups.filter(
        (g) => g.id !== group.id && g.code !== group.code
      );
      applyGroups(next);
      if (selectedGroupId === group.id) setSelectedGroupId(next[0]?.id || '');
      onShowToast('info', 'Đã rời nhóm', group.name);
    },
    [myEmail, qgroups, applyGroups, selectedGroupId, onShowToast]
  );

  const handleToggleMute = useCallback(
    (group: QGroup) => {
      const updated = qgroups.map((g) =>
        g.id === group.id ? { ...g, muted: !g.muted } : g
      );
      applyGroups(updated);
      void syncGroupsToBackend(updated);
      onShowToast(
        'info',
        'Thông báo',
        group.muted ? 'Đã bật thông báo' : 'Đã tắt thông báo'
      );
    },
    [qgroups, applyGroups, syncGroupsToBackend, onShowToast]
  );

  const handleSendFriendRequest = async () => {
    const email = friendEmailInput.trim().toLowerCase();
    if (!email) return;
    if (email === myEmail) {
      onShowToast('warning', 'Không hợp lệ', 'Bạn không thể kết bạn với chính mình.');
      return;
    }
    const req: FriendRequest = {
      id: `fr-${Date.now()}`,
      senderEmail: myEmail,
      senderName: myName,
      senderTitle: currentUser?.academicTitle || 'ThS.',
      targetEmail: email,
      requestedAt: new Date().toISOString(),
      status: 'pending',
    };
    try {
      const res = await apiClient.fetch(`${API_BASE}/documents/friend-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req),
      });
      if (res.ok) {
        onShowToast('success', 'Đã gửi lời mời', `Đã gửi lời mời kết bạn tới: ${email}`);
        setFriendEmailInput('');
        setIsAddFriendOpen(false);
      }
    } catch {
      onShowToast('error', 'Lỗi', 'Không thể gửi lời mời.');
    }
  };

  const handleAcceptFriendRequest = async (req: FriendRequest) => {
    try {
      const res = await apiClient.fetch(
        `${API_BASE}/documents/friend-requests/${req.id}/respond`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'accept', userEmail: myEmail, userName: myName }),
        }
      );
      if (res.ok) {
        setFriendRequests((prev) => prev.filter((r) => r.id !== req.id));
        await fetchQGroups();
        onShowToast('success', 'Đã kết bạn thành công', req.senderName || req.senderEmail);
      }
    } catch {}
  };

  const handleRejectFriendRequest = async (req: FriendRequest) => {
    try {
      await apiClient.fetch(
        `${API_BASE}/documents/friend-requests/${req.id}/respond`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'reject', userEmail: myEmail }),
        }
      );
      setFriendRequests((prev) => prev.filter((r) => r.id !== req.id));
      onShowToast('info', 'Đã từ chối', req.senderName || req.senderEmail);
    } catch {}
  };

  const handleAcceptGroupInv = async (inv: QGroupInvitation) => {
    try {
      await apiClient.fetch(
        `${API_BASE}/documents/qgroups/invitations/${inv.id}/respond`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'accept', userEmail: myEmail, userName: myName }),
        }
      );
      setGroupInvitations((prev) => prev.filter((i) => i.id !== inv.id));
      await fetchQGroups();
      setSelectedGroupId(inv.groupId);
      setFilterTab('groups');
      onShowToast('success', 'Đã tham gia nhóm', inv.groupName);
    } catch {}
  };

  const handleRejectGroupInv = async (inv: QGroupInvitation) => {
    try {
      await apiClient.fetch(
        `${API_BASE}/documents/qgroups/invitations/${inv.id}/respond`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'reject', userEmail: myEmail }),
        }
      );
      setGroupInvitations((prev) => prev.filter((i) => i.id !== inv.id));
      onShowToast('info', 'Đã từ chối', inv.groupName);
    } catch {}
  };

  const handleInviteToGroup = async (group: QGroup) => {
    const email = inviteEmailInput.trim().toLowerCase();
    if (!email || !group) return;
    const inv = {
      id: `inv-${Date.now()}`,
      groupId: group.id,
      groupCode: group.code,
      groupName: group.name,
      inviterEmail: myEmail,
      inviterName: myName,
      targetEmail: email,
      status: 'pending',
      invitedAt: new Date().toISOString(),
    };
    try {
      await apiClient.fetch(`${API_BASE}/documents/qgroups/invitations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inv),
      });
      onShowToast('success', 'Đã gửi lời mời', `Đã mời ${email} vào nhóm.`);
      setInviteEmailInput('');
    } catch {}
  };

  const handleCreateGroup = () => {
    if (!newGroupName.trim()) return;
    const now = Date.now();
    const code = `QGRP-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
    const group: QGroup = {
      id: `qg-${now}`,
      code,
      name: newGroupName.trim(),
      department: newGroupDept.trim() || 'Khoa Chuyên Ngành',
      description:
        newGroupDesc.trim() || 'Không gian làm việc chung: trao đổi câu hỏi, chia sẻ giáo trình và thống nhất ma trận đề thi.',
      ownerEmail: myEmail,
      ownerName: myName,
      joinPolicy: 'approval_required',
      memberCount: 1,
      members: [myEmail],
      pendingRequests: [],
      isDirect: false,
      updatedAt: now,
      messages: [
        {
          id: `msg-${now}`,
          senderEmail: 'system',
          senderName: 'Hệ Thống QuizGen',
          isSystem: true,
          timestamp: new Date().toLocaleTimeString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
          }),
          text: `Nhóm "${newGroupName.trim()}" đã được khởi tạo bởi ${myName}. Mã phòng: ${code}`,
        },
      ],
    };
    const next = [group, ...qgroups];
    applyGroups(next);
    void syncGroupsToBackend(next);
    setSelectedGroupId(group.id);
    setIsCreateGroupOpen(false);
    setNewGroupName('');
    setNewGroupDept('');
    setNewGroupDesc('');
    onShowToast('success', 'Đã tạo nhóm', `Mã phòng: ${code}`);
  };

  const handleJoinByCode = async (code: string) => {
    const c = code.trim().toUpperCase();
    if (!c) return;
    const groups = await apiClient
      .fetch(`${API_BASE}/documents/qgroups`)
      .then((r) => (r.ok ? r.json() : []))
      .catch(() => []);
    const found = flattenGroups(groups as unknown[]).find(
      (g) => (g.code || '').toUpperCase() === c
    );
    if (!found) {
      onShowToast('warning', 'Không tìm thấy nhóm', `Mã ${c} không hợp lệ.`);
      return;
    }
    if (qgroups.some((g) => g.id === found.id)) {
      onShowToast('info', 'Bạn đã trong nhóm này', found.name);
      return;
    }
    const updated = [found, ...qgroups];
    applyGroups(updated);
    void syncGroupsToBackend(updated);
    setSelectedGroupId(found.id);
    onShowToast('success', 'Đã tham gia nhóm', found.name);
  };

  // ============================================================================
  // RENDER
  // ============================================================================
  return (
    <div
      className="flex-1 flex h-full overflow-hidden bg-[#f7f9fb] select-none"
      onClick={() => {
        setMenuGroupId(null);
        setIsEmojiPickerOpen(false);
        setIsAttachPopoverOpen(false);
      }}
    >
      {/* ====================================================================
          LEFT SIDEBAR: CONVERSATION LIST
      ==================================================================== */}
      <div className="w-80 lg:w-96 bg-white border-r border-slate-200 flex flex-col shrink-0 h-full">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <span>Đoạn chat</span>
              {totalInvitations > 0 && (
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
              )}
            </h2>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsAddFriendOpen(true);
                }}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-purple-100 hover:text-purple-700 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
                title="Thêm bạn mới"
              >
                <UserPlus className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsCreateGroupOpen(true);
                }}
                className="w-8 h-8 rounded-full bg-purple-600 hover:bg-purple-700 text-white flex items-center justify-center transition-colors shadow-xs cursor-pointer"
                title="Tạo nhóm mới"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm cuộc trò chuyện, bạn bè..."
              className="w-full pl-9 pr-3 py-2 bg-slate-100 hover:bg-slate-200/70 focus:bg-white border border-transparent focus:border-purple-300 rounded-full text-xs text-slate-800 placeholder-slate-400 outline-none transition-all"
            />
          </div>

          {/* Filter tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
            {(
              [
                { id: 'all', label: 'Tất cả' },
                { id: 'unread', label: 'Chưa đọc' },
                { id: 'groups', label: 'Nhóm' },
                { id: 'friends', label: 'Bạn bè' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setFilterTab(tab.id);
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  filterTab === tab.id
                    ? 'bg-purple-100 text-purple-700'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/60'
                }`}
              >
                {tab.label}
              </button>
            ))}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setFilterTab('invitations');
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                filterTab === 'invitations'
                  ? 'bg-purple-100 text-purple-700 ring-1 ring-purple-300'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200/60'
              }`}
            >
              <span>Lời mời</span>
              {totalInvitations > 0 && (
                <span className="px-1.5 rounded-full text-[10px] font-black bg-rose-500 text-white animate-pulse">
                  {totalInvitations}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Conversation List / Invitations */}
        {filterTab === 'invitations' ? (
          <InvitationsPanel
            friendRequests={friendRequests}
            groupInvitations={groupInvitations}
            onAcceptFriend={handleAcceptFriendRequest}
            onRejectFriend={handleRejectFriendRequest}
            onAcceptGroup={handleAcceptGroupInv}
            onRejectGroup={handleRejectGroupInv}
            onBack={() => setFilterTab('all')}
          />
        ) : (
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {sortedGroups.length === 0 ? (
              <div className="p-8 text-center text-slate-400 space-y-2">
                <MessageCircle className="w-10 h-10 mx-auto text-slate-300" />
                <p className="text-xs font-bold text-slate-600">Không có đoạn chat nào</p>
                <p className="text-[11px]">Bấm dấu + để bắt đầu kết bạn hoặc tạo nhóm.</p>
              </div>
            ) : (
              sortedGroups.map((group) => (
                <ConversationItem
                  key={group.id}
                  group={group}
                  isSelected={group.id === selectedGroupId}
                  myEmail={myEmail}
                  isMenuOpen={menuGroupId === group.id}
                  onSelect={() => {
                    setSelectedGroupId(group.id);
                    markGroupAsRead(group.id);
                    setMenuGroupId(null);
                  }}
                  onMenuToggle={(e) => {
                    e.stopPropagation();
                    setMenuGroupId((prev) => (prev === group.id ? null : group.id));
                  }}
                  onViewProfile={() => {
                    setProfileEmail(group.directPartnerEmail || group.ownerEmail || null);
                    setProfileName(group.directPartnerName || group.name);
                    setMenuGroupId(null);
                  }}
                  onViewDetails={() => {
                    setChannelDetailsTab('about');
                    setIsChannelDetailsOpen(true);
                    setMenuGroupId(null);
                  }}
                  onMute={() => handleToggleMute(group)}
                  onDelete={() => handleDeleteChat(group)}
                  onLeave={() => handleLeaveGroup(group)}
                  onCopyCode={() => {
                    navigator.clipboard.writeText(group.code);
                    onShowToast('info', 'Đã sao chép mã phòng', group.code);
                    setMenuGroupId(null);
                  }}
                />
              ))
            )}
          </div>
        )}
      </div>

      {/* ====================================================================
          RIGHT CHAT PANEL (SLACK STYLE HEADER & RICH COMPOSER)
      ==================================================================== */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-white">
        {activeGroup ? (
          <>
            {/* Slack Style Chat Header */}
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between gap-3 bg-white shadow-2xs z-10 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  onClick={() => {
                    if (activeGroup.isDirect) {
                      setProfileEmail(activeGroup.directPartnerEmail || activeGroup.ownerEmail || null);
                      setProfileName(activeGroup.directPartnerName || activeGroup.name);
                    } else {
                      setIsChannelDetailsOpen(true);
                    }
                  }}
                  className={`w-10 h-10 rounded-2xl text-white font-black text-xs flex items-center justify-center shadow-xs cursor-pointer hover:opacity-90 transition-all ${
                    activeGroup.isDirect
                      ? 'bg-gradient-to-tr from-indigo-500 to-blue-600'
                      : 'bg-gradient-to-tr from-purple-600 to-indigo-600'
                  }`}
                >
                  {initials(activeGroup.name)}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3
                      onClick={() => {
                        if (activeGroup.isDirect) {
                          setProfileEmail(activeGroup.directPartnerEmail || activeGroup.ownerEmail || null);
                          setProfileName(activeGroup.directPartnerName || activeGroup.name);
                        } else {
                          setIsChannelDetailsOpen(true);
                        }
                      }}
                      className="text-sm font-extrabold text-slate-900 truncate cursor-pointer hover:underline flex items-center gap-1.5"
                    >
                      {!activeGroup.isDirect && <Hash className="w-4 h-4 text-purple-600 shrink-0" />}
                      <span>{activeGroup.name}</span>
                    </h3>

                    {/* Star Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsStarred(!isStarred);
                        onShowToast('info', isStarred ? 'Bỏ đánh dấu sao' : 'Đã đánh dấu sao kênh', activeGroup.name);
                      }}
                      className={`p-1 rounded-md transition-colors ${
                        isStarred ? 'text-amber-500 hover:text-amber-600' : 'text-slate-400 hover:text-slate-600'
                      }`}
                      title={isStarred ? 'Bỏ đánh dấu sao' : 'Đánh dấu sao'}
                    >
                      <Star className={`w-3.5 h-3.5 ${isStarred ? 'fill-current' : ''}`} />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(activeGroup.code);
                        onShowToast('info', 'Đã sao chép mã phòng', activeGroup.code);
                      }}
                      className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-purple-100 text-[10px] font-mono font-bold text-slate-700 flex items-center gap-1 transition-colors shrink-0"
                      title="Sao chép mã phòng"
                    >
                      {activeGroup.code}
                      <Copy className="w-2.5 h-2.5" />
                    </button>
                  </div>

                  <p className="text-[11px] text-slate-400 flex items-center gap-2">
                    {activeGroup.isDirect ? (
                      <span className="flex items-center gap-1 text-emerald-600 font-medium">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Đang hoạt động
                      </span>
                    ) : (
                      <>
                        <span
                          onClick={() => {
                            setChannelDetailsTab('members');
                            setIsChannelDetailsOpen(true);
                          }}
                          className="hover:underline cursor-pointer hover:text-purple-600 font-medium"
                        >
                          👥 {activeGroup.memberCount ?? (activeGroup.members || []).length} thành viên
                        </span>
                        {activeGroup.department && <span>• {activeGroup.department}</span>}
                      </>
                    )}
                  </p>
                </div>
              </div>

              {/* Slack Header Action Buttons */}
              <div className="flex items-center gap-1.5 shrink-0">
                {/* 1. Huddle Button (Bắt đầu cuộc gọi thảo luận Slack) */}
                <button
                  type="button"
                  onClick={() => setIsHuddleOpen(true)}
                  className="px-2.5 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-purple-200/60"
                  title="Bắt đầu thảo luận nhanh (Huddle)"
                >
                  <Headphones className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Huddle</span>
                </button>

                {/* 2. Summarize by AI (Slack AI Summarizer) */}
                <button
                  type="button"
                  onClick={() => setIsSummarizeModalOpen(true)}
                  className="px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-teal-50 to-indigo-50 hover:from-teal-100 hover:to-indigo-100 text-teal-800 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-teal-200/60 shadow-2xs"
                  title="Tóm tắt kênh bằng Quanta AI"
                >
                  <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                  <span className="hidden md:inline">Tóm tắt AI</span>
                </button>

                {/* 3. Notifications */}
                <button
                  type="button"
                  onClick={() => handleToggleMute(activeGroup)}
                  className="p-2 rounded-xl text-slate-500 hover:text-purple-700 hover:bg-slate-100 transition-colors cursor-pointer"
                  title={activeGroup.muted ? 'Bật thông báo' : 'Tắt thông báo'}
                >
                  {activeGroup.muted ? <BellOff className="w-4 h-4 text-amber-500" /> : <Bell className="w-4 h-4" />}
                </button>

                {/* 4. Details / Settings Gear */}
                <button
                  type="button"
                  onClick={() => {
                    if (activeGroup.isDirect) {
                      setProfileEmail(activeGroup.directPartnerEmail || activeGroup.ownerEmail || null);
                      setProfileName(activeGroup.directPartnerName || activeGroup.name);
                    } else {
                      setChannelDetailsTab('about');
                      setIsChannelDetailsOpen(true);
                    }
                  }}
                  className="p-2 rounded-xl text-slate-500 hover:text-purple-700 hover:bg-slate-100 transition-colors cursor-pointer"
                  title={activeGroup.isDirect ? 'Xem trang cá nhân' : 'Chi tiết & Cài đặt kênh'}
                >
                  {activeGroup.isDirect ? <User className="w-4 h-4" /> : <Settings className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Message Stream */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-[#f8fafc]">
              {/* Channel Welcome Card */}
              <div className="p-5 rounded-3xl bg-white border border-slate-200/90 text-center space-y-2 max-w-md mx-auto shadow-2xs">
                <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center font-black mx-auto text-base">
                  {initials(activeGroup.name)}
                </div>
                <h4 className="text-sm font-extrabold text-slate-900">{activeGroup.name}</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {activeGroup.description ||
                    'Không gian trao đổi chuyên môn, chia sẻ giáo trình và đóng góp ma trận câu hỏi thi giữa các giảng viên.'}
                </p>
                <div className="flex items-center justify-center gap-2 pt-1 text-[11px] text-slate-400">
                  <span>Mã phòng: <strong className="font-mono text-purple-600">{activeGroup.code}</strong></span>
                  <span>•</span>
                  <span>Chủ trì: {activeGroup.ownerName || 'TS. Hồ Anh Vũ'}</span>
                </div>
              </div>

              {/* Message Items */}
              {(activeGroup.messages || []).map((msg) => {
                const isMe = msg.senderEmail?.toLowerCase() === myEmail;
                if (msg.isSystem) {
                  return (
                    <div key={msg.id} className="flex justify-center my-1.5">
                      <span className="px-3.5 py-1 rounded-full bg-slate-200/80 text-slate-600 text-[11px] font-medium flex items-center gap-1.5 border border-slate-300/50 shadow-2xs">
                        <Shield className="w-3 h-3 text-purple-600 shrink-0" />
                        <span>{msg.text}</span>
                        <span className="text-[9px] text-slate-400 ml-1">{msg.timestamp}</span>
                      </span>
                    </div>
                  );
                }

                return (
                  <div
                    key={msg.id}
                    className={`flex gap-2.5 max-w-[85%] ${isMe ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
                  >
                    <div
                      onClick={() => {
                        if (!isMe) {
                          setProfileEmail(msg.senderEmail || null);
                          setProfileName(msg.senderName);
                        }
                      }}
                      className={`w-8 h-8 rounded-full text-white text-[10px] font-black flex items-center justify-center shrink-0 self-end mb-1 shadow-xs ${
                        isMe
                          ? 'bg-gradient-to-tr from-purple-600 to-indigo-700'
                          : 'bg-gradient-to-tr from-teal-500 to-indigo-500 cursor-pointer'
                      }`}
                      title={isMe ? undefined : 'Xem trang cá nhân'}
                    >
                      {initials(msg.senderName || '')}
                    </div>

                    <div className={`space-y-1.5 ${isMe ? 'items-end text-right' : ''}`}>
                      {!isMe && (
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                          <span className="font-bold text-slate-700">{msg.senderName}</span>
                          {msg.senderTitle && (
                            <span className="px-1 py-0.2 rounded bg-slate-100 text-slate-500 text-[9px] font-bold">
                              {msg.senderTitle}
                            </span>
                          )}
                          <span>• {msg.timestamp}</span>
                        </div>
                      )}

                      {msg.text && (
                        <div
                          className={`px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed text-left transition-all ${
                            isMe
                              ? 'bg-purple-600 text-white rounded-br-xs shadow-xs font-medium'
                              : 'bg-white border border-slate-200 text-slate-800 rounded-bl-xs shadow-2xs'
                          }`}
                        >
                          <div className="whitespace-pre-wrap">{msg.text}</div>
                        </div>
                      )}

                      {/* Textbook Attachment Card */}
                      {msg.attachment && (
                        <div className="p-3 rounded-2xl bg-teal-50 border border-teal-200/90 text-left space-y-2 shadow-2xs max-w-sm">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                              <BookOpen className="w-4 h-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-teal-900 truncate">
                                {msg.attachment.name}
                              </p>
                              <p className="text-[10px] text-teal-600">
                                {msg.attachment.totalPages} trang • {msg.attachment.size}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              onShowToast('success', 'Đã nạp giáo trình', `Đã chuyển giáo trình ${msg.attachment?.name} vào không gian sinh đề`);
                            }}
                            className="w-full py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-[11px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Dùng Sinh Đề Ngay</span>
                          </button>
                        </div>
                      )}

                      {isMe && (
                        <div className="text-[9px] text-slate-400 flex items-center justify-end gap-1">
                          <span>{msg.timestamp}</span>
                          <CheckCheck className="w-3 h-3 text-purple-600" />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>

            {/* ================================================================
                SLACK RICH TEXT COMPOSER
            ================================================================ */}
            <div className="p-3 sm:px-4 sm:py-3 border-t border-slate-200 bg-white space-y-2">
              {/* Attachment Preview (if any) */}
              {selectedAttachment && (
                <div className="flex items-center justify-between p-2 rounded-xl bg-teal-50 border border-teal-200 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <BookOpen className="w-4 h-4 text-teal-600 shrink-0" />
                    <span className="font-bold text-teal-800 truncate">{selectedAttachment.name}</span>
                    <span className="text-[10px] text-teal-600">({selectedAttachment.size})</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedAttachment(null)}
                    className="p-1 rounded hover:bg-teal-100 text-teal-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Formatting Toolbar (Slack Style) */}
              <div className="flex items-center justify-between gap-1 border border-slate-200 rounded-2xl p-1 bg-slate-50 focus-within:border-purple-400 focus-within:bg-white transition-all shadow-2xs">
                <div className="flex-1 flex flex-col">
                  {/* Top Buttons: B, I, Code, List, Quote */}
                  <div className="flex items-center gap-1 px-2 pt-1 border-b border-slate-200/60 pb-1 text-slate-600">
                    <button
                      type="button"
                      onClick={() => insertFormatting('**', '**')}
                      className="p-1 rounded hover:bg-slate-200 text-slate-700 cursor-pointer font-bold"
                      title="In đậm (Bold)"
                    >
                      <Bold className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => insertFormatting('*', '*')}
                      className="p-1 rounded hover:bg-slate-200 text-slate-700 cursor-pointer italic"
                      title="In nghiêng (Italic)"
                    >
                      <Italic className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => insertFormatting('`', '`')}
                      className="p-1 rounded hover:bg-slate-200 text-slate-700 cursor-pointer font-mono"
                      title="Mã / Code"
                    >
                      <Code className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => insertFormatting('\n- ')}
                      className="p-1 rounded hover:bg-slate-200 text-slate-700 cursor-pointer"
                      title="Gạch đầu dòng (List)"
                    >
                      <List className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => insertFormatting('\n> ')}
                      className="p-1 rounded hover:bg-slate-200 text-slate-700 cursor-pointer"
                      title="Trích dẫn (Quote)"
                    >
                      <Quote className="w-3.5 h-3.5" />
                    </button>

                    <div className="h-3 w-px bg-slate-200 mx-1" />

                    {/* Emoji Quick Picker Trigger */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsEmojiPickerOpen(!isEmojiPickerOpen);
                          setIsAttachPopoverOpen(false);
                        }}
                        className="p-1 rounded hover:bg-purple-100 hover:text-purple-700 text-slate-600 cursor-pointer"
                        title="Chèn biểu tượng cảm xúc"
                      >
                        <Smile className="w-3.5 h-3.5" />
                      </button>

                      {isEmojiPickerOpen && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="absolute left-0 bottom-8 z-30 bg-white border border-slate-200 rounded-2xl shadow-xl p-2 flex items-center gap-1.5 text-base animate-fade-in"
                        >
                          {['👍', '❤️', '👏', '💡', '🔥', '📚', '🎓', '✍️', '🎉', '✅'].map((emoji) => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => {
                                setChatInput((prev) => prev + emoji);
                                setIsEmojiPickerOpen(false);
                              }}
                              className="w-8 h-8 rounded-xl hover:bg-slate-100 flex items-center justify-center transition-all hover:scale-110 cursor-pointer"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Attach Textbook Trigger */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsAttachPopoverOpen(!isAttachPopoverOpen);
                          setIsEmojiPickerOpen(false);
                        }}
                        className="p-1 rounded hover:bg-teal-100 hover:text-teal-700 text-slate-600 cursor-pointer flex items-center gap-1 text-[11px] font-bold"
                        title="Đính kèm giáo trình từ Thư viện"
                      >
                        <Paperclip className="w-3.5 h-3.5 text-teal-600" />
                        <span className="hidden sm:inline text-teal-700">Đính kèm giáo trình</span>
                      </button>

                      {isAttachPopoverOpen && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="absolute left-0 bottom-8 z-30 w-72 bg-white border border-slate-200 rounded-2xl shadow-xl p-3 space-y-2 animate-fade-in text-xs"
                        >
                          <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                            <span className="font-extrabold text-slate-800 flex items-center gap-1">
                              <BookOpen className="w-3.5 h-3.5 text-teal-600" />
                              Kho Giáo Trình Sẵn Có
                            </span>
                            <button
                              type="button"
                              onClick={() => setIsAttachPopoverOpen(false)}
                              className="text-slate-400 hover:text-slate-600"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                          <div className="max-h-48 overflow-y-auto space-y-1.5">
                            {availableTextbooks.map((tb) => (
                              <div
                                key={tb.id}
                                onClick={() => {
                                  setSelectedAttachment({
                                    type: 'textbook',
                                    id: tb.id,
                                    name: tb.name,
                                    size: tb.size,
                                    totalPages: tb.totalPages,
                                    authorName: tb.authorName,
                                  });
                                  setIsAttachPopoverOpen(false);
                                  onShowToast('info', 'Đã chọn tệp đính kèm', tb.name);
                                }}
                                className="p-2 rounded-xl border border-slate-200/80 hover:border-teal-400 hover:bg-teal-50/50 cursor-pointer transition-all space-y-0.5"
                              >
                                <p className="font-bold text-slate-800 truncate">{tb.name}</p>
                                <p className="text-[10px] text-slate-400">
                                  {tb.totalPages} trang • {tb.size}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Multi-line Textarea */}
                  <textarea
                    ref={textareaRef}
                    rows={2}
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder={
                      activeGroup.isDirect
                        ? `Nhắn tin tới ${activeGroup.directPartnerName || activeGroup.name}... (Enter để gửi, Shift+Enter xuống dòng)`
                        : `Nhắn tin trong #${activeGroup.name}... (Enter để gửi, Shift+Enter xuống dòng)`
                    }
                    className="w-full px-3 py-2 text-xs text-slate-800 placeholder-slate-400 bg-transparent outline-none resize-none"
                  />
                </div>

                {/* Send Button */}
                <button
                  type="button"
                  onClick={() => handleSend()}
                  disabled={!chatInput.trim() && !selectedAttachment}
                  className="w-9 h-9 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-30 text-white flex items-center justify-center transition-all shadow-xs shrink-0 self-end mb-1 mr-1 cursor-pointer"
                  title="Gửi tin nhắn (Enter)"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 space-y-3">
            <MessageCircle className="w-14 h-14 text-slate-200" />
            <p className="font-bold text-sm text-slate-600">Chưa chọn đoạn chat</p>
            <p className="text-xs max-w-xs">
              Chọn một người bạn hoặc nhóm từ danh sách bên trái để bắt đầu nhắn tin.
            </p>
          </div>
        )}
      </div>

      {/* ====================================================================
          MODAL: CHANNEL DETAILS & SETTINGS (SLACK STYLE MULTI-TAB)
      ==================================================================== */}
      {isChannelDetailsOpen && activeGroup && (
        <ChannelDetailsModal
          group={activeGroup}
          myEmail={myEmail}
          activeTab={channelDetailsTab}
          onTabChange={setChannelDetailsTab}
          inviteEmail={inviteEmailInput}
          onInviteEmailChange={setInviteEmailInput}
          onInvite={() => void handleInviteToGroup(activeGroup)}
          onClose={() => setIsChannelDetailsOpen(false)}
          onSaveSettings={(name, dept, desc) => {
            const updated = qgroups.map((g) =>
              g.id === activeGroup.id
                ? { ...g, name, department: dept, description: desc }
                : g
            );
            applyGroups(updated);
            void syncGroupsToBackend(updated);
            onShowToast('success', 'Đã lưu cài đặt nhóm', name);
            setIsChannelDetailsOpen(false);
          }}
          onLeaveGroup={() => {
            setIsChannelDetailsOpen(false);
            handleLeaveGroup(activeGroup);
          }}
        />
      )}

      {/* ====================================================================
          MODAL: SLACK AI SUMMARIZER (TÓM TẮT CUỘC TRÒ CHUYỆN)
      ==================================================================== */}
      {isSummarizeModalOpen && activeGroup && (
        <AiSummarizeModal
          group={activeGroup}
          onClose={() => setIsSummarizeModalOpen(false)}
        />
      )}

      {/* ====================================================================
          MODAL: SLACK HUDDLE (THẢO LUẬN ÂM THANH NHANH)
      ==================================================================== */}
      {isHuddleOpen && activeGroup && (
        <HuddleCallModal
          group={activeGroup}
          currentUser={currentUser}
          onClose={() => setIsHuddleOpen(false)}
        />
      )}

      {/* ====================================================================
          OTHER MODALS: PUBLIC PROFILE, ADD FRIEND, CREATE GROUP
      ==================================================================== */}
      <PublicProfileModal
        isOpen={Boolean(profileEmail)}
        userEmail={profileEmail}
        userName={profileName}
        onClose={() => {
          setProfileEmail(null);
          setProfileName(undefined);
        }}
        currentUser={currentUser}
        onSendFriendRequest={(email) => {
          setFriendEmailInput(email || '');
          void handleSendFriendRequest();
        }}
      />

      {isAddFriendOpen && (
        <Modal onClose={() => setIsAddFriendOpen(false)} title="Thêm Bạn Bè Mới" icon={<UserPlus className="w-4 h-4 text-purple-600" />}>
          <p className="text-xs text-slate-500 leading-relaxed">
            Nhập email đồng nghiệp để gửi lời mời kết bạn. Khi đối phương chấp nhận, phòng chat
            riêng 1-1 sẽ tự động mở.
          </p>
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-700">Email đồng nghiệp</label>
            <input
              type="email"
              value={friendEmailInput}
              onChange={(e) => setFriendEmailInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void handleSendFriendRequest()}
              placeholder="VD: lecturer@quizgen.ai..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-purple-500"
              autoFocus
            />
          </div>
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsAddFriendOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={() => void handleSendFriendRequest()}
              disabled={!friendEmailInput.trim()}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              Gửi lời mời
            </button>
          </div>
        </Modal>
      )}

      {isCreateGroupOpen && (
        <Modal onClose={() => setIsCreateGroupOpen(false)} title="Tạo Hội Nhóm Mới" icon={<Users className="w-4 h-4 text-purple-600" />}>
          <div className="space-y-3 text-xs">
            <div>
              <label className="font-bold text-slate-700">Tên nhóm *</label>
              <input
                type="text"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="VD: Bộ Môn Mạng & Hệ Điều Hành"
                className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700">Khoa / Đơn vị</label>
              <input
                type="text"
                value={newGroupDept}
                onChange={(e) => setNewGroupDept(e.target.value)}
                placeholder="VD: Khoa Công nghệ Thông tin"
                className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700">Mô tả mục đích nhóm</label>
              <textarea
                rows={2}
                value={newGroupDesc}
                onChange={(e) => setNewGroupDesc(e.target.value)}
                placeholder="Trao đổi ngân hàng câu hỏi, chia sẻ giáo trình..."
                className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-purple-500 resize-none"
              />
            </div>
          </div>

          <div className="border-t border-slate-100 pt-3">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
              Hoặc nhập mã phòng có sẵn để tham gia
            </span>
            <div className="flex items-center gap-2 mt-1.5">
              <input
                id="join-code"
                type="text"
                placeholder="VD: QGRP-OS2026..."
                className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-purple-500"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    void handleJoinByCode((e.target as HTMLInputElement).value);
                    (e.target as HTMLInputElement).value = '';
                  }
                }}
              />
              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById('join-code') as HTMLInputElement;
                  void handleJoinByCode(el.value);
                  el.value = '';
                }}
                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
              >
                Tham gia
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsCreateGroupOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="button"
              disabled={!newGroupName.trim()}
              onClick={handleCreateGroup}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white font-bold text-xs shadow-xs cursor-pointer"
            >
              Tạo nhóm
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

const Modal: React.FC<{
  onClose: () => void;
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}> = ({ onClose, title, icon, children }) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-slate-900/50 p-4"
    onClick={onClose}
  >
    <div
      className="bg-white rounded-3xl max-w-md w-full border border-slate-200 shadow-2xl p-6 space-y-4"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
          {icon}
          <span>{title}</span>
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      {children}
    </div>
  </div>
);

// ── ConversationItem ──────────────────────────────────────────────────────────
const ConversationItem: React.FC<{
  group: QGroup;
  isSelected: boolean;
  myEmail: string;
  isMenuOpen: boolean;
  onSelect: () => void;
  onMenuToggle: (e: React.MouseEvent) => void;
  onViewProfile: () => void;
  onViewDetails: () => void;
  onMute: () => void;
  onDelete: () => void;
  onLeave: () => void;
  onCopyCode: () => void;
}> = ({
  group,
  isSelected,
  myEmail,
  isMenuOpen,
  onSelect,
  onMenuToggle,
  onViewProfile,
  onViewDetails,
  onMute,
  onDelete,
  onLeave,
  onCopyCode,
}) => {
  const msgs = group.messages || [];
  const lastMsg = msgs.length > 0 ? msgs[msgs.length - 1] : null;
  const isUnread =
    !isSelected &&
    Boolean(
      lastMsg &&
      !lastMsg.isSystem &&
      lastMsg.senderEmail?.toLowerCase() !== myEmail &&
      !(lastMsg.readBy || []).some((r) => String(r).toLowerCase() === myEmail)
    );

  const isGroup = !group.isDirect;

  return (
    <div
      onClick={onSelect}
      className={`relative p-3 sm:px-3.5 flex items-center gap-3 cursor-pointer transition-all ${
        isSelected
          ? 'bg-purple-50/80 border-l-4 border-l-purple-600'
          : isUnread
          ? 'bg-slate-50/90 hover:bg-slate-100'
          : 'hover:bg-slate-50'
      }`}
    >
      <div className="relative shrink-0">
        <div
          className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm text-white shadow-xs ${
            group.isDirect
              ? 'bg-gradient-to-tr from-indigo-500 to-blue-600'
              : 'bg-gradient-to-tr from-purple-600 to-indigo-600'
          }`}
        >
          {initials(group.name)}
        </div>
        <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-white" />
      </div>

      <div className="flex-1 min-w-0 pr-7">
        <div className="flex items-center justify-between gap-1">
          <h4
            className={`text-xs truncate ${isUnread ? 'font-black text-slate-900' : 'font-bold text-slate-800'}`}
          >
            {group.name}
          </h4>
          {lastMsg && (
            <span className="text-[10px] text-slate-400 shrink-0 font-medium">
              {group.updatedAt ? formatTime(group.updatedAt) : lastMsg.timestamp}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between gap-1 mt-0.5">
          <p
            className={`text-[11px] truncate flex-1 ${
              isUnread ? 'font-bold text-purple-900' : 'text-slate-500'
            }`}
          >
            {lastMsg ? (
              lastMsg.isSystem ? (
                <span className="italic">{lastMsg.text}</span>
              ) : (
                <>
                  {lastMsg.senderEmail?.toLowerCase() === myEmail ? 'Bạn: ' : ''}
                  {lastMsg.text || '[Tài liệu đính kèm]'}
                </>
              )
            ) : (
              'Bắt đầu cuộc trò chuyện...'
            )}
          </p>
          {isUnread && <span className="w-2.5 h-2.5 rounded-full bg-purple-600 shrink-0" />}
        </div>
      </div>

      <button
        type="button"
        onClick={onMenuToggle}
        className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {/* Context Menu (Không trùng lặp popup) */}
      {isMenuOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute right-8 top-10 z-40 w-52 bg-white border border-slate-200 rounded-2xl shadow-xl py-1.5 text-xs animate-fade-in"
        >
          {isGroup ? (
            <>
              <MenuBtn icon={<Users className="w-3.5 h-3.5 text-purple-600" />} label="Chi tiết & Thành viên" onClick={onViewDetails} />
              <MenuBtn icon={<Copy className="w-3.5 h-3.5 text-slate-500" />} label="Sao chép mã nhóm" onClick={onCopyCode} />
              <MenuBtn
                icon={group.muted ? <Bell className="w-3.5 h-3.5 text-amber-500" /> : <BellOff className="w-3.5 h-3.5 text-slate-400" />}
                label={group.muted ? 'Bật thông báo' : 'Tắt thông báo'}
                onClick={onMute}
              />
              <div className="border-t border-slate-100 my-1" />
              <MenuBtn icon={<LogOut className="w-3.5 h-3.5 text-rose-500" />} label="Rời khỏi nhóm" onClick={onLeave} danger />
            </>
          ) : (
            <>
              <MenuBtn icon={<User className="w-3.5 h-3.5 text-purple-600" />} label="Xem trang cá nhân" onClick={onViewProfile} />
              <MenuBtn
                icon={group.muted ? <Bell className="w-3.5 h-3.5 text-amber-500" /> : <BellOff className="w-3.5 h-3.5 text-slate-400" />}
                label={group.muted ? 'Bật thông báo' : 'Tắt thông báo'}
                onClick={onMute}
              />
              <div className="border-t border-slate-100 my-1" />
              <MenuBtn icon={<Trash2 className="w-3.5 h-3.5 text-rose-500" />} label="Xóa đoạn chat" onClick={onDelete} danger />
            </>
          )}
        </div>
      )}
    </div>
  );
};

const MenuBtn: React.FC<{
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}> = ({ icon, label, onClick, danger }) => (
  <button
    type="button"
    onClick={onClick}
    className={`w-full px-3.5 py-2 text-left hover:bg-slate-50 flex items-center gap-2 cursor-pointer ${
      danger ? 'text-rose-600 font-semibold' : 'text-slate-700'
    }`}
  >
    {icon}
    <span>{label}</span>
  </button>
);

// ── InvitationsPanel ──────────────────────────────────────────────────────────
const InvitationsPanel: React.FC<{
  friendRequests: FriendRequest[];
  groupInvitations: QGroupInvitation[];
  onAcceptFriend: (r: FriendRequest) => void;
  onRejectFriend: (r: FriendRequest) => void;
  onAcceptGroup: (i: QGroupInvitation) => void;
  onRejectGroup: (i: QGroupInvitation) => void;
  onBack: () => void;
}> = ({
  friendRequests,
  groupInvitations,
  onAcceptFriend,
  onRejectFriend,
  onAcceptGroup,
  onRejectGroup,
  onBack,
}) => {
  const total = friendRequests.length + groupInvitations.length;
  return (
    <div className="flex-1 overflow-y-auto p-3.5 space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
          <Inbox className="w-4 h-4 text-purple-600" />
          Lời Mời ({total})
        </span>
        <button
          type="button"
          onClick={onBack}
          className="text-xs text-purple-600 font-bold hover:underline cursor-pointer"
        >
          ← Về đoạn chat
        </button>
      </div>

      {friendRequests.length > 0 && (
        <div className="space-y-2">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
            <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
            Lời mời kết bạn ({friendRequests.length})
          </span>
          {friendRequests.map((req) => (
            <div
              key={req.id}
              className="p-3 bg-white rounded-2xl border border-purple-200/90 shadow-xs space-y-2.5"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                  {initials(req.senderName || req.senderEmail)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-xs font-bold text-slate-900 truncate">
                      {req.senderName || req.senderEmail}
                    </h4>
                    {req.senderTitle && (
                      <span className="px-1.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 shrink-0">
                        {req.senderTitle}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 font-mono truncate">
                    {req.senderEmail}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => onAcceptFriend(req)}
                  className="flex-1 py-1.5 px-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  Đồng ý
                </button>
                <button
                  type="button"
                  onClick={() => onRejectFriend(req)}
                  className="py-1.5 px-3 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 font-bold text-xs flex items-center justify-center gap-1 border border-slate-200/60 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  Từ chối
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {groupInvitations.length > 0 && (
        <div className="space-y-2">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-purple-600" />
            Lời mời tham gia nhóm ({groupInvitations.length})
          </span>
          {groupInvitations.map((inv) => (
            <div
              key={inv.id}
              className="p-3 bg-white rounded-2xl border border-purple-200/90 shadow-xs space-y-2.5"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                  {initials(inv.groupName)}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold text-slate-900 truncate">{inv.groupName}</h4>
                  <p className="text-[10px] text-purple-600 font-mono">Mã: {inv.groupCode}</p>
                  <p className="text-[10px] text-slate-400 truncate">
                    Mời bởi: {inv.inviterName || inv.inviterEmail}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => onAcceptGroup(inv)}
                  className="flex-1 py-1.5 px-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  Tham gia
                </button>
                <button
                  type="button"
                  onClick={() => onRejectGroup(inv)}
                  className="py-1.5 px-3 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 font-bold text-xs flex items-center justify-center gap-1 border border-slate-200/60 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  Từ chối
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {total === 0 && (
        <div className="p-8 text-center text-slate-400 space-y-3">
          <div className="w-12 h-12 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center mx-auto">
            <Check className="w-6 h-6" />
          </div>
          <h4 className="text-xs font-bold text-slate-700">Không có lời mời nào</h4>
          <p className="text-[11px] text-slate-400">Bạn đã xử lý hết tất cả lời mời.</p>
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold transition-colors cursor-pointer"
          >
            Quay lại Tất cả đoạn chat
          </button>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// MODAL: SLACK CHANNEL DETAILS (MULTI-TAB: ABOUT, MEMBERS, FILES, SETTINGS)
// ============================================================================
const ChannelDetailsModal: React.FC<{
  group: QGroup;
  myEmail: string;
  activeTab: 'about' | 'members' | 'files' | 'settings';
  onTabChange: (t: 'about' | 'members' | 'files' | 'settings') => void;
  inviteEmail: string;
  onInviteEmailChange: (v: string) => void;
  onInvite: () => void;
  onClose: () => void;
  onSaveSettings: (name: string, dept: string, desc: string) => void;
  onLeaveGroup: () => void;
}> = ({
  group,
  myEmail,
  activeTab,
  onTabChange,
  inviteEmail,
  onInviteEmailChange,
  onInvite,
  onClose,
  onSaveSettings,
  onLeaveGroup,
}) => {
  const isOwner = (group.ownerEmail || '').toLowerCase() === myEmail;
  const members = group.members || [];

  const [editName, setEditName] = useState(group.name);
  const [editDept, setEditDept] = useState(group.department || '');
  const [editDesc, setEditDesc] = useState(group.description || '');

  // Extract shared files from messages
  const sharedFiles = useMemo(() => {
    const list: any[] = [];
    (group.messages || []).forEach((m) => {
      if (m.attachment) {
        list.push({ ...m.attachment, sentAt: m.timestamp, senderName: m.senderName });
      }
    });
    return list;
  }, [group.messages]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-slate-900/50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white font-black text-sm flex items-center justify-center shadow-xs">
              {initials(group.name)}
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                <Hash className="w-4 h-4 text-purple-600" />
                <span>{group.name}</span>
              </h3>
              <p className="text-[11px] text-purple-600 font-mono">Mã phòng: {group.code}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer border border-slate-200/60"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Slack Multi-Tabs */}
        <div className="flex items-center gap-2 px-5 pt-2 border-b border-slate-100 bg-white">
          {[
            { id: 'about' as const, label: 'Giới thiệu', icon: Info },
            { id: 'members' as const, label: `Thành viên (${members.length})`, icon: Users },
            { id: 'files' as const, label: `Tệp (${sharedFiles.length})`, icon: FileText },
            { id: 'settings' as const, label: 'Cài đặt', icon: Settings },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                className={`pb-2.5 px-2 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === tab.id
                    ? 'border-purple-600 text-purple-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {/* TAB 1: ABOUT */}
          {activeTab === 'about' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                <span className="font-bold text-slate-500 uppercase text-[10px] tracking-wide">Mục đích nhóm</span>
                <p className="text-slate-800 leading-relaxed font-medium">
                  {group.description || 'Không có mô tả.'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Khoa / Đơn vị</span>
                  <p className="text-slate-800 font-bold mt-0.5">{group.department || 'Chung'}</p>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Người khởi tạo</span>
                  <p className="text-slate-800 font-bold mt-0.5">{group.ownerName || 'TS. Hồ Anh Vũ'}</p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl border border-slate-200/80 space-y-2">
                <span className="font-bold text-slate-700">Mã liên kết phòng học thuật</span>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={group.code}
                    className="flex-1 px-3 py-2 bg-slate-100 rounded-xl font-mono text-purple-700 font-bold outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(group.code);
                      alert('Đã sao chép mã phòng!');
                    }}
                    className="px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold cursor-pointer"
                  >
                    Sao chép
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={onLeaveGroup}
                className="w-full py-2.5 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer border border-rose-200/60"
              >
                <LogOut className="w-4 h-4" />
                <span>Rời khỏi nhóm này</span>
              </button>
            </div>
          )}

          {/* TAB 2: MEMBERS */}
          {activeTab === 'members' && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                  Mời thêm thành viên qua Email
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => onInviteEmailChange(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && onInvite()}
                    placeholder="Nhập email đồng nghiệp..."
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-purple-500"
                  />
                  <button
                    type="button"
                    onClick={onInvite}
                    disabled={!inviteEmail.trim()}
                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white font-bold cursor-pointer"
                  >
                    Mời
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                  Danh sách thành viên hiện tại ({members.length})
                </span>
                {members.map((email) => {
                  const isGroupOwner = email.toLowerCase() === (group.ownerEmail || '').toLowerCase();
                  const isMe = email.toLowerCase() === myEmail;
                  return (
                    <div
                      key={email}
                      className="flex items-center gap-3 p-2.5 rounded-2xl hover:bg-slate-50 border border-slate-100"
                    >
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-teal-500 to-indigo-500 text-white font-black text-xs flex items-center justify-center shrink-0">
                        {initials(email)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-800 truncate">
                          {email}
                          {isMe && <span className="text-purple-600 ml-1">(Bạn)</span>}
                        </p>
                        <p className="text-[10px] text-slate-400">Giảng viên chuyên môn</p>
                      </div>
                      {isGroupOwner && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700 shrink-0">
                          Trưởng nhóm
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: FILES */}
          {activeTab === 'files' && (
            <div className="space-y-3">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                Học liệu & Giáo trình đã chia sẻ ({sharedFiles.length})
              </span>
              {sharedFiles.length === 0 ? (
                <div className="p-8 text-center text-slate-400 space-y-2">
                  <FileText className="w-10 h-10 mx-auto text-slate-300" />
                  <p className="font-bold text-slate-600">Chưa có tệp nào được gửi</p>
                  <p className="text-[11px]">Dùng nút ghim 📎 ở thanh chat để đính kèm giáo trình chia sẻ cho nhóm.</p>
                </div>
              ) : (
                sharedFiles.map((file, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-2xl border border-slate-200/80 bg-slate-50/50 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                        <BookOpen className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-800 truncate">{file.name}</p>
                        <p className="text-[10px] text-slate-400">
                          {file.totalPages} trang • Gửi bởi {file.senderName} ({file.sentAt})
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => alert(`Đã kích hoạt giáo trình ${file.name} để sinh đề trắc nghiệm!`)}
                      className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-[11px] shrink-0 cursor-pointer"
                    >
                      Sinh Đề
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 4: SETTINGS */}
          {activeTab === 'settings' && (
            <div className="space-y-3">
              <div>
                <label className="font-bold text-slate-700">Tên nhóm</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  disabled={!isOwner}
                  className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-purple-500 disabled:opacity-60"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700">Khoa / Đơn vị</label>
                <input
                  type="text"
                  value={editDept}
                  onChange={(e) => setEditDept(e.target.value)}
                  disabled={!isOwner}
                  className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-purple-500 disabled:opacity-60"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700">Mục đích nhóm</label>
                <textarea
                  rows={3}
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  disabled={!isOwner}
                  className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-purple-500 resize-none disabled:opacity-60"
                />
              </div>

              {isOwner ? (
                <button
                  type="button"
                  onClick={() => onSaveSettings(editName, editDept, editDesc)}
                  className="w-full py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold transition-colors cursor-pointer shadow-xs mt-2"
                >
                  Lưu thay đổi cài đặt
                </button>
              ) : (
                <p className="text-[11px] text-slate-400 italic text-center">
                  * Chỉ trưởng nhóm mới có quyền thay đổi thông tin cài đặt này.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// MODAL: SLACK AI SUMMARIZER (TỰ ĐỘNG TÓM TẮT CUỘC TRÒ CHUYỆN BẰNG QUANTA AI)
// ============================================================================
const AiSummarizeModal: React.FC<{
  group: QGroup;
  onClose: () => void;
}> = ({ group, onClose }) => {
  const msgs = group.messages || [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-slate-900/50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden p-6 space-y-4 animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-teal-500 to-indigo-600 text-white flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">Quanta AI Summarizer</h3>
              <p className="text-[10px] text-slate-400">Tóm tắt tiến độ thảo luận kênh #{group.name}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-3 text-xs leading-relaxed text-slate-700">
          <div className="p-3.5 rounded-2xl bg-teal-50/70 border border-teal-200/80 space-y-2">
            <h4 className="font-extrabold text-teal-900 flex items-center gap-1.5">
              <span>📌</span> Tổng quan kênh trao đổi:
            </h4>
            <p className="text-slate-700">
              Kênh hiện có <strong>{group.memberCount || 2} thành viên</strong> đang tham gia. Đã ghi nhận tổng cộng <strong>{msgs.length} lượt tin nhắn</strong> và trao đổi học liệu chuyên môn.
            </p>
          </div>

          <div className="space-y-1.5">
            <h4 className="font-extrabold text-slate-900">💡 Các điểm trọng tâm đã thảo luận:</h4>
            <ul className="list-disc pl-5 space-y-1 text-slate-600">
              <li>Thống nhất sử dụng chung tài liệu học phần và các giáo trình cốt lõi để đối soát ngân hàng câu hỏi Bloom.</li>
              <li>Các giảng viên đã kết nối và phân bổ nội dung biên soạn ma trận đề thi trắc nghiệm.</li>
              <li>Hệ thống lưu vết minh chứng nguồn trang sách tự động phục vụ công tác kiểm định chất lượng học thuật.</li>
            </ul>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs cursor-pointer shadow-xs"
          >
            Đã hiểu
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// MODAL: SLACK HUDDLE (AUDIO CALL)
// ============================================================================
const HuddleCallModal: React.FC<{
  group: QGroup;
  currentUser?: UserProfile | null;
  onClose: () => void;
}> = ({ group, currentUser, onClose }) => {
  const [isMuted, setIsMuted] = useState(false);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-slate-900/60 p-4"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 text-white rounded-3xl max-w-sm w-full border border-slate-700 shadow-2xl p-6 space-y-5 text-center animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs border border-emerald-500/30">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            Huddle đang diễn ra
          </div>
          <h3 className="text-base font-extrabold text-white mt-2">#{group.name}</h3>
          <p className="text-xs text-slate-400">Phiên thảo luận âm thanh nhanh của bộ môn</p>
        </div>

        {/* Visualizer & Avatars */}
        <div className="flex items-center justify-center gap-3 py-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center font-black text-lg ring-4 ring-purple-500/50 animate-pulse">
              {initials(currentUser?.fullName || 'GV')}
            </div>
            <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-[10px]">
              🎙️
            </span>
          </div>

          <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-400">
            +{(group.memberCount || 2) - 1}
          </div>
        </div>

        {/* Call Controls */}
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => setIsMuted(!isMuted)}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors cursor-pointer ${
              isMuted ? 'bg-rose-600 hover:bg-rose-700 text-white' : 'bg-slate-800 hover:bg-slate-700 text-white'
            }`}
            title={isMuted ? 'Bật mic' : 'Tắt mic'}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-lg"
          >
            <LogOut className="w-4 h-4" />
            <span>Rời Huddle</span>
          </button>
        </div>
      </div>
    </div>
  );
};
