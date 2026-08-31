import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { fetchMe, loginRequest, type AuthUser } from '../api/authApi';
import { ApiError, resetUnauthorizedLatch, setUnauthorizedHandler } from '../api/client';
import {
  clearAuthSession,
  readAuthSession,
  saveAuthSession,
} from './secureStorage';

export type AuthStatus = 'booting' | 'authenticated' | 'anonymous';

type AuthContextValue = {
  status: AuthStatus;
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
  handleUnauthorized: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<AuthStatus>('booting');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const handlingUnauthorized = useRef(false);

  const clearLocalSession = useCallback(async () => {
    await clearAuthSession();
    queryClient.clear();
    setUser(null);
    setToken(null);
    setStatus('anonymous');
    resetUnauthorizedLatch();
  }, [queryClient]);

  const handleUnauthorized = useCallback(async () => {
    if (handlingUnauthorized.current) {
      return;
    }
    handlingUnauthorized.current = true;
    try {
      await clearLocalSession();
    } finally {
      handlingUnauthorized.current = false;
    }
  }, [clearLocalSession]);

  const restoreSession = useCallback(async () => {
    setStatus('booting');
    const stored = await readAuthSession();
    if (!stored) {
      setUser(null);
      setToken(null);
      setStatus('anonymous');
      return;
    }

    try {
      const me = await fetchMe(stored.token);
      await saveAuthSession({ token: stored.token, user: me });
      setToken(stored.token);
      setUser(me);
      setStatus('authenticated');
      resetUnauthorizedLatch();
    } catch (error) {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        await clearLocalSession();
        return;
      }
      // Network failure on cold start: keep anonymous rather than trusting stale token blindly
      // without validation. User can re-login.
      await clearLocalSession();
    }
  }, [clearLocalSession]);

  const login = useCallback(
    async (username: string, password: string) => {
      const session = await loginRequest(username, password);
      await saveAuthSession(session);
      setToken(session.token);
      setUser(session.user);
      setStatus('authenticated');
      resetUnauthorizedLatch();
    },
    [],
  );

  const logout = useCallback(async () => {
    await clearLocalSession();
  }, [clearLocalSession]);

  useEffect(() => {
    void restoreSession();
  }, [restoreSession]);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      void handleUnauthorized();
    });
    return () => setUnauthorizedHandler(null);
  }, [handleUnauthorized]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      token,
      isAuthenticated: status === 'authenticated',
      login,
      logout,
      restoreSession,
      handleUnauthorized,
    }),
    [status, user, token, login, logout, restoreSession, handleUnauthorized],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
