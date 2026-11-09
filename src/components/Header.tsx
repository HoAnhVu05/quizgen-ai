import React, { useState } from 'react';
import {
  Menu,
  PanelLeftClose,
  PanelLeft,
  Cpu,
  Zap,
  Sparkles,
  ShieldCheck,
  Award,
  GraduationCap,
  Info,
  LogOut,
  ChevronRight,
  Database,
  CheckCircle2,
} from 'lucide-react';
import { ScreenId, UserProfile, UserRole } from '../types';

interface HeaderProps {
  currentScreen: ScreenId;
  currentUser: UserProfile | null;
  onNavigate: (screen: ScreenId) => void;
  onLogout: () => void;
  isSidebarCollapsed: boolean;
  onToggleSidebar: () => void;
}

const SCREEN_TITLES: Record<ScreenId, { title: string; category: string }> = {
  dashboard: { title: 'Bảng điều khiển Tổng quan', category: 'Chỉ số & Ma trận Bloom' },
  upload: { title: 'Quản lý & Nạp Giáo trình', category: 'RAG Knowledge Base' },
  generate: { title: 'Khởi tạo Đề thi AI', category: 'AI Exam Engineering' },
  review: { title: 'Không gian Kiểm duyệt', category: 'Đối soát Trích dẫn RAG' },
  bank: { title: 'Ngân hàng & Đề thi', category: 'Kho lưu trữ ĐHQG' },
};

