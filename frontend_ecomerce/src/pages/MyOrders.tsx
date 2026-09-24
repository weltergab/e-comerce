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
import { useMyOrders } from '@/src/features/orders/hooks';

export default function MyOrdersPage() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<Order | null>(null);
  const { data, isLoading, isError, refetch } = useMyOrders();
  if (isLoading) return <div className="min-h-[50vh] grid place-items-center" role="status">Carregando pedidos...</div>;
  return <PageContainer><PageHeader title="Meus pedidos" description="Acompanhe pagamentos e entregas." />
    {isError ? <EmptyState title="Não foi possível carregar" description="Tente novamente." action={<Button onClick={() => refetch()}>Tentar novamente</Button>} />
      : !data?.orders.length ? <EmptyState title="Nenhum pedido" description="Seus pedidos aparecerão aqui." action={<Button onClick={() => navigate('/')}>Ver produtos</Button>} />
      : <div className="space-y-4">{data.orders.map((order) => <button key={order.id} type="button" onClick={() => setSelected(order)} className="w-full text-left rounded-xl p-5 transition-transform hover:-translate-y-0.5" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-borderLight)' }}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"><div><p className="font-bold flex items-center gap-2"><ShoppingBag className="w-5 h-5" />Pedido {order.id.slice(0, 8)}</p><p className="text-sm mt-1" style={{ color: 'var(--color-textSecondary)' }}>{formatDateTime(order.createdAt)} · {order.products.length} item(ns)</p></div><div className="sm:text-right"><OrderStatusBadge status={order.status} /><p className="font-bold mt-2">{formatCurrency(order.amount, order.currency)}</p></div></div>
      </button>)}</div>}
    {selected && <OrderDetails order={selected} onClose={() => setSelected(null)} />}
  </PageContainer>;
}
