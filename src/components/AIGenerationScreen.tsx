import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Sparkles, History } from 'lucide-react';
import { ScreenId, Question, BloomLevel, QuestionOption, UserProfile } from '../types';
import { findKnowledgeForChapter } from '../constants/curriculumData';
import apiClient from '../services/apiClient';
import { DocumentPreviewModal } from './DocumentPreviewModal';
import { downloadFileSafely } from '../utils/fileDownloadHelper';
import { normalizeVietnameseLegacyFont } from '../utils/vietnameseFontUtils';
import {
  BloomDistribution,
  DocumentItem,
  GenerationHistoryRecord,
  GenerationPreset,
  GenerationConfigPanel,
  GenerationHistoryDrawer,
  TextbookLibraryModal,
  GenerationProgressModal,
  ExamBlueprintModal,
} from './aigen';
import { ExamBlueprint } from '../types/examBlueprint';

export type { GenerationHistoryRecord, BloomDistribution, DocumentItem } from './aigen';

interface AIGenerationScreenProps {
  onNavigate: (screen: ScreenId) => void;
  onGenerateSuccess: (newQuestions?: Question[]) => void;
  onShowToast: (type: 'success' | 'info' | 'warning' | 'error', title: string, message: string) => void;
  currentUser?: UserProfile | null;
}

const FALLBACK_DOCUMENTS: DocumentItem[] = [];

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
        const labels = ['A', 'B', 'C', 'D', 'E', 'F'];
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
  } else if (
    !raw.statements &&
    !raw.shortAnswer &&
    raw.questionType !== 'TRUE_FALSE_GROUP' &&
    raw.question_type !== 'TRUE_FALSE_GROUP' &&
    raw.questionType !== 'SHORT_ANSWER' &&
    raw.question_type !== 'SHORT_ANSWER'
  ) {
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

  // [SCRUM-145] Khôi phục toàn diện dữ liệu các nhận định Đúng / Sai cho TRUE_FALSE_GROUP
  let statements = undefined;
  if (Array.isArray(raw.statements) && raw.statements.length > 0) {
    statements = raw.statements.map((stmt: any, sIdx: number) => ({
      id: String(stmt.id || `stmt-${String.fromCharCode(97 + sIdx)}`),
      label: String(stmt.label || String.fromCharCode(97 + sIdx)),
      text: String(stmt.text || stmt.content || ''),
      isCorrect: Boolean(stmt.isCorrect ?? stmt.is_correct),
      explanation: stmt.explanation ? String(stmt.explanation) : undefined,
    }));
  } else if (raw.questionType === 'TRUE_FALSE_GROUP' || raw.question_type === 'TRUE_FALSE_GROUP') {
    statements = [
      { id: 'stmt-a', label: 'a', text: 'Nhận định a', isCorrect: true },
      { id: 'stmt-b', label: 'b', text: 'Nhận định b', isCorrect: false },
      { id: 'stmt-c', label: 'c', text: 'Nhận định c', isCorrect: true },
      { id: 'stmt-d', label: 'd', text: 'Nhận định d', isCorrect: false },
    ];
  }

  // [SCRUM-145] Khôi phục dữ liệu bài đọc chung (Passage) cho câu hỏi chùm GROUP_PASSAGE
  let passageData = undefined;
  const rawPassage = raw.passageData || raw.passage_data;
  if (rawPassage && (rawPassage.content || rawPassage.title)) {
    passageData = {
      id: String(rawPassage.id || `passage-${index + 1}`),
      title: String(rawPassage.title || 'Ngữ cảnh bài đọc'),
      content: String(rawPassage.content || ''),
      hasImage: Boolean(rawPassage.hasImage || rawPassage.imageUrl),
      imageUrl: rawPassage.imageUrl || undefined,
      imageCaption: rawPassage.imageCaption || undefined,
    };
  }

  const qType =
    raw.questionType ||
    raw.question_type ||
    (statements ? 'TRUE_FALSE_GROUP' : passageData ? 'GROUP_PASSAGE' : raw.shortAnswer ? 'SHORT_ANSWER' : 'SINGLE_CHOICE');

  return {
    id: String(raw.id || `q-gemini-${Date.now()}-${index + 1}`),
    sourceChunkId: String(raw.sourceChunkId || raw.source_chunk_id || `chunk-${(index % 3) + 1}`),
    textbookName: String(raw.textbookName || raw.textbook_name || bookName || 'Giáo trình chuẩn'),
    chapter: String(raw.chapter || defaultChapter || 'Chương tổng hợp'),
    bloomLevel,
    question: String(raw.question || raw.questionText || raw.question_text || ''),
    options,
    correctAnswerId: String(raw.correctAnswerId || raw.correct_answer_id || (options[0]?.id || 'opt-a')),
    explanation: String(raw.explanation || 'Minh chứng trích xuất từ tài liệu giáo trình.'),
    confidenceScore: Number(raw.confidenceScore ?? raw.confidence_score ?? Math.floor(92 + Math.random() * 7)),
    status: 'pending',
    createdAt: 'Hôm nay',
    hasFormula: Boolean(raw.hasFormula || raw.has_formula || String(raw.question || '').includes('$')),
    hasImage: Boolean(raw.hasImage || raw.has_image || raw.imageUrl || raw.image_url),
    imageUrl: raw.imageUrl || raw.image_url || undefined,
    imageCaption: raw.imageCaption || raw.image_caption || undefined,
    questionType: qType,
    sectionId: raw.sectionId || raw.section_id,
    sectionTitle: raw.sectionTitle || raw.section_title,
    passageData,
    statements,
    shortAnswer: raw.shortAnswer ?? raw.short_answer,
    correctAnswerIds: raw.correctAnswerIds || raw.correct_answer_ids,
  };
};

