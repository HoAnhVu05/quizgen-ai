import React from 'react';
import { MessageSquare, UserPlus, KeyRound, PlusCircle, Bell, MailCheck, Check } from 'lucide-react';
import { QGroup, QGroupInvitation } from './types';
import { ScreenId, UserProfile } from '../../types';
import { QGroupSidebar } from './QGroupSidebar';
import { QGroupChatArea } from './QGroupChatArea';
import { isInvitationForUser } from './qgroupHelpers';

interface TextbookQGroupTabProps {
  qgroups: QGroup[];
  selectedGroupId: string;
  setSelectedGroupId: (id: string) => void;
  activeGroup: QGroup | null;
  currentUser?: UserProfile | null;
  sidebarGroupFilter: 'groups' | 'direct' | 'invitations';
  setSidebarGroupFilter: (f: 'groups' | 'direct' | 'invitations') => void;
  groupSearchQuery: string;
  setGroupSearchQuery: (q: string) => void;
  groupInvitations: QGroupInvitation[];
  isChatSearchOpen: boolean;
  setIsChatSearchOpen: React.Dispatch<React.SetStateAction<boolean>>;
  chatSearchQuery: string;
  setChatSearchQuery: (q: string) => void;
  isAttachMenuOpen: boolean;
  setIsAttachMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  chatInputText: string;
  setChatInputText: (t: string) => void;
  onOpenNewDirectModal: () => void;
  onOpenJoinGroupModal: () => void;
  onOpenCreateGroupModal: () => void;
  onOpenGroupSettings: (tab: 'info' | 'members' | 'policy' | 'requests' | 'danger') => void;
  onOpenAttachTextbook: () => void;
  onOpenAttachExam: () => void;
  onAcceptInvitation: (inv: QGroupInvitation) => void;
  onDeclineInvitation: (invId: string) => void;
  onSendMessage: (e?: React.FormEvent) => void;
  onToggleReaction: (msgId: string, emoji: string) => void;
  onTogglePinMessage: (msgId: string) => void;
  onDeleteMessage: (msgId: string) => void;
  onNavigate: (screen: ScreenId) => void;
  onShowToast: (type: 'success' | 'info' | 'warning' | 'error', title: string, message: string) => void;
}

