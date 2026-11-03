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
  Award,
  UserCheck,
} from 'lucide-react';
import { UserProfile, UserRole } from '../types';

interface RegisterScreenProps {
  onRegister: (user: UserProfile) => void;
  onNavigateLogin: () => void;
}

interface RegisterForm {
  fullName: string;
  academicTitle: string;
  email: string;
  role: UserRole;
  faculty: string;
  university: string;
  password: string;
  confirmPassword: string;
}

interface FormErrors {
  fullName?: string;
  academicTitle?: string;
  email?: string;
  faculty?: string;
  password?: string;
  confirmPassword?: string;
  general?: string;
}

const ACADEMIC_TITLES = ['TS.', 'ThS.', 'PGS. TS.', 'GS. TS.', 'Giảng viên', 'Chuyên viên Khảo thi'];

const FACULTY_OPTIONS = [
  'Khoa Kinh tế & Quản trị',
  'Khoa Công nghệ Thông tin',
  'Khoa Khoa học Tự nhiên',
  'Khoa Luật',
  'Khoa Sư phạm',
  'Khoa Y Dược',
  'Khoa Ngoại ngữ',
  'Khoa Kỹ thuật Xây dựng',
  'Phòng Khảo thi & Đảm bảo Chất lượng',
  'Viện Trí tuệ Nhân tạo & Dữ liệu',
];

const ROLES_OPTIONS: Array<{ id: UserRole; title: string; subtitle: string; icon: any }> = [
  { id: 'lecturer', title: 'Giảng viên', subtitle: 'Soạn đề & RAG', icon: GraduationCap },
  { id: 'head_of_department', title: 'Trưởng bộ môn', subtitle: 'Thẩm định đề thi', icon: Award },
  { id: 'admin', title: 'Quản trị Khảo thi', subtitle: 'Quản trị hệ thống', icon: ShieldCheck },
];

const getPasswordStrength = (pw: string) => {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score;
};

const STRENGTH_LABELS = ['', 'Yếu (ngắn)', 'Trung bình', 'Khá an toàn', 'Rất mạnh (chuẩn bảo mật)'];
const STRENGTH_COLORS = ['', 'bg-rose-500', 'bg-amber-500', 'bg-sky-500', 'bg-emerald-500'];
const STRENGTH_TEXT_COLORS = ['', 'text-rose-400', 'text-amber-400', 'text-sky-400', 'text-emerald-400'];

