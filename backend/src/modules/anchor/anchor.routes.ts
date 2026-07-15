import type { FastifyInstance } from "fastify";
import { anchorBodySchema } from "./anchor.schemas.js";
import { initiateAnchorDeposit, initiateAnchorWithdraw } from "./anchor.service.js";
import { SRT_ASSET_CODE } from "../../stellar/anchor.js";

export async function registerAnchorRoutes(app: FastifyInstance): Promise<void> {
  app.post("/users/me/anchor/deposit", { preHandler: [app.authenticate] }, async (request, reply) => {
    const { assetCode } = anchorBodySchema.parse(request.body ?? {});
    const result = await initiateAnchorDeposit(request.user!.id, assetCode ?? SRT_ASSET_CODE);
    reply.status(201).send(result);
  });

  app.post("/users/me/anchor/withdraw", { preHandler: [app.authenticate] }, async (request, reply) => {
    const { assetCode } = anchorBodySchema.parse(request.body ?? {});
    const result = await initiateAnchorWithdraw(request.user!.id, assetCode ?? SRT_ASSET_CODE);
    reply.status(201).send(result);
  });
}