export const TextbookQGroupTab: React.FC<TextbookQGroupTabProps> = ({
  qgroups, selectedGroupId, setSelectedGroupId, activeGroup, currentUser,
  sidebarGroupFilter, setSidebarGroupFilter, groupSearchQuery, setGroupSearchQuery,
  groupInvitations, isChatSearchOpen, setIsChatSearchOpen, chatSearchQuery, setChatSearchQuery,
  isAttachMenuOpen, setIsAttachMenuOpen, chatInputText, setChatInputText,
  onOpenNewDirectModal, onOpenJoinGroupModal, onOpenCreateGroupModal,
  onOpenGroupSettings, onOpenAttachTextbook, onOpenAttachExam,
  onAcceptInvitation, onDeclineInvitation, onSendMessage,
  onToggleReaction, onTogglePinMessage, onDeleteMessage, onNavigate, onShowToast
}) => {
  const pendingInvs = groupInvitations.filter((inv) => isInvitationForUser(inv, currentUser?.email));

  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      {/* Minimalist Top Header */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-4 sm:p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-700 border border-purple-200 flex items-center justify-center shrink-0 shadow-2xs">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-slate-900">Hội Nhóm &amp; Tin Nhắn Học Thuật</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-100 text-purple-800 uppercase tracking-wider">Q-Group</span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Trao đổi chuyên môn theo bộ môn hoặc nhắn riêng 1-1, dùng chung giáo trình và đề thi tức thì.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <button
            type="button"
            onClick={onOpenNewDirectModal}
            className="px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold border border-indigo-200 transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>+ Nhắn Riêng 1-1</span>
          </button>
          <button
            type="button"
            onClick={onOpenJoinGroupModal}
            className="px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200 transition-all cursor-pointer flex items-center gap-1.5"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Nhập Mã Nhóm</span>
          </button>
          <button
            type="button"
            onClick={onOpenCreateGroupModal}
            className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>+ Tạo Q-Group</span>
          </button>
        </div>
      </div>

      {/* Incoming Group Invitations Notification Banner */}
      {pendingInvs.length > 0 && (
        <div className="bg-gradient-to-r from-purple-50 via-indigo-50 to-teal-50 border-2 border-purple-300 rounded-3xl p-4 sm:p-5 shadow-sm space-y-3 animate-in slide-in-from-top-2">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2.5 text-purple-950 font-black text-sm">
              <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-xs">
                <Bell className="w-4 h-4 animate-pulse" />
              </div>
              <div>
                <span>Lời Mời Tham Gia Q-Group Mới ({pendingInvs.length})</span>
                <p className="text-[11px] font-normal text-slate-600">
                  Đồng nghiệp đã gửi lời mời tham gia nhóm chuyên môn tới tài khoản của Thầy/Cô:
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {pendingInvs.map((inv) => (
              <div key={inv.id} className="p-3.5 bg-white rounded-2xl border border-purple-200/90 shadow-2xs space-y-2.5 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-extrabold text-xs text-slate-900 line-clamp-1">{inv.groupName}</h4>
                    <span className="font-mono text-[10px] font-bold bg-purple-50 text-purple-700 px-2 py-0.5 rounded border border-purple-200 shrink-0">
                      {inv.groupCode}
                    </span>
                  </div>
                  <div className="text-[11px] text-purple-800 font-semibold mt-0.5">{inv.department}</div>
                  <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                    <MailCheck className="w-3 h-3 text-purple-600 shrink-0" />
                    <span>Mời bởi: <strong>{inv.inviterName}</strong> ({inv.inviterEmail}) • {inv.invitedAt}</span>
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onDeclineInvitation(inv.id)}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-xs transition-colors cursor-pointer"
                  >
                    Từ Chối
                  </button>
                  <button
                    type="button"
                    onClick={() => onAcceptInvitation(inv)}
                    className="flex-1 px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Chấp Nhận &amp; Vào Nhóm</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2-Column Split Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[720px] min-h-[620px]">
        <QGroupSidebar
          qgroups={qgroups}
          selectedGroupId={selectedGroupId}
          onSelectGroup={setSelectedGroupId}
          sidebarGroupFilter={sidebarGroupFilter}
          setSidebarGroupFilter={setSidebarGroupFilter}
          groupSearchQuery={groupSearchQuery}
          setGroupSearchQuery={setGroupSearchQuery}
          groupInvitations={groupInvitations}
          currentUser={currentUser}
          onOpenCreateGroupModal={onOpenCreateGroupModal}
          onOpenNewDirectModal={onOpenNewDirectModal}
          onAcceptInvitation={onAcceptInvitation}
          onDeclineInvitation={onDeclineInvitation}
        />

        <QGroupChatArea
          activeGroup={activeGroup}
          currentUser={currentUser}
          isChatSearchOpen={isChatSearchOpen}
          setIsChatSearchOpen={setIsChatSearchOpen}
          chatSearchQuery={chatSearchQuery}
          setChatSearchQuery={setChatSearchQuery}
          isAttachMenuOpen={isAttachMenuOpen}
          setIsAttachMenuOpen={setIsAttachMenuOpen}
          chatInputText={chatInputText}
          setChatInputText={setChatInputText}
          onOpenGroupSettings={onOpenGroupSettings}
          onOpenAttachTextbook={onOpenAttachTextbook}
          onOpenAttachExam={onOpenAttachExam}
          onSendMessage={onSendMessage}
          onToggleReaction={onToggleReaction}
          onTogglePinMessage={onTogglePinMessage}
          onDeleteMessage={onDeleteMessage}
          onNavigate={onNavigate}
          onShowToast={onShowToast}
        />
      </div>
    </div>
  );
};
