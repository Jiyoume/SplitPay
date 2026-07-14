import type { FastifyInstance } from "fastify";
import { requireMember } from "../../hooks/requireMember.js";
import {
  createSettlementBodySchema,
  groupIdParamsSchema,
  settlementIdParamsSchema,
} from "./settlements.schemas.js";
import { createSettlement, getSettlementById, listGroupSettlements } from "./settlements.service.js";

export async function registerSettlementRoutes(app: FastifyInstance): Promise<void> {
  app.post(
    "/groups/:id/settlements",
    { preHandler: [app.authenticate, requireMember] },
    async (request, reply) => {
      const { id: groupId } = groupIdParamsSchema.parse(request.params);
      const body = createSettlementBodySchema.parse(request.body);
      const { status, settlement } = await createSettlement(groupId, request.user!.id, body);
      reply.status(status).send({ settlement });
    }
  );

  app.get(
    "/groups/:id/settlements",
    { preHandler: [app.authenticate, requireMember] },
    async (request, reply) => {
      const { id: groupId } = groupIdParamsSchema.parse(request.params);
      reply.status(200).send(listGroupSettlements(groupId));
    }
  );

  app.get("/settlements/:id", { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = settlementIdParamsSchema.parse(request.params);
    const result = await getSettlementById(id, request.user!.id);
    reply.status(200).send(result);
  });
}
