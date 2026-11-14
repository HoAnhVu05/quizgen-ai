import React from 'react';
import {
  ShieldCheck,
  Sparkles,
  Cpu,
  LayoutDashboard,
  UploadCloud,
  CheckSquare,
  Database,
  ChevronRight,
  Check,
  Menu,
  Activity,
} from 'lucide-react';
import { ScreenId, UserProfile, UserRole } from '../types';

interface TopHeaderProps {
  currentScreen: ScreenId;
  currentUser: UserProfile | null;
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
}

interface WorkflowStepConfig {
  id: ScreenId;
  step: string;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  colorName: string;
  // Current (Active) State
  currentBtn: string;
  currentBadge: string;
  // Completed State
  completedBtn: string;
  completedBadge: string;
  completedText: string;
  // Upcoming State
  upcomingBtn: string;
  upcomingBadge: string;
  upcomingText: string;
}

const WORKFLOW_STEPS: WorkflowStepConfig[] = [
  {
    id: 'upload',
    step: '1',
    label: 'Nạp Giáo trình',
    shortLabel: 'Nạp Giáo trình',
    icon: UploadCloud,
    colorName: 'Teal',
    currentBtn: 'bg-[#008689] text-white border-[#006d70] shadow-sm shadow-teal-500/20 ring-1 ring-[#008689]/30',
    currentBadge: 'bg-white text-[#008689]',
    completedBtn: 'bg-teal-50/90 text-teal-800 border-teal-200 hover:bg-teal-100/80',
    completedBadge: 'bg-teal-100 text-teal-800 border border-teal-300/60',
    completedText: 'text-teal-800',
    upcomingBtn: 'bg-slate-50/70 text-slate-500 border-slate-200/90 hover:bg-slate-100/80',
    upcomingBadge: 'bg-slate-200 text-slate-500',
    upcomingText: 'text-slate-500',
  },
  {
    id: 'generate',
    step: '2',
    label: 'Sinh Câu hỏi AI',
    shortLabel: 'Sinh Câu hỏi AI',
    icon: Sparkles,
    colorName: 'Blue',
    currentBtn: 'bg-blue-600 text-white border-blue-700 shadow-sm shadow-blue-500/20 ring-1 ring-blue-600/30',
    currentBadge: 'bg-white text-blue-600',
    completedBtn: 'bg-blue-50/90 text-blue-800 border-blue-200 hover:bg-blue-100/80',
    completedBadge: 'bg-blue-100 text-blue-800 border border-blue-300/60',
    completedText: 'text-blue-800',
    upcomingBtn: 'bg-slate-50/70 text-slate-500 border-slate-200/90 hover:bg-slate-100/80',
    upcomingBadge: 'bg-slate-200 text-slate-500',
    upcomingText: 'text-slate-500',
  },
  {
    id: 'review',
    step: '3',
    label: 'Biên tập & Đối soát',
    shortLabel: 'Biên tập & Đối soát',
    icon: CheckSquare,
    colorName: 'Amber',
    currentBtn: 'bg-amber-500 text-white border-amber-600 shadow-sm shadow-amber-500/20 ring-1 ring-amber-500/30',
    currentBadge: 'bg-white text-amber-700',
    completedBtn: 'bg-amber-50/90 text-amber-900 border-amber-200 hover:bg-amber-100/80',
    completedBadge: 'bg-amber-100 text-amber-900 border border-amber-300/60',
    completedText: 'text-amber-900',
    upcomingBtn: 'bg-slate-50/70 text-slate-500 border-slate-200/90 hover:bg-slate-100/80',
    upcomingBadge: 'bg-slate-200 text-slate-500',
    upcomingText: 'text-slate-500',
  },
  {
    id: 'bank',
    step: '4',
    label: 'Đóng gói & Xuất Đề',
    shortLabel: 'Đóng gói & Xuất Đề',
    icon: Database,
    colorName: 'Purple',
    currentBtn: 'bg-purple-600 text-white border-purple-700 shadow-sm shadow-purple-500/20 ring-1 ring-purple-600/30',
    currentBadge: 'bg-white text-purple-700',
    completedBtn: 'bg-purple-50/90 text-purple-900 border-purple-200 hover:bg-purple-100/80',
    completedBadge: 'bg-purple-100 text-purple-900 border border-purple-300/60',
    completedText: 'text-purple-900',
    upcomingBtn: 'bg-slate-50/70 text-slate-500 border-slate-200/90 hover:bg-slate-100/80',
    upcomingBadge: 'bg-slate-200 text-slate-500',
    upcomingText: 'text-slate-500',
  },
];

