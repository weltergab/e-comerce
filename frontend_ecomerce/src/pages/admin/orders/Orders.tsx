import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import type { Order } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { OrderDetails } from '@/components/order/OrderDetails';
import { OrderStatusBadge } from '@/components/order/OrderStatusBadge';
import { formatCurrency, formatDateTime } from '@/lib/utils/format';
import { saveAdminNotes } from '@/src/features/orders/api';
import { useAdminOrders } from '@/src/features/orders/hooks';

function dateInput(date: Date) { return date.toISOString().slice(0, 10); }
const today = new Date();
const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60_000);

export default function OrdersPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState({ startDate: dateInput(monthAgo), endDate: dateInput(today), status: '', userName: '' });
  const [filters, setFilters] = useState(draft);
  const [selected, setSelected] = useState<Order | null>(null);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const { data, isLoading, isError, refetch } = useAdminOrders(filters);
  const orders = useMemo(() => (data?.orders || []).filter((order) => !filters.userName.trim() || (order.userName || '').toLowerCase().includes(filters.userName.toLowerCase())), [data, filters.userName]);
  const gross = orders.filter((order) => order.status === 'succeeded').reduce((sum, order) => sum + order.amount, 0);

  const open = (order: Order) => { setSelected(order); setNotes(order.adminNotes || ''); };
  const save = async () => {
    if (!selected) return;
    setSaving(true);
    try { await saveAdminNotes(selected.id, notes.trim() || null); await queryClient.invalidateQueries({ queryKey: ['orders', 'admin'] }); setSelected((order) => order ? { ...order, adminNotes: notes.trim() || null } : null); }
    finally { setSaving(false); }
  };

  return <PageContainer><div className="flex flex-col sm:flex-row sm:justify-between gap-4"><PageHeader title="Pedidos" description="Consulte pagamentos, clientes e fulfillment." /><Button variant="outline" onClick={() => navigate('/admin')}>Voltar ao painel</Button></div>
    <form className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-6" onSubmit={(event) => { event.preventDefault(); setFilters(draft); }}>
      <Input type="date" value={draft.startDate} onChange={(event) => setDraft({ ...draft, startDate: event.target.value })} />
      <Input type="date" value={draft.endDate} onChange={(event) => setDraft({ ...draft, endDate: event.target.value })} />
      <Input placeholder="Nome do cliente" value={draft.userName} onChange={(event) => setDraft({ ...draft, userName: event.target.value })} />
      <select className="border rounded-lg px-3" value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value })}><option value="">Todos</option><option value="succeeded">Pagos</option><option value="processing">Processando</option><option value="failed">Falhos</option><option value="canceled">Cancelados</option><option value="refunded">Reembolsados</option></select>
      <Button type="submit">Filtrar</Button>
    </form>
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6"><Summary label="Pedidos" value={String(orders.length)} /><Summary label="Pagos" value={String(orders.filter((order) => order.status === 'succeeded').length)} /><Summary label="Receita paga" value={formatCurrency(gross)} /></div>
    {isLoading ? <p role="status">Carregando pedidos...</p> : isError ? <EmptyState title="Falha na consulta" description="Tente novamente." action={<Button onClick={() => refetch()}>Tentar novamente</Button>} /> : !orders.length ? <EmptyState title="Nenhum pedido" description="Não há pedidos para os filtros informados." /> : <div className="overflow-x-auto rounded-xl border"><table className="w-full text-left"><thead><tr><th className="p-3">Pedido</th><th className="p-3">Cliente</th><th className="p-3">Data</th><th className="p-3">Status</th><th className="p-3">Total</th></tr></thead><tbody>{orders.map((order) => <tr key={order.id} className="border-t cursor-pointer" tabIndex={0} onClick={() => open(order)} onKeyDown={(event) => { if (event.key === 'Enter') open(order); }}><td className="p-3 font-mono">{order.id.slice(0, 8)}</td><td className="p-3">{order.userName}<br /><span className="text-xs">{order.userEmail}</span></td><td className="p-3">{formatDateTime(order.createdAt)}</td><td className="p-3"><OrderStatusBadge status={order.status} /></td><td className="p-3 font-bold">{formatCurrency(order.amount, order.currency)}</td></tr>)}</tbody></table></div>}
    {selected && <OrderDetails order={selected} admin onClose={() => setSelected(null)} actions={<div className="space-y-2"><label className="font-semibold" htmlFor="admin-notes">Notas administrativas</label><textarea id="admin-notes" rows={4} className="w-full border rounded-lg p-3" value={notes} onChange={(event) => setNotes(event.target.value)} /><Button onClick={save} disabled={saving}>{saving ? 'Salvando...' : 'Salvar notas'}</Button></div>} />}
  </PageContainer>;
}

function Summary({ label, value }: { label: string; value: string }) { return <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-borderLight)' }}><p className="text-sm" style={{ color: 'var(--color-textSecondary)' }}>{label}</p><p className="text-2xl font-bold">{value}</p></div>; }
