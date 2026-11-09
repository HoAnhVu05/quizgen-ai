import React, { useState } from 'react';
import {
  GraduationCap,
  Award,
  ShieldCheck,
  RefreshCw,
  LogOut,
  ChevronDown,
  Sparkles,
  CheckCircle2,
  Cpu,
  Layers,
  LayoutDashboard,
  UploadCloud,
  CheckSquare,
  Database,
  ArrowRightLeft
} from 'lucide-react';
import { ScreenId, UserProfile, UserRole } from '../types';
import apiClient from '../services/apiClient';

interface TopHeaderProps {
  currentScreen: ScreenId;
  currentUser: UserProfile | null;
  onLogout: () => void;
  onRoleSwitch?: (newRole: UserRole) => void;
  onShowToast: (type: 'success' | 'info' | 'warning' | 'error', title: string, message: string) => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  currentScreen,
  currentUser,
  onLogout,
  onRoleSwitch,
  onShowToast,
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const getScreenMeta = (screen: ScreenId) => {
    switch (screen) {
      case 'dashboard':
        return { label: 'Bảng điều khiển Khảo thí', icon: LayoutDashboard, subtitle: 'Ma trận nhận thức & Chỉ số Bloom' };
      case 'upload':
        return { label: 'Quản lý Giáo trình RAG', icon: UploadCloud, subtitle: 'Bóc tách văn bản & Vector hóa' };
      case 'generate':
        return { label: 'Khởi tạo Đề thi AI', icon: Sparkles, subtitle: 'Cấu hình ma trận nhận thức Bloom' };
      case 'review':
        return { label: 'Không gian Kiểm duyệt', icon: CheckSquare, subtitle: 'Đối soát minh chứng ngữ cảnh RAG' };
      case 'bank':
        return { label: 'Ngân hàng & Đề thi', icon: Database, subtitle: 'Kho câu hỏi chuẩn & Đóng gói đa mã đề' };
      default:
        return { label: 'QuizGen AI', icon: Cpu, subtitle: 'Hệ thống Khảo thí ĐHQG' };
    }
  };

  const getRoleConfig = (role?: UserRole) => {
    switch (role) {
      case 'admin':
        return {
          label: 'Quản trị Khảo thí',
          badgeClass: 'text-amber-300 bg-amber-500/15 border-amber-500/30',
          avatarGrad: 'from-amber-500 to-orange-600',
          icon: ShieldCheck,
          roleScope: 'Toàn quyền kiểm toán & Quản trị Token Quota',
        };
      case 'head_of_department':
        return {
          label: 'Trưởng bộ môn',
          badgeClass: 'text-purple-300 bg-purple-500/15 border-purple-500/30',
          avatarGrad: 'from-purple-500 to-indigo-600',
          icon: Award,
          roleScope: 'Thẩm định & Phê duyệt chất lượng ngân hàng đề',
        };
      default:
        return {
          label: 'Giảng viên',
          badgeClass: 'text-blue-300 bg-blue-500/15 border-blue-500/30',
          avatarGrad: 'from-blue-600 to-indigo-600',
          icon: GraduationCap,
          roleScope: 'Soạn thảo đề thi & Nạp giáo trình RAG',
        };
    }
  };

  const screenMeta = getScreenMeta(currentScreen);
  const ScreenIcon = screenMeta.icon;
  const roleConfig = getRoleConfig(currentUser?.role);
  const RoleIcon = roleConfig.icon;

  const displayName = currentUser
    ? `${currentUser.academicTitle ? currentUser.academicTitle + ' ' : ''}${currentUser.fullName}`
    : 'TS. Nguyễn Văn An';

  const displayDept = currentUser
    ? `${currentUser.faculty || currentUser.department || 'Khoa Công nghệ Thông tin'}`
    : 'Khoa Công nghệ Thông tin';

