import { useQuery } from '@tanstack/react-query';
import { getProduct, getProducts } from './api';

export function useProducts() {
  return useQuery({ queryKey: ['products'], queryFn: getProducts });
}

export function useProduct(productId?: string) {
  return useQuery({ queryKey: ['products', productId], queryFn: () => getProduct(productId!), enabled: Boolean(productId) });
}
