import React from 'react';
import {
  GraduationCap,
  Building2,
  BookOpen,
  FileText,
  Shuffle,
  FolderOpen,
  Download,
  FileSpreadsheet,
  KeyRound,
  Archive,
  Loader2,
  Eye,
  ListChecks,
  BarChart3,
} from 'lucide-react';
import { SavedExamItem } from './types';

interface ExamStudioHeaderProps {
  universityName: string;
  onUniversityNameChange: (val: string) => void;
  facultyName: string;
  onFacultyNameChange: (val: string) => void;
  subjectName: string;
  onSubjectNameChange: (val: string) => void;
  subjects: string[];
  examTitle: string;
  onExamTitleChange: (val: string) => void;
  examCodeCount: number;
  onExamCodeCountChange: (count: number) => void;
  examDuration: number;
  onExamDurationChange: (duration: number) => void;
  onReshuffleCodes: () => void;
  savedExams: SavedExamItem[];
  onOpenExamHistory: () => void;
  targetQuestionsCount: number;
  isExporting: string | null;
  onExport: (format: 'docx' | 'pdf' | 'qti') => void;
  onDownloadAnswerKey: () => void;
  viewMode: 'preview_paper' | 'question_list' | 'answer_key' | 'analytics';
  onViewModeChange: (mode: 'preview_paper' | 'question_list' | 'answer_key' | 'analytics') => void;
  availableCodesCount: number;
  filteredQuestionsCount: number;
}

export const ExamStudioHeader: React.FC<ExamStudioHeaderProps> = ({
  universityName,
  onUniversityNameChange,
  facultyName,
  onFacultyNameChange,
  subjectName,
  onSubjectNameChange,
  subjects,
  examTitle,
  onExamTitleChange,
  examCodeCount,
  onExamCodeCountChange,
  examDuration,
  onExamDurationChange,
  onReshuffleCodes,
  savedExams,
  onOpenExamHistory,
  targetQuestionsCount,
  isExporting,
  onExport,
  onDownloadAnswerKey,
  viewMode,
  onViewModeChange,
  availableCodesCount,
  filteredQuestionsCount,
}) => {
  return (
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
                onChange={(e) => onUniversityNameChange(e.target.value)}
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
                onChange={(e) => onFacultyNameChange(e.target.value)}
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
                  onChange={(e) => onSubjectNameChange(e.target.value)}
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
                onChange={(e) => onExamTitleChange(e.target.value)}
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
                onChange={(e) => onExamCodeCountChange(Number(e.target.value))}
                className="w-full h-8 px-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:border-[#008689] shadow-2xs cursor-pointer"
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
                  onChange={(e) => onExamDurationChange(Number(e.target.value))}
                  className="w-16 h-8 px-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:border-[#008689] shadow-2xs cursor-pointer"
                >
                  <option value={15}>15p</option>
                  <option value={45}>45p</option>
                  <option value={60}>60p</option>
                  <option value={90}>90p</option>
                </select>

                <button
                  type="button"
                  onClick={onReshuffleCodes}
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
          {/* 1. Nút Kho Đề Đã Sinh */}
          <button
            type="button"
            onClick={onOpenExamHistory}
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
              onClick={() => onExport('docx')}
              disabled={isExporting !== null || targetQuestionsCount === 0}
              title={targetQuestionsCount === 0 ? 'Chưa có câu hỏi để xuất đề thi' : 'Tải đề thi định dạng Microsoft Word (.docx)'}
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
              onClick={() => onExport('pdf')}
              disabled={isExporting !== null || targetQuestionsCount === 0}
              title={targetQuestionsCount === 0 ? 'Chưa có câu hỏi để xuất đề thi' : 'Tải đề thi PDF in ấn chuẩn A4 kèm phiếu tô OMR 50 câu'}
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
              onClick={onDownloadAnswerKey}
              disabled={targetQuestionsCount === 0}
              title={targetQuestionsCount === 0 ? 'Chưa có câu hỏi để tải đáp án' : 'Tải bảng đáp án chấm thi tổng hợp cho tất cả mã đề'}
              className="h-7 px-2.5 rounded-md text-[10.5px] font-bold bg-amber-500 hover:bg-amber-600 text-white transition-colors shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center gap-1 whitespace-nowrap cursor-pointer"
            >
              <KeyRound className="w-3 h-3 text-white" />
              <span>Tải Bảng Đáp Án</span>
            </button>

            <button
              type="button"
              onClick={() => onExport('qti')}
              disabled={isExporting !== null || targetQuestionsCount === 0}
              title={targetQuestionsCount === 0 ? 'Chưa có câu hỏi để xuất gói LMS' : 'Xuất gói câu hỏi Canvas / Moodle LMS QTI 2.1 (.zip)'}
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

      {/* Chế độ hiển thị & đối soát: 4 View Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
        <span className="text-xs text-slate-500 font-medium">
          Chế độ hiển thị & đối soát:
        </span>

        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
          {[
            { id: 'preview_paper', label: 'Xem Tờ Đề Thi A4 & OMR', icon: Eye },
            { id: 'answer_key', label: `Bảng Đáp Án (${availableCodesCount} Mã Đề)`, icon: KeyRound },
            {
              id: 'question_list',
              label: `Kho Câu Hỏi (${filteredQuestionsCount})`,
              icon: ListChecks,
            },
            {
              id: 'analytics',
              label: 'Ma Trận & Chuẩn Bloom',
              icon: BarChart3,
            },
          ].map((tab) => {
            const Icon = tab.icon;
            const isAct = viewMode === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onViewModeChange(tab.id as typeof viewMode)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
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
  );
};
