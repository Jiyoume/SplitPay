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
export async function insertActivity(params: {
  type: ActivityType;
  groupId: string;
  userId: string;
  description: string;
  amount?: number | null;
  date?: string;
}): Promise<void> {
  await db.query(
    `INSERT INTO activities (id, type, group_id, user_id, description, amount, date) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      newId(),
      params.type,
      params.groupId,
      params.userId,
      params.description,
      params.amount ?? null,
      params.date ?? new Date().toISOString(),
    ]
  );
}

export async function getGlobalActivity(userId: string, limit: number): Promise<{ activities: Activity[] }> {
  const { rows: groupRows } = await db.query("SELECT group_id FROM group_members WHERE user_id = $1", [
    userId,
  ]);
  const groupIds = groupRows.map((r) => r.group_id);

  if (groupIds.length === 0) {
    return { activities: [] };
  }

  const placeholders = groupIds.map((_, i) => `$${i + 1}`).join(",");
  const limitPlaceholder = `$${groupIds.length + 1}`;
  const { rows } = await db.query(
    `SELECT * FROM activities WHERE group_id IN (${placeholders}) ORDER BY date DESC LIMIT ${limitPlaceholder}`,
    [...groupIds, limit]
  );
  const activityRows = rows as ActivityRow[];

  return {
    activities: activityRows.map((r) => ({
      id: r.id,
      type: r.type,
      groupId: r.group_id,
      userId: r.user_id,
      description: r.description,
      amount: r.amount ? Number(r.amount) : null,
      date: r.date,
    })),
  };
}
