# Plano de arquitetura e produção do Lerium Shop

Revisão baseada no código em **02/10/2026**. Este plano substitui análises da arquitetura antiga e separa o que já está implementado do que ainda depende de engenharia, configuração externa ou validação operacional.

## Legenda

- [x] Implementado no repositório.
- [ ] Pendente, não aplicado remotamente ou não validado de ponta a ponta.

Marcar um item como implementado significa que o comportamento existe no código. Não significa, por si só, que secrets, migrations, webhooks e serviços externos estejam corretamente configurados em todos os ambientes.

## 1. Estado atual consolidado

### Plataforma e limites

- [x] Frontend React/Vite e backend Express possuem builds independentes.
- [x] O backend usa uma entrada única de aplicação para execução local e Vercel.
- [x] A Vercel encaminha `/api/*` para `api/index.ts` e valida a existência de `public` durante o build.
- [x] O frontend é uma SPA com rewrite para `index.html`.
- [x] O banco e o Storage só são acessados pelo backend, exceto pela leitura pública das imagens.
- [x] Variáveis sensíveis ficam no servidor; o frontend expõe somente variáveis `VITE_*` não secretas.
- [x] O schema SQL autoritativo é reexecutável e migrations incrementais atendem bancos existentes.
- [x] Migration incremental `20260930_stripe_event_order_id.sql` alinha eventos a pedidos; o backend mantém compatibilidade temporária com o schema anterior.
- [ ] Root Directory e comandos de build dos dois projetos confirmados nos respectivos projetos Vercel.
- [ ] Ambientes de preview, staging e produção isolados por banco, Stripe e secrets.

### Autenticação e autorização

- [x] Cadastro e login com validação de entrada e senha bcrypt.
- [x] JWT de acesso em memória no frontend.
- [x] Refresh token opaco, com hash no banco, cookie `HttpOnly`, rotação e revogação por família.
- [x] Detecção de replay de refresh token.
- [x] Sessão absoluta de uma hora, restaurada após fechar/retornar ao site e após o redirecionamento do Stripe.
- [x] Cookie de produção compatível com frontend/API entre sites e proteção de origem contra CSRF.
- [x] Renovação concorrente entre abas tratada sem revogar indevidamente a família da sessão.
- [x] Logout e troca de senha revogam sessões relacionadas.
- [x] Recuperação de senha com token de uso único, expiração e resposta que evita enumeração de conta.
- [x] Guardas de autenticação e administração no backend e no roteamento do frontend.
- [x] Privilégio administrativo revalidado no banco.
- [ ] Verificação de e-mail para novas contas.
- [ ] MFA para administradores.
- [ ] Permissões administrativas granulares além de `is_admin`, caso a operação passe a ter equipes com funções distintas.

### Catálogo, conteúdo e imagens

- [x] PostgreSQL como fonte oficial de preço, moeda, disponibilidade e dados exibidos.
- [x] CRUD administrativo com arquivamento lógico de produto.
- [x] Sincronização do produto e preço correspondente no Stripe durante criação e alteração.
- [x] Novo Price criado e Price anterior desativado quando o valor muda.
- [x] Catálogo público e administrativo com paginação por cursor.
- [x] Upload restrito a uma imagem por requisição e 4 MiB de entrada.
- [x] Validação real do arquivo, correção de orientação, redimensionamento e conversão para WebP.
- [x] Bucket público limitado a WebP de até 2 MiB.
- [x] Allowlist HTTPS para imagens externas cadastradas em produto.
- [x] Rastreamento de imagem pendente/anexada e limpeza assíncrona de órfãs.
- [x] Conteúdo da introdução editável pelo administrador, com fallback seguro.
- [x] Script de importação inicial do catálogo Stripe para o banco.
- [ ] Teste de reconciliação em massa para divergências entre catálogo local e Stripe.
- [x] Interface administrativa `/admin/sync` para comparar catálogo, estoque e valor e corrigir divergências nos dois sentidos pelo código Stripe.
- [x] Logs persistentes de sincronização com autor, lote, ação, resultado e snapshots; importação completa com progresso e preservação de reservas.

### Checkout e pagamentos

