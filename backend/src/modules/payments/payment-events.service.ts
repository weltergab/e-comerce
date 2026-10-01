import type Stripe from 'stripe';
import { db } from '../../db/client';
import { stripe } from '../../payments/stripe';
import { Sentry } from '../../config/monitoring';
import { AppError } from '../../shared/errors';
import { logger } from '../../shared/logger';

export const supportedPaymentEvents = new Set([
  'checkout.session.completed',
  'checkout.session.async_payment_succeeded',
  'checkout.session.async_payment_failed',
  'payment_intent.created',
  'payment_intent.processing',
  'payment_intent.succeeded',
  'payment_intent.payment_failed',
  'payment_intent.canceled',
  'charge.refunded',
]);

interface PaymentEventInput {
  eventId: string;
  eventType: string;
  objectId: string;
  orderId?: string;
}

interface PaymentResult {
  orderId?: string;
  paymentStatus?: string;
  updatedAt?: string;
  exhausted?: boolean;
}

export function isMissingStripeEventOrderId(error: unknown) {
  if (!error || typeof error !== 'object') return false;
  const failure = error as { code?: unknown; message?: unknown; details?: unknown };
  const code = typeof failure.code === 'string' ? failure.code : '';
  const description = [failure.message, failure.details]
    .filter((value): value is string => typeof value === 'string')
    .join(' ');
  return ['42703', 'PGRST204'].includes(code)
    && /stripe_events/i.test(description)
    && /order_id/i.test(description);
}

export function paymentStatus(eventType: string, stripeStatus: string) {
  if (eventType === 'checkout.session.async_payment_succeeded') return 'succeeded';
  if (eventType === 'checkout.session.async_payment_failed') return 'failed';
  if (eventType === 'payment_intent.succeeded') return 'succeeded';
  if (eventType === 'payment_intent.payment_failed') return 'failed';
  if (eventType === 'payment_intent.canceled') return 'canceled';
  if (eventType === 'charge.refunded') return 'refunded';
  return stripeStatus;
}

function checkoutSessionOrderId(session: Stripe.Checkout.Session) {
  return session.metadata?.orderId || session.client_reference_id || undefined;
}

async function paymentIntentFromSession(session: Stripe.Checkout.Session) {
  if (!session.payment_intent) return null;
  return typeof session.payment_intent === 'string'
    ? stripe().paymentIntents.retrieve(session.payment_intent)
    : session.payment_intent;
}

async function retrieveCheckoutSessionIntent(sessionId: string, orderId: string) {
  const session = await stripe().checkout.sessions.retrieve(sessionId, { expand: ['payment_intent'] });
  if (checkoutSessionOrderId(session) !== orderId) {
    throw new AppError(409, 'PAYMENT_ORDER_MISMATCH', 'A sessão de pagamento não pertence a este pedido.');
  }
  return { session, intent: await paymentIntentFromSession(session) };
}

async function associatePaymentIntent(orderId: string, paymentIntentId: string) {
  const { error } = await db().from('orders')
    .update({ stripe_payment_intent_id: paymentIntentId })
    .eq('id', orderId);
  if (error) throw new AppError(500, 'PAYMENT_ASSOCIATION_FAILED', 'Não foi possível associar o pagamento ao pedido.');
}

export async function persistPaymentEvent(input: PaymentEventInput) {
  const event = {
    event_id: input.eventId,
    event_type: input.eventType,
    object_id: input.objectId,
    order_id: input.orderId || null,
    processing_status: 'received',
  };
  let { error } = await db().from('stripe_events').upsert(event, { onConflict: 'event_id', ignoreDuplicates: true });
  if (isMissingStripeEventOrderId(error)) {
    const legacyEvent = {
      event_id: event.event_id,
      event_type: event.event_type,
      object_id: event.object_id,
      processing_status: event.processing_status,
    };
    ({ error } = await db().from('stripe_events').upsert(legacyEvent, { onConflict: 'event_id', ignoreDuplicates: true }));
    logger.warn('stripe_events_order_id_missing', { eventId: input.eventId });
  }
  if (error) throw new AppError(503, 'EVENT_PERSIST_FAILED', 'Evento não persistido; tente novamente.');
}

