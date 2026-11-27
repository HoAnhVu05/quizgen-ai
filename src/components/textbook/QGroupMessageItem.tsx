import React from 'react';
import { Shield, Pin, BookOpen, Zap, FileCheck2, CheckSquare, Trash2 } from 'lucide-react';
import { QGroupMessage } from './types';
import { ScreenId, UserProfile } from '../../types';

interface QGroupMessageItemProps {
  msg: QGroupMessage;
  isPinned: boolean;
  isOwner: boolean;
  currentUser?: UserProfile | null;
  onToggleReaction: (msgId: string, emoji: string) => void;
  onTogglePin: (msgId: string) => void;
  onDeleteMessage: (msgId: string) => void;
  onNavigate: (screen: ScreenId) => void;
  onShowToast: (type: 'success' | 'info' | 'warning' | 'error', title: string, message: string) => void;
}

export const QGroupMessageItem: React.FC<QGroupMessageItemProps> = ({
  msg,
  isPinned,
  isOwner,
  currentUser,
  onToggleReaction,
  onTogglePin,
  onDeleteMessage,
  onNavigate,
  onShowToast,
}) => {
  if (msg.isSystem) {
    return (
      <div className="flex justify-center my-2">
        <span className="px-3.5 py-1 rounded-full bg-slate-200/90 text-slate-600 text-[11px] font-semibold flex items-center gap-1.5 border border-slate-300/70 shadow-2xs">
          <Shield className="w-3 h-3 text-purple-700" />
          <span>{msg.text}</span>
          <span className="text-[9px] text-slate-400 font-mono ml-1">{msg.timestamp}</span>
        </span>
      </div>
    );
  }

  const isMe = msg.senderEmail === currentUser?.email || msg.senderName === currentUser?.fullName;
  const myId = currentUser?.email || currentUser?.fullName || 'me';

  return (
    <div className={`group relative flex gap-3 max-w-[85%] ${isMe ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}>
      <div className={`w-8 h-8 rounded-full ${msg.avatarColor || 'bg-indigo-600'} text-white text-xs font-bold flex items-center justify-center shrink-0 shadow-xs`}>
        {msg.senderName.slice(0, 2).toUpperCase()}
      </div>

      <div className={`space-y-1 relative ${isMe ? 'items-end text-right' : ''}`}>
        {/* Sender Header */}
        <div className="flex items-center gap-2 text-[11px] text-slate-500">
          <span className="font-bold text-slate-800">{msg.senderName}</span>
          {msg.senderTitle && (
            <span className="px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded text-[9px] font-semibold border border-slate-200">
              {msg.senderTitle}
            </span>
          )}
          <span className="text-[10px] font-mono text-slate-400">{msg.timestamp}</span>
          {isPinned && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded text-[9px] font-bold border border-amber-200">
              <Pin className="w-2.5 h-2.5 fill-amber-700" />
              <span>Đã ghim</span>
            </span>
          )}
        </div>

        {/* Text Message Bubble */}
        {msg.text && (
          <div
            className={`p-3.5 rounded-2xl text-xs leading-relaxed text-left transition-all relative ${
              isMe
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-tr-none shadow-xs font-medium'
                : 'bg-white text-slate-800 border border-slate-200/90 rounded-tl-none shadow-2xs'
            }`}
          >
            {msg.text}
          </div>
        )}

        {/* Textbook Attachment Card */}
        {msg.attachment?.type === 'textbook' && (
          <div className="p-3.5 bg-white rounded-2xl border-2 border-teal-500/30 shadow-xs space-y-2.5 text-left mt-1.5 max-w-sm">
            <div className="flex items-start gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#008689] text-white flex items-center justify-center shrink-0 shadow-2xs">
                <BookOpen className="w-4.5 h-4.5" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#008689] block">Giáo trình đính kèm</span>
                <div className="font-bold text-xs text-slate-900 truncate" title={msg.attachment.name}>
                  {msg.attachment.name}
                </div>
                <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                  {msg.attachment.totalPages} trang • {msg.attachment.size}
                </div>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  localStorage.setItem('quizgen_selected_book_id', msg.attachment?.id || '');
                  localStorage.setItem('quizgen_selected_book_name', msg.attachment?.name || '');
                  onShowToast('success', 'Đã Chọn Giáo Trình Nhóm', `Đang chuyển sang sinh đề với "${msg.attachment?.name}"...`);
                  onNavigate('generate');
                }}
                className="flex-1 px-3 py-2 bg-[#008689] hover:bg-[#007073] text-white rounded-xl font-bold text-xs shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Zap className="w-3.5 h-3.5 text-amber-200 fill-amber-200" />
                <span>Dùng Sinh Đề Ngay</span>
              </button>
            </div>
          </div>
        )}

        {/* Exam Attachment Card */}
        {msg.attachment?.type === 'exam' && (
          <div className="p-3.5 bg-white rounded-2xl border-2 border-indigo-500/30 shadow-xs space-y-2.5 text-left mt-1.5 max-w-sm">
            <div className="flex items-start gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                <FileCheck2 className="w-4.5 h-4.5" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 block">Bộ đề thi trắc nghiệm AI</span>
                <div className="font-bold text-xs text-slate-900 truncate" title={msg.attachment.name}>
                  {msg.attachment.name}
                </div>
                <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                  Môn: {msg.attachment.subject} • {msg.attachment.questionCount} câu • {msg.attachment.durationMinutes} phút
                </div>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  onShowToast('success', 'Đã Nạp Đề Thi Nhóm', `Đang mở bộ đề "${msg.attachment?.name}" trong Bước 4 Đóng gói & Xuất đề...`);
                  onNavigate('bank');
                }}
                className="flex-1 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <CheckSquare className="w-3.5 h-3.5" />
                <span>Nạp Vào Biên Tập &amp; Xuất Đề</span>
              </button>
            </div>
          </div>
        )}

        {/* Emoji Reactions */}
        {msg.reactions && Object.keys(msg.reactions).length > 0 && (
          <div className={`flex flex-wrap gap-1 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
            {Object.entries(msg.reactions).map(([emoji, users]) => {
              if (users.length === 0) return null;
              const userReacted = users.includes(myId);
              return (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => onToggleReaction(msg.id, emoji)}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border transition-all cursor-pointer ${
                    userReacted ? 'bg-purple-100 text-purple-900 border-purple-300 shadow-2xs' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 shadow-2xs'
                  }`}
                  title={`${users.length} người đã thả ${emoji}`}
                >
                  <span>{emoji}</span>
                  <span className="text-[10px]">{users.length}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Hover Action Toolbar */}
        <div
          className={`opacity-0 group-hover:opacity-100 transition-opacity absolute top-0 ${
            isMe ? 'left-0 -translate-x-full pr-2' : 'right-0 translate-x-full pl-2'
          } flex items-center gap-1 bg-white border border-slate-200 rounded-xl px-1.5 py-1 shadow-md z-20`}
        >
          {['👍', '❤️', '👏', '💡', '🔥'].map((em) => (
            <button
              key={em}
              type="button"
              onClick={() => onToggleReaction(msg.id, em)}
              className="p-1 hover:bg-slate-100 rounded-md text-xs transition-colors cursor-pointer"
              title={`Thả ${em}`}
            >
              {em}
            </button>
          ))}
          <div className="w-[1px] h-3.5 bg-slate-200 mx-0.5" />
          <button
            type="button"
            onClick={() => onTogglePin(msg.id)}
            className={`p-1 rounded-md transition-colors cursor-pointer ${
              isPinned ? 'text-amber-600 hover:bg-amber-50' : 'text-slate-500 hover:bg-slate-100'
            }`}
            title={isPinned ? 'Bỏ ghim tin nhắn' : 'Ghim tin nhắn'}
          >
            <Pin className="w-3 h-3" />
          </button>
          {(isMe || isOwner) && (
            <button
              type="button"
              onClick={() => onDeleteMessage(msg.id)}
              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
              title="Xóa tin nhắn này"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
