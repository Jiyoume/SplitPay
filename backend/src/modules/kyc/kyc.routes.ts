import type { FastifyInstance } from "fastify";
import { putKycBodySchema } from "./kyc.schemas.js";
import { getKycStatus, submitKyc } from "./kyc.service.js";

export async function registerKycRoutes(app: FastifyInstance): Promise<void> {
  app.get("/users/me/kyc", { preHandler: [app.authenticate] }, async (request, reply) => {
    reply.status(200).send(getKycStatus(request.user!.id));
  });

  app.put("/users/me/kyc", { preHandler: [app.authenticate] }, async (request, reply) => {
    const body = putKycBodySchema.parse(request.body);
    const result = await submitKyc(request.user!.id, body);
    reply.status(200).send(result);
  });
}
