import type { FastifyInstance } from "fastify";
import { scanReceiptBodySchema } from "./receipts.schemas.js";
import { scanReceipt } from "./receipts.service.js";

const RECEIPT_BODY_LIMIT_BYTES = 10 * 1024 * 1024; // 10MB — base64 image payload (contract §1)

export async function registerReceiptRoutes(app: FastifyInstance): Promise<void> {
  app.post(
    "/receipts/scan",
    { preHandler: [app.authenticate], bodyLimit: RECEIPT_BODY_LIMIT_BYTES },
    async (request, reply) => {
      const { imageBase64 } = scanReceiptBodySchema.parse(request.body);
      const result = await scanReceipt(imageBase64);
      reply.status(201).send({ result });
    }
  );
}
