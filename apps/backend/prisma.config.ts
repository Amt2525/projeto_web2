import { existsSync } from 'node:fs';
import { defineConfig, env } from 'prisma/config';

// O Prisma 7 não lê o arquivo .env sozinho. Carregamos o .env da raiz do projeto.
// Os scripts "db:*" rodam dentro de apps/backend, por isso o caminho é ../../.env.
// Em CI/produção as variáveis já vêm do ambiente e o arquivo não existe.
const arquivoEnv = '../../.env';
if (existsSync(arquivoEnv)) {
  process.loadEnvFile(arquivoEnv);
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
