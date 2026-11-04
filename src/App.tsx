import React, { useState, useCallback, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { DashboardScreen } from './components/DashboardScreen';
import { TextbookUploadScreen } from './components/TextbookUploadScreen';
import { AIGenerationScreen } from './components/AIGenerationScreen';
import { ReviewWorkspaceScreen } from './components/ReviewWorkspaceScreen';
import { QuestionBankScreen } from './components/QuestionBankScreen';
import { ToastContainer } from './components/ToastContainer';
import { LoginScreen } from './components/LoginScreen';
import { RegisterScreen } from './components/RegisterScreen';
import { ScreenId, AuthScreenId, UserProfile, UserRole, Question, ToastMessage } from './types';

const INITIAL_QUESTIONS: Question[] = [
  {
    id: 'q-1',
    sourceChunkId: 'chunk-1',
    textbookName: 'GiaoTrinh_KinhTeViMo_2025.pdf',
    chapter: 'Chương 2: Cung - Cầu và Cơ chế cân bằng giá cả thị trường',
    bloomLevel: 'Nhận biết',
    question: 'Theo quy luật cầu, trong điều kiện các yếu tố khác không đổi, phát biểu nào sau đây là chính xác?',
    options: [
      { id: 'opt-a', label: 'A', text: 'Khi giá hàng hóa tăng thì lượng cầu giảm xuống' },
      { id: 'opt-b', label: 'B', text: 'Khi giá hàng hóa tăng thì lượng cầu tăng lên' },
      { id: 'opt-c', label: 'C', text: 'Giá cả và lượng cầu luôn biến thiên cùng chiều' },
      { id: 'opt-d', label: 'D', text: 'Lượng cầu không chịu sự tác động của mức giá thị trường' },
    ],
    correctAnswerId: 'opt-a',
    explanation: 'Quy luật cầu chỉ rõ mối quan hệ tỷ lệ nghịch giữa giá và lượng cầu (giá tăng thì lượng cầu giảm và ngược lại).',
    confidenceScore: 99,
    status: 'approved',
    createdAt: '28/10/2026',
  },
  {
    id: 'q-2',
    sourceChunkId: 'chunk-2',
    textbookName: 'GiaoTrinh_KinhTeViMo_2025.pdf',
    chapter: 'Chương 2: Cung - Cầu và Cơ chế cân bằng giá cả thị trường',
    bloomLevel: 'Thông hiểu',
    question: 'Nếu trà và cà phê là hai hàng hóa thay thế cho nhau, điều gì sẽ xảy ra khi giá cà phê trên thị trường tăng vọt?',
    options: [
      { id: 'opt-a', label: 'A', text: 'Đường cầu của cà phê dịch chuyển sang phải' },
      { id: 'opt-b', label: 'B', text: 'Lượng cầu về trà sẽ giảm sút nghiêm trọng' },
      { id: 'opt-c', label: 'C', text: 'Cầu về mặt hàng trà sẽ có xu hướng tăng lên' },
      { id: 'opt-d', label: 'D', text: 'Giá của cả hai mặt hàng sẽ lập tức giảm về 0' },
    ],
    correctAnswerId: 'opt-c',
    explanation: 'Vì là hàng hóa thay thế, khi giá cà phê tăng, người tiêu dùng sẽ chuyển sang dùng trà, làm tăng nhu cầu về trà.',
    confidenceScore: 95,
    status: 'pending',
    createdAt: 'Hôm nay',
  },
  {
    id: 'q-3',
    sourceChunkId: 'chunk-3',
    textbookName: 'GiaoTrinh_KinhTeViMo_2025.pdf',
    chapter: 'Chương 2: Cung - Cầu và Cơ chế cân bằng giá cả thị trường',
    bloomLevel: 'Vận dụng',
    question: 'Một doanh nghiệp bán sản phẩm có hệ số co giãn của cầu theo giá là |PED| = 1.8. Để tối đa hóa tổng doanh thu, doanh nghiệp này nên áp dụng chiến lược giá nào?',
    options: [
      { id: 'opt-a', label: 'A', text: 'Tăng giá bán sản phẩm' },
      { id: 'opt-b', label: 'B', text: 'Giảm nhẹ giá bán sản phẩm' },
      { id: 'opt-c', label: 'C', text: 'Giữ nguyên giá bán và cắt giảm 50% sản lượng' },
      { id: 'opt-d', label: 'D', text: 'Tăng giá bán gấp đôi kết hợp giảm chi phí' },
    ],
    correctAnswerId: 'opt-b',
    explanation: 'Khi cầu co giãn nhiều (|PED| > 1), tỷ lệ % thay đổi của lượng cầu lớn hơn tỷ lệ % thay đổi của giá. Do đó, giảm giá sẽ kích cầu mạnh và tăng tổng doanh thu.',
    confidenceScore: 92,
    status: 'pending',
    createdAt: 'Hôm nay',
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

  // Đồng bộ câu hỏi từ Backend Database nếu có sẵn
  useEffect(() => {
    if (!isAuthenticated) return;
    const fetchQuestions = async () => {
      try {
        const res = await fetch(`${API_BASE}/questions`);
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
  }, [API_BASE, isAuthenticated]);

  const handleUpdateQuestion = async (updated: Question) => {
    setQuestions((prev) => prev.map((q) => (q.id === updated.id ? updated : q)));
    try {
      await fetch(`${API_BASE}/questions/${updated.id}`, {
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
      await fetch(`${API_BASE}/questions/batch-approve`, {
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
      `Chào mừng ${title}${user.fullName} trở lại QuizGen AI!`
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
    // 1. Gọi backend logout với token trước khi xóa token
    const token = localStorage.getItem('quizgen_token') || localStorage.getItem('quizgen_auth_token');
    if (token) {
      try {
        await fetch(`${API_BASE}/auth/logout`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
      } catch (e) {
        console.warn('[AUTH] Không thể gọi backend logout:', e);
      }
    }

    // 2. Xóa toàn bộ token & phiên đăng nhập khỏi localStorage
    localStorage.removeItem('quizgen_token');
    localStorage.removeItem('quizgen_auth_token');
    localStorage.removeItem('quizgen_user');
    setCurrentUser(null);
    setIsAuthenticated(false);
    setAuthScreen('login');
    setCurrentScreen('dashboard');
    handleShowToast('info', 'Đã đăng xuất', 'Bạn đã đăng xuất an toàn khỏi hệ thống QuizGen AI.');
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
      </main>
    </div>
  );
};

export default App;
