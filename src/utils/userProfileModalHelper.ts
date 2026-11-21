// Helper toàn cục: Kích hoạt hiển thị Modal Xem Trang Cá Nhân từ bất kỳ màn hình nào
// (Diễn đàn, Q-Group chat, Trung tâm hỗ trợ, Admin Portal, Header, v.v.)

export interface OpenUserProfileDetail {
  email?: string;
  name?: string;
  isFriend?: boolean;
  hasSentRequest?: boolean;
}

export const openUserProfile = (
  email?: string,
  name?: string,
  isFriend?: boolean,
  hasSentRequest?: boolean
): void => {
  if (!email && !name) return;
  const cleanEmail = (email || '').trim();
  const cleanName = (name || '').trim();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent<OpenUserProfileDetail>('quizgen:open-profile', {
        detail: {
          email: cleanEmail || undefined,
          name: cleanName || undefined,
          isFriend,
          hasSentRequest,
        },
      })
    );
  }
};
