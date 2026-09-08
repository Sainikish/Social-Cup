import { Navigate, Route, Routes } from 'react-router-dom';

import { CafeCreate } from '../screens/CafeCreate/CafeCreate';
import { CafeDetail } from '../screens/CafeDetail/CafeDetail';
import { CafeList } from '../screens/CafeList/CafeList';
import { Dashboard } from '../screens/Dashboard/Dashboard';
import { Login } from '../screens/Login/Login';
import { ProtectedRoute } from './ProtectedRoute';
import { PublicRoute } from './PublicRoute';

export function AppRouter() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/cafes"
        element={
          <ProtectedRoute>
            <CafeList />
          </ProtectedRoute>
        }
      />
      <Route
        path="/cafes/new"
        element={
          <ProtectedRoute>
            <CafeCreate />
          </ProtectedRoute>
        }
      />
      <Route
        path="/cafes/:id"
        element={
          <ProtectedRoute>
            <CafeDetail />
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
