/**
 * QGroupScreen – Complete professional rewrite
 * Luồng: FB Messenger style (đoạn chat, kết bạn, nhóm, lời mời)
 * Fix: sorting, context menu phân biệt group/DM, friend request persist backend,
 *      delete không resurrect, header group không mở profile, substring crash
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

// ─── Blacklist helpers (per-user) ───────────────────────────────────────────
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

// ─── Dedup helpers ──────────────────────────────────────────────────────────
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
export const QGroupScreen: React.FC<QGroupScreenProps> = ({
  onShowToast,
  currentUser,
}) => {
  const myEmail = useMemo(
    () => (currentUser?.email || '').trim().toLowerCase(),
    [currentUser?.email]
  );
  const myName = currentUser?.fullName || 'Giảng viên';

  // ── State ────────────────────────────────────────────────────────────────
  const [qgroups, setQgroups] = useState<QGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [filterTab, setFilterTab] = useState<
    'all' | 'unread' | 'groups' | 'friends' | 'invitations'
  >('all');

  // Lời mời tham gia nhóm (backend)
  const [groupInvitations, setGroupInvitations] = useState<QGroupInvitation[]>([]);
  // Lời mời kết bạn (backend)
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);

  // Context menu
  const [menuGroupId, setMenuGroupId] = useState<string | null>(null);

  // Modals
  const [isAddFriendOpen, setIsAddFriendOpen] = useState(false);
  const [friendEmailInput, setFriendEmailInput] = useState('');
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDept, setNewGroupDept] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [isGroupMembersOpen, setIsGroupMembersOpen] = useState(false);
  const [membersTargetGroup, setMembersTargetGroup] = useState<QGroup | null>(null);
  const [inviteEmailInput, setInviteEmailInput] = useState('');

  // Public profile modal
  const [profileEmail, setProfileEmail] = useState<string | null>(null);
  const [profileName, setProfileName] = useState<string | undefined>(undefined);

  // Refs
  const chatEndRef = useRef<HTMLDivElement>(null);
  const prevMsgCount = useRef<Record<string, number>>({});

  // ── Audio beep ──────────────────────────────────────────────────────────
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

  // ── Backend sync ─────────────────────────────────────────────────────────
  const syncGroupsToBackend = useCallback(async (groups: QGroup[]) => {
    try {
      await apiClient.fetch(`${API_BASE}/documents/qgroups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groups }),
      });
    } catch {}
  }, []);

  /**
   * Apply blacklist & set state. Does NOT call syncGroupsToBackend
   * (caller decides when to sync).
   */
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

  /**
   * Fetch groups from backend.
   * KEY FIX: preserve local updatedAt if newer than remote.
   */
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

      // Merge with local to pick up groups created offline
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

      // Deduplicate, clean messages, preserve local updatedAt if newer
      const seen = new Set<string>();
      const deduped: QGroup[] = [];
      for (const g of merged) {
        const key = (g.code || g.id || '').trim();
        if (!key || bl.has(key)) continue;
        if (seen.has(key)) continue;
        seen.add(key);

        const cleanMsgs = dedupMessages(g.messages || []);

        // Preserve local updatedAt if it's newer (prevents sorting regression)
        const localGroup = qgroups.find(
          (lg) => lg.id === g.id || lg.code === g.code
        );
        const localTs = localGroup?.updatedAt ?? 0;
        const remoteTs = g.updatedAt ?? 0;
        const bestTs = Math.max(Number(localTs), Number(remoteTs));

        deduped.push({ ...g, messages: cleanMsgs, updatedAt: bestTs || Date.now() });
      }

      // Notify incoming messages
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
  }, [myEmail, applyGroups, playBeep, onShowToast]);

  // Initial load + polling 2s
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

  // Auto-select first group
  useEffect(() => {
    if (!selectedGroupId && qgroups.length > 0) {
      setSelectedGroupId(qgroups[0].id);
    }
  }, [qgroups, selectedGroupId]);

  // Scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedGroupId]);

  // Close context menu on outside click
  useEffect(() => {
    const handler = () => setMenuGroupId(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  // Mark messages as read when group opens
  useEffect(() => {
    if (!selectedGroupId || !myEmail) return;
    setQgroups((prev) =>
      prev.map((g) => {
        if (g.id !== selectedGroupId) return g;
        let changed = false;
        const msgs = (g.messages || []).map((m) => {
          if (
            m.senderEmail?.toLowerCase() !== myEmail &&
            !(m.readBy || []).includes(myEmail)
          ) {
            changed = true;
            return { ...m, readBy: [...(m.readBy || []), myEmail] };
          }
          return m;
        });
        return changed ? { ...g, messages: msgs } : g;
      })
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGroupId, myEmail]);

  // ── Sorted & filtered list ────────────────────────────────────────────────
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
            !(last.readBy || []).includes(myEmail)
          );
        }
        return true;
      })
      .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
  }, [qgroups, searchQuery, filterTab, myEmail]);

  const activeGroup = useMemo(
    () => qgroups.find((g) => g.id === selectedGroupId) ?? null,
    [qgroups, selectedGroupId]
  );

  // ── Invitation counts ──────────────────────────────────────────────────────
  const totalInvitations = friendRequests.length + groupInvitations.length;

  // ── Send message ──────────────────────────────────────────────────────────
  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!chatInput.trim() || !activeGroup) return;

    const now = Date.now();
    const newMsg: QGroupMessage = {
      id: `msg-${now}`,
      senderEmail: myEmail,
      senderName: myName,
      senderTitle: currentUser?.academicTitle || 'GV',
      avatarColor: 'bg-purple-600',
      text: chatInput.trim(),
      timestamp: new Date().toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      readBy: [myEmail],
    };

    // Update state immediately (sorting fix: set updatedAt = now)
    const updated = qgroups.map((g) =>
      g.id === activeGroup.id
        ? { ...g, updatedAt: now, messages: [...(g.messages || []), newMsg] }
        : g
    );
    applyGroups(updated);
    setChatInput('');
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 60);

    // Persist to backend
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

  // ── Delete chat ───────────────────────────────────────────────────────────
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

  // ── Leave group ───────────────────────────────────────────────────────────
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

  // ── Mute toggle ────────────────────────────────────────────────────────────
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

  // ── Friend request (backend persist) ──────────────────────────────────────
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
        onShowToast(
          'success',
          'Đã gửi lời mời kết bạn',
          `Lời mời đã gửi tới: ${email}`
        );
        setFriendEmailInput('');
        setIsAddFriendOpen(false);
      } else {
        onShowToast('error', 'Lỗi', 'Không thể gửi lời mời. Thử lại sau.');
      }
    } catch {
      onShowToast('error', 'Lỗi kết nối', 'Không thể liên hệ máy chủ.');
    }
  };

  const handleAcceptFriendRequest = async (req: FriendRequest) => {
    try {
      const res = await apiClient.fetch(
        `${API_BASE}/documents/friend-requests/${req.id}/respond`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'accept',
            userEmail: myEmail,
            userName: myName,
          }),
        }
      );
      if (res.ok) {
        setFriendRequests((prev) => prev.filter((r) => r.id !== req.id));
        await fetchQGroups();
        onShowToast(
          'success',
          'Đã kết bạn thành công',
          `Bắt đầu trò chuyện với ${req.senderName || req.senderEmail}`
        );
      }
    } catch {
      onShowToast('error', 'Lỗi', 'Không thể chấp nhận lời mời.');
    }
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

  // ── Group invitation ───────────────────────────────────────────────────────
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
    } catch {
      onShowToast('error', 'Lỗi', 'Không thể tham gia nhóm.');
    }
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
      onShowToast('info', 'Đã từ chối', `Lời mời tham gia ${inv.groupName}`);
    } catch {}
  };

  // ── Invite to group ────────────────────────────────────────────────────────
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
      onShowToast('success', 'Đã gửi lời mời', `Lời mời tham gia nhóm đã gửi tới ${email}`);
      setInviteEmailInput('');
    } catch {
      onShowToast('error', 'Lỗi', 'Không thể gửi lời mời.');
    }
  };

  // ── Create group ───────────────────────────────────────────────────────────
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
        newGroupDesc.trim() || 'Không gian thảo luận chuyên môn & học thuật.',
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

  // ── Join by code ───────────────────────────────────────────────────────────
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
      onShowToast('info', 'Bạn đã trong nhóm này rồi', found.name);
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
      onClick={() => setMenuGroupId(null)}
    >
      {/* ====================================================================
          LEFT SIDEBAR: Danh sách cuộc trò chuyện
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
                title="Thêm bạn"
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
              placeholder="Tìm kiếm..."
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

        {/* Body: Invitations view OR Conversation list */}
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
                <p className="text-[11px]">Bấm + để tạo nhóm hoặc thêm bạn mới.</p>
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
                  onViewMembers={() => {
                    setMembersTargetGroup(group);
                    setIsGroupMembersOpen(true);
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
          RIGHT CHAT PANEL
      ==================================================================== */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-white">
        {activeGroup ? (
          <>
            {/* Chat Header */}
            <ChatHeader
              group={activeGroup}
              myEmail={myEmail}
              onViewProfile={() => {
                // Chỉ mở profile cho DM, không mở cho group
                if (activeGroup.isDirect) {
                  setProfileEmail(
                    activeGroup.directPartnerEmail || activeGroup.ownerEmail || null
                  );
                  setProfileName(activeGroup.directPartnerName || activeGroup.name);
                }
              }}
              onOpenSettings={() => {
                setMembersTargetGroup(activeGroup);
                setIsGroupMembersOpen(true);
              }}
              onCopyCode={() => {
                navigator.clipboard.writeText(activeGroup.code);
                onShowToast('info', 'Đã sao chép mã phòng', activeGroup.code);
              }}
            />

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-[#f8fafc]">
              {/* Welcome card */}
              <div className="p-4 rounded-3xl bg-white border border-slate-200/90 text-center space-y-1.5 max-w-sm mx-auto shadow-xs">
                <div className="w-11 h-11 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-black mx-auto text-sm">
                  {initials(activeGroup.name)}
                </div>
                <h4 className="text-xs font-bold text-slate-900">{activeGroup.name}</h4>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  {activeGroup.description ||
                    'Không gian thảo luận chuyên môn & trao đổi học liệu.'}
                </p>
              </div>

              {/* Message list */}
              {(activeGroup.messages || []).map((msg) => {
                const isMe = msg.senderEmail?.toLowerCase() === myEmail;
                if (msg.isSystem) {
                  return (
                    <div key={msg.id} className="flex justify-center my-1">
                      <span className="px-3 py-1 rounded-full bg-slate-200/80 text-slate-600 text-[11px] font-medium flex items-center gap-1.5 border border-slate-300/50">
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
                    className={`flex gap-2.5 max-w-[80%] ${isMe ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
                  >
                    {/* Avatar */}
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
                    <div className={`space-y-1 ${isMe ? 'items-end text-right' : ''}`}>
                      {/* Sender name + time */}
                      {!isMe && (
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                          <span className="font-bold text-slate-700">{msg.senderName}</span>
                          <span>• {msg.timestamp}</span>
                        </div>
                      )}
                      {/* Bubble */}
                      {msg.text && (
                        <div
                          className={`px-3 py-2 rounded-2xl text-xs leading-relaxed text-left ${
                            isMe
                              ? 'bg-purple-600 text-white rounded-br-sm shadow-xs font-medium'
                              : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm shadow-xs'
                          }`}
                        >
                          {msg.text}
                        </div>
                      )}
                      {/* Attachment card */}
                      {msg.attachment && (
                        <div className="p-2.5 rounded-xl bg-teal-50 border border-teal-200/80 text-left space-y-1 mt-1">
                          <div className="flex items-center gap-1.5">
                            <div className="w-6 h-6 rounded bg-teal-100 flex items-center justify-center">
                              <Hash className="w-3 h-3 text-teal-700" />
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-teal-800 truncate max-w-[180px]">
                                {msg.attachment.name}
                              </p>
                              <p className="text-[9px] text-teal-600">
                                {msg.attachment.totalPages} trang • {msg.attachment.size}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                      {isMe && (
                        <div className="text-[9px] text-slate-400 text-right">{msg.timestamp}</div>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>

            {/* Input bar */}
            <div className="p-3 sm:p-4 border-t border-slate-200 bg-white">
              <form onSubmit={handleSend} className="flex items-center gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder={
                    activeGroup.isDirect
                      ? `Nhắn tin tới ${activeGroup.directPartnerName || activeGroup.name}...`
                      : `Nhắn tin trong ${activeGroup.name}... (Enter để gửi)`
                  }
                  className="flex-1 px-4 py-2.5 text-xs bg-slate-100 hover:bg-slate-200/60 focus:bg-white border border-transparent focus:border-purple-400 rounded-full text-slate-800 placeholder-slate-400 outline-none transition-all"
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim()}
                  className="w-9 h-9 rounded-full bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white flex items-center justify-center transition-colors shadow-xs shrink-0 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
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
          MODALS
      ==================================================================== */}
      {/* Profile */}
      <PublicProfileModal
        isOpen={Boolean(profileEmail)}
        userEmail={profileEmail}
        userName={profileName}
        onClose={() => {
          setProfileEmail(null);
          setProfileName(undefined);
        }}
        currentUser={currentUser}
        onSendFriendRequest={(email, name) => {
          setFriendEmailInput(email || '');
          void (async () => {
            const req: FriendRequest = {
              id: `fr-${Date.now()}`,
              senderEmail: myEmail,
              senderName: myName,
              senderTitle: currentUser?.academicTitle || 'ThS.',
              targetEmail: (email || '').toLowerCase(),
              requestedAt: new Date().toISOString(),
              status: 'pending',
            };
            try {
              await apiClient.fetch(`${API_BASE}/documents/friend-requests`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(req),
              });
              onShowToast('success', 'Đã gửi lời mời kết bạn', `Gửi tới: ${email}`);
            } catch {
              onShowToast('error', 'Lỗi', 'Không thể gửi lời mời.');
            }
            void name; // suppress unused warning
          })();
        }}
      />

      {/* Add Friend */}
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
              placeholder="VD: gv@quizgen.ai..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-purple-500"
              autoFocus
            />
          </div>
          <div className="flex items-center justify-end gap-2">
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

      {/* Create Group */}
      {isCreateGroupOpen && (
        <Modal onClose={() => setIsCreateGroupOpen(false)} title="Tạo Hội Nhóm Mới" icon={<Users className="w-4 h-4 text-purple-600" />}>
          <div className="space-y-3 text-xs">
            {[
              { label: 'Tên nhóm *', value: newGroupName, set: setNewGroupName, placeholder: 'VD: Bộ Môn An Toàn Mạng' },
              { label: 'Khoa / Đơn vị', value: newGroupDept, set: setNewGroupDept, placeholder: 'VD: Khoa Công nghệ Thông tin' },
            ].map(({ label, value, set, placeholder }) => (
              <div key={label}>
                <label className="font-bold text-slate-700">{label}</label>
                <input
                  type="text"
                  value={value}
                  onChange={(e) => set(e.target.value)}
                  placeholder={placeholder}
                  className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-purple-500"
                />
              </div>
            ))}
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
          <div className="flex items-center gap-2">
            <input
              id="join-code"
              type="text"
              placeholder="Nhập mã nhóm để tham gia..."
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
              className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
            >
              Nhập
            </button>
          </div>
          <div className="flex items-center justify-end gap-2">
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

      {/* Group Members / Settings */}
      {isGroupMembersOpen && membersTargetGroup && (
        <GroupMembersModal
          group={membersTargetGroup}
          myEmail={myEmail}
          inviteEmail={inviteEmailInput}
          onInviteEmailChange={setInviteEmailInput}
          onInvite={() => void handleInviteToGroup(membersTargetGroup)}
          onClose={() => {
            setIsGroupMembersOpen(false);
            setMembersTargetGroup(null);
          }}
        />
      )}
    </div>
  );
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/** Reusable modal wrapper */
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
  onViewMembers: () => void;
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
  onViewMembers,
  onMute,
  onDelete,
  onLeave,
  onCopyCode,
}) => {
  const msgs = group.messages || [];
  const lastMsg = msgs.length > 0 ? msgs[msgs.length - 1] : null;
  const isUnread =
    lastMsg &&
    !lastMsg.isSystem &&
    lastMsg.senderEmail?.toLowerCase() !== myEmail &&
    !(lastMsg.readBy || []).includes(myEmail);

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
      {/* Avatar */}
      <div className="relative shrink-0">
        <div
          className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-sm text-white shadow-xs ${
            group.isDirect
              ? 'bg-gradient-to-tr from-indigo-500 to-blue-600'
              : 'bg-gradient-to-tr from-purple-600 to-indigo-600'
          }`}
        >
          {initials(group.name)}
        </div>
        <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-white" />
      </div>

      {/* Info */}
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

      {/* 3-dot menu button */}
      <button
        type="button"
        onClick={onMenuToggle}
        className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {/* Context menu */}
      {isMenuOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute right-8 top-10 z-40 w-52 bg-white border border-slate-200 rounded-2xl shadow-xl py-1.5 text-xs"
        >
          {isGroup ? (
            // === GROUP MENU ===
            <>
              <MenuBtn icon={<Users className="w-3.5 h-3.5 text-purple-600" />} label="Xem thành viên" onClick={onViewMembers} />
              <MenuBtn icon={<UserPlus className="w-3.5 h-3.5 text-indigo-600" />} label="Mời thêm thành viên" onClick={onViewMembers} />
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
            // === DIRECT MESSAGE MENU ===
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

// ── ChatHeader ────────────────────────────────────────────────────────────────
const ChatHeader: React.FC<{
  group: QGroup;
  myEmail: string;
  onViewProfile: () => void;
  onOpenSettings: () => void;
  onCopyCode: () => void;
}> = ({ group, onViewProfile, onOpenSettings, onCopyCode }) => {
  const isGroup = !group.isDirect;
  return (
    <div className="p-3.5 sm:px-6 border-b border-slate-200 flex items-center justify-between gap-3 bg-white shadow-xs z-10 shrink-0">
      <div className="flex items-center gap-3 min-w-0">
        {/* Avatar – click to profile only for DM */}
        <div
          onClick={group.isDirect ? onViewProfile : undefined}
          className={`w-10 h-10 rounded-full text-white font-black text-xs flex items-center justify-center shadow-xs ${
            group.isDirect
              ? 'bg-gradient-to-tr from-indigo-500 to-blue-600 cursor-pointer hover:opacity-90'
              : 'bg-gradient-to-tr from-purple-600 to-indigo-600'
          }`}
        >
          {initials(group.name)}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3
              onClick={group.isDirect ? onViewProfile : undefined}
              className={`text-sm font-extrabold text-slate-900 truncate ${group.isDirect ? 'cursor-pointer hover:underline' : ''}`}
            >
              {group.name}
            </h3>
            <button
              type="button"
              onClick={onCopyCode}
              className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-purple-100 text-[10px] font-mono font-bold text-slate-700 flex items-center gap-1 transition-colors shrink-0"
              title="Sao chép mã phòng"
            >
              {group.code}
              <Copy className="w-2.5 h-2.5" />
            </button>
          </div>
          <p className="text-[11px] text-slate-400">
            {group.isDirect
              ? 'Đang hoạt động'
              : `${group.memberCount ?? (group.members || []).length} thành viên${group.department ? ' • ' + group.department : ''}`}
          </p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-1 shrink-0">
        {group.isDirect ? (
          <button
            type="button"
            onClick={onViewProfile}
            className="p-2 rounded-xl text-slate-500 hover:text-purple-700 hover:bg-slate-100 transition-colors"
            title="Xem trang cá nhân"
          >
            <User className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={onOpenSettings}
            className="p-2 rounded-xl text-slate-500 hover:text-purple-700 hover:bg-slate-100 transition-colors"
            title="Cài đặt & Quản lý nhóm"
          >
            <Settings className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

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

      {/* Friend requests */}
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

      {/* Group invitations */}
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
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 text-white font-black text-xs flex items-center justify-center shrink-0">
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

// ── GroupMembersModal ────────────────────────────────────────────────────────
const GroupMembersModal: React.FC<{
  group: QGroup;
  myEmail: string;
  inviteEmail: string;
  onInviteEmailChange: (v: string) => void;
  onInvite: () => void;
  onClose: () => void;
}> = ({ group, myEmail, inviteEmail, onInviteEmailChange, onInvite, onClose }) => {
  const isOwner = (group.ownerEmail || '').toLowerCase() === myEmail;
  const members = group.members || [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-slate-900/50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">{group.name}</h3>
            <p className="text-[11px] text-purple-600 font-mono">{group.code}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Invite */}
        <div className="p-4 border-b border-slate-100 space-y-2">
          <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
            Mời thêm thành viên
          </label>
          <div className="flex items-center gap-2">
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => onInviteEmailChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onInvite()}
              placeholder="Nhập email thành viên mới..."
              className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-purple-500"
            />
            <button
              type="button"
              onClick={onInvite}
              disabled={!inviteEmail.trim()}
              className="px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white font-bold text-xs cursor-pointer"
            >
              Mời
            </button>
          </div>
        </div>

        {/* Members list */}
        <div className="p-4 max-h-72 overflow-y-auto space-y-2">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
            Thành viên ({members.length})
          </span>
          {members.map((email) => {
            const isGroupOwner = email.toLowerCase() === (group.ownerEmail || '').toLowerCase();
            const isMe = email.toLowerCase() === myEmail;
            return (
              <div
                key={email}
                className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50"
              >
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-teal-500 to-indigo-500 text-white font-black text-xs flex items-center justify-center shrink-0">
                  {initials(email)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-800 truncate">
                    {email}
                    {isMe && <span className="text-purple-600 ml-1">(Bạn)</span>}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate">{email}</p>
                </div>
                {isGroupOwner && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700 shrink-0">
                    Trưởng nhóm
                  </span>
                )}
                {isOwner && !isGroupOwner && (
                  <button
                    type="button"
                    className="px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 text-[10px] font-bold cursor-pointer"
                    onClick={() => alert(`Kick ${email} - Tính năng sẽ ra mắt sớm`)}
                  >
                    Kick
                  </button>
                )}
              </div>
            );
          })}

          {/* Pending approval */}
          {(group.pendingRequests || []).length > 0 && (
            <>
              <div className="border-t border-slate-100 my-2" />
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                Chờ duyệt ({group.pendingRequests!.length})
              </span>
              {group.pendingRequests!.map((pr) => (
                <div key={pr.id} className="flex items-center gap-3 p-2 rounded-xl bg-amber-50">
                  <div className="w-9 h-9 rounded-full bg-amber-200 text-amber-800 font-black text-xs flex items-center justify-center shrink-0">
                    {initials(pr.name || pr.email)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">{pr.name || pr.email}</p>
                    <p className="text-[10px] text-slate-400">{pr.requestedAt}</p>
                  </div>
                  {isOwner && (
                    <div className="flex gap-1">
                      <button
                        type="button"
                        className="p-1.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-700 cursor-pointer"
                        title="Duyệt"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        className="p-1.5 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-600 cursor-pointer"
                        title="Từ chối"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
