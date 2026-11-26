import { buildApp } from './app';
import { loadEnv } from './config/env';
import { createPrismaClient } from './db/prisma';

const env = loadEnv();
const prisma = createPrismaClient(env.DATABASE_URL);

const app = buildApp({
  prisma,
  env,
  logger: {
    level: 'info',
    // Defesa em profundidade: cookies e tokens nunca devem aparecer nos logs.
    redact: ['req.headers.cookie', 'req.headers.authorization', 'res.headers["set-cookie"]'],
  },
});

// Encerramento limpo: termina as requisições em andamento e fecha a conexão com o banco.
async function encerrar() {
  await app.close();
  await prisma.$disconnect();
  process.exit(0);
}
process.on('SIGINT', encerrar);
process.on('SIGTERM', encerrar);

try {
  // 127.0.0.1: em desenvolvimento só a própria máquina acessa a API.
  await app.listen({ port: env.API_PORT, host: '127.0.0.1' });
} catch (erro) {
  app.log.error(erro);
  process.exit(1);
}
