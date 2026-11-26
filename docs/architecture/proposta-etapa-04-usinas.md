# Proposta — Etapa 4: gerenciamento de usinas

> **Status: PROPOSTA, aguardando aprovação de Atos e Bryan.** Nada disto está implementado. Depois da aprovação, vira ADR 0017 e código.

## Escopo (e o que fica de fora)

**Entra:** cadastrar, listar (busca, filtro, ordenação, paginação), ver detalhe, editar e desativar usinas. Só usuários logados; técnico e admin cadastram e editam (regra acordada). Todos veem todas as usinas.

**Fica para a Etapa 5 (simulador e integração):** inversores, leituras (potência/energia), alarmes e o status "sem comunicação". Motivo: dependem do contrato da API simuladora, que ainda não existe. Modelar agora seria adivinhar.

**Consequência:** nesta etapa a tela de usinas mostra **cadastro**, não produção. Não haverá gráficos nem números de energia (e nenhum dado inventado).

## Tabela `plants`

| Coluna                  | Tipo                | Regra                                                        |
| ----------------------- | ------------------- | ------------------------------------------------------------ |
| `id`                    | UUID v7             | chave primária                                               |
| `name`                  | texto               | obrigatório, 3 a 120 caracteres, sem espaços nas pontas      |
| `client_name`           | texto               | obrigatório, dono ou cliente da usina (até 120)              |
| `capacity_wp`           | inteiro             | **Wp** (módulos), CHECK > 0; a tela recebe/mostra em **kWp** |
| `city`                  | texto               | obrigatório                                                  |
| `state`                 | `char(2)`           | UF, CHECK contra a lista das 27 UFs                          |
| `latitude`, `longitude` | decimal(9,6), nulos | opcionais, CHECK -90..90 e -180..180; ambos ou nenhum        |
| `installed_on`          | data, nula          | opcional; não pode ser futura                                |
| `is_active`             | booleano            | desativar em vez de apagar (preserva histórico)              |
| `created_by`            | UUID → `users`      | quem cadastrou (auditoria)                                   |
| `created_at/updated_at` | timestamptz         | UTC                                                          |

Índices: `(is_active, name)` para a listagem e busca por nome.

**Duplicidade:** índice único em `(lower(name), city, state)`. Evita cadastrar duas vezes "Usina Sol" em Montes Claros/MG, sem impedir o mesmo nome em outra cidade. Erro devolvido: 409 com mensagem clara.

**Por que sem coluna de "plataforma de origem" ainda:** o vínculo com Growatt/Solis/etc. nasce na Etapa 5, junto com credenciais criptografadas. Adicionar depois é uma migration simples.

## API (todas exigem login; escrita exige `X-Requested-By`, como no restante)

| Método e rota                                   | Quem           | O que faz                                                      |
| ----------------------------------------------- | -------------- | -------------------------------------------------------------- |
| `GET /api/plants`                               | logado         | lista com `q`, `state`, `active`, `page`, `pageSize` (máx. 50) |
| `GET /api/plants/:id`                           | logado         | detalhe                                                        |
| `POST /api/plants`                              | ADMIN, TECNICO | cria                                                           |
| `PATCH /api/plants/:id`                         | ADMIN, TECNICO | edita campos enviados                                          |
| `POST /api/plants/:id/deactivate` e `/activate` | ADMIN, TECNICO | desativa/reativa (nada é apagado)                              |

Segurança: schemas Zod **estritos** (campos desconhecidos rejeitados; `created_by`, `is_active` e `id` nunca vêm do cliente em criação), UUID validado, busca parametrizada (Prisma), paginação com teto, resposta por DTO, auditoria de criar/editar/desativar. Cada criação/edição grava em `audit_logs` com o id da usina (sem dados sensíveis).

## Telas

1. **Lista de usinas** (`/usinas`): tabela com nome, cliente, cidade/UF, kWp e situação; busca, filtro por UF e situação; paginação; estados de carregando, vazio e erro; em celular, vira lista de cartões.
2. **Cadastro/edição** (`/usinas/nova`, `/usinas/:id/editar`): formulário com o mesmo schema Zod do servidor, erros ligados aos campos, foco no primeiro inválido (como no login).
3. **Detalhe** (`/usinas/:id`): dados cadastrais e botão desativar com confirmação. Sem energia ainda.
4. Menu/cabeçalho simples com navegação e "Sair" (hoje a tela inicial é provisória).

## Decisões que preciso de vocês

1. **Escopo da Etapa 4** só com cadastro (recomendado) ou já incluir inversores?
2. **Duplicidade** por nome+cidade+UF (recomendado) ou só por nome?
3. **Desativar em vez de apagar** (recomendado). Concordam em não haver exclusão definitiva nesta etapa?
4. **Campos:** falta algo que a professora ou o contexto real exija (ex.: endereço completo, concessionária, tipo de ligação)? Cada campo extra é mais validação e teste.
5. **Componentes de UI:** a lista com tabela, filtros e confirmação é onde o shadcn/ui começa a compensar. Posso adotá-lo (ADR 0005) ou continuo com componentes próprios?

## Como será entregue

Passos pequenos, cada um com testes e verificação: (a) migration + modelo, (b) API com testes de autorização e validação, (c) telas, (d) guia `docs/estudo/etapa-04-usinas.md` e ADR 0017. Branch própria `feat/usinas`, **sem commit sem autorização**.
