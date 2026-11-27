import React from 'react';
import { User, Hash, Shield, Check, X } from 'lucide-react';
import type { QGroup, QGroupMessage, ScreenId, UserProfile } from '../../types';
import { UserAvatar } from '../common/UserAvatar';
import { openUserProfile } from '../../utils/userProfileModalHelper';
import { ChatMessageRow, ChatMessageRowProps } from './ChatMessageRow';
import type { ResolvedChatInfo } from './chatUtils';

export interface ChatMessageStreamProps extends Omit<ChatMessageRowProps, 'msg'> {
  activeGroup: QGroup;
  activeInfo: ResolvedChatInfo;
  chatContainerRef: React.RefObject<HTMLDivElement>;
  chatEndRef: React.RefObject<HTMLDivElement>;
  isUserNearBottomRef: React.MutableRefObject<boolean>;
  handleRespondJoinRequest: (
    group: QGroup,
    joinReqId: string,
    joinEmail: string,
    status: 'approve' | 'reject'
  ) => Promise<void>;
}

export const ChatMessageStream: React.FC<ChatMessageStreamProps> = ({
  activeGroup,
  activeInfo,
  myEmail,
  myName,
  currentUser,
  chatContainerRef,
  chatEndRef,
  isUserNearBottomRef,
  handleRespondJoinRequest,
  handleOpenUserProfile,
  ...rowProps
}) => {
  return (
    <div
      ref={chatContainerRef}
      onScroll={() => {
        if (chatContainerRef.current) {
          const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
          isUserNearBottomRef.current = scrollHeight - scrollTop - clientHeight <= 120;
        }
      }}
      style={{ scrollBehavior: 'auto' }}
      className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-2 bg-[#fcfdfe]"
    >
      {/* Channel Welcome Card */}
      {activeGroup.isDirect ? (
        <div className="p-4 sm:p-5 rounded-xl bg-white border border-slate-200 text-left space-y-3 max-w-xl mb-4 shadow-2xs">
          <div className="flex items-center gap-3">
            <UserAvatar
              avatarUrl={activeInfo.avatarUrl}
              name={activeInfo.displayName}
              email={activeInfo.partnerEmail}
              size="md"
              rounded="rounded-lg"
              className="cursor-pointer hover:opacity-90 transition-opacity shadow-2xs shrink-0"
              title={`Xem hồ sơ của ${activeInfo.displayName}`}
              onClick={() => openUserProfile(activeInfo.partnerEmail, activeInfo.displayName)}
            />
            <div>
              <h4
                onClick={() => openUserProfile(activeInfo.partnerEmail, activeInfo.displayName)}
                className="text-sm font-bold text-slate-900 hover:text-[#008689] flex items-center gap-1.5 cursor-pointer hover:underline transition-colors"
                title={`Xem hồ sơ của ${activeInfo.displayName}`}
              >
                <span>{activeInfo.displayName}</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
              </h4>
              <p className="text-xs text-slate-400 font-mono">{activeInfo.partnerEmail}</p>
            </div>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200">
            Đây là không gian trao đổi chuyên môn trực tiếp riêng tư giữa bạn và{' '}
            <strong>{activeInfo.displayName}</strong> ({activeInfo.displayRoleOrMembers}). Toàn bộ tài liệu giáo trình và câu hỏi thi chia sẻ tại đây được đồng bộ hai chiều.
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                handleOpenUserProfile(activeInfo.partnerEmail, activeInfo.displayName);
              }}
              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs cursor-pointer flex items-center gap-1.5 transition-colors border border-slate-200"
            >
              <User className="w-3.5 h-3.5" />
              <span>Xem trang cá nhân</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="p-4 sm:p-5 rounded-xl bg-white border border-slate-200 text-left space-y-2.5 max-w-xl mb-4 shadow-2xs">
          <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-sm border border-slate-200">
            <Hash className="w-5 h-5 text-slate-600" />
          </div>
          <h4 className="text-sm sm:text-base font-bold text-slate-900">
            Chào mừng bạn đến với kênh #{activeInfo.displayName}!
          </h4>
          <p className="text-xs text-slate-600 leading-relaxed">
            {activeGroup.description ||
              'Không gian trao đổi chuyên môn, chia sẻ giáo trình và đóng góp ma trận câu hỏi thi giữa các giảng viên trong bộ môn.'}
          </p>
          <div className="flex items-center gap-3 pt-1 text-[11px] text-slate-500">
            <span>
              Mã phòng:{' '}
              <strong className="font-mono text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                {activeGroup.code}
              </strong>
            </span>
            <span>•</span>
            <span>
              Chủ trì: <strong>{activeGroup.ownerName || 'TS. Hồ Anh Vũ'}</strong>
            </span>
          </div>
        </div>
      )}

      {/* Message Items (Slack Linear Row Layout) */}
      {(activeGroup.messages || []).map((msg) => {
        const isOwner = (activeGroup.ownerEmail || '').toLowerCase() === myEmail;
        if (msg.isSystem) {
          const isJoinReq = (msg as any).isJoinRequest;
          const isHandled = (msg as any).isJoinRequestHandled;

          if (isJoinReq) {
            return (
              <div key={msg.id} className="flex justify-center my-3 px-2">
                <div className="max-w-md w-full p-3.5 rounded-2xl bg-amber-50/95 border border-amber-300 shadow-xs space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-extrabold text-amber-950 flex items-center gap-1.5 uppercase tracking-wide text-[11px]">
                      <Shield className="w-3.5 h-3.5 text-amber-700" />
                      <span>Yêu cầu xin gia nhập kênh</span>
                    </span>
                    <span className="text-[10px] text-amber-800 font-mono">{msg.timestamp}</span>
                  </div>
                  <p className="text-xs text-slate-800 leading-relaxed font-medium">
                    {msg.text}
                  </p>
                  {isOwner && !isHandled ? (
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-amber-200">
                      <button
                        type="button"
                        onClick={() =>
                          void handleRespondJoinRequest(
                            activeGroup,
                            (msg as any).joinRequestId,
                            (msg as any).joinUserEmail,
                            'approve'
                          )
                        }
                        className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Duyệt ngay</span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          void handleRespondJoinRequest(
                            activeGroup,
                            (msg as any).joinRequestId,
                            (msg as any).joinUserEmail,
                            'reject'
                          )
                        }
                        className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-semibold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Từ chối</span>
                      </button>
                    </div>
                  ) : isHandled ? (
                    <div className="pt-1.5 border-t border-amber-200/70 text-[11px] font-bold flex items-center gap-1.5">
                      {(msg as any).joinRequestStatus === 'approve' ? (
                        <span className="text-emerald-700 flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> Đã được Trưởng nhóm phê duyệt
                        </span>
                      ) : (
                        <span className="text-rose-600 flex items-center gap-1">
                          <X className="w-3.5 h-3.5" /> Đã từ chối yêu cầu
                        </span>
                      )}
                    </div>
                  ) : null}
                </div>
              </div>
            );
          }

          return (
            <div key={msg.id} className="flex justify-center my-2">
              <span className="px-3.5 py-1 rounded-full bg-slate-100 text-slate-600 text-[11px] font-medium flex items-center gap-1.5 border border-slate-200">
                <Shield className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                <span>{msg.text}</span>
                <span className="text-[10px] text-slate-400 font-mono ml-1">{msg.timestamp}</span>
              </span>
            </div>
          );
        }

        return (
          <ChatMessageRow
            key={msg.id}
            msg={msg}
            activeGroup={activeGroup}
            activeInfo={activeInfo}
            myEmail={myEmail}
            myName={myName}
            currentUser={currentUser}
            handleOpenUserProfile={handleOpenUserProfile}
            {...rowProps}
          />
        );
      })}
      <div ref={chatEndRef} />
    </div>
  );
};
