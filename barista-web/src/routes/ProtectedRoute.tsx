import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';

import { useAuth } from '../auth/AuthContext';
import { LoadingIndicator } from '../components';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { status } = useAuth();

  if (status === 'checking') {
    return <LoadingIndicator label="Checking session…" />;
  }

  if (status !== 'authenticated') {
    return <Navigate to="/login" replace />;
  }

  return children;
}
