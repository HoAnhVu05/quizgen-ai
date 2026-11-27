import { useState, useRef, useCallback, useEffect } from 'react';
import type { QGroup } from '../../types';
import apiClient, { API_BASE } from '../../services/apiClient';
import type { ActiveHuddleInfo } from './ActiveHuddleBanner';
import type { IncomingHuddleData } from './IncomingHuddleModal';

interface UseQGroupHuddleParams {
  myEmail: string;
  qgroups: QGroup[];
  selectedGroupId: string;
  setSelectedGroupId: (id: string) => void;
  setShowMobileChat: (show: boolean) => void;
  chatContainerRef: React.RefObject<HTMLDivElement>;
  chatEndRef: React.RefObject<HTMLDivElement>;
  setFilterTab: (tab: any) => void;
  onShowToast: (
    type: 'success' | 'info' | 'warning' | 'error',
    title: string,
    message: string,
    onClick?: () => void
  ) => void;
}

export function useQGroupHuddle({
  myEmail,
  qgroups,
  selectedGroupId,
  setSelectedGroupId,
  setShowMobileChat,
  chatContainerRef,
  chatEndRef,
  setFilterTab,
  onShowToast,
}: UseQGroupHuddleParams) {
  const [isHuddleOpen, setIsHuddleOpen] = useState(false);
  const [activeHuddleRooms, setActiveHuddleRooms] = useState<{ [roomId: string]: ActiveHuddleInfo }>({});
  const [incomingHuddleCall, setIncomingHuddleCall] = useState<IncomingHuddleData | null>(null);

  const qgroupsRef = useRef(qgroups);
  qgroupsRef.current = qgroups;
  const selectedGroupIdRef = useRef(selectedGroupId);
  selectedGroupIdRef.current = selectedGroupId;
  const dismissedCallsRef = useRef<{ [roomId: string]: number }>({});

  // ── Mở phòng Huddle kèm kích hoạt âm thanh Autoplay trên di động ──────────
  const handleOpenHuddleWithAudioPrime = useCallback(() => {
    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        const dummyCtx = new AudioCtxClass();
        dummyCtx.resume().catch(() => {});
      }
    } catch {}
    setIsHuddleOpen(true);
  }, []);

  const fetchActiveHuddles = useCallback(async () => {
    try {
      const res = await apiClient.fetch(`${API_BASE}/huddle/active`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.rooms) {
          setActiveHuddleRooms(data.rooms);

          // Kiểm tra xem có cuộc gọi 1-1 nào đang gọi tới currentUser không
          if (!isHuddleOpen) {
            const now = Date.now();
            const incoming = Object.values(data.rooms as { [k: string]: any }).find((r: any) => {
              if (!r.isDirect) return false;
              if (r.isRinging === false) return false;
              if (r.callerEmail?.toLowerCase() === myEmail.toLowerCase()) return false;

              const matchGroup = qgroupsRef.current.find((g) => {
                if (!g.isDirect) return false;
                const directPartner = (g.directPartnerEmail || '').toLowerCase().trim();
                const owner = (g.ownerEmail || '').toLowerCase().trim();
                const members = (g.members || []).map((m: string) => m.toLowerCase().trim());
                return (
                  (directPartner === r.callerEmail?.toLowerCase() ||
                    owner === r.callerEmail?.toLowerCase() ||
                    members.includes(r.callerEmail?.toLowerCase())) &&
                  (owner === myEmail.toLowerCase() ||
                    directPartner === myEmail.toLowerCase() ||
                    members.includes(myEmail.toLowerCase()))
                );
              });
              if (!matchGroup) return false;

              const dismissedUntil = dismissedCallsRef.current[r.roomId];
              if (dismissedUntil && now < dismissedUntil) return false;

              return true;
            });

            if (incoming) {
              const matchGroup = qgroupsRef.current.find((g) => {
                if (!g.isDirect) return false;
                const directPartner = (g.directPartnerEmail || '').toLowerCase().trim();
                const owner = (g.ownerEmail || '').toLowerCase().trim();
                const members = (g.members || []).map((m: string) => m.toLowerCase().trim());
                return (
                  (directPartner === incoming.callerEmail?.toLowerCase() ||
                    owner === incoming.callerEmail?.toLowerCase() ||
                    members.includes(incoming.callerEmail?.toLowerCase())) &&
                  (owner === myEmail.toLowerCase() ||
                    directPartner === myEmail.toLowerCase() ||
                    members.includes(myEmail.toLowerCase()))
                );
              });

              setIncomingHuddleCall({
                roomId: incoming.roomId,
                callerName: incoming.callerName || 'Đồng nghiệp',
                callerEmail: incoming.callerEmail,
                groupName: matchGroup ? matchGroup.name : undefined,
                isDirect: true,
                groupId: matchGroup ? matchGroup.id : selectedGroupIdRef.current,
              });
            } else {
              setIncomingHuddleCall(null);
            }
          } else {
            setIncomingHuddleCall(null);
          }
        } else {
          setIncomingHuddleCall(null);
        }
      }
    } catch {
      // Ignored
    }
  }, [isHuddleOpen, myEmail]);

  // Lắng nghe sự kiện điều hướng từ bên ngoài (Toast Click / Global Huddle Accept)
  useEffect(() => {
    const handleOpenGroup = (e: any) => {
      const gid = e?.detail?.groupId || sessionStorage.getItem('qgroup_selected_group_id');
      if (gid) {
        setSelectedGroupId(gid);
        setShowMobileChat(true);
        const jumpDirectly = () => {
          if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
          }
          if (chatEndRef.current) {
            try {
              chatEndRef.current.scrollIntoView({ behavior: 'instant' as any, block: 'end' });
            } catch {
              chatEndRef.current.scrollIntoView(false);
            }
          }
        };
        jumpDirectly();
        requestAnimationFrame(jumpDirectly);
      }
    };

    const handleJoinHuddle = (e: any) => {
      const gid = e?.detail?.groupId || sessionStorage.getItem('qgroup_selected_group_id');
      if (gid) {
        setSelectedGroupId(gid);
        setShowMobileChat(true);
      }
      handleOpenHuddleWithAudioPrime();
    };

    window.addEventListener('quizgen:open-group', handleOpenGroup);
    window.addEventListener('quizgen:join-huddle', handleJoinHuddle);

    try {
      const targetEmail = sessionStorage.getItem('quizgen_target_chat_email');
      if (targetEmail) {
        sessionStorage.removeItem('quizgen_target_chat_email');
        const cleanTarget = targetEmail.trim().toLowerCase();
        const dm = qgroups.find((g) => {
          if (!g.isDirect) return false;
          const cleanOwner = (g.ownerEmail || '').trim().toLowerCase();
          const cleanPartner = (g.directPartnerEmail || '').trim().toLowerCase();
          const members = (g.members || []).map((m) => String(m).trim().toLowerCase());
          return cleanOwner === cleanTarget || cleanPartner === cleanTarget || members.includes(cleanTarget);
        });
        if (dm) {
          setSelectedGroupId(dm.id);
          setShowMobileChat(true);
          setFilterTab('all');
        }
      }
    } catch {}

    try {
      if (sessionStorage.getItem('quizgen_auto_open_huddle') === 'true') {
        sessionStorage.removeItem('quizgen_auto_open_huddle');
        handleOpenHuddleWithAudioPrime();
      }
    } catch {}

    return () => {
      window.removeEventListener('quizgen:open-group', handleOpenGroup);
      window.removeEventListener('quizgen:join-huddle', handleJoinHuddle);
    };
  }, [handleOpenHuddleWithAudioPrime, qgroups, chatContainerRef, chatEndRef, setSelectedGroupId, setShowMobileChat, setFilterTab]);

  const handleDeclineIncomingHuddle = useCallback((call: IncomingHuddleData) => {
    dismissedCallsRef.current[call.roomId] = Date.now() + 60000;
    setIncomingHuddleCall(null);
    try {
      apiClient.fetch(`${API_BASE}/huddle/${call.roomId}/leave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: myEmail }),
      }).catch(() => {});
    } catch {}
    onShowToast('info', 'Đã từ chối cuộc gọi', `Đã từ chối cuộc gọi Huddle từ ${call.callerName}`);
  }, [myEmail, onShowToast]);

  return {
    isHuddleOpen,
    setIsHuddleOpen,
    activeHuddleRooms,
    incomingHuddleCall,
    setIncomingHuddleCall,
    handleOpenHuddleWithAudioPrime,
    fetchActiveHuddles,
    handleDeclineIncomingHuddle,
  };
}
