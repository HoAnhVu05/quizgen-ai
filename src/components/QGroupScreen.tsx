/**
 * QGroupScreen – Complete Slack & Messenger Style Workspace
 * Refactored cleanly into modular sub-components and custom hooks in ./qgroup/
 */
import React, { useState, useEffect, useLayoutEffect, useMemo, useRef, useCallback } from 'react';
import { MessageCircle } from 'lucide-react';
import type { QGroup, QGroupMessage, ScreenId, UserProfile, UserSubscriptionInfo } from '../types';
import apiClient, { API_BASE } from '../services/apiClient';
import { DocumentPreviewModal } from './DocumentPreviewModal';
import { ConfirmModal } from './qgroup/QGroupConfirmModal';
import { ChannelDetailsModal } from './qgroup/ChannelDetailsModal';
import { ChannelSettingsModal } from './qgroup/ChannelSettingsModal';
import { AiSummarizeModal, HuddleCallModal } from './qgroup/HuddleAndAiModals';
import { ActiveHuddleBanner } from './qgroup/ActiveHuddleBanner';
import { FriendModal } from './qgroup/FriendModal';
import { DirectAddMemberModal } from './qgroup/DirectAddMemberModal';
import { CreateOrJoinGroupModal } from './qgroup/CreateOrJoinGroupModal';
import { ChannelSidebar } from './qgroup/ChannelSidebar';
import { ChatHeader } from './qgroup/ChatHeader';
import { PinnedMessagesBar } from './qgroup/PinnedMessagesBar';
import { ChatComposer } from './qgroup/ChatComposer';
import { MediaLightboxModal } from './qgroup/MediaLightboxModal';
import { SharedMediaDrawer } from './qgroup/SharedMediaDrawer';
import { TextbookPickerModal } from './qgroup/TextbookPickerModal';
import { ChatMessageStream } from './qgroup/ChatMessageStream';
import { TransferOwnerModal } from './qgroup/TransferOwnerModal';
import { isExcludedAdminAccount, resolveChatDisplayInfo } from './qgroup/chatUtils';
import { initials } from './qgroup/qgroupHelpers';
import { openUserProfile } from '../utils/userProfileModalHelper';
import { downloadFileSafely } from '../utils/fileDownloadHelper';
import { saveUserAvatarSync } from '../utils/avatarHelper';

import { useQGroupSync } from './qgroup/useQGroupSync';
import { useQGroupInvitations } from './qgroup/useQGroupInvitations';
import { useQGroupHuddle } from './qgroup/useQGroupHuddle';
import { useVoiceRecorder } from './qgroup/useVoiceRecorder';
import { useQGroupAttachments } from './qgroup/useQGroupAttachments';
import { useQGroupMessages } from './qgroup/useQGroupMessages';
import { useQGroupLookup, SystemUserSummary } from './qgroup/useQGroupLookup';
import { useQGroupActions } from './qgroup/useQGroupActions';
import { useQGroupManagement } from './qgroup/useQGroupManagement';
import { useQGroupAdminActions } from './qgroup/useQGroupAdminActions';

interface QGroupScreenProps {
  onNavigate: (screen: ScreenId) => void;
  onShowToast: (
    type: 'success' | 'info' | 'warning' | 'error',
    title: string,
    message: string,
    onClick?: () => void
  ) => void;
  currentUser?: UserProfile | null;
  subscriptionInfo?: UserSubscriptionInfo | null;
  onOpenMobileMenu?: () => void;
}

