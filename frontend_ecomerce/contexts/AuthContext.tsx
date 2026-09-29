import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { setAccessToken } from '@/lib/api/client';
import { loginAccount, logoutAccount, refreshSession, registerAccount } from '@/src/features/auth/api';
import type { User } from '@/src/features/auth/types';

export type { User } from '@/src/features/auth/types';

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
    refreshSession()
      .then((session) => { setAccessToken(session.accessToken); setUser(session.user); })
      .catch(() => { setAccessToken(null); setUser(null); })
      .finally(() => setIsLoading(false));
  }, []);

  const startSession = (session: { accessToken: string; user: User }) => {
    setAccessToken(session.accessToken);
    setUser(session.user);
  };

  const login = async (emailOrUsername: string, password: string) => {
    startSession(await loginAccount(emailOrUsername, password));
  };

  const register = async (email: string, username: string, password: string) => {
    startSession(await registerAccount(email, username, password));
  };

  const logout = async () => {
    await logoutAccount().catch(() => undefined);
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
