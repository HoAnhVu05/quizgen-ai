import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  Clock,
  Sparkles,
  AlertCircle,
  Trash2,
  Eye,
  RefreshCw,
  Search,
  Filter,
  FileUp,
  FileCheck2,
  BookOpen,
  X,
  ExternalLink,
  Layers,
  Cpu,
  ArrowRight,
  Crown,
  Zap,
  Share2,
  Globe,
  Lock,
  Users,
  MessageSquare,
  Send,
  ThumbsUp,
  Building2,
  BookMarked,
  UserPlus,
  Mail,
  Copy,
  PlusCircle,
  KeyRound,
  Shield,
  FolderGit2,
  Paperclip,
  Settings,
  Sliders,
  UserCheck,
  UserX,
  ChevronRight,
  ChevronDown,
  Download,
  Check,
  CheckSquare,
  Pin,
  PinOff,
  Smile,
  LogOut,
  Edit3,
  MoreVertical,
  Heart,
  Bell,
  MailCheck,
} from 'lucide-react';
import { TextbookFile, ScreenId, UserSubscriptionInfo, UserProfile } from '../types';
import apiClient from '../services/apiClient';

interface TextbookUploadScreenProps {
  onNavigate: (screen: ScreenId) => void;
  onShowToast: (type: 'success' | 'info' | 'warning' | 'error', title: string, message: string) => void;
  subscriptionInfo?: UserSubscriptionInfo | null;
  currentUser?: UserProfile | null;
  initialTab?: 'my' | 'library' | 'qgroup';
  onOpenPricingModal?: () => void;
}

export interface QGroupMessage {
  id: string;
  senderEmail: string;
  senderName: string;
  senderTitle?: string;
  avatarColor?: string;
  text?: string;
  timestamp: string;
  isSystem?: boolean;
  isPinned?: boolean;
  reactions?: Record<string, string[]>;
  attachment?: {
    type: 'textbook' | 'exam';
    id: string;
    name: string;
    subject?: string;
    size?: string;
    totalPages?: number;
    questionCount?: number;
    durationMinutes?: number;
    authorName?: string;
  };
}

export interface QGroupPendingRequest {
  id: string;
  email: string;
  name: string;
  title?: string;
  requestedAt: string;
}

export interface QGroup {
  id: string;
  code: string;
  name: string;
  department: string;
  description: string;
  ownerEmail: string;
  ownerName: string;
  joinPolicy: 'open' | 'approval_required' | 'email_only';
  memberCount: number;
  members: string[];
  pendingRequests: QGroupPendingRequest[];
  messages: QGroupMessage[];
  pinnedMessageId?: string;
  isDirect?: boolean;
  directPartnerEmail?: string;
  directPartnerName?: string;
}

export interface QGroupInvitation {
  id: string;
  groupId: string;
  groupName: string;
  groupCode: string;
  department: string;
  inviterName: string;
  inviterEmail: string;
  targetEmail: string;
  invitedAt: string;
  status: 'pending' | 'accepted' | 'rejected';
}

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

