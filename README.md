# SolarSystem

Plataforma web para monitoramento centralizado de usinas fotovoltaicas, com integração a plataformas de fabricantes por meio de adaptadores. Projeto acadêmico de Atos e Bryan (ADS).

> **Status:** Etapa 2 (fundação) em andamento. Existe o esqueleto de cada programa (com `/health` e testes), mas **nenhuma funcionalidade de negócio ainda**: login, usinas e alarmes não foram implementados.

## Estrutura

```
apps/
  backend/     API Fastify (monólito modular)
  frontend/    React + Vite
  simulator/   API que simula uma plataforma de monitoramento (dados fictícios)
packages/
  shared/      esquemas Zod e tipos comuns
docs/          arquitetura (ADRs), instalação, guias de estudo
infra/         docker-compose (PostgreSQL, Mailpit)
```

## Como rodar

Veja [docs/setup/ambiente-windows.md](docs/setup/ambiente-windows.md).

## Documentação

- Decisões: [docs/architecture/adr](docs/architecture/adr/README.md)
- Pendências: [docs/architecture/pendencias.md](docs/architecture/pendencias.md)
- Guias de estudo: [docs/estudo](docs/estudo/)

## Segurança

Nunca envie `.env` ou credenciais ao Git. Use `.env.example` como modelo.
