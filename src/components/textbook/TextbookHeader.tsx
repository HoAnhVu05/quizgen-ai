import React from 'react';
import { UploadCloud, Crown, RefreshCw, Lock, BookOpen, Users } from 'lucide-react';
import { ScreenId } from '../../types';

interface TextbookHeaderProps {
  isEnterprise: boolean;
  isPro: boolean;
  isLoadingDocuments: boolean;
  onRefresh: () => void;
  activeTab: 'my' | 'library' | 'qgroup';
  onTabChange: (tab: 'my' | 'library' | 'qgroup') => void;
  onNavigate: (screen: ScreenId) => void;
  myBooksCount: number;
  libraryBooksCount: number;
}

export const TextbookHeader: React.FC<TextbookHeaderProps> = ({
  isEnterprise,
  isPro,
  isLoadingDocuments,
  onRefresh,
  activeTab,
  onTabChange,
  onNavigate,
  myBooksCount,
  libraryBooksCount,
}) => {
  return (
    <>
      {/* 1. Clean Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pb-3 sm:pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[11px] font-extrabold uppercase tracking-wider bg-teal-50 text-[#008689] border border-teal-200 shadow-2xs">
              <UploadCloud className="w-3.5 h-3.5 text-[#008689]" />
              Bước 1/4 • Nạp &amp; Quản Lý Giáo Trình Môn Học
            </span>
          </div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Kho Giáo Trình Học Thuật &amp; Hội Nhóm Chuyên Môn
          </h1>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <p className="text-xs text-slate-500">
              Quản lý tài liệu cá nhân, tra cứu Thư viện giáo trình mở và chia sẻ nội bộ qua hội nhóm Q-Group.
            </p>
            {isEnterprise ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                <Crown className="w-3 h-3 text-purple-600" /> Đặc quyền Gói Khoa &amp; Bộ Môn: Tối đa 100MB/tài liệu
              </span>
            ) : isPro ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                <Crown className="w-3 h-3 text-amber-600" /> Gói PRO: Tối đa 50MB/tài liệu
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                Gói Miễn Phí (Tối đa 3 tài liệu, 15MB/file)
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onRefresh}
            disabled={isLoadingDocuments}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 shadow-2xs cursor-pointer transition-all"
            title="Đồng bộ danh sách"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingDocuments ? 'animate-spin text-[#008689]' : ''}`} />
            <span className="hidden sm:inline">Làm mới</span>
          </button>
        </div>
      </div>

      {/* 2. Interactive Feature Tabs Switcher */}
      <div className="flex items-center gap-2 p-1 bg-slate-200/60 rounded-2xl w-full sm:w-fit border border-slate-200/80">
        <button
          onClick={() => onTabChange('my')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'my'
              ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Lock className="w-3.5 h-3.5 text-[#008689]" />
          <span>Giáo Trình Của Tôi</span>
          <span className="px-2 py-0.5 text-[10px] rounded-full bg-teal-50 text-[#008689] font-black border border-teal-200">
            {myBooksCount}
          </span>
        </button>

        <button
          onClick={() => onTabChange('library')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'library'
              ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5 text-blue-600" />
          <span>Thư Viện Giáo Trình</span>
          <span className="px-2 py-0.5 text-[10px] rounded-full bg-blue-50 text-blue-700 font-black border border-blue-200">
            {libraryBooksCount}
          </span>
        </button>

        <button
          onClick={() => onNavigate('qgroup')}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-purple-700 bg-purple-50/70 hover:bg-purple-100 hover:text-purple-900 border border-purple-200/60 transition-all cursor-pointer ml-auto sm:ml-0"
          title="Chuyển sang module Trò chuyện & Hội nhóm chuyên môn độc lập"
        >
          <Users className="w-3.5 h-3.5 text-purple-600" />
          <span>Hội Nhóm Q-Group</span>
          <span className="text-[10px] text-purple-500 font-normal">→</span>
        </button>
      </div>
    </>
  );
};
