import { Router, raw } from 'express';
import type Stripe from 'stripe';
import { getEnv } from '../../config/env';
import { db } from '../../db/client';
import { stripe } from '../../payments/stripe';
import { AppError } from '../../shared/errors';
import { asyncHandler } from '../../shared/http';

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

  const accepted = new Set([
    'payment_intent.created', 'payment_intent.processing', 'payment_intent.succeeded',
    'payment_intent.payment_failed', 'payment_intent.canceled', 'charge.refunded',
  ]);
  if (!accepted.has(event.type)) {
    res.status(200).json({ received: true, ignored: true });
    return;
  }

  const object = event.data.object as unknown as { id: string; payment_intent?: string | { id: string } | null };
  const objectId = event.type === 'charge.refunded'
    ? (typeof object.payment_intent === 'string' ? object.payment_intent : object.payment_intent?.id)
    : object.id;
  if (!objectId) throw new AppError(400, 'INVALID_STRIPE_EVENT', 'Evento sem PaymentIntent.');

  const { error } = await db().from('stripe_events').upsert({
    event_id: event.id,
    event_type: event.type,
    object_id: objectId,
    processing_status: 'received',
  }, { onConflict: 'event_id', ignoreDuplicates: true });
  if (error) throw new AppError(503, 'EVENT_PERSIST_FAILED', 'Evento não persistido; tente novamente.');
  res.status(202).json({ received: true });
}));
