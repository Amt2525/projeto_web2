# ADR 0015 — Decisões de segurança da API de autenticação (Etapa 3B)

**Status:** Aprovada. Implementada e testada em 25/11/2026 (branch `feat/autenticacao`).

Complementa o [ADR 0007](0007-autenticacao-jwt.md) com as decisões concretas de implementação.

## Decisões

1. **Cookies em vez de cabeçalho `Authorization`.** Os tokens ficam em cookies `HttpOnly` (o JavaScript da página não os lê, então um XSS não os rouba), `SameSite=Strict` e `Secure` em produção. Trade-off: cookies exigem proteção CSRF (item 2).
2. **CSRF em três camadas:** `SameSite=Strict`; cabeçalho obrigatório `X-Requested-By` em toda requisição que altera dados (outro site não consegue enviá-lo sem uma checagem CORS prévia, que não liberamos); e verificação do `Origin` quando presente. Não há plugin de CORS: só aceitamos o front por mesma origem (proxy do Vite em desenvolvimento).
3. **Caminhos dos cookies:** o de acesso vale em `/api`; o de renovação só em `/api/auth`, reduzindo onde ele trafega. Não usamos o prefixo `__Host-` porque ele exige HTTPS e quebraria o desenvolvimento local.
4. **Resposta única de falha de login** (`CREDENCIAIS_INVALIDAS`) para e-mail inexistente, senha errada, conta inativa e conta bloqueada. O motivo real vai só para a auditoria. Evita enumeração de usuários.
5. **Tempo de resposta equalizado:** para e-mail inexistente, ainda executamos uma verificação Argon2 contra um hash falso.
6. **Bloqueio de conta:** 5 falhas seguidas bloqueiam por 15 minutos; sucesso zera o contador. **Risco residual:** um atacante pode bloquear a conta de uma vítima de propósito (negação de serviço dirigida). Mitigações: limite de 10 tentativas por minuto por IP no login, bloqueio curto, e registro em auditoria.
7. **Limite de requisições:** 100 por minuto por IP no geral, 10 no login, 30 no refresh, 5 na troca de senha. Contadores em memória: reiniciam com o servidor e não são compartilhados entre instâncias. Atrás de um proxy é preciso configurar `trustProxy` corretamente, senão todos os usuários parecem ter o mesmo IP.
8. **Rotação de refresh token com detecção de reuso**, com "reivindicação" atômica no banco (`UPDATE ... WHERE used_at IS NULL`). Testado com duas renovações simultâneas: só uma vence. **Efeito colateral aceito:** duas abas que renovem exatamente ao mesmo tempo podem derrubar a sessão; o front-end deve serializar as renovações.
9. **Rotas sensíveis conferem a sessão no banco** (`requireActiveSession`): troca de senha hoje; administração de usuários e credenciais de integração no futuro. Rotas comuns confiam no JWT por até 15 minutos.
10. **Troca de senha encerra todas as outras sessões** e abre uma nova só para quem trocou.
11. **Entrada validada com Zod em modo estrito** (`strictObject`): campos desconhecidos são rejeitados (mass assignment). Corpo máximo de 16 KB. Só `application/json` é aceito. O leitor de JSON recusa `__proto__` e `constructor` (prototype pollution). Corpo JSON vazio é tolerado como "sem corpo" para não quebrar clientes que sempre enviam o cabeçalho.
12. **Erros padronizados e sem vazamento:** formato único `{ error: { code, message, details? } }`; erros inesperados viram um 500 genérico. Mensagens de validação não incluem o valor digitado.
13. **Auditoria** em `audit_logs`: login (sucesso e falha, com motivo), bloqueio, logout, reuso de token e troca de senha. Sem senhas, tokens ou hashes. O IP é dado pessoal (LGPD): será coberto por uma política de retenção (pendente).
14. **Cabeçalhos de segurança** com `@fastify/helmet` e remoção de `X-Powered-By`.
15. **Banco de teste separado** (`<banco>_test`), criado e migrado automaticamente. Os testes recusam rodar em qualquer banco cujo nome não termine em `_test`.

## Limitações conhecidas (riscos residuais)

- JWT de acesso roubado vale até 15 minutos mesmo após logout (exceto nas rotas sensíveis).
- Mudança de perfil ou desativação do usuário só afeta o JWT já emitido quando ele expirar (`/me` e rotas sensíveis consultam o banco).
- Rate limit e bloqueio não impedem um ataque distribuído (muitos IPs, uma conta por IP) além do bloqueio por conta.
- Sem 2FA, sem verificação de senhas vazadas, sem recuperação de senha por e-mail ainda (planejada).
- O segredo JWT está no `.env` da mesma máquina.
- Limpeza de refresh tokens expirados e retenção de auditoria ainda não implementadas.
- Não testado em navegador real, nem contra um proxy reverso.
