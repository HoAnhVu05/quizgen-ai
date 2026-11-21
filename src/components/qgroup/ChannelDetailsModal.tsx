import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Hash,
  User,
  Users,
  Trash2,
  UserMinus,
  Lock,
  ShieldCheck,
  Globe,
  LogOut,
  Clock,
  Check,
  Settings,
  Copy,
  Save,
  CheckCircle2,
  UserPlus,
} from 'lucide-react';
import { QGroup } from '../../types';
import { resolveChatDisplayInfo } from './chatUtils';
import { apiClient } from '../../services/apiClient';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api/v1';

export interface ChannelDetailsModalProps {
  group: QGroup;
  myEmail: string;
  activeTab: 'about' | 'members';
  onTabChange: (t: 'about' | 'members') => void;
  inviteEmail: string;
  onInviteEmailChange: (v: string) => void;
  onInvite: () => void;
  onClose: () => void;
  onLeaveGroup: () => void;
  onDeleteChat?: () => void;
  onUnfriend?: (email: string, name?: string) => void;
  onKickMember?: (email: string, name: string) => void;
  onRespondJoinRequest?: (requestId: string, email: string, action: 'approve' | 'reject') => void;
  onOpenProfile?: (email: string, name?: string) => void;
  onTransferOwnershipToMember?: (email: string) => void;
  onSaveSettings?: (name: string, department: string, description: string, joinPolicy: 'open' | 'approval_required' | 'invite_only') => void;
  onDisbandGroup?: () => void;
}