export const RegisterScreen: React.FC<RegisterScreenProps> = ({ onRegister, onNavigateLogin }) => {
  const [form, setForm] = useState<RegisterForm>({
    fullName: '',
    academicTitle: 'TS.',
    email: '',
    role: 'lecturer',
    faculty: 'Khoa Công nghệ Thông tin',
    university: 'Đại học Quốc gia',
    password: '',
    confirmPassword: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const strength = getPasswordStrength(form.password);

  const setField = (field: keyof RegisterForm, value: any) => {
    setForm((p) => ({ ...p, [field]: value }));
    setErrors((p) => ({ ...p, [field]: undefined, general: undefined }));
  };

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    if (!form.fullName.trim()) {
      newErrors.fullName = 'Vui lòng nhập họ và tên';
    } else if (form.fullName.trim().length < 3) {
      newErrors.fullName = 'Họ tên tối thiểu 3 ký tự';
    }

    if (!form.email.trim()) {
      newErrors.email = 'Vui lòng nhập email học thuật';
    } else if (!/\S+@\S+\.\S+/.test(form.email)) {
      newErrors.email = 'Email không đúng định dạng';
    }

    if (!form.faculty) {
      newErrors.faculty = 'Vui lòng chọn khoa hoặc bộ môn';
    }

    if (!form.password) {
      newErrors.password = 'Vui lòng nhập mật khẩu';
    } else if (form.password.length < 6) {
      newErrors.password = 'Mật khẩu tối thiểu 6 ký tự';
    }

    if (!form.confirmPassword) {
      newErrors.confirmPassword = 'Vui lòng xác nhận mật khẩu';
    } else if (form.password !== form.confirmPassword) {
      newErrors.confirmPassword = 'Mật khẩu xác nhận không khớp';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case 'head_of_department':
        return 'Trưởng bộ môn';
      case 'admin':
        return 'Quản trị Khảo thi';
      default:
        return 'Giảng viên';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    if (!agreedToTerms) {
      setErrors((p) => ({ ...p, general: 'Vui lòng đồng ý với Điều khoản dịch vụ và Chính sách bảo mật.' }));
      return;
    }

    setIsLoading(true);
    setErrors({});

    const newUser: UserProfile = {
      id: `usr-${form.role}-${Date.now().toString().slice(-4)}`,
      fullName: form.fullName.trim(),
      email: form.email.trim(),
      academicTitle: form.academicTitle,
      department: form.faculty,
      faculty: form.faculty,
      university: form.university,
      role: form.role,
      roleLabel: getRoleLabel(form.role),
    };

    try {
      // 1. Thử gửi đăng ký tới backend auth-service nếu có
      const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';
      try {
        const res = await fetch(`${API_BASE}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: form.email,
            password: form.password,
            full_name: form.fullName,
            academic_title: form.academicTitle,
            university: form.university,
            department: form.faculty,
            role: form.role,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.id) newUser.id = data.id;
        }
      } catch (err) {
        // Backend offline, fallback lưu local
      }

      // 2. Lưu vào danh sách tài khoản đã đăng ký trong LocalStorage
      const registeredUsers = JSON.parse(localStorage.getItem('quizgen_registered_users') || '[]');
      registeredUsers.push({ ...newUser, password: form.password });
      localStorage.setItem('quizgen_registered_users', JSON.stringify(registeredUsers));

      // Tự động lưu phiên đăng nhập
      localStorage.setItem('quizgen_user', JSON.stringify(newUser));

      setTimeout(() => {
        setIsLoading(false);
        onRegister(newUser);
      }, 700);
    } catch (err: any) {
      setIsLoading(false);
      setErrors({ general: err.message || 'Lỗi khi tạo tài khoản.' });
    }
  };

  return (
    <div className="w-full min-h-full flex flex-col items-center justify-start sm:justify-center py-10 px-4 selection:bg-blue-500/30">
      {/* Background Orbs */}
      <div className="fixed top-[-10%] right-[-5%] w-[500px] h-[500px] bg-indigo-700/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-blue-700/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed top-1/3 right-1/4 w-[400px] h-[400px] bg-purple-900/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-xl mx-auto my-auto">
        {/* Header */}
        <div className="flex flex-col items-center mb-6">
          <div className="relative group cursor-pointer mb-3">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-400 flex items-center justify-center text-white shadow-2xl shadow-blue-500/30 group-hover:scale-105 transition-all">
              <GraduationCap className="w-7 h-7" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-[#080c16] rounded-full animate-pulse" />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            QuizGen <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">AI</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">Đăng ký tài khoản hệ thống Khảo thi ĐHQG</p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl shadow-2xl shadow-black/40 p-6 sm:p-8 space-y-5"
          style={{ boxShadow: '0 0 0 1px rgba(255,255,255,0.05), 0 25px 50px rgba(0,0,0,0.5)' }}
        >
          <div>
            <h2 className="text-lg font-bold text-white">Đăng ký tài khoản</h2>
            <p className="text-xs text-slate-400">Tham gia hệ thống khởi tạo ngân hàng câu hỏi khảo thi thông minh.</p>
          </div>

          {errors.general && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <span>⚠</span>
              <span>{errors.general}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* ─── CHỌN VAI TRÒ ĐĂNG KÝ ────────────────────────────── */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 uppercase flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-blue-400" />
                <span>Bạn đăng ký với tư cách là ai?</span>
              </label>

              <div className="grid grid-cols-3 gap-2">
                {ROLES_OPTIONS.map((r) => {
                  const Icon = r.icon;
                  const isSelected = form.role === r.id;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setField('role', r.id)}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'border-blue-500 bg-blue-500/15 shadow-sm'
                          : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.05]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <Icon className={`w-4 h-4 ${isSelected ? 'text-blue-400' : 'text-slate-400'}`} />
                        {isSelected && <span className="text-[10px] text-blue-400">✓</span>}
                      </div>
                      <div className={`text-xs font-bold leading-tight ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                        {r.title}
                      </div>
                      <div className="text-[9px] text-slate-400 truncate mt-0.5">{r.subtitle}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Họ tên & Học hàm/học vị */}
            <div className="grid grid-cols-3 gap-2.5">
              <div className="col-span-1 space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 uppercase">Học vị</label>
                <div className="relative">
                  <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <Award className="w-4 h-4" />
                  </div>
                  <select
                    value={form.academicTitle}
                    onChange={(e) => setField('academicTitle', e.target.value)}
                    className="w-full bg-[#131b2e] border border-white/10 rounded-xl pl-8 pr-2 py-2.5 text-xs text-white outline-none focus:border-blue-500/50 cursor-pointer"
                  >
                    {ACADEMIC_TITLES.map((t) => (
                      <option key={t} value={t} className="bg-[#131b2e] text-white">
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="col-span-2 space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 uppercase">Họ và tên</label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={form.fullName}
                    onChange={(e) => setField('fullName', e.target.value)}
                    placeholder="Nguyễn Văn An"
                    className={`w-full bg-white/[0.04] border rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition-all
                      ${errors.fullName ? 'border-rose-500/60' : 'border-white/10 focus:border-blue-500/50'}`}
                  />
                </div>
                {errors.fullName && <p className="text-[11px] text-rose-400">⚠ {errors.fullName}</p>}
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 uppercase">Email công tác</label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setField('email', e.target.value)}
                  placeholder="canbo@vnu.edu.vn"
                  className={`w-full bg-white/[0.04] border rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition-all
                    ${errors.email ? 'border-rose-500/60' : 'border-white/10 focus:border-blue-500/50'}`}
                />
              </div>
              {errors.email && <p className="text-[11px] text-rose-400">⚠ {errors.email}</p>}
            </div>

            {/* Khoa / Bộ môn */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 uppercase">Khoa / Đơn vị công tác</label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <Building2 className="w-4 h-4" />
                </div>
                <select
                  value={form.faculty}
                  onChange={(e) => setField('faculty', e.target.value)}
                  className="w-full bg-[#131b2e] border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white outline-none focus:border-blue-500/50 cursor-pointer"
                >
                  {FACULTY_OPTIONS.map((f) => (
                    <option key={f} value={f} className="bg-[#131b2e] text-white">
                      {f}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 uppercase">Mật khẩu</label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setField('password', e.target.value)}
                  placeholder="Ít nhất 6 ký tự, có số & chữ hoa"
                  className={`w-full bg-white/[0.04] border rounded-xl pl-9 pr-10 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition-all
                    ${errors.password ? 'border-rose-500/60' : 'border-white/10 focus:border-blue-500/50'}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password strength meter */}
              {form.password && (
                <div className="space-y-1 pt-1">
                  <div className="flex gap-1 h-1">
                    {[1, 2, 3, 4].map((step) => (
                      <div
                        key={step}
                        className={`flex-1 rounded-full transition-all duration-300 ${
                          step <= strength ? STRENGTH_COLORS[strength] : 'bg-white/10'
                        }`}
                      />
                    ))}
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-slate-400">Độ mạnh mật khẩu:</span>
                    <span className={`font-semibold ${STRENGTH_TEXT_COLORS[strength]}`}>
                      {STRENGTH_LABELS[strength]}
                    </span>
                  </div>
                </div>
              )}
              {errors.password && <p className="text-[11px] text-rose-400">⚠ {errors.password}</p>}
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 uppercase">Xác nhận mật khẩu</label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={form.confirmPassword}
                  onChange={(e) => setField('confirmPassword', e.target.value)}
                  placeholder="Nhập lại mật khẩu"
                  className={`w-full bg-white/[0.04] border rounded-xl pl-9 pr-10 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition-all
                    ${
                      errors.confirmPassword
                        ? 'border-rose-500/60'
                        : form.confirmPassword && form.password === form.confirmPassword
                        ? 'border-emerald-500/50'
                        : 'border-white/10 focus:border-blue-500/50'
                    }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {form.confirmPassword && form.password === form.confirmPassword && (
                <div className="flex items-center gap-1 text-[11px] text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Mật khẩu trùng khớp</span>
                </div>
              )}
              {errors.confirmPassword && <p className="text-[11px] text-rose-400">⚠ {errors.confirmPassword}</p>}
            </div>

            {/* Terms Checkbox */}
            <label className="flex items-start gap-2.5 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-white/20 bg-white/5 text-blue-600 focus:ring-0 cursor-pointer"
              />
              <span className="text-[11px] text-slate-400 leading-tight">
                Tôi cam kết thông tin đăng ký chính xác và đồng ý với{' '}
                <span className="text-blue-400 hover:underline">Quy chế Khảo thi & Bảo mật dữ liệu</span>
                {' '}của ĐHQG.
              </span>
            </label>

            {/* Submit */}
            <button
              id="register-submit-btn"
              type="submit"
              disabled={isLoading || !agreedToTerms}
              className="relative w-full group flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 transition-all duration-300 shadow-lg shadow-indigo-600/30 hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Đang khởi tạo tài khoản...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Hoàn tất đăng ký</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Link sang Đăng nhập */}
          <div className="text-center text-xs text-slate-400 pt-2 border-t border-white/[0.06]">
            Đã có tài khoản?{' '}
            <button
              id="go-to-login-btn"
              onClick={onNavigateLogin}
              className="text-blue-400 hover:text-blue-300 font-semibold transition-colors hover:underline"
            >
              Đăng nhập ngay
            </button>
          </div>
        </div>

        {/* Security badge */}
        <div className="flex items-center justify-center gap-2 mt-5 text-[11px] text-slate-500">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Dữ liệu mã hóa TLS 1.3 · Tuân thủ NDPC Việt Nam 2023</span>
        </div>
      </div>
    </div>
  );
};
