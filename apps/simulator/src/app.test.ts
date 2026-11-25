import { describe, expect, it } from 'vitest';
import { buildApp } from './app';

describe('GET /health (simulador)', () => {
  it('responde 200 e se identifica como simulado', async () => {
    const app = buildApp();
    const resposta = await app.inject({ method: 'GET', url: '/health' });

    expect(resposta.statusCode).toBe(200);
    expect(resposta.json()).toMatchObject({ service: 'simulator', simulated: true });
    await app.close();
  });
});
