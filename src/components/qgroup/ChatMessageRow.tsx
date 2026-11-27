import React from 'react';
import { Pin, Reply, Undo2, Copy, Pencil, Trash2 } from 'lucide-react';
import type { QGroup, QGroupMessage, ScreenId, UserProfile } from '../../types';
import { UserAvatar } from '../common/UserAvatar';
import { FormattedMessageText } from './FormattedMessageText';
import { SharedForumPostCard } from './SharedForumPostCard';
import { MessageAttachmentList } from './MessageAttachmentList';
import type { ResolvedChatInfo } from './chatUtils';

export interface ChatMessageRowProps {
  msg: QGroupMessage;
  activeGroup: QGroup;
  activeInfo: ResolvedChatInfo;
  myEmail: string;
  myName: string;
  currentUser?: UserProfile | null;
  highlightedMsgId: string | null;
  editingMessageId: string | null;
  editText: string;
  setEditText: (text: string) => void;
  setEditingMessageId: (id: string | null) => void;
  handleSaveEditMessage: (msgId: string) => void;
  handleJumpToMessage: (msgId?: string) => void;
  handleOpenUserProfile: (email?: string | null, name?: string | null) => void;
  handleStartReply: (msg: QGroupMessage) => void;
  handleStartEditMessage: (msg: QGroupMessage) => void;
  handleTogglePinMessage: (msgId: string) => void;
  handleDeleteMessage: (msgId: string) => void;
  handleToggleReaction: (msgId: string, emoji: string) => void;
  setPreviewMediaUrl: (media: { url: string; name: string } | null) => void;
  setPreviewFile: (file: any) => void;
  onNavigate: (screen: ScreenId) => void;
  onShowToast: (
    type: 'success' | 'info' | 'warning' | 'error',
    title: string,
    message: string,
    onClick?: () => void
  ) => void;
}

