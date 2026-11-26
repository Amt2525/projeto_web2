import { createHash, randomBytes } from 'node:crypto';

// Refresh token: texto aleatório de 256 bits, gerado pelo gerador criptográfico do sistema.
// Não é um JWT: não carrega informação nenhuma, só serve como "senha de uso único" de renovação.
export function generateRefreshToken(): string {
  return randomBytes(32).toString('base64url');
}

// No banco guardamos apenas o hash SHA-256 (64 caracteres hexadecimais).
// SHA-256 simples basta aqui porque o token já tem 256 bits de entropia (não é uma senha humana,
// então não precisa de Argon2). Se o banco vazar, o hash não permite recuperar o token.
export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
