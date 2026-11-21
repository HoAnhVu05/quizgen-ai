import React, { useState, useMemo } from 'react';
import {
  X,
  Image as ImageIcon,
  FileText,
  BookOpen,
  Link2,
  Download,
  ExternalLink,
  Sparkles,
  Search,
  FileSpreadsheet,
  FileCode,
  Film,
  Copy,
  Check,
} from 'lucide-react';
import type { QGroup, QGroupMessage } from '../../types';
import { downloadFileSafely } from '../../utils/fileDownloadHelper';

export interface SharedMediaDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  group: QGroup;
  myEmail: string;
  onSelectImage: (file: { url: string; name: string; size?: string; type?: string }) => void;
  onUseTextbookForExam: (textbookName: string) => void;
  onShowToast: (type: 'info' | 'success' | 'warning' | 'error', title: string, message: string) => void;
}

type TabType = 'media' | 'files' | 'textbooks' | 'links';

export const SharedMediaDrawer: React.FC<SharedMediaDrawerProps> = ({
  isOpen,
  onClose,
  group,
  myEmail,
  onSelectImage,
  onUseTextbookForExam,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('media');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  // Lấy tất cả tin nhắn
  const messages: QGroupMessage[] = useMemo(() => {
    return (group.messages || []).filter((m) => !m.isRecalled);
  }, [group.messages]);

  // 1. Danh sách Hình ảnh & Video
  const mediaItems = useMemo(() => {
    const list: Array<{
      id: string;
      url: string;
      name: string;
      size?: string;
      type: 'image' | 'video';
      timestamp: string;
      senderName: string;
    }> = [];

    messages.forEach((msg) => {
      const atts = msg.attachments && msg.attachments.length > 0 ? msg.attachments : msg.attachment ? [msg.attachment] : [];
      atts.forEach((att) => {
        if (!att || !att.fileUrl) return;
        if (att.type === 'image' || att.type === 'video') {
          list.push({
            id: att.id || `${msg.id}-${att.name}`,
            url: att.fileUrl,
            name: att.name || 'Ảnh đính kèm',
            size: att.size,
            type: att.type,
            timestamp: msg.timestamp,
            senderName: msg.senderName,
          });
        }
      });
    });

    return list.reverse();
  }, [messages]);

  // 2. Danh sách Tài liệu & Tệp tin
  const fileItems = useMemo(() => {
    const list: Array<{
      id: string;
      url: string;
      name: string;
      size?: string;
      ext: string;
      timestamp: string;
      senderName: string;
    }> = [];

    messages.forEach((msg) => {
      const atts = msg.attachments && msg.attachments.length > 0 ? msg.attachments : msg.attachment ? [msg.attachment] : [];
      atts.forEach((att) => {
        if (!att || !att.fileUrl) return;
        if (att.type !== 'image' && att.type !== 'video' && att.type !== 'audio') {
          const isTextbook = att.totalPages !== undefined || (att.name && att.name.toLowerCase().includes('giáo trình'));
          if (!isTextbook) {
            const ext = (att.name?.split('.').pop() || 'file').toLowerCase();
            list.push({
              id: att.id || `${msg.id}-${att.name}`,
              url: att.fileUrl,
              name: att.name || 'Tệp đính kèm',
              size: att.size || 'Tệp đính kèm',
              ext,
              timestamp: msg.timestamp,
              senderName: msg.senderName,
            });
          }
        }
      });
    });

    return list.reverse();
  }, [messages]);

  // 3. Danh sách Giáo trình học thuật (Textbooks)
  const textbookItems = useMemo(() => {
    const list: Array<{
      id: string;
      name: string;
      size?: string;
      totalPages?: number;
      timestamp: string;
      senderName: string;
    }> = [];

    messages.forEach((msg) => {
      const atts = msg.attachments && msg.attachments.length > 0 ? msg.attachments : msg.attachment ? [msg.attachment] : [];
      atts.forEach((att) => {
        if (!att) return;
        const isTextbook = att.totalPages !== undefined || (att.name && att.name.toLowerCase().includes('giáo trình'));
        if (isTextbook) {
          list.push({
            id: att.id || `${msg.id}-${att.name}`,
            name: att.name || 'Giáo trình UTH',
            size: att.size || 'Giáo trình học thuật',
            totalPages: att.totalPages,
            timestamp: msg.timestamp,
            senderName: msg.senderName,
          });
        }
      });
    });

    return list.reverse();
  }, [messages]);

  // 4. Danh sách Liên kết Web (Links)
  const linkItems = useMemo(() => {
    const list: Array<{
      id: string;
      url: string;
      domain: string;
      timestamp: string;
      senderName: string;
    }> = [];

    const urlRegex = /(https?:\/\/[^\s]+)/g;

    messages.forEach((msg) => {
      const text = msg.text || '';
      let match: RegExpExecArray | null;
      while ((match = urlRegex.exec(text)) !== null) {
        const fullUrl = match[0];
        try {
          const domain = new URL(fullUrl).hostname;
          list.push({
            id: `${msg.id}-${fullUrl}`,
            url: fullUrl,
            domain,
            timestamp: msg.timestamp,
            senderName: msg.senderName,
          });
        } catch {
          list.push({
            id: `${msg.id}-${fullUrl}`,
            url: fullUrl,
            domain: fullUrl.slice(0, 30),
            timestamp: msg.timestamp,
            senderName: msg.senderName,
          });
        }
      }
    });

    return list.reverse();
  }, [messages]);

  if (!isOpen) return null;

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    onShowToast('info', 'Đã sao chép liên kết', url);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const getFileIcon = (ext: string) => {
    if (['xls', 'xlsx', 'csv'].includes(ext)) return <FileSpreadsheet className="w-5 h-5 text-emerald-600" />;
    if (['doc', 'docx'].includes(ext)) return <FileText className="w-5 h-5 text-blue-600" />;
    if (['pdf'].includes(ext)) return <FileText className="w-5 h-5 text-rose-600" />;
    if (['zip', 'rar', '7z'].includes(ext)) return <FileCode className="w-5 h-5 text-amber-600" />;
    return <FileText className="w-5 h-5 text-slate-500" />;
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex justify-end animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full sm:w-96 max-w-full h-full bg-white border-l border-slate-200 shadow-2xl flex flex-col animate-slide-left select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80 shrink-0">
          <div>
            <h3 className="font-bold text-sm text-slate-900">Kho Lưu Trữ Phương Tiện</h3>
            <p className="text-[11px] text-slate-500 font-medium">#{group.name || 'Hội thoại'}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-slate-200/70 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigator */}
        <div className="grid grid-cols-4 p-1.5 bg-slate-100 border-b border-slate-200 text-xs shrink-0 font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('media')}
            className={`py-2 rounded-lg flex flex-col items-center gap-1 transition-all cursor-pointer ${
              activeTab === 'media'
                ? 'bg-white text-teal-700 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            <span className="text-[10px]">Ảnh ({mediaItems.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('files')}
            className={`py-2 rounded-lg flex flex-col items-center gap-1 transition-all cursor-pointer ${
              activeTab === 'files'
                ? 'bg-white text-teal-700 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span className="text-[10px]">Tệp ({fileItems.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('textbooks')}
            className={`py-2 rounded-lg flex flex-col items-center gap-1 transition-all cursor-pointer ${
              activeTab === 'textbooks'
                ? 'bg-white text-teal-700 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span className="text-[10px]">Sách ({textbookItems.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('links')}
            className={`py-2 rounded-lg flex flex-col items-center gap-1 transition-all cursor-pointer ${
              activeTab === 'links'
                ? 'bg-white text-teal-700 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Link2 className="w-4 h-4" />
            <span className="text-[10px]">Link ({linkItems.length})</span>
          </button>
        </div>

        {/* Search input inside Drawer */}
        <div className="p-3 border-b border-slate-100 shrink-0">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm trong mục này..."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 outline-none focus:bg-white focus:border-teal-500 transition-all"
            />
          </div>
        </div>

        {/* Tab Content Stream */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {/* 1. MEDIA TAB (Ảnh & Video Grid) */}
          {activeTab === 'media' && (
            <div>
              {mediaItems.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs">
                  <ImageIcon className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p>Chưa có hình ảnh hay video nào được gửi</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {mediaItems
                    .filter((m) => !searchQuery || m.name.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map((item) => (
                      <div
                        key={item.id}
                        className="group relative aspect-square rounded-xl overflow-hidden border border-slate-200 bg-slate-100 cursor-pointer shadow-2xs hover:border-teal-500 transition-all"
                        onClick={() => {
                          onSelectImage({
                            url: item.url,
                            name: item.name,
                            size: item.size,
                            type: item.type === 'video' ? 'video/mp4' : 'image/jpeg',
                          });
                        }}
                      >
                        {item.type === 'image' ? (
                          <img
                            src={item.url}
                            alt={item.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-white">
                            <Film className="w-6 h-6 text-teal-400" />
                            <span className="text-[9px] mt-1 text-slate-300">Video</span>
                          </div>
                        )}
                        {/* Hover Overlay */}
                        <div className="absolute inset-0 bg-slate-900/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 p-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              downloadFileSafely(item.name, item.url, onShowToast);
                            }}
                            className="w-7 h-7 rounded-lg bg-white/90 text-slate-800 hover:bg-white flex items-center justify-center cursor-pointer shadow-md"
                            title="Tải về máy"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* 2. FILES TAB (Tệp tin & Tài liệu) */}
          {activeTab === 'files' && (
            <div className="space-y-2">
              {fileItems.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs">
                  <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p>Chưa có tệp tin hay tài liệu nào được gửi</p>
                </div>
              ) : (
                fileItems
                  .filter((f) => !searchQuery || f.name.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl border border-slate-200 bg-white hover:border-teal-400 transition-all flex items-center justify-between gap-3 shadow-2xs group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="w-9 h-9 rounded-lg bg-slate-50 border border-slate-200/80 flex items-center justify-center shrink-0">
                          {getFileIcon(item.ext)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-slate-800 truncate" title={item.name}>
                            {item.name}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {item.size} • {item.senderName} ({item.timestamp})
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          downloadFileSafely(item.name, item.url, onShowToast);
                        }}
                        className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-teal-600 hover:text-white text-slate-600 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                        title="Tải về"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
              )}
            </div>
          )}

          {/* 3. TEXTBOOKS TAB (Giáo trình học thuật UTH - Vũ khí độc bản) */}
          {activeTab === 'textbooks' && (
            <div className="space-y-2.5">
              {textbookItems.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs">
                  <BookOpen className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p>Chưa có giáo trình môn học nào được chia sẻ</p>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Bấm icon cuốn sách ở khung soạn tin để gửi giáo trình vào kênh
                  </p>
                </div>
              ) : (
                textbookItems
                  .filter((t) => !searchQuery || t.name.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((item) => (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-xl border border-teal-200/80 bg-teal-50/30 hover:border-teal-400 transition-all space-y-2.5 shadow-2xs"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center shrink-0">
                          <BookOpen className="w-5 h-5 text-teal-700" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs font-bold text-slate-900 leading-tight">
                            {item.name}
                          </h4>
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            {item.totalPages ? `${item.totalPages} trang • ` : ''}{item.size} • Chia sẻ bởi {item.senderName}
                          </p>
                        </div>
                      </div>

                      {/* Nút hành động học thuật độc bản */}
                      <button
                        type="button"
                        onClick={() => {
                          onUseTextbookForExam(item.name);
                          onClose();
                        }}
                        className="w-full py-1.5 px-3 rounded-lg bg-teal-700 hover:bg-teal-800 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-teal-200" />
                        <span>Dùng Nạp Vào Sinh Đề AI</span>
                      </button>
                    </div>
                  ))
              )}
            </div>
          )}

          {/* 4. LINKS TAB (Đường dẫn web) */}
          {activeTab === 'links' && (
            <div className="space-y-2">
              {linkItems.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs">
                  <Link2 className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p>Chưa có liên kết web nào được chia sẻ trong đoạn chat</p>
                </div>
              ) : (
                linkItems
                  .filter((l) => !searchQuery || l.url.toLowerCase().includes(searchQuery.toLowerCase()) || l.domain.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl border border-slate-200 bg-white hover:border-teal-400 transition-all flex items-center justify-between gap-2.5 shadow-2xs group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 text-slate-500">
                          <ExternalLink className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-semibold text-teal-700 hover:underline truncate block"
                            title={item.url}
                          >
                            {item.url}
                          </a>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {item.domain} • {item.senderName} ({item.timestamp})
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleCopyLink(item.url)}
                          className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
                          title="Sao chép link"
                        >
                          {copiedUrl === item.url ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-teal-600 hover:text-white text-slate-600 flex items-center justify-center transition-colors"
                          title="Mở liên kết"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
