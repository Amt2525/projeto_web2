import type { FastifyInstance } from 'fastify';
import { changePasswordSchema, loginSchema } from '@solarsystem/shared';
import type { Env } from '../../config/env';
import { erros } from '../../errors';
import { contextoDaRequisicao } from '../audit/audit';
import type { AuthService } from './auth.service';
import { COOKIE_ACESSO, COOKIE_RENOVACAO, definirCookies, limparCookies } from './cookies';
import type { TokenService } from './tokens';

type Opcoes = { env: Env; service: AuthService; tokens: TokenService; now: () => Date };

// Rotas de autenticação (prefixo /api/auth). Toda entrada passa pelo Zod antes de qualquer lógica.
export async function authRoutes(app: FastifyInstance, { env, service, tokens, now }: Opcoes) {
  const { requireAuth, requireActiveSession } = app.guards;

  app.post(
    '/login',
    // No máximo 10 tentativas por minuto por IP (além do bloqueio por conta).
    { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } },
    async (request, reply) => {
      const entrada = loginSchema.parse(request.body ?? {});
      const resultado = await service.login(entrada, contextoDaRequisicao(request));
      definirCookies(reply, env, resultado.tokens);
      return { user: resultado.user };
    },
  );

  app.post(
    '/refresh',
    { config: { rateLimit: { max: 30, timeWindow: '1 minute' } } },
    async (request, reply) => {
      const recebido = request.cookies[COOKIE_RENOVACAO];
      const resultado = recebido
        ? await service.refresh(recebido, contextoDaRequisicao(request))
        : null;

      if (!resultado) {
        limparCookies(reply, env);
        throw erros.naoAutenticado();
      }
      definirCookies(reply, env, resultado.tokens);
      return { user: resultado.user };
    },
  );

  app.post('/logout', async (request, reply) => {
    // Se o JWT de acesso ainda for válido, aproveitamos o id da sessão dele.
    const acesso = request.cookies[COOKIE_ACESSO];
    const dados = acesso ? await tokens.verify(acesso, now()) : null;

    await service.logout(
      request.cookies[COOKIE_RENOVACAO],
      dados?.sessionId,
      contextoDaRequisicao(request),
    );
    limparCookies(reply, env);
    return reply.status(204).send();
  });

  app.get('/me', { preHandler: [requireAuth] }, async (request) => {
    // Consulta o banco: se o usuário foi desativado, deixa de ter acesso mesmo com JWT válido.
    const user = await service.buscarUsuarioAtivo(request.auth!.userId);
    if (!user) throw erros.naoAutenticado();
    return { user };
  });

  app.post(
    '/change-password',
    {
      preHandler: [requireAuth, requireActiveSession],
      config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
    },
    async (request, reply) => {
      const entrada = changePasswordSchema.parse(request.body ?? {});
      const novos = await service.trocarSenha(
        request.auth!.userId,
        entrada,
        contextoDaRequisicao(request),
      );
      definirCookies(reply, env, novos);
      return reply.status(204).send();
    },
  );
}
