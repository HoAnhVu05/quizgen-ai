import React from 'react';
import { CheckCircle2, Server, Zap } from 'lucide-react';
import { MicroserviceStatus } from './adminTypes';

export interface AdminServicesTabProps {
  servicesStatus: MicroserviceStatus[];
  isCheckingServices: boolean;
  handlePingServices: () => void;
}

export const AdminServicesTab: React.FC<AdminServicesTabProps> = ({
  servicesStatus,
  isCheckingServices,
  handlePingServices,
}) => {
  return (
        <div className="space-y-5">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Server className="w-4 h-4 text-[#008689]" />
                <span>Kiến Trúc Cụm 7 Microservices (Service Mesh Architecture)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Toàn bộ hệ thống chạy phân tán với API Gateway (8000) làm trung tâm, tích hợp các microservices nghiệp vụ độc lập từ 8000 đến 8006.
              </p>
            </div>

            <button
              onClick={handlePingServices}
              disabled={isCheckingServices}
              className="flex items-center gap-2 px-4 py-2 bg-[#008689] hover:bg-[#006f72] text-white font-bold text-xs rounded-xl transition-all shadow-xs shrink-0"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Ping Kiểm tra Toàn bộ 7 Cổng</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {servicesStatus.map((svc) => (
              <div
                key={svc.port}
                className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3.5 flex flex-col justify-between shadow-xs hover:border-[#008689]/40 transition-all"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                      <h4 className="font-bold text-sm text-slate-900">{svc.name}</h4>
                    </div>
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-[#008689] border border-slate-200">
                      Port {svc.port}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">{svc.role}</p>

                  <div className="pt-2 border-t border-slate-100 space-y-1 text-[11px]">
                    <div className="flex items-center justify-between text-slate-500">
                      <span>Công nghệ:</span>
                      <span className="text-slate-800 font-mono font-medium">{svc.technology}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-500">
                      <span>Độ trễ phản hồi:</span>
                      <span className="text-emerald-700 font-mono font-bold">{svc.latencyMs} ms</span>
                    </div>
                    {svc.details && (
                      <div className="flex items-center justify-between text-slate-500">
                        <span>Thông số kỹ thuật:</span>
                        <span className="text-slate-700 font-mono text-[10px]">{svc.details}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-2">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 w-full justify-center">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Sẵn sàng phục vụ (HTTP 200 OK)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

  );
};
