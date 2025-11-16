// Checkout page with Payment Element - Everything stays in YOUR site

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Elements } from '@stripe/react-stripe-js';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { CheckoutForm } from '@/components/checkout/CheckoutForm';
import { formatCurrency } from '@/lib/utils/format';
import { getStripe } from '@/lib/stripe/stripe';

export default function CheckoutPage() {
  const router = useRouter();
  const { items, total } = useCart();
  const { user, isLoading: authLoading, token } = useAuth();
  const [clientSecret, setClientSecret] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (items.length === 0 || authLoading) {
      setLoading(authLoading);
      return;
    }

    // Se não está autenticado, redirecionar para login
    if (!user) {
      router.push('/login?redirect=/checkout');
      return;
    }

    const createPaymentIntent = async () => {
      try {
        // Prepare items with Stripe Price IDs
        const stripeItems = items.map((item) => ({
          productId: item.product.id,
          stripePriceId: item.product.stripePriceId,
          quantity: item.quantity,
          price: item.product.price,
        }));

        const response = await fetch('/api/create-payment-intent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ items: stripeItems }),
        });

        const data = await response.json();

        if (data.clientSecret) {
          setClientSecret(data.clientSecret);
        } else {
          console.error('No client secret received');
        }
      } catch (error) {
        console.error('Error creating payment intent:', error);
      } finally {
        setLoading(false);
      }
    };

    createPaymentIntent();
  }, [items, user, authLoading, token]);

  if (items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardContent className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Carrinho vazio
            </h2>
            <p className="text-gray-600 mb-6">
              Adicione produtos ao carrinho antes de finalizar a compra
            </p>
            <Button onClick={() => router.push('/')}>
              Ir para Produtos
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const appearance = {
    theme: 'stripe' as const,
    variables: {
      colorPrimary: '#2563eb',
    },
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Finalizar Compra</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Payment Form */}
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Pagamento Seguro
              </h2>

              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Carregando opções de pagamento...</p>
                </div>
              ) : clientSecret ? (
                <Elements stripe={getStripe()} options={{ clientSecret, appearance }}>
                  <CheckoutForm />
                </Elements>
              ) : (
                <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
                  <p className="font-semibold">Erro ao inicializar pagamento</p>
                  <p className="text-sm mt-1">Recarregue a página ou entre em contato com o suporte.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <Card className="sticky top-20">
            <CardContent className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Resumo do Pedido
              </h2>

              <div className="space-y-4 mb-6">
                {items.map((item) => (
                  <div key={item.product.id} className="flex gap-3">
                    <div className="w-16 h-16 rounded overflow-hidden bg-gray-200 flex-shrink-0">
                      <img
                        src={item.product.image}
                        alt={item.product.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 line-clamp-1">
                        {item.product.name}
                      </p>
                      <p className="text-sm text-gray-600">
                        Qtd: {item.quantity}
                      </p>
                      <p className="text-sm font-semibold text-blue-600">
                        {formatCurrency(item.product.price * item.quantity)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-3 border-t pt-4">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>{formatCurrency(total)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Frete</span>
                  <span className="text-green-600">Grátis</span>
                </div>
                <div className="border-t pt-3">
                  <div className="flex justify-between text-lg font-bold text-gray-900">
                    <span>Total</span>
                    <span className="text-blue-600">{formatCurrency(total)}</span>
                  </div>
                </div>
              </div>

              <Button
                onClick={() => router.push('/cart')}
                variant="outline"
                fullWidth
                className="mt-4"
              >
                Voltar ao Carrinho
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
