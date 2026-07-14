/**
 * Horizon client singleton + testnet boot assertion (ARCHITECTURE §5.1, RESEARCH §1-2).
 * Testnet ONLY — this file throws at import time if the passphrase doesn't match exactly.
 */

import { Horizon, Networks } from "@stellar/stellar-sdk";
import { env } from "../config/env.js";

export const NETWORK_PASSPHRASE = Networks.TESTNET;

const EXPECTED_PASSPHRASE = "Test SDF Network ; September 2015";
if (NETWORK_PASSPHRASE !== EXPECTED_PASSPHRASE || env.STELLAR_NETWORK_PASSPHRASE !== EXPECTED_PASSPHRASE) {
  throw new Error(
    `FATAL: Stellar network passphrase mismatch — testnet only, never mainnet. Expected "${EXPECTED_PASSPHRASE}".`
  );
}

export const server = new Horizon.Server(env.HORIZON_URL);
