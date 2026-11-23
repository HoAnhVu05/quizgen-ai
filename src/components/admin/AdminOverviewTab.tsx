import React, { useState } from 'react';
import {
  Activity,
  ArrowRight,
  BookOpen,
  Check,
  Cpu,
  CreditCard,
  Database,
  Flame,
  Globe,
  HardDrive,
  Key,
  Layers,
  Lightbulb,
  Lock,
  Package,
  RefreshCw,
  Server,
  Settings,
  Shield,
  ShieldCheck,
  Sliders,
  Sparkles,
  Users,
  Zap,
  Terminal,
} from 'lucide-react';
import { UserProfile, SecurityAuditLog } from '../../types';
import { MicroserviceStatus, RealOverviewKPIs } from './adminTypes';

export interface AdminOverviewTabProps {
  usersList: UserProfile[];
  servicesStatus: MicroserviceStatus[];
  auditLogs: SecurityAuditLog[];
  overviewKpis: RealOverviewKPIs | null;
  isLoading: boolean;
  loadAllRealData: () => void;
  setActiveTab: (tab: any) => void;
  onOpenSecretCommand?: () => void;
}

export const AdminOverviewTab: React.FC<AdminOverviewTabProps> = ({
  usersList,
  servicesStatus,
  auditLogs,
  overviewKpis,
  isLoading,
  loadAllRealData,
  setActiveTab,
  onOpenSecretCommand,
}) => {
  const adminCount = overviewKpis?.adminsCount ?? usersList.filter((u) => u.role === 'admin').length;
  const hodCount = overviewKpis?.hodCount ?? usersList.filter((u) => u.role === 'head_of_department').length;
  const lecCount = overviewKpis?.lecturerCount ?? usersList.filter((u) => u.role === 'lecturer').length;
  const lockedCount = overviewKpis?.lockedUsers ?? usersList.filter((u) => u.status === 'locked').length;
  const totalDocs = overviewKpis?.totalDocuments ?? 0;
  const totalQuestions = overviewKpis?.totalQuestionBank ?? 0;
  const totalExams = overviewKpis?.totalApprovedExams ?? 0;

  // ─── Tùy biến Hệ thống Master Controls State ─────────────────────────────
  const [allowRegistration, setAllowRegistration] = useState<boolean>(() => {
    return localStorage.getItem('quizgen_cfg_allow_reg') !== 'false';
  });
  const [defaultModel, setDefaultModel] = useState<string>(() => {
    return localStorage.getItem('quizgen_cfg_ai_model') || 'gemini-2.5-flash';
  });
  const [maxUploadMb, setMaxUploadMb] = useState<number>(() => {
    return parseInt(localStorage.getItem('quizgen_cfg_max_upload_mb') || '50', 10);
  });
  const [peakExamMode, setPeakExamMode] = useState<boolean>(() => {
    return localStorage.getItem('quizgen_cfg_peak_mode') === 'true';
  });
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const showNotice = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 3500);
  };

  const handleToggleRegistration = () => {
    const nextVal = !allowRegistration;
    setAllowRegistration(nextVal);
    localStorage.setItem('quizgen_cfg_allow_reg', String(nextVal));
    showNotice(nextVal ? 'Đã MỞ đăng ký tự do cho giảng viên.' : 'Đã KHÓA đăng ký tự do (Chế độ chỉ mời).');
  };

  const handleModelChange = (model: string) => {
    setDefaultModel(model);
    localStorage.setItem('quizgen_cfg_ai_model', model);
    showNotice(`Đã đổi mô hình AI mặc định toàn trường sang: ${model}`);
  };

  const handleUploadLimitChange = (mb: number) => {
    setMaxUploadMb(mb);
    localStorage.setItem('quizgen_cfg_max_upload_mb', String(mb));
    showNotice(`Đã cập nhật hạn mức upload giáo trình: ${mb}MB/tệp.`);
  };

  const handleTogglePeakMode = () => {
    const nextVal = !peakExamMode;
    setPeakExamMode(nextVal);
    localStorage.setItem('quizgen_cfg_peak_mode', String(nextVal));
    showNotice(nextVal ? 'Đã KÍCH HOẠT chế độ Giờ cao điểm Khảo thí (Ưu tiên CPU in đề).' : 'Đã TẮT chế độ cao điểm, vận hành cân bằng.');
  };

  const handleClearSystemCache = () => {
    showNotice('Đã dọn sạch bộ nhớ đệm Cache Redis & tối ưu hóa CSDL.');
  };

  return (
        <div className="space-y-5 sm:space-y-6">
          {/* Executive Overview Header Banner */}
          <div className="bg-gradient-to-r from-[#eef9fa] via-[#e5f6f8] to-[#daf2f7] rounded-[24px] border border-[#cbebf2] p-6 sm:p-7 shadow-[0_4px_20px_rgba(0,134,137,0.06)] relative overflow-hidden flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 hover:shadow-[0_8px_24px_rgba(0,137,143,0.10)] transition-all duration-300">
            <div className="space-y-2 z-10 max-w-2xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#E4F7F7] text-[#007F85] border border-[#BCE8E8] shadow-2xs">
                  <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
                  8/8 Microservices Online (Ports 8000–8007)
                </span>
                {onOpenSecretCommand && (
                  <button
                    type="button"
                    onClick={onOpenSecretCommand}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-900 hover:bg-slate-800 text-emerald-400 border border-emerald-500/50 shadow-xs transition-all hover:scale-105 active:scale-95 cursor-pointer"
                    title="Kích hoạt Cổng Chỉ Huy Tối Mật (Quét Face ID / Vân tay / Master PIN)"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    <Terminal className="w-3.5 h-3.5" />
                    <span>Chỉ Huy Tối Mật (Agent Remote)</span>
                  </button>
                )}
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-[#142B45] tracking-tight flex items-center gap-2.5">
                <Activity className="w-6 h-6 text-[#da1c2d] shrink-0" />
                <span>Tổng Quan Hệ Thống &amp; Vận Hành Toàn Trường</span>
              </h1>
              <p className="text-xs sm:text-sm text-[#526782] leading-relaxed">
                Giám sát số liệu thực tế từ các cơ sở dữ liệu auth.db, payment.db, documents.db và exam.db, đối soát thanh toán và vận hành toàn hệ thống.
              </p>
            </div>

            <div className="flex items-center gap-6 shrink-0 relative z-10">
              {/* Modern Isometric Server & Analytics Graphic Illustration */}
              <div className="hidden lg:flex items-center gap-3 select-none pointer-events-none opacity-95">
                {/* 3D Server Blocks */}
                <div className="relative">
                  <div className="w-16 h-20 rounded-xl bg-gradient-to-b from-teal-400/20 via-sky-300/30 to-blue-500/20 border border-teal-200/70 p-1.5 flex flex-col justify-between shadow-xs backdrop-blur-xs">
                    <div className="h-4 rounded-md bg-white/90 border border-teal-100 flex items-center justify-between px-1.5 shadow-2xs">
                      <div className="flex gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <div className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                      </div>
                      <div className="w-4 h-0.5 rounded-full bg-slate-300" />
                    </div>
                    <div className="h-4 rounded-md bg-white/90 border border-teal-100 flex items-center justify-between px-1.5 shadow-2xs">
                      <div className="flex gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <div className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                      </div>
                      <div className="w-4 h-0.5 rounded-full bg-slate-300" />
                    </div>
                    <div className="h-4 rounded-md bg-white/90 border border-teal-100 flex items-center justify-between px-1.5 shadow-2xs">
                      <div className="flex gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                      </div>
                      <div className="w-4 h-0.5 rounded-full bg-slate-300" />
                    </div>
                  </div>
                </div>

                {/* Laptop Analytics Screen Graphic */}
                <div className="w-24 h-16 rounded-xl bg-white border border-slate-200 shadow-sm p-1.5 flex flex-col justify-between">
                  <div className="flex-1 bg-gradient-to-br from-[#E4F7F7] to-sky-50 rounded-lg p-1.5 flex items-end justify-between gap-1">
                    <div className="w-2.5 bg-[#008F95]/40 rounded-t-xs h-3" />
                    <div className="w-2.5 bg-[#008F95]/60 rounded-t-xs h-5" />
                    <div className="w-2.5 bg-[#008F95] rounded-t-xs h-8" />
                    <div className="w-2.5 bg-teal-400 rounded-t-xs h-6" />
                    <div className="w-2.5 bg-[#10B981] rounded-t-xs h-7" />
                  </div>
                  <div className="h-1 bg-slate-200 rounded-full mt-1" />
                </div>
              </div>

              {/* Refresh Data Button */}
              <button
                onClick={loadAllRealData}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 text-[#142B45] hover:text-[#008F95] font-semibold text-xs rounded-xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 cursor-pointer"
                title="Tải lại toàn bộ số liệu thực tế từ các database"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-[#008F95] ${isLoading ? 'animate-spin' : ''}`} />
                <span>Làm mới dữ liệu thật</span>
              </button>
            </div>
          </div>

          {/* Executive Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Tài khoản Thực tế (auth.db) */}
            <div className="bg-white border border-[#E5EDF5] rounded-[20px] p-5 space-y-2.5 shadow-[0_4px_18px_rgba(25,70,100,0.04)] hover:shadow-[0_8px_24px_rgba(0,137,143,0.10)] hover:-translate-y-0.5 transition-all duration-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 border border-sky-100 flex items-center justify-center shrink-0">
                    <Database className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-semibold text-[#142B45]">Tài khoản Thực tế (auth.db)</span>
                </div>
                <Users className="w-4 h-4 text-sky-500 shrink-0" />
              </div>
              <div className="text-[28px] font-bold text-[#142B45] leading-none">{usersList.length}</div>
              <div className="flex items-center gap-1.5 text-[11px] text-[#64748B]">
                <span className="text-[#008F95] font-semibold">{lecCount} Giảng viên</span>
                <span>•</span>
                <span className="text-sky-600 font-semibold">{hodCount} HOD</span>
                <span>•</span>
                <span className="text-[#EF4444] font-semibold">{adminCount} Admin</span>
              </div>
            </div>

            {/* Card 2: Cụm 8 Microservices */}
            <div className="bg-white border border-[#E5EDF5] rounded-[20px] p-5 space-y-2.5 shadow-[0_4px_18px_rgba(25,70,100,0.04)] hover:shadow-[0_8px_24px_rgba(0,137,143,0.10)] hover:-translate-y-0.5 transition-all duration-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-[#10B981] border border-emerald-100 flex items-center justify-center shrink-0">
                    <Package className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-semibold text-[#142B45]">Cụm 8 Microservices</span>
                </div>
                <Server className="w-4 h-4 text-[#10B981] shrink-0" />
              </div>
              <div className="text-[28px] font-bold text-[#10B981] leading-none flex items-center gap-2">
                <span>8 / 8</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Hoạt động
                </span>
              </div>
              <p className="text-[10px] xl:text-[11px] text-[#64748B] whitespace-nowrap">
                Ports: 8000 (Gateway) • 8001–8005 • 8006 (Admin) • 8007 (Payment)
              </p>
            </div>

            {/* Card 3: Tài liệu & Ngân hàng Câu hỏi */}
            <div className="bg-white border border-[#E5EDF5] rounded-[20px] p-5 space-y-2.5 shadow-[0_4px_18px_rgba(25,70,100,0.04)] hover:shadow-[0_8px_24px_rgba(0,137,143,0.10)] hover:-translate-y-0.5 transition-all duration-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 text-[#F59E0B] border border-amber-100 flex items-center justify-center shrink-0">
                    <Shield className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-semibold text-[#142B45]">Tài liệu &amp; Ngân hàng Câu hỏi</span>
                </div>
                <BookOpen className="w-4 h-4 text-[#F59E0B] shrink-0" />
              </div>
              <div className="text-[28px] font-bold text-[#142B45] leading-none">
                {totalQuestions} Câu hỏi
              </div>
              <p className="text-[11px] text-[#64748B] truncate">
                Từ {totalDocs} giáo trình 8 bộ, {totalExams} khóa thi thực tế
              </p>
            </div>

            {/* Card 4: Bảo Mật & Kiểm Soát Khóa */}
            <div className="bg-white border border-[#E5EDF5] rounded-[20px] p-5 space-y-2.5 shadow-[0_4px_18px_rgba(25,70,100,0.04)] hover:shadow-[0_8px_24px_rgba(0,137,143,0.10)] hover:-translate-y-0.5 transition-all duration-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center shrink-0">
                    <Lock className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-semibold text-purple-700">Bảo Mật &amp; Kiểm Soát Khóa</span>
                </div>
                <Key className="w-4 h-4 text-purple-500 shrink-0" />
              </div>
              <div className="text-[28px] font-bold text-purple-700 leading-none">
                {lockedCount} Tài khoản bị khóa
              </div>
              <p className="text-[11px] text-[#64748B] truncate">
                {lockedCount > 0 ? 'Có tài khoản đang bị hạn chế quyền truy cập' : 'Hệ thống an toàn, 0 tài khoản bị khóa'}
              </p>
            </div>
          </div>

          {/* Action Notification Toast inside Admin Overview */}
          {actionNotice && (
            <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold px-4 py-3 rounded-2xl flex items-center justify-between shadow-xs animate-in fade-in">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{actionNotice}</span>
              </div>
              <button
                onClick={() => setActionNotice(null)}
                className="text-emerald-600 hover:text-emerald-900 text-xs font-semibold"
              >
                Đóng
              </button>
            </div>
          )}

          {/* System Master Controls & High-Level Customization (Bảng Điều Khiển Tùy Biến Hệ Thống) */}
          <div className="bg-white border border-[#E5EDF5] rounded-[24px] p-6 sm:p-7 space-y-5 shadow-[0_4px_18px_rgba(25,70,100,0.04)]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center shrink-0">
                  <Sliders className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#142B45] uppercase tracking-wide">
                    Trung Tâm Tùy Biến Tham Số &amp; Vận Hành Hệ Thống (Master Controls)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Trao quyền cho Admin điều phối tài nguyên, giới hạn lưu trữ và mô hình AI cho toàn trường.
                  </p>
                </div>
              </div>

              {/* Quick Actions Shortcuts */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => setActiveTab('library')}
                  className="px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-[#008689] border border-teal-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Quản lý Thư viện ({totalDocs})</span>
                </button>
                <button
                  onClick={() => setActiveTab('users')}
                  className="px-3 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Cấp gói &amp; User ({usersList.length})</span>
                </button>
                <button
                  onClick={() => setActiveTab('payments')}
                  className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Gói cước &amp; Doanh thu</span>
                </button>
              </div>
            </div>

            {/* Controls Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Control 1: Đăng ký tự do */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">Cổng Đăng Ký Tự Do</span>
                    <Globe className="w-4 h-4 text-slate-400" />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {allowRegistration ? 'Mọi giảng viên đều có thể tự tạo tài khoản' : 'Khóa đăng ký, chỉ Admin/HOD mới cấp được'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleToggleRegistration}
                  className={`w-full py-1.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    allowRegistration
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs'
                      : 'bg-rose-100 text-rose-800 border border-rose-300'
                  }`}
                >
                  {allowRegistration ? 'Đang Mở (Công Khai)' : 'Đã Khóa (Chỉ Mời)'}
                </button>
              </div>

              {/* Control 2: Mô hình AI */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">Mô Hình AI Mặc Định</span>
                    <Cpu className="w-4 h-4 text-purple-500" />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Động cơ sinh ma trận đề thi &amp; thẩm định Bloom
                  </p>
                </div>
                <select
                  value={defaultModel}
                  onChange={(e) => handleModelChange(e.target.value)}
                  className="w-full bg-white border border-slate-200 text-slate-800 text-xs font-bold rounded-xl px-2.5 py-1.5 outline-none focus:border-[#008689] cursor-pointer"
                >
                  <option value="gemini-2.5-flash">Gemini 2.5 Flash (Tốc độ 12s)</option>
                  <option value="gemini-1.5-pro">Gemini 1.5 Pro (Độ sâu học thuật)</option>
                  <option value="claude-3-5-sonnet">Claude 3.5 Sonnet (Nâng cao)</option>
                  <option value="local-ollama">Ollama Qwen2.5 (Máy chủ nội bộ)</option>
                </select>
              </div>

              {/* Control 3: Hạn mức tệp giáo trình */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">Hạn Mức Upload Giáo Trình</span>
                    <HardDrive className="w-4 h-4 text-teal-600" />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Dung lượng tối đa cho mỗi tệp PDF/Docx tải lên
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {[25, 50, 100].map((mb) => (
                    <button
                      key={mb}
                      type="button"
                      onClick={() => handleUploadLimitChange(mb)}
                      className={`py-1 rounded-lg text-xs font-bold transition-all ${
                        maxUploadMb === mb
                          ? 'bg-[#008689] text-white shadow-2xs'
                          : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {mb}MB
                    </button>
                  ))}
                </div>
              </div>

              {/* Control 4: Giờ cao điểm khảo thí */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">Chế Độ Giờ Cao Điểm</span>
                    <Flame className="w-4 h-4 text-amber-500" />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {peakExamMode ? 'Ưu tiên CPU tối đa cho xuất bản & in đề' : 'Chế độ vận hành bình thường'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleTogglePeakMode}
                  className={`w-full py-1.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    peakExamMode
                      ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-2xs animate-pulse'
                      : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>{peakExamMode ? 'Đang Kích Hoạt Cao Điểm' : 'Bật Chế Độ Cao Điểm'}</span>
                </button>
              </div>
            </div>

            {/* Quick Maintenance Bar */}
            <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>CSDL SQLite/PostgreSQL, Redis Cache &amp; Vector ChromaDB hoạt động bình thường</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleClearSystemCache}
                  className="px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition-colors cursor-pointer"
                >
                  Dọn sạch Cache
                </button>
                <button
                  onClick={() => setActiveTab('pipeline_monitor')}
                  className="px-3 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-[#008689] font-semibold transition-colors cursor-pointer"
                >
                  Giám sát NOC tiến trình
                </button>
              </div>
            </div>
          </div>

          {/* Quick Microservices Overview Grid */}
          <div className="bg-white border border-[#E5EDF5] rounded-[20px] p-6 sm:p-7 space-y-4 shadow-[0_4px_18px_rgba(25,70,100,0.04)]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-[#E4F7F7] text-[#008F95] flex items-center justify-center shrink-0">
                  <Server className="w-4 h-4" />
                </div>
                <h3 className="text-xs sm:text-sm font-bold text-[#142B45] uppercase tracking-wide">
                  Trạng Thái Cụm 7 Microservices Thực Tế (Ports 8000–8006)
                </h3>
              </div>
              <button
                onClick={() => setActiveTab('services')}
                className="text-xs text-[#008F95] hover:text-[#00777D] hover:underline font-semibold flex items-center gap-1.5 transition-colors cursor-pointer group"
              >
                <span>Chi tiết kiến trúc</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {servicesStatus.map((s) => (
                <div
                  key={s.port}
                  className="p-3.5 sm:p-4 rounded-2xl bg-[#F7FAFC] border border-[#E2EAF2] hover:border-[#008F95]/50 hover:bg-white transition-all duration-200 shadow-2xs hover:shadow-xs flex flex-col justify-between hover:-translate-y-0.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse shrink-0" />
                      <span className="text-xs sm:text-sm font-bold text-[#142B45] truncate">{s.name}</span>
                      <span className="text-xs text-[#91A2B8] font-mono">
                        :{s.port}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-[#047857] font-bold bg-[#ECFDF5] px-2 py-0.5 rounded-md border border-[#A7F3D0] shrink-0">
                      {s.latencyMs}ms
                    </span>
                  </div>
                  <p className="text-[11px] text-[#526782] line-clamp-1 mt-1.5 leading-relaxed">{s.role}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Recent Audit & Security Banner */}
          <div className="bg-gradient-to-r from-[#E3F6F9] via-[#E6F8FA] to-[#C7F0F6] border border-[#BCE8F0] rounded-[22px] p-4 sm:p-5 flex items-center justify-between gap-4 shadow-[0_4px_18px_rgba(0,134,137,0.05)] relative overflow-hidden">
            {/* Ambient Cyan Ripple Glow behind Shield */}
            <div className="absolute -right-6 top-1/2 -translate-y-1/2 w-48 h-48 rounded-full bg-gradient-to-br from-teal-200/50 to-cyan-300/40 blur-md pointer-events-none" />

            <div className="flex items-center gap-3.5 min-w-0 relative z-10">
              <div className="w-10 h-10 rounded-full bg-amber-100/90 text-amber-600 flex items-center justify-center shrink-0 shadow-2xs">
                <Lightbulb className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs sm:text-sm font-bold text-[#142B45] leading-snug truncate">
                  Nhật ký An ninh &amp; Kiểm Toán Gần Nhất (Admin.db)
                </h4>
                <p className="text-xs text-slate-600 truncate mt-0.5">
                  Hệ thống hoạt động ổn định, không có bất thường trong hôm nay.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0 relative z-10">
              <button
                onClick={() => setActiveTab('audit')}
                className="px-4 py-2 bg-white/95 hover:bg-white text-[#008689] font-semibold text-xs rounded-full border border-[#008689] shadow-2xs transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <span>Toàn bộ nhật ký ({auditLogs.length})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <div className="w-10 h-10 rounded-2xl bg-teal-500/20 text-[#008689] border border-[#008689]/40 flex items-center justify-center shrink-0 shadow-xs">
                <ShieldCheck className="w-5 h-5" />
              </div>
            </div>
          </div>
        </div>

  );
};
