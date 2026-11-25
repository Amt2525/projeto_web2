import { describe, expect, it } from 'vitest';
import { generateRefreshToken, hashRefreshToken } from './refresh-token';

describe('refresh token', () => {
  it('gera tokens com 256 bits (43 caracteres em base64url)', () => {
    const token = generateRefreshToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it('gera tokens diferentes a cada chamada', () => {
    const tokens = new Set(Array.from({ length: 200 }, () => generateRefreshToken()));
    expect(tokens.size).toBe(200);
  });

  it('o hash tem 64 caracteres hexadecimais (formato exigido pelo CHECK do banco)', () => {
    expect(hashRefreshToken(generateRefreshToken())).toMatch(/^[0-9a-f]{64}$/);
  });

  it('o hash é determinístico e não contém o token', () => {
    const token = generateRefreshToken();
    expect(hashRefreshToken(token)).toBe(hashRefreshToken(token));
    expect(hashRefreshToken(token)).not.toContain(token);
  });

  it('tokens diferentes geram hashes diferentes', () => {
    expect(hashRefreshToken('a'.repeat(43))).not.toBe(hashRefreshToken('b'.repeat(43)));
  });
});
