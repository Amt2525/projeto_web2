import { z } from 'zod';
import { PASSWORD_MAX_LENGTH, passwordSchema } from './password';
import { roleSchema } from './role';

// E-mail: remove espaços das pontas e converte para minúsculas ANTES de validar,
// porque o banco só aceita e-mails em minúsculas (CHECK em users).
export const emailSchema = z
  .string({ error: 'Informe o e-mail.' })
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: 'Informe um e-mail válido.' }).max(254, 'O e-mail é muito longo.'));

// strictObject: campos que não estão na lista são REJEITADOS (protege contra "mass assignment").
export const loginSchema = z.strictObject({
  email: emailSchema,
  // No login não aplicamos a política de senha (a senha antiga de alguém pode não cumpri-la);
  // só exigimos que exista e que não seja gigantesca (o Argon2 é caro).
  password: z
    .string({ error: 'Informe a senha.' })
    .min(1, 'Informe a senha.')
    .max(PASSWORD_MAX_LENGTH, `A senha deve ter no máximo ${PASSWORD_MAX_LENGTH} caracteres.`),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const changePasswordSchema = z
  .strictObject({
    currentPassword: z
      .string({ error: 'Informe a senha atual.' })
      .min(1, 'Informe a senha atual.')
      .max(PASSWORD_MAX_LENGTH, `A senha deve ter no máximo ${PASSWORD_MAX_LENGTH} caracteres.`),
    newPassword: passwordSchema,
  })
  .refine((dados) => dados.currentPassword !== dados.newPassword, {
    path: ['newPassword'],
    message: 'A nova senha deve ser diferente da atual.',
  });
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

// O que a API devolve sobre o usuário (DTO). Repare que NÃO inclui o hash da senha.
export const userResponseSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  email: z.string(),
  role: roleSchema,
});
export type UserResponse = z.infer<typeof userResponseSchema>;
