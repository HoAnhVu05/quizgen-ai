// Quản lý Driver Micro thông minh toàn hệ thống (Smart Audio Device Resolution)
// Tự động nhận diện và ưu tiên Micro phần cứng chuẩn (Realtek, USB, Microphone Array),
// tự động loại bỏ Stereo Mix / Virtual Cable ảo gây câm tiếng,
// và đồng bộ trong suốt giữa Đàm thoại Huddle và Thu âm tin nhắn thoại.

export interface AudioInputDevice {
  deviceId: string;
  label: string;
  isPreferred?: boolean;
}

const PREFERRED_MIC_KEY = 'quizgen_preferred_microphone_id';

const isJunkOrVirtualDevice = (label: string): boolean => {
  const l = label.toLowerCase();
  return (
    l.includes('stereo mix') ||
    l.includes('wave out') ||
    l.includes('what u hear') ||
    l.includes('line in') ||
    l.includes('cable output') ||
    l.includes('vb-audio') ||
    l.includes('virtual') ||
    l.includes('mapper') ||
    l.includes('soundflower')
  );
};

const calculateDeviceScore = (label: string): number => {
  const l = label.toLowerCase();
  if (isJunkOrVirtualDevice(l)) return -100;

  let score = 10;
  // Ưu tiên driver Realtek trên máy tính Windows
  if (l.includes('realtek')) score += 90;
  // Ưu tiên Microphone Array tích hợp trên laptop hiện đại
  if (l.includes('microphone array') || l.includes('array')) score += 80;
  // Ưu tiên micro thu âm USB / tai nghe ngoài chuyên dụng
  if (
    l.includes('usb') ||
    l.includes('rode') ||
    l.includes('hyperx') ||
    l.includes('razer') ||
    l.includes('logitech') ||
    l.includes('shure') ||
    l.includes('fifine') ||
    l.includes('yeti')
  ) {
    score += 75;
  }
  // Ưu tiên micro tai nghe / headset
  if (l.includes('headset') || l.includes('headphone')) score += 50;
  // Micro thông thường
  if (l.includes('microphone') || l.includes('micro')) score += 30;
  // Nếu là default mà không bị virtual
  if (l.includes('default') || l.includes('mặc định')) score += 15;

  return score;
};

// Lấy danh sách micro thực tế đã được làm sạch và sắp xếp theo độ ưu tiên
export const getAvailableMicrophones = async (): Promise<AudioInputDevice[]> => {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) {
    return [];
  }
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const inputs = devices.filter((d) => d.kind === 'audioinput');
    if (inputs.length === 0) return [];

    const scored = inputs.map((d, index) => {
      const label = d.label || `Microphone ${index + 1}`;
      return {
        deviceId: d.deviceId,
        label,
        score: calculateDeviceScore(label),
      };
    });

    // Sắp xếp micro tốt nhất lên đầu
    scored.sort((a, b) => b.score - a.score);

    return scored.map((s) => ({
      deviceId: s.deviceId,
      label: s.label,
    }));
  } catch (err) {
    console.warn('[AudioDeviceManager] Không thể liệt kê thiết bị:', err);
    return [];
  }
};

// Lấy micro tối ưu nhất hiện tại (hoặc micro người dùng đã từng chọn)
export const getOptimalAudioDeviceId = async (): Promise<{
  deviceId: string | null;
  label: string;
}> => {
  const list = await getAvailableMicrophones();
  if (list.length === 0) {
    return { deviceId: null, label: 'Micro mặc định' };
  }

  // 1. Kiểm tra cấu hình đã lưu
  try {
    const savedId = localStorage.getItem(PREFERRED_MIC_KEY);
    if (savedId) {
      const matched = list.find((d) => d.deviceId === savedId);
      if (matched) {
        return { deviceId: matched.deviceId, label: matched.label };
      }
    }
  } catch {}

  // 2. Tự động chọn micro có điểm chất lượng cao nhất (không phải Stereo Mix)
  const best = list[0];
  try {
    if (best?.deviceId) {
      localStorage.setItem(PREFERRED_MIC_KEY, best.deviceId);
    }
  } catch {}

  return { deviceId: best?.deviceId || null, label: best?.label || 'Microphone' };
};

// Lưu micro người dùng chọn (đồng bộ giữa Huddle và Voice Recording)
export const setPreferredAudioDeviceId = (deviceId: string, label?: string): void => {
  if (!deviceId) return;
  try {
    localStorage.setItem(PREFERRED_MIC_KEY, deviceId);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('quizgen:microphone-changed', {
          detail: { deviceId, label },
        })
      );
    }
  } catch {}
};

// Chuyển nhanh sang micro tiếp theo (chỉ bằng 1 click tiện lợi, không cần mở dropdown)
export const cycleToNextMicrophone = async (): Promise<AudioInputDevice | null> => {
  const list = await getAvailableMicrophones();
  if (list.length <= 1) return list[0] || null;

  const currentId = localStorage.getItem(PREFERRED_MIC_KEY);
  let currentIndex = list.findIndex((d) => d.deviceId === currentId);
  if (currentIndex === -1) currentIndex = 0;

  const nextIndex = (currentIndex + 1) % list.length;
  const nextMic = list[nextIndex];
  if (nextMic) {
    setPreferredAudioDeviceId(nextMic.deviceId, nextMic.label);
    return nextMic;
  }
  return null;
};
