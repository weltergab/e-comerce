-- Add boleto payment support to transactions table
-- This allows tracking of boleto payment URLs and payment methods

-- Add columns for boleto payments
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS boleto_url TEXT DEFAULT NULL;

-- Add index for filtering by payment method
CREATE INDEX IF NOT EXISTS idx_transactions_payment_method
ON transactions(payment_method)
WHERE payment_method IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN transactions.payment_method IS 'Método de pagamento usado (card, boleto, pix, etc)';
COMMENT ON COLUMN transactions.boleto_url IS 'URL do PDF do boleto bancário para pagamentos do tipo boleto';
