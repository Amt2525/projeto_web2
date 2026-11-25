import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { healthResponseSchema } from '@solarsystem/shared';
import type { PrismaClient } from './db/prisma';
import { criarAppDeTeste, criarPrismaDeTeste } from '../test/helpers';

let prisma: PrismaClient;
beforeAll(() => {
  prisma = criarPrismaDeTeste();
});
afterAll(() => prisma.$disconnect());

describe('GET /api/health', () => {
  it('responde 200 com o formato esperado', async () => {
    const app = criarAppDeTeste(prisma);
    const resposta = await app.inject({ method: 'GET', url: '/api/health' });

    expect(resposta.statusCode).toBe(200);
    const corpo = healthResponseSchema.parse(resposta.json());
    expect(corpo.service).toBe('backend');
    await app.close();
  });
});

describe('respostas gerais da API', () => {
  it('responde 404 em JSON padronizado para rota inexistente', async () => {
    const app = criarAppDeTeste(prisma);
    const resposta = await app.inject({ method: 'GET', url: '/api/nao-existe' });

    expect(resposta.statusCode).toBe(404);
    expect(resposta.json()).toEqual({
      error: { code: 'NAO_ENCONTRADO', message: 'Recurso não encontrado.' },
    });
    await app.close();
  });

  it('envia cabeçalhos de segurança e não anuncia a tecnologia', async () => {
    const app = criarAppDeTeste(prisma);
    const resposta = await app.inject({ method: 'GET', url: '/api/health' });

    expect(resposta.headers['x-content-type-options']).toBe('nosniff');
    expect(resposta.headers['x-frame-options']).toBeDefined();
    expect(resposta.headers['content-security-policy']).toBeDefined();
    expect(resposta.headers['x-powered-by']).toBeUndefined();
    await app.close();
  });

  it('não vaza detalhes internos em erros inesperados (500)', async () => {
    const app = criarAppDeTeste(prisma);
    app.get('/api/_teste/erro', async () => {
      throw new Error('segredo-interno: SELECT * FROM users em /home/app/db.ts');
    });
    const resposta = await app.inject({ method: 'GET', url: '/api/_teste/erro' });

    expect(resposta.statusCode).toBe(500);
    expect(resposta.body).not.toContain('segredo-interno');
    expect(resposta.body).not.toContain('SELECT');
    expect(resposta.json().error.code).toBe('ERRO_INTERNO');
    await app.close();
  });
});
