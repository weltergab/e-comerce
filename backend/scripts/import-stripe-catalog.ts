import { db } from '../src/db/client';
import { stripe } from '../src/payments/stripe';
import { logger } from '../src/shared/logger';

async function run() {
  let imported = 0;
  for await (const product of stripe().products.list({ limit: 100, expand: ['data.default_price'] })) {
    const price = typeof product.default_price === 'string'
      ? await stripe().prices.retrieve(product.default_price)
      : product.default_price;
    if (!price || price.type !== 'one_time' || price.unit_amount === null || price.currency !== 'brl') {
      logger.warn('catalog_product_skipped', { productId: product.id, reason: 'Preço BRL avulso ausente' });
      continue;
    }
    const { error } = await db().from('products').upsert({
      id: product.id,
      name: product.name,
      description: product.description || '',
      price: price.unit_amount / 100,
      currency: price.currency,
      category: product.metadata.category || 'Geral',
      images: product.images,
      active: product.active,
      stripe_product_id: product.id,
      stripe_price_id: price.id,
    }, { onConflict: 'id' });
    if (error) throw error;
    const stock = Math.max(0, Number.parseInt(product.metadata.stock || '0', 10) || 0);
    await db().from('inventory').upsert({ product_id: product.id, on_hand: stock, reserved: 0 }, { onConflict: 'product_id', ignoreDuplicates: true });
    imported += 1;
  }
  logger.info('catalog_import_completed', { imported });
}

run().catch((error) => {
  logger.error('catalog_import_failed', { error: error instanceof Error ? error.message : String(error) });
  process.exitCode = 1;
});
