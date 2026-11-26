# Guia de estudo — Etapa 3B: a API de autenticação e sua segurança

> **Status honesto:** a API de autenticação **funciona e foi testada** (testes automáticos com banco real e um ciclo completo contra o servidor de desenvolvimento). **Ainda não existe a tela de login**, então nada disso foi testado em navegador. A verificação por e-mail (recuperação de senha) também não existe ainda.

## O que foi feito

| Rota                             | O que faz                                                           |
| -------------------------------- | ------------------------------------------------------------------- |
| `POST /api/auth/login`           | Confere e-mail e senha, cria a sessão e devolve os cookies          |
| `POST /api/auth/refresh`         | Troca o refresh token por um par novo (rotação) quando o JWT expira |
| `POST /api/auth/logout`          | Encerra a sessão (idempotente)                                      |
| `GET /api/auth/me`               | Diz quem está logado                                                |
| `POST /api/auth/change-password` | Troca a senha, encerra as outras sessões                            |

Além disso: bloqueio de conta, limite de requisições, proteção CSRF, cabeçalhos de segurança, auditoria, erros padronizados, seed de demonstração e CI com PostgreSQL.

## Arquivos e responsabilidade

| Arquivo                                    | Responsabilidade                                                            |
| ------------------------------------------ | --------------------------------------------------------------------------- |
| `src/app.ts`                               | Monta a aplicação: parser de JSON seguro, erros, segurança, rotas           |
| `src/plugins/security.ts`                  | Helmet, cookies, limite de requisições e a defesa CSRF                      |
| `src/plugins/error-handler.ts`             | Todo erro vira `{ error: { code, message } }` sem detalhes internos         |
| `src/errors.ts`                            | `AppError` e as mensagens padronizadas (ex.: credenciais inválidas)         |
| `src/modules/auth/auth.routes.ts`          | As 5 rotas. **Só** lê a requisição, valida com Zod e chama o serviço        |
| `src/modules/auth/auth.service.ts`         | **As regras**: login, bloqueio, rotação, reuso, troca de senha              |
| `src/modules/auth/guards.ts`               | "Guardas": `requireAuth`, `requireActiveSession`, `requireRole`             |
| `src/modules/auth/cookies.ts`              | Como os cookies são definidos (HttpOnly, SameSite, Secure, caminho)         |
| `src/modules/audit/audit.ts`               | Grava eventos de auditoria                                                  |
| `prisma/seed.ts`                           | Cria o admin e o técnico de demonstração com senhas do `.env`               |
| `test/global-setup.ts` e `test/helpers.ts` | Cria o banco `_test`, aplica as migrations e oferece funções para os testes |
| `packages/shared/src/auth.ts`              | Esquemas Zod de login e troca de senha (usados também pelo front)           |

**Por que separar rotas e serviço?** A rota fala "HTTP" (cookies, status). O serviço fala "regras" (bloquear conta, rotacionar token). Assim as regras podem ser entendidas e testadas sem pensar em HTTP.

## Fluxo do login, passo a passo

```
1. Navegador ──POST /api/auth/login {email, password} + cabeçalho X-Requested-By──► API
2. Hook de segurança: tem X-Requested-By? O Origin é o nosso? (senão 403)
3. Limite de requisições: já passou de 10 por minuto neste IP? (senão 429)
4. Zod: o corpo tem exatamente email e password, com formato válido? (senão 400)
5. Serviço: busca o usuário pelo e-mail
6. Verifica a senha com Argon2 (contra um hash FALSO se o usuário não existe)
7. Falhou (inexistente, senha errada, inativo ou bloqueado)? Registra a falha, conta tentativa,
   bloqueia aos 5 erros, e responde SEMPRE 401 "E-mail ou senha inválidos..."
8. Deu certo: zera o contador, cria uma "família" de refresh token, assina o JWT de 15 min,
   grava LOGIN_SUCESSO e devolve 200 + dois cookies HttpOnly
```

## Conceitos novos

