# Estratégia e rastreabilidade

Os 64 casos backend e 17 frontend da base foram reaproveitados. Os unitários usam funções puras ou mocks; a integração PGlite executa PostgreSQL e SQL reais em memória. `checkout.contract.test.ts` verifica DTO/parser, não HTTP nem Stripe remoto. A suíte completa permanece obrigatória em ambos os projetos. Testes do controle de CI usam o executor nativo do Node e não entram nos 81 casos da aplicação.

| Caso/risco | Arquivo em backend/tests | Nome real do teste | Entrada e expectativa | Nível/gate |
| --- | --- | --- | --- | --- |
| C01/R1 decisão errada | unit/catalog-sync.schemas.test.ts | compara preço em centavos e estoque disponível e detecta o vínculo de preço | 6 e 2: diferença 4; igualdade sem divergência | Unitário/G3 |
| C02/R1 dinheiro | unit/catalog-sync.schemas.test.ts | compara preço em centavos e estoque disponível e detecta o vínculo de preço; sinaliza ausência de destino e moedas ou metadados incompatíveis | 10,10 e 10,00: 0,10; USD incompatível | Unitário/G3 |
| C03/R2 entrada | unit/catalog-sync.schemas.test.ts | não converte estoque ausente ou inválido (%s) em zero; permite estoque zero e não exige preço para atualizar só estoque | ausente, negativo, decimal, >1.000.000 rejeitados; zero aceito | Unitário/G3 |
| C04/R2 comando | unit/catalog-sync.schemas.test.ts | recusa direção, ação, lote e código inválidos | both/delete/código vazio/batch inválido rejeitados | Unitário/G3 |
| C05/R3 duplicação | contract/catalog-sync.database.test.ts | importa produto, preço, estoque e movimento atomicamente e repetições não duplicam | repetir import mantém um produto e um movimento | Integração/G3 |
| C06/R4 reservas | contract/catalog-sync.database.test.ts | define saldo disponível sem apagar reservas, altera só estoque e usa o vínculo Stripe | disponível 2 e reserva 4: físico 6/reserva 4 | Integração/G3 |
| C07/R4 seletividade | contract/catalog-sync.database.test.ts | atualiza somente valor e Price sem exigir estoque; define saldo disponível sem apagar reservas, altera só estoque e usa o vínculo Stripe | preço mantém 10/4; estoque mantém Nome local/20,00 | Integração/G3 |
| C08/R5 atomicidade | contract/catalog-sync.database.test.ts | falha de estoque desfaz também a importação do produto e rejeita atualizações sem destino | estoque -1: erro e zero produtos | Integração/G3 |
| C09/R6 acesso | contract/catalog-sync.database.test.ts | não permite acesso direto à auditoria/RPC pelos papéis do navegador | anon sem SELECT; authenticated sem EXECUTE; service_role com EXECUTE | Integração/G3 |
| C10/R7 auditoria/diagnóstico | unit/catalog-sync.service.test.ts | não escreve se não conseguir salvar auditoria e não trata falha de conexão como produto ausente | auditoria falha: não chama Stripe; conexão falha: SYNC_STRIPE_FAILED | Unitário com mocks/G3 |

G1 controla tipos/configuração/empacotamento, G2 padrões estáticos e G4 componentes vulneráveis, complementando os riscos funcionais R1–R7. Os casos incluem entradas positivas, negativas, repetição e preservação de estado. Não se adota percentual de cobertura como substituto de asserções relevantes.

## Isolamento e relatórios

`NODE_ENV=test` impede dotenv de ler arquivos privados no backend; `envDir:false` impede Vite de ler .env no frontend de testes. Clientes de Supabase/Stripe são lazy ou substituídos pelos mocks existentes. A execução em checkout limpo sem .env é a evidência de independência. Não são fornecidas credenciais ao CI.

`npm run test:ci` executa a mesma suíte uma vez com reporters default, JUnit e JSON. O verificador confere todos os arquivos de teste descobertos no projeto, quantidade positiva, todos os casos aprovados e contagens coerentes entre JUnit/JSON. `allowOnly:false` e `passWithNoTests:false` proíbem focos acidentais e ausência da suíte. Casos ignorados/todo também bloqueiam a aprovação pelo verificador. Falhas ainda produzem os relatórios reais; infraestrutura indisponível não produz sucesso fictício.

O inventário explícito em `scripts/required-test-suites.json` preserva as 16 suítes obrigatórias, incluindo os unitários do foco e a integração SQL: remover o arquivo também reprova G3. Novos testes descobertos entram na verificação completa. Mudanças legítimas de organização exigem revisar o inventário no mesmo PR.
