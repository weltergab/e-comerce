'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent } from '@/components/ui/Card';
import Link from 'next/link';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, login } = useAuth();
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const redirect = searchParams.get('redirect') || '/';

  // Se já estiver logado, redirecionar
  useEffect(() => {
    if (user) {
      router.push(redirect);
    }
  }, [user, router, redirect]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(emailOrUsername, password);
      router.push(redirect);
    } catch (err: any) {
      setError(err.message || 'Erro ao fazer login');
    } finally {
      setIsLoading(false);
    }
  };

  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-start justify-center px-4" style={{ backgroundColor: 'var(--color-background)' }}>
      <div className="max-w-md w-full py-20">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--color-text)' }}>Login</h1>
          <p style={{ color: 'var(--color-textSecondary)' }}>Entre com sua conta</p>
        </div>

        <Card>
          <CardContent className="p-6">
            {error && (
              <div className="px-4 py-3 rounded-lg mb-4" style={{
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: 'var(--color-error)'
              }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>
                  Email ou Username
                </label>
                <Input
                  type="text"
                  value={emailOrUsername}
                  onChange={(e) => setEmailOrUsername(e.target.value)}
                  placeholder="Digite seu email ou username"
                  required
                  disabled={isLoading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>
                  Senha
                </label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite sua senha"
                  required
                  disabled={isLoading}
                />
              </div>

              <Button
                type="submit"
                fullWidth
                disabled={isLoading}
              >
                {isLoading ? 'Entrando...' : 'Entrar'}
              </Button>
            </form>

            <div className="mt-4 text-center">
              <Link
                href={redirect !== '/' ? `/cadastro?redirect=${redirect}` : '/cadastro'}
                className="text-sm font-medium transition-colors"
                style={{ color: 'var(--color-primary)' }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
              >
                Não tem conta? Criar uma agora
              </Link>
            </div>
          </CardContent>
        </Card>

        <div className="text-center mt-6">
          <Link
            href="/"
            className="text-sm transition-colors"
            style={{ color: 'var(--color-textSecondary)' }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-primary)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-textSecondary)'}
          >
            ← Voltar para a loja
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="max-w-md mx-auto px-4 py-8 text-center">Carregando...</div>}>
      <LoginForm />
    </Suspense>
  );
}
