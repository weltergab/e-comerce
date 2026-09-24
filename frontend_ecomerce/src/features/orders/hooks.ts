import { useQuery } from '@tanstack/react-query';
import { getAdminOrders, getMyOrders } from './api';

export function useMyOrders() {
  return useQuery({ queryKey: ['orders', 'mine'], queryFn: getMyOrders });
}

export function useAdminOrders(filters: { startDate: string; endDate: string; status?: string }) {
  return useQuery({ queryKey: ['orders', 'admin', filters], queryFn: () => getAdminOrders(filters) });
}
