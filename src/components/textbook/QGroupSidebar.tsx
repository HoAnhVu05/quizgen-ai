import React from 'react';
import { FolderGit2, PlusCircle, MessageSquare, Bell, Search, X, MailCheck } from 'lucide-react';
import { QGroup, QGroupInvitation } from './types';
import { UserProfile } from '../../types';
import { isInvitationForUser } from './qgroupHelpers';

interface QGroupSidebarProps {
  qgroups: QGroup[];
  selectedGroupId: string;
  onSelectGroup: (id: string) => void;
  sidebarGroupFilter: 'groups' | 'direct' | 'invitations';
  setSidebarGroupFilter: (f: 'groups' | 'direct' | 'invitations') => void;
  groupSearchQuery: string;
  setGroupSearchQuery: (q: string) => void;
  groupInvitations: QGroupInvitation[];
  currentUser?: UserProfile | null;
  onOpenCreateGroupModal: () => void;
  onOpenNewDirectModal: () => void;
  onAcceptInvitation: (inv: QGroupInvitation) => void;
  onDeclineInvitation: (invId: string) => void;
}

export const QGroupSidebar: React.FC<QGroupSidebarProps> = ({
  qgroups,
  selectedGroupId,
  onSelectGroup,
  sidebarGroupFilter,
  setSidebarGroupFilter,
  groupSearchQuery,
  setGroupSearchQuery,
  groupInvitations,
  currentUser,
  onOpenCreateGroupModal,
  onOpenNewDirectModal,
  onAcceptInvitation,
  onDeclineInvitation,
}) => {
  const pendingInvs = groupInvitations.filter((i) => isInvitationForUser(i, currentUser?.email));
  const standardGroups = qgroups.filter((g) => !g.isDirect);
  const directChats = qgroups.filter((g) => g.isDirect);

  return (
    <div className="lg:col-span-4 xl:col-span-3.5 bg-white rounded-3xl border border-slate-200 shadow-2xs flex flex-col overflow-hidden">
      <div className="p-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
        <div className="flex items-center gap-2">
          <FolderGit2 className="w-4 h-4 text-purple-700" />
          <span className="font-extrabold text-xs text-slate-800 uppercase tracking-wider">
            Nhóm Của Tôi ({qgroups.length})
          </span>
        </div>
        <button
          onClick={onOpenCreateGroupModal}
          className="p-1 rounded-lg text-purple-700 hover:bg-purple-100 transition-colors cursor-pointer"
          title="Tạo nhóm mới"
        >
          <PlusCircle className="w-4 h-4" />
        </button>
      </div>

      {/* Sub-tabs: Groups vs Direct vs Invitations */}
      <div className="p-2 border-b border-slate-100 bg-slate-50/70 flex gap-1 text-[11px] font-bold">
        <button
          type="button"
          onClick={() => setSidebarGroupFilter('groups')}
          className={`flex-1 py-1.5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 ${
            sidebarGroupFilter === 'groups'
              ? 'bg-purple-600 text-white shadow-2xs'
              : 'text-slate-600 hover:bg-slate-200/60'
          }`}
        >
          <FolderGit2 className="w-3 h-3" />
          <span>Nhóm ({standardGroups.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setSidebarGroupFilter('direct')}
          className={`flex-1 py-1.5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 ${
            sidebarGroupFilter === 'direct'
              ? 'bg-indigo-600 text-white shadow-2xs'
              : 'text-slate-600 hover:bg-slate-200/60'
          }`}
        >
          <MessageSquare className="w-3 h-3" />
          <span>Nhắn riêng ({directChats.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setSidebarGroupFilter('invitations')}
          className={`flex-1 py-1.5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 relative ${
            sidebarGroupFilter === 'invitations'
              ? 'bg-purple-600 text-white shadow-2xs'
              : 'text-slate-600 hover:bg-slate-200/60'
          }`}
        >
          <Bell className="w-3 h-3" />
          <span>Lời mời</span>
          {pendingInvs.length > 0 && (
            <span className="px-1.5 py-0.2 bg-rose-600 text-white text-[9px] font-black rounded-full">
              {pendingInvs.length}
            </span>
          )}
        </button>
      </div>

      {/* Group Search Input */}
      {sidebarGroupFilter !== 'invitations' && (
        <div className="p-2.5 border-b border-slate-100 bg-slate-50/50">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={groupSearchQuery}
              onChange={(e) => setGroupSearchQuery(e.target.value)}
              placeholder={sidebarGroupFilter === 'groups' ? 'Tìm theo tên nhóm, mã phòng...' : 'Tìm theo tên hoặc email đồng nghiệp...'}
              className="w-full pl-8 pr-7 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-purple-600 text-slate-800 placeholder-slate-400"
            />
            {groupSearchQuery && (
              <button
                onClick={() => setGroupSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-2 bg-[#f8fafc]">
        {sidebarGroupFilter === 'invitations' ? (
          pendingInvs.length === 0 ? (
            <div className="p-6 text-center text-slate-400 space-y-2">
              <MailCheck className="w-8 h-8 mx-auto text-slate-300" />
              <p className="font-bold text-xs text-slate-600">Không có lời mời nào</p>
              <p className="text-[11px]">Khi đồng nghiệp mời email của Thầy/Cô, thư mời sẽ xuất hiện tại đây.</p>
            </div>
          ) : (
            pendingInvs.map((inv) => (
              <div key={inv.id} className="p-3 bg-white rounded-2xl border border-purple-200 shadow-2xs space-y-2">
                <div className="font-bold text-xs text-slate-900 truncate">{inv.groupName}</div>
                <div className="text-[10px] text-purple-700 font-semibold truncate">{inv.department}</div>
                <div className="text-[10px] text-slate-500">Mời bởi: {inv.inviterName}</div>
                <div className="pt-1.5 flex gap-1.5 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => onDeclineInvitation(inv.id)}
                    className="flex-1 py-1 text-slate-600 hover:bg-slate-100 rounded-lg text-[10px] font-bold border border-slate-200 cursor-pointer"
                  >
                    Từ chối
                  </button>
                  <button
                    type="button"
                    onClick={() => onAcceptInvitation(inv)}
                    className="flex-1 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-[10px] font-bold cursor-pointer shadow-xs"
                  >
                    Vào nhóm
                  </button>
                </div>
              </div>
            ))
          )
        ) : sidebarGroupFilter === 'direct' ? (
          (() => {
            const directList = directChats.filter((g) => {
              if (!groupSearchQuery.trim()) return true;
              const q = groupSearchQuery.toLowerCase();
              return g.name.toLowerCase().includes(q) || (g.directPartnerEmail && g.directPartnerEmail.toLowerCase().includes(q));
            });

            if (directList.length === 0) {
              return (
                <div className="p-6 text-center text-slate-400 space-y-3">
                  <MessageSquare className="w-8 h-8 mx-auto text-indigo-300" />
                  <div>
                    <p className="font-bold text-xs text-slate-700">Chưa có cuộc trò chuyện 1-1</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Nhắn tin trực tiếp với đồng nghiệp để chia sẻ học liệu và trao đổi riêng tư.</p>
                  </div>
                  <button
                    type="button"
                    onClick={onOpenNewDirectModal}
                    className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                  >
                    + Bắt Đầu Nhắn Riêng
                  </button>
                </div>
              );
            }

            return directList.map((group) => {
              const isSelected = group.id === selectedGroupId;
              const lastMsg = group.messages?.[group.messages.length - 1] || null;
              return (
                <div
                  key={group.id}
                  onClick={() => onSelectGroup(group.id)}
                  className={`w-full text-left p-3 rounded-2xl transition-all cursor-pointer border flex items-center gap-3 ${
                    isSelected
                      ? 'bg-indigo-50/90 border-indigo-400 shadow-xs border-l-4 border-l-indigo-600'
                      : 'bg-white hover:bg-slate-50 border-slate-200/80 shadow-2xs'
                  }`}
                >
                  <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-black text-xs shrink-0">
                    {String(group.name || 'DM').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className="font-bold text-xs text-slate-900 truncate">{group.name || 'Tin nhắn riêng'}</h4>
                      {lastMsg && <span className="text-[10px] text-slate-400 shrink-0 font-medium">{lastMsg.timestamp}</span>}
                    </div>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">
                      {lastMsg ? (
                        <span>
                          <strong>{lastMsg.senderName.split(' ').pop()}: </strong>
                          {lastMsg.text || '[Tài liệu đính kèm]'}
                        </span>
                      ) : (
                        'Nhấn để bắt đầu trò chuyện...'
                      )}
                    </p>
                  </div>
                </div>
              );
            });
          })()
        ) : (
          standardGroups
            .filter((group) => {
              if (!groupSearchQuery.trim()) return true;
              const q = groupSearchQuery.toLowerCase();
              return (
                group.name.toLowerCase().includes(q) ||
                group.department.toLowerCase().includes(q) ||
                group.code.toLowerCase().includes(q)
              );
            })
            .map((group) => {
              const isSelected = group.id === selectedGroupId;
              const hasPending = (group.pendingRequests || []).length > 0;
              const lastMsg = group.messages?.[group.messages.length - 1] || null;
              return (
                <div
                  key={group.id}
                  onClick={() => onSelectGroup(group.id)}
                  className={`w-full text-left p-3 rounded-2xl transition-all cursor-pointer border flex items-center gap-3 ${
                    isSelected
                      ? 'bg-purple-50/90 border-purple-400 shadow-xs border-l-4 border-l-purple-600'
                      : 'bg-white hover:bg-slate-50 border-slate-200/80 shadow-2xs'
                  }`}
                >
                  <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-black text-xs shrink-0">
                    {String(group.name || 'QG').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className="font-bold text-xs text-slate-900 truncate">{group.name || 'Hội nhóm Q-Group'}</h4>
                      {lastMsg && <span className="text-[10px] text-slate-400 shrink-0 font-medium">{lastMsg.timestamp}</span>}
                    </div>
                    <div className="flex items-center justify-between gap-1 mt-0.5">
                      <p className="text-[11px] text-slate-500 truncate flex-1">
                        {lastMsg ? (
                          <span>
                            <strong>{lastMsg.senderName.split(' ').pop()}: </strong>
                            {lastMsg.text || '[Tài liệu đính kèm]'}
                          </span>
                        ) : (
                          group.department
                        )}
                      </p>
                      {hasPending && <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shrink-0" title="Có yêu cầu chờ duyệt" />}
                    </div>
                  </div>
                </div>
              );
            })
        )}
      </div>
    </div>
  );
};
