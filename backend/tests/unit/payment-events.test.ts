import { describe, expect, it } from 'vitest';
import { isMissingStripeEventOrderId, paymentStatus } from '../../src/modules/payments/payment-events.service';

describe('paymentStatus', () => {
  it('normaliza eventos terminais sem confiar no status genérico', () => {
    expect(paymentStatus('checkout.session.completed', 'succeeded')).toBe('succeeded');
    expect(paymentStatus('checkout.session.async_payment_succeeded', 'processing')).toBe('succeeded');
    expect(paymentStatus('checkout.session.async_payment_failed', 'requires_payment_method')).toBe('failed');
    expect(paymentStatus('payment_intent.succeeded', 'processing')).toBe('succeeded');
    expect(paymentStatus('payment_intent.payment_failed', 'requires_payment_method')).toBe('failed');
    expect(paymentStatus('payment_intent.canceled', 'canceled')).toBe('canceled');
    expect(paymentStatus('charge.refunded', 'succeeded')).toBe('refunded');
    expect(paymentStatus('reconcile.processing', 'processing')).toBe('processing');
  });
});

describe('isMissingStripeEventOrderId', () => {
  it('reconhece schemas antigos do Postgres e do cache PostgREST', () => {
    expect(isMissingStripeEventOrderId({ code: '42703', message: 'column stripe_events.order_id does not exist' })).toBe(true);
    expect(isMissingStripeEventOrderId({ code: 'PGRST204', message: "Could not find the 'order_id' column of 'stripe_events'" })).toBe(true);
  });

  it('não oculta outros erros de banco', () => {
    expect(isMissingStripeEventOrderId({ code: '23503', message: 'foreign key violation' })).toBe(false);
    expect(isMissingStripeEventOrderId({ code: '42703', message: 'column orders.total does not exist' })).toBe(false);
  });
});
