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
} from 'lucide-react';
import { ScreenId, UserProfile, UserRole } from '../types';

interface TopHeaderProps {
  currentScreen: ScreenId;
  currentUser: UserProfile | null;
  onLogout: () => void;
  onNavigate?: (screen: ScreenId) => void;
  onRoleSwitch?: (newRole: UserRole) => void;
  onShowToast: (
    type: 'success' | 'info' | 'warning' | 'error',
    title: string,
    message: string
  ) => void;
}

const WORKFLOW_STEPS: { id: ScreenId; step: string; label: string }[] = [
  { id: 'upload', step: '1', label: 'Nạp Giáo trình' },
  { id: 'generate', step: '2', label: 'Sinh Câu hỏi AI' },
  { id: 'review', step: '3', label: 'Biên tập & Đối soát' },
  { id: 'bank', step: '4', label: 'Đóng gói & Xuất Đề' },
];

export const TopHeader: React.FC<TopHeaderProps> = ({
  currentScreen,
  currentUser,
  onNavigate,
}) => {
  const isAdmin = currentUser?.role === 'admin';

  const getScreenMeta = (screen: ScreenId) => {
    switch (screen) {
      case 'admin_portal':
        return {
          label: 'Cổng Quản trị Hệ thống & Bảo mật 2FA',
          icon: ShieldCheck,
        };
      case 'dashboard':
        return {
          label: 'Bảng điều khiển Biên soạn Học thuật',
          icon: LayoutDashboard,
        };
      case 'upload':
        return {
          label: 'Bước 1/4: Kho Giáo trình & Tài liệu Môn học',
          icon: UploadCloud,
        };
      case 'generate':
        return {
          label: 'Bước 2/4: Sinh Câu hỏi AI theo Ma trận Bloom',
          icon: Sparkles,
        };
      case 'review':
        return {
          label: 'Bước 3/4: Đối soát Trích dẫn Sách & Biên tập Câu hỏi',
          icon: CheckSquare,
        };
      case 'bank':
        return {
          label: 'Bước 4/4: Phòng Đóng gói, Trộn Mã Đề & Xuất Bản Đề Thi (Word / PDF OMR / LMS)',
          icon: Database,
        };
      default:
        return { label: 'QuizGen AI', icon: Cpu };
    }
  };

  const screenMeta = getScreenMeta(currentScreen);
  const ScreenIcon = screenMeta.icon;

  return (
    <header className="h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between z-30 shrink-0 select-none">
      {/* Left: Screen Title */}
      <div className="flex items-center space-x-2.5 min-w-0">
        <ScreenIcon className="w-4 h-4 text-[#008689] shrink-0" />
        <h2 className="text-sm font-bold text-slate-800 truncate">{screenMeta.label}</h2>
      </div>

      {/* Right: Connected 4-Step Workflow Stepper for Lecturer OR 2FA Security Badge for Admin */}
      <div className="flex items-center space-x-2.5 shrink-0">
        {!isAdmin && onNavigate && (
          <div className="hidden xl:flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1">
            {WORKFLOW_STEPS.map((s, idx) => {
              const isCurrent = currentScreen === s.id;
              return (
                <React.Fragment key={s.id}>
                  <button
                    onClick={() => onNavigate(s.id)}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                      isCurrent
                        ? 'bg-[#008689] text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-200/70'
                    }`}
                  >
                    <span
                      className={`w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center ${
                        isCurrent ? 'bg-white text-[#008689]' : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {s.step}
                    </span>
                    <span>{s.label}</span>
                  </button>
                  {idx < WORKFLOW_STEPS.length - 1 && (
                    <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        )}

        {isAdmin && (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-rose-50 text-[#da1c2d] border border-rose-200">
              <ShieldCheck className="w-3.5 h-3.5" />
              Phiên Admin Đã Xác Thực 2FA
            </span>
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
