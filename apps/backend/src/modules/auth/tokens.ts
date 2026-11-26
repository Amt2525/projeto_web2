import { jwtVerify, SignJWT } from 'jose';
import { z } from 'zod';
import { roleSchema, type Role } from '@solarsystem/shared';

// Quem emite e quem pode receber o token. Se um JWT de outro sistema chegasse aqui,
// seria recusado por não ter este emissor/destinatário.
const EMISSOR = 'solarsystem';
const DESTINATARIO = 'solarsystem-api';

// Único algoritmo aceito. Fixar a lista impede o ataque clássico em que o atacante
// troca o cabeçalho do token para "alg: none" (sem assinatura) ou para outro algoritmo.
const ALGORITMO = 'HS256';

export type DadosDoToken = {
  userId: string;
  role: Role;
  // "Sessão": identifica a família de refresh tokens deste login (permite revogar a sessão).
  sessionId: string;
};

// Mesmo depois de a assinatura ser válida, conferimos o formato do conteúdo.
const conteudoSchema = z.object({
  sub: z.uuid(),
  role: roleSchema,
  sid: z.uuid(),
});

export type ConfigTokens = {
  secret: string;
  ttlMinutes: number;
};

export function createTokenService({ secret, ttlMinutes }: ConfigTokens) {
  const chave = new TextEncoder().encode(secret);

  return {
    // `agora` pode ser informado para testar expiração sem esperar de verdade.
    async sign(dados: DadosDoToken, agora: Date = new Date()): Promise<string> {
      const emitidoEm = Math.floor(agora.getTime() / 1000);
      return new SignJWT({ role: dados.role, sid: dados.sessionId })
        .setProtectedHeader({ alg: ALGORITMO, typ: 'JWT' })
        .setSubject(dados.userId)
        .setIssuer(EMISSOR)
        .setAudience(DESTINATARIO)
        .setIssuedAt(emitidoEm)
        .setExpirationTime(emitidoEm + ttlMinutes * 60)
        .sign(chave);
    },

    // Retorna os dados se o token for válido, ou null para QUALQUER problema
    // (assinatura errada, expirado, algoritmo trocado, conteúdo inesperado...).
    // Não informamos o motivo ao chamador, para não ajudar um atacante.
    async verify(token: string, agora: Date = new Date()): Promise<DadosDoToken | null> {
      try {
        const { payload } = await jwtVerify(token, chave, {
          algorithms: [ALGORITMO],
          issuer: EMISSOR,
          audience: DESTINATARIO,
          currentDate: agora,
        });
        const conteudo = conteudoSchema.safeParse(payload);
        if (!conteudo.success) return null;
        return {
          userId: conteudo.data.sub,
          role: conteudo.data.role,
          sessionId: conteudo.data.sid,
        };
      } catch {
        return null;
      }
    },
  };
}

export type TokenService = ReturnType<typeof createTokenService>;
