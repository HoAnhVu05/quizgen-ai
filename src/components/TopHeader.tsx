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
  Crown,
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
  subscriptionInfo,
  onOpenPricingModal,
  onNavigate,
  onAdminTabChange,
}) => {
  const isAdmin = currentUser?.role === 'admin';

  const getScreenMeta = (screen: ScreenId) => {
    switch (screen) {
      case 'admin_portal':
        return {
          label: 'Cổng Quản trị Hệ thống',
          icon: ShieldCheck,
          iconStyle: 'bg-rose-50 text-[#da1c2d] border-rose-200',
        };
      case 'dashboard':
        return {
          label: 'Bảng điều khiển Biên soạn Học thuật',
          icon: LayoutDashboard,
          iconStyle: 'bg-slate-100 text-slate-700 border-slate-200',
        };
      case 'upload':
        return {
          label: 'Bước 1/4: Kho Giáo trình & Tài liệu Môn học',
          icon: UploadCloud,
          iconStyle: 'bg-teal-50 text-[#008689] border-teal-200',
        };
      case 'generate':
        return {
          label: 'Bước 2/4: Sinh Câu hỏi AI theo Ma trận Bloom',
          icon: Sparkles,
          iconStyle: 'bg-blue-50 text-blue-600 border-blue-200',
        };
      case 'review':
        return {
          label: 'Bước 3/4: Đối soát Trích dẫn Sách & Biên tập Câu hỏi',
          icon: CheckSquare,
          iconStyle: 'bg-amber-50 text-amber-600 border-amber-200',
        };
      case 'bank':
        return {
          label: 'Bước 4/4: Phòng Đóng gói, Trộn Mã Đề & Xuất Bản Đề Thi (Word / PDF OMR / LMS)',
          icon: Database,
          iconStyle: 'bg-purple-50 text-purple-600 border-purple-200',
        };
      default:
        return {
          label: 'QuizGen AI',
          icon: Cpu,
          iconStyle: 'bg-slate-100 text-slate-700 border-slate-200',
        };
    }
  };

  const screenMeta = getScreenMeta(currentScreen);
  const ScreenIcon = screenMeta.icon;

  const currentStepIndex = WORKFLOW_STEPS.findIndex((s) => s.id === currentScreen);

  return (
    <header className="h-14 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between z-30 shrink-0 select-none">
      {/* Left: Screen Title with Distinct Step Icon Styling */}
      <div className="flex items-center gap-2.5 min-w-0 mr-3">
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border transition-colors ${screenMeta.iconStyle}`}
        >
          <ScreenIcon className="w-4 h-4" />
        </div>
        <h2 className="text-sm font-bold text-slate-800 truncate">{screenMeta.label}</h2>
      </div>

      {/* Right: 4-Step Color-Coded Workflow Stepper for Lecturer or health check for Admin */}
      <div className="flex items-center space-x-2.5 shrink-0">
        {!isAdmin && onNavigate && (
          <nav
            aria-label="Thanh tiến trình 4 bước biên soạn đề thi"
            className="hidden lg:flex items-center gap-1.5 bg-slate-50/90 border border-slate-200/90 rounded-2xl p-1 shadow-2xs"
          >
            {WORKFLOW_STEPS.map((s, idx) => {
              const isCurrent = currentScreen === s.id;
              const isCompleted = currentStepIndex !== -1 && idx < currentStepIndex;
              const isUpcoming = currentStepIndex === -1 ? false : idx > currentStepIndex;
              const StepIcon = s.icon;

              let btnClass = s.upcomingBtn;
              let badgeClass = s.upcomingBadge;
              let statusLabel = 'Chưa thực hiện';

              if (isCurrent) {
                btnClass = s.currentBtn;
                badgeClass = s.currentBadge;
                statusLabel = 'Đang thực hiện';
              } else if (isCompleted) {
                btnClass = s.completedBtn;
                badgeClass = s.completedBadge;
                statusLabel = 'Đã hoàn thành';
              }

              return (
                <React.Fragment key={s.id}>
                  <button
                    onClick={() => onNavigate(s.id)}
                    title={`Bước ${s.step}: ${s.label} (${statusLabel})`}
                    className={`group relative flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs transition-all duration-200 border ${btnClass} ${
                      isCurrent ? 'scale-[1.02]' : 'hover:scale-[1.01]'
                    }`}
                  >
                    {/* Badge: Shows Check icon if Completed, Step number if Current/Upcoming */}
                    <span
                      className={`w-5 h-5 rounded-full text-[11px] font-extrabold flex items-center justify-center shrink-0 transition-transform ${badgeClass}`}
                    >
                      {isCompleted ? (
                        <Check className="w-3 h-3 stroke-[3]" />
                      ) : (
                        s.step
                      )}
                    </span>

                    {/* Step Icon & Label */}
                    <span className="flex items-center gap-1.5 whitespace-nowrap">
                      <StepIcon className="w-3.5 h-3.5 shrink-0 opacity-90" />
                      <span className="font-bold">{s.label}</span>
                    </span>

                    {/* Active pulse indicator on current step */}
                    {isCurrent && (
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse shrink-0 ml-0.5" />
                    )}
                  </button>

                  {/* Connector arrow between steps */}
                  {idx < WORKFLOW_STEPS.length - 1 && (
                    <ChevronRight
                      className={`w-3.5 h-3.5 shrink-0 transition-colors ${
                        idx < currentStepIndex ? 'text-emerald-500' : 'text-slate-300'
                      }`}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </nav>
        )}

        {/* Subscription Plan Badge & Upgrade Action */}
        <div className="flex items-center gap-2">
          {subscriptionInfo?.plan_code === 'PRO_MONTH' || subscriptionInfo?.plan_code === 'PRO_YEAR' ? (
            <div 
              title={subscriptionInfo.expires_at ? `Gói PRO Giảng Viên (Hạn dùng: ${subscriptionInfo.expires_at.slice(0, 10)})` : 'Gói PRO Giảng Viên'}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-bold shadow-2xs cursor-pointer hover:bg-amber-100/80 transition-colors"
              onClick={onOpenPricingModal}
            >
              <Crown className="w-3.5 h-3.5 text-amber-600" />
              <span>Gói PRO Giảng Viên</span>
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
              className="px-3 py-1 rounded-lg text-[11px] font-bold bg-[#008689] text-white hover:bg-[#006d70] transition-colors"
            >
              Kiểm tra Sức khỏe
            </button>
            {onNavigate && currentScreen !== 'admin_portal' && (
              <button
                onClick={() => onNavigate('admin_portal')}
                className="px-3 py-1 rounded-lg text-[11px] font-bold bg-[#008689] text-white hover:bg-[#006d70] transition-colors"
              >
                Về Cổng Admin
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
};

export default TopHeader;
