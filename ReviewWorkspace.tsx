import React, { useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  XCircle,
  Edit3,
  Sparkles,
  ChevronRight,
  ExternalLink,
  Save,
  RotateCcw,
  Check,
  AlertCircle,
  FileText,
  HelpCircle,
  Layers,
  ArrowLeft,
  Download
} from 'lucide-react';

// --- TYPES & INTERFACES ---
export type BloomLevel = 'Nhận biết' | 'Thông hiểu' | 'Vận dụng' | 'Phân tích';
export type QuestionStatus = 'pending' | 'approved' | 'rejected';

export interface SourceChunk {
  id: string;
  pageNumber: number;
  chapter: string;
  textSnippet: string;
  relevanceScore: number;
}

export interface QuestionOption {
  id: string;
  label: string; // A, B, C, D
  text: string;
}

export interface GeneratedQuestion {
  id: string;
  sourceChunkId: string;
  bloomLevel: BloomLevel;
  question: string;
  options: QuestionOption[];
  correctAnswerId: string;
  explanation: string;
  confidenceScore: number;
  status: QuestionStatus;
}

// --- MOCK DATA ---
const MOCK_SOURCE_CHUNKS: Record<string, SourceChunk> = {
  'chunk-1': {
    id: 'chunk-1',
    pageNumber: 42,
    chapter: 'Chương 3: Cung - Cầu và Giá cả thị trường',
    textSnippet:
      'Quy luật cầu (Law of Demand) chỉ ra rằng: trong điều kiện các yếu tố khác không đổi (ceteris paribus), khi giá của một hàng hóa hoặc dịch vụ tăng lên thì lượng cầu về hàng hóa hoặc dịch vụ đó sẽ giảm xuống và ngược lại. Mối quan hệ tỷ lệ nghịch này được thể hiện thông qua đường cầu dốc xuống từ trái sang phải trên đồ thị giá - lượng.',
    relevanceScore: 98,
  },
  'chunk-2': {
    id: 'chunk-2',
    pageNumber: 45,
    chapter: 'Chương 3: Cung - Cầu và Giá cả thị trường',
    textSnippet:
      'Hàng hóa thay thế (Substitute goods) là những cặp hàng hóa thỏa mãn cùng một nhu cầu. Khi giá của mặt hàng X tăng lên, người tiêu dùng có xu hướng giảm tiêu thụ X và chuyển sang sử dụng mặt hàng thay thế Y, làm cho lượng cầu của hàng hóa Y tăng lên dù giá của Y không đổi.',
    relevanceScore: 94,
  },
  'chunk-3': {
    id: 'chunk-3',
    pageNumber: 48,
    chapter: 'Chương 3: Cung - Cầu và Giá cả thị trường',
    textSnippet:
      'Hệ số co giãn của cầu theo giá (Price Elasticity of Demand - PED) đo lường mức độ phản ứng của lượng cầu trước sự thay đổi của giá cả. Nếu |PED| > 1, cầu được coi là co giãn nhiều (Elastic demand), việc giảm giá sẽ làm tăng tổng doanh thu (Total Revenue) của doanh nghiệp.',
    relevanceScore: 91,
  },
};

const INITIAL_QUESTIONS: GeneratedQuestion[] = [
  {
    id: 'q-1',
    sourceChunkId: 'chunk-1',
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
  },
  {
    id: 'q-2',
    sourceChunkId: 'chunk-2',
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
  },
  {
    id: 'q-3',
    sourceChunkId: 'chunk-3',
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
  },
];

