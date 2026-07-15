import { z } from "zod";

export const anchorBodySchema = z.object({
  assetCode: z.string().min(1).optional(),
});
export type AnchorBody = z.infer<typeof anchorBodySchema>;
