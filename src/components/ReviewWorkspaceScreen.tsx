import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Edit3,
  BookOpen,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  Save,
  CheckSquare,
  Sparkles,
  ArrowRight,
  Check,
  Zap,
  GraduationCap,
  Layers,
  ShieldCheck,
  BookMarked,
  HelpCircle,
  RotateCcw,
  UploadCloud,
  ChevronRight,
  Lightbulb,
  FileCheck,
  Maximize2,
  Image as ImageIcon,
} from 'lucide-react';
import { Question, BloomLevel, ScreenId, UserProfile, QuestionStatus } from '../types';
import MathRenderer from './MathRenderer';
import { LatexFormulaToolbar } from './LatexFormulaToolbar';
import { ImageLightboxModal } from './ImageLightboxModal';

interface ReviewWorkspaceScreenProps {
  questions: Question[];
  onUpdateQuestion: (updated: Question) => void;
  onBatchApprove: () => void;
  onNavigate: (screen: ScreenId) => void;
  onShowToast: (
    type: 'success' | 'info' | 'warning' | 'error',
    title: string,
    message: string
  ) => void;
  currentUser?: UserProfile | null;
  onLoadQuestions?: (questions: Question[]) => void;
}

const SAMPLE_REVIEW_QUESTIONS: Question[] = [
  {
    id: 'sample-q1',
    sourceChunkId: 'chunk-nlp-215',
    textbookName: 'GiaoTrinh_TriTueNhanTao_2026.pdf',
    chapter: 'Chương 4: Xử lý ngôn ngữ tự nhiên (NLP) & Kiến trúc Transformer',
    bloomLevel: 'Nhận biết',
    question: 'Thành phần cốt lõi tạo nên khả năng xử lý ngữ cảnh song song vượt trội của mô hình Transformer trong NLP là gì?',
    options: [
      { id: 'opt-a', label: 'A', text: 'Cơ chế tự chú ý đa đầu (Multi-Head Self-Attention Mechanism)' },
      { id: 'opt-b', label: 'B', text: 'Mạng nơ-ron hồi quy LSTM xử lý tuần tự từng bước thời gian' },
      { id: 'opt-c', label: 'C', text: 'Tầng tích chập 1 chiều (1D-CNN) với kích thước cửa sổ cố định' },
      { id: 'opt-d', label: 'D', text: 'Mô hình phân loại Naive Bayes kết hợp Bag-of-Words' },
    ],
    correctAnswerId: 'opt-a',
    explanation: 'Self-Attention tính toán mối tương quan giữa tất cả các từ trong câu đồng thời, loại bỏ điểm nghẽn tuần tự của RNN/LSTM.',
    confidenceScore: 0.98,
    status: 'pending',
    createdAt: '2026-11-16T10:00:00Z',
    hasFormula: false,
  },
  {
    id: 'sample-q2',
    sourceChunkId: 'chunk-micro-42',
    textbookName: 'GiaoTrinh_KinhTeViMo_2025.pdf',
    chapter: 'Chương 2: Lý thuyết Chi phí sản xuất & Cân bằng thị trường',
    bloomLevel: 'Vận dụng',
    question: 'Trong kinh tế vi mô, khi hàm tổng chi phí là $TC = 2Q^2 + 10Q + 50$, chi phí biên ($MC$) tại mức sản lượng $Q = 5$ bằng bao nhiêu?',
    options: [
      { id: 'opt-a', label: 'A', text: '$MC = 30$' },
      { id: 'opt-b', label: 'B', text: '$MC = 20$' },
      { id: 'opt-c', label: 'C', text: '$MC = 50$' },
      { id: 'opt-d', label: 'D', text: '$MC = 15$' },
    ],
    correctAnswerId: 'opt-a',
    explanation: 'Chi phí biên là đạo hàm bậc nhất của tổng chi phí: $MC = \\frac{d(TC)}{dQ} = 4Q + 10$. Với $Q = 5$, ta có $MC = 4(5) + 10 = 30$.',
    confidenceScore: 0.96,
    status: 'pending',
    createdAt: '2026-11-16T10:05:00Z',
    hasFormula: true,
  },
  {
    id: 'sample-q3',
    sourceChunkId: 'chunk-rag-218',
    textbookName: 'GiaoTrinh_TriTueNhanTao_2026.pdf',
    chapter: 'Chương 4: Xử lý ngôn ngữ tự nhiên (NLP) & Kiến trúc Transformer/RAG',
    bloomLevel: 'Thông hiểu',
    question: 'Kiến trúc RAG (Retrieval-Augmented Generation) giải quyết trực tiếp thách thức cốt tử nào của các mô hình ngôn ngữ lớn (LLM) trong giáo dục?',
    options: [
      { id: 'opt-a', label: 'A', text: 'Triệt tiêu hiện tượng ảo giác (Hallucination) và cung cấp minh chứng đối soát trích dẫn số trang chính xác từ giáo trình' },
      { id: 'opt-b', label: 'B', text: 'Cho phép mô hình chạy mà không cần bộ nhớ GPU' },
      { id: 'opt-c', label: 'C', text: 'Thay thế hoàn toàn quá trình tiền huấn luyện (Pre-training)' },
      { id: 'opt-d', label: 'D', text: 'Tự động dịch đề thi sang 50 ngôn ngữ khác nhau' },
    ],
    correctAnswerId: 'opt-a',
    explanation: 'RAG truy xuất các đoạn văn bản thực tế từ giáo trình làm căn cứ ngữ cảnh (Grounding), đảm bảo mỗi câu hỏi sinh ra đều có bằng chứng trang sách rõ ràng.',
    confidenceScore: 0.99,
    status: 'pending',
    createdAt: '2026-11-16T10:10:00Z',
    hasFormula: false,
  },
  {
    id: 'sample-q4',
    sourceChunkId: 'chunk-cobb-78',
    textbookName: 'GiaoTrinh_KinhTeViMo_2025.pdf',
    chapter: 'Chương 3: Lý thuyết Hành vi Doanh nghiệp & Sản xuất',
    bloomLevel: 'Phân tích',
    question: 'Khi phân tích hàm sản xuất Cobb-Douglas $Y = A \\cdot K^\\alpha \\cdot L^\\beta$, điều kiện nào sau đây thể hiện hiệu quả kinh tế tăng theo quy mô (Increasing Returns to Scale)?',
    options: [
      { id: 'opt-a', label: 'A', text: '$\\alpha + \\beta > 1$' },
      { id: 'opt-b', label: 'B', text: '$\\alpha + \\beta = 1$' },
      { id: 'opt-c', label: 'C', text: '$\\alpha + \\beta < 1$' },
      { id: 'opt-d', label: 'D', text: '$\\alpha = \\beta = 0$' },
    ],
    correctAnswerId: 'opt-a',
    explanation: 'Nếu $\\alpha + \\beta > 1$, khi tăng tất cả các yếu tố đầu vào lên $t$ lần ($t > 1$), sản lượng đầu ra sẽ tăng hơn $t$ lần, biểu thị hiệu quả tăng theo quy mô.',
    confidenceScore: 0.95,
    status: 'pending',
    createdAt: '2026-11-16T10:15:00Z',
    hasFormula: true,
  },
  {
    id: 'sample-q5',
    sourceChunkId: 'chunk-opt-94',
    textbookName: 'GiaoTrinh_TriTueNhanTao_2026.pdf',
    chapter: 'Chương 2: Học có giám sát & Thuật toán Tối ưu hóa',
    bloomLevel: 'Thông hiểu',
    question: 'Trong thuật toán Gradient Descent tối ưu hóa hàm mất mát, công thức cập nhật trọng số nào sau đây là chuẩn xác nhất?',
    options: [
      { id: 'opt-a', label: 'A', text: '$\\theta_{t+1} = \\theta_t - \\eta \\nabla J(\\theta_t)$ với $\\eta$ là tốc độ học (learning rate)' },
      { id: 'opt-b', label: 'B', text: '$\\theta_{t+1} = \\theta_t + \\eta \\nabla J(\\theta_t)$' },
      { id: 'opt-c', label: 'C', text: '$\\theta_{t+1} = \\frac{\\theta_t}{\\nabla J(\\theta_t)}$' },
      { id: 'opt-d', label: 'D', text: '$\\theta_{t+1} = \\theta_t \\cdot \\eta$' },
    ],
    correctAnswerId: 'opt-a',
    explanation: 'Gradient Descent di chuyển ngược hướng với vector đạo hàm riêng (gradient) để tìm điểm cực tiểu của hàm mất mát: $\\theta_{t+1} = \\theta_t - \\eta \\nabla J(\\theta_t)$.',
    confidenceScore: 0.97,
    status: 'pending',
    createdAt: '2026-11-16T10:20:00Z',
    hasFormula: true,
  },
];

