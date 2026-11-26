# Como trabalhar neste repositório

Fluxo simples, pensado para duas pessoas.

## Branches

- `main`: sempre estável. **Ninguém envia direto para a `main`**: tudo entra por pull request (PR).
- Uma branch por tarefa, com prefixo: `feat/login`, `fix/filtro-alarmes`, `docs/guia-api`, `chore/atualiza-deps`.
- Branches curtas: abrir o PR em poucos dias evita conflitos grandes.

## Commits (Conventional Commits)

Formato: `tipo(escopo): descrição curta no imperativo`.

| Tipo       | Quando usar                                  |
| ---------- | -------------------------------------------- |
| `feat`     | funcionalidade nova                          |
| `fix`      | correção de erro                             |
| `docs`     | só documentação                              |
| `test`     | só testes                                    |
| `refactor` | reorganizar código sem mudar o comportamento |
| `chore`    | configuração, dependências, CI               |

Exemplos: `feat(auth): adicionar login com e-mail e senha`, `fix(plants): rejeitar latitude fora do intervalo`.

## Pull requests

1. Rodar localmente: `pnpm typecheck`, `pnpm lint`, `pnpm format:check` e `pnpm test`.
2. Abrir o PR preenchendo o modelo (o que muda, como testar, checklist).
3. **Autorrevisão:** com uma só conta, ninguém aprova o PR de outra pessoa. Antes do merge, leiam o diff na aba "Files changed" e confirmem o checklist do modelo, principalmente "Eu consigo explicar este código sem olhar". O guia de estudo da etapa serve de roteiro.
4. O CI precisa estar verde (tipos, lint, formatação, testes, auditoria e Gitleaks). A `main` bloqueia o merge se algum falhar.
5. Merge por _squash_ (um commit por PR). Apagar a branch depois.

## Conflitos

Antes de abrir o PR: `git fetch` e `git rebase origin/main` (ou `git merge origin/main`). Em caso de dúvida na resolução, resolvam juntos, em chamada.

## Segredos (repositório público)

- **Nunca** versionar `.env`, chaves, tokens ou dados reais. Só o `.env.example`, com valores falsos.
- Se um segredo for enviado ao Git por engano: **revogar e trocar o segredo imediatamente**. Apagar o commit não basta, porque o histórico é público.

## Versionamento

Antes da entrega, versões marcadas por tag (`v0.1.0`, `v0.2.0`...), seguindo o versionamento semântico. A `v1.0.0` é a entrega final.

## Proteção da `main` (configuração no GitHub)

Já configurada no GitHub (ruleset `proteger-main`, ativo): pull request obrigatório (0 aprovações, pois há uma só conta), os três checks do CI exigidos e atualizados com a `main`, sem force push e sem exclusão. A configuração vive no site do GitHub, não no código.
