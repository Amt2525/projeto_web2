# Guia de estudo — Etapa 2A: ambiente e infraestrutura

## O que foi feito

Preparamos o computador para desenvolver: Node.js, pnpm e Docker instalados, e um PostgreSQL e um servidor de e-mail de teste rodando em contêineres. Ainda **não existe código da aplicação**.

## Arquivos e responsabilidade

| Arquivo                    | Responsabilidade                                                                                          |
| -------------------------- | --------------------------------------------------------------------------------------------------------- |
| `package.json` (raiz)      | Marca o projeto como privado e define atalhos: `pnpm db:up`, `db:down`, `db:status`                       |
| `pnpm-workspace.yaml`      | Diz ao pnpm que as pastas `apps/*` e `packages/*` fazem parte do mesmo projeto (monorepo)                 |
| `infra/docker-compose.yml` | Descreve os dois serviços de apoio: PostgreSQL e Mailpit                                                  |
| `.env.example`             | Modelo das variáveis de ambiente, com valores falsos. **Vai para o Git**                                  |
| `.env`                     | As variáveis reais da sua máquina, com senhas aleatórias. **Nunca vai para o Git** (está no `.gitignore`) |
| `.gitignore`               | Lista do que o Git deve ignorar (`.env`, `node_modules`...)                                               |

## Como as peças se conectam

```
pnpm db:up
   └─ docker compose lê .env  ──►  sobe PostgreSQL (porta 5432) e Mailpit (1025 e 8025)
                                         ▲
                 a API (futura) vai ler DATABASE_URL do .env e conectar aqui
```

## Conceitos novos

- **Contêiner / Docker:** um "mini-computador" isolado que roda um programa pronto. Em vez de instalar o PostgreSQL no Windows, rodamos uma versão dentro de um contêiner. Apagar o contêiner não suja o computador.
- **Imagem:** o "molde" do contêiner (`postgres:18`). O número 18 é a versão principal do PostgreSQL.
- **Docker Compose:** um arquivo (`docker-compose.yml`) que descreve vários contêineres de uma vez, para subir tudo com um comando.
- **Volume:** pasta que guarda os dados do banco fora do contêiner. Por isso os dados sobrevivem quando o contêiner é parado.
- **Variável de ambiente / `.env`:** configurações e segredos fora do código. Exemplo no SolarSystem: a senha do banco. Se estivesse no código e o repositório é público, qualquer pessoa a veria.
- **`127.0.0.1:5432:5432`:** o banco só aceita conexões da própria máquina. Sem o `127.0.0.1`, outros computadores da rede poderiam tentar acessá-lo.
- **Mailpit:** finge ser um servidor de e-mail e guarda as mensagens para vocês lerem em `http://localhost:8025`. Assim testamos "esqueci a senha" sem enviar e-mails de verdade.
- **Healthcheck:** o Docker pergunta ao PostgreSQL se ele está pronto (`pg_isready`). `healthy` significa que respondeu.

## Como executar e testar

```powershell
pnpm db:up
pnpm db:status
```

Esperado: dois serviços `healthy`. Abram `http://localhost:8025` e vejam a caixa de entrada vazia do Mailpit.

**Resultado obtido em 25/11/2026 (máquina de Atos):** `postgres:18` e `mailpit:v1.34` iniciaram `healthy`. Uma consulta ao banco retornou PostgreSQL 18.7, com o usuário e o banco `solarsystem`. A página do Mailpit respondeu HTTP 200. Não foi testado na máquina de Bryan.

## Erros comuns

Ver `docs/setup/ambiente-windows.md`, seção 6 (Docker sem WSL, política do PowerShell, porta ocupada, `.env` ausente).

## Segurança considerada

- Senhas e chaves geradas aleatoriamente, fora do Git.
- Portas ligadas só em `127.0.0.1`.
- `docker-compose.yml` não contém senha nenhuma, só referências `${...}` ao `.env`.
- **Risco residual:** o repositório é público. Se alguém enviar o `.env` ao Git por engano, as senhas vazam e precisam ser trocadas. O Gitleaks no CI vai ajudar a detectar isso (ainda não configurado).

## Como explicar na apresentação

"Usamos Docker só para os serviços de apoio, o banco e o e-mail de teste, para que qualquer pessoa suba o mesmo ambiente com um comando. Os segredos ficam num `.env` que o Git ignora, e o repositório tem apenas um `.env.example` com valores falsos."

## Perguntas prováveis da banca

1. Por que Docker se o banco poderia ser instalado direto? _(Reprodutibilidade: todos têm a mesma versão, e dá para descartar e recriar.)_
2. Por que o PostgreSQL só escuta em `127.0.0.1`? _(Reduz a superfície de ataque.)_
3. Onde ficam as senhas e como evitam que vão para o GitHub? _(`.env` no `.gitignore`, `.env.example` falso, Gitleaks no CI.)_
4. O que acontece com os dados se o contêiner for apagado? _(Ficam no volume. Só `down -v` apaga.)_

## Para vocês confirmarem que entenderam

Expliquem em voz alta, sem olhar: (a) a diferença entre `.env` e `.env.example`; (b) o que `pnpm db:up` faz passo a passo; (c) por que o banco não está exposto à rede.
