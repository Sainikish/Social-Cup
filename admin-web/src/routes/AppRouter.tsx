import { Navigate, Route, Routes } from 'react-router-dom';

import { CafeCreate } from '../screens/CafeCreate/CafeCreate';
import { CafeDetail } from '../screens/CafeDetail/CafeDetail';
import { CafeList } from '../screens/CafeList/CafeList';
import { Dashboard } from '../screens/Dashboard/Dashboard';
import { DrinkCreate } from '../screens/DrinkCreate/DrinkCreate';
import { DrinkDetail } from '../screens/DrinkDetail/DrinkDetail';
import { DrinkList } from '../screens/DrinkList/DrinkList';
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
      <Route
        path="/cafes/:cafeId/drinks"
        element={
          <ProtectedRoute>
            <DrinkList />
          </ProtectedRoute>
        }
      />
      <Route
        path="/cafes/:cafeId/drinks/new"
        element={
          <ProtectedRoute>
            <DrinkCreate />
          </ProtectedRoute>
        }
      />
      <Route
        path="/drinks/:drinkId"
        element={
          <ProtectedRoute>
            <DrinkDetail />
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
