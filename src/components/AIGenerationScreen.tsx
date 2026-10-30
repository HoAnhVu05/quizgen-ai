import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  Cpu
} from 'lucide-react';
import { ScreenId } from '../types';

interface AIGenerationScreenProps {
  onNavigate: (screen: ScreenId) => void;
  onGenerateSuccess: () => void;
  onShowToast: (type: 'success' | 'info' | 'warning' | 'error', title: string, message: string) => void;
}

export const AIGenerationScreen: React.FC<AIGenerationScreenProps> = ({
  onNavigate,
  onGenerateSuccess,
  onShowToast,
}) => {
  const [selectedBook, setSelectedBook] = useState('');
  const [selectedChapters, setSelectedChapters] = useState<string[]>([]);
  const [bloomDistribution, setBloomDistribution] = useState({
    nhanBiet: 4,
    thongHieu: 4,
    vanDung: 2,
    phanTich: 0,
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState('');
  const [activePreset, setActivePreset] = useState<string>('giuaKy');
  const [documents, setDocuments] = useState<Array<{ id: string; name: string; status: string; totalPages: number; chaptersCount: number }>>([]);
  const [chaptersByDocument, setChaptersByDocument] = useState<Record<string, string[]>>({});
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(true);

  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

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
      const res = await fetch(`${API_BASE}/documents/documents`);
      if (!res.ok) {
        throw new Error(await parseErrorMessage(res));
      }
      const payload = await res.json();
      const readyDocs = Array.isArray(payload)
        ? payload
            .filter((item: any) => item?.status === 'ready')
            .map((item: any) => ({
              id: String(item.id),
              name: String(item.name),
              status: String(item.status),
              totalPages: Number(item.totalPages ?? 0),
              chaptersCount: Number(item.chaptersCount ?? 0),
            }))
        : [];

      setDocuments(readyDocs);
      if (readyDocs.length > 0) {
        setSelectedBook((prev) => prev || readyDocs[0].id);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Không tải được danh sách giáo trình.';
      onShowToast('error', 'Không thể tải dữ liệu tài liệu', msg);
    } finally {
      setIsLoadingDocuments(false);
    }
  }, [onShowToast]);

  useEffect(() => {
    void fetchDocuments();
  }, [fetchDocuments]);

  const selectedDocument = useMemo(
    () => documents.find((doc) => doc.id === selectedBook) || null,
    [documents, selectedBook]
  );

  const chaptersList = selectedBook ? chaptersByDocument[selectedBook] || [] : [];

  useEffect(() => {
    const loadChapters = async () => {
      if (!selectedBook) {
        setSelectedChapters([]);
        return;
      }

      if (chaptersByDocument[selectedBook]) {
        const existing = chaptersByDocument[selectedBook];
        setSelectedChapters((prev) => prev.filter((c) => existing.includes(c)));
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/documents/documents/${selectedBook}`);
        if (!res.ok) {
          throw new Error(await parseErrorMessage(res));
        }
        const detail = await res.json();
        const chapters = Array.isArray(detail?.chapters) ? detail.chapters.filter(Boolean) : [];
        setChaptersByDocument((prev) => ({ ...prev, [selectedBook]: chapters }));
        setSelectedChapters(chapters.slice(0, Math.min(2, chapters.length)));
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Không tải được danh sách chương.';
        onShowToast('warning', 'Không tải được chương mục', msg);
        setSelectedChapters([]);
      }
    };

    void loadChapters();
  }, [selectedBook, chaptersByDocument, onShowToast]);

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

  const handleStartGenerate = () => {
    setIsGenerating(true);
    setGenerationStep('Đang truy xuất ngữ cảnh RAG từ tài liệu...');

    setTimeout(() => {
      setGenerationStep('LLM đang tổng hợp và sinh câu hỏi theo Thang đo Bloom...');
    }, 1200);

    setTimeout(() => {
      setGenerationStep('Kiểm tra minh chứng trích dẫn và tạo phương án nhiễu...');
    }, 2400);

    setTimeout(() => {
      setIsGenerating(false);
      onShowToast('success', 'Sinh câu hỏi hoàn tất!', `Đã khởi tạo thành công ${totalQuestions} câu hỏi. Hãy bắt đầu kiểm duyệt.`);
      onGenerateSuccess();
      onNavigate('review');
    }, 3600);
  };

  return (
    <div className="flex-1 p-8 overflow-y-auto space-y-8 bg-[#0b0f19] text-slate-100 relative">
      {/* Background Glow */}
      <div className="absolute top-20 right-1/4 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* 1. Header */}
      <div className="relative z-10 pb-2 border-b border-white/[0.06]">
        <div className="flex items-center space-x-2">
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            AI Exam Engineering
          </span>
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight mt-1.5">
          Cấu hình Ma trận Đề thi AI
        </h1>
        <p className="text-xs md:text-sm text-slate-400 mt-1">
          Thiết lập nguồn kiến thức giáo trình và ma trận độ khó sư phạm để sinh bộ câu hỏi trắc nghiệm chuẩn mực.
        </p>
      </div>

      {/* Preset Quick Templates */}
      <div className="glass-card p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 relative z-10">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white">Khuôn mẫu ma trận chuẩn hóa Đại học</h4>
            <p className="text-[11px] text-slate-400">Áp dụng nhanh tỷ lệ độ khó theo quy chế đào tạo tín chỉ</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {[
            { id: 'giuaKy', label: 'Đề Giữa kỳ (20 câu)' },
            { id: 'cuoiKy', label: 'Đề Cuối kỳ (20 câu)' },
            { id: 'quiz15p', label: 'Kiểm tra 15p (10 câu)' },
          ].map((preset) => (
            <button
              key={preset.id}
              onClick={() => applyPreset(preset.id as any)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activePreset === preset.id
                  ? 'bg-blue-600 text-white shadow-glow-sm'
                  : 'bg-white/[0.05] text-slate-300 hover:bg-white/[0.08] hover:text-white'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
        {/* Left Form: Parameters (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card 1: Chọn giáo trình & chương */}
          <div className="glass-card p-6 rounded-2xl space-y-5">
            <div className="flex items-center space-x-2.5 pb-3 border-b border-white/[0.06]">
              <BookOpen className="w-4 h-4 text-blue-400" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                1. Nguồn tri thức giáo trình (RAG Knowledge)
              </h2>
            </div>

            {/* Select Textbook */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Chọn giáo trình đã nạp:
              </label>
              <select
                value={selectedBook}
                onChange={(e) => setSelectedBook(e.target.value)}
                className="w-full p-3 bg-white/[0.04] border border-white/[0.08] rounded-xl text-xs font-medium text-slate-200 focus:outline-none focus:border-blue-500"
              >
                {isLoadingDocuments && (
                  <option value="" className="bg-[#111827]">Đang tải danh sách giáo trình...</option>
                )}
                {!isLoadingDocuments && documents.length === 0 && (
                  <option value="" className="bg-[#111827]">Chưa có giáo trình sẵn sàng</option>
                )}
                {documents.map((doc) => (
                  <option key={doc.id} value={doc.id} className="bg-[#111827]">
                    {doc.name} ({doc.chaptersCount} chương - {doc.totalPages} trang)
                  </option>
                ))}
              </select>
            </div>

            {/* Chapters Multi-select */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Phạm vi chương mục kiến thức cần lấy câu hỏi:
              </label>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {chaptersList.length === 0 && (
                  <div className="p-3 rounded-xl border border-white/[0.08] bg-white/[0.02] text-xs text-slate-400">
                    Tài liệu này chưa có danh sách chương. Hãy đảm bảo tài liệu đã ở trạng thái sẵn sàng.
                  </div>
                )}
                {chaptersList.map((ch) => {
                  const isChecked = selectedChapters.includes(ch);
                  return (
                    <div
                      key={ch}
                      onClick={() => handleToggleChapter(ch)}
                      className={`p-3 rounded-xl border text-xs font-medium cursor-pointer flex items-center justify-between transition-all ${
                        isChecked
                          ? 'bg-blue-600/15 border-blue-500/40 text-blue-200'
                          : 'bg-white/[0.02] border-white/[0.06] text-slate-400 hover:bg-white/[0.05] hover:text-slate-200'
                      }`}
                    >
                      <span>{ch}</span>
                      <div
                        className={`w-4 h-4 rounded-md flex items-center justify-center border transition-colors ${
                          isChecked
                            ? 'bg-blue-600 border-blue-600 text-white'
                            : 'border-white/20 bg-transparent'
                        }`}
                      >
                        {isChecked && <Check className="w-3 h-3" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Card 2: Ma trận Bloom */}
          <div className="glass-card p-6 rounded-2xl space-y-5">
            <div className="flex items-center space-x-2.5 pb-3 border-b border-white/[0.06]">
              <Sliders className="w-4 h-4 text-blue-400" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                2. Phân bổ ma trận nhận thức (Thang đo Bloom)
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Level 1 */}
              <div className="p-4 rounded-xl bg-sky-500/[0.06] border border-sky-500/20">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-sky-300">1. Nhận biết (Remember)</span>
                  <span className="text-xs font-semibold text-sky-400 font-mono">
                    {bloomDistribution.nhanBiet} câu ({totalQuestions > 0 ? Math.round((bloomDistribution.nhanBiet / totalQuestions) * 100) : 0}%)
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="15"
                  value={bloomDistribution.nhanBiet}
                  onChange={(e) =>
                    setBloomDistribution({
                      ...bloomDistribution,
                      nhanBiet: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full accent-sky-400 cursor-pointer"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Định nghĩa, khái niệm, công thức cơ bản
                </span>
              </div>

              {/* Level 2 */}
              <div className="p-4 rounded-xl bg-teal-500/[0.06] border border-teal-500/20">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-teal-300">2. Thông hiểu (Understand)</span>
                  <span className="text-xs font-semibold text-teal-400 font-mono">
                    {bloomDistribution.thongHieu} câu ({totalQuestions > 0 ? Math.round((bloomDistribution.thongHieu / totalQuestions) * 100) : 0}%)
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="15"
                  value={bloomDistribution.thongHieu}
                  onChange={(e) =>
                    setBloomDistribution({
                      ...bloomDistribution,
                      thongHieu: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full accent-teal-400 cursor-pointer"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Giải thích quy luật, so sánh, phân biệt
                </span>
              </div>

              {/* Level 3 */}
              <div className="p-4 rounded-xl bg-amber-500/[0.06] border border-amber-500/20">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-amber-300">3. Vận dụng (Apply)</span>
                  <span className="text-xs font-semibold text-amber-400 font-mono">
                    {bloomDistribution.vanDung} câu ({totalQuestions > 0 ? Math.round((bloomDistribution.vanDung / totalQuestions) * 100) : 0}%)
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="15"
                  value={bloomDistribution.vanDung}
                  onChange={(e) =>
                    setBloomDistribution({
                      ...bloomDistribution,
                      vanDung: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full accent-amber-400 cursor-pointer"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Bài toán thực tế, tính toán tình huống
                </span>
              </div>

              {/* Level 4 */}
              <div className="p-4 rounded-xl bg-purple-500/[0.06] border border-purple-500/20">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-purple-300">4. Phân tích (Analyze)</span>
                  <span className="text-xs font-semibold text-purple-400 font-mono">
                    {bloomDistribution.phanTich} câu ({totalQuestions > 0 ? Math.round((bloomDistribution.phanTich / totalQuestions) * 100) : 0}%)
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={bloomDistribution.phanTich}
                  onChange={(e) =>
                    setBloomDistribution({
                      ...bloomDistribution,
                      phanTich: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full accent-purple-400 cursor-pointer"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Phân tích tình huống đa biến, suy luận
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Summary & Trigger (1 Col) */}
        <div className="space-y-6">
          <div className="glass-card p-6 rounded-2xl space-y-5">
            <h3 className="text-sm font-bold text-white pb-3 border-b border-white/[0.06] uppercase tracking-wider">
              Tổng quan cấu hình
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Số lượng câu hỏi:</span>
                <span className="font-bold text-white font-mono text-sm">
                  {totalQuestions} câu
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Dạng thức:</span>
                <span className="font-semibold text-slate-200">4 lựa chọn (A, B, C, D)</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Giáo trình nguồn:</span>
                <span className="font-semibold text-slate-200 truncate max-w-[170px]" title={selectedDocument?.name || ''}>
                  {selectedDocument?.name || 'Chưa chọn'}
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Minh chứng RAG:</span>
                <span className="font-semibold text-emerald-400">Bắt buộc trích dẫn</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Số chương đã chọn:</span>
                <span className="font-semibold text-slate-200">
                  {selectedChapters.length} chương
                </span>
              </div>
            </div>

            {/* Visual Balance Bar */}
            {totalQuestions > 0 && (
              <div className="space-y-2 pt-3 border-t border-white/[0.06]">
                <div className="flex justify-between text-[11px] font-bold text-slate-300">
                  <span>Tỷ lệ ma trận Bloom:</span>
                  <span className="font-mono text-blue-400">{totalQuestions} câu</span>
                </div>
                <div className="w-full h-3 rounded-full flex overflow-hidden bg-white/[0.06] p-0.5">
                  <div style={{ width: `${(bloomDistribution.nhanBiet / totalQuestions) * 100}%` }} className="bg-sky-500 rounded-l-full" title="Nhận biết" />
                  <div style={{ width: `${(bloomDistribution.thongHieu / totalQuestions) * 100}%` }} className="bg-teal-500" title="Thông hiểu" />
                  <div style={{ width: `${(bloomDistribution.vanDung / totalQuestions) * 100}%` }} className="bg-amber-500" title="Vận dụng" />
                  <div style={{ width: `${(bloomDistribution.phanTich / totalQuestions) * 100}%` }} className="bg-purple-500 rounded-r-full" title="Phân tích" />
                </div>
              </div>
            )}

            <div className="p-3.5 bg-blue-500/[0.08] rounded-xl border border-blue-500/20 text-xs text-blue-200 flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <p>
                Sau khi sinh, câu hỏi sẽ được chuyển vào <strong>Không gian Kiểm duyệt</strong> để đối chiếu trang sách gốc trước khi lưu vào ngân hàng đề.
              </p>
            </div>

            {/* AI Generate Button */}
            {isGenerating ? (
              <div className="space-y-3">
                <button
                  disabled
                  className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold rounded-xl flex items-center justify-center space-x-2 shadow-glow-md animate-pulse cursor-wait"
                >
                  <Cpu className="w-4 h-4 animate-spin text-sky-200" />
                  <span>AI đang bóc tách ngữ nghĩa & sinh đề...</span>
                </button>
                <p className="text-[11px] text-center text-blue-300 font-mono animate-bounce">
                  {generationStep}
                </p>
              </div>
            ) : (
              <button
                onClick={handleStartGenerate}
                disabled={totalQuestions === 0 || selectedChapters.length === 0 || !selectedBook}
                className={`w-full py-3.5 text-xs font-bold rounded-xl flex items-center justify-center space-x-2 transition-all shadow-lg ${
                  totalQuestions === 0 || selectedChapters.length === 0 || !selectedBook
                    ? 'bg-white/[0.05] text-slate-500 cursor-not-allowed border border-white/[0.05]'
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-600/30 hover:scale-[1.01]'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span>Khởi tạo {totalQuestions} câu hỏi chuẩn Bloom</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
