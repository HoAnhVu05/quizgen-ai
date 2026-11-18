import React, { useState, useEffect, useRef } from 'react';
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
  GraduationCap,
  Download,
  Maximize2,
  RefreshCw,
  PlusCircle,
  Clock,
  Filter
} from 'lucide-react';
import { UserProfile, ScreenId } from '../types';
import apiClient, { API_BASE } from '../services/apiClient';

interface ForumScreenProps {
  currentUser?: UserProfile | null;
  onNavigate: (screen: ScreenId) => void;
  onShowToast: (type: 'success' | 'info' | 'warning' | 'error', title: string, message: string) => void;
}

export interface ForumComment {
  id: string;
  authorEmail?: string;
  authorName: string;
  authorTitle?: string;
  content: string;
  timestamp: string;
  createdAt?: string;
}

export interface ForumPost {
  id: string;
  authorEmail?: string;
  authorName: string;
  authorTitle?: string;
  authorRole: string;
  department: string;
  timestamp: string;
  createdAt?: string;
  tag: string;
  content: string;
  privacy?: 'public' | 'department' | 'private';
  imageUrl?: string;
  attachmentFileName?: string;
  attachmentFileSize?: string;
  attachmentDownloadUrl?: string;
  videoUrl?: string;
  likes: number;
  likedByEmails?: string[];
  hasLiked?: boolean;
  bookmarkedByEmails?: string[];
  isBookmarked?: boolean;
  comments: ForumComment[];
}

const STORAGE_KEY = 'quizgen_academic_forum_posts';

function getYouTubeVideoId(url?: string): string | null {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
}

