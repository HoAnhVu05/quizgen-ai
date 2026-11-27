import React from 'react';
import { CornerDownRight, Pencil, Trash2, Send } from 'lucide-react';
import { UserProfile } from '../../types';
import { UserAvatar } from '../common/UserAvatar';
import { openUserProfile } from '../../utils/userProfileModalHelper';
import { ForumPost, getFormattedAuthorName, formatTimeAgo } from './forumTypesAndData';

interface ForumCommentSectionProps {
  postId: string;
  comments: ForumPost['comments'];
  currentUser?: UserProfile | null;
  replyDraft: string;
  onChangeReplyDraft: (text: string) => void;
  onAddComment: () => void;
  editingComment: { postId: string; commentId: string; text: string } | null;
  setEditingComment: (val: { postId: string; commentId: string; text: string } | null) => void;
  onSaveEditComment: () => void;
  onDeleteComment: (commentId: string) => void;
}

export const ForumCommentSection: React.FC<ForumCommentSectionProps> = ({
  postId,
  comments,
  currentUser,
  replyDraft,
  onChangeReplyDraft,
  onAddComment,
  editingComment,
  setEditingComment,
  onSaveEditComment,
  onDeleteComment,
}) => {
  return (
    <div className="pt-3 border-t border-slate-100 space-y-2.5 animate-fadeIn">
      <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
        <CornerDownRight className="w-3 h-3 text-slate-400" />
        <span>Luồng phản hồi ({comments.length})</span>
      </div>

      {/* Replies list */}
      {comments.length > 0 ? (
        <div className="space-y-2 pl-2 border-l-2 border-slate-200">
          {comments.map((cm) => {
            const isEditingThis =
              editingComment?.postId === postId && editingComment?.commentId === cm.id;
            const cmTime = formatTimeAgo(cm.createdAt || cm.timestamp || '');

            return (
              <div key={cm.id} className="p-2.5 bg-slate-50 rounded-lg text-xs space-y-1 group">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <UserAvatar
                      avatarUrl={
                        cm.authorEmail && currentUser?.email && cm.authorEmail.toLowerCase() === currentUser.email.toLowerCase()
                          ? currentUser.avatarUrl
                          : cm.authorAvatarUrl
                      }
                      name={cm.authorName}
                      email={cm.authorEmail || `${cm.authorName.toLowerCase().replace(/\s+/g, '')}@uth.edu.vn`}
                      size="xs"
                      rounded="rounded-md"
                      className="cursor-pointer hover:opacity-90 transition-opacity shadow-2xs shrink-0"
                      title={`Xem hồ sơ của ${cm.authorName}`}
                      onClick={() =>
                        openUserProfile(
                          cm.authorEmail || `${cm.authorName.toLowerCase().replace(/\s+/g, '')}@uth.edu.vn`,
                          cm.authorName
                        )
                      }
                    />
                    <button
                      type="button"
                      onClick={() =>
                        openUserProfile(
                          cm.authorEmail || `${cm.authorName.toLowerCase().replace(/\s+/g, '')}@uth.edu.vn`,
                          cm.authorName
                        )
                      }
                      className="font-bold text-slate-900 hover:text-[#008689] hover:underline cursor-pointer text-left transition-colors truncate"
                      title={`Xem hồ sơ của ${cm.authorName}`}
                    >
                      {getFormattedAuthorName(cm.authorName, cm.authorTitle)}
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400 font-mono">{cmTime}</span>

                    {/* Edit / Delete comment buttons */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() =>
                          setEditingComment({ postId, commentId: cm.id, text: cm.content })
                        }
                        className="p-1 hover:text-slate-900 text-slate-400 cursor-pointer"
                        title="Sửa phản hồi"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteComment(cm.id)}
                        className="p-1 hover:text-rose-600 text-slate-400 cursor-pointer"
                        title="Xóa phản hồi"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>

                {isEditingThis ? (
                  <div className="space-y-1.5 pt-1">
                    <input
                      type="text"
                      value={editingComment.text}
                      onChange={(e) =>
                        setEditingComment({ ...editingComment, text: e.target.value })
                      }
                      className="w-full px-2.5 py-1 text-xs bg-white border border-slate-300 rounded focus:outline-none focus:border-slate-800"
                      autoFocus
                    />
                    <div className="flex items-center gap-1.5 justify-end">
                      <button
                        type="button"
                        onClick={() => setEditingComment(null)}
                        className="px-2 py-0.5 rounded text-[11px] text-slate-500 hover:bg-slate-200 cursor-pointer"
                      >
                        Hủy
                      </button>
                      <button
                        type="button"
                        onClick={onSaveEditComment}
                        className="px-2.5 py-0.5 rounded text-[11px] bg-slate-900 text-white font-semibold cursor-pointer"
                      >
                        Lưu
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-600 font-normal leading-relaxed">{cm.content}</p>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-[11px] text-slate-400 italic pl-2">
          Chưa có phản hồi nào. Hãy là người đầu tiên đóng góp ý kiến!
        </p>
      )}

      {/* Quick Reply Input */}
      <div className="flex items-center gap-2 pt-1">
        <UserAvatar
          avatarUrl={currentUser?.avatarUrl}
          name={currentUser?.fullName}
          email={currentUser?.email}
          size="xs"
          rounded="rounded-md"
          className="shadow-2xs shrink-0"
        />
        <input
          type="text"
          value={replyDraft}
          onChange={(e) => onChangeReplyDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              onAddComment();
            }
          }}
          placeholder="Viết câu trả lời trong chủ đề này... (Enter để gửi)"
          className="flex-1 px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-slate-800 text-slate-800 placeholder-slate-400"
        />
        <button
          type="button"
          onClick={onAddComment}
          disabled={!replyDraft.trim()}
          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors flex items-center gap-1 cursor-pointer"
        >
          <Send className="w-3 h-3" />
          <span className="hidden sm:inline">Gửi</span>
        </button>
      </div>
    </div>
  );
};
