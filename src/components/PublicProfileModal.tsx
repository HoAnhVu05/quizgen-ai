import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  GraduationCap,
  Building2,
  BookOpen,
  MessageSquare,
  UserPlus,
  UserCheck,
  UserMinus,
  UserX,
  Send,
  Lock,
  Globe,
  Share2,
  Calendar,
  Sparkles,
  Heart,
  FileText,
  MapPin,
  ExternalLink,
  Clock,
} from 'lucide-react';
import { PublicUserProfile, UserProfile } from '../types';
import { UserAvatar } from './common/UserAvatar';
import { getUserAvatarUrl, saveUserAvatarSync } from '../utils/avatarHelper';
import apiClient, { API_BASE } from '../services/apiClient';

interface PublicProfileModalProps {
  userEmail: string | null;
  userName?: string;
  isOpen: boolean;
  onClose: () => void;
  currentUser?: UserProfile | null;
  onStartDirectChat?: (targetEmail: string, targetName?: string) => void;
  onSendFriendRequest?: (targetEmail: string, targetName?: string) => void;
  onUnfriend?: (targetEmail: string, targetName?: string) => void;
  onCancelFriendRequest?: (targetEmail: string) => void;
  isFriend?: boolean;
  hasSentRequest?: boolean;
}

export const PublicProfileModal: React.FC<PublicProfileModalProps> = ({
  userEmail,
  userName,
  isOpen,
  onClose,
  currentUser,
  onStartDirectChat,
  onSendFriendRequest,
  onUnfriend,
  onCancelFriendRequest,
  isFriend: initialIsFriend,
  hasSentRequest: initialHasSentRequest,
}) => {
  const [profile, setProfile] = useState<PublicUserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'textbooks' | 'posts'>('info');
  const [isFriend, setIsFriend] = useState(initialIsFriend || false);
  const [hasSentRequest, setHasSentRequest] = useState(initialHasSentRequest || false);

  useEffect(() => {
    setIsFriend(initialIsFriend || false);
  }, [initialIsFriend]);

  useEffect(() => {
    setHasSentRequest(initialHasSentRequest || false);
  }, [initialHasSentRequest]);

  useEffect(() => {
    if (!isOpen || (!userEmail && !userName)) return;

    let email = (userEmail || '').trim().toLowerCase();
    const cleanUName = (userName || '').toLowerCase().trim();

    // Nếu chưa có email nhưng có userName, tìm kiếm hoặc ánh xạ chuẩn xác
    if (!email && userName) {
      if (cleanUName.includes('vũ') || cleanUName.includes('anh vũ')) {
        email = 'avanimechannel@gmail.com';
      } else if (cleanUName.includes('hậu') || cleanUName.includes('liêu')) {
        email = 'lieuthanhau@gmail.com';
      } else if (cleanUName.includes('tân')) {
        email = 'nguyentann0804@gmail.com';
      } else if (cleanUName.includes('hân')) {
        email = 'hanbich1506@gmail.com';
      } else {
        email = `${userName.toLowerCase().replace(/[^a-z0-9]/g, '')}@uth.edu.vn`;
      }
    }

    const isMe = Boolean(
      (currentUser?.email && currentUser.email.toLowerCase() === email) ||
      (currentUser?.fullName && userName && currentUser.fullName.toLowerCase() === cleanUName)
    );

    // Load public shared textbooks
    let publicBooks: any[] = [];
    try {
      // 1. Get from shared books
      const sharedDocs = [
        {
          id: 'tb-001',
          name: 'BAI GIANG Tu tuong HCM - LLCT.pdf',
          totalPages: 102,
          chaptersCount: 12,
          subject: 'Lý Luận Chính Trị',
          authorEmail: 'hanbich1506@gmail.com',
          authorName: 'ThS. Hân Bích',
        },
        {
          id: 'tb-002',
          name: '2018-Operating System Concepts-10th.pdf',
          totalPages: 1278,
          chaptersCount: 20,
          subject: 'Hệ Điều Hành & Mạng',
          authorEmail: 'vuha3608@ut.edu.vn',
          authorName: 'TS. Hồ Anh Vũ',
        },
      ];

      // Add any custom shared books matching email
      const localBooks = JSON.parse(localStorage.getItem('quizgen_uploaded_documents') || '[]');
      const userBooks = localBooks
        .filter((b: any) => b && (b.isShared || b.is_shared) && (!b.authorEmail || b.authorEmail.toLowerCase() === email))
        .map((b: any) => ({
          id: b.id,
          name: b.name,
          totalPages: b.totalPages || 120,
          chaptersCount: b.chaptersCount || 5,
          subject: b.subject || 'Khoa Chuyên Ngành',
        }));

      publicBooks = [...sharedDocs.filter((b) => b.authorEmail?.toLowerCase() === email), ...userBooks];
    } catch {}

    // Load forum posts created by this user
    let userPosts: any[] = [];
    try {
      const savedPosts = JSON.parse(localStorage.getItem('quizgen_forum_posts') || '[]');
      userPosts = savedPosts
        .filter((p: any) => p && (p.authorEmail?.toLowerCase() === email || p.authorName === userName))
        .map((p: any) => ({
          id: p.id,
          title: p.title || 'Bài chia sẻ học thuật',
          content: p.content || '',
          createdAt: p.createdAt || 'Gần đây',
          likesCount: p.likes || 0,
          commentsCount: Array.isArray(p.comments) ? p.comments.length : 0,
        }));
    } catch {}

    // Fallback info based on known users or synthesized academic profile
    let academicTitle = 'ThS.';
    let faculty = 'Khoa Công nghệ Thông tin';
    let department = 'Bộ môn Kỹ thuật Phần mềm';
    let office = 'P. A2-304, Tòa nhà Trung tâm UTH';
    let subjects = 'Hệ điều hành, Kiến trúc Máy tính, An toàn Mạng';
    let researchFocus = 'Trí tuệ Nhân tạo, Hệ thống Nhúng & Cloud Computing';
    let bio = 'Giảng viên chuyên môn tại Đại học Giao thông Vận tải TP.HCM (UTH). Quan tâm đến nghiên cứu ứng dụng AI trong khảo thí và biên soạn ngân hàng câu hỏi chuẩn đầu ra.';

    if (email.includes('vuha') || email.includes('avanime') || (userName && userName.includes('Vũ'))) {
      academicTitle = 'TS.';
      department = 'Bộ Môn Mạng & Hệ Điều Hành';
      subjects = 'Hệ Điều Hành, Mạng Máy Tính, Điện toán Đám mây';
      researchFocus = 'Phân tích Dữ liệu Lớn, Khảo thí Tự động Hóa với AI';
    } else if (email.includes('hanbich') || (userName && userName.includes('Hân'))) {
      academicTitle = 'ThS.';
      faculty = 'Khoa Lý luận Chính trị';
      department = 'Tổ Bộ Môn Lý Luận Chính Trị';
      subjects = 'Triết học Mác - Lênin, Tư tưởng Hồ Chí Minh';
      researchFocus = 'Đổi mới Phương pháp Giảng dạy Học phần Đại cương';
    } else if (email.includes('tan') || (userName && userName.includes('Tân'))) {
      academicTitle = 'ThS.';
      department = 'Bộ môn Khoa học Dữ liệu & AI';
      subjects = 'Cơ sở Dữ liệu Phân tán, Machine Learning, RAG Pipeline';
    }

    if (isMe && currentUser) {
      academicTitle = currentUser.academicTitle || academicTitle;
      faculty = currentUser.faculty || faculty;
      department = currentUser.department || department;
      office = currentUser.office || office;
      subjects = currentUser.subjects || subjects;
      researchFocus = currentUser.researchFocus || researchFocus;
      bio = currentUser.bio || bio;
    }

    setProfile({
      id: `usr-${email}`,
      email,
      fullName: isMe ? (currentUser?.fullName || userName || 'Giảng viên') : (userName || email.split('@')[0]),
      academicTitle,
      role: isMe ? (currentUser?.role || 'lecturer') : 'lecturer',
      faculty,
      department,
      office,
      subjects,
      researchFocus,
      bio,
      avatarUrl: isMe ? (currentUser?.avatarUrl || '') : (getUserAvatarUrl(email, userName) || ''),
      avatarColor: 'bg-gradient-to-tr from-purple-600 to-indigo-600',
      isFriend: isFriend,
      hasPendingRequest: hasSentRequest,
      sharedTextbooks: publicBooks,
      forumPosts: userPosts,
    });

    // Khi xem tài khoản người khác, gọi trực tiếp API backend để đồng bộ ảnh đại diện thực tế (Google/upload)
    let isMounted = true;
    if (!isMe && email && email.includes('@')) {
      apiClient
        .fetch(`${API_BASE}/auth/users/lookup?email=${encodeURIComponent(email)}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (!isMounted || !data?.exists || !data?.user) return;
          const u = data.user;
          const serverAvatar = (u.avatarUrl || u.avatar_url || '').trim();
          if (serverAvatar) {
            saveUserAvatarSync(email, serverAvatar);
          }
          setProfile((prev) => {
            if (!prev || prev.email.toLowerCase() !== email) return prev;
            return {
              ...prev,
              fullName: u.fullName || prev.fullName,
              academicTitle: u.academicTitle || prev.academicTitle,
              department: u.department || prev.department,
              university: u.university || prev.university,
              avatarUrl: serverAvatar || prev.avatarUrl,
            };
          });
        })
        .catch(() => {});
    }

    return () => {
      isMounted = false;
    };
  }, [isOpen, userEmail, userName, currentUser, isFriend, hasSentRequest]);

  if (!isOpen || !profile) return null;

  const isMe = currentUser?.email?.toLowerCase() === profile.email.toLowerCase();

  const handleSendFriendAction = () => {
    if (onSendFriendRequest && profile) {
      onSendFriendRequest(profile.email, profile.fullName);
      setHasSentRequest(true);
      setIsFriend(false);
    }
  };

  const handleCancelFriendRequestAction = () => {
    if (onCancelFriendRequest && profile) {
      onCancelFriendRequest(profile.email);
      setHasSentRequest(false);
    }
  };

  const handleUnfriendAction = () => {
    if (onUnfriend && profile) {
      onUnfriend(profile.email, profile.fullName);
      setIsFriend(false);
      setHasSentRequest(false);
    }
  };

  const handleStartChatAction = () => {
    if (onStartDirectChat && profile) {
      onStartDirectChat(profile.email, profile.fullName);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-slate-900/60 p-3 sm:p-4 animate-fade-in">
      <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Cover Banner */}
        <div className="h-32 bg-gradient-to-r from-purple-600 via-indigo-600 to-teal-600 relative shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Header with Avatar & Basic Info */}
        <div className="px-6 pb-4 border-b border-slate-100 relative bg-white shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 -mt-12 mb-3">
            <div className="flex items-end gap-3.5">
              <div className="w-24 h-24 rounded-3xl bg-white p-1 shadow-lg shrink-0">
                <UserAvatar
                  avatarUrl={isMe ? currentUser?.avatarUrl : profile.avatarUrl}
                  name={profile.fullName}
                  email={profile.email}
                  size="2xl"
                  rounded="rounded-2xl"
                  className="w-full h-full shadow-inner"
                />
              </div>
              <div className="pb-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-lg font-extrabold text-slate-900 tracking-tight truncate">
                    {profile.academicTitle ? `${profile.academicTitle} ` : ''}{profile.fullName}
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                    Giảng viên
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-mono mt-0.5">{profile.email}</p>
              </div>
            </div>

            {/* Actions for other users: Toàn bộ là nút bấm trực tiếp nổi bật, KHÔNG để trong 3 chấm */}
            {!isMe && (
              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center flex-wrap justify-end">
                {isFriend ? (
                  <>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 font-bold text-xs border border-emerald-200">
                      <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                      Đồng nghiệp
                    </span>
                    <button
                      type="button"
                      onClick={handleUnfriendAction}
                      className="px-3.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold flex items-center gap-1.5 border border-rose-200 hover:border-rose-300 transition-all cursor-pointer shadow-2xs"
                      title="Hủy kết nối đồng nghiệp với người này"
                    >
                      <UserMinus className="w-3.5 h-3.5 text-rose-600" />
                      Hủy kết bạn
                    </button>
                  </>
                ) : hasSentRequest ? (
                  <>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 text-amber-800 font-medium text-xs border border-amber-200">
                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                      Đã gửi lời mời
                    </span>
                    <button
                      type="button"
                      onClick={handleCancelFriendRequestAction}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-700 text-xs font-bold flex items-center gap-1.5 border border-slate-200 hover:border-rose-200 transition-all cursor-pointer"
                      title="Thu hồi lời mời kết bạn"
                    >
                      <UserX className="w-3.5 h-3.5 text-slate-500 hover:text-rose-600" />
                      Hủy lời mời
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={handleSendFriendAction}
                    className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-teal-600 to-indigo-600 hover:from-teal-700 hover:to-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md hover:shadow-lg transition-all cursor-pointer"
                    title="Gửi lời mời kết bạn đồng nghiệp"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    Kết bạn
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleStartChatAction}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5 text-teal-400" />
                  Nhắn tin
                </button>
              </div>
            )}
          </div>

          {/* Bio snippet */}
          {profile.bio && (
            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50/70 p-3 rounded-2xl border border-slate-100">
              {profile.bio}
            </p>
          )}

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 mt-4">
            <button
              type="button"
              onClick={() => setActiveTab('info')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                activeTab === 'info'
                  ? 'bg-purple-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Hồ sơ công khai
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('textbooks')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${
                activeTab === 'textbooks'
                  ? 'bg-purple-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Giáo trình công khai ({profile.sharedTextbooks.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('posts')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${
                activeTab === 'posts'
                  ? 'bg-purple-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Bài viết Diễn đàn ({profile.forumPosts.length})</span>
            </button>
          </div>
        </div>

        {/* Tab Body Content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {activeTab === 'info' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <Building2 className="w-3 h-3 text-purple-600" />
                    Đơn vị công tác
                  </span>
                  <p className="text-xs font-bold text-slate-800">{profile.faculty || 'Đại học Giao thông Vận tải TP.HCM'}</p>
                  <p className="text-[11px] text-slate-500">{profile.department}</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-indigo-600" />
                    Phòng làm việc / Lab
                  </span>
                  <p className="text-xs font-bold text-slate-800">{profile.office || 'P. A2-304'}</p>
                  <p className="text-[11px] text-slate-500">Cơ sở 1 (Số 2, Võ Oanh, P.25, Bình Thạnh)</p>
                </div>
              </div>

              {profile.subjects && (
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <BookOpen className="w-3 h-3 text-teal-600" />
                    Học phần & Môn học phụ trách chính
                  </span>
                  <p className="text-xs text-slate-700 leading-relaxed font-medium">
                    {profile.subjects}
                  </p>
                </div>
              )}

              {profile.researchFocus && (
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    Hướng nghiên cứu chuyên sâu
                  </span>
                  <p className="text-xs text-slate-700 leading-relaxed font-medium">
                    {profile.researchFocus}
                  </p>
                </div>
              )}

              <div className="p-3 rounded-2xl bg-amber-50/60 border border-amber-200/60 text-[11px] text-amber-800 flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>
                  Các tài liệu, đề thi và thông tin cá nhân ở chế độ Riêng tư (Private) sẽ không bao giờ hiển thị trên trang cá nhân này.
                </span>
              </div>
            </div>
          )}

          {activeTab === 'textbooks' && (
            <div className="space-y-3">
              {profile.sharedTextbooks.length === 0 ? (
                <div className="p-10 text-center text-slate-400 space-y-2">
                  <BookOpen className="w-10 h-10 mx-auto text-slate-300" />
                  <p className="text-xs font-bold text-slate-600">Chưa có giáo trình công khai nào</p>
                  <p className="text-[11px]">Người dùng này chưa chia sẻ tài liệu nào lên Thư viện dùng chung.</p>
                </div>
              ) : (
                profile.sharedTextbooks.map((book) => (
                  <div
                    key={book.id}
                    className="p-3.5 rounded-2xl border border-slate-200 bg-white hover:border-purple-300 transition-all flex items-center justify-between gap-3 shadow-2xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-teal-50 text-[#008689] flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-slate-900 truncate">{book.name}</h4>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          {book.subject || 'Khoa Chuyên ngành'} • {book.totalPages} trang • {book.chaptersCount} chương mục
                        </p>
                      </div>
                    </div>

                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200 shrink-0">
                      <Globe className="w-3 h-3" />
                      Công khai
                    </span>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'posts' && (
            <div className="space-y-3">
              {profile.forumPosts.length === 0 ? (
                <div className="p-10 text-center text-slate-400 space-y-2">
                  <MessageSquare className="w-10 h-10 mx-auto text-slate-300" />
                  <p className="text-xs font-bold text-slate-600">Chưa có bài viết thảo luận nào</p>
                  <p className="text-[11px]">Giảng viên này chưa đăng bài viết nào trên Diễn đàn Học thuật.</p>
                </div>
              ) : (
                profile.forumPosts.map((post) => (
                  <div
                    key={post.id}
                    className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-purple-300 transition-all space-y-2 shadow-2xs"
                  >
                    <h4 className="text-xs font-bold text-slate-900 leading-snug">{post.title}</h4>
                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">{post.content}</p>
                    <div className="flex items-center gap-4 text-[11px] text-slate-400 pt-1 border-t border-slate-100">
                      <span>{post.createdAt}</span>
                      <span className="flex items-center gap-1 text-rose-500">
                        <Heart className="w-3 h-3 fill-rose-500" /> {post.likesCount}
                      </span>
                      <span className="flex items-center gap-1 text-slate-500">
                        <MessageSquare className="w-3 h-3" /> {post.commentsCount} bình luận
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            Hồ sơ học thuật chuẩn hóa QuizGen AI
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
