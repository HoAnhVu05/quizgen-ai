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
  ArrowRight
} from 'lucide-react';
import { TextbookFile, ScreenId } from '../types';
import apiClient from '../services/apiClient';

interface TextbookUploadScreenProps {
  onNavigate: (screen: ScreenId) => void;
  onShowToast: (type: 'success' | 'info' | 'warning' | 'error', title: string, message: string) => void;
}

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';
const MAX_UPLOAD_SIZE_MB = 25;

// Cleaned: All mock/sample textbooks removed. Only real uploaded documents used.

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

export const TextbookUploadScreen: React.FC<TextbookUploadScreenProps> = ({ onNavigate, onShowToast }) => {
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
      if (list.length > 0) {
        setTextbooks(list);
      } else {
        setTextbooks([]);
      }
    } catch {
      // Offline fallback: giữ nguyên mock data để người dùng tương tác UI
      setTextbooks([]);
      if (!silent && !hasWarnedRef.current) {
        hasWarnedRef.current = true;
        onShowToast('info', 'Chế độ Demo (Offline)', 'Chưa kết nối Document Service, đang hiển thị dữ liệu mẫu.');
      }
    } finally {
      if (!silent) {
        setIsLoadingDocuments(false);
      }
    }
  }, [API_BASE, onShowToast]);

  useEffect(() => {
    void fetchDocuments(false);
  }, [fetchDocuments]);

  // Tự động Polling cập nhật tiến trình RAG ngầm cho các tài liệu đang xử lý
  useEffect(() => {
    const hasPendingDocs = textbooks.some(
      (b) => b.status === 'uploading' || b.status === 'extracting' || b.status === 'embedding'
    );
    if (!hasPendingDocs) return;

    const interval = setInterval(() => {
      void fetchDocuments(true);
    }, 2500);

    return () => clearInterval(interval);
  }, [textbooks, fetchDocuments]);

  const handleUploadFile = async (file: File) => {
    if (!file) return;

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
        throw new Error(await parseErrorMessage(res));
      }

      await fetchDocuments(true);
      onShowToast('info', 'Đã tải lên tệp', `Đang xử lý tài liệu ${file.name} trong nền.`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Tải lên thất bại.';
      onShowToast('error', 'Tải lên thất bại', msg);
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
    try {
      const res = await apiClient.fetch(`${API_BASE}/documents/documents/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        throw new Error(await parseErrorMessage(res));
      }

      await fetchDocuments(true);
      onShowToast('warning', 'Đã xóa tài liệu', `Đã loại bỏ ${name} khỏi kho RAG`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Xóa tài liệu thất bại.';
      onShowToast('error', 'Không thể xóa tài liệu', msg);
    }
  };

  const filteredBooks = textbooks.filter((b) =>
    b.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 p-6 md:p-8 overflow-y-auto space-y-6 bg-[#f7f9fb] text-slate-800 relative">
      {/* 1. Header */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#e0f7fa] text-[#008689] border border-[#008689]/25">
              RAG Knowledge Base
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight mt-1.5">
            Quản lý & Nạp Giáo trình
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Bóc tách cấu trúc ngữ nghĩa (PDF, DOCX) thành các đoạn Chunks kèm tọa độ trang sách cho AI đối soát.
          </p>
        </div>

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-[#008689] to-[#1d999d] hover:brightness-105 text-white text-xs font-bold rounded-xl shadow-md shadow-[#008689]/25 transition-all"
        >
          <UploadCloud className="w-4 h-4" />
          <span>{isUploading ? 'Đang tải lên...' : 'Tải tệp từ máy tính'}</span>
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

      {/* 2. Drag & Drop Upload Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative z-10 overflow-hidden rounded-2xl p-9 text-center transition-all duration-300 cursor-pointer border-2 border-dashed ${
          isDragging
            ? 'border-[#008689] bg-[#e0f7fa]/60 scale-[0.99] shadow-md'
            : 'bg-white border-slate-300 hover:border-[#008689] hover:bg-[#e0f7fa]/20 shadow-sm'
        }`}
      >
        {/* Animated scan beam */}
        <div className="absolute inset-x-0 h-20 bg-gradient-to-b from-[#008689]/10 via-[#008689]/5 to-transparent animate-scan-beam pointer-events-none" />

        <div className="max-w-md mx-auto flex flex-col items-center relative z-10">
          <div className="relative mb-4">
            <div className="w-16 h-16 rounded-2xl bg-[#e0f7fa] border border-[#008689]/25 flex items-center justify-center text-[#008689] shadow-sm">
              <UploadCloud className="w-8 h-8" />
            </div>
          </div>

          <h3 className="text-base font-bold text-slate-900 tracking-tight">
            Kéo thả tài liệu giáo trình vào không gian này
          </h3>
          <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
            Hỗ trợ chuẩn định dạng <span className="text-[#008689] font-bold font-mono">PDF (.pdf)</span> hoặc{' '}
            <span className="text-[#008689] font-bold font-mono">Word (.docx)</span>. Giới hạn {MAX_UPLOAD_SIZE_MB}MB/tệp.
          </p>

          <div className="mt-5 flex items-center space-x-3">
            <span className="px-5 py-2.5 bg-[#008689] hover:bg-[#1d999d] text-white text-xs font-bold rounded-xl shadow-sm transition-colors">
              Duyệt tệp máy tính
            </span>
            <span className="text-[11px] text-slate-500 font-mono">OCR thông minh & Nhận diện mục lục</span>
          </div>
        </div>
      </div>

      {/* 3. Data Table of Uploaded Documents */}
      <div className="glass-card rounded-2xl overflow-hidden relative z-10">
        {/* Table Toolbar */}
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <FileCheck2 className="w-5 h-5 text-[#008689]" />
            <h3 className="text-sm font-bold text-slate-900">
              Kho tài liệu học thuật đã nạp ({textbooks.length})
            </h3>
          </div>

          <div className="flex items-center space-x-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm tài liệu..."
                className="pl-8 pr-3.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-[#008689] text-slate-800 placeholder-slate-400 w-60"
              />
            </div>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3.5 px-6">Tên giáo trình</th>
                <th className="py-3.5 px-4">Quy mô</th>
                <th className="py-3.5 px-4">Ngày nạp</th>
                <th className="py-3.5 px-6">Tiến trình RAG Pipeline</th>
                <th className="py-3.5 px-6 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {isLoadingDocuments && (
                <tr>
                  <td colSpan={5} className="py-8 px-6 text-center text-slate-500">
                    Đang tải danh sách tài liệu từ Document Service...
                  </td>
                </tr>
              )}
              {!isLoadingDocuments && filteredBooks.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 px-6 text-center text-slate-500">
                    Chưa có tài liệu nào. Hãy tải tệp PDF/DOCX để bắt đầu.
                  </td>
                </tr>
              )}
              {filteredBooks.map((book) => {
                return (
                  <tr key={book.id} className="hover:bg-[#f3f7f8] transition-colors">
                    {/* Name */}
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-3.5">
                        <div className="w-9 h-9 rounded-xl bg-[#e0f7fa] border border-[#008689]/25 text-[#008689] flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-xs">{book.name}</div>
                          <div className="text-[10px] text-slate-500 font-mono">{book.size}</div>
                        </div>
                      </div>
                    </td>

                    {/* Scale */}
                    <td className="py-4 px-4 font-mono">
                      <div className="text-slate-700 font-medium">{book.totalPages} trang</div>
                      <div className="text-slate-500 text-[10px]">{book.chaptersCount} chương mục</div>
                    </td>

                    {/* Upload date */}
                    <td className="py-4 px-4 text-slate-500 font-mono text-[11px]">
                      {book.uploadedAt}
                    </td>

                    {/* Pipeline Progress */}
                    <td className="py-4 px-6 min-w-[240px]">
                      {book.status === 'uploading' && (
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-[10px] text-slate-700 font-semibold">
                            <span className="flex items-center gap-1.5 text-sky-700">
                              <UploadCloud className="w-3 h-3 text-sky-600 animate-pulse" /> Đang nhận tệp...
                            </span>
                            <span className="font-mono text-sky-700">{book.progress}%</span>
                          </div>
                          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-gradient-to-r from-sky-500 to-blue-500 h-full rounded-full transition-all duration-300"
                              style={{ width: `${book.progress}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {book.status === 'ready' && (
                        <div>
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Sẵn sàng sinh đề
                          </span>
                        </div>
                      )}

                      {book.status === 'embedding' && (
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-[10px] text-slate-700 font-semibold">
                            <span className="flex items-center gap-1.5 text-[#008689]">
                              <Sparkles className="w-3 h-3 text-[#008689] animate-spin" /> Vectorizing (ChromaDB)...
                            </span>
                            <span className="font-mono text-[#008689]">{book.progress}%</span>
                          </div>
                          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-gradient-to-r from-[#008689] to-[#1d999d] h-full rounded-full transition-all duration-300"
                              style={{ width: `${book.progress}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {book.status === 'extracting' && (
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-[10px] text-slate-700 font-semibold">
                            <span className="flex items-center gap-1.5 text-amber-700">
                              <RefreshCw className="w-3 h-3 text-amber-600 animate-spin" /> Bóc tách OCR...
                            </span>
                            <span className="font-mono text-amber-700">{book.progress}%</span>
                          </div>
                          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-gradient-to-r from-amber-500 to-orange-500 h-full rounded-full transition-all duration-300"
                              style={{ width: `${book.progress}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {book.status === 'error' && (
                        <div>
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#da1c2d] bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200">
                            <AlertCircle className="w-3.5 h-3.5 text-[#da1c2d]" /> Xử lý lỗi
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-6 text-right space-x-2">
                      <button
                        onClick={() => {
                          void fetchChunksForDocument(book);
                        }}
                        className="p-1.5 text-slate-500 hover:text-[#008689] transition-colors rounded-lg hover:bg-[#e0f7fa]"
                        title="Khám phá Chunks RAG"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {book.status === 'ready' ? (
                        <button
                          onClick={() => {
                            localStorage.setItem('quizgen_selected_book_id', book.id);
                            onNavigate('generate');
                          }}
                          className="px-3 py-1.5 text-[11px] font-bold text-white bg-[#008689] hover:bg-[#1d999d] rounded-lg transition-colors shadow-sm"
                        >
                          Sinh câu hỏi AI
                        </button>
                      ) : (
                        <button
                          disabled
                          className="px-3 py-1.5 text-[11px] font-medium text-slate-400 bg-slate-100 rounded-lg cursor-not-allowed"
                        >
                          Đang xử lý...
                        </button>
                      )}

                      <button
                        onClick={() => handleDelete(book.id, book.name)}
                        className="p-1.5 text-slate-400 hover:text-[#da1c2d] transition-colors rounded-lg hover:bg-rose-50"
                        title="Xóa tài liệu"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
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
