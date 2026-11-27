import React, { useState } from 'react';
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

interface ForumComposerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: UserProfile | null;
  onShowToast: (type: 'success' | 'info' | 'warning' | 'error', title: string, message: string) => void;
  onPostCreated: (post: ForumPost) => void;
}

export const ForumComposerModal: React.FC<ForumComposerModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onShowToast,
  onPostCreated,
}) => {
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<'exam' | 'qa' | 'textbook'>('exam');
  const [newContent, setNewContent] = useState('');
  const [newTags, setNewTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  // Attachments
  const [showAttachFile, setShowAttachFile] = useState(false);
  const [attachedFileName, setAttachedFileName] = useState('');
  const [attachedFileSize, setAttachedFileSize] = useState('');
  const [attachedFileUrl, setAttachedFileUrl] = useState('');
  const [isUploadingFile, setIsUploadingFile] = useState(false);

  const [showAttachImage, setShowAttachImage] = useState(false);
  const [imageUrl, setImageUrl] = useState('');

  const [showAttachLink, setShowAttachLink] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkLabel, setLinkLabel] = useState('');

  if (!isOpen) return null;

  const handleAddTag = () => {
    const clean = tagInput.trim().replace(/^#/, '').replace(/\s+/g, '_');
    if (clean && !newTags.includes(clean)) {
      setNewTags([...newTags, clean]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setNewTags(newTags.filter((t) => t !== tagToRemove));
  };

  const handleSelectLocalFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

    setAttachedFileName(fileToUpload.name);
    const sizeStr =
      fileToUpload.size > 1024 * 1024
        ? `${(fileToUpload.size / (1024 * 1024)).toFixed(1)} MB`
        : `${Math.round(fileToUpload.size / 1024)} KB`;
    setAttachedFileSize(sizeStr);
    setShowAttachFile(true);
    setIsUploadingFile(true);

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
        setAttachedFileUrl(res.fileUrl);
        onShowToast('success', 'Tải tệp lên hoàn tất', `${file.name} (${sizeStr})`);
      } else {
        throw new Error(res?.detail || 'Lỗi lưu trữ tệp trên máy chủ');
      }
    } catch (err: any) {
      console.warn('Backend upload fallback:', err);
      const localUrl = URL.createObjectURL(file);
      setAttachedFileUrl(localUrl);
      onShowToast('info', 'Đã gắn tệp', `${file.name} (${sizeStr})`);
    } finally {
      setIsUploadingFile(false);
    }
  };

  const handleSelectLocalImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          setImageUrl(ev.target.result as string);
          setShowAttachImage(true);
          onShowToast('info', 'Đã đính kèm ảnh', file.name);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreatePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      onShowToast('warning', 'Thiếu tiêu đề', 'Vui lòng nhập tiêu đề cho cuộc thảo luận.');
      return;
    }
    if (!newContent.trim()) {
      onShowToast('warning', 'Thiếu nội dung', 'Vui lòng nhập nội dung chi tiết.');
      return;
    }

    const pendingTag = tagInput.trim().replace(/^#/, '').replace(/\s+/g, '_');
    const finalTags = [...newTags];
    if (pendingTag && !finalTags.includes(pendingTag)) {
      finalTags.push(pendingTag);
    }

    const nowIso = new Date().toISOString();
    const newPost: ForumPost = {
      id: `post-${Date.now()}`,
      title: newTitle.trim(),
      authorEmail: currentUser?.email,
      authorName: currentUser?.fullName || 'TS. Hồ Anh Vũ',
      authorAvatarUrl: currentUser?.avatarUrl || '',
      authorTitle: currentUser?.academicTitle || 'TS.',
      authorRole: currentUser?.role === 'admin' ? 'Quản trị viên' : 'Giảng viên',
      department: (currentUser as any)?.department || 'Khoa Công nghệ Thông tin',
      createdAt: nowIso,
      category: newCategory,
      tags: finalTags,
      content: newContent.trim(),
      imageUrl: imageUrl.trim() || undefined,
      attachmentFileName: attachedFileName.trim() || undefined,
      attachmentFileSize: attachedFileSize.trim() || undefined,
      attachmentUrl: attachedFileUrl.trim() || undefined,
      linkUrl: linkUrl.trim() || undefined,
      linkLabel: linkLabel.trim() || undefined,
      likes: 0,
      hasLiked: false,
      comments: [],
    };

    onPostCreated(newPost);

    // Reset Form
    setNewTitle('');
    setNewContent('');
    setNewTags([]);
    setTagInput('');
    setShowAttachFile(false);
    setAttachedFileName('');
    setAttachedFileSize('');
    setAttachedFileUrl('');
    setShowAttachImage(false);
    setImageUrl('');
    setShowAttachLink(false);
    setLinkUrl('');
    setLinkLabel('');
    onClose();

    onShowToast('success', 'Đã đăng thảo luận', 'Chủ đề của Thầy/Cô đã được đưa lên Diễn đàn.');
  };

  return (
    <div className="bg-white rounded-xl p-5 border border-slate-300 shadow-sm space-y-4 animate-fadeIn">
      <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
            <Pencil className="w-3.5 h-3.5" />
          </div>
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
            Bắt đầu chủ đề thảo luận mới
          </h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <form onSubmit={handleCreatePost} className="space-y-3 text-xs">
        <div>
          <label className="block font-semibold text-slate-700 mb-1">Tiêu đề chủ đề:</label>
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Tiêu đề thảo luận hoặc tên tài liệu chia sẻ (ví dụ: Ma trận đề thi trắc nghiệm học phần CS101)..."
            className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-bold focus:outline-none focus:bg-white focus:border-slate-800"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Phân loại chuyên mục:</label>
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value as any)}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-none focus:bg-white focus:border-slate-800"
            >
              <option value="exam">Đề thi &amp; Ma trận Bloom</option>
              <option value="qa">Hỏi đáp Khảo thí</option>
              <option value="textbook">Giáo trình &amp; Học liệu</option>
            </select>
          </div>

          {/* Tag Input */}
          <div className="sm:col-span-2">
            <label className="block font-semibold text-slate-700 mb-1">
              Gắn thẻ môn học / Chủ đề (Tự do gõ mã môn, ví dụ: CS101, HDH):
            </label>
            <div className="flex items-center gap-1.5 flex-wrap p-1.5 bg-slate-50 border border-slate-200 rounded-lg min-h-[36px]">
              {newTags.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-900 text-white font-mono text-[11px]"
                >
                  #{t}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(t)}
                    className="text-slate-400 hover:text-white cursor-pointer"
                  >
                    ×
                  </button>
                </span>
              ))}
              <div className="flex items-center gap-1 flex-1 min-w-[150px]">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onBlur={handleAddTag}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ',') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  placeholder={newTags.length === 0 ? 'Gõ mã môn (ví dụ: CS101, HDH)...' : 'Thêm thẻ khác...'}
                  className="bg-transparent text-xs text-slate-800 focus:outline-none flex-1 px-1 min-w-[100px]"
                />
                {tagInput.trim() && (
                  <button
                    type="button"
                    onClick={handleAddTag}
                    className="px-2 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded text-[11px] font-semibold cursor-pointer shrink-0"
                  >
                    + Thêm
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">Nội dung chi tiết:</label>
          <textarea
            rows={4}
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="Nhập nội dung chia sẻ, câu hỏi nghiệp vụ hoặc hướng dẫn phân bổ ma trận..."
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:bg-white focus:border-slate-800 leading-relaxed resize-none"
          />
        </div>

        {/* Attachment Trays */}
        {showAttachFile && attachedFileName && (
          <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <FileText className="w-4 h-4 text-blue-600 shrink-0" />
              <span className="font-bold text-slate-900 truncate">{attachedFileName}</span>
              {attachedFileSize && <span className="text-[11px] text-slate-400 font-mono">({attachedFileSize})</span>}
              {isUploadingFile && (
                <span className="text-[11px] text-teal-600 font-medium flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" /> Đang tải...
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                setAttachedFileName('');
                setAttachedFileSize('');
                setAttachedFileUrl('');
                setShowAttachFile(false);
              }}
              className="p-1 text-slate-400 hover:text-rose-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {showAttachImage && (
          <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-slate-600" />
                <span>Ảnh / Sơ đồ đính kèm</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  setImageUrl('');
                  setShowAttachImage(false);
                }}
                className="p-1 text-slate-400 hover:text-rose-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            {imageUrl ? (
              <img src={imageUrl} alt="Preview" className="max-h-40 rounded-lg object-contain border border-slate-200" />
            ) : (
              <input
                type="text"
                placeholder="Dán đường dẫn ảnh trực tiếp (URL)..."
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                onChange={(e) => setImageUrl(e.target.value)}
              />
            )}
          </div>
        )}

        {showAttachLink && (
          <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                <LinkIcon className="w-3.5 h-3.5 text-slate-600" />
                <span>Đính kèm liên kết (Website, Tài liệu hoặc Video)</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  setLinkUrl('');
                  setLinkLabel('');
                  setShowAttachLink(false);
                }}
                className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://... (dán liên kết website, tài liệu hoặc YouTube)"
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-slate-800"
              />
              <input
                type="text"
                value={linkLabel}
                onChange={(e) => setLinkLabel(e.target.value)}
                placeholder="Tiêu đề / Tên liên kết (ví dụ: Video bài giảng, Quy chế khảo thí)..."
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-slate-800"
              />
            </div>
          </div>
        )}

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-1.5">
            <label className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg text-xs flex items-center gap-1.5 cursor-pointer transition-colors">
              <FileText className="w-3.5 h-3.5 text-slate-600" />
              <span>File Word/PDF</span>
              <input
                type="file"
                accept=".docx,.pdf,.xlsx,.zip,.pptx,.txt"
                onChange={handleSelectLocalFile}
                className="hidden"
              />
            </label>

            <label className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg text-xs flex items-center gap-1.5 cursor-pointer transition-colors">
              <ImageIcon className="w-3.5 h-3.5 text-slate-600" />
              <span>Ảnh</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleSelectLocalImage}
                className="hidden"
              />
            </label>

            <button
              type="button"
              onClick={() => setShowAttachLink(!showAttachLink)}
              className={`px-2.5 py-1.5 font-medium rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
                showAttachLink || linkUrl
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <LinkIcon className="w-3.5 h-3.5" />
              <span>Liên kết</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-slate-600 hover:bg-slate-100 font-semibold rounded-lg text-xs transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={!newTitle.trim() || !newContent.trim() || isUploadingFile}
              className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white font-semibold rounded-lg text-xs shadow-2xs transition-colors cursor-pointer"
            >
              {isUploadingFile ? 'Đang tải tệp...' : 'Đăng chủ đề'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
