# ADR 0001 — Monorepo com pnpm workspaces

**Status:** Aprovada

## Contexto

O requisito exige monorepo com front-end, back-end, pacotes compartilhados, docs e testes. A equipe tem duas pessoas.

## Decisão

Um único repositório com **pnpm workspaces** (`apps/*`, `packages/*`). Sem Turborepo ou Nx por enquanto.

## Alternativas

- **Turborepo / Nx:** cache e orquestração de builds. Com 3 apps e 2 pacotes, o ganho é pequeno e há mais conceitos para aprender e defender.
- **npm/yarn workspaces:** funcionam, mas o pnpm é mais rápido, usa menos disco e evita dependências "fantasma" (importar pacote não declarado).

## Consequências

- Scripts em lote com `pnpm -r`. Turborepo pode ser adicionado depois sem reestruturar.
- Monorepo não é microsserviço: continua sendo um único sistema.
- Exige instalar Node e pnpm (ver `docs/setup`).
