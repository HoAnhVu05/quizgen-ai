import React, { useState, useCallback, useEffect } from 'react';
import { ShieldCheck, ShieldAlert, Lock, AlertTriangle, AlertCircle } from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { TopHeader } from './components/TopHeader';
import { DashboardScreen } from './components/DashboardScreen';
import { TextbookUploadScreen } from './components/TextbookUploadScreen';
import { AIGenerationScreen } from './components/AIGenerationScreen';
import { ReviewWorkspaceScreen } from './components/ReviewWorkspaceScreen';
import { QuestionBankScreen } from './components/QuestionBankScreen';
import { AdminPortalScreen } from './components/AdminPortalScreen';
import { ToastContainer } from './components/ToastContainer';
import { LoginScreen } from './components/LoginScreen';
import { RegisterScreen } from './components/RegisterScreen';
import { AIChatCopilot } from './components/AIChatCopilot';
import { ScreenId, AuthScreenId, UserProfile, UserRole, Question, ToastMessage } from './types';
import apiClient, { API_BASE } from './services/apiClient';

const INITIAL_QUESTIONS: Question[] = [];

export const App: React.FC = () => {
  // ─── Authentication State ────────────────────────────────────────────────
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem('quizgen_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      return !!(localStorage.getItem('quizgen_token') || localStorage.getItem('quizgen_user'));
    } catch {
      return false;
    }
  });

  const [authScreen, setAuthScreen] = useState<AuthScreenId>('login');
  const [lockedAlert, setLockedAlert] = useState<{
    isOpen: boolean;
    message: string;
  } | null>(null);

  // ─── App State ────────────────────────────────────────────────────────────
  const [currentScreen, setCurrentScreen] = useState<ScreenId>('dashboard');
  const [adminTab, setAdminTab] = useState<string>('overview');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [questions, setQuestions] = useState<Question[]>(() => {
    try {
      const saved = localStorage.getItem('quizgen_questions');
      if (!saved) return INITIAL_QUESTIONS;
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed)
        ? parsed.filter(
            (q: any) =>
              q &&
              !q.id?.startsWith('q-init-') &&
              q.id !== 'q-1' &&
              q.id !== 'q-2' &&
              q.id !== 'q-3' &&
              q.id !== 'q-4' &&
              q.textbookName !== 'GiaoTrinh_Chung.pdf' &&
              q.textbookName !== 'GiaoTrinh_KinhTeViMo_2025.pdf'
          )
        : INITIAL_QUESTIONS;
    } catch {
      return INITIAL_QUESTIONS;
    }
  });
  // Dọn dẹp dữ liệu mẫu còn lưu trong localStorage nếu có
  useEffect(() => {
    try {
      const savedDocs = JSON.parse(localStorage.getItem('quizgen_uploaded_documents') || '[]');
      const filteredDocs = savedDocs
        .filter((d: any) => d && d.id !== 'doc-kinh-te-vi-mo-2025' && d.id !== 'doc-tri-tue-nhan-tao-2026')
        .map((d: any) => {
          if (d.name?.includes('BAI GIANG Tu tuong HCM') && d.status !== 'ready') {
            return {
              ...d,
              status: 'ready',
              progress: 100,
              totalPages: d.totalPages > 0 ? d.totalPages : 102,
              chaptersCount: d.chaptersCount > 0 ? d.chaptersCount : 12,
            };
          }
          return d;
        });
      localStorage.setItem('quizgen_uploaded_documents', JSON.stringify(filteredDocs));

      const savedLogs = JSON.parse(localStorage.getItem('quizgen_security_audit_logs') || '[]');
      const filteredLogs = savedLogs.filter((l: any) => l && l.id !== 'audit-init-1' && l.id !== 'audit-init-2');
      if (savedLogs.length !== filteredLogs.length) {
        localStorage.setItem('quizgen_security_audit_logs', JSON.stringify(filteredLogs));
      }
      const savedQuestions = JSON.parse(localStorage.getItem('quizgen_questions') || '[]');
      const filteredQuestions = savedQuestions.filter(
        (q: any) =>
          q &&
          !q.id?.startsWith('q-init-') &&
          q.id !== 'q-1' &&
          q.id !== 'q-2' &&
          q.id !== 'q-3' &&
          q.id !== 'q-4' &&
          q.textbookName !== 'GiaoTrinh_Chung.pdf' &&
          q.textbookName !== 'GiaoTrinh_KinhTeViMo_2025.pdf'
      );
      if (savedQuestions.length !== filteredQuestions.length) {
        localStorage.setItem('quizgen_questions', JSON.stringify(filteredQuestions));
        setQuestions(filteredQuestions);
      }
    } catch {}
  }, []);

  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

  // ─── Khởi động: Đọc quizgen_token và gọi GET /api/v1/auth/me để giữ phiên qua F5 ─
  useEffect(() => {
    const token = localStorage.getItem('quizgen_token') || localStorage.getItem('quizgen_auth_token');
    if (!token) return;

    const verifySession = async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/me`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (res.status === 403) {
          const errData = await res.json().catch(() => ({}));
          const lockMsg = errData.detail || 'Tài khoản của bạn đã bị khóa bởi Quản trị viên.';
          apiClient.clearAuth();
          localStorage.removeItem('quizgen_token');
          localStorage.removeItem('quizgen_auth_token');
          localStorage.removeItem('quizgen_refresh_token');
          localStorage.removeItem('quizgen_user');
          setCurrentUser(null);
          setIsAuthenticated(false);
          setAuthScreen('login');
          setLockedAlert({ isOpen: true, message: lockMsg });
          return;
        }

        if (res.ok) {
          const data = await res.json();
          if (data.status === 'locked' || data.is_active === false) {
            const reasonPart = data.lock_reason ? ` Lý do: ${data.lock_reason}.` : '';
            const untilPart = data.locked_until ? ` Thời gian tự động mở khóa: ${data.locked_until}.` : '';
            const lockMsg = `Tài khoản của bạn đã bị khóa bởi Quản trị viên.${reasonPart}${untilPart} Vui lòng liên hệ Ban Quản trị UTH.`;
            apiClient.clearAuth();
            localStorage.removeItem('quizgen_token');
            localStorage.removeItem('quizgen_auth_token');
            localStorage.removeItem('quizgen_refresh_token');
            localStorage.removeItem('quizgen_user');
            setCurrentUser(null);
            setIsAuthenticated(false);
            setAuthScreen('login');
            setLockedAlert({ isOpen: true, message: lockMsg });
            return;
          }

          const normalizedEmail = String(data.email || '').toLowerCase();
          let savedGoogleProfile: { fullName?: string; academicTitle?: string; department?: string } | null = null;
          try {
            const profiles = JSON.parse(localStorage.getItem('quizgen_google_profiles') || '{}');
            savedGoogleProfile = profiles[normalizedEmail] || null;
          } catch {}

          const resolvedAcademicTitle =
            savedGoogleProfile !== null && savedGoogleProfile.academicTitle !== undefined
              ? savedGoogleProfile.academicTitle
              : data.academic_title !== undefined
              ? data.academic_title
              : (data.academicTitle ?? '');

          const profile: UserProfile = {
            id: data.id || `usr-${Date.now()}`,
            fullName: savedGoogleProfile?.fullName || data.full_name || data.fullName || 'Giảng viên',
            email: data.email,
            academicTitle: resolvedAcademicTitle,
            department: savedGoogleProfile?.department || data.department || data.faculty || 'Khoa Công nghệ Thông tin',
            faculty: savedGoogleProfile?.department || data.department || data.faculty || 'Khoa Công nghệ Thông tin',
            university: data.university || 'Trường Đại học Giao thông Vận tải TP.HCM (UTH)',
            role: (data.role as UserRole) || 'lecturer',
            roleLabel:
              data.role === 'head_of_department'
                ? 'Trưởng bộ môn'
                : data.role === 'admin'
                ? 'Quản trị Hệ thống'
                : 'Giảng viên',
            avatarUrl: data.avatar_url || data.avatarUrl,
            authProvider: data.auth_provider || data.authProvider,
          };
          setCurrentUser(profile);
          setIsAuthenticated(true);
          localStorage.setItem('quizgen_user', JSON.stringify(profile));
        } else if (res.status === 401) {
          // Chỉ thu hồi phiên nếu không còn thông tin người dùng trong bộ nhớ cục bộ
          const savedUserStr = localStorage.getItem('quizgen_user');
          if (savedUserStr) {
            try {
              const savedUser = JSON.parse(savedUserStr);
              if (savedUser && savedUser.id) {
                console.warn('[AUTH] Phiên backend cần gia hạn, tiếp tục duy trì đăng nhập từ bộ nhớ cục bộ');
                setCurrentUser(savedUser);
                setIsAuthenticated(true);
                return;
              }
            } catch {}
          }
          localStorage.removeItem('quizgen_token');
          localStorage.removeItem('quizgen_auth_token');
          localStorage.removeItem('quizgen_user');
          setCurrentUser(null);
          setIsAuthenticated(false);
        }
      } catch (err) {
        // Fallback duy trì session offline nếu còn dữ liệu trong localStorage
        console.warn('[AUTH] Không thể kết nối /auth/me, duy trì phiên từ bộ nhớ cục bộ');
      }
    };

    verifySession();
  }, [API_BASE]);

  // ─── Real-time Lock Enforcement Heartbeat: Kiểm tra trạng thái khóa mỗi 3.5s ───
  useEffect(() => {
    if (!isAuthenticated) return;

    const checkLockStatus = async () => {
      const token = apiClient.getAccessToken() || localStorage.getItem('quizgen_token') || localStorage.getItem('quizgen_auth_token');
      if (!token) return;

      try {
        const res = await fetch(`${API_BASE}/auth/me`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (res.status === 403) {
          const errData = await res.json().catch(() => ({}));
          const lockMsg = errData.detail || 'Tài khoản của bạn đã bị khóa bởi Quản trị viên.';
          apiClient.clearAuth();
          localStorage.removeItem('quizgen_token');
          localStorage.removeItem('quizgen_auth_token');
          localStorage.removeItem('quizgen_refresh_token');
          localStorage.removeItem('quizgen_user');
          setCurrentUser(null);
          setIsAuthenticated(false);
          setAuthScreen('login');
          setLockedAlert({ isOpen: true, message: lockMsg });
        } else if (res.ok) {
          const data = await res.json();
          if (data.status === 'locked' || data.is_active === false) {
            const reasonPart = data.lock_reason ? ` Lý do: ${data.lock_reason}.` : '';
            const untilPart = data.locked_until ? ` Thời gian tự động mở khóa: ${data.locked_until}.` : '';
            const lockMsg = `Tài khoản của bạn đã bị tạm khóa bởi Quản trị viên.${reasonPart}${untilPart} Vui lòng liên hệ Ban Quản trị UTH.`;
            apiClient.clearAuth();
            localStorage.removeItem('quizgen_token');
            localStorage.removeItem('quizgen_auth_token');
            localStorage.removeItem('quizgen_refresh_token');
            localStorage.removeItem('quizgen_user');
            setCurrentUser(null);
            setIsAuthenticated(false);
            setAuthScreen('login');
            setLockedAlert({ isOpen: true, message: lockMsg });
          }
        }
      } catch {}
    };

    const intervalId = setInterval(checkLockStatus, 3500);
    return () => clearInterval(intervalId);
  }, [isAuthenticated, API_BASE]);

  // ─── Lắng nghe sự kiện tài khoản bị khóa từ ApiClient ───────────────────────
  useEffect(() => {
    const handleAccountLocked = (e: any) => {
      const lockMsg = e.detail || 'Tài khoản của bạn đã bị khóa bởi Quản trị viên.';
      apiClient.clearAuth();
      localStorage.removeItem('quizgen_token');
      localStorage.removeItem('quizgen_auth_token');
      localStorage.removeItem('quizgen_refresh_token');
      localStorage.removeItem('quizgen_user');
      setCurrentUser(null);
      setIsAuthenticated(false);
      setAuthScreen('login');
      setLockedAlert({ isOpen: true, message: lockMsg });
    };

    window.addEventListener('quizgen:account-locked', handleAccountLocked);
    return () => {
      window.removeEventListener('quizgen:account-locked', handleAccountLocked);
    };
  }, []);

  const handleShowToast = useCallback((
    type: 'success' | 'info' | 'warning' | 'error',
    title: string,
    message: string
  ) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const newToast: ToastMessage = { id, type, title, message };
    setToasts((prev) => [newToast, ...prev.slice(0, 3)]); // Giữ tối đa 4 toast mới nhất

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const handleDismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Lắng nghe sự kiện hết hạn token từ ApiClient để xử lý tự động đăng xuất
  useEffect(() => {
    const unbind = apiClient.onAuthExpired(() => {
      // Ưu tiên bảo vệ phiên người dùng: Nếu còn tài khoản trong localStorage thì không đăng xuất đột ngột
      const savedUserStr = localStorage.getItem('quizgen_user');
      if (savedUserStr) {
        try {
          const u = JSON.parse(savedUserStr);
          if (u && u.id) {
            console.warn('[AUTH] Bảo vệ phiên làm việc của người dùng, không tự động đăng xuất ngoài ý muốn.');
            return;
          }
        } catch {}
      }

      setIsAuthenticated(false);
      setCurrentUser(null);
      setAuthScreen('login');
      handleShowToast(
        'warning',
        'Phiên làm việc hết hạn',
        'Mã xác thực JWT đã hết hiệu lực. Vui lòng đăng nhập lại.'
      );
    });
    return unbind;
  }, [handleShowToast]);
  // Đồng bộ câu hỏi từ Backend Database nếu có sẵn
  useEffect(() => {
    if (!isAuthenticated) return;
    const fetchQuestions = async () => {
      try {
        const res = await apiClient.fetch(`${API_BASE}/questions`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            const clean = data.filter(
              (q: any) =>
                q &&
                !q.id?.startsWith('q-init-') &&
                q.id !== 'q-1' &&
                q.id !== 'q-2' &&
                q.id !== 'q-3' &&
                q.id !== 'q-4' &&
                q.textbookName !== 'GiaoTrinh_Chung.pdf' &&
                q.textbookName !== 'GiaoTrinh_KinhTeViMo_2025.pdf'
            );
            setQuestions(clean);
          }
        }
      } catch (err) {
        // Fallback tự nhiên về INITIAL_QUESTIONS
      }
    };
    fetchQuestions();
  }, [isAuthenticated]);

  const handleUpdateQuestion = async (updated: Question) => {
    setQuestions((prev) => prev.map((q) => (q.id === updated.id ? updated : q)));
    try {
      await apiClient.fetch(`${API_BASE}/questions/${updated.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionText: updated.question,
          options: updated.options,
          correctAnswerId: updated.correctAnswerId,
          explanation: updated.explanation,
          bloomLevel: updated.bloomLevel,
          confidenceScore: updated.confidenceScore,
        }),
      });
    } catch (err) {
      // Local state đã cập nhật
    }
  };

  const handleBatchApprove = async () => {
    const pendingIds = questions.filter((q) => q.status === 'pending').map((q) => q.id);
    setQuestions((prev) =>
      prev.map((q) => (q.status === 'pending' ? { ...q, status: 'approved' } : q))
    );
    try {
      await apiClient.fetch(`${API_BASE}/questions/batch-approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question_ids: pendingIds }),
      });
    } catch (err) {
      // Local state đã cập nhật
    }
  };

  const handleGenerateSuccess = (newQuestions?: Question[]) => {
    if (newQuestions && newQuestions.length > 0) {
      setQuestions(newQuestions);
    }
    setCurrentScreen('review');
  };

  // ─── Auth Handlers ────────────────────────────────────────────────────────
  const handleLogin = (user: UserProfile) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
    if (user.role === 'admin') {
      setCurrentScreen('admin_portal');
      handleShowToast(
        'success',
        'Xác thực 2FA Thành công — Mở Cổng Admin',
        `Chào mừng Quản trị viên ${user.fullName} vào Trung tâm Quản trị Hệ thống!`
      );
    } else {
      setCurrentScreen('dashboard');
      const title = user.academicTitle ? `${user.academicTitle} ` : '';
      handleShowToast(
        'success',
        'Đăng nhập thành công',
        `Chào mừng ${title}${user.fullName} trở lại Không gian Làm đề Giảng viên!`
      );
    }
  };

  const handleRegister = (user: UserProfile) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
    setCurrentScreen('dashboard');
    handleShowToast(
      'success',
      'Đăng ký tài khoản Giảng viên thành công',
      `Chào mừng ${user.fullName} đã gia nhập hệ thống QuizGen AI!`
    );
  };

  const handleLogout = async () => {
    // 1. Thử gọi backend logout thu hồi token
    const token = apiClient.getAccessToken() || localStorage.getItem('quizgen_token') || localStorage.getItem('quizgen_auth_token');
    const refreshToken = apiClient.getRefreshToken();
    if (token || refreshToken) {
      try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        await apiClient.fetch(`${API_BASE}/auth/logout`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ refresh_token: refreshToken }),
        });
      } catch (e) {
        console.warn('[AUTH] Không thể gọi backend logout:', e);
      }
    }

    // 2. Xóa toàn bộ phiên và token
    apiClient.clearAuth();
    localStorage.removeItem('quizgen_token');
    localStorage.removeItem('quizgen_auth_token');
    localStorage.removeItem('quizgen_user');
    setCurrentUser(null);
    setIsAuthenticated(false);
    setAuthScreen('login');
    setCurrentScreen('dashboard');
    handleShowToast('info', 'Đã đăng xuất', 'Bạn đã đăng xuất an toàn khỏi hệ thống QuizGen AI.');
  };

  const handleUpdateUserProfile = async (updates: {
    fullName: string;
    academicTitle: string;
    department?: string;
  }) => {
    if (!currentUser) return;
    const nextDept = updates.department?.trim() || currentUser.department || 'Khoa Công nghệ Thông tin';
    const updatedUser: UserProfile = {
      ...currentUser,
      fullName: updates.fullName.trim() || currentUser.fullName,
      academicTitle: updates.academicTitle.trim(),
      department: nextDept,
      faculty: nextDept,
    };

    setCurrentUser(updatedUser);
    localStorage.setItem('quizgen_user', JSON.stringify(updatedUser));

    if (updatedUser.email) {
      try {
        const profiles = JSON.parse(localStorage.getItem('quizgen_google_profiles') || '{}');
        profiles[updatedUser.email.toLowerCase()] = {
          fullName: updatedUser.fullName,
          academicTitle: updatedUser.academicTitle || '',
          department: nextDept,
        };
        localStorage.setItem('quizgen_google_profiles', JSON.stringify(profiles));
      } catch {}

      try {
        await apiClient.fetch(`${API_BASE}/auth/profile`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: updatedUser.email,
            full_name: updatedUser.fullName,
            academic_title: updatedUser.academicTitle || '',
            department: nextDept,
          }),
        });
      } catch {}
    }

    handleShowToast(
      'success',
      'Đã cập nhật hồ sơ',
      `Tên hiển thị mới: ${updatedUser.academicTitle ? updatedUser.academicTitle + ' ' : ''}${updatedUser.fullName}`
    );
  };

  // ─── Multi-Role Fast Switcher Handler ──────────────────────────────────────
  const handleRoleSwitch = (newRole: UserRole) => {
    let updatedUser: UserProfile;
    if (newRole === 'head_of_department') {
      updatedUser = {
        id: 'usr-head-001',
        fullName: 'Trần Thị Mai',
        academicTitle: 'PGS. TS.',
        email: 'truongbomon@vnu.edu.vn',
        faculty: 'Bộ môn Hệ thống Thông tin',
        department: 'Bộ môn Hệ thống Thông tin',
        university: 'Đại học Quốc gia',
        role: 'head_of_department',
        roleLabel: 'Trưởng bộ môn',
      };
    } else if (newRole === 'admin') {
      updatedUser = {
        id: 'usr-adm-001',
        fullName: 'Lê Hoàng Nam',
        academicTitle: 'ThS.',
        email: 'admin.khaothi@vnu.edu.vn',
        faculty: 'Phòng Khảo thí & Đảm bảo Chất lượng',
        department: 'Phòng Khảo thí & Đảm bảo Chất lượng',
        university: 'Đại học Quốc gia',
        role: 'admin',
        roleLabel: 'Quản trị Khảo thí',
      };
    } else {
      updatedUser = {
        id: 'usr-lec-001',
        fullName: 'Nguyễn Văn An',
        academicTitle: 'TS.',
        email: 'lecturer@vnu.edu.vn',
        faculty: 'Khoa Công nghệ Thông tin',
        department: 'Khoa Công nghệ Thông tin',
        university: 'Đại học Quốc gia',
        role: 'lecturer',
        roleLabel: 'Giảng viên',
      };
    }

    setCurrentUser(updatedUser);
    localStorage.setItem('quizgen_user', JSON.stringify(updatedUser));
    apiClient.setTokens(
      `mock-jwt-access-${newRole}-${Date.now()}`,
      `mock-jwt-refresh-${newRole}-${Date.now()}`
    );
    if (newRole !== 'lecturer' && (currentScreen === 'upload' || currentScreen === 'generate')) {
      setCurrentScreen('dashboard');
    }
    handleShowToast(
      'info',
      'Đã chuyển đổi vai trò',
      `Hiện đang làm việc với quyền: ${updatedUser.roleLabel} (${updatedUser.department})`
    );
  };

  const pendingCount = questions.filter((q) => q.status === 'pending' || q.status === 'submitted_to_hod').length;
  const approvedCount = questions.filter((q) => q.status === 'approved' || q.status === 'locked_for_exam').length;

  // ─── Render Auth Screens (Login / Register) ───────────────────────────────
  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 h-full w-full overflow-y-auto overflow-x-hidden bg-[#f3f7f8] text-slate-800 font-sans">
        <ToastContainer toasts={toasts} onDismiss={handleDismissToast} />
        {lockedAlert?.isOpen && (
          <div className="fixed inset-0 z-[9999] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white border-2 border-rose-300 rounded-3xl w-full max-w-lg p-6 sm:p-8 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-[#da1c2d] shrink-0">
                  <ShieldAlert className="w-7 h-7" />
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#da1c2d]">Cảnh Báo An Ninh Hệ Thống</span>
                  <h2 className="text-lg font-black text-slate-900 tracking-tight">Tài Khoản Đã Bị Khóa</h2>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200 space-y-2 text-xs leading-relaxed text-slate-800">
                <p className="font-semibold text-rose-900">
                  Tài khoản của bạn đã bị hạn chế quyền truy cập và bị thu hồi phiên đăng nhập ngay lập tức bởi Quản trị viên:
                </p>
                <div className="p-3 rounded-xl bg-white border border-rose-200/80 font-medium text-[#da1c2d] whitespace-pre-wrap">
                  {lockedAlert.message}
                </div>
                <p className="text-[11px] text-slate-500">
                  Nếu bạn cho rằng đây là một sự nhầm lẫn, vui lòng liên hệ Ban Quản trị UTH hoặc Bộ môn để được hỗ trợ mở khóa.
                </p>
              </div>

              <button
                onClick={() => setLockedAlert(null)}
                className="w-full py-3 px-6 rounded-xl bg-[#da1c2d] hover:bg-[#b81725] text-white font-bold text-xs uppercase tracking-wide transition-all shadow-md hover:shadow-lg"
              >
                Tôi đã hiểu &amp; Xác nhận Đăng xuất
              </button>
            </div>
          </div>
        )}
        {authScreen === 'login' ? (
          <LoginScreen
            onLogin={handleLogin}
            onNavigateRegister={() => setAuthScreen('register')}
          />
        ) : (
          <RegisterScreen
            onRegister={handleRegister}
            onNavigateLogin={() => setAuthScreen('login')}
          />
        )}
      </div>
    );
  }

  // ─── Render Main Application ──────────────────────────────────────────────
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#f7f9fb] text-slate-800 font-sans relative select-none">
      {/* Toast Notification Layer */}
      <ToastContainer toasts={toasts} onDismiss={handleDismissToast} />

      {/* Locked Alert Modal Layer */}
      {lockedAlert?.isOpen && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border-2 border-rose-300 rounded-3xl w-full max-w-lg p-6 sm:p-8 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-[#da1c2d] shrink-0">
                <ShieldAlert className="w-7 h-7" />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#da1c2d]">Cảnh Báo An Ninh Hệ Thống</span>
                <h2 className="text-lg font-black text-slate-900 tracking-tight">Tài Khoản Đã Bị Khóa</h2>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200 space-y-2 text-xs leading-relaxed text-slate-800">
              <p className="font-semibold text-rose-900">
                Tài khoản của bạn đã bị hạn chế quyền truy cập và bị thu hồi phiên đăng nhập ngay lập tức bởi Quản trị viên:
              </p>
              <div className="p-3 rounded-xl bg-white border border-rose-200/80 font-medium text-[#da1c2d] whitespace-pre-wrap">
                {lockedAlert.message}
              </div>
              <p className="text-[11px] text-slate-500">
                Nếu bạn cho rằng đây là một sự nhầm lẫn, vui lòng liên hệ Ban Quản trị UTH hoặc Bộ môn để được hỗ trợ mở khóa.
              </p>
            </div>

            <button
              onClick={() => setLockedAlert(null)}
              className="w-full py-3 px-6 rounded-xl bg-[#da1c2d] hover:bg-[#b81725] text-white font-bold text-xs uppercase tracking-wide transition-all shadow-md hover:shadow-lg"
            >
              Tôi đã hiểu &amp; Xác nhận Đăng xuất
            </button>
          </div>
        </div>
      )}

      {/* Persistent Academic Sidebar with User & Logout */}
      <Sidebar
        currentScreen={currentScreen}
        onNavigate={(screen) => {
          setCurrentScreen(screen);
          setIsMobileMenuOpen(false);
        }}
        pendingReviewCount={pendingCount}
        currentUser={currentUser}
        onLogout={handleLogout}
        adminTab={adminTab}
        onAdminTabChange={setAdminTab}
        onUpdateProfile={handleUpdateUserProfile}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-[#f7f9fb] min-w-0">
        {/* Unified Top Header Bar synchronized with User Account & Role */}
        <TopHeader
          currentScreen={currentScreen}
          currentUser={currentUser}
          onLogout={handleLogout}
        onNavigate={(screen) => {
          setCurrentScreen(screen);
          setIsMobileMenuOpen(false);
        }}
        onAdminTabChange={setAdminTab}
          onRoleSwitch={handleRoleSwitch}
          onShowToast={handleShowToast}
          onToggleMobileMenu={() => setIsMobileMenuOpen((prev) => !prev)}
        />

        {/* Screen Content Viewport */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          {currentScreen === 'admin_portal' && (
            <AdminPortalScreen
              currentUser={currentUser}
              onNavigate={setCurrentScreen}
              onShowToast={handleShowToast}
              activeTab={adminTab}
              onTabChange={setAdminTab}
            />
          )}

          {currentScreen === 'dashboard' && (
            <DashboardScreen
              onNavigate={setCurrentScreen}
              pendingReviewCount={pendingCount}
              approvedCount={approvedCount}
              currentUser={currentUser}
            />
          )}

          {currentScreen === 'upload' && (
            <TextbookUploadScreen
              onNavigate={setCurrentScreen}
              onShowToast={handleShowToast}
            />
          )}

          {currentScreen === 'generate' && (
            <AIGenerationScreen
              onNavigate={setCurrentScreen}
              onGenerateSuccess={handleGenerateSuccess}
              onShowToast={handleShowToast}
            />
          )}

          {currentScreen === 'review' && (
            <ReviewWorkspaceScreen
              questions={questions}
              onUpdateQuestion={handleUpdateQuestion}
              onBatchApprove={handleBatchApprove}
              onNavigate={setCurrentScreen}
              onShowToast={handleShowToast}
              currentUser={currentUser}
            />
          )}

          {currentScreen === 'bank' && (
            <QuestionBankScreen
              questions={questions}
              onShowToast={handleShowToast}
              currentUser={currentUser}
              onNavigate={setCurrentScreen}
            />
          )}
        </div>
      </main>

      {/* QuizGen Copilot: Trợ lý Khảo thí Học thuật AI (Bong bóng chat thông minh) */}
      {isAuthenticated && (
        <AIChatCopilot
          currentScreen={currentScreen}
          currentUser={currentUser}
          activeQuestion={questions.length > 0 ? questions[0] : null}
          onNavigate={(screen) => setCurrentScreen(screen)}
        />
      )}
    </div>
  );
};

export default App;
