/**
 * QuizGen AI - Centralized HTTP & Authentication Client
 * - Tự động đính kèm Bearer Access Token vào mọi yêu cầu
 * - Tự động phát hiện lỗi 401 (Token Expired) và kích hoạt Auto Token Refresh
 * - Cơ chế Mutex Queue ngăn chặn spam nhiều lượt refresh khi có các yêu cầu đồng thời
 * - Đồng bộ phiên đăng nhập đa vai trò (Lecturer, Head of Department, Admin)
 */

export interface TokenPayload {
  access_token: string;
  refresh_token?: string;
  token_type?: string;
  expires_in?: number;
  user?: any;
}

export const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || '/api/v1';

/**
 * Chuẩn hóa URL hình ảnh an toàn tuyệt đối, loại trừ hoàn toàn lỗi nối chuỗi kép /api/v1/api/v1
 * Hỗ trợ Data URI base64, Blob URL, HTTP/HTTPS bên ngoài và đường dẫn nội bộ (/documents/images/...)
 */
export function resolveImageUrl(rawUrl?: string | null): string {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  const trimmed = rawUrl.trim();
  if (!trimmed) return '';

  // Data URI base64, Blob URL hoặc URL đầy đủ
  if (
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://')
  ) {
    return trimmed;
  }

  // Loại bỏ các tiền tố trùng lặp /api/v1 hoặc api/v1 ở đầu chuỗi rawUrl
  let cleanPath = trimmed.replace(/^\/?api\/v1\/?/, '');

  // Nếu chuỗi chỉ là tên tệp (vd: tb-055_p13_img1.jpeg) không có dấu gạch chéo
  if (!cleanPath.includes('/')) {
    cleanPath = `documents/images/${cleanPath}`;
  }

  // Lấy base URL từ môi trường hoặc fallback về /api/v1
  const rawBase = ((import.meta as any).env?.VITE_API_BASE_URL || '/api/v1').trim();
  const baseNormalized = rawBase.replace(/\/+$/, '');

  // Tránh nối lặp /api/v1 nếu base đã có /api/v1 và cleanPath cũng bắt đầu bằng api/v1
  if (cleanPath.startsWith('api/v1/')) {
    cleanPath = cleanPath.substring(7);
  }

  return `${baseNormalized}/${cleanPath.replace(/^\/+/, '')}`;
}

class ApiClient {
  private isRefreshing = false;
  private refreshPromise: Promise<string | null> | null = null;
  private onAuthExpiredListeners: Array<() => void> = [];
  private lastRevokeTime = 0;

  public getAccessToken(): string | null {
    try {
      return (
        localStorage.getItem('quizgen_auth_token') ||
        localStorage.getItem('quizgen_token') ||
        sessionStorage.getItem('quizgen_auth_token') ||
        sessionStorage.getItem('quizgen_token')
      );
    } catch {
      return null;
    }
  }

  public getRefreshToken(): string | null {
    try {
      return (
        localStorage.getItem('quizgen_refresh_token') ||
        sessionStorage.getItem('quizgen_refresh_token') ||
        localStorage.getItem('quizgen_auth_token') ||
        localStorage.getItem('quizgen_token') ||
        sessionStorage.getItem('quizgen_auth_token') ||
        sessionStorage.getItem('quizgen_token')
      );
    } catch {
      return null;
    }
  }

  public setTokens(accessToken: string, refreshToken?: string | null): void {
    try {
      if (accessToken) {
        localStorage.setItem('quizgen_auth_token', accessToken);
        localStorage.setItem('quizgen_token', accessToken);
        sessionStorage.setItem('quizgen_auth_token', accessToken);
        sessionStorage.setItem('quizgen_token', accessToken);
      }
      if (refreshToken) {
        localStorage.setItem('quizgen_refresh_token', refreshToken);
        sessionStorage.setItem('quizgen_refresh_token', refreshToken);
      }
    } catch (e) {
      console.warn('[API Client] Không thể lưu token:', e);
    }
  }