export const ForumScreen: React.FC<ForumScreenProps> = ({
  currentUser,
  onNavigate,
  onShowToast
}) => {
  // ─── Posts & Loading State ───────────────────────────────────────────────
  const [posts, setPosts] = useState<ForumPost[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Xóa triệt để các bài post mẫu cũ (post-1, post-2, post-3) nếu còn sót
          const cleaned = parsed.filter(
            (p) => !['post-1', 'post-2', 'post-3'].includes(p.id)
          );
          return cleaned;
        }
      }
    } catch {}
    return [];
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // ─── Filter & Search State ───────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'all' | 'my-posts' | 'bookmarks' | 'department'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTagFilter, setSelectedTagFilter] = useState('All');

  // ─── Comments & Active Menu ──────────────────────────────────────────────
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState('');
  const [activeMenuPostId, setActiveMenuPostId] = useState<string | null>(null);

  // ─── Lightbox Modal State ────────────────────────────────────────────────
  const [lightboxImageUrl, setLightboxImageUrl] = useState<string | null>(null);

  // ─── Edit Post Modal State ───────────────────────────────────────────────
  const [editingPost, setEditingPost] = useState<ForumPost | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editTag, setEditTag] = useState('');
  const [editPrivacy, setEditPrivacy] = useState<'public' | 'department' | 'private'>('public');

  // ─── Share to Q-Group Modal State ────────────────────────────────────────
  const [sharingPost, setSharingPost] = useState<ForumPost | null>(null);
  const [shareTargetGroups, setShareTargetGroups] = useState<any[]>([]);
  const [selectedShareGroupId, setSelectedShareGroupId] = useState<string>('');
  const [shareNote, setShareNote] = useState('');
  const [isSendingShare, setIsSendingShare] = useState(false);

  // ─── Form Inputs for Creating Post ───────────────────────────────────────
  const [postContent, setPostContent] = useState('');
  const [postTag, setPostTag] = useState('Hệ Điều Hành');
  const [postPrivacy, setPostPrivacy] = useState<'public' | 'department' | 'private'>('public');

  const [showAttachImage, setShowAttachImage] = useState(false);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const [showAttachFile, setShowAttachFile] = useState(false);
  const [attachedFileName, setAttachedFileName] = useState('');
  const [attachedFileSize, setAttachedFileSize] = useState('');
  const [attachedDownloadUrl, setAttachedDownloadUrl] = useState('');
  const [isUploadingFile, setIsUploadingFile] = useState(false);

  const [showAttachVideo, setShowAttachVideo] = useState(false);
  const [videoUrlInput, setVideoUrlInput] = useState('');

  const postTextareaRef = useRef<HTMLTextAreaElement>(null);

  const currentEmail = (currentUser?.email || '').toLowerCase();
  const isAdmin = currentUser?.role === 'admin';

  // ─── Helper: Persist Posts to LocalStorage ────────────────────────────────
  const savePostsLocally = (updated: ForumPost[]) => {
    setPosts(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {}
  };

  // ─── Fetch Posts from Central Backend ────────────────────────────────────
  const fetchPostsFromBackend = async (showToastOnRefresh = false) => {
    setIsRefreshing(true);
    try {
      const res = await apiClient.fetch(`${API_BASE}/forum/posts`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          // Format hasLiked / isBookmarked for the current user
          const formatted: ForumPost[] = data.map((p: any) => ({
            ...p,
            hasLiked: currentEmail
              ? (p.likedByEmails || []).map((e: string) => e.toLowerCase()).includes(currentEmail)
              : false,
            isBookmarked: currentEmail
              ? (p.bookmarkedByEmails || []).map((e: string) => e.toLowerCase()).includes(currentEmail)
              : false,
            comments: Array.isArray(p.comments) ? p.comments : []
          }));
          savePostsLocally(formatted);
          if (showToastOnRefresh) {
            onShowToast('info', 'Đã làm mới diễn đàn', `Đã đồng bộ ${formatted.length} bài viết mới nhất từ máy chủ.`);
          }
        }
      }
    } catch (e) {
      console.warn('Backend fetch failed, using local posts:', e);
    } finally {
      setIsRefreshing(false);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Purge old mock data from localStorage immediately on mount
    try {
      const local = localStorage.getItem(STORAGE_KEY);
      if (local) {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed) && parsed.some((p) => ['post-1', 'post-2', 'post-3'].includes(p.id))) {
          const cleaned = parsed.filter((p) => !['post-1', 'post-2', 'post-3'].includes(p.id));
          localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
          setPosts(cleaned);
        }
      }
    } catch {}

    fetchPostsFromBackend();
  }, [currentEmail]);

  // ─── Auto Scroll to Post from Q-Group Share Notification ─────────────────
  useEffect(() => {
    try {
      const focusId = sessionStorage.getItem('quizgen_focus_post_id');
      if (focusId) {
        sessionStorage.removeItem('quizgen_focus_post_id');
        setTimeout(() => {
          const el = document.getElementById(`post-${focusId}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.classList.add('ring-2', 'ring-teal-500', 'bg-teal-50/40');
            setTimeout(() => {
              el.classList.remove('ring-2', 'ring-teal-500', 'bg-teal-50/40');
            }, 3000);
          }
        }, 300);
      }
    } catch {}
  }, [posts]);

  // ─── File Upload Handler (Backend Attachment Persistence) ─────────────────
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingFile(true);
    setAttachedFileName(file.name);
    setAttachedFileSize(`${(file.size / (1024 * 1024)).toFixed(1)} MB`);
    setShowAttachFile(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await apiClient.fetch(`${API_BASE}/documents/forum/upload`, {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        setAttachedDownloadUrl(data.downloadUrl || '');
        setAttachedFileSize(data.fileSize || `${(file.size / (1024 * 1024)).toFixed(1)} MB`);
        onShowToast('success', 'Đã tải lên tệp giáo trình', file.name);
      } else {
        onShowToast('info', 'Đã đính kèm tệp cục bộ', file.name);
      }
    } catch {
      onShowToast('info', 'Đã đính kèm tệp cục bộ', file.name);
    } finally {
      setIsUploadingFile(false);
    }
  };

  // ─── Image Upload Handler (Server Storage + Fallback DataURL) ─────────────
  const handleImageFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingImage(true);
    setShowAttachImage(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await apiClient.fetch(`${API_BASE}/documents/forum/upload`, {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        setImageUrlInput(data.downloadUrl || '');
        onShowToast('success', 'Đã lưu ảnh lên máy chủ', file.name);
        setIsUploadingImage(false);
        return;
      }
    } catch {}

    // Fallback: Read as Data URL
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setImageUrlInput(event.target.result as string);
        onShowToast('info', 'Đã tải ảnh lên', file.name);
      }
      setIsUploadingImage(false);
    };
    reader.readAsDataURL(file);
  };

  // ─── Create Post ─────────────────────────────────────────────────────────
  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postContent.trim()) {
      onShowToast('warning', 'Nội dung trống', 'Vui lòng nhập nội dung bài viết trước khi đăng.');
      return;
    }

    const newPostId = `post-${Date.now()}`;
    const authorDisplayName = currentUser?.fullName || 'Giảng viên UTH';
    const authorDisplayTitle = currentUser?.academicTitle || 'ThS.';
    const authorDisplayRole = currentUser?.role === 'admin' ? 'Quản trị viên' : 'Giảng viên';
    const authorDept = (currentUser as any)?.department || 'Khoa Công nghệ Thông tin';

    const newPost: ForumPost = {
      id: newPostId,
      authorEmail: currentEmail || undefined,
      authorName: authorDisplayName,
      authorTitle: authorDisplayTitle,
      authorRole: authorDisplayRole,
      department: authorDept,
      timestamp: 'Vừa xong',
      createdAt: new Date().toISOString(),
      tag: postTag,
      privacy: postPrivacy,
      content: postContent.trim(),
      imageUrl: imageUrlInput.trim() || undefined,
      attachmentFileName: attachedFileName.trim() || undefined,
      attachmentFileSize: attachedFileSize.trim() || undefined,
      attachmentDownloadUrl: attachedDownloadUrl.trim() || undefined,
      videoUrl: videoUrlInput.trim() || undefined,
      likes: 0,
      likedByEmails: [],
      hasLiked: false,
      bookmarkedByEmails: [],
      isBookmarked: false,
      comments: []
    };

    // 1. Optimistic update
    const updated = [newPost, ...posts];
    savePostsLocally(updated);

    // Reset inputs
    setPostContent('');
    setImageUrlInput('');
    setShowAttachImage(false);
    setAttachedFileName('');
    setAttachedFileSize('');
    setAttachedDownloadUrl('');
    setShowAttachFile(false);
    setVideoUrlInput('');
    setShowAttachVideo(false);

    onShowToast('success', 'Đăng bài thành công', 'Bài viết đã được chia sẻ lên Diễn đàn Học thuật!');

    // 2. Sync to Backend
    try {
      await apiClient.fetch(`${API_BASE}/forum/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPost)
      });
    } catch (err) {
      console.warn('Backend sync failed:', err);
    }
  };

  // ─── Edit Post ───────────────────────────────────────────────────────────
  const handleStartEditPost = (post: ForumPost) => {
    setEditingPost(post);
    setEditContent(post.content);
    setEditTag(post.tag);
    setEditPrivacy(post.privacy || 'public');
    setActiveMenuPostId(null);
  };

  const handleSaveEditPost = async () => {
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
          privacy: editPrivacy
        };
      }
      return p;
    });
    savePostsLocally(updated);
    setEditingPost(null);
    onShowToast('success', 'Đã lưu chỉnh sửa', 'Bài viết đã được cập nhật thành công.');

    try {
      await apiClient.fetch(`${API_BASE}/forum/posts/${editingPost.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: editContent.trim(),
          tag: editTag,
          privacy: editPrivacy
        })
      });
    } catch (e) {
      console.warn('Backend edit sync failed:', e);
    }
  };

  // ─── Delete Post ─────────────────────────────────────────────────────────
  const handleDeletePost = async (postId: string) => {
    if (window.confirm('Thầy/Cô có chắc chắn muốn xóa bài viết này khỏi Diễn đàn không?')) {
      const updated = posts.filter((p) => p.id !== postId);
      savePostsLocally(updated);
      setActiveMenuPostId(null);
      onShowToast('success', 'Đã xóa bài viết', 'Bài viết đã được gỡ khỏi Diễn đàn Học thuật.');

      try {
        await apiClient.fetch(`${API_BASE}/forum/posts/${postId}`, {
          method: 'DELETE'
        });
      } catch (e) {
        console.warn('Backend delete sync failed:', e);
      }
    }
  };

  // ─── Change Privacy ──────────────────────────────────────────────────────
  const handleChangePrivacy = async (postId: string, privacy: 'public' | 'department' | 'private') => {
    const updated = posts.map((p) => (p.id === postId ? { ...p, privacy } : p));
    savePostsLocally(updated);
    setActiveMenuPostId(null);
    const labels = {
      public: 'Công khai toàn trường',
      department: 'Nội bộ Khoa',
      private: 'Riêng tư (Chỉ nhóm chia sẻ)'
    };
    onShowToast('info', 'Đã cập nhật quyền riêng tư', `Bài viết hiện được đặt ở chế độ: ${labels[privacy]}.`);

    try {
      await apiClient.fetch(`${API_BASE}/forum/posts/${postId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ privacy })
      });
    } catch {}
  };

  // ─── Like Toggle ─────────────────────────────────────────────────────────
  const handleToggleLike = async (postId: string) => {
    const updated = posts.map((p) => {
      if (p.id === postId) {
        const nextLiked = !p.hasLiked;
        const newLikes = nextLiked ? p.likes + 1 : Math.max(0, p.likes - 1);
        let likedList = p.likedByEmails || [];
        if (currentEmail) {
          if (nextLiked && !likedList.includes(currentEmail)) {
            likedList = [...likedList, currentEmail];
          } else if (!nextLiked) {
            likedList = likedList.filter((e) => e.toLowerCase() !== currentEmail);
          }
        }
        return {
          ...p,
          hasLiked: nextLiked,
          likes: newLikes,
          likedByEmails: likedList
        };
      }
      return p;
    });
    savePostsLocally(updated);

    try {
      await apiClient.fetch(`${API_BASE}/forum/posts/${postId}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail: currentEmail || 'lecturer@uth.edu.vn' })
      });
    } catch (e) {
      console.warn('Like sync failed:', e);
    }
  };

  // ─── Bookmark Toggle ─────────────────────────────────────────────────────
  const handleToggleBookmark = async (postId: string) => {
    let statusText = '';
    const updated = posts.map((p) => {
      if (p.id === postId) {
        const nextBookmarked = !p.isBookmarked;
        statusText = nextBookmarked
          ? 'Đã lưu bài viết vào mục "Đã lưu"'
          : 'Đã xóa bài viết khỏi mục "Đã lưu"';
        let bList = p.bookmarkedByEmails || [];
        if (currentEmail) {
          if (nextBookmarked && !bList.includes(currentEmail)) {
            bList = [...bList, currentEmail];
          } else if (!nextBookmarked) {
            bList = bList.filter((e) => e.toLowerCase() !== currentEmail);
          }
        }
        return {
          ...p,
          isBookmarked: nextBookmarked,
          bookmarkedByEmails: bList
        };
      }
      return p;
    });
    savePostsLocally(updated);
    onShowToast('info', 'Lưu bài viết', statusText);

    try {
      await apiClient.fetch(`${API_BASE}/forum/posts/${postId}/bookmark`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail: currentEmail || 'lecturer@uth.edu.vn' })
      });
    } catch {}
  };

  // ─── Add Comment ─────────────────────────────────────────────────────────
  const handleAddComment = async (postId: string) => {
    if (!commentDraft.trim()) return;

    const newComment: ForumComment = {
      id: `c-${Date.now()}`,
      authorEmail: currentEmail || undefined,
      authorName: currentUser?.fullName || 'Giảng viên',
      authorTitle: currentUser?.academicTitle || 'ThS.',
      content: commentDraft.trim(),
      timestamp: 'Vừa xong',
      createdAt: new Date().toISOString()
    };

    const updated = posts.map((p) => {
      if (p.id === postId) {
        return {
          ...p,
          comments: [...p.comments, newComment]
        };
      }
      return p;
    });

    savePostsLocally(updated);
    setCommentDraft('');
    onShowToast('success', 'Bình luận thành công', 'Ý kiến của Thầy/Cô đã được ghi nhận.');

    try {
      await apiClient.fetch(`${API_BASE}/forum/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newComment)
      });
    } catch (e) {
      console.warn('Comment sync failed:', e);
    }
  };

  // ─── Delete Comment ──────────────────────────────────────────────────────
  const handleDeleteComment = async (postId: string, commentId: string) => {
    if (!window.confirm('Thầy/Cô có muốn xóa bình luận này không?')) return;

    const updated = posts.map((p) => {
      if (p.id === postId) {
        return {
          ...p,
          comments: p.comments.filter((c) => c.id !== commentId)
        };
      }
      return p;
    });
    savePostsLocally(updated);
    onShowToast('info', 'Đã xóa bình luận', 'Bình luận đã được gỡ khỏi bài viết.');

    try {
      await apiClient.fetch(`${API_BASE}/forum/posts/${postId}/comments/${commentId}`, {
        method: 'DELETE'
      });
    } catch {}
  };

  // ─── Share to Q-Group / Chat ─────────────────────────────────────────────
  const handleOpenShareModal = async (post: ForumPost) => {
    setSharingPost(post);
    setShareNote('');
    setActiveMenuPostId(null);

    let available: any[] = [];
    try {
      const res = await apiClient.fetch(`${API_BASE}/documents/qgroups`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          available = data;
        }
      }
    } catch {}

    if (available.length === 0) {
      try {
        const local = localStorage.getItem('quizgen_qgroups');
        if (local) {
          const parsed = JSON.parse(local);
          if (Array.isArray(parsed) && parsed.length > 0) available = parsed;
        }
      } catch {}
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
    const previewText = sharingPost.content.length > 160 ? `${sharingPost.content.slice(0, 160)}...` : sharingPost.content;

    const myName = currentUser?.fullName || 'Giảng viên UTH';
    const myEmail = currentUser?.email || 'lecturer@uth.edu.vn';

    const newMessage: any = {
      id: `msg-share-${Date.now()}`,
      senderEmail: myEmail,
      senderName: myName,
      senderTitle: currentUser?.academicTitle || 'ThS.',
      avatarColor: 'bg-teal-700',
      text: shareNote.trim() || undefined,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      sharedPost: {
        id: sharingPost.id,
        tag: sharingPost.tag,
        authorName: authorDisplayName,
        authorTitle: sharingPost.authorTitle,
        department: sharingPost.department,
        content: previewText,
        fullContent: sharingPost.content,
        attachmentFileName: sharingPost.attachmentFileName,
        attachmentFileSize: sharingPost.attachmentFileSize,
        attachmentDownloadUrl: sharingPost.attachmentDownloadUrl,
        videoUrl: sharingPost.videoUrl,
        timestamp: sharingPost.timestamp,
        note: shareNote.trim() || undefined
      },
      attachment: sharingPost.attachmentFileName
        ? {
            type: 'textbook',
            id: `att-${Date.now()}`,
            name: sharingPost.attachmentFileName,
            size: sharingPost.attachmentFileSize || '1.2 MB',
            subject: sharingPost.tag,
            authorName: authorDisplayName
          }
        : undefined
    };

    // 1. Send via Backend API
    try {
      await apiClient.fetch(
        `${API_BASE}/documents/qgroups/${encodeURIComponent(selectedShareGroupId)}/messages`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newMessage)
        }
      );
    } catch (e) {
      console.warn('Backend sync failed, saving locally:', e);
    }

    // 2. Sync to local storage for instant reactive UI
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
              unreadCount: (g.unreadCount || 0) + 1
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
    setShareNote('');
    onShowToast('success', 'Chia sẻ thành công', `Đã chuyển bài viết vào "${targetName}"!`);
  };

  // ─── Filter Logic ────────────────────────────────────────────────────────
  const TAGS = ['All', 'Hệ Điều Hành', 'Kinh Tế Vi Mô', 'Tư Tưởng HCM', 'Ma Trận Bloom', 'Mẹo Ra Đề', 'Khảo Thí', 'Toán Cao Cấp'];

  const filteredPosts = posts.filter((p) => {
    // 1. Tab filter
    if (activeTab === 'my-posts') {
      if (p.authorEmail && currentEmail && p.authorEmail.toLowerCase() !== currentEmail) {
        return false;
      }
      if (!p.authorEmail && p.authorName !== (currentUser?.fullName || '')) {
        return false;
      }
    } else if (activeTab === 'bookmarks') {
      if (!p.isBookmarked) return false;
    } else if (activeTab === 'department') {
      const userDept = (currentUser as any)?.department;
      if (userDept && !p.department.toLowerCase().includes(userDept.toLowerCase())) {
        return false;
      }
    }

    // 2. Tag filter
    const matchesTag = selectedTagFilter === 'All' || p.tag.toLowerCase() === selectedTagFilter.toLowerCase();
    if (!matchesTag) return false;

    // 3. Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchText =
        p.content.toLowerCase().includes(q) ||
        p.authorName.toLowerCase().includes(q) ||
        p.tag.toLowerCase().includes(q) ||
        (p.attachmentFileName && p.attachmentFileName.toLowerCase().includes(q)) ||
        p.department.toLowerCase().includes(q);
      if (!matchText) return false;
    }

    return true;
  });

  return (
    <div
      onClick={() => {
        if (activeMenuPostId) setActiveMenuPostId(null);
      }}
      className="flex-1 p-3.5 sm:p-6 md:p-8 overflow-y-auto space-y-5 bg-[#f7f9fb] text-slate-800 w-full max-w-full overflow-x-hidden relative"
    >
      {/* ─── 1. Header Banner ────────────────────────────────────────────── */}
      <div className="bg-slate-900 rounded-2xl p-6 text-white border border-slate-800 shadow-sm relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider bg-white/10 text-teal-300 border border-white/20">
              <Building2 className="w-3.5 h-3.5 text-teal-400" />
              Diễn Đàn Khoa Học &amp; Trao Đổi Khảo Thí UTH
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Diễn Đàn Học Thuật Giảng Viên
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
              Không gian kết nối chuyên môn: thảo luận ma trận đề thi Bloom, chia sẻ bài giảng, sơ đồ minh họa, tệp giáo trình và video bài học chuẩn.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={() => fetchPostsFromBackend(true)}
              disabled={isRefreshing}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all cursor-pointer flex items-center gap-1.5"
              title="Đồng bộ lại dữ liệu từ máy chủ"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-teal-400 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Làm mới</span>
            </button>

            <button
              onClick={() => onNavigate('upload')}
              className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Vào Thư Viện Giáo Trình</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─── 2. Create Post Card ─────────────────────────────────────────── */}
      <div className="bg-white rounded-xl p-5 sm:p-6 border border-slate-200 shadow-2xs space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
          <div className="w-9 h-9 rounded-lg bg-slate-800 text-white font-bold text-xs flex items-center justify-center shrink-0">
            {(currentUser?.fullName || 'GV').slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
              <span>
                {currentUser?.academicTitle ? `${currentUser.academicTitle} ` : ''}
                {currentUser?.fullName || 'Giảng viên UTH'}
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
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
            ref={postTextareaRef}
            value={postContent}
            onChange={(e) => setPostContent(e.target.value)}
            placeholder="Chia sẻ kinh nghiệm giảng dạy, ma trận đề thi Bloom, sơ đồ học phần hoặc đóng góp tài liệu học thuật..."
            rows={3}
            className="w-full p-3.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-slate-500 text-slate-800 placeholder-slate-400 resize-none leading-relaxed"
          />

          {/* Attachment Preview Trays */}
          {showAttachImage && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5 overflow-hidden flex-1">
                <ImageIcon className="w-4 h-4 text-slate-700 shrink-0" />
                {imageUrlInput ? (
                  <span className="font-semibold text-slate-800 truncate">
                    {imageUrlInput.startsWith('data:') ? 'Ảnh từ thiết bị' : imageUrlInput}
                  </span>
                ) : (
                  <input
                    type="text"
                    value={imageUrlInput}
                    onChange={(e) => setImageUrlInput(e.target.value)}
                    placeholder="Dán đường dẫn ảnh trực tuyến (URL)..."
                    className="bg-white px-3 py-1.5 rounded-lg border border-slate-300 text-xs w-full focus:outline-none"
                  />
                )}
                {isUploadingImage && <span className="text-[11px] text-teal-600 animate-pulse">Đang tải lên...</span>}
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
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5 overflow-hidden flex-1">
                <FileText className="w-4 h-4 text-slate-700 shrink-0" />
                <span className="font-semibold text-slate-800 truncate">
                  {attachedFileName || 'Tệp giáo trình / Đề thi đính kèm'}
                </span>
                {attachedFileSize && (
                  <span className="text-[11px] text-slate-500 font-mono">({attachedFileSize})</span>
                )}
                {isUploadingFile && <span className="text-[11px] text-teal-600 animate-pulse">Đang lưu máy chủ...</span>}
              </div>
              <button
                type="button"
                onClick={() => {
                  setAttachedFileName('');
                  setAttachedFileSize('');
                  setAttachedDownloadUrl('');
                  setShowAttachFile(false);
                }}
                className="p-1 text-slate-400 hover:text-rose-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {showAttachVideo && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5 flex-1">
                <Video className="w-4 h-4 text-red-600 shrink-0" />
                <input
                  type="text"
                  value={videoUrlInput}
                  onChange={(e) => setVideoUrlInput(e.target.value)}
                  placeholder="Dán liên kết Video YouTube bài giảng (ví dụ: https://www.youtube.com/watch?v=...)..."
                  className="bg-white px-3 py-1.5 rounded-lg border border-slate-300 text-xs flex-1 focus:outline-none"
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
            <div className="flex items-center flex-wrap gap-1.5 sm:gap-2">
              <label className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 border border-slate-200 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold">
                <ImageIcon className="w-4 h-4 text-slate-600" />
                <span className="hidden sm:inline">Ảnh / Sơ đồ</span>
                <input type="file" accept="image/*" onChange={handleImageFileUpload} className="hidden" />
              </label>

              <label className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 border border-slate-200 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold">
                <FileText className="w-4 h-4 text-slate-600" />
                <span className="hidden sm:inline">Tệp / Giáo trình</span>
                <input type="file" accept=".pdf,.docx,.zip,.xlsx" onChange={handleFileUpload} className="hidden" />
              </label>

              <button
                type="button"
                onClick={() => setShowAttachVideo((prev) => !prev)}
                className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 border border-slate-200 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
              >
                <Video className="w-4 h-4 text-slate-600" />
                <span className="hidden sm:inline">Video Bài Giảng</span>
              </button>

              <div className="h-5 w-px bg-slate-200 mx-1" />

              <div className="flex items-center gap-1">
                <span className="text-[11px] font-semibold text-slate-500">Chủ đề:</span>
                <select
                  value={postTag}
                  onChange={(e) => setPostTag(e.target.value)}
                  className="text-xs font-semibold text-slate-800 bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:bg-white"
                >
                  <option value="Hệ Điều Hành">#Hệ Điều Hành</option>
                  <option value="Kinh Tế Vi Mô">#Kinh Tế Vi Mô</option>
                  <option value="Tư Tưởng HCM">#Tư Tưởng HCM</option>
                  <option value="Ma Trận Bloom">#Ma Trận Bloom</option>
                  <option value="Mẹo Ra Đề">#Mẹo Ra Đề</option>
                  <option value="Khảo Thí">#Khảo Thí</option>
                  <option value="Toán Cao Cấp">#Toán Cao Cấp</option>
                </select>
              </div>

              <div className="flex items-center gap-1">
                <span className="text-[11px] font-semibold text-slate-500">Quyền xem:</span>
                <select
                  value={postPrivacy}
                  onChange={(e) => setPostPrivacy(e.target.value as any)}
                  className="text-xs font-semibold text-slate-800 bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:bg-white"
                >
                  <option value="public">Toàn trường (Công khai)</option>
                  <option value="department">Nội bộ Khoa</option>
                  <option value="private">Riêng tư (Chỉ nhóm)</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={!postContent.trim()}
              className="px-5 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Đăng Bài Lên Diễn Đàn</span>
            </button>
          </div>
        </form>
      </div>

      {/* ─── 3. Tabs Navigation & Search Filter ───────────────────────────── */}
      <div className="space-y-3">
        {/* Category Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-1 overflow-x-auto">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'all'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Tất cả bài viết</span>
            <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-white/20">
              {posts.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('my-posts')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'my-posts'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Pencil className="w-3.5 h-3.5" />
            <span>Bài viết của tôi</span>
          </button>

          <button
            onClick={() => setActiveTab('bookmarks')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'bookmarks'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>Đã lưu</span>
          </button>

          <button
            onClick={() => setActiveTab('department')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'department'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Nội bộ Khoa</span>
          </button>
        </div>

        {/* Tags and Search Strip */}
        <div className="bg-white p-3 sm:p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <Tag className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            {TAGS.map((t) => (
              <button
                key={t}
                onClick={() => setSelectedTagFilter(t)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  selectedTagFilter === t
                    ? 'bg-teal-700 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {t === 'All' ? 'Tất cả chủ đề' : `#${t}`}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm nội dung, tác giả, tài liệu..."
              className="w-full pl-8 pr-3.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-slate-500 text-slate-800 placeholder-slate-400"
            />
          </div>
        </div>
      </div>

      {/* ─── 4. Posts Feed ───────────────────────────────────────────────── */}
      <div className="space-y-4">
        {posts.length === 0 ? (
          /* Empty State khi chưa có bài viết nào trên hệ thống */
          <div className="bg-white rounded-2xl p-12 text-center border border-dashed border-slate-300 text-slate-500 space-y-4 shadow-2xs">
            <div className="w-16 h-16 rounded-2xl bg-teal-50 border border-teal-200 text-teal-700 mx-auto flex items-center justify-center">
              <GraduationCap className="w-8 h-8" />
            </div>
            <div className="max-w-md mx-auto space-y-1">
              <h3 className="text-base font-bold text-slate-900">
                Chưa có bài thảo luận học thuật nào
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Toàn bộ dữ liệu mẫu đã được xóa sạch. Hãy là người đầu tiên chia sẻ tri thức, ma trận đề thi Bloom hoặc giáo trình học phần cho đồng nghiệp!
              </p>
            </div>
            <button
              onClick={() => {
                postTextareaRef.current?.focus();
                postTextareaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
            >
              <PlusCircle className="w-4 h-4 text-teal-400" />
              <span>Tạo Bài Viết Ngay</span>
            </button>
          </div>
        ) : filteredPosts.length === 0 ? (
          /* Empty State khi không tìm thấy kết quả phù hợp với bộ lọc */
          <div className="bg-white rounded-xl p-10 text-center border border-slate-200 text-slate-400 space-y-3">
            <MessageSquare className="w-8 h-8 text-slate-300 mx-auto" />
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-700">
                Không tìm thấy bài viết nào phù hợp với bộ lọc hiện tại.
              </p>
              <p className="text-[11px] text-slate-400">
                Thử xóa từ khóa tìm kiếm hoặc chọn chủ đề "Tất cả chủ đề".
              </p>
            </div>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedTagFilter('All');
                setActiveTab('all');
              }}
              className="px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-all cursor-pointer"
            >
              Đặt lại bộ lọc
            </button>
          </div>
        ) : (
          filteredPosts.map((post) => {
            const isAuthor = currentEmail && post.authorEmail && post.authorEmail.toLowerCase() === currentEmail;
            const canManage = isAuthor || isAdmin;
            const ytVideoId = getYouTubeVideoId(post.videoUrl);

            return (
              <div
                key={post.id}
                id={`post-${post.id}`}
                className="bg-white rounded-xl p-5 sm:p-6 border border-slate-200 shadow-2xs hover:border-slate-300 transition-all space-y-4"
              >
                {/* Post Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-slate-800 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                      {post.authorName.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-2">
                        <span>
                          {post.authorTitle ? `${post.authorTitle} ` : ''}
                          {post.authorName}
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                          {post.authorRole}
                        </span>
                        {isAuthor && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-teal-50 text-teal-700 border border-teal-200">
                            Bạn
                          </span>
                        )}
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
                      <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                        <Building2 className="w-3 h-3" />
                        Nội bộ khoa
                      </span>
                    )}
                    {post.privacy === 'private' && (
                      <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                        <Lock className="w-3 h-3" />
                        Riêng tư
                      </span>
                    )}
                    <span className="px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
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
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                        title="Tùy chọn bài viết"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {/* Dropdown Menu */}
                      {activeMenuPostId === post.id && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="absolute right-0 top-full mt-1.5 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-30 animate-in fade-in zoom-in-95 duration-150 text-xs"
                        >
                          {canManage && (
                            <button
                              type="button"
                              onClick={() => handleStartEditPost(post)}
                              className="w-full px-3.5 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 font-medium transition-colors cursor-pointer"
                            >
                              <Pencil className="w-4 h-4 text-slate-600 shrink-0" />
                              <span>Chỉnh sửa bài viết</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleOpenShareModal(post)}
                            className="w-full px-3.5 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 font-medium transition-colors cursor-pointer"
                          >
                            <Share2 className="w-4 h-4 text-teal-700 shrink-0" />
                            <span>Chia sẻ vào Chat Q-Group</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              handleToggleBookmark(post.id);
                              setActiveMenuPostId(null);
                            }}
                            className="w-full px-3.5 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 font-medium transition-colors cursor-pointer"
                          >
                            <Bookmark className={`w-4 h-4 shrink-0 ${post.isBookmarked ? 'fill-amber-500 text-amber-500' : 'text-slate-500'}`} />
                            <span>{post.isBookmarked ? 'Bỏ lưu bài viết' : 'Lưu bài viết'}</span>
                          </button>

                          {canManage && (
                            <>
                              <div className="h-px bg-slate-100 my-1" />
                              <div className="px-3.5 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                                Quyền riêng tư
                              </div>
                              <button
                                type="button"
                                onClick={() => handleChangePrivacy(post.id, 'public')}
                                className={`w-full px-3.5 py-1.5 text-left flex items-center justify-between text-xs transition-colors cursor-pointer ${
                                  (!post.privacy || post.privacy === 'public')
                                    ? 'text-slate-900 font-bold bg-slate-100'
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
                                    ? 'text-slate-900 font-bold bg-slate-100'
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
                                    ? 'text-slate-900 font-bold bg-slate-100'
                                    : 'text-slate-600 hover:bg-slate-50'
                                }`}
                              >
                                <span className="flex items-center gap-2">
                                  <Lock className="w-3.5 h-3.5" />
                                  Riêng tư
                                </span>
                                {post.privacy === 'private' && <Check className="w-3.5 h-3.5" />}
                              </button>
                            </>
                          )}

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

                          {canManage && (
                            <button
                              type="button"
                              onClick={() => handleDeletePost(post.id)}
                              className="w-full px-3.5 py-2 text-left text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 font-semibold transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4 text-rose-600 shrink-0" />
                              <span>{isAdmin && !isAuthor ? 'Xóa bài viết (Admin)' : 'Xóa bài viết'}</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Post Content */}
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                  {post.content}
                </p>

                {/* Attached Image with Lightbox Zoom */}
                {post.imageUrl && (
                  <div className="relative rounded-2xl overflow-hidden border border-slate-200 max-h-96 bg-slate-100 group">
                    <img
                      src={post.imageUrl}
                      alt="Minh họa bài viết"
                      className="w-full h-full object-cover max-h-96 group-hover:scale-101 transition-transform cursor-pointer"
                      onClick={() => setLightboxImageUrl(post.imageUrl || null)}
                    />
                    <button
                      onClick={() => setLightboxImageUrl(post.imageUrl || null)}
                      className="absolute bottom-3 right-3 px-3 py-1.5 rounded-lg bg-slate-900/80 backdrop-blur-xs text-white text-[11px] font-semibold flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                      <span>Phóng to ảnh</span>
                    </button>
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
                        <div className="text-[11px] text-slate-400 font-mono">
                          Tệp đính kèm học thuật {post.attachmentFileSize ? `• ${post.attachmentFileSize}` : ''}
                        </div>
                      </div>
                    </div>

                    <a
                      href={post.attachmentDownloadUrl || post.imageUrl || '#'}
                      target="_blank"
                      rel="noreferrer"
                      download={post.attachmentFileName}
                      onClick={() => onShowToast('info', 'Tải tài liệu', `Đang tải tệp ${post.attachmentFileName}`)}
                      className="px-3.5 py-1.5 bg-white hover:bg-slate-100 rounded-xl border border-slate-200 font-bold text-slate-700 text-xs shrink-0 cursor-pointer shadow-2xs flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Tải về</span>
                    </a>
                  </div>
                )}

                {/* Attached Video: Responsive YouTube Embed Player */}
                {post.videoUrl && (
                  <div className="rounded-2xl border border-red-200 bg-red-50/30 p-3.5 space-y-2">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2 text-red-700 font-bold">
                        <Video className="w-4 h-4" />
                        <span>Video Bài Giảng Đính Kèm:</span>
                      </div>
                      <a
                        href={post.videoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-red-700 hover:underline flex items-center gap-1 text-[11px] font-semibold"
                      >
                        <span>Mở trên YouTube</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>

                    {ytVideoId ? (
                      <div className="aspect-video w-full rounded-xl overflow-hidden shadow-xs border border-red-100">
                        <iframe
                          src={`https://www.youtube-nocookie.com/embed/${ytVideoId}`}
                          title="YouTube video player"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          allowFullScreen
                          className="w-full h-full border-0"
                        />
                      </div>
                    ) : (
                      <div className="p-2.5 rounded-xl bg-white border border-red-200 text-xs flex items-center justify-between">
                        <span className="text-slate-700 truncate">{post.videoUrl}</span>
                        <a
                          href={post.videoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-red-600 font-bold hover:underline shrink-0 pl-2"
                        >
                          Xem liên kết
                        </a>
                      </div>
                    )}
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
                      className="flex items-center gap-1.5 font-semibold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
                      title="Chia sẻ vào tin nhắn với bạn bè hoặc nhóm Q-Group"
                    >
                      <Share2 className="w-3.5 h-3.5 text-teal-600" />
                      <span className="hidden sm:inline">Chia sẻ</span>
                    </button>

                    <button
                      onClick={() => handleToggleBookmark(post.id)}
                      className={`flex items-center gap-1 font-semibold transition-colors cursor-pointer ${
                        post.isBookmarked ? 'text-amber-600 font-bold' : 'text-slate-500 hover:text-slate-800'
                      }`}
                      title={post.isBookmarked ? 'Bỏ lưu' : 'Lưu bài viết'}
                    >
                      <Bookmark className={`w-3.5 h-3.5 ${post.isBookmarked ? 'fill-amber-500 text-amber-500' : ''}`} />
                      <span className="hidden sm:inline">{post.isBookmarked ? 'Đã lưu' : 'Lưu bài'}</span>
                    </button>
                  </div>

                  <div className="text-[11px] text-slate-400 font-semibold flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5 text-teal-600" />
                    <span>Xác thực Giảng viên UTH</span>
                  </div>
                </div>

                {/* Comments Section */}
                {(activeCommentPostId === post.id || post.comments.length > 0) && (
                  <div className="pt-3 border-t border-slate-100 space-y-3">
                    {/* Comments List */}
                    {post.comments.map((cm) => {
                      const isCommentAuthor = currentEmail && cm.authorEmail && cm.authorEmail.toLowerCase() === currentEmail;
                      const canDeleteComment = isCommentAuthor || isAuthor || isAdmin;

                      return (
                        <div
                          key={cm.id}
                          className="bg-slate-50 rounded-xl p-3 sm:p-3.5 space-y-1 text-xs border border-slate-100 group relative"
                        >
                          <div className="flex items-center justify-between">
                            <strong className="text-slate-900 font-bold text-[11px] flex items-center gap-1.5">
                              <span>
                                {cm.authorTitle ? `${cm.authorTitle} ` : ''}
                                {cm.authorName}
                              </span>
                              {isCommentAuthor && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-teal-100 text-teal-800">
                                  Bạn
                                </span>
                              )}
                            </strong>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-slate-400 font-mono">{cm.timestamp}</span>
                              {canDeleteComment && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteComment(post.id, cm.id)}
                                  className="text-slate-300 hover:text-rose-600 transition-colors p-0.5 cursor-pointer"
                                  title="Xóa bình luận"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>
                          <p className="text-slate-700 text-xs leading-relaxed">{cm.content}</p>
                        </div>
                      );
                    })}

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
                        placeholder="Viết phản hồi hoặc đóng góp ý kiến chuyên môn cho bài viết..."
                        className="flex-1 px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-slate-800 text-slate-800 placeholder-slate-400"
                      />
                      <button
                        onClick={() => handleAddComment(post.id)}
                        disabled={activeCommentPostId !== post.id || !commentDraft.trim()}
                        className="px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 shadow-xs"
                      >
                        <Send className="w-3 h-3" />
                        <span className="hidden sm:inline">Gửi</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ─── 5. Lightbox Modal Phóng To Ảnh ───────────────────────────────── */}
      {lightboxImageUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setLightboxImageUrl(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-4xl max-h-[90vh] bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-800 flex flex-col items-center"
          >
            <div className="w-full flex items-center justify-between p-3 bg-slate-900/90 border-b border-slate-800 text-white text-xs">
              <span className="font-semibold text-slate-300">Xem sơ đồ minh họa toàn màn hình</span>
              <div className="flex items-center gap-2">
                <a
                  href={lightboxImageUrl}
                  download="diagram.png"
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Tải ảnh về</span>
                </a>
                <button
                  type="button"
                  onClick={() => setLightboxImageUrl(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="p-2 overflow-auto max-h-[80vh] flex items-center justify-center">
              <img
                src={lightboxImageUrl}
                alt="Phóng to"
                className="max-h-[75vh] w-auto object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}

      {/* ─── 6. Modal Chỉnh Sửa Bài Viết ───────────────────────────────────── */}
      {editingPost && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setEditingPost(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden space-y-4 p-6 animate-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 text-slate-800 flex items-center justify-center">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Chỉnh Sửa Bài Viết</h3>
                  <p className="text-[11px] text-slate-500">Cập nhật nội dung và thiết lập quyền riêng tư</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingPost(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Nội dung bài viết:</label>
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  rows={4}
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-slate-800 text-slate-800 leading-relaxed resize-none"
                  placeholder="Nhập nội dung bài viết..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Chủ đề (#tag):</label>
                  <select
                    value={editTag}
                    onChange={(e) => setEditTag(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-semibold focus:outline-none focus:bg-white focus:border-slate-800"
                  >
                    <option value="Hệ Điều Hành">#Hệ Điều Hành</option>
                    <option value="Kinh Tế Vi Mô">#Kinh Tế Vi Mô</option>
                    <option value="Tư Tưởng HCM">#Tư Tưởng HCM</option>
                    <option value="Ma Trận Bloom">#Ma Trận Bloom</option>
                    <option value="Mẹo Ra Đề">#Mẹo Ra Đề</option>
                    <option value="Khảo Thí">#Khảo Thí</option>
                    <option value="Toán Cao Cấp">#Toán Cao Cấp</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Quyền riêng tư:</label>
                  <select
                    value={editPrivacy}
                    onChange={(e) => setEditPrivacy(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-semibold focus:outline-none focus:bg-white focus:border-slate-800"
                  >
                    <option value="public">Toàn trường (Công khai)</option>
                    <option value="department">Nội bộ Khoa</option>
                    <option value="private">Riêng tư (Chỉ nhóm)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingPost(null)}
                className="px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-100 text-xs font-semibold transition-all cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleSaveEditPost}
                className="px-5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Lưu Thay Đổi</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── 7. Modal Chia Sẻ Vào Q-Group & Tin Nhắn ────────────────────────── */}
      {sharingPost && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setSharingPost(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden space-y-4 p-6 animate-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 text-slate-800 flex items-center justify-center">
                  <Share2 className="w-4 h-4 text-teal-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Chia Sẻ Vào Cuộc Trò Chuyện Q-Group</h3>
                  <p className="text-[11px] text-slate-500">Gửi bài viết đến Hội đồng bộ môn hoặc Đồng nghiệp</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSharingPost(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Trích dẫn bài viết preview */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-teal-700 text-[11px]">
                  #{sharingPost.tag} • {sharingPost.authorTitle ? `${sharingPost.authorTitle} ` : ''}
                  {sharingPost.authorName}
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
              {shareTargetGroups.length === 0 ? (
                <div className="p-4 bg-slate-50 rounded-xl text-center text-slate-400 text-xs">
                  Chưa có phòng Q-Group nào sẵn sàng. Vui lòng tạo nhóm tại màn hình Q-Group trước.
                </div>
              ) : (
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
              )}
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
