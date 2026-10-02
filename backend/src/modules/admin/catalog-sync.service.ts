import { randomUUID } from 'node:crypto';
import type Stripe from 'stripe';
import { db } from '../../db/client';
import { stripe } from '../../payments/stripe';
import { AppError } from '../../shared/errors';
import { logger } from '../../shared/logger';
import { assertSyncSource, compareSyncProduct, parseStripeStock, type SyncDirection, type SyncInput, type SyncProduct } from './catalog-sync.schemas';

interface LocalRow {
  id: string;
  stripe_product_id: string;
  stripe_price_id: string;
  name: string;
  description: string;
  images: string[];
  category: string;
  active: boolean;
  price: number | string;
  currency: string;
  inventory: { on_hand: number; reserved: number } | { on_hand: number; reserved: number }[] | null;
}

const localSelection = '*,inventory(on_hand,reserved)';

function localProduct(row: LocalRow): SyncProduct {
  const inventory = Array.isArray(row.inventory) ? row.inventory[0] : row.inventory;
  const price = Number(row.price);
  const stock = inventory ? inventory.on_hand - inventory.reserved : null;
  return {
    id: row.id, stripeProductId: row.stripe_product_id, name: row.name,
    description: row.description || '', images: row.images || [], category: row.category || 'Geral', active: row.active,
    stock, reserved: inventory?.reserved || 0,
    price, currency: row.currency, priceId: row.stripe_price_id,
    stockIssue: stock === null ? 'O produto está sem registro de estoque no Supabase.' : Number.isSafeInteger(stock) && stock >= 0 && stock <= 1_000_000 ? null : 'O estoque disponível deve estar entre 0 e 1.000.000.',
    priceIssue: Number.isFinite(price) && price > 0 && price <= 1_000_000 && row.currency === 'brl' ? null : 'O preço deve ser positivo, até R$ 1.000.000 e em BRL.',
  };
}

async function stripeProduct(product: Stripe.Product): Promise<SyncProduct> {
  const price = typeof product.default_price === 'string' ? await stripe().prices.retrieve(product.default_price) : product.default_price;
  const validPrice = price && price.active && price.type === 'one_time' && price.billing_scheme === 'per_unit'
    && price.unit_amount !== null && price.unit_amount > 0 && price.unit_amount <= 100_000_000 && price.currency === 'brl';
  return {
    id: product.id, stripeProductId: product.id, name: product.name, description: product.description || '',
    images: product.images, category: product.metadata.category || 'Geral', active: product.active,
    ...parseStripeStock(product.metadata.stock), reserved: 0,
    price: price?.unit_amount === null || !price ? null : price.unit_amount / 100,
    currency: price?.currency || null, priceId: price?.id || null,
    priceIssue: validPrice ? null : 'Defina um preço padrão ativo, avulso, por unidade, positivo e em BRL (até R$ 1.000.000).',
  };
}

async function getLocalProduct(column: 'id' | 'stripe_product_id', id: string): Promise<SyncProduct | null> {
  const { data, error } = await db().from('products').select(localSelection).eq(column, id).maybeSingle();
  if (error) throw new AppError(500, 'SYNC_CATALOG_READ_FAILED', 'Não foi possível consultar o catálogo do Supabase.');
  return data ? localProduct(data as unknown as LocalRow) : null;
}

async function getStripeProduct(id: string): Promise<SyncProduct | null> {
  try {
    const product = await stripe().products.retrieve(id, { expand: ['default_price'] });
    return product.deleted ? null : stripeProduct(product);
  } catch (cause) {
    // Erros de conexão/autorização nunca significam que o produto não existe.
    if (cause && typeof cause === 'object' && 'code' in cause && cause.code === 'resource_missing') return null;
    throw cause;
  }
}

