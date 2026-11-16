/**
 * QuizGen AI - Dynamic System Themes & Festive Seasons Engine
 * Quản lý chủ đề hệ thống toàn trường theo mùa và các dịp lễ
 */

export type SystemThemeId =
  | 'default'
  | 'spring'
  | 'summer'
  | 'autumn'
  | 'winter'
  | 'victory_30_4'
  | 'national_day_2_9';

export type ParticleType =
  | 'none'
  | 'flower_petals'
  | 'sparkles'
  | 'leaves'
  | 'snowflakes'
  | 'stars_peace';

export interface ThemeColors {
  primary: string;           // Màu chủ đạo (nút chính, tiêu đề)
  primaryHover: string;      // Màu khi hover nút chính
  secondary: string;         // Màu phụ
  accent: string;            // Màu điểm nhấn (vàng kim, cam,...)
  bgGradient: string;        // Gradient nền trang
  cardBorder: string;        // Viền thẻ
  badgeBg: string;           // Nền badge mùa lễ
  badgeText: string;         // Chữ badge mùa lễ
  glowColor: string;         // Màu phát sáng nhẹ viền
}

export interface ThemeConfig {
  id: SystemThemeId;
  name: string;
  seasonLabel: string;
  tagline: string;
  greetingTitle: string;
  greetingSubtitle: string;
  colors: ThemeColors;
  particleType: ParticleType;
  particleCount: number;
  hasStickerCorner: boolean;
  hasLogoAccessory: boolean;
  stickerDescription: string;
  previewGradient: string;
}

