import React from 'react';
import { Sparkles, AlertCircle, RefreshCw } from 'lucide-react';

interface GenerationProgressModalProps {
  isGenerating: boolean;
  generationError: string | null;
  generationStep: string;
  generationProgress: number;
  totalQuestions: number;
  onRetry: () => void;
  onClose: () => void;
  onUseFallback?: () => void;
}

export const GenerationProgressModal: React.FC<GenerationProgressModalProps> = ({
  isGenerating,
  generationError,
  generationStep,
  generationProgress,
  totalQuestions,
  onRetry,
  onClose,
  onUseFallback,
}) => {
  if (!isGenerating) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-slate-900/50 p-4">
      <div className="relative bg-white rounded-3xl p-8 sm:p-10 max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden">
        {/* Shimmer wave bar at top */}
        <div className="absolute top-0 left-0 right-0 h-1 shimmer-bar" />

        {generationError ? (
          /* Error Display inside modal */
          <div className="text-center space-y-4 animate-fade-in">
            <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center mx-auto text-[#da1c2d]">
              <AlertCircle className="w-8 h-8" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-lg font-bold text-slate-900">Lỗi kết nối AI Service</h3>
              <p className="text-xs text-[#da1c2d] leading-relaxed bg-rose-50 p-3 rounded-xl border border-rose-200 text-left">
                {generationError}
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <button
                onClick={onRetry}
                className="w-full py-2.5 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-[#008689] to-[#1d999d] hover:brightness-105 transition-all flex items-center justify-center gap-2 shadow-md shadow-[#008689]/25"
              >
                <RefreshCw className="w-4 h-4" />
                Thử lại gọi mô hình AI
              </button>

              {onUseFallback && (
                <button
                  onClick={onUseFallback}
                  className="w-full py-2.5 rounded-xl font-bold text-xs text-amber-700 bg-amber-50 hover:bg-amber-100 transition-colors flex items-center justify-center gap-2 border border-amber-200"
                >
                  Dùng bộ câu hỏi mẫu dự phòng
                </button>
              )}

              <button
                onClick={onClose}
                className="w-full py-2.5 rounded-xl font-semibold text-xs text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors flex items-center justify-center gap-2 border border-slate-200"
              >
                Đóng và cấu hình lại
              </button>
            </div>
          </div>
        ) : (
          /* Normal Loading Progress */
          <div>
            <div className="flex justify-center mb-5">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#008689] to-[#1d999d] flex items-center justify-center shadow-lg shadow-[#008689]/25">
                <Sparkles
                  className="w-8 h-8 text-white animate-spin"
                  style={{ animationDuration: '3s' }}
                />
              </div>
            </div>

            <h2 className="text-center text-xl font-extrabold text-slate-900 mb-1.5 tracking-tight">
              Gemini AI đang sinh câu hỏi
            </h2>
            <p className="text-center text-xs text-slate-500 mb-6">
              Đang xử lý {totalQuestions} câu hỏi theo Thang đo nhận thức Bloom qua API
            </p>

            {/* 3-step sequential status tracker */}
            <div className="space-y-2.5">
              {[
                { step: 1, label: 'Đọc hiểu nội dung giáo trình môn học...' },
                { step: 2, label: 'Gemini AI tổng hợp và sinh câu hỏi theo chuẩn Bloom...' },
                { step: 3, label: 'Kiểm tra minh chứng trích dẫn & chuẩn hóa câu hỏi...' },
              ].map(({ step, label }) => {
                const currentStepNum =
                  generationProgress < 35 ? 1
                  : generationProgress < 85 ? 2
                  : 3;
                const isDone = step < currentStepNum;
                const isActive = step === currentStepNum;

                return (
                  <div
                    key={step}
                    className={`flex items-center space-x-3 p-2.5 rounded-xl border transition-all duration-300 ${
                      isDone
                        ? 'bg-emerald-50 border-emerald-200'
                        : isActive
                        ? 'bg-[#e0f7fa]/75 border-[#008689]/40 shadow-sm'
                        : 'bg-slate-50 border-slate-200 opacity-60'
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold border transition-all ${
                        isDone
                          ? 'bg-emerald-500 border-emerald-600 text-white'
                          : isActive
                          ? 'bg-[#008689] border-[#006d70] text-white animate-pulse'
                          : 'bg-white border-slate-300 text-slate-400'
                      }`}
                    >
                      {isDone ? '✓' : step}
                    </div>
                    <span
                      className={`text-xs font-semibold leading-snug flex-1 ${
                        isActive ? 'text-[#006d70]' : isDone ? 'text-emerald-700' : 'text-slate-500'
                      }`}
                    >
                      {label}
                    </span>
                    {isActive && (
                      <div className="flex space-x-1 shrink-0">
                        <span
                          className="w-1.5 h-1.5 rounded-full bg-[#008689] animate-bounce"
                          style={{ animationDelay: '0ms' }}
                        />
                        <span
                          className="w-1.5 h-1.5 rounded-full bg-[#008689] animate-bounce"
                          style={{ animationDelay: '150ms' }}
                        />
                        <span
                          className="w-1.5 h-1.5 rounded-full bg-[#008689] animate-bounce"
                          style={{ animationDelay: '300ms' }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Progress bar */}
            <div className="mt-5 w-full bg-slate-200 h-2 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-[#008689] to-[#1d999d] h-full rounded-full transition-all duration-500"
                style={{ width: `${generationProgress}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] font-mono mt-2 text-slate-500">
              <span className="truncate max-w-[200px]">{generationStep}</span>
              <span className="text-[#008689] font-bold shrink-0">{generationProgress}%</span>
            </div>

            <p className="text-center text-[10px] text-teal-600/80 font-medium mt-3 flex items-center justify-center gap-1.5">
              <Sparkles className="w-3 h-3 text-teal-600" />
              Mô hình Gemini 2.5 Flash · Xử lý liên tục không ngắt quãng
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default GenerationProgressModal;
