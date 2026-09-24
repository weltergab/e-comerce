import { apiJson } from '@/lib/api/client';
import type { Order } from '@/types';

export function getMyOrders() {
  return apiJson<{ orders: Order[]; nextCursor: string | null }>('/api/orders?limit=50');
}

export function getAdminOrders(filters: { startDate: string; endDate: string; status?: string }) {
  const query = new URLSearchParams({ startDate: filters.startDate, endDate: filters.endDate, limit: '100' });
  if (filters.status) query.set('status', filters.status);
  return apiJson<{ orders: Order[]; nextCursor: string | null }>(`/api/admin/orders?${query}`);
}

export function saveAdminNotes(orderId: string, adminNotes: string | null) {
  return apiJson<{ order: Order }>(`/api/admin/orders/${orderId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ adminNotes }) });
}
