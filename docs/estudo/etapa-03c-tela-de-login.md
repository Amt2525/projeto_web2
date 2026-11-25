# Guia de estudo — Etapa 3C: a tela de login (front-end)

> **Status honesto:** a tela de login funciona de ponta a ponta com a API real e foi verificada num navegador de verdade. **Falta:** o link "Esqueci minha senha" (a recuperação por e-mail não existe no back-end), teste automatizado em navegador (Playwright) e teste com leitor de tela real. A tela inicial é **provisória**: não mostra nenhum dado de usina.

## O que foi feito

- **Tela de login** (`/login`): e-mail, senha com botão "Mostrar", validação, aviso de erro, estado "Entrando...".
- **Tela inicial provisória** (`/`): nome e perfil de quem entrou e botão "Sair".
- **Rotas protegidas:** sem sessão, abrir `/` leva ao login. Há também a página "não encontrada".
- **Cliente da API** que cuida do cabeçalho anti-CSRF, dos erros e da renovação automática da sessão.
- **Estilo** com Tailwind CSS, em azul sobre superfícies neutras.

## Arquivos e responsabilidade

| Arquivo                       | Responsabilidade                                                                               |
| ----------------------------- | ---------------------------------------------------------------------------------------------- |
| `src/main.tsx`                | Liga tudo: React, roteador, cache de dados e o provedor de autenticação                        |
| `src/App.tsx`                 | Mapa das telas (qual endereço mostra qual tela e quais exigem login)                           |
| `src/api/client.ts`           | **Toda** conversa com a API: cabeçalho `X-Requested-By`, JSON, `ApiError`, renovação da sessão |
| `src/api/auth.ts`             | As chamadas de login, logout e "quem sou eu", com validação da resposta                        |
| `src/auth/AuthContext.tsx`    | Guarda "quem está logado" e oferece `login()` e `logout()` a qualquer tela                     |
| `src/auth/ProtectedRoute.tsx` | Barra quem não tem sessão e manda para `/login`                                                |
| `src/pages/LoginPage.tsx`     | A tela de login e seu comportamento                                                            |
| `src/pages/HomePage.tsx`      | Tela inicial provisória                                                                        |
| `src/components/ui/*`         | Peças reutilizáveis: `Button`, `TextField`, `PasswordField`                                    |
| `src/styles.css`              | Tailwind, fonte, cor do foco, e os contrastes medidos                                          |
| `src/test/utils.tsx`          | Ajudantes dos testes: `fetch` falso, renderização com roteador                                 |

## Como as peças se conectam

```
Navegador ──► Vite (5173) ──proxy /api──► API (3000)

LoginPage ──useAuth().login()──► AuthContext ──entrar()──► api() ──fetch POST /api/auth/login──►
                                      │                                                         │
                                      │ ◄──────── usuário (nome, e-mail, perfil) ◄──────────────┘
                                      └─ guarda o usuário; os cookies HttpOnly ficam só com o navegador
```

## Conceitos novos (com exemplos do SolarSystem)

