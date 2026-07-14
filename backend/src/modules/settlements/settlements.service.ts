import { db } from "../../db/index.js";
import { AppError } from "../../utils/errors.js";
import { newId } from "../../utils/id.js";
import { env } from "../../config/env.js";
import { CONVERSION_NOTE, toStellarAmount } from "../../stellar/conversion.js";
import { decryptSecret } from "../../stellar/crypto.js";
import { buildSignSubmitPayment, reconcileTransaction } from "../../stellar/payment.js";
import { getWalletRow } from "../users/users.service.js";
import { insertActivity } from "../activity/activity.service.js";
import type { CreateSettlementBody } from "./settlements.schemas.js";
import type { Settlement, SettlementStatus } from "../../domain/types.js";

interface SettlementRow {
  id: string;
  group_id: string;
  from_user_id: string;
  to_user_id: string;
  amount: number;
  currency: string;
  xlm_amount: string;
  status: SettlementStatus;
  tx_hash: string | null;
  source_public_key: string;
  dest_public_key: string;
  note: string | null;
  failure_code: string | null;
  failure_message: string | null;
  created_at: string;
  updated_at: string;
  settled_at: string | null;
}

function mapRow(row: SettlementRow): Settlement {
  return {
    id: row.id,
    groupId: row.group_id,
    fromUserId: row.from_user_id,
    toUserId: row.to_user_id,
    amount: row.amount,
    currency: row.currency,
    xlmAmount: row.xlm_amount,
    status: row.status,
    settled: row.status === "settled",
    txHash: row.tx_hash,
    explorerUrl: row.tx_hash ? `https://stellar.expert/explorer/testnet/tx/${row.tx_hash}` : null,
    note: row.note,
    date: row.created_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    settledAt: row.settled_at,
    conversionNote: CONVERSION_NOTE(row.currency),
  };
}

function getSettlementRow(id: string): SettlementRow | undefined {
  return db.prepare("SELECT * FROM settlements WHERE id = ?").get(id) as SettlementRow | undefined;
}

function isGroupMember(groupId: string, userId: string): boolean {
  return Boolean(
    db.prepare("SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ?").get(groupId, userId)
  );
}

/**
 * Best-effort bookkeeping: mark the debtor's expense_splits (for expenses paid by the creditor,
 * in this group) as paid, up to the full settled amount. This does NOT affect balance
 * calculations (those are driven by domain/netting.ts on the settlements table) — it is
 * additive UI bookkeeping only. See DEVIATIONS.md for the exact interpretation call.
 */
function markSplitsPaidBestEffort(groupId: string, fromUserId: string, toUserId: string): void {
  db.prepare(
    `UPDATE expense_splits SET is_paid = 1
     WHERE user_id = ? AND is_paid = 0
       AND expense_id IN (SELECT id FROM expenses WHERE group_id = ? AND paid_by = ?)`
  ).run(fromUserId, groupId, toUserId);
}

/** Idempotency: check-before-insert on (group_id, from_user_id, to_user_id) in-flight only (§5.5). */
function checkInFlightOrInsertPending(params: {
  groupId: string;
  fromUserId: string;
  toUserId: string;
  amount: number;
  currency: string;
  xlmAmount: string;
  sourcePublicKey: string;
  destPublicKey: string;
  note: string | null;
}): { conflict: SettlementRow | null; id: string; now: string } {
  const id = newId();
  const now = new Date().toISOString();

  const tx = db.transaction(() => {
    const existing = db
      .prepare(
        `SELECT * FROM settlements
         WHERE group_id = ? AND from_user_id = ? AND to_user_id = ? AND status IN ('pending','submitting')
         LIMIT 1`
      )
      .get(params.groupId, params.fromUserId, params.toUserId) as SettlementRow | undefined;

    if (existing) {
      return { conflict: existing };
    }

    db.prepare(
      `INSERT INTO settlements
         (id, group_id, from_user_id, to_user_id, amount, currency, xlm_amount, status,
          tx_hash, source_public_key, dest_public_key, note, failure_code, failure_message,
          created_at, updated_at, settled_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', NULL, ?, ?, ?, NULL, NULL, ?, ?, NULL)`
    ).run(
      id,
      params.groupId,
      params.fromUserId,
      params.toUserId,
      params.amount,
      params.currency,
      params.xlmAmount,
      params.sourcePublicKey,
      params.destPublicKey,
      params.note,
      now,
      now
    );

    return { conflict: null };
  });

  const result = tx();
  return { conflict: result.conflict, id, now };
}

function markFailed(id: string, failureCode: string, failureMessage: string): void {
  db.prepare(
    `UPDATE settlements SET status = 'failed', failure_code = ?, failure_message = ?, updated_at = ? WHERE id = ?`
  ).run(failureCode, failureMessage, new Date().toISOString(), id);
}

