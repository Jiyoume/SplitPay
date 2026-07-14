/**
 * Logging redaction helpers (ARCHITECTURE §8.1).
 * Pino's own `redact` config (wired in plugins/requestLogging.ts) handles per-request
 * auto-redaction. This module is for any *manual* log call that might otherwise include
 * sensitive Stellar/auth material — it strips known-sensitive keys before they reach the logger.
 */

/** Pino redact paths — request-level fields that must never appear in logs verbatim. */
export const REDACT_PATHS = ["req.headers.authorization", "req.body.password"];

/** Keys that must never be logged anywhere, at any depth (secret material). */
const FORBIDDEN_KEYS = new Set([
  "secret",
  "password",
  "encrypted_secret",
  "encryptedSecret",
  "signedXdr",
  "signed_xdr",
  "envelopeXdr",
  "keypair",
]);

/**
 * Deep-strips forbidden keys from an object before it's passed to a manual log call.
 * Use for anything that touches wallets/settlements and isn't already a plain
 * `{ publicKey, txHash, status }`-shaped object.
 */
export function logSafe<T>(value: T): T {
  return stripForbidden(value) as T;
}

function stripForbidden(value: unknown, depth = 0): unknown {
  if (depth > 6 || value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((v) => stripForbidden(v, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    if (FORBIDDEN_KEYS.has(key)) {
      out[key] = "[REDACTED]";
    } else {
      out[key] = stripForbidden(val, depth + 1);
    }
  }
  return out;
}
