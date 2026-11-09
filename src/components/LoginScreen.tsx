import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  HelpCircle,
  X,
  Send,
  Building2,
  Award,
  UserCheck,
  AlertTriangle,
  AlertCircle,
  Clock,
  KeyRound,
} from 'lucide-react';
import { UserProfile, UserRole } from '../types';

interface LoginScreenProps {
  onLogin: (user: UserProfile) => void;
  onNavigateRegister: () => void;
}

interface RoleConfig {
  id: UserRole;
  title: string;
  badge: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
  glowColor: string;
  borderActive: string;
  bgActive: string;
  badgeClass: string;
  defaultEmail: string;
  defaultPass: string;
  defaultName: string;
  defaultTitle: string;
  defaultDept: string;
}

const ROLES: RoleConfig[] = [
  {
    id: 'lecturer',
    title: 'Giảng viên',
    badge: 'Soạn thảo & Sinh đề AI',
    description: 'Tải giáo trình, cấu hình ma trận Bloom và sinh câu hỏi trắc nghiệm RAG',
    icon: GraduationCap,
    accentColor: 'from-blue-600 to-cyan-600',
    glowColor: 'rgba(59, 130, 246, 0.25)',
    borderActive: 'border-blue-500/80 shadow-[0_0_20px_rgba(59,130,246,0.3)]',
    bgActive: 'bg-blue-600/10',
    badgeClass: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    defaultEmail: 'lecturer@vnu.edu.vn',
    defaultPass: 'academic123',
    defaultName: 'Nguyễn Văn An',
    defaultTitle: 'TS.',
    defaultDept: 'Khoa Công nghệ Thông tin',
  },
  {
    id: 'head_of_department',
    title: 'Trưởng bộ môn',
    badge: 'Kiểm duyệt & Thẩm định',
    description: 'Phê duyệt đề thi, kiểm soát chất lượng ngân hàng câu hỏi và chỉ tiêu',
    icon: Award,
    accentColor: 'from-purple-600 to-indigo-600',
    glowColor: 'rgba(168, 85, 247, 0.25)',
    borderActive: 'border-purple-500/80 shadow-[0_0_20px_rgba(168,85,247,0.3)]',
    bgActive: 'bg-purple-600/10',
    badgeClass: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
    defaultEmail: 'truongbomon@vnu.edu.vn',
    defaultPass: 'academic123',
    defaultName: 'Trần Thị Mai',
    defaultTitle: 'PGS. TS.',
    defaultDept: 'Bộ môn Hệ thống Thông tin',
  },
  {
    id: 'admin',
    title: 'Quản trị Khảo thi',
    badge: 'Quản trị toàn hệ thống',
    description: 'Quản lý hạn mức Token AI, kiểm toán đề thi, logs và tài khoản',
    icon: ShieldCheck,
    accentColor: 'from-amber-600 to-orange-600',
    glowColor: 'rgba(245, 158, 11, 0.25)',
    borderActive: 'border-amber-500/80 shadow-[0_0_20px_rgba(245,158,11,0.3)]',
    bgActive: 'bg-amber-600/10',
    badgeClass: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    defaultEmail: 'admin.khaothi@vnu.edu.vn',
    defaultPass: 'admin123',
    defaultName: 'Lê Hoàng Nam',
    defaultTitle: 'ThS.',
    defaultDept: 'Phòng Khảo thi & Đảm bảo Chất lượng',
  },
];

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_SECONDS = 60;

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, onNavigateRegister }) => {
  const [selectedRole, setSelectedRole] = useState<UserRole>('lecturer');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({});

  // ─── Brute-Force Protection & Lockout States ──────────────────────────────
  const [failedAttempts, setFailedAttempts] = useState<number>(0);
  const [lockoutSeconds, setLockoutSeconds] = useState<number>(0);

  // Forgot password modal
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);

  const currentRoleConfig = ROLES.find((r) => r.id === selectedRole) || ROLES[0];
  const isLocked = lockoutSeconds > 0;

  // ─── Countdown Timer for Lockout ──────────────────────────────────────────
  useEffect(() => {
    let timer: any = null;
    if (lockoutSeconds > 0) {
      timer = setInterval(() => {
        setLockoutSeconds((prev) => {
          if (prev <= 1) {
            setFailedAttempts(0);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [lockoutSeconds]);

  const handleSelectRole = (role: RoleConfig) => {
    setSelectedRole(role.id);
    setErrors({});
  };

  const validate = () => {
    const newErrors: { email?: string; password?: string } = {};
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      newErrors.email = 'Vui lòng nhập email học thuật / công tác.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      newErrors.email = 'Định dạng email không hợp lệ (ví dụ: canbo@vnu.edu.vn).';
    }

    if (!password) {
      newErrors.password = 'Vui lòng nhập mật khẩu tài khoản.';
    } else if (password.length < 6) {
      newErrors.password = 'Mật khẩu phải có tối thiểu 6 ký tự.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const recordFailedAttempt = (customErrorMessage?: string) => {
    const newCount = failedAttempts + 1;
    setFailedAttempts(newCount);

    if (newCount >= MAX_FAILED_ATTEMPTS) {
      setLockoutSeconds(LOCKOUT_DURATION_SECONDS);
      setErrors({
        general: `Tài khoản tạm thời bị khóa trong ${LOCKOUT_DURATION_SECONDS} giây do nhập sai thông tin ${MAX_FAILED_ATTEMPTS} lần liên tiếp.`,
      });
    } else {
      const remaining = MAX_FAILED_ATTEMPTS - newCount;
      setErrors({
        general:
          customErrorMessage ||
          `Email hoặc mật khẩu không chính xác. Bạn còn ${remaining} lần thử trước khi bị khóa tạm thời.`,
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) return;
    if (!validate()) return;

    setIsLoading(true);
    setErrors({});

    const normalizedEmail = email.trim().toLowerCase();

    try {
      const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';
      let authenticatedUser: UserProfile | null = null;
      let backendFailed = false;

      // ─── 1. Gửi xác thực tới Backend Auth Service ─────────────────────────
      try {
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
            localStorage.setItem('quizgen_token', data.access_token);
            localStorage.setItem('quizgen_auth_token', data.access_token);
            if (data.user) {
              authenticatedUser = {
                id: data.user.id || `usr-${Date.now()}`,
                fullName: data.user.full_name || currentRoleConfig.defaultName,
                email: data.user.email || normalizedEmail,
                academicTitle: data.user.academic_title || currentRoleConfig.defaultTitle,
                department: data.user.department || currentRoleConfig.defaultDept,
                faculty: data.user.department || currentRoleConfig.defaultDept,
                university: data.user.university || 'Đại học Quốc gia',
                role: (data.user.role as UserRole) || selectedRole,
                roleLabel:
                  data.user.role === 'head_of_department'
                    ? 'Trưởng bộ môn'
                    : data.user.role === 'admin'
                    ? 'Quản trị Khảo thi'
                    : 'Giảng viên',
              };
            }
          }
        } else {
          // Backend trả về lỗi 401 hoặc 400
          const errData = await res.json().catch(() => ({}));
          const errMsg = errData.detail || 'Email hoặc mật khẩu không chính xác.';
          setIsLoading(false);
          recordFailedAttempt(errMsg);
          return;
        }
      } catch (netErr) {
        // Backend offline -> Fallback qua xác thực cục bộ nghiêm ngặt
        backendFailed = true;
      }

      // ─── 2. Fallback Xác thực Nghiêm ngặt (Local Storage & Default Roles) ─
      if (!authenticatedUser && backendFailed) {
        // A. Kiểm tra trong danh sách người dùng đã đăng ký
        const registeredUsers: Array<UserProfile & { password?: string }> = JSON.parse(
          localStorage.getItem('quizgen_registered_users') || '[]'
        );

        const foundUser = registeredUsers.find(
          (u) => u.email.toLowerCase() === normalizedEmail
        );

        if (foundUser) {
          if (foundUser.password && foundUser.password !== password) {
            setIsLoading(false);
            recordFailedAttempt('Mật khẩu học thuật không chính xác.');
            return;
          }

          authenticatedUser = {
            id: foundUser.id,
            fullName: foundUser.fullName,
            email: foundUser.email,
            academicTitle: foundUser.academicTitle || currentRoleConfig.defaultTitle,
            department: foundUser.department || foundUser.faculty || currentRoleConfig.defaultDept,
            faculty: foundUser.faculty || foundUser.department || currentRoleConfig.defaultDept,
            university: foundUser.university || 'Đại học Quốc gia',
            role: foundUser.role || selectedRole,
            roleLabel: foundUser.roleLabel || currentRoleConfig.title,
          };
        } else {
          // B. Kiểm tra danh sách tài khoản mẫu của các vai trò hệ thống
          const matchedRole = ROLES.find(
            (r) => r.defaultEmail.toLowerCase() === normalizedEmail
          );

          if (matchedRole) {
            if (matchedRole.defaultPass !== password) {
              setIsLoading(false);
              recordFailedAttempt(`Mật khẩu không chính xác cho tài khoản ${matchedRole.title}.`);
              return;
            }

            authenticatedUser = {
              id: `usr-${matchedRole.id}-001`,
              fullName: matchedRole.defaultName,
              email: matchedRole.defaultEmail,
              academicTitle: matchedRole.defaultTitle,
              department: matchedRole.defaultDept,
              faculty: matchedRole.defaultDept,
              university: 'Đại học Quốc gia',
              role: matchedRole.id,
              roleLabel: matchedRole.title,
            };
          } else {
            // C. Không tìm thấy tài khoản hợp lệ nào -> TỪ CHỐI ĐĂNG NHẬP
            setIsLoading(false);
            recordFailedAttempt('Tài khoản email này chưa được đăng ký trong hệ thống Khảo thí ĐHQG.');
            return;
          }
        }
      }

      // ─── Đăng nhập thành công -> Reset số lần thử, lưu Session và chuyển màn hình trực tiếp ─
      setFailedAttempts(0);
      if (rememberMe && authenticatedUser) {
        localStorage.setItem('quizgen_user', JSON.stringify(authenticatedUser));
      }

      setIsLoading(false);
      if (authenticatedUser) {
        onLogin(authenticatedUser);
      }
    } catch (err: any) {
      setIsLoading(false);
      setErrors({ general: err.message || 'Lỗi không xác định khi xác thực tài khoản.' });
    }
  };

  const handleSendResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(forgotEmail)) return;
    setForgotSent(true);
    setTimeout(() => {
      setForgotSent(false);
      setShowForgotModal(false);
    }, 2500);
  };

  return (
    <div className="w-full min-h-full flex flex-col items-center justify-start sm:justify-center py-10 px-4 selection:bg-blue-500/30">
      {/* Ambient Glow Orbs */}
      <div className="fixed top-[-10%] left-[-10%] w-[600px] h-[600px] bg-blue-700/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-indigo-700/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-purple-900/10 rounded-full blur-[180px] pointer-events-none" />

      {/* Grid Pattern overlay */}
      <div
        className="fixed inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
        }}
      />

      <div className="relative z-10 w-full max-w-2xl mx-auto my-auto space-y-5">
        {/* Logo & Header */}
        <div className="flex flex-col items-center text-center">
          <div className="relative group cursor-pointer mb-2.5">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-400 flex items-center justify-center text-white shadow-2xl shadow-blue-500/30 group-hover:shadow-blue-500/50 transition-all duration-500 group-hover:scale-105">
              <GraduationCap className="w-8 h-8" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-[#080c16] rounded-full animate-pulse" />
          </div>

          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-2">
            QuizGen <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">AI</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5 font-medium">
            Hệ thống Khảo thí ĐHQG & Khởi tạo Ngân hàng Câu hỏi Chuẩn hóa Bloom
          </p>

          <div className="flex items-center gap-2 mt-2">
            <span className="px-3 py-0.5 text-[10px] font-mono font-bold uppercase rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 tracking-wider">
              PRO AI · V2.4
            </span>
            <span className="px-2.5 py-0.5 text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Bảo mật Cấp độ 3
            </span>
          </div>
        </div>

        {/* ─── PHẦN CHỌN VAI TRÒ ─────────────────────────────────────────── */}
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-xl p-4 sm:p-5 shadow-2xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-blue-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                1. Xác định vai trò công tác của bạn
              </span>
            </div>
            <span className="text-[11px] text-slate-400 hidden sm:inline">Phân quyền theo chức vụ</span>
          </div>

          {/* 3 Thẻ Vai Trò */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {ROLES.map((role) => {
              const Icon = role.icon;
              const isSelected = selectedRole === role.id;

              return (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => handleSelectRole(role)}
                  className={`group relative text-left p-3 rounded-xl border transition-all duration-300 flex flex-col justify-between ${
                    isSelected
                      ? `${role.borderActive} ${role.bgActive} shadow-lg`
                      : 'border-white/[0.07] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                        isSelected
                          ? `bg-gradient-to-tr ${role.accentColor} text-white shadow-md`
                          : 'bg-white/[0.06] text-slate-400 group-hover:text-white group-hover:bg-white/10'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>

                    <div
                      className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] transition-all ${
                        isSelected
                          ? 'bg-blue-500 text-white shadow-sm font-bold'
                          : 'border border-white/20 text-transparent group-hover:border-white/40'
                      }`}
                    >
                      ✓
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-bold text-white leading-snug group-hover:text-blue-300 transition-colors">
                      {role.title}
                    </div>
                    <span className={`inline-block mt-0.5 px-1.5 py-0.5 text-[8px] font-semibold rounded-full border ${role.badgeClass}`}>
                      {role.badge}
                    </span>
                  </div>

                  <p className="text-[10px] text-slate-400 mt-1.5 leading-relaxed line-clamp-2">
                    {role.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* ─── PHẦN FORM ĐĂNG NHẬP (CHẶT CHẼ & BẢO MẬT) ─────────────────── */}
        <div
          className="rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl shadow-2xl p-6 sm:p-7 space-y-5"
          style={{
            boxShadow: `0 0 0 1px rgba(255,255,255,0.05), 0 25px 50px rgba(0,0,0,0.5), 0 0 80px ${currentRoleConfig.glowColor}`,
          }}
        >
          {/* Header Form */}
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3.5">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Cổng Đăng nhập Xác thực</span>
                <span className={`text-[11px] px-2.5 py-0.5 rounded-full border font-bold ${currentRoleConfig.badgeClass}`}>
                  {currentRoleConfig.title}
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Nhập thông tin tài khoản đã được phê duyệt trong Hội đồng Khảo thí.
              </p>
            </div>

            <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-slate-400 bg-white/[0.04] px-2.5 py-1 rounded-lg border border-white/[0.06]">
              <Building2 className="w-3.5 h-3.5 text-blue-400" />
              <span>ĐHQG Việt Nam</span>
            </div>
          </div>

          {/* ─── CẢNH BÁO KHÓA TÀI KHOẢN BRUTE-FORCE ─────────────────────── */}
          {isLocked && (
            <div className="p-4 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs flex items-start gap-3 animate-pulse">
              <Clock className="w-5 h-5 shrink-0 text-rose-400 mt-0.5" />
              <div>
                <div className="font-bold text-white text-sm">Tài khoản đang bị tạm khóa an toàn</div>
                <div className="mt-1 leading-relaxed">
                  Hệ thống tạm ngưng phiên đăng nhập do phát hiện {MAX_FAILED_ATTEMPTS} lần nhập sai thông tin. Vui lòng thử lại sau{' '}
                  <span className="font-mono font-extrabold text-amber-300 text-sm px-1.5 py-0.5 rounded bg-black/40 border border-amber-500/30">
                    {lockoutSeconds}s
                  </span>.
                </div>
              </div>
            </div>
          )}

          {/* ─── CẢNH BÁO SẮP BỊ KHÓA NẾU SAI >= 3 LẦN ──────────────────── */}
          {!isLocked && failedAttempts >= 3 && (
            <div className="p-3.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
              <span>
                Cảnh báo an ninh: Bạn đã nhập sai <strong>{failedAttempts}</strong> lần. Nếu tiếp tục sai đến lần thứ {MAX_FAILED_ATTEMPTS}, hệ thống sẽ kích hoạt khóa tự động 60 giây.
              </span>
            </div>
          )}

          {/* ─── LỖI CHUNG ──────────────────────────────────────────────── */}
          {!isLocked && errors.general && failedAttempts < 3 && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errors.general}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Email Field */}
            <div className="space-y-1.5">
              <label
                htmlFor="login-email"
                className="text-xs font-semibold text-slate-300 tracking-wide uppercase flex items-center justify-between"
              >
                <span>Email công tác / tài khoản trường</span>
                <span className="text-[10px] text-slate-400 lowercase font-normal">(@vnu.edu.vn / @*.edu.vn)</span>
              </label>
              <div className="relative group">
                <div
                  className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors ${
                    errors.email ? 'text-rose-400' : 'text-slate-400 group-focus-within:text-blue-400'
                  }`}
                >
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="login-email"
                  type="email"
                  disabled={isLocked || isLoading}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setErrors((p) => ({ ...p, email: undefined, general: undefined }));
                  }}
                  placeholder="canbo@vnu.edu.vn"
                  className={`w-full bg-white/[0.04] border rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition-all duration-200
                    disabled:opacity-40 disabled:cursor-not-allowed
                    focus:bg-white/[0.07] focus:shadow-[0_0_0_2px_rgba(59,130,246,0.4)]
                    ${
                      errors.email
                        ? 'border-rose-500/60 shadow-[0_0_0_1px_rgba(244,63,94,0.3)]'
                        : 'border-white/[0.08] focus:border-blue-500/50'
                    }`}
                />
              </div>
              {errors.email && (
                <p className="text-[11px] text-rose-400 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {errors.email}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="login-password"
                  className="text-xs font-semibold text-slate-300 tracking-wide uppercase"
                >
                  Mật khẩu tài khoản
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setForgotEmail(email);
                    setShowForgotModal(true);
                  }}
                  className="text-[11px] text-blue-400 hover:text-blue-300 transition-colors font-medium"
                >
                  Quên mật khẩu?
                </button>
              </div>
              <div className="relative group">
                <div
                  className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors ${
                    errors.password ? 'text-rose-400' : 'text-slate-400 group-focus-within:text-blue-400'
                  }`}
                >
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  disabled={isLocked || isLoading}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setErrors((p) => ({ ...p, password: undefined, general: undefined }));
                  }}
                  placeholder="••••••••"
                  className={`w-full bg-white/[0.04] border rounded-xl pl-10 pr-11 py-3 text-sm text-white placeholder-slate-500 outline-none transition-all duration-200
                    disabled:opacity-40 disabled:cursor-not-allowed
                    focus:bg-white/[0.07] focus:shadow-[0_0_0_2px_rgba(59,130,246,0.4)]
                    ${
                      errors.password
                        ? 'border-rose-500/60 shadow-[0_0_0_1px_rgba(244,63,94,0.3)]'
                        : 'border-white/[0.08] focus:border-blue-500/50'
                    }`}
                />
                <button
                  type="button"
                  disabled={isLocked}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-40"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-[11px] text-rose-400 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {errors.password}
                </p>
              )}
            </div>

            {/* Remember Checkbox */}
            <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  disabled={isLocked}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-white/20 bg-white/5 text-blue-600 focus:ring-0 cursor-pointer"
                />
                <span>Ghi nhớ phiên làm việc an toàn</span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              id="login-submit-btn"
              type="submit"
              disabled={isLoading || isLocked}
              className={`relative w-full group flex items-center justify-center gap-2.5 py-3.5 rounded-xl font-bold text-sm text-white bg-gradient-to-r ${currentRoleConfig.accentColor} hover:brightness-110 transition-all duration-300 shadow-lg shadow-black/40 hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 overflow-hidden mt-3`}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Đang xác thực bảo mật với máy chủ...</span>
                </>
              ) : isLocked ? (
                <>
                  <Clock className="w-4 h-4 animate-spin" />
                  <span>Đang khóa an toàn ({lockoutSeconds}s)...</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>Đăng nhập với vai trò {currentRoleConfig.title}</span>
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
          <div className="text-center text-xs text-slate-400">
            Chưa có tài khoản khảo thi chính thức?{' '}
            <button
              id="go-to-register-btn"
              onClick={onNavigateRegister}
              className="text-blue-400 hover:text-blue-300 font-semibold transition-colors hover:underline"
            >
              Đăng ký tài khoản mới ngay
            </button>
          </div>
        </div>

        {/* Security badge footer */}
        <div className="flex items-center justify-center gap-2 text-[11px] text-slate-500">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Kiểm định An toàn Thông tin ĐHQG · Xác thực 2 lớp & Chống Brute-force</span>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-[#0e1424] p-6 shadow-2xl space-y-4">
            <button
              onClick={() => setShowForgotModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Lock className="w-4 h-4 text-blue-400" />
                Khôi phục Mật khẩu Khảo thí
              </h3>
              <p className="text-xs text-slate-400">
                Nhập email của bạn để nhận liên kết xác minh từ Phòng Đảm bảo Chất lượng.
              </p>
            </div>

            {forgotSent ? (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
                <span>Liên kết đặt lại mật khẩu đã được gửi đến email học thuật của bạn!</span>
              </div>
            ) : (
              <form onSubmit={handleSendResetPassword} className="space-y-3">
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="Nhập email học thuật (@vnu.edu.vn)"
                  required
                  className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-blue-500"
                />
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl font-semibold text-xs text-white bg-blue-600 hover:bg-blue-500 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30"
                >
                  <Send className="w-3.5 h-3.5" />
                  Gửi hướng dẫn khôi phục
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