- **Componente React:** uma função que devolve o que aparece na tela. `LoginPage` é um componente; `Button` também.
- **Estado (`useState`):** um valor que, ao mudar, redesenha a tela. Ex.: se a senha está visível, ou a mensagem de erro do login.
- **Efeito (`useEffect`):** código que roda depois de a tela aparecer. Ex.: trocar o título da aba para "Entrar — SolarSystem".
- **Contexto (`AuthContext`):** um "quadro de avisos" que qualquer tela lê sem passar dados de mão em mão. Aqui: quem está logado.
- **Roteador (`react-router`):** decide qual tela mostrar para cada endereço, sem recarregar a página.
- **TanStack Query:** busca e guarda dados do servidor. Aqui, a pergunta "quem está logado?".
- **React Hook Form + Zod:** controla o formulário e usa o **mesmo esquema** do servidor (`packages/shared`) para validar. Mensagens em português e uma regra só.
- **Tailwind CSS:** em vez de escrever CSS à parte, aplicamos classes pequenas direto no elemento (`rounded-md`, `text-blue-800`).
- **XSS:** injeção de script na página. O React escapa o que é mostrado (um nome com `<script>` aparece como texto), e os tokens são `HttpOnly`, então mesmo um XSS não os leria.
- **Redirecionamento aberto:** alguém monta um link para o login que, depois de entrar, leva a um site malicioso. Aceitamos só destinos internos (`/algo`), nunca `//site`.
- **Renovação com "voo único":** quando o JWT expira, várias requisições recebem 401 ao mesmo tempo. Todas esperam **uma** só renovação, porque o refresh token vale uma vez (duas renovações derrubariam a sessão).
- **Acessibilidade (WCAG 2.2 AA):** rótulo sempre visível e ligado ao campo; erro ligado ao campo por `aria-describedby`; foco no primeiro campo inválido; erro em texto (não só cor); `role="alert"` para o aviso geral; foco visível; tudo operável pelo teclado.

## Como executar e testar

```powershell
pnpm db:up
pnpm dev:backend
pnpm dev:frontend
```

Abra `http://localhost:5173` e entre com o usuário de demonstração (e-mail e senha em `SEED_*` do seu `.env`, criados por `pnpm db:seed`). Testes automáticos: `pnpm test`.

### Resultados obtidos em 25/11/2026 (máquina de Atos)

| Verificação                                                           | Resultado                                                                 |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `pnpm typecheck`, `lint`, `format:check`, `audit --audit-level high`  | Passaram                                                                  |
| Testes totais                                                         | **123 passaram** (shared 12, backend 81, simulador 1, **front 29**)       |
| Build de produção do front                                            | Passou (JS 130 kB e CSS 3 kB comprimidos)                                 |
| **No navegador:** `/` sem sessão                                      | Redirecionou para `/login`                                                |
| **No navegador:** envio vazio                                         | Mensagens em texto, foco no e-mail com anel visível                       |
| **No navegador:** senha errada                                        | Aviso genérico, senha limpa, foco na senha                                |
| **No navegador:** login correto                                       | Tela inicial com nome e perfil                                            |
| **No navegador:** `document.cookie`, `localStorage`, `sessionStorage` | **Vazios** (cookies `HttpOnly`, nenhum token acessível ao JavaScript)     |
| **No navegador:** POST sem `X-Requested-By`                           | 403                                                                       |
| **No navegador:** recarregar a página                                 | Sessão mantida                                                            |
| **No navegador:** "Sair"                                              | `/me` e `/refresh` passam a dar 401; abrir `/` leva ao login              |
| **No navegador:** celular (375×812)                                   | Layout correto, sem rolagem lateral                                       |
| Contraste medido no navegador                                         | Menor valor: 4,76:1 (borda dos campos, mínimo 3:1); textos acima de 6,4:1 |
| Logs da API contêm cookie, token ou senha?                            | Não (0 ocorrências)                                                       |

**O que NÃO foi testado:** Playwright (E2E automatizado); leitor de tela real; outros navegadores além do embutido; expiração real do JWT em 15 minutos e a renovação automática no navegador (só em teste com `fetch` simulado); acessibilidade das telas futuras.

**Bugs encontrados testando (e corrigidos):**

1. O nome acessível do botão da senha saiu `"Mostrarsenha"` (sem espaço) por depender de um `<span>` escondido. Trocamos por `aria-label` explícito. Também removemos `aria-pressed`: junto com um rótulo que muda soaria contraditório.
2. No logout, `queryClient.clear()` apagava a consulta de autenticação enquanto a tela ainda a observava, o que podia disparar uma consulta extra a `/me`. Agora limpamos só os dados que não são de autenticação.

