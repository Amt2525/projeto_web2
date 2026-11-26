# Checklist: instalação em uma máquina nova

Use este roteiro quando outra pessoa (ou outra máquina) for rodar o projeto pela primeira vez. Preencha a coluna "Resultado" com o que **realmente aconteceu**, sem adivinhar. Se algo falhar, copie a mensagem de erro completa.

Instruções detalhadas de cada passo: [ambiente-windows.md](ambiente-windows.md).

| #   | Passo                                                                                    | Resultado esperado                              | Resultado obtido |
| --- | ---------------------------------------------------------------------------------------- | ----------------------------------------------- | ---------------- |
| 1   | `git --version`                                                                          | Mostra a versão                                 |                  |
| 2   | `node -v`                                                                                | `v26.x`                                         |                  |
| 3   | `pnpm -v` (pode ser preciso `Set-ExecutionPolicy` e `npm install -g pnpm`)               | `12.x`                                          |                  |
| 4   | `docker -v` e `docker info --format "{{.ServerVersion}}"` (Docker Desktop aberto, WSL 2) | Mostra a versão do cliente e do servidor        |                  |
| 5   | `git clone https://github.com/Amt2525/projeto_web2.git` em pasta fora do OneDrive        | Pasta criada                                    |                  |
| 6   | `pnpm install`                                                                           | Termina sem erro                                |                  |
| 7   | `pnpm env:criar`                                                                         | Mensagem ".env criado"                          |                  |
| 8   | `pnpm db:up` e depois `pnpm db:status`                                                   | `postgres` e `mailpit` como `healthy`           |                  |
| 9   | `pnpm db:generate`                                                                       | "Generated Prisma Client"                       |                  |
| 10  | `pnpm db:deploy`                                                                         | "All migrations have been successfully applied" |                  |
| 10b | `pnpm db:seed`                                                                           | "Criado: admin@..." e "Criado: tecnico@..."     |                  |
| 11  | `pnpm typecheck`                                                                         | Sem erros                                       |                  |
| 12  | `pnpm lint`                                                                              | Sem erros                                       |                  |
| 13  | `pnpm format:check`                                                                      | "All matched files use Prettier code style!"    |                  |
| 14  | `pnpm test` (com o banco no ar: o teste cria o banco `solarsystem_test`)                 | 96 testes passando (12 + 81 + 1 + 2)            |                  |
| 15  | `pnpm dev:backend` e abrir `http://127.0.0.1:3000/api/health`                            | JSON com `"status":"ok"`                        |                  |
| 16  | `pnpm dev:simulator` e abrir `http://127.0.0.1:4010/health`                              | JSON com `"simulated":true`                     |                  |
| 17  | `pnpm dev:frontend` e abrir `http://localhost:5173`                                      | Página "SolarSystem" com "API online"           |                  |
| 18  | Parar o backend (`Ctrl+C`) e recarregar a página                                         | Aparece "API indisponível"                      |                  |
| 19  | Abrir `http://localhost:8025`                                                            | Caixa de entrada vazia do Mailpit               |                  |

Também anote: quanto tempo levou do clone até o passo 14, e qualquer trecho do guia que estava confuso, incompleto ou errado. Isso vira correção na documentação.

**Antes de rodar na mesma máquina de outro integrante:** os passos 8 e 15 a 17 usam as portas 5432, 1025, 8025, 3000, 4010 e 5173. Se o projeto já estiver rodando na máquina, pare-o antes (`pnpm db:down`).
