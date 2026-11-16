import React from 'react';
import { SystemThemeId } from '../types/theme';

interface ThemeCornerStickerProps {
  themeId: SystemThemeId;
  position?: 'top-right' | 'top-left';
  className?: string;
}

export const ThemeCornerSticker: React.FC<ThemeCornerStickerProps> = ({
  themeId,
  position = 'top-right',
  className = ''
}) => {
  if (themeId === 'default') return null;

  const posClasses = position === 'top-right' ? 'top-0 right-0' : 'top-0 left-0';

  return (
    <div
      className={`absolute ${posClasses} pointer-events-none select-none z-20 overflow-hidden ${className}`}
      aria-hidden="true"
    >
      {/* 🌸 TẾT & MÙA XUÂN: Nhành mai vàng, hoa đào & lồng đèn mini */}
      {themeId === 'spring' && (
        <svg width="150" height="130" viewBox="0 0 150 130" fill="none" className="drop-shadow-sm opacity-90 transition-transform duration-700 hover:scale-105">
          {/* Cành cây uốn lượn */}
          <path d="M150 0C110 15 80 40 50 65C35 78 20 85 0 90" stroke="#78350F" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M95 35C110 50 120 70 125 90" stroke="#78350F" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M60 60C45 75 35 95 30 115" stroke="#78350F" strokeWidth="2" strokeLinecap="round" />

          {/* Hoa Mai Vàng */}
          <g transform="translate(100, 30)">
            <circle cx="0" cy="-9" r="6" fill="#FBBF24" />
            <circle cx="8" cy="-3" r="6" fill="#FBBF24" />
            <circle cx="5" cy="7" r="6" fill="#FBBF24" />
            <circle cx="-5" cy="7" r="6" fill="#FBBF24" />
            <circle cx="-8" cy="-3" r="6" fill="#FBBF24" />
            <circle cx="0" cy="0" r="3.5" fill="#DC2626" />
          </g>
          <g transform="translate(48, 65)">
            <circle cx="0" cy="-8" r="5" fill="#FCD34D" />
            <circle cx="7" cy="-2" r="5" fill="#FCD34D" />
            <circle cx="4" cy="6" r="5" fill="#FCD34D" />
            <circle cx="-4" cy="6" r="5" fill="#FCD34D" />
            <circle cx="-7" cy="-2" r="5" fill="#FCD34D" />
            <circle cx="0" cy="0" r="3" fill="#B91C1C" />
          </g>

          {/* Hoa Đào Hồng Phai */}
          <g transform="translate(125, 75)">
            <circle cx="0" cy="-8" r="5.5" fill="#FDA4AF" />
            <circle cx="7" cy="-2" r="5.5" fill="#FB7185" />
            <circle cx="4" cy="6" r="5.5" fill="#FDA4AF" />
            <circle cx="-4" cy="6" r="5.5" fill="#FB7185" />
            <circle cx="-7" cy="-2" r="5.5" fill="#FDA4AF" />
            <circle cx="0" cy="0" r="3" fill="#E11D48" />
          </g>

          {/* Lồng đèn đỏ may mắn treo nhẹ */}
          <g transform="translate(30, 95)">
            <line x1="0" y1="0" x2="0" y2="12" stroke="#B45309" strokeWidth="1.2" />
            <rect x="-8" y="12" width="16" height="20" rx="4" fill="#DC2626" />
            <ellipse cx="0" cy="22" rx="4" ry="9" fill="#B91C1C" />
            <rect x="-6" y="10" width="12" height="2.5" fill="#F59E0B" rx="1" />
            <rect x="-6" y="32" width="12" height="2.5" fill="#F59E0B" rx="1" />
            <line x1="0" y1="34" x2="0" y2="44" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" />
            <circle cx="0" cy="44" r="1.5" fill="#F59E0B" />
          </g>
        </svg>
      )}

      {/* ☀️ MÙA HÈ: Chùm phượng vĩ đỏ & ánh dương hè */}
      {themeId === 'summer' && (
        <svg width="140" height="120" viewBox="0 0 140 120" fill="none" className="drop-shadow-sm opacity-90">
          <path d="M140 0C100 20 70 45 30 75" stroke="#78350F" strokeWidth="3" strokeLinecap="round" />
          {/* Lá phượng xanh kép */}
          <g fill="#16A34A" opacity="0.85">
            <ellipse cx="110" cy="22" rx="8" ry="3" transform="rotate(-30 110 22)" />
            <ellipse cx="90" cy="35" rx="7" ry="2.5" transform="rotate(-40 90 35)" />
            <ellipse cx="70" cy="50" rx="7" ry="2.5" transform="rotate(-35 70 50)" />
          </g>
          {/* Chùm phượng vĩ đỏ rực rỡ */}
          <g transform="translate(80, 40)">
            <ellipse cx="0" cy="-9" rx="8" ry="6" fill="#EF4444" />
            <ellipse cx="9" cy="-2" rx="8" ry="6" fill="#DC2626" />
            <ellipse cx="5" cy="8" rx="8" ry="6" fill="#F97316" />
            <ellipse cx="-5" cy="8" rx="8" ry="6" fill="#DC2626" />
            <ellipse cx="-9" cy="-2" rx="8" ry="6" fill="#EF4444" />
            <circle cx="0" cy="0" r="3.5" fill="#FEF08A" />
          </g>
          <g transform="translate(45, 70)">
            <ellipse cx="0" cy="-7" rx="6" ry="4.5" fill="#EA580C" />
            <ellipse cx="7" cy="-2" rx="6" ry="4.5" fill="#EF4444" />
            <ellipse cx="4" cy="6" rx="6" ry="4.5" fill="#DC2626" />
            <ellipse cx="-4" cy="6" rx="6" ry="4.5" fill="#EF4444" />
            <ellipse cx="-7" cy="-2" rx="6" ry="4.5" fill="#EA580C" />
            <circle cx="0" cy="0" r="2.5" fill="#FEF08A" />
          </g>
        </svg>
      )}

      {/* 🍂 MÙA THU: Cành lá phong vàng cam */}
      {themeId === 'autumn' && (
        <svg width="135" height="120" viewBox="0 0 135 120" fill="none" className="drop-shadow-sm opacity-90">
          <path d="M135 0C100 20 60 55 15 85" stroke="#92400E" strokeWidth="2.8" strokeLinecap="round" />
          {/* Lá phong vàng nghệ thuật */}
          <g transform="translate(75, 45) scale(0.9)">
            <path d="M0 -22 L4 -10 L16 -12 L10 -2 L20 6 L9 8 L8 18 L0 12 L-8 18 L-9 8 L-20 6 L-10 -2 L-16 -12 L-4 -10 Z" fill="#D97706" />
            <line x1="0" y1="-20" x2="0" y2="16" stroke="#78350F" strokeWidth="1.2" />
          </g>
          <g transform="translate(35, 75) scale(0.65)">
            <path d="M0 -22 L4 -10 L16 -12 L10 -2 L20 6 L9 8 L8 18 L0 12 L-8 18 L-9 8 L-20 6 L-10 -2 L-16 -12 L-4 -10 Z" fill="#EA580C" />
            <line x1="0" y1="-20" x2="0" y2="16" stroke="#78350F" strokeWidth="1.2" />
          </g>
        </svg>
      )}

      {/* ❄️ MÙA ĐÔNG: Nhành thông tuyết & chuông bạc nơ đỏ */}
      {themeId === 'winter' && (
        <svg width="140" height="125" viewBox="0 0 140 125" fill="none" className="drop-shadow-sm opacity-90">
          {/* Cành thông xanh tuyết */}
          <path d="M140 0C110 20 80 50 35 85" stroke="#065F46" strokeWidth="3" strokeLinecap="round" />
          <g stroke="#047857" strokeWidth="2" strokeLinecap="round">
            <line x1="120" y1="15" x2="105" y2="5" />
            <line x1="110" y1="25" x2="95" y2="15" />
            <line x1="95" y1="38" x2="80" y2="28" />
            <line x1="75" y1="55" x2="60" y2="45" />
          </g>
          {/* Bông tuyết phủ trên cành */}
          <circle cx="105" cy="5" r="3" fill="#E0F2FE" />
          <circle cx="95" cy="15" r="3.5" fill="#E0F2FE" />
          <circle cx="80" cy="28" r="3.5" fill="#E0F2FE" />
          {/* Chuông vàng / Nơ đỏ Giáng Sinh */}
          <g transform="translate(45, 80)">
            <rect x="-8" y="-4" width="16" height="6" rx="2" fill="#E11D48" />
            <circle cx="0" cy="-1" r="3" fill="#BE123C" />
            <path d="M-6 2 C-7 12 -9 18 -12 20 L12 20 C9 18 7 12 6 2 Z" fill="#F59E0B" />
            <circle cx="0" cy="21" r="2.5" fill="#D97706" />
          </g>
        </svg>
      )}

      {/* ⭐ 30/4 & 1/5: Dải băng chiến thắng & chim bồ câu hòa bình */}
      {themeId === 'victory_30_4' && (
        <svg width="150" height="130" viewBox="0 0 150 130" fill="none" className="drop-shadow-sm opacity-90">
          {/* Dải ruy băng Đỏ - Vàng góc trang */}
          <path d="M150 0 L150 45 L45 150 L0 150 Z" fill="#DC2626" opacity="0.9" />
          <path d="M150 8 L150 16 L16 150 L8 150 Z" fill="#FBBF24" />
          <path d="M150 28 L150 36 L36 150 L28 150 Z" fill="#FBBF24" />
          {/* Chim bồ câu trắng ngậm cành ô-liu */}
          <g transform="translate(85, 35) scale(0.9)">
            <path d="M0 0 C5 -10 18 -15 25 -10 C22 -2 15 5 8 10 C15 12 25 10 30 18 C20 18 10 15 5 12 C2 15 -2 20 -8 18 C-12 12 -5 5 0 0 Z" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="1" />
            <circle cx="2" cy="-4" r="1.5" fill="#1E293B" />
            {/* Nhành lá ô liu xanh */}
            <path d="M12 -8 C16 -12 20 -11 22 -7" stroke="#16A34A" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            <circle cx="16" cy="-11" r="2" fill="#22C55E" />
          </g>
        </svg>
      )}

      {/* 🇻🇳 QUỐC KHÁNH 2/9: Cờ Đỏ Sao Vàng tung bay trang trọng */}
      {themeId === 'national_day_2_9' && (
        <svg width="145" height="125" viewBox="0 0 145 125" fill="none" className="drop-shadow-md opacity-95">
          {/* Cột cờ & Dải cờ gợn sóng */}
          <g transform="translate(60, 20)">
            <path d="M0 0 C25 -5 45 5 70 0 L70 48 C45 53 25 43 0 48 Z" fill="#DA1C2D" />
            <path d="M0 48 C25 43 45 53 70 48 L70 52 C45 57 25 47 0 52 Z" fill="#991B1B" opacity="0.4" />
            {/* Ngôi sao vàng năm cánh */}
            <g transform="translate(35, 24) scale(0.85)">
              <polygon points="0,-14 4,-4 14,-4 6,2 9,12 0,6 -9,12 -6,2 -14,-4 -4,-4" fill="#FFFF00" />
            </g>
            {/* Cán cờ kim loại mạ vàng */}
            <line x1="0" y1="-5" x2="0" y2="75" stroke="#F59E0B" strokeWidth="3" strokeLinecap="round" />
            <circle cx="0" cy="-6" r="3" fill="#D97706" />
          </g>
        </svg>
      )}
    </div>
  );
};

