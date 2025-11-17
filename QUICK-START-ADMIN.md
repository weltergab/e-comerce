# Guia Rápido - Painel Administrativo

## 1. Configure o Banco de Dados

Acesse o SQL Editor do Supabase e execute:

```sql
-- Adicionar coluna is_admin
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Defina seu email como admin (SUBSTITUA pelo seu email!)
UPDATE users SET is_admin = TRUE WHERE email = 'SEU-EMAIL@example.com';
```

## 2. Faça Login

1. Acesse: `http://localhost:3000/login`
2. Faça login com a conta que você definiu como admin
3. **IMPORTANTE**: Se você já estava logado, faça logout e login novamente para obter o token atualizado

## 3. Acesse o Painel Admin

- Após login, você verá um botão "Admin" amarelo no header
- Clique nele ou acesse: `http://localhost:3000/admin`

## 4. Gerencie Produtos

### Criar Produto
1. Clique em "+ Novo Produto"
2. Preencha:
   - Nome do Produto
   - Descrição (opcional)
   - Preço (em R$, ex: 99.90)
   - Estoque (quantidade)
   - URL da Imagem (opcional)
3. Clique em "Salvar"

### Editar Produto
1. Clique em "Editar" no card do produto
2. Modifique os campos desejados
3. Clique em "Salvar"

### Excluir Produto
1. Clique em "Excluir" no card do produto
2. Confirme a exclusão
3. O produto será arquivado no Stripe

## URLs Importantes

- **Loja**: `http://localhost:3000/`
- **Admin**: `http://localhost:3000/admin`
- **Login**: `http://localhost:3000/login`

## APIs Disponíveis

Todas requerem header: `Authorization: Bearer <token>`

- `GET /api/admin/products` - Lista produtos
- `POST /api/admin/products` - Cria produto
- `GET /api/admin/products/[id]` - Busca produto
- `PUT /api/admin/products/[id]` - Atualiza produto
- `DELETE /api/admin/products/[id]` - Exclui produto

## Problemas Comuns

### "Acesso negado"
- Verifique se executou o SQL para definir is_admin
- Faça logout e login novamente
- Confira no Supabase se is_admin = true

### Botão "Admin" não aparece
- Faça logout e login novamente
- Verifique se o usuário tem is_admin = true
- Limpe o localStorage: `localStorage.clear()`

### Produtos não aparecem
- Verifique STRIPE_SECRET_KEY no .env.local
- Confira se produtos estão ativos no Stripe Dashboard
- Veja console do navegador para erros

## Testando

1. Crie um produto pelo painel
2. Vá para a home (`/`)
3. Veja o produto listado
4. Teste compra normalmente
