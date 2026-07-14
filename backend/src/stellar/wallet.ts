/**
 * Custody flow: keypair generation, Friendbot funding, live balance read (ARCHITECTURE §5.2, §7).
 */

import { Keypair } from "@stellar/stellar-sdk";
import { env } from "../config/env.js";
import { server } from "./client.js";

export function generateKeypair(): Keypair {
  return Keypair.random();
}

/**
 * Funds a testnet account via Friendbot HTTP GET (RESEARCH §2). Returns true/false rather than
 * throwing so callers (register flow) can degrade gracefully to `funding_status:'unfunded'`.
 */
export async function fundWithFriendbot(publicKey: string): Promise<boolean> {
  try {
    const res = await fetch(`${env.FRIENDBOT_URL}?addr=${encodeURIComponent(publicKey)}`);
    return res.ok;
  } catch {
    return false;
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), ms);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

/**
 * Live native XLM balance, wrapped in a short timeout (§4.2 #3). On timeout OR any Horizon error
 * (incl. account not yet funded / not found), returns null rather than hanging or failing the
 * caller's request.
 */
export async function getXlmBalance(
  publicKey: string,
  timeoutMs: number = env.USER_BALANCE_FETCH_TIMEOUT_MS
): Promise<string | null> {
  try {
    const account = await withTimeout(server.loadAccount(publicKey), timeoutMs);
    const native = account.balances.find((b) => b.asset_type === "native");
    return native?.balance ?? null;
  } catch {
    return null;
  }
}
