import { randomUUID } from 'node:crypto';
import {
  senhaContemEmail,
  type ChangePasswordInput,
  type LoginInput,
  type UserResponse,
} from '@solarsystem/shared';
import type { Env } from '../../config/env';
import { AppError, erros } from '../../errors';
import type { Prisma, PrismaClient, User } from '../../generated/prisma/client';
import { registrarAuditoria, type ContextoRequisicao } from '../audit/audit';
import { hashPassword, verifyPassword } from './password';
import { generateRefreshToken, hashRefreshToken } from './refresh-token';
import type { TokenService } from './tokens';

// Regras de bloqueio contra força bruta: 5 falhas seguidas bloqueiam a conta por 15 minutos.
const MAX_FALHAS_SEGUIDAS = 5;
const MINUTOS_DE_BLOQUEIO = 15;

export type ParDeTokens = { acesso: string; renovacao: string };
export type ResultadoSessao = { user: UserResponse; tokens: ParDeTokens };

type Db = PrismaClient | Prisma.TransactionClient;

export type AuthDeps = {
  prisma: PrismaClient;
  env: Env;
  tokens: TokenService;
  // O relógio é injetado para os testes simularem a passagem do tempo sem esperar.
  now: () => Date;
};

function paraResposta(user: Pick<User, 'id' | 'name' | 'email' | 'role'>): UserResponse {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

// Quando o e-mail não existe, ainda assim gastamos o tempo de uma verificação Argon2.
// Sem isso, "e-mail inexistente" responderia muito mais rápido que "senha errada",
// e o atacante descobriria quais e-mails estão cadastrados medindo o tempo da resposta.
let hashFalso: Promise<string> | undefined;
function obterHashFalso(): Promise<string> {
  hashFalso ??= hashPassword('senha-descartavel-que-ninguem-usa');
  return hashFalso;
}

export function createAuthService({ prisma, env, tokens, now }: AuthDeps) {
  async function emitirTokens(
    db: Db,
    user: Pick<User, 'id' | 'role'>,
    familyId: string,
    agora: Date,
  ): Promise<ParDeTokens> {
    const renovacao = generateRefreshToken();
    await db.refreshToken.create({
      data: {
        userId: user.id,
        familyId,
        tokenHash: hashRefreshToken(renovacao),
        createdAt: agora,
        expiresAt: new Date(agora.getTime() + env.REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000),
      },
    });
    const acesso = await tokens.sign(
      { userId: user.id, role: user.role, sessionId: familyId },
      agora,
    );
    return { acesso, renovacao };
  }

  function revogarFamilia(db: Db, familyId: string, agora: Date) {
    return db.refreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: agora },
    });
  }

  // Conta uma falha de senha e bloqueia a conta ao atingir o limite.
  async function registrarFalhaDeSenha(
    user: Pick<User, 'id'>,
    agora: Date,
    contexto: ContextoRequisicao,
    origem: 'LOGIN' | 'TROCA_DE_SENHA',
  ) {
    const atualizado = await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: { increment: 1 } },
      select: { failedLoginAttempts: true },
    });
    await registrarAuditoria(prisma, {
      acao: 'LOGIN_FALHA',
      userId: user.id,
      contexto,
      metadata: { motivo: 'SENHA_INCORRETA', origem },
    });

    if (atualizado.failedLoginAttempts >= MAX_FALHAS_SEGUIDAS) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: 0,
          lockedUntil: new Date(agora.getTime() + MINUTOS_DE_BLOQUEIO * 60 * 1000),
        },
      });
      await registrarAuditoria(prisma, { acao: 'CONTA_BLOQUEADA', userId: user.id, contexto });
    }
  }

  return {
    async login(entrada: LoginInput, contexto: ContextoRequisicao): Promise<ResultadoSessao> {
      const agora = now();
      const user = await prisma.user.findUnique({ where: { email: entrada.email } });

      // Sempre verificamos uma senha (a real ou a falsa) para o tempo de resposta não revelar nada.
      const hash = user?.passwordHash ?? (await obterHashFalso());
      const senhaCorreta = await verifyPassword(hash, entrada.password);
      const bloqueada = user?.lockedUntil != null && user.lockedUntil > agora;

      if (!user || !user.isActive || bloqueada || !senhaCorreta) {
        if (user && user.isActive && !bloqueada) {
          await registrarFalhaDeSenha(user, agora, contexto, 'LOGIN');
        } else {
          // O motivo real fica só no registro de auditoria; ao cliente vai sempre a mesma mensagem.
          const motivo = !user
            ? 'USUARIO_INEXISTENTE'
            : !user.isActive
              ? 'CONTA_INATIVA'
              : 'CONTA_BLOQUEADA';
          await registrarAuditoria(prisma, {
            acao: 'LOGIN_FALHA',
            userId: user?.id ?? null,
            contexto,
            metadata: { motivo, origem: 'LOGIN' },
          });
        }
        throw erros.credenciaisInvalidas();
      }

      const tokensEmitidos = await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: user.id },
          data: { failedLoginAttempts: 0, lockedUntil: null },
        });
        const emitidos = await emitirTokens(tx, user, randomUUID(), agora);
        await registrarAuditoria(tx, { acao: 'LOGIN_SUCESSO', userId: user.id, contexto });
        return emitidos;
      });

      return { user: paraResposta(user), tokens: tokensEmitidos };
    },

    // Troca um refresh token por um par novo (rotação). Retorna null se o token não puder ser usado.
    async refresh(
      renovacaoRecebida: string,
      contexto: ContextoRequisicao,
    ): Promise<ResultadoSessao | null> {
      const agora = now();
      const hash = hashRefreshToken(renovacaoRecebida);

      return prisma.$transaction(async (tx) => {
        const atual = await tx.refreshToken.findUnique({
          where: { tokenHash: hash },
          include: { user: true },
        });
        if (!atual) return null;
        if (atual.revokedAt !== null || atual.expiresAt <= agora) return null;

        // Token já usado reapareceu: alguém guardou uma cópia. Revogamos a sessão inteira.
        const reutilizado = async () => {
          await revogarFamilia(tx, atual.familyId, agora);
          await registrarAuditoria(tx, {
            acao: 'REFRESH_REUTILIZADO',
            userId: atual.userId,
            contexto,
          });
          return null;
        };
        if (atual.usedAt !== null) return reutilizado();

        if (!atual.user.isActive) {
          await revogarFamilia(tx, atual.familyId, agora);
          return null;
        }

        // "Reivindica" o token de forma atômica: só uma requisição consegue marcá-lo como usado.
        // Se duas chegarem juntas com o mesmo token, a segunda cai aqui e é tratada como reuso.
        const marcado = await tx.refreshToken.updateMany({
          where: { id: atual.id, usedAt: null },
          data: { usedAt: agora },
        });
        if (marcado.count === 0) return reutilizado();

        const novos = await emitirTokens(tx, atual.user, atual.familyId, agora);
        return { user: paraResposta(atual.user), tokens: novos };
      });
    },

    // Encerra a sessão. Sempre "dá certo": sair duas vezes ou com um token inválido não é erro.
    async logout(
      renovacaoRecebida: string | undefined,
      sessaoDoAcesso: string | undefined,
      contexto: ContextoRequisicao,
    ) {
      const agora = now();
      const familias = new Set<string>();
      let userId: string | null = null;

      if (renovacaoRecebida) {
        const token = await prisma.refreshToken.findUnique({
          where: { tokenHash: hashRefreshToken(renovacaoRecebida) },
          select: { familyId: true, userId: true },
        });
        if (token) {
          familias.add(token.familyId);
          userId = token.userId;
        }
      }
      if (sessaoDoAcesso) familias.add(sessaoDoAcesso);

      for (const familyId of familias) await revogarFamilia(prisma, familyId, agora);
      if (userId) await registrarAuditoria(prisma, { acao: 'LOGOUT', userId, contexto });
    },

    // A sessão ainda existe no banco (não foi revogada nem expirou)?
    // Usado nas rotas sensíveis: o JWT sozinho não sabe que o usuário fez logout.
    async sessaoAtiva(sessionId: string): Promise<boolean> {
      const total = await prisma.refreshToken.count({
        where: { familyId: sessionId, revokedAt: null, expiresAt: { gt: now() } },
      });
      return total > 0;
    },

    async buscarUsuarioAtivo(userId: string): Promise<UserResponse | null> {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      return user && user.isActive ? paraResposta(user) : null;
    },

    async trocarSenha(
      userId: string,
      entrada: ChangePasswordInput,
      contexto: ContextoRequisicao,
    ): Promise<ParDeTokens> {
      const agora = now();
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user || !user.isActive) throw erros.naoAutenticado();

      const correta = await verifyPassword(user.passwordHash, entrada.currentPassword);
      if (!correta) {
        await registrarFalhaDeSenha(user, agora, contexto, 'TROCA_DE_SENHA');
        throw new AppError(400, 'SENHA_ATUAL_INCORRETA', 'A senha atual está incorreta.');
      }
      if (senhaContemEmail(entrada.newPassword, user.email)) {
        throw erros.dadosInvalidos([
          { field: 'newPassword', message: 'A senha não pode conter o seu e-mail.' },
        ]);
      }

      // O hash é calculado antes da transação: o Argon2 é lento e não deve segurar a transação aberta.
      const novoHash = await hashPassword(entrada.newPassword);

      return prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: user.id },
          data: {
            passwordHash: novoHash,
            passwordChangedAt: agora,
            failedLoginAttempts: 0,
            lockedUntil: null,
          },
        });
        // Trocar a senha encerra TODAS as sessões (inclusive em outros dispositivos)...
        await tx.refreshToken.updateMany({
          where: { userId: user.id, revokedAt: null },
          data: { revokedAt: agora },
        });
        // ...e abre uma sessão nova só para quem acabou de trocar.
        const emitidos = await emitirTokens(tx, user, randomUUID(), agora);
        await registrarAuditoria(tx, { acao: 'SENHA_ALTERADA', userId: user.id, contexto });
        return emitidos;
      });
    },
  };
}

export type AuthService = ReturnType<typeof createAuthService>;
