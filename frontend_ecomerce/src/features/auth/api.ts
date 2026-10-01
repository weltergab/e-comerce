import { ApiError, apiJson, requestSessionRefresh, type ApiErrorBody } from '@/lib/api/client';
import type { User } from './types';

export interface AuthSession {
  accessToken: string;
  user: User;
}

export async function refreshSession(): Promise<AuthSession | null> {
  const response = await requestSessionRefresh();
  if (response.status === 204) return null;
  const body = await response.json().catch(() => ({})) as AuthSession & ApiErrorBody;
  if (!response.ok) throw new ApiError(response.status, body);
  return body;
}

export function loginAccount(emailOrUsername: string, password: string) {
  return apiJson<AuthSession>('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ emailOrUsername, password }),
  });
}

export function registerAccount(email: string, username: string, password: string) {
  return apiJson<AuthSession>('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, username, password }),
  });
}

export function logoutAccount() {
  return apiJson<unknown>('/api/auth/logout', { method: 'POST' });
}
