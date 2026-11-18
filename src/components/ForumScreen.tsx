import React, { useState } from 'react';
import {
  MessageSquare,
  Image as ImageIcon,
  FileText,
  Video,
  Send,
  ThumbsUp,
  MessageCircle,
  Share2,
  Tag,
  Paperclip,
  CheckCircle2,
  X,
  ExternalLink,
  Search,
  Sparkles,
  Bookmark,
  Building2,
  UserCheck,
  MoreVertical,
  Pencil,
  Trash2,
  Lock,
  Globe,
  Check,
  Users,
  Shield,
  Forward,
} from 'lucide-react';
import { UserProfile, ScreenId } from '../types';
import apiClient, { API_BASE } from '../services/apiClient';

interface ForumScreenProps {
  currentUser?: UserProfile | null;
  onNavigate: (screen: ScreenId) => void;
  onShowToast: (type: 'success' | 'info' | 'warning' | 'error', title: string, message: string) => void;
}

export interface ForumPost {
  id: string;
  authorEmail?: string;
  authorName: string;
  authorTitle?: string;
  authorRole: string;
  department: string;
  timestamp: string;
  tag: string;
  content: string;
  privacy?: 'public' | 'department' | 'private';
  imageUrl?: string;
  attachmentFileName?: string;
  attachmentFileSize?: string;
  videoUrl?: string;
  likes: number;
  hasLiked?: boolean;
  comments: Array<{
    id: string;
    authorName: string;
    authorTitle?: string;
    content: string;
    timestamp: string;
  }>;
}

const DEFAULT_POSTS: ForumPost[] = [
  {
    id: 'post-1',
    authorName: 'TS. Hồ Anh Vũ',
    authorTitle: 'TS.',
    authorRole: 'Trưởng bộ môn Khoa học Máy tính',
    department: 'Khoa Công nghệ Thông tin',
    timestamp: '16:30 Hôm nay',
    tag: 'Hệ Điều Hành',
    content: 'Chào quý Thầy/Cô, tôi vừa hoàn tất bóc tách và phân đoạn RAG trọn bộ 1.278 trang giáo trình "Operating System Concepts 10th".\n\nKính gửi quý Thầy/Cô sơ đồ kiến trúc bộ nhớ ảo và file ma trận mẫu 40 câu trắc nghiệm theo 4 mức nhận thức Bloom đính kèm. Thầy/Cô có thể tham khảo hoặc lấy trực tiếp trong Thư Viện Giáo Trình để sinh đề kiểm tra giữa kỳ nhé!',
    imageUrl: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=800&q=80',
    attachmentFileName: 'Ma_Tran_De_Thi_He_Dieu_Hanh_Bloom_40Cau.docx',
    attachmentFileSize: '1.4 MB',
    videoUrl: 'https://www.youtube.com/watch?v=26QPDBe-NB8',
    likes: 18,
    hasLiked: false,
    comments: [
      {
        id: 'c-1',
        authorName: 'ThS. Nguyễn Văn Tân',
        authorTitle: 'ThS.',
        content: 'Tài liệu cực kỳ chi tiết Thầy Vũ ơi! Em vừa thử sinh đề trắc nghiệm chương Quản lý Bộ nhớ, tỷ lệ bám sát giáo trình đạt gần 100%.',
        timestamp: '16:45 Hôm nay'
      },
      {
        id: 'c-2',
        authorName: 'Ngô Phạm Công Đức',
        authorTitle: 'KS.',
        content: 'Thầy cho em hỏi phần xuất bản phiếu OMR 4 mã đề có cần căn chỉnh thêm lề in A4 không ạ? Bộ ReportLab em đã đồng bộ sẵn rồi.',
        timestamp: '17:05 Hôm nay'
      }
    ]
  },
  {
    id: 'post-2',
    authorName: 'ThS. Hân Bích',
    authorTitle: 'ThS.',
    authorRole: 'Giảng viên',
    department: 'Khoa Lý luận Chính trị',
    timestamp: '11:15 Hôm nay',
    tag: 'Tư Tưởng HCM',
    content: 'Kính gửi các Thầy/Cô bộ môn LLCT, em đã chia sẻ bộ slide bài giảng và giáo trình chuẩn 12 chương (102 trang) vào Thư Viện Giáo Trình.\n\nKinh nghiệm biên soạn đề thi: Với môn Lý luận, nên chú trọng các câu hỏi mức Thông hiểu và Vận dụng phân tích bối cảnh lịch sử để sinh viên tránh học vẹt. Mời các Thầy/Cô xem video hướng dẫn phân bổ ma trận dưới đây.',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    attachmentFileName: 'Huong_Dan_Phan_Bo_Ma_Tran_LLCT_2026.pdf',
    attachmentFileSize: '850 KB',
    likes: 14,
    hasLiked: false,
    comments: []
  },
  {
    id: 'post-3',
    authorName: 'Huỳnh Hồ Hiếu Hiệu',
    authorTitle: 'KTS.',
    authorRole: 'Chuyên viên Khảo thí',
    department: 'Phòng Đào tạo & Khảo thí',
    timestamp: '09:20 Hôm qua',
    tag: 'Ma Trận Bloom',
    content: 'Cập nhật hướng dẫn mới nhất về thiết lập tỷ lệ Bloom chuẩn khảo thí năm học 2026 - 2027:\n- Đề kiểm tra 15 phút: 10 câu (50% Nhận biết, 30% Thông hiểu, 20% Vận dụng)\n- Đề kiểm tra Giữa kỳ: 20 câu (40% Nhận biết, 30% Thông hiểu, 20% Vận dụng, 10% Vận dụng cao)\n- Đề thi Kết thúc học phần: 40 câu (30% Nhận biết, 30% Thông hiểu, 25% Vận dụng, 15% Vận dụng cao)\n\nThầy/Cô vào Bước 2 chỉ cần bấm chọn Preset tương ứng là AI tự động chia số câu chuẩn xác!',
    likes: 25,
    hasLiked: true,
    comments: []
  }
];