- [x] Checkout exige usuário autenticado, itens válidos, endereço brasileiro e `Idempotency-Key`.
- [x] Endereços pertencem à conta do cliente, podem ser criados, selecionados e editados no checkout, com um único endereço principal.
- [x] O pedido guarda um snapshot do endereço salvo; edições futuras não alteram pedidos existentes.
- [x] Uma chave só retoma o mesmo carrinho e endereço enquanto a Checkout Session está aberta; tentativas concluídas nunca retornam a tela de sucesso por `POST /api/checkout`.
- [x] Cada decisão de iniciar o pagamento usa uma nova chave; abandonar e refazer uma compra idêntica cria outro pedido.
- [x] Cliente envia apenas `productId`, quantidade e `shippingAddressId`; endereço, preço e total são resolvidos no servidor.
- [x] Pedido, snapshots, reserva e movimentos são criados atomicamente no Postgres.
- [x] Checkout Sessions em `hosted_page`, sem Payment Element ou Stripe.js no bundle do frontend.
- [x] Retorno ao site por `success_url` contendo apenas `order_id`; nenhum `client_secret` trafega pelo frontend.
- [x] Cartão sempre disponível e Pix habilitado somente quando a configuração Stripe padrão informa disponibilidade.
- [x] Boleto fora do escopo atual.
- [x] Identificador da Checkout Session e do PaymentIntent associados ao pedido.
- [x] Idempotência no banco e na criação da sessão Stripe.
- [x] Compensação de falhas de sessão, associação ou agendamento com liberação da reserva.
- [x] Webhook com raw body, verificação de assinatura e limite de payload.
- [x] Persistência durável e deduplicação do evento antes da resposta `202`.
- [x] Processamento assíncrono e idempotente de eventos de Checkout Session, PaymentIntent e reembolso.
- [x] Reconciliação autenticada e pontual do próprio pedido na página de sucesso.
- [x] Estados terminais protegidos contra regressão por eventos atrasados.
- [ ] Endpoint e eventos configurados no Stripe de cada ambiente e testados com assinatura real.
- [ ] Fluxos live de cartão, Pix, cancelamento, falha, expiração e reembolso validados ponta a ponta.
- [ ] Ação de reembolso iniciada pelo painel da aplicação; hoje a aplicação apenas recebe o evento do reembolso feito no Stripe.

### Estoque, pedidos e fulfillment

- [x] Separação entre `on_hand` e `reserved`, com invariantes no banco.
- [x] Reserva de 15 minutos por pedido e produto.
- [x] Ledger de movimentos para reserva, venda, liberação, ajuste e devolução manual.
- [x] Venda reduz saldo físico somente após confirmação financeira.
- [x] Falha, cancelamento e expiração liberam a reserva.
- [x] Reembolso financeiro não altera estoque sem devolução física explícita.
- [x] Snapshot imutável de nome, preço, moeda, quantidade e imagem no item do pedido.
- [x] Snapshot do endereço no pedido.
- [x] Histórico de pedidos do cliente e consulta administrativa com filtros e cursor.
- [x] Notas administrativas auditadas por autor e data.
- [x] Fluxo de fulfillment `paid -> packing -> shipped -> delivered`, com rastreio obrigatório quando aplicável.
- [x] Alerta assíncrono para pedido pago que permaneça sem avanço operacional.
- [ ] Testes de concorrência contra o Postgres para disputa de último item e repetição simultânea da mesma chave.
- [ ] Política operacional documentada para devolução parcial, troca e estorno.

### Tarefas assíncronas e remoção dos crons

