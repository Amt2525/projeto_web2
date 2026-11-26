import type { FastifyInstance } from 'fastify';
import { plantIdParamsSchema, plantInputSchema, plantListQuerySchema } from '@solarsystem/shared';
import { contextoDaRequisicao } from '../audit/audit';
import type { PlantsService } from './plants.service';

type Opcoes = { service: PlantsService };

// Rotas de usinas (prefixo /api/plants). Toda entrada passa pelo Zod antes de qualquer lógica.
export async function plantsRoutes(app: FastifyInstance, { service }: Opcoes) {
  const { requireAuth, requireActiveSession, requireRole } = app.guards;

  // Qualquer pessoa logada vê todas as usinas (regra de negócio acordada).
  const leitura = [requireAuth];
  // Escrever exige sessão ainda ativa no banco e perfil permitido. Listamos os perfis de forma
  // explícita: se um perfil novo surgir um dia, ele NÃO ganha escrita sem alguém decidir isso.
  const escrita = [requireAuth, requireActiveSession, requireRole('ADMIN', 'TECNICO')];

  app.get('/', { preHandler: leitura }, async (request) => {
    return service.listar(plantListQuerySchema.parse(request.query ?? {}));
  });

  app.get('/:id', { preHandler: leitura }, async (request) => {
    const { id } = plantIdParamsSchema.parse(request.params);
    return service.buscar(id);
  });

  app.post('/', { preHandler: escrita }, async (request, reply) => {
    const entrada = plantInputSchema.parse(request.body ?? {});
    const usina = await service.criar(entrada, request.auth!.userId, contextoDaRequisicao(request));
    return reply.status(201).send(usina);
  });

  // PUT: o corpo é a usina COMPLETA (o formulário de edição sempre envia tudo).
  app.put('/:id', { preHandler: escrita }, async (request) => {
    const { id } = plantIdParamsSchema.parse(request.params);
    const entrada = plantInputSchema.parse(request.body ?? {});
    return service.editar(id, entrada, request.auth!.userId, contextoDaRequisicao(request));
  });

  app.post('/:id/deactivate', { preHandler: escrita }, async (request) => {
    const { id } = plantIdParamsSchema.parse(request.params);
    return service.mudarSituacao(id, false, request.auth!.userId, contextoDaRequisicao(request));
  });

  app.post('/:id/activate', { preHandler: escrita }, async (request) => {
    const { id } = plantIdParamsSchema.parse(request.params);
    return service.mudarSituacao(id, true, request.auth!.userId, contextoDaRequisicao(request));
  });
}
