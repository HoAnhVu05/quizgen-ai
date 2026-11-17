import React, { useState } from 'react';
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
}

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
}) => {
  const { currentTheme, activeThemeId, showParticles, toggleParticles } = useTheme();
  const isAdmin = currentUser?.role === 'admin';
  const isAdminScreen = currentScreen === 'admin_portal';
  const showAdminHeader = isAdmin || isAdminScreen;
  const [searchValue, setSearchValue] = useState('');

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
      className={`${
        showAdminHeader ? 'h-[72px]' : 'h-16'
      } bg-white border-b border-[#E5EDF5] px-3 sm:px-6 flex items-center justify-between z-30 shrink-0 select-none gap-3 shadow-2xs transition-all`}
    >
      {/* Left: Mobile Toggle + Screen Title & Breadcrumb */}
      <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0 shrink-0">
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 md:hidden transition-colors"
            title="Mở menu điều hướng"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <div
          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border transition-colors ${
            showAdminHeader
              ? 'bg-[#E4F7F7] text-[#008F95] border-[#E4F7F7]'
              : screenMeta.iconStyle
          } shadow-2xs`}
        >
          <ScreenIcon className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className={`text-xs sm:text-sm font-bold truncate leading-snug ${showAdminHeader ? 'text-[#142B45]' : 'text-slate-800'}`}>
              <span className="hidden sm:inline">{screenMeta.label}</span>
              <span className="sm:hidden">{screenMeta.shortLabel}</span>
            </h2>
            {activeThemeId !== 'default' && (
              <span
                className="hidden md:inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-bold border shadow-2xs animate-in fade-in duration-300"
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
            <p className="text-[11px] text-[#91A2B8] font-medium hidden sm:block leading-none mt-0.5">
              QuizGen AI - Admin Portal
            </p>
          )}
        </div>
      </div>

      {/* Middle: Spotlight Search Bar */}
      {!showAdminHeader && (
        <form
          onSubmit={handleSearchSubmit}
          className="hidden md:flex items-center flex-1 max-w-md mx-2 lg:mx-6"
        >
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="Tìm nhanh giáo trình môn học, ngân hàng câu hỏi, mã đề... (Ctrl + K)"
              className="w-full pl-9 pr-14 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-[#008689] focus:ring-1 focus:ring-[#008689] transition-all shadow-2xs"
            />
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
              <kbd className="px-1.5 py-0.5 text-[9px] font-mono font-bold bg-white border border-slate-200 text-slate-400 rounded shadow-2xs">
                Ctrl K
              </kbd>
            </div>
          </div>
        </form>
      )}

      {/* Right: Actions */}
      <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
        {showAdminHeader ? (
          /* ── ADMIN HEADER ACTIONS ── */
          <>
            {/* Nút Kiểm tra Sức khỏe */}
            <button
              type="button"
              onClick={() => {
                onNavigate?.('admin_portal');
                onAdminTabChange?.('services');
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#008689] hover:bg-[#007073] active:bg-[#005f62] text-white text-xs font-semibold shadow-xs transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
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
                className="px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-800 text-white hover:bg-slate-900 transition-colors whitespace-nowrap shadow-2xs cursor-pointer"
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
              className="w-9 h-9 rounded-full bg-white border border-slate-200/90 hover:border-[#008689] hover:bg-teal-50/40 text-slate-600 hover:text-[#008689] transition-all duration-200 shadow-2xs flex items-center justify-center cursor-pointer shrink-0 hover:-translate-y-0.5 active:translate-y-0"
              title="Hồ sơ tài khoản Quản trị viên"
            >
              <User className="w-4 h-4 shrink-0" />
            </button>

            {/* Nút Đăng xuất */}
            <button
              type="button"
              onClick={onLogout}
              className="w-9 h-9 rounded-full bg-white border border-slate-200/90 hover:border-rose-300 hover:bg-rose-50 text-slate-600 hover:text-rose-600 transition-all duration-200 shadow-2xs flex items-center justify-center cursor-pointer shrink-0 hover:-translate-y-0.5 active:translate-y-0"
              title="Đăng xuất khỏi hệ thống"
            >
              <LogOut className="w-4 h-4 shrink-0" />
            </button>
          </>
        ) : (
          /* ── LECTURER & HOD HEADER ACTIONS (GIỮ NGUYÊN) ── */
          <>
            <button
              type="button"
              onClick={onOpenProfileModal}
              className={`flex items-center gap-2.5 p-1 sm:px-3 sm:py-1.5 rounded-xl border transition-all text-left shadow-2xs group ${
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
                className={`w-8 h-8 rounded-lg font-black text-xs flex items-center justify-center shadow-xs shrink-0 group-hover:scale-105 transition-transform ${
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
              <div className="hidden sm:block min-w-0 max-w-[150px] lg:max-w-[200px]">
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
                <div className="text-[10px] text-slate-400 font-medium truncate mt-0.5">
                  {currentUser?.department || 'Khoa Công nghệ thông tin'}
                </div>
              </div>
              <UserCog className={`w-4 h-4 shrink-0 ml-0.5 transition-colors ${
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
            <div className="flex items-center gap-2">
              {subscriptionInfo?.plan_code === 'PRO_MONTH' ? (
                <div className="flex items-center gap-2">
                  <div 
                    title={subscriptionInfo.expires_at ? `Gói PRO Giảng Viên (Hạn dùng: ${subscriptionInfo.expires_at.slice(0, 10)})` : 'Gói PRO Giảng Viên'}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold shadow-2xs cursor-pointer transition-colors ${
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
                    <Crown className="w-3.5 h-3.5 text-amber-600" />
                    <span>Gói PRO (Tháng)</span>
                  </div>
                  {onOpenPricingModal && (
                    <button
                      onClick={onOpenPricingModal}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-xl font-bold text-[11px] shadow-2xs transition-all hover:scale-[1.02] cursor-pointer ${
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
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-white text-[11px] font-black shadow-xs cursor-pointer transition-colors ${
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
                  <Crown className="w-3.5 h-3.5 text-yellow-200 fill-yellow-200" />
                  <span>Gói PRO (1 Năm VIP)</span>
                </div>
              ) : subscriptionInfo?.plan_code === 'ENTERPRISE' ? (
                <div 
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-purple-50 text-purple-800 border border-purple-200 text-[11px] font-bold shadow-2xs cursor-pointer hover:bg-purple-100/80 transition-colors"
                  onClick={onOpenPricingModal}
                >
                  <Crown className="w-3.5 h-3.5 text-purple-600" />
                  <span>Gói Bộ Môn Toàn Năng</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600 border border-slate-200">
                    Gói Miễn Phí
                  </span>
                  {onOpenPricingModal && (
                    <button
                      onClick={onOpenPricingModal}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-xl font-bold text-[11px] shadow-2xs transition-all hover:scale-[1.02] cursor-pointer ${
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

            {/* Nút Bật / Tắt hiệu ứng mùa lễ hội (Bố trí gọn gàng trên Header) */}
            {activeThemeId !== 'default' && (
              <button
                type="button"
                onClick={toggleParticles}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-2xs ${
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
                    <span className="hidden lg:inline">Hiệu ứng: Bật</span>
                  </>
                ) : (
                  <>
                    <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                    <span className="hidden lg:inline">Hiệu ứng: Tắt</span>
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
