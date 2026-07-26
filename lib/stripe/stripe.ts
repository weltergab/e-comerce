// Stripe client configuration
// Following Stripe's recommended browser pattern

import { loadStripe, Stripe } from '@stripe/stripe-js';

let stripePromise: Promise<Stripe | null>;

export const getStripe = () => {
  if (!stripePromise) {
    stripePromise = loadStripe(
      import.meta.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
        import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
    );
  }
  return stripePromise;
};
