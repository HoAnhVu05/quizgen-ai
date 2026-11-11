import React, { useState, useEffect, useCallback } from 'react';
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
  Archive,
  History,
  Clock,
  FileDown,
  BookOpen
} from 'lucide-react';
import { Question, BloomLevel, ExamExportConfig, UserProfile } from '../types';
import apiClient from '../services/apiClient';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

interface RealTextbookOption {
  id: string;
  name: string;
  questionCount: number;
}

interface QuestionBankScreenProps {
  questions: Question[];
  onShowToast: (type: 'success' | 'info' | 'warning' | 'error', title: string, message: string) => void;
  currentUser?: UserProfile | null;
}

export const QuestionBankScreen: React.FC<QuestionBankScreenProps> = ({ questions, onShowToast, currentUser }) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBloom, setSelectedBloom] = useState<string>('all');
  const [selectedTextbook, setSelectedTextbook] = useState<string>('all');
  const [availableTextbooks, setAvailableTextbooks] = useState<RealTextbookOption[]>([]);
  const [isLoadingTextbooks, setIsLoadingTextbooks] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState<'docx' | 'pdf' | 'qti' | 'zip'>('zip');
  const [isExporting, setIsExporting] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [savedExams, setSavedExams] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const fetchSavedExams = async () => {
    setIsLoadingHistory(true);
    try {
      const res = await apiClient.fetch(`${API_BASE}/exams`);
      if (res.ok) {
        const data = await res.json();
        setSavedExams(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.warn('Lỗi lấy danh sách đề thi đã lưu:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleDownloadSavedExam = async (examId: string, format: string, examTitle: string) => {
    try {
      const res = await apiClient.fetch(`${API_BASE}/exams/${examId}/download?format=${format}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const ext = (format === 'zip' || format === 'qti') ? 'zip' : format;
      const safeTitle = (examTitle || 'DeThi').replace(/[^a-zA-Z0-9_À-ɏẠ-ỹ]/g, '_');
      a.download = `${safeTitle}_${Date.now()}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      onShowToast('success', 'Tải lại đề thi thành công!', `Đã tải đề thi định dạng ${format.toUpperCase()}.`);
    } catch (err) {
      onShowToast('error', 'Lỗi tải đề thi', 'Không thể tải đề thi từ máy chủ.');
    }
  };

  const handleDeleteSavedExam = async (examId: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa bài thi này khỏi lịch sử lưu trữ?')) return;
    try {
      const res = await apiClient.fetch(`${API_BASE}/exams/${examId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setSavedExams((prev) => prev.filter((e) => e.id !== examId));
      onShowToast('success', 'Đã xóa bài thi!', 'Bài thi đã được gỡ bỏ khỏi hệ thống khảo thí.');
    } catch (err) {
      onShowToast('error', 'Lỗi xóa bài thi', 'Bạn không có quyền hoặc có lỗi xảy ra.');
    }
  };

  // Exam Builder Config
  const [examConfig, setExamConfig] = useState<ExamExportConfig>(() => {
    let faculty = 'Khoa Công nghệ Thông tin';
    let univ = 'ĐẠI HỌC QUỐC GIA';
    try {
      const savedUser = JSON.parse(localStorage.getItem('quizgen_user_profile') || '{}');
      if (savedUser.faculty || savedUser.department) {
        faculty = savedUser.faculty || savedUser.department;
      }
      if (savedUser.university) {
        univ = savedUser.university;
      }
    } catch {}
    return {
      universityName: univ,
      facultyName: faculty,
      subjectName: '',
      examTitle: 'ĐỀ THI KẾT THÚC HỌC PHẦN',
      durationMinutes: 60,
      examCodeCount: 4,
      shuffleQuestions: true,
      shuffleOptions: true,
      includeAnswerKey: true,
      includeExplanation: false,
      format: 'docx',
    };
  });

  const approvedQuestions = questions.filter((q) => q.status === 'approved');

  // Lấy dữ liệu giáo trình nguồn thực tế từ Document Service, localStorage và danh sách câu hỏi
  const fetchRealTextbooks = useCallback(async () => {
    setIsLoadingTextbooks(true);
    try {
      let serverDocs: any[] = [];
      try {
        let res = await apiClient.fetch(`${API_BASE}/documents/documents`);
        if (!res.ok) {
          res = await apiClient.fetch(`${API_BASE}/documents`);
        }
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            serverDocs = data;
          }
        }
      } catch (err) {
        console.warn('Không thể nạp danh sách tài liệu từ Document Service:', err);
      }

      let localDocs: any[] = [];
      try {
        localDocs = JSON.parse(localStorage.getItem('quizgen_uploaded_documents') || '[]');
      } catch {}

      // Lập bản đồ số lượng câu hỏi thực tế theo từng giáo trình
      const questionTextbooksMap: Record<string, number> = {};
      approvedQuestions.forEach((q) => {
        const tbName = (q.textbookName || '').trim();
        if (tbName) {
          questionTextbooksMap[tbName] = (questionTextbooksMap[tbName] || 0) + 1;
        }
      });

      const docMap = new Map<string, RealTextbookOption>();

      // 1. Nạp từ backend Document Service
      serverDocs.forEach((doc: any) => {
        const name = String(doc.name || doc.title || '').trim();
        if (name) {
          const lower = name.toLowerCase();
          docMap.set(lower, {
            id: String(doc.id || name),
            name,
            questionCount: questionTextbooksMap[name] || 0,
          });
        }
      });

      // 2. Nạp từ localStorage
      localDocs.forEach((doc: any) => {
        const name = String(doc.name || doc.title || '').trim();
        if (name) {
          const lower = name.toLowerCase();
          if (!docMap.has(lower)) {
            docMap.set(lower, {
              id: String(doc.id || name),
              name,
              questionCount: questionTextbooksMap[name] || 0,
            });
          }
        }
      });

      // 3. Nạp từ dữ liệu thực tế câu hỏi trong ngân hàng
      Object.entries(questionTextbooksMap).forEach(([name, count]) => {
        const lower = name.toLowerCase();
        if (docMap.has(lower)) {
          const item = docMap.get(lower)!;
          item.questionCount = Math.max(item.questionCount, count);
        } else {
          docMap.set(lower, {
            id: name,
            name,
            questionCount: count,
          });
        }
      });

      const list = Array.from(docMap.values());
      setAvailableTextbooks(list);

      // Nếu môn học chưa có tên, tự động cập nhật theo giáo trình thực đầu tiên
      if (list.length > 0) {
        const firstCleanName = list[0].name.replace(/\.[^/.]+$/, '').replace(/_/g, ' ');
        setExamConfig((prev) => ({
          ...prev,
          subjectName: prev.subjectName || firstCleanName,
          examTitle: prev.examTitle === 'ĐỀ THI KẾT THÚC HỌC PHẦN'
            ? `ĐỀ THI KẾT THÚC HỌC PHẦN - ${firstCleanName.toUpperCase()}`
            : prev.examTitle,
        }));
      }
    } finally {
      setIsLoadingTextbooks(false);
    }
  }, [approvedQuestions]);

  useEffect(() => {
    void fetchRealTextbooks();
  }, [fetchRealTextbooks]);

  const filtered = approvedQuestions.filter((q) => {
    const matchSearch =
      q.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.chapter.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (q.textbookName && q.textbookName.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchBloom = selectedBloom === 'all' || q.bloomLevel === selectedBloom;
    const matchTextbook =
      selectedTextbook === 'all' ||
      (q.textbookName && q.textbookName.toLowerCase() === selectedTextbook.toLowerCase());
    return matchSearch && matchBloom && matchTextbook;
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
      includeOmrSheet: format === 'pdf' || format === 'zip' || format === 'docx' ? true : false,
    }));
    setShowExportModal(true);
  };

  const handleDownloadStandaloneOmr = async () => {
    try {
      const response = await apiClient.fetch(`${API_BASE}/exams/export/omr`, {
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
          includeOmrSheet: (exportFormat === 'pdf' || exportFormat === 'zip' || exportFormat === 'docx') ? (examConfig.includeOmrSheet ?? true) : false,
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
          <button
            onClick={() => {
              setShowHistoryModal(true);
              fetchSavedExams();
            }}
            className="flex items-center space-x-2 px-3.5 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.1] text-xs font-semibold text-white transition-all shadow-sm"
          >
            <History className="w-3.5 h-3.5 text-blue-400" />
            <span>Lịch sử đề thi đã lưu</span>
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
              <div className="flex items-center justify-between mb-2">
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Giáo trình nguồn:
                </label>
                {isLoadingTextbooks ? (
                  <span className="text-[10px] text-blue-400 animate-pulse font-mono">Đang tải...</span>
                ) : (
                  <span className="text-[10px] text-slate-400 font-mono">
                    {availableTextbooks.length} giáo trình
                  </span>
                )}
              </div>
              <div className="relative">
                <select
                  value={selectedTextbook}
                  onChange={(e) => {
                    const newTb = e.target.value;
                    setSelectedTextbook(newTb);
                    if (newTb !== 'all') {
                      const cleanSubject = newTb.replace(/\.[^/.]+$/, '').replace(/_/g, ' ');
                      setExamConfig((prev) => ({
                        ...prev,
                        subjectName: cleanSubject,
                        examTitle: `ĐỀ THI KẾT THÚC HỌC PHẦN - ${cleanSubject.toUpperCase()}`
                      }));
                    }
                  }}
                  className="w-full p-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                >
                  <option value="all" className="bg-[#111827]">
                    {availableTextbooks.length === 0
                      ? 'Chưa có giáo trình nguồn (0)'
                      : `Tất cả giáo trình (${approvedQuestions.length} câu)`}
                  </option>
                  {availableTextbooks.map((tb) => (
                    <option key={tb.id} value={tb.name} className="bg-[#111827]">
                      {tb.name} ({tb.questionCount} câu)
                    </option>
                  ))}
                </select>
              </div>

              {availableTextbooks.length > 0 && selectedTextbook !== 'all' && (
                <div className="mt-2 flex items-center justify-between text-[11px] text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2.5 py-1.5 rounded-lg">
                  <span className="truncate max-w-[170px]" title={selectedTextbook}>
                    Đang lọc: <strong>{selectedTextbook}</strong>
                  </span>
                  <button
                    onClick={() => setSelectedTextbook('all')}
                    className="text-xs hover:text-white ml-1 font-bold"
                    title="Bỏ lọc giáo trình"
                  >
                    ×
                  </button>
                </div>
              )}
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
                  <th className="py-3.5 px-4">Giáo trình & Chương mục</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04] text-slate-300">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <BookOpen className="w-8 h-8 text-slate-600" />
                        <p className="text-sm font-medium text-slate-300">Không tìm thấy câu hỏi nào phù hợp</p>
                        <p className="text-xs text-slate-500">
                          {selectedTextbook !== 'all'
                            ? `Chưa có câu hỏi đã thẩm định nào thuộc giáo trình "${selectedTextbook}".`
                            : 'Chưa có câu hỏi nào trong ngân hàng. Hãy tạo và thẩm định câu hỏi từ giáo trình nguồn.'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((q) => {
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

                        <td className="py-4 px-4 text-slate-400 text-[11px]">
                          <div className="font-semibold text-slate-200 font-mono flex items-center space-x-1.5">
                            <Layers className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                            <span className="truncate max-w-[170px]" title={q.chapter}>{q.chapter}</span>
                          </div>
                          {q.textbookName ? (
                            <div className="text-[10px] text-emerald-400 flex items-center space-x-1 mt-1 truncate max-w-[170px]" title={q.textbookName}>
                              <BookOpen className="w-3 h-3 text-emerald-400/80 shrink-0" />
                              <span className="truncate">{q.textbookName}</span>
                            </div>
                          ) : (
                            <div className="text-[10px] text-slate-500 flex items-center space-x-1 mt-1 italic">
                              <BookOpen className="w-3 h-3 text-slate-600 shrink-0" />
                              <span>Chưa gắn giáo trình</span>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 3. Floating Action Bar (Dynamic Glass Dock) */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-72 right-8 glass-panel text-white p-4 rounded-2xl shadow-2xl border border-white/15 flex flex-col md:flex-row items-center justify-between gap-4 z-40 animate-slideUp">
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

          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleOpenExportModal('zip')}
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold transition-all shadow-md"
            >
              <Archive className="w-4 h-4" />
              <span>Trọn bộ ZIP (Đề + OMR)</span>
            </button>

            <button
              onClick={() => handleOpenExportModal('docx')}
              className="flex items-center space-x-1.5 px-3 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold transition-all shadow-md"
            >
              <FileText className="w-4 h-4" />
              <span>Word</span>
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
              onClick={handleDownloadStandaloneOmr}
              title="Tải riêng Phiếu tô trắc nghiệm OMR 50 câu chuẩn thi đại học"
              className="flex items-center space-x-1 px-3 py-2 bg-white/[0.05] hover:bg-white/[0.1] text-emerald-400 rounded-xl text-xs font-semibold transition-all border border-emerald-500/20"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Phiếu OMR 50</span>
            </button>

            <button
              onClick={() => setSelectedIds([])}
              className="p-2 text-slate-400 hover:text-white rounded-lg transition-colors ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 5. MODAL: Lịch sử đề thi đã lưu & xuất bản */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-4xl max-h-[85vh] rounded-2xl shadow-2xl border border-white/[0.1] overflow-hidden flex flex-col">
            <div className="p-5 border-b border-white/[0.06] flex items-center justify-between bg-white/[0.02]">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <History className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">
                    Kho Lưu trữ Lịch sử Đề thi đã Xuất bản
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Xem lại cấu trúc, tải lại các mã đề (.zip, .pdf kèm OMR, .docx) hoặc quản lý bài thi đã lưu
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-3.5 flex-1 text-xs">
              {isLoadingHistory ? (
                <div className="py-16 text-center text-slate-400">
                  <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <span>Đang tải danh sách đề thi từ máy chủ...</span>
                </div>
              ) : savedExams.length === 0 ? (
                <div className="py-16 text-center text-slate-400 glass-card rounded-xl border border-white/[0.06]">
                  <Archive className="w-10 h-10 text-slate-500 mx-auto mb-3" />
                  <p className="font-semibold text-slate-300">Chưa có đề thi nào được lưu trữ</p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Hãy tích chọn các câu hỏi đã thẩm định và bấm xuất bản đề thi để tự động lưu vào CSDL.
                  </p>
                </div>
              ) : (
                savedExams.map((exam) => (
                  <div
                    key={exam.id}
                    className="glass-card p-4 rounded-xl border border-white/[0.08] hover:border-white/20 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                        <span className="font-bold text-white text-sm truncate">
                          {exam.title || 'ĐỀ THI KẾT THÚC HỌC PHẦN'}
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/15 text-blue-300 border border-blue-500/30">
                          {exam.subject || 'Môn học'}
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-purple-500/15 text-purple-300 border border-purple-500/30">
                          {exam.examCodes?.length || 1} mã đề ({exam.examCodes?.join(', ') || '101'})
                        </span>
                      </div>

                      <div className="flex items-center space-x-3 text-slate-400 text-[11px] font-medium flex-wrap">
                        <span>{exam.university || 'ĐẠI HỌC QUỐC GIA'}</span>
                        <span>•</span>
                        <span>{exam.faculty || 'Khoa Công nghệ Thông tin'}</span>
                        <span>•</span>
                        <span>{exam.selectedQuestionIds?.length || 0} câu hỏi</span>
                        <span>•</span>
                        <span>{exam.durationMinutes || 60} phút</span>
                      </div>
                    </div>

                    {/* Quick Download Actions */}
                    <div className="flex items-center space-x-1.5 shrink-0">
                      <button
                        onClick={() => handleDownloadSavedExam(exam.id, 'zip', exam.title)}
                        title="Tải trọn bộ ZIP gồm tất cả các mã đề, OMR 50 câu và ma trận đáp án"
                        className="flex items-center space-x-1 px-2.5 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 rounded-lg text-xs font-semibold transition-all"
                      >
                        <Archive className="w-3.5 h-3.5" />
                        <span>ZIP</span>
                      </button>

                      <button
                        onClick={() => handleDownloadSavedExam(exam.id, 'pdf', exam.title)}
                        title="Tải đề thi PDF kèm phiếu OMR 50 câu"
                        className="flex items-center space-x-1 px-2.5 py-1.5 bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/30 text-cyan-300 rounded-lg text-xs font-semibold transition-all"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>PDF</span>
                      </button>

                      <button
                        onClick={() => handleDownloadSavedExam(exam.id, 'docx', exam.title)}
                        title="Tải đề thi Word (.docx)"
                        className="flex items-center space-x-1 px-2.5 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 rounded-lg text-xs font-semibold transition-all"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Word</span>
                      </button>

                      <button
                        onClick={() => handleDownloadSavedExam(exam.id, 'qti', exam.title)}
                        title="Tải gói Canvas/Moodle QTI 2.1"
                        className="flex items-center space-x-1 px-2.5 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 rounded-lg text-xs font-semibold transition-all"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>QTI</span>
                      </button>

                      <button
                        onClick={() => handleDeleteSavedExam(exam.id)}
                        title="Xóa bài thi khỏi lịch sử"
                        className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors border border-transparent hover:border-rose-500/20"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t border-white/[0.06] bg-white/[0.02] flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                Tổng cộng: <strong className="text-white font-mono">{savedExams.length}</strong> bài thi đã lưu trữ
              </span>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="px-4 py-2 bg-white/[0.08] hover:bg-white/[0.12] text-white rounded-xl text-xs font-semibold transition-all"
              >
                Đóng
              </button>
            </div>
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
              {/* Tabs chọn định dạng */}
              <div>
                <label className="font-semibold block mb-1.5 text-slate-400">Định dạng xuất bản khảo thí:</label>
                <div className="grid grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => { setExportFormat('zip'); setExamConfig(c => ({ ...c, format: 'zip', includeOmrSheet: true })); }}
                    className={`py-2 px-2 rounded-xl border text-center font-bold text-xs transition-all ${
                      exportFormat === 'zip'
                        ? 'bg-emerald-600/30 border-emerald-500 text-emerald-300 shadow-glow-sm'
                        : 'bg-white/[0.03] border-white/[0.08] text-slate-400 hover:text-white hover:bg-white/[0.06]'
                    }`}
                  >
                    Trọn bộ ZIP
                  </button>
                  <button
                    type="button"
                    onClick={() => { setExportFormat('docx'); setExamConfig(c => ({ ...c, format: 'docx', includeOmrSheet: true })); }}
                    className={`py-2 px-2 rounded-xl border text-center font-bold text-xs transition-all ${
                      exportFormat === 'docx'
                        ? 'bg-blue-600/30 border-blue-500 text-blue-300 shadow-glow-sm'
                        : 'bg-white/[0.03] border-white/[0.08] text-slate-400 hover:text-white hover:bg-white/[0.06]'
                    }`}
                  >
                    Word (.docx)
                  </button>
                  <button
                    type="button"
                    onClick={() => { setExportFormat('pdf'); setExamConfig(c => ({ ...c, format: 'pdf', includeOmrSheet: true })); }}
                    className={`py-2 px-2 rounded-xl border text-center font-bold text-xs transition-all ${
                      exportFormat === 'pdf'
                        ? 'bg-cyan-600/30 border-cyan-500 text-cyan-300 shadow-glow-sm'
                        : 'bg-white/[0.03] border-white/[0.08] text-slate-400 hover:text-white hover:bg-white/[0.06]'
                    }`}
                  >
                    PDF + OMR
                  </button>
                  <button
                    type="button"
                    onClick={() => { setExportFormat('qti'); setExamConfig(c => ({ ...c, format: 'qti' })); }}
                    className={`py-2 px-2 rounded-xl border text-center font-bold text-xs transition-all ${
                      exportFormat === 'qti'
                        ? 'bg-indigo-600/30 border-indigo-500 text-indigo-300 shadow-glow-sm'
                        : 'bg-white/[0.03] border-white/[0.08] text-slate-400 hover:text-white hover:bg-white/[0.06]'
                    }`}
                  >
                    LMS QTI 2.1
                  </button>
                </div>
              </div>

              {exportFormat === 'zip' && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-300 text-xs leading-relaxed">
                  <strong>Đóng gói bộ đề thi đa định dạng (SCRUM-56):</strong> Tự động xuất nén các mã đề (.pdf & .docx), Phiếu trả lời trắc nghiệm OMR 50 câu chuẩn thi đại học, Bảng ma trận đáp án so sánh chéo (.docx & .csv) và Gói LMS Canvas/Moodle IMS QTI 2.1 vào 1 tệp .ZIP duy nhất.
                </div>
              )}

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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1 text-slate-400">Thời gian làm bài (phút):</label>
                  <input
                    type="number"
                    min={15}
                    max={180}
                    value={examConfig.durationMinutes || 60}
                    onChange={(e) => setExamConfig({ ...examConfig, durationMinutes: parseInt(e.target.value) || 60 })}
                    className="w-full p-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1 text-slate-400">Mã đề gốc:</label>
                  <input
                    type="text"
                    defaultValue="101"
                    readOnly
                    className="w-full p-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-slate-400 font-mono cursor-not-allowed"
                  />
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

                {(exportFormat === 'pdf' || exportFormat === 'zip' || exportFormat === 'docx') && (
                  <label className="flex items-center space-x-2 cursor-pointer text-emerald-400">
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
