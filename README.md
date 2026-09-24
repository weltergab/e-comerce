# Storecy

Aplicação React/Vite com API Express modular, catálogo/pedidos/estoque no Postgres (Supabase) e pagamentos no Stripe.

Os diagramas do sistema, banco de dados e organização de pastas estão em [`ARQUITETURA.md`](./ARQUITETURA.md).

## Preparação local

1. Copie `backend/.env.example` para `backend/.env.local` e `frontend_ecomerce/.env.example` para `frontend_ecomerce/.env.local`.
2. Execute `backend/database/create-database.sql` no SQL Editor do Supabase usando um usuário proprietário. O script revoga todo acesso de `anon` e `authenticated` às tabelas privadas.
3. Para trazer uma única vez o catálogo Stripe antigo para o Postgres, rode `npm run catalog:import` em `backend/`. Depois da importação, o Postgres é a autoridade e as alterações administrativas sincronizam novas versões de Price no Stripe.
4. Registre o webhook Stripe em `/api/webhooks/stripe` e habilite os eventos `payment_intent.created`, `payment_intent.processing`, `payment_intent.succeeded`, `payment_intent.payment_failed`, `payment_intent.canceled` e `charge.refunded`.
5. Rode `npm install && npm run dev` separadamente em `backend/` e `frontend_ecomerce/`.

## Operação

- O cron chama `GET /api/jobs/payments` a cada cinco minutos. A plataforma deve enviar `Authorization: Bearer $CRON_SECRET` (comportamento padrão do Vercel Cron).
- O job reconcilia pedidos pendentes, processa a fila durável de eventos, envia emails idempotentes pelo Resend e remove uploads órfãos após 24 horas.
- Reservas de checkout expiram após 15 minutos. Boleto foi removido; o Payment Element oferece cartão e Pix.
- Produtos físicos têm endereço congelado, frete grátis, estados `paid → packing → shipped → delivered` e código de rastreio. `PII_RETENTION_DAYS` controla a anonimização automática de pedidos encerrados (730 dias no exemplo); valide esse prazo e a política fiscal com o responsável jurídico antes do go-live.
- Reembolso nunca devolve estoque. A devolução física é explícita por `POST /api/admin/inventory/:productId/return` e gera movimento auditável.
- Para URLs externas de imagens, adicione o hostname a `IMAGE_HOST_ALLOWLIST` e à diretiva `img-src` da CSP do frontend.

## Verificação

```text
cd backend && npm run check
cd frontend_ecomerce && npm run check
```

O CI também bloqueia vulnerabilidades altas/críticas de dependências de produção. Advisories exclusivos de ferramentas de desenvolvimento precisam de revisão documentada antes de atualizar versões maiores; os servidores UI dessas ferramentas não são expostos.
