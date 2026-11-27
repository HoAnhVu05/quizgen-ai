import { useCallback } from 'react';
import type { QGroup } from '../../types';
import apiClient, { API_BASE } from '../../services/apiClient';
import { toggleGroupMute } from '../../utils/notificationPrefs';

interface UseQGroupAdminActionsParams {
  myEmail: string;
  myName: string;
  qgroups: QGroup[];
  setIsChannelDetailsOpen: (open: boolean) => void;
  setDetailsGroup: (group: QGroup | null) => void;
  applyGroups: (groups: QGroup[]) => void;
  syncGroupsToBackend: (groups: QGroup[]) => Promise<void>;
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

export function useQGroupAdminActions({
  myEmail,
  myName,
  qgroups,
  setIsChannelDetailsOpen,
  setDetailsGroup,
  applyGroups,
  syncGroupsToBackend,
  setConfirmDialog,
  onShowToast,
}: UseQGroupAdminActionsParams) {
  const handleKickMember = useCallback(
    async (group: QGroup, targetEmail: string, targetName: string) => {
      setConfirmDialog({
        isOpen: true,
        title: 'Loại thành viên',
        message: `Bạn có chắc chắn muốn loại "${targetName}" (${targetEmail}) ra khỏi kênh học thuật?`,
        confirmText: 'Loại khỏi kênh',
        variant: 'danger',
        onConfirm: async () => {
          const filteredMembers = (group.members || []).filter(
            (m) => m.toLowerCase() !== targetEmail.toLowerCase()
          );
          const optimisticGroup = { ...group, members: filteredMembers };
          setDetailsGroup(optimisticGroup);
          applyGroups(qgroups.map((g) => (g.id === group.id ? optimisticGroup : g)));

          try {
            const res = await apiClient
              .fetch(`${API_BASE}/documents/qgroups/${group.id}/kick-member`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  targetEmail,
                  targetName,
                  adminName: myName,
                }),
              })
              .then((r) => r.json());

            if (res.status === 'success' && res.group) {
              const updated = qgroups.map((g) => (g.id === group.id ? res.group : g));
              applyGroups(updated);
              setDetailsGroup(res.group);
              onShowToast('success', 'Đã loại thành viên', `${targetName} đã rời khỏi nhóm.`);
            } else {
              applyGroups(qgroups);
              setDetailsGroup(group);
              onShowToast('warning', 'Không thể loại thành viên', res.message || 'Lỗi thao tác');
            }
          } catch {
            applyGroups(qgroups);
            setDetailsGroup(group);
            onShowToast('error', 'Lỗi kết nối', 'Không thể gửi yêu cầu loại thành viên.');
          }
        },
      });
    },
    [myName, qgroups, applyGroups, setDetailsGroup, setConfirmDialog, onShowToast]
  );

  const handleRespondJoinRequest = useCallback(
    async (
      group: QGroup,
      requestId: string,
      targetEmail: string,
      action: 'approve' | 'reject'
    ) => {
      const cleanEmail = targetEmail.trim().toLowerCase();
      const updatedPending = (group.pendingRequests || []).filter(
        (r) => r.id !== requestId && r.email.toLowerCase() !== cleanEmail
      );
      const updatedMembers =
        action === 'approve'
          ? Array.from(new Set([...(group.members || []), cleanEmail]))
          : group.members || [];

      const optimisticGroup: QGroup = {
        ...group,
        pendingRequests: updatedPending,
        members: updatedMembers,
        memberCount: updatedMembers.length,
        messages: (group.messages || []).map((m: any) => {
          if (
            m.isJoinRequest &&
            (m.joinRequestId === requestId || m.joinUserEmail?.toLowerCase() === cleanEmail)
          ) {
            return {
              ...m,
              isJoinRequestHandled: true,
              joinRequestStatus: action,
              text: `${action === 'approve' ? '✓ Đã phê duyệt' : '✕ Đã từ chối'} yêu cầu tham gia của ${
                m.joinUserName || cleanEmail
              }.`,
            };
          }
          return m;
        }),
      };

      const updated = qgroups.map((g) => (g.id === group.id ? optimisticGroup : g));
      applyGroups(updated);
      setDetailsGroup(optimisticGroup);

      if (action === 'approve') {
        onShowToast('success', 'Đã phê duyệt', 'Thành viên mới đã được thêm vào nhóm.');
      } else {
        onShowToast('info', 'Đã từ chối', 'Đã từ chối yêu cầu tham gia.');
      }

      try {
        const res = await apiClient
          .fetch(`${API_BASE}/documents/qgroups/${group.id}/respond-join-request`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              requestId,
              targetEmail: cleanEmail,
              action,
              adminName: myName,
            }),
          })
          .then((r) => r.json());

        if (res.status === 'success' && res.group) {
          const synced = qgroups.map((g) => (g.id === group.id ? res.group : g));
          applyGroups(synced);
          setDetailsGroup(res.group);
        }
      } catch {}
    },
    [myName, qgroups, applyGroups, setDetailsGroup, onShowToast]
  );

  const handleSaveGroupSettings = useCallback(
    async (
      group: QGroup,
      name: string,
      dept: string,
      desc: string,
      joinPolicy: 'open' | 'approval_required' | 'invite_only'
    ) => {
      try {
        const res = await apiClient
          .fetch(`${API_BASE}/documents/qgroups/${group.id}/settings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name,
              department: dept,
              description: desc,
              joinPolicy,
              adminName: myName,
            }),
          })
          .then((r) => r.json());

        if (res.status === 'success' && res.group) {
          const updated = qgroups.map((g) => (g.id === group.id ? res.group : g));
          applyGroups(updated);
          onShowToast('success', 'Đã lưu cài đặt nhóm', name);
          setIsChannelDetailsOpen(false);
        }
      } catch {
        const updated = qgroups.map((g) =>
          g.id === group.id
            ? { ...g, name, department: dept, description: desc, joinPolicy }
            : g
        );
        applyGroups(updated);
        void syncGroupsToBackend(updated);
        onShowToast('success', 'Đã lưu cài đặt nhóm', name);
        setIsChannelDetailsOpen(false);
      }
    },
    [myName, qgroups, applyGroups, syncGroupsToBackend, setIsChannelDetailsOpen, onShowToast]
  );

  const handleToggleMute = useCallback(
    (group: QGroup) => {
      const isNowMuted = toggleGroupMute(group.id, myEmail);
      const updated = qgroups.map((g) =>
        g.id === group.id ? { ...g, muted: isNowMuted } : g
      );
      applyGroups(updated);
      onShowToast(
        'info',
        'Âm thanh thông báo',
        isNowMuted
          ? 'Đã tắt chuông cuộc gọi và tin nhắn hội thoại này (vẫn nhận thông báo im lặng)'
          : 'Đã bật chuông thông báo hội thoại này'
      );
    },
    [qgroups, applyGroups, onShowToast, myEmail]
  );

  return {
    handleKickMember,
    handleRespondJoinRequest,
    handleSaveGroupSettings,
    handleToggleMute,
  };
}
