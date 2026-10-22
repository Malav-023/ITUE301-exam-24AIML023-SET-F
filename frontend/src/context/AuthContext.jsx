import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { clearAuth, loadAuth, saveAuth } from '../utils/authStorage';
import { logger } from '../utils/logger';

const EMPTY = { attendee: null, token: null, role: null };
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Global auth state: { attendee, token, role }
  const [auth, setAuth] = useState(() => loadAuth() || EMPTY);

  const login = useCallback(({ attendee, token }) => {
    const next = { attendee, token, role: attendee.role };
    saveAuth(next);
    setAuth(next);
    logger.info('Logged in', { role: next.role });
  }, []);

  const logout = useCallback(() => {
    clearAuth();
    setAuth(EMPTY);
    logger.info('Logged out');
  }, []);

  // api.js fires this when the server answers 401 to a token-bearing request
  useEffect(() => {
    const onUnauthorized = () => {
      logger.warn('Session rejected by server - logging out');
      logout();
    };
    window.addEventListener('auth:unauthorized', onUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', onUnauthorized);
  }, [logout]);

  const value = useMemo(() => ({ ...auth, isAuthenticated: Boolean(auth.token), login, logout }), [auth, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
