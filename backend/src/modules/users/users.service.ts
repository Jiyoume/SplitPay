import { db } from "../../db/index.js";
import { AppError } from "../../utils/errors.js";
import { fundWithFriendbot, getXlmBalance } from "../../stellar/wallet.js";
import { computeNettedBalances } from "../balances/balances.service.js";
import type { Activity } from "../../domain/types.js";

interface UserRow {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  phone: string | null;
}

interface WalletRow {
  id: string;
  user_id: string;
  public_key: string;
  encrypted_secret: string;
  funding_status: "funded" | "unfunded";
}

function getUserRow(userId: string): UserRow {
  const row = db
    .prepare("SELECT id, name, email, avatar, phone FROM users WHERE id = ?")
    .get(userId) as UserRow | undefined;
  if (!row) throw new AppError("NOT_FOUND", "User not found");
  return row;
}

export function getWalletRow(userId: string): WalletRow {
  const row = db.prepare("SELECT * FROM wallets WHERE user_id = ?").get(userId) as WalletRow | undefined;
  if (!row) throw new AppError("NOT_FOUND", "Wallet not found");
  return row;
}

export async function getMe(userId: string) {
  const user = getUserRow(userId);
  const wallet = getWalletRow(userId);
  const xlmBalance = await getXlmBalance(wallet.public_key);

  return {
    user: { id: user.id, name: user.name, email: user.email, phone: user.phone, avatar: user.avatar },
    wallet: { publicKey: wallet.public_key, fundingStatus: wallet.funding_status, xlmBalance },
  };
}

export async function fundMyWallet(userId: string) {
  const wallet = getWalletRow(userId);

  if (wallet.funding_status === "funded") {
    const xlmBalance = await getXlmBalance(wallet.public_key);
    return { wallet: { publicKey: wallet.public_key, fundingStatus: "funded" as const, xlmBalance } };
  }

  const ok = await fundWithFriendbot(wallet.public_key);
  if (!ok) {
    throw new AppError("FRIENDBOT_FAILED", "Friendbot funding failed — safe to retry");
  }

  db.prepare("UPDATE wallets SET funding_status = 'funded' WHERE user_id = ?").run(userId);
  const xlmBalance = await getXlmBalance(wallet.public_key);
  return { wallet: { publicKey: wallet.public_key, fundingStatus: "funded" as const, xlmBalance } };
}

interface ActivityRow {
  id: string;
  type: Activity["type"];
  group_id: string;
  user_id: string;
  description: string;
  amount: number | null;
  date: string;
}

export function getMySummary(userId: string) {
  const groupRows = db
    .prepare("SELECT group_id FROM group_members WHERE user_id = ?")
    .all(userId) as { group_id: string }[];
  const groupIds = groupRows.map((r) => r.group_id);

  let youOwe = 0;
  let youAreOwed = 0;

  for (const groupId of groupIds) {
    const balances = computeNettedBalances(groupId);
    const mine = balances.find((b) => b.userId === userId);
    if (!mine) continue;
    youOwe += mine.owes.reduce((sum, o) => sum + o.amount, 0);
    youAreOwed += mine.isOwed.reduce((sum, o) => sum + o.amount, 0);
  }

  const netBalance = Math.round((youAreOwed - youOwe) * 100) / 100;

  let recentActivity: Activity[] = [];
  if (groupIds.length > 0) {
    const placeholders = groupIds.map(() => "?").join(",");
    const rows = db
      .prepare(
        `SELECT * FROM activities WHERE group_id IN (${placeholders}) ORDER BY date DESC LIMIT 5`
      )
      .all(...groupIds) as ActivityRow[];
    recentActivity = rows.map((r) => ({
      id: r.id,
      type: r.type,
      groupId: r.group_id,
      userId: r.user_id,
      description: r.description,
      amount: r.amount,
      date: r.date,
    }));
  }

  return {
    netBalance,
    youOwe: Math.round(youOwe * 100) / 100,
    youAreOwed: Math.round(youAreOwed * 100) / 100,
    recentActivity,
  };
}
