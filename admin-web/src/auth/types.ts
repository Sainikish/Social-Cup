// Mirrors com.socialcup.auth.dto.LoginRequest exactly - just email and
// password. There is deliberately no `role` field here at all: the backend
// LoginRequest DTO has none, so there is nowhere for a client-supplied role
// to bind to even if something tried to send one.
export interface AdminLoginRequest {
  email: string;
  password: string;
}

// Mirrors com.socialcup.auth.dto.MemberDto exactly - the same DTO the
// backend returns for every member, admin or not (there is no separate
// "AdminDto"). `roles` is what this app actually checks against ADMIN.
export interface AdminUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  status: string | null;
  roles: string[];
  createdAt: string;
}

// Mirrors com.socialcup.auth.dto.AuthResponse exactly - returned by both
// POST /auth/login and POST /auth/refresh.
export interface AdminAuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  user: AdminUser;
}

export type AuthStatus = 'checking' | 'authenticated' | 'unauthenticated';

export interface AuthContextValue {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: AdminUser | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  restoreSession: () => Promise<void>;
}
