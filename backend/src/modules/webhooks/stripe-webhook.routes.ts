import { Router, raw } from 'express';
import type Stripe from 'stripe';
import { enqueueDeferredTask, enqueueTask } from '../../background/queue';
import { getEnv } from '../../config/env';
import { stripe } from '../../payments/stripe';
import { AppError } from '../../shared/errors';
import { asyncHandler } from '../../shared/http';
import { persistPaymentEvent, supportedPaymentEvents } from '../payments/payment-events.service';

export const stripeWebhookRoutes = Router();

stripeWebhookRoutes.post('/', raw({ type: 'application/json', limit: '256kb' }), asyncHandler(async (req, res) => {
  const signature = req.header('stripe-signature');
  if (!signature) throw new AppError(400, 'MISSING_STRIPE_SIGNATURE', 'Assinatura ausente.');

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(req.body, signature, getEnv().stripeWebhookSecret);
  } catch {
    throw new AppError(400, 'INVALID_STRIPE_SIGNATURE', 'Assinatura inválida.');
  }

  if (event.type === 'checkout.session.expired') {
    const session = event.data.object as Stripe.Checkout.Session;
    const orderId = session.metadata?.orderId || session.client_reference_id;
    if (!orderId) throw new AppError(400, 'INVALID_STRIPE_EVENT', 'Sessão sem pedido associado.');
    await enqueueDeferredTask({ type: 'reservation-expiry', orderId }, new Date().toISOString());
    res.status(202).json({ received: true });
    return;
  }

  if (!supportedPaymentEvents.has(event.type)) {
    res.status(200).json({ received: true, ignored: true });
    return;
  }

  const object = event.data.object as unknown as { id: string; payment_intent?: string | { id: string } | null; metadata?: Record<string, string>; client_reference_id?: string | null };
  const isCheckoutSession = event.type.startsWith('checkout.session.');
  const objectId = event.type === 'charge.refunded' || isCheckoutSession
    ? (typeof object.payment_intent === 'string' ? object.payment_intent : object.payment_intent?.id)
    : object.id;
  if (!objectId) throw new AppError(400, 'INVALID_STRIPE_EVENT', 'Evento sem PaymentIntent.');

  const orderId = event.type === 'charge.refunded'
    ? undefined
    : isCheckoutSession
      ? object.metadata?.orderId || object.client_reference_id || undefined
      : (event.data.object as Stripe.PaymentIntent).metadata.orderId;
  await persistPaymentEvent({ eventId: event.id, eventType: event.type, objectId, orderId });
  await enqueueTask({ type: 'payment-event', eventId: event.id });
  res.status(202).json({ received: true });
}));
