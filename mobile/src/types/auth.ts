// Mirrors com.socialcup.auth.dto.MemberDto exactly. Nullable fields reflect
// the backend Member entity, where first/last name and avatar are optional.
export interface MemberDto {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  status: string;
  roles: string[];
  createdAt: string;
}

// Mirrors com.socialcup.auth.dto.AuthResponse - returned by
// /auth/register, /auth/login, and /auth/refresh alike.
export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  user: MemberDto;
}

// Mirrors com.socialcup.auth.dto.LoginRequest.
export interface LoginRequest {
  email: string;
  password: string;
}

// Mirrors com.socialcup.auth.dto.RegisterRequest. firstName/lastName are
// optional there (no @NotBlank) - deliberately no other fields exist here:
// the backend does not accept a role, so there is nothing to add for one.
export interface RegisterRequest {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

// Mirrors com.socialcup.auth.dto.RefreshTokenRequest.
export interface RefreshRequest {
  refreshToken: string;
}
