import { z } from "zod";

export const groupIdParamsSchema = z.object({
  id: z.string().min(1),
});

// Matches config/constants.ts GROUP_TYPES — kept as a literal tuple here for zod's type inference.
export const createGroupBodySchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().optional(),
  type: z.enum(["family", "friends", "roommates", "trip", "other"]),
  memberEmails: z.array(z.string().email()).optional(),
});
export type CreateGroupBody = z.infer<typeof createGroupBodySchema>;
