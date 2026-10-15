# Arquitetura do Lerium Shop

Estado do código em **02/10/2026**. Este documento descreve somente a arquitetura presente no repositório; ações ainda necessárias estão identificadas como pendentes.

## Legenda de status

- [x] Implementado no código e versionado no repositório.
- [ ] Não implementado, não aplicado no ambiente remoto ou ainda não validado de ponta a ponta.

## 1. Visão geral

### Estado dos componentes

- [x] SPA em React 19, TypeScript e Vite, publicada como conteúdo estático na Vercel.
- [x] Backend Express 5 modular, exposto por uma Serverless Function da Vercel em `/api/*`.
- [x] PostgreSQL do Supabase como fonte oficial de catálogo, estoque, pedidos, sessões e eventos.
- [x] Supabase Storage para imagens públicas de produtos, normalizadas em WebP pelo backend.
- [x] Stripe Checkout Sessions em página hospedada para cartão e, quando habilitado na conta, Pix.
- [x] Webhook Stripe assinado, com persistência do evento antes do processamento assíncrono.
- [x] Vercel Queues para tarefas duráveis, adiadas, idempotentes e com retry; não há cron de aplicação.
- [x] Resend para recuperação de senha e confirmação de pagamento.
- [x] Sentry no backend e no frontend, além de logs JSON com `requestId` no backend.
- [ ] Infraestrutura externa e fluxo completo validados no ambiente de produção após a aplicação das migrations e variáveis descritas em `PLANO_ARQUITETURA_PRODUCAO.md`.

```mermaid
flowchart LR
    User([Cliente ou administrador])

    subgraph Frontend["Frontend React + Vite"]
        UI["Páginas e componentes"]
        Guards["RequireAuth / RequireAdmin"]
        State["Auth, carrinho e tema"]
        Query["TanStack Query"]
        ApiClient["Cliente HTTP central<br/>access token em memória"]

        UI --> Guards
        UI --> State
        UI --> Query
        Query --> ApiClient
        State --> ApiClient
    end

    subgraph Vercel["Vercel"]
        Static["SPA estática"]
        Api["Serverless Function<br/>/api/*"]
        Queue["Vercel Queues<br/>storecy-tasks"]
        Consumer["Consumidor privado<br/>api/tasks.ts"]
    end

    subgraph Backend["Backend Express modular"]
        Middleware["CORS, Helmet, limites,<br/>requestId e erros"]
        Routes["Auth · Catálogo · Checkout<br/>Pedidos · Admin · Conteúdo"]
        Webhook["Webhook Stripe<br/>body bruto + assinatura"]
        Services["Serviços e regras de negócio"]
    end

    subgraph Supabase["Supabase"]
        Postgres[("PostgreSQL<br/>fonte oficial")]
        Storage[("Storage<br/>product-images")]
    end

    Stripe["Stripe<br/>Checkout, pagamentos e catálogo"]
    Resend["Resend<br/>e-mails"]
    Sentry["Sentry<br/>observabilidade"]

    User --> Static --> UI
    ApiClient -->|"HTTPS + cookie HttpOnly"| Api
    Api --> Middleware --> Routes --> Services
    Api --> Webhook --> Services
    Services -->|"service role e RPCs"| Postgres
    Services -->|"upload e limpeza"| Storage
    Services -->|"cria Checkout Session"| Stripe
    UI -->|"redirecionamento"| Stripe
    Stripe -->|"eventos assinados"| Webhook
    Services -->|"publica tarefa"| Queue
    Queue --> Consumer --> Services
    Consumer --> Resend
    Middleware -.-> Sentry
    Services -.-> Sentry
```

### Limites de responsabilidade

- [x] O navegador acessa dados de negócio exclusivamente pela API; não usa o cliente Supabase nem possui credencial de banco.
- [x] O backend é a fronteira de confiança para autenticação, preço, disponibilidade, autorização administrativa e transições de estado.
- [x] O Postgres executa, por RPCs transacionais, as mudanças críticas de pedido e estoque.
- [x] O Stripe decide o resultado financeiro; a aplicação o incorpora por webhook ou reconciliação pontual.
- [x] A fila executa efeitos posteriores e tarefas adiadas sem varreduras periódicas globais.

## 2. Frontend

### Funcionalidades implementadas