- [x] Nenhum cron de aplicação permanece configurado.
- [x] Um tópico durável, `storecy-tasks`, recebe tarefas tipadas por domínio.
- [x] Eventos Stripe são processados por `payment-event`.
- [x] Confirmações são enviadas por `email-delivery` com outbox e idempotência.
- [x] Cada checkout agenda sua própria `reservation-expiry`.
- [x] Cada imagem potencialmente órfã agenda `product-image-cleanup`.
- [x] Cada pedido pago agenda `order-fulfillment-check`.
- [x] Pagamentos terminais processados e pedidos entregues agendam `order-pii-redaction`.
- [x] Tokens agendam sua própria limpeza por `refresh-token-cleanup` ou `password-reset-token-cleanup`.
- [x] Tarefas distantes são reencaminhadas até `notBefore`, respeitando o atraso máximo do provedor.
- [x] Retry exponencial e limite de tentativas implementados no consumidor.
- [x] Script `npm run tasks:backfill` cobre registros anteriores à adoção da fila.
- [ ] Trigger da Vercel Queue validado no projeto de produção.
- [ ] Backfill executado uma vez após a publicação da fila e das migrations.
- [ ] Agendamento de `order-pii-redaction` incluído também na compensação de falha durante a criação da Checkout Session.
- [ ] Procedimento administrativo de reenvio/replay para eventos e e-mails esgotados.
- [ ] Política de dead letter, retenção e investigação confirmada com a configuração efetiva do provedor.

### Privacidade, segurança e observabilidade

- [x] CORS com allowlist, credenciais e origem oficial de produção incluída.
- [x] Helmet, rate limiting, limites de body/upload, timeout e erros padronizados.
- [x] `requestId` propagado na resposta e nos logs.
- [x] Logs JSON com redação de chaves sensíveis conhecidas.
- [x] Sentry opcional fora de produção e obrigatório em produção.
- [x] Resend e remetente obrigatórios em produção.
- [x] PII de pedidos terminais anonimizada após `PII_RETENTION_DAYS`.
- [x] Acesso público revogado das tabelas privadas e RPCs críticas; backend usa credencial service role.
- [x] Métricas administrativas de eventos, estoque, fulfillment, e-mail e catálogo.
- [x] Health check público da API e health check administrativo de banco/Stripe.
- [ ] Secrets rotacionados e conferidos individualmente em preview/staging/produção.
- [ ] Alertas do Sentry e responsáveis operacionais configurados.
- [ ] Backup, PITR e restauração do Supabase testados.
- [ ] Prazo de retenção de PII aprovado pela política jurídica/contábil da operação.
- [ ] CSP do frontend revisada para remover permissões de Stripe.js/API/frame que sobraram da integração embarcada anterior e não são necessárias ao redirecionamento hospedado.

### Qualidade e entrega

- [x] Backend com TypeScript, testes Vitest e validação da configuração de deploy.
- [x] Frontend com TypeScript, ESLint, Vitest e build Vite.
- [x] CI para backend e frontend com `npm ci`, auditoria e `npm run check`.
- [x] Removida a configuração de atualizações semanais do Dependabot.
- [x] Testes unitários para tarefas, validação, pagamentos e contratos essenciais de checkout.
- [x] Testes de frontend para autenticação e apresentação de status do pedido.
- [ ] Banco efêmero ou isolado em testes de integração.
- [ ] Testes de contrato com uma conta Stripe de teste controlada.
- [ ] E2E de navegador para cadastro, login, carrinho, checkout, retorno e histórico.
- [ ] Testes de carga, concorrência e falhas de provedores.
- [ ] Orçamento de bundle e divisão de código das rotas mais pesadas.
- [ ] Auditoria automatizada de acessibilidade das jornadas principais.

## 2. Pendências para o próximo deploy de produção

Estes itens são bloqueadores operacionais mesmo quando o código correspondente já existe.

### P0 — banco e credenciais

- [ ] Fazer backup do banco de produção.
- [ ] Aplicar `backend/database/create-database.sql` em um banco novo; em banco já existente, revisar o baseline e aplicar as migrations incrementais necessárias.
- [ ] Aplicar `backend/database/20261002_catalog_sync.sql` em bancos existentes para criar os logs administrativos e a RPC transacional de sincronização.
- [ ] Aplicar `backend/database/20260928_service_role_privileges.sql` se os privilégios da service role ainda não estiverem garantidos.
- [ ] Aplicar `backend/database/20260929_checkout_sessions.sql` antes de publicar o backend com Checkout Sessions.
- [ ] Aplicar `backend/database/20260930_stripe_event_order_id.sql` para persistir a associação entre eventos Stripe e pedidos.
- [ ] Aplicar `backend/database/20261001_user_addresses.sql` antes de publicar a seleção de endereços no checkout.
- [ ] Confirmar em `public.orders` a coluna e o índice único de `stripe_checkout_session_id`.
- [ ] Confirmar que a credencial em `SUPABASE_SECRET_KEY` é a chave secreta/service role do projeto correto, nunca uma chave publicável.
- [ ] Configurar `JWT_SECRET` e `JWT_REFRESH_SECRET` distintos, aleatórios e com pelo menos 32 caracteres.

