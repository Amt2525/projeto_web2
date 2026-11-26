# ADR 0017 — Cadastro de usinas (Etapa 4)

**Status:** Aprovada (Atos autorizou seguir com os padrões recomendados da proposta). Implementada e verificada em 26/11/2026 (branch `feat/usinas`, ainda não integrada à `main`).

## Escopo

Só o **cadastro** de usinas: criar, listar (busca, filtros, paginação), ver detalhe, editar, desativar e reativar. Inversores, leituras, alarmes e "sem comunicação" ficam para a Etapa 5, junto do contrato da API simuladora. Não há gráficos nem números de energia: nenhum dado de produção existe ainda.

## Decisões

1. **Capacidade em Wp inteiro no banco, kWp na tela e na API.** A pessoa digita "75,5"; o servidor guarda 75500 Wp (`kwpParaWp`, com `Math.round` para evitar o erro de ponto flutuante de `0.29 * 1000`). No máximo 3 casas decimais (1 Wp) e até 100.000 kWp.
2. **Duas camadas de validação, com a mesma regra.** O Zod (`packages/shared/src/plant.ts`) valida na API e no formulário; o banco repete as regras como `CHECK` (nomes sem espaços nas pontas e com tamanho limitado, capacidade positiva, as 27 UFs, coordenadas no intervalo e sempre em par). O teste "o banco recusa dados inválidos mesmo sem passar pela API" prova a segunda camada.
3. **Duplicidade:** índice único em `(lower(name), lower(city), state)`. O mesmo nome em outra cidade ou UF é permitido. O Prisma não descreve índices com expressão, então ele existe só na migration SQL (conferido: `prisma migrate diff` não acusa divergência). A API traduz a violação do banco (código `P2002`) em `409 USINA_DUPLICADA`.
4. **Desativar em vez de apagar** (`is_active`). Não existe exclusão definitiva. Desativar e reativar são operações idempotentes.
5. **Latitude e longitude opcionais, sempre juntas.** Ausência é `NULL`, nunca zero. Um `CHECK` com `BETWEEN` deixaria passar uma coordenada sozinha (comparação com `NULL` não é falsa); o teste de banco achou esse defeito e a migration agora exige `IS NOT NULL` explícito.
6. **Autorização no back-end.** Ler exige login. Escrever exige login, **sessão ainda ativa no banco** (`requireActiveSession`) e perfil `ADMIN` ou `TECNICO`, listados de forma explícita: um perfil novo não ganha escrita sem alguém decidir isso. Técnico e admin veem todas as usinas (regra de negócio acordada).
7. **Anti mass assignment:** `strictObject` rejeita qualquer campo fora da lista (`id`, `isActive`, `createdById`...). Quem cadastrou (`created_by_id`) vem do JWT, nunca do corpo. `PUT` recebe a usina **completa**; mudar a situação só pelas rotas `activate`/`deactivate`.
8. **DTO:** a resposta só tem os campos públicos (sem `created_by_id`). Wp vira kWp, `Decimal` vira número, datas viram texto.
9. **Auditoria na mesma transação** da gravação (`USINA_CRIADA`, `USINA_EDITADA`, `USINA_DESATIVADA`, `USINA_REATIVADA`, com `plantId` em `metadata`). Se a gravação falha, nenhum registro de auditoria fica para trás.
10. **Paginação:** máximo de 50 por página (padrão 10), ordem estável por `name, id` (sem o desempate, a paginação pode repetir ou pular itens), página além do fim devolve lista vazia.
11. **Busca** por nome, cliente e cidade com `contains` do Prisma (parâmetro, sem concatenar SQL). Caracteres `%` e `_` não são tratados de forma especial; só ampliam a busca.
12. **Front-end:** filtros na URL (recarregar, voltar e compartilhar funcionam), valores estranhos na URL são ignorados, a situação é sempre texto (não só cor), desativar pede confirmação, formulário em texto com conversão (vírgula decimal) e o **mesmo esquema Zod** do servidor. Componentes próprios continuam sem shadcn/ui: tabela, filtros e confirmação ficaram simples o bastante com Tailwind.

## Alternativas descartadas

- Incluir inversores agora: o contrato do simulador ainda não existe; modelar seria adivinhar.
- `PATCH` parcial: exigiria validar combinações (par de coordenadas) sobre dados incompletos. `PUT` completo é mais simples e mais seguro.
- Capacidade em kWp decimal no banco: arredondamento e comparação ficam imprecisos. Inteiro em Wp segue a convenção do projeto.
- Apagar usinas: perde histórico que as próximas etapas (leituras, alarmes) vão referenciar.

## Limitações e riscos residuais

- **Sem teste automatizado em navegador (Playwright)** nem teste com leitor de tela. A verificação no navegador foi manual (uma execução, desktop e 375 px).
- **Atraso de até 15 min na leitura:** a rota de leitura não consulta a sessão no banco (só o JWT). Quem foi desativado ainda lê a lista até o JWT expirar. A escrita não tem esse atraso. Decisão consciente, a mesma do ADR 0015.
- **Edição simultânea:** vale a última gravação (sem controle de versão). Aceitável com poucas pessoas; fica registrado.
- **Tabela em celular:** rola na horizontal dentro do próprio quadro, em vez de virar cartões.
- **Sem exclusão definitiva e sem histórico de alterações** além da auditoria (que guarda o id da usina, não os valores antigos).
- O `lower()` do PostgreSQL depende da configuração de idioma do banco; letras acentuadas foram testadas só no ambiente local.
