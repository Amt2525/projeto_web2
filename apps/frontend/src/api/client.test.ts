import { describe, expect, it } from 'vitest';
import { api, ApiError } from './client';
import { erroDaApi, json, simularApi } from '../test/utils';

describe('cliente da API', () => {
  it('GET: não envia o cabeçalho anti-CSRF nem Content-Type', async () => {
    const falso = simularApi({ 'GET /api/x': () => json({ ok: true }) });
    await api('/api/x');

    const init = falso.mock.calls[0]![1]!;
    expect(init.headers).toEqual({});
    expect(init.credentials).toBe('same-origin');
  });

  it('POST: envia o cabeçalho anti-CSRF e, com corpo, Content-Type JSON', async () => {
    const falso = simularApi({ 'POST /api/x': () => json({ ok: true }) });
    await api('/api/x', { method: 'POST', body: { a: 1 } });

    const init = falso.mock.calls[0]![1]!;
    expect(init.headers).toEqual({
      'X-Requested-By': 'solarsystem-web',
      'Content-Type': 'application/json',
    });
    expect(init.body).toBe('{"a":1}');
  });

  it('POST sem corpo: não declara Content-Type', async () => {
    const falso = simularApi({ 'POST /api/x': () => new Response(null, { status: 204 }) });
    const resultado = await api('/api/x', { method: 'POST' });

    expect(falso.mock.calls[0]![1]!.headers).toEqual({ 'X-Requested-By': 'solarsystem-web' });
    expect(resultado).toBeUndefined();
  });

  it('transforma a resposta de erro da API em ApiError', async () => {
    simularApi({
      'GET /api/x': () => erroDaApi(400, 'DADOS_INVALIDOS', 'Os dados informados são inválidos.'),
    });

    await expect(api('/api/x')).rejects.toMatchObject({
      status: 400,
      code: 'DADOS_INVALIDOS',
      message: 'Os dados informados são inválidos.',
    });
  });

  it('erro sem corpo JSON vira uma mensagem genérica (sem vazar detalhes)', async () => {
    simularApi({
      'GET /api/x': () => new Response('<html>stack trace interno</html>', { status: 500 }),
    });

    const erro = await api('/api/x').catch((e: unknown) => e);
    expect(erro).toBeInstanceOf(ApiError);
    expect((erro as ApiError).message).not.toContain('stack trace');
  });

  it('falha de rede vira ApiError SEM_CONEXAO', async () => {
    simularApi({
      'GET /api/x': () => {
        throw new TypeError('Failed to fetch');
      },
    });

    await expect(api('/api/x')).rejects.toMatchObject({ status: 0, code: 'SEM_CONEXAO' });
  });

  it('401: renova a sessão e repete a requisição uma vez', async () => {
    let tentativas = 0;
    const falso = simularApi({
      'GET /api/protegida': () => {
        tentativas += 1;
        return tentativas === 1 ? erroDaApi(401, 'NAO_AUTENTICADO', 'x') : json({ ok: true });
      },
      'POST /api/auth/refresh': () => json({ user: {} }),
    });

    expect(await api('/api/protegida')).toEqual({ ok: true });
    expect(falso.mock.calls.map(([url]) => url)).toEqual([
      '/api/protegida',
      '/api/auth/refresh',
      '/api/protegida',
    ]);
  });

  it('várias requisições com 401 ao mesmo tempo compartilham UMA só renovação', async () => {
    const jaFalhou = new Set<string>();
    const falso = simularApi({
      'GET /api/a': () =>
        jaFalhou.has('a')
          ? json({ a: 1 })
          : (jaFalhou.add('a'), erroDaApi(401, 'NAO_AUTENTICADO', 'x')),
      'GET /api/b': () =>
        jaFalhou.has('b')
          ? json({ b: 1 })
          : (jaFalhou.add('b'), erroDaApi(401, 'NAO_AUTENTICADO', 'x')),
      'POST /api/auth/refresh': () => json({}),
    });

    const [a, b] = await Promise.all([api('/api/a'), api('/api/b')]);

    expect(a).toEqual({ a: 1 });
    expect(b).toEqual({ b: 1 });
    expect(falso.mock.calls.filter(([url]) => url === '/api/auth/refresh')).toHaveLength(1);
  });

  it('se a renovação falha, devolve o 401 sem ficar tentando para sempre', async () => {
    const falso = simularApi({
      'GET /api/protegida': () => erroDaApi(401, 'NAO_AUTENTICADO', 'Faça login para continuar.'),
      'POST /api/auth/refresh': () => erroDaApi(401, 'NAO_AUTENTICADO', 'x'),
    });

    await expect(api('/api/protegida')).rejects.toMatchObject({ status: 401 });
    expect(falso).toHaveBeenCalledTimes(2);
  });

  it('no login, um 401 (senha errada) NÃO dispara renovação de sessão', async () => {
    const falso = simularApi({
      'POST /api/auth/login': () => erroDaApi(401, 'CREDENCIAIS_INVALIDAS', 'inválidas'),
    });

    await expect(api('/api/auth/login', { method: 'POST', body: {} })).rejects.toMatchObject({
      status: 401,
    });
    expect(falso).toHaveBeenCalledTimes(1);
  });
});
