import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { DashboardScreen } from './components/DashboardScreen';
import { TextbookUploadScreen } from './components/TextbookUploadScreen';
import { AIGenerationScreen } from './components/AIGenerationScreen';
import { ReviewWorkspaceScreen } from './components/ReviewWorkspaceScreen';
import { QuestionBankScreen } from './components/QuestionBankScreen';
import { ToastContainer } from './components/ToastContainer';
import { ScreenId, Question, ToastMessage } from './types';

const INITIAL_QUESTIONS: Question[] = [
  {
    id: 'q-1',
    sourceChunkId: 'chunk-1',
    textbookName: 'GiaoTrinh_KinhTeViMo_2025.pdf',
    chapter: 'Chương 3: Cung - Cầu và Giá cả thị trường',
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
    chapter: 'Chương 3: Cung - Cầu và Giá cả thị trường',
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
    chapter: 'Chương 3: Cung - Cầu và Giá cả thị trường',
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
  const [currentScreen, setCurrentScreen] = useState<ScreenId>('dashboard');
  const [questions, setQuestions] = useState<Question[]>(INITIAL_QUESTIONS);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const handleShowToast = (
    type: 'success' | 'info' | 'warning' | 'error',
    title: string,
    message: string
  ) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    const newToast: ToastMessage = { id, type, title, message };
    setToasts((prev) => [newToast, ...prev]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const handleDismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const handleUpdateQuestion = (updated: Question) => {
    setQuestions((prev) => prev.map((q) => (q.id === updated.id ? updated : q)));
  };

  const handleBatchApprove = () => {
    setQuestions((prev) =>
      prev.map((q) => (q.status === 'pending' ? { ...q, status: 'approved' } : q))
    );
  };

  const handleGenerateSuccess = () => {
    setCurrentScreen('review');
  };

  const pendingCount = questions.filter((q) => q.status === 'pending').length;
  const approvedCount = questions.filter((q) => q.status === 'approved').length;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0b0f19] font-sans relative select-none">
      {/* Toast Notification Layer */}
      <ToastContainer toasts={toasts} onDismiss={handleDismissToast} />

      {/* Persistent Academic Sidebar */}
      <Sidebar
        currentScreen={currentScreen}
        onNavigate={setCurrentScreen}
        pendingReviewCount={pendingCount}
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
