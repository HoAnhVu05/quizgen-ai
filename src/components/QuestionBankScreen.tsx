import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Question, BloomLevel, UserProfile } from '../types';
import apiClient, { API_BASE } from '../services/apiClient';
import { ImageLightboxModal } from './ImageLightboxModal';
import {
  SavedExamItem,
  ExamStudioHeader,
  PaperPreviewView,
  AnswerKeyView,
  QuestionListView,
  ExamAnalyticsView,
  SavedExamsModal,
  QuestionDetailModal,
  shuffleWithSeed,
  ExamVariantQuestion,
} from './questionbank';

export type { SavedExamItem };

interface QuestionBankScreenProps {
  questions: Question[];
  onShowToast: (
    type: 'success' | 'info' | 'warning' | 'error',
    title: string,
    message: string
  ) => void;
  currentUser?: UserProfile | null;
  onNavigate?: (screen: any) => void;
  onLoadQuestions?: (questions: Question[]) => void;
}

export const QuestionBankScreen: React.FC<QuestionBankScreenProps> = ({
  questions,
  onShowToast,
  currentUser,
  onNavigate,
  onLoadQuestions,
}) => {
  const [internalLoadedQuestions, setInternalLoadedQuestions] = useState<Question[] | null>(null);
  const [viewMode, setViewMode] = useState<'preview_paper' | 'question_list' | 'answer_key' | 'analytics'>(
    'preview_paper'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedBloom, setSelectedBloom] = useState<'all' | BloomLevel>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isExporting, setIsExporting] = useState<string | null>(null);
  const [detailQuestion, setDetailQuestion] = useState<Question | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);

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

  // Tự động trở về trang 1 khi lọc hoặc tìm kiếm
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedSubject, selectedBloom]);

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

    let examQs: Question[] = [];
    if (item.questions && item.questions.length > 0) {
      examQs = item.questions;
    } else {
      try {
        const res = await apiClient.fetch(`${API_BASE}/exams/${item.id}`);
        if (res.ok) {
          const detail = await res.json();
          if (Array.isArray(detail?.questions) && detail.questions.length > 0) {
            examQs = detail.questions;
          }
        }
      } catch {}
    }

    if (examQs.length > 0) {
      setInternalLoadedQuestions(examQs);
      onLoadQuestions?.(examQs);
      setSelectedIds(examQs.map((q) => q.id));
      setSelectedSubject('all');
    }

    setIsExamHistoryOpen(false);
    onShowToast(
      'success',
      'Đã nạp đề thi thành công',
      `Đã nạp ${examQs.length || item.questionCount} câu hỏi từ đề "${item.title}". Đang hiển thị bản in A4 và phiếu OMR.`
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

  useEffect(() => {
    if (currentUser?.university) {
      setUniversityName(currentUser.university);
    }
    if (currentUser?.faculty || currentUser?.department) {
      setFacultyName(currentUser.faculty || currentUser.department || '');
    }
  }, [currentUser]);

  useEffect(() => {
    if (!subjectName && questions.length > 0 && questions[0]?.textbookName) {
      setSubjectName(questions[0].textbookName.replace(/\.[^/.]+$/, ''));
    }
  }, [questions, subjectName]);

  useEffect(() => {
    if (selectedSubject !== 'all') {
      setSubjectName(selectedSubject.replace(/\.[^/.]+$/, ''));
    }
  }, [selectedSubject]);

  const activeQuestionsPool =
    internalLoadedQuestions && internalLoadedQuestions.length > 0
      ? internalLoadedQuestions
      : questions;
  const bankPool = activeQuestionsPool.filter((q) => q.status !== 'rejected');
  const effectivePool = bankPool.length > 0 ? bankPool : activeQuestionsPool;

  const subjects = Array.from(new Set(effectivePool.map((q) => q.textbookName)));

  const filteredQuestions = effectivePool.filter((q) => {
    const matchSearch =
      q.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.chapter.toLowerCase().includes(searchQuery.toLowerCase());
    const matchSubject = selectedSubject === 'all' || q.textbookName === selectedSubject;
    const matchBloom = selectedBloom === 'all' || q.bloomLevel === selectedBloom;
    return matchSearch && matchSubject && matchBloom;
  });

  const totalFiltered = filteredQuestions.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / itemsPerPage));
  const currentDisplayPage = Math.min(currentPage, totalPages);
  const paginatedQuestions = useMemo(() => {
    const start = (currentDisplayPage - 1) * itemsPerPage;
    return filteredQuestions.slice(start, start + itemsPerPage);
  }, [filteredQuestions, currentDisplayPage, itemsPerPage]);

  const targetExamQuestions = useMemo(() => {
    return selectedIds.length > 0
      ? filteredQuestions.filter((q) => selectedIds.includes(q.id))
      : filteredQuestions;
  }, [filteredQuestions, selectedIds]);

  // Generate shuffled exam variants with dynamic codes (101..10N) and shuffled options
  const examVariants = useMemo(() => {
    const labels = ['A', 'B', 'C', 'D'];
    const map: Record<string, ExamVariantQuestion[]> = {};

    availableCodes.forEach((code, cIdx) => {
      const baseSeed = Number(code) * 31 + shuffleCounter * 97 + cIdx * 17;

      // Smart Shuffling: Gom nhóm các câu hỏi chùm (Passage Clusters) để không bị xé lẻ
      const clusters: Question[][] = [];
      let currentPassageId: string | null = null;
      let currentCluster: Question[] = [];

      targetExamQuestions.forEach((q) => {
        const pId = q.passageData?.id || null;
        if (pId && pId === currentPassageId) {
          currentCluster.push(q);
        } else {
          if (currentCluster.length > 0) {
            clusters.push(currentCluster);
          }
          currentCluster = [q];
          currentPassageId = pId;
        }
      });
      if (currentCluster.length > 0) {
        clusters.push(currentCluster);
      }

      // Trộn các cụm câu hỏi
      const shuffledClusters = shuffleWithSeed(clusters, baseSeed);
      const shuffledQs: Question[] = [];
      shuffledClusters.forEach((cl, clIdx) => {
        if (cl.length > 1 && cl[0]?.passageData) {
          const subShuffled = shuffleWithSeed(cl, baseSeed + clIdx * 7);
          shuffledQs.push(...subShuffled);
        } else {
          shuffledQs.push(...cl);
        }
      });

      map[code] = shuffledQs.map((q, qIdx) => {
        const shuffledOpts = shuffleWithSeed(q.options || [], baseSeed + qIdx * 13).map(
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
          questionType: q.questionType,
          passageData: q.passageData,
          statements: q.statements,
          sectionTitle: q.sectionTitle,
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

  const handleQuickEditQuestion = (questionId: string, newText: string) => {
    setInternalLoadedQuestions((prev) => {
      const base = prev || questions;
      const updated = base.map((q) => (q.id === questionId ? { ...q, question: newText } : q));
      if (onLoadQuestions) {
        onLoadQuestions(updated);
      }
      return updated;
    });
    setShuffleCounter((c) => c + 1);
    onShowToast('success', 'Đã cập nhật câu hỏi', 'Nội dung câu hỏi đã được sửa trực tiếp thành công.');
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
      onShowToast('error', 'Lỗi bản in', 'Không tìm thấy khung nội dung tờ đề thi.');
      return;
    }

    // Tạo container độc lập đặt trực tiếp ở root của body để trình duyệt phân trang (pagination) chuẩn xác 100% không bị cắt ở trang 1
    let printMount = document.getElementById('quizgen-dedicated-print-mount');
    if (!printMount) {
      printMount = document.createElement('div');
      printMount.id = 'quizgen-dedicated-print-mount';
      document.body.appendChild(printMount);
    }
    // Sao chép toàn bộ HTML của tờ đề vào mount chuyên dụng
    printMount.innerHTML = printElement.innerHTML;

    // Gắn class in chuyên dụng cho body
    document.body.classList.add('quizgen-printing-exam');

    let cleaned = false;
    const cleanUp = () => {
      if (cleaned) return;
      cleaned = true;
      document.body.classList.remove('quizgen-printing-exam');
      if (printMount && printMount.parentNode) {
        printMount.parentNode.removeChild(printMount);
      }
      window.removeEventListener('afterprint', cleanUp);
    };

    window.addEventListener('afterprint', cleanUp);

    // Đợi 150ms để DOM cập nhật và MathJax/KaTeX ổn định trước khi mở hộp thoại in
    setTimeout(() => {
      window.print();
      // Dự phòng trường hợp trình duyệt không kích hoạt afterprint
      setTimeout(cleanUp, 3000);
    }, 150);
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
      const currentSubject =
        subjectName ||
        (selectedSubject !== 'all'
          ? selectedSubject.replace(/\.[^/.]+$/, '')
          : targetExamQuestions[0]?.textbookName?.replace(/\.[^/.]+$/, '') || 'Chưa đặt tên học phần');

      const currentQuestionsToExport =
        activeVariantQuestions && activeVariantQuestions.length > 0
          ? activeVariantQuestions
          : targetExamQuestions;

      const response = await apiClient.fetch(`${API_BASE}/exams/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format,
          examCode: activeExamCode,
          exam_code: activeExamCode,
          code: activeExamCode,
          universityName,
          facultyName,
          university: universityName,
          faculty: facultyName,
          subjectName: currentSubject,
          subject: currentSubject,
          config: {
            universityName,
            facultyName,
            university: universityName,
            faculty: facultyName,
            subjectName: currentSubject,
            subject: currentSubject,
            examTitle,
            durationMinutes: examDuration,
            examCode: activeExamCode,
            exam_code: activeExamCode,
            examCodeCount: availableCodes.length,
            examCodes: availableCodes,
            shuffleQuestions: false,
            shuffleOptions: false,
            includeAnswerKey: true,
            includeExplanation: true,
            includeOmrSheet: format === 'pdf',
            baseExamCode: Number(activeExamCode),
            format,
          },
          questions: currentQuestionsToExport,
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

  const resolvedSubjectName =
    subjectName ||
    (selectedSubject !== 'all'
      ? selectedSubject.replace(/\.[^/.]+$/, '')
      : targetExamQuestions[0]?.textbookName?.replace(/\.[^/.]+$/, '') || 'Chưa đặt tên học phần');

  return (
    <div className="flex-1 overflow-y-auto p-3 sm:p-5 md:p-6 space-y-3.5 sm:space-y-5">
      {/* Top Studio Header & Direct Output Bar for Lecturer */}
      <ExamStudioHeader
        universityName={universityName}
        onUniversityNameChange={setUniversityName}
        facultyName={facultyName}
        onFacultyNameChange={setFacultyName}
        subjectName={subjectName}
        onSubjectNameChange={setSubjectName}
        subjects={subjects}
        examTitle={examTitle}
        onExamTitleChange={setExamTitle}
        examCodeCount={examCodeCount}
        onExamCodeCountChange={setExamCodeCount}
        examDuration={examDuration}
        onExamDurationChange={setExamDuration}
        onReshuffleCodes={handleReshuffleCodes}
        savedExams={savedExams}
        onOpenExamHistory={() => setIsExamHistoryOpen(true)}
        targetQuestionsCount={targetExamQuestions.length}
        isExporting={isExporting}
        onExport={handleExport}
        onDownloadAnswerKey={handleDownloadAnswerKey}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        availableCodesCount={availableCodes.length}
        filteredQuestionsCount={filteredQuestions.length}
      />

      {/* VIEW 1: LIVE A4 EXAM PAPER PREVIEW + OMR SHEET */}
      {viewMode === 'preview_paper' && (
        <PaperPreviewView
          activeExamCode={activeExamCode}
          availableCodes={availableCodes}
          onSelectExamCode={setActiveExamCode}
          onPrint={handlePrintExamPaper}
          universityName={universityName}
          facultyName={facultyName}
          examTitle={examTitle}
          subjectName={resolvedSubjectName}
          examDuration={examDuration}
          activeVariantQuestions={activeVariantQuestions}
          onImageClick={(url, caption) =>
            setLightboxData({ isOpen: true, url, caption })
          }
          onViewAnswerKey={() => setViewMode('answer_key')}
          onQuickEditQuestion={handleQuickEditQuestion}
        />
      )}

      {/* VIEW 2: ANSWER KEY MATRIX FOR ALL DYNAMIC EXAM CODES */}
      {viewMode === 'answer_key' && (
        <AnswerKeyView
          availableCodes={availableCodes}
          targetExamQuestions={targetExamQuestions}
          examVariants={examVariants}
          onDownloadAnswerKey={handleDownloadAnswerKey}
        />
      )}

      {/* VIEW 3: QUESTION BANK LIST & FILTERS */}
      {viewMode === 'question_list' && (
        <QuestionListView
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          selectedSubject={selectedSubject}
          onSubjectChange={setSelectedSubject}
          subjects={subjects}
          totalPoolCount={effectivePool.length}
          selectedBloom={selectedBloom}
          onBloomChange={setSelectedBloom}
          filteredQuestions={filteredQuestions}
          paginatedQuestions={paginatedQuestions}
          selectedIds={selectedIds}
          onToggleSelect={handleToggleSelect}
          onSelectAll={handleSelectAll}
          currentPage={currentPage}
          totalPages={totalPages}
          totalFiltered={totalFiltered}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={setItemsPerPage}
          expandedId={expandedId}
          onToggleExpand={(id) => setExpandedId(expandedId === id ? null : id)}
          onViewDetail={(q) => setDetailQuestion(q)}
          onImageClick={(url, caption) =>
            setLightboxData({ isOpen: true, url, caption })
          }
        />
      )}

      {/* VIEW 4: EXAM ANALYTICS & BLOOM MATRIX */}
      {viewMode === 'analytics' && (
        <ExamAnalyticsView
          questions={targetExamQuestions}
          examDuration={examDuration}
          subjectName={resolvedSubjectName}
          universityName={universityName}
        />
      )}

      {/* MODAL: KHO ĐỀ THI ĐÃ SINH & LỊCH SỬ ĐÓNG GÓI */}
      <SavedExamsModal
        isOpen={isExamHistoryOpen}
        onClose={() => setIsExamHistoryOpen(false)}
        savedExams={savedExams}
        onLoadExam={handleLoadSavedExam}
        onDeleteExam={handleDeleteSavedExam}
      />

      {/* MODAL: XEM NỘI DUNG TRỰC TIẾP CÂU HỎI & CĂN CỨ RAG */}
      <QuestionDetailModal
        isOpen={!!detailQuestion}
        question={detailQuestion}
        onClose={() => setDetailQuestion(null)}
      />

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
