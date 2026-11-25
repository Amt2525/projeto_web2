import { describe, expect, it } from 'vitest';
import { loadEnv } from './env';

describe('loadEnv', () => {
  it('usa a porta padrão 3000 quando API_PORT não é informada', () => {
    expect(loadEnv({}).API_PORT).toBe(3000);
  });

  it('converte API_PORT de texto para número', () => {
    expect(loadEnv({ API_PORT: '4000' }).API_PORT).toBe(4000);
  });

  it('rejeita porta inválida', () => {
    expect(() => loadEnv({ API_PORT: '99999' })).toThrow();
    expect(() => loadEnv({ API_PORT: 'abc' })).toThrow();
  });
});
