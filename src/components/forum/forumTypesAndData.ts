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
export const VIETNAMESE_HONORIFICS = new Set([
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

export const NOW = Date.now();
export const DEFAULT_POSTS: ForumPost[] = [
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
