import { useState, useCallback } from 'react';
import type { QGroup, FriendRequest } from '../../types';
import apiClient, { API_BASE } from '../../services/apiClient';
import { isExcludedAdminAccount } from './chatUtils';

export interface SystemUserSummary {
  email: string;
  fullName: string;
  academicTitle?: string;
  department?: string;
  university?: string;
  role?: string;
  avatarUrl?: string;
}

interface UseQGroupLookupParams {
  myEmail: string;
  qgroups: QGroup[];
  activeGroup: QGroup | null;
  systemUsersList: SystemUserSummary[];
  sentFriendRequests: FriendRequest[];
  friendRequests: FriendRequest[];
  onShowToast: (
    type: 'success' | 'info' | 'warning' | 'error',
    title: string,
    message: string,
    onClick?: () => void
  ) => void;
}

export function useQGroupLookup({
  myEmail,
  qgroups,
  activeGroup,
  systemUsersList,
  sentFriendRequests,
  friendRequests,
  onShowToast,
}: UseQGroupLookupParams) {
  // Direct Add Member modal states
  const [directAddMemberEmail, setDirectAddMemberEmail] = useState('');
  const [lookedUpUser, setLookedUpUser] = useState<SystemUserSummary | null>(null);
  const [lookupStatus, setLookupStatus] = useState<'idle' | 'searching' | 'found' | 'not_found'>('idle');
  const [directAddSelectedMembers, setDirectAddSelectedMembers] = useState<SystemUserSummary[]>([]);

  // Add Friend modal states
  const [isAddFriendOpen, setIsAddFriendOpen] = useState(false);
  const [friendEmailInput, setFriendEmailInput] = useState('');
  const [friendLookedUpUser, setFriendLookedUpUser] = useState<SystemUserSummary | null>(null);
  const [friendLookupStatus, setFriendLookupStatus] = useState<'idle' | 'searching' | 'found' | 'not_found'>('idle');
  const [selectedFriendsToInvite, setSelectedFriendsToInvite] = useState<SystemUserSummary[]>([]);

  // Create Group modal member states
  const [createGroupMemberInput, setCreateGroupMemberInput] = useState('');
  const [createGroupLookedUpUser, setCreateGroupLookedUpUser] = useState<SystemUserSummary | null>(null);
  const [createGroupLookupStatus, setCreateGroupLookupStatus] = useState<'idle' | 'searching' | 'found' | 'not_found'>('idle');
  const [createGroupSelectedMembers, setCreateGroupSelectedMembers] = useState<SystemUserSummary[]>([]);

  const lookupAccount = useCallback(
    async (emailVal: string): Promise<SystemUserSummary | null> => {
      const clean = emailVal.trim().toLowerCase().replace(/^@/, '');
      if (!clean || isExcludedAdminAccount(clean)) {
        return null;
      }

      const dynamicUser = systemUsersList.find(
        (u) =>
          !isExcludedAdminAccount(u.email, u.fullName, u.academicTitle) &&
          (u.email.toLowerCase() === clean ||
            u.email.toLowerCase().split('@')[0] === clean ||
            u.fullName.toLowerCase() === clean)
      );
      if (dynamicUser) {
        return {
          email: dynamicUser.email,
          fullName: dynamicUser.fullName,
          academicTitle: dynamicUser.academicTitle || 'ThS.',
          department: dynamicUser.department || 'Khoa Công nghệ Thông tin',
          university: 'Trường Đại học Giao thông Vận tải TP.HCM (UTH)',
          role: 'lecturer',
        };
      }

      const localRegistered: Record<string, { fullName: string; academicTitle: string; department: string }> = {
        'mr.av1222005@gmail.com': { fullName: 'Vũ đẹp chai', academicTitle: 'KS.', department: 'Khoa Công nghệ Thông tin' },
        'avanimechannel@gmail.com': { fullName: 'Vũ Anh', academicTitle: 'ThS.', department: 'Khoa Công nghệ Thông tin' },
        'hieuhieu22112005@gmail.com': { fullName: 'Hieu Huynh', academicTitle: 'ThS.', department: 'Khoa Công nghệ Thông tin' },
        'daipqps37469@gmail.com': { fullName: 'Đại Phạm Quang', academicTitle: 'ThS.', department: 'Khoa Công nghệ Thông tin' },
        'vuha3608@ut.edu.vn': { fullName: 'Vũ Hồ Anh', academicTitle: 'ThS.', department: 'Khoa Công nghệ Thông tin' },
        'nguyentann0804@gmail.com': { fullName: 'Nguyễn Văn Tân', academicTitle: 'TS.', department: 'Khoa Công nghệ Thông tin' },
        'ducngo.180305@gmail.com': { fullName: 'Ngô Phạm Công Đức', academicTitle: 'TS.', department: 'Khoa Công nghệ Thông tin' },
        'lieuthanhau@gmail.com': { fullName: 'Liêu Thanh Hậu', academicTitle: 'ThS.', department: 'Khoa Công nghệ Thông tin' },
        'anhvu12022005@gmail.com': { fullName: 'Anhvu12022005', academicTitle: 'ThS.', department: 'Khoa Công nghệ Thông tin' },
        'hod.cntt@uth.edu.vn': { fullName: 'PGS. TS. Trưởng Khoa CNTT', academicTitle: 'PGS. TS.', department: 'Khoa Công nghệ Thông tin' },
        'gv.kinhte@uth.edu.vn': { fullName: 'TS. Giảng viên Kinh tế', academicTitle: 'TS.', department: 'Khoa Kinh tế Vận tải' },
      };

      for (const [em, info] of Object.entries(localRegistered)) {
        if (!isExcludedAdminAccount(em, info.fullName, info.academicTitle)) {
          if (em.toLowerCase() === clean || em.toLowerCase().split('@')[0] === clean || info.fullName.toLowerCase() === clean) {
            return {
              email: em,
              fullName: info.fullName,
              academicTitle: info.academicTitle,
              department: info.department,
              university: 'Trường Đại học Giao thông Vận tải TP.HCM (UTH)',
              role: 'lecturer',
            };
          }
        }
      }

      if (clean.includes('@') && clean.includes('.')) {
        try {
          const res = await apiClient.fetch(`${API_BASE}/auth/users/lookup?email=${encodeURIComponent(clean)}`);
          if (res.ok) {
            const data = await res.json();
            if (data.exists && data.user) {
              if (isExcludedAdminAccount(data.user.email, data.user.fullName, data.user.academicTitle, data.user.role)) {
                return null;
              }
              return data.user as SystemUserSummary;
            }
          }
        } catch {}
      } else {
        try {
          const res = await apiClient.fetch(`${API_BASE}/auth/users/search?q=${encodeURIComponent(clean)}`);
          if (res.ok) {
            const list = await res.json();
            if (Array.isArray(list) && list.length > 0) {
              const safeList = list.filter((u: any) => !isExcludedAdminAccount(u.email, u.fullName, u.academicTitle, u.role));
              const matched =
                safeList.find(
                  (u: any) =>
                    u.email.toLowerCase() === clean ||
                    u.email.toLowerCase().split('@')[0] === clean ||
                    u.fullName.toLowerCase() === clean
                ) || (safeList.length === 1 ? safeList[0] : null);
              if (matched) return matched;
            }
          }
        } catch {}
      }

      const foundInGroups = qgroups.find((g) => {
        const members = (g.members || []).map((m) => String(m).toLowerCase());
        return members.some((m) => m === clean || m.split('@')[0] === clean) || g.ownerEmail?.toLowerCase() === clean;
      });

      if (foundInGroups) {
        const targetMember =
          (foundInGroups.members || []).find(
            (m) => String(m).toLowerCase() === clean || String(m).toLowerCase().split('@')[0] === clean
          ) || foundInGroups.ownerEmail;
        return {
          email: targetMember || clean,
          fullName: (targetMember || clean).split('@')[0],
          academicTitle: 'Giảng viên',
          department: foundInGroups.department || 'Khoa Chuyên Ngành',
          university: 'Trường Đại học Giao thông Vận tải TP.HCM (UTH)',
          role: 'lecturer',
        };
      }

      return null;
    },
    [qgroups, systemUsersList]
  );

  const handleLookupUser = useCallback(
    async (email: string) => {
      const clean = email.trim().toLowerCase().replace(/^@/, '');
      if (!clean) {
        setLookupStatus('idle');
        setLookedUpUser(null);
        return;
      }
      setLookupStatus('searching');
      const user = await lookupAccount(clean);
      if (user) {
        setLookedUpUser(user);
        setLookupStatus('found');
      } else {
        setLookedUpUser(null);
        setLookupStatus(clean.includes('@') && clean.includes('.') ? 'not_found' : 'idle');
      }
    },
    [lookupAccount]
  );

  const handleFriendLookup = useCallback(
    async (emailVal: string) => {
      const clean = emailVal.trim().toLowerCase().replace(/^@/, '');
      if (!clean) {
        setFriendLookupStatus('idle');
        setFriendLookedUpUser(null);
        return;
      }
      setFriendLookupStatus('searching');
      const user = await lookupAccount(clean);
      if (user) {
        setFriendLookedUpUser(user);
        setFriendLookupStatus('found');
      } else {
        setFriendLookedUpUser(null);
        setFriendLookupStatus(clean.includes('@') && clean.includes('.') ? 'not_found' : 'idle');
      }
    },
    [lookupAccount]
  );

  const handleCreateGroupMemberLookup = useCallback(
    async (emailVal: string) => {
      const clean = emailVal.trim().toLowerCase().replace(/^@/, '');
      if (!clean) {
        setCreateGroupLookupStatus('idle');
        setCreateGroupLookedUpUser(null);
        return;
      }
      setCreateGroupLookupStatus('searching');
      const user = await lookupAccount(clean);
      if (user) {
        setCreateGroupLookedUpUser(user);
        setCreateGroupLookupStatus('found');
      } else {
        setCreateGroupLookedUpUser(null);
        setCreateGroupLookupStatus(clean.includes('@') && clean.includes('.') ? 'not_found' : 'idle');
      }
    },
    [lookupAccount]
  );

  const handleAddMemberToNewGroup = useCallback(
    (user: { email: string; fullName?: string; name?: string; academicTitle?: string; title?: string; department?: string; dept?: string }) => {
      const clean = user.email.trim().toLowerCase();
      const memberName = user.fullName || user.name || clean.split('@')[0];
      const title = user.academicTitle || user.title;
      const dept = user.department || user.dept;
      if (isExcludedAdminAccount(clean, memberName, title)) {
        onShowToast('warning', 'Không hợp lệ', 'Tài khoản Quản trị viên hệ thống được bảo mật và không tham gia kênh học thuật.');
        return;
      }
      if (clean === myEmail.toLowerCase()) {
        onShowToast('info', 'Thông báo', 'Bạn là Trưởng nhóm khởi tạo nên đã có sẵn trong kênh.');
        return;
      }
      if (createGroupSelectedMembers.some((m) => m.email.toLowerCase() === clean)) {
        onShowToast('info', 'Đã có trong danh sách', `${memberName} (${clean}) đã được chọn.`);
        return;
      }
      setCreateGroupSelectedMembers((prev) => [...prev, { email: clean, fullName: memberName, academicTitle: title, department: dept }]);
      setCreateGroupMemberInput('');
      setCreateGroupLookedUpUser(null);
      setCreateGroupLookupStatus('idle');
    },
    [myEmail, createGroupSelectedMembers, onShowToast]
  );

  const handleQueueDirectAddMember = useCallback(
    (user: { email: string; fullName?: string; name?: string; academicTitle?: string; title?: string; department?: string; dept?: string }) => {
      if (!activeGroup) return;
      const clean = user.email.trim().toLowerCase();
      const memberName = user.fullName || user.name || clean.split('@')[0];
      const title = user.academicTitle || user.title;
      const dept = user.department || user.dept;
      if (isExcludedAdminAccount(clean, memberName, title)) {
        onShowToast('warning', 'Không hợp lệ', 'Tài khoản Quản trị viên hệ thống được bảo mật và không tham gia kênh học thuật.');
        return;
      }
      const currentMembers = (activeGroup.members || []).map((m) => String(m).toLowerCase());
      if (currentMembers.includes(clean)) {
        onShowToast('info', 'Đã là thành viên', `${memberName} (${clean}) đã có trong kênh #${activeGroup.name}`);
        return;
      }
      if (directAddSelectedMembers.some((m) => m.email.toLowerCase() === clean)) {
        onShowToast('info', 'Đã chọn', `${memberName} đã có trong danh sách chờ thêm.`);
        return;
      }
      setDirectAddSelectedMembers((prev) => [...prev, { email: clean, fullName: memberName, academicTitle: title, department: dept }]);
      setDirectAddMemberEmail('');
      setLookedUpUser(null);
      setLookupStatus('idle');
    },
    [activeGroup, directAddSelectedMembers, onShowToast]
  );

  const handleQueueFriendInvite = useCallback(
    (user: { email: string; fullName?: string; name?: string; academicTitle?: string; title?: string; department?: string; dept?: string }) => {
      const clean = user.email.trim().toLowerCase();
      const memberName = user.fullName || user.name || clean.split('@')[0];
      const title = user.academicTitle || user.title;
      const dept = user.department || user.dept;
      if (isExcludedAdminAccount(clean, memberName, title)) {
        onShowToast('warning', 'Không hợp lệ', 'Tài khoản Quản trị viên hệ thống được bảo mật và không thể kết bạn.');
        return;
      }
      if (clean === myEmail.toLowerCase()) {
        onShowToast('warning', 'Không hợp lệ', 'Bạn không thể kết bạn với chính mình.');
        return;
      }
      if (selectedFriendsToInvite.some((m) => m.email.toLowerCase() === clean)) {
        onShowToast('info', 'Đã chọn', `${memberName} đã có trong danh sách chờ kết bạn.`);
        return;
      }
      setSelectedFriendsToInvite((prev) => [...prev, { email: clean, fullName: memberName, academicTitle: title, department: dept }]);
      setFriendEmailInput('');
      setFriendLookedUpUser(null);
      setFriendLookupStatus('idle');
    },
    [myEmail, selectedFriendsToInvite, onShowToast]
  );

  const getFriendshipState = useCallback(
    (targetEmail: string) => {
      const target = targetEmail.trim().toLowerCase();
      if (target === myEmail.toLowerCase()) return { type: 'self' as const };

      const isAlreadyFriend = qgroups.some((g) => {
        if (!g.isDirect) return false;
        const cleanOwner = (g.ownerEmail || '').trim().toLowerCase();
        const cleanPartner = (g.directPartnerEmail || '').trim().toLowerCase();
        const members = (g.members || []).map((m) => String(m).trim().toLowerCase());
        return (
          (cleanOwner === target && cleanPartner === myEmail.toLowerCase()) ||
          (cleanPartner === target && cleanOwner === myEmail.toLowerCase()) ||
          (members.includes(target) && members.includes(myEmail.toLowerCase()))
        );
      });
      if (isAlreadyFriend) return { type: 'friend' as const };

      const isPendingSent = sentFriendRequests.some(
        (r) => r.targetEmail?.trim().toLowerCase() === target && r.status === 'pending'
      );
      if (isPendingSent) return { type: 'sent_pending' as const };

      const incomingReq = friendRequests.find(
        (r) => r.senderEmail?.trim().toLowerCase() === target && r.status === 'pending'
      );
      if (incomingReq) return { type: 'received_pending' as const, req: incomingReq };

      return { type: 'none' as const };
    },
    [myEmail, qgroups, sentFriendRequests, friendRequests]
  );

  const handleCloseAddFriendModal = useCallback(() => {
    setIsAddFriendOpen(false);
    setFriendEmailInput('');
    setFriendLookedUpUser(null);
    setFriendLookupStatus('idle');
  }, []);

  return {
    directAddMemberEmail,
    setDirectAddMemberEmail,
    lookedUpUser,
    setLookedUpUser,
    lookupStatus,
    setLookupStatus,
    directAddSelectedMembers,
    setDirectAddSelectedMembers,
    isAddFriendOpen,
    setIsAddFriendOpen,
    friendEmailInput,
    setFriendEmailInput,
    friendLookedUpUser,
    setFriendLookedUpUser,
    friendLookupStatus,
    setFriendLookupStatus,
    selectedFriendsToInvite,
    setSelectedFriendsToInvite,
    createGroupMemberInput,
    setCreateGroupMemberInput,
    createGroupLookedUpUser,
    setCreateGroupLookedUpUser,
    createGroupLookupStatus,
    setCreateGroupLookupStatus,
    createGroupSelectedMembers,
    setCreateGroupSelectedMembers,
    lookupAccount,
    handleLookupUser,
    handleFriendLookup,
    handleCreateGroupMemberLookup,
    handleAddMemberToNewGroup,
    handleQueueDirectAddMember,
    handleQueueFriendInvite,
    getFriendshipState,
    handleCloseAddFriendModal,
  };
}
