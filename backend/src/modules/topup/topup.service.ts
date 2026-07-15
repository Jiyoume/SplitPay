/**
 * Wallet top-up — ports the method catalog, fee table, and simulated rails from
 * ../../../src/services/topUpService.ts onto the `topups` table (contract §7-10). Real Stellar
 * paths (stellar_anchor, friendbot) hit the network; gcash/maya/card/bank_transfer are clearly
 * fake — this build never claims a real payment rail.
 */

import { db } from "../../db/index.js";
import { AppError } from "../../utils/errors.js";
import { newId } from "../../utils/id.js";
import { fundWithFriendbot } from "../../stellar/wallet.js";
import { SRT_ASSET_CODE } from "../../stellar/anchor.js";
import { getWalletRow } from "../users/users.service.js";
import { getKycStatus, type KYCLevel } from "../kyc/kyc.service.js";
import { initiateAnchorDeposit } from "../anchor/anchor.service.js";
import type { CreateTopupBody, TopupMethod } from "./topup.schemas.js";

// ===== METHOD CATALOG (ported from TOP_UP_METHODS) =====

interface TopUpMethodInfo {
  method: TopupMethod;
  name: string;
  icon: string;
  description: string;
  fee: string;
  processingTime: string;
  minAmount: number;
  maxAmount: number;
  available: boolean;
  requiresKYC: KYCLevel;
}

const TOP_UP_METHODS: TopUpMethodInfo[] = [
  {
    method: "gcash",
    name: "GCash",
    icon: "\u{1F49A}",
    description: "Top up instantly from your GCash wallet",
    fee: "1.5%",
    processingTime: "Instant",
    minAmount: 100,
    maxAmount: 50000,
    available: true,
    requiresKYC: "basic",
  },
  {
    method: "maya",
    name: "Maya",
    icon: "\u{1F49C}",
    description: "Top up from your Maya account",
    fee: "1.5%",
    processingTime: "Instant",
    minAmount: 100,
    maxAmount: 50000,
    available: true,
    requiresKYC: "basic",
  },
  {
    method: "bank_transfer",
    name: "Bank Transfer",
    icon: "\u{1F3E6}",
    description: "Transfer from any Philippine bank via InstaPay",
    fee: "₱15 flat",
    processingTime: "5-30 minutes",
    minAmount: 500,
    maxAmount: 200000,
    available: true,
    requiresKYC: "verified",
  },
  {
    method: "card",
    name: "Debit/Credit Card",
    icon: "\u{1F4B3}",
    description: "Visa or Mastercard",
    fee: "2.5%",
    processingTime: "Instant",
    minAmount: 200,
    maxAmount: 100000,
    available: true,
    requiresKYC: "verified",
  },
  {
    method: "stellar_anchor",
    name: "Stellar Anchor",
    icon: "⭐",
    description: "Deposit via Stellar anchor (SEP-24)",
    fee: "Varies",
    processingTime: "1-5 minutes",
    minAmount: 100,
    maxAmount: 500000,
    available: true,
    requiresKYC: "basic",
  },
  {
    method: "stellar_direct",
    name: "External Stellar Wallet",
    icon: "\u{1F517}",
    description: "Send from another Stellar wallet address",
    fee: "Network fee only",
    processingTime: "3-5 seconds",
    minAmount: 1,
    maxAmount: 10000000,
    available: true,
    requiresKYC: "basic",
  },
  {
    method: "friendbot",
    name: "Testnet Faucet",
    icon: "\u{1F916}",
    description: "Get free test XLM (testnet only)",
    fee: "Free",
    processingTime: "Instant",
    minAmount: 0,
    maxAmount: 10000,
    available: true,
    requiresKYC: "none",
  },
];

const LEVEL_ORDER: KYCLevel[] = ["none", "basic", "verified", "enhanced"];

function calculateFee(method: TopupMethod, amount: number): number {
  switch (method) {
    case "gcash":
    case "maya":
      return Math.round(amount * 0.015 * 100) / 100;
    case "card":
      return Math.round(amount * 0.025 * 100) / 100;
    case "bank_transfer":
      return 15;
    case "stellar_anchor":
      return Math.round(amount * 0.01 * 100) / 100;
    case "stellar_direct":
    case "friendbot":
    default:
      return 0;
  }
}

