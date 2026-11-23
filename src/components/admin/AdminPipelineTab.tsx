import React, { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Clock,
  Cpu,
  Eye,
  FileText,
  RefreshCw,
  RotateCcw,
  Search,
  Sparkles,
  Terminal,
  X,
  Zap,
} from 'lucide-react';

export interface AdminPipelineTabProps {
  pipelineTasks: any[];
  pipelineSummary: any;
  isLoadingPipelines: boolean;
  fetchLivePipelines: (silent?: boolean) => Promise<void>;
  handleRetryPipeline: (task: any) => Promise<void>;
  handleCancelPipeline: (task: any) => Promise<void>;
  isRetryingTaskId: string | null;
  isCancelingTaskId: string | null;
}

export const AdminPipelineTab: React.FC<AdminPipelineTabProps> = ({
  pipelineTasks,
  pipelineSummary,
  isLoadingPipelines,
  fetchLivePipelines,
  handleRetryPipeline,
  handleCancelPipeline,
  isRetryingTaskId,
  isCancelingTaskId,
}) => {
  const [pipelineSearchQuery, setPipelineSearchQuery] = useState('');
  const [pipelineFilterType, setPipelineFilterType] = useState<'all' | 'document' | 'exam'>('all');
  const [pipelineFilterStatus, setPipelineFilterStatus] = useState<'all' | 'running' | 'ready' | 'error' | 'stalled'>('all');
  const [selectedTaskForLog, setSelectedTaskForLog] = useState<any | null>(null);

        const filteredTasks = pipelineTasks.filter((t) => {
          const matchSearch =
            t.title.toLowerCase().includes(pipelineSearchQuery.toLowerCase()) ||
            t.userName.toLowerCase().includes(pipelineSearchQuery.toLowerCase()) ||
            t.userEmail.toLowerCase().includes(pipelineSearchQuery.toLowerCase()) ||
            t.id.toLowerCase().includes(pipelineSearchQuery.toLowerCase());

          const matchType =
            pipelineFilterType === 'all' || t.type === pipelineFilterType;

          const matchStatus =
            pipelineFilterStatus === 'all' ||
            (pipelineFilterStatus === 'running' && (t.status === 'extracting' || t.status === 'embedding' || t.status === 'uploading' || t.status === 'generating')) ||
            (pipelineFilterStatus === 'ready' && t.status === 'ready') ||
            (pipelineFilterStatus === 'error' && t.status === 'error') ||
            (pipelineFilterStatus === 'stalled' && t.isStalled);

          return matchSearch && matchType && matchStatus;
        });

        return (
          <div className="space-y-5 sm:space-y-6">
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-[#004e54] via-[#00696f] to-[#008689] rounded-[24px] p-6 sm:p-7 text-white shadow-lg relative overflow-hidden flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="space-y-2 z-10 max-w-2xl">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-400/20 text-emerald-300 border border-emerald-400/40 backdrop-blur-md">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                    LIVE PULSE STREAM (2s)
                  </span>
                  <span className="text-teal-200 text-xs font-mono">• Đa luồng CPU (ONNX Hardware Accelerated)</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
                  <Zap className="w-6 h-6 text-amber-300 animate-pulse" />
                  Trung Tâm Điều Hành & Giám Sát Tiến Trình Tác Vụ
                </h2>
                <p className="text-xs sm:text-sm text-teal-100/90 leading-relaxed">
                  Theo dõi thời gian thực tốc độ bóc tách giáo trình, lập chỉ mục vector tri thức RAG và hiệu năng AI sinh câu hỏi của toàn bộ giảng viên trong trường.
                </p>
              </div>

              <div className="flex items-center gap-3 z-10">
                <button
                  onClick={() => void fetchLivePipelines(false)}
                  disabled={isLoadingPipelines}
                  className="px-4 py-2.5 bg-white/10 hover:bg-white/20 active:bg-white/30 text-white rounded-xl text-xs font-bold border border-white/20 backdrop-blur-md transition-all flex items-center gap-2 cursor-pointer shadow-xs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingPipelines ? 'animate-spin' : ''}`} />
                  <span>Làm mới tức thì</span>
                </button>
              </div>

              {/* Background Glow */}
              <div className="absolute -right-16 -top-16 w-64 h-64 bg-teal-400/20 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute right-48 -bottom-20 w-80 h-80 bg-emerald-400/15 rounded-full blur-3xl pointer-events-none" />
            </div>

            {/* Performance Velocity KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tác Vụ Đang Xử Lý</span>
                  <div className="w-8 h-8 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center">
                    <Activity className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-slate-900 tracking-tight">
                  {pipelineSummary?.activePipelines ?? 0}
                </div>
                <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5">
                  <span className="inline-block w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
                  Bóc tách văn bản & Vector hóa RAG
                </div>
              </div>

              <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tốc Độ Bóc Tách TB</span>
                  <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                    <Zap className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-amber-600 tracking-tight">
                  {pipelineSummary?.avgParsingVelocity || '285 trang/s'}
                </div>
                <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                  <span>⚡ PyMuPDF C-Engine đa lõi</span>
                </div>
              </div>

              <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tốc Độ Nhúng Vector</span>
                  <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                    <Cpu className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-purple-600 tracking-tight">
                  {pipelineSummary?.avgEmbeddingVelocity || '32 chunks/s'}
                </div>
                <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1 truncate" title={pipelineSummary?.hardwareAcceleration || 'ONNX Hardware Acceleration'}>
                  <span>{pipelineSummary?.hardwareAcceleration || 'ONNX Multi-Core'}</span>
                </div>
              </div>

              <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Cảnh Báo & Sự Cố</span>
                  <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-rose-600 tracking-tight">
                  {pipelineSummary?.stalledOrErrors ?? 0}
                </div>
                <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                  <span>Tác vụ chậm (&gt; 75s) hoặc gián đoạn</span>
                </div>
              </div>
            </div>

            {/* Controls & Filter Bar */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={pipelineSearchQuery}
                  onChange={(e) => setPipelineSearchQuery(e.target.value)}
                  placeholder="Tìm theo tên giảng viên, email hoặc tài liệu..."
                  className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-[#008689] text-slate-800 placeholder-slate-400"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={pipelineFilterType}
                  onChange={(e) => setPipelineFilterType(e.target.value as any)}
                  className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-semibold focus:outline-none focus:border-[#008689] cursor-pointer"
                >
                  <option value="all">Tất cả loại tác vụ</option>
                  <option value="document">📄 Nạp Giáo Trình</option>
                  <option value="exam">🤖 Sinh Đề Thi AI</option>
                </select>

                <select
                  value={pipelineFilterStatus}
                  onChange={(e) => setPipelineFilterStatus(e.target.value as any)}
                  className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-semibold focus:outline-none focus:border-[#008689] cursor-pointer"
                >
                  <option value="all">Tất cả trạng thái</option>
                  <option value="running">⚡ Đang xử lý</option>
                  <option value="ready">🟢 Hoàn tất (Ready)</option>
                  <option value="stalled">⚠️ Chậm / Nghẽn (&gt;75s)</option>
                  <option value="error">🔴 Gặp sự cố</option>
                </select>
              </div>
            </div>

            {/* Task Matrix Table */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <h3 className="font-bold text-slate-900 text-sm">
                    Ma Trận Tác Vụ Thời Gian Thực ({filteredTasks.length})
                  </h3>
                  <span className="text-[11px] text-slate-400 font-mono">• Tự động làm mới mỗi 2 giây</span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold text-[11px] uppercase tracking-wider">
                      <th className="py-3 px-5">Giảng viên</th>
                      <th className="py-3 px-5">Tác vụ & Đối tượng</th>
                      <th className="py-3 px-5">Giai đoạn & Tiến độ</th>
                      <th className="py-3 px-4">Thời gian</th>
                      <th className="py-3 px-5">Chẩn đoán kỹ thuật</th>
                      <th className="py-3 px-5 text-right">Can thiệp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {filteredTasks.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-400">
                          Không có tác vụ nào phù hợp với bộ lọc hiện tại.
                        </td>
                      </tr>
                    ) : (
                      filteredTasks.map((t) => {
                        const isRunning = t.status === 'extracting' || t.status === 'embedding' || t.status === 'uploading' || t.status === 'generating';
                        const isErr = t.status === 'error';
                        const isReady = t.status === 'ready';

                        return (
                          <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                            {/* User Column */}
                            <td className="py-3.5 px-5">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-teal-500 to-cyan-500 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-2xs">
                                  {t.userName.charAt(0)}
                                </div>
                                <div className="min-w-0">
                                  <div className="font-bold text-slate-900 truncate">{t.userName}</div>
                                  <div className="text-[10px] text-slate-400 truncate">{t.userEmail}</div>
                                  <div className="text-[9px] text-[#008689] font-medium mt-0.5">{t.userDept}</div>
                                </div>
                              </div>
                            </td>

                            {/* Task Column */}
                            <td className="py-3.5 px-5">
                              <div className="flex items-start gap-2.5">
                                {t.type === 'document' ? (
                                  <FileText className="w-4 h-4 text-[#008689] shrink-0 mt-0.5" />
                                ) : (
                                  <Sparkles className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                                )}
                                <div>
                                  <div className="font-bold text-slate-900 truncate max-w-xs" title={t.title}>
                                    {t.title}
                                  </div>
                                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                                    {t.totalPages ? `${t.totalPages} trang` : ''} {t.chaptersCount ? `· ${t.chaptersCount} chương` : ''} ({t.fileSize})
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Progress & Micro-stage Column */}
                            <td className="py-3.5 px-5 min-w-[200px]">
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between text-[11px]">
                                  <span className="font-bold text-slate-800">{t.progress}%</span>
                                  <span className={`text-[10px] font-semibold ${
                                    isErr ? 'text-rose-600' : isReady ? 'text-emerald-600' : 'text-cyan-700'
                                  }`}>
                                    {isReady ? 'Sẵn sàng 100%' : isErr ? 'Bị gián đoạn' : 'Đang xử lý'}
                                  </span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all duration-300 ${
                                      isErr
                                        ? 'bg-rose-500'
                                        : isReady
                                        ? 'bg-emerald-500'
                                        : 'bg-gradient-to-r from-teal-500 via-cyan-500 to-emerald-400 animate-pulse'
                                    }`}
                                    style={{ width: `${Math.min(100, Math.max(5, t.progress))}%` }}
                                  />
                                </div>
                                <div className="text-[10px] text-slate-500 truncate" title={t.stage}>
                                  {t.stage}
                                </div>
                              </div>
                            </td>

                            {/* Elapsed Time Column */}
                            <td className="py-3.5 px-4 font-mono text-[11px]">
                              <div className="flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-slate-400" />
                                <span className={`font-bold ${
                                  t.isStalled
                                    ? 'text-rose-600 animate-pulse'
                                    : t.elapsedSeconds > 45
                                    ? 'text-amber-600'
                                    : 'text-slate-700'
                                }`}>
                                  {t.elapsedSeconds}s
                                </span>
                              </div>
                              {t.isStalled && (
                                <span className="inline-block mt-1 text-[9px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                                  ⚠️ Chậm &gt; 75s
                                </span>
                              )}
                            </td>

                            {/* Diagnostic Column */}
                            <td className="py-3.5 px-5">
                              <div className="text-[11px] font-medium text-slate-700">
                                {t.diagnosticNote}
                              </div>
                              {t.errorMessage && (
                                <div className="text-[10px] text-rose-600 font-mono truncate max-w-xs mt-0.5" title={t.errorMessage}>
                                  {t.errorMessage}
                                </div>
                              )}
                            </td>

                            {/* Actions Column */}
                            <td className="py-3.5 px-5 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => setSelectedTaskForLog(t)}
                                  className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                                  title="Soi Log chi tiết & Stack Trace"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>

                                {t.type === 'document' && (
                                  <>
                                    <button
                                      onClick={() => void handleRetryPipeline(t)}
                                      disabled={isRetryingTaskId === t.id}
                                      className="p-1.5 text-[#008689] hover:bg-teal-50 rounded-lg text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                                      title="Chạy lại pipeline cho tài liệu này"
                                    >
                                      <RotateCcw className={`w-4 h-4 ${isRetryingTaskId === t.id ? 'animate-spin' : ''}`} />
                                    </button>

                                    {isRunning && (
                                      <button
                                        onClick={() => void handleCancelPipeline(t)}
                                        disabled={isCancelingTaskId === t.id}
                                        className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                                        title="Hủy tác vụ để giải phóng CPU/RAM"
                                      >
                                        <X className="w-4 h-4" />
                                      </button>
                                    )}
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Diagnostic Log Modal */}
            {selectedTaskForLog && (
              <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[85vh] overflow-y-auto">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <Terminal className="w-5 h-5 text-[#008689]" />
                      <h4 className="font-bold text-slate-900 text-sm">
                        Nhật Ký Chẩn Đoán Kỹ Thuật (Task Inspector)
                      </h4>
                    </div>
                    <button
                      onClick={() => setSelectedTaskForLog(null)}
                      className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div>
                      <span className="text-slate-400 font-semibold">Mã tác vụ:</span>{' '}
                      <span className="font-mono font-bold text-slate-800">{selectedTaskForLog.id}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-semibold">Tài khoản:</span>{' '}
                      <span className="font-bold text-slate-800">{selectedTaskForLog.userName} ({selectedTaskForLog.userEmail})</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-semibold">Tên tài liệu / Tác vụ:</span>{' '}
                      <span className="font-bold text-slate-800">{selectedTaskForLog.title}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-semibold">Quy mô:</span>{' '}
                      <span className="font-mono text-slate-800">{selectedTaskForLog.totalPages || 0} trang · {selectedTaskForLog.chaptersCount || 0} chương</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-semibold">Trạng thái:</span>{' '}
                      <span className="font-bold text-[#008689] uppercase">{selectedTaskForLog.status} ({selectedTaskForLog.progress}%)</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-semibold">Thời gian chạy:</span>{' '}
                      <span className="font-bold text-slate-800">{selectedTaskForLog.elapsedSeconds}s</span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Chẩn đoán hệ thống:</label>
                    <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl text-xs text-teal-800 font-medium">
                      {selectedTaskForLog.diagnosticNote}
                    </div>
                  </div>

                  {selectedTaskForLog.errorMessage && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-rose-700">Chi tiết ngoại lệ (Stack Trace):</label>
                      <pre className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-[11px] text-rose-900 font-mono whitespace-pre-wrap overflow-x-auto max-h-48">
                        {selectedTaskForLog.errorMessage}
                      </pre>
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                    {selectedTaskForLog.type === 'document' && (
                      <button
                        onClick={() => {
                          const t = selectedTaskForLog;
                          setSelectedTaskForLog(null);
                          void handleRetryPipeline(t);
                        }}
                        className="px-4 py-2 bg-[#008689] hover:bg-[#007073] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Chạy Lại Tác Vụ Này</span>
                      </button>
                    )}
                    <button
                      onClick={() => setSelectedTaskForLog(null)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
                    >
                      Đóng
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
;
};
