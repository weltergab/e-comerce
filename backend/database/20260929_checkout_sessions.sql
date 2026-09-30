-- Execute no SQL Editor do Supabase antes de publicar o backend que usa Checkout Sessions.
BEGIN;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS stripe_checkout_session_id text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_stripe_checkout_session
  ON public.orders(stripe_checkout_session_id)
  WHERE stripe_checkout_session_id IS NOT NULL;

COMMIT;
