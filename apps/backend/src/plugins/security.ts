import cookie from '@fastify/cookie';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import type { FastifyInstance } from 'fastify';
import type { Env } from '../config/env';
import { erros } from '../errors';

// Valor que o nosso front-end envia em toda requisição que altera dados.
export const CABECALHO_CSRF = 'x-requested-by';
export const VALOR_CSRF = 'solarsystem-web';

const METODOS_SEGUROS = new Set(['GET', 'HEAD', 'OPTIONS']);

export function registerSecurity(app: FastifyInstance, env: Env) {
  // Cabeçalhos de segurança (X-Content-Type-Options, Strict-Transport-Security, etc.).
  app.register(helmet);

  app.register(cookie);

  // Limite global de requisições por IP. Rotas sensíveis (login) têm limites mais baixos.
  // O contador fica em memória: reinicia com o servidor e não é compartilhado entre instâncias.
  app.register(rateLimit, { global: true, max: 100, timeWindow: '1 minute' });

  // Defesa contra CSRF (requisições forjadas por outro site), em três camadas:
  //  1) cookies SameSite=Strict (ver cookies.ts);
  //  2) toda requisição que altera dados precisa do cabeçalho X-Requested-By. Outro site não
  //     consegue enviá-lo: o navegador exigiria uma checagem prévia (CORS) que nós não liberamos;
  //  3) se o navegador informar o cabeçalho Origin, ele precisa ser o do nosso front-end.
  app.addHook('onRequest', async (request) => {
    if (METODOS_SEGUROS.has(request.method)) return;

    if (request.headers[CABECALHO_CSRF] !== VALOR_CSRF) throw erros.csrf();

    const origem = request.headers.origin;
    if (origem !== undefined && origem !== env.ALLOWED_ORIGIN) throw erros.csrf();
  });

  // Nunca anunciamos tecnologia/versão do servidor.
  app.addHook('onSend', async (_request, reply) => {
    reply.removeHeader('x-powered-by');
  });
}
