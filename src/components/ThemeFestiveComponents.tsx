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

      {/* ⭐ 30/4: Bé Chibi Anh Giải Phóng Quân đội mũ tai bèo, quàng khăn rằn, giương cờ Mặt Trận & chim bồ câu hòa bình */}
      {themeId === 'victory_30_4' && (
        <svg width="210" height="150" viewBox="0 0 210 150" fill="none" className="overflow-visible drop-shadow-md">
          <defs>
            <linearGradient id="wave304" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#8F171C" />
              <stop offset="50%" stopColor="#DA251D" />
              <stop offset="100%" stopColor="#B91C1C" />
            </linearGradient>
            <linearGradient id="goldPlate304" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#FEF08A" />
              <stop offset="50%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#D97706" />
            </linearGradient>
          </defs>

          {/* Làn sóng đỏ hòa bình */}
          <path
            d="M10 135 C40 120 70 145 100 130 C130 118 160 142 190 128 L210 150 L10 150 Z"
            fill="url(#wave304)"
            opacity="0.85"
          />
          <path d="M20 142 C50 130 80 150 110 138 C140 126 170 145 200 135" stroke="#FEF08A" strokeWidth="1.5" strokeLinecap="round" />

          {/* Đóa sen hồng hòa bình đang nở rộ */}
          <g transform="translate(22, 115) scale(0.9)">
            <path d="M0 0 C-8 -12 -14 -22 0 -32 C14 -22 8 -12 0 0 Z" fill="#FDA4AF" stroke="#E11D48" strokeWidth="1" />
            <path d="M-4 -4 C-14 -11 -20 -18 -12 -26 C-5 -20 0 -14 -4 -4 Z" fill="#FB7185" />
            <path d="M4 -4 C14 -11 20 -18 12 -26 C5 -20 0 -14 4 -4 Z" fill="#FB7185" />
            <circle cx="0" cy="-6" r="3" fill="#FDE047" />
          </g>

          {/* ── BÉ CHIBI ANH GIẢI PHÓNG QUÂN HÀO HÙNG ── */}
          <g transform="translate(68, 62)">
            {/* Thân & Quân phục xanh lá tươi sáng */}
            <path d="M-16 16 C-20 32 -14 48 0 48 C14 48 20 32 16 16 Z" fill="#15803D" stroke="#166534" strokeWidth="1.2" />
            {/* Thắt lưng da & khóa đồng */}
            <rect x="-14" y="32" width="28" height="4" rx="2" fill="#92400E" />
            <rect x="-3" y="31" width="6" height="6" rx="1" fill="#FDE047" stroke="#D97706" strokeWidth="0.8" />

            {/* Khăn rằn Nam Bộ caro đen trắng đặc trưng */}
            <path d="M-14 13 Q0 18 14 13" stroke="#F8FAFC" strokeWidth="6" strokeLinecap="round" fill="none" />
            <path d="M-14 13 Q0 18 14 13" stroke="#334155" strokeWidth="5" strokeDasharray="3,3" strokeLinecap="round" fill="none" />
            {/* Dải khăn rằn rủ xuống ngực */}
            <g transform="translate(-8, 16)">
              <rect x="-3" y="0" width="6" height="16" fill="#F8FAFC" stroke="#334155" strokeWidth="0.6" />
              <line x1="-3" y1="4" x2="3" y2="4" stroke="#334155" />
              <line x1="-3" y1="8" x2="3" y2="8" stroke="#334155" />
              <line x1="-3" y1="12" x2="3" y2="12" stroke="#334155" />
            </g>

            {/* Gương mặt Chibi tươi sáng, rạng ngời chiến thắng */}
            <ellipse cx="0" cy="4" rx="14" ry="12" fill="#FED7AA" />
            <ellipse cx="-8" cy="8" rx="3.5" ry="2" fill="#FDA4AF" opacity="0.8" />
            <ellipse cx="8" cy="8" rx="3.5" ry="2" fill="#FDA4AF" opacity="0.8" />
            <circle cx="-6" cy="4" r="2.6" fill="#0F172A" />
            <circle cx="-5" cy="3" r="1" fill="#FFFFFF" />
            <circle cx="6" cy="4" r="2.6" fill="#0F172A" />
            <circle cx="7" cy="3" r="1" fill="#FFFFFF" />
            <path d="M-4 9 Q0 14 4 9" stroke="#DC2626" strokeWidth="1.8" strokeLinecap="round" fill="none" />

            {/* Chiếc Mũ Tai Bèo xanh giải phóng uốn lượn đặc trưng */}
            <path
              d="M-22 -4 C-20 -10 -8 -6 0 -8 C8 -6 20 -10 22 -4 C18 0 8 -2 0 -1 C-8 -2 -18 0 -22 -4 Z"
              fill="#166534"
              stroke="#14532D"
              strokeWidth="1"
            />
            <path d="M-13 -6 C-14 -18 14 -18 13 -6 Z" fill="#15803D" stroke="#14532D" strokeWidth="1" />
            {/* Huy hiệu sao vàng trên mũ */}
            <circle cx="0" cy="-11" r="4.5" fill="#DC2626" stroke="#FDE047" strokeWidth="0.8" />
            <polygon points="0,-14 1.2,-11.5 3.5,-11.5 1.7,-10 2.4,-7.8 0,-9 -2.4,-7.8 -1.7,-10 -3.5,-11.5 -1.2,-11.5" fill="#FFFF00" />

            {/* Tay phải giương cao Lá Cờ Mặt Trận Dân Tộc Giải Phóng */}
            <line x1="16" y1="28" x2="28" y2="-18" stroke="#D97706" strokeWidth="2.2" strokeLinecap="round" />
            {/* Cờ Mặt Trận: nửa trên đỏ, nửa dưới xanh dương, sao vàng ở giữa */}
            <g transform="translate(28, -20)">
              <path d="M0 2 C10 -2 18 6 28 2 L28 14 C18 18 10 10 0 14 Z" fill="#DC2626" />
              <path d="M0 14 C10 10 18 18 28 14 L28 26 C18 30 10 22 0 26 Z" fill="#0284C7" />
              {/* Sao vàng 5 cánh ở giữa cờ */}
              <polygon points="14,9 16,13 21,13 17,16 19,21 14,18 9,21 11,16 7,13 12,13" fill="#FFFF00" stroke="#F59E0B" strokeWidth="0.5" />
            </g>
            <circle cx="16" cy="24" r="3.5" fill="#FED7AA" />

            {/* Chim bồ câu trắng hòa bình tung cánh */}
            <g transform="translate(-20, -6) scale(0.65)">
              <path
                d="M0 0 C6 -10 18 -12 24 -8 C20 -1 14 6 7 10 C16 12 24 10 28 17 C18 17 9 14 4 11 C1 14 -3 18 -8 16 C-12 11 -5 5 0 0 Z"
                fill="#FFFFFF"
                stroke="#CBD5E1"
                strokeWidth="1.2"
              />
              <circle cx="2" cy="-4" r="1.5" fill="#0F172A" />
              {/* Cành ô liu ngậm trong mỏ */}
              <path d="M-6 4 Q-12 2 -14 8" stroke="#16A34A" strokeWidth="1" fill="none" />
              <circle cx="-14" cy="8" r="1.5" fill="#22C55E" />
            </g>
          </g>

          {/* ── BIỂN KHÁNH VÀNG CHIẾN THẮNG "30/4" ── */}
          <g transform="translate(146, 80) rotate(10)">
            <rect x="-24" y="-24" width="48" height="48" rx="5" transform="rotate(45)" fill="url(#wave304)" stroke="url(#goldPlate304)" strokeWidth="2.5" />
            <rect x="-20" y="-20" width="40" height="40" rx="3" transform="rotate(45)" fill="none" stroke="#FEF08A" strokeWidth="1" strokeDasharray="2,2" />
            <text x="0" y="4" textAnchor="middle" fontSize="18" fontWeight="900" fill="#FEF08A">
              30/4
            </text>
            <text x="0" y="16" textAnchor="middle" fontSize="8" fontWeight="900" fill="#FEF08A" letterSpacing="0.5">
              HÒA BÌNH
            </text>
          </g>
        </svg>
      )}

      {/* 🇻🇳 2/9: Bé Chibi Áo Dài Đỏ Sao Vàng hân hoan vẫy Cờ Tổ Quốc & Trống Đồng Đông Sơn */}
      {themeId === 'national_day_2_9' && (
        <svg width="210" height="150" viewBox="0 0 210 150" fill="none" className="overflow-visible drop-shadow-md">
          <defs>
            <linearGradient id="wave29" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#991B1B" />
              <stop offset="50%" stopColor="#DC2626" />
              <stop offset="100%" stopColor="#B91C1C" />
            </linearGradient>
            <linearGradient id="goldPlate29" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#FEF08A" />
              <stop offset="50%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#D97706" />
            </linearGradient>
          </defs>

          {/* Sóng đỏ Ba Đình rực rỡ */}
          <path d="M10 135 C40 120 70 145 100 130 C130 118 160 142 190 128 L210 150 L10 150 Z" fill="url(#wave29)" opacity="0.85" />
          <path d="M20 142 C50 130 80 150 110 138 C140 126 170 145 200 135" stroke="#FEF08A" strokeWidth="1.5" strokeLinecap="round" />

          {/* Đóa Sen Vàng Ba Đình ngát hương */}
          <g transform="translate(22, 115) scale(0.9)">
            <path d="M0 0 C-8 -12 -14 -22 0 -32 C14 -22 8 -12 0 0 Z" fill="#FDE047" stroke="#D97706" strokeWidth="1" />
            <path d="M-4 -4 C-14 -11 -20 -18 -12 -26 C-5 -20 0 -14 -4 -4 Z" fill="#FEF08A" />
            <path d="M4 -4 C14 -11 20 -18 12 -26 C5 -20 0 -14 4 -4 Z" fill="#FEF08A" />
            <circle cx="0" cy="-6" r="3" fill="#DC2626" />
          </g>

          {/* ── BÉ CHIBI ÁO DÀI ĐỎ SAO VÀNG TỰ HÀO TỔ QUỐC ── */}
          <g transform="translate(68, 62)">
            {/* Tà áo dài đỏ thướt tha */}
            <path d="M-15 16 C-18 32 -12 50 0 50 C12 50 18 32 15 16 Z" fill="#DC2626" stroke="#991B1B" strokeWidth="1.2" />
            {/* Quần lụa trắng */}
            <rect x="-9" y="46" width="7" height="6" rx="1" fill="#F8FAFC" />
            <rect x="2" y="46" width="7" height="6" rx="1" fill="#F8FAFC" />
            {/* Ngôi sao vàng lớn giữa ngực áo */}
            <polygon points="0,23 2.5,29 9,29 4,33 6.5,39 0,35 -6.5,39 -4,33 -9,29 -2.5,29" fill="#FFFF00" stroke="#F59E0B" strokeWidth="0.6" />

            {/* Mái tóc đen óng thắt bím hoa sen */}
            <ellipse cx="0" cy="-3" rx="16" ry="10" fill="#0F172A" />
            <path d="M-15 0 C-15 -12 15 -12 15 0 C10 -6 0 -7 -15 0 Z" fill="#0F172A" />
            <circle cx="12" cy="-4" r="3" fill="#FDE047" stroke="#D97706" strokeWidth="0.6" />

            {/* Khuôn mặt Chibi bầu bĩnh, tươi vui rạng ngời */}
            <ellipse cx="0" cy="4" rx="14" ry="12" fill="#FED7AA" />
            <ellipse cx="-8" cy="8" rx="3.5" ry="2" fill="#FDA4AF" opacity="0.8" />
            <ellipse cx="8" cy="8" rx="3.5" ry="2" fill="#FDA4AF" opacity="0.8" />
            <circle cx="-6" cy="4" r="2.6" fill="#0F172A" />
            <circle cx="-5" cy="3" r="1" fill="#FFFFFF" />
            <circle cx="6" cy="4" r="2.6" fill="#0F172A" />
            <circle cx="7" cy="3" r="1" fill="#FFFFFF" />
            <path d="M-4 9 Q0 14 4 9" stroke="#DC2626" strokeWidth="1.8" strokeLinecap="round" fill="none" />

            {/* Hai tay hân hoan vẫy Cờ Đỏ Sao Vàng Quốc Kỳ Việt Nam */}
            <line x1="14" y1="26" x2="26" y2="-18" stroke="#D97706" strokeWidth="2.2" strokeLinecap="round" />
            {/* Cờ Đỏ Sao Vàng tung bay phấp phới */}
            <g transform="translate(26, -20)">
              <path d="M0 2 C10 -2 18 6 28 2 L28 26 C18 30 10 22 0 26 Z" fill="#DC2626" stroke="#B91C1C" strokeWidth="0.8" />
              {/* Ngôi sao vàng năm cánh tỏa sáng giữa cờ */}
              <polygon points="14,10 16,14 21,14 17,17 19,22 14,19 9,22 11,17 7,14 12,14" fill="#FFFF00" stroke="#F59E0B" strokeWidth="0.6" />
            </g>
            <circle cx="14" cy="22" r="3.5" fill="#FED7AA" />
            <circle cx="-14" cy="22" r="3.5" fill="#FED7AA" />
          </g>

          {/* ── BIỂN KHÁNH NGỌC HOA VĂN TRỐNG ĐỒNG "2/9 - ĐỘC LẬP" ── */}
          <g transform="translate(146, 80) rotate(10)">
            <rect x="-24" y="-24" width="48" height="48" rx="5" transform="rotate(45)" fill="url(#wave29)" stroke="url(#goldPlate29)" strokeWidth="2.5" />
            {/* Họa tiết tia sáng mặt trời Trống đồng */}
            <circle cx="0" cy="0" r="16" fill="none" stroke="#FEF08A" strokeWidth="0.8" opacity="0.35" />
            <rect x="-20" y="-20" width="40" height="40" rx="3" transform="rotate(45)" fill="none" stroke="#FEF08A" strokeWidth="1" strokeDasharray="2,2" />
            <text x="0" y="4" textAnchor="middle" fontSize="19" fontWeight="900" fill="#FEF08A">
              2/9
            </text>
            <text x="0" y="16" textAnchor="middle" fontSize="8" fontWeight="900" fill="#FEF08A" letterSpacing="0.8">
              ĐỘC LẬP
            </text>
          </g>
        </svg>
      )}

      {/* ❄️ MÙA ĐÔNG: Chú Bé Người Tuyết Noel Chibi khăn len sọc, cây thông phủ tuyết & hộp quà sang trọng */}
      {themeId === 'winter' && (
        <svg width="210" height="150" viewBox="0 0 210 150" fill="none" className="overflow-visible drop-shadow-md">
          <defs>
            <linearGradient id="snowWave" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#2563A6" />
              <stop offset="50%" stopColor="#78BDE8" />
              <stop offset="100%" stopColor="#C8E8FA" />
            </linearGradient>
            <linearGradient id="snowBall" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="100%" stopColor="#E0F2FE" />
            </linearGradient>
            <linearGradient id="giftRed" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#EF4444" />
              <stop offset="100%" stopColor="#B91C1C" />
            </linearGradient>
          </defs>

          {/* Đồi tuyết trắng uốn lượn */}
          <path d="M10 135 C40 120 80 145 120 128 C160 115 185 138 210 128 L210 150 L10 150 Z" fill="url(#snowWave)" opacity="0.85" />

          {/* Cây thông Noel mini phủ tuyết & ngôi sao vàng */}
          <g transform="translate(22, 98) scale(0.75)">
            <rect x="-2" y="24" width="4" height="8" fill="#78350F" />
            <polygon points="0,12 -13,24 13,24" fill="#047857" />
            <path d="M-13 24 Q0 20 13 24" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
            <polygon points="0,2 -10,14 10,14" fill="#059669" />
            <path d="M-10 14 Q0 10 10 14" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
            <polygon points="0,-7 -7,4 7,4" fill="#10B981" />
            <polygon points="0,-11 1.5,-7.5 5,-7.5 2.5,-5 3.5,-1.5 0,-3.5 -3.5,-1.5 -2.5,-5 -5,-7.5 -1.5,-7.5" fill="#FDE047" />
          </g>

          {/* ── CHÚ BÉ NGƯỜI TUYẾT NOEL CHIBI ĐÁNG YÊU ── */}
          <g transform="translate(70, 64)">
            {/* Quả cầu tuyết thân dưới */}
            <circle cx="0" cy="28" r="21" fill="url(#snowBall)" stroke="#BAE6FD" strokeWidth="1.5" />
            {/* 3 nút áo gỗ nâu */}
            <circle cx="0" cy="20" r="2" fill="#78350F" />
            <circle cx="0" cy="28" r="2" fill="#78350F" />
            <circle cx="0" cy="36" r="2" fill="#78350F" />

            {/* Quả cầu tuyết đầu */}
            <circle cx="0" cy="0" r="16" fill="url(#snowBall)" stroke="#BAE6FD" strokeWidth="1.5" />

            {/* Khăn len sọc đỏ trắng ấm áp */}
            <path d="M-14 9 Q0 15 14 9" stroke="#DC2626" strokeWidth="6" strokeLinecap="round" fill="none" />
            <path d="M-14 9 Q0 15 14 9" stroke="#FFFFFF" strokeWidth="5" strokeDasharray="3,3" strokeLinecap="round" fill="none" />
            {/* Đuôi khăn len rủ */}
            <path d="M5 11 L8 28 L14 28 L11 11 Z" fill="#DC2626" stroke="#B91C1C" strokeWidth="0.8" />
            <rect x="7" y="27" width="8" height="2" fill="#FFFFFF" />

            {/* Mắt to tròn long lanh, má hồng ửng lạnh */}
            <circle cx="-5" cy="-2" r="2.8" fill="#0F172A" />
            <circle cx="-4" cy="-3.5" r="1.2" fill="#FFFFFF" />
            <circle cx="5" cy="-2" r="2.8" fill="#0F172A" />
            <circle cx="6" cy="-3.5" r="1.2" fill="#FFFFFF" />
            <circle cx="-9" cy="3" r="3" fill="#FDA4AF" opacity="0.8" />
            <circle cx="9" cy="3" r="3" fill="#FDA4AF" opacity="0.8" />
            {/* Mũi cà rốt cam 3D */}
            <polygon points="0,0 12,2 0,4" fill="#EA580C" stroke="#C2410C" strokeWidth="0.6" />
            {/* Nụ cười than đá xinh xắn */}
            <circle cx="-3" cy="7" r="1" fill="#334155" />
            <circle cx="0" cy="8.5" r="1" fill="#334155" />
            <circle cx="3" cy="7" r="1" fill="#334155" />

            {/* Mũ Noel đỏ có cục bông trắng lúc lắc */}
            <rect x="-15" y="-14" width="30" height="6" rx="3" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="0.8" />
            <path d="M-13 -13 C-6 -30 14 -32 20 -20 L13 -13 Z" fill="#DC2626" stroke="#B91C1C" strokeWidth="1" />
            <circle cx="21" cy="-19" r="5" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="0.8" />

            {/* Đôi tay cành cây đeo găng len đỏ ấm cúng */}
            <line x1="-15" y1="20" x2="-24" y2="12" stroke="#78350F" strokeWidth="2" strokeLinecap="round" />
            <ellipse cx="-25" cy="11" rx="5" ry="4" fill="#DC2626" stroke="#FFFFFF" strokeWidth="0.8" />
            <line x1="15" y1="20" x2="25" y2="14" stroke="#78350F" strokeWidth="2" strokeLinecap="round" />
            <ellipse cx="26" cy="13" rx="5" ry="4" fill="#DC2626" stroke="#FFFFFF" strokeWidth="0.8" />
          </g>

          {/* ── HỘP QUÀ GIÁNG SINH NOEL LỘNG LẪY ── */}
          <g transform="translate(148, 80) rotate(8)">
            <rect x="-24" y="-20" width="48" height="42" rx="4" fill="url(#giftRed)" stroke="#FFD166" strokeWidth="2" />
            <rect x="-26" y="-24" width="52" height="8" rx="2" fill="#991B1B" stroke="#FFD166" strokeWidth="1.5" />
            {/* Nơ ruy băng vàng kim chữ thập */}
            <rect x="-5" y="-24" width="10" height="46" fill="#FFD166" stroke="#F59E0B" strokeWidth="0.6" />
            <rect x="-24" y="-3" width="48" height="8" fill="#FFD166" stroke="#F59E0B" strokeWidth="0.6" />
            {/* Nơ bướm to trên nắp hộp */}
            <ellipse cx="-8" cy="-28" rx="8" ry="5" transform="rotate(-25 -8 -28)" fill="#FFD166" stroke="#D97706" strokeWidth="0.8" />
            <ellipse cx="8" cy="-28" rx="8" ry="5" transform="rotate(25 8 -28)" fill="#FFD166" stroke="#D97706" strokeWidth="0.8" />
            <circle cx="0" cy="-26" r="3.5" fill="#F59E0B" />
            {/* Tag thiệp Noel chữ nổi */}
            <rect x="-18" y="8" width="36" height="14" rx="3" fill="#FFFFFF" />
            <text x="0" y="19" textAnchor="middle" fontSize="10" fontWeight="900" fill="#B91C1C" letterSpacing="1">
              NOEL
            </text>
          </g>
        </svg>
      )}

      {/* ☀️ MÙA HÈ: Bé Chibi Đi Biển Tropical phao bơi Vịt Vàng, que kem dưa hấu, ván lướt sóng SUMMER */}
      {themeId === 'summer' && (
        <svg width="210" height="150" viewBox="0 0 210 150" fill="none" className="overflow-visible drop-shadow-md">
          <defs>
            <linearGradient id="waveSummer" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#087EAD" />
              <stop offset="50%" stopColor="#26B9D5" />
              <stop offset="100%" stopColor="#087E79" />
            </linearGradient>
            <linearGradient id="surfGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#26B9D5" />
              <stop offset="50%" stopColor="#087EAD" />
              <stop offset="100%" stopColor="#065A7C" />
            </linearGradient>
          </defs>

          {/* Làn sóng biển xanh nhiệt đới dập dềnh bọt trắng */}
          <path
            d="M5 138 C40 120 70 148 110 132 C150 118 175 142 205 130 L205 150 L5 150 Z"
            fill="url(#waveSummer)"
            opacity="0.9"
          />
          <path d="M15 144 C50 128 85 152 125 138 C155 128 180 146 200 136" stroke="#EAFBFF" strokeWidth="2" strokeLinecap="round" />

          {/* Sao biển cam san hô & vỏ sò ngọc trai góc trái */}
          <polygon
            points="22,118 24,124 30,124 25,128 27,134 22,130 17,134 19,128 14,124 20,124"
            fill="#FB923C"
            stroke="#EA580C"
            strokeWidth="0.8"
          />
          <circle cx="34" cy="130" r="3.5" fill="#FEF08A" stroke="#D97706" strokeWidth="0.6" />

          {/* ── BÉ CHIBI ĐI BIỂN PHAO BƠI VỊT VÀNG SIÊU CƯNG ── */}
          <g transform="translate(68, 62)">
            {/* Phao bơi Vịt Vàng (phần lưng) */}
            <ellipse cx="0" cy="34" rx="27" ry="12" fill="#FBBF24" stroke="#D97706" strokeWidth="1.2" />

            {/* Thân & Áo cộc tay hoa lá nhiệt đới */}
            <path d="M-15 14 C-18 26 -12 36 0 36 C12 36 18 26 15 14 Z" fill="#087E79" stroke="#065A7C" strokeWidth="1" />
            {/* Họa tiết hoa Hawaii trên áo */}
            <circle cx="-5" cy="22" r="1.5" fill="#FFD166" />
            <circle cx="6" cy="24" r="1.5" fill="#FFD166" />
            <circle cx="0" cy="30" r="1.5" fill="#FFD166" />

            {/* Phao bơi Vịt Vàng (phần vành trước ôm lấy bé) */}
            <path d="M-25 34 C-25 45 -12 49 0 49 C12 49 25 45 25 34" stroke="#D97706" strokeWidth="9" strokeLinecap="round" />
            <path d="M-25 34 C-25 45 -12 49 0 49 C12 49 25 45 25 34" stroke="#FBBF24" strokeWidth="7" strokeLinecap="round" />
            {/* Đầu chú Vịt Vàng nhô ra phía trước */}
            <g transform="translate(18, 16)">
              <circle cx="7" cy="6" r="7.5" fill="#FDE047" stroke="#D97706" strokeWidth="0.8" />
              {/* Mỏ vịt cam */}
              <ellipse cx="14" cy="7" rx="4" ry="2.2" fill="#EA580C" />
              {/* Mắt vịt to tròn */}
              <circle cx="7" cy="4" r="1.6" fill="#0F172A" />
              <circle cx="8" cy="3.5" r="0.6" fill="#FFFFFF" />
            </g>

            {/* Khuôn mặt Chibi tươi tắn đáng yêu */}
            <ellipse cx="0" cy="4" rx="14" ry="12" fill="#FED7AA" />
            <ellipse cx="-8" cy="8" rx="3.5" ry="2" fill="#FDA4AF" opacity="0.8" />
            <ellipse cx="8" cy="8" rx="3.5" ry="2" fill="#FDA4AF" opacity="0.8" />
            {/* Đôi mắt cười tít tinh nghịch */}
            <circle cx="-6" cy="4" r="2.6" fill="#0F172A" />
            <circle cx="-5" cy="3" r="1" fill="#FFFFFF" />
            <circle cx="6" cy="4" r="2.6" fill="#0F172A" />
            <circle cx="7" cy="3" r="1" fill="#FFFFFF" />
            <path d="M-4 9 Q0 14 4 9" stroke="#E11D48" strokeWidth="1.8" strokeLinecap="round" fill="none" />

            {/* Mũ cói đi biển vành rộng uốn lượn cài hoa dâm bụt hồng */}
            <ellipse cx="0" cy="-6" rx="22" ry="7" fill="#FDE047" stroke="#D97706" strokeWidth="1" />
            <path d="M-13 -6 C-14 -18 14 -18 13 -6 Z" fill="#FDE047" stroke="#D97706" strokeWidth="1" />
            {/* Dải ruy băng xanh đại dương quanh nón */}
            <rect x="-13" y="-8" width="26" height="3" fill="#087EAD" />
            {/* Kính râm sành điệu cài trên nón */}
            <g transform="translate(0, -9)">
              <ellipse cx="-6" cy="0" rx="5" ry="3.5" fill="#0284C7" stroke="#FFD166" strokeWidth="1" />
              <ellipse cx="6" cy="0" rx="5" ry="3.5" fill="#0284C7" stroke="#FFD166" strokeWidth="1" />
              <line x1="-1" y1="0" x2="1" y2="0" stroke="#FFD166" strokeWidth="1.2" />
            </g>
            {/* Hoa dâm bụt đỏ thắm cài vành nón */}
            <g transform="translate(14, -8) scale(0.65)">
              <circle cx="-3" cy="-3" r="3.5" fill="#EF4444" />
              <circle cx="3" cy="-3" r="3.5" fill="#EF4444" />
              <circle cx="0" cy="3" r="3.5" fill="#EF4444" />
              <circle cx="0" cy="0" r="1.5" fill="#FEF08A" />
            </g>

            {/* Tay bé cầm que kem dưa hấu 3 tầng mát lạnh */}
            <g transform="translate(-18, 16)">
              <rect x="-1.5" y="8" width="3" height="8" rx="1" fill="#D97706" />
              <path d="M-7 8 L0 -8 L7 8 Z" fill="#EF4444" stroke="#B91C1C" strokeWidth="0.8" />
              <path d="M-7 8 Q0 10 7 8" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" fill="none" />
              <circle cx="-2" cy="1" r="0.8" fill="#0F172A" />
              <circle cx="2" cy="3" r="0.8" fill="#0F172A" />
              <circle cx="0" cy="9" r="3" fill="#FED7AA" />
            </g>
          </g>

          {/* ── CHIẾC VÁN LƯỚT SÓNG TROPICAL "SUMMER" ── */}
          <g transform="translate(150, 78) rotate(14)">
            {/* Thân ván lướt sóng uốn lượn thon gọn */}
            <path
              d="M0 -42 C14 -20 16 20 0 45 C-16 20 -14 -20 0 -42 Z"
              fill="url(#surfGradient)"
              stroke="#FFD166"
              strokeWidth="2.2"
            />
            {/* Đường sọc ánh kim giữa ván */}
            <path d="M0 -40 C6 -15 6 15 0 43" stroke="#FFD166" strokeWidth="1.5" fill="none" />
            {/* Mặt trời tỏa nắng trên ván */}
            <circle cx="0" cy="-18" r="6" fill="#FFD166" stroke="#F59E0B" strokeWidth="0.8" />
            {/* Dòng chữ typographic thể thao biển */}
            <text
              x="0"
              y="6"
              textAnchor="middle"
              fontSize="12"
              fontWeight="900"
              fill="#FFFFFF"
              letterSpacing="1"
              style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))' }}
            >
              SUMMER
            </text>
            <text x="0" y="20" textAnchor="middle" fontSize="8" fontWeight="800" fill="#FFD166">
              RỰC RỠ
            </text>
          </g>
        </svg>
      )}

      {/* 🍂 MÙA THU: Bé Chibi Tựu Trường Tri Thức, áo len cổ lọ, kính tròn, chồng sách & chú sóc nhỏ */}
      {themeId === 'autumn' && (
        <svg width="210" height="150" viewBox="0 0 210 150" fill="none" className="overflow-visible drop-shadow-md">
          <defs>
            <linearGradient id="autumnWave" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#70452F" />
              <stop offset="50%" stopColor="#B85C38" />
              <stop offset="100%" stopColor="#E9B85D" />
            </linearGradient>
            <linearGradient id="parchmentBadge" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FFF3DF" />
              <stop offset="100%" stopColor="#FED7AA" />
            </linearGradient>
          </defs>

          {/* Thảm lá phong mùa thu uốn lượn */}
          <path
            d="M10 135 C40 122 75 145 110 130 C145 118 175 140 205 130 L205 150 L10 150 Z"
            fill="url(#autumnWave)"
            opacity="0.85"
          />

          {/* Lá phong bay & quả sồi acorns */}
          <g transform="translate(22, 118) scale(0.65) rotate(15)">
            <path
              d="M0 -8 L3 -4 L7 -5 L5 -1 L8 2 L3 3 L4 7 L0 4 L-4 7 L-3 3 L-8 2 L-5 -1 L-7 -5 L-3 -4 Z"
              fill="#E9B85D"
              stroke="#B85C38"
              strokeWidth="0.8"
            />
            <line x1="0" y1="4" x2="0" y2="8" stroke="#70452F" strokeWidth="1" />
          </g>
          <g transform="translate(36, 128) scale(0.5) rotate(-20)">
            <path
              d="M0 -8 L3 -4 L7 -5 L5 -1 L8 2 L3 3 L4 7 L0 4 L-4 7 L-3 3 L-8 2 L-5 -1 L-7 -5 L-3 -4 Z"
              fill="#EA580C"
              stroke="#70452F"
              strokeWidth="0.8"
            />
          </g>
          <g transform="translate(14, 136)">
            <ellipse cx="0" cy="0" rx="3.5" ry="4.5" fill="#B45309" />
            <ellipse cx="0" cy="-3.5" rx="4" ry="2" fill="#78350F" />
            <line x1="0" y1="-3.5" x2="0" y2="-6" stroke="#78350F" strokeWidth="1" />
          </g>

          {/* ── BÉ CHIBI TỰU TRƯỜNG TRI THỨC CÙNG BẠN SÓC ── */}
          <g transform="translate(68, 62)">
            {/* Áo len dệt cổ lọ mùa thu terracotta ấm áp */}
            <path d="M-16 16 C-20 32 -14 48 0 48 C14 48 20 32 16 16 Z" fill="#B85C38" stroke="#70452F" strokeWidth="1.2" />
            {/* Khăn quàng cổ ca-rô vàng nâu */}
            <rect x="-14" y="14" width="28" height="6" rx="3" fill="#E9B85D" stroke="#D97706" strokeWidth="0.8" />
            <path d="M4 17 L7 30 L13 30 L10 17 Z" fill="#E9B85D" stroke="#D97706" strokeWidth="0.8" />

            {/* Mái tóc nâu bồng bềnh & Mũ Beret họa sĩ sang trọng */}
            <ellipse cx="0" cy="4" rx="14" ry="12" fill="#FED7AA" />
            <circle cx="-13" cy="4" r="5" fill="#70452F" />
            <circle cx="13" cy="4" r="5" fill="#70452F" />
            <ellipse cx="0" cy="-6" rx="18" ry="9" fill="#70452F" stroke="#451A03" strokeWidth="1" />
            <line x1="0" y1="-15" x2="0" y2="-12" stroke="#451A03" strokeWidth="1.5" strokeLinecap="round" />

            {/* Kính mắt tròn tri thức vàng kim */}
            <circle cx="-6" cy="4" r="4.5" fill="none" stroke="#E9B85D" strokeWidth="1.2" />
            <circle cx="6" cy="4" r="4.5" fill="none" stroke="#E9B85D" strokeWidth="1.2" />
            <line x1="-1.5" y1="4" x2="1.5" y2="4" stroke="#E9B85D" strokeWidth="1.2" />
            {/* Mắt long lanh sau tròng kính */}
            <circle cx="-6" cy="4" r="2.5" fill="#0F172A" />
            <circle cx="-5" cy="3" r="1" fill="#FFFFFF" />
            <circle cx="6" cy="4" r="2.5" fill="#0F172A" />
            <circle cx="7" cy="3" r="1" fill="#FFFFFF" />
            <ellipse cx="-9" cy="8" rx="3" ry="1.8" fill="#FDA4AF" opacity="0.8" />
            <ellipse cx="9" cy="8" rx="3" ry="1.8" fill="#FDA4AF" opacity="0.8" />
            <path d="M-3 9 Q0 12 3 9" stroke="#E11D48" strokeWidth="1.4" strokeLinecap="round" fill="none" />

            {/* Chồng Sách Tri Thức bìa cứng trên tay */}
            <rect x="-16" y="27" width="32" height="6" rx="1.5" fill="#1E3A8A" stroke="#0F172A" strokeWidth="0.8" />
            <rect x="-14" y="28" width="28" height="4" fill="#F8FAFC" />
            <rect x="-14" y="21" width="28" height="6" rx="1.5" fill="#D98E36" stroke="#70452F" strokeWidth="0.8" />
            <rect x="-12" y="22" width="24" height="4" fill="#F8FAFC" />
            <rect x="-12" y="16" width="24" height="5" rx="1.5" fill="#B85C38" stroke="#70452F" strokeWidth="0.8" />
            <circle cx="-14" cy="24" r="3.2" fill="#FED7AA" />
            <circle cx="14" cy="24" r="3.2" fill="#FED7AA" />

            {/* Chú Sóc nhỏ lông cam ôm hạt dẻ trên vai bé */}
            <g transform="translate(18, 12) scale(0.6)">
              <path d="M4 14 C16 10 18 -4 8 -10 C0 -14 -6 -6 0 0 C4 6 2 12 4 14 Z" fill="#EA580C" stroke="#70452F" strokeWidth="1" />
              <ellipse cx="0" cy="6" rx="6" ry="8" fill="#D97706" />
              <circle cx="-4" cy="-2" r="5" fill="#D97706" />
              <circle cx="-6" cy="-6" r="2" fill="#D97706" />
              <circle cx="-5" cy="-2" r="1.2" fill="#0F172A" />
              <circle cx="-8" cy="4" r="2.2" fill="#78350F" />
            </g>
          </g>

          {/* ── BẢNG DA THƯ PHÁP CỔ ĐIỂN "TỰU TRƯỜNG" ── */}
          <g transform="translate(146, 80) rotate(10)">
            <rect x="-24" y="-30" width="48" height="60" rx="6" fill="url(#parchmentBadge)" stroke="#E9B85D" strokeWidth="2.5" />
            <rect x="-20" y="-26" width="40" height="52" rx="3" fill="none" stroke="#D98E36" strokeWidth="1" strokeDasharray="2,2" />
            {/* Dấu sáp niêm phong đỏ mộc */}
            <circle cx="0" cy="-14" r="7.5" fill="#B85C38" stroke="#E9B85D" strokeWidth="1" />
            <polygon points="0,-17 1.5,-15 3.5,-15 2,-13 3,-10 0,-12 -3,-10 -2,-13 -3.5,-15 -1.5,-15" fill="#FEF08A" />
            <text x="0" y="8" textAnchor="middle" fontSize="11" fontWeight="900" fill="#70452F" style={{ fontFamily: 'serif' }}>
              TỰU TRƯỜNG
            </text>
            <text x="0" y="20" textAnchor="middle" fontSize="8" fontWeight="800" fill="#B85C38" letterSpacing="0.5">
              TRI THỨC
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
