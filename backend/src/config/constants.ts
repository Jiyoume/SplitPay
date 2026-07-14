/** Shared constants (ARCHITECTURE §7 config/constants.ts). */

export const NETWORK_PASSPHRASE = "Test SDF Network ; September 2015";

/** Demo peg: 1 unit of fiat == 1 XLM on testnet. NOT a real exchange rate. */
export const DEMO_PEG = 1;

export const GROUP_TYPES = ["family", "friends", "roommates", "trip", "other"] as const;
export type GroupType = (typeof GROUP_TYPES)[number];

export const SPLIT_METHODS = ["equal", "exact", "percentage"] as const;
export type SplitMethodType = (typeof SPLIT_METHODS)[number];

export const SETTLEMENT_STATUSES = ["pending", "submitting", "settled", "failed"] as const;
export type SettlementStatus = (typeof SETTLEMENT_STATUSES)[number];

export const ACTIVITY_TYPES = [
  "expense_added",
  "payment_made",
  "group_created",
  "member_added",
] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

/** Ported verbatim from ../src/constants/index.ts (EXPENSE_CATEGORIES ids only). */
export const EXPENSE_CATEGORIES = [
  "food",
  "transport",
  "shopping",
  "entertainment",
  "utilities",
  "rent",
  "groceries",
  "other",
] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];
