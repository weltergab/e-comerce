import { AppError } from '../../shared/errors';

export type SyncDirection = 'stripe_to_supabase' | 'supabase_to_stripe';
export type SyncAction = 'import' | 'stock' | 'price' | 'all';

export interface SyncInput {
  direction: SyncDirection;
  action: SyncAction;
  productId: string;
  batchId?: string;
}

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

export function parseSyncDirection(value: unknown): SyncDirection {
  if (value !== 'stripe_to_supabase' && value !== 'supabase_to_stripe') {
    throw new AppError(400, 'INVALID_SYNC_DIRECTION', 'Selecione o sentido da sincronização.');
  }
  return value;
}

export function parseSyncInput(body: unknown): SyncInput {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new AppError(400, 'INVALID_SYNC_INPUT', 'Sincronização inválida.');
  const value = body as Record<string, unknown>;
  const direction = parseSyncDirection(value.direction);
  if (typeof value.action !== 'string' || !['import', 'stock', 'price', 'all'].includes(value.action)) throw new AppError(400, 'INVALID_SYNC_ACTION', 'Ação inválida.');
  if (typeof value.productId !== 'string' || !value.productId.trim() || value.productId.length > 255) throw new AppError(400, 'INVALID_SYNC_PRODUCT', 'Código de produto inválido.');
  if (value.batchId !== undefined && (typeof value.batchId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.batchId))) {
    throw new AppError(400, 'INVALID_SYNC_BATCH', 'Identificador de lote inválido.');
  }
  return { direction, action: value.action as SyncAction, productId: value.productId, batchId: value.batchId as string | undefined };
}

export function parseStripeStock(raw: string | undefined) {
  if (raw === undefined || raw.trim() === '') return { stock: null, stockIssue: 'Defina metadata.stock no Stripe antes de importar estoque.' };
  const stock = Number(raw);
  if (!/^\d+$/.test(raw.trim()) || !Number.isSafeInteger(stock) || stock < 0 || stock > 1_000_000) {
    return { stock: null, stockIssue: 'metadata.stock deve ser um inteiro entre 0 e 1.000.000.' };
  }
  return { stock, stockIssue: null };
}

export function compareSyncProduct(source: SyncProduct, target: SyncProduct | null) {
  return {
    source,
    target,
    existsInTarget: target !== null,
    stockDifference: target && source.stock !== null && target.stock !== null ? source.stock - target.stock : null,
    priceDifference: target && source.price !== null && target.price !== null && source.currency === target.currency ? Math.round((source.price - target.price) * 100) / 100 : null,
    stockMismatch: Boolean(target && (source.stockIssue || target.stockIssue || source.stock === null || target.stock === null || source.stock !== target.stock)),
    priceMismatch: Boolean(target && (source.priceIssue || target.priceIssue || source.currency !== target.currency || source.price !== target.price || source.priceId !== target.priceId)),
  };
}

export function assertSyncSource(source: SyncProduct, action: SyncAction) {
  if (action !== 'price' && (source.stockIssue || source.stock === null)) throw new AppError(409, 'SYNC_INVALID_STOCK', source.stockIssue || 'Estoque ausente.');
  if (action !== 'stock' && (source.priceIssue || source.price === null || source.currency !== 'brl')) throw new AppError(409, 'SYNC_INVALID_PRICE', source.priceIssue || 'Defina um preço avulso válido em BRL.');
  if ((action === 'import' || action === 'all') && (!source.name.trim() || source.name.length > 160 || source.images.length > 8)) {
    throw new AppError(409, 'SYNC_INVALID_PRODUCT', 'O produto precisa de nome com até 160 caracteres e no máximo 8 imagens.');
  }
}
