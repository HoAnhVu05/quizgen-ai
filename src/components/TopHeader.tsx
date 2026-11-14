import React, { useState } from 'react';
import { Search, Menu } from 'lucide-react';
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
  onOpenProfileModal?: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  onNavigate,
  onToggleMobileMenu,
}) => {
  const [searchValue, setSearchValue] = useState('');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onNavigate) {
      onNavigate('bank');
    }
  };

  return (
    <header className="h-14 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center z-30 shrink-0 select-none shadow-2xs">
      {/* Mobile Drawer Toggle (Chỉ hiện trên điện thoại) */}
      {onToggleMobileMenu && (
        <button
          onClick={onToggleMobileMenu}
          className="p-1.5 mr-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 md:hidden transition-colors shrink-0"
          title="Mở menu điều hướng"
        >
          <Menu className="w-5 h-5" />
        </button>
      )}

      {/* Duy nhất thanh tìm kiếm trung tâm theo đúng yêu cầu */}
      <form onSubmit={handleSearchSubmit} className="flex-1 max-w-2xl mx-auto">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Tìm kiếm giáo trình môn học, ngân hàng câu hỏi, đề thi... (Ctrl + K)"
            className="w-full pl-10 pr-14 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-[#008689] focus:ring-1 focus:ring-[#008689] transition-all shadow-2xs"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-white border border-slate-200 text-slate-400 rounded shadow-2xs">
              Ctrl K
            </kbd>
          </div>
        </div>
      </form>
    </header>
  );
};

export default TopHeader;
