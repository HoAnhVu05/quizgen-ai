import React from 'react';
import { Pin, X } from 'lucide-react';
import { QGroupMessage } from '../../types';

interface PinnedMessagesBarProps {
  pinnedMessages: QGroupMessage[];
  activePinnedIdx: number;
  onNextPinned: () => void;
  onUnpin: (messageId: string) => void;
  onScrollToMessage: (messageId: string) => void;
}

export const PinnedMessagesBar: React.FC<PinnedMessagesBarProps> = ({
  pinnedMessages,
  activePinnedIdx,
  onNextPinned,
  onUnpin,
  onScrollToMessage,
}) => {
  if (pinnedMessages.length === 0) return null;

  const currentMsg = pinnedMessages[activePinnedIdx % pinnedMessages.length];
  if (!currentMsg) return null;

  return (
    <div className="px-4 py-2 bg-amber-50/95 border-b border-amber-200/90 flex items-center justify-between gap-3 shadow-xs animate-fadeIn shrink-0">
      <div
        onClick={() => onScrollToMessage(currentMsg.id)}
        className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer group"
        title="Nhấn để xem tin nhắn được ghim trong hội thoại"
      >
        <div className="w-7 h-7 rounded-lg bg-amber-500/15 text-amber-700 flex items-center justify-center shrink-0">
          <Pin className="w-3.5 h-3.5 fill-amber-500 text-amber-600" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 font-bold text-amber-900 text-[11px]">
            <span>Tin nhắn đã ghim</span>
            {pinnedMessages.length > 1 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-200 text-amber-900 font-extrabold">
                {(activePinnedIdx % pinnedMessages.length) + 1}/{pinnedMessages.length}
              </span>
            )}
          </div>
          <p className="text-slate-700 truncate text-[11px] group-hover:text-amber-950 transition-colors">
            <strong className="text-slate-900">{currentMsg.senderName}: </strong>
            {currentMsg.text ||
              (currentMsg.attachment ? `[Tệp đính kèm: ${currentMsg.attachment.name}]` : '...')}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {pinnedMessages.length > 1 && (
          <button
            type="button"
            onClick={onNextPinned}
            className="px-2 py-1 rounded-md bg-amber-100 hover:bg-amber-200 text-amber-900 text-[11px] font-semibold transition-colors"
            title="Chuyển sang tin nhắn đã ghim tiếp theo"
          >
            Xem tiếp
          </button>
        )}
        <button
          type="button"
          onClick={() => onUnpin(currentMsg.id)}
          className="w-6 h-6 rounded-md hover:bg-amber-200 text-amber-700 hover:text-amber-900 flex items-center justify-center transition-colors"
          title="Bỏ ghim tin nhắn này"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
