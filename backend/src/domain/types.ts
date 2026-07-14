/**
 * Shared TS types, mirroring ../src/models/types.ts (the RN frontend contract) plus the
 * backend-only `Settlement` superset (ARCHITECTURE §3.7, §7 domain/types.ts).
 * Dates are ISO-8601 strings here (not `Date`) since these are wire/API shapes.
 */

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string | null;
  phone?: string | null;
}

export type GroupType = "family" | "friends" | "roommates" | "trip" | "other";

export interface Group {
  id: string;
  name: string;
  description?: string | null;
  members: User[];
  createdBy: string;
  createdAt: string;
  type: GroupType;
  totalExpenses: number;
}

export interface Split {
  userId: string;
  amount: number;
  isPaid: boolean;
}

export type SplitMethod = "equal" | "exact" | "percentage";

export interface Expense {
  id: string;
  groupId: string;
  description: string;
  amount: number;
  currency: string;
  category: string;
  paidBy: string;
  splits: Split[];
  splitMethod: SplitMethod;
  date: string;
  createdAt: string;
  receipt?: string | null;
  notes?: string | null;
}

/** Frontend-compatible Payment shape (Settlement is the backend superset — see below). */
export interface Payment {
  id: string;
  groupId: string;
  fromUserId: string;
  toUserId: string;
  amount: number;
  date: string;
  note?: string | null;
  settled: boolean;
}

export interface Balance {
  userId: string;
  owes: { toUserId: string; amount: number }[];
  isOwed: { fromUserId: string; amount: number }[];
  netBalance: number;
}

export type ActivityType = "expense_added" | "payment_made" | "group_created" | "member_added";

export interface Activity {
  id: string;
  type: ActivityType;
  groupId: string;
  userId: string;
  description: string;
  amount?: number | null;
  date: string;
}

export type SettlementStatus = "pending" | "submitting" | "settled" | "failed";

/** Authoritative on-chain settle-up record — a superset of `Payment` (ARCHITECTURE §3.7). */
export interface Settlement {
  id: string;
  groupId: string;
  fromUserId: string;
  toUserId: string;
  amount: number;
  currency: string;
  xlmAmount: string;
  status: SettlementStatus;
  settled: boolean;
  txHash: string | null;
  explorerUrl: string | null;
  note?: string | null;
  date: string;
  createdAt: string;
  updatedAt: string;
  settledAt: string | null;
  conversionNote: string;
}

export interface SettleSuggestion {
  fromUserId: string;
  fromName: string;
  toUserId: string;
  toName: string;
  amount: number;
  xlmAmount: string;
  currency: string;
  conversionNote: string;
}
