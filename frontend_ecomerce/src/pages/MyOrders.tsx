import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag } from 'lucide-react';
import type { Order } from '@/types';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { OrderDetails } from '@/components/order/OrderDetails';
import { OrderStatusBadge } from '@/components/order/OrderStatusBadge';
import { formatCurrency, formatDateTime } from '@/lib/utils/format';
import { isHostedStripeCheckoutUrl } from '@/src/features/checkout/attempt';
import { resumeOrderPayment } from '@/src/features/orders/api';
import { useMyOrders } from '@/src/features/orders/hooks';

export function canResumeOrderPayment(status: string) {
  return status === 'requires_payment_method' || status === 'requires_action';
}

export default function MyOrdersPage() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<Order | null>(null);
  const [resumingOrderId, setResumingOrderId] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<{ orderId: string; message: string } | null>(null);
  const { data, isLoading, isError, refetch } = useMyOrders();

  const resumePayment = async (orderId: string) => {
    if (resumingOrderId) return;
    setResumingOrderId(orderId);
    setPaymentError(null);
    try {
      const result = await resumeOrderPayment(orderId);
      if (!isHostedStripeCheckoutUrl(result.checkoutUrl)) throw new Error('O servidor não retornou uma página de pagamento válida.');
      window.location.assign(result.checkoutUrl);
    } catch (cause) {
      setPaymentError({ orderId, message: cause instanceof Error ? cause.message : 'Não foi possível retomar o pagamento.' });
      void refetch();
    } finally {
      setResumingOrderId(null);
    }
  };

  if (isLoading) return <div className="min-h-[50vh] grid place-items-center" role="status">Carregando pedidos...</div>;
  return <PageContainer><PageHeader title="Meus pedidos" description="Acompanhe pagamentos e entregas." />
    {isError ? <EmptyState title="Não foi possível carregar" description="Tente novamente." action={<Button onClick={() => refetch()}>Tentar novamente</Button>} />
      : !data?.orders.length ? <EmptyState title="Nenhum pedido" description="Seus pedidos aparecerão aqui." action={<Button onClick={() => navigate('/')}>Ver produtos</Button>} />
      : <div className="space-y-4">{data.orders.map((order) => <div key={order.id} className="rounded-xl transition-transform hover:-translate-y-0.5" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-borderLight)' }}>
        <button type="button" onClick={() => setSelected(order)} className="w-full text-left p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"><div><p className="font-bold flex items-center gap-2"><ShoppingBag className="w-5 h-5" />Pedido {order.id.slice(0, 8)}</p><p className="text-sm mt-1" style={{ color: 'var(--color-textSecondary)' }}>{formatDateTime(order.createdAt)} · {order.products.length} item(ns)</p></div><div className="sm:text-right"><OrderStatusBadge status={order.status} /><p className="font-bold mt-2">{formatCurrency(order.amount, order.currency)}</p></div></div>
        </button>
        {canResumeOrderPayment(order.status) && <div className="border-t px-5 py-4" style={{ borderColor: 'var(--color-borderLight)' }}>
          <Button type="button" size="sm" onClick={() => void resumePayment(order.id)} disabled={Boolean(resumingOrderId)}>
            {resumingOrderId === order.id ? 'Redirecionando...' : 'Voltar ao pagamento'}
          </Button>
          {paymentError?.orderId === order.id && <p role="alert" className="text-sm text-red-700 mt-3">{paymentError.message}</p>}
        </div>}
      </div>)}</div>}
    {selected && <OrderDetails order={selected} onClose={() => setSelected(null)} />}
  </PageContainer>;
}
