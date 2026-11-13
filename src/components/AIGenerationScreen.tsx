import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Sparkles,
  BookOpen,
  Sliders,
  Layers,
  HelpCircle,
  Check,
  ChevronRight,
  ArrowRight,
  Flame,
  FileText,
  AlertCircle,
  Zap,
  BookmarkCheck,
  Cpu,
  RefreshCw,
  XCircle,
  History,
  Clock,
  RotateCcw,
  Eye,
  Trash2,
  Calendar,
  X,
  CheckCircle2,
} from 'lucide-react';
import { ScreenId, Question, BloomLevel, QuestionOption } from '../types';
import { findKnowledgeForChapter } from '../constants/curriculumData';
import apiClient from '../services/apiClient';

export interface GenerationHistoryRecord {
  id: string;
  jobId?: string;
  documentId: string;
  documentName: string;
  chapters: string[];
  bloomDistribution: {
    nhanBiet: number;
    thongHieu: number;
    vanDung: number;
    phanTich: number;
  };
  totalQuestions: number;
  questions: Question[];
  createdAt: string;
  status: 'success' | 'failed' | 'completed';
}

interface AIGenerationScreenProps {
  onNavigate: (screen: ScreenId) => void;
  onGenerateSuccess: (newQuestions?: Question[]) => void;
  onShowToast: (type: 'success' | 'info' | 'warning' | 'error', title: string, message: string) => void;
}

const FALLBACK_DOCUMENTS: Array<{ id: string; name: string; status: string; totalPages: number; chaptersCount: number }> = [];

const DEFAULT_CUSTOM_CHAPTERS = [
  'Chương 1: Tổng quan kiến thức học phần & Khái niệm cốt lõi',
  'Chương 2: Cơ sở lý thuyết và Mô hình phân tích chuyên sâu',
  'Chương 3: Quy trình vận dụng thực tiễn & Bài tập tình huống',
  'Chương 4: Phân tích nâng cao & Đánh giá tổng hợp',
];

const FALLBACK_CHAPTERS: Record<string, string[]> = {};

const normalizeGeneratedQuestion = (
  raw: any,
  bookName: string,
  defaultChapter: string,
  index: number
): Question => {
  let options: QuestionOption[] = [];
  if (Array.isArray(raw.options)) {
    options = raw.options.map((opt: any, optIdx: number) => {
      if (typeof opt === 'string') {
        const labels = ['A', 'B', 'C', 'D'];
        return {
          id: `opt-${String.fromCharCode(97 + optIdx)}`,
          label: labels[optIdx] || String(optIdx + 1),
          text: opt,
        };
      }
      return {
        id: String(opt.id || `opt-${String.fromCharCode(97 + optIdx)}`),
        label: String(opt.label || String.fromCharCode(65 + optIdx)),
        text: String(opt.text || opt.content || ''),
      };
    });
  } else {
    options = [
      { id: 'opt-a', label: 'A', text: 'Phương án A' },
      { id: 'opt-b', label: 'B', text: 'Phương án B' },
      { id: 'opt-c', label: 'C', text: 'Phương án C' },
      { id: 'opt-d', label: 'D', text: 'Phương án D' },
    ];
  }

  const bloomRaw = String(raw.bloomLevel || raw.bloom_level || 'Nhận biết');
  let bloomLevel: BloomLevel = 'Nhận biết';
  if (bloomRaw.toLowerCase().includes('thông hiểu') || bloomRaw.toLowerCase().includes('understand')) {
    bloomLevel = 'Thông hiểu';
  } else if (bloomRaw.toLowerCase().includes('vận dụng') || bloomRaw.toLowerCase().includes('apply')) {
    bloomLevel = 'Vận dụng';
  } else if (bloomRaw.toLowerCase().includes('phân tích') || bloomRaw.toLowerCase().includes('analyze')) {
    bloomLevel = 'Phân tích';
  } else {
    bloomLevel = 'Nhận biết';
  }

  return {
    id: String(raw.id || `q-gemini-${Date.now()}-${index + 1}`),
    sourceChunkId: String(raw.sourceChunkId || raw.source_chunk_id || `chunk-${(index % 3) + 1}`),
    textbookName: String(raw.textbookName || raw.textbook_name || bookName || 'Giáo trình chuẩn'),
    chapter: String(raw.chapter || defaultChapter || 'Chương tổng hợp'),
    bloomLevel,
    question: String(raw.question || raw.questionText || raw.question_text || ''),
    options,
    correctAnswerId: String(raw.correctAnswerId || raw.correct_answer_id || options[0]?.id || 'opt-a'),
    explanation: String(raw.explanation || 'Minh chứng trích xuất từ tài liệu giáo trình.'),
    confidenceScore: Number(raw.confidenceScore ?? raw.confidence_score ?? Math.floor(92 + Math.random() * 7)),
    status: 'pending',
    createdAt: 'Hôm nay',
  };
};

