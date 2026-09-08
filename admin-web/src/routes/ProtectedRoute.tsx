import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';

import { useAuth } from '../auth/AuthContext';
import { LoadingState } from '../components';

const ADMIN_ROLE = 'ADMIN';

// This check is UX protection only - the backend's own
// /admin/** -> hasRole(ADMIN) rule (SecurityConfig, untouched) is the actual
// authorization authority. AuthContext already guarantees isAuthenticated
// can only be true for a user whose roles include ADMIN (see
// AuthContext.tsx's hasAdminRole checks in login()/restoreSession()) - the
// explicit role check here is a second, defense-in-depth confirmation of
// that same invariant, not a substitute for it.
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isLoading, isAuthenticated, user } = useAuth();

  if (isLoading) {
    return <LoadingState label="Checking session…" />;
  }

  if (!isAuthenticated || !user?.roles.includes(ADMIN_ROLE)) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
