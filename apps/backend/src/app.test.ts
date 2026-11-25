import { describe, expect, it } from 'vitest';
import { healthResponseSchema } from '@solarsystem/shared';
import { buildApp } from './app';

describe('GET /api/health', () => {
  it('responde 200 com o formato esperado', async () => {
    const app = buildApp();
    const resposta = await app.inject({ method: 'GET', url: '/api/health' });

    expect(resposta.statusCode).toBe(200);
    const corpo = healthResponseSchema.parse(resposta.json());
    expect(corpo.service).toBe('backend');
    await app.close();
  });

  it('responde 404 em uma rota que não existe', async () => {
    const app = buildApp();
    const resposta = await app.inject({ method: 'GET', url: '/api/nao-existe' });

    expect(resposta.statusCode).toBe(404);
    await app.close();
  });
});
