-- Script para criar tabela de transações
-- Execute este script no Supabase SQL Editor

-- 1. Criar tabela de transações
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  user_email VARCHAR(255) NOT NULL,
  user_name VARCHAR(255),
  stripe_payment_intent_id VARCHAR(255) UNIQUE NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'brl',
  status VARCHAR(50) NOT NULL,
  products JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_email ON transactions(user_email);
CREATE INDEX IF NOT EXISTS idx_transactions_stripe_payment_intent ON transactions(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);

-- 3. Criar função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_transactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Criar trigger para atualizar updated_at
DROP TRIGGER IF EXISTS transactions_updated_at_trigger ON transactions;
CREATE TRIGGER transactions_updated_at_trigger
  BEFORE UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_transactions_updated_at();

-- 5. Adicionar comentários para documentação
COMMENT ON TABLE transactions IS 'Tabela para armazenar histórico de transações de pagamento';
COMMENT ON COLUMN transactions.user_id IS 'Referência ao usuário (pode ser NULL se usuário for deletado)';
COMMENT ON COLUMN transactions.user_email IS 'Email do usuário no momento da transação';
COMMENT ON COLUMN transactions.stripe_payment_intent_id IS 'ID do Payment Intent do Stripe';
COMMENT ON COLUMN transactions.amount IS 'Valor total da transação em reais';
COMMENT ON COLUMN transactions.products IS 'Array JSON com os produtos comprados';
COMMENT ON COLUMN transactions.status IS 'Status da transação (succeeded, failed, pending, etc)';

-- 6. Verificar estrutura criada (opcional - para conferir)
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'transactions'
ORDER BY ordinal_position;
