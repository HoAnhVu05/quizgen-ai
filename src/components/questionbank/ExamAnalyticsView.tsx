import React, { useMemo } from 'react';
import {
  BarChart3,
  Layers,
  PieChart,
  CheckCircle2,
  Clock,
  BookOpen,
  FileQuestion,
  Sparkles,
  Info,
  TrendingUp,
} from 'lucide-react';
import { Question, BloomLevel } from '../../types';
import { BLOOM_ORDER, BLOOM_STYLE } from './types';

interface ExamAnalyticsViewProps {
  questions: Question[];
  examDuration: number;
  subjectName?: string;
  universityName?: string;
}

export const ExamAnalyticsView: React.FC<ExamAnalyticsViewProps> = ({
  questions,
  examDuration,
  subjectName,
  universityName,
}) => {
  const total = questions.length;

  // 1. Bloom Taxonomy Breakdown
  const bloomStats = useMemo(() => {
    const counts: Record<BloomLevel, number> = {
      'Nhận biết': 0,
      'Thông hiểu': 0,
      'Vận dụng': 0,
      'Phân tích': 0,
    };

    questions.forEach((q) => {
      if (counts[q.bloomLevel] !== undefined) {
        counts[q.bloomLevel]++;
      }
    });

    const recommended: Record<BloomLevel, number> = {
      'Nhận biết': 35,
      'Thông hiểu': 30,
      'Vận dụng': 25,
      'Phân tích': 10,
    };

    return BLOOM_ORDER.map((level) => {
      const count = counts[level];
      const percent = total > 0 ? Math.round((count / total) * 100) : 0;
      return {
        level,
        count,
        percent,
        targetPercent: recommended[level],
        config: BLOOM_STYLE[level],
      };
    });
  }, [questions, total]);

  // 2. Chapter Matrix
  const chapterMatrix = useMemo(() => {
    const map = new Map<
      string,
      {
        chapter: string;
        textbook: string;
        counts: Record<BloomLevel, number>;
        total: number;
      }
    >();

    questions.forEach((q) => {
      const key = `${q.textbookName}__${q.chapter}`;
      if (!map.has(key)) {
        map.set(key, {
          chapter: q.chapter || 'Chưa phân chương',
          textbook: q.textbookName || 'Tài liệu chung',
          counts: {
            'Nhận biết': 0,
            'Thông hiểu': 0,
            'Vận dụng': 0,
            'Phân tích': 0,
          },
          total: 0,
        });
      }
      const entry = map.get(key)!;
      if (entry.counts[q.bloomLevel] !== undefined) {
        entry.counts[q.bloomLevel]++;
      }
      entry.total++;
    });

    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [questions]);

  // 3. Balance Stats & Metrics
  const balanceStats = useMemo(() => {
    const chaptersCount = chapterMatrix.length;
    const formulaCount = questions.filter(
      (q) => q.hasFormula || (q.question && q.question.includes('$'))
    ).length;
    const imageCount = questions.filter(
      (q) => q.hasImage || !!(q as any).imageUrl || !!(q as any).image_url
    ).length;
    const timePerQuestion = total > 0 ? (examDuration / total).toFixed(1) : '0';

    // Balance evaluation: check if remember + understand >= 50% and apply + analyze <= 50%
    const rememberAndUnderstand =
      (bloomStats.find((b) => b.level === 'Nhận biết')?.percent || 0) +
      (bloomStats.find((b) => b.level === 'Thông hiểu')?.percent || 0);

    const isWellBalanced =
      total >= 10 && rememberAndUnderstand >= 50 && rememberAndUnderstand <= 75;

    return {
      chaptersCount,
      formulaCount,
      formulaPercent: total > 0 ? Math.round((formulaCount / total) * 100) : 0,
      imageCount,
      imagePercent: total > 0 ? Math.round((imageCount / total) * 100) : 0,
      timePerQuestion,
      isWellBalanced,
    };
  }, [questions, total, examDuration, chapterMatrix, bloomStats]);

  if (total === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-sm space-y-3">
        <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
          <FileQuestion className="w-6 h-6" />
        </div>
        <div className="space-y-1 max-w-md mx-auto">
          <h4 className="text-base font-bold text-slate-800">Chưa có câu hỏi để phân tích ma trận</h4>
          <p className="text-xs text-slate-500">
            Vui lòng nạp hoặc chọn các câu hỏi trong ngân hàng để hệ thống lập báo cáo phân tích ma trận đề thi và kiểm tra độ cân đối chuẩn Bloom.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner & Balance Status */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-teal-50 text-[#008689]">
              <BarChart3 className="w-5 h-5" />
            </span>
            <h3 className="text-base font-bold text-slate-800">
              Ma Trận Đề Thi & Báo Cáo Phân Tích Chuẩn Khảo Thí
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Đánh giá phân bổ độ khó theo thang bậc nhận thức Bloom và tỷ trọng kiến thức theo chuẩn kiểm định MOET / ABET
          </p>
        </div>

        <div className="flex items-center gap-2">
          {balanceStats.isWellBalanced ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Độ Cân Đối Đạt Chuẩn (MOET)
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold">
              <TrendingUp className="w-4 h-4 text-amber-600" />
              Tỷ Trọng Cần Điều Chỉnh
            </span>
          )}
        </div>
      </div>

      {/* KPI Stats Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Tổng số câu hỏi</span>
            <FileQuestion className="w-4 h-4 text-[#008689]" />
          </div>
          <div className="text-2xl font-black text-slate-900">{total}</div>
          <p className="text-[11px] text-slate-400">
            Thời lượng thi: <strong className="text-slate-700">{examDuration} phút</strong>
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Độ phủ chương mục</span>
            <Layers className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{balanceStats.chaptersCount}</div>
          <p className="text-[11px] text-slate-400">
            Chương kiến thức trong đề thi
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Thời gian TB / câu</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{balanceStats.timePerQuestion} <span className="text-xs font-normal text-slate-500">phút</span></div>
          <p className="text-[11px] text-slate-400">
            Khuyến nghị: 1.2 - 1.8 phút/câu
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Toán & Sơ đồ</span>
            <Sparkles className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {balanceStats.formulaCount + balanceStats.imageCount}
          </div>
          <p className="text-[11px] text-slate-400">
            {balanceStats.formulaCount} công thức + {balanceStats.imageCount} hình ảnh
          </p>
        </div>
      </div>

      {/* Bloom Taxonomy Breakdown Chart */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <PieChart className="w-4 h-4 text-[#008689]" />
              Phân Bổ Thang Bậc Nhận Thức Bloom (Bloom's Revised Taxonomy)
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              So sánh tỷ lệ thực tế với khung ma trận đề chuẩn đại học
            </p>
          </div>
          <span className="text-xs text-slate-400 font-medium">
            Mục tiêu chuẩn: 35% Nhận biết · 30% Thông hiểu · 25% Vận dụng · 10% Phân tích
          </span>
        </div>

        {/* Stacked Percentage Bar */}
        <div className="w-full h-4 rounded-full overflow-hidden flex bg-slate-100 shadow-inner">
          {bloomStats.map((item) => (
            <div
              key={item.level}
              style={{ width: `${item.percent}%` }}
              className={`${item.config.barColor} transition-all duration-300 relative group`}
              title={`${item.config.label}: ${item.count} câu (${item.percent}%)`}
            />
          ))}
        </div>

        {/* Level Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          {bloomStats.map((item) => (
            <div
              key={item.level}
              className={`p-4 rounded-xl border ${item.config.border} ${item.config.bg} space-y-2.5`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold ${item.config.color}`}>
                  {item.config.label}
                </span>
                <span className="text-[11px] font-semibold text-slate-500">
                  {item.config.en}
                </span>
              </div>

              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-slate-900">{item.count} <span className="text-xs font-normal text-slate-500">câu</span></span>
                <span className={`text-base font-extrabold ${item.config.color}`}>
                  {item.percent}%
                </span>
              </div>

              {/* Progress bar vs benchmark */}
              <div className="space-y-1">
                <div className="w-full h-1.5 bg-white/80 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${item.config.barColor} rounded-full`}
                    style={{ width: `${Math.min(100, item.percent)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-500">
                  <span>Chuẩn: ~{item.targetPercent}%</span>
                  <span className={item.percent >= item.targetPercent - 5 && item.percent <= item.targetPercent + 10 ? 'text-emerald-700 font-bold' : 'text-slate-400'}>
                    {item.percent >= item.targetPercent - 5 && item.percent <= item.targetPercent + 10 ? 'Cân đối' : item.percent > item.targetPercent ? 'Cao hơn' : 'Thấp hơn'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chapter Matrix Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-[#008689]" />
              Ma Trận Kiến Thức Chi Tiết Theo Chương Mục
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Chi tiết số câu hỏi ở từng cấp độ Bloom cho mỗi chương của học phần
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-600 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
            {chapterMatrix.length} Chương mục
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-700 font-bold uppercase">
                <th className="py-3 px-4">Chương mục giáo trình</th>
                <th className="py-3 px-3 text-center text-sky-800">Nhận biết</th>
                <th className="py-3 px-3 text-center text-[#008689]">Thông hiểu</th>
                <th className="py-3 px-3 text-center text-amber-800">Vận dụng</th>
                <th className="py-3 px-3 text-center text-rose-800">Phân tích</th>
                <th className="py-3 px-3 text-center">Tổng câu</th>
                <th className="py-3 px-4 text-right">Tỷ trọng</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {chapterMatrix.map((item, idx) => {
                const chapterPercent = total > 0 ? ((item.total / total) * 100).toFixed(1) : '0';
                return (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">{item.chapter}</div>
                      <div className="text-[11px] text-slate-400 truncate max-w-md">
                        {item.textbook}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center font-semibold text-sky-700">
                      {item.counts['Nhận biết'] || '-'}
                    </td>
                    <td className="py-3 px-3 text-center font-semibold text-[#008689]">
                      {item.counts['Thông hiểu'] || '-'}
                    </td>
                    <td className="py-3 px-3 text-center font-semibold text-amber-700">
                      {item.counts['Vận dụng'] || '-'}
                    </td>
                    <td className="py-3 px-3 text-center font-semibold text-rose-700">
                      {item.counts['Phân tích'] || '-'}
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-slate-900">
                      {item.total}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-700">
                      {chapterPercent}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 font-bold text-slate-900 border-t-2 border-slate-300">
                <td className="py-3 px-4 uppercase text-[11px] text-slate-700">Tổng cộng toàn đề</td>
                <td className="py-3 px-3 text-center text-sky-800">
                  {bloomStats.find((b) => b.level === 'Nhận biết')?.count || 0}
                </td>
                <td className="py-3 px-3 text-center text-[#008689]">
                  {bloomStats.find((b) => b.level === 'Thông hiểu')?.count || 0}
                </td>
                <td className="py-3 px-3 text-center text-amber-800">
                  {bloomStats.find((b) => b.level === 'Vận dụng')?.count || 0}
                </td>
                <td className="py-3 px-3 text-center text-rose-800">
                  {bloomStats.find((b) => b.level === 'Phân tích')?.count || 0}
                </td>
                <td className="py-3 px-3 text-center text-slate-900">{total}</td>
                <td className="py-3 px-4 text-right text-emerald-700 font-extrabold">100%</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Advisory Note */}
      <div className="p-4 rounded-xl bg-teal-50/60 border border-teal-200/80 flex items-start gap-3 text-xs text-teal-900">
        <Info className="w-4 h-4 text-[#008689] shrink-0 mt-0.5" />
        <div className="space-y-1">
          <strong className="font-bold">Khuyến nghị khảo thí chuẩn đại học:</strong>
          <p className="text-teal-800 leading-relaxed">
            Đề thi học phần {subjectName || 'hiện tại'} được lập cho thời lượng {examDuration} phút. Mức độ Bloom Nhận biết & Thông hiểu chiếm nền tảng ({((bloomStats.find((b) => b.level === 'Nhận biết')?.percent || 0) + (bloomStats.find((b) => b.level === 'Thông hiểu')?.percent || 0))}%), các câu hỏi Vận dụng & Phân tích giúp phân loại sinh viên giỏi ({((bloomStats.find((b) => b.level === 'Vận dụng')?.percent || 0) + (bloomStats.find((b) => b.level === 'Phân tích')?.percent || 0))}%).
          </p>
        </div>
      </div>
    </div>
  );
};
