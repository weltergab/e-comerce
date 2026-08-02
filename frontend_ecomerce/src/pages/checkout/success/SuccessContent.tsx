'use client';

import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { apiFetch } from '@/lib/api/client';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';

export default function SuccessContent() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { clearCart } = useCart();
  const { token, isLoading } = useAuth();
  const [isCleared, setIsCleared] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);

  useEffect(() => {
    const paymentIntent = searchParams.get('payment_intent');

    if (isLoading || !paymentIntent || isConfirmed || !token) {
      return;
    }

    // Plano B do webhook Stripe: se o webhook atrasar/falhar, a pagina de sucesso
    // pede ao backend para confirmar o PaymentIntent direto na Stripe e gravar o pedido.
    const confirmPayment = async () => {
      try {
        await apiFetch('/api/confirm-payment-intent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ paymentIntentId: paymentIntent }),
        });
      } catch (error) {
        console.error('Error confirming payment:', error);
      } finally {
        setIsConfirmed(true);
      }
    };

    confirmPayment();
  }, [searchParams, token, isLoading, isConfirmed]);

  useEffect(() => {
    const paymentIntent = searchParams.get('payment_intent');

    if (paymentIntent && !isCleared && isConfirmed) {
      clearCart();
      setIsCleared(true);
    }
  }, [searchParams, clearCart, isCleared, isConfirmed]);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <Card>
        <CardContent className="text-center py-12">
          <div className="mb-6">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Pagamento Confirmado!
          </h1>

          <p className="text-gray-600 mb-2">
            Seu pedido foi processado com sucesso.
          </p>
          <p className="text-gray-600 mb-8">
            Voce recebera um email de confirmacao em breve.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button onClick={() => navigate('/')} size="lg">
              Continuar Comprando
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