const BLOOM_ORDER: BloomLevel[] = ['Nhận biết', 'Thông hiểu', 'Vận dụng', 'Phân tích'];

const BLOOM_STYLE: Record<
  BloomLevel,
  { label: string; en: string; bg: string; color: string; border: string }
> = {
  'Nhận biết': {
    label: 'Nhận biết',
    en: 'Remember',
    bg: 'bg-sky-50',
    color: 'text-sky-700',
    border: 'border-sky-200',
  },
  'Thông hiểu': {
    label: 'Thông hiểu',
    en: 'Understand',
    bg: 'bg-[#e6f4f4]',
    color: 'text-[#008689]',
    border: 'border-[#b2d8d8]',
  },
  'Vận dụng': {
    label: 'Vận dụng',
    en: 'Apply',
    bg: 'bg-amber-50',
    color: 'text-amber-700',
    border: 'border-amber-200',
  },
  'Phân tích': {
    label: 'Phân tích',
    en: 'Analyze',
    bg: 'bg-rose-50',
    color: 'text-rose-700',
    border: 'border-rose-200',
  },
};

export const ReviewWorkspaceScreen: React.FC<ReviewWorkspaceScreenProps> = ({
  questions,
  onUpdateQuestion,
  onBatchApprove,
  onNavigate,
  onShowToast,
  currentUser,
  onLoadQuestions,
}) => {
  const [selectedId, setSelectedId] = useState<string>(questions[0]?.id || '');
  const [filterStatus, setFilterStatus] = useState<'all' | QuestionStatus>('all');
  const [filterBloom, setFilterBloom] = useState<'all' | BloomLevel>('all');
  const [isEditing, setIsEditing] = useState(false);

  // Edit Buffer
  const [editStem, setEditStem] = useState('');
  const [editOptions, setEditOptions] = useState<Question['options']>([]);
  const [editCorrectId, setEditCorrectId] = useState('');
  const [editExplanation, setEditExplanation] = useState('');
  const [editBloom, setEditBloom] = useState<BloomLevel>('Thông hiểu');
  const [editHasImage, setEditHasImage] = useState(false);
  const [editImageUrl, setEditImageUrl] = useState('');
  const [editImageCaption, setEditImageCaption] = useState('');
  const [activeFocusedField, setActiveFocusedField] = useState<'stem' | 'explanation' | string>('stem');

  // Lightbox modal state
  const [lightboxData, setLightboxData] = useState<{
    isOpen: boolean;
    url: string;
    caption?: string;
  }>({
    isOpen: false,
    url: '',
    caption: '',
  });

  const filteredQuestions = questions.filter((q) => {
    const matchStatus = filterStatus === 'all' || q.status === filterStatus;
    const matchBloom = filterBloom === 'all' || q.bloomLevel === filterBloom;
    return matchStatus && matchBloom;
  });

  const activeQuestion =
    questions.find((q) => q.id === selectedId) || filteredQuestions[0] || questions[0];

  useEffect(() => {
    if (activeQuestion) {
      setEditStem(activeQuestion.question);
      setEditOptions(activeQuestion.options.map((o) => ({ ...o })));
      setEditCorrectId(activeQuestion.correctAnswerId);
      setEditExplanation(activeQuestion.explanation);
      setEditBloom(activeQuestion.bloomLevel);
      setEditHasImage(!!activeQuestion.hasImage);
      setEditImageUrl(activeQuestion.imageUrl || '');
      setEditImageCaption(activeQuestion.imageCaption || '');
      setIsEditing(false);
    }
  }, [activeQuestion?.id]);

  const handleStatusChange = useCallback(
    (status: QuestionStatus) => {
      if (!activeQuestion) return;
      onUpdateQuestion({
        ...activeQuestion,
        status,
      });

      if (status === 'approved') {
        onShowToast(
          'success',
          'Đã chốt câu hỏi vào Ngân hàng Đề',
          `Câu hỏi thuộc "${activeQuestion.chapter}" đã sẵn sàng để đóng gói đề thi.`
        );
      } else if (status === 'rejected') {
        onShowToast(
          'warning',
          'Đã đánh dấu loại bỏ câu hỏi',
          `Câu hỏi thuộc "${activeQuestion.chapter}" đã được loại khỏi bộ đề.`
        );
      }

      const currentIndex = filteredQuestions.findIndex((q) => q.id === activeQuestion.id);
      if (currentIndex >= 0 && currentIndex < filteredQuestions.length - 1) {
        setSelectedId(filteredQuestions[currentIndex + 1].id);
      }
    },
    [activeQuestion, filteredQuestions, onUpdateQuestion, onShowToast]
  );

  // Keyboard shortcuts for fast teacher review (A = Approve, R = Reject, E = Edit)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || isEditing) return;

      if (e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        handleStatusChange('approved');
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        handleStatusChange('rejected');
      } else if (e.key === 'e' || e.key === 'E') {
        e.preventDefault();
        setIsEditing(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleStatusChange, isEditing]);

  const handleInsertFormula = (snippet: string) => {
    if (activeFocusedField === 'stem') {
      setEditStem((prev) => (prev ? `${prev} ${snippet}` : snippet));
    } else if (activeFocusedField === 'explanation') {
      setEditExplanation((prev) => (prev ? `${prev} ${snippet}` : snippet));
    } else {
      setEditOptions((prev) =>
        prev.map((opt) =>
          opt.id === activeFocusedField ? { ...opt, text: opt.text ? `${opt.text} ${snippet}` : snippet } : opt
        )
      );
    }
  };

  const handleSaveEdit = () => {
    if (!activeQuestion) return;
    const hasFormula =
      editStem.includes('$') ||
      editExplanation.includes('$') ||
      editOptions.some((o) => o.text.includes('$')) ||
      !!activeQuestion.hasFormula;

    onUpdateQuestion({
      ...activeQuestion,
      question: editStem,
      options: editOptions,
      correctAnswerId: editCorrectId,
      explanation: editExplanation,
      bloomLevel: editBloom,
      hasImage: editHasImage && !!editImageUrl,
      imageUrl: editHasImage ? editImageUrl : undefined,
      imageCaption: editHasImage ? editImageCaption : undefined,
      hasFormula,
    });
    setIsEditing(false);
    onShowToast('info', 'Đã lưu chỉnh sửa', 'Nội dung câu hỏi, công thức và hình ảnh minh họa đã được cập nhật.');
  };

  const handleQuickBloomCycle = () => {
    if (!activeQuestion) return;
    const idx = BLOOM_ORDER.indexOf(activeQuestion.bloomLevel);
    const nextBloom = BLOOM_ORDER[(idx + 1) % BLOOM_ORDER.length];
    onUpdateQuestion({
      ...activeQuestion,
      bloomLevel: nextBloom,
    });
    onShowToast(
      'info',
      'Đã đổi mức độ Bloom',
      `Đã chuyển câu hỏi sang mức "${BLOOM_STYLE[nextBloom].label}" (${BLOOM_STYLE[nextBloom].en}).`
    );
  };

  const handleOptionTextChange = (optId: string, newText: string) => {
    setEditOptions((prev) =>
      prev.map((o) => (o.id === optId ? { ...o, text: newText } : o))
    );
  };

  const handleApproveAllAndProceedToExport = () => {
    onBatchApprove();
    onNavigate('bank');
  };

  const pendingCount = questions.filter((q) => q.status === 'pending').length;
  const approvedCount = questions.filter(
    (q) => q.status === 'approved' || q.status === 'locked_for_exam'
  ).length;
  const rejectedCount = questions.filter((q) => q.status === 'rejected').length;

  const getStatusBadge = (status: QuestionStatus) => {
    switch (status) {
      case 'approved':
      case 'locked_for_exam':
        return {
          label: 'Đã chốt vào Đề thi',
          className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />,
        };
      case 'rejected':
        return {
          label: 'Đã loại bỏ',
          className: 'bg-rose-50 text-rose-700 border-rose-200',
          icon: <XCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />,
        };
      default:
        return {
          label: 'Chờ kiểm tra',
          className: 'bg-amber-50 text-amber-700 border-amber-200',
          icon: <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />,
        };
    }
  };

  if (questions.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto p-6 flex items-center justify-center">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-10 text-center shadow-xs max-w-lg w-full space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto shadow-2xs">
            <CheckSquare className="w-7 h-7 text-amber-600" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
              Bước 3/4 • Đối soát &amp; Biên tập Đề
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900">
              Chưa có câu hỏi nào trong phiên làm việc
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
              Hãy sinh câu hỏi từ giáo trình ở Bước 2, hoặc nạp nhanh bộ câu hỏi mẫu để trải nghiệm giao diện đối soát 2 cột song song.
            </p>
          </div>

          {/* 2 Clean Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-1">
            <button
              onClick={() => onNavigate('generate')}
              className="w-full sm:w-auto px-5 py-2.5 bg-[#008689] hover:bg-[#006f72] text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Sinh câu hỏi ở Bước 2</span>
            </button>

            <button
              onClick={() => {
                if (onLoadQuestions) {
                  onLoadQuestions(SAMPLE_REVIEW_QUESTIONS);
                  onShowToast(
                    'success',
                    'Đã nạp 5 câu hỏi mẫu',
                    'Bộ câu hỏi đối soát kèm trích dẫn giáo trình và công thức KaTeX đã sẵn sàng.'
                  );
                }
              }}
              className="w-full sm:w-auto px-4 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-xs rounded-xl border border-amber-200 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 text-amber-600 fill-amber-600" />
              <span>Nạp 5 câu hỏi mẫu</span>
            </button>
          </div>

          {/* Minimal Capabilities Summary */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-center gap-3 text-[11px] text-slate-400 flex-wrap">
            <span className="flex items-center gap-1">
              <BookOpen className="w-3 h-3 text-slate-400" />
              Trích dẫn giáo trình
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Layers className="w-3 h-3 text-slate-400" />
              Chuẩn 4 mức Bloom
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <FileCheck className="w-3 h-3 text-slate-400" />
              Công thức KaTeX
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 md:p-6 space-y-3.5 sm:space-y-4">
      {/* Top Connected Workflow Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[11px] font-extrabold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200 shadow-2xs">
              <CheckSquare className="w-3.5 h-3.5 text-amber-600" />
              Bước 3/4 • Đối Soát Minh Chứng & Biên Tập Đề (Amber)
            </span>
            <span className="text-xs text-slate-500 font-semibold bg-slate-100 px-2 py-0.5 rounded-md hidden md:inline-block">
              Đối chiếu song song giáo trình gốc
            </span>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            Tổng cộng: <strong className="text-slate-800 font-bold">{questions.length}</strong> câu hỏi
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
              {[
                { id: 'all', label: `Tất cả (${questions.length})` },
                { id: 'pending', label: `Chờ kiểm tra (${pendingCount})` },
                { id: 'approved', label: `Đã chốt (${approvedCount})` },
                { id: 'rejected', label: `Đã loại (${rejectedCount})` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setFilterStatus(tab.id as typeof filterStatus)}
                  className={`px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                    filterStatus === tab.id
                      ? 'bg-white text-slate-800 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <select
              value={filterBloom}
              onChange={(e) => setFilterBloom(e.target.value as typeof filterBloom)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:border-amber-500"
            >
              <option value="all">Tất cả mức Bloom</option>
              {BLOOM_ORDER.map((lvl) => (
                <option key={lvl} value={lvl}>
                  {BLOOM_STYLE[lvl].label} ({BLOOM_STYLE[lvl].en})
                </option>
              ))}
            </select>
          </div>

          {/* Action Buttons connecting Step 3 -> Step 4 */}
          <div className="flex flex-wrap items-center gap-2">
            {pendingCount > 0 && (
              <button
                onClick={onBatchApprove}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-semibold text-xs rounded-lg transition-colors"
              >
                <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
                Chốt nhanh tất cả ({pendingCount} câu)
              </button>
            )}

            <button
              onClick={handleApproveAllAndProceedToExport}
              className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-lg transition-all shadow-sm shadow-purple-600/20"
            >
              <span>Bước 4: Đóng gói Tờ Đề A4 & Xuất File ({questions.length} câu)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Split-View Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left List */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              Danh sách câu hỏi ({filteredQuestions.length})
            </span>
          </div>
          <div className="divide-y divide-slate-100 max-h-56 sm:max-h-72 lg:max-h-[600px] overflow-y-auto">
            {filteredQuestions.map((q, idx) => {
              const isSelected = activeQuestion?.id === q.id;
              const bloomCfg = BLOOM_STYLE[q.bloomLevel];
              const badge = getStatusBadge(q.status);
              return (
                <button
                  key={q.id}
                  onClick={() => setSelectedId(q.id)}
                  className={`w-full text-left p-3.5 transition-colors flex items-start gap-2.5 ${
                    isSelected
                      ? 'bg-[#e6f4f4]/60 border-l-4 border-l-[#008689]'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="mt-0.5">{badge.icon}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold text-slate-700">Câu {idx + 1}</span>
                      <span
                        className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${bloomCfg.bg} ${bloomCfg.color} ${bloomCfg.border}`}
                      >
                        {q.bloomLevel}
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 line-clamp-2 mt-1">
                      <MathRenderer content={q.question} inline />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Center Question Inspector & Editor */}
        {activeQuestion && (
          <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5 gap-2 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`text-xs font-semibold px-2.5 py-0.5 rounded border ${
                    BLOOM_STYLE[activeQuestion.bloomLevel].bg
                  } ${BLOOM_STYLE[activeQuestion.bloomLevel].color} ${
                    BLOOM_STYLE[activeQuestion.bloomLevel].border
                  }`}
                >
                  {BLOOM_STYLE[activeQuestion.bloomLevel].label} (
                  {BLOOM_STYLE[activeQuestion.bloomLevel].en})
                </span>
                <span
                  className={`text-xs font-semibold px-2.5 py-0.5 rounded border ${
                    getStatusBadge(activeQuestion.status).className
                  }`}
                >
                  {getStatusBadge(activeQuestion.status).label}
                </span>
                {(activeQuestion.hasFormula || activeQuestion.question.includes('$')) && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded border bg-purple-50 text-purple-700 border-purple-200">
                    ∑ Toán - Lý (LaTeX)
                  </span>
                )}
                {activeQuestion.hasImage && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded border bg-blue-50 text-blue-700 border-blue-200">
                    📷 Sơ đồ / Hình vẽ
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                {!isEditing ? (
                  <>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Chỉnh sửa (E)
                    </button>
                    <button
                      onClick={handleQuickBloomCycle}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-[#008689] bg-[#e6f4f4] hover:bg-[#d5ecec]"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Đổi Bloom
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleSaveEdit}
                    className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold bg-[#008689] text-white hover:bg-[#006f72]"
                  >
                    <Save className="w-3.5 h-3.5" />
                    Lưu thay đổi
                  </button>
                )}
              </div>
            </div>

            {/* Question Stem */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[11px] font-bold text-slate-400 uppercase">
                  Nội dung câu hỏi — {activeQuestion.chapter}
                </label>
                {isEditing && (
                  <span className="text-[11px] text-indigo-600 font-medium">
                    Đang chọn ô: <strong className="font-bold">{activeFocusedField === 'stem' ? 'Câu hỏi' : activeFocusedField === 'explanation' ? 'Giải thích' : `Đáp án`}</strong>
                  </span>
                )}
              </div>

              {isEditing && (
                <div className="mb-2">
                  <LatexFormulaToolbar onInsert={handleInsertFormula} />
                </div>
              )}

              {isEditing ? (
                <div className="space-y-2">
                  <textarea
                    rows={3}
                    value={editStem}
                    onFocus={() => setActiveFocusedField('stem')}
                    onChange={(e) => setEditStem(e.target.value)}
                    className="w-full p-3 rounded-lg border border-slate-300 text-sm text-slate-800 focus:outline-none focus:border-[#008689]"
                    placeholder="Nhập nội dung câu hỏi (sử dụng $...$ cho công thức toán)..."
                  />
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-600">Mức độ Bloom:</span>
                      <select
                        value={editBloom}
                        onChange={(e) => setEditBloom(e.target.value as BloomLevel)}
                        className="px-2.5 py-1 rounded border border-slate-300 text-xs font-semibold text-slate-700"
                      >
                        {BLOOM_ORDER.map((lvl) => (
                          <option key={lvl} value={lvl}>
                            {BLOOM_STYLE[lvl].label} ({BLOOM_STYLE[lvl].en})
                          </option>
                        ))}
                      </select>
                    </div>

                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-md transition-colors">
                      <ImageIcon className="w-3.5 h-3.5 text-indigo-600" />
                      <input
                        type="checkbox"
                        checked={editHasImage}
                        onChange={(e) => setEditHasImage(e.target.checked)}
                        className="rounded text-[#008689]"
                      />
                      <span>Đính kèm hình vẽ / sơ đồ</span>
                    </label>
                  </div>

                  {/* Multimodal Image Input Section */}
                  {editHasImage && (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2 text-xs">
                      <span className="font-bold text-slate-700 block">Hình ảnh / Sơ đồ minh chứng câu hỏi:</span>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          type="text"
                          placeholder="Nhập URL hình ảnh (https://...)"
                          value={editImageUrl}
                          onChange={(e) => setEditImageUrl(e.target.value)}
                          className="flex-1 px-3 py-1.5 rounded border border-slate-300 text-xs focus:outline-none focus:border-[#008689] bg-white"
                        />
                        <label className="px-3 py-1.5 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-semibold cursor-pointer shrink-0 text-center transition-colors">
                          📁 Tải ảnh từ máy
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = () => {
                                  setEditImageUrl(reader.result as string);
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                        </label>
                      </div>
                      <input
                        type="text"
                        placeholder="Chú thích hình ảnh (ví dụ: Sơ đồ khối nguyên lý hoạt động)"
                        value={editImageCaption}
                        onChange={(e) => setEditImageCaption(e.target.value)}
                        className="w-full px-3 py-1.5 rounded border border-slate-300 text-xs focus:outline-none focus:border-[#008689] bg-white"
                      />
                      {editImageUrl && (
                        <div className="pt-1 flex items-center gap-3">
                          <img
                            src={editImageUrl}
                            alt="Xem trước"
                            className="max-h-24 rounded border border-slate-200 object-contain bg-white p-1"
                          />
                          <div className="text-[11px] text-slate-500 italic">
                            Xem trước hiển thị sơ đồ trong câu hỏi
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-sm font-semibold text-slate-800 leading-relaxed space-y-3">
                  <div>
                    <MathRenderer content={activeQuestion.question} />
                  </div>
                  {activeQuestion.hasImage && activeQuestion.imageUrl && (
                    <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg max-w-md mx-auto text-center shadow-xs group relative">
                      <img
                        src={activeQuestion.imageUrl}
                        alt={activeQuestion.imageCaption || 'Sơ đồ câu hỏi'}
                        className="max-h-60 mx-auto rounded object-contain border border-slate-100 cursor-pointer hover:opacity-95 transition-opacity"
                        onClick={() =>
                          setLightboxData({
                            isOpen: true,
                            url: activeQuestion.imageUrl!,
                            caption: activeQuestion.imageCaption,
                          })
                        }
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setLightboxData({
                            isOpen: true,
                            url: activeQuestion.imageUrl!,
                            caption: activeQuestion.imageCaption,
                          })
                        }
                        className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-medium transition-colors"
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                        Phóng to hình ảnh / Xem chi tiết
                      </button>
                      {activeQuestion.imageCaption && (
                        <p className="text-[11px] text-slate-500 italic mt-1 font-normal">
                          {activeQuestion.imageCaption}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Options */}
            <div className="space-y-2.5">
              <label className="block text-[11px] font-bold text-slate-400 uppercase">
                Phương án trả lời {isEditing && '(Bấm vào A/B/C/D để chọn đáp án đúng)'}
              </label>
              {(isEditing ? editOptions : activeQuestion.options).map((opt) => {
                const isCorrect =
                  (isEditing ? editCorrectId : activeQuestion.correctAnswerId) === opt.id;
                return (
                  <div
                    key={opt.id}
                    className={`p-3 rounded-lg border text-sm flex items-start gap-3 ${
                      isCorrect
                        ? 'bg-emerald-50/60 border-emerald-300 text-emerald-950'
                        : 'bg-slate-50/60 border-slate-200 text-slate-700'
                    }`}
                  >
                    <button
                      type="button"
                      disabled={!isEditing}
                      onClick={() => setEditCorrectId(opt.id)}
                      className={`w-6 h-6 rounded-md text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 ${
                        isCorrect
                          ? 'bg-emerald-600 text-white'
                          : 'bg-white border border-slate-300 text-slate-600'
                      }`}
                    >
                      {opt.label}
                    </button>
                    {isEditing ? (
                      <input
                        type="text"
                        value={opt.text}
                        onFocus={() => setActiveFocusedField(opt.id)}
                        onChange={(e) => handleOptionTextChange(opt.id, e.target.value)}
                        className="flex-1 bg-white px-2.5 py-1 rounded border border-slate-300 text-sm focus:outline-none focus:border-[#008689]"
                      />
                    ) : (
                      <div className="flex-1 leading-relaxed">
                        <MathRenderer content={opt.text} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Explanation */}
            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
              <span className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                Giải thích đáp án & Hướng dẫn chấm
              </span>
              {isEditing ? (
                <textarea
                  rows={2}
                  value={editExplanation}
                  onFocus={() => setActiveFocusedField('explanation')}
                  onChange={(e) => setEditExplanation(e.target.value)}
                  className="w-full p-2 rounded border border-slate-300 text-xs text-slate-700 bg-white focus:outline-none focus:border-[#008689]"
                />
              ) : (
                <div className="text-xs text-slate-600 leading-relaxed">
                  <MathRenderer content={activeQuestion.explanation} />
                </div>
              )}
            </div>

            {/* Decision Bar */}
            <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3">
              <button
                onClick={() => handleStatusChange('rejected')}
                className="w-full sm:flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold transition-colors"
              >
                <X className="w-4 h-4" />
                Loại câu này (R)
              </button>
              <button
                onClick={() => handleStatusChange('approved')}
                className="w-full sm:flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-[#008689] text-white hover:bg-[#006f72] text-xs font-semibold transition-colors"
              >
                <Check className="w-4 h-4" />
                Chốt câu hỏi vào Đề (A)
              </button>
            </div>
          </div>
        )}

        {/* Right Source Citation Panel (RAG Grounding) */}
        {activeQuestion && (
          <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#008689]" />
                <h3 className="text-sm font-bold text-slate-800">
                  Đối chiếu Giáo trình Gốc
                </h3>
              </div>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Độ khớp: {activeQuestion.confidenceScore}%
              </span>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                <FileText className="w-3.5 h-3.5 text-[#008689] shrink-0" />
                <span className="truncate">{activeQuestion.textbookName}</span>
              </div>
              <p className="text-xs text-slate-500">
                Chương mục:{' '}
                <strong className="text-slate-700">{activeQuestion.chapter}</strong>
              </p>
              <p className="text-xs text-slate-500">
                Vị trí trích xuất:{' '}
                <strong className="text-slate-700">{activeQuestion.sourceChunkId}</strong>
              </p>
            </div>

            <div>
              <span className="block text-[11px] font-bold text-slate-400 uppercase mb-2">
                Minh chứng kiến thức trong sách
              </span>
              <blockquote className="p-4 rounded-lg bg-[#e6f4f4]/50 border-l-4 border-[#008689] text-xs text-slate-700 leading-relaxed italic">
                "{activeQuestion.explanation}"
              </blockquote>
            </div>
          </div>
        )}
      </div>

      {/* Image Lightbox Modal */}
      <ImageLightboxModal
        isOpen={lightboxData.isOpen}
        imageUrl={lightboxData.url}
        imageCaption={lightboxData.caption}
        onClose={() => setLightboxData({ isOpen: false, url: '', caption: '' })}
      />
    </div>
  );
};
