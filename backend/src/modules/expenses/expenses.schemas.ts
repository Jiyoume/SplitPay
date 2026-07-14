import { z } from "zod";

export const groupIdParamsSchema = z.object({
  id: z.string().min(1),
});

const splitInputSchema = z.object({
  userId: z.string().min(1),
  amount: z.number().optional(),
  percentage: z.number().optional(),
});

// Matches config/constants.ts EXPENSE_CATEGORIES — kept as a literal tuple for zod inference.
export const createExpenseBodySchema = z.object({
  description: z.string().min(1),
  amount: z.number().positive(),
  currency: z.string().optional(),
  category: z.enum(["food", "transport", "shopping", "entertainment", "utilities", "rent", "groceries", "other"]),
  paidBy: z.string().optional(),
  splitMethod: z.enum(["equal", "exact", "percentage"]),
  date: z.string().optional(),
  splits: z.array(splitInputSchema).optional(),
  receipt: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});
export type CreateExpenseBody = z.infer<typeof createExpenseBodySchema>;
