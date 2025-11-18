# Checklist de Deploy

## Antes do Deploy

- [ ] Testar build local: `npm run build`
- [ ] Verificar se `.env.local` está no `.gitignore`
- [ ] Criar conta no GitHub (se não tiver)
- [ ] Criar conta na Vercel (se não tiver)

## GitHub

- [ ] Criar repositório no GitHub (Private recomendado)
- [ ] Fazer commit de todas as mudanças
- [ ] Conectar remote: `git remote add origin URL`
- [ ] Push: `git push -u origin main`

## Vercel - Deploy Inicial

- [ ] Importar projeto do GitHub
- [ ] Configurar variáveis de ambiente:
  - [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
  - [ ] `STRIPE_SECRET_KEY`
  - [ ] `NEXT_PUBLIC_SUPABASE_URL`
  - [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - [ ] `JWT_SECRET`
  - [ ] `NEXT_PUBLIC_APP_URL` (com URL da Vercel)
- [ ] Fazer deploy
- [ ] Copiar URL da Vercel

## Stripe Webhook

- [ ] Ir para https://dashboard.stripe.com/webhooks
- [ ] Criar novo endpoint
- [ ] URL: `https://SEU-APP.vercel.app/api/webhooks/stripe`
- [ ] Selecionar eventos: `payment_intent.succeeded` e `payment_intent.payment_failed`
- [ ] Copiar webhook secret
- [ ] Adicionar na Vercel: `STRIPE_WEBHOOK_SECRET`
- [ ] Fazer redeploy

## Supabase - Usuário Admin

- [ ] Ir para Supabase SQL Editor
- [ ] Executar query para tornar usuário admin:
```sql
UPDATE users SET is_admin = true WHERE email = 'seu-email@example.com';
```

## Testes em Produção

- [ ] Acessar site em produção
- [ ] Testar cadastro de usuário
- [ ] Testar login
- [ ] Testar visualização de produtos
- [ ] Testar adicionar ao carrinho
- [ ] Testar checkout com cartão teste (4242 4242 4242 4242)
- [ ] Verificar se estoque foi atualizado
- [ ] Testar painel admin
- [ ] Testar criação de produto no admin
- [ ] Testar edição de produto
- [ ] Testar exclusão de produto
- [ ] Testar todos os 4 temas

## Pós-Deploy

- [ ] Configurar domínio customizado (opcional)
- [ ] Documentar URL de produção
- [ ] Adicionar URL no README
- [ ] Configurar Vercel Analytics (opcional)

## Para Ir ao Vivo (Produção Real)

- [ ] Trocar chaves Stripe de test para live
- [ ] Atualizar webhook do Stripe
- [ ] Revisar políticas de privacidade
- [ ] Configurar termos de uso
- [ ] Testar com transação real pequena
- [ ] Configurar monitoramento de erros

## Variáveis de Ambiente - Referência Rápida

```env
# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://...supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# JWT
JWT_SECRET=(string aleatória)

# App
NEXT_PUBLIC_APP_URL=https://seu-app.vercel.app
```
