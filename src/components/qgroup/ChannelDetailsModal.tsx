import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Hash,
  User,
  Users,
  FileText,
  Info,
  Trash2,
  UserMinus,
  Lock,
  ShieldCheck,
  Globe,
  LogOut,
  Clock,
  Check,
  BookOpen,
} from 'lucide-react';
import { QGroup } from '../../types';
import { resolveChatDisplayInfo } from '../QGroupScreen';
import { apiClient } from '../../services/apiClient';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api/v1';

export interface ChannelDetailsModalProps {
  group: QGroup;
  myEmail: string;
  activeTab: 'about' | 'members' | 'files';
  onTabChange: (t: 'about' | 'members' | 'files') => void;
  inviteEmail: string;
  onInviteEmailChange: (v: string) => void;
  onInvite: () => void;
  onClose: () => void;
  onLeaveGroup: () => void;
  onDeleteChat?: () => void;
  onUnfriend?: (email: string, name?: string) => void;
  onKickMember?: (email: string, name: string) => void;
  onRespondJoinRequest?: (requestId: string, email: string, action: 'approve' | 'reject') => void;
}

export const ChannelDetailsModal: React.FC<ChannelDetailsModalProps> = ({
  group,
  myEmail,
  activeTab,
  onTabChange,
  inviteEmail,
  onInviteEmailChange: _onInviteEmailChange,
  onInvite: _onInvite,
  onClose,
  onLeaveGroup,
  onDeleteChat,
  onUnfriend,
  onKickMember,
  onRespondJoinRequest,
}) => {
  const isDirect = Boolean(group.isDirect || group.type === 'direct');
  const dmInfo = resolveChatDisplayInfo(group, myEmail);
  const isOwner = (group.ownerEmail || '').toLowerCase() === myEmail.toLowerCase();
  const members = group.members || [];
  const pendingRequests = group.pendingRequests || [];

  // Extract shared files from messages
  const sharedFiles = useMemo(() => {
    const list: any[] = [];
    (group.messages || []).forEach((m) => {
      if (m.attachment) {
        list.push({ ...m.attachment, sentAt: m.timestamp, senderName: m.senderName });
      }
    });
    return list;
  }, [group.messages]);

  const [_modalLookupStatus, setModalLookupStatus] = useState<'idle' | 'searching' | 'found' | 'not_found'>('idle');
  const [_modalLookedUpUser, setModalLookedUpUser] = useState<any>(null);

  useEffect(() => {
    const clean = inviteEmail.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!clean || !emailRegex.test(clean)) {
      setModalLookupStatus('idle');
      setModalLookedUpUser(null);
      return;
    }
    const timer = setTimeout(async () => {
      setModalLookupStatus('searching');
      try {
        const res = await apiClient.fetch(
          `${API_BASE}/auth/users/lookup?email=${encodeURIComponent(clean)}`
        );
        if (res.ok) {
          const data = await res.json();
          if (data.exists && data.user) {
            setModalLookedUpUser(data.user);
            setModalLookupStatus('found');
            return;
          }
        }
      } catch {}

      const localRegistered: Record<
        string,
        { fullName: string; academicTitle: string; department: string }
      > = {
        'mr.av1222005@gmail.com': {
          fullName: 'Mr. AV',
          academicTitle: 'ThS.',
          department: 'Khoa Công nghệ Thông tin',
        },
        'avanimechannel@gmail.com': {
          fullName: 'Vũ Anh',
          academicTitle: 'ThS.',
          department: 'Khoa Công nghệ Thông tin',
        },
        'hieuhieu22112005@gmail.com': {
          fullName: 'Hieu Huynh',
          academicTitle: 'ThS.',
          department: 'Khoa Công nghệ Thông tin',
        },
        'daipqps37469@gmail.com': {
          fullName: 'Đại Phạm Quang',
          academicTitle: 'ThS.',
          department: 'Khoa Công nghệ Thông tin',
        },
        'vuha3608@ut.edu.vn': {
          fullName: 'Vũ Hồ Anh',
          academicTitle: 'ThS.',
          department: 'Khoa Công nghệ Thông tin',
        },
        'nguyentann0804@gmail.com': {
          fullName: 'Nguyễn Văn Tân',
          academicTitle: 'TS.',
          department: 'Khoa Công nghệ Thông tin',
        },
        'quizgen.ai.team@gmail.com': {
          fullName: 'Ban Quản trị QuizGen AI',
          academicTitle: 'Admin',
          department: 'Hệ thống Khảo thí UTH',
        },
        'hod.cntt@uth.edu.vn': {
          fullName: 'PGS. TS. Trưởng Khoa CNTT',
          academicTitle: 'PGS. TS.',
          department: 'Khoa Công nghệ Thông tin',
        },
        'gv.kinhte@uth.edu.vn': {
          fullName: 'TS. Giảng viên Kinh tế',
          academicTitle: 'TS.',
          department: 'Khoa Kinh tế Vận tải',
        },
      };
      if (localRegistered[clean]) {
        setModalLookedUpUser({ email: clean, ...localRegistered[clean] });
        setModalLookupStatus('found');
        return;
      }
      setModalLookedUpUser(null);
      setModalLookupStatus('not_found');
    }, 300);

    return () => clearTimeout(timer);
  }, [inviteEmail]);

  const joinPolicyLabel = {
    open: 'Công khai (Mọi giảng viên đều có thể tham gia)',
    approval_required: 'Cần phê duyệt (Yêu cầu Trưởng nhóm duyệt trước)',
    invite_only: 'Riêng tư (Chỉ khi được mời trực tiếp)',
  }[group.joinPolicy as 'open' | 'approval_required' | 'invite_only'] || 'Công khai';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-slate-900/50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header (Clean Slack Header) */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-sm">
              {isDirect ? dmInfo.avatarInitials : <Hash className="w-5 h-5 text-slate-700" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1">
                  <span>{isDirect ? `Thông tin: ${dmInfo.displayName}` : `Chi tiết kênh #${group.name}`}</span>
                </h3>
                {isOwner && !isDirect && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-200 text-slate-700 border border-slate-300">
                    Trưởng nhóm
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                {isDirect ? (
                  <span className="text-emerald-600 font-medium font-sans">Đồng nghiệp • Tin nhắn trực tiếp 1-1</span>
                ) : (
                  <>Mã: <strong className="text-slate-800">{group.code}</strong> • {joinPolicyLabel}</>
                )}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-white hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center cursor-pointer border border-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Slack Minimal Underline Tabs */}
        <div className="flex items-center gap-4 px-5 pt-1 border-b border-slate-200 bg-white">
          {(isDirect
            ? [
                { id: 'about' as const, label: 'Thông tin đồng nghiệp', icon: User },
                { id: 'files' as const, label: `Tệp & Học liệu (${sharedFiles.length})`, icon: FileText },
              ]
            : [
                { id: 'about' as const, label: 'Giới thiệu', icon: Info },
                {
                  id: 'members' as const,
                  label: `Thành viên (${members.length})`,
                  icon: Users,
                  badge: isOwner && pendingRequests.length > 0 ? pendingRequests.length : undefined,
                },
                { id: 'files' as const, label: `Tệp & Học liệu (${sharedFiles.length})`, icon: FileText },
              ]
          ).map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                className={`pb-2.5 pt-2 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer relative ${
                  activeTab === tab.id
                    ? 'border-slate-900 text-slate-900 font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {/* TAB 1: ABOUT */}
          {activeTab === 'about' && (
            isDirect ? (
              <div className="space-y-4">
                {/* 1-1 Partner Card */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-teal-50/30 border border-slate-200 space-y-3">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white font-bold text-base flex items-center justify-center shrink-0 shadow-xs">
                      {dmInfo.avatarInitials}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-slate-900 truncate">{dmInfo.displayName}</h4>
                      <p className="text-xs text-slate-500 truncate">{dmInfo.partnerEmail}</p>
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 mt-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                        Đang kết nối bạn bè 1-1
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="font-semibold text-slate-500 uppercase text-[10px] tracking-wide">Trạng thái hội thoại</span>
                  <p className="text-slate-700 leading-relaxed font-normal">
                    Toàn bộ tin nhắn và tài liệu đính kèm giữa Thầy/Cô và đồng nghiệp được bảo mật và mã hóa hai chiều.
                  </p>
                </div>

                {/* Direct Message Actions */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={onDeleteChat}
                    className="w-full py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4 text-slate-500" />
                    <span>Xóa toàn bộ tin nhắn đoạn chat</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onUnfriend?.(dmInfo.partnerEmail || '', dmInfo.displayName)}
                    className="w-full py-2.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <UserMinus className="w-4 h-4 text-rose-600" />
                    <span>Hủy kết bạn với đồng nghiệp</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3.5">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="font-semibold text-slate-500 uppercase text-[10px] tracking-wide">Mục đích kênh</span>
                  <p className="text-slate-800 leading-relaxed font-normal">
                    {group.description || 'Không gian làm việc chung: trao đổi câu hỏi, chia sẻ giáo trình và thống nhất ma trận đề thi.'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] font-semibold text-slate-500 uppercase">Khoa / Bộ môn</span>
                    <p className="text-slate-900 font-bold mt-0.5">{group.department || 'Chung'}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] font-semibold text-slate-500 uppercase">Trưởng nhóm</span>
                    <p className="text-slate-900 font-bold mt-0.5 truncate">{group.ownerName || 'TS. Hồ Anh Vũ'}</p>
                  </div>
                </div>

                {/* Chế độ tham gia */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-semibold text-slate-500 uppercase">Chế độ tham gia</span>
                    <p className="text-slate-900 font-semibold mt-0.5">{joinPolicyLabel}</p>
                  </div>
                  {group.joinPolicy === 'invite_only' ? (
                    <Lock className="w-4 h-4 text-slate-600 shrink-0" />
                  ) : group.joinPolicy === 'approval_required' ? (
                    <ShieldCheck className="w-4 h-4 text-slate-600 shrink-0" />
                  ) : (
                    <Globe className="w-4 h-4 text-slate-600 shrink-0" />
                  )}
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 space-y-2">
                  <span className="font-semibold text-slate-700">Mã liên kết phòng học thuật</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={group.code}
                      className="flex-1 px-3 py-2 bg-slate-100 rounded-lg font-mono text-slate-800 font-bold outline-none border border-slate-200"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(group.code);
                      }}
                      className="px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold cursor-pointer transition-colors"
                    >
                      Sao chép
                    </button>
                  </div>
                  {group.joinPolicy === 'invite_only' && (
                    <p className="text-[11px] text-amber-700">
                      * Nhóm đang ở chế độ Riêng tư: người ngoài cần có thư mời trực tiếp qua email để tham gia.
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={onLeaveGroup}
                  className="w-full py-2.5 rounded-lg border border-slate-300 hover:bg-rose-50 hover:border-rose-300 text-slate-700 hover:text-rose-700 font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Rời khỏi kênh này</span>
                </button>
              </div>
            )
          )}

          {/* TAB 2: MEMBERS */}
          {activeTab === 'members' && (
            <div className="space-y-4">
              {/* Khối yêu cầu phê duyệt tham gia (Chỉ Trưởng nhóm thấy) */}
              {isOwner && pendingRequests.length > 0 && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-300 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-600" />
                      <span>Yêu cầu xin gia nhập ({pendingRequests.length})</span>
                    </span>
                    <span className="text-[10px] text-slate-600 font-semibold">Chờ duyệt</span>
                  </div>

                  <div className="space-y-1.5">
                    {pendingRequests.map((req) => (
                      <div
                        key={req.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200 gap-2"
                      >
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 truncate">
                            {req.name || req.email}
                          </p>
                          <p className="text-[10px] text-slate-500 truncate">
                            {req.email} • {req.requestedAt}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => onRespondJoinRequest?.(req.id, req.email, 'approve')}
                            className="px-2.5 py-1 rounded-md bg-slate-900 hover:bg-slate-800 text-white font-semibold text-[11px] flex items-center gap-1 cursor-pointer"
                          >
                            <Check className="w-3 h-3" />
                            <span>Duyệt</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onRespondJoinRequest?.(req.id, req.email, 'reject')}
                            className="px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] flex items-center gap-1 cursor-pointer border border-slate-200"
                          >
                            <X className="w-3 h-3" />
                            <span>Từ chối</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Danh sách thành viên */}
              <div className="space-y-2">
                <span className="font-semibold text-slate-700 text-xs block">
                  Thành viên trong kênh ({members.length})
                </span>
                <div className="space-y-1.5 max-h-56 overflow-y-auto">
                  {members.map((memEmail, idx) => {
                    const isMemOwner = (group.ownerEmail || '').toLowerCase() === memEmail.toLowerCase();
                    const isSelf = memEmail.toLowerCase() === myEmail.toLowerCase();
                    return (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200 gap-2"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0">
                            {memEmail.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="font-semibold text-slate-800 truncate">{memEmail}</p>
                              {isMemOwner && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-200 text-slate-700">
                                  Trưởng nhóm
                                </span>
                              )}
                              {isSelf && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-medium bg-emerald-100 text-emerald-800">
                                  Bạn
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Kick Member Action (Trưởng nhóm kick thành viên khác) */}
                        {isOwner && !isMemOwner && !isSelf && onKickMember && (
                          <button
                            type="button"
                            onClick={() => onKickMember(memEmail, memEmail)}
                            className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
                            title="Xóa thành viên khỏi nhóm"
                          >
                            <UserMinus className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SHARED FILES */}
          {activeTab === 'files' && (
            <div className="space-y-2">
              <span className="font-semibold text-slate-700 text-xs block">
                Tài liệu &amp; Học liệu đã đính kèm ({sharedFiles.length})
              </span>
              {sharedFiles.length === 0 ? (
                <div className="p-8 text-center text-slate-400 space-y-1">
                  <FileText className="w-8 h-8 mx-auto text-slate-300" />
                  <p className="font-semibold text-slate-600">Chưa có tệp nào được gửi</p>
                  <p className="text-[11px]">Dùng biểu tượng ghim ở thanh soạn thảo để đính kèm giáo trình chia sẻ cho nhóm.</p>
                </div>
              ) : (
                sharedFiles.map((file, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl border border-slate-200 bg-white flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 border border-slate-200">
                        <BookOpen className="w-4 h-4 text-teal-700" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-800 truncate">{file.name}</p>
                        <p className="text-[10px] text-slate-500">
                          {file.totalPages} trang • Gửi bởi {file.senderName} ({file.sentAt})
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => alert(`Đã kích hoạt giáo trình ${file.name} để sinh đề trắc nghiệm!`)}
                      className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-[11px] shrink-0 cursor-pointer"
                    >
                      Sinh Đề
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
