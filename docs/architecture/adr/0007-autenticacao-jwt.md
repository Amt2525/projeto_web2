# ADR 0007 — Autenticação com JWT (access curto + refresh rotativo)

**Status:** Aprovada (escolha de Atos e Bryan). Detalhes de implementação sujeitos a validação com a documentação oficial da biblioteca.

## Contexto

A proposta inicial era sessão em banco. A equipe decidiu usar **JWT**. O enunciado exige justificar a escolha, evitar JWT "por popularidade" e permitir expiração e revogação.

## Decisão

Modelo híbrido, que mantém a revogação:

- **Access token (JWT)**, vida curta (proposta: 15 min). Claims mínimas: `sub`, `role`, `sid` (id da sessão), `iat`, `exp`. Algoritmo fixado em lista permitida (ex.: HS256 com segredo longo vindo do ambiente; `none` rejeitado).
- **Refresh token opaco** (aleatório, 256 bits), guardado no banco **apenas como hash**, com `family_id`, expiração (proposta: 7 dias) e `revoked_at`.
- **Rotação:** cada uso do refresh gera um novo e invalida o anterior. **Reuso de um refresh já usado revoga toda a família** (indício de roubo).
- **Transporte:** ambos em cookies `HttpOnly`, `Secure` em produção, `SameSite`, com `Path` restrito. **Nunca em `localStorage`.**
- **CSRF:** como há cookies, continua necessário: `SameSite` + verificação de `Origin` + cabeçalho customizado nas requisições que alteram estado.
- **Logout:** revoga a família de refresh no banco e limpa os cookies.
- **Troca de senha** e desativação de usuário revogam todas as sessões.
- **Senhas:** Argon2id (biblioteca a validar no Windows); plano B bcrypt.

## Implementação (Etapa 3A, 25/11/2026)

- Biblioteca de senha: `argon2` 0.45.x (Argon2id, 64 MiB, 3 iterações, 1 thread). Script de instalação negado; funciona com binários pré-compilados (verificado).
- Biblioteca de JWT: `jose` 6.x. HS256 fixo, `iss=solarsystem`, `aud=solarsystem-api`, claims `sub`, `role`, `sid`, `iat`, `exp`, validadas com Zod.
- `sid` (id da sessão) = `family_id` da tabela `refresh_tokens`.
- Banco: `refresh_tokens` guarda só o hash SHA-256 (CHECK de 64 caracteres hexadecimais); `users` ganhou `failed_login_attempts`, `locked_until` e `password_changed_at`.
- Falta (Etapa 3B): rotas, cookies, CSRF, limite de tentativas, bloqueio de conta, verificação de sessão nas rotas sensíveis.

## Alternativas

- **Sessão opaca em banco:** revogação imediata e mais simples. Era a recomendação inicial.
- **JWT puro de longa duração, sem refresh:** rejeitado, pois não permite revogar.

## Consequências e riscos residuais

- Um access token roubado vale até expirar (≤ 15 min) mesmo após logout. Mitigação: consultar o banco pelo `sid` nas rotas sensíveis (administração, troca de senha, credenciais de integração).
- Mudanças de papel ou desativação só valem nas rotas comuns após o access expirar. Documentado.
- Mais peças que sessão simples (rotação, detecção de reuso): exige testes específicos (reuso, expiração, `alg` adulterado, assinatura inválida, token de outra família).
- Segredo JWT é ativo crítico: fora do Git, rotacionável.
- Defesa na banca: justificativa é validação sem consulta ao banco na maioria das requisições e facilidade de separar a API no futuro; o ganho de segurança sobre sessão em banco **não** é o argumento.
