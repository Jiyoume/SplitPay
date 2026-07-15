import { db } from "../../db/index.js";
import { calculateBalances, simplifyDebts } from "../../domain/splitCalculator.js";
import { applySettlements, type NettingSettlementInput } from "../../domain/netting.js";
import { toStellarAmount, CONVERSION_NOTE } from "../../stellar/conversion.js";
import type { Balance, Expense, SettleSuggestion } from "../../domain/types.js";

interface ExpenseRow {
  id: string;
  group_id: string;
  description: string;
  amount: number;
  currency: string;
  category: string;
  paid_by: string;
  split_method: "equal" | "exact" | "percentage";
  date: string;
  created_at: string;
  receipt: string | null;
  notes: string | null;
}

interface SplitRow {
  id: string;
  expense_id: string;
  user_id: string;
  amount: number;
  is_paid: number;
}

interface SettlementRow {
  from_user_id: string;
  to_user_id: string;
  amount: number;
  status: "pending" | "submitting" | "settled" | "failed";
}

export async function getGroupMemberIds(groupId: string): Promise<string[]> {
  const { rows } = await db.query("SELECT user_id FROM group_members WHERE group_id = $1", [groupId]);
  return rows.map((r) => r.user_id);
}

export async function getGroupExpenses(groupId: string): Promise<Expense[]> {
  const { rows: expenseRows } = await db.query(
    "SELECT * FROM expenses WHERE group_id = $1 ORDER BY date DESC",
    [groupId]
  );

  const { rows: splitRows } = await db.query(
    `SELECT es.* FROM expense_splits es
     JOIN expenses e ON e.id = es.expense_id
     WHERE e.group_id = $1`,
    [groupId]
  );

  const splitsByExpense = new Map<string, SplitRow[]>();
  for (const s of splitRows as SplitRow[]) {
    const arr = splitsByExpense.get(s.expense_id) ?? [];
    arr.push(s);
    splitsByExpense.set(s.expense_id, arr);
  }

  return (expenseRows as ExpenseRow[]).map((e) => ({
    id: e.id,
    groupId: e.group_id,
    description: e.description,
    amount: e.amount,
    currency: e.currency,
    category: e.category,
    paidBy: e.paid_by,
    splitMethod: e.split_method,
    date: e.date,
    createdAt: e.created_at,
    receipt: e.receipt,
    notes: e.notes,
    splits: (splitsByExpense.get(e.id) ?? []).map((s) => ({
      userId: s.user_id,
      amount: s.amount,
      isPaid: Boolean(s.is_paid),
    })),
  }));
}

/**
 * Balances = calculateBalances(expenses, memberIds) (raw) THEN each settled settlement is
 * applied via applySettlements (ARCHITECTURE §5.7). This is the single source of truth used by
 * #6 GET /groups, #8 GET /groups/:id, #11 GET /groups/:id/balances, and #4 GET /users/me/summary.
 */
export async function computeNettedBalances(groupId: string): Promise<Balance[]> {
  const memberIds = await getGroupMemberIds(groupId);
  const expenses = await getGroupExpenses(groupId);
  const rawBalances = calculateBalances(expenses, memberIds);

  const { rows: settlementRows } = await db.query(
    "SELECT from_user_id, to_user_id, amount, status FROM settlements WHERE group_id = $1",
    [groupId]
  );

  const settlementInputs: NettingSettlementInput[] = (settlementRows as SettlementRow[]).map((s) => ({
    fromUserId: s.from_user_id,
    toUserId: s.to_user_id,
    amount: s.amount,
    status: s.status,
  }));

  return applySettlements(rawBalances, settlementInputs);
}

interface UserNameRow {
  id: string;
  name: string;
}

export async function getGroupBalancesAndSuggestions(groupId: string): Promise<{
  balances: Balance[];
  suggestions: SettleSuggestion[];
}> {
  const balances = await computeNettedBalances(groupId);
  const rawSuggestions = simplifyDebts(balances);

  const memberIds = await getGroupMemberIds(groupId);
  let nameRows: UserNameRow[] = [];
  if (memberIds.length > 0) {
    const placeholders = memberIds.map((_, i) => `$${i + 1}`).join(",");
    const { rows } = await db.query(
      `SELECT id, name FROM users WHERE id IN (${placeholders})`,
      memberIds
    );
    nameRows = rows as UserNameRow[];
  }
  const nameById = new Map(nameRows.map((r) => [r.id, r.name]));

  const suggestions: SettleSuggestion[] = rawSuggestions.map((s) => ({
    fromUserId: s.from,
    fromName: nameById.get(s.from) ?? "Unknown",
    toUserId: s.to,
    toName: nameById.get(s.to) ?? "Unknown",
    amount: s.amount,
    xlmAmount: toStellarAmount(s.amount),
    currency: "USD",
    conversionNote: CONVERSION_NOTE("USD"),
  }));

  return { balances, suggestions };
}
