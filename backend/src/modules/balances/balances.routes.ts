import type { FastifyInstance } from "fastify";
import { requireMember } from "../../hooks/requireMember.js";
import { getGroupBalancesAndSuggestions } from "./balances.service.js";

export async function registerBalanceRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    "/groups/:id/balances",
    { preHandler: [app.authenticate, requireMember] },
    async (request, reply) => {
      const { id: groupId } = request.params as { id: string };
      const result = getGroupBalancesAndSuggestions(groupId);
      reply.status(200).send(result);
    }
  );
}
