# ADR 0008 — Perfis como enum e autorização no back-end

**Status:** Aprovada (P6 respondida: técnico vê todas as usinas; técnico e admin cadastram usinas)

## Decisão

Dois perfis, `ADMIN` e `TECNICO`, como **enum** na tabela `users`. Sem tabela de perfis/permissões (YAGNI).

Regras iniciais:

- `ADMIN`: tudo que o técnico faz, mais gerenciar usuários, arquivar usinas e configurar credenciais de integração (a confirmar).
- `TECNICO`: ver todas as usinas e dados, criar e editar usinas, reconhecer alarmes, trocar a própria senha.
- Técnico vincula a usina a uma conexão de integração já existente, mas não vê nem altera credenciais.

## Regras de implementação

- Autorização verificada **no back-end**, em cada rota e recurso. O front só esconde botões.
- Sem acesso por ID alterado na URL: testes de IDOR/BOLA obrigatórios.
- Respostas por DTO; entrada com Zod estrito (sem campos extras: mass assignment).

## Consequências

- Se surgirem permissões finas ou multi-organização, migrar para tabela de papéis. Registrado como evolução futura.
