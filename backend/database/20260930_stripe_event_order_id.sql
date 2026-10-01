-- Execute no SQL Editor do Supabase para alinhar bancos criados antes da
-- associação explícita entre eventos Stripe e pedidos.
BEGIN;

ALTER TABLE public.stripe_events
  ADD COLUMN IF NOT EXISTS order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_stripe_events_order
  ON public.stripe_events(order_id)
  WHERE order_id IS NOT NULL;

COMMIT;
