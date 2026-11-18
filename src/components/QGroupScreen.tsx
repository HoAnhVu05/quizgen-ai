/**
 * QGroupScreen – Complete Slack & Messenger Style Upgrade
 * Tính năng phong cách Slack:
 * 1. Rich Text Composer (Bold, Italic, Code, Quote, List, Emoji, Attachment, Quanta AI)
 * 2. Header Slack Toolbar: Huddle (Audio Call), Star, Summarize Channel by AI, Channel Details
 * 3. ChannelDetailsModal đa tab: Giới thiệu | Thành viên & Mời | Học liệu & Tệp | Cài đặt nhóm
 * 4. AI Summarize Modal: Tự động tóm tắt nội dung thảo luận chuyên môn
 * 5. Loại bỏ hoàn toàn sự thừa thãi của 2 popup thành viên cũ
 */
import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from 'react';
import {
  Users,
  Search,
  Plus,
  Send,
  MoreVertical,
  Check,
  X,
  UserPlus,
  Shield,
  Copy,
  Settings,
  Bell,
  BellOff,
  User,
  Trash2,
  MessageCircle,
  Inbox,
  LogOut,
  UserCheck,
  Hash,
  Bold,
  Italic,
  Code,
  List,
  Quote,
  Smile,
  Paperclip,
  Mic,
  MicOff,
  Sparkles,
  Star,
  Headphones,
  FileText,
  Share2,
  BookOpen,
  Info,
  CheckCheck,
  UserMinus,
  ShieldCheck,
  Globe,
  Lock,
  Clock,
  AlertCircle,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  ArrowRight,
  Reply,
  Pin,
  Pencil,
  Undo2,
  CheckCircle2,
} from 'lucide-react';
import {
  QGroup,
  QGroupMessage,
  FriendRequest,
  QGroupInvitation,
  ScreenId,
  UserProfile,
  UserSubscriptionInfo,
} from '../types';
import apiClient, { API_BASE } from '../services/apiClient';
import { PublicProfileModal } from './PublicProfileModal';

// ─── Props ─────────────────────────────────────────────────────────────────
interface QGroupScreenProps {
  onNavigate: (screen: ScreenId) => void;
  onShowToast: (
    type: 'success' | 'info' | 'warning' | 'error',
    title: string,
    message: string
  ) => void;
  currentUser?: UserProfile | null;
  subscriptionInfo?: UserSubscriptionInfo | null;
}

