import React, { useState } from 'react';
import {
  GraduationCap,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

interface LoginScreenProps {
  onLogin: () => void;
  onNavigateRegister: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, onNavigateRegister }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const validate = () => {
    const newErrors: { email?: string; password?: string } = {};
    if (!email) newErrors.email = 'Vui lòng nhập email';
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = 'Email không hợp lệ';
    if (!password) newErrors.password = 'Vui lòng nhập mật khẩu';
    else if (password.length < 6) newErrors.password = 'Mật khẩu tối thiểu 6 ký tự';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      onLogin();
    }, 1200);
  };

  return (
    <div className="min-h-screen w-full bg-[#0b0f19] flex items-center justify-center relative overflow-hidden">
      {/* Ambient background orbs */}
      <div className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] bg-blue-700/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] bg-indigo-700/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-blue-900/10 rounded-full blur-[160px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-md px-4">
        {/* Logo & Brand */}
        <div className="flex flex-col items-center mb-8 animate-fade-in-up">
          <div className="relative group cursor-pointer mb-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-400 flex items-center justify-center text-white shadow-2xl shadow-blue-500/30 group-hover:shadow-blue-500/50 transition-all duration-500 group-hover:scale-105">
              <GraduationCap className="w-8 h-8" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-[#0b0f19] rounded-full animate-pulse" />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            QuizGen <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">AI</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1 font-medium">Nền tảng Khảo thí Đại học Quốc gia</p>
          <span className="mt-2 px-3 py-0.5 text-[10px] font-mono font-bold uppercase rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 tracking-wider">
            PRO AI · v2.4
          </span>
        </div>

        {/* Login Card */}
        <div
          className="rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl shadow-2xl shadow-black/40 p-8 space-y-6"
          style={{ boxShadow: '0 0 0 1px rgba(255,255,255,0.05), 0 25px 50px rgba(0,0,0,0.5), 0 0 80px rgba(59,130,246,0.08)' }}
        >
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-white">Đăng nhập</h2>
            <p className="text-xs text-slate-400">Chào mừng trở lại! Vui lòng nhập thông tin tài khoản.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Email */}
            <div className="space-y-1.5">
              <label htmlFor="login-email" className="text-xs font-semibold text-slate-300 tracking-wide uppercase">
                Email học thuật
              </label>
              <div className="relative group">
                <div className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors ${errors.email ? 'text-rose-400' : 'text-slate-400 group-focus-within:text-blue-400'}`}>
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setErrors((p) => ({ ...p, email: undefined })); }}
                  placeholder="gv@dhqg.edu.vn"
                  className={`w-full bg-white/[0.04] border rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition-all duration-200
                    focus:bg-white/[0.07] focus:shadow-[0_0_0_2px_rgba(59,130,246,0.4)]
                    ${errors.email
                      ? 'border-rose-500/60 shadow-[0_0_0_1px_rgba(244,63,94,0.3)]'
                      : 'border-white/[0.08] focus:border-blue-500/50'
                    }`}
                />
              </div>
              {errors.email && (
                <p className="text-[11px] text-rose-400 flex items-center gap-1">
                  <span>⚠</span> {errors.email}
                </p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="login-password" className="text-xs font-semibold text-slate-300 tracking-wide uppercase">
                  Mật khẩu
                </label>
                <button type="button" className="text-[11px] text-blue-400 hover:text-blue-300 transition-colors font-medium">
                  Quên mật khẩu?
                </button>
              </div>
              <div className="relative group">
                <div className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors ${errors.password ? 'text-rose-400' : 'text-slate-400 group-focus-within:text-blue-400'}`}>
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setErrors((p) => ({ ...p, password: undefined })); }}
                  placeholder="••••••••"
                  className={`w-full bg-white/[0.04] border rounded-xl pl-10 pr-11 py-3 text-sm text-white placeholder-slate-500 outline-none transition-all duration-200
                    focus:bg-white/[0.07] focus:shadow-[0_0_0_2px_rgba(59,130,246,0.4)]
                    ${errors.password
                      ? 'border-rose-500/60 shadow-[0_0_0_1px_rgba(244,63,94,0.3)]'
                      : 'border-white/[0.08] focus:border-blue-500/50'
                    }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-[11px] text-rose-400 flex items-center gap-1">
                  <span>⚠</span> {errors.password}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button
              id="login-submit-btn"
              type="submit"
              disabled={isLoading}
              className="relative w-full group flex items-center justify-center gap-2.5 py-3.5 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 transition-all duration-300 shadow-lg shadow-blue-600/30 hover:shadow-blue-600/50 hover:scale-[1.015] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Đang xác thực...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Đăng nhập vào hệ thống</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-white/[0.06]" />
            <span className="text-[11px] text-slate-500 font-medium">hoặc</span>
            <div className="flex-1 h-px bg-white/[0.06]" />
          </div>

          {/* Register Link */}
          <p className="text-center text-xs text-slate-400">
            Chưa có tài khoản?{' '}
            <button
              id="go-to-register-btn"
              onClick={onNavigateRegister}
              className="text-blue-400 hover:text-blue-300 font-semibold transition-colors hover:underline"
            >
              Đăng ký ngay
            </button>
          </p>
        </div>

        {/* Security badge */}
        <div className="flex items-center justify-center gap-2 mt-6 text-[11px] text-slate-500">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Kết nối mã hóa SSL · Bảo mật ĐHQG chuẩn ISO 27001</span>
        </div>
      </div>
    </div>
  );
};
