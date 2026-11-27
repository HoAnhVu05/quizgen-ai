import React from 'react';
import { Share2, FileText, Download, ArrowRight } from 'lucide-react';
import type { QGroupMessage, ScreenId } from '../../types';
import { initials, parseLegacyForumShare } from './qgroupHelpers';
import { downloadFileSafely } from '../../utils/fileDownloadHelper';

interface SharedForumPostCardProps {
  msg: QGroupMessage;
  setPreviewMediaUrl: (media: { url: string; name: string } | null) => void;
  onNavigate: (screen: ScreenId) => void;
  onShowToast: (
    type: 'success' | 'info' | 'warning' | 'error',
    title: string,
    message: string,
    onClick?: () => void
  ) => void;
}

export const SharedForumPostCard: React.FC<SharedForumPostCardProps> = ({
  msg,
  setPreviewMediaUrl,
  onNavigate,
  onShowToast,
}) => {
  const post = msg.sharedPost;
  const legacy = !post && msg.text ? parseLegacyForumShare(msg.text) : null;
  const tag = post?.tag || legacy?.tag || 'HọcThuật';
  const author = post?.authorName || legacy?.authorName || 'Giảng viên UTH';
  const authorTitle = post?.authorTitle || legacy?.authorTitle;
  const department = post?.department || legacy?.department;
  const content = post?.content || legacy?.content || '';
  const attachmentName = post?.attachmentFileName || legacy?.attachmentFileName;
  const attachmentSize = post?.attachmentFileSize || legacy?.attachmentFileSize;
  const attachmentUrl = post?.attachmentUrl;
  const imageUrl = post?.imageUrl;
  const postTitle = post?.title;
  const postId = post?.id || legacy?.id;

  return (
    <div className="mt-2.5 rounded-2xl border border-slate-200/90 bg-white shadow-xs max-w-lg overflow-hidden transition-all hover:border-teal-400 hover:shadow-md">
      <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 text-slate-700 font-semibold">
          <Share2 className="w-3.5 h-3.5 text-teal-600" />
          <span className="text-[11px] uppercase tracking-wider font-extrabold text-teal-800">
            Bài viết Diễn đàn Học thuật UTH
          </span>
        </div>
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
          #{tag}
        </span>
      </div>

      <div className="p-3.5 space-y-2.5">
        {postTitle && (
          <h4 className="text-xs font-bold text-slate-900 line-clamp-2 leading-snug">
            {postTitle}
          </h4>
        )}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-slate-800 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
            {initials(author)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-900 truncate">{author}</span>
              {authorTitle && (
                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                  {authorTitle}
                </span>
              )}
            </div>
            {department && <p className="text-[10px] text-slate-500 truncate">{department}</p>}
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-50 border-l-2 border-teal-500 text-xs text-slate-700 italic leading-relaxed">
          &ldquo;{content}&rdquo;
        </div>

        {imageUrl && (
          <div
            className="rounded-xl overflow-hidden border border-slate-200 bg-slate-100 max-h-48 cursor-pointer hover:opacity-95 transition-opacity"
            onClick={() => setPreviewMediaUrl({ url: imageUrl, name: postTitle || 'Ảnh bài viết' })}
            title="Bấm để xem ảnh phóng to"
          >
            <img
              src={imageUrl}
              alt={postTitle || 'Ảnh đính kèm'}
              className="w-full h-auto max-h-48 object-cover block"
            />
          </div>
        )}

        {attachmentName && (
          <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <FileText className="w-4 h-4 text-teal-600 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="font-bold text-slate-800 truncate text-[11px]">{attachmentName}</p>
                {attachmentSize && (
                  <p className="text-[9px] text-slate-400 font-mono">
                    {attachmentSize} • Tệp học thuật đính kèm
                  </p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                downloadFileSafely(attachmentName, attachmentUrl, onShowToast);
              }}
              className="w-7 h-7 rounded-lg bg-white border border-slate-200 hover:bg-teal-600 hover:text-white text-slate-600 flex items-center justify-center transition-colors cursor-pointer shrink-0"
              title="Tải tệp đính kèm về máy"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={() => {
            if (postId) {
              sessionStorage.setItem('quizgen_focus_post_id', postId);
            }
            onNavigate('forum');
          }}
          className="w-full mt-1 py-2 px-3 rounded-xl bg-slate-900 hover:bg-teal-700 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs group"
        >
          <span>Xem bài viết trên Diễn Đàn</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
};
