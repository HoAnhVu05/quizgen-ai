import { useState, useCallback } from 'react';
import type { QGroup, QGroupMessage, QGroupInvitation, FriendRequest, UserProfile } from '../../types';
import apiClient, { API_BASE } from '../../services/apiClient';
import { isExcludedAdminAccount } from './chatUtils';
import type { SystemUserSummary } from './useQGroupLookup';

interface UseQGroupActionsParams {
  myEmail: string;
  myName: string;
  currentUser?: UserProfile | null;
  qgroups: QGroup[];
  activeGroup: QGroup | null;
  applyGroups: (groups: QGroup[]) => void;
  syncGroupsToBackend: (groups: QGroup[]) => Promise<void>;
  setSelectedGroupId: (id: string) => void;
  setShowMobileChat: (show: boolean) => void;
  fetchGroupInvitations: () => Promise<void>;
  fetchFriendRequests: () => Promise<void>;
  sentGroupInvitations: QGroupInvitation[];
  setSentGroupInvitations: React.Dispatch<React.SetStateAction<QGroupInvitation[]>>;
  locallyInvitedGroupMembers: Set<string>;
  setLocallyInvitedGroupMembers: React.Dispatch<React.SetStateAction<Set<string>>>;
  setSentFriendRequests: React.Dispatch<React.SetStateAction<FriendRequest[]>>;
  lookup: {
    lookedUpUser: SystemUserSummary | null;
    setLookedUpUser: (u: SystemUserSummary | null) => void;
    setLookupStatus: (s: 'idle' | 'searching' | 'found' | 'not_found') => void;
    setDirectAddMemberEmail: (v: string) => void;
    directAddSelectedMembers: SystemUserSummary[];
    setDirectAddSelectedMembers: React.Dispatch<React.SetStateAction<SystemUserSummary[]>>;
    friendLookedUpUser: SystemUserSummary | null;
    setFriendLookedUpUser: (u: SystemUserSummary | null) => void;
    setFriendLookupStatus: (s: 'idle' | 'searching' | 'found' | 'not_found') => void;
    friendEmailInput: string;
    setFriendEmailInput: (v: string) => void;
    selectedFriendsToInvite: SystemUserSummary[];
    setSelectedFriendsToInvite: React.Dispatch<React.SetStateAction<SystemUserSummary[]>>;
    createGroupSelectedMembers: SystemUserSummary[];
    setCreateGroupSelectedMembers: React.Dispatch<React.SetStateAction<SystemUserSummary[]>>;
    setCreateGroupMemberInput: (v: string) => void;
    setCreateGroupLookedUpUser: (u: SystemUserSummary | null) => void;
    setCreateGroupLookupStatus: (s: 'idle' | 'searching' | 'found' | 'not_found') => void;
    getFriendshipState: (email: string) => { type: string; req?: FriendRequest };
    handleCloseAddFriendModal: () => void;
  };
  onShowToast: (
    type: 'success' | 'info' | 'warning' | 'error',
    title: string,
    message: string,
    onClick?: () => void
  ) => void;
}

