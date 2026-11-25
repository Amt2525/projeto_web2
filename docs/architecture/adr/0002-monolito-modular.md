# ADR 0002 — Monólito modular, sem fila nem Redis

**Status:** Aprovada

## Contexto

Precisamos de modularidade e escalabilidade gradual, sem complexidade operacional incompatível com dois estudantes.

## Decisão

Back-end em **um único processo**, organizado em módulos (`auth`, `users`, `plants`, `devices`, `monitoring`, `alarms`, `dashboard`, `integrations`). Cada módulo tem rotas, serviço e acesso a dados. Módulos se comunicam por funções de serviço, não por acesso às tabelas uns dos outros.

A sincronização com plataformas roda em um **agendador interno**, com `sync_runs` como registro e trava contra execução concorrente.

## Alternativas

- **Microsserviços:** custo de deploy, rede, observabilidade e consistência sem necessidade comprovada.
- **Fila (BullMQ/Redis):** só se medirmos gargalo.

## Consequências

- Evolução prevista: `pg-boss` (fila sobre o PostgreSQL) e depois processo `worker` separado.
- Limitação: se a API cair, a sincronização também para. Documentado como risco residual.
- Limitação: com mais de uma instância da API, é preciso garantir a trava do agendador no banco.
