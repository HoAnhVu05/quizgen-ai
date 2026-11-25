/**
 * avatarHelper.ts - Tiện ích chuẩn hóa và đồng bộ Avatar toàn hệ thống QuizGen AI
 * Đảm bảo avatar người dùng (Google photo / tải lên cá nhân / khởi tạo theo tên)
 * xuất hiện đồng nhất 100% ở mọi màn hình: Trang cá nhân, Diễn đàn, QGroup, Sidebar...
 */

const GRADIENT_PALETTES = [
  'from-[#008689] to-[#00a896]', // Teal UTH
  'from-indigo-600 to-blue-600',
  'from-violet-600 to-purple-600',
  'from-sky-600 to-cyan-600',
  'from-emerald-600 to-teal-600',
  'from-amber-600 to-orange-600',
  'from-rose-600 to-pink-600',
  'from-slate-700 to-slate-900',
];

/**
 * Tạo màu nền gradient cố định, xác định (deterministic) dựa trên hash của tên hoặc email
 */
export function getAvatarGradient(identifier?: string | null): string {
  if (!identifier) return GRADIENT_PALETTES[0];
  let hash = 0;
  const str = identifier.trim().toLowerCase();
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % GRADIENT_PALETTES.length;
  return GRADIENT_PALETTES[index];
}

/**
 * Chuẩn hóa và trích xuất 2 chữ cái viết tắt chuẩn (Initials) theo tên người Việt
 * Tự động loại bỏ học hàm học vị (TS, ThS, PGS, GS, KS, KTS, Admin...)
 */
export function getInitials(name?: string | null, email?: string | null): string {
  let cleanName = (name || '').trim();

  // Loại bỏ các tiền tố học hàm học vị phổ biến
  cleanName = cleanName
    .replace(/^(PGS\.?\s*TS\.?|GS\.?\s*TS\.?|TS\.?|ThS\.?|KS\.?|KTS\.?|Admin|Ban Quản trị)\s+/i, '')
    .trim();

  if (cleanName) {
    const parts = cleanName.split(/\s+/).filter(Boolean);
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    if (parts.length >= 2) {
      // Lấy chữ cái lót và chữ cái tên chính (Chuẩn phong cách danh tính Việt Nam)
      const last = parts[parts.length - 1];
      const prev = parts[parts.length - 2];
      return `${prev[0] || ''}${last[0] || ''}`.toUpperCase();
    }
  }

  if (email) {
    const userPart = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '');
    if (userPart.length >= 2) {
      return userPart.slice(0, 2).toUpperCase();
    }
    return userPart.toUpperCase() || 'QG';
  }

  return 'QG';
}

/**
 * Tra cứu Avatar URL theo email hoặc tên từ kho lưu trữ đồng bộ client
 */
export function getUserAvatarUrl(email?: string | null, name?: string | null): string | null {
  if (!email && !name) return null;

  try {
    const cleanEmail = (email || '').trim().toLowerCase();

    // 1. Kiểm tra session hiện tại (currentUser)
    const currentUserStr = localStorage.getItem('quizgen_user') || sessionStorage.getItem('quizgen_user');
    if (currentUserStr) {
      const cu = JSON.parse(currentUserStr);
      if (
        (cleanEmail && cu.email && cu.email.toLowerCase() === cleanEmail) ||
        (name && cu.fullName && cu.fullName.toLowerCase() === name.trim().toLowerCase())
      ) {
        if (cu.avatarUrl && typeof cu.avatarUrl === 'string' && cu.avatarUrl.trim()) {
          return cu.avatarUrl.trim();
        }
      }
    }

    // 2. Tra cứu từ kho lưu trữ avatar tập trung quizgen_user_avatars
    if (cleanEmail) {
      const avatarsMap = JSON.parse(localStorage.getItem('quizgen_user_avatars') || '{}');
      if (avatarsMap[cleanEmail]) {
        return avatarsMap[cleanEmail];
      }
      // Tra cứu case-insensitive
      const lowerKeys = Object.keys(avatarsMap);
      const matchedKey = lowerKeys.find((k) => k.toLowerCase() === cleanEmail);
      if (matchedKey && avatarsMap[matchedKey]) {
        return avatarsMap[matchedKey];
      }
    }

    // 3. Tra cứu từ Google Profiles cache
    if (cleanEmail) {
      const gProfiles = JSON.parse(localStorage.getItem('quizgen_google_profiles') || '{}');
      if (gProfiles[cleanEmail]?.avatarUrl) {
        return gProfiles[cleanEmail].avatarUrl;
      }
    }

    // 4. Tra cứu từ danh sách người dùng đã đăng ký
    const registeredUsers = JSON.parse(localStorage.getItem('quizgen_registered_users') || '[]');
    if (Array.isArray(registeredUsers)) {
      const found = registeredUsers.find(
        (u: any) =>
          (cleanEmail && u.email && u.email.toLowerCase() === cleanEmail) ||
          (name && u.fullName && u.fullName.toLowerCase() === name.trim().toLowerCase())
      );
      if (found?.avatarUrl) {
        return found.avatarUrl;
      }
    }
  } catch (err) {
    console.warn('Lỗi tra cứu avatar:', err);
  }

  return null;
}

/**
 * Lưu avatar vào kho đồng bộ client và thông báo toàn bộ app cập nhật tức thì
 */
export function saveUserAvatarSync(email: string, avatarUrl: string): void {
  if (!email) return;
  try {
    const cleanEmail = email.trim().toLowerCase();
    const avatarsMap = JSON.parse(localStorage.getItem('quizgen_user_avatars') || '{}');
    avatarsMap[cleanEmail] = avatarUrl;
    localStorage.setItem('quizgen_user_avatars', JSON.stringify(avatarsMap));

    // Phát sự kiện toàn cục để mọi component tự động re-render
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('quizgen:avatar-updated', {
          detail: { email: cleanEmail, avatarUrl },
        })
      );
    }
  } catch (err) {
    console.error('Lỗi lưu trữ avatar đồng bộ:', err);
  }
}

/**
 * Nạp toàn bộ danh mục Avatar của tất cả người dùng trong hệ thống từ backend
 * Đảm bảo mọi tài khoản (dù mới đăng nhập trên trình duyệt khác) đều nhìn thấy đúng avatar của đồng nghiệp
 */
export async function syncGlobalAvatarsFromBackend(): Promise<void> {
  try {
    const rawBase = ((import.meta as any).env?.VITE_API_BASE_URL || '/api/v1').trim();
    const baseNormalized = rawBase.replace(/\/+$/, '');

    const res = await fetch(`${baseNormalized}/auth/users/avatars`).catch(() => null);
    if (!res || !res.ok) return;

    const data = await res.json().catch(() => null);
    if (data && data.avatars && typeof data.avatars === 'object') {
      const existing = JSON.parse(localStorage.getItem('quizgen_user_avatars') || '{}');
      let changed = false;

      for (const [email, avt] of Object.entries(data.avatars)) {
        if (typeof avt === 'string' && avt.trim() && existing[email.toLowerCase()] !== avt) {
          existing[email.toLowerCase()] = avt.trim();
          changed = true;
        }
      }

      if (changed) {
        localStorage.setItem('quizgen_user_avatars', JSON.stringify(existing));
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('quizgen:avatar-updated', {
              detail: { globalSync: true },
            })
          );
        }
      }
    }
  } catch (err) {
    console.warn('[AVATAR SYNC] Không thể tải danh sách avatar từ backend:', err);
  }
}

