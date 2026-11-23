import React, { useState, useMemo } from 'react';
import {
  UserPlus,
  Plus,
  Search,
  MessageCircle,
  Hash,
  ChevronDown,
  ChevronRight,
  Users,
  Eye,
  EyeOff,
} from 'lucide-react';
import type { QGroup, FriendRequest, QGroupInvitation } from '../../types';
import { ConversationItem } from './ConversationItem';
import { InvitationsPanel } from './InvitationsPanel';
import { deduplicateDMsAndChannels, resolveChatDisplayInfo } from './chatUtils';

export interface ChannelSidebarProps {
  sortedGroups: QGroup[];
  selectedGroupId: string;
  myEmail: string;
  menuGroupId: string | null;
  filterTab: 'all' | 'unread' | 'invitations' | 'groups' | 'friends';
  setFilterTab: (tab: 'all' | 'unread' | 'invitations' | 'groups' | 'friends') => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  activeHuddleRoomIds?: Set<string>;
  hiddenGroupIds?: Set<string>;
  onUnhideGroup?: (groupId: string) => void;
  totalInvitations: number;
  friendRequests: FriendRequest[];
  sentFriendRequests: FriendRequest[];
  groupInvitations: QGroupInvitation[];
  onAcceptFriend: (req: FriendRequest) => void;
  onRejectFriend: (req: FriendRequest) => void;
  onCancelFriend: (reqId: string) => void;
  onAcceptGroup: (inv: QGroupInvitation) => void;
  onRejectGroup: (inv: QGroupInvitation) => void;
  onOpenAddFriend: () => void;
  onOpenCreateGroup: () => void;
  onSelectGroup: (groupId: string) => void;
  onToggleMenu: (groupId: string, e: React.MouseEvent) => void;
  onViewProfile: (group: QGroup) => void;
  onViewDetails: (group: QGroup) => void;
  onMute: (group: QGroup) => void;
  onTogglePin: (group: QGroup) => void;
  onDeleteChat: (group: QGroup) => void;
  onUnfriend: (group: QGroup) => void;
  onLeaveGroup: (group: QGroup) => void;
  onTransferOwner: (group: QGroup) => void;
  onDisbandGroup: (group: QGroup) => void;
  onCopyCode: (code: string) => void;
}