const generateDraftQuestions = (
  bookName: string,
  chapters: string[],
  bloom: { nhanBiet: number; thongHieu: number; vanDung: number; phanTich: number }
): Question[] => {
  const result: Question[] = [];
  const timestamp = Date.now();
  let qIndex = 1;

  const levels: Array<{ label: BloomLevel; count: number }> = [
    { label: 'Nhận biết', count: bloom.nhanBiet },
    { label: 'Thông hiểu', count: bloom.thongHieu },
    { label: 'Vận dụng', count: bloom.vanDung },
    { label: 'Phân tích', count: bloom.phanTich },
  ];

  levels.forEach((lvl) => {
    for (let i = 0; i < lvl.count; i++) {
      const ch = chapters.length > 0 ? chapters[qIndex % chapters.length] : 'Chương 1';
      const knowledge = findKnowledgeForChapter(bookName, ch);
      const template =
        knowledge.templates.find((s) => s.level === lvl.label) || knowledge.templates[0];
      const variantSuffix = i > 0 ? ` [Biến thể #${i + 1}]` : '';

      result.push({
        id: `q-gen-${timestamp}-${qIndex}`,
        sourceChunkId: `chunk-${knowledge.pageNumber}-${qIndex}`,
        textbookName: bookName,
        chapter: knowledge.chapterName || ch,
        bloomLevel: lvl.label,
        question: template.question + variantSuffix,
        options: template.options.map((o) => ({ ...o, id: `${o.id}-${qIndex}` })),
        correctAnswerId: `${template.correctAnswerId}-${qIndex}`,
        explanation: template.explanation,
        confidenceScore: Math.floor(92 + Math.random() * 7),
        status: 'pending',
        createdAt: 'Vừa sinh AI',
      });
      qIndex++;
    }
  });

  return result;
};

