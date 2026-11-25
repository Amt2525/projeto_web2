# Guia de estudo — Etapa 2C: banco de dados, Prisma e migrations

## O que foi feito

Conectamos o back-end ao PostgreSQL por meio do **Prisma** e criamos a primeira tabela real, `users` (usuários). Ainda **não existe login nem cadastro**: só a estrutura no banco, com regras de integridade, e a prova de que o Prisma consegue ler e gravar nela.

## Arquivos e responsabilidade

| Arquivo                                            | Responsabilidade                                                                                    |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `apps/backend/prisma/schema.prisma`                | **Descreve** as tabelas em formato legível (modelo `User`, enum `Role`). É a "planta" do banco      |
| `apps/backend/prisma/migrations/.../migration.sql` | O **SQL** que cria as tabelas, versionado no Git. Inclui as restrições `CHECK` que escrevemos à mão |
| `apps/backend/prisma.config.ts`                    | Diz ao Prisma onde estão o schema e as migrations, e qual é o `DATABASE_URL` (lido do `.env`)       |
| `apps/backend/src/generated/prisma/`               | Código **gerado** pelo Prisma (cliente tipado). Não editamos e não vai para o Git                   |
| `apps/backend/package.json` (scripts `db:*`)       | Atalhos: `db:generate`, `db:migrate`, `db:deploy`, `db:status`                                      |
| `docs/architecture/adr/0013-...md`                 | Decisões desta etapa (versão do Prisma, vulnerabilidade, configuração)                              |

## Como as peças se conectam

```
schema.prisma ──(prisma migrate)──► migration.sql ──► PostgreSQL (tabela users)
      │
      └──(prisma generate)──► src/generated/prisma ──► código do backend: prisma.user.create(...)
                                                              │ usa o adaptador pg
                                                              ▼
                                                         PostgreSQL
```

## Conceitos novos

- **Banco relacional / tabela / coluna / linha:** uma tabela é uma "planilha" com colunas fixas e tipos definidos. `users` tem uma linha por usuário.
- **SQL:** a linguagem do banco. Exemplos com o SolarSystem:
  - `SELECT * FROM users WHERE email = 'ana@exemplo.com';` (buscar)
  - `INSERT INTO users (...) VALUES (...);` (criar)
  - `UPDATE users SET is_active = false WHERE id = '...';` (alterar)
- **Chave primária (`PRIMARY KEY`):** identifica cada linha de forma única. Aqui é o `id`.
- **UUID v7:** identificador longo e aleatório (`01a21187-5252-...`). Não é sequencial (1, 2, 3...), então ninguém adivinha o ID do próximo usuário. O "v7" começa com a data, o que ajuda o banco a ordenar.
- **`UNIQUE`:** impede dois e-mails iguais. É uma regra do banco, não só do código.
- **`CHECK`:** regra extra de uma coluna. Exemplo: o e-mail precisa estar em minúsculas. Se alguém (ou outro programa) tentar gravar `Ana@x.com`, o banco **recusa**.
- **`NOT NULL`:** a coluna não pode ficar vazia.
- **Enum (`user_role`):** lista fechada de valores (`ADMIN`, `TECNICO`). Qualquer outro é recusado.
- **`timestamptz`:** data e hora **com fuso**, guardada em UTC. Evita erro de horário. Exibimos em America/Sao_Paulo só na tela.
- **ORM (Prisma):** em vez de escrever SQL à mão, escrevemos `prisma.user.create({ data: {...} })` e ele monta o SQL. O código fica tipado: se você errar o nome de uma coluna, o editor avisa.
- **Migration:** um arquivo SQL numerado que muda o banco de um estado para o próximo. O histórico completo fica no Git, então qualquer pessoa recria o banco rodando as migrations em ordem. **Nunca se edita uma migration já aplicada**: cria-se outra.
- **Consulta parametrizada:** o valor digitado pelo usuário vai **separado** do SQL, nunca colado nele. Isso impede **SQL Injection**. Exemplo abaixo.

### SQL Injection com um exemplo do SolarSystem

Código **perigoso** (nunca faremos): `"SELECT * FROM users WHERE email = '" + entrada + "'"`. Se `entrada` for `x' OR '1'='1`, o SQL vira "traga todos os usuários".

Código **seguro** (o que usamos): ``prisma.$queryRaw`SELECT ... WHERE email = ${entrada}` ``. O Prisma envia `entrada` como **dado**, nunca como SQL.

## Como executar e testar

Com o banco no ar (`pnpm db:up`):

```powershell
pnpm db:generate
pnpm db:deploy
pnpm --filter @solarsystem/backend db:status
```

Para olhar a tabela no banco:

```powershell
docker compose --env-file .env -f infra/docker-compose.yml exec postgres psql -U solarsystem -d solarsystem -c "\d users"
```

### Resultados obtidos em 25/11/2026 (máquina de Atos)

