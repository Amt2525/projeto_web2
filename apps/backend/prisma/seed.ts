import { emailSchema, passwordSchema } from '@solarsystem/shared';
import { z } from 'zod';
import { createPrismaClient } from '../src/db/prisma';
import { hashPassword } from '../src/modules/auth/password';

// Cria os usuários de DEMONSTRAÇÃO (um admin e um técnico), com e-mails e senhas lidos do .env.
// As senhas nunca ficam no código nem no Git. O script `pnpm env:criar` gera senhas aleatórias.
// É seguro rodar mais de uma vez: usuários que já existem não são alterados.

const seedEnvSchema = z.object({
  NODE_ENV: z.string().optional(),
  DATABASE_URL: z.string().min(1),
  SEED_ADMIN_EMAIL: emailSchema,
  SEED_ADMIN_PASSWORD: passwordSchema,
  SEED_TECNICO_EMAIL: emailSchema,
  SEED_TECNICO_PASSWORD: passwordSchema,
});

const env = seedEnvSchema.parse(process.env);

// Usuários de demonstração não devem existir num sistema em produção.
if (env.NODE_ENV === 'production') {
  throw new Error('O seed de demonstração não pode ser executado com NODE_ENV=production.');
}

const prisma = createPrismaClient(env.DATABASE_URL);

async function criarSeNaoExistir(dados: {
  email: string;
  name: string;
  senha: string;
  role: 'ADMIN' | 'TECNICO';
}) {
  const existente = await prisma.user.findUnique({ where: { email: dados.email } });
  if (existente) {
    console.log(`Já existe, mantido sem alterações: ${dados.email} (${existente.role})`);
    return;
  }
  await prisma.user.create({
    data: {
      email: dados.email,
      name: dados.name,
      role: dados.role,
      passwordHash: await hashPassword(dados.senha),
    },
  });
  console.log(`Criado: ${dados.email} (${dados.role})`);
}

try {
  await criarSeNaoExistir({
    email: env.SEED_ADMIN_EMAIL,
    name: 'Administrador (demonstração)',
    senha: env.SEED_ADMIN_PASSWORD,
    role: 'ADMIN',
  });
  await criarSeNaoExistir({
    email: env.SEED_TECNICO_EMAIL,
    name: 'Técnico (demonstração)',
    senha: env.SEED_TECNICO_PASSWORD,
    role: 'TECNICO',
  });
  console.log(
    'As senhas estão no seu arquivo .env (SEED_*_PASSWORD). Use-as apenas para demonstração.',
  );
} finally {
  await prisma.$disconnect();
}
