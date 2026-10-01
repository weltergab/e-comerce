import { describe, expect, it } from 'vitest';
import {
  isHostedStripeCheckoutUrl,
  newCheckoutAttemptKey,
} from './attempt';

describe('tentativa de checkout no navegador', () => {
  it('aceita somente a página hospedada oficial do Stripe', () => {
    expect(isHostedStripeCheckoutUrl('https://checkout.stripe.com/c/pay/cs_test')).toBe(true);
    expect(isHostedStripeCheckoutUrl('https://storecy.vercel.app/checkout/success?order_id=old')).toBe(false);
    expect(isHostedStripeCheckoutUrl('https://checkout.stripe.com.evil.example/c/pay')).toBe(false);
  });

  it('gera uma chave diferente para cada decisão de iniciar uma compra', () => {
    const first = newCheckoutAttemptKey();
    const second = newCheckoutAttemptKey();
    expect(first).not.toBe(second);
    expect(first).toMatch(/^[0-9a-f-]{36}$/i);
  });
});
