import React, { useState } from 'react';
import {
  Settings,
  X,
  AlertCircle,
  Globe,
  ShieldCheck,
  Lock,
  Check,
} from 'lucide-react';
import { QGroup } from '../../types';

export interface ChannelSettingsModalProps {
  group: QGroup;
  myEmail: string;
  onClose: () => void;
  onSaveSettings: (
    name: string,
    dept: string,
    desc: string,
    joinPolicy: 'open' | 'approval_required' | 'invite_only'
  ) => void;
  onTransferOwner: () => void;
  onDisband: () => void;
}

export const ChannelSettingsModal: React.FC<ChannelSettingsModalProps> = ({
  group,
  myEmail,
  onClose,
  onSaveSettings,
  onTransferOwner,
  onDisband,
}) => {
  const isOwner = (group.ownerEmail || '').toLowerCase() === myEmail.toLowerCase();
  const [editName, setEditName] = useState(group.name);
  const [editDept, setEditDept] = useState(group.department || '');
  const [editDesc, setEditDesc] = useState(group.description || '');
  const [editJoinPolicy, setEditJoinPolicy] = useState<'open' | 'approval_required' | 'invite_only'>(
    (group.joinPolicy as any) || 'open'
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-slate-900/50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-sm">
              <Settings className="w-5 h-5 text-teal-700" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">
                  Cài đặt kênh #{group.name}
                </h3>
                {isOwner && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    Trưởng nhóm
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Cấu hình thông tin, quyền phê duyệt và quản trị nhóm học thuật
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {!isOwner && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 flex items-start gap-2.5 text-[11px]">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Chế độ xem thông tin cài đặt</p>
                <p className="text-amber-700 mt-0.5">
                  Chỉ Trưởng nhóm (<strong>{group.ownerName || group.ownerEmail}</strong>) mới có quyền chỉnh sửa cấu hình kênh này.
                </p>
              </div>
            </div>
          )}

          <div className="space-y-3.5">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Tên kênh học thuật</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                disabled={!isOwner}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg outline-none focus:border-teal-600 text-xs disabled:opacity-60 font-medium"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Khoa / Bộ môn phụ trách</label>
              <input
                type="text"
                value={editDept}
                onChange={(e) => setEditDept(e.target.value)}
                disabled={!isOwner}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg outline-none focus:border-teal-600 text-xs disabled:opacity-60"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Mục đích & Nội dung hoạt động</label>
              <textarea
                rows={2}
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                disabled={!isOwner}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg outline-none focus:border-teal-600 resize-none text-xs disabled:opacity-60 leading-relaxed"
              />
            </div>

            {/* Chế độ tham gia */}
            <div className="space-y-2 pt-2 border-t border-slate-200">
              <label className="font-semibold text-slate-700 block">Chế độ tham gia & Xét duyệt thành viên</label>
              <div className="space-y-2">
                {/* Open */}
                <label
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    editJoinPolicy === 'open'
                      ? 'border-[#008689] bg-teal-50/40 ring-1 ring-[#008689]'
                      : 'border-slate-200 hover:bg-slate-50'
                  } ${!isOwner ? 'pointer-events-none opacity-70' : ''}`}
                >
                  <input
                    type="radio"
                    name="modalJoinPolicy"
                    checked={editJoinPolicy === 'open'}
                    onChange={() => setEditJoinPolicy('open')}
                    disabled={!isOwner}
                    className="mt-0.5 text-teal-700 focus:ring-teal-700"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 font-semibold text-slate-900">
                      <Globe className="w-3.5 h-3.5 text-slate-700" />
                      <span>Công khai (Tự do tham gia khi có mã phòng)</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Giảng viên nhập đúng mã phòng sẽ được tự động tham gia nhóm ngay lập tức.
                    </p>
                  </div>
                </label>

                {/* Approval */}
                <label
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    editJoinPolicy === 'approval_required'
                      ? 'border-[#008689] bg-teal-50/40 ring-1 ring-[#008689]'
                      : 'border-slate-200 hover:bg-slate-50'
                  } ${!isOwner ? 'pointer-events-none opacity-70' : ''}`}
                >
                  <input
                    type="radio"
                    name="modalJoinPolicy"
                    checked={editJoinPolicy === 'approval_required'}
                    onChange={() => setEditJoinPolicy('approval_required')}
                    disabled={!isOwner}
                    className="mt-0.5 text-teal-700 focus:ring-teal-700"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 font-semibold text-slate-900">
                      <ShieldCheck className="w-3.5 h-3.5 text-slate-700" />
                      <span>Cần phê duyệt (Trưởng nhóm duyệt mới vào)</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Giảng viên nhập mã sẽ gửi yêu cầu gia nhập; Trưởng nhóm sẽ nhận thông báo để phê duyệt hoặc từ chối.
                    </p>
                  </div>
                </label>

                {/* Invite only */}
                <label
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    editJoinPolicy === 'invite_only'
                      ? 'border-[#008689] bg-teal-50/40 ring-1 ring-[#008689]'
                      : 'border-slate-200 hover:bg-slate-50'
                  } ${!isOwner ? 'pointer-events-none opacity-70' : ''}`}
                >
                  <input
                    type="radio"
                    name="modalJoinPolicy"
                    checked={editJoinPolicy === 'invite_only'}
                    onChange={() => setEditJoinPolicy('invite_only')}
                    disabled={!isOwner}
                    className="mt-0.5 text-teal-700 focus:ring-teal-700"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 font-semibold text-slate-900">
                      <Lock className="w-3.5 h-3.5 text-slate-700" />
                      <span>Riêng tư (Chỉ khi được mời trực tiếp)</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Không cho phép nhập mã tự do; chỉ những đồng nghiệp được Trưởng nhóm gửi lời mời qua email mới có thể truy cập.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Vùng quản trị nâng cao dành riêng cho Trưởng nhóm */}
            {isOwner && (
              <div className="pt-3 border-t border-slate-200 space-y-3">
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wide block">
                  Tùy chọn Quản trị & Điều hành Nhóm
                </span>

                <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-amber-900 text-xs">Chuyển quyền Trưởng nhóm</p>
                    <p className="text-[11px] text-amber-700 mt-0.5">
                      Chuyển quyền quản trị nhóm cho một giảng viên khác trong kênh.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onTransferOwner}
                    className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs shrink-0 cursor-pointer transition-colors"
                  >
                    Chuyển quyền
                  </button>
                </div>

                <div className="p-3 bg-rose-50/60 border border-rose-200 rounded-xl flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-rose-900 text-xs">Giải tán nhóm học thuật</p>
                    <p className="text-[11px] text-rose-700 mt-0.5">
                      Xóa vĩnh viễn nhóm và toàn bộ lịch sử tin nhắn khỏi hệ thống.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onDisband}
                    className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs shrink-0 cursor-pointer transition-colors"
                  >
                    Giải tán
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2 text-xs">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold cursor-pointer transition-colors"
          >
            Đóng
          </button>
          {isOwner && (
            <button
              type="button"
              onClick={() => onSaveSettings(editName, editDept, editDesc, editJoinPolicy)}
              className="px-4 py-2 rounded-lg bg-[#008689] hover:bg-[#007073] text-white font-semibold cursor-pointer transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <Check className="w-4 h-4" />
              <span>Lưu cài đặt kênh</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
