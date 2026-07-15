import type { FastifyInstance } from "fastify";
import { requireMember } from "../../hooks/requireMember.js";
import { createGroupBodySchema, groupIdParamsSchema } from "./groups.schemas.js";
import { createGroup, getGroupDetail, listMyGroups } from "./groups.service.js";

export async function registerGroupRoutes(app: FastifyInstance): Promise<void> {
  app.get("/groups", { preHandler: [app.authenticate] }, async (request, reply) => {
    const result = await listMyGroups(request.user!.id);
    reply.status(200).send(result);
  });

  app.post("/groups", { preHandler: [app.authenticate] }, async (request, reply) => {
    const body = createGroupBodySchema.parse(request.body);
    const result = await createGroup(request.user!.id, body);
    reply.status(201).send(result);
  });

  app.get(
    "/groups/:id",
    { preHandler: [app.authenticate, requireMember] },
    async (request, reply) => {
      const { id } = groupIdParamsSchema.parse(request.params);
      const result = await getGroupDetail(id);
      reply.status(200).send(result);
    }
  );
}
