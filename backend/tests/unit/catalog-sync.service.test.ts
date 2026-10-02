import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn(), retrieve: vi.fn(), list: vi.fn(), create: vi.fn(), update: vi.fn(), priceCreate: vi.fn(), priceRetrieve: vi.fn(), priceUpdate: vi.fn() }));
vi.mock('../../src/db/client', () => ({ db: () => ({ from: mocks.from, rpc: mocks.rpc }) }));
vi.mock('../../src/payments/stripe', () => ({ stripe: () => ({ products: { retrieve: mocks.retrieve, list: mocks.list, create: mocks.create, update: mocks.update }, prices: { create: mocks.priceCreate, retrieve: mocks.priceRetrieve, update: mocks.priceUpdate } }) }));
vi.mock('../../src/shared/logger', () => ({ logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));

import { listSyncProducts, synchronizeProduct } from '../../src/modules/admin/catalog-sync.service';

const actorId = '11111111-1111-4111-8111-111111111111';
const local = () => ({ id: 'local_1', stripe_product_id: 'prod_1', stripe_price_id: 'price_local', name: 'Nome local', description: '', category: 'Geral', images: [], active: true, price: 20, currency: 'brl', inventory: { on_hand: 10, reserved: 4 } });
const remote = () => ({ id: 'prod_1', name: 'Nome remoto', description: '', images: [], active: true, metadata: { stock: '2', category: 'Geral' }, default_price: { id: 'price_remote', unit_amount: 1500, currency: 'brl', type: 'one_time', active: true, billing_scheme: 'per_unit' } });
let rows: ReturnType<typeof local>[];
let remoteProducts: ReturnType<typeof remote>[];
let logs: Record<string, unknown>[];
let auditFails: boolean;

beforeEach(() => {
  vi.clearAllMocks();
  rows = [local()]; remoteProducts = [remote()]; logs = []; auditFails = false;
  mocks.from.mockImplementation((table: string) => {
    let mode = 'read'; let payload: Record<string, unknown>; let limit: number | undefined;
    const predicates: ((row: Record<string, unknown>) => boolean)[] = [];
    const result = () => {
      const values = table === 'products' ? rows : logs;
      const matches = values.filter((row) => predicates.every((filter) => filter(row)));
      if (mode === 'insert') { if (auditFails) return { data: null, error: { code: '42P01' } }; logs.push({ ...payload }); }
      if (mode === 'update') matches.forEach((row) => Object.assign(row, payload));
      return { data: limit === undefined ? matches : matches.slice(0, limit), error: null };
    };
    const query = {
      select: () => query, order: () => query,
      limit: (value: number) => { limit = value; return query; },
      eq: (key: string, value: unknown) => { predicates.push((row) => row[key] === value); return query; },
      gt: (key: string, value: string) => { predicates.push((row) => String(row[key]) > value); return query; },
      insert: (value: Record<string, unknown>) => { mode = 'insert'; payload = value; return query; },
      update: (value: Record<string, unknown>) => { mode = 'update'; payload = value; return query; },
      maybeSingle: async () => { const value = result(); return { ...value, data: value.data?.[0] || null }; },
      then: (resolve: (value: unknown) => unknown) => Promise.resolve(result()).then(resolve),
    };
    return query;
  });
  mocks.list.mockImplementation(() => (async function* () { yield* remoteProducts; })());
  mocks.retrieve.mockImplementation(async (id: string) => {
    const product = remoteProducts.find((item) => item.id === id);
    if (!product) throw Object.assign(new Error('No such product'), { code: 'resource_missing' });
    return product;
  });
  mocks.update.mockImplementation(async (id: string, update: { metadata?: Record<string, string>; default_price?: string }) => {
    const item = remoteProducts.find((product) => product.id === id)!;
    Object.assign(item, { ...update, metadata: { ...item.metadata, ...update.metadata }, default_price: update.default_price ? { ...item.default_price, id: update.default_price, unit_amount: 2000 } : item.default_price });
    return item;
  });
  mocks.create.mockImplementation(async (input: { id: string; metadata: { stock: string; category: string }; default_price_data: { unit_amount: number } }) => {
    const item = { ...remote(), ...input, default_price: { ...remote().default_price, id: 'price_created', unit_amount: input.default_price_data.unit_amount } };
    remoteProducts.push(item);
    return item;
  });
  mocks.priceCreate.mockResolvedValue({ id: 'price_created' });
  mocks.priceRetrieve.mockResolvedValue({ type: 'one_time' });
  mocks.priceUpdate.mockResolvedValue({});
  mocks.rpc.mockImplementation(async (_name: string, args: { p_product: { stock: number; price: number; stripe_price_id: string }; p_action: string }) => {
    if (args.p_action === 'stock') rows[0].inventory.on_hand = rows[0].inventory.reserved + args.p_product.stock;
    if (args.p_action === 'price') { rows[0].price = args.p_product.price; rows[0].stripe_price_id = args.p_product.stripe_price_id; }
    return { data: { status: 'success' }, error: null };
  });
});

describe('sincronização auditada de catálogo', () => {
  it('vincula pelo código Stripe mesmo que o ID local e o nome sejam diferentes', async () => {
    const result = await listSyncProducts('stripe_to_supabase');
    expect(result.products[0]).toMatchObject({ existsInTarget: true, source: { id: 'prod_1' }, target: { id: 'local_1' }, stockDifference: -4, priceDifference: -5 });
  });

  it('busca todas as páginas do Supabase em vez de parar em 500 produtos', async () => {
    rows = Array.from({ length: 1001 }, (_, index) => ({ ...local(), id: `local_${String(index).padStart(4, '0')}`, stripe_product_id: `prod_${index}` }));
    expect((await listSyncProducts('supabase_to_stripe')).products).toHaveLength(1001);
  });

  it('Stripe → Supabase atualiza só estoque pela RPC e registra antes/depois e autor', async () => {
    const result = await synchronizeProduct({ direction: 'stripe_to_supabase', action: 'stock', productId: 'prod_1' }, actorId);
    expect(result.product.target).toMatchObject({ stock: 2, reserved: 4, price: 20 });
    expect(mocks.rpc).toHaveBeenCalledWith('sync_stripe_catalog_product', expect.objectContaining({ p_action: 'stock', p_actor_id: actorId }));
    expect(mocks.update).not.toHaveBeenCalled(); expect(mocks.create).not.toHaveBeenCalled();
    expect(logs[0]).toMatchObject({ actor_id: actorId, status: 'success', before_state: { target: { stock: 6 } }, after_state: { target: { stock: 2 } } });
  });

  it('Supabase → Stripe envia somente estoque e preserva os dados locais', async () => {
    await synchronizeProduct({ direction: 'supabase_to_stripe', action: 'stock', productId: 'local_1' }, actorId);
    expect(mocks.update).toHaveBeenCalledWith('prod_1', { expand: ['default_price'], metadata: { stock: '6' } }, expect.any(Object));
    expect(mocks.priceCreate).not.toHaveBeenCalled(); expect(mocks.rpc).not.toHaveBeenCalled();
    expect(rows[0]).toEqual(local());
  });

  it('cria Price e atualiza o vínculo sem alterar estoque ao enviar só valor', async () => {
    await synchronizeProduct({ direction: 'supabase_to_stripe', action: 'price', productId: 'local_1' }, actorId);
    expect(mocks.priceCreate).toHaveBeenCalledWith({ product: 'prod_1', currency: 'brl', unit_amount: 2000 }, expect.objectContaining({ idempotencyKey: expect.any(String) }));
    expect(mocks.update).toHaveBeenCalledWith('prod_1', { expand: ['default_price'], default_price: 'price_created' }, expect.any(Object));
    expect(rows[0].stripe_price_id).toBe('price_created'); expect(rows[0].inventory).toEqual(local().inventory);
    expect(mocks.priceUpdate).toHaveBeenCalledWith('price_remote', { active: false });
  });

  it('importa produto ausente no Stripe usando exatamente seu código e preço padrão', async () => {
    remoteProducts = [];
    await synchronizeProduct({ direction: 'supabase_to_stripe', action: 'import', productId: 'local_1' }, actorId);
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ id: 'prod_1', metadata: { stock: '6', category: 'Geral' }, default_price_data: { currency: 'brl', unit_amount: 2000 } }), expect.any(Object));
    expect(rows[0].id).toBe('local_1'); expect(rows[0].stripe_product_id).toBe('prod_1');
  });

  it('importar produto já cadastrado é auditado sem sobrescrever o destino', async () => {
    expect((await synchronizeProduct({ direction: 'stripe_to_supabase', action: 'import', productId: 'prod_1' }, actorId)).status).toBe('skipped');
    expect(mocks.rpc).not.toHaveBeenCalled(); expect(logs[0].status).toBe('skipped');
  });

  it('bloqueia estoque ausente e registra a falha, mas permite importar só preço', async () => {
    delete (remoteProducts[0].metadata as { stock?: string }).stock;
    await expect(synchronizeProduct({ direction: 'stripe_to_supabase', action: 'stock', productId: 'prod_1' }, actorId)).rejects.toMatchObject({ code: 'SYNC_INVALID_STOCK' });
    expect(mocks.rpc).not.toHaveBeenCalled(); expect(logs[0].status).toBe('error');
    await synchronizeProduct({ direction: 'stripe_to_supabase', action: 'price', productId: 'prod_1' }, actorId);
    expect(rows[0].price).toBe(15); expect(rows[0].inventory).toEqual(local().inventory);
  });

  it('não escreve se não conseguir salvar auditoria e não trata falha de conexão como produto ausente', async () => {
    auditFails = true;
    await expect(synchronizeProduct({ direction: 'supabase_to_stripe', action: 'all', productId: 'local_1' }, actorId)).rejects.toMatchObject({ code: 'SYNC_AUDIT_UNAVAILABLE' });
    expect(mocks.retrieve).not.toHaveBeenCalled(); expect(mocks.create).not.toHaveBeenCalled();
    auditFails = false; mocks.retrieve.mockRejectedValue(new Error('Connection failed'));
    await expect(synchronizeProduct({ direction: 'supabase_to_stripe', action: 'all', productId: 'local_1' }, actorId)).rejects.toMatchObject({ code: 'SYNC_STRIPE_FAILED' });
    expect(mocks.create).not.toHaveBeenCalled(); expect(logs[0].status).toBe('error');
  });
});
