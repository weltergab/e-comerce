-- Esquema autoritativo Storecy (D25-C): executar manualmente no SQL Editor do Supabase.
-- O script é reexecutável. Faça backup antes da primeira execução em um banco existente.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email varchar(255) UNIQUE NOT NULL,
  username varchar(50) UNIQUE NOT NULL,
  password_hash text NOT NULL,
  is_admin boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Preserva a tabela antiga sem mantê-la no fluxo da aplicação.
DO $$
BEGIN
  IF to_regclass('public.transactions') IS NOT NULL
     AND to_regclass('public.transactions_legacy') IS NULL THEN
    ALTER TABLE public.transactions RENAME TO transactions_legacy;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.products (
  id text PRIMARY KEY,
  name varchar(160) NOT NULL,
  description text NOT NULL DEFAULT '',
  price numeric(12,2) NOT NULL CHECK (price > 0),
  currency varchar(3) NOT NULL DEFAULT 'brl' CHECK (currency = lower(currency)),
  category varchar(80) NOT NULL DEFAULT 'Geral',
  images jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(images) = 'array'),
  active boolean NOT NULL DEFAULT true,
  stripe_product_id text UNIQUE NOT NULL,
  stripe_price_id text UNIQUE NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.inventory (
  product_id text PRIMARY KEY REFERENCES public.products(id) ON DELETE RESTRICT,
  on_hand integer NOT NULL DEFAULT 0 CHECK (on_hand >= 0),
  reserved integer NOT NULL DEFAULT 0 CHECK (reserved >= 0 AND reserved <= on_hand),
  version integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  user_email varchar(255) NOT NULL,
  user_name varchar(255) NOT NULL,
  order_status varchar(40) NOT NULL DEFAULT 'pending_payment',
  payment_status varchar(40) NOT NULL DEFAULT 'requires_payment_method',
  payment_method varchar(40),
  amount numeric(12,2) NOT NULL CHECK (amount >= 0),
  currency varchar(3) NOT NULL DEFAULT 'brl',
  stripe_payment_intent_id text UNIQUE,
  idempotency_key text NOT NULL,
  shipping_address jsonb NOT NULL,
  tracking_code text,
  shipped_at timestamptz,
  delivered_at timestamptz,
  admin_notes text,
  admin_notes_updated_at timestamptz,
  admin_notes_updated_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, idempotency_key)
);
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS tracking_code text,
  ADD COLUMN IF NOT EXISTS shipped_at timestamptz,
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz;

CREATE TABLE IF NOT EXISTS public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id text NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  product_name varchar(160) NOT NULL,
  unit_price numeric(12,2) NOT NULL CHECK (unit_price > 0),
  currency varchar(3) NOT NULL,
  quantity integer NOT NULL CHECK (quantity BETWEEN 1 AND 20),
  image_url text,
  UNIQUE (order_id, product_id)
);

CREATE TABLE IF NOT EXISTS public.inventory_reservations (
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id text NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  quantity integer NOT NULL CHECK (quantity > 0),
  status varchar(24) NOT NULL DEFAULT 'reserved' CHECK (status IN ('reserved', 'sold', 'released', 'expired')),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (order_id, product_id)
);

CREATE TABLE IF NOT EXISTS public.inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id text NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  order_id uuid REFERENCES public.orders(id) ON DELETE RESTRICT,
  movement_type varchar(32) NOT NULL CHECK (movement_type IN ('reserve', 'sale', 'release', 'admin_adjustment', 'manual_return')),
  quantity integer NOT NULL CHECK (quantity <> 0),
  actor_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  reason text,
  idempotency_key text UNIQUE NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.stripe_events (
  event_id text PRIMARY KEY,
  event_type text NOT NULL,
  object_id text NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  processing_status varchar(20) NOT NULL DEFAULT 'received' CHECK (processing_status IN ('received', 'processing', 'processed', 'failed')),
  processed_at timestamptz,
  error_summary text,
  attempt_count integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.refresh_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token_hash text UNIQUE NOT NULL,
  family_id uuid NOT NULL,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token_hash text UNIQUE NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.email_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  template varchar(80) NOT NULL,
  recipient varchar(255) NOT NULL,
  recipient_name varchar(255),
  status varchar(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  attempt_count integer NOT NULL DEFAULT 0,
  provider_message_id text,
  error_summary text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id, template)
);

