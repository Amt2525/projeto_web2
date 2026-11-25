# ADR 0014 — Integração contínua (CI)

**Status:** Aprovada. A primeira execução no GitHub (25/11/2026, commit `e926dff`) passou nos três jobs.

## Contexto

O enunciado exige CI com verificação de código, lint, tipos, testes, build e auditoria de dependências, e o repositório será público.

## Decisões

1. **GitHub Actions**, com três jobs independentes: `qualidade` (tipos, lint, formatação, testes), `auditoria` (`pnpm audit --audit-level high`) e `segredos` (Gitleaks).
2. **Ações fixadas pelo hash do commit**, com a versão no comentário. Uma tag pode ser movida por quem controla a ação; o hash não. O Dependabot atualiza esses hashes.
3. **Permissão mínima:** `contents: read` e `persist-credentials: false` no checkout.
4. **Gitleaks pela imagem oficial** (`ghcr.io/gitleaks/gitleaks:v8.30.1`), com histórico completo (`fetch-depth: 0`). Evita a ação `gitleaks-action`, que pode exigir licença. Imagem e versão foram executadas localmente com sucesso.
5. **`pnpm install --frozen-lockfile`:** o CI falha se o `pnpm-lock.yaml` não bater com os `package.json`, garantindo as mesmas versões de todos.
6. **Versão do pnpm** vem do campo `packageManager` (`pnpm@12.23.0`). Node fixado em 26, igual ao ambiente de desenvolvimento.
7. **Auditoria só falha em severidade alta ou crítica**, para não bloquear o trabalho por avisos de baixo risco. Vulnerabilidades menores continuam visíveis em `pnpm audit`.
8. **Não há job de `build`** ainda: não existe build de produção definido. Entra quando o front e o back tiverem build real (Etapa 8).
9. **Testes de banco ainda não rodam no CI.** Quando existirem, o job ganhará um serviço PostgreSQL.

## Consequências

- Todo PR precisa passar nos três jobs. A proteção da `main` (exigir PR e CI verde) é configurada no site do GitHub.
- **Diferença Windows × Linux encontrada fora do CI:** o CI (Linux) passou, mas um clone no Windows com `core.autocrlf=true` converte os arquivos para CRLF e o `pnpm format:check` reprovava 58 arquivos. Correção: arquivo `.gitattributes` com `* text=auto eol=lf`. Validado em um clone novo simulado. Moral: passar no CI não prova que funciona na máquina de cada integrante.
