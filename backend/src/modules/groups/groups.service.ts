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

function getGroupRow(groupId: string): GroupRow {
  const row = db.prepare("SELECT * FROM groups WHERE id = ?").get(groupId) as GroupRow | undefined;
  if (!row) throw new AppError("NOT_FOUND", "Group not found");
  return row;
}

function getGroupTotalExpenses(groupId: string): number {
  const row = db
    .prepare("SELECT COALESCE(SUM(amount), 0) AS total FROM expenses WHERE group_id = ?")
    .get(groupId) as { total: number };
  return row.total;
}

function getGroupMembers(groupId: string): UserRow[] {
  return db
    .prepare(
      `SELECT u.id, u.name, u.email FROM users u
       JOIN group_members gm ON gm.user_id = u.id
       WHERE gm.group_id = ?`
    )
    .all(groupId) as UserRow[];
}

export function listMyGroups(userId: string) {
  const rows = db
    .prepare(
      `SELECT g.* FROM groups g
       JOIN group_members gm ON gm.group_id = g.id
       WHERE gm.user_id = ?`
    )
    .all(userId) as GroupRow[];

  const groups = rows.map((g) => {
    const memberCountRow = db
      .prepare("SELECT COUNT(*) AS c FROM group_members WHERE group_id = ?")
      .get(g.id) as { c: number };
    const totalExpenses = getGroupTotalExpenses(g.id);

    const balances = computeNettedBalances(g.id);
    const mine = balances.find((b) => b.userId === userId);
    const balance = mine ? mine.netBalance : 0;

    const lastActivityRow = db
      .prepare("SELECT MAX(date) AS last FROM activities WHERE group_id = ?")
      .get(g.id) as { last: string | null };
    const lastActivity = lastActivityRow.last ?? g.created_at;

    return {
      id: g.id,
      name: g.name,
      description: g.description,
      type: g.type,
      createdBy: g.created_by,
      createdAt: g.created_at,
      memberCount: memberCountRow.c,
      totalExpenses,
      balance,
      lastActivity,
    };
  });

  return { groups };
}

export function createGroup(userId: string, body: CreateGroupBody) {
  const callerRow = db.prepare("SELECT email FROM users WHERE id = ?").get(userId) as { email: string };

  const requestedEmails = Array.from(new Set((body.memberEmails ?? []).map((e) => e.toLowerCase()))).filter(
    (e) => e !== callerRow.email.toLowerCase()
  );

  let resolvedMembers: UserRow[] = [];
  if (requestedEmails.length > 0) {
    const placeholders = requestedEmails.map(() => "?").join(",");
    resolvedMembers = db
      .prepare(`SELECT id, name, email FROM users WHERE email IN (${placeholders})`)
      .all(...requestedEmails) as UserRow[];

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

  const insertGroup = db.prepare(
    `INSERT INTO groups (id, name, description, type, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?)`
  );
  const insertMember = db.prepare(
    `INSERT INTO group_members (group_id, user_id, joined_at) VALUES (?, ?, ?)`
  );
  const insertActivity = db.prepare(
    `INSERT INTO activities (id, type, group_id, user_id, description, amount, date) VALUES (?, ?, ?, ?, ?, ?, ?)`
  );

  const tx = db.transaction(() => {
    insertGroup.run(groupId, body.name, body.description ?? null, body.type, userId, now);
    insertMember.run(groupId, userId, now);
    insertActivity.run(newId(), "group_created", groupId, userId, `created "${body.name}"`, null, now);

    for (const member of resolvedMembers) {
      insertMember.run(groupId, member.id, now);
      insertActivity.run(
        newId(),
        "member_added",
        groupId,
        userId,
        `added ${member.name} to the group`,
        null,
        now
      );
    }
  });
  tx();

  const members = getGroupMembers(groupId);

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

export function getGroupDetail(groupId: string) {
  const group = getGroupRow(groupId);
  const members = getGroupMembers(groupId);
  const totalExpenses = getGroupTotalExpenses(groupId);
  const { balances } = getGroupBalancesAndSuggestions(groupId);

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
