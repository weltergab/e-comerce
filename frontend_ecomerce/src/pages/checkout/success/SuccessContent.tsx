import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { OrderStatusBadge, getOrderStatusText } from '@/components/order/OrderStatusBadge';
import { requestPaymentReconciliation } from '@/src/features/orders/api';
import { useOrderStatus } from '@/src/features/orders/hooks';

export default function SuccessContent() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const { completeOrder } = useCart();
  const orderId = searchParams.get('order_id');
  const cartUpdated = useRef(false);
  const orderStatus = useOrderStatus(orderId);
  const paymentStatus = orderStatus.data?.order.paymentStatus;

  useEffect(() => {
    if (orderId) void requestPaymentReconciliation(orderId).catch(() => undefined);
  }, [orderId]);

  useEffect(() => {
    if (!orderId || !orderStatus.data || cartUpdated.current) return;
    cartUpdated.current = true;
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
  }, [completeOrder, orderId, orderStatus.data]);

  useEffect(() => {
    if (paymentStatus !== 'succeeded') return;
    void queryClient.invalidateQueries({ queryKey: ['orders', 'mine'] });
  }, [paymentStatus, queryClient]);

  const status = paymentStatus || 'processing';
  const error = !orderId
    ? 'Pedido não informado.'
    : orderStatus.error instanceof Error
      ? orderStatus.error.message
      : '';
  const succeeded = status === 'succeeded';

  return <div className="max-w-3xl mx-auto px-4 py-16"><Card><CardContent className="text-center py-12">
    <h1 className="text-3xl font-bold mb-4">{succeeded ? 'Pagamento confirmado!' : error ? 'Não foi possível localizar o pedido' : getOrderStatusText(status)}</h1>
    {error ? <p role="alert" className="text-red-700 mb-6">{error}</p> : <div className="mb-6"><OrderStatusBadge status={status} /><p className="text-gray-600 mt-4">{succeeded ? 'O pedido foi pago e a confirmação será enviada por email.' : 'Estamos aguardando a confirmação do pagamento. Esta página atualiza automaticamente.'}</p></div>}
    <div className="flex flex-col sm:flex-row gap-4 justify-center"><Button onClick={() => navigate('/my-orders')} size="lg">Ver meus pedidos</Button><Button onClick={() => navigate('/')} variant="outline" size="lg">Continuar comprando</Button></div>
  </CardContent></Card></div>;
}
