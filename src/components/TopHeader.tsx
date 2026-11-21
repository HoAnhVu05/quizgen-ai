import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useTheme } from '../context/ThemeContext';
import {
  ShieldCheck,
  Cpu,
  LayoutDashboard,
  UploadCloud,
  Sparkles,
  CheckSquare,
  Database,
  ChevronRight,
  Check,
  Crown,
  Menu,
  Activity,
  Search,
  UserCog,
  LogOut,
  User,
  EyeOff,
  MessageSquare,
  Users,
  BookOpen,
  ArrowRight,
  CornerDownLeft,
  RefreshCw,
  X,
  CreditCard,
  Terminal,
} from 'lucide-react';
import { ScreenId, UserProfile, UserRole, UserSubscriptionInfo } from '../types';

interface TopHeaderProps {
  currentScreen: ScreenId;
  currentUser: UserProfile | null;
  subscriptionInfo?: UserSubscriptionInfo | null;
  onOpenPricingModal?: () => void;
  onLogout: () => void;
  onNavigate?: (screen: ScreenId) => void;
  onAdminTabChange?: (tab: string) => void;
  onRoleSwitch?: (newRole: UserRole) => void;
  onShowToast: (
    type: 'success' | 'info' | 'warning' | 'error',
    title: string,
    message: string
  ) => void;
  onToggleMobileMenu?: () => void;
  onOpenProfileModal?: () => void;
  unreadQGroupCount?: number;
}

interface NavCommand {
  id: string;
  title: string;
  category: 'workflow' | 'workspace' | 'account';
  categoryLabel: string;
  stepTag?: string;
  description: string;
  keywords: string[];
  screenId?: ScreenId;
  action?: () => void;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
}

const removeVietnameseTones = (str: string): string => {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
};

