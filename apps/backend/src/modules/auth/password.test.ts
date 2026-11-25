import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from './password';

describe('hashPassword / verifyPassword', () => {
  it('gera um hash Argon2id que não contém a senha', async () => {
    const hash = await hashPassword('cavalo-bateria-grampo-correto');
    expect(hash.startsWith('$argon2id$')).toBe(true);
    expect(hash).not.toContain('cavalo');
  });

  it('usa os parâmetros definidos (64 MiB, 3 iterações, 1 thread)', async () => {
    const hash = await hashPassword('cavalo-bateria-grampo-correto');
    expect(hash).toContain('m=65536,t=3,p=1');
  });

  it('confere a senha correta e rejeita a errada', async () => {
    const hash = await hashPassword('cavalo-bateria-grampo-correto');
    expect(await verifyPassword(hash, 'cavalo-bateria-grampo-correto')).toBe(true);
    expect(await verifyPassword(hash, 'cavalo-bateria-grampo-errado')).toBe(false);
  });

  it('gera hashes diferentes para a mesma senha (sal aleatório)', async () => {
    const [a, b] = await Promise.all([
      hashPassword('mesma-senha-longa-1'),
      hashPassword('mesma-senha-longa-1'),
    ]);
    expect(a).not.toBe(b);
  });

  it('diferencia maiúsculas de minúsculas', async () => {
    const hash = await hashPassword('Senha-Longa-Exemplo-1');
    expect(await verifyPassword(hash, 'senha-longa-exemplo-1')).toBe(false);
  });

  it('retorna false (sem lançar erro) quando o hash está corrompido', async () => {
    expect(await verifyPassword('isto-nao-e-um-hash', 'qualquer-senha-longa')).toBe(false);
    expect(await verifyPassword('', 'qualquer-senha-longa')).toBe(false);
  });
});