export const SYSTEM_THEMES: Record<SystemThemeId, ThemeConfig> = {
  default: {
    id: 'default',
    name: 'Mặc Định (Academic Modern)',
    seasonLabel: 'Chuẩn Sư Phạm UTH',
    tagline: 'Giao diện học thuật thanh lịch, tối giản và tập trung cao độ',
    greetingTitle: 'Hệ Thống Khảo Thí & Ngân Hàng Đề Thi UTH',
    greetingSubtitle: 'Nền tảng sinh đề thi tự động ứng dụng Trí tuệ Nhân tạo',
    colors: {
      primary: '#008689',
      primaryHover: '#006F72',
      secondary: '#142B45',
      accent: '#00A3A8',
      bgGradient: 'from-slate-50 via-white to-teal-50/20',
      cardBorder: 'border-slate-200',
      badgeBg: 'bg-teal-50',
      badgeText: 'text-[#008689]',
      glowColor: 'rgba(0,134,137,0.15)'
    },
    particleType: 'none',
    particleCount: 0,
    hasStickerCorner: false,
    hasLogoAccessory: false,
    stickerDescription: 'Giao diện phẳng tiêu chuẩn, khiên học thuật UTH nguyên bản',
    previewGradient: 'from-[#008689] to-[#142B45]'
  },

  spring: {
    id: 'spring',
    name: 'Tết & Mùa Xuân (Spring & Tet)',
    seasonLabel: '🌸 Xuân Ất Tỵ 2026',
    tagline: 'Mai vàng nở rộ, đào thắm khoe sắc, vạn sự như ý - đắc thắng thi cử',
    greetingTitle: 'Mừng Xuân Giảng Đường - Chúc Mừng Năm Mới',
    greetingSubtitle: 'Kính chúc Quý Thầy Cô năm mới An Khang Thịnh Vượng & Thành Công Rực Rỡ',
    colors: {
      primary: '#DA1C2D',
      primaryHover: '#B91C1C',
      secondary: '#991B1B',
      accent: '#F59E0B',
      bgGradient: 'from-amber-50/30 via-rose-50/20 to-orange-50/30',
      cardBorder: 'border-rose-200/80',
      badgeBg: 'bg-rose-50',
      badgeText: 'text-[#DA1C2D]',
      glowColor: 'rgba(218,28,45,0.2)'
    },
    particleType: 'flower_petals',
    particleCount: 12,
    hasStickerCorner: true,
    hasLogoAccessory: true,
    stickerDescription: 'Nhành mai vàng & đào phai e ấp, bao lì xì may mắn & lồng đèn đỏ lụa',
    previewGradient: 'from-[#DA1C2D] via-[#EA580C] to-[#F59E0B]'
  },

  summer: {
    id: 'summer',
    name: 'Mùa Hè Sôi Động (Summer Vibrant)',
    seasonLabel: '☀️ Mùa Hè Rực Rỡ',
    tagline: 'Phượng vĩ đỏ rực góc trường, tiếp sức mùa thi - năng động bứt phá',
    greetingTitle: 'Nắng Hè Rực Rỡ - Tiếp Sức Mùa Thi',
    greetingSubtitle: 'Đồng hành cùng Thầy Cô và Sinh viên trong các kỳ thi học kỳ xuất sắc',
    colors: {
      primary: '#0284C7',
      primaryHover: '#0369A1',
      secondary: '#075985',
      accent: '#EA580C',
      bgGradient: 'from-sky-50/30 via-white to-amber-50/20',
      cardBorder: 'border-sky-200/80',
      badgeBg: 'bg-sky-50',
      badgeText: 'text-[#0284C7]',
      glowColor: 'rgba(2,132,199,0.2)'
    },
    particleType: 'sparkles',
    particleCount: 10,
    hasStickerCorner: true,
    hasLogoAccessory: true,
    stickerDescription: 'Chùm hoa phượng vĩ đỏ thắm, cánh buồm tri thức & ánh dương hè tươi sáng',
    previewGradient: 'from-[#0284C7] via-[#0EA5E9] to-[#EA580C]'
  },

  autumn: {
    id: 'autumn',
    name: 'Mùa Thu Khai Trường (Autumn & School)',
    seasonLabel: '🍂 Mùa Thu Khai Trường',
    tagline: 'Lá phong vàng êm đềm, tiếng trống khai trường rộn rã bước chân',
    greetingTitle: 'Hân Hoan Năm Học Mới - Rộn Rã Giảng Đường',
    greetingSubtitle: 'Chào mừng Quý Thầy Cô và Tân Sinh viên bước vào hành trình tri thức mới',
    colors: {
      primary: '#D97706',
      primaryHover: '#B45309',
      secondary: '#92400E',
      accent: '#B45309',
      bgGradient: 'from-amber-50/40 via-orange-50/20 to-yellow-50/30',
      cardBorder: 'border-amber-200/80',
      badgeBg: 'bg-amber-50',
      badgeText: 'text-[#D97706]',
      glowColor: 'rgba(217,119,6,0.2)'
    },
    particleType: 'leaves',
    particleCount: 10,
    hasStickerCorner: true,
    hasLogoAccessory: true,
    stickerDescription: 'Nhành lá phong vàng nghệ thuật, quyển sách mở & chiếc bút máy tri thức',
    previewGradient: 'from-[#D97706] via-[#EA580C] to-[#B45309]'
  },

  winter: {
    id: 'winter',
    name: 'Mùa Đông & Giáng Sinh (Winter & Noel)',
    seasonLabel: '❄️ Giáng Sinh An Lành',
    tagline: 'Tuyết trắng tinh khôi, chuông ngân ấm áp, an lành hạnh phúc trọn vẹn',
    greetingTitle: 'Giáng Sinh An Lành & Mùa Đông Ấm Áp',
    greetingSubtitle: 'Kính chúc Giảng viên và Sinh viên mùa lễ hội ngập tràn yêu thương và bình an',
    colors: {
      primary: '#0284C7',
      primaryHover: '#0369A1',
      secondary: '#1E293B',
      accent: '#E11D48',
      bgGradient: 'from-slate-100 via-sky-50/30 to-blue-50/20',
      cardBorder: 'border-slate-200',
      badgeBg: 'bg-blue-50',
      badgeText: 'text-[#0284C7]',
      glowColor: 'rgba(2,132,199,0.2)'
    },
    particleType: 'snowflakes',
    particleCount: 14,
    hasStickerCorner: true,
    hasLogoAccessory: true,
    stickerDescription: 'Bông tuyết pha lê, nhành thông xanh, chuông bạc & nơ đỏ ấm áp',
    previewGradient: 'from-[#0284C7] via-[#38BDF8] to-[#E11D48]'
  },

  victory_30_4: {
    id: 'victory_30_4',
    name: 'Đại Lễ 30/4 & 1/5 (Chiến Thắng - Hòa Bình)',
    seasonLabel: '⭐ Kỷ Niệm 30/4 & 1/5',
    tagline: 'Tự hào non sông gấm vóc, hòa bình trường tồn - non nước ngàn năm',
    greetingTitle: 'Chào Mừng Ngày Giải Phóng Miền Nam 30/4 & Quốc Tế Lao Động 1/5',
    greetingSubtitle: 'Kỷ niệm trang sử hào hùng, tri ân thế hệ cha anh vì độc lập tự do dân tộc',
    colors: {
      primary: '#DC2626',
      primaryHover: '#B91C1C',
      secondary: '#991B1B',
      accent: '#EAB308',
      bgGradient: 'from-rose-50/30 via-amber-50/20 to-red-50/20',
      cardBorder: 'border-red-200/80',
      badgeBg: 'bg-red-50',
      badgeText: 'text-[#DC2626]',
      glowColor: 'rgba(220,38,38,0.2)'
    },
    particleType: 'stars_peace',
    particleCount: 8,
    hasStickerCorner: true,
    hasLogoAccessory: true,
    stickerDescription: 'Dải ruy băng Đỏ - Vàng chiến thắng & Chim bồ câu trắng hòa bình ngậm ô-liu',
    previewGradient: 'from-[#DC2626] via-[#E11D48] to-[#EAB308]'
  },

  national_day_2_9: {
    id: 'national_day_2_9',
    name: 'Quốc Khánh 2/9 (Tết Độc Lập Dân Tộc)',
    seasonLabel: '🇻🇳 Kỷ Niệm Quốc Khánh 2/9',
    tagline: 'Cờ đỏ sao vàng tung bay Ba Đình lịch sử, khát vọng hùng cường bất diệt',
    greetingTitle: 'Chào Mừng Ngày Quốc Khánh Nước CHXHCN Việt Nam (2/9/1945)',
    greetingSubtitle: 'Tự hào Tổ quốc Việt Nam muôn năm - Đoàn kết, Đổi mới, Vươn tầm Kỷ nguyên Mới',
    colors: {
      primary: '#B91C1C',
      primaryHover: '#991B1B',
      secondary: '#7F1D1D',
      accent: '#FACC15',
      bgGradient: 'from-red-50/30 via-yellow-50/20 to-amber-50/20',
      cardBorder: 'border-red-200/80',
      badgeBg: 'bg-red-50',
      badgeText: 'text-[#B91C1C]',
      glowColor: 'rgba(185,28,28,0.2)'
    },
    particleType: 'stars_peace',
    particleCount: 8,
    hasStickerCorner: true,
    hasLogoAccessory: true,
    stickerDescription: 'Lá Cờ Đỏ Sao Vàng trang nghiêm, đóa Sen vàng lịch sử & Ánh quang Ba Đình',
    previewGradient: 'from-[#B91C1C] via-[#DC2626] to-[#FACC15]'
  }
};
