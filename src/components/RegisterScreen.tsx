import React, { useState, useMemo } from 'react';
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
  AlertCircle,
  Check,
  School,
  FileCheck,
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
  university?: string;
  faculty?: string;
  password?: string;
  confirmPassword?: string;
  general?: string;
}

const ACADEMIC_TITLES = ['ThS.', 'TS.', 'PGS.'];

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
  'Khoa Kinh tế & Quản trị',
  'Khoa Công nghệ Thông tin',
  'Khoa Khoa học & Kỹ thuật Máy tính',
  'Khoa Khoa học Tự nhiên',
  'Khoa Luật & Hành chính công',
  'Khoa Sư phạm & Giáo dục học',
  'Khoa Y Dược',
  'Khoa Ngoại ngữ & Ngôn ngữ học',
  'Khoa Kỹ thuật Xây dựng & Cơ khí',
  'Phòng Khảo thi & Đảm bảo Chất lượng',
  'Viện Trí tuệ Nhân tạo & Khoa học Dữ liệu',
];

const ROLES_OPTIONS: Array<{ id: UserRole; title: string; subtitle: string; icon: any }> = [
  { id: 'lecturer', title: 'Giảng viên', subtitle: 'Soạn đề & RAG', icon: GraduationCap },
  { id: 'head_of_department', title: 'Trưởng bộ môn', subtitle: 'Thẩm định đề thi', icon: Award },
  { id: 'admin', title: 'Quản trị Khảo thi', subtitle: 'Quản trị hệ thống', icon: ShieldCheck },
];

const SYSTEM_DEFAULT_EMAILS = [
  'lecturer@vnu.edu.vn',
  'truongbomon@vnu.edu.vn',
  'admin.khaothi@vnu.edu.vn',
  'admin@ut.edu.vn',
];

// Regex kiểm tra tên tiếng Việt đầy đủ (chữ cái, dấu tiếng Việt, khoảng trắng, 3-50 ký tự)
const VIETNAMESE_NAME_REGEX =
  /^[a-zA-ZÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠàáâãèéêìíòóôõùúăđĩũơƯĂẠẢẤẦẨẪẬẮẰẲẴẶẸẺẼỀỀỂưăạảấầẩẫậắằẳẵặẹẻẽềềểỄỆỈỊỌỎỐỒỔỖỘỚỜỞỠỢỤỦỨỪễệỉịọỏốồổỗộớờởỡợụủứừỬỮỰỲỴÝỶỸửữựỳỵýỷỹ\s]{3,50}$/;

