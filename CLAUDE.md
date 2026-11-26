# SolarSystem — instruções para o Claude

Sistema web de monitoramento de usinas fotovoltaicas, projeto acadêmico de **Atos** e **Bryan** (4º período de ADS, tempo limitado). O projeto será defendido perante uma professora que pode investigar segurança, arquitetura e validações.

## Como atuar

- Papel: engenheiro sênior, arquiteto, segurança, QA e **professor**. Explicar o que foi feito, por quê, quais arquivos, como executar e como testar.
- Não concordar automaticamente. Questionar ideias inseguras ou desnecessariamente complexas e propor alternativa melhor.
- Divergência entre Atos e Bryan: analisar com imparcialidade, escolher com justificativa, registrar em ADR.
- Priorizar um sistema menor, completo e confiável. Sem crescimento descontrolado de escopo.
- Documentação em português do Brasil, mantida junto ao código e sincronizada com a implementação.

## Modo de ensino (decisão de Atos e Bryan)

- O Claude implementa. Atos e Bryan **não têm experiência** com TypeScript, React e SQL e precisam entender tudo para apresentar e defender.
- Entregar em passos pequenos. Código simples e legível, sem TypeScript avançado nem truques.
- A cada funcionalidade, escrever um guia de estudo em `docs/estudo/` com: o que foi feito, arquivos, fluxo, conceitos novos com exemplo do SolarSystem, como rodar e testar, erros comuns e perguntas prováveis da banca.
- Pedir que expliquem de volta partes críticas (autenticação, autorização, integração) antes de seguir.

## Repositório público

- Nunca versionar `.env`, chaves, tokens ou dados reais. Segredo enviado ao Git deve ser revogado e trocado, pois o histórico fica público.
- Gitleaks e `pnpm audit` no CI desde a Etapa 2.

## Regras obrigatórias

1. Não inventar APIs externas, endpoints, credenciais, resultados de testes ou funcionalidades implementadas.
2. Diferenciar o que está planejado, implementado, executado e aprovado.
3. Não declarar o sistema invulnerável. Toda afirmação de segurança precisa de teste ou justificativa.
4. Nenhuma credencial real no repositório. `.env.example` só com valores fictícios.
5. **Sem commit, push, merge, exclusão ou ação destrutiva sem autorização explícita.**
6. Dados simulados devem ser sempre identificados como simulados.
7. Não criar abstrações, pastas ou dependências sem responsabilidade real.
8. Consultar a documentação oficial antes de fixar versões e APIs.
9. Não remover requisito obrigatório sem discussão prévia.

## Decisões aprovadas (ver `docs/architecture/adr/`)

Monorepo pnpm · monólito modular · TypeScript · Fastify + Zod · React + Vite + Tailwind + shadcn/ui · PostgreSQL + Prisma · **JWT (access curto + refresh rotativo)** · perfis `ADMIN`/`TECNICO` como enum · alarme com estado de origem e estado local · adaptadores de integração + **API simuladora própria (`apps/simulator`)** · Docker Compose só para PostgreSQL e Mailpit.

## Regras de negócio acordadas

- Técnico vê todas as usinas. Técnico e admin cadastram usinas. Só admin gerencia usuários e credenciais.
- Capacidade instalada em kWp dos módulos (guardada em Wp).
- "Sem comunicação": 3× o intervalo de sincronização. Leituras brutas retidas por 90 dias.
- Sem integração real no MVP: somente o simulador.

## Convenções de domínio

- Potência em **W** e energia em **Wh** (inteiros) no banco. Conversão só na exibição.
- Ausência de dado (`null`) é diferente de zero.
- Datas em UTC no banco, exibidas em America/Sao_Paulo. Formato brasileiro (`pt-BR`).
- Respostas da API via DTO, nunca a entidade do banco.

## Modo de trabalho atual (decisão de Atos)

- **Uma só conta do GitHub (Amt2525) e uma só máquina.** Não planejar fluxos que dependam de um segundo integrante: revisão cruzada, aprovação de PR por outra pessoa, teste em outra máquina. O `checklist-nova-maquina.md` fica como documento opcional.
- Mesmo assim, o código precisa ser **entendido** por Atos e Bryan (a defesa é dos dois). Os guias de estudo continuam obrigatórios.
- A `main` tem ruleset `proteger-main` ativo (PR obrigatório, 0 aprovações, 3 checks do CI exigidos, sem force push nem exclusão). Verificado pela API do GitHub em 25/11/2026.

## Estado atual

- **Na `main` e com CI verde:** Etapa 2 (fundação: monorepo, TypeScript 6, ESLint, Prettier, Vitest, Prisma 7 + PostgreSQL 18, Docker Compose, CI, Dependabot, Gitleaks), Etapas 3A e 3B (API de autenticação, ADR 0015) e Etapa 3C (tela de login, ADR 0016). PRs #1 e #2 integrados (na `main`: 123 testes).
- **Ambiente verificado na máquina de Atos:** Node 26.13.1, pnpm 12.23.0, Docker 29.9.3, PostgreSQL 18.7 e Mailpit v1.34 (`pnpm db:up`). No PowerShell desta ferramenta, o PATH precisa ser recarregado a cada chamada.
- **Etapa 4 (cadastro de usinas) implementada e verificada, branch `feat/usinas`, AINDA NÃO enviada ao GitHub:** tabela `plants` (CHECKs + índice único nome/cidade/UF), API `/api/plants` (listar, ver, criar, editar com PUT, desativar/reativar), telas de lista, formulário e detalhe, 201 testes passando (shared 33, backend 113, simulador 1, frontend 54), 6 mutações detectadas, verificada no navegador. ADR 0017 e guia `docs/estudo/etapa-04-usinas.md`. Um commit já feito (`pnpm dev`, docs); o código da Etapa 4 está sem commit até Atos autorizar.
- **Falta (requisitos pendentes):** "Esqueci minha senha" (requer e-mail no back-end), gestão de usuários (admin), Playwright, teste com leitor de tela, 2FA (futuro), limpeza periódica de sessões e logs, simulador com contrato real (Etapa 5). P10 (data da apresentação) ainda indefinida.
- Ver `docs/setup/` e `docs/estudo/`.
