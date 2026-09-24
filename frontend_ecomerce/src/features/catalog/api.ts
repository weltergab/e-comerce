import { apiJson } from '@/lib/api/client';
import type { Product } from '@/types';

export async function getProducts() {
  return apiJson<{ products: Product[]; nextCursor: string | null }>('/api/products?limit=100');
}

export async function getProduct(productId: string) {
  const response = await apiJson<{ product: Product }>(`/api/products/${encodeURIComponent(productId)}`);
  return response.product;
}
