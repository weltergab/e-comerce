https://vercel.com/weltergabs-projects/e-comerce/deployments


Crie um projeto postgres no supabase.
Use o sql para criar o banco que está em /database/create-database.sql
Copie as keys em: .env.local

Na pasta do projeto (\ecomerceReact2):  
Para rodar o **frontend**:  
```npm run dev```  
Para rodar o **backend**:  
```npm run dev:api```


# Stripe CLI - Webhook

Execute o comando para o stripe CLI gerar uma chave para teste temporaria. Para producao criar weebhook?
Cole no .env.local
 
D:\All\Programas\stripe_cli\stripe.exe listen --forward-to localhost:3000/api/webhooks/stripe
  Ready! You are using Stripe API Version [2023-10-16]. Your webhook signing secret is...



---
Para salvar o pagamento na tabela esperamos o webhook do stripe chamar. Caso não aconteça a tela de sucesso também chama o insert.

Como O Fluxo Principal Funciona
O fluxo ideal é:
Usuário paga
Stripe confirma pagamento
Stripe chama seu webhook no backend
Backend grava em transactions no Supabase
/my-orders busca transactions do usuário
Esse é o melhor caminho, porque é server-to-server:
Stripe -> Backend -> Supabase
Ele não depende do navegador do usuário.
Como A Outra Forma Funciona
A outra forma que eu adicionei funciona assim:
Usuário paga
Stripe redireciona para /checkout/success?payment_intent=...
Página de sucesso lê payment_intent da URL
Frontend chama POST /api/confirm-payment-intent
Backend busca esse PaymentIntent na Stripe
Backend valida se o pagamento pertence ao usuário logado
Backend grava/atualiza transactions no Supabase
Ou seja, ela não confia só na URL. O backend consulta a Stripe de novo usando STRIPE_SECRET_KEY.