-- Executar no SQL Editor do Supabase antes de usar /admin/sync.
BEGIN;

CREATE TABLE IF NOT EXISTS public.catalog_sync_logs (
  id uuid PRIMARY KEY,
  batch_id uuid,
  actor_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  direction text NOT NULL CHECK (direction IN ('stripe_to_supabase', 'supabase_to_stripe')),
  action text NOT NULL CHECK (action IN ('import', 'stock', 'price', 'all')),
  source_product_id text NOT NULL,
  stripe_product_id text,
  status text NOT NULL CHECK (status IN ('running', 'success', 'skipped', 'error')),
  message text NOT NULL DEFAULT '',
  before_state jsonb,
  after_state jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_catalog_sync_logs_created ON public.catalog_sync_logs(created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_catalog_sync_logs_batch ON public.catalog_sync_logs(batch_id) WHERE batch_id IS NOT NULL;

-- Define saldo disponível dentro do lock: reservas de checkout nunca são zeradas.
-- Produto, estoque e movimento são gravados na mesma transação.
CREATE OR REPLACE FUNCTION public.sync_stripe_catalog_product(
  p_product jsonb, p_action text, p_actor_id uuid, p_operation_id uuid
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_product public.products%ROWTYPE;
  v_inventory public.inventory%ROWTYPE;
  v_code text := p_product->>'stripe_product_id';
  v_created boolean := false;
  v_stock integer;
  v_delta integer;
BEGIN
  IF p_action NOT IN ('import', 'stock', 'price', 'all') OR v_code IS NULL OR v_code = '' THEN
    RAISE EXCEPTION 'INVALID_SYNC_INPUT';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('catalog-sync:' || v_code, 0));
  SELECT * INTO v_product FROM public.products WHERE stripe_product_id = v_code FOR UPDATE;
  IF FOUND AND p_action = 'import' THEN
    RETURN jsonb_build_object('status', 'skipped', 'productId', v_product.id);
  END IF;
  IF v_product.id IS NULL THEN
    IF p_action IN ('stock', 'price') THEN RAISE EXCEPTION 'SYNC_TARGET_MISSING'; END IF;
    INSERT INTO public.products(id, name, description, price, currency, category, images, active, stripe_product_id, stripe_price_id)
    VALUES (v_code, p_product->>'name', coalesce(p_product->>'description', ''), (p_product->>'price')::numeric,
      p_product->>'currency', coalesce(p_product->>'category', 'Geral'), coalesce(p_product->'images', '[]'::jsonb),
      (p_product->>'active')::boolean, v_code, p_product->>'stripe_price_id') RETURNING * INTO v_product;
    v_created := true;
  ELSIF p_action IN ('price', 'all') THEN
    UPDATE public.products SET price = (p_product->>'price')::numeric, currency = p_product->>'currency',
      stripe_price_id = p_product->>'stripe_price_id' WHERE id = v_product.id;
  END IF;
  IF p_action = 'all' AND NOT v_created THEN
    UPDATE public.products SET name = p_product->>'name', description = coalesce(p_product->>'description', ''),
      category = coalesce(p_product->>'category', 'Geral'), images = coalesce(p_product->'images', '[]'::jsonb),
      active = (p_product->>'active')::boolean WHERE id = v_product.id;
  END IF;
  IF p_action IN ('import', 'stock', 'all') THEN
    v_stock := (p_product->>'stock')::integer;
    IF v_stock IS NULL OR v_stock < 0 OR v_stock > 1000000 THEN RAISE EXCEPTION 'SYNC_INVALID_STOCK'; END IF;
    INSERT INTO public.inventory(product_id) VALUES (v_product.id) ON CONFLICT (product_id) DO NOTHING;
    SELECT * INTO v_inventory FROM public.inventory WHERE product_id = v_product.id FOR UPDATE;
    v_delta := v_stock - (v_inventory.on_hand - v_inventory.reserved);
    IF v_delta <> 0 THEN
      UPDATE public.inventory SET on_hand = reserved + v_stock, version = version + 1, updated_at = now() WHERE product_id = v_product.id;
      INSERT INTO public.inventory_movements(product_id, movement_type, quantity, actor_id, reason, idempotency_key)
      VALUES (v_product.id, 'admin_adjustment', v_delta, p_actor_id, 'catalog_sync:stripe_to_supabase', 'catalog-sync:' || p_operation_id);
    END IF;
  END IF;
  RETURN jsonb_build_object('status', 'success', 'productId', v_product.id, 'created', v_created);
END;
$$;

ALTER TABLE public.catalog_sync_logs DISABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.catalog_sync_logs FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.catalog_sync_logs TO service_role;
REVOKE EXECUTE ON FUNCTION public.sync_stripe_catalog_product(jsonb,text,uuid,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_stripe_catalog_product(jsonb,text,uuid,uuid) TO service_role;

COMMIT;
