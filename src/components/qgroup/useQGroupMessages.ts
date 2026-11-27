import { useState, useCallback } from 'react';
import type { QGroup, QGroupMessage } from '../../types';
import apiClient, { API_BASE } from '../../services/apiClient';
import { toggleConversationPin } from '../../utils/notificationPrefs';

interface UseQGroupMessagesParams {
  activeGroup: QGroup | null;
  qgroups: QGroup[];
  myEmail: string;
  applyGroups: (groups: QGroup[]) => void;
  syncGroupsToBackend: (groups: QGroup[]) => Promise<void>;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
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

export function useQGroupMessages({
  activeGroup,
  qgroups,
  myEmail,
  applyGroups,
  syncGroupsToBackend,
  textareaRef,
  setConfirmDialog,
  onShowToast,
}: UseQGroupMessagesParams) {
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [replyingToMessage, setReplyingToMessage] = useState<QGroupMessage | null>(null);
  const [highlightedMsgId, setHighlightedMsgId] = useState<string | null>(null);
  const [activePinnedIdx, setActivePinnedIdx] = useState(0);

  const handleToggleReaction = useCallback(
    async (msgId: string, emoji: string) => {
      if (!activeGroup) return;
      const updated = qgroups.map((g) => {
        if (g.id !== activeGroup.id) return g;
        const msgs = (g.messages || []).map((m) => {
          if (m.id !== msgId) return m;
          const currentReactions = { ...(m.reactions || {}) };
          const userList = currentReactions[emoji] || [];
          if (userList.includes(myEmail)) {
            currentReactions[emoji] = userList.filter((u) => u !== myEmail);
            if (currentReactions[emoji].length === 0) {
              delete currentReactions[emoji];
            }
          } else {
            currentReactions[emoji] = [...userList, myEmail];
          }
          return { ...m, reactions: currentReactions };
        });
        return { ...g, messages: msgs };
      });
      applyGroups(updated);

      try {
        await apiClient.fetch(
          `${API_BASE}/documents/qgroups/${encodeURIComponent(activeGroup.id)}/messages/${encodeURIComponent(msgId)}/reaction`,
          {
            method: 'POST',
            body: JSON.stringify({ emoji, userEmail: myEmail }),
          }
        );
      } catch (err) {
        console.error('Failed to sync message reaction to backend:', err);
      }
    },
    [activeGroup, qgroups, myEmail, applyGroups]
  );

  const handleStartReply = useCallback((msg: QGroupMessage) => {
    setReplyingToMessage(msg);
    textareaRef.current?.focus();
  }, [textareaRef]);

  const handleJumpToMessage = useCallback(
    (msgId?: string) => {
      if (!msgId) return;
      const el = document.getElementById(`chat-msg-${msgId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setHighlightedMsgId(msgId);
        setTimeout(() => {
          setHighlightedMsgId((curr) => (curr === msgId ? null : curr));
        }, 2500);
      } else {
        onShowToast('info', 'Không tìm thấy tin nhắn gốc', 'Tin nhắn có thể ở kênh khác hoặc đã bị xóa.');
      }
    },
    [onShowToast]
  );

  const handleStartEditMessage = useCallback((msg: QGroupMessage) => {
    setEditingMessageId(msg.id);
    setEditText(msg.text || '');
  }, []);

  const handleSaveEditMessage = useCallback(
    async (msgId: string) => {
      if (!activeGroup || !editText.trim()) return;
      const textToSave = editText.trim();
      const updated = qgroups.map((g) => {
        if (g.id !== activeGroup.id) return g;
        const msgs = (g.messages || []).map((m) => {
          if (m.id !== msgId) return m;
          return { ...m, text: textToSave, isEdited: true };
        });
        return { ...g, messages: msgs };
      });
      applyGroups(updated);
      setEditingMessageId(null);
      setEditText('');
      onShowToast('success', 'Đã cập nhật', 'Nội dung tin nhắn đã được chỉnh sửa.');

      try {
        await apiClient.fetch(
          `${API_BASE}/documents/qgroups/${encodeURIComponent(activeGroup.id)}/messages/${encodeURIComponent(msgId)}`,
          {
            method: 'PATCH',
            body: JSON.stringify({ text: textToSave }),
          }
        );
      } catch (err) {
        console.error('Failed to sync edited message to backend:', err);
      }
    },
    [activeGroup, qgroups, editText, applyGroups, onShowToast]
  );

  const handleRecallMessage = useCallback(
    async (msgId: string) => {
      if (!activeGroup) return;
      const updated = qgroups.map((g) => {
        if (g.id !== activeGroup.id) return g;
        const msgs = (g.messages || []).map((m) => {
          if (m.id !== msgId) return m;
          return {
            ...m,
            text: 'Tin nhắn đã được thu hồi',
            isRecalled: true,
            attachment: undefined,
            sharedPost: undefined,
          };
        });
        return { ...g, messages: msgs };
      });
      applyGroups(updated);
      onShowToast('info', 'Đã thu hồi', 'Tin nhắn của Thầy/Cô đã được thu hồi.');

      try {
        await apiClient.fetch(
          `${API_BASE}/documents/qgroups/${encodeURIComponent(activeGroup.id)}/messages/${encodeURIComponent(msgId)}/recall`,
          { method: 'POST' }
        );
      } catch (err) {
        console.error('Failed to sync recalled message to backend:', err);
      }
    },
    [activeGroup, qgroups, applyGroups, onShowToast]
  );

  const handleDeleteMessage = useCallback(
    (msgId: string) => {
      if (!activeGroup) return;
      setConfirmDialog({
        isOpen: true,
        title: 'Xóa tin nhắn',
        message: 'Bạn có chắc chắn muốn xóa tin nhắn này vĩnh viễn khỏi cuộc trò chuyện?',
        confirmText: 'Xóa tin nhắn',
        variant: 'danger',
        onConfirm: async () => {
          const updated = qgroups.map((g) => {
            if (g.id !== activeGroup.id) return g;
            const msgs = (g.messages || []).filter((m) => m.id !== msgId);
            return { ...g, messages: msgs };
          });
          applyGroups(updated);
          void syncGroupsToBackend(updated);
          onShowToast('info', 'Đã xóa tin nhắn', 'Tin nhắn đã được xóa khỏi cuộc trò chuyện.');
          try {
            await apiClient.fetch(
              `${API_BASE}/documents/qgroups/${encodeURIComponent(activeGroup.id)}/messages/${encodeURIComponent(msgId)}`,
              { method: 'DELETE' }
            );
          } catch (err) {
            console.error('Failed to sync deleted message to backend:', err);
          }
        },
      });
    },
    [activeGroup, qgroups, applyGroups, syncGroupsToBackend, setConfirmDialog, onShowToast]
  );

  const handleDeleteSingleAttachment = useCallback(
    (msgId: string, attIdentifier: string | number) => {
      if (!activeGroup) return;
      const targetMsg = (activeGroup.messages || []).find((m) => m.id === msgId);
      if (!targetMsg) return;

      const currentAttachments: any[] =
        targetMsg.attachments && targetMsg.attachments.length > 0
          ? targetMsg.attachments
          : targetMsg.attachment
          ? [targetMsg.attachment]
          : [];

      const targetAtt = currentAttachments.find(
        (att, idx) =>
          att.id === attIdentifier ||
          idx === attIdentifier ||
          `${targetMsg.id}-att-${idx}` === attIdentifier
      );
      const attName = targetAtt?.name || 'tệp này';

      setConfirmDialog({
        isOpen: true,
        title: 'Xóa tệp đính kèm',
        message: `Bạn có chắc chắn muốn xóa "${attName}" khỏi tin nhắn này?`,
        confirmText: 'Xóa tệp',
        variant: 'danger',
        onConfirm: async () => {
          const remaining = currentAttachments.filter(
            (att, idx) =>
              att.id !== attIdentifier &&
              idx !== attIdentifier &&
              `${targetMsg.id}-att-${idx}` !== attIdentifier
          );

          const shouldRecall =
            remaining.length === 0 && (!targetMsg.text || targetMsg.text.trim() === '');

          const updated = qgroups.map((g) => {
            if (g.id !== activeGroup.id) return g;
            const msgs = (g.messages || []).map((m) => {
              if (m.id !== msgId) return m;
              if (shouldRecall) {
                return {
                  ...m,
                  text: 'Tin nhắn đã được thu hồi',
                  isRecalled: true,
                  attachment: undefined,
                  attachments: undefined,
                };
              }
              return {
                ...m,
                attachments: remaining,
                attachment: remaining[0] || undefined,
              };
            });
            return { ...g, messages: msgs };
          });

          applyGroups(updated);
          void syncGroupsToBackend(updated);
          onShowToast('info', 'Đã xóa tệp', `Đã xóa 1 tệp đính kèm khỏi tin nhắn.`);

          try {
            if (shouldRecall) {
              await apiClient.fetch(
                `${API_BASE}/documents/qgroups/${encodeURIComponent(activeGroup.id)}/messages/${encodeURIComponent(msgId)}/recall`,
                { method: 'POST' }
              );
            } else {
              await apiClient.fetch(
                `${API_BASE}/documents/qgroups/${encodeURIComponent(activeGroup.id)}/messages/${encodeURIComponent(msgId)}`,
                {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ attachments: remaining }),
                }
              );
            }
          } catch (err) {
            console.error('Failed to sync deleted attachment to server:', err);
          }
        },
      });
    },
    [activeGroup, qgroups, applyGroups, syncGroupsToBackend, setConfirmDialog, onShowToast]
  );

  const handleTogglePinMessage = useCallback(
    async (msgId: string) => {
      if (!activeGroup) return;
      let nowPinned = false;
      const updated = qgroups.map((g) => {
        if (g.id !== activeGroup.id) return g;
        const msgs = (g.messages || []).map((m) => {
          if (m.id !== msgId) return m;
          nowPinned = !m.isPinned;
          return { ...m, isPinned: nowPinned };
        });
        return { ...g, messages: msgs };
      });
      applyGroups(updated);
      onShowToast(
        'info',
        nowPinned ? 'Đã ghim tin nhắn' : 'Đã bỏ ghim',
        nowPinned
          ? 'Tin nhắn đã được ghim lên đầu cuộc trò chuyện'
          : 'Đã bỏ ghim tin nhắn'
      );

      try {
        await apiClient.fetch(
          `${API_BASE}/documents/qgroups/${encodeURIComponent(activeGroup.id)}/messages/${encodeURIComponent(msgId)}/pin`,
          { method: 'POST' }
        );
      } catch (err) {
        console.error('Failed to sync pin status to backend:', err);
      }
    },
    [activeGroup, qgroups, applyGroups, onShowToast]
  );

  const handleTogglePinConversation = useCallback(
    (group: QGroup) => {
      const cleanMyEmail = myEmail.toLowerCase().trim();
      const nowPinned = toggleConversationPin(group.id, cleanMyEmail, group.pinnedBy);
      const updated = qgroups.map((g) => {
        if (g.id !== group.id && g.code !== group.code) return g;
        const currentList = (g.pinnedBy || []).map((e) => e.toLowerCase());
        let nextPinnedBy: string[];
        if (nowPinned) {
          nextPinnedBy = Array.from(new Set([...currentList, cleanMyEmail]));
        } else {
          nextPinnedBy = currentList.filter((e) => e !== cleanMyEmail);
        }
        return {
          ...g,
          isPinned: nowPinned,
          pinnedBy: nextPinnedBy,
        };
      });
      applyGroups(updated);
      void syncGroupsToBackend(updated);
      onShowToast(
        'info',
        nowPinned ? 'Đã ghim hội thoại' : 'Đã bỏ ghim hội thoại',
        nowPinned
          ? `"${group.name || group.directPartnerName}" được ghim lên đầu danh sách`
          : `Đã bỏ ghim "${group.name || group.directPartnerName}"`
      );
    },
    [qgroups, myEmail, applyGroups, syncGroupsToBackend, onShowToast]
  );

  return {
    editingMessageId,
    setEditingMessageId,
    editText,
    setEditText,
    replyingToMessage,
    setReplyingToMessage,
    highlightedMsgId,
    activePinnedIdx,
    setActivePinnedIdx,
    handleToggleReaction,
    handleStartReply,
    handleJumpToMessage,
    handleStartEditMessage,
    handleSaveEditMessage,
    handleRecallMessage,
    handleDeleteMessage,
    handleDeleteSingleAttachment,
    handleTogglePinMessage,
    handleTogglePinConversation,
  };
}
