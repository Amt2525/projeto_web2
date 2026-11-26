# Guia de estudo — Etapa 4: cadastro de usinas

> **Status honesto:** o cadastro de usinas funciona de ponta a ponta (banco → API → telas) e foi verificado num navegador de verdade. **Falta:** Playwright, teste com leitor de tela, e tudo que é produção (inversores, leituras, alarmes: Etapa 5 em diante). Os dados que aparecem no sistema hoje são só os que vocês cadastram; a usina "Demonstração Norte (simulada)" foi criada por mim para testar e está marcada como simulada.

## O que foi feito

- Tabela `plants` no banco, com restrições (CHECK) e índice de duplicidade.
- API em `/api/plants`: listar (busca, filtros, paginação), ver, criar, editar (PUT), desativar e reativar.
- Três telas: **lista**, **cadastro/edição** e **detalhe**, mais um cabeçalho com navegação.
- 78 testes novos (21 de regras de validação, 32 da API, 25 das telas).

## Arquivos e responsabilidade

| Arquivo                                             | Responsabilidade                                                                     |
| --------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `packages/shared/src/plant.ts`                      | **As regras** (Zod): campos, limites, UF, kWp↔Wp. Usado pela API e pelo formulário   |
| `apps/backend/prisma/schema.prisma`                 | Modelo `Plant`                                                                       |
| `.../migrations/20261126012704_criar_usinas`        | SQL: tabela, CHECKs escritos à mão e índice único `(lower(nome), lower(cidade), UF)` |
| `apps/backend/src/modules/plants/plants.routes.ts`  | Rotas e **quem pode** (guardas). Valida a entrada e chama o serviço                  |
| `apps/backend/src/modules/plants/plants.service.ts` | A lógica: consultas, conversão Wp→kWp (DTO), duplicidade, auditoria em transação     |
| `apps/frontend/src/api/plants.ts`                   | Chamadas da API pelo front, validando a resposta                                     |
| `apps/frontend/src/pages/PlantsListPage.tsx`        | Lista: filtros na URL, tabela, paginação, estados de carregando/vazio/erro           |
| `apps/frontend/src/pages/PlantFormPage.tsx`         | Formulário (cadastro e edição) com o mesmo esquema Zod do servidor                   |
| `apps/frontend/src/pages/PlantDetailPage.tsx`       | Detalhe, editar, desativar com confirmação, reativar                                 |
| `apps/frontend/src/components/AppLayout.tsx`        | Cabeçalho com navegação, nome do usuário e "Sair"                                    |

## Fluxo: cadastrar uma usina

```
Formulário (texto) ──► converte "75,5" em 75.5 ──► Zod (shared) valida ──► POST /api/plants
                                                                              │
   guardas: logado? sessão ativa no banco? perfil permitido? ◄───────────────┘
        │
   Zod valida de novo (a do servidor é a que vale) ──► kWp × 1000 = 75500 Wp
        │
   transação: INSERT em plants + INSERT em audit_logs ──► banco confere os CHECKs e o índice único
        │
   DTO (Wp→kWp, sem created_by_id) ◄── 201        409 se for duplicada
```

## Conceitos novos (com exemplos do SolarSystem)

- **CHECK constraint:** regra que o próprio banco aplica. Ex.: `capacity_wp > 0`. Mesmo que alguém grave por fora da API, o banco recusa.
- **Índice único com expressão:** `lower(name)` faz "Usina Sol" e "USINA SOL" contarem como iguais. O Prisma não sabe descrevê-lo, então ele vive no SQL da migration.
- **Transação:** gravar a usina **e** a auditoria juntas: ou as duas entram, ou nenhuma.
- **Mass assignment:** o cliente envia campos que não deveria (`isActive`, `createdById`). O `strictObject` do Zod **rejeita** o corpo inteiro se houver campo desconhecido.
- **DTO:** o formato público da resposta. Aqui, converte Wp em kWp e esconde `created_by_id`.
- **Paginação estável:** ordenar por `nome` e, em empate, por `id`. Sem o desempate, a mesma usina pode aparecer em duas páginas ou sumir.
- **Idempotência:** desativar duas vezes dá o mesmo resultado, sem erro.
- **Estado na URL:** `?q=sol&state=MG&page=2`. Dá para recarregar, voltar e mandar o link.
- **`null` ≠ 0:** latitude em branco é `null` (não informada). Zero seria uma posição de verdade (a linha do Equador).

## Como executar e testar

```powershell
pnpm dev
```

Abra http://localhost:5173, entre com o usuário `SEED_TECNICO_*` do `.env`, clique em **Usinas → Cadastrar usina**. Testes automáticos: `pnpm test` (201 no total).

Roteiro manual sugerido: (1) enviar o formulário vazio e ver as mensagens; (2) preencher só a latitude; (3) cadastrar com capacidade `75,5`; (4) tentar cadastrar de novo o mesmo nome (aviso de duplicada); (5) desativar, ver que some da lista "Ativas", mudar o filtro para "Todas" e reativar.

### Resultados obtidos em 26/11/2026 (máquina de Atos)

