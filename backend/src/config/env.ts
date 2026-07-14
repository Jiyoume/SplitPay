import "dotenv/config";
import { z } from "zod";

const STELLAR_TESTNET_PASSPHRASE = "Test SDF Network ; September 2015";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  HOST: z.string().default("0.0.0.0"),

  DATABASE_PATH: z.string().default("./data/splitpay.db"),

  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  JWT_EXPIRES_IN: z.string().default("7d"),

  WALLET_ENCRYPTION_KEY: z
    .string()
    .regex(/^[0-9a-fA-F]{64}$/, "WALLET_ENCRYPTION_KEY must be 32 bytes (64 hex chars)"),

  STELLAR_NETWORK: z.string().default("testnet"),
  HORIZON_URL: z.string().url().default("https://horizon-testnet.stellar.org"),
  FRIENDBOT_URL: z.string().url().default("https://friendbot.stellar.org"),
  STELLAR_NETWORK_PASSPHRASE: z.string().default(STELLAR_TESTNET_PASSPHRASE),
  STELLAR_TX_TIMEOUT_SECONDS: z.coerce.number().int().positive().default(30),
  HORIZON_TIMEOUT_MS: z.coerce.number().int().positive().default(30000),
  USER_BALANCE_FETCH_TIMEOUT_MS: z.coerce.number().int().positive().default(2000),
  HORIZON_POLL_INTERVAL_MS: z.coerce.number().int().positive().default(2000),

  LOG_LEVEL: z.string().default("info"),
  CORS_ORIGIN: z.string().default("*"),
});

function loadEnv() {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    // eslint-disable-next-line no-console
    console.error("FATAL: invalid environment configuration");
    for (const issue of parsed.error.issues) {
      // eslint-disable-next-line no-console
      console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
    }
    process.exit(1);
  }

  const env = parsed.data;

  // Boot-validate the wallet encryption key is exactly 32 bytes once decoded (§5.6).
  const keyBytes = Buffer.from(env.WALLET_ENCRYPTION_KEY, "hex");
  if (keyBytes.length !== 32) {
    // eslint-disable-next-line no-console
    console.error(
      "FATAL: WALLET_ENCRYPTION_KEY must be 32 bytes (run: openssl rand -hex 32)"
    );
    process.exit(1);
  }

  // Never allow mainnet — hard guardrail asserted at boot.
  if (env.STELLAR_NETWORK_PASSPHRASE !== STELLAR_TESTNET_PASSPHRASE) {
    // eslint-disable-next-line no-console
    console.error(
      `FATAL: STELLAR_NETWORK_PASSPHRASE must be exactly "${STELLAR_TESTNET_PASSPHRASE}" (testnet only, never mainnet)`
    );
    process.exit(1);
  }

  return env;
}

export const env = loadEnv();
export type Env = typeof env;
