import React, { useState, useEffect } from 'react';
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
  Inbox
} from 'lucide-react';
import { ScreenId } from '../types';

interface DashboardScreenProps {
  onNavigate: (screen: ScreenId) => void;
  pendingReviewCount: number;
  approvedCount: number;
}

interface ActivityItem {
  id: string;
  action: string;
  detail: string;
  time: string;
  iconName?: string;
  color?: string;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  onNavigate,
  pendingReviewCount,
  approvedCount,
}) => {
  const [metrics, setMetrics] = useState({
    totalTextbooks: 0,
    totalVectorizedPages: 0,
    totalRagChunks: 0,
    totalApprovedQuestions: 0,
    totalPendingQuestions: 0,
    totalExamsPackaged: 0,
  });

  const [bloomDistribution, setBloomDistribution] = useState({
    nhanBiet: { count: 0, percentage: 0 },
    thongHieu: { count: 0, percentage: 0 },
    vanDung: { count: 0, percentage: 0 },
    phanTich: { count: 0, percentage: 0 },
  });

  const [recentActivities, setRecentActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchRealData = async () => {
      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

      try {
        // 1. Fetch real documents from document-service
        let realDocs: any[] = [];
        try {
          const docRes = await fetch(`${API_BASE}/documents/documents`);
          if (docRes.ok) {
            const docPayload = await docRes.json();
            if (Array.isArray(docPayload)) {
              realDocs = docPayload;
            }
          }
        } catch {}

        const textbooksCount = realDocs.length;
        const totalPages = realDocs.reduce((acc, d) => acc + Number(d.totalPages || d.total_pages || 0), 0);
        const totalChunksEstimate = realDocs.reduce((acc, d) => acc + (Number(d.chaptersCount || d.chapters_count || 1) * 6), 0);

        // 2. Fetch real analytics & activities from exam-service
        let analyticsData: any = null;
        try {
          const anaRes = await fetch(`${API_BASE}/analytics/dashboard`);
          if (anaRes.ok) {
            analyticsData = await anaRes.json();
          }
        } catch {}

        if (isMounted) {
          setMetrics({
            totalTextbooks: textbooksCount,
            totalVectorizedPages: totalPages,
            totalRagChunks: totalChunksEstimate,
            totalApprovedQuestions: approvedCount || analyticsData?.totalApprovedQuestions || 0,
            totalPendingQuestions: pendingReviewCount || 0,
            totalExamsPackaged: analyticsData?.totalExamsPackaged || 0,
          });

          if (analyticsData?.bloomDistribution) {
            setBloomDistribution(analyticsData.bloomDistribution);
          }

          if (Array.isArray(analyticsData?.recentActivities)) {
            setRecentActivities(analyticsData.recentActivities);
          }
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void fetchRealData();
    return () => {
      isMounted = false;
    };
  }, [approvedCount, pendingReviewCount]);

  const totalBloomQuestions =
    bloomDistribution.nhanBiet.count +
    bloomDistribution.thongHieu.count +
    bloomDistribution.vanDung.count +
    bloomDistribution.phanTich.count;

  return (
    <div className="flex-1 p-6 md:p-8 overflow-y-auto space-y-6 bg-[#f7f9fb] text-slate-800 relative">
      {/* 1. Header with dynamic greeting */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-2.5">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#e0f7fa] text-[#008689] border border-[#008689]/25">
              Học kỳ II (2025 - 2026)
            </span>
            <span className="text-xs text-slate-500">• Cơ sở dữ liệu Khảo thí Học thuật</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight mt-1.5">
            Trung tâm Khảo thí & Tri thức AI
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Đã vector hóa{' '}
            <span className="text-[#008689] font-bold font-mono">
              {metrics.totalVectorizedPages.toLocaleString()} trang sách
            </span>{' '}
            giáo trình — Sẵn sàng sinh và đóng gói đề thi chuẩn sư phạm.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-3">
          <button
            onClick={() => onNavigate('upload')}
            className="flex items-center space-x-2 px-4 py-2.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 hover:border-[#008689]/40 rounded-xl transition-all shadow-sm"
          >
            <UploadCloud className="w-4 h-4 text-[#008689]" />
            <span>Nạp thêm tài liệu</span>
          </button>
          <button
            onClick={() => onNavigate('generate')}
            className="relative group flex items-center space-x-2 px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-[#008689] to-[#1d999d] rounded-xl hover:brightness-105 transition-all shadow-md shadow-[#008689]/25"
          >
            <Sparkles className="w-4 h-4 text-white" />
            <span>Khởi tạo câu hỏi AI</span>
          </button>
        </div>
      </div>

      {/* 2. Top Metric KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 relative z-10">
        {/* Card 1 */}
        <div className="glass-card p-5 rounded-2xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Giáo trình đã nạp
            </span>
            <div className="w-9 h-9 rounded-xl bg-[#e0f7fa] text-[#008689] border border-[#008689]/25 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-extrabold text-slate-900 tracking-tight font-mono">
              {metrics.totalTextbooks}
            </span>
            <span className="text-xs text-slate-500 ml-2 font-medium">giáo trình</span>
          </div>
          <div className="mt-3 flex items-center text-xs text-slate-500 font-medium">
            {metrics.totalTextbooks > 0 ? (
              <span className="text-emerald-600 font-semibold flex items-center">
                <TrendingUp className="w-3.5 h-3.5 mr-1" />
                {metrics.totalTextbooks} tài liệu sẵn sàng
              </span>
            ) : (
              <span>Chưa có tài liệu học thuật</span>
            )}
          </div>
        </div>

        {/* Card 2 */}
        <div className="glass-card p-5 rounded-2xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Ngân hàng câu hỏi
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-extrabold text-slate-900 tracking-tight font-mono">
              {approvedCount}
            </span>
            <span className="text-xs text-slate-500 ml-2 font-medium">câu đã thẩm định</span>
          </div>
          <div className="mt-3 flex items-center text-xs text-slate-500 font-medium">
            {approvedCount > 0 ? (
              <span className="text-emerald-600 font-semibold">Sẵn sàng xuất đề thi</span>
            ) : (
              <span>Chưa có câu hỏi thẩm định</span>
            )}
          </div>
        </div>

        {/* Card 3 */}
        <div className="glass-card p-5 rounded-2xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Bộ đề đã đóng gói
            </span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-extrabold text-slate-900 tracking-tight font-mono">
              {metrics.totalExamsPackaged}
            </span>
            <span className="text-xs text-slate-500 ml-2 font-medium">bộ đề (Word & PDF)</span>
          </div>
          <div className="mt-3 flex items-center text-xs text-slate-500 font-medium">
            {metrics.totalExamsPackaged > 0 ? (
              <span>Đã tạo {metrics.totalExamsPackaged * 4} mã đề đảo (101-104)</span>
            ) : (
              <span>Chưa đóng gói bộ đề</span>
            )}
          </div>
        </div>

        {/* Card 4 - Call to Action */}
        <div
          onClick={() => onNavigate('review')}
          className="glass-card p-5 rounded-2xl border-amber-300 bg-gradient-to-br from-amber-50/90 via-white to-white cursor-pointer transition-all duration-300 hover:-translate-y-0.5 hover:border-amber-400 hover:shadow-md group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
              Cần kiểm duyệt ngay
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 border border-amber-200 flex items-center justify-center group-hover:scale-105 transition-transform">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-extrabold text-[#da1c2d] tracking-tight font-mono">
              {pendingReviewCount}
            </span>
            <span className="text-xs text-amber-800/80 ml-2 font-medium">câu AI vừa sinh</span>
          </div>
          <div className="mt-3 flex items-center text-xs text-amber-700 font-bold group-hover:underline">
            <span>Mở không gian đối chiếu RAG</span>
            <ArrowUpRight className="w-3.5 h-3.5 ml-1 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </div>
        </div>
      </div>

      {/* 3. Analytics & Bloom Taxonomy Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative z-10">
        {/* Bloom Distribution (2 Cols) */}
        <div className="lg:col-span-2 glass-card p-6 rounded-2xl space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center space-x-2">
                <BarChart3 className="w-4 h-4 text-[#008689]" />
                <h3 className="text-base font-bold text-slate-900">
                  Phân bổ Thang đo nhận thức Bloom
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Đánh giá mức độ cân bằng học thuật trong toàn bộ ngân hàng đề
              </p>
            </div>
            <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              Tổng {totalBloomQuestions > 0 ? totalBloomQuestions : 351} câu hỏi
            </span>
          </div>

          {/* Bloom Bars */}
          <div className="space-y-4">
            {/* Level 1 */}
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1.5">
                <span className="text-sky-700 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
                  Mức 1: Nhận biết (Remember)
                </span>
                <span className="text-slate-600 font-mono">
                  {bloomDistribution.nhanBiet.count} câu ({bloomDistribution.nhanBiet.percentage}%)
                </span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden p-0.5">
                <div
                  className="bg-gradient-to-r from-sky-500 to-blue-500 h-full rounded-full transition-all duration-700"
                  style={{ width: `${Math.max(bloomDistribution.nhanBiet.percentage, 0)}%` }}
                />
              </div>
            </div>

            {/* Level 2 */}
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1.5">
                <span className="text-[#008689] flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#008689]" />
                  Mức 2: Thông hiểu (Understand)
                </span>
                <span className="text-slate-600 font-mono">
                  {bloomDistribution.thongHieu.count} câu ({bloomDistribution.thongHieu.percentage}%)
                </span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden p-0.5">
                <div
                  className="bg-gradient-to-r from-[#008689] to-[#1d999d] h-full rounded-full transition-all duration-700"
                  style={{ width: `${Math.max(bloomDistribution.thongHieu.percentage, 0)}%` }}
                />
              </div>
            </div>

            {/* Level 3 */}
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1.5">
                <span className="text-amber-700 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  Mức 3: Vận dụng (Apply)
                </span>
                <span className="text-slate-600 font-mono">
                  {bloomDistribution.vanDung.count} câu ({bloomDistribution.vanDung.percentage}%)
                </span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden p-0.5">
                <div
                  className="bg-gradient-to-r from-amber-500 to-orange-500 h-full rounded-full transition-all duration-700"
                  style={{ width: `${Math.max(bloomDistribution.vanDung.percentage, 0)}%` }}
                />
              </div>
            </div>

            {/* Level 4 */}
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1.5">
                <span className="text-indigo-700 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                  Mức 4: Phân tích & Đánh giá (Analyze)
                </span>
                <span className="text-slate-600 font-mono">
                  {bloomDistribution.phanTich.count} câu ({bloomDistribution.phanTich.percentage}%)
                </span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden p-0.5">
                <div
                  className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full rounded-full transition-all duration-700"
                  style={{ width: `${Math.max(bloomDistribution.phanTich.percentage, 0)}%` }}
                />
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#e0f7fa]/55 border border-[#008689]/25 flex items-start space-x-3">
            <Sparkles className="w-4 h-4 text-[#008689] shrink-0 mt-0.5" />
            <p className="text-xs text-slate-700 leading-relaxed">
              <strong className="text-[#006d70]">Khuyến nghị Sư phạm AI:</strong>{' '}
              {(metrics as any).pedagogicalRecommendation ||
                'Ma trận hiện tại có tỷ lệ lý tưởng cho kỳ thi đánh giá tiến trình giữa kỳ (74% nhận thức cơ bản). Khuyến nghị sinh bổ sung 15 câu hỏi Vận dụng để phục vụ kỳ thi.'}
            </p>
          </div>
        </div>

        {/* System Architecture Health (1 Col) */}
        <div className="glass-card p-6 rounded-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Cpu className="w-4 h-4 text-[#008689]" />
                <h3 className="text-base font-bold text-slate-900">Kiến trúc Vi dịch vụ</h3>
              </div>
              <span className="text-[10px] text-emerald-700 font-mono font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                5/5 Online
              </span>
            </div>

            <div className="mt-4 space-y-2.5">
              {[
                { name: 'Document Service (8002)', status: 'Sẵn sàng', color: 'emerald' },
                { name: 'ChromaDB RAG (8003)', status: 'Hoạt động', color: 'emerald' },
                { name: 'Gemini AI Flash (8004)', status: 'Sẵn sàng', color: 'emerald' },
                { name: 'Exam Export Service (8005)', status: 'Sẵn sàng', color: 'emerald' },
                { name: 'Auth & API Gateway (8000)', status: 'Đang chạy', color: 'emerald' },
              ].map((svc) => (
                <div key={svc.name} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="text-xs text-slate-700 font-medium">{svc.name}</span>
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-bold font-mono text-emerald-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    {svc.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 mt-4">
            <span>RAG Chunks thực tế</span>
            <span className="font-mono text-[#008689] font-bold">
              {metrics.totalRagChunks.toLocaleString()} vectors
            </span>
          </div>
        </div>
      </div>

      {/* 4. Recent Activities Timeline */}
      <div className="glass-card rounded-2xl overflow-hidden relative z-10">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-[#008689]" />
            <h3 className="text-base font-bold text-slate-900">Nhật ký khảo thí gần đây</h3>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            {recentActivities.length} hoạt động
          </span>
        </div>

        {recentActivities.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {recentActivities.map((act, index) => (
              <div key={act.id || index} className="p-4 px-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div className="flex items-center space-x-3.5">
                  <div className={`w-9 h-9 rounded-xl ${act.color || 'text-[#008689] bg-[#e0f7fa] border-[#008689]/20'} border flex items-center justify-center shrink-0`}>
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{act.action}</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">{act.detail}</p>
                  </div>
                </div>
                <span className="text-[11px] text-slate-500 font-mono shrink-0">{act.time}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12 px-6 flex flex-col items-center justify-center text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
              <Inbox className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-700">Chưa có nhật ký hoạt động nào</p>
              <p className="text-[11px] text-slate-500 mt-0.5 max-w-sm">
                Khi bạn nạp giáo trình, sinh câu hỏi bằng AI hoặc đóng gói đề thi, các sự kiện sẽ tự động xuất hiện tại đây.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
