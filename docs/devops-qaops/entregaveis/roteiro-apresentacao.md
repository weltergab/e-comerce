# Roteiro de apresentação individual

Gabriel Welter Neres · Lerium Shop · defesa planejada em **11 minutos**, incluindo navegação. Os tempos são estimativas; o ensaio humano ainda não foi confirmado. A apresentação tem 10 slides. Ajuste a fala após ensaiar com cronômetro para ficar entre 10 e 12 minutos.

## Preparação

Abra slides.pptx, o [PR #9](https://github.com/weltergab/e-comerce/pull/9), os três runs abaixo e o relatório Word. Entre no GitHub com uma conta que tenha acesso ao repositório privado e confirme antecipadamente o acesso do professor. Confirme com ele a execução individual; não diga que houve dispensa formal se isso não foi confirmado.

| Destino | Link |
| --- | --- |
| Repositório | https://github.com/weltergab/e-comerce |
| Workflow | https://github.com/weltergab/e-comerce/actions/workflows/ci.yml |
| PR de entrega | https://github.com/weltergab/e-comerce/pull/9 |
| Aprovado | https://github.com/weltergab/e-comerce/actions/runs/38753499480 |
| Reprovado | https://github.com/weltergab/e-comerce/actions/runs/38753904896 |
| Corrigido | https://github.com/weltergab/e-comerce/actions/runs/38754195324 |
| Teste C01 preservado | https://github.com/weltergab/e-comerce/blob/1c566db227e994587e0ae8a74d7376d4fc303ed4/backend/tests/unit/catalog-sync.schemas.test.ts#L10 |
| Mutação isolada | https://github.com/weltergab/e-comerce/commit/58aa628156c9afd49c59c50e590f0a445f1d4c4e |
| Correção | https://github.com/weltergab/e-comerce/commit/1c566db227e994587e0ae8a74d7376d4fc303ed4 |

Os links individuais dos artefatos e os SHAs completos estão em [experimentos.md](../experimentos.md). Navegue pelos runs preservados; não precisa inserir defeito ou fazer merge ao vivo.

## Fala e operação por slide

### Slide 1 · 0:00–0:45 · Identificação e objetivo

“Sou Gabriel Welter Neres. Este trabalho usa o Lerium Shop para mostrar como a qualidade entra no fluxo de desenvolvimento. O objetivo é detectar uma alteração incorreta, preservar o diagnóstico e impedir sua integração. Realizei o trabalho individualmente com assistência de Codex, registrando as decisões e a validação técnica. O enunciado prevê dupla e essa adaptação está explícita na entrega.”

Transição: “Vou situar primeiro a aplicação e a regra que escolhi verificar.”

### Slide 2 · 0:45–1:40 · Aplicação e arquitetura

“O frontend React/Vite conversa com uma API Express em TypeScript. O PostgreSQL no Supabase é a fonte oficial de catálogo, saldo e reservas. Stripe oferece os produtos financeiros e o Checkout hospedado. Vercel hospeda os projetos existentes e processa tarefas com Queues. O trabalho aproveitou essa estrutura sem recriar banco, ambiente de produção ou conta de pagamento. A marca visível agora é Lerium Shop; identificadores internos e o domínio existente foram preservados para compatibilidade.”

Aponte o caminho frontend, API e provedores no diagrama. Transição: “Nesse contexto, a sincronização administrativa tem riscos concretos.”

### Slide 3 · 1:40–2:35 · Funcionalidade e riscos

“A sincronização compara pelo código Stripe e pode importar ou ajustar estoque e preço nos dois sentidos. No banco, disponível é físico menos reservado. Se copio disponível dois quando há quatro reservados, o físico precisa virar seis e a reserva continuar quatro. Também preciso impedir importação duplicada, dados inválidos e gravações parciais. Antes de escrever, o serviço exige auditoria disponível. Esses riscos determinaram os casos de teste e os gates.”

Transição: “O próximo passo foi ligar essas verificações a cada alteração.”

### Slide 4 · 2:35–3:35 · Pipeline e gatilhos

“O mesmo workflow existente executa por pull request e por push na main. Cada projeto usa npm ci com seu lockfile e Node 22. As etapas identificam build, tipos, lint, testes e auditorias. Os comandos preservam seu código de erro. Mesmo depois de uma falha, a finalização guarda diagnóstico e publica artefatos. O agregador quality-gate só aprova quando os dois jobs, inclusive a publicação, terminam com sucesso. Não apresentei isso como bloqueio do deploy Vercel: comprovei o CI e a proteção de merge.”

Abra brevemente ci.yml e mostre eventos, jobs e needs. Transição: “Essas etapas verificam comportamentos diferentes.”

### Slide 5 · 3:35–4:25 · Estratégia de testes

“Reaproveitei 64 casos backend e 17 frontend. O backend inclui oito testes com PostgreSQL PGlite efêmero, lendo o SQL real e limpando o banco entre casos. Unitários verificam funções puras ou usam mocks para respostas externas. Há entradas válidas e inválidas, repetição, atomicidade e preservação de reservas. PGlite não prova configuração ou concorrência Supabase, e mocks não fazem chamadas reais ao Stripe. A ausência de testes retorna erro; suítes ausentes ou casos ignorados impedem aprovação.”

Transição: “Os gates transformam esses resultados em uma decisão objetiva.”

### Slide 6 · 4:25–5:20 · Quality gates

“G1 exige build válido nos dois projetos. G2 exige zero erros estáticos e tipos válidos. G3 exige os casos obrigatórios aprovados, relatórios coerentes e upload concluído. G4 bloqueia avisos altos ou críticos em toda a árvore e em produção. Os limites preservam contratos já aceitos e a política existente. Na baseline, a auditoria detectou vulnerabilidades prévias; corrigi dependências antes do experimento. Falha, cancelamento, skip ou evidência ausente não equivalem a aprovação.”

Mostre as fichas completas no Word se perguntarem sobre os seis campos. Transição: “Agora vou mostrar os registros reais.”

### Slide 7 · 5:20–6:15 · Aprovação e artefatos

Abra o run **38753499480**. Mostre o evento pull_request, o commit d2eee6d e os três jobs aprovados. Abra a seção Artifacts e um manifesto/JUnit recuperado.

“Este estado aprovou 81 casos e as quatro auditorias. Os artefatos contêm JUnit, JSON, logs e manifesto. No PR, o head da branch pode ser diferente do merge temporário testado; os dois SHAs estão registrados. A duração de 48 segundos inclui preparação e espera. A captura do slide é um relatório local dos dados reais da API e artefatos, identificado como tal.”

Transição: “Mantive esse estado e introduzi uma mudança isolada.”

### Slide 8 · 6:15–7:45 · Reprovação e diagnóstico

Abra o commit **58aa628** e destaque a troca de subtração por soma. Depois abra o run **38753904896**, a etapa G3 backend e o diagnóstico em tests.log ou JUnit. Mostre esperado 4 e recebido 8. Mostre também o segundo teste: esperado -4 e recebido 8.

“Não mudei o teste para aceitar o defeito. Dois testes detectaram a regressão e 62 de 64 backend passaram. Os oito de SQL e os 17 frontend continuaram aprovados. Build, lint e auditorias também passaram. G3 localizou o erro na comparação da aplicação. O quality-gate reprovou, os artefatos negativos foram preservados e a API do PR registrou blocked pela proteção da main. Não houve escrita em estoque real: essa função é pura e os provedores estão isolados nos testes.”

Para demonstrar o bloqueio histórico, abra `evidencias/reprovado/merge-status.json`; a tela atual do PR já corresponde à versão corrigida. Transição: “A recuperação precisa corrigir a causa e preservar essa evidência.”

### Slide 9 · 7:45–9:10 · Correção e comparação

Abra o commit **1c566db** e o run **38754195324**. Mostre retorno da subtração, 64 + 17 aprovações e os dois artefatos corrigidos.

“A correção foi um novo commit. Não apaguei o experimento, não reescrevi histórico e não reduzi o gate. O cálculo voltou a ser igual ao aprovado inicial. As durações foram 48, 47 e 46 segundos; são três medições pontuais, sem afirmar uma tendência. A comparação mostra a relação entre mudança, diagnóstico e recuperação. Novos commits de documentação também exigem CI do HEAD final do PR.”

Transição: “O que essa evidência permite concluir e o que permanece aberto?”

### Slide 10 · 9:10–11:00 · Análise crítica, contribuição e limites

“Os gates cobriram as regras selecionadas e forneceram feedback com arquivo, etapa e valores. Ainda preciso verificar manualmente jornadas completas, serviços reais e concorrência. Manter essa solução exige atualizar contratos, fixtures, dependências, actions e evidências antes da retenção expirar; não medi custo financeiro. Uma automação isolada roda comandos. DevOps/QAOps conecta esses comandos ao versionamento, aos critérios de risco, ao bloqueio de integração e à responsabilidade por decidir.”

“Para evoluir deploy, seria necessário promover explicitamente o mesmo SHA ou artefato aprovado, validar permissões e rollback. Para observabilidade, validar alertas e correlação de pedido, evento e tarefa nos serviços existentes. O trabalho foi individual, com assistência registrada e sem segundo integrante fictício. A minha revisão final, o ensaio e a confirmação do acesso do professor são atividades humanas registradas separadamente.”

Feche mostrando o PR pronto para revisão, relatório Word e documentos de decisão. Reserve a parte final desta janela para transições ou retomada de evidências se a navegação atrasar.

## Operação alternativa e apoio local

Se a rede estiver lenta, abra as capturas/HTML/JUnit/JSON em `../evidencias/aprovado`, `reprovado` e `corrigido`. Declare que são registros dos runs anteriores com IDs e SHAs preservados. As capturas não substituem as execuções reais, que continuam vinculadas no repositório privado.

Para demonstrar um novo gatilho sem reinserir defeito, faça uma pequena alteração documental na branch de trabalho e publique um novo commit: o PR já aberto dispara automaticamente o CI, como observado nos commits anteriores. Espere o resultado e não use essa execução para substituir os três cenários históricos. O workflow_dispatch declarado é suplementar e não foi usado como prova principal; sua disponibilidade na interface depende da versão do workflow na branch padrão.

## Respostas curtas para a defesa

| Pergunta | Resposta |
| --- | --- |
| Quais riscos foram cobertos? | Comparação, entradas, repetição, reservas, seletividade, atomicidade, privilégios e auditoria em C01–C10. Provedores reais e concorrência permanecem fora da prova. |
| O feedback é rápido e compreensível? | C01 falhou localmente em 0,342 s de suíte; os runs completos levaram 46–48 s. O log mostrou esperado/recebido e o arquivo. São medições pontuais. |
| O que continua manual? | Configuração/migrations por ambiente, jornadas completas, autenticação entre domínios, webhooks/filas reais, concorrência e revisão dos requisitos. |
| Qual o custo de manutenção? | Alinhar mocks/fixtures e SQL, atualizar componentes e actions, investigar falhas e preservar evidências. Não há custo financeiro medido. |
| Automação é DevOps/QAOps? | A prática inclui responsabilidade, rastreabilidade, critérios de risco e feedback que condiciona integração, além de executar scripts. |
| Como incluir deploy e observabilidade? | Vincular promoção ao mesmo SHA aprovado, validar rollback/permissões e testar métricas, alertas, correlação e recuperação nos serviços existentes. |
| PGlite equivale ao Supabase real? | Executa PostgreSQL e SQL reais em memória, mas não toda infraestrutura/configuração ou concorrência Supabase. |
| Mock comprova integração externa? | Comprova como o código reage à resposta simulada; não comprova disponibilidade ou configuração do provedor. |
| Análise estática substitui testes? | Não: build/lint passaram na mutação; os testes de comportamento detectaram a diferença incorreta. |
| CI impede deploy Vercel? | O bloqueio comprovado é de integração na main; o vínculo entre gates e deploy não foi demonstrado. |

- [ ] Gabriel ensaiou com cronômetro entre 10 e 12 minutos.
- [ ] Gabriel revisou repositório, relatório, slides e evidências.
- [ ] Gabriel confirmou execução individual e acesso do professor.
