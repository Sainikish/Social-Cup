import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import * as authApi from '../../api/auth';
import { setOnAuthExpired } from '../../api/authSession';
import { queryClient } from '../../lib/queryClient';
import { clearAuthTokens, getAccessToken, getRefreshToken, saveAuthTokens } from '../../storage/authStorage';
import type { LoginRequest, MemberDto, RegisterRequest } from '../../types/auth';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

export interface AuthContextValue {
  status: AuthStatus;
  user: MemberDto | null;
  login: (credentials: LoginRequest) => Promise<void>;
  register: (details: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  initializeAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<MemberDto | null>(null);

  // Presence of stored tokens does NOT mean they're still valid - an access
  // token is good for 15 minutes, so on almost any app restart it will
  // already be expired. Calling GET /auth/me is what actually proves the
  // session is usable: an expired access token transparently triggers the
  // refresh-and-retry flow in src/api/client.ts, and only if THAT also fails
  // (refresh token expired/invalid too) does this catch and fall back to
  // unauthenticated.
  const initializeAuth = useCallback(async () => {
    setStatus('loading');
    const [accessToken, refreshToken] = await Promise.all([getAccessToken(), getRefreshToken()]);

    if (!accessToken || !refreshToken) {
      setUser(null);
      setStatus('unauthenticated');
      return;
    }

    try {
      const currentUser = await authApi.getCurrentUser();
      setUser(currentUser);
      setStatus('authenticated');
    } catch {
      await clearAuthTokens();
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
    // Restoring a session from SecureStore + verifying it against the
    // network is exactly the "synchronize with an external system on mount"
    // case useEffect exists for (https://react.dev/learn/you-might-not-need-an-effect#fetching-data) -
    // the setState calls happen later, inside the resolved async work, not
    // synchronously in this effect body.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void initializeAuth();
  }, [initializeAuth]);

  const login = useCallback(async (credentials: LoginRequest) => {
    const response = await authApi.login(credentials);
    await saveAuthTokens({ accessToken: response.accessToken, refreshToken: response.refreshToken });
    setUser(response.user);
    setStatus('authenticated');
  }, []);

  const register = useCallback(async (details: RegisterRequest) => {
    const response = await authApi.register(details);
    await saveAuthTokens({ accessToken: response.accessToken, refreshToken: response.refreshToken });
    setUser(response.user);
    setStatus('authenticated');
  }, []);

  // The backend has no logout/revocation endpoint (see backend README
  // "Authentication & authorization") - a JWT stays valid until it expires
  // regardless of what the client does. Logout is therefore entirely local:
  // dispose of both tokens and the app's own state. Clearing the query cache
  // prevents one account's cached data from leaking into whichever account
  // logs in next on the same device.
  const logout = useCallback(async () => {
    await clearAuthTokens();
    queryClient.clear();
    setUser(null);
    setStatus('unauthenticated');
  }, []);

  // Calls the API first, then reuses logout()'s own local cleanup verbatim -
  // if the DELETE fails, that cleanup never runs, so the caller stays
  // authenticated and can retry (see ProfileScreen's error handling).
  const deleteAccount = useCallback(async () => {
    await authApi.deleteAccount();
    await logout();
  }, [logout]);

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, login, register, logout, deleteAccount, initializeAuth }),
    [status, user, login, register, logout, deleteAccount, initializeAuth]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
