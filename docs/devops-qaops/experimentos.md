# Experimentos reais

PR: https://github.com/weltergab/e-comerce/pull/9. Branch: `codex/devops-qaops`; evento automático `pull_request`. A main permanece no SHA original e hospeda o ambiente Production existente. Não houve merge nem exclusão de branches/commits.

## Hipótese registrada antes da mutação

Trocar somente `source.stock - target.stock` por `source.stock + target.stock` em `compareSyncProduct` deve reprovar G3: C01 exige 6 menos 2 igual a 4 e receberá 8. Os testes e suas expectativas permanecem corretos. A função é pura; o experimento não altera estoque real. A mutação ficará apenas entre dois commits novos na branch de trabalho.

## Aprovação inicial

- Commit `d2eee6df55c43e0c043d30decbba20da9d086419`.
- [Run 38753499480, tentativa 1](https://github.com/weltergab/e-comerce/actions/runs/38753499480): backend, frontend e quality-gate concluídos com sucesso.
- 64 testes backend, incluindo 8 de integração SQL; 17 frontend; quatro auditorias sem vulnerabilidades.
- JUnit, JSON, manifestos e auditorias recuperados em `evidencias/aprovado/`, com head SHA e SHA efetivamente testado separados nos manifestos.
- Artefatos `backend-38753499480-1` e `frontend-38753499480-1`, retenção de 90 dias; cópia selecionada preservada no repositório.

## Proteção observada

Após confirmar o nome real do check `quality-gate`, a API aceitou a proteção da main com check obrigatório/strict, aplicação também a administradores, force push e exclusão desabilitados. Não se exige aprovação de um segundo integrante. Exclusão automática após merge já estava desabilitada. O repositório permanece privado; acesso do professor ainda precisa de confirmação de Gabriel. Evidência sanitizada em `evidencias/protecao.json`.

Reprovação e recuperação serão registradas após suas execuções concluírem; a aprovação inicial não prova o resultado dos commits seguintes.
