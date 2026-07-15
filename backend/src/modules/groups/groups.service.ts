import { db } from "../../db/index.js";
import { AppError } from "../../utils/errors.js";
import { newId } from "../../utils/id.js";
import { computeNettedBalances, getGroupBalancesAndSuggestions } from "../balances/balances.service.js";
import type { CreateGroupBody } from "./groups.schemas.js";
import type { GroupType } from "../../config/constants.js";

interface GroupRow {
  id: string;
  name: string;
  description: string | null;
  type: GroupType;
  created_by: string;
  created_at: string;
}

interface UserRow {
  id: string;
  name: string;
  email: string;
}

async function getGroupRow(groupId: string): Promise<GroupRow> {
  const { rows } = await db.query("SELECT * FROM groups WHERE id = $1", [groupId]);
  const row = rows[0] as GroupRow | undefined;
  if (!row) throw new AppError("NOT_FOUND", "Group not found");
  return row;
}

async function getGroupTotalExpenses(groupId: string): Promise<number> {
  const { rows } = await db.query(
    "SELECT COALESCE(SUM(amount), 0) AS total FROM expenses WHERE group_id = $1",
    [groupId]
  );
  return Number(rows[0].total);
}

async function getGroupMembers(groupId: string): Promise<UserRow[]> {
  const { rows } = await db.query(
    `SELECT u.id, u.name, u.email FROM users u
     JOIN group_members gm ON gm.user_id = u.id
     WHERE gm.group_id = $1`,
    [groupId]
  );
  return rows as UserRow[];
}

export async function listMyGroups(userId: string) {
  const { rows } = await db.query(
    `SELECT g.* FROM groups g
     JOIN group_members gm ON gm.group_id = g.id
     WHERE gm.user_id = $1`,
    [userId]
  );
  const groupRows = rows as GroupRow[];

  const groups = await Promise.all(
    groupRows.map(async (g) => {
      const { rows: memberCountRow } = await db.query(
        "SELECT COUNT(*) AS c FROM group_members WHERE group_id = $1",
        [g.id]
      );
      const totalExpenses = await getGroupTotalExpenses(g.id);

      const balances = await computeNettedBalances(g.id);
      const mine = balances.find((b) => b.userId === userId);
      const balance = mine ? mine.netBalance : 0;

      const { rows: lastActivityRow } = await db.query(
        "SELECT MAX(date) AS last FROM activities WHERE group_id = $1",
        [g.id]
      );
      const lastActivity = lastActivityRow[0].last ?? g.created_at;

      return {
        id: g.id,
        name: g.name,
        description: g.description,
        type: g.type,
        createdBy: g.created_by,
        createdAt: g.created_at,
        memberCount: Number(memberCountRow[0].c),
        totalExpenses,
        balance,
        lastActivity,
      };
    })
  );

  return { groups };
}

export async function createGroup(userId: string, body: CreateGroupBody) {
  const { rows: callerRows } = await db.query("SELECT email FROM users WHERE id = $1", [userId]);
  const callerRow = callerRows[0] as { email: string };

  const requestedEmails = Array.from(new Set((body.memberEmails ?? []).map((e) => e.toLowerCase()))).filter(
    (e) => e !== callerRow.email.toLowerCase()
  );

  let resolvedMembers: UserRow[] = [];
  if (requestedEmails.length > 0) {
    const placeholders = requestedEmails.map((_, i) => `$${i + 1}`).join(",");
    const { rows } = await db.query(
      `SELECT id, name, email FROM users WHERE email IN (${placeholders})`,
      requestedEmails
    );
    resolvedMembers = rows as UserRow[];

    const resolvedEmails = new Set(resolvedMembers.map((m) => m.email.toLowerCase()));
    const unknownEmails = requestedEmails.filter((e) => !resolvedEmails.has(e));
    if (unknownEmails.length > 0) {
      throw new AppError("MEMBERS_NOT_FOUND", "One or more member emails are not registered users", {
        unknownEmails,
      });
    }
  }

  const groupId = newId();
  const now = new Date().toISOString();

  const client = await db.getClient();
  try {
    await client.query("BEGIN");
    await client.query(
      `INSERT INTO groups (id, name, description, type, created_by, created_at) VALUES ($1, $2, $3, $4, $5, $6)`,
      [groupId, body.name, body.description ?? null, body.type, userId, now]
    );
    await client.query(
      `INSERT INTO group_members (group_id, user_id, joined_at) VALUES ($1, $2, $3)`,
      [groupId, userId, now]
    );
    await client.query(
      `INSERT INTO activities (id, type, group_id, user_id, description, amount, date) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [newId(), "group_created", groupId, userId, `created "${body.name}"`, null, now]
    );

    for (const member of resolvedMembers) {
      await client.query(
        `INSERT INTO group_members (group_id, user_id, joined_at) VALUES ($1, $2, $3)`,
        [groupId, member.id, now]
      );
      await client.query(
        `INSERT INTO activities (id, type, group_id, user_id, description, amount, date) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [newId(), "member_added", groupId, userId, `added ${member.name} to the group`, null, now]
      );
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  const members = await getGroupMembers(groupId);

  return {
    group: {
      id: groupId,
      name: body.name,
      description: body.description ?? null,
      type: body.type,
      createdBy: userId,
      createdAt: now,
      totalExpenses: 0,
      members,
    },
  };
}

export async function getGroupDetail(groupId: string) {
  const group = await getGroupRow(groupId);
  const members = await getGroupMembers(groupId);
  const totalExpenses = await getGroupTotalExpenses(groupId);
  const { balances } = await getGroupBalancesAndSuggestions(groupId);

  return {
    group: {
      id: group.id,
      name: group.name,
      description: group.description,
      type: group.type,
      createdBy: group.created_by,
      createdAt: group.created_at,
      totalExpenses,
      members,
    },
    balances,
  };
}
