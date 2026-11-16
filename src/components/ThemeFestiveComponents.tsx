import React from 'react';
import { SystemThemeId } from '../types/theme';

interface ThemeComponentProps {
  themeId: SystemThemeId;
  className?: string;
}

/**
 * 1. CHIBI MASCOT STICKER (GÓC TRÁI DƯỚI MÀN HÌNH - NGAY TRÊN CARD TÀI KHOẢN)
 * Bé Chibi đội đầu lân sư rồng cầm liễn "Tết" / Chibi Bộ Đội cầm liễn "30/4" / Chibi Noel...
 * Thiết kế tỉ mỉ, sinh động, chuẩn xác 100% theo ảnh mẫu của người dùng.
 */
export const ThemeChibiMascot: React.FC<ThemeComponentProps> = ({ themeId, className = '' }) => {
  if (themeId === 'default') return null;

  return (
    <div
      className={`w-full flex flex-col items-center pointer-events-none select-none relative mb-1 ${className}`}
      aria-hidden="true"
    >
      {/* 🌸 TẾT & MÙA XUÂN: Bé Chibi múa Lân Sư Rồng cầm liễn "Tết" (Y hệt ảnh chụp) */}
      {themeId === 'spring' && (
        <svg width="210" height="150" viewBox="0 0 210 150" fill="none" className="overflow-visible drop-shadow-md">
          <defs>
            <linearGradient id="waveRed" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#DC2626" />
              <stop offset="50%" stopColor="#EF4444" />
              <stop offset="100%" stopColor="#B91C1C" />
            </linearGradient>
            <linearGradient id="goldLien" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#FEF08A" />
              <stop offset="50%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#D97706" />
            </linearGradient>
            <linearGradient id="lionHeadRed" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F87171" />
              <stop offset="50%" stopColor="#DC2626" />
              <stop offset="100%" stopColor="#991B1B" />
            </linearGradient>
          </defs>

          {/* Nền sóng nước truyền thống màu đỏ vàng (như trong ảnh mẫu) */}
          <path
            d="M10 135 C35 120 60 145 90 130 C120 115 150 140 185 125 C195 120 205 125 210 135 L210 150 L10 150 Z"
            fill="url(#waveRed)"
            opacity="0.85"
          />
          <path
            d="M20 142 C50 130 80 150 110 138 C140 126 170 145 200 135"
            stroke="#FEF08A"
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity="0.9"
          />

          {/* Cụm hoa mai vàng nở rộ bên cạnh */}
          <g transform="translate(18, 105)">
            <circle cx="0" cy="-7" r="5" fill="#FDE047" />
            <circle cx="7" cy="-2" r="5" fill="#FDE047" />
            <circle cx="4" cy="6" r="5" fill="#FDE047" />
            <circle cx="-4" cy="6" r="5" fill="#FDE047" />
            <circle cx="-7" cy="-2" r="5" fill="#FDE047" />
            <circle cx="0" cy="0" r="3" fill="#DC2626" />
            <circle cx="0" cy="0" r="1.5" fill="#FEF08A" />
          </g>
          <g transform="translate(32, 125)">
            <circle cx="0" cy="-5" r="3.5" fill="#FBBF24" />
            <circle cx="5" cy="-1.5" r="3.5" fill="#FBBF24" />
            <circle cx="3" cy="4" r="3.5" fill="#FBBF24" />
            <circle cx="-3" cy="4" r="3.5" fill="#FBBF24" />
            <circle cx="-5" cy="-1.5" r="3.5" fill="#FBBF24" />
            <circle cx="0" cy="0" r="2" fill="#B91C1C" />
          </g>

          {/* ── BÉ CHIBI MÚA LÂN SƯ RỒNG ── */}
          <g transform="translate(68, 65)">
            {/* Thân & Áo đỏ gấm tết */}
            <path d="M-18 20 C-22 35 -15 52 0 52 C15 52 22 35 18 20 Z" fill="#DC2626" stroke="#991B1B" strokeWidth="1" />
            {/* Đai lưng vàng */}
            <rect x="-14" y="32" width="28" height="4" rx="2" fill="#FDE047" stroke="#D97706" strokeWidth="0.8" />

            {/* Chân chibi */}
            <ellipse cx="-8" cy="52" rx="6" ry="3.5" fill="#991B1B" />
            <ellipse cx="8" cy="52" rx="6" ry="3.5" fill="#991B1B" />

            {/* Đầu Lân Sư Rồng (Đội trên đầu) */}
            <g transform="translate(0, -18)">
              {/* Lông xù trắng quanh đầu lân */}
              <circle cx="-26" cy="4" r="8" fill="#F8FAFC" stroke="#E2E8F0" strokeWidth="0.8" />
              <circle cx="26" cy="4" r="8" fill="#F8FAFC" stroke="#E2E8F0" strokeWidth="0.8" />
              <circle cx="-20" cy="-14" r="7" fill="#F8FAFC" />
              <circle cx="20" cy="-14" r="7" fill="#F8FAFC" />
              <circle cx="0" cy="-22" r="8" fill="#F8FAFC" />

              {/* Vỏ đầu lân đỏ cam rực rỡ */}
              <path
                d="M-22 8 C-26 -12 -16 -24 0 -24 C16 -24 26 -12 22 8 C16 14 -16 14 -22 8 Z"
                fill="url(#lionHeadRed)"
                stroke="#B91C1C"
                strokeWidth="1.2"
              />
              {/* Sừng lân vàng & ngọc giữa trán */}
              <path d="M-3 -22 L0 -32 L3 -22 Z" fill="#FDE047" stroke="#D97706" strokeWidth="0.8" />
              <circle cx="0" cy="-14" r="4.5" fill="#38BDF8" stroke="#0284C7" strokeWidth="0.8" />

              {/* Mắt lân to tròn tinh nghịch */}
              <circle cx="-11" cy="-4" r="8" fill="#FFFFFF" stroke="#D97706" strokeWidth="1" />
              <circle cx="-11" cy="-4" r="5" fill="#0F172A" />
              <circle cx="-9" cy="-6" r="2" fill="#FFFFFF" />

              <circle cx="11" cy="-4" r="8" fill="#FFFFFF" stroke="#D97706" strokeWidth="1" />
              <circle cx="11" cy="-4" r="5" fill="#0F172A" />
              <circle cx="13" cy="-6" r="2" fill="#FFFFFF" />

              {/* Mũi & râu lân vàng */}
              <ellipse cx="0" cy="4" rx="6" ry="3.5" fill="#FBBF24" />
              <circle cx="-14" cy="5" r="3" fill="#FDE047" />
              <circle cx="14" cy="5" r="3" fill="#FDE047" />
            </g>

            {/* Mặt Chibi bẽn lẽn đáng yêu bên trong */}
            <ellipse cx="0" cy="10" rx="14" ry="12" fill="#FED7AA" />
            {/* Má hồng hào */}
            <ellipse cx="-8" cy="13" rx="3.5" ry="2" fill="#FDA4AF" opacity="0.8" />
            <ellipse cx="8" cy="13" rx="3.5" ry="2" fill="#FDA4AF" opacity="0.8" />
            {/* Mắt cười tít */}
            <path d="M-9 9 Q-6 6 -3 9" stroke="#78350F" strokeWidth="1.5" strokeLinecap="round" fill="none" />
            <path d="M3 9 Q6 6 9 9" stroke="#78350F" strokeWidth="1.5" strokeLinecap="round" fill="none" />
            {/* Miệng cười xinh */}
            <path d="M-3 15 Q0 18 3 15" stroke="#E11D48" strokeWidth="1.5" strokeLinecap="round" fill="none" />

            {/* Tay bé cầm liễn */}
            <ellipse cx="-16" cy="22" rx="4" ry="3.5" fill="#FED7AA" />
            <ellipse cx="16" cy="22" rx="4" ry="3.5" fill="#FED7AA" />
          </g>

          {/* ── TẤM LIỄN VUÔNG ĐỎ CHỮ THƯ PHÁP "TẾT" (Như trong ảnh mẫu) ── */}
          <g transform="translate(142, 85) rotate(12)">
            {/* Liễn hình thoi đỏ viền vàng hoa văn gấm */}
            <rect
              x="-24"
              y="-24"
              width="48"
              height="48"
              rx="4"
              transform="rotate(45)"
              fill="url(#waveRed)"
              stroke="url(#goldLien)"
              strokeWidth="2.5"
            />
            {/* Viền chỉ vàng lồng trong */}
            <rect
              x="-20"
              y="-20"
              width="40"
              height="40"
              rx="2"
              transform="rotate(45)"
              fill="none"
              stroke="#FEF08A"
              strokeWidth="1"
              strokeDasharray="2,2"
            />
            {/* Chữ thư pháp "Tết" màu vàng rực rỡ */}
            <text
              x="0"
              y="8"
              textAnchor="middle"
              fontSize="24"
              fontWeight="900"
              fill="#FEF08A"
              style={{
                fontFamily: '"Times New Roman", "Playfair Display", "Brush Script MT", cursive',
                filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.5))'
              }}
            >
              Tết
            </text>
          </g>
        </svg>
      )}

      {/* ⭐ 30/4 & 1/5: Bé Chibi Bộ Đội / Hòa Bình cầm cờ đỏ sao vàng & liễn "30/4" */}
      {themeId === 'victory_30_4' && (
        <svg width="210" height="150" viewBox="0 0 210 150" fill="none" className="overflow-visible drop-shadow-md">
          <defs>
            <linearGradient id="wave304" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#DC2626" />
              <stop offset="50%" stopColor="#EF4444" />
              <stop offset="100%" stopColor="#991B1B" />
            </linearGradient>
          </defs>

          {/* Nền sóng đỏ vàng hòa bình */}
          <path
            d="M10 135 C40 120 70 145 100 130 C130 118 160 142 190 128 C200 123 205 128 210 135 L210 150 L10 150 Z"
            fill="url(#wave304)"
            opacity="0.85"
          />
          <path d="M20 142 C50 130 80 150 110 138 C140 126 170 145 200 135" stroke="#FEF08A" strokeWidth="1.5" strokeLinecap="round" />

          {/* Đóa sen hồng & búp măng non */}
          <g transform="translate(22, 115) scale(0.9)">
            <path d="M0 0 C-6 -10 -12 -20 0 -30 C12 -20 6 -10 0 0 Z" fill="#FDA4AF" stroke="#E11D48" strokeWidth="1" />
            <path d="M-3 -3 C-12 -9 -18 -15 -10 -24 C-4 -18 0 -12 -3 -3 Z" fill="#FB7185" />
            <path d="M3 -3 C12 -9 18 -15 10 -24 C4 -18 0 -12 3 -3 Z" fill="#FB7185" />
          </g>

          {/* ── BÉ CHIBI BỘ ĐỘI ĐÁNG YÊU ── */}
          <g transform="translate(68, 70)">
            {/* Áo xanh bộ đội */}
            <path d="M-18 18 C-22 34 -15 50 0 50 C15 50 22 34 18 18 Z" fill="#15803D" stroke="#166534" strokeWidth="1" />
            <rect x="-14" y="32" width="28" height="4" rx="2" fill="#D97706" />

            {/* Mũ cối bộ đội với sao vàng giữa trán */}
            <g transform="translate(0, -18)">
              <ellipse cx="0" cy="4" rx="22" ry="7" fill="#166534" />
              <path d="M-18 4 C-18 -16 18 -16 18 4 Z" fill="#15803D" stroke="#14532D" strokeWidth="1.2" />
              {/* Ngôi sao vàng năm cánh trên mũ cối */}
              <circle cx="0" cy="-6" r="6" fill="#DC2626" stroke="#FEF08A" strokeWidth="0.8" />
              <polygon points="0,-10 2,-4 8,-4 3,0 5,6 0,2 -5,6 -3,0 -8,-4 -2,-4" fill="#FFFF00" />
            </g>

            {/* Gương mặt Chibi tươi rói */}
            <ellipse cx="0" cy="8" rx="14" ry="12" fill="#FED7AA" />
            <ellipse cx="-8" cy="11" rx="3.5" ry="2" fill="#FDA4AF" opacity="0.8" />
            <ellipse cx="8" cy="11" rx="3.5" ry="2" fill="#FDA4AF" opacity="0.8" />
            <circle cx="-6" cy="7" r="2.5" fill="#0F172A" />
            <circle cx="-5" cy="6" r="0.8" fill="#FFFFFF" />
            <circle cx="6" cy="7" r="2.5" fill="#0F172A" />
            <circle cx="7" cy="6" r="0.8" fill="#FFFFFF" />
            <path d="M-4 13 Q0 17 4 13" stroke="#DC2626" strokeWidth="1.5" strokeLinecap="round" fill="none" />

            {/* Chim bồ câu trắng đậu trên vai */}
            <g transform="translate(18, -4) scale(0.65)">
              <path d="M0 0 C4 -8 16 -10 20 -6 C17 -1 12 5 6 9 C14 11 20 9 24 16 C15 16 8 13 4 10 Z" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="1" />
              <circle cx="2" cy="-3" r="1.2" fill="#0F172A" />
            </g>
          </g>

          {/* ── TẤM LIỄN VUÔNG ĐỎ CHỮ "30/4" ── */}
          <g transform="translate(142, 85) rotate(10)">
            <rect x="-24" y="-24" width="48" height="48" rx="4" transform="rotate(45)" fill="url(#wave304)" stroke="#FEF08A" strokeWidth="2.5" />
            <rect x="-20" y="-20" width="40" height="40" rx="2" transform="rotate(45)" fill="none" stroke="#FEF08A" strokeWidth="1" strokeDasharray="2,2" />
            <text x="0" y="8" textAnchor="middle" fontSize="20" fontWeight="900" fill="#FEF08A">
              30/4
            </text>
          </g>
        </svg>
      )}

      {/* 🇻🇳 QUỐC KHÁNH 2/9: Bé Chibi Sao Vàng cầm cờ Tổ quốc & liễn "2/9" */}
      {themeId === 'national_day_2_9' && (
        <svg width="210" height="150" viewBox="0 0 210 150" fill="none" className="overflow-visible drop-shadow-md">
          <defs>
            <linearGradient id="wave29" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#B91C1C" />
              <stop offset="50%" stopColor="#DC2626" />
              <stop offset="100%" stopColor="#991B1B" />
            </linearGradient>
          </defs>

          <path d="M10 135 C40 120 70 145 100 130 C130 118 160 142 190 128 L210 150 L10 150 Z" fill="url(#wave29)" opacity="0.85" />
          <path d="M20 142 C50 130 80 150 110 138 C140 126 170 145 200 135" stroke="#FEF08A" strokeWidth="1.5" strokeLinecap="round" />

          {/* Đóa Sen Vàng Ba Đình */}
          <g transform="translate(22, 115) scale(0.85)">
            <path d="M0 0 C-6 -10 -12 -20 0 -30 C12 -20 6 -10 0 0 Z" fill="#FDE047" stroke="#D97706" strokeWidth="1" />
            <path d="M-3 -3 C-12 -9 -18 -15 -10 -24 C-4 -18 0 -12 -3 -3 Z" fill="#FEF08A" />
            <path d="M3 -3 C12 -9 18 -15 10 -24 C4 -18 0 -12 3 -3 Z" fill="#FEF08A" />
          </g>

          {/* Bé Chibi áo cờ đỏ sao vàng */}
          <g transform="translate(68, 70)">
            <path d="M-18 18 C-22 34 -15 50 0 50 C15 50 22 34 18 18 Z" fill="#DC2626" stroke="#991B1B" strokeWidth="1" />
            {/* Sao vàng giữa ngực áo */}
            <polygon points="0,26 2,31 7,31 3,34 5,39 0,36 -5,39 -3,34 -7,31 -2,31" fill="#FFFF00" />

            {/* Mũ tai bèo / Chỏm tóc dễ thương */}
            <ellipse cx="0" cy="-6" rx="16" ry="10" fill="#78350F" />

            <ellipse cx="0" cy="8" rx="14" ry="12" fill="#FED7AA" />
            <ellipse cx="-8" cy="11" rx="3.5" ry="2" fill="#FDA4AF" opacity="0.8" />
            <ellipse cx="8" cy="11" rx="3.5" ry="2" fill="#FDA4AF" opacity="0.8" />
            <circle cx="-6" cy="7" r="2.5" fill="#0F172A" />
            <circle cx="-5" cy="6" r="0.8" fill="#FFFFFF" />
            <circle cx="6" cy="7" r="2.5" fill="#0F172A" />
            <circle cx="7" cy="6" r="0.8" fill="#FFFFFF" />
            <path d="M-4 13 Q0 17 4 13" stroke="#DC2626" strokeWidth="1.5" strokeLinecap="round" fill="none" />
          </g>

          {/* ── TẤM LIỄN VUÔNG ĐỎ CHỮ "2/9" ── */}
          <g transform="translate(142, 85) rotate(10)">
            <rect x="-24" y="-24" width="48" height="48" rx="4" transform="rotate(45)" fill="url(#wave29)" stroke="#FEF08A" strokeWidth="2.5" />
            <rect x="-20" y="-20" width="40" height="40" rx="2" transform="rotate(45)" fill="none" stroke="#FEF08A" strokeWidth="1" strokeDasharray="2,2" />
            <text x="0" y="8" textAnchor="middle" fontSize="22" fontWeight="900" fill="#FEF08A">
              2/9
            </text>
          </g>
        </svg>
      )}

      {/* ❄️ MÙA ĐÔNG: Bé Chibi Người Tuyết / Noel cầm liễn "Noel" */}
      {themeId === 'winter' && (
        <svg width="210" height="150" viewBox="0 0 210 150" fill="none" className="overflow-visible drop-shadow-md">
          <path d="M10 135 C40 125 80 140 120 128 C160 118 185 138 210 130 L210 150 L10 150 Z" fill="#0284C7" opacity="0.75" />

          {/* Bé Người Tuyết Chibi đội mũ Noel */}
          <g transform="translate(68, 75)">
            <circle cx="0" cy="30" r="22" fill="#F0F9FF" stroke="#BAE6FD" strokeWidth="1.5" />
            <circle cx="0" cy="0" r="16" fill="#F0F9FF" stroke="#BAE6FD" strokeWidth="1.5" />
            {/* Khăn choàng len đỏ */}
            <rect x="-14" y="10" width="28" height="6" rx="3" fill="#DC2626" />
            {/* Mũ Noel đỏ */}
            <path d="M-12 -12 C-6 -26 8 -30 14 -28 L14 -12 Z" fill="#DC2626" />
            <circle cx="15" cy="-28" r="3.5" fill="#FFFFFF" />
            <rect x="-14" y="-12" width="28" height="5" rx="2" fill="#FFFFFF" />
            {/* Mắt & mũi cà rốt */}
            <circle cx="-5" cy="-1" r="2" fill="#0F172A" />
            <circle cx="5" cy="-1" r="2" fill="#0F172A" />
            <polygon points="0,2 8,4 0,6" fill="#EA580C" />
          </g>

          {/* Liễn Noel */}
          <g transform="translate(142, 85) rotate(10)">
            <rect x="-24" y="-24" width="48" height="48" rx="4" transform="rotate(45)" fill="#0369A1" stroke="#BAE6FD" strokeWidth="2.5" />
            <text x="0" y="7" textAnchor="middle" fontSize="18" fontWeight="900" fill="#FFFFFF">
              Noel
            </text>
          </g>
        </svg>
      )}

      {/* ☀️ MÙA HÈ: Bé Chibi Học Sinh cầm liễn "Thi Tốt" */}
      {themeId === 'summer' && (
        <svg width="210" height="150" viewBox="0 0 210 150" fill="none" className="overflow-visible drop-shadow-md">
          <path d="M10 135 C40 120 70 145 100 130 C130 118 160 142 210 135 L210 150 L10 150 Z" fill="#0284C7" opacity="0.8" />
          {/* Bé chibi học sinh */}
          <g transform="translate(68, 70)">
            <ellipse cx="0" cy="30" rx="16" ry="18" fill="#0284C7" />
            <ellipse cx="0" cy="6" rx="14" ry="12" fill="#FED7AA" />
            <circle cx="-6" cy="5" r="2.5" fill="#0F172A" />
            <circle cx="6" cy="5" r="2.5" fill="#0F172A" />
            <path d="M-4 11 Q0 15 4 11" stroke="#DC2626" strokeWidth="1.5" strokeLinecap="round" fill="none" />
            {/* Nón lưỡi trai cam năng động */}
            <path d="M-14 -2 C-14 -16 14 -16 14 -2 Z" fill="#EA580C" />
            <ellipse cx="8" cy="-2" rx="14" ry="4" fill="#F97316" />
          </g>
          {/* Liễn Thi Tốt */}
          <g transform="translate(142, 85) rotate(10)">
            <rect x="-24" y="-24" width="48" height="48" rx="4" transform="rotate(45)" fill="#EA580C" stroke="#FEF08A" strokeWidth="2.5" />
            <text x="0" y="7" textAnchor="middle" fontSize="16" fontWeight="900" fill="#FEF08A">
              Thi Tốt
            </text>
          </g>
        </svg>
      )}

      {/* 🍂 MÙA THU: Bé Chibi Tựu Trường cầm liễn "Khai Giảng" */}
      {themeId === 'autumn' && (
        <svg width="210" height="150" viewBox="0 0 210 150" fill="none" className="overflow-visible drop-shadow-md">
          <path d="M10 135 C40 120 70 145 100 130 C130 118 160 142 210 135 L210 150 L10 150 Z" fill="#D97706" opacity="0.8" />
          <g transform="translate(68, 70)">
            <ellipse cx="0" cy="30" rx="16" ry="18" fill="#B45309" />
            <ellipse cx="0" cy="6" rx="14" ry="12" fill="#FED7AA" />
            <circle cx="-6" cy="5" r="2.5" fill="#0F172A" />
            <circle cx="6" cy="5" r="2.5" fill="#0F172A" />
            <path d="M-4 11 Q0 15 4 11" stroke="#DC2626" strokeWidth="1.5" strokeLinecap="round" fill="none" />
          </g>
          <g transform="translate(142, 85) rotate(10)">
            <rect x="-24" y="-24" width="48" height="48" rx="4" transform="rotate(45)" fill="#B45309" stroke="#FEF08A" strokeWidth="2.5" />
            <text x="0" y="6" textAnchor="middle" fontSize="13" fontWeight="900" fill="#FEF08A">
              Tựu Trường
            </text>
          </g>
        </svg>
      )}
    </div>
  );
};

