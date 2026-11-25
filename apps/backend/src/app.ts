import Fastify from 'fastify';
import { healthResponseSchema } from '@solarsystem/shared';

// Monta a aplicação sem iniciar o servidor.
// Separar "montar" de "iniciar" permite testar as rotas sem abrir uma porta de rede.
export function buildApp(options: { logger?: boolean } = {}) {
  const app = Fastify({ logger: options.logger ?? false });

  app.get('/api/health', async () => {
    return healthResponseSchema.parse({
      status: 'ok',
      service: 'backend',
      timestamp: new Date().toISOString(),
    });
  });

  return app;
}