CREATE TABLE IF NOT EXISTS public.product_images (
  storage_path text PRIMARY KEY,
  public_url text UNIQUE NOT NULL,
  product_id text REFERENCES public.products(id) ON DELETE SET NULL,
  uploaded_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  status varchar(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'attached')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.parameters (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_active_id ON public.products(active, id);
CREATE INDEX IF NOT EXISTS idx_orders_user_created ON public.orders(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status_created ON public.orders(payment_status, created_at);
CREATE INDEX IF NOT EXISTS idx_reservations_expiry ON public.inventory_reservations(expires_at) WHERE status = 'reserved';
CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_order_movement
  ON public.inventory_movements(order_id, product_id, movement_type)
  WHERE order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_events_queue ON public.stripe_events(processing_status, received_at);
CREATE INDEX IF NOT EXISTS idx_refresh_family ON public.refresh_tokens(family_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_expiry ON public.password_reset_tokens(expires_at) WHERE used_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_email_queue ON public.email_notifications(status, created_at);
CREATE INDEX IF NOT EXISTS idx_product_images_cleanup ON public.product_images(status, created_at);

DROP TRIGGER IF EXISTS users_updated_at ON public.users;
CREATE TRIGGER users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS products_updated_at ON public.products;
CREATE TRIGGER products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS orders_updated_at ON public.orders;
CREATE TRIGGER orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS reservations_updated_at ON public.inventory_reservations;
CREATE TRIGGER reservations_updated_at BEFORE UPDATE ON public.inventory_reservations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS parameters_updated_at ON public.parameters;
CREATE TRIGGER parameters_updated_at BEFORE UPDATE ON public.parameters FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.create_checkout_order(
  p_order_id uuid,
  p_user_id uuid,
  p_user_email text,
  p_user_name text,
  p_idempotency_key text,
  p_items jsonb,
  p_amount numeric,
  p_currency text,
  p_shipping_address jsonb,
  p_expires_at timestamptz
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_item jsonb;
  v_product_id text;
  v_quantity integer;
  v_available integer;
  v_existing uuid;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text || ':' || p_idempotency_key, 0));
  SELECT id INTO v_existing FROM public.orders WHERE user_id = p_user_id AND idempotency_key = p_idempotency_key;
  IF v_existing IS NOT NULL THEN RETURN v_existing; END IF;

  INSERT INTO public.orders (id, user_id, user_email, user_name, amount, currency, idempotency_key, shipping_address)
  VALUES (p_order_id, p_user_id, p_user_email, p_user_name, p_amount, p_currency, p_idempotency_key, p_shipping_address);

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) ORDER BY value->>'productId'
  LOOP
    v_product_id := v_item->>'productId';
    v_quantity := (v_item->>'quantity')::integer;
    SELECT on_hand - reserved INTO v_available FROM public.inventory WHERE product_id = v_product_id FOR UPDATE;
    IF v_available IS NULL OR v_available < v_quantity THEN RAISE EXCEPTION 'INSUFFICIENT_STOCK:%', v_product_id; END IF;

    INSERT INTO public.order_items (order_id, product_id, product_name, unit_price, currency, quantity, image_url)
    VALUES (p_order_id, v_product_id, v_item->>'name', (v_item->>'unitPrice')::numeric, v_item->>'currency', v_quantity, nullif(v_item->>'image', ''));
    UPDATE public.inventory SET reserved = reserved + v_quantity, version = version + 1, updated_at = now() WHERE product_id = v_product_id;
    INSERT INTO public.inventory_reservations (order_id, product_id, quantity, expires_at) VALUES (p_order_id, v_product_id, v_quantity, p_expires_at);
    INSERT INTO public.inventory_movements (product_id, order_id, movement_type, quantity, reason, idempotency_key)
    VALUES (v_product_id, p_order_id, 'reserve', -v_quantity, 'checkout_started', p_order_id || ':' || v_product_id || ':reserve');
  END LOOP;
  RETURN p_order_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.release_order_reservation(p_order_id uuid, p_reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_res record;
BEGIN
  FOR v_res IN SELECT * FROM public.inventory_reservations WHERE order_id = p_order_id AND status = 'reserved' ORDER BY product_id FOR UPDATE
  LOOP
    UPDATE public.inventory SET reserved = reserved - v_res.quantity, version = version + 1, updated_at = now() WHERE product_id = v_res.product_id;
    UPDATE public.inventory_reservations SET status = CASE WHEN p_reason = 'expired' THEN 'expired' ELSE 'released' END WHERE order_id = p_order_id AND product_id = v_res.product_id;
    INSERT INTO public.inventory_movements (product_id, order_id, movement_type, quantity, reason, idempotency_key)
    VALUES (v_res.product_id, p_order_id, 'release', v_res.quantity, p_reason, p_order_id || ':' || v_res.product_id || ':release')
    ON CONFLICT (idempotency_key) DO NOTHING;
  END LOOP;
  UPDATE public.orders SET
    order_status = 'canceled',
    payment_status = CASE WHEN p_reason = 'payment_creation_failed' THEN 'failed' WHEN p_reason = 'expired' THEN 'canceled' ELSE payment_status END
  WHERE id = p_order_id AND payment_status <> 'succeeded';
END;
$$;

CREATE OR REPLACE FUNCTION public.release_expired_reservations()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_order uuid; v_count integer := 0;
BEGIN
  FOR v_order IN SELECT DISTINCT order_id FROM public.inventory_reservations WHERE status = 'reserved' AND expires_at < now()
  LOOP
    PERFORM public.release_order_reservation(v_order, 'expired');
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_payment_state(
  p_order_id uuid,
  p_event_id text,
  p_event_type text,
  p_payment_status text,
  p_payment_method text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_order public.orders%ROWTYPE; v_res record; v_reservation_count integer; v_current_rank integer; v_next_rank integer;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ORDER_NOT_FOUND'; END IF;

  -- Sucesso e reembolso são estados terminais; eventos atrasados nunca os rebaixam.
  IF v_order.payment_status = 'refunded' THEN RETURN; END IF;
  IF v_order.payment_status = 'succeeded' AND p_payment_status NOT IN ('succeeded', 'refunded') THEN RETURN; END IF;
  v_current_rank := CASE v_order.payment_status WHEN 'requires_payment_method' THEN 10 WHEN 'requires_confirmation' THEN 20 WHEN 'requires_action' THEN 30 WHEN 'processing' THEN 40 ELSE 0 END;
  v_next_rank := CASE p_payment_status WHEN 'requires_payment_method' THEN 10 WHEN 'requires_confirmation' THEN 20 WHEN 'requires_action' THEN 30 WHEN 'processing' THEN 40 ELSE 0 END;
  IF v_next_rank > 0 AND v_next_rank < v_current_rank THEN RETURN; END IF;

  IF p_payment_status = 'succeeded' AND v_order.payment_status <> 'succeeded' THEN
    SELECT count(*) INTO v_reservation_count FROM public.inventory_reservations WHERE order_id = p_order_id AND status = 'reserved';
    IF v_reservation_count = 0 THEN RAISE EXCEPTION 'RESERVATION_NOT_ACTIVE'; END IF;
    FOR v_res IN SELECT * FROM public.inventory_reservations WHERE order_id = p_order_id AND status = 'reserved' ORDER BY product_id FOR UPDATE
    LOOP
      UPDATE public.inventory SET on_hand = on_hand - v_res.quantity, reserved = reserved - v_res.quantity, version = version + 1, updated_at = now()
      WHERE product_id = v_res.product_id AND on_hand >= v_res.quantity AND reserved >= v_res.quantity;
      IF NOT FOUND THEN RAISE EXCEPTION 'INVALID_INVENTORY_STATE:%', v_res.product_id; END IF;
      UPDATE public.inventory_reservations SET status = 'sold' WHERE order_id = p_order_id AND product_id = v_res.product_id;
      INSERT INTO public.inventory_movements (product_id, order_id, movement_type, quantity, reason, idempotency_key)
      VALUES (v_res.product_id, p_order_id, 'sale', -v_res.quantity, p_event_type, p_order_id || ':' || v_res.product_id || ':sale')
      ON CONFLICT (idempotency_key) DO NOTHING;
    END LOOP;
    UPDATE public.orders SET payment_status = 'succeeded', order_status = 'paid', payment_method = p_payment_method WHERE id = p_order_id;
    INSERT INTO public.email_notifications (order_id, template, recipient, recipient_name)
    VALUES (p_order_id, 'order_paid', v_order.user_email, v_order.user_name) ON CONFLICT (order_id, template) DO NOTHING;
  ELSIF p_payment_status IN ('failed', 'canceled') THEN
    PERFORM public.release_order_reservation(p_order_id, p_payment_status);
    UPDATE public.orders SET payment_status = p_payment_status, order_status = 'canceled', payment_method = coalesce(p_payment_method, payment_method) WHERE id = p_order_id;
  ELSIF p_payment_status = 'refunded' THEN
    -- D20-C: reembolso não altera estoque; a devolução física exige movimento manual.
    UPDATE public.orders SET payment_status = 'refunded', order_status = 'refunded' WHERE id = p_order_id;
  ELSE
    UPDATE public.orders SET payment_status = p_payment_status, payment_method = coalesce(p_payment_method, payment_method) WHERE id = p_order_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_adjust_inventory(p_product_id text, p_delta integer, p_actor_id uuid, p_idempotency_key text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  UPDATE public.inventory SET on_hand = on_hand + p_delta, version = version + 1, updated_at = now()
  WHERE product_id = p_product_id AND on_hand + p_delta >= reserved AND on_hand + p_delta >= 0;
  IF NOT FOUND THEN RAISE EXCEPTION 'INVALID_STOCK_ADJUSTMENT'; END IF;
  INSERT INTO public.inventory_movements (product_id, movement_type, quantity, actor_id, reason, idempotency_key)
  VALUES (p_product_id, 'admin_adjustment', p_delta, p_actor_id, 'admin', p_idempotency_key);
END;
$$;

CREATE OR REPLACE FUNCTION public.manual_return_inventory(
  p_order_id uuid,
  p_product_id text,
  p_quantity integer,
  p_actor_id uuid,
  p_reason text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_purchased integer;
BEGIN
  SELECT quantity INTO v_purchased FROM public.order_items WHERE order_id = p_order_id AND product_id = p_product_id;
  IF v_purchased IS NULL OR p_quantity < 1 OR p_quantity > v_purchased THEN RAISE EXCEPTION 'INVALID_RETURN_QUANTITY'; END IF;
  UPDATE public.inventory SET on_hand = on_hand + p_quantity, version = version + 1, updated_at = now() WHERE product_id = p_product_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'INVENTORY_NOT_FOUND'; END IF;
  INSERT INTO public.inventory_movements (product_id, order_id, movement_type, quantity, actor_id, reason, idempotency_key)
  VALUES (p_product_id, p_order_id, 'manual_return', p_quantity, p_actor_id, p_reason, p_order_id || ':' || p_product_id || ':manual_return');
END;
$$;

CREATE OR REPLACE FUNCTION public.update_order_fulfillment(
  p_order_id uuid,
  p_next_status text,
  p_tracking_code text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_current text; v_payment text;
BEGIN
  SELECT order_status, payment_status INTO v_current, v_payment FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ORDER_NOT_FOUND'; END IF;
  IF v_payment NOT IN ('succeeded', 'refunded') THEN RAISE EXCEPTION 'ORDER_NOT_PAID'; END IF;
  IF NOT (
    (v_current = 'paid' AND p_next_status = 'packing') OR
    (v_current = 'packing' AND p_next_status = 'shipped') OR
    (v_current = 'shipped' AND p_next_status = 'delivered')
  ) THEN RAISE EXCEPTION 'INVALID_FULFILLMENT_TRANSITION'; END IF;
  IF p_next_status IN ('shipped', 'delivered') AND coalesce(trim(p_tracking_code), '') = '' THEN RAISE EXCEPTION 'TRACKING_REQUIRED'; END IF;
  UPDATE public.orders SET
    order_status = p_next_status,
    tracking_code = coalesce(nullif(trim(p_tracking_code), ''), tracking_code),
    shipped_at = CASE WHEN p_next_status = 'shipped' THEN now() ELSE shipped_at END,
    delivered_at = CASE WHEN p_next_status = 'delivered' THEN now() ELSE delivered_at END
  WHERE id = p_order_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.redact_old_order_pii(p_retention_days integer)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_count integer;
BEGIN
  WITH redacted AS (
    UPDATE public.orders SET
      user_id = NULL,
      user_email = 'redacted@invalid',
      user_name = 'Redigido',
      shipping_address = '{"redacted":true}'::jsonb,
      tracking_code = NULL,
      admin_notes = NULL,
      admin_notes_updated_at = NULL,
      admin_notes_updated_by = NULL
    WHERE order_status IN ('delivered', 'canceled', 'refunded')
      AND updated_at < now() - make_interval(days => p_retention_days)
      AND shipping_address <> '{"redacted":true}'::jsonb
    RETURNING id
  )
  SELECT count(*) INTO v_count FROM redacted;
  UPDATE public.email_notifications SET recipient = 'redacted@invalid', recipient_name = 'Redigido', error_summary = NULL
  WHERE order_id IN (SELECT id FROM public.orders WHERE shipping_address = '{"redacted":true}'::jsonb);
  DELETE FROM public.password_reset_tokens WHERE expires_at < now() - interval '7 days';
  DELETE FROM public.refresh_tokens WHERE expires_at < now() - interval '30 days' OR revoked_at < now() - interval '30 days';
  RETURN v_count;
END;
$$;

INSERT INTO public.parameters (key, value, description) VALUES (
  'introduction_header',
  '{"miniText":"Abacate Shop","title":"Produtos escolhidos para simplificar sua rotina","subtitle":"Tecnologia, praticidade e compra segura em um só lugar.","description":"Encontre itens selecionados com pagamento integrado, estoque atualizado e uma experiência direta para comprar sem complicação."}'::jsonb,
  'Homepage introduction header phrases'
) ON CONFLICT (key) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('product-images', 'product-images', true, 2097152, ARRAY['image/webp'])
ON CONFLICT (id) DO UPDATE SET public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

DROP POLICY IF EXISTS "Public can read product images" ON storage.objects;
CREATE POLICY "Public can read product images" ON storage.objects FOR SELECT USING (bucket_id = 'product-images');

-- D06-A: nenhuma tabela privada é acessível pelos papéis públicos; toda leitura/escrita passa pelo backend.
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_reservations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_events DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.refresh_tokens DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_reset_tokens DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.parameters DISABLE ROW LEVEL SECURITY;

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_checkout_order(uuid,uuid,text,text,text,jsonb,numeric,text,jsonb,timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.release_order_reservation(uuid,text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.release_expired_reservations() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.apply_payment_state(uuid,text,text,text,text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_adjust_inventory(text,integer,uuid,text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.manual_return_inventory(uuid,text,integer,uuid,text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_order_fulfillment(uuid,text,text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.redact_old_order_pii(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_checkout_order(uuid,uuid,text,text,text,jsonb,numeric,text,jsonb,timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_order_reservation(uuid,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_expired_reservations() TO service_role;
GRANT EXECUTE ON FUNCTION public.apply_payment_state(uuid,text,text,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_adjust_inventory(text,integer,uuid,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.manual_return_inventory(uuid,text,integer,uuid,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.update_order_fulfillment(uuid,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.redact_old_order_pii(integer) TO service_role;
