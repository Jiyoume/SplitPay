import type { FastifyReply, FastifyRequest } from "fastify";
import { db } from "../db/index.js";
import { AppError } from "../utils/errors.js";

/**
 * Membership guard (ARCHITECTURE §4.0): every `/groups/:id/**` route requires the caller to be a
 * member of `:id`. Non-member → 403 FORBIDDEN; unknown group → 404 NOT_FOUND.
 * Must run after `authenticate` (needs `request.user`).
 */
export async function requireMember(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
  const { id: groupId } = request.params as { id: string };

  const { rows: groupRows } = await db.query("SELECT id FROM groups WHERE id = $1", [groupId]);
  const group = groupRows[0];
  if (!group) {
    throw new AppError("NOT_FOUND", "Group not found");
  }

  const { rows: membershipRows } = await db.query(
    "SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2",
    [groupId, request.user!.id]
  );
  const membership = membershipRows[0];
  if (!membership) {
    throw new AppError("FORBIDDEN", "You are not a member of this group");
  }
}
