import { buildApp } from './app';

const port = Number(process.env.SIMULATOR_PORT ?? 4010);
const app = buildApp({ logger: true });

try {
  await app.listen({ port, host: '127.0.0.1' });
} catch (erro) {
  app.log.error(erro);
  process.exit(1);
}
