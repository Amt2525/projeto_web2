# ADR 0006 — PostgreSQL + Prisma

**Status:** Aprovada

## Contexto

Dados relacionais (usuários, usinas, alarmes) e séries históricas de leituras, com integridade referencial e migrations.

## Decisão

**PostgreSQL** como banco e **Prisma** como ORM, com migrations e seed versionados.

## Alternativas

- **MySQL:** viável, menos recursos (`CHECK`/tipos de data) que o PostgreSQL.
- **SQLite:** simples, mas diferente de produção.
- **MongoDB:** o domínio é relacional.
- **Drizzle / TypeORM:** Drizzle é mais próximo do SQL; Prisma tem schema mais legível e melhor curva para estudantes.
- **TimescaleDB:** só se os testes de carga mostrarem necessidade.

## Consequências

- Prisma **não** garante segurança por si: agregações em SQL cru usam consultas parametrizadas; nunca concatenar texto.
- Restrições (`CHECK` de coordenadas, capacidade, severidade) podem exigir SQL nas migrations.
- Potência em W e energia em Wh, inteiros. Datas em `timestamptz`.
- Retenção: leituras brutas por tempo limitado (a definir) e agregado diário permanente.
- Cuidado com N+1: usar `include`/`select` conscientemente e testar.
