import { z } from 'zod';

// Formato da resposta do endpoint GET /api/health.
// Fica em "shared" porque o back-end monta a resposta e o front-end a valida:
// os dois usam exatamente a mesma definição.
export const healthResponseSchema = z.object({
  status: z.literal('ok'),
  service: z.string().min(1),
  timestamp: z.iso.datetime(),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;
