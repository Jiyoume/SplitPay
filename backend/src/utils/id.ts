import { randomUUID } from "node:crypto";

/** Generates a new string UUID (v4) for primary keys — matches the frontend's string id fields. */
export function newId(): string {
  return randomUUID();
}