export const ChatMessageRow: React.FC<ChatMessageRowProps> = ({
  msg,
  activeGroup,
  activeInfo,
  myEmail,
  myName,
  currentUser,
  highlightedMsgId,
  editingMessageId,
  editText,
  setEditText,
  setEditingMessageId,
  handleSaveEditMessage,
  handleJumpToMessage,
  handleOpenUserProfile,
  handleStartReply,
  handleStartEditMessage,
  handleTogglePinMessage,
  handleDeleteMessage,
  handleToggleReaction,
  setPreviewMediaUrl,
  setPreviewFile,
  onNavigate,
  onShowToast,
}) => {
  const isMe = msg.senderEmail?.toLowerCase() === myEmail;
  const isOwner = (activeGroup.ownerEmail || '').toLowerCase() === myEmail;

  return (
    <div
      id={`chat-msg-${msg.id}`}
      className={`flex items-start gap-3 px-3 py-2 -mx-2 rounded-lg transition-all duration-500 group relative select-text ${
        highlightedMsgId === msg.id
          ? 'bg-amber-100/90 ring-2 ring-amber-400 shadow-md scale-[1.01]'
          : 'hover:bg-slate-100/70'
      }`}
    >
      <UserAvatar
        avatarUrl={
          isMe
            ? currentUser?.avatarUrl
            : msg.senderAvatarUrl ||
              (activeGroup.isDirect && msg.senderEmail === activeInfo?.partnerEmail
                ? activeInfo?.avatarUrl
                : undefined)
        }
        name={msg.senderName || (isMe ? myName : activeInfo?.displayName)}
        email={msg.senderEmail || (isMe ? myEmail : activeInfo?.partnerEmail)}
        size="sm"
        rounded="rounded-md"
        className="mt-0.5 cursor-pointer hover:opacity-90 transition-opacity shadow-2xs"
        title={isMe ? 'Xem hồ sơ của bạn' : `Xem trang cá nhân của ${msg.senderName}`}
        onClick={() => {
          const targetEmail = msg.senderEmail || (isMe ? myEmail : activeInfo?.partnerEmail);
          const targetName = msg.senderName || (isMe ? myName : activeInfo?.displayName);
          handleOpenUserProfile(targetEmail, targetName);
        }}
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span
            onClick={() => {
              const targetEmail = msg.senderEmail || (isMe ? myEmail : activeInfo?.partnerEmail);
              const targetName = msg.senderName || (isMe ? myName : activeInfo?.displayName);
              handleOpenUserProfile(targetEmail, targetName);
            }}
            className="font-bold text-[13px] text-slate-900 hover:text-[#008689] hover:underline cursor-pointer transition-colors"
            title={isMe ? 'Xem hồ sơ của bạn' : `Xem trang cá nhân của ${msg.senderName}`}
          >
            {msg.senderName || msg.senderEmail}
          </span>
          {msg.senderTitle && (
            <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
              {msg.senderTitle}
            </span>
          )}
          {isMe && (
            <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-1 rounded">
              Bạn
            </span>
          )}
          <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
            <span>{msg.timestamp}</span>
            {msg.isEdited && (
              <span className="text-[10px] text-slate-400 font-normal italic">(đã chỉnh sửa)</span>
            )}
            {msg.isPinned && (
              <span className="inline-flex items-center gap-0.5 text-[9px] text-amber-600 font-bold bg-amber-50 px-1 py-0.2 rounded border border-amber-200">
                <Pin className="w-2.5 h-2.5" /> Ghim
              </span>
            )}
          </span>
        </div>

        {/* Reply Quote Banner */}
        {msg.replyTo && !msg.isRecalled && (
          <div
            onClick={() => handleJumpToMessage(msg.replyTo?.id)}
            className="flex items-center gap-1.5 text-[11px] text-slate-500 my-1 pl-2.5 pr-2 py-1 border-l-2 border-teal-500 bg-teal-50/50 hover:bg-teal-100/70 rounded-r cursor-pointer max-w-fit transition-all duration-150 group/quote shadow-2xs hover:shadow-xs"
            title="Bấm để xem lại câu hỏi / tin nhắn gốc"
          >
            <Reply className="w-3 h-3 text-teal-600 shrink-0 group-hover/quote:scale-110 transition-transform" />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleOpenUserProfile(undefined, msg.replyTo?.senderName);
              }}
              className="font-semibold text-slate-700 hover:text-[#008689] hover:underline cursor-pointer transition-colors"
              title={`Xem hồ sơ của ${msg.replyTo.senderName}`}
            >
              {msg.replyTo.senderName}:
            </button>
            <span className="truncate italic text-slate-600 max-w-xs group-hover/quote:text-slate-900 transition-colors">
              &ldquo;{msg.replyTo.text}&rdquo;
            </span>
          </div>
        )}

        {/* Recalled / Inline Edit / Formatted Text */}
        {msg.isRecalled ? (
          <div className="text-[12px] text-slate-400 italic py-1 flex items-center gap-1.5 select-none">
            <Undo2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>Tin nhắn đã được thu hồi</span>
          </div>
        ) : editingMessageId === msg.id ? (
          <div className="mt-1 space-y-2">
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSaveEditMessage(msg.id);
                } else if (e.key === 'Escape') {
                  setEditingMessageId(null);
                }
              }}
              className="w-full p-2.5 rounded-lg border border-teal-500 bg-white text-xs text-slate-800 outline-none focus:ring-1 focus:ring-teal-500 shadow-2xs leading-relaxed"
              rows={2}
              autoFocus
            />
            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleSaveEditMessage(msg.id)}
                className="px-3 py-1 rounded-md bg-slate-900 hover:bg-slate-800 text-white font-semibold cursor-pointer text-[11px] transition-colors"
              >
                Lưu thay đổi
              </button>
              <button
                type="button"
                onClick={() => setEditingMessageId(null)}
                className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold cursor-pointer text-[11px] transition-colors"
              >
                Hủy (Esc)
              </button>
              <span className="text-[10px] text-slate-400 ml-auto">Nhấn Enter để lưu</span>
            </div>
          </div>
        ) : (
          msg.text &&
          !msg.text.includes('[DIỄN ĐÀN HỌC THUẬT UTH]') && (
            <div className="mt-1">
              <FormattedMessageText text={msg.text} />
            </div>
          )
        )}

        {/* Linked Academic Forum Post Card */}
        {!msg.isRecalled &&
          (msg.sharedPost || (msg.text && msg.text.includes('[DIỄN ĐÀN HỌC THUẬT UTH]'))) && (
            <SharedForumPostCard
              msg={msg}
              setPreviewMediaUrl={setPreviewMediaUrl}
              onNavigate={onNavigate}
              onShowToast={onShowToast}
            />
          )}

        {/* Direct Attachment List */}
        {!msg.isRecalled &&
          (msg.attachment || (msg.attachments && msg.attachments.length > 0)) &&
          !msg.sharedPost &&
          !msg.text?.includes('[DIỄN ĐÀN HỌC THUẬT UTH]') && (
            <MessageAttachmentList
              msg={msg}
              setPreviewMediaUrl={setPreviewMediaUrl}
              setPreviewFile={setPreviewFile}
              onNavigate={onNavigate}
              onShowToast={onShowToast}
            />
          )}

        {/* Emoji Reaction Badges */}
        {!msg.isRecalled && msg.reactions && Object.keys(msg.reactions).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {Object.entries(msg.reactions).map(([emoji, users]) => {
              if (!users || users.length === 0) return null;
              const hasReacted = users.includes(myEmail);
              return (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => handleToggleReaction(msg.id, emoji)}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-all cursor-pointer ${
                    hasReacted
                      ? 'bg-teal-50 border-teal-300 text-teal-800 font-bold'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                  title={users.join(', ')}
                >
                  <span>{emoji}</span>
                  <span className="text-[10px]">{users.length}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating Hover Action Bar */}
      {!msg.isRecalled && (
        <div className="absolute right-2 -top-3 hidden group-hover:flex items-center bg-white border border-slate-200/90 rounded-xl shadow-lg px-1.5 py-1 gap-1 z-20 animate-fade-in">
          <div className="flex items-center gap-0.5 pr-1 border-r border-slate-200">
            {['👍', '❤️', '👏', '🎉', '💡'].map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => handleToggleReaction(msg.id, emoji)}
                className="w-6 h-6 rounded-md hover:bg-slate-100 flex items-center justify-center text-xs transition-transform hover:scale-125 cursor-pointer"
                title={`Bày tỏ cảm xúc ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => handleStartReply(msg)}
            className="w-6 h-6 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center text-xs cursor-pointer"
            title="Trả lời tin nhắn"
          >
            <Reply className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => {
              if (msg.text) {
                navigator.clipboard.writeText(msg.text);
                onShowToast('info', 'Đã sao chép tin nhắn', msg.text.slice(0, 30));
              }
            }}
            className="w-6 h-6 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center text-xs cursor-pointer"
            title="Sao chép văn bản"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => handleTogglePinMessage(msg.id)}
            className={`w-6 h-6 rounded hover:bg-slate-100 flex items-center justify-center text-xs cursor-pointer ${
              msg.isPinned ? 'text-amber-500' : 'text-slate-500 hover:text-slate-800'
            }`}
            title={msg.isPinned ? 'Bỏ ghim tin nhắn' : 'Ghim tin nhắn'}
          >
            <Pin className="w-3.5 h-3.5" />
          </button>
          {isMe && (
            <button
              type="button"
              onClick={() => handleStartEditMessage(msg)}
              className="w-6 h-6 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center text-xs cursor-pointer"
              title="Chỉnh sửa tin nhắn"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
          {(isMe || isOwner) && (
            <button
              type="button"
              onClick={() => handleDeleteMessage(msg.id)}
              className="w-6 h-6 rounded hover:bg-rose-50 text-slate-500 hover:text-rose-600 flex items-center justify-center text-xs cursor-pointer"
              title="Xóa tin nhắn"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};
