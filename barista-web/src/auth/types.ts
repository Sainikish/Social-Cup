// Mirrors com.socialcup.barista.dto.BaristaLoginRequest exactly - just the
// cafe id and PIN, no member/user id anywhere (a barista authenticates as a
// cafe, not as a person).
export interface BaristaLoginRequest {
  cafeId: string;
  pin: string;
}

// Mirrors com.socialcup.barista.dto.BaristaAuthResponse exactly - returned
// by both POST /barista/login and POST /barista/refresh. There is no
// member-style profile here (name/email/avatar) - only the cafe identity
// that was just authenticated.
export interface BaristaAuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  cafeId: string;
}

export type AuthStatus = 'checking' | 'authenticated' | 'unauthenticated';

export interface AuthContextValue {
  status: AuthStatus;
  cafeId: string | null;
  login: (cafeId: string, pin: string) => Promise<void>;
  logout: () => void;
}
