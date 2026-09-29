import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { User } from '@/contexts/AuthContext';

export function useAuthRedirect(user: User | null) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requested = searchParams.get('redirect');
  const redirect = requested?.startsWith('/') && !requested.startsWith('//') ? requested : '/';

  useEffect(() => {
    if (user) navigate(redirect, { replace: true });
  }, [user, navigate, redirect]);

  return { navigate, redirect };
}

export function useAuthSubmission(onSuccess: () => void, fallbackMessage: string) {
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const submit = async (action: () => Promise<void>) => {
    setError('');
    setIsLoading(true);
    try {
      await action();
      onSuccess();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : fallbackMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return { error, isLoading, submit };
}
