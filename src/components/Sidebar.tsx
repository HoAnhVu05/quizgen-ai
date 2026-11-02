import React from 'react';
import {
  LayoutDashboard,
  UploadCloud,
  Sparkles,
  CheckSquare,
  Database,
  GraduationCap,
  BookOpen,
  Settings,
  LogOut,
  ChevronRight,
  ShieldCheck,
  Cpu,
  Layers
} from 'lucide-react';
import { ScreenId } from '../types';

interface SidebarProps {
  currentScreen: ScreenId;
  onNavigate: (screen: ScreenId) => void;
  pendingReviewCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentScreen,
  onNavigate,
  pendingReviewCount
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

  return (
    <aside className="w-72 bg-[#090d16] text-slate-300 flex flex-col border-r border-white/[0.07] shrink-0 select-none relative z-20">
      {/* Brand Header */}
      <div className="p-5 border-b border-white/[0.06]">
        <div className="flex items-center space-x-3.5">
          <div className="relative group cursor-pointer">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-400 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 group-hover:shadow-blue-500/40 transition-all duration-300">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 border-2 border-[#090d16] rounded-full animate-pulse" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center space-x-2">
              <h1 className="font-extrabold text-white text-base tracking-tight">QuizGen</h1>
              <span className="text-[10px] font-mono font-bold uppercase px-1.5 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20">
                PRO AI
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium truncate">Khảo thí Đại học Quốc gia</p>
          </div>
        </div>
      </div>

      {/* Navigation List */}
      <div className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          <span>Phân hệ tác vụ</span>
          <span className="text-[10px] text-slate-400 font-mono">v2.4</span>
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
                  ? 'bg-gradient-to-r from-blue-600/15 via-indigo-600/10 to-transparent text-white border border-blue-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
              }`}
            >
              {/* Left active accent bar */}
              {isActive && (
                <div className="absolute left-0 top-2 bottom-2 w-1 bg-gradient-to-b from-blue-400 to-indigo-500 rounded-r-full shadow-glow-sm" />
              )}

              <div className="flex items-center space-x-3 min-w-0 pl-1">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                      : 'bg-white/[0.05] text-slate-400 group-hover:text-slate-200 group-hover:bg-white/[0.08]'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                </div>

                <div className="truncate">
                  <div className={`text-xs font-semibold truncate leading-tight ${isActive ? 'text-white' : 'text-slate-300'}`}>
                    {item.label}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate mt-0.5">
                    {item.subtitle}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-1.5 shrink-0 ml-2">
                {item.badge !== undefined && (
                  <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 animate-pulse">
                    {item.badge}
                  </span>
                )}
                <span className="hidden group-hover:inline-block text-[10px] font-mono text-slate-400 bg-white/[0.06] px-1.5 py-0.5 rounded">
                  {item.shortcut}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* RAG Engine Status Pill */}
      <div className="px-3 pb-3">
        <div className="p-3 rounded-xl bg-gradient-to-b from-white/[0.04] to-white/[0.01] border border-white/[0.06] space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-blue-400" />
              RAG Engine v3
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-mono font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              Hoạt động
            </span>
          </div>
          <div className="w-full bg-white/[0.06] h-1.5 rounded-full overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full w-[42%]" />
          </div>
          <div className="flex justify-between text-[10px] text-slate-400 font-mono">
            <span>Quota Tokens</span>
            <span>420k / 1M</span>
          </div>
        </div>
      </div>

      {/* Profile Footer */}
      <div className="p-3.5 border-t border-white/[0.06] bg-[#070b13]">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white text-xs border border-white/20 shadow-sm">
              TS
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-white truncate flex items-center gap-1">
                <span>TS. Nguyễn Văn A</span>
                <ShieldCheck className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              </div>
              <div className="text-[10px] text-slate-400 truncate">Khoa Kinh tế - ĐHQG</div>
            </div>
          </div>

          <button className="text-slate-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/[0.06]">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
