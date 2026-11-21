import apiClient, { API_BASE } from '../services/apiClient';

/**
 * Tải file an toàn, sạch sẽ, không mở tab about:blank và không bị lỗi lặp prefix API_BASE.
 */
export async function downloadFileSafely(
  fileName: string,
  fileUrl?: string,
  onShowToast?: (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => void
): Promise<boolean> {
  if (!fileUrl) {
    onShowToast?.('warning', 'Không tìm thấy tệp', `Tệp "${fileName}" chưa có đường dẫn tải về.`);
    return false;
  }

  // 1. Chuẩn hóa đường dẫn: Tránh lặp /api/v1/api/v1
  let cleanUrl = fileUrl.trim();
  if (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://') || cleanUrl.startsWith('blob:')) {
    // URL tuyệt đối hoặc blob
  } else if (cleanUrl.startsWith('/api/v1')) {
    // Đã có sẵn /api/v1, giữ nguyên
  } else if (cleanUrl.startsWith('/')) {
    cleanUrl = `${API_BASE}${cleanUrl}`;
  } else {
    cleanUrl = `${API_BASE}/${cleanUrl}`;
  }

  // Gắn cờ download=true nếu chưa có
  const separator = cleanUrl.includes('?') ? '&' : '?';
  const downloadEndpoint = cleanUrl.includes('download=') ? cleanUrl : `${cleanUrl}${separator}download=true`;

  onShowToast?.('info', 'Đang tải xuống', `Đang tải tệp "${fileName}" về thiết bị...`);

  try {
    // Ưu tiên tải qua apiClient fetch (hỗ trợ JWT Authorization và xử lý stream an toàn)
    const resp = await apiClient.fetch(downloadEndpoint);
    if (!resp.ok) {
      if (resp.status === 404) {
        throw new Error('Tệp không tồn tại trên máy chủ hoặc đã bị dọn dẹp.');
      }
      throw new Error(`Máy chủ phản hồi mã ${resp.status}`);
    }

    const blob = await resp.blob();
    const blobUrl = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = fileName;
    // Không dùng a.target = '_blank' để tránh nhảy tab about:blank
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setTimeout(() => {
      URL.revokeObjectURL(blobUrl);
    }, 1500);

    onShowToast?.('success', 'Tải tệp thành công', `Đã tải xuống "${fileName}".`);
    return true;
  } catch (err: any) {
    console.warn('Fetch blob download error, attempting direct anchor fallback:', err);
    try {
      const a = document.createElement('a');
      a.href = downloadEndpoint;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return true;
    } catch (fallbackErr: any) {
      onShowToast?.('error', 'Lỗi tải tệp', err?.message || 'Không thể tải tệp tin về máy.');
      return false;
    }
  }
}
