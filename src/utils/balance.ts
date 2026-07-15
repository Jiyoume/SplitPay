import { Expense, Payment, User } from '../models/types';

export interface MemberBalance {
  userId: string;
  name: string;
  balance: number;
}

export function calculateGroupBalances(
  members: User[],
  expenses: Expense[],
  payments: Payment[]
): MemberBalance[] {
  const balances: Record<string, number> = {};

  // Initialize all members with a zero balance
  members.forEach((m) => {
    balances[m.id] = 0;
  });

  // Process all expenses:
  // - Creditor gets amount added to balance
  // - Debtors get split amounts subtracted from balance
  expenses.forEach((exp) => {
    if (balances[exp.paidBy] !== undefined) {
      balances[exp.paidBy] += exp.amount;
    }
    if (exp.splits) {
      exp.splits.forEach((split) => {
        if (balances[split.userId] !== undefined) {
          balances[split.userId] -= split.amount;
        }
      });
    }
  });

  // Process all payment settlements:
  // - Sender gets amount added (paying off debt)
  // - Receiver gets amount subtracted (received money)
  payments.forEach((pay) => {
    if (balances[pay.fromUserId] !== undefined) {
      balances[pay.fromUserId] += pay.amount;
    }
    if (balances[pay.toUserId] !== undefined) {
      balances[pay.toUserId] -= pay.amount;
    }
  });

  return members.map((m) => ({
    userId: m.id,
    name: m.name,
    balance: balances[m.id] || 0,
  }));
}
