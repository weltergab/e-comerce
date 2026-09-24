import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useCart } from '@/contexts/CartContext';
import { apiJson } from '@/lib/api/client';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { OrderStatusBadge, getOrderStatusText } from '@/components/order/OrderStatusBadge';

interface StatusResponse {
  order: { id: string; orderStatus: string; paymentStatus: string; amount: number; currency: string };
}

export default function SuccessContent() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { completeOrder } = useCart();
  const orderId = searchParams.get('order_id');
  const [status, setStatus] = useState<string>('processing');
  const [error, setError] = useState(orderId ? '' : 'Pedido não informado.');

  useEffect(() => {
    if (!orderId) return;
    let active = true;
    let timeout: number | undefined;
    let attempts = 0;
    const load = async () => {
      try {
        const result = await apiJson<StatusResponse>(`/api/orders/${encodeURIComponent(orderId)}/status`);
        if (!active) return;
        setStatus(result.order.paymentStatus);
        setError('');
        const storageKey = `checkout_order_items:${orderId}`;
        try {
          const stored: unknown = JSON.parse(sessionStorage.getItem(storageKey) || '[]');
          const purchased = Array.isArray(stored) ? stored.filter((item): item is { productId: string; quantity: number } =>
            Boolean(item) && typeof item.productId === 'string' && Number.isInteger(item.quantity) && item.quantity > 0
          ) : [];
          completeOrder(purchased);
        } finally {
          sessionStorage.removeItem(storageKey);
        }
        attempts += 1;
        if (!['succeeded', 'failed', 'canceled', 'refunded'].includes(result.order.paymentStatus) && attempts < 20) timeout = window.setTimeout(load, 2500);
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : 'Não foi possível consultar o pedido.');
      }
    };
    load();
    return () => { active = false; if (timeout) window.clearTimeout(timeout); };
  }, [orderId, completeOrder]);

  const succeeded = status === 'succeeded';
  return <div className="max-w-3xl mx-auto px-4 py-16"><Card><CardContent className="text-center py-12">
    <h1 className="text-3xl font-bold mb-4">{succeeded ? 'Pagamento confirmado!' : error ? 'Não foi possível localizar o pedido' : getOrderStatusText(status)}</h1>
    {error ? <p role="alert" className="text-red-700 mb-6">{error}</p> : <div className="mb-6"><OrderStatusBadge status={status} /><p className="text-gray-600 mt-4">{succeeded ? 'O pedido foi pago e a confirmação será enviada por email.' : 'Estamos aguardando a confirmação do pagamento. Esta página atualiza automaticamente.'}</p></div>}
    <div className="flex flex-col sm:flex-row gap-4 justify-center"><Button onClick={() => navigate('/my-orders')} size="lg">Ver meus pedidos</Button><Button onClick={() => navigate('/')} variant="outline" size="lg">Continuar comprando</Button></div>
  </CardContent></Card></div>;
}
