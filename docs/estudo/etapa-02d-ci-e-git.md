# Guia de estudo — Etapa 2D: Git, integração contínua e segredos

## O que foi feito

Iniciamos o repositório Git (branch `main`, **sem nenhum commit ainda**) e criamos o CI: uma "esteira" automática do GitHub que, a cada alteração, roda os mesmos testes e verificações que rodamos à mão. Também criamos o guia de colaboração e a verificação de segredos.

## Arquivos e responsabilidade

| Arquivo                            | Responsabilidade                                                                      |
| ---------------------------------- | ------------------------------------------------------------------------------------- |
| `.github/workflows/ci.yml`         | A esteira de CI: 3 jobs (qualidade, auditoria, segredos)                              |
| `.github/dependabot.yml`           | Abre PRs semanais para atualizar dependências e ações do CI                           |
| `.github/pull_request_template.md` | Modelo que aparece ao abrir um PR (checklist, inclui "consigo explicar este código?") |
| `CONTRIBUTING.md`                  | Como Atos e Bryan trabalham: branches, commits, PRs, revisão, conflitos, segredos     |
| `package.json` (`packageManager`)  | Fixa a versão do pnpm, para o CI e todos usarem a mesma                               |
| `docs/architecture/adr/0014-...md` | Decisões do CI e suas limitações                                                      |

## Como o fluxo funciona

```
você cria uma branch ──► faz commits ──► abre Pull Request
                                            │
                                            ▼
                               GitHub roda o CI (ci.yml)
                      ┌───────────────┼────────────────┐
                 qualidade         auditoria         segredos
            (tipos, lint,       (pnpm audit)        (Gitleaks)
          formatação, testes)
                                            │ tudo verde
                                            ▼
                          o OUTRO integrante revisa ──► merge na main
```

## Conceitos novos

- **Git / commit / branch:** o Git guarda o histórico do projeto. Um _commit_ é uma "foto" com mensagem. Uma _branch_ é uma linha paralela de trabalho, para não mexer na `main` enquanto desenvolve.
- **Pull Request (PR):** pedido para juntar sua branch na `main`, com espaço para revisão. É onde o colega lê e aprova.
- **CI (Integração Contínua):** executar verificações automáticas a cada alteração. Se algo quebrar, descobrimos na hora, não na véspera da apresentação.
- **Conventional Commits:** padrão de mensagens (`feat(auth): ...`). Facilita ler o histórico e, depois, gerar _changelog_.
- **Lockfile (`pnpm-lock.yaml`) e `--frozen-lockfile`:** o lockfile registra a versão exata de cada dependência. No CI, se ele não bater com os `package.json`, a esteira falha. Assim todos rodam exatamente o mesmo código.
- **Fixar ação pelo hash:** `uses: actions/checkout@3d3c42e...`. Uma tag como `v7` pode ser redirecionada por quem controla a ação (ataque de _supply chain_). O hash do commit não muda.
- **Gitleaks:** procura senhas e chaves no código **e no histórico**. Importa porque, com repositório público, um segredo commitado e "apagado depois" continua visível no histórico.
- **Dependabot:** robô do GitHub que propõe atualizações de dependências, para corrigirmos vulnerabilidades conhecidas.

## Como executar e testar

Rodar localmente o mesmo que o CI roda:

```powershell
pnpm install --frozen-lockfile
pnpm db:generate
pnpm typecheck
pnpm lint
pnpm format:check
pnpm test
pnpm audit --audit-level high
```

### Resultados obtidos em 25/11/2026 (máquina de Atos)

