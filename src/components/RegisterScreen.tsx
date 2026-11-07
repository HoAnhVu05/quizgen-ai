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
        password: form.password,
      });
      localStorage.setItem('quizgen_registered_users', JSON.stringify(existingUsers));

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
    <div className="w-full min-h-full flex flex-col items-center justify-start sm:justify-center py-10 px-4 selection:bg-blue-500/30">
      {/* Background Orbs */}
      <div className="fixed top-[-10%] right-[-5%] w-[500px] h-[500px] bg-indigo-700/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-blue-700/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed top-1/3 right-1/4 w-[400px] h-[400px] bg-purple-900/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-xl mx-auto my-auto space-y-4">
        {/* Header */}
        <div className="flex flex-col items-center mb-2">
          <div className="relative group cursor-pointer mb-2.5">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-400 flex items-center justify-center text-white shadow-2xl shadow-blue-500/30 group-hover:scale-105 transition-all">
              <GraduationCap className="w-7 h-7" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-[#080c16] rounded-full animate-pulse" />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            QuizGen <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">AI</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Cổng Đăng ký Tài khoản Khảo thí & Soạn đề Thông minh ĐHQG
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl shadow-2xl shadow-black/50 p-6 sm:p-7 space-y-4"
          style={{ boxShadow: '0 0 0 1px rgba(255,255,255,0.05), 0 25px 50px rgba(0,0,0,0.5)' }}
        >
          <div className="border-b border-white/[0.06] pb-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span>Đăng ký Tài khoản Giảng viên / Cán bộ</span>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                Xác thực định danh
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Thông tin được kiểm định phục vụ việc cấp quyền truy cập Ngân hàng đề thi và Tài nguyên RAG.
            </p>
          </div>

          {errors.general && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errors.general}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* ─── 1. CHỌN VAI TRÒ ĐĂNG KÝ ────────────────────────────── */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 uppercase flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-blue-400" />
                  <span>1. Vai trò trong Hội đồng Khảo thí</span>
                </span>
                <span className="text-[10px] text-slate-500 lowercase font-normal">(bắt buộc chọn)</span>
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
                          ? 'border-blue-500 bg-blue-500/15 shadow-sm ring-1 ring-blue-500/40'
                          : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.05]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <Icon className={`w-4 h-4 ${isSelected ? 'text-blue-400' : 'text-slate-400'}`} />
                        {isSelected && <span className="text-[10px] text-blue-400 font-bold">✓</span>}
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

            {/* ─── 2. HỌ VÀ TÊN & HỌC VỊ ──────────────────────────────── */}
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
                <label className="text-xs font-semibold text-slate-300 uppercase flex items-center justify-between">
                  <span>Họ và tên</span>
                  <span className="text-[10px] text-slate-500 lowercase font-normal">(tối thiểu 2 từ)</span>
                </label>
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
                      ${errors.fullName ? 'border-rose-500/60 shadow-[0_0_0_1px_rgba(244,63,94,0.3)]' : 'border-white/10 focus:border-blue-500/50'}`}
                  />
                </div>
                {errors.fullName && (
                  <p className="text-[11px] text-rose-400 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.fullName}
                  </p>
                )}
              </div>
            </div>

            {/* ─── 3. EMAIL HỌC THUẬT VỚI KIỂM SOÁT ĐỊNH DẠNG & TRÙNG LẶP ─ */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300 uppercase">
                  Email công tác / học thuật
                </label>
                {isAcademicEmail ? (
                  <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Tên miền học thuật hợp lệ
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-500 lowercase">Ưu tiên @*.edu.vn / @*.edu</span>
                )}
              </div>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setField('email', e.target.value)}
                  placeholder="giangvien@vnu.edu.vn"
                  className={`w-full bg-white/[0.04] border rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition-all
                    ${errors.email ? 'border-rose-500/60 shadow-[0_0_0_1px_rgba(244,63,94,0.3)]' : 'border-white/10 focus:border-blue-500/50'}`}
                />
              </div>
              {errors.email ? (
                <p className="text-[11px] text-rose-400 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {errors.email}
                </p>
              ) : form.email && !isAcademicEmail ? (
                <p className="text-[10px] text-amber-400/90 flex items-center gap-1">
                  <span>ℹ</span> Khuyến nghị: Email tên miền trường đại học giúp tự động kích hoạt hạn mức AI cao nhất.
                </p>
              ) : null}
            </div>

            {/* ─── 4. CƠ SỞ ĐÀO TẠO & KHOA BỘ MÔN ─────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 uppercase">Trường đại học (University)</label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <School className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={form.university}
                    onChange={(e) => setField('university', e.target.value)}
                    placeholder="Ví dụ: Đại học Quốc gia TP.HCM, ĐH Bách Khoa..."
                    className={`w-full bg-white/[0.04] border rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition-all
                      ${errors.university ? 'border-rose-500/60 shadow-[0_0_0_1px_rgba(244,63,94,0.3)]' : 'border-white/10 focus:border-blue-500/50'}`}
                  />
                </div>
                {errors.university && (
                  <p className="text-[11px] text-rose-400 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.university}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 uppercase">Khoa / Đơn vị công tác</label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <select
                    value={form.faculty}
                    onChange={(e) => setField('faculty', e.target.value)}
                    className="w-full bg-[#131b2e] border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white outline-none focus:border-blue-500/50 cursor-pointer truncate"
                  >
                    {FACULTY_OPTIONS.map((f) => (
                      <option key={f} value={f} className="bg-[#131b2e] text-white">
                        {f}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* ─── 5. MẬT KHẨU & CHECKLIST BẢO MẬT CHẶT CHẼ ───────────── */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300 uppercase">
                  Mật khẩu bảo mật
                </label>
                <span className="text-[10px] text-slate-400">
                  Chuẩn an toàn: <span className={isPasswordSecure ? 'text-emerald-400 font-bold' : 'text-amber-400'}>{passwordScore}/4 tiêu chí</span>
                </span>
              </div>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setField('password', e.target.value)}
                  placeholder="Tối thiểu 8 ký tự, có số, chữ hoa & ký tự đặc biệt"
                  className={`w-full bg-white/[0.04] border rounded-xl pl-9 pr-10 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition-all
                    ${errors.password ? 'border-rose-500/60 shadow-[0_0_0_1px_rgba(244,63,94,0.3)]' : 'border-white/10 focus:border-blue-500/50'}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Checklist 4 tiêu chuẩn mật khẩu trực quan */}
              <div className="grid grid-cols-2 gap-1.5 p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] mt-2">
                <div className={`flex items-center gap-1.5 text-[10px] transition-colors ${passwordCriteria.minLength ? 'text-emerald-400' : 'text-slate-500'}`}>
                  <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center border text-[8px] ${passwordCriteria.minLength ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'border-slate-600 text-transparent'}`}>
                    ✓
                  </div>
                  <span>Tối thiểu 8 ký tự</span>
                </div>

                <div className={`flex items-center gap-1.5 text-[10px] transition-colors ${passwordCriteria.hasUpper ? 'text-emerald-400' : 'text-slate-500'}`}>
                  <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center border text-[8px] ${passwordCriteria.hasUpper ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'border-slate-600 text-transparent'}`}>
                    ✓
                  </div>
                  <span>Ít nhất 1 chữ in hoa (A-Z)</span>
                </div>

                <div className={`flex items-center gap-1.5 text-[10px] transition-colors ${passwordCriteria.hasNumber ? 'text-emerald-400' : 'text-slate-500'}`}>
                  <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center border text-[8px] ${passwordCriteria.hasNumber ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'border-slate-600 text-transparent'}`}>
                    ✓
                  </div>
                  <span>Ít nhất 1 chữ số (0-9)</span>
                </div>

                <div className={`flex items-center gap-1.5 text-[10px] transition-colors ${passwordCriteria.hasSpecial ? 'text-emerald-400' : 'text-slate-500'}`}>
                  <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center border text-[8px] ${passwordCriteria.hasSpecial ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'border-slate-600 text-transparent'}`}>
                    ✓
                  </div>
                  <span>1 ký tự đặc biệt (!@#$...)</span>
                </div>
              </div>

              {errors.password && (
                <p className="text-[11px] text-rose-400 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {errors.password}
                </p>
              )}
            </div>

            {/* ─── 6. XÁC NHẬN MẬT KHẨU ───────────────────────────────── */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 uppercase">
                Xác nhận lại mật khẩu
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={form.confirmPassword}
                  onChange={(e) => setField('confirmPassword', e.target.value)}
                  placeholder="Nhập lại chính xác mật khẩu trên"
                  className={`w-full bg-white/[0.04] border rounded-xl pl-9 pr-10 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition-all
                    ${
                      errors.confirmPassword
                        ? 'border-rose-500/60 shadow-[0_0_0_1px_rgba(244,63,94,0.3)]'
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

              {form.confirmPassword && (
                <div className="text-[11px] flex items-center gap-1 pt-0.5">
                  {form.password === form.confirmPassword ? (
                    <span className="text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Mật khẩu xác nhận hoàn toàn trùng khớp
                    </span>
                  ) : (
                    <span className="text-rose-400 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> Mật khẩu xác nhận chưa trùng khớp
                    </span>
                  )}
                </div>
              )}
              {errors.confirmPassword && (
                <p className="text-[11px] text-rose-400 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {errors.confirmPassword}
                </p>
              )}
            </div>

            {/* ─── 7. CAM KẾT QUY CHẾ KHẢO THÍ & BẢO MẬT ĐỀ THI ───────── */}
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.07]">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-white/20 bg-white/5 text-blue-600 focus:ring-0 cursor-pointer shrink-0"
                />
                <span className="text-[11px] text-slate-300 leading-relaxed">
                  Tôi cam kết thông tin khai báo là hoàn toàn trung thực, tuân thủ nghiêm ngặt{' '}
                  <span className="text-blue-400 font-semibold hover:underline">
                    Quy chế Khảo thí, Bí mật Đề thi
                  </span>{' '}
                  và Quy định Bảo vệ Dữ liệu Cá nhân của Đại học Quốc gia.
                </span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              id="register-submit-btn"
              type="submit"
              disabled={isLoading || !agreedToTerms || !isPasswordSecure}
              className="relative w-full group flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 transition-all duration-300 shadow-lg shadow-indigo-600/30 hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Đang thẩm định & khởi tạo tài khoản...</span>
                </>
              ) : (
                <>
                  <FileCheck className="w-4 h-4" />
                  <span>Xác nhận & Khởi tạo Tài khoản Khảo thí</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </button>
          </form>

          {/* Link sang Đăng nhập */}
          <div className="text-center text-xs text-slate-400 pt-2 border-t border-white/[0.06]">
            Đã có tài khoản cán bộ khảo thí?{' '}
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
        <div className="flex items-center justify-center gap-2 mt-3 text-[11px] text-slate-500">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Mã hóa TLS 1.3 · Ràng buộc Đạo đức Học thuật & Kiểm định ĐHQG</span>
        </div>
      </div>
    </div>
  );
};
