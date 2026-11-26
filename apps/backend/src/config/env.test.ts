import { describe, expect, it } from 'vitest';
import { loadEnv } from './env';

// Valores FICTÍCIOS, só para os testes.
const baseValida = {
  DATABASE_URL: 'postgresql://usuario:senha@localhost:5432/teste',
  JWT_ACCESS_SECRET: 'x'.repeat(32),
};

describe('loadEnv', () => {
  it('usa valores padrão quando só as variáveis obrigatórias são informadas', () => {
    const env = loadEnv(baseValida);
    expect(env.API_PORT).toBe(3000);
    expect(env.NODE_ENV).toBe('development');
    expect(env.JWT_ACCESS_TTL_MINUTES).toBe(15);
    expect(env.REFRESH_TTL_DAYS).toBe(7);
  });

  it('converte API_PORT de texto para número', () => {
    expect(loadEnv({ ...baseValida, API_PORT: '4000' }).API_PORT).toBe(4000);
  });

  it('rejeita porta inválida', () => {
    expect(() => loadEnv({ ...baseValida, API_PORT: '99999' })).toThrow();
    expect(() => loadEnv({ ...baseValida, API_PORT: 'abc' })).toThrow();
  });

  it('exige DATABASE_URL', () => {
    expect(() => loadEnv({ JWT_ACCESS_SECRET: 'x'.repeat(32) })).toThrow();
  });

  it('rejeita segredo JWT curto ou ausente', () => {
    expect(() => loadEnv({ ...baseValida, JWT_ACCESS_SECRET: 'curto' })).toThrow();
    expect(() => loadEnv({ DATABASE_URL: baseValida.DATABASE_URL })).toThrow();
  });

  it('limita a validade dos tokens a valores razoáveis', () => {
    expect(() => loadEnv({ ...baseValida, JWT_ACCESS_TTL_MINUTES: '0' })).toThrow();
    expect(() => loadEnv({ ...baseValida, JWT_ACCESS_TTL_MINUTES: '600' })).toThrow();
    expect(() => loadEnv({ ...baseValida, REFRESH_TTL_DAYS: '365' })).toThrow();
  });

  it('não vaza o valor do segredo na mensagem de erro', () => {
    try {
      loadEnv({ ...baseValida, JWT_ACCESS_SECRET: 'segredo-curto-demais' });
      expect.unreachable();
    } catch (erro) {
      expect(String(erro)).not.toContain('segredo-curto-demais');
    }
  });
});
