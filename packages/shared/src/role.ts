import { z } from 'zod';

// Perfis de acesso (ADR 0008). Devem coincidir com o enum "Role" do banco (schema.prisma).
export const roleSchema = z.enum(['ADMIN', 'TECNICO']);

export type Role = z.infer<typeof roleSchema>;
