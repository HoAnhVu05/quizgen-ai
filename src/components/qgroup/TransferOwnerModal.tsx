import React from 'react';
import { UserCheck, AlertCircle, X } from 'lucide-react';
import type { QGroup } from '../../types';
import { initials } from './qgroupHelpers';

interface TransferOwnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  transferGroup: QGroup | null;
  myEmail: string;
  selectedNewOwner: string;
  onSelectNewOwner: (email: string) => void;
  transferAlsoLeave: boolean;
  onToggleTransferAlsoLeave: (val: boolean) => void;
  isTransferringOwner: boolean;
  onConfirmTransfer: () => void;
  onDisbandGroup: (group: QGroup) => void;
}

export const TransferOwnerModal: React.FC<TransferOwnerModalProps> = ({
  isOpen,
  onClose,
  transferGroup,
  myEmail,
  selectedNewOwner,
  onSelectNewOwner,
  transferAlsoLeave,
  onToggleTransferAlsoLeave,
  isTransferringOwner,
  onConfirmTransfer,
  onDisbandGroup,
}) => {
  if (!isOpen || !transferGroup) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-slate-900/50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-amber-600" />
            <span>Chuyển Quyền Trưởng Nhóm</span>
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-4 text-xs">
          <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-amber-900 space-y-1">
            <p className="font-semibold flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Bạn đang là Trưởng nhóm của "#{transferGroup.name}"</span>
            </p>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              Chỉ định một giảng viên trong nhóm tiếp nhận vai trò Trưởng nhóm học thuật. Bạn có thể chọn tiếp tục ở lại nhóm hoặc rời nhóm.
            </p>
          </div>

          <div className="space-y-2">
            <label className="font-semibold text-slate-700">Chọn giảng viên kế nhiệm:</label>
            <div className="max-h-48 overflow-y-auto space-y-1.5 border border-slate-200 rounded-xl p-2 bg-slate-50">
              {(transferGroup.members || [])
                .filter((m) => m.toLowerCase() !== myEmail.toLowerCase())
                .map((email) => (
                  <label
                    key={email}
                    className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition-all ${
                      selectedNewOwner.toLowerCase() === email.toLowerCase()
                        ? 'border-slate-900 bg-white text-slate-900 font-semibold ring-1 ring-slate-900'
                        : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-6 h-6 rounded-md bg-slate-700 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                        {initials(email)}
                      </div>
                      <span className="truncate">{email}</span>
                    </div>
                    <input
                      type="radio"
                      name="newOwner"
                      checked={selectedNewOwner.toLowerCase() === email.toLowerCase()}
                      onChange={() => onSelectNewOwner(email)}
                      className="text-slate-900"
                    />
                  </label>
                ))}
            </div>
          </div>

          <label className="flex items-start gap-2.5 p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 cursor-pointer transition-colors">
            <input
              type="checkbox"
              checked={transferAlsoLeave}
              onChange={(e) => onToggleTransferAlsoLeave(e.target.checked)}
              className="w-4 h-4 rounded text-slate-900 border-slate-300 focus:ring-0 cursor-pointer mt-0.5"
            />
            <div className="text-xs">
              <span className="font-semibold text-slate-800">Đồng thời rời khỏi nhóm sau khi chuyển quyền</span>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {transferAlsoLeave
                  ? 'Bạn sẽ chuyển quyền và rút khỏi kênh học thuật này.'
                  : 'Mặc định: Bạn vẫn ở lại nhóm với tư cách thành viên bình thường sau khi chuyển quyền.'}
              </p>
            </div>
          </label>

          <div className="flex items-center justify-between pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => {
                onClose();
                void onDisbandGroup(transferGroup);
              }}
              className="text-rose-600 hover:text-rose-700 font-semibold text-xs hover:underline cursor-pointer"
            >
              Giải tán nhóm vĩnh viễn
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={!selectedNewOwner || isTransferringOwner}
                onClick={onConfirmTransfer}
                className={`px-4 py-2 rounded-lg disabled:opacity-40 font-semibold text-xs shadow-xs cursor-pointer flex items-center gap-1.5 transition-colors ${
                  transferAlsoLeave
                    ? 'bg-rose-600 hover:bg-rose-700 text-white'
                    : 'bg-slate-900 hover:bg-slate-800 text-white'
                }`}
              >
                {isTransferringOwner
                  ? 'Đang xử lý...'
                  : transferAlsoLeave
                  ? 'Chuyển quyền & Rời nhóm'
                  : 'Xác nhận Chuyển quyền Trưởng nhóm'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
