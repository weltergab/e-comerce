# Política de dependências

- O CI bloqueia advisories **altos ou críticos** em toda a árvore e repete a auditoria somente de produção.
- Dependências de produção devem permanecer sem vulnerabilidades altas/críticas.
- Exceções exigem escopo, mitigação, responsável e prazo; nunca se usa `npm audit fix --force` sem revisão.

## Exceção temporária ativa

| Advisory | Escopo | Mitigação | Prazo |
|---|---|---|---|
| `GHSA-82fw-gwwq-j7x9` (`vitest`/`@vitest/mocker`, moderada) | Somente desenvolvimento/CI | Executar apenas `vitest run`; não iniciar/expor UI ou servidor Vitest; inputs de testes pertencem ao repositório | Revisar/atualizar até **31/10/2026** |

Responsável: mantenedor do repositório. Dependabot está configurado semanalmente para sinalizar a versão corrigida compatível.
