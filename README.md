# Lerium Shop

Aplicação React/Vite com API Express modular, catálogo/pedidos/estoque no Postgres (Supabase) e pagamentos no Stripe.

Os diagramas do sistema, banco de dados e organização de pastas estão em [`arquitetura.md`](./arquitetura.md).

## Preparação local

1. Copie `backend/.env.example` para `backend/.env.local` e `frontend_ecomerce/.env.example` para `frontend_ecomerce/.env.local`.
2. Execute `backend/database/create-database.sql` no SQL Editor do Supabase usando um usuário proprietário. O script revoga todo acesso de `anon` e `authenticated` às tabelas privadas e concede ao `service_role` apenas leitura e escrita necessárias. Em uma base já criada, aplique também os arquivos incrementais ainda não executados de `backend/database/`, em ordem cronológica.
3. Para trazer uma única vez o catálogo Stripe antigo para o Postgres, rode `npm run catalog:import` em `backend/`. Depois da importação, o Postgres é a autoridade e as alterações administrativas sincronizam novas versões de Price no Stripe.
4. Registre o webhook Stripe em `/api/webhooks/stripe` e habilite os eventos `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`, `payment_intent.created`, `payment_intent.processing`, `payment_intent.succeeded`, `payment_intent.payment_failed`, `payment_intent.canceled` e `charge.refunded`.
5. Rode `npm ci` e depois `npm run dev` separadamente em `backend/` e `frontend_ecomerce/` (Node 22.12+ ou 24).
6. Ao atualizar uma instalação que já possuía pedidos, execute uma vez `npm run tasks:backfill` no ambiente de produção para publicar tarefas dos registros pendentes anteriores à migração.

## Operação

- O backend publica tarefas no Vercel Queues e o consumidor privado `api/tasks.ts` processa cada mensagem com entrega pelo menos uma vez, retry exponencial e efeitos idempotentes.
- O webhook Stripe persiste o evento antes de publicá-lo. A página de sucesso pode solicitar uma reconciliação pontual do próprio pedido; não há varredura global de pagamentos.
- Cada checkout agenda a expiração da própria reserva, cada upload agenda a própria limpeza após 24 horas e pedidos encerrados agendam a anonimização definida por `PII_RETENTION_DAYS`.
- Em desenvolvimento fora da Vercel, há um executor em memória para facilitar testes manuais. Ele não é durável entre reinícios e nunca é usado em produção.
- Reservas expiram após 15 minutos. O backend cria uma Checkout Session hospedada e aceita somente cartão e Pix quando o método estiver disponível na conta Stripe; boleto permanece desabilitado.
- Produtos físicos têm endereço congelado, frete grátis, estados `paid → packing → shipped → delivered` e código de rastreio. `PII_RETENTION_DAYS` controla a anonimização automática de pedidos encerrados (730 dias no exemplo); valide esse prazo e a política fiscal com o responsável jurídico antes do go-live.
- Reembolso nunca devolve estoque. A devolução física é explícita por `POST /api/admin/inventory/:productId/return` e gera movimento auditável.
- Para URLs externas de imagens, adicione o hostname a `IMAGE_HOST_ALLOWLIST` e à diretiva `img-src` da CSP do frontend.

## Verificação

```text
cd backend && npm run check
cd frontend_ecomerce && npm run check
```

Os testes automatizados funcionam sem `.env.local`, Supabase, Stripe ou credenciais externas. Para executar apenas a suíte após `npm ci`, use `npm test`; para JUnit/JSON, `npm run test:ci`. A aplicação completa exige os arquivos privados descritos acima. Não execute importação/backfill em um ambiente existente apenas para rodar os testes.

| Diretório | Verificação local completa | Etapas reproduzíveis do CI |
| --- | --- | --- |
| `backend` | `npm run check` | `npm ci`, `npm run build`, `npm run test:ci`, `node ../scripts/ci.mjs verify` |
| `frontend_ecomerce` | `npm run check` | `npm ci`, `npm run build`, `npm run lint`, `npm run test:ci`, `node ../scripts/ci.mjs verify` |

Nos dois diretórios, execute também `npm audit --omit=dev --audit-level=high` e `npm audit --audit-level=high`. No diretório raiz, `node --test scripts/ci.test.mjs` verifica as regras do agregador e dos relatórios. O backend valida tipos e configuração Vercel; seu build não gera um bundle. O CI executa as etapas separadamente e não repete a suíte por meio de check.

O workflow [CI](.github/workflows/ci.yml) executa em pull requests e pushes na main, usa Node 22, publica relatórios mesmo após falha e exige sucesso dos dois projetos, inclusive seus artefatos, no job `quality-gate`. Erros de build/lint/testes, relatórios ausentes ou vulnerabilidades altas/críticas em qualquer dependência bloqueiam. O acionamento manual é suplementar. A integração com o deploy da Vercel precisa de validação própria.

## Trabalho DevOps e QAOps

- [Caracterização e acessos](docs/devops-qaops/caracterizacao.md), [baseline](docs/devops-qaops/baseline.md) e [estratégia de testes](docs/devops-qaops/estrategia-testes.md).
- [Quality gates](docs/devops-qaops/quality-gates.md), [decisões em uma linha](docs/devops-qaops/decisoes.md) e [contribuições/revisão individual](docs/devops-qaops/contribuicoes.md).
- [Experimentos e links](docs/devops-qaops/experimentos.md), [análise crítica](docs/devops-qaops/analise-critica.md) e [fontes](docs/devops-qaops/referencias.md).
- [Relatório Word](docs/devops-qaops/entregaveis/relatorio-tecnico.docx), [slides editáveis](docs/devops-qaops/entregaveis/slides.pptx) e [roteiro de apresentação](docs/devops-qaops/entregaveis/roteiro-apresentacao.md).

A marca e logo exibidas são **Lerium Shop**. O domínio existente `https://storecy.vercel.app`, cookies, fila, JWT e chave de carrinho mantêm os identificadores históricos para compatibilidade. Conteúdo introdutório salvo com a marca antiga é normalizado na leitura da interface, sem modificar o banco remoto. `arquivo.md` é um checklist local ignorado e não integra os commits.
