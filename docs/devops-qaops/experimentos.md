# Experimentos reais

PR: https://github.com/weltergab/e-comerce/pull/9. Branch `codex/devops-qaops`; evento automático `pull_request` nas três execuções. Sem merge na main, reescrita de histórico ou exclusão de branches.

## Hipótese e procedimento

Registrou-se antes da mutação que trocar somente `source.stock - target.stock` por soma em `compareSyncProduct` faria C01 receber 8 em vez de 4 e reprovar G3. Os testes e expectativas permaneceram corretos. A função é pura e os testes usam SQL efêmero/mocks, sem escrita nos provedores reais. Production permanecia no SHA original da main conforme deployments consultados. A correção restaurou a subtração em um novo commit.

| Cenário | Head SHA | Run/tentativa | Backend | Frontend | quality-gate | Duração |
| --- | --- | --- | --- | --- | --- | --- |
| aprovado | `d2eee6d` | [38753499480/1](https://github.com/weltergab/e-comerce/actions/runs/38753499480) | success | success | success | 48 s |
| reprovado | `58aa628` | [38753904896/1](https://github.com/weltergab/e-comerce/actions/runs/38753904896) | failure | success | failure | 47 s |
| corrigido | `1c566db` | [38754195324/1](https://github.com/weltergab/e-comerce/actions/runs/38754195324) | success | success | success | 46 s |

Duração: intervalo entre run_started_at e a última conclusão de job; inclui preparação/espera e não representa só tempo dos testes. Valores são medições pontuais, sem base estatística para generalizações. Horários completos abaixo em UTC e manifestos.

## Aprovado

- Commit: [d2eee6df55c43e0c043d30decbba20da9d086419](https://github.com/weltergab/e-comerce/commit/d2eee6df55c43e0c043d30decbba20da9d086419).
- Início: 2026-10-15T14:40:32+00:00; fim: 2026-10-15T14:41:20+00:00; duração: 48 s.
- Checkout efetivamente testado: `2692d500c1d649e7df8a4b44c903dbcecfc440a1` (merge de validação do PR, distinto do head da branch).
- Runtime real do runner: Node v22.23.3, npm 10.9.9.
- backend: 64 executados, 64 aprovados, 0 falhas, 0 ignorados; JUnit/JSON/manifesto em `evidencias/aprovado/backend/`.
- frontend: 17 executados, 17 aprovados, 0 falhas, 0 ignorados; JUnit/JSON/manifesto em `evidencias/aprovado/frontend/`.
- Gates: G1–G4 aprovados em ambos os projetos; validação de relatórios e uploads concluídos.
- Artefatos: `backend-38753499480-1` ([abrir](https://github.com/weltergab/e-comerce/actions/runs/38753499480/artifacts/11982840729)), `frontend-38753499480-1` ([abrir](https://github.com/weltergab/e-comerce/actions/runs/38753499480/artifacts/11982042936)). Retenção de 90 dias, cópia selecionada sanitizada no Git.
- Visão geral: `evidencias/aprovado/overview.html`; captura desse relatório local em `captura.png`, identificada como renderização da API, sem imitar a interface GitHub.

## Reprovado

- Commit: [58aa628156c9afd49c59c50e590f0a445f1d4c4e](https://github.com/weltergab/e-comerce/commit/58aa628156c9afd49c59c50e590f0a445f1d4c4e).
- Início: 2026-10-15T14:43:15+00:00; fim: 2026-10-15T14:44:02+00:00; duração: 47 s.
- Checkout efetivamente testado: `05a65926d9afc36042a193e68d93e9aba2bff855` (merge de validação do PR, distinto do head da branch).
- Runtime real do runner: Node v22.23.3, npm 10.9.9.
- backend: 64 executados, 62 aprovados, 2 falhas, 0 ignorados; JUnit/JSON/manifesto em `evidencias/reprovado/backend/`.
- frontend: 17 executados, 17 aprovados, 0 falhas, 0 ignorados; JUnit/JSON/manifesto em `evidencias/reprovado/frontend/`.
- Gates: G1/G2/G4 aprovados; G3 backend reprovado por asserção, verificação de relatórios backend skipped, finalizador/upload executados e decisão global reprovada.
- Artefatos: `backend-38753904896-1` ([abrir](https://github.com/weltergab/e-comerce/actions/runs/38753904896/artifacts/11982243178)), `frontend-38753904896-1` ([abrir](https://github.com/weltergab/e-comerce/actions/runs/38753904896/artifacts/11981264840)). Retenção de 90 dias, cópia selecionada sanitizada no Git.
- Visão geral: `evidencias/reprovado/overview.html`; captura desse relatório local em `captura.png`, identificada como renderização da API, sem imitar a interface GitHub.

## Corrigido

- Commit: [1c566db227e994587e0ae8a74d7376d4fc303ed4](https://github.com/weltergab/e-comerce/commit/1c566db227e994587e0ae8a74d7376d4fc303ed4).
- Início: 2026-10-15T14:45:10+00:00; fim: 2026-10-15T14:45:56+00:00; duração: 46 s.
- Checkout efetivamente testado: `f006864385f186bd272c1d47b8b556660420a05e` (merge de validação do PR, distinto do head da branch).
- Runtime real do runner: Node v22.23.3, npm 10.9.9.
- backend: 64 executados, 64 aprovados, 0 falhas, 0 ignorados; JUnit/JSON/manifesto em `evidencias/corrigido/backend/`.
- frontend: 17 executados, 17 aprovados, 0 falhas, 0 ignorados; JUnit/JSON/manifesto em `evidencias/corrigido/frontend/`.
- Gates: G1–G4 aprovados em ambos os projetos; validação de relatórios e uploads concluídos.
- Artefatos: `frontend-38754195324-1` ([abrir](https://github.com/weltergab/e-comerce/actions/runs/38754195324/artifacts/11982203433)), `backend-38754195324-1` ([abrir](https://github.com/weltergab/e-comerce/actions/runs/38754195324/artifacts/11981439870)). Retenção de 90 dias, cópia selecionada sanitizada no Git.
- Visão geral: `evidencias/corrigido/overview.html`; captura desse relatório local em `captura.png`, identificada como renderização da API, sem imitar a interface GitHub.

## Diagnóstico e proteção

C01 exigiu stockDifference 4 e recebeu 8; o teste de vínculo em catalog-sync.service.test.ts exigiu -4 e recebeu 8. O backend teve duas falhas reais e o frontend manteve 17 aprovações. Os oito casos SQL permaneceram aprovados, delimitando que o defeito era na comparação da aplicação. A correção restabeleceu 64 + 17 aprovações sem retirar testes ou alterar limites.

Após confirmar o nome real do check, a proteção da main passou a exigir quality-gate com strict, inclusive para administradores; force push e exclusão ficam proibidos. Não se exige revisão de segundo integrante. Exclusão automática já estava desabilitada. A API informou mergeable_state=blocked durante a reprovação, apesar de não haver conflito textual (mergeable=true). Ver `evidencias/protecao.json` e `evidencias/reprovado/merge-status.json`.

O repositório continua privado. Gabriel precisa confirmar acesso do professor e formato individual; não houve convite ou mudança de visibilidade. CI e proteção de merge foram observados; bloqueio de deploy Vercel não foi demonstrado.

A aprovação corrigida não substitui o CI do HEAD final quando documentos ou ajustes posteriores gerarem novo commit. O registro da entrega final fica em entrega.md.