/**
 * 2. CÀNH HOA MAI & LỒNG ĐÈN GÓC PHẢI HEADER SIDEBAR
 * Bố trí tinh tế, rủ sát mép phải ngoài cùng, chỉ để mỗi lồng đèn/vật phẩm treo tối giản,
 * hoàn toàn không có nhành cây hay hoa lá che lấp logo hoặc chữ QuizGen AI.
 */
export const ThemeSidebarHeaderCorner: React.FC<ThemeComponentProps> = ({ themeId, className = '' }) => {
  if (themeId === 'default') return null;

  return (
    <div className={`absolute top-0 right-2 pointer-events-none select-none z-20 overflow-visible ${className}`} aria-hidden="true">
      {/* 🌸 TẾT: Chỉ để duy nhất một lồng đèn đỏ may mắn rủ xuống tinh tế theo yêu cầu người dùng */}
      {themeId === 'spring' && (
        <svg width="22" height="42" viewBox="0 0 22 42" fill="none" className="overflow-visible drop-shadow-xs">
          <g transform="translate(11, 0)" className="tet-lantern-swing">
            <line x1="0" y1="0" x2="0" y2="8" stroke="#D97706" strokeWidth="1.2" />
            <ellipse cx="0" cy="18" rx="8" ry="10" fill="#B82025" stroke="#E7B947" strokeWidth="1" />
            <ellipse cx="0" cy="18" rx="3.5" ry="9" fill="#8F171C" />
            <rect x="-5" y="8" width="10" height="2" rx="0.5" fill="#E7B947" />
            <rect x="-5" y="26" width="10" height="2" rx="0.5" fill="#E7B947" />
            <line x1="0" y1="28" x2="0" y2="40" stroke="#E7B947" strokeWidth="1.2" />
          </g>
        </svg>
      )}

      {/* ☀️ MÙA HÈ: Chuông gió biển hoặc mặt trời nhỏ rủ nhẹ */}
      {themeId === 'summer' && (
        <svg width="22" height="42" viewBox="0 0 22 42" fill="none" className="overflow-visible drop-shadow-xs">
          <g transform="translate(11, 0)" className="tet-lantern-swing">
            <line x1="0" y1="0" x2="0" y2="10" stroke="#087EAD" strokeWidth="1.2" />
            <circle cx="0" cy="18" r="7" fill="#FFD166" stroke="#26B9D5" strokeWidth="1" />
            <line x1="0" y1="25" x2="0" y2="38" stroke="#26B9D5" strokeWidth="1.2" strokeDasharray="1 2" />
          </g>
        </svg>
      )}

      {/* 🍂 MÙA THU: Lá phong vàng nghệ thuật đung đưa nhẹ */}
      {themeId === 'autumn' && (
        <svg width="22" height="42" viewBox="0 0 22 42" fill="none" className="overflow-visible drop-shadow-xs">
          <g transform="translate(11, 0)" className="tet-lantern-swing">
            <line x1="0" y1="0" x2="0" y2="10" stroke="#B85C38" strokeWidth="1.2" />
            <path d="M0 10 C-6 16 -4 23 0 26 C4 23 6 16 0 10 Z" fill="#E9B85D" stroke="#D98E36" strokeWidth="0.8" />
            <line x1="0" y1="12" x2="0" y2="24" stroke="#70452F" strokeWidth="0.6" />
            <line x1="0" y1="26" x2="0" y2="38" stroke="#E9B85D" strokeWidth="1.2" />
          </g>
        </svg>
      )}

      {/* ❄️ MÙA ĐÔNG: Bông tuyết pha lê đung đưa */}
      {themeId === 'winter' && (
        <svg width="22" height="42" viewBox="0 0 22 42" fill="none" className="overflow-visible drop-shadow-xs">
          <g transform="translate(11, 0)" className="tet-lantern-swing">
            <line x1="0" y1="0" x2="0" y2="10" stroke="#78BDE8" strokeWidth="1.2" />
            <circle cx="0" cy="18" r="7" fill="#F3FAFF" stroke="#2563A6" strokeWidth="1" />
            <text x="0" y="21" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#2563A6">❄</text>
            <line x1="0" y1="25" x2="0" y2="38" stroke="#78BDE8" strokeWidth="1.2" />
          </g>
        </svg>
      )}

      {/* ⭐ 30/4 & 2/9: Dải ruy băng sao vàng treo tinh tế */}
      {(themeId === 'victory_30_4' || themeId === 'national_day_2_9') && (
        <svg width="22" height="42" viewBox="0 0 22 42" fill="none" className="overflow-visible drop-shadow-xs">
          <g transform="translate(11, 0)" className="tet-lantern-swing">
            <line x1="0" y1="0" x2="0" y2="10" stroke="#DA251D" strokeWidth="1.2" />
            <circle cx="0" cy="18" r="7" fill="#DA251D" stroke="#FFCD00" strokeWidth="1" />
            <polygon points="0,13 1.5,16.5 5,16.5 2.2,18.5 3.3,22 0,19.8 -3.3,22 -2.2,18.5 -5,16.5 -1.5,16.5" fill="#FFCD00" />
            <line x1="0" y1="25" x2="0" y2="38" stroke="#FFCD00" strokeWidth="1.2" />
          </g>
        </svg>
      )}
    </div>
  );
};