export const Header: React.FC<HeaderProps> = ({
  currentScreen,
  currentUser,
  onNavigate,
  onLogout,
  isSidebarCollapsed,
  onToggleSidebar,
}) => {
  const [showQuotaTooltip, setShowQuotaTooltip] = useState(false);

  const screenInfo = SCREEN_TITLES[currentScreen] || {
    title: 'Phân hệ Khảo thí',
    category: 'QuizGen AI',
  };

  const getRoleConfig = (role?: UserRole) => {
    switch (role) {
      case 'admin':
        return {
          label: 'Quản trị Khảo thi',
          icon: ShieldCheck,
          accentClass: 'text-amber-400',
          badgeBorder: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
          headerGlow: 'from-amber-500/10 via-transparent to-transparent',
          topLineGlow: 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600',
          quota: {
            unlimited: true,
            usedTokens: 42850,
            totalTokens: 0,
            percent: 0,
            rateLimit: 'Không giới hạn',
            tierName: 'Unlimited Enterprise',
          },
        };
      case 'head_of_department':
        return {
          label: 'Trưởng bộ môn',
          icon: Award,
          accentClass: 'text-purple-400',
          badgeBorder: 'border-purple-500/30 bg-purple-500/10 text-purple-300',
          headerGlow: 'from-purple-500/10 via-transparent to-transparent',
          topLineGlow: 'bg-gradient-to-r from-purple-500 via-indigo-500 to-purple-600',
          quota: {
            unlimited: false,
            usedTokens: 14200,
            totalTokens: 25000,
            percent: 56.8,
            rateLimit: '10 lượt/phút',
            tierName: 'Academic Head Tier',
          },
        };
      default:
        return {
          label: 'Giảng viên',
          icon: GraduationCap,
          accentClass: 'text-blue-400',
          badgeBorder: 'border-blue-500/30 bg-blue-500/10 text-blue-300',
          headerGlow: 'from-blue-500/10 via-transparent to-transparent',
          topLineGlow: 'bg-gradient-to-r from-blue-500 via-indigo-500 to-sky-400',
          quota: {
            unlimited: false,
            usedTokens: 8450,
            totalTokens: 10000,
            percent: 84.5,
            rateLimit: '5 lượt/phút',
            tierName: 'Lecturer Standard Tier',
          },
        };
    }
  };

  const roleConfig = getRoleConfig(currentUser?.role);
  const RoleIcon = roleConfig.icon;

  return (
    <header className="relative z-30 shrink-0 bg-[#090d16]/95 backdrop-blur-md border-b border-white/[0.07] px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3 select-none">
      {/* Top Cyber Glow Line theo vai trò */}
      <div className={`absolute top-0 left-0 right-0 h-[2px] ${roleConfig.topLineGlow} opacity-80`} />

      {/* Left: Sidebar Toggle & Breadcrumb */}
      <div className="flex items-center space-x-3 min-w-0">
        <button
          onClick={onToggleSidebar}
          title={isSidebarCollapsed ? 'Mở rộng thanh điều hướng (⌘B)' : 'Thu gọn thanh điều hướng (⌘B)'}
          className="p-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white border border-white/[0.08] transition-colors shrink-0"
        >
          {isSidebarCollapsed ? (
            <PanelLeft className="w-4 h-4 text-blue-400" />
          ) : (
            <PanelLeftClose className="w-4 h-4 text-slate-400" />
          )}
        </button>

        <div className="flex items-center space-x-2 text-xs truncate">
          <span className="text-slate-400 font-medium hidden sm:inline">QuizGen AI</span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400 hidden sm:inline shrink-0" />
          <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-white/[0.04] text-slate-300 border border-white/[0.06] shrink-0 hidden md:inline">
            {screenInfo.category}
          </span>
          <span className="font-bold text-white truncate text-xs sm:text-sm">
            {screenInfo.title}
          </span>
        </div>
      </div>

      {/* Right: RAG Status, AI Token Quota Widget & Role Badge */}
      <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
        {/* RAG Engine Status Pill */}
        <div className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-[11px] font-mono text-emerald-300">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          <span>RAG ChromaDB v3</span>
        </div>

        {/* ================================================================= */}
        {/* AI TOKEN QUOTA WIDGET (Theo 3 vai trò Giảng viên/TBM/Khảo thí)   */}
        {/* ================================================================= */}
        <div
          className="relative"
          onMouseEnter={() => setShowQuotaTooltip(true)}
          onMouseLeave={() => setShowQuotaTooltip(false)}
        >
          <div className="flex items-center space-x-2.5 px-3 py-1.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] cursor-pointer transition-all">
            <div className="flex items-center space-x-1.5">
              <Zap className={`w-3.5 h-3.5 ${roleConfig.accentClass} animate-pulse`} />
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 hidden sm:inline">
                AI Quota:
              </span>
            </div>

            {roleConfig.quota.unlimited ? (
              <div className="flex items-center space-x-1 text-xs font-mono font-bold text-amber-300">
                <span className="text-sm">∞</span>
                <span className="text-[11px]">Unlimited</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                {/* Mini Visual Quota Bar */}
                <div className="w-14 sm:w-20 bg-white/[0.08] h-1.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      roleConfig.quota.percent > 80
                        ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                        : 'bg-gradient-to-r from-blue-500 to-indigo-500'
                    }`}
                    style={{ width: `${roleConfig.quota.percent}%` }}
                  />
                </div>
                <span className="font-mono text-xs font-bold text-slate-200">
                  {(roleConfig.quota.usedTokens / 1000).toFixed(1)}k
                  <span className="text-slate-400 font-normal">/{(roleConfig.quota.totalTokens / 1000)}k</span>
                </span>
              </div>
            )}
          </div>

          {/* Quota Popover / Tooltip */}
          {showQuotaTooltip && (
            <div className="absolute right-0 top-full mt-2 w-72 glass-panel p-4 rounded-2xl border border-white/[0.12] shadow-2xl space-y-3 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                <div className="flex items-center space-x-2">
                  <Sparkles className={`w-4 h-4 ${roleConfig.accentClass}`} />
                  <span className="text-xs font-bold text-white">Hạn mức Token AI Google Gemini</span>
                </div>
                <span className={`text-[9px] font-mono font-semibold px-2 py-0.5 rounded border ${roleConfig.badgeBorder}`}>
                  {roleConfig.label}
                </span>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Gói chính sách:</span>
                  <span className="font-semibold text-slate-200">{roleConfig.quota.tierName}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Đã tiêu thụ hôm nay:</span>
                  <span className="font-mono font-bold text-white">
                    {roleConfig.quota.unlimited
                      ? `${roleConfig.quota.usedTokens.toLocaleString('vi-VN')} tokens (Không trừ hạn mức)`
                      : `${roleConfig.quota.usedTokens.toLocaleString('vi-VN')} / ${roleConfig.quota.totalTokens.toLocaleString('vi-VN')} (${roleConfig.quota.percent}%)`}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Tần suất tạo sinh (Rate Limit):</span>
                  <span className="font-mono text-blue-300 font-medium">{roleConfig.quota.rateLimit}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Chu kỳ làm mới Quota:</span>
                  <span className="text-slate-300">00:00 hàng ngày (Giờ VN)</span>
                </div>
              </div>

              {!roleConfig.quota.unlimited && (
                <div className="space-y-1 pt-1">
                  <div className="w-full bg-white/[0.06] h-2 rounded-full overflow-hidden p-0.5 border border-white/[0.08]">
                    <div
                      className={`h-full rounded-full ${
                        roleConfig.quota.percent > 80
                          ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                          : 'bg-gradient-to-r from-blue-500 to-indigo-500'
                      }`}
                      style={{ width: `${roleConfig.quota.percent}%` }}
                    />
                  </div>
                  {roleConfig.quota.percent > 80 && (
                    <p className="text-[10px] text-amber-300 leading-tight pt-0.5">
                      Đã sử dụng trên 80% quota trong ngày. Liên hệ Trưởng bộ môn hoặc Quản trị Khảo thí để gia hạn thêm.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Role Quick Indicator Pill */}
        <div className={`hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-xl border text-[11px] font-semibold ${roleConfig.badgeBorder}`}>
          <RoleIcon className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate max-w-[120px]">{roleConfig.label}</span>
        </div>
      </div>
    </header>
  );
};

