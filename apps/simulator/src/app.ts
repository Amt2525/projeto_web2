import Fastify from 'fastify';

// SIMULADOR: plataforma de monitoramento FICTÍCIA, usada quando não há acesso a APIs reais.
// Todos os dados gerados aqui são simulados e devem ser identificados como tal.
// O contrato (rotas e dados) será definido na Etapa 5 e documentado em OpenAPI.
export function buildApp(options: { logger?: boolean } = {}) {
  const app = Fastify({ logger: options.logger ?? false });

  app.get('/health', async () => {
    return {
      status: 'ok',
      service: 'simulator',
      simulated: true,
      timestamp: new Date().toISOString(),
    };
  });

  return app;
}
