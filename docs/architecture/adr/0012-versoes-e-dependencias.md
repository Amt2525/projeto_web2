# ADR 0012 — Versões e dependências da fundação

**Status:** Aprovada (registro de decisões tomadas na Etapa 2B)

## Contexto

Ao montar o monorepo, aplicamos a regra de consultar a documentação e verificar a compatibilidade entre ferramentas. Três situações exigiram decisão.

## Decisões

1. **TypeScript fixado na série 6.0 (`~6.0.3`), e não na 7.0.**
   O `npm` oferece o TypeScript 7.0.2 como "latest", mas o `typescript-eslint` 8.74 declara suporte somente a `>=4.8.4 <6.1.0` e falha ao iniciar com o TypeScript 7 (erro verificado). Sem o `typescript-eslint` não há lint de TypeScript. Quando o `typescript-eslint` suportar a série 7, reavaliar a atualização.
2. **Scripts de instalação do `esbuild` negados** (`allowBuilds: esbuild: false` em `pnpm-workspace.yaml`).
   O pnpm bloqueia scripts de instalação de dependências por padrão e pede aprovação. O `esbuild` é usado pelo `tsx` e pelo `vitest`. Negamos o script, que é só uma otimização, seguindo o princípio do menor privilégio. Verificado: `tsx` e `vitest` funcionam sem ele.
3. **`packages/config` não foi criado.**
   O plano previa essa pasta para configurações compartilhadas. Hoje só existe um `tsconfig.base.json` e um `eslint.config.js`, que ficam na raiz. Criar um pacote só para isso violaria "não criar pastas sem responsabilidade real". Reavaliar se a configuração crescer.

## Pendência conhecida

- `eslint-plugin-jsx-a11y` 6.10.2 declara suporte a ESLint até a série 9, e usamos o ESLint 10. O `pnpm peers check` acusa a incompatibilidade declarada. Na prática, a regra funciona: um arquivo de teste com `<img>` sem `alt` foi corretamente reprovado (`jsx-a11y/alt-text`). Risco: regras futuras do plugin podem quebrar. Se isso acontecer, fixar o ESLint na série 9.

## Verificações feitas (25/11/2026, máquina de Atos)

`pnpm typecheck`, `pnpm lint`, `pnpm format:check` e `pnpm test` (11 testes) passaram. `pnpm audit` não acusou vulnerabilidades conhecidas.
