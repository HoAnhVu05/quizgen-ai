import React, { useEffect, useMemo, useState } from 'react';
import {
  LayoutDashboard,
  UploadCloud,
  Sparkles,
  CheckSquare,
  Database,
  LogOut,
  ShieldCheck,
  Users,
  Server,
  Terminal,
  Activity,
  Layers,
  Pencil,
  X,
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
  onUpdateProfile?: (updates: {
    fullName: string;
    academicTitle: string;
    department?: string;
  }) => void;
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
  onUpdateProfile,
}) => {
  const activeRole: UserRole = currentUser?.role || 'lecturer';
  const isSystemAdmin = activeRole === 'admin';
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [draftTitle, setDraftTitle] = useState('');
  const [draftDept, setDraftDept] = useState('');

  const openProfileEditor = () => {
    if (!currentUser) return;
    setDraftName(currentUser.fullName || '');
    setDraftTitle(currentUser.academicTitle || '');
    setDraftDept(currentUser.department || currentUser.faculty || '');
    setShowProfileModal(true);
  };

  const filteredNavItems = useMemo<NavItem[]>(() => {
    // Nếu là Quản trị viên: Hiển thị bộ chức năng quản trị chuyên biệt, không hiển thị quy trình của giảng viên
    if (activeRole === 'admin') {
      return [
        {
          id: 'admin_portal',
          adminSubTab: 'overview',
          label: 'Tổng quan',
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
          label: 'Kiểm tra Sức khỏe Cụm 7 Services',
          icon: Server,
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
            {isSystemAdmin ? 'Quản trị Hệ thống' : 'Trợ lý Đề thi Giảng viên'}
          </p>
        </div>
      </div>

      {/* Role Title Section Header */}
      <div className="px-4 pt-3 pb-1">
        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
          {isSystemAdmin ? 'Phân Hệ Quản Trị' : 'Quy Trình Biên Soạn Đề'}
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
                {isSystemAdmin ? 'Quản trị Hệ thống' : 'Giảng viên Học thuật'}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-1 shrink-0">
            {onUpdateProfile && currentUser && !isSystemAdmin && (
              <button
                type="button"
                onClick={openProfileEditor}
                title="Đổi học vị & tên hiển thị"
                className="text-slate-400 hover:text-[#008689] transition-colors p-1.5 rounded-lg hover:bg-[#e0f7fa]"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            )}
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
      </div>

      {/* Quick Profile & Academic Title Edit Modal */}
      {showProfileModal && onUpdateProfile && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm select-text"
          onClick={() => setShowProfileModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white border border-slate-200 shadow-2xl p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">
                Cập nhật Học vị & Tên hiển thị
              </h3>
              <button
                type="button"
                onClick={() => setShowProfileModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!draftName.trim()) return;
                onUpdateProfile({
                  fullName: draftName,
                  academicTitle: draftTitle,
                  department: draftDept,
                });
                setShowProfileModal(false);
              }}
              className="space-y-3"
            >
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Học vị</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { value: '', label: 'Không' },
                    { value: 'CN.', label: 'CN.' },
                    { value: 'KS.', label: 'KS.' },
                    { value: 'ThS.', label: 'ThS.' },
                    { value: 'TS.', label: 'TS.' },
                    { value: 'PGS. TS.', label: 'PGS. TS.' },
                    { value: 'GS. TS.', label: 'GS. TS.' },
                  ].map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => setDraftTitle(item.value)}
                      className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition-colors ${
                        draftTitle === item.value
                          ? 'bg-[#008689] text-white border-[#008689]'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-white'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">Họ và tên</label>
                  <button
                    type="button"
                    onClick={() => {
                      const parts = draftName.trim().split(/\s+/);
                      if (parts.length > 1) setDraftName(parts.reverse().join(' '));
                    }}
                    className="text-[11px] font-semibold text-[#008689] hover:underline"
                  >
                    Đảo ngược tên
                  </button>
                </div>
                <input
                  type="text"
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#008689] text-xs font-semibold text-slate-900 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">Khoa / Đơn vị</label>
                <input
                  type="text"
                  value={draftDept}
                  onChange={(e) => setDraftDept(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#008689] text-xs text-slate-900 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowProfileModal(false)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#008689] hover:bg-[#006d70]"
                >
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
