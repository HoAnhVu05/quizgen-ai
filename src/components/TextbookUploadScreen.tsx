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
  FolderGit2
} from 'lucide-react';
import { TextbookFile, ScreenId, UserSubscriptionInfo, UserProfile } from '../types';
import apiClient from '../services/apiClient';

interface TextbookUploadScreenProps {
  onNavigate: (screen: ScreenId) => void;
  onShowToast: (type: 'success' | 'info' | 'warning' | 'error', title: string, message: string) => void;
  subscriptionInfo?: UserSubscriptionInfo | null;
  currentUser?: UserProfile | null;
  onOpenPricingModal?: () => void;
}

interface QGroup {
  id: string;
  code: string;
  name: string;
  department: string;
  description: string;
  memberCount: number;
  members: string[];
  documentsCount: number;
  sharedBooks: Array<{
    id: string;
    name: string;
    sharedBy: string;
    totalPages: number;
    size: string;
    sharedAt: string;
  }>;
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
  onOpenPricingModal,
}) => {
  const [activeTab, setActiveTab] = useState<'my' | 'library' | 'qgroup'>('my');
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
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      {
        id: 'qg-1',
        code: 'QGRP-OS2026',
        name: 'Bộ Môn Mạng & Hệ Điều Hành',
        department: 'Khoa Công nghệ Thông tin',
        description: 'Nhóm chuyên môn biên soạn giáo trình và ngân hàng câu hỏi môn Hệ Điều Hành & Mạng Máy Tính.',
        memberCount: 5,
        members: ['vuha3608@ut.edu.vn', 'nguyentann0804@gmail.com', 'ducngocong@ut.edu.vn'],
        documentsCount: 2,
        sharedBooks: [
          {
            id: 'tb-002',
            name: '2018-Operating System Concepts-10th.pdf',
            sharedBy: 'TS. Hồ Anh Vũ',
            totalPages: 1278,
            size: '29.7 MB',
            sharedAt: '17/11/2026'
          }
        ]
      },
      {
        id: 'qg-2',
        code: 'QGRP-LLCT2026',
        name: 'Tổ Bộ Môn Lý Luận Chính Trị',
        department: 'Khoa Lý luận Chính trị',
        description: 'Hội nhóm sinh đề thi và đối soát trích dẫn môn Tư tưởng Hồ Chí Minh & Triết học Mác - Lênin.',
        memberCount: 4,
        members: ['hanbich1506@gmail.com', 'hieuhieu2211@gmail.com'],
        documentsCount: 1,
        sharedBooks: [
          {
            id: 'tb-001',
            name: 'BAI GIANG Tu tuong HCM - LLCT.pdf',
            sharedBy: 'ThS. Hân Bích',
            totalPages: 102,
            size: '3.5 MB',
            sharedAt: '17/11/2026'
          }
        ]
      }
    ];
  });

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

  const saveQgroups = (groups: QGroup[]) => {
    setQgroups(groups);
    try {
      localStorage.setItem('quizgen_qgroups', JSON.stringify(groups));
    } catch {}
  };

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
      onShowToast('success', 'Nạp Giáo Trình Thành Công', `Giáo trình ${file.name} đã được đưa vào tiến trình trích xuất RAG.`);
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

  // Q-Group Handlers
  const handleCreateQGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;

    const generatedCode = `QGRP-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    const newGroup: QGroup = {
      id: `qg-${Date.now()}`,
      code: generatedCode,
      name: newGroupName.trim(),
      department: newGroupDept.trim() || 'Khoa Chuyên Ngành',
      description: newGroupDesc.trim() || 'Nhóm chuyên môn biên soạn và chia sẻ học liệu.',
      memberCount: 1,
      members: [currentUser?.email || 'my-account@quizgen.ai'],
      documentsCount: 0,
      sharedBooks: []
    };

    const updated = [newGroup, ...qgroups];
    saveQgroups(updated);
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
    if (targetGroup.members.includes(myEmail)) {
      onShowToast('info', 'Đã tham gia', 'Thầy/Cô đã là thành viên của Q-Group này.');
      setIsJoinGroupModalOpen(false);
      return;
    }

    const updated = qgroups.map((g) => {
      if (g.code === code) {
        return {
          ...g,
          memberCount: g.memberCount + 1,
          members: [...g.members, myEmail]
        };
      }
      return g;
    });

    saveQgroups(updated);
    setJoinGroupCodeInput('');
    setIsJoinGroupModalOpen(false);
    onShowToast('success', 'Tham gia Q-Group thành công!', `Chào mừng Thầy/Cô gia nhập "${targetGroup.name}".`);
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
              Bước 1/4 • Nạp &amp; Quản Lý Giáo Trình RAG
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
          onClick={() => setActiveTab('my')}
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
          onClick={() => setActiveTab('library')}
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
          onClick={() => setActiveTab('qgroup')}
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
                    <th className="py-3 px-5">Trạng thái RAG</th>
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
                            Đã băm Vector RAG
                          </span>
                        )}
                        {book.status === 'embedding' && (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="text-[#008689] font-bold flex items-center gap-1">
                                <Cpu className="w-3 h-3 animate-spin" />
                                Đang nhúng Vector RAG...
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
                          title="Soi lát cắt ngữ nghĩa RAG"
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
                Kho lưu trữ các giáo trình chuẩn đã được bóc tách và lập chỉ mục RAG Vector sẵn. Quý Thầy/Cô chỉ cần bấm <strong className="text-amber-300">"Dùng Sinh Đề Ngay"</strong> để tạo câu hỏi thi Bloom tức thì mà không cần tự tải lên lại.
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
                      title="Xem lát cắt RAG"
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
          TAB 3: Q-GROUP (Hội Nhóm & Chia Sẻ Chuyên Môn)
      ========================================================================= */}
      {activeTab === 'qgroup' && (
        <div className="space-y-5 animate-in fade-in duration-150">
          {/* Header Action Strip */}
          <div className="bg-gradient-to-r from-purple-900 via-slate-900 to-indigo-950 rounded-3xl p-6 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5 max-w-2xl">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-white/20 text-purple-200 border border-white/30 shadow-xs">
                <Users className="w-3.5 h-3.5 text-purple-300" />
                Hội Nhóm Chuyên Môn Q-Group
              </span>
              <h2 className="text-lg sm:text-xl font-black text-white">
                Không Gian Làm Việc &amp; Chia Sẻ Giáo Trình Theo Nhóm
              </h2>
              <p className="text-xs text-white/80 leading-relaxed">
                Tự tạo hội nhóm chuyên môn cùng đồng nghiệp bộ môn, thêm thành viên qua email hoặc mã nhóm, và chia sẻ giáo trình/đề thi an toàn trong nội bộ nhóm.
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
              <button
                onClick={() => setIsJoinGroupModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Nhập Mã Nhóm</span>
              </button>

              <button
                onClick={() => setIsCreateGroupModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Tạo Q-Group Mới</span>
              </button>
            </div>
          </div>

          {/* Q-Group Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {qgroups.map((group) => (
              <div
                key={group.id}
                className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-2xs hover:border-purple-300 transition-all space-y-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-purple-50 border border-purple-200 text-purple-700 flex items-center justify-center shrink-0">
                      <FolderGit2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-slate-900 text-sm sm:text-base">{group.name}</h4>
                      <p className="text-[11px] text-purple-700 font-semibold">{group.department}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1 rounded-full text-xs font-mono font-bold text-slate-700 border border-slate-200">
                    <span>{group.code}</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(group.code);
                        onShowToast('info', 'Đã sao chép mã nhóm', group.code);
                      }}
                      className="text-slate-400 hover:text-slate-800 p-0.5"
                      title="Sao chép mã nhóm"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  {group.description}
                </p>

                {/* Group Stats */}
                <div className="flex items-center gap-4 text-xs text-slate-500 pt-1 border-t border-slate-100">
                  <span className="flex items-center gap-1 font-semibold text-slate-700">
                    <Users className="w-3.5 h-3.5 text-purple-600" />
                    <span>{group.memberCount} Thành viên</span>
                  </span>
                  <span className="flex items-center gap-1 font-semibold text-slate-700">
                    <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                    <span>{group.documentsCount} Giáo trình chia sẻ</span>
                  </span>
                </div>

                {/* Shared Documents in Group */}
                {group.sharedBooks.length > 0 && (
                  <div className="space-y-2 pt-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Tài liệu nội bộ nhóm:
                    </span>
                    {group.sharedBooks.map((sb) => (
                      <div
                        key={sb.id}
                        className="p-3 bg-purple-50/50 rounded-2xl border border-purple-100 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-2.5 overflow-hidden">
                          <FileText className="w-4 h-4 text-purple-600 shrink-0" />
                          <div className="truncate">
                            <div className="font-bold text-slate-900 truncate">{sb.name}</div>
                            <div className="text-[10px] text-slate-500 font-mono">
                              {sb.totalPages} trang • Chia sẻ bởi {sb.sharedBy}
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            localStorage.setItem('quizgen_selected_book_id', sb.id);
                            localStorage.setItem('quizgen_selected_book_name', sb.name);
                            onShowToast('success', 'Đã chọn tài liệu nhóm', `Đang chuyển sang sinh đề với "${sb.name}"...`);
                            onNavigate('generate');
                          }}
                          className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-xs shrink-0 cursor-pointer shadow-xs flex items-center gap-1"
                        >
                          <Zap className="w-3 h-3 text-amber-200 fill-amber-200" />
                          <span>Sinh Đề</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Footer Action */}
                <div className="pt-2 flex items-center justify-between">
                  <button
                    onClick={() => {
                      const emailToAdd = prompt(`Nhập email của đồng nghiệp để thêm vào nhóm ${group.name}:`);
                      if (emailToAdd && emailToAdd.includes('@')) {
                        const updated = qgroups.map((g) => {
                          if (g.id === group.id) {
                            return {
                              ...g,
                              memberCount: g.memberCount + 1,
                              members: [...g.members, emailToAdd.trim()]
                            };
                          }
                          return g;
                        });
                        saveQgroups(updated);
                        onShowToast('success', 'Đã thêm thành viên', `Đã mời ${emailToAdd.trim()} vào Q-Group.`);
                      }
                    }}
                    className="text-xs font-bold text-purple-700 hover:text-purple-900 flex items-center gap-1 cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>+ Thêm Thành Viên Qua Mail</span>
                  </button>

                  <span className="text-[10px] text-slate-400 font-mono">Bảo mật nội bộ</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =========================================================================
          MODALS: CREATE QGROUP, JOIN GROUP, DIRECT EMAIL SHARE
      ========================================================================= */}
      
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
                  Lát cắt RAG Vector (Mẫu 20 đoạn ngữ nghĩa)
                </span>
                {isFetchingChunks && (
                  <span className="text-[11px] text-[#008689] flex items-center space-x-1 font-mono">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    <span>Đang truy xuất...</span>
                  </span>
                )}
              </div>

              {!isFetchingChunks && inspectingChunks.length === 0 && (
                <div className="text-center py-8 text-slate-400 text-xs">
                  Chưa có lát cắt nào được lập chỉ mục hoặc đang trong tiến trình xử lý.
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
