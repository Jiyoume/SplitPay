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

export function getGroupMemberIds(groupId: string): string[] {
  const rows = db.prepare("SELECT user_id FROM group_members WHERE group_id = ?").all(groupId) as {
    user_id: string;
  }[];
  return rows.map((r) => r.user_id);
}

export function getGroupExpenses(groupId: string): Expense[] {
  const expenseRows = db
    .prepare("SELECT * FROM expenses WHERE group_id = ? ORDER BY date DESC")
    .all(groupId) as ExpenseRow[];

  const splitRows = db
    .prepare(
      `SELECT es.* FROM expense_splits es
       JOIN expenses e ON e.id = es.expense_id
       WHERE e.group_id = ?`
    )
    .all(groupId) as SplitRow[];

  const splitsByExpense = new Map<string, SplitRow[]>();
  for (const s of splitRows) {
    const arr = splitsByExpense.get(s.expense_id) ?? [];
    arr.push(s);
    splitsByExpense.set(s.expense_id, arr);
  }

  return expenseRows.map((e) => ({
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
export function computeNettedBalances(groupId: string): Balance[] {
  const memberIds = getGroupMemberIds(groupId);
  const expenses = getGroupExpenses(groupId);
  const rawBalances = calculateBalances(expenses, memberIds);

  const settlementRows = db
    .prepare("SELECT from_user_id, to_user_id, amount, status FROM settlements WHERE group_id = ?")
    .all(groupId) as SettlementRow[];

  const settlementInputs: NettingSettlementInput[] = settlementRows.map((s) => ({
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

export function getGroupBalancesAndSuggestions(groupId: string): {
  balances: Balance[];
  suggestions: SettleSuggestion[];
} {
  const balances = computeNettedBalances(groupId);
  const rawSuggestions = simplifyDebts(balances);

  const memberIds = getGroupMemberIds(groupId);
  const nameRows =
    memberIds.length > 0
      ? (db
          .prepare(`SELECT id, name FROM users WHERE id IN (${memberIds.map(() => "?").join(",")})`)
          .all(...memberIds) as UserNameRow[])
      : [];
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
