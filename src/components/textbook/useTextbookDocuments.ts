import { useState, useEffect, useCallback, useRef } from 'react';
import { TextbookFile, ScreenId, UserSubscriptionInfo, UserProfile } from '../../types';
import apiClient from '../../services/apiClient';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api/v1';

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

interface UseTextbookDocumentsProps {
  onNavigate: (screen: ScreenId) => void;
  onShowToast: (type: 'success' | 'info' | 'warning' | 'error', title: string, message: string) => void;
  subscriptionInfo?: UserSubscriptionInfo | null;
  currentUser?: UserProfile | null;
  onOpenPricingModal?: () => void;
}

export function useTextbookDocuments({
  onNavigate,
  onShowToast,
  subscriptionInfo,
  currentUser,
  onOpenPricingModal,
}: UseTextbookDocumentsProps) {
  const [textbooks, setTextbooks] = useState<TextbookFile[]>([]);
  const [libraryTextbooks, setLibraryTextbooks] = useState<TextbookFile[]>([]);
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

  const [isShareEmailModalOpen, setIsShareEmailModalOpen] = useState(false);
  const [selectedBookForEmail, setSelectedBookForEmail] = useState<TextbookFile | null>(null);
  const [targetColleagueEmail, setTargetColleagueEmail] = useState('');
  const [shareEmailMessage, setShareEmailMessage] = useState('');
  const [duplicateModalData, setDuplicateModalData] = useState<{
    isOpen: boolean;
    type: 'exact' | 'similar_name' | 'similar_content';
    message: string;
    existingDocument: TextbookFile;
    newFileName?: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const isEnterprise = subscriptionInfo?.plan_code === 'ENTERPRISE';
  const isPro = subscriptionInfo?.plan_code === 'PRO_MONTH' || subscriptionInfo?.plan_code === 'PRO_YEAR' || isEnterprise;
  const maxUploadMb = isEnterprise ? 100 : isPro ? 50 : 15;
  const activeDocsCount = textbooks.filter((t) => t.status !== 'error').length;
  const userStorageKey = currentUser?.id ? `quizgen_uploaded_documents_${currentUser.id}` : 'quizgen_uploaded_documents';

  const fetchDocuments = useCallback(async (silent = false) => {
    if (!silent) setIsLoadingDocuments(true);
    try {
      const resMy = await apiClient.fetch(
        `${API_BASE}/documents/documents?scope=my${currentUser?.id ? `&user_id=${currentUser.id}` : ''}${currentUser?.email ? `&email=${encodeURIComponent(currentUser.email)}` : ''}`
      );
      if (resMy.ok) {
        const payloadMy = await resMy.json();
        const listMy = Array.isArray(payloadMy) ? payloadMy.map(normalizeTextbook) : [];
        setTextbooks(listMy);
        try { localStorage.setItem(userStorageKey, JSON.stringify(listMy.slice(0, 20))); } catch {}
      }

      const resShared = await apiClient.fetch(`${API_BASE}/documents/documents?scope=shared`);
      if (resShared.ok) {
        const payloadShared = await resShared.json();
        const listShared = Array.isArray(payloadShared) ? payloadShared.map(normalizeTextbook) : [];
        setLibraryTextbooks(listShared);
      }
    } catch (err) {
      console.warn('[DOCUMENTS] Lỗi khi tải danh sách giáo trình từ máy chủ:', err);
    } finally {
      if (!silent) setIsLoadingDocuments(false);
    }
  }, [currentUser?.id, currentUser?.email, userStorageKey]);

  useEffect(() => {
    void fetchDocuments(false);
  }, [fetchDocuments]);

  useEffect(() => {
    const hasPendingDocs = textbooks.some((b) => b.status === 'uploading' || b.status === 'extracting' || b.status === 'embedding');
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
                  prev.map((b) =>
                    b.id === book.id
                      ? { ...b, status: progData.status || b.status, progress: progData.progress ?? b.progress, totalPages: progData.totalPages || b.totalPages, chaptersCount: progData.chaptersCount || b.chaptersCount }
                      : b
                  )
                );
              }
            }
          } catch {}
        }
      }
      void fetchDocuments(true);
    }, 1500);
    return () => clearInterval(interval);
  }, [textbooks, fetchDocuments]);

  const handleUploadFiles = async (files: File[]) => {
    if (!files || files.length === 0) return;
    const validFiles: File[] = [];
    for (const f of files) {
      const ext = f.name.split('.').pop()?.toLowerCase();
      if (!['pdf', 'docx', 'doc', 'txt'].includes(ext || '')) {
        onShowToast('error', 'Định dạng không hỗ trợ', `Tệp "${f.name}" không hợp lệ. Chỉ cho phép PDF, Word và TXT.`);
        continue;
      }
      if (f.size > maxUploadMb * 1024 * 1024) {
        onShowToast('error', 'Tệp quá lớn', `Tệp "${f.name}" vượt quá dung lượng tối đa (${maxUploadMb}MB).`);
        continue;
      }
      validFiles.push(f);
    }
    if (validFiles.length === 0) return;

    if (!isPro) {
      const remainingQuota = Math.max(0, 3 - activeDocsCount);
      if (remainingQuota <= 0) {
        onShowToast('warning', 'Đã Đạt Hạn Mức Gói Miễn Phí', 'Gói Miễn Phí chỉ cho phép lưu trữ tối đa 3 tài liệu. Vui lòng nâng cấp lên PRO!');
        onOpenPricingModal?.();
        return;
      }
      if (validFiles.length > remainingQuota) {
        onShowToast('warning', 'Giới hạn số lượng nạp', `Gói Miễn Phí chỉ còn nạp thêm được ${remainingQuota} tài liệu.`);
        validFiles.splice(remainingQuota);
      }
    }

    setIsUploading(true);
    const totalFiles = validFiles.length;
    let successCount = 0;
    const token = apiClient.getAccessToken() || localStorage.getItem('quizgen_auth_token') || localStorage.getItem('quizgen_token');
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (currentUser?.id) headers['X-User-Id'] = currentUser.id;

    try {
      for (let idx = 0; idx < totalFiles; idx++) {
        const file = validFiles[idx];
        const totalMB = (file.size / (1024 * 1024)).toFixed(1);
        setUploadProgressState({
          fileName: totalFiles > 1 ? `[${idx + 1}/${totalFiles}] ${file.name}` : file.name,
          fileSize: `${totalMB} MB`,
          progress: totalFiles > 1 ? Math.round((idx / totalFiles) * 100) : 0,
          stage: totalFiles > 1 ? `Đang chuẩn bị tệp ${idx + 1}/${totalFiles}...` : `Chuẩn bị tải lên... 0/${totalMB} MB`,
        });

        const formData = new FormData();
        formData.append('file', file);
        formData.append('subject_code', 'GEN001');

        await new Promise<any>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          const startTime = Date.now();
          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable && event.total > 0) {
              const filePercent = Math.min(100, Math.round((event.loaded / event.total) * 100));
              const loadedMB = (event.loaded / (1024 * 1024)).toFixed(1);
              const elapsedSec = Math.max(0.1, (Date.now() - startTime) / 1000);
              const speedMBs = (event.loaded / (1024 * 1024) / elapsedSec).toFixed(1);
              const overallPercent = totalFiles > 1 ? Math.min(100, Math.round(((idx + event.loaded / event.total) / totalFiles) * 100)) : filePercent;
              setUploadProgressState({
                fileName: totalFiles > 1 ? `[${idx + 1}/${totalFiles}] ${file.name}` : file.name,
                fileSize: `${totalMB} MB`,
                progress: overallPercent,
                stage: filePercent < 100 ? `Đang truyền tệp: ${loadedMB}/${totalMB} MB (${speedMBs} MB/s)` : `Đã truyền xong 100%! Đang kết nối máy chủ...`,
              });
            }
          };
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                const resData = JSON.parse(xhr.responseText);
                const doc = resData?.document || resData;
                if (doc?.id) {
                  localStorage.setItem('quizgen_selected_book_id', doc.id);
                  localStorage.setItem('quizgen_selected_book_name', doc.name || file.name);
                }
                if (resData?.isDuplicate && doc?.id) {
                  setDuplicateModalData({
                    isOpen: true,
                    type: resData.duplicateType || 'exact',
                    message: resData.message || 'Tài liệu này đã tồn tại trong thư viện.',
                    existingDocument: doc,
                    newFileName: file.name,
                  });
                }
              } catch {}
              setUploadProgressState({ fileName: file.name, fileSize: `${totalMB} MB`, progress: 100, stage: 'Máy chủ đã tiếp nhận xong (100%)!' });
              resolve(null);
            } else {
              let errorMsg = `Không thể nạp tệp "${file.name}".`;
              try { const errData = JSON.parse(xhr.responseText); if (errData?.detail) errorMsg = errData.detail; } catch {}
              reject(new Error(errorMsg));
            }
          };
          xhr.onerror = () => reject(new Error(`Lỗi kết nối mạng khi tải tệp "${file.name}".`));
          xhr.ontimeout = () => reject(new Error(`Quá thời gian kết nối tệp "${file.name}".`));
          xhr.open('POST', `${API_BASE}/documents/upload`);
          Object.entries(headers).forEach(([k, v]) => xhr.setRequestHeader(k, v));
          xhr.send(formData);
        });
        successCount++;
        await fetchDocuments(true);
      }

      onShowToast('success', 'Nạp Giáo Trình Thành Công', `Đã tải lên thành công ${successCount}/${totalFiles} giáo trình.`);
    } catch (err: any) {
      onShowToast('error', 'Nạp Giáo Trình Thất Bại', err.message || 'Lỗi không xác định.');
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadProgressState(null), 1600);
      await fetchDocuments(true);
    }
  };

  const handleToggleShare = async (book: TextbookFile) => {
    try {
      const targetState = !book.isShared;
      const token = apiClient.getAccessToken() || localStorage.getItem('quizgen_auth_token') || localStorage.getItem('quizgen_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      if (currentUser?.id) headers['X-User-Id'] = currentUser.id;
      if (currentUser?.email) headers['X-User-Email'] = currentUser.email;
      if (currentUser?.role) headers['X-User-Role'] = currentUser.role;

      const res = await apiClient.fetch(`${API_BASE}/documents/documents/${book.id}/share`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ is_shared: targetState, sharing_scope: targetState ? 'department' : 'private', author_name: currentUser?.fullName || 'Giảng viên' })
      });
      if (!res.ok) throw new Error(await parseErrorMessage(res));
      const resData = await res.json();
      onShowToast('success', targetState ? 'Đã Chia Sẻ Lên Thư Viện' : 'Đã Chuyển Về Riêng Tư', resData.message || 'Cập nhật thành công.');
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
      const savedLocal: TextbookFile[] = JSON.parse(localStorage.getItem(userStorageKey) || '[]').filter((d: any) => d && d.id !== id);
      localStorage.setItem(userStorageKey, JSON.stringify(savedLocal));
      if (localStorage.getItem('quizgen_selected_book_id') === id) {
        localStorage.removeItem('quizgen_selected_book_id');
        localStorage.removeItem('quizgen_selected_book_name');
      }
    } catch {}
    try {
      const token = apiClient.getAccessToken() || localStorage.getItem('quizgen_auth_token') || localStorage.getItem('quizgen_token');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      if (currentUser?.id) headers['X-User-Id'] = currentUser.id;
      if (currentUser?.email) headers['X-User-Email'] = currentUser.email;
      if (currentUser?.role) headers['X-User-Role'] = currentUser.role;
      const res = await apiClient.fetch(`${API_BASE}/documents/documents/${id}`, { method: 'DELETE', headers });
      if (!res.ok && res.status !== 404) throw new Error(await parseErrorMessage(res));
      await fetchDocuments(true);
      onShowToast('warning', 'Đã xóa tài liệu', `Đã loại bỏ ${name} khỏi kho cá nhân.`);
    } catch (error: any) {
      onShowToast('error', 'Không thể xóa tài liệu', error?.message || 'Xóa tài liệu thất bại.');
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
      const previews = chunks.map((c: any) => `[Trang ${c?.metadata?.page_number ?? c?.pageNumber ?? '?'}] ${c?.metadata?.chapter ?? c?.chapter ?? 'Không rõ chương'}: ${c?.text ?? c?.textSnippet ?? ''}`);
      setInspectingChunks(previews);
    } catch {
      setInspectingChunks([]);
    } finally {
      setIsFetchingChunks(false);
    }
  };

  const handleSendDirectEmailShare = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetColleagueEmail.trim() || !selectedBookForEmail) return;
    onShowToast('success', 'Đã gửi chia sẻ qua Email', `Giáo trình "${selectedBookForEmail.name}" đã được gửi đến ${targetColleagueEmail.trim()}.`);
    setIsShareEmailModalOpen(false);
    setTargetColleagueEmail('');
    setShareEmailMessage('');
    setSelectedBookForEmail(null);
  };

  return {
    textbooks, setTextbooks, libraryTextbooks, searchQuery, setSearchQuery,
    librarySearchQuery, setLibrarySearchQuery, inspectingBook, setInspectingBook,
    inspectingChunks, isFetchingChunks, isLoadingDocuments, isUploading, uploadProgressState,
    isShareEmailModalOpen, setIsShareEmailModalOpen, selectedBookForEmail, setSelectedBookForEmail,
    targetColleagueEmail, setTargetColleagueEmail, shareEmailMessage, setShareEmailMessage,
    duplicateModalData, setDuplicateModalData, fileInputRef, isEnterprise, isPro,
    maxUploadMb, activeDocsCount, fetchDocuments, handleUploadFiles, handleToggleShare,
    handleUseBook, handleDelete, handleInspectChunks, handleSendDirectEmailShare
  };
}