interface ThemeLogoBadgeProps {
  themeId: SystemThemeId;
  className?: string;
}

export const ThemeLogoBadge: React.FC<ThemeLogoBadgeProps> = ({ themeId, className = '' }) => {
  if (themeId === 'default') return null;

  return (
    <span className={`inline-flex items-center select-none ${className}`} aria-hidden="true">
      {themeId === 'spring' && (
        <span className="text-sm -ml-1 -mt-2 animate-bounce" style={{ animationDuration: '3s' }} title="Xuân Ất Tỵ">
          🌸
        </span>
      )}
      {themeId === 'summer' && (
        <span className="text-xs -ml-1 -mt-2" title="Mùa Hè Sôi Động">
          ☀️
        </span>
      )}
      {themeId === 'autumn' && (
        <span className="text-xs -ml-1 -mt-2" title="Mùa Thu Khai Trường">
          🍂
        </span>
      )}
      {themeId === 'winter' && (
        <span className="text-xs -ml-1.5 -mt-3.5 rotate-12" title="Giáng Sinh An Lành">
          🎅
        </span>
      )}
      {themeId === 'victory_30_4' && (
        <span className="text-xs -ml-1 -mt-2" title="30/4 - 1/5 Chiến Thắng">
          🕊️
        </span>
      )}
      {themeId === 'national_day_2_9' && (
        <span className="text-xs -ml-1 -mt-2.5" title="Mừng Quốc Khánh 2/9">
          ⭐
        </span>
      )}
    </span>
  );
};
