import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { env } from "../config/env.js";

const dbPath = resolve(process.cwd(), env.DATABASE_PATH);
mkdirSync(dirname(dbPath), { recursive: true });

export const db = new Database(dbPath);

// PRAGMAs on every connection (ARCHITECTURE §3 conventions).
db.pragma("foreign_keys = ON");
db.pragma("journal_mode = WAL");
