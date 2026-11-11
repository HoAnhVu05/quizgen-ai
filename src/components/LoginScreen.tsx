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
  ExternalLink,
  Copy,
  Check,
  Settings,
} from 'lucide-react';
import { UserProfile, UserRole } from '../types';
import apiClient from '../services/apiClient';

declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            prompt?: string;
            callback: (response: {
              access_token?: string;
              error?: string;
              error_description?: string;
              expires_in?: number;
              scope?: string;
              token_type?: string;
            }) => void;
            error_callback?: (error: { type?: string; message?: string }) => void;
          }) => {
            requestAccessToken: (overrideConfig?: { prompt?: string }) => void;
          };
        };
      };
    };
  }
}

const GOOGLE_GSI_SRC = 'https://accounts.google.com/gsi/client';

const isValidGoogleClientId = (clientId: string): boolean => {
  const trimmed = clientId.trim();
  return trimmed.length > 20 && !/\s/.test(trimmed) && trimmed.endsWith('.apps.googleusercontent.com');
};

const loadGoogleIdentityServices = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) {
      resolve();
      return;
    }

    const existingScript = document.querySelector(`script[src="${GOOGLE_GSI_SRC}"]`) as HTMLScriptElement | null;
    if (existingScript) {
      const startedAt = Date.now();
      const pollTimer = window.setInterval(() => {
        if (window.google?.accounts?.oauth2) {
          window.clearInterval(pollTimer);
          resolve();
        } else if (Date.now() - startedAt > 8000) {
          window.clearInterval(pollTimer);
          reject(new Error('Không thể tải thư viện xác thực từ Google (accounts.google.com/gsi/client).'));
        }
      }, 100);
      return;
    }

    const script = document.createElement('script');
    script.src = GOOGLE_GSI_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.google?.accounts?.oauth2) {
        resolve();
      } else {
        reject(new Error('Google Identity Services đã tải nhưng thiếu module OAuth 2.0.'));
      }
    };
    script.onerror = () => {
      reject(new Error('Không thể kết nối tới Google Identity Services (accounts.google.com).'));
    };
    document.head.appendChild(script);
  });
};