### P0 — backend Vercel

- [ ] Confirmar Root Directory `backend`.
- [ ] Confirmar Install Command `npm ci` e Build Command `npm run build`.
- [ ] Confirmar Output Directory `public`; o próprio build valida pasta e entradas serverless.
- [ ] Configurar `NODE_ENV=production`, `FRONTEND_URL=https://storecy.vercel.app` e `CORS_ORIGINS` somente com origens autorizadas.
- [ ] Configurar `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM`, `SENTRY_DSN` e `PII_RETENTION_DAYS`.
- [ ] Confirmar que `api/tasks.ts` está conectado ao tópico `storecy-tasks` e recebe entregas.
- [ ] Validar `GET /api/health` e `GET /api/admin/health` após o deploy.

### P0 — Stripe

- [ ] Usar chaves e webhook do mesmo modo (`test` ou `live`) em cada ambiente.
- [ ] Registrar `POST https://<backend>/api/webhooks/stripe`.
- [ ] Assinar `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`, `payment_intent.created`, `payment_intent.processing`, `payment_intent.succeeded`, `payment_intent.payment_failed`, `payment_intent.canceled` e `charge.refunded`.
- [ ] Confirmar cartão na configuração de pagamento padrão e habilitar Pix somente se desejado e disponível para a conta.
- [ ] Fazer uma compra de teste e conferir `orders`, `stripe_events`, `inventory_reservations`, `inventory_movements` e `email_notifications`.

### P0 — frontend Vercel

- [ ] Confirmar Root Directory `frontend_ecomerce`.
- [ ] Configurar `VITE_BACKEND_URL` com a URL HTTPS exata do backend e `VITE_SENTRY_DSN`.
- [ ] Validar preflight CORS e cookie de refresh a partir de `https://storecy.vercel.app`.
- [ ] Validar cadastro, login, recarga da página, logout e recuperação de senha.
- [ ] Validar redirecionamento ao Stripe e retorno para `/checkout/success?order_id=...`.

### P0 — migração para filas

- [ ] Publicar backend e consumidor antes de executar o backfill.
- [ ] Executar `npm run tasks:backfill` uma única vez com variáveis do ambiente correto.
- [ ] Confirmar consumo sem duplicação e sem crescimento permanente de eventos/e-mails falhos.
- [ ] Observar pelo menos um ciclo de expiração de reserva, limpeza de imagem e entrega de e-mail.

## 3. Ordem segura de publicação

1. [ ] Criar backup e registrar o ponto de restauração.
2. [ ] Aplicar e verificar schema, privilégios e migration de Checkout Sessions.
3. [ ] Configurar secrets e integrações do ambiente.
4. [ ] Publicar o backend e verificar health checks.
5. [ ] Configurar o webhook Stripe e enviar um evento de teste assinado.
6. [ ] Confirmar a entrega de uma tarefa simples no tópico `storecy-tasks`.
7. [ ] Executar o backfill uma única vez.
8. [ ] Publicar o frontend com a URL correta do backend.
9. [ ] Executar smoke tests de autenticação, catálogo, conteúdo, checkout, webhook, estoque, e-mail e pedidos.
10. [ ] Monitorar erros, fila e métricas administrativas antes de promover o deploy.

## 4. Critérios de aceite

### Compra e pagamento

