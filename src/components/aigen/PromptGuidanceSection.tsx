import React from 'react';
import { MessageSquareText, Sparkles, X, Lightbulb } from 'lucide-react';

export interface PromptGuidanceSectionProps {
  value: string;
  onChange: (value: string) => void;
}

export const PromptGuidanceSection: React.FC<PromptGuidanceSectionProps> = ({
  value,
  onChange,
}) => {
  const presetSuggestions = [
    {
      label: '🎯 Bám sát tình huống thực tế',
      text: 'Tập trung vào các bài toán tình huống thực tiễn, yêu cầu sinh viên phân tích và ra quyết định thay vì hỏi định nghĩa.',
    },
    {
      label: '🚫 Tránh câu hỏi lý thuyết suông',
      text: 'Tránh các câu hỏi học vẹt hoặc trích dẫn nguyên văn lý thuyết suông; câu hỏi cần kiểm tra năng lực tư duy logic.',
    },
    {
      label: '🔢 Bài tập tính toán số liệu',
      text: 'Bổ sung các bài tập tính toán định lượng có số liệu cụ thể, yêu cầu áp dụng đúng công thức và đơn vị đo.',
    },
    {
      label: '🚛 Vận tải & Logistics thực tiễn',
      text: 'Lấy bối cảnh thực tế ngành Giao thông vận tải, cảng biển, chuỗi cung ứng và điều hành logistics tại Việt Nam.',
    },
    {
      label: '💻 Thuật toán & Độ phức tạp O(n)',
      text: 'Ưu tiên câu hỏi về lựa chọn cấu trúc dữ liệu tối ưu, phân tích độ phức tạp thời gian/không gian của thuật toán.',
    },
  ];

  const handleApplyPreset = (presetText: string) => {
    if (!value.trim()) {
      onChange(presetText);
    } else if (!value.includes(presetText)) {
      onChange(`${value.trim()}\n- ${presetText}`);
    }
  };

  return (
    <div className="bg-white border border-slate-200 p-5 rounded-2xl space-y-3.5 shadow-2xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-teal-50 text-[#008689] flex items-center justify-center border border-teal-200">
            <MessageSquareText className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              3. Định Hướng &amp; Yêu Cầu Sư Phạm Bổ Sung Cho AI
            </h2>
          </div>
        </div>

        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="text-[11px] font-semibold text-slate-400 hover:text-rose-600 flex items-center gap-1 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            <span>Xóa ghi chú</span>
          </button>
        )}
      </div>

      <p className="text-xs text-slate-500 leading-relaxed">
        Thầy/Cô có thể gõ chỉ đạo riêng (ví dụ: trọng tâm vào chương 2, thêm bài tập tính chi phí, tránh câu hỏi khái niệm cơ bản...). AI sẽ tích hợp chỉ đạo này trực tiếp vào đề bài.
      </p>

      {/* Textarea */}
      <div className="relative">
        <textarea
          rows={3}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Nhập yêu cầu sư phạm tại đây... (VD: Ra đề thi nhấn mạnh vào ứng dụng thuật toán Dijkstra tìm đường đi ngắn nhất, có bảng trọng số, 4 phương án rõ ràng...)"
          className="w-full bg-slate-50/80 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-[#008689] focus:bg-white transition-all resize-y"
        />
        <div className="absolute right-3 bottom-3 text-[10px] text-slate-400 font-mono pointer-events-none">
          {value.length} ký tự
        </div>
      </div>

      {/* Preset Chips */}
      <div className="space-y-1.5 pt-1">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600">
          <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
          <span>Gợi ý mẫu chỉ đạo nhanh (Bấm để chèn):</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {presetSuggestions.map((p, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleApplyPreset(p.text)}
              className="text-[11px] font-medium px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-teal-50 hover:text-[#008689] hover:border-teal-200 border border-slate-200/90 text-slate-700 transition-all cursor-pointer shadow-2xs active:scale-95 text-left"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
