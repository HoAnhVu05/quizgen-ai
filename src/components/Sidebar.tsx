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
  Users,
  Server,
  KeyRound,
  Terminal,
  Activity,
  Layers,
} from 'lucide-react';
import { ScreenId, UserProfile, UserRole } from '../types';

interface SidebarProps {
  currentScreen: ScreenId;
  onNavigate: (screen: ScreenId) => void;
  pendingReviewCount: number;
  currentUser?: UserProfile | null;
  onLogout: () => void;
  adminTab?: string;
  onAdminTabChange?: (tab: string) => void;
}

interface NavItem {
  id: ScreenId;
  adminSubTab?: string;
  label: string;
  stepTag?: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number | string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentScreen,
  onNavigate,
  pendingReviewCount,
  currentUser,
  onLogout,
  adminTab = 'overview',
  onAdminTabChange,
}) => {
  const activeRole: UserRole = currentUser?.role || 'lecturer';
  const isSystemAdmin = activeRole === 'admin';

  const filteredNavItems = useMemo<NavItem[]>(() => {
    // Nếu là Quản trị viên: Hiển thị bộ chức năng Quản trị Tối cao chuyên biệt, không hiển thị quy trình của giảng viên
    if (activeRole === 'admin') {
      return [
        {
          id: 'admin_portal',
          adminSubTab: 'overview',
          label: 'Tổng quan & Chỉ số Tối cao',
          icon: Activity,
        },
        {
          id: 'admin_portal',
          adminSubTab: 'users',
          label: 'Quản lý Tài khoản & Phân quyền',
          icon: Users,
        },
        {
          id: 'admin_portal',
          adminSubTab: 'services',
          label: 'Giám sát 6 Microservices',
          icon: Server,
        },
        {
          id: 'admin_portal',
          adminSubTab: 'security',
          label: 'Bảo mật & Cấu hình 2FA',
          icon: KeyRound,
        },
        {
          id: 'admin_portal',
          adminSubTab: 'audit',
          label: 'Nhật ký An ninh (Audit)',
          icon: Terminal,
        },
        {
          id: 'admin_portal',
          adminSubTab: 'exams',
          label: 'Kiểm soát Đề thi Toàn trường',
          icon: Database,
        },
      ];
    }

    // Quy trình làm việc của Giảng viên / Trưởng bộ môn
    return [
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
  }, [activeRole, pendingReviewCount]);

  useEffect(() => {
    if (isSystemAdmin && currentScreen !== 'admin_portal') {
      onNavigate('admin_portal');
    }
  }, [isSystemAdmin, currentScreen, onNavigate]);

  const getInitials = (name?: string, title?: string) => {
    if (title && title.includes('Admin')) return 'AD';
    if (title && title.includes('TS')) return 'TS';
    if (!name) return 'GV';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const displayName = currentUser
    ? `${currentUser.academicTitle ? currentUser.academicTitle + ' ' : ''}${currentUser.fullName}`
    : isSystemAdmin ? 'Ban Quản trị QuizGen AI' : 'TS. Nguyễn Văn An';

  const initials = getInitials(currentUser?.fullName, currentUser?.academicTitle);

  return (
    <aside className="w-64 bg-white text-slate-700 flex flex-col border-r border-slate-200 shrink-0 select-none relative z-20">
      {/* Top UTH Accent Line */}
      <div className={`h-1 w-full ${isSystemAdmin ? 'bg-gradient-to-r from-[#da1c2d] to-rose-600' : 'bg-[#008689]'}`} />

      {/* Brand Header */}
      <div className="px-5 py-4 border-b border-slate-100 flex items-center space-x-3">
        <img
          src="/logo.jpg"
          alt="QuizGen AI Logo"
          className="w-9 h-9 rounded-xl shadow-sm object-cover border border-[#008689]/20 shrink-0"
        />
        <div className="min-w-0">
          <h1 className="font-extrabold text-[#008689] text-sm tracking-tight leading-tight flex items-center gap-1.5">
            <span>QuizGen AI</span>
            {isSystemAdmin && (
              <span className="text-[9px] px-1.5 py-0.2 rounded font-extrabold bg-rose-50 text-[#da1c2d] border border-rose-200 uppercase">
                Admin
              </span>
            )}
          </h1>
          <p className="text-[11px] text-slate-400 truncate">
            {isSystemAdmin ? 'Quản trị Hệ thống (2FA)' : 'Trợ lý Đề thi Giảng viên'}
          </p>
        </div>
      </div>

      {/* Role Title Section Header */}
      <div className="px-4 pt-3 pb-1">
        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
          {isSystemAdmin ? 'Phân Hệ Quản Trị Tối Cao' : 'Quy Trình Biên Soạn Đề'}
        </span>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 py-1 px-3 space-y-1 overflow-y-auto">
        {filteredNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = isSystemAdmin
            ? currentScreen === 'admin_portal' && adminTab === item.adminSubTab
            : currentScreen === item.id;

          return (
            <button
              key={item.adminSubTab || item.id}
              onClick={() => {
                if (isSystemAdmin) {
                  onNavigate('admin_portal');
                  if (item.adminSubTab && onAdminTabChange) {
                    onAdminTabChange(item.adminSubTab);
                  }
                } else {
                  onNavigate(item.id);
                }
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-colors ${
                isActive
                  ? isSystemAdmin
                    ? 'bg-rose-50 text-[#da1c2d] font-bold border border-rose-100 shadow-xs'
                    : 'bg-[#e0f7fa]/80 text-[#006d70] font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium'
              }`}
            >
              <div className="flex items-center space-x-2.5 min-w-0">
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive
                      ? isSystemAdmin ? 'text-[#da1c2d]' : 'text-[#008689]'
                      : 'text-slate-400'
                  }`}
                />
                <div className="min-w-0">
                  {item.stepTag && (
                    <span className="block text-[9px] font-bold uppercase tracking-wider text-[#008689]">
                      {item.stepTag}
                    </span>
                  )}
                  <span className="text-xs truncate block">{item.label}</span>
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
                } flex items-center justify-center font-bold text-white text-xs shrink-0 shadow-xs`}
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

export default Sidebar;
