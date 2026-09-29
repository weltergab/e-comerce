# Arquitetura do Storecy

Este documento representa a arquitetura implementada no repositório. Os diagramas usam [Mermaid](https://mermaid.js.org/) e podem ser visualizados diretamente no GitHub, GitLab e em editores Markdown com suporte a Mermaid.

## 1. Arquitetura do sistema

```mermaid
flowchart LR
    User([Cliente ou administrador])

    subgraph Frontend["Frontend React + Vite"]
        UI["Páginas e componentes"]
        Guards["RequireAuth / RequireAdmin"]
        State["Auth, carrinho e tema"]
        Query["TanStack Query"]
        ApiClient["API client central<br/>access token em memória"]
        StripeJS["Stripe.js<br/>Payment Element"]

        UI --> Guards
        UI --> State
        UI --> Query
        Query --> ApiClient
        State --> ApiClient
        UI --> StripeJS
    end

    subgraph Hosting["Vercel"]
        Static["Aplicação estática / SPA"]
        Function["Serverless Function<br/>/api/*"]
        Queue["Vercel Queues<br/>entrega durável e retry"]
    end

    subgraph Backend["Backend Express modular"]
        Middleware["CORS, Helmet, rate limit,<br/>requestId, timeout e erros"]
        Routes["Auth · Catálogo · Checkout<br/>Pedidos · Admin · Conteúdo"]
        Webhook["Webhook Stripe<br/>body bruto + assinatura"]
        Tasks["Consumidor privado<br/>de tarefas por domínio"]
        Services["Serviços e regras de negócio"]

        Middleware --> Routes
        Routes --> Services
        Webhook --> Services
        Tasks --> Services
    end

    subgraph Data["Supabase"]
        Postgres[("PostgreSQL<br/>fonte oficial")]
        Storage[("Storage<br/>imagens WebP")]
    end

    subgraph Providers["Serviços externos"]
        Stripe["Stripe<br/>PaymentIntent e catálogo"]
        Resend["Resend<br/>e-mails"]
        Sentry["Sentry<br/>erros e observabilidade"]
    end

    User --> Static
    Static --> UI
    ApiClient -->|"HTTPS + cookie HttpOnly"| Function
    Function --> Middleware
    Function --> Webhook
    Services -->|"publica tarefa idempotente"| Queue
    Queue -->|"push privado"| Tasks

    Services -->|"service role / RPC"| Postgres
    Services -->|"upload e limpeza"| Storage
    Services -->|"cria e consulta PaymentIntent"| Stripe
    StripeJS -->|"confirma pagamento"| Stripe
    Stripe -->|"eventos assinados"| Webhook
    Webhook -->|"persiste, publica e responde 202"| Postgres
    Tasks -->|"consome stripe_events"| Postgres
    Tasks -->|"reconcilia um pedido"| Stripe
    Tasks -->|"envia outbox"| Resend
    Middleware -.->|"falhas e contexto"| Sentry
    Services -.->|"falhas e contexto"| Sentry
```

### Fluxos principais

1. O frontend nunca envia preço confiável: envia apenas produto e quantidade; o backend lê preço, moeda e estoque no Postgres.
2. O checkout cria o pedido e reserva o estoque atomicamente antes de criar o `PaymentIntent` no Stripe.
3. O webhook valida e persiste o evento antes de publicar uma tarefa. O consumidor atualiza pagamento, pedido, reserva, ledger e outbox de e-mail de forma idempotente.
4. A página de sucesso consulta o estado real e pode solicitar uma reconciliação pontual e autenticada do próprio pedido.
5. Checkout, upload e encerramento de pedido publicam tarefas adiadas para expiração de reserva, limpeza de imagem, retenção de credenciais e anonimização de PII.

## 2. Arquitetura do banco de dados

```mermaid
erDiagram
    USERS {
        uuid id PK
        varchar email UK
        varchar username UK
        text password_hash
        boolean is_admin
        timestamptz created_at
        timestamptz updated_at
    }

    PRODUCTS {
        text id PK
        varchar name
        numeric price
        varchar currency
        varchar category
        jsonb images
        boolean active
        text stripe_product_id UK
        text stripe_price_id UK
    }

    INVENTORY {
        text product_id PK,FK
        integer on_hand
        integer reserved
        integer version
        timestamptz updated_at
    }

    ORDERS {
        uuid id PK
        uuid user_id FK
        varchar user_email
        varchar order_status
        varchar payment_status
        numeric amount
        varchar currency
        text stripe_payment_intent_id UK
        text idempotency_key
        jsonb shipping_address
        text tracking_code
    }

    ORDER_ITEMS {
        uuid id PK
        uuid order_id FK
        text product_id FK
        varchar product_name
        numeric unit_price
        varchar currency
        integer quantity
        text image_url
    }

    INVENTORY_RESERVATIONS {
        uuid order_id PK,FK
        text product_id PK,FK
        integer quantity
        varchar status
        timestamptz expires_at
    }

    INVENTORY_MOVEMENTS {
        uuid id PK
        text product_id FK
        uuid order_id FK
        varchar movement_type
        integer quantity
        uuid actor_id FK
        text idempotency_key UK
        timestamptz created_at
    }

    STRIPE_EVENTS {
        text event_id PK
        text event_type
        text object_id
        uuid order_id FK
        varchar processing_status
        integer attempt_count
        timestamptz received_at
        timestamptz processed_at
    }

    REFRESH_TOKENS {
        uuid id PK
        uuid user_id FK
        text token_hash UK
        uuid family_id
        timestamptz expires_at
        timestamptz revoked_at
    }

    PASSWORD_RESET_TOKENS {
        uuid id PK
        uuid user_id FK
        text token_hash UK
        timestamptz expires_at
        timestamptz used_at
    }

    EMAIL_NOTIFICATIONS {
        uuid id PK
        uuid order_id FK
        varchar template
        varchar recipient
        varchar status
        integer attempt_count
        text provider_message_id
    }

    PRODUCT_IMAGES {
        text storage_path PK
        text public_url UK
        text product_id FK
        uuid uploaded_by FK
        varchar status
        timestamptz created_at
    }

    PARAMETERS {
        text key PK
        jsonb value
        text description
        timestamptz updated_at
    }

    USERS o|--o{ ORDERS : "realiza"
    USERS ||--o{ REFRESH_TOKENS : "possui"
    USERS ||--o{ PASSWORD_RESET_TOKENS : "solicita"
    USERS o|--o{ INVENTORY_MOVEMENTS : "executa"
    USERS o|--o{ PRODUCT_IMAGES : "envia"

    PRODUCTS ||--|| INVENTORY : "possui saldo"
    PRODUCTS ||--o{ ORDER_ITEMS : "é congelado em"
    PRODUCTS ||--o{ INVENTORY_RESERVATIONS : "é reservado em"
    PRODUCTS ||--o{ INVENTORY_MOVEMENTS : "gera movimentos"
    PRODUCTS o|--o{ PRODUCT_IMAGES : "possui"

    ORDERS ||--|{ ORDER_ITEMS : "contém"
    ORDERS ||--o{ INVENTORY_RESERVATIONS : "reserva"
    ORDERS o|--o{ INVENTORY_MOVEMENTS : "origina"
    ORDERS ||--o{ EMAIL_NOTIFICATIONS : "gera"
    ORDERS o|--o{ STRIPE_EVENTS : "é conciliado por"
```

`STRIPE_EVENTS.object_id` referencia logicamente objetos Stripe e `order_id` mantém a associação auditável com o pedido. `PARAMETERS` é independente. As alterações críticas de pedido e estoque são feitas pelas funções transacionais do arquivo `backend/database/create-database.sql`.

### Grupos de responsabilidade do banco

| Grupo | Tabelas | Responsabilidade |
|---|---|---|
| Identidade | `users`, `refresh_tokens`, `password_reset_tokens` | Autenticação, renovação, revogação e recuperação de senha |
| Catálogo | `products`, `product_images`, `parameters` | Produtos oficiais, imagens e conteúdo configurável |
| Pedidos | `orders`, `order_items`, `email_notifications` | Snapshot da compra, fulfillment e outbox de e-mail |
| Estoque | `inventory`, `inventory_reservations`, `inventory_movements` | Saldo, reservas temporárias e ledger auditável |
| Pagamentos | `stripe_events` e campos Stripe em `orders` | Auditoria, idempotência e estado de pagamento |

## 3. Arquitetura de pastas e grupos de pastas

```mermaid
flowchart TB
    Root["ecomerceReact2/"]

    subgraph RootDocs["Documentação e operação"]
        Readme["README.md"]
        Architecture["ARQUITETURA.md"]
        Plan["PLANO_ARQUITETURA_PRODUCAO.md"]
        Security["SECURITY.md"]
        Github[".github/<br/>CI e Dependabot"]
    end

    subgraph BackendTree["backend/"]
        BEntry["api/ + server/<br/>HTTP, consumidor e entrada local"]
        BSrc["src/"]
        BBackground["background/<br/>contratos, publicação e consumo"]
        BConfig["config/<br/>env, CORS, segurança, Sentry"]
        BDb["db/<br/>cliente Postgres/Supabase"]
        BModules["modules/<br/>módulos de negócio"]
        BPayments["payments/<br/>cliente Stripe"]
        BShared["shared/<br/>erros, HTTP e logs"]
        BDatabase["database/<br/>schema SQL autoritativo"]
        BScripts["scripts/<br/>importação do catálogo"]
        BTests["tests/<br/>unitários e contratos"]

        BSrc --> BConfig
        BSrc --> BBackground
        BSrc --> BDb
        BSrc --> BModules
        BSrc --> BPayments
        BSrc --> BShared
        BEntry --> BSrc
    end

    subgraph Modules["backend/src/modules/"]
        MAuth["auth/"]
        MCatalog["catalog/"]
        MCheckout["checkout/"]
        MOrders["orders/"]
        MPayments["payments/"]
        MWebhooks["webhooks/"]
        MContent["content/"]
        MAdmin["admin/"]
    end

    subgraph FrontendTree["frontend_ecomerce/"]
        FSrc["src/"]
        FApp["app/<br/>guards de rota"]
        FPages["pages/<br/>telas e rotas"]
        FFeatures["features/<br/>API e hooks por domínio"]
        FComponents["components/<br/>UI, layout, produto, pedido,<br/>checkout e admin"]
        FContexts["contexts/<br/>auth, carrinho e tema"]
        FLib["lib/<br/>API client, Stripe, tema e formatadores"]
        FTypes["types/<br/>contratos do frontend"]

        FSrc --> FApp
        FSrc --> FPages
        FSrc --> FFeatures
        FSrc --> FComponents
        FSrc --> FContexts
        FSrc --> FLib
        FSrc --> FTypes
    end

    Root --> RootDocs
    Root --> BackendTree
    Root --> FrontendTree
    BModules --> Modules
    BModules -.-> BDb
    BModules -.-> BPayments
    BModules -.-> BShared
    FPages -.-> FFeatures
    FPages -.-> FComponents
    FFeatures -.-> FLib
    FContexts -.-> FLib
```

### Regra de dependência

- As entradas do backend carregam `src/app.ts`; as rotas delegam regras aos serviços dos módulos.
- Os módulos podem usar `db`, `payments` e `shared`; esses blocos não dependem das rotas.
- As páginas do frontend compõem componentes e hooks de domínio; o acesso HTTP passa pelo cliente central em `lib/api/client.ts`.
- Componentes compartilhados não devem importar páginas. Tipos e formatadores ficam fora das telas para evitar duplicação.

