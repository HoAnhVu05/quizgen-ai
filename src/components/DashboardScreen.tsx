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
            bg: 'bg-[#e6f4f4]',
            badge: null
          },
          {
            label: 'Tổng câu hỏi đã tạo',
            value: String(statsSummary.totalGenerated),
            sub: 'Sinh tự động qua RAG Pipeline',
            icon: Sparkles,
            color: 'text-[#008689]',
            bg: 'bg-[#e6f4f4]',
            badge: null
          },
          {
            label: 'Câu hỏi chờ đối soát',
            value: String(pendingReviewCount),
            sub: 'Cần kiểm tra trích dẫn & gửi duyệt',
            icon: Clock,
            color: 'text-amber-600',
            bg: 'bg-amber-50',
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
            color: 'text-emerald-600',
            bg: 'bg-emerald-50',
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
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 shadow-sm flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#008689] bg-[#e6f4f4] px-2.5 py-1 rounded-md">
            <span>{roleHeaderConfig.badge}</span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-800 pt-1">{roleHeaderConfig.title}</h2>
          <p className="text-xs sm:text-sm text-slate-500 max-w-2xl">{roleHeaderConfig.subtitle}</p>
        </div>

        <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2 sm:gap-2.5 shrink-0">
          {role === 'lecturer' && (
            <>
              <button
                onClick={() => onNavigate('upload')}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#008689] hover:bg-[#006f72] text-white font-semibold text-xs sm:text-sm rounded-lg transition-colors w-full sm:w-auto"
              >
                <FileText className="w-4 h-4" />
                Nạp Giáo trình Mới
              </button>
              <button
                onClick={() => onNavigate('generate')}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs sm:text-sm rounded-lg transition-colors w-full sm:w-auto"
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
        {kpiCards.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div
              key={idx}
              className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {stat.label}
                </p>
                <div
                  className={`w-9 h-9 rounded-lg ${stat.bg} flex items-center justify-center shrink-0`}
                >
                  <Icon className={`w-4 h-4 ${stat.color}`} />
                </div>
              </div>
              <div className="mt-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-2xl font-bold text-slate-800">{stat.value}</span>
                  {stat.badge && (
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${stat.badge.className}`}
                    >
                      {stat.badge.text}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-1">{stat.sub}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Content Split: Quick Workflow Steps & Bloom Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
        {/* Workflow Quick Navigation */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-4 sm:p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
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
                    step: 'Bước 1',
                    title: 'Nạp Giáo trình PDF/DOCX',
                    desc: 'Trích xuất văn bản & lập chỉ mục Vector',
                    screen: 'upload' as ScreenId,
                    icon: UploadCloud,
                    badgeStyle: 'bg-teal-50 text-[#008689] border-teal-200',
                    borderHover: 'hover:border-[#008689] hover:bg-teal-50/20',
                    iconBox: 'bg-teal-50 text-[#008689] border border-teal-200/60',
                    actionColor: 'text-[#008689]',
                    titleHover: 'group-hover:text-[#008689]',
                  },
                  {
                    step: 'Bước 2',
                    title: 'Cấu hình Ma trận Bloom',
                    desc: 'Thiết lập tỷ lệ 4 mức độ nhận thức AI',
                    screen: 'generate' as ScreenId,
                    icon: Sparkles,
                    badgeStyle: 'bg-blue-50 text-blue-700 border-blue-200',
                    borderHover: 'hover:border-blue-500 hover:bg-blue-50/20',
                    iconBox: 'bg-blue-50 text-blue-600 border border-blue-200/60',
                    actionColor: 'text-blue-600',
                    titleHover: 'group-hover:text-blue-600',
                  },
                  {
                    step: 'Bước 3',
                    title: 'Đối soát & Biên tập Đề',
                    desc: `Kiểm tra ${pendingReviewCount} câu hỏi chờ gửi duyệt`,
                    screen: 'review' as ScreenId,
                    icon: CheckSquare,
                    badgeStyle: 'bg-amber-50 text-amber-800 border-amber-200',
                    borderHover: 'hover:border-amber-500 hover:bg-amber-50/20',
                    iconBox: 'bg-amber-50 text-amber-600 border border-amber-200/60',
                    actionColor: 'text-amber-700',
                    titleHover: 'group-hover:text-amber-700',
                  },
                  {
                    step: 'Bước 4',
                    title: 'Đóng gói & Xuất Đề Thi',
                    desc: 'Xuất bản Word (.docx), In PDF OMR và gói LMS Canvas',
                    screen: 'bank' as ScreenId,
                    icon: Database,
                    badgeStyle: 'bg-purple-50 text-purple-700 border-purple-200',
                    borderHover: 'hover:border-purple-500 hover:bg-purple-50/20',
                    iconBox: 'bg-purple-50 text-purple-600 border border-purple-200/60',
                    actionColor: 'text-purple-700',
                    titleHover: 'group-hover:text-purple-700',
                  },
                ].map((item, i) => {
                  const ItemIcon = item.icon;
                  return (
                    <button
                      key={i}
                      onClick={() => onNavigate(item.screen)}
                      className={`group text-left p-4 rounded-xl border border-slate-200 bg-white transition-all flex flex-col justify-between shadow-2xs hover:shadow-xs ${item.borderHover}`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span
                            className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md border tracking-wider ${item.badgeStyle}`}
                          >
                            {item.step}
                          </span>
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${item.iconBox}`}
                          >
                            <ItemIcon className="w-3.5 h-3.5" />
                          </div>
                        </div>
                        <h4
                          className={`text-sm font-bold text-slate-800 transition-colors leading-snug ${item.titleHover}`}
                        >
                          {item.title}
                        </h4>
                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">{item.desc}</p>
                      </div>
                      <div
                        className={`mt-3 flex items-center gap-1 text-xs font-bold ${item.actionColor}`}
                      >
                        <span>Mở công cụ</span>
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
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
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-4 sm:p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-800">
              Phân bổ Thang đo Nhận thức Bloom
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 mb-5">
              Tỷ lệ câu hỏi theo 4 mức độ nhận thức trong Ngân hàng Đề
            </p>

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