export async function createSettlement(
  groupId: string,
  callerId: string,
  body: CreateSettlementBody
): Promise<{ status: 201 | 202; settlement: Settlement }> {
  if (body.fromUserId !== callerId) {
    throw new AppError("FORBIDDEN", "Only the debtor can initiate their own settle-up");
  }
  if (body.toUserId === body.fromUserId) {
    throw new AppError("VALIDATION_ERROR", "toUserId must differ from fromUserId");
  }
  if (!isGroupMember(groupId, body.toUserId)) {
    throw new AppError("NOT_FOUND", "Creditor is not a member of this group");
  }

  const currency = body.currency ?? "USD";
  const xlmAmount = toStellarAmount(body.amount);

  const debtorWallet = getWalletRow(body.fromUserId);
  const creditorWallet = getWalletRow(body.toUserId);

  const { conflict, id } = checkInFlightOrInsertPending({
    groupId,
    fromUserId: body.fromUserId,
    toUserId: body.toUserId,
    amount: body.amount,
    currency,
    xlmAmount,
    sourcePublicKey: debtorWallet.public_key,
    destPublicKey: creditorWallet.public_key,
    note: body.note ?? null,
  });

  if (conflict) {
    throw new AppError("SETTLEMENT_IN_PROGRESS", "A settlement between these users is already in progress", {
      settlement: mapRow(conflict),
    });
  }

  if (debtorWallet.funding_status !== "funded") {
    markFailed(id, "WALLET_UNFUNDED", "Debtor wallet is not funded");
    throw new AppError("WALLET_UNFUNDED", "Debtor's wallet is not funded", { who: "debtor" });
  }
  if (creditorWallet.funding_status !== "funded") {
    markFailed(id, "WALLET_UNFUNDED", "Creditor wallet is not funded");
    throw new AppError("WALLET_UNFUNDED", "Creditor's wallet is not funded", { who: "creditor" });
  }

  let secret: string;
  try {
    secret = decryptSecret(debtorWallet.encrypted_secret);
  } catch (err) {
    markFailed(id, "WALLET_KEY_ERROR", "wallet secret could not be decrypted");
    throw err;
  }

  try {
    const outcome = await buildSignSubmitPayment({
      sourcePublicKey: debtorWallet.public_key,
      sourceSecret: secret,
      destinationPublicKey: creditorWallet.public_key,
      xlmAmount,
    });
    // secret goes out of scope here — never held longer than the sign call needs.

    const now = new Date().toISOString();

    if (outcome.status === "settled") {
      db.prepare(
        `UPDATE settlements SET status = 'settled', tx_hash = ?, settled_at = ?, updated_at = ? WHERE id = ?`
      ).run(outcome.txHash, outcome.settledAt, now, id);

      markSplitsPaidBestEffort(groupId, body.fromUserId, body.toUserId);
      insertActivity({
        type: "payment_made",
        groupId,
        userId: body.fromUserId,
        description: `settled $${body.amount.toFixed(2)} via Stellar`,
        amount: body.amount,
        date: now,
      });

      return { status: 201, settlement: mapRow(getSettlementRow(id)!) };
    }

    // submitting (Horizon 504 / client timeout) — 202, client polls #14.
    db.prepare(`UPDATE settlements SET status = 'submitting', tx_hash = ?, updated_at = ? WHERE id = ?`).run(
      outcome.txHash,
      now,
      id
    );
    return { status: 202, settlement: mapRow(getSettlementRow(id)!) };
  } catch (err) {
    if (err instanceof AppError) {
      markFailed(id, err.code, err.message);
    } else {
      markFailed(id, "STELLAR_ERROR", "Unexpected error during settlement submission");
    }
    throw err;
  }
}

export function listGroupSettlements(groupId: string): { settlements: Settlement[] } {
  const rows = db
    .prepare("SELECT * FROM settlements WHERE group_id = ? ORDER BY created_at DESC")
    .all(groupId) as SettlementRow[];
  return { settlements: rows.map(mapRow) };
}

export async function getSettlementById(id: string, callerId: string): Promise<{ settlement: Settlement }> {
  const row = getSettlementRow(id);
  if (!row) throw new AppError("NOT_FOUND", "Settlement not found");
  if (row.from_user_id !== callerId && row.to_user_id !== callerId) {
    throw new AppError("FORBIDDEN", "You are not a party to this settlement");
  }

  if (row.status === "submitting" && row.tx_hash) {
    // One-shot reconcile-on-read (§5.8) — not a background poller.
    const expiry = new Date(new Date(row.created_at).getTime() + env.STELLAR_TX_TIMEOUT_SECONDS * 1000);
    const result = await reconcileTransaction(row.tx_hash, expiry);
    const now = new Date().toISOString();

    if (result.status === "settled") {
      db.prepare(`UPDATE settlements SET status = 'settled', settled_at = ?, updated_at = ? WHERE id = ?`).run(
        now,
        now,
        id
      );
      markSplitsPaidBestEffort(row.group_id, row.from_user_id, row.to_user_id);
      insertActivity({
        type: "payment_made",
        groupId: row.group_id,
        userId: row.from_user_id,
        description: `settled $${row.amount.toFixed(2)} via Stellar`,
        amount: row.amount,
        date: now,
      });
    } else if (result.status === "failed") {
      db.prepare(
        `UPDATE settlements SET status = 'failed', failure_code = ?, updated_at = ? WHERE id = ?`
      ).run(result.failureCode, now, id);
    }
    // status === 'submitting' -> no change, still pending confirmation.
  }

  return { settlement: mapRow(getSettlementRow(id)!) };
}
