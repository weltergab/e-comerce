import { db } from '../../db/client';
import { stripe } from '../../payments/stripe';
import { Sentry } from '../../config/monitoring';
import { logger } from '../../shared/logger';

export async function operationalMetrics() {
  const stalePaidCutoff = new Date(Date.now() - 30 * 60_000).toISOString();
  const [events, stock, fulfillment, emails] = await Promise.all([
    db().from('stripe_events').select('event_id', { count: 'exact', head: true }).eq('processing_status', 'failed'),
    db().from('inventory').select('product_id', { count: 'exact', head: true }).lt('on_hand', 0),
    db().from('orders').select('id', { count: 'exact', head: true }).eq('payment_status', 'succeeded').eq('order_status', 'paid').lt('updated_at', stalePaidCutoff),
    db().from('email_notifications').select('id', { count: 'exact', head: true }).eq('status', 'failed'),
  ]);
  return { failedStripeEvents: events.count || 0, negativeInventory: stock.count || 0, stalePaidOrders: fulfillment.count || 0, failedEmails: emails.count || 0 };
}

export async function checkOperationalAlerts() {
  const metrics = await operationalMetrics();
  for (const [name, count] of Object.entries(metrics)) {
    if (count > 0) {
      logger.warn('operational_alert', { metric: name, count });
      Sentry.captureMessage(`Operational alert: ${name}`, { level: 'warning', extra: { count } });
    }
  }
  const { data: products } = await db().from('products').select('id,stripe_price_id,price,currency').eq('active', true).limit(100);
  let catalogDivergences = 0;
  for (const product of products || []) {
    const price = await stripe().prices.retrieve(product.stripe_price_id).catch(() => null);
    if (!price || !price.active || price.currency !== product.currency || price.unit_amount !== Math.round(Number(product.price) * 100)) catalogDivergences += 1;
  }
  if (catalogDivergences) {
    logger.warn('catalog_divergence', { catalogDivergences });
    Sentry.captureMessage('Stripe/Postgres catalog divergence', { level: 'warning', extra: { catalogDivergences } });
  }
  return { ...metrics, catalogDivergences };
}
