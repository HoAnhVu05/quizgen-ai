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
  CreditCard,
  Crown,
  Clock,
  Check,
  RefreshCw,
  ShoppingBag,
} from 'lucide-react';
import { ScreenId, UserProfile, UserRole } from '../types';
import { apiClient, API_BASE } from '../services/apiClient';

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
  onOpenPricingModal?: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

interface NavItem {
  id: ScreenId;
  adminSubTab?: string;
  label: string;
  stepTag?: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number | string;
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
  adminTab = 'overview',
  onAdminTabChange,
  onUpdateProfile,
  onOpenPricingModal,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const activeRole: UserRole = currentUser?.role || 'lecturer';
  const isSystemAdmin = activeRole === 'admin';
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileModalTab, setProfileModalTab] = useState<'profile' | 'billing'>('profile');
  const [draftName, setDraftName] = useState('');
  const [draftTitle, setDraftTitle] = useState('');
  const [draftDept, setDraftDept] = useState('');
  const [userOrders, setUserOrders] = useState<any[]>([]);
  const [userSub, setUserSub] = useState<any>(null);
  const [loadingBilling, setLoadingBilling] = useState(false);

  const openProfileEditor = async (tab: 'profile' | 'billing' = 'profile') => {
    if (!currentUser) return;
    setDraftName(currentUser.fullName || '');
    setDraftTitle(currentUser.academicTitle || '');
    setDraftDept(currentUser.department || currentUser.faculty || '');
    setProfileModalTab(tab);
    setShowProfileModal(true);

    setLoadingBilling(true);
    try {
      const [subRes, ordRes] = await Promise.all([
        apiClient.fetch(`${API_BASE}/payment/subscription/my?user_id=${currentUser.id}`).catch(() => null),
        apiClient.fetch(`${API_BASE}/payment/orders/history?user_id=${currentUser.id}`).catch(() => null),
      ]);
      if (subRes && subRes.ok) {
        const subData = await subRes.json();
        setUserSub(subData);
      }
      if (ordRes && ordRes.ok) {
        const ordData = await ordRes.json();
        setUserOrders(ordData.orders || []);
      }
    } catch (e) {
      console.error('[SIDEBAR PROFILE] Lỗi tải dữ liệu gói cước:', e);
    } finally {
      setLoadingBilling(false);
    }
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
          adminSubTab: 'payments',
          label: 'Quản lý Gói cước & Doanh thu',
          icon: CreditCard,
        },
        {
          id: 'admin_portal',
          adminSubTab: 'users',
          label: 'Quản lý Tài khoản & Phân quyền',
          icon: Users,
        },
        {
          id: 'admin_portal',
          adminSubTab: 'rbac',
          label: 'Ma trận Phân quyền RBAC',
          icon: Layers,
        },
        {
          id: 'admin_portal',
          adminSubTab: 'services',
          label: 'Kiểm tra Sức khỏe Cụm 8 Services',
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
    } else if (!isSystemAdmin && currentScreen === 'admin_portal') {
      onNavigate('dashboard');
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
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 md:hidden transition-opacity duration-300"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 md:static md:z-20 w-64 bg-white text-slate-700 flex flex-col border-r border-slate-200 shrink-0 select-none transition-transform duration-300 ease-in-out ${
          isMobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'
        }`}
      >
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
        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 md:hidden ml-auto"
            title="Đóng menu"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Role Title Section Header */}
      <div className="px-4 pt-3 pb-1">
        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
          {isSystemAdmin ? 'Phân Hệ Quản Trị' : 'Quy Trình Biên Soạn Đề'}
        </span>
      </div>

      {/* Navigation List */}
      {/* Navigation List */}
      <nav className="flex-1 py-2 px-3 space-y-1.5 overflow-y-auto">
        {filteredNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = isSystemAdmin
            ? currentScreen === 'admin_portal' && adminTab === item.adminSubTab
            : currentScreen === item.id;
          const theme = NAV_ITEM_STYLES[item.id] || NAV_ITEM_STYLES.dashboard;

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
              className={`w-full group flex items-center justify-between px-3 py-2 rounded-xl text-left transition-all duration-150 ${
                isActive
                  ? isSystemAdmin
                    ? 'bg-rose-50 text-[#da1c2d] font-bold border border-rose-200 shadow-2xs'
                    : theme.activeContainer
                  : isSystemAdmin
                  ? 'text-slate-600 hover:text-slate-900 hover:bg-rose-50/50 font-medium border border-transparent'
                  : theme.inactiveContainer
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                    isActive
                      ? isSystemAdmin
                        ? 'bg-[#da1c2d] text-white shadow-xs'
                        : theme.activeIconBox
                      : isSystemAdmin
                      ? 'bg-rose-50 text-[#da1c2d] border border-rose-200 group-hover:bg-rose-100'
                      : theme.inactiveIconBox
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
                      isActive
                        ? isSystemAdmin
                          ? 'text-[#da1c2d]'
                          : theme.activeText
                        : 'text-slate-700'
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
          <div
            onClick={() => openProfileEditor('profile')}
            className="flex items-center space-x-2.5 min-w-0 cursor-pointer group"
            title="Nhấn để xem thông tin tài khoản & gói cước"
          >
            {currentUser?.avatarUrl ? (
              <img
                src={currentUser.avatarUrl}
                alt={displayName}
                referrerPolicy="no-referrer"
                className="w-8 h-8 rounded-lg object-cover border border-slate-200 shrink-0 bg-white group-hover:border-[#008689] transition-colors"
              />
            ) : (
              <div
                className={`w-8 h-8 rounded-lg bg-gradient-to-br ${
                  isSystemAdmin ? 'from-[#da1c2d] to-rose-700' : 'from-[#008689] to-[#1d999d]'
                } flex items-center justify-center font-bold text-white text-xs shrink-0 shadow-xs group-hover:opacity-90 transition-opacity`}
              >
                {initials}
              </div>
            )}
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-800 truncate group-hover:text-[#008689] transition-colors">
                {displayName}
              </div>
              <div className="text-[10px] text-slate-500 truncate">
                {isSystemAdmin ? 'Quản trị Hệ thống' : 'Giảng viên Học thuật'}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-1 shrink-0">
            {currentUser && !isSystemAdmin && (
              <>
                <button
                  type="button"
                  onClick={() => openProfileEditor('billing')}
                  title="Xem gói cước & lịch sử mua"
                  className="text-slate-400 hover:text-amber-600 transition-colors p-1.5 rounded-lg hover:bg-amber-50"
                >
                  <Crown className="w-3.5 h-3.5" />
                </button>
                {onUpdateProfile && (
                  <button
                    type="button"
                    onClick={() => openProfileEditor('profile')}
                    title="Đổi học vị & tên hiển thị"
                    className="text-slate-400 hover:text-[#008689] transition-colors p-1.5 rounded-lg hover:bg-[#e0f7fa]"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                )}
              </>
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

      {/* Account Profile, Subscription & Payment History Modal */}
      {showProfileModal && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm select-text"
          onClick={() => setShowProfileModal(false)}
        >
          <div
            className="w-full max-w-xl rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#008689]/10 text-[#008689] flex items-center justify-center font-bold">
                  {initials}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Tài Khoản Giảng Viên &amp; Gói Cước
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono">{currentUser?.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowProfileModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Internal Tabs */}
            <div className="flex items-center gap-1 px-5 pt-2 border-b border-slate-200 bg-slate-50/40">
              <button
                type="button"
                onClick={() => setProfileModalTab('profile')}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold border-b-2 transition-all ${
                  profileModalTab === 'profile'
                    ? 'border-[#008689] text-[#008689] bg-white rounded-t-lg'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>Hồ Sơ Học Thuật</span>
              </button>

              <button
                type="button"
                onClick={() => setProfileModalTab('billing')}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold border-b-2 transition-all ${
                  profileModalTab === 'billing'
                    ? 'border-amber-500 text-amber-700 bg-white rounded-t-lg'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Crown className="w-3.5 h-3.5 text-amber-500" />
                <span>Lịch Sử Mua Gói &amp; Thanh Toán</span>
                {userOrders.length > 0 && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 font-bold">
                    {userOrders.length}
                  </span>
                )}
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto flex-1 space-y-4">
              {/* TAB 1: ACADEMIC PROFILE */}
              {profileModalTab === 'profile' && onUpdateProfile && (
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
                  className="space-y-3.5"
                >
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">Học hàm / Học vị</label>
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
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700">Khoa / Đơn vị bộ môn</label>
                    <input
                      type="text"
                      value={draftDept}
                      onChange={(e) => setDraftDept(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#008689] text-xs text-slate-900 outline-none"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setShowProfileModal(false)}
                      className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#008689] hover:bg-[#006d70] transition-colors"
                    >
                      Lưu thay đổi
                    </button>
                  </div>
                </form>
              )}

              {/* TAB 2: BILLING & PURCHASE HISTORY */}
              {profileModalTab === 'billing' && (
                <div className="space-y-4">
                  {/* Current Active Plan Card */}
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-white border border-amber-200 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 text-white flex items-center justify-center font-bold shadow-xs shrink-0">
                        <Crown className="w-5 h-5 text-amber-100" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-900 text-sm">
                            {userSub?.plan_name || 'Gói Trải Nghiệm Miễn Phí'}
                          </h4>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                            {userSub?.status === 'active' ? 'Đang hiệu lực' : 'Miễn phí'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {userSub?.expires_at
                            ? `Hạn dùng đến: ${userSub.expires_at.slice(0, 10)}`
                            : 'Mặc định 3 giáo trình lưu trữ'}
                        </p>
                      </div>
                    </div>

                    {onOpenPricingModal && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowProfileModal(false);
                          onOpenPricingModal();
                        }}
                        className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs shadow-xs transition-all hover:scale-[1.02] shrink-0"
                      >
                        Nâng cấp / Gia hạn gói
                      </button>
                    )}
                  </div>

                  {/* Quotas Progress */}
                  {userSub?.quotas && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                        <span className="text-[11px] font-bold text-slate-500 block">Giáo trình đã nạp</span>
                        <div className="text-base font-black text-slate-900">
                          {userSub.quotas.documents_used} / {userSub.quotas.max_documents >= 999999 ? '∞' : userSub.quotas.max_documents} file
                        </div>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                        <span className="text-[11px] font-bold text-slate-500 block">Câu hỏi AI tháng này</span>
                        <div className="text-base font-black text-slate-900">
                          {userSub.quotas.questions_used_month} / {userSub.quotas.max_questions_month >= 999999 ? '∞' : userSub.quotas.max_questions_month} câu
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Orders History List */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-slate-900 text-xs">Lịch Sử Mua Gói Cước</h4>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {userOrders.length} giao dịch
                      </span>
                    </div>

                    {loadingBilling ? (
                      <div className="py-8 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#008689]" />
                        <span>Đang tải lịch sử thanh toán...</span>
                      </div>
                    ) : userOrders.length === 0 ? (
                      <div className="py-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 p-4 space-y-2">
                        <ShoppingBag className="w-6 h-6 text-slate-300 mx-auto" />
                        <p className="text-xs text-slate-500">
                          Bạn chưa phát sinh giao dịch thanh toán nào.
                        </p>
                        {onOpenPricingModal && (
                          <button
                            type="button"
                            onClick={() => {
                              setShowProfileModal(false);
                              onOpenPricingModal();
                            }}
                            className="text-xs font-bold text-[#008689] hover:underline"
                          >
                            Xem các gói cước PRO ưu đãi chỉ từ 2.000đ →
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                            <tr>
                              <th className="py-2.5 px-3">Mã Đơn</th>
                              <th className="py-2.5 px-3">Gói Cước</th>
                              <th className="py-2.5 px-3">Số Tiền</th>
                              <th className="py-2.5 px-3">Ngày Mua</th>
                              <th className="py-2.5 px-3">Trạng Thái</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {userOrders.map((ord: any) => (
                              <tr key={ord.id} className="hover:bg-slate-50">
                                <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                                  #{ord.order_code}
                                </td>
                                <td className="py-2.5 px-3 font-semibold text-slate-900">
                                  {ord.plan_name}
                                </td>
                                <td className="py-2.5 px-3 font-mono font-bold text-amber-600">
                                  {ord.amount_vnd.toLocaleString('vi-VN')}đ
                                </td>
                                <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">
                                  {ord.created_at.slice(0, 16)}
                                </td>
                                <td className="py-2.5 px-3">
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                      ord.status === 'COMPLETED'
                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                        : ord.status === 'PENDING'
                                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                        : 'bg-slate-100 text-slate-600'
                                    }`}
                                  >
                                    {ord.status === 'COMPLETED'
                                      ? 'Thành công'
                                      : ord.status === 'PENDING'
                                      ? 'Chờ thanh toán'
                                      : ord.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </aside>
    </>
  );
};

export default Sidebar;
