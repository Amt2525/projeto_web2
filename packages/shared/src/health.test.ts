import { describe, expect, it } from 'vitest';
import { healthResponseSchema } from './health';

describe('healthResponseSchema', () => {
  it('aceita uma resposta válida', () => {
    const resultado = healthResponseSchema.safeParse({
      status: 'ok',
      service: 'backend',
      timestamp: '2026-11-25T12:00:00.000Z',
    });
    expect(resultado.success).toBe(true);
  });

  it('rejeita status diferente de "ok"', () => {
    const resultado = healthResponseSchema.safeParse({
      status: 'erro',
      service: 'backend',
      timestamp: '2026-11-25T12:00:00.000Z',
    });
    expect(resultado.success).toBe(false);
  });

  it('rejeita data em formato inválido', () => {
    const resultado = healthResponseSchema.safeParse({
      status: 'ok',
      service: 'backend',
      timestamp: '25/11/2026',
    });
    expect(resultado.success).toBe(false);
  });
});
