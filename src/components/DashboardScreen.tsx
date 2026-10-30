import React from 'react';
import {
  BookOpen,
  HelpCircle,
  FileText,
  Clock,
  Sparkles,
  ArrowUpRight,
  TrendingUp,
  Layers,
  CheckCircle2,
  AlertTriangle,
  UploadCloud,
  ChevronRight,
  Zap,
  BarChart3,
  Cpu,
  Compass
} from 'lucide-react';
import { ScreenId } from '../types';

interface DashboardScreenProps {
  onNavigate: (screen: ScreenId) => void;
  pendingReviewCount: number;
  approvedCount: number;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  onNavigate,
  pendingReviewCount,
  approvedCount,
}) => {
  return (
    <div className="flex-1 p-8 overflow-y-auto space-y-8 bg-[#0b0f19] text-slate-100 relative">
      {/* Background ambient mesh gradient */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-40 right-10 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* 1. Header with dynamic greeting */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-white/[0.06]">
        <div>
          <div className="flex items-center space-x-2.5">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
              Học kỳ II (2025 - 2026)
            </span>
            <span className="text-xs text-slate-400">• Cơ sở dữ liệu Khảo thí ĐHQG</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight mt-1.5">
            Trung tâm Khảo thí & Tri thức AI
          </h1>
          <p className="text-xs md:text-sm text-slate-400 mt-1">
            Đã vector hóa <span className="text-blue-400 font-semibold font-mono">1,480 trang sách</span> giáo trình — Sẵn sàng sinh và đóng gói đề thi chuẩn sư phạm.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-3">
          <button
            onClick={() => onNavigate('upload')}
            className="flex items-center space-x-2 px-4 py-2.5 text-xs font-semibold text-slate-200 bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.1] rounded-xl transition-all shadow-sm hover:scale-[1.02]"
          >
            <UploadCloud className="w-4 h-4 text-blue-400" />
            <span>Nạp thêm tài liệu</span>
          </button>
          <button
            onClick={() => onNavigate('generate')}
            className="relative group flex items-center space-x-2 px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl hover:from-blue-500 hover:to-indigo-500 transition-all shadow-lg shadow-blue-600/25 hover:shadow-blue-600/40 hover:scale-[1.02]"
          >
            <Sparkles className="w-4 h-4 text-sky-200 animate-spin" />
            <span>Khởi tạo câu hỏi AI</span>
          </button>
        </div>
      </div>

      {/* 2. Top Metric KPI Cards with Ambient Glow */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 relative z-10">
        {/* Card 1 */}
        <div className="glass-card p-5 rounded-2xl transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Giáo trình đã nạp
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-extrabold text-white tracking-tight font-mono">12</span>
            <span className="text-xs text-slate-400 ml-2 font-medium">sách giáo khoa</span>
          </div>
          <div className="mt-3 flex items-center text-xs text-emerald-400 font-medium">
            <TrendingUp className="w-3.5 h-3.5 mr-1" />
            <span>+2 giáo trình mới tuần này</span>
          </div>
        </div>

        {/* Card 2 */}
        <div className="glass-card p-5 rounded-2xl transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Ngân hàng câu hỏi
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-extrabold text-white tracking-tight font-mono">
              {approvedCount + 348}
            </span>
            <span className="text-xs text-slate-400 ml-2 font-medium">câu đã kiểm định</span>
          </div>
          <div className="mt-3 flex items-center text-xs text-slate-400 font-medium">
            <span className="text-emerald-400 font-bold mr-1">98.2%</span> độ chính xác RAG
          </div>
        </div>

        {/* Card 3 */}
        <div className="glass-card p-5 rounded-2xl transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Bộ đề đã đóng gói
            </span>
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-extrabold text-white tracking-tight font-mono">28</span>
            <span className="text-xs text-slate-400 ml-2 font-medium">bộ đề (Word & PDF)</span>
          </div>
          <div className="mt-3 flex items-center text-xs text-slate-400 font-medium">
            <span>Đã tạo 112 mã đề đảo (101-104)</span>
          </div>
        </div>

        {/* Card 4 - Call to Action */}
        <div
          onClick={() => onNavigate('review')}
          className="glass-card p-5 rounded-2xl border-amber-500/30 bg-gradient-to-br from-amber-500/[0.08] via-transparent to-transparent cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:border-amber-400/50 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300">
              Cần kiểm duyệt ngay
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center justify-center group-hover:scale-110 transition-transform">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-extrabold text-amber-400 tracking-tight font-mono">
              {pendingReviewCount}
            </span>
            <span className="text-xs text-amber-200/80 ml-2 font-medium">câu AI vừa sinh</span>
          </div>
          <div className="mt-3 flex items-center text-xs text-amber-300 font-semibold group-hover:underline">
            <span>Mở không gian đối chiếu RAG</span>
            <ArrowUpRight className="w-3.5 h-3.5 ml-1 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </div>
        </div>
      </div>

      {/* 3. Analytics & Bloom Taxonomy Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative z-10">
        {/* Bloom Distribution (2 Cols) */}
        <div className="lg:col-span-2 glass-card p-6 rounded-2xl space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
            <div>
              <div className="flex items-center space-x-2">
                <BarChart3 className="w-4 h-4 text-blue-400" />
                <h3 className="text-base font-bold text-white">
                  Phân bổ Thang đo nhận thức Bloom
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Đánh giá mức độ cân bằng học thuật trong toàn bộ ngân hàng đề
              </p>
            </div>
            <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-full bg-white/[0.06] text-slate-300 border border-white/[0.08]">
              Tổng 351 câu hỏi
            </span>
          </div>

          {/* Glowing Bloom Bars */}
          <div className="space-y-4">
            {/* Level 1 */}
            <div>
              <div className="flex justify-between text-xs font-medium mb-1.5">
                <span className="text-sky-300 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-400 shadow-glow-sm" />
                  Mức 1: Nhận biết (Remember)
                </span>
                <span className="text-slate-300 font-mono">142 câu (40%)</span>
              </div>
              <div className="w-full bg-white/[0.05] h-2.5 rounded-full overflow-hidden p-0.5">
                <div className="bg-gradient-to-r from-sky-500 to-blue-500 h-full rounded-full transition-all duration-700 shadow-glow-sm" style={{ width: '40%' }} />
              </div>
            </div>

            {/* Level 2 */}
            <div>
              <div className="flex justify-between text-xs font-medium mb-1.5">
                <span className="text-teal-300 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-teal-400 shadow-glow-sm" />
                  Mức 2: Thông hiểu (Understand)
                </span>
                <span className="text-slate-300 font-mono">120 câu (34%)</span>
              </div>
              <div className="w-full bg-white/[0.05] h-2.5 rounded-full overflow-hidden p-0.5">
                <div className="bg-gradient-to-r from-teal-500 to-emerald-500 h-full rounded-full transition-all duration-700 shadow-glow-sm" style={{ width: '34%' }} />
              </div>
            </div>

            {/* Level 3 */}
            <div>
              <div className="flex justify-between text-xs font-medium mb-1.5">
                <span className="text-amber-300 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-glow-sm" />
                  Mức 3: Vận dụng (Apply)
                </span>
                <span className="text-slate-300 font-mono">65 câu (18%)</span>
              </div>
              <div className="w-full bg-white/[0.05] h-2.5 rounded-full overflow-hidden p-0.5">
                <div className="bg-gradient-to-r from-amber-500 to-orange-500 h-full rounded-full transition-all duration-700 shadow-glow-sm" style={{ width: '18%' }} />
              </div>
            </div>

            {/* Level 4 */}
            <div>
              <div className="flex justify-between text-xs font-medium mb-1.5">
                <span className="text-purple-300 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-400 shadow-glow-sm" />
                  Mức 4: Phân tích & Đánh giá (Analyze)
                </span>
                <span className="text-slate-300 font-mono">24 câu (8%)</span>
              </div>
              <div className="w-full bg-white/[0.05] h-2.5 rounded-full overflow-hidden p-0.5">
                <div className="bg-gradient-to-r from-purple-500 to-pink-500 h-full rounded-full transition-all duration-700 shadow-glow-sm" style={{ width: '8%' }} />
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-gradient-to-r from-blue-900/30 via-indigo-900/20 to-transparent border border-blue-500/20 flex items-start space-x-3">
            <Sparkles className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-200 leading-relaxed">
              <strong>Khuyến nghị Sư phạm AI:</strong> Ma trận hiện tại có tỷ lệ lý tưởng cho kỳ thi đánh giá tiến trình giữa kỳ (74% nhận thức cơ bản). Khuyến nghị sinh bổ sung <span className="text-sky-300 underline font-semibold">15 câu hỏi Vận dụng & Tình huống thực tiễn</span> để phục vụ kỳ thi tuyển chọn chất lượng cao.
            </p>
          </div>
        </div>

        {/* Telemetry & Vector Health */}
        <div className="glass-card p-6 rounded-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
              <div className="flex items-center space-x-2">
                <Cpu className="w-4 h-4 text-indigo-400" />
                <h3 className="text-base font-bold text-white">ChromaDB Vectors</h3>
              </div>
              <span className="text-[10px] text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                12,450 Chunks
              </span>
            </div>

            <div className="mt-5 space-y-4">
              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <div className="flex justify-between text-xs text-slate-300 mb-1.5 font-medium">
                  <span>Cosine Similarity Threshold</span>
                  <span className="font-mono text-emerald-400 font-bold">&gt; 0.88</span>
                </div>
                <div className="w-full bg-white/[0.05] h-2 rounded-full overflow-hidden">
                  <div className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full w-[88%]" />
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <div className="flex justify-between text-xs text-slate-300 mb-1.5 font-medium">
                  <span>Tốc độ Embedding RAG</span>
                  <span className="font-mono text-blue-400 font-bold">140ms / query</span>
                </div>
                <div className="w-full bg-white/[0.05] h-2 rounded-full overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full w-[94%]" />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-white/[0.06] flex items-center justify-between text-xs text-slate-400">
            <span>Mô hình: Gemini 1.5 Pro</span>
            <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Sẵn sàng
            </span>
          </div>
        </div>
      </div>

      {/* 4. Recent Activities Timeline */}
      <div className="glass-card rounded-2xl overflow-hidden relative z-10">
        <div className="p-5 border-b border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-slate-400" />
            <h3 className="text-base font-bold text-white">Nhật ký khảo thí gần đây</h3>
          </div>
          <button className="text-xs text-blue-400 hover:text-blue-300 font-medium">
            Xem toàn bộ nhật ký
          </button>
        </div>

        <div className="divide-y divide-white/[0.04]">
          {[
            {
              action: 'Xuất đề thi kết thúc học phần',
              detail: 'Kinh tế vĩ mô - Giữa kỳ (40 câu - 4 mã đề 101, 102, 103, 104) ra tệp Word .docx',
              time: '15 phút trước',
              icon: FileText,
              color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
            },
            {
              action: 'Phê duyệt câu hỏi tự động RAG',
              detail: 'Đã thẩm định 12 câu hỏi trắc nghiệm Chương 3: Cung - Cầu',
              time: '1 giờ trước',
              icon: CheckCircle2,
              color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
            },
            {
              action: 'Hoàn tất trích xuất ngữ nghĩa',
              detail: 'Giáo trình Quản trị học hiện đại.pdf (240 trang, 68 chunks vector hóa)',
              time: '3 giờ trước',
              icon: Layers,
              color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
            },
          ].map((act, index) => {
            const Icon = act.icon;
            return (
              <div key={index} className="p-4 px-6 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                <div className="flex items-center space-x-3.5">
                  <div className={`w-9 h-9 rounded-xl ${act.color} border flex items-center justify-center shrink-0`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-white">{act.action}</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">{act.detail}</p>
                  </div>
                </div>
                <span className="text-[11px] text-slate-400 font-mono shrink-0">{act.time}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
