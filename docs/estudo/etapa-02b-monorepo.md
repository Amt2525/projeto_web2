# Guia de estudo — Etapa 2B: estrutura do monorepo

## O que foi feito

Criamos o "esqueleto" do sistema: quatro pacotes que já rodam, cada um com um exemplo mínimo e testes. Ainda **não há funcionalidade de negócio** (login, usinas, alarmes). O objetivo é provar que as ferramentas funcionam juntas antes de construir em cima delas.

## Mapa do projeto

```
SolarSystem/
├── apps/
│   ├── backend/      API (Fastify). Porta 3000
│   ├── simulator/    Plataforma FICTÍCIA de monitoramento. Porta 4010
│   └── frontend/     Telas (React + Vite). Porta 5173
├── packages/
│   └── shared/       Código usado pelo front E pelo back (esquemas Zod)
├── tsconfig.base.json   Regras do TypeScript, herdadas por todos
├── eslint.config.js     Regras do lint (inclui acessibilidade no front)
└── pnpm-workspace.yaml  Diz ao pnpm quais pastas são pacotes
```

## Como as peças se comunicam

```
Navegador ──► Vite (5173) ──proxy /api──► Backend (3000) ──► (Etapa 3+) PostgreSQL
                                              │
                                              └──► (Etapa 5) Simulador (4010)

packages/shared  ◄── importado pelo backend E pelo frontend
```

O navegador só conversa com o Vite. Quando a página pede `/api/health`, o Vite repassa para o backend. Para o navegador, é tudo "um site só" (mesma origem).

## Arquivos e responsabilidade

| Arquivo                          | Responsabilidade                                                                                                    |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `packages/shared/src/health.ts`  | Define, com Zod, o formato da resposta de `/api/health`. É a "regra" que front e back concordam em seguir           |
| `apps/backend/src/app.ts`        | **Monta** a API e registra a rota `/api/health`. Não abre porta                                                     |
| `apps/backend/src/server.ts`     | **Inicia** a API: lê configurações e abre a porta 3000 (só em `127.0.0.1`)                                          |
| `apps/backend/src/config/env.ts` | Valida as variáveis de ambiente. Se `API_PORT` for inválida, a API nem sobe                                         |
| `apps/backend/src/*.test.ts`     | Testes automáticos da rota e da validação de variáveis                                                              |
| `apps/simulator/src/app.ts`      | Rota `/health` do simulador, que sempre responde `simulated: true`                                                  |
| `apps/frontend/src/App.tsx`      | Tela inicial. Chama `/api/health`, valida a resposta com o esquema compartilhado e mostra "API online/indisponível" |
| `apps/frontend/vite.config.ts`   | Configura o Vite e o **proxy** de `/api` para o backend                                                             |

## Conceitos novos

- **Monorepo / workspace:** vários programas no mesmo repositório que se enxergam. O `"@solarsystem/shared": "workspace:*"` significa "use o pacote que está nesta pasta, não da internet".
- **TypeScript:** JavaScript com tipos. Se você tentar usar um número onde deveria ser texto, o editor e o `pnpm typecheck` avisam **antes** de rodar. Os tipos **desaparecem** quando o programa roda.
- **Zod:** verifica dados **em tempo de execução**. Tipos não protegem contra uma requisição maliciosa, o Zod sim. Exemplo do SolarSystem: `API_PORT=abc` é rejeitado na inicialização.
- **Fastify:** o servidor da API. Uma rota é "quando chegar `GET /api/health`, rode esta função".
- **`app.inject` (testes):** simula uma requisição sem abrir porta de rede. Por isso `buildApp` e `server.ts` são separados.
- **React / componente:** `App` é uma função que devolve o que aparece na tela. `useState` guarda um valor que, ao mudar, redesenha a tela. `useEffect` roda código depois de a tela aparecer (aqui, chamar a API).
- **Vite:** servidor de desenvolvimento do front-end, com atualização instantânea.
- **Proxy:** o Vite recebe o pedido e repassa a outro servidor. Evita problemas de CORS em desenvolvimento.
- **Lint (ESLint):** "corretor" do código. Aqui também verifica **acessibilidade**: uma imagem sem texto alternativo é rejeitada.
- **Prettier:** formata o código num padrão único (aspas, espaços).
- **Vitest:** executa os testes automáticos.

