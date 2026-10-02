import { describe, expect, it } from 'vitest';
import { canResumeOrderPayment } from './MyOrders';

describe('retomada de pagamento em meus pedidos', () => {
  it.each(['requires_payment_method', 'requires_action'])('exibe a ação para %s', (status) => {
    expect(canResumeOrderPayment(status)).toBe(true);
  });

  it.each(['processing', 'succeeded', 'failed', 'canceled', 'refunded'])('oculta a ação para %s', (status) => {
    expect(canResumeOrderPayment(status)).toBe(false);
  });
});
