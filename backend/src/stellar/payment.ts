/**
 * Build -> sign -> submit -> confirm for native XLM settle-up payments (ARCHITECTURE §5.3, §5.8,
 * §5.9). Plain `await` under a client timeout, `catch` -> 202 fallback. No auto-retry on
 * tx-result errors (ruling #2) — one backoff-retry on HTTP 429 only (§5.10).
 */

import { Asset, BASE_FEE, Keypair, Operation, TransactionBuilder } from "@stellar/stellar-sdk";
import { env } from "../config/env.js";
import { AppError } from "../utils/errors.js";
import { NETWORK_PASSPHRASE, server } from "./client.js";

const MIN_RESERVE_XLM = 1; // freshly funded, zero-subentry account (RESEARCH §6)
const FEE_XLM = Number(BASE_FEE) / 10_000_000;

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

/** One backoff-retry on HTTP 429 (RESEARCH §6 / ARCHITECTURE §5.10). */
async function withRetry429<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    const status = (err as { response?: { status?: number; headers?: Record<string, string> } })?.response?.status;
    if (status === 429) {
      const retryAfterHeader = (err as { response?: { headers?: Record<string, string> } })?.response?.headers?.[
        "retry-after"
      ];
      const waitMs = retryAfterHeader ? Number(retryAfterHeader) * 1000 : 1000;
      await new Promise((r) => setTimeout(r, Number.isFinite(waitMs) ? waitMs : 1000));
      return fn();
    }
    throw err;
  }
}

function extractResultCodes(err: unknown): unknown {
  return (err as { response?: { data?: { extras?: { result_codes?: unknown } } } })?.response?.data?.extras
    ?.result_codes;
}

function isNotFoundStatus(err: unknown, status: number): boolean {
  return (err as { response?: { status?: number } })?.response?.status === status;
}

export interface SubmitPaymentParams {
  sourcePublicKey: string;
  /** Decrypted secret key (S...) — caller is responsible for its lifetime; never logged. */
  sourceSecret: string;
  destinationPublicKey: string;
  xlmAmount: string;
}

export type SubmitPaymentOutcome =
  | { status: "settled"; txHash: string; settledAt: string }
  | { status: "submitting"; txHash: string };

/**
 * Full build -> sign -> submit sequence (ARCHITECTURE §5.3). Throws AppError for any definite
 * pre-submit or Horizon-confirmed failure (caller marks the settlement row 'failed'). Returns
 * an outcome object for 'settled' or 'submitting' (timeout/504 fallback).
 */
export async function buildSignSubmitPayment(params: SubmitPaymentParams): Promise<SubmitPaymentOutcome> {
  // 1. loadAccount — fresh sequence number.
  let account;
  try {
    account = await withRetry429(() =>
      withTimeout(server.loadAccount(params.sourcePublicKey), env.HORIZON_TIMEOUT_MS)
    );
  } catch (err) {
    if (isNotFoundStatus(err, 404)) {
      throw new AppError("WALLET_UNFUNDED", "Debtor's Stellar account does not exist on-chain yet", {
        who: "debtor",
      });
    }
    throw new AppError("STELLAR_ERROR", "Could not load source account from Horizon", {
      reason: "source_account_load_failed",
    });
  }

  // 2. Reserve pre-check (ruling #2): balance >= amount + fee + 1 XLM min reserve.
  const native = account.balances.find((b) => b.asset_type === "native");
  const balance = native ? parseFloat(native.balance) : 0;
  const required = parseFloat(params.xlmAmount) + FEE_XLM + MIN_RESERVE_XLM;
  if (balance < required) {
    throw new AppError("INSUFFICIENT_XLM", "Insufficient XLM balance to settle (including network reserve)", {
      balance,
      required,
    });
  }

  // 3. Build the transaction.
  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      Operation.payment({
        destination: params.destinationPublicKey,
        asset: Asset.native(),
        amount: params.xlmAmount,
      })
    )
    .setTimeout(env.STELLAR_TX_TIMEOUT_SECONDS)
    .build();

  // 4. Compute hash BEFORE submit — persisted by the caller before signing/submitting.
  const txHash = tx.hash().toString("hex");

  // 5. Sign — Keypair goes out of scope immediately after this call (§5.2 step 4).
  const keypair = Keypair.fromSecret(params.sourceSecret);
  tx.sign(keypair);

  // 6. Submit — plain await under HORIZON_TIMEOUT_MS, no dangling race.
  try {
    const result = await withRetry429(() => withTimeout(server.submitTransaction(tx), env.HORIZON_TIMEOUT_MS));
    if (result.successful) {
      return { status: "settled", txHash, settledAt: new Date().toISOString() };
    }
    throw new AppError("STELLAR_ERROR", "Transaction was not successful", {
      resultCodes: (result as unknown as { extras?: { result_codes?: unknown } }).extras?.result_codes,
    });
  } catch (err) {
    if (err instanceof AppError) throw err;

    // Client-side timeout (our own withTimeout) or Horizon 504 -> submitting, client polls #14.
    if ((err as Error)?.message === "timeout" || isNotFoundStatus(err, 504)) {
      return { status: "submitting", txHash };
    }

    const resultCodes = extractResultCodes(err) as
      | { transaction?: string; operations?: string[] }
      | undefined;
    const opCodes = resultCodes?.operations ?? [];

    if (opCodes.includes("op_underfunded") || opCodes.includes("PAYMENT_UNDERFUNDED")) {
      throw new AppError("PAYMENT_UNDERFUNDED", "Horizon rejected the payment as underfunded", {
        resultCodes,
      });
    }
    if (opCodes.includes("op_no_destination") || opCodes.includes("PAYMENT_NO_DESTINATION")) {
      throw new AppError("DEST_NOT_FOUND", "Creditor's Stellar account does not exist on-chain", {
        resultCodes,
      });
    }

    throw new AppError("STELLAR_ERROR", "Stellar transaction submission failed", {
      resultCodes: resultCodes ?? String((err as Error)?.message ?? err),
    });
  }
}

export type ReconcileResult =
  | { status: "settled" }
  | { status: "failed"; failureCode: string }
  | { status: "submitting" };

/**
 * One-shot reconciliation poll for a `submitting` settlement (§5.8, RESEARCH §3.6). NOT a
 * background poller — called once per `GET /settlements/:id` request.
 */
export async function reconcileTransaction(txHash: string, timebreachedAt: Date): Promise<ReconcileResult> {
  try {
    await withRetry429(() => server.transactions().transaction(txHash).call());
    return { status: "settled" };
  } catch (err) {
    if (isNotFoundStatus(err, 404)) {
      if (Date.now() > timebreachedAt.getTime()) {
        return { status: "failed", failureCode: "tx_too_late" };
      }
      return { status: "submitting" };
    }
    // Unknown error while reconciling — do not falsely mark failed; caller keeps polling.
    return { status: "submitting" };
  }
}