## Como executar e testar

```powershell
pnpm install
pnpm typecheck
pnpm lint
pnpm test
```

Para ver funcionando, em três terminais: `pnpm dev:backend`, `pnpm dev:simulator`, `pnpm dev:frontend`. Abram `http://localhost:5173` (deve mostrar "API online") e depois **parem o backend** e recarreguem a página (deve mostrar "API indisponível").

### Resultados obtidos em 25/11/2026 (máquina de Atos)

| Verificação                         | Resultado                                                                            |
| ----------------------------------- | ------------------------------------------------------------------------------------ |
| `pnpm typecheck` (4 pacotes)        | Passou                                                                               |
| `pnpm lint`                         | Passou, e uma regra de acessibilidade foi comprovada reprovando uma imagem sem `alt` |
| `pnpm format:check`                 | Passou                                                                               |
| `pnpm test`                         | 11 testes passaram (shared 3, backend 5, simulador 1, front 2)                       |
| `pnpm audit`                        | Sem vulnerabilidades conhecidas                                                      |
| Backend, simulador e Vite iniciaram | Respostas corretas. O proxy `5173 → 3000` funcionou                                  |
| Navegador real (clique, tela)       | **Não testado**: só verifiquei respostas HTTP e testes automáticos                   |

## Erros comuns

- **"API indisponível" na tela:** o backend não está rodando.
- **`Cannot find module '@solarsystem/shared'`:** faltou `pnpm install` na raiz.
- **Porta em uso (`EADDRINUSE`):** já há um programa na 3000, 4010 ou 5173. Feche o anterior.
- **Vite não abre em `127.0.0.1:5173`:** use `localhost:5173`. O Vite escuta em `localhost`.
- **`ERR_PNPM_IGNORED_BUILDS` do esbuild:** já tratado no `pnpm-workspace.yaml` (ADR 0012).

## Segurança considerada

- A API e o simulador escutam só em `127.0.0.1` em desenvolvimento.
- Variáveis de ambiente são validadas com Zod na inicialização.
- A resposta do `/api/health` é validada antes de ser enviada (nunca devolvemos algo fora do formato).
- Segurança de verdade (cabeçalhos HTTP, limite de requisições, login) começa na **Etapa 3**. Hoje **não há** nenhuma proteção além disso, e isso é esperado.

## Como explicar na apresentação

"O projeto é um monorepo com três programas: a API, o simulador de plataforma e o front-end, mais um pacote compartilhado onde ficam os esquemas de validação. O mesmo esquema Zod valida os dados no back-end e no front-end, então os dois nunca discordam sobre o formato."

## Perguntas prováveis da banca

1. Por que separar `app.ts` de `server.ts`? _(Para testar as rotas sem abrir porta de rede.)_
2. Para que serve o pacote `shared`? _(Uma única definição de formato de dados para front e back.)_
3. Se o TypeScript já tem tipos, por que usar Zod? _(Tipos somem em tempo de execução e não protegem contra dados externos.)_
4. Por que o Vite tem proxy? _(Mesma origem em desenvolvimento: menos CORS e cookies mais simples.)_
5. Por que o TypeScript está na versão 6 e não na 7? _(Compatibilidade com o `typescript-eslint`. Ver ADR 0012.)_
6. Por que o simulador responde `simulated: true`? _(Dados simulados nunca podem passar por reais.)_

## Para vocês confirmarem que entenderam

Expliquem em voz alta, sem olhar: (a) o caminho de uma requisição desde o navegador até `/api/health` e a volta; (b) por que `loadEnv` rejeita `API_PORT=abc` e o que isso evita; (c) a diferença entre um tipo TypeScript e um esquema Zod.
