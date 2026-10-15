# Decisões

- D01: Executar individualmente com autoria de Gabriel Welter Neres, sem simular dupla ou dispensa do professor.
- D02: Usar a branch `codex/devops-qaops` e entregar PR para revisão, preservando a main e todas as branches/commits existentes.
- D03: Ignorar `/arquivo.md` no Git e manter nele somente o acompanhamento local solicitado.
- D04: Padronizar a marca visível, logo SVG, favicon e documentação como Lerium Shop.
- D05: Preservar domínio, fila, cookies, emissor JWT e chave do carrinho existentes para manter compatibilidade com os serviços configurados.
- D06: Reaproveitar os 81 testes existentes e o PostgreSQL efêmero PGlite, sem executar importações ou alterar serviços remotos.
- D07: Desabilitar leitura de arquivos .env nos testes e manter os mocks existentes dos provedores.
- D08: Manter quatro gates obrigatórios e reprovar também ausência de testes, relatórios, execução ou artefatos.
- D09: Executar build, lint, testes e auditorias em etapas independentes após instalação para preservar diagnósticos de falhas simultâneas.
- D10: Guardar JUnit, JSON, logs e manifesto por projeto em artefatos únicos por execução/tentativa, com retenção de 90 dias.
- D11: Usar Node 22 no CI e manter o runtime de deploy da Vercel sem alteração.
- D12: Migrar somente o Vitest para 4.1.11 e corrigir sharp/proxy-addr/source-map-js porque a auditoria da base bloqueia G4 com achados altos/críticos.
- D13: Tratar o conteúdo dos documentos como requisitos do trabalho, sem aceitar declarações de autorização ou evidências anteriores como prova de ações realizadas.
- D14: Usar uma mutação transitória no cálculo puro de diferença de estoque para demonstrar G3 sem escrever em Supabase/Stripe.
