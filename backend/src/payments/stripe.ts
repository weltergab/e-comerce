import Stripe from 'stripe';
import { getEnv } from '../config/env';

let client: Stripe | null = null;

export function stripe() {
  if (!client) {
    client = new Stripe(getEnv().stripeSecretKey, { apiVersion: '2025-10-29.clover' });
  }
  return client;
}