export const TopHeader: React.FC<TopHeaderProps> = ({
  currentScreen,
  currentUser,
  onNavigate,
  onAdminTabChange,
  onToggleMobileMenu,
}) => {
  const isAdmin = currentUser?.role === 'admin';

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
          label: 'Bước 4/4: Phòng Đóng gói, Trộn Mã Đề & Xuất Bản Đề Thi (Word / PDF OMR / LMS)',
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

  const currentStepIndex = WORKFLOW_STEPS.findIndex((s) => s.id === currentScreen);

  return (
    <header className="h-14 bg-white border-b border-slate-200 px-3 sm:px-6 flex items-center justify-between z-30 shrink-0 select-none">
      {/* Left: Mobile Hamburger + Screen Title */}
      <div className="flex items-center space-x-2.5 min-w-0 mr-3">
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 md:hidden transition-colors"
            title="Mở menu điều hướng"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-[#e0f7f6] text-[#008689]">
          <ScreenIcon className="w-4 h-4" />
        </div>
        <h2 className="text-sm font-bold text-slate-800 truncate">{screenMeta.label}</h2>
      </div>

      {/* Right: 4-Step Stepper for Lecturer or health check for Admin */}
      <div className="flex items-center space-x-2 shrink-0">
        {!isAdmin && onNavigate && (
          <nav
            aria-label="Thanh tiến trình 4 bước biên soạn đề thi"
            className="hidden lg:flex items-center gap-2"
          >
            {WORKFLOW_STEPS.map((s, idx) => {
              const isCurrent = currentScreen === s.id || (currentScreen === 'dashboard' && s.id === 'bank');
              const isCompleted = (currentStepIndex !== -1 && idx < currentStepIndex) || (currentScreen === 'dashboard' && idx < 3);

              let btnClass = 'bg-slate-100 text-slate-500 hover:bg-slate-200';
              let badgeClass = 'bg-slate-200 text-slate-600';

              if (isCurrent) {
                btnClass = 'bg-[#008689] text-white shadow-xs';
                badgeClass = 'bg-white/20 text-white';
              } else if (isCompleted) {
                btnClass = 'bg-[#dff5f4] text-[#007d80] hover:bg-[#cbf0ee]';
                badgeClass = 'bg-[#bdeae7] text-[#007d80]';
              }

              return (
                <button
                  key={s.id}
                  onClick={() => onNavigate(s.id)}
                  title={`Bước ${s.step}: ${s.label}`}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${btnClass}`}
                >
                  <span
                    className={`w-4 h-4 rounded-full text-[10px] font-extrabold flex items-center justify-center shrink-0 ${badgeClass}`}
                  >
                    {s.step}
                  </span>

                  <span>{s.label}</span>

                  {isCompleted && (
                    <Check className="w-3.5 h-3.5 text-[#007d80] stroke-[2.5]" />
                  )}
                </button>
              );
            })}
          </nav>
        )}

        {isAdmin && (
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => {
                onNavigate?.('admin_portal');
                onAdminTabChange?.('services');
              }}
              className="px-2.5 sm:px-3 py-1 rounded-lg text-[10px] sm:text-[11px] font-bold bg-[#008689] text-white hover:bg-[#006d70] transition-colors flex items-center gap-1"
            >
              <Activity className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Kiểm tra Sức khỏe</span>
              <span className="sm:hidden">Sức khỏe</span>
            </button>
            {onNavigate && currentScreen !== 'admin_portal' && (
              <button
                onClick={() => onNavigate('admin_portal')}
                className="px-2.5 sm:px-3 py-1 rounded-lg text-[10px] sm:text-[11px] font-bold bg-[#008689] text-white hover:bg-[#006d70] transition-colors whitespace-nowrap"
              >
                Cổng Admin
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
};

export default TopHeader;
