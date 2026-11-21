import React from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';
import { ToastMessage } from '../types';

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  return (
    <div className="fixed top-5 right-5 z-50 flex flex-col space-y-3 pointer-events-none">
      {toasts.map((toast) => {
        let bg = 'bg-white text-slate-800 border-slate-200 shadow-lg';
        let icon = <Info className="w-4 h-4 text-[#008689] shrink-0" />;

        if (toast.type === 'success') {
          bg = 'bg-white text-slate-800 border-emerald-500/40 shadow-lg shadow-emerald-600/10';
          icon = <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />;
        } else if (toast.type === 'warning') {
          bg = 'bg-white text-slate-800 border-amber-500/40 shadow-lg shadow-amber-500/10';
          icon = <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />;
        } else if (toast.type === 'error') {
          bg = 'bg-white text-slate-800 border-rose-500/40 shadow-lg shadow-rose-500/10';
          icon = <AlertCircle className="w-4 h-4 text-[#da1c2d] shrink-0" />;
        }

        return (
          <div
            key={toast.id}
            onClick={() => {
              if (toast.onClick) {
                toast.onClick();
                onDismiss(toast.id);
              }
            }}
            className={`pointer-events-auto flex items-start space-x-3 p-3.5 sm:p-4 rounded-xl border transition-all duration-300 max-w-sm min-w-[280px] animate-slideIn ${bg} ${
              toast.onClick
                ? 'cursor-pointer hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] border-teal-500/60 ring-1 ring-teal-500/20'
                : ''
            }`}
          >
            {icon}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1.5">
                <h4 className="text-xs font-bold leading-tight tracking-tight text-slate-900">{toast.title}</h4>
                {toast.onClick && (
                  <span className="text-[10px] text-teal-700 font-bold bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200/80 shrink-0">
                    Mở tin nhắn →
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-600 mt-1 leading-snug break-words line-clamp-3">{toast.message}</p>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDismiss(toast.id);
              }}
              className="text-slate-400 hover:text-slate-700 transition-colors p-0.5 shrink-0"
              title="Đóng thông báo"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
