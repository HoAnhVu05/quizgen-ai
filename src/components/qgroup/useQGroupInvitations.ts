import { useState, useCallback, useEffect } from 'react';
import type { QGroup, QGroupInvitation, FriendRequest, UserProfile } from '../../types';
import apiClient, { API_BASE } from '../../services/apiClient';
import { removeFromBlacklist } from './qgroupHelpers';

interface UseQGroupInvitationsParams {
  myEmail: string;
  myName: string;
  currentUser?: UserProfile | null;
  fetchQGroups: () => Promise<void>;
  setSelectedGroupId: (id: string) => void;
  setShowMobileChat: (show: boolean) => void;
  setFilterTab: (tab: any) => void;
  onShowToast: (
    type: 'success' | 'info' | 'warning' | 'error',
    title: string,
    message: string,
    onClick?: () => void
  ) => void;
}

export function useQGroupInvitations({
  myEmail,
  myName,
  currentUser,
  fetchQGroups,
  setSelectedGroupId,
  setShowMobileChat,
  setFilterTab,
  onShowToast,
}: UseQGroupInvitationsParams) {
  const [groupInvitations, setGroupInvitations] = useState<QGroupInvitation[]>([]);
  const [sentGroupInvitations, setSentGroupInvitations] = useState<QGroupInvitation[]>([]);
  const [locallyInvitedGroupMembers, setLocallyInvitedGroupMembers] = useState<Set<string>>(new Set());
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [sentFriendRequests, setSentFriendRequests] = useState<FriendRequest[]>([]);
  const [invitationsTab, setInvitationsTab] = useState<'received' | 'sent' | 'groups'>('received');
  const [isInvitationsOpen, setIsInvitationsOpen] = useState(false);

  const fetchGroupInvitations = useCallback(async () => {
    if (!myEmail) return;
    try {
      const res = await apiClient.fetch(
        `${API_BASE}/documents/qgroups/invitations?email=${encodeURIComponent(myEmail)}&type=received`
      );
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data))
          setGroupInvitations(data.filter((i: QGroupInvitation) => i?.status === 'pending'));
      }

      const resSent = await apiClient.fetch(
        `${API_BASE}/documents/qgroups/invitations?email=${encodeURIComponent(myEmail)}&type=sent`
      );
      if (resSent.ok) {
        const dataSent = await resSent.json();
        if (Array.isArray(dataSent))
          setSentGroupInvitations(dataSent.filter((i: QGroupInvitation) => i?.status === 'pending'));
      }
    } catch {}
  }, [myEmail]);

  const fetchFriendRequests = useCallback(async () => {
    if (!myEmail) return;
    try {
      const resIn = await apiClient.fetch(
        `${API_BASE}/documents/friend-requests?email=${encodeURIComponent(myEmail)}&type=received`
      );
      if (resIn.ok) {
        const data = await resIn.json();
        if (Array.isArray(data))
          setFriendRequests(data.filter((r: FriendRequest) => !r?.status || r?.status === 'pending'));
      }

      const resOut = await apiClient.fetch(
        `${API_BASE}/documents/friend-requests?email=${encodeURIComponent(myEmail)}&type=sent`
      );
      if (resOut.ok) {
        const dataOut = await resOut.json();
        if (Array.isArray(dataOut))
          setSentFriendRequests(dataOut.filter((r: FriendRequest) => !r?.status || r?.status === 'pending'));
      }
    } catch {}
  }, [myEmail]);

  const handleCancelFriendRequest = useCallback(async (reqId: string) => {
    try {
      await apiClient.fetch(`${API_BASE}/documents/friend-requests/${reqId}`, {
        method: 'DELETE',
      });
      setSentFriendRequests((prev) => prev.filter((r) => r.id !== reqId));
      onShowToast('info', 'Đã thu hồi', 'Đã thu hồi lời mời kết bạn.');
    } catch {
      onShowToast('error', 'Lỗi', 'Không thể thu hồi lời mời kết bạn.');
    }
  }, [onShowToast]);

  const handleAcceptFriendRequest = useCallback(async (req: FriendRequest) => {
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
            userAvatarUrl: currentUser?.avatarUrl || '',
          }),
        }
      );
      if (res.ok) {
        setFriendRequests((prev) => prev.filter((r) => r.id !== req.id));
        await fetchQGroups();
        onShowToast('success', 'Đã kết bạn thành công', req.senderName || req.senderEmail);
      }
    } catch {}
  }, [myEmail, myName, currentUser, fetchQGroups, onShowToast]);

  const handleRejectFriendRequest = useCallback(async (req: FriendRequest) => {
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
  }, [myEmail, onShowToast]);

  const handleAcceptGroupInv = useCallback(async (inv: QGroupInvitation) => {
    try {
      removeFromBlacklist(myEmail, inv.groupId, inv.groupCode);
      await apiClient.fetch(
        `${API_BASE}/documents/qgroups/invitations/${inv.id}/respond`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'accept',
            userEmail: myEmail,
            userName: myName,
            userAvatarUrl: currentUser?.avatarUrl || '',
          }),
        }
      );
      setGroupInvitations((prev) => prev.filter((i) => i.id !== inv.id));
      await fetchQGroups();
      setSelectedGroupId(inv.groupId);
      setShowMobileChat(true);
      setFilterTab('groups');
      onShowToast('success', 'Đã tham gia nhóm', inv.groupName);
    } catch {}
  }, [myEmail, myName, currentUser, fetchQGroups, setSelectedGroupId, setShowMobileChat, setFilterTab, onShowToast]);

  const handleRejectGroupInv = useCallback(async (inv: QGroupInvitation) => {
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
  }, [myEmail, onShowToast]);

  const handleCancelGroupInvitation = useCallback(async (invId: string) => {
    try {
      await apiClient.fetch(`${API_BASE}/documents/qgroups/invitations/${invId}`, {
        method: 'DELETE',
      });
      setSentGroupInvitations((prev) => prev.filter((i) => i.id !== invId));
      onShowToast('info', 'Đã thu hồi', 'Đã thu hồi lời mời tham gia nhóm.');
    } catch {
      onShowToast('error', 'Lỗi', 'Không thể thu hồi lời mời nhóm.');
    }
  }, [onShowToast]);

  return {
    groupInvitations,
    setGroupInvitations,
    sentGroupInvitations,
    setSentGroupInvitations,
    locallyInvitedGroupMembers,
    setLocallyInvitedGroupMembers,
    friendRequests,
    setFriendRequests,
    sentFriendRequests,
    setSentFriendRequests,
    invitationsTab,
    setInvitationsTab,
    isInvitationsOpen,
    setIsInvitationsOpen,
    fetchGroupInvitations,
    fetchFriendRequests,
    handleCancelFriendRequest,
    handleAcceptFriendRequest,
    handleRejectFriendRequest,
    handleAcceptGroupInv,
    handleRejectGroupInv,
    handleCancelGroupInvitation,
  };
}