- [ ] Duas requisições simultâneas com a mesma chave resultam no mesmo pedido/sessão.
- [x] Uma nova compra com os mesmos produtos não reutiliza um pedido pago nem pode pular a página hospedada do Stripe.
- [x] Dois checkouts intencionais com os mesmos itens geram pedidos diferentes; somente retries técnicos da mesma submissão reutilizam a chave.
- [ ] Dois clientes disputando o último item não vendem estoque negativo.
- [ ] Preço alterado no payload do navegador não altera o valor cobrado.
- [ ] Cartão aprovado leva o pedido a `paid` e converte a reserva em venda uma única vez.
- [ ] Pix, quando habilitado, permanece aguardando até confirmação assíncrona e depois conclui o pedido.
- [ ] Cancelamento, falha e expiração liberam a reserva uma única vez.
- [ ] Repetição e inversão de eventos Stripe não regridem estados terminais.
- [ ] Reembolso altera o estado financeiro sem devolver estoque automaticamente.

### Sessão e segurança

- [ ] Access token não aparece em `localStorage` ou `sessionStorage`.
- [x] Cookie de refresh possui `HttpOnly`, `Secure`, `SameSite=None`, `Partitioned`, duração máxima de uma hora e path restrito em produção.
- [x] Refresh concorrente é coordenado na mesma aba e recuperado com retry limitado entre abas.
- [ ] Reutilização de refresh token revogado invalida a família.
- [ ] Usuário comum recebe `403` nas rotas administrativas.
- [ ] Origem não autorizada não recebe cabeçalho CORS permissivo.
- [ ] Erros `500` não expõem stack, SQL, secrets ou dados privados.

### Operação assíncrona

- [ ] Webhook válido recebe `202` depois de persistir o evento e publicar a tarefa.
- [ ] Falha temporária do Stripe, Supabase ou Resend é repetida sem duplicar efeito.
- [ ] Evento/e-mail que esgota tentativas gera alerta e permanece auditável.
- [ ] Tarefas adiadas sobrevivem a novos deploys e executam apenas após `notBefore`.
- [ ] Backfill pode ser repetido sem duplicar efeitos de negócio.

### Dados e privacidade

- [ ] Usuários públicos não leem nem alteram tabelas privadas diretamente.
- [ ] Imagem órfã é removida e imagem anexada é preservada.
- [ ] Pedido entregue/cancelado/reembolsado é anonimizado somente depois da retenção configurada.
- [ ] Restore de backup recupera catálogo, pedidos, estoque, ledger e eventos.

## 5. Decisões que não fazem mais parte do projeto

- [x] Crons e varreduras globais foram substituídos por tarefas criadas no momento do evento de negócio.
- [x] Payment Element e Stripe.js foram removidos do fluxo; o pagamento ocorre no Checkout hospedado.
- [x] `client_secret` não faz parte do contrato frontend/backend.
- [x] O frontend não confirma PaymentIntent nem escolhe o valor financeiro.
- [x] Estoque em metadata do Stripe não é a fonte oficial; o Postgres mantém saldo, reserva e ledger.
- [x] A antiga tabela `transactions` não integra o fluxo; instalações legadas a preservam como `transactions_legacy`.
- [x] Não existe acesso direto do navegador às tabelas privadas do Supabase.
- [x] Não existe endpoint público de manutenção periódica.

## Sincronização administrativa de catálogo — 02/10/2026

- [x] Parte 1: API administrativa para comparar e sincronizar Stripe/Supabase pelo código Stripe, com auditoria persistente e estoque sem alterar reservas.
- [x] Parte 2: tela com duas seções, ações individuais, importação completa com progresso e teste de conexões transferido do painel ADM.
- [x] Parte 3: testes, builds e documentação da migration e das regras de sincronização.
- [ ] Aplicar a migration de sincronização no Supabase e validar os dois sentidos com serviços reais.

Regras e operação:

