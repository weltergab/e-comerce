import { describe, expect, it } from 'vitest';
import { parseCheckout, parseIdempotencyKey } from '../../src/modules/checkout/checkout.schemas';

const address = {
  recipient: 'Maria Silva', street: 'Rua das Flores', number: '10', complement: '',
  neighborhood: 'Centro', city: 'São Paulo', state: 'SP', postalCode: '01001000', country: 'BR',
};

describe('parseCheckout', () => {
  it('aceita apenas intenção de compra e endereço', () => {
    expect(parseCheckout({ items: [{ productId: 'prod_123', quantity: 2 }], shippingAddress: address })).toEqual({
      items: [{ productId: 'prod_123', quantity: 2 }], shippingAddress: address,
    });
  });

  it.each([0, -1, 1.5, 21, '2'])('rejeita quantidade inválida %s', (quantity) => {
    expect(() => parseCheckout({ items: [{ productId: 'prod_123', quantity }], shippingAddress: address })).toThrow(/Quantidade/);
  });

  it('rejeita preço e Stripe Price enviados pelo cliente', () => {
    expect(() => parseCheckout({ items: [{ productId: 'prod_123', quantity: 1, price: 0.01, stripePriceId: 'price_other' }], shippingAddress: address })).toThrow(/campos não permitidos/);
  });

  it('rejeita produtos duplicados', () => {
    expect(() => parseCheckout({ items: [{ productId: 'prod_123', quantity: 1 }, { productId: 'prod_123', quantity: 1 }], shippingAddress: address })).toThrow(/repetidos/);
  });

  it('exige chave de idempotência', () => {
    expect(() => parseIdempotencyKey(undefined)).toThrow(/Idempotency-Key/);
    expect(parseIdempotencyKey('checkout_12345678')).toBe('checkout_12345678');
  });

  it('aceita a seleção de um endereço salvo sem receber outro endereço', () => {
    expect(parseCheckout({
      items: [{ productId: 'prod_123', quantity: 1 }],
      shippingAddressId: 'ca032c70-3ed6-486e-8c4c-055c79a1402a',
    })).toEqual({
      items: [{ productId: 'prod_123', quantity: 1 }],
      shippingAddressId: 'ca032c70-3ed6-486e-8c4c-055c79a1402a',
    });
  });

  it('rejeita endereço salvo e endereço avulso simultâneos', () => {
    expect(() => parseCheckout({
      items: [{ productId: 'prod_123', quantity: 1 }],
      shippingAddressId: 'ca032c70-3ed6-486e-8c4c-055c79a1402a',
      shippingAddress: address,
    })).toThrow(/Selecione um endereço salvo/);
  });
});
