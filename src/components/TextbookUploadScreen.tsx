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
  Zap
} from 'lucide-react';
import { TextbookFile, ScreenId, UserSubscriptionInfo } from '../types';
import apiClient from '../services/apiClient';

interface TextbookUploadScreenProps {
  onNavigate: (screen: ScreenId) => void;
  onShowToast: (type: 'success' | 'info' | 'warning' | 'error', title: string, message: string) => void;
  subscriptionInfo?: UserSubscriptionInfo | null;
  onOpenPricingModal?: () => void;
}

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';
const MAX_UPLOAD_SIZE_MB = 25;

const DEFAULT_TEXTBOOKS: TextbookFile[] = [];

const formatUploadedAt = (input?: string): string => {
  if (!input) {
    return 'N/A';
  }
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) {
    return input;
  }
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
});

const parseErrorMessage = async (res: Response): Promise<string> => {
  try {
    const payload = await res.json();
    if (typeof payload?.detail === 'string') {
      return payload.detail;
    }
    if (typeof payload?.message === 'string') {
      return payload.message;
    }
  } catch {
    // Ignore JSON parse error, fallback to generic text.
  }
  return `Yêu cầu thất bại (${res.status})`;
};

export const TextbookUploadScreen: React.FC<TextbookUploadScreenProps> = ({
  onNavigate,
  onShowToast,
  subscriptionInfo,
  onOpenPricingModal,
}) => {
  const [textbooks, setTextbooks] = useState<TextbookFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [inspectingBook, setInspectingBook] = useState<TextbookFile | null>(null);
  const [inspectingChunks, setInspectingChunks] = useState<string[]>([]);
  const [isFetchingChunks, setIsFetchingChunks] = useState(false);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasWarnedRef = useRef(false);

  const isPro =
    subscriptionInfo?.plan_code === 'PRO_MONTH' ||
    subscriptionInfo?.plan_code === 'PRO_YEAR' ||
    subscriptionInfo?.plan_code === 'ENTERPRISE';

  const activeDocsCount = textbooks.filter((t) => t.status !== 'error').length;

  const fetchDocuments = useCallback(async (silent = false) => {
    if (!silent) {
      setIsLoadingDocuments(true);
    }
    try {
      const res = await apiClient.fetch(`${API_BASE}/documents/documents`);
      if (!res.ok) {
        throw new Error(await parseErrorMessage(res));
      }
      const payload = await res.json();
      const list = Array.isArray(payload) ? payload.map(normalizeTextbook) : [];
      setTextbooks(list);
      try {
        localStorage.setItem('quizgen_uploaded_documents', JSON.stringify(list.slice(0, 20)));
      } catch {}
    } catch {
      const savedLocal: TextbookFile[] = JSON.parse(
        localStorage.getItem('quizgen_uploaded_documents') || '[]'
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
  }, [API_BASE]);

  useEffect(() => {
    void fetchDocuments(false);
  }, [fetchDocuments]);

  // Tự động Polling cập nhật tiến trình RAG ngầm cho các tài liệu đang xử lý
  useEffect(() => {
    const hasPendingDocs = textbooks.some(
      (b) => b.status === 'uploading' || b.status === 'extracting' || b.status === 'embedding'
    );
    if (!hasPendingDocs) return;

    const interval = setInterval(async () => {
      // 1. Poll tiến trình thực tế của từng tài liệu đang pending từ backend
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
          } catch {
            // Bỏ qua lỗi mạng chớp nhoáng
          }
        }
      }
      // 2. Đồng bộ lại toàn bộ danh sách
      void fetchDocuments(true);
    }, 1500);

    return () => clearInterval(interval);
  }, [textbooks, fetchDocuments, API_BASE]);

  const handleUploadFile = async (file: File) => {
    if (!file) return;

    // Kiểm tra quota trước khi gửi lên máy chủ
    if (!isPro && activeDocsCount >= 3) {
      onShowToast(
        'warning',
        'Đã Đạt Hạn Mức Gói Miễn Phí',
        'Gói Miễn Phí chỉ cho phép lưu trữ tối đa 3 tài liệu giáo trình. Vui lòng nâng cấp lên Gói PRO (chỉ 2.000đ/tháng) để nạp không giới hạn!'
      );
      if (onOpenPricingModal) {
        onOpenPricingModal();
      }
      return;
    }

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'pdf' && ext !== 'docx') {
      onShowToast('error', 'Định dạng không hỗ trợ', 'Hệ thống chỉ chấp nhận tệp .pdf hoặc .docx.');
      return;
    }

    if (file.size > MAX_UPLOAD_SIZE_MB * 1024 * 1024) {
      onShowToast('error', 'Tệp quá lớn', `Dung lượng tệp tối đa cho phép là ${MAX_UPLOAD_SIZE_MB}MB.`);
      return;
    }
    setIsUploading(true);
    try {
      const token = apiClient.getAccessToken() || localStorage.getItem('quizgen_auth_token') || localStorage.getItem('quizgen_token');
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const formData = new FormData();
      formData.append('file', file);

      const res = await apiClient.fetch(`${API_BASE}/documents/upload`, {
        method: 'POST',
        headers,
        body: formData,
      });

      if (!res.ok) {
        let errorMsg = 'Không thể tải lên giáo trình.';
        try {
          const errData = await res.json();
          if (typeof errData?.detail === 'string') {
            errorMsg = errData.detail;
          } else if (typeof errData?.detail?.message === 'string') {
            errorMsg = errData.detail.message;
          } else if (typeof errData?.message === 'string') {
            errorMsg = errData.message;
          }
        } catch {}

        if (res.status === 402) {
          onShowToast('warning', 'Đã Đạt Hạn Mức Gói Miễn Phí', errorMsg);
          if (onOpenPricingModal) {
            onOpenPricingModal();
          }
        } else {
          onShowToast('error', 'Lỗi tải lên', errorMsg);
        }
        setIsUploading(false);
        return;
      }

      let uploadedDoc: TextbookFile = {
        id: `tb-${Date.now()}`,
        name: file.name,
        size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
        totalPages: 0,
        chaptersCount: 0,
        status: 'extracting',
        progress: 15,
        uploadedAt: formatUploadedAt(new Date().toISOString()),
      };

      const data = await res.json().catch(() => ({}));
      if (data?.document) {
        uploadedDoc = normalizeTextbook(data.document);
      }

      // Tự động chờ tác vụ nền hoàn tất trong vài giây ngắn
      if (uploadedDoc.status !== 'ready') {
        for (let i = 0; i < 20; i++) {
          await new Promise((r) => setTimeout(r, 600));
          try {
            const pRes = await apiClient.fetch(`${API_BASE}/documents/documents/${uploadedDoc.id}/progress`);
            if (pRes.ok) {
              const pData = await pRes.json();
              if (pData?.status === 'ready' || pData?.progress === 100) {
                uploadedDoc = {
                  ...uploadedDoc,
                  status: 'ready',
                  progress: 100,
                  totalPages: pData.totalPages || uploadedDoc.totalPages,
                  chaptersCount: pData.chaptersCount || uploadedDoc.chaptersCount,
                };
                break;
              } else if (pData?.progress) {
                uploadedDoc.progress = pData.progress;
                uploadedDoc.status = pData.status || uploadedDoc.status;
              }
            }
          } catch {
            break;
          }
        }
      }

      try {
        localStorage.setItem('quizgen_selected_book_id', uploadedDoc.id);
        localStorage.setItem('quizgen_selected_book_name', uploadedDoc.name);
      } catch {}

      await fetchDocuments(true);
      onShowToast(
        'success',
        'Đã nạp giáo trình thành công',
        `Tài liệu "${file.name}" đã sẵn sàng. Bấm "Bước 2: Sinh câu hỏi AI" để tạo đề ngay!`
      );
    } catch (error: any) {
      onShowToast('error', 'Lỗi kết nối máy chủ', error?.message || 'Không thể tải tệp lên máy chủ.');
    } finally {
      setIsUploading(false);
    }
  };

  const fetchChunksForDocument = async (book: TextbookFile) => {
    setInspectingBook(book);
    setInspectingChunks([]);
    setIsFetchingChunks(true);
    try {
      const res = await apiClient.fetch(`${API_BASE}/rag/documents/${book.id}/chunks?limit=20`);
      if (!res.ok) {
        throw new Error(await parseErrorMessage(res));
      }

      const payload = await res.json();
      const chunks = Array.isArray(payload?.chunks) ? payload.chunks : [];
      const previews = chunks.map((chunk: any) => {
        const pageNumber = chunk?.metadata?.page_number ?? chunk?.pageNumber ?? '?';
        const chapter = chunk?.metadata?.chapter ?? chunk?.chapter ?? 'Không rõ chương';
        const text = chunk?.text ?? chunk?.textSnippet ?? '';
        return `[Trang ${pageNumber}] ${chapter}: ${text}`;
      });
      setInspectingChunks(previews.length > 0 ? previews : ([]));
    } catch {
      // Fallback preview từ mock chunks khi backend offline
      setInspectingChunks([]);
    } finally {
      setIsFetchingChunks(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      void handleUploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    // 1. Lập tức xóa khỏi state và bộ nhớ cục bộ để giao diện phản hồi tức thì
    setTextbooks((prev) => prev.filter((b) => b.id !== id));
    try {
      const savedLocal: TextbookFile[] = JSON.parse(
        localStorage.getItem('quizgen_uploaded_documents') || '[]'
      ).filter((d: any) => d && d.id !== id);
      localStorage.setItem('quizgen_uploaded_documents', JSON.stringify(savedLocal));

      const selectedId = localStorage.getItem('quizgen_selected_book_id');
      if (selectedId === id) {
        localStorage.removeItem('quizgen_selected_book_id');
        localStorage.removeItem('quizgen_selected_book_name');
      }
    } catch {}

    // 2. Gọi backend DELETE
    try {
      const res = await apiClient.fetch(`${API_BASE}/documents/documents/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok && res.status !== 404) {
        throw new Error(await parseErrorMessage(res));
      }

      await fetchDocuments(true);
      onShowToast('warning', 'Đã xóa tài liệu', `Đã loại bỏ ${name} khỏi kho RAG và hệ thống.`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Xóa tài liệu thất bại.';
      onShowToast('error', 'Không thể xóa tài liệu', msg);
      await fetchDocuments(true);
    }
  };

  const filteredBooks = textbooks.filter((b) =>
    b.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 p-6 md:p-8 overflow-y-auto space-y-6 bg-[#f7f9fb] text-slate-800">
      {/* 1. Clean Header + Upload Input */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[11px] font-extrabold uppercase tracking-wider bg-teal-50 text-[#008689] border border-teal-200 shadow-2xs">
              <UploadCloud className="w-3.5 h-3.5 text-[#008689]" />
              Bước 1/4 • Nạp & Quản Lý Giáo Trình (Teal)
            </span>
          </div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Kho Giáo trình Môn học
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Tải lên tài liệu PDF hoặc DOCX (tối đa {MAX_UPLOAD_SIZE_MB}MB) để bóc tách nội dung và nạp vào vector store RAG.
          </p>
        </div>

        <button
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
          disabled={isUploading}
          className="flex items-center space-x-2 px-4 py-2 bg-[#008689] hover:bg-[#006d70] text-white text-xs font-bold rounded-xl shadow-sm transition-colors"
        >
          <UploadCloud className="w-4 h-4" />
          <span>{isUploading ? 'Đang tải lên...' : 'Tải tệp lên'}</span>
        </button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              void handleUploadFile(e.target.files[0]);
            }
            e.currentTarget.value = '';
          }}
          className="hidden"
          accept=".pdf,.docx"
        />
      </div>

      {/* Quota & Subscription Status Banner */}
      {isPro ? (
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-teal-500/10 border border-amber-300/60 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-white flex items-center justify-center shadow-sm shrink-0">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-amber-700 bg-amber-100/90 px-2 py-0.5 rounded-md border border-amber-200">
                  {subscriptionInfo?.plan_name || 'Gói PRO Giảng Viên'}
                </span>
                <span className="text-[11px] font-bold text-teal-700 bg-teal-100 px-2 py-0.5 rounded-md">
                  👑 Không giới hạn tài liệu
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                Tài khoản của bạn đã được mở khóa toàn diện: Tải lên không giới hạn giáo trình và sinh đề thi AI cao cấp.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-amber-800 bg-white/80 border border-amber-200 px-3 py-1.5 rounded-xl shadow-2xs">
            <Sparkles className="w-4 h-4 text-amber-500 animate-spin" style={{ animationDuration: '4s' }} />
            <span>Đã lưu trữ {activeDocsCount} tài liệu</span>
          </div>
        </div>
      ) : (
        <div className={`border rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs transition-all ${
          activeDocsCount >= 3 ? 'bg-rose-50/80 border-rose-200' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center gap-3 flex-1">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-2xs shrink-0 ${
              activeDocsCount >= 3 ? 'bg-rose-100 text-rose-600' : 'bg-[#e0f7fa] text-[#008689]'
            }`}>
              {activeDocsCount >= 3 ? <AlertCircle className="w-5 h-5" /> : <Zap className="w-5 h-5" />}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between max-w-md">
                <span className="text-xs font-black uppercase tracking-wider text-slate-700">
                  Hạn mức Gói Miễn Phí (Free):
                </span>
                <span className={`text-xs font-black ${activeDocsCount >= 3 ? 'text-rose-600' : 'text-[#008689]'}`}>
                  {activeDocsCount} / 3 tài liệu
                </span>
              </div>
              <div className="w-full max-w-md bg-slate-200 rounded-full h-2 mt-1.5 overflow-hidden">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    activeDocsCount >= 3 ? 'bg-rose-500' : activeDocsCount === 2 ? 'bg-amber-500' : 'bg-[#008689]'
                  }`}
                  style={{ width: `${Math.min(100, (activeDocsCount / 3) * 100)}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                {activeDocsCount >= 3
                  ? '⚠️ Bạn đã đạt tối đa 3/3 tài liệu của Gói Free. Nâng cấp Gói PRO để mở khóa không giới hạn ngay!'
                  : `Bạn còn ${3 - activeDocsCount} lượt lưu trữ giáo trình miễn phí.`}
              </p>
            </div>
          </div>
          {onOpenPricingModal && (
            <button
              onClick={onOpenPricingModal}
              className={`shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold shadow-sm transition-all ${
                activeDocsCount >= 3
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-amber-200 animate-pulse'
                  : 'bg-white hover:bg-amber-50 text-amber-700 border border-amber-300'
              }`}
            >
              <Crown className="w-4 h-4 text-amber-400" />
              <span>Nâng cấp PRO (chỉ 2.000đ)</span>
            </button>
          )}
        </div>
      )}

      {/* 2. Compact Drag & Drop Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
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
            Tự động phân tích chương mục và số trang
          </span>
        </div>
      </div>

      {/* 3. Data Table of Uploaded Documents */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="p-4 px-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Danh sách tài liệu ({textbooks.length})
          </h3>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm tài liệu..."
              className="pl-8 pr-3.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-[#008689] text-slate-800 placeholder-slate-400 w-56"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold text-[11px]">
                <th className="py-3 px-5">Tài liệu</th>
                <th className="py-3 px-4">Quy mô</th>
                <th className="py-3 px-4">Ngày tải</th>
                <th className="py-3 px-5">Trạng thái</th>
                <th className="py-3 px-5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {isLoadingDocuments && (
                <tr>
                  <td colSpan={5} className="py-8 px-6 text-center text-slate-400">
                    Đang tải danh sách tài liệu...
                  </td>
                </tr>
              )}
              {!isLoadingDocuments && filteredBooks.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 px-6 text-center text-slate-400">
                    Chưa có tài liệu nào. Hãy tải tệp PDF hoặc DOCX lên để bắt đầu.
                  </td>
                </tr>
              )}
              {filteredBooks.map((book) => (
                <tr key={book.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-5">
                    <div className="flex items-center space-x-3">
                      <FileText className="w-4 h-4 text-[#008689] shrink-0" />
                      <div>
                        <div className="font-semibold text-slate-900">{book.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{book.size}</div>
                      </div>
                    </div>
                  </td>

                  <td className="py-3.5 px-4 text-slate-600 font-mono text-[11px]">
                    {book.totalPages} trang · {book.chaptersCount} chương
                  </td>

                  <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                    {book.uploadedAt}
                  </td>

                  <td className="py-3.5 px-5 min-w-[180px]">
                    {book.status === 'ready' && (
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3" /> Sẵn sàng
                      </span>
                    )}
                    {(book.status === 'uploading' || book.status === 'extracting' || book.status === 'embedding') && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-[#008689] font-medium">
                          <span>Đang xử lý...</span>
                          <span className="font-mono">{book.progress}%</span>
                        </div>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-[#008689] h-full rounded-full transition-all"
                            style={{ width: `${book.progress}%` }}
                          />
                        </div>
                      </div>
                    )}
                    {book.status === 'error' && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#da1c2d] bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
                        <AlertCircle className="w-3 h-3" /> Lỗi xử lý
                      </span>
                    )}
                  </td>

                  <td className="py-3.5 px-5 text-right space-x-1.5">
                    <button
                      onClick={() => void fetchChunksForDocument(book)}
                      className="p-1.5 text-slate-400 hover:text-[#008689] rounded-lg hover:bg-slate-100 transition-colors"
                      title="Xem đoạn trích RAG"
                    >
                      <Eye className="w-4 h-4" />
                    </button>

                    {book.status === 'ready' && (
                      <button
                        onClick={() => {
                          localStorage.setItem('quizgen_selected_book_id', book.id);
                          localStorage.setItem('quizgen_selected_book_name', book.name);
                          onNavigate('generate');
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-white bg-[#008689] hover:bg-[#006d70] rounded-lg transition-colors"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Bước 2: Sinh câu hỏi AI</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}

                    <button
                      onClick={() => handleDelete(book.id, book.name)}
                      className="p-1.5 text-slate-400 hover:text-[#da1c2d] rounded-lg hover:bg-rose-50 transition-colors"
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

      {/* 4. MODAL: Inspect RAG Chunks */}
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
                  <p className="text-[10px] text-slate-500 font-mono">
                    {inspectingBook.totalPages} trang • {inspectingBook.chaptersCount} chương mục • Vector Status: {inspectingBook.status}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setInspectingBook(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              <h4 className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">
                Mẫu đoạn trích xuất (Semantic Chunks Preview):
              </h4>
              {isFetchingChunks ? (
                <div className="p-6 text-center text-slate-500 text-xs">
                  Đang tải chunks từ RAG service...
                </div>
              ) : inspectingChunks.length > 0 ? (
                inspectingChunks.map((chunk, idx) => (
                  <div key={idx} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-mono leading-relaxed">
                    {chunk}
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-slate-500 text-xs">
                  Chưa có bản xem trước cho tệp này.
                </div>
              )}

              <div className="p-3.5 bg-[#e0f7fa]/60 border border-[#008689]/25 rounded-xl text-xs text-slate-700 flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 text-[#008689] shrink-0 mt-0.5" />
                <p>
                  Các đoạn văn bản này được chia cắt theo ranh giới đoạn ngữ nghĩa và gắn nhãn số trang để LLM trích xuất làm minh chứng khi sinh câu hỏi.
                </p>
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                onClick={() => setInspectingBook(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition-colors"
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