- [x] Buscar todos inclui produtos arquivados e percorre todas as páginas de Stripe/Supabase. Produtos já presentes no destino ficam cinza.
- [x] Importar produto individual inclui estoque/valor e ignora existentes; os ajustes individuais copiam somente estoque ou valor. Importar todos também atualiza os dados dos produtos existentes.
- [x] Estoque Stripe vem de `metadata.stock`, deve ser inteiro de 0 a 1.000.000 e corresponde a `on_hand - reserved` no Supabase. Dado ausente/inválido é sinalizado sem zerar estoque; preço precisa ser padrão ativo, avulso, por unidade, em BRL e positivo até R$ 1.000.000.
- [x] Lotes são executados na tela, por produto, com identificador comum e progresso. Manter a aba aberta; falhas de produto não impedem os demais. Falha de autorização/auditoria/rate limit interrompe e informa itens não processados. Após falha parcial, buscar novamente antes de repetir.
- [x] As operações exigem auditoria disponível antes de alterar o destino. Consultar os últimos 100 logs na tela e registros anteriores em `catalog_sync_logs`.
- [x] Testes com PostgreSQL isolado (PGlite) verificam importação sem duplicação, atomicidade, reservas, ajustes seletivos e bloqueio dos papéis públicos.
- [x] Verificação em 02/10/2026: `npm run check` passou no backend (64 testes) e frontend (17 testes); revisão no navegador com respostas simuladas validou desktop/celular, as duas direções, ações, lote com falha parcial, logs, conexões e guarda administrativa.
- [ ] Em cada ambiente, validar importação ausente, produto já vinculado, diferença de estoque/valor, saldo zero com reserva, lote com falha parcial e logs; confirmar que checkout continua lendo Supabase.

## 6. Backlog priorizado após estabilização

### P1 — confiabilidade e operação

- [x] Validar sincronização de catálogo com PostgreSQL isolado em PGlite.
- [ ] Ampliar integração para demais módulos e serviços externos isolados.
- [ ] Adicionar E2E das jornadas críticas e teste de concorrência do estoque.
- [ ] Criar ações administrativas auditadas para replay de evento, reenvio de e-mail e início de reembolso.
- [ ] Definir dashboards, alertas, SLOs e runbooks de incidentes.
- [ ] Remover permissões de CSP que pertenciam à integração Stripe embarcada.

### P2 — escala e governança

- [ ] Introduzir papéis administrativos granulares quando houver necessidade operacional comprovada.
- [ ] Automatizar testes de restauração, carga e degradação de provedores.
- [ ] Definir orçamento de bundle, code splitting e métricas de experiência do usuário.
- [ ] Automatizar verificação de acessibilidade.
- [ ] Avaliar cálculo real de frete, tributos, nota fiscal, trocas e devoluções somente quando essas regras forem definidas; o comportamento atual de frete grátis não deve mudar implicitamente.

## 7. Trabalho DevOps/QAOps e marca — 15/10/2026

- [x] Parte 1: conferir base/acessos, instalar pelos lockfiles e registrar baseline real (64 testes backend e 17 frontend).
- [x] Parte 2: caracterização, riscos C01–C10, fichas G1–G4 e decisões resumidas em `docs/devops-qaops/`.
- [x] Parte 3: validar relatórios, isolamento de credenciais, dependências corrigidas e pipeline com agregador obrigatório.
- [x] Parte 4: preservar três commits/runs de aprovação, mutação e correção na branch de trabalho, com evidências reais.
- [x] Parte 5: produzir Word de 8 páginas, 10 slides editáveis e roteiro estimado de 11 minutos, revisados tecnicamente.
- [x] Parte 6: atualizar dependências sinalizadas pela auditoria do PR #9 antes da integração na main.
- [ ] Revisão humana de Gabriel, confirmação do formato individual e acesso do professor ao repositório privado.

A identidade visual passa a Lerium Shop com logo/favicons SVG e marca compartilhada no cabeçalho/rodapé; contratos internos e infraestrutura existente são preservados. Baseline e decisões estão nos documentos do trabalho. Pendências operacionais e de produção anteriores continuam abertas.

Execuções reais preservadas: aprovado `38753499480` (48 s), reprovado `38753904896` (47 s) e corrigido `38754195324` (46 s), no PR #9. A mutação foi removida por novo commit, mantendo 64 + 17 testes e quatro auditorias sem vulnerabilidades. A main exige o check real `quality-gate`, inclusive para administradores, com force push/exclusão proibidos. O HEAD final da entrega deve receber seu próprio CI; o resultado atual pode ser consultado no PR. Revisão humana, ensaio e acesso do professor permanecem separados das verificações técnicas.
