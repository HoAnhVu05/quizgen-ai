import React, { useState } from 'react';
import {
  Settings, X, Edit3, Users, Shield, UserCheck, AlertCircle,
  Check, UserPlus, MessageSquare, UserX, LogOut, Trash2
} from 'lucide-react';
import { QGroup } from './types';
import { UserProfile } from '../../types';

interface QGroupOwnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeGroup: QGroup | null;
  currentUser?: UserProfile | null;
  ownerSettingsTab: 'info' | 'members' | 'policy' | 'requests' | 'danger';
  setOwnerSettingsTab: (tab: 'info' | 'members' | 'policy' | 'requests' | 'danger') => void;
  editGroupName: string;
  setEditGroupName: (v: string) => void;
  editGroupDept: string;
  setEditGroupDept: (v: string) => void;
  editGroupDesc: string;
  setEditGroupDesc: (v: string) => void;
  newMemberEmailInput: string;
  setNewMemberEmailInput: (v: string) => void;
  onSaveGroupInfo: (e: React.FormEvent) => void;
  onAddDirectMember: (e: React.FormEvent) => void;
  onStartDirectMessage: (email: string) => void;
  onTransferOwner: (email: string) => void;
  onKickMember: (email: string) => void;
  onUpdatePolicy: (groupId: string, policy: 'open' | 'approval_required' | 'email_only') => void;
  onApproveRequest: (groupId: string, reqId: string) => void;
  onRejectRequest: (groupId: string, reqId: string) => void;
  onLeaveGroup: () => void;
  onDeleteGroup: () => void;
}

