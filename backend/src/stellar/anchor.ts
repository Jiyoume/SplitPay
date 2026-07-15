/**
 * SEP-10 (web auth) / SEP-24 (interactive transfer) / SEP-12 (KYC) client against
 * testanchor.stellar.org — custodial flow: the backend holds the decrypted keypair only for the
 * duration of the SEP-10 challenge signature (mirrors stellar/payment.ts's secret lifetime rule).
 *
 * Endpoints below are verified against https://testanchor.stellar.org/.well-known/stellar.toml
 * (fetched 2026-07-15), NOT the placeholder paths in the build contract — see DEVIATIONS note in
 * the PR description: KYC_SERVER is `/sep12`, not `/kyc`.
 */

import { Asset, Keypair, Operation, TransactionBuilder } from "@stellar/stellar-sdk";
import { AppError } from "../utils/errors.js";
import { NETWORK_PASSPHRASE, server } from "./client.js";

const ANCHOR_HOME_DOMAIN = "testanchor.stellar.org";
const WEB_AUTH_ENDPOINT = "https://testanchor.stellar.org/auth";
const SEP24_ENDPOINT = "https://testanchor.stellar.org/sep24";
const KYC_ENDPOINT = "https://testanchor.stellar.org/sep12";

export const SRT_ASSET_CODE = "SRT";
export const SRT_ASSET_ISSUER = "GCDNJUBQSX7AJWLJACMJ7I4BC3Z47BQUTMHEICZLE6MU4KQBRYG5JY6B";

const ANCHOR_TIMEOUT_MS = 15000;

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

async function anchorFetch(url: string, init?: RequestInit): Promise<Response> {
  let res: Response;
  try {
    res = await withTimeout(fetch(url, init), ANCHOR_TIMEOUT_MS);
  } catch (err) {
    throw new AppError("ANCHOR_ERROR", "Could not reach the Stellar anchor (testanchor.stellar.org)", {
      url,
      reason: (err as Error)?.message ?? "network error",
    });
  }
  return res;
}

async function anchorJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await anchorFetch(url, init);
  const body = await res.text();
  let parsed: unknown = undefined;
  try {
    parsed = body ? JSON.parse(body) : undefined;
  } catch {
    // non-JSON body — fall through, handled below
  }
  if (!res.ok) {
    throw new AppError("ANCHOR_ERROR", "Stellar anchor request failed", {
      url,
      status: res.status,
      body: parsed ?? body,
    });
  }
  return parsed as T;
}

/**
 * SEP-10: fetch the auth challenge, sign it with the user's (decrypted, in-memory only) keypair,
 * POST it back, and return the resulting session JWT.
 */
export async function sep10Authenticate(keypair: Keypair): Promise<string> {
  const publicKey = keypair.publicKey();
  const challengeUrl = `${WEB_AUTH_ENDPOINT}?${new URLSearchParams({
    account: publicKey,
    home_domain: ANCHOR_HOME_DOMAIN,
  }).toString()}`;

  const challenge = await anchorJson<{ transaction: string; network_passphrase: string }>(challengeUrl);

  if (challenge.network_passphrase !== NETWORK_PASSPHRASE) {
    throw new AppError("ANCHOR_ERROR", "Anchor challenge used an unexpected network passphrase");
  }

  const tx = TransactionBuilder.fromXDR(challenge.transaction, NETWORK_PASSPHRASE);
  if (!("sign" in tx)) {
    throw new AppError("ANCHOR_ERROR", "Anchor returned a fee-bump transaction where a challenge was expected");
  }
  tx.sign(keypair);
  const signedXdr = tx.toXDR();

  const tokenRes = await anchorJson<{ token: string }>(WEB_AUTH_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transaction: signedXdr }),
  });

  return tokenRes.token;
}

/** Idempotent: submits a changeTrust operation only if the trustline doesn't already exist. */
export async function ensureTrustline(params: {
  secret: string;
  publicKey: string;
  assetCode: string;
  assetIssuer: string;
}): Promise<void> {
  let account;
  try {
    account = await withTimeout(server.loadAccount(params.publicKey), ANCHOR_TIMEOUT_MS);
  } catch (err) {
    throw new AppError("STELLAR_ERROR", "Could not load account to check trustline", {
      reason: (err as Error)?.message ?? String(err),
    });
  }

  const hasTrustline = account.balances.some(
    (b) =>
      b.asset_type !== "native" &&
      "asset_code" in b &&
      b.asset_code === params.assetCode &&
      "asset_issuer" in b &&
      b.asset_issuer === params.assetIssuer
  );
  if (hasTrustline) return;

  const asset = new Asset(params.assetCode, params.assetIssuer);
  const tx = new TransactionBuilder(account, {
    fee: "10000",
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(Operation.changeTrust({ asset }))
    .setTimeout(180)
    .build();

  const keypair = Keypair.fromSecret(params.secret);
  tx.sign(keypair);

  try {
    await withTimeout(server.submitTransaction(tx), ANCHOR_TIMEOUT_MS);
  } catch (err) {
    throw new AppError("STELLAR_ERROR", "Failed to establish SRT trustline", {
      resultCodes: (err as { response?: { data?: { extras?: { result_codes?: unknown } } } })?.response?.data?.extras
        ?.result_codes,
    });
  }
}

export interface Sep24InteractiveResult {
  url: string;
  id: string;
}

/** SEP-24: POST /transactions/{deposit|withdraw}/interactive with the SEP-10 JWT. */
export async function sep24Interactive(
  kind: "deposit" | "withdraw",
  jwt: string,
  assetCode: string,
  account: string
): Promise<Sep24InteractiveResult> {
  const body = new URLSearchParams({ asset_code: assetCode, account });

  const res = await anchorJson<{ type?: string; url?: string; id?: string; error?: string }>(
    `${SEP24_ENDPOINT}/transactions/${kind}/interactive`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwt}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    }
  );

  if (!res.url || !res.id) {
    throw new AppError("ANCHOR_ERROR", res.error ?? "Anchor did not return an interactive URL", { response: res });
  }

  return { url: res.url, id: res.id };
}

export interface KycCustomerResponse {
  id?: string;
  status: string;
  fields?: Record<string, unknown>;
  provided_fields?: Record<string, unknown>;
  message?: string;
}

/** SEP-12: GET /customer — current status + required/provided field metadata for this account. */
export async function kycGetCustomer(jwt: string, account: string): Promise<KycCustomerResponse> {
  const url = `${KYC_ENDPOINT}/customer?${new URLSearchParams({ account, type: "sep6-deposit" }).toString()}`;
  return anchorJson<KycCustomerResponse>(url, {
    headers: { Authorization: `Bearer ${jwt}` },
  });
}

/** SEP-12: PUT /customer — submit SEP-9 fields as JSON (no file uploads in this build). */
export async function kycPutCustomer(jwt: string, data: Record<string, unknown>): Promise<{ id: string }> {
  return anchorJson<{ id: string }>(`${KYC_ENDPOINT}/customer`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${jwt}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
}
