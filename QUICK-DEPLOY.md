# Deploy Rápido - Comandos

## 1. Testar Build Local

```bash
npm run build
```

Se der erro, corrija antes de continuar.

## 2. Commit e Push para GitHub

```bash
# Adicionar arquivos
git add .

# Commit
git commit -m "Prepare for production deploy"

# Criar repositório no GitHub primeiro em: https://github.com/new
# Depois conectar:
git remote add origin https://github.com/SEU-USUARIO/SEU-REPO.git
git branch -M main
git push -u origin main
```

## 3. Deploy na Vercel

1. Acesse: https://vercel.com
2. "Add New..." → "Project"
3. Selecione seu repositório do GitHub
4. Configure as variáveis de ambiente:

```
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
JWT_SECRET=bG6UnEZ...
NEXT_PUBLIC_APP_URL=https://seu-app.vercel.app
```

5. Clique em "Deploy"

## 4. Após Deploy - Configurar Webhook Stripe

1. Copie a URL da Vercel (ex: `https://seu-app.vercel.app`)
2. Vá para: https://dashboard.stripe.com/webhooks
3. "Add endpoint"
4. URL: `https://seu-app.vercel.app/api/webhooks/stripe`
5. Eventos: `payment_intent.succeeded`, `payment_intent.payment_failed`
6. Copie o webhook secret (whsec_...)
7. Volte na Vercel → Settings → Environment Variables
8. Adicione/atualize: `STRIPE_WEBHOOK_SECRET=whsec_...`
9. Faça redeploy

## 5. Pronto!

Acesse: `https://seu-app.vercel.app`

## Updates Futuros

```bash
git add .
git commit -m "sua mensagem"
git push
```

A Vercel faz auto-deploy automaticamente!
