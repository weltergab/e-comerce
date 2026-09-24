import { db } from '../../db/client';
import { stripe } from '../../payments/stripe';
import { AppError } from '../../shared/errors';
import { logger } from '../../shared/logger';

export function paymentStatus(eventType: string, stripeStatus: string) {
  if (eventType === 'payment_intent.succeeded') return 'succeeded';
  if (eventType === 'payment_intent.payment_failed') return 'failed';
  if (eventType === 'payment_intent.canceled') return 'canceled';
  if (eventType === 'charge.refunded') return 'refunded';
  return stripeStatus;
}

export async function processPaymentEvents(limit = 20) {
  const { data: events, error } = await db()
    .from('stripe_events')
    .select('*')
    .in('processing_status', ['received', 'failed'])
    .lt('attempt_count', 10)
    .order('received_at', { ascending: true })
    .limit(limit);
  if (error) throw new AppError(500, 'EVENT_QUEUE_READ_FAILED', 'Não foi possível ler a fila de pagamentos.');

  let processed = 0;
  let failed = 0;
  for (const event of events || []) {
    await db().from('stripe_events').update({ processing_status: 'processing', attempt_count: Number(event.attempt_count) + 1 }).eq('event_id', event.event_id);
    try {
      const intent = await stripe().paymentIntents.retrieve(event.object_id);
      const method = typeof intent.payment_method === 'string'
        ? await stripe().paymentMethods.retrieve(intent.payment_method).then((value) => value.type).catch(() => null)
        : null;
      if (event.event_type === 'charge.refunded') {
        const { error: settlementError } = await db().rpc('apply_payment_state', {
          p_order_id: intent.metadata.orderId,
          p_event_id: `${event.event_id}:settlement`,
          p_event_type: 'refund_settlement',
          p_payment_status: 'succeeded',
          p_payment_method: method,
        });
        if (settlementError) throw settlementError;
      }
      const { error: applyError } = await db().rpc('apply_payment_state', {
        p_order_id: intent.metadata.orderId,
        p_event_id: event.event_id,
        p_event_type: event.event_type,
        p_payment_status: paymentStatus(event.event_type, intent.status),
        p_payment_method: method,
      });
      if (applyError) throw applyError;
      await db().from('stripe_events').update({ processing_status: 'processed', processed_at: new Date().toISOString(), error_summary: null }).eq('event_id', event.event_id);
      processed += 1;
      logger.info('stripe_event_processed', { eventId: event.event_id, orderId: intent.metadata.orderId, paymentIntentId: intent.id });
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      await db().from('stripe_events').update({ processing_status: 'failed', error_summary: message.slice(0, 500) }).eq('event_id', event.event_id);
      failed += 1;
      logger.error('stripe_event_failed', { eventId: event.event_id, paymentIntentId: event.object_id, error: message });
    }
  }
  return { processed, failed };
}

export async function reconcilePendingOrders(limit = 20) {
  await expireCheckoutReservations(limit);
  const { data, error } = await db().from('orders').select('id,stripe_payment_intent_id').in('payment_status', ['requires_payment_method', 'requires_action', 'processing']).not('stripe_payment_intent_id', 'is', null).order('created_at', { ascending: true }).limit(limit);
  if (error) throw new AppError(500, 'RECONCILIATION_READ_FAILED', 'Não foi possível consultar pedidos pendentes.');
  for (const order of data || []) {
    const intent = await stripe().paymentIntents.retrieve(order.stripe_payment_intent_id);
    const eventId = `reconcile:${intent.id}:${intent.status}:${intent.created}`;
    await db().from('stripe_events').upsert({ event_id: eventId, event_type: `reconcile.${intent.status}`, object_id: intent.id, processing_status: 'received' }, { onConflict: 'event_id', ignoreDuplicates: true });
  }
  return { queued: data?.length || 0 };
}

async function expireCheckoutReservations(limit: number) {
  const { data: reservations } = await db().from('inventory_reservations').select('order_id').eq('status', 'reserved').lt('expires_at', new Date().toISOString()).limit(limit);
  const orderIds = [...new Set((reservations || []).map((reservation) => reservation.order_id))];
  if (!orderIds.length) return;
  const { data: orders } = await db().from('orders').select('id,stripe_payment_intent_id').in('id', orderIds);
  for (const order of orders || []) {
    if (!order.stripe_payment_intent_id) {
      await db().rpc('release_order_reservation', { p_order_id: order.id, p_reason: 'expired' });
      continue;
    }
    const intent = await stripe().paymentIntents.retrieve(order.stripe_payment_intent_id);
    if (intent.status === 'succeeded') {
      await db().from('stripe_events').upsert({ event_id: `expire-reconcile:${intent.id}:succeeded`, event_type: 'payment_intent.succeeded', object_id: intent.id, processing_status: 'received' }, { onConflict: 'event_id', ignoreDuplicates: true });
      continue;
    }
    if (intent.status !== 'canceled') {
      const canceled = await stripe().paymentIntents.cancel(intent.id).catch(() => null);
      if (!canceled) continue;
    }
    await db().rpc('release_order_reservation', { p_order_id: order.id, p_reason: 'expired' });
  }
}
