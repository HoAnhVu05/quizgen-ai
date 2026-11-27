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
  Sparkles,
} from 'lucide-react';
import { UserProfile, ScreenId } from '../types';
import apiClient, { API_BASE } from '../services/apiClient';
import { openUserProfile } from '../utils/userProfileModalHelper';
import { ImageLightboxModal } from './ImageLightboxModal';
import { compressImageFile } from '../utils/imageCompressor';
import { downloadFileSafely } from '../utils/fileDownloadHelper';
import { UserAvatar } from './common/UserAvatar';

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
  authorAvatarUrl?: string;
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
    authorAvatarUrl?: string;
    authorTitle?: string;
    content: string;
    createdAt: string;
    timestamp?: string;
  }>;
}

// Chuẩn hóa tiếng Việt không dấu & loại bỏ dấu câu để tìm kiếm chính xác
export const removeVietnameseTones = (str?: string | null) => {
  if (!str || typeof str !== 'string') return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'’]/g, ' ')
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .trim();
};

// Tách từ viết liền PascalCase/camelCase (ví dụ: HeDieuHanh -> He Dieu Hanh, CS101 -> CS101)
export const splitCamelCase = (str?: string | null) => {
  if (!str) return '';
  return str.replace(/([a-z0-9])([A-Z])/g, '$1 $2');
};

// Danh sách đại từ nhân xưng, học vị thường dùng khi tìm kiếm giảng viên
const VIETNAMESE_HONORIFICS = new Set([
  'thay', 'co', 'gv', 'giangvien', 'ban', 'ts', 'ths', 'kts', 'gs', 'pgs', 'ks', 'th'
]);

