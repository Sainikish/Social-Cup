import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { setOnAuthExpired } from '../api/authSession';
import { setAccessToken } from '../api/client';
import { queryClient } from '../api/queryClient';
import { loginBarista, refreshBarista } from './api';
import { clearSession, getStoredCafeId, getStoredRefreshToken, saveSession } from './authStorage';
import type { AuthContextValue, AuthStatus } from './types';

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('checking');
  const [cafeId, setCafeId] = useState<string | null>(null);

  // A stored refresh token does not mean the session is still valid - the
  // only side-effect-free way to confirm that is to actually call
  // POST /barista/refresh (there is no GET /barista/me to "just verify" a
  // session against, unlike the member app). On success this mints a fresh
  // in-memory access token exactly like the interceptor's own
  // 401-triggered refresh would.
  const restoreSession = useCallback(async () => {
    setStatus('checking');
    const storedRefreshToken = getStoredRefreshToken();
    const storedCafeId = getStoredCafeId();

    if (!storedRefreshToken || !storedCafeId) {
      setAccessToken(null);
      setCafeId(null);
      setStatus('unauthenticated');
      return;
    }

    try {
      const response = await refreshBarista(storedRefreshToken);
      setAccessToken(response.accessToken);
      saveSession({ refreshToken: response.refreshToken, cafeId: response.cafeId });
      setCafeId(response.cafeId);
      setStatus('authenticated');
    } catch {
      setAccessToken(null);
      clearSession();
      setCafeId(null);
      setStatus('unauthenticated');
    }
  }, []);

  useEffect(() => {
    // Registers the one handler that reacts when a token refresh fails
    // permanently deep inside the Axios interceptor, outside the React tree
    // - see src/api/authSession.ts.
    setOnAuthExpired(() => {
      setCafeId(null);
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

  const login = useCallback(async (cafeIdInput: string, pin: string) => {
    const response = await loginBarista({ cafeId: cafeIdInput, pin });
    setAccessToken(response.accessToken);
    saveSession({ refreshToken: response.refreshToken, cafeId: response.cafeId });
    setCafeId(response.cafeId);
    setStatus('authenticated');
  }, []);

  // The backend has no barista logout/revocation endpoint - a JWT stays
  // valid until it expires regardless of what the client does. Logout is
  // therefore entirely local: dispose of the in-memory access token, the
  // persisted session, and this app's own state. Clearing the query cache
  // matters more here than in a typical app - a barista terminal is a
  // shared physical device by design, and the only cached query data (the
  // public cafe search results used by the login picker) should not
  // silently carry over from one cafe's session to the next barista who
  // logs in on the same device. There is no separate "redemption state" to
  // clear here: the scanner/result screens hold their scan/redemption state
  // locally (see screens/ScannerScreen.tsx), not in any shared context, so
  // navigating away from them on logout already discards it.
  const logout = useCallback(() => {
    setAccessToken(null);
    clearSession();
    queryClient.clear();
    setCafeId(null);
    setStatus('unauthenticated');
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ status, cafeId, login, logout }),
    [status, cafeId, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Exporting this hook alongside AuthProvider from the same file is the
// standard React Context pattern (mirrors mobile/src/features/auth/AuthContext.tsx
// exactly) - splitting it into its own file purely to satisfy a fast-refresh
// lint heuristic would be an unnecessary extra layer for a single function.
// oxlint-disable-next-line react/only-export-components
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
