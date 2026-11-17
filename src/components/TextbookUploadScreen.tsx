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
  MessageCircle,
  Building2,
  Tag,
  BookMarked
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
  authorName: item.authorName || 'Giảng viên UTH',
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
  const [activeTab, setActiveTab] = useState<'my' | 'shared' | 'forum'>('my');
  const [textbooks, setTextbooks] = useState<TextbookFile[]>([]);
  const [sharedTextbooks, setSharedTextbooks] = useState<TextbookFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sharedSearchQuery, setSharedSearchQuery] = useState('');
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

  // Forum state
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostTag, setNewPostTag] = useState('Chung');
  const [discussions, setDiscussions] = useState<Array<{
    id: string;
    authorName: string;
    authorRole: string;
    department: string;
    timestamp: string;
    tag: string;
    content: string;
    likes: number;
    hasLiked?: boolean;
    comments: Array<{
      id: string;
      authorName: string;
      content: string;
      timestamp: string;
    }>;
  }>>(() => {
    try {
      const saved = localStorage.getItem('quizgen_academic_discussions');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      {
        id: 'disc-1',
        authorName: 'TS. Hồ Anh Vũ',
        authorRole: 'Trưởng bộ môn Khoa học Máy tính',
        department: 'Khoa Công nghệ Thông tin - UTH',
        timestamp: '15:20 Hôm nay',
        tag: 'Hệ Điều Hành',
        content: 'Vừa hoàn thiện nạp trọn bộ giáo trình "Operating System Concepts 10th" (1.278 trang) vào RAG Vector store. Thầy/Cô nào đang phụ trách môn Hệ Điều Hành có thể vào Ngân hàng Giáo trình dùng chung để sinh câu hỏi trắc nghiệm Bloom 4 bậc ngay nhé! Rất mượt và trích dẫn chuẩn trang.',
        likes: 12,
        hasLiked: false,
        comments: [
          {
            id: 'cm-1',
            authorName: 'ThS. Nguyễn Văn Tân',
            content: 'Tuyệt vời Thầy Vũ ơi! Em vừa thử sinh 20 câu chương Quản lý Bộ nhớ ảo, AI bám sát giáo trình không hề bị ảo giác.',
            timestamp: '15:45 Hôm nay'
          }
        ]
      },
      {
        id: 'disc-2',
        authorName: 'ThS. Hân Bích',
        authorRole: 'Giảng viên',
        department: 'Khoa Lý luận Chính trị - UTH',
        timestamp: '11:10 Hôm nay',
        tag: 'Tư Tưởng HCM',
        content: 'Kính gửi quý Thầy/Cô bộ môn LLCT, em đã chia sẻ giáo trình "BAI GIANG Tu tuong HCM - LLCT.pdf" lên Ngân hàng Giáo trình chung. Các thầy cô lưu ý khi cấu hình ma trận Bloom thì chọn tỷ lệ 40% Nhận biết, 30% Thông hiểu, 20% Vận dụng và 10% Vận dụng cao cho đề thi giữa kỳ nhé.',
        likes: 8,
        hasLiked: false,
        comments: []
      }
    ];
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const isEnterprise = subscriptionInfo?.plan_code === 'ENTERPRISE';
  const isPro =
    subscriptionInfo?.plan_code === 'PRO_MONTH' ||
    subscriptionInfo?.plan_code === 'PRO_YEAR' ||
    isEnterprise;
  const maxUploadMb = isEnterprise ? 100 : isPro ? 50 : 15;
  const activeDocsCount = textbooks.filter((t) => t.status !== 'error').length;

  const userStorageKey = currentUser?.id ? `quizgen_uploaded_documents_${currentUser.id}` : 'quizgen_uploaded_documents';

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

      // 2. Ngân hàng dùng chung (scope=shared)
      const resShared = await apiClient.fetch(`${API_BASE}/documents/documents?scope=shared`);
      if (resShared.ok) {
        const payloadShared = await resShared.json();
        const listShared = Array.isArray(payloadShared) ? payloadShared.map(normalizeTextbook) : [];
        setSharedTextbooks(listShared);
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
        'Tính năng chia sẻ giáo trình vào Ngân hàng chung yêu cầu Gói Khoa & Bộ Môn (Enterprise) hoặc Gói PRO VIP. Vui lòng nâng cấp để kích hoạt đặc quyền này!'
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
          author_name: currentUser?.fullName || 'Giảng viên UTH'
        })
      });

      if (!res.ok) {
        throw new Error(await parseErrorMessage(res));
      }

      const resData = await res.json();
      onShowToast(
        'success',
        targetState ? 'Đã Chia Sẻ Lên Ngân Hàng' : 'Đã Chuyển Về Riêng Tư',
        resData.message || (targetState ? `Đã chia sẻ ${book.name} cho toàn Khoa & Bộ môn.` : `Đã thu hồi chia sẻ ${book.name}.`)
      );

      await fetchDocuments(true);
    } catch (err: any) {
      onShowToast('error', 'Lỗi chia sẻ', err.message || 'Không thể thay đổi quyền chia sẻ.');
    }
  };

  const handleUseSharedBook = (book: TextbookFile) => {
    try {
      localStorage.setItem('quizgen_selected_book_id', book.id);
      localStorage.setItem('quizgen_selected_book_name', book.name);
    } catch {}
    onShowToast('success', 'Đã Chọn Giáo Trình', `Đã chọn "${book.name}" từ Ngân hàng Dùng chung UTH.`);
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

  const handlePostForum = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostContent.trim()) return;

    const newPost = {
      id: `disc-${Date.now()}`,
      authorName: currentUser?.fullName || 'TS. Hồ Anh Vũ',
      authorRole: currentUser?.role === 'admin' ? 'Quản trị viên Hệ thống' : 'Giảng viên',
      department: (currentUser as any)?.department || 'Khoa Công nghệ Thông tin - UTH',
      timestamp: 'Vừa xong',
      tag: newPostTag,
      content: newPostContent.trim(),
      likes: 0,
      hasLiked: false,
      comments: []
    };

    const updated = [newPost, ...discussions];
    setDiscussions(updated);
    try {
      localStorage.setItem('quizgen_academic_discussions', JSON.stringify(updated));
    } catch {}
    setNewPostContent('');
    onShowToast('success', 'Đăng Bài Thành Công', 'Ý kiến của Thầy/Cô đã được đưa lên Diễn đàn Học thuật UTH!');
  };

  const handleToggleLike = (id: string) => {
    setDiscussions((prev) =>
      prev.map((d) => {
        if (d.id === id) {
          const nextLiked = !d.hasLiked;
          return {
            ...d,
            hasLiked: nextLiked,
            likes: nextLiked ? d.likes + 1 : Math.max(0, d.likes - 1)
          };
        }
        return d;
      })
    );
  };

  const filteredMyBooks = textbooks.filter((b) =>
    b.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredSharedBooks = sharedTextbooks.filter((b) =>
    b.name.toLowerCase().includes(sharedSearchQuery.toLowerCase()) ||
    (b.authorName && b.authorName.toLowerCase().includes(sharedSearchQuery.toLowerCase()))
  );

  return (
    <div className="flex-1 p-3.5 sm:p-6 md:p-8 overflow-y-auto space-y-4 sm:space-y-6 bg-[#f7f9fb] text-slate-800">
      {/* 1. Header & Navigation Stepper info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pb-3 sm:pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[11px] font-extrabold uppercase tracking-wider bg-teal-50 text-[#008689] border border-teal-200 shadow-2xs">
              <UploadCloud className="w-3.5 h-3.5 text-[#008689]" />
              Bước 1/4 • Nạp &amp; Quản Lý Giáo Trình RAG
            </span>
          </div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Kho Giáo Trình Học Thuật &amp; Ngân Hàng Dùng Chung
          </h1>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <p className="text-xs text-slate-500">
              Quản lý tài liệu cá nhân, tra cứu ngân hàng giáo trình chung của Khoa/Bộ môn và trao đổi học thuật.
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

      {/* 2. Interactive Feature Tabs Switcher */}
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
          onClick={() => setActiveTab('shared')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'shared'
              ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Building2 className="w-3.5 h-3.5 text-purple-600" />
          <span>Ngân Hàng Dùng Chung UTH</span>
          <span className="px-2 py-0.5 text-[10px] rounded-full bg-purple-50 text-purple-700 font-black border border-purple-200">
            {sharedTextbooks.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('forum')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'forum'
              ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5 text-amber-600" />
          <span>Góc Thảo Luận Học Thuật</span>
          <span className="px-2 py-0.5 text-[10px] rounded-full bg-amber-50 text-amber-700 font-black border border-amber-200">
            {discussions.length}
          </span>
        </button>
      </div>

      {/* =========================================================================
          TAB 1: GIÁO TRÌNH CỦA TÔI (Cá nhân, Riêng tư, Tải lên)
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
                  Tài liệu được bảo vệ riêng tư cho tài khoản của bạn (Tối đa {maxUploadMb}MB)
                </span>
              </div>
            </div>
          )}

          {/* Table of My Textbooks */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
            <div className="p-4 px-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <span>Giáo trình cá nhân của bạn ({textbooks.length})</span>
                  <span className="text-[10px] font-semibold text-slate-400 lowercase">• chỉ tài khoản này xem được</span>
                </h3>
              </div>

              <div className="relative w-full sm:w-auto">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm kiếm tài liệu cá nhân..."
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

                      {/* Privacy & Sharing Status Column */}
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => void handleToggleShare(book)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                            book.isShared
                              ? 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'
                              : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                          }`}
                          title={book.isShared ? 'Bấm để chuyển về chế độ Riêng tư' : 'Bấm để chia sẻ lên Ngân hàng Dùng chung'}
                        >
                          {book.isShared ? (
                            <>
                              <Users className="w-3 h-3 text-purple-600" />
                              <span>👥 Đã Chia Sẻ Khoa</span>
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

                      <td className="py-3.5 px-5 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => void handleInspectChunks(book)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer inline-flex items-center"
                          title="Soi lát cắt ngữ nghĩa RAG"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            localStorage.setItem('quizgen_selected_book_id', book.id);
                            localStorage.setItem('quizgen_selected_book_name', book.name);
                            onNavigate('generate');
                          }}
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
          TAB 2: NGÂN HÀNG GIÁO TRÌNH CHUNG UTH (Dùng chung toàn trường / Bộ môn)
      ========================================================================= */}
      {activeTab === 'shared' && (
        <div className="space-y-5 animate-in fade-in duration-150">
          {/* Banner Giới thiệu Ngân hàng chung */}
          <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
            <div className="relative z-10 space-y-2 max-w-3xl">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-white/20 text-purple-200 border border-white/30 shadow-xs">
                <Building2 className="w-3.5 h-3.5 text-purple-300" />
                Kho Tri Thức Học Thuật Dùng Chung UTH
              </span>
              <h2 className="text-lg sm:text-xl font-black text-white">
                Ngân Hàng Giáo Trình Chuẩn Toàn Trường &amp; Khoa
              </h2>
              <p className="text-xs text-white/80 leading-relaxed">
                Các giáo trình, bài giảng mẫu đã được thẩm định và băm sẵn chỉ mục RAG Vector. Quý Thầy/Cô có thể tra cứu và bấm <strong className="text-amber-300">"Sử dụng sinh đề"</strong> để tạo đề thi Bloom ngay lập tức mà không cần tốn thời gian tải lên lại.
              </p>
            </div>
          </div>

          {/* Search Bar for Shared Bank */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={sharedSearchQuery}
                onChange={(e) => setSharedSearchQuery(e.target.value)}
                placeholder="Tìm giáo trình theo tên môn học, giảng viên chia sẻ hoặc từ khóa..."
                className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-purple-600 text-slate-800 placeholder-slate-400"
              />
            </div>
            <div className="text-xs text-slate-500 font-semibold shrink-0">
              Tìm thấy <strong className="text-purple-700">{filteredSharedBooks.length}</strong> giáo trình dùng chung
            </div>
          </div>

          {/* Grid Cards of Shared Textbooks */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSharedBooks.length === 0 ? (
              <div className="col-span-full bg-white rounded-2xl p-10 text-center border border-slate-200 text-slate-400 space-y-2">
                <BookOpen className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs font-semibold">Chưa có giáo trình nào trong ngân hàng dùng chung phù hợp với tìm kiếm.</p>
                <p className="text-[11px] text-slate-400">Các thầy cô có thể vào tab "Giáo trình của tôi" để chia sẻ tài liệu lên đây!</p>
              </div>
            ) : (
              filteredSharedBooks.map((book) => (
                <div
                  key={book.id}
                  className="bg-white rounded-2xl p-5 border border-slate-200 hover:border-purple-300 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 flex items-center justify-center shrink-0">
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
                      <p className="text-[11px] text-purple-700 font-semibold mt-1 flex items-center gap-1">
                        <Building2 className="w-3 h-3" />
                        Đóng góp bởi: {book.authorName || 'Bộ môn UTH'}
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
                      onClick={() => handleUseSharedBook(book)}
                      className="flex-1 px-3 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold shadow-xs hover:scale-[1.01] transition-all cursor-pointer flex items-center justify-center gap-1.5"
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
          TAB 3: GÓC THẢO LUẬN & ĐÓNG GÓP HỌC THUẬT (Diễn đàn giảng viên)
      ========================================================================= */}
      {activeTab === 'forum' && (
        <div className="space-y-5 animate-in fade-in duration-150">
          {/* Post Creation Box */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-amber-600" />
              <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                Đăng bài trao đổi &amp; Góp ý Học thuật
              </h3>
            </div>

            <form onSubmit={handlePostForum} className="space-y-3">
              <textarea
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                placeholder="Quý Thầy/Cô muốn chia sẻ suy nghĩ, kinh nghiệm phân bổ ma trận Bloom hay thảo luận giáo trình nào?..."
                rows={3}
                className="w-full p-3.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-amber-500 text-slate-800 placeholder-slate-400 resize-none"
              />

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                    <Tag className="w-3 h-3 text-slate-400" /> Chủ đề:
                  </span>
                  {['Hệ Điều Hành', 'Kinh Tế Vi Mô', 'Tư Tưởng HCM', 'Ma Trận Bloom', 'Chung'].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setNewPostTag(t)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                        newPostTag === t
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      #{t}
                    </button>
                  ))}
                </div>

                <button
                  type="submit"
                  disabled={!newPostContent.trim()}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 disabled:opacity-50 text-white text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Send className="w-3 h-3" />
                  <span>Đăng Thảo Luận</span>
                </button>
              </div>
            </form>
          </div>

          {/* Discussions Feed */}
          <div className="space-y-4">
            {discussions.map((d) => (
              <div key={d.id} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#008689] to-teal-700 text-white font-black text-sm flex items-center justify-center shadow-xs">
                      {d.authorName.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-extrabold text-slate-900 text-xs flex items-center gap-2">
                        <span>{d.authorName}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                          {d.authorRole}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {d.department} • <span className="font-mono">{d.timestamp}</span>
                      </div>
                    </div>
                  </div>

                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-50 text-amber-800 border border-amber-200">
                    #{d.tag}
                  </span>
                </div>

                <p className="text-xs text-slate-700 leading-relaxed font-normal whitespace-pre-line">
                  {d.content}
                </p>

                {/* Actions: Likes & Comments */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => handleToggleLike(d.id)}
                      className={`flex items-center gap-1.5 text-xs font-bold transition-colors cursor-pointer ${
                        d.hasLiked ? 'text-rose-600' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <ThumbsUp className={`w-3.5 h-3.5 ${d.hasLiked ? 'fill-rose-600' : ''}`} />
                      <span>{d.likes} Hữu ích</span>
                    </button>

                    <span className="flex items-center gap-1.5 text-slate-500 font-semibold">
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>{d.comments.length} Bình luận</span>
                    </span>
                  </div>

                  <span className="text-[10px] text-slate-400 font-medium">
                    Cộng đồng Giảng viên UTH
                  </span>
                </div>

                {/* Comments Thread */}
                {d.comments.length > 0 && (
                  <div className="bg-slate-50/80 rounded-xl p-3 space-y-2 border border-slate-100 text-xs">
                    {d.comments.map((cm) => (
                      <div key={cm.id} className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <strong className="text-slate-800 text-[11px] font-bold">{cm.authorName}</strong>
                          <span className="text-[10px] text-slate-400 font-mono">{cm.timestamp}</span>
                        </div>
                        <p className="text-[11px] text-slate-600">{cm.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
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