export function useQGroupActions({
  myEmail,
  myName,
  currentUser,
  qgroups,
  activeGroup,
  applyGroups,
  syncGroupsToBackend,
  setSelectedGroupId,
  setShowMobileChat,
  fetchGroupInvitations,
  fetchFriendRequests,
  sentGroupInvitations,
  setSentGroupInvitations,
  locallyInvitedGroupMembers,
  setLocallyInvitedGroupMembers,
  setSentFriendRequests,
  lookup,
  onShowToast,
}: UseQGroupActionsParams) {
  const [isDirectAddMemberOpen, setIsDirectAddMemberOpen] = useState(false);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [inviteEmailInput, setInviteEmailInput] = useState('');
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDept, setNewGroupDept] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');

  const handleSendGroupInvitation = useCallback(
    async (targetEmail: string, targetName?: string) => {
      if (!activeGroup) return;
      const clean = targetEmail.trim().toLowerCase();
      const currentMembers = (activeGroup.members || []).map((m) => String(m).toLowerCase());
      if (currentMembers.includes(clean)) {
        onShowToast('info', 'Đã là thành viên', `${clean} đã có mặt trong kênh #${activeGroup.name}`);
        return;
      }
      const displayName = targetName || clean;
      const inv: QGroupInvitation = {
        id: `inv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        groupId: activeGroup.id,
        groupCode: activeGroup.code,
        groupName: activeGroup.name,
        department: activeGroup.department || 'Khoa Công nghệ Thông tin',
        inviterEmail: myEmail,
        inviterName: myName,
        targetEmail: clean,
        targetName: displayName,
        status: 'pending',
        invitedAt: new Date().toISOString(),
      };

      setLocallyInvitedGroupMembers((prev) => new Set(prev).add(`${activeGroup.id}:${clean}`));
      setSentGroupInvitations((prev) => [
        inv,
        ...prev.filter((x) => !(x.groupId === activeGroup.id && x.targetEmail.toLowerCase() === clean)),
      ]);

      try {
        await apiClient.fetch(`${API_BASE}/documents/qgroups/invitations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(inv),
        });
        onShowToast(
          'success',
          'Đã gửi lời mời tham gia',
          `Đã gửi lời mời tới ${displayName} (${clean}). Đồng nghiệp sẽ nhận được thông báo để chấp nhận.`
        );
        setInviteEmailInput('');
        void fetchGroupInvitations();
      } catch {
        onShowToast('error', 'Lỗi kết nối', 'Không thể gửi lời mời nhóm.');
      }
    },
    [activeGroup, myEmail, myName, onShowToast, fetchGroupInvitations, setLocallyInvitedGroupMembers, setSentGroupInvitations]
  );

  const isMemberInvitedToActiveChannel = useCallback(
    (targetEmail: string) => {
      if (!activeGroup) return false;
      const clean = targetEmail.trim().toLowerCase();
      const groupKey = `${activeGroup.id}:${clean}`;
      if (locallyInvitedGroupMembers.has(groupKey)) return true;
      return sentGroupInvitations.some(
        (inv) => inv.groupId === activeGroup.id && inv.targetEmail?.trim().toLowerCase() === clean && inv.status === 'pending'
      );
    },
    [activeGroup, locallyInvitedGroupMembers, sentGroupInvitations]
  );

  const handleAddUserToActiveChannel = useCallback(
    async (emailToAdd: string, displayName?: string) => {
      if (!activeGroup) return;
      const clean = emailToAdd.trim().toLowerCase();
      const currentMembers = (activeGroup.members || []).map((m) => String(m).toLowerCase());

      if (currentMembers.includes(clean)) {
        onShowToast('info', 'Đã là thành viên', `${clean} đã có mặt trong kênh #${activeGroup.name}`);
        return;
      }

      const friendship = lookup.getFriendshipState(clean);
      if (friendship.type !== 'friend') {
        await handleSendGroupInvitation(clean, displayName || lookup.lookedUpUser?.fullName);
        setIsAddingMember(false);
        setIsDirectAddMemberOpen(false);
        lookup.setDirectAddMemberEmail('');
        lookup.setLookedUpUser(null);
        lookup.setLookupStatus('idle');
        return;
      }

      setIsAddingMember(true);
      const updatedMembers = [...(activeGroup.members || []), clean];
      const memberName = displayName || lookup.lookedUpUser?.fullName || clean;
      const nowMs = Date.now();
      const timeStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
      const announcementMsg: QGroupMessage = {
        id: `msg-${nowMs}`,
        senderEmail: 'system',
        senderName: 'Hệ Thống Q-Group',
        isSystem: true,
        timestamp: timeStr,
        text: `🎉 ${myName} đã thêm bạn bè ${memberName} (${clean}) vào kênh #${activeGroup.name}.`,
        readBy: [myEmail, clean],
      };
      const updatedMessages = [...(activeGroup.messages || []), announcementMsg];
      const updatedGroup = {
        ...activeGroup,
        members: updatedMembers,
        memberCount: updatedMembers.length,
        messages: updatedMessages,
        updatedAt: nowMs,
      };

      applyGroups(qgroups.map((g) => (g.id === activeGroup.id ? updatedGroup : g)));

      try {
        await apiClient.fetch(`${API_BASE}/documents/qgroups/${encodeURIComponent(activeGroup.id)}/members`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: clean, name: memberName, inviterName: myName, group: updatedGroup }),
        });
      } catch {
        try {
          await apiClient.fetch(`${API_BASE}/documents/qgroups/${encodeURIComponent(activeGroup.id)}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ members: updatedMembers, memberCount: updatedMembers.length, messages: updatedMessages }),
          });
        } catch {}
      }

      setIsAddingMember(false);
      setIsDirectAddMemberOpen(false);
      lookup.setDirectAddMemberEmail('');
      lookup.setLookedUpUser(null);
      lookup.setLookupStatus('idle');
      onShowToast('success', 'Đã thêm thành viên', `${memberName} đã gia nhập kênh #${activeGroup.name}`);
    },
    [activeGroup, myEmail, myName, qgroups, applyGroups, lookup, handleSendGroupInvitation, onShowToast]
  );

  const handleBatchAddUsersToActiveChannel = useCallback(async () => {
    if (!activeGroup || lookup.directAddSelectedMembers.length === 0) return;
    setIsAddingMember(true);
    const count = lookup.directAddSelectedMembers.length;
    for (const m of lookup.directAddSelectedMembers) {
      await handleAddUserToActiveChannel(m.email, m.fullName);
    }
    lookup.setDirectAddSelectedMembers([]);
    setIsAddingMember(false);
    setIsDirectAddMemberOpen(false);
    onShowToast('success', 'Hoàn tất xử lý', `Đã thêm/mời ${count} đồng nghiệp vào kênh #${activeGroup.name}`);
  }, [activeGroup, lookup, handleAddUserToActiveChannel, onShowToast]);

  const handleBatchSendGroupInvitations = useCallback(async () => {
    if (!activeGroup || lookup.directAddSelectedMembers.length === 0) return;
    setIsAddingMember(true);
    for (const m of lookup.directAddSelectedMembers) {
      await handleSendGroupInvitation(m.email, m.fullName);
    }
    lookup.setDirectAddSelectedMembers([]);
    setIsAddingMember(false);
    setIsDirectAddMemberOpen(false);
  }, [activeGroup, lookup, handleSendGroupInvitation]);

  const handleSendFriendRequest = async (overrideEmail?: string) => {
    const email = (overrideEmail || lookup.friendLookedUpUser?.email || lookup.friendEmailInput).trim().toLowerCase();
    if (!email || email === myEmail.toLowerCase()) {
      onShowToast('warning', 'Không hợp lệ', 'Vui lòng nhập email giảng viên khác.');
      return;
    }
    if (isExcludedAdminAccount(email, lookup.friendLookedUpUser?.fullName, lookup.friendLookedUpUser?.academicTitle)) {
      onShowToast('warning', 'Không hợp lệ', 'Tài khoản Quản trị viên hệ thống được bảo mật và không kết bạn.');
      return;
    }

    const reqId = `fr-${Date.now()}`;
    const newReq: FriendRequest = {
      id: reqId,
      senderEmail: myEmail,
      senderName: myName,
      senderTitle: currentUser?.academicTitle || 'GV',
      targetEmail: email,
      status: 'pending',
      requestedAt: new Date().toISOString(),
    };
    setSentFriendRequests((prev) => [...prev, newReq]);

    try {
      const res = await apiClient.fetch(`${API_BASE}/documents/friend-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: reqId,
          senderEmail: myEmail,
          senderName: myName,
          senderTitle: currentUser?.academicTitle || 'GV',
          targetEmail: email,
        }),
      });
      if (res.ok) {
        onShowToast('success', 'Đã gửi lời mời kết bạn', email);
        lookup.setFriendEmailInput('');
        lookup.setFriendLookedUpUser(null);
        lookup.setFriendLookupStatus('idle');
        lookup.handleCloseAddFriendModal();
        void fetchFriendRequests();
      }
    } catch {
      onShowToast('error', 'Lỗi', 'Không thể gửi lời mời.');
    }
  };

  const handleBatchSendFriendRequests = async () => {
    if (lookup.selectedFriendsToInvite.length === 0) return;
    const count = lookup.selectedFriendsToInvite.length;
    for (const m of lookup.selectedFriendsToInvite) {
      await handleSendFriendRequest(m.email);
    }
    lookup.setSelectedFriendsToInvite([]);
    lookup.handleCloseAddFriendModal();
    onShowToast('success', 'Đã gửi lời mời', `Đã gửi lời mời kết bạn tới ${count} đồng nghiệp.`);
  };

  const handleInviteToGroup = async (group: QGroup) => {
    const email = inviteEmailInput.trim().toLowerCase();
    if (!email || !group) return;
    const inv: QGroupInvitation = {
      id: `inv-${Date.now()}`,
      groupId: group.id,
      groupCode: group.code,
      groupName: group.name,
      department: group.department || 'Khoa Công nghệ Thông tin',
      inviterEmail: myEmail,
      inviterName: myName,
      targetEmail: email,
      status: 'pending',
      invitedAt: new Date().toISOString(),
    };
    setLocallyInvitedGroupMembers((prev) => new Set(prev).add(`${group.id}:${email}`));
    setSentGroupInvitations((prev) => [inv, ...prev.filter((x) => !(x.groupId === group.id && x.targetEmail.toLowerCase() === email))]);
    try {
      await apiClient.fetch(`${API_BASE}/documents/qgroups/invitations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inv),
      });
      onShowToast('success', 'Đã gửi lời mời', `Đã mời ${email} vào nhóm.`);
      setInviteEmailInput('');
      void fetchGroupInvitations();
    } catch {}
  };

  const handleCreateGroup = () => {
    if (!newGroupName.trim()) return;
    const now = Date.now();
    const code = `QGRP-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

    const confirmedFriends: SystemUserSummary[] = [];
    const unconfirmedMembers: SystemUserSummary[] = [];

    lookup.createGroupSelectedMembers.forEach((m) => {
      const state = lookup.getFriendshipState(m.email);
      if (state.type === 'friend') confirmedFriends.push(m);
      else unconfirmedMembers.push(m);
    });

    const friendEmails = confirmedFriends.map((m) => m.email.trim().toLowerCase());
    const initialMembers = Array.from(new Set([myEmail.toLowerCase(), ...friendEmails]));

    let systemNotice = `🎉 Nhóm "${newGroupName.trim()}" đã được khởi tạo bởi ${myName}. Mã phòng: ${code}`;
    if (confirmedFriends.length > 0) systemNotice += ` • Thành viên kết nối: ${confirmedFriends.map((m) => m.fullName).join(', ')}.`;
    if (unconfirmedMembers.length > 0) systemNotice += ` • Đã gửi lời mời tham gia tới: ${unconfirmedMembers.map((m) => m.fullName).join(', ')}.`;

    const group: QGroup = {
      id: `qg-${now}`,
      code,
      name: newGroupName.trim(),
      department: newGroupDept.trim() || 'Khoa Chuyên Ngành',
      description: newGroupDesc.trim() || 'Không gian làm việc chung: trao đổi câu hỏi, chia sẻ giáo trình và thống nhất ma trận đề thi.',
      ownerEmail: myEmail,
      ownerName: myName,
      joinPolicy: 'approval_required',
      memberCount: initialMembers.length,
      members: initialMembers,
      pendingRequests: [],
      isDirect: false,
      updatedAt: now,
      messages: [
        {
          id: `msg-${now}`,
          senderEmail: 'system',
          senderName: 'Hệ Thống QuizGen',
          isSystem: true,
          timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
          text: systemNotice,
        },
      ],
    };
    const next = [group, ...qgroups];
    applyGroups(next);
    void syncGroupsToBackend(next);

    unconfirmedMembers.forEach((m) => {
      const cleanTarget = m.email.trim().toLowerCase();
      const inv: QGroupInvitation = {
        id: `inv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        groupId: group.id,
        groupCode: group.code,
        groupName: group.name,
        department: group.department || 'Khoa Chuyên Ngành',
        inviterEmail: myEmail,
        inviterName: myName,
        targetEmail: cleanTarget,
        targetName: m.fullName,
        status: 'pending',
        invitedAt: new Date().toISOString(),
      };
      setSentGroupInvitations((prev) => [inv, ...prev]);
      setLocallyInvitedGroupMembers((prev) => new Set(prev).add(`${group.id}:${cleanTarget}`));
      void apiClient.fetch(`${API_BASE}/documents/qgroups/invitations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inv),
      });
    });

    setSelectedGroupId(group.id);
    setShowMobileChat(true);
    setIsCreateGroupOpen(false);
    setNewGroupName('');
    setNewGroupDept('');
    setNewGroupDesc('');
    lookup.setCreateGroupSelectedMembers([]);
    lookup.setCreateGroupMemberInput('');
    lookup.setCreateGroupLookedUpUser(null);
    lookup.setCreateGroupLookupStatus('idle');
    onShowToast('success', 'Đã tạo nhóm thành công', `Mã phòng: ${code}`);
  };

  const handleJoinByCode = async (code: string) => {
    const c = code.trim().toUpperCase();
    if (!c) {
      onShowToast('warning', 'Chưa nhập mã', 'Vui lòng nhập mã phòng học thuật.');
      return;
    }
    try {
      const res = await apiClient
        .fetch(`${API_BASE}/documents/qgroups/${c}/join-by-code`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userEmail: myEmail,
            userName: myName,
            userTitle: currentUser?.academicTitle || 'ThS.',
          }),
        })
        .then(async (r) => {
          if (r.status === 404) return { status: 'not_found', message: `Không tìm thấy nhóm với mã ${c}.` };
          return r.json();
        });

      if (res.status === 'joined') {
        setIsCreateGroupOpen(false);
        const joinedGroup = res.group;
        const filtered = qgroups.filter((g) => g.id !== joinedGroup.id);
        applyGroups([joinedGroup, ...filtered]);
        setSelectedGroupId(joinedGroup.id);
        setShowMobileChat(true);
        onShowToast('success', 'Tham gia nhóm thành công', res.message || `Chào mừng bạn đến với ${joinedGroup.name}`);
      } else if (res.status === 'already_member') {
        setIsCreateGroupOpen(false);
        setSelectedGroupId(res.group?.id || '');
        if (res.group?.id) setShowMobileChat(true);
        onShowToast('info', 'Bạn đã là thành viên', res.message || 'Bạn đã tham gia nhóm này trước đó.');
      } else if (res.status === 'pending_approval') {
        setIsCreateGroupOpen(false);
        onShowToast('info', 'Yêu cầu tham gia đã gửi', res.message);
      } else {
        onShowToast('warning', 'Không thể tham gia', res.message || `Mã ${c} không hợp lệ.`);
      }
    } catch {
      onShowToast('error', 'Lỗi kết nối', 'Không thể gửi yêu cầu tham gia nhóm.');
    }
  };

  return {
    isDirectAddMemberOpen,
    setIsDirectAddMemberOpen,
    isAddingMember,
    inviteEmailInput,
    setInviteEmailInput,
    isCreateGroupOpen,
    setIsCreateGroupOpen,
    newGroupName,
    setNewGroupName,
    newGroupDept,
    setNewGroupDept,
    newGroupDesc,
    setNewGroupDesc,
    handleSendGroupInvitation,
    isMemberInvitedToActiveChannel,
    handleAddUserToActiveChannel,
    handleBatchAddUsersToActiveChannel,
    handleBatchSendGroupInvitations,
    handleSendFriendRequest,
    handleBatchSendFriendRequests,
    handleInviteToGroup,
    handleCreateGroup,
    handleJoinByCode,
  };
}
