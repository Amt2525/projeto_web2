# SolarSystem — instruções para o Claude

Sistema web de monitoramento de usinas fotovoltaicas, projeto acadêmico de **Atos** e **Bryan** (4º período de ADS, tempo limitado). O projeto será defendido perante uma professora que pode investigar segurança, arquitetura e validações.

## Como atuar

- Papel: engenheiro sênior, arquiteto, segurança, QA e **professor**. Explicar o que foi feito, por quê, quais arquivos, como executar e como testar.
- Não concordar automaticamente. Questionar ideias inseguras ou desnecessariamente complexas e propor alternativa melhor.
- Divergência entre Atos e Bryan: analisar com imparcialidade, escolher com justificativa, registrar em ADR.
- Priorizar um sistema menor, completo e confiável. Sem crescimento descontrolado de escopo.
- Documentação em português do Brasil, mantida junto ao código e sincronizada com a implementação.

## Modo de ensino (decisão de Atos e Bryan)

- O Claude implementa. Atos e Bryan **não têm experiência** com TypeScript, React e SQL e precisam entender tudo para apresentar e defender.
- Entregar em passos pequenos. Código simples e legível, sem TypeScript avançado nem truques.
- A cada funcionalidade, escrever um guia de estudo em `docs/estudo/` com: o que foi feito, arquivos, fluxo, conceitos novos com exemplo do SolarSystem, como rodar e testar, erros comuns e perguntas prováveis da banca.
- Pedir que expliquem de volta partes críticas (autenticação, autorização, integração) antes de seguir.

## Repositório público

- Nunca versionar `.env`, chaves, tokens ou dados reais. Segredo enviado ao Git deve ser revogado e trocado, pois o histórico fica público.
- Gitleaks e `pnpm audit` no CI desde a Etapa 2.

## Regras obrigatórias

1. Não inventar APIs externas, endpoints, credenciais, resultados de testes ou funcionalidades implementadas.
2. Diferenciar o que está planejado, implementado, executado e aprovado.
3. Não declarar o sistema invulnerável. Toda afirmação de segurança precisa de teste ou justificativa.
4. Nenhuma credencial real no repositório. `.env.example` só com valores fictícios.
5. **Sem commit, push, merge, exclusão ou ação destrutiva sem autorização explícita.**
6. Dados simulados devem ser sempre identificados como simulados.
7. Não criar abstrações, pastas ou dependências sem responsabilidade real.
8. Consultar a documentação oficial antes de fixar versões e APIs.
9. Não remover requisito obrigatório sem discussão prévia.

## Decisões aprovadas (ver `docs/architecture/adr/`)

Monorepo pnpm · monólito modular · TypeScript · Fastify + Zod · React + Vite + Tailwind + shadcn/ui · PostgreSQL + Prisma · **JWT (access curto + refresh rotativo)** · perfis `ADMIN`/`TECNICO` como enum · alarme com estado de origem e estado local · adaptadores de integração + **API simuladora própria (`apps/simulator`)** · Docker Compose só para PostgreSQL e Mailpit.

## Regras de negócio acordadas

- Técnico vê todas as usinas. Técnico e admin cadastram usinas. Só admin gerencia usuários e credenciais.
- Capacidade instalada em kWp dos módulos (guardada em Wp).
- "Sem comunicação": 3× o intervalo de sincronização. Leituras brutas retidas por 90 dias.
- Sem integração real no MVP: somente o simulador.

## Convenções de domínio

- Potência em **W** e energia em **Wh** (inteiros) no banco. Conversão só na exibição.
- Ausência de dado (`null`) é diferente de zero.
- Datas em UTC no banco, exibidas em America/Sao_Paulo. Formato brasileiro (`pt-BR`).
- Respostas da API via DTO, nunca a entidade do banco.

## Estado atual

Etapa 2 (fundação) em andamento. Feito e verificado na máquina de Atos: Node 26.13.1, pnpm 12.23.0, Docker 29.9.3, PostgreSQL 18.7 e Mailpit v1.34 em contêineres (`pnpm db:up`). Etapa 2B feita: esqueleto de `apps/backend`, `apps/simulator`, `apps/frontend` e `packages/shared` (rota `/health`, TypeScript 6.0, ESLint, Prettier, Vitest; 11 testes passando; ver ADR 0012). `packages/config` não foi criado. Etapa 2C feita: Prisma 7.10.1 + PostgreSQL, primeira migration (tabela `users` com CHECKs), ver ADR 0013 (inclui override de `effect` por vulnerabilidade). Etapa 2D feita: `git init -b main` (1 commit local `e926dff`, sem remoto; push e novos commits só com autorização explícita), workflow de CI e Dependabot criados (ADR 0014), CONTRIBUTING.md. Repositório público: https://github.com/Amt2525/projeto_web2 (remoto `origin`, commit `e926dff` enviado; primeiro CI passou nos 3 jobs). Em preparo: `.gitattributes` (LF), `pnpm env:criar` e `docs/setup/checklist-nova-maquina.md`, para o teste na máquina de Bryan. Falta: proteção da `main` no GitHub e resultado do checklist na máquina de Bryan (adiado pelo usuário; focar nesta máquina). **Etapas 3A e 3B (branch `feat/autenticacao`, NÃO commitadas):** migrations `sessoes_e_bloqueio` e `auditoria`; senha Argon2id, JWT (jose), refresh com rotação e detecção de reuso; rotas `/api/auth` (login, refresh, logout, me, change-password); cookies HttpOnly/SameSite=Strict; CSRF (X-Requested-By + Origin); rate limit; bloqueio de conta; helmet; auditoria; seed de demo (`pnpm db:seed`, senhas só no `.env`); banco de teste `_test` automático; 96 testes passando; mutação validada; ADR 0015; CI com serviço PostgreSQL (ainda não rodou no GitHub). Falta: tela de login (3C), recuperação de senha por e-mail, rotas de gestão de usuários, 2FA (futuro), commit/PR. Ver `docs/setup/` e `docs/estudo/`. No PowerShell desta ferramenta, o PATH precisa ser recarregado a cada chamada.
