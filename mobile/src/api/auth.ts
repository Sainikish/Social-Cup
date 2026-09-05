import { apiClient, AUTH_REFRESH_PATH } from './client';
import type { AuthResponse, LoginRequest, MemberDto, RefreshRequest, RegisterRequest } from '../types/auth';

const AUTH_LOGIN_PATH = '/auth/login';
const AUTH_REGISTER_PATH = '/auth/register';
const AUTH_ME_PATH = '/auth/me';

// Thin wrappers around the four existing backend auth endpoints - no
// business logic lives here (that belongs to AuthContext), just the request
// shape. Kept separate from src/api/client.ts so that module can stay a
// generic, endpoint-agnostic Axios instance.
export async function login(request: LoginRequest): Promise<AuthResponse> {
  const response = await apiClient.post<AuthResponse>(AUTH_LOGIN_PATH, request);
  return response.data;
}

export async function register(request: RegisterRequest): Promise<AuthResponse> {
  const response = await apiClient.post<AuthResponse>(AUTH_REGISTER_PATH, request);
  return response.data;
}

export async function refresh(request: RefreshRequest): Promise<AuthResponse> {
  const response = await apiClient.post<AuthResponse>(AUTH_REFRESH_PATH, request);
  return response.data;
}

export async function getCurrentUser(): Promise<MemberDto> {
  const response = await apiClient.get<MemberDto>(AUTH_ME_PATH);
  return response.data;
}
