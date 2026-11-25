# Instalação do ambiente (Windows 11)

Estado: **executado e verificado em 25/11/2026** na máquina de Atos (Windows 11 Home). Ainda não foi testado em uma máquina totalmente limpa nem na de Bryan.

## 1. Pré-requisitos

| Ferramenta     | Versão verificada       | Como instalar                                                                          |
| -------------- | ----------------------- | -------------------------------------------------------------------------------------- |
| Git            | 2.55                    | já instalado                                                                           |
| Node.js        | 26.13.1                 | `winget install OpenJS.NodeJS.LTS`                                                     |
| pnpm           | 12.23.0                 | `npm install -g pnpm`                                                                  |
| WSL 2          | —                       | PowerShell **como administrador**: `wsl --install --no-distribution`, depois reiniciar |
| Docker Desktop | 29.9.3 (Compose v5.7.1) | `winget install Docker.DockerDesktop`                                                  |

**Política de scripts do PowerShell.** O erro "a execução de scripts foi desabilitada" bloqueia `npm` e `pnpm`. Correção, só para o seu usuário:

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

**Corepack.** O Node 26 não inclui mais o `corepack`. Por isso o pnpm é instalado com `npm install -g pnpm`.

## 2. Conferir as ferramentas

```powershell
node -v; pnpm -v; docker -v; docker compose version
```

O Docker Desktop precisa estar aberto. Teste: `docker info --format "{{.ServerVersion}}"` deve mostrar a versão.

## 2.1. Clonar o repositório

Escolha uma pasta **fora do OneDrive** (por exemplo `C:\dev`): o OneDrive tenta sincronizar a pasta `node_modules` (milhares de arquivos), o que deixa tudo lento e pode gerar erros.

```powershell
git clone https://github.com/Amt2525/projeto_web2.git
cd projeto_web2
pnpm install
```

Os arquivos de texto usam quebra de linha LF em qualquer sistema (arquivo `.gitattributes`), para o Prettier não reclamar no Windows.

## 3. Criar o arquivo `.env`

O `.env` guarda senhas e **nunca vai para o Git**. Ele é gerado a partir do `.env.example`, trocando os valores `TROQUE_*` por segredos aleatórios. Na raiz do projeto:

```powershell
pnpm env:criar
```

O script ([scripts/criar-env.ps1](../../scripts/criar-env.ps1)) usa o gerador aleatório do sistema operacional, coloca a mesma senha em `POSTGRES_PASSWORD` e em `DATABASE_URL` e **não sobrescreve** um `.env` que já exista. Cada pessoa tem o seu `.env`, com segredos diferentes.

Manualmente, a regra é: a senha de `POSTGRES_PASSWORD` precisa ser a mesma que aparece dentro de `DATABASE_URL`.

## 4. Subir o banco e o servidor de e-mail de teste

Na raiz do projeto:

```powershell
pnpm db:up
```

Na primeira vez baixa as imagens (cerca de 200 MB). Depois:

```powershell
pnpm db:status
```

Os dois serviços devem aparecer como `healthy`.

| Serviço       | Endereço                | Para quê                                               |
| ------------- | ----------------------- | ------------------------------------------------------ |
| PostgreSQL 18 | `localhost:5432`        | banco de dados                                         |
| Mailpit v1.34 | `http://localhost:8025` | ler e-mails de recuperação de senha em desenvolvimento |

Ambos aceitam conexões só da própria máquina (`127.0.0.1`).

## 5. Parar

```powershell
pnpm db:down
```

Isso para os contêineres e **mantém os dados** no volume `solarsystem_postgres_data`. Apagar também os dados (destrutivo) exige `-v` e deve ser feito conscientemente.

## 6. Problemas comuns

| Sintoma                                         | Causa provável                                       | Solução                                                              |
| ----------------------------------------------- | ---------------------------------------------------- | -------------------------------------------------------------------- |
| `docker info` dá erro 500 ou "pipe"             | Docker Desktop fechado, ainda iniciando ou sem WSL 2 | Abrir o Docker Desktop, esperar estabilizar; instalar o WSL (item 1) |
| `npm`/`pnpm` "execução de scripts desabilitada" | Política do PowerShell                               | Comando do item 1                                                    |
| `pnpm` não reconhecido                          | Terminal aberto antes da instalação                  | Fechar e reabrir o PowerShell                                        |
| `port is already allocated`                     | Outro programa usa 5432, 1025 ou 8025                | Fechar o outro programa (ex.: um PostgreSQL local)                   |
| `POSTGRES_PASSWORD` vazio / aviso de variável   | `.env` ausente ou com nome errado                    | Criar o `.env` na raiz                                               |

## 7. Instalar as dependências e rodar o projeto

Na raiz do projeto:

```powershell
pnpm install
```

Verificações (devem terminar sem erro):

```powershell
pnpm typecheck
pnpm lint
pnpm test
```

Gerar o cliente do banco e criar as tabelas (com o `pnpm db:up` já executado):

```powershell
pnpm db:generate
pnpm db:deploy
```

O primeiro cria o código do Prisma (não vai para o Git). O segundo aplica as migrations ao banco. Para conferir: `pnpm --filter @solarsystem/backend db:status` deve dizer "Database schema is up to date!".

Subir os três programas, **cada um em um terminal separado**:

```powershell
pnpm dev:backend
pnpm dev:simulator
pnpm dev:frontend
```

| Programa         | Endereço                           | O que mostra                                                 |
| ---------------- | ---------------------------------- | ------------------------------------------------------------ |
| API (backend)    | `http://127.0.0.1:3000/api/health` | `{"status":"ok","service":"backend",...}`                    |
| Simulador        | `http://127.0.0.1:4010/health`     | `{"status":"ok","service":"simulator","simulated":true,...}` |
| Front-end (Vite) | `http://localhost:5173`            | Página "SolarSystem" com "API online"                        |

O front-end só mostra "API online" se a API estiver rodando. Se aparecer "API indisponível", suba o backend.

Observação: `pnpm install` pode avisar sobre scripts de instalação ignorados do `esbuild`. É esperado (ver ADR 0012).

## 8. Plano B sem Docker

Instalar o PostgreSQL 18 nativamente, criar usuário e banco com os valores do `.env` e usar outro servidor SMTP de teste. Não foi testado.
