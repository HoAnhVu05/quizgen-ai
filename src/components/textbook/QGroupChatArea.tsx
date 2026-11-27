import React, { useRef, useEffect } from 'react';
import {
  Copy, Users, Search, Settings, X, Pin, PinOff,
  Paperclip, BookOpen, FileCheck2, Send, FolderGit2
} from 'lucide-react';
import { QGroup } from './types';
import { ScreenId, UserProfile } from '../../types';
import { QGroupMessageItem } from './QGroupMessageItem';

interface QGroupChatAreaProps {
  activeGroup: QGroup | null;
  currentUser?: UserProfile | null;
  isChatSearchOpen: boolean;
  setIsChatSearchOpen: React.Dispatch<React.SetStateAction<boolean>>;
  chatSearchQuery: string;
  setChatSearchQuery: (q: string) => void;
  isAttachMenuOpen: boolean;
  setIsAttachMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  chatInputText: string;
  setChatInputText: (t: string) => void;
  onOpenGroupSettings: (tab: 'info' | 'members' | 'policy' | 'requests' | 'danger') => void;
  onOpenAttachTextbook: () => void;
  onOpenAttachExam: () => void;
  onSendMessage: (e?: React.FormEvent) => void;
  onToggleReaction: (msgId: string, emoji: string) => void;
  onTogglePinMessage: (msgId: string) => void;
  onDeleteMessage: (msgId: string) => void;
  onNavigate: (screen: ScreenId) => void;
  onShowToast: (type: 'success' | 'info' | 'warning' | 'error', title: string, message: string) => void;
}