// Helper for Bloom badge color
const getBloomBadgeColor = (level: BloomLevel) => {
  switch (level) {
    case 'Nhận biết':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'Thông hiểu':
      return 'bg-teal-50 text-teal-700 border-teal-200';
    case 'Vận dụng':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'Phân tích':
      return 'bg-purple-50 text-purple-700 border-purple-200';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
};

export const ReviewWorkspace: React.FC = () => {
  const [questions, setQuestions] = useState<GeneratedQuestion[]>(INITIAL_QUESTIONS);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string>('q-2');
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  // Currently focused question & corresponding source text chunk
  const activeQuestion = questions.find((q) => q.id === selectedQuestionId) || questions[0];
  const activeChunk = activeQuestion ? MOCK_SOURCE_CHUNKS[activeQuestion.sourceChunkId] : null;

  // Question action handlers
  const handleStatusChange = (id: string, newStatus: QuestionStatus) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, status: newStatus } : q))
    );
  };

  const handleUpdateQuestionText = (id: string, newText: string) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, question: newText } : q))
    );
  };

  const handleUpdateOption = (qId: string, optId: string, newText: string) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== qId) return q;
        return {
          ...q,
          options: q.options.map((opt) =>
            opt.id === optId ? { ...opt, text: newText } : opt
          ),
        };
      })
    );
  };

  const handleSetCorrectAnswer = (qId: string, optId: string) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === qId ? { ...q, correctAnswerId: optId } : q))
    );
  };

  const handleUpdateExplanation = (qId: string, explanation: string) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === qId ? { ...q, explanation } : q))
    );
  };

  // Stats calculation
  const totalCount = questions.length;
  const approvedCount = questions.filter((q) => q.status === 'approved').length;
  const rejectedCount = questions.filter((q) => q.status === 'rejected').length;
  const pendingCount = questions.filter((q) => q.status === 'pending').length;

  const filteredQuestions = questions.filter((q) => {
    if (filter === 'all') return true;
    return q.status === filter;
  });

  return (
    <div className="flex flex-col h-screen bg-slate-50 text-slate-800 font-sans">
      {/* 1. TOP HEADER / APP BAR */}
      <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center space-x-4">
          <button className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="h-6 w-px bg-slate-200" />
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-slate-900 text-sm md:text-base">
                Kiểm duyệt câu hỏi tự động (AI)
              </span>
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                Chương 3: Cung - Cầu
              </span>
            </div>
            <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
              <FileText className="w-3.5 h-3.5" /> Nguồn: GiaoTrinh_KinhTeViMo_2025.pdf (32 trang đã phân tích)
            </p>
          </div>
        </div>

        {/* Global Progress & Actions */}
        <div className="flex items-center space-x-6">
          <div className="hidden md:flex items-center space-x-3 text-xs">
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="font-medium text-slate-700">Duyệt: {approvedCount}</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span className="font-medium text-slate-700">Chờ: {pendingCount}</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <span className="font-medium text-slate-700">Hủy: {rejectedCount}</span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                setQuestions((prev) =>
                  prev.map((q) => (q.status === 'pending' ? { ...q, status: 'approved' } : q))
                );
              }}
              className="px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
            >
              Duyệt tất cả còn lại
            </button>
            <button className="flex items-center space-x-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-blue-900 rounded-lg hover:bg-blue-800 transition-colors shadow-sm">
              <Check className="w-4 h-4" />
              <span>Hoàn tất & Lưu vào kho</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. MAIN WORKSPACE: SPLIT VIEW LAYOUT */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT PANE: RAG SOURCE DOCUMENT & CONTEXT */}
        <div className="w-2/5 border-r border-slate-200 bg-white flex flex-col">
          {/* Left Pane Header */}
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center space-x-2">
              <BookOpen className="w-4 h-4 text-blue-900" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Minh chứng RAG (Ngữ cảnh gốc)
              </h2>
            </div>
            {activeChunk && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-mono">
                Trang {activeChunk.pageNumber}
              </span>
            )}
          </div>

          {/* Source Text Viewer */}
          <div className="flex-1 p-6 overflow-y-auto leading-relaxed text-slate-700 text-sm">
            {activeChunk ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs text-slate-500 pb-2 border-b border-slate-100">
                  <span className="font-medium text-blue-900">{activeChunk.chapter}</span>
                  <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-mono font-medium">
                    <Sparkles className="w-3 h-3" /> Khớp {activeChunk.relevanceScore}%
                  </span>
                </div>

                {/* Highlighted text block */}
                <div className="p-4 bg-amber-50/60 border-l-4 border-amber-400 rounded-r-lg text-slate-800 text-sm leading-relaxed shadow-sm">
                  <p className="font-serif italic text-slate-700">
                    "{activeChunk.textSnippet}"
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-500 flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                  <p>
                    Đoạn văn bản trên được RAG Engine trích xuất trực tiếp từ trang {activeChunk.pageNumber} của giáo trình để làm cơ sở cho câu hỏi đang được chọn. Giảng viên có thể đối chiếu nội dung để tránh sai sót kiến thức.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 text-sm">
                <FileText className="w-10 h-10 mb-2 stroke-1" />
                <p>Chọn một câu hỏi ở bên phải để xem tài liệu đối sánh</p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANE: GENERATED QUESTIONS & REVIEW ACTIONS */}
        <div className="w-3/5 bg-slate-50 flex flex-col">
          {/* Filter Bar */}
          <div className="p-4 border-b border-slate-200 bg-white flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-medium text-slate-500">Bộ lọc:</span>
              {(['all', 'pending', 'approved', 'rejected'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setFilter(mode)}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                    filter === mode
                      ? 'bg-blue-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {mode === 'all' && `Tất cả (${totalCount})`}
                  {mode === 'pending' && `Chờ duyệt (${pendingCount})`}
                  {mode === 'approved' && `Đã duyệt (${approvedCount})`}
                  {mode === 'rejected' && `Đã từ chối (${rejectedCount})`}
                </button>
              ))}
            </div>

            <span className="text-xs text-slate-500">
              Nhấn vào thẻ để đồng bộ đoạn văn bản minh chứng
            </span>
          </div>

          {/* Question Cards Feed */}
          <div className="flex-1 p-6 overflow-y-auto space-y-5">
            {filteredQuestions.map((q, index) => {
              const isSelected = q.id === selectedQuestionId;
              const isEditing = editingQuestionId === q.id;

              return (
                <div
                  key={q.id}
                  onClick={() => setSelectedQuestionId(q.id)}
                  className={`relative bg-white rounded-xl border transition-all duration-200 cursor-pointer p-5 ${
                    isSelected
                      ? 'border-blue-600 ring-2 ring-blue-100 shadow-md'
                      : 'border-slate-200 hover:border-slate-300 shadow-sm'
                  }`}
                >
                  {/* Card Header */}
                  <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-100">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs font-bold text-slate-500">
                        #Câu {index + 1}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getBloomBadgeColor(
                          q.bloomLevel
                        )}`}
                      >
                        {q.bloomLevel}
                      </span>
                      <span className="text-xs text-slate-400">
                        Độ tin cậy: {q.confidenceScore}%
                      </span>
                    </div>

                    {/* Status Badge */}
                    <div className="flex items-center space-x-2">
                      {q.status === 'approved' && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Đã duyệt
                        </span>
                      )}
                      {q.status === 'rejected' && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                          <XCircle className="w-3.5 h-3.5" /> Đã loại bỏ
                        </span>
                      )}
                      {q.status === 'pending' && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                          Chờ xem xét
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Question Stem (Inline editable) */}
                  <div className="mb-4">
                    {isEditing ? (
                      <textarea
                        value={q.question}
                        onChange={(e) => handleUpdateQuestionText(q.id, e.target.value)}
                        className="w-full p-2.5 text-sm font-medium border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
                        rows={2}
                      />
                    ) : (
                      <p className="text-sm font-semibold text-slate-900 leading-snug">
                        {q.question}
                      </p>
                    )}
                  </div>

                  {/* Answer Options List */}
                  <div className="space-y-2 mb-4">
                    {q.options.map((opt) => {
                      const isCorrect = q.correctAnswerId === opt.id;
                      return (
                        <div
                          key={opt.id}
                          className={`flex items-center space-x-3 p-2.5 rounded-lg border text-sm transition-colors ${
                            isCorrect
                              ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950 font-medium'
                              : 'bg-slate-50/50 border-slate-200 text-slate-700'
                          }`}
                        >
                          {/* Radio Button to select correct answer */}
                          <input
                            type="radio"
                            name={`correct-${q.id}`}
                            checked={isCorrect}
                            onChange={() => handleSetCorrectAnswer(q.id, opt.id)}
                            className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                          />
                          <span className="font-mono text-xs font-bold text-slate-400">
                            {opt.label}.
                          </span>

                          {/* Editable option text */}
                          {isEditing ? (
                            <input
                              type="text"
                              value={opt.text}
                              onChange={(e) =>
                                handleUpdateOption(q.id, opt.id, e.target.value)
                              }
                              className="flex-1 px-2 py-1 text-xs border border-slate-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          ) : (
                            <span className="flex-1 text-xs md:text-sm">{opt.text}</span>
                          )}

                          {isCorrect && (
                            <span className="text-[10px] font-bold tracking-wider uppercase text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                              Đáp án đúng
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* AI Explanation / Rationale */}
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 mb-4 text-xs text-slate-600">
                    <span className="font-semibold text-slate-700 block mb-1">
                      Giải thích đáp án & Căn cứ RAG:
                    </span>
                    {isEditing ? (
                      <textarea
                        value={q.explanation}
                        onChange={(e) =>
                          handleUpdateExplanation(q.id, e.target.value)
                        }
                        className="w-full p-2 text-xs border border-slate-300 rounded bg-white"
                        rows={2}
                      />
                    ) : (
                      <p className="italic">{q.explanation}</p>
                    )}
                  </div>

                  {/* Card Actions (Bottom toolbar) */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingQuestionId(isEditing ? null : q.id);
                      }}
                      className="inline-flex items-center space-x-1 text-xs font-medium text-slate-600 hover:text-blue-900 transition-colors"
                    >
                      {isEditing ? (
                        <>
                          <Save className="w-3.5 h-3.5 text-blue-600" />
                          <span className="text-blue-600 font-semibold">Lưu chỉnh sửa</span>
                        </>
                      ) : (
                        <>
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Chỉnh sửa nội dung</span>
                        </>
                      )}
                    </button>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStatusChange(q.id, 'rejected');
                        }}
                        className={`inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          q.status === 'rejected'
                            ? 'bg-rose-100 text-rose-800 font-bold'
                            : 'bg-white border border-rose-200 text-rose-600 hover:bg-rose-50'
                        }`}
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Loại bỏ</span>
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStatusChange(q.id, 'approved');
                        }}
                        className={`inline-flex items-center space-x-1 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors shadow-sm ${
                          q.status === 'approved'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-white border border-emerald-300 text-emerald-700 hover:bg-emerald-50'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Duyệt câu hỏi</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReviewWorkspace;
