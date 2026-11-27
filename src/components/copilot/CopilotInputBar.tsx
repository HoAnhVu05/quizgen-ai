import React, { useRef } from 'react';
import { Paperclip, Send, Square, X, FileText } from 'lucide-react';
import { ChatAttachment } from './types';

interface CopilotInputBarProps {
  inputMessage: string;
  setInputMessage: (val: string) => void;
  pendingAttachments: ChatAttachment[];
  onRemoveAttachment: (id: string) => void;
  onAddFiles: (files: FileList | File[]) => void;
  isLoading: boolean;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  onSend: () => void;
  onStopStreaming: () => void;
}

export const CopilotInputBar: React.FC<CopilotInputBarProps> = ({
  inputMessage,
  setInputMessage,
  pendingAttachments,
  onRemoveAttachment,
  onAddFiles,
  isLoading,
  textareaRef,
  onSend,
  onStopStreaming,
}) => {
  const chatFileInputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div className="p-2.5 bg-white border-t border-slate-200 space-y-2">
      {pendingAttachments.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-1">
          {pendingAttachments.map((att) => (
            <div
              key={att.id}
              className="relative group flex items-center gap-1.5 pl-1.5 pr-6 py-1 rounded-lg bg-slate-100 border border-slate-200 text-[10px] text-slate-700 max-w-[180px]"
            >
              {att.mimeType.startsWith('image/') && att.data ? (
                <img src={att.data} alt={att.name} className="w-5 h-5 rounded object-cover shrink-0" />
              ) : (
                <FileText className="w-3.5 h-3.5 text-[#008689] shrink-0" />
              )}
              <span className="truncate font-medium">{att.name}</span>
              <button
                type="button"
                onClick={() => onRemoveAttachment(att.id)}
                className="absolute right-1 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-slate-200 text-slate-500"
                title="Xóa tệp"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSend();
        }}
        className="flex items-end gap-1.5"
      >
        <input
          ref={chatFileInputRef}
          type="file"
          accept="image/*,application/pdf,.txt,.md,.csv,.json,.py,.ts,.tsx,.js"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) onAddFiles(e.target.files);
            e.target.value = '';
          }}
        />
        <button
          type="button"
          disabled={isLoading}
          onClick={() => chatFileInputRef.current?.click()}
          title="Đính kèm ảnh, PDF hoặc tệp văn bản (hoặc kéo thả / Ctrl+V dán ảnh)"
          className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center shrink-0 transition-colors disabled:opacity-50"
        >
          <Paperclip className="w-3.5 h-3.5" />
        </button>

        <textarea
          ref={textareaRef}
          rows={1}
          value={inputMessage}
          onChange={(e) => {
            setInputMessage(e.target.value);
            e.target.style.height = 'auto';
            e.target.style.height = `${Math.min(e.target.scrollHeight, 110)}px`;
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
          onPaste={(e) => {
            if (e.clipboardData?.files && e.clipboardData.files.length > 0) {
              e.preventDefault();
              onAddFiles(e.clipboardData.files);
            }
          }}
          placeholder="Hỏi giáo trình, dán ảnh bài tập hoặc yêu cầu tạo đề..."
          disabled={isLoading}
          className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400 outline-none focus:bg-white focus:border-[#008689] focus:ring-1 focus:ring-[#008689]/20 transition-all disabled:opacity-50 resize-none max-h-[110px] leading-relaxed"
        />

        {isLoading ? (
          <button
            type="button"
            onClick={onStopStreaming}
            title="Dừng phản hồi"
            className="w-8 h-8 rounded-xl bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center shrink-0 transition-colors shadow-sm"
          >
            <Square className="w-3 h-3 fill-current" />
          </button>
        ) : (
          <button
            type="submit"
            disabled={!inputMessage.trim() && pendingAttachments.length === 0}
            className="w-8 h-8 rounded-xl bg-[#008689] hover:bg-[#007072] disabled:bg-slate-200 text-white disabled:text-slate-400 flex items-center justify-center shrink-0 transition-colors shadow-sm"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        )}
      </form>
      <div className="flex items-center justify-between text-[10px] text-slate-400 px-1">
        <span>Enter gửi · Shift+Enter xuống dòng · Hỗ trợ ảnh & PDF</span>
      </div>
    </div>
  );
};
