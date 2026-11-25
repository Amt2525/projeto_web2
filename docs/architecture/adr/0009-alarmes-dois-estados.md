# ADR 0009 — Alarme com estado de origem e estado local

**Status:** Aprovada

## Contexto

O enunciado diferencia **reconhecer** um alarme de **resolver** a falha e proíbe o usuário de alterar a situação informada pela plataforma externa.

## Decisão

Cada alarme tem dois estados independentes:

- **Estado de origem** (`ABERTO` / `ENCERRADO`): vem da plataforma ou do simulador; só a sincronização altera.
- **Estado local** (`NAO_RECONHECIDO` / `RECONHECIDO`), com quem reconheceu e quando; só o técnico altera.

Todas as mudanças geram um registro em `alarm_events`.

## Consequências

- Reconhecer não fecha o alarme. Um alarme encerrado na origem permanece no histórico.
- Chave única por `(plataforma/conexão, external_id)` evita duplicação a cada sincronização.
- Testes: reconhecer não altera o estado de origem; sincronizar não apaga o reconhecimento.
