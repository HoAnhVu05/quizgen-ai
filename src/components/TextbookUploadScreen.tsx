import React, { useState, useRef } from 'react';
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

interface TextbookUploadScreenProps {
  onNavigate: (screen: ScreenId) => void;
  onShowToast: (type: 'success' | 'info' | 'warning' | 'error', title: string, message: string) => void;
}

const INITIAL_TEXTBOOKS: TextbookFile[] = [
  {
    id: 'tb-1',
    name: 'GiaoTrinh_KinhTeViMo_2025.pdf',
    size: '14.2 MB',
    totalPages: 320,
    chaptersCount: 12,
    status: 'ready',
    progress: 100,
    uploadedAt: '28/10/2026',
    chunksPreview: [
      '[Trang 12] Chương 1: Giới thiệu tổng quan kinh tế học vi mô...',
      '[Trang 42] Chương 3: Quy luật cầu và độ co giãn giá cả...',
      '[Trang 78] Chương 5: Hàm sản xuất Cobb-Douglas và chi phí biên...',
    ]
  },
  {
    id: 'tb-2',
    name: 'NguyenLy_KeToan_TaiChinh.docx',
    size: '8.7 MB',
    totalPages: 185,
    chaptersCount: 8,
    status: 'ready',
    progress: 100,
    uploadedAt: '27/10/2026',
    chunksPreview: [
      '[Trang 5] Chương 1: Phương trình kế toán cơ bản Tài sản = Nợ + Vốn chủ sở hữu...',
      '[Trang 34] Chương 2: Ghi sổ kép và hệ thống tài khoản kế toán doanh nghiệp...'
    ]
  },
  {
    id: 'tb-3',
    name: 'Marketing_CanBan_Chuong4_8.pdf',
    size: '22.4 MB',
    totalPages: 110,
    chaptersCount: 5,
    status: 'embedding',
    progress: 68,
    uploadedAt: 'Hôm nay',
    chunksPreview: [
      '[Trang 10] Chương 4: Phân đoạn thị trường và định vị thương hiệu STP...'
    ]
  },
  {
    id: 'tb-4',
    name: 'PhapLuat_DaiCuong_K19.pdf',
    size: '19.1 MB',
    totalPages: 240,
    chaptersCount: 9,
    status: 'extracting',
    progress: 32,
    uploadedAt: 'Hôm nay',
  },
];

