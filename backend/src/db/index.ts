import pg from "pg";
import { env } from "../config/env.js";

const { Pool } = pg;

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined,
});

export const db = {
  async query(text: string, params?: any[]) {
    return pool.query(text, params);
  },
  async getClient() {
    return pool.connect();
  }
};