export const QGroupOwnerModal: React.FC<QGroupOwnerModalProps> = ({
  isOpen, onClose, activeGroup, currentUser,
  ownerSettingsTab, setOwnerSettingsTab,
  editGroupName, setEditGroupName, editGroupDept, setEditGroupDept,
  editGroupDesc, setEditGroupDesc, newMemberEmailInput, setNewMemberEmailInput,
  onSaveGroupInfo, onAddDirectMember, onStartDirectMessage,
  onTransferOwner, onKickMember, onUpdatePolicy,
  onApproveRequest, onRejectRequest, onLeaveGroup, onDeleteGroup
}) => {
  const [isConfirmDeleteGroupOpen, setIsConfirmDeleteGroupOpen] = useState(false);

  if (!isOpen || !activeGroup) return null;

  const isOwner = activeGroup.ownerEmail === currentUser?.email;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-purple-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm">Quản Lý Q-Group: {activeGroup.name}</h3>
              <p className="text-[11px] text-purple-700 font-mono">
                Mã phòng: {activeGroup.code} • Trưởng nhóm: {activeGroup.ownerName}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sub-tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50/50 px-4 pt-2 gap-1.5 text-xs font-bold overflow-x-auto">
          {[
            { id: 'info', icon: Edit3, label: 'Thông Tin Nhóm' },
            { id: 'members', icon: Users, label: `Thành Viên (${activeGroup.members.length})` },
            { id: 'policy', icon: Shield, label: 'Chính Sách Vào Phòng' },
            { id: 'requests', icon: UserCheck, label: 'Chờ Duyệt', badge: (activeGroup.pendingRequests || []).length },
            { id: 'danger', icon: AlertCircle, label: 'Rời / Xóa Nhóm', danger: true },
          ].map((t) => {
            const Icon = t.icon;
            const active = ownerSettingsTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setOwnerSettingsTab(t.id as any)}
                className={`pb-2.5 px-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  active
                    ? t.danger ? 'border-rose-600 text-rose-700' : 'border-purple-600 text-purple-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{t.label}</span>
                {t.badge ? (
                  <span className="w-4 h-4 rounded-full bg-rose-600 text-white text-[9px] flex items-center justify-center font-bold">
                    {t.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
          {ownerSettingsTab === 'info' && (
            <form onSubmit={onSaveGroupInfo} className="space-y-4">
              <div>
                <label className="font-bold text-slate-700 block mb-1.5">Tên Q-Group:</label>
                <input
                  type="text" required disabled={!isOwner} value={editGroupName}
                  onChange={(e) => setEditGroupName(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 disabled:bg-slate-100 border border-slate-200 rounded-xl focus:outline-none focus:border-purple-600 text-slate-900"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1.5">Khoa / Ban Chuyên Ngành:</label>
                <input
                  type="text" disabled={!isOwner} value={editGroupDept}
                  onChange={(e) => setEditGroupDept(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 disabled:bg-slate-100 border border-slate-200 rounded-xl focus:outline-none focus:border-purple-600 text-slate-900"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1.5">Mô Tả &amp; Mục Đích Nhóm:</label>
                <textarea
                  rows={3} disabled={!isOwner} value={editGroupDesc}
                  onChange={(e) => setEditGroupDesc(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 disabled:bg-slate-100 border border-slate-200 rounded-xl focus:outline-none focus:border-purple-600 text-slate-900 resize-none"
                />
              </div>
              {isOwner ? (
                <div className="pt-2 flex justify-end">
                  <button type="submit" className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold transition-all cursor-pointer shadow-xs flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5" />
                    <span>Lưu Thay Đổi Thông Tin</span>
                  </button>
                </div>
              ) : (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-[11px]">
                  ℹ️ Chỉ Trưởng nhóm ({activeGroup.ownerName}) mới có quyền chỉnh sửa thông tin nhóm.
                </div>
              )}
            </form>
          )}

          {ownerSettingsTab === 'members' && (
            <div className="space-y-4">
              {isOwner && (
                <form onSubmit={onAddDirectMember} className="flex gap-2">
                  <input
                    type="email" required value={newMemberEmailInput}
                    onChange={(e) => setNewMemberEmailInput(e.target.value)}
                    placeholder="Nhập email đồng nghiệp cần thêm (vd: gv@ut.edu.vn)..."
                    className="flex-1 px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-purple-600"
                  />
                  <button type="submit" className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold transition-all cursor-pointer shadow-xs shrink-0 flex items-center gap-1">
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Thêm Vào Nhóm</span>
                  </button>
                </form>
              )}
              <div className="space-y-2 pt-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Danh Sách Thành Viên ({activeGroup.members.length}):
                </span>
                {activeGroup.members.map((email, idx) => {
                  const isMemberOwner = email === activeGroup.ownerEmail;
                  return (
                    <div key={idx} className="p-3 bg-slate-50/80 rounded-2xl border border-slate-200 flex items-center justify-between text-xs gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                          {email.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <span className="font-mono text-slate-800 font-semibold block truncate">{email}</span>
                          <span className="text-[10px] text-slate-400">{isMemberOwner ? 'Trưởng nhóm' : 'Thành viên'}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {email !== (currentUser?.email || '').toLowerCase() && (
                          <button type="button" onClick={() => onStartDirectMessage(email)} className="px-2 py-1 bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg text-[10px] font-bold transition-colors cursor-pointer flex items-center gap-1">
                            <MessageSquare className="w-2.5 h-2.5" />
                            <span>Nhắn riêng</span>
                          </button>
                        )}
                        {isMemberOwner ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[9px] font-extrabold bg-purple-100 text-purple-800 border border-purple-200">Trưởng nhóm</span>
                        ) : (
                          <>
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-200 text-slate-600">Thành viên</span>
                            {isOwner && (
                              <>
                                <button type="button" onClick={() => onTransferOwner(email)} className="px-2 py-1 bg-white hover:bg-purple-50 text-purple-700 border border-purple-200 rounded-lg text-[10px] font-bold transition-colors cursor-pointer">
                                  Nhượng quyền
                                </button>
                                <button type="button" onClick={() => onKickMember(email)} className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer">
                                  <UserX className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {ownerSettingsTab === 'policy' && (
            <div className="space-y-4">
              <div className="text-slate-600 text-xs">Thiết lập cách thức đồng nghiệp tham gia vào nhóm:</div>
              <div className="space-y-2.5">
                {[
                  { id: 'open', title: '🟢 Tự Do Gia Nhập Qua Mã (Open)', desc: `Bất kỳ ai nhập đúng mã nhóm ${activeGroup.code} đều được vào ngay.` },
                  { id: 'approval_required', title: '🟡 Cần Trưởng Nhóm Phê Duyệt (Approval Required)', desc: 'Đồng nghiệp nhập mã sẽ vào trạng thái Chờ Duyệt.' },
                  { id: 'email_only', title: '🔒 Khóa Mã - Chỉ Mời Đích Danh Qua Email (Email Only)', desc: 'Chỉ những ai được Trưởng nhóm thêm trực tiếp qua Email mới vào được.' }
                ].map((opt) => (
                  <label
                    key={opt.id}
                    onClick={() => isOwner && onUpdatePolicy(activeGroup.id, opt.id as any)}
                    className={`p-3.5 rounded-2xl border flex items-start gap-3 transition-all ${!isOwner ? 'opacity-80 cursor-not-allowed' : 'cursor-pointer'} ${
                      activeGroup.joinPolicy === opt.id ? 'bg-purple-50/80 border-purple-400 shadow-xs' : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <input type="radio" name="joinPolicy" disabled={!isOwner} checked={activeGroup.joinPolicy === opt.id} onChange={() => isOwner && onUpdatePolicy(activeGroup.id, opt.id as any)} className="mt-1 text-purple-600" />
                    <div>
                      <strong className="text-slate-900 block text-xs">{opt.title}</strong>
                      <span className="text-[11px] text-slate-500 leading-snug block mt-0.5">{opt.desc}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {ownerSettingsTab === 'requests' && (
            <div className="space-y-3">
              <div className="text-slate-500 text-[11px]">Giảng viên nhập mã phòng khi nhóm ở chế độ <strong>"Cần duyệt"</strong> sẽ xuất hiện tại đây.</div>
              {(activeGroup.pendingRequests || []).length === 0 ? (
                <div className="py-8 text-center text-slate-400 border border-dashed border-slate-200 rounded-2xl">
                  <UserCheck className="w-7 h-7 mx-auto mb-2 text-slate-300" />
                  Không có yêu cầu nào đang chờ phê duyệt.
                </div>
              ) : (
                (activeGroup.pendingRequests || []).map((req) => (
                  <div key={req.id} className="p-3 bg-white rounded-2xl border border-slate-200 flex items-center justify-between gap-3 shadow-2xs">
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 text-xs">{req.name}</div>
                      <div className="text-[11px] text-purple-700 font-mono">{req.email}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Yêu cầu lúc: {req.requestedAt}</div>
                    </div>
                    {isOwner ? (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button type="button" onClick={() => onRejectRequest(activeGroup.id, req.id)} className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-rose-600 hover:bg-rose-50 font-bold transition-colors cursor-pointer">
                          Từ Chối
                        </button>
                        <button type="button" onClick={() => onApproveRequest(activeGroup.id, req.id)} className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold transition-colors cursor-pointer shadow-xs flex items-center gap-1">
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>Duyệt Cho Vào</span>
                        </button>
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-semibold">Chờ Trưởng nhóm duyệt</span>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {ownerSettingsTab === 'danger' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-2">
                <div className="flex items-center gap-2 text-slate-900 font-bold">
                  <LogOut className="w-4 h-4 text-slate-600" />
                  <span>Rời Khỏi Nhóm Này</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">Thầy/Cô sẽ không còn nhận được tin nhắn trao đổi và học liệu trong nhóm này nữa.</p>
                <button type="button" onClick={onLeaveGroup} className="px-3.5 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors cursor-pointer flex items-center gap-1.5">
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Rời Khỏi Q-Group</span>
                </button>
              </div>
              {isOwner && (
                <div className="p-4 rounded-2xl border-2 border-rose-200 bg-rose-50/60 space-y-3">
                  <div className="flex items-center gap-2 text-rose-800 font-extrabold">
                    <Trash2 className="w-4 h-4 text-rose-600" />
                    <span>Giải Tán &amp; Xóa Vĩnh Viễn Q-Group</span>
                  </div>
                  <p className="text-[11px] text-rose-700 leading-relaxed">Hành động này sẽ xóa toàn bộ lịch sử trao đổi và không thể khôi phục!</p>
                  {isConfirmDeleteGroupOpen ? (
                    <div className="p-3 bg-white rounded-xl border border-rose-300 space-y-2">
                      <p className="font-bold text-rose-900 text-xs">Thầy/Cô có chắc chắn muốn giải tán nhóm "{activeGroup.name}"?</p>
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={onDeleteGroup} className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-colors cursor-pointer shadow-xs">
                          Xác Nhận Giải Tán
                        </button>
                        <button type="button" onClick={() => setIsConfirmDeleteGroupOpen(false)} className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 font-semibold text-xs transition-colors cursor-pointer">
                          Hủy Bỏ
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button type="button" onClick={() => setIsConfirmDeleteGroupOpen(true)} className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-colors cursor-pointer shadow-xs flex items-center gap-1.5">
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Giải Tán &amp; Xóa Nhóm</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors cursor-pointer">
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
