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
  FileCheck2,
  Archive,
} from 'lucide-react';
import { Question, BloomLevel, ExamExportConfig, ExamExportFormat } from '../types';
import apiClient from '../services/apiClient';
import { exportExamWorkflow, computeBloomSummary } from '../services/examExportClient';

const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

interface QuestionBankScreenProps {
  questions: Question[];
  onShowToast: (type: 'success' | 'info' | 'warning' | 'error', title: string, message: string) => void;
}

export const QuestionBankScreen: React.FC<QuestionBankScreenProps> = ({ questions, onShowToast }) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBloom, setSelectedBloom] = useState<string>('all');
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExamExportFormat>('docx');
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
    includeOmrSheet: true,
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

  // Mở modal xuất bản theo 4 định dạng chuẩn của Sprint 3 [SCRUM-64]
  const handleOpenExportModal = (format: ExamExportFormat) => {
    setExportFormat(format);
    setExamConfig((prev) => ({
      ...prev,
      format,
      includeOmrSheet: format === 'pdf' || format === 'zip' || format === 'omr' ? true : prev.includeOmrSheet,
    }));
    setShowExportModal(true);
  };

  // Tải trực tiếp mẫu phiếu OMR 50 câu chuẩn thi đại học
  const handleDownloadStandaloneOmr = async () => {
    setIsExporting(true);
    await exportExamWorkflow(
      {
        ...examConfig,
        format: 'omr',
      },
      [],
      onShowToast
    );
    setIsExporting(false);
  };

  // Xác nhận xuất đề thi từ Giỏ đề thi
  const handleConfirmExport = async () => {
    setIsExporting(true);
    setShowExportModal(false);

    const questionsToExport = approvedQuestions.filter((q) => selectedIds.includes(q.id));
    const exportList = questionsToExport.length > 0 ? questionsToExport : approvedQuestions;

    await exportExamWorkflow(
      {
        ...examConfig,
        format: exportFormat,
      },
      exportList,
      onShowToast
    );

    setIsExporting(false);
  };

  // Thống kê phân bổ nhận thức Bloom của giỏ câu hỏi đang chọn
  const selectedQuestions = approvedQuestions.filter((q) => selectedIds.includes(q.id));
  const bloomSummary = computeBloomSummary(selectedQuestions);
  const totalSelected = selectedQuestions.length;
  const pct = (val: number) => (totalSelected > 0 ? Math.round((val / totalSelected) * 100) : 0);

  return (
    <div className="flex-1 p-8 overflow-y-auto space-y-6 bg-[#0b0f19] text-slate-100 relative pb-28">
      {/* Background glow */}
      <div className="absolute top-20 right-10 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* 1. Header */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-white/[0.06]">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Exam Vault & Multi-Format Exporter
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight mt-1.5">
            Ngân hàng Đề thi & Xuất bản Chuẩn hóa
          </h1>
          <p className="text-xs md:text-sm text-slate-400 mt-1">
            Kho lưu trữ câu hỏi trắc nghiệm đã thẩm định. Hỗ trợ xuất Word chuẩn Bộ GD&ĐT, In PDF A4, Gói Canvas QTI và Phiếu OMR 50 câu.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {/* Nút Tải nhanh Phiếu OMR 50 câu độc lập */}
          <button
            onClick={handleDownloadStandaloneOmr}
            disabled={isExporting}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 text-xs font-semibold transition-all shadow-sm"
            title="Tải mẫu phiếu trả lời trắc nghiệm quang học OMR 50 câu chuẩn thi đại học"
          >
            <FileSpreadsheet className="w-4 h-4 text-purple-400" />
            <span>Mẫu Phiếu OMR 50 câu (.pdf)</span>
          </button>

          <span className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-mono">
            {approvedQuestions.length} câu đã thẩm định
          </span>
        </div>
      </div>

      {/* 2. Main Layout: Filters + Data Table */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 relative z-10">
        {/* Left Filter Column (1 Col) */}
        <div className="space-y-5">
          <div className="glass-card p-5 rounded-2xl space-y-4">
            <div className="flex items-center space-x-2 pb-3 border-b border-white/[0.06]">
              <Filter className="w-4 h-4 text-blue-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Bộ lọc ngân hàng</h3>
            </div>

            {/* Bloom Level */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Thang đo Bloom:
              </label>
              <div className="space-y-1.5">
                {[
                  { id: 'all', label: 'Tất cả mức độ' },
                  { id: 'Nhận biết', label: '1. Nhận biết' },
                  { id: 'Thông hiểu', label: '2. Thông hiểu' },
                  { id: 'Vận dụng', label: '3. Vận dụng' },
                  { id: 'Phân tích', label: '4. Phân tích' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setSelectedBloom(item.id)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-between ${
                      selectedBloom === item.id
                        ? 'bg-blue-600 text-white shadow-glow-sm'
                        : 'text-slate-400 hover:bg-white/[0.04] hover:text-white'
                    }`}
                  >
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Textbook Filter */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Giáo trình nguồn:
              </label>
              <select className="w-full p-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-xs text-slate-200">
                <option className="bg-[#111827]">Tất cả giáo trình (GiaoTrinh_KinhTeViMo_2025.pdf)</option>
                <option className="bg-[#111827]">Kinh tế vi mô 2025</option>
                <option className="bg-[#111827]">Trí tuệ nhân tạo 2026</option>
              </select>
            </div>
          </div>
        </div>

        {/* Right Questions Table (3 Cols) */}
        <div className="lg:col-span-3 glass-card rounded-2xl overflow-hidden flex flex-col">
          {/* Table Header Controls */}
          <div className="p-4 border-b border-white/[0.06] flex items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm nội dung câu hỏi hoặc từ khóa..."
                className="w-full pl-8 pr-3.5 py-1.5 text-xs bg-white/[0.04] border border-white/[0.08] rounded-xl focus:outline-none focus:border-blue-500 text-white placeholder-slate-400"
              />
            </div>

            <div className="text-xs text-slate-400 font-mono">
              Hiển thị <span className="font-bold text-white">{filtered.length}</span> câu
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-white/[0.02] border-b border-white/[0.06] text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3.5 px-4 w-10">
                    <input
                      type="checkbox"
                      checked={
                        filtered.length > 0 && selectedIds.length === filtered.length
                      }
                      onChange={handleSelectAll}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
                    />
                  </th>
                  <th className="py-3.5 px-3 w-24">Mức độ Bloom</th>
                  <th className="py-3.5 px-4">Nội dung câu hỏi trắc nghiệm</th>
                  <th className="py-3.5 px-4">Đáp án chuẩn</th>
                  <th className="py-3.5 px-4">Chương mục & Trang</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04] text-slate-300">
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-12 px-6 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center max-w-sm mx-auto space-y-2">
                        <Database className="w-10 h-10 text-slate-600 mb-1 stroke-1" />
                        <p className="font-semibold text-slate-300">Không tìm thấy câu hỏi phù hợp</p>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          {searchQuery || selectedBloom !== 'all'
                            ? 'Vui lòng thay đổi từ khóa tìm kiếm hoặc mức độ Bloom để xem kết quả.'
                            : 'Ngân hàng chưa có câu hỏi được phê duyệt. Hãy chuyển sang phân hệ Khởi tạo Đề thi AI để nạp câu hỏi.'}
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
                {filtered.map((q) => {
                  const isChecked = selectedIds.includes(q.id);
                  const correctOpt = q.options.find((o) => o.id === q.correctAnswerId);
                  const pageNo = q.pageNumber || q.sourceChunk?.pageNumber || 42;

                  return (
                    <tr
                      key={q.id}
                      onClick={() => handleToggleSelect(q.id)}
                      className={`hover:bg-white/[0.03] transition-colors cursor-pointer ${
                        isChecked ? 'bg-blue-600/10' : ''
                      }`}
                    >
                      <td className="py-4 px-4" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleSelect(q.id)}
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
                        />
                      </td>

                      <td className="py-4 px-3 font-semibold">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            q.bloomLevel === 'Nhận biết'
                              ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                              : q.bloomLevel === 'Thông hiểu'
                              ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20'
                              : q.bloomLevel === 'Vận dụng'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                          }`}
                        >
                          {q.bloomLevel}
                        </span>
                      </td>

                      <td className="py-4 px-4 max-w-md">
                        <div className="font-semibold text-white text-xs leading-snug">
                          {q.question}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1 truncate">
                          A: {q.options[0]?.text} | B: {q.options[1]?.text}
                        </div>
                      </td>

                      <td className="py-4 px-4 font-medium text-emerald-400">
                        {correctOpt ? `${correctOpt.label}. ${correctOpt.text}` : '-'}
                      </td>

                      <td className="py-4 px-4 text-slate-400 text-[11px] font-mono">
                        <div className="truncate max-w-[200px]" title={q.chapter}>
                          {q.chapter}
                        </div>
                        <span className="inline-block mt-0.5 text-[10px] text-blue-300 bg-blue-500/10 px-1.5 py-0.2 rounded border border-blue-500/20">
                          Trang {pageNo}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 3. Floating Action Bar (Dynamic Glass Dock khi có câu hỏi được chọn) */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-72 right-8 glass-panel text-white p-4 rounded-2xl shadow-2xl border border-white/15 flex flex-col md:flex-row items-center justify-between gap-4 z-40 animate-slideUp">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-white text-base shadow-glow-sm">
              {selectedIds.length}
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Giỏ đề thi ({selectedIds.length} câu đã chọn)
              </div>
              <div className="text-xs text-slate-400 flex items-center space-x-2 mt-0.5 font-mono">
                <span>Nhận biết: <strong className="text-sky-300">{bloomSummary.nhanBiet}</strong> ({pct(bloomSummary.nhanBiet)}%)</span>
                <span>•</span>
                <span>Thông hiểu: <strong className="text-teal-300">{bloomSummary.thongHieu}</strong> ({pct(bloomSummary.thongHieu)}%)</span>
                <span>•</span>
                <span>Vận dụng: <strong className="text-amber-300">{bloomSummary.vanDung}</strong> ({pct(bloomSummary.vanDung)}%)</span>
                <span>•</span>
                <span>Phân tích: <strong className="text-purple-300">{bloomSummary.phanTich}</strong> ({pct(bloomSummary.phanTich)}%)</span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2.5 flex-wrap gap-y-2">
            {/* 1. Xuất Word */}
            <button
              onClick={() => handleOpenExportModal('docx')}
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md"
              title="Xuất file Word (.docx) chuẩn thể thức Bộ GD&ĐT kèm bảng đáp án và ma trận Bloom"
            >
              <FileText className="w-4 h-4" />
              <span>Xuất Word (.docx)</span>
            </button>

            {/* 2. In PDF */}
            <button
              onClick={() => handleOpenExportModal('pdf')}
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-white/[0.08] hover:bg-white/[0.12] text-white rounded-xl text-xs font-semibold transition-all border border-white/[0.1]"
              title="Xuất bản in PDF khổ A4 chuẩn khảo thí"
            >
              <Printer className="w-4 h-4" />
              <span>In PDF A4</span>
            </button>

            {/* 3. Gói Canvas QTI */}
            <button
              onClick={() => handleOpenExportModal('qti')}
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-indigo-600/80 hover:bg-indigo-600 text-white rounded-xl text-xs font-semibold transition-all"
              title="Xuất gói chuẩn nén Canvas QTI (.zip) để nạp bài thi trực tuyến lên LMS"
            >
              <Sparkles className="w-4 h-4" />
              <span>Canvas QTI (.zip)</span>
            </button>

            {/* 4. Phiếu OMR 50 câu */}
            <button
              onClick={() => handleOpenExportModal('omr')}
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-purple-600/80 hover:bg-purple-600 text-white rounded-xl text-xs font-semibold transition-all"
              title="Tải mẫu phiếu trắc nghiệm quang học OMR 50 câu chuẩn thi đại học"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Phiếu OMR 50 câu</span>
            </button>

            <button
              onClick={() => setSelectedIds([])}
              className="p-2 text-slate-400 hover:text-white rounded-lg transition-colors ml-1"
              title="Bỏ chọn tất cả"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 4. MODAL: Customize Exam Output - 4 Định dạng chuẩn Sprint 3 [SCRUM-64] */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="glass-panel w-full max-w-2xl rounded-2xl shadow-2xl border border-white/[0.12] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-5 border-b border-white/[0.06] flex items-center justify-between bg-white/[0.02]">
              <div className="flex items-center space-x-2">
                <Settings2 className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-white text-sm">
                  Đóng gói & Xuất bản Đề thi ({selectedIds.length} câu trong Giỏ)
                </h3>
              </div>
              <button
                onClick={() => setShowExportModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.08]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 text-xs text-slate-300 max-h-[75vh] overflow-y-auto">
              {/* Lựa chọn 4 định dạng xuất bản */}
              <div>
                <label className="font-bold block mb-2 text-slate-300 uppercase tracking-wider text-[11px]">
                  Chọn định dạng xuất bản:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    {
                      id: 'docx' as ExamExportFormat,
                      label: 'Word (.docx)',
                      desc: 'Chuẩn Bộ GD&ĐT (Kèm đáp án & Bloom)',
                      icon: FileText,
                      activeColor: 'border-blue-500 bg-blue-500/15 text-blue-300',
                    },
                    {
                      id: 'pdf' as ExamExportFormat,
                      label: 'In PDF (A4)',
                      desc: 'Khổ A4 chuẩn in phòng thi',
                      icon: Printer,
                      activeColor: 'border-rose-500 bg-rose-500/15 text-rose-300',
                    },
                    {
                      id: 'qti' as ExamExportFormat,
                      label: 'Canvas QTI (.zip)',
                      desc: 'Nhập trực tuyến LMS Canvas/Moodle',
                      icon: Sparkles,
                      activeColor: 'border-indigo-500 bg-indigo-500/15 text-indigo-300',
                    },
                    {
                      id: 'omr' as ExamExportFormat,
                      label: 'Phiếu OMR (.pdf)',
                      desc: 'Phiếu trắc nghiệm 50 câu chuẩn ĐH',
                      icon: FileSpreadsheet,
                      activeColor: 'border-purple-500 bg-purple-500/15 text-purple-300',
                    },
                  ].map((item) => {
                    const isCur = exportFormat === item.id;
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setExportFormat(item.id)}
                        className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                          isCur
                            ? `${item.activeColor} ring-1 ring-white/20 font-semibold shadow-md`
                            : 'bg-white/[0.03] border-white/[0.08] text-slate-400 hover:bg-white/[0.06] hover:text-white'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <Icon className="w-5 h-5" />
                          {isCur && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white">{item.label}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5 leading-snug">{item.desc}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Thông tin hành chính học thuật */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="font-semibold block mb-1 text-slate-400">Tên cơ sở Đào tạo / Đại học:</label>
                  <input
                    type="text"
                    value={examConfig.universityName}
                    onChange={(e) => setExamConfig({ ...examConfig, universityName: e.target.value })}
                    className="w-full p-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1 text-slate-400">Khoa / Bộ môn:</label>
                  <input
                    type="text"
                    value={examConfig.facultyName}
                    onChange={(e) => setExamConfig({ ...examConfig, facultyName: e.target.value })}
                    className="w-full p-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1 text-slate-400">Tiêu đề kỳ thi:</label>
                <input
                  type="text"
                  value={examConfig.examTitle}
                  onChange={(e) => setExamConfig({ ...examConfig, examTitle: e.target.value })}
                  className="w-full p-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1 text-slate-400">Tên học phần / Môn thi:</label>
                  <input
                    type="text"
                    value={examConfig.subjectName}
                    onChange={(e) => setExamConfig({ ...examConfig, subjectName: e.target.value })}
                    className="w-full p-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1 text-slate-400">Số lượng mã đề đảo (101, 102...):</label>
                  <select
                    value={examConfig.examCodeCount}
                    onChange={(e) => setExamConfig({ ...examConfig, examCodeCount: parseInt(e.target.value) })}
                    className="w-full p-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white"
                  >
                    <option value={1} className="bg-[#111827]">1 mã đề gốc</option>
                    <option value={2} className="bg-[#111827]">2 mã đề đảo (101, 102)</option>
                    <option value={4} className="bg-[#111827]">4 mã đề chuẩn (101, 102, 103, 104)</option>
                    <option value={8} className="bg-[#111827]">8 mã đề</option>
                  </select>
                </div>
              </div>

              {/* Tóm tắt Ma trận Bloom thực tế của giỏ câu hỏi */}
              <div className="p-3.5 bg-white/[0.02] border border-white/[0.08] rounded-xl space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300 block">
                  Ma trận nhận thức Bloom của giỏ ({totalSelected} câu):
                </span>
                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  <div className="p-2 bg-sky-500/10 border border-sky-500/20 rounded-lg">
                    <span className="text-[10px] text-sky-400 block font-semibold">1. Nhận biết</span>
                    <strong className="text-white text-sm">{bloomSummary.nhanBiet}</strong> ({pct(bloomSummary.nhanBiet)}%)
                  </div>
                  <div className="p-2 bg-teal-500/10 border border-teal-500/20 rounded-lg">
                    <span className="text-[10px] text-teal-400 block font-semibold">2. Thông hiểu</span>
                    <strong className="text-white text-sm">{bloomSummary.thongHieu}</strong> ({pct(bloomSummary.thongHieu)}%)
                  </div>
                  <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                    <span className="text-[10px] text-amber-400 block font-semibold">3. Vận dụng</span>
                    <strong className="text-white text-sm">{bloomSummary.vanDung}</strong> ({pct(bloomSummary.vanDung)}%)
                  </div>
                  <div className="p-2 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                    <span className="text-[10px] text-purple-400 block font-semibold">4. Phân tích</span>
                    <strong className="text-white text-sm">{bloomSummary.phanTich}</strong> ({pct(bloomSummary.phanTich)}%)
                  </div>
                </div>
              </div>

              {/* Toggles tùy chọn */}
              <div className="space-y-2 pt-2 border-t border-white/[0.06]">
                <label className="flex items-center space-x-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={examConfig.includeAnswerKey}
                    onChange={(e) => setExamConfig({ ...examConfig, includeAnswerKey: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded accent-blue-600"
                  />
                  <span>Tự động đính kèm Bảng đáp án và Ma trận Bloom ở trang cuối</span>
                </label>

                <label className="flex items-center space-x-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={examConfig.shuffleOptions}
                    onChange={(e) => setExamConfig({ ...examConfig, shuffleOptions: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded accent-blue-600"
                  />
                  <span>Xáo trộn ngẫu nhiên thứ tự các phương án A, B, C, D</span>
                </label>

                <label className="flex items-center space-x-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={examConfig.includeOmrSheet ?? true}
                    onChange={(e) => setExamConfig({ ...examConfig, includeOmrSheet: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded accent-blue-600"
                  />
                  <span>Kèm theo Mẫu phiếu trả lời trắc nghiệm quang học OMR 50 câu chuẩn A4</span>
                </label>
              </div>
            </div>

            {/* Footer Modal */}
            <div className="p-4 border-t border-white/[0.06] bg-white/[0.02] flex items-center justify-between">
              <span className="text-xs text-slate-400 font-mono">
                Định dạng: <strong className="text-blue-400 uppercase">{exportFormat}</strong>
              </span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowExportModal(false)}
                  className="px-4 py-2 border border-white/[0.1] rounded-xl text-xs font-semibold hover:bg-white/[0.05]"
                >
                  Hủy
                </button>
                <button
                  onClick={handleConfirmExport}
                  disabled={isExporting}
                  className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-glow-sm flex items-center space-x-1.5"
                >
                  <Download className={`w-4 h-4 ${isExporting ? 'animate-bounce' : ''}`} />
                  <span>{isExporting ? 'Đang đóng gói...' : 'Xác nhận & Tải tệp xuống'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
