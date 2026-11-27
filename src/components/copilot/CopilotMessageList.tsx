import React from 'react';
import { Bot, User, Copy, Check, BookOpen, FileText } from 'lucide-react';
import { ScreenId } from '../../types';
import {
  QuantaMarkdownRenderer,
  SupportTicketActionData,
  ExamBlueprintActionData,
  PatchQuestionActionData,
  ImportExamActionData,
} from '../QuantaMarkdownRenderer';
import { ChatMessage } from './types';

interface CopilotMessageListProps {
  chatContainerRef: React.RefObject<HTMLDivElement>;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  messages: ChatMessage[];
  isLoading: boolean;
  streamStatus: string;
  copiedId: string | null;
  onScroll?: () => void;
  onCopy: (id: string, text: string) => void;
  onSelectSuggestion: (action: string) => void;
  onNavigate?: (screen: ScreenId) => void;
  onSubmitTicket: (data: SupportTicketActionData) => Promise<boolean> | void;
  onAutoGenerateExam: (data: ExamBlueprintActionData) => Promise<void> | void;
  onPatchQuestion: (data: PatchQuestionActionData) => Promise<boolean> | void;
  onImportExam: (data: ImportExamActionData, targetScreen?: ScreenId) => Promise<boolean> | void;
}

export const CopilotMessageList: React.FC<CopilotMessageListProps> = ({
  chatContainerRef,
  messagesEndRef,
  messages,
  isLoading,
  streamStatus,
  copiedId,
  onScroll,
  onCopy,
  onSelectSuggestion,
  onNavigate,
  onSubmitTicket,
  onAutoGenerateExam,
  onPatchQuestion,
  onImportExam,
}) => {
  return (
    <div
      ref={chatContainerRef}
      onScroll={onScroll}
      className="flex-1 p-3.5 overflow-y-auto space-y-3 bg-[#f8fafc] text-xs"
    >
      {messages.map((m) => {
        const isUser = m.role === 'user';
        return (
          <div key={m.id} className={`flex gap-2 items-start ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-white text-[10px] ${
                isUser ? 'bg-slate-700' : 'bg-[#008689]'
              }`}
            >
              {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
            </div>

            <div className={`max-w-[85%] space-y-1.5 ${isUser ? 'items-end' : 'items-start'}`}>
              <div
                className={`p-3 rounded-2xl leading-relaxed shadow-sm relative group ${
                  isUser
                    ? 'bg-[#008689] text-white rounded-tr-none whitespace-pre-wrap break-words'
                    : 'bg-white text-slate-800 border border-slate-200/80 rounded-tl-none'
                }`}
              >
                {isUser && m.attachments && m.attachments.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    {m.attachments.map((att, aIdx) =>
                      att.mimeType?.startsWith('image/') && att.data ? (
                        <img
                          key={att.id || aIdx}
                          src={att.data}
                          alt={att.name}
                          className="max-h-32 rounded-lg border border-white/25 object-cover"
                        />
                      ) : (
                        <span
                          key={att.id || aIdx}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/15 text-[10px] font-medium"
                        >
                          <FileText className="w-3 h-3" />
                          {att.name}
                        </span>
                      )
                    )}
                  </div>
                )}

                {isUser ? (
                  m.content
                ) : (
                  <QuantaMarkdownRenderer
                    content={m.content}
                    actions={m.actions}
                    onNavigate={onNavigate}
                    onSubmitTicket={onSubmitTicket}
                    onAutoGenerateExam={onAutoGenerateExam}
                    onPatchQuestion={onPatchQuestion}
                    onImportExam={onImportExam}
                  />
                )}

                {!isUser && (
                  <button
                    onClick={() => onCopy(m.id, m.content)}
                    title="Sao chép câu trả lời"
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 transition-opacity"
                  >
                    {copiedId === m.id ? (
                      <Check className="w-3 h-3 text-emerald-600" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                )}
              </div>

              {!isUser && m.ragSources && m.ragSources.length > 0 && (
                <div className="flex flex-wrap gap-1 px-0.5">
                  {m.ragSources.slice(0, 4).map((src, sIdx) => (
                    <span
                      key={sIdx}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200/70 text-[10px] font-medium"
                      title={src.chapter || src.documentName}
                    >
                      <BookOpen className="w-2.5 h-2.5 shrink-0" />
                      <span className="truncate max-w-[140px]">{src.documentName}</span>
                      <span className="text-teal-600 font-bold">· Tr.{src.pageNumber}</span>
                    </span>
                  ))}
                </div>
              )}

              <div className={`text-[10px] text-slate-400 px-1 ${isUser ? 'text-right' : 'text-left'}`}>
                {m.timestamp}
              </div>

              {!isUser && m.suggestedActions && m.suggestedActions.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {m.suggestedActions.map((action, idx) => (
                    <button
                      key={idx}
                      disabled={isLoading}
                      onClick={() => onSelectSuggestion(action)}
                      className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-white hover:bg-[#e0f7fa] text-slate-700 hover:text-[#008689] border border-slate-200 hover:border-[#008689]/40 shadow-2xs transition-all active:scale-95 text-left"
                    >
                      {action}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {isLoading && (
        <div className="flex gap-2 items-start">
          <div className="w-6 h-6 rounded-full bg-[#008689] flex items-center justify-center shrink-0 text-white">
            <Bot className="w-3.5 h-3.5" />
          </div>
          <div className="px-3.5 py-2.5 rounded-2xl rounded-tl-none bg-white border border-slate-200 shadow-sm flex items-center gap-1.5 text-slate-500 text-xs">
            <span>{streamStatus || 'Quanta đang tra cứu tài liệu & suy nghĩ'}</span>
            <span className="flex gap-1 items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-[#008689] animate-bounce" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#008689] animate-bounce [animation-delay:0.2s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#008689] animate-bounce [animation-delay:0.4s]" />
            </span>
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
};