- **Cookie `HttpOnly`:** o navegador guarda e envia o cookie, mas o JavaScript da página **não consegue ler**. Se alguém injetar um script na página (XSS), ele não rouba o token.
- **`SameSite=Strict`:** o navegador só envia o cookie quando a requisição parte do nosso próprio site.
- **CSRF (Cross-Site Request Forgery):** um site malicioso faz o navegador do usuário enviar uma requisição ao nosso sistema, e o navegador anexa os cookies sozinho. Defesas: `SameSite`, o cabeçalho `X-Requested-By` (outro site não consegue enviá-lo) e a conferência do `Origin`.
- **CORS:** regra do navegador sobre qual site pode ler respostas de outro. Nós **não liberamos** nenhum site, e em desenvolvimento o Vite repassa `/api` para a API, então tudo é "mesma origem".
- **Rate limiting:** limita quantas requisições um IP pode fazer por minuto. Segura robôs de tentativa e erro.
- **Bloqueio de conta:** 5 senhas erradas seguidas bloqueiam por 15 min. Cuidado: atacante pode bloquear a conta de um colega de propósito. Por isso existe também o limite por IP.
- **Enumeração de usuários:** se a resposta fosse "e-mail não encontrado" vs "senha errada", um atacante descobriria quem tem conta. Respondemos a mesma coisa e igualamos o tempo.
- **Rotação com detecção de reuso:** cada refresh token só vale uma vez. Se um usado reaparecer, derrubamos a sessão inteira.
- **Operação atômica:** `UPDATE ... WHERE usedAt IS NULL` garante que, de duas requisições simultâneas, só uma "ganha" o token.
- **Guardas (`preHandler`):** código que roda antes da rota e barra quem não pode entrar. Autorização é decidida **sempre no back-end**.
- **RBAC (controle por perfil):** `ADMIN` e `TECNICO`. Testamos que técnico recebe 403 em rota de admin e que adulterar o perfil no cookie não funciona.
- **Mass assignment:** o cliente envia um campo a mais (`"role": "ADMIN"`) esperando que o servidor o grave. `strictObject` rejeita campos desconhecidos.
- **Prototype pollution:** enviar `"__proto__"` no JSON para alterar objetos do servidor. O leitor de JSON do Fastify recusa.
- **Auditoria:** registro de "quem fez o quê e quando", sem segredos.
- **Teste de mutação:** quebrar o código de propósito para provar que os testes percebem. Fizemos com CSRF, perfil e reuso de token (ver abaixo).

## Como executar e testar

Com o banco no ar (`pnpm db:up`) e as migrations aplicadas:

```powershell
pnpm db:seed
pnpm test
```

Para experimentar à mão, suba `pnpm dev:backend` e use as credenciais de demonstração que estão **no seu `.env`** (`SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`). Elas existem só para demonstração e não estão no repositório.

### Resultados obtidos em 25/11/2026 (máquina de Atos)

| Verificação                                                                                                       | Resultado                                                     |
| ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `pnpm typecheck`, `pnpm lint`, `pnpm audit --audit-level high`                                                    | Passaram                                                      |
| Testes totais                                                                                                     | **96 passaram** (shared 12, backend 81, simulador 1, front 2) |
| Testes de auth/segurança com banco real (`auth.routes.test.ts`)                                                   | 47                                                            |
| Ciclo real contra o servidor e o banco de dev: login, /me, refresh, logout, refresh após logout, login do técnico | 200, 200, 200, 204, **401**, 200                              |
| Eventos de auditoria gravados no banco de dev                                                                     | LOGIN_SUCESSO, LOGIN_FALHA, LOGOUT                            |
| Log da API contém cookie/token/hash?                                                                              | Não (0 ocorrências)                                           |
| Seed executado duas vezes                                                                                         | 2ª vez não alterou nada (idempotente)                         |

**Teste de mutação** (quebrar de propósito e ver os testes reprovarem):

| Código quebrado                                       | Resultado                                                        |
| ----------------------------------------------------- | ---------------------------------------------------------------- |
| Checagem do cabeçalho CSRF removida                   | 2 testes reprovaram                                              |
| `requireRole` deixou de checar o perfil               | 1 teste reprovou                                                 |
| Reuso de refresh token: removida só uma das 2 camadas | **Nada reprovou**: a outra camada cobre (defesa em profundidade) |
| Reuso: removidas as 2 camadas                         | 2 testes reprovaram                                              |

**O que NÃO foi testado:** navegador real (cookies de verdade, CSRF de verdade), proxy reverso, carga, desempenho do Argon2 sob muitos logins simultâneos, recuperação de senha por e-mail, expiração real de 15 minutos (usamos relógio simulado).