| Verificação                                                                                                          | Resultado                                                                           |
| -------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `git init -b main`                                                                                                   | Repositório criado, **0 commits**                                                   |
| `.env`, `node_modules/` e `src/generated/` são ignorados pelo Git                                                    | Confirmado com `git check-ignore`                                                   |
| `.env.example` **não** é ignorado                                                                                    | Confirmado                                                                          |
| Arquivos que entrariam no primeiro commit                                                                            | 63 arquivos, nenhum `.env`, `node_modules` ou código gerado                         |
| Os 4 valores secretos do `.env` aparecem em algum desses arquivos?                                                   | **Não** (0 ocorrências)                                                             |
| Gitleaks v8.30.1 (imagem oficial) sobre os arquivos que entrariam no commit                                          | "no leaks found"                                                                    |
| Simulação do CI numa **cópia limpa** (sem `.env`, sem `node_modules`): install, generate, tipos, lint, testes, audit | Passaram                                                                            |
| Mesma simulação: `format:check`                                                                                      | **Falhou na primeira vez** (`CONTRIBUTING.md` sem formatar). Corrigido; passa agora |
| `ci.yml` rodando de fato no GitHub                                                                                   | **Não testado**: ainda não há repositório remoto                                    |
| Gitleaks sobre o **histórico**                                                                                       | **Não testado**: ainda não há commits                                               |

O caso do `CONTRIBUTING.md` mostra para que serve o CI: pegou um esquecimento antes de chegar ao colega.

## Erros comuns

- **CI falha em `format:check`:** rode `pnpm format` e faça commit das mudanças.
- **CI falha em `--frozen-lockfile`:** alguém mudou um `package.json` sem commitar o `pnpm-lock.yaml`. Rode `pnpm install` e commite o lockfile.
- **`pnpm audit` falha:** apareceu vulnerabilidade alta. Veja `pnpm audit`, atualize a dependência ou documente o tratamento em ADR (como fizemos no ADR 0013).
- **Gitleaks acusa segredo:** **não basta apagar o arquivo em um novo commit.** Revogue e troque o segredo.
- **Commit direto na `main`:** evite; a proteção da `main` (configurada no GitHub) vai bloquear.
- **`.env` aparecendo no `git status`:** pare e verifique o `.gitignore` **antes** de qualquer commit.

## Segurança considerada

- Repositório **público**: o maior risco é vazar segredo. Três camadas: `.gitignore`, checagem manual antes do primeiro commit e Gitleaks no CI.
- CI com permissão mínima (somente leitura) e ações fixadas por hash.
- **Risco residual:** o CI ainda não rodou no GitHub. A proteção da `main` depende de configuração manual no site. Gitleaks só protege **depois** do push: se um segredo for enviado, ele já está público. Por isso a revisão antes do primeiro commit é feita **antes** do push.

## Como explicar na apresentação

"Usamos GitHub Actions: a cada pull request, rodam verificação de tipos, lint, testes, auditoria de dependências e busca de segredos no histórico. A `main` só recebe código revisado pelo outro integrante e com o CI verde. As ações do CI são fixadas por hash para reduzir risco de _supply chain_."

## Perguntas prováveis da banca

1. O que é CI e que problema resolve? _(Detecta erros automaticamente a cada alteração, em vez de só na entrega.)_
2. Como vocês evitam vazar senhas num repositório público? _(`.env` ignorado, `.env.example` falso, Gitleaks no CI com histórico, revogação se vazar.)_
3. Por que fixar as ações por hash? _(Tags podem ser movidas; o hash não. Mitiga supply chain.)_
4. Por que `--frozen-lockfile`? _(Reprodutibilidade: mesmas versões em todos os ambientes.)_
5. Como funciona a revisão de código na equipe? _(Todo PR é revisado pelo outro integrante, que precisa entender o código.)_
6. O CI garante que o sistema é seguro? _(Não. Ele pega erros conhecidos e dependências vulneráveis; não substitui testes de segurança nem revisão.)_

## Para vocês confirmarem que entenderam

Expliquem em voz alta: (a) o caminho de uma alteração desde a branch até a `main`; (b) por que apagar um segredo num commit novo **não** resolve num repositório público; (c) o que cada um dos três jobs do CI verifica.
