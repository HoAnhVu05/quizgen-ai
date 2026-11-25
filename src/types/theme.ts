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
    seasonLabel: '🌸 Xuân Đinh Mùi 2027',
    tagline: 'Mai vàng nở rộ, đào thắm khoe sắc, mừng xuân Đinh Mùi 2027',
    greetingTitle: 'Hệ Thống Khảo Thí & Ngân Hàng Đề Thi UTH',
    greetingSubtitle: 'Chào mừng Xuân Đinh Mùi 2027. 🧧 Kính chúc quý thầy cô sức khỏe, thành công và nhiều may mắn!',
    colors: {
      primary: '#B82025',
      primaryHover: '#8F171C',
      secondary: '#8F171C',
      accent: '#E7B947',
      bgGradient: 'from-[#FFF8E9] via-[#FFF1F2] to-[#FFF8E9]',
      cardBorder: 'border-[#E7B947]/40',
      badgeBg: 'bg-[#FFF8E9]',
      badgeText: 'text-[#B82025]',
      glowColor: 'rgba(184,32,37,0.18)'
    },
    particleType: 'flower_petals',
    particleCount: 14,
    hasStickerCorner: true,
    hasLogoAccessory: true,
    stickerDescription: 'Bé Chibi Lân Sư Rồng cầm liễn Tết, nhành mai vàng, lồng đèn đỏ lụa',
    previewGradient: 'from-[#B82025] via-[#8F171C] to-[#E7B947]'
  },

  summer: {
    id: 'summer',
    name: 'Mùa Hạ Rực Rỡ (Modern Tropical Summer)',
    seasonLabel: '☀️ Mùa Hạ',
    tagline: 'Biển xanh, cát vàng, ánh dương nhiệt đới và bứt phá sáng tạo',
    greetingTitle: 'Hệ Thống Khảo Thí & Ngân Hàng Đề Thi UTH',
    greetingSubtitle: 'Chào đón mùa hè rực rỡ! ☀️ Khơi nguồn tri thức – Bứt phá sáng tạo – Chinh phục những mục tiêu mới!',
    colors: {
      primary: '#087EAD',
      primaryHover: '#066890',
      secondary: '#087E79',
      accent: '#FFD166',
      bgGradient: 'from-[#EAFBFF] via-white to-[#EAFBFF]',
      cardBorder: 'border-[#26B9D5]/35',
      badgeBg: 'bg-[#EAFBFF]',
      badgeText: 'text-[#087EAD]',
      glowColor: 'rgba(8,126,173,0.18)'
    },
    particleType: 'sparkles',
    particleCount: 12,
    hasStickerCorner: false,
    hasLogoAccessory: true,
    stickerDescription: 'Bé Chibi Học Sinh năng động, sóng biển nhiệt đới & ánh dương rực rỡ',
    previewGradient: 'from-[#087EAD] via-[#26B9D5] to-[#FFD166]'
  },

  autumn: {
    id: 'autumn',
    name: 'Mùa Thu Tri Thức (Modern Autumn Academic)',
    seasonLabel: '🍂 Mùa Thu',
    tagline: 'Lá phong vàng ấm áp, thu hoạch tri thức và gặt hái thành công',
    greetingTitle: 'Hệ Thống Khảo Thí & Ngân Hàng Đề Thi UTH',
    greetingSubtitle: 'Chào mùa thu tri thức! 🍂 Thu hoạch kiến thức – Gặt hái thành công – Không ngừng phát triển!',
    colors: {
      primary: '#B85C38',
      primaryHover: '#9B4C2D',
      secondary: '#70452F',
      accent: '#D98E36',
      bgGradient: 'from-[#FFF3DF] via-white to-[#FFF3DF]',
      cardBorder: 'border-[#E9B85D]/40',
      badgeBg: 'bg-[#FFF3DF]',
      badgeText: 'text-[#B85C38]',
      glowColor: 'rgba(184,92,56,0.18)'
    },
    particleType: 'leaves',
    particleCount: 12,
    hasStickerCorner: false,
    hasLogoAccessory: true,
    stickerDescription: 'Bé Chibi Tựu Trường, lá phong vàng êm đềm & ánh nắng chiều ấm áp',
    previewGradient: 'from-[#B85C38] via-[#D98E36] to-[#E9B85D]'
  },

  winter: {
    id: 'winter',
    name: 'Mùa Đông Tinh Khiết (Modern Winter Academic)',
    seasonLabel: '❄️ Mùa Đông',
    tagline: 'Tuyết trắng tinh khôi, rừng thông tuyết phủ và vẻ đẹp thanh khiết',
    greetingTitle: 'Hệ Thống Khảo Thí & Ngân Hàng Đề Thi UTH',
    greetingSubtitle: 'Chào mùa đông! ❄️ Giữ lửa đam mê – Vững bước tri thức – Chinh phục những đỉnh cao mới!',
    colors: {
      primary: '#2563A6',
      primaryHover: '#1E4E85',
      secondary: '#243B64',
      accent: '#78BDE8',
      bgGradient: 'from-[#F3FAFF] via-white to-[#F3FAFF]',
      cardBorder: 'border-[#C8E8FA]',
      badgeBg: 'bg-[#F3FAFF]',
      badgeText: 'text-[#2563A6]',
      glowColor: 'rgba(37,99,166,0.18)'
    },
    particleType: 'snowflakes',
    particleCount: 14,
    hasStickerCorner: false,
    hasLogoAccessory: true,
    stickerDescription: 'Bé Chibi Người Tuyết, bông tuyết pha lê & ánh sáng băng giá',
    previewGradient: 'from-[#2563A6] via-[#78BDE8] to-[#C8E8FA]'
  },

  victory_30_4: {
    id: 'victory_30_4',
    name: 'Kỷ Niệm Ngày 30/4 (Modern Vietnamese Heritage)',
    seasonLabel: '⭐ Kỷ Niệm 30/4',
    tagline: 'Dấu mốc lịch sử 30/04/1975 – 30/04/2027: Thống nhất non sông, tự hào dân tộc',
    greetingTitle: 'Hệ Thống Khảo Thí & Ngân Hàng Đề Thi UTH',
    greetingSubtitle: 'Kỷ niệm Ngày Giải phóng miền Nam, thống nhất đất nước 30/4 (30/04/1975 – 30/04/2027). ⭐ Tự hào lịch sử – Tiếp bước tương lai – Phát triển tri thức Việt Nam!',
    colors: {
      primary: '#DA251D',
      primaryHover: '#8F171C',
      secondary: '#8F171C',
      accent: '#FFCD00',
      bgGradient: 'from-[#FFF3D1] via-white to-[#FFF3D1]',
      cardBorder: 'border-[#E7B947]/40',
      badgeBg: 'bg-[#FFF3D1]',
      badgeText: 'text-[#DA251D]',
      glowColor: 'rgba(218,37,29,0.18)'
    },
    particleType: 'stars_peace',
    particleCount: 8,
    hasStickerCorner: false,
    hasLogoAccessory: true,
    stickerDescription: 'Bé Chibi Bộ Đội, cờ đỏ sao vàng, đóa sen hồng & chim bồ câu hòa bình',
    previewGradient: 'from-[#DA251D] via-[#8F171C] to-[#FFCD00]'
  },

  national_day_2_9: {
    id: 'national_day_2_9',
    name: 'Kỷ Niệm Quốc Khánh 2/9 (Modern Vietnamese National Day)',
    seasonLabel: '🇻🇳 Quốc Khánh 2/9',
    tagline: 'Dấu mốc lịch sử 02/09/1945 – 02/09/2027: Độc lập – Tự do – Hạnh phúc',
    greetingTitle: 'Hệ Thống Khảo Thí & Ngân Hàng Đề Thi UTH',
    greetingSubtitle: 'Chào mừng Quốc khánh nước Cộng hòa Xã hội Chủ nghĩa Việt Nam 2/9 (02/09/1945 – 02/09/2027). 🇻🇳 Độc lập – Tự do – Hạnh phúc. Tự hào Việt Nam, vững bước tương lai!',
    colors: {
      primary: '#DA251D',
      primaryHover: '#B91C1C',
      secondary: '#8F171C',
      accent: '#FFCD00',
      bgGradient: 'from-[#FFF7E6] via-white to-[#FFF7E6]',
      cardBorder: 'border-[#E7B947]/40',
      badgeBg: 'bg-[#FFF7E6]',
      badgeText: 'text-[#DA251D]',
      glowColor: 'rgba(218,37,29,0.18)'
    },
    particleType: 'stars_peace',
    particleCount: 8,
    hasStickerCorner: false,
    hasLogoAccessory: true,
    stickerDescription: 'Bé Chibi Sao Vàng, Cờ Tổ quốc trang nghiêm, Ba Đình lịch sử & Sen vàng',
    previewGradient: 'from-[#DA251D] via-[#B91C1C] to-[#FFCD00]'
  }
};
