import { Router, raw } from 'express';
import type Stripe from 'stripe';
import { enqueueTask } from '../../background/queue';
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

  if (!supportedPaymentEvents.has(event.type)) {
    res.status(200).json({ received: true, ignored: true });
    return;
  }

  const object = event.data.object as unknown as { id: string; payment_intent?: string | { id: string } | null };
  const objectId = event.type === 'charge.refunded'
    ? (typeof object.payment_intent === 'string' ? object.payment_intent : object.payment_intent?.id)
    : object.id;
  if (!objectId) throw new AppError(400, 'INVALID_STRIPE_EVENT', 'Evento sem PaymentIntent.');

  const orderId = event.type === 'charge.refunded'
    ? undefined
    : (event.data.object as Stripe.PaymentIntent).metadata.orderId;
  await persistPaymentEvent({ eventId: event.id, eventType: event.type, objectId, orderId });
  await enqueueTask({ type: 'payment-event', eventId: event.id });
  res.status(202).json({ received: true });
}));
