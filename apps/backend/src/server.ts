import { buildApp } from './app';
import { loadEnv } from './config/env';

const env = loadEnv();
const app = buildApp({ logger: true });

try {
  // 127.0.0.1: em desenvolvimento só a própria máquina acessa a API.
  await app.listen({ port: env.API_PORT, host: '127.0.0.1' });
} catch (erro) {
  app.log.error(erro);
  process.exit(1);
}