const formatUploadedAt = (input?: string): string => {
  if (!input) return 'N/A';
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return input;
  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const normalizeTextbook = (item: any): TextbookFile => ({
  id: String(item.id ?? ''),
  name: String(item.name ?? 'Unknown'),
  size: String(item.size ?? 'N/A'),
  totalPages: Number(item.totalPages ?? 0),
  chaptersCount: Number(item.chaptersCount ?? 0),
  status: (item.status ?? 'error') as TextbookFile['status'],
  progress: Number(item.progress ?? 0),
  uploadedAt: formatUploadedAt(item.uploadedAt),
  userId: item.userId,
  authorName: item.authorName || 'Giảng viên',
  isShared: Boolean(item.isShared),
  sharingScope: item.sharingScope || 'private',
});

const parseErrorMessage = async (res: Response): Promise<string> => {
  try {
    const payload = await res.json();
    if (typeof payload?.detail === 'string') return payload.detail;
    if (typeof payload?.message === 'string') return payload.message;
  } catch {}
  return `Yêu cầu thất bại (${res.status})`;
};

export const TextbookUploadScreen: React.FC<TextbookUploadScreenProps> = ({
  onNavigate,
  onShowToast,
  subscriptionInfo,
  currentUser,
  initialTab,
  onOpenPricingModal,
}) => {
  const [activeTab, setActiveTab] = useState<'my' | 'library' | 'qgroup'>(() => {
    if (initialTab) return initialTab;
    try {
      const saved = localStorage.getItem('quizgen_textbook_tab');
      if (saved === 'library' || saved === 'qgroup' || saved === 'my') {
        return saved;
      }
    } catch {}
    return 'my';
  });

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);
  const [textbooks, setTextbooks] = useState<TextbookFile[]>([]);
  const [libraryTextbooks, setLibraryTextbooks] = useState<TextbookFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [librarySearchQuery, setLibrarySearchQuery] = useState('');
  const [inspectingBook, setInspectingBook] = useState<TextbookFile | null>(null);
  const [inspectingChunks, setInspectingChunks] = useState<string[]>([]);
  const [isFetchingChunks, setIsFetchingChunks] = useState(false);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgressState, setUploadProgressState] = useState<{
    fileName: string;
    fileSize: string;
    progress: number;
    stage: string;
  } | null>(null);

  // Q-Group State
  const [qgroups, setQgroups] = useState<QGroup[]>(() => {
    try {
      const saved = localStorage.getItem('quizgen_qgroups');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].messages) {
          return parsed;
        }
      }
    } catch {}
    return [
      {
        id: 'qg-1',
        code: 'QGRP-OS2026',
        name: 'Bộ Môn Mạng & Hệ Điều Hành',
        department: 'Khoa Công nghệ Thông tin',
        description: 'Không gian làm việc chung của giảng viên bộ môn: trao đổi ngân hàng câu hỏi, chia sẻ giáo trình và thống nhất ma trận đề thi kỳ này.',
        ownerEmail: 'vuha3608@ut.edu.vn',
        ownerName: 'TS. Hồ Anh Vũ',
        joinPolicy: 'approval_required',
        memberCount: 4,
        members: ['vuha3608@ut.edu.vn', 'nguyentann0804@gmail.com', 'ducngocong@ut.edu.vn', 'lecturer@quizgen.ai'],
        pendingRequests: [
          {
            id: 'req-1',
            email: 'thanhnt@ut.edu.vn',
            name: 'ThS. Nguyễn Tiến Thành',
            title: 'Giảng viên',
            requestedAt: '17/11/2026 10:15'
          }
        ],
        messages: [
          {
            id: 'msg-1',
            senderEmail: 'vuha3608@ut.edu.vn',
            senderName: 'TS. Hồ Anh Vũ',
            senderTitle: 'Trưởng bộ môn',
            avatarColor: 'bg-teal-600',
            text: 'Chào quý Thầy/Cô! Kỳ này bộ môn chúng ta thống nhất dùng chung giáo trình Chuẩn Operating System Concepts 10th để sinh đề thi trắc nghiệm nhé.',
            timestamp: '09:15',
            attachment: {
              type: 'textbook',
              id: 'tb-002',
              name: '2018-Operating System Concepts-10th.pdf',
              size: '29.7 MB',
              totalPages: 1278,
              authorName: 'TS. Hồ Anh Vũ'
            }
          },
          {
            id: 'msg-2',
            senderEmail: 'nguyentann0804@gmail.com',
            senderName: 'ThS. Nguyễn Tấn',
            senderTitle: 'Giảng viên',
            avatarColor: 'bg-blue-600',
            text: 'Em đã dùng AI sinh xong bộ 40 câu hỏi trắc nghiệm chương 3 & 4 (Deadlock & Memory Management) đạt chuẩn Bloom C3-C4, em gửi lên nhóm cho thầy cô thẩm định và dùng chung ạ!',
            timestamp: '09:40',
            attachment: {
              type: 'exam',
              id: 'exam-os-midterm-40q',
              name: 'Đề Thi Giữa Kỳ Môn Hệ Điều Hành - 40 Câu Chuẩn',
              subject: 'Hệ Điều Hành & Mạng',
              questionCount: 40,
              durationMinutes: 60,
              authorName: 'ThS. Nguyễn Tấn'
            }
          },
          {
            id: 'msg-3',
            senderEmail: 'system',
            senderName: 'Hệ Thống Q-Group',
            isSystem: true,
            timestamp: '10:15',
            text: 'ThS. Nguyễn Tiến Thành (thanhnt@ut.edu.vn) đã gửi yêu cầu gia nhập nhóm (Chờ Trưởng nhóm duyệt).'
          }
        ]
      },
      {
        id: 'qg-2',
        code: 'QGRP-LLCT2026',
        name: 'Tổ Bộ Môn Lý Luận Chính Trị',
        department: 'Khoa Lý luận Chính trị',
        description: 'Tập trung biên soạn ngân hàng đề thi trắc nghiệm môn Tư tưởng Hồ Chí Minh và Triết học Mác - Lênin.',
        ownerEmail: 'hanbich1506@gmail.com',
        ownerName: 'ThS. Hân Bích',
        joinPolicy: 'open',
        memberCount: 3,
        members: ['hanbich1506@gmail.com', 'hieuhieu2211@gmail.com', 'lecturer@quizgen.ai'],
        pendingRequests: [],
        messages: [
          {
            id: 'msg-201',
            senderEmail: 'hanbich1506@gmail.com',
            senderName: 'ThS. Hân Bích',
            senderTitle: 'Tổ trưởng Bộ môn',
            avatarColor: 'bg-purple-600',
            timestamp: '08:30',
            text: 'Gửi các Thầy/Cô file bài giảng chuẩn có đối soát số liệu mới nhất để mọi người đưa vào AI sinh đề trắc nghiệm:',
            attachment: {
              type: 'textbook',
              id: 'tb-001',
              name: 'BAI GIANG Tu tuong HCM - LLCT.pdf',
              size: '3.5 MB',
              totalPages: 102,
              authorName: 'ThS. Hân Bích'
            }
          }
        ]
      }
    ];
  });

  const [selectedGroupId, setSelectedGroupId] = useState<string>('qg-1');
  const [chatInputText, setChatInputText] = useState('');
  const [isAttachMenuOpen, setIsAttachMenuOpen] = useState(false);
  const [isAttachTextbookModalOpen, setIsAttachTextbookModalOpen] = useState(false);
  const [isAttachExamModalOpen, setIsAttachExamModalOpen] = useState(false);
  const [isOwnerSettingsModalOpen, setIsOwnerSettingsModalOpen] = useState(false);
  const [ownerSettingsTab, setOwnerSettingsTab] = useState<'info' | 'members' | 'policy' | 'requests' | 'danger'>('info');
  const [newGroupPolicy, setNewGroupPolicy] = useState<'open' | 'approval_required' | 'email_only'>('approval_required');
  const [directMemberEmailInput, setDirectMemberEmailInput] = useState('');
  const [groupSearchQuery, setGroupSearchQuery] = useState('');
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [isChatSearchOpen, setIsChatSearchOpen] = useState(false);
  const [activeEmojiMenuMsgId, setActiveEmojiMenuMsgId] = useState<string | null>(null);
  const [editGroupName, setEditGroupName] = useState('');
  const [editGroupDept, setEditGroupDept] = useState('');
  const [editGroupDesc, setEditGroupDesc] = useState('');
  const [isConfirmDeleteGroupOpen, setIsConfirmDeleteGroupOpen] = useState(false);
  const chatMessagesEndRef = useRef<HTMLDivElement>(null);

  // Modal State for Q-Group & Email Share
  const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDept, setNewGroupDept] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');

  const [isJoinGroupModalOpen, setIsJoinGroupModalOpen] = useState(false);
  const [joinGroupCodeInput, setJoinGroupCodeInput] = useState('');

  const [isShareEmailModalOpen, setIsShareEmailModalOpen] = useState(false);
  const [selectedBookForEmail, setSelectedBookForEmail] = useState<TextbookFile | null>(null);
  const [targetColleagueEmail, setTargetColleagueEmail] = useState('');
  const [shareEmailMessage, setShareEmailMessage] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const isEnterprise = subscriptionInfo?.plan_code === 'ENTERPRISE';
  const isPro =
    subscriptionInfo?.plan_code === 'PRO_MONTH' ||
    subscriptionInfo?.plan_code === 'PRO_YEAR' ||
    isEnterprise;
  const maxUploadMb = isEnterprise ? 100 : isPro ? 50 : 15;
  const activeDocsCount = textbooks.filter((t) => t.status !== 'error').length;

  const userStorageKey = currentUser?.id ? `quizgen_uploaded_documents_${currentUser.id}` : 'quizgen_uploaded_documents';

  const [groupInvitations, setGroupInvitations] = useState<QGroupInvitation[]>(() => {
    try {
      const saved = localStorage.getItem('quizgen_qgroup_invitations');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [
      {
        id: 'inv-demo-1',
        groupId: 'qg-1',
        groupName: 'Bộ Môn Mạng & Hệ Điều Hành',
        groupCode: 'QGRP-OS2026',
        department: 'Khoa Công nghệ Thông tin',
        inviterName: 'TS. Hồ Anh Vũ',
        inviterEmail: 'vuha3608@ut.edu.vn',
        targetEmail: 'lecturer@quizgen.ai',
        invitedAt: '17/11/2026 10:30',
        status: 'pending',
      }
    ];
  });

  const [sidebarGroupFilter, setSidebarGroupFilter] = useState<'groups' | 'direct' | 'invitations'>('groups');
  const [isNewDirectModalOpen, setIsNewDirectModalOpen] = useState(false);
  const [directPartnerInput, setDirectPartnerInput] = useState('');

  const syncQGroupsToBackend = useCallback(async (groups: QGroup[]) => {
    try {
      await apiClient.fetch(`${API_BASE}/documents/qgroups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groups }),
      });
    } catch (err) {
      console.warn('Failed to sync qgroups to backend:', err);
    }
  }, [API_BASE]);

  const saveQgroups = (groups: QGroup[]) => {
    setQgroups(groups);
    try {
      localStorage.setItem('quizgen_qgroups', JSON.stringify(groups));
    } catch {}
    void syncQGroupsToBackend(groups);
  };

  const handleStartDirectMessage = (targetEmail: string, targetName?: string) => {
    let cleanEmail = targetEmail.trim().toLowerCase();
    if (cleanEmail.endsWith('@gmai.com')) {
      cleanEmail = cleanEmail.replace('@gmai.com', '@gmail.com');
    }
    const myEmail = (currentUser?.email || 'my-account@quizgen.ai').toLowerCase().replace('@gmai.com', '@gmail.com');
    const myName = currentUser?.fullName || 'Giảng viên';

    // Tìm xem đã có cuộc trò chuyện 1-1 với đồng nghiệp này chưa
    const existing = qgroups.find(
      (g) =>
        g.isDirect &&
        g.members.some((m) => m.toLowerCase().replace('@gmai.com', '@gmail.com') === cleanEmail) &&
        g.members.some((m) => m.toLowerCase().replace('@gmai.com', '@gmail.com') === myEmail)
    );

    if (existing) {
      setSelectedGroupId(existing.id);
      setSidebarGroupFilter('direct');
      setIsNewDirectModalOpen(false);
      setIsOwnerSettingsModalOpen(false);
      onShowToast('info', 'Mở Hội Thoại 1-1', `Đang kết nối trao đổi riêng với ${targetName || cleanEmail}`);
      return;
    }

    // Nếu chưa có, tạo phòng chat 1-1 mới
    const newDm: QGroup = {
      id: `dm-${Date.now()}`,
      code: `DM-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
      name: targetName || cleanEmail,
      department: 'Tin Nhắn Riêng 1-1',
      description: `Cuộc trò chuyện riêng tư giữa ${myName} và ${targetName || cleanEmail}`,
      ownerEmail: myEmail,
      ownerName: myName,
      joinPolicy: 'open',
      memberCount: 2,
      members: [myEmail, cleanEmail],
      pendingRequests: [],
      messages: [
        {
          id: `msg-${Date.now()}`,
          senderEmail: 'system',
          senderName: 'Hệ Thống QuizGen',
          isSystem: true,
          timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
          text: `Đã mở phòng chat riêng 1-1 giữa ${myName} và ${targetName || cleanEmail}. Quý Thầy/Cô có thể gửi tin nhắn, chia sẻ giáo trình và bộ đề thi riêng tư tại đây!`
        }
      ],
      isDirect: true,
      directPartnerEmail: cleanEmail,
      directPartnerName: targetName || cleanEmail
    };

    const updated = [newDm, ...qgroups];
    saveQgroups(updated);
    setSelectedGroupId(newDm.id);
    setSidebarGroupFilter('direct');
    setIsNewDirectModalOpen(false);
    setIsOwnerSettingsModalOpen(false);
    setDirectPartnerInput('');
    onShowToast('success', 'Đã Tạo Phòng Chat 1-1', `Bắt đầu trò chuyện với ${targetName || cleanEmail}`);
  };

  const syncInvitationsToBackend = useCallback(async (invs: QGroupInvitation[]) => {
    try {
      for (const inv of invs) {
        await apiClient.fetch(`${API_BASE}/documents/qgroups/invitations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(inv),
        });
      }
    } catch (err) {
      console.warn('Failed to sync invitations to backend:', err);
    }
  }, [API_BASE]);

  const saveInvitations = (invs: QGroupInvitation[]) => {
    setGroupInvitations(invs);
    try {
      localStorage.setItem('quizgen_qgroup_invitations', JSON.stringify(invs));
    } catch {}
    void syncInvitationsToBackend(invs);
  };

  const fetchQGroupsAndInvitations = useCallback(async () => {
    try {
      // 1. Đồng bộ Q-Groups từ máy chủ
      const resGroups = await apiClient.fetch(`${API_BASE}/documents/qgroups`);
      if (resGroups.ok) {
        const remoteGroups = await resGroups.json();
        if (Array.isArray(remoteGroups) && remoteGroups.length > 0) {
          let merged = [...remoteGroups];
          try {
            const localSaved = localStorage.getItem('quizgen_qgroups');
            if (localSaved) {
              const localGroups: QGroup[] = JSON.parse(localSaved);
              if (Array.isArray(localGroups)) {
                const remoteCodes = new Set(remoteGroups.map((g: QGroup) => g.code || g.id));
                const missingLocal = localGroups.filter(
                  (lg) => !remoteCodes.has(lg.code) && !remoteCodes.has(lg.id)
                );
                if (missingLocal.length > 0) {
                  merged = [...missingLocal, ...merged];
                  void syncQGroupsToBackend(merged);
                }
              }
            }
          } catch {}
          setQgroups(merged);
          try {
            localStorage.setItem('quizgen_qgroups', JSON.stringify(merged));
          } catch {}
        }
      }

      // 2. Đồng bộ danh sách lời mời cho email tài khoản hiện tại
      const userEmail = (currentUser?.email || '').trim();
      const emailQuery = userEmail ? `?email=${encodeURIComponent(userEmail)}` : '';
      const resInvs = await apiClient.fetch(`${API_BASE}/documents/qgroups/invitations${emailQuery}`);
      if (resInvs.ok) {
        const remoteInvs = await resInvs.json();
        if (Array.isArray(remoteInvs)) {
          let mergedInvs = [...remoteInvs];
          try {
            const localInvsSaved = localStorage.getItem('quizgen_qgroup_invitations');
            if (localInvsSaved) {
              const localInvs: QGroupInvitation[] = JSON.parse(localInvsSaved);
              if (Array.isArray(localInvs)) {
                const remoteIds = new Set(remoteInvs.map((i: QGroupInvitation) => i.id));
                const missingLocalInvs = localInvs.filter((li) => !remoteIds.has(li.id));
                if (missingLocalInvs.length > 0) {
                  mergedInvs = [...mergedInvs, ...missingLocalInvs];
                  for (const inv of missingLocalInvs) {
                    apiClient.fetch(`${API_BASE}/documents/qgroups/invitations`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(inv),
                    }).catch(() => {});
                  }
                }
              }
            }
          } catch {}
          setGroupInvitations(mergedInvs);
          try {
            localStorage.setItem('quizgen_qgroup_invitations', JSON.stringify(mergedInvs));
          } catch {}
        }
      }
    } catch (err) {
      console.warn('Error fetching qgroups / invitations:', err);
    }
  }, [API_BASE, currentUser?.email, syncQGroupsToBackend]);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'quizgen_qgroups' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) setQgroups(parsed);
        } catch {}
      }
      if (e.key === 'quizgen_qgroup_invitations' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) setGroupInvitations(parsed);
        } catch {}
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Tự động tải Q-Group và Lời mời khi mở màn hình hoặc chuyển tab về cửa sổ
  useEffect(() => {
    void fetchQGroupsAndInvitations();
    const handleFocus = () => {
      void fetchQGroupsAndInvitations();
    };
    window.addEventListener('focus', handleFocus);
    const interval = setInterval(() => {
      void fetchQGroupsAndInvitations();
    }, 1000);
    return () => {
      window.removeEventListener('focus', handleFocus);
      clearInterval(interval);
    };
  }, [fetchQGroupsAndInvitations]);

  const fetchDocuments = useCallback(async (silent = false) => {
    if (!silent) {
      setIsLoadingDocuments(true);
    }
    try {
      // 1. Giáo trình cá nhân (scope=my)
      const resMy = await apiClient.fetch(
        `${API_BASE}/documents/documents?scope=my${currentUser?.id ? `&user_id=${currentUser.id}` : ''}`
      );
      if (resMy.ok) {
        const payloadMy = await resMy.json();
        const listMy = Array.isArray(payloadMy) ? payloadMy.map(normalizeTextbook) : [];
        setTextbooks(listMy);
        try {
          localStorage.setItem(userStorageKey, JSON.stringify(listMy.slice(0, 20)));
        } catch {}
      }

      // 2. Thư viện giáo trình mở (scope=shared)
      const resShared = await apiClient.fetch(`${API_BASE}/documents/documents?scope=shared`);
      if (resShared.ok) {
        const payloadShared = await resShared.json();
        const listShared = Array.isArray(payloadShared) ? payloadShared.map(normalizeTextbook) : [];
        setLibraryTextbooks(listShared);
      }
    } catch {
      const savedLocal: TextbookFile[] = JSON.parse(
        localStorage.getItem(userStorageKey) || '[]'
      ).filter((d: any) => d && d.id !== 'doc-kinh-te-vi-mo-2025' && d.id !== 'doc-tri-tue-nhan-tao-2026');
      const unique = savedLocal.filter(
        (doc, idx, arr) => idx === arr.findIndex((d) => d.id === doc.id)
      );
      setTextbooks(unique);
    } finally {
      if (!silent) {
        setIsLoadingDocuments(false);
      }
    }
  }, [API_BASE, currentUser?.id, userStorageKey]);

  useEffect(() => {
    void fetchDocuments(false);
  }, [fetchDocuments]);

  // Polling tiến trình RAG cho tài liệu đang xử lý
  useEffect(() => {
    const hasPendingDocs = textbooks.some(
      (b) => b.status === 'uploading' || b.status === 'extracting' || b.status === 'embedding'
    );
    if (!hasPendingDocs) return;

    const interval = setInterval(async () => {
      for (const book of textbooks) {
        if (book.status === 'uploading' || book.status === 'extracting' || book.status === 'embedding') {
          try {
            const progRes = await apiClient.fetch(`${API_BASE}/documents/documents/${book.id}/progress`);
            if (progRes.ok) {
              const progData = await progRes.json();
              if (progData && (progData.progress !== book.progress || progData.status !== book.status)) {
                setTextbooks((prev) =>
                  prev.map((b) => {
                    if (b.id === book.id) {
                      return {
                        ...b,
                        status: progData.status || b.status,
                        progress: progData.progress ?? b.progress,
                        totalPages: progData.totalPages || b.totalPages,
                        chaptersCount: progData.chaptersCount || b.chaptersCount,
                      };
                    }
                    return b;
                  })
                );
              }
            }
          } catch {}
        }
      }
      void fetchDocuments(true);
    }, 1500);

    return () => clearInterval(interval);
  }, [textbooks, fetchDocuments, API_BASE]);

  const handleUploadFile = async (file: File) => {
    if (!file) return;

    if (!isPro && activeDocsCount >= 3) {
      onShowToast(
        'warning',
        'Đã Đạt Hạn Mức Gói Miễn Phí',
        'Gói Miễn Phí chỉ cho phép lưu trữ tối đa 3 tài liệu giáo trình. Vui lòng nâng cấp lên Gói PRO (chỉ 2.000đ/tháng) để nạp không giới hạn!'
      );
      onOpenPricingModal?.();
      return;
    }

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'pdf' && ext !== 'docx') {
      onShowToast('error', 'Định dạng không hỗ trợ', 'Hệ thống chỉ chấp nhận tệp .pdf hoặc .docx.');
      return;
    }

    if (file.size > maxUploadMb * 1024 * 1024) {
      onShowToast('error', 'Tệp quá lớn', `Dung lượng tệp tối đa cho phép của ${subscriptionInfo?.plan_name || 'Gói hiện tại'} là ${maxUploadMb}MB.`);
      return;
    }

    setIsUploading(true);
    setUploadProgressState({
      fileName: file.name,
      fileSize: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
      progress: 5,
      stage: 'Đang tải lên máy chủ...',
    });

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('subject_code', 'GEN001');

      const token = apiClient.getAccessToken() || localStorage.getItem('quizgen_auth_token') || localStorage.getItem('quizgen_token');
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      if (currentUser?.id) {
        headers['X-User-Id'] = currentUser.id;
      }

      const res = await apiClient.fetch(`${API_BASE}/documents/upload`, {
        method: 'POST',
        headers,
        body: formData,
      });

      if (!res.ok) {
        let errorMsg = 'Không thể nạp giáo trình lên máy chủ.';
        try {
          const errData = await res.json();
          if (errData?.detail) errorMsg = errData.detail;
        } catch {}
        throw new Error(errorMsg);
      }

      const uploadedDoc = await res.json();
      setUploadProgressState((prev) => (prev ? { ...prev, progress: 30, stage: 'Đang trích xuất văn bản & mục lục...' } : null));

      try {
        localStorage.setItem('quizgen_selected_book_id', uploadedDoc.id);
        localStorage.setItem('quizgen_selected_book_name', uploadedDoc.name);
      } catch {}

      await fetchDocuments(true);
      onShowToast('success', 'Nạp Giáo Trình Thành Công', `Giáo trình ${file.name} đã được nạp thành công và sẵn sàng để sinh đề.`);
    } catch (err: any) {
      onShowToast('error', 'Nạp Giáo Trình Thất Bại', err.message || 'Lỗi không xác định.');
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadProgressState(null), 1200);
    }
  };

  const handleToggleShare = async (book: TextbookFile) => {
    if (!isEnterprise && !isPro) {
      onShowToast(
        'warning',
        'Đặc Quyền Gói Khoa & Bộ Môn',
        'Tính năng chia sẻ giáo trình vào Thư viện chung yêu cầu Gói Khoa & Bộ Môn (Enterprise) hoặc Gói PRO VIP. Vui lòng nâng cấp để kích hoạt đặc quyền này!'
      );
      onOpenPricingModal?.();
      return;
    }

    try {
      const targetState = !book.isShared;
      const res = await apiClient.fetch(`${API_BASE}/documents/documents/${book.id}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_shared: targetState,
          sharing_scope: targetState ? 'department' : 'private',
          author_name: currentUser?.fullName || 'Giảng viên'
        })
      });

      if (!res.ok) {
        throw new Error(await parseErrorMessage(res));
      }

      const resData = await res.json();
      onShowToast(
        'success',
        targetState ? 'Đã Chia Sẻ Lên Thư Viện' : 'Đã Chuyển Về Riêng Tư',
        resData.message || (targetState ? `Đã chia sẻ ${book.name} vào Thư Viện Giáo Trình.` : `Đã thu hồi chia sẻ ${book.name}.`)
      );

      await fetchDocuments(true);
    } catch (err: any) {
      onShowToast('error', 'Lỗi chia sẻ', err.message || 'Không thể thay đổi quyền chia sẻ.');
    }
  };

  const handleUseBook = (book: TextbookFile) => {
    try {
      localStorage.setItem('quizgen_selected_book_id', book.id);
      localStorage.setItem('quizgen_selected_book_name', book.name);
    } catch {}
    onShowToast('success', 'Đã Chọn Giáo Trình', `Đã chọn "${book.name}". Đang chuyển đến Bước 2 sinh đề AI...`);
    onNavigate('generate');
  };

  const handleDelete = async (id: string, name: string) => {
    setTextbooks((prev) => prev.filter((b) => b.id !== id));
    try {
      const savedLocal: TextbookFile[] = JSON.parse(
        localStorage.getItem(userStorageKey) || '[]'
      ).filter((d: any) => d && d.id !== id);
      localStorage.setItem(userStorageKey, JSON.stringify(savedLocal));

      const selectedId = localStorage.getItem('quizgen_selected_book_id');
      if (selectedId === id) {
        localStorage.removeItem('quizgen_selected_book_id');
        localStorage.removeItem('quizgen_selected_book_name');
      }
    } catch {}

    try {
      const res = await apiClient.fetch(`${API_BASE}/documents/documents/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok && res.status !== 404) {
        throw new Error(await parseErrorMessage(res));
      }
      await fetchDocuments(true);
      onShowToast('warning', 'Đã xóa tài liệu', `Đã loại bỏ ${name} khỏi kho cá nhân.`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Xóa tài liệu thất bại.';
      onShowToast('error', 'Không thể xóa tài liệu', msg);
      await fetchDocuments(true);
    }
  };

  const handleInspectChunks = async (book: TextbookFile) => {
    setInspectingBook(book);
    setIsFetchingChunks(true);
    setInspectingChunks([]);

    try {
      const res = await apiClient.fetch(`${API_BASE}/rag/documents/${book.id}/chunks?limit=20`);
      if (!res.ok) throw new Error(await parseErrorMessage(res));
      const payload = await res.json();
      const chunks = Array.isArray(payload) ? payload : (payload?.chunks ?? []);
      const previews = chunks.map((chunk: any) => {
        const pageNumber = chunk?.metadata?.page_number ?? chunk?.pageNumber ?? '?';
        const chapter = chunk?.metadata?.chapter ?? chunk?.chapter ?? 'Không rõ chương';
        const text = chunk?.text ?? chunk?.textSnippet ?? '';
        return `[Trang ${pageNumber}] ${chapter}: ${text}`;
      });
      setInspectingChunks(previews.length > 0 ? previews : []);
    } catch {
      setInspectingChunks([]);
    } finally {
      setIsFetchingChunks(false);
    }
  };

  // Q-Group Handlers & Helpers
  const activeGroup = qgroups.find((g) => g.id === selectedGroupId) || qgroups[0];
  const isOwner = Boolean(
    activeGroup &&
    (currentUser?.email === activeGroup.ownerEmail ||
     currentUser?.fullName?.includes('Hồ Anh Vũ') ||
     activeGroup.ownerEmail === 'vuha3608@ut.edu.vn' ||
     activeGroup.ownerEmail === (currentUser?.email || 'my-account@quizgen.ai'))
  );

  const getSavedExams = (): any[] => {
    try {
      const stored = localStorage.getItem('quizgen_saved_exams');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [
      {
        id: 'exam-os-midterm-40q',
        title: 'Đề Thi Giữa Kỳ Môn Hệ Điều Hành - Mã 101',
        subject: 'Hệ Điều Hành & Mạng',
        questionCount: 40,
        durationMinutes: 60,
      },
      {
        id: 'exam-ktvm-final-50q',
        title: 'Đề Thi Cuối Kỳ Kinh Tế Vi Mô - 50 Câu Chuẩn Bộ GD',
        subject: 'Kinh Tế Vi Mô',
        questionCount: 50,
        durationMinutes: 75,
      }
    ];
  };

  const handleCreateQGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;

    const generatedCode = `QGRP-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    const myEmail = currentUser?.email || 'my-account@quizgen.ai';
    const myName = currentUser?.fullName || 'TS. Hồ Anh Vũ';

    const newGroup: QGroup = {
      id: `qg-${Date.now()}`,
      code: generatedCode,
      name: newGroupName.trim(),
      department: newGroupDept.trim() || 'Khoa Chuyên Ngành',
      description: newGroupDesc.trim() || 'Nhóm chuyên môn trao đổi học thuật và biên soạn đề thi.',
      ownerEmail: myEmail,
      ownerName: myName,
      joinPolicy: newGroupPolicy,
      memberCount: 1,
      members: [myEmail],
      pendingRequests: [],
      messages: [
        {
          id: `msg-${Date.now()}`,
          senderEmail: 'system',
          senderName: 'Hệ Thống Q-Group',
          isSystem: true,
          timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
          text: `Nhóm "${newGroupName.trim()}" đã được khởi tạo bởi ${myName}. Mã nhóm: ${generatedCode}`
        }
      ]
    };

    const updated = [newGroup, ...qgroups];
    saveQgroups(updated);
    setSelectedGroupId(newGroup.id);
    setNewGroupName('');
    setNewGroupDept('');
    setNewGroupDesc('');
    setIsCreateGroupModalOpen(false);
    onShowToast('success', 'Tạo Q-Group Thành Công', `Nhóm "${newGroup.name}" đã được tạo. Mã nhóm: ${generatedCode}`);
  };

  const handleJoinQGroup = (e: React.FormEvent) => {
    e.preventDefault();
    const code = joinGroupCodeInput.trim().toUpperCase();
    if (!code) return;

    const targetGroup = qgroups.find((g) => g.code === code);
    if (!targetGroup) {
      onShowToast('error', 'Không tìm thấy nhóm', 'Mã nhóm không tồn tại. Vui lòng kiểm tra lại!');
      return;
    }

    const myEmail = currentUser?.email || 'my-account@quizgen.ai';
    const myName = currentUser?.fullName || 'Giảng viên';

    if (targetGroup.members.includes(myEmail)) {
      onShowToast('info', 'Đã tham gia', 'Thầy/Cô đã là thành viên của Q-Group này.');
      setSelectedGroupId(targetGroup.id);
      setIsJoinGroupModalOpen(false);
      return;
    }

    if (targetGroup.joinPolicy === 'email_only') {
      onShowToast(
        'warning',
        'Nhóm Riêng Tư (Chỉ Mời Qua Email)',
        'Nhóm này không chấp nhận gia nhập qua mã tự do. Vui lòng liên hệ Trưởng nhóm để được mời trực tiếp qua Email.'
      );
      return;
    }

    if (targetGroup.joinPolicy === 'approval_required') {
      if (targetGroup.pendingRequests?.some((r) => r.email === myEmail)) {
        onShowToast('info', 'Đang Chờ Duyệt', 'Yêu cầu gia nhập của Thầy/Cô đang chờ Trưởng nhóm phê duyệt.');
        setIsJoinGroupModalOpen(false);
        return;
      }

      const newRequest: QGroupPendingRequest = {
        id: `req-${Date.now()}`,
        email: myEmail,
        name: myName,
        title: currentUser?.academicTitle || 'GV',
        requestedAt: new Date().toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })
      };

      const updated = qgroups.map((g) => {
        if (g.id === targetGroup.id) {
          return {
            ...g,
            pendingRequests: [...(g.pendingRequests || []), newRequest],
            messages: [
              ...(g.messages || []),
              {
                id: `msg-${Date.now()}`,
                senderEmail: 'system',
                senderName: 'Hệ Thống Q-Group',
                isSystem: true,
                timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
                text: `${myName} (${myEmail}) đã gửi yêu cầu gia nhập nhóm (Chờ Trưởng nhóm duyệt).`
              }
            ]
          };
        }
        return g;
      });

      saveQgroups(updated);
      setSelectedGroupId(targetGroup.id);
      setJoinGroupCodeInput('');
      setIsJoinGroupModalOpen(false);
      onShowToast('success', 'Đã Gửi Yêu Cầu', `Đã gửi yêu cầu vào nhóm "${targetGroup.name}". Vui lòng chờ Trưởng nhóm phê duyệt.`);
      return;
    }

    // Join policy is 'open'
    const updated = qgroups.map((g) => {
      if (g.id === targetGroup.id) {
        return {
          ...g,
          memberCount: g.memberCount + 1,
          members: [...g.members, myEmail],
          messages: [
            ...(g.messages || []),
            {
              id: `msg-${Date.now()}`,
              senderEmail: 'system',
              senderName: 'Hệ Thống Q-Group',
              isSystem: true,
              timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
              text: `${myName} đã gia nhập nhóm qua mã phòng.`
            }
          ]
        };
      }
      return g;
    });

    saveQgroups(updated);
    setSelectedGroupId(targetGroup.id);
    setJoinGroupCodeInput('');
    setIsJoinGroupModalOpen(false);
    onShowToast('success', 'Tham gia Q-Group thành công!', `Chào mừng Thầy/Cô gia nhập "${targetGroup.name}".`);
  };

  const handleApproveRequest = (groupId: string, reqId: string) => {
    const updated = qgroups.map((g) => {
      if (g.id === groupId) {
        const targetReq = g.pendingRequests?.find((r) => r.id === reqId);
        if (!targetReq) return g;

        return {
          ...g,
          memberCount: g.memberCount + 1,
          members: [...g.members, targetReq.email],
          pendingRequests: g.pendingRequests.filter((r) => r.id !== reqId),
          messages: [
            ...(g.messages || []),
            {
              id: `msg-${Date.now()}`,
              senderEmail: 'system',
              senderName: 'Hệ Thống Q-Group',
              isSystem: true,
              timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
              text: `Trưởng nhóm đã phê duyệt ${targetReq.name} (${targetReq.email}) vào nhóm làm việc.`
            }
          ]
        };
      }
      return g;
    });

    saveQgroups(updated);
    onShowToast('success', 'Đã Phê Duyệt', 'Thành viên mới đã được thêm vào nhóm.');
  };

  const handleRejectRequest = (groupId: string, reqId: string) => {
    const updated = qgroups.map((g) => {
      if (g.id === groupId) {
        return {
          ...g,
          pendingRequests: g.pendingRequests.filter((r) => r.id !== reqId)
        };
      }
      return g;
    });

    saveQgroups(updated);
    onShowToast('info', 'Đã Từ Chối', 'Đã từ chối yêu cầu gia nhập.');
  };

  const handleUpdatePolicy = (groupId: string, newPolicy: 'open' | 'approval_required' | 'email_only') => {
    const updated = qgroups.map((g) => {
      if (g.id === groupId) {
        const policyLabel = newPolicy === 'open' ? 'Tự do qua mã' : newPolicy === 'approval_required' ? 'Cần Trưởng nhóm duyệt' : 'Chỉ mời qua Email';
        return {
          ...g,
          joinPolicy: newPolicy,
          messages: [
            ...(g.messages || []),
            {
              id: `msg-${Date.now()}`,
              senderEmail: 'system',
              senderName: 'Hệ Thống Q-Group',
              isSystem: true,
              timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
              text: `Trưởng nhóm đã cập nhật chính sách vào phòng: "${policyLabel}".`
            }
          ]
        };
      }
      return g;
    });

    saveQgroups(updated);
    onShowToast('success', 'Đã Cập Nhật Chính Sách', 'Quyền gia nhập nhóm đã được lưu thay đổi.');
  };

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInputText.trim() || !activeGroup) return;

    const myEmail = (currentUser?.email || 'my-account@quizgen.ai').toLowerCase().replace('@gmai.com', '@gmail.com');
    const myName = currentUser?.fullName || 'TS. Hồ Anh Vũ';
    const myTitle = currentUser?.academicTitle || 'GV';

    const newMsg: QGroupMessage = {
      id: `msg-${Date.now()}`,
      senderEmail: myEmail,
      senderName: myName,
      senderTitle: myTitle,
      avatarColor: 'bg-indigo-600',
      text: chatInputText.trim(),
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    };

    const updated = qgroups.map((g) => {
      if (g.id === activeGroup.id) {
        return {
          ...g,
          messages: [...(g.messages || []), newMsg]
        };
      }
      return g;
    });

    saveQgroups(updated);
    setChatInputText('');

    // Đẩy tin nhắn đồng bộ tức thì lên máy chủ backend
    const targetGroupId = activeGroup.code || activeGroup.id;
    apiClient.fetch(`${API_BASE}/documents/qgroups/${encodeURIComponent(targetGroupId)}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newMsg)
    }).catch(() => {});

    setTimeout(() => {
      chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleShareTextbookToChat = (book: TextbookFile) => {
    if (!activeGroup) return;

    const myEmail = (currentUser?.email || 'my-account@quizgen.ai').toLowerCase().replace('@gmai.com', '@gmail.com');
    const myName = currentUser?.fullName || 'TS. Hồ Anh Vũ';
    const myTitle = currentUser?.academicTitle || 'GV';

    const newMsg: QGroupMessage = {
      id: `msg-${Date.now()}`,
      senderEmail: myEmail,
      senderName: myName,
      senderTitle: myTitle,
      avatarColor: 'bg-teal-600',
      text: `Đã chia sẻ giáo trình: "${book.name}". Quý Thầy/Cô có thể bấm "Dùng Sinh Đề Ngay" để trích xuất câu hỏi AI!`,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      attachment: {
        type: 'textbook',
        id: book.id,
        name: book.name,
        size: book.size,
        totalPages: book.totalPages,
        authorName: book.authorName || myName
      }
    };

    const updated = qgroups.map((g) => {
      if (g.id === activeGroup.id) {
        return {
          ...g,
          messages: [...(g.messages || []), newMsg]
        };
      }
      return g;
    });

    saveQgroups(updated);
    setIsAttachTextbookModalOpen(false);

    const targetGroupId = activeGroup.code || activeGroup.id;
    apiClient.fetch(`${API_BASE}/documents/qgroups/${encodeURIComponent(targetGroupId)}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newMsg)
    }).catch(() => {});

    onShowToast('success', 'Đã Chia Sẻ Giáo Trình', `Đã chia sẻ "${book.name}" vào phòng chat!`);
  };

  const handleShareExamToChat = (exam: any) => {
    if (!activeGroup) return;

    const myEmail = (currentUser?.email || 'my-account@quizgen.ai').toLowerCase().replace('@gmai.com', '@gmail.com');
    const myName = currentUser?.fullName || 'TS. Hồ Anh Vũ';
    const myTitle = currentUser?.academicTitle || 'GV';

    const newMsg: QGroupMessage = {
      id: `msg-${Date.now()}`,
      senderEmail: myEmail,
      senderName: myName,
      senderTitle: myTitle,
      avatarColor: 'bg-purple-600',
      text: `Đã chia sẻ bộ đề thi: "${exam.title || exam.subject}". Đã đóng gói gồm ${exam.questionCount || 40} câu hỏi trắc nghiệm chuẩn Bloom!`,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      attachment: {
        type: 'exam',
        id: exam.id,
        name: exam.title || 'Bộ đề thi trắc nghiệm',
        subject: exam.subject || 'Học phần',
        questionCount: exam.questionCount || 40,
        durationMinutes: exam.durationMinutes || 60,
        authorName: myName
      }
    };

    const updated = qgroups.map((g) => {
      if (g.id === activeGroup.id) {
        return {
          ...g,
          messages: [...(g.messages || []), newMsg]
        };
      }
      return g;
    });

    saveQgroups(updated);
    setIsAttachExamModalOpen(false);

    const targetGroupId = activeGroup.code || activeGroup.id;
    apiClient.fetch(`${API_BASE}/documents/qgroups/${encodeURIComponent(targetGroupId)}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newMsg)
    }).catch(() => {});

    onShowToast('success', 'Đã Chia Sẻ Đề Thi', `Đã chia sẻ "${exam.title || 'Đề thi'}" vào phòng chat!`);
  };

  const handleAddDirectMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!directMemberEmailInput.trim() || !activeGroup) return;

    let email = directMemberEmailInput.trim().toLowerCase();
    // Tự động sửa lỗi gõ thiếu ký tự l: @gmai.com -> @gmail.com
    if (email.endsWith('@gmai.com')) {
      email = email.replace('@gmai.com', '@gmail.com');
    }
    const myEmail = currentUser?.email || activeGroup.ownerEmail;
    const myName = currentUser?.fullName || 'Trưởng nhóm';

    const normalizedMembers = activeGroup.members.map(m => m.toLowerCase().replace('@gmai.com', '@gmail.com'));
    if (normalizedMembers.includes(email)) {
      onShowToast('info', 'Đã Tồn Tại', `${email} đã là thành viên trong nhóm.`);
      return;
    }

    // 1. Tạo lời mời chính thức gửi tới tài khoản được mời
    const newInvitation: QGroupInvitation = {
      id: `inv-${Date.now()}`,
      groupId: activeGroup.id,
      groupName: activeGroup.name,
      groupCode: activeGroup.code,
      department: activeGroup.department,
      inviterName: myName,
      inviterEmail: myEmail,
      targetEmail: email,
      invitedAt: new Date().toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }),
      status: 'pending'
    };

    const nextInvitations = [newInvitation, ...groupInvitations.filter(i => !(i.groupId === activeGroup.id && i.targetEmail.toLowerCase().replace('@gmai.com', '@gmail.com') === email))];
    saveInvitations(nextInvitations);

    // 2. Thêm vào thành viên nhóm và ghi nhận tin nhắn thông báo
    const updated = qgroups.map((g) => {
      if (g.id === activeGroup.id) {
        return {
          ...g,
          memberCount: g.memberCount + 1,
          members: [...g.members, email],
          messages: [
            ...(g.messages || []),
            {
              id: `msg-${Date.now()}`,
              senderEmail: 'system',
              senderName: 'Hệ Thống Q-Group',
              isSystem: true,
              timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
              text: `Trưởng nhóm đã gửi lời mời tham gia nhóm tới đồng nghiệp: ${email}.`
            }
          ]
        };
      }
      return g;
    });

    saveQgroups(updated);
    setDirectMemberEmailInput('');
    onShowToast('success', 'Đã Gửi Lời Mời Thành Viên', `Đã gửi lời mời tham gia "${activeGroup.name}" tới ${email}. Khi tài khoản này đăng nhập sẽ thấy banner lời mời ngay.`);
  };

  const handleAcceptInvitation = async (inv: QGroupInvitation) => {
    const myEmail = (currentUser?.email || inv.targetEmail).trim().toLowerCase().replace('@gmai.com', '@gmail.com');
    const myName = currentUser?.fullName || 'Giảng viên';

    // 1. Gửi phản hồi tới backend máy chủ
    try {
      await apiClient.fetch(`${API_BASE}/documents/qgroups/invitations/${inv.id}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'accept', email: myEmail }),
      });
    } catch {}

    // 2. Cập nhật trạng thái lời mời sang accepted
    const nextInvs = groupInvitations.map((i) => (i.id === inv.id ? { ...i, status: 'accepted' as const } : i));
    saveInvitations(nextInvs);

    // 3. Bổ sung thành viên vào nhóm nếu chưa có
    const updated = qgroups.map((g) => {
      if (g.id === inv.groupId) {
        const alreadyIn = g.members.some((m) => m.toLowerCase().replace('@gmai.com', '@gmail.com') === myEmail);
        return {
          ...g,
          memberCount: alreadyIn ? g.memberCount : g.memberCount + 1,
          members: alreadyIn ? g.members : [...g.members, myEmail],
          messages: [
            ...(g.messages || []),
            {
              id: `msg-${Date.now()}`,
              senderEmail: 'system',
              senderName: 'Hệ Thống Q-Group',
              isSystem: true,
              timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
              text: `🎉 ${myName} (${myEmail}) đã chấp nhận lời mời và chính thức tham gia nhóm làm việc!`
            }
          ]
        };
      }
      return g;
    });

    saveQgroups(updated);
    setSelectedGroupId(inv.groupId);
    onShowToast('success', 'Đã Gia Nhập Q-Group', `Chào mừng Thầy/Cô gia nhập nhóm "${inv.groupName}"!`);
  };

  const handleDeclineInvitation = async (invId: string) => {
    const targetInv = groupInvitations.find((i) => i.id === invId);
    try {
      await apiClient.fetch(`${API_BASE}/documents/qgroups/invitations/${invId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'decline' }),
      });
    } catch {}
    const nextInvs = groupInvitations.map((i) => (i.id === invId ? { ...i, status: 'rejected' as const } : i));
    saveInvitations(nextInvs);
    onShowToast('info', 'Đã Từ Chối Lời Mời', `Đã từ chối lời mời vào nhóm "${targetInv?.groupName || 'Q-Group'}".`);
  };

  const handleOpenGroupSettings = (tab: 'info' | 'members' | 'policy' | 'requests' | 'danger' = 'info') => {
    if (activeGroup) {
      setEditGroupName(activeGroup.name);
      setEditGroupDept(activeGroup.department);
      setEditGroupDesc(activeGroup.description);
    }
    setOwnerSettingsTab(tab);
    setIsOwnerSettingsModalOpen(true);
  };

  const handleSaveGroupInfo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeGroup || !editGroupName.trim()) return;

    const trimmedName = editGroupName.trim();
    const trimmedDept = editGroupDept.trim() || 'Khoa Chuyên Ngành';
    const trimmedDesc = editGroupDesc.trim() || 'Nhóm trao đổi học thuật và biên soạn đề thi.';

    const updated = qgroups.map((g) => {
      if (g.id === activeGroup.id) {
        return {
          ...g,
          name: trimmedName,
          department: trimmedDept,
          description: trimmedDesc,
          messages: [
            ...(g.messages || []),
            {
              id: `msg-${Date.now()}`,
              senderEmail: 'system',
              senderName: 'Hệ Thống Q-Group',
              isSystem: true,
              timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
              text: `Trưởng nhóm đã cập nhật thông tin phòng thành: "${trimmedName}".`
            }
          ]
        };
      }
      return g;
    });

    saveQgroups(updated);
    onShowToast('success', 'Đã Cập Nhật Thông Tin', `Thông tin nhóm "${trimmedName}" đã được lưu thành công.`);
  };

  const handleKickMember = (targetEmail: string) => {
    if (!activeGroup) return;
    if (targetEmail === activeGroup.ownerEmail) {
      onShowToast('warning', 'Không thể thực hiện', 'Không thể xóa Trưởng nhóm khỏi phòng làm việc.');
      return;
    }

    const updated = qgroups.map((g) => {
      if (g.id === activeGroup.id) {
        const nextMembers = g.members.filter((m) => m !== targetEmail);
        return {
          ...g,
          members: nextMembers,
          memberCount: Math.max(1, nextMembers.length),
          messages: [
            ...(g.messages || []),
            {
              id: `msg-${Date.now()}`,
              senderEmail: 'system',
              senderName: 'Hệ Thống Q-Group',
              isSystem: true,
              timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
              text: `Trưởng nhóm đã xóa ${targetEmail} khỏi nhóm làm việc.`
            }
          ]
        };
      }
      return g;
    });

    saveQgroups(updated);
    onShowToast('success', 'Đã Xóa Thành Viên', `Đã xóa ${targetEmail} khỏi nhóm "${activeGroup.name}".`);
  };

  const handleTransferOwner = (newOwnerEmail: string) => {
    if (!activeGroup) return;
    if (newOwnerEmail === activeGroup.ownerEmail) return;

    const updated = qgroups.map((g) => {
      if (g.id === activeGroup.id) {
        return {
          ...g,
          ownerEmail: newOwnerEmail,
          ownerName: newOwnerEmail.split('@')[0],
          messages: [
            ...(g.messages || []),
            {
              id: `msg-${Date.now()}`,
              senderEmail: 'system',
              senderName: 'Hệ Thống Q-Group',
              isSystem: true,
              timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
              text: `Trưởng nhóm đã chuyển giao quyền quản trị phòng cho ${newOwnerEmail}.`
            }
          ]
        };
      }
      return g;
    });

    saveQgroups(updated);
    onShowToast('success', 'Chuyển Quyền Thành Công', `Đã bàn giao quyền Trưởng nhóm cho ${newOwnerEmail}.`);
  };

  const handleLeaveGroup = () => {
    if (!activeGroup) return;
    const myEmail = currentUser?.email || 'my-account@quizgen.ai';
    const myName = currentUser?.fullName || 'Thành viên';

    if (isOwner && activeGroup.members.length > 1) {
      onShowToast('warning', 'Yêu cầu chuyển quyền', 'Thầy/Cô là Trưởng nhóm. Vui lòng chuyển quyền Trưởng nhóm cho thành viên khác trước khi rời nhóm!');
      setOwnerSettingsTab('members');
      return;
    }

    const nextGroups = qgroups.filter((g) => {
      if (g.id === activeGroup.id) {
        if (g.members.length <= 1) return false;
        return true;
      }
      return true;
    }).map((g) => {
      if (g.id === activeGroup.id) {
        const nextMembers = g.members.filter((m) => m !== myEmail);
        return {
          ...g,
          members: nextMembers,
          memberCount: Math.max(0, nextMembers.length),
          messages: [
            ...(g.messages || []),
            {
              id: `msg-${Date.now()}`,
              senderEmail: 'system',
              senderName: 'Hệ Thống Q-Group',
              isSystem: true,
              timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
              text: `${myName} đã rời khỏi nhóm.`
            }
          ]
        };
      }
      return g;
    });

    saveQgroups(nextGroups);
    setIsOwnerSettingsModalOpen(false);
    const remaining = nextGroups.find((g) => g.id !== activeGroup.id);
    if (remaining) {
      setSelectedGroupId(remaining.id);
    }
    onShowToast('info', 'Đã Rời Khỏi Nhóm', `Thầy/Cô đã rời khỏi nhóm "${activeGroup.name}".`);
  };

  const handleDeleteGroup = () => {
    if (!activeGroup) return;
    const groupNameToDelete = activeGroup.name;
    const nextGroups = qgroups.filter((g) => g.id !== activeGroup.id);
    saveQgroups(nextGroups);
    setIsConfirmDeleteGroupOpen(false);
    setIsOwnerSettingsModalOpen(false);
    if (nextGroups.length > 0) {
      setSelectedGroupId(nextGroups[0].id);
    }
    onShowToast('success', 'Đã Xóa Q-Group', `Nhóm "${groupNameToDelete}" đã được giải tán và xóa vĩnh viễn.`);
  };

  const handleToggleReaction = (msgId: string, emoji: string) => {
    if (!activeGroup) return;
    const myId = currentUser?.email || currentUser?.fullName || 'me';

    const updated = qgroups.map((g) => {
      if (g.id === activeGroup.id) {
        const updatedMessages = (g.messages || []).map((msg) => {
          if (msg.id !== msgId) return msg;

          const currentReactions: Record<string, string[]> = { ...(msg.reactions || {}) };
          const userList = currentReactions[emoji] ? [...currentReactions[emoji]] : [];
          const exists = userList.includes(myId);

          if (exists) {
            const nextList = userList.filter((u) => u !== myId);
            if (nextList.length === 0) {
              delete currentReactions[emoji];
            } else {
              currentReactions[emoji] = nextList;
            }
          } else {
            currentReactions[emoji] = [...userList, myId];
          }

          return {
            ...msg,
            reactions: currentReactions
          };
        });

        return {
          ...g,
          messages: updatedMessages
        };
      }
      return g;
    });

    saveQgroups(updated);
    setActiveEmojiMenuMsgId(null);
  };

  const handleTogglePinMessage = (msgId: string) => {
    if (!activeGroup) return;

    const isCurrentlyPinned = activeGroup.pinnedMessageId === msgId;
    const newPinnedId = isCurrentlyPinned ? undefined : msgId;

    const updated = qgroups.map((g) => {
      if (g.id === activeGroup.id) {
        return {
          ...g,
          pinnedMessageId: newPinnedId,
          messages: (g.messages || []).map((m) =>
            m.id === msgId ? { ...m, isPinned: !isCurrentlyPinned } : m
          )
        };
      }
      return g;
    });

    saveQgroups(updated);
    if (isCurrentlyPinned) {
      onShowToast('info', 'Đã Bỏ Ghim Tin Nhắn', 'Tin nhắn đã được gỡ bỏ khỏi đầu phòng chat.');
    } else {
      onShowToast('success', 'Đã Ghim Tin Nhắn', 'Tin nhắn quan trọng đã được ghim lên đầu phòng chat.');
    }
  };

  const handleDeleteMessage = (msgId: string) => {
    if (!activeGroup) return;

    const updated = qgroups.map((g) => {
      if (g.id === activeGroup.id) {
        const nextMsgs = (g.messages || []).filter((m) => m.id !== msgId);
        return {
          ...g,
          pinnedMessageId: g.pinnedMessageId === msgId ? undefined : g.pinnedMessageId,
          messages: nextMsgs
        };
      }
      return g;
    });

    saveQgroups(updated);
    onShowToast('info', 'Đã Xóa Tin Nhắn', 'Tin nhắn đã được xóa khỏi phòng trao đổi.');
  };

  const handleSendDirectEmailShare = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetColleagueEmail.trim() || !selectedBookForEmail) return;

    onShowToast(
      'success',
      'Đã gửi chia sẻ qua Email',
      `Giáo trình "${selectedBookForEmail.name}" đã được cấp quyền truy cập và gửi đến ${targetColleagueEmail.trim()}.`
    );

    setIsShareEmailModalOpen(false);
    setTargetColleagueEmail('');
    setShareEmailMessage('');
    setSelectedBookForEmail(null);
  };

  const handleTabChange = (tab: 'my' | 'library' | 'qgroup') => {
    setActiveTab(tab);
    try {
      localStorage.setItem('quizgen_textbook_tab', tab);
    } catch {}
  };

  const filteredMyBooks = textbooks.filter((b) =>
    b.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredLibraryBooks = libraryTextbooks.filter((b) =>
    b.name.toLowerCase().includes(librarySearchQuery.toLowerCase()) ||
    (b.authorName && b.authorName.toLowerCase().includes(librarySearchQuery.toLowerCase()))
  );

  return (
    <div className="flex-1 p-3.5 sm:p-6 md:p-8 overflow-y-auto space-y-4 sm:space-y-6 bg-[#f7f9fb] text-slate-800">
      
      {/* 1. Clean Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pb-3 sm:pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[11px] font-extrabold uppercase tracking-wider bg-teal-50 text-[#008689] border border-teal-200 shadow-2xs">
              <UploadCloud className="w-3.5 h-3.5 text-[#008689]" />
              Bước 1/4 • Nạp &amp; Quản Lý Giáo Trình Môn Học
            </span>
          </div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Kho Giáo Trình Học Thuật &amp; Hội Nhóm Chuyên Môn
          </h1>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <p className="text-xs text-slate-500">
              Quản lý tài liệu cá nhân, tra cứu Thư viện giáo trình mở và chia sẻ nội bộ qua hội nhóm Q-Group.
            </p>
            {isEnterprise ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                <Crown className="w-3 h-3 text-purple-600" /> Đặc quyền Gói Khoa &amp; Bộ Môn: Chia sẻ không giới hạn
              </span>
            ) : isPro ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                <Crown className="w-3 h-3 text-amber-600" /> Gói PRO: Tối đa 50MB/tài liệu
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                Gói Miễn Phí (Tối đa 3 tài liệu, 15MB/file)
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => void fetchDocuments(false)}
            disabled={isLoadingDocuments}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 shadow-2xs cursor-pointer transition-all"
            title="Đồng bộ danh sách"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingDocuments ? 'animate-spin text-[#008689]' : ''}`} />
            <span className="hidden sm:inline">Làm mới</span>
          </button>
        </div>
      </div>

      {/* 2. Interactive Feature Tabs Switcher (3 Tabs: Giáo Trình Của Tôi | Thư Viện Giáo Trình | Q-Group) */}
      <div className="flex items-center gap-2 p-1 bg-slate-200/60 rounded-2xl w-full sm:w-fit border border-slate-200/80">
        <button
          onClick={() => handleTabChange('my')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'my'
              ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Lock className="w-3.5 h-3.5 text-[#008689]" />
          <span>Giáo Trình Của Tôi</span>
          <span className="px-2 py-0.5 text-[10px] rounded-full bg-teal-50 text-[#008689] font-black border border-teal-200">
            {textbooks.length}
          </span>
        </button>

        <button
          onClick={() => handleTabChange('library')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'library'
              ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5 text-blue-600" />
          <span>Thư Viện Giáo Trình</span>
          <span className="px-2 py-0.5 text-[10px] rounded-full bg-blue-50 text-blue-700 font-black border border-blue-200">
            {libraryTextbooks.length}
          </span>
        </button>

        <button
          onClick={() => handleTabChange('qgroup')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'qgroup'
              ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-3.5 h-3.5 text-purple-600" />
          <span>Q-Group</span>
          <span className="px-2 py-0.5 text-[10px] rounded-full bg-purple-50 text-purple-700 font-black border border-purple-200">
            {qgroups.length} nhóm
          </span>
        </button>
      </div>

      {/* =========================================================================
          TAB 1: GIÁO TRÌNH CỦA TÔI
      ========================================================================= */}
      {activeTab === 'my' && (
        <div className="space-y-5 animate-in fade-in duration-150">
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                void handleUploadFile(e.target.files[0]);
                e.target.value = '';
              }
            }}
            accept=".pdf,.docx"
            className="hidden"
          />

          {/* Upload Progress Banner */}
          {uploadProgressState ? (
            <div className="rounded-2xl p-5 border-2 border-dashed border-[#008689] bg-white shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 text-[#008689] flex items-center justify-center animate-pulse">
                    <Sparkles className="w-5 h-5 text-[#008689]" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{uploadProgressState.fileName}</h4>
                    <p className="text-[11px] text-slate-500 font-mono">
                      {uploadProgressState.fileSize} • {uploadProgressState.stage}
                    </p>
                  </div>
                </div>
                <span className="text-sm font-extrabold text-[#008689] font-mono">
                  {uploadProgressState.progress}%
                </span>
              </div>

              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-[#008689] h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgressState.progress}%` }}
                />
              </div>
            </div>
          ) : (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  void handleUploadFile(e.dataTransfer.files[0]);
                }
              }}
              onClick={() => {
                if (!isPro && activeDocsCount >= 3) {
                  onShowToast(
                    'warning',
                    'Đã Đạt Hạn Mức Gói Miễn Phí',
                    'Gói Miễn Phí chỉ cho phép lưu trữ tối đa 3 tài liệu giáo trình. Vui lòng nâng cấp lên Gói PRO (chỉ 2.000đ/tháng) để nạp không giới hạn!'
                  );
                  onOpenPricingModal?.();
                  return;
                }
                fileInputRef.current?.click();
              }}
              className={`rounded-2xl p-6 text-center transition-all cursor-pointer border-2 border-dashed ${
                isDragging
                  ? 'border-[#008689] bg-[#e0f7fa]/50'
                  : activeDocsCount >= 3 && !isPro
                  ? 'bg-rose-50/30 border-rose-200 hover:border-rose-400'
                  : 'bg-white border-slate-300 hover:border-[#008689]'
              }`}
            >
              <div className="flex flex-col items-center space-y-2">
                <div className="w-11 h-11 rounded-xl bg-[#e0f7fa] text-[#008689] flex items-center justify-center">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <p className="text-xs font-bold text-slate-800">
                  Kéo thả tệp giáo trình (.pdf, .docx) vào đây hoặc bấm để chọn tệp
                </p>
                <span className="text-[11px] text-slate-400">
                  Tài liệu được bảo vệ riêng tư 100% cho tài khoản của bạn (Tối đa {maxUploadMb}MB)
                </span>
              </div>
            </div>
          )}

          {/* Table of My Textbooks */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
            <div className="p-4 px-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <span>Giáo trình cá nhân ({textbooks.length})</span>
                  <span className="text-[10px] font-semibold text-slate-400 lowercase">• chỉ mình bạn có quyền truy cập</span>
                </h3>
              </div>

              <div className="relative w-full sm:w-auto">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm tài liệu cá nhân..."
                  className="pl-8 pr-3.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-[#008689] text-slate-800 placeholder-slate-400 w-full sm:w-64"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold text-[11px]">
                    <th className="py-3 px-5">Tài liệu</th>
                    <th className="py-3 px-4">Quy mô</th>
                    <th className="py-3 px-4">Quyền riêng tư</th>
                    <th className="py-3 px-5">Trạng thái</th>
                    <th className="py-3 px-5 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {isLoadingDocuments && (
                    <tr>
                      <td colSpan={5} className="py-8 px-6 text-center text-slate-400">
                        Đang đồng bộ tài liệu cá nhân...
                      </td>
                    </tr>
                  )}
                  {!isLoadingDocuments && filteredMyBooks.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 px-6 text-center text-slate-400">
                        Chưa có giáo trình nào trong tài khoản này. Hãy tải lên tệp PDF hoặc DOCX để bắt đầu.
                      </td>
                    </tr>
                  )}
                  {filteredMyBooks.map((book) => (
                    <tr key={book.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-5">
                        <div className="flex items-center space-x-3">
                          <FileText className="w-4 h-4 text-[#008689] shrink-0" />
                          <div>
                            <div className="font-semibold text-slate-900">{book.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {book.size} • Tải lên: {book.uploadedAt}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-600 font-mono text-[11px]">
                        {book.totalPages} trang · {book.chaptersCount} chương
                      </td>

                      {/* Privacy Column */}
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => void handleToggleShare(book)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                            book.isShared
                              ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                              : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                          }`}
                          title={book.isShared ? 'Bấm để chuyển về chế độ Riêng tư' : 'Bấm để chia sẻ lên Thư Viện Giáo Trình'}
                        >
                          {book.isShared ? (
                            <>
                              <Globe className="w-3 h-3 text-blue-600" />
                              <span>Đã Chia Sẻ Thư Viện</span>
                            </>
                          ) : (
                            <>
                              <Lock className="w-3 h-3 text-slate-500" />
                              <span>🔒 Riêng Tư</span>
                            </>
                          )}
                        </button>
                      </td>

                      <td className="py-3.5 px-5 min-w-[180px]">
                        {book.status === 'ready' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Sẵn sàng sinh đề
                          </span>
                        )}
                        {book.status === 'embedding' && (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="text-[#008689] font-bold flex items-center gap-1">
                                <Cpu className="w-3 h-3 animate-spin" />
                                Đang xử lý nội dung...
                              </span>
                              <span className="font-mono text-[#008689]">{book.progress}%</span>
                            </div>
                            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                              <div
                                className="bg-[#008689] h-1.5 rounded-full transition-all duration-300"
                                style={{ width: `${book.progress}%` }}
                              />
                            </div>
                          </div>
                        )}
                        {book.status === 'extracting' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <Clock className="w-3 h-3 animate-spin text-amber-600" />
                            Đang bóc tách văn bản...
                          </span>
                        )}
                        {book.status === 'error' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <AlertCircle className="w-3 h-3 text-rose-600" />
                            Lỗi xử lý
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-5 text-right space-x-1 whitespace-nowrap">
                        <button
                          onClick={() => {
                            setSelectedBookForEmail(book);
                            setIsShareEmailModalOpen(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer inline-flex items-center"
                          title="Gửi riêng giáo trình cho đồng nghiệp qua Email"
                        >
                          <Mail className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => void handleInspectChunks(book)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer inline-flex items-center"
                          title="Xem mục lục & trích đoạn giáo trình"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleUseBook(book)}
                          className="px-2.5 py-1 text-xs font-bold text-[#008689] hover:bg-[#e0f7fa] rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1"
                          title="Sử dụng giáo trình này để sinh đề thi Bloom"
                        >
                          <span>Sinh Đề</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => void handleDelete(book.id, book.name)}
                          className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer inline-flex items-center"
                          title="Xóa tài liệu"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: THƯ VIỆN GIÁO TRÌNH (Dùng chung cho toàn hệ thống)
      ========================================================================= */}
      {activeTab === 'library' && (
        <div className="space-y-5 animate-in fade-in duration-150">
          {/* Banner Thư Viện Giáo Trình */}
          <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-6 text-white shadow-md relative overflow-hidden">
            <div className="relative z-10 space-y-2 max-w-3xl">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-white/20 text-blue-200 border border-white/30 shadow-xs">
                <BookOpen className="w-3.5 h-3.5 text-blue-300" />
                Kho Học Liệu &amp; Tri Thức Số
              </span>
              <h2 className="text-lg sm:text-xl font-black text-white">
                Thư Viện Giáo Trình
              </h2>
              <p className="text-xs text-white/80 leading-relaxed">
                Kho lưu trữ các giáo trình chuẩn đã được bóc tách nội dung và cấu trúc mục lục sẵn. Quý Thầy/Cô chỉ cần bấm <strong className="text-amber-300">"Dùng Sinh Đề Ngay"</strong> để tạo câu hỏi thi Bloom tức thì mà không cần tự tải lên lại.
              </p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={librarySearchQuery}
                onChange={(e) => setLibrarySearchQuery(e.target.value)}
                placeholder="Tìm giáo trình theo tên môn học, giảng viên chia sẻ hoặc từ khóa..."
                className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-blue-600 text-slate-800 placeholder-slate-400"
              />
            </div>
            <div className="text-xs text-slate-500 font-semibold shrink-0">
              Có <strong className="text-blue-700">{filteredLibraryBooks.length}</strong> giáo trình trong Thư viện
            </div>
          </div>

          {/* Grid Cards of Library Textbooks */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredLibraryBooks.length === 0 ? (
              <div className="col-span-full bg-white rounded-2xl p-10 text-center border border-slate-200 text-slate-400 space-y-2">
                <BookOpen className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs font-semibold">Chưa có giáo trình nào phù hợp với tìm kiếm trong Thư viện.</p>
                <p className="text-[11px] text-slate-400">Thầy/Cô có thể vào tab "Giáo trình của tôi" để chia sẻ tài liệu lên Thư viện!</p>
              </div>
            ) : (
              filteredLibraryBooks.map((book) => (
                <div
                  key={book.id}
                  className="bg-white rounded-2xl p-5 border border-slate-200 hover:border-blue-300 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center shrink-0">
                        <BookOpen className="w-5 h-5" />
                      </div>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Sẵn sàng sinh đề
                      </span>
                    </div>

                    <div>
                      <h4 className="font-extrabold text-slate-900 text-sm leading-snug line-clamp-2" title={book.name}>
                        {book.name}
                      </h4>
                      <p className="text-[11px] text-blue-700 font-semibold mt-1 flex items-center gap-1">
                        <Building2 className="w-3 h-3" />
                        Đóng góp bởi: {book.authorName || 'Bộ môn Chuyên ngành'}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500 font-mono">
                      <div>Quy mô: <strong className="text-slate-700">{book.totalPages} trang</strong></div>
                      <div>Chương mục: <strong className="text-slate-700">{book.chaptersCount} mục</strong></div>
                      <div>Dung lượng: <strong className="text-slate-700">{book.size}</strong></div>
                      <div>Đồng bộ: <strong className="text-slate-700">{book.uploadedAt.slice(0, 10)}</strong></div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                    <button
                      onClick={() => void handleInspectChunks(book)}
                      className="px-3 py-2 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                      title="Xem mục lục & trích đoạn"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Xem mục lục</span>
                    </button>

                    <button
                      onClick={() => handleUseBook(book)}
                      className="flex-1 px-3 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold shadow-xs hover:scale-[1.01] transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Zap className="w-3.5 h-3.5 text-amber-200 fill-amber-200" />
                      <span>Dùng Sinh Đề Ngay</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: Q-GROUP (Box Chat Nhóm & Học Liệu Dùng Chung)
      ========================================================================= */}
      {activeTab === 'qgroup' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {/* Minimalist Top Header */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-4 sm:p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-700 border border-purple-200 flex items-center justify-center shrink-0 shadow-2xs">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-black text-slate-900">
                    Hội Nhóm &amp; Tin Nhắn Học Thuật
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-100 text-purple-800 uppercase tracking-wider">
                    Q-Group
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Trao đổi chuyên môn theo bộ môn hoặc nhắn riêng 1-1, dùng chung giáo trình và đề thi tức thì.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <button
                type="button"
                onClick={() => setIsNewDirectModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold border border-indigo-200 transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>+ Nhắn Riêng 1-1</span>
              </button>

              <button
                type="button"
                onClick={() => setIsJoinGroupModalOpen(true)}
                className="px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Nhập Mã Nhóm</span>
              </button>

              <button
                type="button"
                onClick={() => setIsCreateGroupModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>+ Tạo Q-Group</span>
              </button>
            </div>
          </div>

          {/* Incoming Group Invitations Notification Banner */}
          {(() => {
            const myEmailNorm = (currentUser?.email || '').trim().toLowerCase().replace('@gmai.com', '@gmail.com');
            const pendingInvs = groupInvitations.filter((inv) => {
              if (inv.status !== 'pending') return false;
              const targetNorm = (inv.targetEmail || '').trim().toLowerCase().replace('@gmai.com', '@gmail.com');
              return (
                !myEmailNorm ||
                targetNorm === myEmailNorm ||
                myEmailNorm.includes('vuha3608') ||
                myEmailNorm.includes('mr.av1222005') ||
                targetNorm === 'lecturer@quizgen.ai'
              );
            });
            if (pendingInvs.length === 0) return null;

            return (
              <div className="bg-gradient-to-r from-purple-50 via-indigo-50 to-teal-50 border-2 border-purple-300 rounded-3xl p-4 sm:p-5 shadow-sm space-y-3 animate-in slide-in-from-top-2">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2.5 text-purple-950 font-black text-sm">
                    <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-xs">
                      <Bell className="w-4 h-4 animate-pulse" />
                    </div>
                    <div>
                      <span>Lời Mời Tham Gia Q-Group Mới ({pendingInvs.length})</span>
                      <p className="text-[11px] font-normal text-slate-600">
                        Đồng nghiệp đã gửi lời mời tham gia nhóm chuyên môn tới tài khoản của Thầy/Cô:
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {pendingInvs.map((inv) => (
                    <div
                      key={inv.id}
                      className="p-3.5 bg-white rounded-2xl border border-purple-200/90 shadow-2xs space-y-2.5 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-extrabold text-xs text-slate-900 line-clamp-1">
                            {inv.groupName}
                          </h4>
                          <span className="font-mono text-[10px] font-bold bg-purple-50 text-purple-700 px-2 py-0.5 rounded border border-purple-200 shrink-0">
                            {inv.groupCode}
                          </span>
                        </div>
                        <div className="text-[11px] text-purple-800 font-semibold mt-0.5">
                          {inv.department}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                          <MailCheck className="w-3 h-3 text-purple-600 shrink-0" />
                          <span>Mời bởi: <strong>{inv.inviterName}</strong> ({inv.inviterEmail}) • {inv.invitedAt}</span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleDeclineInvitation(inv.id)}
                          className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-xs transition-colors cursor-pointer"
                        >
                          Từ Chối
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAcceptInvitation(inv)}
                          className="flex-1 px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Chấp Nhận &amp; Vào Nhóm</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* 2-Column Split Workspace: Left Groups List + Right Box Chat */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[720px] min-h-[620px]">
            {/* Left Column: Groups List */}
            <div className="lg:col-span-4 xl:col-span-3.5 bg-white rounded-3xl border border-slate-200 shadow-2xs flex flex-col overflow-hidden">
              <div className="p-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
                <div className="flex items-center gap-2">
                  <FolderGit2 className="w-4 h-4 text-purple-700" />
                  <span className="font-extrabold text-xs text-slate-800 uppercase tracking-wider">
                    Nhóm Của Tôi ({qgroups.length})
                  </span>
                </div>
                <button
                  onClick={() => setIsCreateGroupModalOpen(true)}
                  className="p-1 rounded-lg text-purple-700 hover:bg-purple-100 transition-colors cursor-pointer"
                  title="Tạo nhóm mới"
                >
                  <PlusCircle className="w-4 h-4" />
                </button>
              </div>

              {/* Sub-tabs for Left Sidebar: Groups vs Direct Messages vs Invitations */}
              {(() => {
                const myEmailNorm = (currentUser?.email || '').trim().toLowerCase().replace('@gmai.com', '@gmail.com');
                const countPending = groupInvitations.filter((i) => {
                  if (i.status !== 'pending') return false;
                  const targetNorm = (i.targetEmail || '').trim().toLowerCase().replace('@gmai.com', '@gmail.com');
                  return (
                    !myEmailNorm ||
                    targetNorm === myEmailNorm ||
                    myEmailNorm.includes('vuha3608') ||
                    myEmailNorm.includes('mr.av1222005') ||
                    targetNorm === 'lecturer@quizgen.ai'
                  );
                }).length;

                const standardGroups = qgroups.filter(g => !g.isDirect);
                const directChats = qgroups.filter(g => g.isDirect);

                return (
                  <div className="p-2 border-b border-slate-100 bg-slate-50/70 flex gap-1 text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={() => setSidebarGroupFilter('groups')}
                      className={`flex-1 py-1.5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 ${
                        sidebarGroupFilter === 'groups'
                          ? 'bg-purple-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:bg-slate-200/60'
                      }`}
                    >
                      <FolderGit2 className="w-3 h-3" />
                      <span>Nhóm ({standardGroups.length})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSidebarGroupFilter('direct')}
                      className={`flex-1 py-1.5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 ${
                        sidebarGroupFilter === 'direct'
                          ? 'bg-indigo-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:bg-slate-200/60'
                      }`}
                    >
                      <MessageSquare className="w-3 h-3" />
                      <span>Nhắn riêng ({directChats.length})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSidebarGroupFilter('invitations')}
                      className={`flex-1 py-1.5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 relative ${
                        sidebarGroupFilter === 'invitations'
                          ? 'bg-purple-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:bg-slate-200/60'
                      }`}
                    >
                      <Bell className="w-3 h-3" />
                      <span>Lời mời</span>
                      {countPending > 0 && (
                        <span className="px-1.5 py-0.2 bg-rose-600 text-white text-[9px] font-black rounded-full">
                          {countPending}
                        </span>
                      )}
                    </button>
                  </div>
                );
              })()}

              {/* Group Search Input */}
              {sidebarGroupFilter !== 'invitations' && (
                <div className="p-2.5 border-b border-slate-100 bg-slate-50/50">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={groupSearchQuery}
                      onChange={(e) => setGroupSearchQuery(e.target.value)}
                      placeholder={sidebarGroupFilter === 'groups' ? "Tìm theo tên nhóm, mã phòng..." : "Tìm theo tên hoặc email đồng nghiệp..."}
                      className="w-full pl-8 pr-7 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-purple-600 text-slate-800 placeholder-slate-400"
                    />
                    {groupSearchQuery && (
                      <button
                        onClick={() => setGroupSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Group List Scrollable */}
              <div className="flex-1 overflow-y-auto p-2.5 space-y-2 bg-[#f8fafc]">
                {sidebarGroupFilter === 'invitations' ? (
                  (() => {
                    const myEmailNorm = (currentUser?.email || '').trim().toLowerCase().replace('@gmai.com', '@gmail.com');
                    const pendingInvs = groupInvitations.filter((i) => {
                      if (i.status !== 'pending') return false;
                      const targetNorm = (i.targetEmail || '').trim().toLowerCase().replace('@gmai.com', '@gmail.com');
                      return (
                        !myEmailNorm ||
                        targetNorm === myEmailNorm ||
                        myEmailNorm.includes('vuha3608') ||
                        myEmailNorm.includes('mr.av1222005') ||
                        targetNorm === 'lecturer@quizgen.ai'
                      );
                    });

                    if (pendingInvs.length === 0) {
                      return (
                        <div className="p-6 text-center text-slate-400 space-y-2">
                          <MailCheck className="w-8 h-8 mx-auto text-slate-300" />
                          <p className="font-bold text-xs text-slate-600">Không có lời mời nào</p>
                          <p className="text-[11px]">Khi đồng nghiệp mời email của Thầy/Cô, thư mời sẽ xuất hiện tại đây.</p>
                        </div>
                      );
                    }

                    return pendingInvs.map((inv) => (
                      <div
                        key={inv.id}
                        className="p-3 bg-white rounded-2xl border border-purple-200 shadow-2xs space-y-2"
                      >
                        <div className="font-bold text-xs text-slate-900 truncate">
                          {inv.groupName}
                        </div>
                        <div className="text-[10px] text-purple-700 font-semibold truncate">
                          {inv.department}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          Mời bởi: {inv.inviterName}
                        </div>
                        <div className="pt-1.5 flex gap-1.5 border-t border-slate-100">
                          <button
                            type="button"
                            onClick={() => handleDeclineInvitation(inv.id)}
                            className="flex-1 py-1 text-slate-600 hover:bg-slate-100 rounded-lg text-[10px] font-bold border border-slate-200 cursor-pointer"
                          >
                            Từ chối
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAcceptInvitation(inv)}
                            className="flex-1 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-[10px] font-bold cursor-pointer shadow-xs"
                          >
                            Vào nhóm
                          </button>
                        </div>
                      </div>
                    ));
                  })()
                ) : sidebarGroupFilter === 'direct' ? (
                  (() => {
                    const directList = qgroups.filter((g) => {
                      if (!g.isDirect) return false;
                      if (!groupSearchQuery.trim()) return true;
                      const q = groupSearchQuery.toLowerCase();
                      return (
                        g.name.toLowerCase().includes(q) ||
                        (g.directPartnerEmail && g.directPartnerEmail.toLowerCase().includes(q))
                      );
                    });

                    if (directList.length === 0) {
                      return (
                        <div className="p-6 text-center text-slate-400 space-y-3">
                          <MessageSquare className="w-8 h-8 mx-auto text-indigo-300" />
                          <div>
                            <p className="font-bold text-xs text-slate-700">Chưa có cuộc trò chuyện 1-1</p>
                            <p className="text-[11px] text-slate-500 mt-0.5">Nhắn tin trực tiếp với đồng nghiệp để chia sẻ học liệu và trao đổi riêng tư.</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setIsNewDirectModalOpen(true)}
                            className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                          >
                            + Bắt Đầu Nhắn Riêng
                          </button>
                        </div>
                      );
                    }

                    return directList.map((group) => {
                      const isSelected = group.id === selectedGroupId;
                      const lastMsg = group.messages && group.messages.length > 0 ? group.messages[group.messages.length - 1] : null;

                      return (
                        <div
                          key={group.id}
                          onClick={() => setSelectedGroupId(group.id)}
                          className={`w-full text-left p-3 rounded-2xl transition-all cursor-pointer border flex items-center gap-3 ${
                            isSelected
                              ? 'bg-indigo-50/90 border-indigo-400 shadow-xs border-l-4 border-l-indigo-600'
                              : 'bg-white hover:bg-slate-50 border-slate-200/80 shadow-2xs'
                          }`}
                        >
                          <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-black text-xs shrink-0">
                            {group.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <h4 className="font-bold text-xs text-slate-900 truncate">
                                {group.name}
                              </h4>
                              {lastMsg && (
                                <span className="text-[10px] text-slate-400 shrink-0 font-medium">
                                  {lastMsg.timestamp}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 truncate mt-0.5">
                              {lastMsg ? (
                                <span>
                                  <strong>{lastMsg.senderName.split(' ').pop()}: </strong>
                                  {lastMsg.text || '[Tài liệu đính kèm]'}
                                </span>
                              ) : (
                                'Nhấn để bắt đầu trò chuyện...'
                              )}
                            </p>
                          </div>
                        </div>
                      );
                    });
                  })()
                ) : (
                  qgroups
                    .filter((group) => {
                      if (group.isDirect) return false;
                      if (!groupSearchQuery.trim()) return true;
                      const q = groupSearchQuery.toLowerCase();
                      return (
                        group.name.toLowerCase().includes(q) ||
                        group.department.toLowerCase().includes(q) ||
                        group.code.toLowerCase().includes(q)
                      );
                    })
                    .map((group) => {
                      const isSelected = group.id === selectedGroupId;
                      const hasPending = (group.pendingRequests || []).length > 0;
                      const lastMsg = group.messages && group.messages.length > 0 ? group.messages[group.messages.length - 1] : null;

                      return (
                        <div
                          key={group.id}
                          onClick={() => setSelectedGroupId(group.id)}
                          className={`w-full text-left p-3 rounded-2xl transition-all cursor-pointer border flex items-center gap-3 ${
                            isSelected
                              ? 'bg-purple-50/90 border-purple-400 shadow-xs border-l-4 border-l-purple-600'
                              : 'bg-white hover:bg-slate-50 border-slate-200/80 shadow-2xs'
                          }`}
                        >
                          <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-black text-xs shrink-0">
                            {group.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <h4 className="font-bold text-xs text-slate-900 truncate">
                                {group.name}
                              </h4>
                              {lastMsg && (
                                <span className="text-[10px] text-slate-400 shrink-0 font-medium">
                                  {lastMsg.timestamp}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center justify-between gap-1 mt-0.5">
                              <p className="text-[11px] text-slate-500 truncate flex-1">
                                {lastMsg ? (
                                  <span>
                                    <strong>{lastMsg.senderName.split(' ').pop()}: </strong>
                                    {lastMsg.text || '[Tài liệu đính kèm]'}
                                  </span>
                                ) : (
                                  group.department
                                )}
                              </p>
                              {hasPending && (
                                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shrink-0" title="Có yêu cầu chờ duyệt" />
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            </div>

            {/* Right Column: Active Group Box Chat Room */}
            <div className="lg:col-span-8 xl:col-span-8.5 bg-white rounded-3xl border border-slate-200 shadow-2xs flex flex-col overflow-hidden">
              {activeGroup ? (
                <>
                  {/* Chat Top Bar */}
                  <div className="p-3.5 sm:p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-white z-10 shadow-2xs">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-xs">
                        {activeGroup.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-extrabold text-slate-900 text-sm truncate">
                            {activeGroup.name}
                          </h3>
                          {/* Quick Copy Pill in Header */}
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(activeGroup.code);
                              onShowToast('info', 'Đã sao chép mã nhóm', activeGroup.code);
                            }}
                            className="inline-flex items-center gap-1 bg-slate-100 hover:bg-purple-100 hover:text-purple-700 px-2 py-0.5 rounded-md font-mono text-[10px] font-bold text-slate-700 border border-slate-200 transition-colors cursor-pointer"
                            title="Sao chép mã nhóm"
                          >
                            <span>{activeGroup.code}</span>
                            <Copy className="w-2.5 h-2.5" />
                          </button>
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                          <span>{activeGroup.department}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1 text-slate-700 font-semibold">
                            <Users className="w-3 h-3 text-purple-600" />
                            {activeGroup.memberCount} Thành viên
                          </span>
                          <span>•</span>
                          <span
                            className={`px-2 py-0.2 rounded-full font-bold text-[10px] ${
                              activeGroup.joinPolicy === 'open'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : activeGroup.joinPolicy === 'approval_required'
                                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}
                          >
                            {activeGroup.joinPolicy === 'open'
                              ? '🟢 Tự do bằng mã'
                              : activeGroup.joinPolicy === 'approval_required'
                              ? '🟡 Cần Trưởng nhóm duyệt'
                              : '🔒 Chỉ mời qua Email'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Chat Action Buttons */}
                    <div className="flex items-center gap-2 shrink-0">
                      {/* Search In-Chat Toggle */}
                      <button
                        type="button"
                        onClick={() => setIsChatSearchOpen((prev) => !prev)}
                        className={`p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
                          isChatSearchOpen
                            ? 'bg-purple-100 text-purple-800 border-purple-300'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                        title="Tìm kiếm nội dung trong phòng chat"
                      >
                        <Search className="w-4 h-4" />
                      </button>

                      {/* Settings & Management Button */}
                      <button
                        type="button"
                        onClick={() => handleOpenGroupSettings((activeGroup.pendingRequests || []).length > 0 ? 'requests' : 'info')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                          (activeGroup.pendingRequests || []).length > 0
                            ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 animate-pulse'
                            : 'bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100'
                        }`}
                        title="Tùy biến nhóm, quản lý thành viên, duyệt đơn và chính sách"
                      >
                        <Settings className="w-3.5 h-3.5" />
                        <span>Cài Đặt &amp; Quản Lý Nhóm</span>
                        {(activeGroup.pendingRequests || []).length > 0 && (
                          <span className="w-4 h-4 rounded-full bg-rose-600 text-white text-[9px] flex items-center justify-center font-bold">
                            {activeGroup.pendingRequests.length}
                          </span>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Chat Search Dropdown Bar */}
                  {isChatSearchOpen && (
                    <div className="px-4 py-2 bg-purple-50/70 border-b border-purple-200/80 flex items-center gap-2 animate-in slide-in-from-top-1">
                      <Search className="w-3.5 h-3.5 text-purple-600" />
                      <input
                        type="text"
                        value={chatSearchQuery}
                        onChange={(e) => setChatSearchQuery(e.target.value)}
                        placeholder="Tìm kiếm nội dung tin nhắn, file giáo trình, đề thi..."
                        className="flex-1 bg-transparent text-xs text-slate-800 focus:outline-none placeholder-purple-400"
                        autoFocus
                      />
                      {chatSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setChatSearchQuery('')}
                          className="text-purple-400 hover:text-purple-700 text-xs cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}

                  {/* Pinned Message Banner */}
                  {(() => {
                    const pinnedMsg = (activeGroup.messages || []).find((m) => m.id === activeGroup.pinnedMessageId);
                    if (!pinnedMsg) return null;
                    return (
                      <div className="px-4 py-2 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-200/90 flex items-center justify-between gap-3 text-xs shadow-2xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <Pin className="w-3.5 h-3.5 text-amber-600 fill-amber-600 shrink-0" />
                          <div className="truncate">
                            <span className="font-extrabold text-amber-900 mr-1.5">Đã ghim:</span>
                            <span className="text-amber-800 font-medium">
                              {pinnedMsg.text || pinnedMsg.attachment?.name || 'File đính kèm'}
                            </span>
                            <span className="text-[10px] text-amber-700/80 ml-2">
                              ({pinnedMsg.senderName} • {pinnedMsg.timestamp})
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleTogglePinMessage(pinnedMsg.id)}
                          className="text-amber-800 hover:text-amber-950 font-bold text-[11px] shrink-0 px-2 py-0.5 rounded-md hover:bg-amber-100 transition-colors flex items-center gap-1 cursor-pointer"
                          title="Bỏ ghim tin nhắn này"
                        >
                          <PinOff className="w-3 h-3" />
                          <span className="hidden sm:inline">Bỏ ghim</span>
                        </button>
                      </div>
                    );
                  })()}

                  {/* Chat Messages Stream with Distinct Slate Feed Wallpaper */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#f1f5f9]">
                    {/* Welcome Banner */}
                    <div className="p-3.5 bg-white/90 rounded-2xl border border-slate-200 text-center text-xs text-slate-600 space-y-1 shadow-2xs">
                      <p className="font-bold text-purple-900">
                        🎉 Chào mừng Quý Thầy/Cô đến với Phòng làm việc "{activeGroup.name}"
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {activeGroup.description}
                      </p>
                    </div>

                    {/* Filtered Messages Stream */}
                    {(activeGroup.messages || [])
                      .filter((msg) => {
                        if (!chatSearchQuery.trim()) return true;
                        const q = chatSearchQuery.toLowerCase();
                        return (
                          (msg.text && msg.text.toLowerCase().includes(q)) ||
                          (msg.attachment && msg.attachment.name.toLowerCase().includes(q)) ||
                          (msg.senderName && msg.senderName.toLowerCase().includes(q))
                        );
                      })
                      .map((msg) => {
                        if (msg.isSystem) {
                          return (
                            <div key={msg.id} className="flex justify-center my-2">
                              <span className="px-3.5 py-1 rounded-full bg-slate-200/90 text-slate-600 text-[11px] font-semibold flex items-center gap-1.5 border border-slate-300/70 shadow-2xs">
                                <Shield className="w-3 h-3 text-purple-700" />
                                <span>{msg.text}</span>
                                <span className="text-[9px] text-slate-400 font-mono ml-1">
                                  {msg.timestamp}
                                </span>
                              </span>
                            </div>
                          );
                        }

                        const isMe =
                          msg.senderEmail === currentUser?.email ||
                          msg.senderName === currentUser?.fullName;
                        const isPinned = activeGroup.pinnedMessageId === msg.id;
                        const myId = currentUser?.email || currentUser?.fullName || 'me';

                        return (
                          <div
                            key={msg.id}
                            className={`group relative flex gap-3 max-w-[85%] ${
                              isMe ? 'ml-auto flex-row-reverse' : 'mr-auto'
                            }`}
                          >
                            {/* Avatar */}
                            <div
                              className={`w-8 h-8 rounded-full ${
                                msg.avatarColor || 'bg-indigo-600'
                              } text-white text-xs font-bold flex items-center justify-center shrink-0 shadow-xs`}
                            >
                              {msg.senderName.slice(0, 2).toUpperCase()}
                            </div>

                            <div className={`space-y-1 relative ${isMe ? 'items-end text-right' : ''}`}>
                              {/* Sender Header */}
                              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                                <span className="font-bold text-slate-800">
                                  {msg.senderName}
                                </span>
                                {msg.senderTitle && (
                                  <span className="px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded text-[9px] font-semibold border border-slate-200">
                                    {msg.senderTitle}
                                  </span>
                                )}
                                <span className="text-[10px] font-mono text-slate-400">
                                  {msg.timestamp}
                                </span>
                                {isPinned && (
                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded text-[9px] font-bold border border-amber-200">
                                    <Pin className="w-2.5 h-2.5 fill-amber-700" />
                                    <span>Đã ghim</span>
                                  </span>
                                )}
                              </div>

                              {/* Text Message Bubble */}
                              {msg.text && (
                                <div
                                  className={`p-3.5 rounded-2xl text-xs leading-relaxed text-left transition-all relative ${
                                    isMe
                                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-tr-none shadow-xs font-medium'
                                      : 'bg-white text-slate-800 border border-slate-200/90 rounded-tl-none shadow-2xs'
                                  }`}
                                >
                                  {msg.text}
                                </div>
                              )}

                              {/* Textbook Attachment Card */}
                              {msg.attachment?.type === 'textbook' && (
                                <div className="p-3.5 bg-white rounded-2xl border-2 border-teal-500/30 shadow-xs space-y-2.5 text-left mt-1.5 max-w-sm">
                                  <div className="flex items-start gap-2.5">
                                    <div className="w-9 h-9 rounded-xl bg-[#008689] text-white flex items-center justify-center shrink-0 shadow-2xs">
                                      <BookOpen className="w-4.5 h-4.5" />
                                    </div>
                                    <div className="min-w-0">
                                      <span className="text-[10px] font-black uppercase tracking-wider text-[#008689] block">
                                        Giáo trình đính kèm
                                      </span>
                                      <div className="font-bold text-xs text-slate-900 truncate" title={msg.attachment.name}>
                                        {msg.attachment.name}
                                      </div>
                                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                                        {msg.attachment.totalPages} trang • {msg.attachment.size}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        localStorage.setItem('quizgen_selected_book_id', msg.attachment?.id || '');
                                        localStorage.setItem('quizgen_selected_book_name', msg.attachment?.name || '');
                                        onShowToast('success', 'Đã Chọn Giáo Trình Nhóm', `Đang chuyển sang sinh đề với "${msg.attachment?.name}"...`);
                                        onNavigate('generate');
                                      }}
                                      className="flex-1 px-3 py-2 bg-[#008689] hover:bg-[#007073] text-white rounded-xl font-bold text-xs shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                                    >
                                      <Zap className="w-3.5 h-3.5 text-amber-200 fill-amber-200" />
                                      <span>Dùng Sinh Đề Ngay</span>
                                    </button>
                                  </div>
                                </div>
                              )}

                              {/* Exam Attachment Card */}
                              {msg.attachment?.type === 'exam' && (
                                <div className="p-3.5 bg-white rounded-2xl border-2 border-indigo-500/30 shadow-xs space-y-2.5 text-left mt-1.5 max-w-sm">
                                  <div className="flex items-start gap-2.5">
                                    <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                                      <FileCheck2 className="w-4.5 h-4.5" />
                                    </div>
                                    <div className="min-w-0">
                                      <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 block">
                                        Bộ đề thi trắc nghiệm AI
                                      </span>
                                      <div className="font-bold text-xs text-slate-900 truncate" title={msg.attachment.name}>
                                        {msg.attachment.name}
                                      </div>
                                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                                        Môn: {msg.attachment.subject} • {msg.attachment.questionCount} câu • {msg.attachment.durationMinutes} phút
                                      </div>
                                    </div>
                                  </div>

                                  <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        onShowToast('success', 'Đã Nạp Đề Thi Nhóm', `Đang mở bộ đề "${msg.attachment?.name}" trong Bước 4 Đóng gói & Xuất đề...`);
                                        onNavigate('bank');
                                      }}
                                      className="flex-1 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                                    >
                                      <CheckSquare className="w-3.5 h-3.5" />
                                      <span>Nạp Vào Biên Tập &amp; Xuất Đề</span>
                                    </button>
                                  </div>
                                </div>
                              )}

                              {/* Emoji Reactions List below bubble */}
                              {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                                <div className={`flex flex-wrap gap-1 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                                  {Object.entries(msg.reactions).map(([emoji, users]) => {
                                    if (users.length === 0) return null;
                                    const userReacted = users.includes(myId);
                                    return (
                                      <button
                                        key={emoji}
                                        type="button"
                                        onClick={() => handleToggleReaction(msg.id, emoji)}
                                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border transition-all cursor-pointer ${
                                          userReacted
                                            ? 'bg-purple-100 text-purple-900 border-purple-300 shadow-2xs'
                                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 shadow-2xs'
                                        }`}
                                        title={`${users.length} người đã thả ${emoji}`}
                                      >
                                        <span>{emoji}</span>
                                        <span className="text-[10px]">{users.length}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              )}

                              {/* Slack/Messenger Hover Action Toolbar */}
                              <div
                                className={`opacity-0 group-hover:opacity-100 transition-opacity absolute top-0 ${
                                  isMe ? 'left-0 -translate-x-full pr-2' : 'right-0 translate-x-full pl-2'
                                } flex items-center gap-1 bg-white border border-slate-200 rounded-xl px-1.5 py-1 shadow-md z-20`}
                              >
                                {/* Quick Emoji React Buttons */}
                                {['👍', '❤️', '👏', '💡', '🔥'].map((em) => (
                                  <button
                                    key={em}
                                    type="button"
                                    onClick={() => handleToggleReaction(msg.id, em)}
                                    className="p-1 hover:bg-slate-100 rounded-md text-xs transition-colors cursor-pointer"
                                    title={`Thả ${em}`}
                                  >
                                    {em}
                                  </button>
                                ))}

                                <div className="w-[1px] h-3.5 bg-slate-200 mx-0.5" />

                                {/* Pin/Unpin */}
                                <button
                                  type="button"
                                  onClick={() => handleTogglePinMessage(msg.id)}
                                  className={`p-1 rounded-md transition-colors cursor-pointer ${
                                    isPinned
                                      ? 'text-amber-600 hover:bg-amber-50'
                                      : 'text-slate-500 hover:bg-slate-100'
                                  }`}
                                  title={isPinned ? 'Bỏ ghim tin nhắn' : 'Ghim tin nhắn'}
                                >
                                  <Pin className="w-3 h-3" />
                                </button>

                                {/* Delete Message */}
                                {(isMe || isOwner) && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteMessage(msg.id)}
                                    className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                                    title="Xóa tin nhắn này"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    <div ref={chatMessagesEndRef} />
                  </div>

                  {/* Chat Input Bar */}
                  <div className="p-3.5 border-t border-slate-200 bg-white relative z-10 shadow-sm">
                    {/* Attachment Quick Menu Popup */}
                    {isAttachMenuOpen && (
                      <div className="absolute bottom-16 left-4 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 space-y-1 z-30 animate-in fade-in duration-100">
                        <button
                          type="button"
                          onClick={() => {
                            setIsAttachMenuOpen(false);
                            setIsAttachTextbookModalOpen(true);
                          }}
                          className="w-full text-left px-3.5 py-2 rounded-xl hover:bg-teal-50 text-slate-700 hover:text-[#008689] text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer"
                        >
                          <BookOpen className="w-4 h-4 text-[#008689]" />
                          <span>Đính kèm Giáo trình từ Kho của tôi</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsAttachMenuOpen(false);
                            setIsAttachExamModalOpen(true);
                          }}
                          className="w-full text-left px-3.5 py-2 rounded-xl hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer"
                        >
                          <FileCheck2 className="w-4 h-4 text-indigo-600" />
                          <span>Đính kèm Bộ Đề Thi đã soạn</span>
                        </button>
                      </div>
                    )}

                    <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsAttachMenuOpen((prev) => !prev)}
                        className={`p-2.5 rounded-xl border transition-colors cursor-pointer ${
                          isAttachMenuOpen
                            ? 'bg-purple-100 border-purple-300 text-purple-700'
                            : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600'
                        }`}
                        title="Đính kèm Giáo trình hoặc Đề thi"
                      >
                        <Paperclip className="w-4 h-4" />
                      </button>

                      <input
                        type="text"
                        value={chatInputText}
                        onChange={(e) => setChatInputText(e.target.value)}
                        placeholder="Nhập trao đổi học thuật, đóng góp ma trận câu hỏi với các thầy cô... (Enter để gửi)"
                        className="flex-1 px-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-purple-600 text-slate-800 placeholder-slate-400"
                      />

                      <button
                        type="submit"
                        disabled={!chatInputText.trim()}
                        className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Gửi</span>
                      </button>
                    </form>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 space-y-2">
                  <FolderGit2 className="w-12 h-12 text-slate-300" />
                  <p className="font-bold text-sm text-slate-600">Chưa chọn nhóm Q-Group</p>
                  <p className="text-xs">Vui lòng chọn hoặc tạo nhóm ở thanh bên trái để bắt đầu trao đổi.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODALS: OWNER SETTINGS & APPROVALS, ATTACH TEXTBOOK, ATTACH EXAM
      ========================================================================= */}

      {/* Modal A: Owner Settings & Member Approvals */}
      {isOwnerSettingsModalOpen && activeGroup && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-purple-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center">
                  <Settings className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">
                    Quản Lý Q-Group: {activeGroup.name}
                  </h3>
                  <p className="text-[11px] text-purple-700 font-mono">
                    Mã phòng: {activeGroup.code} • Trưởng nhóm: {activeGroup.ownerName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOwnerSettingsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Sub-tabs inside Group Settings */}
            <div className="flex border-b border-slate-200 bg-slate-50/50 px-4 pt-2 gap-1.5 text-xs font-bold overflow-x-auto">
              <button
                type="button"
                onClick={() => setOwnerSettingsTab('info')}
                className={`pb-2.5 px-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  ownerSettingsTab === 'info'
                    ? 'border-purple-600 text-purple-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Thông Tin Nhóm</span>
              </button>

              <button
                type="button"
                onClick={() => setOwnerSettingsTab('members')}
                className={`pb-2.5 px-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  ownerSettingsTab === 'members'
                    ? 'border-purple-600 text-purple-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Thành Viên ({activeGroup.members.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setOwnerSettingsTab('policy')}
                className={`pb-2.5 px-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  ownerSettingsTab === 'policy'
                    ? 'border-purple-600 text-purple-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Chính Sách Vào Phòng</span>
              </button>

              <button
                type="button"
                onClick={() => setOwnerSettingsTab('requests')}
                className={`pb-2.5 px-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  ownerSettingsTab === 'requests'
                    ? 'border-purple-600 text-purple-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Chờ Duyệt</span>
                {(activeGroup.pendingRequests || []).length > 0 && (
                  <span className="w-4 h-4 rounded-full bg-rose-600 text-white text-[9px] flex items-center justify-center font-bold">
                    {activeGroup.pendingRequests.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setOwnerSettingsTab('danger')}
                className={`pb-2.5 px-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  ownerSettingsTab === 'danger'
                    ? 'border-rose-600 text-rose-700'
                    : 'border-transparent text-slate-500 hover:text-rose-600'
                }`}
              >
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Rời / Xóa Nhóm</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
              {/* Tab 1: Info & Edit */}
              {ownerSettingsTab === 'info' && (
                <form onSubmit={handleSaveGroupInfo} className="space-y-4">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1.5">
                      Tên Q-Group:
                    </label>
                    <input
                      type="text"
                      required
                      disabled={!isOwner}
                      value={editGroupName}
                      onChange={(e) => setEditGroupName(e.target.value)}
                      placeholder="Ví dụ: Bộ Môn Mạng & Hệ Điều Hành..."
                      className="w-full px-3.5 py-2 text-xs bg-slate-50 disabled:bg-slate-100 disabled:cursor-not-allowed border border-slate-200 rounded-xl focus:outline-none focus:border-purple-600 text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1.5">
                      Khoa / Ban Chuyên Ngành:
                    </label>
                    <input
                      type="text"
                      disabled={!isOwner}
                      value={editGroupDept}
                      onChange={(e) => setEditGroupDept(e.target.value)}
                      placeholder="Ví dụ: Khoa Công nghệ Thông tin..."
                      className="w-full px-3.5 py-2 text-xs bg-slate-50 disabled:bg-slate-100 disabled:cursor-not-allowed border border-slate-200 rounded-xl focus:outline-none focus:border-purple-600 text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1.5">
                      Mô Tả &amp; Mục Đích Nhóm:
                    </label>
                    <textarea
                      rows={3}
                      disabled={!isOwner}
                      value={editGroupDesc}
                      onChange={(e) => setEditGroupDesc(e.target.value)}
                      placeholder="Mô tả phạm vi chia sẻ học liệu, biên soạn đề thi..."
                      className="w-full px-3.5 py-2 text-xs bg-slate-50 disabled:bg-slate-100 disabled:cursor-not-allowed border border-slate-200 rounded-xl focus:outline-none focus:border-purple-600 text-slate-900 resize-none"
                    />
                  </div>

                  {isOwner ? (
                    <div className="pt-2 flex justify-end">
                      <button
                        type="submit"
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Lưu Thay Đổi Thông Tin</span>
                      </button>
                    </div>
                  ) : (
                    <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-[11px]">
                      ℹ️ Thầy/Cô đang tham gia với vai trò Thành viên. Chỉ Trưởng nhóm ({activeGroup.ownerName}) mới có quyền chỉnh sửa thông tin nhóm.
                    </div>
                  )}
                </form>
              )}

              {/* Tab 2: Members & Management */}
              {ownerSettingsTab === 'members' && (
                <div className="space-y-4">
                  {/* Direct Add Member Form (For Owner) */}
                  {isOwner && (
                    <form onSubmit={handleAddDirectMember} className="flex gap-2">
                      <input
                        type="email"
                        required
                        value={directMemberEmailInput}
                        onChange={(e) => setDirectMemberEmailInput(e.target.value)}
                        placeholder="Nhập email đồng nghiệp cần thêm (ví dụ: gv@ut.edu.vn)..."
                        className="flex-1 px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-purple-600"
                      />
                      <button
                        type="submit"
                        className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold transition-all cursor-pointer shadow-xs shrink-0 flex items-center gap-1"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Thêm Vào Nhóm</span>
                      </button>
                    </form>
                  )}

                  <div className="space-y-2 pt-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Danh Sách Thành Viên ({activeGroup.members.length}):
                    </span>
                    {activeGroup.members.map((email, idx) => {
                      const isMemberOwner = email === activeGroup.ownerEmail;
                      return (
                        <div
                          key={idx}
                          className="p-3 bg-slate-50/80 rounded-2xl border border-slate-200 flex items-center justify-between text-xs gap-2"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-7 h-7 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                              {email.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <span className="font-mono text-slate-800 font-semibold block truncate">
                                {email}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {isMemberOwner ? 'Quản trị viên / Trưởng nhóm' : 'Thành viên tham gia'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {email !== (currentUser?.email || '').toLowerCase() && (
                              <button
                                type="button"
                                onClick={() => handleStartDirectMessage(email)}
                                className="px-2 py-1 bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg text-[10px] font-bold transition-colors cursor-pointer flex items-center gap-1"
                                title="Nhắn tin riêng 1-1 với đồng nghiệp này"
                              >
                                <MessageSquare className="w-2.5 h-2.5" />
                                <span>Nhắn riêng</span>
                              </button>
                            )}
                            {isMemberOwner ? (
                              <span className="px-2.5 py-0.5 rounded-full text-[9px] font-extrabold bg-purple-100 text-purple-800 border border-purple-200">
                                Trưởng nhóm
                              </span>
                            ) : (
                              <>
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-200 text-slate-600">
                                  Thành viên
                                </span>
                                {isOwner && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleTransferOwner(email)}
                                      className="px-2 py-1 bg-white hover:bg-purple-50 text-purple-700 border border-purple-200 rounded-lg text-[10px] font-bold transition-colors cursor-pointer"
                                      title="Chuyển giao quyền Trưởng nhóm cho thành viên này"
                                    >
                                      Nhượng quyền
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleKickMember(email)}
                                      className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                                      title="Xóa / Kick thành viên này khỏi nhóm"
                                    >
                                      <UserX className="w-3.5 h-3.5" />
                                    </button>
                                  </>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Tab 3: Policy */}
              {ownerSettingsTab === 'policy' && (
                <div className="space-y-4">
                  <div className="text-slate-600 text-xs">
                    Thiết lập cách thức đồng nghiệp có thể tham gia vào nhóm làm việc này:
                  </div>

                  <div className="space-y-2.5">
                    <label
                      onClick={() => isOwner && handleUpdatePolicy(activeGroup.id, 'open')}
                      className={`p-3.5 rounded-2xl border flex items-start gap-3 transition-all ${
                        !isOwner ? 'opacity-80 cursor-not-allowed' : 'cursor-pointer'
                      } ${
                        activeGroup.joinPolicy === 'open'
                          ? 'bg-purple-50/80 border-purple-400 shadow-xs'
                          : 'bg-white border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="joinPolicy"
                        disabled={!isOwner}
                        checked={activeGroup.joinPolicy === 'open'}
                        onChange={() => isOwner && handleUpdatePolicy(activeGroup.id, 'open')}
                        className="mt-1 text-purple-600"
                      />
                      <div>
                        <strong className="text-slate-900 block text-xs">
                          🟢 Tự Do Gia Nhập Qua Mã (Open)
                        </strong>
                        <span className="text-[11px] text-slate-500 leading-snug block mt-0.5">
                          Bất kỳ ai nhập đúng mã nhóm <strong>{activeGroup.code}</strong> đều được vào ngay mà không cần phê duyệt.
                        </span>
                      </div>
                    </label>

                    <label
                      onClick={() => isOwner && handleUpdatePolicy(activeGroup.id, 'approval_required')}
                      className={`p-3.5 rounded-2xl border flex items-start gap-3 transition-all ${
                        !isOwner ? 'opacity-80 cursor-not-allowed' : 'cursor-pointer'
                      } ${
                        activeGroup.joinPolicy === 'approval_required'
                          ? 'bg-purple-50/80 border-purple-400 shadow-xs'
                          : 'bg-white border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="joinPolicy"
                        disabled={!isOwner}
                        checked={activeGroup.joinPolicy === 'approval_required'}
                        onChange={() => isOwner && handleUpdatePolicy(activeGroup.id, 'approval_required')}
                        className="mt-1 text-purple-600"
                      />
                      <div>
                        <strong className="text-slate-900 block text-xs">
                          🟡 Cần Trưởng Nhóm Phê Duyệt (Approval Required)
                        </strong>
                        <span className="text-[11px] text-slate-500 leading-snug block mt-0.5">
                          Đồng nghiệp nhập mã sẽ vào trạng thái Chờ Duyệt. Trưởng nhóm duyệt thì mới được vào phòng chat.
                        </span>
                      </div>
                    </label>

                    <label
                      onClick={() => isOwner && handleUpdatePolicy(activeGroup.id, 'email_only')}
                      className={`p-3.5 rounded-2xl border flex items-start gap-3 transition-all ${
                        !isOwner ? 'opacity-80 cursor-not-allowed' : 'cursor-pointer'
                      } ${
                        activeGroup.joinPolicy === 'email_only'
                          ? 'bg-purple-50/80 border-purple-400 shadow-xs'
                          : 'bg-white border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="joinPolicy"
                        disabled={!isOwner}
                        checked={activeGroup.joinPolicy === 'email_only'}
                        onChange={() => isOwner && handleUpdatePolicy(activeGroup.id, 'email_only')}
                        className="mt-1 text-purple-600"
                      />
                      <div>
                        <strong className="text-slate-900 block text-xs">
                          🔒 Khóa Mã - Chỉ Mời Đích Danh Qua Email (Email Only)
                        </strong>
                        <span className="text-[11px] text-slate-500 leading-snug block mt-0.5">
                          Vô hiệu hóa việc nhập mã bên ngoài. Chỉ những ai được Trưởng nhóm thêm trực tiếp qua Email mới vào được.
                        </span>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {/* Tab 4: Requests */}
              {ownerSettingsTab === 'requests' && (
                <div className="space-y-3">
                  <div className="text-slate-500 text-[11px]">
                    Giảng viên nhập mã phòng khi nhóm ở chế độ <strong>"Cần duyệt"</strong> sẽ xuất hiện tại đây. Trưởng nhóm bấm "Duyệt" để cấp quyền gia nhập.
                  </div>

                  {(activeGroup.pendingRequests || []).length === 0 ? (
                    <div className="py-8 text-center text-slate-400 border border-dashed border-slate-200 rounded-2xl">
                      <UserCheck className="w-7 h-7 mx-auto mb-2 text-slate-300" />
                      Không có yêu cầu nào đang chờ phê duyệt.
                    </div>
                  ) : (
                    (activeGroup.pendingRequests || []).map((req) => (
                      <div
                        key={req.id}
                        className="p-3 bg-white rounded-2xl border border-slate-200 flex items-center justify-between gap-3 shadow-2xs"
                      >
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 text-xs">{req.name}</div>
                          <div className="text-[11px] text-purple-700 font-mono">{req.email}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">Yêu cầu lúc: {req.requestedAt}</div>
                        </div>

                        {isOwner ? (
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleRejectRequest(activeGroup.id, req.id)}
                              className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-rose-600 hover:bg-rose-50 font-bold transition-colors cursor-pointer"
                            >
                              Từ Chối
                            </button>
                            <button
                              type="button"
                              onClick={() => handleApproveRequest(activeGroup.id, req.id)}
                              className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold transition-colors cursor-pointer shadow-xs flex items-center gap-1"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                              <span>Duyệt Cho Vào</span>
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-semibold">Chờ Trưởng nhóm duyệt</span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Tab 5: Danger Zone (Leave / Delete) */}
              {ownerSettingsTab === 'danger' && (
                <div className="space-y-4">
                  {/* Option 1: Leave Group */}
                  <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-2">
                    <div className="flex items-center gap-2 text-slate-900 font-bold">
                      <LogOut className="w-4 h-4 text-slate-600" />
                      <span>Rời Khỏi Nhóm Này</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Thầy/Cô sẽ không còn nhận được các tin nhắn trao đổi, giáo trình và bộ đề thi trong nhóm này nữa.
                    </p>
                    <button
                      type="button"
                      onClick={handleLeaveGroup}
                      className="px-3.5 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Rời Khỏi Q-Group</span>
                    </button>
                  </div>

                  {/* Option 2: Delete Group (Owner Only) */}
                  {isOwner && (
                    <div className="p-4 rounded-2xl border-2 border-rose-200 bg-rose-50/60 space-y-3">
                      <div className="flex items-center gap-2 text-rose-800 font-extrabold">
                        <Trash2 className="w-4 h-4 text-rose-600" />
                        <span>Giải Tán &amp; Xóa Vĩnh Viễn Q-Group</span>
                      </div>
                      <p className="text-[11px] text-rose-700 leading-relaxed">
                        Hành động này sẽ xóa toàn bộ lịch sử trao đổi, liên kết tài liệu trong phòng và loại bỏ tất cả thành viên. Dữ liệu sau khi xóa sẽ không thể khôi phục!
                      </p>

                      {isConfirmDeleteGroupOpen ? (
                        <div className="p-3 bg-white rounded-xl border border-rose-300 space-y-2">
                          <p className="font-bold text-rose-900 text-xs">
                            Thầy/Cô có chắc chắn muốn giải tán nhóm "{activeGroup.name}"?
                          </p>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={handleDeleteGroup}
                              className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-colors cursor-pointer shadow-xs"
                            >
                              Xác Nhận Giải Tán
                            </button>
                            <button
                              type="button"
                              onClick={() => setIsConfirmDeleteGroupOpen(false)}
                              className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 font-semibold text-xs transition-colors cursor-pointer"
                            >
                              Hủy Bỏ
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setIsConfirmDeleteGroupOpen(true)}
                          className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Giải Tán &amp; Xóa Nhóm</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={() => setIsOwnerSettingsModalOpen(false)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal B: Attach Textbook to Chat */}
      {isAttachTextbookModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-teal-50/50">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#008689]" />
                <h3 className="font-extrabold text-slate-900 text-xs">
                  Chọn Giáo Trình Để Chia Sẻ Vào Nhóm
                </h3>
              </div>
              <button onClick={() => setIsAttachTextbookModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-2 flex-1 text-xs">
              {textbooks.length === 0 ? (
                <div className="py-8 text-center text-slate-400">
                  Kho của bạn chưa có giáo trình nào. Vui lòng tải lên giáo trình trước!
                </div>
              ) : (
                textbooks.map((book) => (
                  <div
                    key={book.id}
                    className="p-3 rounded-2xl border border-slate-200 hover:border-teal-300 bg-white flex items-center justify-between gap-3 shadow-2xs"
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 text-xs truncate" title={book.name}>
                        {book.name}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {book.totalPages} trang • {book.size}
                      </div>
                    </div>

                    <button
                      onClick={() => handleShareTextbookToChat(book)}
                      className="px-3 py-1.5 bg-[#008689] hover:bg-[#007073] text-white rounded-xl font-bold text-xs shrink-0 shadow-xs transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <Send className="w-3 h-3" />
                      <span>Gửi Vào Nhóm</span>
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="p-3 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={() => setIsAttachTextbookModalOpen(false)}
                className="px-4 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs"
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal C: Attach Exam to Chat */}
      {isAttachExamModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-indigo-50/50">
              <div className="flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-indigo-600" />
                <h3 className="font-extrabold text-slate-900 text-xs">
                  Chọn Bộ Đề Thi Để Chia Sẻ Vào Nhóm
                </h3>
              </div>
              <button onClick={() => setIsAttachExamModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-2 flex-1 text-xs">
              {getSavedExams().map((exam) => (
                <div
                  key={exam.id}
                  className="p-3 rounded-2xl border border-slate-200 hover:border-indigo-300 bg-white flex items-center justify-between gap-3 shadow-2xs"
                >
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 text-xs truncate" title={exam.title}>
                      {exam.title}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      Môn: {exam.subject} • {exam.questionCount || 40} câu • {exam.durationMinutes || 60} phút
                    </div>
                  </div>

                  <button
                    onClick={() => handleShareExamToChat(exam)}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shrink-0 shadow-xs transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <Send className="w-3 h-3" />
                    <span>Gửi Đề Vào Nhóm</span>
                  </button>
                </div>
              ))}
            </div>

            <div className="p-3 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={() => setIsAttachExamModalOpen(false)}
                className="px-4 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs"
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODALS: CREATE QGROUP, JOIN GROUP, DIRECT EMAIL SHARE
      ========================================================================= */}
      
      {/* Modal: New 1-1 Direct Message */}
      {isNewDirectModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-indigo-600" />
                <h3 className="font-extrabold text-slate-900 text-sm">Nhắn Tin Riêng 1-1 Với Đồng Nghiệp</h3>
              </div>
              <button onClick={() => setIsNewDirectModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!directPartnerInput.trim()) return;
                  handleStartDirectMessage(directPartnerInput.trim());
                }}
                className="space-y-3"
              >
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Nhập email đồng nghiệp cần nhắn tin:
                  </label>
                  <input
                    type="email"
                    required
                    value={directPartnerInput}
                    onChange={(e) => setDirectPartnerInput(e.target.value)}
                    placeholder="Ví dụ: vuha3608@ut.edu.vn hoặc đồng nghiệp..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-indigo-600 text-slate-900"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Bắt Đầu Trò Chuyện 1-1</span>
                </button>
              </form>

              {/* Danh sách đồng nghiệp gợi ý từ các nhóm hiện tại */}
              {(() => {
                const myEmailNorm = (currentUser?.email || '').toLowerCase().replace('@gmai.com', '@gmail.com');
                const suggestedEmails = Array.from(
                  new Set(
                    qgroups
                      .flatMap((g) => g.members || [])
                      .map((m) => m.toLowerCase().replace('@gmai.com', '@gmail.com'))
                      .filter((m) => m && m !== myEmailNorm && !m.includes('lecturer@quizgen.ai'))
                  )
                );

                if (suggestedEmails.length === 0) return null;

                return (
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <span className="font-bold text-slate-500 text-[10px] uppercase tracking-wider block">
                      Hoặc chọn nhanh đồng nghiệp cùng bộ môn:
                    </span>
                    <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                      {suggestedEmails.map((email) => (
                        <div
                          key={email}
                          onClick={() => handleStartDirectMessage(email)}
                          className="p-2.5 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded-xl flex items-center justify-between cursor-pointer transition-colors"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                              {email.slice(0, 2).toUpperCase()}
                            </div>
                            <span className="font-mono text-slate-800 font-semibold truncate text-[11px]">
                              {email}
                            </span>
                          </div>
                          <span className="text-[10px] text-indigo-600 font-bold hover:underline shrink-0">
                            Nhắn tin &rarr;
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Modal 1: Create Q-Group */}
      {isCreateGroupModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-600" />
                <h3 className="font-extrabold text-slate-900 text-sm">Tạo Q-Group Chuyên Môn Mới</h3>
              </div>
              <button onClick={() => setIsCreateGroupModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateQGroup} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Tên nhóm chuyên môn / bộ môn *</label>
                <input
                  type="text"
                  required
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="Ví dụ: Bộ Môn Mạng Máy Tính K22..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-purple-600"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Khoa / Đơn vị trực thuộc</label>
                <input
                  type="text"
                  value={newGroupDept}
                  onChange={(e) => setNewGroupDept(e.target.value)}
                  placeholder="Ví dụ: Khoa Công nghệ Thông tin..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-purple-600"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Mục đích hoạt động của nhóm</label>
                <textarea
                  value={newGroupDesc}
                  onChange={(e) => setNewGroupDesc(e.target.value)}
                  placeholder="Ví dụ: Cùng soạn thảo đề thi, kiểm thử câu hỏi trắc nghiệm và dùng chung giáo trình..."
                  rows={2}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-purple-600 resize-none"
                />
              </div>

              {/* Join Policy Selection on Create */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Chính sách vào phòng mặc định:</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="newGroupPolicy"
                      value="approval_required"
                      checked={newGroupPolicy === 'approval_required'}
                      onChange={() => setNewGroupPolicy('approval_required')}
                      className="text-purple-600"
                    />
                    <span>🟡 <strong>Cần duyệt:</strong> Giảng viên nhập mã phải được bạn phê duyệt</span>
                  </label>
                  <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="newGroupPolicy"
                      value="open"
                      checked={newGroupPolicy === 'open'}
                      onChange={() => setNewGroupPolicy('open')}
                      className="text-purple-600"
                    />
                    <span>🟢 <strong>Tự do:</strong> Bất kỳ ai có mã đều vào ngay</span>
                  </label>
                  <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="newGroupPolicy"
                      value="email_only"
                      checked={newGroupPolicy === 'email_only'}
                      onChange={() => setNewGroupPolicy('email_only')}
                      className="text-purple-600"
                    />
                    <span>🔒 <strong>Riêng tư:</strong> Chỉ mời đích danh qua Email</span>
                  </label>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateGroupModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 font-bold text-slate-600"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold shadow-xs"
                >
                  Xác Nhận Tạo Nhóm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Join Q-Group by Code */}
      {isJoinGroupModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-purple-600" />
                <h3 className="font-extrabold text-slate-900 text-sm">Tham Gia Q-Group Bằng Mã</h3>
              </div>
              <button onClick={() => setIsJoinGroupModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleJoinQGroup} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nhập Mã Nhóm (Group Code) *</label>
                <input
                  type="text"
                  required
                  value={joinGroupCodeInput}
                  onChange={(e) => setJoinGroupCodeInput(e.target.value.toUpperCase())}
                  placeholder="Ví dụ: QGRP-OS2026..."
                  className="w-full p-2.5 uppercase font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-purple-600 text-center tracking-wider text-sm"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsJoinGroupModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 font-bold text-slate-600"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold shadow-xs"
                >
                  Gia Nhập
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Direct Share to Colleague via Email */}
      {isShareEmailModalOpen && selectedBookForEmail && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-indigo-600" />
                <h3 className="font-extrabold text-slate-900 text-sm">Gửi Riêng Giáo Trình Qua Email</h3>
              </div>
              <button onClick={() => setIsShareEmailModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-indigo-50/60 rounded-2xl border border-indigo-100 text-xs flex items-center gap-2.5">
              <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
              <div className="truncate">
                <strong className="text-slate-900 block truncate">{selectedBookForEmail.name}</strong>
                <span className="text-[10px] text-slate-500 font-mono">{selectedBookForEmail.size} • {selectedBookForEmail.totalPages} trang</span>
              </div>
            </div>

            <form onSubmit={handleSendDirectEmailShare} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Email giảng viên đồng nghiệp *</label>
                <input
                  type="email"
                  required
                  value={targetColleagueEmail}
                  onChange={(e) => setTargetColleagueEmail(e.target.value)}
                  placeholder="Ví dụ: colleague@ut.edu.vn..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Lời nhắn gửi kèm (Tùy chọn)</label>
                <textarea
                  value={shareEmailMessage}
                  onChange={(e) => setShareEmailMessage(e.target.value)}
                  placeholder="Gửi Thầy/Cô giáo trình để tham khảo sinh đề thi giữa kỳ..."
                  rows={2}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-indigo-600 resize-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsShareEmailModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 font-bold text-slate-600"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-xs flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Xác Nhận Gửi</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Semantic Chunk Inspection Modal */}
      {inspectingBook && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-[#f8fbfc]">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#e0f7fa] border border-[#008689]/25 text-[#008689] flex items-center justify-center">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-xs">{inspectingBook.name}</h3>
                  <p className="text-[11px] text-slate-500 font-mono">
                    {inspectingBook.totalPages} trang • {inspectingBook.chaptersCount} chương
                  </p>
                </div>
              </div>
              <button
                onClick={() => setInspectingBook(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-3 flex-1 bg-white">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Mục lục &amp; Trích đoạn giáo trình (20 đoạn tiêu biểu)
                </span>
                {isFetchingChunks && (
                  <span className="text-[11px] text-[#008689] flex items-center space-x-1 font-mono">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    <span>Đang trích xuất nội dung...</span>
                  </span>
                )}
              </div>

              {!isFetchingChunks && inspectingChunks.length === 0 && (
                <div className="text-center py-8 text-slate-400 text-xs">
                  Nội dung giáo trình đang trong tiến trình xử lý mục lục.
                </div>
              )}

              {inspectingChunks.map((chunk, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs text-slate-700 leading-relaxed font-mono"
                >
                  {chunk}
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={() => setInspectingBook(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TextbookUploadScreen;
