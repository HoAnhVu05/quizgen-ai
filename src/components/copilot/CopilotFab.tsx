import React from 'react';
import { Sparkles } from 'lucide-react';

interface CopilotFabProps {
  fabElementRef: React.RefObject<HTMLDivElement>;
  fabStyle: React.CSSProperties;
  snapSide: 'left' | 'right';
  isCurrentlyDragging: boolean;
  isOpen: boolean;
  activeThemeId: string;
  onPointerDown: (e: React.PointerEvent) => void;
}

export const CopilotFab: React.FC<CopilotFabProps> = ({
  fabElementRef,
  fabStyle,
  snapSide,
  isCurrentlyDragging,
  isOpen,
  activeThemeId,
  onPointerDown,
}) => {
  return (
    <div
      ref={fabElementRef}
      onPointerDown={onPointerDown}
      style={fabStyle}
      className={`fixed z-40 w-12 h-12 sm:w-14 sm:h-14 select-none group transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        isCurrentlyDragging ? 'cursor-grabbing scale-105' : 'cursor-grab'
      } ${isOpen ? 'scale-0 opacity-0 pointer-events-none' : 'scale-100 opacity-100 pointer-events-auto'}`}
      title="Nhấp để mở Quanta AI — kéo ra đâu cũng được, khi buông tay sẽ tự hút về mép trái/phải"
    >
      {!isCurrentlyDragging && (
        <div
          className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold shadow-md pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-200 shrink-0 absolute top-1/2 -translate-y-1/2 whitespace-nowrap ${
            snapSide === 'left' ? 'left-full ml-3' : 'right-full mr-3'
          } ${
            activeThemeId === 'spring'
              ? 'bg-[#FFF8E9] text-[#8F171C] border border-[#E7B947]'
              : 'bg-white/95 text-slate-700 border border-slate-200'
          }`}
        >
          <Sparkles className={`w-3.5 h-3.5 ${activeThemeId === 'spring' ? 'text-[#E7B947]' : 'text-[#008689]'}`} />
          <span>Hỏi Quanta AI</span>
        </div>
      )}

      <button
        type="button"
        aria-label="Mở Trợ lý Khảo thí AI"
        className={`w-full h-full rounded-full text-white shadow-xl hover:shadow-2xl transition-all duration-300 flex items-center justify-center relative ${
          isCurrentlyDragging ? 'ring-4 ring-teal-400/60 scale-105 shadow-2xl' : 'hover:scale-105 active:scale-95'
        } ${
          activeThemeId === 'spring'
            ? 'bg-gradient-to-tr from-[#087E79] to-[#00a3a8] ring-2 ring-[#E7B947] ring-offset-2 tet-gold-glow'
            : 'bg-gradient-to-tr from-[#008689] to-[#00b4b8]'
        }`}
      >
        {!isCurrentlyDragging && (
          <div className="absolute inset-0 rounded-full bg-[#008689] opacity-25 animate-ping pointer-events-none" />
        )}
        <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-white group-hover:rotate-12 transition-transform duration-300 relative z-10 pointer-events-none" />
        <span className="absolute top-0 right-0 w-3 h-3 sm:w-3.5 sm:h-3.5 bg-emerald-400 border-2 border-white rounded-full pointer-events-none" />
      </button>
    </div>
  );
};