export const ChannelDetailsModal: React.FC<ChannelDetailsModalProps> = ({
  group,
  myEmail,
  activeTab,
  onTabChange,
  inviteEmail,
  onInviteEmailChange,
  onInvite,
  onClose,
  onLeaveGroup,
  onDeleteChat,
  onUnfriend,
  onKickMember,
  onRespondJoinRequest,
  onOpenProfile,
  onTransferOwnershipToMember,
  onSaveSettings,
  onDisbandGroup,
}) => {
  const isDirect = Boolean(group.isDirect || group.type === 'direct');
  const dmInfo = resolveChatDisplayInfo(group, myEmail);
  const isOwner = (group.ownerEmail || '').toLowerCase() === myEmail.toLowerCase();
  const pendingRequests = group.pendingRequests || [];

  // Danh sách thành viên quản lý nội bộ để cập nhật tức thì (0ms) khi bấm kick
  const [membersList, setMembersList] = useState<string[]>(group.members || []);
  useEffect(() => {
    setMembersList(group.members || []);
  }, [group.members]);

  // Trạng thái chỉnh sửa cấu hình kênh (dành cho Trưởng nhóm)
  const [editName, setEditName] = useState(group.name || '');
  const [editDept, setEditDept] = useState(group.department || '');
  const [editDesc, setEditDesc] = useState(group.description || '');
  const [editJoinPolicy, setEditJoinPolicy] = useState<'open' | 'approval_required' | 'invite_only'>(
    (group.joinPolicy as any) || 'open'
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [modalLookupStatus, setModalLookupStatus] = useState<'idle' | 'searching' | 'found' | 'not_found'>('idle');
  const [modalLookedUpUser, setModalLookedUpUser] = useState<any>(null);

  const localRegistered: Record<
    string,
    { fullName: string; academicTitle: string; department: string }
  > = useMemo(() => ({
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
  }), []);

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

      if (localRegistered[clean]) {
        setModalLookedUpUser({ email: clean, ...localRegistered[clean] });
        setModalLookupStatus('found');
        return;
      }
      setModalLookedUpUser(null);
      setModalLookupStatus('not_found');
    }, 300);

    return () => clearTimeout(timer);
  }, [inviteEmail, localRegistered]);

  const handleSaveChannelSettings = async () => {
    if (!editName.trim() || !onSaveSettings) return;
    setIsSaving(true);
    try {
      await onSaveSettings(editName.trim(), editDept.trim(), editDesc.trim(), editJoinPolicy);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch {
    } finally {
      setIsSaving(false);
    }
  };

  const handleKick = (memEmail: string, displayName: string) => {
    // Biến mất khỏi giao diện ngay tức khắc (0ms optimistic UI update)
    setMembersList((prev) => prev.filter((m) => m.toLowerCase() !== memEmail.toLowerCase()));
    onKickMember?.(memEmail, displayName);
  };

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
        className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[88vh] animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-sm">
              {isDirect ? dmInfo.avatarInitials : <Hash className="w-5 h-5 text-slate-700" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1">
                  <span>{isDirect ? `Thông tin: ${dmInfo.displayName}` : `Chi tiết & Cài đặt kênh #${group.name}`}</span>
                </h3>
                {isOwner && !isDirect && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
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

        {/* Tabs: Chỉ giữ 2 tab chuẩn mực (Thông tin & Cài đặt, Thành viên) */}
        <div className="flex items-center gap-4 px-5 pt-1 border-b border-slate-200 bg-white">
          {(isDirect
            ? [
                { id: 'about' as const, label: 'Thông tin đồng nghiệp', icon: User },
              ]
            : [
                { id: 'about' as const, label: 'Thông tin & Cài đặt', icon: Settings },
                {
                  id: 'members' as const,
                  label: `Thành viên (${membersList.length})`,
                  icon: Users,
                  badge: isOwner && pendingRequests.length > 0 ? pendingRequests.length : undefined,
                },
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
          {/* TAB 1: ABOUT & SETTINGS */}
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
                  {onDeleteChat && (
                    <button
                      type="button"
                      onClick={onDeleteChat}
                      className="w-full py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4 text-slate-500" />
                      <span>Xóa toàn bộ tin nhắn đoạn chat</span>
                    </button>
                  )}
                  {onUnfriend && (
                    <button
                      type="button"
                      onClick={() => onUnfriend(dmInfo.partnerEmail || '', dmInfo.displayName)}
                      className="w-full py-2.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      <UserMinus className="w-4 h-4 text-rose-600" />
                      <span>Hủy kết bạn với đồng nghiệp</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* FORM THÔNG TIN & CẤU HÌNH KÊNH */}
                <div className="space-y-3 bg-slate-50/60 p-4 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="font-bold text-slate-800 flex items-center gap-1.5">
                      <Settings className="w-3.5 h-3.5 text-slate-600" />
                      <span>Thông tin kênh học thuật</span>
                    </span>
                    {!isOwner && (
                      <span className="text-[10px] text-slate-500 italic">Chế độ chỉ xem</span>
                    )}
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Tên kênh học thuật</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      disabled={!isOwner}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg outline-none focus:border-slate-900 text-xs disabled:opacity-60 font-medium text-slate-800"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Khoa / Bộ môn</label>
                      <input
                        type="text"
                        value={editDept}
                        onChange={(e) => setEditDept(e.target.value)}
                        disabled={!isOwner}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg outline-none focus:border-slate-900 text-xs disabled:opacity-60 text-slate-800"
                        placeholder="Chung"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Trưởng nhóm</label>
                      <input
                        type="text"
                        readOnly
                        value={group.ownerName || group.ownerEmail || 'Hồ Anh Vũ'}
                        className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Mục đích & Nội dung hoạt động</label>
                    <textarea
                      rows={2}
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                      disabled={!isOwner}
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-lg outline-none focus:border-slate-900 resize-none text-xs disabled:opacity-60 leading-relaxed text-slate-800"
                      placeholder="Trao đổi câu hỏi, chia sẻ giáo trình và ma trận đề thi..."
                    />
                  </div>

                  {/* Chế độ phê duyệt */}
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Chế độ tham gia</label>
                    {isOwner ? (
                      <select
                        value={editJoinPolicy}
                        onChange={(e) => setEditJoinPolicy(e.target.value as any)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg outline-none focus:border-slate-900 text-xs text-slate-800 font-medium"
                      >
                        <option value="open">Công khai (Mọi giảng viên đều có thể tham gia)</option>
                        <option value="approval_required">Cần phê duyệt (Yêu cầu Trưởng nhóm duyệt trước)</option>
                        <option value="invite_only">Riêng tư (Chỉ khi được mời trực tiếp)</option>
                      </select>
                    ) : (
                      <div className="p-2.5 bg-white rounded-lg border border-slate-200 flex items-center justify-between text-slate-800 font-medium">
                        <span>{joinPolicyLabel}</span>
                        {group.joinPolicy === 'invite_only' ? (
                          <Lock className="w-4 h-4 text-slate-500" />
                        ) : group.joinPolicy === 'approval_required' ? (
                          <ShieldCheck className="w-4 h-4 text-slate-500" />
                        ) : (
                          <Globe className="w-4 h-4 text-slate-500" />
                        )}
                      </div>
                    )}
                  </div>

                  {/* Nút lưu cấu hình nếu là Trưởng nhóm */}
                  {isOwner && (
                    <div className="pt-1 flex items-center justify-between">
                      {saveSuccess ? (
                        <span className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Đã lưu thành công!</span>
                        </span>
                      ) : <span />}
                      <button
                        type="button"
                        onClick={handleSaveChannelSettings}
                        disabled={isSaving || !editName.trim()}
                        className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>{isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Mã liên kết kênh */}
                <div className="p-3.5 rounded-xl border border-slate-200 space-y-2 bg-white">
                  <span className="font-semibold text-slate-700 block">Mã liên kết phòng học thuật</span>
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
                      className="px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold cursor-pointer transition-colors flex items-center gap-1"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Sao chép</span>
                    </button>
                  </div>
                </div>

                {/* Tác vụ Rời nhóm / Giải tán nhóm */}
                <div className="pt-2 border-t border-slate-200 space-y-2">
                  {isOwner ? (
                    onDisbandGroup && (
                      <button
                        type="button"
                        onClick={onDisbandGroup}
                        className="w-full py-2.5 rounded-xl border border-rose-200 bg-rose-50/60 hover:bg-rose-100 text-rose-700 font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4 text-rose-600" />
                        <span>Giải tán nhóm vĩnh viễn</span>
                      </button>
                    )
                  ) : (
                    <button
                      type="button"
                      onClick={onLeaveGroup}
                      className="w-full py-2.5 rounded-xl border border-slate-300 hover:bg-rose-50 hover:border-rose-300 text-slate-700 hover:text-rose-700 font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Rời khỏi kênh này</span>
                    </button>
                  )}
                </div>
              </div>
            )
          )}

          {/* TAB 2: MEMBERS & MANAGEMENT */}
          {activeTab === 'members' && (
            <div className="space-y-4">
              {/* Thêm / Mời thành viên */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <span className="font-semibold text-slate-700 block">Mời đồng nghiệp vào kênh</span>
                <div className="flex items-center gap-2">
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => onInviteEmailChange(e.target.value)}
                    placeholder="Nhập email giảng viên (@gmail.com, @ut.edu.vn)..."
                    className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-lg outline-none focus:border-slate-900 text-xs"
                  />
                  <button
                    type="button"
                    onClick={onInvite}
                    disabled={!inviteEmail.trim()}
                    className="px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Mời</span>
                  </button>
                </div>
                {modalLookupStatus === 'found' && modalLookedUpUser && (
                  <p className="text-[11px] text-emerald-700 font-medium">
                    ✓ Tìm thấy: <strong>{modalLookedUpUser.fullName}</strong> ({modalLookedUpUser.academicTitle} - {modalLookedUpUser.department})
                  </p>
                )}
              </div>

              {/* Khối yêu cầu phê duyệt tham gia (Chỉ Trưởng nhóm thấy) */}
              {isOwner && pendingRequests.length > 0 && (
                <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-300 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wide flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-700" />
                      <span>Yêu cầu xin gia nhập ({pendingRequests.length})</span>
                    </span>
                    <span className="text-[10px] text-amber-800 font-semibold">Chờ duyệt</span>
                  </div>

                  <div className="space-y-1.5">
                    {pendingRequests.map((req) => (
                      <div
                        key={req.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-white border border-amber-200 gap-2"
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
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-700 text-xs">
                    Danh sách thành viên ({membersList.length})
                  </span>
                  <span className="text-[10.5px] text-slate-400">
                    Bấm vào tên để xem hồ sơ cá nhân
                  </span>
                </div>

                <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                  {membersList.map((memEmail, idx) => {
                    const isMemOwner = (group.ownerEmail || '').toLowerCase() === memEmail.toLowerCase();
                    const isSelf = memEmail.toLowerCase() === myEmail.toLowerCase();
                    const info = localRegistered[memEmail.toLowerCase()];
                    const displayName = info?.fullName || memEmail.split('@')[0];
                    const subtitle = info ? `${info.academicTitle || ''} • ${info.department || ''}`.trim() : memEmail;

                    return (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200 hover:border-slate-300 transition-all gap-2 group"
                      >
                        {/* Member Identity & Profile Trigger */}
                        <div
                          className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer"
                          onClick={() => onOpenProfile?.(memEmail, displayName)}
                          title="Bấm để xem thông tin cá nhân của giảng viên"
                        >
                          <div className="w-8 h-8 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0 group-hover:bg-slate-900 group-hover:text-white transition-colors">
                            {memEmail.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="font-semibold text-slate-900 truncate group-hover:text-teal-700 transition-colors">
                                {displayName}
                              </p>
                              {isMemOwner && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-200 shrink-0">
                                  Trưởng nhóm
                                </span>
                              )}
                              {isSelf && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
                                  Bạn
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-500 truncate">{subtitle}</p>
                          </div>
                        </div>

                        {/* Admin Action Buttons on Members */}
                        {isOwner && !isMemOwner && !isSelf && (
                          <div className="flex items-center gap-1.5 shrink-0">
                            {onTransferOwnershipToMember && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onTransferOwnershipToMember(memEmail);
                                }}
                                className="px-2 py-1 rounded-md text-[10.5px] font-medium text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 flex items-center gap-1 transition-colors cursor-pointer"
                                title="Chỉ định thành viên này làm Trưởng nhóm mới"
                              >
                                <ShieldCheck className="w-3 h-3 text-amber-600" />
                                <span>Chuyển quyền</span>
                              </button>
                            )}

                            {onKickMember && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleKick(memEmail, displayName);
                                }}
                                className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                title="Mời thành viên ra khỏi nhóm"
                              >
                                <UserMinus className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
