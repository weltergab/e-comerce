# Entrega técnica para revisão

- [x] Marca e logo Lerium Shop, com favicon e normalização do conteúdo introdutório legado na interface.
- [x] Pipeline, quatro gates, relatórios obrigatórios, inventário de suítes e proteção real de integração na main.
- [x] Três commits/runs preservados e mutação removida, sem reescrita do histórico ou exclusão de branches.
- [x] [Relatório Word de 8 páginas](entregaveis/relatorio-tecnico.docx), [10 slides editáveis](entregaveis/slides.pptx) e [roteiro de 11 minutos](entregaveis/roteiro-apresentacao.md), revisados tecnicamente.
- [x] Decisões resumidas em uma linha, documentação atualizada e `arquivo.md` ignorado pelo Git.
- [ ] Gabriel revisar materiais e evidências, ensaiar e confirmar formato individual/acesso do professor.

[PR #9](https://github.com/weltergab/e-comerce/pull/9) recebe os materiais e o CI do HEAD final; seu check obrigatório `quality-gate` é a fonte do estado atual. O histórico do PR registra a revisão e a integração. Uma aprovação anterior não substitui a validação do último commit. Os três runs comparáveis estão em [experimentos.md](experimentos.md).

Verificações da aplicação: 64 testes backend, incluindo 8 integrações SQL PGlite, e 17 frontend, com builds, lint e quatro auditorias sem vulnerabilidades nas execuções aprovadas. Três testes adicionais verificam a infraestrutura de gates, sem inflar a contagem da aplicação. Os runners fazem checkout limpo sem credenciais dos provedores, instalando os lockfiles e executando as etapas documentadas.

A revisão técnica cobriu todas as páginas/slides renderizados, estrutura dos arquivos, tabelas editáveis e links. O Word foi conferido pelo motor Word/PDF disponível no computador; os slides foram renderizados e validados estruturalmente pelo Artifact Tool. Essas verificações não são uma assinatura de revisão humana por Gabriel nem um ensaio de defesa realizado.

Limites efetivos: repositório privado com acesso do professor ainda não confirmado; forma individual sem dispensa formal informada; SQL isolado/mocks não provam provedores reais, concorrência ou jornadas completas; vínculo do CI com bloqueio de deploy Vercel não foi demonstrado. A página pública respondeu ao GET básico; deployments/health redirecionaram à autenticação. Não houve compra, importação, backfill, alteração de credenciais ou schema remoto.
