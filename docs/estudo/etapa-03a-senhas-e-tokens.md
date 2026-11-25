# Guia de estudo — Etapa 3A: senhas, tokens e sessões (base da autenticação)

> **Status honesto:** esta etapa entrega os **blocos de construção** da autenticação, todos testados isoladamente. **Ainda não existe a rota de login**, nem cookies, nem proteção CSRF, nem limite de tentativas. Isso vem na Etapa 3B. Hoje o sistema **não tem autenticação funcionando**.

## O que foi feito

1. **Senhas:** módulo que transforma a senha em um _hash_ Argon2id e confere depois.
2. **Política de senha:** regras de tamanho e de senhas comuns, num pacote compartilhado (front e back usam a mesma).
3. **Tokens JWT de acesso:** assinar e verificar, rejeitando adulteração, expiração e ataques conhecidos.
4. **Refresh tokens:** geração aleatória e hash para guardar no banco.
5. **Banco:** nova migration com a tabela `refresh_tokens` e colunas de bloqueio de conta em `users`.
6. **Variáveis de ambiente:** a API agora exige `DATABASE_URL` e um segredo JWT de pelo menos 32 caracteres.

## Arquivos e responsabilidade

| Arquivo                                                  | Responsabilidade                                                                                |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `apps/backend/src/modules/auth/password.ts`              | `hashPassword` e `verifyPassword` (Argon2id: 64 MiB, 3 iterações, 1 thread)                     |
| `apps/backend/src/modules/auth/tokens.ts`                | `sign` e `verify` do JWT de acesso (HS256, emissor, destinatário, validade)                     |
| `apps/backend/src/modules/auth/refresh-token.ts`         | Gera o refresh token (256 bits aleatórios) e calcula o hash SHA-256 que vai ao banco            |
| `packages/shared/src/password.ts`                        | Política de senha (12 a 128 caracteres, lista de senhas comuns, não conter o e-mail)            |
| `packages/shared/src/role.ts`                            | Os perfis `ADMIN` e `TECNICO`, usados por front e back                                          |
| `apps/backend/src/config/env.ts`                         | Valida as variáveis de ambiente obrigatórias                                                    |
| `apps/backend/prisma/migrations/..._sessoes_e_bloqueio/` | Tabela `refresh_tokens`, colunas `failed_login_attempts`, `locked_until`, `password_changed_at` |

## Como as peças vão se conectar (Etapa 3B)

```
Login:  e-mail + senha ──► verifyPassword(hash do banco, senha)
                              │ ok
                              ▼
         cria família de refresh tokens (hash no banco) + JWT de acesso (15 min)
                              │
                              ▼
         devolve os dois em cookies HttpOnly

Requisição comum:  cookie com o JWT ──► tokens.verify() ──► quem é o usuário e qual o perfil

JWT expirou:  cookie com o refresh token ──► confere o hash no banco ──► troca por um novo par
              (o antigo vira "usado"; se alguém o apresentar de novo, a família inteira é revogada)
```

## Conceitos novos

- **Hash de senha:** transformação de mão única. Do hash não se volta à senha. Guardamos o hash; ao logar, calculamos o hash da senha digitada e comparamos. Se o banco vazar, o atacante não tem as senhas, só precisa tentar adivinhá-las uma a uma.
- **Argon2id:** algoritmo de hash feito para senhas, propositalmente **lento e que gasta muita memória**, o que encarece ataques de força bruta com placas de vídeo. É a primeira recomendação da OWASP. Usamos mais memória que o mínimo recomendado (64 MiB contra 19 MiB).
- **Sal (_salt_):** parte aleatória misturada à senha antes do hash. Faz a mesma senha gerar hashes diferentes (testado) e invalida tabelas prontas de hashes. O Argon2 guarda o sal dentro do próprio texto do hash.
- **JWT (JSON Web Token):** texto em 3 partes (`cabeçalho.conteúdo.assinatura`). O conteúdo **não é secreto** (qualquer um lê, é só Base64). O que o protege é a **assinatura**: sem o segredo do servidor, não se consegue alterar o conteúdo sem invalidá-la. Por isso nunca colocamos senha ou dados pessoais nele.
- **`alg: none`:** ataque clássico: o atacante troca o cabeçalho para "sem assinatura". Bibliotecas ingênuas aceitam. Nós fixamos a lista de algoritmos aceitos (`HS256`) e **testamos** que `none` e `HS512` são recusados.
- **Claims (`sub`, `iss`, `aud`, `exp`):** campos padrão. `sub` = quem; `iss` = quem emitiu; `aud` = para quem; `exp` = quando expira.
- **Por que 15 minutos de validade:** se o token for roubado, ele só serve por pouco tempo. O refresh token renova sem pedir a senha de novo.
- **Refresh token e rotação:** é uma "senha de uso único" de renovação. A cada uso, trocamos por outro. Se o antigo reaparecer, alguém o copiou: revogamos toda a família (sessão).
- **Por que SHA-256 e não Argon2 para o refresh token?** O token já é aleatório de 256 bits, impossível de adivinhar. Argon2 existe para senhas fracas escolhidas por humanos. O CHECK do banco exige que o valor guardado tenha 64 caracteres hexadecimais, impedindo gravar um token puro por engano.
- **Variável de ambiente validada:** se `JWT_ACCESS_SECRET` tiver menos de 32 caracteres, a API **não sobe**.

