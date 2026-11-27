import React from 'react';
import { MessageSquare, X, Send, Users, KeyRound } from 'lucide-react';
import { QGroup } from './types';
import { UserProfile } from '../../types';

interface QGroupActionModalsProps {
  qgroups: QGroup[];
  currentUser?: UserProfile | null;
  isNewDirectOpen: boolean;
  onCloseNewDirect: () => void;
  directPartnerInput: string;
  setDirectPartnerInput: (v: string) => void;
  onStartDirectMessage: (email: string) => void;

  isCreateGroupOpen: boolean;
  onCloseCreateGroup: () => void;
  newGroupName: string;
  setNewGroupName: (v: string) => void;
  newGroupDept: string;
  setNewGroupDept: (v: string) => void;
  newGroupDesc: string;
  setNewGroupDesc: (v: string) => void;
  newGroupPolicy: 'open' | 'approval_required' | 'email_only';
  setNewGroupPolicy: (v: 'open' | 'approval_required' | 'email_only') => void;
  onCreateGroup: (e: React.FormEvent) => void;

  isJoinGroupOpen: boolean;
  onCloseJoinGroup: () => void;
  joinCodeInput: string;
  setJoinCodeInput: (v: string) => void;
  onJoinGroup: (e: React.FormEvent) => void;
}

export const QGroupActionModals: React.FC<QGroupActionModalsProps> = ({
  qgroups, currentUser,
  isNewDirectOpen, onCloseNewDirect, directPartnerInput, setDirectPartnerInput, onStartDirectMessage,
  isCreateGroupOpen, onCloseCreateGroup, newGroupName, setNewGroupName, newGroupDept, setNewGroupDept,
  newGroupDesc, setNewGroupDesc, newGroupPolicy, setNewGroupPolicy, onCreateGroup,
  isJoinGroupOpen, onCloseJoinGroup, joinCodeInput, setJoinCodeInput, onJoinGroup,
}) => {
  const myEmailNorm = (currentUser?.email || '').toLowerCase().replace('@gmai.com', '@gmail.com');
  const suggestedEmails = Array.from(
    new Set(
      qgroups
        .flatMap((g) => g.members || [])
        .map((m) => m.toLowerCase().replace('@gmai.com', '@gmail.com'))
        .filter((m) => m && m !== myEmailNorm && !m.includes('lecturer@quizgen.ai'))
    )
  );

  return (
    <>
      {/* Modal: New 1-1 Direct Message */}
      {isNewDirectOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-indigo-600" />
                <h3 className="font-extrabold text-slate-900 text-sm">Nhắn Tin Riêng 1-1 Với Đồng Nghiệp</h3>
              </div>
              <button onClick={onCloseNewDirect} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!directPartnerInput.trim()) return;
                  onStartDirectMessage(directPartnerInput.trim());
                }}
                className="space-y-3"
              >
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nhập email đồng nghiệp cần nhắn tin:</label>
                  <input
                    type="email" required value={directPartnerInput}
                    onChange={(e) => setDirectPartnerInput(e.target.value)}
                    placeholder="Ví dụ: vuha3608@ut.edu.vn..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-indigo-600 text-slate-900"
                  />
                </div>
                <button type="submit" className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all cursor-pointer shadow-xs flex items-center justify-center gap-1.5">
                  <Send className="w-3.5 h-3.5" />
                  <span>Bắt Đầu Trò Chuyện 1-1</span>
                </button>
              </form>

              {suggestedEmails.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <span className="font-bold text-slate-500 text-[10px] uppercase tracking-wider block">
                    Hoặc chọn nhanh đồng nghiệp cùng bộ môn:
                  </span>
                  <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                    {suggestedEmails.map((email) => (
                      <div
                        key={email}
                        onClick={() => onStartDirectMessage(email)}
                        className="p-2.5 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded-xl flex items-center justify-between cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                            {email.slice(0, 2).toUpperCase()}
                          </div>
                          <span className="font-mono text-slate-800 font-semibold truncate text-[11px]">{email}</span>
                        </div>
                        <span className="text-[10px] text-indigo-600 font-bold hover:underline shrink-0">Nhắn tin &rarr;</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal 1: Create Q-Group */}
      {isCreateGroupOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-600" />
                <h3 className="font-extrabold text-slate-900 text-sm">Tạo Q-Group Chuyên Môn Mới</h3>
              </div>
              <button onClick={onCloseCreateGroup} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={onCreateGroup} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Tên nhóm chuyên môn / bộ môn *</label>
                <input
                  type="text" required value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="Ví dụ: Bộ Môn Mạng Máy Tính K22..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-purple-600"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Khoa / Đơn vị trực thuộc</label>
                <input
                  type="text" value={newGroupDept}
                  onChange={(e) => setNewGroupDept(e.target.value)}
                  placeholder="Ví dụ: Khoa Công nghệ Thông tin..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-purple-600"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Mục đích hoạt động của nhóm</label>
                <textarea
                  rows={2} value={newGroupDesc}
                  onChange={(e) => setNewGroupDesc(e.target.value)}
                  placeholder="Ví dụ: Cùng soạn thảo đề thi, kiểm thử câu hỏi trắc nghiệm..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-purple-600 resize-none"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Chính sách vào phòng mặc định:</label>
                <div className="space-y-2">
                  {[
                    { id: 'approval_required', label: '🟡 Cần duyệt: Giảng viên nhập mã phải được bạn phê duyệt' },
                    { id: 'open', label: '🟢 Tự do: Bất kỳ ai có mã đều vào ngay' },
                    { id: 'email_only', label: '🔒 Riêng tư: Chỉ mời đích danh qua Email' },
                  ].map((p) => (
                    <label key={p.id} className="flex items-center gap-2 text-slate-700 cursor-pointer">
                      <input type="radio" name="newGroupPolicy" checked={newGroupPolicy === p.id} onChange={() => setNewGroupPolicy(p.id as any)} className="text-purple-600" />
                      <span>{p.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={onCloseCreateGroup} className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 font-bold text-slate-600">
                  Hủy
                </button>
                <button type="submit" className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold shadow-xs">
                  Xác Nhận Tạo Nhóm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Join Q-Group by Code */}
      {isJoinGroupOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-purple-600" />
                <h3 className="font-extrabold text-slate-900 text-sm">Tham Gia Q-Group Bằng Mã</h3>
              </div>
              <button onClick={onCloseJoinGroup} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={onJoinGroup} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nhập Mã Nhóm (Group Code) *</label>
                <input
                  type="text" required value={joinCodeInput}
                  onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                  placeholder="Ví dụ: QGRP-OS2026..."
                  className="w-full p-2.5 uppercase font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-purple-600 text-center tracking-wider text-sm"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={onCloseJoinGroup} className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 font-bold text-slate-600">
                  Đóng
                </button>
                <button type="submit" className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold shadow-xs">
                  Gia Nhập
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
