import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  FileText,
  Send,
  ThumbsUp,
  Share2,
  Paperclip,
  X,
  Search,
  Bookmark,
  Building2,
  MoreVertical,
  Pencil,
  Trash2,
  Check,
  Users,
  UserCheck,
  Plus,
  ChevronDown,
  ChevronUp,
  Download,
  Link as LinkIcon,
  Image as ImageIcon,
  ExternalLink,
  HelpCircle,
  BookOpen,
  CornerDownRight,
  Clock,
  Loader2,
  Maximize2,
} from 'lucide-react';
import { UserProfile, ScreenId } from '../types';
import apiClient, { API_BASE } from '../services/apiClient';
import { ImageLightboxModal } from './ImageLightboxModal';

interface ForumScreenProps {
  currentUser?: UserProfile | null;
  onNavigate: (screen: ScreenId) => void;
  onShowToast: (type: 'success' | 'info' | 'warning' | 'error', title: string, message: string) => void;
}

export interface ForumPost {
  id: string;
  title: string;
  authorEmail?: string;
  authorName: string;
  authorTitle?: string;
  authorRole: string;
  department: string;
  createdAt: string; // ISO 8601 string for precise live dynamic time-ago
  timestamp?: string; // fallback
  category: 'exam' | 'qa' | 'textbook';
  tags: string[];
  tag?: string; // Backwards compatibility
  content: string;
  imageUrl?: string;
  attachmentFileName?: string;
  attachmentFileSize?: string;
  attachmentUrl?: string;
  videoUrl?: string;
  linkUrl?: string;
  linkLabel?: string;
  likes: number;
  hasLiked?: boolean;
  isBookmarked?: boolean;
  comments: Array<{
    id: string;
    authorEmail?: string;
    authorName: string;
    authorTitle?: string;
    content: string;
    createdAt: string;
    timestamp?: string;
  }>;
}

// Chuẩn hóa tiếng Việt không dấu để tìm kiếm chính xác
const removeVietnameseTones = (str: string) => {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
};

// Định dạng thời gian tương đối chuẩn xác theo mốc thời gian thực
export const formatTimeAgo = (dateStr: string) => {
  if (!dateStr) return 'Vừa xong';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;

  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffSec < 45) return 'Vừa xong';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} phút trước`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} giờ trước`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay === 1) {
    const timeStr = date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    return `Hôm qua lúc ${timeStr}`;
  }
  if (diffDay < 7) return `${diffDay} ngày trước`;
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

// Làm sạch tên cuộc trò chuyện 1-1 (bỏ tên chính mình, chỉ hiển thị đối tác)
export const getCleanChatName = (g: any, myName: string, myEmail: string) => {
  if (g.directPartnerName) {
    return g.directPartnerName;
  }
  if (g.isDirect || g.type === 'direct') {
    if (g.name && g.name.includes(' & ')) {
      const parts = g.name.split(' & ').map((s: string) => s.trim());
      const partner = parts.find(
        (p: string) =>
          !p.toLowerCase().includes(myName.toLowerCase()) &&
          !myName.toLowerCase().includes(p.toLowerCase())
      );
      if (partner) return partner;
    }
    if (g.members && Array.isArray(g.members)) {
      const other = g.members.find((m: string) => m.toLowerCase() !== myEmail.toLowerCase());
      if (other) return other.split('@')[0];
    }
  }
  return g.name || 'Cuộc trò chuyện';
};

