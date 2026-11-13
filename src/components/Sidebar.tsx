import React, { useEffect, useMemo } from 'react';
import {
  LayoutDashboard,
  UploadCloud,
  Sparkles,
  CheckSquare,
  Database,
  GraduationCap,
  LogOut,
  ShieldCheck,
} from 'lucide-react';
import { ScreenId, UserProfile, UserRole } from '../types';

interface SidebarProps {
  currentScreen: ScreenId;
  onNavigate: (screen: ScreenId) => void;
  pendingReviewCount: number;
  currentUser?: UserProfile | null;
  onLogout: () => void;
}

interface NavItem {
  id: ScreenId;
  label: string;
  stepTag?: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

interface NavItemStyle {
  stepTagClass: string;
  activeContainer: string;
  inactiveContainer: string;
  activeIconBox: string;
  inactiveIconBox: string;
  activeText: string;
}

const NAV_ITEM_STYLES: Record<ScreenId, NavItemStyle> = {
  upload: {
    // Bước 1: Xanh ngọc (Teal)
    stepTagClass: 'text-[#008689]',
    activeContainer: 'bg-teal-50/90 text-[#006d70] font-bold border border-teal-200/90 shadow-2xs',
    inactiveContainer: 'text-slate-600 hover:text-slate-900 hover:bg-teal-50/40 font-medium border border-transparent',
    activeIconBox: 'bg-[#008689] text-white shadow-xs',
    inactiveIconBox: 'bg-teal-50 text-[#008689] border border-teal-200/60 group-hover:bg-teal-100/70',
    activeText: 'text-[#006d70]',
  },
  generate: {
    // Bước 2: Xanh dương (Blue)
    stepTagClass: 'text-blue-600',
    activeContainer: 'bg-blue-50/90 text-blue-900 font-bold border border-blue-200/90 shadow-2xs',
    inactiveContainer: 'text-slate-600 hover:text-slate-900 hover:bg-blue-50/40 font-medium border border-transparent',
    activeIconBox: 'bg-blue-600 text-white shadow-xs',
    inactiveIconBox: 'bg-blue-50 text-blue-600 border border-blue-200/60 group-hover:bg-blue-100/70',
    activeText: 'text-blue-900',
  },
  review: {
    // Bước 3: Cam vàng (Amber)
    stepTagClass: 'text-amber-600',
    activeContainer: 'bg-amber-50/90 text-amber-950 font-bold border border-amber-200/90 shadow-2xs',
    inactiveContainer: 'text-slate-600 hover:text-slate-900 hover:bg-amber-50/40 font-medium border border-transparent',
    activeIconBox: 'bg-amber-500 text-white shadow-xs',
    inactiveIconBox: 'bg-amber-50 text-amber-600 border border-amber-200/60 group-hover:bg-amber-100/70',
    activeText: 'text-amber-950',
  },
  bank: {
    // Bước 4: Tím (Purple)
    stepTagClass: 'text-purple-600',
    activeContainer: 'bg-purple-50/90 text-purple-900 font-bold border border-purple-200/90 shadow-2xs',
    inactiveContainer: 'text-slate-600 hover:text-slate-900 hover:bg-purple-50/40 font-medium border border-transparent',
    activeIconBox: 'bg-purple-600 text-white shadow-xs',
    inactiveIconBox: 'bg-purple-50 text-purple-600 border border-purple-200/60 group-hover:bg-purple-100/70',
    activeText: 'text-purple-900',
  },
  dashboard: {
    stepTagClass: 'text-slate-500',
    activeContainer: 'bg-slate-100 text-slate-900 font-bold border border-slate-200 shadow-2xs',
    inactiveContainer: 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium border border-transparent',
    activeIconBox: 'bg-slate-800 text-white shadow-xs',
    inactiveIconBox: 'bg-slate-100 text-slate-500 group-hover:bg-slate-200/80',
    activeText: 'text-slate-900',
  },
  admin_portal: {
    stepTagClass: 'text-[#da1c2d]',
    activeContainer: 'bg-rose-50 text-[#da1c2d] font-bold border border-rose-200 shadow-2xs',
    inactiveContainer: 'text-slate-600 hover:text-slate-900 hover:bg-rose-50/50 font-medium border border-transparent',
    activeIconBox: 'bg-[#da1c2d] text-white shadow-xs',
    inactiveIconBox: 'bg-rose-50 text-[#da1c2d] border border-rose-200 group-hover:bg-rose-100',
    activeText: 'text-[#da1c2d]',
  },
};

export const Sidebar: React.FC<SidebarProps> = ({
  currentScreen,
  onNavigate,
  pendingReviewCount,
  currentUser,
  onLogout,
}) => {
  const activeRole: UserRole = currentUser?.role || 'lecturer';

  const filteredNavItems = useMemo<NavItem[]>(() => {
    const lecturerWorkflow: NavItem[] = [
      {
        id: 'dashboard',
        label: 'Tổng quan Học thuật',
        icon: LayoutDashboard,
      },
      {
        id: 'upload',
        stepTag: 'Bước 1',
        label: 'Kho Giáo trình Môn học',
        icon: UploadCloud,
      },
      {
        id: 'generate',
        stepTag: 'Bước 2',
        label: 'Sinh Câu hỏi AI (Bloom)',
        icon: Sparkles,
      },
      {
        id: 'review',
        stepTag: 'Bước 3',
        label: 'Đối soát & Biên tập Đề',
        icon: CheckSquare,
        badge: pendingReviewCount > 0 ? pendingReviewCount : undefined,
      },
      {
        id: 'bank',
        stepTag: 'Bước 4',
        label: 'Đóng gói & Xuất Đề Thi',
        icon: Database,
      },
    ];

    if (activeRole === 'admin') {
      return [
        {
          id: 'admin_portal',
          label: 'Cổng Quản trị Hệ thống',
          icon: ShieldCheck,
        },
        ...lecturerWorkflow,
      ];
    }

    return lecturerWorkflow;
  }, [activeRole, pendingReviewCount]);

  useEffect(() => {
    const isAllowed = filteredNavItems.some((item) => item.id === currentScreen);
    if (!isAllowed) {
      onNavigate(activeRole === 'admin' ? 'admin_portal' : 'dashboard');
    }
  }, [filteredNavItems, currentScreen, onNavigate, activeRole]);

  const getInitials = (name?: string, title?: string) => {
    if (title && title.includes('TS')) return 'TS';
    if (!name) return 'GV';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const isSystemAdmin = activeRole === 'admin';

  const displayName = currentUser
    ? `${currentUser.academicTitle ? currentUser.academicTitle + ' ' : ''}${currentUser.fullName}`
    : 'TS. Nguyễn Văn An';

  const initials = getInitials(currentUser?.fullName, currentUser?.academicTitle);

  return (
    <aside className="w-64 bg-white text-slate-700 flex flex-col border-r border-slate-200 shrink-0 select-none relative z-20">
      {/* Top UTH Accent Line */}
      <div className="h-1 w-full bg-[#008689]" />

      {/* Brand Header */}
      <div className="px-5 py-4 border-b border-slate-100 flex items-center space-x-3">
        <img
          src="/logo.jpg"
          alt="QuizGen AI Logo"
          className="w-9 h-9 rounded-xl shadow-sm object-cover border border-[#008689]/20 shrink-0"
        />
        <div className="min-w-0">
          <h1 className="font-extrabold text-[#008689] text-sm tracking-tight leading-tight">
            QuizGen AI
          </h1>
          <p className="text-[11px] text-slate-400 truncate">
            {isSystemAdmin ? 'Quản trị Hệ thống (2FA)' : 'Trợ lý Đề thi Giảng viên'}
          </p>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 py-4 px-3 space-y-1.5 overflow-y-auto">
        {filteredNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentScreen === item.id;
          const theme = NAV_ITEM_STYLES[item.id] || NAV_ITEM_STYLES.dashboard;

          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full group flex items-center justify-between px-3 py-2 rounded-xl text-left transition-all duration-150 ${
                isActive ? theme.activeContainer : theme.inactiveContainer
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                    isActive ? theme.activeIconBox : theme.inactiveIconBox
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                </div>
                <div className="min-w-0">
                  {item.stepTag && (
                    <span
                      className={`block text-[9px] font-extrabold uppercase tracking-wider ${theme.stepTagClass}`}
                    >
                      {item.stepTag}
                    </span>
                  )}
                  <span
                    className={`text-xs truncate block leading-snug ${
                      isActive ? theme.activeText : 'text-slate-700'
                    }`}
                  >
                    {item.label}
                  </span>
                </div>
              </div>

              {item.badge !== undefined && (
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Clean Profile Footer */}
      <div className="p-3.5 border-t border-slate-100 bg-slate-50/50">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center space-x-2.5 min-w-0">
            {currentUser?.avatarUrl ? (
              <img
                src={currentUser.avatarUrl}
                alt={displayName}
                referrerPolicy="no-referrer"
                className="w-8 h-8 rounded-lg object-cover border border-slate-200 shrink-0 bg-white"
              />
            ) : (
              <div
                className={`w-8 h-8 rounded-lg bg-gradient-to-br ${
                  isSystemAdmin ? 'from-[#da1c2d] to-rose-700' : 'from-[#008689] to-[#1d999d]'
                } flex items-center justify-center font-bold text-white text-xs shrink-0`}
              >
                {initials}
              </div>
            )}
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-800 truncate">{displayName}</div>
              <div className="text-[10px] text-slate-500 truncate">
                {isSystemAdmin ? 'Quản trị Hệ thống (2FA)' : 'Giảng viên Học thuật'}
              </div>
            </div>
          </div>

          <button
            id="sidebar-logout-btn"
            onClick={onLogout}
            title="Đăng xuất"
            className="text-slate-400 hover:text-[#da1c2d] transition-colors p-1.5 rounded-lg hover:bg-rose-50 shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
