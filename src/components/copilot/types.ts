import { ScreenId, UserProfile, Question } from '../../types';
import { QuantaAction } from '../QuantaMarkdownRenderer';

export interface ChatAttachment {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  data?: string;
  textContent?: string;
}

export interface RagSourceItem {
  documentName: string;
  pageNumber: number;
  chapter?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  suggestedActions?: string[];
  actions?: QuantaAction[];
  attachments?: ChatAttachment[];
  ragSources?: RagSourceItem[];
}

export interface AIChatCopilotProps {
  currentScreen: ScreenId;
  currentUser: UserProfile | null;
  activeQuestion?: Question | null;
  onNavigate?: (screen: ScreenId) => void;
  onGenerateSuccess?: (newQuestions: Question[], targetScreen?: ScreenId) => void;
  onUpdateQuestion?: (updated: Question) => void;
  onShowToast?: (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => void;
}

export const SCREEN_LABELS: Record<ScreenId, string> = {
  dashboard: 'Tổng quan Học thuật',
  forum: 'Diễn đàn Học thuật',
  qgroup: 'Hội nhóm Q-Group',
  upload: 'Bước 1: Kho Giáo trình',
  generate: 'Bước 2: Sinh Câu hỏi AI',
  review: 'Bước 3: Đối soát & Biên tập',
  bank: 'Bước 4: Đóng gói & Xuất Đề Thi',
  admin_portal: 'Cổng Quản trị Hệ thống',
  support: 'Trung tâm Hỗ trợ & FAQ',
};

export const getUserHonorific = (user: UserProfile | null): string => {
  if (!user) return 'Thầy/Cô';
  if (user.academicTitle && user.fullName) {
    return `${user.academicTitle}. ${user.fullName}`;
  }
  if (user.fullName) {
    return `Thầy/Cô ${user.fullName}`;
  }
  return 'Thầy/Cô';
};

export const DEFAULT_WELCOME_MESSAGE = (
  honorific: string,
  _screenLabel: string,
  bookName?: string
): ChatMessage => ({
  id: 'welcome-msg',
  role: 'assistant',
  content:
    `Kính chào **${honorific}**! Em là **Quanta** — Quản gia Khảo thí Học thuật & Trợ lý Điều hành AI của hệ thống QuizGen AI.\n\n` +
    `Em có toàn quyền **am hiểu hệ thống, đọc hiểu sâu giáo trình**${bookName ? ` (đang kết nối trực tiếp: *${bookName}*)` : ''} và sẵn sàng can thiệp giải quyết mọi tác vụ giúp ${honorific}:\n\n` +
    `• ⚡ **Tự động hóa 4 bước tạo đề:** Lên ma trận Bloom, cấu hình đề và đưa Thầy/Cô sang đối soát câu hỏi.\n` +
    `• 📖 **Tra cứu & thẩm định tài liệu:** Tìm công thức, định lý, trích xuất luận điểm học thuật.\n` +
    `• 🛠️ **Hỗ trợ kỹ thuật 1-chạm:** Tự động tạo và gửi ticket hỗ trợ trực tiếp khi gặp sự cố hoặc đối soát nạp tiền.\n\n` +
    `*${honorific} có thể ra lệnh hoặc chọn nhanh gợi ý bên dưới để em bắt đầu ngay ạ!*`,
  timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
  suggestedActions: [
    '⚡ Tạo đề thi 4 bước mẫu',
    '📖 Tóm tắt giáo trình này',
    '📊 Đề xuất ma trận Bloom',
    '💡 Giải thích chi tiết đáp án',
    '🎧 Hỗ trợ kỹ thuật & thanh toán',
  ],
});
