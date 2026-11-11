import React from 'react';
import {
  LayoutDashboard,
  UploadCloud,
  Sparkles,
  CheckSquare,
  Database,
  GraduationCap,
  LogOut,
  ShieldCheck,
  Cpu,
  Award,
} from 'lucide-react';
import { ScreenId, UserProfile, UserRole } from '../types';

interface SidebarProps {
  currentScreen: ScreenId;
  onNavigate: (screen: ScreenId) => void;
  pendingReviewCount: number;
  currentUser?: UserProfile | null;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentScreen,
  onNavigate,
  pendingReviewCount,
  currentUser,
  onLogout,
}) => {
  const navItems = [
    {
      id: 'dashboard' as ScreenId,
      label: 'Bảng điều khiển',
      subtitle: 'Chỉ số & Ma trận Bloom',
      icon: LayoutDashboard,
      shortcut: '⌘1',
    },
    {
      id: 'upload' as ScreenId,
      label: 'Quản lý Giáo trình',
      subtitle: 'Vector hóa & Bóc tách RAG',
      icon: UploadCloud,
      shortcut: '⌘2',
    },
    {
      id: 'generate' as ScreenId,
      label: 'Khởi tạo Đề thi AI',
      subtitle: 'Cấu hình ma trận nhận thức',
      icon: Sparkles,
      shortcut: '⌘3',
    },
    {
      id: 'review' as ScreenId,
      label: 'Không gian Kiểm duyệt',
      subtitle: 'Đối sánh minh chứng RAG',
      icon: CheckSquare,
      badge: pendingReviewCount > 0 ? pendingReviewCount : undefined,
      shortcut: '⌘4',
    },
    {
      id: 'bank' as ScreenId,
      label: 'Ngân hàng & Đề thi',
      subtitle: 'Kho câu hỏi & Xuất Word/PDF',
      icon: Database,
      shortcut: '⌘5',
    },
  ];

  const getInitials = (name?: string, title?: string) => {
    if (title && title.includes('TS')) return 'TS';
    if (!name) return 'GV';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const getRoleStyle = (role?: UserRole) => {
    switch (role) {
      case 'admin':
        return {
          label: 'Quản trị Khảo thi',
          badgeClass: 'text-[#da1c2d] bg-rose-50 border-rose-200',
          avatarGrad: 'from-[#da1c2d] to-rose-700',
          icon: ShieldCheck,
        };
      case 'head_of_department':
        return {
          label: 'Trưởng bộ môn',
          badgeClass: 'text-indigo-700 bg-indigo-50 border-indigo-200',
          avatarGrad: 'from-indigo-600 to-violet-600',
          icon: Award,
        };
      default:
        return {
          label: 'Giảng viên',
          badgeClass: 'text-[#008689] bg-[#e0f7fa] border-[#008689]/25',
          avatarGrad: 'from-[#008689] to-[#1d999d]',
          icon: GraduationCap,
        };
    }
  };

  const roleStyle = getRoleStyle(currentUser?.role);
  const RoleIcon = roleStyle.icon;

  const displayName = currentUser
    ? `${currentUser.academicTitle ? currentUser.academicTitle + ' ' : ''}${currentUser.fullName}`
    : 'TS. Nguyễn Văn An';

  const displayDept = currentUser
    ? `${currentUser.faculty || currentUser.department || 'Khoa CNTT'}`
    : 'Khoa Kinh tế & Quản trị';

  const initials = getInitials(currentUser?.fullName, currentUser?.academicTitle);

  return (
    <aside className="w-72 bg-white text-slate-700 flex flex-col border-r border-slate-200 shrink-0 select-none relative z-20 shadow-sm">
      {/* Top UTH Accent Line */}
      <div className="h-1 w-full bg-gradient-to-r from-[#008689] via-[#1d999d] to-[#008689]" />

      {/* Brand Header */}
      <div className="p-5 border-b border-slate-100">
        <div className="flex items-center space-x-3.5">
          <div className="relative group cursor-pointer">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#008689] to-[#1d999d] flex items-center justify-center text-white shadow-md shadow-[#008689]/25 group-hover:shadow-[#008689]/40 transition-all duration-300">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full animate-pulse" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center space-x-2">
              <h1 className="font-extrabold text-[#008689] text-base tracking-tight">QuizGen</h1>
              <span className="text-[10px] font-mono font-bold uppercase px-1.5 py-0.5 rounded-md bg-[#e0f7fa] text-[#008689] border border-[#008689]/25">
                PORTAL
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium truncate">Cổng Khảo thí Học thuật</p>
          </div>
        </div>
      </div>

      {/* Navigation List */}
      <div className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400">
          <span>Phân hệ tác vụ</span>
          <span className="text-[10px] text-[#008689] font-mono font-semibold">v2.4</span>
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentScreen === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full group relative flex items-center justify-between p-3 rounded-xl text-left transition-all duration-200 ${
                isActive
                  ? 'bg-[#e0f7fa]/75 text-[#006d70] border border-[#008689]/25 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-transparent'
              }`}
            >
              {/* Left active accent bar */}
              {isActive && (
                <div className="absolute left-0 top-2 bottom-2 w-1 bg-[#008689] rounded-r-full" />
              )}

              <div className="flex items-center space-x-3 min-w-0 pl-1">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                    isActive
                      ? 'bg-[#008689] text-white shadow-sm shadow-[#008689]/25'
                      : 'bg-slate-100 text-slate-500 group-hover:text-[#008689] group-hover:bg-[#e0f7fa]'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                </div>

                <div className="truncate">
                  <div className={`text-xs font-bold truncate leading-tight ${isActive ? 'text-[#006d70]' : 'text-slate-700 group-hover:text-slate-900'}`}>
                    {item.label}
                  </div>
                  <div className="text-[10px] text-slate-500 truncate mt-0.5">
                    {item.subtitle}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-1.5 shrink-0 ml-2">
                {item.badge !== undefined && (
                  <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-full bg-rose-50 text-[#da1c2d] border border-rose-200 animate-pulse">
                    {item.badge}
                  </span>
                )}
                <span className="hidden group-hover:inline-block text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                  {item.shortcut}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* RAG Engine Status Pill */}
      <div className="px-3 pb-3">
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-600 font-semibold flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-[#008689]" />
              RAG Engine v3
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 font-mono font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              Hoạt động
            </span>
          </div>
          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
            <div className="bg-gradient-to-r from-[#008689] to-[#1d999d] h-full w-[42%]" />
          </div>
          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>Quota Tokens</span>
            <span className="font-semibold text-slate-700">420k / 1M</span>
          </div>
        </div>
      </div>

      {/* Profile Footer with Dynamic User, Role Badge & Logout */}
      <div className="p-3.5 border-t border-slate-200 bg-slate-50/80">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5 min-w-0">
            {currentUser?.avatarUrl ? (
              <img
                src={currentUser.avatarUrl}
                alt={displayName}
                referrerPolicy="no-referrer"
                className="w-9 h-9 rounded-xl object-cover border border-slate-200 shadow-sm shrink-0 bg-white"
              />
            ) : (
              <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${roleStyle.avatarGrad} flex items-center justify-center font-bold text-white text-xs border border-white shadow-sm shrink-0`}>
                {initials}
              </div>
            )}
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-900 truncate flex items-center gap-1">
                <span className="truncate">{displayName}</span>
                <RoleIcon className="w-3.5 h-3.5 text-[#008689] shrink-0" />
              </div>
              <div className="flex items-center gap-1 mt-0.5">
                <span className={`px-1.5 py-0.2 text-[9px] font-bold rounded border ${roleStyle.badgeClass}`}>
                  {roleStyle.label}
                </span>
                <span className="text-[10px] text-slate-500 truncate max-w-[90px]">{displayDept}</span>
              </div>
            </div>
          </div>

          <button
            id="sidebar-logout-btn"
            onClick={onLogout}
            title="Đăng xuất khỏi hệ thống"
            className="text-slate-400 hover:text-[#da1c2d] transition-colors p-1.5 rounded-lg hover:bg-rose-50 shrink-0 ml-1"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
