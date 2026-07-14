import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { db } from "./index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Applies schema.sql idempotently (CREATE TABLE/INDEX IF NOT EXISTS) on every boot. */
export function migrate(): void {
  const schemaPath = resolve(__dirname, "schema.sql");
  const schema = readFileSync(schemaPath, "utf-8");
  db.exec(schema);
}
