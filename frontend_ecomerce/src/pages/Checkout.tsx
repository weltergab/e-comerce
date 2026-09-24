import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Elements } from '@stripe/react-stripe-js';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { CheckoutForm } from '@/components/checkout/CheckoutForm';
import { formatCurrency } from '@/lib/utils/format';
import { getStripe } from '@/lib/stripe/stripe';
import { apiJson } from '@/lib/api/client';
import type { CheckoutResponse, ShippingAddress } from '@/types';

const emptyAddress: ShippingAddress = { recipient: '', street: '', number: '', complement: '', neighborhood: '', city: '', state: '', postalCode: '', country: 'BR' };

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { items, total, isLoading: cartLoading } = useCart();
  const [address, setAddress] = useState(emptyAddress);
  const [checkout, setCheckout] = useState<CheckoutResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const signature = useMemo(() => items.map((item) => `${item.product.id}:${item.quantity}`).sort().join('|'), [items]);

  const startCheckout = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    const storageKey = `checkout_key:${signature}`;
    try {
      let idempotencyKey = sessionStorage.getItem(storageKey);
      if (!idempotencyKey) {
        idempotencyKey = crypto.randomUUID();
        sessionStorage.setItem(storageKey, idempotencyKey);
      }
      const result = await apiJson<CheckoutResponse>('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey },
        body: JSON.stringify({ items: items.map((item) => ({ productId: item.product.id, quantity: item.quantity })), shippingAddress: address }),
      });
      sessionStorage.setItem(`checkout_order_items:${result.orderId}`, JSON.stringify(items.map((item) => ({ productId: item.product.id, quantity: item.quantity }))));
      setCheckout(result);
    } catch (cause) {
      sessionStorage.removeItem(storageKey);
      setError(cause instanceof Error ? cause.message : 'Não foi possível iniciar o pagamento.');
    } finally {
      setLoading(false);
    }
  };

  if (cartLoading) return <div className="max-w-7xl mx-auto px-4 py-24" role="status">Carregando carrinho...</div>;
  if (!items.length) return <div className="max-w-3xl mx-auto px-4 py-24"><Card><CardContent className="text-center py-12"><h2 className="text-2xl font-bold mb-4">Carrinho vazio</h2><Button onClick={() => navigate('/')}>Ir para produtos</Button></CardContent></Card></div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
      <h1 className="text-3xl font-bold mb-8">Finalizar compra</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Card><CardContent className="p-6">
            {!checkout ? (
              <form onSubmit={startCheckout} className="space-y-5">
                <div><h2 className="text-xl font-bold">Endereço de entrega</h2><p className="text-sm text-gray-600 mt-1">O endereço ficará congelado neste pedido.</p></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {([
                    ['recipient', 'Destinatário'], ['postalCode', 'CEP'], ['street', 'Rua'], ['number', 'Número'],
                    ['complement', 'Complemento (opcional)'], ['neighborhood', 'Bairro'], ['city', 'Cidade'], ['state', 'UF'],
                  ] as const).map(([name, label]) => (
                    <label key={name} className={name === 'recipient' || name === 'street' ? 'sm:col-span-2' : ''}>
                      <span className="block text-sm font-medium mb-1">{label}</span>
                      <input className="w-full border rounded-lg px-3 py-2" value={address[name]} required={name !== 'complement'} maxLength={160}
                        onChange={(event) => setAddress((value) => ({ ...value, [name]: name === 'state' ? event.target.value.toUpperCase().slice(0, 2) : event.target.value }))} />
                    </label>
                  ))}
                </div>
                {error && <p role="alert" className="bg-red-50 border border-red-200 text-red-800 p-3 rounded-lg">{error}</p>}
                <Button type="submit" fullWidth size="lg" disabled={loading}>{loading ? 'Reservando itens...' : 'Continuar para pagamento'}</Button>
              </form>
            ) : (
              <div>
                <h2 className="text-xl font-bold mb-4">Pagamento seguro</h2>
                <Elements stripe={getStripe()} options={{ clientSecret: checkout.clientSecret, appearance: { theme: 'stripe', variables: { colorPrimary: '#2563eb' } } }}>
                  <CheckoutForm orderId={checkout.orderId} />
                </Elements>
              </div>
            )}
          </CardContent></Card>
        </div>
        <div><Card className="sticky top-20"><CardContent className="p-6">
          <h2 className="text-xl font-bold mb-4">Resumo do pedido</h2>
          <div className="space-y-4 mb-6">{items.map((item) => <div key={item.product.id} className="flex justify-between gap-3 text-sm"><span>{item.quantity}× {item.product.name}</span><strong>{formatCurrency(item.product.price * item.quantity, item.product.currency)}</strong></div>)}</div>
          <div className="border-t pt-4 flex justify-between text-lg font-bold"><span>Total</span><span>{formatCurrency(checkout?.amount ?? total, checkout?.currency)}</span></div>
          <p className="text-sm text-green-700 mt-2">Frete grátis</p>
          {!checkout && <Button onClick={() => navigate('/cart')} variant="outline" fullWidth className="mt-4">Voltar ao carrinho</Button>}
        </CardContent></Card></div>
      </div>
    </div>
  );
}
