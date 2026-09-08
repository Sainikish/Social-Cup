import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';

import { useAuth } from '../auth/AuthContext';
import { LoadingIndicator } from '../components';

// Guards /login specifically: an already-authenticated barista should never
// see the login form again until they explicitly log out.
export function PublicRoute({ children }: { children: ReactNode }) {
  const { status } = useAuth();

  if (status === 'checking') {
    return <LoadingIndicator label="Checking session…" />;
  }

  if (status === 'authenticated') {
    return <Navigate to="/scanner" replace />;
  }

  return children;
}
