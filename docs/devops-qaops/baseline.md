# Baseline local em 15/10/2026

Base Git `09587fee4e6b5785d70df2823f112a10996b9382`; Node 24.12.0 e npm 10.2.3 locais. Instalação original `npm ci`: backend 113,4 s/exit 0, frontend 117,2 s/exit 0; lockfiles preservados nesta medição. As pequenas alterações visuais da marca já estavam aplicadas no momento do check e não alteram as regras do domínio.

| Diretório | Comandos | Resultado | Duração observada |
| --- | --- | --- | --- |
| backend | npm run check (build/tipos/configuração e testes) | exit 0; 64 testes/12 arquivos | testes 3,21 s |
| frontend_ecomerce | npm run check (ESLint/testes/build) | exit 0; 17 testes/4 arquivos; build 4,35 s | testes 0,909 s |
| backend | audit completo + produção | ambos exit 1 | check e duas auditorias: 12,09 s |
| frontend_ecomerce | audit completo + produção | completo exit 1; produção exit 0 | check e duas auditorias: 17,12 s |

Auditoria completa inicial backend: 1 moderada, 2 altas e 3 críticas; frontend: 1 moderada, 1 alta e 2 críticas. Componentes: Vitest/@vitest/mocker, tinypool, source-map-js e, no backend, proxy-addr/sharp. São achados preexistentes, distintos da mutação controlada. Logs completos transitórios ficam em `.artifacts/baseline`; a seleção sanitizada da auditoria é preservada em evidencias/baseline.

Optou-se por Vitest 4.1.11 corrigido e sem tinypool, evitando migração desnecessária para 5; pacotes restantes recebem correções compatíveis. A política alto/crítico permanece obrigatória. A exceção moderada antiga é encerrada quando a auditoria final confirmar sua correção.
