import React, { useState, useMemo, useRef } from 'react';
import { InlineMath, BlockMath } from 'react-katex';
import {
  LifeBuoy,
  PhoneCall,
  Mail,
  Send,
  CheckCircle2,
  FileQuestion,
  Layers,
  ArrowRight,
  BookOpen,
  Sparkles,
  ExternalLink,
  Sliders,
  Copy,
  Check,
  Compass,
  Paperclip,
  Image as ImageIcon,
  X,
  Wand2,
  CheckCheck,
  Printer,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { ScreenId } from '../types';

export interface RawQuestionPayload {
  id?: string;
  question: string;
  options: (string | { id?: string; label?: string; text?: string })[];
  correctAnswerId?: string;
  correctAnswer?: string;
  explanation?: string;
  bloomLevel?: string;
  chapter?: string;
  textbookName?: string;
}

export interface ImportExamActionData {
  title?: string;
  targetScreen?: ScreenId;
  autoExecute?: boolean;
  questions: RawQuestionPayload[];
}

export interface PatchQuestionActionData {
  questionId: string;
  diffSummary?: string;
  patch: {
    question?: string;
    options?: { id: string; label?: string; text: string }[];
    correctAnswerId?: string;
    explanation?: string;
    bloomLevel?: string;
  };
}

export interface SupportTicketActionData {
  title: string;
  category?: 'payment' | 'system_bug' | 'academic' | 'other';
  description: string;
  phone?: string;
  files?: File[];
}

export interface ExamBlueprintActionData {
  documentName?: string;
  documentId?: string;
  chapter?: string;
  questionCount: number;
  bloomRatio?: {
    know?: number;
    understand?: number;
    apply?: number;
    analyze?: number;
  };
}

export interface NavigateActionData {
  targetScreen: ScreenId;
  label?: string;
}

export interface QuantaAction {
  type: 'support_ticket' | 'exam_blueprint' | 'navigate' | 'patch_question' | 'import_exam';
  data: any;
}

interface QuantaMarkdownRendererProps {
  content: string;
  actions?: QuantaAction[];
  onNavigate?: (screen: ScreenId) => void;
  onSubmitTicket?: (ticketData: SupportTicketActionData) => Promise<boolean> | void;
  onAutoGenerateExam?: (blueprint: ExamBlueprintActionData) => void;
  onPatchQuestion?: (patchData: PatchQuestionActionData) => Promise<boolean> | void;
  onImportExam?: (data: ImportExamActionData, targetScreen?: ScreenId) => Promise<boolean> | void;
}

/**
 * Phân tách các phần tử inline: KaTeX ($...$), Bold (**...**), Italic (*...*), Code (`...`), Link ([...](...))
 */
const renderInlineContent = (text: string): React.ReactNode[] => {
  if (!text) return [];

  // Regex nhận diện KaTeX inline ($...$), Inline Code (`...`), Bold (**...**), Italic (*...*), Link ([...](...))
  const regex = /(\$(?:\\\$|[^\$\n])+\$|`[^`\n]+`|\*\*[^*]+?\*\*|\*[^*]+?\*|\[[^\]]+\]\([^)]+\))/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }

    const token = match[0];
    const key = `inline-${match.index}`;

    if (token.startsWith('$') && token.endsWith('$')) {
      const mathExp = token.slice(1, -1).trim();
      try {
        parts.push(
          <span key={key} className="inline-math-wrapper mx-0.5 text-teal-800 font-medium">
            <InlineMath math={mathExp} />
          </span>
        );
      } catch {
        parts.push(<span key={key} className="font-mono text-red-500">{token}</span>);
      }
    } else if (token.startsWith('`') && token.endsWith('`')) {
      const codeStr = token.slice(1, -1);
      parts.push(
        <code
          key={key}
          className="px-1.5 py-0.5 mx-0.5 bg-slate-100 text-slate-800 rounded text-[11px] font-mono border border-slate-200"
        >
          {codeStr}
        </code>
      );
    } else if (token.startsWith('**') && token.endsWith('**')) {
      const boldText = token.slice(2, -2);
      parts.push(
        <strong key={key} className="font-bold text-slate-900">
          {renderInlineContent(boldText)}
        </strong>
      );
    } else if (token.startsWith('*') && token.endsWith('*')) {
      const italicText = token.slice(1, -1);
      parts.push(
        <em key={key} className="italic text-slate-800">
          {renderInlineContent(italicText)}
        </em>
      );
    } else if (token.startsWith('[') && token.includes('](') && token.endsWith(')')) {
      const linkMatch = token.match(/\[([^\]]+)\]\(([^)]+)\)/);
      if (linkMatch) {
        parts.push(
          <a
            key={key}
            href={linkMatch[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-teal-700 hover:text-teal-800 underline font-medium inline-flex items-center gap-0.5"
          >
            {linkMatch[1]}
            <ExternalLink className="w-2.5 h-2.5" />
          </a>
        );
      } else {
        parts.push(token);
      }
    } else {
      parts.push(token);
    }

    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts;
};

// ── Interactive Support Ticket Card Component ───────────────────────────────
const SupportTicketCard: React.FC<{
  data: SupportTicketActionData;
  onSubmitTicket?: (data: SupportTicketActionData) => Promise<boolean> | void;
}> = ({ data, onSubmitTicket }) => {
  const [note, setNote] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<{ id: string; url: string; name: string; size: string }[]>([]);
  const [isSent, setIsSent] = useState(true);
  const [isExpandedNote, setIsExpandedNote] = useState(false);
  const [sentFileCount, setSentFileCount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleAddFiles = (newFiles: FileList | File[]) => {
    const validFiles: File[] = [];
    const newPreviews: { id: string; url: string; name: string; size: string }[] = [];

    Array.from(newFiles).forEach((f) => {
      if (f.type.startsWith('image/')) {
        if (f.size <= 10 * 1024 * 1024) {
          validFiles.push(f);
          newPreviews.push({
            id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            url: URL.createObjectURL(f),
            name: f.name,
            size: f.size > 1024 * 1024 ? `${(f.size / (1024 * 1024)).toFixed(1)} MB` : `${Math.round(f.size / 1024)} KB`,
          });
        }
      }
    });

    if (validFiles.length > 0) {
      setFiles((prev) => [...prev, ...validFiles]);
      setPreviews((prev) => [...prev, ...newPreviews]);
    }
  };

  const handleRemoveFile = (index: number) => {
    if (previews[index]?.url) {
      URL.revokeObjectURL(previews[index].url);
    }
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    if (e.clipboardData.files && e.clipboardData.files.length > 0) {
      e.preventDefault();
      handleAddFiles(e.clipboardData.files);
    }
  };

  const handleSend = async () => {
    setIsSubmitting(true);
    setSentFileCount(files.length);
    try {
      if (onSubmitTicket) {
        await onSubmitTicket({
          ...data,
          description: `${data.description}${note ? ` (Ghi chú: ${note})` : ''}`,
          files,
        });
      }
      setIsSent(true);
    } catch {
      setIsSent(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="my-3 p-3.5 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/90 rounded-2xl shadow-sm text-slate-800 space-y-2.5"
      onPaste={handlePaste}
    >
      <div className="flex items-center justify-between pb-2 border-b border-amber-200/60">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm">
            <LifeBuoy className="w-3.5 h-3.5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 tracking-tight">Phiếu Hỗ Trợ Kỹ Thuật & Đối Soát</h4>
            <span className="text-[10px] text-amber-800 font-medium">Quanta Butler lập phiếu ưu tiên</span>
          </div>
        </div>
        <span className="px-2 py-0.5 bg-amber-200/70 text-amber-900 rounded-full text-[9px] font-bold uppercase tracking-wider">
          {data.category === 'payment' ? 'Thanh toán' : 'Sự cố'}
        </span>
      </div>

      <div className="space-y-1.5 text-xs">
        <div className="bg-white/80 p-2.5 rounded-xl border border-amber-200/50 space-y-1">
          <p className="font-semibold text-slate-900 text-[11px]">{data.title}</p>
          <p className="text-[11px] text-slate-600 leading-relaxed">{data.description}</p>
        </div>

        {/* Trạng thái xác nhận đã gửi tự động tới Ban Quản Trị */}
        <div className="p-2.5 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 space-y-1.5 text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-bold text-[11px]">Đã tự động gửi phiếu tới Ban Quản Trị!</span>
            </div>
            <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 text-[9px] font-bold rounded">
              ĐÃ TIẾP NHẬN
            </span>
          </div>
          <p className="text-[10px] text-emerald-700 leading-relaxed">
            {sentFileCount > 0
              ? `Kèm ${sentFileCount} ảnh chụp sự cố đã được đồng bộ vào hệ thống Helpdesk.`
              : 'Hệ thống Helpdesk đã tạo ticket và phân công kỹ thuật viên ưu tiên xử lý phản hồi của Thầy/Cô (SLA 15 phút).'}
          </p>

          <div className="flex items-center justify-between pt-1 border-t border-emerald-200/60">
            <button
              type="button"
              onClick={() => setIsExpandedNote(!isExpandedNote)}
              className="text-emerald-800 hover:text-emerald-950 font-semibold text-[10px] flex items-center gap-1 cursor-pointer"
            >
              <Paperclip className="w-3 h-3 text-emerald-600" />
              <span>{isExpandedNote ? 'Thu gọn bổ sung' : 'Đính kèm thêm ảnh chụp sự cố / Ghi chú'}</span>
            </button>
            <a
              href="https://zalo.me/0364591363"
              target="_blank"
              rel="noopener noreferrer"
              className="px-2 py-0.5 bg-white hover:bg-slate-50 border border-emerald-200 text-emerald-900 rounded-md text-[10px] font-bold flex items-center gap-1 shadow-2xs"
            >
              <PhoneCall className="w-3 h-3 text-emerald-600" />
              <span>Zalo 0364591363</span>
            </a>
          </div>
        </div>

        {/* Phần đính kèm mở rộng nếu người dùng muốn gửi thêm ảnh hoặc note */}
        {isExpandedNote && (
          <div className="p-2.5 bg-white rounded-xl border border-amber-200 space-y-2 mt-2">
            <input
              type="text"
              placeholder="Bổ sung ghi chú thêm cho Admin..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500 text-slate-800"
            />

            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) handleAddFiles(e.target.files);
                  e.target.value = '';
                }}
              />

              {previews.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mb-2">
                  {previews.map((item, idx) => (
                    <div key={item.id} className="relative group rounded-lg overflow-hidden border border-amber-300 bg-amber-50/50 aspect-video flex items-center justify-center">
                      <img src={item.url} alt={item.name} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(idx)}
                        className="absolute top-1 right-1 w-4 h-4 bg-red-600/90 text-white rounded-full flex items-center justify-center opacity-80 hover:opacity-100 transition-opacity"
                        title="Xóa ảnh này"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                      <span className="absolute bottom-0 inset-x-0 bg-slate-900/70 text-white text-[8px] font-mono px-1 py-0.5 truncate text-center">
                        {item.size}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-1.5 px-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-dashed border-amber-300 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Paperclip className="w-3.5 h-3.5 text-amber-700" />
                <span>{previews.length > 0 ? `Đã chọn ${previews.length} ảnh (Bấm để thêm ảnh)` : 'Chọn ảnh chụp màn hình / biên lai (hoặc dán Ctrl+V)'}</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleSend}
              disabled={isSubmitting || (files.length === 0 && !note.trim())}
              className="w-full py-1.5 px-3 bg-amber-600 hover:bg-amber-700 active:scale-[0.99] text-white font-bold text-xs rounded-lg shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40"
            >
              {isSubmitting ? <span>Đang cập nhật...</span> : <span>Cập nhật bổ sung vào Phiếu</span>}
            </button>
          </div>
        )}
      </div>

      <div className="pt-1.5 border-t border-amber-200/50 flex items-center justify-between text-[10px] text-slate-500">
        <span className="flex items-center gap-1">
          <PhoneCall className="w-2.5 h-2.5 text-slate-400" />
          Zalo Hotline: <strong className="text-slate-700 font-mono">0364591363</strong>
        </span>
        <span className="flex items-center gap-1">
          <Mail className="w-2.5 h-2.5 text-slate-400" />
          <span className="font-mono">quizgen.ai.team@gmail.com</span>
        </span>
      </div>
    </div>
  );
};

// ── Interactive Exam Blueprint Card Component ───────────────────────────────
const ExamBlueprintCard: React.FC<{
  data: ExamBlueprintActionData;
  onNavigate?: (screen: ScreenId) => void;
  onAutoGenerateExam?: (blueprint: ExamBlueprintActionData) => void;
}> = ({ data, onNavigate, onAutoGenerateExam }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [isApplied, setIsApplied] = useState(false);

  const ratio = data.bloomRatio || { know: 30, understand: 40, apply: 20, analyze: 10 };

  const handleStartExamFlow = async () => {
    setIsProcessing(true);
    try {
      if (onAutoGenerateExam) {
        await onAutoGenerateExam(data);
      }
    } finally {
      setIsProcessing(false);
      setIsDone(true);
    }
  };

  const handleSelfCustomize = () => {
    setIsApplied(true);
    try {
      localStorage.setItem(
        'quizgen_pending_exam_blueprint',
        JSON.stringify({
          ...data,
          createdAt: Date.now(),
        })
      );
      // Phát sự kiện để màn hình Bước 2 lập tức cập nhật cấu hình ma trận theo thời gian thực
      window.dispatchEvent(new CustomEvent('quizgen_apply_blueprint', { detail: data }));
    } catch {}
    if (onNavigate) {
      onNavigate('generate');
    }
  };

  return (
    <div className="my-3 p-3.5 bg-gradient-to-br from-teal-50/80 via-emerald-50/40 to-cyan-50/70 border border-teal-200 rounded-2xl shadow-sm text-slate-800 space-y-2.5">
      <div className="flex items-center justify-between pb-2 border-b border-teal-200/60">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-[#008689] text-white flex items-center justify-center shrink-0 shadow-sm">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 tracking-tight">Kế Hoạch Sinh Đề Thi 4 Bước</h4>
            <span className="text-[10px] text-teal-700 font-medium">Quanta đề xuất ma trận tối ưu</span>
          </div>
        </div>
        <span className="px-2 py-0.5 bg-teal-100 text-teal-800 rounded-full text-[9px] font-bold">
          {data.questionCount || 20} câu
        </span>
      </div>

      <div className="space-y-2 text-xs">
        <div className="bg-white/80 p-2.5 rounded-xl border border-teal-200/50 space-y-1.5">
          <div className="flex items-center gap-1.5 text-slate-700">
            <BookOpen className="w-3 h-3 text-[#008689] shrink-0" />
            <span className="font-semibold truncate">
              {data.documentName || 'Giáo trình hiện tại'}
            </span>
          </div>
          {data.chapter && (
            <p className="text-[11px] text-slate-500 pl-4.5">
              Phạm vi: <strong className="text-slate-700">{data.chapter}</strong>
            </p>
          )}

          {/* Bloom Bars */}
          <div className="pt-1.5 space-y-1">
            <div className="flex justify-between text-[10px] font-semibold text-slate-600">
              <span>Phân bổ Bloom đề xuất:</span>
              <span>{data.questionCount} câu hỏi</span>
            </div>
            <div className="h-2 rounded-full bg-slate-200 flex overflow-hidden">
              <div style={{ width: `${ratio.know || 25}%` }} className="bg-sky-400" title={`Nhận biết: ${ratio.know || 25}%`} />
              <div style={{ width: `${ratio.understand || 25}%` }} className="bg-emerald-400" title={`Thông hiểu: ${ratio.understand || 25}%`} />
              <div style={{ width: `${ratio.apply || 25}%` }} className="bg-amber-400" title={`Vận dụng: ${ratio.apply || 25}%`} />
              <div style={{ width: `${ratio.analyze || 25}%` }} className="bg-rose-400" title={`Vận dụng cao: ${ratio.analyze || 25}%`} />
            </div>
            <div className="flex justify-between text-[9px] text-slate-500 pt-0.5">
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-sky-400" />NB: {ratio.know || 25}%</span>
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />TH: {ratio.understand || 25}%</span>
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-400" />VD: {ratio.apply || 25}%</span>
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-rose-400" />VDC: {ratio.analyze || 25}%</span>
            </div>
          </div>
        </div>

        {!isDone ? (
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleStartExamFlow}
              disabled={isProcessing}
              className="flex-1 py-1.5 px-3 bg-[#008689] hover:bg-[#007073] active:scale-[0.99] text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isProcessing ? (
                <span>Quanta đang cấu hình & chuẩn bị...</span>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Xác Nhận & Bắt Đầu Sinh Đề Ngay</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleSelfCustomize}
              className={`px-2.5 py-1.5 border rounded-xl text-xs font-semibold flex items-center gap-1 shadow-2xs transition-all cursor-pointer ${
                isApplied
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-bold'
                  : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
              }`}
            >
              {isApplied ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Đã nạp vào Bước 2</span>
                </>
              ) : (
                <>
                  <Sliders className="w-3 h-3 text-slate-500" />
                  <span>Tự chỉnh</span>
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-bold text-[11px]">Đã chuyển tiếp tới Không gian Thẩm định!</span>
            </div>
            <button
              onClick={() => onNavigate?.('review')}
              className="text-[11px] font-bold text-teal-800 underline flex items-center gap-0.5"
            >
              Xem ngay <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Interactive Question Patch Card Component ─────────────────────────────
const QuestionPatchCard: React.FC<{
  data: PatchQuestionActionData;
  onPatchQuestion?: (data: PatchQuestionActionData) => Promise<boolean> | void;
}> = ({ data, onPatchQuestion }) => {
  const [isApplying, setIsApplying] = useState(false);
  const [isApplied, setIsApplied] = useState(false);

  const handleApply = async () => {
    setIsApplying(true);
    try {
      if (onPatchQuestion) {
        await onPatchQuestion(data);
      }
      setIsApplied(true);
    } catch (err) {
      console.error('Lỗi khi áp dụng bản vá câu hỏi:', err);
    } finally {
      setIsApplying(false);
    }
  };

  const patch = data.patch || {};

  return (
    <div className="my-3 p-3.5 bg-gradient-to-br from-emerald-50 via-teal-50/40 to-cyan-50/60 border border-emerald-300/80 rounded-2xl shadow-sm text-slate-800 space-y-2.5">
      <div className="flex items-center justify-between pb-2 border-b border-emerald-200/60">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
            <Wand2 className="w-3.5 h-3.5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 tracking-tight">Đề Xuất Tinh Chỉnh Câu Hỏi</h4>
            <span className="text-[10px] text-emerald-800 font-medium">Quanta Butler điều phối sửa trực tiếp</span>
          </div>
        </div>
        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[9px] font-mono font-bold">
          {data.questionId || 'Active Question'}
        </span>
      </div>

      <div className="space-y-2 text-xs">
        {data.diffSummary && (
          <div className="bg-white/90 p-2.5 rounded-xl border border-emerald-200 text-emerald-950 text-[11px] font-medium leading-relaxed flex items-start gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
            <span>{data.diffSummary}</span>
          </div>
        )}

        <div className="bg-white/80 p-2.5 rounded-xl border border-slate-200/80 space-y-2 text-[11px]">
          {patch.question && (
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">Nội dung câu hỏi mới:</span>
              <p className="text-slate-800 font-semibold">{patch.question}</p>
            </div>
          )}

          {patch.correctAnswerId && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Đáp án đúng mới:</span>
              <span className="px-2 py-0.5 bg-emerald-500 text-white font-bold rounded-md text-[10px]">
                Phương án {patch.correctAnswerId}
              </span>
            </div>
          )}

          {patch.bloomLevel && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Cấp độ Bloom:</span>
              <span className="px-2 py-0.5 bg-sky-100 text-sky-800 font-semibold rounded-md text-[10px]">
                {patch.bloomLevel}
              </span>
            </div>
          )}

          {patch.explanation && (
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">Lời giải thích mới:</span>
              <p className="text-slate-600 italic bg-slate-50 p-2 rounded-lg border border-slate-200/60 leading-relaxed text-[10px]">
                {patch.explanation}
              </p>
            </div>
          )}
        </div>

        {!isApplied ? (
          <button
            type="button"
            onClick={handleApply}
            disabled={isApplying}
            className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {isApplying ? (
              <span>Đang cập nhật câu hỏi...</span>
            ) : (
              <>
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Xác Nhận Áp Dụng Thay Đổi (1-Chạm)</span>
              </>
            )}
          </button>
        ) : (
          <div className="p-2.5 bg-emerald-100/80 border border-emerald-300 rounded-xl text-emerald-900 flex items-center justify-between text-xs font-semibold">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Đã cập nhật câu hỏi thành công trên Bước 3!</span>
            </div>
            <span className="text-[10px] text-emerald-700 bg-white px-2 py-0.5 rounded-full border border-emerald-200">
              Đã đồng bộ
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Smart Exam Import Action Card Component (Nạp câu hỏi thật vào Bước 4 / Bước 3) ──
const ExamImportCard: React.FC<{
  data: ImportExamActionData;
  onImportExam?: (data: ImportExamActionData, targetScreen?: ScreenId) => Promise<boolean> | void;
  onNavigate?: (screen: ScreenId) => void;
}> = ({ data, onImportExam, onNavigate }) => {
  const [isImporting, setIsImporting] = useState<string | null>(null);
  const [isImported, setIsImported] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const questions = data.questions || [];
  const title = data.title || 'Bộ Đề Khảo Thí Quanta AI Khởi Tạo';

  const handleImport = async (targetScreen: ScreenId) => {
    setIsImporting(targetScreen);
    try {
      if (onImportExam) {
        await onImportExam(data, targetScreen);
      } else if (onNavigate) {
        onNavigate(targetScreen);
      }
      setIsImported(true);
    } catch (e) {
      console.error('Lỗi khi nạp đề thi từ Quanta:', e);
    } finally {
      setIsImporting(null);
    }
  };

  return (
    <div className="my-3 p-3.5 bg-gradient-to-br from-indigo-50 via-purple-50/50 to-pink-50/40 border border-indigo-200/90 rounded-2xl shadow-sm text-slate-800 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-indigo-200/60">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 tracking-tight">{title}</h4>
            <span className="text-[10px] text-indigo-700 font-medium">
              Quanta đã biên soạn {questions.length} câu hỏi chuẩn cấu trúc
            </span>
          </div>
        </div>
        <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded-full text-[10px] font-bold">
          {questions.length} câu
        </span>
      </div>

      {/* Preview questions */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-[11px] text-slate-600 font-medium">
          <span>Xem trước danh sách câu hỏi:</span>
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-indigo-600 hover:text-indigo-800 font-semibold text-[10px] flex items-center gap-1 cursor-pointer"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-3 h-3" /> Thu gọn
              </>
            ) : (
              <>
                <ChevronDown className="w-3 h-3" /> Xem chi tiết ({questions.length} câu)
              </>
            )}
          </button>
        </div>

        <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
          {(isExpanded ? questions : questions.slice(0, 2)).map((q, idx) => (
            <div key={idx} className="bg-white/90 p-2.5 rounded-xl border border-indigo-100/80 text-[11px] space-y-1">
              <div className="flex items-center justify-between gap-1">
                <span className="font-bold text-indigo-950">Câu {idx + 1}:</span>
                <span className="px-1.5 py-0.2 bg-slate-100 text-slate-700 rounded text-[9px] font-semibold">
                  {q.bloomLevel || 'Thông hiểu'}
                </span>
              </div>
              <p className="text-slate-800 font-medium">{q.question}</p>
              {q.correctAnswerId && (
                <div className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1 mt-0.5">
                  <Check className="w-3 h-3" />
                  <span>Đáp án đúng: Phương án {q.correctAnswerId}</span>
                </div>
              )}
            </div>
          ))}
          {!isExpanded && questions.length > 2 && (
            <div className="text-center py-1 text-[10px] text-slate-500 italic">
              ...và còn {questions.length - 2} câu hỏi nữa trong bộ đề.
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      {!isImported ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={() => handleImport('bank')}
            disabled={Boolean(isImporting)}
            className="w-full py-2 px-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 active:scale-[0.99] text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>{isImporting === 'bank' ? 'Đang nạp...' : '🚀 Nạp Vào Bước 4 (In Đề)'}</span>
          </button>
          <button
            type="button"
            onClick={() => handleImport('review')}
            disabled={Boolean(isImporting)}
            className="w-full py-2 px-3 bg-white hover:bg-slate-50 active:scale-[0.99] border border-indigo-200 text-indigo-700 font-semibold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <FileQuestion className="w-3.5 h-3.5" />
            <span>{isImporting === 'review' ? 'Đang nạp...' : '📝 Nạp Vào Bước 3 (Duyệt)'}</span>
          </button>
        </div>
      ) : (
        <div className="py-2.5 px-3 bg-emerald-500 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-sm">
          <CheckCircle2 className="w-4 h-4" />
          <span>✅ Đã nạp thành công bộ đề vào hệ thống! Đang chuyển hướng...</span>
        </div>
      )}
    </div>
  );
};

// ── Smart Navigation Action Card Component ──────────────────────────────────
const QuickNavCard: React.FC<{
  data: NavigateActionData;
  onNavigate?: (screen: ScreenId) => void;
}> = ({ data, onNavigate }) => {
  const SCREEN_TITLES: Record<string, string> = {
    upload: 'Bước 1: Kho Giáo Trình & Tài Liệu',
    generate: 'Bước 2: Cấu Hình & Sinh Đề AI',
    review: 'Bước 3: Không Gian Đối Soát & Biên Tập',
    bank: 'Bước 4: Ngân Hàng Đề & Xuất Word/PDF',
    qgroup: 'Hội Nhóm Chuyên Môn Q-Group',
    forum: 'Diễn Đàn Khảo Thí',
    support: 'Trung Tâm Hỗ Trợ & FAQ',
    dashboard: 'Bảng Điều Khiển Học Thuật',
  };

  const label = data.label || SCREEN_TITLES[data.targetScreen] || `Chuyển tới ${data.targetScreen}`;

  return (
    <div className="my-2">
      <button
        type="button"
        onClick={() => onNavigate?.(data.targetScreen)}
        className="w-full group p-2.5 bg-gradient-to-r from-teal-50 to-cyan-50 hover:from-teal-100 hover:to-cyan-100 border border-teal-200 rounded-xl flex items-center justify-between text-xs transition-all shadow-2xs cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-[#008689] text-white flex items-center justify-center shrink-0">
            <Compass className="w-3 h-3" />
          </div>
          <span className="font-semibold text-slate-800 group-hover:text-teal-900 transition-colors">
            {label}
          </span>
        </div>
        <ArrowRight className="w-3.5 h-3.5 text-teal-700 group-hover:translate-x-1 transition-transform" />
      </button>
    </div>
  );
};

// ── Code Block with Copy Button ─────────────────────────────────────────────
const CodeBlock: React.FC<{ code: string; language?: string }> = ({ code, language }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    void navigator.clipboard?.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="my-2.5 rounded-xl overflow-hidden border border-slate-700 bg-slate-900 shadow-sm text-slate-200">
      <div className="px-3 py-1.5 bg-slate-800 flex items-center justify-between text-[10px] text-slate-400 font-mono border-b border-slate-700">
        <span>{language || 'code'}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
        >
          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          <span>{copied ? 'Đã sao chép' : 'Sao chép'}</span>
        </button>
      </div>
      <pre className="p-3 text-[11px] font-mono overflow-x-auto leading-relaxed text-slate-200">
        <code>{code}</code>
      </pre>
    </div>
  );
};

// ── Resilient JSON Repair Helper ────────────────────────────────────────────
const repairAndParseJson = (rawStr: string): any => {
  if (!rawStr || !rawStr.trim()) return {};
  const trimmed = rawStr.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    // Sửa trailing comma và backslash LaTeX chưa escape
    const noTrailing = trimmed.replace(/,\s*([}\]])/g, '$1');
    try {
      return JSON.parse(noTrailing);
    } catch {
      try {
        const escaped = noTrailing.replace(/([^\\])\\(?!["\\/bfnrtu])/g, '$1\\\\');
        return JSON.parse(escaped);
      } catch (e) {
        console.warn('Lỗi parse Quanta action JSON:', e);
        return {};
      }
    }
  }
};

// ── Main Quanta Markdown Renderer ───────────────────────────────────────────
export const QuantaMarkdownRenderer: React.FC<QuantaMarkdownRendererProps> = ({
  content,
  actions: structuredActions,
  onNavigate,
  onSubmitTicket,
  onAutoGenerateExam,
  onPatchQuestion,
  onImportExam,
}) => {
  const renderActionCard = (actionType: string, parsedData: any, key: string) => {
    if (actionType === 'support_ticket') {
      return (
        <SupportTicketCard
          key={key}
          data={parsedData}
          onSubmitTicket={onSubmitTicket}
        />
      );
    }
    if (actionType === 'exam_blueprint') {
      return (
        <ExamBlueprintCard
          key={key}
          data={parsedData}
          onNavigate={onNavigate}
          onAutoGenerateExam={onAutoGenerateExam}
        />
      );
    }
    if (actionType === 'navigate') {
      return (
        <QuickNavCard
          key={key}
          data={parsedData}
          onNavigate={onNavigate}
        />
      );
    }
    if (actionType === 'patch_question') {
      return (
        <QuestionPatchCard
          key={key}
          data={parsedData}
          onPatchQuestion={onPatchQuestion}
        />
      );
    }
    if (actionType === 'import_exam') {
      return (
        <ExamImportCard
          key={key}
          data={parsedData}
          onImportExam={onImportExam}
          onNavigate={onNavigate}
        />
      );
    }
    return null;
  };

  // Tách Action Blocks (ưu tiên structuredActions từ API, fallback parse markdown ```action:...```)
  const { actionElements, markdownText } = useMemo(() => {
    const actions: React.ReactNode[] = [];
    if (Array.isArray(structuredActions) && structuredActions.length > 0) {
      structuredActions.forEach((act, idx) => {
        const el = renderActionCard(act.type, act.data || {}, `structured-action-${idx}`);
        if (el) actions.push(el);
      });
    }

    if (!content) return { actionElements: actions, markdownText: '' };

    // Chuẩn hóa \[...\] -> $$...$$ và \(...\) -> $...$
    let normalizedContent = content
      .replace(/\\\[([\s\S]*?)\\\]/g, (_, m) => `$$${m}$$`)
      .replace(/\\\(([\s\S]*?)\\\)/g, (_, m) => `$${m}$`);

    const actionRegex = /```action:(support_ticket|exam_blueprint|navigate|patch_question|import_exam)\s*([\s\S]*?)```/g;
    let cleanText = normalizedContent;
    let match: RegExpExecArray | null;

    let index = 0;
    while ((match = actionRegex.exec(normalizedContent)) !== null) {
      if (!structuredActions || structuredActions.length === 0) {
        const actionType = match[1];
        const parsedData = repairAndParseJson(match[2]);
        const el = renderActionCard(actionType, parsedData, `action-${index}`);
        if (el) actions.push(el);
      }
      cleanText = cleanText.replace(match[0], '');
      index++;
    }

    // Ẩn khối ```action:... đang stream dở (chưa có dấu đóng ```) để giao diện mượt
    cleanText = cleanText.replace(/```action:(support_ticket|exam_blueprint|navigate|patch_question|import_exam)[\s\S]*$/g, '');

    return { actionElements: actions, markdownText: cleanText.trim() };
  }, [content, structuredActions, onNavigate, onSubmitTicket, onAutoGenerateExam, onPatchQuestion, onImportExam]);

  // Render các khối dòng của Markdown
  const renderedBlocks = useMemo(() => {
    if (!markdownText) return [];

    const lines = markdownText.split('\n');
    const blocks: React.ReactNode[] = [];
    let currentList: { type: 'ul' | 'ol'; items: string[] } | null = null;
    let currentCodeBlock: { lang: string; lines: string[] } | null = null;
    let currentBlockquote: string[] = [];
    let currentTable: string[][] = [];

    const flushTable = (key: string) => {
      if (currentTable.length === 0) return;
      const rows = currentTable.filter(
        (r) => !r.every((cell) => /^:?-+:?$/.test(cell.trim()))
      );
      if (rows.length > 0) {
        const header = rows[0];
        const bodyRows = rows.slice(1);
        blocks.push(
          <div key={key} className="my-2.5 overflow-x-auto rounded-xl border border-slate-200 shadow-2xs">
            <table className="w-full text-left border-collapse text-[11px]">
              <thead>
                <tr className="bg-teal-50/80 border-b border-slate-200">
                  {header.map((cell, cIdx) => (
                    <th key={`th-${cIdx}`} className="px-2.5 py-1.5 font-bold text-slate-800 whitespace-nowrap">
                      {renderInlineContent(cell.trim())}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {bodyRows.map((row, rIdx) => (
                  <tr key={`tr-${rIdx}`} className="hover:bg-slate-50/70">
                    {header.map((_, cIdx) => (
                      <td key={`td-${rIdx}-${cIdx}`} className="px-2.5 py-1.5 text-slate-700 leading-snug">
                        {renderInlineContent((row[cIdx] || '').trim())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      currentTable = [];
    };

    const flushList = (key: string) => {
      if (!currentList) return;
      if (currentList.type === 'ul') {
        blocks.push(
          <ul key={key} className="space-y-1 my-2 pl-4 list-disc list-outside text-slate-700">
            {currentList.items.map((item, idx) => (
              <li key={`ul-item-${idx}`} className="leading-relaxed">
                {renderInlineContent(item)}
              </li>
            ))}
          </ul>
        );
      } else {
        blocks.push(
          <ol key={key} className="space-y-1 my-2 pl-4 list-decimal list-outside text-slate-700 font-medium">
            {currentList.items.map((item, idx) => (
              <li key={`ol-item-${idx}`} className="leading-relaxed">
                <span className="font-normal text-slate-700">{renderInlineContent(item)}</span>
              </li>
            ))}
          </ol>
        );
      }
      currentList = null;
    };

    const flushBlockquote = (key: string) => {
      if (currentBlockquote.length === 0) return;
      blocks.push(
        <blockquote
          key={key}
          className="my-2 pl-3 py-1 border-l-2 border-[#008689] bg-teal-50/40 text-slate-700 text-xs italic rounded-r-lg"
        >
          {currentBlockquote.map((q, idx) => (
            <p key={`quote-${idx}`} className="leading-relaxed">
              {renderInlineContent(q)}
            </p>
          ))}
        </blockquote>
      );
      currentBlockquote = [];
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Xử lý Code Block kết thúc / bắt đầu
      if (trimmed.startsWith('```')) {
        if (currentCodeBlock) {
          blocks.push(
            <CodeBlock
              key={`code-${i}`}
              code={currentCodeBlock.lines.join('\n')}
              language={currentCodeBlock.lang}
            />
          );
          currentCodeBlock = null;
        } else {
          flushList(`flush-list-${i}`);
          flushBlockquote(`flush-quote-${i}`);
          currentCodeBlock = {
            lang: trimmed.slice(3).trim(),
            lines: [],
          };
        }
        continue;
      }

      if (currentCodeBlock) {
        currentCodeBlock.lines.push(line);
        continue;
      }

      // Xử lý Block Math ($$...$$)
      if (trimmed.startsWith('$$') && trimmed.endsWith('$$') && trimmed.length > 2) {
        flushList(`flush-list-${i}`);
        flushBlockquote(`flush-quote-${i}`);
        const math = trimmed.slice(2, -2).trim();
        try {
          blocks.push(
            <div key={`blockmath-${i}`} className="my-2.5 overflow-x-auto text-center py-1 bg-slate-50 rounded-lg">
              <BlockMath math={math} />
            </div>
          );
        } catch {
          blocks.push(<div key={`blockmath-err-${i}`} className="font-mono text-red-500 my-1">{trimmed}</div>);
        }
        continue;
      }

      // Xử lý Blockquote (> ...)
      if (trimmed.startsWith('>')) {
        flushList(`flush-list-${i}`);
        currentBlockquote.push(trimmed.slice(1).trim());
        continue;
      } else {
        flushBlockquote(`flush-quote-${i}`);
      }

      // Xử lý Markdown Table (| col1 | col2 |)
      if (trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.length > 2) {
        flushList(`flush-list-${i}`);
        flushBlockquote(`flush-quote-${i}`);
        const cells = trimmed.slice(1, -1).split('|');
        currentTable.push(cells);
        continue;
      } else {
        flushTable(`flush-table-${i}`);
      }

      // Xử lý Lists (- ..., * ..., 1. ...)
      const unorderedMatch = line.match(/^(\s*)[-*]\s+(.+)/);
      const orderedMatch = line.match(/^(\s*)\d+\.\s+(.+)/);

      if (unorderedMatch) {
        if (!currentList || currentList.type !== 'ul') {
          flushList(`flush-list-${i}`);
          currentList = { type: 'ul', items: [unorderedMatch[2]] };
        } else {
          currentList.items.push(unorderedMatch[2]);
        }
        continue;
      } else if (orderedMatch) {
        if (!currentList || currentList.type !== 'ol') {
          flushList(`flush-list-${i}`);
          currentList = { type: 'ol', items: [orderedMatch[2]] };
        } else {
          currentList.items.push(orderedMatch[2]);
        }
        continue;
      } else {
        flushList(`flush-list-${i}`);
      }

      // Xử lý Dòng trống
      if (!trimmed) {
        continue;
      }

      // Xử lý Headings (#, ##, ###)
      if (trimmed.startsWith('### ')) {
        blocks.push(
          <h3 key={`h3-${i}`} className="text-xs font-bold text-slate-900 mt-2.5 mb-1 tracking-tight flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#008689]" />
            {renderInlineContent(trimmed.slice(4))}
          </h3>
        );
        continue;
      }
      if (trimmed.startsWith('## ')) {
        blocks.push(
          <h2 key={`h2-${i}`} className="text-sm font-extrabold text-slate-900 mt-3 mb-1 tracking-tight border-b border-slate-200/60 pb-1">
            {renderInlineContent(trimmed.slice(3))}
          </h2>
        );
        continue;
      }
      if (trimmed.startsWith('# ')) {
        blocks.push(
          <h1 key={`h1-${i}`} className="text-base font-black text-slate-900 mt-3 mb-1 tracking-tight">
            {renderInlineContent(trimmed.slice(2))}
          </h1>
        );
        continue;
      }

      // Xử lý Đoạn văn thường
      blocks.push(
        <p key={`p-${i}`} className="leading-relaxed my-1.5 text-slate-700">
          {renderInlineContent(line)}
        </p>
      );
    }

    flushList('flush-list-end');
    flushBlockquote('flush-quote-end');
    flushTable('flush-table-end');
    if (currentCodeBlock) {
      blocks.push(
        <CodeBlock
          key="code-end"
          code={(currentCodeBlock as any).lines.join('\n')}
          language={(currentCodeBlock as any).lang}
        />
      );
    }

    return blocks;
  }, [markdownText]);

  return (
    <div className="space-y-1 text-xs">
      {renderedBlocks}
      {actionElements}
    </div>
  );
};
