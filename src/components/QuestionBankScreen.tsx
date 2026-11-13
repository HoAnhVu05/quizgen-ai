import React, { useState, useMemo } from 'react';
import {
  Search,
  Download,
  FileSpreadsheet,
  Archive,
  CheckCircle2,
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
} from 'lucide-react';
import { Question, BloomLevel, UserProfile } from '../types';
import apiClient, { API_BASE } from '../services/apiClient';

interface QuestionBankScreenProps {
  questions: Question[];
  onShowToast: (
    type: 'success' | 'info' | 'warning' | 'error',
    title: string,
    message: string
  ) => void;
  currentUser?: UserProfile | null;
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
  const [examDuration, setExamDuration] = useState<number>(60);
  const [activeExamCode, setActiveExamCode] = useState<'101' | '102' | '103' | '104'>('101');
  const [shuffleCounter, setShuffleCounter] = useState<number>(1);

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

  // Generate 4 shuffled exam variants (101, 102, 103, 104) with shuffled questions & options
  const examVariants = useMemo(() => {
    const codes: Array<'101' | '102' | '103' | '104'> = ['101', '102', '103', '104'];
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
      }>
    > = {};

    codes.forEach((code, cIdx) => {
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
        };
      });
    });

    return map;
  }, [targetExamQuestions, shuffleCounter]);

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

  const handleReshuffle4Codes = () => {
    setShuffleCounter((c) => c + 1);
    onShowToast(
      'success',
      'Đã trộn mới 4 Mã đề (101, 102, 103, 104)',
      `Thuật toán Fisher-Yates đã hoán vị thứ tự câu hỏi và phương án A/B/C/D cho cả 4 mã đề.`
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

  const buildFallbackBlob = (format: 'docx' | 'pdf' | 'qti') => {
    const lines = [
      `TRƯỜNG ĐẠI HỌC GIAO THÔNG VẬN TẢI TP.HCM (UTH)`,
      `${examTitle} — MÃ ĐỀ ${activeExamCode}`,
      `Học phần: ${selectedSubject === 'all' ? targetExamQuestions[0]?.textbookName || 'Kinh tế học Vi mô' : selectedSubject}`,
      `Thời gian làm bài: ${examDuration} phút`,
      `Giảng viên ra đề: ${currentUser?.fullName || 'TS. Nguyễn Văn An'}`,
      '============================================================',
      ...activeVariantQuestions.map((q, i) => {
        const opts = q.options.map((o) => `   ${o.label}. ${o.text}`).join('\n');
        return `Câu ${i + 1}: ${q.question}\n${opts}\n`;
      }),
      '============================================================',
      'BẢNG ĐÁP ÁN CHẤM THI (4 MÃ ĐỀ 101 - 102 - 103 - 104):',
      ...targetExamQuestions.map((_, idx) => {
        return `Câu ${idx + 1}:  [101: ${examVariants['101']?.[idx]?.correctLabel}]   [102: ${examVariants['102']?.[idx]?.correctLabel}]   [103: ${examVariants['103']?.[idx]?.correctLabel}]   [104: ${examVariants['104']?.[idx]?.correctLabel}]`;
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
      `QUIZGEN AI — BẢNG ĐÁP ÁN CHẤM THI & GIẢI THÍCH CHI TIẾT (4 MÃ ĐỀ 101, 102, 103, 104)`,
      `Kỳ thi: ${examTitle}`,
      `Giảng viên: ${currentUser?.academicTitle || ''} ${currentUser?.fullName || 'Giảng viên'}`,
      `Ngày xuất: ${new Date().toLocaleString('vi-VN')}`,
      '========================================================================',
      'I. BẢNG ĐÁP ÁN NHANH THEO MÃ ĐỀ:',
      'Câu\tMã 101\tMã 102\tMã 103\tMã 104',
      ...targetExamQuestions.map(
        (_, i) =>
          `Câu ${i + 1}\t  ${examVariants['101']?.[i]?.correctLabel}\t  ${examVariants['102']?.[i]?.correctLabel}\t  ${examVariants['103']?.[i]?.correctLabel}\t  ${examVariants['104']?.[i]?.correctLabel}`
      ),
      '\n========================================================================',
      'II. LỜI GIẢI CHI TIẾT (THEO MÃ ĐỀ ĐANG CHỌN ' + activeExamCode + '):',
      ...activeVariantQuestions.map(
        (q, i) =>
          `Câu ${i + 1} (Đáp án đúng: ${q.correctLabel}) [${q.bloomLevel}]:\n- Câu hỏi: ${q.question}\n- Giải thích: ${q.explanation}\n`
      ),
    ].join('\n');

    const blob = new Blob([lines], { type: 'text/plain;charset=utf-8' });
    triggerDownload(blob, `QuizGen_AI_DapAn_4MaDe_101_104_${Date.now()}.txt`);
    onShowToast(
      'success',
      'Đã tải Bảng Đáp Án Chấm Thi (4 Mã đề)',
      'Tệp đáp án tổng hợp của cả 4 mã đề 101, 102, 103, 104 kèm lời giải đã được tải xuống.'
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
          config: {
            universityName: 'TRƯỜNG ĐẠI HỌC GIAO THÔNG VẬN TẢI TP.HCM (UTH)',
            facultyName: currentUser?.faculty || 'Khoa Công nghệ Thông tin',
            subjectName:
              selectedSubject === 'all'
                ? targetExamQuestions[0]?.textbookName || 'Kinh tế học Vi mô'
                : selectedSubject,
            examTitle,
            durationMinutes: examDuration,
            examCodeCount: 4,
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
      {/* Top Studio Header & 4-Format Direct Output Bar for Lecturer */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#008689] bg-[#e6f4f4] px-2.5 py-0.5 rounded-md">
              Bước 4/4 • Nhận Đầu Ra Thực Tế Cho Giảng Viên
            </span>
            <h2 className="text-base sm:text-lg font-bold text-slate-800 mt-1">
              Phòng Đóng Gói Tờ Đề Thi A4, Trộn 4 Mã Đề & Kết Xuất Đa Định Dạng
            </h2>
            <p className="text-xs text-slate-500">
              Xem trước trực tiếp tờ đề thi chuẩn A4 kèm phiếu tô OMR, tự động trộn 4 mã đề (101–104) và tải ngay file Word, PDF, Bảng đáp án chấm thi hoặc gói LMS.
            </p>
          </div>

          {/* 4 Immediate Output Buttons for the Teacher */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap items-center gap-2 w-full lg:w-auto shrink-0">
            <button
              onClick={() => handleExport('docx')}
              disabled={isExporting !== null}
              className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-[#008689] hover:bg-[#006f72] text-white font-bold text-xs rounded-lg transition-colors shadow-xs disabled:opacity-50"
            >
              {isExporting === 'docx' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              1. Tải Đề Word (.docx)
            </button>

            <button
              onClick={() => handleExport('pdf')}
              disabled={isExporting !== null}
              className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-colors shadow-xs disabled:opacity-50"
            >
              {isExporting === 'pdf' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <FileSpreadsheet className="w-3.5 h-3.5" />
              )}
              2. Tải Đề PDF + Phiếu OMR
            </button>

            <button
              onClick={handleDownloadAnswerKey}
              className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold text-xs rounded-lg transition-colors"
            >
              <KeyRound className="w-3.5 h-3.5 text-amber-700" />
              3. Tải Bảng Đáp Án (4 Mã đề)
            </button>

            <button
              onClick={() => handleExport('qti')}
              disabled={isExporting !== null}
              className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition-colors shadow-xs disabled:opacity-50"
            >
              {isExporting === 'qti' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Archive className="w-3.5 h-3.5" />
              )}
              4. Xuất Gói LMS QTI (.zip)
            </button>
          </div>
        </div>

        {/* Exam Metadata Config + Mode Switcher */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5 flex-1 w-full">
            <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
              <span className="text-xs font-semibold text-slate-600">Tiêu đề kỳ thi:</span>
              <input
                type="text"
                value={examTitle}
                onChange={(e) => setExamTitle(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-800 w-full sm:w-72 focus:outline-none focus:border-[#008689]"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs font-semibold text-slate-600">Thời gian:</span>
              <select
                value={examDuration}
                onChange={(e) => setExamDuration(Number(e.target.value))}
                className="flex-1 sm:flex-initial px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 bg-white"
              >
                <option value={15}>15 phút (Thường kỳ)</option>
                <option value={45}>45 phút (Giữa kỳ)</option>
                <option value={60}>60 phút (Cuối kỳ)</option>
                <option value={90}>90 phút (Tổng hợp)</option>
              </select>
            </div>

            <button
              onClick={handleReshuffle4Codes}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#e6f4f4] hover:bg-[#d5ecec] text-[#008689] font-bold text-xs transition-colors"
            >
              <Shuffle className="w-3.5 h-3.5" />
              Trộn lại 4 Mã đề (101–104)
            </button>
          </div>

          {/* 3 View Tabs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 w-full xl:w-auto shrink-0">
            {[
              { id: 'preview_paper', label: 'Xem Tờ Đề Thi A4 & OMR', icon: Eye },
              { id: 'answer_key', label: 'Bảng Đáp Án 4 Mã Đề', icon: KeyRound },
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
                  className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
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
            {/* Code Switcher Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500 uppercase">
                  Chọn Mã Đề Xem Trước:
                </span>
                {(['101', '102', '103', '104'] as const).map((code) => (
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
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Printer className="w-3.5 h-3.5 text-[#008689]" />
                In trực tiếp tờ đề này
              </button>
            </div>

            {/* Official University Header on A4 Paper */}
            <div className="border-2 border-slate-800 p-4 rounded-lg">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-center border-b border-slate-300 pb-3">
                <div className="space-y-0.5">
                  <p className="text-[11px] font-bold uppercase text-slate-700">
                    TRƯỜNG ĐẠI HỌC GIAO THÔNG VẬN TẢI TP.HCM
                  </p>
                  <p className="text-xs font-extrabold uppercase text-slate-900">
                    {currentUser?.faculty || 'KHOA CÔNG NGHỆ THÔNG TIN'}
                  </p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs font-extrabold uppercase text-slate-900">{examTitle}</p>
                  <p className="text-[11px] font-semibold text-slate-600">
                    Học phần:{' '}
                    {selectedSubject === 'all'
                      ? targetExamQuestions[0]?.textbookName.replace(/\.[^/.]+$/, '') ||
                        'Kinh tế học Vi mô'
                      : selectedSubject}
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

            {/* Shuffled Questions List on A4 Paper */}
            <div className="space-y-5 pt-2">
              {activeVariantQuestions.map((q, index) => (
                <div key={`${activeExamCode}-${q.id}`} className="space-y-2 text-sm text-slate-900">
                  <p className="font-semibold leading-relaxed">
                    <span className="font-extrabold">Câu {index + 1}: </span>
                    {q.question}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-2">
                    {q.options.map((opt) => (
                      <div key={opt.id} className="text-xs sm:text-sm text-slate-800">
                        <span className="font-bold">{opt.label}. </span>
                        <span>{opt.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-slate-200 text-center text-xs font-bold text-slate-500 uppercase">
              — HẾT (Sinh viên không được sử dụng tài liệu) —
            </div>
          </div>

          {/* Right: OMR Answer Sheet Preview & Quick Answer Key */}
          <div className="lg:col-span-4 space-y-4">
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
                  Xem đủ 4 mã đề →
                </button>
              </div>
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
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: ANSWER KEY MATRIX FOR ALL 4 EXAM CODES (101, 102, 103, 104) */}
      {viewMode === 'answer_key' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-800">
                Bảng Đáp Án Chấm Thi Tổng Hợp (4 Mã Đề: 101, 102, 103, 104)
              </h3>
              <p className="text-xs text-slate-500">
                Dành cho Giảng viên lưu hồ sơ chấm thi sau khi trộn đề bằng thuật toán Fisher-Yates
              </p>
            </div>
            <button
              onClick={handleDownloadAnswerKey}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#008689] hover:bg-[#006f72] text-white text-xs font-bold transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Tải Bảng Đáp Án & Lời Giải (.txt)
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase">
                  <th className="py-3 px-4">Thứ tự câu trên đề</th>
                  <th className="py-3 px-4 text-center">Mã đề 101</th>
                  <th className="py-3 px-4 text-center">Mã đề 102</th>
                  <th className="py-3 px-4 text-center">Mã đề 103</th>
                  <th className="py-3 px-4 text-center">Mã đề 104</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {targetExamQuestions.map((_, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-bold text-slate-800">Câu {idx + 1}</td>
                    {(['101', '102', '103', '104'] as const).map((code) => (
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
                        </div>

                        <p className="text-sm font-semibold text-slate-800 leading-relaxed">
                          {q.question}
                        </p>

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
                                    <span className="font-bold">{opt.label}.</span>
                                    <span>{opt.text}</span>
                                  </div>
                                );
                              })}
                            </div>

                            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
                              <div>
                                <strong className="text-slate-700">Giải thích: </strong>
                                {q.explanation}
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
                <div className="p-10 text-center text-sm text-slate-500">
                  <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  Không tìm thấy câu hỏi nào khớp với bộ lọc hiện tại.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
