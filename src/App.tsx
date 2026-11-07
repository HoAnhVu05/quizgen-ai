import React, { useState, useCallback, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { TopHeader } from './components/TopHeader';
import { DashboardScreen } from './components/DashboardScreen';
import { TextbookUploadScreen } from './components/TextbookUploadScreen';
import { AIGenerationScreen } from './components/AIGenerationScreen';
import { ReviewWorkspaceScreen } from './components/ReviewWorkspaceScreen';
import { QuestionBankScreen } from './components/QuestionBankScreen';
import { ToastContainer } from './components/ToastContainer';
import { LoginScreen } from './components/LoginScreen';
import { RegisterScreen } from './components/RegisterScreen';
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

  // ─── App State ────────────────────────────────────────────────────────────
  const [currentScreen, setCurrentScreen] = useState<ScreenId>('dashboard');
  const [questions, setQuestions] = useState<Question[]>(INITIAL_QUESTIONS);
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

        if (res.ok) {
          const data = await res.json();
          const profile: UserProfile = {
            id: data.id || `usr-${Date.now()}`,
            fullName: data.full_name || data.fullName || 'Giảng viên',
            email: data.email,
            academicTitle: data.academic_title || data.academicTitle || 'TS.',
            department: data.department || data.faculty || 'Khoa Kinh tế & Quản trị',
            faculty: data.department || data.faculty || 'Khoa Kinh tế & Quản trị',
            university: data.university || 'Đại học Quốc gia',
            role: (data.role as UserRole) || 'lecturer',
            roleLabel:
              data.role === 'head_of_department'
                ? 'Trưởng bộ môn'
                : data.role === 'admin'
                ? 'Quản trị Khảo thi'
                : 'Giảng viên',
          };
          setCurrentUser(profile);
          setIsAuthenticated(true);
          localStorage.setItem('quizgen_user', JSON.stringify(profile));
        } else if (res.status === 401) {
          // Token hết hạn hoặc không hợp lệ -> Thu hồi phiên
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
      setIsAuthenticated(false);
      setCurrentUser(null);
      setAuthScreen('login');
      handleShowToast(
        'warning',
        'Phiên làm việc hết hạn',
        'Mã xác thực JWT đã hết hiệu lực và không thể gia hạn. Vui lòng đăng nhập lại.'
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
          if (Array.isArray(data) && data.length > 0) {
            setQuestions(data);
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
      setQuestions((prev) => [...newQuestions, ...prev]);
    }
    setCurrentScreen('review');
  };

  // ─── Auth Handlers ────────────────────────────────────────────────────────
  const handleLogin = (user: UserProfile) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
    setCurrentScreen('dashboard');
    const title = user.academicTitle ? `${user.academicTitle} ` : '';
    handleShowToast(
      'success',
      'Đăng nhập thành công',
      `Chào mừng ${title}${user.fullName} (${user.roleLabel || user.role}) trở lại QuizGen AI!`
    );
  };

  const handleRegister = (user: UserProfile) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
    setCurrentScreen('dashboard');
    handleShowToast(
      'success',
      'Đăng ký tài khoản thành công',
      `Chào mừng ${user.fullName} đã gia nhập hệ thống Khảo thi ĐHQG!`
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
    handleShowToast(
      'info',
      'Đã chuyển đổi vai trò',
      `Hiện đang làm việc với quyền: ${updatedUser.roleLabel} (${updatedUser.department})`
    );
  };

  const pendingCount = questions.filter((q) => q.status === 'pending').length;
  const approvedCount = questions.filter((q) => q.status === 'approved').length;

  // ─── Render Auth Screens (Login / Register) ───────────────────────────────
  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 h-full w-full overflow-y-auto overflow-x-hidden bg-[#080c16] font-sans">
        <ToastContainer toasts={toasts} onDismiss={handleDismissToast} />
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
    <div className="flex h-screen w-screen overflow-hidden bg-[#0b0f19] font-sans relative select-none">
      {/* Toast Notification Layer */}
      <ToastContainer toasts={toasts} onDismiss={handleDismissToast} />

      {/* Persistent Academic Sidebar with User & Logout */}
      <Sidebar
        currentScreen={currentScreen}
        onNavigate={setCurrentScreen}
        pendingReviewCount={pendingCount}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-[#0b0f19]">
        {/* Unified Top Header Bar synchronized with User Account & Role */}
        <TopHeader
          currentScreen={currentScreen}
          currentUser={currentUser}
          onLogout={handleLogout}
          onRoleSwitch={handleRoleSwitch}
          onShowToast={handleShowToast}
        />

        {/* Screen Content Viewport */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          {currentScreen === 'dashboard' && (
            <DashboardScreen
              onNavigate={setCurrentScreen}
              pendingReviewCount={pendingCount}
              approvedCount={approvedCount}
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
            />
          )}

          {currentScreen === 'bank' && (
            <QuestionBankScreen
              questions={questions}
              onShowToast={handleShowToast}
            />
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
