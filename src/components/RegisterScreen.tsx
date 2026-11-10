import React, { useState } from 'react';
import {
  GraduationCap,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';
import { UserProfile, UserRole } from '../types';
import apiClient from '../services/apiClient';

interface RegisterScreenProps {
  onRegister: (user: UserProfile, needsProfileSetup?: boolean) => void;
  onNavigateLogin: () => void;
}

export const RegisterScreen: React.FC<RegisterScreenProps> = ({
  onRegister,
  onNavigateLogin,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    confirmPassword?: string;
    general?: string;
  }>({});

  const validate = () => {
    const newErrors: {
      email?: string;
      password?: string;
      confirmPassword?: string;
    } = {};

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      newErrors.email = 'Vui lòng nhập địa chỉ email.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      newErrors.email = 'Định dạng email không hợp lệ (ví dụ: giangvien@vnu.edu.vn).';
    }

    if (!password) {
      newErrors.password = 'Vui lòng nhập mật khẩu tài khoản.';
    } else if (password.length < 6) {
      newErrors.password = 'Mật khẩu phải có tối thiểu 6 ký tự.';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Vui lòng xác nhận lại mật khẩu.';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Mật khẩu xác nhận không khớp.';
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

      // 1. Gửi yêu cầu đăng ký tài khoản tới Backend Auth Service
      const regRes = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: normalizedEmail,
          password: password,
          role: 'lecturer',
        }),
      });

      if (!regRes.ok) {
        const errData = await regRes.json().catch(() => ({}));
        const errMsg = errData.detail || 'Không thể tạo tài khoản. Vui lòng thử lại.';
        setErrors({ general: errMsg });
        setIsLoading(false);
        return;
      }

      // 2. Tự động đăng nhập để lấy JWT Token
      const loginFormData = new URLSearchParams();
      loginFormData.append('username', normalizedEmail);
      loginFormData.append('password', password);

      const loginRes = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: loginFormData.toString(),
      });

      if (loginRes.ok) {
        const loginData = await loginRes.json();
        if (loginData.access_token) {
          apiClient.setTokens(loginData.access_token, loginData.refresh_token || '');
          localStorage.setItem('quizgen_token', loginData.access_token);
          localStorage.setItem('quizgen_auth_token', loginData.access_token);

          const rawUser = loginData.user || {};
          const newUser: UserProfile = {
            id: rawUser.id || `usr-${Date.now()}`,
            fullName: rawUser.full_name || '',
            email: rawUser.email || normalizedEmail,
            academicTitle: rawUser.academic_title || 'TS.',
            department: rawUser.department || '',
            faculty: rawUser.department || '',
            university: rawUser.university || '',
            role: (rawUser.role as UserRole) || 'lecturer',
            roleLabel: 'Giảng viên',
            profileCompleted: false, // Luôn yêu cầu điền thông tin cho tài khoản mới
          };

          localStorage.setItem('quizgen_user', JSON.stringify(newUser));
          // Chuyển tới màn hình điền thông tin người dùng
          onRegister(newUser, true);
        }
      } else {
        // Fallback: chuyển sang trang đăng nhập nếu auto-login không thành công
        onNavigateLogin();
      }
    } catch (err: any) {
      setErrors({
        general: 'Không thể kết nối đến máy chủ xác thực. Vui lòng kiểm tra mạng và thử lại.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-[#080c16] relative overflow-hidden font-sans">
      {/* Background Glows */}
      <div className="absolute top-1/4 -right-20 w-96 h-96 bg-indigo-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/4 -left-20 w-96 h-96 bg-blue-600/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="w-full max-w-md bg-[#0f172a]/95 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-cyan-500 shadow-lg shadow-indigo-500/25 mb-4">
            <GraduationCap className="w-7 h-7 text-white" />
          </div>
          <div className="flex items-center justify-center gap-2 mb-1">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              Đăng Ký Tài Khoản Mới
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Tạo Tài Khoản QuizGen AI</h1>
          <p className="text-xs text-slate-400 mt-1.5">
            Bước 1: Khởi tạo tài khoản xác thực bằng Email
          </p>
        </div>

        {/* Global Error Banner */}
        {errors.general && (
          <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3 text-xs text-rose-300 animate-in fade-in">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400 mt-0.5" />
            <span className="leading-relaxed">{errors.general}</span>
          </div>
        )}

        {/* Register Form */}
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
                  errors.email ? 'border-rose-500/80 focus:border-rose-500' : 'border-slate-700/80 focus:border-indigo-500'
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
                placeholder="Tối thiểu 6 ký tự..."
                className={`w-full h-11 pl-10 pr-10 bg-slate-900/90 border rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none transition-colors ${
                  errors.password ? 'border-rose-500/80 focus:border-rose-500' : 'border-slate-700/80 focus:border-indigo-500'
                }`}
                autoComplete="new-password"
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

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Xác nhận mật khẩu <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setErrors((p) => ({ ...p, confirmPassword: undefined, general: undefined }));
                }}
                placeholder="Nhập lại mật khẩu..."
                className={`w-full h-11 pl-10 pr-10 bg-slate-900/90 border rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none transition-colors ${
                  errors.confirmPassword ? 'border-rose-500/80 focus:border-rose-500' : 'border-slate-700/80 focus:border-indigo-500'
                }`}
                autoComplete="new-password"
                required
              />
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                tabIndex={-1}
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-xs text-rose-400 mt-1">{errors.confirmPassword}</p>
            )}
          </div>

          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400">
            <span className="font-medium text-slate-300">Lưu ý:</span> Sau khi tạo tài khoản, hệ thống sẽ chuyển bạn đến màn hình điền thông tin cá nhân và đơn vị công tác để hoàn tất.
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-11 rounded-xl bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-600 text-white font-semibold text-sm shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:opacity-95 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
          >
            {isLoading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Đang tạo tài khoản...
              </>
            ) : (
              <>
                Tiếp Tục Điền Thông Tin
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Switch to Login */}
        <div className="mt-6 pt-5 border-t border-slate-800 text-center">
          <p className="text-xs text-slate-400">
            Đã có tài khoản trên QuizGen AI?{' '}
            <button
              type="button"
              onClick={onNavigateLogin}
              className="text-indigo-400 hover:text-indigo-300 font-semibold underline underline-offset-2 transition-colors ml-1"
            >
              Đăng nhập ngay
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
