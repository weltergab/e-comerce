# Política de dependências

- O CI bloqueia advisories **altos ou críticos** em toda a árvore e repete a auditoria somente de produção.
- Dependências de produção devem permanecer sem vulnerabilidades altas/críticas.
- Exceções exigem escopo, mitigação, responsável e prazo; nunca se usa `npm audit fix --force` sem revisão.

## Exceção encerrada em 15/10/2026

| Advisory | Escopo | Mitigação | Prazo |
|---|---|---|---|
| `GHSA-82fw-gwwq-j7x9` (`vitest`/`@vitest/mocker`, moderada) | Somente desenvolvimento/CI | Corrigida pela migração para Vitest **4.1.11**, que também elimina o tinypool vulnerável da árvore | Encerrada em **15/10/2026**, antes do prazo original de 31/10/2026 |

Responsável: mantenedor do repositório.

A baseline de 15/10/2026 encontrou ainda avisos altos/críticos em sharp, proxy-addr, source-map-js e tinypool; as correções pontuais e os resultados reais estão em `docs/devops-qaops/baseline.md` e nos artefatos do CI. Não há nova exceção ativa.

Em 22/11/2026, o PR #9 atualizou Multer para 2.5.0, Body Parser para 2.4.0, Zod para 4.6.7 e Vite para 7.3.8. A substituição de Zod é limitada a `@vercel/cli-config` e pode ser removida quando essa dependência passar a resolver uma versão corrigida. Reavaliar em cada execução, pois o resultado da auditoria depende dos avisos disponíveis na consulta.
