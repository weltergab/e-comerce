import { apiJson } from '@/lib/api/client';

export type SyncDirection = 'stripe_to_supabase' | 'supabase_to_stripe';
export type SyncAction = 'import' | 'stock' | 'price' | 'all';

export interface SyncProduct {
  id: string;
  stripeProductId: string;
  name: string;
  description: string;
  images: string[];
  category: string;
  active: boolean;
  stock: number | null;
  reserved: number;
  price: number | null;
  currency: string | null;
  priceId: string | null;
  stockIssue: string | null;
  priceIssue: string | null;
}

export interface SyncComparison {
  source: SyncProduct;
  target: SyncProduct | null;
  existsInTarget: boolean;
  stockDifference: number | null;
  priceDifference: number | null;
  stockMismatch: boolean;
  priceMismatch: boolean;
}

export interface SyncLog {
  id: string;
  batch_id: string | null;
  actor_id: string | null;
  direction: SyncDirection;
  action: SyncAction;
  source_product_id: string;
  stripe_product_id: string | null;
  status: 'running' | 'success' | 'skipped' | 'error';
  message: string;
  created_at: string;
  completed_at: string | null;
  before_state: SyncComparison | null;
  after_state: SyncComparison | null;
}

export const syncProducts = (direction: SyncDirection) => apiJson<{ products: SyncComparison[]; checkedAt: string }>(`/api/admin/sync/products?direction=${direction}`);
export const syncLogs = () => apiJson<{ logs: SyncLog[] }>('/api/admin/sync/logs');
export const synchronizeProduct = (direction: SyncDirection, action: SyncAction, productId: string, batchId?: string) => apiJson<{ status: 'success' | 'skipped'; message: string; product: SyncComparison }>('/api/admin/sync/products', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ direction, action, productId, batchId }),
});
