import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  updateProduct: vi.fn(),
  updateStripe: vi.fn(),
  attachImages: vi.fn(),
}));

vi.mock('../../src/config/env', () => ({
  getEnv: () => ({ supabaseUrl: 'https://store.supabase.co', imageHostAllowlist: [] }),
}));
vi.mock('../../src/db/client', () => ({ db: () => ({ from: mocks.from }) }));
vi.mock('../../src/payments/stripe', () => ({
  stripe: () => ({ products: { update: mocks.updateStripe } }),
}));
vi.mock('../../src/modules/catalog/product-images.service', () => ({
  attachProductImages: mocks.attachImages,
}));

import { parseProductInput } from '../../src/modules/catalog/catalog.schemas';
import { updateProduct } from '../../src/modules/catalog/catalog.service';

const legacyImage = 'https://images.unsplash.com/photo-existing';
const storageImage = 'https://store.supabase.co/storage/v1/object/public/product-images/photo.webp';
const fields = { name: 'Novo nome', description: 'Nova descrição', price: 50, stock: 8 };

function catalogProduct(id: string, images: string[]) {
  const product = {
    id, images, name: 'Nome anterior', description: 'Descrição anterior',
    price: 50, active: true, category: 'Geral', currency: 'brl',
    stripe_product_id: 'prod_stripe', stripe_price_id: 'price_original',
  };
  mocks.updateProduct.mockImplementation((values: Partial<typeof product>) => ({
    eq: async (_column: string, productId: string) => {
      expect(productId).toBe(id);
      Object.assign(product, values);
      return { error: null };
    },
  }));
  mocks.from.mockImplementation((table: string) => {
    if (table === 'products') return {
      select: () => ({
        eq: (_column: string, productId: string) => {
          expect(productId).toBe(id);
          return {
            maybeSingle: async () => ({ data: product, error: null }),
            single: async () => ({ data: product, error: null }),
          };
        },
      }),
      update: mocks.updateProduct,
    };
    if (table === 'inventory') return {
      select: () => ({
        in: async () => ({ data: [{ product_id: id, on_hand: 10, reserved: 2 }], error: null }),
        eq: () => ({ single: async () => ({ data: { on_hand: 10, reserved: 2 }, error: null }) }),
      }),
    };
    throw new Error(`Consulta inesperada a ${table}`);
  });
}

beforeEach(() => vi.clearAllMocks());

describe('edição administrativa de produtos com imagens existentes', () => {
  it.each([
    { id: 'prod_importado', images: [legacyImage, storageImage] },
    { id: 'prod_5', images: [legacyImage] },
  ])('preserva a galeria de $id quando um formulário antigo reenvia as fotos', async ({ id, images }) => {
    catalogProduct(id, images);

    await expect(updateProduct(id, { ...fields, images: [...images] }, 'admin')).resolves.toMatchObject({
      id, name: fields.name, images, stock: fields.stock,
    });
    expect(mocks.updateStripe).toHaveBeenCalledWith('prod_stripe', { name: fields.name, description: fields.description });
    expect(mocks.updateProduct.mock.calls[0][0]).not.toHaveProperty('images');
    expect(mocks.attachImages).not.toHaveBeenCalled();
  });

  it('adiciona uma imagem autorizada mantendo a imagem antiga do mesmo produto', async () => {
    catalogProduct('prod_local', [legacyImage]);
    const images = [legacyImage, storageImage];

    await expect(updateProduct('prod_local', { images }, 'admin')).resolves.toMatchObject({ images });
    expect(mocks.updateStripe).toHaveBeenCalledWith('prod_stripe', { images });
    expect(mocks.attachImages).toHaveBeenCalledWith('prod_local', images, 'admin');
  });

  it('rejeita outra URL do mesmo host antes de alterar o Stripe ou o catálogo', async () => {
    catalogProduct('prod_local', [legacyImage]);

    await expect(updateProduct('prod_local', { images: [legacyImage, 'https://images.unsplash.com/photo-new'] }, 'admin'))
      .rejects.toMatchObject({ status: 400, code: 'INVALID_PRODUCT_IMAGES' });
    expect(mocks.updateStripe).not.toHaveBeenCalled();
    expect(mocks.updateProduct).not.toHaveBeenCalled();
  });

  it('exige que as imagens de um produto novo sejam de origem autorizada', () => {
    expect(() => parseProductInput({ ...fields, images: [legacyImage] })).toThrow(/origem autorizada/);
    expect(parseProductInput({ ...fields, images: [storageImage] }).images).toEqual([storageImage]);
  });

  it('preserva uma galeria legada acima do limite quando ela permanece igual', () => {
    const images = Array.from({ length: 9 }, (_, index) => `${storageImage}?index=${index}`);
    expect(parseProductInput({ name: 'Novo nome', images }, images)).toEqual({ name: 'Novo nome' });
    expect(() => parseProductInput({ images: [...images].reverse() }, images)).toThrow(/até 8 imagens/);
  });
});
