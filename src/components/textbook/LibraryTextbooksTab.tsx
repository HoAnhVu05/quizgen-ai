import React from 'react';
import {
  BookOpen,
  Search,
  CheckCircle2,
  Building2,
  Eye,
  Zap,
  ArrowRight,
} from 'lucide-react';
import { TextbookFile, UserProfile } from '../../types';
import { TextbookHodBadge } from './TextbookHodBadge';

export interface LibraryTextbooksTabProps {
  librarySearchQuery: string;
  setLibrarySearchQuery: (query: string) => void;
  filteredLibraryBooks: TextbookFile[];
  handleInspectChunks: (book: TextbookFile) => void | Promise<void>;
  handleUseBook: (book: TextbookFile) => void;
  currentUser?: UserProfile | null;
  onStatusChange?: (updated: TextbookFile) => void;
  onShowToast?: (type: 'success' | 'info' | 'warning' | 'error', title: string, message: string) => void;
}

export const LibraryTextbooksTab: React.FC<LibraryTextbooksTabProps> = ({
  librarySearchQuery,
  setLibrarySearchQuery,
  filteredLibraryBooks,
  handleInspectChunks,
  handleUseBook,
  currentUser,
  onStatusChange,
  onShowToast,
}) => {
  return (
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

                <div className="pt-1">
                  <TextbookHodBadge
                    textbook={book}
                    currentUser={currentUser}
                    onStatusChange={onStatusChange}
                    onShowToast={onShowToast}
                  />
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
  );
};

export default LibraryTextbooksTab;