**Algo que descobrimos testando:** o `curl`/PowerShell enviam `Content-Type: form-urlencoded` mesmo sem corpo e a API responde 400 (correto: só aceitamos JSON). Já um cliente que envia `Content-Type: application/json` com corpo vazio recebia 400 num logout. Ajustamos o servidor para tolerar corpo vazio, mantendo a proteção contra `__proto__`, e criamos testes para os dois casos.

## Erros comuns

- **403 `REQUISICAO_NAO_AUTORIZADA`:** faltou o cabeçalho `X-Requested-By: solarsystem-web` (ou o `Origin` não é o do front).
- **401 logo após um login correto:** o cookie `Secure` em `http`. Só acontece com `NODE_ENV=production` sem HTTPS.
- **429:** passou de 10 logins por minuto no mesmo IP. Espere um minuto.
- **Conta "bloqueada":** 5 senhas erradas. Espere 15 minutos (ou, só em desenvolvimento, zere `locked_until` no banco).
- **Testes falham com "DATABASE_URL não definida":** falta o `.env` ou o banco não está no ar (`pnpm db:up`).
- **Testes falham por conexão recusada:** Docker parado.

## Segurança considerada

Ver [ADR 0015](../architecture/adr/0015-seguranca-da-autenticacao.md), com as 15 decisões e os riscos residuais. Resumo dos riscos que ainda existem: JWT roubado vale até 15 minutos (exceto rotas sensíveis), bloqueio de conta pode ser usado contra a vítima, limites em memória, ausência de 2FA, e nada testado em navegador.

## Como explicar na apresentação

"O login valida a entrada com Zod, confere a senha com Argon2id e responde sempre a mesma mensagem de erro, para não revelar quais e-mails existem. O sucesso emite um JWT de 15 minutos e um refresh token de uso único, ambos em cookies HttpOnly e SameSite=Strict. Se um refresh token já usado reaparecer, derrubamos a sessão. Contra CSRF usamos SameSite, um cabeçalho obrigatório e a checagem de Origin. Cada uma dessas proteções tem teste, e provamos que os testes falham se a proteção for removida."

## Perguntas prováveis da banca

1. Como o sistema protege contra força bruta? _(Limite por IP, bloqueio por conta após 5 falhas, Argon2 lento; reconheça o risco de bloqueio dirigido.)_
2. Como vocês evitam enumeração de usuários? _(Mesma resposta para tudo e tempo equalizado com hash falso.)_
3. O que impede um site malicioso de fazer o usuário logado trocar a senha? _(CSRF: SameSite=Strict, cabeçalho `X-Requested-By`, Origin; e a troca exige a senha atual.)_
4. Por que cookies HttpOnly e não `localStorage`? _(Um XSS lê o `localStorage`, mas não um cookie HttpOnly.)_
5. O que acontece se roubarem o JWT? _(Vale até 15 minutos; rotas sensíveis conferem a sessão no banco; logout e troca de senha revogam a sessão.)_
6. O que é IDOR/BOLA e como prevenir? _(Acessar o recurso de outro mudando o ID. Hoje só há dados do próprio usuário; nas usinas, todos os técnicos veem tudo por regra de negócio, e as rotas de admin têm `requireRole`.)_
7. Como vocês sabem que as proteções funcionam? _(Testes automáticos com banco real e teste de mutação.)_
8. Onde o perfil do usuário é decidido? _(No JWT assinado no servidor. Testamos que adulterar o perfil invalida o token.)_
9. O que o log registra e o que ele não registra? _(Eventos de segurança com motivo; nunca senha, token ou hash. Testado.)_
10. Quais as limitações atuais? _(Veja a lista de riscos residuais do ADR 0015: sem 2FA, sem recuperação de senha, nada testado em navegador.)_

## Para vocês confirmarem que entenderam

Expliquem em voz alta, sem olhar: (a) o caminho de um login correto e de um com e-mail inexistente, e por que as respostas são iguais; (b) por que `HttpOnly` protege contra XSS e `SameSite` contra CSRF, e por que precisamos dos dois; (c) o que acontece quando dois navegadores usam o mesmo refresh token; (d) por que a troca de senha usa `requireActiveSession` e `/me` não; (e) o que significa "teste de mutação" e por que a mutação do reuso "sobreviveu" na primeira tentativa.
