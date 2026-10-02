import { describe, expect, it } from 'vitest';
import { assertSyncSource, compareSyncProduct, parseStripeStock, parseSyncInput, type SyncProduct } from '../../src/modules/admin/catalog-sync.schemas';

const product: SyncProduct = {
  id: 'prod_1', stripeProductId: 'prod_1', name: 'Produto', description: '', images: [], category: 'Geral', active: true,
  stock: 6, reserved: 0, price: 10.1, currency: 'brl', priceId: 'price_1', stockIssue: null, priceIssue: null,
};

describe('comparação de catálogo', () => {
  it('compara preço em centavos e estoque disponível e detecta o vínculo de preço', () => {
    const compared = compareSyncProduct(product, { ...product, stock: 2, reserved: 4, price: 10 });
    expect(compared).toMatchObject({ existsInTarget: true, stockDifference: 4, priceDifference: 0.1, stockMismatch: true, priceMismatch: true });
    expect(compareSyncProduct(product, { ...product, priceId: 'price_old' }).priceMismatch).toBe(true);
    expect(compareSyncProduct(product, product)).toMatchObject({ stockMismatch: false, priceMismatch: false });
  });

  it('sinaliza ausência de destino e moedas ou metadados incompatíveis', () => {
    expect(compareSyncProduct(product, null)).toMatchObject({ existsInTarget: false, stockDifference: null, priceDifference: null });
    expect(compareSyncProduct(product, { ...product, currency: 'usd', stock: null })).toMatchObject({ stockMismatch: true, priceMismatch: true, stockDifference: null, priceDifference: null });
  });
});

describe('validação de sincronização', () => {
  it.each([undefined, '', ' ', '-1', '1.5', '10abc', 'Infinity', '1000001'])('não converte estoque ausente ou inválido (%s) em zero', (value) => {
    expect(parseStripeStock(value)).toMatchObject({ stock: null, stockIssue: expect.any(String) });
  });

  it('permite estoque zero e não exige preço para atualizar só estoque', () => {
    expect(parseStripeStock('0')).toEqual({ stock: 0, stockIssue: null });
    expect(parseStripeStock(' 12 ')).toEqual({ stock: 12, stockIssue: null });
    expect(() => assertSyncSource({ ...product, price: null, priceIssue: 'Preço ausente' }, 'stock')).not.toThrow();
    expect(() => assertSyncSource({ ...product, stock: null, stockIssue: 'Estoque ausente' }, 'price')).not.toThrow();
    expect(() => assertSyncSource({ ...product, stock: null }, 'all')).toThrow();
  });

  it('recusa direção, ação, lote e código inválidos', () => {
    const valid = { direction: 'stripe_to_supabase', action: 'stock', productId: 'prod_1' };
    expect(parseSyncInput(valid)).toMatchObject(valid);
    for (const input of [null, [], { ...valid, direction: 'both' }, { ...valid, action: 'delete' }, { ...valid, action: { toString: null } }, { ...valid, productId: '' }, { ...valid, batchId: 'invalid' }]) expect(() => parseSyncInput(input)).toThrow();
  });
});
