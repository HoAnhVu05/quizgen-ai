import React, { useState } from 'react';
import {
  GraduationCap,
  Building2,
  Award,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  User,
  School,
  AlertCircle
} from 'lucide-react';
import { UserProfile, UserRole } from '../types';
import apiClient from '../services/apiClient';

interface ProfileSetupScreenProps {
  currentUser: UserProfile;
  onComplete: (updatedUser: UserProfile) => void;
  onLogout?: () => void;
}

const ACADEMIC_TITLES = ['TS.', 'ThS.', 'PGS. TS.', 'GS. TS.', 'Thầy / Cô'];

const UNIVERSITY_OPTIONS = [
  'Đại học Quốc gia TP.HCM (VNU-HCM)',
  'Trường ĐH Bách Khoa - ĐHQG TP.HCM',
  'Trường ĐH Khoa học Tự nhiên - ĐHQG TP.HCM',
  'Trường ĐH Công nghệ Thông tin (UIT) - ĐHQG TP.HCM',
  'Trường ĐH Kinh tế - Luật (UEL) - ĐHQG TP.HCM',
  'Trường ĐH Quốc tế (IU) - ĐHQG TP.HCM',
  'Trường ĐH KHXH&NV - ĐHQG TP.HCM',
  'Đại học Quốc gia Hà Nội (VNU-HN)',
  'Đại học Bách Khoa Hà Nội (HUST)',
  'Đại học Kinh tế TP.HCM (UEH)',
  'Trường Đại học Sư phạm Kỹ thuật TP.HCM',
  'Cơ sở giáo dục đại học khác...',
];

const FACULTY_OPTIONS = [
  'Khoa Công nghệ Thông tin',
  'Khoa Khoa học & Kỹ thuật Máy tính',
  'Khoa Kinh tế & Quản trị',
  'Khoa Khoa học Tự nhiên',
  'Khoa Luật & Hành chính công',
  'Khoa Sư phạm & Giáo dục học',
  'Khoa Ngoại ngữ & Ngôn ngữ học',
  'Khoa Kỹ thuật Xây dựng & Cơ khí',
  'Phòng Khảo thí & Đảm bảo Chất lượng',
  'Viện Trí tuệ Nhân tạo & Khoa học Dữ liệu',
  'Bộ môn / Khoa chuyên ngành khác...',
];

const ROLES_OPTIONS: Array<{ id: UserRole; title: string; subtitle: string; icon: any }> = [
  { id: 'lecturer', title: 'Giảng viên', subtitle: 'Soạn đề & RAG', icon: GraduationCap },
  { id: 'head_of_department', title: 'Trưởng bộ môn', subtitle: 'Thẩm định đề thi', icon: Award },
  { id: 'admin', title: 'Quản trị Khảo thi', subtitle: 'Quản trị hệ thống', icon: ShieldCheck },
];

