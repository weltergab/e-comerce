import { useQuery } from '@tanstack/react-query';
import { getAdminOrders, getMyOrders, getOrderStatus } from './api';

export const terminalPaymentStatuses = new Set(['succeeded', 'failed', 'canceled', 'refunded']);

export function useMyOrders() {
  return useQuery({ queryKey: ['orders', 'mine'], queryFn: getMyOrders });
}

export function useAdminOrders(filters: { startDate: string; endDate: string; status?: string }) {
  return useQuery({ queryKey: ['orders', 'admin', filters], queryFn: () => getAdminOrders(filters) });
}

export function useOrderStatus(orderId: string | null) {
  return useQuery({
    queryKey: ['orders', 'status', orderId],
    queryFn: () => getOrderStatus(orderId!),
    enabled: Boolean(orderId),
    refetchInterval: (query) => {
      const status = query.state.data?.order.paymentStatus;
      const attempts = query.state.dataUpdateCount + query.state.errorUpdateCount;
      return (status && terminalPaymentStatuses.has(status)) || attempts >= 20 ? false : 2_500;
    },
  });
}
