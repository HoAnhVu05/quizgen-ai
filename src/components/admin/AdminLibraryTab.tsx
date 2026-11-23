import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Download,
  Edit3,
  Eye,
  FileText,
  Filter,
  Globe,
  Lock,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  X,
  Check,
} from 'lucide-react';
import { TextbookFile } from '../../types';
import apiClient from '../../services/apiClient';
import { formatVietnameseDateTime } from '../../utils/dateUtils';
import { InspectChunksModal } from '../textbook/InspectChunksModal';

export interface AdminLibraryTabProps {
  isLoading?: boolean;
}

export const AdminLibraryTab: React.FC<AdminLibraryTabProps> = () => {
  const [documents, setDocuments] = useState<TextbookFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [scopeFilter, setScopeFilter] = useState<'all' | 'shared' | 'private'>('all');

  // Preview & Chunks state
  const [previewDoc, setPreviewDoc] = useState<TextbookFile | null>(null);
  const [inspectingChunks, setInspectingChunks] = useState<string[]>([]);
  const [isFetchingChunks, setIsFetchingChunks] = useState(false);

  const handleOpenPreview = async (doc: TextbookFile) => {
    setPreviewDoc(doc);
    setIsFetchingChunks(true);
    try {
      const res = await apiClient.get<any>(`/documents/${doc.id}/chunks`);
      const chunks = res?.chunks || res || [];
      setInspectingChunks(
        Array.isArray(chunks)
          ? chunks.map((c: any) => (typeof c === 'string' ? c : c.text || JSON.stringify(c)))
          : []
      );
    } catch {
      setInspectingChunks(['Chưa có trích đoạn văn bản cho tài liệu này hoặc đang xử lý.']);
    } finally {
      setIsFetchingChunks(false);
    }
  };

  // Edit Metadata state
  const [editingDoc, setEditingDoc] = useState<TextbookFile | null>(null);
  const [editName, setEditName] = useState('');
  const [editAuthor, setEditAuthor] = useState('');
  const [editIsShared, setEditIsShared] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Delete state
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchAllDocs = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<TextbookFile[]>('/documents?scope=all');
      setDocuments(Array.isArray(res) ? res : []);
    } catch (e) {
      console.error('[AdminLibraryTab] Lỗi tải tài liệu:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllDocs();
  }, []);

  const handleOpenEdit = (doc: TextbookFile) => {
    setEditingDoc(doc);
    setEditName(doc.name);
    setEditAuthor(doc.authorName || 'Giảng viên UTH');
    setEditIsShared(Boolean(doc.isShared));
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDoc) return;
    setIsSavingEdit(true);
    try {
      await apiClient.patch(`/documents/${editingDoc.id}`, {
        name: editName.trim(),
        author_name: editAuthor.trim(),
        is_shared: editIsShared,
        sharing_scope: editIsShared ? 'department' : 'private',
      });
      setDocuments((prev) =>
        prev.map((d) =>
          d.id === editingDoc.id
            ? {
                ...d,
                name: editName.trim(),
                authorName: editAuthor.trim(),
                isShared: editIsShared,
                sharingScope: editIsShared ? 'department' : 'private',
              }
            : d
        )
      );
      setEditingDoc(null);
    } catch (err: any) {
      alert(`Lỗi cập nhật: ${err?.message || 'Không thể lưu thông tin.'}`);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDelete = async (doc: TextbookFile) => {
    if (
      !window.confirm(
        `Xác nhận XÓA HOÀN TOÀN giáo trình "${doc.name}"?\nThao tác này sẽ dọn sạch tệp vật lý, dữ liệu và toàn bộ vector ChromaDB trong RAG!`
      )
    ) {
      return;
    }

    setDeletingId(doc.id);
    try {
      const res = await apiClient.fetch(`/api/v1/documents/${doc.id}`, { method: 'DELETE' });
      if (res.ok) {
        setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
      } else {
        alert('Không thể xóa tài liệu trên máy chủ.');
      }
    } catch (err: any) {
      alert(`Lỗi khi xóa tài liệu: ${err?.message || 'Lỗi kết nối'}`);
    } finally {
      setDeletingId(null);
    }
  };

  const filteredDocs = documents.filter((d) => {
    const matchSearch =
      (d.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (d.authorName || '').toLowerCase().includes(search.toLowerCase()) ||
      (d.userId || '').toLowerCase().includes(search.toLowerCase());

    const matchScope =
      scopeFilter === 'all'
        ? true
        : scopeFilter === 'shared'
        ? Boolean(d.isShared)
        : !Boolean(d.isShared);

    return matchSearch && matchScope;
  });

  const totalShared = documents.filter((d) => d.isShared).length;
  const totalPrivate = documents.length - totalShared;

  return (
    <div className="space-y-5">
      {/* Top Banner & Stats */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[#008689]" />
            <span>Quản Lý Toàn Bộ Thư Viện Giáo Trình &amp; Học Thuật RAG</span>
          </h3>
          <p className="text-xs text-slate-500">
            Tổng quan và kiểm duyệt mọi tài liệu tải lên trên toàn hệ thống ({documents.length} giáo trình).
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={fetchAllDocs}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#008689]' : ''}`} />
            <span>Làm mới danh sách</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Mini */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between shadow-2xs">
          <div>
            <div className="text-xs text-slate-500 font-semibold">Toàn Bộ Giáo Trình</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{documents.length}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-teal-50 text-[#008689] flex items-center justify-center">
            <BookOpen className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between shadow-2xs">
          <div>
            <div className="text-xs text-slate-500 font-semibold">Kho Dùng Chung (Public)</div>
            <div className="text-2xl font-bold text-emerald-700 mt-1">{totalShared}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Globe className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between shadow-2xs">
          <div>
            <div className="text-xs text-slate-500 font-semibold">Kho Riêng Tư (Private)</div>
            <div className="text-2xl font-bold text-slate-700 mt-1">{totalPrivate}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
            <Lock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo tên giáo trình, tác giả, mã giảng viên..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-[#008689] focus:bg-white transition-colors"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-semibold flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" />
            <span>Phạm vi:</span>
          </span>
          <select
            value={scopeFilter}
            onChange={(e) => setScopeFilter(e.target.value as any)}
            className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl px-3 py-2 outline-none focus:border-[#008689] cursor-pointer"
          >
            <option value="all">Tất cả giáo trình ({documents.length})</option>
            <option value="shared">Chỉ thư viện dùng chung ({totalShared})</option>
            <option value="private">Chỉ tài liệu riêng tư ({totalPrivate})</option>
          </select>
        </div>
      </div>

      {/* Documents Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-[11px] text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Tên Giáo Trình</th>
                <th className="py-3 px-4">Tác Giả &amp; Mã Giảng Viên</th>
                <th className="py-3 px-4">Quy Mô / Trang</th>
                <th className="py-3 px-4">Trạng Thái RAG</th>
                <th className="py-3 px-4">Ngày Tải Lên</th>
                <th className="py-3 px-4 text-right">Thao Tác Quản Trị</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-normal">
              {filteredDocs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <FileText className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    Không tìm thấy giáo trình nào phù hợp.
                  </td>
                </tr>
              ) : (
                filteredDocs.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Tên Giáo trình */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-teal-50 text-[#008689] border border-teal-200 flex items-center justify-center shrink-0">
                          <BookOpen className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 truncate max-w-xs" title={doc.name}>
                            {doc.name}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono truncate">ID: {doc.id}</div>
                        </div>
                      </div>
                    </td>

                    {/* Tác giả & Giảng viên */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">{doc.authorName || 'Chưa cập nhật'}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{doc.userId || 'Chưa định danh'}</div>
                    </td>

                    {/* Quy mô */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">{doc.totalPages || 0} trang</div>
                      <div className="text-[11px] text-slate-400">{doc.size || 'N/A'}</div>
                    </td>

                    {/* Trạng thái */}
                    <td className="py-3 px-4">
                      <div className="space-y-1">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Sẵn sàng RAG
                        </span>
                        <div>
                          {doc.isShared ? (
                            <span className="inline-flex items-center gap-1 text-[10px] text-teal-700 font-semibold">
                              <Globe className="w-3 h-3 text-[#008689]" />
                              Dùng chung
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 font-semibold">
                              <Lock className="w-3 h-3 text-slate-400" />
                              Riêng tư
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Ngày tải lên */}
                    <td className="py-3 px-4 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                      {formatVietnameseDateTime(doc.uploadedAt)}
                    </td>

                    {/* Thao tác */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Đọc / Xem đoạn trích Chunks */}
                        <button
                          onClick={() => handleOpenPreview(doc)}
                          title="Đọc văn bản &amp; Kiểm tra Chunks RAG"
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-teal-50 hover:bg-teal-100 text-[#008689] border border-teal-200 transition-colors shadow-2xs"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Đọc / RAG</span>
                        </button>

                        {/* Chỉnh sửa Metadata */}
                        <button
                          onClick={() => handleOpenEdit(doc)}
                          title="Chỉnh sửa tên giáo trình, tác giả, trạng thái chia sẻ"
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        {/* Tải về */}
                        <a
                          href={`/api/v1/documents/${doc.id}/download`}
                          download
                          title="Tải tệp gốc về máy"
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>

                        {/* Xóa hoàn toàn */}
                        <button
                          onClick={() => handleDelete(doc)}
                          disabled={deletingId === doc.id}
                          title="Xóa vĩnh viễn khỏi CSDL và RAG ChromaDB"
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 hover:text-[#da1c2d] text-slate-500 transition-colors disabled:opacity-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Metadata Modal */}
      {editingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-[#008689]" />
                <h4 className="text-sm font-bold text-slate-900">Chỉnh Sửa Thông Tin Giáo Trình</h4>
              </div>
              <button
                onClick={() => setEditingDoc(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Tên Giáo Trình</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-800 outline-none focus:border-[#008689] focus:bg-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Tác Giả / Giảng Viên</label>
                <input
                  type="text"
                  value={editAuthor}
                  onChange={(e) => setEditAuthor(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-800 outline-none focus:border-[#008689] focus:bg-white"
                />
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editIsShared}
                    onChange={(e) => setEditIsShared(e.target.checked)}
                    className="w-4 h-4 rounded text-[#008689] focus:ring-[#008689] border-slate-300"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800">Chia sẻ vào Ngân hàng Thư viện Dùng chung</span>
                    <p className="text-[11px] text-slate-500">Mọi giảng viên trong khoa đều có thể khai thác để sinh đề AI</p>
                  </div>
                </label>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingDoc(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-[#008689] hover:bg-[#007376] text-white shadow-xs transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSavingEdit ? 'Đang lưu...' : 'Lưu Thay Đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Inspect Chunks & RAG Modal */}
      {previewDoc && (
        <InspectChunksModal
          inspectingBook={previewDoc}
          onClose={() => setPreviewDoc(null)}
          isFetchingChunks={isFetchingChunks}
          inspectingChunks={inspectingChunks}
        />
      )}
    </div>
  );
};
