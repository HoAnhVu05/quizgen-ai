import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { ShieldCheck, ShieldAlert, Lock, AlertTriangle, AlertCircle } from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { TopHeader } from './components/TopHeader';
import { DashboardScreen } from './components/DashboardScreen';
import { TextbookUploadScreen } from './components/TextbookUploadScreen';
import { QGroupScreen } from './components/QGroupScreen';
import { AIGenerationScreen } from './components/AIGenerationScreen';
import { ReviewWorkspaceScreen } from './components/ReviewWorkspaceScreen';
import { QuestionBankScreen } from './components/QuestionBankScreen';
import { AdminPortalScreen } from './components/AdminPortalScreen';
import { ForumScreen } from './components/ForumScreen';
import { ToastContainer } from './components/ToastContainer';
import { UserProfileModal } from './components/UserProfileModal';
import { LoginScreen } from './components/LoginScreen';
import { RegisterScreen } from './components/RegisterScreen';
import { PricingPlansModal } from './components/PricingPlansModal';
import { PaymentQRModal } from './components/PaymentQRModal';
import { AIChatCopilot } from './components/AIChatCopilot';
import { SupportCenterScreen } from './components/SupportCenterScreen';
import { ScreenId, AuthScreenId, UserProfile, UserRole, Question, QuestionStatus, ToastMessage, UserSubscriptionInfo, OrderData } from './types';
import apiClient, { API_BASE } from './services/apiClient';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { ThemeParticleOverlay } from './components/ThemeParticleOverlay';
import { ThemeLuckyMoneyModal } from './components/ThemeFestiveComponents';
import { ErrorBoundary } from './components/ErrorBoundary';

const INITIAL_QUESTIONS: Question[] = [];

// Thời gian chờ không hoạt động tối đa: 15 phút (Chuẩn an toàn OWASP & Ngân hàng học thuật)
const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000;

// Hàm kiểm tra và giải mã phiên đăng nhập ban đầu
const getInitialAuthSession = (): { user: UserProfile | null; isAuth: boolean; wasExpired: boolean } => {
  try {
    const now = Date.now();
    const isRemembered = localStorage.getItem('quizgen_remember_me') === 'true';

    // 1. Kiểm tra session từ sessionStorage (tab hiện tại đang làm việc)
    const sessionUserStr = sessionStorage.getItem('quizgen_user');
    const sessionToken = sessionStorage.getItem('quizgen_token') || sessionStorage.getItem('quizgen_auth_token');

    if (sessionUserStr && sessionToken) {
      const lastActiveStr = sessionStorage.getItem('quizgen_last_active');
      const lastActive = lastActiveStr ? parseInt(lastActiveStr, 10) : now;
      if (now - lastActive > INACTIVITY_TIMEOUT_MS) {
        sessionStorage.clear();
        return { user: null, isAuth: false, wasExpired: true };
      }
      sessionStorage.setItem('quizgen_last_active', now.toString());
      return { user: JSON.parse(sessionUserStr), isAuth: true, wasExpired: false };
    }

    // 2. Nếu không có trong sessionStorage:
    // TUYỆT ĐỐI CHỈ xem xét localStorage NẾU người dùng đã chủ động tích "Ghi nhớ đăng nhập" (quizgen_remember_me === 'true').
    // Nếu KHÔNG tích "Ghi nhớ đăng nhập", khi xóa tab và mở lại tab mới, sessionStorage sẽ trống -> bắt buộc đăng nhập lại!
    if (isRemembered) {
      const localUserStr = localStorage.getItem('quizgen_user');
      const localToken = localStorage.getItem('quizgen_token') || localStorage.getItem('quizgen_auth_token');

      if (localUserStr && localToken) {
        const lastActiveStr = localStorage.getItem('quizgen_last_active');
        const lastActive = lastActiveStr ? parseInt(lastActiveStr, 10) : now;
        if (now - lastActive > INACTIVITY_TIMEOUT_MS) {
          // Hết hạn do không thao tác > 15 phút
          localStorage.removeItem('quizgen_token');
          localStorage.removeItem('quizgen_auth_token');
          localStorage.removeItem('quizgen_user');
          localStorage.removeItem('quizgen_remember_me');
          localStorage.removeItem('quizgen_last_active');
          return { user: null, isAuth: false, wasExpired: true };
        }
        localStorage.setItem('quizgen_last_active', now.toString());
        sessionStorage.setItem('quizgen_last_active', now.toString());
        return { user: JSON.parse(localUserStr), isAuth: true, wasExpired: false };
      }
    }

    // Mặc định: Không có phiên hợp lệ (hoặc mở tab mới khi không chọn "Ghi nhớ đăng nhập")
    return { user: null, isAuth: false, wasExpired: false };
  } catch {
    return { user: null, isAuth: false, wasExpired: false };
  }
};