const NOW = Date.now();
const DEFAULT_POSTS: ForumPost[] = [
  {
    id: 'post-1',
    title: 'Ma trận phân bổ 40 câu trắc nghiệm Bloom học phần Hệ Điều Hành (Kỳ 1 - 2026)',
    authorName: 'TS. Hồ Anh Vũ',
    authorTitle: 'TS.',
    authorRole: 'Trưởng bộ môn Khoa học Máy tính',
    department: 'Khoa Công nghệ Thông tin',
    createdAt: new Date(NOW - 35 * 60 * 1000).toISOString(), // 35 phút trước
    category: 'exam',
    tags: ['CS101', 'HeDieuHanh', 'Bloom40Cau'],
    content: 'Tôi vừa hoàn tất bóc tách và phân đoạn RAG trọn bộ 1.278 trang giáo trình "Operating System Concepts 10th".\n\nKính gửi quý Thầy/Cô sơ đồ kiến trúc bộ nhớ ảo và file ma trận mẫu 40 câu trắc nghiệm theo 4 mức nhận thức Bloom đính kèm. Thầy/Cô có thể tải trực tiếp file Word bên dưới về máy để tham khảo hoặc đưa vào AI để sinh đề giữa kỳ chuẩn xác nhé!',
    imageUrl: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=800&q=80',
    attachmentFileName: 'Ma_Tran_De_Thi_He_Dieu_Hanh_Bloom_40Cau.docx',
    attachmentFileSize: '2.0 MB',
    attachmentUrl: '/api/v1/documents/qgroups/attachments/sample_matran_bloom_40cau.docx',
    linkUrl: 'https://www.youtube.com/watch?v=26QPDBe-NB8',
    linkLabel: 'Video bài giảng: Bộ nhớ ảo & Phân trang',
    likes: 18,
    hasLiked: false,
    comments: [
      {
        id: 'c-1',
        authorName: 'ThS. Nguyễn Văn Tân',
        authorTitle: 'ThS.',
        content: 'Tài liệu cực kỳ chi tiết Thầy Vũ ơi! Em vừa thử sinh đề trắc nghiệm chương Quản lý Bộ nhớ, tỷ lệ bám sát giáo trình đạt gần 100%.',
        createdAt: new Date(NOW - 20 * 60 * 1000).toISOString()
      },
      {
        id: 'c-2',
        authorName: 'Ngô Phạm Công Đức',
        authorTitle: 'KS.',
        content: 'Thầy cho em hỏi phần xuất bản phiếu OMR 4 mã đề có cần căn chỉnh thêm lề in A4 không ạ? Bộ ReportLab em đã đồng bộ sẵn rồi.',
        createdAt: new Date(NOW - 10 * 60 * 1000).toISOString()
      }
    ]
  },
  {
    id: 'post-2',
    title: 'Cách phân bổ tỷ lệ câu hỏi trắc nghiệm phủ hết 12 chương môn Lý luận Chính trị',
    authorName: 'ThS. Hân Bích',
    authorTitle: 'ThS.',
    authorRole: 'Giảng viên',
    department: 'Khoa Lý luận Chính trị',
    createdAt: new Date(NOW - 4 * 60 * 60 * 1000).toISOString(), // 4 giờ trước
    category: 'qa',
    tags: ['TuTuongHCM', 'HoiDapLLCT'],
    content: 'Kính gửi các Thầy/Cô bộ môn LLCT, em đã chia sẻ bộ slide bài giảng và giáo trình chuẩn 12 chương (102 trang) vào Thư Viện Giáo Trình.\n\nKinh nghiệm biên soạn đề thi: Với môn Lý luận, nên chú trọng các câu hỏi mức Thông hiểu và Vận dụng phân tích bối cảnh lịch sử để sinh viên tránh học vẹt. Mời các Thầy/Cô xem tài liệu đề cương hướng dẫn phân bổ đính kèm bên dưới.',
    linkUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    linkLabel: 'Video bài giảng: Hướng dẫn ma trận đề thi',
    attachmentFileName: 'Huong_Dan_Phan_Bo_Ma_Tran_LLCT_2026.pdf',
    attachmentFileSize: '850 KB',
    attachmentUrl: '/api/v1/documents/qgroups/attachments/sample_huongdan_llct.pdf',
    likes: 14,
    hasLiked: false,
    comments: []
  },
  {
    id: 'post-3',
    title: 'Cập nhật hướng dẫn thiết lập tỷ lệ Bloom chuẩn khảo thí năm học 2026 - 2027',
    authorName: 'Huỳnh Hồ Hiếu Hiệu',
    authorTitle: 'KTS.',
    authorRole: 'Chuyên viên Khảo thí',
    department: 'Phòng Đào tạo & Khảo thí',
    createdAt: new Date(NOW - 26 * 60 * 60 * 1000).toISOString(), // Hôm qua
    category: 'textbook',
    tags: ['KhaoThi', 'PresetBloom', 'QuyDinh2026'],
    content: 'Cập nhật hướng dẫn mới nhất về thiết lập tỷ lệ Bloom chuẩn khảo thí năm học 2026 - 2027:\n- Đề kiểm tra 15 phút: 10 câu (50% Nhận biết, 30% Thông hiểu, 20% Vận dụng)\n- Đề kiểm tra Giữa kỳ: 20 câu (40% Nhận biết, 30% Thông hiểu, 20% Vận dụng, 10% Vận dụng cao)\n- Đề thi Kết thúc học phần: 40 câu (30% Nhận biết, 30% Thông hiểu, 25% Vận dụng, 15% Vận dụng cao)\n\nThầy/Cô vào Bước 2 chỉ cần bấm chọn Preset tương ứng là AI tự động chia số câu chuẩn xác!',
    linkUrl: 'https://khaothi.uth.edu.vn/quy-dinh-de-thi-2026',
    linkLabel: 'Cổng thông tin Quy chế Khảo thí UTH',
    likes: 25,
    hasLiked: true,
    comments: []
  }
];

