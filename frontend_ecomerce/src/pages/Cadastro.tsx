import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AuthPage } from '@/components/auth/AuthPage';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuthRedirect, useAuthSubmission } from '@/src/features/auth/hooks';

export default function CadastroPage() {
  const { user, register } = useAuth();
  const { navigate, redirect } = useAuthRedirect(user);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { error, isLoading, submit } = useAuthSubmission(() => navigate(redirect, { replace: true }), 'Erro ao criar conta');

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    void submit(() => register(email, username, password));
  };

  if (user) return null;
  return (
    <AuthPage title="Criar conta" subtitle="Cadastre-se para finalizar sua compra" error={error} alternatePath="/login" alternateText="Já tem conta? Fazer login" redirect={redirect}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="seu@email.com" required disabled={isLoading} />
        <div>
          <Input label="Username" value={username} onChange={(event) => setUsername(event.target.value.replace(/[^a-zA-Z0-9]/g, ''))} placeholder="seuusername" required disabled={isLoading} />
          <p className="text-xs mt-1" style={{ color: 'var(--color-textMuted)' }}>Apenas letras e números, sem espaços ou acentos</p>
        </div>
        <Input label="Senha" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Mínimo 10 caracteres" minLength={10} required disabled={isLoading} />
        <Button type="submit" fullWidth disabled={isLoading}>{isLoading ? 'Criando conta...' : 'Criar conta'}</Button>
      </form>
    </AuthPage>
  );
}
