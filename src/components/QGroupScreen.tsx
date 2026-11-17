import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Users,
  Search,
  Plus,
  Send,
  MoreVertical,
  Check,
  X,
  UserCheck,
  UserPlus,
  Shield,
  FileCheck2,
  BookOpen,
  Paperclip,
  Smile,
  Copy,
  Settings,
  Bell,
  BellOff,
  User,
  Trash2,
  FolderGit2,
  Pin,
  MessageCircle,
  Eye,
  Sparkles,
} from 'lucide-react';
import {
  QGroup,
  QGroupMessage,
  FriendRequest,
  ScreenId,
  UserProfile,
  UserSubscriptionInfo,
  TextbookFile,
} from '../types';
import apiClient, { API_BASE } from '../services/apiClient';
import { PublicProfileModal } from './PublicProfileModal';

interface QGroupScreenProps {
  onNavigate: (screen: ScreenId) => void;
  onShowToast: (type: 'success' | 'info' | 'warning' | 'error', title: string, message: string) => void;
  currentUser?: UserProfile | null;
  subscriptionInfo?: UserSubscriptionInfo | null;
}

export const QGroupScreen: React.FC<QGroupScreenProps> = ({
  onNavigate,
  onShowToast,
  currentUser,
}) => {
  const [qgroups, setQgroups] = useState<QGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [chatInputText, setChatInputText] = useState('');
  const [activeFilterTab, setActiveFilterTab] = useState<'all' | 'unread' | 'groups' | 'friends'>('all');

  // Friend Request System
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>(() => {
    try {
      const saved = localStorage.getItem('quizgen_friend_requests');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      {
        id: 'fr-demo-1',
        senderEmail: 'hanbich1506@gmail.com',
        senderName: 'ThS. Hân Bích',
        senderTitle: 'Giảng viên',
        targetEmail: (currentUser?.email || '').toLowerCase(),
        requestedAt: 'Hôm nay, 19:30',
        status: 'pending',
      },
    ];
  });

  // Modals
  const [isAddFriendModalOpen, setIsAddFriendModalOpen] = useState(false);
  const [friendEmailInput, setFriendEmailInput] = useState('');
  const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDept, setNewGroupDept] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [newGroupPolicy, setNewGroupPolicy] = useState<'open' | 'approval_required'>('approval_required');

  // Profile Inspection Modal
  const [inspectProfileEmail, setInspectProfileEmail] = useState<string | null>(null);
  const [inspectProfileName, setInspectProfileName] = useState<string | undefined>(undefined);

  // Context Menu
  const [activeContextMenuGroupId, setActiveContextMenuGroupId] = useState<string | null>(null);
  const [isGroupSettingsModalOpen, setIsGroupSettingsModalOpen] = useState(false);
  const [isAttachMenuOpen, setIsAttachMenuOpen] = useState(false);

  const chatMessagesEndRef = useRef<HTMLDivElement>(null);
  const prevMsgCountRef = useRef<Record<string, number>>({});

  // ─── Play subtle audio beep when receiving new message ─────────────────────
  const playNotificationSound = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch {}
  }, []);

  // ─── Centralized Sync from Backend & LocalStorage ─────────────────────────
  const syncQGroupsToBackend = useCallback(async (groups: QGroup[]) => {
    try {
      await apiClient.fetch(`${API_BASE}/documents/qgroups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groups }),
      });
    } catch (err) {
      console.warn('Failed to sync qgroups to backend:', err);
    }
  }, []);

  const saveQgroups = useCallback((groups: QGroup[]) => {
    setQgroups(groups);
    try {
      localStorage.setItem('quizgen_qgroups', JSON.stringify(groups));
    } catch {}
    void syncQGroupsToBackend(groups);
  }, [syncQGroupsToBackend]);

  const saveFriendRequests = useCallback((requests: FriendRequest[]) => {
    setFriendRequests(requests);
    try {
      localStorage.setItem('quizgen_friend_requests', JSON.stringify(requests));
    } catch {}
  }, []);

  const fetchQGroups = useCallback(async () => {
    try {
      const res = await apiClient.fetch(`${API_BASE}/documents/qgroups`);
      if (res.ok) {
        const remote = await res.json();
        if (Array.isArray(remote)) {
          // Flatten & clean
          const flatten = (arr: any[]): QGroup[] => {
            const out: QGroup[] = [];
            for (const it of arr) {
              if (it && typeof it === 'object') {
                if (Array.isArray(it.groups)) out.push(...flatten(it.groups));
                else if (it.id && it.name) out.push(it as QGroup);
              }
            }
            return out;
          };

          const cleanRemote = flatten(remote);
          let merged = [...cleanRemote];

          try {
            const localSaved = localStorage.getItem('quizgen_qgroups');
            if (localSaved) {
              const localGroups = flatten(JSON.parse(localSaved));
              const remoteKeys = new Set(cleanRemote.map((g) => (g.code || g.id || '').trim()));
              const missingLocal = localGroups.filter((lg) => {
                const k = (lg.code || lg.id || '').trim();
                return k && !remoteKeys.has(k);
              });
              if (missingLocal.length > 0) {
                merged = [...cleanRemote, ...missingLocal];
                void syncQGroupsToBackend(merged);
              }
            }
          } catch {}

          // Deduplicate
          const seen = new Set<string>();
          const deduped: QGroup[] = [];
          for (const g of merged) {
            const k = (g.code || g.id || '').trim();
            if (k && !seen.has(k)) {
              seen.add(k);
              // Clean messages
              const seenMsgs = new Set<string>();
              const cleanMsgs: QGroupMessage[] = [];
              for (const m of (g.messages || [])) {
                const mid = String(m?.id || '').trim();
                if (mid && !seenMsgs.has(mid)) {
                  seenMsgs.add(mid);
                  cleanMsgs.push(m);
                } else if (!mid) {
                  cleanMsgs.push(m);
                }
              }
              deduped.push({ ...g, messages: cleanMsgs });
            }
          }

          // Check if new incoming message from someone else
          deduped.forEach((g) => {
            const msgs = g.messages || [];
            const prevCount = prevMsgCountRef.current[g.id] ?? msgs.length;
            if (msgs.length > prevCount) {
              const last = msgs[msgs.length - 1];
              const myEmail = (currentUser?.email || '').toLowerCase();
              if (last && last.senderEmail?.toLowerCase() !== myEmail) {
                playNotificationSound();
                onShowToast('info', `Tin nhắn mới từ ${last.senderName}`, last.text || '[Tệp đính kèm]');
              }
            }
            prevMsgCountRef.current[g.id] = msgs.length;
          });

          setQgroups(deduped);
          try {
            localStorage.setItem('quizgen_qgroups', JSON.stringify(deduped));
          } catch {}
        }
      }
    } catch {}
  }, [currentUser?.email, onShowToast, playNotificationSound, syncQGroupsToBackend]);

  // Initial load + Polling 1s
  useEffect(() => {
    void fetchQGroups();
    const interval = setInterval(() => {
      void fetchQGroups();
    }, 1000);
    return () => clearInterval(interval);
  }, [fetchQGroups]);

  // Default active group
  useEffect(() => {
    if (!selectedGroupId && qgroups.length > 0) {
      setSelectedGroupId(qgroups[0].id);
    }
  }, [qgroups, selectedGroupId]);

  // Scroll to bottom on select or new message
  useEffect(() => {
    chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedGroupId]);

  // ─── Filter & Sort Conversations ──────────────────────────────────────────
  const sortedAndFilteredGroups = useMemo(() => {
    const myEmail = (currentUser?.email || '').toLowerCase();

    return [...qgroups]
      .filter((group) => {
        // Search filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = (group.name || '').toLowerCase().includes(q);
          const matchDept = (group.department || '').toLowerCase().includes(q);
          const matchCode = (group.code || '').toLowerCase().includes(q);
          if (!matchName && !matchDept && !matchCode) return false;
        }

        // Tab filter
        if (activeFilterTab === 'groups') return !group.isDirect;
        if (activeFilterTab === 'friends') return Boolean(group.isDirect);
        if (activeFilterTab === 'unread') {
          // Check if latest message is not read by current user
          const msgs = group.messages || [];
          if (msgs.length === 0) return false;
          const last = msgs[msgs.length - 1];
          return last.senderEmail?.toLowerCase() !== myEmail && !(last.readBy || []).includes(myEmail);
        }

        return true;
      })
      .sort((a, b) => {
        // Sort by timestamp of latest message desc
        const getLatestTime = (g: QGroup) => {
          if (!g.messages || g.messages.length === 0) return 0;
          const last = g.messages[g.messages.length - 1];
          // Try parse timestamp or fallback to array index
          return g.updatedAt || Date.now();
        };
        return getLatestTime(b) - getLatestTime(a);
      });
  }, [qgroups, searchQuery, activeFilterTab, currentUser?.email]);

  const activeGroup = useMemo(() => {
    return qgroups.find((g) => g.id === selectedGroupId) || null;
  }, [qgroups, selectedGroupId]);

  // Mark active group messages as read
  useEffect(() => {
    if (!activeGroup || !currentUser?.email) return;
    const myEmail = currentUser.email.toLowerCase();
    let hasUnread = false;

    const msgs = activeGroup.messages || [];
    const updatedMsgs = msgs.map((m) => {
      if (m.senderEmail?.toLowerCase() !== myEmail && !(m.readBy || []).includes(myEmail)) {
        hasUnread = true;
        return {
          ...m,
          readBy: [...(m.readBy || []), myEmail],
        };
      }
      return m;
    });

    if (hasUnread) {
      const updated = qgroups.map((g) =>
        g.id === activeGroup.id ? { ...g, messages: updatedMsgs } : g
      );
      saveQgroups(updated);
    }
  }, [activeGroup?.id, currentUser?.email]);

  // ─── Actions: Send Message ────────────────────────────────────────────────
  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInputText.trim() || !activeGroup) return;

    const myEmail = (currentUser?.email || 'my-account@quizgen.ai').toLowerCase();
    const myName = currentUser?.fullName || 'TS. Anh Vũ';
    const myTitle = currentUser?.academicTitle || 'GV';

    const newMsg: QGroupMessage = {
      id: `msg-${Date.now()}`,
      senderEmail: myEmail,
      senderName: myName,
      senderTitle: myTitle,
      avatarColor: 'bg-purple-600',
      text: chatInputText.trim(),
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      readBy: [myEmail],
    };

    const updated = qgroups.map((g) => {
      if (g.id === activeGroup.id) {
        return {
          ...g,
          updatedAt: Date.now(),
          messages: [...(g.messages || []), newMsg],
        };
      }
      return g;
    });

    saveQgroups(updated);
    setChatInputText('');

    // Push to backend
    const targetGroupId = activeGroup.id || activeGroup.code;
    apiClient.fetch(`${API_BASE}/documents/qgroups/${encodeURIComponent(targetGroupId)}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newMsg),
    }).catch(() => {});

    setTimeout(() => {
      chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 80);
  };

  // ─── Actions: Friend Request Flow ─────────────────────────────────────────
  const handleSendFriendRequest = (targetEmailInput?: string, targetNameInput?: string) => {
    const email = (targetEmailInput || friendEmailInput).trim().toLowerCase();
    if (!email) return;

    const myEmail = (currentUser?.email || '').toLowerCase();
    if (email === myEmail) {
      onShowToast('warning', 'Không hợp lệ', 'Bạn không thể gửi lời mời kết bạn cho chính mình.');
      return;
    }

    const newReq: FriendRequest = {
      id: `fr-${Date.now()}`,
      senderEmail: myEmail,
      senderName: currentUser?.fullName || 'Giảng viên',
      senderTitle: currentUser?.academicTitle || 'ThS.',
      targetEmail: email,
      requestedAt: 'Vừa xong',
      status: 'pending',
    };

    saveFriendRequests([...friendRequests, newReq]);
    setFriendEmailInput('');
    setIsAddFriendModalOpen(false);
    onShowToast('success', 'Đã gửi lời mời kết bạn', `Đã gửi lời mời kết nối tới: ${email}`);
  };

  const handleAcceptFriendRequest = (req: FriendRequest) => {
    // 1. Mark request accepted
    const updatedReqs = friendRequests.map((r) =>
      r.id === req.id ? { ...r, status: 'accepted' as const } : r
    );
    saveFriendRequests(updatedReqs);

    // 2. Automatically create 1-on-1 Direct Chatroom with welcome message
    const myEmail = (currentUser?.email || '').toLowerCase();
    const myName = currentUser?.fullName || 'Giảng viên';

    const newDm: QGroup = {
      id: `dm-${Date.now()}`,
      code: `DM-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
      name: req.senderName || req.senderEmail,
      department: 'Bạn bè • Tin nhắn riêng',
      description: `Cuộc trò chuyện giữa ${myName} và ${req.senderName}`,
      ownerEmail: myEmail,
      ownerName: myName,
      joinPolicy: 'open',
      memberCount: 2,
      members: [myEmail, req.senderEmail],
      pendingRequests: [],
      isDirect: true,
      directPartnerEmail: req.senderEmail,
      directPartnerName: req.senderName,
      updatedAt: Date.now(),
      messages: [
        {
          id: `msg-${Date.now()}`,
          senderEmail: 'system',
          senderName: 'Hệ Thống QuizGen AI',
          isSystem: true,
          timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
          text: `🎉 Hai bạn đã trở thành bạn bè! Hãy gửi lời chào và bắt đầu chia sẻ học liệu cùng nhau.`,
        },
      ],
    };

    const nextGroups = [newDm, ...qgroups];
    saveQgroups(nextGroups);
    setSelectedGroupId(newDm.id);
    setActiveFilterTab('friends');
    onShowToast('success', 'Đã kết bạn thành công', `Bắt đầu trò chuyện với ${req.senderName}`);
  };

  // Pending friend requests for current user
  const myPendingRequests = useMemo(() => {
    const myEmail = (currentUser?.email || '').toLowerCase();
    return friendRequests.filter((r) => r.targetEmail.toLowerCase() === myEmail && r.status === 'pending');
  }, [friendRequests, currentUser?.email]);

  return (
    <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden bg-[#f7f9fb] select-none">
      {/* =========================================================================
          LEFT SIDEBAR: CONVERSATION LIST (MESSENGER / FB STYLE)
      ========================================================================= */}
      <div className="w-full md:w-80 lg:w-96 bg-white border-r border-slate-200 flex flex-col shrink-0 h-full">
        {/* Header: Title + Action Buttons */}
        <div className="p-4 border-b border-slate-100 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <span>Đoạn chat</span>
              {myPendingRequests.length > 0 && (
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
              )}
            </h2>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setIsAddFriendModalOpen(true)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-purple-100 hover:text-purple-700 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
                title="Thêm bạn bè mới"
              >
                <UserPlus className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setIsCreateGroupModalOpen(true)}
                className="w-8 h-8 rounded-full bg-purple-600 hover:bg-purple-700 text-white flex items-center justify-center transition-colors shadow-xs cursor-pointer"
                title="Tạo nhóm trao đổi mới"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm trên Messenger..."
              className="w-full pl-9 pr-3 py-2 bg-slate-100 hover:bg-slate-200/70 focus:bg-white border border-transparent focus:border-purple-300 rounded-full text-xs text-slate-800 placeholder-slate-400 outline-none transition-all"
            />
          </div>

          {/* Filter Pills Tabs (Tất cả, Chưa đọc, Nhóm, Bạn bè) */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
            {[
              { id: 'all' as const, label: 'Tất cả' },
              { id: 'unread' as const, label: 'Chưa đọc' },
              { id: 'groups' as const, label: 'Nhóm' },
              { id: 'friends' as const, label: 'Bạn bè' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveFilterTab(tab.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  activeFilterTab === tab.id
                    ? 'bg-purple-100 text-purple-700 shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/60'
                }`}
              >
                {tab.label}
              </button>
            ))}

            {myPendingRequests.length > 0 && (
              <button
                type="button"
                onClick={() => setActiveFilterTab('friends')}
                className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-rose-50 text-rose-600 border border-rose-200 shrink-0 flex items-center gap-1 animate-pulse"
              >
                <span>{myPendingRequests.length} lời mời</span>
              </button>
            )}
          </div>
        </div>

        {/* Friend Requests Notification Banner (if any) */}
        {myPendingRequests.length > 0 && (
          <div className="p-3 bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-purple-100 space-y-2">
            <span className="text-[11px] font-extrabold text-purple-900 uppercase tracking-wider flex items-center gap-1">
              <UserPlus className="w-3.5 h-3.5 text-purple-600" />
              Lời mời kết bạn ({myPendingRequests.length})
            </span>
            {myPendingRequests.map((req) => (
              <div
                key={req.id}
                className="p-2.5 bg-white rounded-2xl border border-purple-200/80 shadow-2xs flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-slate-900 truncate">{req.senderName}</h4>
                  <p className="text-[10px] text-slate-400 font-mono truncate">{req.senderEmail}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleAcceptFriendRequest(req)}
                    className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-[11px] transition-colors"
                  >
                    Đồng ý
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {sortedAndFilteredGroups.length === 0 ? (
            <div className="p-8 text-center text-slate-400 space-y-2">
              <MessageCircle className="w-10 h-10 mx-auto text-slate-300" />
              <p className="text-xs font-bold text-slate-600">Không có đoạn chat nào</p>
              <p className="text-[11px]">Bấm dấu + để tạo nhóm hoặc kết bạn mới.</p>
            </div>
          ) : (
            sortedAndFilteredGroups.map((group) => {
              const isSelected = group.id === selectedGroupId;
              const msgs = group.messages || [];
              const lastMsg = msgs.length > 0 ? msgs[msgs.length - 1] : null;
              const myEmail = (currentUser?.email || '').toLowerCase();
              const isUnread =
                lastMsg &&
                lastMsg.senderEmail?.toLowerCase() !== myEmail &&
                !(lastMsg.readBy || []).includes(myEmail);

              return (
                <div
                  key={group.id}
                  onClick={() => {
                    setSelectedGroupId(group.id);
                    setActiveContextMenuGroupId(null);
                  }}
                  className={`relative p-3 sm:px-3.5 flex items-center gap-3 cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-purple-50/80 border-l-4 border-l-purple-600'
                      : isUnread
                      ? 'bg-slate-50/90 font-bold hover:bg-slate-100'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  {/* Circular Avatar */}
                  <div className="relative shrink-0">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-sm text-white shadow-xs ${
                        group.isDirect
                          ? 'bg-gradient-to-tr from-indigo-500 to-blue-600'
                          : 'bg-gradient-to-tr from-purple-600 to-indigo-600'
                      }`}
                    >
                      {String(group.name || 'QG').slice(0, 2).toUpperCase()}
                    </div>
                    {/* Active online green dot */}
                    <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-white" />
                  </div>

                  {/* Chat Info */}
                  <div className="flex-1 min-w-0 pr-6">
                    <div className="flex items-center justify-between gap-1">
                      <h4
                        className={`text-xs truncate ${
                          isUnread ? 'font-black text-slate-900' : 'font-bold text-slate-800'
                        }`}
                      >
                        {group.name}
                      </h4>
                      {lastMsg && (
                        <span className="text-[10px] text-slate-400 shrink-0 font-medium">
                          {lastMsg.timestamp}
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
                          <span>
                            {lastMsg.senderEmail?.toLowerCase() === myEmail ? 'Bạn: ' : ''}
                            {lastMsg.text || '[Tài liệu đính kèm]'}
                          </span>
                        ) : (
                          'Bắt đầu cuộc trò chuyện...'
                        )}
                      </p>

                      {isUnread && (
                        <span className="w-2.5 h-2.5 rounded-full bg-purple-600 shrink-0" />
                      )}
                    </div>
                  </div>

                  {/* 3 Dots Context Menu Button (Hover) */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveContextMenuGroupId(
                        activeContextMenuGroupId === group.id ? null : group.id
                      );
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>

                  {/* Dropdown Menu (FB Style) */}
                  {activeContextMenuGroupId === group.id && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute right-8 top-8 z-30 w-48 bg-white border border-slate-200 rounded-2xl shadow-xl py-1.5 animate-fade-in text-xs"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setInspectProfileEmail(group.directPartnerEmail || group.ownerEmail);
                          setInspectProfileName(group.name);
                          setActiveContextMenuGroupId(null);
                        }}
                        className="w-full px-3.5 py-2 text-left hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                      >
                        <User className="w-3.5 h-3.5 text-purple-600" />
                        <span>Xem trang cá nhân</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(group.code);
                          onShowToast('info', 'Đã sao chép mã nhóm', group.code);
                          setActiveContextMenuGroupId(null);
                        }}
                        className="w-full px-3.5 py-2 text-left hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                      >
                        <Copy className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Sao chép mã phòng</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const updated = qgroups.map((g) =>
                            g.id === group.id ? { ...g, muted: !g.muted } : g
                          );
                          saveQgroups(updated);
                          setActiveContextMenuGroupId(null);
                          onShowToast('info', 'Thông báo', group.muted ? 'Đã bật thông báo' : 'Đã tắt thông báo');
                        }}
                        className="w-full px-3.5 py-2 text-left hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                      >
                        {group.muted ? (
                          <>
                            <Bell className="w-3.5 h-3.5 text-amber-500" />
                            <span>Bật thông báo</span>
                          </>
                        ) : (
                          <>
                            <BellOff className="w-3.5 h-3.5 text-slate-400" />
                            <span>Tắt thông báo</span>
                          </>
                        )}
                      </button>

                      <div className="border-t border-slate-100 my-1" />

                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Bạn có chắc chắn muốn rời hoặc xóa đoạn chat "${group.name}"?`)) {
                            const next = qgroups.filter((g) => g.id !== group.id);
                            saveQgroups(next);
                            if (selectedGroupId === group.id) {
                              setSelectedGroupId(next[0]?.id || '');
                            }
                            onShowToast('info', 'Đã xóa đoạn chat', group.name);
                          }
                          setActiveContextMenuGroupId(null);
                        }}
                        className="w-full px-3.5 py-2 text-left hover:bg-rose-50 flex items-center gap-2 text-rose-600 font-semibold"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Xóa đoạn chat</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* =========================================================================
          RIGHT CHAT AREA: MODERN FEED WALLPAPER & ACTIVE THREAD
      ========================================================================= */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-white">
        {activeGroup ? (
          <>
            {/* Chat Top Header */}
            <div className="p-3.5 sm:px-6 border-b border-slate-200 flex items-center justify-between gap-3 bg-white shadow-2xs z-10 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  onClick={() => {
                    setInspectProfileEmail(activeGroup.directPartnerEmail || activeGroup.ownerEmail);
                    setInspectProfileName(activeGroup.name);
                  }}
                  className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 text-white font-black text-xs flex items-center justify-center cursor-pointer shadow-xs hover:opacity-90"
                  title="Nhấn để xem trang cá nhân"
                >
                  {String(activeGroup.name || 'QG').slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3
                      onClick={() => {
                        setInspectProfileEmail(activeGroup.directPartnerEmail || activeGroup.ownerEmail);
                        setInspectProfileName(activeGroup.name);
                      }}
                      className="text-sm font-extrabold text-slate-900 truncate cursor-pointer hover:underline"
                    >
                      {activeGroup.name}
                    </h3>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(activeGroup.code);
                        onShowToast('info', 'Đã sao chép mã phòng', activeGroup.code);
                      }}
                      className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-purple-100 text-[10px] font-mono font-bold text-slate-700 flex items-center gap-1 transition-colors"
                      title="Sao chép mã phòng"
                    >
                      <span>{activeGroup.code}</span>
                      <Copy className="w-2.5 h-2.5" />
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {activeGroup.isDirect ? 'Đang hoạt động' : `${activeGroup.memberCount || 2} thành viên • ${activeGroup.department}`}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setInspectProfileEmail(activeGroup.directPartnerEmail || activeGroup.ownerEmail);
                    setInspectProfileName(activeGroup.name);
                  }}
                  className="p-2 rounded-xl text-slate-500 hover:text-purple-700 hover:bg-slate-100 transition-colors"
                  title="Xem trang cá nhân"
                >
                  <User className="w-4 h-4" />
                </button>

                {!activeGroup.isDirect && (
                  <button
                    type="button"
                    onClick={() => setIsGroupSettingsModalOpen(true)}
                    className="p-2 rounded-xl text-slate-500 hover:text-purple-700 hover:bg-slate-100 transition-colors"
                    title="Cài đặt & Quản lý nhóm"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Message Stream */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-[#f8fafc]">
              {/* Welcome Card */}
              <div className="p-4 rounded-3xl bg-white border border-slate-200/90 text-center space-y-1.5 max-w-md mx-auto shadow-2xs">
                <div className="w-12 h-12 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-black mx-auto">
                  {String(activeGroup.name || 'QG').slice(0, 2).toUpperCase()}
                </div>
                <h4 className="text-xs font-bold text-slate-900">{activeGroup.name}</h4>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  {activeGroup.description || 'Không gian thảo luận chuyên môn & trao đổi học liệu học thuật.'}
                </p>
              </div>

              {/* Messages list */}
              {(activeGroup.messages || []).map((msg) => {
                const myEmail = (currentUser?.email || '').toLowerCase();
                const isMe = msg.senderEmail?.toLowerCase() === myEmail;

                if (msg.isSystem) {
                  return (
                    <div key={msg.id} className="flex justify-center my-2">
                      <span className="px-3.5 py-1 rounded-full bg-slate-200/80 text-slate-600 text-[11px] font-semibold flex items-center gap-1.5 border border-slate-300/60 shadow-2xs">
                        <Shield className="w-3 h-3 text-purple-700" />
                        <span>{msg.text}</span>
                        <span className="text-[9px] text-slate-400 font-mono ml-1">{msg.timestamp}</span>
                      </span>
                    </div>
                  );
                }

                return (
                  <div
                    key={msg.id}
                    className={`flex gap-2.5 max-w-[80%] ${isMe ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
                  >
                    {/* Tiny Avatar */}
                    <div
                      onClick={() => {
                        setInspectProfileEmail(msg.senderEmail);
                        setInspectProfileName(msg.senderName);
                      }}
                      className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 text-white text-[10px] font-black flex items-center justify-center shrink-0 cursor-pointer shadow-xs self-end mb-1"
                      title="Xem trang cá nhân người gửi"
                    >
                      {msg.senderName.slice(0, 2).toUpperCase()}
                    </div>

                    <div className={`space-y-1 ${isMe ? 'items-end text-right' : ''}`}>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                        <span className="font-bold text-slate-700">{msg.senderName}</span>
                        <span>• {msg.timestamp}</span>
                      </div>

                      {msg.text && (
                        <div
                          className={`p-3 rounded-2xl text-xs leading-relaxed text-left transition-all ${
                            isMe
                              ? 'bg-purple-600 text-white rounded-br-xs shadow-xs font-medium'
                              : 'bg-white border border-slate-200 text-slate-800 rounded-bl-xs shadow-2xs'
                          }`}
                        >
                          {msg.text}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={chatMessagesEndRef} />
            </div>

            {/* Chat Send Input Box */}
            <div className="p-3 sm:p-4 border-t border-slate-200 bg-white">
              <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                <input
                  type="text"
                  value={chatInputText}
                  onChange={(e) => setChatInputText(e.target.value)}
                  placeholder="Nhập tin nhắn..."
                  className="flex-1 px-4 py-2.5 text-xs bg-slate-100 hover:bg-slate-200/60 focus:bg-white border border-transparent focus:border-purple-400 rounded-full text-slate-800 placeholder-slate-400 outline-none transition-all"
                />

                <button
                  type="submit"
                  disabled={!chatInputText.trim()}
                  className="w-9 h-9 rounded-full bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white flex items-center justify-center transition-colors shadow-xs shrink-0 cursor-pointer"
                  title="Gửi tin nhắn"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 space-y-2">
            <FolderGit2 className="w-12 h-12 text-slate-300" />
            <p className="font-bold text-sm text-slate-700">Chưa chọn đoạn chat nào</p>
            <p className="text-xs">Chọn một người bạn hoặc nhóm từ danh sách bên trái để bắt đầu nhắn tin.</p>
          </div>
        )}
      </div>

      {/* =========================================================================
          MODALS: PUBLIC USER PROFILE, ADD FRIEND, CREATE GROUP
      ========================================================================= */}
      {/* 1. Modal Xem Trang Cá Nhân Công Khai */}
      <PublicProfileModal
        isOpen={Boolean(inspectProfileEmail)}
        userEmail={inspectProfileEmail}
        userName={inspectProfileName}
        onClose={() => {
          setInspectProfileEmail(null);
          setInspectProfileName(undefined);
        }}
        currentUser={currentUser}
        onSendFriendRequest={handleSendFriendRequest}
      />

      {/* 2. Modal Thêm Bạn Bè Mới */}
      {isAddFriendModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-slate-900/50 p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-purple-600" />
                <span>Thêm Bạn Bè Mới</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAddFriendModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Nhập email tài khoản đồng nghiệp để gửi lời mời kết bạn. Khi đối phương bấm chấp nhận, phòng chat riêng 1-1 sẽ tự động kích hoạt.
            </p>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-700">Email đồng nghiệp</label>
              <input
                type="email"
                value={friendEmailInput}
                onChange={(e) => setFriendEmailInput(e.target.value)}
                placeholder="VD: lecturer@quizgen.ai, vuha3608@ut.edu.vn..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-purple-600"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAddFriendModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => handleSendFriendRequest()}
                disabled={!friendEmailInput.trim()}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Gửi lời mời</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Modal Tạo Nhóm Mới */}
      {isCreateGroupModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-slate-900/50 p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-600" />
                <span>Tạo Hội Nhóm Mới</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsCreateGroupModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700">Tên nhóm</label>
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="VD: Bộ Môn An Toàn Mạng..."
                  className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-purple-600"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700">Khoa / Đơn vị</label>
                <input
                  type="text"
                  value={newGroupDept}
                  onChange={(e) => setNewGroupDept(e.target.value)}
                  placeholder="VD: Khoa Công nghệ Thông tin..."
                  className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-purple-600"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700">Mô tả mục đích nhóm</label>
                <textarea
                  rows={2}
                  value={newGroupDesc}
                  onChange={(e) => setNewGroupDesc(e.target.value)}
                  placeholder="Mô tả tóm tắt định hướng biên soạn đề thi..."
                  className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-purple-600 resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsCreateGroupModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={!newGroupName.trim()}
                onClick={() => {
                  const myEmail = (currentUser?.email || '').toLowerCase();
                  const myName = currentUser?.fullName || 'Giảng viên';
                  const code = `QGRP-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

                  const group: QGroup = {
                    id: `qg-${Date.now()}`,
                    code,
                    name: newGroupName.trim(),
                    department: newGroupDept.trim() || 'Khoa Chuyên Ngành',
                    description: newGroupDesc.trim() || 'Không gian thảo luận chuyên môn',
                    ownerEmail: myEmail,
                    ownerName: myName,
                    joinPolicy: newGroupPolicy,
                    memberCount: 1,
                    members: [myEmail],
                    pendingRequests: [],
                    updatedAt: Date.now(),
                    messages: [
                      {
                        id: `msg-${Date.now()}`,
                        senderEmail: 'system',
                        senderName: 'Hệ Thống QuizGen',
                        isSystem: true,
                        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
                        text: `Nhóm "${newGroupName.trim()}" đã được khởi tạo bởi ${myName}. Mã phòng: ${code}`,
                      },
                    ],
                  };

                  saveQgroups([group, ...qgroups]);
                  setSelectedGroupId(group.id);
                  setIsCreateGroupModalOpen(false);
                  setNewGroupName('');
                  setNewGroupDept('');
                  setNewGroupDesc('');
                  onShowToast('success', 'Đã tạo nhóm thành công', `Mã phòng của bạn: ${code}`);
                }}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white font-bold text-xs shadow-xs"
              >
                Tạo nhóm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