  public clearAuth(): void {
    try {
      localStorage.removeItem('quizgen_auth_token');
      localStorage.removeItem('quizgen_token');
      localStorage.removeItem('quizgen_refresh_token');
      localStorage.removeItem('quizgen_user');
      localStorage.removeItem('quizgen_remember_me');
      localStorage.removeItem('quizgen_last_active');
      sessionStorage.clear();
    } catch (e) {
      console.warn('[API Client] Không thể xóa phiên đăng nhập:', e);
    }
  }

  public onAuthExpired(callback: () => void): () => void {
    this.onAuthExpiredListeners.push(callback);
    return () => {
      this.onAuthExpiredListeners = this.onAuthExpiredListeners.filter((cb) => cb !== callback);
    };
  }

  public notifyAuthRevoked(detail?: string): void {
    const now = Date.now();
    // Chặn bắn liên tiếp nhiều thông báo thu hồi phiên trùng lặp trong vòng 3 giây
    if (now - this.lastRevokeTime < 3000) return;
    this.lastRevokeTime = now;

    this.clearAuth();
    this.onAuthExpiredListeners.forEach((cb) => {
      try {
        cb();
      } catch (err) {
        console.error('[API Client] Lỗi khi kích hoạt callback đăng xuất:', err);
      }
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('quizgen:auth-revoked', {
          detail: detail || 'Phiên làm việc đã bị thu hồi do tài khoản không còn tồn tại trên hệ thống.',
        })
      );
    }
  }

  private notifyAuthExpired(): void {
    const now = Date.now();
    if (now - this.lastRevokeTime < 3000) return;
    this.lastRevokeTime = now;

    this.clearAuth();
    this.onAuthExpiredListeners.forEach((cb) => {
      try {
        cb();
      } catch (err) {
        console.error('[API Client] Lỗi khi kích hoạt callback đăng xuất:', err);
      }
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('quizgen:auth-expired'));
    }
  }

