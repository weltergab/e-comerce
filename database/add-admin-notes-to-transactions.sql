-- Add admin notes functionality to transactions table
-- This allows administrators to add observations/notes to user transactions

-- Add columns for admin notes
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS admin_notes TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS admin_notes_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS admin_notes_updated_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- Add index for searching notes (full-text search in Portuguese)
CREATE INDEX IF NOT EXISTS idx_transactions_admin_notes
ON transactions USING gin(to_tsvector('portuguese', COALESCE(admin_notes, '')))
WHERE admin_notes IS NOT NULL;

-- Add index for filtering transactions with notes
CREATE INDEX IF NOT EXISTS idx_transactions_has_notes
ON transactions(admin_notes_updated_at)
WHERE admin_notes IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN transactions.admin_notes IS 'Notas/observações adicionadas por administradores sobre a transação';
COMMENT ON COLUMN transactions.admin_notes_updated_at IS 'Data e hora da última atualização das notas administrativas';
COMMENT ON COLUMN transactions.admin_notes_updated_by IS 'ID do usuário administrador que fez a última atualização das notas';
