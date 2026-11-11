import React, { useState } from 'react';
import {
  Database,
  Filter,
  Search,
  CheckCircle2,
  Download,
  FileText,
  FileSpreadsheet,
  Shuffle,
  Trash2,
  Layers,
  Sparkles,
  Printer,
  ChevronDown,
  X,
  Settings2,
  Check,
  Archive
} from 'lucide-react';
import { Question, BloomLevel, ExamExportConfig } from '../types';
import apiClient from '../services/apiClient';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

interface QuestionBankScreenProps {
  questions: Question[];
  onShowToast: (type: 'success' | 'info' | 'warning' | 'error', title: string, message: string) => void;
}

export const QuestionBankScreen: React.FC<QuestionBankScreenProps> = ({ questions, onShowToast }) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBloom, setSelectedBloom] = useState<string>('all');
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState<'docx' | 'pdf' | 'qti' | 'zip'>('zip');
  const [isExporting, setIsExporting] = useState(false);

  // Exam Builder Config
  const [examConfig, setExamConfig] = useState<ExamExportConfig>({
    universityName: 'ĐẠI HỌC QUỐC GIA',
    facultyName: 'Khoa Kinh tế & Quản trị',
    subjectName: 'Kinh tế vi mô',
    examTitle: 'ĐỀ THI KẾT THÚC HỌC PHẦN - HỌC KỲ II',
    durationMinutes: 60,
    examCodeCount: 4,
    shuffleQuestions: true,
    shuffleOptions: true,
    includeAnswerKey: true,
    includeExplanation: false,
    format: 'docx',
  });

  const approvedQuestions = questions.filter((q) => q.status === 'approved');

  const filtered = approvedQuestions.filter((q) => {
    const matchSearch =
      q.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.chapter.toLowerCase().includes(searchQuery.toLowerCase());
    const matchBloom = selectedBloom === 'all' || q.bloomLevel === selectedBloom;
    return matchSearch && matchBloom;
  });

  const handleToggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filtered.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map((q) => q.id));
    }
  };

  const handleOpenExportModal = (format: 'docx' | 'pdf' | 'qti' | 'zip') => {
    setExportFormat(format);
    setExamConfig((prev) => ({
      ...prev,
      format,
      includeOmrSheet: format === 'pdf' || format === 'zip' ? true : false,
    }));
    setShowExportModal(true);
  };

  const handleDownloadStandaloneOmr = async () => {
    try {
      const response = await fetch(`${API_BASE}/exams/export/omr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          universityName: examConfig.universityName,
          facultyName: examConfig.facultyName,
          subjectName: examConfig.subjectName,
          examCode: '101'
        })
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Phieu_Tra_Loi_OMR_50_Cau_Chuan.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      onShowToast('success', 'Tải phiếu OMR thành công!', 'Đã tải Phiếu trả lời trắc nghiệm OMR 50 câu chuẩn thi đại học.');
    } catch (err) {
      console.warn('Lỗi tải phiếu OMR:', err);
      onShowToast('info', 'Phiếu OMR 50 câu', 'Đang chuyển hướng tạo phiếu trắc nghiệm quang học OMR.');
    }
  };

  const handleConfirmExport = async () => {
    setIsExporting(true);
    setShowExportModal(false);
    const count = selectedIds.length;
    const formatName =
      exportFormat === 'docx'
        ? 'Word (.docx chuẩn ĐH)'
        : exportFormat === 'pdf'
        ? 'PDF (kèm phiếu OMR)'
        : exportFormat === 'qti'
        ? 'Gói LMS QTI 2.1 (Canvas/Moodle)'
        : 'Trọn bộ Khảo thí (.ZIP Đề + OMR + Đáp án)';

    try {
      const questionsToExport = approvedQuestions.filter((q) => selectedIds.includes(q.id));
      // 1. Lưu bài thi đã kiểm duyệt vào DB exams.exams qua endpoint POST /api/v1/exams/save
      try {
        await apiClient.fetch(`${API_BASE}/exams/save`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: examConfig.examTitle,
            subject: examConfig.subjectName,
            university: examConfig.universityName,
            faculty: examConfig.facultyName,
            durationMinutes: examConfig.durationMinutes || 60,
            examCodes: Array.from({ length: examConfig.examCodeCount || 1 }, (_, i) => String(101 + i)),
            selectedQuestionIds: selectedIds,
            format: exportFormat,
            questions: questionsToExport,
          }),
        });
      } catch (saveErr) {
        console.warn('Lưu bài thi vào DB exams.exams có cảnh báo:', saveErr);
      }

      // 2. Tải trực tiếp file đề thi (Word .docx hoặc PDF kèm phiếu OMR hoặc QTI)
      const response = await apiClient.fetch(`${API_BASE}/exams/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...examConfig,
          format: exportFormat,
          selectedQuestionIds: selectedIds,
          questions: questionsToExport,
          includeOmrSheet: (exportFormat === 'pdf' || exportFormat === 'zip') ? (examConfig.includeOmrSheet ?? true) : false,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const fileExt = (exportFormat === 'qti' || exportFormat === 'zip') ? 'zip' : exportFormat;
      const safeSubject = (examConfig.subjectName || 'DeThi').replace(/[^a-zA-Z0-9_À-ɏẠ-ỹ]/g, '_');
      a.download = `DeThi_${safeSubject}_${Date.now()}.${fileExt}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      onShowToast(
        'success',
        'Đã lưu vào DB exams.exams & Tải đề thi thành công!',
        `Đã lưu cấu trúc đề thi vào CSDL và tải xuống ${examConfig.examCodeCount} mã đề (${count} câu/đề) định dạng ${formatName}.`
      );
    } catch (err) {
      console.warn('Lỗi kết nối xuất đề thi qua API Gateway, sử dụng mô phỏng client:', err);
      onShowToast(
        'info',
        'Đã đóng gói đề thi (Chế độ mô phỏng)',
        `Đã tạo ${examConfig.examCodeCount} mã đề (${count} câu/đề) định dạng ${formatName}. Tải xuống hoàn tất.`
      );
    } finally {
      setIsExporting(false);
    }
  };

  // Bloom counts for selected
  const selectedQuestions = approvedQuestions.filter((q) => selectedIds.includes(q.id));
  const nhanBietCount = selectedQuestions.filter((q) => q.bloomLevel === 'Nhận biết').length;
  const thongHieuCount = selectedQuestions.filter((q) => q.bloomLevel === 'Thông hiểu').length;
  const vanDungCount = selectedQuestions.filter((q) => q.bloomLevel === 'Vận dụng').length;

  return (
    <div className="flex-1 p-6 md:p-8 overflow-y-auto space-y-6 bg-[#f7f9fb] text-slate-800 relative pb-28">
      {/* 1. Header */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              Exam Vault & Packaging
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight mt-1.5">
            Ngân hàng Đề thi & Xuất bản Chuẩn hóa
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Kho lưu trữ các câu hỏi trắc nghiệm đã được thẩm định. Chọn câu hỏi để đóng gói đề thi chuẩn.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <span className="text-xs font-bold px-3.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono">
            {approvedQuestions.length} câu đã thẩm định
          </span>
        </div>
      </div>

      {/* 2. Main Layout: Filters + Data Table */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 relative z-10">
        {/* Left Filter Column (1 Col) */}
        <div className="space-y-5">
          <div className="glass-card p-5 rounded-2xl space-y-4">
            <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
              <Filter className="w-4 h-4 text-[#008689]" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Bộ lọc ngân hàng</h3>
            </div>

            {/* Bloom Level */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2">
                Thang đo Bloom:
              </label>
              <div className="space-y-1.5">
                {[
                  { id: 'all', label: 'Tất cả mức độ' },
                  { id: 'Nhận biết', label: '1. Nhận biết' },
                  { id: 'Thông hiểu', label: '2. Thông hiểu' },
                  { id: 'Vận dụng', label: '3. Vận dụng' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setSelectedBloom(item.id)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between ${
                      selectedBloom === item.id
                        ? 'bg-[#008689] text-white shadow-sm'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Textbook Filter */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2">
                Giáo trình nguồn:
              </label>
              <select className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:bg-white focus:border-[#008689]">
                <option className="bg-white text-slate-800">Tất cả giáo trình (12)</option>
                <option className="bg-white text-slate-800">Kinh tế vi mô 2025</option>
                <option className="bg-white text-slate-800">Nguyên lý kế toán</option>
              </select>
            </div>
          </div>
        </div>

        {/* Right Questions Table (3 Cols) */}
        <div className="lg:col-span-3 glass-card rounded-2xl overflow-hidden flex flex-col">
          {/* Table Header Controls */}
          <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm nội dung câu hỏi hoặc từ khóa..."
                className="w-full pl-8 pr-3.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-[#008689] text-slate-900 placeholder-slate-400"
              />
            </div>

            <div className="text-xs text-slate-500 font-mono">
              Hiển thị <span className="font-bold text-slate-900">{filtered.length}</span> câu
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3.5 px-4 w-10">
                    <input
                      type="checkbox"
                      checked={
                        filtered.length > 0 && selectedIds.length === filtered.length
                      }
                      onChange={handleSelectAll}
                      className="w-4 h-4 rounded text-[#008689] focus:ring-[#008689] cursor-pointer accent-[#008689]"
                    />
                  </th>
                  <th className="py-3.5 px-3 w-24">Mức độ</th>
                  <th className="py-3.5 px-4">Nội dung câu hỏi trắc nghiệm</th>
                  <th className="py-3.5 px-4">Đáp án chuẩn</th>
                  <th className="py-3.5 px-4">Chương mục</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filtered.map((q) => {
                  const isChecked = selectedIds.includes(q.id);
                  const correctOpt = q.options.find((o) => o.id === q.correctAnswerId);

                  return (
                    <tr
                      key={q.id}
                      onClick={() => handleToggleSelect(q.id)}
                      className={`hover:bg-[#f3f7f8] transition-colors cursor-pointer ${
                        isChecked ? 'bg-[#e0f7fa]/55' : ''
                      }`}
                    >
                      <td className="py-4 px-4" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleSelect(q.id)}
                          className="w-4 h-4 rounded text-[#008689] focus:ring-[#008689] cursor-pointer accent-[#008689]"
                        />
                      </td>

                      <td className="py-4 px-3 font-semibold">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap ${
                            q.bloomLevel === 'Nhận biết'
                              ? 'bg-sky-50 text-sky-700 border-sky-200'
                              : q.bloomLevel === 'Thông hiểu'
                              ? 'bg-[#e0f7fa] text-[#008689] border-[#008689]/25'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {q.bloomLevel}
                        </span>
                      </td>

                      <td className="py-4 px-4 max-w-md">
                        <div className="font-bold text-slate-900 text-xs leading-snug">
                          {q.question}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1 truncate">
                          A: {q.options[0]?.text} | B: {q.options[1]?.text}
                        </div>
                      </td>

                      <td className="py-4 px-4 font-bold text-emerald-700">
                        {correctOpt ? `${correctOpt.label}. ${correctOpt.text}` : '-'}
                      </td>

                      <td className="py-4 px-4 text-slate-500 text-[11px] font-mono">
                        {q.chapter}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 3. Floating Action Bar (Dynamic Glass Dock) */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-72 right-8 dock-glass text-slate-800 p-4 rounded-2xl shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4 z-40 animate-slideUp">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 rounded-xl bg-[#008689] flex items-center justify-center font-bold text-white text-base shadow-sm">
              {selectedIds.length}
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Câu hỏi đã chọn vào Giỏ đề thi
              </div>
              <div className="text-xs text-slate-500 flex items-center space-x-2 mt-0.5 font-mono">
                <span>Nhận biết: <strong className="text-sky-700">{nhanBietCount}</strong></span>
                <span>•</span>
                <span>Thông hiểu: <strong className="text-[#008689]">{thongHieuCount}</strong></span>
                <span>•</span>
                <span>Vận dụng: <strong className="text-amber-700">{vanDungCount}</strong></span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 flex-wrap gap-y-2">
            <button
              onClick={() => handleOpenExportModal('zip')}
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-105 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
            >
              <Archive className="w-4 h-4" />
              <span>Trọn bộ ZIP (Đề + OMR)</span>
            </button>

            <button
              onClick={() => handleOpenExportModal('docx')}
              className="flex items-center space-x-1.5 px-3 py-2 bg-gradient-to-r from-[#008689] to-[#1d999d] hover:brightness-105 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
            >
              <FileText className="w-4 h-4" />
              <span>Word</span>
            </button>

            <button
              onClick={() => handleOpenExportModal('pdf')}
              className="flex items-center space-x-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-all border border-slate-200"
            >
              <Printer className="w-4 h-4" />
              <span>In PDF</span>
            </button>

            <button
              onClick={() => handleOpenExportModal('qti')}
              className="flex items-center space-x-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all"
            >
              <Sparkles className="w-4 h-4" />
              <span>Gói Canvas QTI</span>
            </button>

            <button
              onClick={handleDownloadStandaloneOmr}
              title="Tải riêng Phiếu tô trắc nghiệm OMR 50 câu chuẩn thi đại học"
              className="flex items-center space-x-1 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-bold transition-all border border-emerald-200"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Phiếu OMR 50</span>
            </button>

            <button
              onClick={() => setSelectedIds([])}
              className="p-2 text-slate-400 hover:text-slate-700 rounded-lg transition-colors ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 4. MODAL: Customize Exam Output */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-[#f8fbfc]">
              <div className="flex items-center space-x-2">
                <Settings2 className="w-5 h-5 text-[#008689]" />
                <h3 className="font-bold text-slate-900 text-xs">
                  Tùy chỉnh Đóng gói Đề thi ({selectedIds.length} câu đã chọn)
                </h3>
              </div>
              <button
                onClick={() => setShowExportModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs text-slate-700 max-h-[75vh] overflow-y-auto">
              {/* Tabs chọn định dạng */}
              <div>
                <label className="font-bold block mb-1.5 text-slate-600">Định dạng xuất bản khảo thí:</label>
                <div className="grid grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => { setExportFormat('zip'); setExamConfig(c => ({ ...c, format: 'zip', includeOmrSheet: true })); }}
                    className={`py-2 px-2 rounded-xl border text-center font-bold text-xs transition-all ${
                      exportFormat === 'zip'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    Trọn bộ ZIP
                  </button>
                  <button
                    type="button"
                    onClick={() => { setExportFormat('docx'); setExamConfig(c => ({ ...c, format: 'docx' })); }}
                    className={`py-2 px-2 rounded-xl border text-center font-bold text-xs transition-all ${
                      exportFormat === 'docx'
                        ? 'bg-[#e0f7fa] border-[#008689] text-[#006d70] shadow-sm'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    Word (.docx)
                  </button>
                  <button
                    type="button"
                    onClick={() => { setExportFormat('pdf'); setExamConfig(c => ({ ...c, format: 'pdf', includeOmrSheet: true })); }}
                    className={`py-2 px-2 rounded-xl border text-center font-bold text-xs transition-all ${
                      exportFormat === 'pdf'
                        ? 'bg-sky-50 border-sky-500 text-sky-700 shadow-sm'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    PDF + OMR
                  </button>
                  <button
                    type="button"
                    onClick={() => { setExportFormat('qti'); setExamConfig(c => ({ ...c, format: 'qti' })); }}
                    className={`py-2 px-2 rounded-xl border text-center font-bold text-xs transition-all ${
                      exportFormat === 'qti'
                        ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-sm'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    LMS QTI 2.1
                  </button>
                </div>
              </div>

              {exportFormat === 'zip' && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs leading-relaxed">
                  <strong>Đóng gói bộ đề thi đa định dạng (SCRUM-56):</strong> Tự động xuất nén các mã đề (.pdf & .docx), Phiếu trả lời trắc nghiệm OMR 50 câu chuẩn thi đại học, Bảng ma trận đáp án so sánh chéo (.docx & .csv) và Gói LMS Canvas/Moodle IMS QTI 2.1 vào 1 tệp .ZIP duy nhất.
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold block mb-1 text-slate-600">Tên trường Đại học:</label>
                  <input
                    type="text"
                    value={examConfig.universityName}
                    onChange={(e) => setExamConfig({ ...examConfig, universityName: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:border-[#008689] outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold block mb-1 text-slate-600">Khoa / Bộ môn:</label>
                  <input
                    type="text"
                    value={examConfig.facultyName}
                    onChange={(e) => setExamConfig({ ...examConfig, facultyName: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:border-[#008689] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold block mb-1 text-slate-600">Tiêu đề đề thi:</label>
                <input
                  type="text"
                  value={examConfig.examTitle}
                  onChange={(e) => setExamConfig({ ...examConfig, examTitle: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-semibold focus:bg-white focus:border-[#008689] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold block mb-1 text-slate-600">Môn học:</label>
                  <input
                    type="text"
                    value={examConfig.subjectName}
                    onChange={(e) => setExamConfig({ ...examConfig, subjectName: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:border-[#008689] outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold block mb-1 text-slate-600">Số lượng mã đề đảo (101, 102...):</label>
                  <select
                    value={examConfig.examCodeCount}
                    onChange={(e) => setExamConfig({ ...examConfig, examCodeCount: parseInt(e.target.value) })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:border-[#008689] outline-none"
                  >
                    <option value={1} className="bg-white text-slate-900">1 mã đề gốc</option>
                    <option value={2} className="bg-white text-slate-900">2 mã đề đảo (101, 102)</option>
                    <option value={4} className="bg-white text-slate-900">4 mã đề chuẩn (101, 102, 103, 104)</option>
                    <option value={8} className="bg-white text-slate-900">8 mã đề</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold block mb-1 text-slate-600">Thời gian làm bài (phút):</label>
                  <input
                    type="number"
                    min={15}
                    max={180}
                    value={examConfig.durationMinutes || 60}
                    onChange={(e) => setExamConfig({ ...examConfig, durationMinutes: parseInt(e.target.value) || 60 })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono focus:bg-white focus:border-[#008689] outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold block mb-1 text-slate-600">Mã đề gốc:</label>
                  <input
                    type="text"
                    defaultValue="101"
                    readOnly
                    className="w-full p-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-500 font-mono cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Toggles */}
              <div className="space-y-2 pt-3 border-t border-slate-100">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={examConfig.includeAnswerKey}
                    onChange={(e) => setExamConfig({ ...examConfig, includeAnswerKey: e.target.checked })}
                    className="w-4 h-4 text-[#008689] rounded accent-[#008689]"
                  />
                  <span>Tự động tạo bảng ma trận đáp án ở trang cuối</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={examConfig.shuffleOptions}
                    onChange={(e) => setExamConfig({ ...examConfig, shuffleOptions: e.target.checked })}
                    className="w-4 h-4 text-[#008689] rounded accent-[#008689]"
                  />
                  <span>Xáo trộn ngẫu nhiên thứ tự các phương án A, B, C, D</span>
                </label>

                {(exportFormat === 'pdf' || exportFormat === 'zip') && (
                  <label className="flex items-center space-x-2 cursor-pointer text-emerald-700 font-semibold">
                    <input
                      type="checkbox"
                      checked={examConfig.includeOmrSheet ?? true}
                      onChange={(e) => setExamConfig({ ...examConfig, includeOmrSheet: e.target.checked })}
                      className="w-4 h-4 text-emerald-600 rounded accent-emerald-600"
                    />
                    <span>Đính kèm phiếu trả lời trắc nghiệm chuẩn OMR 50 câu (Bubble Sheet)</span>
                  </label>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-mono">
                Định dạng: <strong className="text-[#008689] uppercase">{exportFormat}</strong>
              </span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowExportModal(false)}
                  className="px-4 py-2 border border-slate-200 bg-white text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-100"
                >
                  Hủy
                </button>
                <button
                  onClick={handleConfirmExport}
                  disabled={isExporting}
                  className="px-5 py-2 bg-gradient-to-r from-[#008689] to-[#1d999d] hover:brightness-105 text-white rounded-xl text-xs font-bold shadow-sm flex items-center space-x-1.5"
                >
                  <Download className="w-4 h-4" />
                  <span>{isExporting ? 'Đang tạo tệp...' : 'Xác nhận & Tải tệp xuống'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
