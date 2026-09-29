import { describe, expect, it } from 'vitest';
import { paymentStatus } from '../../src/modules/payments/payment-events.service';

describe('paymentStatus', () => {
  it('normaliza eventos terminais sem confiar no status genérico', () => {
    expect(paymentStatus('payment_intent.succeeded', 'processing')).toBe('succeeded');
    expect(paymentStatus('payment_intent.payment_failed', 'requires_payment_method')).toBe('failed');
    expect(paymentStatus('payment_intent.canceled', 'canceled')).toBe('canceled');
    expect(paymentStatus('charge.refunded', 'succeeded')).toBe('refunded');
    expect(paymentStatus('reconcile.processing', 'processing')).toBe('processing');
  });
});
