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