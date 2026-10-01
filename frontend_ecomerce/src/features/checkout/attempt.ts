export function newCheckoutAttemptKey() {
  return crypto.randomUUID();
}

export function isHostedStripeCheckoutUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname === 'checkout.stripe.com';
  } catch {
    return false;
  }
}
