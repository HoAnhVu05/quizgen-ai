import React, { useState } from 'react';
import { RefreshCw, Terminal } from 'lucide-react';
import { SecurityAuditLog } from '../../types';
import { formatVietnameseDateTime } from '../../utils/dateUtils';

export interface AdminAuditTabProps {
  auditLogs: SecurityAuditLog[];
  isLoading: boolean;
  loadAllRealData: () => void;
}

export const AdminAuditTab: React.FC<AdminAuditTabProps> = ({
  auditLogs,
  isLoading,
  loadAllRealData,
}) => {
  const [auditSeverityFilter, setAuditSeverityFilter] = useState<'all' | 'critical' | 'warning' | 'info'>('all');

  const filteredAuditLogs = auditLogs.filter((l) => {
    if (auditSeverityFilter === 'all') return true;
    return l.severity === auditSeverityFilter;
  });

  return (
        <div className="space-y-4">
          {/* Audit Header Banner */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Terminal className="w-5 h-5 text-[#da1c2d]" />
                <span>Nhật Ký An Ninh &amp; Kiểm Toán Hệ Thống (admin.db)</span>
              </h3>
              <p className="text-xs text-slate-500 max-w-3xl leading-relaxed">
                Ghi nhận chi tiết mọi hành vi quản trị, thay đổi phân quyền, đăng nhập, khóa tài khoản và thao tác xuất đề thi để phục vụ thanh tra an toàn thông tin.
              </p>
            </div>
            <div className="flex items-center gap-2.5 shrink-0">
              <button
                onClick={loadAllRealData}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-[#008689] ${isLoading ? 'animate-spin' : ''}`} />
                <span>Tải lại log</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-semibold">Lọc theo mức độ:</span>
              {(['all', 'critical', 'warning', 'info'] as const).map((sev) => (
                <button
                  key={sev}
                  onClick={() => setAuditSeverityFilter(sev)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold uppercase transition-all ${
                    auditSeverityFilter === sev
                      ? sev === 'critical'
                        ? 'bg-rose-50 text-[#da1c2d] border border-rose-200'
                        : sev === 'warning'
                        ? 'bg-amber-50 text-amber-800 border border-amber-200'
                        : 'bg-[#008689] text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {sev}
                </button>
              ))}
            </div>

            <div className="text-xs text-slate-500">
              Tổng số: <strong className="text-slate-800">{filteredAuditLogs.length}</strong> sự kiện an ninh từ CSDL admin.db
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-[11px] text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Thời Gian</th>
                    <th className="py-3 px-4">Mức Độ</th>
                    <th className="py-3 px-4">Hành Vi (Action)</th>
                    <th className="py-3 px-4">Đối Tượng (Actor)</th>
                    <th className="py-3 px-4">Chi Tiết Sự Kiện</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-normal">
                  {filteredAuditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        Không có nhật ký kiểm toán nào.
                      </td>
                    </tr>
                  ) : (
                    filteredAuditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                          {formatVietnameseDateTime(log.timestamp)}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              log.severity === 'critical'
                                ? 'bg-rose-50 text-[#da1c2d] border border-rose-200'
                                : log.severity === 'warning'
                                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}
                          >
                            {log.severity}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-800">
                          {log.action}
                        </td>
                        <td className="py-3 px-4 text-slate-600">{log.actorEmail}</td>
                        <td className="py-3 px-4 text-slate-500 max-w-md">{log.detail}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

  );
};
