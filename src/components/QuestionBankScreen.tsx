import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Search,
  Download,
  FileSpreadsheet,
  Archive,
  CheckCircle2,
  Check,
  ChevronRight,
  BookOpen,
  FileText,
  ChevronDown,
  ChevronUp,
  Loader2,
  Shuffle,
  Eye,
  Printer,
  KeyRound,
  ListChecks,
  Building2,
  GraduationCap,
  FileQuestion,
  History,
  X,
  Save,
  FolderOpen,
} from 'lucide-react';
import { Question, BloomLevel, UserProfile } from '../types';
import apiClient, { API_BASE } from '../services/apiClient';
import MathRenderer from './MathRenderer';

export interface SavedExamItem {
  id: string;
  title: string;
  subject: string;
  faculty?: string;
  university?: string;
  durationMinutes: number;
  examCodeCount: number;
  examCodes: string[];
  questionCount: number;
  questions?: Question[];
  createdAt: string;
  format?: string;
}

interface QuestionBankScreenProps {
  questions: Question[];
  onShowToast: (
    type: 'success' | 'info' | 'warning' | 'error',
    title: string,
    message: string
  ) => void;
  currentUser?: UserProfile | null;
  onNavigate?: (screen: any) => void;
}

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

// Deterministic seeded shuffle per exam code so 101, 102, 103, 104 have distinct question & option orders
function shuffleWithSeed<T>(items: T[], seed: number): T[] {
  const arr = [...items];
  let s = seed;
  for (let i = arr.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

export const QuestionBankScreen: React.FC<QuestionBankScreenProps> = ({
  questions,
  onShowToast,
  currentUser,
  onNavigate,
}) => {
  const [viewMode, setViewMode] = useState<'preview_paper' | 'question_list' | 'answer_key'>(
    'preview_paper'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedBloom, setSelectedBloom] = useState<'all' | BloomLevel>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isExporting, setIsExporting] = useState<string | null>(null);

  // Exam Paper Configuration for the Lecturer
  const [examTitle, setExamTitle] = useState('ĐỀ KIỂM TRA GIỮA KỲ / KẾT THÚC HỌC PHẦN');
  const [universityName, setUniversityName] = useState<string>(
    currentUser?.university || 'TRƯỜNG ĐẠI HỌC GIAO THÔNG VẬN TẢI TP.HCM (UTH)'
  );
  const [facultyName, setFacultyName] = useState<string>(
    currentUser?.faculty || currentUser?.department || 'KHOA CÔNG NGHỆ THÔNG TIN'
  );
  const [subjectName, setSubjectName] = useState<string>(() => {
    if (questions.length > 0 && questions[0]?.textbookName) {
      return questions[0].textbookName.replace(/\.[^/.]+$/, '');
    }
    return '';
  });
  const [examDuration, setExamDuration] = useState<number>(60);
  const [examCodeCount, setExamCodeCount] = useState<number>(4);
  const availableCodes = useMemo(() => {
    const count = Math.max(1, Math.min(8, examCodeCount));
    const list: string[] = [];
    for (let i = 0; i < count; i++) {
      list.push(String(101 + i));
    }
    return list;
  }, [examCodeCount]);

  const [activeExamCode, setActiveExamCode] = useState<string>('101');

  useEffect(() => {
    if (!availableCodes.includes(activeExamCode)) {
      setActiveExamCode(availableCodes[0] || '101');
    }
  }, [availableCodes, activeExamCode]);

  const [isExamHistoryOpen, setIsExamHistoryOpen] = useState(false);
  const [savedExams, setSavedExams] = useState<SavedExamItem[]>(() => {
    try {
      const stored = localStorage.getItem('quizgen_saved_exams');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const fetchSavedExams = useCallback(async () => {
    try {
      const res = await apiClient.fetch(`${API_BASE}/exams`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setSavedExams((prev) => {
            const map = new Map<string, SavedExamItem>();
            prev.forEach((e) => map.set(e.id, e));
            data.forEach((e: any) => {
              const eid = e.id;
              if (!map.has(eid)) {
                map.set(eid, {
                  id: eid,
                  title: e.title || 'Đề kiểm tra',
                  subject: e.subject || 'Học phần',
                  faculty: e.faculty || '',
                  university: e.university || '',
                  durationMinutes: e.durationMinutes || 60,
                  examCodeCount: Array.isArray(e.examCodes) ? e.examCodes.length : 4,
                  examCodes: Array.isArray(e.examCodes) ? e.examCodes : ['101', '102', '103', '104'],
                  questionCount: e.questionCount || (Array.isArray(e.selectedQuestionIds) ? e.selectedQuestionIds.length : 0),
                  createdAt: e.createdAt ? new Date(e.createdAt).toLocaleString('vi-VN') : 'Gần đây',
                  format: e.format || 'docx',
                });
              }
            });
            return Array.from(map.values()).sort((a, b) => (b.id > a.id ? 1 : -1));
          });
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchSavedExams();
  }, [fetchSavedExams]);

  const saveExamToStorageAndApi = async (exportFormat: string) => {
    const newExamId = `exam-${Date.now()}`;
    const newRecord: SavedExamItem = {
      id: newExamId,
      title: examTitle,
      subject: subjectName || 'Chưa đặt tên học phần',
      faculty: facultyName,
      university: universityName,
      durationMinutes: examDuration,
      examCodeCount,
      examCodes: availableCodes,
      questionCount: targetExamQuestions.length,
      questions: targetExamQuestions,
      createdAt: new Date().toLocaleString('vi-VN'),
      format: exportFormat,
    };

    setSavedExams((prev) => {
      const next = [newRecord, ...prev.filter((e) => e.id !== newRecord.id)].slice(0, 50);
      try {
        localStorage.setItem('quizgen_saved_exams', JSON.stringify(next));
      } catch {}
      return next;
    });

    try {
      await apiClient.fetch(`${API_BASE}/exams/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: newExamId,
          title: examTitle,
          subject: subjectName || 'Chưa đặt tên học phần',
          faculty: facultyName,
          university: universityName,
          durationMinutes: examDuration,
          examCodes: availableCodes,
          selectedQuestionIds: targetExamQuestions.map((q) => q.id),
          format: exportFormat,
          questions: targetExamQuestions,
        }),
      });
    } catch {}
  };

  const handleLoadSavedExam = async (item: SavedExamItem) => {
    setExamTitle(item.title);
    setSubjectName(item.subject);
    if (item.university) setUniversityName(item.university);
    if (item.faculty) setFacultyName(item.faculty);
    if (item.durationMinutes) setExamDuration(item.durationMinutes);
    if (item.examCodeCount) setExamCodeCount(item.examCodeCount);
    else if (item.examCodes?.length) setExamCodeCount(item.examCodes.length);

    if (item.questions && item.questions.length > 0) {
      setSelectedIds(item.questions.map((q) => q.id));
    } else {
      try {
        const res = await apiClient.fetch(`${API_BASE}/exams/${item.id}`);
        if (res.ok) {
          const detail = await res.json();
          if (Array.isArray(detail?.questions) && detail.questions.length > 0) {
            setSelectedIds(detail.questions.map((q: any) => q.id));
          }
        }
      } catch {}
    }

    setIsExamHistoryOpen(false);
    onShowToast(
      'success',
      'Đã nạp đề thi thành công',
      `Đề "${item.title}" (${item.subject}) đã sẵn sàng để in và xuất bản.`
    );
  };

  const handleDeleteSavedExam = async (id: string) => {
    setSavedExams((prev) => {
      const next = prev.filter((e) => e.id !== id);
      try {
        localStorage.setItem('quizgen_saved_exams', JSON.stringify(next));
      } catch {}
      return next;
    });
    try {
      await apiClient.fetch(`${API_BASE}/exams/${id}`, { method: 'DELETE' });
    } catch {}
    onShowToast('info', 'Đã xóa bản ghi đề thi', 'Đã xóa đề thi khỏi danh sách đã lưu.');
  };

  const [shuffleCounter, setShuffleCounter] = useState<number>(1);

  React.useEffect(() => {
    if (currentUser?.university) {
      setUniversityName(currentUser.university);
    }
    if (currentUser?.faculty || currentUser?.department) {
      setFacultyName(currentUser.faculty || currentUser.department || '');
    }
  }, [currentUser]);

  React.useEffect(() => {
    if (!subjectName && questions.length > 0 && questions[0]?.textbookName) {
      setSubjectName(questions[0].textbookName.replace(/\.[^/.]+$/, ''));
    }
  }, [questions]);

  React.useEffect(() => {
    if (selectedSubject !== 'all') {
      setSubjectName(selectedSubject.replace(/\.[^/.]+$/, ''));
    }
  }, [selectedSubject]);

  const bankPool = questions.filter((q) => q.status !== 'rejected');
  const effectivePool = bankPool.length > 0 ? bankPool : questions;

  const subjects = Array.from(new Set(effectivePool.map((q) => q.textbookName)));

  const filteredQuestions = effectivePool.filter((q) => {
    const matchSearch =
      q.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.chapter.toLowerCase().includes(searchQuery.toLowerCase());
    const matchSubject = selectedSubject === 'all' || q.textbookName === selectedSubject;
    const matchBloom = selectedBloom === 'all' || q.bloomLevel === selectedBloom;
    return matchSearch && matchSubject && matchBloom;
  });

  const targetExamQuestions = useMemo(() => {
    return selectedIds.length > 0
      ? filteredQuestions.filter((q) => selectedIds.includes(q.id))
      : filteredQuestions;
  }, [filteredQuestions, selectedIds]);

  // Generate shuffled exam variants with dynamic codes (101..10N) and shuffled options
  const examVariants = useMemo(() => {
    const labels = ['A', 'B', 'C', 'D'];
    const map: Record<
      string,
      Array<{
        id: string;
        question: string;
        bloomLevel: BloomLevel;
        chapter: string;
        explanation: string;
        options: Array<{ id: string; label: string; text: string; isCorrect: boolean }>;
        correctLabel: string;
        hasImage?: boolean;
        imageUrl?: string;
        imageCaption?: string;
        hasFormula?: boolean;
      }>
    > = {};

    availableCodes.forEach((code, cIdx) => {
      const baseSeed = Number(code) * 31 + shuffleCounter * 97 + cIdx * 17;
      const shuffledQs = shuffleWithSeed(targetExamQuestions, baseSeed);
      map[code] = shuffledQs.map((q, qIdx) => {
        const shuffledOpts = shuffleWithSeed(q.options, baseSeed + qIdx * 13).map(
          (opt, oIdx) => ({
            id: opt.id,
            label: labels[oIdx] || opt.label,
            text: opt.text,
            isCorrect: opt.id === q.correctAnswerId,
          })
        );
        const correctOpt = shuffledOpts.find((o) => o.isCorrect) || shuffledOpts[0];
        return {
          id: q.id,
          question: q.question,
          bloomLevel: q.bloomLevel,
          chapter: q.chapter,
          explanation: q.explanation,
          options: shuffledOpts,
          correctLabel: correctOpt ? correctOpt.label : 'A',
          hasImage: q.hasImage || !!((q as any).imageUrl || (q as any).image_url),
          imageUrl: (q as any).imageUrl || (q as any).image_url || q.imageUrl,
          imageCaption: (q as any).imageCaption || (q as any).image_caption || q.imageCaption,
          hasFormula: q.hasFormula,
        };
      });
    });

    return map;
  }, [availableCodes, targetExamQuestions, shuffleCounter]);

  const activeVariantQuestions = examVariants[activeExamCode] || [];

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredQuestions.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredQuestions.map((q) => q.id));
    }
  };

  const handleReshuffleCodes = () => {
    setShuffleCounter((c) => c + 1);
    onShowToast(
      'success',
      `Đã trộn mới ${examCodeCount} Mã đề (${availableCodes.join(', ')})`,
      `Thuật toán Fisher-Yates đã hoán vị thứ tự câu hỏi và phương án A/B/C/D cho cả ${examCodeCount} mã đề.`
    );
  };

  const triggerDownload = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  };

  const handlePrintExamPaper = () => {
    if (activeVariantQuestions.length === 0) {
      onShowToast('warning', 'Không có câu hỏi để in', 'Vui lòng nạp hoặc tạo câu hỏi trước khi in tờ đề.');
      return;
    }

    const printElement = document.getElementById('printable-exam-paper');
    if (!printElement) {
      window.print();
      return;
    }

    // Xóa iframe in cũ nếu có
    const oldFrame = document.getElementById('quizgen-exam-print-frame');
    if (oldFrame) oldFrame.remove();

    // Tạo iframe ẩn độc lập để chỉ in toàn bộ nội dung tờ đề A4
    const printFrame = document.createElement('iframe');
    printFrame.id = 'quizgen-exam-print-frame';
    printFrame.style.position = 'fixed';
    printFrame.style.right = '0';
    printFrame.style.bottom = '0';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = '0';
    printFrame.style.zIndex = '-9999';
    document.body.appendChild(printFrame);

    const frameDoc = printFrame.contentWindow?.document || printFrame.contentDocument;
    if (!frameDoc) {
      window.print();
      return;
    }

    // Thu thập stylesheet hiện hành của trang
    const styleTags = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map((el) => el.outerHTML)
      .join('\n');

    frameDoc.open();
    frameDoc.write(`
      <!DOCTYPE html>
      <html lang="vi">
        <head>
          <meta charset="utf-8" />
          <title>${examTitle || 'Đề thi'} - Mã đề ${activeExamCode}</title>
          ${styleTags}
          <style>
            @page {
              size: A4 portrait;
              margin: 15mm 15mm 15mm 15mm;
            }
            * {
              box-sizing: border-box;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            body {
              background: #ffffff !important;
              color: #0f172a !important;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
              margin: 0 !important;
              padding: 0 !important;
              line-height: 1.5 !important;
            }
            .no-print {
              display: none !important;
            }
            .exam-paper-container {
              width: 100% !important;
              max-width: 100% !important;
              margin: 0 auto !important;
              padding: 0 !important;
              background: #ffffff !important;
            }
            .exam-header-box {
              border: 2px solid #0f172a !important;
              padding: 12px 16px !important;
              border-radius: 6px !important;
              margin-bottom: 20px !important;
            }
            .exam-question-item {
              break-inside: avoid !important;
              page-break-inside: avoid !important;
              margin-bottom: 14px !important;
            }
            .exam-footer-note {
              margin-top: 24px !important;
              padding-top: 12px !important;
              border-top: 1px solid #cbd5e1 !important;
              text-align: center !important;
              font-size: 11px !important;
              font-weight: bold !important;
              color: #64748b !important;
              text-transform: uppercase !important;
              break-inside: avoid !important;
            }
          </style>
        </head>
        <body>
          <div class="exam-paper-container">
            ${printElement.innerHTML}
          </div>
        </body>
      </html>
    `);
    frameDoc.close();

    // Mở hộp thoại in và tự dọn dẹp
    setTimeout(() => {
      printFrame.contentWindow?.focus();
      printFrame.contentWindow?.print();
      setTimeout(() => {
        printFrame.remove();
      }, 2000);
    }, 300);
  };

  const buildFallbackBlob = (format: 'docx' | 'pdf' | 'qti') => {
    const lines = [
      `${universityName || 'TRƯỜNG ĐẠI HỌC GIAO THÔNG VẬN TẢI TP.HCM (UTH)'}`,
      `${facultyName || 'KHOA CÔNG NGHỆ THÔNG TIN'}`,
      `${examTitle} — MÃ ĐỀ ${activeExamCode}`,
      `Học phần: ${subjectName || (selectedSubject !== 'all' ? selectedSubject.replace(/\.[^/.]+$/, '') : targetExamQuestions[0]?.textbookName?.replace(/\.[^/.]+$/, '') || 'Chưa đặt tên học phần')}`,
      `Thời gian làm bài: ${examDuration} phút`,
      `Giảng viên ra đề: ${currentUser?.fullName || 'TS. Nguyễn Văn An'}`,
      '============================================================',
      ...activeVariantQuestions.map((q, i) => {
        const opts = q.options.map((o) => `   ${o.label}. ${o.text}`).join('\n');
        return `Câu ${i + 1}: ${q.question}\n${opts}\n`;
      }),
      '============================================================',
      `BẢNG ĐÁP ÁN CHẤM THI (${availableCodes.length} MÃ ĐỀ: ${availableCodes.join(' - ')}):`,
      ...targetExamQuestions.map((_, idx) => {
        const codesLine = availableCodes.map((c) => `[${c}: ${examVariants[c]?.[idx]?.correctLabel || 'A'}]`).join('   ');
        return `Câu ${idx + 1}:  ${codesLine}`;
      }),
    ].join('\n');

    const mimeMap = {
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      pdf: 'application/pdf',
      qti: 'application/zip',
    };
    return new Blob([lines], { type: mimeMap[format] });
  };

  const handleDownloadAnswerKey = () => {
    const lines = [
      `QUIZGEN AI — BẢNG ĐÁP ÁN CHẤM THI & GIẢI THÍCH CHI TIẾT (${availableCodes.length} MÃ ĐỀ: ${availableCodes.join(', ')})`,
      `Đơn vị: ${universityName || 'TRƯỜNG ĐẠI HỌC GIAO THÔNG VẬN TẢI TP.HCM (UTH)'} — ${facultyName || 'KHOA CÔNG NGHỆ THÔNG TIN'}`,
      `Kỳ thi: ${examTitle}`,
      `Học phần: ${subjectName || (selectedSubject !== 'all' ? selectedSubject.replace(/\.[^/.]+$/, '') : targetExamQuestions[0]?.textbookName?.replace(/\.[^/.]+$/, '') || 'Chưa đặt tên học phần')}`,
      `Giảng viên: ${currentUser?.academicTitle || ''} ${currentUser?.fullName || 'Giảng viên'}`,
      `Ngày xuất: ${new Date().toLocaleString('vi-VN')}`,
      '========================================================================',
      'I. BẢNG ĐÁP ÁN NHANH THEO MÃ ĐỀ:',
      `Câu\t${availableCodes.map((c) => `Mã ${c}`).join('\t')}`,
      ...targetExamQuestions.map(
        (_, i) =>
          `Câu ${i + 1}\t  ${availableCodes.map((c) => examVariants[c]?.[i]?.correctLabel || 'A').join('\t  ')}`
      ),
      '\n========================================================================',
      'II. LỜI GIẢI CHI TIẾT (THEO MÃ ĐỀ ĐANG CHỌN ' + activeExamCode + '):',
      ...activeVariantQuestions.map(
        (q, i) =>
          `Câu ${i + 1} (Đáp án đúng: ${q.correctLabel}) [${q.bloomLevel}]:\n- Câu hỏi: ${q.question}\n- Giải thích: ${q.explanation}\n`
      ),
    ].join('\n');

    const blob = new Blob([lines], { type: 'text/plain;charset=utf-8' });
    triggerDownload(blob, `QuizGen_AI_DapAn_${availableCodes.length}MaDe_${Date.now()}.txt`);
    onShowToast(
      'success',
      `Đã tải Bảng Đáp Án Chấm Thi (${availableCodes.length} Mã đề)`,
      `Tệp đáp án tổng hợp của ${availableCodes.length} mã đề (${availableCodes.join(', ')}) kèm lời giải đã được tải xuống.`
    );
  };

  const handleExport = async (format: 'docx' | 'pdf' | 'qti') => {
    if (targetExamQuestions.length === 0) {
      onShowToast('warning', 'Chưa có câu hỏi', 'Không có câu hỏi nào phù hợp để xuất đề thi.');
      return;
    }

    const extMap = { docx: 'docx', pdf: 'pdf', qti: 'zip' };
    const filename =
      format === 'pdf'
        ? `QuizGen_AI_DeThi_OMR_MaDe${activeExamCode}_${Date.now()}.pdf`
        : format === 'qti'
        ? `QuizGen_AI_Moodle_QTI_${Date.now()}.zip`
        : `QuizGen_AI_DeThi_Word_MaDe${activeExamCode}_${Date.now()}.${extMap[format]}`;

    setIsExporting(format);
    try {
      const response = await apiClient.fetch(`${API_BASE}/exams/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format,
          universityName,
          facultyName,
          university: universityName,
          faculty: facultyName,
          subjectName: subjectName || (selectedSubject !== 'all' ? selectedSubject.replace(/\.[^/.]+$/, '') : targetExamQuestions[0]?.textbookName?.replace(/\.[^/.]+$/, '') || 'Chưa đặt tên học phần'),
          subject: subjectName || (selectedSubject !== 'all' ? selectedSubject.replace(/\.[^/.]+$/, '') : targetExamQuestions[0]?.textbookName?.replace(/\.[^/.]+$/, '') || 'Chưa đặt tên học phần'),
          config: {
            universityName,
            facultyName,
            university: universityName,
            faculty: facultyName,
            subjectName: subjectName || (selectedSubject !== 'all' ? selectedSubject.replace(/\.[^/.]+$/, '') : targetExamQuestions[0]?.textbookName?.replace(/\.[^/.]+$/, '') || 'Chưa đặt tên học phần'),
            subject: subjectName || (selectedSubject !== 'all' ? selectedSubject.replace(/\.[^/.]+$/, '') : targetExamQuestions[0]?.textbookName?.replace(/\.[^/.]+$/, '') || 'Chưa đặt tên học phần'),
            examTitle,
            durationMinutes: examDuration,
            examCodeCount: availableCodes.length,
            examCodes: availableCodes,
            shuffleQuestions: true,
            shuffleOptions: true,
            includeAnswerKey: true,
            includeExplanation: true,
            includeOmrSheet: format === 'pdf',
            baseExamCode: Number(activeExamCode),
            format,
          },
          questions: targetExamQuestions,
        }),
      });

      // Lưu vết bài thi này vào CSDL và localStorage để giảng viên có thể chọn lại sau này
      void saveExamToStorageAndApi(format);

      const contentType = response.headers.get('content-type') || '';
      if (response.ok && !contentType.includes('application/json')) {
        const blob = await response.blob();
        triggerDownload(blob, filename);
      } else {
        triggerDownload(buildFallbackBlob(format), filename);
      }

      const formatLabels = {
        docx: 'Đề thi Microsoft Word (.docx)',
        pdf: 'Đề thi PDF + Phiếu tô OMR (.pdf)',
        qti: 'Gói câu hỏi LMS Moodle/QTI (.zip)',
      };

      onShowToast(
        'success',
        `Đã tải ${formatLabels[format]}`,
        `Đã xuất thành công tệp "${filename}" (${targetExamQuestions.length} câu hỏi).`
      );
    } catch {
      triggerDownload(buildFallbackBlob(format), filename);
      onShowToast(
        'success',
        'Đã tải xuống tệp đề thi',
        `Đã tạo tệp "${filename}" gồm ${targetExamQuestions.length} câu hỏi.`
      );
    } finally {
      setIsExporting(null);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-3 sm:p-5 md:p-6 space-y-3.5 sm:space-y-5">
      {/* Top Studio Header & Direct Output Bar for Lecturer */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-sm space-y-3.5 no-print">
        {/* Hàng trên: Cụm form thông tin (trái) + 5 Nút chức năng thu gọn (phải) */}
        <div className="flex flex-col 2xl:flex-row 2xl:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          
          {/* Cụm Form Thông Tin (Góc Trên Bên Trái) */}
          <div className="flex-1 min-w-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2 bg-slate-50/70 p-2.5 rounded-xl border border-slate-200/80">
              {/* 1. Tên trường / Học viện */}
              <div className="flex flex-col gap-1 min-w-0">
                <label className="text-[10px] font-bold text-slate-700 flex items-center gap-1 truncate">
                  <GraduationCap className="w-3 h-3 text-[#008689] shrink-0" />
                  <span className="truncate">Trường / Học viện:</span>
                </label>
                <input
                  type="text"
                  value={universityName}
                  onChange={(e) => setUniversityName(e.target.value)}
                  placeholder="VD: TRƯỜNG ĐH GIAO THÔNG VẬN TẢI TP.HCM"
                  className="h-8 px-2.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#008689] focus:ring-1 focus:ring-[#008689] bg-white transition-all shadow-2xs"
                />
              </div>

              {/* 2. Tên Khoa / Viện */}
              <div className="flex flex-col gap-1 min-w-0">
                <label className="text-[10px] font-bold text-slate-700 flex items-center gap-1 truncate">
                  <Building2 className="w-3 h-3 text-[#008689] shrink-0" />
                  <span className="truncate">Khoa / Viện:</span>
                </label>
                <input
                  type="text"
                  value={facultyName}
                  onChange={(e) => setFacultyName(e.target.value)}
                  placeholder="VD: KHOA CÔNG NGHỆ THÔNG TIN"
                  className="h-8 px-2.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#008689] focus:ring-1 focus:ring-[#008689] bg-white transition-all shadow-2xs"
                />
              </div>

              {/* 3. Tên học phần / Môn */}
              <div className="flex flex-col gap-1 min-w-0">
                <label className="text-[10px] font-bold text-slate-700 flex items-center justify-between">
                  <span className="flex items-center gap-1 truncate">
                    <BookOpen className="w-3 h-3 text-[#008689] shrink-0" />
                    <span className="truncate">Học phần / Môn:</span>
                  </span>
                  {subjects.length > 0 && (
                    <span className="text-[9px] text-slate-400 font-normal shrink-0">
                      (chọn/sửa)
                    </span>
                  )}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    list="exam-subject-datalist"
                    value={subjectName}
                    onChange={(e) => setSubjectName(e.target.value)}
                    placeholder="VD: Kinh tế vi mô"
                    className="w-full h-8 px-2.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#008689] focus:ring-1 focus:ring-[#008689] bg-white transition-all shadow-2xs"
                  />
                  <datalist id="exam-subject-datalist">
                    {subjects.map((s) => (
                      <option key={s} value={s.replace(/\.[^/.]+$/, '')}>
                        {s.replace(/\.[^/.]+$/, '')}
                      </option>
                    ))}
                  </datalist>
                </div>
              </div>

              {/* 4. Tiêu đề kỳ thi */}
              <div className="flex flex-col gap-1 min-w-0">
                <label className="text-[10px] font-bold text-slate-700 flex items-center gap-1 truncate">
                  <FileText className="w-3 h-3 text-[#008689] shrink-0" />
                  <span className="truncate">Tiêu đề kỳ thi:</span>
                </label>
                <input
                  type="text"
                  value={examTitle}
                  onChange={(e) => setExamTitle(e.target.value)}
                  placeholder="VD: ĐỀ THI KẾT THÚC HỌC PHẦN"
                  className="h-8 px-2.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#008689] focus:ring-1 focus:ring-[#008689] bg-white transition-all shadow-2xs"
                />
              </div>

              {/* 5. Số mã đề cần in */}
              <div className="flex flex-col gap-1 min-w-0">
                <label className="text-[10px] font-bold text-slate-700 flex items-center justify-between">
                  <span className="truncate">Số mã đề:</span>
                  <span className="text-[10px] text-[#008689] font-bold shrink-0">{examCodeCount} mã</span>
                </label>
                <select
                  value={examCodeCount}
                  onChange={(e) => setExamCodeCount(Number(e.target.value))}
                  className="w-full h-8 px-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:border-[#008689] shadow-2xs"
                >
                  <option value={1}>1 mã (101)</option>
                  <option value={2}>2 mã (101, 102)</option>
                  <option value={4}>4 mã (101–104)</option>
                  <option value={6}>6 mã (101–106)</option>
                  <option value={8}>8 mã (101–108)</option>
                </select>
              </div>

              {/* 6. Thời lượng & Đảo mã */}
              <div className="flex flex-col gap-1 min-w-0">
                <label className="text-[10px] font-bold text-slate-700 truncate">
                  Thời lượng & Đảo mã:
                </label>
                <div className="flex items-center gap-1.5">
                  <select
                    value={examDuration}
                    onChange={(e) => setExamDuration(Number(e.target.value))}
                    className="w-16 h-8 px-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:border-[#008689] shadow-2xs"
                  >
                    <option value={15}>15p</option>
                    <option value={45}>45p</option>
                    <option value={60}>60p</option>
                    <option value={90}>90p</option>
                  </select>

                  <button
                    type="button"
                    onClick={handleReshuffleCodes}
                    title={`Xáo trộn lại câu hỏi và các phương án A-B-C-D cho ${examCodeCount} mã đề`}
                    className="h-8 inline-flex items-center gap-1 px-2 rounded-lg bg-[#e6f4f4] hover:bg-[#d5ecec] text-[#008689] font-bold text-[11px] transition-colors shrink-0 shadow-2xs cursor-pointer whitespace-nowrap"
                  >
                    <Shuffle className="w-3 h-3" />
                    <span>Trộn mã</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Nhóm 5 Nút Chức Năng (Góc Trên Bên Phải): Kho Đề ở đầu canh giữa theo chiều dọc + 4 nút xuất dạng lưới 2 hàng */}
          <div className="flex items-center gap-2 shrink-0 2xl:self-center">
            {/* 1. Nút Kho Đề Đã Sinh: Đặt ở đầu tiên (ngoài cùng bên trái), canh giữa theo chiều dọc so với 2 hàng nút */}
            <button
              type="button"
              onClick={() => setIsExamHistoryOpen(true)}
              className="h-9 inline-flex items-center justify-center gap-1.5 px-2.5 rounded-lg text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 transition-colors shadow-2xs whitespace-nowrap cursor-pointer"
              title="Xem và chọn các đề thi đã lưu / đã sinh trước đó để in"
            >
              <FolderOpen className="w-3.5 h-3.5 text-slate-600" />
              <span>Kho Đề Đã Sinh{savedExams.length > 0 ? ` (${savedExams.length})` : ''}</span>
            </button>

            {/* Lưới 2x2 cho 4 nút xuất file */}
            <div className="grid grid-cols-2 gap-1.5">
              {/* Hàng trên: Tải Đề Word & Tải Đề PDF */}
              <button
                type="button"
                onClick={() => handleExport('docx')}
                disabled={isExporting !== null || targetExamQuestions.length === 0}
                title={targetExamQuestions.length === 0 ? 'Chưa có câu hỏi để xuất đề thi' : 'Tải đề thi định dạng Microsoft Word (.docx)'}
                className="h-7 px-2.5 rounded-md text-[10.5px] font-bold bg-[#008689] hover:bg-[#007073] text-white transition-colors shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center gap-1 whitespace-nowrap cursor-pointer"
              >
                {isExporting === 'docx' ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Download className="w-3 h-3" />
                )}
                <span>Tải Đề Word</span>
              </button>

              <button
                type="button"
                onClick={() => handleExport('pdf')}
                disabled={isExporting !== null || targetExamQuestions.length === 0}
                title={targetExamQuestions.length === 0 ? 'Chưa có câu hỏi để xuất đề thi' : 'Tải đề thi PDF in ấn chuẩn A4 kèm phiếu tô OMR 50 câu'}
                className="h-7 px-2.5 rounded-md text-[10.5px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center gap-1 whitespace-nowrap cursor-pointer"
              >
                {isExporting === 'pdf' ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <FileSpreadsheet className="w-3 h-3" />
                )}
                <span>Tải Đề PDF</span>
              </button>

              {/* Hàng dưới: Tải Bảng Đáp Án & Xuất Gói LMS */}
              <button
                type="button"
                onClick={handleDownloadAnswerKey}
                disabled={targetExamQuestions.length === 0}
                title={targetExamQuestions.length === 0 ? 'Chưa có câu hỏi để tải đáp án' : 'Tải bảng đáp án chấm thi tổng hợp cho tất cả mã đề'}
                className="h-7 px-2.5 rounded-md text-[10.5px] font-bold bg-amber-500 hover:bg-amber-600 text-white transition-colors shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center gap-1 whitespace-nowrap cursor-pointer"
              >
                <KeyRound className="w-3 h-3 text-white" />
                <span>Tải Bảng Đáp Án</span>
              </button>

              <button
                type="button"
                onClick={() => handleExport('qti')}
                disabled={isExporting !== null || targetExamQuestions.length === 0}
                title={targetExamQuestions.length === 0 ? 'Chưa có câu hỏi để xuất gói LMS' : 'Xuất gói câu hỏi Canvas / Moodle LMS QTI 2.1 (.zip)'}
                className="h-7 px-2.5 rounded-md text-[10.5px] font-bold bg-purple-600 hover:bg-purple-700 text-white transition-colors shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center gap-1 whitespace-nowrap cursor-pointer"
              >
                {isExporting === 'qti' ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Archive className="w-3 h-3" />
                )}
                <span>Xuất Gói LMS</span>
              </button>
            </div>
          </div>
        </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
            <span className="text-xs text-slate-500 font-medium">
              Chế độ hiển thị & đối soát:
            </span>

          {/* 3 View Tabs */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
            {[
              { id: 'preview_paper', label: 'Xem Tờ Đề Thi A4 & OMR', icon: Eye },
              { id: 'answer_key', label: `Bảng Đáp Án (${availableCodes.length} Mã Đề)`, icon: KeyRound },
              {
                id: 'question_list',
                label: `Kho Câu Hỏi (${filteredQuestions.length})`,
                icon: ListChecks,
              },
            ].map((tab) => {
              const Icon = tab.icon;
              const isAct = viewMode === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setViewMode(tab.id as typeof viewMode)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    isAct
                      ? 'bg-white text-[#008689] shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* VIEW 1: LIVE A4 EXAM PAPER PREVIEW + OMR SHEET */}
      {viewMode === 'preview_paper' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: A4 Exam Paper Preview */}
          <div className="lg:col-span-8 bg-white rounded-xl border border-slate-300 shadow-sm p-3.5 sm:p-6 sm:p-8 space-y-4 sm:space-y-6">
            {/* Code Switcher Bar (Ẩn khi in) */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-slate-200 no-print">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500 uppercase">
                  Chọn Mã Đề Xem Trước:
                </span>
                {availableCodes.map((code) => (
                  <button
                    key={code}
                    onClick={() => setActiveExamCode(code)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all ${
                      activeExamCode === code
                        ? 'bg-[#008689] text-white border-[#008689]'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Mã đề {code}
                  </button>
                ))}
              </div>

              <button
                onClick={handlePrintExamPaper}
                disabled={activeVariantQuestions.length === 0}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                title="In trực tiếp tờ đề hiện tại ra máy in hoặc lưu file PDF (Chỉ in nội dung tờ đề)"
              >
                <Printer className="w-3.5 h-3.5 text-[#008689]" />
                In trực tiếp tờ đề này
              </button>
            </div>

            {/* Printable Exam Paper Container: Chỉ in toàn bộ nội dung trong tờ đề này */}
            <div id="printable-exam-paper" className="space-y-6">
              {/* Official University Header on A4 Paper */}
              <div className="border-2 border-slate-800 p-4 rounded-lg exam-header-box">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-center border-b border-slate-300 pb-3">
                  <div className="space-y-0.5">
                    <p className="text-[11px] font-bold uppercase text-slate-700">
                      {universityName || 'TRƯỜNG ĐẠI HỌC GIAO THÔNG VẬN TẢI TP.HCM'}
                    </p>
                    <p className="text-xs font-extrabold uppercase text-slate-900">
                      {facultyName || 'KHOA CÔNG NGHỆ THÔNG TIN'}
                    </p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs font-extrabold uppercase text-slate-900">{examTitle}</p>
                    <p className="text-[11px] font-semibold text-slate-700">
                      Học phần:{' '}
                      <span className="font-bold text-slate-900">
                        {subjectName || (selectedSubject !== 'all' ? selectedSubject.replace(/\.[^/.]+$/, '') : targetExamQuestions[0]?.textbookName?.replace(/\.[^/.]+$/, '') || 'Chưa đặt tên học phần')}
                      </span>
                    </p>
                    <p className="text-[11px] text-slate-600">
                      Thời gian làm bài: <strong>{examDuration} phút</strong> (Không kể thời gian phát đề)
                    </p>
                  </div>
                </div>

                <div className="pt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-700">
                  <div>
                    Họ và tên sinh viên: ..........................................................
                    MSSV: ..........................
                  </div>
                  <div className="px-3 py-1 border-2 border-slate-900 font-extrabold text-slate-900 uppercase">
                    MÃ ĐỀ: {activeExamCode}
                  </div>
                </div>
              </div>

              {/* Shuffled Questions List on A4 Paper or Empty State */}
              {activeVariantQuestions.length === 0 ? (
                <div className="py-12 px-4 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-teal-50 text-[#008689] flex items-center justify-center mx-auto">
                    <FileQuestion className="w-6 h-6" />
                  </div>
                  <div className="space-y-1 max-w-md mx-auto">
                    <h4 className="text-sm font-bold text-slate-800">
                      Chưa có câu hỏi nào trong đề thi
                    </h4>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Hệ thống đã dọn dẹp sạch toàn bộ dữ liệu câu hỏi ảo. Để xuất đề thi, vui lòng tải lên tài liệu giáo trình tại <strong>Bước 1</strong> và thực hiện tạo câu hỏi tại <strong>Bước 2 & Bước 3</strong>.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="space-y-5 pt-2">
                    {activeVariantQuestions.map((q, index) => (
                      <div key={`${activeExamCode}-${q.id}`} className="space-y-2 text-sm text-slate-900 exam-question-item">
                        <div className="font-semibold leading-relaxed">
                          <span className="font-extrabold mr-1">Câu {index + 1}:</span>
                          <MathRenderer content={q.question} inline />
                        </div>

                        {/* Tự động chèn hình vẽ sơ đồ vào ngay dưới nội dung câu hỏi */}
                        {((q as any).imageUrl || q.imageUrl) && (
                          <div className="my-2.5 flex flex-col items-center justify-center">
                            <img
                              src={(q as any).imageUrl || q.imageUrl}
                              alt={(q as any).imageCaption || q.imageCaption || `Sơ đồ câu ${index + 1}`}
                              className="max-h-56 max-w-full rounded-md object-contain border border-slate-200 shadow-2xs bg-white p-1"
                              loading="lazy"
                            />
                            {((q as any).imageCaption || q.imageCaption) && (
                              <span className="text-[11px] text-slate-500 italic mt-1 text-center font-medium">
                                ({(q as any).imageCaption || q.imageCaption})
                              </span>
                            )}
                          </div>
                        )}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-2">
                          {q.options.map((opt) => (
                            <div key={opt.id} className="text-xs sm:text-sm text-slate-800 flex items-start gap-1">
                              <span className="font-bold shrink-0">{opt.label}.</span>
                              <span className="flex-1"><MathRenderer content={opt.text} /></span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-4 border-t border-slate-200 text-center text-xs font-bold text-slate-500 uppercase exam-footer-note">
                    — HẾT (Sinh viên không được sử dụng tài liệu) —
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Right: OMR Answer Sheet Preview & Quick Answer Key (Không in) */}
          <div className="lg:col-span-4 space-y-4 no-print">
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    Phiếu Tô Trắc Nghiệm OMR
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Đính kèm tự động khi xuất PDF — Mã đề {activeExamCode}
                  </p>
                </div>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-[#e6f4f4] text-[#008689]">
                  Chuẩn máy chấm
                </span>
              </div>

              {activeVariantQuestions.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  Chưa có câu hỏi để hiển thị phiếu OMR
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2.5 max-h-[340px] overflow-y-auto pr-1">
                  {activeVariantQuestions.map((q, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs"
                    >
                      <span className="font-bold text-slate-700 w-7">{i + 1}.</span>
                      <div className="flex items-center gap-1.5">
                        {['A', 'B', 'C', 'D'].map((lbl) => (
                          <span
                            key={lbl}
                            className="w-5 h-5 rounded-full border border-slate-400 text-[10px] font-bold flex items-center justify-center text-slate-600 bg-white"
                          >
                            {lbl}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Teacher's Live Answer Key for Active Code */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 uppercase">
                  Đáp Án Chấm Nhanh — Mã Đề {activeExamCode}
                </h4>
                <button
                  onClick={() => setViewMode('answer_key')}
                  className="text-[11px] font-bold text-[#008689] hover:underline"
                >
                  Xem đủ {availableCodes.length} mã đề →
                </button>
              </div>
              {activeVariantQuestions.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  Chưa có đáp án chấm
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {activeVariantQuestions.map((q, idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-center text-xs"
                    >
                      <span className="font-semibold text-slate-600">{idx + 1}: </span>
                      <strong className="text-emerald-800">{q.correctLabel}</strong>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: ANSWER KEY MATRIX FOR ALL DYNAMIC EXAM CODES */}
      {viewMode === 'answer_key' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-800">
                Bảng Đáp Án Chấm Thi Tổng Hợp ({availableCodes.length} Mã Đề: {availableCodes.join(', ')})
              </h3>
              <p className="text-xs text-slate-500">
                Dành cho Giảng viên lưu hồ sơ chấm thi sau khi trộn {availableCodes.length} mã đề bằng thuật toán Fisher-Yates
              </p>
            </div>
            <button
              onClick={handleDownloadAnswerKey}
              disabled={targetExamQuestions.length === 0}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#008689] hover:bg-[#006f72] text-white text-xs font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Download className="w-3.5 h-3.5" />
              Tải Bảng Đáp Án & Lời Giải (.txt)
            </button>
          </div>

          {targetExamQuestions.length === 0 ? (
            <div className="py-12 px-4 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50 space-y-2">
              <FileQuestion className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-sm font-semibold text-slate-700">Chưa có câu hỏi để tạo bảng đáp án {availableCodes.length} mã đề</p>
              <p className="text-xs text-slate-400">Vui lòng tải lên tài liệu giáo trình và tạo câu hỏi trước khi lập bảng đáp án.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase">
                    <th className="py-3 px-4">Thứ tự câu trên đề</th>
                    {availableCodes.map((code) => (
                      <th key={code} className="py-3 px-4 text-center">
                        Mã đề {code}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {targetExamQuestions.map((_, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-bold text-slate-800">Câu {idx + 1}</td>
                      {availableCodes.map((code) => (
                        <td key={code} className="py-3 px-4 text-center">
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 font-extrabold">
                            {examVariants[code]?.[idx]?.correctLabel || 'A'}
                          </span>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* VIEW 3: QUESTION BANK LIST & FILTERS */}
      {viewMode === 'question_list' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-wrap items-center gap-2.5">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm nội dung câu hỏi hoặc chương mục..."
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-[#008689]"
              />
            </div>

            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:border-[#008689]"
            >
              <option value="all">Tất cả giáo trình ({effectivePool.length})</option>
              {subjects.map((sub) => (
                <option key={sub} value={sub}>
                  {sub}
                </option>
              ))}
            </select>

            <select
              value={selectedBloom}
              onChange={(e) => setSelectedBloom(e.target.value as typeof selectedBloom)}
              className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:border-[#008689]"
            >
              <option value="all">Tất cả mức Bloom</option>
              {BLOOM_ORDER.map((lvl) => (
                <option key={lvl} value={lvl}>
                  {BLOOM_STYLE[lvl].label} ({BLOOM_STYLE[lvl].en})
                </option>
              ))}
            </select>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs font-semibold text-slate-600">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={
                    filteredQuestions.length > 0 &&
                    selectedIds.length === filteredQuestions.length
                  }
                  onChange={handleSelectAll}
                  className="rounded border-slate-300 text-[#008689] focus:ring-[#008689]"
                />
                <span>
                  Hiển thị <strong>{filteredQuestions.length}</strong> câu hỏi trong Ngân hàng Đề
                  {selectedIds.length > 0 && ` (Đã chọn ${selectedIds.length} câu để đưa vào đề)`}
                </span>
              </div>
              <span className="text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                100% Có trích dẫn RAG
              </span>
            </div>

            <div className="divide-y divide-slate-100">
              {filteredQuestions.map((q, index) => {
                const isExpanded = expandedId === q.id;
                const isSelected = selectedIds.includes(q.id);
                const bloomCfg = BLOOM_STYLE[q.bloomLevel];

                return (
                  <div key={q.id} className="p-4 hover:bg-slate-50/60 transition-colors">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelect(q.id)}
                        className="mt-1 rounded border-slate-300 text-[#008689] focus:ring-[#008689]"
                      />

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                          <span className="text-xs font-bold text-slate-500">#{index + 1}</span>
                          <span
                            className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${bloomCfg.bg} ${bloomCfg.color} ${bloomCfg.border}`}
                          >
                            {bloomCfg.label} ({bloomCfg.en})
                          </span>
                          <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                            {q.textbookName} — {q.chapter}
                          </span>
                          {(q.hasFormula || q.question.includes('$')) && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                              ∑ Toán - Lý (LaTeX)
                            </span>
                          )}
                          {q.hasImage && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                              📷 Sơ đồ
                            </span>
                          )}
                        </div>

                        <div className="text-sm font-semibold text-slate-800 leading-relaxed">
                          <MathRenderer content={q.question} />
                          {q.hasImage && q.imageUrl && (
                            <div className="mt-2.5 p-2 bg-slate-50 border border-slate-200 rounded max-w-sm">
                              <img src={q.imageUrl} alt={q.imageCaption || 'Hình sơ đồ'} className="max-h-48 rounded object-contain mx-auto" />
                              {q.imageCaption && <p className="text-[10px] text-slate-500 italic mt-1 text-center">{q.imageCaption}</p>}
                            </div>
                          )}
                        </div>

                        {isExpanded && (
                          <div className="mt-4 space-y-3 pt-3 border-t border-slate-100">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {q.options.map((opt) => {
                                const isCorrect = opt.id === q.correctAnswerId;
                                return (
                                  <div
                                    key={opt.id}
                                    className={`p-2.5 rounded-lg border text-xs flex items-start gap-2 ${
                                      isCorrect
                                        ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-semibold'
                                        : 'bg-white border-slate-200 text-slate-600'
                                    }`}
                                  >
                                    <span className="font-bold shrink-0">{opt.label}.</span>
                                    <span className="flex-1"><MathRenderer content={opt.text} /></span>
                                  </div>
                                );
                              })}
                            </div>

                            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
                              <div>
                                <strong className="text-slate-700">Giải thích: </strong>
                                <MathRenderer content={q.explanation} inline />
                              </div>
                              <div className="flex items-center gap-2 text-slate-500 pt-1">
                                <BookOpen className="w-3.5 h-3.5 text-[#008689]" />
                                <span>
                                  Nguồn: <strong>{q.textbookName}</strong> ({q.chapter} —{' '}
                                  {q.sourceChunkId})
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => setExpandedId(isExpanded ? null : q.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                        title={isExpanded ? 'Thu gọn' : 'Xem chi tiết'}
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}

              {filteredQuestions.length === 0 && (
                <div className="p-12 text-center text-sm text-slate-500 space-y-2">
                  <FileQuestion className="w-10 h-10 text-slate-300 mx-auto" />
                  <p className="font-semibold text-slate-700">
                    {effectivePool.length === 0
                      ? 'Ngân hàng câu hỏi hiện đang trống'
                      : 'Không tìm thấy câu hỏi nào khớp với bộ lọc'}
                  </p>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    {effectivePool.length === 0
                      ? 'Chưa có câu hỏi nào được lưu. Hãy tải lên tài liệu giáo trình ở Bước 1 và tạo câu hỏi để bắt đầu.'
                      : 'Thử điều chỉnh lại từ khóa tìm kiếm hoặc mức độ Bloom.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL: KHO ĐỀ THI ĐÃ SINH & LỊCH SỬ ĐÓNG GÓI ===== */}
      {isExamHistoryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-slate-900/50 p-4 no-print">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-fade-in">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-50 text-[#008689] flex items-center justify-center font-bold">
                  <FolderOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    Kho Đề Thi Đã Sinh & Đóng Gói
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Chọn một bộ đề thi trước đó để nạp lại vào bản in A4, phiếu OMR và bảng đáp án
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsExamHistoryOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Exams List */}
            <div className="p-5 overflow-y-auto space-y-3 flex-1">
              {savedExams.length === 0 ? (
                <div className="py-12 text-center space-y-2">
                  <FileQuestion className="w-10 h-10 text-slate-300 mx-auto" />
                  <p className="text-xs font-semibold text-slate-700">Chưa có đề thi nào trong kho lưu trữ</p>
                  <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                    Mỗi khi bạn thực hiện xuất bản đề thi (Word, PDF, QTI), bài thi sẽ được lưu tự động tại đây để bạn có thể chọn và in lại bất kỳ lúc nào.
                  </p>
                </div>
              ) : (
                savedExams.map((exam) => (
                  <div
                    key={exam.id}
                    className="p-4 rounded-2xl border border-slate-200 hover:border-[#008689] bg-white transition-all space-y-2.5 shadow-2xs"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">{exam.title}</h4>
                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 mt-1">
                          <span className="font-semibold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                            Môn: {exam.subject}
                          </span>
                          <span>•</span>
                          <span>{exam.questionCount} câu hỏi</span>
                          <span>•</span>
                          <span>{exam.durationMinutes} phút</span>
                          <span>•</span>
                          <span className="font-bold text-[#008689]">
                            {exam.examCodes?.length || 4} mã đề ({exam.examCodes?.join(', ') || '101-104'})
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {exam.createdAt}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                      <span className="text-slate-500 text-[11px] truncate max-w-[280px]">
                        {exam.university} — {exam.faculty}
                      </span>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDeleteSavedExam(exam.id)}
                          className="px-2.5 py-1 rounded-lg text-rose-600 hover:bg-rose-50 text-[11px] font-semibold transition-colors"
                        >
                          Xóa
                        </button>
                        <button
                          onClick={() => handleLoadSavedExam(exam)}
                          className="px-3.5 py-1.5 rounded-xl bg-[#008689] hover:bg-[#006f72] text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-colors"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          Chọn đề này để in / xuất
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
              <span className="text-slate-500">
                Tổng cộng: <strong>{savedExams.length}</strong> bài thi đã lưu
              </span>
              <button
                onClick={() => setIsExamHistoryOpen(false)}
                className="px-4 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
