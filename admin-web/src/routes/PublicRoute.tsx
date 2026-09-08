import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';

import { useAuth } from '../auth/AuthContext';
import { LoadingState } from '../components';

const ADMIN_ROLE = 'ADMIN';

// Guards /login specifically: an already-authenticated admin should never
// see the login form again until they explicitly log out.
//
// Deliberately checks the same condition as ProtectedRoute's own guard
// (isAuthenticated AND an ADMIN role), just inverted - not merely
// `isAuthenticated`. If this used a looser condition than ProtectedRoute,
// a state that ProtectedRoute rejects (e.g. isAuthenticated=true but no
// ADMIN role) could satisfy PublicRoute's redirect-to-/dashboard condition,
// which /dashboard's own ProtectedRoute would then immediately redirect
// back out of - an infinite redirect loop between the two guards. Both
// routes must agree on exactly what "authenticated enough" means.
export function PublicRoute({ children }: { children: ReactNode }) {
  const { isLoading, isAuthenticated, user } = useAuth();

  if (isLoading) {
    return <LoadingState label="Checking session…" />;
  }

  if (isAuthenticated && user?.roles.includes(ADMIN_ROLE)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
