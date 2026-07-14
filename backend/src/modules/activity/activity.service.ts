import { db } from "../../db/index.js";
import { newId } from "../../utils/id.js";
import type { Activity, ActivityType } from "../../domain/types.js";

interface ActivityRow {
  id: string;
  type: ActivityType;
  group_id: string;
  user_id: string;
  description: string;
  amount: number | null;
  date: string;
}

/** Shared insert helper — used by groups/expenses/settlements services on their write paths. */
export function insertActivity(params: {
  type: ActivityType;
  groupId: string;
  userId: string;
  description: string;
  amount?: number | null;
  date?: string;
}): void {
  db.prepare(
    `INSERT INTO activities (id, type, group_id, user_id, description, amount, date) VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    newId(),
    params.type,
    params.groupId,
    params.userId,
    params.description,
    params.amount ?? null,
    params.date ?? new Date().toISOString()
  );
}

export function getGlobalActivity(userId: string, limit: number): { activities: Activity[] } {
  const groupRows = db
    .prepare("SELECT group_id FROM group_members WHERE user_id = ?")
    .all(userId) as { group_id: string }[];
  const groupIds = groupRows.map((r) => r.group_id);

  if (groupIds.length === 0) {
    return { activities: [] };
  }

  const placeholders = groupIds.map(() => "?").join(",");
  const rows = db
    .prepare(
      `SELECT * FROM activities WHERE group_id IN (${placeholders}) ORDER BY date DESC LIMIT ?`
    )
    .all(...groupIds, limit) as ActivityRow[];

  return {
    activities: rows.map((r) => ({
      id: r.id,
      type: r.type,
      groupId: r.group_id,
      userId: r.user_id,
      description: r.description,
      amount: r.amount,
      date: r.date,
    })),
  };
}
