import { describe, expect, it } from 'vitest';
import type { CheckoutRequest } from '../../../frontend_ecomerce/types';
import { parseCheckout } from '../../src/modules/checkout/checkout.schemas';

describe('contrato manual do checkout', () => {
  it('mantém o DTO do frontend compatível com o parser do backend', () => {
    const request = {
      items: [{ productId: 'prod_contract', quantity: 1 }],
      shippingAddress: {
        recipient: 'Cliente Contrato', street: 'Rua A', number: '1', complement: '',
        neighborhood: 'Centro', city: 'São Paulo', state: 'SP', postalCode: '01001000', country: 'BR',
      },
    } satisfies CheckoutRequest;
    expect(parseCheckout(request)).toEqual(request);
  });
});