// Chuẩn hóa tên hiển thị tác giả kèm học vị (tránh lặp "TS. TS. Tên")
export const getFormattedAuthorName = (name: string, title?: string) => {
  if (!name) return '';
  if (!title) return name;
  const cleanTitle = title.trim();
  if (name.toLowerCase().startsWith(cleanTitle.toLowerCase())) return name;
  return `${cleanTitle} ${name}`;
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

// Chuyển đổi dữ liệu bài viết để lưu trữ trên Server đồng bộ đa thiết bị
export const serializeForServer = (post: ForumPost) => {
  const meta = {
    title: post.title,
    category: post.category,
    tags: post.tags,
    linkUrl: post.linkUrl,
    linkLabel: post.linkLabel,
    attachmentUrl: post.attachmentUrl,
    authorAvatarUrl: post.authorAvatarUrl,
    authorTitle: post.authorTitle,
  };
  const enrichedContent = `<!--FORUM_META:${JSON.stringify(meta)}-->\n${post.content || ''}`;

  return {
    id: post.id,
    authorEmail: post.authorEmail || '',
    authorName: post.authorName,
    authorTitle: post.authorTitle || 'TS.',
    authorRole: post.authorRole,
    department: post.department,
    tag: (post.tags && post.tags.find((t) => t && t !== 'Chung')) || 'Chuyên môn',
    content: enrichedContent,
    imageUrl: post.imageUrl || null,
    attachmentFileName: post.attachmentFileName || null,
    attachmentFileSize: post.attachmentFileSize || null,
    attachmentDownloadUrl: post.attachmentUrl || null,
    videoUrl: post.linkUrl || null,
  };
};

// Khôi phục đầy đủ thông tin bài viết nhận từ Server
export const parseServerPost = (sp: any, userEmail?: string): ForumPost => {
  let content = sp.content || '';
  let meta: any = {};
  const metaMatch = content.match(/^<!--FORUM_META:(.*?)-->\s*\n?/);
  if (metaMatch) {
    try {
      meta = JSON.parse(metaMatch[1]);
      content = content.replace(/^<!--FORUM_META:(.*?)-->\s*\n?/, '');
    } catch {}
  }

  const tags = meta.tags || (sp.tag ? [sp.tag] : ['Chuyên môn']);
  const category = meta.category || (sp.category === 'exam' || sp.category === 'textbook' ? sp.category : 'qa');
  const title = meta.title || sp.title || (content.split('\n')[0].slice(0, 80) || 'Thảo luận chuyên môn');

  return {
    id: sp.id,
    title,
    authorEmail: sp.authorEmail,
    authorName: sp.authorName || 'Giảng viên UTH',
    authorAvatarUrl: sp.authorAvatarUrl || meta.authorAvatarUrl || '',
    authorTitle: meta.authorTitle || sp.authorTitle || 'TS.',
    authorRole: sp.authorRole || 'Giảng viên',
    department: sp.department || 'Khoa Công nghệ Thông tin',
    createdAt: sp.createdAt || new Date().toISOString(),
    timestamp: sp.timestamp,
    category,
    tags: Array.isArray(tags) ? tags : [tags],
    content,
    imageUrl: sp.imageUrl || meta.imageUrl,
    attachmentFileName: sp.attachmentFileName || meta.attachmentFileName,
    attachmentFileSize: sp.attachmentFileSize || meta.attachmentFileSize,
    attachmentUrl: sp.attachmentDownloadUrl || sp.attachmentUrl || meta.attachmentUrl,
    videoUrl: sp.videoUrl || meta.videoUrl,
    linkUrl: meta.linkUrl || sp.videoUrl,
    linkLabel: meta.linkLabel,
    likes: sp.likes || 0,
    hasLiked: sp.likedByEmails && userEmail ? sp.likedByEmails.includes(userEmail) : false,
    isBookmarked: sp.bookmarkedByEmails && userEmail ? sp.bookmarkedByEmails.includes(userEmail) : false,
    comments: Array.isArray(sp.comments) ? sp.comments : [],
  };
};

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

  // Đồng bộ danh sách bài viết từ Backend Server để các máy/tài khoản khác nhau cùng thấy bài mới của nhau
  const fetchServerPosts = async () => {
    try {
      const res = await fetch('/api/v1/documents/forum/posts');
      if (res.ok) {
        const serverData = await res.json();
        if (Array.isArray(serverData) && serverData.length > 0) {
          const parsedServerPosts = serverData.map((sp) => parseServerPost(sp, currentUser?.email));

          setPosts((prevPosts) => {
            const map = new Map<string, ForumPost>();
            DEFAULT_POSTS.forEach((p) => map.set(p.id, p));
            prevPosts.forEach((p) => map.set(p.id, p));
            parsedServerPosts.forEach((p) => map.set(p.id, p));

            const merged = Array.from(map.values()).sort((a, b) => {
              const tA = new Date(a.createdAt || a.timestamp || 0).getTime();
              const tB = new Date(b.createdAt || b.timestamp || 0).getTime();
              return tB - tA;
            });

            try {
              localStorage.setItem('quizgen_academic_forum_posts_v3', JSON.stringify(merged));
            } catch {}

            return merged;
          });
        }
      }
    } catch (err) {
      console.warn('Lỗi đồng bộ bài viết diễn đàn từ server:', err);
    }
  };

  useEffect(() => {
    fetchServerPosts();
  }, [currentUser?.email]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'exam' | 'qa' | 'textbook'>('all');
  const [filterWithFileOnly, setFilterWithFileOnly] = useState(false);

  // Focus Deep-link & Lightbox State
  const [highlightedPostId, setHighlightedPostId] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<{ url: string; title?: string } | null>(null);

  // Sao chép liên kết trực tiếp tới bài viết trên diễn đàn
  const handleCopyPostLink = (post: ForumPost) => {
    const origin = window.location.origin;
    const pathname = window.location.pathname;
    const postLink = `${origin}${pathname}?post=${encodeURIComponent(post.id)}#${encodeURIComponent(post.id)}`;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(postLink)
        .then(() => {
          onShowToast('success', 'Đã sao chép liên kết bài viết', 'Bạn có thể gửi liên kết này cho đồng nghiệp để vào xem trực tiếp bài thảo luận.');
        })
        .catch(() => {
          onShowToast('info', 'Liên kết bài viết', postLink);
        });
    } else {
      onShowToast('info', 'Liên kết bài viết', postLink);
    }
  };

  // Tự động kiểm tra và cuộn tới bài viết được điều hướng từ Q-Group hoặc Deep-link URL (?post=... hoặc #post-...)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlPostId = urlParams.get('post') || urlParams.get('postId') || urlParams.get('focus_post');
    const hashPostId = window.location.hash ? window.location.hash.replace(/^#/, '') : null;
    const focusPostId = sessionStorage.getItem('quizgen_focus_post_id') || urlPostId || hashPostId;

    if (!focusPostId) return;

    // Reset bộ lọc về 'all' và xóa search để bài viết chắc chắn được render trong DOM
    setSelectedCategory('all');
    setSearchQuery('');
    setFilterWithFileOnly(false);
    setHighlightedPostId(focusPostId);

    const scrollToTarget = () => {
      const cleanId = focusPostId.replace(/^forum-post-/, '').replace(/^post-/, '');
      const el =
        document.getElementById(focusPostId) ||
        document.getElementById(`post-${focusPostId}`) ||
        document.getElementById(`forum-post-${focusPostId}`) ||
        document.getElementById(`post-${cleanId}`) ||
        document.getElementById(cleanId);

      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        sessionStorage.removeItem('quizgen_focus_post_id');
        return true;
      }
      return false;
    };

    // Cuộn ngay hoặc chờ render DOM
    if (!scrollToTarget()) {
      const t1 = setTimeout(scrollToTarget, 300);
      const t2 = setTimeout(scrollToTarget, 800);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }

    const tHighlight = setTimeout(() => {
      setHighlightedPostId(null);
    }, 6000);

    return () => clearTimeout(tHighlight);
  }, [posts]);

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

  const [showAttachLink, setShowAttachLink] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkLabel, setLinkLabel] = useState('');

  // Edit Post Modal State
  const [editingPost, setEditingPost] = useState<ForumPost | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editCategory, setEditCategory] = useState<'exam' | 'qa' | 'textbook'>('exam');
  const [editTags, setEditTags] = useState<string[]>([]);
  const [editTagInput, setEditTagInput] = useState('');
  const [editAttachedFileName, setEditAttachedFileName] = useState('');
  const [editAttachedFileSize, setEditAttachedFileSize] = useState('');
  const [editAttachedFileUrl, setEditAttachedFileUrl] = useState('');
  const [isEditUploadingFile, setIsEditUploadingFile] = useState(false);
  const [editImageUrl, setEditImageUrl] = useState('');
  const [editLinkUrl, setEditLinkUrl] = useState('');
  const [editLinkLabel, setEditLinkLabel] = useState('');

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
      authorAvatarUrl: currentUser?.avatarUrl || '',
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

    // Đồng bộ tức thời lên Server backend để các thiết bị/tài khoản khác cùng thấy
    try {
      fetch('/api/v1/documents/forum/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(serializeForServer(newPost)),
      }).catch((err) => console.warn('Lỗi lưu bài viết lên server:', err));
    } catch {}

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

    const userTier = (currentUser?.planTier || 'FREE').toUpperCase();
    const maxMb = userTier === 'ENTERPRISE' ? 100 : (userTier === 'PRO_MONTH' || userTier === 'PRO_YEAR' || userTier === 'PRO') ? 50 : 25;
    if (file.size > maxMb * 1024 * 1024) {
      onShowToast('warning', 'Tệp quá lớn', `Hệ thống hỗ trợ đính kèm tối đa ${maxMb}MB cho gói ${userTier}.`);
      return;
    }

    let fileToUpload = file;
    if (file.type.startsWith('image/')) {
      try {
        fileToUpload = await compressImageFile(file);
      } catch {}
    }

    setAttachedFileName(fileToUpload.name);
    const sizeStr =
      fileToUpload.size > 1024 * 1024
        ? `${(fileToUpload.size / (1024 * 1024)).toFixed(1)} MB`
        : `${Math.round(fileToUpload.size / 1024)} KB`;
    setAttachedFileSize(sizeStr);
    setShowAttachFile(true);
    setIsUploadingFile(true);

    try {
      const formData = new FormData();
      formData.append('file', fileToUpload);
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

  // Real Safe File Download Handler (Tải file nguyên bản, không mở about:blank, không lặp prefix)
  const handleDownloadFile = async (fileName: string, fileUrl?: string) => {
    await downloadFileSafely(fileName, fileUrl, onShowToast);
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
    try {
      void fetch(`/api/v1/documents/forum/posts/${encodeURIComponent(postId)}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail: currentUser?.email || '' })
      });
    } catch {}
  };

  // Add Comment
  const handleAddComment = (postId: string) => {
    const draft = replyDrafts[postId]?.trim();
    if (!draft) return;

    const newC = {
      id: `c-${Date.now()}`,
      authorEmail: currentUser?.email,
      authorName: currentUser?.fullName || 'TS. Hồ Anh Vũ',
      authorAvatarUrl: currentUser?.avatarUrl || '',
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
    try {
      void fetch(`/api/v1/documents/forum/posts/${encodeURIComponent(postId)}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newC)
      });
    } catch {}
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
      try {
        void fetch(`/api/v1/documents/forum/posts/${encodeURIComponent(postId)}/comments/${encodeURIComponent(commentId)}`, {
          method: 'DELETE'
        });
      } catch {}
      onShowToast('success', 'Đã xóa phản hồi', 'Phản hồi đã được gỡ bỏ.');
    }
  };

  // Delete Post
  const handleDeletePost = (postId: string) => {
    if (window.confirm('Thầy/Cô có chắc chắn muốn xóa chủ đề thảo luận này không?')) {
      savePosts(posts.filter((p) => p.id !== postId));
      setActiveMenuId(null);
      try {
        fetch(`/api/v1/documents/forum/posts/${encodeURIComponent(postId)}`, {
          method: 'DELETE',
        }).catch((err) => console.warn('Lỗi xóa bài trên server:', err));
      } catch {}
      onShowToast('success', 'Đã xóa', 'Chủ đề đã được gỡ bỏ khỏi Diễn đàn.');
    }
  };

  // Open Edit Post Modal
  const handleStartEdit = (post: ForumPost) => {
    setEditingPost(post);
    setEditTitle(post.title);
    setEditContent(post.content);
    setEditCategory(post.category);
    setEditTags(post.tags ? post.tags.filter((t) => t && t !== 'Chung') : []);
    setEditTagInput('');
    setEditAttachedFileName(post.attachmentFileName || '');
    setEditAttachedFileSize(post.attachmentFileSize || '');
    setEditAttachedFileUrl(post.attachmentUrl || '');
    setEditImageUrl(post.imageUrl || '');
    setEditLinkUrl(post.linkUrl || post.videoUrl || '');
    setEditLinkLabel(post.linkLabel || (post.videoUrl ? 'Video bài giảng' : ''));
    setActiveMenuId(null);
  };

  // Upload file for edit modal
  const handleSelectEditFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const userTier = (currentUser?.planTier || 'FREE').toUpperCase();
    const maxMb = userTier === 'ENTERPRISE' ? 100 : (userTier === 'PRO_MONTH' || userTier === 'PRO_YEAR' || userTier === 'PRO') ? 50 : 25;
    if (file.size > maxMb * 1024 * 1024) {
      onShowToast('warning', 'Tệp quá lớn', `Hệ thống hỗ trợ đính kèm tối đa ${maxMb}MB cho gói ${userTier}.`);
      return;
    }

    let fileToUpload = file;
    if (file.type.startsWith('image/')) {
      try {
        fileToUpload = await compressImageFile(file);
      } catch {}
    }

    setEditAttachedFileName(fileToUpload.name);
    const sizeStr =
      fileToUpload.size > 1024 * 1024
        ? `${(fileToUpload.size / (1024 * 1024)).toFixed(1)} MB`
        : `${Math.round(fileToUpload.size / 1024)} KB`;
    setEditAttachedFileSize(sizeStr);
    setIsEditUploadingFile(true);

    try {
      const formData = new FormData();
      formData.append('file', fileToUpload);
      const res = await apiClient
        .fetch(`${API_BASE}/documents/qgroups/upload-attachment`, {
          method: 'POST',
          body: formData,
        })
        .then((r) => r.json());

      if (res && res.fileUrl) {
        setEditAttachedFileUrl(res.fileUrl);
        onShowToast('success', 'Đã tải tệp lên', `${file.name} (${sizeStr})`);
      } else {
        throw new Error(res?.detail || 'Lỗi lưu trữ tệp trên máy chủ');
      }
    } catch (err: any) {
      console.warn('Backend upload fallback:', err);
      const localUrl = URL.createObjectURL(file);
      setEditAttachedFileUrl(localUrl);
      onShowToast('info', 'Đã gắn tệp', `${file.name} (${sizeStr})`);
    } finally {
      setIsEditUploadingFile(false);
    }
  };

  // Upload image for edit modal
  const handleSelectEditImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          setEditImageUrl(ev.target.result as string);
          onShowToast('info', 'Đã gắn ảnh', file.name);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Save Edit Post
  const handleSaveEditPost = () => {
    if (!editingPost) return;
    if (!editTitle.trim() || !editContent.trim()) {
      onShowToast('warning', 'Thiếu thông tin', 'Vui lòng không để trống tiêu đề hoặc nội dung.');
      return;
    }

    const pendingTag = editTagInput.trim().replace(/^#/, '').replace(/\s+/g, '_');
    const finalTags = [...editTags];
    if (pendingTag && !finalTags.includes(pendingTag)) {
      finalTags.push(pendingTag);
    }

    const updatedPost = {
      ...editingPost,
      title: editTitle.trim(),
      content: editContent.trim(),
      category: editCategory,
      tags: finalTags,
      attachmentFileName: editAttachedFileName.trim() || undefined,
      attachmentFileSize: editAttachedFileSize.trim() || undefined,
      attachmentUrl: editAttachedFileUrl.trim() || undefined,
      imageUrl: editImageUrl.trim() || undefined,
      linkUrl: editLinkUrl.trim() || undefined,
      linkLabel: editLinkLabel.trim() || undefined,
    };

    const updated = posts.map((p) => (p.id === editingPost.id ? updatedPost : p));
    savePosts(updated);
    setEditingPost(null);

    try {
      fetch(`/api/v1/documents/forum/posts/${encodeURIComponent(editingPost.id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(serializeForServer(updatedPost)),
      }).catch((err) => console.warn('Lỗi cập nhật bài lên server:', err));
    } catch {}

    onShowToast('success', 'Cập nhật thành công', 'Nội dung và tệp đính kèm đã được lưu thay đổi.');
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
        title: sharingPost.title,
        authorName: getFormattedAuthorName(sharingPost.authorName, sharingPost.authorTitle),
        department: sharingPost.department,
        content: sharingPost.content.slice(0, 150) + '...',
        fullContent: sharingPost.content,
        attachmentFileName: sharingPost.attachmentFileName,
        attachmentFileSize: sharingPost.attachmentFileSize,
        attachmentUrl: sharingPost.attachmentUrl,
        imageUrl: sharingPost.imageUrl,
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
    // Khi đang nhập từ khóa tìm kiếm (searchQuery), tự động tìm kiếm trên toàn bộ diễn đàn để không bỏ sót tác giả hoặc chủ đề
    if (!searchQuery.trim() && selectedCategory !== 'all' && p.category !== selectedCategory) {
      return false;
    }

    // 2. Lọc bài có tệp đính kèm
    if (filterWithFileOnly && !p.attachmentFileName && !p.imageUrl && !p.videoUrl && !p.linkUrl) {
      return false;
    }

    // 3. Tìm kiếm thông minh tiếng Việt không dấu & word-boundary (hỗ trợ Tên tác giả kèm học vị TS/ThS/KTS, tiêu đề, nội dung, thẻ tag & bình luận)
    if (searchQuery.trim()) {
      const qNorm = removeVietnameseTones(searchQuery);
      const rawTokens = qNorm.split(' ').filter(Boolean);
      if (rawTokens.length === 0) return true;

      // Lọc bỏ từ xưng hô nếu có từ khác đi kèm (ví dụ: "Thầy Vũ" -> tìm "Vũ", "Cô Hân" -> tìm "Hân", "Thầy Hiệu" -> tìm "Hiệu")
      let searchTokens = rawTokens;
      const meaningfulTokens = rawTokens.filter((t) => !VIETNAMESE_HONORIFICS.has(t));
      if (meaningfulTokens.length > 0) {
        searchTokens = meaningfulTokens;
      }

      // Tách từ cho Tác giả
      const authorNorm = removeVietnameseTones(`${p.authorTitle || ''} ${p.authorName || ''} ${p.authorRole || ''}`);
      const authorWords = authorNorm.split(' ').filter(Boolean);

      // Tách từ cho Tiêu đề
      const titleNorm = removeVietnameseTones(p.title || '');
      const titleWords = titleNorm.split(' ').filter(Boolean);

      // Tách từ cho Tags (xử lý cả camelCase như #HeDieuHanh -> "he dieu hanh")
      const tagsExpanded = (p.tags || []).map((t) => splitCamelCase(t)).join(' ');
      const tagsNorm = removeVietnameseTones(tagsExpanded);
      const tagsWords = tagsNorm.split(' ').filter(Boolean);

      // Tách từ cho Nội dung
      const contentNorm = removeVietnameseTones(p.content || '');
      const contentWords = contentNorm.split(' ').filter(Boolean);

      // Phòng ban & Bình luận
      const deptNorm = removeVietnameseTones(p.department || '');
      const deptWords = deptNorm.split(' ').filter(Boolean);

      const commentsNorm = removeVietnameseTones(
        (p.comments || []).map((c) => `${c.authorTitle || ''} ${c.authorName || ''} ${c.content || ''}`).join(' ')
      );
      const commentsWords = commentsNorm.split(' ').filter(Boolean);

      const fullTextNorm = `${authorNorm} ${titleNorm} ${contentNorm} ${deptNorm} ${tagsNorm} ${commentsNorm}`;

      // A. Nếu cụm từ nguyên văn khớp (exact phrase match)
      if (
        fullTextNorm.includes(` ${qNorm} `) ||
        fullTextNorm.startsWith(`${qNorm} `) ||
        fullTextNorm.endsWith(` ${qNorm}`) ||
        fullTextNorm === qNorm
      ) {
        return true;
      }

      // B. Từng token trong câu tìm kiếm phải khớp ít nhất một trường dữ liệu thích hợp
      const allTokensMatch = searchTokens.every((tok) => {
        // 1. Khớp chính xác từ tác giả (ví dụ: "Vũ", "Hiệu", "Hân", "Bích")
        if (authorWords.includes(tok)) return true;

        // 2. Khớp từ trong tiêu đề hoặc tags
        if (titleWords.includes(tok) || tagsWords.includes(tok)) return true;

        // 3. Khớp từ trong bình luận hoặc phòng ban
        if (commentsWords.includes(tok) || deptWords.includes(tok)) return true;

        // 4. Khớp từ trong nội dung bài viết
        if (contentWords.includes(tok)) return true;

        // 5. Nếu mã môn / tag viết hoa viết liền (ví dụ: "cs101" bằng đúng tag)
        if ((p.tags || []).some((t) => removeVietnameseTones(t) === tok)) return true;

        // 6. Với token dài (>= 5 ký tự), cho phép tìm substring trong toàn bộ bài viết
        if (tok.length >= 5 && fullTextNorm.includes(tok)) return true;

        return false;
      });

      if (!allTokensMatch) {
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
            const isHighlighted = highlightedPostId === post.id;

            return (
              <article
                key={post.id}
                id={post.id}
                data-post-id={post.id}
                className={`bg-white rounded-xl p-3.5 sm:p-5 border transition-all shadow-2xs space-y-2.5 sm:space-y-3 ${
                  isHighlighted || highlightedPostId === post.id || highlightedPostId === `post-${post.id}`
                    ? 'ring-2 ring-teal-500 border-teal-500 bg-teal-50/20 shadow-lg scale-[1.005]'
                    : 'border-slate-200/90 hover:border-slate-300'
                }`}
              >
                {/* Highlight banner khi được chuyển từ Q-Group hoặc Deep-link */}
                {(isHighlighted || highlightedPostId === post.id || highlightedPostId === `post-${post.id}`) && (
                  <div className="px-3 py-1.5 rounded-lg bg-teal-100/90 border border-teal-300 text-teal-800 text-xs font-bold inline-flex items-center gap-1.5 shadow-2xs animate-pulse">
                    <Sparkles className="w-3.5 h-3.5 text-teal-700" />
                    <span>Đang xem bài viết được chia sẻ</span>
                  </div>
                )}
                {/* 1. Header: Author info & Context Menu (Không bị ép chữ trên mobile) */}
                <div className="flex items-start justify-between gap-2.5 text-xs">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <UserAvatar
                      avatarUrl={
                        post.authorEmail && currentUser?.email && post.authorEmail.toLowerCase() === currentUser.email.toLowerCase()
                          ? currentUser.avatarUrl
                          : post.authorAvatarUrl
                      }
                      name={post.authorName}
                      email={post.authorEmail || `${post.authorName.toLowerCase().replace(/\s+/g, '')}@uth.edu.vn`}
                      size="sm"
                      rounded="rounded-lg"
                      className="cursor-pointer hover:opacity-90 transition-opacity shadow-2xs"
                      title={`Xem hồ sơ của ${post.authorName}`}
                      onClick={() => openUserProfile(post.authorEmail || `${post.authorName.toLowerCase().replace(/\s+/g, '')}@uth.edu.vn`, post.authorName)}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => openUserProfile(post.authorEmail || `${post.authorName.toLowerCase().replace(/\s+/g, '')}@uth.edu.vn`, post.authorName)}
                          className="font-bold text-slate-900 hover:text-[#008689] hover:underline truncate cursor-pointer text-left transition-colors"
                          title={`Xem hồ sơ của ${post.authorName}`}
                        >
                          {getFormattedAuthorName(post.authorName, post.authorTitle)}
                        </button>
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
                          onClick={() => handleStartEdit(post)}
                          className="w-full px-3 py-1.5 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5 text-slate-500" />
                          <span>Chỉnh sửa chủ đề</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenShareModal(post)}
                          className="w-full px-3 py-1.5 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                        >
                          <Share2 className="w-3.5 h-3.5 text-slate-500" />
                          <span>Chia sẻ vào QGroup</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setActiveMenuId(null);
                            handleCopyPostLink(post);
                          }}
                          className="w-full px-3 py-1.5 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                        >
                          <LinkIcon className="w-3.5 h-3.5 text-slate-500" />
                          <span>Sao chép liên kết</span>
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

                {/* 5. Attached Image */}
                {post.imageUrl && (
                  <div className="rounded-xl overflow-hidden border border-slate-200/90 max-h-96 bg-slate-50 flex items-center justify-center p-1 shadow-2xs">
                    <img
                      src={post.imageUrl}
                      alt="Minh họa"
                      className="w-auto h-auto max-w-full max-h-96 object-contain rounded-lg hover:opacity-95 transition-opacity cursor-pointer block mx-auto"
                      onClick={() => setLightboxImage({ url: post.imageUrl!, title: post.title })}
                    />
                  </div>
                )}

                {/* 6. Attached Reference Link (Website, Video bài giảng, Tài liệu...) */}
                {(post.linkUrl || post.videoUrl) && (() => {
                  const rawUrl = (post.linkUrl || post.videoUrl || '').trim();
                  const safeUrl = /^https?:\/\//i.test(rawUrl) ? rawUrl : '#';
                  return (
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <LinkIcon className="w-4 h-4 text-slate-600 shrink-0" />
                      <div className="truncate">
                        <span className="font-bold text-slate-900">
                          {post.linkLabel || (post.videoUrl ? 'Video bài giảng' : 'Liên kết tham khảo')}:{' '}
                        </span>
                        <a
                          href={safeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-slate-700 hover:text-slate-900 hover:underline font-mono text-[11px] truncate"
                        >
                          {rawUrl}
                        </a>
                      </div>
                    </div>
                    <a
                      href={safeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 bg-white hover:bg-slate-100 rounded border border-slate-200 font-semibold text-slate-700 shrink-0 flex items-center gap-1 transition-colors"
                    >
                      <ExternalLink className="w-3 h-3 text-slate-500" />
                      <span>Mở link</span>
                    </a>
                  </div>
                  );
                })()}

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

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleCopyPostLink(post)}
                      className="text-slate-400 hover:text-slate-700 font-medium flex items-center gap-1 transition-colors cursor-pointer"
                      title="Sao chép liên kết trực tiếp tới bài viết này"
                    >
                      <LinkIcon className="w-3.5 h-3.5 text-slate-500" />
                      <span>Sao chép link</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenShareModal(post)}
                      className="text-slate-400 hover:text-slate-700 font-medium flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Share2 className="w-3.5 h-3.5 text-slate-500" />
                      <span>Chia sẻ vào QGroup</span>
                    </button>
                  </div>
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
                                <div className="flex items-center gap-2 min-w-0">
                                  <UserAvatar
                                    avatarUrl={
                                      cm.authorEmail && currentUser?.email && cm.authorEmail.toLowerCase() === currentUser.email.toLowerCase()
                                        ? currentUser.avatarUrl
                                        : cm.authorAvatarUrl
                                    }
                                    name={cm.authorName}
                                    email={cm.authorEmail || `${cm.authorName.toLowerCase().replace(/\s+/g, '')}@uth.edu.vn`}
                                    size="xs"
                                    rounded="rounded-md"
                                    className="cursor-pointer hover:opacity-90 transition-opacity shadow-2xs shrink-0"
                                    title={`Xem hồ sơ của ${cm.authorName}`}
                                    onClick={() => openUserProfile(cm.authorEmail || `${cm.authorName.toLowerCase().replace(/\s+/g, '')}@uth.edu.vn`, cm.authorName)}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => openUserProfile(cm.authorEmail || `${cm.authorName.toLowerCase().replace(/\s+/g, '')}@uth.edu.vn`, cm.authorName)}
                                    className="font-bold text-slate-900 hover:text-[#008689] hover:underline cursor-pointer text-left transition-colors truncate"
                                    title={`Xem hồ sơ của ${cm.authorName}`}
                                  >
                                    {getFormattedAuthorName(cm.authorName, cm.authorTitle)}
                                  </button>
                                </div>

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
                      <UserAvatar
                        avatarUrl={currentUser?.avatarUrl}
                        name={currentUser?.fullName}
                        email={currentUser?.email}
                        size="xs"
                        rounded="rounded-md"
                        className="shadow-2xs shrink-0"
                      />
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
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs animate-fadeIn"
          onClick={() => setEditingPost(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-white rounded-xl shadow-xl border border-slate-200 p-4 sm:p-5 space-y-3.5 text-xs animate-fadeIn max-h-[92vh] flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
                  <Pencil className="w-3.5 h-3.5" />
                </div>
                <h3 className="font-bold text-sm text-slate-900">Chỉnh sửa chủ đề thảo luận</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingPost(null)}
                className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <div className="space-y-3 overflow-y-auto pr-1 flex-1">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tiêu đề:</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Tiêu đề thảo luận..."
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-900 focus:outline-none focus:bg-white focus:border-slate-800"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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

                {/* Edit Tags Input */}
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">
                    Gắn thẻ môn học / Chủ đề:
                  </label>
                  <div className="flex items-center gap-1.5 flex-wrap p-1.5 bg-slate-50 border border-slate-200 rounded-lg min-h-[36px]">
                    {editTags.map((t) => (
                      <span
                        key={t}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-900 text-white font-mono text-[11px]"
                      >
                        #{t}
                        <button
                          type="button"
                          onClick={() => setEditTags(editTags.filter((x) => x !== t))}
                          className="text-slate-400 hover:text-white cursor-pointer"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                    <div className="flex items-center gap-1 flex-1 min-w-[130px]">
                      <input
                        type="text"
                        value={editTagInput}
                        onChange={(e) => setEditTagInput(e.target.value)}
                        onBlur={() => {
                          const clean = editTagInput.trim().replace(/^#/, '').replace(/\s+/g, '_');
                          if (clean && !editTags.includes(clean)) {
                            setEditTags([...editTags, clean]);
                            setEditTagInput('');
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ',') {
                            e.preventDefault();
                            const clean = editTagInput.trim().replace(/^#/, '').replace(/\s+/g, '_');
                            if (clean && !editTags.includes(clean)) {
                              setEditTags([...editTags, clean]);
                              setEditTagInput('');
                            }
                          }
                        }}
                        placeholder="Thêm thẻ mã môn..."
                        className="bg-transparent text-xs text-slate-800 focus:outline-none flex-1 px-1 min-w-[90px]"
                      />
                      {editTagInput.trim() && (
                        <button
                          type="button"
                          onClick={() => {
                            const clean = editTagInput.trim().replace(/^#/, '').replace(/\s+/g, '_');
                            if (clean && !editTags.includes(clean)) {
                              setEditTags([...editTags, clean]);
                              setEditTagInput('');
                            }
                          }}
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
                <label className="block font-semibold text-slate-700 mb-1">Nội dung:</label>
                <textarea
                  rows={4}
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  placeholder="Nhập nội dung chia sẻ..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:bg-white focus:border-slate-800 leading-relaxed resize-none"
                />
              </div>

              {/* Tệp đính kèm & Đa phương tiện */}
              <div className="space-y-2.5 pt-2 border-t border-slate-100">
                <span className="block font-bold text-slate-800 text-[11px] uppercase tracking-wider">
                  Đính kèm (Tệp tin, Hình ảnh, Liên kết)
                </span>

                {/* 1. Tệp đính kèm Word/PDF/Excel */}
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-blue-600" />
                      <span>Tệp tài liệu (Word, PDF, Excel...)</span>
                    </span>
                    {editAttachedFileName && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditAttachedFileName('');
                          setEditAttachedFileSize('');
                          setEditAttachedFileUrl('');
                        }}
                        className="text-rose-600 hover:text-rose-700 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                        title="Xóa tệp đính kèm"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Xóa tệp</span>
                      </button>
                    )}
                  </div>

                  {editAttachedFileName ? (
                    <div className="flex items-center justify-between gap-2 p-2 bg-white rounded border border-slate-200">
                      <div className="flex items-center gap-2 truncate">
                        <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                        <div className="truncate">
                          <span className="font-semibold text-slate-800 text-xs truncate block">{editAttachedFileName}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{editAttachedFileSize || 'Tài liệu'}</span>
                        </div>
                      </div>
                      <label className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded text-[11px] cursor-pointer shrink-0 transition-colors">
                        <span>Đổi tệp khác</span>
                        <input
                          type="file"
                          accept=".docx,.pdf,.xlsx,.zip,.pptx,.txt"
                          onChange={handleSelectEditFile}
                          className="hidden"
                        />
                      </label>
                    </div>
                  ) : (
                    <label className="w-full py-2 border-2 border-dashed border-slate-200 hover:border-slate-300 hover:bg-white rounded-lg flex items-center justify-center gap-2 text-slate-600 font-medium text-xs cursor-pointer transition-all">
                      <FileText className="w-3.5 h-3.5 text-slate-500" />
                      <span>{isEditUploadingFile ? 'Đang tải tệp lên...' : 'Bấm để tải tệp Word/PDF/Excel mới'}</span>
                      <input
                        type="file"
                        accept=".docx,.pdf,.xlsx,.zip,.pptx,.txt"
                        onChange={handleSelectEditFile}
                        disabled={isEditUploadingFile}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                {/* 2. Ảnh minh họa */}
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Hình ảnh minh họa</span>
                    </span>
                    {editImageUrl && (
                      <button
                        type="button"
                        onClick={() => setEditImageUrl('')}
                        className="text-rose-600 hover:text-rose-700 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                        title="Xóa hình ảnh"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Xóa ảnh</span>
                      </button>
                    )}
                  </div>

                  {editImageUrl ? (
                    <div className="flex items-center justify-between gap-3 p-2 bg-white rounded border border-slate-200">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={editImageUrl}
                          alt="Minh họa"
                          className="w-12 h-12 rounded object-cover border border-slate-200 shrink-0"
                        />
                        <span className="text-[11px] text-slate-500 truncate">Ảnh đính kèm đã sẵn sàng</span>
                      </div>
                      <label className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded text-[11px] cursor-pointer shrink-0 transition-colors">
                        <span>Đổi ảnh khác</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleSelectEditImage}
                          className="hidden"
                        />
                      </label>
                    </div>
                  ) : (
                    <label className="w-full py-2 border-2 border-dashed border-slate-200 hover:border-slate-300 hover:bg-white rounded-lg flex items-center justify-center gap-2 text-slate-600 font-medium text-xs cursor-pointer transition-all">
                      <ImageIcon className="w-3.5 h-3.5 text-slate-500" />
                      <span>Bấm để tải ảnh minh họa từ thiết bị</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleSelectEditImage}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                {/* 3. Liên kết tham khảo / Video */}
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                      <LinkIcon className="w-3.5 h-3.5 text-blue-600" />
                      <span>Liên kết tham khảo (Website hoặc Video bài giảng)</span>
                    </span>
                    {(editLinkUrl || editLinkLabel) && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditLinkUrl('');
                          setEditLinkLabel('');
                        }}
                        className="text-rose-600 hover:text-rose-700 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                        title="Xóa liên kết"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Xóa link</span>
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={editLinkUrl}
                      onChange={(e) => setEditLinkUrl(e.target.value)}
                      placeholder="https://... (link website, tài liệu hoặc YouTube)"
                      className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-slate-800"
                    />
                    <input
                      type="text"
                      value={editLinkLabel}
                      onChange={(e) => setEditLinkLabel(e.target.value)}
                      placeholder="Tiêu đề / Tên liên kết (ví dụ: Video bài giảng)..."
                      className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-slate-800"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Buttons (Sticky) */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 shrink-0">
              <button
                type="button"
                onClick={() => setEditingPost(null)}
                className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 font-semibold rounded-lg cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveEditPost}
                disabled={isEditUploadingFile}
                className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-semibold rounded-lg shadow-2xs cursor-pointer"
              >
                {isEditUploadingFile ? 'Đang tải tệp...' : 'Lưu thay đổi'}
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

      {/* Lightbox Modal Xem Ảnh Đầy Đủ Nội Bộ (Không mở tab about:blank) */}
      {lightboxImage && (
        <ImageLightboxModal
          isOpen={Boolean(lightboxImage)}
          imageUrl={lightboxImage.url}
          imageCaption={lightboxImage.title}
          title="Minh chứng & Hình ảnh Thảo luận Diễn Đàn"
          onClose={() => setLightboxImage(null)}
        />
      )}
    </div>
  );
};

export default ForumScreen;