export const ForumScreen: React.FC<ForumScreenProps> = ({
  currentUser,
  onNavigate,
  onShowToast,
}) => {
  const [posts, setPosts] = useState<ForumPost[]>(() => {
    try {
      const saved = localStorage.getItem('quizgen_academic_forum_posts_v3');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((p: any) => ({
            ...p,
            category: p.category === 'general' ? 'qa' : p.category,
            tags: Array.isArray(p.tags) ? p.tags.filter((t: string) => t && t !== 'Chung') : [],
          }));
        }
      }
    } catch {}
    return DEFAULT_POSTS;
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'exam' | 'qa' | 'textbook'>('all');
  const [filterWithFileOnly, setFilterWithFileOnly] = useState(false);

  // Comments Visibility State (Mặc định ẩn, bấm vào mới sổ ra)
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});

  // Inline Comment Editing State
  const [editingComment, setEditingComment] = useState<{ postId: string; commentId: string; text: string } | null>(null);

  // Composer State
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<'exam' | 'qa' | 'textbook'>('exam');
  const [newContent, setNewContent] = useState('');
  const [newTags, setNewTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  // Composer Attachments State
  const [showAttachFile, setShowAttachFile] = useState(false);
  const [attachedFileName, setAttachedFileName] = useState('');
  const [attachedFileSize, setAttachedFileSize] = useState('');
  const [attachedFileUrl, setAttachedFileUrl] = useState('');
  const [isUploadingFile, setIsUploadingFile] = useState(false);

  const [showAttachImage, setShowAttachImage] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [lightboxImageUrl, setLightboxImageUrl] = useState<string | null>(null);

  const [showAttachLink, setShowAttachLink] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkLabel, setLinkLabel] = useState('');

  // Edit Post Modal State
  const [editingPost, setEditingPost] = useState<ForumPost | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editCategory, setEditCategory] = useState<'exam' | 'qa' | 'textbook'>('exam');

  // Share Modal State
  const [sharingPost, setSharingPost] = useState<ForumPost | null>(null);
  const [shareTargetGroups, setShareTargetGroups] = useState<any[]>([]);
  const [selectedShareGroupId, setSelectedShareGroupId] = useState<string>('');
  const [shareSearch, setShareSearch] = useState('');
  const [shareNote, setShareNote] = useState('');
  const [isSendingShare, setIsSendingShare] = useState(false);

  // Active Menu Dropdown ID
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const savePosts = (updated: ForumPost[]) => {
    setPosts(updated);
    try {
      localStorage.setItem('quizgen_academic_forum_posts_v3', JSON.stringify(updated));
    } catch {}
  };

  // Add / Remove dynamic custom tags
  const handleAddTag = () => {
    const clean = tagInput.trim().replace(/^#/, '').replace(/\s+/g, '_');
    if (clean && !newTags.includes(clean)) {
      setNewTags([...newTags, clean]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setNewTags(newTags.filter((t) => t !== tagToRemove));
  };

  // Create Post
  const handleCreatePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      onShowToast('warning', 'Thiếu tiêu đề', 'Vui lòng nhập tiêu đề cho cuộc thảo luận.');
      return;
    }
    if (!newContent.trim()) {
      onShowToast('warning', 'Thiếu nội dung', 'Vui lòng nhập nội dung chi tiết.');
      return;
    }

    // Tự động gom tag nếu người dùng gõ mà chưa bấm Enter
    const pendingTag = tagInput.trim().replace(/^#/, '').replace(/\s+/g, '_');
    const finalTags = [...newTags];
    if (pendingTag && !finalTags.includes(pendingTag)) {
      finalTags.push(pendingTag);
    }

    const nowIso = new Date().toISOString();
    const newPost: ForumPost = {
      id: `post-${Date.now()}`,
      title: newTitle.trim(),
      authorEmail: currentUser?.email,
      authorName: currentUser?.fullName || 'TS. Hồ Anh Vũ',
      authorTitle: currentUser?.academicTitle || 'TS.',
      authorRole: currentUser?.role === 'admin' ? 'Quản trị viên' : 'Giảng viên',
      department: (currentUser as any)?.department || 'Khoa Công nghệ Thông tin',
      createdAt: nowIso,
      category: newCategory,
      tags: finalTags,
      content: newContent.trim(),
      imageUrl: imageUrl.trim() || undefined,
      attachmentFileName: attachedFileName.trim() || undefined,
      attachmentFileSize: attachedFileSize.trim() || undefined,
      attachmentUrl: attachedFileUrl.trim() || undefined,
      linkUrl: linkUrl.trim() || undefined,
      linkLabel: linkLabel.trim() || undefined,
      likes: 0,
      hasLiked: false,
      comments: []
    };

    savePosts([newPost, ...posts]);

    // Reset Form
    setNewTitle('');
    setNewContent('');
    setNewTags([]);
    setTagInput('');
    setShowAttachFile(false);
    setAttachedFileName('');
    setAttachedFileSize('');
    setAttachedFileUrl('');
    setShowAttachImage(false);
    setImageUrl('');
    setShowAttachLink(false);
    setLinkUrl('');
    setLinkLabel('');
    setIsComposerOpen(false);

    onShowToast('success', 'Đã đăng thảo luận', 'Chủ đề của Thầy/Cô đã được đưa lên Diễn đàn.');
  };

  // Real File Upload to Document Service
  const handleSelectLocalFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      onShowToast('warning', 'Tệp quá lớn', 'Hệ thống hỗ trợ đính kèm tối đa 25MB.');
      return;
    }

    setAttachedFileName(file.name);
    const sizeStr =
      file.size > 1024 * 1024
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
        : `${Math.round(file.size / 1024)} KB`;
    setAttachedFileSize(sizeStr);
    setShowAttachFile(true);
    setIsUploadingFile(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await apiClient
        .fetch(`${API_BASE}/documents/qgroups/upload-attachment`, {
          method: 'POST',
          body: formData,
        })
        .then((r) => r.json());

      if (res && res.fileUrl) {
        setAttachedFileUrl(res.fileUrl);
        onShowToast('success', 'Tải tệp lên hoàn tất', `${file.name} (${sizeStr})`);
      } else {
        throw new Error(res?.detail || 'Lỗi lưu trữ tệp trên máy chủ');
      }
    } catch (err: any) {
      console.warn('Backend upload fallback:', err);
      // Fallback: Create direct browser Blob URL to guarantee real bytes
      const localUrl = URL.createObjectURL(file);
      setAttachedFileUrl(localUrl);
      onShowToast('info', 'Đã gắn tệp', `${file.name} (${sizeStr})`);
    } finally {
      setIsUploadingFile(false);
    }
  };

  // Real File Download Handler (Tải file nguyên bản, KHÔNG sinh file 1KB rác)
  const handleDownloadFile = (fileName: string, fileUrl?: string) => {
    if (!fileUrl) {
      onShowToast('warning', 'Không tìm thấy tệp', `Tệp "${fileName}" chưa được khởi tạo trên máy chủ.`);
      return;
    }

    const fullUrl =
      fileUrl.startsWith('http') || fileUrl.startsWith('blob:')
        ? fileUrl
        : `${API_BASE}${fileUrl}`;

    const link = document.createElement('a');
    link.href = fullUrl;
    link.download = fileName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    onShowToast('success', 'Đang tải tệp', `Đang tải xuống "${fileName}"...`);
  };

  // Like Toggle
  const handleToggleLike = (postId: string) => {
    const updated = posts.map((p) => {
      if (p.id === postId) {
        const next = !p.hasLiked;
        return {
          ...p,
          hasLiked: next,
          likes: next ? p.likes + 1 : Math.max(0, p.likes - 1)
        };
      }
      return p;
    });
    savePosts(updated);
  };

  // Add Comment
  const handleAddComment = (postId: string) => {
    const draft = replyDrafts[postId]?.trim();
    if (!draft) return;

    const newC = {
      id: `c-${Date.now()}`,
      authorEmail: currentUser?.email,
      authorName: currentUser?.fullName || 'TS. Hồ Anh Vũ',
      authorTitle: currentUser?.academicTitle || 'TS.',
      content: draft,
      createdAt: new Date().toISOString()
    };

    const updated = posts.map((p) =>
      p.id === postId ? { ...p, comments: [...p.comments, newC] } : p
    );

    savePosts(updated);
    setReplyDrafts({ ...replyDrafts, [postId]: '' });
    setExpandedComments({ ...expandedComments, [postId]: true });
    onShowToast('success', 'Đã gửi phản hồi', 'Ý kiến của Thầy/Cô đã được đăng vào chủ đề.');
  };

  // Edit Comment
  const handleSaveEditComment = () => {
    if (!editingComment) return;
    if (!editingComment.text.trim()) {
      onShowToast('warning', 'Nội dung trống', 'Vui lòng không để trống phản hồi.');
      return;
    }

    const updated = posts.map((p) => {
      if (p.id === editingComment.postId) {
        const newComments = p.comments.map((c) =>
          c.id === editingComment.commentId ? { ...c, content: editingComment.text.trim() } : c
        );
        return { ...p, comments: newComments };
      }
      return p;
    });

    savePosts(updated);
    setEditingComment(null);
    onShowToast('success', 'Cập nhật thành công', 'Phản hồi đã được chỉnh sửa.');
  };

  // Delete Comment
  const handleDeleteComment = (postId: string, commentId: string) => {
    if (window.confirm('Thầy/Cô có chắc chắn muốn xóa phản hồi này không?')) {
      const updated = posts.map((p) => {
        if (p.id === postId) {
          return { ...p, comments: p.comments.filter((c) => c.id !== commentId) };
        }
        return p;
      });
      savePosts(updated);
      onShowToast('success', 'Đã xóa phản hồi', 'Phản hồi đã được gỡ bỏ.');
    }
  };

  // Delete Post
  const handleDeletePost = (postId: string) => {
    if (window.confirm('Thầy/Cô có chắc chắn muốn xóa chủ đề thảo luận này không?')) {
      savePosts(posts.filter((p) => p.id !== postId));
      setActiveMenuId(null);
      onShowToast('success', 'Đã xóa', 'Chủ đề đã được gỡ bỏ khỏi Diễn đàn.');
    }
  };

  // Edit Post
  const handleSaveEditPost = () => {
    if (!editingPost) return;
    if (!editTitle.trim() || !editContent.trim()) {
      onShowToast('warning', 'Thiếu thông tin', 'Vui lòng không để trống tiêu đề hoặc nội dung.');
      return;
    }
    const updated = posts.map((p) =>
      p.id === editingPost.id
        ? { ...p, title: editTitle.trim(), content: editContent.trim(), category: editCategory }
        : p
    );
    savePosts(updated);
    setEditingPost(null);
    onShowToast('success', 'Cập nhật thành công', 'Nội dung chủ đề đã được lưu thay đổi.');
  };

  // Share to QGroup Modal
  const handleOpenShareModal = async (post: ForumPost) => {
    setSharingPost(post);
    setShareNote('');
    setShareSearch('');
    setActiveMenuId(null);

    let available: any[] = [];
    try {
      const myEmail = currentUser?.email || '';
      const storageKey = myEmail ? `quizgen_qgroups_${myEmail}` : 'quizgen_qgroups';
      const local = localStorage.getItem(storageKey) || localStorage.getItem('quizgen_qgroups');
      if (local) {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed) && parsed.length > 0) available = parsed;
      }
    } catch {}

    if (available.length === 0) {
      try {
        const res = await apiClient.fetch(`${API_BASE}/documents/qgroups`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) available = data;
          else if (data?.groups) available = data.groups;
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

  const handleSendShare = async () => {
    if (!sharingPost || !selectedShareGroupId) return;
    setIsSendingShare(true);

    const myName = currentUser?.fullName || 'Vũ Anh';
    const myEmail = currentUser?.email || 'user@uth.edu.vn';
    const targetGroup = shareTargetGroups.find((g) => g.id === selectedShareGroupId);
    const targetName = targetGroup
      ? getCleanChatName(targetGroup, myName, myEmail)
      : 'Cuộc trò chuyện';

    const newMessage: any = {
      id: `msg-share-${Date.now()}`,
      senderEmail: myEmail,
      senderName: myName,
      senderTitle: currentUser?.academicTitle || 'TS.',
      avatarColor: 'bg-slate-700',
      text: shareNote.trim() || undefined,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      sharedPost: {
        id: sharingPost.id,
        tag: (sharingPost.tags && sharingPost.tags.filter((t) => t && t !== 'Chung')[0]) || 'Chuyên môn',
        authorName: `${sharingPost.authorTitle ? sharingPost.authorTitle + ' ' : ''}${sharingPost.authorName}`,
        department: sharingPost.department,
        content: sharingPost.content.slice(0, 150) + '...',
        fullContent: sharingPost.content,
        attachmentFileName: sharingPost.attachmentFileName,
        attachmentFileSize: sharingPost.attachmentFileSize,
        timestamp: formatTimeAgo(sharingPost.createdAt || sharingPost.timestamp || ''),
        note: shareNote.trim() || undefined,
      }
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
    setSharingPost(null);
    onShowToast('success', 'Đã chia sẻ thành công', `Đã chuyển liên kết chủ đề vào "${targetName}".`);
  };

  const handleSelectLocalImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          setImageUrl(ev.target.result as string);
          setShowAttachImage(true);
          onShowToast('info', 'Đã đính kèm ảnh', file.name);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Filter Logic
  const filteredPosts = posts.filter((p) => {
    // 1. Phân loại theo chuyên mục
    if (selectedCategory !== 'all' && p.category !== selectedCategory) {
      return false;
    }

    // 2. Lọc bài có tệp đính kèm
    if (filterWithFileOnly && !p.attachmentFileName && !p.imageUrl && !p.videoUrl && !p.linkUrl) {
      return false;
    }

    // 3. Tìm kiếm tiếng Việt không dấu
    if (searchQuery.trim()) {
      const q = removeVietnameseTones(searchQuery);
      const titleMatch = removeVietnameseTones(p.title).includes(q);
      const contentMatch = removeVietnameseTones(p.content).includes(q);
      const authorMatch = removeVietnameseTones(p.authorName).includes(q);
      const deptMatch = removeVietnameseTones(p.department).includes(q);
      const tagMatch = p.tags.some((t) => removeVietnameseTones(t).includes(q));

      if (!titleMatch && !contentMatch && !authorMatch && !deptMatch && !tagMatch) {
        return false;
      }
    }

    return true;
  });

  // Filter Target Groups in Share Modal
  const myName = currentUser?.fullName || 'Vũ Anh';
  const myEmail = currentUser?.email || 'user@uth.edu.vn';

  const filteredShareGroups = shareTargetGroups.filter((g) => {
    const cleanLabel = getCleanChatName(g, myName, myEmail);
    if (!shareSearch.trim()) return true;
    return removeVietnameseTones(cleanLabel).includes(removeVietnameseTones(shareSearch));
  });

  return (
    <div
      onClick={() => {
        if (activeMenuId) setActiveMenuId(null);
      }}
      className="flex-1 flex flex-col h-full overflow-hidden bg-[#f8fafc] text-slate-800"
    >
      {/* ─── 1. TOP EXECUTIVE HEADER (Tối ưu cực đại cho mobile) ─────────── */}
      <header className="bg-white border-b border-slate-200 px-3 sm:px-6 py-2 sm:py-2.5 shrink-0 shadow-2xs">
        <div className="flex items-center justify-between gap-2 sm:gap-3 max-w-5xl mx-auto w-full">
          <div className="shrink-0">
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-[10px] font-bold tracking-wider uppercase text-slate-400">Không Gian Trao Đổi</span>
            </div>
            <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight leading-tight">
              Diễn Đàn Chuyên Môn
            </h1>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 flex-1 justify-end max-w-md">
            {/* Search Input */}
            <div className="relative flex-1 max-w-[200px] sm:max-w-xs">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm môn, tác giả, đề..."
                className="w-full pl-8 pr-7 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-slate-800 text-slate-800 placeholder-slate-400 transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* New Discussion Button */}
            <button
              type="button"
              onClick={() => setIsComposerOpen(true)}
              className="px-2.5 sm:px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shrink-0"
              title="Tạo chủ đề thảo luận mới"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Tạo thảo luận</span>
            </button>
          </div>
        </div>

        {/* Categories Bar & Filter Chips (1 hàng ngang cuộn mượt duy nhất) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-1.5 mt-1.5 border-t border-slate-100 max-w-5xl mx-auto w-full text-xs scrollbar-none whitespace-nowrap">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-md text-xs font-semibold transition-all cursor-pointer shrink-0 ${
              selectedCategory === 'all'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
            title="Xem tất cả các bài viết"
          >
            Tất cả
          </button>

          <button
            type="button"
            onClick={() => setSelectedCategory('exam')}
            className={`px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1 cursor-pointer shrink-0 ${
              selectedCategory === 'exam'
                ? 'bg-slate-900 text-white font-semibold'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
            title="Đề thi & Ma trận Bloom"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Đề thi &amp; Ma trận</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedCategory('qa')}
            className={`px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1 cursor-pointer shrink-0 ${
              selectedCategory === 'qa'
                ? 'bg-slate-900 text-white font-semibold'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
            title="Hỏi đáp Khảo thí & Nghiệp vụ"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Hỏi đáp Khảo thí</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedCategory('textbook')}
            className={`px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1 cursor-pointer shrink-0 ${
              selectedCategory === 'textbook'
                ? 'bg-slate-900 text-white font-semibold'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
            title="Giáo trình & Học liệu RAG"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Giáo trình &amp; Học liệu</span>
          </button>

          <div className="h-3.5 w-[1px] bg-slate-200 mx-0.5 shrink-0"></div>

          <button
            type="button"
            onClick={() => setFilterWithFileOnly(!filterWithFileOnly)}
            className={`px-2.5 py-0.5 sm:py-1 rounded-md text-xs transition-all flex items-center gap-1 font-medium cursor-pointer shrink-0 border ${
              filterWithFileOnly
                ? 'bg-slate-900 border-slate-900 text-white font-semibold shadow-2xs'
                : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300'
            }`}
            title="Bấm để lọc chỉ bài có đính kèm file"
          >
            <Paperclip className="w-3 h-3" />
            <span>{filterWithFileOnly ? 'Đang lọc: Có file' : 'Lọc bài có tệp'}</span>
            {filterWithFileOnly && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse"></span>
            )}
          </button>
        </div>
      </header>

      {/* ─── 2. MAIN DISCUSSION FEED ───────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-3 sm:space-y-3.5 max-w-5xl mx-auto w-full">

        {/* ─── EXPANDABLE COMPOSER ─────────────────────────────────────────── */}
        {isComposerOpen && (
          <div className="bg-white rounded-xl p-5 border border-slate-300 shadow-sm space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
                  <Pencil className="w-3.5 h-3.5" />
                </div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                  Bắt đầu chủ đề thảo luận mới
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsComposerOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePost} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tiêu đề chủ đề:</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Tiêu đề thảo luận hoặc tên tài liệu chia sẻ (ví dụ: Ma trận đề thi trắc nghiệm học phần CS101)..."
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-bold focus:outline-none focus:bg-white focus:border-slate-800"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phân loại chuyên mục:</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-none focus:bg-white focus:border-slate-800"
                  >
                    <option value="exam">Đề thi &amp; Ma trận Bloom</option>
                    <option value="qa">Hỏi đáp Khảo thí</option>
                    <option value="textbook">Giáo trình &amp; Học liệu</option>
                  </select>
                </div>

                {/* Tag Input */}
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">
                    Gắn thẻ môn học / Chủ đề (Tự do gõ mã môn, ví dụ: CS101, HDH):
                  </label>
                  <div className="flex items-center gap-1.5 flex-wrap p-1.5 bg-slate-50 border border-slate-200 rounded-lg min-h-[36px]">
                    {newTags.map((t) => (
                      <span
                        key={t}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-900 text-white font-mono text-[11px]"
                      >
                        #{t}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(t)}
                          className="text-slate-400 hover:text-white cursor-pointer"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                    <div className="flex items-center gap-1 flex-1 min-w-[150px]">
                      <input
                        type="text"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onBlur={handleAddTag}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ',') {
                            e.preventDefault();
                            handleAddTag();
                          }
                        }}
                        placeholder={newTags.length === 0 ? "Gõ mã môn (ví dụ: CS101, HDH)..." : "Thêm thẻ khác..."}
                        className="bg-transparent text-xs text-slate-800 focus:outline-none flex-1 px-1 min-w-[100px]"
                      />
                      {tagInput.trim() && (
                        <button
                          type="button"
                          onClick={handleAddTag}
                          className="px-2 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded text-[11px] font-semibold cursor-pointer shrink-0"
                        >
                          + Thêm
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nội dung chi tiết:</label>
                <textarea
                  rows={4}
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Nhập nội dung chia sẻ, câu hỏi nghiệp vụ hoặc hướng dẫn phân bổ ma trận..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:bg-white focus:border-slate-800 leading-relaxed resize-none"
                />
              </div>

              {/* Attachment Trays */}
              {/* File Preview */}
              {showAttachFile && attachedFileName && (
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                    <span className="font-bold text-slate-900 truncate">{attachedFileName}</span>
                    {attachedFileSize && <span className="text-[11px] text-slate-400 font-mono">({attachedFileSize})</span>}
                    {isUploadingFile && (
                      <span className="text-[11px] text-teal-600 font-medium flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" /> Đang tải...
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setAttachedFileName('');
                      setAttachedFileSize('');
                      setAttachedFileUrl('');
                      setShowAttachFile(false);
                    }}
                    className="p-1 text-slate-400 hover:text-rose-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Image Preview */}
              {showAttachImage && (
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-slate-600" />
                      <span>Ảnh / Sơ đồ đính kèm</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setImageUrl('');
                        setShowAttachImage(false);
                      }}
                      className="p-1 text-slate-400 hover:text-rose-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {imageUrl ? (
                    <img src={imageUrl} alt="Preview" className="max-h-40 rounded-lg object-contain border border-slate-200" />
                  ) : (
                    <input
                      type="text"
                      placeholder="Dán đường dẫn ảnh trực tiếp (URL)..."
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                      onChange={(e) => setImageUrl(e.target.value)}
                    />
                  )}
                </div>
              )}

              {/* Web Link / Reference */}
              {showAttachLink && (
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                      <LinkIcon className="w-3.5 h-3.5 text-slate-600" />
                      <span>Đính kèm liên kết (Website, Tài liệu hoặc Video)</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setLinkUrl('');
                        setLinkLabel('');
                        setShowAttachLink(false);
                      }}
                      className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={linkUrl}
                      onChange={(e) => setLinkUrl(e.target.value)}
                      placeholder="https://... (dán liên kết website, tài liệu hoặc YouTube)"
                      className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-slate-800"
                    />
                    <input
                      type="text"
                      value={linkLabel}
                      onChange={(e) => setLinkLabel(e.target.value)}
                      placeholder="Tiêu đề / Tên liên kết (ví dụ: Video bài giảng, Quy chế khảo thí)..."
                      className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-slate-800"
                    />
                  </div>
                </div>
              )}

              {/* Action Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-1.5">
                  <label className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg text-xs flex items-center gap-1.5 cursor-pointer transition-colors">
                    <FileText className="w-3.5 h-3.5 text-slate-600" />
                    <span>File Word/PDF</span>
                    <input
                      type="file"
                      accept=".docx,.pdf,.xlsx,.zip,.pptx,.txt"
                      onChange={handleSelectLocalFile}
                      className="hidden"
                    />
                  </label>

                  <label className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg text-xs flex items-center gap-1.5 cursor-pointer transition-colors">
                    <ImageIcon className="w-3.5 h-3.5 text-slate-600" />
                    <span>Ảnh</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleSelectLocalImage}
                      className="hidden"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={() => setShowAttachLink(!showAttachLink)}
                    className={`px-2.5 py-1.5 font-medium rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
                      showAttachLink || linkUrl
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    <LinkIcon className="w-3.5 h-3.5" />
                    <span>Liên kết</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsComposerOpen(false)}
                    className="px-3.5 py-1.5 text-slate-600 hover:bg-slate-100 font-semibold rounded-lg text-xs transition-colors"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={!newTitle.trim() || !newContent.trim() || isUploadingFile}
                    className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white font-semibold rounded-lg text-xs shadow-2xs transition-colors cursor-pointer"
                  >
                    {isUploadingFile ? 'Đang tải tệp...' : 'Đăng chủ đề'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* ─── POSTS STREAM ─────────────────────────────────────────────────── */}
        {filteredPosts.length === 0 ? (
          <div className="bg-white rounded-xl p-10 text-center border border-slate-200 text-slate-400 space-y-2 shadow-2xs">
            <MessageSquare className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-xs font-semibold text-slate-600">Không tìm thấy chủ đề nào phù hợp.</p>
            <p className="text-[11px]">Thử tìm với từ khóa khác hoặc bấm nút "+ Tạo thảo luận" ở trên.</p>
          </div>
        ) : (
          filteredPosts.map((post) => {
            const isCommentsExpanded = Boolean(expandedComments[post.id]);
            const relativeTime = formatTimeAgo(post.createdAt || post.timestamp || '');

            return (
              <article
                key={post.id}
                id={`post-${post.id}`}
                className="bg-white rounded-xl p-3.5 sm:p-5 border border-slate-200/90 hover:border-slate-300 transition-all shadow-2xs space-y-2.5 sm:space-y-3"
              >
                {/* 1. Header: Author info & Context Menu (Không bị ép chữ trên mobile) */}
                <div className="flex items-start justify-between gap-2.5 text-xs">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="w-8 h-8 rounded-lg bg-slate-900 text-white font-bold text-xs flex items-center justify-center shrink-0">
                      {post.authorName.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-slate-900 truncate">
                          {post.authorTitle ? `${post.authorTitle} ` : ''}{post.authorName}
                        </span>
                        <span className="text-slate-300 hidden sm:inline">•</span>
                        <span className="text-slate-500 text-[11px] truncate hidden sm:inline">{post.department}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono mt-0.5">
                        <span className="sm:hidden text-slate-500 font-sans truncate">{post.department} •</span>
                        <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{relativeTime}</span>
                      </div>
                    </div>
                  </div>

                  {/* Context Menu Trigger */}
                  <div className="relative shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenuId(activeMenuId === post.id ? null : post.id);
                      }}
                      className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                      title="Tùy chọn"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    {/* Dropdown Menu */}
                    {activeMenuId === post.id && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-30 text-xs"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setEditingPost(post);
                            setEditTitle(post.title);
                            setEditContent(post.content);
                            setEditCategory(post.category);
                            setActiveMenuId(null);
                          }}
                          className="w-full px-3 py-1.5 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                        >
                          <Pencil className="w-3.5 h-3.5 text-slate-500" />
                          <span>Chỉnh sửa chủ đề</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenShareModal(post)}
                          className="w-full px-3 py-1.5 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                        >
                          <Share2 className="w-3.5 h-3.5 text-slate-500" />
                          <span>Chia sẻ vào QGroup</span>
                        </button>

                        <div className="h-px bg-slate-100 my-1" />

                        <button
                          type="button"
                          onClick={() => handleDeletePost(post.id)}
                          className="w-full px-3 py-1.5 text-left text-rose-600 hover:bg-rose-50 flex items-center gap-2 font-semibold"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                          <span>Xóa chủ đề</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. Tags & Subject Title */}
                <div className="space-y-1.5">
                  {post.tags && post.tags.filter((t) => t && t !== 'Chung').length > 0 && (
                    <div className="flex items-center gap-1 flex-wrap">
                      {post.tags
                        .filter((t) => t && t !== 'Chung')
                        .map((tg) => (
                          <span
                            key={tg}
                            className="px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-mono font-medium bg-slate-100 text-slate-700 border border-slate-200/80"
                          >
                            #{tg}
                          </span>
                        ))}
                    </div>
                  )}

                  <h2 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                    {post.title}
                  </h2>
                </div>

                {/* 3. Main Content Text */}
                <p className="text-xs text-slate-600 leading-relaxed font-normal whitespace-pre-line">
                  {post.content}
                </p>

                {/* 4. Attached File with REAL File Download */}
                {post.attachmentFileName && (
                  <div className="p-3 bg-slate-50 border border-slate-200/90 rounded-lg flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded bg-white border border-slate-200 flex items-center justify-center text-slate-700 shrink-0">
                        {post.attachmentFileName.toLowerCase().endsWith('.pdf') ? (
                          <FileText className="w-4 h-4 text-rose-600" />
                        ) : (
                          <FileText className="w-4 h-4 text-blue-600" />
                        )}
                      </div>
                      <div className="truncate">
                        <div className="font-bold text-slate-900 truncate text-xs">{post.attachmentFileName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {post.attachmentFileSize || 'Tài liệu'} • Sẵn sàng tải về máy
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDownloadFile(post.attachmentFileName!, post.attachmentUrl)}
                      className="px-3 py-1 bg-white hover:bg-slate-100 text-slate-800 text-xs font-semibold rounded-md border border-slate-200 shadow-2xs shrink-0 flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 text-slate-600" />
                      <span>Tải về</span>
                    </button>
                  </div>
                )}

                {/* 5. Attached Image with Lightbox Zoom - Hiển thị 100% tỷ lệ gốc không cắt xén */}
                {post.imageUrl && (
                  <div className="relative rounded-2xl overflow-hidden border border-slate-200/90 bg-slate-50/70 group flex items-center justify-center p-1 sm:p-1.5 shadow-2xs w-full">
                    <img
                      src={post.imageUrl}
                      alt="Minh họa bài viết"
                      className="max-w-full w-auto h-auto object-contain max-h-[85vh] rounded-xl group-hover:opacity-95 transition-all cursor-pointer block mx-auto"
                      onClick={() => setLightboxImageUrl(post.imageUrl || null)}
                    />
                    <button
                      type="button"
                      onClick={() => setLightboxImageUrl(post.imageUrl || null)}
                      className="absolute bottom-3 right-3 px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-900 backdrop-blur-md text-white text-[11px] font-semibold flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all cursor-pointer shadow-lg"
                      title="Phóng to ảnh xem toàn màn hình"
                    >
                      <Maximize2 className="w-3.5 h-3.5 text-teal-400" />
                      <span>Xem toàn màn hình</span>
                    </button>
                  </div>
                )}

                {/* 6. Attached Reference Link (Website, Video bài giảng, Tài liệu...) */}
                {(post.linkUrl || post.videoUrl) && (
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <LinkIcon className="w-4 h-4 text-slate-600 shrink-0" />
                      <div className="truncate">
                        <span className="font-bold text-slate-900">
                          {post.linkLabel || (post.videoUrl ? 'Video bài giảng' : 'Liên kết tham khảo')}:{' '}
                        </span>
                        <a
                          href={post.linkUrl || post.videoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-slate-700 hover:text-slate-900 hover:underline font-mono text-[11px] truncate"
                        >
                          {post.linkUrl || post.videoUrl}
                        </a>
                      </div>
                    </div>
                    <a
                      href={post.linkUrl || post.videoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1 bg-white hover:bg-slate-100 rounded border border-slate-200 font-semibold text-slate-700 shrink-0 flex items-center gap-1 transition-colors"
                    >
                      <ExternalLink className="w-3 h-3 text-slate-500" />
                      <span>Mở link</span>
                    </a>
                  </div>
                )}

                {/* 8. Interaction Action Bar */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleToggleLike(post.id)}
                      className={`flex items-center gap-1 font-semibold transition-colors cursor-pointer ${
                        post.hasLiked ? 'text-blue-600' : 'hover:text-slate-900'
                      }`}
                    >
                      <ThumbsUp className={`w-3.5 h-3.5 ${post.hasLiked ? 'fill-blue-600' : 'text-slate-500'}`} />
                      <span>{post.likes}</span>
                    </button>

                    {/* Expand / Collapse Comments Trigger Button (Ẩn vào, bấm mới sổ ra) */}
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedComments((prev) => ({
                          ...prev,
                          [post.id]: !prev[post.id],
                        }))
                      }
                      className="flex items-center gap-1 font-semibold hover:text-slate-900 transition-colors cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-slate-500" />
                      <span>{post.comments.length} phản hồi</span>
                      {isCommentsExpanded ? (
                        <ChevronUp className="w-3 h-3 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-3 h-3 text-slate-400" />
                      )}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenShareModal(post)}
                    className="text-slate-400 hover:text-slate-700 font-medium flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5 text-slate-500" />
                    <span>Chia sẻ vào QGroup</span>
                  </button>
                </div>

                {/* 9. Collapsible Comments Section with Edit & Delete */}
                {isCommentsExpanded && (
                  <div className="pt-3 border-t border-slate-100 space-y-2.5 animate-fadeIn">
                    <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                      <CornerDownRight className="w-3 h-3 text-slate-400" />
                      <span>Luồng phản hồi ({post.comments.length})</span>
                    </div>

                    {/* Replies list */}
                    {post.comments.length > 0 ? (
                      <div className="space-y-2 pl-2 border-l-2 border-slate-200">
                        {post.comments.map((cm) => {
                          const isEditingThis =
                            editingComment?.postId === post.id && editingComment?.commentId === cm.id;
                          const cmTime = formatTimeAgo(cm.createdAt || cm.timestamp || '');

                          return (
                            <div key={cm.id} className="p-2.5 bg-slate-50 rounded-lg text-xs space-y-1 group">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-slate-900">
                                  {cm.authorTitle ? `${cm.authorTitle} ` : ''}{cm.authorName}
                                </span>

                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] text-slate-400 font-mono">{cmTime}</span>

                                  {/* Edit / Delete comment buttons */}
                                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setEditingComment({ postId: post.id, commentId: cm.id, text: cm.content })
                                      }
                                      className="p-1 hover:text-slate-900 text-slate-400"
                                      title="Sửa phản hồi"
                                    >
                                      <Pencil className="w-3 h-3" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteComment(post.id, cm.id)}
                                      className="p-1 hover:text-rose-600 text-slate-400"
                                      title="Xóa phản hồi"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              </div>

                              {isEditingThis ? (
                                <div className="space-y-1.5 pt-1">
                                  <input
                                    type="text"
                                    value={editingComment.text}
                                    onChange={(e) =>
                                      setEditingComment({ ...editingComment, text: e.target.value })
                                    }
                                    className="w-full px-2.5 py-1 text-xs bg-white border border-slate-300 rounded focus:outline-none focus:border-slate-800"
                                    autoFocus
                                  />
                                  <div className="flex items-center gap-1.5 justify-end">
                                    <button
                                      type="button"
                                      onClick={() => setEditingComment(null)}
                                      className="px-2 py-0.5 rounded text-[11px] text-slate-500 hover:bg-slate-200"
                                    >
                                      Hủy
                                    </button>
                                    <button
                                      type="button"
                                      onClick={handleSaveEditComment}
                                      className="px-2.5 py-0.5 rounded text-[11px] bg-slate-900 text-white font-semibold"
                                    >
                                      Lưu
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <p className="text-slate-600 font-normal leading-relaxed">{cm.content}</p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-400 italic pl-2">
                        Chưa có phản hồi nào. Hãy là người đầu tiên đóng góp ý kiến!
                      </p>
                    )}

                    {/* Quick Reply Input */}
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="text"
                        value={replyDrafts[post.id] || ''}
                        onChange={(e) => setReplyDrafts({ ...replyDrafts, [post.id]: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddComment(post.id);
                          }
                        }}
                        placeholder="Viết câu trả lời trong chủ đề này... (Enter để gửi)"
                        className="flex-1 px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-slate-800 text-slate-800 placeholder-slate-400"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddComment(post.id)}
                        disabled={!replyDrafts[post.id]?.trim()}
                        className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <Send className="w-3 h-3" />
                        <span className="hidden sm:inline">Gửi</span>
                      </button>
                    </div>
                  </div>
                )}
              </article>
            );
          })
        )}
      </main>

      {/* ─── 3. MODAL CHỈNH SỬA CHỦ ĐỀ ─────────────────────────────────────── */}
      {editingPost && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fadeIn"
          onClick={() => setEditingPost(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-white rounded-xl shadow-xl border border-slate-200 p-5 space-y-3.5 text-xs animate-fadeIn"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900">Chỉnh sửa chủ đề thảo luận</h3>
              <button
                type="button"
                onClick={() => setEditingPost(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tiêu đề:</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-900 focus:outline-none focus:bg-white focus:border-slate-800"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Chuyên mục:</label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value as any)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-none focus:bg-white focus:border-slate-800"
                >
                  <option value="exam">Đề thi &amp; Ma trận Bloom</option>
                  <option value="qa">Hỏi đáp Khảo thí</option>
                  <option value="textbook">Giáo trình &amp; Học liệu</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nội dung:</label>
                <textarea
                  rows={4}
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:bg-white focus:border-slate-800 leading-relaxed resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingPost(null)}
                className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 font-semibold rounded-lg"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveEditPost}
                className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg shadow-2xs"
              >
                Lưu thay đổi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── 4. MODAL CHIA SẺ VÀO QGROUP ───────────────────────────────────── */}
      {sharingPost && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fadeIn"
          onClick={() => setSharingPost(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-white rounded-xl shadow-xl border border-slate-200 p-5 space-y-3.5 text-xs animate-fadeIn"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900">Chia sẻ vào Cuộc trò chuyện / QGroup</h3>
              <button
                type="button"
                onClick={() => setSharingPost(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
              <div className="font-bold text-slate-900 truncate">{sharingPost.title}</div>
              <div className="text-[11px] text-slate-500 line-clamp-2 italic">"{sharingPost.content}"</div>
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
                onClick={() => setSharingPost(null)}
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
      )}
      {/* Lightbox Phóng To Ảnh Minh Họa Toàn Màn Hình */}
      <ImageLightboxModal
        isOpen={Boolean(lightboxImageUrl)}
        imageUrl={lightboxImageUrl || ''}
        onClose={() => setLightboxImageUrl(null)}
        title="Minh họa bài viết diễn đàn"
      />
    </div>
  );
};

export default ForumScreen;
