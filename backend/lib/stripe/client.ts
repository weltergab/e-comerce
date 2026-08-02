import '../config/env';
import Stripe from 'stripe';

let cachedStripe: Stripe | null = null;

export function getStripe() {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

  if (!stripeSecretKey) {
    throw new Error('STRIPE_SECRET_KEY precisa estar configurada');
  }

  if (!cachedStripe) {
    cachedStripe = new Stripe(stripeSecretKey, {
      apiVersion: '2025-10-29.clover',
    });
  }

  return cachedStripe;
}

export const stripe = new Proxy({} as Stripe, {
  get(_target, property) {
    return (getStripe() as any)[property];
  },
});