export const TextbookUploadScreen: React.FC<TextbookUploadScreenProps> = ({ onNavigate, onShowToast }) => {
  const [textbooks, setTextbooks] = useState<TextbookFile[]>(INITIAL_TEXTBOOKS);
  const [isDragging, setIsDragging] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [inspectingBook, setInspectingBook] = useState<TextbookFile | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // File Upload Handler Simulation
  const handleUploadFiles = (fileName: string, fileSize: string) => {
    const newBook: TextbookFile = {
      id: `tb-${Date.now()}`,
      name: fileName,
      size: fileSize,
      totalPages: Math.floor(Math.random() * 150) + 80,
      chaptersCount: Math.floor(Math.random() * 6) + 4,
      status: 'extracting',
      progress: 25,
      uploadedAt: 'Vừa xong',
      chunksPreview: [
        '[Trang 1] Mục lục và giới thiệu đề cương môn học...',
        '[Trang 25] Chương 1: Cơ sở lý thuyết nền tảng và phương pháp luận...'
      ]
    };

    setTextbooks((prev) => [newBook, ...prev]);
    onShowToast('info', 'Đã tải lên tệp', `Bắt đầu bóc tách văn bản cho ${fileName}`);

    // Simulate progress
    setTimeout(() => {
      setTextbooks((prev) =>
        prev.map((b) => (b.id === newBook.id ? { ...b, status: 'embedding', progress: 75 } : b))
      );
      onShowToast('info', 'Đang tạo Embeddings', 'RAG Engine đang tính toán vector cho tài liệu');
    }, 1500);

    setTimeout(() => {
      setTextbooks((prev) =>
        prev.map((b) => (b.id === newBook.id ? { ...b, status: 'ready', progress: 100 } : b))
      );
      onShowToast('success', 'Hoàn tất xử lý!', `${fileName} đã sẵn sàng để sinh câu hỏi AI`);
    }, 3000);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      handleUploadFiles(file.name, `${(file.size / (1024 * 1024)).toFixed(1)} MB`);
    } else {
      handleUploadFiles('GiaoTrinh_Moi_2026.pdf', '12.8 MB');
    }
  };

  const handleDelete = (id: string, name: string) => {
    setTextbooks((prev) => prev.filter((b) => b.id !== id));
    onShowToast('warning', 'Đã xóa tài liệu', `Đã loại bỏ ${name} khỏi kho RAG`);
  };

  const filteredBooks = textbooks.filter((b) =>
    b.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 p-8 overflow-y-auto space-y-8 bg-[#0b0f19] text-slate-100 relative">
      {/* Background Glow */}
      <div className="absolute top-10 left-1/3 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* 1. Header */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-white/[0.06]">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
              RAG Knowledge Base
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight mt-1.5">
            Quản lý & Nạp Giáo trình
          </h1>
          <p className="text-xs md:text-sm text-slate-400 mt-1">
            Bóc tách cấu trúc ngữ nghĩa (PDF, DOCX) thành các đoạn Chunks kèm tọa độ trang sách cho AI đối soát.
          </p>
        </div>

        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-600/25 transition-all hover:scale-[1.02]"
        >
          <UploadCloud className="w-4 h-4" />
          <span>Tải tệp từ máy tính</span>
        </button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              const file = e.target.files[0];
              handleUploadFiles(file.name, `${(file.size / (1024 * 1024)).toFixed(1)} MB`);
            }
          }}
          className="hidden"
          accept=".pdf,.docx"
        />
      </div>

      {/* 2. Drag & Drop Upload Zone (High-tech Laser Radar look) */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative z-10 overflow-hidden rounded-2xl p-10 text-center transition-all duration-300 cursor-pointer border ${
          isDragging
            ? 'border-blue-500 bg-blue-500/[0.08] scale-[0.99] shadow-glow-md'
            : 'glass-card border-white/[0.1] hover:border-blue-500/40 hover:bg-white/[0.02]'
        }`}
      >
        {/* Animated laser scan beam */}
        <div className="absolute inset-x-0 h-24 bg-gradient-to-b from-blue-500/10 via-blue-500/5 to-transparent animate-scan-beam pointer-events-none" />

        <div className="max-w-md mx-auto flex flex-col items-center relative z-10">
          <div className="relative mb-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600/20 to-indigo-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-glow-sm">
              <UploadCloud className="w-8 h-8" />
            </div>
            <div className="absolute -inset-2 bg-blue-500/10 rounded-2xl blur-lg -z-10 animate-pulse" />
          </div>

          <h3 className="text-base font-bold text-white tracking-tight">
            Kéo thả tài liệu giáo trình vào không gian này
          </h3>
          <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
            Hỗ trợ chuẩn định dạng <span className="text-blue-300 font-semibold font-mono">PDF (.pdf)</span> hoặc{' '}
            <span className="text-blue-300 font-semibold font-mono">Word (.docx)</span>. Giới hạn 100MB/tệp.
          </p>

          <div className="mt-5 flex items-center space-x-3">
            <span className="px-5 py-2.5 bg-white/[0.08] hover:bg-white/[0.12] text-white text-xs font-semibold rounded-xl border border-white/[0.1] transition-colors">
              Duyệt tệp máy tính
            </span>
            <span className="text-[11px] text-slate-400 font-mono">OCR thông minh & Nhận diện mục lục</span>
          </div>
        </div>
      </div>

      {/* 3. Data Table of Uploaded Documents */}
      <div className="glass-card rounded-2xl overflow-hidden relative z-10">
        {/* Table Toolbar */}
        <div className="p-5 border-b border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <FileCheck2 className="w-5 h-5 text-blue-400" />
            <h3 className="text-sm font-bold text-white">
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
                className="pl-8 pr-3.5 py-1.5 text-xs bg-white/[0.04] border border-white/[0.08] rounded-xl focus:outline-none focus:border-blue-500 text-slate-200 placeholder-slate-400 w-60"
              />
            </div>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-white/[0.02] border-b border-white/[0.06] text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3.5 px-6">Tên giáo trình</th>
                <th className="py-3.5 px-4">Quy mô</th>
                <th className="py-3.5 px-4">Ngày nạp</th>
                <th className="py-3.5 px-6">Tiến trình RAG Pipeline</th>
                <th className="py-3.5 px-6 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04] text-slate-300">
              {filteredBooks.map((book) => {
                return (
                  <tr key={book.id} className="hover:bg-white/[0.02] transition-colors">
                    {/* Name */}
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-3.5">
                        <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-semibold text-white text-xs">{book.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{book.size}</div>
                        </div>
                      </div>
                    </td>

                    {/* Scale */}
                    <td className="py-4 px-4 font-mono">
                      <div className="text-slate-200">{book.totalPages} trang</div>
                      <div className="text-slate-400 text-[10px]">{book.chaptersCount} chương mục</div>
                    </td>

                    {/* Upload date */}
                    <td className="py-4 px-4 text-slate-400 font-mono text-[11px]">
                      {book.uploadedAt}
                    </td>

                    {/* Pipeline Progress */}
                    <td className="py-4 px-6 min-w-[240px]">
                      {book.status === 'ready' && (
                        <div>
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-300 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/25">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Sẵn sàng sinh đề
                          </span>
                        </div>
                      )}

                      {book.status === 'embedding' && (
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-[10px] text-slate-300 font-medium">
                            <span className="flex items-center gap-1.5 text-blue-300">
                              <Sparkles className="w-3 h-3 text-blue-400 animate-spin" /> Vectorizing (ChromaDB)...
                            </span>
                            <span className="font-mono text-blue-400">{book.progress}%</span>
                          </div>
                          <div className="w-full bg-white/[0.06] h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full rounded-full transition-all duration-300 shadow-glow-sm"
                              style={{ width: `${book.progress}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {book.status === 'extracting' && (
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-[10px] text-slate-300 font-medium">
                            <span className="flex items-center gap-1.5 text-amber-300">
                              <RefreshCw className="w-3 h-3 text-amber-400 animate-spin" /> Bóc tách OCR...
                            </span>
                            <span className="font-mono text-amber-400">{book.progress}%</span>
                          </div>
                          <div className="w-full bg-white/[0.06] h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-gradient-to-r from-amber-500 to-orange-500 h-full rounded-full transition-all duration-300 shadow-glow-sm"
                              style={{ width: `${book.progress}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-6 text-right space-x-2">
                      <button
                        onClick={() => setInspectingBook(book)}
                        className="p-1.5 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-white/[0.06]"
                        title="Khám phá Chunks RAG"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {book.status === 'ready' ? (
                        <button
                          onClick={() => onNavigate('generate')}
                          className="px-3 py-1.5 text-[11px] font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors shadow-sm"
                        >
                          Sinh câu hỏi AI
                        </button>
                      ) : (
                        <button
                          disabled
                          className="px-3 py-1.5 text-[11px] font-medium text-slate-500 bg-white/[0.04] rounded-lg cursor-not-allowed"
                        >
                          Đang xử lý...
                        </button>
                      )}

                      <button
                        onClick={() => handleDelete(book.id, book.name)}
                        className="p-1.5 text-slate-400 hover:text-rose-400 transition-colors rounded-lg hover:bg-white/[0.06]"
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
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-2xl rounded-2xl shadow-2xl border border-white/[0.1] overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-5 border-b border-white/[0.06] flex items-center justify-between bg-white/[0.02]">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-xs">{inspectingBook.name}</h3>
                  <p className="text-[10px] text-slate-400 font-mono">
                    {inspectingBook.totalPages} trang • {inspectingBook.chaptersCount} chương mục • Vector Status: {inspectingBook.status}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setInspectingBook(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.08]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              <h4 className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">
                Mẫu đoạn trích xuất (Semantic Chunks Preview):
              </h4>
              {inspectingBook.chunksPreview && inspectingBook.chunksPreview.length > 0 ? (
                inspectingBook.chunksPreview.map((chunk, idx) => (
                  <div key={idx} className="p-3.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-xs text-slate-300 font-mono leading-relaxed">
                    {chunk}
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-slate-500 text-xs">
                  Chưa có bản xem trước cho tệp này.
                </div>
              )}

              <div className="p-3.5 bg-blue-500/10 border border-blue-500/20 rounded-xl text-xs text-blue-300 flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <p>
                  Các đoạn văn bản này được chia cắt theo ranh giới đoạn ngữ nghĩa và gắn nhãn số trang để LLM trích xuất làm minh chứng khi sinh câu hỏi.
                </p>
              </div>
            </div>

            <div className="p-4 border-t border-white/[0.06] bg-white/[0.02] flex justify-end">
              <button
                onClick={() => setInspectingBook(null)}
                className="px-4 py-2 bg-white/[0.08] hover:bg-white/[0.12] text-white rounded-xl text-xs font-semibold"
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
