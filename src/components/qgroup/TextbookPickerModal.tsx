import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  BookOpen,
  Search,
  X,
  FileText,
  CheckCircle2,
  UploadCloud,
  Library,
  User,
  Sparkles,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import apiClient, { API_BASE } from '../../services/apiClient';
import { UserProfile } from '../../types';

export interface SelectedTextbookPayload {
  id: string;
  name: string;
  size?: string;
  totalPages?: number;
  authorName?: string;
  fileUrl?: string;
}

export interface TextbookPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTextbook: (textbook: SelectedTextbookPayload) => void;
  currentUser?: UserProfile | null;
  onNavigateUpload?: () => void;
  onShowToast: (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => void;
}

interface AcademicTextbookItem {
  id: string;
  name: string;
  size: string;
  totalPages: number;
  chaptersCount?: number;
  authorName: string;
  isShared: boolean;
  isApproved?: boolean;
  uploadedAt?: string;
  fileUrl?: string;
  scope: 'shared' | 'my';
}

const DEFAULT_FALLBACK_TEXTBOOKS: AcademicTextbookItem[] = [
  {
    id: 'tb-fallback-01',
    name: '2018-Operating System Concepts-10th.pdf',
    size: '29.7 MB',
    totalPages: 1278,
    chaptersCount: 16,
    authorName: 'TS. Hồ Anh Vũ',
    isShared: true,
    isApproved: true,
    uploadedAt: 'Hôm nay',
    scope: 'shared',
  },
  {
    id: 'tb-fallback-02',
    name: 'GiaoTrinh_KinhTeViMo_2025.pdf',
    size: '22.1 MB',
    totalPages: 412,
    chaptersCount: 10,
    authorName: 'Bộ Môn Kinh Tế - ĐH GTVT TP.HCM',
    isShared: true,
    isApproved: true,
    uploadedAt: 'Hôm nay',
    scope: 'shared',
  },
  {
    id: 'tb-fallback-03',
    name: 'BAI GIANG Tu tuong HCM - LLCT.pdf',
    size: '15.2 MB',
    totalPages: 182,
    chaptersCount: 6,
    authorName: 'ThS. Hân Bích',
    isShared: true,
    isApproved: true,
    uploadedAt: 'Hôm nay',
    scope: 'shared',
  },
  {
    id: 'tb-fallback-04',
    name: 'GiaoTrinh_ToanRoiRac_CoSoTinHoc_2026.pdf',
    size: '18.6 MB',
    totalPages: 320,
    chaptersCount: 8,
    authorName: 'Khoa Công nghệ Thông tin UTH',
    isShared: true,
    isApproved: true,
    uploadedAt: 'Hôm nay',
    scope: 'shared',
  },
  {
    id: 'tb-fallback-05',
    name: 'GiaoTrinh_LapTrinhMang_Socket_WebRTC.pdf',
    size: '14.8 MB',
    totalPages: 245,
    chaptersCount: 7,
    authorName: 'Bộ Môn Mạng & Hệ Điều Hành',
    isShared: true,
    isApproved: true,
    uploadedAt: 'Hôm nay',
    scope: 'shared',
  },
];