export const QGroupChatArea: React.FC<QGroupChatAreaProps> = ({
  activeGroup,
  currentUser,
  isChatSearchOpen,
  setIsChatSearchOpen,
  chatSearchQuery,
  setChatSearchQuery,
  isAttachMenuOpen,
  setIsAttachMenuOpen,
  chatInputText,
  setChatInputText,
  onOpenGroupSettings,
  onOpenAttachTextbook,
  onOpenAttachExam,
  onSendMessage,
  onToggleReaction,
  onTogglePinMessage,
  onDeleteMessage,
  onNavigate,
  onShowToast,
}) => {
  const chatMessagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeGroup?.messages?.length]);

  if (!activeGroup) {
    return (
      <div className="lg:col-span-8 xl:col-span-8.5 bg-white rounded-3xl border border-slate-200 shadow-2xs flex flex-col overflow-hidden">
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 space-y-2">
          <FolderGit2 className="w-12 h-12 text-slate-300" />
          <p className="font-bold text-sm text-slate-600">Chưa chọn nhóm Q-Group</p>
          <p className="text-xs">Vui lòng chọn hoặc tạo nhóm ở thanh bên trái để bắt đầu trao đổi.</p>
        </div>
      </div>
    );
  }

  const pinnedMsg = (activeGroup.messages || []).find((m) => m.id === activeGroup.pinnedMessageId);
  const isOwner = activeGroup.ownerEmail === currentUser?.email;

  return (
    <div className="lg:col-span-8 xl:col-span-8.5 bg-white rounded-3xl border border-slate-200 shadow-2xs flex flex-col overflow-hidden">
      {/* Chat Top Bar */}
      <div className="p-3.5 sm:p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-white z-10 shadow-2xs">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-xs">
            {activeGroup.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-extrabold text-slate-900 text-sm truncate">{activeGroup.name}</h3>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(activeGroup.code);
                  onShowToast('info', 'Đã sao chép mã nhóm', activeGroup.code);
                }}
                className="inline-flex items-center gap-1 bg-slate-100 hover:bg-purple-100 hover:text-purple-700 px-2 py-0.5 rounded-md font-mono text-[10px] font-bold text-slate-700 border border-slate-200 transition-colors cursor-pointer"
                title="Sao chép mã nhóm"
              >
                <span>{activeGroup.code}</span>
                <Copy className="w-2.5 h-2.5" />
              </button>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
              <span>{activeGroup.department}</span>
              <span>•</span>
              <span className="flex items-center gap-1 text-slate-700 font-semibold">
                <Users className="w-3 h-3 text-purple-600" />
                {activeGroup.memberCount} Thành viên
              </span>
              <span>•</span>
              <span
                className={`px-2 py-0.2 rounded-full font-bold text-[10px] ${
                  activeGroup.joinPolicy === 'open'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : activeGroup.joinPolicy === 'approval_required'
                    ? 'bg-amber-50 text-amber-800 border border-amber-200'
                    : 'bg-slate-100 text-slate-700 border border-slate-200'
                }`}
              >
                {activeGroup.joinPolicy === 'open'
                  ? '🟢 Tự do bằng mã'
                  : activeGroup.joinPolicy === 'approval_required'
                  ? '🟡 Cần Trưởng nhóm duyệt'
                  : '🔒 Chỉ mời qua Email'}
              </span>
            </div>
          </div>
        </div>

        {/* Chat Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsChatSearchOpen((prev) => !prev)}
            className={`p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
              isChatSearchOpen
                ? 'bg-purple-100 text-purple-800 border-purple-300'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
            }`}
            title="Tìm kiếm nội dung trong phòng chat"
          >
            <Search className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => onOpenGroupSettings((activeGroup.pendingRequests || []).length > 0 ? 'requests' : 'info')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              (activeGroup.pendingRequests || []).length > 0
                ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 animate-pulse'
                : 'bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100'
            }`}
            title="Tùy biến nhóm, quản lý thành viên, duyệt đơn và chính sách"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Cài Đặt &amp; Quản Lý Nhóm</span>
            {(activeGroup.pendingRequests || []).length > 0 && (
              <span className="w-4 h-4 rounded-full bg-rose-600 text-white text-[9px] flex items-center justify-center font-bold">
                {activeGroup.pendingRequests.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Chat Search Bar */}
      {isChatSearchOpen && (
        <div className="px-4 py-2 bg-purple-50/70 border-b border-purple-200/80 flex items-center gap-2 animate-in slide-in-from-top-1">
          <Search className="w-3.5 h-3.5 text-purple-600" />
          <input
            type="text"
            value={chatSearchQuery}
            onChange={(e) => setChatSearchQuery(e.target.value)}
            placeholder="Tìm kiếm nội dung tin nhắn, file giáo trình, đề thi..."
            className="flex-1 bg-transparent text-xs text-slate-800 focus:outline-none placeholder-purple-400"
            autoFocus
          />
          {chatSearchQuery && (
            <button type="button" onClick={() => setChatSearchQuery('')} className="text-purple-400 hover:text-purple-700 text-xs cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Pinned Message Banner */}
      {pinnedMsg && (
        <div className="px-4 py-2 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-200/90 flex items-center justify-between gap-3 text-xs shadow-2xs">
          <div className="flex items-center gap-2 min-w-0">
            <Pin className="w-3.5 h-3.5 text-amber-600 fill-amber-600 shrink-0" />
            <div className="truncate">
              <span className="font-extrabold text-amber-900 mr-1.5">Đã ghim:</span>
              <span className="text-amber-800 font-medium">{pinnedMsg.text || pinnedMsg.attachment?.name || 'File đính kèm'}</span>
              <span className="text-[10px] text-amber-700/80 ml-2">({pinnedMsg.senderName} • {pinnedMsg.timestamp})</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onTogglePinMessage(pinnedMsg.id)}
            className="text-amber-800 hover:text-amber-950 font-bold text-[11px] shrink-0 px-2 py-0.5 rounded-md hover:bg-amber-100 transition-colors flex items-center gap-1 cursor-pointer"
          >
            <PinOff className="w-3 h-3" />
            <span className="hidden sm:inline">Bỏ ghim</span>
          </button>
        </div>
      )}

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#f1f5f9]">
        <div className="p-3.5 bg-white/90 rounded-2xl border border-slate-200 text-center text-xs text-slate-600 space-y-1 shadow-2xs">
          <p className="font-bold text-purple-900">🎉 Chào mừng Quý Thầy/Cô đến với Phòng làm việc "{activeGroup.name}"</p>
          <p className="text-[11px] text-slate-500">{activeGroup.description}</p>
        </div>

        {(activeGroup.messages || [])
          .filter((msg) => {
            if (!chatSearchQuery.trim()) return true;
            const q = chatSearchQuery.toLowerCase();
            return (
              (msg.text && msg.text.toLowerCase().includes(q)) ||
              (msg.attachment && msg.attachment.name.toLowerCase().includes(q)) ||
              (msg.senderName && msg.senderName.toLowerCase().includes(q))
            );
          })
          .map((msg) => (
            <QGroupMessageItem
              key={msg.id}
              msg={msg}
              isPinned={activeGroup.pinnedMessageId === msg.id}
              isOwner={isOwner}
              currentUser={currentUser}
              onToggleReaction={onToggleReaction}
              onTogglePin={onTogglePinMessage}
              onDeleteMessage={onDeleteMessage}
              onNavigate={onNavigate}
              onShowToast={onShowToast}
            />
          ))}
        <div ref={chatMessagesEndRef} />
      </div>

      {/* Chat Input Bar */}
      <div className="p-3.5 border-t border-slate-200 bg-white relative z-10 shadow-sm">
        {isAttachMenuOpen && (
          <div className="absolute bottom-16 left-4 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 space-y-1 z-30 animate-in fade-in duration-100">
            <button
              type="button"
              onClick={() => { setIsAttachMenuOpen(false); onOpenAttachTextbook(); }}
              className="w-full text-left px-3.5 py-2 rounded-xl hover:bg-teal-50 text-slate-700 hover:text-[#008689] text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer"
            >
              <BookOpen className="w-4 h-4 text-[#008689]" />
              <span>Đính kèm Giáo trình từ Kho của tôi</span>
            </button>
            <button
              type="button"
              onClick={() => { setIsAttachMenuOpen(false); onOpenAttachExam(); }}
              className="w-full text-left px-3.5 py-2 rounded-xl hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer"
            >
              <FileCheck2 className="w-4 h-4 text-indigo-600" />
              <span>Đính kèm Bộ Đề Thi đã soạn</span>
            </button>
          </div>
        )}

        <form onSubmit={onSendMessage} className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsAttachMenuOpen((prev) => !prev)}
            className={`p-2.5 rounded-xl border transition-colors cursor-pointer ${
              isAttachMenuOpen ? 'bg-purple-100 border-purple-300 text-purple-700' : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600'
            }`}
            title="Đính kèm Giáo trình hoặc Đề thi"
          >
            <Paperclip className="w-4 h-4" />
          </button>
          <input
            type="text"
            value={chatInputText}
            onChange={(e) => setChatInputText(e.target.value)}
            placeholder="Nhập trao đổi học thuật, đóng góp ma trận câu hỏi với các thầy cô... (Enter để gửi)"
            className="flex-1 px-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-purple-600 text-slate-800 placeholder-slate-400"
          />
          <button
            type="submit"
            disabled={!chatInputText.trim()}
            className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Gửi</span>
          </button>
        </form>
      </div>
    </div>
  );
};
