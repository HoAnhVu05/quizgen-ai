import React, { useState } from 'react';
import {
  GraduationCap,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { UserProfile, UserRole } from '../types';
import apiClient from '../services/apiClient';

interface LoginScreenProps {
  onLogin: (user: UserProfile, needsProfileSetup?: boolean) => void;
  onNavigateRegister: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, onNavigateRegister }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({});

  const validate = () => {
    const newErrors: { email?: string; password?: string } = {};
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      newErrors.email = 'Vui lòng nhập địa chỉ email học thuật / công tác.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      newErrors.email = 'Định dạng email không hợp lệ (ví dụ: giangvien@vnu.edu.vn).';
    }

    if (!password) {
      newErrors.password = 'Vui lòng nhập mật khẩu tài khoản.';
    } else if (password.length < 6) {
      newErrors.password = 'Mật khẩu phải có tối thiểu 6 ký tự.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    setErrors({});

    const normalizedEmail = email.trim().toLowerCase();

    try {
      const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

      const formData = new URLSearchParams();
      formData.append('username', normalizedEmail);
      formData.append('password', password);

      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData.toString(),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.access_token) {
          apiClient.setTokens(data.access_token, data.refresh_token || '');
          if (rememberMe) {
            localStorage.setItem('quizgen_token', data.access_token);
            localStorage.setItem('quizgen_auth_token', data.access_token);
          } else {
            sessionStorage.setItem('quizgen_token', data.access_token);
            sessionStorage.setItem('quizgen_auth_token', data.access_token);
          }

          const rawUser = data.user || {};
          const isProfileComplete = Boolean(
            rawUser.profile_completed ||
            (rawUser.full_name && rawUser.full_name.trim() && rawUser.full_name !== 'Chưa cập nhật' && rawUser.university && rawUser.department)
          );

          const authenticatedUser: UserProfile = {
            id: rawUser.id || `usr-${Date.now()}`,
            fullName: rawUser.full_name || '',
            email: rawUser.email || normalizedEmail,
            academicTitle: rawUser.academic_title || 'TS.',
            department: rawUser.department || '',
            faculty: rawUser.department || '',
            university: rawUser.university || '',
            role: (rawUser.role as UserRole) || 'lecturer',
            roleLabel:
              rawUser.role === 'head_of_department'
                ? 'Trưởng bộ môn'
                : rawUser.role === 'admin'
                ? 'Quản trị Khảo thi'
                : 'Giảng viên',
            profileCompleted: isProfileComplete,
          };

          localStorage.setItem('quizgen_user', JSON.stringify(authenticatedUser));
          onLogin(authenticatedUser, !isProfileComplete);
        } else {
          setErrors({ general: 'Không nhận được mã xác thực hợp lệ từ máy chủ.' });
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        const errMsg = errData.detail || 'Email hoặc mật khẩu không chính xác.';
        setErrors({ general: errMsg });
      }
    } catch (err: any) {
      setErrors({
        general: 'Không thể kết nối đến máy chủ xác thực. Vui lòng kiểm tra kết nối mạng và thử lại.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-[#080c16] relative overflow-hidden font-sans">
      {/* Background Ambience */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-blue-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-indigo-600/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="w-full max-w-md bg-[#0f172a]/95 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 shadow-lg shadow-blue-500/25 mb-4">
            <GraduationCap className="w-7 h-7 text-white" />
          </div>
          <div className="flex items-center justify-center gap-2 mb-1">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
              Cổng Khảo thí Trực tuyến
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Đăng Nhập QuizGen AI</h1>
          <p className="text-xs text-slate-400 mt-1.5">
            Hệ thống Sinh đề thi & Ngân hàng câu hỏi ma trận Bloom
          </p>
        </div>

        {/* Global Error Banner */}
        {errors.general && (
          <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3 text-xs text-rose-300 animate-in fade-in">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400 mt-0.5" />
            <span className="leading-relaxed">{errors.general}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Email công tác / học thuật <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setErrors((p) => ({ ...p, email: undefined, general: undefined }));
                }}
                placeholder="giangvien@vnu.edu.vn"
                className={`w-full h-11 pl-10 pr-4 bg-slate-900/90 border rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none transition-colors ${
                  errors.email ? 'border-rose-500/80 focus:border-rose-500' : 'border-slate-700/80 focus:border-blue-500'
                }`}
                autoComplete="email"
                required
              />
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
            {errors.email && <p className="text-xs text-rose-400 mt-1">{errors.email}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Mật khẩu <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrors((p) => ({ ...p, password: undefined, general: undefined }));
                }}
                placeholder="Nhập mật khẩu..."
                className={`w-full h-11 pl-10 pr-10 bg-slate-900/90 border rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none transition-colors ${
                  errors.password ? 'border-rose-500/80 focus:border-rose-500' : 'border-slate-700/80 focus:border-blue-500'
                }`}
                autoComplete="current-password"
                required
              />
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && <p className="text-xs text-rose-400 mt-1">{errors.password}</p>}
          </div>

          {/* Remember me */}
          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
              />
              <span className="text-xs text-slate-400">Ghi nhớ đăng nhập</span>
            </label>
            <span className="text-xs text-slate-500">Bảo mật mã hóa JWT</span>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-11 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 text-white font-semibold text-sm shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:opacity-95 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
          >
            {isLoading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Đang xác thực...
              </>
            ) : (
              <>
                Đăng Nhập
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Switch to Register */}
        <div className="mt-6 pt-5 border-t border-slate-800 text-center">
          <p className="text-xs text-slate-400">
            Chưa có tài khoản trên hệ thống?{' '}
            <button
              type="button"
              onClick={onNavigateRegister}
              className="text-blue-400 hover:text-blue-300 font-semibold underline underline-offset-2 transition-colors ml-1"
            >
              Đăng ký tài khoản mới
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
