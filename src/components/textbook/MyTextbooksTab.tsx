import React, { useRef, useState } from 'react';
import {
  Sparkles,
  UploadCloud,
  Search,
  FileText,
  Globe,
  Lock,
  CheckCircle2,
  Cpu,
  Clock,
  AlertCircle,
  Mail,
  Eye,
  ArrowRight,
  Trash2,
} from 'lucide-react';
import { TextbookFile } from '../../types';

export interface UploadProgressState {
  fileName: string;
  fileSize: string;
  stage: string;
  progress: number;
}

export interface MyTextbooksTabProps {
  uploadProgressState: UploadProgressState | null;
  isPro: boolean;
  activeDocsCount: number;
  maxUploadMb: number;
  onShowToast: (type: 'success' | 'info' | 'warning' | 'error', title: string, message: string) => void;
  onOpenPricingModal?: () => void;
  textbooks: TextbookFile[];
  filteredMyBooks: TextbookFile[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isLoadingDocuments: boolean;
  handleUploadFiles: (files: File[]) => void | Promise<void>;
  handleToggleShare: (book: TextbookFile) => void | Promise<void>;
  setSelectedBookForEmail: (book: TextbookFile) => void;
  setIsShareEmailModalOpen: (open: boolean) => void;
  handleInspectChunks: (book: TextbookFile) => void | Promise<void>;
  handleUseBook: (book: TextbookFile) => void;
  handleDelete: (id: string, name: string) => void | Promise<void>;
  fileInputRef?: React.RefObject<HTMLInputElement>;
}

export const MyTextbooksTab: React.FC<MyTextbooksTabProps> = ({
  uploadProgressState,
  isPro,
  activeDocsCount,
  maxUploadMb,
  onShowToast,
  onOpenPricingModal,
  textbooks,
  filteredMyBooks,
  searchQuery,
  setSearchQuery,
  isLoadingDocuments,
  handleUploadFiles,
  handleToggleShare,
  setSelectedBookForEmail,
  setIsShareEmailModalOpen,
  handleInspectChunks,
  handleUseBook,
  handleDelete,
  fileInputRef,
}) => {
  const internalFileInputRef = useRef<HTMLInputElement>(null);
  const activeFileInputRef = fileInputRef || internalFileInputRef;
  const [isDragging, setIsDragging] = useState(false);

  return (
    <div className="space-y-5 animate-in fade-in duration-150">
      <input
        type="file"
        ref={activeFileInputRef as React.RefObject<HTMLInputElement>}
        multiple
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            void handleUploadFiles(Array.from(e.target.files));
            e.target.value = '';
          }
        }}
        accept=".pdf,.docx,.doc,.txt"
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
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
              void handleUploadFiles(Array.from(e.dataTransfer.files));
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
            activeFileInputRef.current?.click();
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
              Kéo thả một hoặc nhiều tệp giáo trình (.pdf, .docx, .doc, .txt) vào đây hoặc bấm để chọn tệp
            </p>
            <span className="text-[11px] text-slate-400">
              Hỗ trợ nạp hàng loạt • Tài liệu được bảo vệ riêng tư 100% (Tối đa {maxUploadMb}MB/tệp)
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
                            Đang lập chỉ mục vector...
                          </span>
                          <span className="font-mono text-[#008689] font-bold">{book.progress}%</span>
                        </div>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-teal-500 to-cyan-500 h-1.5 rounded-full transition-all duration-300"
                            style={{ width: `${Math.min(100, Math.max(5, book.progress))}%` }}
                          />
                        </div>
                      </div>
                    )}
                    {book.status === 'extracting' && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-amber-700 font-bold flex items-center gap-1">
                            <Clock className="w-3 h-3 animate-spin text-amber-600" />
                            Đang bóc tách văn bản...
                          </span>
                          <span className="font-mono text-amber-700 font-bold">{book.progress || 25}%</span>
                        </div>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-amber-500 h-1.5 rounded-full transition-all duration-300"
                            style={{ width: `${Math.min(100, Math.max(5, book.progress || 25))}%` }}
                          />
                        </div>
                      </div>
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
  );
};

export default MyTextbooksTab;
