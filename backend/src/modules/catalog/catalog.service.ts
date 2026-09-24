import { randomUUID } from 'node:crypto';
import { db } from '../../db/client';
import { stripe } from '../../payments/stripe';
import { AppError } from '../../shared/errors';
import type { ProductInput } from './catalog.schemas';
import { attachProductImages } from './product-images.service';

interface ProductRow {
  id: string;
  name: string;
  description: string | null;
  price: number | string;
  currency: string;
  category: string | null;
  images: string[] | null;
  active: boolean;
  stripe_product_id: string;
  stripe_price_id: string;
}

async function inventoryByProduct(ids: string[]) {
  if (!ids.length) return new Map<string, number>();
  const { data, error } = await db().from('inventory').select('product_id,on_hand,reserved').in('product_id', ids);
  if (error) throw new AppError(500, 'INVENTORY_READ_FAILED', 'Não foi possível consultar o estoque.');
  return new Map((data || []).map((item) => [item.product_id, Number(item.on_hand) - Number(item.reserved)]));
}

function productDto(row: ProductRow, stock: number) {
  const price = Number(row.price);
  return {
    id: row.id,
    name: row.name,
    description: row.description || '',
    price,
    currency: row.currency,
    image: row.images?.[0] || '',
    images: row.images || [],
    category: row.category || 'Geral',
    stock,
    active: row.active,
  };
}

export async function listProducts(input: { limit: number; cursor?: string; includeInactive?: boolean }) {
  let query = db().from('products').select('*').order('id', { ascending: true }).limit(input.limit + 1);
  if (!input.includeInactive) query = query.eq('active', true);
  if (input.cursor) query = query.gt('id', input.cursor);
  const { data, error } = await query;
  if (error) throw new AppError(500, 'CATALOG_READ_FAILED', 'Não foi possível consultar o catálogo.');
  const rows = (data || []) as ProductRow[];
  const page = rows.slice(0, input.limit);
  const inventory = await inventoryByProduct(page.map((row) => row.id));
  return {
    products: page.map((row) => productDto(row, inventory.get(row.id) || 0)),
    nextCursor: rows.length > input.limit ? page.at(-1)?.id || null : null,
  };
}

export async function getProduct(productId: string, includeInactive = false) {
  let query = db().from('products').select('*').eq('id', productId);
  if (!includeInactive) query = query.eq('active', true);
  const { data, error } = await query.maybeSingle();
  if (error) throw new AppError(500, 'CATALOG_READ_FAILED', 'Não foi possível consultar o produto.');
  if (!data) throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Produto não encontrado.');
  const inventory = await inventoryByProduct([productId]);
  return productDto(data as ProductRow, inventory.get(productId) || 0);
}

export async function getAdminProduct(productId: string) {
  const product = await getProduct(productId, true);
  const { data } = await db().from('products').select('stripe_price_id').eq('id', productId).single();
  return {
    ...product,
    metadata: { stock: String(product.stock), category: product.category },
    price: { id: data?.stripe_price_id || '', unit_amount: Math.round(product.price * 100), currency: product.currency },
  };
}

export async function listAdminProducts(input: { limit: number; cursor?: string }) {
  const page = await listProducts({ ...input, includeInactive: true });
  return {
    ...page,
    products: page.products.map((product) => ({
      ...product,
      metadata: { stock: String(product.stock), category: product.category },
      price: { unit_amount: Math.round(product.price * 100), currency: product.currency },
    })),
  };
}

