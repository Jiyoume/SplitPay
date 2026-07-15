import { z } from "zod";

export const scanReceiptBodySchema = z.object({
  imageBase64: z.string().min(1),
});
export type ScanReceiptBody = z.infer<typeof scanReceiptBodySchema>;
