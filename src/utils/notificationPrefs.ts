// Quản lý cấu hình chuông thông báo độc lập theo từng tài khoản (Per-User Preferences)
// Tránh việc tài khoản A tắt chuông làm ảnh hưởng đến tài khoản B.

export const isGroupMuted = (groupId?: string, userEmail?: string): boolean => {
  if (!userEmail || !groupId) return false;
  try {
    const key = `quizgen_muted_${userEmail.trim().toLowerCase()}`;
    const raw = localStorage.getItem(key);
    if (!raw) return false;
    const list = JSON.parse(raw);
    return Array.isArray(list) && list.includes(groupId);
  } catch {
    return false;
  }
};

export const toggleGroupMute = (groupId: string, userEmail?: string): boolean => {
  if (!userEmail || !groupId) return false;
  try {
    const key = `quizgen_muted_${userEmail.trim().toLowerCase()}`;
    const raw = localStorage.getItem(key);
    let list: string[] = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(list)) list = [];
    const isNowMuted = !list.includes(groupId);
    if (isNowMuted) {
      list.push(groupId);
    } else {
      list = list.filter((id) => id !== groupId);
    }
    localStorage.setItem(key, JSON.stringify(list));
    window.dispatchEvent(
      new CustomEvent('quizgen:mute-toggled', { detail: { groupId, isNowMuted } })
    );
    return isNowMuted;
  } catch {
    return false;
  }
};
