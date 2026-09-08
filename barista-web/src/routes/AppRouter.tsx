import { Navigate, Route, Routes } from 'react-router-dom';

import { LoginScreen } from '../screens/LoginScreen';
import { RedemptionResultScreen } from '../screens/RedemptionResultScreen';
import { ScannerScreen } from '../screens/ScannerScreen';
import { ProtectedRoute } from './ProtectedRoute';
import { PublicRoute } from './PublicRoute';

export function AppRouter() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginScreen />
          </PublicRoute>
        }
      />
      <Route
        path="/scanner"
        element={
          <ProtectedRoute>
            <ScannerScreen />
          </ProtectedRoute>
        }
      />
      <Route
        path="/result"
        element={
          <ProtectedRoute>
            <RedemptionResultScreen />
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Navigate to="/scanner" replace />} />
      <Route path="*" element={<Navigate to="/scanner" replace />} />
    </Routes>
  );
}
