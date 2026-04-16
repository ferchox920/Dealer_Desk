import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import {
  clearPersistedSession,
  persistSession,
  readStoredAccessToken,
  readStoredAdmin,
} from '@/lib/auth-storage';
import {
  getCurrentAdminRequest,
  loginRequest,
  logoutRequest,
  refreshRequest,
} from '@/services/auth.service';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [accessToken, setAccessToken] = useState(() => readStoredAccessToken());
  const [admin, setAdmin] = useState(() => readStoredAdmin());
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  // applySession y resetSession se comparten entre login, refresh y bootstrap.
  // Los dejamos estables con useCallback porque varias paginas dependen de
  // these helpers dentro de useEffect.
  const applySession = useCallback((session) => {
    setAccessToken(session.accessToken);
    setAdmin(session.admin);
    persistSession(session);
  }, []);

  const resetSession = useCallback(() => {
    setAccessToken(null);
    setAdmin(null);
    clearPersistedSession();
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function bootstrapAuth() {
      // Al recargar la app intentamos reutilizar primero el access token guardado.
      // Si ya no sirve, caemos al refresh token en cookie HttpOnly.
      const storedToken = readStoredAccessToken();

      if (storedToken) {
        try {
          const currentAdmin = await getCurrentAdminRequest(storedToken);

          if (!cancelled) {
            applySession({
              accessToken: storedToken,
              admin: currentAdmin,
            });
            setIsBootstrapping(false);
          }

          return;
        } catch (error) {
          if (error.status !== 401) {
            console.error('Auth bootstrap failed while validating token:', error);
          }
        }
      }

      try {
        const refreshedSession = await refreshRequest();

        if (!cancelled) {
          applySession(refreshedSession);
        }
      } catch (error) {
        if (!cancelled) {
          resetSession();
        }
      } finally {
        if (!cancelled) {
          setIsBootstrapping(false);
        }
      }
    }

    bootstrapAuth();

    return () => {
      cancelled = true;
    };
  }, [applySession, resetSession]);

  const login = useCallback(async (credentials) => {
    const session = await loginRequest(credentials);
    applySession(session);
    return session;
  }, [applySession]);

  const refresh = useCallback(async () => {
    try {
      const session = await refreshRequest();
      applySession(session);
      return session;
    } catch (error) {
      resetSession();
      throw error;
    }
  }, [applySession, resetSession]);

  const logout = useCallback(async () => {
    try {
      await logoutRequest();
    } finally {
      resetSession();
    }
  }, [resetSession]);

  const withFreshAccess = useCallback(async (task) => {
    let token = accessToken || readStoredAccessToken();

    if (!token) {
      const refreshedSession = await refresh();
      token = refreshedSession.accessToken;
    }

    try {
      return await task(token);
    } catch (error) {
      if (error.status !== 401) {
        throw error;
      }

      const refreshedSession = await refresh();
      return await task(refreshedSession.accessToken);
    }
  }, [accessToken, refresh]);

  const value = useMemo(() => ({
    accessToken,
    admin,
    isAuthenticated: Boolean(accessToken && admin),
    isBootstrapping,
    login,
    logout,
    refresh,
    withFreshAccess,
  }), [accessToken, admin, isBootstrapping, login, logout, refresh, withFreshAccess]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
