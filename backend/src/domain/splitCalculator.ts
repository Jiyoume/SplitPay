/**
 * Ported verbatim from ../src/utils/splitCalculator.ts (ARCHITECTURE §8.5, DECISIONS §3.5).
 * Pure, no I/O. Parity with the frontend's rounding is intentional — DO NOT "fix" the rounding
 * (residual cents are deliberately not redistributed; see the note below).
 *
 * Known rounding behavior (documented per §8.5): equal splits round each share to cents, so for
 * amounts not divisible by member count the shares sum to <= (n-1) cents LESS than the total
 * (e.g. 100 / 3 -> 33.33 x 3 = 99.99). This matches the client's mental model and is intentional.
 */

import type { Split, Expense, Balance } from "./types.js";

export function calculateEqualSplit(amount: number, memberIds: string[]): Split[] {
  const splitAmount = Math.round((amount / memberIds.length) * 100) / 100;
  return memberIds.map((userId) => ({
    userId,
    amount: splitAmount,
    isPaid: false,
  }));
}

export function calculateBalances(expenses: Expense[], memberIds: string[]): Balance[] {
  const balanceMap: Record<string, { owes: Record<string, number>; isOwed: Record<string, number> }> = {};

  memberIds.forEach((id) => {
    balanceMap[id] = { owes: {}, isOwed: {} };
  });

  expenses.forEach((expense) => {
    const paidBy = expense.paidBy;
    expense.splits.forEach((split) => {
      if (split.userId !== paidBy) {
        // split.userId owes paidBy
        if (!balanceMap[split.userId]) return;
        balanceMap[split.userId].owes[paidBy] = (balanceMap[split.userId].owes[paidBy] || 0) + split.amount;
        balanceMap[paidBy].isOwed[split.userId] = (balanceMap[paidBy].isOwed[split.userId] || 0) + split.amount;
      }
    });
  });

  return memberIds.map((userId) => {
    const owes = Object.entries(balanceMap[userId].owes).map(([toUserId, amount]) => ({ toUserId, amount }));
    const isOwed = Object.entries(balanceMap[userId].isOwed).map(([fromUserId, amount]) => ({ fromUserId, amount }));
    const totalOwed = isOwed.reduce((sum, o) => sum + o.amount, 0);
    const totalOwes = owes.reduce((sum, o) => sum + o.amount, 0);

    return {
      userId,
      owes,
      isOwed,
      netBalance: totalOwed - totalOwes,
    };
  });
}

export function simplifyDebts(balances: Balance[]): { from: string; to: string; amount: number }[] {
  const netAmounts = balances.map((b) => ({ userId: b.userId, net: b.netBalance }));
  const debtors = netAmounts.filter((n) => n.net < 0).sort((a, b) => a.net - b.net);
  const creditors = netAmounts.filter((n) => n.net > 0).sort((a, b) => b.net - a.net);

  const transactions: { from: string; to: string; amount: number }[] = [];
  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const amount = Math.min(-debtors[i].net, creditors[j].net);
    transactions.push({ from: debtors[i].userId, to: creditors[j].userId, amount: Math.round(amount * 100) / 100 });
    debtors[i].net += amount;
    creditors[j].net -= amount;
    if (Math.abs(debtors[i].net) < 0.01) i++;
    if (Math.abs(creditors[j].net) < 0.01) j++;
  }

  return transactions;
}
