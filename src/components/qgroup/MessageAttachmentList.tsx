import React from 'react';
import { Download, BookOpen, Sparkles } from 'lucide-react';
import type { QGroupMessage, ScreenId } from '../../types';
import { AudioMessagePlayer } from '../AudioMessagePlayer';
import { getFileIcon } from './qgroupHelpers';
import { downloadFileSafely } from '../../utils/fileDownloadHelper';

interface MessageAttachmentListProps {
  msg: QGroupMessage;
  setPreviewMediaUrl: (media: { url: string; name: string } | null) => void;
  setPreviewFile: (file: any) => void;
  onNavigate: (screen: ScreenId) => void;
  onShowToast: (
    type: 'success' | 'info' | 'warning' | 'error',
    title: string,
    message: string,
    onClick?: () => void
  ) => void;
}

export const MessageAttachmentList: React.FC<MessageAttachmentListProps> = ({
  msg,
  setPreviewMediaUrl,
  setPreviewFile,
  onNavigate,
  onShowToast,
}) => {
  const items = msg.attachments && msg.attachments.length > 0 ? msg.attachments : msg.attachment ? [msg.attachment] : [];
  if (items.length === 0) return null;

  return (
    <div className="mt-2.5 max-w-md space-y-2">
      {items.map((attItem, attIdx) => {
        if (!attItem) return null;
        const attKey = attItem.id || `${msg.id}-att-${attIdx}`;
        return (
          <div key={attKey}>
            {attItem.type === 'image' && attItem.fileUrl ? (
              <div className="relative group inline-block max-w-sm rounded-2xl overflow-hidden border border-slate-200/80 bg-slate-50/50 shadow-xs transition-all hover:border-teal-400">
                <img
                  src={attItem.fileUrl}
                  alt={attItem.name || 'Ảnh đính kèm'}
                  className="max-h-80 w-auto max-w-full object-contain rounded-2xl cursor-pointer hover:opacity-95 transition-opacity block"
                  onClick={() => {
                    if (attItem.fileUrl) {
                      setPreviewMediaUrl({
                        url: attItem.fileUrl,
                        name: attItem.name || 'image.png',
                      });
                    }
                  }}
                />
                <div className="absolute top-2 right-2 hidden group-hover:flex items-center bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-xl shadow-lg px-1.5 py-1 gap-1 z-20 animate-fade-in">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadFileSafely(attItem.name || 'image.png', attItem.fileUrl, onShowToast);
                    }}
                    className="w-6 h-6 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center text-xs cursor-pointer transition-colors"
                    title="Tải ảnh về máy"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : attItem.type === 'video' && attItem.fileUrl ? (
              <div className="rounded-2xl overflow-hidden border border-slate-200 bg-black shadow-2xs">
                <video src={attItem.fileUrl} controls className="max-h-72 w-full" />
                <div className="p-2.5 flex items-center justify-between text-xs bg-slate-900 text-white">
                  <span className="truncate font-medium text-xs max-w-[200px]">{attItem.name}</span>
                  <span className="text-[10px] text-slate-400">{attItem.size}</span>
                </div>
              </div>
            ) : attItem.type === 'audio' && attItem.fileUrl ? (
              <div className="max-w-sm">
                <AudioMessagePlayer attachment={attItem} onShowToast={onShowToast} />
              </div>
            ) : attItem.type === 'file' ? (
              <div
                onClick={() => {
                  if (attItem.fileUrl) {
                    setPreviewFile({
                      url: attItem.fileUrl,
                      name: attItem.name,
                      size: attItem.size,
                      type: attItem.fileType,
                    });
                  }
                }}
                className="p-3 rounded-2xl bg-white border border-slate-200 hover:border-teal-500 hover:shadow-xs flex items-center justify-between gap-3 cursor-pointer group transition-all"
                title={`Bấm để mở xem tệp ${attItem.name}`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 group-hover:bg-teal-50 flex items-center justify-center text-slate-700 group-hover:text-teal-700 transition-colors shrink-0">
                    {getFileIcon(attItem.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-900 group-hover:text-teal-700 truncate transition-colors">
                      {attItem.name}
                    </p>
                    <p className="text-[10px] text-slate-500 font-medium">
                      {attItem.size} • Bấm để xem tệp
                    </p>
                  </div>
                </div>
                {attItem.fileUrl && (
                  <div className="flex items-center gap-1 shrink-0 bg-slate-50 border border-slate-200/80 rounded-lg p-0.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        downloadFileSafely(attItem.name, attItem.fileUrl, onShowToast);
                      }}
                      className="w-6 h-6 rounded hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors shrink-0 flex items-center justify-center text-xs cursor-pointer"
                      title="Tải tệp về máy"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* Textbook Attachment */
              <div className="p-3 rounded-2xl bg-white border border-slate-200 text-left space-y-2 hover:border-teal-400 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
                    <BookOpen className="w-5 h-5 text-teal-700" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-900 truncate">{attItem.name}</p>
                    <p className="text-[10px] text-slate-500 font-medium">
                      {attItem.totalPages ? `${attItem.totalPages} trang • ` : ''}
                      {attItem.size} • Giáo trình UTH
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      onShowToast('success', 'Đã nạp giáo trình', `Đã chuyển ${attItem.name} vào màn hình sinh đề AI`);
                      onNavigate('generate');
                    }}
                    className="flex-1 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Dùng Sinh Đề Ngay</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
