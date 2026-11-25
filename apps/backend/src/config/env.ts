import { z } from 'zod';

// Valida as variáveis de ambiente na inicialização.
// Se algo estiver errado, a API não sobe (falha cedo, com mensagem clara).
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL é obrigatória'),
  // O segredo que assina os JWT. 32 caracteres é o mínimo; o script `pnpm env:criar` gera 96.
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET precisa ter pelo menos 32 caracteres'),
  JWT_ACCESS_TTL_MINUTES: z.coerce.number().int().min(1).max(60).default(15),
  REFRESH_TTL_DAYS: z.coerce.number().int().min(1).max(30).default(7),
  // Único endereço de site autorizado a fazer requisições que alteram dados (defesa contra CSRF).
  ALLOWED_ORIGIN: z.url().default('http://localhost:5173'),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  return envSchema.parse(source);
}
