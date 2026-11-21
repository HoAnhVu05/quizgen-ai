import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowLeft,
  Hash,
  Star,
  Copy,
  Users,
  UserPlus,
  Headphones,
  ChevronDown,
  Bell,
  BellOff,
  MoreVertical,
  Pin,
  User,
  Info,
  ChevronRight,
  Sparkles,
  FileText,
  Settings,
  UserCheck,
  Trash2,
  UserMinus,
  EyeOff,
  LogOut,
  Menu,
  FolderArchive,
} from 'lucide-react';
import { QGroup } from '../../types';

export interface ActiveChatInfo {
  displayName: string;
  avatarInitials: string;
  partnerEmail?: string;
  displayRoleOrMembers: string;
}

interface ChatHeaderProps {
  activeGroup: QGroup;
  activeInfo: ActiveChatInfo;
  myEmail: string;
  isStarred: boolean;
  isHuddleActive?: boolean;
  activeHuddleCount?: number;
  onToggleStarred: () => void;
  onBackToMobileList: () => void;
  onOpenMobileMenu?: () => void;
  onOpenProfile: (email: string | null, name: string) => void;
  onOpenDetails: (group: QGroup, tab?: 'about' | 'members' | 'files') => void;
  onOpenDirectAddMember: () => void;
  onOpenHuddle: () => void;
  onToggleMute: (group: QGroup) => void;
  onTogglePinConversation: (group: QGroup) => void;
  onOpenCanvas: () => void;
  onOpenSummarize: () => void;
  onOpenChannelSettings: () => void;
  onOpenSharedMedia?: () => void;
  onOpenTransferOwnership: (group: QGroup) => void;
  onDeleteChat: (group: QGroup) => void;
  onHideChat?: (group: QGroup) => void;
  onUnfriend: (email: string, name: string) => void;
  onDisbandGroup: (group: QGroup) => void;
  onLeaveGroup: (group: QGroup) => void;
  onShowToast: (type: 'info' | 'success' | 'warning' | 'error', title: string, message: string) => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  activeGroup,
  activeInfo,
  myEmail,
  isStarred,
  isHuddleActive = false,
  activeHuddleCount = 0,
  onToggleStarred,
  onBackToMobileList,
  onOpenMobileMenu,
  onOpenProfile,
  onOpenDetails,
  onOpenDirectAddMember,
  onOpenHuddle,
  onToggleMute,
  onTogglePinConversation,
  onOpenCanvas,
  onOpenSummarize,
  onOpenSharedMedia,
  onOpenChannelSettings,
  onOpenTransferOwnership,
  onDeleteChat,
  onHideChat,
  onUnfriend,
  onDisbandGroup,
  onLeaveGroup,
  onShowToast,
}) => {
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);
  const headerMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (headerMenuRef.current && !headerMenuRef.current.contains(e.target as Node)) {
        setIsHeaderMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isGroupOwner = (activeGroup.ownerEmail || '').toLowerCase() === myEmail.toLowerCase();
  const isActivePinned = Boolean(
    activeGroup.isPinned || (activeGroup.pinnedBy || []).some((e) => e.toLowerCase() === myEmail.toLowerCase())
  );

  return (
    <div className="px-3 sm:px-4 py-2 sm:py-2.5 border-b border-slate-200 flex items-center justify-between gap-2 bg-white shrink-0">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {/* Mobile Back Button */}
        <button
          type="button"
          onClick={onBackToMobileList}
          className="md:hidden p-1.5 -ml-1 rounded-lg hover:bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 cursor-pointer"
          title="Quay lại danh sách hội nhóm"
        >
          <ArrowLeft className="w-5 h-5 text-slate-700" />
        </button>

        <div
          onClick={() => {
            if (activeGroup.isDirect) {
              onOpenProfile(activeInfo.partnerEmail || null, activeInfo.displayName);
            } else {
              onOpenDetails(activeGroup);
            }
          }}
          className="w-9 h-9 rounded-lg bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
        >
          {activeGroup.isDirect ? (
            <div className="relative">
              <span>{activeInfo.avatarInitials}</span>
              <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white" />
            </div>
          ) : (
            <Hash className="w-5 h-5 text-slate-700" />
          )}
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <h3
              onClick={() => {
                if (activeGroup.isDirect) {
                  onOpenProfile(activeInfo.partnerEmail || null, activeInfo.displayName);
                } else {
                  onOpenDetails(activeGroup);
                }
              }}
              className="text-sm font-bold text-slate-900 truncate cursor-pointer hover:underline flex items-center gap-1"
            >
              {!activeGroup.isDirect ? (
                <Hash className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              ) : (
                <span className="text-slate-500 font-bold shrink-0 text-xs">@</span>
              )}
              <span className="truncate">{activeInfo.displayName}</span>
            </h3>

            {/* Star Button */}
            <button
              type="button"
              onClick={onToggleStarred}
              className={`hidden sm:inline-flex p-1 rounded-md transition-colors ${
                isStarred ? 'text-amber-500 hover:text-amber-600' : 'text-slate-400 hover:text-slate-600'
              }`}
              title={isStarred ? 'Bỏ đánh dấu sao' : 'Đánh dấu sao'}
            >
              <Star className={`w-3.5 h-3.5 ${isStarred ? 'fill-current' : ''}`} />
            </button>

            {!activeGroup.isDirect && (
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(activeGroup.code);
                  onShowToast('info', 'Đã sao chép mã phòng', activeGroup.code);
                }}
                className="hidden sm:inline-flex px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-[11px] font-mono text-slate-600 items-center gap-1 transition-colors"
                title="Sao chép mã phòng"
              >
                {activeGroup.code}
                <Copy className="w-2.5 h-2.5 text-slate-500" />
              </button>
            )}
          </div>

          <p className="text-[11px] text-slate-500 truncate flex items-center gap-1.5">
            {activeGroup.isDirect ? (
              <span className="flex items-center gap-1 text-emerald-600 font-medium truncate">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block shrink-0" />
                <span className="shrink-0">Đang hoạt động</span>
                <span className="text-slate-400 ml-1 truncate">• {activeInfo.displayRoleOrMembers}</span>
              </span>
            ) : (
              <>
                <span
                  onClick={() => onOpenDetails(activeGroup, 'members')}
                  className="hover:underline cursor-pointer hover:text-slate-900 font-medium inline-flex items-center gap-1"
                >
                  <Users className="w-3.5 h-3.5 text-slate-400" />
                  <span>{activeGroup.memberCount ?? (activeGroup.members || []).length} thành viên</span>
                </span>
                {activeGroup.department && <span className="truncate hidden sm:inline">• {activeGroup.department}</span>}
              </>
            )}
          </p>
        </div>
      </div>

      {/* Slack Header Action Buttons */}
      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 relative">
        {/* Nút thêm thành viên trực tiếp vào kênh */}
        {!activeGroup.isDirect && (
          <button
            type="button"
            onClick={onOpenDirectAddMember}
            className="px-2 sm:px-3 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-[#008689] text-xs font-semibold flex items-center gap-1.5 transition-colors border border-teal-200/60"
            title="Thêm thành viên trực tiếp vào kênh"
          >
            <UserPlus className="w-3.5 h-3.5 text-[#008689] shrink-0" />
            <span className="hidden sm:inline">Thêm thành viên</span>
          </button>
        )}

        {/* Huddle Button - Nổi bật rõ ràng trên cả Mobile và Desktop */}
        <button
          type="button"
          onClick={onOpenHuddle}
          className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-all cursor-pointer shadow-xs ${
            isHuddleActive
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md ring-2 ring-emerald-400 animate-pulse'
              : 'bg-teal-600 hover:bg-teal-700 text-white border border-teal-500'
          }`}
          title={
            isHuddleActive
              ? `Đang có ${activeHuddleCount} người đàm thoại. Bấm để tham gia ngay!`
              : 'Bắt đầu thảo luận nhanh (Huddle)'
          }
        >
          <div className="relative">
            <Headphones className="w-4 h-4 shrink-0 text-white" />
            {isHuddleActive && (
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-300 animate-ping" />
            )}
          </div>
          <span className="inline text-[11px] sm:text-xs text-white font-bold">
            {isHuddleActive && activeHuddleCount > 0 ? `Huddle (${activeHuddleCount})` : 'Huddle'}
          </span>
        </button>

        {/* Notifications */}
        <button
          type="button"
          onClick={() => onToggleMute(activeGroup)}
          className="p-1.5 sm:p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
          title={activeGroup.muted ? 'Bật thông báo' : 'Tắt thông báo'}
        >
          {activeGroup.muted ? <BellOff className="w-4 h-4 text-amber-500" /> : <Bell className="w-4 h-4" />}
        </button>

        {/* Three dots menu */}
        <div className="relative" ref={headerMenuRef}>
          <button
            type="button"
            onClick={() => setIsHeaderMenuOpen((prev) => !prev)}
            className={`p-2 rounded-lg transition-colors cursor-pointer border ${
              isHeaderMenuOpen
                ? 'bg-slate-200 text-slate-900 border-slate-300'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border-slate-200/60'
            }`}
            title="Tùy chọn kênh"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {isHeaderMenuOpen && (
            <div
              className="absolute right-0 top-full mt-1.5 w-60 bg-white rounded-xl shadow-2xl border border-slate-200 py-1.5 z-50 text-xs divide-y divide-slate-100 animate-fadeIn"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="py-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsHeaderMenuOpen(false);
                    onOpenHuddle();
                  }}
                  className="w-full px-3.5 py-2 text-left hover:bg-emerald-50/60 flex items-center gap-2.5 text-emerald-800 font-semibold cursor-pointer"
                >
                  <Headphones className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Tham gia đàm thoại Huddle</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsHeaderMenuOpen(false);
                    if (onOpenSharedMedia) onOpenSharedMedia();
                  }}
                  className="w-full px-3.5 py-2 text-left hover:bg-slate-50 flex items-center justify-between text-slate-800 font-semibold cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <FolderArchive className="w-3.5 h-3.5 text-teal-600" />
                    <span>File, Link, Ảnh đã gửi</span>
                  </span>
                  <span className="text-[10px] text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded font-bold border border-teal-200">
                    Kho tệp
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsHeaderMenuOpen(false);
                    onTogglePinConversation(activeGroup);
                  }}
                  className="w-full px-3.5 py-2 text-left hover:bg-slate-50 flex items-center gap-2.5 text-slate-700 font-medium cursor-pointer"
                >
                  <Pin className={`w-3.5 h-3.5 ${isActivePinned ? 'fill-amber-500 text-amber-500' : 'text-slate-400'}`} />
                  <span>{isActivePinned ? 'Bỏ ghim hội thoại' : 'Ghim hội thoại lên đầu'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsHeaderMenuOpen(false);
                    if (activeGroup.isDirect) {
                      onOpenProfile(activeInfo.partnerEmail || null, activeInfo.displayName);
                    } else {
                      onOpenDetails(activeGroup, 'about');
                    }
                  }}
                  className="w-full px-3.5 py-2 text-left hover:bg-slate-50 flex items-center justify-between text-slate-700 font-medium cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    {activeGroup.isDirect ? <User className="w-3.5 h-3.5 text-slate-400" /> : <Info className="w-3.5 h-3.5 text-slate-400" />}
                    <span>{activeGroup.isDirect ? 'Xem trang cá nhân' : 'Chi tiết kênh'}</span>
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {!activeGroup.isDirect && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsHeaderMenuOpen(false);
                      navigator.clipboard.writeText(activeGroup.code);
                      onShowToast('info', 'Đã sao chép mã phòng', activeGroup.code);
                    }}
                    className="w-full px-3.5 py-2 text-left hover:bg-slate-50 flex items-center justify-between text-slate-700 font-medium cursor-pointer"
                  >
                    <span className="flex items-center gap-2.5">
                      <Copy className="w-3.5 h-3.5 text-slate-400" />
                      <span>Sao chép mã phòng</span>
                    </span>
                    <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">{activeGroup.code}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setIsHeaderMenuOpen(false);
                    onToggleMute(activeGroup);
                  }}
                  className="w-full px-3.5 py-2 text-left hover:bg-slate-50 flex items-center gap-2.5 text-slate-700 font-medium cursor-pointer"
                >
                  {activeGroup.muted ? (
                    <>
                      <Bell className="w-3.5 h-3.5 text-slate-600" />
                      <span>Bật thông báo</span>
                    </>
                  ) : (
                    <>
                      <BellOff className="w-3.5 h-3.5 text-slate-400" />
                      <span>Tắt thông báo</span>
                    </>
                  )}
                </button>
              </div>

              {!activeGroup.isDirect && (
                <div className="py-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsHeaderMenuOpen(false);
                      onOpenSummarize();
                    }}
                    className="w-full px-3.5 py-2 text-left hover:bg-slate-50 flex items-center gap-2.5 text-slate-700 font-medium cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Tóm tắt hội thoại bằng AI</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsHeaderMenuOpen(false);
                      onOpenCanvas();
                    }}
                    className="w-full px-3.5 py-2 text-left hover:bg-slate-50 flex items-center gap-2.5 text-slate-700 font-medium cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5 text-teal-600" />
                    <span>Mở Bảng ghi nhớ Canvas</span>
                  </button>

                  {isGroupOwner && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setIsHeaderMenuOpen(false);
                          onOpenChannelSettings();
                        }}
                        className="w-full px-3.5 py-2 text-left hover:bg-slate-50 flex items-center justify-between text-slate-700 font-medium cursor-pointer"
                      >
                        <span className="flex items-center gap-2.5">
                          <Settings className="w-3.5 h-3.5 text-slate-400" />
                          <span>Cài đặt kênh</span>
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setIsHeaderMenuOpen(false);
                          onOpenTransferOwnership(activeGroup);
                        }}
                        className="w-full px-3.5 py-2 text-left hover:bg-slate-50 flex items-center gap-2.5 text-slate-700 font-medium cursor-pointer"
                      >
                        <UserCheck className="w-3.5 h-3.5 text-slate-600" />
                        <span>Chuyển quyền Trưởng nhóm</span>
                      </button>
                    </>
                  )}
                </div>
              )}

              <div className="py-1">
                {activeGroup.isDirect ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setIsHeaderMenuOpen(false);
                        if (onHideChat) onHideChat(activeGroup);
                        else onDeleteChat(activeGroup);
                      }}
                      className="w-full px-3.5 py-2 text-left hover:bg-rose-50 flex items-center gap-2.5 text-rose-600 font-semibold cursor-pointer text-xs"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                      <span>Xóa đoạn chat</span>
                    </button>
                    {activeInfo.partnerEmail && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsHeaderMenuOpen(false);
                          onUnfriend(activeInfo.partnerEmail!, activeInfo.displayName);
                        }}
                        className="w-full px-3.5 py-2 text-left hover:bg-rose-50 flex items-center gap-2.5 text-rose-600 font-semibold cursor-pointer text-xs"
                      >
                        <UserMinus className="w-3.5 h-3.5 text-rose-500" />
                        <span>Hủy kết bạn</span>
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setIsHeaderMenuOpen(false);
                        if (onHideChat) onHideChat(activeGroup);
                        else onDeleteChat(activeGroup);
                      }}
                      className="w-full px-3.5 py-2 text-left hover:bg-slate-50 flex items-center gap-2.5 text-slate-700 font-medium cursor-pointer text-xs"
                    >
                      <EyeOff className="w-3.5 h-3.5 text-slate-500" />
                      <span>Ẩn nhóm trò chuyện</span>
                    </button>
                    {isGroupOwner ? (
                      <button
                        type="button"
                        onClick={() => {
                          setIsHeaderMenuOpen(false);
                          onDisbandGroup(activeGroup);
                        }}
                        className="w-full px-3.5 py-2 text-left hover:bg-rose-50 flex items-center gap-2.5 text-rose-600 font-semibold cursor-pointer text-xs"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                        <span>Giải tán nhóm</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setIsHeaderMenuOpen(false);
                          onLeaveGroup(activeGroup);
                        }}
                        className="w-full px-3.5 py-2 text-left hover:bg-rose-50 flex items-center gap-2.5 text-rose-600 font-semibold cursor-pointer text-xs"
                      >
                        <LogOut className="w-3.5 h-3.5 text-rose-500" />
                        <span>Rời khỏi kênh</span>
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