/**
 * 3. CÀNH HOA MAI & LỒNG ĐÈN GÓC TRÊN BÊN PHẢI MÀN HÌNH (Y hệt ảnh mẫu)
 */
export const ThemeTopRightCorner: React.FC<ThemeComponentProps> = ({ themeId, className = '' }) => {
  if (themeId === 'default') return null;

  return (
    <div className={`fixed top-0 right-0 pointer-events-none select-none z-20 ${className}`} aria-hidden="true">
      <svg width="150" height="130" viewBox="0 0 150 130" fill="none" className="drop-shadow-sm">
        {/* Cành mai vàng rủ góc phải */}
        <path d="M150 0 C110 15 80 40 45 75 C30 90 20 100 5 105" stroke="#78350F" strokeWidth="3" strokeLinecap="round" />
        <path d="M105 32 C120 50 130 70 135 95" stroke="#78350F" strokeWidth="2" strokeLinecap="round" />

        {/* Cụm hoa mai vàng rực rỡ */}
        <g transform="translate(95, 30)">
          <circle cx="0" cy="-8" r="5" fill="#FDE047" />
          <circle cx="7.5" cy="-2.5" r="5" fill="#FDE047" />
          <circle cx="4.5" cy="6.5" r="5" fill="#FDE047" />
          <circle cx="-4.5" cy="6.5" r="5" fill="#FDE047" />
          <circle cx="-7.5" cy="-2.5" r="5" fill="#FDE047" />
          <circle cx="0" cy="0" r="3" fill="#DC2626" />
        </g>
        <g transform="translate(55, 68)">
          <circle cx="0" cy="-6" r="4" fill="#FBBF24" />
          <circle cx="6" cy="-2" r="4" fill="#FBBF24" />
          <circle cx="4" cy="5" r="4" fill="#FBBF24" />
          <circle cx="-4" cy="5" r="4" fill="#FBBF24" />
          <circle cx="-6" cy="-2" r="4" fill="#FBBF24" />
          <circle cx="0" cy="0" r="2.5" fill="#B91C1C" />
        </g>

        {/* Lồng đèn đỏ may mắn treo rủ (Y hệt mép phải ảnh mẫu) */}
        <g transform="translate(132, 45)" className="tet-lantern-swing">
          <line x1="0" y1="-10" x2="0" y2="4" stroke="#D97706" strokeWidth="1" />
          <ellipse cx="0" cy="18" rx="11" ry="14" fill="#B82025" stroke="#E7B947" strokeWidth="1" />
          <ellipse cx="0" cy="18" rx="4" ry="13" fill="#8F171C" />
          <rect x="-7" y="4" width="14" height="2" fill="#E7B947" />
          <rect x="-7" y="30" width="14" height="2" fill="#E7B947" />
          <line x1="0" y1="32" x2="0" y2="48" stroke="#E7B947" strokeWidth="1.5" />
        </g>
      </svg>
    </div>
  );
};

