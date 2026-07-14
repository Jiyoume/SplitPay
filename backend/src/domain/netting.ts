/**
 * Settlement -> balance netting (ARCHITECTURE §5.7, ruling #8). Pure function, no I/O.
 *
 * For a SETTLED settlement of debtor D -> creditor C with fiat amount X:
 *   D.owes[C]    -= X
 *   C.isOwed[D]  -= X
 *   D.netBalance += X
 *   C.netBalance -= X
 * After applying all settlements, any owes/isOwed pair entry whose |amount| < 0.01 is dropped
 * (epsilon match with splitCalculator's simplifyDebts). Only `settled` settlements net — never
 * `pending`/`submitting`/`failed`.
 */

import type { Balance } from "./types.js";

const EPSILON = 0.01;

export interface NettingSettlementInput {
  fromUserId: string;
  toUserId: string;
  amount: number;
  status: "pending" | "submitting" | "settled" | "failed";
}

export function applySettlements(balances: Balance[], settlements: NettingSettlementInput[]): Balance[] {
  // Deep clone so the input is never mutated.
  const byUser = new Map<string, Balance>(
    balances.map((b) => [
      b.userId,
      {
        userId: b.userId,
        owes: b.owes.map((o) => ({ ...o })),
        isOwed: b.isOwed.map((o) => ({ ...o })),
        netBalance: b.netBalance,
      },
    ])
  );

  for (const s of settlements) {
    if (s.status !== "settled") continue;

    const debtor = byUser.get(s.fromUserId);
    const creditor = byUser.get(s.toUserId);
    if (!debtor || !creditor) continue;

    const oweEntry = debtor.owes.find((o) => o.toUserId === s.toUserId);
    if (oweEntry) oweEntry.amount -= s.amount;

    const isOwedEntry = creditor.isOwed.find((o) => o.fromUserId === s.fromUserId);
    if (isOwedEntry) isOwedEntry.amount -= s.amount;

    debtor.netBalance += s.amount;
    creditor.netBalance -= s.amount;
  }

  // Drop any owes/isOwed pair entry below epsilon, and clean up near-zero net balances.
  for (const balance of byUser.values()) {
    balance.owes = balance.owes.filter((o) => Math.abs(o.amount) >= EPSILON);
    balance.isOwed = balance.isOwed.filter((o) => Math.abs(o.amount) >= EPSILON);
    if (Math.abs(balance.netBalance) < EPSILON) balance.netBalance = 0;
  }

  return balances.map((b) => byUser.get(b.userId)!);
}