export async function listSyncProducts(direction: SyncDirection) {
  const [local, remote] = await Promise.all([
    (async () => {
      const products: SyncProduct[] = [];
      let cursor: string | undefined;
      for (;;) {
        let query = db().from('products').select(localSelection).order('id').limit(500);
        if (cursor) query = query.gt('id', cursor);
        const { data, error } = await query;
        if (error) throw new AppError(500, 'SYNC_CATALOG_READ_FAILED', 'Não foi possível consultar todos os produtos do Supabase.');
        const rows = (data || []) as unknown as LocalRow[];
        products.push(...rows.map(localProduct));
        if (rows.length === 0) break;
        cursor = rows.at(-1)!.id;
      }
      return products;
    })(),
    (async () => {
      const products: SyncProduct[] = [];
      for await (const product of stripe().products.list({ limit: 100, expand: ['data.default_price'] })) products.push(await stripeProduct(product));
      return products;
    })(),
  ]);
  const source = direction === 'stripe_to_supabase' ? remote : local;
  const target = new Map((direction === 'stripe_to_supabase' ? local : remote).map((product) => [product.stripeProductId, product]));
  return { products: source.map((product) => compareSyncProduct(product, target.get(product.stripeProductId) || null)), checkedAt: new Date().toISOString() };
}

async function readComparison(input: SyncInput) {
  const source = input.direction === 'stripe_to_supabase'
    ? await getStripeProduct(input.productId) : await getLocalProduct('id', input.productId);
  if (!source) throw new AppError(404, 'SYNC_SOURCE_MISSING', 'O produto não existe mais na origem. Busque o catálogo novamente.');
  const target = input.direction === 'stripe_to_supabase'
    ? await getLocalProduct('stripe_product_id', source.stripeProductId) : await getStripeProduct(source.stripeProductId);
  return compareSyncProduct(source, target);
}

async function sendToStripe(source: SyncProduct, target: SyncProduct | null, input: SyncInput, operationId: string) {
  const client = stripe();
  let result: Stripe.Product;
  let previousPriceId: string | null = null;
  if (!target) {
    result = await client.products.create({
      id: source.stripeProductId, name: source.name, description: source.description || undefined,
      images: source.images, active: source.active, metadata: { stock: String(source.stock), category: source.category },
      default_price_data: { currency: source.currency!, unit_amount: Math.round(source.price! * 100) },
      expand: ['default_price'],
    }, { idempotencyKey: `catalog-sync:${operationId}:product` });
  } else {
    const update: Stripe.ProductUpdateParams = { expand: ['default_price'] };
    if (input.action === 'stock' || input.action === 'all') update.metadata = { stock: String(source.stock) };
    if (input.action === 'all') {
      Object.assign(update, { name: source.name, description: source.description, images: source.images, active: source.active });
      update.metadata = { ...update.metadata as Record<string, string>, category: source.category };
    }
    if (input.action === 'price' || input.action === 'all') {
      if (target.priceIssue || Math.round(target.price! * 100) !== Math.round(source.price! * 100) || target.currency !== source.currency) {
        const price = await client.prices.create({ product: source.stripeProductId, currency: source.currency!, unit_amount: Math.round(source.price! * 100) }, { idempotencyKey: `catalog-sync:${operationId}:price` });
        update.default_price = price.id;
        previousPriceId = target.priceId;
      }
    }
    result = await client.products.update(source.stripeProductId, update, { idempotencyKey: `catalog-sync:${operationId}:update` });
  }
  const remote = await stripeProduct(result);
  if (input.action !== 'stock') {
    const { error } = await db().from('products').update({ stripe_price_id: remote.priceId }).eq('id', source.id);
    if (error) throw new AppError(500, 'SYNC_PRICE_LINK_FAILED', 'Stripe atualizado, mas o vínculo do preço não foi salvo. Execute a sincronização novamente.');
  }
  if (previousPriceId && previousPriceId !== remote.priceId) {
    // Preços recorrentes podem pertencer a assinaturas; não os arquiva por esta tela.
    const oldPrice = await client.prices.retrieve(previousPriceId);
    if (oldPrice.type === 'one_time') await client.prices.update(previousPriceId, { active: false });
  }
}

