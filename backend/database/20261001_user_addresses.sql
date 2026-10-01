-- Execute no SQL Editor do Supabase antes de publicar o checkout com endereços salvos.
BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS public.user_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  label varchar(80) NOT NULL,
  recipient varchar(160) NOT NULL,
  street varchar(160) NOT NULL,
  number varchar(40) NOT NULL,
  complement varchar(160) NOT NULL DEFAULT '',
  neighborhood varchar(160) NOT NULL,
  city varchar(160) NOT NULL,
  state varchar(2) NOT NULL CHECK (state ~ '^[A-Z]{2}$'),
  postal_code varchar(8) NOT NULL CHECK (postal_code ~ '^\d{8}$'),
  country varchar(2) NOT NULL DEFAULT 'BR' CHECK (country = 'BR'),
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_addresses_user ON public.user_addresses(user_id, created_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_addresses_one_default
  ON public.user_addresses(user_id) WHERE is_default;

DROP TRIGGER IF EXISTS user_addresses_updated_at ON public.user_addresses;
CREATE TRIGGER user_addresses_updated_at
  BEFORE UPDATE ON public.user_addresses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.save_user_address(
  p_user_id uuid,
  p_address_id uuid,
  p_label text,
  p_recipient text,
  p_street text,
  p_number text,
  p_complement text,
  p_neighborhood text,
  p_city text,
  p_state text,
  p_postal_code text,
  p_country text,
  p_is_default boolean
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_id uuid; v_make_default boolean;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text || ':addresses', 0));

  IF p_address_id IS NULL THEN
    v_make_default := p_is_default OR NOT EXISTS (
      SELECT 1 FROM public.user_addresses WHERE user_id = p_user_id AND is_default
    );
  ELSE
    v_make_default := p_is_default OR NOT EXISTS (
      SELECT 1 FROM public.user_addresses WHERE user_id = p_user_id AND id <> p_address_id AND is_default
    );
  END IF;

  IF v_make_default THEN
    UPDATE public.user_addresses SET is_default = false WHERE user_id = p_user_id AND is_default;
  END IF;

  IF p_address_id IS NULL THEN
    INSERT INTO public.user_addresses (
      user_id, label, recipient, street, number, complement, neighborhood,
      city, state, postal_code, country, is_default
    ) VALUES (
      p_user_id, p_label, p_recipient, p_street, p_number, p_complement,
      p_neighborhood, p_city, p_state, p_postal_code, p_country, v_make_default
    ) RETURNING id INTO v_id;
  ELSE
    UPDATE public.user_addresses SET
      label = p_label,
      recipient = p_recipient,
      street = p_street,
      number = p_number,
      complement = p_complement,
      neighborhood = p_neighborhood,
      city = p_city,
      state = p_state,
      postal_code = p_postal_code,
      country = p_country,
      is_default = v_make_default
    WHERE id = p_address_id AND user_id = p_user_id
    RETURNING id INTO v_id;
    IF v_id IS NULL THEN RAISE EXCEPTION 'ADDRESS_NOT_FOUND'; END IF;
  END IF;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_user_address(p_user_id uuid, p_address_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_was_default boolean;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text || ':addresses', 0));
  DELETE FROM public.user_addresses
  WHERE id = p_address_id AND user_id = p_user_id
  RETURNING is_default INTO v_was_default;
  IF v_was_default IS NULL THEN RETURN false; END IF;

  IF v_was_default THEN
    UPDATE public.user_addresses SET is_default = true
    WHERE id = (
      SELECT id FROM public.user_addresses
      WHERE user_id = p_user_id
      ORDER BY created_at, id
      LIMIT 1
    );
  END IF;
  RETURN true;
END;
$$;

-- Usuários existentes recebem como endereço principal o snapshot do pedido mais recente.
WITH latest_address AS (
  SELECT DISTINCT ON (user_id) user_id, shipping_address
  FROM public.orders
  WHERE user_id IS NOT NULL
    AND shipping_address->>'recipient' IS NOT NULL
    AND shipping_address->>'street' IS NOT NULL
    AND shipping_address->>'number' IS NOT NULL
    AND shipping_address->>'neighborhood' IS NOT NULL
    AND shipping_address->>'city' IS NOT NULL
    AND shipping_address->>'state' ~ '^[A-Z]{2}$'
    AND shipping_address->>'postalCode' ~ '^\d{8}$'
  ORDER BY user_id, created_at DESC
)
INSERT INTO public.user_addresses (
  user_id, label, recipient, street, number, complement, neighborhood,
  city, state, postal_code, country, is_default
)
SELECT
  source.user_id,
  'Principal',
  source.shipping_address->>'recipient',
  source.shipping_address->>'street',
  source.shipping_address->>'number',
  coalesce(source.shipping_address->>'complement', ''),
  source.shipping_address->>'neighborhood',
  source.shipping_address->>'city',
  source.shipping_address->>'state',
  source.shipping_address->>'postalCode',
  'BR',
  true
FROM latest_address source
WHERE NOT EXISTS (SELECT 1 FROM public.user_addresses saved WHERE saved.user_id = source.user_id);

ALTER TABLE public.user_addresses DISABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.user_addresses FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_addresses TO service_role;
REVOKE EXECUTE ON FUNCTION public.save_user_address(uuid,uuid,text,text,text,text,text,text,text,text,text,text,boolean) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_user_address(uuid,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_user_address(uuid,uuid,text,text,text,text,text,text,text,text,text,text,boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_user_address(uuid,uuid) TO service_role;

COMMIT;
