import React, { useState } from 'react';
import {
  Inbox,
  UserCheck,
  Check,
  X,
  Users,
  Send,
  Clock,
} from 'lucide-react';
import { FriendRequest, QGroupInvitation } from '../../types';

const initials = (name: string) =>
  String(name || 'QG')
    .trim()
    .slice(0, 2)
    .toUpperCase();

export interface InvitationsPanelProps {
  friendRequests: FriendRequest[];
  sentFriendRequests?: FriendRequest[];
  groupInvitations: QGroupInvitation[];
  onAcceptFriend: (r: FriendRequest) => void;
  onRejectFriend: (r: FriendRequest) => void;
  onCancelFriend?: (reqId: string) => void;
  onAcceptGroup: (i: QGroupInvitation) => void;
  onRejectGroup: (i: QGroupInvitation) => void;
  onBack: () => void;
}

export const InvitationsPanel: React.FC<InvitationsPanelProps> = ({
  friendRequests,
  sentFriendRequests = [],
  groupInvitations,
  onAcceptFriend,
  onRejectFriend,
  onCancelFriend,
  onAcceptGroup,
  onRejectGroup,
  onBack,
}) => {
  const [subTab, setSubTab] = useState<'received' | 'sent'>('received');
  const totalReceived = friendRequests.length + groupInvitations.length;
  const totalSent = sentFriendRequests.length;

  return (
    <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
        <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
          <Inbox className="w-4 h-4 text-slate-700" />
          <span>Trung Tâm Lời Mời</span>
        </span>
        <button
          type="button"
          onClick={onBack}
          className="text-xs text-slate-700 hover:text-slate-900 font-semibold hover:underline cursor-pointer"
        >
          ← Về kênh chat
        </button>
      </div>

      {/* Sub-tabs: Đã nhận vs Đã gửi */}
      <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg select-none">
        <button
          type="button"
          onClick={() => setSubTab('received')}
          className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            subTab === 'received'
              ? 'bg-white text-slate-900 shadow-2xs font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span>Lời mời đã nhận</span>
          {totalReceived > 0 && (
            <span className="px-1.5 rounded-full text-[10px] font-bold bg-rose-500 text-white">
              {totalReceived}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setSubTab('sent')}
          className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            subTab === 'sent'
              ? 'bg-white text-slate-900 shadow-2xs font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span>Lời mời đã gửi</span>
          {totalSent > 0 && (
            <span className="px-1.5 rounded-full text-[10px] font-semibold bg-slate-200 text-slate-700">
              {totalSent}
            </span>
          )}
        </button>
      </div>

      {subTab === 'received' ? (
        <div className="space-y-3">
          {friendRequests.length > 0 && (
            <div className="space-y-2">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5 text-slate-600" />
                Lời mời kết bạn ({friendRequests.length})
              </span>
              {friendRequests.map((req) => (
                <div
                  key={req.id}
                  className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2.5"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-slate-700 text-white font-bold text-xs flex items-center justify-center shrink-0">
                      {initials(req.senderName || req.senderEmail)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-xs font-bold text-slate-900 truncate">
                          {req.senderName || req.senderEmail}
                        </h4>
                        {req.senderTitle && (
                          <span className="px-1.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 shrink-0 border border-slate-200">
                            {req.senderTitle}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 font-mono truncate">
                        {req.senderEmail}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => onAcceptFriend(req)}
                      className="flex-1 py-1.5 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs flex items-center justify-center gap-1 cursor-pointer transition-colors"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Đồng ý
                    </button>
                    <button
                      type="button"
                      onClick={() => onRejectFriend(req)}
                      className="py-1.5 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center justify-center gap-1 border border-slate-200 cursor-pointer transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                      Từ chối
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {groupInvitations.length > 0 && (
            <div className="space-y-2">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-slate-600" />
                Lời mời tham gia nhóm ({groupInvitations.length})
              </span>
              {groupInvitations.map((inv) => (
                <div
                  key={inv.id}
                  className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2.5"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-slate-700 text-white font-bold text-xs flex items-center justify-center shrink-0">
                      {initials(inv.groupName)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-bold text-slate-900 truncate">{inv.groupName}</h4>
                      <p className="text-[10px] text-slate-600 font-mono">Mã: {inv.groupCode}</p>
                      <p className="text-[10px] text-slate-400 truncate">
                        Mời bởi: {inv.inviterName || inv.inviterEmail}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => onAcceptGroup(inv)}
                      className="flex-1 py-1.5 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs flex items-center justify-center gap-1 cursor-pointer transition-colors"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Tham gia
                    </button>
                    <button
                      type="button"
                      onClick={() => onRejectGroup(inv)}
                      className="py-1.5 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center justify-center gap-1 border border-slate-200 cursor-pointer transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                      Từ chối
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {totalReceived === 0 && (
            <div className="p-8 text-center text-slate-400 space-y-2">
              <Check className="w-8 h-8 text-slate-300 mx-auto" />
              <h4 className="text-xs font-semibold text-slate-700">Không có lời mời nào đã nhận</h4>
              <p className="text-[11px] text-slate-400">Bạn đã xử lý hết tất cả lời mời.</p>
            </div>
          )}
        </div>
      ) : (
        /* TAB SUB-TAB: ĐÃ GỬI (OUTGOING SENT) */
        <div className="space-y-3">
          {sentFriendRequests.length > 0 ? (
            <div className="space-y-2">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                <Send className="w-3.5 h-3.5 text-slate-600" />
                Lời mời kết bạn đã gửi ({sentFriendRequests.length})
              </span>
              {sentFriendRequests.map((req) => (
                <div
                  key={req.id}
                  className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-slate-700 text-white font-bold text-xs flex items-center justify-center shrink-0">
                        {initials(req.targetEmail || req.recipientEmail || '')}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-900 truncate">
                          {req.targetEmail || req.recipientEmail}
                        </p>
                        <p className="text-[10px] text-amber-700 font-medium flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Đang chờ đồng nghiệp chấp nhận
                        </p>
                      </div>
                    </div>

                    {onCancelFriend && (
                      <button
                        type="button"
                        onClick={() => onCancelFriend(req.id)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] transition-colors cursor-pointer border border-slate-200 shrink-0"
                        title="Thu hồi lời mời kết bạn"
                      >
                        Thu hồi
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400 space-y-2">
              <Send className="w-8 h-8 mx-auto text-slate-300" />
              <p className="text-xs font-semibold text-slate-700">Chưa gửi lời mời kết bạn nào</p>
              <p className="text-[11px]">Bấm biểu tượng thêm bạn ở thanh công cụ để mời đồng nghiệp kết nối.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
