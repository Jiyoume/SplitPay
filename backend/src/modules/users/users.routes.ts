import type { FastifyInstance } from "fastify";
import { userIdParamsSchema } from "./users.schemas.js";
import { fundMyWallet, getMe, getMySummary, getVerification } from "./users.service.js";

export async function registerUserRoutes(app: FastifyInstance): Promise<void> {
  app.get("/users/me", { preHandler: [app.authenticate] }, async (request, reply) => {
    const result = await getMe(request.user!.id);
    reply.status(200).send(result);
  });

  app.get("/users/me/summary", { preHandler: [app.authenticate] }, async (request, reply) => {
    const result = getMySummary(request.user!.id);
    reply.status(200).send(result);
  });

  app.post("/users/me/wallet/fund", { preHandler: [app.authenticate] }, async (request, reply) => {
    const result = await fundMyWallet(request.user!.id);
    reply.status(200).send(result);
  });

  app.get("/users/:id/verification", { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = userIdParamsSchema.parse(request.params);
    reply.status(200).send(getVerification(id));
  });
}
