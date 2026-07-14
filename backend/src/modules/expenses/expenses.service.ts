import { db } from "../../db/index.js";
import { AppError } from "../../utils/errors.js";
import { newId } from "../../utils/id.js";
import { calculateEqualSplit } from "../../domain/splitCalculator.js";
import { getGroupExpenses, getGroupMemberIds } from "../balances/balances.service.js";
import type { CreateExpenseBody } from "./expenses.schemas.js";
import type { Split } from "../../domain/types.js";

const EPSILON = 0.01;

export function listGroupExpenses(groupId: string) {
  return { expenses: getGroupExpenses(groupId) };
}

function computeSplits(body: CreateExpenseBody, memberIds: string[]): Split[] {
  if (body.splitMethod === "equal") {
    return calculateEqualSplit(body.amount, memberIds);
  }

  if (body.splitMethod === "exact") {
    const splits = body.splits ?? [];
    if (splits.length === 0) {
      throw new AppError("VALIDATION_ERROR", "exact split requires a non-empty splits array", {
        reason: "splits_required",
      });
    }
    const unknownUsers = splits.filter((s) => !memberIds.includes(s.userId)).map((s) => s.userId);
    if (unknownUsers.length > 0) {
      throw new AppError("MEMBERS_NOT_FOUND", "One or more split users are not group members", {
        unknownUserIds: unknownUsers,
      });
    }
    const missingAmount = splits.some((s) => typeof s.amount !== "number");
    if (missingAmount) {
      throw new AppError("VALIDATION_ERROR", "exact split requires an amount for every entry", {
        reason: "amount_required",
      });
    }
    const sum = splits.reduce((acc, s) => acc + (s.amount ?? 0), 0);
    if (Math.abs(sum - body.amount) > EPSILON) {
      throw new AppError("VALIDATION_ERROR", "exact split amounts must sum to the expense amount", {
        reason: "sum_mismatch",
        expected: body.amount,
        actual: sum,
      });
    }
    return splits.map((s) => ({ userId: s.userId, amount: s.amount as number, isPaid: false }));
  }

  // percentage
  const splits = body.splits ?? [];
  if (splits.length === 0) {
    throw new AppError("VALIDATION_ERROR", "percentage split requires a non-empty splits array", {
      reason: "splits_required",
    });
  }
  const unknownUsers = splits.filter((s) => !memberIds.includes(s.userId)).map((s) => s.userId);
  if (unknownUsers.length > 0) {
    throw new AppError("MEMBERS_NOT_FOUND", "One or more split users are not group members", {
      unknownUserIds: unknownUsers,
    });
  }
  const missingPct = splits.some((s) => typeof s.percentage !== "number");
  if (missingPct) {
    throw new AppError("VALIDATION_ERROR", "percentage split requires a percentage for every entry", {
      reason: "percentage_required",
    });
  }
  const pctSum = splits.reduce((acc, s) => acc + (s.percentage ?? 0), 0);
  if (Math.abs(pctSum - 100) > EPSILON) {
    throw new AppError("VALIDATION_ERROR", "percentages must sum to 100", {
      reason: "percentage_sum_mismatch",
      actual: pctSum,
    });
  }
  return splits.map((s) => ({
    userId: s.userId,
    amount: Math.round(body.amount * (s.percentage as number) / 100 * 100) / 100,
    isPaid: false,
  }));
}

export function addExpense(groupId: string, callerId: string, body: CreateExpenseBody) {
  const memberIds = getGroupMemberIds(groupId);
  const paidBy = body.paidBy ?? callerId;

  if (!memberIds.includes(paidBy)) {
    throw new AppError("MEMBERS_NOT_FOUND", "paidBy user is not a member of this group", {
      unknownUserIds: [paidBy],
    });
  }

  const splits = computeSplits(body, memberIds);

  const expenseId = newId();
  const now = new Date().toISOString();
  const date = body.date ?? now;
  const currency = body.currency ?? "USD";

  const insertExpense = db.prepare(
    `INSERT INTO expenses (id, group_id, description, amount, currency, category, paid_by, split_method, date, created_at, receipt, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const insertSplit = db.prepare(
    `INSERT INTO expense_splits (id, expense_id, user_id, amount, is_paid) VALUES (?, ?, ?, ?, ?)`
  );
  const insertActivity = db.prepare(
    `INSERT INTO activities (id, type, group_id, user_id, description, amount, date) VALUES (?, ?, ?, ?, ?, ?, ?)`
  );

  const tx = db.transaction(() => {
    insertExpense.run(
      expenseId,
      groupId,
      body.description,
      body.amount,
      currency,
      body.category,
      paidBy,
      body.splitMethod,
      date,
      now,
      body.receipt ?? null,
      body.notes ?? null
    );
    for (const split of splits) {
      insertSplit.run(newId(), expenseId, split.userId, split.amount, 0);
    }
    insertActivity.run(
      newId(),
      "expense_added",
      groupId,
      callerId,
      `added "${body.description}"`,
      body.amount,
      now
    );
  });
  tx();

  return {
    expense: {
      id: expenseId,
      groupId,
      description: body.description,
      amount: body.amount,
      currency,
      category: body.category,
      paidBy,
      splits,
      splitMethod: body.splitMethod,
      date,
      createdAt: now,
      receipt: body.receipt ?? null,
      notes: body.notes ?? null,
    },
  };
}
