import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { apiJson, setAccessToken } from '@/lib/api/client';

export interface User {
  id: string;
  email: string;
  username: string;
  isAdmin: boolean;
}

interface SessionResponse {
  accessToken: string;
  user: User;
}

interface AuthContextType {
  user: User | null;
  login: (emailOrUsername: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    apiJson<SessionResponse>('/api/auth/refresh', { method: 'POST' })
      .then((session) => { setAccessToken(session.accessToken); setUser(session.user); })
      .catch(() => { setAccessToken(null); setUser(null); })
      .finally(() => setIsLoading(false));
  }, []);

  const startSession = (session: SessionResponse) => {
    setAccessToken(session.accessToken);
    setUser(session.user);
  };

  const login = async (emailOrUsername: string, password: string) => {
    startSession(await apiJson<SessionResponse>('/api/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ emailOrUsername, password }),
    }));
  };

  const register = async (email: string, username: string, password: string) => {
    startSession(await apiJson<SessionResponse>('/api/auth/register', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, username, password }),
    }));
  };

  const logout = async () => {
    await apiJson<unknown>('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
    setAccessToken(null);
    setUser(null);
  };

  const value = useMemo(() => ({ user, login, register, logout, isLoading }), [user, isLoading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return context;
}
