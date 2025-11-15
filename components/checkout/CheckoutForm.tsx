'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/Button';

export const CheckoutForm = () => {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/checkout/success`,
        },
      });

      if (error) {
        setErrorMessage(error.message || 'Ocorreu um erro ao processar o pagamento');
        setLoading(false);
      }
    } catch (err) {
      setErrorMessage('Erro inesperado. Tente novamente.');
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Stripe Payment Element */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <PaymentElement />
      </div>

      {errorMessage && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
          {errorMessage}
        </div>
      )}

      <Button
        type="submit"
        fullWidth
        size="lg"
        disabled={!stripe || loading}
      >
        {loading ? 'Processando...' : 'Confirmar Pagamento'}
      </Button>

      <p className="text-xs text-gray-500 text-center">
        Pagamento seguro processado pelo Stripe
      </p>
    </form>
  );
};
