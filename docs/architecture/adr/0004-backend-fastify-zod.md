# ADR 0004 — Back-end com Fastify + Zod

**Status:** Aprovada

## Contexto

O back-end precisa de validação rigorosa, documentação OpenAPI, plugins de segurança e uma estrutura que os dois consigam explicar.

## Decisão

**Node.js (LTS) + Fastify**, validação com **Zod**, documentação OpenAPI gerada dos esquemas (`@fastify/swagger`). Plugins oficiais para cabeçalhos de segurança, limite de requisições, CORS e cookies.

## Alternativas

- **NestJS:** estrutura imposta e boa para módulos, mas muita "mágica" (decoradores, injeção de dependência) para defender na banca.
- **Express:** simples, porém sem validação e documentação nativas.

## Consequências

- Estrutura de módulos é responsabilidade nossa (ADR 0002).
- Menos material em português que Express.
- Versões exatas serão fixadas na Etapa 2 após consulta à documentação oficial.
