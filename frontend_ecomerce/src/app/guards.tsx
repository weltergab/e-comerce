import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

function LoadingSession() {
  return <div className="min-h-[50vh] grid place-items-center" role="status">Carregando sessão...</div>;
}

export function RequireAuth({ children }: { children: ReactNode }) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}

export function RequireAdmin({ children }: { children: ReactNode }) {
  return <ProtectedRoute admin>{children}</ProtectedRoute>;
}

function ProtectedRoute({ children, admin = false }: { children: ReactNode; admin?: boolean }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  if (isLoading) return <LoadingSession />;
  if (!user) return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  if (admin && !user.isAdmin) return <Navigate to="/" replace />;
  return children;
}
