import React from 'react';
import { Headphones, Users, ArrowRight } from 'lucide-react';

export interface ActiveHuddleInfo {
  roomId: string;
  count: number;
  peers: { peerId: string; name: string }[];
  callerName: string;
  callerEmail: string;
  startedAt?: number;
}

interface ActiveHuddleBannerProps {
  activeHuddle: ActiveHuddleInfo | null;
  isCurrentUserInHuddle: boolean;
  onJoinHuddle: () => void;
}

export const ActiveHuddleBanner: React.FC<ActiveHuddleBannerProps> = ({
  activeHuddle,
  isCurrentUserInHuddle,
  onJoinHuddle,
}) => {
  if (!activeHuddle || activeHuddle.count === 0) return null;

  const handleJoin = () => {
    // Kích hoạt ngay AudioContext trong sự kiện click người dùng để mở khóa autoplay trên mobile
    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        const dummyCtx = new AudioCtxClass();
        dummyCtx.resume().catch(() => {});
      }
    } catch {}
    onJoinHuddle();
  };

  return (
    <div className="relative z-20 bg-gradient-to-r from-emerald-950/90 via-teal-950/80 to-slate-900 border-b border-emerald-500/30 shadow-md backdrop-blur-sm animate-in fade-in slide-in-from-top-2 duration-200">
      {/* ── Giao diện Siêu Gọn Nhẹ cho Di động (Mobile: Chiều cao tối ưu ~36px, 1 dòng duy nhất) ── */}
      <div className="flex sm:hidden items-center justify-between px-3 py-1.5 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="relative shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-400">
            <Headphones className="w-3.5 h-3.5 animate-pulse" />
            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          </div>
          <div className="flex items-center gap-1.5 min-w-0 text-xs">
            <span className="font-bold text-emerald-300 shrink-0">Huddle ({activeHuddle.count})</span>
            <span className="text-[11px] text-slate-300 truncate">
              • {activeHuddle.peers.map((p) => p.name).join(', ') || activeHuddle.callerName}
            </span>
          </div>
        </div>

        <div className="shrink-0">
          {isCurrentUserInHuddle ? (
            <span className="px-2 py-0.5 rounded-lg bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 font-bold text-[10px] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Đang gọi</span>
            </span>
          ) : (
            <button
              type="button"
              onClick={handleJoin}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold text-[11px] shadow-sm transition-all active:scale-95 cursor-pointer"
            >
              <span>Vào nghe</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* ── Giao diện Đầy Đủ cho Máy Tính (Desktop: sm:flex) ── */}
      <div className="hidden sm:flex items-center justify-between px-4 py-2 gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-400">
            <Headphones className="w-4 h-4 animate-bounce" />
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-bold text-emerald-300">
                Đàm thoại Huddle đang diễn ra
              </span>
              <span className="flex items-center gap-1 text-[11px] font-medium text-slate-300 bg-emerald-900/60 px-1.5 py-0.2 rounded-full border border-emerald-500/30">
                <Users className="w-3 h-3 text-emerald-400" />
                <span>{activeHuddle.count} người tham gia</span>
              </span>
            </div>
            <p className="text-[11px] text-slate-400 truncate">
              {activeHuddle.peers.map((p) => p.name).join(', ')} đang trao đổi trực tiếp
            </p>
          </div>
        </div>

        <div className="shrink-0">
          {isCurrentUserInHuddle ? (
            <span className="px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 font-bold text-xs flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Đang đàm thoại</span>
            </span>
          ) : (
            <button
              type="button"
              onClick={handleJoin}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-bold text-xs shadow-md shadow-emerald-950 transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              <span>Tham gia</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
