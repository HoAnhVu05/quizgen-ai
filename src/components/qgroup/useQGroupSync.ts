import { useState, useRef, useCallback, useMemo } from 'react';
import type { QGroup } from '../../types';
import apiClient, { API_BASE } from '../../services/apiClient';
import { deduplicateDMsAndChannels } from './chatUtils';
import {
  getBlacklist,
  removeFromBlacklist,
  isGroupMemberOrOwner,
  flattenGroups,
  dedupMessages,
  getGroupSortTime,
} from './qgroupHelpers';
import { isGroupMuted, isConversationPinned } from '../../utils/notificationPrefs';
import { saveUserAvatarSync } from '../../utils/avatarHelper';

interface UseQGroupSyncParams {
  myEmail: string;
  myName: string;
  selectedGroupId: string;
  setSelectedGroupId: (id: string) => void;
  setShowMobileChat: (show: boolean) => void;
  hiddenGroupIds: Set<string>;
  filterTab: 'all' | 'unread' | 'groups' | 'friends' | 'invitations';
  searchQuery: string;
  onShowToast: (
    type: 'success' | 'info' | 'warning' | 'error',
    title: string,
    message: string,
    onClick?: () => void
  ) => void;
}

export function useQGroupSync({
  myEmail,
  myName,
  selectedGroupId,
  setSelectedGroupId,
  setShowMobileChat,
  hiddenGroupIds,
  filterTab,
  searchQuery,
  onShowToast,
}: UseQGroupSyncParams) {
  const [qgroups, setQgroups] = useState<QGroup[]>([]);
  const prevMsgCount = useRef<Record<string, number>>({});

  const playBeep = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(780, ctx.currentTime);
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.14);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.14);
    } catch {}
  }, []);

  const playMentionChime = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      osc1.type = 'triangle';
      osc2.type = 'triangle';
      osc1.frequency.setValueAtTime(880, ctx.currentTime);
      osc2.frequency.setValueAtTime(1174.66, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);
      osc1.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 0.15);
      osc2.start(ctx.currentTime + 0.08);
      osc2.stop(ctx.currentTime + 0.35);
    } catch {}
  }, []);

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
      const filtered = groups.filter((g) => !bl.has(g.id) && !bl.has(g.code));
      const cleanList = deduplicateDMsAndChannels(filtered).map((g) => ({
        ...g,
        updatedAt: getGroupSortTime(g),
      }));
      setQgroups(cleanList);
      try {
        localStorage.setItem('quizgen_qgroups', JSON.stringify(cleanList));
      } catch {}
    },
    [myEmail]
  );

  const fetchQGroups = useCallback(async () => {
    try {
      const url = myEmail
        ? `${API_BASE}/documents/qgroups?email=${encodeURIComponent(myEmail)}`
        : `${API_BASE}/documents/qgroups`;
      const res = await apiClient.fetch(url);
      if (!res.ok) return;
      const remote = await res.json();
      if (!Array.isArray(remote)) return;

      const bl = getBlacklist(myEmail);
      const remoteClean = flattenGroups(remote).filter((g) => {
        if (isGroupMemberOrOwner(g, myEmail)) {
          removeFromBlacklist(myEmail, g.id, g.code);
          return true;
        }
        return false;
      });

      const merged = deduplicateDMsAndChannels([...remoteClean]);
      const seen = new Set<string>();
      const deduped: QGroup[] = [];

      for (const g of merged) {
        if ((g as any).ownerAvatarUrl && g.ownerEmail) {
          saveUserAvatarSync(g.ownerEmail, (g as any).ownerAvatarUrl);
        }
        if ((g as any).directPartnerAvatarUrl && g.directPartnerEmail) {
          saveUserAvatarSync(g.directPartnerEmail, (g as any).directPartnerAvatarUrl);
        }
        (g.messages || []).forEach((m) => {
          if (m.senderEmail && m.senderAvatarUrl) {
            saveUserAvatarSync(m.senderEmail, m.senderAvatarUrl);
          }
        });

        const key = (g.code || g.id || '').trim();
        const isActiveMember = isGroupMemberOrOwner(g, myEmail);
        if (!key || !isActiveMember || bl.has(key)) continue;
        if (seen.has(key)) continue;
        seen.add(key);

        const cleanMsgs = dedupMessages(g.messages || []);
        const localGroup = qgroups.find((lg) => lg.id === g.id || lg.code === g.code);
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
        const isMuted = isGroupMuted(g.id, myEmail);
        const isPinned = isConversationPinned(g.id, myEmail, g.pinnedBy);
        deduped.push({ ...g, messages: cleanMsgs, updatedAt: calculatedTime, muted: isMuted, isPinned });
      }

      deduped.forEach((g) => {
        const msgs = g.messages || [];
        const prev = prevMsgCount.current[g.id] ?? msgs.length;
        if (msgs.length > prev) {
          const last = msgs[msgs.length - 1];
          if (last && last.senderEmail?.toLowerCase() !== myEmail && !last.isSystem) {
            if (g.id === selectedGroupId) {
              prevMsgCount.current[g.id] = msgs.length;
              return;
            }

            const lastText = (last.text || '').toLowerCase();
            const cleanMyEmail = myEmail.toLowerCase();
            const cleanMyName = (myName || '').toLowerCase();
            const isMentioned = Boolean(
              (cleanMyName && lastText.includes(`@${cleanMyName}`)) ||
                lastText.includes(`@${cleanMyEmail.split('@')[0]}`) ||
                lastText.includes('@all') ||
                lastText.includes('@everyone') ||
                lastText.includes('@kênh')
            );

            const isMuted = isGroupMuted(g.id, myEmail);
            const isDirectChat = Boolean(g.isDirect || g.type === 'direct');
            const categoryTag = isDirectChat ? '[Bạn bè]' : `[Nhóm #${g.name}]`;
            const senderDisplay = last.senderName || 'Đồng nghiệp';

            if (isMentioned) {
              playMentionChime();
              onShowToast(
                'warning',
                `🔔 ${categoryTag} ${senderDisplay} đã nhắc đến bạn!`,
                last.text || '[Tệp đính kèm]',
                () => {
                  setSelectedGroupId(g.id);
                  setShowMobileChat(true);
                }
              );
            } else {
              if (!isMuted) playBeep();
              onShowToast(
                'info',
                `${categoryTag} Tin nhắn mới từ ${senderDisplay}`,
                last.text || '[Tệp đính kèm]',
                () => {
                  setSelectedGroupId(g.id);
                  setShowMobileChat(true);
                }
              );
            }
          }
        }
        prevMsgCount.current[g.id] = msgs.length;
      });

      applyGroups(deduped);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myEmail, myName, selectedGroupId, applyGroups, playBeep, playMentionChime, onShowToast]);

  const sortedGroups = useMemo(() => {
    return qgroups
      .filter((g) => !hiddenGroupIds.has(g.id))
      .filter((g) => {
        const matchesSearch =
          !searchQuery ||
          g.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          g.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          g.directPartnerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          g.directPartnerEmail?.toLowerCase().includes(searchQuery.toLowerCase());
        if (!matchesSearch) return false;
        if (filterTab === 'groups') return !g.isDirect;
        if (filterTab === 'friends') return g.isDirect;
        if (filterTab === 'unread') {
          const msgs = g.messages || [];
          const last = msgs[msgs.length - 1];
          return Boolean(
            last &&
              last.senderEmail?.toLowerCase() !== myEmail &&
              !(last.readBy || []).some((r) => r.toLowerCase() === myEmail)
          );
        }
        return true;
      })
      .sort((a, b) => {
        const aPinned = Boolean(a.isPinned || isConversationPinned(a.id, myEmail, a.pinnedBy));
        const bPinned = Boolean(b.isPinned || isConversationPinned(b.id, myEmail, b.pinnedBy));
        if (aPinned && !bPinned) return -1;
        if (!aPinned && bPinned) return 1;
        return getGroupSortTime(b) - getGroupSortTime(a);
      });
  }, [qgroups, searchQuery, filterTab, myEmail, hiddenGroupIds]);

  const unreadCount = useMemo(() => {
    return qgroups
      .filter((g) => !hiddenGroupIds.has(g.id))
      .filter((g) => {
        const msgs = g.messages || [];
        const last = msgs[msgs.length - 1];
        return Boolean(
          last &&
            last.senderEmail?.toLowerCase() !== myEmail &&
            !(last.readBy || []).some((r) => r.toLowerCase() === myEmail)
        );
      }).length;
  }, [qgroups, myEmail, hiddenGroupIds]);

  return {
    qgroups,
    setQgroups,
    applyGroups,
    syncGroupsToBackend,
    fetchQGroups,
    sortedGroups,
    unreadCount,
  };
}