const AppContent: React.FC = () => {
  const { currentTheme, activeThemeId, showParticles, toggleParticles } = useTheme();
  
  // ─── Authentication State ────────────────────────────────────────────────
  const initialSession = useMemo(() => getInitialAuthSession(), []);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(initialSession.user);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(initialSession.isAuth);

  const [authScreen, setAuthScreen] = useState<AuthScreenId>('login');
  const [lockedAlert, setLockedAlert] = useState<{
    isOpen: boolean;
    message: string;
  } | null>(null);

  // ─── Payment & Subscription State ─────────────────────────────────────────
  const [subscriptionInfo, setSubscriptionInfo] = useState<UserSubscriptionInfo | null>(null);
  const [isPricingModalOpen, setIsPricingModalOpen] = useState<boolean>(false);
  const [activePaymentOrder, setActivePaymentOrder] = useState<OrderData | null>(null);

  const fetchSubscription = useCallback(async (userId?: string) => {
    const uid = userId || currentUser?.id;
    if (!uid) return;
    try {
      const res = await apiClient.fetch(`${API_BASE}/payment/subscription/my?user_id=${uid}`);
      if (res.ok) {
        const data = await res.json();
        setSubscriptionInfo(data);
      }
    } catch (err) {
      console.error('Lỗi tải thông tin gói cước:', err);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    if (currentUser?.id) {
      fetchSubscription(currentUser.id);
    }
  }, [currentUser?.id, fetchSubscription]);

  // ─── App State ────────────────────────────────────────────────────────────
  const [currentScreen, setCurrentScreen] = useState<ScreenId>(() => {
    try {
      const saved =
        sessionStorage.getItem('quizgen_active_screen') ||
        localStorage.getItem('quizgen_active_screen');
      const validScreens: ScreenId[] = [
        'dashboard',
        'review',
        'generate',
        'bank',
        'upload',
        'forum',
        'qgroup',
        'admin_portal',
      ];
      if (saved && validScreens.includes(saved as ScreenId)) {
        return saved as ScreenId;
      }
    } catch {}
    return 'dashboard';
  });

  const [adminTab, setAdminTab] = useState<string>(() => {
    try {
      return sessionStorage.getItem('quizgen_admin_tab') || 'overview';
    } catch {
      return 'overview';
    }
  });

  useEffect(() => {
    try {
      sessionStorage.setItem('quizgen_active_screen', currentScreen);
      localStorage.setItem('quizgen_active_screen', currentScreen);
    } catch {}
  }, [currentScreen]);

  useEffect(() => {
    try {
      sessionStorage.setItem('quizgen_admin_tab', adminTab);
    } catch {}
  }, [adminTab]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isLuckyMoneyOpen, setIsLuckyMoneyOpen] = useState(() => {
    try {
      return localStorage.getItem('quizgen_lucky_money_seen_2027') !== 'true';
    } catch {
      return false;
    }
  });
  const [questions, setQuestions] = useState<Question[]>(() => {
    try {
      // 1. Ưu tiên cao nhất: Câu hỏi vừa sinh đang ở Không gian Kiểm duyệt (tránh mất khi F5 / pull-to-refresh)
      const pendingStr = localStorage.getItem('quizgen_pending_review_questions');
      if (pendingStr) {
        const pending = JSON.parse(pendingStr);
        if (Array.isArray(pending) && pending.length > 0) {
          return pending;
        }
      }

      const saved = localStorage.getItem('quizgen_questions');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const filtered = parsed.filter(
            (q: any) =>
              q &&
              !q.id?.startsWith('q-init-') &&
              q.id !== 'q-1' &&
              q.id !== 'q-2' &&
              q.id !== 'q-3' &&
              q.id !== 'q-4' &&
              q.textbookName !== 'GiaoTrinh_Chung.pdf'
          );
          if (filtered.length > 0) return filtered;
        }
      }

      // Khôi phục từ Kho Đề Đã Sinh (quizgen_saved_exams) nếu có
      const savedExamsStr = localStorage.getItem('quizgen_saved_exams');
      if (savedExamsStr) {
        const exams = JSON.parse(savedExamsStr);
        if (Array.isArray(exams) && exams.length > 0) {
          const map = new Map<string, Question>();
          exams.forEach((ex: any) => {
            if (Array.isArray(ex.questions)) {
              ex.questions.forEach((q: any) => {
                if (q && q.id) map.set(q.id, q);
              });
            }
          });
          if (map.size > 0) {
            const recovered = Array.from(map.values());
            try {
              localStorage.setItem('quizgen_questions', JSON.stringify(recovered));
            } catch {}
            return recovered;
          }
        }
      }

      // Khôi phục từ Lịch sử sinh AI (quizgen_generation_history) nếu có
      const savedHistStr = localStorage.getItem('quizgen_generation_history');
      if (savedHistStr) {
        const hist = JSON.parse(savedHistStr);
        if (Array.isArray(hist) && hist.length > 0) {
          const map = new Map<string, Question>();
          hist.forEach((h: any) => {
            if (Array.isArray(h.questions)) {
              h.questions.forEach((q: any) => {
                if (q && q.id) map.set(q.id, q);
              });
            }
          });
          if (map.size > 0) {
            const recovered = Array.from(map.values());
            try {
              localStorage.setItem('quizgen_questions', JSON.stringify(recovered));
            } catch {}
            return recovered;
          }
        }
      }
    } catch {
      return INITIAL_QUESTIONS;
    }
    return INITIAL_QUESTIONS;
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
          q.textbookName !== 'GiaoTrinh_Chung.pdf'
      );
      if (savedQuestions.length !== filteredQuestions.length) {
        localStorage.setItem('quizgen_questions', JSON.stringify(filteredQuestions));
        setQuestions(filteredQuestions);
      }
    } catch {}
  }, []);

  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || '/api/v1';

  // ─── Khởi động: Đọc token và gọi GET /api/v1/auth/me để giữ phiên qua F5 ─
  useEffect(() => {
    const token =
      sessionStorage.getItem('quizgen_token') ||
      sessionStorage.getItem('quizgen_auth_token') ||
      localStorage.getItem('quizgen_token') ||
      localStorage.getItem('quizgen_auth_token');
    if (!token) return;
    apiClient.setTokens(token);

    const verifySession = async () => {
      const savedUserStr = sessionStorage.getItem('quizgen_user') || localStorage.getItem('quizgen_user');
      let currentSavedEmail = '';
      let currentSavedId = '';
      if (savedUserStr) {
        try {
          const parsed = JSON.parse(savedUserStr);
          currentSavedEmail = parsed.email || '';
          currentSavedId = parsed.id || '';
        } catch {}
      }

      try {
        const res = await fetch(`${API_BASE}/auth/me`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            'X-User-Email': currentSavedEmail,
            'X-User-Id': currentSavedId,
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
          sessionStorage.removeItem('quizgen_token');
          sessionStorage.removeItem('quizgen_auth_token');
          sessionStorage.removeItem('quizgen_user');
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
            sessionStorage.removeItem('quizgen_token');
            sessionStorage.removeItem('quizgen_auth_token');
            sessionStorage.removeItem('quizgen_user');
            setCurrentUser(null);
            setIsAuthenticated(false);
            setAuthScreen('login');
            setLockedAlert({ isOpen: true, message: lockMsg });
            return;
          }

          // Bảo vệ tài khoản: Nếu máy chủ trả về tài khoản mẫu/fallback nhưng trên máy đang có email thật, không ghi đè
          if (data.email === 'lecturer@quizgen.ai' && currentSavedEmail && currentSavedEmail !== 'lecturer@quizgen.ai') {
            console.warn('[AUTH] Bỏ qua fallback guest để bảo toàn tài khoản người dùng thực tế:', currentSavedEmail);
            return;
          }

          // Lấy dữ liệu hồ sơ chuẩn trực tiếp từ cơ sở dữ liệu auth.db của hệ thống
          const resolvedAcademicTitle = data.academic_title || data.academicTitle || '';

          const profile: UserProfile = {
            id: data.id || `usr-${Date.now()}`,
            fullName: data.full_name || data.fullName || 'Giảng viên',
            email: data.email,
            academicTitle: resolvedAcademicTitle,
            department: data.department || data.faculty || 'Khoa Công nghệ Thông tin',
            faculty: data.department || data.faculty || 'Khoa Công nghệ Thông tin',
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
          const isRemembered = localStorage.getItem('quizgen_remember_me') === 'true';
          if (isRemembered) {
            localStorage.setItem('quizgen_user', JSON.stringify(profile));
          } else {
            sessionStorage.setItem('quizgen_user', JSON.stringify(profile));
          }
        } else if (res.status === 401) {
          // Chỉ dọn dẹp phiên nếu thực sự không có thông tin người dùng trong storage
          if (savedUserStr) {
            try {
              const savedUser = JSON.parse(savedUserStr);
              // Bảo lưu phiên cho người dùng, không đá văng ra login khi kéo tải lại trang trên di động
              setCurrentUser(savedUser);
              setIsAuthenticated(true);
              console.warn('[AUTH] Token máy chủ chưa đồng bộ, bảo lưu phiên đăng nhập hiện tại trên thiết bị.');
              return;
            } catch (e) {}
          }
          localStorage.removeItem('quizgen_token');
          localStorage.removeItem('quizgen_auth_token');
          localStorage.removeItem('quizgen_user');
          sessionStorage.removeItem('quizgen_token');
          sessionStorage.removeItem('quizgen_auth_token');
          sessionStorage.removeItem('quizgen_user');
          setCurrentUser(null);
          setIsAuthenticated(false);
        }
      } catch (err) {
        console.warn('[AUTH] Kiểm tra phiên qua /auth/me thất bại (mạng/tunnel):', err);
        // Khi mạng chập chờn hoặc reload qua Cloudflare Tunnel, vẫn giữ phiên từ storage
        if (savedUserStr) {
          try {
            const savedUser = JSON.parse(savedUserStr);
            setCurrentUser(savedUser);
            setIsAuthenticated(true);
          } catch (e) {}
        }
      }
    };

    verifySession();
  }, [API_BASE]);

  // ─── Real-time Lock Enforcement Heartbeat: Kiểm tra trạng thái khóa mỗi 3.5s ───
  useEffect(() => {
    if (!isAuthenticated) return;

    const checkLockStatus = async () => {
      const token =
        sessionStorage.getItem('quizgen_token') ||
        sessionStorage.getItem('quizgen_auth_token') ||
        localStorage.getItem('quizgen_token') ||
        localStorage.getItem('quizgen_auth_token') ||
        apiClient.getAccessToken();
      if (!token) return;

      try {
        const res = await fetch(`${API_BASE}/auth/me`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            'X-User-Email': currentUser?.email || '',
            'X-User-Id': currentUser?.id || '',
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
          } else if (data.email !== 'lecturer@quizgen.ai' && data.role && currentUser && data.role !== currentUser.role) {
            const newRole = data.role as UserRole;
            const updatedUser: UserProfile = {
              ...currentUser,
              role: newRole,
              roleLabel:
                newRole === 'head_of_department'
                  ? 'Trưởng bộ môn'
                  : newRole === 'admin'
                  ? 'Quản trị Hệ thống'
                  : 'Giảng viên',
            };
            setCurrentUser(updatedUser);
            localStorage.setItem('quizgen_user', JSON.stringify(updatedUser));
            if (newRole !== 'admin' && currentScreen === 'admin_portal') {
              setCurrentScreen('dashboard');
              handleShowToast(
                'info',
                'Thay đổi phân quyền',
                `Vai trò của bạn đã được chuyển sang: ${updatedUser.roleLabel}.`
              );
            } else if (newRole === 'admin' && currentScreen !== 'admin_portal') {
              setCurrentScreen('admin_portal');
              handleShowToast(
                'info',
                'Cấp quyền Quản trị viên',
                'Tài khoản của bạn đã được nâng cấp lên Quản trị viên (Admin).'
              );
            }
          }
        }
      } catch {}
    };

    const intervalId = setInterval(checkLockStatus, 3500);
    return () => clearInterval(intervalId);
  }, [isAuthenticated, API_BASE, currentUser, currentScreen]);

  // ─── Real-time Multi-Tab Role Synchronization Listener ─────────────────────
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'quizgen_role_sync' && e.newValue) {
        try {
          const syncData = JSON.parse(e.newValue);
          if (
            currentUser &&
            (syncData.userId === currentUser.id ||
             (syncData.email && syncData.email.toLowerCase() === currentUser.email.toLowerCase()))
          ) {
            const newRole = syncData.newRole as UserRole;
            const updatedUser: UserProfile = {
              ...currentUser,
              role: newRole,
              roleLabel:
                newRole === 'head_of_department'
                  ? 'Trưởng bộ môn'
                  : newRole === 'admin'
                  ? 'Quản trị Hệ thống'
                  : 'Giảng viên',
            };
            setCurrentUser(updatedUser);
            localStorage.setItem('quizgen_user', JSON.stringify(updatedUser));
            if (newRole !== 'admin' && currentScreen === 'admin_portal') {
              setCurrentScreen('dashboard');
              handleShowToast(
                'info',
                'Thay đổi phân quyền',
                `Vai trò của bạn đã được cập nhật thành: ${updatedUser.roleLabel}.`
              );
            } else if (newRole === 'admin' && currentScreen !== 'admin_portal') {
              setCurrentScreen('admin_portal');
              handleShowToast(
                'info',
                'Cấp quyền Quản trị viên',
                'Tài khoản của bạn đã được nâng lên Quản trị viên (Admin).'
              );
            }
          }
        } catch {}
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [currentUser, currentScreen]);

  // ─── Security Guard: Non-admin users cannot stay on admin_portal ───────────
  useEffect(() => {
    if (isAuthenticated && currentUser && currentUser.role !== 'admin' && currentScreen === 'admin_portal') {
      setCurrentScreen('dashboard');
    }
  }, [isAuthenticated, currentUser?.role, currentScreen]);

  // ─── Lắng nghe sự kiện tài khoản bị khóa / xóa từ ApiClient ───────────────────────
  useEffect(() => {
    const handleAccountLocked = (e: any) => {
      const lockMsg = e.detail || 'Tài khoản của bạn đã bị khóa bởi Quản trị viên.';
      apiClient.clearAuth();
      setCurrentUser(null);
      setIsAuthenticated(false);
      setAuthScreen('login');
      setLockedAlert({ isOpen: true, message: lockMsg });
    };

    const handleAuthRevoked = (e: any) => {
      const msg = e?.detail || 'Phiên làm việc đã bị thu hồi do tài khoản không còn tồn tại trên hệ thống.';
      apiClient.clearAuth();
      setCurrentUser(null);
      setIsAuthenticated(false);
      setAuthScreen('login');
      handleShowToast('error', 'Phiên Đăng Nhập Đã Bị Thu Hồi', msg);
    };

    window.addEventListener('quizgen:account-locked', handleAccountLocked);
    window.addEventListener('quizgen:auth-revoked', handleAuthRevoked);
    window.addEventListener('quizgen:auth-expired', handleAuthRevoked);

    return () => {
      window.removeEventListener('quizgen:account-locked', handleAccountLocked);
      window.removeEventListener('quizgen:auth-revoked', handleAuthRevoked);
      window.removeEventListener('quizgen:auth-expired', handleAuthRevoked);
    };
  }, []);

  // ─── Heartbeat kiểm tra tính hợp lệ của tài khoản định kỳ (30s) ─────────────
  useEffect(() => {
    if (!isAuthenticated || !currentUser) return;

    const checkSessionAlive = async () => {
      try {
        const res = await apiClient.fetch('/api/v1/auth/me');
        if (res.status === 403) {
          apiClient.notifyAuthRevoked('Tài khoản đã bị tạm khóa bởi Quản trị viên.');
        } else if (res.status === 401) {
          const data = await res.json().catch(() => ({}));
          const detail = String(data?.detail || '');
          if (
            (detail.includes('ACCOUNT_REVOKED') || detail.includes('đã bị xóa') || detail.includes('không còn tồn tại')) &&
            !detail.includes('Chưa xác thực')
          ) {
            apiClient.notifyAuthRevoked(detail || 'Tài khoản đã bị xóa hoặc bị khóa bởi Quản trị viên.');
          }
        }
      } catch {}
    };

    const timer = setInterval(checkSessionAlive, 30000);
    return () => clearInterval(timer);
  }, [isAuthenticated, currentUser?.id]);

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

  // Thông báo nếu phiên trước đó đã hết hạn khi mở trang
  useEffect(() => {
    if (initialSession.wasExpired) {
      handleShowToast(
        'warning',
        'Phiên làm việc đã hết hạn',
        'Hệ thống đã tự động kết thúc phiên do không có thao tác trong 15 phút nhằm bảo vệ an toàn dữ liệu khảo thí.'
      );
    }
  }, [initialSession.wasExpired, handleShowToast]);

  // ─── Cơ chế Tự Động Đăng Xuất Khi Không Hoạt Động (Inactivity Timeout 15 Phút) ────
  useEffect(() => {
    if (!isAuthenticated) return;

    let lastInteraction = Date.now();

    const recordActivity = () => {
      const now = Date.now();
      // Throttle ghi nhận hoạt động mỗi 5 giây
      if (now - lastInteraction > 5000) {
        lastInteraction = now;
        sessionStorage.setItem('quizgen_last_active', now.toString());
        if (localStorage.getItem('quizgen_remember_me') === 'true') {
          localStorage.setItem('quizgen_last_active', now.toString());
        }
      }
    };

    const events = ['mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
    events.forEach((evt) => window.addEventListener(evt, recordActivity, { passive: true }));

    // Kiểm tra định kỳ mỗi 10 giây xem có vượt quá 15 phút không thao tác
    const idleCheckInterval = setInterval(() => {
      const now = Date.now();
      const lastActiveStr =
        sessionStorage.getItem('quizgen_last_active') ||
        localStorage.getItem('quizgen_last_active');
      const lastActive = lastActiveStr ? parseInt(lastActiveStr, 10) : lastInteraction;

      if (now - lastActive > INACTIVITY_TIMEOUT_MS) {
        // Tự động thu hồi phiên
        apiClient.clearAuth();
        localStorage.removeItem('quizgen_token');
        localStorage.removeItem('quizgen_auth_token');
        localStorage.removeItem('quizgen_user');
        localStorage.removeItem('quizgen_remember_me');
        localStorage.removeItem('quizgen_last_active');
        sessionStorage.removeItem('quizgen_token');
        sessionStorage.removeItem('quizgen_auth_token');
        sessionStorage.removeItem('quizgen_user');
        sessionStorage.removeItem('quizgen_last_active');

        setCurrentUser(null);
        setIsAuthenticated(false);
        setAuthScreen('login');

        handleShowToast(
          'warning',
          'Phiên làm việc đã hết hạn',
          'Hệ thống đã tự động đăng xuất do Thầy/Cô không thao tác trong 15 phút để bảo đảm an toàn dữ liệu khảo thí.'
        );
      }
    }, 10000);

    return () => {
      events.forEach((evt) => window.removeEventListener(evt, recordActivity));
      clearInterval(idleCheckInterval);
    };
  }, [isAuthenticated, handleShowToast]);

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
  // Đồng bộ câu hỏi từ Backend Database nếu có sẵn (và bảo toàn câu hỏi đang kiểm duyệt)
  useEffect(() => {
    if (!isAuthenticated) return;
    const fetchQuestions = async () => {
      try {
        // Nếu người dùng đang ở bước Kiểm duyệt và có câu hỏi vừa sinh, bảo lưu tuyệt đối không đè rỗng
        const pendingStr = localStorage.getItem('quizgen_pending_review_questions');
        if (pendingStr) {
          const pending = JSON.parse(pendingStr);
          if (Array.isArray(pending) && pending.length > 0) {
            setQuestions(pending);
            return;
          }
        }

        const res = await apiClient.fetch(`${API_BASE}/questions`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
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
            if (clean.length > 0) {
              setQuestions(clean);
              try {
                localStorage.setItem('quizgen_questions', JSON.stringify(clean));
              } catch {}
            }
          }
        }
      } catch (err) {
        // Fallback tự nhiên về INITIAL_QUESTIONS
      }
    };
    fetchQuestions();
  }, [isAuthenticated]);

  const handleUpdateQuestion = async (updated: Question) => {
    setQuestions((prev) => {
      const next = prev.map((q) => (q.id === updated.id ? updated : q));
      try {
        localStorage.setItem('quizgen_questions', JSON.stringify(next));
        localStorage.setItem('quizgen_pending_review_questions', JSON.stringify(next));
      } catch {}
      return next;
    });
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
    setQuestions((prev) => {
      const next = prev.map((q) => (q.status === 'pending' ? { ...q, status: 'approved' as QuestionStatus } : q));
      try {
        localStorage.setItem('quizgen_questions', JSON.stringify(next));
        localStorage.setItem('quizgen_pending_review_questions', JSON.stringify(next));
      } catch {}
      return next;
    });
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
      try {
        localStorage.setItem('quizgen_questions', JSON.stringify(newQuestions));
        localStorage.setItem('quizgen_pending_review_questions', JSON.stringify(newQuestions));
      } catch {}
    }
    setCurrentScreen('review');
    try {
      localStorage.setItem('quizgen_active_screen', 'review');
      sessionStorage.setItem('quizgen_active_screen', 'review');
    } catch {}
  };

  // ─── Auth Handlers ────────────────────────────────────────────────────────
  const handleLogin = (user: UserProfile) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
    const savedScreen =
      sessionStorage.getItem('quizgen_active_screen') ||
      localStorage.getItem('quizgen_active_screen');
    const validScreens: ScreenId[] = [
      'dashboard',
      'review',
      'generate',
      'bank',
      'upload',
      'forum',
      'qgroup',
      'admin_portal',
    ];

    if (user.role === 'admin') {
      setCurrentScreen(
        savedScreen && validScreens.includes(savedScreen as ScreenId)
          ? (savedScreen as ScreenId)
          : 'admin_portal'
      );
      handleShowToast(
        'success',
        'Xác thực 2FA Thành công — Mở Cổng Admin',
        `Chào mừng Quản trị viên ${user.fullName} vào Trung tâm Quản trị Hệ thống!`
      );
    } else {
      setCurrentScreen(
        savedScreen &&
          validScreens.includes(savedScreen as ScreenId) &&
          savedScreen !== 'admin_portal'
          ? (savedScreen as ScreenId)
          : 'dashboard'
      );
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
    localStorage.removeItem('quizgen_remember_me');
    localStorage.removeItem('quizgen_active_screen');
    localStorage.removeItem('qgroup_selected_group_id');
    sessionStorage.removeItem('quizgen_token');
    sessionStorage.removeItem('quizgen_auth_token');
    sessionStorage.removeItem('quizgen_user');
    sessionStorage.removeItem('quizgen_active_screen');
    sessionStorage.removeItem('qgroup_selected_group_id');
    setCurrentUser(null);
    setIsAuthenticated(false);
    setAuthScreen('login');
    setCurrentScreen('dashboard');
    handleShowToast('info', 'Đã đăng xuất', 'Bạn đã đăng xuất an toàn khỏi hệ thống QuizGen AI.');
  };

  const handleUpdateUserProfile = async (updates: Partial<UserProfile>) => {
    if (!currentUser) return;
    const nextDept = (updates.department || currentUser.department || '').trim();
    const nextFaculty = (updates.faculty || currentUser.faculty || '').trim();
    const nextUniv = (updates.university || currentUser.university || '').trim();
    const updatedUser: UserProfile = {
      ...currentUser,
      ...updates,
      fullName: (updates.fullName || currentUser.fullName || '').trim(),
      academicTitle: (updates.academicTitle !== undefined ? updates.academicTitle : currentUser.academicTitle || '').trim(),
      department: nextDept,
      faculty: nextFaculty,
      university: nextUniv,
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
          faculty: nextFaculty,
          university: nextUniv,
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
    if (newRole !== 'admin' && currentScreen === 'admin_portal') {
      setCurrentScreen('dashboard');
    } else if (newRole === 'admin' && currentScreen !== 'admin_portal') {
      setCurrentScreen('admin_portal');
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
        {/* Seasonal Particle Ambient Effect */}
        <ThemeParticleOverlay
          themeId={activeThemeId}
          particleType={currentTheme.particleType}
          showParticles={showParticles}
          onToggleParticles={toggleParticles}
        />
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
    <div className="flex h-screen h-[100dvh] max-h-[100dvh] w-full max-w-full overflow-hidden fixed inset-0 bg-[#f7f9fb] text-slate-800 font-sans relative select-none">
      {/* Seasonal Particle Ambient Effect */}
      <ThemeParticleOverlay
        themeId={activeThemeId}
        particleType={currentTheme.particleType}
        showParticles={showParticles}
        onToggleParticles={toggleParticles}
      />

      {/* Toast Notification Layer */}
      <ToastContainer toasts={toasts} onDismiss={handleDismissToast} />

      {/* User Profile & Academic Info Settings Modal */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        currentUser={currentUser}
        onUpdateProfile={handleUpdateUserProfile}
        onShowToast={handleShowToast}
      />

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
        onOpenPricingModal={() => setIsPricingModalOpen(true)}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
        onOpenProfileModal={() => setIsProfileModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-[#f7f9fb] min-w-0">
        {/* Unified Top Header Bar synchronized with User Account & Role */}
        <TopHeader
          currentScreen={currentScreen}
          currentUser={currentUser}
          subscriptionInfo={subscriptionInfo}
          onOpenPricingModal={() => setIsPricingModalOpen(true)}
          onLogout={handleLogout}
          onNavigate={(screen) => {
            setCurrentScreen(screen);
            setIsMobileMenuOpen(false);
          }}
          onAdminTabChange={setAdminTab}
          onRoleSwitch={handleRoleSwitch}
          onShowToast={handleShowToast}
          onToggleMobileMenu={() => setIsMobileMenuOpen((prev) => !prev)}
          onOpenProfileModal={() => setIsProfileModalOpen(true)}
        />

        {/* Screen Content Viewport */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          <ErrorBoundary>
            {currentScreen === 'admin_portal' && (
              <AdminPortalScreen
                currentUser={currentUser}
                onNavigate={setCurrentScreen}
                onShowToast={handleShowToast}
                activeTab={adminTab}
                onTabChange={setAdminTab}
                onCurrentUserChange={setCurrentUser}
              />
            )}

            {currentScreen === 'dashboard' && (
              <DashboardScreen
                onNavigate={setCurrentScreen}
                pendingReviewCount={pendingCount}
                approvedCount={approvedCount}
                currentUser={currentUser}
                questions={questions}
              />
            )}

            {currentScreen === 'forum' && (
              <ForumScreen
                currentUser={currentUser}
                onNavigate={setCurrentScreen}
                onShowToast={handleShowToast}
              />
            )}

            {currentScreen === 'upload' && (
              <TextbookUploadScreen
                onNavigate={setCurrentScreen}
                onShowToast={handleShowToast}
                subscriptionInfo={subscriptionInfo}
                currentUser={currentUser}
                initialTab="my"
                onOpenPricingModal={() => setIsPricingModalOpen(true)}
              />
            )}

            {currentScreen === 'qgroup' && (
              <QGroupScreen
                onNavigate={setCurrentScreen}
                onShowToast={handleShowToast}
                subscriptionInfo={subscriptionInfo}
                currentUser={currentUser}
                onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
              />
            )}

            {currentScreen === 'generate' && (
              <AIGenerationScreen
                onNavigate={setCurrentScreen}
                onGenerateSuccess={handleGenerateSuccess}
                onShowToast={handleShowToast}
                currentUser={currentUser}
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
                onLoadQuestions={(loadedQs) => {
                  setQuestions(loadedQs);
                  try {
                    localStorage.setItem('quizgen_questions', JSON.stringify(loadedQs));
                    localStorage.setItem('quizgen_pending_review_questions', JSON.stringify(loadedQs));
                  } catch {}
                }}
              />
            )}

            {currentScreen === 'bank' && (
              <QuestionBankScreen
                questions={questions}
                onShowToast={handleShowToast}
                currentUser={currentUser}
                onNavigate={setCurrentScreen}
                onLoadQuestions={(loadedQs) => {
                  setQuestions(loadedQs);
                  try {
                    localStorage.setItem('quizgen_questions', JSON.stringify(loadedQs));
                    localStorage.setItem('quizgen_pending_review_questions', JSON.stringify(loadedQs));
                  } catch {}
                }}
              />
            )}

            {currentScreen === 'support' && (
              <SupportCenterScreen
                currentUser={currentUser}
                onNavigateHome={() => setCurrentScreen('dashboard')}
              />
            )}
          </ErrorBoundary>
        </div>

        {/* Pricing Plans & Payment QR Modals */}
        <PricingPlansModal
          isOpen={isPricingModalOpen}
          onClose={() => setIsPricingModalOpen(false)}
          currentUser={currentUser}
          subscriptionInfo={subscriptionInfo}
          onSelectOrder={(order) => setActivePaymentOrder(order)}
          onShowToast={handleShowToast}
        />

        <PaymentQRModal
          order={activePaymentOrder}
          onClose={() => setActivePaymentOrder(null)}
          onSuccess={() => {
            if (currentUser?.id) {
              fetchSubscription(currentUser.id);
            }
          }}
          onShowToast={handleShowToast}
        />

        {/* Lì Xì Khai Xuân Như Ý Popup (Xuân Đinh Mùi 2027) */}
        {activeThemeId === 'spring' && (
          <ThemeLuckyMoneyModal
            isOpen={isLuckyMoneyOpen}
            onClose={() => {
              setIsLuckyMoneyOpen(false);
              try {
                localStorage.setItem('quizgen_lucky_money_seen_2027', 'true');
              } catch {}
            }}
            onClaim={() => {
              handleShowToast('success', 'Khai Xuân Đinh Mùi 2027', '🌸 Quý Thầy/Cô đã nhận Lộc Đầu Xuân! Kính chúc Vạn Sự Như Ý, Giảng Đường Hân Hoan!');
            }}
          />
        )}
      </main>

      {/* QuizGen Copilot: Trợ lý Khảo thí Học thuật AI (Bong bóng chat thông minh) */}
      {isAuthenticated && currentScreen !== 'admin_portal' && (
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

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
};

export default App;
