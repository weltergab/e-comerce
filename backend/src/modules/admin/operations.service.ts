import { db } from '../../db/client';
import { stripe } from '../../payments/stripe';

export async function operationalMetrics() {
  const stalePaidCutoff = new Date(Date.now() - 30 * 60_000).toISOString();
  const [events, stock, fulfillment, emails, products] = await Promise.all([
    db().from('stripe_events').select('event_id', { count: 'exact', head: true }).eq('processing_status', 'failed'),
    db().from('inventory').select('product_id', { count: 'exact', head: true }).lt('on_hand', 0),
    db().from('orders').select('id', { count: 'exact', head: true }).eq('payment_status', 'succeeded').eq('order_status', 'paid').lt('updated_at', stalePaidCutoff),
    db().from('email_notifications').select('id', { count: 'exact', head: true }).eq('status', 'failed'),
    db().from('products').select('id,stripe_price_id,price,currency').eq('active', true).limit(100),
  ]);

  const priceChecks = await Promise.all((products.data || []).map(async (product) => {
    const price = await stripe().prices.retrieve(product.stripe_price_id).catch(() => null);
    return !price || !price.active || price.currency !== product.currency || price.unit_amount !== Math.round(Number(product.price) * 100);
  }));

  return {
    failedStripeEvents: events.count || 0,
    negativeInventory: stock.count || 0,
    stalePaidOrders: fulfillment.count || 0,
    failedEmails: emails.count || 0,
    catalogDivergences: priceChecks.filter(Boolean).length,
  };
}
