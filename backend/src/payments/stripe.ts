import Stripe from 'stripe';
import { getEnv } from '../config/env';
import { logger } from '../shared/logger';

let client: Stripe | null = null;
let checkoutMethodsCache: { expiresAt: number; methods: string[] } | null = null;
const CHECKOUT_METHODS_CACHE_MS = 5 * 60_000;

export function stripe() {
  if (!client) {
    client = new Stripe(getEnv().stripeSecretKey, { apiVersion: '2026-08-26.dahlia' });
  }
  return client;
}

interface CheckoutPaymentConfiguration {
  active: boolean;
  is_default: boolean;
  pix?: { available: boolean };
}

export function resolveCheckoutPaymentMethods(configurations: CheckoutPaymentConfiguration[]) {
  const defaultConfiguration = configurations.find((configuration) => configuration.active && configuration.is_default);
  return defaultConfiguration?.pix?.available ? ['card', 'pix'] : ['card'];
}

export async function checkoutPaymentMethods() {
  if (checkoutMethodsCache && checkoutMethodsCache.expiresAt > Date.now()) {
    return [...checkoutMethodsCache.methods];
  }

  let methods = ['card'];
  try {
    const configurations = await stripe().paymentMethodConfigurations.list({ limit: 100 });
    methods = resolveCheckoutPaymentMethods(configurations.data);
  } catch (cause) {
    logger.warn('stripe_payment_methods_lookup_failed', {
      error: cause instanceof Error ? cause.message : String(cause),
      fallback: methods,
    });
  }

  checkoutMethodsCache = { expiresAt: Date.now() + CHECKOUT_METHODS_CACHE_MS, methods };
  return [...methods];
}
