import React, { useEffect } from 'react';
import { Phone, PhoneOff, Headphones, Volume2 } from 'lucide-react';
import { ringtoneManager } from '../../utils/huddleRingtone';

export interface IncomingHuddleData {
  roomId: string;
  callerName: string;
  callerEmail: string;
  groupName?: string;
  isDirect: boolean;
  groupId: string;
}

interface IncomingHuddleModalProps {
  incomingCall: IncomingHuddleData | null;
  onAccept: (call: IncomingHuddleData) => void;
  onDecline: (call: IncomingHuddleData) => void;
}

export const IncomingHuddleModal: React.FC<IncomingHuddleModalProps> = ({
  incomingCall,
  onAccept,
  onDecline,
}) => {
  useEffect(() => {
    if (incomingCall) {
      // Đổ 1 tiếng bính boong êm dịu duy nhất thông báo có Huddle mới, không đổ chuông reo dồn dập
      ringtoneManager.playSingleNotificationChime();
    }
    const handleAcceptWithAudioUnlock = () => {
    // Kích hoạt âm thanh đồng bộ ngay trong cử chỉ tương tác người dùng (User Gesture)
    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        const dummyCtx = new AudioCtxClass();
        dummyCtx.resume().catch(() => {});
      }
    } catch {}
    if (incomingCall) onAccept(incomingCall);
  };

  return () => {
      ringtoneManager.stop();
    };
  }, [incomingCall?.roomId]);

  if (!incomingCall) return null;

  const handleAcceptWithAudioUnlock = () => {
    // Kích hoạt âm thanh đồng bộ ngay trong cử chỉ tương tác người dùng (User Gesture)
    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        const dummyCtx = new AudioCtxClass();
        dummyCtx.resume().catch(() => {});
      }
    } catch {}
    if (incomingCall) onAccept(incomingCall);
  };

  return (
    <div className="fixed top-4 right-4 sm:top-6 sm:right-6 z-[9999] max-w-sm w-full animate-bounceIn select-none">
      <div className="bg-slate-900/95 border-2 border-emerald-500/80 rounded-2xl shadow-2xl backdrop-blur-xl p-4 text-white overflow-hidden relative">
        {/* Animated glowing background */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-500/20 rounded-full blur-2xl animate-pulse pointer-events-none" />

        <div className="flex items-center gap-3">
          {/* Avatar with pulsing rings */}
          <div className="relative shrink-0">
            <span className="absolute -inset-1 rounded-full bg-emerald-500/40 animate-ping" />
            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center font-bold text-white shadow-lg relative border-2 border-emerald-400">
              <Headphones className="w-6 h-6 animate-pulse" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-slate-900 flex items-center justify-center">
              <Volume2 className="w-3 h-3 text-white" />
            </div>
          </div>

          {/* Call Information */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold tracking-wider uppercase text-emerald-400">
                {incomingCall.isDirect ? 'Cuộc gọi Huddle 1-1' : 'Thảo luận Huddle Nhóm'}
              </span>
            </div>
            <h4 className="font-bold text-sm text-slate-100 truncate mt-0.5">
              {incomingCall.callerName}
            </h4>
            <p className="text-xs text-slate-400 truncate">
              {incomingCall.groupName
                ? `Kênh: ${incomingCall.groupName}`
                : 'Đang mời bạn vào đàm thoại thoại...'}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => onDecline(incomingCall)}
            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-800 hover:bg-rose-950/80 border border-slate-700/80 hover:border-rose-500/50 text-rose-300 hover:text-rose-200 text-xs font-semibold transition-all active:scale-95"
          >
            <PhoneOff className="w-4 h-4 text-rose-400" />
            <span>Từ chối</span>
          </button>

          <button
            type="button"
            onClick={handleAcceptWithAudioUnlock}
            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-900/40 transition-all active:scale-95 animate-pulse"
          >
            <Phone className="w-4 h-4" />
            <span>Tham gia ngay</span>
          </button>
        </div>
      </div>
    </div>
  );
};
