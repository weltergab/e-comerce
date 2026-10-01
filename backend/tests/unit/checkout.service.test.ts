import { describe, expect, it } from 'vitest';
import { AppError } from '../../src/shared/errors';
import {
  assertOrderCanResumeCheckout,
  checkoutRequestMatches,
  resumableCheckoutSessionUrl,
} from '../../src/modules/checkout/checkout.service';

const address = {
  recipient: 'Maria Silva', street: 'Rua das Flores', number: '10', complement: '',
  neighborhood: 'Centro', city: 'São Paulo', state: 'SP', postalCode: '01001000', country: 'BR' as const,
};

function errorCode(action: () => unknown) {
  try {
    action();
    return undefined;
  } catch (cause) {
    return cause instanceof AppError ? cause.code : undefined;
  }
}

describe('proteções de retomada do checkout', () => {
  it('só reaproveita a chave para o mesmo carrinho e endereço', () => {
    const storedItems = [
      { product_id: 'prod_2', quantity: 1 },
      { product_id: 'prod_1', quantity: 2 },
    ];
    expect(checkoutRequestMatches(storedItems, address, [
      { productId: 'prod_1', quantity: 2 },
      { productId: 'prod_2', quantity: 1 },
    ], address)).toBe(true);
    expect(checkoutRequestMatches(storedItems, address, [{ productId: 'prod_1', quantity: 2 }], address)).toBe(false);
    expect(checkoutRequestMatches(storedItems, address, [
      { productId: 'prod_1', quantity: 2 },
      { productId: 'prod_2', quantity: 1 },
    ], { ...address, number: '11' })).toBe(false);
  });

  it('nunca retoma como pagamento uma tentativa já paga ou reembolsada', () => {
    expect(errorCode(() => assertOrderCanResumeCheckout({ order_status: 'paid', payment_status: 'succeeded' }))).toBe('CHECKOUT_ALREADY_COMPLETED');
    expect(errorCode(() => assertOrderCanResumeCheckout({ order_status: 'refunded', payment_status: 'refunded' }))).toBe('CHECKOUT_ALREADY_COMPLETED');
  });

  it('retorna somente uma sessão Stripe aberta e rejeita sessão concluída', () => {
    expect(resumableCheckoutSessionUrl({ status: 'open', url: 'https://checkout.stripe.com/c/pay/cs_test' })).toBe('https://checkout.stripe.com/c/pay/cs_test');
    expect(errorCode(() => resumableCheckoutSessionUrl({ status: 'complete', url: null }))).toBe('CHECKOUT_ALREADY_COMPLETED');
  });
});
