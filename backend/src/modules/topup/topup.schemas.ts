import { z } from "zod";

export const topupMethodEnum = z.enum([
  "gcash",
  "maya",
  "bank_transfer",
  "card",
  "stellar_anchor",
  "stellar_direct",
  "friendbot",
]);
export type TopupMethod = z.infer<typeof topupMethodEnum>;

export const createTopupBodySchema = z.object({
  method: topupMethodEnum,
  amount: z.number().nonnegative(),
  metadata: z.record(z.unknown()).optional(),
});
export type CreateTopupBody = z.infer<typeof createTopupBodySchema>;

export const topupIdParamsSchema = z.object({
  id: z.string().min(1),
});
