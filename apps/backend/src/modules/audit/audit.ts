import type { FastifyRequest } from 'fastify';
import type { Prisma, PrismaClient } from '../../generated/prisma/client';

// Códigos das ações auditadas (o banco exige o formato MAIUSCULAS_COM_SUBLINHADO).
export type AcaoAuditoria =
  | 'LOGIN_SUCESSO'
  | 'LOGIN_FALHA'
  | 'CONTA_BLOQUEADA'
  | 'LOGOUT'
  | 'REFRESH_REUTILIZADO'
  | 'SENHA_ALTERADA';

export type ContextoRequisicao = { ip: string | null; userAgent: string | null };

export function contextoDaRequisicao(request: FastifyRequest): ContextoRequisicao {
  const userAgent = request.headers['user-agent'];
  return {
    ip: request.ip ?? null,
    // O banco limita a 200 caracteres: truncamos antes de gravar.
    userAgent: typeof userAgent === 'string' ? userAgent.slice(0, 200) : null,
  };
}

// Grava um evento de auditoria. NUNCA passe senhas, tokens ou hashes em `metadata`.
export async function registrarAuditoria(
  db: PrismaClient | Prisma.TransactionClient,
  evento: {
    acao: AcaoAuditoria;
    userId?: string | null;
    contexto: ContextoRequisicao;
    metadata?: Prisma.InputJsonValue;
  },
) {
  await db.auditLog.create({
    data: {
      action: evento.acao,
      userId: evento.userId ?? null,
      ip: evento.contexto.ip,
      userAgent: evento.contexto.userAgent,
      ...(evento.metadata !== undefined ? { metadata: evento.metadata } : {}),
    },
  });
}
