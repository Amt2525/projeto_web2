# ADR 0003 — TypeScript no front-end e no back-end

**Status:** Aprovada

## Contexto

Duas pessoas, pouco tempo, necessidade de validar dados de forma consistente nas duas pontas.

## Decisão

**TypeScript** em todos os pacotes. Esquemas de validação (Zod) e tipos comuns ficam em `packages/shared`.

## Alternativas

- **Python (FastAPI/Django) + React:** boa opção, mas duas linguagens e esquemas duplicados.
- **Java/Spring:** robusto, porém mais pesado para o prazo.

## Consequências

- Uma linguagem para aprender e defender; tipos compartilhados reduzem divergência entre front e back.
- Tipagem não substitui validação em tempo de execução: toda entrada externa passa por Zod.
- Modo `strict` do TypeScript obrigatório.
