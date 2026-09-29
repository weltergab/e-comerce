import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AuthPage } from '@/components/auth/AuthPage';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuthRedirect, useAuthSubmission } from '@/src/features/auth/hooks';

export default function LoginPage() {
  const { user, login } = useAuth();
  const { navigate, redirect } = useAuthRedirect(user);
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const { error, isLoading, submit } = useAuthSubmission(() => navigate(redirect, { replace: true }), 'Erro ao fazer login');

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    void submit(() => login(emailOrUsername, password));
  };

  if (user) return null;
  return (
    <AuthPage title="Login" subtitle="Entre com sua conta" error={error} alternatePath="/cadastro" alternateText="Não tem conta? Criar uma agora" redirect={redirect}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Email ou username" value={emailOrUsername} onChange={(event) => setEmailOrUsername(event.target.value)} placeholder="Digite seu email ou username" required disabled={isLoading} />
        <Input label="Senha" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Digite sua senha" required disabled={isLoading} />
        <Button type="submit" fullWidth disabled={isLoading}>{isLoading ? 'Entrando...' : 'Entrar'}</Button>
        <div className="text-right"><Link to="/forgot-password" className="text-sm" style={{ color: 'var(--color-primary)' }}>Esqueci minha senha</Link></div>
      </form>
    </AuthPage>
  );
}