**Observação:** o usuário de teste do navegador foi criado por um script com codificação ANSI e o nome apareceu com um caractere quebrado ("Usu�rio"). O defeito era do meu script de teste, não do sistema. Ele foi removido do banco, junto com seus registros de auditoria.

## Erros comuns

- **Tela em branco:** erro de JavaScript; abra o console do navegador (F12).
- **"API indisponível"/"não foi possível conectar":** o back-end não está rodando (`pnpm dev:backend`).
- **Login retorna 403:** o front não enviou `X-Requested-By` (se você usar outro cliente) ou o `Origin` não é `http://localhost:5173`.
- **Login funciona mas `/` volta ao login:** cookie `Secure` em `http`. Só acontece com `NODE_ENV=production` sem HTTPS.
- **O Tailwind não aplica estilos:** esqueceu `import './styles.css'` em `main.tsx` ou o plugin no `vite.config.ts`.

## Segurança considerada

Ver [ADR 0016](../architecture/adr/0016-front-end-autenticacao.md). O ponto central: **o front-end não é uma barreira de segurança.** Qualquer pessoa pode alterar o JavaScript no próprio navegador. As proteções reais (autenticação, autorização, validação, CSRF, limites) estão na API; o front só melhora a experiência.

## Como explicar na apresentação

"A tela de login valida com o mesmo esquema Zod do servidor, mas a validação que vale é a do back-end. O front não guarda token: a sessão fica em cookies HttpOnly, então um XSS não consegue roubá-los, e provamos isso no navegador vendo `document.cookie` vazio. O cliente da API envia o cabeçalho anti-CSRF e renova a sessão automaticamente com uma única renovação, mesmo com várias requisições ao mesmo tempo. A tela foi verificada com teclado, contraste medido e em tamanho de celular."

## Perguntas prováveis da banca

1. Se o front valida, por que o back-end valida de novo? _(O front pode ser alterado ou ignorado por quem chama a API direto. Só a validação do servidor é confiável.)_
2. Onde o token fica guardado no navegador? _(Em cookies `HttpOnly`, inacessíveis ao JavaScript. Nada em `localStorage`.)_
3. O `ProtectedRoute` impede alguém de acessar os dados? _(Não. Ele só esconde telas. Quem protege os dados é a autorização na API.)_
4. O que é e como se previne um redirecionamento aberto? _(Link que leva a site malicioso após o login. Aceitamos só caminhos internos. Testado.)_
5. O que acontece quando o JWT expira durante o uso? _(O cliente renova a sessão com o refresh token e repete a requisição, uma vez. Várias requisições compartilham uma só renovação.)_
6. Como o React evita XSS? _(Escapa o conteúdo exibido. Não usamos `dangerouslySetInnerHTML`.)_
7. Como a tela atende acessibilidade? _(Rótulos ligados, erros ligados e anunciados, foco visível, contraste medido, tudo pelo teclado. Falta teste com leitor de tela.)_
8. Por que não há "Esqueci minha senha"? _(É requisito obrigatório ainda pendente: precisa do fluxo por e-mail no back-end. Preferimos não mostrar um link que não funciona.)_
9. Por que Tailwind e componentes próprios e não uma biblioteca pronta? _(Menos dependências agora; o shadcn/ui entra quando houver componentes complexos.)_
10. Quais as limitações atuais? _(Veja a lista de "não testado" acima e o ADR 0016.)_

## Para vocês confirmarem que entenderam

Expliquem em voz alta, sem olhar: (a) o caminho completo de um clique em "Entrar" até a tela inicial, passando por cada arquivo; (b) por que `document.cookie` vazio é uma boa notícia e que ataque ele dificulta; (c) por que várias requisições com 401 ao mesmo tempo precisam compartilhar uma só renovação; (d) por que `ProtectedRoute` não é segurança; (e) a diferença entre `useState`, `useEffect` e contexto, cada uma com um exemplo desta tela.
