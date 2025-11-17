# Guia de Deploy na Vercel

## Pré-requisitos

1. Conta no GitHub
2. Conta na Vercel (pode fazer login com GitHub)
3. Stripe configurado (você já tem)
4. Supabase configurado (você já tem)

## Passo 1: Preparar o código para produção

### 1.1 Verificar .gitignore

Certifique-se que `.env.local` está no `.gitignore` (já deve estar).

### 1.2 Testar build local

```bash
npm run build
```

Se der erro, corrija antes de fazer deploy.

## Passo 2: Subir código para o GitHub

### 2.1 Criar repositório no GitHub

1. Vá para https://github.com/new
2. Nome: `ecommerce-techstore` (ou o que preferir)
3. Deixe como **Private** (recomendado por ter chaves de API)
4. Não inicialize com README (já tem arquivos)
5. Clique em "Create repository"

### 2.2 Conectar e fazer push

```bash
# Se ainda não configurou o remote
git remote add origin https://github.com/SEU-USUARIO/ecommerce-techstore.git

# Verificar branch
git branch -M main

# Fazer push
git push -u origin main
```

## Passo 3: Deploy na Vercel

### 3.1 Importar projeto

1. Vá para https://vercel.com
2. Clique em "Add New..." → "Project"
3. Conecte sua conta do GitHub (se ainda não conectou)
4. Selecione o repositório `ecommerce-techstore`
5. Clique em "Import"

### 3.2 Configurar variáveis de ambiente

**IMPORTANTE:** Configure TODAS essas variáveis de ambiente na Vercel:

```env
# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51OD8MZJeEakYE1R5boBenBzC2kHgznNxIc5urgd1GoK1pRgnYymJiVE4G5iDkXsq9PEIQRmC0UuYAoXgzJjNQMSl00FUdzZ2pF
STRIPE_SECRET_KEY=sk_test_51OD8MZJeEakYE1R5C3tcPUkvBbcRds7LGzNg40CBNVMMsqhSbVMOegtojgSlQnyHtJCc8tYdcFEuZ3ooFWpZrUhK00g9t5u2OF
STRIPE_WEBHOOK_SECRET=(vamos configurar isso depois)

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://nevmbxdccirpdzyrjmjl.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ldm1ieGRjY2lycGR6eXJqbWpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyOTA5OTYsImV4cCI6MjA3ODg2Njk5Nn0.nNP66Z-W2qqH0uK9Mni_loMJt0ge430sC2dtlKR7zsw

# JWT
JWT_SECRET=bG6UnEZeYnaqAmE7qj6XAzilNTlQHP7Z

# App URL (vai mudar após deploy)
NEXT_PUBLIC_APP_URL=https://seu-app.vercel.app
```

**Como adicionar:**
1. Na tela de configuração do projeto na Vercel
2. Role até "Environment Variables"
3. Adicione cada variável acima
4. Marque os checkboxes: Production, Preview, Development

### 3.3 Fazer o deploy

1. Clique em "Deploy"
2. Aguarde o build (2-5 minutos)
3. Você receberá uma URL tipo: `https://ecommerce-techstore.vercel.app`

## Passo 4: Configurar Stripe Webhook para Produção

### 4.1 Atualizar NEXT_PUBLIC_APP_URL

1. Vá nas configurações do projeto na Vercel
2. Settings → Environment Variables
3. Edite `NEXT_PUBLIC_APP_URL` para sua URL da Vercel
4. Exemplo: `https://ecommerce-techstore.vercel.app`
5. Clique em "Save"
6. Faça redeploy (Deployments → ... → Redeploy)

### 4.2 Criar webhook no Stripe Dashboard

1. Vá para https://dashboard.stripe.com/webhooks
2. Clique em "Add endpoint"
3. **Endpoint URL:** `https://SEU-APP.vercel.app/api/webhooks/stripe`
4. **Events to send:**
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
5. Clique em "Add endpoint"
6. **COPIE O WEBHOOK SECRET** (começa com `whsec_`)
7. Vá na Vercel → Settings → Environment Variables
8. Atualize `STRIPE_WEBHOOK_SECRET` com o novo valor
9. Faça redeploy

## Passo 5: Testar em Produção

### 5.1 Criar usuário admin

Execute o SQL no Supabase (mesma query que usou localmente):

```sql
-- Se ainda não criou a tabela users
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  username TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tornar seu usuário admin (substitua o email)
UPDATE users
SET is_admin = true
WHERE email = 'seu-email@example.com';
```

### 5.2 Testar fluxo completo

1. Acesse `https://SEU-APP.vercel.app`
2. Faça cadastro/login
3. Adicione produtos ao carrinho
4. Teste checkout com cartão de teste do Stripe:
   - Número: `4242 4242 4242 4242`
   - Data: Qualquer data futura
   - CVC: Qualquer 3 dígitos
5. Verifique se o webhook atualizou o estoque
6. Teste o painel admin

## Passo 6: Domínio Customizado (Opcional)

Se tiver um domínio:

1. Vercel → Settings → Domains
2. Adicione seu domínio
3. Configure os DNS conforme instruções da Vercel
4. Atualize `NEXT_PUBLIC_APP_URL` para seu domínio
5. Atualize o webhook do Stripe para o novo domínio

## Troubleshooting

### Build falhou

- Verifique os logs no Vercel
- Teste `npm run build` localmente
- Verifique se todas as dependências estão no `package.json`

### Webhook não funciona

- Verifique se `STRIPE_WEBHOOK_SECRET` está correto
- Teste o webhook no Stripe Dashboard → Webhooks → seu webhook → "Send test webhook"
- Verifique os logs na Vercel (Deployments → Functions)

### API Routes não funcionam

- Verifique se as variáveis de ambiente estão configuradas
- Verifique os logs das Serverless Functions na Vercel

### Banco de dados

- Supabase já está em produção
- Não precisa fazer nada extra

## Comandos Úteis

```bash
# Fazer update
git add .
git commit -m "sua mensagem"
git push

# Vercel faz auto-deploy a cada push
```

## Custos

- **Vercel:** Grátis (plano hobby) até 100GB bandwidth/mês
- **Supabase:** Grátis até 500MB database
- **Stripe:** Grátis (cobra 2.9% + R$0.39 por transação aprovada)

## Próximos Passos

1. ✅ Deploy feito
2. Configure domínio customizado (opcional)
3. Mude para chaves de produção do Stripe quando for ao vivo
4. Configure monitoramento (Vercel Analytics)
5. Configure backups do Supabase