async function orderResult(orderId?: string): Promise<PaymentResult> {
  if (!orderId) return {};
  const { data, error } = await db().from('orders').select('id,payment_status,updated_at').eq('id', orderId).maybeSingle();
  if (error) throw new AppError(500, 'ORDER_READ_FAILED', 'Não foi possível consultar o pedido processado.');
  return data ? { orderId: data.id, paymentStatus: data.payment_status, updatedAt: data.updated_at } : { orderId };
}

export async function processPaymentEvent(eventId: string): Promise<PaymentResult> {
  const { data: event, error } = await db().from('stripe_events').select('*').eq('event_id', eventId).maybeSingle();
  if (error) throw new AppError(500, 'EVENT_READ_FAILED', 'Não foi possível ler o evento de pagamento.');
  if (!event) throw new AppError(404, 'EVENT_NOT_FOUND', 'Evento de pagamento não encontrado.');
  if (event.processing_status === 'processed') {
    if (event.order_id) return orderResult(event.order_id);
    const processedIntent = await stripe().paymentIntents.retrieve(event.object_id);
    return orderResult(processedIntent.metadata.orderId);
  }

  const attempt = Number(event.attempt_count) + 1;
  if (attempt > 10) {
    const exhausted = { ...(await orderResult(event.order_id)), exhausted: true };
    logger.error('stripe_event_attempts_exhausted', { eventId, paymentIntentId: event.object_id });
    Sentry.captureMessage('Stripe event attempts exhausted', { level: 'error', extra: { eventId, paymentIntentId: event.object_id } });
    return exhausted;
  }

  const { error: processingError } = await db().from('stripe_events')
    .update({ processing_status: 'processing', attempt_count: attempt })
    .eq('event_id', eventId);
  if (processingError) throw processingError;
  try {
    const intent = await stripe().paymentIntents.retrieve(event.object_id);
    const orderId = intent.metadata.orderId || event.order_id;
    if (!orderId) throw new Error('PaymentIntent sem orderId');
    await associatePaymentIntent(orderId, intent.id);
    const method = typeof intent.payment_method === 'string'
      ? await stripe().paymentMethods.retrieve(intent.payment_method).then((value) => value.type).catch(() => null)
      : null;

    if (event.event_type === 'charge.refunded') {
      const { error: settlementError } = await db().rpc('apply_payment_state', {
        p_order_id: orderId,
        p_event_id: `${event.event_id}:settlement`,
        p_event_type: 'refund_settlement',
        p_payment_status: 'succeeded',
        p_payment_method: method,
      });
      if (settlementError) throw settlementError;
    }

    const { error: applyError } = await db().rpc('apply_payment_state', {
      p_order_id: orderId,
      p_event_id: event.event_id,
      p_event_type: event.event_type,
      p_payment_status: paymentStatus(event.event_type, intent.status),
      p_payment_method: method,
    });
    if (applyError) throw applyError;

    const processedEvent = {
      order_id: orderId,
      processing_status: 'processed',
      processed_at: new Date().toISOString(),
      error_summary: null,
    };
    let { error: processedError } = await db().from('stripe_events').update(processedEvent).eq('event_id', event.event_id);
    if (isMissingStripeEventOrderId(processedError)) {
      const legacyProcessedEvent = {
        processing_status: processedEvent.processing_status,
        processed_at: processedEvent.processed_at,
        error_summary: processedEvent.error_summary,
      };
      ({ error: processedError } = await db().from('stripe_events').update(legacyProcessedEvent).eq('event_id', event.event_id));
    }
    if (processedError) throw processedError;
    logger.info('stripe_event_processed', { eventId, orderId, paymentIntentId: intent.id });
    return orderResult(orderId);
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    await db().from('stripe_events').update({ processing_status: 'failed', error_summary: message.slice(0, 500) }).eq('event_id', eventId);
    logger.error('stripe_event_failed', { eventId, paymentIntentId: event.object_id, attempt, error: message });
    throw cause;
  }
}

function reconciliationEventType(status: string) {
  if (status === 'succeeded') return 'payment_intent.succeeded';
  if (status === 'canceled') return 'payment_intent.canceled';
  return `reconcile.${status}`;
}

