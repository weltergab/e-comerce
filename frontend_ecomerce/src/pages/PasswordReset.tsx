import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { apiJson } from '@/lib/api/client';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';

export default function PasswordResetPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setLoading(true); setError('');
    try {
      if (token) {
        await apiJson('/api/auth/password-reset/confirm', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, password }) });
        navigate('/login', { replace: true });
      } else {
        const response = await apiJson<{ message: string }>('/api/auth/password-reset/request', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
        setMessage(response.message);
      }
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível concluir a solicitação.'); }
    finally { setLoading(false); }
  };

  return <div className="min-h-screen flex items-start justify-center px-4"><div className="max-w-md w-full py-20"><Card><CardContent className="p-6">
    <h1 className="text-2xl font-bold mb-2">{token ? 'Definir nova senha' : 'Recuperar senha'}</h1>
    <p className="text-sm mb-6" style={{ color: 'var(--color-textSecondary)' }}>{token ? 'A nova senha encerrará as outras sessões.' : 'Enviaremos um link válido por 30 minutos.'}</p>
    {message && <p className="bg-green-50 text-green-800 p-3 rounded mb-4">{message}</p>}
    {error && <p className="bg-red-50 text-red-800 p-3 rounded mb-4" role="alert">{error}</p>}
    <form onSubmit={submit} className="space-y-4">
      {token ? <Input type="password" minLength={10} maxLength={128} required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Nova senha (mínimo 10 caracteres)" />
        : <Input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="seu@email.com" />}
      <Button type="submit" fullWidth disabled={loading}>{loading ? 'Enviando...' : token ? 'Salvar nova senha' : 'Enviar instruções'}</Button>
    </form>
    <div className="text-center mt-4"><Link to="/login" className="text-sm" style={{ color: 'var(--color-primary)' }}>Voltar ao login</Link></div>
  </CardContent></Card></div></div>;
}
