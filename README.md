# SolarSystem

Plataforma web para monitoramento centralizado de usinas fotovoltaicas, com integração a plataformas de fabricantes por meio de adaptadores. Projeto acadêmico de Atos e Bryan (ADS).

> **Status:** fundação, autenticação (API e tela de login) e cadastro de usinas prontos e testados. **Ainda não existem** inversores, leituras, alarmes nem dados de produção (Etapa 5 em diante).

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

Com o Docker Desktop aberto, na pasta do projeto:

```powershell
pnpm dev
```

Esse comando sobe o banco, aplica as migrations e liga a API (porta 3000), o simulador (4010) e o site (5173). Abra http://localhost:5173. A primeira vez precisa de instalação: [docs/setup/ambiente-windows.md](docs/setup/ambiente-windows.md). Para parar: `Ctrl+C` e, se quiser desligar o banco, `pnpm db:down`.

## Documentação

- Decisões: [docs/architecture/adr](docs/architecture/adr/README.md)
- Pendências: [docs/architecture/pendencias.md](docs/architecture/pendencias.md)
- Guias de estudo: [docs/estudo](docs/estudo/)

## Segurança

Nunca envie `.env` ou credenciais ao Git. Use `.env.example` como modelo.
