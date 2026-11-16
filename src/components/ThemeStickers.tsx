import React from 'react';
import { SystemThemeId } from '../types/theme';

interface ThemeCornerStickerProps {
  themeId: SystemThemeId;
  position?: 'top-right' | 'top-left';
  className?: string;
}

/**
 * Cành Hoa & Trang Trí Góc Trên Màn Hình (Tương tự ảnh mẫu của người dùng)
 * 100% pointer-events-none, không che khuất bất kỳ nút bấm hay thao tác nào.
 */
export const ThemeCornerSticker: React.FC<ThemeCornerStickerProps> = ({
  themeId,
  position = 'top-right',
  className = ''
}) => {
  if (themeId === 'default') return null;

  const isRight = position === 'top-right';
  const posClasses = isRight ? 'top-0 right-0' : 'top-0 left-0';
  const flipStyle = !isRight ? { transform: 'scaleX(-1)' } : undefined;

  return (
    <div
      className={`fixed ${posClasses} pointer-events-none select-none z-20 overflow-visible ${className}`}
      style={flipStyle}
      aria-hidden="true"
    >
      {/* 🌸 TẾT & MÙA XUÂN: Cành đào / mai rủ từ góc trên kèm lồng đèn đỏ mini như ảnh mẫu */}
      {themeId === 'spring' && (
        <svg width="240" height="180" viewBox="0 0 240 180" fill="none" className="drop-shadow-sm opacity-95">
          <defs>
            <linearGradient id="branchGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#451A03" />
              <stop offset="100%" stopColor="#78350F" />
            </linearGradient>
            <linearGradient id="lanternRed" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#EF4444" />
              <stop offset="100%" stopColor="#991B1B" />
            </linearGradient>
          </defs>

          {/* Cành đào uốn lượn tự nhiên từ mép góc */}
          <path d="M240 0 C180 15 140 45 80 80 C50 98 25 110 0 115" stroke="url(#branchGrad)" strokeWidth="4.5" strokeLinecap="round" />
          <path d="M165 38 C185 58 200 85 205 115" stroke="url(#branchGrad)" strokeWidth="3" strokeLinecap="round" />
          <path d="M110 65 C90 88 75 115 65 145" stroke="url(#branchGrad)" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M60 92 C45 112 35 130 20 145" stroke="url(#branchGrad)" strokeWidth="2" strokeLinecap="round" />

          {/* Nụ hoa & chồi lộc non */}
          <circle cx="130" cy="45" r="3.5" fill="#22C55E" />
          <circle cx="70" cy="85" r="3" fill="#22C55E" />
          <circle cx="210" cy="95" r="3" fill="#16A34A" />

          {/* Hoa Đào Hồng Thắm nở rộ (Tương tự ảnh mẫu) */}
          <g transform="translate(150, 36)">
            <circle cx="0" cy="-11" r="7.5" fill="#FDA4AF" />
            <circle cx="10" cy="-4" r="7.5" fill="#FB7185" />
            <circle cx="7" cy="9" r="7.5" fill="#FDA4AF" />
            <circle cx="-7" cy="9" r="7.5" fill="#FB7185" />
            <circle cx="-10" cy="-4" r="7.5" fill="#FDA4AF" />
            <circle cx="0" cy="0" r="4" fill="#E11D48" />
            <circle cx="0" cy="0" r="2" fill="#FDE047" />
          </g>

          <g transform="translate(95, 75)">
            <circle cx="0" cy="-9" r="6.5" fill="#FDA4AF" />
            <circle cx="9" cy="-3" r="6.5" fill="#FB7185" />
            <circle cx="6" cy="8" r="6.5" fill="#FDA4AF" />
            <circle cx="-6" cy="8" r="6.5" fill="#FB7185" />
            <circle cx="-9" cy="-3" r="6.5" fill="#FDA4AF" />
            <circle cx="0" cy="0" r="3.5" fill="#BE123C" />
          </g>

          <g transform="translate(195, 105)">
            <circle cx="0" cy="-9" r="6.5" fill="#FDA4AF" />
            <circle cx="9" cy="-3" r="6.5" fill="#FB7185" />
            <circle cx="6" cy="8" r="6.5" fill="#FDA4AF" />
            <circle cx="-6" cy="8" r="6.5" fill="#FB7185" />
            <circle cx="-9" cy="-3" r="6.5" fill="#FDA4AF" />
            <circle cx="0" cy="0" r="3.5" fill="#BE123C" />
          </g>

          {/* Hoa Mai Vàng Xen Kẽ */}
          <g transform="translate(45, 105)">
            <circle cx="0" cy="-8" r="6" fill="#FDE047" />
            <circle cx="8" cy="-3" r="6" fill="#FBBF24" />
            <circle cx="5" cy="7" r="6" fill="#FDE047" />
            <circle cx="-5" cy="7" r="6" fill="#FBBF24" />
            <circle cx="-8" cy="-3" r="6" fill="#FDE047" />
            <circle cx="0" cy="0" r="3" fill="#DC2626" />
          </g>

          {/* Lồng đèn đỏ treo rủ từ nhánh hoa đào */}
          <g transform="translate(185, 42)">
            <line x1="0" y1="-10" x2="0" y2="4" stroke="#D97706" strokeWidth="1.2" />
            <ellipse cx="0" cy="18" rx="12" ry="14" fill="url(#lanternRed)" stroke="#F59E0B" strokeWidth="1.2" />
            <ellipse cx="0" cy="18" rx="5" ry="13" fill="#B91C1C" />
            <rect x="-8" y="4" width="16" height="2.5" fill="#FDE047" rx="1" />
            <rect x="-8" y="29.5" width="16" height="2.5" fill="#FDE047" rx="1" />
            {/* Tua rua vàng */}
            <line x1="-3" y1="32" x2="-3" y2="46" stroke="#F59E0B" strokeWidth="1.2" />
            <line x1="0" y1="32" x2="0" y2="49" stroke="#FBBF24" strokeWidth="1.5" />
            <line x1="3" y1="32" x2="3" y2="46" stroke="#F59E0B" strokeWidth="1.2" />
          </g>
        </svg>
      )}

      {/* ⭐ 30/4 & 1/5: CỜ ĐỎ SAO VÀNG, HOA SEN & CÀNH CHIẾN THẮNG */}
      {themeId === 'victory_30_4' && (
        <svg width="240" height="180" viewBox="0 0 240 180" fill="none" className="drop-shadow-sm opacity-95">
          <defs>
            <linearGradient id="vFlagRed" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#EF4444" />
              <stop offset="100%" stopColor="#B91C1C" />
            </linearGradient>
          </defs>

          {/* Dải ruy băng vinh quang đỏ - vàng góc trên */}
          <path d="M240 0 L240 45 L45 240 L0 240 Z" fill="url(#vFlagRed)" opacity="0.9" />
          <path d="M240 8 L240 16 L16 240 L8 240 Z" fill="#FDE047" />
          <path d="M240 28 L240 36 L36 240 L28 240 Z" fill="#FDE047" />

          {/* Cờ Đỏ Sao Vàng Kiêu Hãnh Tung Bay */}
          <g transform="translate(130, 25)">
            <line x1="-4" y1="-8" x2="65" y2="85" stroke="#F59E0B" strokeWidth="3" strokeLinecap="round" />
            <circle cx="-4" cy="-8" r="4" fill="#FDE047" />
            <path
              d="M-3 -6 C20 -12 40 -3 65 -8 C70 12 65 32 60 45 C40 50 20 42 -3 47 Z"
              fill="url(#vFlagRed)"
              stroke="#B91C1C"
              strokeWidth="1.2"
            />
            {/* Sao Vàng Năm Cánh */}
            <g transform="translate(30, 19) scale(0.8)">
              <polygon
                points="0,-14 4,-4 14,-4 6,2 9,12 0,6 -9,12 -6,2 -14,-4 -4,-4"
                fill="#FFFF00"
                stroke="#F59E0B"
                strokeWidth="0.8"
              />
            </g>
          </g>

          {/* Chim Bồ Câu Trắng Hòa Bình sải cánh */}
          <g transform="translate(50, 95)">
            <path
              d="M0 0 C6 -10 20 -14 30 -10 C26 -2 18 5 10 11 C18 13 30 11 35 20 C24 20 12 17 6 13 C3 16 -2 21 -8 19 C-13 13 -6 5 0 0 Z"
              fill="#FFFFFF"
              stroke="#CBD5E1"
              strokeWidth="1.2"
            />
            <circle cx="2" cy="-4" r="1.5" fill="#0F172A" />
            <path d="M12 -8 C18 -14 25 -13 28 -8" stroke="#16A34A" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            <circle cx="18" cy="-12" r="1.8" fill="#22C55E" />
          </g>
        </svg>
      )}

      {/* 🇻🇳 QUỐC KHÁNH 2/9: CỜ ĐỎ SAO VÀNG TRANG NGHIÊM & HOA SEN BA ĐÌNH */}
      {themeId === 'national_day_2_9' && (
        <svg width="240" height="180" viewBox="0 0 240 180" fill="none" className="drop-shadow-sm opacity-95">
          <defs>
            <linearGradient id="natFlagRed" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#EF4444" />
              <stop offset="100%" stopColor="#991B1B" />
            </linearGradient>
          </defs>

          {/* Dải ruy băng góc */}
          <path d="M240 0 L240 45 L45 240 L0 240 Z" fill="url(#natFlagRed)" opacity="0.9" />
          <path d="M240 10 L240 20 L20 240 L10 240 Z" fill="#FDE047" />

          {/* Cờ Đỏ Sao Vàng tung bay */}
          <g transform="translate(130, 25)">
            <line x1="-4" y1="-8" x2="65" y2="85" stroke="#F59E0B" strokeWidth="3" strokeLinecap="round" />
            <circle cx="-4" cy="-8" r="4" fill="#FDE047" />
            <path
              d="M-3 -6 C20 -12 40 -3 65 -8 C70 12 65 32 60 45 C40 50 20 42 -3 47 Z"
              fill="url(#natFlagRed)"
              stroke="#B91C1C"
              strokeWidth="1.2"
            />
            <g transform="translate(30, 19) scale(0.8)">
              <polygon
                points="0,-14 4,-4 14,-4 6,2 9,12 0,6 -9,12 -6,2 -14,-4 -4,-4"
                fill="#FFFF00"
                stroke="#F59E0B"
                strokeWidth="0.8"
              />
            </g>
          </g>

          {/* Đóa sen vàng Ba Đình */}
          <g transform="translate(65, 95)">
            <path d="M0 0 C-8 -12 -14 -24 0 -36 C14 -24 8 -12 0 0 Z" fill="#FDE047" stroke="#D97706" strokeWidth="1" />
            <path d="M-4 -4 C-16 -12 -25 -20 -16 -32 C-8 -25 0 -16 -4 -4 Z" fill="#FEF08A" stroke="#D97706" strokeWidth="0.8" />
            <path d="M4 -4 C16 -12 25 -20 16 -32 C8 -25 0 -16 4 -4 Z" fill="#FEF08A" stroke="#D97706" strokeWidth="0.8" />
          </g>
        </svg>
      )}

      {/* ❄️ MÙA ĐÔNG: NHÀNH THÔNG TUYẾT & CHUÔNG GIÁNG SINH */}
      {themeId === 'winter' && (
        <svg width="220" height="170" viewBox="0 0 220 170" fill="none" className="drop-shadow-sm opacity-95">
          <path d="M220 0C165 20 120 50 50 95" stroke="#065F46" strokeWidth="5" strokeLinecap="round" />
          <g stroke="#047857" strokeWidth="2.5" strokeLinecap="round">
            <line x1="180" y1="18" x2="160" y2="5" />
            <line x1="160" y1="30" x2="140" y2="15" />
            <line x1="135" y1="48" x2="115" y2="35" />
            <line x1="105" y1="68" x2="85" y2="52" />
          </g>
          <circle cx="160" cy="5" r="4.5" fill="#F0F9FF" />
          <circle cx="140" cy="15" r="5" fill="#F0F9FF" />
          <circle cx="115" cy="35" r="5" fill="#F0F9FF" />

          {/* Chuông vàng Giáng Sinh */}
          <g transform="translate(120, 65)">
            <path d="M-8 8 C-10 20 -15 28 -20 32 L4 32 C-1 28 -6 20 -8 8 Z" fill="#F59E0B" stroke="#D97706" strokeWidth="1.2" />
            <circle cx="-8" cy="34" r="3" fill="#B45309" />
            <rect x="-12" y="2" width="24" height="8" rx="2" fill="#E11D48" />
            <circle cx="0" cy="6" r="4" fill="#BE123C" />
          </g>
        </svg>
      )}

      {/* ☀️ MÙA HÈ: CHÙM HOA PHƯỢNG VĨ ĐỎ THẮM */}
      {themeId === 'summer' && (
        <svg width="220" height="170" viewBox="0 0 220 170" fill="none" className="drop-shadow-sm opacity-95">
          <path d="M220 0C160 22 110 55 45 105" stroke="#78350F" strokeWidth="4.5" strokeLinecap="round" />
          <g fill="#16A34A" opacity="0.9">
            <ellipse cx="165" cy="25" rx="12" ry="4" transform="rotate(-30 165 25)" />
            <ellipse cx="130" cy="48" rx="12" ry="4" transform="rotate(-40 130 48)" />
            <ellipse cx="90" cy="75" rx="11" ry="4" transform="rotate(-35 90 75)" />
          </g>
          <g transform="translate(115, 52)">
            <ellipse cx="0" cy="-12" rx="10" ry="8" fill="#EF4444" />
            <ellipse cx="12" cy="-3" rx="10" ry="8" fill="#DC2626" />
            <ellipse cx="7" cy="10" rx="10" ry="8" fill="#F97316" />
            <ellipse cx="-7" cy="10" rx="10" ry="8" fill="#DC2626" />
            <ellipse cx="-12" cy="-3" rx="10" ry="8" fill="#EF4444" />
            <circle cx="0" cy="0" r="4" fill="#FEF08A" />
          </g>
        </svg>
      )}

      {/* 🍂 MÙA THU: CÀNH LÁ PHONG VÀNG RỰC RỠ */}
      {themeId === 'autumn' && (
        <svg width="220" height="170" viewBox="0 0 220 170" fill="none" className="drop-shadow-sm opacity-95">
          <path d="M220 0C160 25 95 65 25 110" stroke="#92400E" strokeWidth="4" strokeLinecap="round" />
          <g transform="translate(115, 55) scale(1.15)">
            <path d="M0 -22 L4 -10 L16 -12 L10 -2 L20 6 L9 8 L8 18 L0 12 L-8 18 L-9 8 L-20 6 L-10 -2 L-16 -12 L-4 -10 Z" fill="#D97706" stroke="#B45309" strokeWidth="0.8" />
            <line x1="0" y1="-20" x2="0" y2="16" stroke="#78350F" strokeWidth="1.2" />
          </g>
          <g transform="translate(55, 95) scale(0.85)">
            <path d="M0 -22 L4 -10 L16 -12 L10 -2 L20 6 L9 8 L8 18 L0 12 L-8 18 L-9 8 L-20 6 L-10 -2 L-16 -12 L-4 -10 Z" fill="#EA580C" stroke="#9A3412" strokeWidth="0.8" />
            <line x1="0" y1="-20" x2="0" y2="16" stroke="#78350F" strokeWidth="1" />
          </g>
        </svg>
      )}
    </div>
  );
};

interface ThemeHangingScrollsProps {
  themeId: SystemThemeId;
}

/**
 * ĐÔI CÂU ĐỐI / DẢI LIỄN ĐỎ TREO 2 BÊN HÔNG (Chuẩn xác theo ảnh mẫu tham khảo)
 * - Treo ở 2 bên mép ngoài (left & right flanks)
 * - Tự động ẩn trên màn hình nhỏ để KHÔNG BAO GIỜ che khuất form đăng nhập / bảng nội dung
 * - 100% pointer-events-none không cản trở chuột hay bàn phím
 */
export const ThemeHangingScrolls: React.FC<ThemeHangingScrollsProps> = ({ themeId }) => {
  if (themeId === 'default') return null;

  // Cấu hình nội dung câu đối / liễn đỏ theo từng chủ đề
  const getScrollContent = () => {
    switch (themeId) {
      case 'spring':
        return {
          leftText: ['Năm', 'Mới', 'Hạnh', 'Phúc', 'Bình', 'An', 'Đến'],
          rightText: ['Ngày', 'Xuân', 'Vinh', 'Hoa', 'Phú', 'Quý', 'Về'],
          subIcon: '🏮'
        };
      case 'victory_30_4':
        return {
          leftText: ['30/4', 'Đại', 'Thắng', 'Non', 'Sông', 'Thống', 'Nhất'],
          rightText: ['1/5', 'Quốc', 'Tế', 'Lao', 'Động', 'Vinh', 'Quang'],
          subIcon: '⭐'
        };
      case 'national_day_2_9':
        return {
          leftText: ['Độc', 'Lập', 'Tự', 'Do', 'Hạnh', 'Phúc'],
          rightText: ['Việt', 'Nam', 'Muôn', 'Năm', 'Hùng', 'Cường'],
          subIcon: '⭐'
        };
      case 'winter':
        return {
          leftText: ['Giáng', 'Sinh', 'An', 'Lành', 'Hạnh', 'Phúc'],
          rightText: ['Năm', 'Mới', 'Bình', 'An', 'Vạn', 'Sự', 'Lành'],
          subIcon: '🔔'
        };
      case 'summer':
        return {
          leftText: ['Nắng', 'Hè', 'Rực', 'Rỡ', 'Tiếp', 'Sức', 'Thi'],
          rightText: ['Tự', 'Tin', 'Vững', 'Bước', 'Đạt', 'Điểm', 'Cao'],
          subIcon: '🌺'
        };
      case 'autumn':
        return {
          leftText: ['Chào', 'Năm', 'Học', 'Mới', 'Rộn', 'Rã'],
          rightText: ['Vững', 'Bước', 'Tri', 'Thức', 'Vươn', 'Xa'],
          subIcon: '🔔'
        };
      default:
        return null;
    }
  };

  const content = getScrollContent();
  if (!content) return null;

  return (
    <div className="pointer-events-none select-none z-20" aria-hidden="true">
      {/* ── DẢI CÂU ĐỐI BÊN TRÁI (LEFT FLANK) ── */}
      <div className="fixed left-3 lg:left-6 xl:left-10 top-20 md:top-24 hidden lg:flex flex-col items-center animate-in fade-in slide-in-from-top-4 duration-500">
        {/* Dây treo vàng & núm treo */}
        <div className="w-1.5 h-1.5 rounded-full bg-amber-400 border border-amber-600 shadow-xs mb-0.5" />
        <div className="w-0.5 h-6 bg-amber-500" />

        {/* Thanh cuộn gỗ trên */}
        <div className="w-16 h-3 rounded-full bg-gradient-to-r from-amber-700 via-amber-500 to-amber-700 border border-amber-300 shadow-sm" />

        {/* Thân liễn đỏ gấm vàng (Thiết kế y hệt ảnh mẫu) */}
        <div className="w-14 bg-gradient-to-b from-[#B91C1C] via-[#DC2626] to-[#991B1B] border-2 border-[#FDE047] rounded-sm shadow-xl p-1.5 flex flex-col items-center space-y-1.5 relative overflow-hidden">
          {/* Họa tiết hoa văn viền vàng kim */}
          <div className="absolute inset-0.5 border border-dashed border-[#FDE047]/40 pointer-events-none" />

          {content.leftText.map((char, idx) => (
            <span
              key={idx}
              className="font-serif font-black text-xs sm:text-sm text-[#FDE047] drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)] tracking-widest leading-none select-none"
              style={{
                fontFamily: '"Times New Roman", "Playfair Display", serif',
                textShadow: '0 0 3px #F59E0B'
              }}
            >
              {char}
            </span>
          ))}
        </div>

        {/* Thanh cuộn gỗ dưới */}
        <div className="w-16 h-3 rounded-full bg-gradient-to-r from-amber-700 via-amber-500 to-amber-700 border border-amber-300 shadow-sm" />

        {/* Lồng đèn đỏ & tua rua vàng rủ dưới câu đối (Y hệt ảnh mẫu) */}
        <div className="flex flex-col items-center mt-0.5">
          <div className="w-0.5 h-4 bg-amber-500" />
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-red-500 to-red-800 border border-amber-400 shadow-md flex items-center justify-center text-xs">
            {content.subIcon}
          </div>
          {/* Tua rua vàng buông rủ */}
          <div className="w-0.5 h-6 bg-amber-400" />
          <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
        </div>
      </div>

      {/* ── DẢI CÂU ĐỐI BÊN PHẢI (RIGHT FLANK) ── */}
      <div className="fixed right-3 lg:right-6 xl:right-10 top-20 md:top-24 hidden lg:flex flex-col items-center animate-in fade-in slide-in-from-top-4 duration-500">
        {/* Dây treo vàng */}
        <div className="w-1.5 h-1.5 rounded-full bg-amber-400 border border-amber-600 shadow-xs mb-0.5" />
        <div className="w-0.5 h-6 bg-amber-500" />

        {/* Thanh cuộn gỗ trên */}
        <div className="w-16 h-3 rounded-full bg-gradient-to-r from-amber-700 via-amber-500 to-amber-700 border border-amber-300 shadow-sm" />

        {/* Thân liễn đỏ gấm vàng */}
        <div className="w-14 bg-gradient-to-b from-[#B91C1C] via-[#DC2626] to-[#991B1B] border-2 border-[#FDE047] rounded-sm shadow-xl p-1.5 flex flex-col items-center space-y-1.5 relative overflow-hidden">
          {/* Họa tiết viền vàng */}
          <div className="absolute inset-0.5 border border-dashed border-[#FDE047]/40 pointer-events-none" />

          {content.rightText.map((char, idx) => (
            <span
              key={idx}
              className="font-serif font-black text-xs sm:text-sm text-[#FDE047] drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)] tracking-widest leading-none select-none"
              style={{
                fontFamily: '"Times New Roman", "Playfair Display", serif',
                textShadow: '0 0 3px #F59E0B'
              }}
            >
              {char}
            </span>
          ))}
        </div>

        {/* Thanh cuộn gỗ dưới */}
        <div className="w-16 h-3 rounded-full bg-gradient-to-r from-amber-700 via-amber-500 to-amber-700 border border-amber-300 shadow-sm" />

        {/* Lồng đèn đỏ & tua rua vàng rủ dưới */}
        <div className="flex flex-col items-center mt-0.5">
          <div className="w-0.5 h-4 bg-amber-500" />
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-red-500 to-red-800 border border-amber-400 shadow-md flex items-center justify-center text-xs">
            {content.subIcon}
          </div>
          <div className="w-0.5 h-6 bg-amber-400" />
          <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
        </div>
      </div>
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
          ⭐
        </span>
      )}
      {themeId === 'national_day_2_9' && (
        <span className="text-xs -ml-1 -mt-2.5" title="Mừng Quốc Khánh 2/9">
          🇻🇳
        </span>
      )}
    </span>
  );
};
