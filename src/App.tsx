import React, { useState, useCallback, useEffect } from 'react';
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
import { ProfileSetupScreen } from './components/ProfileSetupScreen';
import { ScreenId, AuthScreenId, UserProfile, UserRole, Question, ToastMessage } from './types';
import apiClient from './services/apiClient';

const INITIAL_QUESTIONS: Question[] = [
  {
    id: 'q-init-1',
    sourceChunkId: 'chunk-15-1',
    textbookName: 'GiaoTrinh_KinhTeViMo_2025.pdf',
    chapter: 'Chương 1: Khái quát về Kinh tế học vi mô và Các nguyên lý nền tảng',
    bloomLevel: 'Nhận biết',
    question: 'Khái niệm "Chi phí cơ hội" (Opportunity Cost) trong phân tích kinh tế vi mô được định nghĩa là gì?',
    options: [
      { id: 'opt-a-1', label: 'A', text: 'Giá trị của phương án tốt nhất bị bỏ qua khi đưa ra một quyết định lựa chọn' },
      { id: 'opt-b-1', label: 'B', text: 'Tổng số tiền mặt thực tế đã chi ra để thực hiện dự án' },
      { id: 'opt-c-1', label: 'C', text: 'Khoản chi phí chìm không thể thu hồi được trong quá khứ' },
      { id: 'opt-d-1', label: 'D', text: 'Lợi nhuận kế toán ghi nhận trên báo cáo tài chính hàng năm' },
    ],
    correctAnswerId: 'opt-a-1',
    explanation: 'Chi phí cơ hội đo lường giá trị của cơ hội tốt nhất tiếp theo phải hy sinh để chọn phương án hiện tại.',
    confidenceScore: 98,
    status: 'approved',
    createdAt: '11/11/2026',
  },
  {
    id: 'q-init-2',
    sourceChunkId: 'chunk-42-2',
    textbookName: 'GiaoTrinh_KinhTeViMo_2025.pdf',
    chapter: 'Chương 2: Cung - Cầu và Cơ chế cân bằng giá cả thị trường',
    bloomLevel: 'Thông hiểu',
    question: 'Nếu trà và cà phê là hai hàng hóa thay thế cho nhau, điều gì sẽ xảy ra khi giá cà phê trên thị trường tăng vọt?',
    options: [
      { id: 'opt-a-2', label: 'A', text: 'Cầu về mặt hàng trà sẽ có xu hướng tăng lên và đường cầu dịch chuyển sang phải' },
      { id: 'opt-b-2', label: 'B', text: 'Lượng cầu về trà sẽ giảm sút nghiêm trọng' },
      { id: 'opt-c-2', label: 'C', text: 'Đường cầu của cà phê dịch chuyển song song sang phải' },
      { id: 'opt-d-2', label: 'D', text: 'Giá của cả hai mặt hàng sẽ lập tức giảm về 0' },
    ],
    correctAnswerId: 'opt-a-2',
    explanation: 'Vì là hàng hóa thay thế, giá cà phê tăng làm người tiêu dùng chuyển sang dùng trà, làm tăng cầu về trà.',
    confidenceScore: 96,
    status: 'approved',
    createdAt: '11/11/2026',
  },
  {
    id: 'q-init-3',
    sourceChunkId: 'chunk-42-3',
    textbookName: 'GiaoTrinh_KinhTeViMo_2025.pdf',
    chapter: 'Chương 2: Cung - Cầu và Cơ chế cân bằng giá cả thị trường',
    bloomLevel: 'Vận dụng',
    question: 'Một doanh nghiệp bán sản phẩm có hệ số co giãn của cầu theo giá là |PED| = 1.8. Để tối đa hóa tổng doanh thu, doanh nghiệp nên áp dụng chiến lược giá nào?',
    options: [
      { id: 'opt-a-3', label: 'A', text: 'Giảm nhẹ giá bán sản phẩm để kích thích lượng bán ra tăng mạnh hơn' },
      { id: 'opt-b-3', label: 'B', text: 'Tăng giá bán sản phẩm lên gấp đôi' },
      { id: 'opt-c-3', label: 'C', text: 'Giữ nguyên mức giá bất chấp biến động thị trường' },
      { id: 'opt-d-3', label: 'D', text: 'Cắt giảm toàn bộ sản lượng cung ứng' },
    ],
    correctAnswerId: 'opt-a-3',
    explanation: 'Khi cầu co giãn nhiều (|PED| > 1), giá và tổng doanh thu biến thiên ngược chiều; giảm giá giúp tăng tổng doanh thu.',
    confidenceScore: 95,
    status: 'pending',
    createdAt: '11/11/2026',
  },
  {
    id: 'q-init-4',
    sourceChunkId: 'chunk-15-4',
    textbookName: 'GiaoTrinh_KinhTeViMo_2025.pdf',
    chapter: 'Chương 1: Khái quát về Kinh tế học vi mô và Các nguyên lý nền tảng',
    bloomLevel: 'Phân tích',
    question: 'Khi phân tích sự khác biệt giữa kinh tế học thực chứng và kinh tế học chuẩn tắc, nhận định nào sau đây là chính xác?',
    options: [
      { id: 'opt-a-4', label: 'A', text: 'Kinh tế học thực chứng giải thích thế giới khách quan ("là gì"), trong khi kinh tế học chuẩn tắc đưa ra đánh giá chủ quan ("nên như thế nào")' },
      { id: 'opt-b-4', label: 'B', text: 'Kinh tế học chuẩn tắc có thể được kiểm chứng trực tiếp bằng số liệu thực nghiệm' },
      { id: 'opt-c-4', label: 'C', text: 'Kinh tế học thực chứng luôn chứa đựng quan điểm đạo đức của người nghiên cứu' },
      { id: 'opt-d-4', label: 'D', text: 'Cả hai phương pháp đều chỉ áp dụng cho phân tích kinh tế vĩ mô' },
    ],
    correctAnswerId: 'opt-a-4',
    explanation: 'Thực chứng (Positive) dựa trên thực tế có thể kiểm chứng; Chuẩn tắc (Normative) chứa đựng phán xét giá trị.',
    confidenceScore: 94,
    status: 'pending',
    createdAt: '11/11/2026',
  },
];

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

  const [authScreen, setAuthScreen] = useState<AuthScreenId>(() => {
    try {
      const saved = localStorage.getItem('quizgen_user');
      if (saved) {
        const u = JSON.parse(saved);
        if (u && u.profileCompleted === false) return 'profile_setup';
      }
    } catch {}
    return 'login';
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      const token = localStorage.getItem('quizgen_token') || localStorage.getItem('quizgen_auth_token');
      const saved = localStorage.getItem('quizgen_user');
      if (!token || !saved) return false;
      const u = JSON.parse(saved);
      return Boolean(u && u.profileCompleted !== false && u.fullName && u.fullName !== 'Chưa cập nhật');
    } catch {
      return false;
    }
  });

  // ─── App State ────────────────────────────────────────────────────────────
  const [currentScreen, setCurrentScreen] = useState<ScreenId>('dashboard');
  const [questions, setQuestions] = useState<Question[]>(INITIAL_QUESTIONS);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

  // ─── Khởi động: Đọc quizgen_token và gọi GET /api/v1/auth/me để kiểm tra phiên ───
  useEffect(() => {
    const token = localStorage.getItem('quizgen_token') || localStorage.getItem('quizgen_auth_token');
    if (!token) {
      setIsAuthenticated(false);
      return;
    }

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
          const isComplete = Boolean(
            data.profile_completed ||
            (data.full_name && data.full_name.trim() && data.full_name !== 'Chưa cập nhật' && data.university && data.department)
          );

          const profile: UserProfile = {
            id: data.id || `usr-${Date.now()}`,
            fullName: data.full_name || '',
            email: data.email,
            academicTitle: data.academic_title || 'TS.',
            department: data.department || '',
            faculty: data.department || '',
            university: data.university || '',
            role: (data.role as UserRole) || 'lecturer',
            roleLabel:
              data.role === 'head_of_department'
                ? 'Trưởng bộ môn'
                : data.role === 'admin'
                ? 'Quản trị Khảo thi'
                : 'Giảng viên',
            profileCompleted: isComplete,
            avatarUrl: data.avatar_url || data.avatarUrl,
            authProvider: data.auth_provider || data.authProvider,
          };
          setCurrentUser(profile);
          localStorage.setItem('quizgen_user', JSON.stringify(profile));

          if (!isComplete) {
            setIsAuthenticated(false);
            setAuthScreen('profile_setup');
          } else {
            setIsAuthenticated(true);
          }
        } else if (res.status === 401) {
          // Token hết hạn hoặc không hợp lệ -> Thu hồi phiên
          localStorage.removeItem('quizgen_token');
          localStorage.removeItem('quizgen_auth_token');
          localStorage.removeItem('quizgen_user');
          setCurrentUser(null);
          setIsAuthenticated(false);
          setAuthScreen('login');
        }
      } catch (err) {
        console.warn('[AUTH] Không thể kết nối /auth/me');
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
    setToasts((prev) => [newToast, ...prev.slice(0, 3)]);

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
          if (Array.isArray(data) && data.length > 0) {
            setQuestions(data);
          }
        }
      } catch (err) {
        // Fallback tự nhiên
      }
    };
    fetchQuestions();
  }, [isAuthenticated, API_BASE]);

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
  const handleLogin = (user: UserProfile, needsProfileSetup = false) => {
    setCurrentUser(user);
    if (needsProfileSetup || !user.profileCompleted) {
      setIsAuthenticated(false);
      setAuthScreen('profile_setup');
      handleShowToast(
        'info',
        'Hoàn tất thông tin',
        'Tài khoản mới: Vui lòng điền thông tin cá nhân và đơn vị công tác để bắt đầu.'
      );
      return;
    }

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
        `Chào mừng ${title}${user.fullName} (${user.roleLabel || user.role}) trở lại Không gian Làm đề Giảng viên!`
      );
    }
  };

  const handleRegister = (user: UserProfile, needsProfileSetup = true) => {
    setCurrentUser(user);
    setIsAuthenticated(false);
    setAuthScreen('profile_setup');
    handleShowToast(
      'success',
      'Đăng ký tài khoản Giảng viên thành công',
      'Vui lòng điền thông tin cá nhân và đơn vị công tác để hoàn tất hồ sơ.'
    );
  };

  const handleProfileComplete = (updatedUser: UserProfile) => {
    setCurrentUser(updatedUser);
    setIsAuthenticated(true);
    setCurrentScreen('dashboard');
    const title = updatedUser.academicTitle ? `${updatedUser.academicTitle} ` : '';
    handleShowToast(
      'success',
      'Hồ sơ đã hoàn tất',
      `Chào mừng ${title}${updatedUser.fullName} (${updatedUser.roleLabel || updatedUser.role}) đã sẵn sàng sử dụng QuizGen AI!`
    );
  };

  const handleLogout = async () => {
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

    apiClient.clearAuth();
    localStorage.removeItem('quizgen_token');
    localStorage.removeItem('quizgen_auth_token');
    localStorage.removeItem('quizgen_user');
    sessionStorage.clear();
    setCurrentUser(null);
    setIsAuthenticated(false);
    setAuthScreen('login');
    setCurrentScreen('dashboard');
    handleShowToast('info', 'Đã đăng xuất', 'Bạn đã đăng xuất an toàn khỏi hệ thống QuizGen AI.');
  };

  // ─── Multi-Role Switcher (Preserving actual user name & unit) ───────────────
  const handleRoleSwitch = (newRole: UserRole) => {
    if (!currentUser) return;
    const roleLabels: Record<UserRole, string> = {
      lecturer: 'Giảng viên',
      head_of_department: 'Trưởng bộ môn',
      admin: 'Quản trị Khảo thí',
    };
    const updatedUser: UserProfile = {
      ...currentUser,
      role: newRole,
      roleLabel: roleLabels[newRole] || 'Giảng viên',
    };

    setCurrentUser(updatedUser);
    localStorage.setItem('quizgen_user', JSON.stringify(updatedUser));
    if (newRole !== 'lecturer' && (currentScreen === 'upload' || currentScreen === 'generate')) {
      setCurrentScreen('dashboard');
    }
    handleShowToast(
      'info',
      'Đã chuyển đổi vai trò',
      `Hiện đang làm việc với quyền: ${updatedUser.roleLabel} (${updatedUser.department || updatedUser.university})`
    );
  };

  const pendingCount = questions.filter((q) => q.status === 'pending' || q.status === 'submitted_to_hod').length;
  const approvedCount = questions.filter((q) => q.status === 'approved' || q.status === 'locked_for_exam').length;

  // ─── Render Auth Screens (Login / Register / Profile Setup) ────────────────
  if (!isAuthenticated || authScreen === 'profile_setup') {
    return (
      <div className="fixed inset-0 h-full w-full overflow-y-auto overflow-x-hidden bg-[#f3f7f8] text-slate-800 font-sans">
        <ToastContainer toasts={toasts} onDismiss={handleDismissToast} />
        {authScreen === 'login' ? (
          <LoginScreen
            onLogin={handleLogin}
            onNavigateRegister={() => setAuthScreen('register')}
          />
        ) : authScreen === 'register' ? (
          <RegisterScreen
            onRegister={handleRegister}
            onNavigateLogin={() => setAuthScreen('login')}
          />
        ) : (
          currentUser && (
            <ProfileSetupScreen
              currentUser={currentUser}
              onComplete={handleProfileComplete}
              onLogout={handleLogout}
            />
          )
        )}
      </div>
    );
  }

  // ─── Render Main Application ──────────────────────────────────────────────
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#f7f9fb] text-slate-800 font-sans relative select-none">
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
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-[#f7f9fb]">
        {/* Unified Top Header Bar synchronized with User Account & Role */}
        <TopHeader
          currentScreen={currentScreen}
          currentUser={currentUser}
          onLogout={handleLogout}
          onNavigate={setCurrentScreen}
          onRoleSwitch={handleRoleSwitch}
          onShowToast={handleShowToast}
        />

        {/* Screen Content Viewport */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          {currentScreen === 'admin_portal' && (
            <AdminPortalScreen
              currentUser={currentUser}
              onNavigate={setCurrentScreen}
              onShowToast={handleShowToast}
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
            />
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