export function getAvailableTopUpMethods(kycLevel: KYCLevel): TopUpMethodInfo[] {
  const userLevelIndex = LEVEL_ORDER.indexOf(kycLevel);
  return TOP_UP_METHODS.map((method) => ({
    ...method,
    available: LEVEL_ORDER.indexOf(method.requiresKYC) <= userLevelIndex,
  }));
}

function getUserKycLevel(userId: string): KYCLevel {
  return getKycStatus(userId).level;
}

// ===== ROW / RESPONSE MAPPING =====

interface TopupRow {
  id: string;
  user_id: string;
  method: TopupMethod;
  status: string;
  amount: number;
  currency: string;
  fee: number;
  net_amount: number;
  interactive_url: string | null;
  instructions_json: string | null;
  stellar_tx_hash: string | null;
  created_at: string;
  updated_at: string;
  expires_at: string | null;
}

export interface TopupResponse {
  id: string;
  method: TopupMethod;
  status: string;
  amount: number;
  currency: string;
  fee: number;
  netAmount: number;
  interactiveUrl?: string;
  paymentInstructions?: Record<string, unknown>;
  depositInfo?: Record<string, unknown>;
  stellarTxHash?: string;
  createdAt: string;
  expiresAt?: string;
}

/** instructions_json holds a discriminated {kind, data} blob so one column can carry either
 * paymentInstructions (bank_transfer) or depositInfo (stellar_direct / stellar_anchor). */
function mapRow(row: TopupRow): TopupResponse {
  const result: TopupResponse = {
    id: row.id,
    method: row.method,
    status: row.status,
    amount: row.amount,
    currency: row.currency,
    fee: row.fee,
    netAmount: row.net_amount,
    createdAt: row.created_at,
  };
  if (row.interactive_url) result.interactiveUrl = row.interactive_url;
  if (row.stellar_tx_hash) result.stellarTxHash = row.stellar_tx_hash;
  if (row.expires_at) result.expiresAt = row.expires_at;

  if (row.instructions_json) {
    const parsed = JSON.parse(row.instructions_json) as { kind: string; data: Record<string, unknown> };
    if (parsed.kind === "paymentInstructions") result.paymentInstructions = parsed.data;
    if (parsed.kind === "depositInfo") result.depositInfo = parsed.data;
  }

  return result;
}