export const ChannelSidebar: React.FC<ChannelSidebarProps> = ({
  sortedGroups,
  selectedGroupId,
  myEmail,
  menuGroupId,
  filterTab,
  setFilterTab,
  searchQuery,
  setSearchQuery,
  activeHuddleRoomIds,
  totalInvitations,
  friendRequests,
  sentFriendRequests,
  groupInvitations,
  onAcceptFriend,
  onRejectFriend,
  onCancelFriend,
  onAcceptGroup,
  onRejectGroup,
  onOpenAddFriend,
  onOpenCreateGroup,
  onSelectGroup,
  onToggleMenu,
  onViewProfile,
  onViewDetails,
  onMute,
  onTogglePin,
  onDeleteChat,
  onUnfriend,
  onLeaveGroup,
  onTransferOwner,
  onDisbandGroup,
  onCopyCode,
  hiddenGroupIds,
  onUnhideGroup,
}) => {
  const [isChannelsOpen, setIsChannelsOpen] = useState(true);
  const [isDmsOpen, setIsDmsOpen] = useState(true);
  const [isHiddenOpen, setIsHiddenOpen] = useState(false);

  // Chuẩn hóa & Gộp trùng lặp cho tin nhắn trực tiếp 1-1
  const cleanGroups = useMemo(() => {
    return deduplicateDMsAndChannels(sortedGroups);
  }, [sortedGroups]);

  // Nhóm hiển thị bình thường (chưa bị ẩn)
  const visibleGroups = useMemo(() => {
    if (!hiddenGroupIds || hiddenGroupIds.size === 0) return cleanGroups;
    return cleanGroups.filter((g) => !hiddenGroupIds.has(g.id) && !hiddenGroupIds.has(g.code));
  }, [cleanGroups, hiddenGroupIds]);

  // Nhóm đang bị ẩn vào thư mục riêng
  const hiddenGroups = useMemo(() => {
    if (!hiddenGroupIds || hiddenGroupIds.size === 0) return [];
    return cleanGroups.filter((g) => hiddenGroupIds.has(g.id) || hiddenGroupIds.has(g.code));
  }, [cleanGroups, hiddenGroupIds]);

  const channelGroups = useMemo(
    () => visibleGroups.filter((g) => !g.isDirect),
    [visibleGroups]
  );

  const directGroups = useMemo(
    () => visibleGroups.filter((g) => Boolean(g.isDirect)),
    [visibleGroups]
  );

  const renderConversationItem = (group: QGroup) => {
    const getNormalizedRoomId = (g: QGroup) => {
      if (g.isDirect) {
        const raw = [g.ownerEmail, g.directPartnerEmail, ...(g.members || [])]
          .filter(Boolean)
          .map((e) => String(e).trim().toLowerCase());
        const u = Array.from(new Set(raw)).sort();
        if (u.length >= 2) return `dm_${u.join('_')}`.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
      }
      return (g.id || g.code || '').replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
    };
    const roomKey = getNormalizedRoomId(group);
    const hasActiveHuddle = Boolean(
      activeHuddleRoomIds?.has(roomKey) || (group.id && activeHuddleRoomIds?.has(group.id.toLowerCase()))
    );

    return (
      <ConversationItem
        key={group.id}
        group={group}
        isSelected={group.id === selectedGroupId}
        myEmail={myEmail}
        isMenuOpen={menuGroupId === group.id}
        hasActiveHuddle={hasActiveHuddle}
        onSelect={() => onSelectGroup(group.id)}
        onMenuToggle={(e) => onToggleMenu(group.id, e)}
        onViewProfile={() => onViewProfile(group)}
        onViewDetails={() => onViewDetails(group)}
        onMute={() => onMute(group)}
        onTogglePin={() => onTogglePin(group)}
        onDelete={() => onDeleteChat(group)}
        onUnfriend={() => onUnfriend(group)}
        onLeave={() => onLeaveGroup(group)}
        onTransferOwner={() => onTransferOwner(group)}
        onDisband={() => onDisbandGroup(group)}
        onCopyCode={() => onCopyCode(group.code)}
      />
    );
  };

  return (
    <div className="h-full flex flex-col bg-slate-50/80 select-none">
      {/* Sidebar Header */}
      <div className="p-3 border-b border-slate-200/80 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
            <h2 className="text-sm font-bold text-slate-800 tracking-tight">Kênh học thuật</h2>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onOpenAddFriend}
              className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
              title="Thêm đồng nghiệp mới"
            >
              <UserPlus className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={onOpenCreateGroup}
              className="w-7 h-7 rounded-lg bg-slate-900 hover:bg-slate-800 text-white flex items-center justify-center transition-colors shadow-xs cursor-pointer"
              title="Tạo kênh mới hoặc Nhập mã"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm kênh hoặc đồng nghiệp..."
            className="w-full pl-8 pr-3 py-1.5 bg-slate-100 hover:bg-slate-200/70 focus:bg-white border border-transparent focus:border-slate-400 rounded-lg text-xs text-slate-800 placeholder-slate-400 outline-none transition-all"
          />
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setFilterTab('all');
            }}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              filterTab === 'all'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Tất cả
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setFilterTab('unread');
            }}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              filterTab === 'unread'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Chưa đọc
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setFilterTab('invitations');
            }}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              filterTab === 'invitations'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <span>Lời mời</span>
            {totalInvitations > 0 && (
              <span className="px-1.5 rounded-full text-[10px] font-bold bg-rose-500 text-white">
                {totalInvitations}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Main Conversation List / Invitations */}
      {filterTab === 'invitations' ? (
        <InvitationsPanel
          friendRequests={friendRequests}
          sentFriendRequests={sentFriendRequests}
          groupInvitations={groupInvitations}
          onAcceptFriend={onAcceptFriend}
          onRejectFriend={onRejectFriend}
          onCancelFriend={onCancelFriend}
          onAcceptGroup={onAcceptGroup}
          onRejectGroup={onRejectGroup}
          onBack={() => setFilterTab('all')}
        />
      ) : (
        <div className="flex-1 overflow-y-auto py-2">
          {/* Lời mời kết bạn nổi bật cho tài khoản nhận */}
          {friendRequests.length > 0 && (
            <div
              onClick={() => setFilterTab('invitations')}
              className="mx-2 mb-2 p-2.5 rounded-lg bg-slate-900 text-white flex items-center justify-between gap-2.5 cursor-pointer hover:bg-slate-800 transition-all shadow-xs"
            >
              <div className="flex items-center gap-2 min-w-0">
                <UserPlus className="w-4 h-4 text-teal-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold truncate flex items-center gap-1.5">
                    <span>{friendRequests.length} lời mời kết bạn mới</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                  </p>
                  <p className="text-[10px] text-slate-300 truncate">
                    Từ: {friendRequests[0]?.senderName || friendRequests[0]?.senderEmail}
                  </p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded bg-white/20 text-white text-[10px] font-semibold shrink-0">
                Xem
              </span>
            </div>
          )}

          {cleanGroups.length === 0 ? (
            <div className="p-8 text-center text-slate-400 space-y-2">
              <MessageCircle className="w-8 h-8 mx-auto text-slate-300" />
              <p className="text-xs font-semibold text-slate-600">Không có kênh hay tin nhắn nào</p>
              <p className="text-[11px]">Bấm dấu + để tạo kênh chuyên môn hoặc kết nối đồng nghiệp.</p>
            </div>
          ) : filterTab === 'unread' ? (
            <div className="space-y-0.5">
              <div className="px-3 py-1 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Tin nhắn chưa đọc ({cleanGroups.length})
              </div>
              {cleanGroups.map(renderConversationItem)}
            </div>
          ) : (
            <div className="space-y-3">
              {/* SECTION 1: KÊNH CHUYÊN MÔN */}
              <div>
                <div className="flex items-center justify-between px-3 py-1 text-slate-500 hover:text-slate-800 select-none">
                  <button
                    type="button"
                    onClick={() => setIsChannelsOpen((prev) => !prev)}
                    className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                  >
                    {isChannelsOpen ? (
                      <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                    )}
                    <Hash className="w-3.5 h-3.5" />
                    <span>Kênh chuyên môn ({channelGroups.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={onOpenCreateGroup}
                    className="w-5 h-5 rounded hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center cursor-pointer transition-colors"
                    title="Tạo kênh mới hoặc Nhập mã"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {isChannelsOpen && (
                  <div className="space-y-0.5 mt-0.5">
                    {channelGroups.map(renderConversationItem)}
                  </div>
                )}
              </div>

              {/* SECTION 2: TIN NHẮN TRỰC TIẾP */}
              <div className="pt-2 border-t border-slate-200/60">
                <div className="flex items-center justify-between px-3 py-1 text-slate-500 hover:text-slate-800 select-none">
                  <button
                    type="button"
                    onClick={() => setIsDmsOpen((prev) => !prev)}
                    className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                  >
                    {isDmsOpen ? (
                      <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                    )}
                    <Users className="w-3.5 h-3.5" />
                    <span>Tin nhắn trực tiếp ({directGroups.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={onOpenAddFriend}
                    className="w-5 h-5 rounded hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center cursor-pointer transition-colors"
                    title="Thêm đồng nghiệp mới"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {isDmsOpen && (
                  <div className="space-y-0.5 mt-0.5">
                    {directGroups.map(renderConversationItem)}
                    {directGroups.length === 0 && (
                      <p className="px-3 py-1 text-[11px] text-slate-400 italic">Chưa có tin nhắn 1-1 nào</p>
                    )}
                  </div>
                )}
              </div>

              {/* SECTION 3: CUỘC TRÒ CHUYỆN ĐÃ ẨN */}
              {hiddenGroups.length > 0 && (
                <div className="pt-2 border-t border-slate-200/60">
                  <div className="flex items-center justify-between px-3 py-1 text-slate-500 hover:text-slate-800 select-none">
                    <button
                      type="button"
                      onClick={() => setIsHiddenOpen((prev) => !prev)}
                      className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                    >
                      {isHiddenOpen ? (
                        <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                      )}
                      <EyeOff className="w-3.5 h-3.5" />
                      <span>Cuộc trò chuyện đã ẩn ({hiddenGroups.length})</span>
                    </button>
                  </div>

                  {isHiddenOpen && (
                    <div className="space-y-1 mt-1 px-1.5">
                      {hiddenGroups.map((g) => {
                        const info = resolveChatDisplayInfo(g, myEmail);
                        return (
                          <div
                            key={g.id}
                            className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200 hover:border-slate-300 text-xs shadow-2xs"
                          >
                            <div
                              className="min-w-0 flex-1 cursor-pointer pr-2"
                              onClick={() => onSelectGroup(g.id)}
                            >
                              <p className="font-semibold text-slate-800 truncate text-xs">
                                {info.displayName}
                              </p>
                              <p className="text-[10px] text-slate-400">
                                {g.isDirect ? 'Tin nhắn 1-1' : 'Kênh chuyên môn'}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => onUnhideGroup && onUnhideGroup(g.id)}
                              className="px-2 py-1 rounded bg-teal-50 hover:bg-teal-100 text-[#008689] font-semibold text-[10px] flex items-center gap-1 cursor-pointer shrink-0 border border-teal-200/60"
                              title="Hiện lại cuộc trò chuyện này trong danh sách"
                            >
                              <Eye className="w-3 h-3" />
                              <span>Hiện lại</span>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