// ─── Helpers ────────────────────────────────────────────────────────────────
const parseLegacyForumShare = (text: string) => {
  if (!text || !text.includes('[DIỄN ĐÀN HỌC THUẬT UTH]')) return null;
  const tagMatch = text.match(/#(\S+)/);
  const authorMatch = text.match(/Tác giả:\s*([^\n\r]+)/);
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(
      (l) =>
        l &&
        !l.includes('[DIỄN ĐÀN HỌC THUẬT UTH]') &&
        !l.startsWith('Tác giả:') &&
        !l.startsWith('Đính kèm:') &&
        !l.startsWith('Video:')
    );
  const content = lines.join(' ').slice(0, 180);
  return {
    id: undefined,
    tag: tagMatch ? tagMatch[1] : 'HọcThuật',
    authorName: authorMatch ? authorMatch[1].trim() : 'Giảng viên',
    authorTitle: undefined,
    department: 'Khoa Công nghệ Thông tin',
    content: content || 'Bài viết trao đổi học thuật trên diễn đàn.',
    attachmentFileName: text.includes('Đính kèm:') ? text.split('Đính kèm:')[1]?.split('\n')[0]?.trim() : undefined,
    attachmentFileSize: undefined,
  };
};

const initials = (name: string) =>
  String(name || 'QG')
    .trim()
    .slice(0, 2)
    .toUpperCase();

const formatTime = (ts: number): string => {
  if (!ts) return '';
  const d = new Date(ts);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60_000) return 'Vừa xong';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} ph`;
  if (diff < 86_400_000)
    return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
};

const getGroupSortTime = (g: QGroup): number => {
  let best = 0;
  const nowCap = Date.now() + 60000;
  const msgs = g.messages || [];
  if (msgs.length > 0) {
    const last = msgs[msgs.length - 1];
    if (last?.id && last.id.startsWith('msg-')) {
      const parsed = parseInt(last.id.replace('msg-', ''), 10);
      if (!isNaN(parsed) && parsed > 0 && parsed <= nowCap) {
        best = Math.max(best, parsed);
      }
    }
  }
  const up = Number(g.updatedAt) || 0;
  if (up > 0 && up <= nowCap) {
    best = Math.max(best, up);
  }
  return best;
};

// ─── Blacklist helpers ──────────────────────────────────────────────────────
const getBlacklistKey = (email: string) =>
  `quizgen_deleted_qgroups_${(email || 'global').toLowerCase()}`;

const getBlacklist = (email: string): Set<string> => {
  try {
    const saved = localStorage.getItem(getBlacklistKey(email));
    if (saved) return new Set(JSON.parse(saved) as string[]);
  } catch {}
  return new Set();
};

const addToBlacklist = (email: string, ...ids: string[]) => {
  const bl = getBlacklist(email);
  ids.forEach((id) => id && bl.add(id));
  try {
    localStorage.setItem(getBlacklistKey(email), JSON.stringify([...bl]));
  } catch {}
};

const removeFromBlacklist = (email: string, ...ids: string[]) => {
  const bl = getBlacklist(email);
  let changed = false;
  ids.forEach((id) => {
    if (id && bl.has(id)) {
      bl.delete(id);
      changed = true;
    }
  });
  if (changed) {
    try {
      localStorage.setItem(getBlacklistKey(email), JSON.stringify([...bl]));
    } catch {}
  }
};

const isGroupMemberOrOwner = (g: QGroup, email: string): boolean => {
  if (!email || !g) return false;
  const clean = email.trim().toLowerCase();
  const owner = (g.ownerEmail || '').trim().toLowerCase();
  const partner = (g.directPartnerEmail || '').trim().toLowerCase();
  const members = (g.members || []).map((m) => String(m).trim().toLowerCase());
  return owner === clean || partner === clean || members.includes(clean);
};

const flattenGroups = (arr: unknown[]): QGroup[] => {
  const out: QGroup[] = [];
  for (const it of arr) {
    if (it && typeof it === 'object') {
      const obj = it as Record<string, unknown>;
      if (Array.isArray(obj.groups)) out.push(...flattenGroups(obj.groups));
      else if (obj.id && obj.name) out.push(obj as unknown as QGroup);
    }
  }
  return out;
};

const dedupMessages = (msgs: QGroupMessage[]): QGroupMessage[] => {
  const seen = new Set<string>();
  return (msgs || []).filter((m) => {
    const mid = String(m?.id || '').trim();
    if (mid) {
      if (seen.has(mid)) return false;
      seen.add(mid);
    }
    return true;
  });
};

// ─── Direct Partner Resolution for Dual-Sided DM Rooms ──────────────────────
export interface ResolvedChatInfo {
  displayName: string;
  displayEmail?: string;
  partnerEmail?: string;
  displayRoleOrMembers: string;
  isDirect: boolean;
  avatarInitials: string;
}

export function resolveChatDisplayInfo(group: QGroup, myEmail: string): ResolvedChatInfo {
  if (!group.isDirect) {
    const memCount = group.memberCount || (group.members ? group.members.length : 1);
    return {
      displayName: group.name,
      displayEmail: group.ownerEmail,
      partnerEmail: group.ownerEmail,
      displayRoleOrMembers: `${memCount} thành viên`,
      isDirect: false,
      avatarInitials: (group.name || 'QG').slice(0, 2).toUpperCase(),
    };
  }

  // It's a Direct Message
  const cleanMyEmail = (myEmail || '').trim().toLowerCase();
  const cleanOwnerEmail = (group.ownerEmail || '').trim().toLowerCase();
  const cleanPartnerEmail = (group.directPartnerEmail || '').trim().toLowerCase();

  // If I am the creator/owner -> Partner is the directPartner
  if (cleanMyEmail === cleanOwnerEmail && cleanPartnerEmail) {
    const name = group.directPartnerName || cleanPartnerEmail.split('@')[0];
    return {
      displayName: name,
      displayEmail: cleanPartnerEmail,
      partnerEmail: cleanPartnerEmail,
      displayRoleOrMembers: 'Đồng nghiệp • Tin nhắn 1-1',
      isDirect: true,
      avatarInitials: name.slice(0, 2).toUpperCase(),
    };
  }

  // If I am the recipient -> Partner is the owner!
  if (cleanMyEmail !== cleanOwnerEmail && cleanOwnerEmail) {
    const name = group.ownerName || cleanOwnerEmail.split('@')[0];
    return {
      displayName: name,
      displayEmail: cleanOwnerEmail,
      partnerEmail: cleanOwnerEmail,
      displayRoleOrMembers: 'Đồng nghiệp • Tin nhắn 1-1',
      isDirect: true,
      avatarInitials: name.slice(0, 2).toUpperCase(),
    };
  }

  // Fallback: lookup in members list
  const otherEmail = (group.members || []).find(
    (m) => m.trim().toLowerCase() !== cleanMyEmail
  );
  if (otherEmail) {
    const name = group.directPartnerName && group.directPartnerName !== group.ownerName
      ? group.directPartnerName
      : otherEmail.split('@')[0];
    return {
      displayName: name,
      displayEmail: otherEmail,
      partnerEmail: otherEmail,
      displayRoleOrMembers: 'Đồng nghiệp • Tin nhắn 1-1',
      isDirect: true,
      avatarInitials: name.slice(0, 2).toUpperCase(),
    };
  }

  const fbEmail = group.directPartnerEmail || group.ownerEmail;
  return {
    displayName: group.name,
    displayEmail: fbEmail,
    partnerEmail: fbEmail,
    displayRoleOrMembers: 'Tin nhắn riêng 1-1',
    isDirect: true,
    avatarInitials: (group.name || 'DM').slice(0, 2).toUpperCase(),
  };
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export const QGroupScreen: React.FC<QGroupScreenProps> = ({
  onNavigate,
  onShowToast,
  currentUser,
  subscriptionInfo,
}) => {
  const myEmail = useMemo(
    () => (currentUser?.email || '').trim().toLowerCase(),
    [currentUser?.email]
  );
  const myName = currentUser?.fullName || 'Giảng viên';

  // ── States ───────────────────────────────────────────────────────────────
  const [qgroups, setQgroups] = useState<QGroup[]>([]);
  const [systemUsersList, setSystemUsersList] = useState<
    Array<{ email: string; fullName: string; academicTitle?: string; department?: string }>
  >([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [filterTab, setFilterTab] = useState<
    'all' | 'unread' | 'groups' | 'friends' | 'invitations'
  >('all');

  // Lời mời
  const [groupInvitations, setGroupInvitations] = useState<QGroupInvitation[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [sentFriendRequests, setSentFriendRequests] = useState<FriendRequest[]>([]);
  const [invitationsTab, setInvitationsTab] = useState<'received' | 'sent' | 'groups'>('received');

  // Trưởng nhóm nhượng quyền & giải tán nhóm
  const [isTransferOwnerModalOpen, setIsTransferOwnerModalOpen] = useState(false);
  const [transferGroup, setTransferGroup] = useState<QGroup | null>(null);
  const [selectedNewOwner, setSelectedNewOwner] = useState<string>('');
  const [isTransferringOwner, setIsTransferringOwner] = useState(false);

  // Context menu
  const [menuGroupId, setMenuGroupId] = useState<string | null>(null);

  // Slack Header Modals & Toolbars
  const [isChannelDetailsOpen, setIsChannelDetailsOpen] = useState(false);
  const [isChannelSettingsOpen, setIsChannelSettingsOpen] = useState(false);
  const [channelDetailsTab, setChannelDetailsTab] = useState<'about' | 'members' | 'files'>('about');
  const [isSummarizeModalOpen, setIsSummarizeModalOpen] = useState(false);
  const [isHuddleOpen, setIsHuddleOpen] = useState(false);
  const [isStarred, setIsStarred] = useState(false);

  // Slack Rich Composer Popovers
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [isAttachPopoverOpen, setIsAttachPopoverOpen] = useState(false);
  const [selectedAttachment, setSelectedAttachment] = useState<{
    type: 'textbook';
    id: string;
    name: string;
    size: string;
    totalPages: number;
    authorName: string;
  } | null>(null);

  // Available Textbooks for Attachment
  const [availableTextbooks, setAvailableTextbooks] = useState<Array<{
    id: string;
    name: string;
    size: string;
    totalPages: number;
    authorName: string;
  }>>([
    {
      id: 'tb-001',
      name: '3000.pdf',
      size: '12.4 MB',
      totalPages: 128,
      authorName: 'TS. Hồ Anh Vũ',
    },
    {
      id: 'tb-002',
      name: '2018-Operating System Concepts-10th.pdf',
      size: '29.7 MB',
      totalPages: 1278,
      authorName: 'TS. Hồ Anh Vũ',
    },
    {
      id: 'tb-003',
      name: 'BAI GIANG Tu tuong HCM - LLCT.pdf',
      size: '15.2 MB',
      totalPages: 182,
      authorName: 'ThS. Hân Bích',
    },
    {
      id: 'tb-004',
      name: 'GiaoTrinh_KinhTeViMo_2025.pdf',
      size: '22.1 MB',
      totalPages: 412,
      authorName: 'Bộ Môn Kinh Tế',
    },
  ]);

  // Basic Modals
  const [isAddFriendOpen, setIsAddFriendOpen] = useState(false);
  const [friendEmailInput, setFriendEmailInput] = useState('');
  const [friendLookedUpUser, setFriendLookedUpUser] = useState<{
    id?: string;
    email: string;
    fullName: string;
    academicTitle?: string;
    department?: string;
    university?: string;
    role?: string;
  } | null>(null);
  const [friendLookupStatus, setFriendLookupStatus] = useState<'idle' | 'searching' | 'found' | 'not_found'>('idle');
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [groupModalTab, setGroupModalTab] = useState<'create' | 'join'>('create');
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [isJoiningCode, setIsJoiningCode] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDept, setNewGroupDept] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [inviteEmailInput, setInviteEmailInput] = useState('');

  // Trạng thái chọn nhiều thành viên khi Tạo kênh học thuật mới
  const [createGroupSelectedMembers, setCreateGroupSelectedMembers] = useState<
    Array<{ email: string; fullName: string; academicTitle?: string; department?: string }>
  >([]);
  const [createGroupMemberInput, setCreateGroupMemberInput] = useState('');
  const [createGroupLookupStatus, setCreateGroupLookupStatus] = useState<
    'idle' | 'searching' | 'found' | 'not_found'
  >('idle');
  const [createGroupLookedUpUser, setCreateGroupLookedUpUser] = useState<{
    id?: string;
    email: string;
    fullName: string;
    academicTitle?: string;
    department?: string;
    university?: string;
    role?: string;
  } | null>(null);

  // Hàng đợi chọn nhiều người trong modal Thêm thành viên vào kênh (isDirectAddMemberOpen)
  const [directAddSelectedMembers, setDirectAddSelectedMembers] = useState<
    Array<{ email: string; fullName: string; academicTitle?: string; department?: string }>
  >([]);

  // Hàng đợi chọn nhiều người trong modal Thêm bạn bè (isAddFriendOpen)
  const [selectedFriendsToInvite, setSelectedFriendsToInvite] = useState<
    Array<{ email: string; fullName: string; academicTitle?: string; department?: string }>
  >([]);

  // Public profile modal
  const [profileEmail, setProfileEmail] = useState<string | null>(null);
  const [profileName, setProfileName] = useState<string | undefined>(undefined);

  // Collapsible Sections cho Sidebar Slack/Teams
  const [isChannelsOpen, setIsChannelsOpen] = useState(true);
  const [isDmsOpen, setIsDmsOpen] = useState(true);

  // Slack Header Menu & Outside Member Inviting
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);
  const [isDirectAddMemberOpen, setIsDirectAddMemberOpen] = useState(false);
  const [directAddMemberEmail, setDirectAddMemberEmail] = useState('');
  const [lookedUpUser, setLookedUpUser] = useState<{
    id?: string;
    email: string;
    fullName: string;
    academicTitle?: string;
    department?: string;
    university?: string;
    role?: string;
  } | null>(null);
  const [lookupStatus, setLookupStatus] = useState<'idle' | 'searching' | 'found' | 'not_found'>('idle');
  const [isAddingMember, setIsAddingMember] = useState(false);

  // Message Actions: Reply, Inline Edit, Reaction, Recall
  const [replyingToMessage, setReplyingToMessage] = useState<QGroupMessage | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  // Kiểm tra quan hệ bạn bè / đồng nghiệp theo profile đang mở
  const isTargetFriend = useMemo(() => {
    if (!profileEmail || !myEmail) return false;
    const target = profileEmail.trim().toLowerCase();
    return qgroups.some((g) => {
      if (!g.isDirect) return false;
      const cleanOwner = (g.ownerEmail || '').trim().toLowerCase();
      const cleanPartner = (g.directPartnerEmail || '').trim().toLowerCase();
      const members = (g.members || []).map((m) => String(m).trim().toLowerCase());
      return (
        (cleanOwner === target && cleanPartner === myEmail) ||
        (cleanPartner === target && cleanOwner === myEmail) ||
        (members.includes(target) && members.includes(myEmail))
      );
    });
  }, [profileEmail, myEmail, qgroups]);

  const hasTargetPendingRequest = useMemo(() => {
    if (!profileEmail) return false;
    const target = profileEmail.trim().toLowerCase();
    return sentFriendRequests.some((r) => r.targetEmail?.trim().toLowerCase() === target && r.status === 'pending');
  }, [profileEmail, sentFriendRequests]);

  // Danh sách bạn bè & đồng nghiệp kết nối (để thêm nhanh vào kênh 1 chạm)
  const connectedFriends = useMemo(() => {
    const map = new Map<string, { email: string; name: string; title?: string; dept?: string }>();

    // Trích xuất từ các cuộc trò chuyện trực tiếp (DM 1-1)
    qgroups.forEach((g) => {
      if (g.isDirect) {
        const info = resolveChatDisplayInfo(g, myEmail);
        if (info.partnerEmail && info.partnerEmail.toLowerCase() !== myEmail.toLowerCase()) {
          map.set(info.partnerEmail.toLowerCase(), {
            email: info.partnerEmail,
            name: info.displayName,
            title: undefined,
            dept: g.department || 'Đồng nghiệp UTH',
          });
        }
      }
    });

    // 1. Đồng bộ người dùng thực tế từ auth.db (qua admin-service API)
    systemUsersList.forEach((u) => {
      if (u.email && u.email.toLowerCase() !== myEmail.toLowerCase()) {
        const cleanEmail = u.email.toLowerCase();
        if (!map.has(cleanEmail)) {
          map.set(cleanEmail, {
            email: u.email,
            name: `${u.academicTitle ? u.academicTitle + ' ' : ''}${u.fullName}`,
            title: u.academicTitle || 'ThS.',
            dept: u.department || 'Khoa Công nghệ Thông tin',
          });
        }
      }
    });

    // 2. Các tài khoản mẫu hệ thống & đồng nghiệp dự phòng
    const systemLecturers = [
      { email: 'mr.av1222005@gmail.com', name: 'ThS. Mr. AV', title: 'ThS.', dept: 'Khoa Công nghệ Thông tin' },
      { email: 'avanimechannel@gmail.com', name: 'ThS. Vũ Anh', title: 'ThS.', dept: 'Khoa Công nghệ Thông tin' },
      { email: 'hieuhieu22112005@gmail.com', name: 'ThS. Hieu Huynh', title: 'ThS.', dept: 'Khoa Công nghệ Thông tin' },
      { email: 'daipqps37469@gmail.com', name: 'ThS. Đại Phạm Quang', title: 'ThS.', dept: 'Khoa Công nghệ Thông tin' },
      { email: 'vuha3608@ut.edu.vn', name: 'ThS. Vũ Hồ Anh', title: 'ThS.', dept: 'Khoa Công nghệ Thông tin' },
      { email: 'nguyentann0804@gmail.com', name: 'TS. Nguyễn Văn Tân', title: 'TS.', dept: 'Khoa Công nghệ Thông tin' },
      { email: 'quizgen.ai.team@gmail.com', name: 'Ban Quản trị QuizGen AI', title: 'Admin', dept: 'Phòng Đào Tạo & Khảo Thí' },
      { email: 'hod.cntt@uth.edu.vn', name: 'PGS. TS. Trưởng Khoa CNTT', title: 'PGS. TS.', dept: 'Khoa Công nghệ Thông tin' },
      { email: 'gv.kinhte@uth.edu.vn', name: 'TS. Giảng viên Kinh tế', title: 'TS.', dept: 'Khoa Kinh tế Vận tải' },
    ];

    systemLecturers.forEach((c) => {
      if (c.email.toLowerCase() !== myEmail.toLowerCase()) {
        if (!map.has(c.email.toLowerCase())) {
          map.set(c.email.toLowerCase(), c);
        } else {
          const ex = map.get(c.email.toLowerCase())!;
          if (!ex.title && c.title) ex.title = c.title;
          if ((!ex.dept || ex.dept === 'Đồng nghiệp UTH') && c.dept) ex.dept = c.dept;
        }
      }
    });

    return Array.from(map.values());
  }, [qgroups, myEmail, systemUsersList]);

  // Bộ lọc danh sách bạn bè theo ô tìm kiếm / ký tự @ (khi thêm thành viên vào kênh)
  const filteredFriends = useMemo(() => {
    const q = directAddMemberEmail.trim().toLowerCase();
    if (!q || q === '@') {
      return connectedFriends;
    }
    const cleanQ = q.startsWith('@') ? q.slice(1).trim() : q;
    if (!cleanQ) return connectedFriends;
    return connectedFriends.filter(
      (f) =>
        f.name.toLowerCase().includes(cleanQ) ||
        f.email.toLowerCase().includes(cleanQ) ||
        (f.dept && f.dept.toLowerCase().includes(cleanQ))
    );
  }, [connectedFriends, directAddMemberEmail]);

  // Bộ lọc danh sách đồng nghiệp / giảng viên (khi thêm bạn bè mới)
  const filteredColleaguesForFriend = useMemo(() => {
    const q = friendEmailInput.trim().toLowerCase();
    if (!q || q === '@') {
      return connectedFriends;
    }
    const cleanQ = q.startsWith('@') ? q.slice(1).trim() : q;
    if (!cleanQ) return connectedFriends;
    return connectedFriends.filter(
      (f) =>
        f.name.toLowerCase().includes(cleanQ) ||
        f.email.toLowerCase().includes(cleanQ) ||
        (f.dept && f.dept.toLowerCase().includes(cleanQ))
    );
  }, [connectedFriends, friendEmailInput]);

  // Bộ lọc danh sách đồng nghiệp khi tạo kênh học thuật mới
  const filteredColleaguesForNewGroup = useMemo(() => {
    const selectedEmails = new Set(createGroupSelectedMembers.map((m) => m.email.toLowerCase()));
    const q = createGroupMemberInput.trim().toLowerCase();
    const available = connectedFriends.filter((f) => !selectedEmails.has(f.email.toLowerCase()));
    if (!q || q === '@') {
      return available;
    }
    const cleanQ = q.startsWith('@') ? q.slice(1).trim() : q;
    if (!cleanQ) return available;
    return available.filter(
      (f) =>
        f.name.toLowerCase().includes(cleanQ) ||
        f.email.toLowerCase().includes(cleanQ) ||
        (f.dept && f.dept.toLowerCase().includes(cleanQ))
    );
  }, [connectedFriends, createGroupSelectedMembers, createGroupMemberInput]);

  // Refs
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const headerMenuRef = useRef<HTMLDivElement>(null);
  const prevMsgCount = useRef<Record<string, number>>({});

  // Đóng Slack Header Menu khi nhấp chuột ra ngoài
  useEffect(() => {
    if (!isHeaderMenuOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (headerMenuRef.current && !headerMenuRef.current.contains(e.target as Node)) {
        setIsHeaderMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [isHeaderMenuOpen]);

  // ── Audio Beep ───────────────────────────────────────────────────────────
  const playBeep = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(820, ctx.currentTime);
      gain.gain.setValueAtTime(0.07, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
      osc.start();
      osc.stop(ctx.currentTime + 0.22);
    } catch {}
  }, []);

  // ── Backend sync & Storage ───────────────────────────────────────────────
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
      const valid = groups.filter((g) => {
        // Chỉ hiển thị kênh nếu người dùng là thành viên hoặc chủ nhóm
        if (isGroupMemberOrOwner(g, myEmail)) {
          removeFromBlacklist(myEmail, g.id, g.code);
          return true;
        }
        return false;
      });
      setQgroups(valid);
      try {
        const storageKey = myEmail ? `quizgen_qgroups_${myEmail}` : 'quizgen_qgroups';
        localStorage.setItem(storageKey, JSON.stringify(valid));
      } catch {}
    },
    [myEmail]
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
            const storageKey = myEmail ? `quizgen_qgroups_${myEmail}` : 'quizgen_qgroups';
            localStorage.setItem(storageKey, JSON.stringify(next));
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
    [myEmail]
  );

  const fetchGroupInvitations = useCallback(async () => {
    if (!myEmail) return;
    try {
      const res = await apiClient.fetch(
        `${API_BASE}/documents/qgroups/invitations?email=${encodeURIComponent(myEmail)}`
      );
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data))
          setGroupInvitations(data.filter((i: QGroupInvitation) => i?.status === 'pending'));
      }
    } catch {}
  }, [myEmail]);

  const fetchFriendRequests = useCallback(async () => {
    if (!myEmail) return;
    try {
      // 1. Lời mời đã nhận (Incoming)
      const resIn = await apiClient.fetch(
        `${API_BASE}/documents/friend-requests?email=${encodeURIComponent(myEmail)}&type=received`
      );
      if (resIn.ok) {
        const data = await resIn.json();
        if (Array.isArray(data))
          setFriendRequests(data.filter((r: FriendRequest) => r?.status === 'pending'));
      }

      // 2. Lời mời đã gửi (Outgoing Sent)
      const resOut = await apiClient.fetch(
        `${API_BASE}/documents/friend-requests?email=${encodeURIComponent(myEmail)}&type=sent`
      );
      if (resOut.ok) {
        const dataOut = await resOut.json();
        if (Array.isArray(dataOut))
          setSentFriendRequests(dataOut.filter((r: FriendRequest) => r?.status === 'pending'));
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

      let merged = [...remoteClean];
      try {
        const storageKey = myEmail ? `quizgen_qgroups_${myEmail}` : 'quizgen_qgroups';
        const localSaved = localStorage.getItem(storageKey);
        if (localSaved) {
          const localGroups = flattenGroups(JSON.parse(localSaved) as unknown[]).filter((g) => {
            if (isGroupMemberOrOwner(g, myEmail)) {
              removeFromBlacklist(myEmail, g.id, g.code);
              return true;
            }
            return false;
          });
          const remoteKeys = new Set(remoteClean.map((g) => (g.code || g.id).trim()));
          const onlyLocal = localGroups.filter(
            (lg) => !(lg.code || lg.id) || !remoteKeys.has((lg.code || lg.id).trim())
          );
          if (onlyLocal.length > 0) merged = [...remoteClean, ...onlyLocal];
        }
      } catch {}

      const seen = new Set<string>();
      const deduped: QGroup[] = [];
      for (const g of merged) {
        const key = (g.code || g.id || '').trim();
        const isActiveMember = isGroupMemberOrOwner(g, myEmail);
        if (!key || !isActiveMember || bl.has(key)) continue;
        if (seen.has(key)) continue;
        seen.add(key);

        const cleanMsgs = dedupMessages(g.messages || []);

        const localGroup = qgroups.find(
          (lg) => lg.id === g.id || lg.code === g.code
        );
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
        deduped.push({ ...g, messages: cleanMsgs, updatedAt: calculatedTime });
      }

      deduped.forEach((g) => {
        const msgs = g.messages || [];
        const prev = prevMsgCount.current[g.id] ?? msgs.length;
        if (msgs.length > prev) {
          const last = msgs[msgs.length - 1];
          if (last && last.senderEmail?.toLowerCase() !== myEmail && !last.isSystem) {
            playBeep();
            onShowToast(
              'info',
              `Tin nhắn mới từ ${last.senderName || 'ai đó'}`,
              last.text || '[Tệp đính kèm]'
            );
          }
        }
        prevMsgCount.current[g.id] = msgs.length;
      });

      applyGroups(deduped);
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myEmail, selectedGroupId, applyGroups, playBeep, onShowToast]);

  // Polling 2s
  useEffect(() => {
    void fetchQGroups();
    void fetchGroupInvitations();
    void fetchFriendRequests();
    const iv = setInterval(() => {
      void fetchQGroups();
      void fetchGroupInvitations();
      void fetchFriendRequests();
    }, 2000);
    return () => clearInterval(iv);
  }, [fetchQGroups, fetchGroupInvitations, fetchFriendRequests]);

  // Đồng bộ danh mục tài khoản toàn hệ thống từ auth.db (admin API)
  useEffect(() => {
    let isMounted = true;
    apiClient
      .fetch(`${API_BASE}/admin/users`)
      .then((res) => (res.ok ? res.json() : []))
      .then((users) => {
        if (!isMounted || !Array.isArray(users)) return;
        const normalized = users.map((u: any) => ({
          email: u.email,
          fullName: u.fullName || u.name || 'Giảng viên UTH',
          academicTitle: u.academicTitle || 'ThS.',
          department: u.department || 'Khoa Công nghệ Thông tin',
        }));
        setSystemUsersList(normalized);
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  // Khi tài khoản đăng nhập thay đổi (switch user) -> lập tức fetch lại dữ liệu mới nhất
  useEffect(() => {
    void fetchQGroups();
    void fetchGroupInvitations();
    void fetchFriendRequests();
  }, [myEmail, fetchQGroups, fetchGroupInvitations, fetchFriendRequests]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedGroupId]);

  useEffect(() => {
    if (selectedGroupId) {
      markGroupAsRead(selectedGroupId);
    }
  }, [selectedGroupId, markGroupAsRead]);

  // Click outside to close menus
  useEffect(() => {
    const handler = () => {
      setMenuGroupId(null);
      setIsEmojiPickerOpen(false);
      setIsAttachPopoverOpen(false);
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  // ── Sorted groups ─────────────────────────────────────────────────────────
  const sortedGroups = useMemo(() => {
    return [...qgroups]
      .filter((g) => {
        // Bảo mật Tin nhắn riêng 1-1: Chỉ hiển thị cho 2 người tham gia
        if (g.isDirect) {
          const cleanOwner = (g.ownerEmail || '').trim().toLowerCase();
          const cleanPartner = (g.directPartnerEmail || '').trim().toLowerCase();
          const membersList = (g.members || []).map((m) => String(m).trim().toLowerCase());
          const isParticipant =
            myEmail === cleanOwner ||
            myEmail === cleanPartner ||
            membersList.includes(myEmail);
          if (!isParticipant) return false;
        }

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          return (
            (g.name || '').toLowerCase().includes(q) ||
            (g.department || '').toLowerCase().includes(q) ||
            (g.code || '').toLowerCase().includes(q)
          );
        }
        if (filterTab === 'groups') return !g.isDirect;
        if (filterTab === 'friends') return Boolean(g.isDirect);
        if (filterTab === 'unread') {
          const msgs = g.messages || [];
          if (!msgs.length) return false;
          const last = msgs[msgs.length - 1];
          return (
            last.senderEmail?.toLowerCase() !== myEmail &&
            !(last.readBy || []).some((r) => String(r).toLowerCase() === myEmail)
          );
        }
        return true;
      })
      .sort((a, b) => getGroupSortTime(b) - getGroupSortTime(a));
  }, [qgroups, searchQuery, filterTab, myEmail]);

  // Tự động chọn nhóm/hội thoại hợp lệ hiển thị cho tài khoản hiện tại
  useEffect(() => {
    if (sortedGroups.length > 0) {
      const isValid = sortedGroups.some((g) => g.id === selectedGroupId || g.code === selectedGroupId);
      if (!isValid) {
        setSelectedGroupId(sortedGroups[0].id);
      }
    } else if (qgroups.length > 0 && !selectedGroupId) {
      setSelectedGroupId(qgroups[0].id);
    }
  }, [sortedGroups, qgroups, selectedGroupId]);

  const activeGroup = useMemo(
    () => qgroups.find((g) => g.id === selectedGroupId) ?? null,
    [qgroups, selectedGroupId]
  );

  const activeInfo = useMemo(
    () => (activeGroup ? resolveChatDisplayInfo(activeGroup, myEmail) : null),
    [activeGroup, myEmail]
  );

  const totalInvitations = friendRequests.length + groupInvitations.length;

  // ── Rich Text Insertion ───────────────────────────────────────────────────
  const insertFormatting = (prefix: string, suffix: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = chatInput.substring(start, end);
    const replacement = prefix + (selected || 'nội dung') + suffix;
    const nextVal = chatInput.substring(0, start) + replacement + chatInput.substring(end);
    setChatInput(nextVal);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + (selected ? selected.length : 8));
    }, 50);
  };

  // ── Send Message ──────────────────────────────────────────────────────────
  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    if ((!chatInput.trim() && !selectedAttachment) || !activeGroup) return;

    const now = Date.now();
    const newMsg: QGroupMessage = {
      id: `msg-${now}`,
      senderEmail: myEmail,
      senderName: myName,
      senderTitle: currentUser?.academicTitle || 'GV',
      avatarColor: 'bg-slate-700',
      text: chatInput.trim(),
      attachment: selectedAttachment || undefined,
      replyTo: replyingToMessage
        ? {
            id: replyingToMessage.id,
            senderName: replyingToMessage.senderName,
            text: (replyingToMessage.text || 'Tệp đính kèm').slice(0, 80),
          }
        : undefined,
      timestamp: new Date().toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      readBy: [myEmail],
    };

    const updated = qgroups.map((g) =>
      g.id === activeGroup.id
        ? { ...g, updatedAt: now, messages: [...(g.messages || []), newMsg] }
        : g
    );
    applyGroups(updated);
    setChatInput('');
    setSelectedAttachment(null);
    setReplyingToMessage(null);
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 60);

    const targetId = activeGroup.id || activeGroup.code;
    apiClient
      .fetch(
        `${API_BASE}/documents/qgroups/${encodeURIComponent(targetId)}/messages`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newMsg),
        }
      )
      .catch(() => {});
  };

  // ── Hàm tra cứu danh tính tài khoản trên toàn hệ thống QuizGen / UTH ────
  const lookupAccount = useCallback(
    async (emailVal: string) => {
      const clean = emailVal.trim().toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
      if (!clean || !emailRegex.test(clean)) {
        return null;
      }
      try {
        const res = await apiClient.fetch(
          `${API_BASE}/auth/users/lookup?email=${encodeURIComponent(clean)}`
        );
        if (res.ok) {
          const data = await res.json();
          if (data.exists && data.user) {
            return data.user as {
              id?: string;
              email: string;
              fullName: string;
              academicTitle?: string;
              department?: string;
              university?: string;
              role?: string;
            };
          }
        }
      } catch {}

      // Kiểm tra trong danh mục tài khoản động từ API
      const dynamicUser = systemUsersList.find((u) => u.email.toLowerCase() === clean);
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

      const localRegistered: Record<
        string,
        { fullName: string; academicTitle: string; department: string }
      > = {
        'mr.av1222005@gmail.com': {
          fullName: 'Mr. AV',
          academicTitle: 'ThS.',
          department: 'Khoa Công nghệ Thông tin',
        },
        'avanimechannel@gmail.com': {
          fullName: 'Vũ Anh',
          academicTitle: 'ThS.',
          department: 'Khoa Công nghệ Thông tin',
        },
        'hieuhieu22112005@gmail.com': {
          fullName: 'Hieu Huynh',
          academicTitle: 'ThS.',
          department: 'Khoa Công nghệ Thông tin',
        },
        'daipqps37469@gmail.com': {
          fullName: 'Đại Phạm Quang',
          academicTitle: 'ThS.',
          department: 'Khoa Công nghệ Thông tin',
        },
        'vuha3608@ut.edu.vn': {
          fullName: 'Vũ Hồ Anh',
          academicTitle: 'ThS.',
          department: 'Khoa Công nghệ Thông tin',
        },
        'nguyentann0804@gmail.com': {
          fullName: 'Nguyễn Văn Tân',
          academicTitle: 'TS.',
          department: 'Khoa Công nghệ Thông tin',
        },
        'quizgen.ai.team@gmail.com': {
          fullName: 'Ban Quản trị QuizGen AI',
          academicTitle: 'Admin',
          department: 'Hệ thống Khảo thí UTH',
        },
        'hod.cntt@uth.edu.vn': {
          fullName: 'PGS. TS. Trưởng Khoa CNTT',
          academicTitle: 'PGS. TS.',
          department: 'Khoa Công nghệ Thông tin',
        },
        'gv.kinhte@uth.edu.vn': {
          fullName: 'TS. Giảng viên Kinh tế',
          academicTitle: 'TS.',
          department: 'Khoa Kinh tế Vận tải',
        },
      };

      if (localRegistered[clean]) {
        const info = localRegistered[clean];
        return {
          email: clean,
          fullName: info.fullName,
          academicTitle: info.academicTitle,
          department: info.department,
          university: 'Trường Đại học Giao thông Vận tải TP.HCM (UTH)',
          role: 'lecturer',
        };
      }

      const foundInGroups = qgroups.find((g) => {
        const members = (g.members || []).map((m) => String(m).toLowerCase());
        return members.includes(clean) || g.ownerEmail?.toLowerCase() === clean;
      });

      if (foundInGroups) {
        return {
          email: clean,
          fullName: clean.split('@')[0],
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

  // ── Tra cứu cho modal Thêm thành viên vào kênh đang mở ───────────────────
  const handleLookupUser = useCallback(
    async (email: string) => {
      const clean = email.trim().toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
      if (!clean || !emailRegex.test(clean)) {
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
        setLookupStatus('not_found');
      }
    },
    [lookupAccount]
  );

  // ── Tra cứu cho modal Thêm bạn bè mới ─────────────────────────────────────
  const handleFriendLookup = useCallback(
    async (emailVal: string) => {
      const clean = emailVal.trim().toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
      if (!clean || !emailRegex.test(clean)) {
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
        setFriendLookupStatus('not_found');
      }
    },
    [lookupAccount]
  );

  // ── Tra cứu cho modal Tạo kênh học thuật mới ──────────────────────────────
  const handleCreateGroupMemberLookup = useCallback(
    async (emailVal: string) => {
      const clean = emailVal.trim().toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
      if (!clean || !emailRegex.test(clean)) {
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
        setCreateGroupLookupStatus('not_found');
      }
    },
    [lookupAccount]
  );

  // ── Chọn thành viên cho kênh Tạo mới ─────────────────────────────────────
  const handleAddMemberToNewGroup = useCallback(
    (user: { email: string; fullName?: string; name?: string; academicTitle?: string; title?: string; department?: string; dept?: string }) => {
      const clean = user.email.trim().toLowerCase();
      const memberName = user.fullName || user.name || clean.split('@')[0];
      const title = user.academicTitle || user.title;
      const dept = user.department || user.dept;
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

  // ── Hàng đợi chọn nhiều người trong modal Thêm thành viên vào kênh ───────
  const handleQueueDirectAddMember = useCallback(
    (user: { email: string; fullName?: string; name?: string; academicTitle?: string; title?: string; department?: string; dept?: string }) => {
      if (!activeGroup) return;
      const clean = user.email.trim().toLowerCase();
      const memberName = user.fullName || user.name || clean.split('@')[0];
      const title = user.academicTitle || user.title;
      const dept = user.department || user.dept;
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

  // ── Hàng đợi chọn nhiều người trong modal Thêm bạn bè ────────────────────
  const handleQueueFriendInvite = useCallback(
    (user: { email: string; fullName?: string; name?: string; academicTitle?: string; title?: string; department?: string; dept?: string }) => {
      const clean = user.email.trim().toLowerCase();
      const memberName = user.fullName || user.name || clean.split('@')[0];
      const title = user.academicTitle || user.title;
      const dept = user.department || user.dept;
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

  // Kiểm tra quan hệ bạn bè của 1 email bất kỳ
  const getFriendshipState = useCallback(
    (targetEmail: string) => {
      const target = targetEmail.trim().toLowerCase();
      if (target === myEmail.toLowerCase()) return { type: 'self' as const };

      // 1. Đã là bạn bè (đã có phòng DM 1-1)
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

      // 2. Lời mời đã gửi đi đang chờ duyệt
      const isPendingSent = sentFriendRequests.some(
        (r) => r.targetEmail?.trim().toLowerCase() === target && r.status === 'pending'
      );
      if (isPendingSent) return { type: 'sent_pending' as const };

      // 3. Lời mời đối phương gửi đến đang chờ chấp nhận
      const incomingReq = friendRequests.find(
        (r) => r.senderEmail?.trim().toLowerCase() === target && r.status === 'pending'
      );
      if (incomingReq) return { type: 'received_pending' as const, req: incomingReq };

      return { type: 'none' as const };
    },
    [myEmail, qgroups, sentFriendRequests, friendRequests]
  );

  // Đóng modal Thêm Bạn Bè và reset trạng thái
  const handleCloseAddFriendModal = useCallback(() => {
    setIsAddFriendOpen(false);
    setFriendEmailInput('');
    setFriendLookedUpUser(null);
    setFriendLookupStatus('idle');
  }, []);

  // ── Thêm thành viên trực tiếp vào kênh đang mở (kèm tin nhắn thông báo) ────
  const handleAddUserToActiveChannel = useCallback(
    async (emailToAdd: string, displayName?: string) => {
      if (!activeGroup) return;
      const clean = emailToAdd.trim().toLowerCase();
      const currentMembers = (activeGroup.members || []).map((m) =>
        String(m).toLowerCase()
      );

      if (currentMembers.includes(clean)) {
        onShowToast(
          'info',
          'Đã là thành viên',
          `${clean} đã có mặt trong kênh #${activeGroup.name}`
        );
        return;
      }

      setIsAddingMember(true);
      const updatedMembers = [...(activeGroup.members || []), clean];
      const memberName = displayName || lookedUpUser?.fullName || clean;
      const nowMs = Date.now();
      const timeStr = new Date().toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
      });
      const announcementMsg: QGroupMessage = {
        id: `msg-${nowMs}`,
        senderEmail: 'system',
        senderName: 'Hệ Thống Q-Group',
        isSystem: true,
        timestamp: timeStr,
        text: `🎉 ${myName} đã thêm ${memberName} (${clean}) vào kênh #${activeGroup.name}.`,
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

      const nextGroups = qgroups.map((g) =>
        g.id === activeGroup.id ? updatedGroup : g
      );
      applyGroups(nextGroups);

      try {
        await apiClient.fetch(
          `${API_BASE}/documents/qgroups/${encodeURIComponent(activeGroup.id)}/members`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: clean,
              name: memberName,
              inviterName: myName,
              group: updatedGroup,
            }),
          }
        );
      } catch {
        try {
          await apiClient.fetch(
            `${API_BASE}/documents/qgroups/${encodeURIComponent(activeGroup.id)}`,
            {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                members: updatedMembers,
                memberCount: updatedMembers.length,
                messages: updatedMessages,
                group: updatedGroup,
              }),
            }
          );
        } catch {}
      }

      // Luôn đồng bộ danh sách nhóm toàn diện lên server backend (bảo toàn tin nhắn thông báo)
      void syncGroupsToBackend(nextGroups);

      setIsAddingMember(false);
      setIsDirectAddMemberOpen(false);
      setDirectAddMemberEmail('');
      setLookedUpUser(null);
      setLookupStatus('idle');
      onShowToast(
        'success',
        'Đã thêm thành viên',
        `Đã thêm ${memberName} (${clean}) vào kênh #${activeGroup.name}`
      );
      void fetchQGroups();
    },
    [activeGroup, qgroups, lookedUpUser, myName, myEmail, applyGroups, fetchQGroups, syncGroupsToBackend, onShowToast]
  );

  // ── Gửi lời mời chính thức vào kênh (Chờ đồng nghiệp bấm chấp nhận) ──────────
  const handleSendGroupInvitation = useCallback(
    async (targetEmail: string, targetName?: string) => {
      if (!activeGroup) return;
      const clean = targetEmail.trim().toLowerCase();
      const currentMembers = (activeGroup.members || []).map((m) =>
        String(m).toLowerCase()
      );
      if (currentMembers.includes(clean)) {
        onShowToast(
          'info',
          'Đã là thành viên',
          `${clean} đã có mặt trong kênh #${activeGroup.name}`
        );
        return;
      }
      const displayName = targetName || clean;
      const inv = {
        id: `inv-${Date.now()}`,
        groupId: activeGroup.id,
        groupCode: activeGroup.code,
        groupName: activeGroup.name,
        inviterEmail: myEmail,
        inviterName: myName,
        targetEmail: clean,
        targetName: displayName,
        status: 'pending',
        invitedAt: new Date().toISOString(),
      };
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
        setDirectAddMemberEmail('');
        setLookedUpUser(null);
        setLookupStatus('idle');
        void fetchGroupInvitations();
      } catch {
        onShowToast('error', 'Lỗi kết nối', 'Không thể gửi lời mời nhóm.');
      }
    },
    [activeGroup, myEmail, myName, onShowToast, fetchGroupInvitations]
  );

  // ── Thêm hàng loạt thành viên đã chọn vào kênh đang mở ───────────────────
  const handleBatchAddUsersToActiveChannel = useCallback(async () => {
    if (!activeGroup || directAddSelectedMembers.length === 0) return;
    setIsAddingMember(true);
    const newEmails = directAddSelectedMembers.map((m) => m.email.trim().toLowerCase());
    const updatedMembers = Array.from(new Set([...(activeGroup.members || []).map((m) => String(m).toLowerCase()), ...newEmails]));
    const memberNames = directAddSelectedMembers.map((m) => m.fullName).join(', ');
    const nowMs = Date.now();
    const timeStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const announcementMsg: QGroupMessage = {
      id: `msg-${nowMs}`,
      senderEmail: 'system',
      senderName: 'Hệ Thống Q-Group',
      isSystem: true,
      timestamp: timeStr,
      text: `🎉 ${myName} đã thêm ${directAddSelectedMembers.length} thành viên (${memberNames}) vào kênh #${activeGroup.name}.`,
      readBy: [myEmail, ...newEmails],
    };
    const updatedMessages = [...(activeGroup.messages || []), announcementMsg];
    const updatedGroup = {
      ...activeGroup,
      members: updatedMembers,
      memberCount: updatedMembers.length,
      messages: updatedMessages,
      updatedAt: nowMs,
    };
    const nextGroups = qgroups.map((g) => (g.id === activeGroup.id ? updatedGroup : g));
    applyGroups(nextGroups);
    void syncGroupsToBackend(nextGroups);

    setIsAddingMember(false);
    setDirectAddSelectedMembers([]);
    setIsDirectAddMemberOpen(false);
    setDirectAddMemberEmail('');
    setLookedUpUser(null);
    setLookupStatus('idle');
    onShowToast('success', 'Đã thêm thành viên', `Đã thêm ${newEmails.length} đồng nghiệp vào kênh #${activeGroup.name}`);
    void fetchQGroups();
  }, [activeGroup, directAddSelectedMembers, myName, myEmail, qgroups, applyGroups, syncGroupsToBackend, fetchQGroups, onShowToast]);

  // ── Gửi lời mời hàng loạt cho các thành viên trong hàng đợi ─────────────
  const handleBatchSendGroupInvitations = useCallback(async () => {
    if (!activeGroup || directAddSelectedMembers.length === 0) return;
    for (const m of directAddSelectedMembers) {
      await handleSendGroupInvitation(m.email, m.fullName);
    }
    setDirectAddSelectedMembers([]);
    setIsDirectAddMemberOpen(false);
  }, [activeGroup, directAddSelectedMembers, handleSendGroupInvitation]);

  // ── Reaction Handlers ─────────────────────────────────────────────────────
  const handleToggleReaction = useCallback(
    (msgId: string, emoji: string) => {
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
    },
    [activeGroup, qgroups, myEmail, applyGroups]
  );

  // ── Start Reply ───────────────────────────────────────────────────────────
  const handleStartReply = useCallback((msg: QGroupMessage) => {
    setReplyingToMessage(msg);
    textareaRef.current?.focus();
  }, []);

  // ── Inline Edit Message ───────────────────────────────────────────────────
  const handleStartEditMessage = useCallback((msg: QGroupMessage) => {
    setEditingMessageId(msg.id);
    setEditText(msg.text || '');
  }, []);

  const handleSaveEditMessage = useCallback(
    (msgId: string) => {
      if (!activeGroup || !editText.trim()) return;
      const updated = qgroups.map((g) => {
        if (g.id !== activeGroup.id) return g;
        const msgs = (g.messages || []).map((m) => {
          if (m.id !== msgId) return m;
          return { ...m, text: editText.trim(), isEdited: true };
        });
        return { ...g, messages: msgs };
      });
      applyGroups(updated);
      setEditingMessageId(null);
      setEditText('');
      onShowToast(
        'success',
        'Đã cập nhật',
        'Nội dung tin nhắn đã được chỉnh sửa.'
      );
    },
    [activeGroup, qgroups, editText, applyGroups, onShowToast]
  );

  // ── Recall / Thu hồi tin nhắn ─────────────────────────────────────────────
  const handleRecallMessage = useCallback(
    (msgId: string) => {
      if (!activeGroup) return;
      const updated = qgroups.map((g) => {
        if (g.id !== activeGroup.id) return g;
        const msgs = (g.messages || []).map((m) => {
          if (m.id !== msgId) return m;
          return {
            ...m,
            text: '',
            isRecalled: true,
            attachment: undefined,
            sharedPost: undefined,
          };
        });
        return { ...g, messages: msgs };
      });
      applyGroups(updated);
      onShowToast('info', 'Đã thu hồi', 'Tin nhắn của Thầy/Cô đã được thu hồi.');
    },
    [activeGroup, qgroups, applyGroups, onShowToast]
  );

  // ── Delete / Xóa tin nhắn ─────────────────────────────────────────────────
  const handleDeleteMessage = useCallback(
    (msgId: string) => {
      if (!activeGroup) return;
      if (!confirm('Xóa tin nhắn này vĩnh viễn khỏi cuộc trò chuyện?')) return;
      const updated = qgroups.map((g) => {
        if (g.id !== activeGroup.id) return g;
        const msgs = (g.messages || []).filter((m) => m.id !== msgId);
        return { ...g, messages: msgs };
      });
      applyGroups(updated);
      onShowToast(
        'info',
        'Đã xóa tin nhắn',
        'Tin nhắn đã được xóa khỏi cuộc trò chuyện.'
      );
    },
    [activeGroup, qgroups, applyGroups, onShowToast]
  );

  // ── Pin / Ghim tin nhắn ───────────────────────────────────────────────────
  const handleTogglePinMessage = useCallback(
    (msgId: string) => {
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
    },
    [activeGroup, qgroups, applyGroups, onShowToast]
  );

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleDeleteChat = useCallback(
    (group: QGroup) => {
      if (!confirm(`Xóa đoạn chat "${group.name}"?`)) return;
      addToBlacklist(myEmail, group.id, group.code);
      const next = qgroups.filter(
        (g) => g.id !== group.id && g.code !== group.code
      );
      applyGroups(next);
      if (selectedGroupId === group.id) {
        setSelectedGroupId(next[0]?.id || '');
      }
      apiClient
        .fetch(`${API_BASE}/documents/qgroups/${encodeURIComponent(group.id)}`, {
          method: 'DELETE',
        })
        .catch(() => {});
      onShowToast('info', 'Đã xóa đoạn chat', group.name);
    },
    [myEmail, qgroups, applyGroups, selectedGroupId, onShowToast]
  );

  const handleDisbandGroup = useCallback(
    async (group: QGroup) => {
      if (
        !confirm(
          `CẢNH BÁO NGUY HIỂM: Bạn có chắc chắn muốn giải tán nhóm "${group.name}"? Toàn bộ thành viên sẽ bị xóa khỏi nhóm và toàn bộ lịch sử trò chuyện sẽ biến mất vĩnh viễn.`
        )
      ) {
        return;
      }
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
      if (selectedGroupId === group.id) setSelectedGroupId(next[0]?.id || '');
      setIsChannelDetailsOpen(false);
      onShowToast('success', 'Đã giải tán nhóm', group.name);
    },
    [myEmail, qgroups, applyGroups, selectedGroupId, onShowToast]
  );

  const handleLeaveGroup = useCallback(
    async (group: QGroup) => {
      const isOwner = (group.ownerEmail || '').toLowerCase() === myEmail.toLowerCase();
      // Nếu là Trưởng nhóm trong nhóm học thuật (không phải DM)
      if (isOwner && !group.isDirect) {
        const otherMembers = (group.members || []).filter(
          (m) => m.toLowerCase() !== myEmail.toLowerCase()
        );
        // Trường hợp 1: Chỉ có 1 mình trưởng nhóm trong nhóm
        if (otherMembers.length === 0) {
          if (
            confirm(
              `Bạn là thành viên duy nhất trong nhóm "${group.name}". Rời nhóm sẽ đồng thời giải tán nhóm vĩnh viễn. Bạn có đồng ý giải tán nhóm không?`
            )
          ) {
            void handleDisbandGroup(group);
          }
          return;
        }

        // Trường hợp 2: Có các thành viên khác -> Mở Modal Nhượng quyền Trưởng nhóm
        setTransferGroup(group);
        setSelectedNewOwner(otherMembers[0] || '');
        setIsTransferOwnerModalOpen(true);
        return;
      }

      // Thành viên bình thường rời nhóm
      if (!confirm(`Rời khỏi nhóm "${group.name}"?`)) return;
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
      if (selectedGroupId === group.id) setSelectedGroupId(next[0]?.id || '');
      onShowToast('info', 'Đã rời khỏi nhóm', group.name);
    },
    [myEmail, myName, qgroups, applyGroups, selectedGroupId, handleDisbandGroup, onShowToast]
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
            alsoLeave: true,
          }),
        }
      );
      if (res.ok) {
        addToBlacklist(myEmail, transferGroup.id, transferGroup.code);
        const next = qgroups.filter(
          (g) => g.id !== transferGroup.id && g.code !== transferGroup.code
        );
        applyGroups(next);
        if (selectedGroupId === transferGroup.id) {
          setSelectedGroupId(next[0]?.id || '');
        }
        setIsTransferOwnerModalOpen(false);
        setTransferGroup(null);
        onShowToast(
          'success',
          'Nhượng quyền thành công',
          `Đã nhượng quyền cho ${selectedNewOwner} và rời khỏi nhóm.`
        );
      } else {
        onShowToast('error', 'Lỗi', 'Không thể nhượng quyền trưởng nhóm.');
      }
    } catch {
      onShowToast('error', 'Lỗi', 'Lỗi kết nối khi nhượng quyền.');
    } finally {
      setIsTransferringOwner(false);
    }
  }, [transferGroup, selectedNewOwner, myEmail, myName, qgroups, applyGroups, selectedGroupId, onShowToast]);

  const handleKickMember = useCallback(
    async (group: QGroup, targetEmail: string, targetName: string) => {
      if (!confirm(`Bạn có chắc chắn muốn loại "${targetName}" (${targetEmail}) ra khỏi nhóm?`)) return;
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
          onShowToast('success', 'Đã loại thành viên', `${targetName} đã rời khỏi nhóm.`);
        } else {
          onShowToast('warning', 'Không thể loại thành viên', res.message || 'Lỗi thao tác');
        }
      } catch {
        onShowToast('error', 'Lỗi kết nối', 'Không thể gửi yêu cầu loại thành viên.');
      }
    },
    [myName, qgroups, applyGroups, onShowToast]
  );

  const handleRespondJoinRequest = useCallback(
    async (
      group: QGroup,
      requestId: string,
      targetEmail: string,
      action: 'approve' | 'reject'
    ) => {
      try {
        const res = await apiClient
          .fetch(`${API_BASE}/documents/qgroups/${group.id}/respond-join-request`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              requestId,
              targetEmail,
              action,
              adminName: myName,
            }),
          })
          .then((r) => r.json());

        if (res.status === 'success' && res.group) {
          const updated = qgroups.map((g) => (g.id === group.id ? res.group : g));
          applyGroups(updated);
          if (action === 'approve') {
            onShowToast('success', 'Đã phê duyệt', 'Thành viên mới đã được thêm vào nhóm.');
          } else {
            onShowToast('info', 'Đã từ chối', 'Đã từ chối yêu cầu tham gia.');
          }
        }
      } catch {
        onShowToast('error', 'Lỗi', 'Không thể xử lý yêu cầu tham gia.');
      }
    },
    [myName, qgroups, applyGroups, onShowToast]
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
        // Local fallback
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
    [myName, qgroups, applyGroups, onShowToast]
  );

  const handleToggleMute = useCallback(
    (group: QGroup) => {
      const updated = qgroups.map((g) =>
        g.id === group.id ? { ...g, muted: !g.muted } : g
      );
      applyGroups(updated);
      void syncGroupsToBackend(updated);
      onShowToast(
        'info',
        'Thông báo',
        group.muted ? 'Đã bật thông báo' : 'Đã tắt thông báo'
      );
    },
    [qgroups, applyGroups, syncGroupsToBackend, onShowToast]
  );

  const handleSendFriendRequest = async (overrideEmail?: string) => {
    const email = (overrideEmail || friendEmailInput).trim().toLowerCase();
    if (!email) return;
    if (email === myEmail) {
      onShowToast('warning', 'Không hợp lệ', 'Bạn không thể kết bạn với chính mình.');
      return;
    }

    // Kiểm tra nếu đã là bạn bè / có phòng nhắn tin riêng 1-1
    const alreadyFriend = qgroups.some((g) => {
      if (!g.isDirect) return false;
      const cleanOwner = (g.ownerEmail || '').trim().toLowerCase();
      const cleanPartner = (g.directPartnerEmail || '').trim().toLowerCase();
      const members = (g.members || []).map((m) => String(m).trim().toLowerCase());
      return (
        (cleanOwner === email && cleanPartner === myEmail) ||
        (cleanPartner === email && cleanOwner === myEmail) ||
        (members.includes(email) && members.includes(myEmail))
      );
    });
    if (alreadyFriend) {
      onShowToast('info', 'Đã là đồng nghiệp', `Thầy/Cô và ${email} đã kết nối bạn bè thành công trước đó.`);
      return;
    }

    // Kiểm tra nếu đã gửi lời mời đang chờ duyệt
    const alreadyPending = sentFriendRequests.some((r) => r.targetEmail?.trim().toLowerCase() === email && r.status === 'pending');
    if (alreadyPending) {
      onShowToast('info', 'Lời mời đang chờ duyệt', `Thầy/Cô đã gửi lời mời kết nối tới ${email} trước đó.`);
      return;
    }

    const req: FriendRequest = {
      id: `fr-${Date.now()}`,
      senderEmail: myEmail,
      senderName: myName,
      senderTitle: currentUser?.academicTitle || 'ThS.',
      targetEmail: email,
      recipientEmail: email,
      requestedAt: new Date().toISOString(),
      status: 'pending',
    };
    try {
      const res = await apiClient.fetch(`${API_BASE}/documents/friend-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.status !== 'already_friend') {
        setSentFriendRequests((prev) => [req, ...prev.filter((r) => r.targetEmail !== email)]);
        onShowToast('success', 'Đã gửi lời mời', `Đã gửi lời mời kết bạn tới: ${email}`);
        if (!overrideEmail) {
          setFriendEmailInput('');
          setFriendLookedUpUser(null);
          setFriendLookupStatus('idle');
          setIsAddFriendOpen(false);
        }
        void fetchFriendRequests();
      } else if (data.status === 'already_friend') {
        onShowToast('info', 'Đã là đồng nghiệp', data.message || `Đã kết nối với ${email}.`);
        if (!overrideEmail) {
          setIsAddFriendOpen(false);
        }
      }
    } catch {
      onShowToast('error', 'Lỗi', 'Không thể gửi lời mời.');
    }
  };

  const handleBatchSendFriendRequests = async () => {
    if (selectedFriendsToInvite.length === 0) return;
    const count = selectedFriendsToInvite.length;
    for (const m of selectedFriendsToInvite) {
      await handleSendFriendRequest(m.email);
    }
    setSelectedFriendsToInvite([]);
    handleCloseAddFriendModal();
    onShowToast('success', 'Đã gửi lời mời', `Đã gửi lời mời kết bạn tới ${count} đồng nghiệp.`);
  };

  const handleAcceptFriendRequest = async (req: FriendRequest) => {
    try {
      const res = await apiClient.fetch(
        `${API_BASE}/documents/friend-requests/${req.id}/respond`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'accept', userEmail: myEmail, userName: myName }),
        }
      );
      if (res.ok) {
        setFriendRequests((prev) => prev.filter((r) => r.id !== req.id));
        await fetchQGroups();
        onShowToast('success', 'Đã kết bạn thành công', req.senderName || req.senderEmail);
      }
    } catch {}
  };

  const handleRejectFriendRequest = async (req: FriendRequest) => {
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
  };

  const handleAcceptGroupInv = async (inv: QGroupInvitation) => {
    try {
      removeFromBlacklist(myEmail, inv.groupId, inv.groupCode);
      await apiClient.fetch(
        `${API_BASE}/documents/qgroups/invitations/${inv.id}/respond`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'accept', userEmail: myEmail, userName: myName }),
        }
      );
      setGroupInvitations((prev) => prev.filter((i) => i.id !== inv.id));
      await fetchQGroups();
      setSelectedGroupId(inv.groupId);
      setFilterTab('groups');
      onShowToast('success', 'Đã tham gia nhóm', inv.groupName);
    } catch {}
  };

  const handleRejectGroupInv = async (inv: QGroupInvitation) => {
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
  };

  const handleInviteToGroup = async (group: QGroup) => {
    const email = inviteEmailInput.trim().toLowerCase();
    if (!email || !group) return;
    const inv = {
      id: `inv-${Date.now()}`,
      groupId: group.id,
      groupCode: group.code,
      groupName: group.name,
      inviterEmail: myEmail,
      inviterName: myName,
      targetEmail: email,
      status: 'pending',
      invitedAt: new Date().toISOString(),
    };
    try {
      await apiClient.fetch(`${API_BASE}/documents/qgroups/invitations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inv),
      });
      onShowToast('success', 'Đã gửi lời mời', `Đã mời ${email} vào nhóm.`);
      setInviteEmailInput('');
    } catch {}
  };

  const handleCreateGroup = () => {
    if (!newGroupName.trim()) return;
    const now = Date.now();
    const code = `QGRP-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
    const selectedEmails = createGroupSelectedMembers.map((m) => m.email.trim().toLowerCase());
    const initialMembers = Array.from(new Set([myEmail.toLowerCase(), ...selectedEmails]));
    const memberNamesList = createGroupSelectedMembers.map((m) => m.fullName).join(', ');

    const systemNotice =
      createGroupSelectedMembers.length > 0
        ? `🎉 Nhóm "${newGroupName.trim()}" đã được khởi tạo bởi ${myName} cùng ${createGroupSelectedMembers.length} đồng nghiệp: ${memberNamesList}. Mã phòng: ${code}`
        : `Nhóm "${newGroupName.trim()}" đã được khởi tạo bởi ${myName}. Mã phòng: ${code}`;

    const group: QGroup = {
      id: `qg-${now}`,
      code,
      name: newGroupName.trim(),
      department: newGroupDept.trim() || 'Khoa Chuyên Ngành',
      description:
        newGroupDesc.trim() || 'Không gian làm việc chung: trao đổi câu hỏi, chia sẻ giáo trình và thống nhất ma trận đề thi.',
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
          timestamp: new Date().toLocaleTimeString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
          }),
          text: systemNotice,
        },
      ],
    };
    const next = [group, ...qgroups];
    applyGroups(next);
    void syncGroupsToBackend(next);
    setSelectedGroupId(group.id);
    setIsCreateGroupOpen(false);
    setNewGroupName('');
    setNewGroupDept('');
    setNewGroupDesc('');
    setCreateGroupSelectedMembers([]);
    setCreateGroupMemberInput('');
    setCreateGroupLookedUpUser(null);
    setCreateGroupLookupStatus('idle');
    onShowToast('success', 'Đã tạo nhóm', `Mã phòng: ${code} (${initialMembers.length} thành viên)`);
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
        const updated = [joinedGroup, ...filtered];
        applyGroups(updated);
        setSelectedGroupId(joinedGroup.id);
        onShowToast('success', 'Tham gia nhóm thành công', res.message || `Chào mừng bạn đến với ${joinedGroup.name}`);
      } else if (res.status === 'already_member') {
        setIsCreateGroupOpen(false);
        setSelectedGroupId(res.group?.id || '');
        onShowToast('info', 'Bạn đã là thành viên', res.message || 'Bạn đã tham gia nhóm này trước đó.');
      } else if (res.status === 'pending_approval') {
        setIsCreateGroupOpen(false);
        onShowToast('info', 'Yêu cầu tham gia đã gửi', res.message);
      } else if (res.status === 'invite_only') {
        onShowToast('warning', 'Nhóm riêng tư', res.message);
      } else {
        onShowToast('warning', 'Không thể tham gia', res.message || `Mã ${c} không hợp lệ.`);
      }
    } catch {
      onShowToast('error', 'Lỗi kết nối', 'Không thể gửi yêu cầu tham gia nhóm.');
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================
  return (
    <div
      className="flex-1 flex h-full overflow-hidden bg-[#f7f9fb] select-none"
      onClick={() => {
        setMenuGroupId(null);
        setIsEmojiPickerOpen(false);
        setIsAttachPopoverOpen(false);
      }}
    >
      {/* ====================================================================
          LEFT SIDEBAR: CONVERSATION LIST (SLACK WORKSPACE STYLE)
      ==================================================================== */}
      <div className="w-80 lg:w-96 bg-slate-50 border-r border-slate-200 flex flex-col shrink-0 h-full">
        {/* Header */}
        <div className="p-3.5 border-b border-slate-200/80 space-y-2.5 bg-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
                <span>UTH Academic Workspace</span>
                {totalInvitations > 0 && (
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                )}
              </h2>
              <p className="text-[11px] text-slate-500 font-medium">Khoa CNTT • Kênh Học Thuật Chuyên Môn</p>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsAddFriendOpen(true);
                }}
                className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
                title="Thêm đồng nghiệp mới"
              >
                <UserPlus className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setGroupModalTab('create');
                  setIsCreateGroupOpen(true);
                }}
                className="w-7 h-7 rounded-lg bg-slate-900 hover:bg-slate-800 text-white flex items-center justify-center transition-colors shadow-xs cursor-pointer"
                title="Tạo kênh mới hoặc Nhập mã"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm kênh hoặc đồng nghiệp..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-100 hover:bg-slate-200/70 focus:bg-white border border-transparent focus:border-slate-400 rounded-lg text-xs text-slate-800 placeholder-slate-400 outline-none transition-all"
            />
          </div>

          {/* Filter tabs (Slack Clean Minimal Buttons) */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setFilterTab('all');
              }}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                filterTab === 'all'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Tất cả
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setFilterTab('unread');
              }}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                filterTab === 'unread'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Chưa đọc
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setFilterTab('invitations');
              }}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                filterTab === 'invitations'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>Lời mời</span>
              {totalInvitations > 0 && (
                <span className="px-1.5 rounded-full text-[10px] font-bold bg-rose-500 text-white">
                  {totalInvitations}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Conversation List / Invitations */}
        {filterTab === 'invitations' ? (
          <InvitationsPanel
            friendRequests={friendRequests}
            sentFriendRequests={sentFriendRequests}
            groupInvitations={groupInvitations}
            onAcceptFriend={handleAcceptFriendRequest}
            onRejectFriend={handleRejectFriendRequest}
            onCancelFriend={handleCancelFriendRequest}
            onAcceptGroup={handleAcceptGroupInv}
            onRejectGroup={handleRejectGroupInv}
            onBack={() => setFilterTab('all')}
          />
        ) : (
          <div className="flex-1 overflow-y-auto py-2">
            {/* Lời mời kết bạn nổi bật cho tài khoản nhận */}
            {friendRequests.length > 0 && (
              <div
                onClick={() => setFilterTab('invitations')}
                className="mx-2 mb-2 p-2.5 rounded-lg bg-slate-900 text-white flex items-center justify-between gap-2.5 cursor-pointer hover:bg-slate-800 transition-all shadow-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <UserPlus className="w-4 h-4 text-teal-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold truncate flex items-center gap-1.5">
                      <span>{friendRequests.length} lời mời kết bạn mới</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                    </p>
                    <p className="text-[10px] text-slate-300 truncate">
                      Từ: {friendRequests[0]?.senderName || friendRequests[0]?.senderEmail}
                    </p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded bg-white/20 text-white text-[10px] font-semibold shrink-0">
                  Xem
                </span>
              </div>
            )}

            {sortedGroups.length === 0 ? (
              <div className="p-8 text-center text-slate-400 space-y-2">
                <MessageCircle className="w-8 h-8 mx-auto text-slate-300" />
                <p className="text-xs font-semibold text-slate-600">Không có kênh hay tin nhắn nào</p>
                <p className="text-[11px]">Bấm dấu + để tạo kênh chuyên môn hoặc kết nối đồng nghiệp.</p>
              </div>
            ) : filterTab === 'unread' ? (
              <div className="space-y-0.5">
                <div className="px-3 py-1 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Tin nhắn chưa đọc ({sortedGroups.length})
                </div>
                {sortedGroups.map((group) => (
                  <ConversationItem
                    key={group.id}
                    group={group}
                    isSelected={group.id === selectedGroupId}
                    myEmail={myEmail}
                    isMenuOpen={menuGroupId === group.id}
                    onSelect={() => {
                      setSelectedGroupId(group.id);
                      markGroupAsRead(group.id);
                      setMenuGroupId(null);
                    }}
                    onMenuToggle={(e) => {
                      e.stopPropagation();
                      setMenuGroupId((prev) => (prev === group.id ? null : group.id));
                    }}
                    onViewProfile={() => {
                      const info = resolveChatDisplayInfo(group, myEmail);
                      setProfileEmail(info.partnerEmail || null);
                      setProfileName(info.displayName);
                      setMenuGroupId(null);
                    }}
                    onViewDetails={() => {
                      setChannelDetailsTab('about');
                      setIsChannelDetailsOpen(true);
                      setMenuGroupId(null);
                    }}
                    onMute={() => handleToggleMute(group)}
                    onDelete={() => handleDeleteChat(group)}
                    onLeave={() => handleLeaveGroup(group)}
                    onDisband={() => handleDisbandGroup(group)}
                    onCopyCode={() => {
                      navigator.clipboard.writeText(group.code);
                      onShowToast('info', 'Đã sao chép mã phòng', group.code);
                      setMenuGroupId(null);
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {/* SECTION 1: KÊNH CHUYÊN MÔN (SLACK CHANNELS) */}
                <div>
                  <div className="flex items-center justify-between px-3 py-1 text-slate-500 hover:text-slate-800 select-none">
                    <button
                      type="button"
                      onClick={() => setIsChannelsOpen((prev) => !prev)}
                      className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                    >
                      {isChannelsOpen ? (
                        <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                      )}
                      <Hash className="w-3.5 h-3.5" />
                      <span>Kênh chuyên môn ({sortedGroups.filter((g) => !g.isDirect).length})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setGroupModalTab('create');
                        setIsCreateGroupOpen(true);
                      }}
                      className="w-5 h-5 rounded hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center cursor-pointer transition-colors"
                      title="Tạo kênh mới hoặc Nhập mã"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {isChannelsOpen && (
                    <div className="space-y-0.5 mt-0.5">
                      {sortedGroups
                        .filter((g) => !g.isDirect)
                        .map((group) => (
                          <ConversationItem
                            key={group.id}
                            group={group}
                            isSelected={group.id === selectedGroupId}
                            myEmail={myEmail}
                            isMenuOpen={menuGroupId === group.id}
                            onSelect={() => {
                              setSelectedGroupId(group.id);
                              markGroupAsRead(group.id);
                              setMenuGroupId(null);
                            }}
                            onMenuToggle={(e) => {
                              e.stopPropagation();
                              setMenuGroupId((prev) => (prev === group.id ? null : group.id));
                            }}
                            onViewProfile={() => {
                              const info = resolveChatDisplayInfo(group, myEmail);
                              setProfileEmail(info.partnerEmail || null);
                              setProfileName(info.displayName);
                              setMenuGroupId(null);
                            }}
                            onViewDetails={() => {
                              setChannelDetailsTab('about');
                              setIsChannelDetailsOpen(true);
                              setMenuGroupId(null);
                            }}
                            onMute={() => handleToggleMute(group)}
                            onDelete={() => handleDeleteChat(group)}
                            onLeave={() => handleLeaveGroup(group)}
                            onDisband={() => handleDisbandGroup(group)}
                            onCopyCode={() => {
                              navigator.clipboard.writeText(group.code);
                              onShowToast('info', 'Đã sao chép mã phòng', group.code);
                              setMenuGroupId(null);
                            }}
                          />
                        ))}
                      {sortedGroups.filter((g) => !g.isDirect).length === 0 && (
                        <p className="px-3 py-1 text-[11px] text-slate-400 italic">Chưa có kênh học thuật nào</p>
                      )}
                    </div>
                  )}
                </div>

                {/* SECTION 2: TIN NHẮN TRỰC TIẾP (SLACK DIRECT MESSAGES) */}
                <div className="pt-2 border-t border-slate-200/60">
                  <div className="flex items-center justify-between px-3 py-1 text-slate-500 hover:text-slate-800 select-none">
                    <button
                      type="button"
                      onClick={() => setIsDmsOpen((prev) => !prev)}
                      className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                    >
                      {isDmsOpen ? (
                        <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                      )}
                      <Users className="w-3.5 h-3.5" />
                      <span>Tin nhắn trực tiếp ({sortedGroups.filter((g) => Boolean(g.isDirect)).length})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAddFriendOpen(true)}
                      className="w-5 h-5 rounded hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center cursor-pointer transition-colors"
                      title="Thêm đồng nghiệp mới"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {isDmsOpen && (
                    <div className="space-y-0.5 mt-0.5">
                      {sortedGroups
                        .filter((g) => Boolean(g.isDirect))
                        .map((group) => (
                          <ConversationItem
                            key={group.id}
                            group={group}
                            isSelected={group.id === selectedGroupId}
                            myEmail={myEmail}
                            isMenuOpen={menuGroupId === group.id}
                            onSelect={() => {
                              setSelectedGroupId(group.id);
                              markGroupAsRead(group.id);
                              setMenuGroupId(null);
                            }}
                            onMenuToggle={(e) => {
                              e.stopPropagation();
                              setMenuGroupId((prev) => (prev === group.id ? null : group.id));
                            }}
                            onViewProfile={() => {
                              const info = resolveChatDisplayInfo(group, myEmail);
                              setProfileEmail(info.partnerEmail || null);
                              setProfileName(info.displayName);
                              setMenuGroupId(null);
                            }}
                            onViewDetails={() => {
                              setChannelDetailsTab('about');
                              setIsChannelDetailsOpen(true);
                              setMenuGroupId(null);
                            }}
                            onMute={() => handleToggleMute(group)}
                            onDelete={() => handleDeleteChat(group)}
                            onLeave={() => handleLeaveGroup(group)}
                            onDisband={() => handleDisbandGroup(group)}
                            onCopyCode={() => {
                              navigator.clipboard.writeText(group.code);
                              onShowToast('info', 'Đã sao chép mã phòng', group.code);
                              setMenuGroupId(null);
                            }}
                          />
                        ))}
                      {sortedGroups.filter((g) => Boolean(g.isDirect)).length === 0 && (
                        <p className="px-3 py-1 text-[11px] text-slate-400 italic">Chưa có tin nhắn 1-1 nào</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ====================================================================
          RIGHT CHAT PANEL (SLACK STYLE HEADER & RICH COMPOSER)
      ==================================================================== */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-white">
        {activeGroup && activeInfo ? (
          <>
            {/* Slack Style Chat Header */}
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between gap-3 bg-white shadow-2xs z-10 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  onClick={() => {
                    if (activeGroup.isDirect) {
                      setProfileEmail(activeInfo.partnerEmail || null);
                      setProfileName(activeInfo.displayName);
                    } else {
                      setIsChannelDetailsOpen(true);
                    }
                  }}
                  className="w-9 h-9 rounded-lg bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center cursor-pointer hover:bg-slate-300 transition-colors"
                >
                  {activeGroup.isDirect ? (
                    <div className="relative">
                      <span>{activeInfo.avatarInitials}</span>
                      <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-1 ring-white" />
                    </div>
                  ) : (
                    <Hash className="w-5 h-5 text-slate-700" />
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3
                      onClick={() => {
                        if (activeGroup.isDirect) {
                          setProfileEmail(activeInfo.partnerEmail || null);
                          setProfileName(activeInfo.displayName);
                        } else {
                          setIsChannelDetailsOpen(true);
                        }
                      }}
                      className="text-sm font-bold text-slate-900 truncate cursor-pointer hover:underline flex items-center gap-1.5"
                    >
                      {!activeGroup.isDirect ? (
                        <Hash className="w-4 h-4 text-slate-500 shrink-0" />
                      ) : (
                        <span className="text-slate-500 font-bold shrink-0">@</span>
                      )}
                      <span>{activeInfo.displayName}</span>
                    </h3>

                    {/* Star Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsStarred(!isStarred);
                        onShowToast('info', isStarred ? 'Bỏ đánh dấu sao' : 'Đã đánh dấu sao kênh', activeInfo.displayName);
                      }}
                      className={`p-1 rounded-md transition-colors ${
                        isStarred ? 'text-amber-500 hover:text-amber-600' : 'text-slate-400 hover:text-slate-600'
                      }`}
                      title={isStarred ? 'Bỏ đánh dấu sao' : 'Đánh dấu sao'}
                    >
                      <Star className={`w-3.5 h-3.5 ${isStarred ? 'fill-current' : ''}`} />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(activeGroup.code);
                        onShowToast('info', 'Đã sao chép mã phòng', activeGroup.code);
                      }}
                      className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-[10px] font-mono font-semibold text-slate-700 flex items-center gap-1 transition-colors shrink-0 border border-slate-200"
                      title="Sao chép mã phòng"
                    >
                      {activeGroup.code}
                      <Copy className="w-2.5 h-2.5 text-slate-500" />
                    </button>
                  </div>

                  <p className="text-[11px] text-slate-500 flex items-center gap-2">
                    {activeGroup.isDirect ? (
                      <span className="flex items-center gap-1 text-emerald-600 font-medium">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                        <span>Đang hoạt động</span>
                        <span className="text-slate-400 ml-1">• {activeInfo.displayRoleOrMembers}</span>
                      </span>
                    ) : (
                      <>
                        <span
                          onClick={() => {
                            setChannelDetailsTab('members');
                            setIsChannelDetailsOpen(true);
                          }}
                          className="hover:underline cursor-pointer hover:text-slate-900 font-medium flex items-center gap-1"
                        >
                          <Users className="w-3.5 h-3.5 text-slate-400" />
                          <span>{activeGroup.memberCount ?? (activeGroup.members || []).length} thành viên</span>
                        </span>
                        {activeGroup.department && <span>• {activeGroup.department}</span>}
                      </>
                    )}
                  </p>
                </div>
              </div>

              {/* Slack Header Action Buttons */}
              <div className="flex items-center gap-1.5 shrink-0 relative">
                {/* 1. NÚT THÊM THÀNH VIÊN HIỂN THỊ NỔI BẬT Ở NGOÀI (SLACK DIRECT ADD MEMBER) */}
                {!activeGroup.isDirect && (
                  <button
                    type="button"
                    onClick={() => {
                      setDirectAddMemberEmail('');
                      setLookedUpUser(null);
                      setLookupStatus('idle');
                      setIsDirectAddMemberOpen(true);
                    }}
                    className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-[#008689] font-bold text-xs flex items-center gap-1.5 border border-teal-200 transition-colors shadow-2xs cursor-pointer"
                    title="Thêm thành viên trực tiếp vào kênh"
                  >
                    <UserPlus className="w-3.5 h-3.5 text-[#008689] shrink-0" />
                    <span className="hidden sm:inline">Thêm thành viên</span>
                    <span className="sm:hidden font-extrabold">+ Mời</span>
                  </button>
                )}

                {/* 2. Huddle Button (Slack Clean Audio Call) */}
                <button
                  type="button"
                  onClick={() => setIsHuddleOpen(true)}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200"
                  title="Bắt đầu thảo luận nhanh (Huddle)"
                >
                  <Headphones className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                  <span className="hidden sm:inline">Huddle</span>
                  <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
                </button>

                {/* 3. Notifications */}
                <button
                  type="button"
                  onClick={() => handleToggleMute(activeGroup)}
                  className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer border border-slate-200/60"
                  title={activeGroup.muted ? 'Bật thông báo' : 'Tắt thông báo'}
                >
                  {activeGroup.muted ? <BellOff className="w-4 h-4 text-amber-500" /> : <Bell className="w-4 h-4" />}
                </button>

                {/* 4. SLACK RĂNG CƯA / THREE DOTS MENU (SỔ RA KHI CẦN - CHUẨN SLACK IMAGE 1) */}
                <div className="relative" ref={headerMenuRef}>
                  <button
                    type="button"
                    onClick={() => setIsHeaderMenuOpen((prev) => !prev)}
                    className={`p-2 rounded-lg transition-colors cursor-pointer border ${
                      isHeaderMenuOpen
                        ? 'bg-slate-200 text-slate-900 border-slate-300'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border-slate-200/60'
                    }`}
                    title="Tùy chọn kênh (Slack style)"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>

                  {/* Slack Popup Dropdown Menu */}
                  {isHeaderMenuOpen && (
                    <div
                      className="absolute right-0 top-full mt-1.5 w-60 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 text-xs animate-fade-in divide-y divide-slate-100 select-none"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="py-1">
                        <button
                          type="button"
                          onClick={() => {
                            setIsHeaderMenuOpen(false);
                            if (activeGroup.isDirect) {
                              setProfileEmail(activeInfo.partnerEmail || null);
                              setProfileName(activeInfo.displayName);
                            } else {
                              setChannelDetailsTab('about');
                              setIsChannelDetailsOpen(true);
                            }
                          }}
                          className="w-full px-3.5 py-2 text-left hover:bg-slate-50 flex items-center justify-between text-slate-700 font-medium group cursor-pointer"
                        >
                          <span className="flex items-center gap-2">
                            <Info className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700" />
                            <span>{activeGroup.isDirect ? 'Xem trang cá nhân' : 'Chi tiết kênh (Channel details)'}</span>
                          </span>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setIsHeaderMenuOpen(false);
                            navigator.clipboard.writeText(activeGroup.code);
                            onShowToast('info', 'Đã sao chép mã phòng', activeGroup.code);
                          }}
                          className="w-full px-3.5 py-2 text-left hover:bg-slate-50 flex items-center justify-between text-slate-700 font-medium group cursor-pointer"
                        >
                          <span className="flex items-center gap-2">
                            <Copy className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700" />
                            <span>Sao chép mã phòng (Copy)</span>
                          </span>
                          <span className="font-mono text-[10px] text-slate-400">{activeGroup.code}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setIsHeaderMenuOpen(false);
                            setIsStarred(!isStarred);
                            onShowToast('info', isStarred ? 'Bỏ đánh dấu sao' : 'Đã đánh dấu sao kênh', activeInfo.displayName);
                          }}
                          className="w-full px-3.5 py-2 text-left hover:bg-slate-50 flex items-center gap-2 text-slate-700 font-medium group cursor-pointer"
                        >
                          <Star className={`w-3.5 h-3.5 ${isStarred ? 'fill-amber-400 text-amber-500' : 'text-slate-400 group-hover:text-slate-700'}`} />
                          <span>{isStarred ? 'Bỏ đánh dấu sao' : 'Đánh dấu sao kênh (Star)'}</span>
                        </button>
                      </div>

                      <div className="py-1">
                        <button
                          type="button"
                          onClick={() => {
                            setIsHeaderMenuOpen(false);
                            setIsSummarizeModalOpen(true);
                          }}
                          className="w-full px-3.5 py-2 text-left hover:bg-slate-50 flex items-center justify-between text-slate-700 font-medium group cursor-pointer"
                        >
                          <span className="flex items-center gap-2">
                            <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                            <span>Tóm tắt kênh bằng AI (Summarize)</span>
                          </span>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                        </button>

                        {!activeGroup.isDirect && (
                          <button
                            type="button"
                            onClick={() => {
                              setIsHeaderMenuOpen(false);
                              setIsChannelSettingsOpen(true);
                            }}
                            className="w-full px-3.5 py-2 text-left hover:bg-slate-50 flex items-center justify-between text-slate-700 font-medium group cursor-pointer"
                          >
                            <span className="flex items-center gap-2">
                              <Settings className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700" />
                              <span>Cài đặt kênh (Edit settings)</span>
                            </span>
                            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                          </button>
                        )}
                      </div>

                      <div className="py-1">
                        <button
                          type="button"
                          onClick={() => {
                            setIsHeaderMenuOpen(false);
                            handleLeaveGroup(activeGroup);
                          }}
                          className="w-full px-3.5 py-2 text-left hover:bg-rose-50 flex items-center gap-2 text-rose-600 font-semibold cursor-pointer"
                        >
                          <LogOut className="w-3.5 h-3.5 text-rose-500" />
                          <span>Rời khỏi kênh (Leave channel)</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Message Stream (Slack Linear Flow) */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-2 bg-[#fcfdfe]">
              {/* Channel Welcome Card */}
              {activeGroup.isDirect ? (
                <div className="p-4 sm:p-5 rounded-xl bg-white border border-slate-200 text-left space-y-3 max-w-xl mb-4 shadow-2xs">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-700 text-white flex items-center justify-center font-bold text-sm">
                      {activeInfo.avatarInitials}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                        <span>@{activeInfo.displayName}</span>
                        <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                      </h4>
                      <p className="text-xs text-slate-400 font-mono">{activeInfo.partnerEmail}</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200">
                    Đây là không gian trao đổi chuyên môn trực tiếp riêng tư giữa bạn và <strong>@{activeInfo.displayName}</strong> ({activeInfo.displayRoleOrMembers}). Toàn bộ tài liệu giáo trình và câu hỏi thi chia sẻ tại đây được đồng bộ hai chiều.
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setProfileEmail(activeInfo.partnerEmail || null);
                        setProfileName(activeInfo.displayName);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs cursor-pointer flex items-center gap-1.5 transition-colors border border-slate-200"
                    >
                      <User className="w-3.5 h-3.5" />
                      <span>Xem trang cá nhân</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4 sm:p-5 rounded-xl bg-white border border-slate-200 text-left space-y-2.5 max-w-xl mb-4 shadow-2xs">
                  <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-sm border border-slate-200">
                    <Hash className="w-5 h-5 text-slate-600" />
                  </div>
                  <h4 className="text-sm sm:text-base font-bold text-slate-900">
                    Chào mừng bạn đến với kênh #{activeInfo.displayName}!
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {activeGroup.description ||
                      'Không gian trao đổi chuyên môn, chia sẻ giáo trình và đóng góp ma trận câu hỏi thi giữa các giảng viên trong bộ môn.'}
                  </p>
                  <div className="flex items-center gap-3 pt-1 text-[11px] text-slate-500">
                    <span>Mã phòng: <strong className="font-mono text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">{activeGroup.code}</strong></span>
                    <span>•</span>
                    <span>Chủ trì: <strong>{activeGroup.ownerName || 'TS. Hồ Anh Vũ'}</strong></span>
                  </div>
                </div>
              )}

              {/* Message Items (Slack Linear Row Layout) */}
              {(activeGroup.messages || []).map((msg) => {
                const isMe = msg.senderEmail?.toLowerCase() === myEmail;
                const isOwner = (activeGroup.ownerEmail || '').toLowerCase() === myEmail;
                if (msg.isSystem) {
                  return (
                    <div key={msg.id} className="flex justify-center my-2">
                      <span className="px-3.5 py-1 rounded-full bg-slate-100 text-slate-600 text-[11px] font-medium flex items-center gap-1.5 border border-slate-200">
                        <Shield className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                        <span>{msg.text}</span>
                        <span className="text-[10px] text-slate-400 font-mono ml-1">{msg.timestamp}</span>
                      </span>
                    </div>
                  );
                }

                return (
                  <div
                    key={msg.id}
                    className="flex items-start gap-3 px-3 py-2 -mx-2 rounded-lg hover:bg-slate-100/70 transition-colors group relative select-text"
                  >
                    <div
                      onClick={() => {
                        if (!isMe) {
                          setProfileEmail(msg.senderEmail || null);
                          setProfileName(msg.senderName);
                        }
                      }}
                      className={`w-8 h-8 rounded-md text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 cursor-pointer hover:opacity-90 transition-opacity ${
                        isMe ? 'bg-slate-800' : 'bg-teal-700'
                      }`}
                      title={isMe ? 'Bạn' : `Xem trang cá nhân của ${msg.senderName}`}
                    >
                      {initials(msg.senderName || msg.senderEmail || '')}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span
                          onClick={() => {
                            if (!isMe) {
                              setProfileEmail(msg.senderEmail || null);
                              setProfileName(msg.senderName);
                            }
                          }}
                          className="font-bold text-[13px] text-slate-900 hover:underline cursor-pointer"
                        >
                          {msg.senderName || msg.senderEmail}
                        </span>
                        {msg.senderTitle && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                            {msg.senderTitle}
                          </span>
                        )}
                        {isMe && (
                          <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-1 rounded">
                            Bạn
                          </span>
                        )}
                        <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                          <span>{msg.timestamp}</span>
                          {msg.isEdited && (
                            <span className="text-[10px] text-slate-400 font-normal italic">
                              (đã chỉnh sửa)
                            </span>
                          )}
                          {msg.isPinned && (
                            <span className="inline-flex items-center gap-0.5 text-[9px] text-amber-600 font-bold bg-amber-50 px-1 py-0.2 rounded border border-amber-200">
                              <Pin className="w-2.5 h-2.5" /> Ghim
                            </span>
                          )}
                        </span>
                      </div>

                      {/* Reply Quote Banner (nếu đang trả lời 1 tin nhắn trước đó) */}
                      {msg.replyTo && !msg.isRecalled && (
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 my-1 pl-2 border-l-2 border-teal-500 bg-slate-50/70 py-0.5 rounded-r">
                          <Reply className="w-3 h-3 text-teal-600 shrink-0" />
                          <span className="font-semibold text-slate-700">{msg.replyTo.senderName}:</span>
                          <span className="truncate italic text-slate-600">&ldquo;{msg.replyTo.text}&rdquo;</span>
                        </div>
                      )}

                      {/* Trạng thái tin nhắn đã thu hồi */}
                      {msg.isRecalled ? (
                        <div className="text-[12px] text-slate-400 italic py-1 flex items-center gap-1.5 select-none">
                          <Undo2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>Tin nhắn đã được thu hồi</span>
                        </div>
                      ) : editingMessageId === msg.id ? (
                        /* Chế độ Chỉnh sửa Tin nhắn trực tiếp (Inline Edit) */
                        <div className="mt-1 space-y-2">
                          <textarea
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSaveEditMessage(msg.id);
                              } else if (e.key === 'Escape') {
                                setEditingMessageId(null);
                              }
                            }}
                            className="w-full p-2.5 rounded-lg border border-teal-500 bg-white text-xs text-slate-800 outline-none focus:ring-1 focus:ring-teal-500 shadow-2xs leading-relaxed"
                            rows={2}
                            autoFocus
                          />
                          <div className="flex items-center gap-2 text-xs">
                            <button
                              type="button"
                              onClick={() => handleSaveEditMessage(msg.id)}
                              className="px-3 py-1 rounded-md bg-slate-900 hover:bg-slate-800 text-white font-semibold cursor-pointer text-[11px] transition-colors"
                            >
                              Lưu thay đổi
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingMessageId(null)}
                              className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold cursor-pointer text-[11px] transition-colors"
                            >
                              Hủy (Esc)
                            </button>
                            <span className="text-[10px] text-slate-400 ml-auto">Nhấn Enter để lưu</span>
                          </div>
                        </div>
                      ) : (
                        /* Text Message thông thường */
                        msg.text && !msg.text.includes('[DIỄN ĐÀN HỌC THUẬT UTH]') && (
                          <div className="text-[13px] text-slate-800 leading-relaxed mt-1 whitespace-pre-wrap font-normal">
                            {msg.text}
                          </div>
                        )
                      )}

                      {/* ─── LINKED ACADEMIC FORUM POST CARD (Thẻ hình chữ nhật liên kết trực tiếp bài viết Diễn Đàn) ─── */}
                      {!msg.isRecalled && (msg.sharedPost || (msg.text && msg.text.includes('[DIỄN ĐÀN HỌC THUẬT UTH]'))) && (() => {
                        const post = msg.sharedPost;
                        const legacy = !post && msg.text ? parseLegacyForumShare(msg.text) : null;
                        const tag = post?.tag || legacy?.tag || 'HọcThuật';
                        const author = post?.authorName || legacy?.authorName || 'Giảng viên UTH';
                        const authorTitle = post?.authorTitle || legacy?.authorTitle;
                        const department = post?.department || legacy?.department;
                        const content = post?.content || legacy?.content || '';
                        const attachmentName = post?.attachmentFileName || legacy?.attachmentFileName;
                        const attachmentSize = post?.attachmentFileSize || legacy?.attachmentFileSize;
                        const postId = post?.id || legacy?.id;

                        return (
                          <div className="mt-2.5 rounded-2xl border border-slate-200/90 bg-white shadow-xs max-w-lg overflow-hidden transition-all hover:border-teal-400 hover:shadow-md">
                            {/* Card Header Bar */}
                            <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-xs">
                              <div className="flex items-center gap-1.5 text-slate-700 font-semibold">
                                <Share2 className="w-3.5 h-3.5 text-teal-600" />
                                <span className="text-[11px] uppercase tracking-wider font-extrabold text-teal-800">
                                  Bài viết Diễn đàn Học thuật UTH
                                </span>
                              </div>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                                #{tag}
                              </span>
                            </div>

                            {/* Card Body */}
                            <div className="p-3.5 space-y-2.5">
                              {/* Author metadata */}
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-slate-800 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                                  {initials(author)}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs font-bold text-slate-900 truncate">
                                      {author}
                                    </span>
                                    {authorTitle && (
                                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                        {authorTitle}
                                      </span>
                                    )}
                                  </div>
                                  {department && (
                                    <p className="text-[10px] text-slate-500 truncate">
                                      {department}
                                    </p>
                                  )}
                                </div>
                              </div>

                              {/* Quotation text */}
                              <div className="p-2.5 rounded-xl bg-slate-50 border-l-2 border-teal-500 text-xs text-slate-700 italic leading-relaxed">
                                &ldquo;{content}&rdquo;
                              </div>

                              {/* Attached document inside shared post */}
                              {attachmentName && (
                                <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                                  <FileText className="w-4 h-4 text-teal-600 shrink-0" />
                                  <div className="min-w-0 flex-1">
                                    <p className="font-bold text-slate-800 truncate text-[11px]">
                                      {attachmentName}
                                    </p>
                                    {attachmentSize && (
                                      <p className="text-[9px] text-slate-400 font-mono">
                                        {attachmentSize} • Tệp học thuật đính kèm
                                      </p>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Action Deep-link Button */}
                              <button
                                type="button"
                                onClick={() => {
                                  if (postId) {
                                    sessionStorage.setItem('quizgen_focus_post_id', postId);
                                  }
                                  onNavigate('forum');
                                }}
                                className="w-full mt-1 py-2 px-3 rounded-xl bg-slate-900 hover:bg-teal-700 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs group"
                              >
                                <span>Xem bài viết trên Diễn Đàn</span>
                                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                              </button>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Direct Attachment (Chỉ hiển thị nếu không phải tin nhắn chia sẻ bài viết để tránh duplicate) */}
                      {!msg.isRecalled && msg.attachment && !msg.sharedPost && !msg.text?.includes('[DIỄN ĐÀN HỌC THUẬT UTH]') && (
                        <div className="mt-2 p-3 rounded-xl bg-white border border-slate-200 text-left space-y-2 shadow-2xs max-w-md">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-slate-100 text-teal-700 flex items-center justify-center shrink-0 border border-slate-200">
                              <BookOpen className="w-4 h-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-slate-900 truncate">
                                {msg.attachment.name}
                              </p>
                              <p className="text-[10px] text-slate-500 font-medium">
                                {msg.attachment.totalPages} trang • {msg.attachment.size} • Giáo trình học thuật
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                            <button
                              type="button"
                              onClick={() => {
                                onShowToast('success', 'Đã nạp giáo trình', `Đã chuyển ${msg.attachment?.name} vào không gian sinh đề`);
                              }}
                              className="flex-1 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-[11px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>Dùng Sinh Đề Ngay</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Emoji Reaction Badges (Hiển thị các reaction đã thả) */}
                      {!msg.isRecalled && msg.reactions && Object.keys(msg.reactions).length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {Object.entries(msg.reactions).map(([emoji, users]) => {
                            if (!users || users.length === 0) return null;
                            const hasReacted = users.includes(myEmail);
                            return (
                              <button
                                key={emoji}
                                type="button"
                                onClick={() => handleToggleReaction(msg.id, emoji)}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-all cursor-pointer ${
                                  hasReacted
                                    ? 'bg-teal-50 border-teal-300 text-teal-800 font-bold'
                                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                }`}
                                title={users.join(', ')}
                              >
                                <span>{emoji}</span>
                                <span className="text-[10px]">{users.length}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Slack Floating Hover Action Bar (Chuẩn Slack: Cảm xúc, Trả lời, Sao chép, Ghim, Sửa, Thu hồi, Xóa) */}
                    {!msg.isRecalled && (
                      <div className="absolute right-2 -top-3 hidden group-hover:flex items-center bg-white border border-slate-200/90 rounded-xl shadow-lg px-1.5 py-1 gap-1 z-20 animate-fade-in">
                        {/* Emojis */}
                        <div className="flex items-center gap-0.5 pr-1 border-r border-slate-200">
                          {['👍', '❤️', '👏', '🎉', '💡'].map((emoji) => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => handleToggleReaction(msg.id, emoji)}
                              className="w-6 h-6 rounded-md hover:bg-slate-100 flex items-center justify-center text-xs transition-transform hover:scale-125 cursor-pointer"
                              title={`Bày tỏ cảm xúc ${emoji}`}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>

                        {/* Reply in thread */}
                        <button
                          type="button"
                          onClick={() => handleStartReply(msg)}
                          className="w-6 h-6 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center text-xs cursor-pointer"
                          title="Trả lời tin nhắn"
                        >
                          <Reply className="w-3.5 h-3.5" />
                        </button>

                        {/* Copy text */}
                        <button
                          type="button"
                          onClick={() => {
                            if (msg.text) {
                              navigator.clipboard.writeText(msg.text);
                              onShowToast('info', 'Đã sao chép tin nhắn', msg.text.slice(0, 30));
                            }
                          }}
                          className="w-6 h-6 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center text-xs cursor-pointer"
                          title="Sao chép văn bản"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>

                        {/* Pin message */}
                        <button
                          type="button"
                          onClick={() => handleTogglePinMessage(msg.id)}
                          className={`w-6 h-6 rounded hover:bg-slate-100 flex items-center justify-center text-xs cursor-pointer ${
                            msg.isPinned ? 'text-amber-500' : 'text-slate-500 hover:text-slate-800'
                          }`}
                          title={msg.isPinned ? 'Bỏ ghim tin nhắn' : 'Ghim tin nhắn'}
                        >
                          <Pin className="w-3.5 h-3.5" />
                        </button>

                        {/* Edit message (Chỉ tin nhắn của mình) */}
                        {isMe && (
                          <button
                            type="button"
                            onClick={() => handleStartEditMessage(msg)}
                            className="w-6 h-6 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center text-xs cursor-pointer"
                            title="Chỉnh sửa tin nhắn"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Thu hồi tin nhắn (Chỉ tin nhắn của mình) */}
                        {isMe && (
                          <button
                            type="button"
                            onClick={() => handleRecallMessage(msg.id)}
                            className="w-6 h-6 rounded hover:bg-rose-50 text-slate-500 hover:text-rose-600 flex items-center justify-center text-xs cursor-pointer"
                            title="Thu hồi tin nhắn"
                          >
                            <Undo2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Xóa tin nhắn (Dành cho admin / chủ phòng / người gửi) */}
                        {(isMe || isOwner) && (
                          <button
                            type="button"
                            onClick={() => handleDeleteMessage(msg.id)}
                            className="w-6 h-6 rounded hover:bg-rose-50 text-slate-500 hover:text-rose-600 flex items-center justify-center text-xs cursor-pointer"
                            title="Xóa tin nhắn"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>

            {/* ================================================================
                SLACK RICH TEXT COMPOSER
            ================================================================ */}
            <div className="p-3 sm:px-4 sm:py-3 border-t border-slate-200 bg-white space-y-2">
              {/* Replying Banner (nếu đang trả lời 1 tin nhắn) */}
              {replyingToMessage && (
                <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-teal-50/80 border border-teal-200 text-xs animate-fade-in">
                  <div className="flex items-center gap-2 min-w-0">
                    <Reply className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                    <span className="font-bold text-slate-800">Đang trả lời {replyingToMessage.senderName}:</span>
                    <span className="text-slate-600 truncate italic">&ldquo;{replyingToMessage.text || 'Tệp đính kèm'}&rdquo;</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReplyingToMessage(null)}
                    className="p-1 rounded-md hover:bg-teal-100 text-slate-400 hover:text-slate-700 cursor-pointer"
                    title="Hủy trả lời"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Attachment Preview (if any) */}
              {selectedAttachment && (
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <BookOpen className="w-4 h-4 text-teal-600 shrink-0" />
                    <span className="font-semibold text-slate-800 truncate">{selectedAttachment.name}</span>
                    <span className="text-[10px] text-slate-500">({selectedAttachment.size})</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedAttachment(null)}
                    className="p-1 rounded hover:bg-slate-200 text-slate-500 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Formatting Toolbar (Slack Style) */}
              <div className="flex items-center justify-between gap-1 border border-slate-300 rounded-xl p-1 bg-slate-50/50 focus-within:border-slate-500 focus-within:bg-white transition-all shadow-2xs">
                <div className="flex-1 flex flex-col">
                  {/* Top Buttons: B, I, Code, List, Quote */}
                  <div className="flex items-center gap-1 px-2 pt-1 border-b border-slate-200 pb-1 text-slate-600">
                    <button
                      type="button"
                      onClick={() => insertFormatting('**', '**')}
                      className="p-1 rounded hover:bg-slate-200 text-slate-700 cursor-pointer font-bold"
                      title="In đậm (Bold)"
                    >
                      <Bold className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => insertFormatting('*', '*')}
                      className="p-1 rounded hover:bg-slate-200 text-slate-700 cursor-pointer italic"
                      title="In nghiêng (Italic)"
                    >
                      <Italic className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => insertFormatting('`', '`')}
                      className="p-1 rounded hover:bg-slate-200 text-slate-700 cursor-pointer font-mono"
                      title="Mã / Code"
                    >
                      <Code className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => insertFormatting('\n- ')}
                      className="p-1 rounded hover:bg-slate-200 text-slate-700 cursor-pointer"
                      title="Gạch đầu dòng (List)"
                    >
                      <List className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => insertFormatting('\n> ')}
                      className="p-1 rounded hover:bg-slate-200 text-slate-700 cursor-pointer"
                      title="Trích dẫn (Quote)"
                    >
                      <Quote className="w-3.5 h-3.5" />
                    </button>

                    <div className="h-3 w-px bg-slate-200 mx-1" />

                    {/* Emoji Quick Picker Trigger */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsEmojiPickerOpen(!isEmojiPickerOpen);
                          setIsAttachPopoverOpen(false);
                        }}
                        className="p-1 rounded hover:bg-slate-200 text-slate-600 cursor-pointer"
                        title="Chèn biểu tượng cảm xúc"
                      >
                        <Smile className="w-3.5 h-3.5" />
                      </button>

                      {isEmojiPickerOpen && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="absolute left-0 bottom-8 z-30 bg-white border border-slate-200 rounded-xl shadow-xl p-2 flex items-center gap-1.5 text-base animate-fade-in"
                        >
                          {['👍', '❤️', '👏', '💡', '🔥', '📚', '🎓', '✍️', '🎉', '✅'].map((emoji) => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => {
                                setChatInput((prev) => prev + emoji);
                                setIsEmojiPickerOpen(false);
                              }}
                              className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center transition-all hover:scale-110 cursor-pointer"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Attach Textbook Trigger */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsAttachPopoverOpen(!isAttachPopoverOpen);
                          setIsEmojiPickerOpen(false);
                        }}
                        className="p-1 rounded hover:bg-slate-200 text-slate-600 cursor-pointer flex items-center gap-1 text-[11px] font-semibold"
                        title="Đính kèm giáo trình từ Thư viện"
                      >
                        <Paperclip className="w-3.5 h-3.5 text-slate-600" />
                        <span className="hidden sm:inline text-slate-700">Đính kèm giáo trình</span>
                      </button>

                      {isAttachPopoverOpen && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="absolute left-0 bottom-8 z-30 w-72 bg-white border border-slate-200 rounded-xl shadow-xl p-3 space-y-2 animate-fade-in text-xs"
                        >
                          <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                            <span className="font-bold text-slate-800 flex items-center gap-1.5">
                              <BookOpen className="w-3.5 h-3.5 text-teal-700" />
                              Kho Giáo Trình Sẵn Có
                            </span>
                            <button
                              type="button"
                              onClick={() => setIsAttachPopoverOpen(false)}
                              className="text-slate-400 hover:text-slate-600"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                          <div className="max-h-48 overflow-y-auto space-y-1.5">
                            {availableTextbooks.map((tb) => (
                              <div
                                key={tb.id}
                                onClick={() => {
                                  setSelectedAttachment({
                                    type: 'textbook',
                                    id: tb.id,
                                    name: tb.name,
                                    size: tb.size,
                                    totalPages: tb.totalPages,
                                    authorName: tb.authorName,
                                  });
                                  setIsAttachPopoverOpen(false);
                                  onShowToast('info', 'Đã chọn tệp đính kèm', tb.name);
                                }}
                                className="p-2 rounded-lg border border-slate-200 hover:border-slate-400 hover:bg-slate-50 cursor-pointer transition-all space-y-0.5"
                              >
                                <p className="font-semibold text-slate-800 truncate">{tb.name}</p>
                                <p className="text-[10px] text-slate-500">
                                  {tb.totalPages} trang • {tb.size}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Multi-line Textarea */}
                  <textarea
                    ref={textareaRef}
                    rows={2}
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder={
                      activeGroup.isDirect
                        ? `Nhắn tin tới ${activeGroup.directPartnerName || activeGroup.name}... (Enter để gửi, Shift+Enter xuống dòng)`
                        : `Nhắn tin trong #${activeGroup.name}... (Enter để gửi, Shift+Enter xuống dòng)`
                    }
                    className="w-full px-3 py-2 text-xs text-slate-800 placeholder-slate-400 bg-transparent outline-none resize-none"
                  />
                </div>

                {/* Send Button */}
                <button
                  type="button"
                  onClick={() => handleSend()}
                  disabled={!chatInput.trim() && !selectedAttachment}
                  className="w-8 h-8 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-30 text-white flex items-center justify-center transition-all shadow-xs shrink-0 self-end mb-1 mr-1 cursor-pointer"
                  title="Gửi tin nhắn (Enter)"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 space-y-3">
            <MessageCircle className="w-14 h-14 text-slate-200" />
            <p className="font-bold text-sm text-slate-600">Chưa chọn đoạn chat</p>
            <p className="text-xs max-w-xs">
              Chọn một người bạn hoặc nhóm từ danh sách bên trái để bắt đầu nhắn tin.
            </p>
          </div>
        )}
      </div>

      {/* ====================================================================
          MODAL: THÊM THÀNH VIÊN VÀO KÊNH (SLACK DIRECT ADD MEMBER)
      ==================================================================== */}
      {isDirectAddMemberOpen && activeGroup && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in"
          onClick={() => setIsDirectAddMemberOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-xl sm:max-w-xl lg:max-w-2xl w-full border border-slate-200 overflow-hidden flex flex-col animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-slate-900 flex items-center gap-1.5">
                  <UserPlus className="w-4 h-4 text-[#008689]" />
                  <span>Thêm thành viên vào #{activeGroup.name}</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Gợi ý bạn bè, đồng nghiệp hoặc nhập email để thêm vào kênh
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsDirectAddMemberOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* CHIPS TRAY: DANH SÁCH THÀNH VIÊN ĐÃ CHỌN (NẾU CÓ) */}
              {directAddSelectedMembers.length > 0 && (
                <div className="space-y-1.5 p-3 bg-teal-50/50 border border-teal-200/80 rounded-xl animate-fade-in">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700">
                    <span className="flex items-center gap-1.5 text-teal-900 font-bold">
                      <Users className="w-3.5 h-3.5 text-[#008689]" />
                      <span>Đã chọn ({directAddSelectedMembers.length} đồng nghiệp):</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setDirectAddSelectedMembers([])}
                      className="text-[10px] text-rose-600 hover:text-rose-700 font-medium cursor-pointer"
                    >
                      Xóa tất cả
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                    {directAddSelectedMembers.map((m) => (
                      <span
                        key={m.email}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white text-[#008689] border border-teal-300 text-xs font-semibold shadow-2xs animate-scale-up"
                      >
                        <span className="w-4 h-4 rounded-full bg-[#008689] text-white text-[9px] font-bold flex items-center justify-center shrink-0">
                          {initials(m.fullName)}
                        </span>
                        <span className="truncate max-w-[140px]">{m.fullName}</span>
                        {m.academicTitle && (
                          <span className="text-[9px] font-normal text-teal-700 shrink-0">({m.academicTitle})</span>
                        )}
                        <button
                          type="button"
                          onClick={() => setDirectAddSelectedMembers((prev) => prev.filter((x) => x.email !== m.email))}
                          className="hover:text-rose-600 transition-colors p-0.5 rounded cursor-pointer shrink-0"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                  <span>Tìm kiếm đồng nghiệp hoặc nhập email:</span>
                  <span className="text-[10px] text-slate-400 font-normal">Gõ @ để gợi ý tài khoản</span>
                </label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={directAddMemberEmail}
                    onChange={(e) => {
                      const val = e.target.value;
                      setDirectAddMemberEmail(val);
                      void handleLookupUser(val);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && lookupStatus === 'found' && lookedUpUser) {
                        handleQueueDirectAddMember(lookedUpUser);
                      }
                    }}
                    placeholder="Gõ @đồng nghiệp hoặc nhập email giảng viên..."
                    className="w-full pl-10 pr-8 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 outline-none focus:bg-white focus:border-[#008689] focus:ring-1 focus:ring-[#008689] transition-all font-medium"
                    autoFocus
                  />
                  {lookupStatus === 'searching' && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <span className="w-3.5 h-3.5 border-2 border-teal-600 border-t-transparent rounded-full animate-spin inline-block" />
                    </div>
                  )}
                  {directAddMemberEmail && (
                    <button
                      type="button"
                      onClick={() => {
                        setDirectAddMemberEmail('');
                        setLookedUpUser(null);
                        setLookupStatus('idle');
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* THẺ TÀI KHOẢN (NẾU NGƯỜI ĐÓ ĐÃ ĐĂNG KÝ TÀI KHOẢN) */}
              {lookupStatus === 'found' && lookedUpUser && (
                <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/40 space-y-2.5 animate-fade-in">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-900 text-white font-bold flex items-center justify-center shrink-0 shadow-2xs">
                      {initials(lookedUpUser.fullName)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-slate-900 truncate">{lookedUpUser.fullName}</span>
                        {lookedUpUser.academicTitle && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-white text-slate-700 border border-slate-200 shrink-0">
                            {lookedUpUser.academicTitle}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 truncate">{lookedUpUser.email}</p>
                      <p className="text-[10px] text-slate-400 truncate">{lookedUpUser.department || 'Khoa Công nghệ Thông tin'}</p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-emerald-200/60 flex items-center justify-between gap-2 text-xs">
                    <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Tài khoản đã kích hoạt hệ thống</span>
                    </span>
                    {(() => {
                      const isUserSelected = directAddSelectedMembers.some((m) => m.email.toLowerCase() === lookedUpUser.email.toLowerCase());
                      const friendship = getFriendshipState(lookedUpUser.email);
                      const isFriend = friendship.type === 'friend';
                      const isAlreadyInChannel = (activeGroup.members || []).some(
                        (m) => String(m).trim().toLowerCase() === lookedUpUser.email.trim().toLowerCase()
                      );
                      return (
                        <div className="flex items-center gap-1.5 shrink-0">
                          {!isAlreadyInChannel && (
                            isUserSelected ? (
                              <button
                                type="button"
                                onClick={() => setDirectAddSelectedMembers((prev) => prev.filter((x) => x.email.toLowerCase() !== lookedUpUser.email.toLowerCase()))}
                                className="px-2.5 py-1.5 rounded-lg bg-[#008689] text-white font-semibold text-xs flex items-center gap-1 shadow-2xs cursor-pointer transition-colors"
                                title="Đã chọn (Bấm để hủy chọn)"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Đã chọn</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleQueueDirectAddMember(lookedUpUser)}
                                className="w-8 h-8 rounded-lg border border-slate-300 text-slate-600 hover:text-[#008689] hover:border-[#008689] hover:bg-teal-50 flex items-center justify-center transition-all cursor-pointer"
                                title="Chọn để thêm hàng loạt"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            )
                          )}
                          {isAlreadyInChannel ? (
                            <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-semibold text-[10px] flex items-center gap-1 shrink-0 border border-emerald-200">
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span>Đã tham gia</span>
                            </span>
                          ) : isFriend ? (
                            <button
                              type="button"
                              onClick={() => void handleAddUserToActiveChannel(lookedUpUser.email, lookedUpUser.fullName)}
                              disabled={isAddingMember}
                              className="px-2.5 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-[#008689] font-semibold text-xs border border-teal-200 cursor-pointer transition-colors flex items-center gap-1.5"
                              title="Thêm ngay vào nhóm (đã là bạn bè)"
                            >
                              <UserPlus className="w-3.5 h-3.5" />
                              <span>Thêm ngay</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => void handleSendGroupInvitation(lookedUpUser.email, lookedUpUser.fullName)}
                              className="px-3 py-1.5 rounded-lg bg-[#008689] hover:bg-[#007073] text-white font-semibold text-xs shadow-xs cursor-pointer transition-colors flex items-center gap-1.5"
                              title="Gửi lời mời tham gia kênh"
                            >
                              <Send className="w-3 h-3" />
                              <span>Mời</span>
                            </button>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* CẢNH BÁO TÀI KHOẢN CHƯA ĐĂNG KÝ / KHÔNG TỒN TẠI (CHỈ KHI ĐÃ NHẬP ĐẦY ĐỦ DOMAIN EMAIL) */}
              {lookupStatus === 'not_found' && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(directAddMemberEmail.trim()) && (
                <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50/50 flex items-start gap-3 animate-fade-in">
                  <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                  <div className="min-w-0 text-xs text-rose-800 space-y-1">
                    <p className="font-bold">Người dùng không tồn tại trên hệ thống</p>
                    <p className="text-[11px] text-rose-600 leading-relaxed">
                      Địa chỉ email <strong>{directAddMemberEmail}</strong> chưa được dùng để đăng ký tài khoản QuizGen AI. Thầy/Cô vui lòng kiểm tra lại địa chỉ email hoặc mời đồng nghiệp đăng ký trước khi thêm vào kênh.
                    </p>
                  </div>
                </div>
              )}

              {/* MỤC BẠN BÈ & ĐỒNG NGHIỆP: GỬI LỜI MỜI HOẶC THÊM TRỰC TIẾP */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Bạn bè & Đồng nghiệp ({filteredFriends.length})
                  </span>
                  <span className="text-[10px] text-slate-400">Gửi lời mời hoặc thêm trực tiếp</span>
                </div>

                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {filteredFriends.length === 0 ? (
                    <p className="text-center text-xs text-slate-400 py-3 italic">
                      Không tìm thấy đồng nghiệp phù hợp
                    </p>
                  ) : (
                    filteredFriends.map((f) => {
                      const isAlreadyInChannel = (activeGroup.members || []).some(
                        (m) => String(m).trim().toLowerCase() === f.email.trim().toLowerCase()
                      );
                      const hasSentInvite = groupInvitations.some(
                        (inv) =>
                          inv.groupId === activeGroup.id &&
                          inv.targetEmail.toLowerCase() === f.email.toLowerCase() &&
                          inv.status === 'pending'
                      );
                      const isSelected = directAddSelectedMembers.some(
                        (m) => m.email.toLowerCase() === f.email.toLowerCase()
                      );
                      const friendship = getFriendshipState(f.email);
                      const isFriend = friendship.type === 'friend';

                      return (
                        <div
                          key={f.email}
                          className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 transition-colors ${
                            isSelected
                              ? 'bg-teal-50/60 border-teal-300'
                              : 'bg-slate-50 hover:bg-slate-100/80 border-slate-200/80'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <div className="w-8 h-8 rounded-lg bg-teal-700 text-white font-bold text-xs flex items-center justify-center shrink-0">
                              {initials(f.name)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-xs text-slate-800 truncate">{f.name}</span>
                                {f.title && (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-white text-slate-600 border border-slate-200 shrink-0">
                                    {f.title}
                                  </span>
                                )}
                                {isFriend && (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                                    Bạn bè
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-400 truncate" title={f.email}>{f.email}</p>
                              {f.dept && (
                                <p className="text-[10px] text-slate-400 truncate">{f.dept}</p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {/* Nút Chọn / Đã chọn (Dấu cộng nhỏ -> Đã chọn khi click) */}
                            {!isAlreadyInChannel && (
                              isSelected ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setDirectAddSelectedMembers((prev) =>
                                      prev.filter((x) => x.email.toLowerCase() !== f.email.toLowerCase())
                                    )
                                  }
                                  className="px-2.5 py-1.5 rounded-lg bg-[#008689] text-white font-semibold text-xs flex items-center gap-1 shadow-2xs cursor-pointer transition-colors"
                                  title="Đã chọn (Bấm để hủy chọn)"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Đã chọn</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleQueueDirectAddMember(f)}
                                  className="w-8 h-8 rounded-lg border border-slate-300 text-slate-600 hover:text-[#008689] hover:border-[#008689] hover:bg-teal-50 flex items-center justify-center transition-all cursor-pointer"
                                  title="Chọn để thêm hàng loạt"
                                >
                                  <Plus className="w-4 h-4" />
                                </button>
                              )
                            )}

                            {/* Nút hành động trực tiếp: Đã tham gia | Đã mời | Thêm ngay (nếu đã là bạn bè) | Mời (nếu chưa kết bạn) */}
                            {isAlreadyInChannel ? (
                              <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-semibold text-[10px] flex items-center gap-1 shrink-0 border border-emerald-200">
                                <Check className="w-3 h-3 text-emerald-600" />
                                <span>Đã tham gia</span>
                              </span>
                            ) : hasSentInvite ? (
                              <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 font-semibold text-[10px] flex items-center gap-1 shrink-0 border border-amber-200">
                                <Clock className="w-3 h-3 text-amber-600" />
                                <span>Đã gửi lời mời</span>
                              </span>
                            ) : isFriend ? (
                              <button
                                type="button"
                                onClick={() => void handleAddUserToActiveChannel(f.email, f.name)}
                                disabled={isAddingMember}
                                className="px-2.5 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-[#008689] font-semibold text-xs border border-teal-200 flex items-center gap-1 cursor-pointer transition-colors"
                                title="Thêm ngay vào nhóm (đã là bạn bè)"
                              >
                                <UserPlus className="w-3.5 h-3.5" />
                                <span>Thêm ngay</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => void handleSendGroupInvitation(f.email, f.name)}
                                className="px-3 py-1.5 rounded-lg bg-[#008689] hover:bg-[#007073] text-white font-semibold text-xs shadow-2xs flex items-center gap-1 cursor-pointer transition-colors"
                                title="Gửi lời mời: Đồng nghiệp nhận thông báo và bấm Chấp nhận để vào"
                              >
                                <Send className="w-3 h-3" />
                                <span>Mời</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
              <div>
                {directAddSelectedMembers.length > 0 && (
                  <span className="text-[11px] text-teal-800 font-bold">
                    Đã chọn {directAddSelectedMembers.length} đồng nghiệp
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsDirectAddMemberOpen(false);
                    setDirectAddSelectedMembers([]);
                  }}
                  className="px-4 py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold cursor-pointer transition-colors"
                >
                  Đóng
                </button>
                {directAddSelectedMembers.length > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={() => void handleBatchSendGroupInvitations()}
                      className="px-3.5 py-2 rounded-lg bg-white border border-teal-600 text-[#008689] hover:bg-teal-50 font-semibold text-xs cursor-pointer transition-colors flex items-center gap-1.5 shadow-2xs"
                      title="Gửi lời mời tham gia kênh cho tất cả người đã chọn"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Gửi lời mời ({directAddSelectedMembers.length})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleBatchAddUsersToActiveChannel()}
                      disabled={isAddingMember}
                      className="px-4 py-2 rounded-lg bg-[#008689] hover:bg-[#007073] text-white font-semibold text-xs cursor-pointer transition-colors flex items-center gap-1.5 shadow-xs"
                      title="Thêm ngay tất cả người đã chọn vào kênh"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Thêm ngay ({directAddSelectedMembers.length})</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          MODAL: CHI TIẾT KÊNH (SLACK STYLE INFORMATIONAL MULTI-TAB)
      ==================================================================== */}
      {isChannelDetailsOpen && activeGroup && (
        <ChannelDetailsModal
          group={activeGroup}
          myEmail={myEmail}
          activeTab={channelDetailsTab}
          onTabChange={setChannelDetailsTab}
          inviteEmail={inviteEmailInput}
          onInviteEmailChange={setInviteEmailInput}
          onInvite={() => void handleInviteToGroup(activeGroup)}
          onClose={() => setIsChannelDetailsOpen(false)}
          onLeaveGroup={() => {
            setIsChannelDetailsOpen(false);
            void handleLeaveGroup(activeGroup);
          }}
          onKickMember={(email, name) => {
            void handleKickMember(activeGroup, email, name);
          }}
          onRespondJoinRequest={(reqId, email, action) => {
            void handleRespondJoinRequest(activeGroup, reqId, email, action);
          }}
        />
      )}

      {/* ====================================================================
          MODAL: CÀI ĐẶT KÊNH (SLACK / TEAMS DEDICATED CHANNEL SETTINGS)
      ==================================================================== */}
      {isChannelSettingsOpen && activeGroup && (
        <ChannelSettingsModal
          group={activeGroup}
          myEmail={myEmail}
          onClose={() => setIsChannelSettingsOpen(false)}
          onSaveSettings={(name, dept, desc, joinPolicy) => {
            void handleSaveGroupSettings(activeGroup, name, dept, desc, joinPolicy);
            setIsChannelSettingsOpen(false);
          }}
          onTransferOwner={() => {
            setIsChannelSettingsOpen(false);
            const otherMembers = (activeGroup.members || []).filter(
              (m) => m.toLowerCase() !== myEmail.toLowerCase()
            );
            if (otherMembers.length === 0) {
              onShowToast('info', 'Chưa có thành viên khác', 'Nhóm cần có ít nhất 1 thành viên khác để nhượng quyền.');
              return;
            }
            setTransferGroup(activeGroup);
            setSelectedNewOwner(otherMembers[0] || '');
            setIsTransferOwnerModalOpen(true);
          }}
          onDisband={() => {
            setIsChannelSettingsOpen(false);
            void handleDisbandGroup(activeGroup);
          }}
        />
      )}

      {/* ====================================================================
          MODAL: NHƯỢNG QUYỀN TRƯỞNG NHÓM TRƯỚC KHI RỜI (SAFE LEADER EXIT)
      ==================================================================== */}
      {isTransferOwnerModalOpen && transferGroup && (
        <Modal
          onClose={() => setIsTransferOwnerModalOpen(false)}
          title="Nhượng Quyền Trưởng Nhóm"
          icon={<UserCheck className="w-4 h-4 text-amber-600" />}
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-amber-900 space-y-1">
              <p className="font-semibold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Bạn đang là Trưởng nhóm của "#{transferGroup.name}"</span>
              </p>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                Để đảm bảo nhóm học thuật tiếp tục vận hành ổn định, bạn cần chỉ định một giảng viên kế nhiệm làm Trưởng nhóm trước khi rời đi.
              </p>
            </div>

            <div className="space-y-2">
              <label className="font-semibold text-slate-700">Chọn giảng viên kế nhiệm:</label>
              <div className="max-h-48 overflow-y-auto space-y-1.5 border border-slate-200 rounded-xl p-2 bg-slate-50">
                {(transferGroup.members || [])
                  .filter((m) => m.toLowerCase() !== myEmail.toLowerCase())
                  .map((email) => (
                    <label
                      key={email}
                      className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition-all ${
                        selectedNewOwner.toLowerCase() === email.toLowerCase()
                          ? 'border-slate-900 bg-white text-slate-900 font-semibold ring-1 ring-slate-900'
                          : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-6 h-6 rounded-md bg-slate-700 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                          {initials(email)}
                        </div>
                        <span className="truncate">{email}</span>
                      </div>
                      <input
                        type="radio"
                        name="newOwner"
                        checked={selectedNewOwner.toLowerCase() === email.toLowerCase()}
                        onChange={() => setSelectedNewOwner(email)}
                        className="text-slate-900"
                      />
                    </label>
                  ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setIsTransferOwnerModalOpen(false);
                  void handleDisbandGroup(transferGroup);
                }}
                className="text-rose-600 hover:text-rose-700 font-semibold text-xs hover:underline cursor-pointer"
              >
                Giải tán nhóm vĩnh viễn
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsTransferOwnerModalOpen(false)}
                  className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={!selectedNewOwner || isTransferringOwner}
                  onClick={handleTransferOwnerAndLeave}
                  className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white font-semibold text-xs shadow-xs cursor-pointer flex items-center gap-1.5 transition-colors"
                >
                  {isTransferringOwner ? 'Đang nhượng quyền...' : 'Nhượng quyền & Rời'}
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* ====================================================================
          MODAL: SLACK AI SUMMARIZER (TÓM TẮT CUỘC TRÒ CHUYỆN)
      ==================================================================== */}
      {isSummarizeModalOpen && activeGroup && (
        <AiSummarizeModal
          group={activeGroup}
          onClose={() => setIsSummarizeModalOpen(false)}
        />
      )}

      {/* ====================================================================
          MODAL: SLACK HUDDLE (THẢO LUẬN ÂM THANH NHANH)
      ==================================================================== */}
      {isHuddleOpen && activeGroup && (
        <HuddleCallModal
          group={activeGroup}
          currentUser={currentUser}
          onClose={() => setIsHuddleOpen(false)}
        />
      )}

      {/* ====================================================================
          OTHER MODALS: PUBLIC PROFILE, ADD FRIEND, CREATE GROUP
      ==================================================================== */}
      <PublicProfileModal
        isOpen={Boolean(profileEmail)}
        userEmail={profileEmail}
        userName={profileName}
        isFriend={isTargetFriend}
        hasSentRequest={hasTargetPendingRequest}
        onClose={() => {
          setProfileEmail(null);
          setProfileName(undefined);
        }}
        currentUser={currentUser}
        onStartDirectChat={(targetEmail) => {
          setProfileEmail(null);
          setProfileName(undefined);
          const target = (targetEmail || '').trim().toLowerCase();
          const dm = qgroups.find((g) => {
            if (!g.isDirect) return false;
            const cleanOwner = (g.ownerEmail || '').trim().toLowerCase();
            const cleanPartner = (g.directPartnerEmail || '').trim().toLowerCase();
            const members = (g.members || []).map((m) => String(m).trim().toLowerCase());
            return cleanOwner === target || cleanPartner === target || members.includes(target);
          });
          if (dm) {
            setSelectedGroupId(dm.id);
            setFilterTab('all');
          } else {
            onShowToast('info', 'Bắt đầu trò chuyện', `Chưa có đoạn chat riêng với ${targetEmail}`);
          }
        }}
        onSendFriendRequest={(email) => {
          void handleSendFriendRequest(email);
        }}
      />

      {isAddFriendOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in"
          onClick={handleCloseAddFriendModal}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-xl sm:max-w-xl lg:max-w-2xl w-full border border-slate-200 overflow-hidden flex flex-col animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-slate-900 flex items-center gap-1.5">
                  <UserPlus className="w-4 h-4 text-[#008689]" />
                  <span>Thêm Đồng Nghiệp Mới</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Gợi ý giảng viên, đồng nghiệp hoặc nhập email để gửi lời mời kết nối học thuật
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseAddFriendModal}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* CHIPS TRAY: DANH SÁCH ĐỒNG NGHIỆP ĐÃ CHỌN ĐỂ KẾT BẠN */}
              {selectedFriendsToInvite.length > 0 && (
                <div className="space-y-1.5 p-3 bg-teal-50/50 border border-teal-200/80 rounded-xl animate-fade-in">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700">
                    <span className="flex items-center gap-1.5 text-teal-900 font-bold">
                      <UserPlus className="w-3.5 h-3.5 text-[#008689]" />
                      <span>Đã chọn ({selectedFriendsToInvite.length} đồng nghiệp):</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedFriendsToInvite([])}
                      className="text-[10px] text-rose-600 hover:text-rose-700 font-medium cursor-pointer"
                    >
                      Xóa tất cả
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                    {selectedFriendsToInvite.map((m) => (
                      <span
                        key={m.email}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white text-[#008689] border border-teal-300 text-xs font-semibold shadow-2xs animate-scale-up"
                      >
                        <span className="w-4 h-4 rounded-full bg-[#008689] text-white text-[9px] font-bold flex items-center justify-center shrink-0">
                          {initials(m.fullName)}
                        </span>
                        <span className="truncate max-w-[140px]">{m.fullName}</span>
                        {m.academicTitle && (
                          <span className="text-[9px] font-normal text-teal-700 shrink-0">({m.academicTitle})</span>
                        )}
                        <button
                          type="button"
                          onClick={() => setSelectedFriendsToInvite((prev) => prev.filter((x) => x.email !== m.email))}
                          className="hover:text-rose-600 transition-colors p-0.5 rounded cursor-pointer shrink-0"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                  <span>Tìm kiếm đồng nghiệp hoặc nhập email:</span>
                  <span className="text-[10px] text-slate-400 font-normal">Gõ @ để gợi ý tài khoản</span>
                </label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={friendEmailInput}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFriendEmailInput(val);
                      void handleFriendLookup(val);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        if (friendLookupStatus === 'found' && friendLookedUpUser) {
                          handleQueueFriendInvite(friendLookedUpUser);
                        } else if (friendEmailInput.trim()) {
                          void handleSendFriendRequest();
                        }
                      }
                    }}
                    placeholder="Gõ @đồng nghiệp hoặc nhập email giảng viên..."
                    className="w-full pl-10 pr-8 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 outline-none focus:bg-white focus:border-[#008689] focus:ring-1 focus:ring-[#008689] transition-all font-medium"
                    autoFocus
                  />
                  {friendLookupStatus === 'searching' && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <span className="w-3.5 h-3.5 border-2 border-teal-600 border-t-transparent rounded-full animate-spin inline-block" />
                    </div>
                  )}
                  {friendEmailInput && (
                    <button
                      type="button"
                      onClick={() => {
                        setFriendEmailInput('');
                        setFriendLookedUpUser(null);
                        setFriendLookupStatus('idle');
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* THẺ TÀI KHOẢN (NẾU NGƯỜI ĐÓ ĐÃ ĐĂNG KÝ TÀI KHOẢN) */}
              {friendLookupStatus === 'found' && friendLookedUpUser && (() => {
                const cardState = getFriendshipState(friendLookedUpUser.email);
                return (
                  <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/40 space-y-2.5 animate-fade-in">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-900 text-white font-bold flex items-center justify-center shrink-0 shadow-2xs">
                        {initials(friendLookedUpUser.fullName)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs text-slate-900 truncate">{friendLookedUpUser.fullName}</span>
                          {friendLookedUpUser.academicTitle && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-white text-slate-700 border border-slate-200 shrink-0">
                              {friendLookedUpUser.academicTitle}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 truncate">{friendLookedUpUser.email}</p>
                        <p className="text-[10px] text-slate-400 truncate">{friendLookedUpUser.department || 'Khoa Công nghệ Thông tin'}</p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-emerald-200/60 flex items-center justify-between gap-2 text-xs">
                      <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Tài khoản đã kích hoạt hệ thống</span>
                      </span>
                      <div className="flex items-center gap-2">
                        {cardState.type === 'self' && (
                          <span className="text-xs text-slate-400 italic">Tài khoản của bạn</span>
                        )}
                        {cardState.type === 'friend' && (
                          <span className="px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-800 font-semibold text-xs flex items-center gap-1.5 border border-emerald-300">
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Đã là bạn bè</span>
                          </span>
                        )}
                        {cardState.type === 'sent_pending' && (
                          <span className="px-3 py-1.5 rounded-lg bg-amber-100 text-amber-800 font-semibold text-xs flex items-center gap-1.5 border border-amber-300">
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            <span>Đang chờ duyệt</span>
                          </span>
                        )}
                        {cardState.type === 'received_pending' && (
                          <button
                            type="button"
                            onClick={() => void handleAcceptFriendRequest(cardState.req)}
                            className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs cursor-pointer transition-colors flex items-center gap-1.5"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Chấp nhận kết bạn</span>
                          </button>
                        )}
                        {cardState.type === 'none' && (() => {
                          const isSelected = selectedFriendsToInvite.some((m) => m.email.toLowerCase() === friendLookedUpUser.email.toLowerCase());
                          return (
                            <div className="flex items-center gap-1.5 shrink-0">
                              {isSelected ? (
                                <button
                                  type="button"
                                  onClick={() => setSelectedFriendsToInvite((prev) => prev.filter((x) => x.email.toLowerCase() !== friendLookedUpUser.email.toLowerCase()))}
                                  className="px-2.5 py-1.5 rounded-lg bg-[#008689] text-white font-semibold text-xs flex items-center gap-1 shadow-2xs cursor-pointer transition-colors"
                                  title="Đã chọn (Bấm để hủy chọn)"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Đã chọn</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleQueueFriendInvite(friendLookedUpUser)}
                                  className="w-8 h-8 rounded-lg border border-slate-300 text-slate-600 hover:text-[#008689] hover:border-[#008689] hover:bg-teal-50 flex items-center justify-center transition-all cursor-pointer"
                                  title="Chọn để gửi lời mời hàng loạt"
                                >
                                  <Plus className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => void handleSendFriendRequest(friendLookedUpUser.email)}
                                className="px-3 py-1.5 rounded-lg bg-[#008689] hover:bg-[#007073] text-white font-semibold text-xs shadow-xs cursor-pointer transition-colors flex items-center gap-1.5"
                              >
                                <UserPlus className="w-3.5 h-3.5" />
                                <span>Kết bạn</span>
                              </button>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* CẢNH BÁO TÀI KHOẢN CHƯA ĐĂNG KÝ / KHÔNG TỒN TẠI (CHỈ KHI ĐÃ NHẬP ĐẦY ĐỦ DOMAIN EMAIL) */}
              {friendLookupStatus === 'not_found' && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(friendEmailInput.trim()) && (
                <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50/50 flex items-start gap-3 animate-fade-in">
                  <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                  <div className="min-w-0 text-xs text-rose-800 space-y-1">
                    <p className="font-bold">Người dùng không tồn tại trên hệ thống</p>
                    <p className="text-[11px] text-rose-600 leading-relaxed">
                      Địa chỉ email <strong>{friendEmailInput}</strong> chưa được dùng để đăng ký tài khoản QuizGen AI. Thầy/Cô vui lòng kiểm tra lại địa chỉ email hoặc mời đồng nghiệp đăng ký trước khi kết nối học thuật.
                    </p>
                  </div>
                </div>
              )}

              {/* MỤC GỢI Ý ĐỒNG NGHIỆP: KẾT NỐI 1-CHẠM */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Gợi ý Đồng nghiệp & Giảng viên ({filteredColleaguesForFriend.length})
                  </span>
                  <span className="text-[10px] text-slate-400">Kết nối 1-chạm</span>
                </div>

                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {filteredColleaguesForFriend.length === 0 ? (
                    <p className="text-center text-xs text-slate-400 py-3 italic">
                      Không tìm thấy đồng nghiệp phù hợp
                    </p>
                  ) : (
                    filteredColleaguesForFriend.map((f) => {
                      const state = getFriendshipState(f.email);
                      const isSelected = selectedFriendsToInvite.some((m) => m.email.toLowerCase() === f.email.toLowerCase());
                      return (
                        <div
                          key={f.email}
                          className={`p-2.5 rounded-xl border flex items-center justify-between gap-2.5 transition-colors ${
                            isSelected
                              ? 'bg-teal-50/60 border-teal-300'
                              : 'bg-slate-50 hover:bg-slate-100/80 border-slate-200/80'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <div className="w-8 h-8 rounded-lg bg-teal-700 text-white font-bold text-xs flex items-center justify-center shrink-0">
                              {initials(f.name)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-xs text-slate-800 truncate">{f.name}</span>
                                {f.title && (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-white text-slate-600 border border-slate-200 shrink-0">
                                    {f.title}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-400 truncate" title={f.email}>{f.email}</p>
                              {f.dept && (
                                <p className="text-[10px] text-slate-400 truncate">{f.dept}</p>
                              )}
                            </div>
                          </div>

                          {state.type === 'self' && (
                            <span className="text-[10px] text-slate-400 italic">Bạn</span>
                          )}
                          {state.type === 'friend' && (
                            <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-semibold text-[10px] flex items-center gap-1 shrink-0 border border-emerald-200">
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span>Đã là bạn bè</span>
                            </span>
                          )}
                          {state.type === 'sent_pending' && (
                            <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 font-semibold text-[10px] flex items-center gap-1 shrink-0 border border-amber-200">
                              <Clock className="w-3 h-3 text-amber-600" />
                              <span>Đang chờ duyệt</span>
                            </span>
                          )}
                          {state.type === 'received_pending' && (
                            <button
                              type="button"
                              onClick={() => void handleAcceptFriendRequest(state.req)}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-2xs flex items-center gap-1 cursor-pointer transition-colors shrink-0"
                              title="Chấp nhận lời mời kết bạn từ đồng nghiệp"
                            >
                              <Check className="w-3 h-3" />
                              <span>Chấp nhận</span>
                            </button>
                          )}
                          {state.type === 'none' && (
                            <div className="flex items-center gap-1.5 shrink-0">
                              {isSelected ? (
                                <button
                                  type="button"
                                  onClick={() => setSelectedFriendsToInvite((prev) => prev.filter((x) => x.email.toLowerCase() !== f.email.toLowerCase()))}
                                  className="px-2.5 py-1.5 rounded-lg bg-[#008689] text-white font-semibold text-xs flex items-center gap-1 shadow-2xs cursor-pointer transition-colors"
                                  title="Đã chọn (Bấm để hủy chọn)"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Đã chọn</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleQueueFriendInvite(f)}
                                  className="w-8 h-8 rounded-lg border border-slate-300 text-slate-600 hover:text-[#008689] hover:border-[#008689] hover:bg-teal-50 flex items-center justify-center transition-all cursor-pointer"
                                  title="Chọn vào danh sách gửi lời mời hàng loạt"
                                >
                                  <Plus className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => void handleSendFriendRequest(f.email)}
                                className="px-3 py-1.5 rounded-lg bg-[#008689] hover:bg-[#007073] text-white font-semibold text-xs shadow-2xs flex items-center gap-1.5 cursor-pointer transition-colors"
                                title="Gửi lời mời kết nối học thuật 1-1"
                              >
                                <UserPlus className="w-3.5 h-3.5" />
                                <span>Kết bạn</span>
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
              <div>
                {selectedFriendsToInvite.length > 0 && (
                  <span className="text-[11px] text-teal-800 font-bold">
                    Đã chọn {selectedFriendsToInvite.length} đồng nghiệp
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCloseAddFriendModal}
                  className="px-4 py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold cursor-pointer transition-colors"
                >
                  Đóng
                </button>
                {selectedFriendsToInvite.length > 0 && (
                  <button
                    type="button"
                    onClick={() => void handleBatchSendFriendRequests()}
                    className="px-4 py-2 rounded-lg bg-[#008689] hover:bg-[#007073] text-white font-semibold text-xs cursor-pointer transition-colors flex items-center gap-1.5 shadow-xs"
                    title="Gửi lời mời kết bạn tới tất cả đồng nghiệp đã chọn"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Gửi lời mời tất cả ({selectedFriendsToInvite.length})</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {isCreateGroupOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in"
          onClick={() => {
            setIsCreateGroupOpen(false);
            setCreateGroupSelectedMembers([]);
            setCreateGroupMemberInput('');
            setCreateGroupLookedUpUser(null);
            setCreateGroupLookupStatus('idle');
          }}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-xl sm:max-w-xl lg:max-w-2xl w-full border border-slate-200 overflow-hidden flex flex-col animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-slate-900 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-[#008689]" />
                  <span>Kênh Chuyên Môn Học Thuật</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Không gian làm việc chung: trao đổi, chia sẻ giáo trình và ma trận khảo thí UTH
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsCreateGroupOpen(false);
                  setCreateGroupSelectedMembers([]);
                  setCreateGroupMemberInput('');
                  setCreateGroupLookedUpUser(null);
                  setCreateGroupLookupStatus('idle');
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Sub-Tabs */}
            <div className="px-5 pt-3">
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg select-none">
                <button
                  type="button"
                  onClick={() => setGroupModalTab('create')}
                  className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    groupModalTab === 'create'
                      ? 'bg-white text-slate-900 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tạo kênh mới</span>
                </button>
                <button
                  type="button"
                  onClick={() => setGroupModalTab('join')}
                  className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    groupModalTab === 'join'
                      ? 'bg-white text-slate-900 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Hash className="w-3.5 h-3.5" />
                  <span>Nhập mã tham gia</span>
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              {groupModalTab === 'create' ? (
                /* TAB TẠO NHÓM MỚI */
                <div className="space-y-3.5 text-xs">
                  <div>
                    <label className="font-semibold text-slate-700">Tên kênh học thuật *</label>
                    <input
                      type="text"
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      placeholder="VD: Bộ Môn Mạng & Hệ Điều Hành"
                      className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:border-[#008689] focus:bg-white transition-all text-xs text-slate-800"
                      autoFocus
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold text-slate-700">Khoa / Bộ môn</label>
                      <input
                        type="text"
                        value={newGroupDept}
                        onChange={(e) => setNewGroupDept(e.target.value)}
                        placeholder="VD: Khoa Công nghệ Thông tin"
                        className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:border-[#008689] focus:bg-white transition-all text-xs text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700">Mô tả mục đích kênh</label>
                      <input
                        type="text"
                        value={newGroupDesc}
                        onChange={(e) => setNewGroupDesc(e.target.value)}
                        placeholder="Trao đổi ngân hàng câu hỏi, chia sẻ giáo trình..."
                        className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:border-[#008689] focus:bg-white transition-all text-xs text-slate-800"
                      />
                    </div>
                  </div>

                  {/* THÊM THÀNH VIÊN VÀO KÊNH NGAY TẠI ĐÂY (KHÔNG GIỚI HẠN SỐ LƯỢNG) */}
                  <div className="pt-2 border-t border-slate-200/80 space-y-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <UserPlus className="w-3.5 h-3.5 text-[#008689]" />
                          <span>Thêm thành viên vào kênh (tùy chọn, vô số người):</span>
                        </span>
                        <span className="text-[10px] text-slate-400 font-normal">Gõ @ để gợi ý tài khoản</span>
                      </label>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Thành viên được chọn sẽ có mặt ngay trong kênh khi vừa tạo xong
                      </p>
                    </div>

                    {/* CHIPS TRAY: DANH SÁCH THÀNH VIÊN ĐÃ CHỌN VÀO KÊNH MỚI */}
                    {createGroupSelectedMembers.length > 0 && (
                      <div className="space-y-1.5 p-3 bg-teal-50/50 border border-teal-200/80 rounded-xl animate-fade-in">
                        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700">
                          <span className="flex items-center gap-1.5 text-teal-900 font-bold">
                            <Users className="w-3.5 h-3.5 text-[#008689]" />
                            <span>Đã chọn ({createGroupSelectedMembers.length} thành viên):</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => setCreateGroupSelectedMembers([])}
                            className="text-[10px] text-rose-600 hover:text-rose-700 font-medium cursor-pointer"
                          >
                            Xóa tất cả
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                          {createGroupSelectedMembers.map((m) => (
                            <span
                              key={m.email}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white text-[#008689] border border-teal-300 text-xs font-semibold shadow-2xs animate-scale-up"
                            >
                              <span className="w-4 h-4 rounded-full bg-[#008689] text-white text-[9px] font-bold flex items-center justify-center shrink-0">
                                {initials(m.fullName)}
                              </span>
                              <span className="truncate max-w-[140px]">{m.fullName}</span>
                              {m.academicTitle && (
                                <span className="text-[9px] font-normal text-teal-700 shrink-0">({m.academicTitle})</span>
                              )}
                              <button
                                type="button"
                                onClick={() => setCreateGroupSelectedMembers((prev) => prev.filter((x) => x.email !== m.email))}
                                className="hover:text-rose-600 transition-colors p-0.5 rounded cursor-pointer shrink-0"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* INPUT TÌM KIẾM / NHẬP EMAIL THÀNH VIÊN */}
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={createGroupMemberInput}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCreateGroupMemberInput(val);
                          void handleCreateGroupMemberLookup(val);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && createGroupLookupStatus === 'found' && createGroupLookedUpUser) {
                            handleAddMemberToNewGroup(createGroupLookedUpUser);
                          }
                        }}
                        placeholder="Gõ @đồng nghiệp hoặc nhập email giảng viên cần thêm..."
                        className="w-full pl-10 pr-8 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 outline-none focus:bg-white focus:border-[#008689] focus:ring-1 focus:ring-[#008689] transition-all font-medium"
                      />
                      {createGroupLookupStatus === 'searching' && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <span className="w-3.5 h-3.5 border-2 border-teal-600 border-t-transparent rounded-full animate-spin inline-block" />
                        </div>
                      )}
                      {createGroupMemberInput && (
                        <button
                          type="button"
                          onClick={() => {
                            setCreateGroupMemberInput('');
                            setCreateGroupLookedUpUser(null);
                            setCreateGroupLookupStatus('idle');
                          }}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-slate-400 hover:text-slate-600"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* THẺ TÀI KHOẢN TÌM THẤY (ĐÃ ĐĂNG KÝ HỆ THỐNG) */}
                    {createGroupLookupStatus === 'found' && createGroupLookedUpUser && (
                      <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/40 space-y-2.5 animate-fade-in">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white font-bold flex items-center justify-center shrink-0 shadow-2xs">
                            {initials(createGroupLookedUpUser.fullName)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-xs text-slate-900 truncate">{createGroupLookedUpUser.fullName}</span>
                              {createGroupLookedUpUser.academicTitle && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-white text-slate-700 border border-slate-200 shrink-0">
                                  {createGroupLookedUpUser.academicTitle}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 truncate">{createGroupLookedUpUser.email}</p>
                            <p className="text-[10px] text-slate-400 truncate">{createGroupLookedUpUser.department || 'Khoa Công nghệ Thông tin'}</p>
                          </div>
                        </div>

                          <div className="pt-2 border-t border-emerald-200/60 flex items-center justify-between gap-2 text-xs">
                            <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>Tài khoản đã kích hoạt hệ thống</span>
                            </span>
                            {(() => {
                              const isSelected = createGroupSelectedMembers.some((m) => m.email.toLowerCase() === createGroupLookedUpUser.email.toLowerCase());
                              return isSelected ? (
                                <button
                                  type="button"
                                  onClick={() => setCreateGroupSelectedMembers((prev) => prev.filter((x) => x.email.toLowerCase() !== createGroupLookedUpUser.email.toLowerCase()))}
                                  className="px-2.5 py-1.5 rounded-lg bg-[#008689] text-white font-semibold text-xs flex items-center gap-1 shadow-2xs cursor-pointer transition-colors"
                                  title="Đã chọn (Bấm để hủy chọn)"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Đã chọn</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleAddMemberToNewGroup(createGroupLookedUpUser)}
                                  className="px-3.5 py-1.5 rounded-lg bg-[#008689] hover:bg-[#007073] text-white font-semibold text-xs shadow-xs cursor-pointer transition-colors flex items-center gap-1.5"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  <span>Thêm vào kênh ({createGroupSelectedMembers.length + 1})</span>
                                </button>
                              );
                            })()}
                          </div>
                      </div>
                    )}

                    {/* CẢNH BÁO TÀI KHOẢN CHƯA ĐĂNG KÝ / KHÔNG TỒN TẠI */}
                    {createGroupLookupStatus === 'not_found' && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(createGroupMemberInput.trim()) && (
                      <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50/50 flex items-start gap-3 animate-fade-in">
                        <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                        <div className="min-w-0 text-xs text-rose-800 space-y-1">
                          <p className="font-bold">Người dùng không tồn tại trên hệ thống</p>
                          <p className="text-[11px] text-rose-600 leading-relaxed">
                            Địa chỉ email <strong>{createGroupMemberInput}</strong> chưa được dùng để đăng ký tài khoản QuizGen AI. Thầy/Cô vui lòng kiểm tra lại địa chỉ email hoặc mời đồng nghiệp đăng ký trước khi thêm vào kênh.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* GỢI Ý ĐỒNG NGHIỆP TRONG TRƯỜNG */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          Gợi ý Đồng nghiệp ({filteredColleaguesForNewGroup.length})
                        </span>
                        <span className="text-[10px] text-slate-400">Bấm để chọn nhanh</span>
                      </div>

                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        {filteredColleaguesForNewGroup.length === 0 ? (
                          <p className="text-center text-xs text-slate-400 py-2.5 italic">
                            Không còn đồng nghiệp nào khác chưa chọn
                          </p>
                        ) : (
                          filteredColleaguesForNewGroup.map((f) => {
                            const isSelected = createGroupSelectedMembers.some((m) => m.email.toLowerCase() === f.email.toLowerCase());
                            return (
                              <div
                                key={f.email}
                                className={`p-2.5 rounded-xl border flex items-center justify-between gap-2.5 transition-colors ${
                                  isSelected
                                    ? 'bg-teal-50/60 border-teal-300'
                                    : 'bg-slate-50 hover:bg-slate-100/80 border-slate-200/80'
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                  <div className="w-8 h-8 rounded-lg bg-teal-700 text-white font-bold text-xs flex items-center justify-center shrink-0">
                                    {initials(f.name)}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-bold text-xs text-slate-800 truncate">{f.name}</span>
                                      {f.title && (
                                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-white text-slate-600 border border-slate-200 shrink-0">
                                          {f.title}
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[11px] text-slate-400 truncate" title={f.email}>{f.email}</p>
                                  </div>
                                </div>
                                {isSelected ? (
                                  <button
                                    type="button"
                                    onClick={() => setCreateGroupSelectedMembers((prev) => prev.filter((x) => x.email.toLowerCase() !== f.email.toLowerCase()))}
                                    className="px-2.5 py-1.5 rounded-lg bg-[#008689] text-white font-semibold text-xs flex items-center gap-1 shadow-2xs cursor-pointer transition-colors shrink-0"
                                    title="Đã chọn (Bấm để hủy chọn)"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    <span>Đã chọn</span>
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleAddMemberToNewGroup({ email: f.email, fullName: f.name, academicTitle: f.title, department: f.dept })}
                                    className="w-8 h-8 rounded-lg border border-slate-300 text-slate-600 hover:text-[#008689] hover:border-[#008689] hover:bg-teal-50 flex items-center justify-center transition-all cursor-pointer shrink-0"
                                    title="Chọn thành viên"
                                  >
                                    <Plus className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* TAB NHẬP MÃ THAM GIA */
                <div className="space-y-3.5 text-xs">
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                    <span className="font-semibold text-slate-800 text-[11px] flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5 text-slate-600" />
                      <span>Tham gia nhóm qua Mã phòng</span>
                    </span>
                    <p className="text-slate-600 text-[11px] leading-relaxed">
                      Nhập mã phòng chuyên môn được đồng nghiệp hoặc Trưởng nhóm chia sẻ (ví dụ: <strong className="font-mono text-slate-800">QGRP-L6RUM</strong>).
                    </p>
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700">Mã phòng chuyên môn *</label>
                    <div className="relative mt-1">
                      <Hash className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        type="text"
                        value={joinCodeInput}
                        onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            void handleJoinByCode(joinCodeInput);
                          }
                        }}
                        placeholder="VD: QGRP-OS2026..."
                        className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:border-[#008689] focus:bg-white font-mono font-bold text-slate-800 placeholder-slate-400 text-xs tracking-wider"
                      />
                    </div>
                  </div>

                  <div className="space-y-1 text-[11px] text-slate-500 px-1">
                    <p>• Kênh công khai: Bạn sẽ vào thẳng nhóm trò chuyện ngay lập tức.</p>
                    <p>• Kênh cần phê duyệt: Yêu cầu sẽ được chuyển đến Trưởng nhóm để duyệt.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
              <div>
                {groupModalTab === 'create' && createGroupSelectedMembers.length > 0 && (
                  <span className="text-[11px] text-teal-800 font-bold">
                    Khởi tạo kèm {createGroupSelectedMembers.length} thành viên
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateGroupOpen(false);
                    setCreateGroupSelectedMembers([]);
                    setCreateGroupMemberInput('');
                    setCreateGroupLookedUpUser(null);
                    setCreateGroupLookupStatus('idle');
                  }}
                  className="px-4 py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold cursor-pointer transition-colors"
                >
                  Hủy
                </button>
                {groupModalTab === 'create' ? (
                  <button
                    type="button"
                    disabled={!newGroupName.trim()}
                    onClick={handleCreateGroup}
                    className="px-5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white font-semibold text-xs shadow-xs cursor-pointer transition-colors flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>
                      Tạo kênh {createGroupSelectedMembers.length > 0 ? `(${createGroupSelectedMembers.length + 1} thành viên)` : ''}
                    </span>
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={!joinCodeInput.trim() || isJoiningCode}
                    onClick={() => void handleJoinByCode(joinCodeInput)}
                    className="px-5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white font-semibold text-xs shadow-xs cursor-pointer flex items-center gap-1.5 transition-colors"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Tham gia kênh ngay</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

const Modal: React.FC<{
  onClose: () => void;
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}> = ({ onClose, title, icon, children }) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-slate-900/50 p-4"
    onClick={onClose}
  >
    <div
      className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-5 space-y-4"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          {icon}
          <span>{title}</span>
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      {children}
    </div>
  </div>
);

// ── ConversationItem (True Enterprise Slack & Teams Standard) ─────────────
const ConversationItem: React.FC<{
  group: QGroup;
  isSelected: boolean;
  myEmail: string;
  isMenuOpen: boolean;
  onSelect: () => void;
  onMenuToggle: (e: React.MouseEvent) => void;
  onViewProfile: () => void;
  onViewDetails: () => void;
  onMute: () => void;
  onDelete: () => void;
  onLeave: () => void;
  onDisband?: () => void;
  onCopyCode: () => void;
}> = ({
  group,
  isSelected,
  myEmail,
  isMenuOpen,
  onSelect,
  onMenuToggle,
  onViewProfile,
  onViewDetails,
  onMute,
  onDelete,
  onLeave,
  onDisband,
  onCopyCode,
}) => {
  const msgs = group.messages || [];
  const lastMsg = msgs.length > 0 ? msgs[msgs.length - 1] : null;
  const isUnread =
    !isSelected &&
    Boolean(
      lastMsg &&
      !lastMsg.isSystem &&
      lastMsg.senderEmail?.toLowerCase() !== myEmail &&
      !(lastMsg.readBy || []).some((r) => String(r).toLowerCase() === myEmail)
    );

  const isGroup = !group.isDirect;
  const isOwner = (group.ownerEmail || '').toLowerCase() === myEmail.toLowerCase();
  const info = resolveChatDisplayInfo(group, myEmail);

  if (isGroup) {
    return (
      <div
        onClick={onSelect}
        className={`group relative flex items-center justify-between px-3 py-1.5 mx-1.5 rounded-lg cursor-pointer transition-all select-none ${
          isSelected
            ? 'bg-slate-200/90 text-slate-900 font-bold'
            : isUnread
            ? 'text-slate-900 font-bold bg-slate-50 hover:bg-slate-100'
            : 'text-slate-600 font-medium hover:bg-slate-100 hover:text-slate-900'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1 pr-6">
          <Hash
            className={`w-4 h-4 shrink-0 transition-colors ${
              isSelected ? 'text-slate-900' : 'text-slate-400 group-hover:text-slate-600'
            }`}
          />
          <span className="text-xs truncate">{group.name}</span>
          {isOwner && (
            <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-slate-100 text-slate-700 border border-slate-300 shrink-0">
              Trưởng nhóm
            </span>
          )}
          {group.muted && <BellOff className="w-3 h-3 text-slate-400 shrink-0" />}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {isUnread && (
            <span className="w-2 h-2 rounded-full bg-teal-600 shrink-0" />
          )}
          <button
            type="button"
            onClick={onMenuToggle}
            className="opacity-0 group-hover:opacity-100 focus:opacity-100 w-6 h-6 rounded hover:bg-slate-300/60 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-all cursor-pointer"
            title="Tùy chọn kênh"
          >
            <MoreVertical className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Slack Channel Context Menu */}
        {isMenuOpen && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute right-6 top-7 z-40 w-56 bg-white border border-slate-200 rounded-xl shadow-xl py-1 text-xs animate-fade-in"
          >
            <MenuBtn icon={<Info className="w-3.5 h-3.5 text-slate-600" />} label="Chi tiết kênh" onClick={onViewDetails} />
            <MenuBtn icon={<Copy className="w-3.5 h-3.5 text-slate-500" />} label="Sao chép mã nhóm" onClick={onCopyCode} />
            <MenuBtn
              icon={group.muted ? <Bell className="w-3.5 h-3.5 text-slate-600" /> : <BellOff className="w-3.5 h-3.5 text-slate-400" />}
              label={group.muted ? 'Bật thông báo' : 'Tắt thông báo'}
              onClick={onMute}
            />
            <div className="border-t border-slate-100 my-1" />
            {isOwner ? (
              <>
                <MenuBtn icon={<UserCheck className="w-3.5 h-3.5 text-slate-700" />} label="Nhượng quyền Trưởng nhóm" onClick={onLeave} />
                {onDisband && (
                  <MenuBtn icon={<Trash2 className="w-3.5 h-3.5 text-rose-600" />} label="Giải tán nhóm" onClick={onDisband} danger />
                )}
              </>
            ) : (
              <MenuBtn icon={<LogOut className="w-3.5 h-3.5 text-rose-500" />} label="Rời khỏi nhóm" onClick={onLeave} danger />
            )}
          </div>
        )}
      </div>
    );
  }

  // DIRECT MESSAGE (1-1 Slack Row)
  return (
    <div
      onClick={onSelect}
      className={`group relative flex items-center justify-between px-3 py-1.5 mx-1.5 rounded-lg cursor-pointer transition-all select-none ${
        isSelected
          ? 'bg-slate-200/90 text-slate-900 font-bold'
          : isUnread
          ? 'text-slate-900 font-bold bg-slate-50 hover:bg-slate-100'
          : 'text-slate-600 font-medium hover:bg-slate-100 hover:text-slate-900'
      }`}
    >
      <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-6">
        <div className="relative shrink-0">
          <div className="w-5 h-5 rounded-md bg-slate-700 text-white font-bold text-[9px] flex items-center justify-center">
            {info.avatarInitials}
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-500 ring-1 ring-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs truncate">{info.displayName}</p>
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {isUnread && (
          <span className="w-2 h-2 rounded-full bg-teal-600 shrink-0" />
        )}
        <button
          type="button"
          onClick={onMenuToggle}
          className="opacity-0 group-hover:opacity-100 focus:opacity-100 w-6 h-6 rounded hover:bg-slate-300/60 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-all cursor-pointer"
          title="Tùy chọn tin nhắn"
        >
          <MoreVertical className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Context Menu for DM */}
      {isMenuOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute right-6 top-7 z-40 w-52 bg-white border border-slate-200 rounded-xl shadow-xl py-1 text-xs animate-fade-in"
        >
          <MenuBtn icon={<User className="w-3.5 h-3.5 text-slate-600" />} label="Xem trang cá nhân" onClick={onViewProfile} />
          <MenuBtn
            icon={group.muted ? <Bell className="w-3.5 h-3.5 text-slate-600" /> : <BellOff className="w-3.5 h-3.5 text-slate-400" />}
            label={group.muted ? 'Bật thông báo' : 'Tắt thông báo'}
            onClick={onMute}
          />
          <div className="border-t border-slate-100 my-1" />
          <MenuBtn icon={<Trash2 className="w-3.5 h-3.5 text-rose-500" />} label="Xóa đoạn chat" onClick={onDelete} danger />
        </div>
      )}
    </div>
  );
};

const MenuBtn: React.FC<{
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}> = ({ icon, label, onClick, danger }) => (
  <button
    type="button"
    onClick={onClick}
    className={`w-full px-3.5 py-2 text-left hover:bg-slate-50 flex items-center gap-2 cursor-pointer ${
      danger ? 'text-rose-600 font-semibold' : 'text-slate-700'
    }`}
  >
    {icon}
    <span>{label}</span>
  </button>
);

// ── InvitationsPanel ──────────────────────────────────────────────────────────
const InvitationsPanel: React.FC<{
  friendRequests: FriendRequest[];
  sentFriendRequests?: FriendRequest[];
  groupInvitations: QGroupInvitation[];
  onAcceptFriend: (r: FriendRequest) => void;
  onRejectFriend: (r: FriendRequest) => void;
  onCancelFriend?: (reqId: string) => void;
  onAcceptGroup: (i: QGroupInvitation) => void;
  onRejectGroup: (i: QGroupInvitation) => void;
  onBack: () => void;
}> = ({
  friendRequests,
  sentFriendRequests = [],
  groupInvitations,
  onAcceptFriend,
  onRejectFriend,
  onCancelFriend,
  onAcceptGroup,
  onRejectGroup,
  onBack,
}) => {
  const [subTab, setSubTab] = useState<'received' | 'sent'>('received');
  const totalReceived = friendRequests.length + groupInvitations.length;
  const totalSent = sentFriendRequests.length;

  return (
    <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
        <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
          <Inbox className="w-4 h-4 text-slate-700" />
          <span>Trung Tâm Lời Mời</span>
        </span>
        <button
          type="button"
          onClick={onBack}
          className="text-xs text-slate-700 hover:text-slate-900 font-semibold hover:underline cursor-pointer"
        >
          ← Về kênh chat
        </button>
      </div>

      {/* Sub-tabs: Đã nhận vs Đã gửi */}
      <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg select-none">
        <button
          type="button"
          onClick={() => setSubTab('received')}
          className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            subTab === 'received'
              ? 'bg-white text-slate-900 shadow-2xs font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span>Lời mời đã nhận</span>
          {totalReceived > 0 && (
            <span className="px-1.5 rounded-full text-[10px] font-bold bg-rose-500 text-white">
              {totalReceived}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setSubTab('sent')}
          className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            subTab === 'sent'
              ? 'bg-white text-slate-900 shadow-2xs font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span>Lời mời đã gửi</span>
          {totalSent > 0 && (
            <span className="px-1.5 rounded-full text-[10px] font-semibold bg-slate-200 text-slate-700">
              {totalSent}
            </span>
          )}
        </button>
      </div>

      {subTab === 'received' ? (
        <div className="space-y-3">
          {friendRequests.length > 0 && (
            <div className="space-y-2">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5 text-slate-600" />
                Lời mời kết bạn ({friendRequests.length})
              </span>
              {friendRequests.map((req) => (
                <div
                  key={req.id}
                  className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2.5"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-slate-700 text-white font-bold text-xs flex items-center justify-center shrink-0">
                      {initials(req.senderName || req.senderEmail)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-xs font-bold text-slate-900 truncate">
                          {req.senderName || req.senderEmail}
                        </h4>
                        {req.senderTitle && (
                          <span className="px-1.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 shrink-0 border border-slate-200">
                            {req.senderTitle}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 font-mono truncate">
                        {req.senderEmail}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => onAcceptFriend(req)}
                      className="flex-1 py-1.5 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs flex items-center justify-center gap-1 cursor-pointer transition-colors"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Đồng ý
                    </button>
                    <button
                      type="button"
                      onClick={() => onRejectFriend(req)}
                      className="py-1.5 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center justify-center gap-1 border border-slate-200 cursor-pointer transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                      Từ chối
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {groupInvitations.length > 0 && (
            <div className="space-y-2">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-slate-600" />
                Lời mời tham gia nhóm ({groupInvitations.length})
              </span>
              {groupInvitations.map((inv) => (
                <div
                  key={inv.id}
                  className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2.5"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-slate-700 text-white font-bold text-xs flex items-center justify-center shrink-0">
                      {initials(inv.groupName)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-bold text-slate-900 truncate">{inv.groupName}</h4>
                      <p className="text-[10px] text-slate-600 font-mono">Mã: {inv.groupCode}</p>
                      <p className="text-[10px] text-slate-400 truncate">
                        Mời bởi: {inv.inviterName || inv.inviterEmail}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => onAcceptGroup(inv)}
                      className="flex-1 py-1.5 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs flex items-center justify-center gap-1 cursor-pointer transition-colors"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Tham gia
                    </button>
                    <button
                      type="button"
                      onClick={() => onRejectGroup(inv)}
                      className="py-1.5 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center justify-center gap-1 border border-slate-200 cursor-pointer transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                      Từ chối
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {totalReceived === 0 && (
            <div className="p-8 text-center text-slate-400 space-y-2">
              <Check className="w-8 h-8 text-slate-300 mx-auto" />
              <h4 className="text-xs font-semibold text-slate-700">Không có lời mời nào đã nhận</h4>
              <p className="text-[11px] text-slate-400">Bạn đã xử lý hết tất cả lời mời.</p>
            </div>
          )}
        </div>
      ) : (
        /* TAB SUB-TAB: ĐÃ GỬI (OUTGOING SENT) */
        <div className="space-y-3">
          {sentFriendRequests.length > 0 ? (
            <div className="space-y-2">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                <Send className="w-3.5 h-3.5 text-slate-600" />
                Lời mời kết bạn đã gửi ({sentFriendRequests.length})
              </span>
              {sentFriendRequests.map((req) => (
                <div
                  key={req.id}
                  className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-slate-700 text-white font-bold text-xs flex items-center justify-center shrink-0">
                        {initials(req.targetEmail || req.recipientEmail || '')}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-900 truncate">
                          {req.targetEmail || req.recipientEmail}
                        </p>
                        <p className="text-[10px] text-amber-700 font-medium flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Đang chờ đồng nghiệp chấp nhận
                        </p>
                      </div>
                    </div>

                    {onCancelFriend && (
                      <button
                        type="button"
                        onClick={() => onCancelFriend(req.id)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] transition-colors cursor-pointer border border-slate-200 shrink-0"
                        title="Thu hồi lời mời kết bạn"
                      >
                        Thu hồi
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400 space-y-2">
              <Send className="w-8 h-8 mx-auto text-slate-300" />
              <p className="text-xs font-semibold text-slate-700">Chưa gửi lời mời kết bạn nào</p>
              <p className="text-[11px]">Bấm biểu tượng thêm bạn ở thanh công cụ để mời đồng nghiệp kết nối.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// MODAL: SLACK CHANNEL DETAILS (INFORMATIONAL: ABOUT, MEMBERS, FILES)
// ============================================================================
const ChannelDetailsModal: React.FC<{
  group: QGroup;
  myEmail: string;
  activeTab: 'about' | 'members' | 'files';
  onTabChange: (t: 'about' | 'members' | 'files') => void;
  inviteEmail: string;
  onInviteEmailChange: (v: string) => void;
  onInvite: () => void;
  onClose: () => void;
  onLeaveGroup: () => void;
  onKickMember?: (email: string, name: string) => void;
  onRespondJoinRequest?: (requestId: string, email: string, action: 'approve' | 'reject') => void;
}> = ({
  group,
  myEmail,
  activeTab,
  onTabChange,
  inviteEmail,
  onInviteEmailChange,
  onInvite,
  onClose,
  onLeaveGroup,
  onKickMember,
  onRespondJoinRequest,
}) => {
  const isOwner = (group.ownerEmail || '').toLowerCase() === myEmail.toLowerCase();
  const members = group.members || [];
  const pendingRequests = group.pendingRequests || [];

  // Extract shared files from messages
  const sharedFiles = useMemo(() => {
    const list: any[] = [];
    (group.messages || []).forEach((m) => {
      if (m.attachment) {
        list.push({ ...m.attachment, sentAt: m.timestamp, senderName: m.senderName });
      }
    });
    return list;
  }, [group.messages]);

  const [modalLookupStatus, setModalLookupStatus] = useState<'idle' | 'searching' | 'found' | 'not_found'>('idle');
  const [modalLookedUpUser, setModalLookedUpUser] = useState<any>(null);

  useEffect(() => {
    const clean = inviteEmail.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!clean || !emailRegex.test(clean)) {
      setModalLookupStatus('idle');
      setModalLookedUpUser(null);
      return;
    }
    const timer = setTimeout(async () => {
      setModalLookupStatus('searching');
      try {
        const res = await apiClient.fetch(
          `${API_BASE}/auth/users/lookup?email=${encodeURIComponent(clean)}`
        );
        if (res.ok) {
          const data = await res.json();
          if (data.exists && data.user) {
            setModalLookedUpUser(data.user);
            setModalLookupStatus('found');
            return;
          }
        }
      } catch {}

      const localRegistered: Record<
        string,
        { fullName: string; academicTitle: string; department: string }
      > = {
        'mr.av1222005@gmail.com': {
          fullName: 'Mr. AV',
          academicTitle: 'ThS.',
          department: 'Khoa Công nghệ Thông tin',
        },
        'avanimechannel@gmail.com': {
          fullName: 'Vũ Anh',
          academicTitle: 'ThS.',
          department: 'Khoa Công nghệ Thông tin',
        },
        'hieuhieu22112005@gmail.com': {
          fullName: 'Hieu Huynh',
          academicTitle: 'ThS.',
          department: 'Khoa Công nghệ Thông tin',
        },
        'daipqps37469@gmail.com': {
          fullName: 'Đại Phạm Quang',
          academicTitle: 'ThS.',
          department: 'Khoa Công nghệ Thông tin',
        },
        'vuha3608@ut.edu.vn': {
          fullName: 'Vũ Hồ Anh',
          academicTitle: 'ThS.',
          department: 'Khoa Công nghệ Thông tin',
        },
        'nguyentann0804@gmail.com': {
          fullName: 'Nguyễn Văn Tân',
          academicTitle: 'TS.',
          department: 'Khoa Công nghệ Thông tin',
        },
        'quizgen.ai.team@gmail.com': {
          fullName: 'Ban Quản trị QuizGen AI',
          academicTitle: 'Admin',
          department: 'Hệ thống Khảo thí UTH',
        },
        'hod.cntt@uth.edu.vn': {
          fullName: 'PGS. TS. Trưởng Khoa CNTT',
          academicTitle: 'PGS. TS.',
          department: 'Khoa Công nghệ Thông tin',
        },
        'gv.kinhte@uth.edu.vn': {
          fullName: 'TS. Giảng viên Kinh tế',
          academicTitle: 'TS.',
          department: 'Khoa Kinh tế Vận tải',
        },
      };
      if (localRegistered[clean]) {
        setModalLookedUpUser({ email: clean, ...localRegistered[clean] });
        setModalLookupStatus('found');
        return;
      }
      setModalLookedUpUser(null);
      setModalLookupStatus('not_found');
    }, 300);

    return () => clearTimeout(timer);
  }, [inviteEmail]);

  const joinPolicyLabel = {
    open: 'Công khai (Mọi giảng viên đều có thể tham gia)',
    approval_required: 'Cần phê duyệt (Yêu cầu Trưởng nhóm duyệt trước)',
    invite_only: 'Riêng tư (Chỉ khi được mời trực tiếp)',
  }[group.joinPolicy as 'open' | 'approval_required' | 'invite_only'] || 'Công khai';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-slate-900/50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header (Clean Slack Header) */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-sm">
              <Hash className="w-5 h-5 text-slate-700" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1">
                  <span>Chi tiết kênh #{group.name}</span>
                </h3>
                {isOwner && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-200 text-slate-700 border border-slate-300">
                    Trưởng nhóm
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                Mã: <strong className="text-slate-800">{group.code}</strong> • {joinPolicyLabel}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-white hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center cursor-pointer border border-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Slack Minimal Underline Tabs */}
        <div className="flex items-center gap-4 px-5 pt-1 border-b border-slate-200 bg-white">
          {[
            { id: 'about' as const, label: 'Giới thiệu', icon: Info },
            {
              id: 'members' as const,
              label: `Thành viên (${members.length})`,
              icon: Users,
              badge: isOwner && pendingRequests.length > 0 ? pendingRequests.length : undefined,
            },
            { id: 'files' as const, label: `Tệp & Học liệu (${sharedFiles.length})`, icon: FileText },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                className={`pb-2.5 pt-2 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer relative ${
                  activeTab === tab.id
                    ? 'border-slate-900 text-slate-900 font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {/* TAB 1: ABOUT */}
          {activeTab === 'about' && (
            <div className="space-y-3.5">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="font-semibold text-slate-500 uppercase text-[10px] tracking-wide">Mục đích kênh</span>
                <p className="text-slate-800 leading-relaxed font-normal">
                  {group.description || 'Không gian làm việc chung: trao đổi câu hỏi, chia sẻ giáo trình và thống nhất ma trận đề thi.'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase">Khoa / Bộ môn</span>
                  <p className="text-slate-900 font-bold mt-0.5">{group.department || 'Chung'}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase">Trưởng nhóm</span>
                  <p className="text-slate-900 font-bold mt-0.5 truncate">{group.ownerName || 'TS. Hồ Anh Vũ'}</p>
                </div>
              </div>

              {/* Chế độ tham gia */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-semibold text-slate-500 uppercase">Chế độ tham gia</span>
                  <p className="text-slate-900 font-semibold mt-0.5">{joinPolicyLabel}</p>
                </div>
                {group.joinPolicy === 'invite_only' ? (
                  <Lock className="w-4 h-4 text-slate-600 shrink-0" />
                ) : group.joinPolicy === 'approval_required' ? (
                  <ShieldCheck className="w-4 h-4 text-slate-600 shrink-0" />
                ) : (
                  <Globe className="w-4 h-4 text-slate-600 shrink-0" />
                )}
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 space-y-2">
                <span className="font-semibold text-slate-700">Mã liên kết phòng học thuật</span>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={group.code}
                    className="flex-1 px-3 py-2 bg-slate-100 rounded-lg font-mono text-slate-800 font-bold outline-none border border-slate-200"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(group.code);
                    }}
                    className="px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold cursor-pointer transition-colors"
                  >
                    Sao chép
                  </button>
                </div>
                {group.joinPolicy === 'invite_only' && (
                  <p className="text-[11px] text-amber-700">
                    * Nhóm đang ở chế độ Riêng tư: người ngoài cần có thư mời trực tiếp qua email để tham gia.
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={onLeaveGroup}
                className="w-full py-2.5 rounded-lg border border-slate-300 hover:bg-rose-50 hover:border-rose-300 text-slate-700 hover:text-rose-700 font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Rời khỏi kênh này</span>
              </button>
            </div>
          )}

          {/* TAB 2: MEMBERS */}
          {activeTab === 'members' && (
            <div className="space-y-4">
              {/* Khối yêu cầu phê duyệt tham gia (Chỉ Trưởng nhóm thấy) */}
              {isOwner && pendingRequests.length > 0 && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-300 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-600" />
                      <span>Yêu cầu xin gia nhập ({pendingRequests.length})</span>
                    </span>
                    <span className="text-[10px] text-slate-600 font-semibold">Chờ duyệt</span>
                  </div>

                  <div className="space-y-1.5">
                    {pendingRequests.map((req) => (
                      <div
                        key={req.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200 gap-2"
                      >
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 truncate">
                            {req.name || req.email}
                          </p>
                          <p className="text-[10px] text-slate-500 truncate">
                            {req.email} • {req.requestedAt}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => onRespondJoinRequest?.(req.id, req.email, 'approve')}
                            className="px-2.5 py-1 rounded-md bg-slate-900 hover:bg-slate-800 text-white font-semibold text-[11px] flex items-center gap-1 cursor-pointer"
                          >
                            <Check className="w-3 h-3" />
                            <span>Duyệt</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onRespondJoinRequest?.(req.id, req.email, 'reject')}
                            className="px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] flex items-center gap-1 cursor-pointer border border-slate-200"
                          >
                            <X className="w-3 h-3" />
                            <span>Từ chối</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Mời thêm thành viên qua Email */}
              <div className="space-y-2">
                <label className="text-[11px] font-semibold text-slate-700 uppercase tracking-wide">
                  Mời giảng viên qua Email
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => onInviteEmailChange(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && onInvite()}
                      placeholder="Nhập email đồng nghiệp..."
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg outline-none focus:border-slate-600 text-xs"
                    />
                    {modalLookupStatus === 'searching' && (
                      <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                        <span className="w-3 h-3 border-2 border-teal-600 border-t-transparent rounded-full animate-spin inline-block" />
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={onInvite}
                    disabled={!inviteEmail.trim() || modalLookupStatus === 'not_found'}
                    className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white font-semibold cursor-pointer transition-colors shrink-0"
                  >
                    Gửi lời mời
                  </button>
                </div>

                {/* Thẻ tài khoản hợp lệ */}
                {modalLookupStatus === 'found' && modalLookedUpUser && (
                  <div className="p-2.5 rounded-lg border border-emerald-200 bg-emerald-50/50 flex items-center justify-between gap-2 animate-fade-in">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-md bg-slate-800 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                        {initials(modalLookedUpUser.fullName)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 truncate text-[11px]">
                          {modalLookedUpUser.fullName}
                          {modalLookedUpUser.academicTitle && (
                            <span className="ml-1 text-[9px] font-normal text-slate-500">({modalLookedUpUser.academicTitle})</span>
                          )}
                        </p>
                        <p className="text-[10px] text-emerald-700 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Đã đăng ký tài khoản</span>
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={onInvite}
                      className="px-2.5 py-1 rounded bg-[#008689] hover:bg-[#007073] text-white font-semibold text-[10px] shrink-0"
                    >
                      Mời
                    </button>
                  </div>
                )}

                {/* Cảnh báo người dùng chưa đăng ký */}
                {modalLookupStatus === 'not_found' && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(inviteEmail.trim()) && (
                  <div className="p-2.5 rounded-lg border border-rose-200 bg-rose-50/60 flex items-start gap-2 text-[11px] text-rose-700 animate-fade-in">
                    <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-rose-900">Người dùng không tồn tại trên hệ thống</p>
                      <p className="text-[10px] text-rose-600 leading-tight mt-0.5">
                        Email này chưa được dùng để đăng ký tài khoản QuizGen AI.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Danh sách thành viên hiện tại */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                  Danh sách thành viên ({members.length})
                </span>
                {members.map((email) => {
                  const isGroupOwner = email.toLowerCase() === (group.ownerEmail || '').toLowerCase();
                  const isMe = email.toLowerCase() === myEmail.toLowerCase();
                  return (
                    <div
                      key={email}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 border border-slate-200 justify-between group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-md bg-slate-700 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                          {initials(email)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-800 truncate">
                            {email}
                            {isMe && <span className="text-slate-500 font-normal ml-1">(Bạn)</span>}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            {isGroupOwner ? 'Trưởng nhóm' : 'Thành viên'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {isGroupOwner && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-300">
                            Trưởng nhóm
                          </span>
                        )}

                        {/* Nút Kick thành viên dành riêng cho Trưởng nhóm */}
                        {isOwner && !isMe && !isGroupOwner && onKickMember && (
                          <button
                            type="button"
                            onClick={() => onKickMember(email, email)}
                            className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title={`Loại ${email} ra khỏi nhóm`}
                          >
                            <UserMinus className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: FILES */}
          {activeTab === 'files' && (
            <div className="space-y-3">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                Học liệu & Giáo trình đã chia sẻ ({sharedFiles.length})
              </span>
              {sharedFiles.length === 0 ? (
                <div className="p-8 text-center text-slate-400 space-y-2">
                  <FileText className="w-8 h-8 mx-auto text-slate-300" />
                  <p className="font-semibold text-slate-600">Chưa có tệp nào được gửi</p>
                  <p className="text-[11px]">Dùng biểu tượng ghim ở thanh soạn thảo để đính kèm giáo trình chia sẻ cho nhóm.</p>
                </div>
              ) : (
                sharedFiles.map((file, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl border border-slate-200 bg-white flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 border border-slate-200">
                        <BookOpen className="w-4 h-4 text-teal-700" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-800 truncate">{file.name}</p>
                        <p className="text-[10px] text-slate-500">
                          {file.totalPages} trang • Gửi bởi {file.senderName} ({file.sentAt})
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => alert(`Đã kích hoạt giáo trình ${file.name} để sinh đề trắc nghiệm!`)}
                      className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-[11px] shrink-0 cursor-pointer"
                    >
                      Sinh Đề
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// MODAL: DEDICATED CHANNEL SETTINGS (SLACK / TEAMS DEDICATED CONFIGURATION)
// ============================================================================
const ChannelSettingsModal: React.FC<{
  group: QGroup;
  myEmail: string;
  onClose: () => void;
  onSaveSettings: (
    name: string,
    dept: string,
    desc: string,
    joinPolicy: 'open' | 'approval_required' | 'invite_only'
  ) => void;
  onTransferOwner: () => void;
  onDisband: () => void;
}> = ({
  group,
  myEmail,
  onClose,
  onSaveSettings,
  onTransferOwner,
  onDisband,
}) => {
  const isOwner = (group.ownerEmail || '').toLowerCase() === myEmail.toLowerCase();
  const [editName, setEditName] = useState(group.name);
  const [editDept, setEditDept] = useState(group.department || '');
  const [editDesc, setEditDesc] = useState(group.description || '');
  const [editJoinPolicy, setEditJoinPolicy] = useState<'open' | 'approval_required' | 'invite_only'>(
    (group.joinPolicy as any) || 'open'
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-slate-900/50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-sm">
              <Settings className="w-5 h-5 text-teal-700" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">
                  Cài đặt kênh #{group.name}
                </h3>
                {isOwner && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    Trưởng nhóm
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Cấu hình thông tin, quyền phê duyệt và quản trị nhóm học thuật
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-white hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center cursor-pointer border border-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {!isOwner && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 flex items-start gap-2.5 text-[11px]">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Chế độ xem thông tin cài đặt</p>
                <p className="text-amber-700 mt-0.5">
                  Chỉ Trưởng nhóm (<strong>{group.ownerName || group.ownerEmail}</strong>) mới có quyền chỉnh sửa cấu hình kênh này.
                </p>
              </div>
            </div>
          )}

          <div className="space-y-3.5">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Tên kênh học thuật</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                disabled={!isOwner}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg outline-none focus:border-teal-600 text-xs disabled:opacity-60 font-medium"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Khoa / Bộ môn phụ trách</label>
              <input
                type="text"
                value={editDept}
                onChange={(e) => setEditDept(e.target.value)}
                disabled={!isOwner}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg outline-none focus:border-teal-600 text-xs disabled:opacity-60"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Mục đích & Nội dung hoạt động</label>
              <textarea
                rows={2}
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                disabled={!isOwner}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg outline-none focus:border-teal-600 resize-none text-xs disabled:opacity-60 leading-relaxed"
              />
            </div>

            {/* Chế độ tham gia */}
            <div className="space-y-2 pt-2 border-t border-slate-200">
              <label className="font-semibold text-slate-700 block">Chế độ tham gia & Xét duyệt thành viên</label>
              <div className="space-y-2">
                {/* Open */}
                <label
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    editJoinPolicy === 'open'
                      ? 'border-[#008689] bg-teal-50/40 ring-1 ring-[#008689]'
                      : 'border-slate-200 hover:bg-slate-50'
                  } ${!isOwner ? 'pointer-events-none opacity-70' : ''}`}
                >
                  <input
                    type="radio"
                    name="modalJoinPolicy"
                    checked={editJoinPolicy === 'open'}
                    onChange={() => setEditJoinPolicy('open')}
                    disabled={!isOwner}
                    className="mt-0.5 text-teal-700 focus:ring-teal-700"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 font-semibold text-slate-900">
                      <Globe className="w-3.5 h-3.5 text-slate-700" />
                      <span>Công khai (Tự do tham gia khi có mã phòng)</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Giảng viên nhập đúng mã phòng sẽ được tự động tham gia nhóm ngay lập tức.
                    </p>
                  </div>
                </label>

                {/* Approval */}
                <label
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    editJoinPolicy === 'approval_required'
                      ? 'border-[#008689] bg-teal-50/40 ring-1 ring-[#008689]'
                      : 'border-slate-200 hover:bg-slate-50'
                  } ${!isOwner ? 'pointer-events-none opacity-70' : ''}`}
                >
                  <input
                    type="radio"
                    name="modalJoinPolicy"
                    checked={editJoinPolicy === 'approval_required'}
                    onChange={() => setEditJoinPolicy('approval_required')}
                    disabled={!isOwner}
                    className="mt-0.5 text-teal-700 focus:ring-teal-700"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 font-semibold text-slate-900">
                      <ShieldCheck className="w-3.5 h-3.5 text-slate-700" />
                      <span>Cần phê duyệt (Trưởng nhóm duyệt mới vào)</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Giảng viên nhập mã sẽ gửi yêu cầu gia nhập; Trưởng nhóm sẽ nhận thông báo để phê duyệt hoặc từ chối.
                    </p>
                  </div>
                </label>

                {/* Invite only */}
                <label
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    editJoinPolicy === 'invite_only'
                      ? 'border-[#008689] bg-teal-50/40 ring-1 ring-[#008689]'
                      : 'border-slate-200 hover:bg-slate-50'
                  } ${!isOwner ? 'pointer-events-none opacity-70' : ''}`}
                >
                  <input
                    type="radio"
                    name="modalJoinPolicy"
                    checked={editJoinPolicy === 'invite_only'}
                    onChange={() => setEditJoinPolicy('invite_only')}
                    disabled={!isOwner}
                    className="mt-0.5 text-teal-700 focus:ring-teal-700"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 font-semibold text-slate-900">
                      <Lock className="w-3.5 h-3.5 text-slate-700" />
                      <span>Riêng tư (Chỉ khi được mời trực tiếp)</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Không cho phép nhập mã tự do; chỉ những đồng nghiệp được Trưởng nhóm gửi lời mời qua email mới có thể truy cập.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Vùng quản trị nâng cao dành riêng cho Trưởng nhóm */}
            {isOwner && (
              <div className="pt-3 border-t border-slate-200 space-y-3">
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wide block">
                  Tùy chọn Quản trị & Điều hành Nhóm
                </span>

                <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-amber-900 text-xs">Nhượng quyền Trưởng nhóm</p>
                    <p className="text-[11px] text-amber-700 mt-0.5">
                      Chuyển quyền quản trị nhóm cho một giảng viên khác trong kênh.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onTransferOwner}
                    className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs shrink-0 cursor-pointer transition-colors"
                  >
                    Nhượng quyền
                  </button>
                </div>

                <div className="p-3 bg-rose-50/60 border border-rose-200 rounded-xl flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-rose-900 text-xs">Giải tán nhóm học thuật</p>
                    <p className="text-[11px] text-rose-700 mt-0.5">
                      Xóa vĩnh viễn nhóm và toàn bộ lịch sử tin nhắn khỏi hệ thống.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onDisband}
                    className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs shrink-0 cursor-pointer transition-colors"
                  >
                    Giải tán
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2 text-xs">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold cursor-pointer transition-colors"
          >
            Đóng
          </button>
          {isOwner && (
            <button
              type="button"
              onClick={() => onSaveSettings(editName, editDept, editDesc, editJoinPolicy)}
              className="px-4 py-2 rounded-lg bg-[#008689] hover:bg-[#007073] text-white font-semibold cursor-pointer transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <Check className="w-4 h-4" />
              <span>Lưu cài đặt kênh</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// MODAL: SLACK AI SUMMARIZER (TỰ ĐỘNG TÓM TẮT CUỘC TRÒ CHUYỆN BẰNG QUANTA AI)
// ============================================================================
const AiSummarizeModal: React.FC<{
  group: QGroup;
  onClose: () => void;
}> = ({ group, onClose }) => {
  const msgs = group.messages || [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-slate-900/50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden p-6 space-y-4 animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-teal-700 flex items-center justify-center border border-slate-200">
              <Sparkles className="w-4 h-4 text-teal-700" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Tóm tắt nội dung trao đổi chuyên môn</h3>
              <p className="text-[10px] text-slate-500">Kênh #{group.name}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-3 text-xs leading-relaxed text-slate-700">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
            <h4 className="font-semibold text-slate-900">Tổng quan kênh trao đổi:</h4>
            <p className="text-slate-600">
              Kênh hiện có <strong>{group.memberCount || 2} thành viên</strong> đang tham gia. Đã ghi nhận tổng cộng <strong>{msgs.length} lượt trao đổi</strong> và tài liệu học thuật.
            </p>
          </div>

          <div className="space-y-1.5">
            <h4 className="font-semibold text-slate-900">Các nội dung trọng tâm đã thảo luận:</h4>
            <ul className="list-disc pl-5 space-y-1 text-slate-600">
              <li>Thống nhất sử dụng chung tài liệu học phần và các giáo trình cốt lõi để đối soát ngân hàng câu hỏi Bloom.</li>
              <li>Các giảng viên đã kết nối và phân bổ nội dung biên soạn ma trận đề thi trắc nghiệm.</li>
              <li>Hệ thống lưu vết minh chứng nguồn trang sách tự động phục vụ công tác kiểm định chất lượng học thuật.</li>
            </ul>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs cursor-pointer shadow-xs transition-colors"
          >
            Đã hiểu
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// MODAL: SLACK HUDDLE (AUDIO CALL)
// ============================================================================
const HuddleCallModal: React.FC<{
  group: QGroup;
  currentUser?: UserProfile | null;
  onClose: () => void;
}> = ({ group, currentUser, onClose }) => {
  const [isMuted, setIsMuted] = useState(false);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-slate-900/60 p-4"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 text-white rounded-2xl max-w-sm w-full border border-slate-800 shadow-2xl p-6 space-y-5 text-center animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 font-semibold text-xs border border-emerald-500/30">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            Huddle đang diễn ra
          </div>
          <h3 className="text-base font-bold text-white mt-2">#{group.name}</h3>
          <p className="text-xs text-slate-400">Phiên thảo luận nhanh giữa các giảng viên</p>
        </div>

        {/* Visualizer & Avatars */}
        <div className="flex items-center justify-center gap-3 py-4">
          <div className="relative">
            <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-base text-white">
              {initials(currentUser?.fullName || 'GV')}
            </div>
            <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 ring-2 ring-slate-900" />
          </div>

          <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-semibold text-slate-400">
            +{(group.memberCount || 2) - 1}
          </div>
        </div>

        {/* Call Controls */}
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => setIsMuted(!isMuted)}
            className={`w-11 h-11 rounded-xl flex items-center justify-center transition-colors cursor-pointer ${
              isMuted ? 'bg-rose-600 hover:bg-rose-700 text-white' : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
            }`}
            title={isMuted ? 'Bật mic' : 'Tắt mic'}
          >
            {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs flex items-center gap-2 cursor-pointer transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Rời Huddle</span>
          </button>
        </div>
      </div>
    </div>
  );
};
