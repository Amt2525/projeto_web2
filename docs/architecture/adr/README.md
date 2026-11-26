# Registro de Decisões Arquiteturais (ADRs)

Formato: Contexto → Decisão → Alternativas → Consequências. Status: **Proposta**, **Aprovada**, **Substituída**.

| ADR                                          | Decisão                                                | Status   |
| -------------------------------------------- | ------------------------------------------------------ | -------- |
| [0001](0001-monorepo-pnpm.md)                | Monorepo com pnpm workspaces                           | Aprovada |
| [0002](0002-monolito-modular.md)             | Monólito modular, sem fila nem Redis                   | Aprovada |
| [0003](0003-typescript.md)                   | TypeScript no front e no back                          | Aprovada |
| [0004](0004-backend-fastify-zod.md)          | Back-end com Fastify + Zod                             | Aprovada |
| [0005](0005-frontend-react.md)               | Front-end com React + Vite + Tailwind + shadcn/ui      | Aprovada |
| [0006](0006-postgresql-prisma.md)            | PostgreSQL + Prisma                                    | Aprovada |
| [0007](0007-autenticacao-jwt.md)             | Autenticação com JWT (access curto + refresh rotativo) | Aprovada |
| [0008](0008-perfis-autorizacao.md)           | Perfis como enum e autorização no back-end             | Aprovada |
| [0009](0009-alarmes-dois-estados.md)         | Alarme com estado de origem e estado local             | Aprovada |
| [0010](0010-integracoes-e-simulador.md)      | Adaptadores de integração e API simuladora             | Aprovada |
| [0011](0011-docker-compose-infra.md)         | Docker Compose apenas para PostgreSQL e Mailpit        | Aprovada |
| [0012](0012-versoes-e-dependencias.md)       | Versões e dependências da fundação (TS 6.0, esbuild)   | Aprovada |
| [0013](0013-prisma-versao-e-configuracao.md) | Prisma: versão e configuração                          | Aprovada |

| [0014](0014-integracao-continua.md) | Integração contínua (GitHub Actions) | Aprovada |
| [0015](0015-seguranca-da-autenticacao.md) | Segurança da API de autenticação | Aprovada |

Aprovações registradas a partir da resposta de Atos e Bryan na Etapa 1. Pendências que podem alterar detalhes estão em `docs/architecture/pendencias.md`.
