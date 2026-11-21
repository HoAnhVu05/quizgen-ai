// Quản lý cấu hình chuông thông báo & Ghim hội thoại độc lập theo từng tài khoản (Per-User Preferences)
// Tránh việc tài khoản A thao tác làm ảnh hưởng hoặc xung đột với tài khoản B.

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

export const isConversationPinned = (
  groupId?: string,
  userEmail?: string,
  remotePinnedBy?: string[]
): boolean => {
  if (!userEmail || !groupId) return false;
  const cleanEmail = userEmail.trim().toLowerCase();
  try {
    const key = `quizgen_pinned_${cleanEmail}`;
    const raw = localStorage.getItem(key);
    if (raw) {
      const list = JSON.parse(raw);
      if (Array.isArray(list)) {
        return list.includes(groupId);
      }
    }
  } catch {}
  if (Array.isArray(remotePinnedBy)) {
    return remotePinnedBy.some((e) => e.trim().toLowerCase() === cleanEmail);
  }
  return false;
};

export const toggleConversationPin = (
  groupId: string,
  userEmail?: string,
  currentRemotePinnedBy?: string[]
): boolean => {
  if (!userEmail || !groupId) return false;
  const cleanEmail = userEmail.trim().toLowerCase();
  try {
    const key = `quizgen_pinned_${cleanEmail}`;
    const raw = localStorage.getItem(key);
    let list: string[] = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(list)) list = [];

    // Nếu chưa từng lưu localStorage nhưng remote đã ghim, seed vào list
    if (
      !raw &&
      Array.isArray(currentRemotePinnedBy) &&
      currentRemotePinnedBy.some((e) => e.trim().toLowerCase() === cleanEmail)
    ) {
      list.push(groupId);
    }

    const isNowPinned = !list.includes(groupId);
    if (isNowPinned) {
      list = Array.from(new Set([...list, groupId]));
    } else {
      list = list.filter((id) => id !== groupId);
    }
    localStorage.setItem(key, JSON.stringify(list));
    window.dispatchEvent(
      new CustomEvent('quizgen:pin-toggled', { detail: { groupId, isNowPinned } })
    );
    return isNowPinned;
  } catch {
    return false;
  }
};

