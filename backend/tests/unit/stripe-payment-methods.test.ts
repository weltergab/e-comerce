import { describe, expect, it } from 'vitest';
import { resolveCheckoutPaymentMethods } from '../../src/payments/stripe';

describe('checkout payment methods', () => {
  it('sempre oferece cartão e inclui Pix apenas quando disponível na configuração padrão', () => {
    expect(resolveCheckoutPaymentMethods([])).toEqual(['card']);
    expect(resolveCheckoutPaymentMethods([
      { active: true, is_default: true, pix: { available: false } },
    ])).toEqual(['card']);
    expect(resolveCheckoutPaymentMethods([
      { active: true, is_default: true, pix: { available: true } },
    ])).toEqual(['card', 'pix']);
  });

  it('ignora Pix de configuração inativa ou que não seja a padrão', () => {
    expect(resolveCheckoutPaymentMethods([
      { active: false, is_default: true, pix: { available: true } },
      { active: true, is_default: false, pix: { available: true } },
    ])).toEqual(['card']);
  });
});
