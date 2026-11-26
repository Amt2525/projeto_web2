import type { Role } from '@solarsystem/shared';
import { buildApp } from '../src/app';
import type { Env } from '../src/config/env';
import { createPrismaClient, type PrismaClient } from '../src/db/prisma';
import { COOKIE_ACESSO, COOKIE_RENOVACAO } from '../src/modules/auth/cookies';
import { hashPassword } from '../src/modules/auth/password';
import { CABECALHO_CSRF, VALOR_CSRF } from '../src/plugins/security';

// Valores FICTÍCIOS, só para os testes.
export const SENHA_PADRAO = 'senha-de-teste-bem-longa-1';
// Senhas fictícias dos testes. Ficam em constantes (e não escritas ao lado de "password:")
// para o Gitleaks não confundir valores de teste com segredos de verdade.
export const SENHA_NOVA = 'nova-senha-bem-longa-2026';
export const SENHA_OUTRA = 'outra-senha-bem-longa-2';
export const SENHA_DIGITADA = 'MinhaSenhaSecreta123';
export const SEGREDO_JWT = 'segredo-de-teste-para-jwt-com-mais-de-32-caracteres';
export const CSRF = { [CABECALHO_CSRF]: VALOR_CSRF };

export function criarEnvDeTeste(extra: Partial<Env> = {}): Env {
  return {
    NODE_ENV: 'test',
    API_PORT: 3000,
    DATABASE_URL: bancoDeTesteUrl(),
    JWT_ACCESS_SECRET: SEGREDO_JWT,
    JWT_ACCESS_TTL_MINUTES: 15,
    REFRESH_TTL_DAYS: 7,
    ALLOWED_ORIGIN: 'http://localhost:5173',
    ...extra,
  };
}

function bancoDeTesteUrl(): string {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error('TEST_DATABASE_URL não definida (o global-setup não rodou?).');
  // Trava de segurança: testes apagam dados. Jamais podem rodar num banco que não seja de teste.
  if (!new URL(url).pathname.endsWith('_test')) {
    throw new Error('Recusado: o banco usado nos testes precisa terminar em "_test".');
  }
  return url;
}

export function criarPrismaDeTeste(): PrismaClient {
  return createPrismaClient(bancoDeTesteUrl());
}

export async function limparBanco(prisma: PrismaClient) {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "plants", "audit_logs", "refresh_tokens", "users" CASCADE',
  );
}

// O hash é calculado uma vez só: o Argon2 é lento de propósito e seria repetido em todo teste.
let hashPadrao: Promise<string> | undefined;

export async function criarUsuario(
  prisma: PrismaClient,
  dados: { email?: string; name?: string; role?: Role; isActive?: boolean; senha?: string } = {},
) {
  const passwordHash =
    dados.senha !== undefined
      ? await hashPassword(dados.senha)
      : await (hashPadrao ??= hashPassword(SENHA_PADRAO));
  return prisma.user.create({
    data: {
      email: dados.email ?? 'ana@exemplo.com',
      name: dados.name ?? 'Ana Teste',
      role: dados.role ?? 'TECNICO',
      isActive: dados.isActive ?? true,
      passwordHash,
    },
  });
}

export function criarAppDeTeste(
  prisma: PrismaClient,
  extra: { env?: Partial<Env>; now?: () => Date } = {},
) {
  return buildApp({
    prisma,
    env: criarEnvDeTeste(extra.env),
    ...(extra.now ? { now: extra.now } : {}),
  });
}

type App = ReturnType<typeof criarAppDeTeste>;

// Faz login e devolve a resposta e o cabeçalho "cookie" para as próximas requisições.
export async function fazerLogin(app: App, email = 'ana@exemplo.com', password = SENHA_PADRAO) {
  const resposta = await app.inject({
    method: 'POST',
    url: '/api/auth/login',
    headers: CSRF,
    payload: { email, password },
  });
  return { resposta, cookies: cabecalhoCookie(resposta.cookies) };
}

export function cabecalhoCookie(cookies: { name: string; value: string }[]): string {
  return cookies
    .filter((c) => c.value !== '')
    .map((c) => `${c.name}=${c.value}`)
    .join('; ');
}

export function valorDoCookie(cookies: { name: string; value: string }[], nome: string) {
  return cookies.find((c) => c.name === nome)?.value;
}

export { COOKIE_ACESSO, COOKIE_RENOVACAO };