/**
 * 4. CỤM TRANG TRÍ Ở GÓC DƯỚI PHẢI 4 THẺ KPI (Chuẩn xác theo từng chủ đề)
 */
export const ThemeKpiFlowerCorner: React.FC<ThemeComponentProps> = ({ themeId, className = '' }) => {
  if (themeId === 'default') return null;

  return (
    <div className={`absolute bottom-0 right-0 pointer-events-none select-none overflow-hidden ${className}`} aria-hidden="true">
      {/* 🌸 TẾT: Hoa mai vàng rực rỡ */}
      {themeId === 'spring' && (
        <svg width="45" height="40" viewBox="0 0 45 40" fill="none">
          <path d="M45 40 C35 30 25 32 15 35" stroke="#78350F" strokeWidth="1.5" strokeLinecap="round" />
          <g transform="translate(30, 24) scale(0.65)">
            <circle cx="0" cy="-6" r="4.5" fill="#FDE047" />
            <circle cx="6" cy="-2" r="4.5" fill="#FDE047" />
            <circle cx="4" cy="5" r="4.5" fill="#FDE047" />
            <circle cx="-4" cy="5" r="4.5" fill="#FDE047" />
            <circle cx="-6" cy="-2" r="4.5" fill="#FDE047" />
            <circle cx="0" cy="0" r="2.5" fill="#DC2626" />
          </g>
          <g transform="translate(16, 28) scale(0.45)">
            <circle cx="0" cy="-6" r="4" fill="#FBBF24" />
            <circle cx="6" cy="-2" r="4" fill="#FBBF24" />
            <circle cx="4" cy="5" r="4.5" fill="#FBBF24" />
            <circle cx="-4" cy="5" r="4" fill="#FBBF24" />
            <circle cx="-6" cy="-2" r="4" fill="#FBBF24" />
            <circle cx="0" cy="0" r="2" fill="#B91C1C" />
          </g>
        </svg>
      )}

      {/* ☀️ MÙA HÈ: Sóng biển nhiệt đới & Mặt trời vàng rực rỡ */}
      {themeId === 'summer' && (
        <svg width="45" height="40" viewBox="0 0 45 40" fill="none">
          <path d="M45 35 C35 27 25 38 12 36" stroke="#26B9D5" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M45 39 C38 33 28 41 18 40" stroke="#087EAD" strokeWidth="1.2" strokeLinecap="round" opacity="0.6" />
          <g transform="translate(32, 22)">
            <circle cx="0" cy="0" r="5" fill="#FFD166" stroke="#087EAD" strokeWidth="0.8" />
            <line x1="0" y1="-8" x2="0" y2="-6" stroke="#FFD166" strokeWidth="1.2" strokeLinecap="round" />
            <line x1="6" y1="-6" x2="4.5" y2="-4.5" stroke="#FFD166" strokeWidth="1.2" strokeLinecap="round" />
            <line x1="8" y1="0" x2="6" y2="0" stroke="#FFD166" strokeWidth="1.2" strokeLinecap="round" />
            <line x1="-8" y1="0" x2="-6" y2="0" stroke="#FFD166" strokeWidth="1.2" strokeLinecap="round" />
            <line x1="-6" y1="-6" x2="-4.5" y2="-4.5" stroke="#FFD166" strokeWidth="1.2" strokeLinecap="round" />
          </g>
        </svg>
      )}

      {/* 🍂 MÙA THU: Chiếc lá phong vàng nghệ thuật */}
      {themeId === 'autumn' && (
        <svg width="45" height="40" viewBox="0 0 45 40" fill="none">
          <path d="M45 40 C36 32 28 35 18 36" stroke="#70452F" strokeWidth="1.5" strokeLinecap="round" />
          <g transform="translate(28, 22) rotate(-15) scale(0.85)">
            <path
              d="M0 -8 L3 -4 L7 -5 L5 -1 L8 2 L3 3 L4 7 L0 4 L-4 7 L-3 3 L-8 2 L-5 -1 L-7 -5 L-3 -4 Z"
              fill="#E9B85D"
              stroke="#B85C38"
              strokeWidth="0.8"
            />
            <line x1="0" y1="4" x2="0" y2="9" stroke="#70452F" strokeWidth="1" />
          </g>
        </svg>
      )}

      {/* ❄️ MÙA ĐÔNG: Bông tuyết pha lê lung linh */}
      {themeId === 'winter' && (
        <svg width="45" height="40" viewBox="0 0 45 40" fill="none">
          <path d="M45 40 C38 32 28 38 18 38" stroke="#78BDE8" strokeWidth="1.5" strokeLinecap="round" />
          <g transform="translate(28, 22) scale(0.85)">
            <line x1="0" y1="-7" x2="0" y2="7" stroke="#2563A6" strokeWidth="1.2" strokeLinecap="round" />
            <line x1="-7" y1="0" x2="7" y2="0" stroke="#2563A6" strokeWidth="1.2" strokeLinecap="round" />
            <line x1="-5" y1="-5" x2="5" y2="5" stroke="#2563A6" strokeWidth="1.2" strokeLinecap="round" />
            <line x1="-5" y1="5" x2="5" y2="-5" stroke="#2563A6" strokeWidth="1.2" strokeLinecap="round" />
            <circle cx="0" cy="0" r="2" fill="#78BDE8" />
          </g>
        </svg>
      )}

      {/* ⭐ 30/4: Ngôi sao vàng & đóa sen hòa bình */}
      {themeId === 'victory_30_4' && (
        <svg width="45" height="40" viewBox="0 0 45 40" fill="none">
          <path d="M45 40 C35 32 26 36 15 37" stroke="#DA251D" strokeWidth="1.5" strokeLinecap="round" />
          <g transform="translate(28, 22) scale(0.8)">
            <polygon points="0,-7 2,-2 7,-2 3,1 5,6 0,3 -5,6 -3,1 -7,-2 -2,-2" fill="#FFCD00" stroke="#E7B947" strokeWidth="0.8" />
          </g>
        </svg>
      )}

      {/* 🇻🇳 2/9: Ba Đình ngôi sao vàng & hoa sen */}
      {themeId === 'national_day_2_9' && (
        <svg width="45" height="40" viewBox="0 0 45 40" fill="none">
          <path d="M45 40 C35 32 26 36 15 37" stroke="#B91C1C" strokeWidth="1.5" strokeLinecap="round" />
          <g transform="translate(28, 22) scale(0.8)">
            <polygon points="0,-7 2,-2 7,-2 3,1 5,6 0,3 -5,6 -3,1 -7,-2 -2,-2" fill="#FFCD00" stroke="#E7B947" strokeWidth="0.8" />
          </g>
        </svg>
      )}
    </div>
  );
};

