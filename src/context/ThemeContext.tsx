import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { SystemThemeId, ThemeConfig, SYSTEM_THEMES } from '../types/theme';
import { apiClient, API_BASE } from '../services/apiClient';

interface ThemeContextValue {
  currentTheme: ThemeConfig;
  activeThemeId: SystemThemeId;
  setTheme: (themeId: SystemThemeId, actorEmail?: string) => Promise<boolean>;
  showParticles: boolean;
  toggleParticles: () => void;
  isLoadingTheme: boolean;
  themeLastUpdated: string | null;
  themeUpdatedBy: string | null;
}

const STORAGE_THEME_KEY = 'quizgen_system_theme';
const STORAGE_PARTICLES_KEY = 'quizgen_show_particles';

const ThemeContext = createContext<ThemeContextValue | null>(null);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Read initial theme from localStorage or fallback to 'default'
  const [activeThemeId, setActiveThemeId] = useState<SystemThemeId>(() => {
    try {
      const cached = localStorage.getItem(STORAGE_THEME_KEY);
      if (cached && cached in SYSTEM_THEMES) {
        return cached as SystemThemeId;
      }
    } catch {
      // ignore
    }
    return 'default';
  });

  const [showParticles, setShowParticles] = useState<boolean>(() => {
    try {
      const cached = localStorage.getItem(STORAGE_PARTICLES_KEY);
      return cached !== 'false'; // Default to true
    } catch {
      return true;
    }
  });

  const [isLoadingTheme, setIsLoadingTheme] = useState<boolean>(false);
  const [themeLastUpdated, setThemeLastUpdated] = useState<string | null>(null);
  const [themeUpdatedBy, setThemeUpdatedBy] = useState<string | null>(null);

  const currentTheme = SYSTEM_THEMES[activeThemeId] || SYSTEM_THEMES.default;

  // Apply CSS variables and data-theme to root element
  useEffect(() => {
    try {
      const root = document.documentElement;
      root.setAttribute('data-theme', activeThemeId);
      root.style.setProperty('--theme-primary', currentTheme.colors.primary);
      root.style.setProperty('--theme-accent', currentTheme.colors.accent);
      root.style.setProperty('--theme-glow', currentTheme.colors.glowColor);
    } catch {
      // ignore
    }
  }, [activeThemeId, currentTheme]);

  // Apply theme change locally & persist
  const applyThemeLocally = useCallback((themeId: SystemThemeId, updatedBy?: string, updatedAt?: string) => {
    if (themeId in SYSTEM_THEMES) {
      setActiveThemeId(themeId);
      try {
        localStorage.setItem(STORAGE_THEME_KEY, themeId);
      } catch {
        // ignore
      }
      if (updatedBy) setThemeUpdatedBy(updatedBy);
      if (updatedAt) setThemeLastUpdated(updatedAt);
    }
  }, []);

  // ─── 1. REAL-TIME BROADCAST ENGINE (< 10ms cross-tab sync) ───────────────
  useEffect(() => {
    let channel: BroadcastChannel | null = null;
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        channel = new BroadcastChannel('quizgen_theme_channel');
        channel.onmessage = (event) => {
          if (event.data && event.data.type === 'THEME_CHANGED' && event.data.themeId) {
            applyThemeLocally(event.data.themeId, event.data.updatedBy, event.data.updatedAt);
          }
        };
      }
    } catch {
      // BroadcastChannel fallback to StorageEvent
    }

    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key === STORAGE_THEME_KEY && e.newValue && e.newValue in SYSTEM_THEMES) {
        applyThemeLocally(e.newValue as SystemThemeId);
      }
    };
    window.addEventListener('storage', handleStorageEvent);

    return () => {
      if (channel) channel.close();
      window.removeEventListener('storage', handleStorageEvent);
    };
  }, [applyThemeLocally]);

  // ─── 2. FETCH LATEST THEME FROM BACKEND ON MOUNT & PERIODIC HEARTBEAT ─────
  const fetchCurrentThemeFromBackend = useCallback(async () => {
    try {
      const res = await apiClient.fetch(`${API_BASE}/theme/current`);
      if (res && res.ok) {
        const data = await res.json();
        if (data && data.activeTheme && data.activeTheme in SYSTEM_THEMES) {
          applyThemeLocally(data.activeTheme, data.updatedBy, data.updatedAt);
        }
      }
    } catch {
      // Fallback silently to cached theme
    }
  }, [applyThemeLocally]);

  useEffect(() => {
    fetchCurrentThemeFromBackend();

    // Heartbeat every 4s to sync across different browsers / computers
    const interval = setInterval(fetchCurrentThemeFromBackend, 4000);
    return () => clearInterval(interval);
  }, [fetchCurrentThemeFromBackend]);

  // ─── 3. ADMIN ACTION: ACTIVATE THEME GLOBALLY ─────────────────────────────
  const setTheme = useCallback(async (themeId: SystemThemeId, actorEmail?: string): Promise<boolean> => {
    if (!(themeId in SYSTEM_THEMES)) return false;

    setIsLoadingTheme(true);
    const cleanActor = actorEmail || 'quizgen.ai.team@gmail.com';

    // 1. Instantly apply locally
    const nowIso = new Date().toISOString();
    applyThemeLocally(themeId, cleanActor, nowIso);

    // 2. Broadcast immediately to all open tabs/windows (< 5ms)
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        const channel = new BroadcastChannel('quizgen_theme_channel');
        channel.postMessage({
          type: 'THEME_CHANGED',
          themeId: themeId,
          updatedBy: cleanActor,
          updatedAt: nowIso
        });
        channel.close();
      }
    } catch {
      // ignore
    }

    // 3. Persist to Backend CSDL admin.db
    let success = true;
    try {
      const payload = { theme_id: themeId, actor_email: cleanActor };
      const res = await apiClient.fetch(`${API_BASE}/theme/current`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res && res.ok) {
        const data = await res.json();
        if (data.updatedAt) setThemeLastUpdated(data.updatedAt);
      } else {
        success = false;
      }
    } catch (err) {
      console.warn('[THEME] Backend persist error:', err);
      // Keep optimistic local theme update active
    } finally {
      setIsLoadingTheme(false);
    }

    return success;
  }, [applyThemeLocally]);

  // Toggle ambient particles
  const toggleParticles = useCallback(() => {
    setShowParticles((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_PARTICLES_KEY, String(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        currentTheme,
        activeThemeId,
        setTheme,
        showParticles,
        toggleParticles,
        isLoadingTheme,
        themeLastUpdated,
        themeUpdatedBy
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
