import React from 'react';
import {
  FileText,
  ThumbsUp,
  Share2,
  MoreVertical,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp,
  Download,
  Link as LinkIcon,
  ExternalLink,
  Clock,
  Sparkles,
  MessageSquare,
} from 'lucide-react';
import { UserProfile } from '../../types';
import { UserAvatar } from '../common/UserAvatar';
import { openUserProfile } from '../../utils/userProfileModalHelper';
import { ForumPost, getFormattedAuthorName, formatTimeAgo } from './forumTypesAndData';
import { ForumCommentSection } from './ForumCommentSection';

interface ForumPostCardProps {
  post: ForumPost;
  currentUser?: UserProfile | null;
  isHighlighted: boolean;
  highlightedPostId: string | null;
  activeMenuId: string | null;
  setActiveMenuId: (id: string | null) => void;
  isCommentsExpanded: boolean;
  onToggleComments: () => void;
  replyDraft: string;
  onChangeReplyDraft: (text: string) => void;
  onAddComment: () => void;
  editingComment: { postId: string; commentId: string; text: string } | null;
  setEditingComment: (val: { postId: string; commentId: string; text: string } | null) => void;
  onSaveEditComment: () => void;
  onDeleteComment: (commentId: string) => void;
  onToggleLike: () => void;
  onStartEdit: () => void;
  onDeletePost: () => void;
  onOpenShareModal: () => void;
  onCopyPostLink: () => void;
  onDownloadFile: (fileName: string, fileUrl?: string) => void;
  onOpenLightbox: (image: { url: string; title?: string }) => void;
}