| Verificação                                                                             | Resultado                                                                                                       |
| --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `pnpm typecheck`, `lint`, `format:check`, `audit --audit-level high`                    | Passaram                                                                                                        |
| Testes totais                                                                           | **201 passaram** (shared 33, backend 113, simulador 1, front 54)                                                |
| Build de produção do front                                                              | Passou (JS 138 kB e CSS 3,5 kB comprimidos)                                                                     |
| Mutações (6 proteções quebradas de propósito)                                           | Todas derrubaram pelo menos um teste: sessão ativa, login, autor vindo da sessão, 409, auditoria, ordem estável |
| **No navegador:** formulário vazio                                                      | Mensagens em texto junto dos campos, foco no primeiro inválido                                                  |
| **No navegador:** só latitude                                                           | "Informe latitude e longitude juntas..."                                                                        |
| **No navegador:** cadastro com `75,5`                                                   | Detalhe aberto; banco guardou **75500 Wp**, com autor e linha de auditoria                                      |
| **No navegador (chamadas diretas):** duplicada / sem CSRF / campo extra / busca com SQL | 409 / 403 / 400 / 200 sem efeito                                                                                |
| **No navegador:** desativar com confirmação                                             | Saiu da lista "Ativas"; reativar pela API devolveu `isActive: true`                                             |
| Celular (375×812)                                                                       | Sem rolagem lateral da página; a tabela rola dentro do próprio quadro                                           |
| Contraste medido na lista                                                               | Menor valor 6,83:1 (mínimo AA: 4,5:1)                                                                           |

**O que NÃO foi testado:** Playwright; leitor de tela; outros navegadores; uso por duas pessoas ao mesmo tempo; milhares de usinas (desempenho); o clique em "Reativar" pela interface (só pela API e em teste de componente).

**Bug que os testes acharam (e foi corrigido antes de seguir):** o `CHECK` das coordenadas deixava passar uma latitude sozinha, porque comparar com `NULL` não dá "falso" no SQL. A migration passou a exigir `IS NOT NULL` explícito. Isso mostra por que o banco também precisa de teste.

## Erros comuns

- **Lista vazia depois de cadastrar:** o filtro "Ativas" está ligado e a usina foi desativada. Mude para "Todas".
- **`409` ao cadastrar:** já existe uma usina com o mesmo nome (sem diferenciar maiúsculas) na mesma cidade e UF.
- **Capacidade rejeitada:** use no máximo 3 casas decimais e até 100.000 kWp. Vírgula ou ponto funcionam.
- **`403` chamando a API de fora do site:** falta o cabeçalho `X-Requested-By`.
- **Erro ao rodar `prisma` com `EBUSY`:** o projeto está numa pasta do OneDrive, que às vezes trava arquivos por instantes. Rode de novo.

## Segurança considerada

Ver [ADR 0017](../architecture/adr/0017-cadastro-de-usinas.md). Em resumo: autorização no servidor (login + sessão ativa + perfil), validação dupla (Zod e CHECK), campos desconhecidos rejeitados, autor vindo do JWT, busca por parâmetro (sem SQL montado por texto), DTO sem campos internos, auditoria na mesma transação e limites de página. **Não** afirmamos que o sistema é invulnerável: não houve teste de penetração.

## Como explicar na apresentação

"Cada usina tem capacidade em Wp inteiro no banco, e a tela mostra kWp. A mesma regra de validação, escrita uma vez no pacote compartilhado, roda no formulário e na API, e o banco repete as regras como CHECK, então nem um acesso direto grava lixo. Quem cadastrou vem do token, nunca do corpo; campos extras são rejeitados. Desativamos em vez de apagar para preservar o histórico que os alarmes e leituras vão usar. Provamos as proteções quebrando-as de propósito: os testes ficaram vermelhos."

## Perguntas prováveis da banca

1. Por que guardar a capacidade em Wp e não em kWp com decimais? _(Inteiro não tem erro de arredondamento; é a convenção do projeto para potência e energia.)_
2. Se a API já valida, por que o banco também? _(Defesa em profundidade: outro programa, um script ou um bug futuro podem gravar sem passar pela API. Provamos com um teste que fala direto com o banco.)_
3. Como evitam duas usinas iguais? _(Índice único por nome, cidade e UF, sem diferenciar maiúsculas. É o índice do banco que garante, inclusive para dois cadastros ao mesmo tempo (por como o índice funciona; não fizemos teste de concorrência real). A API traduz em 409.)_
4. O que é mass assignment e como previnem? _(Cliente envia campos que não deveria, como `isActive`. `strictObject` rejeita o corpo; o autor vem do JWT.)_
5. Por que a escrita checa a sessão no banco e a leitura não? _(Escrita é mais sensível. Na leitura aceitamos até 15 min de atraso do JWT, decisão registrada.)_
6. Por que `PUT` e não `PATCH`? _(Validar um corpo completo é mais simples e seguro, principalmente a regra do par latitude/longitude.)_
7. Por que desativar em vez de apagar? _(Alarmes e leituras futuras vão referenciar a usina; apagar perderia histórico.)_
8. Como evitam SQL injection na busca? _(O Prisma envia o texto como parâmetro. Há teste com `'; DROP TABLE plants; --`.)_
9. Por que a paginação ordena por nome **e** id? _(Sem desempate, itens com o mesmo nome podem repetir ou sumir entre páginas.)_
10. Dois usuários editando a mesma usina? _(Vale a última gravação; é uma limitação registrada, aceitável para poucas pessoas.)_
11. Algum defeito apareceu durante os testes? _(Sim: nosso primeiro CHECK deixava passar uma latitude sozinha. O teste de banco achou; veja "Bug que os testes acharam".)_

## Para vocês confirmarem que entenderam

Expliquem em voz alta, sem olhar: (a) o caminho de um clique em "Cadastrar usina" até a linha no banco, nomeando cada arquivo; (b) por que existem validação no Zod **e** CHECK no banco; (c) como o sistema impede que alguém cadastre uma usina em nome de outro usuário; (d) o que acontece se dois técnicos cadastrarem a mesma usina no mesmo segundo; (e) por que `null` e zero são coisas diferentes numa coordenada.