  /**
   * Tái cấp token tự động với cơ chế Singleton Promise (Mutex Queue)
   */
  public async refreshAccessToken(): Promise<string | null> {
    const currentToken = this.getAccessToken();
    // 1. Nếu đang dùng token dev/mock -> tự động gia hạn nội bộ ngay tức thì không để rớt phiên
    if (currentToken && currentToken.startsWith('mock-jwt-')) {
      let role = 'lecturer';
      try {
        const u = JSON.parse(localStorage.getItem('quizgen_user') || '{}');
        if (u && u.role) role = u.role;
      } catch {}
      const refreshedAccess = `mock-jwt-access-${role}-${Date.now()}`;
      const refreshedRefresh = `mock-jwt-refresh-${role}-${Date.now()}`;
      this.setTokens(refreshedAccess, refreshedRefresh);
      return refreshedAccess;
    }

    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      return null;
    }

    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise;
    }

    this.isRefreshing = true;
    this.refreshPromise = (async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${refreshToken}`,
          },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });

        if (res.ok) {
          const data: TokenPayload = await res.json();
          if (data.access_token) {
            this.setTokens(data.access_token, data.refresh_token || refreshToken);
            if (data.user) {
              const currentSaved = localStorage.getItem('quizgen_user');
              const prev = currentSaved ? JSON.parse(currentSaved) : {};
              localStorage.setItem('quizgen_user', JSON.stringify({ ...prev, ...data.user }));
            }
            return data.access_token;
          }
        }

        // Nếu máy chủ chưa phản hồi hoặc refresh token không hợp lệ nhưng còn user cục bộ
        const saved = localStorage.getItem('quizgen_user');
        if (saved) {
          console.warn('[API Client] Tái cấp token thất bại, duy trì chế độ ngoại tuyến an toàn.');
          return null;
        }

        this.notifyAuthExpired();
        return null;
      } catch (err) {
        console.warn('[API Client] Lỗi kết nối khi làm mới token:', err);
        return null;
      } finally {
        this.isRefreshing = false;
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  /**
   * Wrapper chính cho Fetch có tự động đính kèm JWT và Auto Refresh khi gặp 401
   */
  public async fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const urlStr = typeof input === 'string' ? input : input.toString();
    const isAuthEndpoint = urlStr.includes('/auth/login') || urlStr.includes('/auth/refresh');

    const headers = new Headers(init?.headers || {});
    const token = this.getAccessToken();

    if (token && !headers.has('Authorization') && !isAuthEndpoint) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    try {
      const userStr = localStorage.getItem('quizgen_user') || sessionStorage.getItem('quizgen_user');
      if (userStr) {
        const u = JSON.parse(userStr);
        if (u?.email && !headers.has('X-User-Email')) {
          headers.set('X-User-Email', u.email);
        }
        if (u?.id && !headers.has('X-User-Id')) {
          headers.set('X-User-Id', u.id);
        }
        if (u?.role && !headers.has('X-User-Role')) {
          headers.set('X-User-Role', u.role);
        }
      }
    } catch {}

    const modifiedInit: RequestInit = {
      ...init,
      headers,
    };

    let res: Response;
    try {
      res = await fetch(input, modifiedInit);
    } catch (networkError) {
      throw networkError;
    }

    // Nếu tài khoản bị khóa (HTTP 403 Forbidden)
    if (res.status === 403 && !isAuthEndpoint) {
      try {
        const cloned = res.clone();
        const data = await cloned.json();
        const msg = data?.detail || '';
        if (
          typeof msg === 'string' &&
          (msg.includes('bị tạm khóa') || msg.includes('bị khóa') || msg.includes('khóa vĩnh viễn'))
        ) {
          this.clearAuth();
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('quizgen:account-locked', { detail: msg }));
          }
        }
      } catch {}
    }

    // Nếu gặp 401 Unauthorized và không phải endpoint đăng nhập/làm mới
    if (res.status === 401 && !isAuthEndpoint) {
      try {
        const cloned = res.clone();
        const data = await cloned.json();
        const msg = String(data?.detail || '');
        if (msg.includes('ACCOUNT_REVOKED') || msg.includes('không còn tồn tại') || msg.includes('đã bị xóa')) {
          this.notifyAuthRevoked(msg);
          return res;
        }
      } catch {}

      const newToken = await this.refreshAccessToken();
      if (newToken) {
        // Thử lại yêu cầu ban đầu với Access Token vừa tái cấp
        const retryHeaders = new Headers(init?.headers || {});
        retryHeaders.set('Authorization', `Bearer ${newToken}`);
        const retryInit: RequestInit = {
          ...init,
          headers: retryHeaders,
        };
        return await fetch(input, retryInit);
      } else {
        // Chỉ thu hồi phiên nếu người dùng không còn dữ liệu tài khoản cục bộ hợp lệ
        const hasSavedUser =
          typeof window !== 'undefined' &&
          Boolean(localStorage.getItem('quizgen_user') || sessionStorage.getItem('quizgen_user'));
        if (!hasSavedUser) {
          this.notifyAuthRevoked();
        }
      }
    }

    return res;
  }

  public async get<T = any>(endpoint: string, init?: RequestInit): Promise<T> {
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
    const res = await this.fetch(url, { ...init, method: 'GET' });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    return (await res.json()) as T;
  }

  public async post<T = any>(endpoint: string, body?: any, init?: RequestInit): Promise<T> {
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
    const headers = new Headers(init?.headers || {});
    if (body && !(body instanceof FormData) && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    const res = await this.fetch(url, {
      ...init,
      method: 'POST',
      headers,
      body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    return (await res.json()) as T;
  }

  public async patch<T = any>(endpoint: string, body?: any, init?: RequestInit): Promise<T> {
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
    const headers = new Headers(init?.headers || {});
    if (body && !(body instanceof FormData) && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    const res = await this.fetch(url, {
      ...init,
      method: 'PATCH',
      headers,
      body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    return (await res.json()) as T;
  }

  public async delete<T = any>(endpoint: string, init?: RequestInit): Promise<T> {
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
    const res = await this.fetch(url, { ...init, method: 'DELETE' });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    return (await res.json()) as T;
  }
}

export const apiClient = new ApiClient();
export default apiClient;

