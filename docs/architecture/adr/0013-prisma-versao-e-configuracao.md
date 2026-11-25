# ADR 0013 — Prisma: versão e configuração

**Status:** Aprovada (registro de decisões da Etapa 2C)

## Contexto

O ADR 0006 escolheu Prisma. Ao instalar, foi preciso decidir versão e como configurar o uso no monorepo.

## Decisões

1. **Prisma 7.10.1 (última versão estável), e não 8.0.**
   No npm, a tag `latest` aponta para `8.0.0-rc.35`, uma _release candidate_. Não usamos RC em um projeto que precisa ser defendido. Reavaliar quando a 8.0 estável sair.
2. **PostgreSQL 18 com Prisma 7.10.1:** migration, geração do cliente e consultas funcionaram (ver guia de estudo). A documentação oficial não foi consultada linha a linha: a compatibilidade foi comprovada na prática.
3. **Adaptador `@prisma/adapter-pg`.** O Prisma 7 exige um _driver adapter_ para conectar ao PostgreSQL. O cliente é criado com `new PrismaClient({ adapter })`.
4. **A URL do banco fica em `prisma.config.ts`**, e não no `schema.prisma`, como exige o Prisma 7. O arquivo carrega o `.env` da raiz com `process.loadEnvFile` (o Prisma 7 não lê `.env` sozinho).
5. **Código gerado não é versionado** (`apps/backend/src/generated/`, no `.gitignore`). Quem clona o repositório precisa rodar `pnpm db:generate`.
6. **Scripts de instalação de `prisma` e `@prisma/engines` negados** (`allowBuilds: false`), no mesmo critério do `esbuild` (ADR 0012). Verificado: `generate`, `migrate` e consultas funcionam sem eles.
7. **Vulnerabilidade tratada com `overrides`.** O `pnpm audit` acusou severidade **alta** (GHSA-7589-6fvf-x4pw, ReDoS em `effect <=3.22.0`). O Prisma 7.10.1 fixa `effect 3.20.0`, e a falha aparece só no caminho de ferramentas de linha de comando (`@prisma/config`), não nas requisições da API. Mesmo assim, forçamos `effect >=3.22.1 <4` em `pnpm-workspace.yaml` (resolveu para 3.22.5). Depois disso, `pnpm audit` não acusa nada e Prisma continua funcionando. **Remover o override quando o Prisma atualizar a dependência.**
8. **Restrições `CHECK` escritas à mão nas migrations.** O Prisma não gera `CHECK`. Usamos `migrate dev --create-only`, editamos o SQL e só então aplicamos.
9. **IDs `uuid(7)`**: identificadores não sequenciais (dificultam adivinhar IDs) e ordenáveis por data de criação (bom para índices).

## Consequências

- Risco residual: o override é uma troca de dependência que o Prisma não testou. Mitigação: reexecutar migrations e testes após qualquer atualização.
- Quando o schema crescer, toda mudança passa por migration versionada. Nunca editar uma migration já aplicada.
