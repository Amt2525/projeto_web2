import {
  kwpParaWp,
  wpParaKwp,
  type PlantInput,
  type PlantListQuery,
  type PlantListResponse,
  type PlantResponse,
} from '@solarsystem/shared';
import { erros } from '../../errors';
import type { Plant, Prisma, PrismaClient } from '../../generated/prisma/client';
import { registrarAuditoria, type AcaoAuditoria, type ContextoRequisicao } from '../audit/audit';

// Código do Prisma para "violação de restrição única" (ex.: usina duplicada).
const CODIGO_DUPLICADO = 'P2002';

function ehDuplicado(erro: unknown): boolean {
  return (
    typeof erro === 'object' &&
    erro !== null &&
    (erro as { code?: string }).code === CODIGO_DUPLICADO
  );
}

// "2025-03-10" -> Date (meia-noite UTC). O banco guarda só a data (tipo DATE).
function paraData(texto: string | null): Date | null {
  return texto === null ? null : new Date(`${texto}T00:00:00Z`);
}

// Transforma a linha do banco no DTO da API: Wp vira kWp, Decimal vira número, datas viram texto.
// É AQUI que decidimos o que sai. Campos internos (como quem criou) nunca vão para o cliente.
export function paraDto(usina: Plant): PlantResponse {
  return {
    id: usina.id,
    name: usina.name,
    clientName: usina.clientName,
    capacityKwp: wpParaKwp(usina.capacityWp),
    city: usina.city,
    state: usina.state,
    latitude: usina.latitude === null ? null : Number(usina.latitude),
    longitude: usina.longitude === null ? null : Number(usina.longitude),
    installedOn: usina.installedOn === null ? null : usina.installedOn.toISOString().slice(0, 10),
    isActive: usina.isActive,
    createdAt: usina.createdAt.toISOString(),
    updatedAt: usina.updatedAt.toISOString(),
  };
}

export type PlantsService = ReturnType<typeof createPlantsService>;

export function createPlantsService(deps: { prisma: PrismaClient }) {
  const { prisma } = deps;

  // Dados prontos para gravar. Só passam os campos da lista: nada além do que o Zod aprovou.
  function paraGravar(entrada: PlantInput) {
    return {
      name: entrada.name,
      clientName: entrada.clientName,
      capacityWp: kwpParaWp(entrada.capacityKwp),
      city: entrada.city,
      state: entrada.state,
      latitude: entrada.latitude,
      longitude: entrada.longitude,
      installedOn: paraData(entrada.installedOn),
    };
  }

  async function listar(consulta: PlantListQuery): Promise<PlantListResponse> {
    const filtros: Prisma.PlantWhereInput[] = [];
    // A busca olha nome, cliente e cidade. O Prisma envia o texto como parâmetro (sem risco de SQL injection).
    if (consulta.q) {
      filtros.push({
        OR: [
          { name: { contains: consulta.q, mode: 'insensitive' } },
          { clientName: { contains: consulta.q, mode: 'insensitive' } },
          { city: { contains: consulta.q, mode: 'insensitive' } },
        ],
      });
    }
    if (consulta.state) filtros.push({ state: consulta.state });
    if (consulta.active !== undefined) filtros.push({ isActive: consulta.active });
    const where: Prisma.PlantWhereInput = { AND: filtros };

    const [total, usinas] = await prisma.$transaction([
      prisma.plant.count({ where }),
      prisma.plant.findMany({
        where,
        // Ordem estável: nome e, em caso de empate, id (senão a paginação pode repetir ou pular itens).
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        skip: (consulta.page - 1) * consulta.pageSize,
        take: consulta.pageSize,
      }),
    ]);

    return {
      items: usinas.map(paraDto),
      page: consulta.page,
      pageSize: consulta.pageSize,
      total,
      totalPages: Math.ceil(total / consulta.pageSize),
    };
  }

  async function buscar(id: string): Promise<PlantResponse> {
    const usina = await prisma.plant.findUnique({ where: { id } });
    if (!usina) throw erros.naoEncontrado();
    return paraDto(usina);
  }

  async function criar(
    entrada: PlantInput,
    userId: string,
    contexto: ContextoRequisicao,
  ): Promise<PlantResponse> {
    try {
      const usina = await prisma.$transaction(async (tx) => {
        // `createdById` vem do JWT (quem está logado), NUNCA do corpo da requisição.
        const criada = await tx.plant.create({
          data: { ...paraGravar(entrada), createdById: userId },
        });
        await registrarAuditoria(tx, {
          acao: 'USINA_CRIADA',
          userId,
          contexto,
          metadata: { plantId: criada.id },
        });
        return criada;
      });
      return paraDto(usina);
    } catch (erro) {
      if (ehDuplicado(erro)) throw erros.usinaDuplicada();
      throw erro;
    }
  }

  async function editar(
    id: string,
    entrada: PlantInput,
    userId: string,
    contexto: ContextoRequisicao,
  ): Promise<PlantResponse> {
    try {
      const usina = await prisma.$transaction(async (tx) => {
        // Confere antes para devolver 404 (e não um erro do banco) quando o id não existe.
        if (!(await tx.plant.findUnique({ where: { id }, select: { id: true } }))) {
          throw erros.naoEncontrado();
        }
        const editada = await tx.plant.update({ where: { id }, data: paraGravar(entrada) });
        await registrarAuditoria(tx, {
          acao: 'USINA_EDITADA',
          userId,
          contexto,
          metadata: { plantId: id },
        });
        return editada;
      });
      return paraDto(usina);
    } catch (erro) {
      if (ehDuplicado(erro)) throw erros.usinaDuplicada();
      throw erro;
    }
  }

  // Desativar e reativar são a mesma operação com valores diferentes. Repetir a operação é inofensivo.
  async function mudarSituacao(
    id: string,
    ativa: boolean,
    userId: string,
    contexto: ContextoRequisicao,
  ): Promise<PlantResponse> {
    const acao: AcaoAuditoria = ativa ? 'USINA_REATIVADA' : 'USINA_DESATIVADA';
    const usina = await prisma.$transaction(async (tx) => {
      if (!(await tx.plant.findUnique({ where: { id }, select: { id: true } }))) {
        throw erros.naoEncontrado();
      }
      const atualizada = await tx.plant.update({ where: { id }, data: { isActive: ativa } });
      await registrarAuditoria(tx, { acao, userId, contexto, metadata: { plantId: id } });
      return atualizada;
    });
    return paraDto(usina);
  }

  return { listar, buscar, criar, editar, mudarSituacao };
}
