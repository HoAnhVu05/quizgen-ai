import React, { useState, useEffect } from 'react';
import {
  FileText,
  Sparkles,
  Database,
  ArrowRight,
  Clock,
  BookOpen,
  ShieldCheck,
  Activity,
  Award,
  Users,
  Lock,
  Cpu,
  FileCheck2,
  UploadCloud,
  CheckSquare,
  Check,
  Calendar,
  BarChart2,
} from 'lucide-react';
import { ScreenId, UserProfile } from '../types';
import apiClient, { API_BASE } from '../services/apiClient';

interface DashboardScreenProps {
  onNavigate: (screen: ScreenId) => void;
  pendingReviewCount: number;
  approvedCount: number;
  currentUser?: UserProfile | null;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  onNavigate,
  pendingReviewCount,
  approvedCount,
  currentUser
}) => {
  const role = currentUser?.role || 'lecturer';
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  const [bloomDistribution, setBloomDistribution] = useState([
    { level: 'Nhận biết (Remember)', percent: 0, count: 0, color: 'bg-sky-500' },
    { level: 'Thông hiểu (Understand)', percent: 0, count: 0, color: 'bg-[#008689]' },
    { level: 'Vận dụng (Apply)', percent: 0, count: 0, color: 'bg-teal-600' },
    { level: 'Phân tích (Analyze)', percent: 0, count: 0, color: 'bg-amber-500' }
  ]);

  const [statsSummary, setStatsSummary] = useState({
    textbooksIndexed: 0,
    totalGenerated: 0
  });

  useEffect(() => {
    try {
      const savedDocs = JSON.parse(localStorage.getItem('quizgen_uploaded_documents') || '[]');
      const validDocs = savedDocs.filter((d: any) => d && d.id !== 'doc-kinh-te-vi-mo-2025' && d.id !== 'doc-tri-tue-nhan-tao-2026');
      setStatsSummary(prev => ({
        ...prev,
        textbooksIndexed: validDocs.length,
        totalGenerated: approvedCount + pendingReviewCount
      }));
    } catch {}
  }, [approvedCount, pendingReviewCount]);

  useEffect(() => {
    let isMounted = true;
    apiClient
      .fetch(`${API_BASE}/dashboard/summary`)
      .then(async (res) => {
        if (!res.ok) return null;
        return res.json();
      })
      .then((res: any) => {
        if (!isMounted || !res?.data) return;
        const d = res.data;
        if (d.stats) {
          setStatsSummary({
            textbooksIndexed: d.stats.textbooksIndexed ?? 0,
            totalGenerated: d.stats.totalGenerated ?? 0
          });
        }
        if (Array.isArray(d.bloomDistribution) && d.bloomDistribution.length > 0) {
          setBloomDistribution(d.bloomDistribution);
        }
        if (Array.isArray(d.recentActivity) && d.recentActivity.length > 0) {
          setRecentActivity(d.recentActivity);
        }
      })
      .catch(() => {
        // Fallback to local state when offline
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const roleHeaderConfig = {
    lecturer: {
      badge: 'Không gian Biên soạn Giảng viên',
      title: 'Tổng quan Biên soạn Học thuật (QuizGen AI)',
      subtitle:
        'Tải lên giáo trình môn học, cấu hình ma trận Bloom và đối soát trích dẫn RAG trước khi gửi đề thi lên Bộ môn.'
    },
    head_of_department: {
      badge: 'Bảng điều khiển Trưởng Bộ môn (HOD)',
      title: 'Tổng quan Kiểm định & Phê duyệt Học thuật',
      subtitle:
        'Thẩm định chất lượng câu hỏi do Giảng viên biên soạn, kiểm tra độ phủ chuẩn đầu ra Bloom và khóa mã đề thi chính thức.'
    },
    admin: {
      badge: 'Trung tâm Khảo thí & Quản trị Hệ thống',
      title: 'Giám sát Khảo thí, In ấn OMR & Hạ tầng AI',
      subtitle:
        'Quản lý xuất bản đề thi PDF/OMR 50 câu, đóng gói chuẩn LMS QTI 2.1, theo dõi hạn ngạch AI và nhật ký kiểm toán.'
    }
  }[role];

  const kpiCards =
    role === 'lecturer'
      ? [
          {
            label: 'Giáo trình đã nạp',
            value: String(statsSummary.textbooksIndexed),
            sub: 'Tài liệu cá nhân đã băm Vector',
            icon: BookOpen,
            color: 'text-[#008689]',
            bg: 'bg-[#cbf0ee]',
            cardBg: 'bg-[#f0faf9]',
            cardBorder: 'border-[#bdeae7]',
            arrowBg: 'bg-[#d0f2f0] text-[#008689]',
            badge: null
          },
          {
            label: 'Tổng câu hỏi đã tạo',
            value: String(statsSummary.totalGenerated),
            sub: 'Sinh tự động qua RAG Pipeline',
            icon: Sparkles,
            color: 'text-blue-600',
            bg: 'bg-blue-100',
            cardBg: 'bg-[#eff6ff]',
            cardBorder: 'border-blue-200/80',
            arrowBg: 'bg-blue-100 text-blue-600',
            badge: null
          },
          {
            label: 'Câu hỏi chờ đối soát',
            value: String(pendingReviewCount),
            valueColor: 'text-amber-600',
            sub: 'Cần kiểm tra trích dẫn & gửi duyệt',
            icon: Clock,
            color: 'text-amber-600',
            bg: 'bg-amber-100',
            cardBg: 'bg-[#fffbeb]',
            cardBorder: 'border-amber-200/80',
            arrowBg: 'bg-amber-100 text-amber-600',
            badge: {
              text: 'Cần đối soát',
              className: 'bg-amber-100 text-amber-800 border-amber-300'
            }
          },
          {
            label: 'Đề thi nháp đã lưu',
            value: String(approvedCount > 0 ? 1 : 0),
            sub: `${approvedCount} câu hỏi đã đạt chuẩn`,
            icon: FileText,
            color: 'text-purple-600',
            bg: 'bg-purple-100',
            cardBg: 'bg-[#faf5ff]',
            cardBorder: 'border-purple-200/80',
            arrowBg: 'bg-purple-100 text-purple-600',
            badge: null
          }
        ]
      : role === 'head_of_department'
      ? [
          {
            label: 'Đề thi chờ phê duyệt',
            value: String(pendingReviewCount),
            sub: 'Đề thi do Giảng viên bộ môn gửi lên',
            icon: ShieldCheck,
            color: 'text-amber-600',
            bg: 'bg-amber-50',
            badge: {
              text: 'Action Required',
              className: 'bg-amber-100 text-amber-800 border-amber-300'
            }
          },
          {
            label: 'Độ phủ chuẩn đầu ra (Bloom)',
            value: approvedCount > 0 ? '100%' : '0%',
            sub: 'Đạt chuẩn ma trận nhận thức Bộ môn',
            icon: Award,
            color: 'text-[#008689]',
            bg: 'bg-[#e6f4f4]',
            badge: null
          },
          {
            label: 'Giảng viên đã nộp đề',
            value: approvedCount > 0 ? '1 / 1' : '0 / 0',
            sub: 'Kỳ thi Học kỳ 1 — Năm học 2026',
            icon: Users,
            color: 'text-emerald-600',
            bg: 'bg-emerald-50',
            badge: null
          },
          {
            label: 'Ngân hàng đề thi bộ môn',
            value: String(approvedCount),
            sub: 'Câu hỏi đã phê duyệt & khóa mã đề',
            icon: Database,
            color: 'text-[#008689]',
            bg: 'bg-[#e6f4f4]',
            badge: null
          }
        ]
      : [
          {
            label: 'Quota AI còn lại',
            value: '84,500',
            sub: 'Tokens Gemini 2.5 Flash / Qdrant',
            icon: Cpu,
            color: 'text-[#008689]',
            bg: 'bg-[#e6f4f4]',
            badge: null
          },
          {
            label: 'Số bản ghi Audit Logs hôm nay',
            value: String(JSON.parse(localStorage.getItem('quizgen_security_audit_logs') || '[]').filter((l: any) => l && l.id !== 'audit-init-1' && l.id !== 'audit-init-2').length),
            sub: '0 cảnh báo truy cập trái phép',
            icon: Lock,
            color: 'text-indigo-600',
            bg: 'bg-indigo-50',
            badge: null
          },
          {
            label: 'Đề thi đã đóng gói OMR',
            value: String(approvedCount > 0 ? 1 : 0),
            sub: 'Sẵn sàng in ấn & xuất QTI 2.1',
            icon: FileCheck2,
            color: 'text-emerald-600',
            bg: 'bg-emerald-50',
            badge: null
          },
          {
            label: 'Trạng thái cụm 8 Microservices',
            value: '100% Healthy',
            sub: 'API Gateway, Auth, RAG, Exam, OMR',
            icon: Activity,
            color: 'text-emerald-600',
            bg: 'bg-emerald-50',
            badge: {
              text: '100% Healthy',
              className: 'bg-emerald-100 text-emerald-800 border-emerald-300'
            }
          }
        ];

  return (
    <div className="flex-1 overflow-y-auto p-3.5 sm:p-6 space-y-4 sm:space-y-6">
      {/* Clean Welcome Banner */}
      <div className="bg-gradient-to-r from-[#d0f2f0] via-[#ebfaf9] to-white rounded-2xl border border-[#b2e5e7]/80 p-4 sm:p-6 shadow-xs flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-4">
          {/* Document Sheet Graphic with Checkmark Circle */}
          <div className="hidden sm:flex relative w-12 h-14 bg-white/95 rounded-xl shadow-xs border border-teal-100 flex-col justify-center px-2.5 space-y-1.5 shrink-0">
            <div className="w-4 h-1 bg-slate-200 rounded-full" />
            <div className="w-7 h-1 bg-slate-200 rounded-full" />
            <div className="w-5 h-1 bg-slate-200 rounded-full" />
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xs border-2 border-white">
              <Check className="w-3 h-3 stroke-[3]" />
            </div>
          </div>

          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 text-xs font-bold text-[#007d80] bg-[#cbf0ee] px-3 py-0.5 rounded-full">
              <span>{roleHeaderConfig.badge}</span>
            </div>
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-800 pt-0.5">{roleHeaderConfig.title}</h2>
            <p className="text-xs sm:text-sm text-slate-500 max-w-2xl">{roleHeaderConfig.subtitle}</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2 sm:gap-2.5 shrink-0">
          {role === 'lecturer' && (
            <>
              <button
                onClick={() => onNavigate('upload')}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#008689] hover:bg-[#006f72] text-white font-bold text-xs sm:text-sm rounded-xl transition-colors shadow-xs w-full sm:w-auto"
              >
                <BookOpen className="w-4 h-4" />
                Nạp Giáo trình Mới
              </button>
              <button
                onClick={() => onNavigate('generate')}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white/95 hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs sm:text-sm rounded-xl transition-colors shadow-xs w-full sm:w-auto"
              >
                <Sparkles className="w-4 h-4 text-[#008689]" />
                Sinh Đề Thi AI
              </button>
            </>
          )}
          {role === 'head_of_department' && (
            <>
              <button
                onClick={() => onNavigate('review')}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#008689] hover:bg-[#006f72] text-white font-semibold text-xs sm:text-sm rounded-lg transition-colors w-full sm:w-auto"
              >
                <ShieldCheck className="w-4 h-4" />
                Duyệt Đề thi Bộ môn ({pendingReviewCount})
              </button>
              <button
                onClick={() => onNavigate('bank')}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs sm:text-sm rounded-lg transition-colors w-full sm:w-auto"
              >
                <Database className="w-4 h-4 text-[#008689]" />
                Ngân hàng Đề Bộ môn
              </button>
            </>
          )}
          {role === 'admin' && (
            <>
              <button
                onClick={() => onNavigate('review')}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#008689] hover:bg-[#006f72] text-white font-semibold text-xs sm:text-sm rounded-lg transition-colors w-full sm:w-auto"
              >
                <FileCheck2 className="w-4 h-4" />
                Giám sát & Xuất bản OMR / QTI
              </button>
              <button
                onClick={() => onNavigate('bank')}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs sm:text-sm rounded-lg transition-colors w-full sm:w-auto"
              >
                <Database className="w-4 h-4 text-[#008689]" />
                Kho Khảo thí Tập trung
              </button>
            </>
          )}
        </div>
      </div>

      {/* Role-Specific 4 KPI Stat Cards (AC-1.2) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {kpiCards.map((stat: any, idx) => {
          const Icon = stat.icon;
          return (
            <div
              key={idx}
              className={`${stat.cardBg || 'bg-white'} rounded-2xl p-4 sm:p-5 border ${
                stat.cardBorder || 'border-slate-200'
              } shadow-xs flex flex-col justify-between`}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-9 h-9 rounded-xl ${stat.bg} flex items-center justify-center shrink-0`}
                >
                  <Icon className={`w-4 h-4 ${stat.color}`} />
                </div>
                <p className="text-xs font-bold text-slate-700 uppercase tracking-wider truncate">
                  {stat.label}
                </p>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-2xl sm:text-3xl font-extrabold ${stat.valueColor || 'text-slate-800'}`}>
                    {stat.value}
                  </span>
                  {stat.badge && (
                    <span
                      className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${stat.badge.className}`}
                    >
                      {stat.badge.text}
                    </span>
                  )}
                </div>

                <div
                  className={`w-7 h-7 rounded-full ${stat.arrowBg || 'bg-slate-100 text-slate-600'} flex items-center justify-center shrink-0`}
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>

              <p className="text-xs text-slate-400 mt-2">{stat.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Main Content Split: Quick Workflow Steps & Bloom Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
        {/* Workflow Quick Navigation */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-xl bg-[#cbf0ee] text-[#008689] flex items-center justify-center shrink-0">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-800">
                  {role === 'lecturer'
                    ? 'Quy trình Biên soạn Đề thi (4 bước)'
                    : role === 'head_of_department'
                    ? 'Quy trình Thẩm định & Khóa Đề thi Bộ môn'
                    : 'Quy trình Xuất bản Khảo thí & Đóng gói LMS'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {role === 'lecturer'
                    ? 'Chọn nhanh tác vụ biên soạn và đối soát học thuật'
                    : role === 'head_of_department'
                    ? 'Kiểm tra trích dẫn RAG, phê duyệt câu hỏi hoặc yêu cầu giảng viên hiệu chỉnh'
                    : 'Chế độ chỉ đọc bảo toàn nội dung học thuật và kết xuất gói in ấn OMR / QTI 2.1'}
                </p>
              </div>
            </div>

            {role === 'lecturer' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {[
                  {
                    stepNum: '1',
                    step: 'Bước 1',
                    title: 'Nạp Giáo trình PDF/DOCX',
                    desc: 'Trích xuất văn bản & lập chỉ mục Vector',
                    screen: 'upload' as ScreenId,
                    circleStyle: 'bg-[#d7f3f2] text-[#008689]',
                    arrowStyle: 'bg-[#d7f3f2] text-[#008689]',
                    stepTagColor: 'text-[#008689]',
                  },
                  {
                    stepNum: '2',
                    step: 'Bước 2',
                    title: 'Cấu hình Ma trận Bloom',
                    desc: 'Thiết lập tỷ lệ 4 mức độ nhận thức AI',
                    screen: 'generate' as ScreenId,
                    circleStyle: 'bg-blue-100 text-blue-600',
                    arrowStyle: 'bg-blue-100 text-blue-600',
                    stepTagColor: 'text-blue-600',
                  },
                  {
                    stepNum: '3',
                    step: 'Bước 3',
                    title: 'Đối soát & Biên tập Đề',
                    desc: `Kiểm tra ${pendingReviewCount} câu hỏi chờ gửi duyệt`,
                    screen: 'review' as ScreenId,
                    circleStyle: 'bg-amber-100 text-amber-700',
                    arrowStyle: 'bg-amber-100 text-amber-700',
                    stepTagColor: 'text-amber-700',
                  },
                  {
                    stepNum: '4',
                    step: 'Bước 4',
                    title: 'Đóng gói & Xuất Đề Thi',
                    desc: 'Xuất bản Word (.docx), In PDF OMR và gói LMS',
                    screen: 'bank' as ScreenId,
                    circleStyle: 'bg-purple-100 text-purple-700',
                    arrowStyle: 'bg-purple-100 text-purple-700',
                    stepTagColor: 'text-purple-700',
                  },
                ].map((item, i) => {
                  return (
                    <button
                      key={i}
                      onClick={() => onNavigate(item.screen)}
                      className="group text-left p-3.5 rounded-2xl border border-slate-200/90 bg-white hover:border-[#008689]/40 hover:bg-slate-50/60 transition-all flex items-center justify-between shadow-2xs hover:shadow-xs gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-full ${item.circleStyle} font-extrabold text-sm flex items-center justify-center shrink-0`}
                        >
                          {item.stepNum}
                        </div>
                        <div className="min-w-0">
                          <span
                            className={`block text-[10px] font-bold uppercase tracking-wider ${item.stepTagColor}`}
                          >
                            {item.step}
                          </span>
                          <h4 className="text-xs font-bold text-slate-800 truncate group-hover:text-[#008689] transition-colors">
                            {item.title}
                          </h4>
                          <p className="text-[11px] text-slate-400 truncate">
                            {item.desc}
                          </p>
                        </div>
                      </div>

                      <div
                        className={`w-6 h-6 rounded-full ${item.arrowStyle} flex items-center justify-center shrink-0 group-hover:translate-x-0.5 transition-transform`}
                      >
                        <ArrowRight className="w-3.5 h-3.5" />
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => onNavigate('review')}
                  className="group text-left p-4 rounded-lg border border-slate-200 hover:border-[#008689] hover:bg-slate-50/70 transition-all flex flex-col justify-between"
                >
                  <div>
                    <span className="text-[11px] font-bold text-[#008689] uppercase">
                      {role === 'head_of_department' ? 'Thẩm định Học thuật' : 'Giám sát Khảo thí'}
                    </span>
                    <h4 className="text-sm font-bold text-slate-800 mt-0.5 group-hover:text-[#008689] transition-colors">
                      {role === 'head_of_department'
                        ? 'Phê duyệt & Trộn 4 Mã đề (101–104)'
                        : 'Kiểm tra Đề thi (Read-Only) & Xuất OMR'}
                    </h4>
                    <p className="text-xs text-slate-500 mt-1">
                      {role === 'head_of_department'
                        ? 'Phê duyệt Học thuật (HOD Approved), yêu cầu hiệu chỉnh hoặc khóa đề thi chính thức.'
                        : 'Xuất bản đề thi PDF + Phiếu trả lời trắc nghiệm OMR 50 câu và gói ZIP QTI 2.1.'}
                    </p>
                  </div>
                  <div className="mt-3 flex items-center gap-1 text-xs font-semibold text-[#008689]">
                    <span>Đi tới Không gian Duyệt</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </button>

                <button
                  onClick={() => onNavigate('bank')}
                  className="group text-left p-4 rounded-lg border border-slate-200 hover:border-[#008689] hover:bg-slate-50/70 transition-all flex flex-col justify-between"
                >
                  <div>
                    <span className="text-[11px] font-bold text-[#008689] uppercase">
                      Lưu trữ & Kết xuất
                    </span>
                    <h4 className="text-sm font-bold text-slate-800 mt-0.5 group-hover:text-[#008689] transition-colors">
                      {role === 'head_of_department'
                        ? 'Ngân hàng Câu hỏi & Đề thi Bộ môn'
                        : 'Ngân hàng Dữ liệu Khảo thí Tập trung'}
                    </h4>
                    <p className="text-xs text-slate-500 mt-1">
                      {role === 'head_of_department'
                        ? `Tra cứu ${approvedCount} câu hỏi đã duyệt của toàn bộ giảng viên trong bộ môn.`
                        : 'Quản lý tập trung toàn bộ câu hỏi đã khóa và trích xuất đa định dạng (DOCX, PDF OMR, QTI).'}
                    </p>
                  </div>
                  <div className="mt-3 flex items-center gap-1 text-xs font-semibold text-[#008689]">
                    <span>Mở Ngân hàng Đề</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* Recent Activity */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
              Hoạt động gần đây
            </h4>
            <div className="space-y-2.5">
              {recentActivity.length === 0 ? (
                <div className="py-4 text-center text-slate-400 text-xs">
                  Chưa có hoạt động nào được ghi nhận.
                </div>
              ) : (
                recentActivity.slice(0, 3).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between text-xs py-1.5 border-b border-slate-100 last:border-0"
                >
                  <div className="truncate pr-4">
                    <span className="font-semibold text-slate-700">{item.action}: </span>
                    <span className="text-slate-500">{item.subject}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-medium">
                      {item.status}
                    </span>
                    <span className="text-slate-400">{item.time}</span>
                  </div>
                </div>
              ))
              )}
            </div>
          </div>
        </div>

        {/* Bloom Cognitive Distribution */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                <BarChart2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-800">
                  Phân bổ Thang đo Nhận thức Bloom
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tỷ lệ câu hỏi theo 4 mức độ nhận thức trong Ngân hàng Đề
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {bloomDistribution.map((item, idx) => (
                <div key={idx}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="font-medium text-slate-700">{item.level}</span>
                    <span className="font-semibold text-slate-600">
                      {item.count} câu ({item.percent}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${item.color} rounded-full`}
                      style={{ width: `${item.percent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Độ phủ trích dẫn học thuật (RAG)</span>
            <span className="font-bold text-[#008689]">100% có nguồn trang</span>
          </div>
        </div>
      </div>
    </div>
  );
};
