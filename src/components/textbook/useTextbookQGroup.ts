import { useState, useEffect } from 'react';
import { UserProfile } from '../../types';
import { QGroup, QGroupMessage, QGroupInvitation, QGroupPendingRequest } from './types';
import { INITIAL_QGROUPS, INITIAL_GROUP_INVITATIONS } from './qgroupInitialData';
import { buildNewDirectGroup, buildNewQGroup } from './qgroupHelpers';

interface UseTextbookQGroupProps {
  currentUser?: UserProfile | null;
  onShowToast: (type: 'success' | 'info' | 'warning' | 'error', title: string, message: string) => void;
}

export function useTextbookQGroup({ currentUser, onShowToast }: UseTextbookQGroupProps) {
  const [qgroups, setQgroups] = useState<QGroup[]>(() => {
    try {
      const saved = localStorage.getItem('quizgen_qgroups');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const valid = parsed.filter((g: any) => g && g.id && g.name);
          if (valid.length > 0) return valid;
        }
      }
    } catch {}
    return INITIAL_QGROUPS;
  });

  const [selectedGroupId, setSelectedGroupId] = useState<string>('qg-1');
  const [chatInputText, setChatInputText] = useState('');
  const [groupSearchQuery, setGroupSearchQuery] = useState('');
  const [sidebarGroupFilter, setSidebarGroupFilter] = useState<'groups' | 'direct' | 'invitations'>('groups');
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [isChatSearchOpen, setIsChatSearchOpen] = useState(false);
  const [isAttachMenuOpen, setIsAttachMenuOpen] = useState(false);

  const [groupInvitations, setGroupInvitations] = useState<QGroupInvitation[]>(() => {
    try {
      const saved = localStorage.getItem('quizgen_group_invitations');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return INITIAL_GROUP_INVITATIONS;
  });

  const [isOwnerSettingsModalOpen, setIsOwnerSettingsModalOpen] = useState(false);
  const [isAttachTextbookModalOpen, setIsAttachTextbookModalOpen] = useState(false);
  const [isAttachExamModalOpen, setIsAttachExamModalOpen] = useState(false);
  const [isNewDirectModalOpen, setIsNewDirectModalOpen] = useState(false);
  const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false);
  const [isJoinGroupModalOpen, setIsJoinGroupModalOpen] = useState(false);

  const [directPartnerInput, setDirectPartnerInput] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDept, setNewGroupDept] = useState('Khoa Công nghệ Thông tin');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [newGroupJoinPolicy, setNewGroupJoinPolicy] = useState<'open' | 'approval_required' | 'email_only'>('approval_required');
  const [joinCodeInput, setJoinCodeInput] = useState('');

  const [ownerSettingsTab, setOwnerSettingsTab] = useState<'info' | 'members' | 'policy' | 'requests' | 'danger'>('info');
  const [editGroupName, setEditGroupName] = useState('');
  const [editGroupDept, setEditGroupDept] = useState('');
  const [editGroupDesc, setEditGroupDesc] = useState('');
  const [newMemberEmailInput, setNewMemberEmailInput] = useState('');

  useEffect(() => {
    try { localStorage.setItem('quizgen_qgroups', JSON.stringify(qgroups)); } catch {}
  }, [qgroups]);

  useEffect(() => {
    try { localStorage.setItem('quizgen_group_invitations', JSON.stringify(groupInvitations)); } catch {}
  }, [groupInvitations]);

  const activeGroup = qgroups.find((g) => g.id === selectedGroupId) || qgroups[0] || null;

  const nowTime = () => new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  const nowDateTime = () => `${new Date().toLocaleDateString('vi-VN')} ${nowTime()}`;

  const handleStartDirectMessage = (targetEmail: string, targetName?: string) => {
    const cleanEmail = targetEmail.trim().toLowerCase();
    if (!cleanEmail) return;
    const existing = qgroups.find(g => g.isDirect && g.directPartnerEmail?.toLowerCase() === cleanEmail);
    if (existing) {
      setSelectedGroupId(existing.id);
      setSidebarGroupFilter('direct');
      setIsNewDirectModalOpen(false);
      setDirectPartnerInput('');
      return;
    }
    const newDirectGroup = buildNewDirectGroup(cleanEmail, targetName, currentUser);
    setQgroups(prev => [newDirectGroup, ...prev]);
    setSelectedGroupId(newDirectGroup.id);
    setSidebarGroupFilter('direct');
    setIsNewDirectModalOpen(false);
    setDirectPartnerInput('');
    onShowToast('success', 'Đã tạo kết nối', `Bắt đầu cuộc trò chuyện riêng với ${newDirectGroup.name}`);
  };

  const handleCreateQGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) {
      onShowToast('warning', 'Thiếu thông tin', 'Vui lòng nhập tên hội nhóm Q-Group.');
      return;
    }
    const created = buildNewQGroup(newGroupName, newGroupDept, newGroupDesc, newGroupJoinPolicy, currentUser);
    setQgroups(prev => [created, ...prev]);
    setSelectedGroupId(created.id);
    setIsCreateGroupModalOpen(false);
    setNewGroupName('');
    setNewGroupDesc('');
    onShowToast('success', 'Tạo nhóm thành công', `Mã nhóm của bạn: ${created.code}`);
  };

  const handleJoinQGroup = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = joinCodeInput.trim().toUpperCase();
    if (!cleanCode) return;
    const targetGroup = qgroups.find((g) => g.code.toUpperCase() === cleanCode);
    if (!targetGroup) {
      onShowToast('error', 'Không tìm thấy nhóm', 'Mã Q-Group không tồn tại trong hệ thống.');
      return;
    }
    const myEmail = currentUser?.email || 'lecturer@quizgen.ai';
    if (targetGroup.members.includes(myEmail)) {
      setSelectedGroupId(targetGroup.id);
      setIsJoinGroupModalOpen(false);
      setJoinCodeInput('');
      onShowToast('info', 'Đã tham gia', 'Thầy/Cô đã là thành viên của nhóm này.');
      return;
    }
    if (targetGroup.joinPolicy === 'open') {
      setQgroups(prev => prev.map(g => g.id !== targetGroup.id ? g : {
        ...g,
        memberCount: g.memberCount + 1,
        members: [...g.members, myEmail],
        messages: [...g.messages, { id: `msg-join-${Date.now()}`, senderEmail: 'system', senderName: 'Hệ Thống', isSystem: true, text: `${currentUser?.fullName || myEmail} vừa tham gia nhóm bằng mã truy cập.`, timestamp: nowTime() }]
      }));
      setSelectedGroupId(targetGroup.id);
      onShowToast('success', 'Tham gia thành công', `Chào mừng đến với ${targetGroup.name}`);
    } else {
      if ((targetGroup.pendingRequests || []).some(r => r.email === myEmail)) {
        onShowToast('info', 'Yêu cầu đang chờ', 'Yêu cầu của Thầy/Cô đang chờ phê duyệt.');
      } else {
        const newReq: QGroupPendingRequest = { id: `req-${Date.now()}`, email: myEmail, name: currentUser?.fullName || 'Giảng viên', title: currentUser?.department || 'Giảng viên', requestedAt: nowDateTime() };
        setQgroups(prev => prev.map(g => g.id === targetGroup.id ? { ...g, pendingRequests: [...(g.pendingRequests || []), newReq] } : g));
        onShowToast('success', 'Đã gửi yêu cầu', `Đã gửi tới Trưởng nhóm: ${targetGroup.ownerName}`);
      }
    }
    setIsJoinGroupModalOpen(false);
    setJoinCodeInput('');
  };

  const handleApproveRequest = (groupId: string, reqId: string) => {
    setQgroups(prev => prev.map(g => {
      if (g.id !== groupId) return g;
      const targetReq = (g.pendingRequests || []).find(r => r.id === reqId);
      if (!targetReq) return g;
      return {
        ...g,
        memberCount: g.memberCount + 1,
        members: [...g.members, targetReq.email],
        pendingRequests: g.pendingRequests.filter(r => r.id !== reqId),
        messages: [...g.messages, { id: `msg-appr-${Date.now()}`, senderEmail: 'system', senderName: 'Hệ Thống', isSystem: true, text: `Trưởng nhóm đã duyệt yêu cầu tham gia của ${targetReq.name} (${targetReq.email}).`, timestamp: nowTime() }]
      };
    }));
    onShowToast('success', 'Đã phê duyệt', 'Đồng nghiệp đã chính thức gia nhập nhóm.');
  };

  const handleRejectRequest = (groupId: string, reqId: string) => {
    setQgroups(prev => prev.map(g => g.id === groupId ? { ...g, pendingRequests: (g.pendingRequests || []).filter(r => r.id !== reqId) } : g));
    onShowToast('info', 'Đã từ chối', 'Đã xóa yêu cầu tham gia.');
  };

  const handleUpdatePolicy = (groupId: string, newPolicy: 'open' | 'approval_required' | 'email_only') => {
    setQgroups(prev => prev.map(g => g.id === groupId ? { ...g, joinPolicy: newPolicy } : g));
    onShowToast('success', 'Đã cập nhật', 'Chính sách gia nhập nhóm đã được lưu.');
  };

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInputText.trim() || !activeGroup) return;
    const newMsg: QGroupMessage = {
      id: `msg-${Date.now()}`,
      senderEmail: currentUser?.email || 'lecturer@quizgen.ai',
      senderName: currentUser?.fullName || 'Giảng viên',
      senderTitle: currentUser?.department || 'Giảng viên',
      avatarColor: 'bg-[#008689]',
      text: chatInputText.trim(),
      timestamp: nowTime()
    };
    setQgroups(prev => prev.map(g => g.id === activeGroup.id ? { ...g, messages: [...g.messages, newMsg] } : g));
    setChatInputText('');
  };

  const handleShareTextbookToChat = (book: any) => {
    if (!activeGroup) return;
    const newMsg: QGroupMessage = {
      id: `msg-${Date.now()}`,
      senderEmail: currentUser?.email || 'lecturer@quizgen.ai',
      senderName: currentUser?.fullName || 'Giảng viên',
      senderTitle: currentUser?.department || 'Giảng viên',
      avatarColor: 'bg-teal-600',
      text: `Chia sẻ tài liệu giáo trình: ${book.name} vào kho dữ liệu chung.`,
      timestamp: nowTime(),
      attachment: { type: 'textbook', id: book.id, name: book.name, size: book.size, totalPages: book.totalPages, authorName: book.authorName || currentUser?.fullName || 'Giảng viên' }
    };
    setQgroups(prev => prev.map(g => g.id === activeGroup.id ? { ...g, messages: [...g.messages, newMsg] } : g));
    setIsAttachTextbookModalOpen(false);
    onShowToast('success', 'Đã đính kèm giáo trình', 'Tài liệu đã được gửi vào trò chuyện.');
  };

  const handleShareExamToChat = (exam: any) => {
    if (!activeGroup) return;
    const newMsg: QGroupMessage = {
      id: `msg-${Date.now()}`,
      senderEmail: currentUser?.email || 'lecturer@quizgen.ai',
      senderName: currentUser?.fullName || 'Giảng viên',
      senderTitle: currentUser?.department || 'Giảng viên',
      avatarColor: 'bg-indigo-600',
      text: `Chia sẻ bộ đề thi: ${exam.name} vào kho dữ liệu chung.`,
      timestamp: nowTime(),
      attachment: { type: 'exam', id: exam.id, name: exam.name, subject: exam.subject, questionCount: exam.questionCount, durationMinutes: exam.durationMinutes, authorName: exam.authorName }
    };
    setQgroups(prev => prev.map(g => g.id === activeGroup.id ? { ...g, messages: [...g.messages, newMsg] } : g));
    setIsAttachExamModalOpen(false);
    onShowToast('success', 'Đã đính kèm đề thi', 'Đề thi đã được chia sẻ vào nhóm.');
  };

  const handleAddDirectMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberEmailInput.trim() || !activeGroup) return;
    const targetEmail = newMemberEmailInput.trim().toLowerCase();
    if (activeGroup.members.includes(targetEmail)) {
      onShowToast('info', 'Đã có trong nhóm', 'Email này đã là thành viên nhóm.');
      return;
    }
    const newInv: QGroupInvitation = { id: `inv-${Date.now()}`, groupId: activeGroup.id, groupName: activeGroup.name, groupCode: activeGroup.code, department: activeGroup.department, inviterName: currentUser?.fullName || 'Trưởng nhóm', inviterEmail: currentUser?.email || 'lecturer@quizgen.ai', targetEmail, invitedAt: nowDateTime(), status: 'pending' };
    setGroupInvitations(prev => [newInv, ...prev]);
    setNewMemberEmailInput('');
    onShowToast('success', 'Đã gửi lời mời', `Đã gửi lời mời tham gia tới ${targetEmail}`);
  };

  const handleAcceptInvitation = (inv: QGroupInvitation) => {
    const myEmail = currentUser?.email || 'lecturer@quizgen.ai';
    setQgroups(prev => prev.map(g => g.id !== inv.groupId ? g : {
      ...g,
      memberCount: g.memberCount + 1,
      members: Array.from(new Set([...g.members, myEmail])),
      messages: [...g.messages, { id: `msg-join-${Date.now()}`, senderEmail: 'system', senderName: 'Hệ Thống', isSystem: true, text: `${currentUser?.fullName || myEmail} vừa chấp nhận lời mời và tham gia nhóm.`, timestamp: nowTime() }]
    }));
    setGroupInvitations(prev => prev.filter(i => i.id !== inv.id));
    setSelectedGroupId(inv.groupId);
    onShowToast('success', 'Chào mừng', `Đã tham gia nhóm ${inv.groupName}`);
  };

  const handleDeclineInvitation = (invId: string) => {
    setGroupInvitations(prev => prev.filter(i => i.id !== invId));
    onShowToast('info', 'Đã từ chối', 'Đã xóa lời mời.');
  };

  const handleOpenGroupSettings = (tab: 'info' | 'members' | 'policy' | 'requests' | 'danger' = 'info') => {
    if (!activeGroup) return;
    setOwnerSettingsTab(tab);
    setEditGroupName(activeGroup.name);
    setEditGroupDept(activeGroup.department);
    setEditGroupDesc(activeGroup.description);
    setIsOwnerSettingsModalOpen(true);
  };

  const handleSaveGroupInfo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeGroup || !editGroupName.trim()) return;
    setQgroups(prev => prev.map(g => g.id === activeGroup.id ? { ...g, name: editGroupName.trim(), department: editGroupDept.trim(), description: editGroupDesc.trim() } : g));
    setIsOwnerSettingsModalOpen(false);
    onShowToast('success', 'Đã cập nhật', 'Thông tin nhóm đã được lưu.');
  };

  const handleKickMember = (targetEmail: string) => {
    if (!activeGroup) return;
    if (targetEmail === activeGroup.ownerEmail) return onShowToast('error', 'Không thể xóa', 'Không thể xóa Trưởng nhóm.');
    setQgroups(prev => prev.map(g => g.id === activeGroup.id ? { ...g, memberCount: Math.max(1, g.memberCount - 1), members: g.members.filter(m => m !== targetEmail) } : g));
    onShowToast('success', 'Đã xóa thành viên', `Đã xóa ${targetEmail} khỏi nhóm.`);
  };

  const handleTransferOwner = (newOwnerEmail: string) => {
    if (!activeGroup) return;
    setQgroups(prev => prev.map(g => g.id === activeGroup.id ? { ...g, ownerEmail: newOwnerEmail, ownerName: newOwnerEmail.split('@')[0] } : g));
    setIsOwnerSettingsModalOpen(false);
    onShowToast('success', 'Chuyển quyền thành công', `Đã chuyển Trưởng nhóm sang ${newOwnerEmail}`);
  };

  const handleLeaveGroup = () => {
    if (!activeGroup) return;
    const myEmail = currentUser?.email || 'lecturer@quizgen.ai';
    if (activeGroup.ownerEmail === myEmail) return onShowToast('error', 'Không thể rời nhóm', 'Trưởng nhóm cần chuyển giao quyền trước khi rời.');
    setQgroups(prev => prev.map(g => g.id === activeGroup.id ? { ...g, memberCount: Math.max(1, g.memberCount - 1), members: g.members.filter(m => m !== myEmail) } : g));
    setIsOwnerSettingsModalOpen(false);
    onShowToast('info', 'Đã rời nhóm', `Đã rời khỏi ${activeGroup.name}`);
  };

  const handleDeleteGroup = () => {
    if (!activeGroup) return;
    setQgroups(prev => prev.filter(g => g.id !== activeGroup.id));
    setIsOwnerSettingsModalOpen(false);
    onShowToast('success', 'Đã giải tán nhóm', `Nhóm ${activeGroup.name} đã được xóa hoàn toàn.`);
  };

  const handleToggleReaction = (msgId: string, emoji: string) => {
    if (!activeGroup) return;
    const myEmail = currentUser?.email || 'lecturer@quizgen.ai';
    setQgroups(prev => prev.map(g => g.id !== activeGroup.id ? g : {
      ...g,
      messages: g.messages.map(m => {
        if (m.id !== msgId) return m;
        const currentReacts = { ...(m.reactions || {}) };
        const users = currentReacts[emoji] || [];
        if (users.includes(myEmail)) {
          currentReacts[emoji] = users.filter(u => u !== myEmail);
          if (currentReacts[emoji].length === 0) delete currentReacts[emoji];
        } else {
          currentReacts[emoji] = [...users, myEmail];
        }
        return { ...m, reactions: currentReacts };
      })
    }));
  };

  const handleTogglePinMessage = (msgId: string) => {
    if (!activeGroup) return;
    setQgroups(prev => prev.map(g => {
      if (g.id !== activeGroup.id) return g;
      const isCurrentPinned = g.pinnedMessageId === msgId;
      return { ...g, pinnedMessageId: isCurrentPinned ? undefined : msgId, messages: g.messages.map(m => m.id === msgId ? { ...m, isPinned: !isCurrentPinned } : m) };
    }));
  };

  const handleDeleteMessage = (msgId: string) => {
    if (!activeGroup) return;
    setQgroups(prev => prev.map(g => g.id === activeGroup.id ? { ...g, messages: g.messages.filter(m => m.id !== msgId) } : g));
  };

  return {
    qgroups, setQgroups, selectedGroupId, setSelectedGroupId, chatInputText, setChatInputText,
    groupSearchQuery, setGroupSearchQuery, sidebarGroupFilter, setSidebarGroupFilter,
    chatSearchQuery, setChatSearchQuery, isChatSearchOpen, setIsChatSearchOpen,
    isAttachMenuOpen, setIsAttachMenuOpen, groupInvitations, setGroupInvitations,
    isOwnerSettingsModalOpen, setIsOwnerSettingsModalOpen, isAttachTextbookModalOpen, setIsAttachTextbookModalOpen,
    isAttachExamModalOpen, setIsAttachExamModalOpen, isNewDirectModalOpen, setIsNewDirectModalOpen,
    isCreateGroupModalOpen, setIsCreateGroupModalOpen, isJoinGroupModalOpen, setIsJoinGroupModalOpen,
    directPartnerInput, setDirectPartnerInput, newGroupName, setNewGroupName,
    newGroupDept, setNewGroupDept, newGroupDesc, setNewGroupDesc,
    newGroupJoinPolicy, setNewGroupJoinPolicy, joinCodeInput, setJoinCodeInput,
    ownerSettingsTab, setOwnerSettingsTab, editGroupName, setEditGroupName,
    editGroupDept, setEditGroupDept, editGroupDesc, setEditGroupDesc,
    newMemberEmailInput, setNewMemberEmailInput, activeGroup,
    handleStartDirectMessage, handleCreateQGroup, handleJoinQGroup, handleApproveRequest,
    handleRejectRequest, handleUpdatePolicy, handleSendMessage, handleShareTextbookToChat,
    handleShareExamToChat, handleAddDirectMember, handleAcceptInvitation, handleDeclineInvitation,
    handleOpenGroupSettings, handleSaveGroupInfo, handleKickMember, handleTransferOwner,
    handleLeaveGroup, handleDeleteGroup, handleToggleReaction, handleTogglePinMessage, handleDeleteMessage
  };
}
