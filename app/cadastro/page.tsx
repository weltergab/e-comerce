'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent } from '@/components/ui/Card';
import Link from 'next/link';

function CadastroForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, register } = useAuth();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
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
      await register(email, username, password);
      router.push(redirect);
    } catch (err: any) {
      setError(err.message || 'Erro ao criar conta');
    } finally {
      setIsLoading(false);
    }
  };

  if (user) {
    return null;
  }

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Criar Conta</h1>
        <p className="text-gray-600">Cadastre-se para finalizar sua compra</p>
      </div>

      <Card>
        <CardContent className="p-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                disabled={isLoading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Username
              </label>
              <Input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9]/g, ''))}
                placeholder="seuusername"
                required
                disabled={isLoading}
              />
              <p className="text-xs text-gray-500 mt-1">
                Apenas letras e números, sem espaços ou acentos
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Senha
              </label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                required
                disabled={isLoading}
              />
            </div>

            <Button
              type="submit"
              fullWidth
              disabled={isLoading}
            >
              {isLoading ? 'Criando conta...' : 'Criar Conta'}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <Link
              href={redirect !== '/' ? `/login?redirect=${redirect}` : '/login'}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              Já tem conta? Fazer login
            </Link>
          </div>
        </CardContent>
      </Card>

      <div className="text-center mt-6">
        <Link
          href="/"
          className="text-gray-600 hover:text-blue-600 text-sm"
        >
          ← Voltar para a loja
        </Link>
      </div>
    </div>
  );
}

export default function CadastroPage() {
  return (
    <Suspense fallback={<div className="max-w-md mx-auto px-4 py-8 text-center">Carregando...</div>}>
      <CadastroForm />
    </Suspense>
  );
}
