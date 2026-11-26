import type { FastifyRequest } from 'fastify';
import type { Role } from '@solarsystem/shared';
import { erros } from '../../errors';
import { COOKIE_ACESSO } from './cookies';
import type { AuthService } from './auth.service';
import type { DadosDoToken, TokenService } from './tokens';

// Depois de passar por `requireAuth`, `request.auth` tem quem é o usuário.
declare module 'fastify' {
  interface FastifyRequest {
    auth: DadosDoToken | null;
  }
  interface FastifyInstance {
    guards: Guards;
  }
}

export type Guards = ReturnType<typeof createGuards>;

// "Guardas": funções que rodam ANTES do código da rota e barram quem não pode entrar.
// Autorização é sempre decidida aqui, no back-end. O front-end só esconde botões.
export function createGuards(deps: {
  tokens: TokenService;
  service: AuthService;
  now: () => Date;
}) {
  const { tokens, service, now } = deps;

  // Exige um JWT de acesso válido (cookie). Não consulta o banco: é rápido, mas confia em até 15 min de "atraso".
  async function requireAuth(request: FastifyRequest) {
    const token = request.cookies[COOKIE_ACESSO];
    if (!token) throw erros.naoAutenticado();

    const dados = await tokens.verify(token, now());
    if (!dados) throw erros.naoAutenticado();

    request.auth = dados;
  }

  // Para rotas sensíveis: além do JWT, confere no banco que a sessão não foi encerrada (logout, troca de senha).
  async function requireActiveSession(request: FastifyRequest) {
    if (!request.auth) throw erros.naoAutenticado();
    if (!(await service.sessaoAtiva(request.auth.sessionId))) throw erros.naoAutenticado();
  }

  // Exige que o perfil do usuário esteja na lista. Use depois de `requireAuth`.
  function requireRole(...perfis: Role[]) {
    return async (request: FastifyRequest) => {
      if (!request.auth) throw erros.naoAutenticado();
      if (!perfis.includes(request.auth.role)) throw erros.semPermissao();
    };
  }

  return { requireAuth, requireActiveSession, requireRole };
}
