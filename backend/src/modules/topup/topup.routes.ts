import type { FastifyInstance } from "fastify";
import { createTopupBodySchema, topupIdParamsSchema } from "./topup.schemas.js";
import { confirmTopUp, createTopUp, getTopUpHistory, listTopUpMethodsForUser } from "./topup.service.js";

export async function registerTopupRoutes(app: FastifyInstance): Promise<void> {
  app.get("/users/me/topup/methods", { preHandler: [app.authenticate] }, async (request, reply) => {
    reply.status(200).send(listTopUpMethodsForUser(request.user!.id));
  });

  app.post("/users/me/topup", { preHandler: [app.authenticate] }, async (request, reply) => {
    const body = createTopupBodySchema.parse(request.body);
    const topup = await createTopUp(request.user!.id, body);
    reply.status(201).send({ topup });
  });

  app.post("/users/me/topup/:id/confirm", { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = topupIdParamsSchema.parse(request.params);
    const topup = confirmTopUp(request.user!.id, id);
    reply.status(200).send({ topup });
  });

  app.get("/users/me/topup/history", { preHandler: [app.authenticate] }, async (request, reply) => {
    reply.status(200).send(getTopUpHistory(request.user!.id));
  });
}
