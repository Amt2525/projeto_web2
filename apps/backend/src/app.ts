import Fastify, { type FastifyServerOptions } from 'fastify';
import { healthResponseSchema } from '@solarsystem/shared';
import type { Env } from './config/env';
import type { PrismaClient } from './db/prisma';
import { registerErrorHandler } from './plugins/error-handler';
import { registerSecurity } from './plugins/security';
import { createAuthService } from './modules/auth/auth.service';
import { authRoutes } from './modules/auth/auth.routes';
import { createGuards } from './modules/auth/guards';
import { createTokenService } from './modules/auth/tokens';

export type AppDeps = {
  prisma: PrismaClient;
  env: Env;
  logger?: FastifyServerOptions['logger'];
  // Relógio injetável: os testes avançam o tempo sem esperar.
  now?: () => Date;
};

// Monta a aplicação sem iniciar o servidor.
// Separar "montar" de "iniciar" permite testar as rotas sem abrir uma porta de rede.
export function buildApp({ prisma, env, logger = false, now = () => new Date() }: AppDeps) {
  const app = Fastify({
    logger,
    // Limite do tamanho do corpo da requisição: 16 KB bastam para todas as rotas atuais.
    bodyLimit: 16 * 1024,
    // Só confiamos no cabeçalho X-Forwarded-For se houver um proxy confiável na frente (produção).
    trustProxy: false,
  });

  // Por padrão o Fastify devolve erro quando chega "Content-Type: application/json" com corpo VAZIO
  // (comum em clientes que sempre enviam esse cabeçalho, até em logout/refresh, que não têm corpo).
  // Aqui um corpo vazio vira "sem corpo" (o Zod depois exige os campos onde forem obrigatórios).
  // Usamos o leitor de JSON padrão do Fastify, que RECUSA chaves como "__proto__" e "constructor"
  // (proteção contra prototype pollution).
  const lerJson = app.getDefaultJsonParser('error', 'error');
  app.addContentTypeParser('application/json', { parseAs: 'string' }, (request, corpo, pronto) => {
    if (corpo === '') {
      pronto(null, undefined);
      return;
    }
    lerJson(request, corpo as string, pronto);
  });

  registerErrorHandler(app);
  registerSecurity(app, env);

  const tokens = createTokenService({
    secret: env.JWT_ACCESS_SECRET,
    ttlMinutes: env.JWT_ACCESS_TTL_MINUTES,
  });
  const service = createAuthService({ prisma, env, tokens, now });

  app.decorateRequest('auth', null);
  app.decorate('guards', createGuards({ tokens, service, now }));

  app.get('/api/health', async () => {
    return healthResponseSchema.parse({
      status: 'ok',
      service: 'backend',
      timestamp: new Date().toISOString(),
    });
  });

  app.register(authRoutes, { prefix: '/api/auth', env, service, tokens, now });

  return app;
}