async function persistIntentState(intent: Stripe.PaymentIntent, prefix: string) {
  const orderId = intent.metadata.orderId;
  if (!orderId) throw new AppError(409, 'PAYMENT_ORDER_MISMATCH', 'O pagamento não está associado a um pedido.');
  const eventType = reconciliationEventType(intent.status);
  const eventId = `${prefix}:${intent.id}:${intent.status}:${intent.created}`;
  await persistPaymentEvent({ eventId, eventType, objectId: intent.id, orderId });
  return eventId;
}

export async function prepareOrderPaymentReconciliation(orderId: string, userId: string) {
  const { data: order, error } = await db().from('orders')
    .select('id,stripe_checkout_session_id,stripe_payment_intent_id,payment_status')
    .eq('id', orderId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw new AppError(500, 'ORDER_READ_FAILED', 'Não foi possível consultar o pedido.');
  if (!order) throw new AppError(404, 'ORDER_NOT_FOUND', 'Pedido não encontrado.');
  if (['succeeded', 'failed', 'canceled', 'refunded'].includes(order.payment_status)) return null;

  const intent = order.stripe_checkout_session_id
    ? (await retrieveCheckoutSessionIntent(order.stripe_checkout_session_id, orderId)).intent
    : order.stripe_payment_intent_id
      ? await stripe().paymentIntents.retrieve(order.stripe_payment_intent_id)
      : null;
  if (!intent) return null;
  if (intent.metadata.orderId !== orderId) throw new AppError(409, 'PAYMENT_ORDER_MISMATCH', 'O pagamento não pertence a este pedido.');
  await associatePaymentIntent(orderId, intent.id);
  return persistIntentState(intent, 'on-demand-reconcile');
}

export async function expireOrderReservation(orderId: string): Promise<PaymentResult> {
  const { data: reservation, error } = await db().from('inventory_reservations')
    .select('expires_at')
    .eq('order_id', orderId)
    .eq('status', 'reserved')
    .order('expires_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw new AppError(500, 'RESERVATION_READ_FAILED', 'Não foi possível consultar a reserva.');
  if (!reservation) return orderResult(orderId);
  if (Date.parse(reservation.expires_at) > Date.now()) return orderResult(orderId);

  const { data: order, error: orderError } = await db().from('orders')
    .select('id,stripe_checkout_session_id,stripe_payment_intent_id')
    .eq('id', orderId)
    .maybeSingle();
  if (orderError || !order) throw new AppError(500, 'ORDER_READ_FAILED', 'Não foi possível consultar o pedido reservado.');

  let intent: Stripe.PaymentIntent | null = null;
  if (order.stripe_checkout_session_id) {
    let sessionState = await retrieveCheckoutSessionIntent(order.stripe_checkout_session_id, orderId);
    if (sessionState.session.status === 'open') {
      try {
        const expired = await stripe().checkout.sessions.expire(sessionState.session.id);
        sessionState = { session: expired, intent: await paymentIntentFromSession(expired) };
      } catch {
        sessionState = await retrieveCheckoutSessionIntent(order.stripe_checkout_session_id, orderId);
        if (sessionState.session.status === 'open') throw new Error(`Checkout Session ${sessionState.session.id} não pôde ser encerrada`);
      }
    }
    intent = sessionState.intent;
  } else if (order.stripe_payment_intent_id) {
    intent = await stripe().paymentIntents.retrieve(order.stripe_payment_intent_id);
  }

  if (!intent) {
    const { error: releaseError } = await db().rpc('release_order_reservation', { p_order_id: orderId, p_reason: 'expired' });
    if (releaseError) throw releaseError;
    return orderResult(orderId);
  }

  if (intent.metadata.orderId !== orderId) throw new AppError(409, 'PAYMENT_ORDER_MISMATCH', 'O pagamento não pertence à reserva.');
  await associatePaymentIntent(orderId, intent.id);
  if (!['succeeded', 'canceled'].includes(intent.status)) {
    try {
      intent = await stripe().paymentIntents.cancel(intent.id);
    } catch {
      intent = await stripe().paymentIntents.retrieve(intent.id);
      if (!['succeeded', 'canceled'].includes(intent.status)) throw new Error(`PaymentIntent ${intent.id} não pôde ser encerrado`);
    }
  }

  const eventId = await persistIntentState(intent, 'reservation-expiry');
  return processPaymentEvent(eventId);
}
