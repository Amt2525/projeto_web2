import { z } from 'zod';

// Valida as variáveis de ambiente na inicialização.
// Se algo estiver errado, a API não sobe (falha cedo, com mensagem clara).
const envSchema = z.object({
  API_PORT: z.coerce.number().int().min(1).max(65535).default(3000),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  return envSchema.parse(source);
}
