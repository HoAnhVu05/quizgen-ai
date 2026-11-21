import React from 'react';
import {
  Hash,
  Pin,
  BellOff,
  Bell,
  MoreVertical,
  Info,
  Copy,
  UserCheck,
  Trash2,
  LogOut,
  User,
  UserMinus,
  EyeOff,
  Headphones,
} from 'lucide-react';
import type { QGroup } from '../../types';
import { resolveChatDisplayInfo } from './chatUtils';

export interface ConversationItemProps {
  group: QGroup;
  isSelected: boolean;
  myEmail: string;
  isMenuOpen: boolean;
  hasActiveHuddle?: boolean;
  onSelect: () => void;
  onMenuToggle: (e: React.MouseEvent) => void;
  onViewProfile: () => void;
  onViewDetails: () => void;
  onMute: () => void;
  onTogglePin: () => void;
  onDelete: () => void;
  onLeave: () => void;
  onTransferOwner?: () => void;
  onDisband?: () => void;
  onCopyCode: () => void;
  onUnfriend?: () => void;
}

export const MenuBtn: React.FC<{
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}> = ({ icon, label, onClick, danger }) => (
  <button
    type="button"
    onClick={onClick}
    className={`w-full px-3.5 py-2 text-left hover:bg-slate-50 flex items-center gap-2 cursor-pointer ${
      danger ? 'text-rose-600 font-semibold' : 'text-slate-700'
    }`}
  >
    {icon}
    <span>{label}</span>
  </button>
);

