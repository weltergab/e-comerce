import { apiJson } from '@/lib/api/client';
import type { User } from './types';

export interface AuthSession {
  accessToken: string;
  user: User;
}

export function refreshSession() {
  return apiJson<AuthSession>('/api/auth/refresh', { method: 'POST' });
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
