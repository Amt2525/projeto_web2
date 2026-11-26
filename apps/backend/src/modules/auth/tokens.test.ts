import { createHmac } from 'node:crypto';
import { SignJWT } from 'jose';
import { describe, expect, it } from 'vitest';
import { createTokenService, type DadosDoToken } from './tokens';

// Segredo FICTÍCIO, só para os testes.
const SEGREDO = 'segredo-de-teste-com-mais-de-32-caracteres!!';
const dados: DadosDoToken = {
  userId: '0199a000-0000-7000-8000-000000000001',
  role: 'TECNICO',
  sessionId: '0199a000-0000-7000-8000-000000000002',
};
const servico = createTokenService({ secret: SEGREDO, ttlMinutes: 15 });
const base64url = (obj: object) => Buffer.from(JSON.stringify(obj)).toString('base64url');

describe('tokens JWT de acesso', () => {
  it('assina e verifica um token válido, devolvendo os mesmos dados', async () => {
    const token = await servico.sign(dados);
    expect(await servico.verify(token)).toEqual(dados);
  });

  it('o token é um JWT de 3 partes e usa HS256', async () => {
    const token = await servico.sign(dados);
    const partes = token.split('.');
    expect(partes).toHaveLength(3);
    const cabecalho = JSON.parse(Buffer.from(partes[0]!, 'base64url').toString());
    expect(cabecalho.alg).toBe('HS256');
  });

  it('não coloca dados sensíveis no token (só id, perfil e sessão)', async () => {
    const token = await servico.sign(dados);
    const conteudo = JSON.parse(Buffer.from(token.split('.')[1]!, 'base64url').toString());
    expect(Object.keys(conteudo).sort()).toEqual([
      'aud',
      'exp',
      'iat',
      'iss',
      'role',
      'sid',
      'sub',
    ]);
  });

  it('aceita o token logo antes de expirar e rejeita depois', async () => {
    const emissao = new Date('2026-11-25T12:00:00Z');
    const token = await servico.sign(dados, emissao);
    expect(await servico.verify(token, new Date('2026-11-25T12:14:59Z'))).toEqual(dados);
    expect(await servico.verify(token, new Date('2026-11-25T12:15:01Z'))).toBeNull();
  });

  it('rejeita token assinado com outro segredo', async () => {
    const outro = createTokenService({
      secret: 'outro-segredo-de-teste-com-32-caracteres!!',
      ttlMinutes: 15,
    });
    expect(await servico.verify(await outro.sign(dados))).toBeNull();
  });

  it('rejeita token adulterado (troca do perfil para ADMIN mantendo a assinatura)', async () => {
    const [cabecalho, conteudo, assinatura] = (await servico.sign(dados)).split('.');
    const adulterado = JSON.parse(Buffer.from(conteudo!, 'base64url').toString());
    adulterado.role = 'ADMIN';
    const token = `${cabecalho}.${base64url(adulterado)}.${assinatura}`;
    expect(await servico.verify(token)).toBeNull();
  });

  it('rejeita token sem assinatura com "alg: none"', async () => {
    const agora = Math.floor(Date.now() / 1000);
    const conteudo = {
      sub: dados.userId,
      role: 'ADMIN',
      sid: dados.sessionId,
      iss: 'solarsystem',
      aud: 'solarsystem-api',
      iat: agora,
      exp: agora + 900,
    };
    const token = `${base64url({ alg: 'none', typ: 'JWT' })}.${base64url(conteudo)}.`;
    expect(await servico.verify(token)).toBeNull();
  });

  it('rejeita token assinado com outro algoritmo (HS512), mesmo com o segredo certo', async () => {
    const token = await new SignJWT({ role: 'TECNICO', sid: dados.sessionId })
      .setProtectedHeader({ alg: 'HS512' })
      .setSubject(dados.userId)
      .setIssuer('solarsystem')
      .setAudience('solarsystem-api')
      .setExpirationTime('15m')
      .sign(new TextEncoder().encode(SEGREDO));
    expect(await servico.verify(token)).toBeNull();
  });

  it('rejeita token de outro emissor ou destinatário', async () => {
    const chave = new TextEncoder().encode(SEGREDO);
    const montar = (iss: string, aud: string) =>
      new SignJWT({ role: 'TECNICO', sid: dados.sessionId })
        .setProtectedHeader({ alg: 'HS256' })
        .setSubject(dados.userId)
        .setIssuer(iss)
        .setAudience(aud)
        .setExpirationTime('15m')
        .sign(chave);
    expect(await servico.verify(await montar('outro-sistema', 'solarsystem-api'))).toBeNull();
    expect(await servico.verify(await montar('solarsystem', 'outra-api'))).toBeNull();
  });

  it('rejeita token válido cujo conteúdo é inesperado (sem sessão, perfil inválido, sub inválido)', async () => {
    const chave = new TextEncoder().encode(SEGREDO);
    const montar = (extra: Record<string, unknown>, sub: string) =>
      new SignJWT(extra)
        .setProtectedHeader({ alg: 'HS256' })
        .setSubject(sub)
        .setIssuer('solarsystem')
        .setAudience('solarsystem-api')
        .setExpirationTime('15m')
        .sign(chave);
    expect(await servico.verify(await montar({ role: 'TECNICO' }, dados.userId))).toBeNull();
    expect(
      await servico.verify(await montar({ role: 'SUPERUSER', sid: dados.sessionId }, dados.userId)),
    ).toBeNull();
    expect(
      await servico.verify(await montar({ role: 'TECNICO', sid: dados.sessionId }, 'nao-e-uuid')),
    ).toBeNull();
  });

  it('rejeita lixo: texto vazio, aleatório ou truncado', async () => {
    expect(await servico.verify('')).toBeNull();
    expect(await servico.verify('abc')).toBeNull();
    expect(await servico.verify('a.b.c')).toBeNull();
    const token = await servico.sign(dados);
    expect(await servico.verify(token.slice(0, -5))).toBeNull();
  });

  it('confirma que o teste de adulteração é real: o HMAC do token original bate', async () => {
    // Prova de sanidade: recalcular a assinatura com o segredo correto de fato produz um token válido.
    // Isso garante que os testes acima falham pelo motivo certo (assinatura), e não por erro de montagem.
    const token = await servico.sign(dados);
    const [cabecalho, conteudo, assinatura] = token.split('.');
    const esperada = createHmac('sha256', SEGREDO)
      .update(`${cabecalho}.${conteudo}`)
      .digest('base64url');
    expect(assinatura).toBe(esperada);
  });
});