export const QGroupScreen: React.FC<QGroupScreenProps> = ({
  onNavigate,
  onShowToast,
  currentUser,
  subscriptionInfo,
  onOpenMobileMenu,
}) => {
  const myEmail = useMemo(() => (currentUser?.email || '').trim().toLowerCase(), [currentUser?.email]);
  const myName = currentUser?.fullName || 'Giảng viên';

  const [systemUsersList, setSystemUsersList] = useState<SystemUserSummary[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>(() => {
    try {
      const isDirectOpen = sessionStorage.getItem('quizgen_direct_open_chat') === 'true';
      return isDirectOpen ? sessionStorage.getItem('qgroup_selected_group_id') || '' : '';
    } catch {
      return '';
    }
  });
  const [showMobileChat, setShowMobileChat] = useState<boolean>(() => {
    try {
      const isDirectOpen = sessionStorage.getItem('quizgen_direct_open_chat') === 'true';
      if (isDirectOpen) {
        sessionStorage.removeItem('quizgen_direct_open_chat');
        return true;
      }
      return false;
    } catch {
      return false;
    }
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'unread' | 'groups' | 'friends' | 'invitations'>('all');
  const [menuGroupId, setMenuGroupId] = useState<string | null>(null);
  const [detailsGroup, setDetailsGroup] = useState<QGroup | null>(null);
  const [isChannelDetailsOpen, setIsChannelDetailsOpen] = useState(false);
  const [isChannelSettingsOpen, setIsChannelSettingsOpen] = useState(false);
  const [channelDetailsTab, setChannelDetailsTab] = useState<'about' | 'members'>('about');
  const [isSummarizeModalOpen, setIsSummarizeModalOpen] = useState(false);
  const [isStarred, setIsStarred] = useState(false);
  const [isSharedMediaOpen, setIsSharedMediaOpen] = useState(false);
  const [groupModalTab, setGroupModalTab] = useState<'create' | 'join'>('create');
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [isJoiningCode] = useState(false);
  const [isTextbookModalOpen, setIsTextbookModalOpen] = useState(false);
  const [previewMediaUrl, setPreviewMediaUrl] = useState<{ url: string; name: string } | null>(null);
  const [previewFile, setPreviewFile] = useState<{ url: string; name: string; size?: string; type?: string } | null>(null);
  const [isMentionOpen, setIsMentionOpen] = useState(false);
  const [mentionSearch, setMentionSearch] = useState<string | null>(null);
  const [viewportBottomOffset, setViewportBottomOffset] = useState<number>(0);

  const [hiddenGroupIds, setHiddenGroupIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(`quizgen_hidden_qgroups_${myEmail}`);
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'info';
    onConfirm: () => void;
  } | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const prevGroupIdRef = useRef<string | null>(null);
  const isUserNearBottomRef = useRef<boolean>(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync & storage hook
  const {
    qgroups,
    setQgroups,
    applyGroups,
    syncGroupsToBackend,
    fetchQGroups,
    sortedGroups,
  } = useQGroupSync({
    myEmail,
    myName,
    selectedGroupId,
    setSelectedGroupId,
    setShowMobileChat,
    hiddenGroupIds,
    filterTab,
    searchQuery,
    onShowToast,
  });

  const activeGroup = useMemo(() => qgroups.find((g) => g.id === selectedGroupId) || null, [qgroups, selectedGroupId]);
  const activeInfo = useMemo(() => (activeGroup ? resolveChatDisplayInfo(activeGroup, myEmail) : null), [activeGroup, myEmail]);

  const isCurrentUserMember = useMemo(() => {
    if (!activeGroup) return false;
    const cleanMyEmail = myEmail.toLowerCase().trim();
    const members = (activeGroup.members || []).map((m: string) => m.toLowerCase().trim());
    const ownerEmail = (activeGroup.ownerEmail || '').toLowerCase().trim();
    return members.includes(cleanMyEmail) || ownerEmail === cleanMyEmail;
  }, [activeGroup, myEmail]);

  const pinnedMessages = useMemo(() => (activeGroup?.messages || []).filter((m) => m.isPinned), [activeGroup]);

  // Invitations & friends hook
  const invitations = useQGroupInvitations({
    myEmail,
    myName,
    currentUser,
    fetchQGroups,
    setSelectedGroupId,
    setShowMobileChat,
    setFilterTab,
    onShowToast,
  });

  // Huddle hook
  const huddle = useQGroupHuddle({
    myEmail,
    qgroups,
    selectedGroupId,
    setSelectedGroupId,
    setShowMobileChat,
    chatContainerRef,
    chatEndRef,
    setFilterTab,
    onShowToast,
  });

  // Voice recording hook
  const voice = useVoiceRecorder({
    activeGroup,
    qgroups,
    applyGroups,
    myEmail,
    myName,
    currentUser,
    chatEndRef,
    onShowToast,
  });

  // Attachments hook
  const attachments = useQGroupAttachments({ subscriptionInfo, onShowToast });

  // Messages hook
  const messagesHook = useQGroupMessages({
    activeGroup,
    qgroups,
    myEmail,
    applyGroups,
    syncGroupsToBackend,
    textareaRef,
    setConfirmDialog,
    onShowToast,
  });

  // Lookup hook
  const lookup = useQGroupLookup({
    myEmail,
    qgroups,
    activeGroup,
    systemUsersList,
    sentFriendRequests: invitations.sentFriendRequests,
    friendRequests: invitations.friendRequests,
    onShowToast,
  });

  // Actions hook (Create, Join, Invite, Add Member)
  const actions = useQGroupActions({
    myEmail,
    myName,
    currentUser,
    qgroups,
    activeGroup,
    applyGroups,
    syncGroupsToBackend,
    setSelectedGroupId,
    setShowMobileChat,
    fetchGroupInvitations: invitations.fetchGroupInvitations,
    fetchFriendRequests: invitations.fetchFriendRequests,
    sentGroupInvitations: invitations.sentGroupInvitations,
    setSentGroupInvitations: invitations.setSentGroupInvitations,
    locallyInvitedGroupMembers: invitations.locallyInvitedGroupMembers,
    setLocallyInvitedGroupMembers: invitations.setLocallyInvitedGroupMembers,
    setSentFriendRequests: invitations.setSentFriendRequests,
    lookup,
    onShowToast,
  });

  // Management & Admin hooks
  const management = useQGroupManagement({
    myEmail,
    myName,
    qgroups,
    activeGroup,
    selectedGroupId,
    setSelectedGroupId,
    setShowMobileChat,
    setIsChannelDetailsOpen,
    applyGroups,
    syncGroupsToBackend,
    fetchQGroups,
    fetchFriendRequests: invitations.fetchFriendRequests,
    setConfirmDialog,
    onShowToast,
  });

  const adminActions = useQGroupAdminActions({
    myEmail,
    myName,
    qgroups,
    setIsChannelDetailsOpen,
    setDetailsGroup,
    applyGroups,
    syncGroupsToBackend,
    setConfirmDialog,
    onShowToast,
  });

  const handleHideGroup = useCallback(
    (groupId: string) => {
      setHiddenGroupIds((prev) => {
        const next = new Set(prev);
        next.add(groupId);
        try {
          localStorage.setItem(`quizgen_hidden_qgroups_${myEmail}`, JSON.stringify([...next]));
        } catch {}
        return next;
      });
      if (selectedGroupId === groupId) {
        setSelectedGroupId('');
        setShowMobileChat(false);
      }
      setMenuGroupId(null);
      onShowToast('info', 'Đã ẩn đoạn chat', 'Bạn có thể mở lại bất cứ lúc nào từ mục Đã ẩn.');
    },
    [myEmail, selectedGroupId, onShowToast]
  );

  const handleUnhideGroup = useCallback(
    (groupId: string) => {
      setHiddenGroupIds((prev) => {
        const next = new Set(prev);
        next.delete(groupId);
        try {
          localStorage.setItem(`quizgen_hidden_qgroups_${myEmail}`, JSON.stringify([...next]));
        } catch {}
        return next;
      });
      onShowToast('success', 'Đã hiện lại đoạn chat', 'Đoạn chat đã xuất hiện trở lại trong danh sách.');
    },
    [myEmail, onShowToast]
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
            localStorage.setItem(`quizgen_qgroups_${myEmail}`, JSON.stringify(next));
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
    [myEmail, setQgroups]
  );

  const handleOpenUserProfile = useCallback(
    (email?: string | null, name?: string | null) => {
      if (!email && !name) return;
      const targetEmail = (email || '').trim().toLowerCase();
      const friendship = targetEmail ? lookup.getFriendshipState(targetEmail) : { type: 'none' };
      openUserProfile(
        email || undefined,
        name || undefined,
        friendship.type === 'friend',
        friendship.type === 'sent_pending'
      );
    },
    [lookup, actions]
  );

  // SelectedGroupId persistence
  useEffect(() => {
    try {
      if (selectedGroupId) {
        sessionStorage.setItem('qgroup_selected_group_id', selectedGroupId);
        localStorage.setItem('qgroup_selected_group_id', selectedGroupId);
      } else {
        sessionStorage.removeItem('qgroup_selected_group_id');
        localStorage.removeItem('qgroup_selected_group_id');
      }
    } catch {}
  }, [selectedGroupId]);

  // System users fetch
  useEffect(() => {
    let isMounted = true;
    apiClient
      .fetch(`${API_BASE}/auth/users/search?q=`)
      .then((res) => (res.ok ? res.json() : null))
      .then((list) => {
        if (!Array.isArray(list) || !isMounted) return;
        const map = new Map<string, SystemUserSummary>();
        list.forEach((u: any) => {
          if (u.email && !isExcludedAdminAccount(u.email, u.fullName, u.academicTitle, u.role)) {
            const avt = (u.avatarUrl || u.avatar_url || '').trim();
            if (avt) saveUserAvatarSync(u.email, avt);
            map.set(u.email.toLowerCase(), {
              email: u.email,
              fullName: u.fullName || u.email.split('@')[0],
              academicTitle: u.academicTitle || 'ThS.',
              department: u.department || 'Khoa Công nghệ Thông tin',
              avatarUrl: avt || undefined,
            });
          }
        });
        setSystemUsersList(Array.from(map.values()));
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  // Polling 2s
  useEffect(() => {
    void fetchQGroups();
    void invitations.fetchGroupInvitations();
    void invitations.fetchFriendRequests();
    void huddle.fetchActiveHuddles();
    const iv = setInterval(() => {
      void fetchQGroups();
      void invitations.fetchGroupInvitations();
      void invitations.fetchFriendRequests();
      void huddle.fetchActiveHuddles();
    }, 2000);
    return () => clearInterval(iv);
  }, [fetchQGroups, invitations.fetchGroupInvitations, invitations.fetchFriendRequests, huddle.fetchActiveHuddles]);

  // Viewport resize listener for mobile keyboard
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const updateViewportOffset = () => {
      if (window.visualViewport) {
        const offset = Math.max(0, window.innerHeight - (window.visualViewport.height + window.visualViewport.offsetTop));
        setViewportBottomOffset(offset);
      }
    };
    window.visualViewport?.addEventListener('resize', updateViewportOffset);
    window.visualViewport?.addEventListener('scroll', updateViewportOffset);
    return () => {
      window.visualViewport?.removeEventListener('resize', updateViewportOffset);
      window.visualViewport?.removeEventListener('scroll', updateViewportOffset);
    };
  }, []);

  // Scroll to bottom on group switch
  useLayoutEffect(() => {
    if (selectedGroupId && prevGroupIdRef.current !== selectedGroupId) {
      prevGroupIdRef.current = selectedGroupId;
      isUserNearBottomRef.current = true;
      if (chatContainerRef.current) chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      markGroupAsRead(selectedGroupId);
    }
  }, [selectedGroupId, markGroupAsRead]);

  // Draft restore/save
  useEffect(() => {
    if (!selectedGroupId) return;
    try {
      const saved = sessionStorage.getItem(`quizgen_draft_${myEmail}_${selectedGroupId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.text) setChatInput(parsed.text);
        if (Array.isArray(parsed.attachments)) attachments.setSelectedAttachments(parsed.attachments);
      }
    } catch {}
  }, [selectedGroupId, myEmail]);

  useEffect(() => {
    if (!selectedGroupId) return;
    try {
      const key = `quizgen_draft_${myEmail}_${selectedGroupId}`;
      if (chatInput || attachments.selectedAttachments.length > 0) {
        sessionStorage.setItem(key, JSON.stringify({ text: chatInput, attachments: attachments.selectedAttachments }));
      } else {
        sessionStorage.removeItem(key);
      }
    } catch {}
  }, [selectedGroupId, myEmail, chatInput, attachments.selectedAttachments]);

  // Connected friends & dropdown suggestions
  const connectedFriends = useMemo(() => {
    const map = new Map<string, { email: string; name: string; title?: string; dept?: string }>();
    qgroups.forEach((g) => {
      if (!g.isDirect) return;
      const info = resolveChatDisplayInfo(g, myEmail);
      const partnerEmail = (info.partnerEmail || '').trim().toLowerCase();
      if (partnerEmail && partnerEmail !== myEmail.toLowerCase() && !isExcludedAdminAccount(partnerEmail, info.displayName)) {
        map.set(partnerEmail, { email: partnerEmail, name: info.displayName, title: 'Giảng viên', dept: g.department || 'Khoa CNTT' });
      }
    });
    return Array.from(map.values());
  }, [qgroups, myEmail]);

  const filterList = useCallback(
    (qRaw: string, excludeEmails?: Set<string>) => {
      const cleanQ = qRaw.trim().toLowerCase().replace(/^@/, '');
      return connectedFriends.filter((f) => {
        if (excludeEmails?.has(f.email.toLowerCase())) return false;
        if (!cleanQ) return true;
        return f.name.toLowerCase().includes(cleanQ) || f.email.toLowerCase().includes(cleanQ) || (f.dept && f.dept.toLowerCase().includes(cleanQ));
      });
    },
    [connectedFriends]
  );

  const filteredFriends = useMemo(() => filterList(lookup.directAddMemberEmail), [filterList, lookup.directAddMemberEmail]);
  const filteredColleaguesForFriend = useMemo(() => filterList(lookup.friendEmailInput), [filterList, lookup.friendEmailInput]);
  const filteredColleaguesForNewGroup = useMemo(
    () => filterList(lookup.createGroupMemberInput, new Set(lookup.createGroupSelectedMembers.map((m) => m.email.toLowerCase()))),
    [filterList, lookup.createGroupMemberInput, lookup.createGroupSelectedMembers]
  );
  const suggestedFriendsDropdown = useMemo(() => (lookup.friendEmailInput.trim() ? filteredColleaguesForFriend.slice(0, 6) : []), [lookup.friendEmailInput, filteredColleaguesForFriend]);
  const suggestedDirectAddDropdown = useMemo(() => (lookup.directAddMemberEmail.trim() ? filteredFriends.slice(0, 6) : []), [lookup.directAddMemberEmail, filteredFriends]);
  const suggestedCreateGroupDropdown = useMemo(() => (lookup.createGroupMemberInput.trim() ? filteredColleaguesForNewGroup.slice(0, 6) : []), [lookup.createGroupMemberInput, filteredColleaguesForNewGroup]);

  const mentionCandidates = useMemo(() => {
    if (!activeGroup || activeGroup.isDirect) return [];
    const list = [{ id: 'all', tag: 'all', role: 'Thông báo cho tất cả thành viên (@all)' }];
    (activeGroup.members || []).forEach((email) => {
      const isOwner = email.toLowerCase() === (activeGroup.ownerEmail || '').toLowerCase();
      list.push({
        id: email,
        tag: isOwner && activeGroup.ownerName ? activeGroup.ownerName : email.split('@')[0],
        role: isOwner ? 'Trưởng nhóm' : email.toLowerCase() === myEmail.toLowerCase() ? 'Bạn' : 'Thành viên',
      });
    });
    if (!mentionSearch) return list;
    const q = mentionSearch.toLowerCase();
    return list.filter((c) => c.tag.toLowerCase().includes(q) || c.id.toLowerCase().includes(q));
  }, [activeGroup, myEmail, mentionSearch]);

  const activeHuddleForCurrentChat = useMemo(() => {
    if (!activeGroup) return null;
    const key = activeGroup.isDirect
      ? `dm_${Array.from(new Set([activeGroup.ownerEmail, activeGroup.directPartnerEmail, ...(activeGroup.members || [])].filter(Boolean).map((e) => String(e).trim().toLowerCase()))).sort().join('_')}`.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase()
      : (activeGroup.id || activeGroup.code || '').replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
    return huddle.activeHuddleRooms[key] || (activeGroup.id && huddle.activeHuddleRooms[activeGroup.id.toLowerCase()]) || null;
  }, [activeGroup, huddle.activeHuddleRooms]);

  const activeHuddleRoomIds = useMemo(() => new Set(Object.keys(huddle.activeHuddleRooms)), [huddle.activeHuddleRooms]);
  const totalInvitations = invitations.friendRequests.length + invitations.groupInvitations.length;

  const handleSend = () => {
    if ((!chatInput.trim() && attachments.selectedAttachments.length === 0) || !activeGroup) return;
    if (!activeGroup.isDirect && !isCurrentUserMember) {
      onShowToast('warning', 'Không thể gửi tin', 'Thầy/Cô không còn là thành viên của kênh này.');
      return;
    }
    const now = Date.now();
    const newMessages: QGroupMessage[] = [];
    const timeStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const replyPayload = messagesHook.replyingToMessage
      ? { id: messagesHook.replyingToMessage.id, senderName: messagesHook.replyingToMessage.senderName, text: (messagesHook.replyingToMessage.text || 'Tệp đính kèm').slice(0, 80) }
      : undefined;

    if (chatInput.trim()) {
      newMessages.push({
        id: `msg-${now}`,
        senderEmail: myEmail,
        senderName: myName,
        senderTitle: currentUser?.academicTitle || 'GV',
        senderAvatarUrl: currentUser?.avatarUrl || '',
        avatarColor: 'bg-slate-700',
        text: chatInput.trim(),
        replyTo: replyPayload,
        timestamp: timeStr,
        readBy: [myEmail],
      });
    }
    attachments.selectedAttachments.forEach((att, idx) => {
      newMessages.push({
        id: `msg-${now + (chatInput.trim() ? idx + 1 : idx)}`,
        senderEmail: myEmail,
        senderName: myName,
        senderTitle: currentUser?.academicTitle || 'GV',
        senderAvatarUrl: currentUser?.avatarUrl || '',
        avatarColor: 'bg-slate-700',
        text: '',
        attachment: att as any,
        attachments: [att as any],
        replyTo: !chatInput.trim() && idx === 0 ? replyPayload : undefined,
        timestamp: timeStr,
        readBy: [myEmail],
      });
    });

    const updated = qgroups.map((g) => (g.id === activeGroup.id ? { ...g, updatedAt: now, messages: [...(g.messages || []), ...newMessages] } : g));
    applyGroups(updated);
    void syncGroupsToBackend(updated);
    setChatInput('');
    attachments.setSelectedAttachments([]);
    messagesHook.setReplyingToMessage(null);
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 60);

    const targetId = activeGroup.id || activeGroup.code;
    newMessages.forEach((m) => {
      apiClient.fetch(`${API_BASE}/documents/qgroups/${encodeURIComponent(targetId)}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(m),
      }).catch(() => {});
    });
  };

  return (
    <div className="flex-1 flex h-full overflow-hidden bg-[#f7f9fb] select-none" onClick={() => setMenuGroupId(null)}>
      <div className={`md:w-72 lg:w-80 ${showMobileChat ? 'hidden md:flex' : 'flex w-full'} border-r border-slate-200 flex-col shrink-0 h-full`}>
        <ChannelSidebar
          sortedGroups={sortedGroups}
          selectedGroupId={selectedGroupId}
          myEmail={myEmail}
          activeHuddleRoomIds={activeHuddleRoomIds}
          menuGroupId={menuGroupId}
          filterTab={filterTab}
          setFilterTab={setFilterTab}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          totalInvitations={totalInvitations}
          friendRequests={invitations.friendRequests}
          sentFriendRequests={invitations.sentFriendRequests}
          groupInvitations={invitations.groupInvitations}
          onAcceptFriend={invitations.handleAcceptFriendRequest}
          onRejectFriend={invitations.handleRejectFriendRequest}
          onCancelFriend={invitations.handleCancelFriendRequest}
          onAcceptGroup={invitations.handleAcceptGroupInv}
          onRejectGroup={invitations.handleRejectGroupInv}
          onOpenAddFriend={() => lookup.setIsAddFriendOpen(true)}
          onOpenCreateGroup={() => { setGroupModalTab('create'); actions.setIsCreateGroupOpen(true); }}
          onSelectGroup={(groupId) => { setSelectedGroupId(groupId); setShowMobileChat(true); markGroupAsRead(groupId); setMenuGroupId(null); }}
          onToggleMenu={(groupId, e) => { e.stopPropagation(); setMenuGroupId((p) => (p === groupId ? null : groupId)); }}
          onViewProfile={(g) => { const info = resolveChatDisplayInfo(g, myEmail); handleOpenUserProfile(info.partnerEmail, info.displayName); setMenuGroupId(null); }}
          onViewDetails={(g) => { setDetailsGroup(g); setChannelDetailsTab('about'); setIsChannelDetailsOpen(true); setMenuGroupId(null); }}
          onMute={adminActions.handleToggleMute}
          onTogglePin={(g) => { messagesHook.handleTogglePinConversation(g); setMenuGroupId(null); }}
          onDeleteChat={(g) => handleHideGroup(g.id)}
          hiddenGroupIds={hiddenGroupIds}
          onUnhideGroup={handleUnhideGroup}
          onUnfriend={(g) => { const info = resolveChatDisplayInfo(g, myEmail); if (info.partnerEmail) management.handleUnfriend(info.partnerEmail, info.displayName); }}
          onLeaveGroup={management.handleLeaveGroup}
          onTransferOwner={management.handleOpenTransferOwnership}
          onDisbandGroup={management.handleDisbandGroup}
          onCopyCode={(code) => { navigator.clipboard.writeText(code); onShowToast('info', 'Đã sao chép mã phòng', code); setMenuGroupId(null); }}
        />
      </div>

      <div className={`flex-1 flex-col h-full overflow-hidden bg-white ${showMobileChat ? 'flex' : 'hidden md:flex'}`}>
        {activeGroup && activeInfo ? (
          <>
            <ChatHeader
              activeGroup={activeGroup}
              activeInfo={activeInfo}
              myEmail={myEmail}
              isStarred={isStarred}
              isHuddleActive={Boolean(activeHuddleForCurrentChat && activeHuddleForCurrentChat.count > 0)}
              activeHuddleCount={activeHuddleForCurrentChat ? activeHuddleForCurrentChat.count : 0}
              onToggleStarred={() => { setIsStarred(!isStarred); onShowToast('info', isStarred ? 'Bỏ đánh dấu sao' : 'Đã đánh dấu sao', activeGroup.name); }}
              onBackToMobileList={() => { setShowMobileChat(false); setSelectedGroupId(''); }}
              onOpenMobileMenu={onOpenMobileMenu}
              onOpenProfile={handleOpenUserProfile}
              onOpenDetails={(g, tab) => { setDetailsGroup(g); if (tab) setChannelDetailsTab(tab); setIsChannelDetailsOpen(true); }}
              onOpenDirectAddMember={() => { lookup.setDirectAddMemberEmail(''); lookup.setLookedUpUser(null); lookup.setLookupStatus('idle'); actions.setIsDirectAddMemberOpen(true); }}
              onOpenHuddle={huddle.handleOpenHuddleWithAudioPrime}
              onToggleMute={adminActions.handleToggleMute}
              onTogglePinConversation={messagesHook.handleTogglePinConversation}
              onOpenCanvas={() => onShowToast('info', 'Bảng ghi nhớ Canvas', 'Mở không gian làm việc ghi nhớ')}
              onOpenSummarize={() => setIsSummarizeModalOpen(true)}
              onOpenSharedMedia={() => setIsSharedMediaOpen(true)}
              onOpenChannelSettings={() => setIsChannelSettingsOpen(true)}
              onOpenTransferOwnership={management.handleOpenTransferOwnership}
              onDeleteChat={management.handleDeleteChat}
              onHideChat={(g) => handleHideGroup(g.id)}
              onUnfriend={management.handleUnfriend}
              onDisbandGroup={management.handleDisbandGroup}
              onLeaveGroup={management.handleLeaveGroup}
              onShowToast={onShowToast}
            />
            <ActiveHuddleBanner activeHuddle={activeHuddleForCurrentChat} isCurrentUserInHuddle={huddle.isHuddleOpen} onJoinHuddle={huddle.handleOpenHuddleWithAudioPrime} />
            <PinnedMessagesBar
              pinnedMessages={pinnedMessages}
              activePinnedIdx={messagesHook.activePinnedIdx}
              onNextPinned={() => messagesHook.setActivePinnedIdx((p) => (p + 1) % pinnedMessages.length)}
              onUnpin={messagesHook.handleTogglePinMessage}
              onScrollToMessage={messagesHook.handleJumpToMessage}
            />
            <ChatMessageStream
              activeGroup={activeGroup}
              activeInfo={activeInfo}
              myEmail={myEmail}
              myName={myName}
              currentUser={currentUser}
              chatContainerRef={chatContainerRef}
              chatEndRef={chatEndRef}
              isUserNearBottomRef={isUserNearBottomRef}
              handleRespondJoinRequest={adminActions.handleRespondJoinRequest}
              highlightedMsgId={messagesHook.highlightedMsgId}
              editingMessageId={messagesHook.editingMessageId}
              editText={messagesHook.editText}
              setEditText={messagesHook.setEditText}
              setEditingMessageId={messagesHook.setEditingMessageId}
              handleSaveEditMessage={messagesHook.handleSaveEditMessage}
              handleJumpToMessage={messagesHook.handleJumpToMessage}
              handleOpenUserProfile={handleOpenUserProfile}
              handleStartReply={messagesHook.handleStartReply}
              handleStartEditMessage={messagesHook.handleStartEditMessage}
              handleTogglePinMessage={messagesHook.handleTogglePinMessage}
              handleDeleteMessage={messagesHook.handleDeleteMessage}
              handleToggleReaction={messagesHook.handleToggleReaction}
              setPreviewMediaUrl={setPreviewMediaUrl}
              setPreviewFile={setPreviewFile}
              onNavigate={onNavigate}
              onShowToast={onShowToast}
            />
            <div className="p-3 sm:px-4 sm:py-3 border-t border-slate-200 bg-white space-y-2" style={{ paddingBottom: viewportBottomOffset > 0 ? `${Math.max(12, viewportBottomOffset + 8)}px` : undefined }}>
              <ChatComposer
                isMemberOfChannel={Boolean(activeGroup.isDirect || isCurrentUserMember)}
                isDirectChat={Boolean(activeGroup.isDirect)}
                replyingToMessage={messagesHook.replyingToMessage}
                onCancelReply={() => messagesHook.setReplyingToMessage(null)}
                onJumpToReplyingMessage={messagesHook.handleJumpToMessage}
                selectedAttachments={attachments.selectedAttachments}
                selectedAttachment={attachments.selectedAttachment}
                onRemoveAttachment={(idx) => attachments.setSelectedAttachments((p) => p.filter((_, i) => i !== idx))}
                onClearAttachment={() => attachments.setSelectedAttachments([])}
                chatInput={chatInput}
                onChatInputChange={(val) => {
                  setChatInput(val);
                  if (activeGroup.isDirect) { setIsMentionOpen(false); setMentionSearch(null); return; }
                  const atMatch = val.slice(0, textareaRef.current?.selectionStart || val.length).match(/@([a-zA-Z0-9_\.\u00C0-\u1EF9]*)$/);
                  if (atMatch) { setMentionSearch(atMatch[1]); setIsMentionOpen(true); } else { setIsMentionOpen(false); setMentionSearch(null); }
                }}
                isMentionOpen={isMentionOpen}
                mentionCandidates={mentionCandidates}
                onSelectMentionCandidate={(c) => { setChatInput((p) => `${p}@${c.tag} `); setIsMentionOpen(false); setMentionSearch(null); }}
                onCloseMention={() => { setIsMentionOpen(false); setMentionSearch(null); }}
                onSend={handleSend}
                onComposerPaste={attachments.handleComposerPaste}
                placeholder={activeGroup.isDirect ? `Nhắn tin tới ${activeGroup.directPartnerName || activeGroup.name}...` : `Nhắn tin trong #${activeGroup.name}...`}
                isRecording={voice.isRecording}
                recordingSeconds={voice.recordingSeconds}
                liveMicLevels={voice.liveMicLevels}
                activeMicLabel={voice.activeMicLabel}
                onCycleMic={voice.handleCycleMic}
                onCancelRecording={voice.cancelVoiceRecording}
                onStopAndSendRecording={voice.stopAndSendVoiceRecording}
                onStartRecording={voice.startVoiceRecording}
                onSelectFile={attachments.handleFileSelect}
                onSelectFiles={attachments.handleFilesSelect}
                isUploading={attachments.isUploadingAttachment}
                uploadProgressText={attachments.uploadProgressText}
                onOpenTextbookModal={() => setIsTextbookModalOpen(true)}
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 space-y-3">
            <MessageCircle className="w-14 h-14 text-slate-200" />
            <p className="font-bold text-sm text-slate-600">Chưa chọn đoạn chat</p>
            <p className="text-xs max-w-xs">Chọn một người bạn hoặc nhóm từ danh sách bên trái để bắt đầu nhắn tin.</p>
          </div>
        )}
      </div>

      {/* Modals */}
      {actions.isDirectAddMemberOpen && activeGroup && (
        <DirectAddMemberModal
          isOpen={actions.isDirectAddMemberOpen}
          onClose={() => { actions.setIsDirectAddMemberOpen(false); lookup.setDirectAddSelectedMembers([]); lookup.setDirectAddMemberEmail(''); }}
          activeGroup={activeGroup}
          directAddMemberEmail={lookup.directAddMemberEmail}
          onDirectAddMemberEmailChange={lookup.setDirectAddMemberEmail}
          onLookupUser={lookup.handleLookupUser}
          lookupStatus={lookup.lookupStatus}
          lookedUpUser={lookup.lookedUpUser}
          onClearLookedUpUser={() => { lookup.setDirectAddMemberEmail(''); lookup.setLookedUpUser(null); lookup.setLookupStatus('idle'); }}
          directAddSelectedMembers={lookup.directAddSelectedMembers}
          setDirectAddSelectedMembers={lookup.setDirectAddSelectedMembers}
          onQueueDirectAddMember={lookup.handleQueueDirectAddMember}
          suggestedDirectAddDropdown={suggestedDirectAddDropdown}
          filteredFriends={filteredFriends}
          getFriendshipState={lookup.getFriendshipState}
          isMemberInvitedToActiveChannel={actions.isMemberInvitedToActiveChannel}
          onAddUserToActiveChannel={actions.handleAddUserToActiveChannel}
          onSendGroupInvitation={actions.handleSendGroupInvitation}
          onBatchAddUsersToActiveChannel={actions.handleBatchAddUsersToActiveChannel}
          onBatchSendGroupInvitations={actions.handleBatchSendGroupInvitations}
          isAddingMember={actions.isAddingMember}
          initials={initials}
        />
      )}
      {isChannelDetailsOpen && (detailsGroup || activeGroup) && (
        <ChannelDetailsModal
          group={(detailsGroup || activeGroup)!}
          myEmail={myEmail}
          activeTab={channelDetailsTab}
          onTabChange={setChannelDetailsTab}
          inviteEmail={actions.inviteEmailInput}
          onInviteEmailChange={actions.setInviteEmailInput}
          onInvite={() => void actions.handleInviteToGroup((detailsGroup || activeGroup)!)}
          onClose={() => { setIsChannelDetailsOpen(false); setDetailsGroup(null); }}
          onLeaveGroup={() => { setIsChannelDetailsOpen(false); void management.handleLeaveGroup((detailsGroup || activeGroup)!); }}
          onDeleteChat={() => { setIsChannelDetailsOpen(false); management.handleDeleteChat((detailsGroup || activeGroup)!); }}
          onUnfriend={(em, nm) => { setIsChannelDetailsOpen(false); management.handleUnfriend(em, nm); }}
          onKickMember={(em, nm) => void adminActions.handleKickMember((detailsGroup || activeGroup)!, em, nm)}
          onRespondJoinRequest={(rid, em, act) => void adminActions.handleRespondJoinRequest((detailsGroup || activeGroup)!, rid, em, act)}
          onOpenProfile={handleOpenUserProfile}
          onTransferOwnershipToMember={(em) => management.handleOpenTransferOwnership((detailsGroup || activeGroup)!, em)}
          onSaveSettings={(n, d, ds, jp) => void adminActions.handleSaveGroupSettings((detailsGroup || activeGroup)!, n, d, ds, jp)}
          onDisbandGroup={() => { setIsChannelDetailsOpen(false); void management.handleDisbandGroup((detailsGroup || activeGroup)!); }}
        />
      )}
      {isChannelSettingsOpen && activeGroup && (
        <ChannelSettingsModal
          group={activeGroup}
          myEmail={myEmail}
          onClose={() => setIsChannelSettingsOpen(false)}
          onSaveSettings={(n, d, ds, jp) => { void adminActions.handleSaveGroupSettings(activeGroup, n, d, ds, jp); setIsChannelSettingsOpen(false); }}
          onTransferOwner={() => { setIsChannelSettingsOpen(false); management.handleOpenTransferOwnership(activeGroup); }}
          onDisband={() => { setIsChannelSettingsOpen(false); void management.handleDisbandGroup(activeGroup); }}
        />
      )}
      <TransferOwnerModal
        isOpen={management.isTransferOwnerModalOpen}
        onClose={() => management.setIsTransferOwnerModalOpen(false)}
        transferGroup={management.transferGroup}
        myEmail={myEmail}
        selectedNewOwner={management.selectedNewOwner}
        onSelectNewOwner={management.setSelectedNewOwner}
        transferAlsoLeave={management.transferAlsoLeave}
        onToggleTransferAlsoLeave={management.setTransferAlsoLeave}
        isTransferringOwner={management.isTransferringOwner}
        onConfirmTransfer={management.handleTransferOwnerAndLeave}
        onDisbandGroup={management.handleDisbandGroup}
      />
      {isSummarizeModalOpen && activeGroup && <AiSummarizeModal group={activeGroup} onClose={() => setIsSummarizeModalOpen(false)} />}
      {huddle.isHuddleOpen && activeGroup && (
        <HuddleCallModal group={activeGroup} currentUser={currentUser} onClose={() => { huddle.setIncomingHuddleCall(null); huddle.setIsHuddleOpen(false); }} />
      )}
      {lookup.isAddFriendOpen && (
        <FriendModal
          isOpen={lookup.isAddFriendOpen}
          onClose={lookup.handleCloseAddFriendModal}
          friendEmailInput={lookup.friendEmailInput}
          onFriendEmailInputChange={lookup.setFriendEmailInput}
          onFriendLookup={lookup.handleFriendLookup}
          friendLookupStatus={lookup.friendLookupStatus}
          friendLookedUpUser={lookup.friendLookedUpUser}
          onClearLookedUpUser={() => { lookup.setFriendEmailInput(''); lookup.setFriendLookedUpUser(null); lookup.setFriendLookupStatus('idle'); }}
          selectedFriendsToInvite={lookup.selectedFriendsToInvite}
          setSelectedFriendsToInvite={lookup.setSelectedFriendsToInvite}
          suggestedFriendsDropdown={suggestedFriendsDropdown}
          filteredColleaguesForFriend={filteredColleaguesForFriend}
          getFriendshipState={lookup.getFriendshipState}
          onQueueFriendInvite={lookup.handleQueueFriendInvite}
          onSendFriendRequest={actions.handleSendFriendRequest}
          onAcceptFriendRequest={invitations.handleAcceptFriendRequest}
          onBatchSendFriendRequests={actions.handleBatchSendFriendRequests}
          initials={initials}
        />
      )}
      {actions.isCreateGroupOpen && (
        <CreateOrJoinGroupModal
          isOpen={actions.isCreateGroupOpen}
          onClose={() => { actions.setIsCreateGroupOpen(false); lookup.setCreateGroupSelectedMembers([]); lookup.setCreateGroupMemberInput(''); }}
          groupModalTab={groupModalTab}
          setGroupModalTab={setGroupModalTab}
          newGroupName={actions.newGroupName}
          setNewGroupName={actions.setNewGroupName}
          newGroupDept={actions.newGroupDept}
          setNewGroupDept={actions.setNewGroupDept}
          newGroupDesc={actions.newGroupDesc}
          setNewGroupDesc={actions.setNewGroupDesc}
          createGroupSelectedMembers={lookup.createGroupSelectedMembers}
          setCreateGroupSelectedMembers={lookup.setCreateGroupSelectedMembers}
          createGroupMemberInput={lookup.createGroupMemberInput}
          setCreateGroupMemberInput={lookup.setCreateGroupMemberInput}
          onLookupMember={lookup.handleCreateGroupMemberLookup}
          createGroupLookupStatus={lookup.createGroupLookupStatus}
          createGroupLookedUpUser={lookup.createGroupLookedUpUser}
          onClearLookedUpUser={() => { lookup.setCreateGroupMemberInput(''); lookup.setCreateGroupLookedUpUser(null); lookup.setCreateGroupLookupStatus('idle'); }}
          suggestedCreateGroupDropdown={suggestedCreateGroupDropdown}
          filteredColleaguesForNewGroup={filteredColleaguesForNewGroup}
          getFriendshipState={lookup.getFriendshipState}
          onAddMemberToNewGroup={lookup.handleAddMemberToNewGroup}
          onCreateGroup={actions.handleCreateGroup}
          joinCodeInput={joinCodeInput}
          setJoinCodeInput={setJoinCodeInput}
          onJoinByCode={actions.handleJoinByCode}
          isJoiningCode={isJoiningCode}
          initials={initials}
        />
      )}
      {confirmDialog && <ConfirmModal {...confirmDialog} onCancel={() => setConfirmDialog(null)} />}
      {previewFile && <DocumentPreviewModal isOpen={Boolean(previewFile)} fileUrl={previewFile.url} fileName={previewFile.name} fileSize={previewFile.size} fileType={previewFile.type} onClose={() => setPreviewFile(null)} onDownload={() => downloadFileSafely(previewFile.name, previewFile.url, onShowToast)} />}
      {previewMediaUrl && <MediaLightboxModal previewMedia={previewMediaUrl} onClose={() => setPreviewMediaUrl(null)} />}
      {activeGroup && <SharedMediaDrawer isOpen={isSharedMediaOpen} onClose={() => setIsSharedMediaOpen(false)} group={activeGroup} myEmail={myEmail} onSelectImage={(f) => setPreviewMediaUrl({ url: f.url, name: f.name })} onUseTextbookForExam={(n) => { onShowToast('success', 'Đã nạp giáo trình', `Đã chuyển ${n} vào sinh đề thi`); onNavigate('generate'); }} onShowToast={onShowToast} />}
      <TextbookPickerModal isOpen={isTextbookModalOpen} onClose={() => setIsTextbookModalOpen(false)} onSelectTextbook={(tb) => attachments.setSelectedAttachments((p) => [...p, { type: 'textbook', id: tb.id, name: tb.name, size: tb.size || '15.0 MB', totalPages: tb.totalPages, authorName: tb.authorName, fileUrl: tb.fileUrl }])} currentUser={currentUser} onNavigateUpload={() => onNavigate('upload')} onShowToast={onShowToast} />
    </div>
  );
};
export default QGroupScreen;
