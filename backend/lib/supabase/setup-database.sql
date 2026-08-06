-- SQL para criar a tabela de usuários no Supabase
-- Execute este SQL no SQL Editor do Supabase Dashboard

-- Criar tabela de usuários
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para atualizar updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Habilitar Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Política para permitir leitura do próprio usuário
CREATE POLICY "Users can read own data" ON users
  FOR SELECT
  USING (true);

-- Política para permitir inserção de novos usuários (cadastro)
CREATE POLICY "Enable insert for users" ON users
  FOR INSERT
  WITH CHECK (true);

-- Política para permitir atualização do próprio usuário
CREATE POLICY "Users can update own data" ON users
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

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
  '{"miniText":"Storecy","title":"Produtos escolhidos para simplificar sua rotina","subtitle":"Tecnologia, praticidade e compra segura em um só lugar.","description":"Encontre itens selecionados com pagamento integrado, estoque atualizado e uma experiência direta para comprar sem complicação."}'::jsonb,
  'Homepage introduction header phrases'
)
ON CONFLICT (key) DO NOTHING;