export async function createProduct(input: ProductInput, actorId: string) {
  const stripeProduct = await stripe().products.create({
    name: input.name,
    description: input.description,
    images: input.images,
    active: input.active,
    metadata: { category: input.category },
  });
  const stripePrice = await stripe().prices.create({
    product: stripeProduct.id,
    unit_amount: Math.round(input.price * 100),
    currency: input.currency,
  });
  await stripe().products.update(stripeProduct.id, { default_price: stripePrice.id });

  const { error } = await db().from('products').insert({
    id: stripeProduct.id,
    name: input.name,
    description: input.description,
    price: input.price,
    currency: input.currency,
    category: input.category,
    images: input.images,
    active: input.active,
    stripe_product_id: stripeProduct.id,
    stripe_price_id: stripePrice.id,
  });
  if (error) {
    await stripe().products.update(stripeProduct.id, { active: false }).catch(() => undefined);
    throw new AppError(500, 'PRODUCT_CREATE_FAILED', 'Não foi possível salvar o produto.');
  }
  const { error: inventoryError } = await db().from('inventory').insert({ product_id: stripeProduct.id, on_hand: input.stock || 0, reserved: 0 });
  if (inventoryError) throw new AppError(500, 'INVENTORY_CREATE_FAILED', 'Produto criado, mas o estoque não pôde ser salvo.');
  if (input.stock) {
    await db().from('inventory_movements').insert({
      product_id: stripeProduct.id,
      movement_type: 'admin_adjustment',
      quantity: input.stock,
      actor_id: actorId,
      idempotency_key: `product-create:${stripeProduct.id}`,
    });
  }
  await attachProductImages(stripeProduct.id, input.images, actorId);
  return getAdminProduct(stripeProduct.id);
}

export async function updateProduct(productId: string, input: Partial<ProductInput>, actorId: string) {
  const { data: current, error } = await db().from('products').select('*').eq('id', productId).maybeSingle();
  if (error || !current) throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Produto não encontrado.');

  let stripePriceId = current.stripe_price_id as string;
  if (input.price !== undefined && Number(current.price) !== input.price) {
    const created = await stripe().prices.create({
      product: current.stripe_product_id,
      unit_amount: Math.round(input.price * 100),
      currency: input.currency || current.currency,
    });
    await stripe().products.update(current.stripe_product_id, { default_price: created.id });
    await stripe().prices.update(stripePriceId, { active: false });
    stripePriceId = created.id;
  }

  await stripe().products.update(current.stripe_product_id, {
    ...(input.name !== undefined ? { name: input.name } : {}),
    ...(input.description !== undefined ? { description: input.description } : {}),
    ...(input.images !== undefined ? { images: input.images } : {}),
    ...(input.active !== undefined ? { active: input.active } : {}),
    ...(input.category !== undefined ? { metadata: { category: input.category } } : {}),
  });

  const update = { ...input, stripe_price_id: stripePriceId } as Record<string, unknown>;
  delete update.stock;
  const { error: updateError } = await db().from('products').update(update).eq('id', productId);
  if (updateError) throw new AppError(500, 'PRODUCT_UPDATE_FAILED', 'Não foi possível atualizar o produto.');

  if (input.stock !== undefined) {
    const { data: inventory } = await db().from('inventory').select('on_hand,reserved').eq('product_id', productId).single();
    const targetOnHand = input.stock + Number(inventory?.reserved || 0);
    const delta = targetOnHand - Number(inventory?.on_hand || 0);
    if (delta) {
      const { error: adjustmentError } = await db().rpc('admin_adjust_inventory', {
        p_product_id: productId,
        p_delta: delta,
        p_actor_id: actorId,
        p_idempotency_key: `admin:${randomUUID()}`,
      });
      if (adjustmentError) throw new AppError(409, 'INVALID_STOCK_ADJUSTMENT', 'O ajuste deixaria o estoque inválido.');
    }
  }
  if (input.images !== undefined) await attachProductImages(productId, input.images, actorId);
  return getAdminProduct(productId);
}

export async function archiveProduct(productId: string) {
  const { data } = await db().from('products').select('stripe_product_id').eq('id', productId).maybeSingle();
  if (!data) throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Produto não encontrado.');
  await stripe().products.update(data.stripe_product_id, { active: false });
  const { error } = await db().from('products').update({ active: false }).eq('id', productId);
  if (error) throw new AppError(500, 'PRODUCT_ARCHIVE_FAILED', 'Não foi possível arquivar o produto.');
}