// Regex chuẩn RFC 5322 cho Email
const STRICT_EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export const RegisterScreen: React.FC<RegisterScreenProps> = ({ onRegister, onNavigateLogin }) => {
  const [form, setForm] = useState<RegisterForm>({
    fullName: '',
    academicTitle: 'TS.',
    email: '',
    role: 'lecturer',
    university: UNIVERSITY_OPTIONS[0],
    faculty: FACULTY_OPTIONS[1],
    password: '',
    confirmPassword: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // ─── 4 Tiêu chí mật khẩu bảo mật học thuật ──────────────────────────────
  const passwordCriteria = useMemo(() => {
    const pw = form.password;
    return {
      minLength: pw.length >= 8,
      hasUpper: /[A-Z]/.test(pw),
      hasNumber: /[0-9]/.test(pw),
      hasSpecial: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(pw),
    };
  }, [form.password]);

  const passwordScore = useMemo(() => {
    let score = 0;
    if (passwordCriteria.minLength) score++;
    if (passwordCriteria.hasUpper) score++;
    if (passwordCriteria.hasNumber) score++;
    if (passwordCriteria.hasSpecial) score++;
    return score;
  }, [passwordCriteria]);

  const isPasswordSecure = passwordScore === 4;

  const isAcademicEmail = useMemo(() => {
    return /\.(edu\.vn|edu|ac\.vn)$/i.test(form.email.trim());
  }, [form.email]);

  const setField = (field: keyof RegisterForm, value: any) => {
    setForm((p) => ({ ...p, [field]: value }));
    setErrors((p) => ({ ...p, [field]: undefined, general: undefined }));
  };

  // ─── Hàm kiểm tra trùng lặp Email trong Local Storage & Danh sách hệ thống ───
  const checkEmailAlreadyExists = (emailToCheck: string): boolean => {
    const normalized = emailToCheck.trim().toLowerCase();
    if (SYSTEM_DEFAULT_EMAILS.includes(normalized)) {
      return true;
    }
    try {
      const registered = JSON.parse(localStorage.getItem('quizgen_registered_users') || '[]');
      if (Array.isArray(registered)) {
        return registered.some((u: any) => (u.email || '').toLowerCase() === normalized);
      }
    } catch {
      // Ignored
    }
    return false;
  };

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    const trimmedName = form.fullName.trim();
    const trimmedEmail = form.email.trim().toLowerCase();

    // 1. Kiểm tra Họ và Tên
    if (!trimmedName) {
      newErrors.fullName = 'Vui lòng nhập họ và tên của bạn.';
    } else if (trimmedName.split(/\s+/).length < 2) {
      newErrors.fullName = 'Vui lòng nhập đầy đủ cả Họ và Tên (tối thiểu 2 từ).';
    } else if (!VIETNAMESE_NAME_REGEX.test(trimmedName)) {
      newErrors.fullName = 'Họ và tên chỉ bao gồm chữ cái hợp lệ, không chứa số hay ký tự đặc biệt.';
    }

    // 2. Kiểm tra Email
    if (!trimmedEmail) {
      newErrors.email = 'Vui lòng nhập email học thuật / công tác.';
    } else if (!STRICT_EMAIL_REGEX.test(trimmedEmail)) {
      newErrors.email = 'Định dạng email không hợp lệ (ví dụ: canbo@vnu.edu.vn).';
    } else if (checkEmailAlreadyExists(trimmedEmail)) {
      newErrors.email = 'Email này đã tồn tại trong hệ thống. Vui lòng chuyển sang Đăng nhập.';
    }

    // 3. Kiểm tra Trường & Khoa
    if (!form.university) {
      newErrors.university = 'Vui lòng chọn cơ sở đào tạo / trường đại học.';
    }
    if (!form.faculty) {
      newErrors.faculty = 'Vui lòng chọn khoa hoặc đơn vị công tác.';
    }

    // 4. Kiểm tra Mật khẩu chặt chẽ
    if (!form.password) {
      newErrors.password = 'Vui lòng thiết lập mật khẩu bảo mật.';
    } else if (!passwordCriteria.minLength) {
      newErrors.password = 'Mật khẩu phải có tối thiểu 8 ký tự.';
    } else if (!isPasswordSecure) {
      newErrors.password = 'Mật khẩu chưa đáp ứng đủ 4 tiêu chí bảo mật bên dưới.';
    }

    // 5. Kiểm tra Xác nhận Mật khẩu
    if (!form.confirmPassword) {
      newErrors.confirmPassword = 'Vui lòng nhập lại mật khẩu để xác nhận.';
    } else if (form.password !== form.confirmPassword) {
      newErrors.confirmPassword = 'Mật khẩu xác nhận không khớp.';
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
      setErrors((p) => ({
        ...p,
        general: 'Vui lòng tích xác nhận cam kết tuân thủ Quy chế Khảo thí và Bảo mật đề thi.',
      }));
      return;
    }

    setIsLoading(true);
    setErrors({});

    const normalizedEmail = form.email.trim().toLowerCase();
    const newUser: UserProfile = {
      id: `usr-${form.role}-${Date.now().toString().slice(-4)}`,
      fullName: form.fullName.trim(),
      email: normalizedEmail,
      academicTitle: form.academicTitle,
      department: form.faculty,
      faculty: form.faculty,
      university: form.university,
      role: form.role,
      roleLabel: getRoleLabel(form.role),
    };

    try {
      const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

      // 1. Gửi đăng ký tới Backend Auth Service qua Mock Gateway hoặc Service thực tế
      try {
        const res = await fetch(`${API_BASE}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: normalizedEmail,
            password: form.password,
            full_name: newUser.fullName,
            academic_title: newUser.academicTitle,
            university: newUser.university,
            department: newUser.department,
            role: newUser.role,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.id) newUser.id = data.id;
        } else {
          const errData = await res.json().catch(() => ({}));
          const errMsg = errData.detail || 'Không thể tạo tài khoản trên máy chủ.';
          setErrors({ general: errMsg });
          setIsLoading(false);
          return;
        }
        const data = await res.json();
        if (data.id) {
          newUser.id = data.id;
        }
        if (data.access_token) {
          localStorage.setItem('quizgen_token', data.access_token);
          localStorage.setItem('quizgen_auth_token', data.access_token);
        }
      } catch (netErr) {
        // Backend offline, fallback lưu cục bộ
      }

      // 2. Lưu trữ vào danh sách người dùng đã đăng ký (LocalStorage)
      const existingUsers: Array<UserProfile & { password?: string }> = JSON.parse(
        localStorage.getItem('quizgen_registered_users') || '[]'
      );

      // Phòng ngừa trùng lặp lần 2
      if (existingUsers.some((u) => u.email.toLowerCase() === normalizedEmail)) {
        setErrors({ email: 'Email này đã tồn tại trong danh sách tài khoản.' });
        setIsLoading(false);
        return;
      }

      existingUsers.push({
        ...newUser,
        role: 'lecturer',
        roleLabel: 'Giảng viên',
        status: 'active',
        password: form.password,
      });
      localStorage.setItem('quizgen_registered_users', JSON.stringify(existingUsers));

      // Ghi log đăng ký tài khoản mới cho Admin Portal
      try {
        const logs = JSON.parse(localStorage.getItem('quizgen_security_audit_logs') || '[]');
        logs.unshift({
          id: `audit-${Date.now()}`,
          timestamp: new Date().toLocaleString('vi-VN'),
          actorEmail: normalizedEmail,
          action: 'REGISTER_LECTURER_ACCOUNT',
          detail: `Đăng ký tài khoản Giảng viên mới: ${newUser.academicTitle} ${newUser.fullName} (${newUser.faculty})`,
          severity: 'info',
          ipAddress: '127.0.0.1',
        });
        localStorage.setItem('quizgen_security_audit_logs', JSON.stringify(logs.slice(0, 100)));
      } catch {}

      // Tự động thiết lập phiên đăng nhập
      localStorage.setItem('quizgen_user', JSON.stringify(newUser));

      setIsLoading(false);
      onRegister(newUser);
    } catch (err: any) {
      setIsLoading(false);
      setErrors({ general: err.message || 'Lỗi khi khởi tạo tài khoản.' });
    }
  };

  return (
    <div className="w-full min-h-full bg-[#f4f7f9] text-slate-800 flex flex-col justify-between selection:bg-[#008689]/20 selection:text-[#006d70]">
      {/* Minimal Top Accent Bar */}
      <div className="h-1.5 w-full bg-[#008689] shrink-0" />

      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-lg space-y-5">
          {/* Clean Brand Header */}
          <div className="text-center space-y-1.5">
            <img
              src="/logo.jpg"
              alt="QuizGen AI Logo"
              className="w-12 h-12 rounded-2xl shadow-md mx-auto mb-1 object-cover border border-[#008689]/20"
            />
            <h1 className="text-lg font-extrabold text-[#008689] tracking-tight uppercase">
              QuizGen AI
            </h1>
            <p className="text-xs text-slate-500">
              Đăng ký tài khoản Giảng viên & Cán bộ Khảo thí
            </p>
          </div>

          {/* Card */}
          <div className="rounded-2xl border border-slate-200/90 border-t-4 border-t-[#008689] bg-white shadow-sm p-4 sm:p-7 space-y-4">
            <div className="text-center border-b border-slate-100 pb-3">
              <h2 className="text-base font-extrabold uppercase tracking-wide text-[#da1c2d]">
                Tạo tài khoản mới
              </h2>
            </div>

            {errors.general && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-[#da1c2d] text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-[#da1c2d]" />
                <span>{errors.general}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5" noValidate>
              {/* 1. Loại tài khoản cố định: Giảng viên (Strict Whitelist) */}
              <div className="p-2.5 rounded-xl bg-[#e6f4f4]/70 border border-[#008689]/25 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-[#006d70] font-semibold">
                  <GraduationCap className="w-4 h-4 text-[#008689]" />
                  <span>Tài khoản Giảng viên Biên soạn & Xuất bản Đề thi</span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white text-[#008689] border border-[#008689]/20">
                  Mặc định
                </span>
              </div>

              {/* 2. Học vị & Họ tên */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-2.5">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Học vị</label>
                  <select
                    value={form.academicTitle}
                    onChange={(e) => setField('academicTitle', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 outline-none focus:bg-white focus:border-[#008689] cursor-pointer"
                  >
                    {ACADEMIC_TITLES.map((t) => (
                      <option key={t} value={t} className="bg-white text-slate-900">
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Họ và tên</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={form.fullName}
                      onChange={(e) => setField('fullName', e.target.value)}
                      placeholder="Nguyễn Văn An"
                      className={`w-full bg-slate-50 border rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-900 placeholder-slate-400 outline-none transition-all focus:bg-white ${
                        errors.fullName ? 'border-[#da1c2d]' : 'border-slate-200 focus:border-[#008689]'
                      }`}
                    />
                  </div>
                  {errors.fullName && (
                    <p className="text-[11px] text-[#da1c2d]">{errors.fullName}</p>
                  )}
                </div>
              </div>

              {/* 3. Email */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Email công tác</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setField('email', e.target.value)}
                    placeholder="giangvien@ut.edu.vn"
                    className={`w-full bg-slate-50 border rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-900 placeholder-slate-400 outline-none transition-all focus:bg-white ${
                      errors.email ? 'border-[#da1c2d]' : 'border-slate-200 focus:border-[#008689]'
                    }`}
                  />
                </div>
                {errors.email && (
                  <p className="text-[11px] text-[#da1c2d]">{errors.email}</p>
                )}
              </div>

              {/* 4. Trường & Khoa */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Trường đại học</label>
                  <div className="relative">
                    <School className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={form.university}
                      onChange={(e) => setField('university', e.target.value)}
                      placeholder="ĐH GTVT TP.HCM (UTH)"
                      className={`w-full bg-slate-50 border rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-900 placeholder-slate-400 outline-none transition-all focus:bg-white ${
                        errors.university ? 'border-[#da1c2d]' : 'border-slate-200 focus:border-[#008689]'
                      }`}
                    />
                  </div>
                  {errors.university && (
                    <p className="text-[11px] text-[#da1c2d]">{errors.university}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Khoa / Đơn vị</label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <select
                      value={form.faculty}
                      onChange={(e) => setField('faculty', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-900 outline-none focus:bg-white focus:border-[#008689] cursor-pointer truncate"
                    >
                      {FACULTY_OPTIONS.map((f) => (
                        <option key={f} value={f} className="bg-white text-slate-900">
                          {f}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* 5. Mật khẩu & Xác nhận */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Mật khẩu</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={form.password}
                      onChange={(e) => setField('password', e.target.value)}
                      placeholder="Tối thiểu 8 ký tự"
                      className={`w-full bg-slate-50 border rounded-xl pl-9 pr-9 py-2.5 text-xs text-slate-900 placeholder-slate-400 outline-none transition-all focus:bg-white ${
                        errors.password ? 'border-[#da1c2d]' : 'border-slate-200 focus:border-[#008689]'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Xác nhận mật khẩu</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={form.confirmPassword}
                      onChange={(e) => setField('confirmPassword', e.target.value)}
                      placeholder="Nhập lại mật khẩu"
                      className={`w-full bg-slate-50 border rounded-xl pl-9 pr-9 py-2.5 text-xs text-slate-900 placeholder-slate-400 outline-none transition-all focus:bg-white ${
                        errors.confirmPassword
                          ? 'border-[#da1c2d]'
                          : form.confirmPassword && form.password === form.confirmPassword
                          ? 'border-emerald-500'
                          : 'border-slate-200 focus:border-[#008689]'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Compact Password Criteria Pills */}
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { ok: passwordCriteria.minLength, label: '≥ 8 ký tự' },
                  { ok: passwordCriteria.hasUpper, label: 'Chữ hoa (A-Z)' },
                  { ok: passwordCriteria.hasNumber, label: 'Chữ số (0-9)' },
                  { ok: passwordCriteria.hasSpecial, label: 'Ký tự đặc biệt' },
                ].map((item) => (
                  <span
                    key={item.label}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-medium border transition-colors ${
                      item.ok
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-slate-50 text-slate-400 border-slate-200'
                    }`}
                  >
                    {item.ok ? '✓ ' : ''}
                    {item.label}
                  </span>
                ))}
              </div>

              {(errors.password || errors.confirmPassword) && (
                <p className="text-[11px] text-[#da1c2d]">
                  {errors.password || errors.confirmPassword}
                </p>
              )}

              {/* 6. Terms */}
              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-[#008689] accent-[#008689] cursor-pointer shrink-0"
                />
                <span className="text-xs text-slate-600">
                  Tôi đồng ý tuân thủ <strong className="text-[#008689]">Quy chế Khảo thí & Bảo mật Đề thi</strong>.
                </span>
              </label>

              {/* Submit Button */}
              <button
                id="register-submit-btn"
                type="submit"
                disabled={isLoading || !agreedToTerms || !isPasswordSecure}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm text-white bg-[#008689] hover:bg-[#006d70] transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Đang tạo tài khoản...</span>
                  </>
                ) : (
                  <>
                    <span>Đăng ký tài khoản</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="text-center text-xs text-slate-500 pt-2 border-t border-slate-100">
              Đã có tài khoản?{' '}
              <button
                id="go-to-login-btn"
                onClick={onNavigateLogin}
                className="text-[#008689] font-bold hover:underline"
              >
                Đăng nhập
              </button>
            </div>
          </div>
        </div>
      </div>

      <footer className="py-3 text-center text-[11px] text-slate-400">
        © 2026 QuizGen AI
      </footer>
    </div>
  );
};
