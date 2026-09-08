import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { setOnAuthExpired } from '../api/authSession';
import { setAccessToken } from '../api/client';
import { queryClient } from '../api/queryClient';
import { AdminAccessRequiredError } from '../utils/errors';
import { loginAdmin, refreshAdmin } from './authApi';
import { clearSession, getStoredRefreshToken, saveSession } from './sessionStorage';
import type { AdminUser, AuthContextValue, AuthStatus } from './types';

const ADMIN_ROLE = 'ADMIN';

// The frontend check below is UX protection only - it decides whether this
// app SHOWS admin screens, nothing more. The backend's own
// /admin/** -> hasRole(ADMIN) rule (SecurityConfig, untouched) is the actual
// authorization authority; this app never calls an admin endpoint for a
// non-admin user regardless of what this check decides.
function hasAdminRole(user: AdminUser): boolean {
  return user.roles.includes(ADMIN_ROLE);
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('checking');
  const [user, setUser] = useState<AdminUser | null>(null);

  // A stored refresh token does not mean the session is still valid, or
  // still ADMIN - the only side-effect-free way to confirm either is to
  // actually call POST /auth/refresh and read the member it returns. On
  // success this mints a fresh in-memory access token exactly like the
  // interceptor's own 401-triggered refresh would.
  const restoreSession = useCallback(async () => {
    setStatus('checking');
    const storedRefreshToken = getStoredRefreshToken();

    if (!storedRefreshToken) {
      setAccessToken(null);
      setUser(null);
      setStatus('unauthenticated');
      return;
    }

    try {
      const response = await refreshAdmin(storedRefreshToken);

      if (!hasAdminRole(response.user)) {
        // A non-admin member's refresh token somehow ended up stored here -
        // never restore a usable session for it, and never attempt any
        // admin API call with it.
        setAccessToken(null);
        clearSession();
        setUser(null);
        setStatus('unauthenticated');
        return;
      }

      setAccessToken(response.accessToken);
      saveSession({ refreshToken: response.refreshToken });
      setUser(response.user);
      setStatus('authenticated');
    } catch {
      setAccessToken(null);
      clearSession();
      setUser(null);
      setStatus('unauthenticated');
    }
  }, []);

  useEffect(() => {
    // Registers the one handler that reacts when a token refresh fails
    // permanently deep inside the Axios interceptor, outside the React tree
    // - see src/api/authSession.ts.
    setOnAuthExpired(() => {
      setUser(null);
      setStatus('unauthenticated');
    });
    return () => setOnAuthExpired(null);
  }, []);

  useEffect(() => {
    // Restoring a session from sessionStorage + verifying it against the
    // network is exactly the "synchronize with an external system on mount"
    // case useEffect exists for - the setState calls happen later, inside
    // the resolved async work, not synchronously in this effect body.
    // oxlint-disable-next-line react/set-state-in-effect
    void restoreSession();
  }, [restoreSession]);

  // Never trusts a frontend-selected role: LoginRequest has no role field at
  // all, and the role checked here comes exclusively from the backend's own
  // response (`response.user.roles`, derived from the persisted
  // Member.role) - never anything this app sent or assumed.
  const login = useCallback(async (email: string, password: string) => {
    const response = await loginAdmin({ email, password });

    if (!hasAdminRole(response.user)) {
      // Do not store any part of this session, and never set status to
      // 'authenticated' for it. The caller (LoginScreen) catches this
      // specific error and shows "Admin access required" - no admin API
      // call is ever attempted for a non-admin login.
      throw new AdminAccessRequiredError();
    }

    setAccessToken(response.accessToken);
    saveSession({ refreshToken: response.refreshToken });
    setUser(response.user);
    setStatus('authenticated');
  }, []);

  // The backend has no admin logout/revocation endpoint - a JWT stays valid
  // until it expires regardless of what the client does. Logout is
  // therefore entirely local: dispose of the in-memory access token, the
  // persisted session, this app's own state, and the query cache (nothing is
  // cached yet in Phase 1, but this keeps the same discipline mobile/
  // barista-web already established for a shared-device scenario).
  const logout = useCallback(() => {
    setAccessToken(null);
    clearSession();
    queryClient.clear();
    setUser(null);
    setStatus('unauthenticated');
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated: status === 'authenticated',
      isLoading: status === 'checking',
      user,
      login,
      logout,
      restoreSession,
    }),
    [status, user, login, logout, restoreSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Exporting this hook alongside AuthProvider from the same file is the
// standard React Context pattern (mirrors mobile/barista-web's own
// AuthContext.tsx exactly) - splitting it into its own file purely to
// satisfy a fast-refresh lint heuristic would be an unnecessary extra layer
// for a single function.
// oxlint-disable-next-line react/only-export-components
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
