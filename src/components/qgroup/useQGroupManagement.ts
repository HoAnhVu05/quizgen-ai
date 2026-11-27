import { useState, useCallback } from 'react';
import type { QGroup } from '../../types';
import apiClient, { API_BASE } from '../../services/apiClient';
import { addToBlacklist } from './qgroupHelpers';

interface UseQGroupManagementParams {
  myEmail: string;
  myName: string;
  qgroups: QGroup[];
  activeGroup: QGroup | null;
  selectedGroupId: string;
  setSelectedGroupId: (id: string) => void;
  setShowMobileChat: (show: boolean) => void;
  setIsChannelDetailsOpen: (open: boolean) => void;
  applyGroups: (groups: QGroup[]) => void;
  syncGroupsToBackend: (groups: QGroup[]) => Promise<void>;
  fetchQGroups: () => Promise<void>;
  fetchFriendRequests: () => Promise<void>;
  setConfirmDialog: (dialog: {
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    variant?: 'danger' | 'warning' | 'info';
    onConfirm: () => void;
  } | null) => void;
  onShowToast: (
    type: 'success' | 'info' | 'warning' | 'error',
    title: string,
    message: string,
    onClick?: () => void
  ) => void;
}

export function useQGroupManagement({
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
  fetchFriendRequests,
  setConfirmDialog,
  onShowToast,
}: UseQGroupManagementParams) {
  const [isTransferOwnerModalOpen, setIsTransferOwnerModalOpen] = useState(false);
  const [transferGroup, setTransferGroup] = useState<QGroup | null>(null);
  const [selectedNewOwner, setSelectedNewOwner] = useState<string>('');
  const [transferAlsoLeave, setTransferAlsoLeave] = useState<boolean>(false);
  const [isTransferringOwner, setIsTransferringOwner] = useState(false);

  const handleDeleteChat = useCallback(
    (group: QGroup) => {
      setConfirmDialog({
        isOpen: true,
        title: 'Xóa đoạn chat',
        message: `Bạn có chắc chắn muốn xóa đoạn chat "${group.name}"? Lịch sử tin nhắn sẽ bị xóa khỏi danh sách của bạn.`,
        confirmText: 'Xóa đoạn chat',
        variant: 'danger',
        onConfirm: async () => {
          addToBlacklist(myEmail, group.id, group.code);
          const next = qgroups.filter(
            (g) => g.id !== group.id && g.code !== group.code
          );
          applyGroups(next);
          if (selectedGroupId === group.id) {
            setSelectedGroupId(next[0]?.id || '');
            setShowMobileChat(false);
          }
          apiClient
            .fetch(`${API_BASE}/documents/qgroups/${encodeURIComponent(group.id)}`, {
              method: 'DELETE',
            })
            .catch(() => {});
          onShowToast('info', 'Đã xóa đoạn chat', group.name);
        },
      });
    },
    [myEmail, qgroups, applyGroups, selectedGroupId, setSelectedGroupId, setShowMobileChat, setConfirmDialog, onShowToast]
  );

  const handleUnfriend = useCallback(
    (targetEmail: string, targetName?: string) => {
      const displayName = targetName || targetEmail;
      setConfirmDialog({
        isOpen: true,
        title: 'Hủy kết bạn',
        message: `Bạn có chắc chắn muốn hủy kết bạn với "${displayName}" (${targetEmail})? Hành động này sẽ xóa quan hệ bạn bè và đóng cuộc trò chuyện 1-1.`,
        confirmText: 'Hủy kết bạn',
        variant: 'danger',
        onConfirm: async () => {
          try {
            await apiClient.fetch(`${API_BASE}/documents/friends/unfriend`, {
              method: 'POST',
              body: JSON.stringify({ myEmail, targetEmail }),
            });
            const cleanTarget = targetEmail.trim().toLowerCase();
            const next = qgroups.filter((g) => {
              if (g.isDirect || g.type === 'direct') {
                const members = (g.members || []).map((m) => m.toLowerCase().trim());
                const cleanOwner = (g.ownerEmail || '').toLowerCase().trim();
                const cleanPartner = (g.directPartnerEmail || '').toLowerCase().trim();
                if (members.includes(cleanTarget) || cleanOwner === cleanTarget || cleanPartner === cleanTarget) {
                  return false;
                }
              }
              return true;
            });
            applyGroups(next);
            void syncGroupsToBackend(next);
            await fetchQGroups();
            await fetchFriendRequests();
            if (activeGroup && (activeGroup.isDirect || activeGroup.type === 'direct')) {
              setSelectedGroupId(next[0]?.id || '');
              setShowMobileChat(false);
            }
            setIsChannelDetailsOpen(false);
            onShowToast('success', 'Đã hủy kết bạn', `Đã hủy kết bạn với ${displayName}.`);
          } catch (err: any) {
            onShowToast('error', 'Lỗi', err?.message || 'Không thể hủy kết bạn.');
          }
        },
      });
    },
    [myEmail, qgroups, applyGroups, syncGroupsToBackend, fetchQGroups, fetchFriendRequests, activeGroup, setSelectedGroupId, setShowMobileChat, setIsChannelDetailsOpen, setConfirmDialog, onShowToast]
  );

  const handleDisbandGroup = useCallback(
    async (group: QGroup) => {
      setConfirmDialog({
        isOpen: true,
        title: 'Giải tán nhóm học thuật',
        message: `CẢNH BÁO NGUY HIỂM: Bạn có chắc chắn muốn giải tán nhóm "${group.name}"? Toàn bộ thành viên sẽ bị xóa khỏi nhóm và toàn bộ lịch sử trò chuyện sẽ biến mất vĩnh viễn.`,
        confirmText: 'Giải tán nhóm',
        variant: 'danger',
        onConfirm: async () => {
          try {
            await apiClient.fetch(`${API_BASE}/documents/qgroups/${group.id}/disband`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ownerEmail: myEmail }),
            });
          } catch {}
          addToBlacklist(myEmail, group.id, group.code);
          const next = qgroups.filter(
            (g) => g.id !== group.id && g.code !== group.code
          );
          applyGroups(next);
          if (selectedGroupId === group.id) {
            setSelectedGroupId(next[0]?.id || '');
            setShowMobileChat(false);
          }
          setIsChannelDetailsOpen(false);
          onShowToast('success', 'Đã giải tán nhóm', group.name);
        },
      });
    },
    [myEmail, qgroups, applyGroups, selectedGroupId, setSelectedGroupId, setShowMobileChat, setIsChannelDetailsOpen, setConfirmDialog, onShowToast]
  );

  const handleLeaveGroup = useCallback(
    async (group: QGroup) => {
      if (group.isDirect || group.type === 'direct') {
        handleDeleteChat(group);
        return;
      }

      const isOwner = (group.ownerEmail || '').toLowerCase() === myEmail.toLowerCase();
      if (isOwner && !group.isDirect) {
        const otherMembers = (group.members || []).filter(
          (m) => m.toLowerCase() !== myEmail.toLowerCase()
        );
        if (otherMembers.length === 0) {
          setConfirmDialog({
            isOpen: true,
            title: 'Giải tán nhóm',
            message: `Bạn là thành viên duy nhất trong nhóm "${group.name}". Rời nhóm sẽ đồng thời giải tán nhóm vĩnh viễn. Bạn có đồng ý giải tán nhóm không?`,
            confirmText: 'Đồng ý giải tán',
            variant: 'danger',
            onConfirm: () => handleDisbandGroup(group),
          });
          return;
        }

        setTransferGroup(group);
        setSelectedNewOwner(otherMembers[0] || '');
        setTransferAlsoLeave(true);
        setIsTransferOwnerModalOpen(true);
        return;
      }

      setConfirmDialog({
        isOpen: true,
        title: 'Rời khỏi kênh',
        message: `Bạn có chắc chắn muốn rời khỏi kênh "${group.name}"? Bạn sẽ không thể gửi tin nhắn trừ khi được mời lại.`,
        confirmText: 'Rời khỏi kênh',
        variant: 'danger',
        onConfirm: async () => {
          try {
            await apiClient.fetch(`${API_BASE}/documents/qgroups/${group.id}/leave`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userEmail: myEmail,
                userName: myName,
              }),
            });
          } catch {}
          addToBlacklist(myEmail, group.id, group.code);
          const next = qgroups.filter(
            (g) => g.id !== group.id && g.code !== group.code
          );
          applyGroups(next);
          if (selectedGroupId === group.id) {
            setSelectedGroupId(next[0]?.id || '');
            setShowMobileChat(false);
          }
          onShowToast('info', 'Đã rời khỏi nhóm', group.name);
        },
      });
    },
    [myEmail, myName, qgroups, applyGroups, selectedGroupId, setSelectedGroupId, setShowMobileChat, handleDisbandGroup, handleDeleteChat, setConfirmDialog, onShowToast]
  );

  const handleOpenTransferOwnership = useCallback(
    (group: QGroup, preselectedEmail?: string) => {
      const otherMembers = (group.members || []).filter(
        (m) => m.toLowerCase() !== myEmail.toLowerCase()
      );
      if (otherMembers.length === 0) {
        onShowToast(
          'info',
          'Chưa có thành viên khác',
          'Nhóm cần có ít nhất 1 thành viên khác để chuyển quyền Trưởng nhóm. Vui lòng mời giảng viên khác vào nhóm trước.'
        );
        return;
      }
      setTransferGroup(group);
      setSelectedNewOwner(
        preselectedEmail && otherMembers.some((m) => m.toLowerCase() === preselectedEmail.toLowerCase())
          ? preselectedEmail
          : otherMembers[0] || ''
      );
      setTransferAlsoLeave(false);
      setIsTransferOwnerModalOpen(true);
    },
    [myEmail, onShowToast]
  );

  const handleTransferOwnerAndLeave = useCallback(async () => {
    if (!transferGroup || !selectedNewOwner) return;
    setIsTransferringOwner(true);
    try {
      const res = await apiClient.fetch(
        `${API_BASE}/documents/qgroups/${transferGroup.id}/transfer-owner`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            currentOwnerEmail: myEmail,
            currentOwnerName: myName,
            newOwnerEmail: selectedNewOwner,
            newOwnerName: selectedNewOwner.split('@')[0],
            alsoLeave: transferAlsoLeave,
          }),
        }
      );
      if (res.ok) {
        if (transferAlsoLeave) {
          addToBlacklist(myEmail, transferGroup.id, transferGroup.code);
          const next = qgroups.filter(
            (g) => g.id !== transferGroup.id && g.code !== transferGroup.code
          );
          applyGroups(next);
          if (selectedGroupId === transferGroup.id) {
            setSelectedGroupId(next[0]?.id || '');
          }
          onShowToast(
            'success',
            'Chuyển quyền thành công',
            `Đã chuyển quyền Trưởng nhóm cho ${selectedNewOwner} và rời khỏi nhóm.`
          );
        } else {
          const next = qgroups.map((g) => {
            if (g.id === transferGroup.id || g.code === transferGroup.code) {
              return { ...g, ownerEmail: selectedNewOwner, ownerName: selectedNewOwner.split('@')[0] };
            }
            return g;
          });
          applyGroups(next);
          onShowToast(
            'success',
            'Chuyển quyền thành công',
            `Đã chuyển giao vai trò Trưởng nhóm cho ${selectedNewOwner}. Bạn vẫn là thành viên của nhóm.`
          );
        }
        setIsTransferOwnerModalOpen(false);
        setTransferGroup(null);
      } else {
        onShowToast('error', 'Lỗi', 'Không thể chuyển quyền trưởng nhóm.');
      }
    } catch {
      onShowToast('error', 'Lỗi', 'Lỗi kết nối khi chuyển quyền.');
    } finally {
      setIsTransferringOwner(false);
    }
  }, [transferGroup, selectedNewOwner, transferAlsoLeave, myEmail, myName, qgroups, applyGroups, selectedGroupId, setSelectedGroupId, onShowToast]);


  return {
    isTransferOwnerModalOpen,
    setIsTransferOwnerModalOpen,
    transferGroup,
    setTransferGroup,
    selectedNewOwner,
    setSelectedNewOwner,
    transferAlsoLeave,
    setTransferAlsoLeave,
    isTransferringOwner,
    handleDeleteChat,
    handleUnfriend,
    handleDisbandGroup,
    handleLeaveGroup,
    handleOpenTransferOwnership,
    handleTransferOwnerAndLeave,
  };
}
