# ADR 0016 — Front-end: autenticação e tela de login (Etapa 3C)

**Status:** Aprovada. Implementada e verificada em 25/11/2026 (branch `feat/tela-login`, baseada em `feat/autenticacao`).

## Decisões

1. **Tokens nunca ficam acessíveis ao JavaScript.** O front não guarda token em `localStorage`, `sessionStorage` nem em variável: a sessão vive em cookies `HttpOnly` (ADR 0015). O front só sabe "quem é o usuário" (nome, e-mail, perfil), obtido de `GET /api/auth/me`. Verificado no navegador: `document.cookie` vazio e nada de token nos storages.
2. **Cliente HTTP único** (`src/api/client.ts`): envia `X-Requested-By` em toda requisição que altera dados, declara JSON só quando há corpo e transforma erros em `ApiError` com a mensagem segura da API.
3. **Renovação automática com "voo único" (_single-flight_).** Ao receber 401, o cliente renova a sessão e repete a requisição **uma vez**. Se várias requisições recebem 401 juntas, todas esperam **uma** renovação. Isso é necessário porque o refresh token vale uma vez só (ADR 0015, item 8). Login, refresh e logout nunca disparam renovação (um 401 no login é "senha errada").
4. **Validação no front é conforto, não segurança.** O formulário usa o **mesmo esquema Zod** do servidor (`packages/shared`). A validação que vale é a do back-end.
5. **Redirecionamento seguro após o login.** O destino vem do estado interno do roteador (não da URL) e só aceita caminhos internos (`/algo`, nunca `//site` ou `http://...`). Testado.
6. **Rotas protegidas no front são só experiência.** `ProtectedRoute` impede de ver a tela sem sessão, mas quem protege os dados é a API.
7. **Logout limpa o cache** de dados do usuário (menos a consulta de autenticação, que a tela ainda observa).
8. **Sem link "Esqueci minha senha" por enquanto.** A recuperação por e-mail não existe no back-end; um link para algo que não funciona seria pior que nenhum. É um requisito obrigatório ainda **pendente**.
9. **Componentes de interface próprios e mínimos** (`Button`, `TextField`, `PasswordField`) com Tailwind, em vez de instalar o shadcn/ui agora. O shadcn/ui (ADR 0005) entra quando houver componentes complexos (menus, diálogos, tabelas), que é onde ele compensa. Evita dependências sem uso.
10. **Acessibilidade verificada, não presumida:** rótulos ligados aos campos, erros ligados por `aria-describedby` e `aria-invalid`, foco no primeiro campo inválido, aviso geral em `role="alert"`, botão de senha com nome acessível, foco visível, `lang="pt-BR"`, um `main` e um `h1`. Contrastes medidos no navegador (ver `styles.css`).

## Limitações e riscos residuais

- **Sem teste automatizado em navegador (E2E).** A verificação no navegador foi manual (uma execução) e o restante é teste de componente com `fetch` simulado. Playwright está planejado.
- **Sem teste com leitor de tela real** (NVDA, VoiceOver). A acessibilidade foi verificada por inspeção, por testes de componente e por medição de contraste.
- Se a sessão expirar no meio do uso, as telas futuras precisam tratar o 401 final (voltar ao login). Só `ProtectedRoute` e `/me` tratam isso hoje.
- Tela inicial **provisória**: sem dados de usinas.
- Medições de contraste só da tela de login.