export const ForumPostCard: React.FC<ForumPostCardProps> = ({
  post,
  currentUser,
  isHighlighted,
  highlightedPostId,
  activeMenuId,
  setActiveMenuId,
  isCommentsExpanded,
  onToggleComments,
  replyDraft,
  onChangeReplyDraft,
  onAddComment,
  editingComment,
  setEditingComment,
  onSaveEditComment,
  onDeleteComment,
  onToggleLike,
  onStartEdit,
  onDeletePost,
  onOpenShareModal,
  onCopyPostLink,
  onDownloadFile,
  onOpenLightbox,
}) => {
  const relativeTime = formatTimeAgo(post.createdAt || post.timestamp || '');
  const highlighted = isHighlighted || highlightedPostId === post.id || highlightedPostId === `post-${post.id}`;

  const rawUrl = (post.linkUrl || post.videoUrl || '').trim();
  const safeUrl = /^https?:\/\//i.test(rawUrl) ? rawUrl : '#';

  return (
    <article
      id={post.id}
      data-post-id={post.id}
      className={`bg-white rounded-xl p-3.5 sm:p-5 border transition-all shadow-2xs space-y-2.5 sm:space-y-3 ${
        highlighted
          ? 'ring-2 ring-teal-500 border-teal-500 bg-teal-50/20 shadow-lg scale-[1.005]'
          : 'border-slate-200/90 hover:border-slate-300'
      }`}
    >
      {/* Highlight banner khi được chuyển từ Q-Group hoặc Deep-link */}
      {highlighted && (
        <div className="px-3 py-1.5 rounded-lg bg-teal-100/90 border border-teal-300 text-teal-800 text-xs font-bold inline-flex items-center gap-1.5 shadow-2xs animate-pulse">
          <Sparkles className="w-3.5 h-3.5 text-teal-700" />
          <span>Đang xem bài viết được chia sẻ</span>
        </div>
      )}

      {/* 1. Header: Author info & Context Menu */}
      <div className="flex items-start justify-between gap-2.5 text-xs">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <UserAvatar
            avatarUrl={
              post.authorEmail && currentUser?.email && post.authorEmail.toLowerCase() === currentUser.email.toLowerCase()
                ? currentUser.avatarUrl
                : post.authorAvatarUrl
            }
            name={post.authorName}
            email={post.authorEmail || `${post.authorName.toLowerCase().replace(/\s+/g, '')}@uth.edu.vn`}
            size="sm"
            rounded="rounded-lg"
            className="cursor-pointer hover:opacity-90 transition-opacity shadow-2xs"
            title={`Xem hồ sơ của ${post.authorName}`}
            onClick={() =>
              openUserProfile(
                post.authorEmail || `${post.authorName.toLowerCase().replace(/\s+/g, '')}@uth.edu.vn`,
                post.authorName
              )
            }
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() =>
                  openUserProfile(
                    post.authorEmail || `${post.authorName.toLowerCase().replace(/\s+/g, '')}@uth.edu.vn`,
                    post.authorName
                  )
                }
                className="font-bold text-slate-900 hover:text-[#008689] hover:underline truncate cursor-pointer text-left transition-colors"
                title={`Xem hồ sơ của ${post.authorName}`}
              >
                {getFormattedAuthorName(post.authorName, post.authorTitle)}
              </button>
              <span className="text-slate-300 hidden sm:inline">•</span>
              <span className="text-slate-500 text-[11px] truncate hidden sm:inline">{post.department}</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono mt-0.5">
              <span className="sm:hidden text-slate-500 font-sans truncate">{post.department} •</span>
              <Clock className="w-3 h-3 text-slate-400 shrink-0" />
              <span>{relativeTime}</span>
            </div>
          </div>
        </div>

        {/* Context Menu Trigger */}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setActiveMenuId(activeMenuId === post.id ? null : post.id);
            }}
            className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Tùy chọn"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {/* Dropdown Menu */}
          {activeMenuId === post.id && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-30 text-xs"
            >
              <button
                type="button"
                onClick={onStartEdit}
                className="w-full px-3 py-1.5 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5 text-slate-500" />
                <span>Chỉnh sửa chủ đề</span>
              </button>

              <button
                type="button"
                onClick={onOpenShareModal}
                className="w-full px-3 py-1.5 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5 text-slate-500" />
                <span>Chia sẻ vào QGroup</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveMenuId(null);
                  onCopyPostLink();
                }}
                className="w-full px-3 py-1.5 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
              >
                <LinkIcon className="w-3.5 h-3.5 text-slate-500" />
                <span>Sao chép liên kết</span>
              </button>

              <div className="h-px bg-slate-100 my-1" />

              <button
                type="button"
                onClick={onDeletePost}
                className="w-full px-3 py-1.5 text-left text-rose-600 hover:bg-rose-50 flex items-center gap-2 font-semibold cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>Xóa chủ đề</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 2. Tags & Subject Title */}
      <div className="space-y-1.5">
        {post.tags && post.tags.filter((t) => t && t !== 'Chung').length > 0 && (
          <div className="flex items-center gap-1 flex-wrap">
            {post.tags
              .filter((t) => t && t !== 'Chung')
              .map((tg) => (
                <span
                  key={tg}
                  className="px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-mono font-medium bg-slate-100 text-slate-700 border border-slate-200/80"
                >
                  #{tg}
                </span>
              ))}
          </div>
        )}

        <h2 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
          {post.title}
        </h2>
      </div>

      {/* 3. Main Content Text */}
      <p className="text-xs text-slate-600 leading-relaxed font-normal whitespace-pre-line">
        {post.content}
      </p>

      {/* 4. Attached File with REAL File Download */}
      {post.attachmentFileName && (
        <div className="p-3 bg-slate-50 border border-slate-200/90 rounded-lg flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded bg-white border border-slate-200 flex items-center justify-center text-slate-700 shrink-0">
              {post.attachmentFileName.toLowerCase().endsWith('.pdf') ? (
                <FileText className="w-4 h-4 text-rose-600" />
              ) : (
                <FileText className="w-4 h-4 text-blue-600" />
              )}
            </div>
            <div className="truncate">
              <div className="font-bold text-slate-900 truncate text-xs">{post.attachmentFileName}</div>
              <div className="text-[10px] text-slate-400 font-mono">
                {post.attachmentFileSize || 'Tài liệu'} • Sẵn sàng tải về máy
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onDownloadFile(post.attachmentFileName!, post.attachmentUrl)}
            className="px-3 py-1 bg-white hover:bg-slate-100 text-slate-800 text-xs font-semibold rounded-md border border-slate-200 shadow-2xs shrink-0 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>Tải về</span>
          </button>
        </div>
      )}

      {/* 5. Attached Image */}
      {post.imageUrl && (
        <div className="rounded-xl overflow-hidden border border-slate-200/90 max-h-96 bg-slate-50 flex items-center justify-center p-1 shadow-2xs">
          <img
            src={post.imageUrl}
            alt="Minh họa"
            className="w-auto h-auto max-w-full max-h-96 object-contain rounded-lg hover:opacity-95 transition-opacity cursor-pointer block mx-auto"
            onClick={() => onOpenLightbox({ url: post.imageUrl!, title: post.title })}
          />
        </div>
      )}

      {/* 6. Attached Reference Link (Website, Video bài giảng, Tài liệu...) */}
      {(post.linkUrl || post.videoUrl) && (
        <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <LinkIcon className="w-4 h-4 text-slate-600 shrink-0" />
            <div className="truncate">
              <span className="font-bold text-slate-900">
                {post.linkLabel || (post.videoUrl ? 'Video bài giảng' : 'Liên kết tham khảo')}:{' '}
              </span>
              <a
                href={safeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-700 hover:text-slate-900 hover:underline font-mono text-[11px] truncate"
              >
                {rawUrl}
              </a>
            </div>
          </div>
          <a
            href={safeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-2.5 py-1 bg-white hover:bg-slate-100 rounded border border-slate-200 font-semibold text-slate-700 shrink-0 flex items-center gap-1 transition-colors"
          >
            <ExternalLink className="w-3 h-3 text-slate-500" />
            <span>Mở link</span>
          </a>
        </div>
      )}

      {/* 7. Interaction Action Bar */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleLike}
            className={`flex items-center gap-1 font-semibold transition-colors cursor-pointer ${
              post.hasLiked ? 'text-blue-600' : 'hover:text-slate-900'
            }`}
          >
            <ThumbsUp className={`w-3.5 h-3.5 ${post.hasLiked ? 'fill-blue-600' : 'text-slate-500'}`} />
            <span>{post.likes}</span>
          </button>

          {/* Expand / Collapse Comments Trigger Button */}
          <button
            type="button"
            onClick={onToggleComments}
            className="flex items-center gap-1 font-semibold hover:text-slate-900 transition-colors cursor-pointer"
          >
            <MessageSquare className="w-3.5 h-3.5 text-slate-500" />
            <span>{post.comments.length} phản hồi</span>
            {isCommentsExpanded ? (
              <ChevronUp className="w-3 h-3 text-slate-400" />
            ) : (
              <ChevronDown className="w-3 h-3 text-slate-400" />
            )}
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCopyPostLink}
            className="text-slate-400 hover:text-slate-700 font-medium flex items-center gap-1 transition-colors cursor-pointer"
            title="Sao chép liên kết trực tiếp tới bài viết này"
          >
            <LinkIcon className="w-3.5 h-3.5 text-slate-500" />
            <span>Sao chép link</span>
          </button>

          <button
            type="button"
            onClick={onOpenShareModal}
            className="text-slate-400 hover:text-slate-700 font-medium flex items-center gap-1 transition-colors cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5 text-slate-500" />
            <span>Chia sẻ vào QGroup</span>
          </button>
        </div>
      </div>

      {/* 8. Collapsible Comments Section with Edit & Delete */}
      {isCommentsExpanded && (
        <ForumCommentSection
          postId={post.id}
          comments={post.comments}
          currentUser={currentUser}
          replyDraft={replyDraft}
          onChangeReplyDraft={onChangeReplyDraft}
          onAddComment={onAddComment}
          editingComment={editingComment}
          setEditingComment={setEditingComment}
          onSaveEditComment={onSaveEditComment}
          onDeleteComment={onDeleteComment}
        />
      )}
    </article>
  );
};