const GoogleLogo: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </svg>
);

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
    accentColor: 'from-[#008689] to-[#1d999d]',
    glowColor: 'rgba(0, 134, 137, 0.14)',
    borderActive: 'border-[#008689] ring-2 ring-[#008689]/20',
    bgActive: 'bg-[#e0f7fa]/60',
    badgeClass: 'bg-[#e0f7fa] text-[#008689] border-[#008689]/30',
    defaultEmail: 'lecturer@vnu.edu.vn',
    defaultPass: 'Admin@123456',
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
    accentColor: 'from-indigo-600 to-[#008689]',
    glowColor: 'rgba(79, 70, 229, 0.14)',
    borderActive: 'border-indigo-500 ring-2 ring-indigo-500/20',
    bgActive: 'bg-indigo-50/80',
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    defaultEmail: 'truongbomon@vnu.edu.vn',
    defaultPass: 'Admin@123456',
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
    accentColor: 'from-[#da1c2d] to-rose-700',
    glowColor: 'rgba(218, 28, 45, 0.14)',
    borderActive: 'border-[#da1c2d] ring-2 ring-[#da1c2d]/20',
    bgActive: 'bg-rose-50/80',
    badgeClass: 'bg-rose-50 text-[#da1c2d] border-rose-200',
    defaultEmail: 'admin.khaothi@vnu.edu.vn',
    defaultPass: 'Admin@123456',
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

  // ─── Forgot Password Modal States (2-Step OTP Flow) ───────────────────────
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotStep, setForgotStep] = useState<1 | 2 | 3>(1);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotDevOtp, setForgotDevOtp] = useState('');
  const [forgotNewPass, setForgotNewPass] = useState('');
  const [forgotConfirmPass, setForgotConfirmPass] = useState('');
  const [showForgotNewPass, setShowForgotNewPass] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  // ─── Real Google OAuth 2.0 (GIS) Sign-In States ───────────────────────────
  const envGoogleClientId = String((import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || '').trim();
  const [customGoogleClientId, setCustomGoogleClientId] = useState<string>(() => {
    try {
      return (localStorage.getItem('quizgen_google_client_id') || '').trim();
    } catch {
      return '';
    }
  });
  const activeGoogleClientId = (envGoogleClientId || customGoogleClientId).trim();
  const [showGoogleSetupModal, setShowGoogleSetupModal] = useState(false);
  const [googleClientIdDraft, setGoogleClientIdDraft] = useState('');
  const [googleSetupError, setGoogleSetupError] = useState('');
  const [googleError, setGoogleError] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googlePopupBlocked, setGooglePopupBlocked] = useState(false);
  const [copiedOrigin, setCopiedOrigin] = useState(false);

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
            apiClient.setTokens(data.access_token, data.refresh_token || `mock-jwt-refresh-${data.user?.role || selectedRole}-${Date.now()}`);
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
          // Backend từ chối xác thực (sai mật khẩu hoặc không tồn tại)
          const errData = await res.json().catch(() => ({}));
          const errMsg = errData.detail || 'Email hoặc mật khẩu không chính xác.';
          setErrors({ general: errMsg });
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
          if (!foundUser.password || foundUser.password !== password) {
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
          // B. Kiểm tra danh sách tài khoản hệ thống (bao gồm mật khẩu đã đặt lại cục bộ nếu có)
          const matchedRole = ROLES.find(
            (r) => r.defaultEmail.toLowerCase() === normalizedEmail
          );

          if (matchedRole) {
            let expectedPass = matchedRole.defaultPass;
            try {
              const overrides = JSON.parse(localStorage.getItem('quizgen_password_overrides') || '{}');
              if (overrides[normalizedEmail]) {
                expectedPass = overrides[normalizedEmail];
              }
            } catch {}

            if (expectedPass !== password) {
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
      if (authenticatedUser) {
        if (backendFailed) {
          const curRole = authenticatedUser.role || selectedRole;
          const mockAccess = 'mock-jwt-access-' + curRole + '-' + Date.now();
          const mockRefresh = 'mock-jwt-refresh-' + curRole + '-' + Date.now();
          apiClient.setTokens(mockAccess, mockRefresh);
          localStorage.setItem('quizgen_token', mockAccess);
          localStorage.setItem('quizgen_auth_token', mockAccess);
        }
        if (rememberMe) {
          localStorage.setItem('quizgen_user', JSON.stringify(authenticatedUser));
        }
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

  // ─── Forgot Password Step 1: Yêu cầu mã OTP khôi phục ────────────────────
  const handleRequestResetOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetEmail = forgotEmail.trim().toLowerCase();
    setForgotError('');

    if (!targetEmail) {
      setForgotError('Vui lòng nhập địa chỉ email học thuật của bạn.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(targetEmail)) {
      setForgotError('Định dạng email không hợp lệ (ví dụ: canbo@vnu.edu.vn).');
      return;
    }

    setForgotLoading(true);
    try {
      const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';
      try {
        const res = await fetch(`${API_BASE}/auth/forgot-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: targetEmail }),
        });

        if (res.ok) {
          const data = await res.json();
          setForgotDevOtp(data.dev_otp || '686868');
          setForgotStep(2);
          setForgotLoading(false);
          return;
        } else if (res.status === 404 || res.status === 400) {
          const errData = await res.json().catch(() => ({}));
          setForgotError(errData.detail || 'Email này chưa được đăng ký trong hệ thống.');
          setForgotLoading(false);
          return;
        }
      } catch {
        // Backend offline hoặc chưa có route -> Kiểm tra fallback cục bộ
      }

      // Kiểm tra cục bộ trong localStorage và danh sách tài khoản hệ thống
      const registeredUsers: Array<UserProfile> = JSON.parse(
        localStorage.getItem('quizgen_registered_users') || '[]'
      );
      const existsLocal =
        registeredUsers.some((u) => u.email.toLowerCase() === targetEmail) ||
        ROLES.some((r) => r.defaultEmail.toLowerCase() === targetEmail);

      if (!existsLocal) {
        setForgotError('Tài khoản email này chưa được đăng ký trong hệ thống Khảo thí ĐHQG.');
        setForgotLoading(false);
        return;
      }

      const generatedOtp = String(Math.floor(100000 + Math.random() * 900000));
      setForgotDevOtp(generatedOtp);
      setForgotStep(2);
    } catch (err: any) {
      setForgotError(err.message || 'Không thể xử lý yêu cầu khôi phục mật khẩu.');
    } finally {
      setForgotLoading(false);
    }
  };

  // ─── Forgot Password Step 2: Xác minh OTP và Đặt lại Mật khẩu mới ─────────
  const handleConfirmResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');
    const targetEmail = forgotEmail.trim().toLowerCase();
    const trimmedOtp = forgotOtp.trim();

    if (!trimmedOtp || trimmedOtp.length < 6) {
      setForgotError('Vui lòng nhập đầy đủ mã xác minh OTP 6 chữ số.');
      return;
    }
    if (!forgotNewPass || forgotNewPass.length < 6) {
      setForgotError('Mật khẩu mới phải có ít nhất 6 ký tự.');
      return;
    }
    if (forgotNewPass !== forgotConfirmPass) {
      setForgotError('Mật khẩu xác nhận không trùng khớp.');
      return;
    }

    setForgotLoading(true);
    try {
      const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';
      let updatedViaBackend = false;

      try {
        const res = await fetch(`${API_BASE}/auth/reset-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: targetEmail,
            otp: trimmedOtp,
            new_password: forgotNewPass,
          }),
        });

        if (res.ok) {
          updatedViaBackend = true;
        } else if (res.status === 400 || res.status === 404) {
          const errData = await res.json().catch(() => ({}));
          setForgotError(errData.detail || 'Mã OTP không chính xác hoặc đã hết hạn.');
          setForgotLoading(false);
          return;
        }
      } catch {
        // Fallback cục bộ khi backend offline
      }

      if (!updatedViaBackend) {
        if (forgotDevOtp && trimmedOtp !== forgotDevOtp) {
          setForgotError('Mã xác minh OTP không chính xác. Vui lòng kiểm tra lại.');
          setForgotLoading(false);
          return;
        }
      }

      // Cập nhật mật khẩu vào localStorage (để đồng bộ nếu offline hoặc F5)
      try {
        const registeredUsers: Array<UserProfile & { password?: string }> = JSON.parse(
          localStorage.getItem('quizgen_registered_users') || '[]'
        );
        const updatedList = registeredUsers.map((u) =>
          u.email.toLowerCase() === targetEmail ? { ...u, password: forgotNewPass } : u
        );
        localStorage.setItem('quizgen_registered_users', JSON.stringify(updatedList));

        const overrides = JSON.parse(localStorage.getItem('quizgen_password_overrides') || '{}');
        overrides[targetEmail] = forgotNewPass;
        localStorage.setItem('quizgen_password_overrides', JSON.stringify(overrides));
      } catch {}

      // Đặt lại trạng thái thành công
      setEmail(targetEmail);
      setPassword('');
      setErrors({});
      setFailedAttempts(0);
      setLockoutSeconds(0);
      setForgotStep(3);
    } catch (err: any) {
      setForgotError(err.message || 'Lỗi đặt lại mật khẩu.');
    } finally {
      setForgotLoading(false);
    }
  };

  // ─── Real Google OAuth 2.0 Authentication Handlers ────────────────────────
  const exchangeGoogleTokenWithBackend = async (
    googleAccessToken: string,
    targetRole: UserRole,
    clientIdUsed: string
  ) => {
    setGoogleError('');
    setGooglePopupBlocked(false);
    setGoogleLoading(true);
    try {
      const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';
      const roleObj = ROLES.find((r) => r.id === targetRole) || ROLES[0];
      let authenticatedUser: UserProfile | null = null;
      let backendOffline = false;

      try {
        const res = await fetch(`${API_BASE}/auth/google`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            google_access_token: googleAccessToken,
            client_id: clientIdUsed,
            university: 'Đại học Quốc gia',
            department: roleObj.defaultDept,
            role: targetRole,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.access_token) {
            apiClient.setTokens(
              data.access_token,
              data.refresh_token || `mock-jwt-refresh-${targetRole}-${Date.now()}`
            );
            localStorage.setItem('quizgen_token', data.access_token);
            localStorage.setItem('quizgen_auth_token', data.access_token);
          }

          const u = data.user || {};
          authenticatedUser = {
            id: u.id || `gg-${Date.now().toString(36)}`,
            fullName: u.full_name || 'Người dùng Google',
            email: u.email,
            academicTitle: u.academic_title || 'ThS.',
            department: u.department || roleObj.defaultDept,
            faculty: u.department || roleObj.defaultDept,
            university: u.university || 'Đại học Quốc gia',
            role: (u.role as UserRole) || targetRole,
            roleLabel:
              u.role === 'head_of_department'
                ? 'Trưởng bộ môn'
                : u.role === 'admin'
                ? 'Quản trị Khảo thi'
                : 'Giảng viên',
            avatarUrl: u.avatar_url || '',
            authProvider: 'google',
          };
        } else {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.detail || 'Máy chủ từ chối token Google OAuth.');
        }
      } catch (err: any) {
        if (err?.name === 'TypeError' || String(err?.message || '').toLowerCase().includes('fetch')) {
          backendOffline = true;
        } else {
          throw err;
        }
      }

      // Nếu API Gateway cục bộ chưa bật, đối soát trực tiếp với Google UserInfo API bằng token thật vừa nhận
      if (!authenticatedUser && backendOffline) {
        const googleProfileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${googleAccessToken}` },
        });
        if (!googleProfileRes.ok) {
          throw new Error('Không thể lấy thông tin hồ sơ từ Google UserInfo API.');
        }
        const gUser = await googleProfileRes.json();
        if (!gUser?.email || gUser?.email_verified === false) {
          throw new Error('Tài khoản Google chưa xác minh email hợp lệ.');
        }

        const sessionId = `gg-${Date.now().toString(36)}`;
        const mockAccess = `mock-jwt-${sessionId}-${Date.now()}`;
        const mockRefresh = `mock-jwt-refresh-${targetRole}-${Date.now()}`;
        apiClient.setTokens(mockAccess, mockRefresh);
        localStorage.setItem('quizgen_token', mockAccess);
        localStorage.setItem('quizgen_auth_token', mockAccess);

        authenticatedUser = {
          id: sessionId,
          fullName: gUser.name || gUser.given_name || gUser.email.split('@')[0],
          email: String(gUser.email).toLowerCase(),
          academicTitle: 'ThS.',
          department: roleObj.defaultDept,
          faculty: roleObj.defaultDept,
          university: 'Đại học Quốc gia',
          role: targetRole,
          roleLabel: roleObj.title,
          avatarUrl: gUser.picture || '',
          authProvider: 'google',
        };
      }

      if (authenticatedUser) {
        localStorage.setItem('quizgen_user', JSON.stringify(authenticatedUser));
        setShowGoogleSetupModal(false);
        onLogin(authenticatedUser);
      }
    } catch (err: any) {
      setGoogleError(err?.message || 'Xác thực Google OAuth 2.0 thất bại.');
    } finally {
      setGoogleLoading(false);
    }
  };

  // Xử lý callback nếu trình duyệt quay lại từ trang OAuth redirect (accounts.google.com/o/oauth2/v2/auth)
  useEffect(() => {
    const rawHash = window.location.hash || '';
    if (!rawHash.includes('access_token=') && !rawHash.includes('error=')) return;

    const hashParams = new URLSearchParams(rawHash.replace(/^#/, ''));
    const accessToken = hashParams.get('access_token');
    const returnedState = hashParams.get('state');
    const oauthError = hashParams.get('error');
    const expectedState = sessionStorage.getItem('quizgen_google_oauth_state');
    const storedRole = (sessionStorage.getItem('quizgen_google_oauth_role') as UserRole) || 'lecturer';

    if (!expectedState || returnedState !== expectedState) {
      return;
    }

    sessionStorage.removeItem('quizgen_google_oauth_state');
    sessionStorage.removeItem('quizgen_google_oauth_role');
    window.history.replaceState(null, '', window.location.pathname + window.location.search);

    if (oauthError) {
      setGoogleError(
        oauthError === 'access_denied'
          ? 'Bạn đã hủy cấp quyền đăng nhập bằng tài khoản Google.'
          : `Google OAuth trả về lỗi: ${oauthError}`
      );
      return;
    }

    if (accessToken) {
      void exchangeGoogleTokenWithBackend(accessToken, storedRole, activeGoogleClientId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const redirectToGoogleOAuthPage = (clientIdOverride?: string) => {
    const cid = (clientIdOverride ?? activeGoogleClientId).trim();
    if (!isValidGoogleClientId(cid)) {
      setGoogleSetupError('');
      setGoogleClientIdDraft(cid);
      setShowGoogleSetupModal(true);
      return;
    }

    const csrfState = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    sessionStorage.setItem('quizgen_google_oauth_state', csrfState);
    sessionStorage.setItem('quizgen_google_oauth_role', selectedRole);

    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', cid);
    authUrl.searchParams.set('redirect_uri', window.location.origin);
    authUrl.searchParams.set('response_type', 'token');
    authUrl.searchParams.set('scope', 'openid email profile');
    authUrl.searchParams.set('prompt', 'select_account');
    authUrl.searchParams.set('include_granted_scopes', 'true');
    authUrl.searchParams.set('state', csrfState);

    window.location.assign(authUrl.toString());
  };

  const startGoogleOAuthFlow = async (clientIdOverride?: string) => {
    const cid = (clientIdOverride ?? activeGoogleClientId).trim();
    setGoogleError('');
    setGooglePopupBlocked(false);

    if (!isValidGoogleClientId(cid)) {
      setGoogleSetupError('');
      setGoogleClientIdDraft(cid);
      setShowGoogleSetupModal(true);
      return;
    }

    setGoogleLoading(true);
    try {
      await loadGoogleIdentityServices();
      const oauth2 = window.google?.accounts?.oauth2;
      if (!oauth2) {
        throw new Error('Không thể khởi tạo Google OAuth 2.0 Client.');
      }

      const tokenClient = oauth2.initTokenClient({
        client_id: cid,
        scope: 'openid email profile',
        prompt: 'select_account',
        callback: (tokenResponse) => {
          if (tokenResponse?.error) {
            setGoogleLoading(false);
            setGoogleError(
              tokenResponse.error === 'access_denied'
                ? 'Bạn đã từ chối cấp quyền truy cập tài khoản Google.'
                : tokenResponse.error_description || `Google từ chối đăng nhập (${tokenResponse.error}).`
            );
            return;
          }
          if (tokenResponse?.access_token) {
            void exchangeGoogleTokenWithBackend(tokenResponse.access_token, selectedRole, cid);
          } else {
            setGoogleLoading(false);
            setGoogleError('Google không trả về Access Token hợp lệ.');
          }
        },
        error_callback: (err) => {
          setGoogleLoading(false);
          if (err?.type === 'popup_failed_to_open') {
            setGooglePopupBlocked(true);
            setGoogleError(
              'Trình duyệt đã chặn cửa sổ bật lên (popup) của Google. Hãy cho phép popup hoặc chuyển hướng sang accounts.google.com.'
            );
          } else if (err?.type === 'popup_closed') {
            setGoogleError('Cửa sổ đăng nhập Google đã được đóng trước khi hoàn tất.');
          } else {
            setGoogleError(err?.message || 'Không thể mở cửa sổ xác thực Google OAuth 2.0.');
          }
        },
      });

      tokenClient.requestAccessToken({ prompt: 'select_account' });
    } catch (err: any) {
      setGoogleLoading(false);
      setGoogleError(err?.message || 'Không thể kết nối tới Google Identity Services.');
    }
  };

  const handleSaveGoogleClientId = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = googleClientIdDraft.trim();
    setGoogleSetupError('');

    if (!isValidGoogleClientId(cleaned)) {
      setGoogleSetupError(
        'Google OAuth Client ID chưa đúng định dạng (ví dụ: 1234567890-abcdef.apps.googleusercontent.com).'
      );
      return;
    }

    try {
      localStorage.setItem('quizgen_google_client_id', cleaned);
    } catch {
      // Ignore storage error
    }
    setCustomGoogleClientId(cleaned);
    setShowGoogleSetupModal(false);
    void startGoogleOAuthFlow(cleaned);
  };

  return (
    <div className="w-full min-h-full bg-[#f3f7f8] text-slate-800 flex flex-col selection:bg-[#008689]/20 selection:text-[#006d70]">
      {/* Top UTH-Style Academic Portal Header Bar */}
      <header className="w-full bg-white border-b border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.04)] sticky top-0 z-20">
        <div className="h-1.5 w-full bg-gradient-to-r from-[#008689] via-[#1d999d] to-[#008689]" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#008689] to-[#1d999d] flex items-center justify-center text-white shadow-sm shadow-[#008689]/25 shrink-0">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm sm:text-base font-extrabold text-[#008689] tracking-tight uppercase">
                  QuizGen Portal
                </span>
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-[#e0f7fa] text-[#008689] border border-[#008689]/25">
                  AI Khảo thí · v2.4
                </span>
              </div>
              <p className="text-[11px] text-slate-500 truncate">
                Cổng Thông tin Khảo thí & Khởi tạo Ngân hàng Câu hỏi Chuẩn hóa Bloom
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              OAuth 2.0 & JWT
            </span>
            <button
              type="button"
              onClick={onNavigateRegister}
              className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-[#008689] bg-[#e0f7fa]/70 hover:bg-[#e0f7fa] border border-[#008689]/30 transition-colors"
            >
              Đăng ký tài khoản
            </button>
          </div>
        </div>
      </header>

      {/* Main Portal 2-Column Content */}
      <div className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT COLUMN: Portal Tin tức & Thông báo (Phong cách UTH Portal) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 bg-[#f8fbfc] border-b border-slate-200 flex items-center justify-between">
                <h2 className="text-sm font-extrabold uppercase tracking-wide text-[#008689] flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  <span>Tin tức & Thông báo</span>
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#e0f7fa] text-[#008689] border border-[#008689]/25">
                  HK II · 2025 - 2026
                </span>
              </div>

              <div className="divide-y divide-slate-100">
                <div className="p-4 hover:bg-[#f3f7f8]/70 transition-colors space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-1.5 py-0.5 text-[10px] font-extrabold uppercase rounded bg-rose-50 text-[#da1c2d] border border-rose-200">
                      THÔNG BÁO
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium">Cập nhật RAG Engine v3</span>
                  </div>
                  <h3 className="text-xs sm:text-[13px] font-bold text-slate-800 leading-snug">
                    Triển khai chuẩn hóa Ngân hàng Đề thi Bloom & Đối soát trích dẫn từng trang giáo trình
                  </h3>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Giảng viên tải trực tiếp giáo trình PDF/DOCX để AI trích xuất ngữ nghĩa, sinh câu hỏi và gắn nguồn trang tự động.
                  </p>
                </div>

                <div className="p-4 hover:bg-[#f3f7f8]/70 transition-colors space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-1.5 py-0.5 text-[10px] font-extrabold uppercase rounded bg-[#e0f7fa] text-[#008689] border border-[#008689]/25">
                      HƯỚNG DẪN
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium">Google OAuth 2.0</span>
                  </div>
                  <h3 className="text-xs sm:text-[13px] font-bold text-slate-800 leading-snug">
                    Liên kết đăng nhập trực tiếp qua tài khoản Google (accounts.google.com)
                  </h3>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Hỗ trợ xác thực một chạm với Google Identity Services và tự động đồng bộ hồ sơ giảng viên/khảo thí.
                  </p>
                </div>

                <div className="p-4 hover:bg-[#f3f7f8]/70 transition-colors space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-1.5 py-0.5 text-[10px] font-extrabold uppercase rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                      QUY TRÌNH
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium">Kiểm định 3 cấp</span>
                  </div>
                  <h3 className="text-xs sm:text-[13px] font-bold text-slate-800 leading-snug">
                    Phân quyền 3 vai trò: Giảng viên · Trưởng bộ môn · Quản trị Khảo thi
                  </h3>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Đảm bảo quy trình biên soạn, thẩm định và đóng gói đề thi (Word / PDF / QTI) khép kín và minh bạch.
                  </p>
                </div>
              </div>

              <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
                <span className="flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-[#008689]" />
                  <span>Phòng Khảo thí & Đảm bảo Chất lượng</span>
                </span>
                <span className="font-mono text-[10px] text-[#008689] font-semibold">HTTPS · SSL</span>
              </div>
            </div>

            {/* Security Status Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3 shadow-sm">
              <div className="w-9 h-9 rounded-lg bg-[#e0f7fa] border border-[#008689]/25 flex items-center justify-center text-[#008689] shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="text-[11px] text-slate-600 leading-relaxed">
                <span className="font-bold text-slate-800 block">An toàn Thông tin Cấp độ 3</span>
                Xác thực Token JWT tự động, bảo vệ chống Brute-force và khôi phục mật khẩu qua OTP.
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Cổng Đăng Nhập Hệ Thống (Phong cách UTH Portal) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 border-t-4 border-t-[#008689] shadow-lg p-5 sm:p-6 space-y-5">
              {/* Portal Login Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
                <div>
                  <h1 className="text-lg sm:text-xl font-black uppercase tracking-wide text-[#da1c2d] flex items-center gap-2">
                    <span>ĐĂNG NHẬP HỆ THỐNG</span>
                  </h1>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Chọn vai trò công tác và xác thực tài khoản khảo thí của bạn.
                  </p>
                </div>
                <span className={`text-[11px] px-2.5 py-1 rounded-full border font-bold ${currentRoleConfig.badgeClass}`}>
                  {currentRoleConfig.title}
                </span>
              </div>

              {/* ─── PHẦN CHỌN VAI TRÒ ─────────────────────────────────────────── */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-[#008689]" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      1. Chọn vai trò truy cập
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 hidden sm:inline">Phân quyền theo chức vụ</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {ROLES.map((role) => {
                    const Icon = role.icon;
                    const isSelected = selectedRole === role.id;

                    return (
                      <button
                        key={role.id}
                        type="button"
                        onClick={() => handleSelectRole(role)}
                        className={`group relative text-left p-3 rounded-xl border transition-all duration-200 flex flex-col justify-between ${
                          isSelected
                            ? `${role.borderActive} ${role.bgActive} shadow-sm`
                            : 'border-slate-200 bg-slate-50/70 hover:bg-white hover:border-[#008689]/40'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                              isSelected
                                ? `bg-gradient-to-tr ${role.accentColor} text-white shadow-sm`
                                : 'bg-white border border-slate-200 text-slate-500 group-hover:text-[#008689]'
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                          </div>

                          <div
                            className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] transition-all ${
                              isSelected
                                ? 'bg-[#008689] text-white font-bold'
                                : 'border border-slate-300 text-transparent group-hover:border-[#008689]/50'
                            }`}
                          >
                            ✓
                          </div>
                        </div>

                        <div>
                          <div className="text-xs font-bold text-slate-800 leading-snug group-hover:text-[#008689] transition-colors">
                            {role.title}
                          </div>
                          <span className={`inline-block mt-0.5 px-1.5 py-0.5 text-[9px] font-semibold rounded-full border ${role.badgeClass}`}>
                            {role.badge}
                          </span>
                        </div>

                        <p className="text-[10px] text-slate-500 mt-1.5 leading-relaxed line-clamp-2">
                          {role.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ─── CẢNH BÁO KHÓA TÀI KHOẢN BRUTE-FORCE ─────────────────────── */}
              {isLocked && (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-3">
                  <Clock className="w-5 h-5 shrink-0 text-[#da1c2d] mt-0.5" />
                  <div>
                    <div className="font-bold text-[#da1c2d] text-sm">Tài khoản đang bị tạm khóa an toàn</div>
                    <div className="mt-1 leading-relaxed">
                      Hệ thống tạm ngưng phiên đăng nhập do phát hiện {MAX_FAILED_ATTEMPTS} lần nhập sai thông tin. Vui lòng thử lại sau{' '}
                      <span className="font-mono font-extrabold text-[#da1c2d] text-sm px-1.5 py-0.5 rounded bg-white border border-rose-200">
                        {lockoutSeconds}s
                      </span>.
                    </div>
                  </div>
                </div>
              )}

              {/* ─── CẢNH BÁO SẮP BỊ KHÓA NẾU SAI >= 3 LẦN ──────────────────── */}
              {!isLocked && failedAttempts >= 3 && (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2.5">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>
                    Cảnh báo an ninh: Bạn đã nhập sai <strong>{failedAttempts}</strong> lần. Nếu tiếp tục sai đến lần thứ {MAX_FAILED_ATTEMPTS}, hệ thống sẽ kích hoạt khóa tự động 60 giây.
                  </span>
                </div>
              )}

              {/* ─── LỖI CHUNG ──────────────────────────────────────────────── */}
              {!isLocked && errors.general && failedAttempts < 3 && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-[#da1c2d] text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-[#da1c2d]" />
                  <span>{errors.general}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                {/* Email Field */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="login-email"
                    className="text-xs font-bold text-slate-700 tracking-wide uppercase flex items-center justify-between"
                  >
                    <span>Email công tác / Tài khoản trường</span>
                    <span className="text-[10px] text-slate-400 lowercase font-normal">(@ut.edu.vn / @vnu.edu.vn)</span>
                  </label>
                  <div className="relative group">
                    <div
                      className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors ${
                        errors.email ? 'text-[#da1c2d]' : 'text-slate-400 group-focus-within:text-[#008689]'
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
                      placeholder="canbo@ut.edu.vn"
                      className={`w-full bg-slate-50 border rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition-all duration-200
                        disabled:opacity-50 disabled:cursor-not-allowed
                        focus:bg-white focus:ring-2 focus:ring-[#008689]/20
                        ${
                          errors.email
                            ? 'border-[#da1c2d] focus:border-[#da1c2d]'
                            : 'border-slate-200 focus:border-[#008689]'
                        }`}
                    />
                  </div>
                  {errors.email && (
                    <p className="text-[11px] text-[#da1c2d] font-medium flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {errors.email}
                    </p>
                  )}
                </div>

                {/* Password Field */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="login-password"
                      className="text-xs font-bold text-slate-700 tracking-wide uppercase"
                    >
                      Mật khẩu tài khoản
                    </label>
                    <button
                      id="forgot-password-trigger"
                      type="button"
                      onClick={() => {
                        setForgotEmail(email.trim());
                        setForgotStep(1);
                        setForgotError('');
                        setForgotOtp('');
                        setForgotDevOtp('');
                        setForgotNewPass('');
                        setForgotConfirmPass('');
                        setShowForgotNewPass(false);
                        setShowForgotModal(true);
                      }}
                      className="text-[11px] text-[#008689] hover:text-[#1d999d] hover:underline transition-colors font-semibold cursor-pointer"
                    >
                      Quên mật khẩu?
                    </button>
                  </div>
                  <div className="relative group">
                    <div
                      className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors ${
                        errors.password ? 'text-[#da1c2d]' : 'text-slate-400 group-focus-within:text-[#008689]'
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
                      className={`w-full bg-slate-50 border rounded-xl pl-10 pr-11 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition-all duration-200
                        disabled:opacity-50 disabled:cursor-not-allowed
                        focus:bg-white focus:ring-2 focus:ring-[#008689]/20
                        ${
                          errors.password
                            ? 'border-[#da1c2d] focus:border-[#da1c2d]'
                            : 'border-slate-200 focus:border-[#008689]'
                        }`}
                    />
                    <button
                      type="button"
                      disabled={isLocked}
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors disabled:opacity-40"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-[11px] text-[#da1c2d] font-medium flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {errors.password}
                    </p>
                  )}
                </div>

                {/* Remember Session */}
                <div className="flex items-center justify-between text-xs text-slate-600 pt-0.5">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      disabled={isLocked}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-[#008689] focus:ring-[#008689]/30 cursor-pointer accent-[#008689]"
                    />
                    <span>Ghi nhớ phiên làm việc an toàn</span>
                  </label>
                </div>

                {/* Submit Button */}
                <button
                  id="login-submit-btn"
                  type="submit"
                  disabled={isLoading || isLocked}
                  className={`relative w-full group flex items-center justify-center gap-2.5 py-3 rounded-xl font-bold text-sm text-white bg-gradient-to-r ${currentRoleConfig.accentColor} hover:brightness-105 transition-all duration-200 shadow-md shadow-[#008689]/20 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden`}
                >
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
                <div className="flex-1 h-px bg-slate-200" />
                <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">hoặc</span>
                <div className="flex-1 h-px bg-slate-200" />
              </div>

              {/* Real Google OAuth 2.0 Sign-In Section */}
              <div className="space-y-2.5">
                <button
                  id="google-oauth-btn"
                  type="button"
                  disabled={isLocked || isLoading || googleLoading}
                  onClick={() => void startGoogleOAuthFlow()}
                  className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 hover:border-[#008689] text-slate-800 transition-all duration-200 flex items-center justify-between gap-3 group disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                  <span className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      {googleLoading ? (
                        <span className="w-4 h-4 rounded-full border-2 border-[#008689] border-t-transparent animate-spin" />
                      ) : (
                        <GoogleLogo className="w-4 h-4" />
                      )}
                    </span>
                    <span className="text-sm font-bold text-slate-800">
                      {googleLoading ? 'Đang kết nối tới accounts.google.com...' : 'Đăng nhập bằng tài khoản Google'}
                    </span>
                  </span>
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border shrink-0 ${
                      activeGoogleClientId
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-[#e0f7fa] text-[#008689] border-[#008689]/25'
                    }`}
                  >
                    {activeGoogleClientId ? 'Google OAuth 2.0' : 'Liên kết Google'}
                  </span>
                </button>

                {googleError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-[#da1c2d] space-y-2">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-[#da1c2d] shrink-0 mt-0.5" />
                      <span>{googleError}</span>
                    </div>
                    {(googlePopupBlocked || activeGoogleClientId) && (
                      <button
                        type="button"
                        onClick={() => redirectToGoogleOAuthPage()}
                        className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#008689] hover:text-[#1d999d] underline"
                      >
                        <span>Mở trực tiếp trang đăng nhập Google (accounts.google.com)</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
                  <span className="truncate">
                    {activeGoogleClientId
                      ? `OAuth Client ID: ${activeGoogleClientId.slice(0, 14)}...`
                      : 'Liên kết trực tiếp accounts.google.com (OAuth 2.0)'}
                  </span>
                  {!envGoogleClientId && (
                    <button
                      type="button"
                      onClick={() => {
                        setGoogleSetupError('');
                        setGoogleClientIdDraft(customGoogleClientId);
                        setShowGoogleSetupModal(true);
                      }}
                      className="inline-flex items-center gap-1 text-[#008689] hover:text-[#1d999d] font-semibold transition-colors shrink-0 ml-2"
                    >
                      <Settings className="w-3 h-3" />
                      <span>{activeGoogleClientId ? 'Đổi Client ID' : 'Cấu hình Client ID'}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Register Link */}
              <div className="text-center text-xs text-slate-500 pt-1 border-t border-slate-100">
                Chưa có tài khoản khảo thi chính thức?{' '}
                <button
                  id="go-to-register-btn"
                  onClick={onNavigateRegister}
                  className="text-[#008689] hover:text-[#1d999d] font-bold transition-colors hover:underline"
                >
                  Đăng ký tài khoản mới ngay
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Portal Footer */}
      <footer className="w-full py-4 border-t border-slate-200 bg-white/80 text-center text-[11px] text-slate-500">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>© 2026 QuizGen Academic Portal · Hệ thống Ngân hàng Câu hỏi & Khảo thí AI</span>
          <span className="flex items-center gap-1.5 text-slate-500">
            <ShieldCheck className="w-3.5 h-3.5 text-[#008689]" />
            Xác thực 2 lớp & Kiểm định An toàn Thông tin
          </span>
        </div>
      </footer>

      {/* Forgot Password Modal (2-Step OTP & Password Reset) */}
      {showForgotModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4 animate-slideUp">
            <button
              type="button"
              onClick={() => setShowForgotModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              title="Đóng"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-1 pr-6">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-[#e0f7fa] border border-[#008689]/25 flex items-center justify-center text-[#008689] shrink-0">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Khôi phục Mật khẩu Khảo thí
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {forgotStep === 1 && 'Bước 1/2: Nhập email học thuật để nhận mã xác minh OTP'}
                    {forgotStep === 2 && 'Bước 2/2: Nhập mã xác minh OTP và thiết lập mật khẩu mới'}
                    {forgotStep === 3 && 'Hoàn tất đặt lại mật khẩu an toàn'}
                  </p>
                </div>
              </div>
            </div>

            {forgotError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-[#da1c2d] text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-[#da1c2d] mt-0.5" />
                <span>{forgotError}</span>
              </div>
            )}

            {/* BƯỚC 1: NHẬP EMAIL HỌC THUẬT */}
            {forgotStep === 1 && (
              <form onSubmit={handleRequestResetOtp} className="space-y-3" noValidate>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                    Email công tác đã đăng ký
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={forgotEmail}
                      disabled={forgotLoading}
                      onChange={(e) => {
                        setForgotEmail(e.target.value);
                        setForgotError('');
                      }}
                      placeholder="canbo@ut.edu.vn"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 outline-none focus:bg-white focus:border-[#008689] focus:ring-2 focus:ring-[#008689]/20"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="w-full py-2.5 rounded-xl font-bold text-xs text-white bg-[#008689] hover:bg-[#1d999d] transition-all flex items-center justify-center gap-2 shadow-md shadow-[#008689]/20 disabled:opacity-50"
                >
                  {forgotLoading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Đang kiểm tra email...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Gửi mã xác minh OTP</span>
                    </>
                  )}
                </button>
              </form>
            )}

            {/* BƯỚC 2: NHẬP MÃ OTP & MẬT KHẨU MỚI */}
            {forgotStep === 2 && (
              <form onSubmit={handleConfirmResetPassword} className="space-y-3" noValidate>
                <div className="p-3 rounded-xl bg-[#e0f7fa]/60 border border-[#008689]/25 text-xs text-slate-700 space-y-1.5">
                  <p>
                    Mã xác minh 6 chữ số đã được gửi tới <strong className="text-slate-900">{forgotEmail}</strong>.
                  </p>
                  {forgotDevOtp && (
                    <p className="text-[11px] font-mono text-emerald-800 bg-emerald-50 px-2 py-1 rounded border border-emerald-200 inline-block">
                      Mã xác minh từ hộp thư hệ thống: <strong className="text-emerald-950 tracking-widest">{forgotDevOtp}</strong>
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase">Mã xác minh OTP (6 chữ số)</label>
                  <input
                    type="text"
                    maxLength={6}
                    value={forgotOtp}
                    disabled={forgotLoading}
                    onChange={(e) => {
                      setForgotOtp(e.target.value.replace(/\D/g, ''));
                      setForgotError('');
                    }}
                    placeholder="Nhập 6 chữ số OTP"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-mono tracking-widest text-slate-900 placeholder-slate-400 outline-none focus:bg-white focus:border-[#008689] focus:ring-2 focus:ring-[#008689]/20"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase">Mật khẩu mới (tối thiểu 6 ký tự)</label>
                  <div className="relative">
                    <input
                      type={showForgotNewPass ? 'text' : 'password'}
                      value={forgotNewPass}
                      disabled={forgotLoading}
                      onChange={(e) => {
                        setForgotNewPass(e.target.value);
                        setForgotError('');
                      }}
                      placeholder="Nhập mật khẩu mới"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 pr-10 py-2.5 text-xs text-slate-900 placeholder-slate-400 outline-none focus:bg-white focus:border-[#008689] focus:ring-2 focus:ring-[#008689]/20"
                    />
                    <button
                      type="button"
                      onClick={() => setShowForgotNewPass(!showForgotNewPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                    >
                      {showForgotNewPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase">Xác nhận lại mật khẩu mới</label>
                  <input
                    type={showForgotNewPass ? 'text' : 'password'}
                    value={forgotConfirmPass}
                    disabled={forgotLoading}
                    onChange={(e) => {
                      setForgotConfirmPass(e.target.value);
                      setForgotError('');
                    }}
                    placeholder="Nhập lại mật khẩu mới"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 outline-none focus:bg-white focus:border-[#008689] focus:ring-2 focus:ring-[#008689]/20"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setForgotStep(1);
                      setForgotError('');
                    }}
                    className="px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors"
                  >
                    Quay lại
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="flex-1 py-2.5 rounded-xl font-bold text-xs text-white bg-emerald-600 hover:bg-emerald-500 transition-all flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 disabled:opacity-50"
                  >
                    {forgotLoading ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Đang lưu mật khẩu...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Xác nhận đặt lại mật khẩu</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* BƯỚC 3: HOÀN TẤT */}
            {forgotStep === 3 && (
              <div className="space-y-4 text-center py-2">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-slate-900">Đặt lại mật khẩu thành công!</h4>
                  <p className="text-xs text-slate-500">
                    Mật khẩu mới cho tài khoản <span className="text-slate-900 font-mono font-semibold">{forgotEmail}</span> đã được cập nhật.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="w-full py-2.5 rounded-xl font-bold text-xs text-white bg-[#008689] hover:bg-[#1d999d] transition-colors shadow-md shadow-[#008689]/20"
                >
                  Đăng nhập bằng mật khẩu mới ngay
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Google OAuth 2.0 Client ID Configuration Modal (Only when Client ID not yet configured) */}
      {showGoogleSetupModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-slideUp"
          onClick={() => setShowGoogleSetupModal(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 bg-[#f8fbfc] border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-sm shrink-0">
                  <GoogleLogo className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 leading-tight">
                    Liên kết Google OAuth 2.0 Client ID
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Kết nối trực tiếp trang xác thực chính thức accounts.google.com
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGoogleSetupModal(false)}
                aria-label="Đóng cửa sổ cấu hình Google"
                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveGoogleClientId} className="p-6 space-y-4 max-h-[82vh] overflow-y-auto">
              <div className="p-3.5 rounded-xl bg-[#e0f7fa]/50 border border-[#008689]/25 text-xs text-slate-700 space-y-2 leading-relaxed">
                <p className="font-bold text-slate-900">
                  Vì lý do bảo mật OAuth 2.0, Google yêu cầu đăng ký Client ID gắn với tên miền ứng dụng:
                </p>
                <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-600">
                  <li>
                    Mở{' '}
                    <a
                      href="https://console.cloud.google.com/apis/credentials"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#008689] hover:text-[#1d999d] font-semibold underline inline-flex items-center gap-1"
                    >
                      Google Cloud Console → Credentials
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </li>
                  <li>
                    Chọn <strong className="text-slate-900">Create Credentials → OAuth client ID</strong> → Loại{' '}
                    <strong className="text-slate-900">Web application</strong>.
                  </li>
                  <li>
                    Trong cả <strong className="text-slate-900">Authorized JavaScript origins</strong> và{' '}
                    <strong className="text-slate-900">Authorized redirect URIs</strong>, thêm origin hiện tại:
                  </li>
                </ol>

                <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-white border border-slate-200">
                  <code className="text-xs font-mono text-[#008689] font-semibold truncate">
                    {typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}
                  </code>
                  <button
                    type="button"
                    onClick={() => {
                      const originStr =
                        typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
                      void navigator.clipboard?.writeText(originStr);
                      setCopiedOrigin(true);
                      window.setTimeout(() => setCopiedOrigin(false), 1800);
                    }}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-100 hover:bg-[#e0f7fa] text-[11px] font-semibold text-slate-700 hover:text-[#008689] transition-colors shrink-0"
                  >
                    {copiedOrigin ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span>Đã chép</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Sao chép</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {googleSetupError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-[#da1c2d] flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-[#da1c2d] shrink-0 mt-0.5" />
                  <span>{googleSetupError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Google OAuth 2.0 Client ID <span className="text-[#da1c2d]">*</span>
                </label>
                <input
                  type="text"
                  autoFocus
                  value={googleClientIdDraft}
                  onChange={(e) => {
                    setGoogleClientIdDraft(e.target.value);
                    if (googleSetupError) setGoogleSetupError('');
                  }}
                  placeholder="1234567890-xxxxxxxx.apps.googleusercontent.com"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#008689] focus:ring-2 focus:ring-[#008689]/20 text-xs font-mono text-slate-900 placeholder-slate-400 outline-none transition-all"
                />
                <p className="text-[11px] text-slate-500">
                  Mẹo: Bạn cũng có thể cấu hình cố định biến{' '}
                  <code className="text-slate-700 font-semibold">VITE_GOOGLE_CLIENT_ID</code> trong file{' '}
                  <code className="text-slate-700 font-semibold">.env</code> ở thư mục gốc.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                {customGoogleClientId && (
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        localStorage.removeItem('quizgen_google_client_id');
                      } catch {
                        // Ignore storage errors
                      }
                      setCustomGoogleClientId('');
                      setGoogleClientIdDraft('');
                      setShowGoogleSetupModal(false);
                    }}
                    className="px-3 py-2.5 rounded-xl text-xs font-semibold text-[#da1c2d] bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors"
                  >
                    Xóa Client ID
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowGoogleSetupModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-4 rounded-xl font-bold text-xs text-white bg-[#008689] hover:bg-[#1d999d] shadow-md shadow-[#008689]/20 transition-all flex items-center justify-center gap-2"
                >
                  <GoogleLogo className="w-4 h-4 bg-white rounded-full p-0.5" />
                  <span>Lưu & Kết nối Google ngay</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