export const ConversationItem: React.FC<ConversationItemProps> = ({
  group,
  isSelected,
  myEmail,
  isMenuOpen,
  hasActiveHuddle = false,
  onSelect,
  onMenuToggle,
  onViewProfile,
  onViewDetails,
  onMute,
  onTogglePin,
  onDelete,
  onLeave,
  onTransferOwner,
  onDisband,
  onCopyCode,
  onUnfriend,
}) => {
  const msgs = group.messages || [];
  const lastMsg = msgs.length > 0 ? msgs[msgs.length - 1] : null;
  const isUnread =
    !isSelected &&
    Boolean(
      lastMsg &&
      !lastMsg.isSystem &&
      lastMsg.senderEmail?.toLowerCase() !== myEmail &&
      !(lastMsg.readBy || []).some((r) => String(r).toLowerCase() === myEmail)
    );

  const isGroup = !group.isDirect;
  const isOwner = (group.ownerEmail || '').toLowerCase() === myEmail.toLowerCase();
  const info = resolveChatDisplayInfo(group, myEmail);
  const isPinned = Boolean(
    group.isPinned || (group.pinnedBy || []).some((e) => e.toLowerCase() === myEmail.toLowerCase())
  );

  if (isGroup) {
    return (
      <div
        onClick={onSelect}
        className={`group relative flex items-center justify-between px-3 py-1.5 mx-1.5 rounded-lg cursor-pointer transition-all select-none ${
          isSelected
            ? 'bg-slate-200/90 text-slate-900 font-bold'
            : isUnread
            ? 'text-slate-900 font-bold bg-slate-50 hover:bg-slate-100'
            : 'text-slate-600 font-medium hover:bg-slate-100 hover:text-slate-900'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1 pr-6">
          <Hash
            className={`w-4 h-4 shrink-0 transition-colors ${
              isSelected ? 'text-slate-900' : 'text-slate-400 group-hover:text-slate-600'
            }`}
          />
          <span className="text-xs truncate">{group.name}</span>
          {hasActiveHuddle && (
            <span
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[9px] font-bold border border-emerald-300 animate-pulse shrink-0"
              title="Đang có đàm thoại Huddle"
            >
              <Headphones className="w-2.5 h-2.5 text-emerald-600" />
              <span>Huddle</span>
            </span>
          )}
          {isPinned && <Pin className="w-3 h-3 text-amber-500 fill-amber-500 shrink-0" />}
          {isOwner && (
            <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-slate-100 text-slate-700 border border-slate-300 shrink-0">
              Trưởng nhóm
            </span>
          )}
          {group.muted && <BellOff className="w-3 h-3 text-slate-400 shrink-0" />}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {isUnread && (
            <span className="w-2 h-2 rounded-full bg-teal-600 shrink-0" />
          )}
          <button
            type="button"
            onClick={onMenuToggle}
            className="opacity-0 group-hover:opacity-100 focus:opacity-100 w-6 h-6 rounded hover:bg-slate-300/60 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-all cursor-pointer"
            title="Tùy chọn kênh"
          >
            <MoreVertical className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Slack Channel Context Menu */}
        {isMenuOpen && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute right-6 top-7 z-40 w-56 bg-white border border-slate-200 rounded-xl shadow-xl py-1 text-xs animate-fade-in"
          >
            <MenuBtn icon={<Info className="w-3.5 h-3.5 text-slate-600" />} label="Chi tiết kênh" onClick={onViewDetails} />
            <MenuBtn icon={<Copy className="w-3.5 h-3.5 text-slate-500" />} label="Sao chép mã nhóm" onClick={onCopyCode} />
            <MenuBtn
              icon={<Pin className={`w-3.5 h-3.5 ${isPinned ? 'text-amber-500 fill-amber-500' : 'text-slate-500'}`} />}
              label={isPinned ? 'Bỏ ghim kênh' : 'Ghim kênh lên đầu'}
              onClick={onTogglePin}
            />
            <MenuBtn
              icon={group.muted ? <Bell className="w-3.5 h-3.5 text-slate-600" /> : <BellOff className="w-3.5 h-3.5 text-slate-400" />}
              label={group.muted ? 'Bật thông báo' : 'Tắt thông báo'}
              onClick={onMute}
            />
            <MenuBtn
              icon={<EyeOff className="w-3.5 h-3.5 text-slate-500" />}
              label="Ẩn cuộc trò chuyện nhóm"
              onClick={onDelete}
            />
            <div className="border-t border-slate-100 my-1" />
            {isOwner ? (
              <>
                <MenuBtn
                  icon={<UserCheck className="w-3.5 h-3.5 text-slate-700" />}
                  label="Chuyển quyền Trưởng nhóm"
                  onClick={() => {
                    if (onTransferOwner) onTransferOwner();
                    else onLeave();
                  }}
                />
                {onDisband && (
                  <MenuBtn icon={<Trash2 className="w-3.5 h-3.5 text-rose-600" />} label="Giải tán nhóm" onClick={onDisband} danger />
                )}
              </>
            ) : (
              <MenuBtn icon={<LogOut className="w-3.5 h-3.5 text-rose-500" />} label="Rời khỏi nhóm" onClick={onLeave} danger />
            )}
          </div>
        )}
      </div>
    );
  }

  // DIRECT MESSAGE (1-1 Slack Row)
  return (
    <div
      onClick={onSelect}
      className={`group relative flex items-center justify-between px-3 py-1.5 mx-1.5 rounded-lg cursor-pointer transition-all select-none ${
        isSelected
          ? 'bg-slate-200/90 text-slate-900 font-bold'
          : isUnread
          ? 'text-slate-900 font-bold bg-slate-50 hover:bg-slate-100'
          : 'text-slate-600 font-medium hover:bg-slate-100 hover:text-slate-900'
      }`}
    >
      <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-6">
        <div className="relative shrink-0">
          <div className="w-5 h-5 rounded-md bg-slate-700 text-white font-bold text-[9px] flex items-center justify-center">
            {info.avatarInitials}
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-500 ring-1 ring-white" />
        </div>
        <div className="min-w-0 flex-1 flex items-center gap-1.5">
          <p className="text-xs truncate">{info.displayName}</p>
          {hasActiveHuddle && (
            <span
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[9px] font-bold border border-emerald-300 animate-pulse shrink-0"
              title="Đang có đàm thoại Huddle"
            >
              <Headphones className="w-2.5 h-2.5 text-emerald-600" />
            </span>
          )}
          {isPinned && <Pin className="w-3 h-3 text-amber-500 fill-amber-500 shrink-0" />}
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {isUnread && (
          <span className="w-2 h-2 rounded-full bg-teal-600 shrink-0" />
        )}
        <button
          type="button"
          onClick={onMenuToggle}
          className="opacity-0 group-hover:opacity-100 focus:opacity-100 w-6 h-6 rounded hover:bg-slate-300/60 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-all cursor-pointer"
          title="Tùy chọn tin nhắn"
        >
          <MoreVertical className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Context Menu for DM */}
      {isMenuOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute right-6 top-7 z-40 w-52 bg-white border border-slate-200 rounded-xl shadow-xl py-1 text-xs animate-fade-in"
        >
          <MenuBtn icon={<User className="w-3.5 h-3.5 text-slate-600" />} label="Xem trang cá nhân" onClick={onViewProfile} />
          <MenuBtn
            icon={<Pin className={`w-3.5 h-3.5 ${isPinned ? 'text-amber-500 fill-amber-500' : 'text-slate-500'}`} />}
            label={isPinned ? 'Bỏ ghim hội thoại' : 'Ghim hội thoại lên đầu'}
            onClick={onTogglePin}
          />
          <MenuBtn
            icon={group.muted ? <Bell className="w-3.5 h-3.5 text-slate-600" /> : <BellOff className="w-3.5 h-3.5 text-slate-400" />}
            label={group.muted ? 'Bật thông báo' : 'Tắt thông báo'}
            onClick={onMute}
          />
          <div className="border-t border-slate-100 my-1" />
          <MenuBtn icon={<EyeOff className="w-3.5 h-3.5 text-slate-500" />} label="Ẩn cuộc trò chuyện" onClick={onDelete} />
        </div>
      )}
    </div>
  );
};
