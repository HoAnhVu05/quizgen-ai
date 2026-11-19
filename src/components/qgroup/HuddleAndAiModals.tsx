import React, { useState } from 'react';
import { Sparkles, X, Mic, MicOff, LogOut } from 'lucide-react';
import { QGroup, UserProfile } from '../../types';

const initials = (name: string) =>
  String(name || 'GV')
    .trim()
    .slice(0, 2)
    .toUpperCase();

// ── AiSummarizeModal ──────────────────────────────────────────────────────────
export const AiSummarizeModal: React.FC<{
  group: QGroup;
  onClose: () => void;
}> = ({ group, onClose }) => {
  const msgs = group.messages || [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-slate-900/50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden p-6 space-y-4 animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-teal-700 flex items-center justify-center border border-slate-200">
              <Sparkles className="w-4 h-4 text-teal-700" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Tóm tắt nội dung trao đổi chuyên môn</h3>
              <p className="text-[10px] text-slate-500">Kênh #{group.name}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-3 text-xs leading-relaxed text-slate-700">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
            <h4 className="font-semibold text-slate-900">Tổng quan kênh trao đổi:</h4>
            <p className="text-slate-600">
              Kênh hiện có <strong>{group.memberCount || 2} thành viên</strong> đang tham gia. Đã ghi nhận tổng cộng <strong>{msgs.length} lượt trao đổi</strong> và tài liệu học thuật.
            </p>
          </div>

          <div className="space-y-1.5">
            <h4 className="font-semibold text-slate-900">Các nội dung trọng tâm đã thảo luận:</h4>
            <ul className="list-disc pl-5 space-y-1 text-slate-600">
              <li>Thống nhất sử dụng chung tài liệu học phần và các giáo trình cốt lõi để đối soát ngân hàng câu hỏi Bloom.</li>
              <li>Các giảng viên đã kết nối và phân bổ nội dung biên soạn ma trận đề thi trắc nghiệm.</li>
              <li>Hệ thống lưu vết minh chứng nguồn trang sách tự động phục vụ công tác kiểm định chất lượng học thuật.</li>
            </ul>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs cursor-pointer shadow-xs transition-colors"
          >
            Đã hiểu
          </button>
        </div>
      </div>
    </div>
  );
};

// ── HuddleCallModal ──────────────────────────────────────────────────────────
export const HuddleCallModal: React.FC<{
  group: QGroup;
  currentUser?: UserProfile | null;
  onClose: () => void;
}> = ({ group, currentUser, onClose }) => {
  const [isMuted, setIsMuted] = useState(false);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-slate-900/60 p-4"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 text-white rounded-2xl max-w-sm w-full border border-slate-800 shadow-2xl p-6 space-y-5 text-center animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 font-semibold text-xs border border-emerald-500/30">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            Huddle đang diễn ra
          </div>
          <h3 className="text-base font-bold text-white mt-2">#{group.name}</h3>
          <p className="text-xs text-slate-400">Phiên thảo luận nhanh giữa các giảng viên</p>
        </div>

        {/* Visualizer & Avatars */}
        <div className="flex items-center justify-center gap-3 py-4">
          <div className="relative">
            <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-base text-white">
              {initials(currentUser?.fullName || 'GV')}
            </div>
            <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 ring-2 ring-slate-900" />
          </div>

          <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-semibold text-slate-400">
            +{(group.memberCount || 2) - 1}
          </div>
        </div>

        {/* Call Controls */}
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => setIsMuted(!isMuted)}
            className={`w-11 h-11 rounded-xl flex items-center justify-center transition-colors cursor-pointer ${
              isMuted ? 'bg-rose-600 hover:bg-rose-700 text-white' : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
            }`}
            title={isMuted ? 'Bật mic' : 'Tắt mic'}
          >
            {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs flex items-center gap-2 cursor-pointer transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Rời Huddle</span>
          </button>
        </div>
      </div>
    </div>
  );
};