/**
 * 5. BẢNG TIÊU CHÍ & MỤC TIÊU GIAO DIỆN TẾT (Y HỆT 100% ẢNH MẪU CỦA NGƯỜI DÙNG)
 * Đặt ở chân trang Dashboard khi kích hoạt chủ đề Tết / Lễ hội
 */
export const ThemeFestiveSpecFooter: React.FC<ThemeComponentProps> = ({ themeId, className = '' }) => {
  if (themeId !== 'spring') return null;

  return (
    <div className={`mt-6 rounded-2xl overflow-hidden border border-[#E7B947]/60 shadow-xs select-none ${className}`}>
      {/* Thanh tiêu đề 4 cột màu đỏ Tết */}
      <div className="bg-[#B82025] text-white px-4 py-2.5 grid grid-cols-1 md:grid-cols-12 gap-3 text-xs sm:text-sm font-bold items-center">
        <div className="md:col-span-3 flex items-center gap-1.5 text-amber-200">
          <span>★ 1. Mục tiêu</span>
        </div>
        <div className="md:col-span-4 flex items-center gap-1.5 text-amber-200">
          <span>⚙ 2. Các yêu cầu chức năng</span>
        </div>
        <div className="md:col-span-3 flex items-center gap-1.5 text-amber-200">
          <span>🔧 3. Yêu cầu kỹ thuật</span>
        </div>
        <div className="md:col-span-2 flex items-center gap-1.5 text-amber-200">
          <span>✅ 4. Tiêu chí nghiệm thu</span>
        </div>
      </div>

      {/* Nội dung chi tiết trên nền kem sáng trang nhã #FFF8E9 */}
      <div className="bg-[#FFF8E9] p-4 text-xs text-slate-800 grid grid-cols-1 md:grid-cols-12 gap-4 border-t border-[#E7B947]/30">
        {/* Cột 1: Mục tiêu */}
        <div className="md:col-span-3 leading-relaxed text-slate-700">
          <p>
            Trang trí giao diện QuizGen AI theo chủ đề Tết Nguyên Đán nhằm tạo không khí năm mới, mang lại trải nghiệm thân thiện, vẫn đảm bảo tính chuyên nghiệp và không ảnh hưởng đến chức năng hệ thống.
          </p>
        </div>

        {/* Cột 2: Các yêu cầu chức năng */}
        <div className="md:col-span-4 grid grid-cols-1 sm:grid-cols-2 gap-x-2 gap-y-1.5 text-[11px] leading-snug">
          <div className="space-y-1">
            <div className="flex items-start gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-600 mt-1 shrink-0" />
              <span><b>TET-01:</b> Giao diện Tết: chuyển đổi màu sắc, họa tiết phù hợp.</span>
            </div>
            <div className="flex items-start gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-600 mt-1 shrink-0" />
              <span><b>TET-02:</b> Banner Tết: hiển thị lời chúc Xuân Đinh Mùi 2027.</span>
            </div>
            <div className="flex items-start gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-600 mt-1 shrink-0" />
              <span><b>TET-03:</b> Hoa mai: trang trí ở các vị trí quan trọng.</span>
            </div>
            <div className="flex items-start gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-600 mt-1 shrink-0" />
              <span><b>TET-04:</b> Lồng đèn: tạo điểm nhấn truyền thống.</span>
            </div>
            <div className="flex items-start gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-600 mt-1 shrink-0" />
              <span><b>TET-05:</b> Hoa rơi: hiệu ứng hoa mai rơi nhẹ.</span>
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex items-start gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-600 mt-1 shrink-0" />
              <span><b>TET-06:</b> Pháo hoa: hiển thị khi hoàn thành thao tác.</span>
            </div>
            <div className="flex items-start gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-600 mt-1 shrink-0" />
              <span><b>TET-07:</b> Bật/tắt: cho phép người dùng tắt hiệu ứng.</span>
            </div>
            <div className="flex items-start gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-600 mt-1 shrink-0" />
              <span><b>TET-08:</b> Responsive: tương thích mọi thiết bị.</span>
            </div>
            <div className="flex items-start gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-600 mt-1 shrink-0" />
              <span><b>TET-09:</b> Không ảnh hưởng logic, API, dữ liệu.</span>
            </div>
          </div>
        </div>

        {/* Cột 3: Yêu cầu kỹ thuật */}
        <div className="md:col-span-3 text-[11px] leading-relaxed space-y-1 text-slate-700">
          <div className="flex items-start gap-1.5">
            <span>•</span>
            <span>Sử dụng React + Vite, CSS animation nhẹ.</span>
          </div>
          <div className="flex items-start gap-1.5">
            <span>•</span>
            <span>Thêm assets: hoa mai, lồng đèn, pháo hoa.</span>
          </div>
          <div className="flex items-start gap-1.5">
            <span>•</span>
            <span>Hiệu ứng tối ưu, không gây lag.</span>
          </div>
          <div className="flex items-start gap-1.5">
            <span>•</span>
            <span>Có thể tắt hiệu ứng (toggle).</span>
          </div>
        </div>

        {/* Cột 4: Tiêu chí nghiệm thu */}
        <div className="md:col-span-2 text-[11px] leading-relaxed space-y-1 text-slate-700">
          <div className="flex items-start gap-1.5">
            <span>•</span>
            <span>Giao diện đẹp, hài hòa, rõ Tết.</span>
          </div>
          <div className="flex items-start gap-1.5">
            <span>•</span>
            <span>Không lỗi, không ảnh hưởng tính năng.</span>
          </div>
          <div className="flex items-start gap-1.5">
            <span>•</span>
            <span>Tương thích các trình duyệt.</span>
          </div>
          <div className="flex items-start gap-1.5">
            <span>•</span>
            <span>Hiệu ứng mượt, nhẹ.</span>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * 6. POPUP LÌ XÌ KHAI XUÂN ĐẦU NĂM (Mừng năm mới Đinh Mùi 2027)
 */
export const ThemeLuckyMoneyModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onClaim?: () => void;
}> = ({ isOpen, onClose, onClaim }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs select-none">
      <div className="w-full max-w-sm rounded-3xl bg-gradient-to-b from-[#B82025] to-[#8F171C] border-2 border-[#E7B947] p-6 text-center text-white shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Nút đóng */}
        <button
          onClick={onClose}
          className="absolute top-3.5 right-3.5 text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10 text-xs font-bold"
          title="Đóng lời chúc"
        >
          ✕
        </button>

        {/* Hoa văn kim tuyến */}
        <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-[#E7B947]/20 border border-[#E7B947] flex items-center justify-center text-3xl shadow-inner">
          🧧
        </div>

        <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#E7B947] bg-[#B82025]/80 px-3 py-1 rounded-full border border-[#E7B947]/40">
          Xuân Đinh Mùi 2027
        </span>

        <h3 className="text-xl font-black text-amber-100 mt-2.5">
          Lì Xì Khai Xuân Như Ý
        </h3>

        <p className="text-xs text-rose-100 mt-2 leading-relaxed">
          Kính chúc Quý Thầy Cô năm mới <b className="text-amber-200">Vạn Sự Khởi Sắc - Giảng Đường Hân Hoan - Thi Cử Thắng Lợi!</b>
        </p>

        <div className="mt-5 flex gap-2">
          <button
            onClick={() => {
              onClaim?.();
              onClose();
            }}
            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#E7B947] to-[#F59E0B] text-[#8F171C] font-black text-xs shadow-md hover:brightness-105 active:scale-95 transition-all cursor-pointer"
          >
            🌸 Nhận Lộc Đầu Xuân
          </button>
        </div>
      </div>
    </div>
  );
};