export const TopHeader: React.FC<TopHeaderProps> = ({
  currentScreen,
  currentUser,
  subscriptionInfo,
  onOpenPricingModal,
  onLogout,
  onNavigate,
  onAdminTabChange,
  onToggleMobileMenu,
  onOpenProfileModal,
  onShowToast,
  unreadQGroupCount,
}) => {
  const { currentTheme, activeThemeId, showParticles, toggleParticles } = useTheme();
  const isAdmin = currentUser?.role === 'admin';
  const isAdminScreen = currentScreen === 'admin_portal';
  const showAdminHeader = isAdmin || isAdminScreen;
  const [searchValue, setSearchValue] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Danh mục toàn bộ chức năng hệ thống để tìm kiếm nhanh
  const systemCommands = useMemo<NavCommand[]>(() => [
    {
      id: 'nav-upload',
      title: 'Kho Giáo trình & Thư viện Môn học',
      category: 'workflow',
      categoryLabel: 'Quy trình Biên soạn',
      stepTag: 'Bước 1',
      description: 'Nạp giáo trình PDF/Word, xem thư viện dùng chung, trích xuất mục lục sách',
      keywords: ['thư viện', 'thu vien', 'giáo trình', 'giao trinh', 'tài liệu', 'tai lieu', 'sách', 'sach', 'kho sách', 'pdf', 'word', 'upload', 'nạp sách', 'kho'],
      screenId: 'upload',
      icon: UploadCloud,
      iconBg: 'bg-teal-50',
      iconColor: 'text-[#008689]',
    },
    {
      id: 'nav-generate',
      title: 'Sinh Câu hỏi AI theo Ma trận Bloom',
      category: 'workflow',
      categoryLabel: 'Quy trình Biên soạn',
      stepTag: 'Bước 2',
      description: 'Cấu hình ma trận nhận thức Bloom (Nhận biết, Thông hiểu, Vận dụng), sinh đề thi tự động',
      keywords: ['sinh đề', 'sinh de', 'tạo câu hỏi', 'tao cau hoi', 'bloom', 'ma trận', 'ma tran', 'sinh câu hỏi', 'giữa kỳ', 'cuối kỳ', '15p', 'ai', 'tạo đề'],
      screenId: 'generate',
      icon: Sparkles,
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-600',
    },
    {
      id: 'nav-review',
      title: 'Đối soát Trích dẫn & Biên tập Đề',
      category: 'workflow',
      categoryLabel: 'Quy trình Biên soạn',
      stepTag: 'Bước 3',
      description: 'Đối soát từng câu hỏi với trích dẫn trang sách gốc, biên tập đáp án và gửi duyệt',
      keywords: ['đối soát', 'doi soat', 'biên tập', 'bien tap', 'sửa đề', 'trích dẫn', 'trich dan', 'sách', 'duyệt', 'nghiệm thu', 'review', 'sửa câu hỏi'],
      screenId: 'review',
      icon: CheckSquare,
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-600',
    },
    {
      id: 'nav-bank',
      title: 'Đóng gói & Xuất Bản Đề Thi',
      category: 'workflow',
      categoryLabel: 'Quy trình Biên soạn',
      stepTag: 'Bước 4',
      description: 'Trộn mã đề (101, 102...), xuất bản tệp Word, PDF kèm đáp án hoặc chuẩn QTI nạp Canvas/LMS',
      keywords: ['xuất đề', 'xuat de', 'đóng gói', 'dong goi', 'trộn đề', 'tron de', 'ngân hàng đề', 'word', 'pdf', 'qti', 'canvas', 'lms', 'in đề', 'xuất bản'],
      screenId: 'bank',
      icon: Database,
      iconBg: 'bg-purple-50',
      iconColor: 'text-purple-600',
    },
    {
      id: 'nav-dashboard',
      title: 'Tổng quan Học thuật (Dashboard)',
      category: 'workspace',
      categoryLabel: 'Không gian Làm việc',
      description: 'Trang chủ trung tâm, thống kê giáo trình, số câu hỏi đã sinh, lối tắt thư viện',
      keywords: ['tổng quan', 'tong quan', 'bảng điều khiển', 'trang chủ', 'dashboard', 'home', 'thống kê', 'học thuật'],
      screenId: 'dashboard',
      icon: LayoutDashboard,
      iconBg: 'bg-slate-100',
      iconColor: 'text-slate-700',
    },
    {
      id: 'nav-qgroup',
      title: 'Hội nhóm Chuyên môn Q-Group',
      category: 'workspace',
      categoryLabel: 'Không gian Làm việc',
      description: 'Trao đổi bộ môn, chat trực tiếp 1-1, gọi Huddle âm thanh, chia sẻ giáo trình chung',
      keywords: ['hội nhóm', 'hoi nhom', 'nhóm', 'nhom', 'qgroup', 'q-group', 'chat', 'nhắn tin', 'tin nhắn', 'kết bạn', 'huddle', 'trao đổi'],
      screenId: 'qgroup',
      icon: Users,
      iconBg: 'bg-purple-50',
      iconColor: 'text-purple-600',
    },
    {
      id: 'nav-forum',
      title: 'Diễn đàn Học thuật & Trao đổi',
      category: 'workspace',
      categoryLabel: 'Không gian Làm việc',
      description: 'Diễn đàn chia sẻ kinh nghiệm giảng dạy, đề cương môn học và ma trận đề thi',
      keywords: ['diễn đàn', 'dien dan', 'forum', 'bài viết', 'bình luận', 'thảo luận', 'chia sẻ'],
      screenId: 'forum',
      icon: MessageSquare,
      iconBg: 'bg-indigo-50',
      iconColor: 'text-indigo-600',
    },
    {
      id: 'nav-pricing',
      title: 'Nâng cấp Gói PRO / Đổi gói cước',
      category: 'account',
      categoryLabel: 'Tài khoản & Dịch vụ',
      description: 'Nâng cấp gói PRO 1 Tháng / 1 Năm, không giới hạn tải giáo trình và lượt sinh đề AI',
      keywords: ['gói', 'goi', 'pro', 'vip', 'nâng cấp', 'nang cap', 'bảng giá', 'mua gói', 'thanh toán', 'hạn mức', 'quota', 'pricing'],
      action: onOpenPricingModal,
      icon: Crown,
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-600',
    },
    {
      id: 'nav-profile',
      title: 'Hồ sơ Cá nhân & Khoa Bộ Môn',
      category: 'account',
      categoryLabel: 'Tài khoản & Dịch vụ',
      description: 'Xem thông tin giảng viên, cập nhật học hàm học vị, khoa, số điện thoại và lịch sử đơn hàng',
      keywords: ['hồ sơ', 'ho so', 'cá nhân', 'ca nhan', 'tài khoản', 'tai khoan', 'profile', 'thông tin', 'học hàm', 'giảng viên', 'khoa', 'bộ môn'],
      action: onOpenProfileModal,
      icon: User,
      iconBg: 'bg-slate-100',
      iconColor: 'text-slate-700',
    },
  ], [onOpenPricingModal, onOpenProfileModal]);

  // Bộ lọc tìm kiếm thông minh
  const filteredCommands = useMemo(() => {
    if (!searchValue.trim()) return systemCommands;
    const q = removeVietnameseTones(searchValue);
    return systemCommands.filter((cmd) => {
      const matchTitle = removeVietnameseTones(cmd.title).includes(q);
      const matchDesc = removeVietnameseTones(cmd.description).includes(q);
      const matchTag = cmd.stepTag && removeVietnameseTones(cmd.stepTag).includes(q);
      const matchKeywords = cmd.keywords.some((k) => removeVietnameseTones(k).includes(q));
      return matchTitle || matchDesc || matchTag || matchKeywords;
    });
  }, [searchValue, systemCommands]);

  // Phím tắt toàn cục Ctrl + K hoặc Cmd + K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
        setTimeout(() => searchInputRef.current?.focus(), 50);
      } else if (e.key === 'Escape') {
        setIsSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Click ngoài để đóng dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectCommand = (cmd: NavCommand) => {
    if (cmd.screenId && onNavigate) {
      onNavigate(cmd.screenId);
    } else if (cmd.action) {
      cmd.action();
    }
    setIsSearchOpen(false);
    setSearchValue('');
    onShowToast('info', 'Chuyển trang chức năng', cmd.title);
  };

  const getScreenMeta = (screen: ScreenId) => {
    switch (screen) {
      case 'admin_portal':
        return {
          label: 'Cổng Quản trị Hệ thống',
          shortLabel: 'Cổng Quản trị',
          icon: ShieldCheck,
          iconStyle: 'bg-teal-50 text-[#008689] border-teal-200',
        };
      case 'dashboard':
        return {
          label: 'Bảng điều khiển Biên soạn Học thuật',
          shortLabel: 'Tổng quan Học thuật',
          icon: LayoutDashboard,
          iconStyle: 'bg-slate-100 text-slate-700 border-slate-200',
        };
      case 'forum':
        return {
          label: 'Diễn đàn Học thuật & Trao đổi Chuyên môn',
          shortLabel: 'Diễn đàn',
          icon: MessageSquare,
          iconStyle: 'bg-indigo-50 text-indigo-600 border-indigo-200',
        };
      case 'qgroup':
        return {
          label: 'Hội Nhóm Chuyên Môn Q-Group',
          shortLabel: 'Hội nhóm Q-Group',
          icon: Users,
          iconStyle: 'bg-purple-50 text-purple-600 border-purple-200',
        };
      case 'upload':
        return {
          label: 'Bước 1/4: Kho Giáo trình & Tài liệu Môn học',
          shortLabel: 'Bước 1: Nạp Giáo trình',
          icon: UploadCloud,
          iconStyle: 'bg-teal-50 text-[#008689] border-teal-200',
        };
      case 'generate':
        return {
          label: 'Bước 2/4: Sinh Câu hỏi AI theo Ma trận Bloom',
          shortLabel: 'Bước 2: Sinh Đề AI',
          icon: Sparkles,
          iconStyle: 'bg-blue-50 text-blue-600 border-blue-200',
        };
      case 'review':
        return {
          label: 'Bước 3/4: Đối soát Trích dẫn Sách & Biên tập Câu hỏi',
          shortLabel: 'Bước 3: Đối soát Đề',
          icon: CheckSquare,
          iconStyle: 'bg-amber-50 text-amber-600 border-amber-200',
        };
      case 'bank':
        return {
          label: 'Bước 4/4: Phòng Đóng gói, Trộn Mã Đề & Xuất Bản Đề Thi',
          shortLabel: 'Bước 4: Xuất Đề Thi',
          icon: Database,
          iconStyle: 'bg-purple-50 text-purple-600 border-purple-200',
        };
      default:
        return {
          label: 'QuizGen AI',
          shortLabel: 'QuizGen AI',
          icon: Cpu,
          iconStyle: 'bg-slate-100 text-slate-700 border-slate-200',
        };
    }
  };

  const screenMeta = getScreenMeta(currentScreen);
  const ScreenIcon = screenMeta.icon;

  const userInitial = currentUser?.fullName
    ? currentUser.fullName.trim()[0].toUpperCase()
    : 'U';

  const userDisplayName = currentUser?.academicTitle
    ? `${currentUser.academicTitle} ${currentUser.fullName}`
    : currentUser?.fullName || 'Giảng viên UTH';

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onNavigate) {
      onNavigate('bank');
    }
  };

  return (
    <header
      className={`sticky top-0 ${
        showAdminHeader ? 'h-[72px]' : 'h-16'
      } bg-white border-b border-[#E5EDF5] px-2.5 sm:px-5 lg:px-6 flex items-center justify-between z-30 shrink-0 select-none gap-2 sm:gap-3 shadow-2xs transition-all w-full max-w-full overflow-x-hidden`}
    >
      {/* Left: Mobile Toggle + Screen Title & Breadcrumb */}
      <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 shrink">
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            className="relative p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 md:hidden transition-colors shrink-0"
            title="Mở menu điều hướng"
          >
            <Menu className="w-5 h-5" />
            {Boolean(unreadQGroupCount && unreadQGroupCount > 0 && currentScreen !== 'qgroup') && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-white animate-pulse" />
            )}
          </button>
        )}
        <div
          className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shrink-0 border transition-colors ${
            showAdminHeader
              ? 'bg-[#E4F7F7] text-[#008F95] border-[#E4F7F7]'
              : screenMeta.iconStyle
          } shadow-2xs`}
        >
          <ScreenIcon className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <h2 className={`text-xs sm:text-sm font-bold truncate leading-snug ${showAdminHeader ? 'text-[#142B45]' : 'text-slate-800'}`}>
              <span className="hidden xl:inline">{screenMeta.label}</span>
              <span className="xl:hidden">{screenMeta.shortLabel}</span>
            </h2>
            {activeThemeId !== 'default' && (
              <span
                className="hidden xl:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border shadow-2xs animate-in fade-in duration-300 shrink-0"
                style={{
                  backgroundColor: `${currentTheme.colors.primary}15`,
                  borderColor: `${currentTheme.colors.primary}40`,
                  color: currentTheme.colors.primary,
                }}
              >
                <span>{currentTheme.seasonLabel}</span>
              </span>
            )}
          </div>
          {showAdminHeader && (
            <p className="text-[11px] text-[#91A2B8] font-medium hidden lg:block leading-none mt-0.5">
              QuizGen AI - Admin Portal
            </p>
          )}
        </div>
      </div>

      {/* Middle: Spotlight Trigger Button on Header */}
      {!showAdminHeader && (
        <div className="flex items-center mx-1 lg:mx-3 shrink-0">
          {/* Ô tìm kiếm đầy đủ trên màn hình rộng */}
          <button
            type="button"
            onClick={() => {
              setIsSearchOpen(true);
              setTimeout(() => searchInputRef.current?.focus(), 80);
            }}
            className="hidden xl:flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-xl bg-slate-100/90 hover:bg-slate-200/70 border border-slate-200/80 text-xs text-slate-500 hover:text-slate-800 transition-all shadow-2xs cursor-pointer w-52 2xl:w-64 justify-between"
            title="Tìm kiếm chức năng hệ thống (Ctrl + K)"
          >
            <div className="flex items-center gap-2 min-w-0">
              <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate text-[11px]">Tìm chức năng...</span>
            </div>
            <kbd className="px-1.5 py-0.5 text-[9px] font-mono font-bold bg-white border border-slate-200 text-slate-400 rounded shadow-2xs shrink-0">
              Ctrl K
            </kbd>
          </button>

          {/* Nút tìm kiếm gọn icon cho tablet & màn hình hẹp */}
          <button
            type="button"
            onClick={() => {
              setIsSearchOpen(true);
              setTimeout(() => searchInputRef.current?.focus(), 80);
            }}
            className="xl:hidden w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-600 flex items-center justify-center transition-colors border border-slate-200/80 cursor-pointer shadow-2xs"
            title="Tìm kiếm chức năng hệ thống (Ctrl + K)"
          >
            <Search className="w-4 h-4 text-slate-500" />
          </button>

          {/* Nút làm mới trang nhanh cho thiết bị di động */}
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="md:hidden w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-600 flex items-center justify-center transition-colors border border-slate-200/80 cursor-pointer shadow-2xs active:scale-95"
            title="Tải lại trang (Làm mới dữ liệu)"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#008689]" />
          </button>
        </div>
      )}

      {/* Spotlight Command Palette Modal (Raycast / Mac Spotlight Style) */}
      {isSearchOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 backdrop-blur-sm bg-slate-900/50 animate-fade-in"
          onClick={() => setIsSearchOpen(false)}
        >
          <div
            ref={searchContainerRef}
            onClick={(e) => e.stopPropagation()}
            className="max-w-2xl w-full bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[75vh]"
          >
            {/* Spotlight Search Input */}
            <div className="p-4 border-b border-slate-100 flex items-center gap-3 bg-white">
              <Search className="w-5 h-5 text-teal-600 shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchValue}
                onChange={(e) => {
                  setSearchValue(e.target.value);
                  setSelectedIndex(0);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredCommands.length));
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % Math.max(1, filteredCommands.length));
                  } else if (e.key === 'Enter') {
                    e.preventDefault();
                    if (filteredCommands[selectedIndex]) {
                      handleSelectCommand(filteredCommands[selectedIndex]);
                    }
                  } else if (e.key === 'Escape') {
                    setIsSearchOpen(false);
                  }
                }}
                placeholder="Tìm trang hoặc chức năng: thư viện, sinh đề, đối soát, nhóm, xuất bản..."
                className="flex-1 text-sm text-slate-900 placeholder-slate-400 outline-none bg-transparent font-medium"
                autoFocus
              />
              {searchValue ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearchValue('');
                    searchInputRef.current?.focus();
                  }}
                  title="Xóa từ khóa tìm kiếm"
                  className="p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setIsSearchOpen(false)}
                title="Đóng thanh tìm kiếm (Phím ESC)"
                className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold bg-slate-100 hover:bg-rose-50 hover:text-[#da1c2d] hover:border-rose-200 border border-slate-200 text-slate-600 rounded-xl transition-all cursor-pointer shadow-2xs"
              >
                <X className="w-3.5 h-3.5" />
                <span>ESC</span>
              </button>
            </div>

            {/* Spotlight Results List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1 divide-y divide-slate-100">
              {filteredCommands.length === 0 ? (
                <div className="p-10 text-center text-slate-400 space-y-2">
                  <Search className="w-8 h-8 mx-auto text-slate-300" />
                  <p className="font-bold text-sm text-slate-700">Không tìm thấy chức năng phù hợp</p>
                  <p className="text-xs">
                    Thử tìm với từ khóa: &quot;thư viện&quot;, &quot;sinh đề&quot;, &quot;đối soát&quot;, &quot;nhóm&quot;, &quot;xuất đề&quot;...
                  </p>
                </div>
              ) : (
                filteredCommands.map((cmd, idx) => {
                  const Icon = cmd.icon;
                  const isSelected = idx === selectedIndex;
                  const isCurrent = cmd.screenId === currentScreen;

                  return (
                    <div
                      key={cmd.id}
                      onClick={() => handleSelectCommand(cmd)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`p-3 rounded-2xl cursor-pointer transition-all flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'bg-teal-50 text-teal-950 ring-1 ring-teal-200/90 shadow-2xs'
                          : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div
                          className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-2xs ${cmd.iconBg} ${cmd.iconColor}`}
                        >
                          <Icon className="w-5 h-5" />
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            {cmd.stepTag && (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-slate-100 text-slate-600 shrink-0">
                                {cmd.stepTag}
                              </span>
                            )}
                            <h4 className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                              {cmd.title}
                            </h4>
                            {isCurrent && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 shrink-0">
                                Đang mở
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 truncate mt-0.5">
                            {cmd.description}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[11px] font-mono text-slate-400 hidden sm:inline">
                          {cmd.categoryLabel}
                        </span>
                        <div className={`p-1.5 rounded-xl ${isSelected ? 'bg-teal-600 text-white' : 'text-slate-300'}`}>
                          <CornerDownLeft className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Spotlight Footer */}
            <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-2">
                <span>QuizGen AI Spotlight</span>
                <span>•</span>
                <span>{filteredCommands.length} kết quả</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span>Dùng</span>
                <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded font-mono text-[10px]">↑</kbd>
                <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded font-mono text-[10px]">↓</kbd>
                <span>để chọn,</span>
                <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded font-mono text-[10px]">Enter</kbd>
                <span>để mở</span>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Right: Actions */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-auto">
        {showAdminHeader ? (
          /* ── ADMIN HEADER ACTIONS ── */
          <>
            {/* Nút Chat Với Antigravity Agent Từ Xa */}
            <button
              type="button"
              onClick={() => {
                onNavigate?.('admin_portal');
                onAdminTabChange?.('secret_command');
              }}
              className="flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-100 border border-zinc-800 text-xs font-medium shadow-xs transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
              title="Mở giao diện chat trực tiếp với Antigravity Agent"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="hidden sm:inline">Chat Agent</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
            </button>

            {/* Nút Kiểm tra Sức khỏe */}
            <button
              type="button"
              onClick={() => {
                onNavigate?.('admin_portal');
                onAdminTabChange?.('services');
              }}
              className="flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-[#008689] hover:bg-[#007073] active:bg-[#005f62] text-white text-xs font-semibold shadow-xs transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
              title="Kiểm tra trạng thái sức khỏe các dịch vụ hệ thống"
            >
              <Activity className="w-4 h-4 text-white shrink-0" />
              <span className="hidden sm:inline">Kiểm tra Sức khỏe</span>
              <span className="sm:hidden">Sức khỏe</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0 ml-0.5" />
            </button>

            {/* Nút quay lại Cổng Admin (nếu đang ở màn hình khác) */}
            {onNavigate && currentScreen !== 'admin_portal' && (
              <button
                type="button"
                onClick={() => onNavigate('admin_portal')}
                className="hidden sm:inline-block px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-800 text-white hover:bg-slate-900 transition-colors whitespace-nowrap shadow-2xs cursor-pointer"
                title="Quay lại Cổng Quản trị Admin"
              >
                Cổng Admin
              </button>
            )}

            {/* Subtle vertical divider */}
            <div className="h-5 w-px bg-slate-200 mx-1 hidden sm:block" />

            {/* Nút biểu tượng tài khoản người dùng */}
            <button
              type="button"
              onClick={onOpenProfileModal}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white border border-slate-200/90 hover:border-[#008689] hover:bg-teal-50/40 text-slate-600 hover:text-[#008689] transition-all duration-200 shadow-2xs flex items-center justify-center cursor-pointer shrink-0 hover:-translate-y-0.5 active:translate-y-0"
              title="Hồ sơ tài khoản Quản trị viên"
            >
              <User className="w-4 h-4 shrink-0" />
            </button>

            {/* Nút Đăng xuất */}
            <button
              type="button"
              onClick={onLogout}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white border border-slate-200/90 hover:border-rose-300 hover:bg-rose-50 text-slate-600 hover:text-rose-600 transition-all duration-200 shadow-2xs flex items-center justify-center cursor-pointer shrink-0 hover:-translate-y-0.5 active:translate-y-0"
              title="Đăng xuất khỏi hệ thống"
            >
              <LogOut className="w-4 h-4 shrink-0" />
            </button>
          </>
        ) : (
          /* ── LECTURER & HOD HEADER ACTIONS ── */
          <>
            <button
              type="button"
              onClick={onOpenProfileModal}
              className={`flex items-center gap-2 p-1 sm:px-2.5 sm:py-1 rounded-xl border transition-all text-left shadow-2xs group ${
                activeThemeId === 'spring'
                  ? 'border-[#E7B947]/70 hover:border-[#B82025] bg-[#FFF8E9]/60'
                  : activeThemeId === 'summer'
                  ? 'border-[#26B9D5]/70 hover:border-[#087EAD] bg-[#EAFBFF]/60'
                  : activeThemeId === 'autumn'
                  ? 'border-[#E9B85D]/70 hover:border-[#B85C38] bg-[#FFF3DF]/60'
                  : activeThemeId === 'winter'
                  ? 'border-[#78BDE8]/70 hover:border-[#2563A6] bg-[#F3FAFF]/60'
                  : activeThemeId === 'victory_30_4' || activeThemeId === 'national_day_2_9'
                  ? 'border-[#E7B947]/70 hover:border-[#DA251D] bg-[#FFF3D1]/60'
                  : 'border-slate-200 bg-white hover:border-[#008689] hover:bg-slate-50'
              }`}
              title="Nhấp để xem & cập nhật hồ sơ tài khoản"
            >
              <div
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg font-black text-xs flex items-center justify-center shadow-xs shrink-0 group-hover:scale-105 transition-transform ${
                  activeThemeId === 'spring'
                    ? 'bg-gradient-to-tr from-[#B82025] to-[#E7B947] text-white'
                    : activeThemeId === 'summer'
                    ? 'bg-gradient-to-tr from-[#087EAD] to-[#26B9D5] text-white'
                    : activeThemeId === 'autumn'
                    ? 'bg-gradient-to-tr from-[#B85C38] to-[#E9B85D] text-white'
                    : activeThemeId === 'winter'
                    ? 'bg-gradient-to-tr from-[#2563A6] to-[#78BDE8] text-white'
                    : activeThemeId === 'victory_30_4' || activeThemeId === 'national_day_2_9'
                    ? 'bg-gradient-to-tr from-[#DA251D] to-[#FFCD00] text-white'
                    : 'bg-gradient-to-tr from-[#008689] to-teal-400 text-white'
                }`}
              >
                {userInitial}
              </div>
              <div className="hidden md:block min-w-0 max-w-[110px] xl:max-w-[160px]">
                <div
                  className={`text-xs font-bold truncate leading-tight transition-colors ${
                    activeThemeId === 'spring'
                      ? 'text-[#8F171C] group-hover:text-[#B82025]'
                      : activeThemeId === 'summer'
                      ? 'text-[#087EAD] group-hover:text-[#26B9D5]'
                      : activeThemeId === 'autumn'
                      ? 'text-[#70452F] group-hover:text-[#B85C38]'
                      : activeThemeId === 'winter'
                      ? 'text-[#243B64] group-hover:text-[#2563A6]'
                      : activeThemeId === 'victory_30_4' || activeThemeId === 'national_day_2_9'
                      ? 'text-[#8F171C] group-hover:text-[#DA251D]'
                      : 'text-slate-800 group-hover:text-[#008689]'
                  }`}
                >
                  {userDisplayName}
                </div>
                <div className="text-[10px] text-slate-400 font-medium truncate mt-0.5 hidden 2xl:block">
                  {currentUser?.department || 'Khoa Công nghệ thông tin'}
                </div>
              </div>
              <UserCog className={`w-3.5 h-3.5 shrink-0 ml-0.5 hidden sm:block transition-colors ${
                activeThemeId === 'spring'
                  ? 'text-[#E7B947] group-hover:text-[#B82025]'
                  : activeThemeId === 'summer'
                  ? 'text-[#26B9D5] group-hover:text-[#087EAD]'
                  : activeThemeId === 'autumn'
                  ? 'text-[#E9B85D] group-hover:text-[#B85C38]'
                  : activeThemeId === 'winter'
                  ? 'text-[#78BDE8] group-hover:text-[#2563A6]'
                  : activeThemeId === 'victory_30_4' || activeThemeId === 'national_day_2_9'
                  ? 'text-[#FFCD00] group-hover:text-[#DA251D]'
                  : 'text-slate-400 group-hover:text-[#008689]'
              }`} />
            </button>

            {/* Subscription Plan Badge & Upgrade Action */}
            <div className="flex items-center gap-1.5">
              {subscriptionInfo?.plan_code === 'PRO_MONTH' ? (
                <div className="flex items-center gap-1.5">
                  <div 
                    title={subscriptionInfo.expires_at ? `Gói PRO Giảng Viên (Hạn dùng: ${subscriptionInfo.expires_at.slice(0, 10)})` : 'Gói PRO Giảng Viên'}
                    className={`flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-xl text-[10px] sm:text-[11px] font-bold shadow-2xs cursor-pointer transition-colors ${
                      activeThemeId === 'spring'
                        ? 'bg-[#FFF8E9] text-[#8F171C] border border-[#E7B947] hover:bg-amber-100/90'
                        : activeThemeId === 'summer'
                        ? 'bg-[#EAFBFF] text-[#087EAD] border border-[#26B9D5] hover:bg-cyan-100/90'
                        : activeThemeId === 'autumn'
                        ? 'bg-[#FFF3DF] text-[#70452F] border border-[#E9B85D] hover:bg-amber-100/90'
                        : activeThemeId === 'winter'
                        ? 'bg-[#F3FAFF] text-[#243B64] border border-[#78BDE8] hover:bg-sky-100/90'
                        : activeThemeId === 'victory_30_4' || activeThemeId === 'national_day_2_9'
                        ? 'bg-[#FFF3D1] text-[#8F171C] border border-[#E7B947] hover:bg-amber-100/90'
                        : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100/80'
                    }`}
                    onClick={onOpenPricingModal}
                  >
                    <Crown className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span className="hidden lg:inline">Gói PRO (Tháng)</span>
                    <span className="lg:hidden font-extrabold">PRO</span>
                  </div>
                  {onOpenPricingModal && (
                    <button
                      onClick={onOpenPricingModal}
                      className={`hidden 2xl:flex items-center gap-1 px-2.5 py-1 rounded-xl font-bold text-[11px] shadow-2xs transition-all hover:scale-[1.02] cursor-pointer ${
                        activeThemeId === 'spring'
                          ? 'bg-gradient-to-r from-[#B82025] to-[#8F171C] text-[#FFF8E9] border border-[#E7B947]'
                          : activeThemeId === 'summer'
                          ? 'bg-gradient-to-r from-[#087EAD] to-[#26B9D5] text-[#FFD166] border border-[#FFD166]'
                          : activeThemeId === 'autumn'
                          ? 'bg-gradient-to-r from-[#B85C38] to-[#70452F] text-[#FFF3DF] border border-[#E9B85D]'
                          : activeThemeId === 'winter'
                          ? 'bg-gradient-to-r from-[#243B64] to-[#2563A6] text-[#F3FAFF] border border-[#78BDE8]'
                          : activeThemeId === 'victory_30_4' || activeThemeId === 'national_day_2_9'
                          ? 'bg-gradient-to-r from-[#DA251D] to-[#8F171C] text-[#FFF3D1] border border-[#FFCD00]'
                          : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white'
                      }`}
                      title="Nâng cấp lên gói 1 Năm để tiết kiệm 80%"
                    >
                      <Sparkles className="w-3 h-3 text-[#E7B947]" />
                      <span>Lên gói 1 Năm</span>
                    </button>
                  )}
                </div>
              ) : subscriptionInfo?.plan_code === 'PRO_YEAR' ? (
                <div 
                  title={subscriptionInfo.expires_at ? `Gói PRO Giảng Viên VIP (Hạn dùng: ${subscriptionInfo.expires_at.slice(0, 10)})` : 'Gói PRO Giảng Viên 1 Năm'}
                  className={`flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-xl text-white text-[10px] sm:text-[11px] font-black shadow-xs cursor-pointer transition-colors ${
                    activeThemeId === 'spring'
                      ? 'bg-gradient-to-r from-[#B82025] to-[#8F171C] border border-[#E7B947] hover:brightness-110'
                      : activeThemeId === 'summer'
                      ? 'bg-gradient-to-r from-[#087EAD] to-[#26B9D5] text-white border border-[#FFD166] hover:brightness-110'
                      : activeThemeId === 'autumn'
                      ? 'bg-gradient-to-r from-[#B85C38] to-[#70452F] text-[#FFF3DF] border border-[#E9B85D] hover:brightness-110'
                      : activeThemeId === 'winter'
                      ? 'bg-gradient-to-r from-[#243B64] to-[#2563A6] text-white border border-[#78BDE8] hover:brightness-110'
                      : activeThemeId === 'victory_30_4' || activeThemeId === 'national_day_2_9'
                      ? 'bg-gradient-to-r from-[#DA251D] to-[#8F171C] text-[#FFCD00] border border-[#FFCD00] hover:brightness-110'
                      : 'bg-amber-500 border border-amber-400 hover:bg-amber-600'
                  }`}
                  onClick={onOpenPricingModal}
                >
                  <Crown className="w-3.5 h-3.5 text-yellow-200 fill-yellow-200 shrink-0" />
                  <span className="hidden lg:inline">Gói PRO (1 Năm VIP)</span>
                  <span className="lg:hidden font-extrabold">VIP</span>
                </div>
              ) : subscriptionInfo?.plan_code === 'ENTERPRISE' ? (
                <div 
                  className="flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-xl bg-purple-50 text-purple-800 border border-purple-200 text-[10px] sm:text-[11px] font-bold shadow-2xs cursor-pointer hover:bg-purple-100/80 transition-colors"
                  onClick={onOpenPricingModal}
                >
                  <Crown className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                  <span className="hidden lg:inline">Gói Bộ Môn Toàn Năng</span>
                  <span className="lg:hidden font-extrabold">Bộ Môn</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={onOpenPricingModal}
                    title="Bấm để xem bảng giá và nâng cấp gói cước"
                    className="flex items-center gap-1 text-[10px] sm:text-[11px] font-bold px-2 py-1 rounded-xl bg-slate-100 hover:bg-amber-50 hover:text-amber-800 hover:border-amber-300 text-slate-700 border border-slate-200 transition-all cursor-pointer shadow-2xs active:scale-95"
                  >
                    <Crown className="w-3 h-3 text-amber-500 shrink-0" />
                    <span className="hidden lg:inline">Gói Miễn Phí</span>
                    <span className="lg:hidden">FREE</span>
                  </button>
                  {onOpenPricingModal && (
                    <button
                      onClick={onOpenPricingModal}
                      className={`hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-xl font-bold text-[11px] shadow-2xs transition-all hover:scale-[1.02] cursor-pointer ${
                        activeThemeId === 'spring'
                          ? 'bg-gradient-to-r from-[#B82025] to-[#8F171C] text-[#FFF8E9] border border-[#E7B947]'
                          : activeThemeId === 'summer'
                          ? 'bg-gradient-to-r from-[#087EAD] to-[#26B9D5] text-[#FFD166] border border-[#FFD166]'
                          : activeThemeId === 'autumn'
                          ? 'bg-gradient-to-r from-[#B85C38] to-[#70452F] text-[#FFF3DF] border border-[#E9B85D]'
                          : activeThemeId === 'winter'
                          ? 'bg-gradient-to-r from-[#243B64] to-[#2563A6] text-[#F3FAFF] border border-[#78BDE8]'
                          : activeThemeId === 'victory_30_4' || activeThemeId === 'national_day_2_9'
                          ? 'bg-gradient-to-r from-[#DA251D] to-[#8F171C] text-[#FFF3D1] border border-[#FFCD00]'
                          : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white'
                      }`}
                    >
                      <Sparkles className="w-3 h-3 text-[#E7B947]" />
                      <span>Nâng cấp</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Nút Bật / Tắt hiệu ứng mùa lễ hội (Chỉ hiện trên màn hình lớn để tránh tràn Header) */}
            {activeThemeId !== 'default' && (
              <button
                type="button"
                onClick={toggleParticles}
                className={`hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-2xs ${
                  showParticles
                    ? activeThemeId === 'spring'
                      ? 'bg-[#FFF8E9] border-[#E7B947] text-[#8F171C] hover:bg-amber-100/80'
                      : activeThemeId === 'summer'
                      ? 'bg-[#EAFBFF] border-[#26B9D5] text-[#087EAD] hover:bg-cyan-100/80'
                      : activeThemeId === 'autumn'
                      ? 'bg-[#FFF3DF] border-[#E9B85D] text-[#B85C38] hover:bg-amber-100/80'
                      : activeThemeId === 'winter'
                      ? 'bg-[#F3FAFF] border-[#78BDE8] text-[#2563A6] hover:bg-sky-100/80'
                      : activeThemeId === 'victory_30_4' || activeThemeId === 'national_day_2_9'
                      ? 'bg-[#FFF3D1] border-[#E7B947] text-[#DA251D] hover:bg-amber-100/80'
                      : 'bg-teal-50 border-teal-200 text-[#008689] hover:bg-teal-100/70'
                    : 'bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-600'
                }`}
                title={showParticles ? "Nhấn để tắt hiệu ứng hạt" : "Nhấn để bật hiệu ứng hạt"}
              >
                {showParticles ? (
                  <>
                    <Sparkles className={`w-3.5 h-3.5 ${
                      activeThemeId === 'spring'
                        ? 'text-[#E7B947]'
                        : activeThemeId === 'summer'
                        ? 'text-[#FFD166]'
                        : activeThemeId === 'autumn'
                        ? 'text-[#E9B85D]'
                        : activeThemeId === 'winter'
                        ? 'text-[#78BDE8]'
                        : activeThemeId === 'victory_30_4' || activeThemeId === 'national_day_2_9'
                        ? 'text-[#FFCD00]'
                        : 'text-[#008689]'
                    }`} />
                    <span className="hidden 2xl:inline">Hiệu ứng: Bật</span>
                  </>
                ) : (
                  <>
                    <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                    <span className="hidden 2xl:inline">Hiệu ứng: Tắt</span>
                  </>
                )}
              </button>
            )}

            {/* Global Logout Button */}
            <button
              type="button"
              onClick={onLogout}
              className="p-2 rounded-xl border border-slate-200 hover:border-rose-200 hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors shadow-2xs"
              title="Đăng xuất khỏi hệ thống"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </>
        )}
      </div>
    </header>
  );
};

export default TopHeader;
