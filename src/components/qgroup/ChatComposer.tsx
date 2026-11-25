import React, { useRef } from 'react';
import {
  Lock,
  Reply,
  X,
  Film,
  BookOpen,
  Paperclip,
  Smile,
  AtSign,
  Mic,
  Send,
  Trash2,
} from 'lucide-react';
import { QGroupMessage } from '../../types';
import { SlackEmojiPicker } from '../SlackEmojiPicker';

const formatDuration = (secs: number) => {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
};

const getFileIcon = (fileName: string) => {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.doc') || lower.endsWith('.docx')) {
    return <BookOpen className="w-5 h-5 text-blue-600" />;
  }
  if (lower.endsWith('.pdf')) {
    return <BookOpen className="w-5 h-5 text-rose-600" />;
  }
  return <Paperclip className="w-5 h-5 text-slate-600" />;
};

export interface SelectedAttachment {
  name: string;
  size: string;
  type: string;
  fileUrl?: string;
  file?: File;
  rawFile?: File;
  id?: string;
  fileType?: string;
}

export interface MentionCandidate {
  id: string;
  tag: string;
  email?: string;
  role: string;
}

interface ChatComposerProps {
  isMemberOfChannel: boolean;
  isDirectChat?: boolean;
  replyingToMessage: QGroupMessage | null;
  onCancelReply: () => void;
  onJumpToReplyingMessage?: (msgId: string) => void;
  selectedAttachments?: SelectedAttachment[];
  selectedAttachment?: SelectedAttachment | null;
  onRemoveAttachment?: (index: number) => void;
  onClearAttachment?: () => void;
  chatInput: string;
  onChatInputChange: (val: string) => void;
  isMentionOpen: boolean;
  mentionCandidates: MentionCandidate[];
  onSelectMentionCandidate: (candidate: MentionCandidate) => void;
  onCloseMention: () => void;
  onSend: () => void;
  onComposerPaste: (e: React.ClipboardEvent<HTMLTextAreaElement>) => void;
  placeholder: string;
  isRecording: boolean;
  recordingSeconds: number;
  liveMicLevels: number[];
  activeMicLabel?: string;
  onCycleMic?: () => void;
  onCancelRecording: () => void;
  onStopAndSendRecording: () => void;
  onStartRecording: () => void;
  onSelectFile: (file: File) => void;
  onSelectFiles?: (files: File[]) => void;
  isUploading?: boolean;
  uploadProgressText?: string;
  onOpenTextbookModal: () => void;
}