- [x] Catálogo, detalhe de produto, carrinho persistido localmente e tema.
- [x] Cadastro, login, logout, restauração da sessão e recuperação de senha.
- [x] Access token mantido somente em memória e refresh token persistente por uma hora em cookie `HttpOnly`, enviado com `credentials: include`.
- [x] Cliente HTTP único em `lib/api/client.ts`, com refresh coordenado após `401` e retry limitado para rotações concorrentes entre abas.
- [x] Rotas protegidas para checkout, pedidos do cliente e administração.
- [x] Endereços persistidos na conta, com seleção, criação e edição no checkout; o endereço principal é escolhido automaticamente.
- [x] Chave de idempotência por tentativa de pagamento, renovada antes de sair para o Stripe para que uma nova compra idêntica gere outro pedido.
- [x] Redirecionamento para a URL da Checkout Session retornada pelo backend.
- [x] Página de sucesso que solicita reconciliação pontual e consulta o status a cada 2,5 segundos, parando em estado terminal ou após 20 respostas/tentativas.
- [x] Área administrativa para catálogo, imagens, conteúdo da introdução, pedidos, notas e fulfillment.
- [x] Tela `/admin/sync` acessível pelo botão Sincronização no ADM: duas seções direcionais, produtos existentes em cinza, diferenças de estoque/valor, importação e ajustes individuais, importação completa com progresso e logs.
- [x] Teste de conexões de backend, Supabase e Stripe transferido do painel principal para a tela de sincronização.
- [x] TanStack Query como camada de cache e estado de requisições.
- [x] Captura de erros pelo Sentry quando `VITE_SENTRY_DSN` está configurado.

### O que não existe no frontend

- [x] Não há Payment Element, `Elements`, Stripe.js ou `client_secret` no código executável.
- [x] Não há confirmação de pagamento no navegador; o frontend apenas redireciona para o checkout hospedado.
- [x] Não há preço, total ou estoque enviados como fonte confiável ao backend.
- [x] Não há acesso direto do browser ao Supabase.

## 3. Backend e API

### Superfície HTTP atual

| Grupo | Rotas | Status |
|---|---|---|
| Saúde | `GET /api/health` | [x] |
| Autenticação | `POST /api/auth/login`, `register`, `refresh`, `logout`, `password-reset/request`, `password-reset/confirm`; `GET /api/auth/me` | [x] |
| Catálogo público | `GET /api/products`, `GET /api/products/:id` | [x] |
| Endereços da conta | `GET`, `POST /api/account/addresses`; `PUT`, `DELETE /api/account/addresses/:id` | [x] |
| Checkout | `POST /api/checkout` | [x] |
| Pedidos do cliente | `GET /api/orders`, `GET /api/orders/:id/status`, `POST /api/orders/:id/payment-reconciliation` | [x] |
| Conteúdo público | `GET /api/parameters/introduction-header` | [x] |
| Webhook | `POST /api/webhooks/stripe` | [x] |
| Operação administrativa | `GET /api/admin/health`, `GET /api/admin/metrics` | [x] |
| Catálogo administrativo | CRUD lógico em `/api/admin/products` e upload em `/api/admin/uploads/product-images` | [x] |
| Sincronização de catálogo | `GET /api/admin/sync/products?direction=...`, `POST /api/admin/sync/products`, `GET /api/admin/sync/logs` | [x] |
| Pedidos administrativos | listagem, notas e fulfillment em `/api/admin/orders` | [x] |
| Estoque administrativo | devolução manual em `/api/admin/inventory/:productId/return` | [x] |
| Conteúdo administrativo | leitura e atualização de `/api/admin/parameters/introduction-header` | [x] |

### Sincronização administrativa de catálogo

