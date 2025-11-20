# Configuração do Sistema de Histórico de Transações

Este guia explica como configurar e usar o sistema de histórico de transações para administradores.

## 📋 O que foi adicionado

### 1. **Tabela de Transações no Banco de Dados**
- Armazena todas as transações de pagamento
- Relaciona com usuários
- Guarda produtos comprados em cada transação
- Mantém histórico completo mesmo se produtos forem deletados

### 2. **Salvamento Automático de Transações**
- Webhook do Stripe modificado para salvar cada transação bem-sucedida
- Dados salvos incluem:
  - Informações do usuário
  - Valor total
  - Produtos comprados
  - Status da transação
  - ID do Payment Intent do Stripe

### 3. **Painel Admin de Transações**
- Nova página acessível apenas para administradores
- Visualização de todas as transações de todos os usuários
- Estatísticas resumidas
- Detalhes completos de cada transação

## 🚀 Como Configurar

### Passo 1: Executar Script SQL

Execute o script `database/transactions-setup.sql` no Supabase SQL Editor:

1. Acesse seu projeto no Supabase
2. Vá em **SQL Editor**
3. Clique em **New Query**
4. Copie e cole o conteúdo de `database/transactions-setup.sql`
5. Clique em **Run** ou pressione `Ctrl + Enter`

O script irá:
- Criar a tabela `transactions`
- Criar índices para melhor performance
- Configurar triggers automáticos
- Adicionar comentários de documentação

### Passo 2: Verificar a Instalação

Execute esta query no SQL Editor para verificar:

```sql
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'transactions'
ORDER BY ordinal_position;
```

Você deve ver as seguintes colunas:
- `id` (uuid)
- `user_id` (uuid)
- `user_email` (varchar)
- `user_name` (varchar)
- `stripe_payment_intent_id` (varchar)
- `amount` (numeric)
- `currency` (varchar)
- `status` (varchar)
- `products` (jsonb)
- `created_at` (timestamp)
- `updated_at` (timestamp)

### Passo 3: Testar

1. Faça login como administrador
2. Acesse o painel admin: `/admin`
3. Clique no card "Histórico de Transações"
4. Você verá a página de transações

## 📊 Como Usar

### Acessar Histórico de Transações

1. Faça login como administrador
2. Acesse `/admin`
3. Clique em **"Histórico de Transações"** no card com ícone 📊

### Visualizar Estatísticas

Na página de transações, você verá:
- **Total de Transações**: Número total de transações
- **Transações Bem-Sucedidas**: Apenas as que foram pagas com sucesso
- **Valor Total**: Soma de todas as transações bem-sucedidas

### Ver Detalhes de uma Transação

1. Na tabela de transações, clique em **"Ver Detalhes"**
2. Um modal será aberto mostrando:
   - ID da transação
   - ID do Payment Intent do Stripe
   - Data e hora completa
   - Informações do usuário (nome e email)
   - Valor total e moeda
   - Lista detalhada de produtos comprados
   - Quantidade e preço de cada produto

### Informações na Tabela

A tabela mostra:
- **Data**: Data e hora da transação
- **Usuário**: Nome do usuário
- **Email**: Email do usuário
- **Valor**: Valor total formatado em R$
- **Status**:
  - 🟢 **Sucesso**: Pagamento confirmado
  - 🔴 **Falhou**: Pagamento não foi completado
  - 🟡 **Pendente**: Aguardando confirmação

## 🔧 Estrutura de Dados

### Tabela `transactions`

```sql
{
  id: UUID,                          // ID único da transação
  user_id: UUID,                     // Referência ao usuário (pode ser null)
  user_email: VARCHAR,               // Email do usuário
  user_name: VARCHAR,                // Nome do usuário
  stripe_payment_intent_id: VARCHAR, // ID do Payment Intent do Stripe
  amount: DECIMAL,                   // Valor em reais (já convertido de centavos)
  currency: VARCHAR,                 // Moeda (ex: 'brl')
  status: VARCHAR,                   // Status: 'succeeded', 'failed', 'pending'
  products: JSONB,                   // Array com produtos comprados
  created_at: TIMESTAMP,             // Data de criação
  updated_at: TIMESTAMP              // Data de última atualização
}
```

### Formato dos Produtos (JSON)

```json
[
  {
    "id": "prod_123",
    "qty": 2,
    "price": 99.90
  },
  {
    "id": "prod_456",
    "qty": 1,
    "price": 149.90
  }
]
```

## 🔐 Segurança

- ✅ Apenas administradores podem acessar
- ✅ Proteção em nível de API
- ✅ Proteção em nível de interface
- ✅ Dados sensíveis do Stripe são armazenados apenas o ID do Payment Intent
- ✅ Validação de token JWT em todas as requisições

## 📝 Arquivos Modificados/Criados

### Criados:
1. `database/transactions-setup.sql` - Script de criação da tabela
2. `app/api/admin/transactions/route.ts` - API endpoint para buscar transações
3. `app/admin/transactions/page.tsx` - Página de visualização de transações
4. `TRANSACOES-SETUP.md` - Este documento

### Modificados:
1. `app/api/webhooks/stripe/route.ts` - Adicionado salvamento de transações
2. `app/admin/page.tsx` - Adicionado card para acessar transações

## 🐛 Solução de Problemas

### Transações não aparecem

1. Verifique se a tabela foi criada:
```sql
SELECT * FROM transactions;
```

2. Verifique se o webhook do Stripe está funcionando:
   - Olhe os logs do console
   - Procure por "💾 Saving transaction to database..."

3. Verifique as permissões no Supabase:
   - A tabela `transactions` deve estar acessível

### Erro de permissão

1. Certifique-se de estar logado como admin:
```sql
SELECT id, email, is_admin FROM users WHERE email = 'seu-email@exemplo.com';
```

2. Se `is_admin` for `false`, execute:
```sql
UPDATE users SET is_admin = TRUE WHERE email = 'seu-email@exemplo.com';
```

### Transações antigas não aparecem

- O sistema só salva transações a partir de agora
- Transações feitas antes desta atualização não estarão disponíveis
- Para popular com dados históricos, seria necessário importar do Stripe

## 📈 Próximos Passos (Opcional)

Você pode expandir o sistema adicionando:
- Filtros por data, usuário ou status
- Exportação para CSV/Excel
- Gráficos de vendas ao longo do tempo
- Relatórios de produtos mais vendidos
- Sistema de reembolso
- Notificações por email para transações

## ✅ Checklist de Configuração

- [ ] Script SQL executado no Supabase
- [ ] Tabela `transactions` criada com sucesso
- [ ] Webhook do Stripe funcionando
- [ ] Usuário admin configurado
- [ ] Acesso à página `/admin/transactions` funcionando
- [ ] Primeira transação de teste salva com sucesso

## 🎉 Conclusão

O sistema de histórico de transações está completo e funcionando! Agora você pode:
- Ver todas as transações de todos os usuários
- Monitorar vendas em tempo real
- Verificar detalhes completos de cada compra
- Ter controle total sobre as finanças do e-commerce