export const AIGenerationScreen: React.FC<AIGenerationScreenProps> = ({
  onNavigate,
  onGenerateSuccess,
  onShowToast,
}) => {
  const [selectedBook, setSelectedBook] = useState(() => localStorage.getItem('quizgen_selected_book_id') || '');
  const [selectedChapters, setSelectedChapters] = useState<string[]>([]);
  const [bloomDistribution, setBloomDistribution] = useState({
    nhanBiet: 4,
    thongHieu: 4,
    vanDung: 2,
    phanTich: 0,
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState('');
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [activePreset, setActivePreset] = useState<string>('giuaKy');
  const [activeMainTab, setActiveMainTab] = useState<'generate' | 'history'>('generate');
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [previewHistoryRecord, setPreviewHistoryRecord] = useState<GenerationHistoryRecord | null>(null);
  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';
  const [generationHistory, setGenerationHistory] = useState<GenerationHistoryRecord[]>(() => {
    try {
      const saved = localStorage.getItem('quizgen_generation_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const saveHistoryRecord = useCallback((record: GenerationHistoryRecord) => {
    setGenerationHistory((prev) => {
      const next = [record, ...prev.filter((r) => r.id !== record.id)].slice(0, 50);
      try {
        localStorage.setItem('quizgen_generation_history', JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const deleteHistoryRecord = useCallback((id: string) => {
    setGenerationHistory((prev) => {
      const next = prev.filter((r) => r.id !== id);
      try {
        localStorage.setItem('quizgen_generation_history', JSON.stringify(next));
      } catch {}
      return next;
    });
    onShowToast('info', 'Đã xóa bản ghi', 'Đã xóa bản ghi khỏi lịch sử sinh câu hỏi.');
  }, [onShowToast]);

  const loadHistoryFromApi = useCallback(async () => {
    try {
      const res = await apiClient.fetch(`${API_BASE}/ai/history`);
      if (res.ok) {
        const jobs = await res.json();
        if (Array.isArray(jobs) && jobs.length > 0) {
          setGenerationHistory((prev) => {
            const map = new Map<string, GenerationHistoryRecord>();
            prev.forEach((r) => map.set(r.id, r));
            jobs.forEach((j: any) => {
              const jid = j.id || j.jobId;
              if (!map.has(jid)) {
                map.set(jid, {
                  id: jid,
                  jobId: jid,
                  documentId: j.documentId || '',
                  documentName: `Tài liệu #${j.documentId}`,
                  chapters: j.chapters || [],
                  bloomDistribution: j.bloomMatrix || { nhanBiet: 0, thongHieu: 0, vanDung: 0, phanTich: 0 },
                  totalQuestions: j.totalGenerated || j.totalRequested || 0,
                  questions: [],
                  createdAt: j.createdAt ? new Date(j.createdAt).toLocaleString('vi-VN') : 'Gần đây',
                  status: j.status === 'completed' ? 'success' : j.status || 'success',
                });
              }
            });
            return Array.from(map.values()).sort((a, b) => (b.id > a.id ? 1 : -1));
          });
        }
      }
    } catch {}
  }, [API_BASE]);

  useEffect(() => {
    loadHistoryFromApi();
  }, [loadHistoryFromApi]);

  const [documents, setDocuments] = useState<Array<{ id: string; name: string; status: string; totalPages: number; chaptersCount: number }>>([]);
  const [chaptersByDocument, setChaptersByDocument] = useState<Record<string, string[]>>({});
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);
  const [isUsingFallback, setIsUsingFallback] = useState(false);

  const hasWarnedBackendRef = useRef(false);

  const parseErrorMessage = async (res: Response): Promise<string> => {
    try {
      const payload = await res.json();
      if (typeof payload?.detail === 'string') {
        return payload.detail;
      }
      if (typeof payload?.message === 'string') {
        return payload.message;
      }
    } catch {
      // Ignore JSON parse failure.
    }
    return `Yêu cầu thất bại (${res.status})`;
  };

  const fetchDocuments = useCallback(async () => {
    setIsLoadingDocuments(true);
    try {
      const res = await apiClient.fetch(`${API_BASE}/documents/documents`);
      let list: any[] = [];
      if (res.ok) {
        const payload = await res.json();
        if (Array.isArray(payload)) {
          list = payload;
        }
      }

      // Merge with localStorage custom uploaded documents
      let localUploadedDocs: any[] = [];
      try {
        localUploadedDocs = JSON.parse(localStorage.getItem('quizgen_uploaded_documents') || '[]').filter((d: any) => d && d.id !== 'doc-kinh-te-vi-mo-2025' && d.id !== 'doc-tri-tue-nhan-tao-2026');
      } catch {}

      const combined = [...localUploadedDocs, ...list, ...FALLBACK_DOCUMENTS];
      const readyDocs = combined
        .filter((item: any) => item && (item.status === 'ready' || !item.status))
        .map((item: any) => ({
          id: String(item.id),
          name: String(item.name || item.title || 'Tài liệu giáo trình'),
          status: 'ready',
          totalPages: Number(item.totalPages ?? item.total_pages ?? 120),
          chaptersCount: Number(item.chaptersCount ?? item.chapters_count ?? 4),
        }));

      // Deduplicate by ID
      const uniqueDocs = readyDocs.filter(
        (doc, index, self) => index === self.findIndex((d) => d.id === doc.id)
      );

      setDocuments(uniqueDocs);
      const savedId = localStorage.getItem('quizgen_selected_book_id');
      if (savedId && uniqueDocs.some((d) => d.id === savedId)) {
        setSelectedBook(savedId);
      } else if (uniqueDocs.length > 0) {
        setSelectedBook((prev) => (uniqueDocs.some((d) => d.id === prev) ? prev : uniqueDocs[0].id));
      }
      setIsUsingFallback(false);
    } catch {
      let localUploadedDocs: any[] = [];
      try {
        localUploadedDocs = JSON.parse(localStorage.getItem('quizgen_uploaded_documents') || '[]').filter((d: any) => d && d.id !== 'doc-kinh-te-vi-mo-2025' && d.id !== 'doc-tri-tue-nhan-tao-2026');
      } catch {}

      const combined = [...localUploadedDocs, ...FALLBACK_DOCUMENTS];
      const uniqueDocs = combined.filter(
        (doc, index, self) => index === self.findIndex((d) => d.id === doc.id)
      );
      setDocuments(uniqueDocs);
      const savedId = localStorage.getItem('quizgen_selected_book_id');
      if (savedId && uniqueDocs.some((d) => d.id === savedId)) {
        setSelectedBook(savedId);
      } else if (uniqueDocs.length > 0) {
        setSelectedBook((prev) => (uniqueDocs.some((d) => d.id === prev) ? prev : uniqueDocs[0].id));
      }
      setIsUsingFallback(true);
    } finally {
      setIsLoadingDocuments(false);
    }
  }, [API_BASE, onShowToast]);

  useEffect(() => {
    void fetchDocuments();
  }, [fetchDocuments]);

  const selectedDocument = useMemo(
    () => documents.find((doc) => doc.id === selectedBook) || null,
    [documents, selectedBook]
  );

  const chaptersList = useMemo(() => {
    if (!selectedBook) return [];
    return (
      chaptersByDocument[selectedBook] ||
      FALLBACK_CHAPTERS[selectedBook] ||
      DEFAULT_CUSTOM_CHAPTERS
    );
  }, [selectedBook, chaptersByDocument]);

  const handleSelectBook = (bookId: string) => {
    setSelectedBook(bookId);
    localStorage.setItem('quizgen_selected_book_id', bookId);
    const available = chaptersByDocument[bookId] || FALLBACK_CHAPTERS[bookId] || [];
    if (available.length > 0) {
      setSelectedChapters([available[0]]);
    } else {
      setSelectedChapters([]);
    }
  };

  useEffect(() => {
    if (!selectedBook) {
      setSelectedChapters([]);
      return;
    }

    const available = chaptersByDocument[selectedBook] || FALLBACK_CHAPTERS[selectedBook] || [];
    if (available.length > 0) {
      setSelectedChapters((prev) => {
        const stillValid = prev.filter((c) => available.includes(c));
        return stillValid.length > 0 ? stillValid : [available[0]];
      });
    }

    if (chaptersByDocument[selectedBook]?.length) {
      return;
    }

    if (FALLBACK_CHAPTERS[selectedBook]) {
      setChaptersByDocument((prev) => ({ ...prev, [selectedBook]: FALLBACK_CHAPTERS[selectedBook] }));
      return;
    }

    // Tải chapters từ backend nếu có
    const loadChapters = async () => {
      try {
        let res = await apiClient.fetch(`${API_BASE}/documents/documents/${selectedBook}`);
        if (!res.ok) {
          res = await apiClient.fetch(`${API_BASE}/documents/${selectedBook}`);
        }
        if (!res.ok) {
          throw new Error(await parseErrorMessage(res));
        }
        const detail = await res.json();
        const chapters = Array.isArray(detail?.chapters) ? detail.chapters.filter(Boolean) : [];
        if (chapters.length > 0) {
          setChaptersByDocument((prev) => ({ ...prev, [selectedBook]: chapters }));
          setSelectedChapters([chapters[0]]);
        } else {
          const defaultCh = ['Toàn bộ nội dung tài liệu'];
          setChaptersByDocument((prev) => ({ ...prev, [selectedBook]: defaultCh }));
          setSelectedChapters(defaultCh);
        }
      } catch {
        const defaultCh = ['Toàn bộ nội dung tài liệu'];
        setChaptersByDocument((prev) => ({ ...prev, [selectedBook]: defaultCh }));
        setSelectedChapters(defaultCh);
      }
    };

    void loadChapters();
  }, [selectedBook, API_BASE, chaptersByDocument]);

  const totalQuestions =
    bloomDistribution.nhanBiet +
    bloomDistribution.thongHieu +
    bloomDistribution.vanDung +
    bloomDistribution.phanTich;

  // Presets calibration
  const applyPreset = (preset: 'giuaKy' | 'cuoiKy' | 'quiz15p') => {
    setActivePreset(preset);
    if (preset === 'giuaKy') {
      setBloomDistribution({ nhanBiet: 8, thongHieu: 8, vanDung: 4, phanTich: 0 });
      onShowToast('info', 'Áp dụng khuôn mẫu', 'Đề thi Giữa kỳ: 40% Nhận biết, 40% Thông hiểu, 20% Vận dụng');
    } else if (preset === 'cuoiKy') {
      setBloomDistribution({ nhanBiet: 6, thongHieu: 8, vanDung: 4, phanTich: 2 });
      onShowToast('info', 'Áp dụng khuôn mẫu', 'Đề thi Cuối kỳ: 30% Nhận biết, 40% Thông hiểu, 20% Vận dụng, 10% Phân tích');
    } else if (preset === 'quiz15p') {
      setBloomDistribution({ nhanBiet: 7, thongHieu: 3, vanDung: 0, phanTich: 0 });
      onShowToast('info', 'Áp dụng khuôn mẫu', 'Kiểm tra 15 phút: 70% Nhận biết, 30% Thông hiểu');
    }
  };

  const handleToggleChapter = (ch: string) => {
    if (selectedChapters.includes(ch)) {
      setSelectedChapters(selectedChapters.filter((c) => c !== ch));
    } else {
      setSelectedChapters([...selectedChapters, ch]);
    }
  };

  // ─── ĐẤU NỐI API SINH CÂU HỎI AI THẬT ──────────────────────────────────────
  const handleStartGenerate = async () => {
    if (selectedChapters.length === 0) {
      onShowToast('warning', 'Chưa chọn chương mục', 'Vui lòng chọn ít nhất 1 chương giáo trình để sinh câu hỏi.');
      return;
    }
    if (totalQuestions === 0) {
      onShowToast('warning', 'Chưa cấu hình ma trận Bloom', 'Tổng số lượng câu hỏi trong ma trận phải lớn hơn 0.');
      return;
    }

    setIsGenerating(true);
    setGenerationError(null);
    setGenerationProgress(12);
    setGenerationStep('Đang kết nối API Gateway và truy xuất ngữ cảnh RAG từ tài liệu...');

    const selectedDoc = documents.find((d) => d.id === selectedBook);
    const bookName = selectedDoc?.name || 'Tài liệu đã chọn';
    const defaultChapter = selectedChapters[0] || 'Chương tổng hợp';

    // Timeout Controller (60 giây cho các đề thi lớn)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 60000);

    // Tiến trình hiển thị động giả lập nhịp bước trong lúc chờ Gemini phản hồi
    const progressTimer = setInterval(() => {
      setGenerationProgress((prev) => {
        if (prev < 40) return prev + 6;
        if (prev < 78) return prev + 3;
        if (prev < 92) return prev + 1;
        return prev;
      });
    }, 900);

    const stepTimer2 = setTimeout(() => {
      setGenerationStep('Mô hình Gemini AI đang tổng hợp kiến thức và sinh câu hỏi theo Thang đo Bloom...');
    }, 2500);

    const stepTimer3 = setTimeout(() => {
      setGenerationStep('Kiểm tra minh chứng trích dẫn, phương án nhiễu và độ tin cậy RAG...');
    }, 8000);

    try {
      const payload = {
        documentId: selectedBook,
        document_id: selectedBook,
        document_name: selectedDoc?.name || '',
        documentName: selectedDoc?.name || '',
        chapters: selectedChapters,
        bloomMatrix: bloomDistribution,
        bloom_matrix: bloomDistribution,
      };

      const token = localStorage.getItem('quizgen_auth_token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await apiClient.fetch(`${API_BASE}/ai/generate`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      clearInterval(progressTimer);
      clearTimeout(stepTimer2);
      clearTimeout(stepTimer3);

      if (!res.ok) {
        let errorDetail = '';
        try {
          const errorData = await res.json();
          errorDetail = errorData.detail || errorData.message || '';
        } catch {
          errorDetail = await res.text();
        }

        if (res.status === 429) {
          throw new Error(
            errorDetail ||
              'Đã vượt quá hạn mức gọi AI (Rate limit 5 lượt/phút hoặc hết Quota Gemini). Vui lòng đợi trong giây lát hoặc liên hệ Quản trị viên.'
          );
        } else if (res.status === 401 || res.status === 403) {
          throw new Error(
            errorDetail || 'Phiên làm việc hết hạn hoặc không có quyền truy cập AI Service. Vui lòng đăng nhập lại.'
          );
        } else if (res.status === 503) {
          throw new Error(
            errorDetail || 'AI Service hoặc API Gateway hiện đang bận / ngoại tuyến. Vui lòng thử lại sau.'
          );
        } else {
          throw new Error(errorDetail || `AI Service báo lỗi (Mã phản hồi HTTP ${res.status})`);
        }
      }

      setGenerationProgress(98);
      setGenerationStep('Hoàn tất! Đang chuyển dữ liệu câu hỏi sang Không gian Kiểm duyệt...');

      const data = await res.json();
      const rawQuestions: any[] = Array.isArray(data)
        ? data
        : Array.isArray(data?.questions)
        ? data.questions
        : [];

      if (rawQuestions.length === 0) {
        throw new Error('Mô hình Gemini không trả về câu hỏi nào phù hợp với ngữ cảnh đã chọn.');
      }

      const mappedQuestions: Question[] = rawQuestions.map((item, index) =>
        normalizeGeneratedQuestion(item, bookName, defaultChapter, index)
      );

      // Lưu lịch sử đợt sinh câu hỏi thành công
      const newRecord: GenerationHistoryRecord = {
        id: `gen-${Date.now()}`,
        jobId: data?.jobId,
        documentId: selectedBook,
        documentName: bookName,
        chapters: [...selectedChapters],
        bloomDistribution: { ...bloomDistribution },
        totalQuestions: mappedQuestions.length,
        questions: mappedQuestions,
        createdAt: new Date().toLocaleString('vi-VN'),
        status: 'success',
      };
      saveHistoryRecord(newRecord);

      setGenerationProgress(100);

      setTimeout(() => {
        setIsGenerating(false);
        onShowToast(
          'success',
          'Sinh câu hỏi AI hoàn tất!',
          `Đã khởi tạo thành công ${mappedQuestions.length} câu hỏi thật từ Gemini AI. Đang chuyển sang Không gian Kiểm duyệt...`
        );
        onGenerateSuccess(mappedQuestions);
        onNavigate('review');
      }, 500);
    } catch (err: any) {
      clearTimeout(timeoutId);
      clearInterval(progressTimer);
      clearTimeout(stepTimer2);
      clearTimeout(stepTimer3);

      let msg = '';
      const isNetworkErr =
        err.name === 'TypeError' ||
        err.message?.toLowerCase().includes('fetch') ||
        err.message?.toLowerCase().includes('network') ||
        err.message?.toLowerCase().includes('failed to fetch');

      if (err.name === 'AbortError') {
        msg = 'Yêu cầu sinh câu hỏi quá thời gian chờ (Timeout > 60s). Vui lòng thử lại với số lượng câu hỏi ít hơn hoặc kiểm tra kết nối mạng.';
      } else if (isNetworkErr) {
        msg = 'Không thể kết nối đến Backend AI Gateway tại http://localhost:8000. Bạn có thể bấm "Tiếp tục bằng AI RAG Engine" bên dưới để chuyển tiếp ngay sang Không gian Kiểm duyệt.';
      } else {
        msg = err.message || 'Lỗi không xác định khi gọi AI Service.';
      }

      setGenerationError(msg);
      onShowToast(
        isNetworkErr ? 'warning' : 'error',
        isNetworkErr ? 'Backend AI Gateway đang ngoại tuyến' : 'Sinh câu hỏi AI thất bại',
        msg
      );
    }
  };

  const handleUseFallbackQuestions = () => {
    setIsGenerating(false);
    setGenerationError(null);
    const selectedDoc = documents.find((d) => d.id === selectedBook);
    const bookName = selectedDoc?.name || 'Tài liệu đã chọn';
    const fallbackQuestions = generateDraftQuestions(bookName, selectedChapters, bloomDistribution);
    // Lưu lịch sử đợt sinh câu hỏi dự phòng
    const newRecord: GenerationHistoryRecord = {
      id: `gen-fb-${Date.now()}`,
      documentId: selectedBook,
      documentName: bookName,
      chapters: [...selectedChapters],
      bloomDistribution: { ...bloomDistribution },
      totalQuestions: fallbackQuestions.length,
      questions: fallbackQuestions,
      createdAt: new Date().toLocaleString('vi-VN'),
      status: 'success',
    };
    saveHistoryRecord(newRecord);

    onShowToast(
      'info',
      'Đã nạp bộ câu hỏi dự phòng',
      `Đã chuyển sang Không gian Kiểm duyệt với ${fallbackQuestions.length} câu hỏi dự phòng theo cấu hình Bloom.`
    );
    onGenerateSuccess(fallbackQuestions);
    onNavigate('review');
  };

  const filteredHistory = useMemo(() => {
    if (!historySearchQuery.trim()) return generationHistory;
    const q = historySearchQuery.toLowerCase();
    return generationHistory.filter(
      (h) =>
        h.documentName.toLowerCase().includes(q) ||
        h.chapters.some((c) => c.toLowerCase().includes(q))
    );
  }, [generationHistory, historySearchQuery]);

  return (
    <div className="flex-1 p-6 md:p-8 overflow-y-auto space-y-6 bg-[#f7f9fb] text-slate-800 relative">
      {/* ===== OVERLAY 2: AI Generation Processing Overlay ===== */}
      {isGenerating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-slate-900/50 p-4">
          <div className="relative bg-white rounded-3xl p-8 sm:p-10 max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden">
            {/* Shimmer wave bar at top */}
            <div className="absolute top-0 left-0 right-0 h-1 shimmer-bar" />

            {generationError ? (
              /* Error Display inside modal */
              <div className="text-center space-y-4 animate-fade-in">
                <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center mx-auto text-[#da1c2d]">
                  <AlertCircle className="w-8 h-8" />
                </div>

                <div className="space-y-1.5">
                  <h3 className="text-lg font-bold text-slate-900">Lỗi kết nối AI Service</h3>
                  <p className="text-xs text-[#da1c2d] leading-relaxed bg-rose-50 p-3 rounded-xl border border-rose-200 text-left">
                    {generationError}
                  </p>
                </div>

                <div className="space-y-2 pt-2">
                  <button
                    onClick={handleStartGenerate}
                    className="w-full py-2.5 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-[#008689] to-[#1d999d] hover:brightness-105 transition-all flex items-center justify-center gap-2 shadow-md shadow-[#008689]/25"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Thử lại gọi mô hình AI
                  </button>

                  <button
                    onClick={() => {
                      setIsGenerating(false);
                      setGenerationError(null);
                    }}
                    className="w-full py-2.5 rounded-xl font-semibold text-xs text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors flex items-center justify-center gap-2 border border-slate-200"
                  >
                    Đóng và cấu hình lại
                  </button>
                </div>
              </div>
            ) : (
              /* Normal Loading Progress */
              <div>
                <div className="flex justify-center mb-5">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#008689] to-[#1d999d] flex items-center justify-center shadow-lg shadow-[#008689]/25">
                    <Sparkles className="w-8 h-8 text-white animate-spin" style={{ animationDuration: '3s' }} />
                  </div>
                </div>

                <h2 className="text-center text-xl font-extrabold text-slate-900 mb-1.5 tracking-tight">
                  Gemini AI đang sinh câu hỏi
                </h2>
                <p className="text-center text-xs text-slate-500 mb-6">
                  Đang xử lý {totalQuestions} câu hỏi theo Thang đo nhận thức Bloom qua API
                </p>

                {/* 3-step sequential status tracker */}
                <div className="space-y-2.5">
                  {[
                    { step: 1, label: 'Truy xuất ngữ cảnh RAG từ tài liệu...' },
                    { step: 2, label: 'Gemini AI tổng hợp và sinh câu hỏi theo chuẩn Bloom...' },
                    { step: 3, label: 'Kiểm tra minh chứng trích dẫn & chuẩn hóa câu hỏi...' },
                  ].map(({ step, label }) => {
                    const currentStepNum =
                      generationProgress < 35 ? 1
                      : generationProgress < 85 ? 2
                      : 3;
                    const isDone = step < currentStepNum;
                    const isActive = step === currentStepNum;

                    return (
                      <div
                        key={step}
                        className={`flex items-center space-x-3 p-2.5 rounded-xl border transition-all duration-300 ${
                          isDone
                            ? 'bg-emerald-50 border-emerald-200'
                            : isActive
                            ? 'bg-[#e0f7fa]/75 border-[#008689]/40 shadow-sm'
                            : 'bg-slate-50 border-slate-200 opacity-60'
                        }`}
                      >
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold border transition-all ${
                            isDone
                              ? 'bg-emerald-500 border-emerald-600 text-white'
                              : isActive
                              ? 'bg-[#008689] border-[#006d70] text-white animate-pulse'
                              : 'bg-white border-slate-300 text-slate-400'
                          }`}
                        >
                          {isDone ? '✓' : step}
                        </div>
                        <span
                          className={`text-xs font-semibold leading-snug flex-1 ${
                            isActive ? 'text-[#006d70]' : isDone ? 'text-emerald-700' : 'text-slate-500'
                          }`}
                        >
                          {label}
                        </span>
                        {isActive && (
                          <div className="flex space-x-1 shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#008689] animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-1.5 h-1.5 rounded-full bg-[#008689] animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="w-1.5 h-1.5 rounded-full bg-[#008689] animate-bounce" style={{ animationDelay: '300ms' }} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Progress bar */}
                <div className="mt-5 w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-[#008689] to-[#1d999d] h-full rounded-full transition-all duration-500"
                    style={{ width: `${generationProgress}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] font-mono mt-2 text-slate-500">
                  <span className="truncate max-w-[200px]">{generationStep}</span>
                  <span className="text-[#008689] font-bold shrink-0">{generationProgress}%</span>
                </div>

                <p className="text-center text-[10px] text-slate-400 font-mono mt-3">
                  POST /api/v1/ai/generate · Timeout: 60s
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 1. Header with Mode Tabs: Cấu hình mới & Lịch sử sinh câu hỏi */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[11px] font-extrabold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              Bước 2/4 • Sinh Câu Hỏi AI (Bloom)
            </span>
          </div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Sinh câu hỏi AI theo Ma trận Bloom
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Chọn giáo trình, cấu hình ma trận Bloom hoặc tra cứu lại lịch sử các đợt sinh câu hỏi AI.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Main Tab Switcher */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setActiveMainTab('generate')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeMainTab === 'generate'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Cấu hình sinh mới</span>
            </button>

            <button
              onClick={() => setActiveMainTab('history')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeMainTab === 'history'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Lịch sử sinh câu hỏi</span>
              {generationHistory.length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-blue-800 text-white">
                  {generationHistory.length}
                </span>
              )}
            </button>
          </div>

          {activeMainTab === 'generate' && (
            <div className="flex items-center gap-1.5">
              {[
                { id: 'giuaKy', label: 'Giữa kỳ (20 câu)' },
                { id: 'cuoiKy', label: 'Cuối kỳ (20 câu)' },
                { id: 'quiz15p', label: '15p (10 câu)' },
              ].map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => applyPreset(preset.id as any)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    activePreset === preset.id
                      ? 'bg-[#008689] text-white shadow-sm'
                      : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 2. BODY CONTENT: Tùy theo tab đang chọn */}
      {activeMainTab === 'history' ? (
        <div className="space-y-4">
          {/* Header & Filter Search for History */}
          <div className="bg-white border border-slate-200 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Lịch sử các đợt sinh câu hỏi AI ({filteredHistory.length})
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={historySearchQuery}
                onChange={(e) => setHistorySearchQuery(e.target.value)}
                placeholder="Tìm theo giáo trình hoặc chương..."
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:bg-white focus:border-[#008689] outline-none"
              />
              <button
                onClick={() => setActiveMainTab('generate')}
                className="px-3.5 py-1.5 rounded-xl bg-[#008689] hover:bg-[#006f72] text-white font-bold text-xs flex items-center gap-1.5 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Sinh câu hỏi mới
              </button>
            </div>
          </div>

          {filteredHistory.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                <History className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-800">
                Chưa có lịch sử sinh câu hỏi nào
              </h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                Sau khi bạn thực hiện sinh câu hỏi bằng mô hình AI, các đợt sinh cùng toàn bộ danh sách câu hỏi đã tạo sẽ được lưu trữ tự động tại đây để bạn kiểm tra lại hoặc nạp lại bất cứ lúc nào.
              </p>
              <button
                onClick={() => setActiveMainTab('generate')}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#008689] text-white text-xs font-bold hover:bg-[#006f72] transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Bắt đầu sinh câu hỏi ngay
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredHistory.map((item) => (
                <div
                  key={item.id}
                  className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-[#008689]/40 hover:shadow-sm transition-all space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-teal-50 text-[#008689] flex items-center justify-center font-bold">
                        <BookOpen className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">
                          {item.documentName}
                        </h4>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{item.createdAt}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {item.totalQuestions} câu hỏi đã sinh
                      </span>
                      <button
                        onClick={() => deleteHistoryRecord(item.id)}
                        title="Xóa đợt sinh này khỏi lịch sử"
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Chapters */}
                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="text-slate-500 font-medium">Chương áp dụng:</span>
                    {item.chapters.map((ch, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-semibold"
                      >
                        {ch}
                      </span>
                    ))}
                  </div>

                  {/* Bloom Breakdown */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span className="text-xs text-slate-500 font-medium">Ma trận Bloom:</span>
                    <span className="px-2 py-0.5 rounded-lg bg-sky-50 text-sky-700 text-[11px] font-bold border border-sky-200">
                      Nhận biết: {item.bloomDistribution?.nhanBiet ?? 0}
                    </span>
                    <span className="px-2 py-0.5 rounded-lg bg-teal-50 text-teal-700 text-[11px] font-bold border border-teal-200">
                      Thông hiểu: {item.bloomDistribution?.thongHieu ?? 0}
                    </span>
                    <span className="px-2 py-0.5 rounded-lg bg-amber-50 text-amber-700 text-[11px] font-bold border border-amber-200">
                      Vận dụng: {item.bloomDistribution?.vanDung ?? 0}
                    </span>
                    <span className="px-2 py-0.5 rounded-lg bg-rose-50 text-rose-700 text-[11px] font-bold border border-rose-200">
                      Phân tích: {item.bloomDistribution?.phanTich ?? 0}
                    </span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      onClick={() => {
                        setSelectedBook(item.documentId);
                        setSelectedChapters(item.chapters);
                        setBloomDistribution(item.bloomDistribution);
                        setActiveMainTab('generate');
                        onShowToast('info', 'Đã tải cấu hình', `Đã áp dụng cấu hình sinh câu hỏi từ ${item.documentName}.`);
                      }}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-[#008689]" />
                      Dùng lại cấu hình này
                    </button>

                    {item.questions && item.questions.length > 0 && (
                      <button
                        onClick={() => setPreviewHistoryRecord(item)}
                        className="px-3 py-1.5 rounded-xl border border-[#008689] text-[#008689] bg-[#e6f4f4]/40 hover:bg-[#e6f4f4] text-xs font-bold transition-colors flex items-center gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Xem chi tiết câu hỏi ({item.questions.length})
                      </button>
                    )}

                    {item.questions && item.questions.length > 0 && (
                      <button
                        onClick={() => {
                          onGenerateSuccess(item.questions);
                          onShowToast(
                            'success',
                            'Đã nạp bộ câu hỏi',
                            `Đã nạp ${item.questions.length} câu hỏi vào Không gian Kiểm duyệt.`
                          );
                          onNavigate('review');
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-[#008689] hover:bg-[#006f72] text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs"
                      >
                        <ArrowRight className="w-3.5 h-3.5" />
                        Nạp vào Bước 3 (Kiểm duyệt)
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Form: Parameters (2 Cols) */}
        <div className="lg:col-span-2 space-y-5">
          {/* Card 1: Chọn giáo trình & chương */}
          <div className="bg-white border border-slate-200 p-5 rounded-2xl space-y-4">
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              1. Chọn giáo trình & chương mục
            </h2>

            <div>
              <select
                value={selectedBook}
                onChange={(e) => handleSelectBook(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:bg-white focus:border-[#008689]"
              >
                {isLoadingDocuments && (
                  <option value="">Đang tải danh sách giáo trình...</option>
                )}
                {!isLoadingDocuments && documents.length === 0 && (
                  <option value="">Chưa có giáo trình sẵn sàng</option>
                )}
                {documents.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    {doc.name} ({doc.chaptersCount} chương - {doc.totalPages} trang)
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
              {chaptersList.length === 0 && (
                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-400">
                  Chưa có danh sách chương mục cho tài liệu này.
                </div>
              )}
              {chaptersList.map((ch) => {
                const isChecked = selectedChapters.includes(ch);
                return (
                  <div
                    key={ch}
                    onClick={() => handleToggleChapter(ch)}
                    className={`p-2.5 px-3 rounded-xl border cursor-pointer transition-colors flex items-center justify-between ${
                      isChecked
                        ? 'bg-[#e0f7fa]/60 border-[#008689]/40 text-[#006d70] font-semibold'
                        : 'bg-slate-50/70 border-slate-200 text-slate-600 hover:bg-white'
                    }`}
                  >
                    <span className="text-xs truncate pr-2">{ch}</span>
                    <div
                      className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                        isChecked ? 'bg-[#008689] border-[#008689]' : 'border-slate-300 bg-white'
                      }`}
                    >
                      {isChecked && <Check className="w-3 h-3 text-white" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Card 2: Thang đo Bloom */}
          <div className="bg-white border border-slate-200 p-5 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                2. Phân bổ mức độ nhận thức Bloom
              </h2>
              <span className="text-xs font-mono font-bold text-[#008689]">
                Tổng: {totalQuestions} câu
              </span>
            </div>

            <div className="space-y-4">
              {[
                { key: 'nhanBiet' as const, label: 'Mức 1: Nhận biết', accent: 'accent-sky-500' },
                { key: 'thongHieu' as const, label: 'Mức 2: Thông hiểu', accent: 'accent-teal-600' },
                { key: 'vanDung' as const, label: 'Mức 3: Vận dụng', accent: 'accent-amber-500' },
                { key: 'phanTich' as const, label: 'Mức 4: Phân tích', accent: 'accent-indigo-600' },
              ].map(({ key, label, accent }) => (
                <div key={key} className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-700">{label}</span>
                    <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-lg">
                      {bloomDistribution[key]} câu
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="20"
                    value={bloomDistribution[key]}
                    onChange={(e) =>
                      setBloomDistribution({
                        ...bloomDistribution,
                        [key]: parseInt(e.target.value) || 0,
                      })
                    }
                    className={`w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer ${accent}`}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Summary Sidebar (1 Col) */}
        <div>
          <div className="bg-white border border-slate-200 p-5 rounded-2xl space-y-4 sticky top-6">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider pb-3 border-b border-slate-100">
              Tóm tắt cấu hình
            </h3>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>Tổng số câu:</span>
                <span className="font-bold text-slate-900 font-mono">{totalQuestions} câu</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Giáo trình:</span>
                <span className="font-semibold text-slate-800 truncate max-w-[160px]" title={selectedDocument?.name || ''}>
                  {selectedDocument?.name || 'Chưa chọn'}
                </span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Số chương:</span>
                <span className="font-semibold text-slate-800">{selectedChapters.length} chương</span>
              </div>
            </div>

            {totalQuestions > 0 && (
              <div className="w-full h-2 rounded-full flex overflow-hidden bg-slate-100">
                <div style={{ width: `${(bloomDistribution.nhanBiet / totalQuestions) * 100}%` }} className="bg-sky-500" />
                <div style={{ width: `${(bloomDistribution.thongHieu / totalQuestions) * 100}%` }} className="bg-[#008689]" />
                <div style={{ width: `${(bloomDistribution.vanDung / totalQuestions) * 100}%` }} className="bg-amber-500" />
                <div style={{ width: `${(bloomDistribution.phanTich / totalQuestions) * 100}%` }} className="bg-indigo-500" />
              </div>
            )}

            <button
              onClick={handleStartGenerate}
              disabled={isGenerating || totalQuestions === 0 || selectedChapters.length === 0 || !selectedBook}
              className={`w-full py-3 text-xs font-bold rounded-xl flex items-center justify-center space-x-2 transition-all ${
                totalQuestions === 0 || selectedChapters.length === 0 || !selectedBook
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-600/25'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>{isGenerating ? 'Đang sinh câu hỏi...' : `Sinh ${totalQuestions} câu hỏi AI (Bước 2)`}</span>
            </button>
          </div>
        </div>
      </div>
      )}

      {/* ===== MODAL: XEM CHI TIẾT BỘ CÂU HỎI LỊCH SỬ ===== */}
      {previewHistoryRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-slate-900/50 p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-3xl w-full max-h-[88vh] flex flex-col overflow-hidden animate-fade-in">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-50 text-[#008689] flex items-center justify-center font-bold">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Chi tiết đợt sinh: {previewHistoryRecord.documentName}
                  </h3>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                    <span>{previewHistoryRecord.createdAt}</span>
                    <span>•</span>
                    <span className="font-semibold text-teal-700">
                      {previewHistoryRecord.totalQuestions} câu hỏi
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setPreviewHistoryRecord(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Questions List */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {previewHistoryRecord.questions.map((q, idx) => (
                <div key={q.id || idx} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-bold text-slate-900 leading-relaxed">
                      <span className="text-[#008689] font-extrabold mr-1">Câu {idx + 1}:</span>
                      {q.question}
                    </p>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white border border-slate-200 text-slate-700 shrink-0">
                      {q.bloomLevel}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {q.options.map((opt) => {
                      const isCorrect = opt.id === q.correctAnswerId;
                      return (
                        <div
                          key={opt.id}
                          className={`p-2 rounded-lg text-xs flex items-start gap-1.5 ${
                            isCorrect
                              ? 'bg-emerald-50 border border-emerald-300 text-emerald-900 font-semibold'
                              : 'bg-white border border-slate-200 text-slate-600'
                          }`}
                        >
                          <span className="font-bold">{opt.label}.</span>
                          <span>{opt.text}</span>
                        </div>
                      );
                    })}
                  </div>

                  {q.explanation && (
                    <div className="text-[11px] text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200">
                      <strong className="text-slate-700">Giải thích: </strong>
                      {q.explanation}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                onClick={() => setPreviewHistoryRecord(null)}
                className="px-4 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs"
              >
                Đóng
              </button>

              <button
                onClick={() => {
                  onGenerateSuccess(previewHistoryRecord.questions);
                  setPreviewHistoryRecord(null);
                  onShowToast(
                    'success',
                    'Đã nạp bộ câu hỏi',
                    `Đã chuyển tiếp ${previewHistoryRecord.questions.length} câu hỏi vào Không gian Kiểm duyệt.`
                  );
                  onNavigate('review');
                }}
                className="px-4 py-2 rounded-xl bg-[#008689] hover:bg-[#006f72] text-white font-bold text-xs flex items-center gap-1.5 shadow-sm"
              >
                <ArrowRight className="w-3.5 h-3.5" />
                Nạp bộ câu hỏi này vào Bước 3 (Kiểm duyệt)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
