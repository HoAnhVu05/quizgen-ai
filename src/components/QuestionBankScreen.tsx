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
  Check
} from 'lucide-react';
import { Question, BloomLevel, ExamExportConfig } from '../types';

interface QuestionBankScreenProps {
  questions: Question[];
  onShowToast: (type: 'success' | 'info' | 'warning' | 'error', title: string, message: string) => void;
}

export const QuestionBankScreen: React.FC<QuestionBankScreenProps> = ({ questions, onShowToast }) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBloom, setSelectedBloom] = useState<string>('all');
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState<'docx' | 'pdf' | 'qti'>('docx');

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

  const handleOpenExportModal = (format: 'docx' | 'pdf' | 'qti') => {
    setExportFormat(format);
    setExamConfig((prev) => ({ ...prev, format }));
    setShowExportModal(true);
  };

  const handleConfirmExport = () => {
    setShowExportModal(false);
    const count = selectedIds.length;
    const formatName =
      exportFormat === 'docx'
        ? 'Word (.docx chuẩn ĐH)'
        : exportFormat === 'pdf'
        ? 'PDF có phiếu chấm'
        : 'Canvas/Moodle QTI Zip';

    onShowToast(
      'success',
      'Đã đóng gói đề thi thành công!',
      `Đã tạo ${examConfig.examCodeCount} mã đề (${count} câu/đề) định dạng ${formatName}. Tải xuống hoàn tất.`
    );
  };

  // Bloom counts for selected
  const selectedQuestions = approvedQuestions.filter((q) => selectedIds.includes(q.id));
  const nhanBietCount = selectedQuestions.filter((q) => q.bloomLevel === 'Nhận biết').length;
  const thongHieuCount = selectedQuestions.filter((q) => q.bloomLevel === 'Thông hiểu').length;
  const vanDungCount = selectedQuestions.filter((q) => q.bloomLevel === 'Vận dụng').length;

  return (
    <div className="flex-1 p-8 overflow-y-auto space-y-6 bg-[#0b0f19] text-slate-100 relative pb-28">
      {/* Background glow */}
      <div className="absolute top-20 right-10 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* 1. Header */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-white/[0.06]">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Exam Vault & Packaging
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight mt-1.5">
            Ngân hàng Đề thi & Xuất bản Chuẩn hóa
          </h1>
          <p className="text-xs md:text-sm text-slate-400 mt-1">
            Kho lưu trữ các câu hỏi trắc nghiệm đã được thẩm định. Chọn câu hỏi để đóng gói đề thi chuẩn.
          </p>
        </div>

        <div className="flex items-center space-x-3">
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
                <option className="bg-[#111827]">Tất cả giáo trình (12)</option>
                <option className="bg-[#111827]">Kinh tế vi mô 2025</option>
                <option className="bg-[#111827]">Nguyên lý kế toán</option>
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
                  <th className="py-3.5 px-3 w-20">Mức độ</th>
                  <th className="py-3.5 px-4">Nội dung câu hỏi trắc nghiệm</th>
                  <th className="py-3.5 px-4">Đáp án chuẩn</th>
                  <th className="py-3.5 px-4">Chương mục</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04] text-slate-300">
                {filtered.map((q) => {
                  const isChecked = selectedIds.includes(q.id);
                  const correctOpt = q.options.find((o) => o.id === q.correctAnswerId);

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
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
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
        <div className="fixed bottom-6 left-80 right-8 glass-panel text-white p-4 rounded-2xl shadow-2xl border border-white/15 flex flex-col md:flex-row items-center justify-between gap-4 z-40 animate-slideUp">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-white text-base shadow-glow-sm">
              {selectedIds.length}
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Câu hỏi đã chọn vào Giỏ đề thi
              </div>
              <div className="text-xs text-slate-400 flex items-center space-x-2 mt-0.5 font-mono">
                <span>Nhận biết: <strong className="text-sky-300">{nhanBietCount}</strong></span>
                <span>•</span>
                <span>Thông hiểu: <strong className="text-teal-300">{thongHieuCount}</strong></span>
                <span>•</span>
                <span>Vận dụng: <strong className="text-amber-300">{vanDungCount}</strong></span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2.5">
            <button
              onClick={() => handleOpenExportModal('docx')}
              className="flex items-center space-x-1.5 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md"
            >
              <FileText className="w-4 h-4" />
              <span>Xuất ra Word (.docx)</span>
            </button>

            <button
              onClick={() => handleOpenExportModal('pdf')}
              className="flex items-center space-x-1.5 px-4 py-2 bg-white/[0.08] hover:bg-white/[0.12] text-white rounded-xl text-xs font-semibold transition-all border border-white/[0.1]"
            >
              <Printer className="w-4 h-4" />
              <span>In PDF</span>
            </button>

            <button
              onClick={() => handleOpenExportModal('qti')}
              className="flex items-center space-x-1.5 px-4 py-2 bg-indigo-600/80 hover:bg-indigo-600 text-white rounded-xl text-xs font-semibold transition-all"
            >
              <Sparkles className="w-4 h-4" />
              <span>Gói Canvas QTI</span>
            </button>

            <button
              onClick={() => setSelectedIds([])}
              className="p-2 text-slate-400 hover:text-white rounded-lg transition-colors ml-2"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 4. MODAL: Customize Exam Output */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-xl rounded-2xl shadow-2xl border border-white/[0.1] overflow-hidden flex flex-col">
            <div className="p-5 border-b border-white/[0.06] flex items-center justify-between bg-white/[0.02]">
              <div className="flex items-center space-x-2">
                <Settings2 className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-white text-xs">
                  Tùy chỉnh Đóng gói Đề thi ({selectedIds.length} câu đã chọn)
                </h3>
              </div>
              <button
                onClick={() => setShowExportModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.08]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs text-slate-300">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1 text-slate-400">Tên trường Đại học:</label>
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
                <label className="font-semibold block mb-1 text-slate-400">Tiêu đề đề thi:</label>
                <input
                  type="text"
                  value={examConfig.examTitle}
                  onChange={(e) => setExamConfig({ ...examConfig, examTitle: e.target.value })}
                  className="w-full p-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1 text-slate-400">Môn học:</label>
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

              {/* Toggles */}
              <div className="space-y-2 pt-2 border-t border-white/[0.06]">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={examConfig.includeAnswerKey}
                    onChange={(e) => setExamConfig({ ...examConfig, includeAnswerKey: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded accent-blue-600"
                  />
                  <span>Tự động tạo bảng ma trận đáp án ở trang cuối</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={examConfig.shuffleOptions}
                    onChange={(e) => setExamConfig({ ...examConfig, shuffleOptions: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded accent-blue-600"
                  />
                  <span>Xáo trộn ngẫu nhiên thứ tự các phương án A, B, C, D</span>
                </label>
              </div>
            </div>

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
                  className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-glow-sm flex items-center space-x-1.5"
                >
                  <Download className="w-4 h-4" />
                  <span>Xác nhận & Tải tệp xuống</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
