import { Navigate, Route, Routes } from 'react-router-dom';

import { AuditLogList } from '../screens/AuditLogList/AuditLogList';
import { CafeCreate } from '../screens/CafeCreate/CafeCreate';
import { CafeDetail } from '../screens/CafeDetail/CafeDetail';
import { CafeList } from '../screens/CafeList/CafeList';
import { Dashboard } from '../screens/Dashboard/Dashboard';
import { DrinkCreate } from '../screens/DrinkCreate/DrinkCreate';
import { DrinkDetail } from '../screens/DrinkDetail/DrinkDetail';
import { DrinkList } from '../screens/DrinkList/DrinkList';
import { Login } from '../screens/Login/Login';
import { MemberDetail } from '../screens/MemberDetail/MemberDetail';
import { MemberLookup } from '../screens/MemberLookup/MemberLookup';
import { CafePayouts } from '../screens/CafePayouts/CafePayouts';
import { PayoutList } from '../screens/PayoutList/PayoutList';
import { RedemptionList } from '../screens/RedemptionList/RedemptionList';
import { SubscriptionList } from '../screens/SubscriptionList/SubscriptionList';
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
        path="/cafes/:cafeId/payouts"
        element={
          <ProtectedRoute>
            <CafePayouts />
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
      <Route
        path="/members"
        element={
          <ProtectedRoute>
            <MemberLookup />
          </ProtectedRoute>
        }
      />
      <Route
        path="/members/:memberId"
        element={
          <ProtectedRoute>
            <MemberDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/subscriptions"
        element={
          <ProtectedRoute>
            <SubscriptionList />
          </ProtectedRoute>
        }
      />
      <Route
        path="/payouts"
        element={
          <ProtectedRoute>
            <PayoutList />
          </ProtectedRoute>
        }
      />
      <Route
        path="/redemptions"
        element={
          <ProtectedRoute>
            <RedemptionList />
          </ProtectedRoute>
        }
      />
      <Route
        path="/audit-log"
        element={
          <ProtectedRoute>
            <AuditLogList />
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
