import { apiJson } from '@/lib/api/client';
import type { Order } from '@/types';

export interface OrderStatus {
  id: string;
  orderStatus: string;
  paymentStatus: string;
  amount: number;
  currency: string;
}

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

export function getOrderStatus(orderId: string) {
  return apiJson<{ order: OrderStatus }>(`/api/orders/${encodeURIComponent(orderId)}/status`);
}

export function requestPaymentReconciliation(orderId: string) {
  return apiJson<{ queued: boolean }>(`/api/orders/${encodeURIComponent(orderId)}/payment-reconciliation`, { method: 'POST' });
}

export function resumeOrderPayment(orderId: string) {
  return apiJson<{ orderId: string; checkoutUrl: string }>(`/api/checkout/${encodeURIComponent(orderId)}/resume`, { method: 'POST' });
}
