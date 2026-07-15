import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { getGlobalActivity } from "./activity.service.js";

const querySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).optional().default(50),
});

export async function registerActivityRoutes(app: FastifyInstance): Promise<void> {
  app.get("/activity", { preHandler: [app.authenticate] }, async (request, reply) => {
    const { limit } = querySchema.parse(request.query);
    const result = await getGlobalActivity(request.user!.id, limit);
    reply.status(200).send(result);
  });
}
