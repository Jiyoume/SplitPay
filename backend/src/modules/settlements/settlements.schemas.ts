import { z } from "zod";

export const groupIdParamsSchema = z.object({
  id: z.string().min(1),
});

export const settlementIdParamsSchema = z.object({
  id: z.string().min(1),
});

export const createSettlementBodySchema = z.object({
  fromUserId: z.string().min(1),
  toUserId: z.string().min(1),
  amount: z.number().positive(),
  currency: z.string().optional(),
  note: z.string().max(140).optional(),
});
export type CreateSettlementBody = z.infer<typeof createSettlementBodySchema>;