| Verificação                                                                                     | Resultado                                                                                            |
| ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Migration `criar_usuarios` aplicada                                                             | Aplicada, status "up to date"                                                                        |
| Estrutura da tabela (`\d users`)                                                                | 8 colunas, índice único e 4 `CHECK`                                                                  |
| Insert válido                                                                                   | Aceito                                                                                               |
| E-mail duplicado                                                                                | **Recusado** (violação de `UNIQUE`)                                                                  |
| E-mail com maiúscula                                                                            | **Recusado** (`CHECK`)                                                                               |
| Nome só com espaços                                                                             | **Recusado** (`CHECK`)                                                                               |
| Hash de senha vazio                                                                             | **Recusado** (`CHECK`)                                                                               |
| Papel inexistente (`SUPERUSER`)                                                                 | **Recusado** (enum)                                                                                  |
| Script temporário com Prisma + adaptador: criar, duplicar, maiúscula e busca com `x' OR '1'='1` | Criou; recusou os dois inválidos; busca retornou 0 resultados                                        |
| `pnpm typecheck`, `lint`, `format:check`, `test` (11 testes)                                    | Passaram                                                                                             |
| `pnpm audit`                                                                                    | **Achou 1 vulnerabilidade alta** (`effect`). Corrigida com `overrides`; depois, sem vulnerabilidades |

**O que NÃO foi feito:** não existe teste automático que acesse o banco. Os testes de restrições foram executados à mão (SQL em transação revertida e um script temporário, já apagado). Testes automáticos de banco entram na Etapa 3, com um banco de teste separado.

## Erros comuns

- **`Cannot find module '.../generated/prisma/client'`:** faltou `pnpm db:generate` (o código gerado não vem no Git).
- **`Environment variable not found: DATABASE_URL`:** falta o `.env` na raiz, ou o comando não foi rodado pelos scripts do `pnpm`.
- **`Can't reach database server at localhost:5432`:** o Docker não está rodando. Rode `pnpm db:up`.
- **"Drift detected" ao rodar `db:migrate`:** alguém alterou o banco à mão ou editou uma migration já aplicada. Não resolver com "reset" sem falar com o time: apaga os dados.
- **Apagar o banco por engano:** `docker compose ... down -v` destrói o volume. Evite.

## Segurança considerada

- Senhas: a coluna se chama `password_hash` e o `CHECK` exige que não seja vazia. A senha **nunca** é gravada em texto puro (o hash Argon2id entra na Etapa 3).
- Regras de integridade ficam **no banco** (`UNIQUE`, `CHECK`, enum), não só no código. Se um bug na API deixasse passar um dado inválido, o banco ainda recusaria.
- Consultas parametrizadas: testamos uma tentativa de injeção e ela retornou 0 resultados. O Prisma **não torna o sistema seguro sozinho**: se concatenarmos texto em SQL cru, voltamos a ter o risco.
- UUID v7 dificulta adivinhar IDs, mas **não substitui** a checagem de permissão (isso é Etapa 3).
- Vulnerabilidade encontrada e tratada: ver ADR 0013, item 7. Risco residual: o override troca uma dependência que o Prisma não testou.

## Como explicar na apresentação

"Usamos PostgreSQL com o ORM Prisma. O schema descreve as tabelas, e cada alteração vira uma migration versionada no Git, então qualquer pessoa recria o banco do zero. As regras mais importantes, como e-mail único e em minúsculas, ficam no próprio banco, que é a última linha de defesa. O Prisma usa consultas parametrizadas, e testamos uma tentativa de SQL Injection."

## Perguntas prováveis da banca

1. Para que serve um ORM e quais os riscos de usá-lo? _(Evita SQL manual e dá tipos; mas SQL cru mal escrito ainda é vulnerável, e consultas ingênuas geram N+1.)_
2. Como o sistema evita SQL Injection? _(Consultas parametrizadas; o valor viaja separado do SQL. Testamos `x' OR '1'='1`.)_
3. Por que colocar `CHECK` no banco se a API já valida? _(Defesa em camadas: o banco protege contra bugs e contra outros programas.)_
4. O que é uma migration e por que não editar uma antiga? _(Histórico reproduzível; editar quebra quem já aplicou.)_
5. Por que UUID e não 1, 2, 3? _(Não dá para adivinhar o próximo ID. Mas não substitui autorização.)_
6. Por que guardar data com fuso (`timestamptz`)? _(Evita erros de horário; guardamos UTC e exibimos em Brasília.)_
7. Por que o Prisma 7.10.1 e não o 8? _(O 8 ainda é release candidate. Ver ADR 0013.)_
8. O que fazer se o `pnpm audit` achar uma falha? _(Avaliar se alcança produção, atualizar ou forçar versão corrigida, e documentar. Foi o que fizemos.)_

## Para vocês confirmarem que entenderam

Expliquem em voz alta, sem olhar: (a) a diferença entre `schema.prisma`, migration e código gerado; (b) por que o e-mail em minúsculas é garantido pelo banco e não só pela API; (c) por que `prisma.$queryRaw` com `${entrada}` é seguro mas concatenar texto não é; (d) o que fazer quando a migration "já aplicada" precisa de um ajuste.