export const ForumScreen: React.FC<ForumScreenProps> = ({
  currentUser,
  onNavigate,
  onShowToast
}) => {
  const [posts, setPosts] = useState<ForumPost[]>(() => {
    try {
      const saved = localStorage.getItem('quizgen_academic_forum_posts');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return DEFAULT_POSTS;
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTagFilter, setSelectedTagFilter] = useState('All');
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState('');

  // ─── Post Actions & Menu States ──────────────────────────────────────────
  const [activeMenuPostId, setActiveMenuPostId] = useState<string | null>(null);

  // Edit Post Modal State
  const [editingPost, setEditingPost] = useState<ForumPost | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editTag, setEditTag] = useState('');
  const [editPrivacy, setEditPrivacy] = useState<'public' | 'department' | 'private'>('public');

  // Share to Chat / Q-Group Modal State
  const [sharingPost, setSharingPost] = useState<ForumPost | null>(null);
  const [shareTargetGroups, setShareTargetGroups] = useState<any[]>([]);
  const [selectedShareGroupId, setSelectedShareGroupId] = useState<string>('');
  const [shareNote, setShareNote] = useState('');
  const [isSendingShare, setIsSendingShare] = useState(false);

  // Form inputs for creating post
  const [postContent, setPostContent] = useState('');
  const [postTag, setPostTag] = useState('Hệ Điều Hành');
  const [postPrivacy, setPostPrivacy] = useState<'public' | 'department' | 'private'>('public');
  const [showAttachImage, setShowAttachImage] = useState(false);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [showAttachFile, setShowAttachFile] = useState(false);
  const [attachedFileName, setAttachedFileName] = useState('');
  const [attachedFileSize, setAttachedFileSize] = useState('');
  const [showAttachVideo, setShowAttachVideo] = useState(false);
  const [videoUrlInput, setVideoUrlInput] = useState('');

  const savePosts = (updated: ForumPost[]) => {
    setPosts(updated);
    try {
      localStorage.setItem('quizgen_academic_forum_posts', JSON.stringify(updated));
    } catch {}
  };

  const handleCreatePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!postContent.trim()) {
      onShowToast('warning', 'Nội dung trống', 'Vui lòng nhập nội dung bài viết.');
      return;
    }

    const newPost: ForumPost = {
      id: `post-${Date.now()}`,
      authorEmail: currentUser?.email,
      authorName: currentUser?.fullName || 'TS. Hồ Anh Vũ',
      authorTitle: currentUser?.academicTitle || 'TS.',
      authorRole: currentUser?.role === 'admin' ? 'Quản trị viên' : 'Giảng viên',
      department: (currentUser as any)?.department || 'Khoa Công nghệ Thông tin',
      timestamp: 'Vừa xong',
      tag: postTag,
      privacy: postPrivacy,
      content: postContent.trim(),
      imageUrl: imageUrlInput.trim() || undefined,
      attachmentFileName: attachedFileName.trim() || undefined,
      attachmentFileSize: attachedFileSize.trim() || undefined,
      videoUrl: videoUrlInput.trim() || undefined,
      likes: 0,
      hasLiked: false,
      comments: []
    };

    const updated = [newPost, ...posts];
    savePosts(updated);

    // Reset inputs
    setPostContent('');
    setImageUrlInput('');
    setShowAttachImage(false);
    setAttachedFileName('');
    setAttachedFileSize('');
    setShowAttachFile(false);
    setVideoUrlInput('');
    setShowAttachVideo(false);

    onShowToast('success', 'Đăng bài thành công', 'Bài viết đã được chia sẻ lên Diễn đàn Học thuật!');
  };

  // ─── Menu & Post Management Handlers ─────────────────────────────────────
  const handleDeletePost = (postId: string) => {
    if (window.confirm('Thầy/Cô có chắc chắn muốn xóa bài viết này khỏi Diễn đàn không?')) {
      const updated = posts.filter((p) => p.id !== postId);
      savePosts(updated);
      setActiveMenuPostId(null);
      onShowToast('success', 'Đã xóa bài viết', 'Bài viết đã được gỡ khỏi Diễn đàn Học thuật.');
    }
  };

  const handleChangePrivacy = (postId: string, privacy: 'public' | 'department' | 'private') => {
    const updated = posts.map((p) => (p.id === postId ? { ...p, privacy } : p));
    savePosts(updated);
    setActiveMenuPostId(null);
    const labels = {
      public: 'Công khai toàn trường',
      department: 'Nội bộ Khoa',
      private: 'Riêng tư (Chỉ nhóm chia sẻ)',
    };
    onShowToast('info', 'Đã cập nhật quyền riêng tư', `Bài viết hiện được đặt ở chế độ: ${labels[privacy]}.`);
  };

  const handleStartEditPost = (post: ForumPost) => {
    setEditingPost(post);
    setEditContent(post.content);
    setEditTag(post.tag);
    setEditPrivacy(post.privacy || 'public');
    setActiveMenuPostId(null);
  };

  const handleSaveEditPost = () => {
    if (!editingPost) return;
    if (!editContent.trim()) {
      onShowToast('warning', 'Nội dung trống', 'Vui lòng không để trống nội dung bài viết.');
      return;
    }
    const updated = posts.map((p) => {
      if (p.id === editingPost.id) {
        return {
          ...p,
          content: editContent.trim(),
          tag: editTag,
          privacy: editPrivacy,
        };
      }
      return p;
    });
    savePosts(updated);
    setEditingPost(null);
    onShowToast('success', 'Đã lưu chỉnh sửa', 'Bài viết đã được cập nhật thành công.');
  };

  // ─── Share to Q-Group / Friends Handlers ─────────────────────────────────
  const handleOpenShareModal = async (post: ForumPost) => {
    setSharingPost(post);
    setShareNote('');
    setActiveMenuPostId(null);

    let available: any[] = [];
    try {
      const local = localStorage.getItem('quizgen_qgroups');
      if (local) {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed) && parsed.length > 0) {
          available = parsed;
        }
      }
    } catch {}

    if (available.length === 0) {
      try {
        const res = await apiClient.fetch(`${API_BASE}/documents/qgroups`);
        if (res.ok) {
          const data = await res.json();
          if (data?.groups && Array.isArray(data.groups)) {
            available = data.groups;
          }
        }
      } catch {}
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
  };

  const handleSendShareToChat = async () => {
    if (!sharingPost || !selectedShareGroupId) return;
    setIsSendingShare(true);

    const targetGroup = shareTargetGroups.find((g) => g.id === selectedShareGroupId);
    const targetName = targetGroup?.name || targetGroup?.directPartnerName || 'Cuộc trò chuyện';

    const authorDisplayName = `${sharingPost.authorTitle ? sharingPost.authorTitle + ' ' : ''}${sharingPost.authorName}`;
    const previewText = sharingPost.content.length > 140 ? `${sharingPost.content.slice(0, 140)}...` : sharingPost.content;

    const messageText = `📢 [CHIA SẺ TỪ DIỄN ĐÀN HỌC THUẬT]\n📌 Chủ đề: #${sharingPost.tag}\n👤 Tác giả: ${authorDisplayName}\n📝 Trích đoạn: "${previewText}"${shareNote.trim() ? `\n💬 Lời nhắn: ${shareNote.trim()}` : ''}\n👉 Mở Diễn Đàn Học Thuật để xem toàn văn và thảo luận.`;

    const myName = currentUser?.fullName || 'TS. Hồ Anh Vũ';
    const myEmail = currentUser?.email || 'user@uth.edu.vn';

    const newMessage: any = {
      id: `msg-share-${Date.now()}`,
      senderEmail: myEmail,
      senderName: myName,
      senderTitle: currentUser?.academicTitle || 'TS.',
      avatarColor: 'from-indigo-600 to-indigo-800',
      text: messageText,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      attachment: sharingPost.attachmentFileName ? {
        type: 'textbook',
        id: `att-${Date.now()}`,
        name: sharingPost.attachmentFileName,
        size: sharingPost.attachmentFileSize || '1.2 MB',
        subject: sharingPost.tag,
        authorName: authorDisplayName
      } : undefined
    };

    // 1. Send via API
    try {
      await apiClient.fetch(`${API_BASE}/documents/qgroups/${encodeURIComponent(selectedShareGroupId)}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMessage),
      });
    } catch (e) {
      console.warn('Backend sync failed, storing locally:', e);
    }

    // 2. Sync to local storage
    try {
      const local = localStorage.getItem('quizgen_qgroups');
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
        localStorage.setItem('quizgen_qgroups', JSON.stringify(updated));
      }
    } catch {}

    setIsSendingShare(false);
    setSharingPost(null);
    onShowToast('success', 'Chia sẻ thành công', `Đã chia sẻ bài viết vào "${targetName}"!`);
  };

  const handleToggleLike = (postId: string) => {
    const updated = posts.map((p) => {
      if (p.id === postId) {
        const nextLiked = !p.hasLiked;
        return {
          ...p,
          hasLiked: nextLiked,
          likes: nextLiked ? p.likes + 1 : Math.max(0, p.likes - 1)
        };
      }
      return p;
    });
    savePosts(updated);
  };

  const handleAddComment = (postId: string) => {
    if (!commentDraft.trim()) return;

    const updated = posts.map((p) => {
      if (p.id === postId) {
        const newComment = {
          id: `c-${Date.now()}`,
          authorName: currentUser?.fullName || 'TS. Hồ Anh Vũ',
          authorTitle: currentUser?.academicTitle || 'TS.',
          content: commentDraft.trim(),
          timestamp: 'Vừa xong'
        };
        return {
          ...p,
          comments: [...p.comments, newComment]
        };
      }
      return p;
    });

    savePosts(updated);
    setCommentDraft('');
    onShowToast('success', 'Bình luận thành công', 'Ý kiến của Thầy/Cô đã được ghi nhận.');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAttachedFileName(file.name);
      setAttachedFileSize(`${(file.size / (1024 * 1024)).toFixed(1)} MB`);
      setShowAttachFile(true);
      onShowToast('info', 'Đã đính kèm tệp', file.name);
    }
  };

  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setImageUrlInput(event.target.result as string);
          setShowAttachImage(true);
          onShowToast('info', 'Đã tải ảnh lên', file.name);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const TAGS = ['All', 'Hệ Điều Hành', 'Kinh Tế Vi Mô', 'Tư Tưởng HCM', 'Ma Trận Bloom', 'Mẹo Ra Đề', 'Khảo Thí'];

  const filteredPosts = posts.filter((p) => {
    const matchesSearch =
      p.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.authorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.tag.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTag = selectedTagFilter === 'All' || p.tag === selectedTagFilter;
    return matchesSearch && matchesTag;
  });

  return (
    <div
      onClick={() => {
        if (activeMenuPostId) setActiveMenuPostId(null);
      }}
      className="flex-1 p-3.5 sm:p-6 md:p-8 overflow-y-auto space-y-5 bg-[#f7f9fb] text-slate-800 w-full max-w-full overflow-x-hidden relative"
    >
      
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-white/20 text-indigo-200 border border-white/30 shadow-xs">
              <MessageSquare className="w-3.5 h-3.5 text-indigo-300" />
              Diễn Đàn Học Thuật &amp; Trao Đổi Khảo Thí
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Diễn Đàn Giảng Viên
            </h1>
            <p className="text-xs sm:text-sm text-white/80 leading-relaxed">
              Không gian học thuật kết nối các Thầy/Cô: thảo luận ma trận đề thi Bloom, chia sẻ bài giảng, sơ đồ minh họa, tệp giáo trình và video bài học.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => onNavigate('upload')}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <FileText className="w-3.5 h-3.5 text-indigo-300" />
              <span>Vào Thư Viện Giáo Trình</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Create Post Card */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-700 font-black text-sm flex items-center justify-center shrink-0">
            {(currentUser?.fullName || 'TS').slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="text-xs font-extrabold text-slate-900 flex items-center gap-2">
              <span>{currentUser?.academicTitle ? `${currentUser.academicTitle} ` : ''}{currentUser?.fullName || 'TS. Hồ Anh Vũ'}</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                Đang trực tuyến
              </span>
            </div>
            <div className="text-[11px] text-slate-400">
              {(currentUser as any)?.department || 'Khoa Công nghệ Thông tin'}
            </div>
          </div>
        </div>

        <form onSubmit={handleCreatePost} className="space-y-3.5">
          <textarea
            value={postContent}
            onChange={(e) => setPostContent(e.target.value)}
            placeholder="Kính chào Thầy/Cô, Thầy/Cô muốn chia sẻ kinh nghiệm giảng dạy, ma trận đề thi Bloom, hay đăng tải tài liệu/sơ đồ nào?..."
            rows={3}
            className="w-full p-4 text-xs bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:bg-white focus:border-indigo-600 text-slate-800 placeholder-slate-400 resize-none leading-relaxed"
          />

          {/* Attachment Preview Trays */}
          {showAttachImage && (
            <div className="p-3 bg-indigo-50/50 rounded-2xl border border-indigo-200/80 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <ImageIcon className="w-4 h-4 text-indigo-600 shrink-0" />
                {imageUrlInput.startsWith('data:') ? (
                  <span className="font-semibold text-slate-800 truncate">Ảnh đã tải lên từ máy tính</span>
                ) : (
                  <input
                    type="text"
                    value={imageUrlInput}
                    onChange={(e) => setImageUrlInput(e.target.value)}
                    placeholder="Dán đường dẫn ảnh (URL)..."
                    className="bg-white px-3 py-1.5 rounded-xl border border-indigo-200 text-xs w-72 focus:outline-none"
                  />
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setImageUrlInput('');
                  setShowAttachImage(false);
                }}
                className="p-1 text-slate-400 hover:text-rose-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {showAttachFile && (
            <div className="p-3 bg-amber-50/50 rounded-2xl border border-amber-200/80 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <FileText className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="font-semibold text-slate-800 truncate">{attachedFileName || 'Tệp giáo trình / Đề thi'}</span>
                {attachedFileSize && <span className="text-[11px] text-slate-400 font-mono">({attachedFileSize})</span>}
              </div>
              <button
                type="button"
                onClick={() => {
                  setAttachedFileName('');
                  setAttachedFileSize('');
                  setShowAttachFile(false);
                }}
                className="p-1 text-slate-400 hover:text-rose-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {showAttachVideo && (
            <div className="p-3 bg-red-50/50 rounded-2xl border border-red-200/80 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5 flex-1">
                <Video className="w-4 h-4 text-red-600 shrink-0" />
                <input
                  type="text"
                  value={videoUrlInput}
                  onChange={(e) => setVideoUrlInput(e.target.value)}
                  placeholder="Dán liên kết Video YouTube hoặc Google Drive bài giảng..."
                  className="bg-white px-3 py-1.5 rounded-xl border border-red-200 text-xs flex-1 focus:outline-none"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  setVideoUrlInput('');
                  setShowAttachVideo(false);
                }}
                className="p-1 text-slate-400 hover:text-rose-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <label className="p-2 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold">
                <ImageIcon className="w-4 h-4 text-indigo-600" />
                <span className="hidden sm:inline">Ảnh / Sơ đồ</span>
                <input type="file" accept="image/*" onChange={handleImageFileUpload} className="hidden" />
              </label>

              <label className="p-2 rounded-xl text-slate-500 hover:text-amber-600 hover:bg-amber-50 border border-slate-200 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold">
                <FileText className="w-4 h-4 text-amber-600" />
                <span className="hidden sm:inline">Tệp / Giáo trình</span>
                <input type="file" accept=".pdf,.docx,.zip,.xlsx" onChange={handleFileUpload} className="hidden" />
              </label>

              <button
                type="button"
                onClick={() => setShowAttachVideo((prev) => !prev)}
                className="p-2 rounded-xl text-slate-500 hover:text-red-600 hover:bg-red-50 border border-slate-200 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
              >
                <Video className="w-4 h-4 text-red-600" />
                <span className="hidden sm:inline">Video Bài Giảng</span>
              </button>

              <div className="h-5 w-px bg-slate-200 mx-1" />

              <div className="flex items-center gap-1">
                <span className="text-[11px] font-bold text-slate-400">Chủ đề:</span>
                <select
                  value={postTag}
                  onChange={(e) => setPostTag(e.target.value)}
                  className="text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 rounded-xl px-2.5 py-1.5 focus:outline-none focus:bg-white"
                >
                  <option value="Hệ Điều Hành">#Hệ Điều Hành</option>
                  <option value="Kinh Tế Vi Mô">#Kinh Tế Vi Mô</option>
                  <option value="Tư Tưởng HCM">#Tư Tưởng HCM</option>
                  <option value="Ma Trận Bloom">#Ma Trận Bloom</option>
                  <option value="Mẹo Ra Đề">#Mẹo Ra Đề</option>
                  <option value="Khảo Thí">#Khảo Thí</option>
                </select>
              </div>

              <div className="flex items-center gap-1">
                <span className="text-[11px] font-bold text-slate-400">Quyền xem:</span>
                <select
                  value={postPrivacy}
                  onChange={(e) => setPostPrivacy(e.target.value as any)}
                  className="text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 rounded-xl px-2.5 py-1.5 focus:outline-none focus:bg-white"
                >
                  <option value="public">🌐 Toàn trường</option>
                  <option value="department">🏛️ Nội bộ Khoa</option>
                  <option value="private">🔒 Riêng tư</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={!postContent.trim()}
              className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 disabled:opacity-50 text-white text-xs font-extrabold shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Đăng Bài Lên Diễn Đàn</span>
            </button>
          </div>
        </form>
      </div>

      {/* 3. Search and Category Filter Strip */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <Tag className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          {TAGS.map((t) => (
            <button
              key={t}
              onClick={() => setSelectedTagFilter(t)}
              className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                selectedTagFilter === t
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {t === 'All' ? 'Tất cả chủ đề' : `#${t}`}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm bài viết, tác giả..."
            className="w-full pl-8 pr-3.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-indigo-600 text-slate-800 placeholder-slate-400"
          />
        </div>
      </div>

      {/* 4. Posts Feed */}
      <div className="space-y-4">
        {filteredPosts.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 text-center border border-slate-200 text-slate-400 space-y-2">
            <MessageSquare className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-xs font-semibold">Chưa tìm thấy bài viết nào phù hợp.</p>
          </div>
        ) : (
          filteredPosts.map((post) => (
            <div
              key={post.id}
              className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs hover:border-indigo-200 transition-all space-y-4"
            >
              {/* Post Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white font-black text-sm flex items-center justify-center shadow-xs">
                    {post.authorName.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-extrabold text-slate-900 text-xs sm:text-sm flex items-center gap-2">
                      <span>{post.authorTitle ? `${post.authorTitle} ` : ''}{post.authorName}</span>
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                        {post.authorRole}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5">
                      <Building2 className="w-3 h-3 text-slate-400" />
                      <span>{post.department}</span>
                      <span>•</span>
                      <span className="font-mono">{post.timestamp}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 relative">
                  {post.privacy === 'department' && (
                    <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                      <Building2 className="w-3 h-3" />
                      Nội bộ khoa
                    </span>
                  )}
                  {post.privacy === 'private' && (
                    <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                      <Lock className="w-3 h-3" />
                      Riêng tư
                    </span>
                  )}
                  <span className="px-3 py-1 rounded-full text-[11px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200">
                    #{post.tag}
                  </span>

                  {/* Three-dots menu button */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenuPostId((prev) => (prev === post.id ? null : post.id));
                      }}
                      className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                      title="Tùy chọn bài viết"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    {/* Dropdown Menu */}
                    {activeMenuPostId === post.id && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="absolute right-0 top-full mt-1.5 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-30 animate-in fade-in zoom-in-95 duration-150 text-xs"
                      >
                        <button
                          type="button"
                          onClick={() => handleStartEditPost(post)}
                          className="w-full px-3.5 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 font-medium transition-colors cursor-pointer"
                        >
                          <Pencil className="w-4 h-4 text-indigo-600 shrink-0" />
                          <span>Chỉnh sửa bài viết</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenShareModal(post)}
                          className="w-full px-3.5 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 font-medium transition-colors cursor-pointer"
                        >
                          <Share2 className="w-4 h-4 text-teal-600 shrink-0" />
                          <span>Chia sẻ vào Chat / Nhóm</span>
                        </button>

                        <div className="h-px bg-slate-100 my-1" />

                        {/* Privacy Submenu */}
                        <div className="px-3.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Quyền riêng tư
                        </div>
                        <button
                          type="button"
                          onClick={() => handleChangePrivacy(post.id, 'public')}
                          className={`w-full px-3.5 py-1.5 text-left flex items-center justify-between text-xs transition-colors cursor-pointer ${
                            (!post.privacy || post.privacy === 'public')
                              ? 'text-indigo-600 font-bold bg-indigo-50/50'
                              : 'text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <Globe className="w-3.5 h-3.5" />
                            Toàn trường (Công khai)
                          </span>
                          {(!post.privacy || post.privacy === 'public') && <Check className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleChangePrivacy(post.id, 'department')}
                          className={`w-full px-3.5 py-1.5 text-left flex items-center justify-between text-xs transition-colors cursor-pointer ${
                            post.privacy === 'department'
                              ? 'text-indigo-600 font-bold bg-indigo-50/50'
                              : 'text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <Building2 className="w-3.5 h-3.5" />
                            Nội bộ Khoa
                          </span>
                          {post.privacy === 'department' && <Check className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleChangePrivacy(post.id, 'private')}
                          className={`w-full px-3.5 py-1.5 text-left flex items-center justify-between text-xs transition-colors cursor-pointer ${
                            post.privacy === 'private'
                              ? 'text-indigo-600 font-bold bg-indigo-50/50'
                              : 'text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <Lock className="w-3.5 h-3.5" />
                            Riêng tư (Chỉ nhóm chia sẻ)
                          </span>
                          {post.privacy === 'private' && <Check className="w-3.5 h-3.5" />}
                        </button>

                        <div className="h-px bg-slate-100 my-1" />

                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(window.location.href);
                            setActiveMenuPostId(null);
                            onShowToast('info', 'Đã sao chép liên kết', 'Đã lưu đường dẫn bài viết vào bộ nhớ tạm.');
                          }}
                          className="w-full px-3.5 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 font-medium transition-colors cursor-pointer"
                        >
                          <Forward className="w-4 h-4 text-slate-500 shrink-0" />
                          <span>Sao chép liên kết</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeletePost(post.id)}
                          className="w-full px-3.5 py-2 text-left text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 font-bold transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4 text-rose-600 shrink-0" />
                          <span>Xóa bài viết</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Post Content */}
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                {post.content}
              </p>

              {/* Attached Image */}
              {post.imageUrl && (
                <div className="rounded-2xl overflow-hidden border border-slate-200 max-h-96 bg-slate-100">
                  <img
                    src={post.imageUrl}
                    alt="Minh họa bài viết"
                    className="w-full h-full object-cover max-h-96 hover:scale-101 transition-transform cursor-pointer"
                    onClick={() => window.open(post.imageUrl, '_blank')}
                  />
                </div>
              )}

              {/* Attached Document File Card */}
              {post.attachmentFileName && (
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="truncate">
                      <div className="font-extrabold text-slate-900 truncate">{post.attachmentFileName}</div>
                      <div className="text-[11px] text-slate-400 font-mono">Tệp đính kèm học thuật {post.attachmentFileSize ? `• ${post.attachmentFileSize}` : ''}</div>
                    </div>
                  </div>

                  <button
                    onClick={() => onShowToast('info', 'Tải tài liệu', `Đang tải tệp ${post.attachmentFileName}`)}
                    className="px-3 py-1.5 bg-white hover:bg-slate-100 rounded-xl border border-slate-200 font-bold text-slate-700 text-xs shrink-0 cursor-pointer shadow-2xs"
                  >
                    Tải về
                  </button>
                </div>
              )}

              {/* Attached Video */}
              {post.videoUrl && (
                <div className="p-3 bg-red-50/50 rounded-2xl border border-red-200 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <Video className="w-4 h-4 text-red-600 shrink-0" />
                    <span className="font-bold text-slate-800 truncate">Video bài giảng đính kèm:</span>
                    <a
                      href={post.videoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-red-700 font-semibold hover:underline truncate"
                    >
                      {post.videoUrl}
                    </a>
                  </div>
                  <a
                    href={post.videoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 text-red-600 hover:text-red-800"
                    title="Mở video"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              )}

              {/* Actions Bar */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => handleToggleLike(post.id)}
                    className={`flex items-center gap-1.5 font-bold transition-colors cursor-pointer ${
                      post.hasLiked ? 'text-rose-600' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <ThumbsUp className={`w-4 h-4 ${post.hasLiked ? 'fill-rose-600' : ''}`} />
                    <span>{post.likes} Hữu ích</span>
                  </button>

                  <button
                    onClick={() => setActiveCommentPostId((prev) => (prev === post.id ? null : post.id))}
                    className="flex items-center gap-1.5 font-bold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>{post.comments.length} Bình luận</span>
                  </button>

                  <button
                    onClick={() => handleOpenShareModal(post)}
                    className="flex items-center gap-1.5 font-bold text-slate-500 hover:text-indigo-600 transition-colors cursor-pointer"
                    title="Chia sẻ vào tin nhắn với bạn bè hoặc nhóm Q-Group"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Chia sẻ</span>
                  </button>
                </div>

                <div className="text-[11px] text-slate-400 font-semibold flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Xác thực Giảng viên</span>
                </div>
              </div>

              {/* Comments Section */}
              {(activeCommentPostId === post.id || post.comments.length > 0) && (
                <div className="pt-3 border-t border-slate-100 space-y-3">
                  {/* Comments List */}
                  {post.comments.map((cm) => (
                    <div key={cm.id} className="bg-slate-50 rounded-2xl p-3 sm:p-3.5 space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <strong className="text-slate-900 font-extrabold text-[11px]">
                          {cm.authorTitle ? `${cm.authorTitle} ` : ''}{cm.authorName}
                        </strong>
                        <span className="text-[10px] text-slate-400 font-mono">{cm.timestamp}</span>
                      </div>
                      <p className="text-slate-700 text-xs leading-relaxed">{cm.content}</p>
                    </div>
                  ))}

                  {/* Comment Input */}
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      value={activeCommentPostId === post.id ? commentDraft : ''}
                      onChange={(e) => {
                        setActiveCommentPostId(post.id);
                        setCommentDraft(e.target.value);
                      }}
                      onFocus={() => setActiveCommentPostId(post.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddComment(post.id);
                        }
                      }}
                      placeholder="Viết phản hồi hoặc đóng góp ý kiến cho bài viết..."
                      className="flex-1 px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-indigo-600 text-slate-800 placeholder-slate-400"
                    />
                    <button
                      onClick={() => handleAddComment(post.id)}
                      disabled={activeCommentPostId !== post.id || !commentDraft.trim()}
                      className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                    >
                      <Send className="w-3 h-3" />
                      <span className="hidden sm:inline">Gửi</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* ─── 5. Modal Chỉnh Sửa Bài Viết ───────────────────────────────────── */}
      {editingPost && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setEditingPost(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden space-y-4 p-6 animate-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">Chỉnh Sửa Bài Viết</h3>
                  <p className="text-[11px] text-slate-400">Cập nhật nội dung và thiết lập quyền riêng tư</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingPost(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Nội dung bài viết:</label>
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  rows={4}
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:bg-white focus:border-indigo-600 text-slate-800 leading-relaxed resize-none"
                  placeholder="Nhập nội dung bài viết..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Chủ đề (#tag):</label>
                  <select
                    value={editTag}
                    onChange={(e) => setEditTag(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-semibold focus:outline-none focus:bg-white focus:border-indigo-600"
                  >
                    <option value="Hệ Điều Hành">#Hệ Điều Hành</option>
                    <option value="Kinh Tế Vi Mô">#Kinh Tế Vi Mô</option>
                    <option value="Tư Tưởng HCM">#Tư Tưởng HCM</option>
                    <option value="Ma Trận Bloom">#Ma Trận Bloom</option>
                    <option value="Mẹo Ra Đề">#Mẹo Ra Đề</option>
                    <option value="Khảo Thí">#Khảo Thí</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Quyền riêng tư:</label>
                  <select
                    value={editPrivacy}
                    onChange={(e) => setEditPrivacy(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-semibold focus:outline-none focus:bg-white focus:border-indigo-600"
                  >
                    <option value="public">🌐 Toàn trường (Công khai)</option>
                    <option value="department">🏛️ Nội bộ Khoa</option>
                    <option value="private">🔒 Riêng tư (Chỉ nhóm)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingPost(null)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-bold transition-all cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleSaveEditPost}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Lưu Thay Đổi</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── 6. Modal Chia Sẻ Vào Q-Group & Tin Nhắn ────────────────────────── */}
      {sharingPost && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setSharingPost(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden space-y-4 p-6 animate-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center">
                  <Share2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">Chia Sẻ Vào Cuộc Trò Chuyện</h3>
                  <p className="text-[11px] text-slate-400">Gửi bài viết đến Hội nhóm Q-Group hoặc Đồng nghiệp</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSharingPost(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Trích dẫn bài viết preview */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-indigo-700 text-[11px]">
                  #{sharingPost.tag} • {sharingPost.authorTitle ? `${sharingPost.authorTitle} ` : ''}{sharingPost.authorName}
                </span>
                <span className="text-[10px] text-slate-400">{sharingPost.timestamp}</span>
              </div>
              <p className="text-slate-600 line-clamp-2 text-xs italic">
                "{sharingPost.content}"
              </p>
              {sharingPost.attachmentFileName && (
                <div className="pt-1 flex items-center gap-2 text-[11px] text-amber-700 font-semibold">
                  <FileText className="w-3.5 h-3.5" />
                  <span className="truncate">{sharingPost.attachmentFileName}</span>
                </div>
              )}
            </div>

            {/* Danh sách phòng chat / bạn bè để chọn */}
            <div className="space-y-2 text-xs">
              <label className="block text-[11px] font-bold text-slate-700">
                Chọn phòng trò chuyện nhận tin:
              </label>
              <div className="max-h-48 overflow-y-auto space-y-1.5 border border-slate-200 rounded-2xl p-2 bg-slate-50/50">
                {shareTargetGroups.map((g) => {
                  const isSelected = selectedShareGroupId === g.id;
                  const label = g.name || g.directPartnerName || 'Hội nhóm Q-Group';
                  const isDm = !!g.isDirect;
                  return (
                    <div
                      key={g.id}
                      onClick={() => setSelectedShareGroupId(g.id)}
                      className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-teal-50 border border-teal-300 text-teal-900 shadow-2xs'
                          : 'bg-white hover:bg-slate-100 border border-slate-200/80 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                            isDm ? 'bg-indigo-100 text-indigo-700' : 'bg-teal-100 text-teal-700'
                          }`}
                        >
                          {isDm ? (
                            <UserCheck className="w-3.5 h-3.5" />
                          ) : (
                            <Users className="w-3.5 h-3.5" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-extrabold text-xs truncate">{label}</div>
                          <div className="text-[10px] text-slate-400">
                            {isDm ? 'Tin nhắn riêng 1-1' : `${g.memberCount || 2} thành viên`}
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0 pl-2">
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            isSelected ? 'border-teal-600 bg-teal-600 text-white' : 'border-slate-300'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Lời nhắn gửi kèm */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Lời nhắn gửi kèm (tùy chọn):
              </label>
              <input
                type="text"
                value={shareNote}
                onChange={(e) => setShareNote(e.target.value)}
                placeholder="Ví dụ: Kính mời Thầy/Cô tham khảo sơ đồ này..."
                className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-teal-600 text-slate-800"
              />
            </div>

            {/* Nút hành động */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSharingPost(null)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-bold transition-all cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={!selectedShareGroupId || isSendingShare}
                onClick={handleSendShareToChat}
                className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSendingShare ? 'Đang gửi...' : 'Gửi Vào Trò Chuyện'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ForumScreen;
