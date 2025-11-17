-- Script para configurar funcionalidade de administrador
-- Execute este script no Supabase SQL Editor

-- 1. Adicionar coluna is_admin na tabela users
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- 2. Criar índice para melhor performance em consultas de admin
CREATE INDEX IF NOT EXISTS idx_users_is_admin ON users(is_admin) WHERE is_admin = TRUE;

-- 3. Definir um usuário específico como admin
-- IMPORTANTE: Substitua 'seu-email@example.com' pelo email real do administrador
UPDATE users
SET is_admin = TRUE
WHERE email = 'seu-email@example.com';

-- 4. Verificar usuários admin (opcional - para conferir)
SELECT id, email, username, is_admin, created_at
FROM users
WHERE is_admin = TRUE;

-- Notas:
-- - Apenas usuários com is_admin = TRUE poderão acessar o painel admin
-- - O painel admin está disponível em: /admin
-- - As APIs de gerenciamento de produtos estão protegidas e só respondem para admins