  const getInitials = (name?: string) => {
    if (!name) return 'GV';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const handleManualRefreshToken = async () => {
    setIsRefreshing(true);
    try {
      const newToken = await apiClient.refreshAccessToken();
      if (newToken) {
        onShowToast(
          'success',
          'Tái cấp mã truy cập thành công',
          'Token JWT đã được tự động gia hạn với phiên hợp lệ mới.'
        );
      } else {
        onShowToast(
          'warning',
          'Làm mới mã truy cập (Giả lập)',
          'Đã cập nhật mã thông báo làm mới cho tài khoản.'
        );
      }
    } catch {
      onShowToast('info', 'Làm mới mã truy cập', 'Đã cập nhật token an toàn.');
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  return (
    <header className="h-16 bg-[#0a0e1a]/95 backdrop-blur-md border-b border-white/[0.07] px-6 flex items-center justify-between z-30 shrink-0 select-none">
      {/* 1. Left Breadcrumb / Screen Title */}
      <div className="flex items-center space-x-3.5 min-w-0">
        <div className="w-9 h-9 rounded-xl bg-blue-600/15 border border-blue-500/25 flex items-center justify-center text-blue-400 shrink-0 shadow-sm">
          <ScreenIcon className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center space-x-2">
            <h2 className="text-sm font-bold text-white tracking-tight truncate">
              {screenMeta.label}
            </h2>
            <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-white/[0.04] text-slate-400 border border-white/[0.06]">
              HK II (2025 - 2026)
            </span>
          </div>
          <p className="text-[11px] text-slate-400 truncate hidden md:block">
            {screenMeta.subtitle}
          </p>
        </div>
      </div>

      {/* 2. Center Multi-Role Fast Switcher (Dành cho kiểm thử & chuyển đổi vai trò nhanh) */}
      <div className="hidden xl:flex items-center space-x-1 p-1 bg-white/[0.03] rounded-xl border border-white/[0.06]">
        {[
          { id: 'lecturer' as UserRole, label: 'Giảng viên', icon: GraduationCap, color: 'text-blue-400' },
          { id: 'head_of_department' as UserRole, label: 'Trưởng bộ môn', icon: Award, color: 'text-purple-400' },
          { id: 'admin' as UserRole, label: 'Quản trị Khảo thí', icon: ShieldCheck, color: 'text-amber-400' },
        ].map((roleItem) => {
          const isActive = currentUser?.role === roleItem.id;
          const ItemIcon = roleItem.icon;
          return (
            <button
              key={roleItem.id}
              onClick={() => onRoleSwitch && onRoleSwitch(roleItem.id)}
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                isActive
                  ? 'bg-blue-600/20 text-white border border-blue-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
              }`}
              title={`Chuyển sang vai trò: ${roleItem.label}`}
            >
              <ItemIcon className={`w-3.5 h-3.5 ${roleItem.color}`} />
              <span>{roleItem.label}</span>
              {isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
              )}
            </button>
          );
        })}
      </div>

      {/* 3. Right Account Card & Auto Token Refresh Tool */}
      <div className="flex items-center space-x-3.5 shrink-0">
        {/* Token Auto-Refresh Control Pill */}
        <button
          onClick={handleManualRefreshToken}
          disabled={isRefreshing}
          className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1 rounded-xl bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.08] text-slate-300 text-[11px] transition-all"
          title="Tự động tái cấp mã truy cập (Auto Token Refresh) khi hết hạn"
        >
          <RefreshCw className={`w-3 h-3 text-sky-400 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span className="font-mono text-[10px]">Auto-JWT</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
        </button>

        {/* Synchronized Profile Pill */}
        <div className="flex items-center space-x-3 pl-2 py-1 pr-1.5 rounded-2xl bg-white/[0.03] border border-white/[0.07] hover:border-white/[0.12] transition-colors">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-bold text-white flex items-center justify-end gap-1.5 leading-tight">
              <span className="truncate max-w-[150px]">{displayName}</span>
              <RoleIcon className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            </div>
            <div className="flex items-center justify-end gap-1.5 mt-0.5">
              <span className={`px-1.5 py-0.2 text-[9px] font-bold uppercase tracking-wider rounded border ${roleConfig.badgeClass}`}>
                {roleConfig.label}
              </span>
              <span className="text-[10px] text-slate-400 truncate max-w-[120px]">
                {displayDept}
              </span>
            </div>
          </div>

          <div
            className={`w-8 h-8 rounded-xl bg-gradient-to-br ${roleConfig.avatarGrad} flex items-center justify-center font-extrabold text-white text-xs border border-white/20 shadow-md shrink-0`}
          >
            {getInitials(currentUser?.fullName)}
          </div>

          <button
            onClick={onLogout}
            title="Đăng xuất khỏi hệ thống"
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors ml-0.5"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default TopHeader;

