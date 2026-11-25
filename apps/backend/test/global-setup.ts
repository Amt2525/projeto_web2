import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

// Roda UMA vez antes de todos os testes:
//  1) descobre a DATABASE_URL (do ambiente ou do .env da raiz);
//  2) cria um banco SEPARADO só para testes (nome terminado em "_test"), se ainda não existir;
//  3) aplica as migrations nele.
// Assim os testes nunca tocam nos dados de desenvolvimento.
export default async function setup() {
  const backendDir = resolve(import.meta.dirname, '..');
  const envRaiz = resolve(backendDir, '../../.env');
  if (existsSync(envRaiz)) process.loadEnvFile(envRaiz);

  const urlBase = process.env.DATABASE_URL;
  if (!urlBase) {
    throw new Error(
      'DATABASE_URL não definida. Crie o .env (pnpm env:criar) e suba o banco (pnpm db:up).',
    );
  }

  const url = new URL(urlBase);
  const nomeBase = url.pathname.slice(1);
  const nomeTeste = nomeBase.endsWith('_test') ? nomeBase : `${nomeBase}_test`;
  // O nome entra num comando SQL (CREATE DATABASE não aceita parâmetros), então só letras, números e "_".
  if (!/^[a-z0-9_]+$/.test(nomeTeste)) {
    throw new Error(`Nome de banco de teste inválido: ${nomeTeste}`);
  }

  const admin = new PrismaClient({ adapter: new PrismaPg({ connectionString: urlBase }) });
  try {
    const existe = await admin.$queryRaw<
      unknown[]
    >`SELECT 1 FROM pg_database WHERE datname = ${nomeTeste}`;
    if (existe.length === 0) await admin.$executeRawUnsafe(`CREATE DATABASE "${nomeTeste}"`);
  } finally {
    await admin.$disconnect();
  }

  url.pathname = `/${nomeTeste}`;
  const urlTeste = url.toString();
  process.env.TEST_DATABASE_URL = urlTeste;

  execSync('pnpm exec prisma migrate deploy', {
    cwd: backendDir,
    env: { ...process.env, DATABASE_URL: urlTeste },
    stdio: 'pipe',
  });
}