- [x] `catalog-sync.schemas.ts` valida direção (`stripe_to_supabase`/`supabase_to_stripe`), ação (`import`, `stock`, `price`, `all`), código e lote; `catalog-sync.service.ts` resolve os dados diretamente na origem. O navegador envia identificadores, sem escolher o estoque ou valor aplicado.
- [x] A correspondência usa exclusivamente `products.stripe_product_id` e o ID do produto Stripe, sem comparar nomes. Produtos novos no Supabase recebem o ID Stripe como `products.id`; produtos ausentes no Stripe são criados com o `stripe_product_id` já registrado, preservando vínculos e IDs locais.
- [x] A busca percorre todas as páginas dos dois provedores, incluindo arquivados. A comparação mostra estoque disponível, valor/moeda e divergências no vínculo do Price padrão.
- [x] `import` cria somente produtos ausentes e inclui dados, estoque e preço; produtos existentes são ignorados com log. `stock` e `price` exigem destino existente e alteram apenas o campo correspondente. `all` cria ausentes e atualiza dados, estoque e valor dos existentes.
- [x] O botão de importação completa executa uma requisição por produto com `batchId`, progresso e intervalo de 400 ms, evitando concentrar todo o lote em uma função serverless. Falhas de produto são registradas e o lote continua; perda de sessão/permissão, indisponibilidade da auditoria e rate limit interrompem o lote e informam o que não foi processado. A aba deve permanecer aberta até terminar.
- [x] O Stripe representa estoque disponível em `metadata.stock`. Metadado ausente, fracionário, negativo ou acima de 1.000.000 impede ações que incluam estoque; não é convertido em zero. Atualizar somente valor continua permitido quando estoque está ausente.
- [x] Stripe → Supabase usa `sync_stripe_catalog_product`: lock por código, lock do saldo, produto/estoque/ledger na mesma transação. Define `on_hand = reserved + estoque_origem`, preservando reservas; movimentos usam chave de auditoria e não registram quantidade zero. Atualizar valor copia o Price padrão ativo, avulso, por unidade e em BRL, com valor positivo até R$ 1.000.000.
- [x] Supabase → Stripe grava estoque em metadata. Atualizar valor reaproveita o Price padrão compatível ou cria outro, define `default_price` e salva seu ID no produto local; o Price avulso anterior é arquivado após salvar o vínculo. Preços recorrentes não são arquivados por essa operação. A regra segue a [API de criação de produtos](https://docs.stripe.com/api/products/create) e o [modelo de produtos e preços](https://docs.stripe.com/products-prices/manage-prices) do Stripe.
- [x] `catalog_sync_logs` registra administrador, sentido, ação, código local/Stripe, lote, início/fim, status, mensagem e snapshots antes/depois. O log inicial e o snapshot são obrigatórios antes de escrever no destino. O painel mostra as últimas 100 operações; os demais registros permanecem no banco.
- [x] Erros de conexão do Stripe não são tratados como produto ausente. Chamadas de criação/atualização têm chaves idempotentes. Em falhas entre provedores, o log registra o estado posterior quando disponível e a tela exige nova busca; não existe transação distribuída entre Stripe e Postgres.
- [x] Após sincronizar, o produto é comparado novamente e a outra seção é invalidada. Checkout, reservas e catálogo público continuam usando o Supabase como fonte oficial; importar do Stripe é uma ação explícita do administrador.
- [ ] Aplicar `backend/database/20261002_catalog_sync.sql` em bancos existentes antes de usar a tela; o schema autoritativo inclui o mesmo SQL para instalações novas. Validar os dois sentidos com Supabase/Stripe reais por ambiente.

### Segurança de transporte e aplicação

- [x] CORS por allowlist, com credenciais e tratamento explícito de preflight.
- [x] Helmet, remoção de `x-powered-by`, limite JSON de 256 KiB e timeout de 15 segundos.
- [x] Rate limit geral, mais limites específicos para autenticação e checkout.
- [x] Erros com formato estável (`code`, `message`, `requestId` e, quando aplicável, `fieldErrors`).
- [x] Logs estruturados e redação de chaves sensíveis conhecidas.
- [x] Senhas com bcrypt, JWT de acesso de até 15 minutos, sessão absoluta de uma hora, rotação de refresh token por família e detecção de replay fora da janela curta de concorrência.
- [x] Cookie de refresh `HttpOnly`, limitado a `/api/auth`; em produção usa `Secure`, `SameSite=None` e `Partitioned` para persistir entre o frontend e a API em sites distintos.
- [x] Rotas que criam, renovam ou encerram sessão rejeitam `Origin` fora da allowlist e respostas de autenticação usam `Cache-Control: no-store`.
- [x] Autorização administrativa revalidada no banco por `is_admin`.
- [x] Validação estrita de checkout, endereço, paginação, produtos e origens de imagem.

## 4. Checkout, pagamento e estoque

### Fluxo principal

```mermaid
sequenceDiagram
    actor C as Cliente
    participant F as Frontend
    participant A as API
    participant D as Postgres
    participant S as Stripe
    participant Q as Vercel Queue

    C->>F: Seleciona endereço salvo e confirma o carrinho
    F->>A: POST /api/checkout<br/>itens + shippingAddressId + Idempotency-Key
    A->>D: Resolve o endereço dentro da conta e cria um snapshot
    A->>D: Lê produtos, preços e moeda
    A->>D: create_checkout_order(...)
    D-->>A: Pedido + snapshot + reserva atômica
    A->>S: Cria Checkout Session hospedada
    S-->>A: session.id + session.url
    A->>D: Salva stripe_checkout_session_id
    A->>Q: Agenda reservation-expiry
    A-->>F: orderId + checkoutUrl
    F->>S: Redireciona o navegador
    S-->>C: Coleta e confirma o pagamento
    S->>A: POST /api/webhooks/stripe
    A->>D: Persiste stripe_events
    A->>Q: Publica payment-event
    A-->>S: 202 Accepted
    Q->>A: Entrega a tarefa privada
    A->>S: Consulta o PaymentIntent
    A->>D: apply_payment_state(...)
    D-->>A: Pedido, estoque, reserva e outbox atualizados
    A->>Q: Agenda e-mail e verificações posteriores
    S-->>F: Redireciona para /checkout/success
    F->>A: Reconciliação pontual + consulta de status
```

### Garantias implementadas

- [x] O backend recalcula o total com preço e moeda do Postgres.
- [x] O backend resolve `shippingAddressId` somente dentro da conta autenticada e copia o endereço para o snapshot do pedido.
- [x] `Idempotency-Key` é único por usuário e reaproveita somente retries técnicos da mesma tentativa.
- [x] A retomada idempotente exige carrinho e endereço idênticos e uma Checkout Session aberta; `POST /api/checkout` nunca devolve a URL de sucesso de um pedido concluído.
- [x] O frontend aceita como destino do início do pagamento somente `https://checkout.stripe.com` e encerra a chave da tentativa após estado terminal.
- [x] `create_checkout_order` usa lock, valida saldo, cria snapshots e reserva estoque na mesma transação.
- [x] A reserva dura 15 minutos; a Checkout Session tem expiração de segurança de 30 minutos e é encerrada pela tarefa de reserva quando necessário.
- [x] Falha ao criar, associar ou agendar a sessão executa compensação: expira a sessão quando possível e libera a reserva.
- [x] Eventos Stripe são deduplicados por `event_id` e processados de forma assíncrona.
- [x] `stripe_events.order_id` possui migration incremental; durante a transição, schemas antigos usam o `orderId` assinado nos metadados do PaymentIntent.
- [x] Estados financeiros terminais não são rebaixados por eventos atrasados.
- [x] Pagamento aprovado converte reserva em venda, reduz `on_hand` e cria a notificação de e-mail na mesma transação.
- [x] Falha, cancelamento ou expiração libera a reserva.
- [x] Reembolso não devolve estoque automaticamente; a devolução física exige movimento administrativo explícito.
- [x] O histórico de estoque é preservado em `inventory_movements` com chave idempotente.
- [x] Cartão está sempre disponível; Pix só é anunciado quando disponível na configuração de pagamento padrão da conta Stripe.
- [x] Boleto não faz parte dos meios de pagamento atuais.

## 5. Processamento assíncrono sem cron

Todas as tarefas usam o tópico `storecy-tasks`. Tarefas com prazo superior ao limite de atraso da fila avançam em etapas até `notBefore`; em desenvolvimento, existe um executor local com retry.

| Tarefa | Gatilho | Responsabilidade | Status |
|---|---|---|---|
| `payment-event` | Webhook ou reconciliação do pedido | Consultar o Stripe e aplicar o estado financeiro | [x] |
| `email-delivery` | Pagamento aprovado | Entregar a outbox `order_paid` via Resend | [x] |
| `reservation-expiry` | Criação do checkout ou sessão expirada | Encerrar sessão/intenção e liberar reserva vencida | [x] |
| `product-image-cleanup` | Upload ou remoção de vínculo | Apagar imagem órfã após um dia | [x] |
| `order-fulfillment-check` | Pagamento aprovado | Alertar se o pedido continuar `paid` após 30 minutos | [x] |
| `order-pii-redaction` | Pagamento terminal processado ou entrega concluída | Anonimizar PII após `PII_RETENTION_DAYS` | [x] |
| `refresh-token-cleanup` | Emissão ou revogação | Excluir credencial após o prazo de retenção | [x] |
| `password-reset-token-cleanup` | Solicitação de reset | Excluir token expirado após a retenção | [x] |

- [x] Publicação com chave de idempotência derivada do payload.
- [x] Retry exponencial limitado e alerta no Sentry ao esgotar tentativas relevantes.
- [x] Script `tasks:backfill` para publicar tarefas de registros criados antes da migração para filas.
- [x] Não existe rota HTTP pública para disparar manutenção em lote.
- [x] Não existe configuração de cron no projeto.
- [ ] O caminho compensatório de falha durante a criação da Checkout Session ainda deve agendar a anonimização do pedido cancelado sem depender de backfill.

## 6. Persistência

```mermaid
erDiagram
    USERS ||--o{ REFRESH_TOKENS : possui
    USERS ||--o{ PASSWORD_RESET_TOKENS : solicita
    USERS ||--o{ USER_ADDRESSES : cadastra
    USERS o|--o{ ORDERS : realiza
    USERS o|--o{ INVENTORY_MOVEMENTS : executa
    USERS o|--o{ PRODUCT_IMAGES : envia
    USERS o|--o{ CATALOG_SYNC_LOGS : sincroniza

    PRODUCTS ||--|| INVENTORY : possui
    PRODUCTS ||--o{ ORDER_ITEMS : snapshot
    PRODUCTS ||--o{ INVENTORY_RESERVATIONS : reservado
    PRODUCTS ||--o{ INVENTORY_MOVEMENTS : movimenta
    PRODUCTS o|--o{ PRODUCT_IMAGES : usa

    ORDERS ||--|{ ORDER_ITEMS : contém
    ORDERS ||--o{ INVENTORY_RESERVATIONS : reserva
    ORDERS o|--o{ INVENTORY_MOVEMENTS : origina
    ORDERS ||--o{ EMAIL_NOTIFICATIONS : gera
    ORDERS o|--o{ STRIPE_EVENTS : concilia
```

### Grupos de dados

| Grupo | Tabelas | Responsabilidade | Status |
|---|---|---|---|
| Identidade | `users`, `user_addresses`, `refresh_tokens`, `password_reset_tokens` | Conta, endereços, sessão, revogação e recuperação | [x] |
| Catálogo | `products`, `product_images`, `parameters` | Produto oficial, mídia e conteúdo configurável | [x] |
| Pedidos | `orders`, `order_items`, `email_notifications` | Snapshot, pagamento, fulfillment e outbox | [x] |
| Estoque | `inventory`, `inventory_reservations`, `inventory_movements` | Saldo físico, reserva e ledger | [x] |
| Pagamentos | `stripe_events` e identificadores Stripe em `orders` | Auditoria, deduplicação e conciliação | [x] |
| Sincronização | `catalog_sync_logs` | Auditoria persistente de importações, ajustes e lotes entre Supabase e Stripe | [x] |

### Funções transacionais

- [x] `create_checkout_order`: cria pedido, itens, reservas e movimentos de reserva.
- [x] `release_order_reservation`: libera saldo reservado e encerra o pedido quando aplicável.
- [x] `apply_payment_state`: aplica transições financeiras e seus efeitos de estoque/outbox.
- [x] `admin_adjust_inventory`: ajusta saldo sem violar reservas.
- [x] `sync_stripe_catalog_product`: importa/atualiza catálogo e saldo disponível atomicamente, preservando reservas e gravando ajustes no ledger.
- [x] `manual_return_inventory`: devolve fisicamente itens com auditoria.
- [x] `update_order_fulfillment`: impõe `paid -> packing -> shipped -> delivered`.
- [x] `redact_order_pii`: anonimiza pedidos terminais após a retenção.
- [x] `save_user_address` e `delete_user_address`: mantêm atomicamente a propriedade e um único endereço principal por conta.

### Modelo de acesso

- [x] Papéis `anon` e `authenticated` não têm acesso às tabelas privadas nem às RPCs críticas.
- [x] O backend usa `SUPABASE_SECRET_KEY`, que deve representar a credencial secreta/service role.
- [x] RLS fica desabilitado nas tabelas privadas porque elas não são uma API para o navegador; o isolamento é feito pela API e pela revogação de privilégios públicos.
- [x] O bucket `product-images` permite leitura pública; escrita e remoção passam pelo backend.
- [x] `transactions`, quando presente em banco legado, é renomeada para `transactions_legacy` e não participa do fluxo atual.
- [x] A migration `20260929_checkout_sessions.sql` adiciona o identificador único da Checkout Session a bancos existentes.
- [ ] A aplicação das migrations no banco remoto deve ser confirmada por ambiente.

## 7. Organização do repositório

```text
ecomerceReact2/
├── .github/                         # CI e Dependabot
├── backend/
│   ├── api/                         # Entradas Vercel: HTTP e consumidor da fila
│   ├── database/                    # Schema autoritativo e migrations incrementais
│   ├── scripts/                     # Importação, backfill e validação de deploy
│   ├── server/                      # Entrada HTTP local
│   ├── src/
│   │   ├── background/              # Contratos, publicação e consumo de tarefas
│   │   ├── config/                  # Env, CORS, segurança e Sentry
│   │   ├── db/                      # Cliente Supabase do servidor
│   │   ├── modules/                 # Auth, catálogo, checkout, pedidos etc.
│   │   ├── payments/                # Cliente e configuração Stripe
│   │   └── shared/                  # Erros, HTTP e logs
│   └── tests/                       # Testes unitários e de contrato
└── frontend_ecomerce/
    ├── components/                  # UI compartilhada por domínio
    ├── contexts/                    # Auth, carrinho e tema
    ├── lib/                         # Cliente HTTP, tema e formatação
    ├── src/
    │   ├── app/                     # Guards de rota
    │   ├── features/                # APIs e hooks por domínio
    │   └── pages/                   # Telas e rotas
    └── types/                       # Contratos compartilhados do frontend
```

### Regras de dependência

- [x] `api/index.ts` e `server/local.ts` carregam a mesma aplicação em `src/app.ts`.
- [x] Rotas fazem parsing/autorização e delegam regras a serviços de domínio.
- [x] Serviços podem depender de `db`, `payments`, `background` e `shared`; esses blocos não dependem das telas.
- [x] No frontend, páginas compõem hooks e componentes; todo HTTP passa por `lib/api/client.ts`.
- [x] Funções repetidas de estado financeiro, fila, API, formatação e UI foram centralizadas em módulos reutilizáveis.

## 8. Qualidade e observabilidade

- [x] Backend com compilação TypeScript, testes Vitest e validação do contrato de deploy Vercel.
- [x] Frontend com ESLint, testes Vitest, typecheck e build Vite.
- [x] CI separa instalação reprodutível, build/tipos, lint frontend, testes e auditorias; `check` continua sendo a verificação local completa.
- [x] Dependabot agrupa atualizações semanais separadas para backend e frontend.
- [x] Métricas administrativas para eventos Stripe falhos, estoque negativo, fulfillment parado, e-mails falhos e divergência de catálogo.
- [x] Health check administrativo valida banco e Stripe.
- [x] Testes de catálogo cobrem validação, paginação, vínculo por código, ações direcionais, auditoria e indisponibilidade; testes com PGlite executam a migration em PostgreSQL isolado e validam atomicidade, reservas e privilégios.
- [x] Integração SQL de sincronização usa PostgreSQL efêmero em PGlite com limpeza entre casos e fechamento ao concluir.
- [ ] Integração dos demais módulos/provedores, testes E2E no navegador e testes de concorrência ainda precisam ser adicionados.
- [ ] Alertas, dashboards e procedimentos de recuperação precisam ser validados no ambiente de produção.

### Pipeline DevOps/QAOps — 15/10/2026

O workflow existente mantém jobs estáveis `backend` e `frontend`, usa Node 22 e cache por lockfile, dispara em PR/push main e oferece execução manual suplementar. Cada comando preserva exit code, horário, duração e log. Testes executam uma vez, sem arquivos .env ou provedores reais, gerando JUnit/JSON em `reports/` ignorado. O verificador exige presença de todos os arquivos da suíte e zero falhas/ignorados/todo.

G1 exige build válido, G2 zero erros estáticos, G3 comportamentos/relatórios completos e G4 zero avisos altos/críticos em árvore completa/produção. Manifestos distinguem head SHA e checkout testado, evento, branch, run/tentativa, versões e etapas não executadas. `always()` preserva diagnósticos e upload, com artefatos por projeto/run/tentativa e retenção de 90 dias. O agregador `quality-gate` roda mesmo após falha e só aprova se ambos os jobs, incluindo publicação, concluírem com sucesso; não há prova implícita de bloqueio de deploy Vercel.

Marca visível: Lerium Shop, logo SVG compartilhada e favicon. O domínio e identificadores técnicos históricos mantêm compatibilidade com os serviços existentes. A documentação detalhada e as decisões em uma linha ficam em `docs/devops-qaops/`; o roteiro privado `arquivo.md` permanece ignorado pelo Git.
