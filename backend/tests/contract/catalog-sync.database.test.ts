import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

const actor = '11111111-1111-4111-8111-111111111111';
const operation = '22222222-2222-4222-8222-222222222222';
const payload = { stripe_product_id: 'prod_1', stripe_price_id: 'price_new', name: 'Produto Stripe', description: 'Descrição', category: 'Geral', images: [], active: true, price: 15, currency: 'brl', stock: 2 };
let database: PGlite;

async function sync(action: string, product = payload) {
  return database.query<{ result: { status: string; productId: string } }>('SELECT public.sync_stripe_catalog_product($1::jsonb, $2, $3::uuid, $4::uuid) AS result', [JSON.stringify(product), action, actor, operation]);
}

beforeAll(async () => {
  database = new PGlite();
  await database.exec('CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;');
  // Usa as definições reais do schema autoritativo; nenhum serviço remoto é acessado.
  const schema = readFileSync(resolve('database/create-database.sql'), 'utf8');
  for (const table of ['users', 'products', 'inventory', 'inventory_movements']) {
    const definition = schema.match(new RegExp(`CREATE TABLE IF NOT EXISTS public\\.${table} \\([\\s\\S]*?\\n\\);`))?.[0];
    if (!definition) throw new Error(`Definição ausente: ${table}`);
    if (table === 'inventory_movements') await database.exec('CREATE TABLE public.orders(id uuid PRIMARY KEY);');
    await database.exec(definition);
  }
  await database.exec(readFileSync(resolve('database/20261002_catalog_sync.sql'), 'utf8'));
}, 30_000);

beforeEach(async () => {
  await database.exec('TRUNCATE public.inventory_movements, public.inventory, public.products, public.catalog_sync_logs, public.users CASCADE;');
  await database.query('INSERT INTO public.users(id,email,username,password_hash) VALUES ($1,$2,$3,$4)', [actor, 'admin@example.com', 'admin', 'hash']);
});

afterAll(async () => { await database?.close(); });

async function seed() {
  await database.exec("INSERT INTO public.products(id,name,price,stripe_product_id,stripe_price_id) VALUES ('local_1','Nome local',20,'prod_1','price_old'); INSERT INTO public.inventory(product_id,on_hand,reserved) VALUES ('local_1',10,4);");
}

describe('RPC de sincronização no PostgreSQL isolado', () => {
  it('permite reaplicar a migration sem apagar produtos existentes', async () => {
    await seed();
    await database.exec(readFileSync(resolve('database/20261002_catalog_sync.sql'), 'utf8'));
    expect((await database.query('SELECT id FROM public.products')).rows).toEqual([{ id: 'local_1' }]);
  });

  it('importa produto, preço, estoque e movimento atomicamente e repetições não duplicam', async () => {
    expect((await sync('import')).rows[0].result).toMatchObject({ status: 'success', productId: 'prod_1' });
    expect((await database.query('SELECT on_hand,reserved FROM public.inventory')).rows).toEqual([{ on_hand: 2, reserved: 0 }]);
    expect((await database.query('SELECT quantity,actor_id FROM public.inventory_movements')).rows).toEqual([{ quantity: 2, actor_id: actor }]);
    expect((await sync('import')).rows[0].result.status).toBe('skipped');
    expect((await database.query('SELECT count(*)::int AS count FROM public.products')).rows[0]).toEqual({ count: 1 });
    expect((await database.query('SELECT count(*)::int AS count FROM public.inventory_movements')).rows[0]).toEqual({ count: 1 });
  });

  it('define saldo disponível sem apagar reservas, altera só estoque e usa o vínculo Stripe', async () => {
    await seed(); await sync('stock');
    expect((await database.query('SELECT on_hand,reserved FROM public.inventory')).rows[0]).toEqual({ on_hand: 6, reserved: 4 });
    expect((await database.query('SELECT id,name,price,stripe_price_id FROM public.products')).rows[0]).toEqual({ id: 'local_1', name: 'Nome local', price: '20.00', stripe_price_id: 'price_old' });
    expect((await database.query('SELECT quantity FROM public.inventory_movements')).rows[0]).toEqual({ quantity: -4 });
  });

  it('aceita zero disponível com reservas e não cria movimentos de quantidade zero', async () => {
    await seed(); await sync('stock', { ...payload, stock: 0 });
    expect((await database.query('SELECT on_hand,reserved FROM public.inventory')).rows[0]).toEqual({ on_hand: 4, reserved: 4 });
    await sync('stock', { ...payload, stock: 0 });
    expect((await database.query('SELECT count(*)::int AS count FROM public.inventory_movements')).rows[0]).toEqual({ count: 1 });
  });

  it('atualiza somente valor e Price sem exigir estoque', async () => {
    await seed(); await sync('price', { ...payload, stock: null as unknown as number });
    expect((await database.query('SELECT price,stripe_price_id FROM public.products')).rows[0]).toEqual({ price: '15.00', stripe_price_id: 'price_new' });
    expect((await database.query('SELECT on_hand,reserved FROM public.inventory')).rows[0]).toEqual({ on_hand: 10, reserved: 4 });
    expect((await database.query('SELECT count(*)::int AS count FROM public.inventory_movements')).rows[0]).toEqual({ count: 0 });
  });

  it('sincronização completa atualiza detalhes, valor e estoque do mesmo produto', async () => {
    await seed(); await sync('all');
    expect((await database.query('SELECT id,name,price FROM public.products')).rows[0]).toEqual({ id: 'local_1', name: 'Produto Stripe', price: '15.00' });
    expect((await database.query('SELECT on_hand,reserved FROM public.inventory')).rows[0]).toEqual({ on_hand: 6, reserved: 4 });
  });

  it('falha de estoque desfaz também a importação do produto e rejeita atualizações sem destino', async () => {
    await expect(sync('import', { ...payload, stock: -1 })).rejects.toThrow('SYNC_INVALID_STOCK');
    expect((await database.query('SELECT count(*)::int AS count FROM public.products')).rows[0]).toEqual({ count: 0 });
    await expect(sync('stock')).rejects.toThrow('SYNC_TARGET_MISSING');
    await expect(sync('price')).rejects.toThrow('SYNC_TARGET_MISSING');
  });

  it('não permite acesso direto à auditoria/RPC pelos papéis do navegador', async () => {
    for (const role of ['anon', 'authenticated']) {
      expect((await database.query("SELECT has_table_privilege($1,'public.catalog_sync_logs','SELECT') AS logs, has_function_privilege($1,'public.sync_stripe_catalog_product(jsonb,text,uuid,uuid)','EXECUTE') AS rpc", [role])).rows[0]).toEqual({ logs: false, rpc: false });
    }
    expect((await database.query("SELECT has_table_privilege('service_role','public.catalog_sync_logs','SELECT,INSERT,UPDATE') AS logs, has_function_privilege('service_role','public.sync_stripe_catalog_product(jsonb,text,uuid,uuid)','EXECUTE') AS rpc")).rows[0]).toEqual({ logs: true, rpc: true });
  });
});