const generateDraftQuestions = (
  bookName: string,
  chapters: string[],
  bloom: BloomDistribution,
  blueprint?: ExamBlueprint | null
): Question[] => {
  const result: Question[] = [];
  const timestamp = Date.now();
  let qIndex = 1;

  // [SCRUM-145] Sinh câu hỏi bản nháp/fallback bám sát theo các phần trong Exam Blueprint
  if (blueprint && blueprint.sections && blueprint.sections.length > 0) {
    blueprint.sections.forEach((sec, sIdx) => {
      const count = sec.totalQuestions || 0;
      if (count <= 0) return;
      const ch = chapters.length > 0 ? chapters[sIdx % chapters.length] : 'Chương tổng hợp';
      const knowledge = findKnowledgeForChapter(bookName, ch);

      if (sec.questionType === 'TRUE_FALSE_GROUP') {
        for (let i = 0; i < count; i++) {
          result.push({
            id: `q-bp-${timestamp}-${qIndex}`,
            sourceChunkId: `chunk-${knowledge.pageNumber}-${qIndex}`,
            textbookName: bookName,
            chapter: ch,
            bloomLevel: 'Thông hiểu',
            question: `Xét tính Đúng / Sai của các nhận định chuyên môn sau đây trong học phần:`,
            questionType: 'TRUE_FALSE_GROUP',
            sectionId: sec.id,
            sectionTitle: sec.title,
            options: [],
            correctAnswerId: 'stmt-a',
            statements: [
              { id: 'stmt-a', label: 'a', text: `Nguyên lý cơ bản của ${ch} luôn được bảo toàn trong điều kiện chuẩn.`, isCorrect: true, explanation: 'Đúng theo lý thuyết giáo trình.' },
              { id: 'stmt-b', label: 'b', text: `Hệ số đáp ứng không phụ thuộc vào tần số và môi trường làm việc.`, isCorrect: false, explanation: 'Sai vì hệ số này phụ thuộc vào môi trường.' },
              { id: 'stmt-c', label: 'c', text: `Khi tham số đầu vào tăng thì đáp ứng ra biến thiên theo hàm số xác định.`, isCorrect: true, explanation: 'Đúng theo mô hình giải tích.' },
              { id: 'stmt-d', label: 'd', text: `Sai số tích lũy bằng 0 trong mọi trường hợp khảo sát thực tế.`, isCorrect: false, explanation: 'Sai vì luôn có sai số ngẫu nhiên.' }
            ],
            explanation: `Đánh giá 4 nhận định Đúng / Sai theo chuẩn Bộ GD&ĐT cho phần ${sec.title}.`,
            confidenceScore: 95,
            status: 'pending',
            createdAt: 'Vừa sinh AI',
          });
          qIndex++;
        }
      } else if (sec.questionType === 'GROUP_PASSAGE') {
        const passData = sec.passageData || {
          id: `passage-${sec.id || sIdx}`,
          title: `Tình huống phân tích chuyên sâu về ${ch}`,
          content: `Trong nghiên cứu học phần ${bookName}, việc khảo sát hệ thống đòi hỏi phân tích toàn diện các yếu tố tác động. Khi các thông số đầu vào thay đổi, phản ứng của hệ thống và sự biến thiên các đại lượng trạng thái tuân theo quy luật bảo toàn năng lượng và đáp ứng động học. Các kỹ sư cần kiểm soát sai số đo đạc để đảm bảo độ tin cậy của toàn bộ quá trình thực nghiệm.`
        };
        for (let i = 0; i < count; i++) {
          const t = knowledge.templates[i % knowledge.templates.length];
          result.push({
            id: `q-bp-${timestamp}-${qIndex}`,
            sourceChunkId: `chunk-${knowledge.pageNumber}-${qIndex}`,
            textbookName: bookName,
            chapter: ch,
            bloomLevel: 'Vận dụng',
            question: `Dựa vào dữ liệu tình huống bài đọc trên, ${t ? t.question.toLowerCase() : 'kết luận nào sau đây là chính xác'}?`,
            questionType: 'GROUP_PASSAGE',
            sectionId: sec.id,
            sectionTitle: sec.title,
            passageData: passData,
            options: t ? t.options.map(o => ({ ...o, id: `${o.id}-${qIndex}` })) : [
              { id: `opt-a-${qIndex}`, label: 'A', text: 'Phù hợp với dữ liệu thực nghiệm trong bài đọc.' },
              { id: `opt-b-${qIndex}`, label: 'B', text: 'Mâu thuẫn với giả thiết ban đầu.' },
              { id: `opt-c-${qIndex}`, label: 'C', text: 'Chỉ xảy ra khi loại trừ toàn bộ yếu tố môi trường.' },
              { id: `opt-d-${qIndex}`, label: 'D', text: 'Không xác định được theo bài đọc.' },
            ],
            correctAnswerId: t ? `${t.correctAnswerId}-${qIndex}` : `opt-a-${qIndex}`,
            explanation: `Căn cứ theo ngữ cảnh bài đọc tình huống của ${sec.title}.`,
            confidenceScore: 94,
            status: 'pending',
            createdAt: 'Vừa sinh AI',
          });
          qIndex++;
        }
      } else if (sec.questionType === 'SHORT_ANSWER') {
        for (let i = 0; i < count; i++) {
          result.push({
            id: `q-bp-${timestamp}-${qIndex}`,
            sourceChunkId: `chunk-${knowledge.pageNumber}-${qIndex}`,
            textbookName: bookName,
            chapter: ch,
            bloomLevel: 'Vận dụng',
            question: `Hãy tính toán và điền giá trị định lượng (hoặc thuật ngữ cốt lõi) cho bài toán trong phần ${sec.title} khi các thông số đầu vào đạt mức danh định:`,
            questionType: 'SHORT_ANSWER',
            sectionId: sec.id,
            sectionTitle: sec.title,
            shortAnswer: `${10 * (i + 1)}`,
            options: [],
            correctAnswerId: '',
            explanation: `Căn cứ công thức tính toán và số liệu học phần ${bookName}.`,
            confidenceScore: 93,
            status: 'pending',
            createdAt: 'Vừa sinh AI',
          });
          qIndex++;
        }
      } else {
        // SINGLE_CHOICE or MULTIPLE_RESPONSE
        for (let i = 0; i < count; i++) {
          const t = knowledge.templates[i % knowledge.templates.length];
          result.push({
            id: `q-bp-${timestamp}-${qIndex}`,
            sourceChunkId: `chunk-${knowledge.pageNumber}-${qIndex}`,
            textbookName: bookName,
            chapter: ch,
            bloomLevel: 'Nhận biết',
            question: t ? t.question : `Khái niệm nào sau đây là chuẩn xác trong ${ch}?`,
            questionType: sec.questionType || 'SINGLE_CHOICE',
            sectionId: sec.id,
            sectionTitle: sec.title,
            options: t ? t.options.map(o => ({ ...o, id: `${o.id}-${qIndex}` })) : [
              { id: `opt-a-${qIndex}`, label: 'A', text: 'Phương án A chuẩn xác' },
              { id: `opt-b-${qIndex}`, label: 'B', text: 'Phương án B' },
              { id: `opt-c-${qIndex}`, label: 'C', text: 'Phương án C' },
              { id: `opt-d-${qIndex}`, label: 'D', text: 'Phương án D' },
            ],
            correctAnswerId: t ? `${t.correctAnswerId}-${qIndex}` : `opt-a-${qIndex}`,
            explanation: t ? t.explanation : `Minh chứng từ giáo trình ${bookName}.`,
            confidenceScore: 95,
            status: 'pending',
            createdAt: 'Vừa sinh AI',
          });
          qIndex++;
        }
      }
    });

    if (result.length > 0) {
      return result;
    }
  }

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
  currentUser,
}) => {
  const [selectedBooks, setSelectedBooks] = useState<string[]>(() => {
    const saved = localStorage.getItem('quizgen_selected_book_id');
    return saved ? [saved] : [];
  });
  const selectedBook = selectedBooks[0] || '';
  const setSelectedBook = (id: string) => {
    setSelectedBooks([id]);
    localStorage.setItem('quizgen_selected_book_id', id);
  };
  const [selectedChapters, setSelectedChapters] = useState<string[]>([]);
  const [bloomDistribution, setBloomDistribution] = useState<BloomDistribution>({
    nhanBiet: 8,
    thongHieu: 8,
    vanDung: 4,
    phanTich: 0,
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState('');
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [activePreset, setActivePreset] = useState<GenerationPreset>('giuaKy');
  const [activeMainTab, setActiveMainTab] = useState<'generate' | 'history'>('generate');
  const [isBlueprintModalOpen, setIsBlueprintModalOpen] = useState(false);
  const [blueprint, setBlueprint] = useState<ExamBlueprint>({
    id: `bp-${Date.now()}`,
    title: 'Đề thi Đa phần Chuẩn hóa',
    subject: 'Môn học',
    durationMinutes: 60,
    totalScore: 10.0,
    sections: [
      {
        id: 'sec-1',
        order: 1,
        title: 'PHẦN I: TRẮC NGHIỆM ĐƠN',
        instruction: 'Thí sinh trả lời các câu hỏi trắc nghiệm nhiều lựa chọn.',
        questionType: 'SINGLE_CHOICE',
        scorePerQuestion: 0.25,
        totalQuestions: 10,
        questions: [],
      },
    ],
  });
  const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api/v1';

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

  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [myDocuments, setMyDocuments] = useState<DocumentItem[]>([]);
  const [sharedDocuments, setSharedDocuments] = useState<DocumentItem[]>([]);
  const [chaptersByDocument, setChaptersByDocument] = useState<Record<string, string[]>>({});
  const [isLibraryModalOpen, setIsLibraryModalOpen] = useState(false);
  const [libraryModalTab, setLibraryModalTab] = useState<'my' | 'shared'>('shared');
  const [librarySearchQuery, setLibrarySearchQuery] = useState('');
  const [chapterSearchQuery, setChapterSearchQuery] = useState('');
  const [pedagogicalPrompt, setPedagogicalPrompt] = useState<string>('');
  const [previewDocumentFile, setPreviewDocumentFile] = useState<{
    url: string;
    name: string;
    size?: string;
    type?: string;
  } | null>(null);

  const handleViewOriginalDocument = () => {
    if (!selectedBook) {
      onShowToast('warning', 'Chưa chọn giáo trình', 'Vui lòng chọn một giáo trình trước khi xem tập gốc.');
      return;
    }
    const docName = selectedDocument?.name || selectedBook;
    const isWord = docName.toLowerCase().endsWith('.docx') || docName.toLowerCase().endsWith('.doc');
    const isPdf = docName.toLowerCase().endsWith('.pdf');
    const docUrl = `${API_BASE}/documents/documents/${selectedBook}/download?inline=true`;
    setPreviewDocumentFile({
      url: docUrl,
      name: docName,
      size: selectedDocument?.totalPages ? `${selectedDocument.totalPages} trang` : undefined,
      type: isPdf ? 'pdf' : isWord ? 'docx' : 'file',
    });
  };

  const parseErrorMessage = async (res: Response): Promise<string> => {
    try {
      const payload = await res.json();
      if (typeof payload?.detail === 'string') return payload.detail;
      if (typeof payload?.message === 'string') return payload.message;
    } catch {}
    return `Yêu cầu thất bại (${res.status})`;
  };

  const fetchDocuments = useCallback(async () => {
    try {
      let myDocsList: any[] = [];
      try {
        const myRes = await apiClient.fetch(
          `${API_BASE}/documents/documents?scope=my${currentUser?.id ? `&user_id=${currentUser.id}` : ''}`
        );
        if (myRes.ok) {
          const payload = await myRes.json();
          if (Array.isArray(payload)) myDocsList = payload;
        }
      } catch {}

      let localUploadedDocs: any[] = [];
      try {
        const userStorageKey = currentUser?.id
          ? `quizgen_uploaded_documents_${currentUser.id}`
          : 'quizgen_uploaded_documents';
        const rawLocal = localStorage.getItem(userStorageKey);
        if (rawLocal) {
          localUploadedDocs = JSON.parse(rawLocal).filter(
            (d: any) => d && d.id !== 'doc-kinh-te-vi-mo-2025' && d.id !== 'doc-tri-tue-nhan-tao-2026'
          );
        }
      } catch {}

      const allMy: DocumentItem[] = [...localUploadedDocs, ...myDocsList]
        .filter((item: any) => item && (item.status === 'ready' || !item.status))
        .map((item: any) => ({
          id: String(item.id),
          name: String(item.name || item.title || 'Tài liệu giáo trình'),
          status: 'ready',
          totalPages: Number(item.totalPages ?? item.total_pages ?? 120),
          chaptersCount: Number(item.chaptersCount ?? item.chapters_count ?? 4),
          isShared: false,
        }));
      const uniqueMy = allMy.filter(
        (doc, index, self) => index === self.findIndex((d) => d.id === doc.id)
      );
      setMyDocuments(uniqueMy);

      let sharedDocsList: any[] = [];
      try {
        const sharedRes = await apiClient.fetch(`${API_BASE}/documents/documents?scope=shared`);
        if (sharedRes.ok) {
          const payload = await sharedRes.json();
          if (Array.isArray(payload)) sharedDocsList = payload;
        }
      } catch {}

      const allShared: DocumentItem[] = [...sharedDocsList, ...FALLBACK_DOCUMENTS]
        .filter((item: any) => item && (item.status === 'ready' || !item.status))
        .map((item: any) => ({
          id: String(item.id),
          name: String(item.name || item.title || 'Tài liệu giáo trình'),
          status: 'ready',
          totalPages: Number(item.totalPages ?? item.total_pages ?? 120),
          chaptersCount: Number(item.chaptersCount ?? item.chapters_count ?? 4),
          isShared: true,
        }));
      const uniqueShared = allShared.filter(
        (doc, index, self) => index === self.findIndex((d) => d.id === doc.id)
      );
      setSharedDocuments(uniqueShared);

      const combinedAll = [...uniqueMy, ...uniqueShared];
      const uniqueCombined = combinedAll.filter(
        (doc, index, self) => index === self.findIndex((d) => d.id === doc.id)
      );
      setDocuments(uniqueCombined);

      const savedId = localStorage.getItem('quizgen_selected_book_id');
      if (savedId && uniqueCombined.some((d) => d.id === savedId)) {
        setSelectedBook(savedId);
      } else if (uniqueMy.length > 0) {
        setSelectedBook(uniqueMy[0].id);
      } else {
        setSelectedBook('');
        setSelectedChapters([]);
      }

      // ── Nạp cấu hình đề thi từ Quanta Butler nếu người dùng chọn 'Tự chỉnh' ──
      try {
        const pendingBlueprintStr = localStorage.getItem('quizgen_pending_exam_blueprint');
        if (pendingBlueprintStr) {
          const bp = JSON.parse(pendingBlueprintStr);
          if (bp) {
            // 1. Tự động chọn đúng sách
            const targetDoc = uniqueCombined.find(
              (d) =>
                d.id === bp.documentId ||
                (bp.documentName && d.name.toLowerCase().includes(bp.documentName.toLowerCase()))
            );
            if (targetDoc) {
              setSelectedBook(targetDoc.id);
              localStorage.setItem('quizgen_selected_book_id', targetDoc.id);
            }

            // 2. Tự động tính toán và điền ma trận Bloom
            const count = Number(bp.questionCount || 20);
            const ratio = bp.bloomRatio || { know: 30, understand: 40, apply: 20, analyze: 10 };
            const nb = Math.round((count * (ratio.know || 25)) / 100);
            const th = Math.round((count * (ratio.understand || 25)) / 100);
            const vd = Math.round((count * (ratio.apply || 25)) / 100);
            const vdc = Math.max(0, count - nb - th - vd);

            setBloomDistribution({
              nhanBiet: nb,
              thongHieu: th,
              vanDung: vd,
              phanTich: vdc,
            });

            // 3. Tự động chọn chương
            if (bp.chapter) {
              setSelectedChapters([bp.chapter]);
            }

            onShowToast(
              'info',
              'Quanta Butler đã nạp ma trận',
              `Đã tự động điền cấu hình ${count} câu hỏi theo đề xuất của Quanta. Bạn có thể thoải mái chỉnh sửa thêm!`
            );
            localStorage.removeItem('quizgen_pending_exam_blueprint');
          }
        }
      } catch {}
    } catch {
      setMyDocuments([]);
      const fallbackShared: DocumentItem[] = FALLBACK_DOCUMENTS.map((item: any) => ({
        id: String(item.id),
        name: String(item.name || item.title || 'Tài liệu giáo trình'),
        status: 'ready',
        totalPages: Number(item.totalPages ?? item.total_pages ?? 120),
        chaptersCount: Number(item.chaptersCount ?? item.chapters_count ?? 4),
        isShared: true,
      }));
      setSharedDocuments(fallbackShared);
      setDocuments(fallbackShared);
      const savedId = localStorage.getItem('quizgen_selected_book_id');
      if (savedId && fallbackShared.some((d) => d.id === savedId)) {
        setSelectedBook(savedId);
      } else {
        setSelectedBook('');
        setSelectedChapters([]);
      }
    }
  }, [API_BASE, currentUser?.id]);

  useEffect(() => {
    void fetchDocuments();
  }, [fetchDocuments]);

  const selectedDocument = useMemo(
    () =>
      myDocuments.find((doc) => doc.id === selectedBook) ||
      sharedDocuments.find((doc) => doc.id === selectedBook) ||
      documents.find((doc) => doc.id === selectedBook) ||
      null,
    [myDocuments, sharedDocuments, documents, selectedBook]
  );

  // Đồng bộ thời gian thực giáo trình đang chọn ra toàn hệ thống & Quanta Copilot
  useEffect(() => {
    if (selectedDocument) {
      try {
        localStorage.setItem('quizgen_selected_book_id', selectedDocument.id);
        localStorage.setItem('quizgen_selected_book_name', selectedDocument.name);
        localStorage.setItem('quizgen_selected_book_pages', String(selectedDocument.totalPages || 120));
        window.dispatchEvent(
          new CustomEvent('quizgen_book_selected', {
            detail: {
              id: selectedDocument.id,
              name: selectedDocument.name,
              totalPages: selectedDocument.totalPages,
            },
          })
        );
      } catch {}
    }
  }, [selectedDocument]);

  // Lắng nghe sự kiện người dùng bấm 'Tự chỉnh' từ Quanta Blueprint Card (kể cả khi đang ở Bước 2)
  useEffect(() => {
    const handleApplyBlueprint = (e: any) => {
      const bp = e.detail;
      if (!bp) return;

      // Đảm bảo đang mở tab cấu hình sinh mới
      setActiveMainTab('generate');

      // 1. Tự động chọn đúng sách
      if (bp.documentId || bp.documentName) {
        const allAvailable = [...documents, ...myDocuments, ...sharedDocuments];
        const targetDoc = allAvailable.find(
          (d) =>
            (bp.documentId && d.id === bp.documentId) ||
            (bp.documentName && (
              d.name.toLowerCase().includes(bp.documentName.toLowerCase()) ||
              bp.documentName.toLowerCase().includes(d.name.toLowerCase()) ||
              d.id === bp.documentName
            ))
        );
        if (targetDoc) {
          setSelectedBook(targetDoc.id);
          try {
            localStorage.setItem('quizgen_selected_book_id', targetDoc.id);
            localStorage.setItem('quizgen_selected_book_name', targetDoc.name);
            localStorage.setItem('quizgen_selected_book_pages', String(targetDoc.totalPages || 120));
          } catch {}
        } else if (bp.documentId) {
          setSelectedBook(bp.documentId);
          try {
            localStorage.setItem('quizgen_selected_book_id', bp.documentId);
            if (bp.documentName) localStorage.setItem('quizgen_selected_book_name', bp.documentName);
          } catch {}
        }
      }

      // 2. Tự động tính toán và điền ma trận Bloom
      const count = Number(bp.questionCount || 20);
      const ratio = bp.bloomRatio || { know: 30, understand: 40, apply: 20, analyze: 10 };
      const nb = Math.round((count * (ratio.know || 25)) / 100);
      const th = Math.round((count * (ratio.understand || 25)) / 100);
      const vd = Math.round((count * (ratio.apply || 25)) / 100);
      const vdc = Math.max(0, count - nb - th - vd);

      setBloomDistribution({
        nhanBiet: nb,
        thongHieu: th,
        vanDung: vd,
        phanTich: vdc,
      });

      // 3. Tự động chọn chương
      if (bp.chapter && bp.chapter !== 'Toàn bộ giáo trình') {
        setSelectedChapters([bp.chapter]);
      }

      onShowToast(
        'success',
        'Quanta đã nạp cấu hình đề thi!',
        `Đã tự động điền cấu hình ma trận ${count} câu hỏi theo đề xuất của Quanta. Thầy/Cô có thể tự do điều chỉnh thêm!`
      );
    };

    window.addEventListener('quizgen_apply_blueprint', handleApplyBlueprint);
    return () => window.removeEventListener('quizgen_apply_blueprint', handleApplyBlueprint);
  }, [documents, myDocuments, sharedDocuments, onShowToast]);

  const chaptersList = useMemo(() => {
    if (selectedBooks.length === 0) return [];
    const set = new Set<string>();
    selectedBooks.forEach((bId) => {
      const list = (
        chaptersByDocument[bId] ||
        FALLBACK_CHAPTERS[bId] ||
        DEFAULT_CUSTOM_CHAPTERS
      );
      list.forEach((ch: string) => set.add(normalizeVietnameseLegacyFont(ch)));
    });
    return Array.from(set);
  }, [selectedBooks, chaptersByDocument]);

  const chaptersGroupedByDocument = useMemo(() => {
    return selectedBooks.map((bId) => {
      const doc =
        documents.find((d) => d.id === bId) ||
        myDocuments.find((d) => d.id === bId) ||
        sharedDocuments.find((d) => d.id === bId);
      const list = (chaptersByDocument[bId] || FALLBACK_CHAPTERS[bId] || DEFAULT_CUSTOM_CHAPTERS).map((ch) =>
        normalizeVietnameseLegacyFont(ch)
      );
      return {
        documentId: bId,
        documentName: doc?.name || bId,
        chapters: list,
      };
    });
  }, [selectedBooks, documents, myDocuments, sharedDocuments, chaptersByDocument]);

  const filteredChapters = useMemo(() => {
    if (!chapterSearchQuery.trim()) return chaptersList;
    const q = chapterSearchQuery.toLowerCase();
    return chaptersList.filter((ch) => ch.toLowerCase().includes(q));
  }, [chaptersList, chapterSearchQuery]);

  const handleSelectBook = (doc: DocumentItem) => {
    setSelectedBooks((prev) => (prev.includes(doc.id) ? prev : [...prev, doc.id]));
    localStorage.setItem('quizgen_selected_book_id', doc.id);
    const available = chaptersByDocument[doc.id] || FALLBACK_CHAPTERS[doc.id] || [];
    if (available.length > 0) {
      setSelectedChapters((prev) => Array.from(new Set([...prev, available[0]])));
    }
    setIsLibraryModalOpen(false);
    onShowToast(
      'success',
      'Đã chọn giáo trình',
      `Đã áp dụng giáo trình "${doc.name}" vào danh sách biên soạn đề.`
    );
  };

  const handleToggleSelectBook = (bookId: string) => {
    setSelectedBooks((prev) => {
      let next: string[];
      if (prev.includes(bookId)) {
        next = prev.filter((id) => id !== bookId);
        if (next.length === 0) {
          next = [bookId];
        }
      } else {
        next = [...prev, bookId];
      }
      if (next[0]) localStorage.setItem('quizgen_selected_book_id', next[0]);
      return next;
    });
  };

  useEffect(() => {
    if (selectedBooks.length === 0) {
      setSelectedChapters([]);
      return;
    }

    const allAvailable = selectedBooks.flatMap(
      (bId) => chaptersByDocument[bId] || FALLBACK_CHAPTERS[bId] || []
    );
    if (allAvailable.length > 0) {
      setSelectedChapters((prev) => {
        const stillValid = prev.filter((c) => allAvailable.includes(c));
        return stillValid.length > 0 ? stillValid : [allAvailable[0]];
      });
    }

    selectedBooks.forEach((bId) => {
      if (chaptersByDocument[bId]?.length) return;

      if (FALLBACK_CHAPTERS[bId]) {
        setChaptersByDocument((prev) => ({ ...prev, [bId]: FALLBACK_CHAPTERS[bId] }));
        return;
      }

      const loadChapters = async () => {
        try {
          let res = await apiClient.fetch(`${API_BASE}/documents/documents/${bId}`);
          if (!res.ok) {
            res = await apiClient.fetch(`${API_BASE}/documents/${bId}`);
          }
          if (!res.ok) {
            throw new Error(await parseErrorMessage(res));
          }
          const detail = await res.json();
          const rawChapters = Array.isArray(detail?.chapters) ? detail.chapters.filter(Boolean) : [];
          const chapters = rawChapters.map((c: string) => normalizeVietnameseLegacyFont(c));
          if (chapters.length > 0) {
            setChaptersByDocument((prev) => ({ ...prev, [bId]: chapters }));
            setSelectedChapters((prev) => Array.from(new Set([...prev, chapters[0]])));
          } else {
            const defaultCh = ['Toàn bộ nội dung tài liệu'];
            setChaptersByDocument((prev) => ({ ...prev, [bId]: defaultCh }));
            setSelectedChapters((prev) => Array.from(new Set([...prev, ...defaultCh])));
          }
        } catch {
          const defaultCh = ['Toàn bộ nội dung tài liệu'];
          setChaptersByDocument((prev) => ({ ...prev, [bId]: defaultCh }));
          setSelectedChapters((prev) => Array.from(new Set([...prev, ...defaultCh])));
        }
      };

      void loadChapters();
    });
  }, [selectedBooks, API_BASE, chaptersByDocument]);

  const totalQuestions =
    bloomDistribution.nhanBiet +
    bloomDistribution.thongHieu +
    bloomDistribution.vanDung +
    bloomDistribution.phanTich;

  const applyPreset = (preset: GenerationPreset) => {
    setActivePreset(preset);
    if (preset === 'giuaKy') {
      setBloomDistribution({ nhanBiet: 8, thongHieu: 8, vanDung: 4, phanTich: 0 });
      onShowToast('info', 'Áp dụng khuôn mẫu', 'Đề thi Giữa kỳ (20 câu): 40% Nhận biết, 40% Thông hiểu, 20% Vận dụng');
    } else if (preset === 'cuoiKy') {
      setBloomDistribution({ nhanBiet: 12, thongHieu: 16, vanDung: 8, phanTich: 4 });
      onShowToast('info', 'Áp dụng khuôn mẫu', 'Đề thi Cuối kỳ (40 câu): 30% Nhận biết, 40% Thông hiểu, 20% Vận dụng, 10% Phân tích');
    } else if (preset === 'quiz15p') {
      setBloomDistribution({ nhanBiet: 7, thongHieu: 3, vanDung: 0, phanTich: 0 });
      onShowToast('info', 'Áp dụng khuôn mẫu', 'Kiểm tra 15 phút (10 câu): 70% Nhận biết, 30% Thông hiểu');
    }
  };

  const handleToggleChapter = (ch: string) => {
    if (selectedChapters.includes(ch)) {
      setSelectedChapters(selectedChapters.filter((c) => c !== ch));
    } else {
      setSelectedChapters([...selectedChapters, ch]);
    }
  };

  const handleSelectAllChapters = (selectAll: boolean) => {
    if (selectAll) {
      setSelectedChapters([...chaptersList]);
    } else {
      setSelectedChapters([]);
    }
  };

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
    setGenerationStep('Đang đọc hiểu và trích xuất nội dung từ giáo trình môn học...');

    const bookName = selectedDocument?.name || 'Tài liệu đã chọn';
    const defaultChapter = selectedChapters[0] || 'Chương tổng hợp';

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 300000);

    const progressTimer = setInterval(() => {
      setGenerationProgress((prev) => {
        if (prev < 30) return prev + 4;
        if (prev < 65) return prev + 2;
        if (prev < 88) return prev + 1;
        if (prev < 95) return prev + 0.5;
        return prev;
      });
    }, 1200);

    const stepTimer2 = setTimeout(() => {
      setGenerationStep('Mô hình Gemini AI đang tổng hợp kiến thức và sinh câu hỏi theo Thang đo Bloom...');
    }, 2500);

    const stepTimer3 = setTimeout(() => {
      setGenerationStep('Kiểm tra minh chứng trích dẫn và đối soát phương án trả lời...');
    }, 8000);

    try {
      const payload = {
        documentId: selectedBook,
        document_id: selectedBook,
        documentIds: selectedBooks.length > 0 ? selectedBooks : [selectedBook],
        document_ids: selectedBooks.length > 0 ? selectedBooks : [selectedBook],
        document_name: selectedDocument?.name || '',
        documentName: selectedDocument?.name || '',
        chapters: selectedChapters,
        bloomMatrix: bloomDistribution,
        bloom_matrix: bloomDistribution,
        pedagogicalPrompt: pedagogicalPrompt.trim(),
        pedagogical_prompt: pedagogicalPrompt.trim(),
        blueprint: blueprint,
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

      // [SỬA LỖI LỆCH SỐ LƯỢNG]: Đảm bảo số lượng câu hỏi nhận được khớp với Blueprint hoặc ma trận Bloom
      const expectedTotalQuestions =
        blueprint && blueprint.sections && blueprint.sections.length > 0
          ? blueprint.sections.reduce((acc, s) => acc + (s.totalQuestions || 0), 0)
          : (bloomDistribution.nhanBiet + bloomDistribution.thongHieu + bloomDistribution.vanDung + bloomDistribution.phanTich);

      const trimmedRaw =
        expectedTotalQuestions > 0 && rawQuestions.length > expectedTotalQuestions
          ? rawQuestions.slice(0, expectedTotalQuestions)
          : rawQuestions;

      const mappedQuestions: Question[] = trimmedRaw.map((item, index) =>
        normalizeGeneratedQuestion(item, bookName, defaultChapter, index)
      );

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
        if (selectedBook) {
          apiClient.post(`/documents/${selectedBook}/increment-usage`).catch(() => {});
        }
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
        msg = 'Yêu cầu sinh câu hỏi quá thời gian chờ (Timeout > 5 phút). Vui lòng thử lại với số lượng câu hỏi ít hơn hoặc kiểm tra kết nối mạng.';
      } else if (isNetworkErr) {
        msg = 'Không thể kết nối đến máy chủ AI Gateway. Vui lòng kiểm tra trạng thái mạng hoặc liên hệ quản trị viên.';
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
    const bookName = selectedDocument?.name || 'Tài liệu đã chọn';
    const fallbackQuestions = generateDraftQuestions(bookName, selectedChapters, bloomDistribution, blueprint);
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

  return (
    <div className="flex-1 p-3.5 sm:p-6 md:p-8 overflow-y-auto space-y-4 sm:space-y-6 bg-[#f7f9fb] text-slate-800 relative">
      {/* AI Generation Processing Overlay */}
      <GenerationProgressModal
        isGenerating={isGenerating}
        generationError={generationError}
        generationStep={generationStep}
        generationProgress={generationProgress}
        totalQuestions={totalQuestions}
        onRetry={handleStartGenerate}
        onUseFallback={handleUseFallbackQuestions}
        onClose={() => {
          setIsGenerating(false);
          setGenerationError(null);
        }}
      />

      {/* Header with Mode Tabs: Cấu hình mới & Lịch sử sinh câu hỏi */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pb-3 sm:pb-4 border-b border-slate-200">
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
                { id: 'giuaKy' as const, label: 'Giữa kỳ (20 câu)' },
                { id: 'cuoiKy' as const, label: 'Cuối kỳ (40 câu)' },
                { id: 'quiz15p' as const, label: '15p (10 câu)' },
              ].map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => applyPreset(preset.id)}
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

      {/* Main Tab Content */}
      {activeMainTab === 'history' ? (
        <GenerationHistoryDrawer
          history={generationHistory}
          onRestoreConfig={(record) => {
            setSelectedBook(record.documentId);
            setSelectedChapters(record.chapters);
            setBloomDistribution(record.bloomDistribution);
            setActiveMainTab('generate');
            onShowToast('info', 'Đã tải cấu hình', `Đã áp dụng cấu hình sinh câu hỏi từ ${record.documentName}.`);
          }}
          onApplyQuestions={(questions) => {
            onGenerateSuccess(questions);
            onShowToast(
              'success',
              'Đã nạp bộ câu hỏi',
              `Đã nạp ${questions.length} câu hỏi vào Không gian Kiểm duyệt.`
            );
            onNavigate('review');
          }}
          onDeleteRecord={deleteHistoryRecord}
          onNavigateToGenerate={() => setActiveMainTab('generate')}
        />
      ) : (
        <GenerationConfigPanel
          selectedBook={selectedBook}
          selectedBooks={selectedBooks}
          chaptersGroupedByDocument={chaptersGroupedByDocument}
          onRemoveBook={(bId) => {
            setSelectedBooks((prev) => {
              const next = prev.filter((id) => id !== bId);
              return next.length > 0 ? next : prev;
            });
          }}
          selectedDocument={selectedDocument}
          sharedDocuments={sharedDocuments}
          myDocuments={myDocuments}
          chaptersList={chaptersList}
          filteredChapters={filteredChapters}
          selectedChapters={selectedChapters}
          chapterSearchQuery={chapterSearchQuery}
          onChapterSearchChange={setChapterSearchQuery}
          onToggleChapter={handleToggleChapter}
          onSelectAllChapters={handleSelectAllChapters}
          onOpenLibraryModal={(tab) => {
            setLibraryModalTab(tab);
            setIsLibraryModalOpen(true);
          }}
          onNavigateUpload={() => onNavigate('upload')}
          onViewOriginalDocument={handleViewOriginalDocument}
          bloomDistribution={bloomDistribution}
          onBloomDistributionChange={setBloomDistribution}
          totalQuestions={totalQuestions}
          pedagogicalPrompt={pedagogicalPrompt}
          onPedagogicalPromptChange={setPedagogicalPrompt}
          isGenerating={isGenerating}
          onStartGenerate={handleStartGenerate}
          blueprint={blueprint}
          onOpenBlueprintModal={() => setIsBlueprintModalOpen(true)}
        />
      )}

      {/* Multi-part Exam Blueprint Modal */}
      <ExamBlueprintModal
        isOpen={isBlueprintModalOpen}
        onClose={() => setIsBlueprintModalOpen(false)}
        blueprint={blueprint}
        onSaveBlueprint={(newBp) => {
          setBlueprint(newBp);
          const totalQ = newBp.sections.reduce((acc, s) => acc + (s.totalQuestions || 0), 0);
          if (totalQ > 0) {
            const part = Math.max(1, Math.floor(totalQ / 4));
            setBloomDistribution({
              nhanBiet: part,
              thongHieu: part,
              vanDung: part,
              phanTich: Math.max(0, totalQ - part * 3),
            });
          }
          onShowToast(
            'success',
            'Đã cập nhật cấu trúc đề',
            `Đề thi cấu hình ${newBp.sections.length} phần thi với ${totalQ} câu hỏi.`
          );
        }}
      />

      {/* Unified Textbook Picker Modal */}
      <TextbookLibraryModal
        isOpen={isLibraryModalOpen}
        onClose={() => setIsLibraryModalOpen(false)}
        libraryModalTab={libraryModalTab}
        onTabChange={setLibraryModalTab}
        librarySearchQuery={librarySearchQuery}
        onSearchChange={setLibrarySearchQuery}
        myDocuments={myDocuments}
        sharedDocuments={sharedDocuments}
        selectedBook={selectedBook}
        onSelectBook={handleSelectBook}
        onNavigateUpload={() => {
          setIsLibraryModalOpen(false);
          onNavigate('upload');
        }}
      />

      {/* Universal Document Preview Modal (Xem tập gốc) */}
      {previewDocumentFile && (
        <DocumentPreviewModal
          isOpen={Boolean(previewDocumentFile)}
          fileUrl={previewDocumentFile.url}
          fileName={previewDocumentFile.name}
          fileSize={previewDocumentFile.size}
          fileType={previewDocumentFile.type}
          onClose={() => setPreviewDocumentFile(null)}
          onDownload={() => {
            downloadFileSafely(previewDocumentFile.name, previewDocumentFile.url, onShowToast);
          }}
        />
      )}
    </div>
  );
};
