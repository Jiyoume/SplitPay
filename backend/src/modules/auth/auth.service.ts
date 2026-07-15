import bcrypt from "bcryptjs";
import { db } from "../../db/index.js";
import { AppError } from "../../utils/errors.js";
import { newId } from "../../utils/id.js";
import { encryptSecret } from "../../stellar/crypto.js";
import { fundWithFriendbot, generateKeypair } from "../../stellar/wallet.js";
import type { RegisterBody, LoginBody } from "./auth.schemas.js";

const BCRYPT_COST = 10;

interface UserRow {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  avatar: string | null;
  phone: string | null;
  created_at: string;
}

interface WalletRow {
  id: string;
  user_id: string;
  public_key: string;
  encrypted_secret: string;
  funding_status: "funded" | "unfunded";
}

export interface RegisterResult {
  user: { id: string; name: string; email: string; phone: string | null };
  wallet: { publicKey: string; fundingStatus: "funded" | "unfunded" };
}

export async function registerUser(body: RegisterBody): Promise<RegisterResult> {
  const email = body.email.toLowerCase();

  const { rows } = await db.query("SELECT id FROM users WHERE email = $1", [email]);
  if (rows.length > 0) {
    throw new AppError("EMAIL_TAKEN", "An account with this email already exists");
  }

  const passwordHash = await bcrypt.hash(body.password, BCRYPT_COST);
  const userId = newId();
  const now = new Date().toISOString();

  await db.query(
    `INSERT INTO users (id, name, email, password_hash, avatar, phone, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [userId, body.name, email, passwordHash, body.avatar ?? null, body.phone ?? null, now]
  );

  // Provision a custodial Stellar wallet (ARCHITECTURE §5.2). Funding is resilient: registration
  // never fails solely because Friendbot failed.
  const keypair = generateKeypair();
  const publicKey = keypair.publicKey();
  const encryptedSecret = encryptSecret(keypair.secret());

  const funded = await fundWithFriendbot(publicKey);
  const fundingStatus: "funded" | "unfunded" = funded ? "funded" : "unfunded";

  await db.query(
    `INSERT INTO wallets (id, user_id, public_key, encrypted_secret, funding_status, created_at)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [newId(), userId, publicKey, encryptedSecret, fundingStatus, now]
  );

  return {
    user: { id: userId, name: body.name, email, phone: body.phone ?? null },
    wallet: { publicKey, fundingStatus },
  };
}

export interface LoginResult {
  user: { id: string; name: string; email: string; phone: string | null };
}

const INVALID_CREDENTIALS_MESSAGE = "Invalid email or password";

export async function loginUser(body: LoginBody): Promise<LoginResult> {
  const email = body.email.toLowerCase();
  const { rows } = await db.query("SELECT * FROM users WHERE email = $1", [email]);
  const row = rows[0] as UserRow | undefined;

  if (!row) {
    throw new AppError("UNAUTHORIZED", INVALID_CREDENTIALS_MESSAGE);
  }

  const ok = await bcrypt.compare(body.password, row.password_hash);
  if (!ok) {
    throw new AppError("UNAUTHORIZED", INVALID_CREDENTIALS_MESSAGE);
  }

  return { user: { id: row.id, name: row.name, email: row.email, phone: row.phone } };
}

export interface GoogleAuthResult {
  user: { id: string; name: string; email: string; phone: string | null };
  wallet?: { publicKey: string; fundingStatus: "funded" | "unfunded" };
}

export async function authenticateGoogleUser(body: {
  email: string;
  name: string;
  avatar?: string;
}): Promise<GoogleAuthResult> {
  const email = body.email.toLowerCase();

  const { rows } = await db.query("SELECT * FROM users WHERE email = $1", [email]);
  const existingUser = rows[0] as UserRow | undefined;

  if (existingUser) {
    const { rows: walletRows } = await db.query("SELECT * FROM wallets WHERE user_id = $1", [existingUser.id]);
    const wallet = walletRows[0] as WalletRow | undefined;
    return {
      user: { id: existingUser.id, name: existingUser.name, email: existingUser.email, phone: existingUser.phone },
      wallet: wallet ? { publicKey: wallet.public_key, fundingStatus: wallet.funding_status } : undefined,
    };
  }

  const userId = newId();
  const now = new Date().toISOString();
  const passwordHash = "google_auth_oauth_user_no_password";

  await db.query(
    `INSERT INTO users (id, name, email, password_hash, avatar, phone, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [userId, body.name, email, passwordHash, body.avatar ?? null, null, now]
  );

  const keypair = generateKeypair();
  const publicKey = keypair.publicKey();
  const encryptedSecret = encryptSecret(keypair.secret());

  const funded = await fundWithFriendbot(publicKey);
  const fundingStatus: "funded" | "unfunded" = funded ? "funded" : "unfunded";

  await db.query(
    `INSERT INTO wallets (id, user_id, public_key, encrypted_secret, funding_status, created_at)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [newId(), userId, publicKey, encryptedSecret, fundingStatus, now]
  );

  return {
    user: { id: userId, name: body.name, email, phone: null },
    wallet: { publicKey, fundingStatus },
  };
}
