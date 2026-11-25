import { describe, expect, it } from 'vitest';
import { passwordSchema, senhaContemEmail } from './password';

describe('passwordSchema', () => {
  it('aceita uma senha longa e incomum', () => {
    expect(passwordSchema.safeParse('cavalo-bateria-grampo-correto').success).toBe(true);
  });

  it('aceita exatamente 12 caracteres', () => {
    expect(passwordSchema.safeParse('a1b2c3d4e5f6').success).toBe(true);
  });

  it('rejeita senha com 11 caracteres', () => {
    expect(passwordSchema.safeParse('a1b2c3d4e5f').success).toBe(false);
  });

  it('rejeita senha acima de 128 caracteres', () => {
    expect(passwordSchema.safeParse('a'.repeat(129)).success).toBe(false);
    expect(passwordSchema.safeParse('a'.repeat(128)).success).toBe(true);
  });

  it('rejeita senhas comuns, sem diferenciar maiúsculas de minúsculas', () => {
    expect(passwordSchema.safeParse('password1234').success).toBe(false);
    expect(passwordSchema.safeParse('PASSWORD1234').success).toBe(false);
  });

  it('rejeita valores que não são texto', () => {
    expect(passwordSchema.safeParse(123456789012).success).toBe(false);
    expect(passwordSchema.safeParse(undefined).success).toBe(false);
    expect(passwordSchema.safeParse(null).success).toBe(false);
  });
});

describe('senhaContemEmail', () => {
  it('detecta a parte local do e-mail dentro da senha', () => {
    expect(senhaContemEmail('minha-ana.silva-2026', 'ana.silva@empresa.com')).toBe(true);
    expect(senhaContemEmail('MINHA-ANA.SILVA-2026', 'ana.silva@empresa.com')).toBe(true);
  });

  it('não acusa senha sem relação com o e-mail', () => {
    expect(senhaContemEmail('cavalo-bateria-grampo', 'ana.silva@empresa.com')).toBe(false);
  });

  it('ignora partes locais muito curtas (evita falso positivo)', () => {
    expect(senhaContemEmail('qualquer-senha-longa', 'a@empresa.com')).toBe(false);
  });
});
