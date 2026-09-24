import type { ReactNode } from 'react';
import { Calendar, ClipboardList, CreditCard, MapPin, Package, User } from 'lucide-react';
import type { Order } from '@/types';
import { formatCurrency, formatDateTime } from '@/lib/utils/format';
import { Dialog } from '@/components/ui/Dialog';
import { OrderDetailRow } from './OrderDetailRow';
import { OrderDetailSection } from './OrderDetailSection';
import { OrderProductList } from './OrderProductList';
import { OrderStatusBadge } from './OrderStatusBadge';

export function OrderDetails({ order, onClose, admin = false, actions }: { order: Order; onClose: () => void; admin?: boolean; actions?: ReactNode }) {
  const address = order.shippingAddress;
  return <Dialog title={`Pedido ${String(order.id).slice(0, 8)}`} onClose={onClose}><div className="space-y-4">
    <div className="flex items-center justify-between gap-4"><OrderStatusBadge status={order.status} /><span className="text-sm" style={{ color: 'var(--color-textSecondary)' }}>{order.orderStatus}</span></div>
    {admin && <OrderDetailSection title="Cliente" icon={<User className="w-5 h-5" />}><OrderDetailRow label="Nome">{order.userName || '—'}</OrderDetailRow><OrderDetailRow label="Email">{order.userEmail || '—'}</OrderDetailRow></OrderDetailSection>}
    <OrderDetailSection title="Pedido" icon={<ClipboardList className="w-5 h-5" />}><OrderDetailRow label="ID">{order.id}</OrderDetailRow><OrderDetailRow label="Criado em"><Calendar className="inline w-4 h-4 mr-2" />{formatDateTime(order.createdAt)}</OrderDetailRow><OrderDetailRow label="Pagamento">{order.paymentMethod || 'Aguardando definição'}</OrderDetailRow></OrderDetailSection>
    <OrderDetailSection title={`Itens (${order.products.length})`} icon={<Package className="w-5 h-5" />}><OrderProductList products={order.products} currency={order.currency} showProductId={admin} /></OrderDetailSection>
    {address && <OrderDetailSection title="Entrega" icon={<MapPin className="w-5 h-5" />}><p>{address.recipient}</p><p>{address.street}, {address.number}{address.complement ? ` — ${address.complement}` : ''}</p><p>{address.neighborhood}, {address.city}/{address.state} — CEP {address.postalCode}</p>{order.trackingCode && <p className="mt-2"><strong>Rastreio:</strong> {order.trackingCode}</p>}</OrderDetailSection>}
    {order.adminNotes && <OrderDetailSection title="Observações"><p className="whitespace-pre-wrap">{order.adminNotes}</p></OrderDetailSection>}
    <OrderDetailSection title="Total" icon={<CreditCard className="w-5 h-5" />}><p className="text-3xl font-bold" style={{ color: 'var(--color-success)' }}>{formatCurrency(order.amount, order.currency)}</p></OrderDetailSection>
    {actions}
  </div></Dialog>;
}
