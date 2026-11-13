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

export const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

class ApiClient {
  private isRefreshing = false;
  private refreshPromise: Promise<string | null> | null = null;
  private onAuthExpiredListeners: Array<() => void> = [];

  public getAccessToken(): string | null {
    try {
      return (
        localStorage.getItem('quizgen_auth_token') ||
        localStorage.getItem('quizgen_token')
      );
    } catch {
      return null;
    }
  }

  public getRefreshToken(): string | null {
    try {
      return (
        localStorage.getItem('quizgen_refresh_token') ||
        localStorage.getItem('quizgen_auth_token') ||
        localStorage.getItem('quizgen_token')
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
      }
      if (refreshToken) {
        localStorage.setItem('quizgen_refresh_token', refreshToken);
      }
    } catch (e) {
      console.warn('[API Client] Không thể lưu token vào localStorage:', e);
    }
  }

  public clearAuth(): void {
    try {
      localStorage.removeItem('quizgen_auth_token');
      localStorage.removeItem('quizgen_token');
      localStorage.removeItem('quizgen_refresh_token');
      localStorage.removeItem('quizgen_user');
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

  private notifyAuthExpired(): void {
    // Không bao giờ tự động đăng xuất nếu còn thông tin người dùng hợp lệ trong bộ nhớ cục bộ
    const savedUser = localStorage.getItem('quizgen_user');
    if (savedUser) {
      console.warn('[API Client] Giữ phiên làm việc từ bộ nhớ cục bộ, tránh tự động đăng xuất.');
      return;
    }

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
}

export const apiClient = new ApiClient();
export default apiClient;

