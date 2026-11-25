import { z } from 'zod';

// Política de senha (OWASP ASVS / NIST SP 800-63B):
// - comprimento importa mais que "símbolos obrigatórios", então exigimos 12 ou mais caracteres;
// - há um limite máximo, porque o Argon2 é caro: uma senha de 1 MB seria um ataque de negação de serviço.
export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 128;

// Lista pequena de senhas comuns que atendem ao tamanho mínimo.
// LIMITAÇÃO: não consultamos bases de senhas vazadas (ex.: Have I Been Pwned); isso é uma evolução futura.
const SENHAS_COMUNS = new Set([
  '123456789012',
  '1234567890123',
  'senha1234567',
  'senha12345678',
  'password1234',
  'password12345',
  'qwertyuiop12',
  'qwertyuiopas',
  'administrador',
  'administrator',
  'abcdefghijkl',
  'solarsystem1',
  'solarsystem12',
  'solarsystem123',
  'mudar123456',
  'trocar123456',
]);

export const passwordSchema = z
  .string({ error: 'Informe a senha.' })
  .min(PASSWORD_MIN_LENGTH, `A senha deve ter pelo menos ${PASSWORD_MIN_LENGTH} caracteres.`)
  .max(PASSWORD_MAX_LENGTH, `A senha deve ter no máximo ${PASSWORD_MAX_LENGTH} caracteres.`)
  .refine((senha) => !SENHAS_COMUNS.has(senha.toLowerCase()), {
    message: 'Essa senha é muito comum. Escolha outra.',
  });

// A senha não pode conter a parte local do e-mail (ex.: "ana.silva" em ana.silva@empresa.com).
export function senhaContemEmail(senha: string, email: string): boolean {
  const parteLocal = email.split('@')[0]?.toLowerCase() ?? '';
  return parteLocal.length >= 4 && senha.toLowerCase().includes(parteLocal);
}
