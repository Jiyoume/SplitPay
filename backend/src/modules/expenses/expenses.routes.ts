import type { FastifyInstance } from "fastify";
import { requireMember } from "../../hooks/requireMember.js";
import { createExpenseBodySchema, groupIdParamsSchema } from "./expenses.schemas.js";
import { addExpense, listGroupExpenses } from "./expenses.service.js";

export async function registerExpenseRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    "/groups/:id/expenses",
    { preHandler: [app.authenticate, requireMember] },
    async (request, reply) => {
      const { id } = groupIdParamsSchema.parse(request.params);
      reply.status(200).send(await listGroupExpenses(id));
    }
  );

  app.post(
    "/groups/:id/expenses",
    { preHandler: [app.authenticate, requireMember] },
    async (request, reply) => {
      const { id } = groupIdParamsSchema.parse(request.params);
      const body = createExpenseBodySchema.parse(request.body);
      const result = await addExpense(id, request.user!.id, body);
      reply.status(201).send(result);
    }
  );
}
