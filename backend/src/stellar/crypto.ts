/**
 * AES-256-GCM encrypt/decrypt for the custodial wallet secret column (ARCHITECTURE §5.6).
 * Format: "v1:<iv_hex>:<tag_hex>:<ciphertext_hex>". Key is boot-validated in config/env.ts
 * (exactly 32 bytes after hex-decoding) — this module trusts that invariant.
 */

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { env } from "../config/env.js";
import { AppError } from "../utils/errors.js";

const ALGORITHM = "aes-256-gcm";
const FORMAT_VERSION = "v1";

function getKey(): Buffer {
  return Buffer.from(env.WALLET_ENCRYPTION_KEY, "hex");
}

/** Encrypts a plaintext Stellar secret key (S...) for storage. Never call this with anything else. */
export function encryptSecret(secret: string): string {
  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(secret, "utf-8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${FORMAT_VERSION}:${iv.toString("hex")}:${tag.toString("hex")}:${ciphertext.toString("hex")}`;
}

/**
 * Decrypts a stored secret. Throws AppError('WALLET_KEY_ERROR', ...) -> 500 on any failure
 * (tampered ciphertext, wrong key, malformed format) — never a raw crash (§5.6d).
 */
export function decryptSecret(stored: string): string {
  try {
    const parts = stored.split(":");
    if (parts.length !== 4 || parts[0] !== FORMAT_VERSION) {
      throw new Error("malformed encrypted_secret format");
    }
    const [, ivHex, tagHex, ciphertextHex] = parts;
    const key = getKey();
    const iv = Buffer.from(ivHex, "hex");
    const tag = Buffer.from(tagHex, "hex");
    const ciphertext = Buffer.from(ciphertextHex, "hex");

    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return plaintext.toString("utf-8");
  } catch {
    throw new AppError(
      "WALLET_KEY_ERROR",
      "wallet secret could not be decrypted — check WALLET_ENCRYPTION_KEY"
    );
  }
}
