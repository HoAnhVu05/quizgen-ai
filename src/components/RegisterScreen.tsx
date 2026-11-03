import React, { useState } from 'react';
import {
  GraduationCap,
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  Building2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

interface RegisterScreenProps {
  onRegister: () => void;
  onNavigateLogin: () => void;
}

interface RegisterForm {
  fullName: string;
  email: string;
  faculty: string;
  password: string;
  confirmPassword: string;
}

interface FormErrors {
  fullName?: string;
  email?: string;
  faculty?: string;
  password?: string;
  confirmPassword?: string;
}

const FACULTY_OPTIONS = [
  'Khoa Kinh tế',
  'Khoa Công nghệ Thông tin',
  'Khoa Khoa học Tự nhiên',
  'Khoa Luật',
  'Khoa Sư phạm',
  'Khoa Y Dược',
  'Khoa Ngoại ngữ',
  'Khoa Kỹ thuật',
];

const PASSWORD_STRENGTH = (pw: string) => {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score;
};

const STRENGTH_LABELS = ['', 'Yếu', 'Trung bình', 'Khá', 'Mạnh'];
const STRENGTH_COLORS = ['', 'bg-rose-500', 'bg-amber-500', 'bg-sky-500', 'bg-emerald-500'];
const STRENGTH_TEXT_COLORS = ['', 'text-rose-400', 'text-amber-400', 'text-sky-400', 'text-emerald-400'];

export const RegisterScreen: React.FC<RegisterScreenProps> = ({ onRegister, onNavigateLogin }) => {
  const [form, setForm] = useState<RegisterForm>({
    fullName: '',
    email: '',
    faculty: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const strength = PASSWORD_STRENGTH(form.password);

  const setField = (field: keyof RegisterForm, value: string) => {
    setForm((p) => ({ ...p, [field]: value }));
    setErrors((p) => ({ ...p, [field]: undefined }));
  };

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    if (!form.fullName.trim()) newErrors.fullName = 'Vui lòng nhập họ tên';
    else if (form.fullName.trim().length < 3) newErrors.fullName = 'Họ tên tối thiểu 3 ký tự';

    if (!form.email) newErrors.email = 'Vui lòng nhập email';
    else if (!/\S+@\S+\.\S+/.test(form.email)) newErrors.email = 'Email không hợp lệ';

    if (!form.faculty) newErrors.faculty = 'Vui lòng chọn khoa / bộ môn';

    if (!form.password) newErrors.password = 'Vui lòng nhập mật khẩu';
    else if (form.password.length < 6) newErrors.password = 'Mật khẩu tối thiểu 6 ký tự';

    if (!form.confirmPassword) newErrors.confirmPassword = 'Vui lòng xác nhận mật khẩu';
    else if (form.password !== form.confirmPassword) newErrors.confirmPassword = 'Mật khẩu xác nhận không khớp';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    if (!agreedToTerms) return;
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      onRegister();
    }, 1400);
  };

  return (
    <div className="min-h-screen w-full bg-[#0b0f19] flex items-center justify-center relative overflow-hidden py-8">
      {/* Ambient background orbs */}
      <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-indigo-700/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-blue-700/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] bg-purple-900/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-md px-4">
        {/* Logo & Brand */}
        <div className="flex flex-col items-center mb-7">
          <div className="relative group cursor-pointer mb-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-400 flex items-center justify-center text-white shadow-2xl shadow-blue-500/30 group-hover:shadow-blue-500/50 transition-all duration-500 group-hover:scale-105">
              <GraduationCap className="w-7 h-7" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-[#0b0f19] rounded-full animate-pulse" />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            QuizGen <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">AI</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">Tạo tài khoản Giảng viên</p>
        </div>

        {/* Register Card */}
        <div
          className="rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl shadow-2xl shadow-black/40 p-8 space-y-5"
          style={{ boxShadow: '0 0 0 1px rgba(255,255,255,0.05), 0 25px 50px rgba(0,0,0,0.5), 0 0 80px rgba(99,102,241,0.08)' }}
        >
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-white">Đăng ký tài khoản</h2>
            <p className="text-xs text-slate-400">Điền đầy đủ thông tin học thuật để khởi tạo tài khoản.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Full Name */}
            <div className="space-y-1.5">
              <label htmlFor="reg-fullname" className="text-xs font-semibold text-slate-300 tracking-wide uppercase">
                Họ và tên
              </label>
              <div className="relative group">
                <div className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors ${errors.fullName ? 'text-rose-400' : 'text-slate-400 group-focus-within:text-blue-400'}`}>
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="reg-fullname"
                  type="text"
                  value={form.fullName}
                  onChange={(e) => setField('fullName', e.target.value)}
                  placeholder="TS. Nguyễn Văn A"
                  className={`w-full bg-white/[0.04] border rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition-all duration-200
                    focus:bg-white/[0.07] focus:shadow-[0_0_0_2px_rgba(59,130,246,0.4)]
                    ${errors.fullName ? 'border-rose-500/60' : 'border-white/[0.08] focus:border-blue-500/50'}`}
                />
              </div>
              {errors.fullName && <p className="text-[11px] text-rose-400">⚠ {errors.fullName}</p>}
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label htmlFor="reg-email" className="text-xs font-semibold text-slate-300 tracking-wide uppercase">
                Email học thuật
              </label>
              <div className="relative group">
                <div className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors ${errors.email ? 'text-rose-400' : 'text-slate-400 group-focus-within:text-blue-400'}`}>
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="reg-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setField('email', e.target.value)}
                  placeholder="gv@dhqg.edu.vn"
                  className={`w-full bg-white/[0.04] border rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition-all duration-200
                    focus:bg-white/[0.07] focus:shadow-[0_0_0_2px_rgba(59,130,246,0.4)]
                    ${errors.email ? 'border-rose-500/60' : 'border-white/[0.08] focus:border-blue-500/50'}`}
                />
              </div>
              {errors.email && <p className="text-[11px] text-rose-400">⚠ {errors.email}</p>}
            </div>

            {/* Faculty */}
            <div className="space-y-1.5">
              <label htmlFor="reg-faculty" className="text-xs font-semibold text-slate-300 tracking-wide uppercase">
                Khoa / Bộ môn
              </label>
              <div className="relative group">
                <div className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors pointer-events-none ${errors.faculty ? 'text-rose-400' : 'text-slate-400 group-focus-within:text-blue-400'}`}>
                  <Building2 className="w-4 h-4" />
                </div>
                <select
                  id="reg-faculty"
                  value={form.faculty}
                  onChange={(e) => setField('faculty', e.target.value)}
                  className={`w-full bg-white/[0.04] border rounded-xl pl-10 pr-4 py-3 text-sm text-white outline-none transition-all duration-200 appearance-none cursor-pointer
                    focus:bg-white/[0.07] focus:shadow-[0_0_0_2px_rgba(59,130,246,0.4)]
                    ${errors.faculty ? 'border-rose-500/60' : 'border-white/[0.08] focus:border-blue-500/50'}
                    ${!form.faculty ? 'text-slate-500' : 'text-white'}`}
                  style={{ backgroundColor: 'rgba(15, 20, 35, 0.8)' }}
                >
                  <option value="" disabled style={{ backgroundColor: '#0f1423' }}>
                    Chọn khoa / bộ môn...
                  </option>
                  {FACULTY_OPTIONS.map((f) => (
                    <option key={f} value={f} style={{ backgroundColor: '#0f1423' }}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>
              {errors.faculty && <p className="text-[11px] text-rose-400">⚠ {errors.faculty}</p>}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label htmlFor="reg-password" className="text-xs font-semibold text-slate-300 tracking-wide uppercase">
                Mật khẩu
              </label>
              <div className="relative group">
                <div className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors ${errors.password ? 'text-rose-400' : 'text-slate-400 group-focus-within:text-blue-400'}`}>
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setField('password', e.target.value)}
                  placeholder="Tối thiểu 6 ký tự"
                  className={`w-full bg-white/[0.04] border rounded-xl pl-10 pr-11 py-3 text-sm text-white placeholder-slate-500 outline-none transition-all duration-200
                    focus:bg-white/[0.07] focus:shadow-[0_0_0_2px_rgba(59,130,246,0.4)]
                    ${errors.password ? 'border-rose-500/60' : 'border-white/[0.08] focus:border-blue-500/50'}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {/* Password Strength Indicator */}
              {form.password && (
                <div className="space-y-1">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= strength ? STRENGTH_COLORS[strength] : 'bg-white/[0.08]'}`}
                      />
                    ))}
                  </div>
                  <p className={`text-[10px] font-medium ${STRENGTH_TEXT_COLORS[strength]}`}>
                    Độ mạnh: {STRENGTH_LABELS[strength]}
                  </p>
                </div>
              )}
              {errors.password && <p className="text-[11px] text-rose-400">⚠ {errors.password}</p>}
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <label htmlFor="reg-confirm-password" className="text-xs font-semibold text-slate-300 tracking-wide uppercase">
                Xác nhận mật khẩu
              </label>
              <div className="relative group">
                <div className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors ${errors.confirmPassword ? 'text-rose-400' : 'text-slate-400 group-focus-within:text-blue-400'}`}>
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="reg-confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={form.confirmPassword}
                  onChange={(e) => setField('confirmPassword', e.target.value)}
                  placeholder="Nhập lại mật khẩu"
                  className={`w-full bg-white/[0.04] border rounded-xl pl-10 pr-11 py-3 text-sm text-white placeholder-slate-500 outline-none transition-all duration-200
                    focus:bg-white/[0.07] focus:shadow-[0_0_0_2px_rgba(59,130,246,0.4)]
                    ${errors.confirmPassword ? 'border-rose-500/60' : form.confirmPassword && form.password === form.confirmPassword ? 'border-emerald-500/50' : 'border-white/[0.08] focus:border-blue-500/50'}`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                {form.confirmPassword && form.password === form.confirmPassword && !errors.confirmPassword && (
                  <div className="absolute right-9 top-1/2 -translate-y-1/2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  </div>
                )}
              </div>
              {errors.confirmPassword && <p className="text-[11px] text-rose-400">⚠ {errors.confirmPassword}</p>}
            </div>

            {/* Terms Checkbox */}
            <label className="flex items-start gap-3 cursor-pointer group">
              <div className="relative mt-0.5">
                <input
                  id="reg-terms-checkbox"
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="sr-only"
                />
                <div
                  className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all duration-200 ${
                    agreedToTerms
                      ? 'bg-blue-600 border-blue-600'
                      : 'border-white/20 group-hover:border-blue-500/50'
                  }`}
                >
                  {agreedToTerms && <CheckCircle2 className="w-3 h-3 text-white" />}
                </div>
              </div>
              <span className="text-[11px] text-slate-400 leading-relaxed">
                Tôi đồng ý với{' '}
                <span className="text-blue-400 hover:text-blue-300 underline cursor-pointer">Điều khoản Dịch vụ</span>
                {' '}và{' '}
                <span className="text-blue-400 hover:text-blue-300 underline cursor-pointer">Chính sách Bảo mật</span>
                {' '}của ĐHQG
              </span>
            </label>

            {/* Submit Button */}
            <button
              id="register-submit-btn"
              type="submit"
              disabled={isLoading || !agreedToTerms}
              className="relative w-full group flex items-center justify-center gap-2.5 py-3.5 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 transition-all duration-300 shadow-lg shadow-indigo-600/30 hover:shadow-indigo-600/50 hover:scale-[1.015] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Đang tạo tài khoản...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Tạo tài khoản Giảng viên</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </button>
          </form>

          {/* Login Link */}
          <p className="text-center text-xs text-slate-400">
            Đã có tài khoản?{' '}
            <button
              id="go-to-login-btn"
              onClick={onNavigateLogin}
              className="text-blue-400 hover:text-blue-300 font-semibold transition-colors hover:underline"
            >
              Đăng nhập ngay
            </button>
          </p>
        </div>

        {/* Security badge */}
        <div className="flex items-center justify-center gap-2 mt-6 text-[11px] text-slate-500">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Dữ liệu mã hóa TLS 1.3 · Tuân thủ NDPC Việt Nam 2023</span>
        </div>
      </div>
    </div>
  );
};