function insertTopup(params: {
  id: string;
  userId: string;
  method: TopupMethod;
  status: string;
  amount: number;
  fee: number;
  netAmount: number;
  interactiveUrl?: string | null;
  instructionsJson?: string | null;
  stellarTxHash?: string | null;
  expiresAt?: string | null;
  now: string;
}): void {
  db.prepare(
    `INSERT INTO topups
       (id, user_id, method, status, amount, currency, fee, net_amount,
        interactive_url, instructions_json, stellar_tx_hash, created_at, updated_at, expires_at)
     VALUES (?, ?, ?, ?, ?, 'PHP', ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    params.id,
    params.userId,
    params.method,
    params.status,
    params.amount,
    params.fee,
    params.netAmount,
    params.interactiveUrl ?? null,
    params.instructionsJson ?? null,
    params.stellarTxHash ?? null,
    params.now,
    params.now,
    params.expiresAt ?? null
  );
}

function getTopupRow(id: string): TopupRow | undefined {
  return db.prepare("SELECT * FROM topups WHERE id = ?").get(id) as TopupRow | undefined;
}

// ===== PUBLIC API =====

export function listTopUpMethodsForUser(userId: string): { methods: TopUpMethodInfo[] } {
  return { methods: getAvailableTopUpMethods(getUserKycLevel(userId)) };
}

export function getTopUpHistory(userId: string): { topups: TopupResponse[] } {
  const rows = db
    .prepare("SELECT * FROM topups WHERE user_id = ? ORDER BY created_at DESC")
    .all(userId) as TopupRow[];
  return { topups: rows.map(mapRow) };
}

export async function createTopUp(userId: string, body: CreateTopupBody): Promise<TopupResponse> {
  const methodInfo = TOP_UP_METHODS.find((m) => m.method === body.method)!;
  const userLevel = getUserKycLevel(userId);

  if (LEVEL_ORDER.indexOf(methodInfo.requiresKYC) > LEVEL_ORDER.indexOf(userLevel)) {
    throw new AppError("KYC_REQUIRED", `${methodInfo.name} requires KYC level '${methodInfo.requiresKYC}'`, {
      method: body.method,
      requiredLevel: methodInfo.requiresKYC,
      currentLevel: userLevel,
    });
  }
  if (body.amount < methodInfo.minAmount || body.amount > methodInfo.maxAmount) {
    throw new AppError(
      "VALIDATION_ERROR",
      `amount must be between ${methodInfo.minAmount} and ${methodInfo.maxAmount} for ${methodInfo.name}`,
      { minAmount: methodInfo.minAmount, maxAmount: methodInfo.maxAmount }
    );
  }

  const wallet = getWalletRow(userId);
  const fee = calculateFee(body.method, body.amount);
  const netAmount = Math.round((body.amount - fee) * 100) / 100;
  const id = newId();
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

  switch (body.method) {
    case "friendbot": {
      const ok = await fundWithFriendbot(wallet.public_key);
      if (!ok) {
        throw new AppError("FRIENDBOT_FAILED", "Friendbot funding failed — safe to retry");
      }
      insertTopup({ id, userId, method: body.method, status: "completed", amount: body.amount, fee: 0, netAmount: body.amount, now });
      break;
    }

    case "gcash":
    case "maya":
    case "card": {
      const interactiveUrl = `https://staging.splitpay.local/simulated-pay/${id}`;
      insertTopup({
        id,
        userId,
        method: body.method,
        status: "pending_payment",
        amount: body.amount,
        fee,
        netAmount,
        interactiveUrl,
        expiresAt,
        now,
      });
      break;
    }

    case "bank_transfer": {
      const paymentInstructions = {
        bankName: "SplitPay Digital Bank",
        accountName: "SplitPay Holdings Inc.",
        accountNumber: "0012-3456-7890",
        referenceNumber: id,
        amount: body.amount,
        channel: "InstaPay or PESONet",
        expiresAt,
        note: "Use the reference number as your transaction memo.",
      };
      insertTopup({
        id,
        userId,
        method: body.method,
        status: "pending_payment",
        amount: body.amount,
        fee,
        netAmount,
        instructionsJson: JSON.stringify({ kind: "paymentInstructions", data: paymentInstructions }),
        expiresAt,
        now,
      });
      break;
    }

    case "stellar_anchor": {
      // Same SEP-10 + SEP-24 flow as POST /users/me/anchor/deposit — anchor failures propagate
      // as ANCHOR_ERROR (502); nothing is persisted if the anchor call fails.
      const anchorResult = await initiateAnchorDeposit(userId, SRT_ASSET_CODE);
      insertTopup({
        id,
        userId,
        method: body.method,
        status: "pending_payment",
        amount: body.amount,
        fee,
        netAmount,
        interactiveUrl: anchorResult.url,
        instructionsJson: JSON.stringify({ kind: "depositInfo", data: { anchorTransactionId: anchorResult.id } }),
        expiresAt,
        now,
      });
      break;
    }

    case "stellar_direct": {
      const depositInfo = {
        address: wallet.public_key,
        memo: userId.slice(0, 28),
        memoType: "text",
        network: "Stellar Testnet",
      };
      insertTopup({
        id,
        userId,
        method: body.method,
        status: "pending_payment",
        amount: body.amount,
        fee,
        netAmount,
        instructionsJson: JSON.stringify({ kind: "depositInfo", data: depositInfo }),
        expiresAt,
        now,
      });
      break;
    }
  }

  return mapRow(getTopupRow(id)!);
}

export function confirmTopUp(userId: string, id: string): TopupResponse {
  const row = getTopupRow(id);
  if (!row || row.user_id !== userId) {
    throw new AppError("NOT_FOUND", "Top-up not found");
  }

  const confirmableMethods: TopupMethod[] = ["gcash", "maya", "card", "bank_transfer"];
  if (row.status !== "pending_payment" || !confirmableMethods.includes(row.method)) {
    throw new AppError("INVALID_STATE", "Top-up is not awaiting confirmation", {
      status: row.status,
      method: row.method,
    });
  }

  const now = new Date().toISOString();
  db.prepare("UPDATE topups SET status = 'completed', updated_at = ? WHERE id = ?").run(now, id);

  return mapRow(getTopupRow(id)!);
}
