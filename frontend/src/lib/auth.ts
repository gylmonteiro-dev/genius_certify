import { apiRequest } from './api';

const TOKEN_KEY = 'nexus_certify_token';

export type UsuarioRole = 'super_admin' | 'instituicao_admin';

export interface AuthUser {
  id: string;
  nome: string;
  email: string;
  role: UsuarioRole;
  instituicao_id: string | null;
  is_active: boolean;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export async function loginRequest(email: string, password: string): Promise<LoginResponse> {
  return apiRequest<LoginResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function fetchCurrentUser(token: string): Promise<AuthUser> {
  return apiRequest<AuthUser>('/api/auth/me', { method: 'GET' }, token);
}