export const ChatComposer: React.FC<ChatComposerProps> = ({
  isMemberOfChannel,
  isDirectChat = false,
  replyingToMessage,
  onCancelReply,
  onJumpToReplyingMessage,
  selectedAttachments,
  selectedAttachment,
  onRemoveAttachment,
  onClearAttachment,
  chatInput,
  onChatInputChange,
  isMentionOpen,
  mentionCandidates,
  onSelectMentionCandidate,
  onCloseMention,
  onSend,
  onComposerPaste,
  placeholder,
  isRecording,
  recordingSeconds,
  liveMicLevels,
  activeMicLabel,
  onCycleMic,
  onCancelRecording,
  onStopAndSendRecording,
  onStartRecording,
  onSelectFile,
  onSelectFiles,
  isUploading,
  uploadProgressText,
  onOpenTextbookModal,
}) => {
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = React.useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Normalize attachments list from either selectedAttachments or legacy selectedAttachment
  const attachmentsList: SelectedAttachment[] = React.useMemo(() => {
    if (selectedAttachments && Array.isArray(selectedAttachments)) {
      return selectedAttachments;
    }
    if (selectedAttachment) {
      return [selectedAttachment];
    }
    return [];
  }, [selectedAttachments, selectedAttachment]);

  if (!isMemberOfChannel) {
    return (
      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-500 font-medium flex items-center justify-center gap-2">
        <Lock className="w-4 h-4 text-slate-400 shrink-0" />
        <span>Thầy/Cô không còn là thành viên của kênh này nên không thể gửi tin nhắn.</span>
      </div>
    );
  }

  const hasContentToSend = Boolean(chatInput.trim() || attachmentsList.length > 0);

  return (
    <>
      {/* Replying Banner */}
      {replyingToMessage && (
        <div
          onClick={() => onJumpToReplyingMessage?.(replyingToMessage.id)}
          className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-teal-50 border border-teal-200 text-xs mb-2 animate-fadeIn cursor-pointer hover:bg-teal-100/70 transition-colors group/replybanner shadow-2xs"
          title="Bấm để cuộn đến câu hỏi / tin nhắn đang trả lời"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Reply className="w-3.5 h-3.5 text-teal-700 shrink-0 group-hover/replybanner:scale-110 transition-transform" />
            <span className="font-bold text-slate-800 shrink-0">Đang trả lời {replyingToMessage.senderName}:</span>
            <span className="text-slate-600 truncate italic">&ldquo;{replyingToMessage.text}&rdquo;</span>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onCancelReply();
            }}
            className="p-1 rounded-md hover:bg-teal-200 text-slate-400 hover:text-slate-600 transition-colors shrink-0 ml-2"
            title="Hủy trả lời"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Staged Attachments Preview List (Supports multiple images, videos, files) */}
      {attachmentsList.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2 animate-fadeIn max-h-56 overflow-y-auto p-1 bg-slate-50/70 rounded-xl border border-slate-200/60">
          {attachmentsList.map((att, idx) => (
            <div
              key={att.id || `att-${idx}`}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 text-xs shadow-2xs hover:border-slate-300 transition-all max-w-[260px] sm:max-w-xs shrink-0"
            >
              {att.type === 'image' && att.fileUrl ? (
                <img
                  src={att.fileUrl}
                  alt={att.name}
                  className="w-8 h-8 rounded-lg object-cover border border-slate-200 shrink-0"
                />
              ) : att.type === 'video' ? (
                <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                  <Film className="w-4 h-4" />
                </div>
              ) : att.type === 'textbook' ? (
                <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                  <BookOpen className="w-4 h-4" />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                  {getFileIcon(att.name)}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-slate-800 truncate text-[11px]" title={att.name}>{att.name}</p>
                <p className="text-[10px] text-slate-500">
                  {att.size} • {att.type === 'image' ? 'Ảnh' : att.type === 'video' ? 'Video' : att.type === 'textbook' ? 'Giáo trình' : 'Tệp'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (onRemoveAttachment) {
                    onRemoveAttachment(idx);
                  } else if (onClearAttachment) {
                    onClearAttachment();
                  }
                }}
                className="w-5 h-5 rounded-md hover:bg-rose-50 text-slate-400 hover:text-rose-600 flex items-center justify-center transition-colors shrink-0"
                title="Gỡ đính kèm này"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Uploading progress indicator */}
      {isUploading && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-700 font-medium mb-2 animate-fadeIn">
          <div className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin shrink-0" />
          <span className="truncate">{uploadProgressText || 'Đang tải tệp lên máy chủ...'}</span>
        </div>
      )}

      {/* Modern Unified Composer Box */}
      <div className="border border-slate-300 hover:border-slate-400 focus-within:border-slate-700 rounded-2xl bg-white shadow-xs transition-all relative">
        {/* Hidden File Input with multiple support */}
        <input
          type="file"
          ref={fileInputRef}
          multiple
          disabled={isUploading}
          onChange={(e) => {
            const files = e.target.files;
            if (files && files.length > 0) {
              const fileList = Array.from(files);
              if (onSelectFiles) {
                onSelectFiles(fileList);
              } else {
                fileList.forEach((f) => onSelectFile(f));
              }
            }
            e.target.value = '';
          }}
          className="hidden"
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar"
        />

        {/* Autocomplete Mention Popover - Chỉ kích hoạt trong Kênh nhóm, không áp dụng cho tin nhắn riêng 1-1 */}
        {!isDirectChat && isMentionOpen && mentionCandidates.length > 0 && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute left-2 bottom-full mb-2 z-40 w-72 sm:w-80 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden animate-fadeIn"
          >
            <div className="px-3 py-1.5 border-b border-slate-100 bg-slate-50 flex items-center justify-between text-xs font-bold text-slate-600">
              <span className="flex items-center gap-1 text-teal-800">
                <AtSign className="w-3.5 h-3.5 text-teal-600" />
                <span>Nhắc đến thành viên (@)</span>
              </span>
              <span className="text-[10px] text-slate-400 font-normal">Esc để đóng</span>
            </div>
            <div className="max-h-52 overflow-y-auto p-1 divide-y divide-slate-50">
              {mentionCandidates.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    onSelectMentionCandidate(c);
                    textareaRef.current?.focus();
                  }}
                  className="w-full px-2.5 py-1.5 rounded-xl hover:bg-teal-50 flex items-center justify-between text-left transition-colors group cursor-pointer"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 rounded-md bg-slate-800 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                      {c.tag === 'everyone' ? '📢' : c.tag === 'kênh' ? '🔔' : (c.tag || 'QG').slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 group-hover:text-teal-700 truncate">
                        @{c.tag}
                      </p>
                      {c.email && (
                        <p className="text-[10px] text-slate-400 truncate">{c.email}</p>
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-500 font-semibold px-1.5 py-0.5 rounded bg-slate-100 shrink-0">
                    {c.role}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          rows={2}
          value={chatInput}
          onFocus={() => {
            // Giữ khung soạn thảo luôn hiển thị trong tầm nhìn khi mở bàn phím ảo
            setTimeout(() => {
              textareaRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            }, 100);
          }}
          onChange={(e) => onChatInputChange(e.target.value)}
          onPaste={onComposerPaste}
          onKeyDown={(e) => {
            if (isMentionOpen && e.key === 'Escape') {
              onCloseMention();
              return;
            }
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
          placeholder={placeholder}
          className="w-full px-3.5 pt-2.5 pb-1 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden resize-none bg-transparent"
        />

        {/* Bottom Action Bar */}
        <div className="px-2.5 py-1.5 flex items-center justify-between border-t border-slate-100">
          {isRecording ? (
            /* Voice Recording Mode UI */
            <div className="flex items-center justify-between w-full py-0.5 animate-fadeIn">
              <div className="flex items-center gap-2.5">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500" />
                </span>
                <span className="text-xs font-bold text-rose-700 flex items-center gap-1.5">
                  <span>Đang ghi âm...</span>
                  <span className="bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded-md text-[11px] font-mono">
                    {formatDuration(recordingSeconds)}
                  </span>
                </span>
                {/* Real-time live audio wave bars */}
                <div className="flex items-center gap-1 h-5 px-1 bg-rose-50/80 rounded-md">
                  {liveMicLevels.map((h, i) => (
                    <span
                      key={i}
                      style={{ height: `${h}%` }}
                      className="w-1 bg-rose-500 rounded-full transition-all duration-75"
                    />
                  ))}
                </div>

                {/* Nhãn Micro thông minh (tinh gọn, 1 click đổi nhanh không cồng kềnh) */}
                {activeMicLabel && (
                  <button
                    type="button"
                    onClick={onCycleMic}
                    className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-100/80 hover:bg-rose-200 text-rose-800 text-[10px] font-medium border border-rose-200 transition-all cursor-pointer"
                    title="Đang dùng micro này. Bấm vào đây để chuyển đổi nhanh sang micro khác nếu âm thanh chưa vào."
                  >
                    <Mic className="w-2.5 h-2.5 text-rose-600 shrink-0" />
                    <span className="max-w-[120px] truncate">{activeMicLabel}</span>
                    <span className="text-[9px] text-rose-600 font-bold ml-0.5">↻ Đổi</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onCancelRecording}
                  className="px-2.5 py-1 rounded-lg hover:bg-slate-200 text-slate-600 hover:text-slate-900 text-xs font-semibold flex items-center gap-1 transition-colors"
                  title="Hủy ghi âm"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hủy</span>
                </button>

                <button
                  type="button"
                  onClick={onStopAndSendRecording}
                  className="px-3 py-1 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold flex items-center gap-1 transition-colors shadow-xs"
                  title="Dừng và gửi tin nhắn thoại"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Gửi Voice</span>
                </button>
              </div>
            </div>
          ) : (
            /* Normal Action Bar */
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-1">
                {/* 1. NÚT ĐÍNH KÈM TỆP & ẢNH & VIDEO */}
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={(e) => {
                    e.preventDefault();
                    if (!isUploading) fileInputRef.current?.click();
                  }}
                  className={`p-1.5 rounded-lg transition-colors ${
                    isUploading
                      ? 'opacity-40 cursor-not-allowed text-slate-400'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                  title={isUploading ? 'Đang tải tệp lên...' : 'Tải tệp, ảnh & video từ thiết bị (Hỗ trợ tối đa 5 tệp, 25MB/tệp)'}
                >
                  <Paperclip className="w-4 h-4" />
                </button>

                {/* 2. NÚT GIÁO TRÌNH THƯ VIỆN UTH */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    onOpenTextbookModal();
                  }}
                  className="p-1.5 rounded-lg text-slate-600 hover:text-teal-700 hover:bg-teal-50 transition-colors"
                  title="Đính kèm giáo trình Thư viện UTH"
                >
                  <BookOpen className="w-4 h-4 text-slate-600 hover:text-teal-700" />
                </button>

                {/* 3. NÚT EMOJI */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsEmojiPickerOpen(!isEmojiPickerOpen);
                    }}
                    className={`p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors ${
                      isEmojiPickerOpen ? 'bg-slate-200 text-slate-900' : ''
                    }`}
                    title="Kho biểu tượng cảm xúc (Slack Emoji)"
                  >
                    <Smile className="w-4 h-4 text-slate-600" />
                  </button>

                  {isEmojiPickerOpen && (
                    <SlackEmojiPicker
                      onSelect={(emoji) => {
                        onChatInputChange(chatInput + emoji);
                        setIsEmojiPickerOpen(false);
                        textareaRef.current?.focus();
                      }}
                      onClose={() => setIsEmojiPickerOpen(false)}
                    />
                  )}
                </div>

                {/* 4. NÚT TAG / MENTION THÀNH VIÊN (@) - Chỉ hiển thị trong Kênh nhóm, ẩn hoàn toàn trong nhắn tin riêng 1-1 */}
                {!isDirectChat && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      onChatInputChange(chatInput + '@');
                      textareaRef.current?.focus();
                    }}
                    className="p-1.5 rounded-lg text-slate-600 hover:text-teal-700 hover:bg-teal-50 transition-colors"
                    title="Nhắc đến thành viên (@mention)"
                  >
                    <AtSign className="w-4 h-4 text-slate-600 hover:text-teal-700" />
                  </button>
                )}

                {/* 5. NÚT GHI ÂM TIN NHẮN THOẠI (MIC) */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    onStartRecording();
                  }}
                  className="p-1.5 rounded-lg text-slate-600 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                  title="Ghi âm tin nhắn thoại (Voice note)"
                >
                  <Mic className="w-4 h-4 text-slate-600 hover:text-rose-600" />
                </button>
              </div>

              {/* Send Button */}
              <button
                type="button"
                onClick={onSend}
                disabled={!hasContentToSend || isUploading}
                className={`px-3 py-1.5 rounded-xl font-semibold text-xs flex items-center gap-1.5 transition-colors ${
                  hasContentToSend && !isUploading
                    ? 'bg-slate-900 hover:bg-slate-800 text-white cursor-pointer active:scale-95'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
                title={isUploading ? 'Đang tải tệp lên...' : 'Gửi tin nhắn (Enter)'}
              >
                <span className="hidden sm:inline">Gửi</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
