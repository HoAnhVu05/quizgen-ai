import React, { useState, useEffect } from 'react';
import {
  Search,
  X,
  Plus,
  FileText,
  HelpCircle,
  BookOpen,
  Paperclip,
  MessageSquare,
} from 'lucide-react';
import { UserProfile, ScreenId } from '../types';
import { ImageLightboxModal } from './ImageLightboxModal';
import { downloadFileSafely } from '../utils/fileDownloadHelper';
import {
  ForumPost,
  removeVietnameseTones,
  splitCamelCase,
  VIETNAMESE_HONORIFICS,
  DEFAULT_POSTS,
  serializeForServer,
  parseServerPost,
} from './forum/forumTypesAndData';
import { ForumComposerModal } from './forum/ForumComposerModal';
import { ForumEditPostModal } from './forum/ForumEditPostModal';
import { ForumShareModal } from './forum/ForumShareModal';
import { ForumPostCard } from './forum/ForumPostCard';

interface ForumScreenProps {
  currentUser?: UserProfile | null;
  onNavigate: (screen: ScreenId) => void;
  onShowToast: (type: 'success' | 'info' | 'warning' | 'error', title: string, message: string) => void;
}

export type { ForumPost };
export { removeVietnameseTones };

export const ForumScreen: React.FC<ForumScreenProps> = ({
  currentUser,
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
  const [editingComment, setEditingComment] = useState<{ postId: string; commentId: string; text: string } | null>(null);

  // Modals & Menu State
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<ForumPost | null>(null);
  const [sharingPost, setSharingPost] = useState<ForumPost | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const savePosts = (updated: ForumPost[]) => {
    setPosts(updated);
    try {
      localStorage.setItem('quizgen_academic_forum_posts_v3', JSON.stringify(updated));
    } catch {}
  };

  // Create Post
  const handlePostCreated = (newPost: ForumPost) => {
    savePosts([newPost, ...posts]);
    try {
      fetch('/api/v1/documents/forum/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(serializeForServer(newPost)),
      }).catch((err) => console.warn('Lỗi lưu bài viết lên server:', err));
    } catch {}
  };

  // Save Edit Post
  const handleSaveEditPost = (updatedPost: ForumPost) => {
    const updated = posts.map((p) => (p.id === updatedPost.id ? updatedPost : p));
    savePosts(updated);
    try {
      fetch(`/api/v1/documents/forum/posts/${encodeURIComponent(updatedPost.id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(serializeForServer(updatedPost)),
      }).catch((err) => console.warn('Lỗi cập nhật bài lên server:', err));
    } catch {}
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

  // Download File Safe
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
          likes: next ? p.likes + 1 : Math.max(0, p.likes - 1),
        };
      }
      return p;
    });
    savePosts(updated);
    try {
      void fetch(`/api/v1/documents/forum/posts/${encodeURIComponent(postId)}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail: currentUser?.email || '' }),
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
      createdAt: new Date().toISOString(),
    };

    const updated = posts.map((p) =>
      p.id === postId ? { ...p, comments: [...p.comments, newC] } : p
    );
    savePosts(updated);
    setReplyDrafts({ ...replyDrafts, [postId]: '' });
    onShowToast('success', 'Đã phản hồi', 'Bình luận của Thầy/Cô đã được gửi.');
  };

  // Save Edit Comment
  const handleSaveEditComment = () => {
    if (!editingComment || !editingComment.text.trim()) return;

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

  // Filter Logic
  const filteredPosts = posts.filter((p) => {
    if (!searchQuery.trim() && selectedCategory !== 'all' && p.category !== selectedCategory) {
      return false;
    }

    if (filterWithFileOnly && !p.attachmentFileName && !p.imageUrl && !p.videoUrl && !p.linkUrl) {
      return false;
    }

    if (searchQuery.trim()) {
      const qNorm = removeVietnameseTones(searchQuery);
      const rawTokens = qNorm.split(' ').filter(Boolean);
      if (rawTokens.length === 0) return true;

      let searchTokens = rawTokens;
      const meaningfulTokens = rawTokens.filter((t) => !VIETNAMESE_HONORIFICS.has(t));
      if (meaningfulTokens.length > 0) {
        searchTokens = meaningfulTokens;
      }

      const authorNorm = removeVietnameseTones(`${p.authorTitle || ''} ${p.authorName || ''} ${p.authorRole || ''}`);
      const authorWords = authorNorm.split(' ').filter(Boolean);

      const titleNorm = removeVietnameseTones(p.title || '');
      const titleWords = titleNorm.split(' ').filter(Boolean);

      const tagsExpanded = (p.tags || []).map((t) => splitCamelCase(t)).join(' ');
      const tagsNorm = removeVietnameseTones(tagsExpanded);
      const tagsWords = tagsNorm.split(' ').filter(Boolean);

      const contentNorm = removeVietnameseTones(p.content || '');
      const contentWords = contentNorm.split(' ').filter(Boolean);

      const deptNorm = removeVietnameseTones(p.department || '');
      const deptWords = deptNorm.split(' ').filter(Boolean);

      const commentsNorm = removeVietnameseTones(
        (p.comments || []).map((c) => `${c.authorTitle || ''} ${c.authorName || ''} ${c.content || ''}`).join(' ')
      );
      const commentsWords = commentsNorm.split(' ').filter(Boolean);

      const fullTextNorm = `${authorNorm} ${titleNorm} ${contentNorm} ${deptNorm} ${tagsNorm} ${commentsNorm}`;

      if (
        fullTextNorm.includes(` ${qNorm} `) ||
        fullTextNorm.startsWith(`${qNorm} `) ||
        fullTextNorm.endsWith(` ${qNorm}`) ||
        fullTextNorm === qNorm
      ) {
        return true;
      }

      const allTokensMatch = searchTokens.every((tok) => {
        if (authorWords.includes(tok)) return true;
        if (titleWords.includes(tok) || tagsWords.includes(tok)) return true;
        if (commentsWords.includes(tok) || deptWords.includes(tok)) return true;
        if (contentWords.includes(tok)) return true;
        if ((p.tags || []).some((t) => removeVietnameseTones(t) === tok)) return true;
        if (tok.length >= 5 && fullTextNorm.includes(tok)) return true;
        return false;
      });

      if (!allTokensMatch) {
        return false;
      }
    }

    return true;
  });

  return (
    <div
      onClick={() => {
        if (activeMenuId) setActiveMenuId(null);
      }}
      className="flex-1 flex flex-col h-full overflow-hidden bg-[#f8fafc] text-slate-800"
    >
      {/* ─── 1. TOP EXECUTIVE HEADER ─────────── */}
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

        {/* Categories Bar & Filter Chips */}
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
        {/* COMPOSER MODAL */}
        <ForumComposerModal
          isOpen={isComposerOpen}
          onClose={() => setIsComposerOpen(false)}
          currentUser={currentUser}
          onShowToast={onShowToast}
          onPostCreated={handlePostCreated}
        />

        {/* POSTS STREAM */}
        {filteredPosts.length === 0 ? (
          <div className="bg-white rounded-xl p-10 text-center border border-slate-200 text-slate-400 space-y-2 shadow-2xs">
            <MessageSquare className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-xs font-semibold text-slate-600">Không tìm thấy chủ đề nào phù hợp.</p>
            <p className="text-[11px]">Thử tìm với từ khóa khác hoặc bấm nút "+ Tạo thảo luận" ở trên.</p>
          </div>
        ) : (
          filteredPosts.map((post) => (
            <ForumPostCard
              key={post.id}
              post={post}
              currentUser={currentUser}
              isHighlighted={highlightedPostId === post.id}
              highlightedPostId={highlightedPostId}
              activeMenuId={activeMenuId}
              setActiveMenuId={setActiveMenuId}
              isCommentsExpanded={Boolean(expandedComments[post.id])}
              onToggleComments={() =>
                setExpandedComments((prev) => ({
                  ...prev,
                  [post.id]: !prev[post.id],
                }))
              }
              replyDraft={replyDrafts[post.id] || ''}
              onChangeReplyDraft={(text) => setReplyDrafts({ ...replyDrafts, [post.id]: text })}
              onAddComment={() => handleAddComment(post.id)}
              editingComment={editingComment}
              setEditingComment={setEditingComment}
              onSaveEditComment={handleSaveEditComment}
              onDeleteComment={(commentId) => handleDeleteComment(post.id, commentId)}
              onToggleLike={() => handleToggleLike(post.id)}
              onStartEdit={() => setEditingPost(post)}
              onDeletePost={() => handleDeletePost(post.id)}
              onOpenShareModal={() => setSharingPost(post)}
              onCopyPostLink={() => handleCopyPostLink(post)}
              onDownloadFile={handleDownloadFile}
              onOpenLightbox={(img) => setLightboxImage(img)}
            />
          ))
        )}
      </main>

      {/* ─── 3. MODAL CHỈNH SỬA CHỦ ĐỀ ─────────────────────────────────────── */}
      <ForumEditPostModal
        post={editingPost}
        onClose={() => setEditingPost(null)}
        currentUser={currentUser}
        onShowToast={onShowToast}
        onSaveEdit={handleSaveEditPost}
      />

      {/* ─── 4. MODAL CHIA SẺ VÀO QGROUP ───────────────────────────────────── */}
      <ForumShareModal
        post={sharingPost}
        onClose={() => setSharingPost(null)}
        currentUser={currentUser}
        onShowToast={onShowToast}
      />

      {/* Lightbox Modal Xem Ảnh Đầy Đủ Nội Bộ */}
      {lightboxImage && (
        <ImageLightboxModal
          isOpen={Boolean(lightboxImage)}
          imageUrl={lightboxImage.url}
          title={lightboxImage.title || 'Xem ảnh'}
          onClose={() => setLightboxImage(null)}
        />
      )}
    </div>
  );
};