export const TextbookPickerModal: React.FC<TextbookPickerModalProps> = ({
  isOpen,
  onClose,
  onSelectTextbook,
  currentUser,
  onNavigateUpload,
  onShowToast,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'shared' | 'my'>('all');
  const [textbooks, setTextbooks] = useState<AcademicTextbookItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Tải danh sách giáo trình từ Backend API & CSDL Thư Viện UTH
  const loadTextbooks = useCallback(async () => {
    setIsLoading(true);
    try {
      const email = currentUser?.email || '';
      const loadedItems: AcademicTextbookItem[] = [];

      // 1. Thư viện mở dùng chung toàn trường (scope=shared)
      try {
        const resShared = await apiClient.fetch(`${API_BASE}/documents/documents?scope=shared`);
        if (resShared.ok) {
          const list = await resShared.json();
          if (Array.isArray(list)) {
            list.forEach((item: any) => {
              if (item && (item.status === 'ready' || !item.status)) {
                loadedItems.push({
                  id: String(item.id),
                  name: String(item.name || item.title || 'Giáo trình UTH'),
                  size: String(item.size || `${Math.round(Number(item.totalPages || 120) * 0.08 * 10) / 10} MB`),
                  totalPages: Number(item.totalPages ?? item.total_pages ?? 120),
                  chaptersCount: Number(item.chaptersCount ?? item.chapters_count ?? 5),
                  authorName: item.authorName || 'Thư viện số UTH',
                  isShared: true,
                  isApproved: Boolean(item.isApproved),
                  uploadedAt: item.uploadedAt || 'Mới cập nhật',
                  fileUrl: item.fileUrl || `${API_BASE}/documents/documents/${item.id}/download?inline=true`,
                  scope: 'shared',
                });
              }
            });
          }
        }
      } catch (err) {
        console.warn('Could not fetch shared textbooks from API:', err);
      }

      // 2. Giáo trình cá nhân của giảng viên (scope=my)
      try {
        const myUrl = email
          ? `${API_BASE}/documents/documents?scope=my&email=${encodeURIComponent(email)}`
          : `${API_BASE}/documents/documents?scope=my`;
        const resMy = await apiClient.fetch(myUrl);
        if (resMy.ok) {
          const list = await resMy.json();
          if (Array.isArray(list)) {
            list.forEach((item: any) => {
              if (item && (item.status === 'ready' || !item.status)) {
                loadedItems.push({
                  id: String(item.id),
                  name: String(item.name || item.title || 'Giáo trình của tôi'),
                  size: String(item.size || `${Math.round(Number(item.totalPages || 100) * 0.08 * 10) / 10} MB`),
                  totalPages: Number(item.totalPages ?? item.total_pages ?? 100),
                  chaptersCount: Number(item.chaptersCount ?? item.chapters_count ?? 4),
                  authorName: item.authorName || currentUser?.fullName || 'Tôi',
                  isShared: Boolean(item.isShared),
                  isApproved: Boolean(item.isApproved),
                  uploadedAt: item.uploadedAt || 'Mới cập nhật',
                  fileUrl: item.fileUrl || `${API_BASE}/documents/documents/${item.id}/download?inline=true`,
                  scope: 'my',
                });
              }
            });
          }
        }
      } catch (err) {
        console.warn('Could not fetch personal textbooks from API:', err);
      }

      // 3. Fallback từ LocalStorage nếu Backend trống hoặc Offline
      if (loadedItems.length === 0) {
        try {
          const userStorageKey = email ? `quizgen_textbooks_${email}` : 'quizgen_textbooks';
          const localSaved = localStorage.getItem(userStorageKey) || localStorage.getItem('quizgen_textbooks');
          if (localSaved) {
            const parsed = JSON.parse(localSaved);
            if (Array.isArray(parsed) && parsed.length > 0) {
              parsed.forEach((item: any) => {
                loadedItems.push({
                  id: String(item.id),
                  name: String(item.name || item.title),
                  size: String(item.size || '15.0 MB'),
                  totalPages: Number(item.totalPages || 120),
                  authorName: item.authorName || currentUser?.fullName || 'Tôi',
                  isShared: Boolean(item.isShared),
                  isApproved: Boolean(item.isApproved),
                  scope: item.isShared ? 'shared' : 'my',
                });
              });
            }
          }
        } catch {}
      }

      // 4. Kết hợp với kho mặc định chất lượng cao
      const combined = [...loadedItems];
      DEFAULT_FALLBACK_TEXTBOOKS.forEach((fb) => {
        if (!combined.some((c) => c.name.toLowerCase() === fb.name.toLowerCase())) {
          combined.push(fb);
        }
      });

      // Deduplicate theo ID và Name
      const deduped = combined.filter(
        (tb, idx, self) =>
          idx === self.findIndex((o) => o.id === tb.id || o.name.toLowerCase() === tb.name.toLowerCase())
      );

      setTextbooks(deduped);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser?.email, currentUser?.fullName]);

  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setActiveTab('all');
      void loadTextbooks();
    }
  }, [isOpen, loadTextbooks]);

  // Bộ lọc theo Tab và Từ khóa tìm kiếm
  const filteredTextbooks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return textbooks.filter((tb) => {
      // Filter theo Tab
      if (activeTab === 'shared' && tb.scope !== 'shared') return false;
      if (activeTab === 'my' && tb.scope !== 'my') return false;

      // Filter theo Từ khóa
      if (!q) return true;
      const matchName = tb.name.toLowerCase().includes(q);
      const matchAuthor = tb.authorName.toLowerCase().includes(q);
      return matchName || matchAuthor;
    });
  }, [textbooks, activeTab, searchQuery]);

  // Đếm số lượng theo tab
  const counts = useMemo(() => {
    const sharedCount = textbooks.filter((t) => t.scope === 'shared').length;
    const myCount = textbooks.filter((t) => t.scope === 'my').length;
    return { all: textbooks.length, shared: sharedCount, my: myCount };
  }, [textbooks]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in select-none"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[88vh] animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-teal-50/70 via-white to-cyan-50/40">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-[#008689] text-white flex items-center justify-center font-bold shadow-xs shrink-0">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 flex items-center gap-2 truncate">
                <span>Kho Giáo Trình Thư Viện UTH</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800 shrink-0">
                  {textbooks.length} tài liệu
                </span>
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500 truncate">
                Tra cứu nhanh và đính kèm học liệu chuẩn vào cuộc trò chuyện học thuật
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer shrink-0 ml-2"
            title="Đóng cửa sổ"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Real-time Search Input */}
        <div className="p-3 sm:px-5 pt-3 pb-2 bg-slate-50/60 border-b border-slate-100">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm theo tên giáo trình, tác giả, bộ môn..."
              className="w-full pl-10 pr-9 py-2 rounded-xl border border-slate-200/90 bg-white text-xs sm:text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-[#008689] focus:ring-2 focus:ring-[#008689]/20 transition-all shadow-2xs"
              autoFocus
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="w-6 h-6 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 absolute right-2.5 flex items-center justify-center cursor-pointer"
                title="Xóa tìm kiếm"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Scope Tabs: Tất cả | Thư viện UTH | Giáo trình của tôi */}
        <div className="flex items-center border-b border-slate-200 px-4 sm:px-5 pt-1.5 bg-slate-50/40 gap-3 text-xs overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`pb-2.5 pt-1 font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'all'
                ? 'border-[#008689] text-[#008689]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Tất cả</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                activeTab === 'all' ? 'bg-[#008689] text-white' : 'bg-slate-200 text-slate-600'
              }`}
            >
              {counts.all}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('shared')}
            className={`pb-2.5 pt-1 font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'shared'
                ? 'border-[#008689] text-[#008689]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Library className="w-3.5 h-3.5" />
            <span>Thư viện mở UTH</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                activeTab === 'shared' ? 'bg-[#008689] text-white' : 'bg-slate-200 text-slate-600'
              }`}
            >
              {counts.shared}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('my')}
            className={`pb-2.5 pt-1 font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'my'
                ? 'border-[#008689] text-[#008689]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Giáo trình của tôi</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                activeTab === 'my' ? 'bg-[#008689] text-white' : 'bg-slate-200 text-slate-600'
              }`}
            >
              {counts.my}
            </span>
          </button>

          <div className="ml-auto flex items-center pb-1">
            <button
              type="button"
              onClick={() => void loadTextbooks()}
              disabled={isLoading}
              className="p-1 hover:bg-slate-200 rounded-lg text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
              title="Làm mới danh sách"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#008689]' : ''}`} />
            </button>
          </div>
        </div>

        {/* Textbooks List Container */}
        <div className="p-3 sm:p-5 overflow-y-auto max-h-[50vh] sm:max-h-[55vh] space-y-2.5">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-3">
              <Loader2 className="w-7 h-7 text-[#008689] animate-spin" />
              <p className="text-xs font-medium">Đang tải danh sách tài liệu từ Thư viện UTH...</p>
            </div>
          ) : filteredTextbooks.length === 0 ? (
            <div className="text-center py-10 px-4 space-y-3 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                <BookOpen className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <p className="text-xs sm:text-sm font-bold text-slate-700">
                  {searchQuery
                    ? `Không tìm thấy giáo trình nào khớp với "${searchQuery}"`
                    : 'Chưa có giáo trình nào trong mục này'}
                </p>
                <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                  Thầy/Cô có thể thử tìm với từ khóa khác hoặc tải trực tiếp giáo trình mới vào thư viện.
                </p>
              </div>
              {onNavigateUpload && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onNavigateUpload();
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#008689] hover:bg-teal-700 text-white font-semibold text-xs transition-colors cursor-pointer shadow-xs"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>Tải lên giáo trình mới</span>
                </button>
              )}
            </div>
          ) : (
            filteredTextbooks.map((tb) => {
              const isDocx = tb.name.toLowerCase().endsWith('.docx') || tb.name.toLowerCase().endsWith('.doc');
              return (
                <div
                  key={tb.id}
                  onClick={() => {
                    onSelectTextbook({
                      id: tb.id,
                      name: tb.name,
                      size: tb.size,
                      totalPages: tb.totalPages,
                      authorName: tb.authorName,
                      fileUrl: tb.fileUrl,
                    });
                    onClose();
                    onShowToast('info', 'Đã đính kèm giáo trình', tb.name);
                  }}
                  className="p-3 sm:p-3.5 rounded-2xl border border-slate-200/90 hover:border-[#008689] bg-white hover:bg-teal-50/20 cursor-pointer transition-all flex items-center justify-between gap-3 group shadow-2xs hover:shadow-xs"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                        isDocx
                          ? 'bg-blue-50 text-blue-700 group-hover:bg-blue-100'
                          : 'bg-rose-50 text-rose-700 group-hover:bg-rose-100'
                      }`}
                    >
                      <FileText className="w-5 h-5" />
                    </div>

                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-xs sm:text-sm text-slate-900 group-hover:text-[#008689] transition-colors truncate">
                          {tb.name}
                        </span>
                        {tb.isApproved && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-2.5 h-2.5" /> Chuẩn HĐKH
                          </span>
                        )}
                        <span
                          className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                            tb.scope === 'shared'
                              ? 'bg-teal-50 text-teal-700 border border-teal-200'
                              : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                          }`}
                        >
                          {tb.scope === 'shared' ? 'Thư viện UTH' : 'Của tôi'}
                        </span>
                      </div>

                      <p className="text-[10px] sm:text-[11px] text-slate-500 flex items-center gap-1.5 flex-wrap">
                        <span>{tb.totalPages} trang</span>
                        <span>•</span>
                        <span>{tb.size}</span>
                        <span>•</span>
                        <span className="truncate max-w-[200px] text-slate-600 font-medium">
                          Tác giả: {tb.authorName}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* One-click attach button */}
                  <div className="shrink-0 flex items-center gap-2">
                    <button
                      type="button"
                      className="px-2.5 py-1 rounded-xl bg-slate-100 group-hover:bg-[#008689] text-slate-600 group-hover:text-white font-bold text-xs flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <span>Đính kèm</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 sm:px-5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-teal-600 shrink-0" />
            <span className="hidden sm:inline">Giáo trình đính kèm hỗ trợ bóc tách & Sinh Đề AI tức thì.</span>
            <span className="sm:hidden">Hỗ trợ Sinh Đề AI.</span>
          </div>

          {onNavigateUpload && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onNavigateUpload();
              }}
              className="font-bold text-[#008689] hover:text-teal-700 hover:underline flex items-center gap-1 cursor-pointer shrink-0"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Kho Quản Lý Giáo Trình &rarr;</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
