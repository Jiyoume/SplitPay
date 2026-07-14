/**
 * Fiat -> XLM conversion (ARCHITECTURE §5.4, ruling #1). ONE helper; the only place fiat becomes
 * an XLM amount. 1:1 numeric demo peg (locked) — output is a 7-dp string safe for Operation.payment.
 */

import { AppError } from "../utils/errors.js";

/** Demo peg only: 1 unit of fiat == 1 XLM on testnet. NOT a real FX rate. */
export function toStellarAmount(amount: number): string {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new AppError("VALIDATION_ERROR", "amount must be > 0");
  }
  return amount.toFixed(7); // e.g. 25 -> "25.0000000"
}

export const CONVERSION_NOTE = (currency: string): string =>
  `Demo peg: 1 ${currency} = 1 XLM on Stellar testnet. Not a real exchange rate.`;
