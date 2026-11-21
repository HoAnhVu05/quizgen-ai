/**
 * Utility chuẩn hóa hiển thị ngày giờ tiếng Việt (Múi giờ Asia/Ho_Chi_Minh)
 * Giải quyết triệt để lỗi hiển thị timestamp thô, Invalid Date hoặc lệch múi giờ trong Admin
 */

export function formatVietnameseDateTime(
  val: string | number | Date | null | undefined,
  includeSeconds: boolean = false
): string {
  if (!val) return '—';

  let dateObj: Date;

  if (typeof val === 'number') {
    // Nếu là timestamp tính bằng giây (10 chữ số) thì nhân 1000
    dateObj = new Date(val > 1e11 ? val : val * 1000);
  } else if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed || trimmed === 'null' || trimmed === 'undefined') return '—';

    // Nếu chuỗi chứa toàn số (timestamp dạng string)
    if (/^\d+$/.test(trimmed)) {
      const num = parseInt(trimmed, 10);
      dateObj = new Date(num > 1e11 ? num : num * 1000);
    } else {
      // Chuỗi ISO hoặc SQLite "YYYY-MM-DD HH:MM:SS"
      const isoFormatted = trimmed.includes(' ') && !trimmed.includes('T')
        ? trimmed.replace(' ', 'T') + (trimmed.endsWith('Z') ? '' : 'Z')
        : trimmed;
      dateObj = new Date(isoFormatted);
    }
  } else if (val instanceof Date) {
    dateObj = val;
  } else {
    return '—';
  }

  if (isNaN(dateObj.getTime())) {
    return String(val);
  }

  try {
    const formatter = new Intl.DateTimeFormat('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      hour: '2-digit',
      minute: '2-digit',
      ...(includeSeconds ? { second: '2-digit' } : {}),
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour12: false,
    });

    const parts = formatter.formatToParts(dateObj);
    const getPart = (type: string) => parts.find((p) => p.type === type)?.value || '';

    const hour = getPart('hour');
    const minute = getPart('minute');
    const second = getPart('second');
    const day = getPart('day');
    const month = getPart('month');
    const year = getPart('year');

    const timeStr = includeSeconds ? `${hour}:${minute}:${second}` : `${hour}:${minute}`;
    return `${timeStr} ${day}/${month}/${year}`;
  } catch {
    // Fallback nếu trình duyệt không hỗ trợ Intl timezone
    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    const d = dateObj.getDate();
    const m = dateObj.getMonth() + 1;
    const y = dateObj.getFullYear();
    const h = dateObj.getHours();
    const min = dateObj.getMinutes();
    return `${pad(h)}:${pad(min)} ${pad(d)}/${pad(m)}/${y}`;
  }
}

export function formatVietnameseDateOnly(val: string | number | Date | null | undefined): string {
  const full = formatVietnameseDateTime(val);
  if (full === '—') return '—';
  const parts = full.split(' ');
  return parts.length > 1 ? parts[1] : parts[0];
}
