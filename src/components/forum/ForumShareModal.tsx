import React, { useState, useEffect } from 'react';
import { Search, X, Check } from 'lucide-react';
import { UserProfile } from '../../types';
import apiClient, { API_BASE } from '../../services/apiClient';
import {
  ForumPost,
  getCleanChatName,
  getFormattedAuthorName,
  formatTimeAgo,
  removeVietnameseTones,
} from './forumTypesAndData';

interface ForumShareModalProps {
  post: ForumPost | null;
  onClose: () => void;
  currentUser?: UserProfile | null;
  onShowToast: (type: 'success' | 'info' | 'warning' | 'error', title: string, message: string) => void;
}

export const ForumShareModal: React.FC<ForumShareModalProps> = ({
  post,
  onClose,
  currentUser,
  onShowToast,
}) => {
  const [shareTargetGroups, setShareTargetGroups] = useState<any[]>([]);
  const [selectedShareGroupId, setSelectedShareGroupId] = useState<string>('');
  const [shareSearch, setShareSearch] = useState('');
  const [shareNote, setShareNote] = useState('');
  const [isSendingShare, setIsSendingShare] = useState(false);

  const myName = currentUser?.fullName || 'Vũ Anh';
  const myEmail = currentUser?.email || 'user@uth.edu.vn';

  useEffect(() => {
    if (!post) return;

    setShareNote('');
    setShareSearch('');

    let available: any[] = [];
    try {
      const storageKey = myEmail ? `quizgen_qgroups_${myEmail}` : 'quizgen_qgroups';
      const local = localStorage.getItem(storageKey) || localStorage.getItem('quizgen_qgroups');
      if (local) {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed) && parsed.length > 0) available = parsed;
      }
    } catch {}

    if (available.length === 0) {
      apiClient
        .fetch(`${API_BASE}/documents/qgroups`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (Array.isArray(data)) setShareTargetGroups(data);
          else if (data?.groups) setShareTargetGroups(data.groups);
        })
        .catch(() => {});
    }

    if (available.length === 0) {
      available = [
        { id: 'grp-os', name: 'Bộ Môn Mạng & Hệ Điều Hành', memberCount: 12, isDirect: false },
        { id: 'grp-llct', name: 'Tổ Bộ Môn Lý Luận Chính Trị', memberCount: 8, isDirect: false },
        { id: 'grp-ktvm', name: 'Tổ Chuyên Môn Kinh Tế Vi Mô', memberCount: 15, isDirect: false },
        { id: 'dm-hanbich', name: 'ThS. Hân Bích', directPartnerName: 'ThS. Hân Bích', isDirect: true },
        { id: 'dm-tan', name: 'ThS. Nguyễn Văn Tân', directPartnerName: 'ThS. Nguyễn Văn Tân', isDirect: true },
      ];
    }

    setShareTargetGroups(available);
    setSelectedShareGroupId(available[0]?.id || '');
  }, [post, myEmail]);

  if (!post) return null;

  const filteredShareGroups = shareTargetGroups.filter((g) => {
    const cleanLabel = getCleanChatName(g, myName, myEmail);
    if (!shareSearch.trim()) return true;
    return removeVietnameseTones(cleanLabel).includes(removeVietnameseTones(shareSearch));
  });

  const handleSendShare = async () => {
    if (!selectedShareGroupId) return;
    setIsSendingShare(true);

    const targetGroup = shareTargetGroups.find((g) => g.id === selectedShareGroupId);
    const targetName = targetGroup ? getCleanChatName(targetGroup, myName, myEmail) : 'Cuộc trò chuyện';

    const newMessage: any = {
      id: `msg-share-${Date.now()}`,
      senderEmail: myEmail,
      senderName: myName,
      senderTitle: currentUser?.academicTitle || 'TS.',
      avatarColor: 'bg-slate-700',
      text: shareNote.trim() || undefined,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      sharedPost: {
        id: post.id,
        tag: (post.tags && post.tags.filter((t) => t && t !== 'Chung')[0]) || 'Chuyên môn',
        title: post.title,
        authorName: getFormattedAuthorName(post.authorName, post.authorTitle),
        department: post.department,
        content: post.content.slice(0, 150) + '...',
        fullContent: post.content,
        attachmentFileName: post.attachmentFileName,
        attachmentFileSize: post.attachmentFileSize,
        attachmentUrl: post.attachmentUrl,
        imageUrl: post.imageUrl,
        timestamp: formatTimeAgo(post.createdAt || post.timestamp || ''),
        note: shareNote.trim() || undefined,
      },
    };

    try {
      await apiClient.fetch(`${API_BASE}/documents/qgroups/${encodeURIComponent(selectedShareGroupId)}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMessage),
      });
    } catch {}

    // Lưu vào local storage để đồng bộ tức thì
    try {
      const storageKey = myEmail ? `quizgen_qgroups_${myEmail}` : 'quizgen_qgroups';
      const local = localStorage.getItem(storageKey) || localStorage.getItem('quizgen_qgroups');
      if (local) {
        const groups = JSON.parse(local);
        const updated = groups.map((g: any) => {
          if (g.id === selectedShareGroupId) {
            return {
              ...g,
              messages: [...(g.messages || []), newMessage],
              unreadCount: (g.unreadCount || 0) + 1,
            };
          }
          return g;
        });
        localStorage.setItem(storageKey, JSON.stringify(updated));
        localStorage.setItem('quizgen_qgroups', JSON.stringify(updated));
      }
    } catch {}

    setIsSendingShare(false);
    onClose();
    onShowToast('success', 'Đã chia sẻ thành công', `Đã chuyển liên kết chủ đề vào "${targetName}".`);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fadeIn"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-white rounded-xl shadow-xl border border-slate-200 p-5 space-y-3.5 text-xs animate-fadeIn"
      >
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <h3 className="font-bold text-sm text-slate-900">Chia sẻ vào Cuộc trò chuyện / QGroup</h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
          <div className="font-bold text-slate-900 truncate">{post.title}</div>
          <div className="text-[11px] text-slate-500 line-clamp-2 italic">"{post.content}"</div>
        </div>

        {/* Tìm kiếm phòng chat / đồng nghiệp */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="block font-semibold text-slate-700">Chọn phòng chat hoặc đồng nghiệp nhận tin:</label>
            <span className="text-[10px] text-slate-400">{filteredShareGroups.length} cuộc trò chuyện</span>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
            <input
              type="text"
              value={shareSearch}
              onChange={(e) => setShareSearch(e.target.value)}
              placeholder="Tìm theo tên đồng nghiệp hoặc tên nhóm chat..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-slate-800 text-xs text-slate-800 placeholder-slate-400"
            />
          </div>

          <div className="max-h-44 overflow-y-auto space-y-1 border border-slate-200 rounded-lg p-1.5 bg-slate-50/50">
            {filteredShareGroups.length === 0 ? (
              <p className="text-center text-slate-400 py-3 text-[11px]">Không tìm thấy cuộc trò chuyện phù hợp.</p>
            ) : (
              filteredShareGroups.map((g) => {
                const isSel = selectedShareGroupId === g.id;
                const cleanName = getCleanChatName(g, myName, myEmail);
                const isDm = Boolean(g.isDirect || g.type === 'direct');

                return (
                  <div
                    key={g.id}
                    onClick={() => setSelectedShareGroupId(g.id)}
                    className={`p-2 rounded-lg cursor-pointer flex items-center justify-between transition-colors ${
                      isSel ? 'bg-slate-900 text-white' : 'hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      {isDm ? (
                        <div className="w-6 h-6 rounded-md bg-indigo-100 text-indigo-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                          {cleanName.slice(0, 2).toUpperCase()}
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-md bg-teal-100 text-teal-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                          #
                        </div>
                      )}
                      <div className="truncate">
                        <span className="font-semibold truncate block">{cleanName}</span>
                        <span className={`text-[10px] ${isSel ? 'text-slate-300' : 'text-slate-400'}`}>
                          {isDm ? 'Tin nhắn riêng 1-1' : `${g.memberCount || 2} thành viên`}
                        </span>
                      </div>
                    </div>
                    {isSel && <Check className="w-3.5 h-3.5 text-teal-400 shrink-0" />}
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">Lời nhắn gửi kèm (tùy chọn):</label>
          <input
            type="text"
            value={shareNote}
            onChange={(e) => setShareNote(e.target.value)}
            placeholder="Ví dụ: Kính mời Thầy/Cô tham khảo chủ đề này..."
            className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-slate-800 text-slate-800"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 font-semibold rounded-lg"
          >
            Hủy
          </button>
          <button
            type="button"
            disabled={!selectedShareGroupId || isSendingShare}
            onClick={handleSendShare}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white font-semibold rounded-lg shadow-2xs"
          >
            {isSendingShare ? 'Đang gửi...' : 'Gửi vào chat'}
          </button>
        </div>
      </div>
    </div>
  );
};
