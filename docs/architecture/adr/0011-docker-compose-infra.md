# ADR 0011 — Docker Compose apenas para PostgreSQL e Mailpit

**Status:** Aprovada (depende de a máquina de cada um conseguir executar Docker; plano B abaixo)

## Decisão

`infra/docker-compose.yml` sobe somente **PostgreSQL** e **Mailpit** (servidor SMTP falso para testar recuperação de senha). Back-end, front-end e simulador rodam no host com `pnpm`.

## Alternativas

- **Tudo em contêineres:** reprodutível, porém depuração mais difícil no Windows.
- **PostgreSQL nativo:** plano B, documentado em `docs/setup`.

## Consequências

- Versões das imagens serão fixadas após consulta à documentação oficial (não definidas ainda).
- Senhas do `docker-compose` vêm do `.env`, nunca fixas no arquivo versionado.