export const ProfileSetupScreen: React.FC<ProfileSetupScreenProps> = ({
  currentUser,
  onComplete,
  onLogout,
}) => {
  const [fullName, setFullName] = useState(currentUser.fullName && currentUser.fullName !== 'Chưa cập nhật' ? currentUser.fullName : '');
  const [academicTitle, setAcademicTitle] = useState(currentUser.academicTitle || 'TS.');
  const [university, setUniversity] = useState(currentUser.university || UNIVERSITY_OPTIONS[0]);
  const [department, setDepartment] = useState(currentUser.department || FACULTY_OPTIONS[0]);
  const [role, setRole] = useState<UserRole>(currentUser.role || 'lecturer');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = fullName.trim();
    if (!trimmedName || trimmedName.length < 3) {
      setError('Vui lòng nhập họ và tên đầy đủ (tối thiểu 3 ký tự).');
      return;
    }

    if (!university.trim()) {
      setError('Vui lòng chọn hoặc nhập trường đại học / đơn vị công tác.');
      return;
    }

    if (!department.trim()) {
      setError('Vui lòng chọn hoặc nhập khoa / phòng ban / bộ môn.');
      return;
    }

    setIsLoading(true);

    try {
      const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';
      const token = apiClient.getAccessToken() || localStorage.getItem('quizgen_token') || localStorage.getItem('quizgen_auth_token');

      const bodyData = {
        full_name: trimmedName,
        academic_title: academicTitle,
        university: university.trim(),
        department: department.trim(),
        role: role,
      };

      const res = await fetch(`${API_BASE}/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(bodyData),
      });

      if (res.ok) {
        const data = await res.json();
        const updatedUser: UserProfile = {
          id: data.id || currentUser.id,
          fullName: data.full_name || trimmedName,
          email: data.email || currentUser.email,
          academicTitle: data.academic_title || academicTitle,
          department: data.department || department,
          faculty: data.department || department,
          university: data.university || university,
          role: (data.role as UserRole) || role,
          roleLabel:
            data.role === 'head_of_department'
              ? 'Trưởng bộ môn'
              : data.role === 'admin'
              ? 'Quản trị Khảo thi'
              : 'Giảng viên',
          profileCompleted: true,
        };

        localStorage.setItem('quizgen_user', JSON.stringify(updatedUser));
        onComplete(updatedUser);
      } else {
        // Fallback local update if network glitch
        const updatedUser: UserProfile = {
          ...currentUser,
          fullName: trimmedName,
          academicTitle,
          university,
          department,
          faculty: department,
          role,
          roleLabel:
            role === 'head_of_department'
              ? 'Trưởng bộ môn'
              : role === 'admin'
              ? 'Quản trị Khảo thi'
              : 'Giảng viên',
          profileCompleted: true,
        };
        localStorage.setItem('quizgen_user', JSON.stringify(updatedUser));
        onComplete(updatedUser);
      }
    } catch (err: any) {
      console.warn('[PROFILE] Lỗi cập nhật backend, lưu local:', err);
      const updatedUser: UserProfile = {
        ...currentUser,
        fullName: trimmedName,
        academicTitle,
        university,
        department,
        faculty: department,
        role,
        roleLabel:
          role === 'head_of_department'
            ? 'Trưởng bộ môn'
            : role === 'admin'
            ? 'Quản trị Khảo thi'
            : 'Giảng viên',
        profileCompleted: true,
      };
      localStorage.setItem('quizgen_user', JSON.stringify(updatedUser));
      onComplete(updatedUser);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 py-8 bg-[#080c16] relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-96 h-96 bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-2xl bg-[#0f172a]/90 backdrop-blur-xl border border-slate-800/80 rounded-2xl shadow-2xl p-6 sm:p-8 relative z-10">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-500 shadow-lg shadow-blue-500/25 mb-4">
            <User className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Điền Thông Tin Người Dùng
          </h1>
          <p className="text-sm text-slate-400 mt-2 max-w-md mx-auto">
            Chào mừng bạn đến với QuizGen AI! Vui lòng hoàn tất thông tin học thuật bên dưới để cá nhân hóa đề thi và ngân hàng câu hỏi.
          </p>
          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-xs text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Tài khoản: <span className="font-semibold text-white">{currentUser.email}</span>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-3 text-sm text-rose-300">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Họ và tên & Học hàm/Học vị */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="sm:col-span-1">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Học vị
              </label>
              <select
                value={academicTitle}
                onChange={(e) => setAcademicTitle(e.target.value)}
                className="w-full h-11 px-3 bg-slate-900/90 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
              >
                {ACADEMIC_TITLES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-3">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Họ và Tên Đầy Đủ <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ví dụ: Nguyễn Văn An"
                  className="w-full h-11 pl-10 pr-4 bg-slate-900/90 border border-slate-700 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                  required
                />
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>
          </div>

          {/* Trường Đại học */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Trường Đại học / Cơ sở Đào tạo <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <select
                value={university}
                onChange={(e) => setUniversity(e.target.value)}
                className="w-full h-11 pl-10 pr-4 bg-slate-900/90 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500 transition-colors appearance-none"
              >
                {UNIVERSITY_OPTIONS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
              <School className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Khoa / Phòng ban */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Khoa / Bộ môn / Viện Đào tạo <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full h-11 pl-10 pr-4 bg-slate-900/90 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500 transition-colors appearance-none"
              >
                {FACULTY_OPTIONS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
              <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Vai trò học thuật */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Vai Trò Công Tác
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {ROLES_OPTIONS.map((r) => {
                const Icon = r.icon;
                const isSelected = role === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setRole(r.id)}
                    className={`p-3 rounded-xl border text-left transition-all flex items-start gap-3 ${
                      isSelected
                        ? 'border-blue-500/80 bg-blue-600/15 shadow-[0_0_15px_rgba(59,130,246,0.25)]'
                        : 'border-slate-800 bg-slate-900/60 hover:border-slate-700 text-slate-400'
                    }`}
                  >
                    <div
                      className={`p-2 rounded-lg ${
                        isSelected ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className={`text-sm font-semibold ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                        {r.title}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">{r.subtitle}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Submit Actions */}
          <div className="pt-3 flex flex-col sm:flex-row items-center gap-3">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full sm:flex-1 h-12 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 text-white font-semibold text-sm shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:opacity-95 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Đang lưu hồ sơ...
                </>
              ) : (
                <>
                  Hoàn tất Thông tin & Bắt đầu Sử dụng
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="w-full sm:w-auto h-12 px-5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800/60 text-sm font-medium transition-colors"
              >
                Đăng xuất
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