## Como executar e testar

```powershell
pnpm test
pnpm --filter @solarsystem/backend db:status
```

### Resultados obtidos em 25/11/2026 (máquina de Atos)

| Verificação                                         | Resultado                    |
| --------------------------------------------------- | ---------------------------- |
| `pnpm typecheck`, `pnpm lint`                       | Passaram                     |
| Testes: shared 12, backend 32, simulador 1, front 2 | **47 passaram**              |
| Migration `sessoes_e_bloqueio`                      | Aplicada, schema atualizado  |
| API sobe com as novas variáveis                     | `/api/health` respondeu `ok` |
| `pnpm audit` com as novas dependências              | Sem vulnerabilidades         |

Testes de segurança desta etapa (todos passam): token adulterado (perfil trocado para `ADMIN`), `alg: none`, outro algoritmo (HS512), outro segredo, outro emissor e destinatário, conteúdo inesperado, token expirado e token lixo; hash de senha com sal diferente, hash corrompido retornando `false`; refresh token único e hash no formato exigido; segredo curto e mensagem de erro que **não vaza** o segredo.

**O que NÃO foi testado:** a integração com o banco (criar e consultar `refresh_tokens` de verdade), a rota de login e o comportamento num navegador. Nada disso existe ainda.

## Erros comuns

- **API não sobe com erro de `JWT_ACCESS_SECRET`:** o `.env` está desatualizado ou ausente. Rode `pnpm env:criar` (só se não houver `.env`) ou copie as variáveis novas do `.env.example`.
- **Argon2 "não encontrado":** a instalação falhou. Rode `pnpm install` de novo. Ele funciona sem os scripts de instalação (ADR 0012, mesma lógica do `esbuild`).
- **Teste de expiração "instável":** não usamos `sleep`; passamos uma data fictícia para `sign` e `verify`.

## Segurança considerada

- Senhas nunca em texto puro nem em log. Hash Argon2id com parâmetros acima do mínimo OWASP.
- Limite máximo de 128 caracteres: evita que uma senha enorme faça o servidor gastar CPU e memória (negação de serviço).
- JWT: algoritmo fixo, emissor e destinatário conferidos, conteúdo validado com Zod depois da assinatura, sem informar o motivo da falha.
- Refresh token só como hash no banco, com CHECK no formato.
- **Riscos residuais:** o JWT roubado vale até expirar (até 15 min), mesmo após o logout (mitigação planejada: conferir a sessão no banco nas rotas sensíveis). O segredo JWT fica no `.env` da mesma máquina. A lista de senhas comuns é pequena; não consultamos bases de vazamentos.

## Como explicar na apresentação

"A senha nunca é guardada: guardamos um hash Argon2id, que é lento de propósito e usa muita memória. O login emite um JWT de 15 minutos e um refresh token aleatório, que no banco só existe como hash e é trocado a cada uso. Se um refresh token já usado reaparecer, revogamos a sessão inteira. Testamos que o token adulterado, sem assinatura ou com outro algoritmo é rejeitado."

## Perguntas prováveis da banca

1. Por que Argon2id e não bcrypt? _(Recomendação principal da OWASP; resistente a GPU por usar memória. bcrypt é o plano B.)_
2. O que impede alguém de editar o JWT e virar admin? _(A assinatura. Testamos a troca de perfil para ADMIN e o token é recusado.)_
3. Por que usar JWT, se sessão em banco seria mais simples? _(Decisão de vocês, ADR 0007: validar sem consultar o banco em toda requisição. Reconheçam o custo: revogação imediata exige consulta ao banco, que é o que fazemos nas rotas sensíveis.)_
4. O JWT é criptografado? _(Não, é só assinado. Qualquer um lê o conteúdo; por isso não há dado sensível nele.)_
5. O que acontece se roubarem o refresh token? _(A rotação detecta o reuso e revoga a família. Risco: o ladrão usar primeiro; então o usuário legítimo é que falha e precisa logar de novo.)_
6. Por que o refresh token usa SHA-256 e a senha usa Argon2? _(Entropia: o token é aleatório de 256 bits; a senha é escolhida por humanos.)_
7. Por que limitar o tamanho da senha? _(Evita negação de serviço pelo custo do Argon2.)_
8. O que é `alg: none` e como vocês se protegem? _(Cabeçalho que pede "sem assinatura". Fixamos o algoritmo aceito e temos teste.)_

## Para vocês confirmarem que entenderam

Expliquem em voz alta, sem olhar: (a) por que dois hashes da mesma senha são diferentes e ainda assim a conferência funciona; (b) por que o conteúdo do JWT pode ser lido por qualquer pessoa e mesmo assim não pode ser alterado; (c) o que é a "família" de refresh tokens e o que o reuso significa; (d) por que um access token roubado ainda vale depois do logout, e como reduzimos esse risco.
