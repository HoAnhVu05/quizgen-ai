import React, { useState } from 'react';
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
  const isAdmin = currentUser?.role === 'admin';
  const [searchValue, setSearchValue] = useState('');

  const getScreenMeta = (screen: ScreenId) => {
    switch (screen) {
      case 'admin_portal':
        return {
          label: 'Cổng Quản trị Hệ thống',
          shortLabel: 'Quản trị',
          icon: ShieldCheck,
          iconStyle: 'bg-rose-50 text-[#da1c2d] border-rose-200',
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
    <header className="h-16 bg-white border-b border-slate-200 px-3 sm:px-6 flex items-center justify-between z-30 shrink-0 select-none gap-3 shadow-2xs">
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
          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border transition-colors ${screenMeta.iconStyle} shadow-2xs`}
        >
          <ScreenIcon className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <h2 className="text-xs sm:text-sm font-bold text-slate-800 truncate leading-snug">
            <span className="hidden sm:inline">{screenMeta.label}</span>
            <span className="sm:hidden">{screenMeta.shortLabel}</span>
          </h2>
        </div>
      </div>

      {/* Middle: Spotlight Search Bar */}
      {!isAdmin && (
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

      {/* Right: User Profile & Account Settings + Logout Button */}
      <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
        {!isAdmin && (
          <button
            type="button"
            onClick={onOpenProfileModal}
            className="flex items-center gap-2.5 p-1 sm:px-3 sm:py-1.5 rounded-xl border border-slate-200 bg-white hover:border-[#008689] hover:bg-slate-50 transition-all text-left shadow-2xs group"
            title="Nhấp để xem & cập nhật hồ sơ tài khoản"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#008689] to-teal-400 text-white font-black text-xs flex items-center justify-center shadow-xs shrink-0 group-hover:scale-105 transition-transform">
              {userInitial}
            </div>
            <div className="hidden sm:block min-w-0 max-w-[150px] lg:max-w-[200px]">
              <div className="text-xs font-bold text-slate-800 truncate leading-tight group-hover:text-[#008689]">
                {userDisplayName}
              </div>
              <div className="text-[10px] text-slate-400 font-medium truncate mt-0.5">
                {currentUser?.department || 'Khoa Công nghệ thông tin'}
              </div>
            </div>
            <UserCog className="w-4 h-4 text-slate-400 group-hover:text-[#008689] shrink-0 ml-0.5" />
          </button>
        )}

        {/* Subscription Plan Badge & Upgrade Action */}
        <div className="flex items-center gap-2">
          {subscriptionInfo?.plan_code === 'PRO_MONTH' ? (
            <div className="flex items-center gap-2">
              <div 
                title={subscriptionInfo.expires_at ? `Gói PRO Giảng Viên (Hạn dùng: ${subscriptionInfo.expires_at.slice(0, 10)})` : 'Gói PRO Giảng Viên'}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-bold shadow-2xs cursor-pointer hover:bg-amber-100/80 transition-colors"
                onClick={onOpenPricingModal}
              >
                <Crown className="w-3.5 h-3.5 text-amber-600" />
                <span>Gói PRO (Tháng)</span>
              </div>
              {onOpenPricingModal && (
                <button
                  onClick={onOpenPricingModal}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-[11px] shadow-2xs transition-all hover:scale-[1.02] cursor-pointer"
                  title="Nâng cấp lên gói 1 Năm để tiết kiệm 80%"
                >
                  <Sparkles className="w-3 h-3 text-amber-200" />
                  <span>Lên gói 1 Năm</span>
                </button>
              )}
            </div>
          ) : subscriptionInfo?.plan_code === 'PRO_YEAR' ? (
            <div 
              title={subscriptionInfo.expires_at ? `Gói PRO Giảng Viên VIP (Hạn dùng: ${subscriptionInfo.expires_at.slice(0, 10)})` : 'Gói PRO Giảng Viên 1 Năm'}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-500 text-white border border-amber-400 text-[11px] font-black shadow-xs cursor-pointer hover:bg-amber-600 transition-colors"
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
                  className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-[11px] shadow-2xs transition-all hover:scale-[1.02]"
                >
                  <Sparkles className="w-3 h-3 text-amber-200" />
                  <span>Nâng cấp</span>
                </button>
              )}
            </div>
          )}
        </div>

        {isAdmin && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onNavigate?.('admin_portal');
                onAdminTabChange?.('services');
              }}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#008689] text-white hover:bg-[#006d70] transition-colors flex items-center gap-1.5 shadow-2xs"
            >
              <Activity className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Kiểm tra Sức khỏe</span>
              <span className="sm:hidden">Sức khỏe</span>
            </button>
            {onNavigate && currentScreen !== 'admin_portal' && (
              <button
                onClick={() => onNavigate('admin_portal')}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 text-white hover:bg-slate-900 transition-colors whitespace-nowrap shadow-2xs"
              >
                Cổng Admin
              </button>
            )}
            <button
              type="button"
              onClick={onOpenProfileModal}
              className="p-1.5 rounded-xl border border-slate-200 bg-white hover:border-[#008689] text-slate-600 hover:text-[#008689] transition-colors"
              title="Cập nhật tài khoản Admin"
            >
              <UserCog className="w-4 h-4" />
            </button>
          </div>
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
      </div>
    </header>
  );
};

export default TopHeader;
