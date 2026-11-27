import React, { useState, useEffect } from 'react';
import {
  FileText,
  Pencil,
  X,
  Link as LinkIcon,
  Image as ImageIcon,
  Loader2,
} from 'lucide-react';
import { UserProfile } from '../../types';
import apiClient, { API_BASE } from '../../services/apiClient';
import { compressImageFile } from '../../utils/imageCompressor';
import { ForumPost } from './forumTypesAndData';

interface ForumEditPostModalProps {
  post: ForumPost | null;
  onClose: () => void;
  currentUser?: UserProfile | null;
  onShowToast: (type: 'success' | 'info' | 'warning' | 'error', title: string, message: string) => void;
  onSaveEdit: (updatedPost: ForumPost) => void;
}

export const ForumEditPostModal: React.FC<ForumEditPostModalProps> = ({
  post,
  onClose,
  currentUser,
  onShowToast,
  onSaveEdit,
}) => {
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editCategory, setEditCategory] = useState<'exam' | 'qa' | 'textbook'>('exam');
  const [editTags, setEditTags] = useState<string[]>([]);
  const [editTagInput, setEditTagInput] = useState('');

  // Attachments
  const [editAttachedFileName, setEditAttachedFileName] = useState('');
  const [editAttachedFileSize, setEditAttachedFileSize] = useState('');
  const [editAttachedFileUrl, setEditAttachedFileUrl] = useState('');
  const [isEditUploadingFile, setIsEditUploadingFile] = useState(false);

  const [editImageUrl, setEditImageUrl] = useState('');
  const [editLinkUrl, setEditLinkUrl] = useState('');
  const [editLinkLabel, setEditLinkLabel] = useState('');

  useEffect(() => {
    if (post) {
      setEditTitle(post.title || '');
      setEditContent(post.content || '');
      setEditCategory(post.category || 'exam');
      setEditTags(post.tags ? post.tags.filter((t) => t && t !== 'Chung') : []);
      setEditTagInput('');
      setEditAttachedFileName(post.attachmentFileName || '');
      setEditAttachedFileSize(post.attachmentFileSize || '');
      setEditAttachedFileUrl(post.attachmentUrl || '');
      setEditImageUrl(post.imageUrl || '');
      setEditLinkUrl(post.linkUrl || post.videoUrl || '');
      setEditLinkLabel(post.linkLabel || (post.videoUrl ? 'Video bài giảng' : ''));
    }
  }, [post]);

  if (!post) return null;

  const handleAddEditTag = () => {
    const clean = editTagInput.trim().replace(/^#/, '').replace(/\s+/g, '_');
    if (clean && !editTags.includes(clean)) {
      setEditTags([...editTags, clean]);
      setEditTagInput('');
    }
  };

  const handleSelectEditFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const userTier = (currentUser?.planTier || 'FREE').toUpperCase();
    const maxMb = userTier === 'ENTERPRISE' ? 100 : (userTier === 'PRO_MONTH' || userTier === 'PRO_YEAR' || userTier === 'PRO') ? 50 : 25;
    if (file.size > maxMb * 1024 * 1024) {
      onShowToast('warning', 'Tệp quá lớn', `Hệ thống hỗ trợ đính kèm tối đa ${maxMb}MB cho gói ${userTier}.`);
      return;
    }

    let fileToUpload = file;
    if (file.type.startsWith('image/')) {
      try {
        fileToUpload = await compressImageFile(file);
      } catch {}
    }

    setEditAttachedFileName(fileToUpload.name);
    const sizeStr =
      fileToUpload.size > 1024 * 1024
        ? `${(fileToUpload.size / (1024 * 1024)).toFixed(1)} MB`
        : `${Math.round(fileToUpload.size / 1024)} KB`;
    setEditAttachedFileSize(sizeStr);
    setIsEditUploadingFile(true);

    try {
      const formData = new FormData();
      formData.append('file', fileToUpload);
      const res = await apiClient
        .fetch(`${API_BASE}/documents/qgroups/upload-attachment`, {
          method: 'POST',
          body: formData,
        })
        .then((r) => r.json());

      if (res && res.fileUrl) {
        setEditAttachedFileUrl(res.fileUrl);
        onShowToast('success', 'Đã tải tệp lên', `${file.name} (${sizeStr})`);
      } else {
        throw new Error(res?.detail || 'Lỗi lưu trữ tệp trên máy chủ');
      }
    } catch (err: any) {
      console.warn('Backend upload fallback:', err);
      const localUrl = URL.createObjectURL(file);
      setEditAttachedFileUrl(localUrl);
      onShowToast('info', 'Đã gắn tệp', `${file.name} (${sizeStr})`);
    } finally {
      setIsEditUploadingFile(false);
    }
  };

  const handleSelectEditImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          setEditImageUrl(ev.target.result as string);
          onShowToast('info', 'Đã gắn ảnh', file.name);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    if (!editTitle.trim() || !editContent.trim()) {
      onShowToast('warning', 'Thiếu thông tin', 'Vui lòng nhập đầy đủ tiêu đề và nội dung.');
      return;
    }

    const pendingTag = editTagInput.trim().replace(/^#/, '').replace(/\s+/g, '_');
    const finalTags = [...editTags];
    if (pendingTag && !finalTags.includes(pendingTag)) {
      finalTags.push(pendingTag);
    }

    const updatedPost: ForumPost = {
      ...post,
      title: editTitle.trim(),
      content: editContent.trim(),
      category: editCategory,
      tags: finalTags,
      attachmentFileName: editAttachedFileName.trim() || undefined,
      attachmentFileSize: editAttachedFileSize.trim() || undefined,
      attachmentUrl: editAttachedFileUrl.trim() || undefined,
      imageUrl: editImageUrl.trim() || undefined,
      linkUrl: editLinkUrl.trim() || undefined,
      linkLabel: editLinkLabel.trim() || undefined,
    };

    onSaveEdit(updatedPost);
    onClose();
    onShowToast('success', 'Cập nhật thành công', 'Nội dung và tệp đính kèm đã được lưu thay đổi.');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs animate-fadeIn"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-white rounded-xl shadow-xl border border-slate-200 p-4 sm:p-5 space-y-3.5 text-xs animate-fadeIn max-h-[92vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
              <Pencil className="w-3.5 h-3.5" />
            </div>
            <h3 className="font-bold text-sm text-slate-900">Chỉnh sửa chủ đề thảo luận</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="space-y-3 overflow-y-auto pr-1 flex-1">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Tiêu đề:</label>
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="Tiêu đề thảo luận..."
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-900 focus:outline-none focus:bg-white focus:border-slate-800"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Chuyên mục:</label>
              <select
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value as any)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-none focus:bg-white focus:border-slate-800"
              >
                <option value="exam">Đề thi &amp; Ma trận Bloom</option>
                <option value="qa">Hỏi đáp Khảo thí</option>
                <option value="textbook">Giáo trình &amp; Học liệu</option>
              </select>
            </div>

            {/* Edit Tags Input */}
            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">
                Gắn thẻ môn học / Chủ đề:
              </label>
              <div className="flex items-center gap-1.5 flex-wrap p-1.5 bg-slate-50 border border-slate-200 rounded-lg min-h-[36px]">
                {editTags.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-900 text-white font-mono text-[11px]"
                  >
                    #{t}
                    <button
                      type="button"
                      onClick={() => setEditTags(editTags.filter((x) => x !== t))}
                      className="text-slate-400 hover:text-white cursor-pointer"
                    >
                      ×
                    </button>
                  </span>
                ))}
                <div className="flex items-center gap-1 flex-1 min-w-[120px]">
                  <input
                    type="text"
                    value={editTagInput}
                    onChange={(e) => setEditTagInput(e.target.value)}
                    onBlur={handleAddEditTag}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ',') {
                        e.preventDefault();
                        handleAddEditTag();
                      }
                    }}
                    placeholder="Thêm thẻ (Enter)..."
                    className="bg-transparent text-xs text-slate-800 focus:outline-none flex-1 px-1 min-w-[80px]"
                  />
                  {editTagInput.trim() && (
                    <button
                      type="button"
                      onClick={handleAddEditTag}
                      className="px-2 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded text-[11px] font-semibold cursor-pointer shrink-0"
                    >
                      +
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Nội dung:</label>
            <textarea
              rows={4}
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              placeholder="Nhập nội dung chia sẻ..."
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:bg-white focus:border-slate-800 leading-relaxed resize-none"
            />
          </div>

          {/* Tệp đính kèm & Đa phương tiện */}
          <div className="space-y-2 pt-1 border-t border-slate-100">
            <span className="font-semibold text-slate-700 block">Tệp đính kèm &amp; Đa phương tiện:</span>

            {/* File đính kèm */}
            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                {editAttachedFileName ? (
                  <div className="truncate">
                    <span className="font-bold text-slate-900 truncate block">{editAttachedFileName}</span>
                    {editAttachedFileSize && <span className="text-[10px] text-slate-400 font-mono">({editAttachedFileSize})</span>}
                  </div>
                ) : (
                  <span className="text-slate-400 italic">Chưa có tệp đính kèm (.docx, .pdf, .xlsx)</span>
                )}
                {isEditUploadingFile && (
                  <span className="text-[11px] text-teal-600 font-medium flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" /> Đang tải...
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <label className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded text-slate-700 font-semibold cursor-pointer text-[11px] flex items-center gap-1 transition-colors">
                  <span>{editAttachedFileName ? 'Đổi tệp' : 'Chọn tệp'}</span>
                  <input
                    type="file"
                    accept=".docx,.pdf,.xlsx,.zip,.pptx,.txt"
                    onChange={handleSelectEditFile}
                    className="hidden"
                  />
                </label>
                {editAttachedFileName && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditAttachedFileName('');
                      setEditAttachedFileSize('');
                      setEditAttachedFileUrl('');
                    }}
                    className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                    title="Xóa tệp đính kèm"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Ảnh minh họa */}
            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-slate-600" />
                  <span>Ảnh / Sơ đồ minh họa:</span>
                </span>
                <div className="flex items-center gap-1.5">
                  <label className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded text-slate-700 font-semibold cursor-pointer text-[11px] flex items-center gap-1 transition-colors">
                    <span>{editImageUrl ? 'Đổi ảnh' : 'Chọn ảnh'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleSelectEditImage}
                      className="hidden"
                    />
                  </label>
                  {editImageUrl && (
                    <button
                      type="button"
                      onClick={() => setEditImageUrl('')}
                      className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                      title="Xóa ảnh"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
              {editImageUrl && (
                <img
                  src={editImageUrl}
                  alt="Edit preview"
                  className="max-h-28 rounded object-contain border border-slate-200 mx-auto"
                />
              )}
            </div>

            {/* Liên kết ngoài / Video */}
            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                  <LinkIcon className="w-3.5 h-3.5 text-slate-600" />
                  <span>Liên kết ngoài / Video:</span>
                </span>
                {editLinkUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditLinkUrl('');
                      setEditLinkLabel('');
                    }}
                    className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                    title="Xóa liên kết"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  value={editLinkUrl}
                  onChange={(e) => setEditLinkUrl(e.target.value)}
                  placeholder="https://... (Website hoặc YouTube)"
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-slate-800"
                />
                <input
                  type="text"
                  value={editLinkLabel}
                  onChange={(e) => setEditLinkLabel(e.target.value)}
                  placeholder="Tiêu đề / Tên liên kết (ví dụ: Video bài giảng)..."
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-slate-800"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer Buttons (Sticky) */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 font-semibold rounded-lg cursor-pointer"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isEditUploadingFile}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-semibold rounded-lg shadow-2xs cursor-pointer"
          >
            {isEditUploadingFile ? 'Đang tải tệp...' : 'Lưu thay đổi'}
          </button>
        </div>
      </div>
    </div>
  );
};
