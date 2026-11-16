import React, { useMemo } from 'react';
import { SystemThemeId, ParticleType } from '../types/theme';
import { Eye, EyeOff, Sparkles } from 'lucide-react';

interface ThemeParticleOverlayProps {
  themeId: SystemThemeId;
  particleType: ParticleType;
  showParticles: boolean;
  onToggleParticles: () => void;
}

interface ParticleItem {
  id: number;
  left: number; // percentage
  size: number; // px
  duration: number; // seconds
  delay: number; // seconds
  swayDuration: number; // seconds
  opacity: number;
  rotation: number;
  type: string;
}

export const ThemeParticleOverlay: React.FC<ThemeParticleOverlayProps> = ({
  themeId,
  particleType,
  showParticles,
  onToggleParticles
}) => {
  // Generate a stable pool of 10-12 particles on safe margin areas
  const particles = useMemo<ParticleItem[]>(() => {
    if (particleType === 'none') return [];

    const items: ParticleItem[] = [];
    const count = themeId === 'winter' ? 18 : 16;

    // Distribute particles across screen: left flank, right flank, and ambient center
    for (let i = 0; i < count; i++) {
      let leftPct: number;
      if (i % 3 === 0) {
        // Left flank
        leftPct = Math.random() * 22 + 1;
      } else if (i % 3 === 1) {
        // Right flank
        leftPct = Math.random() * 22 + 76;
      } else {
        // Center spread
        leftPct = Math.random() * 54 + 23;
      }

      items.push({
        id: i,
        left: leftPct,
        size: Math.floor(Math.random() * 10) + 14, // 14px - 24px
        duration: Math.random() * 5 + 9,           // 9s - 14s
        delay: Math.random() * 7,                  // Staggered start
        swayDuration: Math.random() * 2 + 3,       // 3s - 5s horizontal sway
        opacity: Math.random() * 0.25 + 0.75,      // 0.75 - 1.0 vibrant
        rotation: Math.floor(Math.random() * 360),
        type: i % 3 === 0 ? 'type-a' : i % 3 === 1 ? 'type-b' : 'type-c'
      });
    }
    return items;
  }, [themeId, particleType]);

  if (particleType === 'none' || themeId === 'default') {
    return null;
  }

  return (
    <>
      <style>{`
        @keyframes themeDriftFall {
          0% {
            transform: translateY(-40px) rotate(0deg);
            opacity: 0;
          }
          10% {
            opacity: 0.8;
          }
          90% {
            opacity: 0.8;
          }
          100% {
            transform: translateY(105vh) rotate(360deg);
            opacity: 0;
          }
        }

        @keyframes themeDriftSway {
          0% {
            margin-left: -20px;
          }
          50% {
            margin-left: 20px;
          }
          100% {
            margin-left: -20px;
          }
        }

        .theme-particle-fall {
          animation-name: themeDriftFall;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }

        .theme-particle-sway {
          animation-name: themeDriftSway;
          animation-timing-function: ease-in-out;
          animation-iteration-count: infinite;
        }
      `}</style>

      {/* ── Subtle Floating Canvas (Pointer Events None) ── */}
      {showParticles && (
        <div
          className="fixed inset-0 pointer-events-none z-10 overflow-hidden select-none"
          aria-hidden="true"
        >
          {particles.map((p) => (
            <div
              key={p.id}
              className="absolute theme-particle-fall"
              style={{
                left: `${p.left}%`,
                top: '-20px',
                animationDuration: `${p.duration}s`,
                animationDelay: `-${p.delay}s`,
                opacity: p.opacity
              }}
            >
              <div
                className="theme-particle-sway"
                style={{
                  animationDuration: `${p.swayDuration}s`,
                  transform: `rotate(${p.rotation}deg)`
                }}
              >
                {/* 🌸 TẾT: Cánh hoa Mai vàng, Hoa Đào hồng & Bao lì xì may mắn */}
                {particleType === 'flower_petals' && (
                  <svg width={p.size} height={p.size} viewBox="0 0 24 24" fill="none">
                    {p.type === 'type-a' ? (
                      // Cánh hoa mai vàng rực rỡ
                      <path
                        d="M12 2C8 6 6 10 7 14C8 18 12 22 12 22C12 22 16 18 17 14C18 10 16 6 12 2Z"
                        fill="#FBBF24"
                        stroke="#D97706"
                        strokeWidth="1"
                      />
                    ) : p.type === 'type-b' ? (
                      // Cánh hoa đào hồng phai
                      <path
                        d="M12 2C8 6 6 10 7 14C8 18 12 22 12 22C12 22 16 18 17 14C18 10 16 6 12 2Z"
                        fill="#FDA4AF"
                        stroke="#E11D48"
                        strokeWidth="1"
                      />
                    ) : (
                      // Bao lì xì may mắn mini
                      <g>
                        <rect x="4" y="2" width="16" height="20" rx="3" fill="#DC2626" stroke="#FDE047" strokeWidth="1" />
                        <circle cx="12" cy="12" r="3.5" fill="#FDE047" />
                      </g>
                    )}
                  </svg>
                )}

                {/* ☀️ MÙA HÈ: Cánh hoa phượng & Tia nắng ấm */}
                {particleType === 'sparkles' && (
                  <svg width={p.size} height={p.size} viewBox="0 0 24 24" fill="none">
                    {p.type === 'type-a' ? (
                      <path
                        d="M12 3C8 7 7 12 8 16C9 20 12 22 12 22C12 22 15 20 16 16C17 12 16 7 12 3Z"
                        fill="#EF4444"
                        stroke="#B91C1C"
                        strokeWidth="1"
                      />
                    ) : (
                      <circle cx="12" cy="12" r="6" fill="#F59E0B" opacity="0.9" />
                    )}
                  </svg>
                )}

                {/* 🍂 MÙA THU: Lá phong vàng nghệ thuật */}
                {particleType === 'leaves' && (
                  <svg width={p.size} height={p.size} viewBox="0 0 24 24" fill="none">
                    <path
                      d="M12 2L13.5 7.5L19 7L16 11.5L21 15L15.5 16L15 21L12 17.5L9 21L8.5 16L3 15L8 11.5L5 7L10.5 7.5L12 2Z"
                      fill={p.type === 'type-a' ? '#D97706' : '#EA580C'}
                      stroke="#78350F"
                      strokeWidth="0.8"
                      opacity="0.9"
                    />
                  </svg>
                )}

                {/* ❄️ MÙA ĐÔNG: Bông tuyết trắng tinh khôi */}
                {particleType === 'snowflakes' && (
                  <svg width={p.size} height={p.size} viewBox="0 0 24 24" stroke="#BAE6FD" strokeWidth="1.8" fill="none" strokeLinecap="round">
                    <line x1="12" y1="2" x2="12" y2="22" />
                    <line x1="2" y1="12" x2="22" y2="12" />
                    <line x1="5" y1="5" x2="19" y2="19" />
                    <line x1="5" y1="19" x2="19" y2="5" />
                    <circle cx="12" cy="12" r="2.5" fill="#E0F2FE" />
                  </svg>
                )}

                {/* ⭐ 30/4 & 2/9: Ánh sao vàng chiến thắng, Chim bồ câu hòa bình & Dải băng đỏ */}
                {particleType === 'stars_peace' && (
                  <svg width={p.size} height={p.size} viewBox="0 0 24 24" fill="none">
                    {p.type === 'type-a' ? (
                      // Ngôi sao vàng năm cánh tỏa sáng
                      <polygon
                        points="12,2 15,9 22,9 17,14 19,21 12,17 5,21 7,14 2,9 9,9"
                        fill="#FFFF00"
                        stroke="#F59E0B"
                        strokeWidth="1"
                      />
                    ) : p.type === 'type-b' ? (
                      // Chim bồ câu trắng hòa bình mini
                      <g transform="translate(2, 4) scale(0.7)">
                        <path
                          d="M0 0 C6 -10 18 -12 24 -8 C20 -1 14 6 7 10 C16 12 24 10 28 17 C18 17 9 14 4 11 C1 14 -3 18 -8 16 C-12 11 -5 5 0 0 Z"
                          fill="#FFFFFF"
                          stroke="#E2E8F0"
                          strokeWidth="1.2"
                        />
                        <circle cx="2" cy="-4" r="1.5" fill="#0F172A" />
                      </g>
                    ) : (
                      // Dải ruy băng chiến thắng đỏ viền vàng
                      <path
                        d="M4 6 C10 2 14 14 20 10 L19 16 C13 20 9 8 3 12 Z"
                        fill="#DC2626"
                        stroke="#FDE047"
                        strokeWidth="1"
                      />
                    )}
                  </svg>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Discreet Ambient Toggle (Đặt cạnh Quanta AI, không che khuất) ── */}
      <div className="fixed bottom-4 right-20 sm:bottom-6 sm:right-24 z-30 select-none">
        <button
          onClick={onToggleParticles}
          title={showParticles ? "Tắt hiệu ứng bay (để tăng tập trung)" : "Bật hiệu ứng bay theo mùa"}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/95 hover:bg-white text-slate-700 hover:text-slate-900 shadow-md border border-slate-200/90 text-[11px] font-semibold backdrop-blur-md transition-all hover:scale-105 active:scale-95"
        >
          {showParticles ? (
            <>
              <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-spin" style={{ animationDuration: '6s' }} />
              <span>Hiệu ứng: Bật</span>
            </>
          ) : (
            <>
              <EyeOff className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-400">Hiệu ứng: Tắt</span>
            </>
          )}
        </button>
      </div>
    </>
  );
};
