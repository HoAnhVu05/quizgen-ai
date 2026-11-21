import React from 'react';
import {
  Library,
  BookOpen,
  Search,
  UploadCloud,
  Check,
  Sparkles,
  X,
} from 'lucide-react';
import { DocumentItem } from './aigenTypes';

interface TextbookLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  libraryModalTab: 'my' | 'shared';
  onTabChange: (tab: 'my' | 'shared') => void;
  librarySearchQuery: string;
  onSearchChange: (q: string) => void;
  myDocuments: DocumentItem[];
  sharedDocuments: DocumentItem[];
  selectedBook: string;
  onSelectBook: (doc: DocumentItem) => void;
  onNavigateUpload: () => void;
}

export const TextbookLibraryModal: React.FC<TextbookLibraryModalProps> = ({
  isOpen,
  onClose,
  libraryModalTab,
  onTabChange,
  librarySearchQuery,
  onSearchChange,
  myDocuments,
  sharedDocuments,
  selectedBook,
  onSelectBook,
  onNavigateUpload,
}) => {
  if (!isOpen) return null;

  const currentDocs = libraryModalTab === 'shared' ? sharedDocuments : myDocuments;
  const filteredDocs = currentDocs.filter(
    (d) =>
      !librarySearchQuery ||
      d.name.toLowerCase().includes(librarySearchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-slate-900/50 p-4 animate-fade-in">
      <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-teal-50/50 via-white to-cyan-50/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#008689] text-white flex items-center justify-center font-bold shadow-xs">
              <Library className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">
                Kho Giáo Trình & Tài Liệu Soạn Đề
              </h3>
              <p className="text-xs text-slate-500">
                Chọn giáo trình học thuật chuẩn để AI bóc tách cấu trúc chương mục và tạo đề thi.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs: Thư viện dùng chung vs Giáo trình của tôi */}
        <div className="flex items-center border-b border-slate-200 px-5 pt-2 bg-slate-50/40 gap-4">
          <button
            type="button"
            onClick={() => onTabChange('shared')}
            className={`pb-2.5 pt-1 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              libraryModalTab === 'shared'
                ? 'border-[#008689] text-[#008689]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Library className="w-3.5 h-3.5" />
            <span>Thư viện dùng chung</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                libraryModalTab === 'shared'
                  ? 'bg-[#008689] text-white'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {sharedDocuments.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => onTabChange('my')}
            className={`pb-2.5 pt-1 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              libraryModalTab === 'my'
                ? 'border-[#008689] text-[#008689]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Giáo trình của tôi</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                libraryModalTab === 'my'
                  ? 'bg-[#008689] text-white'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {myDocuments.length}
            </span>
          </button>
        </div>

        {/* Search Input */}
        <div className="p-4 border-b border-slate-100 bg-white">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={librarySearchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Tìm kiếm giáo trình theo tên môn học, học phần..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#008689] transition-all"
            />
          </div>
        </div>

        {/* List of Books */}
        <div className="p-5 overflow-y-auto space-y-3 flex-1">
          {libraryModalTab === 'my' && myDocuments.length === 0 ? (
            <div className="p-8 text-center rounded-2xl border-2 border-dashed border-slate-200 space-y-3">
              <BookOpen className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs font-bold text-slate-700">Chưa có giáo trình cá nhân nào</p>
              <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                Thầy/Cô có thể tải lên tệp giáo trình PDF / DOCX của riêng mình ở Bước 1 hoặc chọn
                từ Thư viện dùng chung.
              </p>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onNavigateUpload();
                }}
                className="px-3.5 py-2 rounded-xl bg-[#008689] text-white font-bold text-xs hover:bg-[#006f72] transition-colors cursor-pointer inline-flex items-center gap-1.5"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                + Nạp giáo trình ở Bước 1
              </button>
            </div>
          ) : (
            filteredDocs.map((doc) => {
              const isCurrent = selectedBook === doc.id;
              return (
                <div
                  key={doc.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isCurrent
                      ? 'border-[#008689] bg-[#e0f7fa]/30 ring-1 ring-[#008689]'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-100 text-[#008689] flex items-center justify-center shrink-0 mt-0.5">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 leading-snug">{doc.name}</h4>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-1">
                        <span
                          className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                            libraryModalTab === 'shared'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {libraryModalTab === 'shared' ? 'Dùng chung' : 'Cá nhân'}
                        </span>
                        <span>• {doc.chaptersCount} chương mục</span>
                        <span>• {doc.totalPages} trang</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    {isCurrent ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-teal-100 text-[#008689] font-bold text-xs">
                        <Check className="w-3.5 h-3.5" />
                        Đang chọn
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onSelectBook(doc)}
                        className="px-3.5 py-1.5 rounded-xl bg-[#008689] hover:bg-[#006f72] text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        Dùng Giáo Trình Này
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}

          {filteredDocs.length === 0 && (libraryModalTab !== 'my' || myDocuments.length > 0) && (
            <div className="p-8 text-center text-xs text-slate-400">
              Không tìm thấy giáo trình nào phù hợp với từ khóa tìm kiếm.
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            Hiển thị {filteredDocs.length} giáo trình
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default TextbookLibraryModal;
