import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/Card';

interface AuthPageProps {
  title: string;
  subtitle: string;
  error?: string;
  alternatePath: string;
  alternateText: string;
  redirect: string;
  children: ReactNode;
}

export function AuthPage({ title, subtitle, error, alternatePath, alternateText, redirect, children }: AuthPageProps) {
  const alternateUrl = redirect === '/' ? alternatePath : `${alternatePath}?redirect=${encodeURIComponent(redirect)}`;
  return (
    <div className="min-h-screen flex items-start justify-center px-4" style={{ backgroundColor: 'var(--color-background)' }}>
      <div className="max-w-md w-full py-20">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--color-text)' }}>{title}</h1>
          <p style={{ color: 'var(--color-textSecondary)' }}>{subtitle}</p>
        </div>

        <Card><CardContent className="p-6">
          {error && <div role="alert" className="px-4 py-3 rounded-lg mb-4" style={{
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: 'var(--color-error)',
          }}>{error}</div>}
          {children}
          <div className="mt-4 text-center">
            <Link to={alternateUrl} className="text-sm font-medium transition-opacity hover:opacity-80" style={{ color: 'var(--color-primary)' }}>
              {alternateText}
            </Link>
          </div>
        </CardContent></Card>

        <div className="text-center mt-6">
          <Link to="/" className="text-sm transition-colors hover:text-[var(--color-primary)]" style={{ color: 'var(--color-textSecondary)' }}>
            ← Voltar para a loja
          </Link>
        </div>
      </div>
    </div>
  );
}