async function sendToSupabase(source: SyncProduct, input: SyncInput, actorId: string, operationId: string) {
  const { data, error } = await db().rpc('sync_stripe_catalog_product', {
    p_product: { stripe_product_id: source.stripeProductId, stripe_price_id: source.priceId, name: source.name,
      description: source.description, images: source.images, category: source.category.slice(0, 80),
      active: source.active, price: source.price, currency: source.currency, stock: source.stock },
    p_action: input.action, p_actor_id: actorId, p_operation_id: operationId,
  });
  if (error) {
    logger.error('catalog_sync_database_failed', { operationId, code: error.code, error: error.message });
    throw new AppError(409, 'SYNC_DATABASE_WRITE_FAILED', 'Não foi possível gravar produto e estoque. Verifique a migration de sincronização e os vínculos do produto.');
  }
  return data as { status: 'success' | 'skipped' };
}

export async function synchronizeProduct(input: SyncInput, actorId: string) {
  const operationId = randomUUID();
  const { error: auditError } = await db().from('catalog_sync_logs').insert({
    id: operationId, actor_id: actorId, direction: input.direction, action: input.action,
    source_product_id: input.productId, batch_id: input.batchId || null, status: 'running',
  });
  if (auditError) throw new AppError(503, 'SYNC_AUDIT_UNAVAILABLE', 'Não foi possível salvar o log. Aplique a migration 20261002_catalog_sync.sql e verifique a conexão.');

  let before: ReturnType<typeof compareSyncProduct> | undefined;
  try {
    before = await readComparison(input);
    const { error: beforeError } = await db().from('catalog_sync_logs').update({ before_state: before, stripe_product_id: before.source.stripeProductId }).eq('id', operationId);
    if (beforeError) throw new AppError(503, 'SYNC_AUDIT_UNAVAILABLE', 'Não foi possível registrar o estado inicial; tente novamente.');
    let status: 'success' | 'skipped' = 'success';
    if (input.action === 'import' && before.target) status = 'skipped';
    else {
      assertSyncSource(before.source, input.action);
      if (!before.target && (input.action === 'stock' || input.action === 'price')) throw new AppError(409, 'SYNC_TARGET_MISSING', 'Importe o produto antes de atualizar estoque ou valor.');
      if (input.direction === 'stripe_to_supabase') status = (await sendToSupabase(before.source, input, actorId, operationId)).status;
      else await sendToStripe(before.source, before.target, input, operationId);
    }
    const after = await readComparison(input);
    const message = status === 'skipped' ? 'O produto já existe no destino.' : 'Sincronização concluída.';
    const { error } = await db().from('catalog_sync_logs').update({ status, message, after_state: after, completed_at: new Date().toISOString() }).eq('id', operationId);
    if (error) throw new AppError(503, 'SYNC_AUDIT_FINALIZE_FAILED', 'A sincronização foi executada, mas o log não pôde ser finalizado. Atualize a consulta antes de repetir.');
    logger.info('catalog_sync_completed', { operationId, direction: input.direction, action: input.action, productId: input.productId, status });
    return { operationId, status, message, product: after };
  } catch (cause) {
    const message = cause instanceof AppError ? cause.message : 'Falha na comunicação com o Stripe. Consulte o log e busque os produtos antes de repetir.';
    const after = before ? await readComparison(input).catch(() => null) : null;
    const { error } = await db().from('catalog_sync_logs').update({ status: 'error', message, after_state: after, completed_at: new Date().toISOString() }).eq('id', operationId);
    logger.error('catalog_sync_failed', { operationId, productId: input.productId, error: cause instanceof Error ? cause.message : String(cause), auditFailed: Boolean(error) });
    if (cause instanceof AppError) throw cause;
    throw new AppError(502, 'SYNC_STRIPE_FAILED', message);
  }
}

export async function listSyncLogs() {
  const { data, error } = await db().from('catalog_sync_logs').select('*').order('created_at', { ascending: false }).order('id', { ascending: false }).limit(100);
  if (error) throw new AppError(503, 'SYNC_AUDIT_UNAVAILABLE', 'Não foi possível consultar os logs. Verifique a migration 20261002_catalog_sync.sql.');
  return data || [];
}
