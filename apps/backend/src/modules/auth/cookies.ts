import type { FastifyReply } from 'fastify';
import type { Env } from '../../config/env';

export const COOKIE_ACESSO = 'ss_access';
export const COOKIE_RENOVACAO = 'ss_refresh';

// Os dois cookies têm:
//  - HttpOnly: o JavaScript da página NÃO consegue ler (um XSS não rouba o token);
//  - SameSite=Strict: o navegador só envia o cookie em requisições originadas do próprio site (anti-CSRF);
//  - Secure (em produção): só trafega por HTTPS;
//  - Path restrito: o cookie de renovação só é enviado para /api/auth, reduzindo a exposição.
function opcoesBase(env: Env) {
  return {
    httpOnly: true,
    sameSite: 'strict' as const,
    secure: env.NODE_ENV === 'production',
  };
}

export function definirCookies(
  reply: FastifyReply,
  env: Env,
  tokens: { acesso: string; renovacao: string },
) {
  reply.setCookie(COOKIE_ACESSO, tokens.acesso, {
    ...opcoesBase(env),
    path: '/api',
    maxAge: env.JWT_ACCESS_TTL_MINUTES * 60,
  });
  reply.setCookie(COOKIE_RENOVACAO, tokens.renovacao, {
    ...opcoesBase(env),
    path: '/api/auth',
    maxAge: env.REFRESH_TTL_DAYS * 24 * 60 * 60,
  });
}

export function limparCookies(reply: FastifyReply, env: Env) {
  reply.clearCookie(COOKIE_ACESSO, { ...opcoesBase(env), path: '/api' });
  reply.clearCookie(COOKIE_RENOVACAO, { ...opcoesBase(env), path: '/api/auth' });
}
