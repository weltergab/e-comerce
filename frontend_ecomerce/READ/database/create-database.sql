-- Supabase complete setup for this e-commerce project
-- Run this file once in Supabase Dashboard > SQL Editor.
-- It is safe to run again because it uses IF NOT EXISTS where possible.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =========================================================
-- Users
-- =========================================================

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_is_admin ON users(is_admin) WHERE is_admin = TRUE;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.users TO anon, authenticated;

DROP POLICY IF EXISTS "Users can read own data" ON users;
CREATE POLICY "Users can read own data" ON users
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Enable insert for users" ON users;
CREATE POLICY "Enable insert for users" ON users
  FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update own data" ON users;
CREATE POLICY "Users can update own data" ON users
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- =========================================================
-- Transactions
-- =========================================================

CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  user_email VARCHAR(255) NOT NULL,
  user_name VARCHAR(255),
  stripe_payment_intent_id VARCHAR(255) UNIQUE NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'brl',
  status VARCHAR(50) NOT NULL,
  payment_method VARCHAR(50) DEFAULT NULL,
  boleto_url TEXT DEFAULT NULL,
  products JSONB NOT NULL,
  admin_notes TEXT DEFAULT NULL,
  admin_notes_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  admin_notes_updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Make this file work even if the table was created by an older script.
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS boleto_url TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS admin_notes TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS admin_notes_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS admin_notes_updated_by UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_email ON transactions(user_email);
CREATE INDEX IF NOT EXISTS idx_transactions_stripe_payment_intent ON transactions(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_payment_method
  ON transactions(payment_method)
  WHERE payment_method IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_admin_notes
  ON transactions USING gin(to_tsvector('portuguese', COALESCE(admin_notes, '')))
  WHERE admin_notes IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_has_notes
  ON transactions(admin_notes_updated_at)
  WHERE admin_notes IS NOT NULL;

CREATE OR REPLACE FUNCTION update_transactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS transactions_updated_at_trigger ON transactions;
CREATE TRIGGER transactions_updated_at_trigger
BEFORE UPDATE ON transactions
FOR EACH ROW
EXECUTE FUNCTION update_transactions_updated_at();

COMMENT ON TABLE transactions IS 'Payment transaction history';
COMMENT ON COLUMN transactions.user_id IS 'User reference, nullable when the user is deleted';
COMMENT ON COLUMN transactions.user_email IS 'User email at transaction time';
COMMENT ON COLUMN transactions.stripe_payment_intent_id IS 'Stripe Payment Intent ID';
COMMENT ON COLUMN transactions.amount IS 'Transaction total in BRL';
COMMENT ON COLUMN transactions.products IS 'JSON array with purchased products';
COMMENT ON COLUMN transactions.status IS 'Stripe transaction status';
COMMENT ON COLUMN transactions.payment_method IS 'Payment method used, such as card, boleto or pix';
COMMENT ON COLUMN transactions.boleto_url IS 'Hosted boleto URL for boleto payments';
COMMENT ON COLUMN transactions.admin_notes IS 'Notes added by administrators about the transaction';
COMMENT ON COLUMN transactions.admin_notes_updated_at IS 'Last admin notes update timestamp';
COMMENT ON COLUMN transactions.admin_notes_updated_by IS 'Admin user ID that last updated the notes';

GRANT SELECT, INSERT, UPDATE ON public.transactions TO anon, authenticated;

-- =========================================================
-- Parameters
-- =========================================================

CREATE TABLE IF NOT EXISTS parameters (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  description TEXT DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_parameters_updated_at ON parameters(updated_at DESC);

DROP TRIGGER IF EXISTS parameters_updated_at_trigger ON parameters;
CREATE TRIGGER parameters_updated_at_trigger
BEFORE UPDATE ON parameters
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE parameters IS 'Store configuration parameters';
COMMENT ON COLUMN parameters.key IS 'Unique parameter key';
COMMENT ON COLUMN parameters.value IS 'Parameter value stored as JSON';
COMMENT ON COLUMN parameters.description IS 'Human-readable parameter description';

GRANT SELECT, INSERT, UPDATE ON public.parameters TO anon, authenticated;

INSERT INTO parameters (key, value, description)
VALUES (
  'introduction_header',
  '{"miniText":"Storecy","title":"Produtos escolhidos para simplificar sua rotina","subtitle":"Tecnologia, praticidade e compra segura em um so lugar.","description":"Encontre itens selecionados com pagamento integrado, estoque atualizado e uma experiencia direta para comprar sem complicacao."}'::jsonb,
  'Homepage introduction header phrases'
)
ON CONFLICT (key) DO NOTHING;
-- =========================================================
-- Optional: promote a registered user to admin
-- =========================================================
-- 1. Register normally in the app.
-- 2. Replace the email below with the admin email.
-- 3. Uncomment and run the UPDATE.

-- UPDATE users
-- SET is_admin = TRUE
-- WHERE email = 'admin@example.com';

-- Check admins:
SELECT id, email, username, is_admin, created_at
FROM users
WHERE is_admin = TRUE;